/**
 * Demo axios transport — a drop-in axios adapter served from the in-memory
 * demo store. No network, no token reads/writes, no localStorage.
 *
 * API (as approved):
 *   installDemoTransport(store)   synchronous; saves/restores the exact
 *                                 previous api.defaults.adapter; refuses a
 *                                 second install (throws).
 *   uninstallDemoTransport()      restores the previous adapter; idempotent
 *                                 (no-op when not installed).
 *
 * Dispatch rules while installed:
 *   1. Absolute http(s) URL or baseURL override  -> reject DEMO_TRANSPORT_REFUSED
 *      (AxiosError WITHOUT response, so AuthContext interceptors never fire).
 *   2. SSE endpoints (/api/customer/sse-token, /api/customer/notifications/stream)
 *      -> reject WITHOUT response, never 401, never TOKEN_EXPIRED / ACCOUNT_* /
 *      PAYMENT_* (AuthContext.jsx:157-234 would otherwise log the guest out).
 *   3. Demo route table -> served from the store with the backend envelope
 *      { success, message?, data } (chatbot stays FLAT per
 *      backend/src/routes/chatbot.js:20-27).
 *   4. Any other known backend mount (/api/auth, /api/customer, /api/merchant,
 *      /api/admin, /api/ads, /api/chatbot — backend/src/index.js:108-117)
 *      -> 403 DEMO_SIGNUP_REQUIRED "Sign up to continue this action".
 *      The code is deliberately outside the AuthContext trigger set.
 *   5. Anything else -> 404 DEMO_ROUTE_MISSING.
 *
 * Sim endpoints (demo-only): POST /api/customer/simulate/earn | redeem.
 */

import { AxiosError } from 'axios';
import api from '../services/api.js';

const BLOCKED_PREFIXES = ['/api/auth', '/api/customer', '/api/merchant', '/api/admin', '/api/ads', '/api/chatbot'];

const SSE_PATHS = ['/api/customer/sse-token', '/api/customer/notifications/stream'];

const BLOCKED_CODE = 'DEMO_SIGNUP_REQUIRED';
const BLOCKED_MESSAGE = 'Sign up to continue this action';
const SSE_CODE = 'DEMO_SSE_UNSUPPORTED';
const SSE_MESSAGE = 'Live notifications are not available in demo mode.';
const REFUSED_CODE = 'DEMO_TRANSPORT_REFUSED';
const REFUSED_MESSAGE = 'Demo transport refuses absolute URLs and baseURL overrides.';
const UNKNOWN_CODE = 'DEMO_ROUTE_MISSING';
const UNKNOWN_MESSAGE = 'This endpoint is not part of the SkillXT demo.';

const STATUS_TEXT = { 400: 'Bad Request', 403: 'Forbidden', 404: 'Not Found', 405: 'Method Not Allowed' };

let installation = null;

export function isDemoTransportInstalled() {
  return installation !== null;
}

function envelope(data, message) {
  return message ? { success: true, message, data } : { success: true, data };
}

function toPlainError(message, code, config) {
  return new AxiosError(message, code, config, null);
}

function toHttpError(status, code, message, config) {
  const error = new AxiosError(message, code, config, null, {
    data: { success: false, code, message },
    status,
    statusText: STATUS_TEXT[status] || 'Error',
    headers: {},
    config,
    request: null
  });
  error.code = code;
  return error;
}

function toResponse(config, body, status = 200) {
  return {
    data: body,
    status,
    statusText: STATUS_TEXT[status] || 'OK',
    headers: {},
    config,
    request: null
  };
}

function splitUrl(config) {
  const raw = config.url || '';
  const [path, qs = ''] = raw.split('?');
  return { path, params: new URLSearchParams(qs) };
}

function parseBody(config) {
  const raw = config.data;
  if (raw === null || raw === undefined || raw === '') return {};
  if (typeof raw === 'string') {
    try {
      return JSON.parse(raw);
    } catch {
      return {};
    }
  }
  if (typeof raw === 'object') return raw;
  return {};
}

function buildRoutes(store) {
  const routes = [
    ['GET', '/api/customer/profile', () => envelope(store.getProfile(), 'Profile retrieved successfully.')],

    ['PUT', '/api/customer/profile', (ctx) => {
      const result = store.updateProfile(ctx.body);
      if (!result.ok) throw toHttpError(400, result.code, result.message, ctx.config);
      return envelope(result.data, 'Profile updated successfully.');
    }],

    ['PUT', '/api/customer/profile/email', (ctx) => {
      const result = store.updateEmail(ctx.body.email);
      if (!result.ok) throw toHttpError(400, result.code, result.message, ctx.config);
      return envelope(result.data, 'Email address updated successfully.');
    }],

    ['GET', '/api/customer/balance', () => envelope(store.getBalance(), 'Balance retrieved successfully.')],

    ['GET', '/api/customer/transactions', (ctx) =>
      envelope(
        store.listTransactions({
          page: parseInt(ctx.params.get('page'), 10) || 1,
          limit: parseInt(ctx.params.get('limit'), 10) || 20,
          search: ctx.params.get('search') || ''
        }),
        'Transactions retrieved successfully.'
      )],

    ['GET', '/api/customer/ledger', (ctx) =>
      envelope(
        store.getLedger({
          page: parseInt(ctx.params.get('page'), 10) || 1,
          limit: parseInt(ctx.params.get('limit'), 10) || 20,
          search: ctx.params.get('search') || ''
        }),
        'Ledger retrieved successfully.'
      )],

    ['GET', '/api/customer/merchants', () => envelope(store.getMerchants(), 'Merchants retrieved successfully.')],

    ['GET', '/api/customer/milestone-progress', () => {
      const { data, totalSpend } = store.getMilestoneProgress();
      return { success: true, data, totalSpend };
    }],

    ['GET', '/api/customer/referral-stats', () => envelope(store.getReferralStats())],

    ['GET', '/api/ads/active', () => envelope(store.getAds(), 'Active advertisements retrieved successfully.')],

    ['PATCH', '/api/ads/:id/click', () => envelope({ clicked: true })],

    // FLAT body on purpose — FloatingChatbot reads res.data.response directly
    // (FloatingChatbot.jsx:104) and the backend sends no envelope
    // (backend/src/routes/chatbot.js:21-27).
    ['POST', '/api/chatbot/message', (ctx) => {
      const { question } = ctx.body;
      if (typeof question !== 'string' || !question.trim()) {
        throw toHttpError(400, 'DEMO_VALIDATION', 'Question is required.', ctx.config);
      }
      return store.getChatbotReply(question);
    }],

    ['POST', '/api/customer/simulate/earn', (ctx) => {
      const result = store.simulateEarn(ctx.body);
      if (!result.ok) {
        const status = result.code === 'DEMO_SIM_LIMIT' ? 403 : 400;
        throw toHttpError(status, result.code, result.message, ctx.config);
      }
      return envelope(result.data, `You earned ${result.data.points} points!`);
    }],

    ['POST', '/api/customer/simulate/redeem', (ctx) => {
      const result = store.simulateRedeem(ctx.body);
      if (!result.ok) {
        const status = result.code === 'DEMO_SIM_LIMIT' ? 403 : 400;
        throw toHttpError(status, result.code, result.message, ctx.config);
      }
      return envelope(result.data, `Redeemed ${result.data.pointsDeducted} points!`);
    }]
  ];

  const table = new Map(routes.map(([method, pattern, handler]) => [`${method} ${pattern}`, handler]));
  return { table, patterns: routes.map(([method, pattern]) => ({ method, pattern })) };
}

function matchRoute(table, patterns, method, path) {
  const direct = table.get(`${method} ${path}`);
  if (direct) return direct;

  // /api/ads/:id/click style params
  const segments = path.split('/');
  for (const { method: m, pattern } of patterns) {
    if (m !== method) continue;
    const patternSegments = pattern.split('/');
    if (patternSegments.length !== segments.length) continue;
    if (patternSegments.every((seg, i) => seg.startsWith(':') || seg === segments[i])) {
      return table.get(`${m} ${pattern}`);
    }
  }
  return undefined;
}

export function installDemoTransport(store) {
  if (!store) {
    throw new Error('installDemoTransport(store) requires a demo store instance.');
  }
  if (installation) {
    throw new Error('Demo transport is already installed. Call uninstallDemoTransport() first.');
  }

  const previousAdapter = api.defaults.adapter;
  const { table, patterns } = buildRoutes(store);

  const demoAdapter = async (config) => {
    const url = config.url || '';
    if (/^https?:\/\//i.test(url)) {
      throw toPlainError(REFUSED_MESSAGE, REFUSED_CODE, config);
    }
    if (config.baseURL && config.baseURL !== api.defaults.baseURL) {
      throw toPlainError(REFUSED_MESSAGE, REFUSED_CODE, config);
    }

    const { path, params } = splitUrl(config);
    const method = (config.method || 'get').toUpperCase();

    if (SSE_PATHS.includes(path)) {
      // No `response` property: AuthContext.jsx:157-234 only branches when
      // error.response exists — plain rejection falls straight through.
      throw toPlainError(SSE_MESSAGE, SSE_CODE, config);
    }

    const handler = matchRoute(table, patterns, method, path);
    if (handler) {
      const body = handler({ config, params, body: parseBody(config) });
      return toResponse(config, body);
    }

    if (BLOCKED_PREFIXES.some((prefix) => path === prefix || path.startsWith(`${prefix}/`))) {
      throw toHttpError(403, BLOCKED_CODE, BLOCKED_MESSAGE, config);
    }

    throw toHttpError(404, UNKNOWN_CODE, UNKNOWN_MESSAGE, config);
  };

  installation = { store, previousAdapter, demoAdapter };
  api.defaults.adapter = demoAdapter;

  return function uninstall() {
    return uninstallDemoTransport();
  };
}

export function uninstallDemoTransport() {
  if (!installation) return false;
  api.defaults.adapter = installation.previousAdapter;
  installation = null;
  return true;
}

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { AxiosError } from 'axios';
import api from '../services/api.js';
import { createDemoStore } from '../demo/store.js';
import { installDemoTransport, uninstallDemoTransport, isDemoTransportInstalled } from '../demo/adapter.js';

const NOW = new Date('2026-10-15T12:00:00.000Z');

// Codes that would trigger AuthContext.jsx:162-187 (logout / redirect) —
// the demo adapter must NEVER produce them.
const AUTH_TRIGGER_CODES = ['ACCOUNT_SUSPENDED', 'ACCOUNT_DEACTIVATED', 'ACCOUNT_PENDING', 'PAYMENT_REQUIRED', 'PAYMENT_UNDER_VERIFICATION'];

let store;

beforeEach(() => {
  uninstallDemoTransport(); // belt & braces
  store = createDemoStore({ now: NOW });
});

afterEach(() => {
  uninstallDemoTransport();
});

describe('install / uninstall lifecycle', () => {
  it('saves and restores the exact previous adapter', () => {
    const before = api.defaults.adapter;
    installDemoTransport(store);
    expect(api.defaults.adapter).not.toBe(before);
    expect(isDemoTransportInstalled()).toBe(true);
    const uninstall = uninstallDemoTransport();
    expect(uninstall).toBe(true);
    expect(api.defaults.adapter).toBe(before);
    expect(isDemoTransportInstalled()).toBe(false);
  });

  it('refuses a second install', () => {
    installDemoTransport(store);
    expect(() => installDemoTransport(store)).toThrow(/already installed/i);
    // original installation still intact
    expect(isDemoTransportInstalled()).toBe(true);
  });

  it('requires a store', () => {
    expect(() => installDemoTransport()).toThrow(/requires a demo store/i);
  });

  it('uninstall is idempotent', () => {
    const before = api.defaults.adapter;
    expect(uninstallDemoTransport()).toBe(false);
    expect(api.defaults.adapter).toBe(before);
    installDemoTransport(store);
    uninstallDemoTransport();
    expect(uninstallDemoTransport()).toBe(false);
    expect(api.defaults.adapter).toBe(before);
  });

  it('a request after uninstall goes back to the real adapter (no demo interception)', async () => {
    const before = api.defaults.adapter;
    installDemoTransport(store);
    expect((await api.get('/api/customer/profile')).status).toBe(200);
    expect(api.defaults.adapter).not.toBe(before);
    uninstallDemoTransport();
    expect(api.defaults.adapter).toBe(before);
    // real adapter now: /api/nope is NOT answered by the demo route table
    const err = await api.get('/api/nope/does-not-exist').catch((e) => e);
    expect(err.response?.data?.code).not.toBe('DEMO_ROUTE_MISSING');
  });

  it('refuses absolute http(s) URLs with a response-less AxiosError', async () => {
    installDemoTransport(store);
    const err = await api.get('https://evil.example.com/api/customer/profile').catch((e) => e);
    expect(err).toBeInstanceOf(AxiosError);
    expect(err.code).toBe('DEMO_TRANSPORT_REFUSED');
    expect(err.response).toBeUndefined();
  });

  it('refuses baseURL overrides', async () => {
    installDemoTransport(store);
    const err = await api.get('/api/customer/profile', { baseURL: 'https://other.example.com' }).catch((e) => e);
    expect(err).toBeInstanceOf(AxiosError);
    expect(err.code).toBe('DEMO_TRANSPORT_REFUSED');
    expect(err.response).toBeUndefined();
  });
});

describe('demo routes — served from the store with backend envelopes', () => {
  beforeEach(() => {
    installDemoTransport(store);
  });

  it('GET /api/customer/profile', async () => {
    const res = await api.get('/api/customer/profile');
    expect(res.status).toBe(200);
    expect(res.data.success).toBe(true);
    expect(res.data.message).toBe('Profile retrieved successfully.');
    expect(res.data.data.balance).toBe(1485);
    expect(res.data.data.stats.lifetimeEarned).toBe(1785);
    expect(res.data.data.rewardSettings.minRedeemPoints).toBe(100);
  });

  it('GET /api/customer/balance', async () => {
    const res = await api.get('/api/customer/balance');
    expect(res.data).toEqual({ success: true, message: 'Balance retrieved successfully.', data: { balance: 1485 } });
  });

  it('GET /api/customer/transactions with pagination & search params', async () => {
    const res = await api.get('/api/customer/transactions?page=1&limit=5&search=Cedar');
    expect(res.data.success).toBe(true);
    expect(res.data.data.pagination).toEqual({ total: 4, page: 1, limit: 5, totalPages: 1 });
    expect(res.data.data.transactions).toHaveLength(4);
    expect(res.data.data.transactions[0].merchant.businessName).toBe('Cedar Kitchen Restaurant');
  });

  it('GET /api/customer/ledger', async () => {
    const res = await api.get('/api/customer/ledger?page=1&limit=3');
    expect(res.data.success).toBe(true);
    expect(res.data.data.pagination.total).toBe(18);
    expect(res.data.data.entries).toHaveLength(3);
    expect(res.data.data.entries[0].transaction.merchant.businessName).toBe('Iron Peak Gym');
  });

  it('GET /api/customer/merchants returns the array FindPartners reads (FindPartners.jsx:25)', async () => {
    const res = await api.get('/api/customer/merchants');
    expect(res.data.success).toBe(true);
    expect(Array.isArray(res.data.data)).toBe(true);
    expect(res.data.data).toHaveLength(12);
    expect(res.data.data[0]).toHaveProperty('businessName');
    expect(res.data.data[0]).toHaveProperty('createdAt');
  });

  it('GET /api/customer/milestone-progress exposes data + totalSpend (customerController.js:980-984)', async () => {
    const res = await api.get('/api/customer/milestone-progress');
    expect(res.data.success).toBe(true);
    expect(res.data.totalSpend).toBe(9950);
    expect(res.data.data[2]).toMatchObject({ spendTarget: 10000, isUnlocked: false, amountRemaining: 50 });
  });

  it('GET /api/customer/referral-stats', async () => {
    const res = await api.get('/api/customer/referral-stats');
    expect(res.data.success).toBe(true);
    expect(res.data.data).toEqual({
      referralCode: 'SKXTDEMO0001',
      monthlyReferrals: 1,
      totalPointsEarned: 20,
      monthlyCapRemaining: 9
    });
  });

  it('GET /api/ads/active returns the array AdBanner reads (AdBanner.jsx:381-382)', async () => {
    const res = await api.get('/api/ads/active');
    expect(res.data.success).toBe(true);
    expect(res.data.data).toHaveLength(3);
    expect(res.data.data[0].merchant).toHaveProperty('businessName');
    expect(res.data.data[0]).toHaveProperty('icon');
  });

  it('PATCH /api/ads/:id/click tracking no-op', async () => {
    const res = await api.patch('/api/ads/demo-ad-01/click');
    expect(res.data.success).toBe(true);
  });

  it('PUT /api/customer/profile updates and returns the profile', async () => {
    const res = await api.put('/api/customer/profile', { name: 'API Updated', city: 'Amritsar' });
    expect(res.data.success).toBe(true);
    expect(res.data.data.name).toBe('API Updated');
    expect(res.data.data.city).toBe('Amritsar');
    expect((await api.get('/api/customer/profile')).data.data.name).toBe('API Updated');
  });

  it('PUT /api/customer/profile rejects invalid payloads with 400 DEMO_VALIDATION', async () => {
    const err = await api.put('/api/customer/profile', { name: '' }).catch((e) => e);
    expect(err).toBeInstanceOf(AxiosError);
    expect(err.response.status).toBe(400);
    expect(err.response.data).toEqual({ success: false, code: 'DEMO_VALIDATION', message: 'Name is required.' });
  });

  it('PUT /api/customer/profile/email updates the email', async () => {
    const res = await api.put('/api/customer/profile/email', { email: 'fresh@example.com' });
    expect(res.data.success).toBe(true);
    expect(res.data.data.email).toBe('fresh@example.com');
    const err = await api.put('/api/customer/profile/email', { email: 'bad' }).catch((e) => e);
    expect(err.response.status).toBe(400);
    expect(err.response.data.success).toBe(false);
  });
});

describe('demo routes — chatbot (FLAT body, no envelope)', () => {
  beforeEach(() => {
    installDemoTransport(store);
  });

  it('returns the flat reply FloatingChatbot.jsx:104 reads', async () => {
    const res = await api.post('/api/chatbot/message', { question: 'How do I earn points?', userRole: 'guest' });
    expect(res.status).toBe(200);
    expect(res.data.response).toBeTruthy();
    expect(res.data.answer).toBe(res.data.response);
    expect(res.data.matched).toBe(true);
    expect(res.data.success).toBeUndefined();
    expect(res.data.data).toBeUndefined();
  });

  it('rejects a missing question with 400', async () => {
    const err = await api.post('/api/chatbot/message', {}).catch((e) => e);
    expect(err.response.status).toBe(400);
    expect(err.response.data.code).toBe('DEMO_VALIDATION');
  });
});

describe('demo routes — simulate earn & redeem', () => {
  beforeEach(() => {
    installDemoTransport(store);
  });

  it('POST /api/customer/simulate/earn earns and unlocks M3', async () => {
    const res = await api.post('/api/customer/simulate/earn', { merchantId: 'demo-m-03', purchaseAmount: '50' });
    expect(res.data.success).toBe(true);
    expect(res.data.data.points).toBe(5);
    expect(res.data.data.milestonesUnlocked[0].bonusPoints).toBe(1500);
    expect(res.data.data.newBalance).toBe(2990);
    expect((await api.get('/api/customer/balance')).data.data.balance).toBe(2990);
    expect((await api.get('/api/customer/milestone-progress')).data.totalSpend).toBe(10000);
  });

  it('POST /api/customer/simulate/redeem applies the 5% fee', async () => {
    const res = await api.post('/api/customer/simulate/redeem', {
      merchantId: 'demo-m-01',
      pointsToRedeem: 100,
      billAmount: 250
    });
    expect(res.data.success).toBe(true);
    expect(res.data.data.fee).toEqual({ grossDiscount: 10, feePercent: 5, platformFee: 0.5, netAmount: 9.5 });
    expect(res.data.data.newBalance).toBe(1385);
    expect((await api.get('/api/customer/transactions?page=1&limit=5')).data.data.pagination.total).toBe(19);
  });

  it('maps store validation failures to 400', async () => {
    const err = await api
      .post('/api/customer/simulate/earn', { merchantId: 'demo-m-03', purchaseAmount: '-5' })
      .catch((e) => e);
    expect(err.response.status).toBe(400);
    expect(err.response.data.code).toBe('DEMO_VALIDATION');
  });

  it('maps the sim cap to 403 DEMO_SIM_LIMIT', async () => {
    for (let i = 0; i < 50; i++) {
      await api.post('/api/customer/simulate/earn', { merchantId: 'demo-m-03', purchaseAmount: '100' });
    }
    const err = await api
      .post('/api/customer/simulate/earn', { merchantId: 'demo-m-03', purchaseAmount: '100' })
      .catch((e) => e);
    expect(err.response.status).toBe(403);
    expect(err.response.data.code).toBe('DEMO_SIM_LIMIT');
    expect(err.response.data.success).toBe(false);
  });
});

describe('dispatch rules — SSE, blocked, unknown', () => {
  beforeEach(() => {
    installDemoTransport(store);
  });

  it('SSE token rejects WITHOUT a response — never 401, never AUTH_TRIGGER_CODES', async () => {
    const err = await api.get('/api/customer/sse-token').catch((e) => e);
    expect(err).toBeInstanceOf(AxiosError);
    expect(err.code).toBe('DEMO_SSE_UNSUPPORTED');
    expect(err.response).toBeUndefined();
  });

  it('SSE stream path is also rejected response-less', async () => {
    const err = await api.get('/api/customer/notifications/stream?token=x').catch((e) => e);
    expect(err.code).toBe('DEMO_SSE_UNSUPPORTED');
    expect(err.response).toBeUndefined();
  });

  it('protected routes get 403 DEMO_SIGNUP_REQUIRED with the approved message', async () => {
    const err = await api.post('/api/auth/login', { identifier: 'x', password: 'y' }).catch((e) => e);
    expect(err).toBeInstanceOf(AxiosError);
    expect(err.isAxiosError).toBe(true);
    expect(err.response.status).toBe(403);
    expect(err.response.data).toEqual({
      success: false,
      code: 'DEMO_SIGNUP_REQUIRED',
      message: 'Sign up to continue this action'
    });
    // interceptor safety: outside AuthContext's trigger set (AuthContext.jsx:157-234)
    expect(err.response.status).not.toBe(401);
    expect(AUTH_TRIGGER_CODES).not.toContain(err.response.data.code);
    expect(err.response.data.code).not.toBe('TOKEN_EXPIRED');
    expect(err.response.data.code).not.toBe('UNAUTHORIZED');
  });

  it('blocks non-demo customer routes too (e.g. QR, password, mobile OTP)', async () => {
    for (const [method, url] of [
      ['get', '/api/customer/qr'],
      ['put', '/api/customer/profile/password'],
      ['post', '/api/customer/profile/mobile/request-otp'],
      ['get', '/api/merchant/dashboard'],
      ['get', '/api/admin/dashboard'],
      ['post', '/api/auth/logout'],
      ['get', '/api/ads/nonexistent']
    ]) {
      const err = await api[method](url, method === 'get' ? undefined : {}).catch((e) => e);
      expect(err.response.status, `${method.toUpperCase()} ${url}`).toBe(403);
      expect(err.response.data.code).toBe('DEMO_SIGNUP_REQUIRED');
      expect(err.response.status).not.toBe(401);
      expect(AUTH_TRIGGER_CODES).not.toContain(err.response.data.code);
    }
  });

  it('unknown routes get 404 DEMO_ROUTE_MISSING', async () => {
    const err = await api.get('/api/nope/does-not-exist').catch((e) => e);
    expect(err.response.status).toBe(404);
    expect(err.response.data).toEqual({
      success: false,
      code: 'DEMO_ROUTE_MISSING',
      message: 'This endpoint is not part of the SkillXT demo.'
    });
    expect(AUTH_TRIGGER_CODES).not.toContain(err.response.data.code);
  });
});

/**
 * In-memory demo store — single source of truth for the guest demo.
 *
 * Created via createDemoStore() (no module-level mutable singleton). All
 * state lives in closure; reset() re-materializes fixtures. No localStorage,
 * no real token reads/writes, no network.
 *
 * Response shapes mirror backend controllers (verified):
 *   profile   backend/src/controllers/customerController.js:82-136
 *   balance   customerController.js:150-155
 *   ledger    customerController.js:226-237
 *   txs       customerController.js:300-311
 *   referral  customerController.js:895-903
 *   milestones customerController.js:980-984
 */

import {
  DEMO_MERCHANTS,
  DEMO_CUSTOMER_ID,
  DEMO_PROFILE_BASE,
  DEMO_LEDGER,
  DEMO_TRANSACTIONS,
  DEMO_MILESTONES,
  DEMO_REFERRAL_STATS,
  DEMO_ADS,
  DEMO_CHATBOT_REPLY,
  daysAgoIso,
  daysFromIso
} from './fixtures/index.js';
import {
  DEMO_REWARD_SETTINGS,
  calcEarnPoints,
  calcExpiryDate,
  calcBalance,
  calcRedemptionFee,
  validateRedemption,
  calcLifetime,
  calcExpiringPoints,
  calcTotalSpend,
  calcMilestoneProgress,
  milestonesCrossed
} from './math.js';

export const DEMO_SIM_LIMIT = 50;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const DAY_MS = 24 * 60 * 60 * 1000;

const PROFILE_EDITABLE = [
  'name',
  'dateOfBirth',
  'gender',
  'city',
  'pinCode',
  'area',
  'occupation',
  'maritalStatus',
  'anniversaryDate',
  'numberOfChildren',
  'preferredLanguage',
  'communicationPref',
  'favouriteCategories',
  'dietaryPreference',
  'notificationOptIn',
  'profilePhoto',
  'alternativePhone'
];

const clone = (value) => JSON.parse(JSON.stringify(value));
const fail = (code, message) => ({ ok: false, code, message });
const ok = (data) => ({ ok: true, data });

export function createDemoStore({ now } = {}) {
  const start = now instanceof Date ? new Date(now.getTime()) : new Date();
  const startIso = start.toISOString();

  let simCount = 0;
  let simSeq = 0;
  let state = null;

  // Mutation listeners — DemoContext subscribes so a version counter can
  // remount <Outlet/> (dashboard/profile refetch) after successful writes.
  const listeners = new Set();
  function notify() {
    for (const listener of listeners) listener();
  }

  function materializeProfile() {
    const { daysAgo, updatedAtDaysAgo, ...rest } = DEMO_PROFILE_BASE;
    return {
      ...rest,
      createdAt: daysAgoIso(daysAgo, start),
      updatedAt: daysAgoIso(updatedAtDaysAgo, start)
    };
  }

  function buildState() {
    const profile = materializeProfile();

    const ledger = DEMO_LEDGER.map((e) => ({
      id: e.id,
      customerId: DEMO_CUSTOMER_ID,
      transactionId: e.transactionId,
      pointsChange: e.pointsChange,
      createdAt: daysAgoIso(e.daysAgo, start),
      expiresAt: e.expiresInDays === null ? null : daysFromIso(e.expiresInDays, start)
    }));

    const transactions = DEMO_TRANSACTIONS.map((t) => ({
      ...clone(t),
      createdAt: daysAgoIso(t.daysAgo, start),
      updatedAt: daysAgoIso(t.daysAgo, start)
    }));
    for (const t of transactions) delete t.daysAgo;

    const merchants = DEMO_MERCHANTS.map((m) => {
      const { daysAgo: mDays, ...rest } = m;
      return { ...clone(rest), createdAt: daysAgoIso(mDays, start) };
    });

    return {
      profile,
      ledger,
      transactions,
      merchants,
      milestones: clone(DEMO_MILESTONES),
      ads: clone(DEMO_ADS),
      referralStats: clone(DEMO_REFERRAL_STATS)
    };
  }

  state = buildState();

  function expiredPoints() {
    const nowMs = start.getTime();
    return state.ledger.reduce((sum, e) => {
      if (e.pointsChange > 0 && e.expiresAt && new Date(e.expiresAt).getTime() <= nowMs) {
        return sum + e.pointsChange;
      }
      return sum;
    }, 0);
  }

  function getProfile() {
    const balance = calcBalance(state.ledger, start);
    const { lifetimeEarned, lifetimeRedeemed } = calcLifetime(state.ledger);
    const expiring = calcExpiringPoints(state.ledger, start, 30);
    const totalVisits = state.transactions.filter((t) => t.status === 'completed').length;

    return {
      ...clone(state.profile),
      balance,
      rewardSettings: { ...DEMO_REWARD_SETTINGS },
      stats: {
        lifetimeEarned,
        lifetimeRedeemed,
        totalVisits,
        balance,
        expiredPoints: expiredPoints(),
        expiringWithin30Days: expiring.totalExpiring,
        expiringEntries: expiring.entries
      }
    };
  }

  function getBalance() {
    return { balance: calcBalance(state.ledger, start) };
  }

  function matchesSearch(text, search) {
    return typeof text === 'string' && text.includes(search);
  }

  function paginate(rows, page, limit) {
    const total = rows.length;
    const totalPages = Math.ceil(total / limit);
    const skip = (page - 1) * limit;
    return { rows: rows.slice(skip, skip + limit), total, totalPages };
  }

  function listTransactions({ page = 1, limit = 20, search = '' } = {}) {
    let rows = [...state.transactions];
    if (search) {
      rows = rows.filter(
        (t) => matchesSearch(t.remarks, search) || matchesSearch(t.merchant?.businessName, search)
      );
    }
    rows.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    const { rows: txs, total, totalPages } = paginate(rows, page, limit);
    return {
      transactions: txs,
      pagination: { total, page, limit, totalPages }
    };
  }

  function getLedger({ page = 1, limit = 20, search = '' } = {}) {
    let rows = [...state.ledger];
    if (search) {
      rows = rows.filter((e) => {
        const t = state.transactions.find((tx) => tx.id === e.transactionId);
        return matchesSearch(t?.remarks, search) || matchesSearch(t?.merchant?.businessName, search);
      });
    }
    rows.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    const entries = rows.map((e) => {
      const t = state.transactions.find((tx) => tx.id === e.transactionId);
      return {
        ...clone(e),
        transaction: {
          type: t?.type ?? null,
          purchaseAmount: t?.purchaseAmount ?? null,
          remarks: t?.remarks ?? null,
          merchant: { businessName: t?.merchant?.businessName ?? null }
        }
      };
    });
    const { rows: pageRows, total, totalPages } = paginate(entries, page, limit);
    return {
      entries: pageRows,
      pagination: { total, page, limit, totalPages }
    };
  }

  function getMilestoneProgress() {
    const totalSpend = calcTotalSpend(state.transactions);
    const active = state.milestones.filter((m) => m.isActive);
    return { data: calcMilestoneProgress(totalSpend, active), totalSpend };
  }

  function getReferralStats() {
    return clone(state.referralStats);
  }

  function updateProfile(patch) {
    const fields = {};
    for (const key of PROFILE_EDITABLE) {
      if (Object.prototype.hasOwnProperty.call(patch, key)) fields[key] = patch[key];
    }

    if (fields.name !== undefined && (typeof fields.name !== 'string' || fields.name.trim() === '')) {
      return fail('DEMO_VALIDATION', 'Name is required.');
    }
    if (fields.favouriteCategories !== undefined && !Array.isArray(fields.favouriteCategories)) {
      return fail('DEMO_VALIDATION', 'Favourite categories must be a list.');
    }
    if (
      fields.numberOfChildren !== undefined &&
      (!Number.isInteger(fields.numberOfChildren) || fields.numberOfChildren < 0)
    ) {
      return fail('DEMO_VALIDATION', 'Number of children must be a non-negative whole number.');
    }

    Object.assign(state.profile, fields, { updatedAt: startIso });
    notify();
    return ok(getProfile());
  }

  function updateEmail(email) {
    if (typeof email !== 'string' || !EMAIL_RE.test(email)) {
      return fail('DEMO_VALIDATION', 'Please enter a valid email address.');
    }
    state.profile.email = email;
    state.profile.updatedAt = startIso;
    notify();
    return ok(getProfile());
  }

  function getChatbotReply(question) {
    const reply = clone(DEMO_CHATBOT_REPLY);
    if (typeof question === 'string' && question.trim()) {
      const q = question.toLowerCase();
      if (q.includes('point worth') || q.includes('worth')) {
        reply.matched = true;
        reply.title = 'Point value';
        reply.answer = '1 point = ₹0.10. 100 points give a ₹10 discount (5% platform fee applies, so you get ₹9.5 net).';
        reply.response = reply.answer;
      } else if (q.includes('earn')) {
        reply.title = 'Earning points';
        reply.answer = 'Spend at any SkillXT partner: you earn 1 point per ₹10 (rounded down). Milestone bonuses unlock at ₹1,000 and ₹5,000 lifetime spend.';
        reply.response = reply.answer;
      } else if (q.includes('redeem') || q.includes('discount')) {
        reply.title = 'Redeeming points';
        reply.answer = 'Minimum redemption is 100 points. Redeem against a bill — a 5% platform fee applies on the discount value.';
        reply.response = reply.answer;
      }
    }
    return reply;
  }

  function findMerchant(merchantId) {
    if (typeof merchantId !== 'string' || !merchantId) {
      return { error: fail('DEMO_VALIDATION', 'Merchant is required.') };
    }
    const merchant = state.merchants.find((m) => m.id === merchantId && m.isActive);
    if (!merchant) return { error: fail('DEMO_VALIDATION', 'Merchant is inactive or not found.') };
    return { merchant };
  }

  function checkSimLimit() {
    if (simCount >= DEMO_SIM_LIMIT) {
      return fail(
        'DEMO_SIM_LIMIT',
        `Demo limit reached (${DEMO_SIM_LIMIT} simulated transactions). Sign up to continue!`
      );
    }
    return null;
  }

  function pushTxAndLedger({ type, purchaseAmount, invoiceAmount, points, pointsChange = points, platformFee, netAmount, remarks, merchantId, merchant, expiresAt }) {
    simSeq += 1;
    const txId = `demo-sim-tx-${simSeq}`;
    const lgId = `demo-sim-lg-${simSeq}`;

    const tx = {
      id: txId,
      customerId: DEMO_CUSTOMER_ID,
      merchantId,
      type,
      purchaseAmount,
      invoiceAmount,
      points,
      platformFee,
      netAmount,
      remarks,
      status: 'completed',
      createdAt: startIso,
      updatedAt: startIso,
      merchant: { businessName: merchant.businessName, category: merchant.category }
    };

    state.transactions.push(tx);
    state.ledger.push({
      id: lgId,
      customerId: DEMO_CUSTOMER_ID,
      transactionId: txId,
      pointsChange,
      createdAt: startIso,
      expiresAt: type === 'redeem' ? null : expiresAt
    });
    notify();

    return tx;
  }

  function simulateEarn({ merchantId, purchaseAmount } = {}) {
    const { merchant, error } = findMerchant(merchantId);
    if (error) return error;

    const amount = parseFloat(purchaseAmount);
    if (!Number.isFinite(amount) || amount <= 0) {
      return fail('DEMO_VALIDATION', 'Purchase amount must be a positive number.');
    }

    const limitError = checkSimLimit();
    if (limitError) return limitError;

    const points = calcEarnPoints(amount);
    const prevSpend = calcTotalSpend(state.transactions);
    const expiresAt = calcExpiryDate(start).toISOString();

    const tx = pushTxAndLedger({
      type: 'earn',
      purchaseAmount: String(amount),
      invoiceAmount: null,
      points,
      platformFee: null,
      netAmount: null,
      remarks: `Earned points at ${merchant.businessName}`,
      merchantId: merchant.id,
      merchant,
      expiresAt
    });
    simCount += 1;

    const newSpend = prevSpend + amount;
    const milestonesUnlocked = milestonesCrossed(prevSpend, newSpend, state.milestones).map(
      (milestone) => {
        const bonusTx = pushTxAndLedger({
          type: 'earn',
          purchaseAmount: null,
          invoiceAmount: null,
          points: milestone.bonusPoints,
          platformFee: null,
          netAmount: null,
          remarks: `Milestone Bonus - Rs. ${milestone.spendTarget} spend achieved`,
          merchantId: merchant.id,
          merchant,
          expiresAt
        });
        return {
          id: milestone.id,
          spendTarget: parseFloat(milestone.spendTarget),
          bonusPoints: milestone.bonusPoints,
          transactionId: bonusTx.id
        };
      }
    );

    return ok({
      transaction: clone(tx),
      points,
      newBalance: calcBalance(state.ledger, start),
      milestonesUnlocked
    });
  }

  function simulateRedeem({ merchantId, pointsToRedeem, billAmount } = {}) {
    const { merchant, error } = findMerchant(merchantId);
    if (error) return error;

    const balance = calcBalance(state.ledger, start);
    const validation = validateRedemption({
      pointsToRedeem,
      billAmount,
      balance,
      settings: DEMO_REWARD_SETTINGS
    });
    if (!validation.ok) return fail(validation.code, validation.message);

    const limitError = checkSimLimit();
    if (limitError) return limitError;

    const points = Number(pointsToRedeem);
    const bill = parseFloat(billAmount);
    const fee = calcRedemptionFee(points, DEMO_REWARD_SETTINGS);

    const tx = pushTxAndLedger({
      type: 'redeem',
      purchaseAmount: String(fee.grossDiscount),
      invoiceAmount: String(bill),
      points,
      pointsChange: -points,
      platformFee: String(fee.platformFee),
      netAmount: String(fee.netAmount),
      remarks: `Redeemed ${points} points for Rs. ${fee.netAmount} discount on Rs. ${bill} invoice (Rs. ${fee.platformFee} platform fee)`,
      merchantId: merchant.id,
      merchant,
      expiresAt: null
    });
    simCount += 1;

    return ok({
      transaction: clone(tx),
      pointsDeducted: points,
      fee,
      newBalance: calcBalance(state.ledger, start)
    });
  }

  function reset() {
    state = buildState();
    simCount = 0;
    simSeq = 0;
    notify();
    return getProfile();
  }

  function subscribe(listener) {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  }

  return {
    getProfile,
    getBalance,
    listTransactions,
    getLedger,
    getMerchants: () => clone(state.merchants),
    getAds: () => clone(state.ads),
    getMilestoneProgress,
    getReferralStats,
    getChatbotReply,
    updateProfile,
    updateEmail,
    simulateEarn,
    simulateRedeem,
    reset,
    subscribe,
    getSimCount: () => simCount
  };
}

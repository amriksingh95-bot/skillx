import { describe, it, expect, beforeEach } from 'vitest';
import { createDemoStore, DEMO_SIM_LIMIT } from '../demo/store.js';

const NOW = new Date('2026-10-15T12:00:00.000Z');
const makeStore = () => createDemoStore({ now: NOW });

describe('demo store — profile & derived stats', () => {
  let store;
  beforeEach(() => {
    store = makeStore();
  });

  it('returns the backend profile shape with balance === stats.balance (customerController.js:82-136)', () => {
    const p = store.getProfile();
    expect(p).toMatchObject({
      id: 'demo-customer-01',
      name: 'Aarav Mehta',
      city: 'Ludhiana',
      balance: 1485,
      rewardSettings: { pointsPerRupee: 0.1, rupeesPerPoint: 0.1, minRedeemPoints: 100, pointsExpiryDays: 365 }
    });
    expect(p.stats.balance).toBe(p.balance);
    expect(p.stats.lifetimeEarned).toBe(1785);
    expect(p.stats.lifetimeRedeemed).toBe(300);
    expect(p.stats.totalVisits).toBe(18);
    expect(p.stats.expiredPoints).toBe(0);
    expect(p.stats.expiringWithin30Days).toBe(0);
    expect(p.stats.expiringEntries).toEqual([]);
    expect(p.createdAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    expect(p).not.toHaveProperty('daysAgo');
    expect(p).not.toHaveProperty('updatedAtDaysAgo');
  });

  it('getBalance returns just { balance } (customerController.js:150-155)', () => {
    expect(store.getBalance()).toEqual({ balance: 1485 });
  });

  it('materializes merchant createdAt and keeps the merchant payload intact', () => {
    const merchants = store.getMerchants();
    expect(merchants).toHaveLength(12);
    expect(merchants[0]).toHaveProperty('createdAt');
    expect(merchants[0]).not.toHaveProperty('daysAgo');
    expect(merchants[0].offers.length).toBeGreaterThan(0);
    expect(store.getAds()).toHaveLength(3);
  });

  it('returns copies, not live state references', () => {
    const a = store.getMerchants();
    a[0].businessName = 'Hacked';
    expect(store.getMerchants()[0].businessName).not.toBe('Hacked');
  });
});

describe('demo store — transactions & ledger', () => {
  let store;
  beforeEach(() => {
    store = makeStore();
  });

  it('lists transactions newest-first with pagination (customerController.js:300-311)', () => {
    const page1 = store.listTransactions({ page: 1, limit: 10 });
    expect(page1.pagination).toEqual({ total: 18, page: 1, limit: 10, totalPages: 2 });
    expect(page1.transactions).toHaveLength(10);
    expect(page1.transactions[0].id).toBe('demo-tx-18'); // 5 days ago = newest
    const page2 = store.listTransactions({ page: 2, limit: 10 });
    expect(page2.transactions).toHaveLength(8);
    const seen = new Set([...page1.transactions, ...page2.transactions].map((t) => t.id));
    expect(seen.size).toBe(18);
  });

  it('searches remarks OR merchant businessName (case-sensitive contains, Prisma semantics)', () => {
    expect(store.listTransactions({ search: 'Milestone' }).pagination.total).toBe(2);
    expect(store.listTransactions({ search: 'milestone' }).pagination.total).toBe(0);
    expect(store.listTransactions({ search: 'Cedar Kitchen' }).pagination.total).toBe(4);
    expect(store.listTransactions({ search: 'zzz' }).pagination.total).toBe(0);
  });

  it('ledger entries embed transaction summary for the UI', () => {
    const { entries, pagination } = store.getLedger({ page: 1, limit: 5 });
    expect(pagination.total).toBe(18);
    expect(entries).toHaveLength(5);
    expect(entries[0].transaction.merchant.businessName).toBe('Iron Peak Gym');
    expect(entries[0].transaction.type).toBe('earn');
    expect(store.getLedger({ search: 'Referral' }).pagination.total).toBe(1);
    expect(store.getLedger({ search: 'NovaMart' }).pagination.total).toBeGreaterThan(0);
  });

  it('expiry dates materialize from fixture offsets', () => {
    const { entries } = store.getLedger({ page: 1, limit: 18 });
    const withExpiry = entries.filter((e) => e.expiresAt);
    expect(withExpiry.length).toBeGreaterThan(0);
    for (const e of withExpiry) {
      expect(() => new Date(e.expiresAt).toISOString()).not.toThrow();
    }
  });
});

describe('demo store — milestone progress', () => {
  it('mirrors customerController.js:964-984 including totalSpend', () => {
    const store = makeStore();
    const { data, totalSpend } = store.getMilestoneProgress();
    expect(totalSpend).toBe(9950);
    expect(data).toHaveLength(4);
    expect(data[2]).toMatchObject({
      spendTarget: 10000,
      bonusPoints: 1500,
      isUnlocked: false,
      amountRemaining: 50
    });
    expect(data[2].progressPercent).toBeCloseTo(99.5, 6);
    expect(data[0].isUnlocked).toBe(true);
    expect(data[1].isUnlocked).toBe(true);
    expect(data[3].isUnlocked).toBe(false);
  });
});

describe('demo store — simulateEarn', () => {
  let store;
  beforeEach(() => {
    store = makeStore();
  });

  it('earns floor(amount * 0.1), appends tx + ledger with 365-day expiry', () => {
    // ₹40 keeps lifetime spend at 9,990 — no milestone crossing here
    const r = store.simulateEarn({ merchantId: 'demo-m-03', purchaseAmount: '40' });
    expect(r.ok).toBe(true);
    expect(r.data.points).toBe(4);
    expect(r.data.milestonesUnlocked).toEqual([]);
    expect(r.data.transaction.type).toBe('earn');
    expect(r.data.transaction.status).toBe('completed');
    expect(r.data.transaction.purchaseAmount).toBe('40');
    expect(r.data.transaction.merchant.businessName).toBe('NovaMart Grocery');
    expect(r.data.newBalance).toBe(1485 + 4);
    const { entries } = store.getLedger({ page: 1, limit: 25 });
    const simEntry = entries.find((e) => e.id.startsWith('demo-sim-lg-'));
    expect(simEntry).toBeTruthy();
    expect(new Date(simEntry.expiresAt).getTime()).toBe(NOW.getTime() + 365 * 86400000);
    expect(store.getSimCount()).toBe(1);
  });

  it('unlocks milestone M3 at ₹10,000 with the bonus credited (pointsService.js:186-212)', () => {
    const r = store.simulateEarn({ merchantId: 'demo-m-03', purchaseAmount: '50' });
    expect(r.ok).toBe(true);
    expect(r.data.points).toBe(5);
    expect(r.data.milestonesUnlocked).toHaveLength(1);
    expect(r.data.milestonesUnlocked[0]).toMatchObject({ id: 'demo-ms-10000', bonusPoints: 1500 });
    expect(r.data.newBalance).toBe(1485 + 5 + 1500);
    const progress = store.getMilestoneProgress();
    expect(progress.totalSpend).toBe(10000);
    expect(progress.data[2].isUnlocked).toBe(true);
    // M4 must NOT unlock
    expect(progress.data[3].isUnlocked).toBe(false);
  });

  it('rejects unknown / inactive merchants and bad amounts', () => {
    expect(store.simulateEarn({ merchantId: 'nope', purchaseAmount: '100' })).toMatchObject({ ok: false, code: 'DEMO_VALIDATION' });
    expect(store.simulateEarn({ purchaseAmount: '100' })).toMatchObject({ ok: false, code: 'DEMO_VALIDATION' });
    expect(store.simulateEarn({ merchantId: 'demo-m-01', purchaseAmount: 'abc' })).toMatchObject({ ok: false, code: 'DEMO_VALIDATION' });
    expect(store.simulateEarn({ merchantId: 'demo-m-01', purchaseAmount: '0' })).toMatchObject({ ok: false, code: 'DEMO_VALIDATION' });
    expect(store.simulateEarn({ merchantId: 'demo-m-01', purchaseAmount: '-10' })).toMatchObject({ ok: false, code: 'DEMO_VALIDATION' });
    expect(store.getSimCount()).toBe(0);
  });
});

describe('demo store — simulateRedeem', () => {
  let store;
  beforeEach(() => {
    store = makeStore();
  });

  it('deducts points and records gross/fee/net with remarks (pointsService.js:291)', () => {
    const r = store.simulateRedeem({ merchantId: 'demo-m-01', pointsToRedeem: 100, billAmount: 250 });
    expect(r.ok).toBe(true);
    expect(r.data.pointsDeducted).toBe(100);
    expect(r.data.fee).toEqual({ grossDiscount: 10, feePercent: 5, platformFee: 0.5, netAmount: 9.5 });
    expect(r.data.newBalance).toBe(1385);
    const t = r.data.transaction;
    expect(t.type).toBe('redeem');
    expect(t.invoiceAmount).toBe('250');
    expect(t.purchaseAmount).toBe('10');
    expect(t.platformFee).toBe('0.5');
    expect(t.netAmount).toBe('9.5');
    expect(t.remarks).toContain('Rs. 9.5 discount on Rs. 250 invoice');
    // redeem ledger entry never expires
    const { entries } = store.getLedger({ page: 1, limit: 25 });
    const simEntry = entries.find((e) => e.id.startsWith('demo-sim-lg-'));
    expect(simEntry.expiresAt).toBeNull();
    expect(simEntry.pointsChange).toBe(-100);
  });

  it('enforces min redeem, DEMO-ONLY bill cap, and balance', () => {
    expect(store.simulateRedeem({ merchantId: 'demo-m-01', pointsToRedeem: 99, billAmount: 500 })).toMatchObject({
      ok: false,
      code: 'DEMO_VALIDATION'
    });
    // DEMO-ONLY: gross 10 > bill 5
    const over = store.simulateRedeem({ merchantId: 'demo-m-01', pointsToRedeem: 100, billAmount: 5 });
    expect(over).toMatchObject({ ok: false, code: 'DEMO_VALIDATION' });
    expect(over.message).toContain('cannot exceed');
    // insufficient balance (1485 available)
    expect(store.simulateRedeem({ merchantId: 'demo-m-01', pointsToRedeem: 1500, billAmount: 500 })).toMatchObject({
      ok: false,
      code: 'DEMO_VALIDATION'
    });
    expect(store.getSimCount()).toBe(0);
  });
});

describe('demo store — simulation cap', () => {
  it('allows exactly DEMO_SIM_LIMIT ops then fails with DEMO_SIM_LIMIT', () => {
    const store = makeStore();
    for (let i = 0; i < DEMO_SIM_LIMIT; i++) {
      const r = store.simulateEarn({ merchantId: 'demo-m-03', purchaseAmount: '100' });
      expect(r.ok).toBe(true);
    }
    expect(store.getSimCount()).toBe(DEMO_SIM_LIMIT);
    const over = store.simulateEarn({ merchantId: 'demo-m-03', purchaseAmount: '100' });
    expect(over).toMatchObject({ ok: false, code: 'DEMO_SIM_LIMIT' });
    expect(over.message).toContain('Sign up');
    // valid redeem at cap also reports the cap
    expect(
      store.simulateRedeem({ merchantId: 'demo-m-03', pointsToRedeem: 100, billAmount: 500 })
    ).toMatchObject({ ok: false, code: 'DEMO_SIM_LIMIT' });
    // but input validation still wins over the cap
    expect(
      store.simulateRedeem({ merchantId: 'demo-m-03', pointsToRedeem: 50, billAmount: 500 })
    ).toMatchObject({ ok: false, code: 'DEMO_VALIDATION' });
  });
});

describe('demo store — profile updates', () => {
  let store;
  beforeEach(() => {
    store = makeStore();
  });

  it('updates whitelisted fields and bumps updatedAt', () => {
    const before = store.getProfile().updatedAt;
    const r = store.updateProfile({ name: 'New Name', city: 'Jalandhar', favouriteCategories: ['Gym'] });
    expect(r.ok).toBe(true);
    expect(r.data.name).toBe('New Name');
    expect(r.data.city).toBe('Jalandhar');
    expect(r.data.favouriteCategories).toEqual(['Gym']);
    expect(r.data.updatedAt).toBe(NOW.toISOString());
    expect(r.data.updatedAt).not.toBe(before); // 3 days ago -> demo-start now
  });

  it('silently ignores non-whitelisted fields such as email', () => {
    const r = store.updateProfile({ email: 'sneaky@example.com', balance: 99999, name: 'Ok' });
    expect(r.ok).toBe(true);
    expect(r.data.email).toBe('aarav.demo@example.com');
    expect(r.data.balance).toBe(1485);
  });

  it('validates name, categories and children count', () => {
    expect(store.updateProfile({ name: '' })).toMatchObject({ ok: false, code: 'DEMO_VALIDATION' });
    expect(store.updateProfile({ favouriteCategories: 'Gym' })).toMatchObject({ ok: false, code: 'DEMO_VALIDATION' });
    expect(store.updateProfile({ numberOfChildren: -1 })).toMatchObject({ ok: false, code: 'DEMO_VALIDATION' });
  });

  it('updates email through the dedicated route handler', () => {
    const r = store.updateEmail('new.mail@example.com');
    expect(r.ok).toBe(true);
    expect(r.data.email).toBe('new.mail@example.com');
    expect(store.updateEmail('not-an-email')).toMatchObject({ ok: false, code: 'DEMO_VALIDATION' });
    expect(store.getProfile().email).toBe('new.mail@example.com');
  });
});

describe('demo store — reset & chatbot', () => {
  it('reset restores fixtures and clears the simulation counter', () => {
    const store = makeStore();
    store.simulateEarn({ merchantId: 'demo-m-03', purchaseAmount: '50' });
    store.updateProfile({ name: 'Changed' });
    expect(store.getSimCount()).toBe(1);
    const p = store.reset();
    expect(p.name).toBe('Aarav Mehta');
    expect(p.balance).toBe(1485);
    expect(store.getSimCount()).toBe(0);
    expect(store.listTransactions().pagination.total).toBe(18);
    expect(store.getMilestoneProgress().totalSpend).toBe(9950);
  });

  it('chatbot replies are keyword-aware and always flat', () => {
    const store = makeStore();
    const earn = store.getChatbotReply('How do I earn points?');
    expect(earn.matched).toBe(true);
    expect(earn.response).toBe(earn.answer);
    expect(earn).not.toHaveProperty('data');
    const fallback = store.getChatbotReply('what is the airspeed velocity of an unladen swallow');
    expect(fallback.matched).toBe(true); // demo always has an answer
    expect(fallback.response.length).toBeGreaterThan(20);
  });
});

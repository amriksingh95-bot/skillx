import { describe, it, expect } from 'vitest';
import { DEMO_MERCHANTS, DEMO_LEDGER, DEMO_TRANSACTIONS, DEMO_ADS, DEMO_MILESTONES, DEMO_REFERRAL_STATS, DEMO_PROFILE_BASE, DEMO_CHATBOT_REPLY } from '../demo/fixtures/index.js';
import { CATEGORIES, CATEGORY_CODES } from '../constants/categories.js';
import { CITIES } from '../constants/cities.js';
import { calcEarnPoints, calcBalance, calcLifetime, calcExpiringPoints, calcTotalSpend } from '../demo/math.js';

const NOW = new Date('2026-10-15T12:00:00.000Z');

// Names that must never be used (backend/prisma/seed.js:109-115 + AdBanner DEMO_ADS)
const RESERVED_NAMES = [
  'FreshMart Grocery',
  'MediPlus Pharmacy',
  'BrewBeans Cafe',
  'Dr. Sharma Clinic',
  'TechZone Electronics',
  'StyleHub Fashion',
  'QuickStop General',
  'Test Pending Shop'
];

describe('merchants fixture', () => {
  it('has exactly 10 merchants with unique ids, names, and mobiles', () => {
    expect(DEMO_MERCHANTS).toHaveLength(10);
    const ids = DEMO_MERCHANTS.map((m) => m.id);
    const names = DEMO_MERCHANTS.map((m) => m.businessName);
    expect(new Set(ids).size).toBe(10);
    expect(new Set(names).size).toBe(10);
    expect(new Set(DEMO_MERCHANTS.map((m) => m.user.mobile)).size).toBe(10);
  });

  it('avoids all reserved seed/demo names', () => {
    for (const m of DEMO_MERCHANTS) {
      expect(RESERVED_NAMES).not.toContain(m.businessName);
    }
    for (const ad of DEMO_ADS) {
      expect(RESERVED_NAMES).not.toContain(ad.merchant.businessName);
    }
  });

  it('uses only canonical category codes', () => {
    for (const m of DEMO_MERCHANTS) {
      expect(CATEGORY_CODES).toContain(m.category);
    }
    expect(CATEGORIES.length).toBe(13);
  });

  it('uses only fixed cities from constants/cities.js', () => {
    for (const m of DEMO_MERCHANTS) {
      expect(CITIES).toContain(m.city);
    }
    expect(CITIES).toEqual(expect.arrayContaining(['Ludhiana', 'Jalandhar', 'Amritsar']));
  });

  it('has plausible coordinates and fake contact details only', () => {
    for (const m of DEMO_MERCHANTS) {
      expect(Number.isFinite(m.latitude)).toBe(true);
      expect(Number.isFinite(m.longitude)).toBe(true);
      expect(m.latitude).toBeGreaterThan(30);
      expect(m.latitude).toBeLessThan(32.5);
      expect(m.user.mobile).toMatch(/^98\d{8}$/);
      expect(m.email).toMatch(/@example\.com$/);
      expect(m.googleMapsUrl).toBeNull();
      expect(Array.isArray(m.offers)).toBe(true);
      expect(m.offers.length).toBeGreaterThan(0);
      for (const offer of m.offers) {
        expect(() => new Date(offer.validUntil).toISOString()).not.toThrow();
      }
    }
  });

  it('covers 10 of the 12 FindPartners category pills (hotel & education flagged for product decision)', () => {
    const pillIds = ['grocery', 'cafe', 'restaurant', 'beauty', 'doctor', 'pharmacy', 'fashion', 'stationery', 'gym', 'electronics', 'hotel', 'education'];
    const merchantCats = DEMO_MERCHANTS.map((m) => (m.category === 'medical' ? 'pharmacy' : m.category));
    const covered = pillIds.filter((p) => merchantCats.includes(p));
    expect(covered).toHaveLength(10);
    expect(pillIds.filter((p) => !covered.includes(p))).toEqual(['hotel', 'education']);
  });
});

describe('ads fixture', () => {
  it('has 3 live ads nested on fixture merchants', () => {
    expect(DEMO_ADS).toHaveLength(3);
    const merchantIds = DEMO_MERCHANTS.map((m) => m.id);
    for (const ad of DEMO_ADS) {
      expect(merchantIds).toContain(ad.merchantId);
      expect(DEMO_MERCHANTS.map((m) => m.businessName)).toContain(ad.merchant.businessName);
      expect(ad.status).toBe('live');
      expect(typeof ad.icon).toBe('string');
      expect(typeof ad.ctaText).toBe('string');
      expect(typeof ad.bg).toBe('string');
      expect(ad.showDirections).toBe(true);
      expect(CITIES).toContain(ad.merchant.city);
      expect(Number.isFinite(ad.merchant.latitude)).toBe(true);
    }
  });
});

describe('ledger <-> transactions integrity', () => {
  it('every ledger entry maps to a transaction and vice versa', () => {
    const txIds = new Set(DEMO_TRANSACTIONS.map((t) => t.id));
    const lgTxIds = new Set(DEMO_LEDGER.map((e) => e.transactionId));
    expect(DEMO_LEDGER).toHaveLength(DEMO_TRANSACTIONS.length);
    for (const e of DEMO_LEDGER) {
      expect(txIds.has(e.transactionId)).toBe(true);
    }
    for (const t of DEMO_TRANSACTIONS) {
      expect(lgTxIds.has(t.id)).toBe(true);
    }
  });

  it('earn points match the backend floor formula', () => {
    for (const t of DEMO_TRANSACTIONS) {
      if (t.type === 'earn' && t.purchaseAmount !== null) {
        expect(t.points).toBe(calcEarnPoints(t.purchaseAmount));
      }
    }
  });

  it('redeem transactions are internally consistent with the 5% fee', () => {
    const redeems = DEMO_TRANSACTIONS.filter((t) => t.type === 'redeem');
    expect(redeems.length).toBeGreaterThanOrEqual(2);
    for (const t of redeems) {
      const gross = parseFloat(t.purchaseAmount);
      const fee = parseFloat(t.platformFee);
      const net = parseFloat(t.netAmount);
      expect(t.points).toBeGreaterThan(0);
      expect(gross).toBeCloseTo(t.points * 0.1, 6);
      expect(fee).toBeCloseTo(gross * 0.05, 6);
      expect(net).toBeCloseTo(gross - fee, 6);
    }
  });

  it('only redeem and referral entries are non-expiring', () => {
    for (const e of DEMO_LEDGER) {
      const tx = DEMO_TRANSACTIONS.find((t) => t.id === e.transactionId);
      if (e.expiresInDays === null) {
        expect(
          tx.type === 'redeem' || /referral/i.test(tx.remarks)
        ).toBe(true);
      } else {
        expect(e.expiresInDays).toBeGreaterThan(0);
        expect(e.expiresInDays).toBeLessThanOrEqual(365);
      }
    }
  });

  it('all fixture dates are relative offsets with sane ranges', () => {
    for (const e of DEMO_LEDGER) expect(e.daysAgo).toBeGreaterThan(0);
    for (const t of DEMO_TRANSACTIONS) expect(t.daysAgo).toBeGreaterThan(0);
    // ledger dataset spans ~6 months of core activity plus legacy promos
    expect(Math.max(...DEMO_LEDGER.map((e) => e.daysAgo))).toBeLessThanOrEqual(365);
  });

  it('every transaction carries the merchant object CustomerDashboard reads', () => {
    for (const t of DEMO_TRANSACTIONS) {
      expect(typeof t.merchant.businessName).toBe('string');
      expect(t.merchant.businessName.length).toBeGreaterThan(0);
      expect(CATEGORY_CODES).toContain(t.merchant.category);
      expect(t.status).toBe('completed');
    }
  });
});

describe('fixture totals (the numbers the demo is built on)', () => {
  it('balance, lifetime, expiring and spend invariants hold', () => {
    const ledger = DEMO_LEDGER.map((e) => ({
      ...e,
      expiresAt: e.expiresInDays === null ? null : new Date(NOW.getTime() + e.expiresInDays * 86400000).toISOString()
    }));
    expect(calcBalance(ledger, NOW)).toBe(1485);
    expect(calcLifetime(ledger)).toEqual({ lifetimeEarned: 1785, lifetimeRedeemed: 300 });
    expect(calcExpiringPoints(ledger, NOW, 30).totalExpiring).toBe(160);
    expect(calcTotalSpend(DEMO_TRANSACTIONS)).toBe(9950);
  });

  it('milestones: M1 + M2 unlocked, M3 at 99.5% with ₹50 remaining', () => {
    expect(DEMO_MILESTONES.map((m) => m.spendTarget)).toEqual([1000, 5000, 10000, 20000]);
    expect(DEMO_MILESTONES.every((m) => m.isActive)).toBe(true);
    const spend = calcTotalSpend(DEMO_TRANSACTIONS);
    expect(spend).toBe(9950);
    expect(spend).toBeGreaterThanOrEqual(5000);
    expect(spend).toBeLessThan(10000);
    expect(10000 - spend).toBe(50);
  });
});

describe('profile, referral and chatbot fixtures', () => {
  it('profile uses example contact details and a valid referral setup', () => {
    expect(DEMO_PROFILE_BASE.email).toMatch(/@example\.com$/);
    expect(DEMO_PROFILE_BASE.mobile).toMatch(/^98\d{8}$/);
    expect(DEMO_PROFILE_BASE.city).toBe('Ludhiana');
    expect(DEMO_PROFILE_BASE.referralCode).toMatch(/^SKXT/);
    expect(Array.isArray(DEMO_PROFILE_BASE.favouriteCategories)).toBe(true);
    for (const c of DEMO_PROFILE_BASE.favouriteCategories) {
      expect(CATEGORIES.map((x) => x.label)).toContain(c);
    }
  });

  it('referral stats total matches the single 20-pt referral ledger entry', () => {
    const referralLedgerPts = DEMO_LEDGER.filter((e) => {
      const tx = DEMO_TRANSACTIONS.find((t) => t.id === e.transactionId);
      return /referral/i.test(tx.remarks);
    }).reduce((s, e) => s + e.pointsChange, 0);
    expect(referralLedgerPts).toBe(DEMO_REFERRAL_STATS.totalPointsEarned);
    expect(DEMO_REFERRAL_STATS.monthlyCapRemaining).toBeGreaterThanOrEqual(0);
  });

  it('chatbot reply matches the flat backend shape (routes/chatbot.js:21-27)', () => {
    expect(DEMO_CHATBOT_REPLY).toHaveProperty('answer');
    expect(DEMO_CHATBOT_REPLY).toHaveProperty('response');
    expect(DEMO_CHATBOT_REPLY.matched).toBe(true);
    expect(DEMO_CHATBOT_REPLY.response).toBe(DEMO_CHATBOT_REPLY.answer);
    expect(DEMO_CHATBOT_REPLY).not.toHaveProperty('success');
    expect(DEMO_CHATBOT_REPLY).not.toHaveProperty('data');
  });
});

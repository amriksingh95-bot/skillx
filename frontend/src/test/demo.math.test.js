import { describe, it, expect } from 'vitest';
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
} from '../demo/math.js';

const NOW = new Date('2026-10-15T12:00:00.000Z');
const iso = (d) => d.toISOString();

describe('DEMO_REWARD_SETTINGS', () => {
  it('matches the approved product decisions', () => {
    expect(DEMO_REWARD_SETTINGS).toEqual({
      pointsPerRupee: 0.1,
      rupeesPerPoint: 0.1,
      minRedeemPoints: 100,
      pointsExpiryDays: 365,
      redemptionFeePercent: 5
    });
  });
});

describe('calcEarnPoints', () => {
  it('mirrors pointsService.js:131 — Math.floor(amount * 0.1)', () => {
    expect(calcEarnPoints('1000')).toBe(100);
    expect(calcEarnPoints('999.99')).toBe(99);
    expect(calcEarnPoints('49')).toBe(4);
    expect(calcEarnPoints('50')).toBe(5);
    expect(calcEarnPoints('10')).toBe(1);
    expect(calcEarnPoints('9')).toBe(0);
  });
});

describe('calcExpiryDate', () => {
  it('adds 365 calendar days (pointsService.js:81-86)', () => {
    expect(iso(calcExpiryDate(NOW))).toBe('2027-10-15T12:00:00.000Z');
  });

  it('handles month boundaries via setDate', () => {
    const jan31 = new Date('2026-01-31T00:00:00.000Z');
    const out = calcExpiryDate(jan31);
    expect(out.toISOString()).toBe('2027-01-31T00:00:00.000Z');
  });
});

describe('calcBalance (pointsService.js:27-42)', () => {
  it('sums only non-expired entries', () => {
    const ledger = [
      { pointsChange: 100, expiresAt: iso(new Date('2027-01-01T00:00:00Z')) }, // future
      { pointsChange: 50, expiresAt: iso(new Date('2026-01-01T00:00:00Z')) }, // expired
      { pointsChange: -30, expiresAt: null }, // redeem, never expires
      { pointsChange: 20, expiresAt: iso(NOW) } // expires exactly now -> expired (lte)
    ];
    expect(calcBalance(ledger, NOW)).toBe(70);
  });

  it('equals zero when everything expired', () => {
    const ledger = [{ pointsChange: 100, expiresAt: iso(new Date('2026-01-01T00:00:00Z')) }];
    expect(calcBalance(ledger, NOW)).toBe(0);
  });
});

describe('calcRedemptionFee (subscriptionService.js:312-328)', () => {
  it('gross = pts * 0.1, fee = 5%, net = gross - fee, all rounded to 2dp', () => {
    expect(calcRedemptionFee(100)).toEqual({
      grossDiscount: 10,
      feePercent: 5,
      platformFee: 0.5,
      netAmount: 9.5
    });
    expect(calcRedemptionFee(200)).toEqual({
      grossDiscount: 20,
      feePercent: 5,
      platformFee: 1,
      netAmount: 19
    });
    expect(calcRedemptionFee(150)).toEqual({
      grossDiscount: 15,
      feePercent: 5,
      platformFee: 0.75,
      netAmount: 14.25
    });
  });
});

describe('validateRedemption', () => {
  const base = { billAmount: 250, balance: 1485, settings: DEMO_REWARD_SETTINGS };

  it('accepts a valid redemption (>= 100 pts, within bill, within balance)', () => {
    expect(validateRedemption({ ...base, pointsToRedeem: 100 }).ok).toBe(true);
  });

  it('rejects below the 100-point minimum (pointsService.js:265-269)', () => {
    const r = validateRedemption({ ...base, pointsToRedeem: 99 });
    expect(r.ok).toBe(false);
    expect(r.message).toContain('100');
  });

  it('rejects non-integer / non-positive points', () => {
    expect(validateRedemption({ ...base, pointsToRedeem: 100.5 }).ok).toBe(false);
    expect(validateRedemption({ ...base, pointsToRedeem: 0 }).ok).toBe(false);
    expect(validateRedemption({ ...base, pointsToRedeem: 'abc' }).ok).toBe(false);
  });

  it('requires a purchase amount > 0 (pointsService.js:271-275)', () => {
    expect(validateRedemption({ ...base, pointsToRedeem: 100, billAmount: 0 }).ok).toBe(false);
    expect(validateRedemption({ ...base, pointsToRedeem: 100, billAmount: -5 }).ok).toBe(false);
  });

  it('DEMO-ONLY: rejects gross discount exceeding the bill', () => {
    const r = validateRedemption({ ...base, pointsToRedeem: 100, billAmount: 5 }); // gross 10 > bill 5
    expect(r.ok).toBe(false);
    expect(r.message).toContain('cannot exceed');
  });

  it('rejects points above the balance', () => {
    const r = validateRedemption({ ...base, pointsToRedeem: 1500 });
    expect(r.ok).toBe(false);
    expect(r.message).toContain('Insufficient');
  });
});

describe('calcLifetime (pointsService.js:606-616)', () => {
  it('earned = Σ positive, redeemed = |Σ negative|', () => {
    expect(
      calcLifetime([{ pointsChange: 100 }, { pointsChange: -40 }, { pointsChange: 60 }, { pointsChange: -10 }])
    ).toEqual({ lifetimeEarned: 160, lifetimeRedeemed: 50 });
  });
});

describe('calcExpiringPoints (pointsService.js:553-589)', () => {
  it('includes entries in (now, now+30d] sorted by expiresAt, positive & non-null only', () => {
    const ledger = [
      { pointsChange: 30, expiresAt: iso(new Date('2026-11-14T12:00:00Z')) }, // 30d exactly -> included
      { pointsChange: 40, expiresAt: iso(new Date('2026-10-20T12:00:00Z')) }, // 5d
      { pointsChange: 90, expiresAt: iso(new Date('2026-10-25T12:00:00Z')) }, // 10d
      { pointsChange: 70, expiresAt: iso(new Date('2026-12-01T12:00:00Z')) }, // beyond window
      { pointsChange: 80, expiresAt: iso(NOW) }, // expired at boundary -> excluded
      { pointsChange: -20, expiresAt: null }, // redeem -> excluded
      { pointsChange: 55, expiresAt: null } // non-expiring positive -> excluded
    ];
    const out = calcExpiringPoints(ledger, NOW, 30);
    expect(out.totalExpiring).toBe(30 + 40 + 90);
    expect(out.entries.map((e) => e.points)).toEqual([40, 90, 30]);
    expect(out.entries[0].daysUntilExpiry).toBe(5);
    expect(out.entries[2].daysUntilExpiry).toBe(30);
  });
});

describe('calcTotalSpend (customerController.js:946-957)', () => {
  it('sums purchaseAmount of completed earns only', () => {
    const txs = [
      { type: 'earn', status: 'completed', purchaseAmount: '900' },
      { type: 'earn', status: 'completed', purchaseAmount: null },
      { type: 'earn', status: 'failed', purchaseAmount: '500' },
      { type: 'redeem', status: 'completed', purchaseAmount: '250' },
      { type: 'earn', status: 'completed', purchaseAmount: '100' }
    ];
    expect(calcTotalSpend(txs)).toBe(1000);
  });
});

describe('calcMilestoneProgress (customerController.js:964-978)', () => {
  const milestones = [
    { id: 'm1', spendTarget: 1000, bonusPoints: 100 },
    { id: 'm3', spendTarget: 10000, bonusPoints: 1500 }
  ];

  it('computes percent, remaining, unlocked; caps percent at 100', () => {
    const [m1, m3] = calcMilestoneProgress(9950, milestones);
    expect(m1.isUnlocked).toBe(true);
    expect(m1.amountRemaining).toBe(0);
    expect(m1.progressPercent).toBe(100);
    expect(m3.isUnlocked).toBe(false);
    expect(m3.amountRemaining).toBe(50);
    expect(m3.progressPercent).toBeCloseTo(99.5, 10);
  });

  it('sorts by spendTarget ascending', () => {
    const out = calcMilestoneProgress(0, [...milestones].reverse());
    expect(out.map((m) => m.id)).toEqual(['m1', 'm3']);
  });
});

describe('milestonesCrossed (pointsService.js:186-197)', () => {
  const milestones = [
    { id: 'm1', spendTarget: 1000, bonusPoints: 100 },
    { id: 'm3', spendTarget: 10000, bonusPoints: 1500 }
  ];

  it('crosses only when prev < target <= new', () => {
    expect(milestonesCrossed(9950, 10000, milestones).map((m) => m.id)).toEqual(['m3']);
    expect(milestonesCrossed(9950, 9999, milestones)).toEqual([]);
    expect(milestonesCrossed(10000, 11000, milestones)).toEqual([]);
    expect(milestonesCrossed(999, 1500, milestones).map((m) => m.id)).toEqual(['m1']);
  });
});

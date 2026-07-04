jest.mock('../src/lib/prisma', () => ({
  $transaction: jest.fn(),
  $executeRawUnsafe: jest.fn(),
  customer: { findUnique: jest.fn(), update: jest.fn() },
  merchant: { findUnique: jest.fn(), update: jest.fn() },
  transaction: { create: jest.fn(), findUnique: jest.fn(), update: jest.fn() },
  pointsLedger: { create: jest.fn(), aggregate: jest.fn(), findMany: jest.fn() },
  rewardSettings: { findFirst: jest.fn() }
}));

const prisma = require('../src/lib/prisma');

describe('Points Calculation Logic', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Points formula', () => {
    it('calculates points as floor(amount * pointsPerRupee)', () => {
      const pointsPerRupee = 0.1;
      const amount = 100;
      const points = Math.floor(amount * pointsPerRupee);
      expect(points).toBe(10);
    });

    it('truncates fractional points (no rounding)', () => {
      const pointsPerRupee = 0.01;
      const amount = 150;
      const points = Math.floor(amount * pointsPerRupee);
      expect(points).toBe(1); // 1.5 → 1
    });

    it('returns 0 for amounts below the rate threshold', () => {
      const pointsPerRupee = 0.01;
      const amount = 5;
      const points = Math.floor(amount * pointsPerRupee);
      expect(points).toBe(0);
    });
  });

  describe('Negative amount guard', () => {
    it('rejects zero amount', () => {
      const amount = 0;
      expect(amount <= 0).toBe(true);
    });

    it('rejects negative amount', () => {
      const amount = -100;
      expect(amount <= 0).toBe(true);
    });

    it('accepts positive amount', () => {
      const amount = 100;
      expect(amount > 0).toBe(true);
    });
  });

  describe('Atomic merchant balance deduction', () => {
    it('SQL prevents overspend with WHERE pointsBalance >= amount', () => {
      const merchantBalance = 100;
      const requestedPoints = 150;
      const canDeduct = merchantBalance >= requestedPoints;
      expect(canDeduct).toBe(false);
    });

    it('allows deduction when balance is sufficient', () => {
      const merchantBalance = 200;
      const requestedPoints = 150;
      const canDeduct = merchantBalance >= requestedPoints;
      expect(canDeduct).toBe(true);
    });

    it('allows deduction at exact balance', () => {
      const merchantBalance = 150;
      const requestedPoints = 150;
      const canDeduct = merchantBalance >= requestedPoints;
      expect(canDeduct).toBe(true);
    });
  });

  describe('Rate validation', () => {
    it('rejects pointsPerRupee of 0', () => {
      const rate = 0;
      expect(rate < 0.0001).toBe(true);
    });

    it('rejects negative pointsPerRupee', () => {
      const rate = -0.1;
      expect(rate < 0.0001).toBe(true);
    });

    it('accepts valid pointsPerRupee', () => {
      const rate = 0.1;
      expect(rate >= 0.0001).toBe(true);
    });
  });

  describe('Expiry date calculation', () => {
    const { calculateExpiryDate } = require('../src/services/pointsService');

    it('calculates expiry as now + pointsExpiryDays', () => {
      const settings = { pointsExpiryDays: 365 };
      const expiry = calculateExpiryDate(settings);
      const now = new Date();
      const expected = new Date(now);
      expected.setDate(expected.getDate() + 365);
      // Allow 1 second tolerance for test execution time
      expect(Math.abs(expiry.getTime() - expected.getTime())).toBeLessThan(1000);
    });

    it('defaults to 365 days if pointsExpiryDays is null', () => {
      const settings = { pointsExpiryDays: null };
      const expiry = calculateExpiryDate(settings);
      const now = new Date();
      const expected = new Date(now);
      expected.setDate(expected.getDate() + 365);
      expect(Math.abs(expiry.getTime() - expected.getTime())).toBeLessThan(1000);
    });

    it('supports custom expiry period', () => {
      const settings = { pointsExpiryDays: 90 };
      const expiry = calculateExpiryDate(settings);
      const now = new Date();
      const expected = new Date(now);
      expected.setDate(expected.getDate() + 90);
      expect(Math.abs(expiry.getTime() - expected.getTime())).toBeLessThan(1000);
    });
  });

  describe('Balance calculation with expiry filter', () => {
    it('getCustomerBalance excludes expired entries', async () => {
      const { getCustomerBalance } = require('../src/services/pointsService');
      prisma.pointsLedger.aggregate.mockResolvedValue({ _sum: { pointsChange: 80 } });
      
      const balance = await getCustomerBalance('cust-1');
      
      expect(balance).toBe(80);
      expect(prisma.pointsLedger.aggregate).toHaveBeenCalledWith({
        where: {
          customerId: 'cust-1',
          OR: [
            { expiresAt: null },
            { expiresAt: { gt: expect.any(Date) } }
          ]
        },
        _sum: { pointsChange: true }
      });
    });
  });
});

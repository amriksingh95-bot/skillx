jest.mock('../src/lib/prisma', () => ({
  $transaction: jest.fn(),
  $executeRawUnsafe: jest.fn(),
  merchantSubscription: { findFirst: jest.fn(), update: jest.fn() },
  customer: { findUnique: jest.fn() },
  merchant: { findUnique: jest.fn(), update: jest.fn() },
  transaction: { create: jest.fn(), findMany: jest.fn(), findFirst: jest.fn(), update: jest.fn() },
  pointsLedger: { create: jest.fn(), aggregate: jest.fn(), findMany: jest.fn(), findFirst: jest.fn() },
  rewardSettings: { findFirst: jest.fn() },
  milestoneBonus: { findMany: jest.fn() }
}));

const prisma = require('../src/lib/prisma');
const { processRedeem, computeMaxRedeemablePoints } = require('../src/services/pointsService');

const merchantId = 'merch-1';
const customerId = 'cust-1';

function setupTxMocks() {
  prisma.$transaction.mockImplementation(async (fn) => fn(prisma));
  prisma.$executeRawUnsafe.mockResolvedValue(undefined);
  prisma.customer.findUnique.mockResolvedValue({ id: customerId, isActive: true, referredBy: null });
  prisma.merchant.findUnique.mockResolvedValue({ id: merchantId, isActive: true, businessName: 'Test Shop', pointsBalance: 1000 });
  prisma.merchant.update.mockResolvedValue({});
  prisma.rewardSettings.findFirst.mockResolvedValue({
    pointsPerRupee: 0.1,
    pointsExpiryDays: 365,
    minRedeemPoints: 100,
    rupeesPerPoint: 0.1,
    redemptionFeePercent: 5
  });
  prisma.merchantSubscription.findFirst.mockResolvedValue({
    id: 'sub-1',
    merchantId,
    status: 'active',
    endDate: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000),
    gracePeriodEnd: null
  });
  prisma.transaction.create.mockResolvedValue({ id: 'tx-1', points: 100, status: 'completed' });
  prisma.pointsLedger.create.mockResolvedValue({});
  prisma.pointsLedger.aggregate.mockResolvedValue({ _sum: { pointsChange: 500 } });
  prisma.milestoneBonus.findMany.mockResolvedValue([]);
}

beforeEach(() => {
  jest.clearAllMocks();
  setupTxMocks();
});

describe('computeMaxRedeemablePoints', () => {
  it('caps discount at the full bill (floor(bill / rate))', () => {
    // ₹11 bill at 0.10/point -> max 110 points (₹11 discount).
    expect(computeMaxRedeemablePoints(11, 0.1)).toBe(110);
  });

  it('returns null (no cap) when invoice is missing/invalid', () => {
    expect(computeMaxRedeemablePoints(null, 0.1)).toBeNull();
    expect(computeMaxRedeemablePoints(0, 0.1)).toBeNull();
    expect(computeMaxRedeemablePoints('abc', 0.1)).toBeNull();
  });
});

describe('processRedeem — invoice cap', () => {
  it('rejects a ₹11 bill with 225 points (discount would exceed the bill)', async () => {
    await expect(processRedeem(customerId, merchantId, 225, 11)).rejects.toMatchObject({
      code: 'REDEMPTION_EXCEEDS_INVOICE',
      status: 400
    });
    expect(prisma.transaction.create).not.toHaveBeenCalled();
    expect(prisma.pointsLedger.create).not.toHaveBeenCalled();
  });

  it('allows a ₹500 bill to redeem fully (225 points = ₹22.50 discount)', async () => {
    const result = await processRedeem(customerId, merchantId, 225, 500);
    expect(result.transaction).toBeDefined();
    expect(prisma.transaction.create).toHaveBeenCalled();
  });

  it('allows exactly the capped maximum on the bill', async () => {
    // ₹11 bill -> max 110 points.
    const result = await processRedeem(customerId, merchantId, 110, 11);
    expect(result.transaction).toBeDefined();
  });
});

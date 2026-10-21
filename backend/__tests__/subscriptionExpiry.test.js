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
const { checkMerchantSubscriptionStatus } = require('../src/services/subscriptionService');
const { processEarn, processRedeem, processTransfer } = require('../src/services/pointsService');

const DAY = 24 * 60 * 60 * 1000;
const merchantId = 'merch-1';
const customerId = 'cust-1';

function activeRecord(daysRemaining = 10) {
  return {
    id: 'sub-active',
    merchantId,
    status: 'active',
    endDate: new Date(Date.now() + daysRemaining * DAY),
    gracePeriodEnd: null,
    plan: { displayName: 'Monthly', price: 999, durationDays: 30 }
  };
}

function graceFlipRecord() {
  // endDate 20 days ago, grace ended 5 days ago → next check transitions to expired
  return {
    id: 'sub-flip',
    merchantId,
    status: 'grace_period',
    endDate: new Date(Date.now() - 20 * DAY),
    gracePeriodEnd: new Date(Date.now() - 5 * DAY),
    plan: { displayName: 'Monthly', price: 999, durationDays: 30 }
  };
}

function steadyExpiredRecord(daysExpired = 20) {
  return {
    id: 'sub-expired',
    merchantId,
    status: 'expired',
    endDate: new Date(Date.now() - daysExpired * DAY),
    gracePeriodEnd: new Date(Date.now() - (daysExpired - 15) * DAY),
    plan: { displayName: 'Monthly', price: 999, durationDays: 30 }
  };
}

// Primary lookup: status IN ['active','grace_period'] (getMerchantSubscription)
// Secondary lookup: status === 'expired' (post-implementation behavior)
function mockSubscriptions({ primary = null, expired = null } = {}) {
  let primaryCalls = 0;
  prisma.merchantSubscription.findFirst.mockImplementation(async ({ where }) => {
    if (where && where.status && where.status.in) {
      primaryCalls += 1;
      if (typeof primary === 'function') return primary(primaryCalls);
      return primary;
    }
    if (where && where.status === 'expired') return expired;
    return null;
  });
  prisma.merchantSubscription.update.mockImplementation(async ({ data }) => ({
    ...(primary && typeof primary !== 'function' ? primary : graceFlipRecord()),
    ...data
  }));
  return () => primaryCalls;
}

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
  prisma.transaction.create.mockResolvedValue({ id: 'tx-1', points: 10, status: 'completed' });
  prisma.transaction.findMany.mockResolvedValue([]);
  prisma.pointsLedger.aggregate.mockResolvedValue({ _sum: { pointsChange: 500 } });
  prisma.pointsLedger.create.mockResolvedValue({});
  prisma.milestoneBonus.findMany.mockResolvedValue([]);
}

beforeEach(() => {
  jest.clearAllMocks();
});

describe('checkMerchantSubscriptionStatus — expired handling', () => {
  test('active subscription is unchanged: allowed, not expired', async () => {
    mockSubscriptions({ primary: activeRecord(10) });

    const status = await checkMerchantSubscriptionStatus(merchantId);

    expect(status.isActive).toBe(true);
    expect(status.status).toBe('active');
    expect(status.subscriptionExpired).toBe(false);
  });

  test('grace period is unchanged: allowed, not flagged expired', async () => {
    const grace = { ...graceFlipRecord(), gracePeriodEnd: new Date(Date.now() + 5 * DAY) };
    mockSubscriptions({ primary: grace });

    const status = await checkMerchantSubscriptionStatus(merchantId);

    expect(status.isActive).toBe(true);
    expect(status.status).toBe('grace_period');
    expect(status.subscriptionExpired).toBe(false);
  });

  test('first call after grace ends (status flips to expired) is allowed and flagged', async () => {
    mockSubscriptions({ primary: graceFlipRecord() });

    const status = await checkMerchantSubscriptionStatus(merchantId);

    expect(status.isActive).toBe(true);
    expect(status.status).toBe('expired');
    expect(status.subscriptionExpired).toBe(true);
    expect(status.daysExpired).toBeGreaterThanOrEqual(16);
    expect(prisma.merchantSubscription.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: { status: 'expired' } })
    );
  });

  test('steady-state expired (record out of active/grace scope) is allowed and flagged', async () => {
    mockSubscriptions({ primary: null, expired: steadyExpiredRecord(20) });

    const status = await checkMerchantSubscriptionStatus(merchantId);

    expect(status.isActive).toBe(true);
    expect(status.status).toBe('expired');
    expect(status.subscriptionExpired).toBe(true);
    expect(status.daysExpired).toBeGreaterThanOrEqual(20);
  });

  test('renewed merchant (old expired + new active) is not flagged — secondary lookup never runs', async () => {
    const getPrimaryCalls = mockSubscriptions({ primary: activeRecord(10), expired: steadyExpiredRecord(45) });

    const status = await checkMerchantSubscriptionStatus(merchantId);

    expect(status.isActive).toBe(true);
    expect(status.status).toBe('active');
    expect(status.subscriptionExpired).toBe(false);
    expect(getPrimaryCalls()).toBe(1);
    expect(prisma.merchantSubscription.findFirst).toHaveBeenCalledTimes(1);
  });

  test('merchant with no subscription at all is not flagged', async () => {
    mockSubscriptions({ primary: null, expired: null });

    const status = await checkMerchantSubscriptionStatus(merchantId);

    expect(status.isActive).toBe(true);
    expect(status.status).toBe('none');
    expect(status.subscriptionExpired).toBe(false);
  });
});

describe('pointsService — expired merchants never get 403', () => {
  test('processEarn succeeds on the first call after the status flips to expired', async () => {
    setupTxMocks();
    mockSubscriptions({ primary: graceFlipRecord() });

    const result = await processEarn(customerId, merchantId, 100);

    expect(result.transaction).toBeDefined();
    expect(result.subscriptionExpired).toBe(true);
  });

  test('processEarn keeps succeeding on subsequent calls (steady-state expired)', async () => {
    setupTxMocks();
    let primaryCalls = 0;
    mockSubscriptions({
      primary: (calls) => {
        primaryCalls = calls;
        return calls === 1 ? graceFlipRecord() : null;
      },
      expired: steadyExpiredRecord(20)
    });

    await processEarn(customerId, merchantId, 100);
    const second = await processEarn(customerId, merchantId, 100);

    expect(primaryCalls).toBeGreaterThanOrEqual(2);
    expect(second.transaction).toBeDefined();
    expect(second.subscriptionExpired).toBe(true);
  });

  test('processEarn for active merchant is unchanged: no expired flag', async () => {
    setupTxMocks();
    mockSubscriptions({ primary: activeRecord(10) });

    const result = await processEarn(customerId, merchantId, 100);

    expect(result.transaction).toBeDefined();
    expect(result.subscriptionExpired).toBe(false);
  });

  test('processRedeem succeeds on the first call after the status flips to expired', async () => {
    setupTxMocks();
    mockSubscriptions({ primary: graceFlipRecord() });

    const result = await processRedeem(customerId, merchantId, 100, 1000);

    expect(result.transaction).toBeDefined();
    expect(result.transaction.feeInfo).toBeDefined();
    expect(result.subscriptionExpired).toBe(true);
  });

  test('processRedeem for active merchant is unchanged: no expired flag', async () => {
    setupTxMocks();
    mockSubscriptions({ primary: activeRecord(10) });

    const result = await processRedeem(customerId, merchantId, 100, 1000);

    expect(result.subscriptionExpired).toBe(false);
  });

  test('processTransfer succeeds on the first call after the status flips to expired', async () => {
    setupTxMocks();
    // transfer UPDATE returns rows-affected count; lock call returns undefined
    prisma.$executeRawUnsafe
      .mockResolvedValueOnce(undefined)
      .mockResolvedValueOnce(1);
    mockSubscriptions({ primary: graceFlipRecord() });

    const result = await processTransfer(customerId, merchantId, 50);

    expect(result.transaction).toBeDefined();
  });

  test('processTransfer keeps succeeding in steady-state expired', async () => {
    setupTxMocks();
    prisma.$executeRawUnsafe
      .mockResolvedValueOnce(undefined)
      .mockResolvedValueOnce(1);
    mockSubscriptions({ primary: null, expired: steadyExpiredRecord(20) });

    const result = await processTransfer(customerId, merchantId, 50);

    expect(result.transaction).toBeDefined();
  });
});

const prisma = require('../lib/prisma');

const INACTIVITY_THRESHOLDS = {
  active: 30,
  atRisk: 60,
  inactive: 90
};

function daysSince(date) {
  if (!date) return null;
  const diff = Date.now() - new Date(date).getTime();
  return Math.floor(diff / (1000 * 60 * 60 * 24));
}

function classifyStatus(days) {
  if (days === null) return 'dormant';
  if (days <= INACTIVITY_THRESHOLDS.active) return 'active';
  if (days <= INACTIVITY_THRESHOLDS.atRisk) return 'at_risk';
  if (days <= INACTIVITY_THRESHOLDS.inactive) return 'inactive';
  return 'dormant';
}

/**
 * Get inactivity data for a single merchant.
 * Derives all timestamps from existing tables without schema changes.
 */
async function getMerchantInactivityData(merchantId) {
  const merchant = await prisma.merchant.findUnique({
    where: { id: merchantId },
    include: { user: { select: { id: true } } }
  });

  if (!merchant) return null;

  const userId = merchant.user?.id;

  const [lastLogin, lastTransaction, lastRedemption, lastEarn, lastTransfer, subscription, customerCount] = await Promise.all([
    userId ? prisma.auditLog.findFirst({
      where: { userId, action: 'LOGIN_SUCCESS' },
      orderBy: { createdAt: 'desc' },
      select: { createdAt: true }
    }) : null,
    prisma.transaction.findFirst({
      where: { merchantId, status: 'completed' },
      orderBy: { createdAt: 'desc' },
      select: { createdAt: true }
    }),
    prisma.transaction.findFirst({
      where: { merchantId, type: 'redeem', status: 'completed' },
      orderBy: { createdAt: 'desc' },
      select: { createdAt: true }
    }),
    prisma.transaction.findFirst({
      where: { merchantId, type: 'earn', status: 'completed' },
      orderBy: { createdAt: 'desc' },
      select: { createdAt: true }
    }),
    prisma.auditLog.findFirst({
      where: { merchantId, action: 'POINTS_TRANSFERRED' },
      orderBy: { createdAt: 'desc' },
      select: { createdAt: true }
    }),
    prisma.merchantSubscription.findFirst({
      where: { merchantId, status: { in: ['active', 'grace_period'] } },
      orderBy: { createdAt: 'desc' },
      select: { status: true, endDate: true, gracePeriodEnd: true, plan: { select: { displayName: true } } }
    }),
    prisma.customer.count({
      where: { signedUpViaMerchantId: merchantId, isActive: true }
    })
  ]);

  const lastLoginDate = lastLogin?.createdAt || null;
  const lastTxDate = lastTransaction?.createdAt || null;
  const lastRedemptionDate = lastRedemption?.createdAt || null;
  const lastEarnDate = lastEarn?.createdAt || null;
  const lastTransferDate = lastTransfer?.createdAt || null;

  const allDates = [lastLoginDate, lastTxDate, lastRedemptionDate, lastEarnDate, lastTransferDate].filter(Boolean);
  const lastActivityDate = allDates.length > 0 ? new Date(Math.max(...allDates.map(d => new Date(d).getTime()))) : null;

  const daysSinceLogin = daysSince(lastLoginDate);
  const daysSinceTransaction = daysSince(lastTxDate);
  const daysSinceRedemption = daysSince(lastRedemptionDate);
  const daysSinceActivity = daysSince(lastActivityDate);

  return {
    merchantId: merchant.id,
    businessName: merchant.businessName,
    category: merchant.category,
    isActive: merchant.isActive,
    status: merchant.status,
    createdAt: merchant.createdAt,
    accountAge: daysSince(merchant.createdAt),
    lastLoginAt: lastLoginDate,
    lastTransactionAt: lastTxDate,
    lastRedemptionAt: lastRedemptionDate,
    lastEarnAt: lastEarnDate,
    lastTransferAt: lastTransferDate,
    lastActivityAt: lastActivityDate,
    daysSinceLogin,
    daysSinceTransaction,
    daysSinceRedemption,
    daysSinceActivity,
    inactivityStatus: classifyStatus(daysSinceActivity),
    pointsBalance: merchant.pointsBalance,
    customerCount,
    subscription: subscription ? {
      status: subscription.status,
      planName: subscription.plan?.displayName,
      endDate: subscription.endDate,
      gracePeriodEnd: subscription.gracePeriodEnd
    } : null
  };
}

/**
 * Get inactivity data for a single customer.
 */
async function getCustomerInactivityData(customerId) {
  const customer = await prisma.customer.findUnique({
    where: { id: customerId },
    include: { user: { select: { id: true } } }
  });

  if (!customer) return null;

  const userId = customer.user?.id;

  const [lastLogin, lastTransaction, lastRedemption, lastEarn, ledgerStats] = await Promise.all([
    userId ? prisma.auditLog.findFirst({
      where: { userId, action: 'LOGIN_SUCCESS' },
      orderBy: { createdAt: 'desc' },
      select: { createdAt: true }
    }) : null,
    prisma.transaction.findFirst({
      where: { customerId, status: 'completed' },
      orderBy: { createdAt: 'desc' },
      select: { createdAt: true }
    }),
    prisma.transaction.findFirst({
      where: { customerId, type: 'redeem', status: 'completed' },
      orderBy: { createdAt: 'desc' },
      select: { createdAt: true }
    }),
    prisma.transaction.findFirst({
      where: { customerId, type: 'earn', status: 'completed' },
      orderBy: { createdAt: 'desc' },
      select: { createdAt: true }
    }),
    prisma.pointsLedger.aggregate({
      where: { customerId },
      _sum: { pointsChange: true },
      _count: { id: true }
    })
  ]);

  const totalEarned = await prisma.pointsLedger.aggregate({
    where: { customerId, pointsChange: { gt: 0 } },
    _sum: { pointsChange: true }
  });
  const totalRedeemed = await prisma.pointsLedger.aggregate({
    where: { customerId, pointsChange: { lt: 0 } },
    _sum: { pointsChange: true }
  });

  const earned = totalEarned._sum.pointsChange || 0;
  const redeemed = Math.abs(totalRedeemed._sum.pointsChange || 0);
  const currentBalance = ledgerStats._sum.pointsChange || 0;

  const lastLoginDate = lastLogin?.createdAt || null;
  const lastTxDate = lastTransaction?.createdAt || null;
  const lastRedemptionDate = lastRedemption?.createdAt || null;
  const lastEarnDate = lastEarn?.createdAt || null;

  const allDates = [lastLoginDate, lastTxDate, lastRedemptionDate, lastEarnDate].filter(Boolean);
  const lastActivityDate = allDates.length > 0 ? new Date(Math.max(...allDates.map(d => new Date(d).getTime()))) : null;

  const daysSinceLogin = daysSince(lastLoginDate);
  const daysSinceTransaction = daysSince(lastTxDate);
  const daysSinceRedemption = daysSince(lastRedemptionDate);
  const daysSinceActivity = daysSince(lastActivityDate);

  // Churn signals
  const pointsNeverRedeemed = earned > 0 && redeemed === 0;
  const highBalanceNoRedemption = currentBalance > 100 && !lastRedemptionDate;

  // Profile completeness
  const profileFields = [
    customer.dateOfBirth, customer.gender, customer.city, customer.pinCode,
    customer.area, customer.occupation, customer.maritalStatus,
    customer.preferredLanguage, customer.communicationPref,
    customer.favouriteCategories, customer.dietaryPreference
  ];
  const filledFields = profileFields.filter(f => f !== null && f !== undefined && f !== '').length;
  const profileCompleteness = Math.round((filledFields / profileFields.length) * 100);

  return {
    customerId: customer.id,
    name: customer.name,
    email: customer.email,
    city: customer.city,
    isActive: customer.isActive,
    createdAt: customer.createdAt,
    accountAge: daysSince(customer.createdAt),
    lastLoginAt: lastLoginDate,
    lastTransactionAt: lastTxDate,
    lastRedemptionAt: lastRedemptionDate,
    lastEarnAt: lastEarnDate,
    lastActivityAt: lastActivityDate,
    daysSinceLogin,
    daysSinceTransaction,
    daysSinceRedemption,
    daysSinceActivity,
    inactivityStatus: classifyStatus(daysSinceActivity),
    signedUpViaMerchantId: customer.signedUpViaMerchantId,
    churnSignals: {
      pointsNeverRedeemed,
      highBalanceNoRedemption,
      profileIncomplete: profileCompleteness < 50,
      profileCompleteness,
      currentBalance,
      totalEarned: earned,
      totalRedeemed: redeemed
    }
  };
}

/**
 * Get inactivity report for all active merchants.
 * Returns grouped summary + full merchant list.
 * Uses batched GROUP BY queries instead of per-entity lookups (N+1 fix).
 */
async function getMerchantInactivityReport() {
  const merchants = await prisma.merchant.findMany({
    where: { isActive: true, status: 'active' },
    select: {
      id: true,
      businessName: true,
      category: true,
      isActive: true,
      status: true,
      createdAt: true,
      pointsBalance: true,
      userId: true
    }
  });

  const report = {
    summary: { active: 0, at_risk: 0, inactive: 0, dormant: 0, total: merchants.length },
    merchants: []
  };

  if (merchants.length === 0) return report;

  const merchantIds = merchants.map(m => m.id);
  const userIds = merchants.map(m => m.userId);

  const [loginRows, txRows, redeemRows, earnRows, transferRows, subscriptions, customerCountRows] = await Promise.all([
    prisma.auditLog.groupBy({
      by: ['userId'],
      where: { userId: { in: userIds }, action: 'LOGIN_SUCCESS' },
      _max: { createdAt: true }
    }),
    prisma.transaction.groupBy({
      by: ['merchantId'],
      where: { merchantId: { in: merchantIds }, status: 'completed' },
      _max: { createdAt: true }
    }),
    prisma.transaction.groupBy({
      by: ['merchantId'],
      where: { merchantId: { in: merchantIds }, type: 'redeem', status: 'completed' },
      _max: { createdAt: true }
    }),
    prisma.transaction.groupBy({
      by: ['merchantId'],
      where: { merchantId: { in: merchantIds }, type: 'earn', status: 'completed' },
      _max: { createdAt: true }
    }),
    prisma.auditLog.groupBy({
      by: ['merchantId'],
      where: { merchantId: { in: merchantIds }, action: 'POINTS_TRANSFERRED' },
      _max: { createdAt: true }
    }),
    prisma.merchantSubscription.findMany({
      where: { merchantId: { in: merchantIds }, status: { in: ['active', 'grace_period'] } },
      orderBy: { createdAt: 'desc' },
      select: { merchantId: true, status: true, endDate: true, gracePeriodEnd: true, plan: { select: { displayName: true } } }
    }),
    prisma.customer.groupBy({
      by: ['signedUpViaMerchantId'],
      where: { signedUpViaMerchantId: { in: merchantIds }, isActive: true },
      _count: { id: true }
    })
  ]);

  const loginMap = new Map(loginRows.map(r => [r.userId, r._max.createdAt]));
  const txMap = new Map(txRows.map(r => [r.merchantId, r._max.createdAt]));
  const redeemMap = new Map(redeemRows.map(r => [r.merchantId, r._max.createdAt]));
  const earnMap = new Map(earnRows.map(r => [r.merchantId, r._max.createdAt]));
  const transferMap = new Map(transferRows.map(r => [r.merchantId, r._max.createdAt]));
  const customerCountMap = new Map(customerCountRows.map(r => [r.signedUpViaMerchantId, r._count.id]));

  const subscriptionMap = new Map();
  for (const s of subscriptions) {
    if (!subscriptionMap.has(s.merchantId)) subscriptionMap.set(s.merchantId, s);
  }

  for (const m of merchants) {
    const lastLoginDate = loginMap.get(m.userId) || null;
    const lastTxDate = txMap.get(m.id) || null;
    const lastRedemptionDate = redeemMap.get(m.id) || null;
    const lastEarnDate = earnMap.get(m.id) || null;
    const lastTransferDate = transferMap.get(m.id) || null;

    const allDates = [lastLoginDate, lastTxDate, lastRedemptionDate, lastEarnDate, lastTransferDate].filter(Boolean);
    const lastActivityDate = allDates.length > 0 ? new Date(Math.max(...allDates.map(d => new Date(d).getTime()))) : null;

    const subscription = subscriptionMap.get(m.id) || null;

    const data = {
      merchantId: m.id,
      businessName: m.businessName,
      category: m.category,
      isActive: m.isActive,
      status: m.status,
      createdAt: m.createdAt,
      accountAge: daysSince(m.createdAt),
      lastLoginAt: lastLoginDate,
      lastTransactionAt: lastTxDate,
      lastRedemptionAt: lastRedemptionDate,
      lastEarnAt: lastEarnDate,
      lastTransferAt: lastTransferDate,
      lastActivityAt: lastActivityDate,
      daysSinceLogin: daysSince(lastLoginDate),
      daysSinceTransaction: daysSince(lastTxDate),
      daysSinceRedemption: daysSince(lastRedemptionDate),
      daysSinceActivity: daysSince(lastActivityDate),
      inactivityStatus: classifyStatus(daysSince(lastActivityDate)),
      pointsBalance: m.pointsBalance,
      customerCount: customerCountMap.get(m.id) || 0,
      subscription: subscription ? {
        status: subscription.status,
        planName: subscription.plan?.displayName,
        endDate: subscription.endDate,
        gracePeriodEnd: subscription.gracePeriodEnd
      } : null
    };

    report.merchants.push(data);
    report.summary[data.inactivityStatus]++;
  }

  report.merchants.sort((a, b) => (a.daysSinceActivity ?? 9999) - (b.daysSinceActivity ?? 9999));

  return report;
}

/**
 * Get inactivity report for all active customers.
 * Uses batched GROUP BY queries instead of per-entity lookups (N+1 fix).
 */
async function getCustomerInactivityReport() {
  const customers = await prisma.customer.findMany({
    where: { isActive: true },
    select: {
      id: true,
      userId: true,
      name: true,
      email: true,
      city: true,
      isActive: true,
      createdAt: true,
      signedUpViaMerchantId: true,
      dateOfBirth: true,
      gender: true,
      pinCode: true,
      area: true,
      occupation: true,
      maritalStatus: true,
      preferredLanguage: true,
      communicationPref: true,
      favouriteCategories: true,
      dietaryPreference: true
    }
  });

  const report = {
    summary: { active: 0, at_risk: 0, inactive: 0, dormant: 0, total: customers.length },
    customers: []
  };

  if (customers.length === 0) return report;

  const customerIds = customers.map(c => c.id);
  const userIds = customers.map(c => c.userId);

  const [loginRows, txRows, redeemRows, earnRows, ledgerRows, earnedRows, redeemedRows] = await Promise.all([
    prisma.auditLog.groupBy({
      by: ['userId'],
      where: { userId: { in: userIds }, action: 'LOGIN_SUCCESS' },
      _max: { createdAt: true }
    }),
    prisma.transaction.groupBy({
      by: ['customerId'],
      where: { customerId: { in: customerIds }, status: 'completed' },
      _max: { createdAt: true }
    }),
    prisma.transaction.groupBy({
      by: ['customerId'],
      where: { customerId: { in: customerIds }, type: 'redeem', status: 'completed' },
      _max: { createdAt: true }
    }),
    prisma.transaction.groupBy({
      by: ['customerId'],
      where: { customerId: { in: customerIds }, type: 'earn', status: 'completed' },
      _max: { createdAt: true }
    }),
    prisma.pointsLedger.groupBy({
      by: ['customerId'],
      where: { customerId: { in: customerIds } },
      _sum: { pointsChange: true },
      _count: { id: true }
    }),
    prisma.pointsLedger.groupBy({
      by: ['customerId'],
      where: { customerId: { in: customerIds }, pointsChange: { gt: 0 } },
      _sum: { pointsChange: true }
    }),
    prisma.pointsLedger.groupBy({
      by: ['customerId'],
      where: { customerId: { in: customerIds }, pointsChange: { lt: 0 } },
      _sum: { pointsChange: true }
    })
  ]);

  const loginMap = new Map(loginRows.map(r => [r.userId, r._max.createdAt]));
  const txMap = new Map(txRows.map(r => [r.customerId, r._max.createdAt]));
  const redeemMap = new Map(redeemRows.map(r => [r.customerId, r._max.createdAt]));
  const earnMap = new Map(earnRows.map(r => [r.customerId, r._max.createdAt]));
  const earnedMap = new Map(earnedRows.map(r => [r.customerId, r._sum.pointsChange]));
  const redeemedMap = new Map(redeemedRows.map(r => [r.customerId, r._sum.pointsChange]));

  const currentBalanceMap = new Map();
  for (const r of ledgerRows) {
    currentBalanceMap.set(r.customerId, r._sum.pointsChange || 0);
  }

  for (const c of customers) {
    const lastLoginDate = loginMap.get(c.userId) || null;
    const lastTxDate = txMap.get(c.id) || null;
    const lastRedemptionDate = redeemMap.get(c.id) || null;
    const lastEarnDate = earnMap.get(c.id) || null;

    const allDates = [lastLoginDate, lastTxDate, lastRedemptionDate, lastEarnDate].filter(Boolean);
    const lastActivityDate = allDates.length > 0 ? new Date(Math.max(...allDates.map(d => new Date(d).getTime()))) : null;

    const earned = earnedMap.get(c.id) || 0;
    const redeemed = Math.abs(redeemedMap.get(c.id) || 0);
    const currentBalance = currentBalanceMap.get(c.id) || 0;

    // Churn signals
    const pointsNeverRedeemed = earned > 0 && redeemed === 0;
    const highBalanceNoRedemption = currentBalance > 100 && !lastRedemptionDate;

    // Profile completeness
    const profileFields = [
      c.dateOfBirth, c.gender, c.city, c.pinCode,
      c.area, c.occupation, c.maritalStatus,
      c.preferredLanguage, c.communicationPref,
      c.favouriteCategories, c.dietaryPreference
    ];
    const filledFields = profileFields.filter(f => f !== null && f !== undefined && f !== '').length;
    const profileCompleteness = Math.round((filledFields / profileFields.length) * 100);

    const data = {
      customerId: c.id,
      name: c.name,
      email: c.email,
      city: c.city,
      isActive: c.isActive,
      createdAt: c.createdAt,
      accountAge: daysSince(c.createdAt),
      lastLoginAt: lastLoginDate,
      lastTransactionAt: lastTxDate,
      lastRedemptionAt: lastRedemptionDate,
      lastEarnAt: lastEarnDate,
      lastActivityAt: lastActivityDate,
      daysSinceLogin: daysSince(lastLoginDate),
      daysSinceTransaction: daysSince(lastTxDate),
      daysSinceRedemption: daysSince(lastRedemptionDate),
      daysSinceActivity: daysSince(lastActivityDate),
      inactivityStatus: classifyStatus(daysSince(lastActivityDate)),
      signedUpViaMerchantId: c.signedUpViaMerchantId,
      churnSignals: {
        pointsNeverRedeemed,
        highBalanceNoRedemption,
        profileIncomplete: profileCompleteness < 50,
        profileCompleteness,
        currentBalance,
        totalEarned: earned,
        totalRedeemed: redeemed
      }
    };

    report.customers.push(data);
    report.summary[data.inactivityStatus]++;
  }

  report.customers.sort((a, b) => (a.daysSinceActivity ?? 9999) - (b.daysSinceActivity ?? 9999));

  return report;
}

/**
 * Get a lightweight summary for admin dashboard cards.
 * No per-entity detail — just counts.
 */
async function getInactivitySummary() {
  const [activeMerchants, activeCustomers] = await Promise.all([
    prisma.merchant.count({ where: { isActive: true, status: 'active' } }),
    prisma.customer.count({ where: { isActive: true } })
  ]);

  const cutoff30 = new Date(Date.now() - 30 * 86400000);
  const cutoff60 = new Date(Date.now() - 60 * 86400000);
  const cutoff90 = new Date(Date.now() - 90 * 86400000);

  const [merchantTxActivity, customerTxActivity] = await Promise.all([
    prisma.$queryRaw`
      SELECT
        COUNT(DISTINCT m."id") FILTER (WHERE t."lastTx" >= ${cutoff30})::int AS "active30",
        COUNT(DISTINCT m."id") FILTER (WHERE t."lastTx" >= ${cutoff60} AND t."lastTx" < ${cutoff30})::int AS "atRisk",
        COUNT(DISTINCT m."id") FILTER (WHERE t."lastTx" >= ${cutoff90} AND t."lastTx" < ${cutoff60})::int AS "inactive",
        COUNT(DISTINCT m."id") FILTER (WHERE t."lastTx" < ${cutoff90} OR t."lastTx" IS NULL)::int AS "dormant"
      FROM "Merchant" m
      LEFT JOIN (
        SELECT "merchantId", MAX("createdAt") AS "lastTx"
        FROM "Transaction"
        WHERE status = 'completed'
        GROUP BY "merchantId"
      ) t ON t."merchantId" = m."id"
      WHERE m."isActive" = true AND m.status = 'active'
    `,
    prisma.$queryRaw`
      SELECT
        COUNT(DISTINCT c."id") FILTER (WHERE t."lastTx" >= ${cutoff30})::int AS "active30",
        COUNT(DISTINCT c."id") FILTER (WHERE t."lastTx" >= ${cutoff60} AND t."lastTx" < ${cutoff30})::int AS "atRisk",
        COUNT(DISTINCT c."id") FILTER (WHERE t."lastTx" >= ${cutoff90} AND t."lastTx" < ${cutoff60})::int AS "inactive",
        COUNT(DISTINCT c."id") FILTER (WHERE t."lastTx" < ${cutoff90} OR t."lastTx" IS NULL)::int AS "dormant"
      FROM "Customer" c
      LEFT JOIN (
        SELECT "customerId", MAX("createdAt") AS "lastTx"
        FROM "Transaction"
        WHERE status = 'completed'
        GROUP BY "customerId"
      ) t ON t."customerId" = c."id"
      WHERE c."isActive" = true
    `
  ]);

  const mAgg = merchantTxActivity[0] || {};
  const cAgg = customerTxActivity[0] || {};

  return {
    merchants: {
      total: activeMerchants,
      active: Number(mAgg.active30 || 0),
      atRisk: Number(mAgg.atRisk || 0),
      inactive: Number(mAgg.inactive || 0),
      dormant: Number(mAgg.dormant || 0)
    },
    customers: {
      total: activeCustomers,
      active: Number(cAgg.active30 || 0),
      atRisk: Number(cAgg.atRisk || 0),
      inactive: Number(cAgg.inactive || 0),
      dormant: Number(cAgg.dormant || 0)
    },
    thresholds: INACTIVITY_THRESHOLDS
  };
}

module.exports = {
  INACTIVITY_THRESHOLDS,
  daysSince,
  classifyStatus,
  getMerchantInactivityData,
  getCustomerInactivityData,
  getMerchantInactivityReport,
  getCustomerInactivityReport,
  getInactivitySummary
};

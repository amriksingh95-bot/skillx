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
 */
async function getMerchantInactivityReport() {
  const merchants = await prisma.merchant.findMany({
    where: { isActive: true, status: 'active' },
    select: { id: true }
  });

  const report = {
    summary: { active: 0, at_risk: 0, inactive: 0, dormant: 0, total: merchants.length },
    merchants: []
  };

  for (const { id } of merchants) {
    const data = await getMerchantInactivityData(id);
    if (data) {
      report.merchants.push(data);
      report.summary[data.inactivityStatus]++;
    }
  }

  report.merchants.sort((a, b) => (a.daysSinceActivity ?? 9999) - (b.daysSinceActivity ?? 9999));

  return report;
}

/**
 * Get inactivity report for all active customers.
 */
async function getCustomerInactivityReport() {
  const customers = await prisma.customer.findMany({
    where: { isActive: true },
    select: { id: true }
  });

  const report = {
    summary: { active: 0, at_risk: 0, inactive: 0, dormant: 0, total: customers.length },
    customers: []
  };

  for (const { id } of customers) {
    const data = await getCustomerInactivityData(id);
    if (data) {
      report.customers.push(data);
      report.summary[data.inactivityStatus]++;
    }
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

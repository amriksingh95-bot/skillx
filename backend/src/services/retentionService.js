const prisma = require('../lib/prisma');

/**
 * Get customer retention rate.
 * Compares customers active in the current 30-day period vs. the previous 30-day period.
 */
async function getCustomerRetentionRate() {
  const now = new Date();
  const thisPeriodStart = new Date(now);
  thisPeriodStart.setDate(now.getDate() - 30);

  const lastPeriodStart = new Date(thisPeriodStart);
  lastPeriodStart.setDate(lastPeriodStart.getDate() - 30);

  const [thisPeriodResult, lastPeriodResult, retainedResult] = await Promise.all([
    prisma.$queryRaw`
      SELECT COUNT(DISTINCT "customerId")::int AS count
      FROM "Transaction"
      WHERE status = 'completed' AND "createdAt" >= ${thisPeriodStart}
    `,
    prisma.$queryRaw`
      SELECT COUNT(DISTINCT "customerId")::int AS count
      FROM "Transaction"
      WHERE status = 'completed' AND "createdAt" >= ${lastPeriodStart} AND "createdAt" < ${thisPeriodStart}
    `,
    prisma.$queryRaw`
      SELECT COUNT(DISTINCT curr."customerId")::int AS count
      FROM "Transaction" curr
      JOIN "Transaction" prev ON curr."customerId" = prev."customerId"
      WHERE curr.status = 'completed' AND curr."createdAt" >= ${thisPeriodStart}
        AND prev.status = 'completed' AND prev."createdAt" >= ${lastPeriodStart} AND prev."createdAt" < ${thisPeriodStart}
    `
  ]);

  const thisCount = thisPeriodResult[0]?.count || 0;
  const lastCount = lastPeriodResult[0]?.count || 0;
  const retained = retainedResult[0]?.count || 0;

  const retentionRate = lastCount > 0 ? parseFloat(((retained / lastCount) * 100).toFixed(1)) : 100;
  const churnRate = parseFloat((100 - retentionRate).toFixed(1));

  return {
    currentPeriod: { start: thisPeriodStart, activeCustomers: thisCount },
    previousPeriod: { start: lastPeriodStart, activeCustomers: lastCount },
    retained,
    retentionRate,
    churnRate,
    newCustomers: Math.max(0, thisCount - retained),
    churnedCustomers: Math.max(0, lastCount - retained)
  };
}

/**
 * Get merchant retention rate.
 */
async function getMerchantRetentionRate() {
  const now = new Date();
  const thisPeriodStart = new Date(now);
  thisPeriodStart.setDate(now.getDate() - 30);

  const lastPeriodStart = new Date(thisPeriodStart);
  lastPeriodStart.setDate(lastPeriodStart.getDate() - 30);

  const [thisPeriodResult, lastPeriodResult, retainedResult] = await Promise.all([
    prisma.$queryRaw`
      SELECT COUNT(DISTINCT "merchantId")::int AS count
      FROM "Transaction"
      WHERE status = 'completed' AND "createdAt" >= ${thisPeriodStart}
    `,
    prisma.$queryRaw`
      SELECT COUNT(DISTINCT "merchantId")::int AS count
      FROM "Transaction"
      WHERE status = 'completed' AND "createdAt" >= ${lastPeriodStart} AND "createdAt" < ${thisPeriodStart}
    `,
    prisma.$queryRaw`
      SELECT COUNT(DISTINCT curr."merchantId")::int AS count
      FROM "Transaction" curr
      JOIN "Transaction" prev ON curr."merchantId" = prev."merchantId"
      WHERE curr.status = 'completed' AND curr."createdAt" >= ${thisPeriodStart}
        AND prev.status = 'completed' AND prev."createdAt" >= ${lastPeriodStart} AND prev."createdAt" < ${thisPeriodStart}
    `
  ]);

  const thisCount = thisPeriodResult[0]?.count || 0;
  const lastCount = lastPeriodResult[0]?.count || 0;
  const retained = retainedResult[0]?.count || 0;

  const retentionRate = lastCount > 0 ? parseFloat(((retained / lastCount) * 100).toFixed(1)) : 100;
  const churnRate = parseFloat((100 - retentionRate).toFixed(1));

  return {
    currentPeriod: { start: thisPeriodStart, activeMerchants: thisCount },
    previousPeriod: { start: lastPeriodStart, activeMerchants: lastCount },
    retained,
    retentionRate,
    churnRate,
    newMerchants: Math.max(0, thisCount - retained),
    churnedMerchants: Math.max(0, lastCount - retained)
  };
}

/**
 * Get repeat purchase rate.
 * % of customers with >1 completed transaction in the last 90 days.
 */
async function getRepeatPurchaseRate() {
  const now = new Date();
  const cutoff = new Date(now);
  cutoff.setDate(now.getDate() - 90);

  const [totalActive, repeatCustomers] = await Promise.all([
    prisma.$queryRaw`
      SELECT COUNT(DISTINCT "customerId")::int AS count
      FROM "Transaction"
      WHERE status = 'completed' AND "createdAt" >= ${cutoff}
    `,
    prisma.$queryRaw`
      SELECT COUNT(*)::int AS count
      FROM (
        SELECT "customerId"
        FROM "Transaction"
        WHERE status = 'completed' AND "createdAt" >= ${cutoff}
        GROUP BY "customerId"
        HAVING COUNT(*) > 1
      ) sub
    `
  ]);

  const total = totalActive[0]?.count || 0;
  const repeat = repeatCustomers[0]?.count || 0;
  const repeatRate = total > 0 ? parseFloat(((repeat / total) * 100).toFixed(1)) : 0;

  return {
    period: { start: cutoff, end: now },
    totalActiveCustomers: total,
    repeatCustomers: repeat,
    repeatPurchaseRate: repeatRate,
    oneTimeCustomers: total - repeat
  };
}

/**
 * Get all retention metrics in a single call.
 */
async function getRetentionMetrics() {
  const [customerRetention, merchantRetention, repeatPurchase] = await Promise.all([
    getCustomerRetentionRate(),
    getMerchantRetentionRate(),
    getRepeatPurchaseRate()
  ]);

  return {
    customerRetention,
    merchantRetention,
    repeatPurchase
  };
}

module.exports = {
  getCustomerRetentionRate,
  getMerchantRetentionRate,
  getRepeatPurchaseRate,
  getRetentionMetrics
};

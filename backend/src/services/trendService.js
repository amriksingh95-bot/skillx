const prisma = require('../lib/prisma');

/**
 * Get transaction volume trends (WoW and MoM).
 */
async function getTransactionTrends() {
  const now = new Date();

  const thisWeekStart = new Date(now);
  thisWeekStart.setDate(now.getDate() - now.getDay());
  thisWeekStart.setHours(0, 0, 0, 0);

  const lastWeekStart = new Date(thisWeekStart);
  lastWeekStart.setDate(lastWeekStart.getDate() - 7);

  const lastWeekEnd = new Date(thisWeekStart);
  lastWeekEnd.setMilliseconds(-1);

  const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);

  const [thisWeek, lastWeek, thisMonth, lastMonth] = await Promise.all([
    prisma.$queryRaw`
      SELECT
        COUNT(*)::int AS "transactionCount",
        COALESCE(SUM(CASE WHEN type IN ('earn','transfer') THEN "purchaseAmount" ELSE 0 END), 0)::numeric AS "volume",
        COALESCE(SUM(CASE WHEN type IN ('earn','transfer') THEN points ELSE 0 END), 0)::int AS "pointsIssued",
        COALESCE(SUM(CASE WHEN type = 'redeem' THEN points ELSE 0 END), 0)::int AS "pointsRedeemed",
        COUNT(DISTINCT "customerId")::int AS "uniqueCustomers",
        COUNT(DISTINCT "merchantId")::int AS "uniqueMerchants"
      FROM "Transaction"
      WHERE status = 'completed' AND "createdAt" >= ${thisWeekStart}
    `,
    prisma.$queryRaw`
      SELECT
        COUNT(*)::int AS "transactionCount",
        COALESCE(SUM(CASE WHEN type IN ('earn','transfer') THEN "purchaseAmount" ELSE 0 END), 0)::numeric AS "volume",
        COALESCE(SUM(CASE WHEN type IN ('earn','transfer') THEN points ELSE 0 END), 0)::int AS "pointsIssued",
        COALESCE(SUM(CASE WHEN type = 'redeem' THEN points ELSE 0 END), 0)::int AS "pointsRedeemed",
        COUNT(DISTINCT "customerId")::int AS "uniqueCustomers",
        COUNT(DISTINCT "merchantId")::int AS "uniqueMerchants"
      FROM "Transaction"
      WHERE status = 'completed' AND "createdAt" >= ${lastWeekStart} AND "createdAt" <= ${lastWeekEnd}
    `,
    prisma.$queryRaw`
      SELECT
        COUNT(*)::int AS "transactionCount",
        COALESCE(SUM(CASE WHEN type IN ('earn','transfer') THEN "purchaseAmount" ELSE 0 END), 0)::numeric AS "volume",
        COALESCE(SUM(CASE WHEN type IN ('earn','transfer') THEN points ELSE 0 END), 0)::int AS "pointsIssued",
        COALESCE(SUM(CASE WHEN type = 'redeem' THEN points ELSE 0 END), 0)::int AS "pointsRedeemed",
        COUNT(DISTINCT "customerId")::int AS "uniqueCustomers",
        COUNT(DISTINCT "merchantId")::int AS "uniqueMerchants"
      FROM "Transaction"
      WHERE status = 'completed' AND "createdAt" >= ${thisMonthStart}
    `,
    prisma.$queryRaw`
      SELECT
        COUNT(*)::int AS "transactionCount",
        COALESCE(SUM(CASE WHEN type IN ('earn','transfer') THEN "purchaseAmount" ELSE 0 END), 0)::numeric AS "volume",
        COALESCE(SUM(CASE WHEN type IN ('earn','transfer') THEN points ELSE 0 END), 0)::int AS "pointsIssued",
        COALESCE(SUM(CASE WHEN type = 'redeem' THEN points ELSE 0 END), 0)::int AS "pointsRedeemed",
        COUNT(DISTINCT "customerId")::int AS "uniqueCustomers",
        COUNT(DISTINCT "merchantId")::int AS "uniqueMerchants"
      FROM "Transaction"
      WHERE status = 'completed' AND "createdAt" >= ${lastMonthStart} AND "createdAt" <= ${lastMonthEnd}
    `
  ]);

  const tw = thisWeek[0] || {};
  const lw = lastWeek[0] || {};
  const tm = thisMonth[0] || {};
  const lm = lastMonth[0] || {};

  function calcChange(current, previous) {
    if (!previous || previous === 0) return { change: 0, direction: 'flat' };
    const diff = ((current - previous) / previous) * 100;
    return { change: parseFloat(diff.toFixed(1)), direction: diff > 0 ? 'up' : diff < 0 ? 'down' : 'flat' };
  }

  return {
    weekOverWeek: {
      thisWeek: {
        transactionCount: tw.transactionCount || 0,
        volume: parseFloat(tw.volume || 0),
        pointsIssued: tw.pointsIssued || 0,
        pointsRedeemed: tw.pointsRedeemed || 0,
        uniqueCustomers: tw.uniqueCustomers || 0,
        uniqueMerchants: tw.uniqueMerchants || 0
      },
      lastWeek: {
        transactionCount: lw.transactionCount || 0,
        volume: parseFloat(lw.volume || 0),
        pointsIssued: lw.pointsIssued || 0,
        pointsRedeemed: lw.pointsRedeemed || 0,
        uniqueCustomers: lw.uniqueCustomers || 0,
        uniqueMerchants: lw.uniqueMerchants || 0
      },
      changes: {
        transactionCount: calcChange(tw.transactionCount || 0, lw.transactionCount || 0),
        volume: calcChange(parseFloat(tw.volume || 0), parseFloat(lw.volume || 0)),
        uniqueCustomers: calcChange(tw.uniqueCustomers || 0, lw.uniqueCustomers || 0),
        uniqueMerchants: calcChange(tw.uniqueMerchants || 0, lw.uniqueMerchants || 0)
      }
    },
    monthOverMonth: {
      thisMonth: {
        transactionCount: tm.transactionCount || 0,
        volume: parseFloat(tm.volume || 0),
        pointsIssued: tm.pointsIssued || 0,
        pointsRedeemed: tm.pointsRedeemed || 0,
        uniqueCustomers: tm.uniqueCustomers || 0,
        uniqueMerchants: tm.uniqueMerchants || 0
      },
      lastMonth: {
        transactionCount: lm.transactionCount || 0,
        volume: parseFloat(lm.volume || 0),
        pointsIssued: lm.pointsIssued || 0,
        pointsRedeemed: lm.pointsRedeemed || 0,
        uniqueCustomers: lm.uniqueCustomers || 0,
        uniqueMerchants: lm.uniqueMerchants || 0
      },
      changes: {
        transactionCount: calcChange(tm.transactionCount || 0, lm.transactionCount || 0),
        volume: calcChange(parseFloat(tm.volume || 0), parseFloat(lm.volume || 0)),
        uniqueCustomers: calcChange(tm.uniqueCustomers || 0, lm.uniqueCustomers || 0),
        uniqueMerchants: calcChange(tm.uniqueMerchants || 0, lm.uniqueMerchants || 0)
      }
    }
  };
}

/**
 * Get user activity trends (MoM active users).
 */
async function getUserTrends() {
  const now = new Date();
  const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);

  const [thisMonthCustomers, lastMonthCustomers, thisMonthMerchants, lastMonthMerchants] = await Promise.all([
    prisma.$queryRaw`
      SELECT COUNT(DISTINCT t."customerId")::int AS "activeCount"
      FROM "Transaction" t
      WHERE t.status = 'completed' AND t."createdAt" >= ${thisMonthStart}
    `,
    prisma.$queryRaw`
      SELECT COUNT(DISTINCT t."customerId")::int AS "activeCount"
      FROM "Transaction" t
      WHERE t.status = 'completed' AND t."createdAt" >= ${lastMonthStart} AND t."createdAt" <= ${lastMonthEnd}
    `,
    prisma.$queryRaw`
      SELECT COUNT(DISTINCT t."merchantId")::int AS "activeCount"
      FROM "Transaction" t
      WHERE t.status = 'completed' AND t."createdAt" >= ${thisMonthStart}
    `,
    prisma.$queryRaw`
      SELECT COUNT(DISTINCT t."merchantId")::int AS "activeCount"
      FROM "Transaction" t
      WHERE t.status = 'completed' AND t."createdAt" >= ${lastMonthStart} AND t."createdAt" <= ${lastMonthEnd}
    `
  ]);

  const thisC = thisMonthCustomers[0]?.activeCount || 0;
  const lastC = lastMonthCustomers[0]?.activeCount || 0;
  const thisM = thisMonthMerchants[0]?.activeCount || 0;
  const lastM = lastMonthMerchants[0]?.activeCount || 0;

  function calcChange(current, previous) {
    if (!previous || previous === 0) return { change: 0, direction: 'flat' };
    const diff = ((current - previous) / previous) * 100;
    return { change: parseFloat(diff.toFixed(1)), direction: diff > 0 ? 'up' : diff < 0 ? 'down' : 'flat' };
  }

  return {
    customers: {
      thisMonth: thisC,
      lastMonth: lastC,
      change: calcChange(thisC, lastC)
    },
    merchants: {
      thisMonth: thisM,
      lastMonth: lastM,
      change: calcChange(thisM, lastM)
    }
  };
}

/**
 * Get revenue trends (MoM platform fee + subscription revenue).
 */
async function getRevenueTrends() {
  const now = new Date();
  const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);

  const [thisMonthFees, lastMonthFees, thisMonthSubs, lastMonthSubs] = await Promise.all([
    prisma.$queryRaw`
      SELECT COALESCE(SUM("platformFee"), 0)::numeric AS "totalFee"
      FROM "Transaction"
      WHERE type = 'redeem' AND status = 'completed' AND "reversedById" IS NULL AND "createdAt" >= ${thisMonthStart}
    `,
    prisma.$queryRaw`
      SELECT COALESCE(SUM("platformFee"), 0)::numeric AS "totalFee"
      FROM "Transaction"
      WHERE type = 'redeem' AND status = 'completed' AND "reversedById" IS NULL AND "createdAt" >= ${lastMonthStart} AND "createdAt" <= ${lastMonthEnd}
    `,
    prisma.$queryRaw`
      SELECT COUNT(*)::int AS "count", COALESCE(SUM(p.price), 0)::numeric AS "revenue"
      FROM "MerchantSubscription" ms
      JOIN "SubscriptionPlan" p ON p.id = ms."planId"
      WHERE ms."createdAt" >= ${thisMonthStart}
    `,
    prisma.$queryRaw`
      SELECT COUNT(*)::int AS "count", COALESCE(SUM(p.price), 0)::numeric AS "revenue"
      FROM "MerchantSubscription" ms
      JOIN "SubscriptionPlan" p ON p.id = ms."planId"
      WHERE ms."createdAt" >= ${lastMonthStart} AND ms."createdAt" <= ${lastMonthEnd}
    `
  ]);

  const thisFee = parseFloat(thisMonthFees[0]?.totalFee || 0);
  const lastFee = parseFloat(lastMonthFees[0]?.totalFee || 0);
  const thisRev = parseFloat(thisMonthSubs[0]?.revenue || 0);
  const lastRev = parseFloat(lastMonthSubs[0]?.revenue || 0);

  function calcChange(current, previous) {
    if (!previous || previous === 0) return { change: 0, direction: 'flat' };
    const diff = ((current - previous) / previous) * 100;
    return { change: parseFloat(diff.toFixed(1)), direction: diff > 0 ? 'up' : diff < 0 ? 'down' : 'flat' };
  }

  return {
    platformFees: {
      thisMonth: thisFee,
      lastMonth: lastFee,
      change: calcChange(thisFee, lastFee)
    },
    subscriptionRevenue: {
      thisMonth: thisRev,
      lastMonth: lastRev,
      count: thisMonthSubs[0]?.count || 0,
      change: calcChange(thisRev, lastRev)
    }
  };
}

module.exports = {
  getTransactionTrends,
  getUserTrends,
  getRevenueTrends
};

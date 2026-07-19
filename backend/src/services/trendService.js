const prisma = require('../lib/prisma');

function calcChange(current, previous) {
  if (!previous || previous === 0) return { change: 0, direction: 'flat' };
  const diff = ((current - previous) / previous) * 100;
  return { change: parseFloat(diff.toFixed(1)), direction: diff > 0 ? 'up' : diff < 0 ? 'down' : 'flat' };
}

/**
 * Get all trend data (transactions, users, revenue) in 2 queries.
 * Query 1: Transaction aggregates for all date ranges via CASE WHEN.
 * Query 2: MerchantSubscription aggregates for thisMonth/lastMonth via CASE WHEN.
 */
async function getTrendsData() {
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

  const [txRows, subRows] = await Promise.all([
    prisma.$queryRaw`
      SELECT
        COUNT(*)::int AS "txCount",
        COALESCE(SUM(CASE WHEN "createdAt" >= ${thisWeekStart} THEN 1 ELSE 0 END), 0)::int AS "thisWeekCount",
        COALESCE(SUM(CASE WHEN "createdAt" >= ${thisWeekStart} THEN CASE WHEN type IN ('earn','transfer') THEN "purchaseAmount" ELSE 0 END ELSE 0 END), 0)::numeric AS "thisWeekVolume",
        COALESCE(SUM(CASE WHEN "createdAt" >= ${thisWeekStart} THEN CASE WHEN type IN ('earn','transfer') THEN points ELSE 0 END ELSE 0 END), 0)::int AS "thisWeekPointsIssued",
        COALESCE(SUM(CASE WHEN "createdAt" >= ${thisWeekStart} THEN CASE WHEN type = 'redeem' THEN points ELSE 0 END ELSE 0 END), 0)::int AS "thisWeekPointsRedeemed",
        COUNT(DISTINCT CASE WHEN "createdAt" >= ${thisWeekStart} THEN "customerId" END)::int AS "thisWeekCustomers",
        COUNT(DISTINCT CASE WHEN "createdAt" >= ${thisWeekStart} THEN "merchantId" END)::int AS "thisWeekMerchants",

        COALESCE(SUM(CASE WHEN "createdAt" >= ${lastWeekStart} AND "createdAt" <= ${lastWeekEnd} THEN 1 ELSE 0 END), 0)::int AS "lastWeekCount",
        COALESCE(SUM(CASE WHEN "createdAt" >= ${lastWeekStart} AND "createdAt" <= ${lastWeekEnd} THEN CASE WHEN type IN ('earn','transfer') THEN "purchaseAmount" ELSE 0 END ELSE 0 END), 0)::numeric AS "lastWeekVolume",
        COALESCE(SUM(CASE WHEN "createdAt" >= ${lastWeekStart} AND "createdAt" <= ${lastWeekEnd} THEN CASE WHEN type IN ('earn','transfer') THEN points ELSE 0 END ELSE 0 END), 0)::int AS "lastWeekPointsIssued",
        COALESCE(SUM(CASE WHEN "createdAt" >= ${lastWeekStart} AND "createdAt" <= ${lastWeekEnd} THEN CASE WHEN type = 'redeem' THEN points ELSE 0 END ELSE 0 END), 0)::int AS "lastWeekPointsRedeemed",
        COUNT(DISTINCT CASE WHEN "createdAt" >= ${lastWeekStart} AND "createdAt" <= ${lastWeekEnd} THEN "customerId" END)::int AS "lastWeekCustomers",
        COUNT(DISTINCT CASE WHEN "createdAt" >= ${lastWeekStart} AND "createdAt" <= ${lastWeekEnd} THEN "merchantId" END)::int AS "lastWeekMerchants",

        COALESCE(SUM(CASE WHEN "createdAt" >= ${thisMonthStart} THEN 1 ELSE 0 END), 0)::int AS "thisMonthTxCount",
        COALESCE(SUM(CASE WHEN "createdAt" >= ${thisMonthStart} THEN CASE WHEN type IN ('earn','transfer') THEN "purchaseAmount" ELSE 0 END ELSE 0 END), 0)::numeric AS "thisMonthVolume",
        COALESCE(SUM(CASE WHEN "createdAt" >= ${thisMonthStart} THEN CASE WHEN type IN ('earn','transfer') THEN points ELSE 0 END ELSE 0 END), 0)::int AS "thisMonthPointsIssued",
        COALESCE(SUM(CASE WHEN "createdAt" >= ${thisMonthStart} THEN CASE WHEN type = 'redeem' THEN points ELSE 0 END ELSE 0 END), 0)::int AS "thisMonthPointsRedeemed",
        COUNT(DISTINCT CASE WHEN "createdAt" >= ${thisMonthStart} THEN "customerId" END)::int AS "thisMonthCustomers",
        COUNT(DISTINCT CASE WHEN "createdAt" >= ${thisMonthStart} THEN "merchantId" END)::int AS "thisMonthMerchants",

        COALESCE(SUM(CASE WHEN "createdAt" >= ${lastMonthStart} AND "createdAt" <= ${lastMonthEnd} THEN 1 ELSE 0 END), 0)::int AS "lastMonthTxCount",
        COALESCE(SUM(CASE WHEN "createdAt" >= ${lastMonthStart} AND "createdAt" <= ${lastMonthEnd} THEN CASE WHEN type IN ('earn','transfer') THEN "purchaseAmount" ELSE 0 END ELSE 0 END), 0)::numeric AS "lastMonthVolume",
        COALESCE(SUM(CASE WHEN "createdAt" >= ${lastMonthStart} AND "createdAt" <= ${lastMonthEnd} THEN CASE WHEN type IN ('earn','transfer') THEN points ELSE 0 END ELSE 0 END), 0)::int AS "lastMonthPointsIssued",
        COALESCE(SUM(CASE WHEN "createdAt" >= ${lastMonthStart} AND "createdAt" <= ${lastMonthEnd} THEN CASE WHEN type = 'redeem' THEN points ELSE 0 END ELSE 0 END), 0)::int AS "lastMonthPointsRedeemed",
        COUNT(DISTINCT CASE WHEN "createdAt" >= ${lastMonthStart} AND "createdAt" <= ${lastMonthEnd} THEN "customerId" END)::int AS "lastMonthCustomers",
        COUNT(DISTINCT CASE WHEN "createdAt" >= ${lastMonthStart} AND "createdAt" <= ${lastMonthEnd} THEN "merchantId" END)::int AS "lastMonthMerchants",

        COALESCE(SUM(CASE WHEN "createdAt" >= ${thisMonthStart} AND type = 'redeem' AND "reversedById" IS NULL THEN "platformFee" ELSE 0 END), 0)::numeric AS "thisMonthFees",
        COALESCE(SUM(CASE WHEN "createdAt" >= ${lastMonthStart} AND "createdAt" <= ${lastMonthEnd} AND type = 'redeem' AND "reversedById" IS NULL THEN "platformFee" ELSE 0 END), 0)::numeric AS "lastMonthFees"
      FROM "Transaction"
      WHERE status = 'completed'
    `,
    prisma.$queryRaw`
      SELECT
        COALESCE(SUM(CASE WHEN ms."createdAt" >= ${thisMonthStart} THEN p.price ELSE 0 END), 0)::numeric AS "thisMonthRevenue",
        COUNT(CASE WHEN ms."createdAt" >= ${thisMonthStart} THEN 1 END)::int AS "thisMonthCount",
        COALESCE(SUM(CASE WHEN ms."createdAt" >= ${lastMonthStart} AND ms."createdAt" <= ${lastMonthEnd} THEN p.price ELSE 0 END), 0)::numeric AS "lastMonthRevenue",
        COUNT(CASE WHEN ms."createdAt" >= ${lastMonthStart} AND ms."createdAt" <= ${lastMonthEnd} THEN 1 END)::int AS "lastMonthCount"
      FROM "MerchantSubscription" ms
      JOIN "SubscriptionPlan" p ON p.id = ms."planId"
    `
  ]);

  const r = txRows[0] || {};
  const s = subRows[0] || {};

  const transactions = {
    weekOverWeek: {
      thisWeek: {
        transactionCount: r.thisWeekCount || 0,
        volume: parseFloat(r.thisWeekVolume || 0),
        pointsIssued: r.thisWeekPointsIssued || 0,
        pointsRedeemed: r.thisWeekPointsRedeemed || 0,
        uniqueCustomers: r.thisWeekCustomers || 0,
        uniqueMerchants: r.thisWeekMerchants || 0
      },
      lastWeek: {
        transactionCount: r.lastWeekCount || 0,
        volume: parseFloat(r.lastWeekVolume || 0),
        pointsIssued: r.lastWeekPointsIssued || 0,
        pointsRedeemed: r.lastWeekPointsRedeemed || 0,
        uniqueCustomers: r.lastWeekCustomers || 0,
        uniqueMerchants: r.lastWeekMerchants || 0
      },
      changes: {
        transactionCount: calcChange(r.thisWeekCount || 0, r.lastWeekCount || 0),
        volume: calcChange(parseFloat(r.thisWeekVolume || 0), parseFloat(r.lastWeekVolume || 0)),
        uniqueCustomers: calcChange(r.thisWeekCustomers || 0, r.lastWeekCustomers || 0),
        uniqueMerchants: calcChange(r.thisWeekMerchants || 0, r.lastWeekMerchants || 0)
      }
    },
    monthOverMonth: {
      thisMonth: {
        transactionCount: r.thisMonthTxCount || 0,
        volume: parseFloat(r.thisMonthVolume || 0),
        pointsIssued: r.thisMonthPointsIssued || 0,
        pointsRedeemed: r.thisMonthPointsRedeemed || 0,
        uniqueCustomers: r.thisMonthCustomers || 0,
        uniqueMerchants: r.thisMonthMerchants || 0
      },
      lastMonth: {
        transactionCount: r.lastMonthTxCount || 0,
        volume: parseFloat(r.lastMonthVolume || 0),
        pointsIssued: r.lastMonthPointsIssued || 0,
        pointsRedeemed: r.lastMonthPointsRedeemed || 0,
        uniqueCustomers: r.lastMonthCustomers || 0,
        uniqueMerchants: r.lastMonthMerchants || 0
      },
      changes: {
        transactionCount: calcChange(r.thisMonthTxCount || 0, r.lastMonthTxCount || 0),
        volume: calcChange(parseFloat(r.thisMonthVolume || 0), parseFloat(r.lastMonthVolume || 0)),
        uniqueCustomers: calcChange(r.thisMonthCustomers || 0, r.lastMonthCustomers || 0),
        uniqueMerchants: calcChange(r.thisMonthMerchants || 0, r.lastMonthMerchants || 0)
      }
    }
  };

  const users = {
    customers: {
      thisMonth: r.thisMonthCustomers || 0,
      lastMonth: r.lastMonthCustomers || 0,
      change: calcChange(r.thisMonthCustomers || 0, r.lastMonthCustomers || 0)
    },
    merchants: {
      thisMonth: r.thisMonthMerchants || 0,
      lastMonth: r.lastMonthMerchants || 0,
      change: calcChange(r.thisMonthMerchants || 0, r.lastMonthMerchants || 0)
    }
  };

  const thisFee = parseFloat(r.thisMonthFees || 0);
  const lastFee = parseFloat(r.lastMonthFees || 0);
  const thisRev = parseFloat(s.thisMonthRevenue || 0);
  const lastRev = parseFloat(s.lastMonthRevenue || 0);

  const revenue = {
    platformFees: {
      thisMonth: thisFee,
      lastMonth: lastFee,
      change: calcChange(thisFee, lastFee)
    },
    subscriptionRevenue: {
      thisMonth: thisRev,
      lastMonth: lastRev,
      count: s.thisMonthCount || 0,
      change: calcChange(thisRev, lastRev)
    }
  };

  return { transactions, users, revenue };
}

/**
 * Backward-compatible wrappers that delegate to getTrendsData.
 * These exist so the controller can still destructure individual functions if needed.
 */
async function getTransactionTrends() {
  const { transactions } = await getTrendsData();
  return transactions;
}

async function getUserTrends() {
  const { users } = await getTrendsData();
  return users;
}

async function getRevenueTrends() {
  const { revenue } = await getTrendsData();
  return revenue;
}

module.exports = {
  getTrendsData,
  getTransactionTrends,
  getUserTrends,
  getRevenueTrends
};

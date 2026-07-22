const { PrismaClient } = require('@prisma/client');
require('dotenv').config();

const prisma = new PrismaClient({
  datasources: { db: { url: process.env.DATABASE_URL } }
});

const RUNS = 5;

async function timeIt(label, fn) {
  const times = [];
  for (let i = 0; i < RUNS; i++) {
    const start = performance.now();
    await fn();
    times.push(performance.now() - start);
  }
  const avg = times.reduce((a, b) => a + b, 0) / times.length;
  const runStr = times.map((t, i) => `Run${i + 1}=${Math.round(t)}ms`).join(', ');
  console.log(`${label}: ${runStr}, Avg=${Math.round(avg)}ms`);
  return avg;
}

// ─── OLD TREND QUERIES (12 queries) ───
async function oldTrendQueries() {
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

  const select = `
    COUNT(*)::int AS "transactionCount",
    COALESCE(SUM(CASE WHEN type IN ('earn','transfer') THEN "purchaseAmount" ELSE 0 END), 0)::numeric AS "volume",
    COALESCE(SUM(CASE WHEN type IN ('earn','transfer') THEN points ELSE 0 END), 0)::int AS "pointsIssued",
    COALESCE(SUM(CASE WHEN type = 'redeem' THEN points ELSE 0 END), 0)::int AS "pointsRedeemed",
    COUNT(DISTINCT "customerId")::int AS "uniqueCustomers",
    COUNT(DISTINCT "merchantId")::int AS "uniqueMerchants"
  `;

  await Promise.all([
    prisma.$queryRawUnsafe(`SELECT ${select} FROM "Transaction" WHERE status = 'completed' AND "createdAt" >= $1`, thisWeekStart),
    prisma.$queryRawUnsafe(`SELECT ${select} FROM "Transaction" WHERE status = 'completed' AND "createdAt" >= $1 AND "createdAt" <= $2`, lastWeekStart, lastWeekEnd),
    prisma.$queryRawUnsafe(`SELECT ${select} FROM "Transaction" WHERE status = 'completed' AND "createdAt" >= $1`, thisMonthStart),
    prisma.$queryRawUnsafe(`SELECT ${select} FROM "Transaction" WHERE status = 'completed' AND "createdAt" >= $1 AND "createdAt" <= $2`, lastMonthStart, lastMonthEnd),
  ]);

  await Promise.all([
    prisma.$queryRawUnsafe(`SELECT COUNT(DISTINCT "customerId")::int AS "activeCount" FROM "Transaction" WHERE status = 'completed' AND "createdAt" >= $1`, thisMonthStart),
    prisma.$queryRawUnsafe(`SELECT COUNT(DISTINCT "customerId")::int AS "activeCount" FROM "Transaction" WHERE status = 'completed' AND "createdAt" >= $1 AND "createdAt" <= $2`, lastMonthStart, lastMonthEnd),
    prisma.$queryRawUnsafe(`SELECT COUNT(DISTINCT "merchantId")::int AS "activeCount" FROM "Transaction" WHERE status = 'completed' AND "createdAt" >= $1`, thisMonthStart),
    prisma.$queryRawUnsafe(`SELECT COUNT(DISTINCT "merchantId")::int AS "activeCount" FROM "Transaction" WHERE status = 'completed' AND "createdAt" >= $1 AND "createdAt" <= $2`, lastMonthStart, lastMonthEnd),
  ]);

  await Promise.all([
    prisma.$queryRawUnsafe(`SELECT COALESCE(SUM("platformFee"), 0)::numeric AS "totalFee" FROM "Transaction" WHERE type = 'redeem' AND status = 'completed' AND "reversedById" IS NULL AND "createdAt" >= $1`, thisMonthStart),
    prisma.$queryRawUnsafe(`SELECT COALESCE(SUM("platformFee"), 0)::numeric AS "totalFee" FROM "Transaction" WHERE type = 'redeem' AND status = 'completed' AND "reversedById" IS NULL AND "createdAt" >= $1 AND "createdAt" <= $2`, lastMonthStart, lastMonthEnd),
    prisma.$queryRawUnsafe(`SELECT COUNT(*)::int AS "count", COALESCE(SUM(p.price), 0)::numeric AS "revenue" FROM "MerchantSubscription" ms JOIN "SubscriptionPlan" p ON p.id = ms."planId" WHERE ms."createdAt" >= $1`, thisMonthStart),
    prisma.$queryRawUnsafe(`SELECT COUNT(*)::int AS "count", COALESCE(SUM(p.price), 0)::numeric AS "revenue" FROM "MerchantSubscription" ms JOIN "SubscriptionPlan" p ON p.id = ms."planId" WHERE ms."createdAt" >= $1 AND ms."createdAt" <= $2`, lastMonthStart, lastMonthEnd),
  ]);
}

// ─── NEW TREND QUERIES (2 queries) ───
async function newTrendQueries() {
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

  await Promise.all([
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
}

// ─── OLD RETENTION QUERIES (6 queries, 4 returning full arrays) ───
async function oldRetentionQueries() {
  const now = new Date();
  const thisPeriodStart = new Date(now);
  thisPeriodStart.setDate(now.getDate() - 30);
  const lastPeriodStart = new Date(thisPeriodStart);
  lastPeriodStart.setDate(lastPeriodStart.getDate() - 30);

  await Promise.all([
    prisma.$queryRawUnsafe(`SELECT DISTINCT "customerId" AS id FROM "Transaction" WHERE status = 'completed' AND "createdAt" >= $1`, thisPeriodStart),
    prisma.$queryRawUnsafe(`SELECT DISTINCT "customerId" AS id FROM "Transaction" WHERE status = 'completed' AND "createdAt" >= $1 AND "createdAt" < $2`, lastPeriodStart, thisPeriodStart),
    prisma.$queryRawUnsafe(`SELECT COUNT(DISTINCT curr."customerId")::int AS count FROM "Transaction" curr JOIN "Transaction" prev ON curr."customerId" = prev."customerId" WHERE curr.status = 'completed' AND curr."createdAt" >= $1 AND prev.status = 'completed' AND prev."createdAt" >= $2 AND prev."createdAt" < $3`, thisPeriodStart, lastPeriodStart, thisPeriodStart),
  ]);

  await Promise.all([
    prisma.$queryRawUnsafe(`SELECT DISTINCT "merchantId" AS id FROM "Transaction" WHERE status = 'completed' AND "createdAt" >= $1`, thisPeriodStart),
    prisma.$queryRawUnsafe(`SELECT DISTINCT "merchantId" AS id FROM "Transaction" WHERE status = 'completed' AND "createdAt" >= $1 AND "createdAt" < $2`, lastPeriodStart, thisPeriodStart),
    prisma.$queryRawUnsafe(`SELECT COUNT(DISTINCT curr."merchantId")::int AS count FROM "Transaction" curr JOIN "Transaction" prev ON curr."merchantId" = prev."merchantId" WHERE curr.status = 'completed' AND curr."createdAt" >= $1 AND prev.status = 'completed' AND prev."createdAt" >= $2 AND prev."createdAt" < $3`, thisPeriodStart, lastPeriodStart, thisPeriodStart),
  ]);

  const cutoff = new Date(now);
  cutoff.setDate(now.getDate() - 90);
  await Promise.all([
    prisma.$queryRawUnsafe(`SELECT COUNT(DISTINCT "customerId")::int AS count FROM "Transaction" WHERE status = 'completed' AND "createdAt" >= $1`, cutoff),
    prisma.$queryRawUnsafe(`SELECT COUNT(*)::int AS count FROM (SELECT "customerId" FROM "Transaction" WHERE status = 'completed' AND "createdAt" >= $1 GROUP BY "customerId" HAVING COUNT(*) > 1) sub`, cutoff),
  ]);
}

// ─── NEW RETENTION QUERIES (6 queries, all COUNT DISTINCT) ───
async function newRetentionQueries() {
  const now = new Date();
  const thisPeriodStart = new Date(now);
  thisPeriodStart.setDate(now.getDate() - 30);
  const lastPeriodStart = new Date(thisPeriodStart);
  lastPeriodStart.setDate(lastPeriodStart.getDate() - 30);

  await Promise.all([
    prisma.$queryRaw`SELECT COUNT(DISTINCT "customerId")::int AS count FROM "Transaction" WHERE status = 'completed' AND "createdAt" >= ${thisPeriodStart}`,
    prisma.$queryRaw`SELECT COUNT(DISTINCT "customerId")::int AS count FROM "Transaction" WHERE status = 'completed' AND "createdAt" >= ${lastPeriodStart} AND "createdAt" < ${thisPeriodStart}`,
    prisma.$queryRaw`SELECT COUNT(DISTINCT curr."customerId")::int AS count FROM "Transaction" curr JOIN "Transaction" prev ON curr."customerId" = prev."customerId" WHERE curr.status = 'completed' AND curr."createdAt" >= ${thisPeriodStart} AND prev.status = 'completed' AND prev."createdAt" >= ${lastPeriodStart} AND prev."createdAt" < ${thisPeriodStart}`,
  ]);

  await Promise.all([
    prisma.$queryRaw`SELECT COUNT(DISTINCT "merchantId")::int AS count FROM "Transaction" WHERE status = 'completed' AND "createdAt" >= ${thisPeriodStart}`,
    prisma.$queryRaw`SELECT COUNT(DISTINCT "merchantId")::int AS count FROM "Transaction" WHERE status = 'completed' AND "createdAt" >= ${lastPeriodStart} AND "createdAt" < ${thisPeriodStart}`,
    prisma.$queryRaw`SELECT COUNT(DISTINCT curr."merchantId")::int AS count FROM "Transaction" curr JOIN "Transaction" prev ON curr."merchantId" = prev."merchantId" WHERE curr.status = 'completed' AND curr."createdAt" >= ${thisPeriodStart} AND prev.status = 'completed' AND prev."createdAt" >= ${lastPeriodStart} AND prev."createdAt" < ${thisPeriodStart}`,
  ]);

  const cutoff = new Date(now);
  cutoff.setDate(now.getDate() - 90);
  await Promise.all([
    prisma.$queryRaw`SELECT COUNT(DISTINCT "customerId")::int AS count FROM "Transaction" WHERE status = 'completed' AND "createdAt" >= ${cutoff}`,
    prisma.$queryRaw`SELECT COUNT(*)::int AS count FROM (SELECT "customerId" FROM "Transaction" WHERE status = 'completed' AND "createdAt" >= ${cutoff} GROUP BY "customerId" HAVING COUNT(*) > 1) sub`,
  ]);
}

async function main() {
  console.log('--- Old Trends (12 queries) ---');
  const oldTrendAvg = await timeIt('Old Trends', oldTrendQueries);

  console.log('--- New Trends (2 queries) ---');
  const newTrendAvg = await timeIt('New Trends', newTrendQueries);

  console.log('--- Old Retention (6 queries, 4 full arrays) ---');
  const oldRetAvg = await timeIt('Old Retention', oldRetentionQueries);

  console.log('--- New Retention (6 queries, all COUNT DISTINCT) ---');
  const newRetAvg = await timeIt('New Retention', newRetentionQueries);

  const oldTotal = oldTrendAvg + oldRetAvg;
  const newTotal = newTrendAvg + newRetAvg;
  const pct = ((1 - newTotal / oldTotal) * 100).toFixed(1);
  const saved = Math.round(oldTotal - newTotal);

  console.log('');
  console.log(`Combined Old Total: ${Math.round(oldTotal)}ms`);
  console.log(`Combined New Total: ${Math.round(newTotal)}ms`);
  console.log(`Speedup: ${pct}% faster (${saved}ms saved)`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());

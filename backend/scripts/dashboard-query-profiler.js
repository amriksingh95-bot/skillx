/**
 * Dashboard query timing profiler.
 * Tests each query from getDashboard individually and reports timing.
 * Read-only — no writes to the database.
 */

const path = require('path');
const { PrismaClient } = require(path.join(__dirname, '..', 'node_modules', '@prisma/client'));

async function main() {
  const prisma = new PrismaClient();
  const results = [];

  async function timeQuery(name, fn) {
    const start = performance.now();
    try {
      await fn();
      const elapsed = performance.now() - start;
      results.push({ name, ms: elapsed.toFixed(1), status: 'OK' });
    } catch (err) {
      const elapsed = performance.now() - start;
      results.push({ name, ms: elapsed.toFixed(1), status: `ERROR: ${err.message.substring(0, 80)}` });
    }
  }

  const now = new Date();
  const firstDayThisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const firstDayLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const lastDayLastMonth = new Date(now.getFullYear(), now.getMonth(), 0);
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  thirtyDaysAgo.setHours(0, 0, 0, 0);

  const upcomingMonth1 = new Date().getMonth() + 1;
  const upcomingDate2 = new Date();
  upcomingDate2.setDate(upcomingDate2.getDate() + 7);
  const upcomingMonth2 = upcomingDate2.getMonth() + 1;

  console.log('╔══════════════════════════════════════════════════════════════════╗');
  console.log('║  Dashboard Query Timing Profiler                               ║');
  console.log('╚══════════════════════════════════════════════════════════════════╝\n');

  // ── Sequential queries (as currently coded) ──
  console.log('=== SEQUENTIAL QUERIES (current behavior) ===\n');

  await timeQuery('#1  customer.count() [all]', () =>
    prisma.customer.count()
  );

  await timeQuery('#2  customer.count(isActive)', () =>
    prisma.customer.count({ where: { isActive: true } })
  );

  await timeQuery('#3  merchant.count() [all]', () =>
    prisma.merchant.count()
  );

  await timeQuery('#4  merchant.count(isActive)', () =>
    prisma.merchant.count({ where: { isActive: true } })
  );

  await timeQuery('#5  transaction.count() [all]', () =>
    prisma.transaction.count()
  );

  await timeQuery('#6  ledgerAgg (points issued/redeemed)', () =>
    prisma.$queryRaw`
      SELECT
        COALESCE(SUM(CASE WHEN pl."pointsChange" > 0 AND t.status = 'completed' THEN pl."pointsChange" ELSE 0 END), 0)::int AS "pointsIssued",
        COALESCE(SUM(CASE WHEN pl."pointsChange" < 0 AND t.status = 'completed' THEN ABS(pl."pointsChange") ELSE 0 END), 0)::int AS "pointsRedeemed"
      FROM "PointsLedger" pl
      JOIN "Transaction" t ON t.id = pl."transactionId"
      WHERE t.type != 'reversal'
    `
  );

  await timeQuery('#7  rewardSettings.findFirst()', () =>
    prisma.rewardSettings.findFirst({ orderBy: { updatedAt: 'desc' } })
  );

  await timeQuery('#8  feeRevenueAgg', () =>
    prisma.$queryRaw`
      SELECT
        COALESCE(SUM(CASE WHEN t.type = 'redeem' AND t.status = 'completed' AND t."reversedById" IS NULL THEN t."platformFee" ELSE 0 END), 0)::numeric AS "totalFeeRevenue",
        COALESCE(SUM(CASE WHEN t.type = 'redeem' AND t.status = 'completed' AND t."reversedById" IS NULL AND t."createdAt" >= ${firstDayThisMonth} THEN t."platformFee" ELSE 0 END), 0)::numeric AS "feeRevenueThisMonth",
        COALESCE(SUM(CASE WHEN t.type = 'redeem' AND t.status = 'completed' AND t."reversedById" IS NULL AND t."createdAt" >= ${firstDayLastMonth} AND t."createdAt" <= ${lastDayLastMonth} THEN t."platformFee" ELSE 0 END), 0)::numeric AS "feeRevenueLastMonth"
      FROM "Transaction" t
    `
  );

  await timeQuery('#9  topUpRevenueAgg', () =>
    prisma.$queryRaw`
      SELECT
        COALESCE(SUM(CASE WHEN status = 'confirmed' THEN "amountPaid" ELSE 0 END), 0)::numeric AS "totalTopUpRevenue",
        COALESCE(SUM(CASE WHEN status = 'confirmed' AND "createdAt" >= ${firstDayThisMonth} THEN "amountPaid" ELSE 0 END), 0)::numeric AS "topUpRevenueThisMonth",
        COALESCE(SUM(CASE WHEN status = 'confirmed' AND "createdAt" >= ${firstDayLastMonth} AND "createdAt" <= ${lastDayLastMonth} THEN "amountPaid" ELSE 0 END), 0)::numeric AS "topUpRevenueLastMonth"
      FROM "PointsTopUp"
    `
  );

  await timeQuery('#10 adPaymentRevenueAgg', () =>
    prisma.$queryRaw`
      SELECT
        COALESCE(SUM(CASE WHEN status = 'confirmed' THEN "amountPaid" ELSE 0 END), 0)::numeric AS "totalAdPaymentRevenue",
        COALESCE(SUM(CASE WHEN status = 'confirmed' AND "createdAt" >= ${firstDayThisMonth} THEN "amountPaid" ELSE 0 END), 0)::numeric AS "adPaymentRevenueThisMonth",
        COALESCE(SUM(CASE WHEN status = 'confirmed' AND "createdAt" >= ${firstDayLastMonth} AND "createdAt" <= ${lastDayLastMonth} THEN "amountPaid" ELSE 0 END), 0)::numeric AS "adPaymentRevenueLastMonth"
      FROM "AdPayment"
    `
  );

  await timeQuery('#11 txAgg (this/last month)', () =>
    prisma.$queryRaw`
      SELECT
        COALESCE(SUM(CASE WHEN "createdAt" >= ${firstDayThisMonth} THEN 1 ELSE 0 END), 0)::int AS "transactionsThisMonth",
        COALESCE(SUM(CASE WHEN "createdAt" >= ${firstDayLastMonth} AND "createdAt" <= ${lastDayLastMonth} THEN 1 ELSE 0 END), 0)::int AS "transactionsLastMonth"
      FROM "Transaction"
      WHERE status = 'completed'
    `
  );

  await timeQuery('#12 pointsMonthAgg', () =>
    prisma.$queryRaw`
      SELECT
        COALESCE(SUM(CASE WHEN pl."pointsChange" > 0 AND t.status = 'completed' AND pl."createdAt" >= ${firstDayThisMonth} THEN pl."pointsChange" ELSE 0 END), 0)::int AS "pointsIssuedThisMonth",
        COALESCE(SUM(CASE WHEN pl."pointsChange" > 0 AND t.status = 'completed' AND pl."createdAt" >= ${firstDayLastMonth} AND pl."createdAt" <= ${lastDayLastMonth} THEN pl."pointsChange" ELSE 0 END), 0)::int AS "pointsIssuedLastMonth",
        COALESCE(SUM(CASE WHEN pl."pointsChange" < 0 AND t.status = 'completed' AND pl."createdAt" >= ${firstDayThisMonth} THEN ABS(pl."pointsChange") ELSE 0 END), 0)::int AS "pointsRedeemedThisMonth",
        COALESCE(SUM(CASE WHEN pl."pointsChange" < 0 AND t.status = 'completed' AND pl."createdAt" >= ${firstDayLastMonth} AND pl."createdAt" <= ${lastDayLastMonth} THEN ABS(pl."pointsChange") ELSE 0 END), 0)::int AS "pointsRedeemedLastMonth"
      FROM "PointsLedger" pl
      JOIN "Transaction" t ON t.id = pl."transactionId"
      WHERE t.type != 'reversal'
    `
  );

  await timeQuery('#13 recentLedgerRows (30-day chart)', () =>
    prisma.$queryRaw`
      SELECT
        TO_CHAR(DATE_TRUNC('day', pl."createdAt"), 'YYYY-MM-DD') AS "date",
        COALESCE(SUM(CASE WHEN pl."pointsChange" > 0 THEN pl."pointsChange" ELSE 0 END), 0)::int AS "issued",
        COALESCE(SUM(CASE WHEN pl."pointsChange" < 0 THEN ABS(pl."pointsChange") ELSE 0 END), 0)::int AS "redeemed"
      FROM "PointsLedger" pl
      JOIN "Transaction" t ON t.id = pl."transactionId"
      WHERE pl."createdAt" >= ${thirtyDaysAgo} AND t.status = 'completed'
      GROUP BY DATE_TRUNC('day', pl."createdAt")
      ORDER BY DATE_TRUNC('day', pl."createdAt") ASC
    `
  );

  await timeQuery('#14 topMerchantsData', () =>
    prisma.$queryRaw`
      SELECT m."businessName" AS name, COUNT(t.id)::int AS transactions
      FROM "Transaction" t
      JOIN "Merchant" m ON m.id = t."merchantId"
      GROUP BY m."businessName"
      ORDER BY transactions DESC
      LIMIT 7
    `
  );

  await timeQuery('#15 growthRows (customer growth)', () =>
    prisma.$queryRaw`
      SELECT TO_CHAR(DATE_TRUNC('day', "createdAt"), 'YYYY-MM-DD') AS "date", COUNT(*)::int AS "count"
      FROM "Customer"
      GROUP BY DATE_TRUNC('day', "createdAt")
      ORDER BY DATE_TRUNC('day', "createdAt") ASC
    `
  );

  await timeQuery('#16 customer.groupBy(city)', () =>
    prisma.customer.groupBy({
      by: ['city'],
      _count: { id: true },
      where: { city: { not: null } }
    })
  );

  await timeQuery('#17 customer.groupBy(gender)', () =>
    prisma.customer.groupBy({
      by: ['gender'],
      _count: { id: true },
      where: { gender: { not: null } }
    })
  );

  await timeQuery('#18 ageGroupRows', () =>
    prisma.$queryRaw`
      SELECT
        CASE
          WHEN EXTRACT(YEAR FROM AGE(NOW(), "dateOfBirth")) BETWEEN 18 AND 25 THEN '18-25'
          WHEN EXTRACT(YEAR FROM AGE(NOW(), "dateOfBirth")) BETWEEN 26 AND 35 THEN '26-35'
          WHEN EXTRACT(YEAR FROM AGE(NOW(), "dateOfBirth")) BETWEEN 36 AND 45 THEN '36-45'
          WHEN EXTRACT(YEAR FROM AGE(NOW(), "dateOfBirth")) >= 46 THEN '45+'
        END AS "group",
        COUNT(*)::int AS "count"
      FROM "Customer"
      WHERE "dateOfBirth" IS NOT NULL
        AND EXTRACT(YEAR FROM AGE(NOW(), "dateOfBirth")) >= 18
      GROUP BY "group"
    `
  );

  await timeQuery('#19 customer.groupBy(communicationPref)', () =>
    prisma.customer.groupBy({
      by: ['communicationPref'],
      _count: { id: true }
    })
  );

  await timeQuery('#20 customer.count() [opt-in total]', () =>
    prisma.customer.count()
  );

  await timeQuery('#21 customer.count(notificationOptIn)', () =>
    prisma.customer.count({ where: { notificationOptIn: true } })
  );

  await timeQuery('#22 topCategoriesRows', () =>
    prisma.$queryRaw`
      SELECT category, COUNT(*)::int AS count
      FROM "Customer",
      jsonb_array_elements_text(
        CASE 
          WHEN "favouriteCategories" IS NOT NULL AND "favouriteCategories" LIKE '[%' THEN "favouriteCategories"::jsonb
          ELSE '[]'::jsonb
        END
      ) AS category
      GROUP BY category
      ORDER BY count DESC
      LIMIT 5
    `
  );

  await timeQuery('#23 allCustomersForAlerts', () =>
    prisma.$queryRaw`
      SELECT id, name, "dateOfBirth", "anniversaryDate"
      FROM "Customer"
      WHERE 
        ("dateOfBirth" IS NOT NULL AND EXTRACT(MONTH FROM "dateOfBirth") IN (${upcomingMonth1}, ${upcomingMonth2}))
        OR
        ("anniversaryDate" IS NOT NULL AND EXTRACT(MONTH FROM "anniversaryDate") IN (${upcomingMonth1}, ${upcomingMonth2}))
    `
  );

  await timeQuery('#24 transaction.count(thisMonth)', () =>
    prisma.transaction.count({
      where: { status: 'completed', createdAt: { gte: firstDayThisMonth } }
    })
  );

  await timeQuery('#25 transaction.count(lastMonth)', () =>
    prisma.transaction.count({
      where: { status: 'completed', createdAt: { gte: firstDayLastMonth, lte: lastDayLastMonth } }
    })
  );

  // ── Results ──
  console.log('\n=== RESULTS ===\n');
  console.log('Query                                           | Time (ms) | Status');
  console.log('------------------------------------------------|-----------|--------');

  let totalMs = 0;
  for (const r of results) {
    totalMs += parseFloat(r.ms);
    const pad = (s, n) => s.padEnd(n);
    console.log(`${pad(r.name, 47)} | ${pad(r.ms, 9)} | ${r.status}`);
  }

  console.log('------------------------------------------------|-----------|--------');
  console.log(`${'TOTAL (sequential)'.padEnd(47)} | ${totalMs.toFixed(1).padEnd(9)} |`);
  console.log(`\nTotal queries: ${results.length}`);
  console.log(`Total time: ${totalMs.toFixed(1)}ms (${(totalMs / 1000).toFixed(2)}s)`);

  // ── Identify slowest queries ──
  const sorted = [...results].sort((a, b) => parseFloat(b.ms) - parseFloat(a.ms));
  console.log('\n=== TOP 5 SLOWEST QUERIES ===\n');
  for (let i = 0; i < Math.min(5, sorted.length); i++) {
    const pct = ((parseFloat(sorted[i].ms) / totalMs) * 100).toFixed(1);
    console.log(`  ${i + 1}. ${sorted[i].name}: ${sorted[i].ms}ms (${pct}% of total)`);
  }

  // ── Table sizes ──
  console.log('\n=== TABLE SIZES ===\n');
  const tableSizes = await prisma.$queryRaw`
    SELECT 
      relname AS "table",
      n_live_tup AS "rows"
    FROM pg_stat_user_tables
    WHERE schemaname = 'public'
    ORDER BY n_live_tup DESC
  `;
  for (const t of tableSizes) {
    console.log(`  ${t.table}: ${Number(t.rows).toLocaleString()} rows`);
  }

  await prisma.$disconnect();
}

main().catch(err => { console.error(err); process.exit(1); });

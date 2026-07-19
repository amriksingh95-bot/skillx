const prisma = require('../lib/prisma');
const bcrypt = require('bcrypt');
const ExcelJS = require('exceljs');
const { v4: uuidv4 } = require('uuid');
const { getCustomerBalance, processReversal } = require('../services/pointsService');
const { createAuditLog } = require('../services/auditLogService');
const { GRACE_PERIOD_DAYS, getBonusForPosition } = require('../services/subscriptionService');
const { processReferralOnFirstPayment, processReferralOnRenewal } = require('../services/merchantReferralService');

// ── In-memory cache for AdminDashboard (shared, single-entry) ──
const DASHBOARD_CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes
let dashboardCache = { data: null, timestamp: 0 };

/**
 * Helper to format date to YYYY-MM-DD
 */
function formatDate(date) {
  return date.toISOString().split('T')[0];
}

/**
 * Admin Dashboard statistics and chart data.
 */
async function getDashboard(req, res, next) {
  // ── Cache check ──
  const now = Date.now();
  if (dashboardCache.data && (now - dashboardCache.timestamp) < DASHBOARD_CACHE_TTL_MS) {
    return res.status(200).json(dashboardCache.data);
  }

  try {
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

    // Helper for countdown
    function getDaysUntil(dateVal) {
      const targetDate = new Date(dateVal);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const currentYear = today.getFullYear();
      let nextOccur = new Date(currentYear, targetDate.getMonth(), targetDate.getDate());
      nextOccur.setHours(0, 0, 0, 0);
      if (nextOccur < today) {
        nextOccur.setFullYear(currentYear + 1);
      }
      const diffTime = nextOccur.getTime() - today.getTime();
      return Math.round(diffTime / (1000 * 60 * 60 * 24));
    }

    // ── Hop 1: All independent queries in parallel (11 queries) ──
    const [
      // Counts
      totalCustomers,
      activeCustomers,
      totalMerchants,
      activeMerchants,
      optInCount,
      // Aggregations
      ledgerAgg,
      txAgg,
      feeRevenueAgg,
      topUpRevenueAgg,
      adPaymentRevenueAgg,
      // Settings (no dependency on counts/aggs)
      settings
    ] = await Promise.all([
      prisma.customer.count(),
      prisma.customer.count({ where: { isActive: true } }),
      prisma.merchant.count(),
      prisma.merchant.count({ where: { isActive: true } }),
      prisma.customer.count({ where: { notificationOptIn: true } }),
      // Merged ledgerAgg: all-time + this/last month points in one query
      prisma.$queryRaw`
        SELECT
          COALESCE(SUM(CASE WHEN pl."pointsChange" > 0 AND t.status = 'completed' THEN pl."pointsChange" ELSE 0 END), 0)::int AS "pointsIssued",
          COALESCE(SUM(CASE WHEN pl."pointsChange" < 0 AND t.status = 'completed' THEN ABS(pl."pointsChange") ELSE 0 END), 0)::int AS "pointsRedeemed",
          COALESCE(SUM(CASE WHEN pl."pointsChange" > 0 AND t.status = 'completed' AND pl."createdAt" >= ${firstDayThisMonth} THEN pl."pointsChange" ELSE 0 END), 0)::int AS "pointsIssuedThisMonth",
          COALESCE(SUM(CASE WHEN pl."pointsChange" > 0 AND t.status = 'completed' AND pl."createdAt" >= ${firstDayLastMonth} AND pl."createdAt" <= ${lastDayLastMonth} THEN pl."pointsChange" ELSE 0 END), 0)::int AS "pointsIssuedLastMonth",
          COALESCE(SUM(CASE WHEN pl."pointsChange" < 0 AND t.status = 'completed' AND pl."createdAt" >= ${firstDayThisMonth} THEN ABS(pl."pointsChange") ELSE 0 END), 0)::int AS "pointsRedeemedThisMonth",
          COALESCE(SUM(CASE WHEN pl."pointsChange" < 0 AND t.status = 'completed' AND pl."createdAt" >= ${firstDayLastMonth} AND pl."createdAt" <= ${lastDayLastMonth} THEN ABS(pl."pointsChange") ELSE 0 END), 0)::int AS "pointsRedeemedLastMonth"
        FROM "PointsLedger" pl
        JOIN "Transaction" t ON t.id = pl."transactionId"
        WHERE t.type != 'reversal'
      `,
      // Merged txAgg: total + this/last month transaction counts in one query
      prisma.$queryRaw`
        SELECT
          COUNT(*)::int AS "totalTransactions",
          COALESCE(SUM(CASE WHEN "createdAt" >= ${firstDayThisMonth} THEN 1 ELSE 0 END), 0)::int AS "transactionsThisMonth",
          COALESCE(SUM(CASE WHEN "createdAt" >= ${firstDayLastMonth} AND "createdAt" <= ${lastDayLastMonth} THEN 1 ELSE 0 END), 0)::int AS "transactionsLastMonth"
        FROM "Transaction"
        WHERE status = 'completed'
      `,
      prisma.$queryRaw`
        SELECT
          COALESCE(SUM(CASE WHEN t.type = 'redeem' AND t.status = 'completed' AND t."reversedById" IS NULL THEN t."platformFee" ELSE 0 END), 0)::numeric AS "totalFeeRevenue",
          COALESCE(SUM(CASE WHEN t.type = 'redeem' AND t.status = 'completed' AND t."reversedById" IS NULL AND t."createdAt" >= ${firstDayThisMonth} THEN t."platformFee" ELSE 0 END), 0)::numeric AS "feeRevenueThisMonth",
          COALESCE(SUM(CASE WHEN t.type = 'redeem' AND t.status = 'completed' AND t."reversedById" IS NULL AND t."createdAt" >= ${firstDayLastMonth} AND t."createdAt" <= ${lastDayLastMonth} THEN t."platformFee" ELSE 0 END), 0)::numeric AS "feeRevenueLastMonth"
        FROM "Transaction" t
      `,
      prisma.$queryRaw`
        SELECT
          COALESCE(SUM(CASE WHEN status = 'confirmed' THEN "amountPaid" ELSE 0 END), 0)::numeric AS "totalTopUpRevenue",
          COALESCE(SUM(CASE WHEN status = 'confirmed' AND "createdAt" >= ${firstDayThisMonth} THEN "amountPaid" ELSE 0 END), 0)::numeric AS "topUpRevenueThisMonth",
          COALESCE(SUM(CASE WHEN status = 'confirmed' AND "createdAt" >= ${firstDayLastMonth} AND "createdAt" <= ${lastDayLastMonth} THEN "amountPaid" ELSE 0 END), 0)::numeric AS "topUpRevenueLastMonth"
        FROM "PointsTopUp"
      `,
      prisma.$queryRaw`
        SELECT
          COALESCE(SUM(CASE WHEN status = 'confirmed' THEN "amountPaid" ELSE 0 END), 0)::numeric AS "totalAdPaymentRevenue",
          COALESCE(SUM(CASE WHEN status = 'confirmed' AND "createdAt" >= ${firstDayThisMonth} THEN "amountPaid" ELSE 0 END), 0)::numeric AS "adPaymentRevenueThisMonth",
          COALESCE(SUM(CASE WHEN status = 'confirmed' AND "createdAt" >= ${firstDayLastMonth} AND "createdAt" <= ${lastDayLastMonth} THEN "amountPaid" ELSE 0 END), 0)::numeric AS "adPaymentRevenueLastMonth"
        FROM "AdPayment"
      `,
      prisma.rewardSettings.findFirst({ orderBy: { updatedAt: 'desc' } })
    ]);

    // Extract merged results
    const pointsIssued = Number(ledgerAgg[0]?.pointsIssued || 0);
    const pointsRedeemed = Number(ledgerAgg[0]?.pointsRedeemed || 0);
    const pointsIssuedThisMonth = Number(ledgerAgg[0]?.pointsIssuedThisMonth || 0);
    const pointsIssuedLastMonth = Number(ledgerAgg[0]?.pointsIssuedLastMonth || 0);
    const pointsRedeemedThisMonth = Number(ledgerAgg[0]?.pointsRedeemedThisMonth || 0);
    const pointsRedeemedLastMonth = Number(ledgerAgg[0]?.pointsRedeemedLastMonth || 0);

    const totalTransactions = Number(txAgg[0]?.totalTransactions || 0);
    const transactionsThisMonth = Number(txAgg[0]?.transactionsThisMonth || 0);
    const transactionsLastMonth = Number(txAgg[0]?.transactionsLastMonth || 0);

    const totalFeeRevenue = parseFloat(feeRevenueAgg[0]?.totalFeeRevenue || 0);
    const feeRevenueThisMonth = parseFloat(feeRevenueAgg[0]?.feeRevenueThisMonth || 0);
    const feeRevenueLastMonth = parseFloat(feeRevenueAgg[0]?.feeRevenueLastMonth || 0);

    const totalTopUpRevenue = parseFloat(topUpRevenueAgg[0]?.totalTopUpRevenue || 0);
    const topUpRevenueThisMonth = parseFloat(topUpRevenueAgg[0]?.topUpRevenueThisMonth || 0);
    const topUpRevenueLastMonth = parseFloat(topUpRevenueAgg[0]?.topUpRevenueLastMonth || 0);

    const totalAdPaymentRevenue = parseFloat(adPaymentRevenueAgg[0]?.totalAdPaymentRevenue || 0);
    const adPaymentRevenueThisMonth = parseFloat(adPaymentRevenueAgg[0]?.adPaymentRevenueThisMonth || 0);
    const adPaymentRevenueLastMonth = parseFloat(adPaymentRevenueAgg[0]?.adPaymentRevenueLastMonth || 0);

    // Settings (from Hop 1)
    const rupeesPerPoint = settings ? parseFloat(settings.rupeesPerPoint) : 0.10;
    const outstandingPoints = pointsIssued - pointsRedeemed;
    const liability = outstandingPoints * rupeesPerPoint;

    // ── Hop 2: Charts + Customer intelligence (9 parallel queries) ──
    const [
      // Charts
      recentLedgerRows,
      topMerchantsData,
      growthRows,
      // Customer intelligence
      customersByCityGroup,
      genderGroup,
      ageGroupRows,
      commGroup,
      topCategoriesRows,
      allCustomersForAlerts
    ] = await Promise.all([
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
      `,
      prisma.$queryRaw`
        SELECT m."businessName" AS name, COUNT(t.id)::int AS transactions
        FROM "Transaction" t
        JOIN "Merchant" m ON m.id = t."merchantId"
        GROUP BY m."businessName"
        ORDER BY transactions DESC
        LIMIT 7
      `,
      prisma.$queryRaw`
        SELECT TO_CHAR(DATE_TRUNC('day', "createdAt"), 'YYYY-MM-DD') AS "date", COUNT(*)::int AS "count"
        FROM "Customer"
        GROUP BY DATE_TRUNC('day', "createdAt")
        ORDER BY DATE_TRUNC('day', "createdAt") ASC
      `,
      prisma.customer.groupBy({
        by: ['city'],
        _count: { id: true },
        where: { city: { not: null } }
      }),
      prisma.customer.groupBy({
        by: ['gender'],
        _count: { id: true },
        where: { gender: { not: null } }
      }),
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
      `,
      prisma.customer.groupBy({
        by: ['communicationPref'],
        _count: { id: true }
      }),
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
      `,
      prisma.$queryRaw`
        SELECT id, name, "dateOfBirth", "anniversaryDate"
        FROM "Customer"
        WHERE 
          ("dateOfBirth" IS NOT NULL AND EXTRACT(MONTH FROM "dateOfBirth") IN (${upcomingMonth1}, ${upcomingMonth2}))
          OR
          ("anniversaryDate" IS NOT NULL AND EXTRACT(MONTH FROM "anniversaryDate") IN (${upcomingMonth1}, ${upcomingMonth2}))
      `
    ]);

    // Pre-populate last 30 days with zeros, then overlay actual data
    const dailyPoints = {};
    for (let i = 29; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      dailyPoints[formatDate(d)] = { issued: 0, redeemed: 0 };
    }
    recentLedgerRows.forEach(row => {
      if (dailyPoints[row.date]) {
        dailyPoints[row.date].issued = Number(row.issued);
        dailyPoints[row.date].redeemed = Number(row.redeemed);
      }
    });
    const chartPointsIssuedVsRedeemed = Object.keys(dailyPoints).map(date => ({
      date,
      issued: dailyPoints[date].issued,
      redeemed: dailyPoints[date].redeemed
    }));

    const chartCustomerGrowth = [];
    let cumulativeCount = 0;
    growthRows.forEach(row => {
      cumulativeCount += Number(row.count);
      chartCustomerGrowth.push({ date: row.date, count: cumulativeCount });
    });
    if (chartCustomerGrowth.length === 0) {
      chartCustomerGrowth.push({ date: formatDate(new Date()), count: 0 });
    }

    const totalCustomersByCity = customersByCityGroup.map(g => ({ city: g.city, count: g._count.id }));
    const genderDistribution = genderGroup.map(g => ({ gender: g.gender, count: g._count.id }));
    const communicationPrefBreakdown = commGroup.map(g => ({ preference: g.communicationPref || 'email', count: g._count.id }));
    const topCategories = topCategoriesRows.map(r => ({ category: r.category, count: r.count }));
    const notificationOptInRate = totalCustomers > 0 ? parseFloat(((optInCount / totalCustomers) * 100).toFixed(1)) : 100;

    const ageGroupMap = { '18-25': 0, '26-35': 0, '36-45': 0, '45+': 0 };
    ageGroupRows.forEach(r => { if (ageGroupMap[r.group] !== undefined) ageGroupMap[r.group] = Number(r.count); });
    const ageGroupDistribution = Object.keys(ageGroupMap).map(group => ({ group, count: ageGroupMap[group] }));

    const birthdayAlerts = [];
    const anniversaryAlerts = [];
    allCustomersForAlerts.forEach(c => {
      if (c.dateOfBirth) {
        const days = getDaysUntil(c.dateOfBirth);
        if (days >= 0 && days <= 7) {
          birthdayAlerts.push({ id: c.id, name: c.name, dateOfBirth: c.dateOfBirth, daysLeft: days });
        }
      }
      if (c.anniversaryDate) {
        const days = getDaysUntil(c.anniversaryDate);
        if (days >= 0 && days <= 7) {
          anniversaryAlerts.push({ id: c.id, name: c.name, anniversaryDate: c.anniversaryDate, daysLeft: days });
        }
      }
    });
    birthdayAlerts.sort((a, b) => a.daysLeft - b.daysLeft);
    anniversaryAlerts.sort((a, b) => a.daysLeft - b.daysLeft);

    // ── Decline Alerts (computed from already-fetched data) ──
    const feeRevenueChange = feeRevenueLastMonth > 0
      ? ((feeRevenueThisMonth - feeRevenueLastMonth) / feeRevenueLastMonth) * 100
      : 0;
    const txVolumeChange = transactionsLastMonth > 0
      ? ((transactionsThisMonth - transactionsLastMonth) / transactionsLastMonth) * 100
      : 0;

    const declineAlerts = [];
    if (txVolumeChange < -10) {
      declineAlerts.push({
        type: 'transaction_volume',
        severity: txVolumeChange < -25 ? 'critical' : 'warning',
        message: `Transaction volume declined ${Math.abs(txVolumeChange).toFixed(1)}% vs last month`,
        thisMonth: transactionsThisMonth,
        lastMonth: transactionsLastMonth,
        change: parseFloat(txVolumeChange.toFixed(1))
      });
    }
    if (feeRevenueChange < -10) {
      declineAlerts.push({
        type: 'revenue',
        severity: feeRevenueChange < -25 ? 'critical' : 'warning',
        message: `Platform fee revenue declined ${Math.abs(feeRevenueChange).toFixed(1)}% vs last month`,
        thisMonth: parseFloat(feeRevenueThisMonth.toFixed(2)),
        lastMonth: parseFloat(feeRevenueLastMonth.toFixed(2)),
        change: parseFloat(feeRevenueChange.toFixed(1))
      });
    }

    const responsePayload = {
      success: true,
      message: 'Dashboard metrics successfully loaded.',
      data: {
        cards: {
          totalCustomers,
          activeCustomers,
          totalMerchants,
          activeMerchants,
          totalTransactions,
          transactionsThisMonth,
          transactionsLastMonth,
          pointsIssued,
          pointsIssuedThisMonth,
          pointsIssuedLastMonth,
          pointsRedeemed,
          pointsRedeemedThisMonth,
          pointsRedeemedLastMonth,
          liability: parseFloat(liability.toFixed(2)),
          totalFeeRevenue: parseFloat(totalFeeRevenue.toFixed(2)),
          feeRevenueThisMonth: parseFloat(feeRevenueThisMonth.toFixed(2)),
          feeRevenueLastMonth: parseFloat(feeRevenueLastMonth.toFixed(2)),
          totalTopUpRevenue: parseFloat(totalTopUpRevenue.toFixed(2)),
          topUpRevenueThisMonth: parseFloat(topUpRevenueThisMonth.toFixed(2)),
          topUpRevenueLastMonth: parseFloat(topUpRevenueLastMonth.toFixed(2)),
          totalAdPaymentRevenue: parseFloat(totalAdPaymentRevenue.toFixed(2)),
          adPaymentRevenueThisMonth: parseFloat(adPaymentRevenueThisMonth.toFixed(2)),
          adPaymentRevenueLastMonth: parseFloat(adPaymentRevenueLastMonth.toFixed(2))
        },
        charts: {
          pointsIssuedVsRedeemed: chartPointsIssuedVsRedeemed,
          topMerchants: topMerchantsData,
          customerGrowth: chartCustomerGrowth
        },
        customerIntelligence: {
          totalCustomersByCity,
          genderDistribution,
          ageGroupDistribution,
          communicationPrefBreakdown,
          notificationOptInRate,
          topCategories,
          birthdayAlerts,
          anniversaryAlerts
        },
        declineAlerts
      }
    };

    // Store in cache and send
    dashboardCache = { data: responsePayload, timestamp: Date.now() };
    res.status(200).json(responsePayload);
  } catch (error) {
    next(error);
  }
}

/**
 * List all merchants (paginated + search).
 */
async function getMerchants(req, res, next) {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 20;
  const search = req.query.search || '';

  const skip = (page - 1) * limit;

  try {
    const whereCondition = search ? {
      OR: [
        { businessName: { contains: search, mode: 'insensitive' } },
        { ownerName: { contains: search, mode: 'insensitive' } },
        { user: { mobile: { contains: search, mode: 'insensitive' } } },
        { category: { equals: search.toLowerCase() } } // Exact Category search if matches
      ]
    } : {};

    // Check if category matches enum, otherwise avoid Category field crash
    const categories = ['grocery', 'medical', 'doctor', 'cafe', 'electronics', 'fashion', 'other'];
    if (search && !categories.includes(search.toLowerCase())) {
      // If search query is not a valid category, remove Category exact filter from OR conditions
      whereCondition.OR = whereCondition.OR.filter(cond => !cond.category);
    }

    const [merchants, total] = await prisma.$transaction([
      prisma.merchant.findMany({
        where: whereCondition,
        include: {
          user: {
            select: {
              id: true,
              email: true,
              mobile: true,
              role: true,
              isActive: true,
              createdAt: true
            }
          }
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit
      }),
      prisma.merchant.count({ where: whereCondition })
    ]);

    // Fetch admin names for statusChangedBy
    const adminIds = [...new Set(merchants.map(m => m.statusChangedBy).filter(Boolean))];
    const admins = adminIds.length > 0 ? await prisma.user.findMany({
      where: { id: { in: adminIds } },
      select: { id: true, name: true, email: true }
    }) : [];
    const adminMap = new Map(admins.map(a => [a.id, a]));

    // Attach admin info to merchants
    const merchantsWithAdminInfo = merchants.map(m => ({
      ...m,
      statusChangedByUser: m.statusChangedBy ? adminMap.get(m.statusChangedBy) || null : null
    }));

    res.status(200).json({
      success: true,
      message: 'Merchants retrieved successfully.',
      data: {
        merchants: merchantsWithAdminInfo,
        pagination: {
          total,
          page,
          limit,
          totalPages: Math.ceil(total / limit)
        }
      }
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Get count of pending merchants.
 */
async function getPendingMerchantCount(req, res, next) {
  try {
    const count = await prisma.merchant.count({ where: { status: 'pending' } });

    res.status(200).json({
      success: true,
      message: 'Pending merchant count retrieved successfully.',
      data: { count }
    });
  } catch (error) {
    next(error);
  }
}

async function getPendingAdCount(req, res, next) {
  try {
    const count = await prisma.advertisement.count({ where: { status: 'pending' } });

    res.status(200).json({
      success: true,
      message: 'Pending ad count retrieved successfully.',
      data: { count }
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Create a new Merchant.
 */
async function createMerchant(req, res, next) {
  const { businessName, ownerName, mobile, email, address, category, password } = req.body;
  const ipAddress = req.ip;

  try {
    if (!password) {
      const err = new Error('Password is required.');
      err.status = 400;
      err.code = 'VALIDATION_ERROR';
      return next(err);
    }

    const existingUser = await prisma.user.findFirst({
      where: { mobile }
    });
    if (existingUser) {
      const err = new Error('Mobile number already registered.');
      err.status = 400;
      err.code = 'DUPLICATE_MOBILE';
      return next(err);
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const result = await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          email: email || null,
          mobile,
          password: passwordHash,
          role: 'merchant'
        }
      });

      // Generate unique merchant onboarding code
      const namePart = (businessName || '').replace(/[^a-zA-Z]/g, '').padEnd(4, 'X').substring(0, 4).toUpperCase();
      let merchantCodeGenerated = '';
      let isUnique = false;
      let attempts = 0;
      while (!isUnique && attempts < 10) {
        const digitsPart = Math.floor(1000 + Math.random() * 9000).toString();
        merchantCodeGenerated = `SKXT${namePart}${digitsPart}`;
        const existing = await tx.merchant.findUnique({
          where: { merchantCode: merchantCodeGenerated }
        });
        if (!existing) {
          isUnique = true;
        }
        attempts++;
      }

      // Generate unique referral code
      let merchantReferralCodeGenerated = '';
      let referralUnique = false;
      let referralAttempts = 0;
      while (!referralUnique && referralAttempts < 10) {
        const suffix = Math.random().toString(36).substring(2, 8).toUpperCase();
        merchantReferralCodeGenerated = `REF${suffix}`;
        const existingRef = await tx.merchant.findUnique({ where: { merchantReferralCode: merchantReferralCodeGenerated } });
        if (!existingRef) {
          referralUnique = true;
        }
        referralAttempts++;
      }

      const merchant = await tx.merchant.create({
        data: {
          userId: user.id,
          businessName,
          ownerName,
          email: email || null,
          address: address || null,
          category,
          merchantCode: merchantCodeGenerated,
          merchantReferralCode: merchantReferralCodeGenerated
        },
        include: {
          user: {
            select: {
              id: true,
              email: true,
              mobile: true,
              role: true,
              isActive: true,
              createdAt: true
            }
          }
        }
      });

      return merchant;
    });

    await createAuditLog(req.user.id, 'MERCHANT_CREATED', 'Merchant', result.id, { businessName }, ipAddress);

    res.status(201).json({
      success: true,
      message: 'Merchant created successfully.',
      data: result
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Edit an existing Merchant.
 */
async function updateMerchant(req, res, next) {
  const { id } = req.params;
  const { businessName, ownerName, mobile, email, address, category } = req.body;
  const ipAddress = req.ip;

  try {
    const merchant = await prisma.merchant.findUnique({
      where: { id },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            mobile: true,
            role: true,
            isActive: true,
            createdAt: true
          }
        }
      }
    });
    if (!merchant) {
      const err = new Error('Merchant not found.');
      err.status = 404;
      err.code = 'NOT_FOUND';
      return next(err);
    }

    // Check if mobile changed and if new mobile is unique
    if (mobile !== merchant.user.mobile) {
      const existingUser = await prisma.user.findFirst({
        where: { mobile, id: { not: merchant.userId } }
      });
      if (existingUser) {
        const err = new Error('Mobile number already in use by another account.');
        err.status = 400;
        err.code = 'DUPLICATE_MOBILE';
        return next(err);
      }
    }

    const updated = await prisma.$transaction(async (tx) => {
      // Update User details
      await tx.user.update({
        where: { id: merchant.userId },
        data: {
          mobile,
          email: email || null
        }
      });

      // Update Merchant details
      const m = await tx.merchant.update({
        where: { id },
        data: {
          businessName,
          ownerName,
          email: email || null,
          address: address || null,
          category
        },
        include: {
          user: {
            select: {
              id: true,
              email: true,
              mobile: true,
              role: true,
              isActive: true,
              createdAt: true
            }
          }
        }
      });

      return m;
    });

    await createAuditLog(req.user.id, 'MERCHANT_UPDATED', 'Merchant', id, { businessName }, ipAddress);

    res.status(200).json({
      success: true,
      message: 'Merchant profile updated.',
      data: updated
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Toggle Merchant active state.
 */
/**
 * Set Merchant status (suspend, deactivate, reactivate).
 */
async function setMerchantStatus(req, res, next) {
  const { id } = req.params;
  const { action } = req.body;
  const ipAddress = req.ip;

  if (!['suspend', 'deactivate', 'reactivate'].includes(action)) {
    const err = new Error('Invalid action. Must be suspend, deactivate, or reactivate.');
    err.status = 400;
    err.code = 'BAD_REQUEST';
    return next(err);
  }

  if (action === 'deactivate' && req.body.confirmed !== true) {
    const err = new Error('Explicit confirmation is required to permanently deactivate a merchant.');
    err.status = 400;
    err.code = 'CONFIRMATION_REQUIRED';
    return next(err);
  }

  try {
    const merchant = await prisma.merchant.findUnique({
      where: { id },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            mobile: true,
            role: true,
            isActive: true,
            createdAt: true
          }
        }
      }
    });

    if (!merchant) {
      const err = new Error('Merchant not found.');
      err.status = 404;
      err.code = 'NOT_FOUND';
      return next(err);
    }

    // Rules: deactivated merchants cannot be reactivated — return 403
    if (merchant.status === 'deactivated' && action === 'reactivate') {
      const err = new Error('Deactivated merchants cannot be reactivated.');
      err.status = 403;
      err.code = 'FORBIDDEN';
      return next(err);
    }

    let targetStatus;
    let targetIsActive;
    if (action === 'suspend') {
      targetStatus = 'suspended';
      targetIsActive = false;
    } else if (action === 'deactivate') {
      targetStatus = 'deactivated';
      targetIsActive = false;
    } else if (action === 'reactivate') {
      targetStatus = 'active';
      targetIsActive = true;
    }

    const updatedMerchant = await prisma.$transaction(async (tx) => {
      const m = await tx.merchant.update({
        where: { id },
        data: {
          status: targetStatus,
          isActive: targetIsActive,
          statusChangedAt: new Date(),
          statusChangedBy: req.user.id
        }
      });

      await tx.user.update({
        where: { id: merchant.userId },
        data: {
          isActive: targetIsActive
        }
      });

      await tx.refreshToken.updateMany({
        where: { userId: merchant.userId },
        data: {
          isRevoked: true
        }
      });

      return m;
    });

    let auditAction;
    if (action === 'suspend') {
      auditAction = 'MERCHANT_SUSPENDED';
    } else if (action === 'deactivate') {
      auditAction = 'Permanent Merchant Deactivation';
    } else {
      auditAction = 'MERCHANT_ACTIVATED';
    }

    await createAuditLog(
      req.user.id,
      auditAction,
      'Merchant',
      id,
      { action, status: targetStatus },
      ipAddress
    );

    res.status(200).json({
      success: true,
      message: `Merchant status updated to ${targetStatus}.`,
      data: {
        id: updatedMerchant.id,
        status: updatedMerchant.status,
        isActive: updatedMerchant.isActive,
        statusChangedAt: updatedMerchant.statusChangedAt,
        statusChangedByName: req.user.name || req.user.email || 'Admin'
      }
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Reset Merchant Password.
 */
async function resetMerchantPassword(req, res, next) {
  const { id } = req.params;
  const { newPassword } = req.body;
  const ipAddress = req.ip;

  try {
    const merchant = await prisma.merchant.findUnique({ where: { id } });
    if (!merchant) {
      const err = new Error('Merchant not found.');
      err.status = 404;
      err.code = 'NOT_FOUND';
      return next(err);
    }

    const passwordHash = await bcrypt.hash(newPassword, 10);

    await prisma.user.update({
      where: { id: merchant.userId },
      data: { password: passwordHash }
    });

    // Clear user tokens
    await prisma.refreshToken.deleteMany({
      where: { userId: merchant.userId }
    });

    await createAuditLog(req.user.id, 'MERCHANT_PASSWORD_RESET', 'Merchant', id, {}, ipAddress);

    res.status(200).json({
      success: true,
      message: 'Merchant password has been reset successfully.'
    });
  } catch (error) {
    next(error);
  }
}

/**
 * List all customers (paginated + search) with balances.
 */
async function getCustomers(req, res, next) {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 20;
  const search = req.query.search || '';

  const skip = (page - 1) * limit;

  try {
    const whereCondition = search ? {
      OR: [
        { name: { contains: search, mode: 'insensitive' } },
        { user: { mobile: { contains: search, mode: 'insensitive' } } }
      ]
    } : {};

    const [customersList, total] = await prisma.$transaction([
      prisma.customer.findMany({
        where: whereCondition,
        include: {
          user: {
            select: {
              id: true,
              email: true,
              mobile: true,
              role: true,
              isActive: true,
              createdAt: true
            }
          }
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit
      }),
      prisma.customer.count({ where: whereCondition })
    ]);

    // Batch-fetch balances, last visits, LTV, and visit counts using SQL (avoids N+1)
    const customerIds = customersList.map(c => c.id);
    const placeholders = customerIds.map((_, i) => `$${i + 1}`).join(', ');
    const [balanceRows, lastTxRows, ltvRows, visitRows] = customerIds.length > 0 ? await prisma.$transaction([
      // Balances: sum of non-expired ledger entries
      prisma.$queryRawUnsafe(`
        SELECT "customerId",
          COALESCE(SUM(CASE WHEN "expiresAt" IS NULL OR "expiresAt" > NOW() THEN "pointsChange" ELSE 0 END), 0)::int AS balance
        FROM "PointsLedger"
        WHERE "customerId" IN (${placeholders})
        GROUP BY "customerId"
      `, ...customerIds),
      // Last visit
      prisma.$queryRawUnsafe(`
        SELECT DISTINCT ON ("customerId") "customerId", "createdAt" AS "lastVisit"
        FROM "Transaction"
        WHERE "customerId" IN (${placeholders})
          AND status = 'completed'
        ORDER BY "customerId", "createdAt" DESC
      `, ...customerIds),
      // LTV (lifetime purchase amount from earn transactions)
      prisma.$queryRawUnsafe(`
        SELECT "customerId",
          COALESCE(SUM(COALESCE("purchaseAmount", 0)), 0)::numeric AS "lifetimeValue"
        FROM "Transaction"
        WHERE "customerId" IN (${placeholders})
          AND type IN ('earn', 'transfer') AND status = 'completed'
        GROUP BY "customerId"
      `, ...customerIds),
      // Visit count
      prisma.$queryRawUnsafe(`
        SELECT "customerId", COUNT(*)::int AS "visitCount"
        FROM "Transaction"
        WHERE "customerId" IN (${placeholders})
          AND status = 'completed' AND type != 'reversal'
        GROUP BY "customerId"
      `, ...customerIds)
    ]) : [[], [], [], []];

    const balanceMap = new Map(balanceRows.map(r => [r.customerId, Number(r.balance)]));
    const lastTxMap = new Map(lastTxRows.map(r => [r.customerId, r.lastVisit]));
    const ltvMap = new Map(ltvRows.map(r => [r.customerId, parseFloat(parseFloat(r.lifetimeValue).toFixed(2))]));
    const visitMap = new Map(visitRows.map(r => [r.customerId, r.visitCount]));

    // Attach balances dynamically
    const customersWithBalances = customersList.map(c => ({
      id: c.id,
      name: c.name,
      email: c.email,
      qrCode: c.qrCode,
      isActive: c.isActive,
      createdAt: c.createdAt,
      balance: balanceMap.get(c.id) || 0,
      user: c.user,
      city: c.city,
      lastVisit: lastTxMap.get(c.id) || null,
      lifetimeValue: ltvMap.get(c.id) || 0,
      visitCount: visitMap.get(c.id) || 0
    }));

    res.status(200).json({
      success: true,
      message: 'Customers retrieved successfully.',
      data: {
        customers: customersWithBalances,
        pagination: {
          total,
          page,
          limit,
          totalPages: Math.ceil(total / limit)
        }
      }
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Get Customer Detail.
 */
async function getCustomerDetail(req, res, next) {
  const { id } = req.params;

  try {
    const customer = await prisma.customer.findUnique({
      where: { id },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            mobile: true,
            role: true,
            isActive: true,
            createdAt: true
          }
        }
      }
    });

    if (!customer) {
      const err = new Error('Customer not found.');
      err.status = 404;
      err.code = 'NOT_FOUND';
      return next(err);
    }

    const balance = await getCustomerBalance(customer.id);

    // Compute stats using SQL aggregates instead of loading all ledger entries
    const statsAgg = await prisma.$queryRaw`
      SELECT
        COALESCE(SUM(CASE WHEN "pointsChange" > 0 THEN "pointsChange" ELSE 0 END), 0)::int AS "totalEarned",
        COALESCE(SUM(CASE WHEN "pointsChange" < 0 THEN ABS("pointsChange") ELSE 0 END), 0)::int AS "totalRedeemed"
      FROM "PointsLedger"
      WHERE "customerId" = ${customer.id}
    `;
    const totalEarned = statsAgg[0]?.totalEarned || 0;
    const totalRedeemed = statsAgg[0]?.totalRedeemed || 0;

    // Calculate Customer Insights
    // 1. Visit Count (excludes reversals)
    const visitCount = await prisma.transaction.count({
      where: { customerId: customer.id, status: 'completed', type: { not: 'reversal' } }
    });

    // 2. Lifetime Value
    const ltvAggregate = await prisma.transaction.aggregate({
      where: { customerId: customer.id, type: { in: ['earn', 'transfer'] }, status: 'completed' },
      _sum: { purchaseAmount: true }
    });
    const lifetimeValue = ltvAggregate._sum.purchaseAmount ? parseFloat(ltvAggregate._sum.purchaseAmount) : 0;

    // 3. Last Visit Date & relative string
    const lastTx = await prisma.transaction.findFirst({
      where: { customerId: customer.id, status: 'completed' },
      orderBy: { createdAt: 'desc' },
      select: { createdAt: true }
    });
    const lastVisitDate = lastTx ? lastTx.createdAt : null;
    let lastVisitStr = 'Never';
    if (lastVisitDate) {
      const diffTime = Math.abs(new Date() - new Date(lastVisitDate));
      const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
      if (diffDays === 0) lastVisitStr = 'Today';
      else if (diffDays === 1) lastVisitStr = 'Yesterday';
      else lastVisitStr = `${diffDays} days ago`;
    }

    // 4. Avg Visit Frequency
    const memberDurationMonths = Math.max(1, Math.ceil((new Date() - new Date(customer.createdAt)) / (1000 * 60 * 60 * 24 * 30.4375)));
    const avgVisitFrequency = (visitCount / memberDurationMonths).toFixed(1) + 'x/month';

    // 5. Avg Spend per Visit
    const earnTxCount = await prisma.transaction.count({
      where: { customerId: customer.id, type: { in: ['earn', 'transfer'] }, status: 'completed' }
    });
    const avgSpendPerVisit = earnTxCount > 0 ? Math.round(lifetimeValue / earnTxCount) : 0;

    // 6. Favourite Merchant
    const merchantGroup = await prisma.transaction.groupBy({
      by: ['merchantId'],
      where: { customerId: customer.id, status: 'completed' },
      _count: { id: true },
      orderBy: { _count: { id: 'desc' } },
      take: 1
    });
    let favouriteMerchant = 'None';
    if (merchantGroup.length > 0) {
      const merchantObj = await prisma.merchant.findUnique({
        where: { id: merchantGroup[0].merchantId },
        select: { businessName: true }
      });
      if (merchantObj) {
        favouriteMerchant = merchantObj.businessName;
      }
    }

    // 7. Favourite Category
    const customerTxs = await prisma.transaction.findMany({
      where: { customerId: customer.id, status: 'completed' },
      include: { merchant: { select: { category: true } } }
    });
    const categoriesMap = {};
    customerTxs.forEach(tx => {
      if (tx.merchant && tx.merchant.category) {
        categoriesMap[tx.merchant.category] = (categoriesMap[tx.merchant.category] || 0) + 1;
      }
    });
    let favouriteCategory = 'None';
    let maxCount = 0;
    for (const [cat, count] of Object.entries(categoriesMap)) {
      if (count > maxCount) {
        maxCount = count;
        favouriteCategory = cat;
      }
    }
    if (favouriteCategory !== 'None') {
      favouriteCategory = favouriteCategory.charAt(0).toUpperCase() + favouriteCategory.slice(1);
    }

    // 8. Birthday & Anniversary Countdown
    const birthdayStr = getDaysUntilNextOccurrence(customer.dateOfBirth);
    const anniversaryStr = getDaysUntilNextOccurrence(customer.anniversaryDate);

    function getDaysUntilNextOccurrence(dateVal) {
      if (!dateVal) return null;
      const targetDate = new Date(dateVal);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const currentYear = today.getFullYear();
      let nextOccur = new Date(currentYear, targetDate.getMonth(), targetDate.getDate());
      nextOccur.setHours(0, 0, 0, 0);
      
      if (nextOccur < today) {
        nextOccur.setFullYear(currentYear + 1);
      }
      
      const diffTime = nextOccur.getTime() - today.getTime();
      const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));
      
      const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
      const monthName = monthNames[targetDate.getMonth()];
      const day = targetDate.getDate();
      
      if (diffDays === 0) {
        return `${day} ${monthName} (Today)`;
      } else {
        return `${day} ${monthName} (in ${diffDays} days)`;
      }
    }

    res.status(200).json({
      success: true,
      message: 'Customer detail retrieved.',
      data: {
        profile: {
          id: customer.id,
          name: customer.name,
          mobile: customer.user.mobile,
          email: customer.email,
          qrCode: customer.qrCode,
          isActive: customer.isActive,
          createdAt: customer.createdAt,
          dateOfBirth: customer.dateOfBirth,
          gender: customer.gender,
          city: customer.city,
          pinCode: customer.pinCode,
          area: customer.area,
          occupation: customer.occupation,
          maritalStatus: customer.maritalStatus,
          anniversaryDate: customer.anniversaryDate,
          numberOfChildren: customer.numberOfChildren,
          preferredLanguage: customer.preferredLanguage,
          communicationPref: customer.communicationPref,
          favouriteCategories: customer.favouriteCategories ? JSON.parse(customer.favouriteCategories) : [],
          dietaryPreference: customer.dietaryPreference,
          notificationOptIn: customer.notificationOptIn,
          referralCode: customer.referralCode,
          referredBy: customer.referredBy,
          profilePhoto: customer.profilePhoto,
          updatedAt: customer.updatedAt,
          balance,
          lifetimeEarned: totalEarned,
          lifetimeRedeemed: totalRedeemed,
          insights: {
            lifetimeValue,
            avgVisitFrequency,
            avgSpendPerVisit,
            favouriteMerchant,
            favouriteCategory,
            lastVisit: lastVisitStr,
            birthday: birthdayStr,
            anniversary: anniversaryStr
          }
        }
      }
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Toggle Customer active state.
 */
async function toggleCustomer(req, res, next) {
  const { id } = req.params;
  const ipAddress = req.ip;

  try {
    const customer = await prisma.customer.findUnique({
      where: { id },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            mobile: true,
            role: true,
            isActive: true,
            createdAt: true
          }
        }
      }
    });

    if (!customer) {
      const err = new Error('Customer not found.');
      err.status = 404;
      err.code = 'NOT_FOUND';
      return next(err);
    }

    const newStatus = !customer.isActive;

    await prisma.$transaction([
      prisma.customer.update({
        where: { id },
        data: { isActive: newStatus }
      }),
      prisma.user.update({
        where: { id: customer.userId },
        data: { isActive: newStatus }
      })
    ]);

    await createAuditLog(
      req.user.id,
      newStatus ? 'CUSTOMER_ACTIVATED' : 'CUSTOMER_DEACTIVATED',
      'Customer',
      id,
      { newStatus },
      ipAddress
    );

    res.status(200).json({
      success: true,
      message: `Customer has been ${newStatus ? 'activated' : 'deactivated'}.`,
      data: { isActive: newStatus }
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Get Specific Customer's Ledger.
 */
async function getCustomerLedger(req, res, next) {
  const { id } = req.params;
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 20;

  const skip = (page - 1) * limit;

  try {
    const [entries, total] = await prisma.$transaction([
      prisma.pointsLedger.findMany({
        where: { customerId: id },
        include: {
          transaction: {
            select: {
              type: true,
              purchaseAmount: true,
              remarks: true,
              merchant: { select: { businessName: true } }
            }
          }
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit
      }),
      prisma.pointsLedger.count({ where: { customerId: id } })
    ]);

    res.status(200).json({
      success: true,
      message: 'Ledger log successfully loaded.',
      data: {
        entries,
        pagination: { total, page, limit, totalPages: Math.ceil(total / limit) }
      }
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Get Specific Customer's Transactions.
 */
async function getCustomerTransactions(req, res, next) {
  const { id } = req.params;
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 20;

  const skip = (page - 1) * limit;

  try {
    const [transactions, total] = await prisma.$transaction([
      prisma.transaction.findMany({
        where: { customerId: id },
        include: {
          merchant: { select: { businessName: true, category: true } }
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit
      }),
      prisma.transaction.count({ where: { customerId: id } })
    ]);

    res.status(200).json({
      success: true,
      message: 'Transactions log successfully loaded.',
      data: {
        transactions,
        pagination: { total, page, limit, totalPages: Math.ceil(total / limit) }
      }
    });
  } catch (error) {
    next(error);
  }
}

/**
 * List all transactions, paginated + search + filters.
 */
async function getTransactions(req, res, next) {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 20;
  const search = req.query.search || '';
  const { status, type, customerId, merchantId, startDate, endDate } = req.query;

  const skip = (page - 1) * limit;

  try {
    const whereCondition = {
      ...(status ? { status } : {}),
      ...(type ? { type } : {}),
      ...(customerId ? { customerId } : {}),
      ...(merchantId ? { merchantId } : {}),
      ...((startDate || endDate) ? {
        createdAt: {
          ...(startDate ? { gte: new Date(startDate) } : {}),
          ...(endDate ? { lte: new Date(new Date(endDate).setHours(23, 59, 59, 999)) } : {})
        }
      } : {}),
      ...(search ? {
        OR: [
          { remarks: { contains: search, mode: 'insensitive' } },
          { customer: { name: { contains: search, mode: 'insensitive' } } },
          { merchant: { businessName: { contains: search, mode: 'insensitive' } } }
        ]
      } : {})
    };

    const [transactions, total] = await prisma.$transaction([
      prisma.transaction.findMany({
        where: whereCondition,
        include: {
          customer: {
            include: {
              user: {
                select: {
                  id: true,
                  email: true,
                  mobile: true,
                  role: true,
                  isActive: true,
                  createdAt: true
                }
              }
            }
          },
          merchant: { select: { businessName: true } },
          ledgerEntries: { select: { pointsChange: true } }
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit
      }),
      prisma.transaction.count({ where: whereCondition })
    ]);

    res.status(200).json({
      success: true,
      message: 'All platform transactions loaded.',
      data: {
        transactions,
        pagination: { total, page, limit, totalPages: Math.ceil(total / limit) }
      }
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Reverse a completed transaction.
 */
async function reverseTransaction(req, res, next) {
  const { id } = req.params;
  const ipAddress = req.ip;

  try {
    const result = await processReversal(id, req.user.id);

    await createAuditLog(
      req.user.id,
      'TRANSACTION_REVERSED',
      'Transaction',
      id,
      { reversalTransactionId: result.reversalTransaction.id },
      ipAddress
    );

    res.status(200).json({
      success: true,
      message: 'Transaction has been successfully reversed.',
      data: result
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Get Daily Report stats.
 */
async function getDailyReport(req, res, next) {
  const { date } = req.query; // YYYY-MM-DD format

  if (!date) {
    const err = new Error('Date parameter is required (format YYYY-MM-DD).');
    err.status = 400;
    err.code = 'VALIDATION_ERROR';
    return next(err);
  }

  try {
    const targetDate = new Date(date);
    const startOfTarget = new Date(targetDate.setHours(0, 0, 0, 0));
    const endOfTarget = new Date(targetDate.setHours(23, 59, 59, 999));

    const agg = await prisma.$queryRaw`
      SELECT
        COUNT(*)::int AS "txCount",
        COALESCE(SUM(CASE WHEN type IN ('earn','transfer') AND status = 'completed' THEN points ELSE 0 END), 0)::int AS "pointsIssued",
        COALESCE(SUM(CASE WHEN type = 'redeem' AND status = 'completed' THEN points ELSE 0 END), 0)::int AS "pointsRedeemed",
        COALESCE(SUM(CASE WHEN type IN ('earn','transfer') AND status = 'completed' THEN COALESCE("purchaseAmount", 0) ELSE 0 END), 0)::numeric AS "purchaseAmount",
        COALESCE(SUM(CASE WHEN type = 'redeem' AND status = 'completed' THEN COALESCE("platformFee", 0) ELSE 0 END), 0)::numeric AS "platformFee"
      FROM "Transaction"
      WHERE "createdAt" >= ${startOfTarget} AND "createdAt" <= ${endOfTarget}
    `;
    const row = agg[0];

    res.status(200).json({
      success: true,
      message: 'Daily report retrieved successfully.',
      data: {
        date,
        transactionsCount: row.txCount,
        pointsIssued: row.pointsIssued,
        pointsRedeemed: row.pointsRedeemed,
        purchaseAmountProcessed: parseFloat(parseFloat(row.purchaseAmount).toFixed(2)),
        platformFeeCollected: parseFloat(parseFloat(row.platformFee).toFixed(2))
      }
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Get Monthly Report stats.
 */
async function getMonthlyReport(req, res, next) {
  const { year, month } = req.query; // year: e.g. 2026, month: 1-12 (1=Jan, 12=Dec)

  if (!year || !month) {
    const err = new Error('Year and Month parameters are required.');
    err.status = 400;
    err.code = 'VALIDATION_ERROR';
    return next(err);
  }

  try {
    const startOfMonth = new Date(parseInt(year), parseInt(month) - 1, 1);
    const endOfMonth = new Date(parseInt(year), parseInt(month), 0, 23, 59, 59, 999);

    const agg = await prisma.$queryRaw`
      SELECT
        COUNT(*)::int AS "txCount",
        COALESCE(SUM(CASE WHEN type IN ('earn','transfer') AND status = 'completed' THEN points ELSE 0 END), 0)::int AS "pointsIssued",
        COALESCE(SUM(CASE WHEN type = 'redeem' AND status = 'completed' THEN points ELSE 0 END), 0)::int AS "pointsRedeemed",
        COALESCE(SUM(CASE WHEN type IN ('earn','transfer') AND status = 'completed' THEN COALESCE("purchaseAmount", 0) ELSE 0 END), 0)::numeric AS "purchaseAmount",
        COALESCE(SUM(CASE WHEN type = 'redeem' AND status = 'completed' THEN COALESCE("platformFee", 0) ELSE 0 END), 0)::numeric AS "platformFee"
      FROM "Transaction"
      WHERE "createdAt" >= ${startOfMonth} AND "createdAt" <= ${endOfMonth}
    `;
    const row = agg[0];

    res.status(200).json({
      success: true,
      message: 'Monthly report retrieved successfully.',
      data: {
        year,
        month,
        transactionsCount: row.txCount,
        pointsIssued: row.pointsIssued,
        pointsRedeemed: row.pointsRedeemed,
        purchaseAmountProcessed: parseFloat(parseFloat(row.purchaseAmount).toFixed(2)),
        platformFeeCollected: parseFloat(parseFloat(row.platformFee).toFixed(2))
      }
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Export report in Excel or CSV format.
 */
async function exportReport(req, res, next) {
  const { type, format, startDate, endDate } = req.query;

  try {
    const start = startDate ? new Date(startDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const end = endDate ? new Date(new Date(endDate).setHours(23, 59, 59, 999)) : new Date();

    // Enforce a hard limit to prevent OOM on large date ranges
    const MAX_EXPORT_ROWS = 50000;

    const totalCountAgg = await prisma.transaction.count({
      where: { createdAt: { gte: start, lte: end } }
    });

    // Use raw query for efficient flat fetching to prevent OOM
    const flatTransactions = await prisma.$queryRaw`
      SELECT 
        t.id, 
        t."createdAt", 
        c.name AS "custName", 
        u.mobile AS "custMobile",
        m."businessName" AS "merchantName",
        m.category,
        t.type,
        t."purchaseAmount",
        t.points,
        t."platformFee",
        t."netAmount",
        t.status,
        t.remarks
      FROM "Transaction" t
      JOIN "Customer" c ON c.id = t."customerId"
      JOIN "User" u ON u.id = c."userId"
      JOIN "Merchant" m ON m.id = t."merchantId"
      WHERE t."createdAt" >= ${start} AND t."createdAt" <= ${end}
      ORDER BY t."createdAt" DESC
      LIMIT ${MAX_EXPORT_ROWS}
    `;

    const wasTruncated = totalCountAgg > MAX_EXPORT_ROWS;

    if (format === 'excel') {
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet('Transactions Report');

      // Column Definitions
      worksheet.columns = [
        { header: 'Transaction ID', key: 'id', width: 40 },
        { header: 'Date', key: 'date', width: 20 },
        { header: 'Customer Name', key: 'custName', width: 20 },
        { header: 'Customer Mobile', key: 'custMobile', width: 15 },
        { header: 'Merchant Business', key: 'merchantName', width: 25 },
        { header: 'Category', key: 'category', width: 15 },
        { header: 'Type', key: 'type', width: 15 },
        { header: 'Purchase Amount (INR)', key: 'amount', width: 20 },
        { header: 'Points', key: 'points', width: 15 },
        { header: 'Platform Fee (INR)', key: 'platformFee', width: 18 },
        { header: 'Net Amount (INR)', key: 'netAmount', width: 18 },
        { header: 'Status', key: 'status', width: 15 },
        { header: 'Remarks', key: 'remarks', width: 30 }
      ];

      // Add rows
      flatTransactions.forEach(tx => {
        worksheet.addRow({
          id: tx.id,
          date: new Date(tx.createdAt).toISOString().replace('T', ' ').substring(0, 19),
          custName: tx.custName,
          custMobile: tx.custMobile,
          merchantName: tx.merchantName,
          category: tx.category,
          type: tx.type,
          amount: tx.purchaseAmount ? parseFloat(tx.purchaseAmount) : '-',
          points: tx.points,
          platformFee: tx.platformFee ? parseFloat(tx.platformFee) : '-',
          netAmount: tx.netAmount ? parseFloat(tx.netAmount) : '-',
          status: tx.status,
          remarks: tx.remarks || ''
        });
      });

      // Styling Headers
      worksheet.getRow(1).font = { bold: true };

      res.setHeader(
        'Content-Type',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      );
      res.setHeader(
        'Content-Disposition',
        `attachment; filename="transactions_report_${formatDate(new Date())}.xlsx"`
      );

      await workbook.xlsx.write(res);
      res.end();
    } else {
      // Return CSV format
      let csvContent = 'Transaction ID,Date,Customer Name,Customer Mobile,Merchant Business,Category,Type,Purchase Amount (INR),Points,Platform Fee (INR),Net Amount (INR),Status,Remarks\n';
      
      if (wasTruncated) {
        csvContent = `"WARNING: Export truncated to ${MAX_EXPORT_ROWS} rows. Total matching: ${totalCountAgg}. Use date range filtering to get complete data."\n` + csvContent;
      }
      
      flatTransactions.forEach(tx => {
        const row = [
          tx.id,
          new Date(tx.createdAt).toISOString(),
          `"${(tx.custName || '').replace(/"/g, '""')}"`,
          tx.custMobile,
          `"${(tx.merchantName || '').replace(/"/g, '""')}"`,
          tx.category,
          tx.type,
          tx.purchaseAmount ? parseFloat(tx.purchaseAmount) : '-',
          tx.points,
          tx.platformFee ? parseFloat(tx.platformFee) : '-',
          tx.netAmount ? parseFloat(tx.netAmount) : '-',
          tx.status,
          `"${(tx.remarks || '').replace(/"/g, '""')}"`
        ];
        csvContent += row.join(',') + '\n';
      });

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader(
        'Content-Disposition',
        `attachment; filename="transactions_report_${formatDate(new Date())}.csv"`
      );
      res.status(200).send(csvContent);
    }
  } catch (error) {
    next(error);
  }
}

/**
 * Get merchant-wise platform fee revenue.
 */
async function getMerchantFeeRevenue(req, res, next) {
  try {
    const merchantFeeData = await prisma.$queryRaw`
      SELECT
        m."id" AS "merchantId",
        m."businessName",
        m."category",
        COUNT(t.id)::int AS "totalRedemptions",
        COALESCE(SUM(t."points"), 0)::int AS "totalPointsRedeemed",
        COALESCE(SUM(t."purchaseAmount"), 0)::numeric AS "totalGrossDiscount",
        COALESCE(SUM(t."platformFee"), 0)::numeric AS "totalPlatformFee",
        COALESCE(SUM(t."netAmount"), 0)::numeric AS "totalNetAmount"
      FROM "Transaction" t
      JOIN "Merchant" m ON m.id = t."merchantId"
      WHERE t.type = 'redeem' AND t.status = 'completed' AND t."reversedById" IS NULL
      GROUP BY m."id", m."businessName", m."category"
      ORDER BY "totalPlatformFee" DESC
    `;

    const result = merchantFeeData.map(row => ({
      merchantId: row.merchantId,
      businessName: row.businessName,
      category: row.category,
      totalRedemptions: Number(row.totalRedemptions),
      totalPointsRedeemed: Number(row.totalPointsRedeemed),
      totalGrossDiscount: parseFloat(parseFloat(row.totalGrossDiscount).toFixed(2)),
      totalPlatformFee: parseFloat(parseFloat(row.totalPlatformFee).toFixed(2)),
      totalNetAmount: parseFloat(parseFloat(row.totalNetAmount).toFixed(2))
    }));

    res.status(200).json({
      success: true,
      message: 'Merchant-wise fee revenue retrieved successfully.',
      data: result
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Get monthly platform fee revenue trend.
 */
async function getMonthlyFeeTrend(req, res, next) {
  try {
    const monthlyTrend = await prisma.$queryRaw`
      SELECT
        TO_CHAR(DATE_TRUNC('month', t."createdAt"), 'YYYY-MM') AS "month",
        COUNT(t.id)::int AS "totalRedemptions",
        COALESCE(SUM(t."points"), 0)::int AS "totalPointsRedeemed",
        COALESCE(SUM(t."purchaseAmount"), 0)::numeric AS "totalGrossDiscount",
        COALESCE(SUM(t."platformFee"), 0)::numeric AS "totalPlatformFee",
        COALESCE(SUM(t."netAmount"), 0)::numeric AS "totalNetAmount"
      FROM "Transaction" t
      WHERE t.type = 'redeem' AND t.status = 'completed' AND t."reversedById" IS NULL
      GROUP BY DATE_TRUNC('month', t."createdAt")
      ORDER BY "month" DESC
      LIMIT 12
    `;

    const result = monthlyTrend.map(row => ({
      month: row.month,
      totalRedemptions: Number(row.totalRedemptions),
      totalPointsRedeemed: Number(row.totalPointsRedeemed),
      totalGrossDiscount: parseFloat(parseFloat(row.totalGrossDiscount).toFixed(2)),
      totalPlatformFee: parseFloat(parseFloat(row.totalPlatformFee).toFixed(2)),
      totalNetAmount: parseFloat(parseFloat(row.totalNetAmount).toFixed(2))
    }));

    res.status(200).json({
      success: true,
      message: 'Monthly fee trend retrieved successfully.',
      data: result
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Update global RewardSettings.
 */
async function updateRewardSettings(req, res, next) {
  const { pointsPerRupee, rupeesPerPoint, minRedeemPoints, pointsExpiryDays, redemptionFeePercent } = req.body;
  const ipAddress = req.ip;

  try {
    const settings = await prisma.$transaction(async (tx) => {
      const existing = await tx.rewardSettings.findFirst();
      if (existing) {
        return tx.rewardSettings.update({
          where: { id: existing.id },
          data: {
            pointsPerRupee,
            rupeesPerPoint,
            minRedeemPoints,
            pointsExpiryDays: pointsExpiryDays || 365,
            redemptionFeePercent: redemptionFeePercent !== undefined ? redemptionFeePercent : 5.00,
            updatedBy: req.user.id
          }
        });
      }
      return tx.rewardSettings.create({
        data: {
          pointsPerRupee,
          rupeesPerPoint,
          minRedeemPoints,
          pointsExpiryDays: pointsExpiryDays || 365,
          redemptionFeePercent: redemptionFeePercent !== undefined ? redemptionFeePercent : 5.00,
          updatedBy: req.user.id
        }
      });
    });

    await createAuditLog(
      req.user.id,
      'REWARD_SETTINGS_UPDATED',
      'RewardSettings',
      settings.id,
      { pointsPerRupee, rupeesPerPoint, minRedeemPoints, pointsExpiryDays, redemptionFeePercent },
      ipAddress
    );

    res.status(200).json({
      success: true,
      message: 'Global reward settings successfully updated.',
      data: settings
    });
  } catch (error) {
    next(error);
  }
}

/**
 * List all Audit Logs (paginated).
 */
async function getAuditLogs(req, res, next) {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 20;

  const skip = (page - 1) * limit;

  try {
    const [logs, total] = await prisma.$transaction([
      prisma.auditLog.findMany({
        include: {
          user: {
            select: {
              email: true,
              mobile: true,
              role: true
            }
          }
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit
      }),
      prisma.auditLog.count()
    ]);

    res.status(200).json({
      success: true,
      message: 'Audit logs retrieved successfully.',
      data: {
        logs,
        pagination: { total, page, limit, totalPages: Math.ceil(total / limit) }
      }
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Edit an existing Customer profile.
 */
async function updateCustomer(req, res, next) {
  const { id } = req.params;
  const {
    name,
    mobile,
    email,
    dateOfBirth,
    gender,
    city,
    pinCode,
    area,
    occupation,
    maritalStatus,
    anniversaryDate,
    numberOfChildren,
    preferredLanguage,
    communicationPref,
    favouriteCategories,
    dietaryPreference,
    notificationOptIn,
    profilePhoto
  } = req.body;
  const ipAddress = req.ip;

  try {
    const customer = await prisma.customer.findUnique({
      where: { id },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            mobile: true,
            role: true,
            isActive: true,
            createdAt: true
          }
        }
      }
    });
    if (!customer) {
      const err = new Error('Customer not found.');
      err.status = 404;
      err.code = 'NOT_FOUND';
      return next(err);
    }

    // Check if mobile changed and if new mobile is unique
    if (mobile !== customer.user.mobile) {
      const existingUser = await prisma.user.findFirst({
        where: { mobile, id: { not: customer.userId } }
      });
      if (existingUser) {
        const err = new Error('Mobile number already in use by another account.');
        err.status = 400;
        err.code = 'DUPLICATE_MOBILE';
        return next(err);
      }
    }

    // Check if email changed and is unique
    if (email && email !== customer.email) {
      const existingUser = await prisma.user.findFirst({
        where: { email, id: { not: customer.userId } }
      });
      if (existingUser) {
        const err = new Error('Email address already in use by another account.');
        err.status = 400;
        err.code = 'DUPLICATE_EMAIL';
        return next(err);
      }
    }

    const favCatString = favouriteCategories ? JSON.stringify(favouriteCategories) : null;

    const updated = await prisma.$transaction(async (tx) => {
      // Update User details
      await tx.user.update({
        where: { id: customer.userId },
        data: {
          mobile,
          email: email || null
        }
      });

      // Update Customer details
      const c = await tx.customer.update({
        where: { id },
        data: {
          name,
          email: email || null,
          dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : null,
          gender: gender || null,
          city: city || null,
          pinCode: pinCode || null,
          area: area || null,
          occupation: occupation || null,
          maritalStatus: maritalStatus || null,
          anniversaryDate: anniversaryDate ? new Date(anniversaryDate) : null,
          numberOfChildren: numberOfChildren !== undefined ? numberOfChildren : 0,
          preferredLanguage: preferredLanguage || "English",
          communicationPref: communicationPref || "email",
          favouriteCategories: favCatString,
          dietaryPreference: dietaryPreference || null,
          notificationOptIn: notificationOptIn !== undefined ? notificationOptIn : true,
          profilePhoto: profilePhoto || null
        },
        include: {
          user: {
            select: {
              id: true,
              email: true,
              mobile: true,
              role: true,
              isActive: true,
              createdAt: true
            }
          }
        }
      });

      return c;
    });

    await createAuditLog(req.user.id, 'CUSTOMER_UPDATED', 'Customer', id, { name }, ipAddress);

    res.status(200).json({
      success: true,
      message: 'Customer profile updated.',
      data: updated
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Get Specific Merchant Detail.
 */
async function getMerchantDetail(req, res, next) {
  const { id } = req.params;

  try {
    const merchant = await prisma.merchant.findUnique({
      where: { id },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            mobile: true,
            role: true,
            isActive: true,
            createdAt: true
          }
        }
      }
    });

    if (!merchant) {
      const err = new Error('Merchant not found.');
      err.status = 404;
      err.code = 'NOT_FOUND';
      return next(err);
    }

    res.status(200).json({
      success: true,
      message: 'Merchant detail retrieved.',
      data: merchant
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Reset Customer Password.
 */
async function resetCustomerPassword(req, res, next) {
  const { id } = req.params;
  const { newPassword } = req.body;
  const ipAddress = req.ip;

  try {
    const customer = await prisma.customer.findUnique({ where: { id } });
    if (!customer) {
      const err = new Error('Customer not found.');
      err.status = 404;
      err.code = 'NOT_FOUND';
      return next(err);
    }

    const passwordHash = await bcrypt.hash(newPassword, 10);

    await prisma.user.update({
      where: { id: customer.userId },
      data: { password: passwordHash }
    });

    // Clear user tokens
    await prisma.refreshToken.deleteMany({
      where: { userId: customer.userId }
    });

    await createAuditLog(req.user.id, 'CUSTOMER_PASSWORD_RESET', 'Customer', id, {}, ipAddress);

    res.status(200).json({
      success: true,
      message: 'Customer password has been reset successfully.'
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Get global reward settings.
 */
async function getRewardSettings(req, res, next) {
  try {
    const settings = await prisma.rewardSettings.findFirst({
      orderBy: { updatedAt: 'desc' }
    });

    res.status(200).json({
      success: true,
      message: 'Reward settings retrieved successfully.',
      data: settings ? {
        pointsPerRupee: parseFloat(settings.pointsPerRupee),
        rupeesPerPoint: parseFloat(settings.rupeesPerPoint),
        minRedeemPoints: settings.minRedeemPoints,
        pointsExpiryDays: settings.pointsExpiryDays,
        redemptionFeePercent: parseFloat(settings.redemptionFeePercent)
      } : {
        pointsPerRupee: 0.01,
        rupeesPerPoint: 0.10,
        minRedeemPoints: 100,
        pointsExpiryDays: 365,
        redemptionFeePercent: 5.00
      }
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Get all complaints with filters.
 */
async function getComplaints(req, res, next) {
  const { type, role, status, startDate, endDate } = req.query;

  try {
    const whereCondition = {
      ...(type ? { type } : {}),
      ...(role ? { userRole: role } : {}),
      ...(status ? { status } : {}),
      ...((startDate || endDate) ? {
        createdAt: {
          ...(startDate ? { gte: new Date(startDate) } : {}),
          ...(endDate ? { lte: new Date(new Date(endDate).setHours(23, 59, 59, 999)) } : {})
        }
      } : {})
    };

    const complaints = await prisma.complaint.findMany({
      where: whereCondition,
      orderBy: { createdAt: 'desc' }
    });

    res.status(200).json({
      success: true,
      message: 'Complaints retrieved successfully.',
      data: complaints
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Update a complaint status.
 */
async function updateComplaintStatus(req, res, next) {
  const { id } = req.params;
  const { status } = req.body;

  if (!status || !['Pending', 'In Progress', 'Resolved'].includes(status)) {
    const err = new Error('Invalid or missing status. Must be Pending, In Progress, or Resolved.');
    err.status = 400;
    err.code = 'VALIDATION_ERROR';
    return next(err);
  }

  try {
    const complaint = await prisma.complaint.findUnique({
      where: { id }
    });

    if (!complaint) {
      const err = new Error('Complaint not found.');
      err.status = 404;
      err.code = 'NOT_FOUND';
      return next(err);
    }

    const updated = await prisma.complaint.update({
      where: { id },
      data: { status }
    });

    res.status(200).json({
      success: true,
      message: `Complaint status updated to ${status}.`,
      data: updated
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Fetch all advertisements, paginated, with merchant businessName and optional status filtering.
 */
async function getAdvertisements(req, res, next) {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 20;
  const status = req.query.status;
  const skip = (page - 1) * limit;

  try {
    const whereCondition = status ? { status } : {};

    const [advertisements, total] = await prisma.$transaction([
      prisma.advertisement.findMany({
        where: whereCondition,
        include: {
          merchant: {
            select: {
              businessName: true,
              address: true,
              city: true,
              landmark: true,
              latitude: true,
              longitude: true,
              googleMapsUrl: true
            }
          },
          payments: true
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit
      }),
      prisma.advertisement.count({ where: whereCondition })
    ]);

    res.status(200).json({
      success: true,
      message: 'Advertisements retrieved successfully.',
      data: {
        advertisements,
        pagination: {
          total,
          page,
          limit,
          totalPages: Math.ceil(total / limit)
        }
      }
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Update Advertisement status by ID (approved, rejected, expired).
 */
async function updateAdStatus(req, res, next) {
  const { id } = req.params;
  const { status, rejectionReason } = req.body;

  if (!['approved', 'rejected', 'expired', 'live', 'paused'].includes(status)) {
    const err = new Error('Invalid status. Must be approved, rejected, expired, live, or paused.');
    err.status = 400;
    err.code = 'VALIDATION_ERROR';
    return next(err);
  }

  try {
    const ad = await prisma.advertisement.findUnique({ where: { id } });
    if (!ad) {
      const err = new Error('Advertisement not found.');
      err.status = 404;
      err.code = 'NOT_FOUND';
      return next(err);
    }

    if (status === 'live' && ad.status === 'paused') {
      const adWithPayments = await prisma.advertisement.findUnique({
        where: { id },
        include: { payments: true }
      });
      const hasConfirmedPayment = adWithPayments.payments?.some(p => p.status === 'confirmed');
      if (!hasConfirmedPayment) {
        const err = new Error('Cannot resume to Live: no confirmed payment found. Resume to Approved instead to require payment from merchant.');
        err.status = 400;
        err.code = 'VALIDATION_ERROR';
        return next(err);
      }
    }

    if (status === 'rejected') {
      const updated = await prisma.$transaction(async (tx) => {
        const adUpdate = await tx.advertisement.update({
          where: { id },
          data: {
            status: 'rejected',
            rejectionReason: rejectionReason || null
          }
        });

        await tx.adPayment.updateMany({
          where: {
            advertisementId: id,
            status: { not: 'rejected' }
          },
          data: { status: 'rejected' }
        });

        return adUpdate;
      });

      res.status(200).json({
        success: true,
        message: 'Advertisement rejected.',
        data: updated
      });
    } else {
      const updateData = { status };

      if (status === 'approved') {
        updateData.approvedAt = new Date();
      }

      const updated = await prisma.advertisement.update({
        where: { id },
        data: updateData
      });

      res.status(200).json({
        success: true,
        message: `Advertisement status updated to ${status}.`,
        data: updated
      });
    }
  } catch (error) {
    next(error);
  }
}

/**
 * Get summed impression and click statistics across all approved advertisements.
 */
async function getAdStats(req, res, next) {
  try {
    const aggregates = await prisma.advertisement.aggregate({
      where: { status: { in: ['approved', 'live'] } },
      _sum: {
        impressions: true,
        clicks: true
      }
    });

    res.status(200).json({
      success: true,
      message: 'Advertisement statistics retrieved successfully.',
      data: {
        totalImpressions: aggregates._sum.impressions || 0,
        totalClicks: aggregates._sum.clicks || 0
      }
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Create a new Customer.
 */
async function createCustomer(req, res, next) {
  const { name, mobile, email, password, city } = req.body;
  const ipAddress = req.ip;

  try {
    // Check if mobile already exists in users
    const existingUser = await prisma.user.findUnique({
      where: { mobile }
    });
    if (existingUser) {
      const err = new Error('Mobile number already registered.');
      err.status = 400;
      err.code = 'DUPLICATE_MOBILE';
      return next(err);
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const customerId = uuidv4();
    const qrCode = `SKILLXT-${mobile}`;
    const referralCode = `SKILLXT-${uuidv4().slice(0, 8).toUpperCase()}`;

    const result = await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          mobile,
          email: email || null,
          password: passwordHash,
          role: 'customer'
        }
      });

      const customer = await tx.customer.create({
        data: {
          id: customerId,
          userId: user.id,
          name,
          email: email || null,
          city: city || null,
          qrCode,
          referralCode
        }
      });

      return { user, customer };
    });

    await createAuditLog(
      req.user.id,
      'CUSTOMER_CREATED',
      'Customer',
      result.customer.id,
      { mobile },
      ipAddress
    );

    res.status(201).json({
      success: true,
      message: 'Customer created successfully.',
      data: {
        id: result.customer.id,
        name: result.customer.name,
        mobile: result.user.mobile,
        email: result.customer.email,
        city: result.customer.city
      }
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Get expiring subscriptions grouped by tier for admin dashboard.
 */
async function getExpiringSubscriptions(req, res, next) {
  try {
    const { getExpiringSubscriptions } = require('../services/subscriptionReminderService');
    const result = await getExpiringSubscriptions();

    res.status(200).json({
      success: true,
      message: 'Expiring subscriptions retrieved successfully.',
      data: result
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Get inactivity summary for admin dashboard cards.
 */
async function getInactivitySummary(req, res, next) {
  try {
    const { getInactivitySummary } = require('../services/inactivityService');
    const result = await getInactivitySummary();

    res.status(200).json({
      success: true,
      message: 'Inactivity summary retrieved successfully.',
      data: result
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Get merchant inactivity report.
 */
async function getMerchantInactivityReport(req, res, next) {
  try {
    const { getMerchantInactivityReport } = require('../services/inactivityService');
    const result = await getMerchantInactivityReport();

    res.status(200).json({
      success: true,
      message: 'Merchant inactivity report retrieved successfully.',
      data: result
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Get customer inactivity report.
 */
async function getCustomerInactivityReport(req, res, next) {
  try {
    const { getCustomerInactivityReport } = require('../services/inactivityService');
    const result = await getCustomerInactivityReport();

    res.status(200).json({
      success: true,
      message: 'Customer inactivity report retrieved successfully.',
      data: result
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Get transaction, user, and revenue trends.
 */
async function getTrends(req, res, next) {
  try {
    const { getTrendsData } = require('../services/trendService');
    const data = await getTrendsData();

    res.status(200).json({
      success: true,
      message: 'Trends retrieved successfully.',
      data
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Get retention metrics (customer, merchant, repeat purchase).
 */
async function getRetentionMetrics(req, res, next) {
  try {
    const { getRetentionMetrics } = require('../services/retentionService');
    const result = await getRetentionMetrics();

    res.status(200).json({
      success: true,
      message: 'Retention metrics retrieved successfully.',
      data: result
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Approve a pending merchant application.
 */
async function approveMerchant(req, res, next) {
  try {
    const merchantId = req.params.id;
    const merchant = await prisma.merchant.findUnique({
      where: { id: merchantId },
      include: { user: true }
    });

    if (!merchant) {
      const err = new Error('Merchant not found.');
      err.status = 404;
      err.code = 'NOT_FOUND';
      return next(err);
    }

    if (merchant.status !== 'pending') {
      const err = new Error('Merchant is not in pending status.');
      err.status = 400;
      err.code = 'INVALID_STATUS';
      return next(err);
    }

    await prisma.merchant.update({
      where: { id: merchantId },
      data: { status: 'approved' }
    });

    await createAuditLog(req.user.id, 'MERCHANT_APPROVED', 'Merchant', merchantId, { businessName: merchant.businessName }, req.ip);

    res.status(200).json({
      success: true,
      message: 'Merchant approved. Awaiting subscription payment.',
      data: { merchantId }
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Reject a pending merchant application.
 */
async function rejectMerchant(req, res, next) {
  try {
    const merchantId = req.params.id;
    const { reason } = req.body;

    const merchant = await prisma.merchant.findUnique({
      where: { id: merchantId },
      include: { user: true }
    });

    if (!merchant) {
      const err = new Error('Merchant not found.');
      err.status = 404;
      err.code = 'NOT_FOUND';
      return next(err);
    }

    if (merchant.status !== 'pending') {
      const err = new Error('Only pending merchants can be rejected.');
      err.status = 400;
      err.code = 'INVALID_STATUS';
      return next(err);
    }

    const updateData = { status: 'rejected' };

    const updatedMerchant = await prisma.merchant.update({
      where: { id: merchantId },
      data: updateData
    });

    const responseData = { merchant: updatedMerchant };
    if (reason !== undefined && reason !== null && reason.trim() !== '') {
      responseData.rejectionReason = reason.trim();
    }

    await createAuditLog(req.user.id, 'MERCHANT_REJECTED', 'Merchant', merchantId, { businessName: merchant.businessName, reason: reason || '' }, req.ip);

    res.status(200).json({
      success: true,
      message: 'Merchant rejected successfully.',
      data: responseData
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Get merchants awaiting payment verification.
 */
async function getPendingPayments(req, res, next) {
  try {
    const merchants = await prisma.merchant.findMany({
      where: {
        status: {
          in: ['approved', 'payment_pending']
        }
      },
      select: {
        id: true,
        businessName: true,
        merchantCode: true,
        status: true,
        paymentScreenshot: true,
        createdAt: true,
        user: {
          select: {
            mobile: true,
            email: true
          }
        }
      },
      orderBy: { createdAt: 'asc' }
    });

    res.status(200).json({
      success: true,
      message: 'Pending payments retrieved.',
      data: merchants
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Confirm merchant payment and activate account with welcome bonus.
 */
async function confirmMerchantPayment(req, res, next) {
  try {
    const merchantId = req.params.id;
    const merchant = await prisma.merchant.findUnique({
      where: { id: merchantId }
    });

    if (!merchant) {
      const err = new Error('Merchant not found.');
      err.status = 404;
      err.code = 'NOT_FOUND';
      return next(err);
    }

    if (merchant.status !== 'payment_pending') {
      const err = new Error('No payment screenshot uploaded yet.');
      err.status = 400;
      err.code = 'INVALID_STATUS';
      return next(err);
    }

    const previousSubscription = await prisma.merchantSubscription.findFirst({
      where: { merchantId },
      orderBy: { createdAt: 'asc' }
    });

    const isFirstActivation = !previousSubscription;

    const updateData = {
      status: 'active'
    };

    if (isFirstActivation) {
      updateData.pointsBalance = {
        increment: getBonusForPosition(0)
      };
    }

    const updated = await prisma.merchant.update({
      where: { id: merchantId },
      data: updateData
    });

    await createAuditLog(req.user.id, 'MERCHANT_PAYMENT_CONFIRMED', 'Merchant', merchantId, {
      businessName: merchant.businessName,
      welcomeBonus: isFirstActivation
    }, req.ip);

    if (isFirstActivation) {
      try {
        await processReferralOnFirstPayment(merchantId);
      } catch (referralErr) {
        console.error('[Referral] Error processing referral on first payment:', referralErr.message);
      }
    }

    res.status(200).json({
      success: true,
      message: 'Payment confirmed. Merchant activated.',
      data: {
        merchantId,
        welcomeBonus: isFirstActivation,
        newPointsBalance: updated.pointsBalance
      }
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Reject merchant payment and reset to approved status for re-upload.
 */
async function rejectMerchantPayment(req, res, next) {
  try {
    const merchantId = req.params.id;
    const merchant = await prisma.merchant.findUnique({
      where: { id: merchantId }
    });

    if (!merchant) {
      const err = new Error('Merchant not found.');
      err.status = 404; err.code = 'NOT_FOUND';
      return next(err);
    }

    if (merchant.status !== 'payment_pending') {
      const err = new Error('Merchant is not in payment_pending status.');
      err.status = 400; err.code = 'INVALID_STATUS';
      return next(err);
    }

    await prisma.merchant.update({
      where: { id: merchantId },
      data: {
        status: 'approved',
        paymentScreenshot: null
      }
    });

    await createAuditLog(req.user.id, 'MERCHANT_PAYMENT_REJECTED', 'Merchant', merchantId,
      { businessName: merchant.businessName }, req.ip);

    res.status(200).json({
      success: true,
      message: 'Payment rejected. Merchant can re-upload screenshot.',
      data: { merchantId }
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Confirm renewal payment: renew subscription + credit 1000 bonus points.
 */
async function confirmRenewalPayment(req, res, next) {
  try {
    const merchantId = req.params.id;
    const { paymentRef } = req.body;

    const merchant = await prisma.merchant.findUnique({
      where: { id: merchantId }
    });

    if (!merchant) {
      const err = new Error('Merchant not found.');
      err.status = 404;
      err.code = 'NOT_FOUND';
      return next(err);
    }

    if (merchant.status !== 'payment_pending') {
      const err = new Error('Merchant is not awaiting payment verification.');
      err.status = 400;
      err.code = 'INVALID_STATUS';
      return next(err);
    }

    if (!merchant.pendingRenewalSubscriptionId) {
      const err = new Error('No pending renewal found for this merchant. Use confirm-payment for first-time activation.');
      err.status = 400;
      err.code = 'NO_RENEWAL_PENDING';
      return next(err);
    }

    const result = await prisma.$transaction(async (tx) => {
      const existing = await tx.merchantSubscription.findUnique({
        where: { id: merchant.pendingRenewalSubscriptionId },
        include: { plan: true }
      });

      if (!existing || existing.merchantId !== merchantId) {
        throw new Error('Subscription not found or does not belong to this merchant.');
      }

      const plan = existing.plan;
      if (!plan || !plan.isActive) {
        throw new Error('Original plan is no longer active.');
      }

      const baseDate = new Date() > existing.endDate ? new Date() : existing.endDate;
      const newEndDate = new Date(baseDate);
      newEndDate.setDate(newEndDate.getDate() + plan.durationDays);

      const newGracePeriodEnd = new Date(newEndDate);
      newGracePeriodEnd.setDate(newGracePeriodEnd.getDate() + GRACE_PERIOD_DAYS);

      const subscription = await tx.merchantSubscription.update({
        where: { id: merchant.pendingRenewalSubscriptionId },
        data: {
          endDate: newEndDate,
          gracePeriodEnd: newGracePeriodEnd,
          status: 'active',
          paymentRef: paymentRef || existing.paymentRef
        },
        include: { plan: true }
      });

      // Tapered renewal bonus: position derived from subscriptionCount (taken after current row exists)
      const subscriptionCount = await tx.merchantSubscription.count({
        where: { merchantId }
      });
      const renewalBonus = getBonusForPosition(subscriptionCount - 1);

      const updatedMerchant = await tx.merchant.update({
        where: { id: merchantId },
        data: {
          status: 'active',
          pendingRenewalSubscriptionId: null,
          pointsBalance: { increment: renewalBonus }
        }
      });

      return { subscription, updatedMerchant, renewalBonus, subscriptionCount };
    });

    await createAuditLog(
      req.user.id,
      'MERCHANT_RENEWAL_CONFIRMED',
      'Merchant',
      merchantId,
      {
        businessName: merchant.businessName,
        subscriptionId: merchant.pendingRenewalSubscriptionId,
        newEndDate: result.subscription.endDate,
        subscriptionCount: result.subscriptionCount,
        pointsCredited: result.renewalBonus,
        newPointsBalance: result.updatedMerchant.pointsBalance
      },
      req.ip
    );

    try {
      await processReferralOnRenewal(merchantId);
    } catch (referralErr) {
      console.error('[Referral] Error processing referral on renewal:', referralErr.message);
    }

    res.status(200).json({
      success: true,
      message: `Renewal confirmed. Subscription extended and ${result.renewalBonus.toLocaleString()} bonus points credited.`,
      data: {
        merchantId,
        subscriptionId: result.subscription.id,
        newEndDate: result.subscription.endDate,
        renewalBonus: result.renewalBonus,
        pointsBalance: result.updatedMerchant.pointsBalance
      }
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Reject renewal payment: reset to active, clear pending renewal.
 */
async function rejectRenewalPayment(req, res, next) {
  try {
    const merchantId = req.params.id;

    const merchant = await prisma.merchant.findUnique({
      where: { id: merchantId }
    });

    if (!merchant) {
      const err = new Error('Merchant not found.');
      err.status = 404;
      err.code = 'NOT_FOUND';
      return next(err);
    }

    if (merchant.status !== 'payment_pending') {
      const err = new Error('Merchant is not awaiting payment verification.');
      err.status = 400;
      err.code = 'INVALID_STATUS';
      return next(err);
    }

    if (!merchant.pendingRenewalSubscriptionId) {
      const err = new Error('No pending renewal found for this merchant. Use reject-payment for first-time activation.');
      err.status = 400;
      err.code = 'NO_RENEWAL_PENDING';
      return next(err);
    }

    await prisma.merchant.update({
      where: { id: merchantId },
      data: {
        status: 'active',
        pendingRenewalSubscriptionId: null
      }
    });

    await createAuditLog(
      req.user.id,
      'MERCHANT_RENEWAL_REJECTED',
      'Merchant',
      merchantId,
      {
        businessName: merchant.businessName,
        subscriptionId: merchant.pendingRenewalSubscriptionId
      },
      req.ip
    );

    res.status(200).json({
      success: true,
      message: 'Renewal rejected. Merchant status restored to active.',
      data: { merchantId }
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Get chatbot analytics for admin dashboard.
 */
async function getChatbotAnalytics(req, res, next) {
  try {
    const now = new Date();
    const weekAgo = new Date(now);
    weekAgo.setDate(weekAgo.getDate() - 7);
    const monthAgo = new Date(now);
    monthAgo.setMonth(monthAgo.getMonth() - 1);

    const [
      totalThisWeek,
      totalThisMonth,
      messagesByRole,
      totalMessages,
      matchedCount,
      topQuestions,
      unansweredQuestions,
      peakHours
    ] = await Promise.all([
      prisma.chatLog.count({ where: { createdAt: { gte: weekAgo } } }),
      prisma.chatLog.count({ where: { createdAt: { gte: monthAgo } } }),
      prisma.chatLog.groupBy({ by: ['userRole'], _count: { id: true } }),
      prisma.chatLog.count(),
      prisma.chatLog.count({ where: { matched: true } }),
      prisma.chatLog.groupBy({
        by: ['message'],
        _count: { id: true },
        orderBy: { _count: { id: 'desc' } },
        take: 10
      }),
      prisma.chatLog.findMany({
        where: { matched: false },
        orderBy: { createdAt: 'desc' },
        take: 20,
        select: { message: true, createdAt: true, userRole: true }
      }),
      prisma.$queryRaw`
        SELECT EXTRACT(HOUR FROM "createdAt") as hour, COUNT(*) as count
        FROM "ChatLog"
        GROUP BY EXTRACT(HOUR FROM "createdAt")
        ORDER BY hour ASC
      `
    ]);

    const matchRate = totalMessages > 0 ? ((matchedCount / totalMessages) * 100).toFixed(1) : 0;

    const mostActiveRole = messagesByRole.length > 0
      ? messagesByRole.reduce((prev, curr) => prev._count.id > curr._count.id ? prev : curr).userRole
      : 'guest';

    res.status(200).json({
      success: true,
      message: 'Chatbot analytics retrieved.',
      data: {
        totalThisWeek,
        totalThisMonth,
        totalMessages,
        matchRate: `${matchRate}%`,
        mostActiveRole,
        messagesByRole: messagesByRole.map(item => ({ role: item.userRole, count: item._count.id })),
        topQuestions: topQuestions.map(item => ({ question: item.message, count: item._count.id })),
        unansweredQuestions,
        peakHours: peakHours.map(item => ({ hour: parseInt(item.hour), count: parseInt(item.count) }))
      }
    });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/admin/merchant-referrals
 * View all referral pairs, status, reward history.
 */
async function getMerchantReferrals(req, res, next) {
  try {
    const { getAdminReferralOverview } = require('../services/merchantReferralService');
    const referrals = await getAdminReferralOverview();

    res.status(200).json({
      success: true,
      message: 'Merchant referrals retrieved successfully.',
      data: referrals
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  getDashboard,
  getMerchants,
  getMerchantDetail,
  createMerchant,
  updateMerchant,
  setMerchantStatus,
  resetMerchantPassword,
  getCustomers,
  getCustomerDetail,
  toggleCustomer,
  updateCustomer,
  resetCustomerPassword,
  getCustomerLedger,
  getCustomerTransactions,
  getTransactions,
  reverseTransaction,
  getDailyReport,
  getMonthlyReport,
  exportReport,
  getRewardSettings,
  updateRewardSettings,
  getAuditLogs,
  getComplaints,
  updateComplaintStatus,
  getAdvertisements,
  updateAdStatus,
  getAdStats,
  createCustomer,
  getMerchantFeeRevenue,
  getMonthlyFeeTrend,
  getExpiringSubscriptions,
  getInactivitySummary,
  getMerchantInactivityReport,
  getCustomerInactivityReport,
  getTrends,
  getRetentionMetrics,
  approveMerchant,
  rejectMerchant,
  getPendingPayments,
  getPendingMerchantCount,
  getPendingAdCount,
  confirmMerchantPayment,
  rejectMerchantPayment,
  confirmRenewalPayment,
  rejectRenewalPayment,
  getChatbotAnalytics,
  getPointsLiabilityTrend,
  getMerchantHealth,
  getMerchantReferrals
};

/**
 * GET /api/admin/reports/points-liability-trend
 * Weekly outstanding points balance (issued minus redeemed) for the last 12 weeks.
 */
async function getPointsLiabilityTrend(req, res, next) {
  try {
    const weeklyRows = await prisma.$queryRaw`
      SELECT
        TO_CHAR(DATE_TRUNC('week', t."createdAt"), 'YYYY-MM-DD') AS "weekEnd",
        COALESCE(SUM(CASE WHEN t.type IN ('earn','transfer') THEN t.points ELSE 0 END), 0)::int AS "pointsIssued",
        COALESCE(SUM(CASE WHEN t.type = 'redeem' THEN t.points ELSE 0 END), 0)::int AS "pointsRedeemed"
      FROM "Transaction" t
      WHERE t.status = 'completed'
        AND t."reversedById" IS NULL
        AND t."createdAt" >= (DATE_TRUNC('week', NOW()) - INTERVAL '11 weeks')
      GROUP BY DATE_TRUNC('week', t."createdAt")
      ORDER BY DATE_TRUNC('week', t."createdAt") ASC
    `;

    const weeks = [];
    let cumulativeIssued = 0;
    let cumulativeRedeemed = 0;

    for (const row of weeklyRows) {
      cumulativeIssued += row.pointsIssued;
      cumulativeRedeemed += row.pointsRedeemed;
      weeks.push({
        weekEnd: row.weekEnd,
        pointsIssued: row.pointsIssued,
        pointsRedeemed: row.pointsRedeemed,
        outstandingBalance: cumulativeIssued - cumulativeRedeemed
      });
    }

    res.status(200).json({
      success: true,
      message: 'Points liability trend retrieved successfully.',
      data: {
        weeks,
        currentOutstanding: cumulativeIssued - cumulativeRedeemed,
        summary: {
          totalIssued12W: cumulativeIssued,
          totalRedeemed12W: cumulativeRedeemed,
          netOutstanding12W: cumulativeIssued - cumulativeRedeemed
        }
      }
    });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/admin/reports/merchant-health
 * Classifies active merchants into critical / warning / healthy tiers.
 */
async function getMerchantHealth(req, res, next) {
  try {
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const sevenDaysFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    const startOfThisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);

    const merchants = await prisma.merchant.findMany({
      where: { isActive: true, status: 'active' },
      select: {
        id: true,
        businessName: true,
        category: true
      }
    });

    if (merchants.length === 0) {
      return res.status(200).json({
        success: true,
        message: 'Merchant health retrieved successfully.',
        data: { summary: { totalMerchants: 0, critical: 0, warning: 0, healthy: 0 }, merchants: [] }
      });
    }

    const merchantIds = merchants.map(m => m.id);

    const placeholders = merchantIds.map((_, i) => `$${i + 1}`).join(',');

    const lastTxRows = await prisma.$queryRawUnsafe(`
      SELECT "merchantId", MAX("createdAt") AS "lastTxDate"
      FROM "Transaction"
      WHERE "merchantId" IN (${placeholders}) AND status = 'completed'
      GROUP BY "merchantId"
    `, ...merchantIds);

    const lastTxMap = {};
    for (const row of lastTxRows) {
      lastTxMap[row.merchantId] = row.lastTxDate;
    }

    const thisMonthTxRows = await prisma.$queryRawUnsafe(`
      SELECT "merchantId", COUNT(*)::int AS "txCount"
      FROM "Transaction"
      WHERE "merchantId" IN (${placeholders})
        AND status = 'completed'
        AND "createdAt" >= '${startOfThisMonth.toISOString()}'
      GROUP BY "merchantId"
    `, ...merchantIds);

    const lastMonthTxRows = await prisma.$queryRawUnsafe(`
      SELECT "merchantId", COUNT(*)::int AS "txCount"
      FROM "Transaction"
      WHERE "merchantId" IN (${placeholders})
        AND status = 'completed'
        AND "createdAt" >= '${startOfLastMonth.toISOString()}' AND "createdAt" < '${startOfThisMonth.toISOString()}'
      GROUP BY "merchantId"
    `, ...merchantIds);

    const thisMonthTxMap = {};
    for (const row of thisMonthTxRows) thisMonthTxMap[row.merchantId] = row.txCount;
    const lastMonthTxMap = {};
    for (const row of lastMonthTxRows) lastMonthTxMap[row.merchantId] = row.txCount;

    const topUpRows = await prisma.$queryRawUnsafe(`
      SELECT
        "merchantId",
        COUNT(*)::int AS "totalTopUps",
        COUNT(*) FILTER (WHERE status = 'rejected')::int AS "failedTopUps",
        COUNT(*) FILTER (WHERE status = 'pending' AND "createdAt" < '${thirtyDaysAgo.toISOString()}')::int AS "lateTopUps"
      FROM "PointsTopUp"
      WHERE "merchantId" IN (${placeholders})
      GROUP BY "merchantId"
    `, ...merchantIds);

    const topUpMap = {};
    for (const row of topUpRows) topUpMap[row.merchantId] = row;

    const subRows = await prisma.$queryRawUnsafe(`
      SELECT
        "merchantId",
        "endDate",
        "status" AS "subStatus"
      FROM "MerchantSubscription"
      WHERE "merchantId" IN (${placeholders})
        AND "status" IN ('active','grace_period')
      ORDER BY "endDate" DESC
      LIMIT ${merchants.length}
    `, ...merchantIds);

    const subMap = {};
    for (const row of subRows) {
      if (!subMap[row.merchantId]) subMap[row.merchantId] = row;
    }

    const enrichedMerchants = merchants.map(m => {
      const lastTx = lastTxMap[m.id] || null;
      const thisMonthTx = thisMonthTxMap[m.id] || 0;
      const lastMonthTx = lastMonthTxMap[m.id] || 0;
      const topUp = topUpMap[m.id] || { failedTopUps: 0, lateTopUps: 0 };
      const sub = subMap[m.id] || null;

      const daysSinceLastTx = lastTx
        ? Math.floor((now - new Date(lastTx)) / (1000 * 60 * 60 * 24))
        : null;

      const volumeDropPercent = lastMonthTx > 0 && thisMonthTx < lastMonthTx
        ? Math.round(((lastMonthTx - thisMonthTx) / lastMonthTx) * 100)
        : 0;

      const subExpiringInDays = sub
        ? Math.ceil((new Date(sub.endDate) - now) / (1000 * 60 * 60 * 24))
        : null;

      return {
        merchantId: m.id,
        businessName: m.businessName,
        category: m.category,
        flags: [],
        metrics: {
          lastTransactionDate: lastTx,
          daysSinceLastTx,
          thisMonthTxCount: thisMonthTx,
          lastMonthTxCount: lastMonthTx,
          volumeDropPercent,
          failedTopUps: topUp.failedTopUps,
          lateTopUps: topUp.lateTopUps,
          subscriptionEndDate: sub ? sub.endDate : null,
          subscriptionStatus: sub ? sub.subStatus : null,
          subscriptionExpiringInDays: subExpiringInDays
        }
      };
    });

    for (const m of enrichedMerchants) {
      const isCriticalZeroTx = m.metrics.daysSinceLastTx !== null && m.metrics.daysSinceLastTx >= 30;
      const isCriticalTopUp = (m.metrics.failedTopUps + m.metrics.lateTopUps) >= 2;
      if (isCriticalZeroTx) m.flags.push({ reason: 'zero_transactions_30d', detail: `No transactions since ${m.metrics.lastTransactionDate ? new Date(m.metrics.lastTransactionDate).toISOString().split('T')[0] : 'N/A'} (${m.metrics.daysSinceLastTx} days)` });
      if (isCriticalTopUp) m.flags.push({ reason: 'failed_late_topups_2plus', detail: `${m.metrics.failedTopUps} failed, ${m.metrics.lateTopUps} late top-up payments` });

      if (m.flags.length === 0) {
        const isWarningSub = m.metrics.subscriptionExpiringInDays !== null && m.metrics.subscriptionExpiringInDays <= 7 && m.metrics.subscriptionExpiringInDays >= 0;
        const isWarningVolume = m.metrics.volumeDropPercent >= 50;
        if (isWarningSub) m.flags.push({ reason: 'subscription_expiring_7d', detail: `Subscription expires ${new Date(m.metrics.subscriptionEndDate).toISOString().split('T')[0]} (${m.metrics.subscriptionExpiringInDays} days)` });
        if (isWarningVolume) m.flags.push({ reason: 'volume_drop_50pct', detail: `Volume dropped ${m.metrics.volumeDropPercent}% vs last month (${m.metrics.lastMonthTxCount} → ${m.metrics.thisMonthTxCount} transactions)` });
      }
    }

    const tiered = enrichedMerchants.map(m => ({
      ...m,
      tier: m.flags.some(f => f.reason.startsWith('zero_transactions') || f.reason.startsWith('failed_late'))
        ? 'critical'
        : m.flags.length > 0
          ? 'warning'
          : 'healthy'
    }));

    const summary = {
      totalMerchants: tiered.length,
      critical: tiered.filter(m => m.tier === 'critical').length,
      warning: tiered.filter(m => m.tier === 'warning').length,
      healthy: tiered.filter(m => m.tier === 'healthy').length
    };

    res.status(200).json({
      success: true,
      message: 'Merchant health retrieved successfully.',
      data: {
        summary,
        merchants: tiered.sort((a, b) => {
          const order = { critical: 0, warning: 1, healthy: 2 };
          return order[a.tier] - order[b.tier];
        })
      }
    });
  } catch (error) {
    next(error);
  }
}



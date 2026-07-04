const prisma = require('../lib/prisma');
const { createAuditLog } = require('./auditLogService');
const { isEmailConfigured, sendEmail } = require('./emailService');
const { generateReengagementEmail } = require('../templates/reengagementReminder');

/**
 * Identify dormant customers eligible for re-engagement.
 * Criteria: inactive 60+ days AND has points balance > 0.
 */
async function identifyDormantCustomers() {
  const cutoff = new Date(Date.now() - 60 * 86400000);

  const dormantCustomers = await prisma.$queryRaw`
    SELECT
      c."id" AS "customerId",
      c."name",
      c."userId",
      (SELECT MAX(t."createdAt") FROM "Transaction" t WHERE t."customerId" = c."id" AND t.status = 'completed') AS "lastTransactionAt",
      (SELECT COALESCE(SUM(pl."pointsChange"), 0) FROM "PointsLedger" pl WHERE pl."customerId" = c."id")::int AS "currentBalance"
    FROM "Customer" c
    WHERE c."isActive" = true
    HAVING (SELECT MAX(t."createdAt") FROM "Transaction" t WHERE t."customerId" = c."id" AND t.status = 'completed') < ${cutoff}
       OR (SELECT MAX(t."createdAt") FROM "Transaction" t WHERE t."customerId" = c."id" AND t.status = 'completed') IS NULL
  `;

  const results = [];
  for (const row of dormantCustomers) {
    if (row.currentBalance > 0) {
      const daysInactive = row.lastTransactionAt
        ? Math.floor((Date.now() - new Date(row.lastTransactionAt).getTime()) / 86400000)
        : null;

      let tier = 'dormant_60';
      if (daysInactive !== null && daysInactive >= 90) tier = 'dormant_90';

      results.push({
        customerId: row.customerId,
        userId: row.userId,
        name: row.name,
        lastTransactionAt: row.lastTransactionAt,
        currentBalance: row.currentBalance,
        daysInactive,
        tier
      });
    }
  }

  return results;
}

/**
 * Identify customers with points but no redemptions.
 */
async function identifyNeverRedeemed() {
  const customers = await prisma.$queryRaw`
    SELECT
      c."id" AS "customerId",
      c."name",
      c."userId",
      COALESCE(SUM(CASE WHEN pl."pointsChange" > 0 THEN pl."pointsChange" ELSE 0 END), 0)::int AS "totalEarned",
      COALESCE(SUM(CASE WHEN pl."pointsChange" < 0 THEN ABS(pl."pointsChange") ELSE 0 END), 0)::int AS "totalRedeemed"
    FROM "Customer" c
    JOIN "PointsLedger" pl ON pl."customerId" = c."id"
    WHERE c."isActive" = true
    GROUP BY c."id", c."name", c."userId"
    HAVING SUM(CASE WHEN pl."pointsChange" > 0 THEN pl."pointsChange" ELSE 0 END) > 0
       AND SUM(CASE WHEN pl."pointsChange" < 0 THEN ABS(pl."pointsChange") ELSE 0 END) = 0
  `;

  return customers.map(c => ({
    customerId: c.customerId,
    userId: c.userId,
    name: c.name,
    currentBalance: c.totalEarned,
    tier: 'never_redeemed'
  }));
}

/**
 * Identify customers with high balance but no recent redemption.
 */
async function identifyHighBalanceNoRedemption() {
  const cutoff = new Date(Date.now() - 90 * 86400000);

  const customers = await prisma.$queryRaw`
    SELECT
      c."id" AS "customerId",
      c."name",
      c."userId",
      COALESCE(SUM(pl."pointsChange"), 0)::int AS "currentBalance"
    FROM "Customer" c
    JOIN "PointsLedger" pl ON pl."customerId" = c."id"
    WHERE c."isActive" = true
    GROUP BY c."id", c."name", c."userId"
    HAVING SUM(pl."pointsChange") > 100
      AND NOT EXISTS (
        SELECT 1 FROM "Transaction" t
        WHERE t."customerId" = c."id" AND t.type = 'redeem' AND t.status = 'completed'
        AND t."createdAt" > ${cutoff}
      )
  `;

  return customers.map(c => ({
    customerId: c.customerId,
    userId: c.userId,
    name: c.name,
    currentBalance: c.currentBalance,
    tier: 'high_balance'
  }));
}

/**
 * Send re-engagement email to a customer.
 */
async function sendReengagementEmail(customer, tier) {
  if (!isEmailConfigured()) {
    return { success: false, reason: 'Email not configured' };
  }

  const user = await prisma.user.findUnique({
    where: { id: customer.userId },
    select: { email: true }
  });

  if (!user?.email) {
    return { success: false, reason: 'No email address' };
  }

  const dashboardUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/customer/dashboard`;

  const { subject, html } = generateReengagementEmail({
    customerName: customer.name,
    daysInactive: customer.daysInactive || 0,
    currentBalance: customer.currentBalance,
    tier,
    dashboardUrl
  });

  try {
    const result = await sendEmail(user.email, subject, html);
    return result;
  } catch (error) {
    return { success: false, reason: error.message };
  }
}

/**
 * Run the daily re-engagement campaign.
 * Identifies dormant customers and sends re-engagement emails.
 */
async function runReengagementCampaign() {
  const summary = {
    timestamp: new Date().toISOString(),
    dormant: { identified: 0, emailed: 0, failed: 0 },
    neverRedeemed: { identified: 0, emailed: 0, failed: 0 },
    highBalance: { identified: 0, emailed: 0, failed: 0 },
    errors: []
  };

  try {
    // Check deduplication — skip if already ran in last 24 hours
    const recentRun = await prisma.auditLog.findFirst({
      where: {
        action: 'REENGAGEMENT_CAMPAIGN_RUN',
        createdAt: { gt: new Date(Date.now() - 24 * 60 * 60 * 1000) }
      },
      select: { id: true }
    });

    if (recentRun) {
      return { ...summary, skipped: true, reason: 'Already ran in last 24 hours' };
    }

    // Process dormant customers
    const dormant = await identifyDormantCustomers();
    summary.dormant.identified = dormant.length;

    for (const customer of dormant) {
      const tier = (customer.daysInactive !== null && customer.daysInactive >= 90) ? 'dormant_90' : 'dormant_60';
      const result = await sendReengagementEmail(customer, tier);
      if (result.success) summary.dormant.emailed++;
      else summary.dormant.failed++;
    }

    // Process never-redeemed customers (only every 7 days to avoid spam)
    const sevenDaysAgo = new Date(Date.now() - 7 * 86400000);
    const lastNeverRedeemedRun = await prisma.auditLog.findFirst({
      where: {
        action: 'REENGAGEMENT_NEVER_REDEEMED',
        createdAt: { gt: sevenDaysAgo }
      },
      select: { id: true }
    });

    if (!lastNeverRedeemedRun) {
      const neverRedeemed = await identifyNeverRedeemed();
      summary.neverRedeemed.identified = neverRedeemed.length;

      for (const customer of neverRedeemed) {
        const result = await sendReengagementEmail(customer, 'never_redeemed');
        if (result.success) summary.neverRedeemed.emailed++;
        else summary.neverRedeemed.failed++;
      }
    }

    // Process high balance customers (only every 14 days)
    const fourteenDaysAgo = new Date(Date.now() - 14 * 86400000);
    const lastHighBalanceRun = await prisma.auditLog.findFirst({
      where: {
        action: 'REENGAGEMENT_HIGH_BALANCE',
        createdAt: { gt: fourteenDaysAgo }
      },
      select: { id: true }
    });

    if (!lastHighBalanceRun) {
      const highBalance = await identifyHighBalanceNoRedemption();
      summary.highBalance.identified = highBalance.length;

      for (const customer of highBalance) {
        const result = await sendReengagementEmail(customer, 'high_balance');
        if (result.success) summary.highBalance.emailed++;
        else summary.highBalance.failed++;
      }
    }

    // Log campaign run
    await createAuditLog(null, 'REENGAGEMENT_CAMPAIGN_RUN', null, null, summary, null);

  } catch (error) {
    summary.errors.push(error.message);
  }

  return summary;
}

module.exports = {
  identifyDormantCustomers,
  identifyNeverRedeemed,
  identifyHighBalanceNoRedemption,
  sendReengagementEmail,
  runReengagementCampaign
};

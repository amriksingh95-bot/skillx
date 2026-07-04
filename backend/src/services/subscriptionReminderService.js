const prisma = require('../lib/prisma');
const { createAuditLog } = require('./auditLogService');
const { isEmailConfigured, sendEmail } = require('./emailService');
const { generateReminderEmail, REMINDER_CONFIG } = require('../templates/subscriptionReminder');

const REMINDER_TIERS = Object.keys(REMINDER_CONFIG);

/**
 * Compute days remaining between now and a future date.
 * Returns positive number of days, 0 if same day, negative if past.
 */
function daysUntil(date) {
  const now = new Date();
  const target = new Date(date);
  const diffMs = target.getTime() - now.getTime();
  return Math.ceil(diffMs / (1000 * 60 * 60 * 24));
}

/**
 * Classify a subscription into a reminder tier based on its status and dates.
 * Returns null if no reminder needed at this time.
 */
function classifyReminderTier(subscription) {
  const { status, endDate, gracePeriodEnd } = subscription;

  if (status === 'active') {
    const days = daysUntil(endDate);
    if (days === 30) return { tier: '30_day', days };
    if (days === 15) return { tier: '15_day', days };
    if (days === 7) return { tier: '7_day', days };
    if (days === 3) return { tier: '3_day', days };
    if (days === 1) return { tier: '1_day', days };
    if (days === 0) return { tier: 'expiry_day', days };
  }

  if (status === 'grace_period' && gracePeriodEnd) {
    const daysGrace = daysUntil(gracePeriodEnd);
    if (daysGrace === 14 || daysGrace === 15) return { tier: 'grace_period_start', days: daysGrace };
    if (daysGrace <= 3 && daysGrace >= 1) return { tier: 'grace_period_end', days: daysGrace };
    if (daysGrace === 0) return { tier: 'grace_period_end', days: 0 };
  }

  return null;
}

/**
 * Check if a reminder was already sent for this subscription+tier in the last 24 hours.
 */
async function wasRecentlyReminded(merchantId, tier) {
  const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const existing = await prisma.auditLog.findFirst({
    where: {
      merchantId,
      action: 'SUBSCRIPTION_REMINDER_SENT',
      metadata: { path: ['tier'], equals: tier },
      createdAt: { gt: cutoff }
    },
    select: { id: true }
  });
  return !!existing;
}

/**
 * Send a reminder email to the merchant.
 */
async function sendReminderEmail(subscription, tier, daysRemaining) {
  if (!isEmailConfigured()) {
    return { success: false, reason: 'Email not configured' };
  }

  const merchant = subscription.merchant;
  const user = merchant?.user;
  const plan = subscription.plan;

  if (!user?.email) {
    return { success: false, reason: 'No email address' };
  }

  const renewalUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/merchant/subscription`;

  const { subject, html } = generateReminderEmail({
    merchantName: merchant.businessName || user.name || 'Merchant',
    planName: plan.name,
    planPrice: plan.price,
    planDuration: plan.durationDays,
    expiryDate: subscription.endDate,
    graceEndDate: subscription.gracePeriodEnd,
    tier,
    daysRemaining,
    renewalUrl
  });

  try {
    const result = await sendEmail(user.email, subject, html);
    return result;
  } catch (error) {
    return { success: false, reason: error.message };
  }
}

/**
 * Log reminder to AuditLog for deduplication and history.
 */
async function logReminder(merchantId, subscriptionId, tier, channel, status, extra = {}) {
  try {
    await createAuditLog(
      null,
      'SUBSCRIPTION_REMINDER_SENT',
      'MerchantSubscription',
      subscriptionId,
      {
        tier,
        channel,
        status,
        ...extra
      },
      null
    );
  } catch (error) {
    // Silent fail — logging failure shouldn't block reminders
  }
}

/**
 * Process a single subscription — classify, dedup, send, log.
 * Returns {sent, skipped, failed, reason?}
 */
async function processSubscription(subscription) {
  const merchantId = subscription.merchantId;

  // Classify tier
  const classification = classifyReminderTier(subscription);
  if (!classification) {
    return { skipped: true, reason: 'no_tier_match' };
  }

  const { tier, days } = classification;

  // Deduplication check
  const alreadyReminded = await wasRecentlyReminded(merchantId, tier);
  if (alreadyReminded) {
    return { skipped: true, reason: 'already_reminded', tier };
  }

  // Send email
  const emailResult = await sendReminderEmail(subscription, tier, days);

  if (emailResult.success) {
    await logReminder(merchantId, subscription.id, tier, 'email', 'sent', {
      daysRemaining: days,
      email: subscription.merchant?.user?.email
    });
    return { sent: true, tier, days };
  } else {
    await logReminder(merchantId, subscription.id, tier, 'email', 'failed', {
      reason: emailResult.reason,
      daysRemaining: days
    });
    return { failed: true, reason: emailResult.reason, tier };
  }
}

/**
 * Main function: Run the daily subscription reminder check.
 * Queries all active/grace_period subscriptions and processes each.
 * Returns summary: { total, sent, skipped, failed, errors }
 */
async function runDailyReminders() {
  const summary = {
    timestamp: new Date().toISOString(),
    total: 0,
    sent: 0,
    skipped: 0,
    failed: 0,
    errors: [],
    details: []
  };

  try {
    // Fetch all active and grace_period subscriptions with merchant/user/plan data
    const subscriptions = await prisma.merchantSubscription.findMany({
      where: {
        status: { in: ['active', 'grace_period'] }
      },
      include: {
        merchant: {
          include: {
            user: {
              select: { email: true, name: true }
            }
          }
        },
        plan: true
      }
    });

    summary.total = subscriptions.length;

    // Process each subscription
    for (const subscription of subscriptions) {
      try {
        const result = await processSubscription(subscription);
        summary.details.push({
          merchantId: subscription.merchantId,
          merchantName: subscription.merchant?.businessName || 'Unknown',
          ...result
        });

        if (result.sent) summary.sent++;
        else if (result.skipped) summary.skipped++;
        else if (result.failed) summary.failed++;
      } catch (error) {
        summary.failed++;
        summary.errors.push({
          merchantId: subscription.merchantId,
          error: error.message
        });
      }
    }
  } catch (error) {
    summary.errors.push({ error: `Database query failed: ${error.message}` });
  }

  return summary;
}

/**
 * Get expiring subscriptions grouped by tier for admin dashboard.
 * Used by the admin endpoint.
 */
async function getExpiringSubscriptions() {
  const result = {
    expiringIn30Days: [],
    expiringIn15Days: [],
    expiringIn7Days: [],
    inGracePeriod: [],
    gracePeriodEnding: [],
    stats: {
      expiringIn30Days: 0,
      expiringIn15Days: 0,
      expiringIn7Days: 0,
      inGracePeriod: 0,
      gracePeriodEnding: 0
    }
  };

  const subscriptions = await prisma.merchantSubscription.findMany({
    where: {
      status: { in: ['active', 'grace_period'] }
    },
    include: {
      merchant: {
        include: {
          user: {
            select: { email: true, name: true }
          }
        }
      },
      plan: true
    },
    orderBy: { endDate: 'asc' }
  });

  for (const sub of subscriptions) {
    const merchantInfo = {
      id: sub.id,
      merchantId: sub.merchantId,
      businessName: sub.merchant?.businessName || 'Unknown',
      ownerName: sub.merchant?.user?.name || 'Unknown',
      email: sub.merchant?.user?.email || 'N/A',
      planName: sub.plan?.name || 'N/A',
      planPrice: sub.plan?.price || 0,
      status: sub.status,
      startDate: sub.startDate,
      endDate: sub.endDate,
      gracePeriodEnd: sub.gracePeriodEnd,
      daysRemaining: daysUntil(sub.status === 'grace_period' ? sub.gracePeriodEnd : sub.endDate)
    };

    if (sub.status === 'active') {
      const days = daysUntil(sub.endDate);

      if (days <= 30 && days > 15) {
        result.expiringIn30Days.push(merchantInfo);
        result.stats.expiringIn30Days++;
      } else if (days <= 15 && days > 7) {
        result.expiringIn15Days.push(merchantInfo);
        result.stats.expiringIn15Days++;
      } else if (days <= 7) {
        result.expiringIn7Days.push(merchantInfo);
        result.stats.expiringIn7Days++;
      }
    } else if (sub.status === 'grace_period') {
      const daysGrace = daysUntil(sub.gracePeriodEnd);

      if (daysGrace <= 3) {
        result.gracePeriodEnding.push(merchantInfo);
      }
      result.inGracePeriod.push(merchantInfo);
      result.stats.inGracePeriod++;
    }
  }

  return result;
}

module.exports = {
  classifyReminderTier,
  wasRecentlyReminded,
  processSubscription,
  runDailyReminders,
  getExpiringSubscriptions,
  daysUntil
};

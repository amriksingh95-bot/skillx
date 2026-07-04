const prisma = require('../lib/prisma');

const GRACE_PERIOD_DAYS = 15;

/**
 * Get all active subscription plans.
 * @returns {Promise<Array>}
 */
async function getActivePlans() {
  return prisma.subscriptionPlan.findMany({
    where: { isActive: true },
    orderBy: { price: 'asc' }
  });
}

/**
 * Get a subscription plan by ID.
 * @param {string} planId
 * @returns {Promise<object>}
 */
async function getPlanById(planId) {
  return prisma.subscriptionPlan.findUnique({
    where: { id: planId }
  });
}

/**
 * Create a new subscription plan (admin only).
 * @param {object} data
 * @returns {Promise<object>}
 */
async function createPlan({ name, displayName, price, durationDays, features }) {
  return prisma.subscriptionPlan.create({
    data: {
      name: name.toLowerCase().trim(),
      displayName,
      price,
      durationDays,
      features: features || null
    }
  });
}

/**
 * Update a subscription plan (admin only).
 * @param {string} planId
 * @param {object} data
 * @returns {Promise<object>}
 */
async function updatePlan(planId, { displayName, price, durationDays, features, isActive }) {
  return prisma.subscriptionPlan.update({
    where: { id: planId },
    data: {
      ...(displayName !== undefined && { displayName }),
      ...(price !== undefined && { price }),
      ...(durationDays !== undefined && { durationDays }),
      ...(features !== undefined && { features }),
      ...(isActive !== undefined && { isActive })
    }
  });
}

/**
 * Get a merchant's current subscription.
 * @param {string} merchantId
 * @returns {Promise<object|null>}
 */
async function getMerchantSubscription(merchantId) {
  const subscription = await prisma.merchantSubscription.findFirst({
    where: {
      merchantId,
      status: { in: ['active', 'grace_period'] }
    },
    include: { plan: true },
    orderBy: { createdAt: 'desc' }
  });

  if (!subscription) return null;

  const now = new Date();

  // Check if subscription needs status update
  if (subscription.status === 'active' && subscription.endDate < now) {
    // Move to grace period
    const gracePeriodEnd = new Date(subscription.endDate);
    gracePeriodEnd.setDate(gracePeriodEnd.getDate() + GRACE_PERIOD_DAYS);

    return prisma.merchantSubscription.update({
      where: { id: subscription.id },
      data: {
        status: 'grace_period',
        gracePeriodEnd
      },
      include: { plan: true }
    });
  }

  if (subscription.status === 'grace_period' && subscription.gracePeriodEnd < now) {
    // Move to expired
    return prisma.merchantSubscription.update({
      where: { id: subscription.id },
      data: { status: 'expired' },
      include: { plan: true }
    });
  }

  return subscription;
}

/**
 * Check if a merchant has an active subscription (or grace period).
 * @param {string} merchantId
 * @returns {Promise<{isActive: boolean, status: string, subscription: object|null, daysRemaining: number|null}>}
 */
async function checkMerchantSubscriptionStatus(merchantId) {
  const subscription = await getMerchantSubscription(merchantId);

  if (!subscription) {
    return {
      isActive: true, // Allow basic operations for merchants without subscription
      status: 'none',
      subscription: null,
      daysRemaining: null,
      message: 'No active subscription. Subscribe to access full features.'
    };
  }

  const now = new Date();
  let daysRemaining = null;

  if (subscription.status === 'active') {
    daysRemaining = Math.ceil((subscription.endDate - now) / (1000 * 60 * 60 * 24));
    return {
      isActive: true,
      status: 'active',
      subscription,
      daysRemaining,
      message: `Active subscription. ${daysRemaining} days remaining.`
    };
  }

  if (subscription.status === 'grace_period') {
    daysRemaining = Math.ceil((subscription.gracePeriodEnd - now) / (1000 * 60 * 60 * 24));
    return {
      isActive: true, // Still active during grace period
      status: 'grace_period',
      subscription,
      daysRemaining,
      message: `Subscription expired. Grace period: ${daysRemaining} days remaining. Please renew.`
    };
  }

  // Expired or cancelled
  return {
    isActive: false,
    status: subscription.status,
    subscription,
    daysRemaining: null,
    message: 'Subscription expired. Please renew to continue.'
  };
}

/**
 * Purchase or renew a subscription for a merchant.
 * @param {string} merchantId
 * @param {string} planId
 * @param {string} [paymentRef]
 * @returns {Promise<object>}
 */
async function purchaseSubscription(merchantId, planId, paymentRef = null) {
  const plan = await getPlanById(planId);
  if (!plan || !plan.isActive) {
    throw new Error('Invalid or inactive subscription plan.');
  }

  return createMerchantSubscriptionRecord(merchantId, plan, paymentRef);
}

/**
 * Create a subscription for a merchant (admin override - allows inactive plans).
 * @param {string} merchantId
 * @param {string} planId
 * @param {string} [paymentRef]
 * @returns {Promise<object>}
 */
async function createMerchantSubscriptionRecord(merchantId, plan, paymentRef = null) {
  const now = new Date();
  const startDate = now;
  const endDate = new Date(now);
  endDate.setDate(endDate.getDate() + plan.durationDays);

  const gracePeriodEnd = new Date(endDate);
  gracePeriodEnd.setDate(gracePeriodEnd.getDate() + GRACE_PERIOD_DAYS);

  return prisma.$transaction(async (tx) => {
    // Cancel any existing active/grace_period subscriptions
    await tx.merchantSubscription.updateMany({
      where: {
        merchantId,
        status: { in: ['active', 'grace_period'] }
      },
      data: { status: 'cancelled' }
    });

    // Create new subscription
    const subscription = await tx.merchantSubscription.create({
      data: {
        merchantId,
        planId: plan.id,
        startDate,
        endDate,
        status: 'active',
        gracePeriodEnd,
        paymentRef
      },
      include: { plan: true }
    });

    await tx.merchant.update({
      where: { id: merchantId },
      data: {
        pointsBalance: { increment: 1000 }
      }
    });

    return subscription;
  });
}

/**
 * Renew an existing subscription (extends from current end date or now).
 * @param {string} merchantId
 * @param {string} subscriptionId
 * @param {string} [paymentRef]
 * @returns {Promise<object>}
 */
async function renewSubscription(merchantId, subscriptionId, paymentRef = null) {
  const existing = await prisma.merchantSubscription.findUnique({
    where: { id: subscriptionId },
    include: { plan: true }
  });

  if (!existing || existing.merchantId !== merchantId) {
    throw new Error('Subscription not found.');
  }

  const plan = existing.plan;
  if (!plan || !plan.isActive) {
    throw new Error('Original plan is no longer active.');
  }

  // Extend from now or from existing end date, whichever is later
  const baseDate = new Date() > existing.endDate ? new Date() : existing.endDate;
  const newEndDate = new Date(baseDate);
  newEndDate.setDate(newEndDate.getDate() + plan.durationDays);

  const newGracePeriodEnd = new Date(newEndDate);
  newGracePeriodEnd.setDate(newGracePeriodEnd.getDate() + GRACE_PERIOD_DAYS);

  return prisma.merchantSubscription.update({
    where: { id: subscriptionId },
    data: {
      endDate: newEndDate,
      gracePeriodEnd: newGracePeriodEnd,
      status: 'active',
      paymentRef: paymentRef || existing.paymentRef
    },
    include: { plan: true }
  });
}

/**
 * Get all merchant subscriptions (admin, paginated).
 * @param {object} options
 * @returns {Promise<{subscriptions: Array, total: number}>}
 */
async function getAllMerchantSubscriptions({ page = 1, limit = 20, status, merchantId } = {}) {
  const skip = (page - 1) * limit;
  const whereCondition = {
    ...(status ? { status } : {}),
    ...(merchantId ? { merchantId } : {})
  };

  const [subscriptions, total] = await prisma.$transaction([
    prisma.merchantSubscription.findMany({
      where: whereCondition,
      include: {
        merchant: {
          select: { id: true, businessName: true, ownerName: true }
        },
        plan: true
      },
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit
    }),
    prisma.merchantSubscription.count({ where: whereCondition })
  ]);

  return { subscriptions, total };
}

/**
 * Calculate redemption fee for a given points amount.
 * @param {number} pointsToRedeem
 * @param {object} settings - RewardSettings record
 * @returns {{grossDiscount: number, feePercent: number, platformFee: number, netAmount: number}}
 */
function calculateRedemptionFee(pointsToRedeem, settings) {
  const rupeesPerPoint = parseFloat(settings.rupeesPerPoint);
  const feePercent = settings.redemptionFeePercent !== undefined && settings.redemptionFeePercent !== null
    ? parseFloat(settings.redemptionFeePercent)
    : 5;

  const grossDiscount = pointsToRedeem * rupeesPerPoint;
  const platformFee = grossDiscount * (feePercent / 100);
  const netAmount = grossDiscount - platformFee;

  return {
    grossDiscount: parseFloat(grossDiscount.toFixed(2)),
    feePercent,
    platformFee: parseFloat(platformFee.toFixed(2)),
    netAmount: parseFloat(netAmount.toFixed(2))
  };
}

module.exports = {
  GRACE_PERIOD_DAYS,
  getActivePlans,
  getPlanById,
  createPlan,
  updatePlan,
  getMerchantSubscription,
  checkMerchantSubscriptionStatus,
  purchaseSubscription,
  createMerchantSubscriptionRecord,
  renewSubscription,
  getAllMerchantSubscriptions,
  calculateRedemptionFee
};

const prisma = require('../lib/prisma');
const subscriptionService = require('../services/subscriptionService');
const { createAuditLog } = require('../services/auditLogService');

/**
 * Get all subscription plans (admin - includes inactive plans).
 */
async function getPlans(req, res, next) {
  try {
    const plans = await prisma.subscriptionPlan.findMany({
      orderBy: { price: 'asc' }
    });
    res.status(200).json({
      success: true,
      message: 'Subscription plans retrieved successfully.',
      data: plans
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Get a specific subscription plan.
 */
async function getPlan(req, res, next) {
  const { id } = req.params;

  try {
    const plan = await subscriptionService.getPlanById(id);
    if (!plan) {
      const err = new Error('Subscription plan not found.');
      err.status = 404;
      err.code = 'NOT_FOUND';
      return next(err);
    }

    res.status(200).json({
      success: true,
      message: 'Subscription plan retrieved.',
      data: plan
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Create a new subscription plan.
 */
async function createPlan(req, res, next) {
  const { name, displayName, price, durationDays, features } = req.body;
  const ipAddress = req.ip;

  try {
    const plan = await subscriptionService.createPlan({
      name,
      displayName,
      price,
      durationDays,
      features
    });

    await createAuditLog(
      req.user.id,
      'SUBSCRIPTION_PLAN_CREATED',
      'SubscriptionPlan',
      plan.id,
      { name, price, durationDays },
      ipAddress
    );

    res.status(201).json({
      success: true,
      message: 'Subscription plan created successfully.',
      data: plan
    });
  } catch (error) {
    if (error.code === 'P2002') {
      const err = new Error('A plan with this name already exists.');
      err.status = 400;
      err.code = 'DUPLICATE';
      return next(err);
    }
    next(error);
  }
}

/**
 * Update a subscription plan.
 */
async function updatePlan(req, res, next) {
  const { id } = req.params;
  const { displayName, price, durationDays, features, isActive } = req.body;
  const ipAddress = req.ip;

  try {
    const existing = await subscriptionService.getPlanById(id);
    if (!existing) {
      const err = new Error('Subscription plan not found.');
      err.status = 404;
      err.code = 'NOT_FOUND';
      return next(err);
    }

    const plan = await subscriptionService.updatePlan(id, {
      displayName,
      price,
      durationDays,
      features,
      isActive
    });

    await createAuditLog(
      req.user.id,
      'SUBSCRIPTION_PLAN_UPDATED',
      'SubscriptionPlan',
      plan.id,
      { displayName, price, durationDays, isActive },
      ipAddress
    );

    res.status(200).json({
      success: true,
      message: 'Subscription plan updated successfully.',
      data: plan
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Get all merchant subscriptions (paginated).
 */
async function getMerchantSubscriptions(req, res, next) {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 20;
  const { status, merchantId } = req.query;

  try {
    const result = await subscriptionService.getAllMerchantSubscriptions({
      page,
      limit,
      status,
      merchantId
    });

    res.status(200).json({
      success: true,
      message: 'Merchant subscriptions retrieved successfully.',
      data: {
        subscriptions: result.subscriptions,
        pagination: {
          total: result.total,
          page,
          limit,
          totalPages: Math.ceil(result.total / limit)
        }
      }
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Get a specific merchant subscription.
 */
async function getMerchantSubscriptionDetail(req, res, next) {
  const { id } = req.params;

  try {
    const subscription = await prisma.merchantSubscription.findUnique({
      where: { id },
      include: {
        merchant: {
          select: { id: true, businessName: true, ownerName: true }
        },
        plan: true
      }
    });

    if (!subscription) {
      const err = new Error('Subscription not found.');
      err.status = 404;
      err.code = 'NOT_FOUND';
      return next(err);
    }

    res.status(200).json({
      success: true,
      message: 'Subscription detail retrieved.',
      data: subscription
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Create a subscription for a merchant (admin override).
 */
async function createMerchantSubscription(req, res, next) {
  const { merchantId, planId, paymentRef } = req.body;
  const ipAddress = req.ip;

  try {
    const plan = await subscriptionService.getPlanById(planId);
    if (!plan) {
      const err = new Error('Invalid subscription plan.');
      err.status = 400;
      err.code = 'INVALID_PLAN';
      return next(err);
    }

    const subscription = await subscriptionService.createMerchantSubscriptionRecord(
      merchantId,
      plan,
      paymentRef
    );

    await createAuditLog(
      req.user.id,
      'MERCHANT_SUBSCRIPTION_CREATED',
      'MerchantSubscription',
      subscription.id,
      { merchantId, planId },
      ipAddress
    );

    res.status(201).json({
      success: true,
      message: 'Subscription created for merchant successfully.',
      data: subscription
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Renew a merchant subscription.
 */
async function renewMerchantSubscription(req, res, next) {
  const { id } = req.params;
  const { paymentRef } = req.body;
  const ipAddress = req.ip;

  try {
    // Look up the subscription to get its merchantId
    const existing = await prisma.merchantSubscription.findUnique({
      where: { id },
      select: { merchantId: true }
    });

    if (!existing) {
      const err = new Error('Subscription not found.');
      err.status = 404;
      err.code = 'NOT_FOUND';
      return next(err);
    }

    const subscription = await subscriptionService.renewSubscription(
      existing.merchantId,
      id,
      paymentRef
    );

    await createAuditLog(
      req.user.id,
      'MERCHANT_SUBSCRIPTION_RENEWED',
      'MerchantSubscription',
      subscription.id,
      { newEndDate: subscription.endDate },
      ipAddress
    );

    res.status(200).json({
      success: true,
      message: 'Subscription renewed successfully.',
      data: subscription
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Get subscription status for a merchant.
 */
async function getMerchantSubscriptionStatus(req, res, next) {
  const { merchantId } = req.params;

  try {
    const status = await subscriptionService.checkMerchantSubscriptionStatus(merchantId);

    res.status(200).json({
      success: true,
      message: 'Subscription status retrieved.',
      data: status
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  getPlans,
  getPlan,
  createPlan,
  updatePlan,
  getMerchantSubscriptions,
  getMerchantSubscriptionDetail,
  createMerchantSubscription,
  renewMerchantSubscription,
  getMerchantSubscriptionStatus
};

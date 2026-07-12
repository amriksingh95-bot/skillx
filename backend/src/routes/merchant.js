const express = require('express');
const { body, param } = require('express-validator');
const { authenticate, authorize, requireActiveMerchant } = require('../middleware/auth');
const { validate } = require('../middleware/validator');
const { validatePoints, validateAmount, handleValidationErrors } = require('../middleware/validators');
const merchantController = require('../controllers/merchantController');
const subscriptionService = require('../services/subscriptionService');
const { upload } = require('../controllers/merchantController');
const topUpController = require('../controllers/topUpController');
const adPaymentController = require('../controllers/adPaymentController');
const prisma = require('../lib/prisma');

const router = express.Router();

// Public ad tracking routes (no auth required)
router.patch(
  '/ads/:id/impression',
  [
    param('id').isUUID().withMessage('Invalid ID format.')
  ],
  validate,
  merchantController.trackImpression
);

router.patch(
  '/ads/:id/click',
  [
    param('id').isUUID().withMessage('Invalid ID format.')
  ],
  validate,
  merchantController.trackClick
);

// All routes below require authentication
router.use(authenticate);

router.use(authorize('merchant'));

// Profile/status endpoint (accessible before active status)
router.get('/profile', async (req, res, next) => {
  try {
    const merchant = await prisma.merchant.findUnique({
      where: { userId: req.user.id },
      select: {
        id: true,
        businessName: true,
        ownerName: true,
        email: true,
        merchantCode: true,
        status: true,
        pointsBalance: true,
        address: true,
        city: true,
        landmark: true,
        category: true,
        googleMapsUrl: true,
        openingTime: true,
        closingTime: true,
        workingDays: true,
        alternativePhone: true,
        paymentScreenshot: true,
        createdAt: true
      }
    });

    res.status(200).json({
      success: true,
      data: merchant
    });
  } catch (error) {
    next(error);
  }
});

// Merchant profile update routes
router.put('/profile', merchantController.updateMerchantProfile);
router.put('/profile/password', merchantController.updateMerchantPassword);

// Subscription routes — accessible to approved/payment_pending merchants too
router.get('/subscription', async (req, res, next) => {
  try {
    const merchantId = req.user.merchantId;
    const status = await subscriptionService.checkMerchantSubscriptionStatus(merchantId);
    const plans = await subscriptionService.getActivePlans();

    res.status(200).json({
      success: true,
      message: 'Subscription status retrieved.',
      data: {
        ...status,
        availablePlans: plans,
        upiId: process.env.UPI_ID || ''
      }
    });
  } catch (error) {
    next(error);
  }
});

// Subscription History
router.get('/subscription/history', async (req, res, next) => {
  try {
    const merchantId = req.user.merchantId;

    const subscriptions = await prisma.merchantSubscription.findMany({
      where: { merchantId },
      include: { plan: true },
      orderBy: { createdAt: 'desc' }
    });

    res.status(200).json({
      success: true,
      message: 'Subscription history retrieved.',
      data: subscriptions
    });
  } catch (error) {
    next(error);
  }
});

// Renew Current Subscription
router.post(
  '/subscription/renew',
  [
    body('subscriptionId').isUUID().withMessage('Invalid subscription ID.'),
    body('paymentRef').trim().notEmpty().withMessage('Payment reference is required for renewal.')
  ],
  validate,
  async (req, res, next) => {
    try {
      const merchantId = req.user.merchantId;
      const { subscriptionId, paymentRef } = req.body;

      const subscription = await subscriptionService.renewSubscription(
        merchantId,
        subscriptionId,
        paymentRef
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
);

// Screenshot upload for payment proof (allowed before active status)
router.post(
  '/subscription/upload-screenshot',
  authenticate,
  authorize('merchant'),
  upload.single('screenshot'),
  merchantController.uploadPaymentScreenshot
);

// Screenshot upload for subscription renewal payment proof
router.post(
  '/subscription/renewal/upload-screenshot',
  [
    body('subscriptionId').isUUID().withMessage('Invalid subscription ID.')
  ],
  validate,
  authenticate,
  authorize('merchant'),
  upload.single('screenshot'),
  merchantController.uploadRenewalScreenshot
);

router.use(requireActiveMerchant);

router.get('/dashboard', merchantController.getDashboard);
router.get('/customer-insights', merchantController.getCustomerInsights);

router.post(
  '/earn',
  [
    validateAmount,
    validatePoints,
    body().custom((value) => {
      if (!value.customerId && !value.mobile) {
        throw new Error('Either customerId or mobile is required.');
      }
      if (value.mobile && !/^\d{10}$/.test(value.mobile)) {
        throw new Error('Mobile must be exactly 10 digits.');
      }
      return true;
    })
  ],
  handleValidationErrors,
  merchantController.earn
);

router.post(
  '/redeem',
  [
    validatePoints,
    body('pointsToRedeem').notEmpty().isInt({ min: 1 }).withMessage('Points to redeem is required.'),
    body('purchaseAmount').notEmpty().withMessage('Purchase amount is required.').isFloat({ min: 0.01 }).withMessage('Purchase amount must be a positive number.'),
    body().custom((value) => {
      if (!value.customerId && !value.mobile) {
        throw new Error('Either customerId or mobile is required.');
      }
      if (value.mobile && !/^\d{10}$/.test(value.mobile)) {
        throw new Error('Mobile must be exactly 10 digits.');
      }
      return true;
    })
  ],
  handleValidationErrors,
  merchantController.redeem
);

router.get('/transactions', merchantController.getTransactions);

router.get('/points-health', merchantController.getPointsHealth);

router.get('/repeat-customers', merchantController.getRepeatCustomers);

router.get('/roi-report', merchantController.getROIReport);

router.get('/top-customers', merchantController.getTopCustomers);

router.get(
  '/customer/:identifier',
  [
    param('identifier').trim().notEmpty().withMessage('Customer ID or mobile is required.')
  ],
  validate,
  merchantController.lookupCustomer
);

router.post(
  '/customer/scan',
  [
    body('qrCode').notEmpty().withMessage('QR Code string is required.')
  ],
  validate,
  merchantController.scanCustomerQR
);

router.get(
  '/customer-by-qr/:qrString',
  [
    param('qrString').trim().notEmpty().withMessage('QR Code string is required.')
  ],
  validate,
  merchantController.getCustomerByQR
);

router.post(
  '/transfer-points',
  [
    body('customerId').notEmpty().withMessage('Customer ID is required.'),
    body('points').isInt({ min: 1 }).withMessage('Points to transfer must be a positive integer.')
  ],
  handleValidationErrors,
  merchantController.transferPoints
);

router.post(
  '/complaint',
  [
    body('type').trim().notEmpty().withMessage('Complaint type is required.'),
    body('description').trim().notEmpty().withMessage('Description is required.')
  ],
  handleValidationErrors,
  merchantController.submitComplaint
);

router.post(
  '/ads',
  [
    body('title').trim().notEmpty().withMessage('Title is required.'),
    body('package').isIn(['starter', 'growth', 'premium']).withMessage('Package must be starter, growth, or premium.')
  ],
  validate,
  merchantController.createAd
);

router.get('/ads', merchantController.getMyAds);

router.put(
  '/ads/:id',
  [
    param('id').isUUID().withMessage('Invalid ID format.')
  ],
  validate,
  merchantController.updateAd
);

router.delete(
  '/ads/:id',
  [
    param('id').isUUID().withMessage('Invalid ID format.')
  ],
  validate,
  merchantController.deleteAd
);

// Top-up routes
router.post(
  '/topup/request',
  [
    body('packageName').isIn(['starter', 'growth', 'pro']).withMessage('Package must be starter, growth, or pro.')
  ],
  validate,
  requireActiveMerchant,
  topUpController.requestTopUp
);

router.post(
  '/topup/upload-screenshot/:topUpId',
  [
    param('topUpId').isUUID().withMessage('Invalid ID format.')
  ],
  validate,
  topUpController.upload.single('screenshot'),
  topUpController.uploadTopUpScreenshot
);

router.get('/topup/history', topUpController.getHistory);

// Ad Payment routes
router.post(
  '/ad-payment/request',
  [
    body('advertisementId').isUUID().withMessage('Invalid advertisement ID.')
  ],
  validate,
  requireActiveMerchant,
  adPaymentController.requestAdPayment
);

router.post(
  '/ad-payment/upload-screenshot/:paymentId',
  [
    param('paymentId').isUUID().withMessage('Invalid ID format.')
  ],
  validate,
  adPaymentController.upload.single('screenshot'),
  adPaymentController.uploadAdPaymentScreenshot
);

module.exports = router;

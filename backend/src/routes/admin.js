const express = require('express');
const { body, param, query } = require('express-validator');
const { authenticate, authorize } = require('../middleware/auth');
const { validate } = require('../middleware/validator');
const { validateMobile, validateEmail, handleValidationErrors } = require('../middleware/validators');
const adminController = require('../controllers/adminController');
const subscriptionController = require('../controllers/subscriptionController');
const adminTopUpController = require('../controllers/adminTopUpController');

const router = express.Router();

// Enforce auth and super_admin role for all administrative endpoints
router.use(authenticate);
router.use(authorize('super_admin'));

router.get('/dashboard', adminController.getDashboard);

const categories = ['grocery', 'medical', 'doctor', 'cafe', 'electronics', 'fashion', 'other'];

router.get('/merchants', adminController.getMerchants);

router.get(
  '/merchants/pending-payments',
  adminController.getPendingPayments
);

router.get(
  '/merchants/:id',
  [param('id').isUUID().withMessage('Invalid ID format.')],
  validate,
  adminController.getMerchantDetail
);

router.post(
  '/merchants',
  [
    body('businessName').trim().notEmpty().withMessage('Business name is required.'),
    body('ownerName').trim().notEmpty().withMessage('Owner name is required.'),
    body('mobile').isLength({ min: 10, max: 10 }).isNumeric().withMessage('Mobile must be exactly 10 digits.'),
    body('email').optional({ checkFalsy: true }).isEmail().withMessage('Invalid email format.'),
    body('category').trim().notEmpty().withMessage('Category is required.'),
    body('password').optional({ checkFalsy: true }).isLength({ min: 8 }).withMessage('Password must be at least 8 characters long.'),
    body('latitude').optional({ checkFalsy: true }).isFloat().toFloat().withMessage('Latitude must be a valid float.'),
    body('longitude').optional({ checkFalsy: true }).isFloat().toFloat().withMessage('Longitude must be a valid float.'),
    body('googleMapsUrl').optional({ checkFalsy: true }).isURL().withMessage('Google Maps URL must be a valid link.'),
    body('landmark').optional({ checkFalsy: true }).trim(),
    body('openingTime').optional({ checkFalsy: true }).trim(),
    body('closingTime').optional({ checkFalsy: true }).trim(),
    body('workingDays').optional({ checkFalsy: true }).trim(),
    body('isOpen').optional().isBoolean().toBoolean()
  ],
  validate,
  adminController.createMerchant
);

router.put(
  '/merchants/:id',
  [
    param('id').isUUID().withMessage('Invalid ID format.'),
    body('businessName').trim().notEmpty().withMessage('Business name is required.'),
    body('ownerName').trim().notEmpty().withMessage('Owner name is required.'),
    validateMobile,
    validateEmail,
    body('category').trim().notEmpty().withMessage('Category is required.'),
    body('latitude').optional({ checkFalsy: true }).isFloat().toFloat().withMessage('Latitude must be a valid float.'),
    body('longitude').optional({ checkFalsy: true }).isFloat().toFloat().withMessage('Longitude must be a valid float.'),
    body('googleMapsUrl').optional({ checkFalsy: true }).trim(),
    body('landmark').optional({ checkFalsy: true }).trim(),
    body('openingTime').optional({ checkFalsy: true }).trim(),
    body('closingTime').optional({ checkFalsy: true }).trim(),
    body('workingDays').optional({ checkFalsy: true }).trim(),
    body('isOpen').optional().isBoolean().toBoolean()
  ],
  handleValidationErrors,
  adminController.updateMerchant
);

router.patch(
  '/merchants/:id/status',
  [
    param('id').isUUID().withMessage('Invalid ID format.'),
    body('action').isIn(['suspend', 'deactivate', 'reactivate']).withMessage('Invalid action.')
  ],
  validate,
  adminController.setMerchantStatus
);

router.post(
  '/merchants/:id/reset-password',
  [
    param('id').isUUID().withMessage('Invalid ID format.'),
    body('newPassword').isLength({ min: 6 }).withMessage('Password must be at least 6 characters long.')
  ],
  validate,
  adminController.resetMerchantPassword
);

router.patch(
  '/merchants/:id/approve',
  [
    param('id').isUUID().withMessage('Invalid ID format.')
  ],
  validate,
  adminController.approveMerchant
);

router.patch(
  '/merchants/:id/reject',
  [
    param('id').isUUID().withMessage('Invalid ID format.'),
    body('reason').optional().trim()
  ],
  validate,
  adminController.rejectMerchant
);

router.get(
  '/merchants/pending-payments',
  adminController.getPendingPayments
);

router.patch(
  '/merchants/:id/confirm-payment',
  [
    param('id').isUUID().withMessage('Invalid ID format.')
  ],
  validate,
  adminController.confirmMerchantPayment
);

router.patch(
  '/merchants/:id/reject-payment',
  [
    param('id').isUUID().withMessage('Invalid ID format.')
  ],
  validate,
  adminController.rejectMerchantPayment
);

router.patch(
  '/merchants/:id/confirm-renewal',
  [
    param('id').isUUID().withMessage('Invalid ID format.'),
    body('paymentRef').optional().trim().notEmpty().withMessage('Payment reference cannot be empty.')
  ],
  validate,
  adminController.confirmRenewalPayment
);

router.patch(
  '/merchants/:id/reject-renewal',
  [
    param('id').isUUID().withMessage('Invalid ID format.')
  ],
  validate,
  adminController.rejectRenewalPayment
);

router.get('/customers', adminController.getCustomers);

router.post(
  '/customers',
  [
    body('name').trim().notEmpty().withMessage('Name is required.'),
    body('mobile').isLength({ min: 10, max: 10 }).isNumeric().withMessage('Mobile must be exactly 10 digits.'),
    body('email').optional({ checkFalsy: true }).isEmail().withMessage('Invalid email format.'),
    body('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters long.'),
    body('city').optional({ checkFalsy: true }).trim()
  ],
  validate,
  adminController.createCustomer
);

router.get(
  '/customers/:id',
  [param('id').isUUID().withMessage('Invalid ID format.')],
  validate,
  adminController.getCustomerDetail
);

router.patch(
  '/customers/:id/toggle',
  [param('id').isUUID().withMessage('Invalid ID format.')],
  validate,
  adminController.toggleCustomer
);

router.put(
  '/customers/:id',
  [
    param('id').isUUID().withMessage('Invalid ID format.'),
    body('name').trim().notEmpty().withMessage('Name is required.'),
    validateMobile,
    validateEmail,
    body('dateOfBirth').optional({ checkFalsy: true }).isISO8601().toDate().withMessage('Invalid date format for Date of Birth.'),
    body('gender').optional({ checkFalsy: true }).isIn(['Male', 'Female', 'Other', 'Prefer not to say']).withMessage('Invalid gender value.'),
    body('city').optional({ checkFalsy: true }).trim(),
    body('pinCode').optional({ checkFalsy: true }).isLength({ min: 6, max: 6 }).isNumeric().withMessage('Pin code must be a 6 digit number.'),
    body('area').optional({ checkFalsy: true }).trim(),
    body('occupation').optional({ checkFalsy: true }).trim(),
    body('maritalStatus').optional({ checkFalsy: true }).isIn(['Single', 'Married', 'Other']).withMessage('Invalid marital status.'),
    body('anniversaryDate').optional({ checkFalsy: true }).isISO8601().toDate().withMessage('Invalid date format for Anniversary Date.'),
    body('numberOfChildren').optional({ checkFalsy: true }).isInt({ min: 0 }).toInt().withMessage('Number of children must be a non-negative integer.'),
    body('preferredLanguage').optional().isIn(['English', 'Hindi', 'Punjabi', 'Other']).withMessage('Invalid preferred language.'),
    body('communicationPref').optional().isIn(['email', 'whatsapp', 'sms', 'all']).withMessage('Invalid communication preference.'),
    body('favouriteCategories').optional().isArray().withMessage('Favourite categories must be an array.'),
    body('dietaryPreference').optional({ checkFalsy: true }).isIn(['Vegetarian', 'Non-Vegetarian', 'Vegan', 'No preference']).withMessage('Invalid dietary preference.'),
    body('notificationOptIn').optional().isBoolean().toBoolean().withMessage('Notification opt-in must be a boolean.'),
    body('profilePhoto').optional({ checkFalsy: true }).isString().withMessage('Invalid profile photo path.')
  ],
  handleValidationErrors,
  adminController.updateCustomer
);

router.post(
  '/customers/:id/reset-password',
  [
    param('id').isUUID().withMessage('Invalid ID format.'),
    body('newPassword').isLength({ min: 6 }).withMessage('Password must be at least 6 characters long.')
  ],
  validate,
  adminController.resetCustomerPassword
);

router.get(
  '/customers/:id/ledger',
  [param('id').isUUID().withMessage('Invalid ID format.')],
  validate,
  adminController.getCustomerLedger
);

router.get(
  '/customers/:id/transactions',
  [param('id').isUUID().withMessage('Invalid ID format.')],
  validate,
  adminController.getCustomerTransactions
);

router.get('/transactions', adminController.getTransactions);

router.post(
  '/transactions/:id/reverse',
  [param('id').isUUID().withMessage('Invalid ID format.')],
  validate,
  adminController.reverseTransaction
);

router.get('/reports/daily', adminController.getDailyReport);
router.get('/reports/monthly', adminController.getMonthlyReport);
router.get('/reports/export', adminController.exportReport);

router.get('/reward-settings', adminController.getRewardSettings);

router.put(
  '/reward-settings',
  [
    body('pointsPerRupee').isFloat({ min: 0.0001 }).withMessage('pointsPerRupee must be a positive float number.'),
    body('rupeesPerPoint').isFloat({ min: 0.0001 }).withMessage('rupeesPerPoint must be a positive float number.'),
    body('minRedeemPoints').isInt({ min: 1 }).withMessage('minRedeemPoints must be a positive integer.'),
    body('pointsExpiryDays').optional().isInt({ min: 1, max: 3650 }).withMessage('pointsExpiryDays must be between 1 and 3650.'),
    body('redemptionFeePercent').optional().isFloat({ min: 0, max: 100 }).withMessage('redemptionFeePercent must be between 0 and 100.')
  ],
  validate,
  adminController.updateRewardSettings
);

router.get('/audit-logs', adminController.getAuditLogs);

router.get('/complaints', adminController.getComplaints);
router.patch(
  '/complaints/:id/status',
  [
    param('id').isUUID().withMessage('Invalid ID format.'),
    body('status').isIn(['Pending', 'In Progress', 'Resolved']).withMessage('Invalid status.')
  ],
  validate,
  adminController.updateComplaintStatus
);

router.get('/advertisements/stats', adminController.getAdStats);

router.get('/advertisements', adminController.getAdvertisements);

router.patch(
  '/advertisements/:id/status',
  [
    param('id').isUUID().withMessage('Invalid ID format.'),
    body('status').isIn(['approved', 'rejected', 'expired', 'live', 'paused']).withMessage('Invalid status.')
  ],
  validate,
  adminController.updateAdStatus
);

// Reports – Points Liability Trend & Merchant Health
router.get('/reports/points-liability-trend', adminController.getPointsLiabilityTrend);
router.get('/reports/merchant-health', adminController.getMerchantHealth);

// Fee Revenue Routes
router.get('/fee-revenue/merchant-wise', adminController.getMerchantFeeRevenue);
router.get('/fee-revenue/monthly-trend', adminController.getMonthlyFeeTrend);

// Expiring Subscriptions Route
router.get('/subscriptions/expiring', adminController.getExpiringSubscriptions);

// Inactivity Monitoring Routes
router.get('/inactivity/summary', adminController.getInactivitySummary);
router.get('/inactivity/merchants', adminController.getMerchantInactivityReport);
router.get('/inactivity/customers', adminController.getCustomerInactivityReport);

// Trend Analysis Routes
router.get('/trends', adminController.getTrends);

// Retention Metrics Routes
router.get('/retention', adminController.getRetentionMetrics);

// Subscription Plans Routes
router.get('/subscription-plans', subscriptionController.getPlans);

router.get(
  '/subscription-plans/:id',
  [param('id').isUUID().withMessage('Invalid ID format.')],
  validate,
  subscriptionController.getPlan
);

router.post(
  '/subscription-plans',
  [
    body('name').trim().notEmpty().withMessage('Plan name is required.'),
    body('displayName').trim().notEmpty().withMessage('Display name is required.'),
    body('price').isFloat({ min: 1 }).withMessage('Price must be at least Rs. 1.'),
    body('durationDays').isInt({ min: 1 }).withMessage('Duration must be at least 1 day.')
  ],
  validate,
  subscriptionController.createPlan
);

router.put(
  '/subscription-plans/:id',
  [
    param('id').isUUID().withMessage('Invalid ID format.'),
    body('displayName').optional().trim().notEmpty().withMessage('Display name cannot be empty.'),
    body('price').optional().isFloat({ min: 1 }).withMessage('Price must be at least Rs. 1.'),
    body('durationDays').optional().isInt({ min: 1 }).withMessage('Duration must be at least 1 day.'),
    body('isActive').optional().isBoolean().toBoolean()
  ],
  validate,
  subscriptionController.updatePlan
);

// Merchant Subscriptions Routes
router.get('/merchant-subscriptions', subscriptionController.getMerchantSubscriptions);

router.get(
  '/merchant-subscriptions/:id',
  [param('id').isUUID().withMessage('Invalid ID format.')],
  validate,
  subscriptionController.getMerchantSubscriptionDetail
);

router.post(
  '/merchant-subscriptions',
  [
    body('merchantId').isUUID().withMessage('Invalid merchant ID.'),
    body('planId').isUUID().withMessage('Invalid plan ID.')
  ],
  validate,
  subscriptionController.createMerchantSubscription
);

router.patch(
  '/merchant-subscriptions/:id/renew',
  [param('id').isUUID().withMessage('Invalid ID format.')],
  validate,
  subscriptionController.renewMerchantSubscription
);

router.get(
  '/merchants/:merchantId/subscription-status',
  [param('merchantId').isUUID().withMessage('Invalid merchant ID.')],
  validate,
  subscriptionController.getMerchantSubscriptionStatus
);

router.get('/chatbot-analytics', adminController.getChatbotAnalytics);

router.get('/topup/pending', adminTopUpController.getPendingTopUps);

router.patch(
  '/topup/:topUpId/confirm',
  [param('topUpId').isUUID().withMessage('Invalid ID format.')],
  validate,
  adminTopUpController.confirmTopUp
);

router.patch(
  '/topup/:topUpId/reject',
  [param('topUpId').isUUID().withMessage('Invalid ID format.')],
  validate,
  adminTopUpController.rejectTopUp
);

module.exports = router;

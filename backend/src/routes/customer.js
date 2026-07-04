const express = require('express');
const { authenticate, authorize } = require('../middleware/auth');
const customerController = require('../controllers/customerController');

const router = express.Router();

// Enforce authentication and role validation for all customer endpoints
router.use(authenticate);

router.get('/milestone-progress', authorize('customer', 'merchant', 'super_admin'), customerController.getMilestoneProgress);

router.use(authorize('customer'));

router.get('/profile', customerController.getProfile);
router.get('/balance', customerController.getBalance);
router.get('/expiring-points', customerController.getExpiringPoints);
router.get('/ledger', customerController.getLedger);
router.get('/transactions', customerController.getTransactions);
router.get('/qr', customerController.getQRCodeDataURL);
router.get('/sse-token', customerController.getSSEToken);
router.get('/notifications/stream', customerController.streamNotifications);
router.get('/referral-stats', customerController.getReferralStats);
const { body } = require('express-validator');
const { handleValidationErrors, validateNewPassword } = require('../middleware/validators');

router.get('/merchants', customerController.getMerchants);

router.put(
  '/profile/email',
  [
    body('email').trim().notEmpty().withMessage('Email is required.').isEmail().normalizeEmail().withMessage('Enter a valid email address.')
  ],
  handleValidationErrors,
  customerController.updateEmail
);

router.put(
  '/profile',
  [
    body('name').trim().notEmpty().withMessage('Name is required.'),
    body('email').optional({ checkFalsy: true }).isEmail().normalizeEmail().withMessage('Enter a valid email address.'),
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
  customerController.updateProfile
);

router.post(
  '/profile/mobile/request-otp',
  customerController.requestMobileOTP
);

router.put(
  '/profile/mobile',
  [
    body('otp').notEmpty().withMessage('OTP is required.'),
    body('newMobile').matches(/^[6-9]\d{9}$/).withMessage('Enter a valid 10-digit Indian mobile number')
  ],
  handleValidationErrors,
  customerController.updateMobile
);
 
router.put(
  '/profile/password',
  [
    body('oldPassword').notEmpty().withMessage('Current password is required.'),
    validateNewPassword
  ],
  handleValidationErrors,
  customerController.changePassword
);

router.post(
  '/complaint',
  [
    body('type').trim().notEmpty().withMessage('Complaint type is required.'),
    body('description').trim().notEmpty().withMessage('Description is required.')
  ],
  handleValidationErrors,
  customerController.submitComplaint
);

module.exports = router;

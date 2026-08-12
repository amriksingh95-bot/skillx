const express = require('express');
const { body } = require('express-validator');
const { validate } = require('../middleware/validator');
const { 
  validateMobile, 
  validatePassword, 
  validateNewPassword,
  validateEmail, 
  validateLoginIdentifier,
  handleValidationErrors 
} = require('../middleware/validators');
const { authLimiter } = require('../middleware/rateLimiter');
const authController = require('../controllers/authController');
const { CATEGORY_CODES, normalizeCategory } = require('../constants/categories');
const { CITY_VALUES } = require('../constants/cities');

const router = express.Router();

// Apply auth rate limit to all routes in this router
router.use(authLimiter);

router.post(
  '/register',
  [
    body('name').trim().notEmpty().withMessage('Name is required.'),
    validateMobile,
    validateEmail,
    validatePassword,
    body('otp').notEmpty().withMessage('OTP verification is required.'),
    body('referralCode').optional({ checkFalsy: true }).trim(),
    body('merchantCode').optional({ checkFalsy: true }).trim()
  ],
  handleValidationErrors,
  authController.register
);

router.post(
  '/login',
  [
    validateLoginIdentifier,
    body('password').notEmpty().withMessage('Password is required.')
  ],
  handleValidationErrors,
  authController.login
);

router.post(
  '/logout',
  [
    body('refreshToken').notEmpty().withMessage('Refresh token is required.')
  ],
  validate,
  authController.logout
);

router.post(
  '/refresh-token',
  [
    body('refreshToken').notEmpty().withMessage('Refresh token is required.')
  ],
  validate,
  authController.refreshToken
);

router.post(
  '/request-otp',
  [
    validateMobile,
    validateEmail
  ],
  validate,
  authController.requestOTP
);

router.post(
  '/verify-otp',
  [
    body('mobile').isLength({ min: 10, max: 10 }).isNumeric().withMessage('Mobile must be exactly 10 digits.'),
    body('otp').notEmpty().withMessage('OTP is required.')
  ],
  validate,
  authController.verifyOTPHandler
);

router.post(
  '/request-reset',
  [
    body('identifier').trim().notEmpty().withMessage('Identifier (email or mobile) is required.')
  ],
  validate,
  authController.requestReset
);

router.post(
  '/reset-password',
  [
    validateLoginIdentifier,
    body('otp').notEmpty().withMessage('OTP is required.'),
    validateNewPassword
  ],
  validate,
  authController.resetPassword
);

router.post(
  '/merchant-signup',
  [
    body('businessName').trim().notEmpty().withMessage('Business name is required.'),
    body('ownerName').trim().notEmpty().withMessage('Owner name is required.'),
    validateMobile,
    body('email').trim().notEmpty().withMessage('Email address is required.').isEmail().withMessage('Enter a valid email address.').normalizeEmail(),
    body('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters.'),
    body('otp').notEmpty().withMessage('OTP verification is required.'),
    body('category').optional({ checkFalsy: true }).trim().customSanitizer(v => normalizeCategory(v)).isIn(CATEGORY_CODES).withMessage('Invalid category.'),
    body('address').optional().trim(),
    body('city').trim().notEmpty().withMessage('City is required.').isIn(CITY_VALUES).withMessage('City must be one of the allowed values.'),
    body('referredByMerchantCode').optional({ checkFalsy: true }).trim()
  ],
  handleValidationErrors,
  authController.registerMerchantSelf
);

router.get('/stats', authController.getPublicStats);

module.exports = router;

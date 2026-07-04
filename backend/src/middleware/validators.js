const { body, validationResult } = require('express-validator');

const validateMobile = body('mobile')
  .trim()
  .matches(/^[6-9]\d{9}$/)
  .withMessage('Enter a valid 10-digit Indian mobile number');

const validatePassword = body('password')
  .isStrongPassword({
    minLength: 8,
    minLowercase: 1,
    minUppercase: 1,
    minNumbers: 1,
    minSymbols: 1
  })
  .withMessage('Password must be at least 8 characters long and contain at least one uppercase letter, one lowercase letter, one number, and one special character');

const validateNewPassword = body('newPassword')
  .isStrongPassword({
    minLength: 8,
    minLowercase: 1,
    minUppercase: 1,
    minNumbers: 1,
    minSymbols: 1
  })
  .withMessage('Password must be at least 8 characters long and contain at least one uppercase letter, one lowercase letter, one number, and one special character');

const validateEmail = body('email')
  .optional({ checkFalsy: true })
  .isEmail()
  .normalizeEmail()
  .withMessage('Enter a valid email address');

const validateName = body('name')
  .trim()
  .escape()
  .notEmpty()
  .withMessage('Name is required');

const validateBusinessName = body('businessName')
  .trim()
  .escape()
  .notEmpty()
  .withMessage('Business name is required');

const validateOwnerName = body('ownerName')
  .trim()
  .escape()
  .notEmpty()
  .withMessage('Owner name is required');

const validateAddress = body('address')
  .trim()
  .escape()
  .notEmpty()
  .withMessage('Address is required');

const validateDescription = body('description')
  .trim()
  .escape()
  .notEmpty()
  .withMessage('Description is required');

const validatePoints = [
  body('points')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Points must be a positive integer'),
  body('pointsToRedeem')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Points must be a positive integer')
];

const validateAmount = body('purchaseAmount')
  .isFloat({ min: 0.01 })
  .withMessage('Purchase amount must be a positive number greater than zero');

// For login identifier (can be email or mobile)
const validateLoginIdentifier = body('identifier')
  .trim()
  .custom((value) => {
    const isEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
    const isMobile = /^[6-9]\d{9}$/.test(value);
    if (!isEmail && !isMobile) {
      throw new Error('Enter a valid email address or 10-digit mobile number');
    }
    return true;
  });

function handleValidationErrors(req, res, next) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const errorArray = errors.array();
    return res.status(422).json({
      success: false,
      message: errorArray[0].msg,
      errors: errorArray
    });
  }
  next();
}

module.exports = {
  validateMobile,
  validatePassword,
  validateNewPassword,
  validateEmail,
  validateName,
  validateBusinessName,
  validateOwnerName,
  validateAddress,
  validateDescription,
  validatePoints,
  validateAmount,
  validateLoginIdentifier,
  handleValidationErrors
};

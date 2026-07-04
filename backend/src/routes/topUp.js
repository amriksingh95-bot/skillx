const express = require('express');
const { body, param } = require('express-validator');
const { authenticate, authorize, requireActiveMerchant } = require('../middleware/auth');
const { validate } = require('../middleware/validator');
const topUpController = require('../controllers/topUpController');

const router = express.Router();

router.use(authenticate);
router.use(authorize('merchant'));

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
  topUpController.uploadTopUpScreenshot
);

module.exports = router;

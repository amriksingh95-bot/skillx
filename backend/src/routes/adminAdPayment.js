const express = require('express');
const { param } = require('express-validator');
const { authenticate, authorize } = require('../middleware/auth');
const { validate } = require('../middleware/validator');
const adminAdPaymentController = require('../controllers/adminAdPaymentController');

const router = express.Router();

router.use(authenticate);
router.use(authorize('super_admin'));

router.get('/ad-payments/pending', adminAdPaymentController.getPendingAdPayments);

router.patch(
  '/ad-payments/:id/confirm',
  [param('id').isUUID().withMessage('Invalid ID format.')],
  validate,
  adminAdPaymentController.confirmAdPayment
);

router.patch(
  '/ad-payments/:id/reject',
  [param('id').isUUID().withMessage('Invalid ID format.')],
  validate,
  adminAdPaymentController.rejectAdPayment
);

module.exports = router;

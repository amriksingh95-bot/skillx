const express = require('express');
const { param } = require('express-validator');
const { authenticate, authorize } = require('../middleware/auth');
const { validate } = require('../middleware/validator');
const adminTopUpController = require('../controllers/adminTopUpController');

const router = express.Router();

router.use(authenticate);
router.use(authorize('super_admin'));

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

const express = require('express');
const router = express.Router();
const { authenticateAny } = require('../middleware/auth');
const { getActiveAds, trackClick } = require('../controllers/merchantController');

router.get('/active', authenticateAny, getActiveAds);
router.patch('/:id/click', authenticateAny, trackClick);

module.exports = router;

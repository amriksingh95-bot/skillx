const prisma = require('../lib/prisma');
const { sendWhatsAppAlert, sendTelegramAlert } = require('../utils/whatsappNotify');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const uploadDir = path.resolve(__dirname, '../../uploads/topup-screenshots');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `topup-${Date.now()}-${Math.round(Math.random() * 1E9)}${ext}`);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = /jpeg|jpg|png|webp/;
    const ext = allowed.test(path.extname(file.originalname).toLowerCase());
    const mime = allowed.test(file.mimetype);
    if (ext && mime) return cb(null, true);
    cb(new Error('Only image files are allowed.'));
  }
});

const PACKAGES = {
  starter: { amountPaid: 500, pointsToCredit: 5000 },
  growth: { amountPaid: 1000, pointsToCredit: 11000 },
  pro: { amountPaid: 2000, pointsToCredit: 25000 }
};

async function requestTopUp(req, res, next) {
  try {
    const merchantId = req.user.merchantId;
    const { packageName } = req.body;

    const pkg = PACKAGES[packageName];
    if (!pkg) {
      const err = new Error('Invalid package. Choose starter, growth, or pro.');
      err.status = 400;
      err.code = 'VALIDATION_ERROR';
      return next(err);
    }

    const topUp = await prisma.pointsTopUp.create({
      data: {
        merchantId,
        packageName,
        amountPaid: pkg.amountPaid,
        pointsToCredit: pkg.pointsToCredit
      }
    });

    res.status(200).json({
      success: true,
      message: 'Top-up request created. Please upload payment screenshot.',
      data: {
        topUpId: topUp.id,
        amountPaid: topUp.amountPaid,
        pointsToCredit: topUp.pointsToCredit,
        upiId: process.env.UPI_ID || ''
      }
    });
  } catch (error) {
    next(error);
  }
}

async function uploadTopUpScreenshot(req, res, next) {
  try {
    const merchantId = req.user.merchantId;
    const { topUpId } = req.params;

    const topUp = await prisma.pointsTopUp.findFirst({
      where: { id: topUpId, merchantId }
    });

    if (!topUp) {
      const err = new Error('Top-up request not found.');
      err.status = 404;
      err.code = 'NOT_FOUND';
      return next(err);
    }

    if (topUp.status !== 'pending') {
      const err = new Error('This top-up has already been processed.');
      err.status = 400;
      err.code = 'INVALID_STATUS';
      return next(err);
    }

    if (!req.file) {
      const err = new Error('Screenshot is required.');
      err.status = 400;
      err.code = 'VALIDATION_ERROR';
      return next(err);
    }

    const merchant = await prisma.merchant.findUnique({
      where: { id: merchantId },
      select: { businessName: true }
    });

    await prisma.pointsTopUp.update({
      where: { id: topUpId },
      data: {
        screenshotPath: `/uploads/topup-screenshots/${req.file.filename}`,
        status: 'pending'
      }
    });

    await sendWhatsAppAlert(
      `SkillXT: New top-up request from ${merchant.businessName}.%0A` +
      `Package: ${topUp.packageName}%0A` +
      `Amount: ₹${topUp.amountPaid}%0A` +
      `Check admin panel.`
    );

    await sendTelegramAlert(
      `SkillXT: New top-up request from ${merchant.businessName}.%0A` +
      `Package: ${topUp.packageName}%0A` +
      `Amount: ₹${topUp.amountPaid}%0A` +
      `Check admin panel.`
    );

    res.status(200).json({
      success: true,
      message: 'Screenshot uploaded, awaiting admin confirmation.'
    });
  } catch (error) {
    next(error);
  }
}

async function getHistory(req, res, next) {
  try {
    const merchantId = req.user.merchantId;
    const history = await prisma.pointsTopUp.findMany({
      where: { merchantId },
      orderBy: { createdAt: 'desc' }
    });

    res.status(200).json({
      success: true,
      data: history
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  requestTopUp,
  uploadTopUpScreenshot,
  getHistory,
  upload
};

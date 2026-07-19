const prisma = require('../lib/prisma');
const { sendWhatsAppAlert, sendTelegramAlert } = require('../utils/whatsappNotify');
const { uploadBuffer } = require('../lib/supabaseStorage');
const multer = require('multer');
const path = require('path');

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = /jpeg|jpg|png|webp/;
    const ext = allowed.test(path.extname(file.originalname).toLowerCase());
    const mime = allowed.test(file.mimetype);
    if (ext && mime) return cb(null, true);
    cb(new Error('Only image files are allowed.'));
  }
});

const AD_PRICES = {
  starter: 499,
  growth: 999,
  premium: 1999
};

async function requestAdPayment(req, res, next) {
  try {
    const merchantId = req.user.merchantId;
    const { advertisementId } = req.body;

    if (!advertisementId) {
      const err = new Error('advertisementId is required.');
      err.status = 400;
      err.code = 'VALIDATION_ERROR';
      return next(err);
    }

    const ad = await prisma.advertisement.findFirst({
      where: { id: advertisementId, merchantId }
    });

    if (!ad) {
      const err = new Error('Advertisement not found.');
      err.status = 404;
      err.code = 'NOT_FOUND';
      return next(err);
    }

    if (ad.status !== 'approved') {
      const err = new Error('Payment can only be submitted for approved advertisements.');
      err.status = 400;
      err.code = 'INVALID_STATUS';
      return next(err);
    }

    const existingPayment = await prisma.adPayment.findFirst({
      where: { advertisementId, status: 'pending' }
    });

    if (existingPayment) {
      const err = new Error('A pending payment already exists for this advertisement.');
      err.status = 400;
      err.code = 'DUPLICATE';
      return next(err);
    }

    const pkg = (ad.package || '').toLowerCase();
    const amountPaid = AD_PRICES[pkg] || 499;

    const payment = await prisma.adPayment.create({
      data: {
        advertisementId,
        amountPaid,
        status: 'pending'
      }
    });

    res.status(200).json({
      success: true,
      message: 'Ad payment request created. Please upload payment screenshot.',
      data: {
        paymentId: payment.id,
        amountPaid: payment.amountPaid,
        upiId: process.env.UPI_ID || ''
      }
    });
  } catch (error) {
    next(error);
  }
}

async function uploadAdPaymentScreenshot(req, res, next) {
  try {
    const merchantId = req.user.merchantId;
    const { paymentId } = req.params;

    const payment = await prisma.adPayment.findFirst({
      where: { id: paymentId },
      include: { advertisement: true }
    });

    if (!payment) {
      const err = new Error('Payment request not found.');
      err.status = 404;
      err.code = 'NOT_FOUND';
      return next(err);
    }

    if (payment.advertisement.merchantId !== merchantId) {
      const err = new Error('Unauthorized.');
      err.status = 403;
      err.code = 'FORBIDDEN';
      return next(err);
    }

    if (payment.status !== 'pending') {
      const err = new Error('This payment has already been processed.');
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

    const ext = path.extname(req.file.originalname);
    const filename = `ad-${Date.now()}-${Math.round(Math.random() * 1E9)}${ext}`;
    const publicUrl = await uploadBuffer(
      req.file.buffer,
      'ad-payment-screenshots',
      filename,
      req.file.mimetype
    );

    await prisma.adPayment.update({
      where: { id: paymentId },
      data: {
        screenshotPath: publicUrl,
        paidAt: new Date()
      }
    });

    await sendWhatsAppAlert(
      `SkillXT: New ad payment request from ${merchant.businessName}.%0A` +
      `Ad: ${payment.advertisement.title}%0A` +
      `Amount: ₹${payment.amountPaid}%0A` +
      `Check admin panel.`
    );

    await sendTelegramAlert(
      `SkillXT: New ad payment request from ${merchant.businessName}.%0A` +
      `Ad: ${payment.advertisement.title}%0A` +
      `Amount: ₹${payment.amountPaid}%0A` +
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

module.exports = {
  requestAdPayment,
  uploadAdPaymentScreenshot,
  upload
};

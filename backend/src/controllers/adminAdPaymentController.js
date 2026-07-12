const prisma = require('../lib/prisma');
const { createAuditLog } = require('../services/auditLogService');

async function getPendingAdPayments(req, res, next) {
  try {
    const payments = await prisma.adPayment.findMany({
      where: { status: 'pending' },
      include: {
        advertisement: {
          select: {
            id: true,
            title: true,
            package: true,
            status: true,
            approvedAt: true,
            startDate: true,
            payments: true,
            merchant: {
              select: {
                id: true,
                businessName: true,
                merchantCode: true,
                user: {
                  select: {
                    mobile: true,
                    email: true
                  }
                }
              }
            }
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    res.status(200).json({
      success: true,
      message: 'Pending ad payments retrieved.',
      data: payments
    });
  } catch (error) {
    next(error);
  }
}

async function confirmAdPayment(req, res, next) {
  try {
    const { id } = req.params;
    const adminId = req.user.id;

    const payment = await prisma.adPayment.findUnique({
      where: { id },
      include: { advertisement: true }
    });

    if (!payment) {
      const err = new Error('Payment request not found.');
      err.status = 404;
      err.code = 'NOT_FOUND';
      return next(err);
    }

    if (payment.status !== 'pending') {
      const err = new Error('This payment has already been processed.');
      err.status = 400;
      err.code = 'INVALID_STATUS';
      return next(err);
    }

    const ad = payment.advertisement;

    const PACKAGE_DAYS = {
      starter: 7,
      growth: 15,
      premium: 30
    };
    const days = PACKAGE_DAYS[(ad.package || '').toLowerCase()] || 7;
    const now = new Date();
    const startDate = now;
    const endDate = new Date(now.getTime() + days * 24 * 60 * 60 * 1000);

    await prisma.$transaction(async (tx) => {
      await tx.adPayment.update({
        where: { id },
        data: {
          status: 'confirmed',
          confirmedBy: adminId,
          confirmedAt: now
        }
      });

      await tx.advertisement.update({
        where: { id: ad.id },
        data: {
          status: 'live',
          startDate,
          endDate
        }
      });
    });

    await createAuditLog(adminId, 'AD_PAYMENT_CONFIRMED', 'AdPayment', id, {
      advertisementId: payment.advertisementId,
      amountPaid: payment.amountPaid,
      adStatus: 'live',
      startDate,
      endDate
    }, req.ip);

    res.status(200).json({
      success: true,
      message: 'Ad payment confirmed. Advertisement is now live.'
    });
  } catch (error) {
    next(error);
  }
}

async function rejectAdPayment(req, res, next) {
  try {
    const { id } = req.params;
    const adminId = req.user.id;

    const payment = await prisma.adPayment.findUnique({
      where: { id }
    });

    if (!payment) {
      const err = new Error('Payment request not found.');
      err.status = 404;
      err.code = 'NOT_FOUND';
      return next(err);
    }

    if (payment.status !== 'pending') {
      const err = new Error('This payment has already been processed.');
      err.status = 400;
      err.code = 'INVALID_STATUS';
      return next(err);
    }

    await prisma.adPayment.update({
      where: { id },
      data: {
        status: 'rejected',
        confirmedBy: adminId,
        confirmedAt: new Date()
      }
    });

    await createAuditLog(adminId, 'AD_PAYMENT_REJECTED', 'AdPayment', id, {
      advertisementId: payment.advertisementId,
      amountPaid: payment.amountPaid
    }, req.ip);

    res.status(200).json({
      success: true,
      message: 'Ad payment rejected.'
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  getPendingAdPayments,
  confirmAdPayment,
  rejectAdPayment
};

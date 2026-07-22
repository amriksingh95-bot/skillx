const prisma = require('../lib/prisma');
const { createAuditLog } = require('../services/auditLogService');

async function getPendingTopUps(req, res, next) {
  try {
    const topUps = await prisma.pointsTopUp.findMany({
      where: { status: 'pending' },
      include: {
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
      },
      orderBy: { createdAt: 'desc' }
    });

    res.status(200).json({
      success: true,
      message: 'Pending top-ups retrieved.',
      data: topUps
    });
  } catch (error) {
    next(error);
  }
}

async function confirmTopUp(req, res, next) {
  try {
    const { topUpId } = req.params;
    const adminId = req.user.id;

    const topUp = await prisma.pointsTopUp.findUnique({
      where: { id: topUpId },
      include: { merchant: { select: { id: true, businessName: true, pointsBalance: true, userId: true } } }
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

    const result = await prisma.$transaction(async (tx) => {
      const updatedTopUp = await tx.pointsTopUp.update({
        where: { id: topUpId },
        data: {
          status: 'confirmed',
          confirmedBy: adminId,
          confirmedAt: new Date()
        }
      });

      const updatedMerchant = await tx.merchant.update({
        where: { id: topUp.merchantId },
        data: {
          pointsBalance: { increment: topUp.pointsToCredit }
        }
      });

      return { topUp: updatedTopUp, merchant: updatedMerchant };
    });

    await createAuditLog(adminId, 'TOP_UP_CONFIRMED', 'PointsTopUp', topUpId, {
      merchantId: topUp.merchantId,
      pointsToCredit: topUp.pointsToCredit
    }, req.ip);

    res.status(200).json({
      success: true,
      message: 'Top-up confirmed. Points credited to merchant.',
      data: {
        merchantName: result.merchant.businessName,
        pointsCredited: topUp.pointsToCredit,
        newBalance: result.merchant.pointsBalance
      }
    });
  } catch (error) {
    next(error);
  }
}

async function rejectTopUp(req, res, next) {
  try {
    const { topUpId } = req.params;
    const adminId = req.user.id;

    const topUp = await prisma.pointsTopUp.findUnique({
      where: { id: topUpId }
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

    await prisma.pointsTopUp.update({
      where: { id: topUpId },
      data: {
        status: 'rejected',
        confirmedBy: adminId,
        confirmedAt: new Date()
      }
    });

    await createAuditLog(adminId, 'TOP_UP_REJECTED', 'PointsTopUp', topUpId, {
      merchantId: topUp.merchantId
    }, req.ip);

    res.status(200).json({
      success: true,
      message: 'Top-up request rejected.'
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  getPendingTopUps,
  confirmTopUp,
  rejectTopUp
};

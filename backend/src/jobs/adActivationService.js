const prisma = require('../lib/prisma');
const { createAuditLog } = require('../services/auditLogService');

const PACKAGE_DAYS = {
  starter: 7,
  growth: 15,
  premium: 30
};

function getDurationDays(pkg) {
  return PACKAGE_DAYS[(pkg || '').toLowerCase()] || 7;
}

async function runAdActivationCycle() {
  const summary = {
    timestamp: new Date().toISOString(),
    expired: 0,
    activated: 0,
    failed: 0,
    errors: [],
    expiredAds: [],
    activatedAd: null
  };

  try {
    const now = new Date();

    const expiredAds = await prisma.advertisement.findMany({
      where: {
        status: 'live',
        endDate: { lt: now }
      },
      include: {
        merchant: { select: { businessName: true } }
      }
    });

    for (const ad of expiredAds) {
      try {
        await prisma.advertisement.update({
          where: { id: ad.id },
          data: { status: 'expired' }
        });

        await createAuditLog(
          null,
          'AD_AUTO_EXPIRED',
          'Advertisement',
          ad.id,
          {
            merchantId: ad.merchantId,
            merchantName: ad.merchant?.businessName,
            endDate: ad.endDate,
            expiredReason: 'Ad end date reached.'
          },
          null
        );

        summary.expired++;
        summary.expiredAds.push({
          id: ad.id,
          title: ad.title,
          merchant: ad.merchant?.businessName
        });
      } catch (error) {
        summary.failed++;
        summary.errors.push({
          id: ad.id,
          title: ad.title,
          error: error.message
        });
      }
    }

    const liveCount = await prisma.advertisement.count({
      where: {
        status: 'live',
        endDate: { gte: now }
      }
    });

    if (liveCount > 0) {
      return summary;
    }

    const candidates = await prisma.advertisement.findMany({
      where: {
        status: 'queued',
        payments: {
          some: { status: 'confirmed' }
        }
      },
      include: {
        merchant: { select: { businessName: true } },
        payments: {
          where: { status: 'confirmed' },
          select: { paidAt: true }
        }
      }
    });

    if (candidates.length === 0) {
      return summary;
    }

    const sorted = candidates
      .map(ad => ({
        ...ad,
        earliestPaidAt: ad.payments
          .filter(p => p.paidAt)
          .reduce((min, p) => (!min || p.paidAt < min ? p.paidAt : min), null)
      }))
      .sort((a, b) => {
        const aTime = a.earliestPaidAt ? new Date(a.earliestPaidAt).getTime() : Infinity;
        const bTime = b.earliestPaidAt ? new Date(b.earliestPaidAt).getTime() : Infinity;
        return aTime - bTime;
      });

    const nextAd = sorted[0];

    const days = getDurationDays(nextAd.package);
    const startDate = now;
    const endDate = new Date(now.getTime() + days * 24 * 60 * 60 * 1000);

    try {
      await prisma.$transaction(async (tx) => {
        await tx.advertisement.update({
          where: { id: nextAd.id },
          data: {
            status: 'live',
            startDate,
            endDate
          }
        });
      });

      await createAuditLog(
        null,
        'AD_AUTO_ACTIVATED_QUEUED',
        'Advertisement',
        nextAd.id,
        {
          merchantId: nextAd.merchantId,
          merchantName: nextAd.merchant?.businessName,
          startDate,
          endDate,
          package: nextAd.package
        },
        null
      );

      summary.activated++;
      summary.activatedAd = {
        id: nextAd.id,
        title: nextAd.title,
        merchant: nextAd.merchant?.businessName,
        startDate,
        endDate
      };
    } catch (error) {
      summary.failed++;
      summary.errors.push({
        id: nextAd.id,
        title: nextAd.title,
        error: error.message
      });
    }
  } catch (error) {
    summary.errors.push({ id: null, error: error.message });
  }

  return summary;
}

module.exports = { runAdActivationCycle };

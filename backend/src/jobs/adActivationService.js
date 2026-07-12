const prisma = require('../lib/prisma');
const { createAuditLog } = require('../services/auditLogService');

async function runAdExpiryCheck() {
  const summary = {
    timestamp: new Date().toISOString(),
    expired: 0,
    failed: 0,
    errors: [],
    expiredAds: []
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
  } catch (error) {
    summary.errors.push({ id: null, error: error.message });
  }

  return summary;
}

module.exports = { runAdExpiryCheck };

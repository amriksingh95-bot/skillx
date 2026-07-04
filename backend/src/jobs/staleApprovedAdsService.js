const prisma = require('../lib/prisma');
const { createAuditLog } = require('../services/auditLogService');

async function pauseStaleApprovedAds() {
  const summary = {
    timestamp: new Date().toISOString(),
    total: 0,
    paused: 0,
    failed: 0,
    errors: [],
    details: []
  };

  try {
    const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000);

    const staleAds = await prisma.advertisement.findMany({
      where: {
        status: 'approved',
        approvedAt: { not: null, lt: threeDaysAgo },
        payments: { none: { status: 'pending' } }
      },
      include: {
        merchant: {
          select: { businessName: true }
        }
      }
    });

    summary.total = staleAds.length;

    for (const ad of staleAds) {
      try {
        await prisma.advertisement.update({
          where: { id: ad.id },
          data: {
            status: 'paused',
            pausedReason: 'Ad approved but payment not made within 3 days.'
          }
        });

        await createAuditLog(
          null,
          'AD_AUTO_PAUSED_STALE',
          'Advertisement',
          ad.id,
          {
            merchantId: ad.merchantId,
            merchantName: ad.merchant?.businessName,
            approvedAt: ad.approvedAt,
            pausedReason: 'Ad approved but payment not made within 3 days.'
          },
          null
        );

        summary.paused++;
        summary.details.push({
          id: ad.id,
          title: ad.title,
          merchant: ad.merchant?.businessName,
          approvedAt: ad.approvedAt
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

module.exports = { pauseStaleApprovedAds };

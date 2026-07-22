const prisma = require('../lib/prisma');
const { createAuditLog } = require('./auditLogService');

/**
 * Pause all existing live ads for a merchant before activating a new one.
 * Ensures only one ad is live per merchant at any time.
 * @param {string} merchantId - The merchant whose old live ads should be paused
 * @param {string} newAdId - The ad being activated (excluded from pause)
 * @param {object} [tx] - Optional Prisma transaction client
 * @returns {number} Number of ads paused
 */
async function pauseExistingLiveAds(merchantId, newAdId, tx) {
  const client = tx || prisma;

  const existingLiveAds = await client.advertisement.findMany({
    where: {
      merchantId,
      status: 'live',
      id: { not: newAdId },
    },
    include: {
      merchant: { select: { businessName: true } },
    },
  });

  if (existingLiveAds.length === 0) return 0;

  for (const ad of existingLiveAds) {
    await client.advertisement.update({
      where: { id: ad.id },
      data: { status: 'paused', pausedReason: 'Auto-paused: another ad activated for this merchant.' },
    });

    await createAuditLog(
      null,
      'AD_AUTO_PAUSED',
      'Advertisement',
      ad.id,
      {
        merchantId: ad.merchantId,
        merchantName: ad.merchant?.businessName,
        pausedReason: 'Auto-paused: another ad activated for this merchant.',
        newAdId,
      },
      null
    );
  }

  return existingLiveAds.length;
}

module.exports = { pauseExistingLiveAds };

const prisma = require('../lib/prisma');
const { createAuditLog } = require('../services/auditLogService');
const { sendWhatsAppAlert, sendTelegramAlert } = require('../utils/whatsappNotify');

async function remindStalePendingPayments() {
  const summary = {
    timestamp: new Date().toISOString(),
    total: 0,
    remindersSent: 0,
    skipped: 0,
    failed: 0,
    errors: [],
    details: []
  };

  try {
    const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000);

    const stalePayments = await prisma.adPayment.findMany({
      where: {
        status: 'pending',
        paidAt: { not: null, lt: threeDaysAgo }
      },
      include: {
        advertisement: {
          select: {
            id: true,
            title: true,
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
      orderBy: { paidAt: 'asc' }
    });

    summary.total = stalePayments.length;

    for (const payment of stalePayments) {
      try {
        const recentReminder = await prisma.auditLog.findFirst({
          where: {
            action: 'AD_PAYMENT_REMINDER_SENT',
            entityType: 'AdPayment',
            entityId: payment.id,
            createdAt: { gt: new Date(Date.now() - 24 * 60 * 60 * 1000) }
          }
        });

        if (recentReminder) {
          summary.skipped++;
          summary.details.push({
            id: payment.id,
            advertisementId: payment.advertisementId,
            advertisementTitle: payment.advertisement?.title,
            merchant: payment.advertisement?.merchant?.businessName,
            paidAt: payment.paidAt,
            reason: 'Reminder already sent within 24h'
          });
          continue;
        }

        const ad = payment.advertisement;
        const merchant = ad?.merchant;
        const message = `SkillXT: Ad payment verification overdue.%0A` +
          `Ad: ${ad?.title || 'Unknown'}%0A` +
          `Merchant: ${merchant?.businessName || 'Unknown'} (${merchant?.merchantCode || 'N/A'})%0A` +
          `Amount: ₹${payment.amountPaid}%0A` +
          `Payment submitted: ${new Date(payment.paidAt).toLocaleString()}%0A` +
          `Pending admin verification for 3+ days.%0A` +
          `Check admin panel.`;

        await sendWhatsAppAlert(message);
        await sendTelegramAlert(message);

        await createAuditLog(
          null,
          'AD_PAYMENT_REMINDER_SENT',
          'AdPayment',
          payment.id,
          {
            advertisementId: payment.advertisementId,
            amountPaid: payment.amountPaid,
            paidAt: payment.paidAt,
            merchantId: merchant?.id,
            merchantName: merchant?.businessName
          },
          null
        );

        summary.remindersSent++;
        summary.details.push({
          id: payment.id,
          advertisementId: payment.advertisementId,
          advertisementTitle: ad?.title,
          merchant: merchant?.businessName,
          paidAt: payment.paidAt
        });
      } catch (error) {
        summary.failed++;
        summary.errors.push({
          id: payment.id,
          advertisementId: payment.advertisementId,
          error: error.message
        });
      }
    }
  } catch (error) {
    summary.errors.push({ id: null, error: error.message });
  }

  return summary;
}

module.exports = { remindStalePendingPayments };
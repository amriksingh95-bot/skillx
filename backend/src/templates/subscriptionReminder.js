/**
 * Subscription Reminder Email Templates
 * 
 * Reminder Tiers:
 * - 30_day: 30 days before expiry
 * - 15_day: 15 days before expiry
 * - 7_day: 7 days before expiry
 * - 3_day: 3 days before expiry
 * - 1_day: 1 day before expiry
 * - expiry_day: Expiry day
 * - grace_period_start: Just entered grace period
 * - grace_period_end: Grace period ending soon
 */

const REMINDER_CONFIG = {
  '30_day': {
    subject: (planName) => `[SkillXT] Subscription Renewal - 30 days remaining`,
    urgency: 'low',
    color: '#3B82F6',
    icon: '📅',
    headline: 'Subscription Renewal Reminder',
    message: (days) => `Your subscription expires in ${days} days.`
  },
  '15_day': {
    subject: (planName) => `[SkillXT] Subscription Renewal - 15 days remaining`,
    urgency: 'medium',
    color: '#F59E0B',
    icon: '⏰',
    headline: 'Subscription Expiring Soon',
    message: (days) => `Your subscription expires in ${days} days.`
  },
  '7_day': {
    subject: (planName) => `[SkillXT] Urgent - 7 days until subscription expires`,
    urgency: 'high',
    color: '#EF4444',
    icon: '⚠️',
    headline: 'Action Required - Subscription Expiring',
    message: (days) => `Your subscription expires in just ${days} days!`
  },
  '3_day': {
    subject: (planName) => `[SkillXT] URGENT - 3 days until subscription expires`,
    urgency: 'critical',
    color: '#DC2626',
    icon: '🚨',
    headline: 'Critical - Subscription Expiring Very Soon',
    message: (days) => `Only ${days} days left before your subscription expires!`
  },
  '1_day': {
    subject: (planName) => `[SkillXT] LAST DAY - Subscription expires tomorrow`,
    urgency: 'critical',
    color: '#991B1B',
    icon: '🔴',
    headline: 'Last Chance - Subscription Expires Tomorrow',
    message: (days) => `Your subscription expires TOMORROW!`
  },
  'expiry_day': {
    subject: (planName) => `[SkillXT] Subscription expires TODAY`,
    urgency: 'critical',
    color: '#7F1D1D',
    icon: '⛔',
    headline: 'Subscription Expires Today',
    message: () => `Your subscription expires TODAY. Renew now to avoid service interruption.`
  },
  'grace_period_start': {
    subject: (planName) => `[SkillXT] Grace Period Started - Subscription expired`,
    urgency: 'critical',
    color: '#92400E',
    icon: '⚠️',
    headline: 'Grace Period Started',
    message: () => `Your subscription has expired. You are now in a 15-day grace period.`
  },
  'grace_period_end': {
    subject: (planName) => `[SkillXT] FINAL WARNING - Grace period ending`,
    urgency: 'critical',
    color: '#7F1D1D',
    icon: '🛑',
    headline: 'Final Warning - Account Suspension imminent',
    message: (days) => `Your grace period ends in ${days} days. Your account will be suspended after this.`
  }
};

function formatDate(dateStr) {
  if (!dateStr) return 'N/A';
  return new Date(dateStr).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });
}

function formatCurrency(amount) {
  return `₹${parseFloat(amount).toLocaleString('en-IN')}`;
}

/**
 * Generate HTML email for subscription reminder
 */
function generateReminderEmail({ merchantName, planName, planPrice, planDuration, expiryDate, graceEndDate, tier, daysRemaining, renewalUrl }) {
  const config = REMINDER_CONFIG[tier] || REMINDER_CONFIG['30_day'];
  const subject = config.subject(planName);
  const headline = config.headline;
  const message = config.message(daysRemaining);

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${subject}</title>
</head>
<body style="margin:0;padding:0;background-color:#F3F4F6;font-family:'Segoe UI',Tahoma,Geneva,Verdana,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#F3F4F6;padding:40px 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color:#FFFFFF;border-radius:16px;overflow:hidden;box-shadow:0 4px 6px rgba(0,0,0,0.1);">
          
          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, ${config.color} 0%, ${config.color}DD 100%);padding:32px;text-align:center;">
              <div style="font-size:48px;margin-bottom:16px;">${config.icon}</div>
              <h1 style="color:#FFFFFF;font-size:24px;font-weight:800;margin:0;">${headline}</h1>
            </td>
          </tr>
          
          <!-- Body -->
          <tr>
            <td style="padding:32px;">
              <p style="font-size:16px;color:#374151;margin:0 0 16px 0;">
                Hello <strong>${merchantName}</strong>,
              </p>
              
              <p style="font-size:16px;color:#374151;margin:0 0 24px 0;">
                ${message}
              </p>
              
              <!-- Subscription Details -->
              <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#F9FAFB;border-radius:12px;margin-bottom:24px;">
                <tr>
                  <td style="padding:20px;">
                    <h3 style="font-size:14px;font-weight:700;color:#6B7280;margin:0 0 12px 0;text-transform:uppercase;letter-spacing:0.5px;">Subscription Details</h3>
                    <table width="100%" cellpadding="0" cellspacing="0">
                      <tr>
                        <td style="padding:6px 0;font-size:14px;color:#6B7280;">Plan</td>
                        <td style="padding:6px 0;font-size:14px;color:#111827;font-weight:700;text-align:right;">${planName}</td>
                      </tr>
                      <tr>
                        <td style="padding:6px 0;font-size:14px;color:#6B7280;">Price</td>
                        <td style="padding:6px 0;font-size:14px;color:#111827;font-weight:700;text-align:right;">${formatCurrency(planPrice)}/${planDuration} days</td>
                      </tr>
                      <tr>
                        <td style="padding:6px 0;font-size:14px;color:#6B7280;">Expiry Date</td>
                        <td style="padding:6px 0;font-size:14px;color:${config.color};font-weight:700;text-align:right;">${formatDate(expiryDate)}</td>
                      </tr>
                      ${graceEndDate ? `
                      <tr>
                        <td style="padding:6px 0;font-size:14px;color:#6B7280;">Grace Period Ends</td>
                        <td style="padding:6px 0;font-size:14px;color:#DC2626;font-weight:700;text-align:right;">${formatDate(graceEndDate)}</td>
                      </tr>
                      ` : ''}
                      <tr>
                        <td style="padding:6px 0;font-size:14px;color:#6B7280;">Days Remaining</td>
                        <td style="padding:6px 0;font-size:14px;color:${config.color};font-weight:700;text-align:right;">${daysRemaining} days</td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
              
              <!-- CTA Button -->
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center" style="padding:8px 0 24px 0;">
                    <a href="${renewalUrl}" style="display:inline-block;background-color:${config.color};color:#FFFFFF;font-size:16px;font-weight:700;text-decoration:none;padding:14px 32px;border-radius:8px;">
                      Renew Now →
                    </a>
                  </td>
                </tr>
              </table>
              
              <!-- What Happens Next -->
              <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#FEF3C7;border-radius:12px;margin-bottom:24px;">
                <tr>
                  <td style="padding:16px;">
                    <h3 style="font-size:14px;font-weight:700;color:#92400E;margin:0 0 8px 0;">⚠️ What happens after expiry?</h3>
                    <ul style="font-size:13px;color:#92400E;margin:0;padding-left:20px;">
                      <li>15-day grace period (your operations continue)</li>
                      <li>After grace period: account suspended</li>
                      <li>All points and data are preserved</li>
                      <li>Renew anytime to restore full access</li>
                    </ul>
                  </td>
                </tr>
              </table>
              
              <p style="font-size:13px;color:#9CA3AF;margin:0;">
                Need help? Contact us at support@skillxt.com
              </p>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="background-color:#F9FAFB;padding:20px 32px;text-align:center;border-top:1px solid #E5E7EB;">
              <p style="font-size:12px;color:#9CA3AF;margin:0;">
                © ${new Date().getFullYear()} SkillXT Rewards Platform. All rights reserved.
              </p>
            </td>
          </tr>
          
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

  return { subject, html };
}

module.exports = {
  REMINDER_CONFIG,
  generateReminderEmail
};

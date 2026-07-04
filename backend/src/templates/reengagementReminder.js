/**
 * Re-engagement Email Templates
 * 
 * Tiers:
 * - dormant_60: 60+ days inactive
 * - dormant_90: 90+ days inactive
 * - never_redeemed: Points earned but never redeemed
 * - high_balance: High points balance, no redemption
 */

function formatDate(dateStr) {
  if (!dateStr) return 'N/A';
  return new Date(dateStr).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });
}

function generateReengagementEmail({ customerName, daysInactive, currentBalance, tier, dashboardUrl }) {
  const config = {
    dormant_60: {
      subject: `[SkillXT] We miss you, ${customerName}!`,
      headline: 'We Miss You!',
      message: `It's been ${daysInactive} days since your last visit. Your ${currentBalance} loyalty points are waiting for you.`,
      color: '#F59E0B',
      icon: '👋'
    },
    dormant_90: {
      subject: `[SkillXT] Your ${currentBalance} points are about to expire!`,
      headline: 'Your Points Are Waiting!',
      message: `It's been ${daysInactive} days! You have ${currentBalance} points that could expire soon. Don't let them go to waste.`,
      color: '#EF4444',
      icon: '⏰'
    },
    never_redeemed: {
      subject: `[SkillXT] You have ${currentBalance} points to redeem!`,
      headline: 'Redeem Your Points!',
      message: `You've earned ${currentBalance} loyalty points but haven't redeemed them yet. Turn your points into real discounts!`,
      color: '#3B82F6',
      icon: '🎁'
    },
    high_balance: {
      subject: `[SkillXT] You have ${currentBalance} points ready to use!`,
      headline: 'Points Ready to Use!',
      message: `You have ${currentBalance} loyalty points in your wallet. Visit our partner stores and redeem them for discounts.`,
      color: '#10B981',
      icon: '💰'
    }
  }[tier] || config.dormant_60;

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin:0;padding:0;background-color:#F3F4F6;font-family:'Segoe UI',Tahoma,Geneva,Verdana,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#F3F4F6;padding:40px 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color:#FFFFFF;border-radius:16px;overflow:hidden;box-shadow:0 4px 6px rgba(0,0,0,0.1);">
          <tr>
            <td style="background:linear-gradient(135deg, ${config.color} 0%, ${config.color}DD 100%);padding:32px;text-align:center;">
              <div style="font-size:48px;margin-bottom:16px;">${config.icon}</div>
              <h1 style="color:#FFFFFF;font-size:24px;font-weight:800;margin:0;">${config.headline}</h1>
            </td>
          </tr>
          <tr>
            <td style="padding:32px;">
              <p style="font-size:16px;color:#374151;margin:0 0 16px 0;">
                Hello <strong>${customerName}</strong>,
              </p>
              <p style="font-size:16px;color:#374151;margin:0 0 24px 0;">
                ${config.message}
              </p>
              <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#F9FAFB;border-radius:12px;margin-bottom:24px;">
                <tr>
                  <td style="padding:20px;">
                    <h3 style="font-size:14px;font-weight:700;color:#6B7280;margin:0 0 12px 0;text-transform:uppercase;letter-spacing:0.5px;">Your Account</h3>
                    <table width="100%" cellpadding="0" cellspacing="0">
                      <tr>
                        <td style="padding:6px 0;font-size:14px;color:#6B7280;">Points Balance</td>
                        <td style="padding:6px 0;font-size:14px;color:#111827;font-weight:700;text-align:right;">${currentBalance} pts</td>
                      </tr>
                      <tr>
                        <td style="padding:6px 0;font-size:14px;color:#6B7280;">Days Inactive</td>
                        <td style="padding:6px 0;font-size:14px;color:${config.color};font-weight:700;text-align:right;">${daysInactive} days</td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center" style="padding:8px 0 24px 0;">
                    <a href="${dashboardUrl}" style="display:inline-block;background-color:${config.color};color:#FFFFFF;font-size:16px;font-weight:700;text-decoration:none;padding:14px 32px;border-radius:8px;">
                      Open Wallet &rarr;
                    </a>
                  </td>
                </tr>
              </table>
              <p style="font-size:13px;color:#9CA3AF;margin:0;">
                Need help? Contact us at support@skillxt.com
              </p>
            </td>
          </tr>
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

  return { subject: config.subject, html };
}

module.exports = {
  generateReengagementEmail
};

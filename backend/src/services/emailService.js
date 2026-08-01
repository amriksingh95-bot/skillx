const { Resend } = require('resend');

let resend = null;

function getResendClient() {
  if (!resend && process.env.RESEND_API_KEY) {
    resend = new Resend(process.env.RESEND_API_KEY);
  }
  return resend;
}

const FROM_EMAIL = 'SkillXT Rewards <otp@skillxt.in>';

function isEmailConfigured() {
  return !!(
    process.env.RESEND_API_KEY &&
    process.env.RESEND_API_KEY.length > 10
  );
}

async function sendOTPEmail(toEmail, otp, purpose) {
  if (!isEmailConfigured()) {
    return { success: false, reason: 'Email service not configured (RESEND_API_KEY missing)' };
  }

  const subjects = {
    register: 'Your SkillXT Registration OTP',
    reset: 'Your SkillXT Password Reset OTP',
    verify: 'Your SkillXT Verification OTP',
    change_mobile: 'Your SkillXT Mobile Change OTP'
  };

  const subject = subjects[purpose] || 'Your SkillXT OTP';

  const html = `
    <div style="font-family: Arial, sans-serif; 
    max-width: 480px; margin: 0 auto; 
    background: #f8fafc; padding: 32px; 
    border-radius: 12px;">
      
      <div style="text-align: center; 
      margin-bottom: 24px;">
        <h1 style="color: #1e293b; font-size: 24px; 
        margin: 0;">SkillXT Rewards</h1>
        <p style="color: #64748b; font-size: 14px; 
        margin: 4px 0 0;">Loyalty Rewards Platform</p>
      </div>

      <div style="background: #ffffff; 
      border-radius: 10px; padding: 28px; 
      border: 1px solid #e2e8f0;">
        <p style="color: #374151; font-size: 15px; 
        margin: 0 0 20px;">
          Your One-Time Password (OTP) is:
        </p>
        
        <div style="background: #f1f5f9; 
        border-radius: 8px; padding: 20px; 
        text-align: center; margin: 0 0 20px;">
          <span style="font-size: 36px; 
          font-weight: bold; color: #2563eb; 
          letter-spacing: 8px;">${otp}</span>
        </div>

        <p style="color: #64748b; font-size: 13px; 
        margin: 0 0 8px;">
          ⏱️ This OTP is valid for 
          <strong>10 minutes</strong> only.
        </p>
        <p style="color: #64748b; font-size: 13px; 
        margin: 0 0 8px;">
          🔒 Never share this OTP with anyone.
        </p>
        <p style="color: #64748b; font-size: 13px; 
        margin: 0;">
          If you did not request this OTP, 
          please ignore this email.
        </p>
      </div>

      <p style="color: #94a3b8; font-size: 12px; 
      text-align: center; margin: 20px 0 0;">
        © 2026 SkillXT Rewards Platform. 
        All rights reserved.
      </p>
    </div>
  `;

  try {
    const client = getResendClient();
    const { data, error } = await client.emails.send({
      from: FROM_EMAIL,
      to: [toEmail],
      subject: subject,
      html: html
    });

    if (error) {
      console.error(`[Email Service]: Resend API error: ${error.message}`);
      return { success: false, reason: error.message };
    }

    return { success: true };
  } catch (error) {
    console.error(`[Email Service]: Resend send failed: ${error.message}`);
    return { success: false, reason: error.message };
  }
}

async function verifyTransporter() {
  if (!isEmailConfigured()) {
    console.warn('[Email Service]: RESEND_API_KEY not configured. Set RESEND_API_KEY in .env');
    return false;
  }
  console.log('[Email Service]: Resend API key detected. Email sending via Resend HTTP API.');
  return true;
}

module.exports = { sendOTPEmail, verifyTransporter, isEmailConfigured };

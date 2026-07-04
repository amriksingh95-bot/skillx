const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_APP_PASSWORD
  }
});

function isEmailConfigured() {
  return !!(
    process.env.GMAIL_USER &&
    !process.env.GMAIL_USER.includes('your_gmail_address') &&
    process.env.GMAIL_APP_PASSWORD &&
    !process.env.GMAIL_APP_PASSWORD.includes('your_16_char_app_password')
  );
}

async function sendOTPEmail(toEmail, otp, purpose) {
  if (!isEmailConfigured()) {
    return { success: false, reason: 'Email service not configured' };
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
    await transporter.sendMail({
      from: `"SkillXT Rewards" <${process.env.GMAIL_USER || 'no-reply@skillxt.com'}>`,
      to: toEmail,
      subject: subject,
      html: html
    });
    return { success: true };
  } catch (error) {
    console.warn(`[Email Service Warning]: Gmail SMTP failed to send email: ${error.message}`);
    return { success: false, reason: error.message };
  }
}

async function verifyTransporter() {
  if (!isEmailConfigured()) {
    console.warn('[Email Service]: Gmail SMTP not configured. Set GMAIL_USER and GMAIL_APP_PASSWORD in .env');
    return false;
  }
  try {
    await transporter.verify();
    console.log('[Email Service]: Gmail SMTP connection verified successfully.');
    return true;
  } catch (error) {
    console.warn(`[Email Service]: Gmail SMTP verification failed: ${error.message}`);
    return false;
  }
}

module.exports = { sendOTPEmail, verifyTransporter, isEmailConfigured };

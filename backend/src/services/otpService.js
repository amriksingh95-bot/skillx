const crypto = require('crypto');
const prisma = require('../lib/prisma');
const bcrypt = require('bcrypt');
const { sendOTPEmail } = require('./emailService');

const VALID_PURPOSES = ['register', 'register_merchant', 'reset', 'change_mobile'];

/**
 * Sends SMS via mock gateway (replaceable with Twilio/MSG91)
 * @param {string} mobile - 10 digit phone number
 * @param {string} otp - OTP to send
 */
async function sendSMS(mobile, otp) {
  // ==========================================
  // PLUG SMS GATEWAY HERE (Twilio/MSG91 etc.)
  // ==========================================
  return true;
}

/**
 * Generates OTP and stores it in the database.
 * @param {string} mobile - 10-digit mobile number
 * @param {string} email - email address to send OTP to
 * @param {string} purpose - 'register' | 'reset' | 'change_mobile'
 */
async function generateAndSendOTP(mobile, email = null, purpose) {
  if (!VALID_PURPOSES.includes(purpose)) {
    const err = new Error('Invalid OTP purpose.');
    err.status = 400;
    err.code = 'VALIDATION_ERROR';
    throw err;
  }

  // Clean up any expired verification records
  try {
    await prisma.oTPVerification.deleteMany({
      where: { expiresAt: { lt: new Date() } }
    });
  } catch (err) {
  }

  // 1. Generate 6-digit cryptographically secure OTP
  const otp = crypto.randomInt(100000, 1000000).toString();
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes expiry

  // 2. Hash OTP before saving
  const hashedOtp = await bcrypt.hash(otp, 10);

  // 3. Upsert: overwrite any existing record for this mobile+purpose (verified or not)
  const verification = await prisma.oTPVerification.upsert({
    where: { mobile_purpose: { mobile, purpose } },
    update: { otp: hashedOtp, expiresAt, verified: false, createdAt: new Date() },
    create: { mobile, purpose, otp: hashedOtp, expiresAt }
  });

  // 4. Send email with ORIGINAL (unhashed) OTP
  if (email) {
    const emailResult = await sendOTPEmail(email, otp, purpose);
    if (!emailResult.success) {
      console.warn(`[OTP Service]: Email delivery failed for masked user: ${emailResult.reason}`);
    }
  }

  // 5. Call the external mock SMS gateway with raw OTP code
  await sendSMS(mobile, otp);

  return { verification };
}

/**
 * Verifies OTP for the given mobile.
 * @param {string} mobile - 10-digit mobile number
 * @param {string} otp - OTP code to verify
 * @param {string} purpose - 'register' | 'reset' | 'change_mobile'
 * @returns {Promise<boolean>}
 */
async function verifyOTP(mobile, otp, purpose) {
  if (!purpose || !VALID_PURPOSES.includes(purpose)) {
    const err = new Error('OTP purpose is required and must be valid.');
    err.status = 400;
    err.code = 'INVALID_OTP';
    throw err;
  }
  // Clean up any expired verification records
  try {
    await prisma.oTPVerification.deleteMany({
      where: { expiresAt: { lt: new Date() } }
    });
  } catch (err) {
  }

  // 1. Find record: FindFirst where mobile = mobile, purpose = purpose, verified = false, expiresAt > new Date().
  const record = await prisma.oTPVerification.findFirst({
    where: { 
      mobile: mobile,
      purpose: purpose,
      verified: false,
      expiresAt: { gt: new Date() }
    },
    orderBy: { createdAt: 'desc' }
  });

  // 2. If no record found: throw error
  if (!record) {
    const err = new Error('OTP expired or not found. Please request a new OTP.');
    err.status = 400;
    err.code = 'INVALID_OTP';
    throw err;
  }

  // 3. Check OTPAttempt for rate limiting (per mobile+purpose):
  const attempt = await prisma.oTPAttempt.findUnique({ where: { mobile_purpose: { mobile, purpose } } });
  if (attempt?.lockedUntil && attempt.lockedUntil > new Date()) {
    const secondsLeft = Math.ceil((attempt.lockedUntil.getTime() - Date.now()) / 1000);
    const err = new Error(`Too many attempts. Try again in ${secondsLeft} seconds.`);
    err.status = 429;
    err.code = 'OTP_LOCKED';
    err.retryAfter = secondsLeft;
    throw err;
  } else if (attempt?.lockedUntil && attempt.lockedUntil <= new Date()) {
    // Lock has expired — reset the attempt counter
    await prisma.oTPAttempt.upsert({
      where: { mobile_purpose: { mobile, purpose } },
      update: { attemptCount: 0, lockedUntil: null },
      create: { mobile, purpose, attemptCount: 0, lockedUntil: null }
    });
    attempt.attemptCount = 0;
  }

  // 4. Verify OTP using bcrypt
  const isValid = await bcrypt.compare(otp, record.otp);

  // 5. If invalid — increment attempt count:
  if (!isValid) {
    const newCount = (attempt?.attemptCount || 0) + 1;
    const lockUntil = newCount >= 5 ? new Date(Date.now() + 30 * 1000) : null;
    await prisma.oTPAttempt.upsert({
      where: { mobile_purpose: { mobile, purpose } },
      update: { attemptCount: newCount, lockedUntil: lockUntil },
      create: { mobile, purpose, attemptCount: 1, lockedUntil: null }
    });
    const err = new Error(newCount >= 5 ? 'Too many failed attempts. Locked for 30 seconds.' : `Invalid OTP. ${5 - newCount} attempts remaining.`);
    err.status = 400;
    err.code = 'INVALID_OTP';
    err.attemptsRemaining = Math.max(0, 5 - newCount);
    throw err;
  }

  // 6. If valid — clean up and proceed:
  await prisma.oTPVerification.update({
    where: { id: record.id },
    data: { verified: true }
  });
  await prisma.oTPAttempt.deleteMany({
    where: { mobile, purpose }
  });
  return true;
}

module.exports = {
  generateAndSendOTP,
  verifyOTP
};


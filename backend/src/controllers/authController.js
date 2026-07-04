const prisma = require('../lib/prisma');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const { generateAndSendOTP, verifyOTP } = require('../services/otpService');
const { createAuditLog } = require('../services/auditLogService');
const { getCustomerBalance } = require('../services/pointsService');
const { sendWhatsAppAlert, sendTelegramAlert } = require('../utils/whatsappNotify');

if (!process.env.JWT_SECRET) {
  throw new Error('[FATAL] JWT_SECRET environment variable is not set. Server cannot start.');
}
if (!process.env.JWT_REFRESH_SECRET) {
  throw new Error('JWT_REFRESH_SECRET environment variable is not set.');
}
const JWT_SECRET = process.env.JWT_SECRET;
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET;

/**
 * Register a new customer.
 */
async function register(req, res, next) {
  const { name, mobile, email, password, otp, referralCode, merchantCode } = req.body;
  const ipAddress = req.ip;

  try {
    // 1. Verify OTP has been verified
    const verifiedRecord = await prisma.oTPVerification.findFirst({
      where: {
        mobile,
        purpose: 'register',
        verified: true,
        expiresAt: { gt: new Date() }
      }
    });

    if (!verifiedRecord) {
      const err = new Error('OTP verification is required.');
      err.status = 400;
      err.code = 'INVALID_OTP';
      return next(err);
    }

    // Immediately delete the verified OTP record from database so it cannot be reused
    await prisma.oTPVerification.delete({
      where: { id: verifiedRecord.id }
    });

    // 2. Check for duplicate mobile
    const existingUser = await prisma.user.findUnique({
      where: { mobile }
    });
    if (existingUser) {
      const err = new Error('Mobile number already registered.');
      err.status = 400;
      err.code = 'DUPLICATE_MOBILE';
      return next(err);
    }

    // Check if referral code is provided and valid
    let referredByCustomerId = null;
    if (referralCode) {
      const referrer = await prisma.customer.findFirst({
        where: { referralCode: { equals: referralCode.trim(), mode: 'insensitive' } }
      });
      if (!referrer) {
        const err = new Error('Invalid referral code.');
        err.status = 400;
        err.code = 'INVALID_REFERRAL_CODE';
        return next(err);
      }
      referredByCustomerId = referrer.id;
    }

    // Check if merchantCode is provided and valid
    let signedUpViaMerchantId = null;
    if (merchantCode) {
      const merchant = await prisma.merchant.findUnique({
        where: { merchantCode }
      });
      if (merchant) {
        signedUpViaMerchantId = merchant.id;
      }
    }

    // 3. Hash Password
    const passwordHash = await bcrypt.hash(password, 10);

    // 4. Create User & Customer records inside a transaction
    const result = await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          mobile,
          email: email || null,
          password: passwordHash,
          role: 'customer'
        }
      });

      // Generate unique referral code
      const namePart = (name || '').replace(/[^a-zA-Z]/g, '').padEnd(4, 'X').substring(0, 4).toUpperCase();
      let referralCodeGenerated = '';
      let isUnique = false;
      let attempts = 0;
      while (!isUnique && attempts < 10) {
        const digitsPart = Math.floor(1000 + Math.random() * 9000).toString();
        referralCodeGenerated = `SKXT${namePart}${digitsPart}`;
        const existing = await tx.customer.findUnique({
          where: { referralCode: referralCodeGenerated }
        });
        if (!existing) {
          isUnique = true;
        }
        attempts++;
      }

      const customerId = uuidv4();
      const customer = await tx.customer.create({
        data: {
          id: customerId,
          userId: user.id,
          name,
          email: email || null,

          qrCode: `SKILLXT-${customerId}`,
          referralCode: referralCodeGenerated,
          referredBy: referredByCustomerId,
          signedUpViaMerchantId: signedUpViaMerchantId
        }
      });

      if (referralCode) {
        const referrer = await tx.customer.findFirst({
          where: { referralCode: { equals: referralCode.trim(), mode: 'insensitive' } }
        });
        if (referrer) {
          const now = new Date();
          const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
          const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

          const count = await tx.customer.count({
            where: {
              referredBy: referrer.id,
              id: { not: customer.id },
              createdAt: {
                gte: startOfMonth,
                lte: endOfMonth
              }
            }
          });

          if (count < 10) {
            const activeMerchant = await tx.merchant.findFirst({
              where: { isActive: true }
            });
            if (activeMerchant) {
              // Calculate expiry for referral bonus points
              const settings = await tx.rewardSettings.findFirst({ orderBy: { updatedAt: 'desc' } });
              const { calculateExpiryDate } = require('../services/pointsService');
              const expiresAt = settings ? calculateExpiryDate(settings) : new Date(Date.now() + 365 * 86400000);

              // Referrer bonus
              const referrerTx = await tx.transaction.create({
                data: {
                  customerId: referrer.id,
                  merchantId: activeMerchant.id,
                  type: 'earn',
                  purchaseAmount: null,
                  points: 20,
                  remarks: `Referral Bonus (Referrer): Referred ${name}`,
                  status: 'completed'
                }
              });

              const currentReferrerBalance = await getCustomerBalance(referrer.id, tx);
              const newReferrerBalance = currentReferrerBalance + 20;

              await tx.pointsLedger.create({
                data: {
                  customerId: referrer.id,
                  transactionId: referrerTx.id,
                  pointsChange: 20,
                  balanceAfter: newReferrerBalance,
                  expiresAt
                }
              });

              // Referee bonus
              const customerTx = await tx.transaction.create({
                data: {
                  customerId: customer.id,
                  merchantId: activeMerchant.id,
                  type: 'earn',
                  purchaseAmount: null,
                  points: 20,
                  remarks: `Referral Bonus (Referee): Referred by ${referrer.name}`,
                  status: 'completed'
                }
              });

              const currentCustomerBalance = await getCustomerBalance(customer.id, tx);
              const newCustomerBalance = currentCustomerBalance + 20;

              await tx.pointsLedger.create({
                data: {
                  customerId: customer.id,
                  transactionId: customerTx.id,
                  pointsChange: 20,
                  balanceAfter: newCustomerBalance,
                  expiresAt
                }
              });

              await tx.customer.update({
                where: { id: customer.id },
                data: { referralPointsEarned: { increment: 20 } }
              });

              await tx.customer.update({
                where: { id: referrer.id },
                data: { referralPointsEarned: { increment: 20 } }
              });
            }
          }
        }
      }



      return { user, customer };
    });

    // Write audit log
    await createAuditLog(result.user.id, 'CUSTOMER_REGISTER', 'User', result.user.id, { mobile }, ipAddress);

    res.status(201).json({
      success: true,
      message: 'Registration successful.',
      data: {
        userId: result.user.id,
        customerId: result.customer.id,
        name: result.customer.name,
        mobile: result.user.mobile
      }
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Login handler for all roles.
 */
async function login(req, res, next) {
  const { identifier, password } = req.body; // identifier can be mobile or email
  const ipAddress = req.ip;

  try {
    // Find user by email or mobile
    const user = await prisma.user.findFirst({
      where: {
        OR: [
          { email: identifier },
          { mobile: identifier }
        ]
      },
      include: {
        merchant: true,
        customer: true
      }
    });

    if (!user) {
      await createAuditLog(null, 'LOGIN_FAILURE', null, null, { identifier, reason: 'User not found' }, ipAddress);
      const err = new Error('Invalid credentials.');
      err.status = 401;
      err.code = 'UNAUTHORIZED';
      return next(err);
    }

    if (!user.isActive) {
      await createAuditLog(user.id, 'LOGIN_FAILURE', 'User', user.id, { reason: 'User inactive' }, ipAddress);
      const err = new Error('Your account is deactivated.');
      err.status = 403;
      err.code = 'FORBIDDEN';
      return next(err);
    }

    // Verify Password
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      await createAuditLog(user.id, 'LOGIN_FAILURE', 'User', user.id, { reason: 'Invalid password' }, ipAddress);
      const err = new Error('Invalid credentials.');
      err.status = 401;
      err.code = 'UNAUTHORIZED';
      return next(err);
    }

    // Generate JWT Access Token (24 hours expiry)
    const accessToken = jwt.sign(
      { userId: user.id, role: user.role },
      JWT_SECRET,
      { expiresIn: '15m' }
    );

    // Generate Refresh Token (7 days expiry) — hashed before storage
    const refreshTokenString = uuidv4() + uuidv4();
    const hashedToken = await bcrypt.hash(refreshTokenString, 10);
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

    await prisma.refreshToken.create({
      data: {
        userId: user.id,
        token: hashedToken,
        expiresAt
      }
    });

    // Write audit log
    await createAuditLog(user.id, 'LOGIN_SUCCESS', 'User', user.id, {}, ipAddress);

    // Prepare response data
    let name = 'System Administrator';
    let profileId = null;

    if (user.role === 'merchant' && user.merchant) {
      name = user.merchant.businessName;
      profileId = user.merchant.id;
    } else if (user.role === 'customer' && user.customer) {
      name = user.customer.name;
      profileId = user.customer.id;
    }

    res.status(200).json({
      success: true,
      message: 'Login successful.',
      data: {
        accessToken,
        refreshToken: refreshTokenString,
        user: {
          id: user.id,
          profileId,
          email: user.email,
          mobile: user.mobile,
          role: user.role,
          name
        }
      }
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Logout handler — supports hashed token lookup.
 */
async function logout(req, res, next) {
  const { refreshToken } = req.body;
  const ipAddress = req.ip;

  try {
    if (refreshToken) {
      // Find and revoke the matching token by comparing hashes
      const candidateTokens = await prisma.refreshToken.findMany({
        where: { isRevoked: false }
      });

      for (const record of candidateTokens) {
        const matches = await bcrypt.compare(refreshToken, record.token);
        if (matches) {
          await prisma.refreshToken.update({
            where: { id: record.id },
            data: { isRevoked: true }
          });
          await createAuditLog(record.userId, 'LOGOUT', 'User', record.userId, {}, ipAddress);
          break;
        }
      }
    }

    res.status(200).json({
      success: true,
      message: 'Logged out successfully.'
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Refresh JWT access token with reuse detection.
 * If a revoked token is used, all tokens for that user are revoked (token theft mitigation).
 */
async function refreshToken(req, res, next) {
  const { refreshToken: oldToken } = req.body;

  try {
    if (!oldToken) {
      const err = new Error('Refresh token is required.');
      err.status = 400;
      err.code = 'VALIDATION_ERROR';
      return next(err);
    }

    // Find all non-revoked tokens for the user and compare hashes
    const candidateTokens = await prisma.refreshToken.findMany({
      where: { isRevoked: false },
      include: { user: true }
    });

    let matchedRecord = null;
    for (const record of candidateTokens) {
      const matches = await bcrypt.compare(oldToken, record.token);
      if (matches) {
        matchedRecord = record;
        break;
      }
    }

    if (!matchedRecord) {
      // Token not found — check if it was a previously used (revoked) token
      const revokedTokens = await prisma.refreshToken.findMany({
        where: { isRevoked: true },
        include: { user: true }
      });

      for (const revoked of revokedTokens) {
        const wasUsed = await bcrypt.compare(oldToken, revoked.token);
        if (wasUsed) {
          // REUSE DETECTED: Revoke all tokens for this user
          await prisma.refreshToken.updateMany({
            where: { userId: revoked.userId },
            data: { isRevoked: true }
          });
          await createAuditLog(revoked.userId, 'TOKEN_REUSE_DETECTED', 'User', revoked.userId, { tokenReuse: true }, req.ip);

          const err = new Error('Refresh token has been reused. All sessions have been revoked for security.');
          err.status = 401;
          err.code = 'TOKEN_REUSE';
          return next(err);
        }
      }

      const err = new Error('Refresh token is invalid or revoked.');
      err.status = 401;
      err.code = 'UNAUTHORIZED';
      return next(err);
    }

    if (matchedRecord.expiresAt < new Date()) {
      await prisma.refreshToken.delete({
        where: { id: matchedRecord.id }
      });
      const err = new Error('Refresh token is expired.');
      err.status = 401;
      err.code = 'TOKEN_EXPIRED';
      return next(err);
    }

    if (!matchedRecord.user.isActive) {
      const err = new Error('User account is inactive.');
      err.status = 403;
      err.code = 'FORBIDDEN';
      return next(err);
    }

    // Mark the old token as revoked
    await prisma.refreshToken.update({
      where: { id: matchedRecord.id },
      data: { isRevoked: true }
    });

    // Generate new Refresh Token (7 days expiry) — hashed before storage
    const newRefreshTokenString = uuidv4() + uuidv4();
    const hashedNewToken = await bcrypt.hash(newRefreshTokenString, 10);
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    await prisma.refreshToken.create({
      data: {
        userId: matchedRecord.user.id,
        token: hashedNewToken,
        expiresAt
      }
    });

    // Generate new Access Token (15 minutes expiry)
    const accessToken = jwt.sign(
      { userId: matchedRecord.user.id, role: matchedRecord.user.role },
      JWT_SECRET,
      { expiresIn: '15m' }
    );

    res.status(200).json({
      success: true,
      message: 'Token refreshed successfully.',
      data: {
        accessToken,
        refreshToken: newRefreshTokenString
      }
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Request an OTP.
 */
async function requestOTP(req, res, next) {
  const { mobile, email } = req.body;
  const hasEmail = email && email.trim().length > 0;

  try {
    // Check for duplicate mobile BEFORE sending OTP
    const existingMobileUser = await prisma.user.findUnique({
      where: { mobile }
    });
    if (existingMobileUser) {
      const err = new Error('This mobile number is already registered. Please login instead.');
      err.status = 400;
      err.code = 'DUPLICATE_MOBILE';
      return next(err);
    }

    // If email is provided, verify it doesn't belong to another user
    if (hasEmail) {
      const existingEmailUser = await prisma.user.findFirst({
        where: { email: email.trim() }
      });
      if (existingEmailUser && existingEmailUser.mobile !== mobile) {
        const err = new Error('This email address is already associated with another account.');
        err.status = 400;
        err.code = 'EMAIL_TAKEN';
        return next(err);
      }
    }

    const { otp } = await generateAndSendOTP(mobile, hasEmail ? email : null, 'register');

    res.status(200).json({
      success: true,
      message: hasEmail
        ? 'OTP sent to your email address.'
        : 'OTP sent to your mobile number.',
      data: {}
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Verify OTP.
 */
async function verifyOTPHandler(req, res, next) {
  const { mobile, otp } = req.body;

  try {
    const isVerified = await verifyOTP(mobile, otp, 'register');
    if (!isVerified) {
      const err = new Error('Invalid or expired OTP.');
      err.status = 400;
      err.code = 'INVALID_OTP';
      return next(err);
    }

    res.status(200).json({
      success: true,
      message: 'OTP verified successfully.'
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Request Password Reset.
 */
async function requestReset(req, res, next) {
  const { identifier } = req.body; // email or mobile

  try {
    const user = await prisma.user.findFirst({
      where: {
        OR: [
          { email: identifier },
          { mobile: identifier }
        ]
      }
    });

    if (!user) {
      // Return generic message to prevent account enumeration
      res.status(200).json({
        success: true,
        message: 'If an account with that email or mobile exists, a password reset OTP has been sent.'
      });
      return;
    }

    const hasEmail = user.email && user.email.trim().length > 0;
    if (!hasEmail) {
      const err = new Error('No email address on file. Please contact support to reset your password.');
      err.status = 400;
      err.code = 'NO_EMAIL';
      return next(err);
    }

    const { otp } = await generateAndSendOTP(user.mobile, user.email, 'reset');

    res.status(200).json({
      success: true,
      message: 'OTP sent to your registered email address.',
      data: { mobile: user.mobile }
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Reset Password using OTP.
 */
async function resetPassword(req, res, next) {
  const { mobile, otp, newPassword } = req.body;
  const ipAddress = req.ip;

  try {
    // Verify OTP
    const isOtpValid = await verifyOTP(mobile, otp, 'reset');
    if (!isOtpValid) {
      const err = new Error('Invalid or expired OTP.');
      err.status = 400;
      err.code = 'INVALID_OTP';
      return next(err);
    }

    // Immediately delete the verified OTP record from database
    await prisma.oTPVerification.deleteMany({
      where: { mobile, purpose: 'reset', verified: true }
    });

    const user = await prisma.user.findUnique({
      where: { mobile }
    });

    if (!user) {
      const err = new Error('User not found.');
      err.status = 404;
      err.code = 'NOT_FOUND';
      return next(err);
    }

    // Hash and update password
    const passwordHash = await bcrypt.hash(newPassword, 10);
    await prisma.user.update({
      where: { id: user.id },
      data: { password: passwordHash }
    });

    // Invalidate all refresh tokens for security
    await prisma.refreshToken.deleteMany({
      where: { userId: user.id }
    });

    await createAuditLog(user.id, 'PASSWORD_RESET', 'User', user.id, {}, ipAddress);

    res.status(200).json({
      success: true,
      message: 'Password reset successfully.'
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Get public stats for landing page — uses SQL aggregates for performance.
 */
async function getPublicStats(req, res, next) {
  try {
    const merchantsCount = await prisma.merchant.count();
    const membersCount = await prisma.customer.count();

    // Use SQL aggregate instead of loading all ledger rows into memory
    const result = await prisma.$queryRaw`
      SELECT COALESCE(SUM("pointsChange"), 0)::bigint as "pointsIssued"
      FROM "PointsLedger"
      WHERE "pointsChange" > 0
    `;
    const pointsIssued = Number(result[0]?.pointsIssued || 0);

    res.status(200).json({
      success: true,
      data: {
        merchantsCount,
        membersCount,
        pointsIssued
      }
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Public merchant registration (self-signup).
 */
async function registerMerchant(req, res, next) {
  const { mobile, email, businessName, ownerName, category, password } = req.body;
  const ipAddress = req.ip;

  try {
    if (!password) {
      const err = new Error('Password is required.');
      err.status = 400;
      err.code = 'VALIDATION_ERROR';
      return next(err);
    }

    // Check for duplicate mobile
    const existingUser = await prisma.user.findFirst({
      where: { mobile }
    });
    if (existingUser) {
      const err = new Error('Mobile number already registered.');
      err.status = 400;
      err.code = 'DUPLICATE_MOBILE';
      return next(err);
    }

    // Check for duplicate email if provided
    if (email) {
      const existingEmail = await prisma.user.findFirst({
        where: { email }
      });
      if (existingEmail) {
        const err = new Error('Email already registered.');
        err.status = 400;
        err.code = 'DUPLICATE_EMAIL';
        return next(err);
      }
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const result = await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          email: email || null,
          mobile,
          password: passwordHash,
          role: 'merchant'
        }
      });

      // Generate unique merchant code
      const namePart = (businessName || '').replace(/[^a-zA-Z]/g, '').padEnd(4, 'X').substring(0, 4).toUpperCase();
      let merchantCodeGenerated = '';
      let isUnique = false;
      let attempts = 0;
      while (!isUnique && attempts < 10) {
        const digitsPart = Math.floor(1000 + Math.random() * 9000).toString();
        merchantCodeGenerated = `SKXT${namePart}${digitsPart}`;
        const existing = await tx.merchant.findUnique({
          where: { merchantCode: merchantCodeGenerated }
        });
        if (!existing) {
          isUnique = true;
        }
        attempts++;
      }

      const merchant = await tx.merchant.create({
        data: {
          userId: user.id,
          businessName,
          ownerName,
          email: email || null,
          category,
          merchantCode: merchantCodeGenerated,
          status: 'active'
        },
        include: {
          user: {
            select: {
              id: true,
              email: true,
              mobile: true,
              role: true,
              isActive: true,
              createdAt: true
            }
          }
        }
      });

      return merchant;
    });

    // Auto-login: generate tokens so the merchant can start using immediately
    const token = jwt.sign(
      { userId: result.user.id, role: 'merchant', merchantId: result.id },
      JWT_SECRET,
      { expiresIn: '15m' }
    );

    const refreshTokenString = uuidv4() + uuidv4();
    const hashedToken = await bcrypt.hash(refreshTokenString, 10);
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    await prisma.refreshToken.create({
      data: {
        userId: result.user.id,
        token: hashedToken,
        expiresAt
      }
    });

    await createAuditLog(result.user.id, 'MERCHANT_SELF_REGISTERED', 'Merchant', result.id, { businessName }, ipAddress);

    res.status(201).json({
      success: true,
      message: 'Merchant account created successfully.',
      data: {
        accessToken: token,
        refreshToken: refreshTokenString,
        user: {
          id: result.user.id,
          profileId: result.id,
          email: result.user.email,
          mobile: result.user.mobile,
          role: result.user.role,
          name: result.ownerName
        }
      }
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Public merchant self-signup.
 */
async function registerMerchantSelf(req, res, next) {
  const { businessName, ownerName, mobile, email, password, category, address, city, latitude, longitude } = req.body;
  const ipAddress = req.ip;

  try {
    if (!businessName || !mobile || !password) {
      const err = new Error('businessName, mobile, and password are required.');
      err.status = 400;
      err.code = 'VALIDATION_ERROR';
      return next(err);
    }

    const existingUser = await prisma.user.findFirst({ where: { mobile } });
    if (existingUser) {
      const err = new Error('Mobile number already registered.');
      err.status = 400;
      err.code = 'DUPLICATE_MOBILE';
      return next(err);
    }

    if (email) {
      const existingEmail = await prisma.user.findFirst({ where: { email } });
      if (existingEmail) {
        const err = new Error('Email already registered.');
        err.status = 400;
        err.code = 'DUPLICATE_EMAIL';
        return next(err);
      }
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const result = await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          email: email || null,
          mobile,
          password: passwordHash,
          role: 'merchant'
        }
      });

      const namePart = (businessName || '').replace(/[^a-zA-Z]/g, '').padEnd(4, 'X').substring(0, 4).toUpperCase();
      let merchantCodeGenerated = '';
      let isUnique = false;
      let attempts = 0;
      while (!isUnique && attempts < 10) {
        const digitsPart = Math.floor(1000 + Math.random() * 9000).toString();
        merchantCodeGenerated = `SKXT${namePart}${digitsPart}`;
        const existing = await tx.merchant.findUnique({ where: { merchantCode: merchantCodeGenerated } });
        if (!existing) {
          isUnique = true;
        }
        attempts++;
      }

      const merchant = await tx.merchant.create({
        data: {
          userId: user.id,
          businessName,
          ownerName: ownerName || null,
          email: email || null,
          category: category || null,
          address: address || null,
          city: city || null,
          latitude: latitude ? parseFloat(latitude) : undefined,
          longitude: longitude ? parseFloat(longitude) : undefined,
          merchantCode: merchantCodeGenerated,
          status: 'pending',
          pointsBalance: 0,
          paymentScreenshot: null
        },
        include: {
          user: {
            select: {
              id: true,
              email: true,
              mobile: true,
              role: true,
              isActive: true,
              createdAt: true
            }
          }
        }
      });

      return merchant;
    });

    await createAuditLog(result.user.id, 'MERCHANT_SELF_REGISTERED', 'Merchant', result.id, { businessName, status: 'pending' }, ipAddress);

    await sendWhatsAppAlert(
      `New Merchant Application%0A` +
      `Business: ${businessName}%0A` +
      `Owner: ${ownerName}%0A` +
      `Mobile: ${mobile}%0A` +
      `City: ${city}%0A` +
      `Category: ${category}%0A` +
      `Action needed: Admin approval required`
    );

    await sendTelegramAlert(
      `New Merchant Application%0A` +
      `Business: ${businessName}%0A` +
      `Owner: ${ownerName}%0A` +
      `Mobile: ${mobile}%0A` +
      `City: ${city}%0A` +
      `Category: ${category}%0A` +
      `Action needed: Admin approval required`
    );

    res.status(201).json({
      success: true,
      message: 'Application submitted successfully. You will be notified once admin reviews your application.',
      data: {
        merchantCode: result.merchantCode
      }
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  register,
  registerMerchant,
  registerMerchantSelf,
  login,
  logout,
  refreshToken,
  requestOTP,
  verifyOTPHandler,
  requestReset,
  resetPassword,
  getPublicStats
};

const prisma = require('../lib/prisma');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const QRCode = require('qrcode');
const { getCustomerBalance, getPointsSummary, getExpiringPoints } = require('../services/pointsService');
const { generateAndSendOTP, verifyOTP } = require('../services/otpService');
const notificationService = require('../services/notificationService');

const JWT_SECRET = process.env.JWT_SECRET;

/**
 * Get customer profile and current balance.
 */
async function getProfile(req, res, next) {
  const customerId = req.user.customerId;

  try {
    // Combine customer.findUnique (Hop 1) with all customerId-only Hop 2 tasks
    // into a single parallel batch. Only the referrer lookup depends on the result.
    const [customer, pointsSummary, totalVisits, referredCount, referralAggregate, rewardSettings] = await Promise.all([
      prisma.customer.findUnique({
        where: { id: customerId },
        include: {
          user: {
            select: {
              email: true,
              mobile: true,
              createdAt: true
            }
          }
        }
      }),

      getPointsSummary(customerId),

      prisma.transaction.count({
        where: {
          customerId,
          status: 'completed'
        }
      }),

      prisma.customer.count({
        where: { referredBy: customerId }
      }),

      // Use aggregate instead of findMany + JS reduce
      prisma.transaction.aggregate({
        where: {
          customerId,
          status: 'completed',
          remarks: { contains: 'Referral' }
        },
        _sum: { points: true }
      }),

      prisma.rewardSettings.findFirst({
        orderBy: { updatedAt: 'desc' }
      })
    ]);

    if (!customer) {
      const err = new Error('Customer profile not found.');
      err.status = 404;
      err.code = 'NOT_FOUND';
      return next(err);
    }

    // Referrer lookup — only if customer has a referrer, runs after the parallel batch
    let referrer = null;
    if (customer.referredBy) {
      referrer = await prisma.customer.findUnique({
        where: { id: customer.referredBy },
        select: { name: true }
      });
    }

    const { activeBalance: balance, lifetimeEarned, lifetimeRedeemed } = pointsSummary;
    const referredByName = referrer ? referrer.name : null;
    const referredPoints = referralAggregate._sum.points || 0;

    res.status(200).json({
      success: true,
      message: 'Profile retrieved successfully.',
      data: {
        id: customer.id,
        name: customer.name,
        mobile: customer.user.mobile,
        email: customer.email,
        qrCode: customer.qrCode,
        isActive: customer.isActive,
        createdAt: customer.createdAt,
        dateOfBirth: customer.dateOfBirth,
        gender: customer.gender,
        city: customer.city,
        pinCode: customer.pinCode,
        area: customer.area,
        occupation: customer.occupation,
        maritalStatus: customer.maritalStatus,
        anniversaryDate: customer.anniversaryDate,
        numberOfChildren: customer.numberOfChildren,
        preferredLanguage: customer.preferredLanguage,
        communicationPref: customer.communicationPref,
        favouriteCategories: customer.favouriteCategories ? JSON.parse(customer.favouriteCategories) : [],
        dietaryPreference: customer.dietaryPreference,
        notificationOptIn: customer.notificationOptIn,
        referralCode: customer.referralCode,
        referredBy: customer.referredBy,
        referredByName,
        referredCount,
        referredPoints,
        profilePhoto: customer.profilePhoto,
        updatedAt: customer.updatedAt,
        balance,
        rewardSettings: rewardSettings ? {
          pointsPerRupee: parseFloat(rewardSettings.pointsPerRupee),
          rupeesPerPoint: parseFloat(rewardSettings.rupeesPerPoint),
          minRedeemPoints: rewardSettings.minRedeemPoints,
          pointsExpiryDays: rewardSettings.pointsExpiryDays
        } : {
          pointsPerRupee: 0.10,
          rupeesPerPoint: 0.10,
          minRedeemPoints: 100,
          pointsExpiryDays: 365
        },
        stats: {
          lifetimeEarned,
          lifetimeRedeemed,
          totalVisits,
          balance,
          expiredPoints: pointsSummary.expiredPoints,
          expiringWithin30Days: pointsSummary.expiringWithin30Days,
          expiringEntries: pointsSummary.expiringEntries
        }
      }
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Get computed points balance.
 */
async function getBalance(req, res, next) {
  const customerId = req.user.customerId;

  try {
    const balance = await getCustomerBalance(customerId);
    res.status(200).json({
      success: true,
      message: 'Balance retrieved successfully.',
      data: { balance }
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Get paginated points ledger.
 */
async function getLedger(req, res, next) {
  const customerId = req.user.customerId;
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 20;
  const search = req.query.search || '';

  if (!customerId) {
    return res.status(200).json({
      success: true,
      message: 'Ledger retrieved successfully.',
      data: {
        entries: [],
        pagination: {
          total: 0,
          page,
          limit,
          totalPages: 0
        }
      }
    });
  }

  const skip = (page - 1) * limit;

  try {
    // Search filter: matching transaction remarks
    const whereCondition = {
      customerId,
      ...(search ? {
        transaction: {
          OR: [
            { remarks: { contains: search } },
            { merchant: { businessName: { contains: search } } }
          ]
        }
      } : {})
    };

    const [entries, total] = await prisma.$transaction([
      prisma.pointsLedger.findMany({
        where: whereCondition,
        include: {
          transaction: {
            select: {
              type: true,
              purchaseAmount: true,
              remarks: true,
              merchant: {
                select: {
                  businessName: true
                }
              }
            }
          }
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit
      }),
      prisma.pointsLedger.count({ where: whereCondition })
    ]);

    res.status(200).json({
      success: true,
      message: 'Ledger retrieved successfully.',
      data: {
        entries,
        pagination: {
          total,
          page,
          limit,
          totalPages: Math.ceil(total / limit)
        }
      }
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Get paginated transaction history.
 */
async function getTransactions(req, res, next) {
  const customerId = req.user.customerId;
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 20;
  const search = req.query.search || '';

  if (!customerId) {
    return res.status(200).json({
      success: true,
      message: 'Transactions retrieved successfully.',
      data: {
        transactions: [],
        pagination: {
          total: 0,
          page,
          limit,
          totalPages: 0
        }
      }
    });
  }

  const skip = (page - 1) * limit;

  try {
    const whereCondition = {
      customerId,
      ...(search ? {
        OR: [
          { remarks: { contains: search } },
          { merchant: { businessName: { contains: search } } }
        ]
      } : {})
    };

    const [transactions, total] = await prisma.$transaction([
      prisma.transaction.findMany({
        where: whereCondition,
        include: {
          merchant: {
            select: {
              businessName: true,
              category: true
            }
          }
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit
      }),
      prisma.transaction.count({ where: whereCondition })
    ]);

    res.status(200).json({
      success: true,
      message: 'Transactions retrieved successfully.',
      data: {
        transactions,
        pagination: {
          total,
          page,
          limit,
          totalPages: Math.ceil(total / limit)
        }
      }
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Get customer QR code data URL.
 */
async function getQRCodeDataURL(req, res, next) {
  const customerId = req.user.customerId;

  try {
    const customer = await prisma.customer.findUnique({
      where: { id: customerId }
    });

    if (!customer) {
      const err = new Error('Customer not found.');
      err.status = 404;
      err.code = 'NOT_FOUND';
      return next(err);
    }

    const qrDataUrl = await QRCode.toDataURL(customer.qrCode);

    res.status(200).json({
      success: true,
      message: 'QR code generated.',
      data: {
        qrCodeString: customer.qrCode,
        qrDataUrl
      }
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Distance calculation helper (Haversine formula)
 */
function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371; // radius of Earth in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * 
    Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return parseFloat((R * c).toFixed(1));
}

/**
 * Get all active merchants.
 */
async function getMerchants(req, res, next) {
  const { lat, lng, radius } = req.query;

  try {
    const merchants = await prisma.merchant.findMany({
      where: {
        isActive: true
      },
select: {
         id: true,
         userId: true,
         businessName: true,
         ownerName: true,
         email: true,
         address: true,
         city: true,
         category: true,
         isActive: true,
         createdAt: true,
         latitude: true,
         longitude: true,
         googleMapsUrl: true,
         landmark: true,
         openingTime: true,
         closingTime: true,
         workingDays: true,
         isOpen: true,
         user: {
          select: {
            id: true,
            mobile: true
          }
        }
      }
    });

    let formattedMerchants = merchants.map(m => {
      let distance = null;
      if (lat && lng && m.latitude !== null && m.longitude !== null) {
        distance = calculateDistance(parseFloat(lat), parseFloat(lng), m.latitude, m.longitude);
      }
      return {
        ...m,
        distance
      };
    });

    // Filter by radius if provided
    if (lat && lng && radius) {
      const radiusLimit = parseFloat(radius);
      formattedMerchants = formattedMerchants.filter(m => m.distance !== null && m.distance <= radiusLimit);
    }

    // Sort by distance ascending if location provided, otherwise alphabetical
    if (lat && lng) {
      formattedMerchants.sort((a, b) => {
        if (a.distance === null && b.distance === null) return a.businessName.localeCompare(b.businessName);
        if (a.distance === null) return 1;
        if (b.distance === null) return -1;
        return a.distance - b.distance;
      });
    } else {
      formattedMerchants.sort((a, b) => a.businessName.localeCompare(b.businessName));
    }

    res.status(200).json({
      success: true,
      message: 'Active merchants retrieved successfully.',
      data: formattedMerchants
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Update customer profile.
 */
async function updateProfile(req, res, next) {
  const customerId = req.user.customerId;
  const {
    name, email, dateOfBirth, gender, city, pinCode, area,
    occupation, maritalStatus, anniversaryDate, numberOfChildren,
    preferredLanguage, communicationPref, favouriteCategories,
    dietaryPreference, notificationOptIn, profilePhoto, alternativePhone
  } = req.body;

  try {
    const customer = await prisma.customer.findUnique({
      where: { id: customerId }
    });
    if (!customer) {
      const err = new Error('Customer profile not found.');
      err.status = 404;
      err.code = 'NOT_FOUND';
      return next(err);
    }

    // Email duplicate check
    if (email && email !== customer.email) {
      const existingUser = await prisma.user.findFirst({
        where: { email, id: { not: customer.userId } }
      });
      if (existingUser) {
        const err = new Error('Email address is already in use by another account.');
        err.status = 400;
        err.code = 'DUPLICATE_EMAIL';
        return next(err);
      }
    }

    // Categories array to JSON string conversion
    const favCatString = favouriteCategories ? JSON.stringify(favouriteCategories) : null;

    // Update in transaction
    const updatedCustomer = await prisma.$transaction(async (tx) => {
      if (email) {
        await tx.user.update({
          where: { id: customer.userId },
          data: { email }
        });
      }

      return await tx.customer.update({
        where: { id: customerId },
        data: {
          name,
          email: email || null,
          dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : null,
          gender: gender || null,
          city: city || null,
          pinCode: pinCode || null,
          area: area || null,
          occupation: occupation || null,
          maritalStatus: maritalStatus || null,
          anniversaryDate: anniversaryDate ? new Date(anniversaryDate) : null,
          numberOfChildren: numberOfChildren !== undefined ? numberOfChildren : 0,
          preferredLanguage: preferredLanguage || "English",
          communicationPref: communicationPref || "email",
          favouriteCategories: favCatString,
          dietaryPreference: dietaryPreference || null,
          notificationOptIn: notificationOptIn !== undefined ? notificationOptIn : true,
          profilePhoto: profilePhoto || null,
          alternativePhone: alternativePhone || null
        },
        include: {
          user: {
            select: {
              email: true,
              mobile: true,
              createdAt: true
            }
          }
        }
      });
    });

    const balance = await getCustomerBalance(customerId);

    // Calculate transaction lifetime stats
    const totalEarnedAggregate = await prisma.transaction.aggregate({
      where: { customerId, type: 'earn', status: 'completed' },
      _sum: { points: true }
    });
    const lifetimeEarned = totalEarnedAggregate._sum.points || 0;

    const totalRedeemedAggregate = await prisma.transaction.aggregate({
      where: { customerId, type: 'redeem', status: 'completed' },
      _sum: { points: true }
    });
    const lifetimeRedeemed = totalRedeemedAggregate._sum.points || 0;

    const totalVisits = await prisma.transaction.count({
      where: { customerId, status: 'completed' }
    });

    let referredByName = null;
    if (updatedCustomer.referredBy) {
      const referrer = await prisma.customer.findUnique({
        where: { id: updatedCustomer.referredBy },
        select: { name: true }
      });
      if (referrer) {
        referredByName = referrer.name;
      }
    }

    res.status(200).json({
      success: true,
      message: 'Profile updated successfully.',
      data: {
        id: updatedCustomer.id,
        name: updatedCustomer.name,
        mobile: updatedCustomer.user.mobile,
        email: updatedCustomer.email,
        qrCode: updatedCustomer.qrCode,
        isActive: updatedCustomer.isActive,
        createdAt: updatedCustomer.createdAt,
        dateOfBirth: updatedCustomer.dateOfBirth,
        gender: updatedCustomer.gender,
        city: updatedCustomer.city,
        pinCode: updatedCustomer.pinCode,
        area: updatedCustomer.area,
        occupation: updatedCustomer.occupation,
        maritalStatus: updatedCustomer.maritalStatus,
        anniversaryDate: updatedCustomer.anniversaryDate,
        numberOfChildren: updatedCustomer.numberOfChildren,
        preferredLanguage: updatedCustomer.preferredLanguage,
        communicationPref: updatedCustomer.communicationPref,
        favouriteCategories: updatedCustomer.favouriteCategories ? JSON.parse(updatedCustomer.favouriteCategories) : [],
        dietaryPreference: updatedCustomer.dietaryPreference,
        notificationOptIn: updatedCustomer.notificationOptIn,
        referralCode: updatedCustomer.referralCode,
        referredBy: updatedCustomer.referredBy,
        referredByName,
        profilePhoto: updatedCustomer.profilePhoto,
        updatedAt: updatedCustomer.updatedAt,
        balance,
        stats: {
          lifetimeEarned,
          lifetimeRedeemed,
          totalVisits,
          balance
        }
      }
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Request OTP for customer mobile change.
 */
async function requestMobileOTP(req, res, next) {
  const customerId = req.user.customerId;

  try {
    const customer = await prisma.customer.findUnique({
      where: { id: customerId },
      include: { user: true }
    });

    if (!customer) {
      const err = new Error('Customer profile not found.');
      err.status = 404;
      err.code = 'NOT_FOUND';
      return next(err);
    }

    const hasEmail = customer.email && customer.email.trim().length > 0;
    const { otp } = await generateAndSendOTP(customer.user.mobile, hasEmail ? customer.email : null, 'change_mobile');

    if (hasEmail) {
      res.status(200).json({
        success: true,
        message: 'OTP sent to your email address.'
      });
    } else {
      const err = new Error('No email address on file. Please contact admin to add your email before changing mobile.');
      err.status = 400;
      err.code = 'NO_EMAIL';
      return next(err);
    }
  } catch (error) {
    next(error);
  }
}

/**
 * Verify OTP and update mobile number.
 */
async function updateMobile(req, res, next) {
  const customerId = req.user.customerId;
  const { otp, newMobile } = req.body;

  try {
    const customer = await prisma.customer.findUnique({
      where: { id: customerId },
      include: { user: true }
    });

    if (!customer) {
      const err = new Error('Customer profile not found.');
      err.status = 404;
      err.code = 'NOT_FOUND';
      return next(err);
    }

    // Verify OTP first
    const isOtpValid = await verifyOTP(customer.user.mobile, otp, 'change_mobile');
    if (!isOtpValid) {
      const err = new Error('Invalid or expired OTP.');
      err.status = 400;
      err.code = 'INVALID_OTP';
      return next(err);
    }

    // Delete verified OTP attempts
    await prisma.oTPVerification.deleteMany({
      where: { mobile: customer.user.mobile, verified: true }
    });

    // Check if new mobile is already taken
    if (newMobile !== customer.user.mobile) {
      const existingUser = await prisma.user.findFirst({
        where: { mobile: newMobile, id: { not: customer.userId } }
      });
      if (existingUser) {
        const err = new Error('Mobile number already in use by another account.');
        err.status = 400;
        err.code = 'DUPLICATE_MOBILE';
        return next(err);
      }
    }

    // Update in transaction
    await prisma.$transaction([
      prisma.user.update({
        where: { id: customer.userId },
        data: { mobile: newMobile }
      })
    ]);

    res.status(200).json({
      success: true,
      message: 'Mobile number updated successfully.',
      data: { mobile: newMobile }
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Update customer email address.
 */
async function updateEmail(req, res, next) {
  const customerId = req.user.customerId;
  const { email } = req.body;

  try {
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      const err = new Error('Please enter a valid email address.');
      err.status = 400;
      err.code = 'VALIDATION_ERROR';
      return next(err);
    }

    const customer = await prisma.customer.findUnique({
      where: { id: customerId }
    });

    if (!customer) {
      const err = new Error('Customer profile not found.');
      err.status = 404;
      err.code = 'NOT_FOUND';
      return next(err);
    }

    // Check if email is already taken by another user
    const existingUser = await prisma.user.findFirst({
      where: {
        email,
        id: { not: customer.userId }
      }
    });

    if (existingUser) {
      const err = new Error('Email address is already in use.');
      err.status = 400;
      err.code = 'DUPLICATE_EMAIL';
      return next(err);
    }

    await prisma.$transaction([
      prisma.customer.update({
        where: { id: customerId },
        data: { email }
      }),
      prisma.user.update({
        where: { id: customer.userId },
        data: { email }
      })
    ]);

    res.status(200).json({
      success: true,
      message: 'Email address updated successfully.'
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Generate a short-lived SSE token for real-time notifications.
 * This avoids placing the main access token in URLs.
 */
async function getSSEToken(req, res, next) {
  try {
    const sseToken = jwt.sign(
      { userId: req.user.id, purpose: 'sse' },
      JWT_SECRET,
      { expiresIn: '5m' }
    );

    res.status(200).json({
      success: true,
      data: { sseToken }
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Handle SSE notifications stream for customer real-time updates.
 */
async function streamNotifications(req, res, next) {
  const customerId = req.user.customerId;
  if (!customerId) {
    return res.status(400).json({ success: false, message: 'Customer ID is required.' });
  }

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  notificationService.addClient(customerId, res);

  req.on('close', () => {
    notificationService.removeClient(customerId, res);
  });
}

/**
 * Submit a complaint/feedback from customer.
 */
async function submitComplaint(req, res, next) {
  const customerId = req.user.customerId;
  const userId = req.user.id;
  const { type, description } = req.body;

  if (!type || !description) {
    const err = new Error('Complaint type and description are required.');
    err.status = 400;
    err.code = 'BAD_REQUEST';
    return next(err);
  }

  try {
    const customer = await prisma.customer.findUnique({
      where: { id: customerId }
    });

    if (!customer) {
      const err = new Error('Customer profile not found.');
      err.status = 404;
      err.code = 'NOT_FOUND';
      return next(err);
    }

    const complaint = await prisma.complaint.create({
      data: {
        userId,
        userRole: 'customer',
        userName: customer.name || 'Unknown Customer',
        type,
        description,
        status: 'Pending'
      }
    });

    res.status(201).json({
      success: true,
      message: 'Complaint submitted successfully.',
      data: complaint
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Get customer referral stats.
 */
async function getReferralStats(req, res, next) {
  const customerId = req.user.customerId;

  try {
    const customer = await prisma.customer.findUnique({
      where: { id: customerId }
    });

    if (!customer) {
      const err = new Error('Customer profile not found.');
      err.status = 404;
      err.code = 'NOT_FOUND';
      return next(err);
    }

    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

    const monthlyReferrals = await prisma.customer.count({
      where: {
        referredBy: customerId,
        createdAt: {
          gte: startOfMonth,
          lte: endOfMonth
        }
      }
    });

    const monthlyCapRemaining = 10 - monthlyReferrals;

    res.status(200).json({
      success: true,
      data: {
        referralCode: customer.referralCode,
        monthlyReferrals,
        totalPointsEarned: customer.referralPointsEarned,
        monthlyCapRemaining
      }
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Get customer milestone progress.
 */
async function getMilestoneProgress(req, res, next) {
  let customerId = req.user.customerId;
  if (req.user.role === 'super_admin') {
    customerId = req.query.customerId || customerId;
  } else if (req.user.role === 'merchant') {
    const merchantId = req.user.merchantId;
    const queryCustomerId = req.query.customerId;
    if (!queryCustomerId) {
      const err = new Error('Customer ID is required.');
      err.status = 400;
      err.code = 'VALIDATION_ERROR';
      return next(err);
    }
    // Verify merchant-customer relationship exists (prevents IDOR)
    const hasTransaction = await prisma.transaction.findFirst({
      where: { customerId: queryCustomerId, merchantId }
    });
    if (!hasTransaction) {
      const err = new Error('Customer not found for this merchant.');
      err.status = 404;
      err.code = 'NOT_FOUND';
      return next(err);
    }
    customerId = queryCustomerId;
  }

  if (!customerId) {
    const err = new Error('Customer ID is required.');
    err.status = 400;
    err.code = 'VALIDATION_ERROR';
    return next(err);
  }

  try {
    const transactions = await prisma.transaction.findMany({
      where: {
        customerId,
        type: 'earn',
        status: 'completed'
      },
      select: {
        purchaseAmount: true
      }
    });

    const totalSpend = transactions.reduce((acc, curr) => acc + parseFloat(curr.purchaseAmount || 0), 0);

    const milestones = await prisma.milestoneBonus.findMany({
      where: { isActive: true },
      orderBy: { spendTarget: 'asc' }
    });

    const data = milestones.map(m => {
      const spendTarget = parseFloat(m.spendTarget);
      const isUnlocked = totalSpend >= spendTarget;
      const amountRemaining = isUnlocked ? 0 : spendTarget - totalSpend;
      const progressPercent = Math.min((totalSpend / spendTarget) * 100, 100);

      return {
        id: m.id,
        spendTarget,
        bonusPoints: m.bonusPoints,
        isUnlocked,
        amountRemaining,
        progressPercent
      };
    });

    res.status(200).json({
      success: true,
      data,
      totalSpend
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Change customer password.
 */
async function changePassword(req, res, next) {
  const userId = req.user.id;
  const { oldPassword, newPassword } = req.body;

  try {
    const user = await prisma.user.findUnique({
      where: { id: userId }
    });

    if (!user) {
      const err = new Error('User not found.');
      err.status = 404;
      err.code = 'NOT_FOUND';
      return next(err);
    }

    const isMatch = await bcrypt.compare(oldPassword, user.password);
    if (!isMatch) {
      const err = new Error('Current password is incorrect.');
      err.status = 400;
      err.code = 'INVALID_PASSWORD';
      return next(err);
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await prisma.user.update({
      where: { id: userId },
      data: { password: hashedPassword }
    });

    // Revoke all refresh tokens for this user (force re-login on all devices)
    await prisma.refreshToken.deleteMany({
      where: { userId }
    });

    res.status(200).json({
      success: true,
      message: 'Password changed successfully.'
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Get points expiring within the next N days.
 */
async function getExpiringPointsEndpoint(req, res, next) {
  const customerId = req.user.customerId;
  const daysAhead = parseInt(req.query.days) || 30;

  try {
    const result = await getExpiringPoints(customerId, daysAhead);
    res.status(200).json({
      success: true,
      message: 'Expiring points retrieved successfully.',
      data: result
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  getProfile,
  getBalance,
  getLedger,
  getTransactions,
  getQRCodeDataURL,
  getMerchants,
  updateProfile,
  requestMobileOTP,
  updateMobile,
  updateEmail,
  getSSEToken,
  streamNotifications,
  submitComplaint,
  getReferralStats,
  getMilestoneProgress,
  changePassword,
  getExpiringPoints: getExpiringPointsEndpoint
};

const prisma = require('../lib/prisma');
const { getCustomerBalance, processEarn, processRedeem, processTransfer } = require('../services/pointsService');
const { createAuditLog } = require('../services/auditLogService');
const notificationService = require('../services/notificationService');
const { sendWhatsAppAlert, sendTelegramAlert } = require('../utils/whatsappNotify');

/**
 * Get merchant dashboard stats for the current day.
 */
async function getDashboard(req, res, next) {
  const merchantId = req.user.merchantId;

  try {
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    const endOfToday = new Date();
    endOfToday.setHours(23, 59, 59, 999);

    // Use SQL aggregation to avoid loading all daily transactions into memory
    const agg = await prisma.$queryRaw`
      SELECT
        COUNT(DISTINCT "customerId")::int AS "uniqueCustomers",
        COUNT(id)::int AS "todayTransactionsCount",
        COALESCE(SUM(CASE WHEN type IN ('earn','transfer') THEN points ELSE 0 END), 0)::int AS "pointsIssued",
        COALESCE(SUM(CASE WHEN type = 'redeem' THEN points ELSE 0 END), 0)::int AS "pointsRedeemed"
      FROM "Transaction"
      WHERE "merchantId" = ${merchantId}
        AND "createdAt" >= ${startOfToday} AND "createdAt" <= ${endOfToday}
        AND status = 'completed'
    `;
    const row = agg[0] || {};
    const uniqueCustomers = row.uniqueCustomers || 0;
    const todayTransactionsCount = row.todayTransactionsCount || 0;
    const pointsIssued = row.pointsIssued || 0;
    const pointsRedeemed = row.pointsRedeemed || 0;

    // Get merchant wallet balance
    const merchant = await prisma.merchant.findUnique({
      where: { id: merchantId },
      select: { pointsBalance: true, merchantCode: true }
    });
    const pointsBalance = merchant?.pointsBalance || 0;
    const merchantCode = merchant?.merchantCode || null;

    // Get last 10 transactions
    const recentTransactions = await prisma.transaction.findMany({
      where: { merchantId },
      include: {
        customer: {
          select: {
            id: true,
            name: true,
            email: false,
            qrCode: true,
            user: {
              select: {
                id: true,
                mobile: true
              }
            }
          }
        }
      },
      orderBy: { createdAt: 'desc' },
      take: 10
    });

    res.status(200).json({
      success: true,
      message: 'Dashboard statistics retrieved.',
      data: {
        stats: {
          todayCustomers: uniqueCustomers,
          todayTransactions: todayTransactionsCount,
          pointsIssuedToday: pointsIssued,
          pointsRedeemedToday: pointsRedeemed,
          pointsBalance,
          merchantCode
        },
        recentTransactions
      }
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Helper to find active customer by ID or mobile.
 */
async function findActiveCustomer(identifier) {
  const customer = await prisma.customer.findFirst({
    where: {
      OR: [
        { id: identifier },
        { user: { mobile: identifier } }
      ]
    },
    include: {
      user: {
        select: {
          id: true,
          mobile: true,
          role: true,
          isActive: true,
          createdAt: true
        }
      }
    }
  });

  if (!customer) {
    const err = new Error('Customer not found.');
    err.status = 404;
    err.code = 'NOT_FOUND';
    throw err;
  }

  if (!customer.isActive || !customer.user.isActive) {
    const err = new Error('Customer account is deactivated.');
    err.status = 400;
    err.code = 'INACTIVE_CUSTOMER';
    throw err;
  }

  return customer;
}

/**
 * Issue points to a customer based on purchase amount.
 */
async function earn(req, res, next) {
  const { customerId, mobile, purchaseAmount } = req.body;
  const merchantId = req.user.merchantId;
  const ipAddress = req.ip;

  try {
    const identifier = customerId || mobile;
    if (!identifier) {
      const err = new Error('Customer identifier (customerId or mobile) is required.');
      err.status = 400;
      err.code = 'VALIDATION_ERROR';
      return next(err);
    }

    const customer = await findActiveCustomer(identifier);

    // Call service to run transaction
    const transaction = await processEarn(customer.id, merchantId, purchaseAmount);
    
    // Log audit log
    await createAuditLog(
      req.user.id,
      'POINTS_EARNED',
      'Transaction',
      transaction.id,
      { customerId: customer.id, points: transaction.points, purchaseAmount },
      ipAddress
    );

    const newBalance = await getCustomerBalance(customer.id);

    res.status(200).json({
      success: true,
      message: `Successfully issued ${transaction.points} points.`,
      data: {
        transaction,
        customer: {
          id: customer.id,
          name: customer.name,
          mobile: customer.user.mobile,
          newBalance
        }
      }
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Redeem customer points for discount.
 */
async function redeem(req, res, next) {
  const { customerId, mobile, pointsToRedeem, purchaseAmount } = req.body;
  const merchantId = req.user.merchantId;
  const ipAddress = req.ip;

  try {
    const identifier = customerId || mobile;
    if (!identifier) {
      const err = new Error('Customer identifier (customerId or mobile) is required.');
      err.status = 400;
      err.code = 'VALIDATION_ERROR';
      return next(err);
    }

    const customer = await findActiveCustomer(identifier);

    // Check balance before proceeding
    const currentBalance = await getCustomerBalance(customer.id);
    if (currentBalance < pointsToRedeem) {
      const err = new Error('Insufficient points balance.');
      err.status = 400;
      err.code = 'INSUFFICIENT_BALANCE';
      return next(err);
    }

    // Fetch reward settings once for cap calculation and service
    const settings = await prisma.rewardSettings.findFirst({ orderBy: { updatedAt: 'desc' } });
    const rupeesPerPoint = settings ? parseFloat(settings.rupeesPerPoint) : 0.10;

    // Apply 20% redemption cap: points can cover at most 20% of the invoice value
    let finalPoints = pointsToRedeem;
    let capped = false;
    const maxDiscountAllowed = parseFloat(purchaseAmount) * 0.20;
    const maxPointsAllowed = Math.floor(maxDiscountAllowed / rupeesPerPoint);
    if (finalPoints > maxPointsAllowed) {
      finalPoints = maxPointsAllowed;
      capped = true;
    }

    // Call transaction service
    const transaction = await processRedeem(customer.id, merchantId, finalPoints, purchaseAmount);

    // Log audit log
    await createAuditLog(
      req.user.id,
      'POINTS_REDEEMED',
      'Transaction',
      transaction.id,
      { customerId: customer.id, points: finalPoints, invoiceAmount: purchaseAmount || null, capped },
      ipAddress
    );

    const newBalance = await getCustomerBalance(customer.id);

    res.status(200).json({
      success: true,
      message: capped
        ? `Redemption capped to 20% of invoice. Redeemed ${finalPoints} points (from ${pointsToRedeem} requested).`
        : `Successfully redeemed ${finalPoints} points.`,
      data: {
        transaction,
        customer: {
          id: customer.id,
          name: customer.name,
          mobile: customer.user.mobile,
          newBalance
        },
        redemptionCap: {
          invoiceAmount: purchaseAmount ? parseFloat(purchaseAmount) : null,
          maxAllowedPoints: maxPointsAllowed,
          requestedPoints: parseInt(pointsToRedeem),
          redeemedPoints: finalPoints,
          capped
        }
      }
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Get merchant's own transactions (paginated).
 */
async function getTransactions(req, res, next) {
  const merchantId = req.user.merchantId;
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 20;
  const search = req.query.search || '';

  const skip = (page - 1) * limit;

  try {
    const whereCondition = {
      merchantId,
      ...(search ? {
        customer: {
          OR: [
            { name: { contains: search } },
            { user: { mobile: { contains: search } } }
          ]
        }
      } : {})
    };

    const [transactions, total] = await prisma.$transaction([
      prisma.transaction.findMany({
        where: whereCondition,
        include: {
          customer: {
            select: {
              id: true,
              name: true,
              email: false,
              qrCode: true,
              user: {
                select: {
                  id: true,
                  mobile: true
                }
              }
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
 * Look up a customer profile and balance by ID or mobile.
 */
async function lookupCustomer(req, res, next) {
  const { identifier } = req.params;

  try {
    const customer = await findActiveCustomer(identifier);
    const balance = await getCustomerBalance(customer.id);

    // Calculate customer lifetime stats using SQL aggregate instead of loading all entries
    const statsAgg = await prisma.$queryRaw`
      SELECT
        COALESCE(SUM(CASE WHEN "pointsChange" > 0 THEN "pointsChange" ELSE 0 END), 0)::int AS "totalEarned",
        COALESCE(SUM(CASE WHEN "pointsChange" < 0 THEN ABS("pointsChange") ELSE 0 END), 0)::int AS "totalRedeemed"
      FROM "PointsLedger"
      WHERE "customerId" = ${customer.id}
    `;
    const totalEarned = statsAgg[0]?.totalEarned || 0;
    const totalRedeemed = statsAgg[0]?.totalRedeemed || 0;

    // Get current reward settings
    const settings = await prisma.rewardSettings.findFirst({
      orderBy: { updatedAt: 'desc' }
    });

    res.status(200).json({
      success: true,
      message: 'Customer found.',
      data: {
        id: customer.id,
        name: customer.name,
        mobile: customer.user.mobile,
        isActive: customer.isActive,
        balance,
        lifetimeEarned: totalEarned,
        lifetimeRedeemed: totalRedeemed,
        rewardSettings: settings ? {
          pointsPerRupee: parseFloat(settings.pointsPerRupee),
          rupeesPerPoint: parseFloat(settings.rupeesPerPoint),
          minRedeemPoints: settings.minRedeemPoints
        } : {
          pointsPerRupee: 0.01,
          rupeesPerPoint: 0.10,
          minRedeemPoints: 100
        }
      }
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Scan customer QR code and return profile + balance.
 */
async function scanCustomerQR(req, res, next) {
  const { qrCode } = req.body;

  try {
    if (!qrCode) {
      const err = new Error('QR code string is required.');
      err.status = 400;
      err.code = 'VALIDATION_ERROR';
      return next(err);
    }

    const customer = await prisma.customer.findUnique({
      where: { qrCode },
      include: {
        user: {
          select: {
            id: true,
            mobile: true,
            role: true,
            isActive: true,
            createdAt: true
          }
        }
      }
    });

    if (!customer) {
      const err = new Error('Invalid QR code.');
      err.status = 404;
      err.code = 'NOT_FOUND';
      return next(err);
    }

    if (!customer.isActive || !customer.user.isActive) {
      const err = new Error('Customer account is deactivated.');
      err.status = 400;
      err.code = 'INACTIVE_CUSTOMER';
      return next(err);
    }

    const balance = await getCustomerBalance(customer.id);

    // Calculate customer lifetime stats using SQL aggregate
    const statsAgg = await prisma.$queryRaw`
      SELECT
        COALESCE(SUM(CASE WHEN "pointsChange" > 0 THEN "pointsChange" ELSE 0 END), 0)::int AS "totalEarned",
        COALESCE(SUM(CASE WHEN "pointsChange" < 0 THEN ABS("pointsChange") ELSE 0 END), 0)::int AS "totalRedeemed"
      FROM "PointsLedger"
      WHERE "customerId" = ${customer.id}
    `;
    const totalEarned = statsAgg[0]?.totalEarned || 0;
    const totalRedeemed = statsAgg[0]?.totalRedeemed || 0;

    // Get current reward settings
    const settings = await prisma.rewardSettings.findFirst({
      orderBy: { updatedAt: 'desc' }
    });

    res.status(200).json({
      success: true,
      message: 'QR code verified.',
      data: {
        id: customer.id,
        name: customer.name,
        mobile: customer.user.mobile,
        isActive: customer.isActive,
        balance,
        lifetimeEarned: totalEarned,
        lifetimeRedeemed: totalRedeemed,
        rewardSettings: settings ? {
          pointsPerRupee: parseFloat(settings.pointsPerRupee),
          rupeesPerPoint: parseFloat(settings.rupeesPerPoint),
          minRedeemPoints: settings.minRedeemPoints
        } : {
          pointsPerRupee: 0.01,
          rupeesPerPoint: 0.10,
          minRedeemPoints: 100
        }
      }
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Look up a customer profile by QR string (qrCode) for merchant scanning flow.
 */
async function getCustomerByQR(req, res, next) {
  const { qrString } = req.params;

  try {
    if (!qrString) {
      const err = new Error('QR code string is required.');
      err.status = 400;
      err.code = 'VALIDATION_ERROR';
      return next(err);
    }

    const customer = await prisma.customer.findUnique({
      where: { qrCode: qrString },
      include: {
        user: {
          select: {
            id: true,
            mobile: true,
            role: true,
            isActive: true,
            createdAt: true
          }
        }
      }
    });

    if (!customer) {
      const err = new Error('Customer not found for this QR code.');
      err.status = 404;
      err.code = 'NOT_FOUND';
      return next(err);
    }

    if (!customer.isActive || !customer.user.isActive) {
      const err = new Error('Customer account is deactivated.');
      err.status = 400;
      err.code = 'INACTIVE_CUSTOMER';
      return next(err);
    }

    res.status(200).json({
      success: true,
      message: 'Customer found.',
      data: {
        id: customer.id,
        name: customer.name
      }
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Transfer points from merchant wallet to customer wallet.
 */
async function transferPoints(req, res, next) {
  const { customerId, points } = req.body;
  const merchantId = req.user.merchantId;
  const ipAddress = req.ip;

  try {
    const pointsInt = parseInt(points);
    if (isNaN(pointsInt) || pointsInt <= 0) {
      const err = new Error('Points to transfer must be a positive integer.');
      err.status = 400;
      err.code = 'VALIDATION_ERROR';
      return next(err);
    }

    const result = await processTransfer(customerId, merchantId, pointsInt);

    const merchant = await prisma.merchant.findUnique({
      where: { id: merchantId },
      select: { businessName: true }
    });

    // Send SSE real-time notification to the customer
    notificationService.sendNotification(customerId, {
      type: 'POINTS_RECEIVED',
      points: pointsInt,
      merchantName: merchant?.businessName || 'Merchant',
      newBalance: result.newCustomerBalance
    });

    // Create Audit Log
    await createAuditLog(
      req.user.id,
      'POINTS_TRANSFERRED',
      'Transaction',
      result.transaction.id,
      { customerId, points: pointsInt, merchantId },
      ipAddress
    );

    res.status(200).json({
      success: true,
      message: `Successfully transferred ${pointsInt} points.`,
      data: {
        transaction: result.transaction,
        newMerchantBalance: result.newMerchantBalance,
        newCustomerBalance: result.newCustomerBalance
      }
    });
  } catch (error) {
    if (error.code === 'INSUFFICIENT_MERCHANT_BALANCE') {
      error.status = 400;
    }
    next(error);
  }
}

/**
 * Submit a complaint/feedback from merchant.
 */
async function submitComplaint(req, res, next) {
  const merchantId = req.user.merchantId;
  const userId = req.user.id;
  const { type, description } = req.body;

  if (!type || !description) {
    const err = new Error('Complaint type and description are required.');
    err.status = 400;
    err.code = 'BAD_REQUEST';
    return next(err);
  }

  try {
    const merchant = await prisma.merchant.findUnique({
      where: { id: merchantId }
    });

    if (!merchant) {
      const err = new Error('Merchant profile not found.');
      err.status = 404;
      err.code = 'NOT_FOUND';
      return next(err);
    }

    const complaint = await prisma.complaint.create({
      data: {
        userId,
        userRole: 'merchant',
        userName: merchant.businessName || 'Unknown Merchant',
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
 * Create a new Advertisement (pending status).
 */
async function createAd(req, res, next) {
  const merchantId = req.user.merchantId;
  const { title, description, imageUrl, ctaText, ctaLink, package: adPackage, showDirections, bg, accent, icon } = req.body;

  if (!title || !adPackage) {
    const err = new Error('Title and package are required.');
    err.status = 400;
    err.code = 'VALIDATION_ERROR';
    return next(err);
  }

  try {
    const advertisement = await prisma.advertisement.create({
      data: {
        merchantId,
        title,
        description,
        imageUrl,
        ctaText: ctaText || 'Learn More',
        ctaLink,
        package: adPackage,
        showDirections: showDirections !== false,
        bg,
        accent,
        icon,
        status: 'pending'
      }
    });

    res.status(201).json({
      success: true,
      message: 'Advertisement submitted and pending approval.',
      data: advertisement
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Get all advertisements created by the logged-in merchant.
 */
async function getMyAds(req, res, next) {
  const merchantId = req.user.merchantId;

  try {
    const advertisements = await prisma.advertisement.findMany({
      where: { merchantId },
      include: { payments: true },
      orderBy: { createdAt: 'desc' }
    });

    res.status(200).json({
      success: true,
      message: 'Advertisements retrieved successfully.',
      data: advertisements
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Increment the impressions count for an advertisement by 1.
 */
async function trackImpression(req, res, next) {
  const { id } = req.params;

  try {
    const ad = await prisma.advertisement.findUnique({ where: { id } });
    if (!ad) {
      const err = new Error('Advertisement not found.');
      err.status = 404;
      err.code = 'NOT_FOUND';
      return next(err);
    }

    const updated = await prisma.advertisement.update({
      where: { id },
      data: {
        impressions: { increment: 1 }
      }
    });

    res.status(200).json({
      success: true,
      message: 'Impression tracked successfully.',
      data: { impressions: updated.impressions }
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Increment the clicks count for an advertisement by 1.
 */
async function trackClick(req, res, next) {
  const { id } = req.params;

  try {
    const ad = await prisma.advertisement.findUnique({ where: { id } });
    if (!ad) {
      const err = new Error('Advertisement not found.');
      err.status = 404;
      err.code = 'NOT_FOUND';
      return next(err);
    }

    const updated = await prisma.advertisement.update({
      where: { id },
      data: {
        clicks: { increment: 1 }
      }
    });

    res.status(200).json({
      success: true,
      message: 'Click tracked successfully.',
      data: { clicks: updated.clicks }
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Fetch all approved and active advertisements.
 */
async function getActiveAds(req, res, next) {
  const now = new Date();

  try {
    const activeAds = await prisma.advertisement.findMany({
      where: {
        status: 'live',
        AND: [
          {
            OR: [
              { startDate: null },
              { startDate: { lte: now } }
            ]
          },
          {
            OR: [
              { endDate: null },
              { endDate: { gte: now } }
            ]
          }
        ]
      },
      include: {
        merchant: {
          select: {
            businessName: true,
            address: true,
            city: true,
            landmark: true,
            latitude: true,
            longitude: true,
            googleMapsUrl: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    res.status(200).json({
      success: true,
      message: 'Active advertisements retrieved successfully.',
      data: activeAds
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Update an advertisement (only pending or rejected status).
 */
async function updateAd(req, res, next) {
  const { id } = req.params;
  const merchantId = req.user.merchantId;
  const { title, description, imageUrl, ctaText, ctaLink, package: adPackage, showDirections, bg, accent, icon } = req.body;

  try {
    const ad = await prisma.advertisement.findUnique({ where: { id } });
    if (!ad) {
      const err = new Error('Advertisement not found.');
      err.status = 404;
      err.code = 'NOT_FOUND';
      return next(err);
    }

    if (ad.merchantId !== merchantId) {
      const err = new Error('Unauthorized to update this advertisement.');
      err.status = 403;
      err.code = 'FORBIDDEN';
      return next(err);
    }

    if (ad.status !== 'pending' && ad.status !== 'rejected') {
      const err = new Error('Only pending or rejected advertisements can be updated.');
      err.status = 400;
      err.code = 'BAD_REQUEST';
      return next(err);
    }

    const updated = await prisma.advertisement.update({
      where: { id },
      data: {
        title: title || ad.title,
        description: description !== undefined ? description : ad.description,
        imageUrl: imageUrl !== undefined ? imageUrl : ad.imageUrl,
        ctaText: ctaText !== undefined ? ctaText : ad.ctaText,
        ctaLink: ctaLink !== undefined ? ctaLink : ad.ctaLink,
        package: adPackage || ad.package,
        showDirections: showDirections !== undefined ? showDirections : ad.showDirections,
        bg: bg !== undefined ? bg : ad.bg,
        accent: accent !== undefined ? accent : ad.accent,
        icon: icon !== undefined ? icon : ad.icon,
        status: 'pending'
      }
    });

    res.status(200).json({
      success: true,
      message: 'Advertisement updated and pending approval.',
      data: updated
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Delete an advertisement (only pending or rejected status).
 */
async function deleteAd(req, res, next) {
  const { id } = req.params;
  const merchantId = req.user.merchantId;

  try {
    const ad = await prisma.advertisement.findUnique({ where: { id } });
    if (!ad) {
      const err = new Error('Advertisement not found.');
      err.status = 404;
      err.code = 'NOT_FOUND';
      return next(err);
    }

    if (ad.merchantId !== merchantId) {
      const err = new Error('Unauthorized to delete this advertisement.');
      err.status = 403;
      err.code = 'FORBIDDEN';
      return next(err);
    }

    if (ad.status !== 'pending' && ad.status !== 'rejected') {
      const err = new Error('Only pending or rejected advertisements can be deleted.');
      err.status = 400;
      err.code = 'BAD_REQUEST';
      return next(err);
    }

    await prisma.advertisement.delete({
      where: { id }
    });

    res.status(200).json({
      success: true,
      message: 'Advertisement deleted successfully.'
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Get customer insights for the merchant.
 */
async function getCustomerInsights(req, res, next) {
  try {
    const merchantId = req.user.merchantId;

    const totalCustomers = await prisma.customer.count({
      where: {
        transactions: {
          some: { merchantId }
        }
      }
    });

    const repeatCustomers = await prisma.customer.count({
      where: {
        transactions: {
          some: {
            merchantId,
            type: 'earn'
          }
        },
        AND: [
          {
            transactions: {
              some: {
                merchantId,
                type: 'earn'
              }
            }
          }
        ]
      },
      _count: undefined
    });

    const topCustomers = await prisma.customer.findMany({
      where: {
        transactions: {
          some: { merchantId }
        }
      },
      select: {
        id: true,
        name: true,
        email: true,
        qrCode: true,
        referralPointsEarned: true,
        signedUpViaMerchantId: true
      },
      orderBy: {
        referralPointsEarned: 'desc'
      },
      take: 10
    });

    res.status(200).json({
      success: true,
      message: 'Customer insights retrieved.',
      data: {
        totalCustomers,
        signedUpByMe: totalCustomers,
        repeatCustomers,
        fromNetwork: repeatCustomers,
        topCustomers
      }
    });
  } catch (error) {
    next(error);
  }
}

const multer = require('multer');
const path = require('path');
const fs = require('fs');

const uploadDir = path.resolve(__dirname, '../../uploads/payment-screenshots');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    const name = `payment-${Date.now()}-${Math.round(Math.random() * 1E9)}${ext}`;
    cb(null, name);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = /jpeg|jpg|png|webp/;
    const ext = allowed.test(path.extname(file.originalname).toLowerCase());
    const mime = allowed.test(file.mimetype);
    if (ext && mime) {
      return cb(null, true);
    }
    cb(new Error('Only image files are allowed.'));
  }
});

async function uploadPaymentScreenshot(req, res, next) {
  try {
    const merchantId = req.user.merchantId;
    const merchant = await prisma.merchant.findUnique({ where: { id: merchantId } });

    if (!merchant) {
      const err = new Error('Merchant account not found.');
      err.status = 404;
      err.code = 'NOT_FOUND';
      return next(err);
    }

    if (merchant.status !== 'approved') {
      const err = new Error('Screenshot upload is only allowed after admin approval.');
      err.status = 400;
      err.code = 'INVALID_STATUS';
      return next(err);
    }

    if (!req.file) {
      const err = new Error('Payment screenshot is required.');
      err.status = 400;
      err.code = 'VALIDATION_ERROR';
      return next(err);
    }

    const updated = await prisma.merchant.update({
      where: { id: merchantId },
      data: {
        paymentScreenshot: `/uploads/payment-screenshots/${req.file.filename}`,
        status: 'payment_pending'
      }
    });

    await sendWhatsAppAlert(
      `Payment Screenshot Received%0A` +
      `Business: ${merchant.businessName}%0A` +
      `Merchant Code: ${merchant.merchantCode}%0A` +
      `Amount: Rs. 399%0A` +
      `Action needed: Verify screenshot and confirm payment`
    );

    await sendTelegramAlert(
      `Payment Screenshot Received%0A` +
      `Business: ${merchant.businessName}%0A` +
      `Merchant Code: ${merchant.merchantCode}%0A` +
      `Amount: Rs. 399%0A` +
      `Action needed: Verify screenshot and confirm payment`
    );

    res.status(200).json({
      success: true,
      message: 'Screenshot uploaded successfully.',
      data: {
        status: updated.status
      }
    });
  } catch (error) {
    next(error);
  }
}

async function uploadRenewalScreenshot(req, res, next) {
  try {
    const merchantId = req.user.merchantId;
    const { subscriptionId } = req.body;

    if (!subscriptionId) {
      const err = new Error('Subscription ID is required for renewal upload.');
      err.status = 400;
      err.code = 'VALIDATION_ERROR';
      return next(err);
    }

    const merchant = await prisma.merchant.findUnique({ where: { id: merchantId } });

    if (!merchant) {
      const err = new Error('Merchant account not found.');
      err.status = 404;
      err.code = 'NOT_FOUND';
      return next(err);
    }

    if (merchant.status !== 'active') {
      const err = new Error('Renewal screenshot upload is only allowed for active merchants.');
      err.status = 400;
      err.code = 'INVALID_STATUS';
      return next(err);
    }

    const subscription = await prisma.merchantSubscription.findUnique({
      where: { id: subscriptionId }
    });

    if (!subscription || subscription.merchantId !== merchantId) {
      const err = new Error('Subscription not found or does not belong to this merchant.');
      err.status = 404;
      err.code = 'NOT_FOUND';
      return next(err);
    }

    if (!req.file) {
      const err = new Error('Payment screenshot is required.');
      err.status = 400;
      err.code = 'VALIDATION_ERROR';
      return next(err);
    }

    const updated = await prisma.merchant.update({
      where: { id: merchantId },
      data: {
        paymentScreenshot: `/uploads/payment-screenshots/${req.file.filename}`,
        status: 'payment_pending',
        pendingRenewalSubscriptionId: subscriptionId
      }
    });

    await sendWhatsAppAlert(
      `Renewal Screenshot Received%0A` +
      `Business: ${merchant.businessName}%0A` +
      `Merchant Code: ${merchant.merchantCode}%0A` +
      `Subscription ID: ${subscriptionId}%0A` +
      `Action needed: Verify renewal screenshot and confirm payment`
    );

    await sendTelegramAlert(
      `Renewal Screenshot Received%0A` +
      `Business: ${merchant.businessName}%0A` +
      `Merchant Code: ${merchant.merchantCode}%0A` +
      `Subscription ID: ${subscriptionId}%0A` +
      `Action needed: Verify renewal screenshot and confirm payment`
    );

    res.status(200).json({
      success: true,
      message: 'Renewal screenshot uploaded successfully.',
      data: {
        status: updated.status,
        pendingRenewalSubscriptionId: updated.pendingRenewalSubscriptionId
      }
    });
  } catch (error) {
    next(error);
  }
}

async function updateMerchantProfile(req, res, next) {
  try {
    const merchantId = req.user.merchantId;
    const {
      businessName, ownerName, email, address, city,
      landmark, googleMapsUrl, openingTime, closingTime,
      workingDays, category, alternativePhone
    } = req.body;

    const merchant = await prisma.merchant.findUnique({
      where: { id: merchantId }
    });

    if (!merchant) {
      const err = new Error('Merchant not found.');
      err.status = 404; err.code = 'NOT_FOUND';
      return next(err);
    }

    const updated = await prisma.merchant.update({
      where: { id: merchantId },
      data: {
        ...(businessName && { businessName }),
        ...(ownerName && { ownerName }),
        ...(email !== undefined && { email }),
        ...(address !== undefined && { address }),
        ...(city !== undefined && { city }),
        ...(landmark !== undefined && { landmark }),
        ...(googleMapsUrl !== undefined && { googleMapsUrl }),
        ...(openingTime !== undefined && { openingTime }),
        ...(closingTime !== undefined && { closingTime }),
        ...(workingDays !== undefined && { workingDays }),
        ...(category && { category }),
        ...(alternativePhone !== undefined && { alternativePhone }),
      }
    });

    if (email && email !== merchant.email) {
      await prisma.user.update({
        where: { id: req.user.id },
        data: { email }
      });
    }

    res.status(200).json({
      success: true,
      message: 'Profile updated successfully.',
      data: updated
    });
  } catch (error) {
    next(error);
  }
}

async function updateMerchantPassword(req, res, next) {
  try {
    const { oldPassword, newPassword } = req.body;

    if (!oldPassword || !newPassword) {
      const err = new Error('Old and new password are required.');
      err.status = 400; err.code = 'VALIDATION_ERROR';
      return next(err);
    }

    if (newPassword.length < 8) {
      const err = new Error('New password must be at least 8 characters.');
      err.status = 400; err.code = 'VALIDATION_ERROR';
      return next(err);
    }

    const user = await prisma.user.findUnique({
      where: { id: req.user.id }
    });

    const bcrypt = require('bcryptjs');
    const isMatch = await bcrypt.compare(oldPassword, user.password);
    if (!isMatch) {
      const err = new Error('Current password is incorrect.');
      err.status = 400; err.code = 'INVALID_PASSWORD';
      return next(err);
    }

    const hashed = await bcrypt.hash(newPassword, 10);
    await prisma.user.update({
      where: { id: req.user.id },
      data: { password: hashed }
    });

    res.status(200).json({
      success: true,
      message: 'Password updated successfully.'
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Get points health report for the merchant: all-time issued, redeemed, redemption rate, and outstanding liability.
 */
async function getPointsHealth(req, res, next) {
  try {
    const merchantId = req.user.merchantId;
    console.log('[points-health] merchantId:', merchantId, '| type:', typeof merchantId);

    // Query 1: Total lifetime points issued and redeemed (Transaction table, simple & fast)
    const totals = await prisma.$queryRaw`
      SELECT
        COALESCE(SUM(CASE WHEN type IN ('earn','transfer') THEN points ELSE 0 END), 0)::int AS "pointsIssued",
        COALESCE(SUM(CASE WHEN type = 'redeem' THEN points ELSE 0 END), 0)::int AS "pointsRedeemed"
      FROM "Transaction"
      WHERE "merchantId" = ${merchantId}
        AND status = 'completed'
        AND "reversedById" IS NULL
    `;
    console.log('[points-health] totals raw:', JSON.stringify(totals));
    const pointsIssued = totals[0]?.pointsIssued || 0;
    const pointsRedeemed = totals[0]?.pointsRedeemed || 0;

    // Query 2: Non-expired points only (PointsLedger JOIN Transaction) for liability
    const active = await prisma.$queryRaw`
      SELECT
        COALESCE(SUM(CASE WHEN pl."pointsChange" > 0 THEN pl."pointsChange" ELSE 0 END), 0)::int AS "pointsIssuedActive",
        COALESCE(SUM(CASE WHEN pl."pointsChange" < 0 THEN ABS(pl."pointsChange") ELSE 0 END), 0)::int AS "pointsRedeemedActive"
      FROM "PointsLedger" pl
      JOIN "Transaction" t ON t.id = pl."transactionId"
      WHERE t."merchantId" = ${merchantId}
        AND t.status = 'completed'
        AND t."reversedById" IS NULL
        AND (pl."expiresAt" IS NULL OR pl."expiresAt" > NOW())
    `;
    console.log('[points-health] active raw:', JSON.stringify(active));
    const pointsIssuedActive = active[0]?.pointsIssuedActive || 0;
    const pointsRedeemedActive = active[0]?.pointsRedeemedActive || 0;

    // Compute redemption rate (guard divide-by-zero)
    const redemptionRate = pointsIssued > 0
      ? parseFloat(((pointsRedeemed / pointsIssued) * 100).toFixed(1))
      : 0;

    // Points liability = outstanding non-expired points
    const pointsLiability = pointsIssuedActive - pointsRedeemedActive;

    res.status(200).json({
      success: true,
      message: 'Points health report retrieved.',
      data: {
        pointsIssued,
        pointsRedeemed,
        redemptionRate,
        pointsLiability
      }
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Get repeat customer report for the merchant (last 30 days).
 */
async function getRepeatCustomers(req, res, next) {
  try {
    const merchantId = req.user.merchantId;
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    // Get per-customer visit counts in the window
    const customerVisits = await prisma.$queryRaw`
      SELECT
        "customerId",
        COUNT(*)::int AS "visitCount",
        MAX("createdAt") AS "lastVisit"
      FROM "Transaction"
      WHERE "merchantId" = ${merchantId}
        AND status = 'completed'
        AND type = 'earn'
        AND "createdAt" >= ${thirtyDaysAgo}
      GROUP BY "customerId"
    `;

    const totalCustomers = customerVisits.length;
    const repeatCustomers = customerVisits.filter(c => c.visitCount >= 2);
    const oneTimeCustomers = customerVisits.filter(c => c.visitCount === 1);

    const repeatRate = totalCustomers > 0
      ? parseFloat(((repeatCustomers.length / totalCustomers) * 100).toFixed(1))
      : 0;

    // Get top 10 repeat customers with names
    let topRepeatCustomers = [];
    if (repeatCustomers.length > 0) {
      const sorted = [...repeatCustomers].sort((a, b) => b.visitCount - a.visitCount).slice(0, 10);
      const customerIds = sorted.map(c => c.customerId);

      const names = await prisma.customer.findMany({
        where: { id: { in: customerIds } },
        select: { id: true, name: true }
      });
      const nameMap = new Map(names.map(n => [n.id, n.name]));

      topRepeatCustomers = sorted.map(c => ({
        name: nameMap.get(c.customerId) || 'Unknown',
        visitCount: c.visitCount,
        lastVisit: c.lastVisit
      }));
    }

    res.status(200).json({
      success: true,
      message: 'Repeat customer report retrieved.',
      data: {
        summary: {
          totalCustomers,
          repeatCustomers: repeatCustomers.length,
          oneTimeCustomers: oneTimeCustomers.length,
          repeatRate
        },
        topRepeatCustomers
      }
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  getDashboard,
  earn,
  redeem,
  getTransactions,
  lookupCustomer,
  scanCustomerQR,
  getCustomerByQR,
  transferPoints,
  submitComplaint,
  createAd,
  getMyAds,
  trackImpression,
  trackClick,
  getActiveAds,
  updateAd,
  deleteAd,
  getCustomerInsights,
  getPointsHealth,
  getRepeatCustomers,
  uploadPaymentScreenshot,
  uploadRenewalScreenshot,
  upload,
  updateMerchantProfile,
  updateMerchantPassword
};

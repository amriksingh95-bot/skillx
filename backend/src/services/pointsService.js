const prisma = require('../lib/prisma');
const { checkMerchantSubscriptionStatus } = require('./subscriptionService');


/**
 * Acquires a transaction-scoped advisory lock for a customer.
 * Serializes all balance-affecting operations for the same customer.
 * Lock is automatically released when the transaction commits or rolls back.
 * @param {object} txClient - Prisma transaction client
 * @param {string} customerId
 */
async function acquireCustomerLock(txClient, customerId) {
  await txClient.$executeRawUnsafe(
    'SELECT pg_advisory_xact_lock(hashtext($1))',
    `customer:${customerId}`
  );
}

/**
 * Calculates a customer's current active points balance by summing ledger changes,
 * excluding expired entries. Legacy entries (expiresAt IS NULL) are always included.
 * Can run within a transaction if a client is provided.
 * @param {string} customerId
 * @param {object} [txClient] - Prisma client or transaction client
 * @returns {Promise<number>}
 */
async function getCustomerBalance(customerId, txClient = prisma) {
  const now = new Date();
  const result = await txClient.pointsLedger.aggregate({
    where: {
      customerId,
      OR: [
        { expiresAt: null },
        { expiresAt: { gt: now } }
      ]
    },
    _sum: {
      pointsChange: true
    }
  });
  return result._sum.pointsChange || 0;
}

/**
 * Validates and updates a customer's points ledger in a transaction.
 * @param {string} customerId
 * @param {number} pointsChange
 * @param {string} transactionId
 * @param {object} txClient - Prisma transaction client
 * @param {Date|null} [expiresAt] - Optional expiry date for this ledger entry
 * @returns {Promise<number>} new balance
 */
async function addLedgerEntry(customerId, pointsChange, transactionId, txClient, expiresAt = null) {
  const currentBalance = await getCustomerBalance(customerId, txClient);
  const newBalance = currentBalance + pointsChange;

  if (newBalance < 0) {
    const error = new Error('Insufficient points balance.');
    error.code = 'INSUFFICIENT_BALANCE';
    throw error;
  }

  await txClient.pointsLedger.create({
    data: {
      customerId,
      transactionId,
      pointsChange,
      balanceAfter: newBalance,
      expiresAt: expiresAt || null
    }
  });

  return newBalance;
}

/**
 * Calculates the expiry date for new points based on current reward settings.
 * @param {object} settings - RewardSettings record
 * @returns {Date}
 */
function calculateExpiryDate(settings) {
  const days = settings.pointsExpiryDays || 365;
  const expiry = new Date();
  expiry.setDate(expiry.getDate() + days);
  return expiry;
}

/**
 * Processes an earn transaction.
 * @param {string} customerId
 * @param {string} merchantId
 * @param {number} purchaseAmount
 * @param {string} [remarks]
 */
async function processEarn(customerId, merchantId, purchaseAmount, remarks = null) {
  return prisma.$transaction(async (tx) => {
    // Serialize all balance operations for this customer
    await acquireCustomerLock(tx, customerId);

    // Check if customer and merchant are active
    const customer = await tx.customer.findUnique({ where: { id: customerId } });
    if (!customer || !customer.isActive) {
      const err = new Error('Customer is inactive or not found.');
      err.code = 'INACTIVE_CUSTOMER';
      throw err;
    }

    const merchant = await tx.merchant.findUnique({ where: { id: merchantId } });
    if (!merchant || !merchant.isActive) {
      const err = new Error('Merchant is inactive or not found.');
      err.code = 'INACTIVE_MERCHANT';
      throw err;
    }

    // Get reward settings
    const settings = await tx.rewardSettings.findFirst({
      orderBy: { updatedAt: 'desc' }
    });
    if (!settings) {
      throw new Error('Reward settings not configured.');
    }

    // Points earned = Math.floor(purchaseAmount * pointsPerRupee)
    const amount = parseFloat(purchaseAmount);
    if (!amount || amount <= 0) {
      const err = new Error('Purchase amount must be a positive number.');
      err.status = 400;
      err.code = 'VALIDATION_ERROR';
      throw err;
    }
    const points = Math.floor(amount * parseFloat(settings.pointsPerRupee));

    if (merchant.pointsBalance < points) {
      const err = new Error('Insufficient points balance. Please top up.');
      err.status = 400;
      err.code = 'INSUFFICIENT_MERCHANT_BALANCE';
      throw err;
    }

    // Check merchant subscription status (warn but don't block during grace period)
    const subscriptionStatus = await checkMerchantSubscriptionStatus(merchantId);
    if (!subscriptionStatus.isActive) {
      const err = new Error('Merchant subscription expired. Please renew to continue issuing points.');
      err.code = 'SUBSCRIPTION_EXPIRED';
      err.status = 403;
      throw err;
    }
    
    // Calculate expiry date for earned points
    const expiresAt = calculateExpiryDate(settings);

    // Create transaction first
    const transaction = await tx.transaction.create({
      data: {
        customerId,
        merchantId,
        type: 'earn',
        purchaseAmount,
        points,
        remarks: remarks || `Earned points at ${merchant.businessName}`,
        status: 'completed'
      }
    });

    // Create ledger entry with expiry
    await addLedgerEntry(customerId, points, transaction.id, tx, expiresAt);

    // Deduct points from merchant balance
    await tx.merchant.update({
      where: { id: merchantId },
      data: { pointsBalance: { decrement: points } }
    });

    // Calculate new total lifetime spend including current transaction
    const transactions = await tx.transaction.findMany({
      where: {
        customerId,
        type: 'earn',
        status: 'completed'
      },
      select: {
        purchaseAmount: true
      }
    });

    const newTotalSpend = transactions.reduce((acc, curr) => acc + parseFloat(curr.purchaseAmount || 0), 0);
    const previousTotalSpend = newTotalSpend - (purchaseAmount ? parseFloat(purchaseAmount) : 0);

    // Fetch all active MilestoneBonus records
    const milestones = await tx.milestoneBonus.findMany({
      where: { isActive: true }
    });

    // Check each milestone
    for (const milestone of milestones) {
      const target = parseFloat(milestone.spendTarget);
      if (previousTotalSpend < target && newTotalSpend >= target) {
        // Create a bonus earn Transaction
        const bonusTx = await tx.transaction.create({
          data: {
            customerId,
            merchantId,
            type: 'earn',
            purchaseAmount: null,
            points: milestone.bonusPoints,
            remarks: `Milestone Bonus - Rs. ${target} spend achieved`,
            status: 'completed'
          }
        });

        // Create ledger entry with same expiry
        await addLedgerEntry(customerId, milestone.bonusPoints, bonusTx.id, tx, expiresAt);
      }
    }

    return transaction;
  });
}

/**
 * Processes a redeem transaction.
 * @param {string} customerId
 * @param {string} merchantId
 * @param {number} pointsToRedeem
 * @param {string} [remarks]
 */
async function processRedeem(customerId, merchantId, pointsToRedeem, invoiceAmount, remarks = null) {
  const { calculateRedemptionFee } = require('./subscriptionService');

  return prisma.$transaction(async (tx) => {
    // Serialize all balance operations for this customer
    await acquireCustomerLock(tx, customerId);

    const customer = await tx.customer.findUnique({ where: { id: customerId } });
    if (!customer || !customer.isActive) {
      const err = new Error('Customer is inactive or not found.');
      err.code = 'INACTIVE_CUSTOMER';
      throw err;
    }

    const merchant = await tx.merchant.findUnique({ where: { id: merchantId } });
    if (!merchant || !merchant.isActive) {
      const err = new Error('Merchant is inactive or not found.');
      err.code = 'INACTIVE_MERCHANT';
      throw err;
    }

    // Check merchant subscription status (block redemptions if expired)
    const subscriptionStatus = await checkMerchantSubscriptionStatus(merchantId);
    if (!subscriptionStatus.isActive) {
      const err = new Error('Merchant subscription expired. Please renew to continue processing redemptions.');
      err.code = 'SUBSCRIPTION_EXPIRED';
      err.status = 403;
      throw err;
    }

    // Get settings
    const settings = await tx.rewardSettings.findFirst({
      orderBy: { updatedAt: 'desc' }
    });
    if (!settings) {
      throw new Error('Reward settings not configured.');
    }

    if (pointsToRedeem < settings.minRedeemPoints) {
      const err = new Error(`Minimum redemption limit is ${settings.minRedeemPoints} points.`);
      err.code = 'VALIDATION_ERROR';
      throw err;
    }

    // Enforce 20% redemption cap at transaction level
    const rupeesPerPoint = parseFloat(settings.rupeesPerPoint);
    if (!invoiceAmount || isNaN(parseFloat(invoiceAmount)) || parseFloat(invoiceAmount) <= 0) {
      const err = new Error('Purchase amount is required for redemption.');
      err.code = 'VALIDATION_ERROR';
      throw err;
    }
    const maxDiscountAllowed = parseFloat(invoiceAmount) * 0.20;
    const maxPointsAllowed = Math.floor(maxDiscountAllowed / rupeesPerPoint);
    if (pointsToRedeem > maxPointsAllowed) {
      const err = new Error(`Redemption exceeds 20% cap. Maximum allowed: ${maxPointsAllowed} points for Rs. ${invoiceAmount} invoice.`);
      err.code = 'CAP_EXCEEDED';
      throw err;
    }

    // Calculate redemption fee
    const feeInfo = calculateRedemptionFee(pointsToRedeem, settings);

    // Create transaction with fee tracking
    const transaction = await tx.transaction.create({
      data: {
        customerId,
        merchantId,
        type: 'redeem',
        invoiceAmount: invoiceAmount ? parseFloat(invoiceAmount) : null,
        purchaseAmount: feeInfo.grossDiscount,
        points: pointsToRedeem,
        platformFee: feeInfo.platformFee,
        netAmount: feeInfo.netAmount,
        remarks: remarks || `Redeemed ${pointsToRedeem} points for Rs. ${feeInfo.netAmount} discount${invoiceAmount ? ` on Rs. ${invoiceAmount} invoice` : ''} (Rs. ${feeInfo.platformFee} platform fee)`,
        status: 'completed'
      }
    });

    // Create ledger entry (negative value for redeem, no expiry)
    await addLedgerEntry(customerId, -pointsToRedeem, transaction.id, tx, null);

    return {
      ...transaction,
      feeInfo
    };
  });
}

/**
 * Reverses a completed transaction.
 * @param {string} transactionId
 * @param {string} adminUserId
 */
async function processReversal(transactionId, adminUserId) {
  return prisma.$transaction(async (tx) => {
    // Fetch original transaction
    const origTx = await tx.transaction.findUnique({
      where: { id: transactionId },
      include: { customer: true, merchant: true }
    });

    if (!origTx) {
      const err = new Error('Transaction not found.');
      err.code = 'NOT_FOUND';
      throw err;
    }

    // Serialize all balance operations for this customer
    await acquireCustomerLock(tx, origTx.customerId);

    if (origTx.status === 'reversed') {
      const err = new Error('Transaction is already reversed.');
      err.code = 'VALIDATION_ERROR';
      throw err;
    }

    let pointsChange = 0;
    let reversalExpiresAt = null;

    if (origTx.type === 'earn') {
      // Reversing earn: deduct points from customer
      pointsChange = -origTx.points;
      // Look up the original ledger entry to copy its expiresAt
      const origLedger = await tx.pointsLedger.findFirst({
        where: { transactionId: origTx.id }
      });
      reversalExpiresAt = origLedger?.expiresAt || null;
    } else if (origTx.type === 'redeem') {
      // Reversing redeem: refund points as new points with fresh expiry
      pointsChange = origTx.points;
      const settings = await tx.rewardSettings.findFirst({ orderBy: { updatedAt: 'desc' } });
      reversalExpiresAt = settings ? calculateExpiryDate(settings) : new Date(Date.now() + 365 * 86400000);
    } else if (origTx.type === 'transfer') {
      // Reversing transfer: deduct points from customer, restore to merchant wallet
      pointsChange = -origTx.points;
      const origLedger = await tx.pointsLedger.findFirst({
        where: { transactionId: origTx.id }
      });
      reversalExpiresAt = origLedger?.expiresAt || null;

      // Restore merchant wallet balance
      await tx.$executeRawUnsafe(
        'UPDATE "Merchant" SET "pointsBalance" = "pointsBalance" + $1 WHERE "id" = $2',
        origTx.points, origTx.merchantId
      );
    } else {
      const err = new Error('Only earn, redeem, or transfer transactions can be reversed.');
      err.code = 'VALIDATION_ERROR';
      throw err;
    }

    // 1. Mark original transaction status as 'reversed'
    const updatedOrigTx = await tx.transaction.update({
      where: { id: transactionId },
      data: {
        status: 'reversed',
        reversedById: adminUserId,
        reversedAt: new Date()
      }
    });

    // 2. Create reversal transaction
    const reversalTx = await tx.transaction.create({
      data: {
        customerId: origTx.customerId,
        merchantId: origTx.merchantId,
        type: 'reversal',
        purchaseAmount: origTx.purchaseAmount,
        points: origTx.points,
        remarks: `Reversal of transaction ID: ${origTx.id}`,
        status: 'completed'
      }
    });

    // 3. Insert ledger record and validate balance doesn't go below 0
    await addLedgerEntry(origTx.customerId, pointsChange, reversalTx.id, tx, reversalExpiresAt);

    // 4. Reverse any milestone bonus transactions triggered by this earn
    if (origTx.type === 'earn' && origTx.purchaseAmount) {
      // Compute spend before this earn using createdAt ordering
      const priorEarnTxs = await tx.transaction.findMany({
        where: {
          customerId: origTx.customerId,
          type: 'earn',
          status: 'completed',
          createdAt: { lt: origTx.createdAt }
        },
        select: { purchaseAmount: true }
      });

      const spendBefore = priorEarnTxs.reduce((acc, curr) => acc + parseFloat(curr.purchaseAmount || 0), 0);
      const spendAfter = spendBefore + parseFloat(origTx.purchaseAmount);

      const milestones = await tx.milestoneBonus.findMany({
        where: { isActive: true }
      });

      for (const milestone of milestones) {
        const target = parseFloat(milestone.spendTarget);
        if (spendBefore < target && spendAfter >= target) {
          const bonusTx = await tx.transaction.findFirst({
            where: {
              customerId: origTx.customerId,
              type: 'earn',
              status: 'completed',
              purchaseAmount: null,
              remarks: { contains: `Milestone Bonus - Rs. ${target}` }
            },
            orderBy: { createdAt: 'asc' }
          });

          if (bonusTx) {
            await tx.transaction.update({
              where: { id: bonusTx.id },
              data: {
                status: 'reversed',
                reversedById: adminUserId,
                reversedAt: new Date()
              }
            });

            const origBonusLedger = await tx.pointsLedger.findFirst({
              where: { transactionId: bonusTx.id }
            });

            try {
              await addLedgerEntry(
                origTx.customerId,
                -bonusTx.points,
                bonusTx.id,
                tx,
                origBonusLedger?.expiresAt || null
              );
            } catch (err) {
              console.error(
                `Milestone bonus reversal skipped for customerId:${origTx.customerId} milestoneId:${bonusTx.id} — insufficient balance, manual review required`
              );
            }
          }
        }
      }
    }

    return {
      originalTransaction: updatedOrigTx,
      reversalTransaction: reversalTx
    };
  });
}

/**
 * Processes a points transfer from merchant's wallet to customer's wallet.
 */
async function processTransfer(customerId, merchantId, points, remarks = null) {
  return prisma.$transaction(async (tx) => {
    // Serialize all balance operations for this customer
    await acquireCustomerLock(tx, customerId);

    const customer = await tx.customer.findUnique({ where: { id: customerId } });
    if (!customer || !customer.isActive) {
      const err = new Error('Customer is inactive or not found.');
      err.code = 'INACTIVE_CUSTOMER';
      throw err;
    }

    const merchant = await tx.merchant.findUnique({ where: { id: merchantId } });
    if (!merchant || !merchant.isActive) {
      const err = new Error('Merchant is inactive or not found.');
      err.code = 'INACTIVE_MERCHANT';
      throw err;
    }

    // Check merchant subscription status (block transfers if expired)
    const subscriptionStatus = await checkMerchantSubscriptionStatus(merchantId);
    if (!subscriptionStatus.isActive) {
      const err = new Error('Merchant subscription expired. Please renew to continue transferring points.');
      err.code = 'SUBSCRIPTION_EXPIRED';
      err.status = 403;
      throw err;
    }

    if (merchant.pointsBalance < points) {
      const err = new Error('Insufficient merchant points balance.');
      err.code = 'INSUFFICIENT_MERCHANT_BALANCE';
      throw err;
    }

    // Atomically check-and-decrement merchant balance (prevents concurrent overspend)
    const updated = await tx.$executeRawUnsafe(
      'UPDATE "Merchant" SET "pointsBalance" = "pointsBalance" - $1 WHERE "id" = $2 AND "pointsBalance" >= $1',
      points, merchantId
    );
    if (updated === 0) {
      const err = new Error('Insufficient merchant points balance.');
      err.code = 'INSUFFICIENT_MERCHANT_BALANCE';
      throw err;
    }

    // Read the updated merchant for response
    const updatedMerchant = await tx.merchant.findUnique({ where: { id: merchantId } });

    // Get reward settings for expiry calculation
    const settings = await tx.rewardSettings.findFirst({ orderBy: { updatedAt: 'desc' } });
    const expiresAt = settings ? calculateExpiryDate(settings) : new Date(Date.now() + 365 * 86400000);

    // Create transaction record
    const transaction = await tx.transaction.create({
      data: {
        customerId,
        merchantId,
        type: 'transfer',
        purchaseAmount: null,
        points: points,
        remarks: remarks || `Points transfer from ${merchant.businessName}`,
        status: 'completed'
      }
    });

    // Create customer ledger record with expiry
    const newCustomerBalance = await addLedgerEntry(customerId, points, transaction.id, tx, expiresAt);

    return {
      transaction,
      newCustomerBalance,
      newMerchantBalance: updatedMerchant.pointsBalance
    };
  });
}

/**
 * Returns points that are expiring within the given number of days.
 * @param {string} customerId
 * @param {number} [daysAhead=30]
 * @returns {Promise<{totalExpiring: number, entries: Array<{points: number, expiresAt: Date, daysUntilExpiry: number}>}>}
 */
async function getExpiringPoints(customerId, daysAhead = 30) {
  const now = new Date();
  const cutoff = new Date(now);
  cutoff.setDate(cutoff.getDate() + daysAhead);

  const entries = await prisma.pointsLedger.findMany({
    where: {
      customerId,
      pointsChange: { gt: 0 },
      expiresAt: {
        not: null,
        gt: now,
        lte: cutoff
      }
    },
    orderBy: { expiresAt: 'asc' },
    select: {
      id: true,
      pointsChange: true,
      expiresAt: true,
      createdAt: true
    }
  });

  const totalExpiring = entries.reduce((sum, e) => sum + e.pointsChange, 0);

  return {
    totalExpiring,
    entries: entries.map(e => {
      const msUntilExpiry = e.expiresAt.getTime() - now.getTime();
      return {
        points: e.pointsChange,
        expiresAt: e.expiresAt,
        daysUntilExpiry: Math.ceil(msUntilExpiry / 86400000)
      };
    })
  };
}

/**
 * Returns a complete points summary for a customer including active balance,
 * lifetime stats, and expiry information.
 * @param {string} customerId
 * @returns {Promise<object>}
 */
async function getPointsSummary(customerId) {
  const now = new Date();

  // All 5 queries are independent reads — run in parallel
  const [activeBalance, lifetimeEarned, lifetimeRedeemed, expiringInfo, expiredPoints] = await Promise.all([
    // Active balance (non-expired entries)
    getCustomerBalance(customerId),

    // Lifetime earned (all positive entries, including expired)
    prisma.pointsLedger.aggregate({
      where: { customerId, pointsChange: { gt: 0 } },
      _sum: { pointsChange: true }
    }),

    // Lifetime redeemed (all negative entries)
    prisma.pointsLedger.aggregate({
      where: { customerId, pointsChange: { lt: 0 } },
      _sum: { pointsChange: true }
    }),

    // Points expiring within 30 days
    getExpiringPoints(customerId, 30),

    // Total expired points (entries where expiresAt is in the past and pointsChange > 0)
    prisma.pointsLedger.aggregate({
      where: {
        customerId,
        pointsChange: { gt: 0 },
        expiresAt: { not: null, lte: now }
      },
      _sum: { pointsChange: true }
    })
  ]);

  return {
    activeBalance,
    lifetimeEarned: lifetimeEarned._sum.pointsChange || 0,
    lifetimeRedeemed: Math.abs(lifetimeRedeemed._sum.pointsChange || 0),
    expiredPoints: expiredPoints._sum.pointsChange || 0,
    expiringWithin30Days: expiringInfo.totalExpiring,
    expiringEntries: expiringInfo.entries
  };
}

module.exports = {
  getCustomerBalance,
  processEarn,
  processRedeem,
  processReversal,
  processTransfer,
  getExpiringPoints,
  getPointsSummary,
  calculateExpiryDate
};

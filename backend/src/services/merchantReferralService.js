const prisma = require('../lib/prisma');

const MONTHLY_REFERRAL_CAP = 5;
const HOLD_DAYS = 15;
const INITIAL_REWARD_POINTS = 2000;
const RENEWAL_REWARD_POINTS = 500;
const MAX_RENEWAL_MONTHS = 3;

const REFERRAL_CATEGORIES = [
  'grocery', 'cafe', 'beauty', 'doctor', 'pharmacy',
  'fashion', 'stationery', 'gym', 'electronics', 'hotel', 'education'
];

function getMonthlyCapStatus(merchantId) {
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

  return prisma.merchantReferral.findMany({
    where: {
      referrerMerchantId: merchantId,
      createdAt: { gte: startOfMonth, lte: endOfMonth },
      instantRewardPaid: true
    }
  }).then(rewarded => ({
    rewardedCount: rewarded.length,
    cap: MONTHLY_REFERRAL_CAP,
    isCapped: rewarded.length >= MONTHLY_REFERRAL_CAP
  }));
}

function isCappedForMonth(merchantId, tx) {
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

  return tx.merchantReferral.count({
    where: {
      referrerMerchantId: merchantId,
      createdAt: { gte: startOfMonth, lte: endOfMonth },
      instantRewardPaid: true
    }
  }).then(count => count >= MONTHLY_REFERRAL_CAP);
}

async function processReferralOnFirstPayment(merchantId) {
  const merchant = await prisma.merchant.findUnique({
    where: { id: merchantId },
    select: { id: true, referredByMerchantId: true }
  });

  if (!merchant || !merchant.referredByMerchantId) {
    return { processed: false, reason: 'No referrer found' };
  }

  const referrerId = merchant.referredByMerchantId;
  if (referrerId === merchantId) {
    return { processed: false, reason: 'Self-referral not allowed' };
  }

  const existing = await prisma.merchantReferral.findFirst({
    where: { referredMerchantId: merchantId }
  });

  if (existing) {
    return { processed: false, reason: 'Referral record already exists' };
  }

  const holdUntil = new Date();
  holdUntil.setDate(holdUntil.getDate() + HOLD_DAYS);

  const referral = await prisma.merchantReferral.create({
    data: {
      referrerMerchantId: referrerId,
      referredMerchantId: merchantId,
      status: 'active',
      holdUntilDate: holdUntil,
      instantRewardPaid: false,
      monthsTrickled: 0
    }
  });

  return { processed: true, referral, referrerId };
}

async function releaseHeldRewards() {
  const now = new Date();

  const eligibleReferrals = await prisma.merchantReferral.findMany({
    where: {
      status: 'active',
      instantRewardPaid: false,
      holdUntilDate: { lte: now }
    }
  });

  const results = [];

  for (const referral of eligibleReferrals) {
    const capped = await isCappedForMonth(referral.referrerMerchantId, prisma);

    if (capped) {
      results.push({
        referralId: referral.id,
        credited: false,
        reason: 'Monthly cap reached'
      });
      continue;
    }

    await prisma.$transaction(async (tx) => {
      const stillCapped = await isCappedForMonth(referral.referrerMerchantId, tx);
      if (stillCapped) return;

      await tx.merchant.update({
        where: { id: referral.referrerMerchantId },
        data: { pointsBalance: { increment: INITIAL_REWARD_POINTS } }
      });

      await tx.merchantReferral.update({
        where: { id: referral.id },
        data: { instantRewardPaid: true, status: 'completed' }
      });

      const referredMerchant = await tx.merchant.findUnique({
        where: { id: referral.referredMerchantId },
        select: { businessName: true }
      });

      await tx.merchantNotification.create({
        data: {
          merchantId: referral.referrerMerchantId,
          message: `You earned ${INITIAL_REWARD_POINTS} points for referring ${referredMerchant?.businessName || 'a merchant'}!`,
          type: 'referral',
          isRead: false
        }
      });
    });

    results.push({
      referralId: referral.id,
      credited: true,
      points: INITIAL_REWARD_POINTS
    });
  }

  return { processed: results.length, results };
}

async function processReferralOnRenewal(merchantId) {
  const merchant = await prisma.merchant.findUnique({
    where: { id: merchantId },
    select: { id: true, businessName: true, referredByMerchantId: true }
  });

  if (!merchant || !merchant.referredByMerchantId) {
    return { processed: false, reason: 'No referrer found' };
  }

  const referral = await prisma.merchantReferral.findFirst({
    where: {
      referredMerchantId: merchantId,
      status: 'completed',
      instantRewardPaid: true
    },
    orderBy: { createdAt: 'desc' }
  });

  if (!referral) {
    return { processed: false, reason: 'No active completed referral record' };
  }

  if (referral.monthsTrickled >= MAX_RENEWAL_MONTHS) {
    return { processed: false, reason: 'Max renewal rewards reached (3)' };
  }

  const capped = await isCappedForMonth(referral.referrerMerchantId, prisma);
  if (capped) {
    return { processed: false, reason: 'Monthly cap reached' };
  }

  const referrerMerchant = await prisma.merchant.findUnique({
    where: { id: referral.referrerMerchantId },
    select: { id: true, businessName: true }
  });

  const renewalNumber = referral.monthsTrickled + 1;

  await prisma.$transaction(async (tx) => {
    const stillCapped = await isCappedForMonth(referral.referrerMerchantId, tx);
    if (stillCapped) return;

    await tx.merchant.update({
      where: { id: referral.referrerMerchantId },
      data: { pointsBalance: { increment: RENEWAL_REWARD_POINTS } }
    });

    await tx.merchantReferral.update({
      where: { id: referral.id },
      data: { monthsTrickled: renewalNumber }
    });

    await tx.merchantNotification.create({
      data: {
        merchantId: referral.referrerMerchantId,
        message: `Merchant ${merchant.businessName} completed their ${renewalNumber}${renewalNumber === 1 ? 'st' : renewalNumber === 2 ? 'nd' : 'rd'} renewal \u2014 you earned ${RENEWAL_REWARD_POINTS} points`,
        type: 'referral',
        isRead: false
      }
    });
  });

  return {
    processed: true,
    renewalNumber,
    pointsCredited: RENEWAL_REWARD_POINTS,
    referrerName: referrerMerchant?.businessName
  };
}

async function getLeaderboard() {
  const referralCounts = await prisma.merchantReferral.groupBy({
    by: ['referrerMerchantId'],
    _count: { id: true },
    orderBy: { _count: { id: 'desc' } }
  });

  const leaderboard = [];

  for (const entry of referralCounts) {
    const activeCount = await prisma.merchant.count({
      where: {
        referredByMerchantId: entry.referrerMerchantId,
        status: 'active',
        isActive: true
      }
    });

    if (activeCount === 0) continue;

    const merchant = await prisma.merchant.findUnique({
      where: { id: entry.referrerMerchantId },
      select: { id: true, businessName: true, category: true, city: true, merchantCode: true }
    });

    if (merchant) {
      leaderboard.push({
        ...merchant,
        activeReferralCount: activeCount
      });
    }
  }

  leaderboard.sort((a, b) => b.activeReferralCount - a.activeReferralCount);

  return leaderboard;
}

async function getNearbyBusinessesToInvite(merchantId) {
  const merchant = await prisma.merchant.findUnique({
    where: { id: merchantId },
    select: { id: true, category: true }
  });

  if (!merchant) {
    return [];
  }

  const CATEGORY_LABELS = {
    grocery: 'Grocery',
    cafe: 'Cafe',
    beauty: 'Salon',
    gym: 'Gym',
    fashion: 'Boutique',
    pharmacy: 'Pharmacy',
    medical: 'Pharmacy',
    doctor: 'Clinic',
    stationery: 'Stationery',
    electronics: 'Electronics',
    hotel: 'Hotel',
    education: 'Education'
  };

  const ownCategory = (merchant.category || '').toLowerCase();

  return REFERRAL_CATEGORIES
    .filter(cat => cat !== ownCategory)
    .map(cat => ({ category: cat, label: CATEGORY_LABELS[cat] || cat }));
}

async function getMyReferrals(merchantId) {
  const referrals = await prisma.merchantReferral.findMany({
    where: { referrerMerchantId: merchantId },
    orderBy: { createdAt: 'desc' }
  });

  const enriched = [];

  for (const ref of referrals) {
    const referredMerchant = await prisma.merchant.findUnique({
      where: { id: ref.referredMerchantId },
      select: {
        id: true,
        businessName: true,
        ownerName: true,
        category: true,
        city: true,
        status: true,
        isActive: true,
        merchantCode: true
      }
    });

    enriched.push({
      ...ref,
      referredMerchant
    });
  }

  return enriched;
}

async function getMerchantNotifications(merchantId, page = 1, limit = 20) {
  const skip = (page - 1) * limit;

  const [notifications, total] = await Promise.all([
    prisma.merchantNotification.findMany({
      where: { merchantId },
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit
    }),
    prisma.merchantNotification.count({
      where: { merchantId }
    })
  ]);

  return {
    notifications,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit)
    }
  };
}

async function markNotificationRead(notificationId, merchantId) {
  return prisma.merchantNotification.updateMany({
    where: { id: notificationId, merchantId },
    data: { isRead: true }
  });
}

async function getAdminReferralOverview() {
  const referrals = await prisma.merchantReferral.findMany({
    orderBy: { createdAt: 'desc' }
  });

  const enriched = [];

  for (const ref of referrals) {
    const [referrer, referred] = await Promise.all([
      prisma.merchant.findUnique({
        where: { id: ref.referrerMerchantId },
        select: { id: true, businessName: true, merchantCode: true }
      }),
      prisma.merchant.findUnique({
        where: { id: ref.referredMerchantId },
        select: { id: true, businessName: true, merchantCode: true, status: true, isActive: true }
      })
    ]);

    enriched.push({
      ...ref,
      referrer,
      referred
    });
  }

  return enriched;
}

module.exports = {
  processReferralOnFirstPayment,
  releaseHeldRewards,
  processReferralOnRenewal,
  getLeaderboard,
  getNearbyBusinessesToInvite,
  getMyReferrals,
  getMerchantNotifications,
  markNotificationRead,
  getAdminReferralOverview,
  getMonthlyCapStatus
};

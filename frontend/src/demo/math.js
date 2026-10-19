/**
 * Demo reward math — pure functions mirroring backend formulas.
 *
 * Every function is side-effect free and accepts an explicit `now` — there
 * are NO hidden Date.now() calls, so tests can pin time exactly.
 *
 * Backend sources mirrored:
 *   earn floor      backend/src/services/pointsService.js:131
 *   expiry date     backend/src/services/pointsService.js:81-86
 *   balance filter  backend/src/services/pointsService.js:27-42
 *   fee / net       backend/src/services/subscriptionService.js:312-328
 *   min redeem      backend/src/services/pointsService.js:265-269
 *   milestones      backend/src/controllers/customerController.js:957-978
 *   lifetime sums   backend/src/services/pointsService.js:606-616
 *   expiring window backend/src/services/pointsService.js:553-589
 *
 * The discount<=bill rule is a DEMO-ONLY deviation: the backend does NOT
 * enforce it (processRedeem only requires invoiceAmount > 0,
 * pointsService.js:271-275). The guest demo adds it so visitors cannot
 * simulate absurd redemptions (approved decision, Prompt 3).
 */

export const DEMO_REWARD_SETTINGS = Object.freeze({
  pointsPerRupee: 0.1,
  rupeesPerPoint: 0.1,
  minRedeemPoints: 100,
  pointsExpiryDays: 365,
  redemptionFeePercent: 5
});

const DAY_MS = 24 * 60 * 60 * 1000;

/** backend/src/services/pointsService.js:131 — Math.floor(amount * pointsPerRupee) */
export function calcEarnPoints(purchaseAmount, settings = DEMO_REWARD_SETTINGS) {
  const amount = parseFloat(purchaseAmount);
  return Math.floor(amount * parseFloat(settings.pointsPerRupee));
}

/** backend/src/services/pointsService.js:81-86 — now + pointsExpiryDays calendar days */
export function calcExpiryDate(now, settings = DEMO_REWARD_SETTINGS) {
  const days = settings.pointsExpiryDays || 365;
  const expiry = new Date(now.getTime());
  expiry.setDate(expiry.getDate() + days);
  return expiry;
}

/** backend/src/services/pointsService.js:27-42 — sum of non-expired pointsChange */
export function calcBalance(ledger, now) {
  const nowMs = now.getTime();
  return ledger.reduce((sum, e) => {
    if (e.expiresAt && new Date(e.expiresAt).getTime() <= nowMs) return sum;
    return sum + e.pointsChange;
  }, 0);
}

/** backend/src/services/subscriptionService.js:312-328 — gross/fee/net, 2dp rounding */
export function calcRedemptionFee(pointsToRedeem, settings = DEMO_REWARD_SETTINGS) {
  const rupeesPerPoint = parseFloat(settings.rupeesPerPoint);
  const feePercent =
    settings.redemptionFeePercent !== undefined && settings.redemptionFeePercent !== null
      ? parseFloat(settings.redemptionFeePercent)
      : 5;

  const grossDiscount = pointsToRedeem * rupeesPerPoint;
  const platformFee = grossDiscount * (feePercent / 100);
  const netAmount = grossDiscount - platformFee;

  return {
    grossDiscount: parseFloat(grossDiscount.toFixed(2)),
    feePercent,
    platformFee: parseFloat(platformFee.toFixed(2)),
    netAmount: parseFloat(netAmount.toFixed(2))
  };
}

/**
 * Validates a redemption.
 * - min redeem: backend/src/services/pointsService.js:265-269
 * - invoice required & > 0: backend/src/services/pointsService.js:271-275
 * - discount <= bill: DEMO-ONLY (no backend equivalent)
 * Returns { ok: true } or { ok: false, code, message }.
 */
export function validateRedemption({ pointsToRedeem, billAmount, balance, settings = DEMO_REWARD_SETTINGS }) {
  const points = Number(pointsToRedeem);
  const bill = parseFloat(billAmount);

  if (!Number.isFinite(points) || !Number.isInteger(points) || points <= 0) {
    return { ok: false, code: 'DEMO_VALIDATION', message: 'Points to redeem must be a positive whole number.' };
  }
  if (points < settings.minRedeemPoints) {
    return {
      ok: false,
      code: 'DEMO_VALIDATION',
      message: `Minimum redemption limit is ${settings.minRedeemPoints} points.`
    };
  }
  if (!Number.isFinite(bill) || bill <= 0) {
    return {
      ok: false,
      code: 'DEMO_VALIDATION',
      message: 'Purchase amount is required for redemption.'
    };
  }
  // DEMO-ONLY: gross discount may not exceed the bill amount.
  const { grossDiscount } = calcRedemptionFee(points, settings);
  if (grossDiscount > bill) {
    return {
      ok: false,
      code: 'DEMO_VALIDATION',
      message: `Discount (₹${grossDiscount.toFixed(2)}) cannot exceed the bill amount (₹${bill.toFixed(2)}).`
    };
  }
  if (typeof balance === 'number' && points > balance) {
    return { ok: false, code: 'DEMO_VALIDATION', message: 'Insufficient points balance.' };
  }
  return { ok: true };
}

/**
 * Lifetime sums — backend/src/services/pointsService.js:606-616
 * earned = Σ positive pointsChange; redeemed = |Σ negative pointsChange|.
 */
export function calcLifetime(ledger) {
  let earned = 0;
  let redeemedAbs = 0;
  for (const e of ledger) {
    if (e.pointsChange > 0) earned += e.pointsChange;
    else redeemedAbs += Math.abs(e.pointsChange);
  }
  return { lifetimeEarned: earned, lifetimeRedeemed: redeemedAbs };
}

/**
 * Expiring-within-window entries — backend/src/services/pointsService.js:553-589
 * Positive entries whose expiresAt lies in (now, now + daysAhead], daysUntilExpiry = ceil.
 */
export function calcExpiringPoints(ledger, now, daysAhead = 30) {
  const nowMs = now.getTime();
  const cutoff = new Date(now.getTime());
  cutoff.setDate(cutoff.getDate() + daysAhead);
  const cutoffMs = cutoff.getTime();

  const entries = ledger
    .filter((e) => {
      if (e.pointsChange <= 0 || !e.expiresAt) return false;
      const exp = new Date(e.expiresAt).getTime();
      return exp > nowMs && exp <= cutoffMs;
    })
    .sort((a, b) => new Date(a.expiresAt) - new Date(b.expiresAt))
    .map((e) => ({
      points: e.pointsChange,
      expiresAt: new Date(e.expiresAt).toISOString(),
      daysUntilExpiry: Math.ceil((new Date(e.expiresAt).getTime() - nowMs) / DAY_MS)
    }));

  const totalExpiring = entries.reduce((sum, e) => sum + e.points, 0);
  return { totalExpiring, entries };
}

/** backend/src/controllers/customerController.js:957 — Σ purchaseAmount of completed earns */
export function calcTotalSpend(transactions) {
  return transactions
    .filter((t) => t.type === 'earn' && t.status === 'completed')
    .reduce((acc, t) => acc + parseFloat(t.purchaseAmount || 0), 0);
}

/**
 * Milestone progress — backend/src/controllers/customerController.js:964-978
 * progressPercent = min(spend/target*100, 100); isUnlocked = spend >= target;
 * amountRemaining = isUnlocked ? 0 : target - spend.
 */
export function calcMilestoneProgress(totalSpend, milestones) {
  return milestones
    .slice()
    .sort((a, b) => a.spendTarget - b.spendTarget)
    .map((m) => {
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
}

/**
 * Crossing detection used by simulateEarn — backend/src/services/pointsService.js:186-197:
 * previousTotalSpend < target && newTotalSpend >= target unlocks the bonus.
 * Returns the milestone definitions crossed by this transition.
 */
export function milestonesCrossed(prevSpend, newSpend, milestones) {
  return milestones.filter((m) => {
    const target = parseFloat(m.spendTarget);
    return prevSpend < target && newSpend >= target;
  });
}

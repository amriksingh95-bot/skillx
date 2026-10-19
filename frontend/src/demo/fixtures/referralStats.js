/**
 * Demo referral stats fixture.
 * Mirrors GET /api/customer/referral-stats
 * (backend/src/controllers/customerController.js:895-903).
 * totalPointsEarned matches the single 20-pt referral ledger entry.
 */

export const DEMO_REFERRAL_STATS = {
  referralCode: 'SKXTDEMO0001',
  monthlyReferrals: 1,
  totalPointsEarned: 20,
  monthlyCapRemaining: 9
};

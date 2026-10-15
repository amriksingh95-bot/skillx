/**
 * Demo milestone definitions.
 * Mirrors MilestoneBonus rows consumed by GET /api/customer/milestone-progress
 * (backend/src/controllers/customerController.js:959-978). Progress itself is
 * computed by the store from earn transactions' purchaseAmount.
 *
 * Fixture lifetime spend = ₹9,950 → M1 (₹1,000) and M2 (₹5,000) unlocked;
 * M3 (₹10,000) at 99.5%; M4 (₹20,000) pending.
 */

export const DEMO_MILESTONES = [
  { id: 'demo-ms-1000', spendTarget: 1000, bonusPoints: 100, isActive: true },
  { id: 'demo-ms-5000', spendTarget: 5000, bonusPoints: 600, isActive: true },
  { id: 'demo-ms-10000', spendTarget: 10000, bonusPoints: 1500, isActive: true },
  { id: 'demo-ms-20000', spendTarget: 20000, bonusPoints: 4000, isActive: true }
];

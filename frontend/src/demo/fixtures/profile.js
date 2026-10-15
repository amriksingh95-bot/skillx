/**
 * Demo customer profile fixture (identity fields only).
 *
 * Shape mirrors GET /api/customer/profile (backend/src/controllers/customerController.js:82-135).
 * `balance`, `rewardSettings` and `stats` are NOT hardcoded here — the store
 * derives them from the ledger via demo/math.js so balance === Σ ledger.
 * All personal details are fictional; mobile/email are example values.
 */

export const DEMO_CUSTOMER_ID = 'demo-customer-01';

export const DEMO_PROFILE_BASE = {
  id: DEMO_CUSTOMER_ID,
  name: 'Aarav Mehta',
  mobile: '9876501234',
  email: 'aarav.demo@example.com',
  qrCode: 'SKXTDEMO0001',
  isActive: true,
  daysAgo: 500, // createdAt materialized by the store
  dateOfBirth: '1996-04-12',
  gender: 'Male',
  city: 'Ludhiana',
  pinCode: '141001',
  area: 'Sarabha Nagar',
  occupation: 'Engineer',
  maritalStatus: 'Single',
  anniversaryDate: null,
  numberOfChildren: 0,
  preferredLanguage: 'English',
  communicationPref: 'email',
  favouriteCategories: ['Cafe', 'Grocery', 'Electronics'],
  dietaryPreference: 'No preference',
  notificationOptIn: true,
  referralCode: 'SKXTDEMO0001',
  referredBy: 'demo-referrer-01',
  referredByName: 'Kabir Singh',
  referredCount: 2,
  referredPoints: 40,
  profilePhoto: '',
  alternativePhone: '9876505678',
  updatedAtDaysAgo: 3
};

/**
 * Demo ledger + matching transactions fixtures.
 *
 * Ledger mirrors PointsLedger rows (backend/src/services/pointsService.js:63-71):
 *   { id, customerId, transactionId, pointsChange, balanceAfter*, expiresAt, createdAt }
 * (*balanceAfter is computed by the store in creation order; not stored here.)
 *
 * Transactions mirror Transaction rows as returned by GET /api/customer/transactions
 * (backend/src/controllers/customerController.js:283-296 — include merchant
 * { businessName, category }); CustomerDashboard reads createdAt, remarks,
 * merchant.businessName, type, purchaseAmount, points, platformFee, netAmount, status.
 *
 * Dates are relative: `daysAgo` from demo-start; `expiresInDays` from demo-start
 * (null = never expires). The store materializes both to ISO strings.
 *
 * Invariants (verified by tests):
 *   Σ positive non-expired pointsChange = balance (1485)
 *   lifetimeEarned = 1785, lifetimeRedeemed = 300, expiringWithin30Days = 0
 *   every unexpired entry expires 120-330 days from demo-start (all in 2027)
 *   total earn spend = ₹9,950 (milestone M3 @ ₹10,000 stays pending — good demo tension)
 */

export const DEMO_LEDGER = [
  // --- legacy promos / earns (oldest entries expire soonest, but never within 30 days) ---
  { id: 'demo-lg-01', transactionId: 'demo-tx-01', pointsChange: 30, daysAgo: 360, expiresInDays: 120 },
  { id: 'demo-lg-02', transactionId: 'demo-tx-02', pointsChange: 90, daysAgo: 355, expiresInDays: 125 },
  { id: 'demo-lg-03', transactionId: 'demo-tx-03', pointsChange: 40, daysAgo: 340, expiresInDays: 130 },

  // --- last ~6 months ---
  { id: 'demo-lg-04', transactionId: 'demo-tx-04', pointsChange: 80, daysAgo: 170, expiresInDays: 195 },
  { id: 'demo-lg-05', transactionId: 'demo-tx-05', pointsChange: 100, daysAgo: 170, expiresInDays: 195 }, // milestone M1
  { id: 'demo-lg-06', transactionId: 'demo-tx-06', pointsChange: 120, daysAgo: 155, expiresInDays: 210 },
  { id: 'demo-lg-07', transactionId: 'demo-tx-07', pointsChange: -100, daysAgo: 140, expiresInDays: null }, // redeem
  { id: 'demo-lg-08', transactionId: 'demo-tx-08', pointsChange: 150, daysAgo: 120, expiresInDays: 245 },
  { id: 'demo-lg-09', transactionId: 'demo-tx-09', pointsChange: 20, daysAgo: 20, expiresInDays: null }, // referral (within current month -> monthlyReferrals: 1)
  { id: 'demo-lg-10', transactionId: 'demo-tx-10', pointsChange: 150, daysAgo: 90, expiresInDays: 275 },
  { id: 'demo-lg-11', transactionId: 'demo-tx-11', pointsChange: 600, daysAgo: 90, expiresInDays: 275 }, // milestone M2
  { id: 'demo-lg-12', transactionId: 'demo-tx-12', pointsChange: 90, daysAgo: 75, expiresInDays: 290 },
  { id: 'demo-lg-13', transactionId: 'demo-tx-13', pointsChange: -200, daysAgo: 60, expiresInDays: null }, // redeem
  { id: 'demo-lg-14', transactionId: 'demo-tx-14', pointsChange: 120, daysAgo: 45, expiresInDays: 320 },
  { id: 'demo-lg-15', transactionId: 'demo-tx-15', pointsChange: 50, daysAgo: 28, expiresInDays: 322 },
  { id: 'demo-lg-16', transactionId: 'demo-tx-16', pointsChange: 70, daysAgo: 20, expiresInDays: 325 },
  { id: 'demo-lg-17', transactionId: 'demo-tx-17', pointsChange: 30, daysAgo: 12, expiresInDays: 328 },
  { id: 'demo-lg-18', transactionId: 'demo-tx-18', pointsChange: 45, daysAgo: 5, expiresInDays: 330 }
];

export const DEMO_TRANSACTIONS = [
  {
    id: 'demo-tx-01',
    customerId: 'demo-customer-01',
    merchantId: 'demo-m-03',
    type: 'earn',
    purchaseAmount: null,
    invoiceAmount: null,
    points: 30,
    platformFee: null,
    netAmount: null,
    remarks: 'Promo bonus - limited validity earn',
    status: 'completed',
    daysAgo: 360,
    merchant: { businessName: 'NovaMart Grocery', category: 'grocery' }
  },
  {
    id: 'demo-tx-02',
    customerId: 'demo-customer-01',
    merchantId: 'demo-m-06',
    type: 'earn',
    purchaseAmount: '900',
    invoiceAmount: null,
    points: 90,
    platformFee: null,
    netAmount: null,
    remarks: 'Earned points at HealWell Pharmacy',
    status: 'completed',
    daysAgo: 355,
    merchant: { businessName: 'HealWell Pharmacy', category: 'medical' }
  },
  {
    id: 'demo-tx-03',
    customerId: 'demo-customer-01',
    merchantId: 'demo-m-03',
    type: 'earn',
    purchaseAmount: null,
    invoiceAmount: null,
    points: 40,
    platformFee: null,
    netAmount: null,
    remarks: 'Promo bonus - limited validity earn',
    status: 'completed',
    daysAgo: 340,
    merchant: { businessName: 'NovaMart Grocery', category: 'grocery' }
  },
  {
    id: 'demo-tx-04',
    customerId: 'demo-customer-01',
    merchantId: 'demo-m-01',
    type: 'earn',
    purchaseAmount: '800',
    invoiceAmount: null,
    points: 80,
    platformFee: null,
    netAmount: null,
    remarks: 'Earned points at Cedar Kitchen Restaurant',
    status: 'completed',
    daysAgo: 170,
    merchant: { businessName: 'Cedar Kitchen Restaurant', category: 'restaurant' }
  },
  {
    id: 'demo-tx-05',
    customerId: 'demo-customer-01',
    merchantId: 'demo-m-01',
    type: 'earn',
    purchaseAmount: null,
    invoiceAmount: null,
    points: 100,
    platformFee: null,
    netAmount: null,
    remarks: 'Milestone Bonus - Rs. 1000 spend achieved',
    status: 'completed',
    daysAgo: 170,
    merchant: { businessName: 'Cedar Kitchen Restaurant', category: 'restaurant' }
  },
  {
    id: 'demo-tx-06',
    customerId: 'demo-customer-01',
    merchantId: 'demo-m-03',
    type: 'earn',
    purchaseAmount: '1200',
    invoiceAmount: null,
    points: 120,
    platformFee: null,
    netAmount: null,
    remarks: 'Earned points at NovaMart Grocery',
    status: 'completed',
    daysAgo: 155,
    merchant: { businessName: 'NovaMart Grocery', category: 'grocery' }
  },
  {
    id: 'demo-tx-07',
    customerId: 'demo-customer-01',
    merchantId: 'demo-m-01',
    type: 'redeem',
    purchaseAmount: '10',
    invoiceAmount: '250',
    points: 100,
    platformFee: '0.5',
    netAmount: '9.5',
    remarks: 'Redeemed 100 points for Rs. 9.5 discount on Rs. 250 invoice (Rs. 0.5 platform fee)',
    status: 'completed',
    daysAgo: 140,
    merchant: { businessName: 'Cedar Kitchen Restaurant', category: 'restaurant' }
  },
  {
    id: 'demo-tx-08',
    customerId: 'demo-customer-01',
    merchantId: 'demo-m-10',
    type: 'earn',
    purchaseAmount: '1500',
    invoiceAmount: null,
    points: 150,
    platformFee: null,
    netAmount: null,
    remarks: 'Earned points at Circuit City Repairs',
    status: 'completed',
    daysAgo: 120,
    merchant: { businessName: 'Circuit City Repairs', category: 'electronics' }
  },
  {
    id: 'demo-tx-09',
    customerId: 'demo-customer-01',
    merchantId: 'demo-m-03',
    type: 'earn',
    purchaseAmount: null,
    invoiceAmount: null,
    points: 20,
    platformFee: null,
    netAmount: null,
    remarks: 'Referral Bonus - friend joined SkillXT',
    status: 'completed',
    daysAgo: 20,
    merchant: { businessName: 'NovaMart Grocery', category: 'grocery' }
  },
  {
    id: 'demo-tx-10',
    customerId: 'demo-customer-01',
    merchantId: 'demo-m-02',
    type: 'earn',
    purchaseAmount: '1500',
    invoiceAmount: null,
    points: 150,
    platformFee: null,
    netAmount: null,
    remarks: 'Earned points at Lotus Leaf Cafe',
    status: 'completed',
    daysAgo: 90,
    merchant: { businessName: 'Lotus Leaf Cafe', category: 'cafe' }
  },
  {
    id: 'demo-tx-11',
    customerId: 'demo-customer-01',
    merchantId: 'demo-m-02',
    type: 'earn',
    purchaseAmount: null,
    invoiceAmount: null,
    points: 600,
    platformFee: null,
    netAmount: null,
    remarks: 'Milestone Bonus - Rs. 5000 spend achieved',
    status: 'completed',
    daysAgo: 90,
    merchant: { businessName: 'Lotus Leaf Cafe', category: 'cafe' }
  },
  {
    id: 'demo-tx-12',
    customerId: 'demo-customer-01',
    merchantId: 'demo-m-09',
    type: 'earn',
    purchaseAmount: '900',
    invoiceAmount: null,
    points: 90,
    platformFee: null,
    netAmount: null,
    remarks: 'Earned points at Iron Peak Gym',
    status: 'completed',
    daysAgo: 75,
    merchant: { businessName: 'Iron Peak Gym', category: 'gym' }
  },
  {
    id: 'demo-tx-13',
    customerId: 'demo-customer-01',
    merchantId: 'demo-m-05',
    type: 'redeem',
    purchaseAmount: '20',
    invoiceAmount: '500',
    points: 200,
    platformFee: '1',
    netAmount: '19',
    remarks: 'Redeemed 200 points for Rs. 19 discount on Rs. 500 invoice (Rs. 1 platform fee)',
    status: 'completed',
    daysAgo: 60,
    merchant: { businessName: 'CarePlus Clinic', category: 'doctor' }
  },
  {
    id: 'demo-tx-14',
    customerId: 'demo-customer-01',
    merchantId: 'demo-m-08',
    type: 'earn',
    purchaseAmount: '1200',
    invoiceAmount: null,
    points: 120,
    platformFee: null,
    netAmount: null,
    remarks: 'Earned points at Paper Trail Stationery',
    status: 'completed',
    daysAgo: 45,
    merchant: { businessName: 'Paper Trail Stationery', category: 'stationery' }
  },
  {
    id: 'demo-tx-15',
    customerId: 'demo-customer-01',
    merchantId: 'demo-m-03',
    type: 'earn',
    purchaseAmount: '500',
    invoiceAmount: null,
    points: 50,
    platformFee: null,
    netAmount: null,
    remarks: 'Earned points at NovaMart Grocery',
    status: 'completed',
    daysAgo: 28,
    merchant: { businessName: 'NovaMart Grocery', category: 'grocery' }
  },
  {
    id: 'demo-tx-16',
    customerId: 'demo-customer-01',
    merchantId: 'demo-m-01',
    type: 'earn',
    purchaseAmount: '700',
    invoiceAmount: null,
    points: 70,
    platformFee: null,
    netAmount: null,
    remarks: 'Earned points at Cedar Kitchen Restaurant',
    status: 'completed',
    daysAgo: 20,
    merchant: { businessName: 'Cedar Kitchen Restaurant', category: 'restaurant' }
  },
  {
    id: 'demo-tx-17',
    customerId: 'demo-customer-01',
    merchantId: 'demo-m-02',
    type: 'earn',
    purchaseAmount: '300',
    invoiceAmount: null,
    points: 30,
    platformFee: null,
    netAmount: null,
    remarks: 'Earned points at Lotus Leaf Cafe',
    status: 'completed',
    daysAgo: 12,
    merchant: { businessName: 'Lotus Leaf Cafe', category: 'cafe' }
  },
  {
    id: 'demo-tx-18',
    customerId: 'demo-customer-01',
    merchantId: 'demo-m-09',
    type: 'earn',
    purchaseAmount: '450',
    invoiceAmount: null,
    points: 45,
    platformFee: null,
    netAmount: null,
    remarks: 'Earned points at Iron Peak Gym',
    status: 'completed',
    daysAgo: 5,
    merchant: { businessName: 'Iron Peak Gym', category: 'gym' }
  }
];

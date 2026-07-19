# Article 52: Customer Points Earning (Earn Points)

## Article Title
Customer Points Earning (Earn Points)

## Target User
Customer, Merchant, Super Admin

## Purpose
To explain how customers earn points through purchases at SkillXT partner merchants, including the earning formula, merchant requirements, milestone bonuses, points expiry, and transaction recording.

## Key Topics

### 1. Points Earning Formula
- **Default Rate**: ₹10 spent = 1 point (pointsPerRupee = 0.10)
- **Calculation Method**: Points = floor(purchaseAmount × pointsPerRupee)
- **Configurable Rate**: pointsPerRupee is stored in RewardSettings and can be updated by admin (API validation enforces min 0.0001)
- **Rounding Behavior**: floor() applied — fractional points are truncated, never rounded up
- **Minimum Purchase Threshold**: Backend requires `purchaseAmount > 0`. The merchant UI enforces `min={1}` on the amount input field. No `RewardSettings.minEarnAmount` field exists in the current Prisma schema.

### 2. Merchant Requirements for Issuing Points
- **Subscription Eligibility**: Merchants with no subscription record are allowed. Merchants with active or grace-period subscriptions are allowed. Merchants with expired subscriptions are blocked by checkMerchantSubscriptionStatus().
- **Sufficient Points Balance**: Merchant must have enough pointsBalance to cover issuance (atomic decrement)
- **Subscription Check**: checkMerchantSubscriptionStatus() validates merchant eligibility before each earn
- **Balance Check**: Merchant pointsBalance is decremented atomically — if balance is insufficient, earn is rejected

### 3. Points Issuance Process
- **Customer Verification**: Merchant scans customer QR code or searches by mobile number
- **Amount Entry**: Merchant enters purchase amount
- **Automatic Calculation**: System calculates points based on current pointsPerRupee
- **Ledger Entry**: Points credited to customer via PointsLedger with balanceAfter
- **Transaction Record**: Transaction created with type=earn, remarks include merchant name
- **Expiry Assignment**: Each earning transaction gets expiresAt = now + pointsExpiryDays (default 365 days)

### 4. Milestone Bonuses
- **Configurable Tiers**: Milestone bonuses are defined in the MilestoneBonus table and can be created, updated, or deactivated by admin. Seed data includes ₹5,000→100 pts, ₹10,000→300 pts, ₹25,000→1,000 pts.
- **Automatic Award**: Bonuses are triggered automatically when cumulative earn-transaction spend crosses a configured target.
- **Separate Ledger Entry**: Milestone bonuses create independent bonus transactions with remarks "Milestone Bonus - Rs. {target} spend achieved"
- **Bonus Expiry**: Milestone bonus points receive the same pointsExpiryDays expiry as regular earnings.

### 5. Points Expiry Behavior
- **Default Validity**: 365 days (pointsExpiryDays in RewardSettings)
- **Per-transaction Expiry**: Each earning transaction has its own expiresAt timestamp
- **Expiry Calculation**: Points expiry is determined dynamically during balance queries. The system sums pointsChange from PointsLedger where expiresAt > now OR expiresAt IS NULL (legacy entries with no expiry are always included). There is no scheduled batch job that marks points as expired.
- **Balance Calculation**: Customer balance = SUM(pointsChange) from PointsLedger where expiresAt > now OR expiresAt IS NULL
- **No Cached Balance**: All balances computed dynamically from ledger — no stored balance field on Customer

### 6. Transaction Recording
- **Transaction Table**: Every earn creates a Transaction record with type=earn
- **PointsLedger Table**: Every earn creates a PointsLedger entry with pointsChange (positive) and balanceAfter
- **Remarks**: Default remarks format: "Earned points at {merchant.businessName}"
- **Merchant Balance Update**: Merchant.pointsBalance decremented atomically: SET pointsBalance = pointsBalance - points WHERE id = merchantId
- **Audit Trail**: Complete history via PointsLedger ordered by createdAt

### 7. Earning Validation Rules
- **Merchant Status**: Merchant must be isActive=true. Subscription must be active, grace-period, or absent. Expired subscriptions are blocked.
- **Balance Availability**: Merchant pointsBalance must be >= points to issue
- **Customer Status**: Customer must be isActive=true
- **Atomic Transaction**: Entire earn flow wrapped in Prisma $transaction with pg_advisory_xact_lock — if any step fails, all changes roll back
- **Concurrency Control**: pg_advisory_xact_lock serializes all balance-affecting operations for the same customer, preventing race conditions.
- **Settings Requirement**: A RewardSettings record must exist; earn is rejected if none is configured.
- **Duplicate Prevention**: No explicit duplicate prevention — each QR scan creates a new transaction
- **Settlement Timing**: Points credited immediately — no pending or hold period

### 8. Admin Controls
- **Earn Rate Configuration**: Admin updates RewardSettings.pointsPerRupee to change earning rate globally
- **Milestone Bonus Management**: Admin can create, update, or deactivate milestone bonuses via MilestoneBonus table
- **Points Expiry Configuration**: Admin updates RewardSettings.pointsExpiryDays to change validity period
- **Manual Point Issuance**: Admin can issue points directly to customers outside normal merchant flow
- **Merchant Status Override**: Admin can activate or deactivate merchant accounts, which directly affects the isActive check in the earn flow.

### 9. Special Earning Scenarios
- **Referral Bonus**: New customer signing up via referral code receives 20 bonus points
- **Referrer Bonus**: Customer who provided referral code receives 20 bonus points
- **Subscription Bonus**: New merchant receives 1,000 welcome bonus points on first activation (admin-confirmed payment)
- **Points Top-Up**: Merchant can purchase additional points via top-up packages (Starter/Growth/Pro)
- **Category Multipliers**: No category-specific multipliers in the core earn flow — all categories earn at the same base rate in processEarn()

### 10. Common Earning Issues
- **Points Not Appearing**: Usually caused by merchant insufficient pointsBalance, expired subscription, or inactive merchant/customer account
- **Incorrect Point Amount**: Check current pointsPerRupee setting in RewardSettings
- **Delayed Points**: Points are credited immediately — delays indicate system error
- **Missing Milestone Bonus**: Verify MilestoneBonus records are active and cumulative spend threshold met
- **Points Expired**: Check PointsLedger.expiresAt for each earning transaction

## Example Questions

1. How do I earn points on SkillXT?
2. Kitne points milenge ₹500 ke kharch se?
3. What is the default points earning rate?
4. How many points for a ₹1000 purchase?
5. Merchant se points kaise kamaye?
6. Can I earn points at all merchants?
7. What happens if my purchase amount gives fractional points?
8. Are there bonus points for reaching spending milestones?
9. How long do earned points stay valid?
10. Do points expire if I don't use them?
11. Can the earning rate be changed?
12. How do I check if my points were added correctly?
13. What should a merchant do if points are not showing for a customer?
14. Is there a minimum purchase to earn points?
15. Can merchants set different earning rates?
16. How are milestone bonuses calculated?
17. What is the expiry period for points in SkillXT?
18. Do referral points have the same expiry as regular points?
19. How does the merchant subscription affect point earning?
20. Can a merchant issue points without a subscription?

## Related Articles
- Article 53: Customer Points Redemption (Redeem Points)
- Article 54: Customer Points Transfer
- Article 55: Customer Referral Program
- Article 56: Customer Profile & Preferences Management
- Article 57: Merchant Wallet & Points Management
- Article 58: Points Ledger & Transaction History
- Article 60: Points Balance & History Queries
- Article 88: Points Earning Rules Configuration
- Article 89: Points Redemption Rules Configuration
- Article 103: Customer Journey Overview

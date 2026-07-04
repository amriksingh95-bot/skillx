# Article 53: Customer Points Redemption (Redeem Points)

## Article Title
Customer Points Redemption (Redeem Points)

## Target User
Customer, Merchant, Super Admin

## Purpose
To explain how customers redeem earned points for discounts at SkillXT partner merchants, including the redemption rate, minimum thresholds, the 20% invoice cap, fee calculation, merchant subscription requirements, and transaction recording.

## Key Topics

### 1. Redemption Process Flow
- **Customer Identification**: Merchant scans customer QR code or searches by mobile number/UUID
- **Invoice Entry**: Merchant enters the purchase invoice amount
- **Cap Preview**: System calculates the maximum allowable discount (20% of invoice) and displays the maximum redeemable points
- **Points Entry**: Merchant enters points to redeem (minimum minRedeemPoints)
- **Validation**: Backend verifies customer active status, merchant active status, subscription status, sufficient balance, minimum threshold, and 20% cap
- **Fee Calculation**: System computes gross discount, platform fee, and net amount
- **Transaction Creation**: Transaction recorded with type=redeem and full fee breakdown
- **Ledger Update**: PointsLedger entry created with negative pointsChange and no expiry
- **Response**: Success message includes discounted amount and remaining customer balance

### 2. Redemption Rate Configuration
- **rupeesPerPoint**: Currency value per point stored in RewardSettings (default: 0.10)
- **Admin Configuration**: Admin updates RewardSettings.rupeesPerPoint via admin API
- **Default Conversion**: 100 points = ₹10 discount
- **Fallback Value**: 0.10 used when no RewardSettings record exists
- **Single Global Rate**: Same rate applies across all merchants in the core redemption flow

### 3. Minimum Redemption Threshold
- **minRedeemPoints**: Minimum points required per redemption stored in RewardSettings (default: 100)
- **Admin Configurable**: Admin updates RewardSettings.minRedeemPoints via admin API
- **Backend Enforcement**: processRedeem() rejects redemption if pointsToRedeem < minRedeemPoints with error VALIDATION_ERROR
- **Frontend Enforcement**: Merchant UI displays minimum requirement and blocks submission below threshold
- **Post-Redemption State**: Remaining balance below minimum cannot be redeemed until additional points are earned or received to bring the balance above the minimum

### 4. 20% Invoice Redemption Cap
- **Fixed Rule**: Points can cover at most 20% of the invoice value
- **Backend Enforcement**: merchantController.js computes maxDiscountAllowed = purchaseAmount × 0.20, derives maxPointsAllowed = floor(maxDiscountAllowed / rupeesPerPoint), and silently caps finalPoints to maxPointsAllowed
- **Frontend Enforcement**: MerchantRedeemPoints.jsx computes maxRedeemablePoints = min(customer.balance, floor(20% of invoice / rate)) and prevents the merchant from entering a higher value
- **Behavior When Exceeded**: Requested points are reduced to the maximum allowed. The redemption succeeds with the reduced amount unless the capped points fall below `minRedeemPoints`, in which case `processRedeem()` rejects the transaction with `VALIDATION_ERROR`. The response includes redemptionCap: { capped: true, requestedPoints, redeemedPoints, invoiceAmount, maxAllowedPoints }
- **No Purchase Amount**: If no invoice amount is provided, cap logic is skipped and redemption is limited only by available balance

### 5. Platform Fee Calculation
- **redemptionFeePercent**: Platform fee percentage stored in RewardSettings (default: 5.00%)
- **Admin Configurable**: Admin updates RewardSettings.redemptionFeePercent via admin API
- **Fee Formula**: platformFee = grossDiscount × (redemptionFeePercent / 100)
- **Null/Undefined Handling**: Falls back to 5% if RewardSettings.redemptionFeePercent is null or undefined
- **Rounding**: Fees rounded to 2 decimal places
- **Storage**: Fee recorded on Transaction.platformFee

### 6. Net Amount Calculation
- **Formula**: grossDiscount = pointsToRedeem × rupeesPerPoint — this is the gross discount value applied to the customer's bill before fees
- **Platform Fee**: platformFee = grossDiscount × redemptionFeePercent — deducted from the gross discount
- **Net Amount**: netAmount = grossDiscount − platformFee — this is the amount the merchant receives after the platform fee is deducted
- **Rounding**: All amounts rounded to 2 decimal places
- **Transaction Fields**: Stored as Transaction.netAmount; Transaction.purchaseAmount stores the gross discount value

### 7. Merchant Subscription Requirements
- **Subscription is Not Mandatory**: The platform does not require merchants to hold an active subscription to process point redemptions.
- **No Subscription Record**: Merchants without any subscription record are explicitly allowed to process redemptions.
- **Active Subscription**: Merchants with active subscriptions are allowed.
- **Grace Period**: Merchants within the 15-day grace period after subscription expiry are allowed.
- **Expired Subscription Block**: Only merchants whose subscription status is `expired` are blocked by checkMerchantSubscriptionStatus() with error `SUBSCRIPTION_EXPIRED` (HTTP 403).
- **Merchant Active Flag**: Merchant.isActive must be true regardless of subscription status.
- **Admin Override**: Admin can activate or deactivate merchant accounts, which directly affects redemption eligibility.

### 8. Balance Validation
- **Pre-Check**: merchantController.js calls getCustomerBalance() before processing; if currentBalance < pointsToRedeem, returns 400 INSUFFICIENT_BALANCE
- **Atomic Ledger Check**: addLedgerEntry() recalculates balance inside the transaction and throws INSUFFICIENT_BALANCE if newBalance < 0
- **Frontend Display**: UI shows current balance and remaining balance after redemption
- **Concurrency Control**: Entire redemption wrapped in Prisma $transaction with pg_advisory_xact_lock to serialize balance operations per customer

### 9. Transaction Recording
- **Transaction Table**: Every redemption creates a Transaction record with the following fields:
  - `customerId`: Customer receiving the discount
  - `merchantId`: Merchant processing the redemption
  - `type`: `redeem`
  - `invoiceAmount`: Invoice value provided by merchant (null if not provided)
  - `purchaseAmount`: Gross discount value (`pointsToRedeem × rupeesPerPoint`)
  - `points`: Points redeemed (positive integer)
  - `platformFee`: Calculated platform fee deducted from gross discount
  - `netAmount`: Amount merchant receives after fee deduction (`grossDiscount - platformFee`)
  - `remarks`: Auto-generated string describing the redemption with discount and fee details
  - `status`: `completed`
- **Ledger Entry**: PointsLedger entry created with:
  - `customerId`: Customer ID
  - `transactionId`: Linked transaction ID
  - `pointsChange`: Negative value (`-pointsToRedeem`)
  - `balanceAfter`: Updated customer balance after deduction
  - `expiresAt`: `null` — redeemed points have no expiry
- **Audit Trail**: AuditLog entry created with action `POINTS_REDEEMED`, entityType `Transaction`, and entityId referencing the redemption transaction

### 10. Redemption Failure Scenarios
- **Inactive Customer**: Customer.isActive=false or linked User.isActive=false
- **Inactive Merchant**: Merchant.isActive=false
- **Expired Subscription**: Merchant subscription status is expired (returns 403)
- **No Reward Settings**: No RewardSettings record found in database
- **Below Minimum**: pointsToRedeem < RewardSettings.minRedeemPoints
- **Insufficient Balance**: Customer current balance < pointsToRedeem
- **Cap Adjustment**: 20% cap reducing requested points is not a failure; the transaction completes with capped points
- **Transaction Rollback**: Any database error inside Prisma $transaction rolls back all changes atomically

## Example Questions

1. How do I redeem my points for a discount at a merchant?
2. Kitne points chahiye ₹100 ka discount lene ke liye?
3. What is the minimum points required to redeem?
4. Can I redeem points at any merchant?
5. Is there a limit on how much I can redeem in one transaction?
6. How is the platform fee calculated on redemptions?
7. What is the net amount I actually save after fees?
8. How do I check if I have enough points to redeem?
9. What happens if I try to redeem more points than allowed?
10. Does my merchant subscription affect point redemption?
11. Merchant se points redeem kaise kare?
12. Can merchants set different redemption rates?
13. How is the 20% invoice cap applied?
14. What should I do if my redemption fails?
15. Can I redeem points without an active subscription?
16. How are redemption transactions recorded?
17. What is the default conversion rate for points to cash?
18. Can I redeem partial point balances?
19. How do I calculate the discount for a specific bill amount?
20. Why was my redemption request capped to fewer points?

## Related Articles
- Article 52: Customer Points Earning (Earn Points)
- Article 54: Customer Points Transfer
- Article 55: Customer Referral Program
- Article 56: Customer Profile & Preferences Management
- Article 60: Points Balance & History Queries
- Article 62: Redemption Fee Calculation & Distribution
- Article 88: Points Earning Rules Configuration
- Article 89: Points Redemption Rules Configuration
- Article 90: Points Transfer Rules & Limits
- Article 130: Examples: Redemption Calculations

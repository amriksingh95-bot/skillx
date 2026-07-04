# Article 54: Customer Points Transfer

## Article Title
Customer Points Transfer

## Target User
Customer, Merchant, Super Admin

## Purpose
To explain how merchants transfer points from their own wallet directly into a customer's wallet, including the transfer flow, eligibility rules, balance limits, transaction recording, notifications, and administrative reversal.

## Key Topics

### 1. Transfer Direction and Scope
- **Merchant-to-Customer Only**: The current implementation supports transfers from a merchant's wallet to a customer's wallet only.
- **No Customer-to-Customer Transfer**: Customers cannot initiate point transfers to other customers. No customer-facing transfer UI or endpoints exist.
- **No Self-Transfer**: Transfers are always between distinct merchant and customer accounts.
- **Admin Reversal Only**: Once completed, a transfer can only be reversed by an admin; merchants cannot cancel transfers.

### 2. Transfer Process Flow
- **Step 1 – Scan**: Merchant scans the customer's QR code using the built-in camera scanner or enters the QR string manually in virtual testing mode.
- **Step 2 – Amount**: System displays the identified customer's current balance. Merchant enters the number of points to transfer. The UI shows the merchant's available wallet balance and computes the projected new merchant balance.
- **Step 3 – Confirm**: Merchant confirms the transfer. Backend validates all rules atomically, deducts points from the merchant wallet, credits the customer wallet, records the transaction, and sends a real-time notification to the customer.
- **Step 4 – Receipt**: Merchant receives a success summary showing points transferred, new merchant balance, and customer name.

### 3. Eligibility and Validation Rules
- **Customer Active Status**: Customer.isActive must be true, and the linked User.isActive must also be true. Inactive customers are rejected with error INACTIVE_CUSTOMER.
- **Merchant Active Status**: Merchant.isActive must be true. Inactive merchants are rejected with error INACTIVE_MERCHANT.
- **Merchant Subscription Status**: Merchants with no subscription record are allowed. Merchants with active or grace-period subscriptions are allowed. Merchants with expired subscriptions are blocked by checkMerchantSubscriptionStatus() with error SUBSCRIPTION_EXPIRED (HTTP 403).
- **Points Amount**: Points must be a positive integer (minimum 1). No fractional points are allowed.
- **Balance Sufficiency**: Merchant.pointsBalance must be >= points requested. Backend uses an atomic raw SQL UPDATE with a WHERE clause to prevent race conditions.

### 4. Balance Limits
- **Minimum Transfer**: 1 point (backend enforces via points >= 1; frontend uses min={1}). The minimum transfer amount is hardcoded to 1 point and is not configurable via RewardSettings.
- **Maximum Transfer**: Merchant's current pointsBalance. The frontend caps the input at stats.pointsBalance. The backend performs an atomic check-and-decrement: UPDATE "Merchant" SET "pointsBalance" = "pointsBalance" - $1 WHERE "id" = $2 AND "pointsBalance" >= $1.
- **No Daily or Weekly Limits**: There are no per-day, per-week, or per-month transfer limits beyond the immediate wallet balance.
- **No Percentage Cap**: Unlike redemptions (20% invoice cap), transfers have no percentage-based cap.

### 5. Fees and Costs
- **No Transfer Fee**: Points are transferred at full face value. No platform fee, service charge, or commission is deducted during a transfer.
- **No Tax or Surcharge**: The merchant's wallet is debited for the exact point amount; the customer's wallet is credited for the exact same point amount.
- **Cost to Merchant**: The transfer reduces the merchant's pointsBalance by the transferred point count. No cash transaction or payment flow is involved.

### 6. Ledger Recording
- **Transaction Record**: A Transaction record is created with type='transfer', purchaseAmount=null, points=positive integer, remarks defaulting to "Points transfer from {merchant.businessName}", and status='completed'.
- **PointsLedger Entry**: A PointsLedger entry is created for the customer with pointsChange=+points (positive), balanceAfter reflecting the new balance, and expiresAt set according to the current RewardSettings.pointsExpiryDays (default 365 days). If no RewardSettings record exists, the service falls back to a 365-day expiry.
- **Merchant Balance**: Merchant.pointsBalance is decremented atomically via raw SQL. No separate ledger entry is created for the merchant wallet.

### 7. Real-Time Notifications
- **SSE Notification**: Upon successful transfer, the backend sends an SSE (Server-Sent Events) real-time notification to the customer via notificationService.sendNotification().
- **Notification Payload**: { type: 'POINTS_RECEIVED', points: <points>, merchantName: <businessName>, newBalance: <newCustomerBalance> }.
- **Delivery**: Notification is delivered only to active SSE connections for the customer. If the customer is not connected, the notification is not queued for later delivery.

### 8. Audit Trail
- **Audit Log**: An AuditLog entry is created with action='POINTS_TRANSFERRED', entityType='Transaction', and entityId set to the created transaction ID. Metadata includes customerId, points, and merchantId.
- **Admin Visibility**: Transfers appear in the generic transaction list and are included in trend-service calculations (type IN ('earn','transfer')) for points-issued metrics.

### 9. Transaction Reversal
- **Admin Only**: Transfers can be reversed only by an admin through the POST /api/admin/transactions/:id/reverse endpoint.
- **Reversal Behavior**: Reversing a transfer deducts the transferred points from the customer's wallet and restores them to the merchant's wallet. The original transaction status is updated to 'reversed', and a new transaction of type='reversal' is created.
- **Balance Protection**: The reversal uses addLedgerEntry(), which throws INSUFFICIENT_BALANCE if the customer does not have enough points to cover the reversal deduction.

### 10. Frontend Experience
- **Location**: The transfer UI is a 3-step modal embedded in MerchantDashboard.jsx, accessible from the wallet card.
- **Step 1 – Scan**: Uses html5-qrcode for live camera scanning or accepts a pasted QR string for virtual testing.
- **Step 2 – Amount**: Shows customer name, email, current balance, merchant available balance, and a points input field. The input is constrained to the merchant's wallet balance.
- **Step 3 – Status**: Shows a success receipt with points transferred, customer name, and new merchant balance.
- **No Customer Transfer UI**: Customers have no interface to initiate transfers.

## Example Questions

1. How does a merchant transfer points to a customer?
2. Merchant se customer ko points kaise bheje?
3. Can a customer transfer points to another customer?
4. What is the minimum points a merchant can transfer?
5. Is there a fee for transferring points?
6. How do I scan a customer QR code to transfer points?
7. What happens if the merchant does not have enough points?
8. Can I transfer points without an active subscription?
9. How does the customer know they received points?
10. Can a transfer be reversed after completion?
11. Merchant ka points balance transfer ke baad kitna show hoga?
12. Are there daily limits on point transfers?
13. What is the maximum points I can transfer in one transaction?
14. Does the customer need an active account to receive points?
15. How are transfer transactions recorded in the system?
16. Can I transfer points to multiple customers at once?
17. What validation is performed before a transfer is completed?
18. How do I check my transfer history?
19. Can an admin cancel or reverse a transfer?
20. Why would a transfer fail even if the merchant has enough points?

## Related Articles
- Article 52: Customer Points Earning (Earn Points)
- Article 53: Customer Points Redemption (Redeem Points)
- Article 55: Customer Referral Program
- Article 56: Customer Profile & Preferences Management
- Article 60: Points Balance & History Queries
- Article 62: Redemption Fee Calculation & Distribution
- Article 88: Points Earning Rules Configuration
- Article 89: Points Redemption Rules Configuration
- Article 90: Points Transfer Rules & Limits
- Article 91: Transaction Validation Rules

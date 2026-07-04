# Article 55: Customer Referral Program

## Article Title
Customer Referral Program

## Target User
Customer, Merchant, Super Admin

## Purpose
To explain how customers earn bonus points by referring new users to SkillXT, including the registration flow, point awards, monthly limits, referral code mechanics, and transaction recording.

## Key Topics

### 1. Referral Program Overview
- **Referral Mechanism**: Existing customers share a unique referral code. When a new user signs up using that code, both the referrer and the new user receive bonus points.
- **Points Amount**: Each party receives 20 points — this value is hardcoded in the registration controller (not configurable via RewardSettings).
- **No Purchase Required**: The bonus is awarded at registration time; the referee does not need to make a purchase to trigger the reward.
- **Platform Purpose**: Drives customer acquisition through word-of-mouth while rewarding existing loyal customers.

### 2. Referral Code Generation
- **Format**: Codes are generated automatically during customer registration with pattern `SKXT` followed by up to 4 letters derived from the registrant's name (uppercase, alphanumeric characters stripped, padded with `X` if fewer than 4 characters) and a 4-digit random number (e.g., `SKXTABCD1234`).
- **Uniqueness**: The system checks for uniqueness and retries up to 10 times if a collision occurs.
- **Case Insensitivity**: Referral codes are matched case-insensitively during validation.
- **Seeded Users**: Dummy seed customers receive codes in format `REF-` followed by the last 5 characters of their mobile number (e.g., for mobile `9000000001`, the code is `REF-00001`).
- **Storage**: Each Customer record stores `referralCode` (unique), `referredBy` (referrer customer ID), and `referralPointsEarned` (cumulative integer, default 0).

### 3. Registration and Validation Flow
- **Entry Point**: New customer submits registration with an optional `referralCode` field via POST /api/auth/register.
- **OTP Requirement**: Registration still requires verified OTP regardless of referral code presence.
- **Referral Code Validation**: The backend looks up the referrer by code (case-insensitive exact match). If not found, registration proceeds without bonus — no error is thrown.
- **Monthly Cap Check**: Before awarding points, the system counts how many customers the referrer has already referred in the current calendar month. If the count is 10 or more, no bonus is awarded.
- **Active Merchant Requirement**: The system selects the first active merchant (`merchant.isActive = true`) to serve as the merchantId on bonus transactions. If no active merchant exists, no bonus is awarded.
- **Atomic Transaction**: Referral bonuses are created inside the same Prisma $transaction that creates the User and Customer records.

### 4. Point Award Mechanics
- **Referrer Bonus**: 20 points (hardcoded value) credited to the referrer's wallet via a Transaction of type='earn' with purchaseAmount=null and remarks "Referral Bonus (Referrer): Referred {name}".
- **Referee Bonus**: 20 points (hardcoded value) credited to the new customer's wallet via a Transaction of type='earn' with purchaseAmount=null and remarks "Referral Bonus (Referee): Referred by {referrer.name}".
- **Balance Calculation**: Points are added using getCustomerBalance() inside the transaction to compute balanceAfter correctly.
- **Expiry**: Bonus points receive expiresAt based on the current RewardSettings.pointsExpiryDays (default 365 days). If no RewardSettings exists, falls back to 365 days.
- **Counter Update**: Both customers' `referralPointsEarned` fields are incremented by 20.

### 5. Monthly Limits
- **Cap**: 10 successful referrals per referrer per calendar month (hardcoded value; not configurable via RewardSettings).
- **Enforcement**: Count is computed at transaction time inside the registration transaction. If count >= 10, the referrer receives no bonus.
- **Reset**: The counter resets automatically on the 1st of each month (calendar-month boundary).
- **No Overall Lifetime Cap**: There is no maximum total referral points limit; only the monthly cap applies.

### 6. Ledger Recording
- **Transaction Records**: Two Transaction records are created:
  - Referrer: type='earn', customerId=referrer.id, merchantId=activeMerchant.id, points=20, purchaseAmount=null, remarks="Referral Bonus (Referrer): Referred {name}", status='completed'
  - Referee: type='earn', customerId=newCustomer.id, merchantId=activeMerchant.id, points=20, purchaseAmount=null, remarks="Referral Bonus (Referee): Referred by {referrer.name}", status='completed'
- **PointsLedger Entries**: Two PointsLedger entries with pointsChange=+20 and balanceAfter reflecting the new balance. expiresAt follows standard expiry rules.
- **No Merchant Wallet Deduction**: The merchant record is not debited; bonus points are created via the earn transaction path.

### 7. Referral Statistics
- **Endpoint**: GET /api/customer/referral-stats (authenticated).
- **Response Fields**:
  - referralCode: Customer's unique referral code
  - monthlyReferrals: Count of successful referrals in the current calendar month
  - totalPointsEarned: Customer.referralPointsEarned value (cumulative)
  - monthlyCapRemaining: 10 minus monthlyReferrals (hardcoded cap of 10 per month)
- **Frontend Display**: CustomerDashboard.jsx shows a "Refer & Earn" card with the code, monthly count, total points earned, and copy/share actions.

### 8. Frontend Experience
- **Referral Card**: Customer Dashboard displays the customer's referral code, monthly referrals count, total points earned, and monthly cap remaining.
- **Copy & Share**: Customers can copy their referral code or full referral URL to clipboard, or share via WhatsApp using a pre-filled message.
- **Registration Integration**: The Register page accepts a `?ref=` URL query parameter and pre-fills the referral code input field.
- **No Referral UI for Merchants**: Merchants cannot view or manage referral programs through a dedicated UI.

### 9. Fraud Prevention and Edge Cases
- **Self-Referral**: The system does not explicitly block a customer from entering their own referral code during registration. However, self-referral recognition cannot be completed by the same user because duplicate mobile numbers are blocked at registration. A customer could theoretically register a new account with a different mobile number and use their own referral code, as there is no explicit check comparing the referrer's ID against the new customer's identity.
- **Duplicate Registration**: Existing mobile numbers are blocked at registration regardless of referral code.
- **Inactive Merchant Fallback**: If no active merchant exists, the bonus points are not awarded silently — the transaction is skipped.
- **Expired Referral Code**: A referral code remains valid indefinitely; there is no expiry on codes.
- **Referred By Persistence**: The `referredBy` field on Customer is set once at registration and does not change.

### 10. Admin and Merchant Visibility
- **Admin Customer Detail**: Admin can view a customer's referralCode and referredBy in the customer detail page.
- **Merchant Insights**: Merchant dashboard includes a customer list sorted by referralPointsEarned descending to identify top referrers.
- **Audit Trail**: AuditLog entries are automatically created for the Transaction records generated during referral bonuses, as part of the standard earn transaction audit trail.
- **Admin Customer Creation**: When admin creates a customer directly, a referral code is generated but no referral bonus is awarded.

## Example Questions

1. How does the SkillXT referral program work?
2. Referral program se points kaise kamaye?
3. How many points do I get for referring a friend?
4. What is my referral code and where can I find it?
5. Does my friend also get points when they use my code?
6. Is there a limit on how many friends I can refer?
7. Do referral points expire?
8. Can I refer someone who already has a SkillXT account?
9. How do I share my referral code with friends?
10. What happens if my referral code is invalid?
11. Referral bonus kitne din tak valid rehta hai?
12. How do I check how many people I have referred?
13. Can I earn referral points multiple times?
14. Does the referred friend need to make a purchase?
15. How are referral points recorded in my account?
16. Can a merchant create referral codes for customers?
17. What is the monthly limit for referrals?
18. How do I copy or share my referral link?
19. Can I refer people outside of India?
20. Why did I not receive points even though my friend signed up?

## Related Articles
- Article 52: Customer Points Earning (Earn Points)
- Article 53: Customer Points Redemption (Redeem Points)
- Article 54: Customer Points Transfer
- Article 56: Customer Profile & Preferences Management
- Article 60: Points Balance & History Queries
- Article 88: Points Earning Rules Configuration
- Article 89: Points Redemption Rules Configuration
- Article 90: Points Transfer Rules & Limits
- Article 108: Customer Referral Journey
- Article 111: Merchant Journey Overview

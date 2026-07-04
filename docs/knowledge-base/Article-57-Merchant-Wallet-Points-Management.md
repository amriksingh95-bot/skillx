# Article 57: Merchant Wallet & Points Management

## Article Title
Merchant Wallet & Points Management

## Target User
Customer, Merchant, Super Admin

## Purpose
To explain how merchants manage their points wallet, including wallet balance tracking, points top-up processes, balance adjustments, transaction history, and merchant-specific point management features.

## Key Topics

### 1. Wallet Balance Overview
- **Points Balance**: Current available points stored on Merchant table as pointsBalance field
- **Balance Calculation**: Available points = Total purchased points - Points issued to customers
- **Real-time Updates**: Balance updated immediately after each earn transaction
- **Balance Display**: Shown on MerchantDashboard.jsx wallet card with formatted presentation

### 2. Points Top-up Process
- **Top-up Packages**: Merchants can purchase additional points (Starter/Growth/Pro tiers)
- **Payment Integration**: Payment gateway handles monetary transaction for points purchase
- **Instant Credit**: Points credited immediately after successful payment verification
- **Invoice Generation**: Automated invoice created for each top-up transaction

### 3. Wallet Management Features
- **Balance History**: Transaction log showing all wallet inflows and outflows
- **Low Balance Alerts**: Notification system for merchants approaching zero balance
- **Auto-recharge Option**: Automatic top-up when balance falls below threshold
- **Bulk Operations**: Admin ability to add/subtract points in bulk

### 4. Points Issuance Tracking
- **Issuance Volume**: Total points issued to customers via earn transactions
- **Daily/Monthly Limits**: Configurable limits on points issuance volume
- **Category Tracking**: Points issued segmented by merchant category
- **ROI Monitoring**: Points issued vs customer return rate analytics

### 5. Merchant Subscription Impact
- **Subscription Bonus**: New merchants receive 1,000 welcome points on activation
- **Grace Period**: Points issuance allowed during grace period after subscription expiry
- **Expired Subscription Block**: No points issuance allowed when subscription is expired
- **Subscription Renewal Impact**: Points balance persists across subscription renewal

### 6. Admin Wallet Controls
- **Manual Adjustment**: Admin can add or remove points from merchant wallet
- **Audit Trail**: All wallet adjustments recorded with reason and timestamp
- **Balance Override**: Emergency override capability for critical situations
- **Bulk Import/Export**: CSV-based wallet management for large merchants

### 7. Wallet Security
- **Transaction Locks**: Database row-level locks prevent race conditions during earn
- **Balance Validation**: Backend validates sufficient balance before points issuance
- **API Rate Limits**: Prevents rapid balance depletion attacks
- **Suspicious Activity**: Monitoring for unusual wallet activity patterns

### 8. Financial Reconciliation
- **Point Valuation**: Each point valued at configured rupeesPerPoint rate
- **GST Compliance**: Tax documentation for points purchases and redemptions
- **Balance Reports**: Monthly wallet reconciliation statements
- **Transaction Matching**: Linking wallet changes to specific transactions

## Example Questions

1. How do I check my current wallet balance as a merchant?
2. Merchant wallet me kitna points hai?
3. What happens when my wallet balance reaches zero?
4. How do I purchase more points for my wallet?
5. Can I set up automatic recharge for my wallet?
6. How does subscription status affect my wallet?
7. What are the different top-up package options?
8. How do I view my wallet transaction history?
9. Kaise pata kare kaunse transaction ne mere wallet ko affect kiya?
10. Can an admin adjust my wallet balance?
## Related Articles
- Article 52: Customer Points Earning (Earn Points)
- Article 53: Customer Points Redemption (Redeem Points)
- Article 54: Customer Points Transfer
- Article 60: Points Balance & History Queries
- Article 114: Merchant Points Issuance Journey
- Article 115: Merchant Subscription Journey


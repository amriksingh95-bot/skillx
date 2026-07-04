# Article 62: Redemption Fee Calculation & Distribution

## Article Title
Redemption Fee Calculation & Distribution

## Target User
Super Admin, Finance Team, Merchant

## Purpose
To explain how the platform fee is calculated on point redemptions, how it is distributed, and how it contributes to platform revenue.

## Key Topics

### 1. Fee Overview
- **Platform Fee**: 5% fee on gross redemption discount value
- **Fee Source**: Deducted from merchant payment, not customer savings
- **Fee Trigger**: Applied on every valid point redemption
- **Fee Visibility**: Displayed in transaction details and merchant invoices

### 2. Fee Calculation Formula
- **Gross Discount**: pointsRedeemed × rupeesPerPoint (₹10 per 100 points)
- **Platform Fee**: grossDiscount × redemptionFeePercent (default 5%)
- **Net Amount**: grossDiscount - platformFee (what merchant receives)
- **Example**: 100 points = ₹10 discount, ₹0.50 fee, ₹9.50 to merchant

### 3. Fee Settings Configuration
- **redemptionFeePercent**: Configurable in RewardSettings table
- **Default Value**: 5.00% if no setting configured
- **Admin Control**: Super Admin can update fee percentage
- **Validation**: Minimum 1% to prevent revenue loss

### 4. Fee Collection Process
- **Real-time Collection**: Fee captured immediately at redemption
- **Transaction Recording**: Fee stored in Transaction.platformFee field
- **Merchant Deduction**: Fee deducted from merchant's payment amount
- **No Separate Billing**: Fee included in existing merchant invoicing

### 5. Fee Distribution
- **Platform Retention**: 100% of fee retained by SkillXT
- **No Merchant Share**: Merchants do not receive portion of fee
- **Revenue Recognition**: Fee recognized immediately in financials
- **Tax Handling**: GST applied to fee amount where required

### 6. Fee Transparency
- **Customer View**: Fee not shown to customers (hidden from UX)
- **Merchant View**: Fee visible in transaction details
- **Invoice Line Item**: Fee shown separately on merchant invoices
- **Reporting**: Fee included in merchant transaction reports

### 7. Fee Analytics
- **Volume Tracking**: Total fees collected per time period
- **Merchant Breakdown**: Fees by merchant for revenue analysis
- **Trend Monitoring**: Fee patterns over time
- **Anomaly Detection**: Unusual fee patterns flagged for review

### 8. Fee Adjustments
- **Rate Changes**: Admin can modify fee percentage
- **Historical Impact**: Changes apply prospectively only
- **Merchant Notification**: 30-day notice for fee changes
- **Contract Terms**: Fee changes comply with merchant agreements

## Example Questions

1. How is the redemption fee calculated on SkillXT?
2. Redemption fee kaise calculate hota hai?
3. What is the current platform fee percentage?
4. Is the fee deducted from customer savings?
5. How much does a merchant pay for the platform fee?
6. Can the fee percentage be changed?
7. How do I see the fee on my transaction history?
8. Is the platform fee shown to customers?
9. How does the fee appear on merchant invoices?
10. What happens if I dispute a fee charge?
## Related Articles
- Article 53: Customer Points Redemption (Redeem Points)
- Article 60: Points Balance & History Queries
- Article 61: Platform Revenue & Subscription Model
- Article 66: Financial Reports & Analytics Dashboard
- Article 89: Points Redemption Rules Configuration
- Article 130: Examples: Redemption Calculations


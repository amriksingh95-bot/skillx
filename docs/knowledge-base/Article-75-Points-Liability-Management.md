# Article 75: Points Liability Management

## Article Title
Points Liability Management

## Target User
Super Admin, Finance Team, Merchant Success Team

## Purpose
To manage the financial liability created by outstanding customer points, ensuring accurate accounting, proper provisioning, and strategic decisions about points valuation and redemption.

## Key Topics

### 1. Points Liability Fundamentals
- **Liability Definition**: Financial obligation representing outstanding points
- **Calculation Method**: Outstanding points × rupeesPerPoint (₹0.10 per point)
- **Dynamic Calculation**: Real-time calculation based on ledger transactions
- **Balance Verification**: SUM(pointsChange) from PointsLedger for audit integrity
- **No Cached Balances**: All balances computed dynamically for accuracy

### 2. Liability Calculation
- **Total Points Issued**: Sum of all positive pointsChange in ledger
- **Total Points Redeemed**: Sum of all negative pointsChange in ledger
- **Outstanding Points**: Points issued minus points redeemed
- **Liability Amount**: Outstanding points × redemption value per point
- **Currency Conversion**: Handling multi-currency if applicable

### 3. Liability Reporting
- **Real-time Dashboard**: Current outstanding points and liability value
- **Historical Trends**: Liability changes over time
- **Merchant-wise Breakdown**: Liability contribution by merchant
- **Customer Segment Analysis**: Liability by customer demographics
- **Projected Liability**: Forecast based on earning and redemption trends

### 4. Redemption Rate Monitoring
- **Redemption Ratio**: Percentage of issued points that get redeemed
- **Breakage Analysis**: Points that expire or remain unredeemed
- **Redemption Velocity**: Average time between earning and redeeming
- **Seasonal Patterns**: Redemption spikes during holidays and events
- **Merchant Comparison**: Redemption rates across different merchant categories

### 5. Points Expiry Management
- **Expiry Configuration**: Setting points validity periods in RewardSettings
- **Expiry Processing**: Automated processing of expired points
- **Expiry Notifications**: Advance warnings to customers
- **Expiry Revenue**: Breakage recognized as revenue
- **Expiry Analytics**: Tracking expiry rates and patterns

### 6. Liability Risk Management
- **Risk Assessment**: Evaluating financial exposure from outstanding points
- **Provisioning**: Setting aside funds for expected redemptions
- **Scenario Analysis**: Impact of different redemption scenarios
- **Concentration Risk**: Dependency on specific customer segments
- **Mitigation Strategies**: Actions to reduce liability exposure

### 7. Financial Accounting
- **Balance Sheet Reporting**: Points liability as current liability
- **Revenue Recognition**: When breakage is recognized as revenue
- **Audit Trail**: Complete transaction history for verification
- **Reconciliation**: Matching liability reports with accounting systems
- **Tax Implications**: GST treatment of loyalty program liabilities

### 8. Valuation Strategies
- **Breakage Estimation**: Predicting unredeemed points percentage
- **Historical Breakage**: Analysis of actual vs estimated breakage
- **Valuation Adjustments**: Updating liability estimates based on trends
- **Premium Valuation**: Higher value for promotional or bonus points
- **Tiered Valuation**: Different values for different point types

### 9. Operational Controls
- **Redemption Limits**: Maximum redemption per transaction
- **Points Caps**: Maximum points a customer can accumulate
- **Merchant Controls**: Limits on points issuance per merchant
- **Fraud Prevention**: Controls to prevent unauthorized point manipulation
- **Audit Compliance**: Regular verification of liability calculations

### 10. Strategic Decision Making
- **Points Issuance Policies**: Balancing earning attractiveness with liability
- **Redemption Value Adjustments**: Impact of changing rupeesPerPoint
- **Expiration Policies**: Balancing customer experience with liability reduction
- **Promotional Strategies**: Using bonus points to drive engagement
- **Merchant Incentives**: Encouraging merchant participation in point issuance

## Example Questions

1. How is points liability calculated in SkillXT?
2. What is the current total points liability for the platform?
3. How often is the points liability calculated and updated?
4. What is the redemption rate and how is it monitored?
5. How does points expiry affect the overall liability?
6. What reports are available for points liability analysis?
7. How do I account for points liability in financial statements?
8. What is breakage and how is it calculated?
9. How can I reduce points liability without hurting customer experience?
10. What happens to points when a customer account is closed?
11. How do I reconcile points liability with actual redemption activity?
12. What is the impact of changing rupeesPerPoint on liability?
13. How can I forecast future points liability?
14. What controls are in place to prevent fraud in points issuance?
15. How do I handle points liability for refunded transactions?
16. What tax treatment applies to points breakage revenue?
17. How can I use liability data to improve platform economics?
18. What is the relationship between points liability and subscription revenue?
19. How do I present points liability information to auditors?
20. What strategic decisions can be informed by points liability analysis?

## Related Articles
- Article 52: Customer Points Earning (Earn Points)
- Article 53: Customer Points Redemption (Redeem Points)
- Article 54: Customer Points Transfer
- Article 60: Points Balance & History Queries
- Article 66: Financial Reports & Analytics Dashboard
- Article 67: Revenue Decline Alerts & Trends
- Article 75: Points Liability Management
- Article 77: Points Expiry Policy & Configuration
- Article 76: Outstanding Points Liability Reports
- Article 125: Revenue Streams & Monetization

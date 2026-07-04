# Article 67: Revenue Decline Alerts & Trends

## Article Title
Revenue Decline Alerts & Trends

## Target User
Super Admin, Finance Team, Merchant

## Purpose
To enable proactive monitoring of platform revenue streams by tracking fee revenue and subscription revenue trends over time, identifying decline patterns early, and providing actionable insights for revenue optimization.

## Key Topics

### 1. Revenue Streams Overview
- **Platform Fee Revenue**: 5% redemption fee collected on all point redemptions
- **Subscription Revenue**: Merchant subscription fees (₹399/month and tiered plans)
- **Revenue Calculation**: Dynamic aggregation from Transaction and MerchantSubscription tables

### 2. Trend Analysis Engine
- **Month-over-Month (MoM) Comparison**: Current month vs previous month revenue
- **Week-over-Week (WoW) Comparison**: Weekly transaction volume and point flow analysis
- **Percentage Change Calculation**: Automatic up/down/flat direction indicators
- **Time-based Filtering**: Supports custom date range queries

### 3. Revenue Decline Detection
- **Threshold-based Alerts**: Configurable decline percentage triggers
- **Pattern Recognition**: Identifies sustained downward trends across multiple periods
- **Segment Analysis**: Breakdown by merchant, customer segment, and transaction type
- **Root Cause Indicators**: Links revenue drops to specific factors (subscription expiry, reduced redemption, merchant churn)

### 4. Dashboard Integration
- **Revenue Cards**: Real-time display of total, monthly, and last-month revenue
- **Trend Charts**: Visual representation of revenue trajectories using Recharts
- **Merchant-wise Breakdown**: Revenue contribution per active merchant
- **Fee Revenue Trend**: 7-month historical trend visualization

### 5. Business Intelligence Features
- **Revenue Forecasting**: Predictive models based on historical patterns
- **Anomaly Detection**: Statistical outlier identification in revenue streams
- **Seasonal Analysis**: Recognition of cyclical patterns in redemption activity
- **Correlation Analysis**: Links revenue changes to platform events (promotions, new merchant onboarding)

### 6. Actionable Insights
- **Merchant Retention Alerts**: Flags merchants approaching subscription expiry
- **Redemption Rate Monitoring**: Tails points issued vs redeemed ratios
- **New Merchant Impact**: Measures revenue contribution from recently onboarded merchants
- **Re-engagement Opportunities**: Identifies high-value dormant customers for targeted campaigns

## Example Questions

1. How do I access the revenue trend dashboard in SkillXT?
2. What is the current month's platform fee revenue compared to last month?
3. How can I identify merchants whose subscriptions are expiring soon?
4. What percentage decline in revenue triggers an automatic alert?
5. How do I view revenue breakdown by individual merchants?
6. Can I export revenue trend data to Excel for further analysis?
7. What is the correlation between new merchant signups and revenue growth?
8. How do I set up custom revenue decline thresholds for my business?
9. What actions should I take when I see a 15% month-over-month revenue decline?
10. How can I distinguish between seasonal dips and actual revenue problems?
11. What metrics are used to calculate the overall platform health score?
12. How often does the revenue trend data update in the admin dashboard?
13. Can I compare revenue trends across different merchant categories?
14. What is the redemption fee percentage and how does it contribute to total revenue?
15. How do I investigate a sudden drop in subscription revenue?
16. What reports are available for quarterly revenue review meetings?
17. How can I track the impact of promotional campaigns on revenue streams?
18. What is the average revenue per active merchant (ARPU)?
19. How do I configure email alerts for revenue decline notifications?
20. Can I view historical revenue data beyond the last 7 months?

## Related Articles
- Article 61: Platform Revenue & Subscription Model
- Article 62: Redemption Fee Calculation & Distribution
- Article 63: Merchant Subscription Lifecycle & Grace Period
- Article 64: Subscription Plan Management & Configuration
- Article 65: Merchant Subscription Renewal & Auto-Renew
- Article 66: Financial Reports & Analytics Dashboard
- Article 68: Revenue Recovery Strategies
- Article 69: Subscription Revenue Optimization
- Article 70: Platform Fee Revenue Analysis
- Article 71: Merchant Churn Prediction & Prevention

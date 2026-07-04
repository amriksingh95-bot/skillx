# Article 88: Points Earning Rules Configuration

## Article Title
Points Earning Rules Configuration

## Target User
Super Admin, Merchant

## Purpose
To configure and manage the rules governing how customers earn points through purchases and other qualifying activities on the SkillXT platform.

## Key Topics

### 1. Basic Earning Configuration
- **Base Earn Rate**: Points awarded per rupee spent (default: ₹100 = 1 point)
- **Minimum Purchase Threshold**: Minimum transaction value for earning points
- **Maximum Points per Transaction**: Cap on points for single transactions
- **Daily/Monthly Caps**: Limits on total points that can be earned
- **Rounding Rules**: How fractional points are handled
- **Earn Rate Currency**: Currency in which earn rate is denominated

### 2. RewardSettings Configuration
- **rupeesPerPoint**: Currency value per point (default: 0.10)
- **minEarnAmount**: Minimum transaction for earning (default: ₹100)
- **maxPointsPerTransaction**: Maximum points per single transaction
- **maxDailyPoints**: Daily earning limit per customer
- **maxMonthlyPoints**: Monthly earning limit per customer
- **pointsExpiryDays**: Validity period for earned points

### 3. Merchant-specific Earning Rules
- **Category Multipliers**: Bonus points for specific categories (e.g., 2x for groceries)
- **Merchant Overrides**: Custom earn rates for individual merchants
- **Promotional Rates**: Temporary increased earning rates
- **New Merchant Bonuses**: Bonus points for transactions at new merchants
- **Referral Bonuses**: Points for referring new customers
- **Merchant-customized Rules**: Tailored earning rules by merchant

### 4. Promotional Earning Rules
- **Event Multipliers**: Holiday and event-based point multipliers
- **Category Promotions**: Bonus points for specific product categories
- **Time-based Promotions**: Limited-time earning boosts
- **Volume Bonuses**: Extra points for high-volume customers
- **Loyalty Tier Bonuses**: Increased earning rates for loyal customers
- **Welcome Bonuses**: One-time points for new customer signups

### 5. Earning Exclusions & Restrictions
- **Excluded Products**: Items not eligible for point earning
- **Excluded Categories**: Merchant categories with special rules
- **Payment Methods**: Specific payment types excluded from earning
- **Return Handling**: Point reversal for returned purchases
- **Refund Adjustments**: Adjusting points for partial refunds
- **Cancellation Handling**: Point reversal for cancelled orders

### 6. Transaction Processing Rules
- **Transaction Validation**: Verifying transaction authenticity
- **Duplicate Prevention**: Preventing duplicate point awards
- **Settlement Timing**: When points are credited to customer
- **Pending Period**: Holding period before points become active
- **Reversal Rules**: Conditions for reversing earned points
- **Adjustment Rules**: Correcting erroneous point awards

### 7. Special Earning Scenarios
- **Returns & Exchanges**: Point adjustment for returned merchandise
- **Partial Refunds**: Pro-rata point adjustment for partial refunds
- **Bundle Purchases**: Special rules for package deals
- **Subscription Bundles**: Points for subscribing to merchant services
- **Loyalty Tiers**: Different earning rates by customer tier
- **Anniversary Bonuses**: Special points on customer anniversaries

### 8. Points Issuance Process
- **Automatic Issuance**: Points awarded automatically at transaction
- **Manual Issuance**: Admin-issued points for special cases
- **Batch Issuance**: Bulk point awards for campaigns
- **Issuance Verification**: Confirming point awards are correct
- **Issuance Notification**: Alerting customers of earned points
- **Issuance Audit**: Logging all point issuance for compliance

### 9. Earning Rate Optimization
- **A/B Testing**: Testing different earn rates
- **Category Analysis**: Identifying high-value earning categories
- **Customer Segmentation**: Different rates for different segments
- **Competitive Benchmarking**: Comparing earn rates to competitors
- **ROI Analysis**: Measuring earning rate impact on business metrics
- **Dynamic Pricing**: Adjusting rates based on performance

### 10. Monitoring & Analytics
- **Earning Volume**: Tracking total points issued
- **Earning Trends**: Patterns in point earning over time
- **Category Performance**: Points earned by merchant category
- **Customer Behavior**: Earning patterns by customer segment
- **Anomaly Detection**: Identifying unusual earning patterns
- **Fraud Indicators**: Suspicious earning activity

## Example Questions

1. How do I configure the points earning rate in SkillXT?
2. What is the default earning rate and how can I change it?
3. Can I set different earning rates for different merchants?
4. How do I create promotional earning multipliers?
5. What is the minimum purchase amount for earning points?
6. How are points rounded when earning fractional amounts?
7. Can I exclude certain products or categories from point earning?
8. How do I handle point adjustments for returned purchases?
9. What rules apply to maximum daily or monthly point earnings?
10. How do I set up bonus points for new customer referrals?
11. Can I create special earning rules for holidays or events?
12. How do I track the effectiveness of different earning rules?
13. What happens when a customer's purchase is refunded?
14. How can I offer higher earning rates for loyal customers?
15. Can I temporarily increase earning rates for promotions?
16. How do I configure category-specific multipliers?
17. What validation ensures points are earned correctly?
18. How do I handle disputes over earned points?
19. Can I set earning rules that vary by time of day?
20. How do I measure the impact of earning rate changes?

## Related Articles
- Article 52: Customer Points Earning (Earn Points)
- Article 53: Customer Points Redemption (Redeem Points)
- Article 54: Customer Points Transfer
- Article 60: Points Balance & History Queries
- Article 87: Rules Engine Overview
- Article 89: Points Redemption Rules Configuration
- Article 90: Points Transfer Rules & Limits
- Article 91: Transaction Validation Rules
- Article 92: Anti-fraud Rules & Detection
- Article 93: Rate Limiting & Security Rules

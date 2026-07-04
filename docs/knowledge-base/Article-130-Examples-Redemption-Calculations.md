# Article 130: Examples: Redemption Calculations

## Article Title
Examples: Redemption Calculations

## Target User
Customer, Merchant, Super Admin

## Purpose
To provide practical examples of points redemption calculations, helping all stakeholders understand how discounts are computed and fees are applied during point redemption.

## Key Topics

### 1. Basic Redemption Calculation
- **Redemption Rate**: 100 points = ₹10 discount
- **Formula**: Discount = (Points / 100) × ₹10
- **Minimum Redemption**: Minimum 100 points required
- **Example 1**: 100 points redemption = ₹10 discount
- **Example 2**: 500 points redemption = ₹50 discount
- **Example 3**: 1,000 points redemption = ₹100 discount

### 2. Platform Fee Calculation
- **Fee Rate**: 5% of gross discount
- **Formula**: Fee = Gross Discount × 5%
- **Net Discount**: Gross Discount - Fee
- **Example 4**: ₹100 gross discount
  - Platform Fee: ₹100 × 5% = ₹5
  - Net Discount: ₹100 - ₹5 = ₹95
- **Example 5**: ₹50 gross discount
  - Platform Fee: ₹50 × 5% = ₹2.50
  - Net Discount: ₹50 - ₹2.50 = ₹47.50

### 3. Partial Redemption Scenarios
- **Partial Balance**: Redeeming part of available points
- **Remaining Balance**: Points left after redemption
- **Example 6**: Customer has 750 points, redeems 500
  - Discount: ₹50 gross, ₹47.50 net
  - Remaining: 250 points
- **Example 7**: Customer has 350 points, redeems 300
  - Discount: ₹30 gross, ₹28.50 net
  - Remaining: 50 points (below redemption minimum)

### 4. Multiple Redemption Scenarios
- **Sequential Redemptions**: Multiple redemptions in sequence
- **Combined Redemptions**: Redemption with other discounts
- **Example 8**: ₹200 purchase with ₹100 point redemption
  - Gross Discount: ₹100
  - Platform Fee: ₹5
  - Net Discount: ₹95
  - Customer Pays: ₹200 - ₹95 = ₹105
- **Example 9**: ₹200 purchase with ₹50 merchant discount + ₹50 points
  - Total Discount: ₹100
  - Platform Fee: ₹5 (on point portion only)
  - Net Customer Benefit: ₹95
  - Customer Pays: ₹200 - ₹95 = ₹105

### 5. Minimum Purchase with Redemption
- **Minimum Purchase Requirement**: Merchant may require minimum purchase
- **Example 10**: ₹300 purchase with ₹100 point redemption
  - Minimum purchase: ₹200
  - Purchase meets minimum: ₹300 ≥ ₹200 ✓
  - Discount applied: ₹95 net
  - Customer pays: ₹205

### 6. Insufficient Balance Scenarios
- **Balance Check**: Verifying sufficient points before redemption
- **Example 11**: Customer wants to redeem 500 points but has 400
  - Request: 500 points (₹50 gross)
  - Available: 400 points (₹40 gross)
  - Max Redeemable: 400 points
  - Alternative: Reduce redemption to 400 points
- **Example 12**: Customer wants to redeem 150 points
  - Minimum required: 100 points
  - Customer has: 150 points
  - Eligible: Yes, meets minimum
  - Redemption: 150 points = ₹14.25 net discount

### 7. Merchant-specific Redemption
- **Different Limits**: Varying limits by merchant
- **Category Exclusions**: Some products not eligible
- **Example 13**: Merchant A allows max ₹200 redemption
  - Customer redeems 2,000 points (₹200 gross)
  - Within limit: Yes
  - Fee: ₹10
  - Net: ₹190
- **Example 14**: Merchant B has product exclusions
  - Customer tries to redeem on excluded product
  - Redemption denied
  - Alternative: Choose eligible products

### 8. Redemption Frequency Limits
- **Daily Limits**: Maximum redemptions per day
- **Example 15**: Customer redeems ₹50 (500 points) at 10 AM
  - Daily limit: ₹100 (1,000 points)
  - Remaining capacity: ₹50 (500 points)
  - Can redeem again: Yes, up to ₹50 more today
- **Example 16**: Customer redeems ₹60 (600 points) at 2 PM
  - Daily limit: ₹100 (1,000 points)
  - Already redeemed: ₹50 (500 points)
  - Remaining: ₹50 (500 points)
  - Can redeem: Yes, up to ₹50 more

### 9. Fee Waiver Scenarios
- **High-volume Merchant**: Waived fees for volume
- **Promotional Period**: No fees during promotions
- **Example 17**: High-volume merchant with fee waiver
  - 1,000 points redemption
  - Normal fee: ₹5
  - Waived fee: ₹0
  - Full discount: ₹100
- **Example 18**: Promotional no-fee period
  - 500 points redemption
  - Normal fee: ₹2.50
  - Promo fee: ₹0
  - Full discount: ₹50

### 10. Redemption Value Calculations
- **Effective Value**: Actual value received per point
- **Example 19**: 1,000 points redemption
  - Gross value: ₹100
  - Platform fee: ₹5
  - Net value: ₹95
  - Effective per point: ₹95 / 1000 = ₹0.095
  - vs. face value: ₹0.10
- **Example 20**: 100 points redemption
  - Gross value: ₹10
  - Platform fee: ₹0.50
  - Net value: ₹9.50
  - Effective per point: ₹9.50 / 100 = ₹0.095
  - Effective rate: 95% of face value

## Example Questions

1. How much discount do I get for redeeming 500 points?
2. How is the platform fee calculated on redemptions?
3. What is the net discount after fees for 1,000 points?
4. Can I redeem partial point balances?
5. What happens if I redeem more points than I have?
6. How do I calculate the effective value of my points?
7. Are there limits on how much I can redeem at once?
8. How do merchant-specific redemption rules work?
9. Can I combine point redemption with other discounts?
10. What happens if my purchase is below the minimum for redemption?
11. How do I calculate redemptions across multiple purchases?
12. What is the redemption fee for different point amounts?
13. How do I maximize the value of my point redemptions?
14. Can I redeem points for cash instead of discounts?
15. How do partial redemptions affect my remaining balance?
16. What happens to unused points after partial redemption?
17. How are redemptions calculated during promotional periods?
18. Can I redeem points at any merchant?
19. How do I verify my redemption calculation is correct?
20. What examples show how redemption calculations work?

## Related Articles
- Article 53: Customer Points Redemption (Redeem Points)
- Article 89: Points Redemption Rules Configuration
- Article 107: Customer Redemption Journey
- Article 129: Examples: Points Earning Calculations
- Article 131: Examples: Fee Revenue Calculations
- Article 132: Examples: Subscription Revenue Calculations
- Article 133: Examples: Retention Rate Calculations
- Article 134: Examples: Liability Calculations
- Article 62: Redemption Fee Calculation & Distribution
- Article 60: Points Balance & History Queries

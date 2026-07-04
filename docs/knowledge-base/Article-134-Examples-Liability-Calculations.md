# Article 134: Examples: Liability Calculations

## Article Title
Examples: Liability Calculations

## Target User
Super Admin, Finance Team, Accountants

## Purpose
To provide practical examples of points liability calculations, helping stakeholders understand how outstanding points are valued, tracked, and managed for financial reporting and compliance.

## Key Topics

### 1. Basic Liability Calculation
- **Formula**: Liability = Outstanding Points × Rupees Per Point
- **Default Rate**: ₹0.10 per point
- **Example 1**: Basic liability
  - Outstanding Points: 100,000
  - Rupees Per Point: ₹0.10
  - Total Liability: 100,000 × ₹0.10 = ₹10,000
- **Example 2**: Smaller balance
  - Outstanding Points: 25,000
  - Rupees Per Point: ₹0.10
  - Total Liability: 25,000 × ₹0.10 = ₹2,500

### 2. Multi-customer Liability Aggregation
- **Definition**: Summing liabilities across all customers
- **Example 3**: Customer-level aggregation
  - Customer A: 5,000 points = ₹500 liability
  - Customer B: 3,000 points = ₹300 liability
  - Customer C: 8,000 points = ₹800 liability
  - Customer D: 2,000 points = ₹200 liability
  - Total Liability: ₹1,800
- **Example 4**: Segment-based aggregation
  - High-value customers (>10,000 pts): ₹25,000 liability
  - Medium-value (1,000-10,000 pts): ₹45,000 liability
  - Low-value (<1,000 pts): ₹30,000 liability
  - Total Liability: ₹100,000

### 3. Monthly Liability Tracking
- **Definition**: Tracking liability changes over time
- **Example 5**: Monthly liability changes
  - January 1: ₹50,000 liability
  - Points issued: 20,000 points (+₹2,000)
  - Points redeemed: 10,000 points (-₹1,000)
  - Points expired: 2,000 points (-₹200)
  - February 1: ₹50,800 liability
  - Change: +₹800
- **Example 6**: Quarterly liability summary
  - Q1 Start: ₹50,000
  - Q1 End: ₹58,000
  - Change: +₹8,000
  - Growth Rate: 16%

### 4. Breakage Calculation
- **Definition**: Expired points recognized as revenue
- **Formula**: Breakage = Expired Points × Rupees Per Point
- **Example 7**: Monthly breakage
  - Points expired: 5,000
  - Rupees per point: ₹0.10
  - Breakage Revenue: ₹500
- **Example 8**: Annual breakage
  - Monthly average expiry: 5,000 points
  - Annual expiry: 60,000 points
  - Annual breakage: ₹6,000

### 5. Liability by Merchant
- **Definition**: Liability attributed to each merchant's customers
- **Example 9**: Merchant liability breakdown
  - Merchant A customers: 30,000 points = ₹3,000
  - Merchant B customers: 45,000 points = ₹4,500
  - Merchant C customers: 25,000 points = ₹2,500
  - Total: ₹10,000
- **Example 10**: Merchant liability growth
  - Merchant A: ₹3,000 (+10% MoM)
  - Merchant B: ₹4,500 (-5% MoM)
  - Merchant C: ₹2,500 (+15% MoM)

### 6. Liability vs Redemption Rate
- **Definition**: Relationship between liability and redemption activity
- **Example 11**: High redemption rate
  - Outstanding Points: 50,000
  - Monthly redemption: 10,000 points
  - Annual redemption: 120,000 points (240% of outstanding)
  - Liability turnover: 2.4x per year
  - Breakage: Low (fast redemption)
- **Example 12**: Low redemption rate
  - Outstanding Points: 100,000
  - Monthly redemption: 5,000 points
  - Annual redemption: 60,000 points (60% of outstanding)
  - Liability turnover: 0.6x per year
  - Breakage: Higher (slow redemption)

### 7. Dynamic Balance Verification
- **Formula**: Balance = SUM(pointsChange) from ledger
- **Example 13**: Ledger-based balance calculation
  - Transaction 1: +1,000 points (earn)
  - Transaction 2: +500 points (earn)
  - Transaction 3: -300 points (redeem)
  - Transaction 4: -200 points (transfer)
  - Balance: 1,000 + 500 - 300 - 200 = 1,000 points
  - Liability: ₹100
- **Example 14**: Verification across systems
  - Ledger total: 100,000 points
  - Cached balance: 100,000 points
  - Discrepancy: 0 (balanced)

### 8. Liability Projection
- **Definition**: Forecasting future liability
- **Example 15**: 6-month projection
  - Current liability: ₹50,000
  - Monthly earning: 10,000 points
  - Monthly redemption: 6,000 points
  - Monthly expiry: 1,000 points
  - Net monthly change: +3,000 points
  - 6-month projection: ₹50,000 + (3,000 × 6 × ₹0.10) = ₹68,000
- **Example 16**: Scenario analysis
  - Optimistic: 20% faster redemption = ₹55,000 liability
  - Base case: Current trends = ₹68,000 liability
  - Pessimistic: 20% slower redemption = ₹80,000 liability

### 9. Liability Risk Assessment
- **Definition**: Evaluating financial risk from outstanding points
- **Example 17**: Risk scoring
  - Concentration Risk: 30% from top 10 customers = High
  - Dormancy Risk: 40% from 90+ day inactive = Medium
  - Expiry Risk: 15% expiring in 30 days = Low
  - Overall Risk: Medium
- **Example 18**: Provisioning calculation
  - Total Liability: ₹100,000
  - Expected Breakage: 20%
  - Net Expected Liability: ₹80,000
  - Provision Required: ₹80,000

### 10. Liability Impact on Financial Statements
- **Balance Sheet**: Current liability classification
- **Income Statement**: Breakage as revenue
- **Example 19**: Balance sheet impact
  - Points Liability: ₹100,000 (Current Liability)
  - Breakage Reserve: ₹20,000
  - Net Liability: ₹80,000
- **Example 20**: P&L impact
  - Breakage recognized: ₹2,000/month
  - Annual breakage revenue: ₹24,000
  - Impact on profitability: +₹24,000

## Example Questions

1. How is points liability calculated?
2. What is the current total points liability?
3. How do I break down liability by customer?
4. How does liability change over time?
5. What is breakage and how is it calculated?
6. How do I track liability by merchant?
7. How do I project future liability?
8. What is the relationship between redemption rate and liability?
9. How do I assess liability risk?
10. How does liability appear in financial statements?
11. How do I calculate the effective value of outstanding points?
12. How does points expiry affect liability?
13. How do I reconcile liability with actual balances?
14. What provisions should I make for points liability?
15. How do I measure liability concentration risk?
16. How does new point issuance affect liability?
17. How do I calculate liability for reporting periods?
18. What tax implications apply to points liability?
19. How do I use liability data for strategic decisions?
20. How do I present liability information to auditors?

## Related Articles
- Article 75: Points Liability Management
- Article 76: Outstanding Points Liability Reports
- Article 77: Points Expiry Policy & Configuration
- Article 129: Examples: Points Earning Calculations
- Article 130: Examples: Redemption Calculations
- Article 131: Examples: Fee Revenue Calculations
- Article 132: Examples: Subscription Revenue Calculations
- Article 133: Examples: Retention Rate Calculations
- Article 126: Unit Economics & CAC/LTV
- Article 66: Financial Reports & Analytics Dashboard

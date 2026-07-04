# Article 58: Points Ledger & Transaction History

## Article Title
Points Ledger & Transaction History

## Target User
Customer, Merchant, Super Admin

## Purpose
To provide comprehensive tracking and auditing of all point movements within the SkillXT platform through the PointsLedger and Transaction tables, enabling transparency, compliance, and operational troubleshooting.

## Key Topics

### 1. PointsLedger Architecture
- **Core Table**: PointsLedger table stores every individual point change
- **Required Fields**: customerId, transactionId, pointsChange, balanceAfter
- **Optional Fields**: expiresAt for earned points, createdAt timestamp
- **Data Integrity**: Each entry maintains referential integrity to Transaction

### 2. Transaction Records
- **Transaction Types**: earn, redeem, transfer, reversal, referral_bonus
- **Common Fields**: id, customerId, merchantId, type, points, amount, remarks
- **Status Tracking**: completed, pending, reversed for transaction states
- **Audit Support**: CreatedAt and updatedAt timestamps for all records

### 3. Balance Calculation Logic
- **Dynamic Summation**: Current balance = SUM(pointsChange) from PointsLedger
- **Expiry Window**: Only includes points where expiresAt > now or expiresAt IS NULL
- **Real-time Updates**: Balance computed on query, not cached
- **Performance Indexes**: Indexes on customerId and createdAt for fast queries

### 4. Transaction History Access
- **Customer Endpoint**: GET /api/customer/history returns all customer transactions
- **Merchant Endpoint**: GET /api/merchant/stats includes transaction summaries
- **Admin Endpoint**: GET /api/admin/transactions with filters and pagination
- **Filter Options**: By date range, type, status, amount

### 5. Audit Trail Features
- **Immutable Records**: Transaction and PointsLedger entries never deleted
- **Timestamp Precision**: Microsecond precision for all events
- **IP Tracking**: Request source IP recorded for fraud prevention
- **Admin Actions**: Admin-initiated changes logged with user context

### 6. Export & Reporting
- **CSV Export**: Transaction history downloadable in CSV format
- **Excel Reports**: Formatted spreadsheets for accounting teams
- **API Access**: Programmatic access for custom integrations
- **Scheduled Reports**: Automated daily/weekly transaction summaries

### 7. Historical Data Queries
- **Date Range Filtering**: Query transactions within specific periods
- **Balance Snapshots**: Point balance at any historical moment
- **Trend Analysis**: Transaction volume and patterns over time
- **Merchant Comparison**: Benchmark performance against peers

### 8. Compliance Requirements
- **Retention Policy**: 7-year retention for financial records
- **Regulatory Exports**: Format supports audit requirements
- **Chain of Custody**: Complete trace from source to destination
- **Timestamp Verification**: Cryptographically verifiable timestamps

## Example Questions

1. How do I view my complete transaction history in SkillXT?
2. Kaise dekhe meri puri transaction history?
3. What is the PointsLedger and why is it important?
4. How is my current points balance calculated?
5. Can I export my transaction history for tax purposes?
6. How do I find a specific transaction from last month?
7. What information is stored in each transaction record?
8. How far back does transaction history go?
9. Can I get a monthly statement of my point activities?
10. What happens to transaction records when I refer a friend?
## Related Articles
- Article 52: Customer Points Earning (Earn Points)
- Article 53: Customer Points Redemption (Redeem Points)
- Article 54: Customer Points Transfer
- Article 56: Customer Profile & Preferences Management
- Article 60: Points Balance & History Queries
- Article 75: Points Liability Management
- Article 76: Outstanding Points Liability Reports
- Article 77: Points Expiry Policy Configuration
- Article 88: Points Earning Rules Configuration
- Article 89: Points Redemption Rules Configuration


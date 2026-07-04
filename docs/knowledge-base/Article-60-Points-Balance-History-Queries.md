# Article 60: Points Balance & History Queries

## Article Title
Points Balance & History Queries

## Target User
Customer, Merchant, Super Admin, Developer

## Purpose
To enable comprehensive querying and analysis of points balances and transaction histories for customers, merchants, and administrators.

## Key Topics

### 1. Balance Query API
- **Customer Balance**: GET /api/customer/balance endpoint
- **Admin Balance View**: GET /api/admin/customers/:id includes balance
- **Merchant Stats**: Wallet balance included in merchant statistics
- **Real-time Calculation**: Balance computed dynamically from ledger

### 2. History Query Endpoints
- **Customer History**: GET /api/customer/history with pagination
- **Merchant History**: GET /api/merchant/history for transaction log
- **Admin Transaction Search**: GET /api/admin/transactions with filters
- **Date Range Support**: Filter transactions by start/end dates

### 3. Query Parameters
- **Pagination**: page, limit parameters for large result sets
- **Sorting**: Sort by date, amount, or points (ascending/descending)
- **Type Filters**: Filter by earn, redeem, transfer, or reversal
- **Status Filters**: Filter by completed, pending, or failed

### 4. Balance Calculation Logic
- **Dynamic Sum**: SUM(pointsChange) from PointsLedger where expiresAt > now
- **Expiry Handling**: Expired points automatically excluded from balance
- **Pending Transactions**: Not included in current balance
- **Concurrency Safe**: Locks prevent race conditions during calculation

### 5. Performance Optimization
- **Database Indexes**: Composite indexes on customerId and createdAt
- **Caching Strategy**: Short-term cache for frequently accessed balances
- **Query Limits**: Maximum date range and result set size enforced
- **Batch Queries**: Efficient handling of bulk balance requests

### 6. Query Response Format
- **Standard JSON**: Consistent response across all query endpoints
- **Pagination Metadata**: total, page, limit, hasNext fields
- **Balance Fields**: points, expiryInfo, lastUpdated included
- **Error Handling**: Clear error messages for invalid queries

### 7. Export Functionality
- **CSV Download**: All history endpoints support CSV export
- **Excel Format**: XLSX export for accounting use
- **Date Range Export**: Export specific time periods
- **Scheduled Reports**: Automated daily exports for merchants

### 8. Admin Advanced Queries
- **Cross-customer Search**: Query multiple customers at once
- **Aggregate Views**: Total points issued/redeemed by merchant
- **Audit Trail**: Full transaction history with admin actions
- **Custom Fields**: Additional metadata in admin responses

## Example Questions

1. How do I check my current points balance?
2. Points ka balance kahan se pata kare?
3. Can I see my transaction history from 6 months ago?
4. How do I filter my history to show only redemptions?
5. What is the API endpoint for getting customer balance?
6. How far back does transaction history go?
7. Can I export my transaction history to Excel?
8. How does the system handle expired points in balance?
9. What happens if I query during system maintenance?
10. How do I get a summary of all my earning transactions?
## Related Articles
- Article 52: Customer Points Earning (Earn Points)
- Article 53: Customer Points Redemption (Redeem Points)
- Article 54: Customer Points Transfer
- Article 55: Customer Referral Program
- Article 56: Customer Profile & Preferences Management
- Article 57: Merchant Wallet & Points Management
- Article 58: Points Ledger & Transaction History
- Article 75: Points Liability Management
- Article 78: Points Expiry Notification System
- Article 103: Customer Journey Overview


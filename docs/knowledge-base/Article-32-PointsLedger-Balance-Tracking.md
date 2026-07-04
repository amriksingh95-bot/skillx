# Article 32: PointsLedger & Balance Tracking

## Article Title
PointsLedger & Balance Tracking

## Target User
Customer, Merchant, Super Admin

## Purpose
To explain how points balances are calculated and tracked via the PointsLedger table.

## Key Topics

### 1. Dynamic Balance Calculation
- SUM(pointsChange) where expiresAt > now OR expiresAt IS NULL

### 2. Ledger Fields
- customerId, transactionId, pointsChange, balanceAfter, expiresAt, createdAt

### 3. No Cached Balance
- Balance computed on query, not stored on Customer model

### 4. Transaction Linkage
- Each ledger entry references parent Transaction record

### 5. Expiry Tracking
- Per-transaction expiry dates for granular control

## Example Questions

1. How does pointsledger & balance tracking work?
2. PointsLedger & Balance Tracking kaise configure kare?
3. What are the key features of pointsledger & balance tracking?
4. Admin access required hai kya?
5. Can I customize this feature?
6. What happens if I exceed limits?
7. How is this tracked in reports?
8. What API endpoints are available?
9. Can customers access this?
10. What security measures apply?

## Related Articles

- Article 27: Related Topic
- Article 37: Related Topic

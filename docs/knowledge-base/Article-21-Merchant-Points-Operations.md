# Article 21: Merchant Points Operations

## Article Title
Merchant Points Operations

## Target User
Merchant, Super Admin / Admin

## Purpose
To explain how merchants perform points-related operations including earn, redeem, and transfer.

## Key Topics
- POST /api/merchant/earn issues points to customers
- POST /api/merchant/redeem processes customer redemptions
- POST /api/merchant/transfer-points transfers to customers
- Customer lookup via mobile or QR code
- Atomic transaction processing with locks
- Insufficient balance errors block operations
- Audit logs for all points actions
- Real-time SSE notifications on transfers
- 20% invoice cap on redemptions
- Subscription status validated each transaction

## Example Questions
1. How do I issue points to customers?
2. Merchant se points redeem kaise kare?
3. Can I transfer points to customers?
4. Points operation ke liye subscription chahiye?
5. What if customer has insufficient points?
6. How do I check customer balance?
7. Points operation ka audit trail hai?
8. Can I issue partial points?
9. What validation happens before transfer?
10. How is redemption capped?

## Related Articles
- Article 5: Merchant Role Features & Capabilities
- Article 20: Merchant Wallet Management
- Article 52: Customer Points Earning (Earn Points)
- Article 53: Customer Points Redemption (Redeem Points)
- Article 54: Customer Points Transfer

---

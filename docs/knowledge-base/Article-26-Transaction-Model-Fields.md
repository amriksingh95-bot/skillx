# Article 26: Transaction Model & Fields

## Article Title
Transaction Model & Fields

## Target User
Super Admin / Admin, Merchant

## Purpose
To explain the Transaction database model and all fields used to track points operations.

## Key Topics
- TransactionType enum: earn, redeem, transfer, reversal, adjustment
- TransactionStatus enum: completed, pending, failed, reversed
- customerId: Reference to Customer
- merchantId: Reference to Merchant
- type: Operation type
- invoiceAmount: Invoice value (for redemptions)
- purchaseAmount: Purchase amount (for earn) or gross discount (for redeem)
- platformFee: Calculated fee on redemptions
- netAmount: Amount after fee deduction
- points: Points involved in transaction
- remarks: Human-readable description
- status: Transaction status
- reversedById and reversedAt for reversal tracking

## Example Questions
1. Transaction model ka structure kya hai?
2. Transaction type kya hota hai?
3. What is purchaseAmount field?
4. How is platform fee stored?
5. Transaction reversal kaise track hota hai?
6. Invoice amount kya store karta hai?
7. Points transaction mein kya record hota hai?
8. Transaction status values kya hain?
9. Remarks field kya show karta hai?
10. Net amount kaise calculate hota hai?

## Related Articles
- Article 25: Database Models & Schema
- Article 52: Customer Points Earning (Earn Points)
- Article 53: Customer Points Redemption (Redeem Points)
- Article 54: Customer Points Transfer
- Article 63: Transaction Types Reference

---

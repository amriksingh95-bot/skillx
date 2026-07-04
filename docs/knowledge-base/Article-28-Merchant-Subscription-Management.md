# Article 28: Merchant Subscription Management

## Article Title
Merchant Subscription Management

## Target User
Merchant, Super Admin / Admin

## Purpose
To explain merchant subscription plans, purchase, renewal, and status checking.

## Key Topics
- Three subscription plans: monthly (399), quarterly (999), annual (3499)
- Duration days: 30, 90, 365 respectively
- GRACE_PERIOD_DAYS = 15 after subscription expiry
- SubscriptionStatus enum: active, grace_period, expired, cancelled
- Purchase creates MerchantSubscription record
- 1000 welcome points added on first subscription
- Auto-renew not enabled by default
- Renewal extends from current end date or now
- Payment reference required for purchase/renewal
- Admin can create/verify subscriptions directly

## Example Questions
1. What subscription plans are available?
2. Merchants ke liye subscription kyun chahiye?
3. Monthly plan ka price kya hai?
4. Grace period se kya matlab hai?
5. Subscription kaise renew kare?
6. Welcome bonus points kya milte hain?
7. Auto-renewal available hai?
8. Payment reference kya hai?
9. Can I upgrade my plan?
10. Subscription expiry hone par kya hota hai?

## Related Articles
- Article 5: Merchant Role Features & Capabilities
- Article 23: Merchant Management for Admins
- Article 27: Points Top-Up for Merchants
- Article 86: Subscription Plans Management

---

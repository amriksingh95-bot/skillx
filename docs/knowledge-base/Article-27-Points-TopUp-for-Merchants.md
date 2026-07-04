# Article 27: Points Top-Up for Merchants

## Article Title
Points Top-Up for Merchants

## Target User
Merchant, Super Admin / Admin

## Purpose
To explain how merchants can purchase additional points for their wallet through top-up packages.

## Key Topics
- POST /api/merchant/topup/request creates top-up request
- Package names: starter, growth, pro
- Top-up requires pointsScreenshot upload
- Status: pending, confirmed, rejected
- Admin confirms top-up via PATCH endpoint
- Points added to merchant.pointsBalance after confirmation
- Top-up history available via GET /api/merchant/topup/history
- No automatic payment gateway integration
- Admin review required for confirmation
- PointsTopUp table tracks all requests

## Example Questions
1. How do I add points to my merchant wallet?
2. Point top-up kaise purchase kare?
3. Top-up package options kya hain?
4. Admin approval required hai?
5. Payment proof kya upload kare?
6. Top-up history kahaan check kare?
7. Points automatically add hote hain?
8. Kitne time mein top-up confirmed hota hai?
9. Can I cancel top-up request?
10. Top-up amount customizable hai?

## Related Articles
- Article 5: Merchant Role Features & Capabilities
- Article 20: Merchant Wallet Management
- Article 28: Merchant Subscription Management
- Article 36: Points Top-Up API Reference

---

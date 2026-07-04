# Article 24: Reward Settings Configuration

## Article Title
Reward Settings Configuration

## Target User
Super Admin / Admin

## Purpose
To explain how administrators configure global reward settings for the platform.

## Key Topics
- GET /api/admin/reward-settings retrieves current settings
- PUT /api/admin/reward-settings updates all settings
- pointsPerRupee: Earning rate (default 0.01, 100 Rs = 1 point)
- rupeesPerPoint: Redemption rate (default 0.10, 100 points = 10 Rs)
- minRedeemPoints: Minimum points to redeem (default 100)
- pointsExpiryDays: Points validity period (default 365, max 3650)
- redemptionFeePercent: Platform fee on redemptions (default 5%)
- Validations enforced: min 0.0001 for rates, min 1 for minimum
- Settings affect all new transactions
- No retroactive changes to existing transactions
- Settings history not maintained

## Example Questions
1. How do I configure reward settings?
2. Points earning rate kaise change kare?
3. Redemption fee set kaise kare?
4. Minimum redemption points kya hai?
5. Points expiry days ka limit kya hai?
6. Can I set earning rate to zero?
7. Settings change affects existing transactions?
8. Default earning rate kya hai?
9. Redemption rate kaise calculate hoti hai?
10. Can I change expiry days?

## Related Articles
- Article 6: Super Admin Role & Administrative Functions
- Article 52: Customer Points Earning (Earn Points)
- Article 53: Customer Points Redemption (Redeem Points)
- Article 88: Points Earning Rules Configuration
- Article 89: Points Redemption Rules Configuration

---

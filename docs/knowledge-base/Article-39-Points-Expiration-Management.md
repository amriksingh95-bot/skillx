# Article 39: Points Expiration Management

## Article Title
Points Expiration Management

## Target User
Customer, Merchant, Super Admin / Admin

## Purpose
To explain how points expiration works, how customers can track expiring points, and admin configuration options.

## Key Topics

### 1. Expiration Behavior
- **Default 365 Days**: pointsExpiryDays setting controls validity
- **Per-Transaction Expiry**: Each earning gets individual expiresAt
- **No Batch Jobs**: Expiration checked dynamically at query time
- **Legacy Points**: Null expiry points never expire

### 2. Checking Expirations
- **GET /api/customer/expiring-points**: Points expiring within 30 days
- **Default Lookahead**: 30 days from current date
- **Balance Impact**: Expired points excluded from balance calculation
- **Reminder Notifications**: System can alert before expiry

### 3. Admin Configuration
- **PUT /api/admin/reward-settings**: Update pointsExpiryDays
- **Maximum Value**: 3650 days (10 years)
- **Minimum Value**: 1 day
- **No Retroactive Impact**: Existing points not affected

### 4. Prevention Strategies
- **Regular Redemptions**: Use points before expiry
- **Low Balance Alerts**: Notification when few points left
- **Category Bonuses**: Extra points to encourage activity
- **Extension Policies**: Admin can extend in special cases

## Example Questions

1. How long do my points stay valid?
2. Points expire hone se pehle kya kare?
3. Can I extend point expiry?
4. How do I check expiring points?
5. What happens after points expire?
6. Can admin restore expired points?
7. Points expiry kaise stop kare?
8. How many points will expire?
9. Do all points expire at once?
10. Can I get expiry reminders?

## Related Articles

- Article 12: Customer Points Overview
- Article 30: Points Balance & Expiration
- Article 52: Customer Points Earning (Earn Points)
- Article 53: Customer Points Redemption (Redeem Points)
- Article 77: Points Expiry Policy Configuration
- Article 78: Points Expiry Notification System
- Article 76: Outstanding Points Liability Reports
- Article 75: Points Liability Management
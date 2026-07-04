# Article 16: Account Status & Verification

## Article Title
Account Status & Verification

## Target User
Customer, Merchant, Super Admin / Admin

## Purpose
To explain the account status lifecycle and verification requirements for users.

## Key Topics
- User and Customer/Merchant isActive boolean field
- Users must have isActive=true to login
- Customers with inactive accounts rejected on earn/redeem
- Merchants with inactive accounts blocked
- Admin can toggle customer isActive via PATCH endpoint
- Status changes trigger refresh token revocation
- Merchant status includes pending/approved/active/suspended/rejected
- Merchant subscription status separate from account status
- Audit logs created for all status changes

## Example Questions
1. What is account status in SkillXT?
2. Inactive account se login possible hai?
3. Admin can account deactivate kare?
4. Merchant status kya hota hai?
5. How do I reactivate my account?
6. What happens after deactivation?
7. Is email verification required?
8. Can I reactivate deactivated account?
9. How is merchant approval done?
10. What causes account suspension?

## Related Articles
- Article 3: User Roles & Permissions in SkillXT
- Article 9: OTP Verification System
- Article 17: Merchant Account Status Management
- Article 23: Merchant Management for Admins

---

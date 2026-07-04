# Article 14: Password Management & Reset

## Article Title
Password Management & Reset

## Target User
Customer, Merchant, Super Admin / Admin

## Purpose
To explain password management, change, and reset functionality for user accounts.

## Key Topics
- PUT /api/customer/profile/password requires old password verification
- Minimum 6 characters password length
- All refresh tokens revoked on password change
- POST /api/auth/request-reset for reset OTP
- POST /api/auth/reset-password for actual reset
- Generic message to prevent account enumeration
- Password hashed with bcrypt before storage
- Admin can reset any customer password
- Admin reset also revokes all user tokens
- CUSTOMER_PASSWORD_RESET audit log entry

## Example Questions
1. How do I change my password?
2. Password reset kaise kare?
3. What is the password requirement?
4. Will I be logged out after password change?
5. Can admin reset my password?
6. Password reset ke liye OTP kyun?
7. How is password stored securely?
8. Can I reset without mobile access?
9. How many reset attempts allowed?
10. What happens to my sessions after reset?

## Related Articles
- Article 8: Customer Login Authentication
- Article 9: OTP Verification System
- Article 13: Customer Mobile Number Update
- Article 15: Platform Security & Data Protection

---

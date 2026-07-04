# Article 13: Customer Mobile Number Update

## Article Title
Customer Mobile Number Update

## Target User
Customer, Merchant, Super Admin / Admin

## Purpose
To explain the secure process for customers to update their registered mobile number.

## Key Topics
- Two-step OTP process for mobile change
- POST /api/customer/profile/mobile/request-otp sends to current email
- PUT /api/customer/profile/mobile verifies OTP and updates
- New mobile checked against existing users
- All refresh tokens invalidated after update
- Email required on file before mobile change
- OTP record deleted after successful verification
- Same Prisma $transaction pattern for data consistency

## Example Questions
1. How do I change my mobile number?
2. New mobile number update ke liye OTP kyun chahiye?
3. Can I change mobile without email?
4. What if my new number exists already?
5. Will I be logged out after mobile change?
6. Mobile change kaise verify kare?
7. OTP kahan receive hoga?
8. How many attempts for mobile update?
9. Can admin change my mobile?
10. Will mobile change affect transactions?

## Related Articles
- Article 8: Customer Login Authentication
- Article 9: OTP Verification System
- Article 11: Customer Profile Management
- Article 14: Password Management & Reset

---

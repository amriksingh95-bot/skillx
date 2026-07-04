# Article 9: OTP Verification System

## Article Title
OTP Verification System

## Target User
Customer, Merchant, Super Admin / Admin

## Purpose
To explain the OTP-based verification system used for registration, login, and profile updates.

## Key Topics
- OTP required for customer registration
- OTP for password reset requests
- OTP for mobile number changes
- Unique constraint on mobile+purpose combination
- OTP records deleted immediately after successful verification
- Development mode returns OTP in response for testing
- Production mode sends OTP via email only
- No SMS gateway integration in current implementation
- OTP expiration handled via expiresAt field

## Example Questions
1. How does OTP verification work?
2. OTP verify karne ke liye kya mangta hai?
3. Can I request OTP without email?
4. What happens after OTP is verified?
5. Is OTP valid for all time?
6. Can I use SMS instead of email?
7. How many times can I request OTP?
8. What if my OTP expires?
9. Is OTP required for every login?
10. How is OTP implemented for security?

## Related Articles
- Article 7: Customer Registration Process
- Article 8: Customer Login Authentication
- Article 14: Password Management & Reset
- Article 16: Account Status & Verification

---

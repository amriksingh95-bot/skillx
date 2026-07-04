# Article 8: Customer Login & Authentication

## Article Title
Customer Login Authentication

## Target User
Customer, Merchant, Super Admin / Admin

## Purpose
To explain how customers authenticate and maintain sessions on the SkillXT platform.

## Key Topics
- POST /api/auth/login endpoint accepts mobile or email
- JWT access token (15 minutes expiry)
- JWT refresh token (7 days expiry)
- Password verification using bcrypt comparison
- User must be active (isActive=true) to login
- Failed login attempts logged to audit trail
- Refresh token rotation on each use
- Token reuse detection for security
- All refresh tokens invalidated on password change

## Example Questions
1. How do I login as a customer?
2. Login mein mobile aur email dono kaise use kare?
3. What is JWT token expiry time?
4. Can I stay logged in for weeks?
5. What happens after 15 minutes of inactivity?
6. How are failed logins tracked?
7. What is token reuse detection?
8. Do I need to re-login after password change?
9. Can I use refresh tokens on multiple devices?
10. How secure is the login process?

## Related Articles
- Article 4: Customer Role Features & Capabilities
- Article 7: Customer Registration Process
- Article 14: Password Management & Reset
- Article 15: Platform Security & Data Protection

---

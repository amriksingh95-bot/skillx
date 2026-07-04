# Article 19: Merchant Login & Authentication

## Article Title
Merchant Login Authentication

## Target User
Merchant, Super Admin / Admin

## Purpose
To explain how merchants authenticate and access their dashboard on the SkillXT platform.

## Key Topics
- POST /api/auth/login works for merchants
- JWT access and refresh tokens generated
- Same token format as customer login
- Merchant auto-login after admin creation
- Merchant auto-login for self-registration with active status
- isActive check before login allowed
- Merchant must be active AND approved for full access
- Profile endpoint accessible before active status
- requireActiveMerchant middleware for sensitive endpoints
- Login audit trail for merchants

## Example Questions
1. How do merchants login to SkillXT?
2. Merchant login mein kya credentials chahiye?
3. Can I login after registration?
4. What if my account is not approved?
5. How long does merchant login last?
6. Can I use refresh tokens?
7. Is login secure for merchants?
8. What happens on failed login?
9. Can admin reset my password?
10. How many login attempts allowed?

## Related Articles
- Article 5: Merchant Role Features & Capabilities
- Article 8: Customer Login Authentication
- Article 15: Platform Security & Data Protection
- Article 18: Merchant Registration Process

---

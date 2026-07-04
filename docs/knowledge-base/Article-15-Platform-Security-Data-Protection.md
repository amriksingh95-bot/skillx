# Article 15: Platform Security & Data Protection

## Article Title
Platform Security & Data Protection

## Target User
Customer, Merchant, Super Admin / Admin

## Purpose
To outline the security measures implemented in the SkillXT platform to protect user data.

## Key Topics
- Passwords hashed with bcrypt before storage
- JWT secret required for server startup
- Refresh token hashed lookup with reuse detection
- All user tokens revoked on suspicious reuse
- Role-based middleware authorization
- Input validation via express-validator
- Rate limiting on auth endpoints
- Audit logging for all critical actions
- No sensitive data in error responses
- Account status (isActive) checked on login

## Example Questions
1. How secure is SkillXT platform?
2. Password kaise store kiya jata hai?
3. What is JWT security?
4. How are unauthorized access prevented?
5. Can tokens be reused?
6. Is my data encrypted?
7. How are passwords validated?
8. What happens on suspicious login?
9. Are audit logs maintained?
10. How secure are my transactions?

## Related Articles
- Article 2: SkillXT Platform Architecture & Technology Stack
- Article 8: Customer Login Authentication
- Article 14: Password Management & Reset
- Article 6: Super Admin Role & Administrative Functions

---

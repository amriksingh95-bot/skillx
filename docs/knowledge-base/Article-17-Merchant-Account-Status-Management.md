# Article 17: Merchant Account Status Management

## Article Title
Merchant Account Status Management

## Target User
Merchant, Super Admin / Admin

## Purpose
To explain merchant account status lifecycle including approval, suspension, and deactivation.

## Key Topics
- MerchantStatus enum: pending, approved, payment_pending, active, suspended, deactivated, rejected
- Default status is pending on self-registration
- Admin approval required to move to payment_pending
- Payment screenshot upload moves to payment_pending
- Admin confirms payment to set active status
- Suspend action sets isActive=false temporarily
- Deactivate action sets isActive=false permanently
- Deactivated merchants cannot be reactivated
- Admin actions logged via audit trail
- Status changes trigger token revocation

## Example Questions
1. How does merchant account status work?
2. Merchant approval ke liye kya chahiye?
3. Can I reactivate after deactivation?
4. What is grace period for merchants?
5. How do I upload payment proof?
6. Merchant reject hone ka reason kya?
7. Can admin suspend my account?
8. Active status se kaunsa feature milta hai?
9. How long approval takes?
10. What happens after payment confirmation?

## Related Articles
- Article 5: Merchant Role Features & Capabilities
- Article 6: Super Admin Role & Administrative Functions
- Article 18: Merchant Registration Process
- Article 28: Merchant Subscription Management

---

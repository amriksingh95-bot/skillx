# Article 34: Subscription Payment Processing

## Article Title
Subscription Payment Processing

## Target User
Merchant, Super Admin / Admin

## Purpose
To explain how merchants process subscription payments, upload proofs, and get verified on the SkillXT platform.

## Key Topics

### 1. Payment Methods
- **Manual Payment**: Bank transfer or UPI
- **Payment Proof Upload**: Screenshot required for verification
- **Supported Formats**: JPEG, PNG, PDF
- **No Auto-Integration**: No automated payment gateway

### 2. Payment Submission
- **POST /api/merchant/payment-request**: Upload payment proof
- **Screenshot Required**: Payment proof mandatory for verification
- **Status**: pending -> confirmed after admin review
- **Notification**: Admin notified of new payment

### 3. Admin Payment Verification
- **PATCH /api/admin/merchants/:id/confirm-payment**: Verify payment
- **Proof Review**: Admin checks uploaded screenshot
- **Balance Update**: Merchant pointsBalance updated on confirmation
- **Subscription Creation**: MerchantSubscription record created

### 4. Welcome Bonus
- **1000 Points**: Added on first subscription payment
- **One-time Only**: Welcome bonus on initial activation
- **Balance Update**: Immediate after payment confirmation
- **Ledger Entry**: Recorded as bonus transaction

## Example Questions

1. How do I pay for my merchant subscription?
2. Payment proof kya upload kare?
3. Admin approval kitna time lagata hai?
4. Welcome bonus points kab milte hain?
5. Payment methods kya hain?
6. Screenshot upload kaise kare?
7. Payment reject hone par kya kare?
8. Can I renew subscription manually?
9. Payment proof format kya hai?
10. How do I check payment status?

## Related Articles

- Article 5: Merchant Role Features & Capabilities
- Article 17: Merchant Account Status Management
- Article 18: Merchant Registration Process
- Article 28: Merchant Subscription Management
- Article 64: Subscription Plan Management & Configuration
- Article 65: Merchant Subscription Renewal & Auto-Renew
- Article 63: Merchant Subscription Lifecycle & Grace Period
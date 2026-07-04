# Article 29: Complaint & Feedback System

## Article Title
Complaint & Feedback System

## Target User
Customer, Merchant, Super Admin / Admin

## Purpose
To explain how users can submit complaints and feedback through the platform.

## Key Topics
- POST /api/customer/complaint for customer complaints
- POST /api/merchant/complaint for merchant complaints
- Required fields: type, description
- UserRole stored for origin tracking
- Status defaults to "Pending"
- Admin can update status: Pending, In Progress, Resolved
- Complaint visible in admin dashboard
- No customer-visible status updates
- No file attachments supported
- Complaint stored with userId reference

## Example Questions
1. How do I submit a complaint?
2. Complaint submit karne ke baad kya hota hai?
3. Merchant bhi complaint submit kare?
4. Complaint status kaise check kare?
5. Kya complaint ka reply milta hai?
6. Complaint file attach kar sakte hain?
7. Admin complaint kaise manage karta hai?
8. Complaint types kya hote hain?
9. Complaint resolve hone mein time lagta hai?
10. Can I edit my complaint after submission?

## Related Articles
- Article 4: Customer Role Features & Capabilities
- Article 5: Merchant Role Features & Capabilities
- Article 23: Merchant Management for Admins
- Article 72: Complaint Resolution Process

---

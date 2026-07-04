# Article 33: Complaint Management System

## Article Title
Complaint Management System

## Target User
Customer, Merchant, Super Admin / Admin

## Purpose
To explain how complaints and feedback are submitted, tracked, and resolved on the SkillXT platform.

## Key Topics

### 1. Complaint Submission
- **Customer Endpoint**: POST /api/customer/complaint
- **Merchant Endpoint**: POST /api/merchant/complaint
- **Required Fields**: type, description
- **Validation**: Type must be specified, description non-empty
- **UserRole Recorded**: Origin tracking for admin workflow

### 2. Complaint Storage
- **Complaint Model**: Stores userId, userRole, type, description, status
- **Default Status**: "Pending" on creation
- **No File Attachments**: Attachments not supported
- **Status Updates**: Admin-only via PATCH endpoint

### 3. Admin Complaint Handling
- **List View**: Complaints visible in admin dashboard
- **Status Updates**: PATCH /api/admin/complaints/:id
- **Status Options**: Pending, In Progress, Resolved
- **No Customer Visibility**: Status changes not visible to customer

### 4. Complaint Types
- **Technical Issues**: Platform bugs or errors
- **Account Problems**: Login or profile issues
- **Points Disputes**: Earning or redemption errors
- **Merchant Issues**: Business-related concerns
- **General Feedback**: Suggestions or praise

## Example Questions

1. How do I submit a complaint on SkillXT?
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
- Article 6: Super Admin Role & Administrative Functions
- Article 23: Merchant Management for Admins
- Article 72: Customer Churn Prediction & Prevention
- Article 71: Merchant Churn Prediction & Prevention
- Article 109: Customer Retention Journey
- Article 97: Dispute Resolution Policies
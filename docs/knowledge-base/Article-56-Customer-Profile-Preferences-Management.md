# Article 56: Customer Profile & Preferences Management

## Article Title
Customer Profile & Preferences Management

## Target User
Customer, Merchant, Super Admin

## Purpose
To explain how customers manage their profile information, contact details, notification preferences, and personalization settings on SkillXT, including self-service updates, admin overrides, validation rules, and the storage model for preferences.

## Key Topics

### 1. Customer Profile Data Model
- **Dual-Table Storage**: Profile data is split across the `User` table (mobile, email, password, role, isActive) and the `Customer` table (name, qrCode, personal details, preferences, and referral info).
- **Core Fields**: id, userId, name, email, qrCode, isActive, createdAt, updatedAt.
- **Personal Fields**: dateOfBirth, gender, city, pinCode, area, occupation, maritalStatus, anniversaryDate, numberOfChildren.
- **Preference Fields**: preferredLanguage, communicationPref, favouriteCategories, dietaryPreference, notificationOptIn, profilePhoto.
- **Referral Fields**: referralCode, referredBy, signedUpViaMerchantId, referralPointsEarned.
- **No Cached Balance**: Points balance is computed dynamically from PointsLedger; no balance column exists on Customer.

### 2. Profile Retrieval Endpoints
- **Customer GET /api/customer/profile**: Returns full Customer record plus computed balance, global rewardSettings (pointsPerRupee, rupeesPerPoint, minRedeemPoints, pointsExpiryDays), and referral stats (referralCode, referredByName, referredCount, referredPoints, balance, expiredPoints, expiringWithin30Days).
- **Admin GET /api/admin/customers/:id**: Returns full Customer record under a `profile` object, plus computed balance, lifetime earned/redeemed, and enrichment insights (favourite merchant, favourite category, last visit as relative string, birthday/anniversary countdown, avg visit frequency, avg spend per visit, visitCount).
- **Additional Customer Endpoints**: GET /api/customer/balance, GET /api/customer/expiring-points, GET /api/customer/qr, GET /api/customer/referral-stats.

### 3. Customer Self-Service Profile Update
- **Endpoint**: PUT /api/customer/profile (authenticated, requires customer role).
- **Updatable Fields**: name, email, dateOfBirth, gender, city, pinCode, area, occupation, maritalStatus, anniversaryDate, numberOfChildren, preferredLanguage, communicationPref, favouriteCategories, dietaryPreference, notificationOptIn, profilePhoto.
- **Required Fields**: `name` is required by API validator for customer self-service updates.
- **Defaults Applied**: preferredLanguage falls back to "English", communicationPref falls back to "email", numberOfChildren defaults to 0, notificationOptIn defaults to true, dietaryPreference and profilePhoto default to null if omitted.
- **Atomic Update**: Wrapped in Prisma $transaction updating both User (email) and Customer records simultaneously.
- **Mobile Excluded**: Mobile number cannot be changed through this endpoint; it requires the dedicated OTP-verified mobile endpoint.
- **Audit Trail**: Customer self-service profile updates do not create explicit AuditLog entries in the current implementation.

### 4. Personal Information Validation Rules
- **name**: Required. Trimmed, non-empty string.
- **email**: Validated as standard email format. Duplicate check enforced at update time — cannot link to an email already associated with another User account.
- **dateOfBirth**: ISO 8601 date format. Stored as null if blank.
- **gender**: Allowed values: Male, Female, Other, Prefer not to say.
- **city**: Optional free-text string.
- **pinCode**: Exactly 6 numeric characters.
- **area**: Optional free-text string.
- **occupation**: Optional free-text string.
- **maritalStatus**: Allowed values: Single, Married, Other.
- **anniversaryDate**: ISO 8601 date format. Stored as null if blank.
- **numberOfChildren**: Non-negative integer (min 0).

### 5. Preference Settings
- **preferredLanguage**: Default "English". Allowed values (application-layer validation): English, Hindi, Punjabi, Other. Stored as String on Customer model.
- **communicationPref**: Default "email". Allowed values (application-layer validation): email, whatsapp, sms, all. Stored as String on Customer model. The Prisma schema does not enforce this as an enum; validation exists only in route validators.
- **favouriteCategories**: Stored as a JSON-serialized String. API accepts an array input and JSON.stringify()s it before persisting. If not provided, stored as null.
- **dietaryPreference**: Allowed values (application-layer validation): Vegetarian, Non-Vegetarian, Vegan, No preference. Stored as null if not provided.
- **profilePhoto**: Stored as a file path string. Validated as a non-empty string when provided.

### 6. Notification Preferences & Real-Time Updates
- **notificationOptIn**: Boolean, default true. General opt-in flag for notifications.
- **SSE Token**: GET /api/customer/sse-token generates a short-lived JWT (5-minute expiry) used to authenticate the SSE notification stream connection.
- **Notification Stream**: GET /api/customer/notifications/stream establishes a server-sent events (SSE) connection. The `notificationService` maintains an in-memory Map of customerId → active SSE response objects. A keep-alive heartbeat (comment line) is sent every 20 seconds.
- **Scope**: The current notification service handles only server-sent events for real-time in-app notifications. Email, SMS, and WhatsApp delivery logic based on `communicationPref` or `notificationOptIn` is not implemented in this service.

### 7. Mobile Number Update via OTP
- **Endpoint**: PUT /api/customer/profile/mobile (customer role required).
- **Two-Step Flow**:
  1. POST /api/customer/profile/mobile/request-otp sends an OTP to the customer's current registered email address. Returns 400 with "No email address on file" if email is missing.
  2. PUT /api/customer/profile/mobile verifies the OTP and updates both `User.mobile` and the associated mobile references.
- **Duplicate Prevention**: The new mobile is checked for uniqueness across all User records before the update transaction commits.
- **Token Invalidation**: The main profile PUT endpoint and the mobile PUT endpoint are separate; mobile cannot be updated through the general profile update.

### 8. Password & Email Management
- **Password Change**: PUT /api/customer/profile/password requires the current password and a new password of minimum 6 characters. On success, all existing refresh tokens for the user are deleted, forcing re-authentication on every device.
- **Email Update**: PUT /api/customer/profile/email validates standard email format and checks for duplicate emails across other User accounts before updating both User.email and Customer.email.
- **Admin Password Reset**: POST /api/admin/customers/:id/reset-password allows admin or super_admin to set a new password for any customer. On success, all refresh tokens for that customer are invalidated and an AuditLog entry (CUSTOMER_PASSWORD_RESET) is created.

### 9. Admin Customer Profile Management
- **View Detail**: GET /api/admin/customers/:id returns the full customer profile plus admin-only enrichment analytics computed via SQL aggregates: lifetimeValue, avgVisitFrequency, avgSpendPerVisit, favouriteMerchant, favouriteCategory, lastVisit (relative string: Today/Yesterday/X days ago), birthday countdown, anniversary countdown, totalEarned, totalRedeemed, visitCount.
- **Edit Profile**: PUT /api/admin/customers/:id allows updating all Customer and User fields, including mobile, email, name, and all preference fields. Enforces uniqueness checks for both mobile and email against other accounts.
- **Audit Trail**: Admin profile edits create an AuditLog entry with action CUSTOMER_UPDATED.
- **Toggle Active State**: PATCH /api/admin/customers/:id/toggle switches isActive on both Customer and User records and bulk-revokes all active refresh tokens for the user.

### 10. QR Code & Referral Information Display
- **QR Code Endpoint**: GET /api/customer/qr returns the customer's qrCode string (format: SKILLXT-{customerId}) and a generated QR data URL.
- **Referral Code**: Displayed on the customer profile (customer.referralCode). For self-registered customers, generated at registration as SKXT{4-letters}{4-digits}. For admin-created customers, generated as SKILLXT-{uuid}.
- **Referral Stats on Profile**: referredByName (looked up from referredBy), referredCount (total customers with this customer's id in their referredBy field), referredPoints (sum of points from the customer's own transactions where remarks contain "Referral").

### 11. Complaint Submission
- **Endpoint**: POST /api/customer/complaint (customer role required).
- **Required Fields**: type, description.
- **Storage**: Creates a Complaint record with userId, userRole="customer", userName, and default status "Pending".

### 12. Merchant Role Scope
- **No Direct Profile Management**: Merchants do not have dedicated endpoints to view or edit customer profiles in the current implementation.
- **Indirect Access**: Merchants can access customer milestone progress via GET /api/customer/milestone-progress with a customerId query parameter (shared with customer and super_admin roles).
- **Contrast with Admin/Super Admin**: Full customer profile view, edit, password reset, and active-state toggle are restricted to admin and super_admin roles via /api/admin/customers/:id.

## Example Questions

1. How do I update my SkillXT profile?
2. Apne profile me kaise changes kare?
3. How do I change my email address?
4. Can I update my mobile number?
5. What personal details can I edit?
6. How do I change my notification preferences?
7. My mobile number se OTP kaise receive karu?
8. How do I reset my SkillXT password?
9. Can I add my favourite food categories?
10. How do I set my preferred language?
11. Admin mera profile kaise edit kar sakta hai?
12. Can an admin change my mobile number?
13. How do I share my referral code from my profile?
14. Where can I see my points balance and expiry?
15. How do I update my dietary preferences?
16. Can I opt out of notifications?
17. How do I submit a complaint or feedback?
18. What is my QR code used for?
19. How do I check who referred me?
20. Can a merchant update my profile details?

## Related Articles
- Article 52: Customer Points Earning (Earn Points)
- Article 53: Customer Points Redemption (Redeem Points)
- Article 54: Customer Points Transfer
- Article 55: Customer Referral Program
- Article 60: Points Balance & History Queries
- Article 88: Points Earning Rules Configuration
- Article 89: Points Redemption Rules Configuration
- Article 90: Points Transfer Rules & Limits
- Article 91: Transaction Validation Rules
- Article 103: Customer Journey Overview

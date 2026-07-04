# Subscription & Fee Architecture

## Overview
This document outlines the merchant subscription model and redemption fee system for the SkillXT Reward Program.

## Business Requirements
1. **Merchant Subscription**: ₹399/month subscription fee for merchants
2. **Grace Period**: 15-day grace period after subscription expiry before suspension
3. **Redemption Fee**: 5% platform fee on all point redemptions, shared equally

## Data Models

### SubscriptionPlan
Defines available subscription tiers.

```prisma
model SubscriptionPlan {
  id            String   @id @default(uuid())
  name          String   @unique // "monthly", "quarterly", "annual"
  displayName   String   // "Monthly Plan"
  price         Decimal  @db.Decimal(10,2)
  durationDays  Int      // 30, 90, 365
  features      Json?    // ["Basic support", "500 transactions/month"]
  isActive      Boolean  @default(true)
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt
  
  subscriptions MerchantSubscription[]
}
```

### MerchantSubscription
Tracks each merchant's subscription status.

```prisma
model MerchantSubscription {
  id              String             @id @default(uuid())
  merchantId      String
  merchant        Merchant           @relation(fields: [merchantId], references: [id])
  planId          String
  plan            SubscriptionPlan   @relation(fields: [planId], references: [id])
  startDate       DateTime
  endDate         DateTime
  status          SubscriptionStatus @default(active)
  gracePeriodEnd  DateTime?          // endDate + 15 days
  autoRenew       Boolean            @default(false)
  paymentRef      String?            // Reference to payment transaction
  createdAt       DateTime           @default(now())
  updatedAt       DateTime           @updatedAt
  
  @@index([merchantId])
  @@index([status])
  @@index([endDate])
}
```

### SubscriptionStatus Enum
```prisma
enum SubscriptionStatus {
  active        // Subscription is valid
  grace_period  // Expired but within 15-day grace period
  expired       // Past grace period, merchant suspended
  cancelled     // Merchant cancelled subscription
}
```

### RewardSettings Updates
Add redemption fee configuration:

```prisma
model RewardSettings {
  // ... existing fields
  redemptionFeePercent Decimal @db.Decimal(5,2) @default(5.00)
}
```

### Transaction Updates
Add fee tracking:

```prisma
model Transaction {
  // ... existing fields
  platformFee   Decimal?  @db.Decimal(10,2)  // Fee collected by platform
  netAmount     Decimal?  @db.Decimal(10,2)  // After fee deduction
}
```

## Subscription States & Logic

### State Transitions
```
active → grace_period (when endDate passes)
grace_period → expired (when gracePeriodEnd passes)
expired → active (when merchant renews)
cancelled → active (when merchant subscribes again)
```

### Grace Period Logic
- Duration: 15 days after subscription endDate
- During grace period: Merchant can still operate but sees warning
- After grace period: Merchant account suspended (status = 'suspended')

### Subscription Check Middleware
Applied to merchant routes:
```javascript
// Pseudo-code
async function checkSubscription(req, res, next) {
  const subscription = await getMerchantSubscription(req.user.merchantId);
  
  if (!subscription) {
    // No subscription ever - allow basic operations
    return next();
  }
  
  if (subscription.status === 'active') {
    return next();
  }
  
  if (subscription.status === 'grace_period') {
    // Allow but add warning header
    res.setHeader('X-Subscription-Warning', 'grace_period');
    return next();
  }
  
  if (subscription.status === 'expired') {
    return res.status(403).json({
      success: false,
      message: 'Subscription expired. Please renew to continue.',
      code: 'SUBSCRIPTION_EXPIRED'
    });
  }
}
```

## Redemption Fee Logic

### Fee Calculation
```
Fee = pointsToRedeem × rupeesPerPoint × (redemptionFeePercent / 100)
Net Discount = (pointsToRedeem × rupeesPerPoint) - Fee
```

### Example
- Customer redeems 1000 points
- rupeesPerPoint = 0.10 (100 pts = ₹10)
- redemptionFeePercent = 5%
- Gross Discount: 1000 × 0.10 = ₹100
- Platform Fee: ₹100 × 5% = ₹5
- Net Discount to Customer: ₹95

### Fee Distribution
The 5% fee is "shared equally" - interpretation:
- Platform keeps the full 5% fee
- Merchant receives the net discount amount (₹95 in example)
- This is tracked in the Transaction record

### Updated processRedeem Flow
```javascript
async function processRedeem(customerId, merchantId, pointsToRedeem) {
  return prisma.$transaction(async (tx) => {
    // ... existing validation ...
    
    // Calculate fee
    const settings = await tx.rewardSettings.findFirst();
    const grossDiscount = pointsToRedeem * parseFloat(settings.rupeesPerPoint);
    const feePercent = parseFloat(settings.redemptionFeePercent) || 5;
    const platformFee = grossDiscount * (feePercent / 100);
    const netAmount = grossDiscount - platformFee;
    
    // Create transaction with fee tracking
    const transaction = await tx.transaction.create({
      data: {
        customerId,
        merchantId,
        type: 'redeem',
        points: pointsToRedeem,
        purchaseAmount: grossDiscount,  // Original discount value
        platformFee,
        netAmount,  // What customer actually gets
        remarks: `Redeemed ${pointsToRedeem} points for ₹${netAmount} discount (₹${platformFee} platform fee)`,
        status: 'completed'
      }
    });
    
    // ... rest of logic ...
  });
}
```

## API Endpoints

### Admin Endpoints
```
GET    /api/admin/subscription-plans          - List all plans
POST   /api/admin/subscription-plans          - Create new plan
PUT    /api/admin/subscription-plans/:id      - Update plan
DELETE /api/admin/subscription-plans/:id      - Deactivate plan

GET    /api/admin/merchant-subscriptions      - List all subscriptions
GET    /api/admin/merchant-subscriptions/:id  - Get subscription detail
POST   /api/admin/merchant-subscriptions      - Create subscription for merchant
PATCH  /api/admin/merchant-subscriptions/:id/renew  - Renew subscription
```

### Merchant Endpoints
```
GET    /api/merchant/subscription             - Get own subscription status
POST   /api/merchant/subscription/purchase    - Purchase subscription (initiate)
```

### Admin RewardSettings
```
PUT    /api/admin/reward-settings             - Now includes redemptionFeePercent
```

## Frontend Pages

### Admin Pages
1. **AdminSubscriptionPlans.jsx** - CRUD for subscription plans
2. **AdminMerchantSubscriptions.jsx** - View/manage merchant subscriptions
3. **AdminRewardSettings.jsx** - Updated with redemption fee input

### Merchant Pages
1. **MerchantDashboard.jsx** - Show subscription status badge
2. **MerchantSubscription.jsx** - New page for subscription management

## Migration Strategy

1. Add new tables (SubscriptionPlan, MerchantSubscription)
2. Add new columns to existing tables (RewardSettings.redemptionFeePercent, Transaction.platformFee, Transaction.netAmount)
3. Seed default subscription plans
4. Existing merchants get no subscription initially (allow basic operations)
5. New merchants must subscribe after grace period

## Testing Strategy

1. Unit tests for subscription service
2. Unit tests for fee calculation
3. Integration tests for subscription status checks
4. E2E tests for subscription purchase flow

## Implementation Order

1. Schema & Migration
2. Backend Services
3. Backend Routes & Controllers
4. Frontend Admin Pages
5. Frontend Merchant Pages
6. Tests
7. Seed Data

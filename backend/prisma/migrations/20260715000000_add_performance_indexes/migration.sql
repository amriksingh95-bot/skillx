-- CreateIndex (idempotent — these indexes may already exist from earlier migrations or schema @@index definitions)
CREATE INDEX IF NOT EXISTS "Customer_isActive_idx" ON "Customer"("isActive");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Customer_referredBy_idx" ON "Customer"("referredBy");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Customer_createdAt_idx" ON "Customer"("createdAt");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Customer_notificationOptIn_idx" ON "Customer"("notificationOptIn");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Merchant_isActive_idx" ON "Merchant"("isActive");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Merchant_status_idx" ON "Merchant"("status");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Merchant_isActive_status_idx" ON "Merchant"("isActive", "status");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Transaction_customerId_status_idx" ON "Transaction"("customerId", "status");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Transaction_merchantId_status_createdAt_idx" ON "Transaction"("merchantId", "status", "createdAt");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "PointsLedger_customerId_createdAt_idx" ON "PointsLedger"("customerId", "createdAt");

-- CreateIndex (was duplicate — PointsLedger_expiresAt_idx already created in add_point_expiry migration)
CREATE INDEX IF NOT EXISTS "PointsLedger_expiresAt_idx" ON "PointsLedger"("expiresAt");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "MerchantSubscription_merchantId_status_idx" ON "MerchantSubscription"("merchantId", "status");

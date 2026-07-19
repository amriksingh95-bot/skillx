-- CreateIndex: Add createdAt index to Merchant for efficient ORDER BY createdAt DESC
CREATE INDEX IF NOT EXISTS "Merchant_createdAt_idx" ON "Merchant"("createdAt");

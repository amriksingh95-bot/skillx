-- AlterTable: Add pointsExpiryDays to RewardSettings
ALTER TABLE "RewardSettings" ADD COLUMN "pointsExpiryDays" INTEGER NOT NULL DEFAULT 365;

-- AlterTable: Add expiresAt to PointsLedger
ALTER TABLE "PointsLedger" ADD COLUMN "expiresAt" TIMESTAMP(3);

-- CreateIndex: Add index on expiresAt for efficient expiry queries
CREATE INDEX "PointsLedger_expiresAt_idx" ON "PointsLedger"("expiresAt");

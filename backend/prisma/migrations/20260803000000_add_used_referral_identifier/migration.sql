-- CreateTable
CREATE TABLE "UsedReferralIdentifier" (
    "id" TEXT NOT NULL,
    "mobileHash" TEXT NOT NULL,
    "emailHash" TEXT,
    "usedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UsedReferralIdentifier_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "UsedReferralIdentifier_mobileHash_idx" ON "UsedReferralIdentifier"("mobileHash");

-- CreateIndex
CREATE INDEX "UsedReferralIdentifier_emailHash_idx" ON "UsedReferralIdentifier"("emailHash");

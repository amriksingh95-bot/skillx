-- AlterTable: Add referral fields to Merchant
ALTER TABLE "Merchant" ADD COLUMN "referredByMerchantId" TEXT,
ADD COLUMN "merchantReferralCode" TEXT;

-- CreateIndex: Unique index on merchantReferralCode
CREATE UNIQUE INDEX "Merchant_merchantReferralCode_key" ON "Merchant"("merchantReferralCode");

-- CreateIndex: Index on referredByMerchantId
CREATE INDEX "Merchant_referredByMerchantId_idx" ON "Merchant"("referredByMerchantId");

-- CreateIndex: Index on merchantReferralCode
CREATE INDEX "Merchant_merchantReferralCode_idx" ON "Merchant"("merchantReferralCode");

-- CreateTable: MerchantReferral
CREATE TABLE "MerchantReferral" (
    "id" TEXT NOT NULL,
    "referrerMerchantId" TEXT NOT NULL,
    "referredMerchantId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "holdUntilDate" TIMESTAMP(3) NOT NULL,
    "instantRewardPaid" BOOLEAN NOT NULL DEFAULT false,
    "monthsTrickled" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MerchantReferral_pkey" PRIMARY KEY ("id")
);

-- CreateIndex: Indexes on MerchantReferral
CREATE INDEX "MerchantReferral_referrerMerchantId_idx" ON "MerchantReferral"("referrerMerchantId");
CREATE INDEX "MerchantReferral_referredMerchantId_idx" ON "MerchantReferral"("referredMerchantId");
CREATE INDEX "MerchantReferral_status_idx" ON "MerchantReferral"("status");
CREATE INDEX "MerchantReferral_referrerMerchantId_status_idx" ON "MerchantReferral"("referrerMerchantId", "status");

-- AddForeignKey: MerchantReferral -> Merchant (referrer)
ALTER TABLE "MerchantReferral" ADD CONSTRAINT "MerchantReferral_referrerMerchantId_fkey"
  FOREIGN KEY ("referrerMerchantId") REFERENCES "Merchant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey: MerchantReferral -> Merchant (referred)
ALTER TABLE "MerchantReferral" ADD CONSTRAINT "MerchantReferral_referredMerchantId_fkey"
  FOREIGN KEY ("referredMerchantId") REFERENCES "Merchant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- CreateTable: MerchantNotification
CREATE TABLE "MerchantNotification" (
    "id" TEXT NOT NULL,
    "merchantId" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'referral',
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MerchantNotification_pkey" PRIMARY KEY ("id")
);

-- CreateIndex: Indexes on MerchantNotification
CREATE INDEX "MerchantNotification_merchantId_idx" ON "MerchantNotification"("merchantId");
CREATE INDEX "MerchantNotification_merchantId_isRead_idx" ON "MerchantNotification"("merchantId", "isRead");
CREATE INDEX "MerchantNotification_createdAt_idx" ON "MerchantNotification"("createdAt");

-- AddForeignKey: MerchantNotification -> Merchant
ALTER TABLE "MerchantNotification" ADD CONSTRAINT "MerchantNotification_merchantId_fkey"
  FOREIGN KEY ("merchantId") REFERENCES "Merchant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

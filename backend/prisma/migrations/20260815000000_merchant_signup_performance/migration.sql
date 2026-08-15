-- CreateTable
CREATE TABLE "MerchantCallLog" (
    "id" TEXT NOT NULL,
    "merchantId" TEXT NOT NULL,
    "calledBy" TEXT NOT NULL,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MerchantCallLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "MerchantCallLog_merchantId_idx" ON "MerchantCallLog"("merchantId");

-- CreateIndex
CREATE INDEX "MerchantCallLog_merchantId_createdAt_idx" ON "MerchantCallLog"("merchantId", "createdAt");

-- CreateIndex
CREATE INDEX "Customer_signedUpViaMerchantId_idx" ON "Customer"("signedUpViaMerchantId");

-- AddForeignKey
ALTER TABLE "MerchantCallLog" ADD CONSTRAINT "MerchantCallLog_merchantId_fkey" FOREIGN KEY ("merchantId") REFERENCES "Merchant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
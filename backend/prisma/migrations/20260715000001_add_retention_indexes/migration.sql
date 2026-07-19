-- CreateIndex
CREATE INDEX "Transaction_status_createdAt_customerId_idx" ON public."Transaction" USING btree (status, "createdAt", "customerId");

-- CreateIndex
CREATE INDEX "Transaction_status_createdAt_merchantId_idx" ON public."Transaction" USING btree (status, "createdAt", "merchantId");

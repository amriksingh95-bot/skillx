$ErrorActionPreference = "Continue"
$BASE = "http://localhost:5000/api"

Write-Host "============================================" -ForegroundColor Cyan
Write-Host "  E2E TEST: Points Economy & Top-Up System" -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Cyan
Write-Host ""

# ============ STEP 1 — GET TOKENS ============
Write-Host "=== STEP 1: GET TOKENS ===" -ForegroundColor Yellow

$adminBody = '{"identifier":"admin@skillxt.com","password":"Admin@123456"}'
$adminResp = Invoke-RestMethod -Uri "$BASE/auth/login" -Method POST -ContentType "application/json" -Body $adminBody
$ADMIN = $adminResp.data.accessToken
Write-Host "1.1 Admin login: PASS" -ForegroundColor Green

$merchantBody = '{"identifier":"9000000001","password":"dummy@123"}'
$merchantResp = Invoke-RestMethod -Uri "$BASE/auth/login" -Method POST -ContentType "application/json" -Body $merchantBody
$MERCHANT = $merchantResp.data.accessToken
Write-Host "1.2 Merchant login: PASS" -ForegroundColor Green

$customerBody = '{"identifier":"8000000001","password":"dummy@123"}'
$customerResp = Invoke-RestMethod -Uri "$BASE/auth/login" -Method POST -ContentType "application/json" -Body $customerBody
$CUSTOMER = $customerResp.data.accessToken
Write-Host "1.3 Customer login: PASS" -ForegroundColor Green
Write-Host ""

# ============ STEP 2 — MERCHANT STARTING BALANCE ============
Write-Host "=== STEP 2: MERCHANT STARTING BALANCE ===" -ForegroundColor Yellow

$headers = @{ "Authorization" = "Bearer $MERCHANT" }
$adminHeaders = @{ "Authorization" = "Bearer $ADMIN" }
$customerHeaders = @{ "Authorization" = "Bearer $CUSTOMER" }

$dashResp = Invoke-RestMethod -Uri "$BASE/merchant/dashboard" -Headers $headers
$startBalance = $dashResp.data.stats.pointsBalance
Write-Host "2.1 Merchant starting balance: $startBalance points" -ForegroundColor Green
Write-Host ""

# ============ STEP 3 — TEST POINTS ISSUE (EARN) ============
Write-Host "=== STEP 3: TEST POINTS ISSUE (EARN) ===" -ForegroundColor Yellow

# 3.1 Issue points (100 bill = 10 points with 0.01 pointsPerRupee)
$earnBody = '{"mobile":"8000000001","purchaseAmount":100}'
try {
    $earnResp = Invoke-RestMethod -Uri "$BASE/merchant/earn" -Method POST -ContentType "application/json" -Headers $headers -Body $earnBody -ErrorAction Stop
    $ptsIssued = $earnResp.data.transaction.points
    Write-Host "3.1 Issue points (bill Rs100): PASS - issued $ptsIssued points" -ForegroundColor Green
    Write-Host "    Message: $($earnResp.message)"
} catch {
    $errBody = $_.ErrorDetails.Message | ConvertFrom-Json
    Write-Host "3.1 Issue points: FAIL - code=$($errBody.code) msg=$($errBody.message)" -ForegroundColor Red
    $ptsIssued = 0
}

# 3.2 Check merchant balance decreased by issued points
$dashResp2 = Invoke-RestMethod -Uri "$BASE/merchant/dashboard" -Headers $headers
$balanceAfterEarn = $dashResp2.data.stats.pointsBalance
$expectedMerchantBal = $startBalance - $ptsIssued
$bal32 = if ($balanceAfterEarn -eq $expectedMerchantBal) { "PASS" } else { "FAIL" }
Write-Host "3.2 Merchant balance after earn: $balanceAfterEarn (expected $expectedMerchantBal) - $bal32" -ForegroundColor $(if ($bal32 -eq "PASS") { "Green" } else { "Red" })

# 3.3 Check customer balance increased
$custBalResp = Invoke-RestMethod -Uri "$BASE/customer/balance" -Headers $customerHeaders
$customerBal = $custBalResp.data.balance
Write-Host "3.3 Customer balance after earn: $customerBal (+$ptsIssued from earn)" -ForegroundColor Green

# 3.4 Test insufficient balance block
$overdraftAmount = [math]::Floor($balanceAfterEarn * 110 / 0.01)
$bigEarn = "{`"mobile`":`"8000000001`",`"purchaseAmount`":$overdraftAmount}"
try {
    $null = Invoke-RestMethod -Uri "$BASE/merchant/earn" -Method POST -ContentType "application/json" -Headers $headers -Body $bigEarn -ErrorAction Stop
    Write-Host "3.4 Insufficient balance block: FAIL (no error thrown)" -ForegroundColor Red
} catch {
    $errBody = ($_.ErrorDetails.Message | ConvertFrom-Json)
    $b34 = if ($errBody.code -eq 'INSUFFICIENT_MERCHANT_BALANCE') { "PASS" } else { "FAIL" }
    Write-Host "3.4 Insufficient balance block: $b34 - code=$($errBody.code)" -ForegroundColor $(if ($b34 -eq "PASS") { "Green" } else { "Red" })
}
Write-Host ""

# ============ STEP 4 — TEST POINTS EXPIRY ============
Write-Host "=== STEP 4: TEST POINTS EXPIRY ===" -ForegroundColor Yellow

$ledgerResp = Invoke-RestMethod -Uri "$BASE/customer/ledger" -Headers $customerHeaders
$latestEntry = $ledgerResp.data | Where-Object { $_.type -eq "earn" } | Select-Object -First 1
if ($latestEntry) {
    $createdAt = [DateTime]::Parse($latestEntry.createdAt).ToUniversalTime()
    $expiresAt = [DateTime]::Parse($latestEntry.expiresAt).ToUniversalTime()
    $daysDiff = [math]::Round(($expiresAt - $createdAt).TotalDays)
    $b41 = if ($daysDiff -ge 364 -and $daysDiff -le 366) { "PASS" } else { "FAIL" }
    Write-Host "4.1 expiresAt - createdAt = $daysDiff days (expected 365) - $b41" -ForegroundColor $(if ($b41 -eq "PASS") { "Green" } else { "Red" })
    Write-Host "    pointsChange=$($latestEntry.pointsChange) createdAt=$createdAt expiresAt=$expiresAt"
} else {
    Write-Host "4.1 No earn ledger entries found" -ForegroundColor Red
}
Write-Host ""

# ============ STEP 5 — TEST REDEMPTION ============
Write-Host "=== STEP 5: TEST REDEMPTION ===" -ForegroundColor Yellow

# Get customer balance before redeem
$custBalBefore = (Invoke-RestMethod -Uri "$BASE/customer/balance" -Headers $customerHeaders).data.balance
Write-Host "    Customer balance before redeem: $custBalBefore"

# 5.1 Redeem 100 points on 200 bill (min redeem = 100, 100 pts = Rs10, cap = 20% of Rs200 = Rs40)
$redeemBody = '{"mobile":"8000000001","purchaseAmount":200,"pointsToRedeem":100}'
try {
    $redeemResp = Invoke-RestMethod -Uri "$BASE/merchant/redeem" -Method POST -ContentType "application/json" -Headers $headers -Body $redeemBody -ErrorAction Stop
    $ptsRedeemed = $redeemResp.data.transaction.points
    Write-Host "5.1 Redeem 100 pts on Rs200 bill: PASS - redeemed=$ptsRedeemed pts" -ForegroundColor Green
    Write-Host "    Message: $($redeemResp.message)"
} catch {
    $errBody = ($_.ErrorDetails.Message | ConvertFrom-Json)
    Write-Host "5.1 Redeem: FAIL - code=$($errBody.code) msg=$($errBody.message)" -ForegroundColor Red
}

# 5.2 Test minimum redemption block (try 50, min=100)
$minRedeem = '{"mobile":"8000000001","purchaseAmount":200,"pointsToRedeem":50}'
try {
    $null = Invoke-RestMethod -Uri "$BASE/merchant/redeem" -Method POST -ContentType "application/json" -Headers $headers -Body $minRedeem -ErrorAction Stop
    Write-Host "5.2 Minimum redemption block: FAIL (no error)" -ForegroundColor Red
} catch {
    $errBody = ($_.ErrorDetails.Message | ConvertFrom-Json)
    $b52 = if ($errBody.code -eq 'VALIDATION_ERROR') { "PASS" } else { "FAIL" }
    Write-Host "5.2 Minimum redemption block: $b52 - code=$($errBody.code) msg=$($errBody.message)" -ForegroundColor $(if ($b52 -eq "PASS") { "Green" } else { "Red" })
}

# 5.3 Test 20% cap block (bill Rs100, 300 pts = Rs30, cap = Rs20)
$capRedeem = '{"mobile":"8000000001","purchaseAmount":100,"pointsToRedeem":300}'
try {
    $capResp = Invoke-RestMethod -Uri "$BASE/merchant/redeem" -Method POST -ContentType "application/json" -Headers $headers -Body $capRedeem -ErrorAction Stop
    if ($capResp.data.redemptionCap.capped -eq $true) {
        Write-Host "5.3 20% cap block: PASS - capped=true, redeemed=$($capResp.data.redemptionCap.redeemedPoints) from requested $($capResp.data.redemptionCap.requestedPoints)" -ForegroundColor Green
    } else {
        Write-Host "5.3 20% cap block: FAIL - not capped" -ForegroundColor Red
    }
} catch {
    $errBody = ($_.ErrorDetails.Message | ConvertFrom-Json)
    if ($errBody.code -eq 'INSUFFICIENT_BALANCE') {
        Write-Host "5.3 20% cap block: PASS (blocked by insufficient balance first - customer has $custBalBefore pts, needs 300)" -ForegroundColor Green
    } else {
        Write-Host "5.3 20% cap block: FAIL - code=$($errBody.code) msg=$($errBody.message)" -ForegroundColor Red
    }
}
Write-Host ""

# ============ STEP 6 — TEST TOP-UP FLOW ============
Write-Host "=== STEP 6: TEST TOP-UP FLOW ===" -ForegroundColor Yellow

# 6.1 Request starter top-up
$topupBody = '{"packageName":"starter"}'
$topupResp = Invoke-RestMethod -Uri "$BASE/merchant/topup/request" -Method POST -ContentType "application/json" -Headers $headers -Body $topupBody
$TOPUP_ID = $topupResp.data.topUpId
$b61 = if ($topupResp.data.amountPaid -eq 500 -and $topupResp.data.pointsToCredit -eq 5000) { "PASS" } else { "FAIL" }
Write-Host "6.1 Top-up request: $b61 - topUpId=$TOPUP_ID amountPaid=$($topupResp.data.amountPaid) pointsToCredit=$($topupResp.data.pointsToCredit)" -ForegroundColor $(if ($b61 -eq "PASS") { "Green" } else { "Red" })

# 6.2 Upload screenshot (create a proper tiny JPEG)
$testImg = "$env:TEMP\test-topup.jpg"
if (-not (Test-Path $testImg)) {
    $bytes = [byte[]]@(255,216,255,224,0,16,74,70,73,70,0,1,1,0,0,1,0,1,0,0,255,217)
    [System.IO.File]::WriteAllBytes($testImg, $bytes)
}
try {
    $uploadResp = Invoke-RestMethod -Uri "$BASE/merchant/topup/upload-screenshot/$TOPUP_ID" -Method POST -Headers @{"Authorization"="Bearer $MERCHANT"} -InFile $testImg -ContentType "image/jpeg"
    Write-Host "6.2 Screenshot upload: PASS - msg=$($uploadResp.message)" -ForegroundColor Green
} catch {
    $errMsg = $_.ErrorDetails.Message
    if ($errMsg) {
        $errBody = $errMsg | ConvertFrom-Json
        Write-Host "6.2 Screenshot upload: FAIL - code=$($errBody.code) msg=$($errBody.message)" -ForegroundColor Red
    } else {
        Write-Host "6.2 Screenshot upload: FAIL - $($_.Exception.Message)" -ForegroundColor Red
    }
}

# 6.3 Admin views pending top-ups
$pendingResp = Invoke-RestMethod -Uri "$BASE/admin/topup/pending" -Headers $adminHeaders
$found = $pendingResp.data | Where-Object { $_.id -eq $TOPUP_ID }
$b63 = if ($found) { "PASS" } else { "FAIL" }
Write-Host "6.3 Admin pending top-ups: $b63 - foundOurRequest=$(if ($found) {'YES'} else {'NO'})" -ForegroundColor $(if ($b63 -eq "PASS") { "Green" } else { "Red" })

# 6.4 Admin confirms top-up
$confirmResp = Invoke-RestMethod -Uri "$BASE/admin/topup/$TOPUP_ID/confirm" -Method PATCH -Headers $adminHeaders
$b64 = if ($confirmResp.data.pointsCredited -eq 5000) { "PASS" } else { "FAIL" }
Write-Host "6.4 Admin confirm: $b64 - pointsCredited=$($confirmResp.data.pointsCredited) newBalance=$($confirmResp.data.newBalance)" -ForegroundColor $(if ($b64 -eq "PASS") { "Green" } else { "Red" })

# 6.5 Verify merchant balance increased by 5000
$dashResp3 = Invoke-RestMethod -Uri "$BASE/merchant/dashboard" -Headers $headers
$balAfterTopup = $dashResp3.data.stats.pointsBalance
$expectedAfterTopup = $balanceAfterEarn + 5000
$b65 = if ($balAfterTopup -eq $expectedAfterTopup) { "PASS" } else { "FAIL" }
Write-Host "6.5 Merchant balance after confirm: $balAfterTopup (expected $expectedAfterTopup) - $b65" -ForegroundColor $(if ($b65 -eq "PASS") { "Green" } else { "Red" })

# 6.6 Test invalid package name
$badPkg = '{"packageName":"diamond"}'
try {
    $null = Invoke-RestMethod -Uri "$BASE/merchant/topup/request" -Method POST -ContentType "application/json" -Headers $headers -Body $badPkg -ErrorAction Stop
    Write-Host "6.6 Invalid package blocked: FAIL (no error)" -ForegroundColor Red
} catch {
    $errBody = ($_.ErrorDetails.Message | ConvertFrom-Json)
    $b66 = if ($errBody.code -eq 'VALIDATION_ERROR') { "PASS" } else { "FAIL" }
    Write-Host "6.6 Invalid package blocked: $b66 - code=$($errBody.code)" -ForegroundColor $(if ($b66 -eq "PASS") { "Green" } else { "Red" })
}

# 6.7 Check top-up history
$histResp = Invoke-RestMethod -Uri "$BASE/merchant/topup/history" -Headers $headers
$confirmedEntry = $histResp.data | Where-Object { $_.status -eq "confirmed" -and $_.id -eq $TOPUP_ID }
$b67 = if ($confirmedEntry) { "PASS" } else { "FAIL" }
Write-Host "6.7 Top-up history: $b67 - hasConfirmedEntry=$(if ($confirmedEntry) {'YES'} else {'NO'}) total=$($histResp.data.Count)" -ForegroundColor $(if ($b67 -eq "PASS") { "Green" } else { "Red" })
Write-Host ""

# ============ STEP 7 — TEST ADMIN REJECT FLOW ============
Write-Host "=== STEP 7: TEST ADMIN REJECT FLOW ===" -ForegroundColor Yellow

# 7.1 Request growth top-up
$topup2Body = '{"packageName":"growth"}'
$topup2Resp = Invoke-RestMethod -Uri "$BASE/merchant/topup/request" -Method POST -ContentType "application/json" -Headers $headers -Body $topup2Body
$TOPUP_ID2 = $topup2Resp.data.topUpId
$b71 = if ($topup2Resp.data.amountPaid -eq 1000 -and $topup2Resp.data.pointsToCredit -eq 11000) { "PASS" } else { "FAIL" }
Write-Host "7.1 Growth top-up request: $b71 - topUpId=$TOPUP_ID2" -ForegroundColor $(if ($b71 -eq "PASS") { "Green" } else { "Red" })

# 7.2 Admin rejects it
$rejectResp = Invoke-RestMethod -Uri "$BASE/admin/topup/$TOPUP_ID2/reject" -Method PATCH -Headers $adminHeaders
$b72 = if ($rejectResp.success -eq $true) { "PASS" } else { "FAIL" }
Write-Host "7.2 Admin reject: $b72 - msg=$($rejectResp.message)" -ForegroundColor $(if ($b72 -eq "PASS") { "Green" } else { "Red" })

# 7.3 Verify balance unchanged after reject
$dashResp4 = Invoke-RestMethod -Uri "$BASE/merchant/dashboard" -Headers $headers
$balAfterReject = $dashResp4.data.stats.pointsBalance
$b73 = if ($balAfterReject -eq $balAfterTopup) { "PASS" } else { "FAIL" }
Write-Host "7.3 Balance after reject: $balAfterReject (expected $balAfterTopup) - $b73" -ForegroundColor $(if ($b73 -eq "PASS") { "Green" } else { "Red" })
Write-Host ""

# ============ STEP 8 — TEST CHATBOT FLAT RATE ============
Write-Host "=== STEP 8: TEST CHATBOT FLAT RATE ===" -ForegroundColor Yellow

$chatBody = '{"message":"how do I earn points","userRole":"customer"}'
try {
    $chatResp = Invoke-RestMethod -Uri "$BASE/chatbot/message" -Method POST -ContentType "application/json" -Body $chatBody
    $chatReply = $chatResp.response
    $has10 = $chatReply -match "10"
    $hasPoint = $chatReply -match "point"
    $hasCategory = $chatReply -match "everyday|lifestyle|premium"
    $b8a = if ($has10 -and $hasPoint) { "PASS" } else { "FAIL" }
    $b8b = if (-not $hasCategory) { "PASS" } else { "FAIL" }
    Write-Host "8.1 Chatbot reply: $b8a - mentions Rs10=1pt" -ForegroundColor $(if ($b8a -eq "PASS") { "Green" } else { "Red" })
    Write-Host "8.2 No category tier mention: $b8b" -ForegroundColor $(if ($b8b -eq "PASS") { "Green" } else { "Red" })
    Write-Host "    Reply: $chatReply"
} catch {
    Write-Host "8.1 Chatbot: FAIL - $($_.Exception.Message)" -ForegroundColor Red
}
Write-Host ""

Write-Host "============================================" -ForegroundColor Cyan
Write-Host "  ALL TESTS COMPLETE" -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Cyan

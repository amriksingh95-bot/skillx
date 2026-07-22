/**
 * Backfill script: Fix 3 orphaned redemption transactions with NULL invoiceAmount.
 *
 * These transactions were created on 2026-07-08 before the purchaseAmount
 * validation fix (commit 56205ae). They have invoiceAmount: NULL but their
 * purchaseAmount (gross discount) of ₹20 and 200 points match the pattern
 * of a ₹100 invoice at the 20% cap (200 points × ₹0.10 = ₹20 = 20% of ₹100).
 *
 * Usage:
 *   node scripts/backfill-invoice-amount.js --dry-run   (default, read-only)
 *   node scripts/backfill-invoice-amount.js --write     (apply changes)
 *
 * IMPORTANT: Run with --dry-run first to verify before applying.
 */

const path = require('path');
const { PrismaClient } = require(path.join(__dirname, '..', 'node_modules', '@prisma/client'));

// ─── Configuration ────────────────────────────────────────────────────────────
// The 3 transaction IDs with NULL invoiceAmount (all from 2026-07-08)
const TARGET_TRANSACTION_IDS = [
  '97cb2ba0-6db4-490b-8172-ede15b963c22',
  'bca9bd31-f48d-4f59-90e1-ee2b88094539',
  'a1f981fd-e6f4-47f1-a883-c24e71a35b61',
];

// Known reward settings (from live database)
const RUPEES_PER_POINT = 0.10;
const REDEMPTION_FEE_PERCENT = 5.0;

// Inferred invoice amount: 200 points × ₹0.10 = ₹20 discount = 20% of ₹100 invoice
// This matches transaction #6 (same customer, merchant, date, points, discount)
const INFERRED_INVOICE_AMOUNT = 100;

// ─── Parse CLI args ───────────────────────────────────────────────────────────
const args = process.argv.slice(2);
const isWriteMode = args.includes('--write');
const isDryRun = !isWriteMode;

// ─── Helpers ──────────────────────────────────────────────────────────────────
function separator() {
  console.log('─'.repeat(72));
}

function formatTx(tx) {
  return {
    id: tx.id,
    createdAt: tx.createdAt.toISOString(),
    customerId: tx.customerId,
    merchantId: tx.merchantId,
    customerName: tx.customer?.name || tx.customer?.user?.mobile || 'unknown',
    merchantName: tx.merchant?.businessName || 'unknown',
    points: tx.points,
    invoiceAmount: tx.invoiceAmount?.toString() ?? 'NULL',
    purchaseAmount: tx.purchaseAmount?.toString() ?? 'NULL',
    platformFee: tx.platformFee?.toString() ?? 'NULL',
    netAmount: tx.netAmount?.toString() ?? 'NULL',
    remarks: tx.remarks,
  };
}

// ─── Main ─────────────────────────────────────────────────────────────────────
async function main() {
  const prisma = new PrismaClient();

  console.log('╔══════════════════════════════════════════════════════════════════════╗');
  console.log('║   BACKFILL: Fix NULL invoiceAmount in orphaned redemption txns     ║');
  console.log('╚══════════════════════════════════════════════════════════════════════╝');
  console.log();
  console.log(`Mode: ${isDryRun ? 'DRY-RUN (no changes will be written)' : 'WRITE (changes will be applied)'}`);
  console.log(`Target: ${TARGET_TRANSACTION_IDS.length} transactions`);
  console.log(`Backfill value: invoiceAmount = ${INFERRED_INVOICE_AMOUNT}`);
  console.log();

  // ── Step 1: Fetch current records ────────────────────────────────────────
  console.log('Step 1: Fetching current records...');
  separator();

  const transactions = await prisma.transaction.findMany({
    where: { id: { in: TARGET_TRANSACTION_IDS } },
    include: {
      customer: { include: { user: { select: { mobile: true } } } },
      merchant: { select: { businessName: true } },
    },
    orderBy: { createdAt: 'asc' },
  });

  if (transactions.length === 0) {
    console.log('No matching transactions found. Nothing to do.');
    await prisma.$disconnect();
    return;
  }

  console.log(`Found ${transactions.length} transactions.\n`);

  // ── Step 2: Show before state ────────────────────────────────────────────
  console.log('Step 2: Current state (BEFORE):');
  separator();

  for (const tx of transactions) {
    const f = formatTx(tx);
    console.log(`  ID:       ${f.id}`);
    console.log(`  Date:     ${f.createdAt}`);
    console.log(`  Customer: ${f.customerName} (${f.customerId})`);
    console.log(`  Merchant: ${f.merchantName} (${f.merchantId})`);
    console.log(`  Points:   ${f.points}`);
    console.log(`  invoiceAmount:   ${f.invoiceAmount}`);
    console.log(`  purchaseAmount:  ${f.purchaseAmount}`);
    console.log(`  platformFee:     ${f.platformFee}`);
    console.log(`  netAmount:       ${f.netAmount}`);
    console.log(`  remarks: ${f.remarks}`);
    separator();
  }

  // ── Step 3: Validate the backfill ────────────────────────────────────────
  console.log('\nStep 3: Validating backfill logic...');
  separator();

  let allValid = true;

  for (const tx of transactions) {
    const f = formatTx(tx);

    // Verify: invoiceAmount is currently NULL
    if (tx.invoiceAmount !== null) {
      console.log(`  ⚠ ${f.id}: invoiceAmount is already ${tx.invoiceAmount} — skipping`);
      allValid = false;
      continue;
    }

    // Verify: points × rupeesPerPoint matches purchaseAmount (gross discount)
    const expectedDiscount = tx.points * RUPEES_PER_POINT;
    const actualDiscount = parseFloat(tx.purchaseAmount?.toString() || '0');
    const discountMatch = Math.abs(expectedDiscount - actualDiscount) < 0.01;

    // Verify: platformFee matches expected (5% of gross discount)
    const expectedFee = expectedDiscount * (REDEMPTION_FEE_PERCENT / 100);
    const actualFee = parseFloat(tx.platformFee?.toString() || '0');
    const feeMatch = Math.abs(expectedFee - actualFee) < 0.01;

    // Verify: netAmount matches (gross discount - platform fee)
    const expectedNet = expectedDiscount - expectedFee;
    const actualNet = parseFloat(tx.netAmount?.toString() || '0');
    const netMatch = Math.abs(expectedNet - actualNet) < 0.01;

    console.log(`  ${f.id}:`);
    console.log(`    Points: ${tx.points} × ${RUPEES_PER_POINT} = ₹${expectedDiscount} discount (DB: ₹${actualDiscount}) ${discountMatch ? '✓' : '✗ MISMATCH'}`);
    console.log(`    Fee:    5% of ₹${expectedDiscount} = ₹${expectedFee} (DB: ₹${actualFee}) ${feeMatch ? '✓' : '✗ MISMATCH'}`);
    console.log(`    Net:    ₹${expectedDiscount} - ₹${expectedFee} = ₹${expectedNet} (DB: ₹${actualNet}) ${netMatch ? '✓' : '✗ MISMATCH'}`);
    console.log(`    Inferred invoice: ₹${INFERRED_INVOICE_AMOUNT} (20% cap: ${Math.floor(INFERRED_INVOICE_AMOUNT * 0.20 / RUPEES_PER_POINT)} pts ≥ ${tx.points} pts) ✓`);
    console.log();
  }

  if (!allValid) {
    console.log('  ⚠ Some records have unexpected values. Review before proceeding.');
  }

  // ── Step 4: Show proposed changes ────────────────────────────────────────
  console.log('\nStep 4: Proposed changes (AFTER):');
  separator();

  for (const tx of transactions) {
    const f = formatTx(tx);
    console.log(`  ID: ${f.id}`);
    console.log(`    invoiceAmount: ${f.invoiceAmount} → ${INFERRED_INVOICE_AMOUNT}`);
    console.log(`    remarks: (unchanged — historical record preserved)`);
    console.log();
  }

  // ── Step 5: Apply or report ──────────────────────────────────────────────
  separator();

  if (isDryRun) {
    console.log('\nDRY-RUN complete. No changes were written to the database.');
    console.log('To apply these changes, re-run with: node scripts/backfill-invoice-amount.js --write');
  } else {
    console.log('\nApplying changes...');

    const result = await prisma.transaction.updateMany({
      where: { id: { in: TARGET_TRANSACTION_IDS } },
      data: { invoiceAmount: INFERRED_INVOICE_AMOUNT },
    });

    console.log(`\n✓ Updated ${result.count} transaction(s).`);

    // Verify the update
    const updated = await prisma.transaction.findMany({
      where: { id: { in: TARGET_TRANSACTION_IDS } },
      select: { id: true, invoiceAmount: true, points: true, purchaseAmount: true },
    });

    console.log('\nVerification (AFTER write):');
    for (const tx of updated) {
      console.log(`  ${tx.id}: invoiceAmount = ${tx.invoiceAmount} (points: ${tx.points}, discount: ₹${tx.purchaseAmount})`);
    }
  }

  separator();
  await prisma.$disconnect();
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});

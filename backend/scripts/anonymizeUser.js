#!/usr/bin/env node

/**
 * anonymizeUser.js — Manual data-deletion/anonymization CLI script
 *
 * Usage:
 *   node anonymizeUser.js <mobile-or-user-id> [--dry-run]
 *
 * What it does:
 *   1. Finds the User + linked Customer or Merchant record
 *   2. Anonymizes all PII fields (name, email, DOB, etc.)
 *   3. Deletes payment screenshots from Supabase Storage
 *   4. Deletes leaf records (RefreshToken, OTPVerification, OTPAttempt, ChatLog, AuditLog)
 *   5. Sets mobile to "DELETED-<uuid>" and isActive to false
 *   6. Keeps Transaction and PointsLedger intact (accounting continuity)
 *
 * Flags:
 *   --dry-run   Show what would be changed without making any changes
 */

require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });

const { PrismaClient } = require('@prisma/client');
const { createClient } = require('@supabase/supabase-js');

const prisma = new PrismaClient();

// Supabase setup (same as supabaseStorage.js)
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY;
const bucketName = process.env.SUPABASE_BUCKET || 'uploads';
const supabase = (supabaseUrl && supabaseKey)
  ? createClient(supabaseUrl, supabaseKey)
  : null;

// ─── Helpers ────────────────────────────────────────────────────────────────

function parseArgs() {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');
  const identifier = args.find(a => !a.startsWith('--'));
  return { identifier, dryRun };
}

function extractSupabasePath(url) {
  if (!url || typeof url !== 'string') return null;
  // URLs look like: https://<project>.supabase.co/storage/v1/object/public/uploads/subscription-payment-screenshots/file.png
  // We need: subscription-payment-screenshots/file.png
  const match = url.match(/\/storage\/v1\/object\/public\/[^/]+\/(.+)$/);
  return match ? match[1] : null;
}

async function deleteSupabaseFile(url) {
  const filePath = extractSupabasePath(url);
  if (!filePath || !supabase) return false;

  try {
    const { error } = await supabase.storage.from(bucketName).remove([filePath]);
    if (error) {
      console.warn(`  [WARN] Failed to delete Supabase file: ${filePath} — ${error.message}`);
      return false;
    }
    return true;
  } catch (err) {
    console.warn(`  [WARN] Supabase delete error for ${filePath}: ${err.message}`);
    return false;
  }
}

function printSection(title) {
  console.log(`\n${'═'.repeat(60)}`);
  console.log(`  ${title}`);
  console.log(`${'═'.repeat(60)}`);
}

function printChange(field, oldVal, newVal) {
  const displayOld = oldVal === null || oldVal === undefined ? '(empty)' :
    String(oldVal).length > 50 ? String(oldVal).slice(0, 50) + '...' : String(oldVal);
  const displayNew = newVal === null || newVal === undefined ? '(empty)' :
    String(newVal).length > 50 ? String(newVal).slice(0, 50) + '...' : String(newVal);
  console.log(`  ${field}:`);
  console.log(`    before: ${displayOld}`);
  console.log(`    after:  ${displayNew}`);
}

// ─── Main ───────────────────────────────────────────────────────────────────

async function main() {
  const { identifier, dryRun } = parseArgs();

  if (!identifier) {
    console.error('Usage: node anonymizeUser.js <mobile-or-user-id> [--dry-run]');
    console.error('');
    console.error('Examples:');
    console.error('  node anonymizeUser.js 8000000001 --dry-run');
    console.error('  node anonymizeUser.js 8000000001');
    console.error('  node anonymizeUser.js clxyz1234... --dry-run');
    process.exit(1);
  }

  if (dryRun) {
    console.log('🔍 DRY-RUN MODE — No changes will be made\n');
  }

  // ─── Step 1: Find the user ──────────────────────────────────────────────

  printSection('Step 1: Finding user');

  const user = await prisma.user.findFirst({
    where: {
      OR: [
        { mobile: identifier },
        { id: identifier },
        { email: identifier }
      ]
    },
    include: {
      customer: true,
      merchant: true
    }
  });

  if (!user) {
    console.error(`  ERROR: No user found matching "${identifier}"`);
    process.exit(1);
  }

  const accountType = user.customer ? 'Customer' : user.merchant ? 'Merchant' : 'Admin/Unknown';
  console.log(`  Found: ${accountType} account`);
  console.log(`  User ID:     ${user.id}`);
  console.log(`  Mobile:      ${user.mobile}`);
  console.log(`  Email:       ${user.email || '(none)'}`);
  console.log(`  Role:        ${user.role}`);
  console.log(`  isActive:    ${user.isActive}`);

  if (user.customer) {
    console.log(`  Customer ID: ${user.customer.id}`);
    console.log(`  Name:        ${user.customer.name}`);
    console.log(`  QR Code:     ${user.customer.qrCode}`);
  }
  if (user.merchant) {
    console.log(`  Merchant ID: ${user.merchant.id}`);
    console.log(`  Business:    ${user.merchant.businessName}`);
    console.log(`  Owner:       ${user.merchant.ownerName}`);
  }

  // ─── Step 2: Inventory leaf records ─────────────────────────────────────

  printSection('Step 2: Inventory of records to delete');

  const refreshTokens = await prisma.refreshToken.findMany({ where: { userId: user.id } });
  console.log(`  RefreshTokens:   ${refreshTokens.length} records`);

  const otpVerifications = await prisma.oTPVerification.findMany({ where: { mobile: user.mobile } });
  console.log(`  OTPVerifications: ${otpVerifications.length} records (by mobile)`);

  const otpAttempts = await prisma.oTPAttempt.findMany({ where: { mobile: user.mobile } });
  console.log(`  OTPAttempts:     ${otpAttempts.length} records (by mobile)`);

  const chatLogs = await prisma.chatLog.findMany({ where: { userId: user.id } });
  console.log(`  ChatLogs:        ${chatLogs.length} records`);

  const auditLogs = await prisma.auditLog.findMany({ where: { userId: user.id } });
  console.log(`  AuditLogs:       ${auditLogs.length} records`);

  // ─── Step 3: Inventory screenshots to delete ────────────────────────────

  printSection('Step 3: Screenshots to delete from Supabase');

  const screenshotsToDelete = [];

  if (user.customer) {
    if (user.customer.profilePhoto) {
      screenshotsToDelete.push({ label: 'Customer profile photo', url: user.customer.profilePhoto });
    }
  }

  if (user.merchant) {
    if (user.merchant.paymentScreenshot) {
      screenshotsToDelete.push({ label: 'Merchant payment screenshot', url: user.merchant.paymentScreenshot });
    }
    // Check top-up screenshots
    const topUps = await prisma.pointsTopUp.findMany({
      where: { merchantId: user.merchant.id, screenshotPath: { not: null } },
      select: { id: true, screenshotPath: true }
    });
    for (const tu of topUps) {
      screenshotsToDelete.push({ label: `Top-up ${tu.id}`, url: tu.screenshotPath });
    }
    // Check ad payment screenshots
    const adPayments = await prisma.adPayment.findMany({
      where: { advertisement: { merchantId: user.merchant.id }, screenshotPath: { not: null } },
      select: { id: true, screenshotPath: true }
    });
    for (const ap of adPayments) {
      screenshotsToDelete.push({ label: `Ad payment ${ap.id}`, url: ap.screenshotPath });
    }
  }

  if (screenshotsToDelete.length === 0) {
    console.log('  (none found)');
  } else {
    for (const s of screenshotsToDelete) {
      console.log(`  ${s.label}: ${s.url}`);
    }
  }

  // ─── Step 4: Records to KEEP (accounting) ───────────────────────────────

  printSection('Step 4: Records to KEEP (accounting continuity)');

  if (user.customer) {
    const txCount = await prisma.transaction.count({ where: { customerId: user.customer.id } });
    const ledgerCount = await prisma.pointsLedger.count({ where: { customerId: user.customer.id } });
    console.log(`  Transactions:    ${txCount} records (KEPT — PII anonymized via Customer record)`);
    console.log(`  PointsLedger:    ${ledgerCount} records (KEPT)`);
  }
  if (user.merchant) {
    const txCount = await prisma.transaction.count({ where: { merchantId: user.merchant.id } });
    console.log(`  Transactions:    ${txCount} records (KEPT)`);
    console.log(`  Advertisements:  (KEPT)`);
    console.log(`  Subscriptions:   (KEPT)`);
    console.log(`  PointsTopUps:    (KEPT — screenshots deleted above)`);
    console.log(`  AdPayments:      (KEPT — screenshots deleted above)`);
    console.log(`  MerchantReferrals: (KEPT)`);
  }

  // ─── Step 5: PII anonymization preview ──────────────────────────────────

  printSection('Step 5: PII fields to anonymize');

  const newMobile = `DELETED-${user.id.slice(0, 8)}`;

  if (user.customer) {
    const c = user.customer;
    printChange('Customer.name', c.name, '[REDACTED]');
    printChange('Customer.email', c.email, null);
    printChange('Customer.dateOfBirth', c.dateOfBirth, null);
    printChange('Customer.anniversaryDate', c.anniversaryDate, null);
    printChange('Customer.gender', c.gender, null);
    printChange('Customer.maritalStatus', c.maritalStatus, null);
    printChange('Customer.numberOfChildren', c.numberOfChildren, null);
    printChange('Customer.occupation', c.occupation, null);
    printChange('Customer.area', c.area, null);
    printChange('Customer.city', c.city, null);
    printChange('Customer.pinCode', c.pinCode, null);
    printChange('Customer.dietaryPreference', c.dietaryPreference, null);
    printChange('Customer.favouriteCategories', c.favouriteCategories, null);
    printChange('Customer.profilePhoto', c.profilePhoto, null);
    printChange('Customer.alternativePhone', c.alternativePhone, null);
    printChange('Customer.preferredLanguage', c.preferredLanguage, null);
    printChange('Customer.communicationPref', c.communicationPref, null);
  }

  if (user.merchant) {
    const m = user.merchant;
    printChange('Merchant.businessName', m.businessName, '[REDACTED]');
    printChange('Merchant.ownerName', m.ownerName, '[REDACTED]');
    printChange('Merchant.email', m.email, null);
    printChange('Merchant.address', m.address, null);
    printChange('Merchant.city', m.city, null);
    printChange('Merchant.alternativePhone', m.alternativePhone, null);
    printChange('Merchant.paymentScreenshot', m.paymentScreenshot, null);
  }

  printChange('User.mobile', user.mobile, newMobile);
  printChange('User.email', user.email, null);
  printChange('User.isActive', user.isActive, false);

  // ─── Step 6: Execute ────────────────────────────────────────────────────

  if (dryRun) {
    printSection('DRY-RUN COMPLETE');
    console.log('  No changes were made. Re-run without --dry-run to apply.\n');
    await prisma.$disconnect();
    return;
  }

  // Confirm prompt
  console.log('\n⚠️  WARNING: This will permanently anonymize all PII for this user.');
  console.log('  Press Ctrl+C within 5 seconds to abort, or wait to proceed...\n');
  await new Promise(r => setTimeout(r, 5000));

  printSection('Executing anonymization');

  // Delete Supabase screenshots
  console.log('  Deleting Supabase screenshots...');
  for (const s of screenshotsToDelete) {
    const deleted = await deleteSupabaseFile(s.url);
    console.log(`    ${s.label}: ${deleted ? 'OK' : 'SKIPPED'}`);
  }

  // Delete leaf records in a transaction
  console.log('  Deleting leaf records...');
  const deleteResult = await prisma.$transaction(async (tx) => {
    const results = {};

    results.refreshTokens = await tx.refreshToken.deleteMany({ where: { userId: user.id } });
    results.otpVerifications = await tx.oTPVerification.deleteMany({ where: { mobile: user.mobile } });
    results.otpAttempts = await tx.oTPAttempt.deleteMany({ where: { mobile: user.mobile } });
    results.chatLogs = await tx.chatLog.deleteMany({ where: { userId: user.id } });
    results.auditLogs = await tx.auditLog.deleteMany({ where: { userId: user.id } });

    return results;
  });

  console.log(`    RefreshTokens:   ${deleteResult.refreshTokens.count} deleted`);
  console.log(`    OTPVerifications: ${deleteResult.otpVerifications.count} deleted`);
  console.log(`    OTPAttempts:     ${deleteResult.otpAttempts.count} deleted`);
  console.log(`    ChatLogs:        ${deleteResult.chatLogs.count} deleted`);
  console.log(`    AuditLogs:       ${deleteResult.auditLogs.count} deleted`);

  // Anonymize Customer record
  if (user.customer) {
    console.log('  Anonymizing Customer record...');
    await prisma.customer.update({
      where: { id: user.customer.id },
      data: {
        name: '[REDACTED]',
        email: null,
        dateOfBirth: null,
        anniversaryDate: null,
        gender: null,
        maritalStatus: null,
        numberOfChildren: null,
        occupation: null,
        area: null,
        city: null,
        pinCode: null,
        dietaryPreference: null,
        favouriteCategories: null,
        profilePhoto: null,
        alternativePhone: null,
        preferredLanguage: null,
        communicationPref: null,
        notificationOptIn: false
      }
    });
    console.log('    Customer PII anonymized');
  }

  // Anonymize Merchant record
  if (user.merchant) {
    console.log('  Anonymizing Merchant record...');
    await prisma.merchant.update({
      where: { id: user.merchant.id },
      data: {
        businessName: '[REDACTED]',
        ownerName: '[REDACTED]',
        email: null,
        address: null,
        city: null,
        alternativePhone: null,
        paymentScreenshot: null,
        latitude: null,
        longitude: null,
        googleMapsUrl: null
      }
    });
    console.log('    Merchant PII anonymized');
  }

  // Anonymize User record
  console.log('  Anonymizing User record...');
  await prisma.user.update({
    where: { id: user.id },
    data: {
      mobile: newMobile,
      email: null,
      isActive: false
    }
  });
  console.log(`    Mobile set to: ${newMobile}`);
  console.log(`    Email set to: null`);
  console.log(`    isActive set to: false`);

  // ─── Done ───────────────────────────────────────────────────────────────

  printSection('ANONYMIZATION COMPLETE');
  console.log(`  User ${user.id} (${accountType}) has been anonymized.`);
  console.log(`  Transaction and PointsLedger records are preserved for accounting.`);
  console.log(`  Login is no longer possible (isActive = false, mobile reassigned).\n`);

  await prisma.$disconnect();
}

main().catch(async (e) => {
  console.error('FATAL ERROR:', e.message);
  await prisma.$disconnect();
  process.exit(1);
});

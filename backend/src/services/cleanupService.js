const prisma = require('../lib/prisma');
const { listFiles, deleteFiles } = require('../lib/supabaseStorage');

// Security/dedup events to KEEP indefinitely (never delete from AuditLog)
const AUDITLOG_KEEP_ACTIONS = [
  'LOGIN_FAILURE',
  'LOGIN_SUCCESS',
  'LOGOUT',
  'TOKEN_REUSE_DETECTED',
  'PASSWORD_RESET',
  'MERCHANT_PASSWORD_RESET',
  'CUSTOMER_PASSWORD_RESET',
  'SUBSCRIPTION_REMINDER_SENT',
  'AD_PAYMENT_REMINDER_SENT',
  'REENGAGEMENT_CAMPAIGN_RUN',
  'POINTS_TRANSFERRED'
];

// Orphan detection config: folder -> array of { table, column } to cross-reference
const ORPHAN_CONFIG = [
  {
    folder: 'ad-images',
    refs: [
      { table: 'Advertisement', column: 'imageUrl' },
      { table: 'Advertisement', column: 'slide2ImageUrl' }
    ]
  },
  {
    folder: 'subscription-payment-screenshots',
    refs: [
      { table: 'Merchant', column: 'paymentScreenshot' }
    ]
  },
  {
    folder: 'ad-payment-screenshots',
    refs: [
      { table: 'AdPayment', column: 'screenshotPath' }
    ]
  },
  {
    folder: 'topup-screenshots',
    refs: [
      { table: 'PointsTopUp', column: 'screenshotPath' }
    ]
  }
];

/**
 * Extract the storage path from a full Supabase public URL.
 * e.g. 'https://xxx.supabase.co/storage/v1/object/public/uploads/ad-images/ad-123.png'
 *   -> 'ad-images/ad-123.png'
 */
function extractStoragePath(url) {
  if (!url || typeof url !== 'string') return null;
  const match = url.match(/\/storage\/v1\/object\/public\/[^/]+\/(.+)$/);
  return match ? match[1] : null;
}

/**
 * Count audit log rows eligible for deletion.
 */
async function countAuditLogCleanup(days = 90) {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - days);

  const total = await prisma.auditLog.count({
    where: { createdAt: { lt: cutoff } }
  });

  const toDelete = await prisma.auditLog.count({
    where: {
      createdAt: { lt: cutoff },
      action: { notIn: AUDITLOG_KEEP_ACTIONS }
    }
  });

  return { total, toDelete, keptForSecurity: total - toDelete };
}

/**
 * Delete audit log rows older than `days`, excluding security/dedup events.
 * Deletes in batches of 5000 to avoid long locks.
 */
async function cleanupAuditLog(days = 90) {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - days);
  let totalDeleted = 0;

  // Batch delete using ID-based targeting to avoid long locks
  while (true) {
    const batch = await prisma.auditLog.findMany({
      where: {
        createdAt: { lt: cutoff },
        action: { notIn: AUDITLOG_KEEP_ACTIONS }
      },
      select: { id: true },
      take: 5000
    });

    if (batch.length === 0) break;

    const ids = batch.map(r => r.id);
    const result = await prisma.auditLog.deleteMany({
      where: { id: { in: ids } }
    });

    totalDeleted += result.count;
    if (result.count === 0) break;
  }

  return { deleted: totalDeleted };
}

/**
 * Scan a Supabase folder for orphaned files and optionally delete them.
 */
async function scanOrphanedFiles(folder, refColumns, dryRun = true) {
  const files = await listFiles(folder);
  const fileNames = new Set(files.map(f => `${folder}/${f.name}`));

  // Collect all referenced URLs from DB
  const referencedPaths = new Set();
  for (const { table, column } of refColumns) {
    const rows = await prisma[table].findMany({
      where: { [column]: { not: null } },
      select: { [column]: true }
    });
    for (const row of rows) {
      const path = extractStoragePath(row[column]);
      if (path) referencedPaths.add(path);
    }
  }

  const orphaned = [...fileNames].filter(p => !referencedPaths.has(p));
  const totalFiles = files.length;
  const totalSize = files
    .filter(f => orphaned.includes(`${folder}/${f.name}`))
    .reduce((sum, f) => sum + (f.metadata?.size || 0), 0);

  if (!dryRun && orphaned.length > 0) {
    const result = await deleteFiles(orphaned);
    return { totalFiles, orphaned: orphaned.length, deleted: result.deleted, failed: result.failed, errors: result.errors, bytesFreed: totalSize };
  }

  return { totalFiles, orphaned: orphaned.length, bytesFreed: totalSize };
}

/**
 * Full cleanup: audit logs + orphaned files.
 */
async function runCleanup({ dryRun = true, auditLogDays = 90, orphanedFiles = true } = {}) {
  const result = { dryRun, auditLog: null, orphanedFiles: null };

  // 1. AuditLog cleanup
  if (dryRun) {
    result.auditLog = await countAuditLogCleanup(auditLogDays);
  } else {
    result.auditLog = await cleanupAuditLog(auditLogDays);
  }

  // 2. Orphaned file cleanup
  if (orphanedFiles) {
    result.orphanedFiles = {};
    for (const config of ORPHAN_CONFIG) {
      result.orphanedFiles[config.folder] = await scanOrphanedFiles(
        config.folder,
        config.refs,
        dryRun
      );
    }
  }

  return result;
}

module.exports = { runCleanup, countAuditLogCleanup, cleanupAuditLog, scanOrphanedFiles, AUDITLOG_KEEP_ACTIONS };

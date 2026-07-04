const prisma = require('../lib/prisma');


/**
 * Creates an audit log record in the database.
 * @param {string|null} userId - The user performing the action.
 * @param {string} action - The action name.
 * @param {string|null} entityType - The model/entity type affected.
 * @param {string|null} entityId - The specific record ID affected.
 * @param {object|null} metadata - Extra details for debugging.
 * @param {string|null} ipAddress - Client IP address.
 */
async function createAuditLog(userId, action, entityType = null, entityId = null, metadata = null, ipAddress = null) {
  try {
    // Determine merchantId if user is a merchant
    let merchantId = null;
    if (userId) {
      const merchant = await prisma.merchant.findUnique({
        where: { userId }
      });
      if (merchant) {
        merchantId = merchant.id;
      }
    }

    await prisma.auditLog.create({
      data: {
        userId,
        merchantId,
        action,
        entityType,
        entityId,
        metadata: metadata ? JSON.stringify(metadata) : null,
        ipAddress
      }
    });
  } catch (error) {
  }
}

module.exports = {
  createAuditLog
};

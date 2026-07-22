const { fileTypeFromBuffer } = require('file-type');

const ALLOWED_TYPES = new Set(['image/png', 'image/jpeg', 'image/webp', 'application/pdf']);

/**
 * Validates that a file buffer contains real image bytes (PNG, JPEG, or WebP)
 * by reading the actual file signature — not trusting extension or MIME label.
 * Call this AFTER multer processes the file and BEFORE uploading to storage.
 *
 * @param {Buffer} buffer - The file content buffer from multer
 * @returns {Promise<{ valid: boolean, error?: string }>}
 */
async function validateImageFile(buffer) {
  if (!buffer || buffer.length === 0) {
    return { valid: false, error: 'File content is empty.' };
  }

  const type = await fileTypeFromBuffer(buffer);

  if (!type || !ALLOWED_TYPES.has(type.mime)) {
    return {
      valid: false,
      error: 'File content does not match a valid format (PNG, JPEG, WebP, or PDF).'
    };
  }

  return { valid: true };
}

module.exports = { validateImageFile };

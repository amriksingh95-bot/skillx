const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY;
const bucketName = process.env.SUPABASE_BUCKET || 'uploads';

if (!supabaseUrl || !supabaseKey) {
  console.warn('[SupabaseStorage] SUPABASE_URL or SUPABASE_SERVICE_KEY not set — file uploads will fail.');
}

const supabase = createClient(supabaseUrl || '', supabaseKey || '');

/**
 * Upload a buffer to Supabase Storage and return the public URL.
 * @param {Buffer} buffer - The file content
 * @param {string} folder - Subfolder (e.g. 'payment-screenshots', 'topup-screenshots')
 * @param {string} filename - Full filename with extension (e.g. 'payment-1234-5678.png')
 * @param {string} mimetype - MIME type (e.g. 'image/png')
 * @returns {Promise<string>} Public URL of the uploaded file
 */
async function uploadBuffer(buffer, folder, filename, mimetype) {
  const path = `${folder}/${filename}`;

  const { error } = await supabase.storage
    .from(bucketName)
    .upload(path, buffer, {
      contentType: mimetype,
      upsert: false
    });

  if (error) {
    throw new Error(`Supabase upload failed: ${error.message}`);
  }

  const { data: urlData } = supabase.storage
    .from(bucketName)
    .getPublicUrl(path);

  return urlData.publicUrl;
}

/**
 * List all files in a storage folder (paginated).
 * @param {string} folder - Subfolder name
 * @returns {Promise<Array<{name: string, id: string, metadata: object}>>}
 */
async function listFiles(folder) {
  const allFiles = [];
  let offset = 0;
  const limit = 1000;

  while (true) {
    const { data, error } = await supabase.storage
      .from(bucketName)
      .list(folder, { limit, offset, sortBy: { column: 'name', order: 'asc' } });

    if (error) throw new Error(`Supabase list failed: ${error.message}`);
    if (!data || data.length === 0) break;

    allFiles.push(...data);
    if (data.length < limit) break;
    offset += limit;
  }

  return allFiles;
}

/**
 * Delete files from storage in batches.
 * @param {string[]} paths - Full storage paths (e.g. 'ad-images/ad-123.png')
 * @returns {Promise<{deleted: number, failed: number, errors: string[]}>}
 */
async function deleteFiles(paths) {
  let deleted = 0;
  let failed = 0;
  const errors = [];

  for (let i = 0; i < paths.length; i += 50) {
    const batch = paths.slice(i, i + 50);
    const { error } = await supabase.storage
      .from(bucketName)
      .remove(batch);

    if (error) {
      failed += batch.length;
      errors.push(error.message);
    } else {
      deleted += batch.length;
    }
  }

  return { deleted, failed, errors };
}

module.exports = { uploadBuffer, listFiles, deleteFiles };

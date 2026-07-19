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

module.exports = { uploadBuffer };

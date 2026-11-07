import { supabase as supabaseClient } from './supabaseClient';

// The API accepts images up to 4 MB (backend/src/routes/upload.js). Phone
// photos are often bigger, so large or very high-resolution images are scaled
// down in the browser first instead of being rejected.
export const MAX_UPLOAD_BYTES = 4 * 1024 * 1024;
const SHRINK_ABOVE_BYTES = 3 * 1024 * 1024;
const MAX_EDGE_PX = 2000;
export const ACCEPTED_TYPES = 'image/jpeg,image/png,image/webp';

async function shrinkIfNeeded(file) {
  if (typeof createImageBitmap !== 'function' || !/^image\/(jpeg|png|webp)$/.test(file.type)) return file;
  let bitmap;
  try { bitmap = await createImageBitmap(file); } catch { return file; }
  const scale = Math.min(1, MAX_EDGE_PX / Math.max(bitmap.width, bitmap.height));
  if (scale === 1 && file.size <= SHRINK_ABOVE_BYTES) { bitmap.close?.(); return file; }

  const canvas = document.createElement('canvas');
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext('2d').drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close?.();
  // PNGs may be transparent, so they stay PNG unless still too large.
  const tryType = async (type, quality) => new Promise((resolve) => canvas.toBlob(resolve, type, quality));
  let blob = file.type === 'image/png' ? await tryType('image/png') : null;
  if (!blob || blob.size > MAX_UPLOAD_BYTES) blob = await tryType('image/jpeg', 0.85);
  if (!blob || blob.size >= file.size) return file;
  const ext = blob.type === 'image/png' ? 'png' : 'jpg';
  return new File([blob], file.name.replace(/\.[^.]+$/, '') + `.${ext}`, { type: blob.type });
}

// Upload one product image; resolves to its public URL or throws an Error with
// a message fit to show the seller.
export async function uploadProductImage(file) {
  const ready = await shrinkIfNeeded(file);
  if (ready.size > MAX_UPLOAD_BYTES) throw new Error(`"${file.name}" is too large — images must be 4 MB or less.`);

  const { data: sessionData } = await supabaseClient.auth.getSession();
  const token = sessionData?.session?.access_token;
  const fd = new FormData();
  fd.append('image', ready);
  let res;
  try {
    res = await fetch('/api/upload/product-image', {
      method: 'POST',
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      body: fd,
    });
  } catch {
    throw new Error('Network error during image upload');
  }
  const json = await res.json().catch(() => ({}));
  if (!json.success || !json.url) {
    console.error('[image-upload] backend response:', JSON.stringify(json));
    throw new Error(json.message || json.error || 'Image upload failed');
  }
  return json.url;
}

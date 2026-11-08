import { supabase as supabaseClient } from './supabaseClient';

// The API accepts images up to 4 MB (backend/src/routes/upload.js). Phone
// photos are often bigger, so large or very high-resolution images are scaled
// down in the browser first instead of being rejected.
export const MAX_UPLOAD_BYTES = 4 * 1024 * 1024;
const SHRINK_ABOVE_BYTES = 3 * 1024 * 1024;
const MAX_EDGE_PX = 2000;
export const ACCEPTED_TYPES = 'image/jpeg,image/png,image/webp';

async function shrinkIfNeeded(file) {
  if (!/^image\/(jpeg|png|webp)$/.test(file.type)) throw new Error('Choose a JPG, PNG or WebP image.');
  if (file.size > 30 * 1024 * 1024) throw new Error('Choose a photo under 30 MB so your device can resize it safely.');
  let bitmap, release = () => {};
  try {
    if (typeof createImageBitmap === 'function') bitmap = await createImageBitmap(file);
    else {
      const url = URL.createObjectURL(file); release = () => URL.revokeObjectURL(url);
      bitmap = await new Promise((resolve, reject) => { const img = new Image(); img.onload = () => resolve(img); img.onerror = reject; img.src = url; });
    }
    const width = bitmap.width, height = bitmap.height;
    if (!width || !height) throw new Error('Invalid image');
    if (Math.max(width,height) <= MAX_EDGE_PX && file.size <= SHRINK_ABOVE_BYTES) return file;
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    if (!context) throw new Error('Image resizing is unavailable');
    // WebP preserves transparency. Browsers without WebP encoding fall back to PNG.
    const type = file.type === 'image/jpeg' ? 'image/jpeg' : 'image/webp';
    for (let attempt = 0; attempt < 5; attempt++) {
      const scale = Math.min(1, MAX_EDGE_PX * Math.pow(0.8, attempt) / Math.max(width,height));
      canvas.width = Math.max(1, Math.round(width * scale));
      canvas.height = Math.max(1, Math.round(height * scale));
      context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
      const blob = await new Promise(resolve => canvas.toBlob(resolve, type, Math.max(0.65,0.88-attempt*0.05)));
      if (blob && blob.size <= SHRINK_ABOVE_BYTES) {
        const ext = blob.type === 'image/webp' ? 'webp' : blob.type === 'image/png' ? 'png' : 'jpg';
        return new File([blob], file.name.replace(/\.[^.]+$/, '') + '.' + ext, {type:blob.type});
      }
    }
    if (file.size <= MAX_UPLOAD_BYTES) return file;
    throw new Error('The photo is still too large after resizing. Try a smaller image.');
  } catch (error) {
    if (file.size <= MAX_UPLOAD_BYTES) return file;
    throw new Error(error?.message || 'Could not resize this photo. Try exporting it as JPG or WebP.');
  } finally { bitmap?.close?.(); release(); }
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
  if (!res.ok || !json.success || !json.url) {
    console.error('[image-upload] backend response:', JSON.stringify(json));
    throw new Error(json.message || json.error || 'Image upload failed');
  }
  return json.url;
}
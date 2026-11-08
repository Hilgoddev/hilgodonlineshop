// Variant helpers for cart lines. Mirror of backend/src/lib/variants.js
// (cleanOptions + variantKey) — keep the two in sync, the server recomputes
// the key and the two must agree for cart lines to match up.

export function cleanOptions(raw) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
  const clean = {};
  for (const [k, v] of Object.entries(raw)) {
    if (v == null) continue;
    const key = String(k).slice(0, 30);
    const val = String(v).trim().slice(0, 60);
    if (val) clean[key] = val;
  }
  return Object.keys(clean).length ? clean : null;
}

// Stable identity of a chosen variant: "color=#ff0000|size=m" ('' for none).
export function variantKey(options) {
  const o = cleanOptions(options);
  if (!o) return '';
  return Object.keys(o).sort().map((k) => `${k}=${String(o[k]).toLowerCase()}`).join('|');
}

// True when the product offers colours and none has been chosen yet.
export function needsColor(product, options) {
  return (product?.color_options?.length || 0) > 0 && !options?.color;
}

export function needsSize(product, options) {
  const sizes = Array.isArray(product?.size_options) ? product.size_options : [];
  return sizes.length > 0 && !sizes.some(size => String(size).trim().toLowerCase() === String(options?.size || '').trim().toLowerCase());
}

// The photo a seller linked to a colour, if any.
export function colorImage(product, color) {
  if (!color || !product?.color_images) return null;
  const want = String(color).toLowerCase();
  const hit = Object.entries(product.color_images).find(([c]) => c.toLowerCase() === want);
  return hit ? hit[1] : null;
}

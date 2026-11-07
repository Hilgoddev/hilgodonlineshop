// Product media + variant helpers shared by the product, cart and order routes.
// Frontend mirror of variantKey/cleanOptions: frontend/lib/variants.js — keep in sync.

const { colorName } = require('../utils/colorName');

const MAX_URL_LENGTH = 2048;
const HEX_RE = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i;
const COLOR_NAME_RE = /^[a-z][a-z \-]{0,29}$/i;

// Images: any number of http(s) URLs or site-relative paths ("/images/x.jpg").
// Trims, drops blanks/duplicates, keeps order (the first image is the main one).
// Returns null when the input isn't an array.
function sanitizeImages(raw) {
  if (!Array.isArray(raw)) return null;
  const seen = new Set();
  const out = [];
  for (const v of raw) {
    if (typeof v !== 'string') continue;
    const url = v.trim();
    if (!url || url.length > MAX_URL_LENGTH || !/^(https?:\/\/|\/(?!\/))/i.test(url) || seen.has(url)) continue;
    seen.add(url);
    out.push(url);
  }
  return out;
}

// One colour value: "#RRGGBB" (lower-cased, #RGB expanded) or a plain name like "Red".
function normalizeColor(value) {
  if (typeof value !== 'string') return null;
  const v = value.trim();
  if (HEX_RE.test(v)) {
    let h = v.slice(1).toLowerCase();
    if (h.length === 3) h = h.split('').map((c) => c + c).join('');
    return `#${h}`;
  }
  return COLOR_NAME_RE.test(v) ? v : null;
}

// Colours: any number, de-duplicated (case-insensitive). Returns null for non-arrays.
function sanitizeColors(raw) {
  if (!Array.isArray(raw)) return null;
  const seen = new Set();
  const out = [];
  for (const v of raw) {
    const c = normalizeColor(v);
    if (!c || seen.has(c.toLowerCase())) continue;
    seen.add(c.toLowerCase());
    out.push(c);
  }
  return out;
}

// { colour: imageUrl } — keeps only colours the product offers and images it has.
function sanitizeColorImages(raw, colors, images) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
  const colorByKey = new Map((colors || []).map((c) => [c.toLowerCase(), c]));
  const imageSet = new Set(images || []);
  const out = {};
  for (const [k, url] of Object.entries(raw)) {
    const c = normalizeColor(k);
    const color = c && colorByKey.get(c.toLowerCase());
    if (color && typeof url === 'string' && imageSet.has(url.trim())) out[color] = url.trim();
  }
  return Object.keys(out).length ? out : null;
}

// Keep only short string values, so a client can't stuff large data onto a line.
function cleanOptions(raw) {
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

// Stable identity of a chosen variant: "color=#ff0000|size=M" ('' for none).
function variantKey(options) {
  const o = cleanOptions(options);
  if (!o) return '';
  return Object.keys(o).sort().map((k) => `${k}=${String(o[k]).toLowerCase()}`).join('|');
}

// Check a buyer's options against the product. A product with colours requires
// one; a chosen colour/size must be one the product offers. Returns
// { options, error } with option values snapped to the product's stored spelling.
function resolveOptionsForProduct(product, raw) {
  const options = { ...(cleanOptions(raw) || {}) };
  const colors = Array.isArray(product?.color_options) ? product.color_options : [];
  const sizes = Array.isArray(product?.size_options) ? product.size_options : [];
  const label = product?.name ? `"${product.name}"` : 'this product';

  if (colors.length) {
    if (!options.color) return { options: null, error: `Please choose a colour for ${label}.` };
    const want = normalizeColor(options.color);
    const match = want && colors.find((c) => String(c).toLowerCase() === want.toLowerCase());
    if (!match) return { options: null, error: `The colour ${colorName(options.color)} is not available for ${label}.` };
    options.color = match;
  } else {
    delete options.color;
  }

  if (sizes.length && options.size) {
    const match = sizes.find((s) => String(s).toLowerCase() === String(options.size).toLowerCase());
    if (!match) return { options: null, error: `The size ${options.size} is not available for ${label}.` };
    options.size = match;
  } else if (!sizes.length) {
    delete options.size;
  }

  return { options: Object.keys(options).length ? options : null, error: null };
}

module.exports = {
  sanitizeImages,
  sanitizeColors,
  sanitizeColorImages,
  normalizeColor,
  cleanOptions,
  variantKey,
  resolveOptionsForProduct,
};

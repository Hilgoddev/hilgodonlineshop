// Backend mirror of frontend/lib/colorName.js — keep the two in sync.
// Product color options are stored as hex (e.g. "#1560bd"); buyers (and emails)
// should see "Denim", not the hex code. Values that are already names pass through.

const NAMED_COLORS = {
  // Neutrals
  Black: '#000000', White: '#ffffff', 'Off White': '#faf9f6', Gray: '#808080',
  'Light Gray': '#d3d3d3', 'Dark Gray': '#4b4b4b', Silver: '#c0c0c0', Charcoal: '#36454f',
  Slate: '#708090', Smoke: '#738276', Cream: '#fffdd0', Ivory: '#fffff0', Beige: '#f5f5dc',
  Tan: '#d2b48c', Taupe: '#b38b6d', Stone: '#ada587', Nude: '#e3bc9a',
  // Reds & pinks
  Red: '#ff0000', Crimson: '#dc143c', Scarlet: '#ff2400', Maroon: '#800000',
  Burgundy: '#800020', Wine: '#722f37', Cherry: '#990f1c', Rose: '#ff007f',
  Pink: '#ffc0cb', 'Hot Pink': '#ff69b4', Blush: '#de5d83', Fuchsia: '#ff00ff',
  Coral: '#ff7f50', Salmon: '#fa8072', Peach: '#ffe5b4',
  // Oranges, yellows, browns
  Orange: '#ffa500', Tangerine: '#f28500', Amber: '#ffbf00', 'Burnt Orange': '#cc5500',
  Gold: '#ffd700', Mustard: '#ffdb58', Yellow: '#ffff00', Lemon: '#fff44f',
  Khaki: '#f0e68c', Camel: '#c19a6b', Brown: '#a52a2a', Chocolate: '#7b3f00',
  Coffee: '#6f4e37', Caramel: '#af6e4d', Bronze: '#cd7f32', Copper: '#b87333',
  Rust: '#b7410e', Terracotta: '#e2725b',
  // Greens
  Green: '#008000', Emerald: '#50c878', 'Forest Green': '#228b22', Lime: '#00ff00',
  Olive: '#808000', 'Army Green': '#4b5320', Mint: '#98ff98', Sage: '#9caf88',
  Teal: '#008080', 'Sea Green': '#2e8b57',
  // Blues
  Blue: '#0000ff', Navy: '#000080', 'Royal Blue': '#4169e1', Cobalt: '#0047ab',
  'Steel Blue': '#4682b4', 'Sky Blue': '#87ceeb', 'Light Blue': '#add8e6',
  'Baby Blue': '#89cff0', 'Powder Blue': '#b0e0e6', Denim: '#1560bd',
  Turquoise: '#40e0d0', Cyan: '#00ffff',
  // Purples
  Purple: '#800080', Indigo: '#4b0082', Violet: '#ee82ee', Lavender: '#e6e6fa',
  Lilac: '#c8a2c8', Mauve: '#e0b0ff', Plum: '#8e4585', Magenta: '#ff00ff',
  // Metallics
  'Rose Gold': '#b76e79',
};

function hexToRgb(hex) {
  let h = String(hex).replace('#', '').trim();
  if (h.length === 3) h = h.split('').map((c) => c + c).join('');
  if (h.length !== 6 || /[^0-9a-fA-F]/.test(h)) return null;
  return { r: parseInt(h.slice(0, 2), 16), g: parseInt(h.slice(2, 4), 16), b: parseInt(h.slice(4, 6), 16) };
}

function colorName(value) {
  if (value == null) return '';
  const v = String(value).trim();
  if (!v.startsWith('#')) return v; // already a name like "Red"
  const rgb = hexToRgb(v);
  if (!rgb) return v;
  let best = v, bestDist = Infinity;
  for (const [name, hex] of Object.entries(NAMED_COLORS)) {
    const c = hexToRgb(hex);
    const d = (c.r - rgb.r) ** 2 + (c.g - rgb.g) ** 2 + (c.b - rgb.b) ** 2;
    if (d < bestDist) { bestDist = d; best = name; }
  }
  return best;
}

// Format a selected-option value for display: color keys get a name, others pass through.
function formatOptionValue(key, value) {
  return String(key).toLowerCase() === 'color' ? colorName(value) : value;
}

// Build a compact " · Color: Denim · Size: M" string from a selectedOptions object.
function optionsSummary(selectedOptions) {
  if (!selectedOptions || typeof selectedOptions !== 'object') return '';
  const parts = Object.entries(selectedOptions)
    .filter(([, v]) => v != null && String(v).trim() !== '')
    .map(([k, v]) => `${k}: ${formatOptionValue(k, v)}`);
  return parts.join(' · ');
}

module.exports = { colorName, formatOptionValue, optionsSummary };

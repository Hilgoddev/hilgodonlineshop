// Map a color value to a human-friendly name. Product color options are stored
// as hex (e.g. "#1560bd"); shoppers should see "Denim", not the hex code.
// If the value is already a name (no leading '#'), it's returned as-is.

const NAMED_COLORS = {
  Black: '#000000', White: '#ffffff', Gray: '#808080', Silver: '#c0c0c0',
  Charcoal: '#36454f', Cream: '#fffdd0', Ivory: '#fffff0', Beige: '#f5f5dc',
  Red: '#ff0000', Crimson: '#dc143c', Maroon: '#800000', Burgundy: '#800020',
  Pink: '#ffc0cb', Coral: '#ff7f50', Salmon: '#fa8072',
  Orange: '#ffa500', Gold: '#ffd700', Yellow: '#ffff00', Khaki: '#f0e68c', Tan: '#d2b48c',
  Brown: '#a52a2a', Chocolate: '#7b3f00',
  Green: '#008000', Lime: '#00ff00', Olive: '#808000', Mint: '#98ff98', Teal: '#008080',
  Blue: '#0000ff', Navy: '#000080', 'Sky Blue': '#87ceeb', 'Light Blue': '#add8e6',
  Denim: '#1560bd', Turquoise: '#40e0d0', Cyan: '#00ffff',
  Purple: '#800080', Indigo: '#4b0082', Violet: '#ee82ee', Lavender: '#e6e6fa', Magenta: '#ff00ff',
};

function hexToRgb(hex) {
  let h = String(hex).replace('#', '').trim();
  if (h.length === 3) h = h.split('').map((c) => c + c).join('');
  if (h.length !== 6 || /[^0-9a-fA-F]/.test(h)) return null;
  return { r: parseInt(h.slice(0, 2), 16), g: parseInt(h.slice(2, 4), 16), b: parseInt(h.slice(4, 6), 16) };
}

export function colorName(value) {
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
export function formatOptionValue(key, value) {
  return String(key).toLowerCase() === 'color' ? colorName(value) : value;
}

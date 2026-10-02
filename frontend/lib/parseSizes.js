// Parses a seller/admin's free-text "sizes" field into a clean list of options.
//
// Sellers type sizes with whatever separator comes to hand — commas, semicolons,
// pipes, or just spaces ("S M L XL XXL"). A plain comma-split only handled the
// first case, so every space- or semicolon-separated entry was saved as one
// giant unselectable size (e.g. "S M L XL XXL" as a single option instead of
// five). This parser recognises the other separators too, but only splits on
// bare whitespace when every resulting piece actually looks like a size — so a
// genuine one-option label that happens to contain a space ("One size",
// "300 pieces", "60ml & 60g") is left intact instead of being torn into
// meaningless fragments.
//
// A size-shaped token is: XS/S/M/L, a run of X's with or without a trailing L
// (X, XX, XXX, XL, XXL, XXXL — this catalog uses both "XXX" and "XXXL" for
// triple-extra-large), a digit-prefixed size (2XL, 4XL), or a bare or
// unit-suffixed number (34, 125cm, 10.5). Anything else ("to", "and",
// "pieces", "CM") fails the test, so the whole piece is kept together rather
// than guessed at.
const SIZE_TOKEN_RE = /^(?:XS|S|M|L|X+L?|[0-9]+XL|[0-9]+(?:\.[0-9]+)?(?:cm|mm|ml|g|kg)?)$/i;

function isSizeToken(token) {
  return SIZE_TOKEN_RE.test(token);
}

// Splits one piece (already separated from its siblings by a comma) on
// semicolons/pipes, then — only where every word in a sub-piece is size-shaped
// — on whitespace too.
function splitPiece(piece) {
  const subPieces = piece.split(/[;|]+/).map((s) => s.trim()).filter(Boolean);
  const out = [];
  for (const sub of subPieces) {
    const words = sub.split(/\s+/).filter(Boolean);
    if (words.length > 1 && words.every(isSizeToken)) {
      out.push(...words);
    } else if (sub) {
      out.push(sub);
    }
  }
  return out;
}

// Parses either a raw comma-separated string (what the form field holds) or an
// already-split array (existing size_options being re-parsed) into a clean,
// de-duplicated list, preserving each entry's original casing.
export function parseSizeInput(input) {
  const entries = Array.isArray(input) ? input : String(input || '').split(',');
  const out = [];
  for (const entry of entries) {
    if (typeof entry !== 'string') continue;
    out.push(...splitPiece(entry.trim()));
  }
  const seen = new Set();
  const result = [];
  for (const s of out) {
    const key = s.toLowerCase();
    if (s && !seen.has(key)) {
      seen.add(key);
      result.push(s);
    }
  }
  return result;
}

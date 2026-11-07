import { colorName } from '../lib/colorName';

// Buyer-facing colour picker: a row of swatches, nothing pre-selected. When
// `error` is set (they tried to add to cart without choosing), the row is
// outlined in red with a prompt so it's obvious what is missing.
// `compact` (cart rows) uses a one-line prompt instead of the full label.
export default function ColorSwatches({ colors = [], value, onChange, error = false, size = 32, label = true, compact = false }) {
  if (!colors.length) return null;
  return (
    <div className={`color-swatches${error ? ' color-swatches--error' : ''}${compact ? ' color-swatches--compact' : ''}`} role="radiogroup" aria-label="Colour">
      {compact && <div className="color-swatches__prompt"><i className="fas fa-circle-exclamation" /> Choose a colour:</div>}
      {label && !compact && (
        <div className="color-swatches__label">
          Colour: <strong>{value ? colorName(value) : 'Choose a colour'}</strong>
          <span className="color-swatches__count">{colors.length} available</span>
        </div>
      )}
      <div className="color-swatches__row">
        {colors.map((color) => {
          const selected = value && String(value).toLowerCase() === String(color).toLowerCase();
          const isHex = String(color).startsWith('#');
          return (
            <button
              key={color}
              type="button"
              role="radio"
              aria-checked={!!selected}
              aria-label={colorName(color)}
              title={colorName(color)}
              onClick={() => onChange(color)}
              className={`color-swatches__swatch${selected ? ' is-selected' : ''}`}
              style={isHex
                ? { width: size, height: size, background: color }
                : { height: size, padding: '0 12px', borderRadius: '999px', width: 'auto' }}
            >
              {!isHex && <span style={{ fontSize: '.8rem', fontWeight: 600 }}>{color}</span>}
              {selected && isHex && <i className="fas fa-check" aria-hidden="true" />}
            </button>
          );
        })}
      </div>
      {error && !compact && <div className="color-swatches__error"><i className="fas fa-circle-exclamation" /> Please choose a colour first.</div>}
    </div>
  );
}

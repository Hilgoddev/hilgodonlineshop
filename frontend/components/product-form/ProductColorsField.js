import { useState } from 'react';
import { colorName } from '../../lib/colorName';

// Common colours, one click to add. Values match lib/colorName.js so buyers see
// the same names.
const PRESETS = [
  '#000000', '#ffffff', '#808080', '#ff0000', '#800020', '#ffc0cb', '#ffa500', '#ffff00',
  '#ffd700', '#008000', '#808000', '#000080', '#0000ff', '#87ceeb', '#800080', '#a52a2a',
  '#f5f5dc', '#c0c0c0',
];

const same = (a, b) => String(a).toLowerCase() === String(b).toLowerCase();

// Colour editor shared by the seller and admin product forms. Any number of
// colours; buyers must pick one of them before the product can go in the cart.
// Each colour can be linked to one of the product photos (`colorImages`:
// { colour: imageUrl }) so the gallery switches to it when a buyer picks it.
export default function ProductColorsField({ colors, onChange, colorImages = {}, onColorImagesChange, images = [] }) {
  const [custom, setCustom] = useState('#1560bd');
  const photos = images.filter(Boolean);

  const has = (c) => colors.some((x) => same(x, c));
  const add = (c) => { if (!has(c)) onChange([...colors, c.toLowerCase()]); };
  const remove = (c) => {
    onChange(colors.filter((x) => !same(x, c)));
    if (colorImages[c]) { const { [c]: _, ...rest } = colorImages; onColorImagesChange(rest); }
  };
  const toggle = (c) => (has(c) ? remove(colors.find((x) => same(x, c))) : add(c));
  const linkPhoto = (c, url) => {
    const { [c]: _, ...rest } = colorImages;
    onColorImagesChange(url ? { ...rest, [c]: url } : rest);
  };

  return (
    <div className="pf-colors">
      <div className="pf-title">
        <i className="fas fa-palette"></i> Colours <span className="pf-optional">(optional · add as many as you sell)</span>
      </div>

      <div className="pf-colors__presets" role="group" aria-label="Quick colours">
        {PRESETS.map((c) => (
          <button
            key={c}
            type="button"
            className={`pf-colors__preset${has(c) ? ' is-on' : ''}`}
            style={{ background: c }}
            title={`${has(c) ? 'Remove' : 'Add'} ${colorName(c)}`}
            aria-pressed={has(c)}
            onClick={() => toggle(c)}
          >
            {has(c) && <i className="fas fa-check" />}
          </button>
        ))}
      </div>

      <div className="pf-colors__custom">
        <input type="color" value={custom} onChange={(e) => setCustom(e.target.value)} aria-label="Pick a custom colour" />
        <span className="pf-colors__custom-name">{colorName(custom)}</span>
        <button type="button" className="btn btn-outline btn-sm" onClick={() => add(custom)} disabled={has(custom)}>
          <i className="fas fa-plus"></i> Add colour
        </button>
      </div>

      {colors.length > 0 ? (
        <ul className="pf-colors__list">
          {colors.map((c) => (
            <li key={c} className="pf-colors__item">
              <span className="pf-colors__dot" style={{ background: c }} />
              <span className="pf-colors__name">{colorName(c)}</span>
              {photos.length > 0 && (
                <label className="pf-colors__photo">
                  {colorImages[c] && photos.includes(colorImages[c])
                    ? <img src={colorImages[c]} alt="" />
                    : <i className="fas fa-image" />}
                  <select
                    value={photos.includes(colorImages[c]) ? colorImages[c] : ''}
                    onChange={(e) => linkPhoto(c, e.target.value)}
                    aria-label={`Photo for ${colorName(c)}`}
                  >
                    <option value="">No photo</option>
                    {photos.map((url, i) => <option key={url} value={url}>Photo {i + 1}{i === 0 ? ' (main)' : ''}</option>)}
                  </select>
                </label>
              )}
              <button type="button" className="pf-colors__remove" onClick={() => remove(c)} aria-label={`Remove ${colorName(c)}`}>
                <i className="fas fa-xmark"></i>
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <div className="pf-hint">No colours yet — tap a swatch above or pick a custom colour.</div>
      )}
      {colors.length > 0 && (
        <div className="pf-hint">
          Buyers must choose one of these {colors.length} colour{colors.length === 1 ? '' : 's'} before adding to cart.
          {photos.length > 0 && ' Link a photo so the gallery shows that colour when it’s picked.'}
        </div>
      )}
    </div>
  );
}

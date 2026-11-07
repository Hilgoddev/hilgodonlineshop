import { useEffect, useRef, useState } from 'react';
import { uploadProductImage, ACCEPTED_TYPES } from '../../lib/uploadImage';

export const DEFAULT_IMAGE_SLOTS = 3;
export const emptyImageSlots = () => Array(DEFAULT_IMAGE_SLOTS).fill('');

// Product photo editor shared by the seller and admin product forms.
// `images` is the list of slots (URL or '' for an empty slot); there is no upper
// limit — three slots to start, "Add more" for as many as the product needs,
// or pick/drop several files at once. The first photo is the main one.
// `onChange` receives an updater (prev => next) so concurrent uploads never
// overwrite each other. `onBusyChange(true|false)` reports uploads in flight.
export default function ProductImagesField({ images, onChange, onBusyChange, onError }) {
  const [uploading, setUploading] = useState(() => new Set());
  const [dragOver, setDragOver] = useState(false);
  const slotInputs = useRef({});
  const bulkInput = useRef(null);

  useEffect(() => { onBusyChange?.(uploading.size > 0); }, [uploading, onBusyChange]);

  const filled = images.filter(Boolean).length;
  const busy = uploading.size > 0;

  const setUploadingAt = (index, on) => setUploading((prev) => {
    const next = new Set(prev);
    if (on) next.add(index); else next.delete(index);
    return next;
  });

  const uploadInto = async (index, file) => {
    setUploadingAt(index, true);
    try {
      const url = await uploadProductImage(file);
      onChange((prev) => { const n = [...prev]; n[index] = url; return n; });
    } catch (err) {
      onError?.(err.message);
    } finally {
      setUploadingAt(index, false);
    }
  };

  // Several files: fill the empty slots first, then add new slots for the rest.
  const uploadMany = (fileList) => {
    const files = [...(fileList || [])].filter((f) => f.type.startsWith('image/'));
    if (!files.length) return;
    const targets = [];
    images.forEach((url, i) => { if (!url && !uploading.has(i) && targets.length < files.length) targets.push(i); });
    let next = images.length;
    while (targets.length < files.length) targets.push(next++);
    if (next > images.length) onChange((prev) => [...prev, ...Array(next - prev.length).fill('')]);
    files.forEach((file, k) => uploadInto(targets[k], file));
  };

  const setUrl = (index, url) => onChange((prev) => { const n = [...prev]; n[index] = url; return n; });

  // Removing keeps at least three slots, so the grid never collapses.
  const removeAt = (index) => onChange((prev) => {
    const n = [...prev];
    if (n.length > DEFAULT_IMAGE_SLOTS) n.splice(index, 1); else n[index] = '';
    return n;
  });

  const move = (from, to) => onChange((prev) => {
    if (to < 0 || to >= prev.length) return prev;
    const n = [...prev];
    const [item] = n.splice(from, 1);
    n.splice(to, 0, item);
    return n;
  });

  const addSlot = () => onChange((prev) => [...prev, '']);

  return (
    <div
      className={`pf-images${dragOver ? ' is-dragover' : ''}`}
      onDragOver={(e) => { if ([...e.dataTransfer.types].includes('Files')) { e.preventDefault(); setDragOver(true); } }}
      onDragLeave={() => setDragOver(false)}
      onDrop={(e) => { if (e.dataTransfer.files?.length) { e.preventDefault(); setDragOver(false); uploadMany(e.dataTransfer.files); } }}
    >
      <div className="pf-images__head">
        <div>
          <div className="pf-title">
            <i className="fas fa-images"></i> Product Images <span className="pf-required">*</span>
          </div>
          <div className="pf-hint">
            {filled} photo{filled === 1 ? '' : 's'} added · no limit · the first photo is the main one
          </div>
        </div>
        <button type="button" className="btn btn-outline btn-sm" onClick={() => bulkInput.current?.click()}>
          <i className="fas fa-upload"></i> Upload several
        </button>
        <input ref={bulkInput} type="file" accept={ACCEPTED_TYPES} multiple style={{ display: 'none' }}
          onChange={(e) => { uploadMany(e.target.files); e.target.value = ''; }} />
      </div>

      <div className="pf-images__grid">
        {images.map((url, index) => {
          const isUploading = uploading.has(index);
          return (
            <div key={index} className={`pf-slot${index === 0 ? ' pf-slot--main' : ''}`}>
              <button
                type="button"
                className="pf-slot__preview"
                onClick={() => !isUploading && slotInputs.current[index]?.click()}
                title={url ? 'Replace this photo' : 'Choose a photo'}
              >
                {isUploading ? (
                  <i className="fas fa-spinner fa-spin pf-slot__spinner" />
                ) : url ? (
                  <img src={url} alt={`Product photo ${index + 1}`} onError={(e) => { e.currentTarget.style.opacity = '.25'; }} />
                ) : (
                  <span className="pf-slot__empty">
                    <i className="fas fa-camera"></i>
                    {index === 0 ? 'Main photo' : `Photo ${index + 1}`}
                  </span>
                )}
                {index === 0 && url && <span className="pf-slot__badge">Main</span>}
              </button>
              <input
                ref={(el) => { slotInputs.current[index] = el; }}
                type="file"
                accept={ACCEPTED_TYPES}
                style={{ display: 'none' }}
                onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadInto(index, f); e.target.value = ''; }}
              />
              <input
                className="form-input pf-slot__url"
                placeholder="…or paste image URL"
                value={url}
                onChange={(e) => setUrl(index, e.target.value.trim())}
                disabled={isUploading}
              />
              <div className="pf-slot__actions">
                <button type="button" title="Move left" aria-label="Move left" disabled={busy || index === 0} onClick={() => move(index, index - 1)}>
                  <i className="fas fa-arrow-left"></i>
                </button>
                {index > 0 && url && (
                  <button type="button" title="Make main photo" disabled={busy} onClick={() => move(index, 0)}>
                    <i className="fas fa-star"></i>
                  </button>
                )}
                <button type="button" title="Move right" aria-label="Move right" disabled={busy || index === images.length - 1} onClick={() => move(index, index + 1)}>
                  <i className="fas fa-arrow-right"></i>
                </button>
                <button type="button" className="pf-slot__remove" title="Remove" aria-label="Remove photo"
                  disabled={busy || (!url && images.length <= DEFAULT_IMAGE_SLOTS)} onClick={() => removeAt(index)}>
                  <i className="fas fa-trash-can"></i>
                </button>
              </div>
            </div>
          );
        })}

        <button type="button" className="pf-slot pf-slot--add" onClick={addSlot}>
          <i className="fas fa-plus"></i>
          Add more images
        </button>
      </div>

      <div className="pf-hint" style={{ marginTop: '10px' }}>
        JPEG, PNG or WebP · large photos are resized automatically · drag & drop photos here
      </div>
    </div>
  );
}

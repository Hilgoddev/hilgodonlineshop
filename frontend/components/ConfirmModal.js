export default function ConfirmModal({
  isOpen,
  title,
  message,
  onConfirm,
  onCancel,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  danger = false,
  type = 'confirm',
}) {
  if (!isOpen) return null;

  const handleOverlayClick = () => {
    if (type === 'alert') onConfirm();
    else onCancel();
  };

  return (
    <div
      onClick={handleOverlayClick}
      style={{
        position: 'fixed', inset: 0, zIndex: 9999,
        background: 'rgba(0,0,0,0.5)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '20px',
        animation: 'fadeIn .15s ease',
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: '#fff', borderRadius: '16px', padding: '28px 24px',
          maxWidth: '400px', width: '100%',
          boxShadow: '0 20px 60px rgba(0,0,0,0.2)',
          animation: 'slideUp .2s ease',
        }}
      >
        {danger && (
          <div style={{
            width: '48px', height: '48px', borderRadius: '50%',
            background: '#fef2f2', display: 'flex', alignItems: 'center',
            justifyContent: 'center', margin: '0 auto 16px',
          }}>
            <i className="fas fa-triangle-exclamation" style={{ color: '#ef4444', fontSize: '1.25rem' }} />
          </div>
        )}
        {!danger && type === 'alert' && (
          <div style={{
            width: '48px', height: '48px', borderRadius: '50%',
            background: '#f0fdf4', display: 'flex', alignItems: 'center',
            justifyContent: 'center', margin: '0 auto 16px',
          }}>
            <i className="fas fa-circle-check" style={{ color: '#16a34a', fontSize: '1.25rem' }} />
          </div>
        )}
        <h3 style={{
          fontSize: '1.05rem', fontWeight: '700', color: '#1e293b',
          margin: '0 0 8px', textAlign: 'center',
        }}>{title}</h3>
        <p style={{
          color: '#64748b', margin: '0 0 24px', textAlign: 'center',
          fontSize: '0.93rem', lineHeight: '1.55',
        }}>{message}</p>
        <div style={{ display: 'flex', gap: '10px' }}>
          {type === 'confirm' && (
            <button
              onClick={onCancel}
              style={{
                flex: 1, padding: '11px 20px', borderRadius: '10px',
                border: '1.5px solid #e2e8f0', background: '#fff',
                color: '#64748b', fontWeight: '600', cursor: 'pointer',
                fontSize: '0.93rem', transition: 'background .15s',
              }}
            >
              {cancelText}
            </button>
          )}
          <button
            onClick={onConfirm}
            style={{
              flex: 1, padding: '11px 20px', borderRadius: '10px',
              border: '1.5px solid transparent',
              background: danger ? '#ef4444' : 'var(--primary, #e63946)',
              color: '#fff', fontWeight: '600', cursor: 'pointer',
              fontSize: '0.93rem', transition: 'opacity .15s',
            }}
          >
            {type === 'alert' ? (confirmText === 'Confirm' ? 'OK' : confirmText) : confirmText}
          </button>
        </div>
      </div>
      <style>{`
        @keyframes fadeIn { from { opacity:0 } to { opacity:1 } }
        @keyframes slideUp { from { transform:translateY(12px); opacity:0 } to { transform:translateY(0); opacity:1 } }
      `}</style>
    </div>
  );
}

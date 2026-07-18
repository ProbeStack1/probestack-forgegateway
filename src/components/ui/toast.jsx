import React, { useEffect } from 'react';
import { CheckCircle, AlertCircle, X } from 'lucide-react';

export default function Toast({ message, type = 'success', onClose }) {
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose();
    }, 4000);
    return () => clearTimeout(timer);
  }, [onClose]);

  if (!message) return null;

  const isSuccess = type === 'success';
  const color     = isSuccess ? '#10b981' : '#ef4444';
  const ca        = (a) => isSuccess ? `rgba(16,185,129,${a})` : `rgba(239,68,68,${a})`;

  return (
    <div className="fixed top-5 right-5 z-[9999] animate-slideIn">
      {/* gradient-border ring — same pattern as GatewayContextBanner */}
      <div
        style={{
          padding: 1,
          borderRadius: 14,
          background: `linear-gradient(135deg, ${ca(0.65)} 0%, ${ca(0.08)} 50%, ${ca(0.45)} 100%)`,
          boxShadow: `0 20px 48px rgba(0,0,0,0.65), 0 0 36px ${ca(0.14)}`,
        }}
      >
        {/* glassmorphic inner panel */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            padding: '13px 15px',
            borderRadius: 13,
            background: 'linear-gradient(135deg, rgba(10,14,36,0.99) 0%, rgba(21,25,43,0.99) 100%)',
            backdropFilter: 'blur(32px)',
            WebkitBackdropFilter: 'blur(32px)',
            minWidth: 300,
            maxWidth: 400,
            boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.07), inset 0 -1px 0 rgba(0,0,0,0.25)',
          }}
        >
          {/* icon box */}
          <div
            style={{
              flexShrink: 0,
              width: 36,
              height: 36,
              borderRadius: 10,
              background: ca(0.12),
              border: `1px solid ${ca(0.28)}`,
              backdropFilter: 'blur(8px)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {isSuccess
              ? <CheckCircle style={{ width: 17, height: 17, color }} strokeWidth={2} />
              : <AlertCircle style={{ width: 17, height: 17, color }} strokeWidth={2} />}
          </div>

          {/* text */}
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{
              fontFamily: "'Space Grotesk', sans-serif",
              fontSize: 10,
              fontWeight: 700,
              letterSpacing: '0.12em',
              textTransform: 'uppercase',
              color: ca(0.85),
              marginBottom: 3,
              lineHeight: 1,
            }}>
              {isSuccess ? 'Success' : 'Error'}
            </p>
            <p style={{
              fontFamily: "'Inter', sans-serif",
              fontSize: 13,
              fontWeight: 500,
              color: 'rgba(226,232,240,0.90)',
              lineHeight: 1.45,
            }}>
              {message}
            </p>
          </div>

          {/* close */}
          <button
            onClick={onClose}
            style={{
              flexShrink: 0,
              width: 26,
              height: 26,
              borderRadius: 7,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'rgba(148,163,184,0.65)',
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'rgba(255,255,255,0.08)';
              e.currentTarget.style.color = 'rgba(226,232,240,1)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'transparent';
              e.currentTarget.style.color = 'rgba(148,163,184,0.65)';
            }}
          >
            <X style={{ width: 13, height: 13 }} strokeWidth={2.5} />
          </button>
        </div>
      </div>
    </div>
  );
}

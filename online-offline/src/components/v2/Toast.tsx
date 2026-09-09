'use client';

import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { Accent, accentVar, SANS } from './shared';

// No visual mock exists in the design HTML (the READMEs only say "replace
// alert() with a toast"), so this is composed from the system vocabulary:
// --bg2 card, 1px --line2 border, 12px radius, 13.5px sans, optional 6px
// accent dot (color at rest is a dot, per the color rules).

export interface ToastProps {
  open: boolean;
  message: React.ReactNode;
  /** 6px dot color. Omit for no dot. */
  accent?: Accent;
  /** Auto-dismiss after this many ms (default 2600). 0 disables. */
  duration?: number;
  onClose: () => void;
}

export function Toast({ open, message, accent, duration = 2600, onClose }: ToastProps) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!open || !duration) return;
    const t = setTimeout(onClose, duration);
    return () => clearTimeout(t);
  }, [open, duration, onClose]);

  if (!mounted || !open) return null;

  return createPortal(
    <div
      role="status"
      style={{
        position: 'fixed',
        left: '50%',
        bottom: 96,
        transform: 'translateX(-50%)',
        zIndex: 60,
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        maxWidth: 'calc(100vw - 48px)',
        padding: '12px 18px',
        background: 'var(--bg2)',
        borderWidth: 1,
        borderStyle: 'solid',
        borderColor: 'var(--line2)',
        borderRadius: 12,
        boxShadow: '0 12px 40px rgba(0,0,0,0.5)',
        font: `400 13.5px/1.3 ${SANS}`,
        color: 'var(--ink)',
        animation: 'v2-toast-in 240ms ease-out',
      }}
    >
      {accent && (
        <span
          aria-hidden="true"
          style={{
            width: 6,
            height: 6,
            borderRadius: '50%',
            background: accentVar(accent),
            flex: 'none',
          }}
        />
      )}
      {message}
    </div>,
    document.body
  );
}

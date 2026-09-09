'use client';

import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { SANS, SERIF } from './shared';

// Design HTML `.sheet` + `.dim`: bottom sheet, --bg2, 1px --line2 top border,
// 20px top radius, 36×4 grabber, 45% scrim. Slide up 240ms; scrim tap closes.

export interface SheetProps {
  open: boolean;
  onClose: () => void;
  /** Serif 22px heading. */
  title?: React.ReactNode;
  /** 12.5px sans --ink3 line under the title. */
  subtitle?: React.ReactNode;
  children?: React.ReactNode;
}

export function Sheet({ open, onClose, title, subtitle, children }: SheetProps) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted || !open) return null;

  return createPortal(
    <div style={{ position: 'fixed', inset: 0, zIndex: 50 }}>
      <div
        onClick={onClose}
        aria-hidden="true"
        style={{
          position: 'absolute',
          inset: 0,
          background: 'rgba(0,0,0,0.45)',
          animation: 'v2-fade-in 240ms ease-out',
        }}
      />
      <div
        role="dialog"
        aria-modal="true"
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          bottom: 0,
          background: 'var(--bg2)',
          borderTop: '1px solid var(--line2)',
          borderRadius: '20px 20px 0 0',
          padding: '14px 24px 26px',
          boxShadow: '0 -30px 60px rgba(0,0,0,0.6)',
          animation: 'v2-sheet-up 240ms ease-out',
          maxHeight: '80vh',
          overflowY: 'auto',
        }}
      >
        <div
          style={{
            width: 36,
            height: 4,
            borderRadius: 2,
            background: 'var(--line2)',
            margin: '0 auto 16px',
          }}
        />
        {title !== undefined && (
          <h4 style={{ margin: 0, font: `400 22px/1.1 ${SERIF}`, color: 'var(--ink)' }}>{title}</h4>
        )}
        {subtitle !== undefined && (
          <p style={{ margin: '4px 0 14px', font: `400 12.5px/1 ${SANS}`, color: 'var(--ink3)' }}>
            {subtitle}
          </p>
        )}
        {children}
      </div>
    </div>,
    document.body
  );
}

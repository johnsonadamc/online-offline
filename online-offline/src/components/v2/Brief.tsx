'use client';

import React, { useState } from 'react';
import { SectionLabel } from './SectionLabel';
import { SERIF } from './shared';
import { Icon } from './icons';

// Design HTML `.brief`: collapsible prompt panel, 1px --line2 border, 10px
// radius, gold PROMPT label, serif 16px/1.5 body; chevron collapses.

export interface BriefProps {
  /** Header label. Default "Prompt". */
  label?: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
  style?: React.CSSProperties;
}

export function Brief({ label = 'Prompt', children, defaultOpen = true, style }: BriefProps) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div
      style={{
        borderWidth: 1,
        borderStyle: 'solid',
        borderColor: 'var(--line2)',
        borderRadius: 10,
        padding: '14px 16px',
        ...style,
      }}
    >
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          width: '100%',
          background: 'transparent',
          borderWidth: 0,
          padding: 0,
          cursor: 'pointer',
          WebkitTapHighlightColor: 'transparent',
        }}
      >
        <SectionLabel accent="gold">{label}</SectionLabel>
        <Icon
          name="chevron"
          size={12}
          strokeWidth={1.5}
          style={{
            color: 'var(--ink3)',
            transform: open ? 'rotate(90deg)' : 'none',
            transition: 'transform 200ms ease-out',
          }}
        />
      </button>
      {open && (
        <p style={{ margin: '8px 0 0', font: `400 16px/1.5 ${SERIF}`, color: 'var(--ink)' }}>
          {children}
        </p>
      )}
    </div>
  );
}

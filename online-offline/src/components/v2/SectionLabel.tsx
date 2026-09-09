import React from 'react';
import { Accent, accentVar, MONO } from './shared';

// Design HTML `.k` / `.sec`: 10px mono 500, .18em tracking, uppercase, --ink3.

export interface SectionLabelProps {
  children: React.ReactNode;
  /** Accent color (e.g. gold PROMPT label). Default --ink3. */
  accent?: Accent;
  style?: React.CSSProperties;
}

export function SectionLabel({ children, accent, style }: SectionLabelProps) {
  return (
    <span
      style={{
        font: `500 10px/1 ${MONO}`,
        letterSpacing: '0.18em',
        textTransform: 'uppercase',
        color: accent ? accentVar(accent) : 'var(--ink3)',
        ...style,
      }}
    >
      {children}
    </span>
  );
}

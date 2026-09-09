'use client';

import React from 'react';
import { Accent, accentVar, SANS, SERIF } from './shared';

// Design HTML `.choice div`: 1px --line2 border, 8px radius, serif 17px title
// + 11.5px sans desc --ink3; active border takes the accent.

export interface ChoiceCardProps {
  title: string;
  description?: string;
  selected?: boolean;
  /** Border color when selected. Default orange (submit). */
  accent?: Accent;
  onClick?: () => void;
  style?: React.CSSProperties;
}

export function ChoiceCard({
  title,
  description,
  selected,
  accent = 'orange',
  onClick,
  style,
}: ChoiceCardProps) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onClick}
      style={{
        borderWidth: 1,
        borderStyle: 'solid',
        borderColor: selected ? accentVar(accent) : 'var(--line2)',
        borderRadius: 8,
        padding: '12px 12px 11px',
        background: 'transparent',
        textAlign: 'left',
        cursor: 'pointer',
        WebkitTapHighlightColor: 'transparent',
        ...style,
      }}
    >
      <b
        style={{
          display: 'block',
          font: `400 17px/1 ${SERIF}`,
          fontWeight: 400,
          color: 'var(--ink)',
          marginBottom: description ? 5 : 0,
        }}
      >
        {title}
      </b>
      {description && (
        <small style={{ font: `400 11.5px/1.3 ${SANS}`, color: 'var(--ink3)' }}>{description}</small>
      )}
    </button>
  );
}

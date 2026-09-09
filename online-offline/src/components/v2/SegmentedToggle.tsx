'use client';

import React from 'react';
import { SANS } from './shared';

// Design HTML `.seg`: 1px --line2 box, 6px radius; segments 11px sans 500
// .14em uppercase --ink3; active segment --bg2 + --ink.

export interface SegmentedToggleOption<T extends string> {
  value: T;
  label: string;
}

export interface SegmentedToggleProps<T extends string> {
  options: SegmentedToggleOption<T>[];
  value: T;
  onChange: (value: T) => void;
  style?: React.CSSProperties;
}

export function SegmentedToggle<T extends string>({
  options,
  value,
  onChange,
  style,
}: SegmentedToggleProps<T>) {
  return (
    <div
      role="tablist"
      style={{
        display: 'flex',
        borderWidth: 1,
        borderStyle: 'solid',
        borderColor: 'var(--line2)',
        borderRadius: 6,
        overflow: 'hidden',
        ...style,
      }}
    >
      {options.map((o) => {
        const on = o.value === value;
        return (
          <button
            key={o.value}
            type="button"
            role="tab"
            aria-selected={on}
            onClick={() => onChange(o.value)}
            style={{
              flex: 1,
              textAlign: 'center',
              padding: '11px 0',
              borderWidth: 0,
              font: `500 11px/1 ${SANS}`,
              letterSpacing: '0.14em',
              textTransform: 'uppercase',
              color: on ? 'var(--ink)' : 'var(--ink3)',
              background: on ? 'var(--bg2)' : 'transparent',
              cursor: 'pointer',
              WebkitTapHighlightColor: 'transparent',
            }}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

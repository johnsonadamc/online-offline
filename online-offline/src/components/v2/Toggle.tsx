'use client';

import React from 'react';
import { Accent, accentVar } from './shared';

// Design HTML `.tog`: 40×22, r11, --line2 track, 18px --ink2 knob;
// on: accent (gold) track, knob slides right and takes --bg.

export interface ToggleProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  /** Track color when on. Default gold. */
  accent?: Accent;
  disabled?: boolean;
  'aria-label'?: string;
  style?: React.CSSProperties;
}

export function Toggle({ checked, onChange, accent = 'gold', disabled, style, ...rest }: ToggleProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      style={{
        width: 40,
        height: 22,
        borderRadius: 11,
        borderWidth: 0,
        background: checked ? accentVar(accent) : 'var(--line2)',
        position: 'relative',
        flex: 'none',
        padding: 0,
        cursor: disabled ? 'default' : 'pointer',
        opacity: disabled ? 0.4 : 1,
        transition: 'background 150ms ease-out',
        WebkitTapHighlightColor: 'transparent',
        ...style,
      }}
      {...rest}
    >
      <i
        style={{
          position: 'absolute',
          top: 2,
          left: checked ? 20 : 2,
          width: 18,
          height: 18,
          borderRadius: '50%',
          background: checked ? 'var(--bg)' : 'var(--ink2)',
          transition: 'left 150ms ease-out, background 150ms ease-out',
        }}
      />
    </button>
  );
}

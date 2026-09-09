'use client';

import React, { forwardRef, useState } from 'react';
import { SectionLabel } from './SectionLabel';
import { SANS, SERIF } from './shared';

// Design HTML `.in`: borderless, bottom hairline --line2, --ink on focus,
// placeholder --ink3 (class v2-field in globals.css), no box, no radius.
// Value 16px sans, or 26px serif for titles (`.in.big`).

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  /** 10px mono label rendered above the field. */
  label?: string;
  /** Title variant: 26px Instrument Serif. */
  serif?: boolean;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { label, serif, style, onFocus, onBlur, ...rest },
  ref
) {
  const [focused, setFocused] = useState(false);
  const field = (
    <input
      ref={ref}
      className="v2-field"
      onFocus={(e) => {
        setFocused(true);
        onFocus?.(e);
      }}
      onBlur={(e) => {
        setFocused(false);
        onBlur?.(e);
      }}
      style={{
        display: 'block',
        width: '100%',
        background: 'transparent',
        borderWidth: '0 0 1px 0',
        borderStyle: 'solid',
        borderColor: focused ? 'var(--ink)' : 'var(--line2)',
        borderRadius: 0,
        padding: '8px 0 10px',
        font: serif ? `400 26px/1.15 ${SERIF}` : `400 16px/1.3 ${SANS}`,
        color: 'var(--ink)',
        caretColor: 'var(--ink)',
        outline: 'none',
        ...style,
      }}
      {...rest}
    />
  );
  if (!label) return field;
  return (
    <div style={{ paddingTop: 18 }}>
      <SectionLabel style={{ display: 'block', marginBottom: 8 }}>{label}</SectionLabel>
      {field}
    </div>
  );
});

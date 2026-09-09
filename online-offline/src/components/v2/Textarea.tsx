'use client';

import React, { forwardRef, useState } from 'react';
import { SectionLabel } from './SectionLabel';
import { SANS, SERIF } from './shared';

// Design HTML `.ta`: Input rules, min 90px, auto-grow.
// `.ta.serif`: 17px Instrument Serif for creative text (poem, prompt, message).

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  /** 10px mono label rendered above the field. */
  label?: string;
  /** Creative-text variant: serif 17px/1.55. */
  serif?: boolean;
  /** Minimum height in px. Default 90. */
  minHeight?: number;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(function Textarea(
  { label, serif, minHeight = 90, style, onFocus, onBlur, onInput, ...rest },
  ref
) {
  const [focused, setFocused] = useState(false);
  const field = (
    <textarea
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
      onInput={(e) => {
        // auto-grow
        const el = e.currentTarget;
        el.style.height = 'auto';
        el.style.height = `${Math.max(minHeight, el.scrollHeight)}px`;
        onInput?.(e);
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
        minHeight,
        resize: 'none',
        overflow: 'hidden',
        font: serif ? `400 17px/1.55 ${SERIF}` : `400 15px/1.55 ${SANS}`,
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

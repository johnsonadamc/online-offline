'use client';

import React, { forwardRef, useState } from 'react';
import { SectionLabel } from './SectionLabel';
import { SANS } from './shared';
import { Icon } from './icons';

// Design HTML: Input styling + 12px chevron at right (`.in .cv`). Native
// <select> so mobile opens the platform sheet.

export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  /** 10px mono label rendered above the field. */
  label?: string;
  children: React.ReactNode;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(function Select(
  { label, style, children, onFocus, onBlur, ...rest },
  ref
) {
  const [focused, setFocused] = useState(false);
  const field = (
    <div style={{ position: 'relative' }}>
      <select
        ref={ref}
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
          boxSizing: 'border-box',
          minWidth: 0,
          appearance: 'none',
          WebkitAppearance: 'none',
          background: 'transparent',
          borderWidth: '0 0 1px 0',
          borderStyle: 'solid',
          borderColor: focused ? 'var(--ink)' : 'var(--line2)',
          borderRadius: 0,
          padding: '8px 20px 10px 0',
          font: `400 16px/1.3 ${SANS}`,
          color: 'var(--ink)',
          outline: 'none',
          cursor: 'pointer',
          ...style,
        }}
        {...rest}
      >
        {children}
      </select>
      <Icon
        name="chevron"
        size={12}
        strokeWidth={1.5}
        style={{
          position: 'absolute',
          right: 0,
          top: '50%',
          transform: 'translateY(-50%) rotate(90deg)',
          color: 'var(--ink3)',
          pointerEvents: 'none',
        }}
      />
    </div>
  );
  if (!label) return field;
  return (
    <div style={{ paddingTop: 18 }}>
      <SectionLabel style={{ display: 'block', marginBottom: 8 }}>{label}</SectionLabel>
      {field}
    </div>
  );
});

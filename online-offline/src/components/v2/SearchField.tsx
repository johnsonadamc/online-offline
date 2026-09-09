'use client';

import React, { forwardRef, useState } from 'react';
import { SANS } from './shared';
import { Icon } from './icons';

// Design HTML `.search`: 44px, 16px search icon left, bottom hairline only,
// 15px sans; placeholder --ink3. Results render as RosterRows in the caller.

export type SearchFieldProps = React.InputHTMLAttributes<HTMLInputElement>;

export const SearchField = forwardRef<HTMLInputElement, SearchFieldProps>(function SearchField(
  { style, onFocus, onBlur, ...rest },
  ref
) {
  const [focused, setFocused] = useState(false);
  return (
    <div
      style={{
        height: 44,
        borderWidth: '0 0 1px 0',
        borderStyle: 'solid',
        borderColor: focused ? 'var(--ink)' : 'var(--line2)',
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        ...style,
      }}
    >
      <Icon name="search" size={16} strokeWidth={1.5} style={{ color: 'var(--ink3)' }} />
      <input
        ref={ref}
        type="search"
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
          flex: 1,
          minWidth: 0,
          background: 'transparent',
          borderWidth: 0,
          font: `400 15px/1 ${SANS}`,
          color: 'var(--ink)',
          caretColor: 'var(--ink)',
          outline: 'none',
        }}
        {...rest}
      />
    </div>
  );
});

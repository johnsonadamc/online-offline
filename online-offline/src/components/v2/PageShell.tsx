'use client';
import React from 'react';
import { SANS } from './shared';

// Design System v2 page root — the ONLY place a v2 page paints its background.
// Root: full-width, min-height 100dvh, --bg, overflow-x hidden. Inner column:
// max 560px centered, 24px side padding, border-box, min-width 0 — so nothing
// inside can widen the page (the Phase 1–2 header rows had an explicit
// `boxSizing: 'content-box'` on a `width: 100%` + padded row, which pushed the
// page 48px past a 390px viewport).
//
// Slots mirror the design HTML: `header` = `.top` (column-width row, 22px top
// padding, 38px tall), children = `.scroll` (the column), `footer` = `.foot`
// (sticky bottom, hairline top, --bg). `align="center"` centres the column's
// content vertically (auth).

export interface PageShellProps {
  children: React.ReactNode;
  /** Column-width header row (design `.top`): e.g. back link, wordmark, page label. */
  header?: React.ReactNode;
  /** Sticky footer slot (design `.foot`): the page's primary action(s). */
  footer?: React.ReactNode;
  /** Vertical alignment of the column content. Default 'top'. */
  align?: 'top' | 'center';
  /** Extra styles for the root. */
  style?: React.CSSProperties;
  /** Extra styles for the inner column (e.g. paddingBottom). */
  columnStyle?: React.CSSProperties;
}

/** Column geometry shared by header, body and footer. */
const column: React.CSSProperties = {
  width: '100%',
  maxWidth: 560,
  margin: '0 auto',
  boxSizing: 'border-box',
  minWidth: 0,
};

export function PageShell({ children, header, footer, align = 'top', style, columnStyle }: PageShellProps) {
  return (
    <div
      style={{
        minHeight: '100dvh',
        width: '100%',
        background: 'var(--bg)',
        color: 'var(--ink)',
        overflowX: 'hidden',
        boxSizing: 'border-box',
        display: 'flex',
        flexDirection: 'column',
        fontFamily: SANS,
        ...style,
      }}
    >
      {header !== undefined && (
        <div
          style={{
            ...column,
            padding: '22px 24px 0',
            height: 60, // 22 top padding + 38 row (design `.top`), border-box
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 12,
            flex: 'none',
          }}
        >
          {header}
        </div>
      )}

      <div
        style={{
          ...column,
          flex: 1,
          padding: '0 24px',
          ...(align === 'center'
            ? { display: 'flex', flexDirection: 'column', justifyContent: 'center' }
            : null),
          ...columnStyle,
        }}
      >
        {children}
      </div>

      {footer !== undefined && (
        <div
          style={{
            position: 'sticky',
            bottom: 0,
            zIndex: 5,
            width: '100%',
            borderWidth: '1px 0 0 0',
            borderStyle: 'solid',
            borderColor: 'var(--line)',
            background: 'var(--bg)',
            boxSizing: 'border-box',
          }}
        >
          <div
            style={{
              ...column,
              padding: '16px 24px 26px',
              display: 'flex',
              alignItems: 'center',
              gap: 12,
            }}
          >
            {footer}
          </div>
        </div>
      )}
    </div>
  );
}

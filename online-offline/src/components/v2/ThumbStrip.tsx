'use client';

import React from 'react';
import { MONO, SANS } from './shared';

// Design HTML `.strip`: 56px squares, 7px radius, 8px gap; current thumb has
// the --ink border; ★ marks the feature; dashed + slot adds (hidden at max);
// "n / 8" mono counter at right.

export interface ThumbStripItem {
  id: string | number;
  src?: string;
  isFeature?: boolean;
}

export interface ThumbStripProps {
  items: ThumbStripItem[];
  currentIndex: number;
  onSelect: (index: number) => void;
  /** Renders the dashed + slot; hidden when items.length >= max. */
  onAdd?: () => void;
  /** Default 8. */
  max?: number;
  style?: React.CSSProperties;
}

export function ThumbStrip({ items, currentIndex, onSelect, onAdd, max = 8, style }: ThumbStripProps) {
  return (
    <div style={{ display: 'flex', gap: 8, ...style }}>
      {items.map((item, i) => (
        <button
          key={item.id}
          type="button"
          aria-label={`Image ${i + 1}`}
          aria-current={i === currentIndex}
          onClick={() => onSelect(i)}
          style={{
            position: 'relative',
            width: 56,
            height: 56,
            borderRadius: 7,
            borderWidth: 1,
            borderStyle: 'solid',
            borderColor: i === currentIndex ? 'var(--ink)' : 'var(--line)',
            background: 'var(--bg2)',
            padding: 0,
            overflow: 'hidden',
            cursor: 'pointer',
            flex: 'none',
            WebkitTapHighlightColor: 'transparent',
          }}
        >
          {item.src && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={item.src}
              alt=""
              draggable={false}
              style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }}
            />
          )}
          {item.isFeature && (
            <span
              aria-label="Featured"
              style={{
                position: 'absolute',
                left: 4,
                top: 2,
                font: `400 9px/1 ${SANS}`,
                color: 'var(--orange)',
              }}
            >
              ★
            </span>
          )}
        </button>
      ))}
      {onAdd && items.length < max && (
        <button
          type="button"
          aria-label="Add image"
          onClick={onAdd}
          style={{
            width: 56,
            height: 56,
            borderRadius: 7,
            borderWidth: 1,
            borderStyle: 'dashed',
            borderColor: 'var(--line)',
            background: 'var(--bg2)',
            display: 'grid',
            placeItems: 'center',
            color: 'var(--ink3)',
            font: `300 22px/1 ${SANS}`,
            cursor: 'pointer',
            flex: 'none',
            WebkitTapHighlightColor: 'transparent',
          }}
        >
          +
        </button>
      )}
      <span
        style={{
          marginLeft: 'auto',
          alignSelf: 'center',
          font: `400 11px/1 ${MONO}`,
          color: 'var(--ink3)',
        }}
      >
        {items.length} / {max}
      </span>
    </div>
  );
}

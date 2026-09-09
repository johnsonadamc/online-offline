import React from 'react';
import { MONO } from './shared';

// Design HTML `.wc`: right-aligned 11px mono, gold; orange past the limit.

export interface WordCountProps {
  count: number;
  limit: number;
  style?: React.CSSProperties;
}

export function WordCount({ count, limit, style }: WordCountProps) {
  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'flex-end',
        paddingTop: 8,
        font: `400 11px/1 ${MONO}`,
        color: count > limit ? 'var(--orange)' : 'var(--gold)',
        ...style,
      }}
    >
      {count} / {limit}
    </div>
  );
}

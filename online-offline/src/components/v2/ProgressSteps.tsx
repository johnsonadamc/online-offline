import React from 'react';

// Design HTML `.steps`: n bars, 2px tall, 6px gap; --ink for done, --line2
// for the rest. The "2 / 3" mono counter lives in the header, not here.

export interface ProgressStepsProps {
  /** Total number of steps. */
  total: number;
  /** Steps completed so far (1-based; bars 1..current are filled). */
  current: number;
  style?: React.CSSProperties;
}

export function ProgressSteps({ total, current, style }: ProgressStepsProps) {
  return (
    <div style={{ display: 'flex', gap: 6, ...style }}>
      {Array.from({ length: total }, (_, i) => (
        <i
          key={i}
          style={{
            flex: 1,
            height: 2,
            background: i < current ? 'var(--ink)' : 'var(--line2)',
          }}
        />
      ))}
    </div>
  );
}

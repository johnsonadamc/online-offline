'use client';

import React from 'react';
import { Accent, accentVar, MONO, tint } from './shared';
import { Icon, IconName } from './icons';

// Design HTML `.pill`: 34px tall, full radius, 1px --line2 border, icon 14px +
// 12px mono text, --ink3 at rest.
// `.pill.c` (tinted): accent text, border color-mix(accent 45%, --line2).
// `.pill.on` (selected): accent border + text, 14% tint fill.
// `.pill.dim`: opacity .4.

export interface PillProps {
  /** Mode/type color for tinted + selected states. */
  accent?: Accent;
  /** Built-in icon name, or a custom inline SVG node. */
  icon?: IconName | React.ReactNode;
  /** Mono count — the icon+count variant. */
  count?: number;
  /** Text — the label variant ("Community", "Joined", a city). */
  label?: string;
  /** Filled with the mode color (design `.on`). */
  selected?: boolean;
  /** Accent text + 45% accent border without fill (design `.c`). */
  tinted?: boolean;
  /** 40% opacity (0 pages remaining etc.). Still tappable unless disabled. */
  dimmed?: boolean;
  /** Tiny trailing chevron (local pill opens the city sheet). */
  chevron?: boolean;
  disabled?: boolean;
  onClick?: (e: React.MouseEvent<HTMLButtonElement>) => void;
  'aria-label'?: string;
  style?: React.CSSProperties;
}

export function Pill({
  accent,
  icon,
  count,
  label,
  selected,
  tinted,
  dimmed,
  chevron,
  disabled,
  onClick,
  style,
  ...rest
}: PillProps) {
  const a = accent ? accentVar(accent) : undefined;
  const borderColor = selected && a
    ? a
    : tinted && a
      ? `color-mix(in oklch, ${a} 45%, var(--line2))`
      : 'var(--line2)';
  const color = (selected || tinted) && a ? a : 'var(--ink3)';
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-pressed={selected}
      style={{
        height: 34,
        minWidth: 34,
        padding: '0 10px',
        borderRadius: 17,
        borderWidth: 1,
        borderStyle: 'solid',
        borderColor,
        background: selected && accent ? tint(accent, 14) : 'transparent',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        color,
        font: `400 12px/1 ${MONO}`,
        opacity: dimmed ? 0.4 : 1,
        cursor: disabled ? 'default' : 'pointer',
        WebkitTapHighlightColor: 'transparent',
        ...style,
      }}
      {...rest}
    >
      {typeof icon === 'string' ? <Icon name={icon as IconName} size={14} /> : icon}
      {count !== undefined && <span>{count}</span>}
      {label !== undefined && <span>{label}</span>}
      {chevron && (
        <Icon name="chevron" size={8} strokeWidth={2} style={{ transform: 'rotate(90deg)' }} />
      )}
    </button>
  );
}

import React from 'react';
import { Accent, accentVar, tint } from './shared';
import { Icon, IconName } from './icons';

// Design HTML `.ico`: 48px, r10, 1px --line2 border, --bg2, icon 22px stroke 1.5.
// `.ico.on`: border + icon take the accent, 10% tint background.

export interface IconTileProps {
  /** Built-in icon; alternatively pass a custom inline SVG as children. */
  icon?: IconName;
  /** When set, tile is "active": accent border + icon + 10% tint. */
  accent?: Accent;
  children?: React.ReactNode;
  style?: React.CSSProperties;
}

export function IconTile({ icon, accent, children, style }: IconTileProps) {
  return (
    <span
      style={{
        width: 48,
        height: 48,
        borderRadius: 10,
        borderWidth: 1,
        borderStyle: 'solid',
        borderColor: accent ? accentVar(accent) : 'var(--line2)',
        background: accent ? tint(accent, 10, 'var(--bg2)') : 'var(--bg2)',
        display: 'grid',
        placeItems: 'center',
        color: accent ? accentVar(accent) : 'var(--ink2)',
        flex: 'none',
        ...style,
      }}
    >
      {children ?? (icon ? <Icon name={icon} size={22} strokeWidth={1.5} /> : null)}
    </span>
  );
}

import React from 'react';
import { accentVar, tint, TileType, typeAccent } from './shared';
import { Icon, IconName } from './icons';

// Design HTML `.ti`: 28px, r7, accent icon on 12% tint background.
// Type → color: photography blue, art purple, writing (poetry/essay) gold,
// community blue, local green, private purple.

const typeIcon: Record<TileType, IconName> = {
  photography: 'camera',
  art: 'brush',
  poetry: 'quill',
  essay: 'quill',
  writing: 'quill',
  community: 'people',
  local: 'pin',
  private: 'lock',
};

export interface TypeTileProps {
  type: TileType;
  /** Square size in px. Default 28; the curate cards use 20. */
  size?: number;
  /** Custom content in place of the built-in icon (e.g. an initial). */
  children?: React.ReactNode;
  style?: React.CSSProperties;
}

export function TypeTile({ type, size = 28, children, style }: TypeTileProps) {
  const a = typeAccent[type];
  const iconSize = Math.round(size * (15 / 28));
  return (
    <span
      style={{
        width: size,
        height: size,
        borderRadius: Math.round(size * (7 / 28)),
        display: 'grid',
        placeItems: 'center',
        color: accentVar(a),
        background: tint(a, 12),
        flex: 'none',
        ...style,
      }}
    >
      {children ?? <Icon name={typeIcon[type]} size={iconSize} strokeWidth={1.6} />}
    </span>
  );
}

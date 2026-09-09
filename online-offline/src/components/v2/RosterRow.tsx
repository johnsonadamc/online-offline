import React from 'react';
import { MONO, SERIF } from './shared';
import { TypeTile } from './TypeTile';
import type { TileType } from './shared';

// Design HTML `.rr`: 32px initial avatar (serif letter on gradient), serif
// 17px name, optional 11px mono sub-line, optional type tile, right slot
// (button / status dot / quiet text) as children.

export interface RosterRowProps {
  name: React.ReactNode;
  /** Avatar image; falls back to the initial. */
  avatarUrl?: string;
  /** Single letter shown when no avatar image. */
  initial?: string;
  /** 11px mono line under the name (e.g. "lead", "follows you"). */
  sub?: React.ReactNode;
  /** Renders a 28px TypeTile after the name. */
  type?: TileType;
  /** Right slot: buttons, StatusDot, quiet text. */
  children?: React.ReactNode;
  /** Hide the bottom hairline (last row). */
  last?: boolean;
  onClick?: () => void;
  style?: React.CSSProperties;
}

export function RosterRow({
  name,
  avatarUrl,
  initial,
  sub,
  type,
  children,
  last,
  onClick,
  style,
}: RosterRowProps) {
  return (
    <div
      onClick={onClick}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        padding: '13px 0',
        borderWidth: last ? 0 : '0 0 1px 0',
        borderStyle: 'solid',
        borderColor: 'var(--line)',
        cursor: onClick ? 'pointer' : 'default',
        ...style,
      }}
    >
      <span
        style={{
          width: 32,
          height: 32,
          borderRadius: '50%',
          background: avatarUrl ? undefined : 'linear-gradient(135deg,#4a4f47,#26292a)',
          borderWidth: 1,
          borderStyle: 'solid',
          borderColor: 'var(--line2)',
          display: 'grid',
          placeItems: 'center',
          font: `400 14px/1 ${SERIF}`,
          color: 'var(--ink2)',
          overflow: 'hidden',
          flex: 'none',
        }}
      >
        {avatarUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={avatarUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        ) : (
          initial
        )}
      </span>
      <div style={{ flex: 1, minWidth: 0, font: `400 17px/1.1 ${SERIF}`, color: 'var(--ink)' }}>
        {name}
        {sub !== undefined && (
          <small
            style={{
              display: 'block',
              font: `400 11px/1 ${MONO}`,
              color: 'var(--ink3)',
              marginTop: 4,
            }}
          >
            {sub}
          </small>
        )}
      </div>
      {type && <TypeTile type={type} />}
      {children}
    </div>
  );
}

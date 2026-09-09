import React from 'react';

// Inline SVG icon set copied from the redesign-B design HTML <symbol> defs.
// No lucide-react — these are the only icons the v2 primitives use.

export type IconName =
  | 'camera'
  | 'brush'
  | 'quill'
  | 'people'
  | 'pin'
  | 'lock'
  | 'chevron'
  | 'plus'
  | 'search'
  | 'envelope';

const PATHS: Record<IconName, React.ReactNode> = {
  camera: (
    <>
      <path d="M4 8h3l2-3h6l2 3h3v11H4z" />
      <circle cx="12" cy="13" r="3.5" />
    </>
  ),
  brush: (
    <>
      <path d="M14 4l6 6-9 9H5v-6z" />
      <path d="M5 19c3 0 4-1 4-3" />
    </>
  ),
  quill: (
    <>
      <path d="M4 20c8-1 14-7 16-16-9 2-15 8-16 16z" />
      <path d="M4 20l8-8" />
    </>
  ),
  people: (
    <>
      <circle cx="9" cy="8" r="3" />
      <circle cx="16.5" cy="9.5" r="2.5" />
      <path d="M3 19c0-3.3 2.7-6 6-6s6 2.7 6 6M15 19c0-2.5 1.6-4.5 4-4.5 1 0 2 .4 2 .4" />
    </>
  ),
  pin: (
    <>
      <path d="M12 21s-6-5.5-6-10.5A6 6 0 0 1 18 10.5C18 15.5 12 21 12 21z" />
      <circle cx="12" cy="10.5" r="2" />
    </>
  ),
  lock: (
    <>
      <rect x="5" y="11" width="14" height="10" rx="1.5" />
      <path d="M8 11V8a4 4 0 0 1 8 0v3" />
    </>
  ),
  chevron: <path d="M9 6l6 6-6 6" />,
  plus: <path d="M12 5v14M5 12h14" />,
  search: (
    <>
      <circle cx="11" cy="11" r="7" />
      <path d="M20 20l-4-4" />
    </>
  ),
  envelope: (
    <>
      <rect x="3" y="6" width="18" height="13" rx="1.5" />
      <path d="M3 8l9 6 9-6" />
    </>
  ),
};

export interface IconProps {
  name: IconName;
  /** Square size in px. Default 15 (TypeTile scale). */
  size?: number;
  strokeWidth?: number;
  style?: React.CSSProperties;
}

export function Icon({ name, size = 15, strokeWidth = 1.6, style }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      aria-hidden="true"
      style={{
        display: 'block',
        stroke: 'currentColor',
        fill: 'none',
        strokeWidth,
        strokeLinecap: 'round',
        strokeLinejoin: 'round',
        flex: 'none',
        ...style,
      }}
    >
      {PATHS[name]}
    </svg>
  );
}

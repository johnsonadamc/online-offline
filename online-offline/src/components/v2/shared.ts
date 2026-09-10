// Design System v2 shared constants — presentational only, no data fetching.
// Values from _design/redesign-b (README.md "Design tokens" + the design HTML CSS).

export type Accent = 'orange' | 'gold' | 'green' | 'blue' | 'purple';

/** CSS value for an accent token. */
export const accentVar = (a: Accent): string => `var(--${a})`;

export type ContentType = 'photography' | 'art' | 'poetry' | 'essay' | 'writing';
export type CollabMode = 'community' | 'local' | 'private';
export type TileType = ContentType | CollabMode;

/** Meaning map: photography blue, art purple, writing (poetry/essay) gold;
 *  community blue, local green, private purple. Music is not a content type. */
export const typeAccent: Record<TileType, Accent> = {
  photography: 'blue',
  art: 'purple',
  poetry: 'gold',
  essay: 'gold',
  writing: 'gold',
  community: 'blue',
  local: 'green',
  private: 'purple',
};

export const SERIF = "var(--font-serif, 'Instrument Serif', Georgia, serif)";
export const SANS = "var(--font-sans, 'Hanken Grotesk', system-ui, sans-serif)";
export const MONO = "var(--font-mono, 'JetBrains Mono', ui-monospace, monospace)";

/** 12% tint background used by tinted tiles (design HTML `.ti`). */
export const tint = (a: Accent, pct = 12, base = 'var(--bg)'): string =>
  `color-mix(in oklch, ${accentVar(a)} ${pct}%, ${base})`;

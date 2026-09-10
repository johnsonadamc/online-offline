# Design System v2 primitives (`src/components/v2/`)

Built in redesign Phase 0 from `_design/redesign-b/` (README.md "Design tokens" /
"Color rules" + the CSS in `-B-final.html` and `-B-pages.html`). Every primitive is
presentational: props in, callbacks out — **no data fetching, no Supabase imports**.
All use the v2 tokens in `globals.css` (`--bg`, `--ink`, `--orange`, …) and the v2
fonts (`--font-sans-v2` Hanken Grotesk, `--font-mono-v2` JetBrains Mono, `--font-serif`
Instrument Serif). Import from `@/components/v2`.

Shared: `Accent = 'orange'|'gold'|'green'|'blue'|'purple'` · `TileType =
'photography'|'art'|'poetry'|'essay'|'writing'|'community'|'local'|'private'` ·
`typeAccent` maps types to accents (photography blue, art purple, writing gold,
community blue, local green, private purple). `icons.tsx` holds the inline SVG set
(`Icon name=` camera/brush/quill/people/pin/lock/chevron/plus/search/envelope).

## Props

- **PageShell** — `children` (the column), `header?` (column-width `.top` row:
  back link / wordmark / label), `footer?` (sticky `.foot` slot), `align?: 'top'|'center'`,
  `style?`, `columnStyle?`. Root: min-height 100dvh, width 100%, `--bg`, `--ink`,
  overflow-x hidden, border-box. Column: max 560 centered, `padding: 0 24px`, border-box,
  min-width 0. **Every v2 page root; never set page background elsewhere.**
- **IconTile** — `icon?: IconName` (or custom SVG children), `accent?` (active:
  accent border + icon + 10% tint), `style?`. 48px, r10, `--bg2`.
- **TypeTile** — `type: TileType`, `size?` (default 28, r7 scales), `children?`
  (override icon, e.g. an initial), `style?`. 12% tint by type.
- **Pill** — `accent?`, `icon?: IconName|ReactNode`, `count?: number` (icon+count
  variant), `label?: string` (label variant), `selected?` (filled mode color),
  `tinted?` (accent text/45% border, no fill), `dimmed?` (.4), `chevron?` (local
  city sheet), `disabled?`, `onClick?`. 34px tall, full radius, mono 12px.
- **SectionLabel** — `children`, `accent?` (e.g. gold PROMPT), `style?`. 10px mono
  .18em uppercase.
- **Sheet** — `open`, `onClose` (scrim tap), `title?`, `subtitle?`, `children`.
  240ms slide-up, 45% scrim, r20 top, grabber. Portal to body.
- **Toast** — `open`, `message`, `accent?` (6px dot), `duration?` (default 2600ms,
  0 = manual), `onClose`. *No mock exists in the design HTML — styling derived from
  the system vocabulary (`--bg2` card, `--line2` border, r12, sans 13.5).*
- **SwipeRow** — `action: string`, `accent?` (default orange), `onAction`
  (caller runs its existing confirm), `disabled?`, `children`. Rules:
  - **Tap**: a row at rest (translateX 0) always passes the tap to the consumer's
    own `onClick` on the inner element. Only a row that is swiped open consumes a
    tap, to close itself. Buttons inside the row must `stopPropagation`.
  - **Swipe** (touch): after 8px the gesture locks to one axis — vertical keeps
    page scroll untouched, horizontal drags the row; past half the 84px action it
    snaps open. The click the browser synthesizes after a swipe is swallowed.
  - **Long-press** (touch): 500ms, cancelled by >8px of movement, opens the action
    and never fires the row's tap on release.
  - **Hover "···"**: rendered ONLY on `(hover: hover) and (pointer: fine)` devices
    (matchMedia), never on touch where :hover sticks after a tap. It lives in its
    own reserved 32px right column (the row content gets 32px right padding on
    those devices, 0 on touch), so it can never overlap the consumer's right slot.
    Clicking it opens the same inline action and stops propagation; showing it
    never puts the row in the open state.
- **Input** — all `<input>` props + `label?` (10px mono above), `serif?` (26px title
  variant). Borderless, bottom hairline, ink on focus.
- **Select** — all `<select>` props + `label?`; native select styled like Input with
  a right chevron; `children` = options.
- **Textarea** — all `<textarea>` props + `label?`, `serif?` (17px creative-text
  variant), `minHeight?` (default 90). Auto-grows.
- **WordCount** — `count`, `limit`. "31 / 250" right-aligned mono gold; orange past
  limit.
- **SegmentedToggle** — `options: {value,label}[]`, `value`, `onChange`. Active
  segment `--bg2` + ink.
- **ChoiceCard** — `title`, `description?`, `selected?`, `accent?` (default orange),
  `onClick?`. Serif title, r8; selected border takes accent.
- **FocalPointFrame** — `src?` (omit → dashed empty state), `aspect?: '4:3'|'1:1'`,
  `focalX?`/`focalY?` (0–100), `onFocalChange?(x,y)` (live during drag/tap, integer
  %), `accent?` (default orange), `showFeature?`/`isFeature?`/`onToggleFeature?`
  (★ Feature slot), `onRemove?` (× slot), `emptyLabel?`, `onEmptyPress?`. Crosshair
  44px + live "CROP CENTER x%, y%" label.
- **ThumbStrip** — `items: {id, src?, isFeature?}[]` (order = order_index in the
  caller), `currentIndex`, `onSelect(i)`, `onAdd?` (dashed +, hidden at max),
  `max?` (default 8). "n / 8" mono counter.
- **SearchField** — all `<input>` props. 44px, search icon, bottom hairline.
- **RosterRow** — `name`, `avatarUrl?`, `initial?`, `sub?` (11px mono line, e.g.
  "lead"), `type?: TileType` (renders TypeTile), `children` (right slot: buttons /
  StatusDot / quiet text), `last?` (no hairline), `onClick?`.
- **StatusDot** — `status: 'accepted'|'pending'|'declined'` → green / `--line2` /
  orange, 7px.
- **Brief** — `label?` (default "Prompt", gold), `children` (serif 16px body),
  `defaultOpen?` (default true). Collapsible, chevron rotates.
- **ProgressSteps** — `total`, `current` (bars 1..current filled ink).
- **Toggle** — `checked`, `onChange(bool)`, `accent?` (default gold), `disabled?`.
  40×22.

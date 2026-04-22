# online//offline — UI Redesign Brief
## For Claude Code implementation

Two HTML reference files accompany this brief:
- `dashboard-final-v2.html` — the contributor dashboard (dashboard/page.tsx)
- `curate-page-v4.html` — the curation interface (curate/page.tsx)

Implement the visual language from these files across the entire application. Every page should feel like it belongs to the same print shop at dusk.

---

## Design Philosophy

online//offline is a slowcial media platform — a curated, modular, printed social media magazine. The aesthetic references: a print shop at dusk, proof light tables, letterpress type, registration marks, neon-lit darkrooms. It is warm, considered, and slightly industrial. Not tech. Not startup. Print culture, digitized.

**The single rule:** Every UI element participates in the neon color system or recedes into the warm dark. Nothing is neutral gray. Nothing is pure white. Nothing is default blue.

---

## Typography

Load from Google Fonts — already in the project:

```
Instrument Serif — display, editorial, titles, large numbers
Instrument Sans  — body, labels, UI text (weights: 300, 400, 500)
Courier Prime    — monospace: badges, labels, metadata, buttons, technical text
```

Usage:
- Page titles, content titles, contributor names → Instrument Serif
- Body text, descriptions, navigation → Instrument Sans
- Buttons, section labels, metadata, counts, stats, timestamps → Courier Prime
- Status words (submitted, draft) → Instrument Serif italic

---

## Color System

### CSS Variables — use these everywhere

```css
/* Dashboard surfaces */
--ground:      #252119;   /* primary background */
--ground-2:    #2e2a20;
--ground-3:    #373229;   /* card backgrounds, icon backgrounds */
--ground-4:    #413c31;   /* button bases, borders */
--ground-5:    #4c4639;

/* Text */
--paper:       #f0ebe2;   /* primary text */
--paper-2:     #d8d2c8;
--paper-3:     #b0a898;   /* secondary text */
--paper-4:     #857d72;   /* muted text */
--paper-5:     #554d44;   /* very muted, separators */

/* Neon accents */
--neon-accent: #e05a28;   /* terracotta — content, submit actions */
--neon-blue:   #5a9fd4;   /* photography, community collabs */
--neon-green:  #4ec47a;   /* music, local collabs, curate mode, savings */
--neon-amber:  #e0a830;   /* communications, poetry, essays */
--neon-purple: #a888e8;   /* art, private collabs */

/* Glow variants (for box-shadow, text-shadow) */
--glow-accent: rgba(224,90,40,0.4);
--glow-blue:   rgba(90,159,212,0.4);
--glow-green:  rgba(78,196,122,0.4);
--glow-amber:  rgba(224,168,48,0.4);
--glow-purple: rgba(168,136,232,0.35);
--glow-paper:  rgba(240,235,226,0.15);

/* Rules / dividers */
--rule:        rgba(240,235,226,0.08);
--rule-mid:    rgba(240,235,226,0.14);
--rule-strong: rgba(240,235,226,0.24);

/* Curate / proof light table surfaces (darker) */
--lt-bg:           #0f0e0b;
--lt-text:         rgba(235,225,205,0.85);
--lt-text-2:       rgba(235,225,205,0.65);
--lt-text-3:       rgba(235,225,205,0.42);
--lt-rule:         rgba(235,225,205,0.09);
--lt-card:         rgba(235,220,185,0.06);
--lt-card-sel:     rgba(235,220,185,0.13);
--lt-card-bdr:     rgba(235,220,185,0.1);
--lt-card-bdr-sel: rgba(235,220,185,0.24);
```

### Neon color assignments — semantic, consistent everywhere

| Context | Color |
|---|---|
| Content submission | `--neon-accent` (terracotta) |
| Photography | `--neon-blue` |
| Art / visual | `--neon-purple` |
| Poetry / essay / writing | `--neon-amber` |
| Music | `--neon-green` |
| Communications | `--neon-amber` |
| Community collaborations | `--neon-blue` |
| Local collaborations | `--neon-green` |
| Private collaborations | `--neon-purple` |
| Curate mode / savings / confirmation | `--neon-green` |
| Deadlines / urgency | `--neon-accent` |
| Submitted status | `--neon-accent` italic |
| Draft status | `--paper-4` italic (no neon) |

---

## Grain Texture

Apply to every page background. It should feel like paper, not a screen.

```css
.grain {
  position: fixed; inset: 0; z-index: 999; pointer-events: none;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='250' height='250'%3E%3Cfilter id='g'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.78' numOctaves='4' stitchTiles='stitch'/%3E%3CfeColorMatrix type='saturate' values='0'/%3E%3C/filter%3E%3Crect width='250' height='250' filter='url(%23g)' opacity='0.055'/%3E%3C/svg%3E");
  background-size: 200px;
  mix-blend-mode: overlay;
  opacity: 0.7;
}
```

---

## Registration Marks

Two small printer's registration marks, bottom corners only. They are quiet at rest and shift to neon green on the curate page.

```css
/* Bottom corners only — not top */
position: absolute; bottom: 14px; left/right: 14px;
SVG: circle r=4 + crosshair lines, stroke-width 0.8
opacity: 0.18 normally
/* On curate page: */
opacity: 0.28; stroke: var(--neon-green); filter: drop-shadow(0 0 3px var(--glow-green));
```

---

## Header Pattern

Every page uses the same header structure:

```
[wordmark]                          [avatar]
————————————————————————————————————————————  ← thick glowing rule
[season name italic]  ···········  [Xd remaining]
```

- Wordmark: `Instrument Serif` 15px, `online//offline` — the `//` separator is `--paper-5`
- Thick rule: 1px, `--paper` at 0.8 opacity, box-shadow glow in `--glow-paper`
- Season: `Instrument Serif` italic 12px, `--paper-3`
- Deadline: Courier Prime 10px, days remaining in `--neon-accent` with glow

**Dashboard header also has** a back link row when navigating sub-pages:
```
← [page name]    [section in courier prime]
```

---

## Dashboard Page (`/dashboard`)

Reference: `dashboard-final-v2.html`

Three expandable glyph sections. Only one open at a time.

### Section pattern

```
[icon 40×40 rounded-2px]  [Section Name 18px serif]  [chevron →]
                           [subtitle 11px muted]
```

Icon container: `--ground-3` background, `--rule-mid` border, inset shadow.
On open/hover: background and border take the section's neon color at 0.1/0.4 opacity.
Icon strokes shift to the neon color with drop-shadow glow.
A 1px neon rule appears below the header when open.
Chevron rotates 90° when open.

### Section colors
- Content → `--neon-accent`
- Collaborations → `--neon-blue`
- Communications → `--neon-amber`

### Content items (inside Content section)

```
[SEASON — small caps courier]
[Title in Instrument Serif 26px]
[6 images · Photography]     [submitted — italic accent neon]
```

Status words:
- `submitted` → Instrument Serif italic, `--neon-accent` with glow
- `draft` → no badge shown at all (draft is the default/assumed state)
- `published` → Instrument Serif italic, `--neon-green`

Dismiss (×) button: top-right, `--paper-5`, turns `--neon-accent` on hover.

### Collaboration items

Left border 2px glowing in mode color:
- Community → `--neon-blue`, box-shadow `-3px 0 10px -2px var(--glow-blue)`
- Local → `--neon-green`
- Private → `--neon-purple`

Mode label: Courier Prime 9px uppercase, in the mode's neon color with text-shadow.
Collab title: Instrument Sans 15px.
Detail: Courier Prime 11px, `--paper-4`.
`submitted` badge: Instrument Serif italic, `--neon-accent`.

### Communication items

```
[— to]          ← amber rule + "to" label
[Recipient Name]  ← Instrument Serif 17px
[Subject italic]  ← Instrument Serif 12px italic --paper-4
[date]            ← Courier Prime 10px --paper-5
```

`to` label: Courier Prime 9px uppercase, `--neon-amber`, preceded by 14px amber rule line.
Recipient name is the hero — large serif, not the subject.

### Submit button (press rhythm mechanic)

```css
/* at rest */
background: --ground-3; border: 1px solid --rule-mid; border-bottom: 2px solid --ground-4;
box-shadow: 0 2px 0 --ground-4, 0 3px 6px rgba(0,0,0,0.4);
font-family: Courier Prime; font-size: 10px; letter-spacing: 0.14em; text-transform: uppercase;

/* on press — key goes down */
transform: translateY(2px);
box-shadow: 0 0 0 transparent, 0 1px 3px rgba(0,0,0,0.6);
background: rgba(224,90,40,0.18); border-color: rgba(224,90,40,0.5);

/* on release — spring back */
transition: transform 0.18s cubic-bezier(0.34,1.56,0.64,1);
```

No typewriter text after press. Just the physical press-and-release mechanic.

---

## Curate Page (`/curate`)

Reference: `curate-page-v4.html`

This page has a darker background (`--lt-bg: #0f0e0b`) — a different material reality from the dashboard. It is the proof light table.

### Ambient effects

```css
/* warm light from below */
.lt-ambient: radial-gradient at bottom, rgba(210,190,150,0.07)

/* frosted glass surface */
.lt-glass: absolute overlay, rgba(230,215,185,0.018) bg, rgba(230,215,185,0.05) border
```

### Stats bar

```
[Selected]  |  [Remaining ← in green neon]  |  [Slots: 20]          [Your price $25.00]
  Courier Prime 7px labels, Instrument Serif 18px values
```

### Section tabs

Courier Prime 9px uppercase. Active tab: `--lt-text`, bottom border `rgba(235,225,205,0.35)`.

Count badges: inline beside tab text (not absolute-positioned). `display: flex` on tab, `gap: 5px`. Badge is a 14px circle, `--neon-green` bg, dark text, only visible when count > 0.

### Contributor proof cards (2-column grid)

Each card has three zones:
1. **Identity banner** (72px tall, flush, no padding)
2. **Card body** (type label + name + detail)

**Three banner states:**
- `has-banner` — contributor's `identity_banner_url`, covers full width, dark gradient overlay
- `has-photo` — centered circular avatar (40px), neutral bg (`rgba(235,220,185,0.05)`)
- `placeholder` — per content type: subtle gradient bg + large italic glyph (28px, 0.25 opacity)

Placeholder glyphs by type: photography `◎`, art `✦`, poetry `✦`, music `♩`, essay `¶`
Placeholder bg + glyph color matches content type neon.

**On select — left border + color wash per content type:**
```css
/* photography */
border-left: 3px solid --neon-blue;
background: rgba(90,159,212,0.06);
box-shadow: -4px 0 14px -2px rgba(90,159,212,0.4), 0 0 18px rgba(90,159,212,0.07)...

/* art */     border-left: --neon-purple; background: rgba(168,136,232,0.06)
/* writing */ border-left: --neon-amber;  background: rgba(224,168,48,0.06)
/* music */   border-left: --neon-green;  background: rgba(78,196,122,0.06)
```

Check mark color also matches the content type neon.

**Private profiles:** `opacity: 0.45`, non-selectable, lock icon bottom-right, "Request access" button below.

### Collab proof cards (1-column grid)

Left border glows in mode color. On select, card takes color wash:
- Community: blue
- Local: green
- Private: purple

Participant count rendered large (`Instrument Serif 20px`) in mode's neon.
Mode label: Courier Prime 8px uppercase, in mode color with text-shadow.

### Comm card (1-column)

Amber left border + amber border overall + amber glow.
`to` label with amber rule line (same pattern as dashboard comm items).
Message count rendered large (`22px`) in amber neon.
Static preview cards below for individual messages (non-selectable, amber tint).

### Ad cards (1-column)

Green neon top edge: `1px` absolutely positioned, full width, with `box-shadow` glow.
`$2` price reduction rendered large (`36px`) in `--neon-green` with strong glow — this is the hero.
Divider line between price and ad name.
On select: card takes green wash, top edge glow intensifies.
Savings note appears below ad cards only when ≥1 ad selected.

### Action bar (fixed bottom)

```
[$25.00 — Instrument Serif 22px]    [Reset]    [Save ← press mechanic green]
```

Reset: ghost button, turns `--neon-accent` on hover.
Save: same press mechanic as Submit button but green.

### Slot / price logic
- Max 20 slots total across all categories
- Base price $25.00
- Each ad selected: −$2.00
- Price updates live as selections change

---

## Navigation Between Pages

Dashboard and Curate are **separate pages** (`/dashboard` and `/curate`). They are not tabs within one page.

The curate page has `← Dashboard` in the top-left (Courier Prime 9px uppercase, `--lt-text-3`).

Other navigation links (Collabs browse `/collabs`, Submit `/submit`, Communicate `/communicate/new`) are triggered from within dashboard sections or section CTAs — they are page navigations, not modals.

---

## Other Pages — Apply Same Language

These pages need the same treatment applied consistently:

### `/collabs` — Browse collaborations
- Dark ground background
- Cards use the collab left-border glow pattern (community/local/private)
- Join button: press mechanic, colored in the collab's mode color

### `/collabs/[id]` — Collab detail
- Mode color bleeds into header area
- Phase indicator, participant count in mode neon

### `/collabs/[id]/submit` — Submit to collab
- Same press rhythm submit button as dashboard

### `/submit` — Content submission
- Terracotta (`--neon-accent`) as primary action color
- Image slots: dark card bg, inset shadow, neon accent on active/filled slot

### `/communicate/new` — New communication
- Amber neon as primary color throughout
- Recipient name as hero, not the subject
- Word count in amber

### `/communicate/[id]` — View communication
- Same amber treatment

### `/profile` — Profile page
- Avatar area: center, circular, dark bg
- Identity banner upload: prominent, labeled clearly as separate from submission content
- Fields: borderless inputs, bottom-border only, on focus: neon accent glow

### `/auth` — Sign in / Sign up
- Minimal: wordmark, thick rule, form
- Submit button: press mechanic in `--neon-accent`

### Loading states
Replace all spinners with:
```
Courier Prime text, fading in and out:
"loading..." or just "…"
Color: --paper-4
```

### Error states
- Dark card, `--neon-accent` left border glow
- Courier Prime label "error"
- Instrument Serif message text

---

## Component Patterns

### Confirmation dialogs
```
Dark overlay (rgba(0,0,0,0.65))
Card: --ground-3 bg, --rule-mid border, rounded-sm
Title: Instrument Serif 18px
Body: Instrument Sans 14px --paper-3
Buttons: ghost (cancel) + press-mechanic (confirm)
Destructive confirm: --neon-accent
```

### Empty states
```
Icon: 48px, --ground-3 bg, --rule-mid border, --paper-4 stroke
Label: Instrument Serif italic 14px, --paper-4
CTA button: press mechanic
```

### Tags / pills
```
Courier Prime 9px uppercase
background: neon color at 0.1 opacity
border: neon color at 0.2 opacity
color: neon color (lighter variant)
```

---

## Implementation Notes for Claude Code

1. **Read CLAUDE.md first** — full DB schema, component structure, all existing functionality
2. **Preserve all existing functionality** — this is a visual redesign, not a feature change
3. **Font loading** — add to `layout.tsx` or `_app.tsx`, not per-page
4. **CSS variables** — define in `globals.css` `:root`, use everywhere
5. **Grain overlay** — add as a fixed element in the root layout, not per-page
6. **Tailwind** — use sparingly for layout; prefer CSS variables for color/shadow/typography since Tailwind's palette won't match
7. **No pure white backgrounds** — `bg-white` → `bg-[var(--ground)]` or `bg-[var(--lt-bg)]`
8. **No default blue** — `text-blue-500`, `bg-blue-600` → use neon variables
9. **No Inter/system fonts** — Instrument Sans replaces all body text
10. **The press mechanic** — implement as a reusable `<PressButton>` component with the cubic-bezier spring-back transition
11. **Registration marks** — implement as a fixed overlay component, shown on all pages, green on `/curate`
12. **`identity_banner_url`** — this field needs to be added to the `profiles` table if not already present. It is separate from `avatar_url`. Both the dashboard and curate page need to handle all three states: banner → avatar → placeholder

---

## What NOT to change

- All database queries and Supabase logic
- All state management
- All form validation
- All routing
- The IntegratedCollabsSection component logic
- All authentication flows
- The slot counting and price calculation logic in curate
- The collab participation mode logic

# TEMPLATE_DESIGN_GUIDE.md — online//offline Magazine Templates

## Purpose
This document is the single source of truth for designing new magazine templates
and wiring them into the generation pipeline. Read it before:
- Starting any new template design in Claude Design
- Building the generation pipeline in Claude Code
- Refactoring existing templates into ES modules

---

## Part 1 — Technical Boilerplate
### (Paste this section verbatim at the top of every Claude Design prompt)

```
I am designing a new print magazine template for "online//offline."
The template must integrate with the existing system. Use these exact
specifications — do not deviate.

PAGE CONSTANTS:
  W=768, H=1032, BLEED=11
  AW = W + BLEED*2 = 790     ← full canvas width including bleed
  AH = H + BLEED*2 = 1054    ← full canvas height including bleed
  ML=58, MR=58, MT=56, MB=56 ← live area margins
  LIVEW = W - ML - MR = 652  ← live area width

  Spread pages: AW*2 = 1580 wide × AH tall

COLOR SYSTEM (use variable names exactly as shown):
  C.ground   = '#252119'   ← warm black, dark backgrounds
  C.ground2  = '#2e2a20'
  C.ground3  = '#1e2428'   ← image placeholder background
  C.paper    = '#f0ebe2'   ← warm white, light backgrounds
  C.paper2   = '#d8d2c8'
  C.paper3   = '#b0a898'   ← secondary text
  C.paper4   = '#857d72'   ← captions, muted labels
  C.paper5   = '#554d44'   ← rules, separators
  C.terra    = '#e05a28'   ← terracotta: identity + action
  C.gold     = '#e8a020'   ← gold: structure + warmth
  C.rule     = 'rgba(240,235,226,0.08)'
  C.ruleMid  = 'rgba(240,235,226,0.14)'
  C.ruleStrong = 'rgba(240,235,226,0.24)'

FONT SYSTEM:
  F.serif = "'Instrument Serif', Georgia, serif"
  F.sans  = "'Instrument Sans', sans-serif"
  F.mono  = "'Courier Prime', monospace"
  Load from Google Fonts. No other fonts ever.

COLOR RULES:
  - Terra (#e05a28) = contributor names, section marks, header accent
    rules, signal dots, the // in the wordmark
  - Gold (#e8a020) = index numbers on images, decorative rules between
    sections, folio page numbers, pull quote left borders, registration
    marks, ad pages
  - Never use both terra and gold on the same element
  - On the cover: gold leads, terra accents (inverse of interior pages)
  - Dark backgrounds: always C.ground (#252119), never #000000
  - Light text on dark: always C.paper (#f0ebe2), never #ffffff
  - No blue, green, or purple — those belong to the app UI, not the magazine

AVAILABLE PRIMITIVE COMPONENTS (already defined, use as-is):
  ImageFrame({ w, h, label, n, focal_x=50, focal_y=50 })
    ← dark placeholder rect with crosshair SVG and terra dot
    ← real images: object-fit cover, object-position {focal_x}% {focal_y}%

  SectionMark({ children })
    ← Courier Prime 8px uppercase, letter-spacing 0.16em, terra color

  GoldMark({ children })
    ← same as SectionMark but gold color

  TerraRule({ thickness=1.5 })
    ← solid terra horizontal rule, full width

  GoldRule({ thickness=1 })
    ← solid gold horizontal rule, full width

  DoubleRule()
    ← 1.5px terra + 0.5px gold stacked with 2px gap

  Folio({ page, side, dark=false })
    ← left side: gold ◉ + page + "/ online//offline"
    ← right side: page + "/" + season
    ← dark=true for use on dark-background pages

  GrainOverlay()
    ← SVG fractalNoise paper texture, fixed overlay, mix-blend-mode overlay

  RegistrationMark({ side })
    ← "left" or "right" — bottom corners only, gold, opacity 0.18

  BleedMarks({ dark=false })
    ← crop marks at all 4 corners, extends beyond page via inset:-20px wrapper

  VerticalContributorLabel({ name, type, issue })
    ← rotated 90°, left margin, Courier Prime 8px uppercase, gold ◆ glyph

  Annotation({ label, style })
    ← shown only when showAnnotations=true, terra background label

MANDATORY REQUIREMENTS — every template must:
  1. Accept props: data={} and showAnnotations=false
  2. Include GrainOverlay on every page
  3. Include RegistrationMark side="left" and side="right" on every page
  4. Include BleedMarks on every page
  5. Include Folio on every page (omit only on Cover and Colophon)
  6. Have fallback values for every data field so it renders without real data
  7. Export via Object.assign(window, { TemplateName })
  8. Use position:absolute for all layout — no flexbox or grid on the page root
  9. Full-bleed elements: position absolute, top:0, left:0, width:AW, height:AH
  10. Never leave a gap between a colored element and the page edge —
      extend to full canvas including bleed

MINIMUM TEXT SIZES:
  Body text: 11px minimum, line-height 1.75 minimum
  Captions: 8px minimum
  Folio / metadata: 7.5px minimum
  Nothing below 7.5px

DATA FIELDS — always include labeled slots for:
  content.page_title       ← collection/submission title, large display type
  content_entry.title      ← individual image/piece title, per item
  content_entry.caption    ← individual image/piece caption, per item
  contributor.name         ← always terra Courier Prime
  contributor.city         ← always muted Courier Prime, beside or below name
  content.type             ← Photography / Art / Poetry / Essay / Music
  period.season            ← e.g. "Spring 2026"
  content_entry.focal_x    ← 0–100 float, pass to ImageFrame focal_x prop
  content_entry.focal_y    ← 0–100 float, pass to ImageFrame focal_y prop

SPREAD TEMPLATES additionally:
  - Use className="print-page-spread" (1580×1054px) not "print-page"
  - Left page: dark background, full-bleed images
  - Right page: light paper background, text/caption content
  - Gutter shadow: absolute 10px wide centered gradient between pages
  - Folio: left page bottom-left only, right page bottom-right only
  - WordMark top-left of left page: Courier Prime 8px,
    "online" + "//" (terra) + "offline" in rgba(224,90,40,0.55)

SHOW ANNOTATIONS MODE:
  When showAnnotations=true, render Annotation components over each
  data field showing its field name. This is used for design review.
  Example: <Annotation label="contributor.name" style={{ top:10, left:0 }}/>
```

---

## Part 2 — Design Language Reference
### (Read this before designing. Paste relevant sections into Claude Design prompts.)

### The aesthetic
Print shop at dusk. Proof light tables. Letterpress type. Registration marks.
Neon-lit darkrooms. Warm, considered, slightly industrial. Not tech. Not startup.

Every element either participates in the terra/gold color system or recedes
into the warm dark. Nothing is neutral. Nothing is default.

### Typography hierarchy
```
Display / titles:    Instrument Serif, 28–80px depending on context
                     Tight line-height (0.88–1.0) for large type
                     Letter-spacing -0.01 to -0.04em for large sizes

Editorial italic:    Instrument Serif italic — pull quotes, captions, status words,
                     poem titles, essay titles

Body text:           Instrument Serif 12.5px / line-height 1.88 for essays
                     Instrument Sans 300/400 for descriptions, secondary text

Labels / metadata:   Courier Prime, 7.5–9px, uppercase, letter-spacing 0.10–0.16em
                     Used for: contributor names, section marks, folios, index numbers,
                     dates, word counts, mode labels

Minimum sizes:       Body 11px · Captions 8px · Metadata 7.5px
```

### Layout personality
- Generous margins — the live area (652px) is intentionally narrower than the page
- VerticalContributorLabel in left margin of light-background pages
- Header band: edge-to-edge dark band at top of dark-header templates
- DoubleRule (terra + gold) below headers on light-background pages
- Images bleed to page edge — never stop at margin on dark pages
- Gold index numbers overlaid on images, bottom-left, Courier Prime 11–13px
- Terra 2px vertical rule on primary image left edge (stacked layouts)

### Dark vs light pages
Dark pages (ground background):
- Images bleed to all edges
- Text in C.paper / C.paper3 / C.paper4
- Folio dark=true
- BleedMarks dark=false (gold marks on dark background)

Light pages (paper background):
- VerticalContributorLabel in left margin
- DoubleRule below header
- Images contained within live area margins
- Text in C.ground / C.paper3 / C.paper4
- BleedMarks dark=true (dark marks on light background)

### Grain texture
Applied via GrainOverlay component on every page. Non-negotiable.
Gives pages a tactile printed feel. SVG fractalNoise, mix-blend-mode overlay.

### Registration marks
Bottom corners only. Gold color. Opacity 0.18. Never top corners.
Applied via RegistrationMark component.

### The // separator
In "online//offline": the // always renders in terra (#e05a28).
"online" and "offline" render in whatever the surrounding text color is.
On dark pages at small sizes, online/offline can be rgba(224,90,40,0.55) (softer).

---

## Part 3 — Template Wiring Checklist
### (Use this when adding a new template to the generation pipeline)

When a new template is designed in Claude Design and ready to wire into the pipeline:

### Step 1 — Add to the preview HTML
- Add the template component to the relevant `templates-N-N.jsx` batch file
  (or its own file if splitting has begun)
- Add sample data object: `const sampleNewTemplate = { ... }`
- Add render line to PrintApp:
  - Single page: `<div className="print-page"><NewTemplate data={sampleNewTemplate}/></div>`
  - Spread: `<div className="print-page-spread"><NewTemplate data={sampleNewTemplate}/></div>`
- Add to Object.assign export at bottom of the JSX file

### Step 2 — Add to the template index
In `src/magazine/templates/base/index.js`:
- Add the template name to the Active Templates comment block
- Add its trigger condition to the Selection Logic summary

### Step 3 — Add to SELECTION_LOGIC.md
Document exactly when this template fires:
- Which content type(s) trigger it
- What conditions (image count, word count, mode, etc.)
- Whether it's a single page or spread

### Step 4 — Add TypeScript type (when pipeline is built)
In `src/magazine/core/types.ts`:
- Define the props interface for the new template
- Add it to the union type used by the pipeline mapper

### Step 5 — Add to the pipeline mapper (when pipeline is built)
In `src/magazine/core/generator.ts`:
- Import the new template
- Add its condition to the selection logic switch/if chain
- Ensure correct page count is added to the running total

### Step 6 — Test with real data
- Wire a real curator selection that would trigger this template
- Verify all data fields populate correctly
- Verify focal_x / focal_y crop works on real images
- Check Puppeteer render at deviceScaleFactor:4

---

## Part 4 — Per-Issue Template Variation
### (How to create issue-specific template overrides)

Each quarterly issue can have unique visual variants while inheriting base infrastructure.

### Folder structure
```
src/magazine/templates/
├── base/                    ← canonical templates, always used as fallback
│   ├── CoverA.tsx
│   ├── SpreadPanorama.tsx
│   └── ... (all 18 templates)
├── spring-2026/             ← issue-specific overrides
│   ├── Cover.tsx            ← this issue's cover design
│   ├── index.ts             ← exports complete template set for this issue
│   └── (only files that differ from base)
└── autumn-2026/
    ├── Cover.tsx
    └── index.ts
```

### Issue index.ts pattern
```typescript
// spring-2026/index.ts
import * as Base from '../base'
import { SpringCover } from './Cover'
import { SpringSpread } from './Spread'  // if this issue has a unique spread

export const Spring2026Templates = {
  ...Base,                    // inherit everything from base
  CoverA: SpringCover,        // override just what's different
  SpreadPanorama: SpringSpread,
}
```

### Top-level template registry
```typescript
// src/magazine/templates/index.ts
import { Spring2026Templates } from './spring-2026'
import { Autumn2026Templates } from './autumn-2026'

export const TEMPLATE_SETS: Record<string, typeof Spring2026Templates> = {
  'spring-2026': Spring2026Templates,
  'autumn-2026': Autumn2026Templates,
}
```

### Triggering the right set
The `periods` table should carry a `template_set_name` field (e.g. 'spring-2026').
The pipeline reads this and loads the matching template set:
```typescript
const templates = TEMPLATE_SETS[period.template_set_name] ?? TEMPLATE_SETS['base']
```

### What to vary per issue
Good candidates for issue-specific overrides:
- Cover design (always unique per issue)
- Cover accent color or seasonal palette adjustment
- A new spread variant that fits the season's aesthetic
- Colophon design

What to keep in base (never override per issue):
- Primitive components (ImageFrame, Folio, GrainOverlay, etc.)
- Core constants (W, H, BLEED, margins)
- The selection logic

---

## Part 5 — Claude Design Session Workflow
### (Step-by-step process for designing a new template)

1. **Prepare the prompt**
   - Start with the full Part 1 boilerplate (paste verbatim)
   - Add the specific template brief after the boilerplate
   - Include the exact data shape the template should accept
   - Include sample data with plausible content (not Lorem ipsum)
   - Specify single page or spread
   - Specify dark or light background (or dark left / light right for spreads)

2. **Reference the existing file**
   - Attach the current `online-offline-magazine-v7.html` preview file
   - Tell Claude Design: "Study this file first. Match the design language exactly.
     Do not modify existing templates."

3. **Request output format**
   - Ask for the new template appended to the existing file
   - Ask for the Object.assign export updated
   - Ask for sample data added
   - Ask for render line added to PrintApp

4. **Verify before committing**
   - Open the HTML file in a browser — does it render without errors?
   - Does it match the design language of existing templates?
   - Are all data fields present with annotations working?
   - Does GrainOverlay appear? Registration marks? BleedMarks?
   - Is the folio correct (left page left-only, right page right-only for spreads)?
   - Are all text sizes above minimums?

5. **Hand off to Claude Code**
   - Once design is verified, give Claude Code the updated JSX files
   - Claude Code commits to `src/magazine/templates/base/`
   - Claude Code updates `index.js` and `SELECTION_LOGIC.md`

---

## Part 6 — Known Gotchas
### (Hard-won lessons specific to template development)

- **Never mix border shorthand with borderBottom** — causes React style warning
- **Never use window._magazineSeason** in new templates — pass season via data prop
  (the existing Folio component uses this global but it will be removed)
- **Spread page numbers:** left page = data.page, right page = data.page + 1
  Ensure generation pipeline always assigns even numbers to spread left pages
- **Object.assign export** — every JSX file must export all its components or
  they won't be available to the preview HTML
- **Annotation components** — always wrap in `{showAnnotations && (...)}`,
  never render unconditionally
- **Image placeholders** — always use ImageFrame, never a plain div with background
- **Folio on spreads** — left page: side="left" only. Right page: side="right" only.
  Never both on the same page.
- **BleedMarks dark prop** — dark=false (gold marks) on dark pages,
  dark=true (dark marks) on light pages
- **Full-bleed images** — use position:absolute, top:0, left:0, width:AW, height:AH
  not width:100%, height:100% (percentage sizing can have rounding issues)
- **Gutter shadow on spreads** — position:absolute, centered at AW from left,
  width:10px, full height, linear-gradient dark-to-transparent-to-dark
- **VerticalContributorLabel** — only on light-background pages, never dark
- **Minimum caption word count for SpreadPanorama** — the caption band is 72px,
  fitting ~20–30 words comfortably, 50 words maximum before switching to Spread

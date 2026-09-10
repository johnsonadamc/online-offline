# PROJECT_CONTEXT.md — online//offline

## What This Is

online//offline is a **slowcial media platform** — a direct, deliberate counterpoint to dopamine-driven social media. It is not trying to compete with Instagram, Substack, or any existing platform. It occupies a different category entirely.

The core proposition: contributors submit creative work quarterly. Curators select what goes into their personalized printed magazines. The physical magazine is the product. The app is the infrastructure that makes it possible.

The pace is intentional. Quarterly submissions, printed artifacts, real editorial curation. The platform rewards patience and deliberateness — qualities that every other platform has engineered out of existence.

---

## The Printed Magazine as Product

The magazine is not a metaphor or a feature — it is the literal output of the system. Everything in the app exists to make the magazine possible:

- Contributors submit because their work might be selected and printed
- Curators engage because they are making something real and physical
- Collaborations produce collective pages in the printed edition
- Communications between contributors and curators inform editorial decisions

This distinction matters for every product decision. The app should feel like **infrastructure for a print publication**, not a social platform that happens to print things. It should feel calm, considered, and purposeful — like a well-designed editorial tool, not a feed.

---

## Design Philosophy

The app runs on **Design System v2** ("B", September 2026) — warm dark ground, ink text, one accent per meaning. Calm and purposeful, like a well-made editorial tool; the grain and registration marks remain as the print-shop signature.

- **Tokens** (globals.css, the only app tokens): `--bg` / `--bg2` ground, `--line` / `--line2` hairlines, `--ink` / `--ink2` / `--ink3` text, and five oklch accents `--orange` `--gold` `--green` `--blue` `--purple`.
- **Fonts:** Instrument Serif (titles, names, prices, season) · Hanken Grotesk as `--font-sans` (labels, body, buttons) · JetBrains Mono as `--font-mono` (numbers, counts, status words, 10px section labels).
- **Meaning map:** orange = content/deadline · gold = communications/invites/"yours"/prompt label · green = local collabs, primary action, selected, submitted ✓ · blue = community · purple = private. Contributor type: photography blue, art purple, writing (poetry + essay) gold.
- **Color at rest** is a 6px dot, a 28px tinted icon tile (12% tint), or a hairline — never a filled panel, never colored body text (mono numbers excepted). Glow only on the one primary action per screen. Loading = mono "loading…"; empty = one italic serif line; no spinners; inline SVGs only.
- **`PageShell`** is every page's root and the only place a page background is painted: full-width `--bg`, a centered 560px column with 24px side padding, `header` and sticky `footer` slots. Mobile-first at 390px, single column. Primitives live in `src/components/v2/`.
- The v1 neon system and shadcn were retired in Phase 13; the magazine templates keep their own constants (below) and are untouched by app design work.

### Magazine Color System
The magazine uses a two-color accent system distinct from but related to the app:
- **Terracotta `#e05a28`** — identity and action. Contributor names, section marks, header rules, signal dots. Inspired by the Sun King Pensacola logo palette.
- **Gold `#e8a020`** — structure and warmth. Index numbers on images, decorative rules, folio numbers, registration marks, pull quote borders, ad pages.

These two colors never appear on the same element. On the cover, gold leads and terracotta accents — the inverse of interior pages.

---

## User Experience Principles

1. **Focus on participation** — prioritize calls to action that encourage participation in existing activities over creating new ones
2. **Simplify primary actions** — make the most important action on any screen immediately obvious
3. **Provide visual feedback** — use the neon system to indicate state changes
4. **Reduce cognitive load** — break complex tasks into simpler steps; use progressive disclosure
5. **Maintain context** — users should always know where they are in a process
6. **Prioritize content** — UI elements support rather than distract
7. **Implicit default states** — do not explicitly label draft status; only show submitted or published
8. **Consistent icon color coding** — community=blue, local=green, private=purple, everywhere, always
9. **Mobile-first** — primary usage is expected on phones
10. **No flashy animations** — the press mechanic button is the deliberate exception

---

## The Quarterly Rhythm

The platform runs on quarterly periods (seasons). This is a feature, not a limitation:

- Contributions have a deadline, which gives them weight
- Curators make selections under time pressure, which makes curation feel real
- The magazine has an edition structure, which makes each issue distinct
- Contributors know when to expect their work to appear in print

The countdown timer on the dashboard creates gentle urgency. Days remaining, not hours and minutes.

---

## Contributor and Curator Roles

**Contributors** are the creative engine. They submit photos, art, poetry, essays. They join collaborations. They send private communications to curators they want to work with.

**Curators** are the editorial voice. They select which contributors, collaborations, communications, and campaigns appear in their personalized edition. Each curator's magazine is different.

**Users can be both.** A contributor can curate and a curator can contribute. The dashboard's tab structure reflects this.

**A contributor can appear multiple times in one curator's magazine** — with a regular content spread, within a collab page, and in the communications page. Each appearance is treated as an independent entry.

---

## Collaboration System Philosophy

The three participation modes reflect different social dynamics:

- **Community** — open to everyone, globally. Creates a shared project feel across the platform. The magazine collab page shows a random selection of submitted images.
- **Local** — city-specific. Creates genuine geographic communities. The city is a design element in the magazine layout, not just metadata.
- **Private** — invite-only, 8–10 members. Creates intimate creative circles. The private collab magazine page is identical for all members — a shared artifact.

---

## Magazine Generation — Current State and Architecture

### Status
Template design system is complete. Generation pipeline is the next major build.

### Template System (completed May 2026)
18 active templates designed in React+JSX, committed to `src/magazine/`:

**Structure pages:** CoverA, FrontMatter (TOC + curator attribution), ColophonPage

**Visual spreads (Photography / Art) — always two pages:**
- SpreadPanorama — 1 image, full bleed, minimal caption band (≤50 word captions)
- Spread — 1 image, full bleed left + generous text right (>50 word captions)
- Spread2 — 2 images stacked left + indexed captions right
- Spread4 — 4 images grid left + caption grid right
- SpreadMosaic — 5–6 images integrated across both pages, light background
- Spread6 — 7–8 images grid across both dark pages, image-dominant

**Text submissions:**
- TextSubmission — single page, essay ≤500 words
- TextSpread — two pages, essay 501–1800 words
- PoetryPage — single page, narrow centered column, auto-detected from line break density

**Collaborations — always two pages, mode-differentiated:**
- CollabSpreadCommunity — expansive, global feel, light background
- CollabSpreadLocal — city watermark, dark left / light right, city as design element
- CollabSpreadPrivate — fully dark both pages, intimate, members listed in header

**Support:** CommunicationsPage (shared page, up to 4 message cards), CampaignPage (one per selected ad)

### Template Selection Logic
Full decision tree in `src/magazine/SELECTION_LOGIC.md`. Summary:

| Content type | Condition | Template |
|---|---|---|
| Photography / Art | 1 image, caption ≤50 words | SpreadPanorama |
| Photography / Art | 1 image, caption >50 words | Spread |
| Photography / Art | 2 images | Spread2 |
| Photography / Art | 3–4 images | Spread4 |
| Photography / Art | 5–6 images | SpreadMosaic |
| Photography / Art | 7–8 images | Spread6 |
| Essay | ≤500 words | TextSubmission |
| Essay | 501–1800 words | TextSpread |
| Poetry (auto-detected) | any length | PoetryPage |
| Collab, community mode | — | CollabSpreadCommunity |
| Collab, local mode | — | CollabSpreadLocal |
| Collab, private mode | — | CollabSpreadPrivate |
| Communications | — | CommunicationsPage |
| Campaign | — | CampaignPage |

### Poetry Auto-Detection
A text submission is classified as poetry if ALL of the following are true:
- 3+ line breaks within any 100-word span
- Average line length under 60 characters
- At least one stanza break (double line break)

Free verse without consistent line breaks falls through to essay treatment.

### Page Ordering
1 CoverA · 2 BlankPage · 3 FrontMatter · 4+ content · last ColophonPage.

Content is **interspersed, not grouped by type** — submissions, collab spreads, the CommunicationsPage and
CampaignPages are one interleaved run ordered by `orderContentForFlow()` in `generator.ts`:
- Every two-page spread starts on an **even page** so it reads across the fold (hard rule). Content starts on
  page 4; spreads are parity-neutral, so single pages are placed in even-sized pairs ("mortar") before spreads
  and a lone leftover single goes to the tail.
- No two spreads back-to-back where singles exist to separate them.
- Content types are dispersed evenly (deterministic largest-bucket-first round-robin, not random).
- A BlankPage filler is a last resort only (it logs "alignment fallback" and should never fire).

FrontMatter TOC is built last, from the final numbered order (two-pass).

### The Decision: Web-to-Print, Not InDesign
React components ARE the page templates. The browser IS the preview system.
Puppeteer renders them to print-ready PDFs. Benefits:
- Curators can preview in browser before printing
- Templates are maintainable by anyone who knows React
- Pipeline is fully automated and scalable
- No external design software

### Print Specifications
- Page size: 768×1032px + 11px bleed on all sides = 790×1054px canvas
- Render scale: `deviceScaleFactor: 4` in Puppeteer (~300dpi equivalent)
- Color: RGB output (print-on-demand services handle RGB→CMYK)
- Bleed and crop marks: included in all templates via BleedMarks component
- Target page count: ~38–40 pages for 20 curator selections

### Per-Issue Template Variation
Each quarterly issue can have unique template variants while inheriting base infrastructure.
Future folder structure: `src/magazine/templates/spring-2026/`, `autumn-2026/`, etc.
Each issue exports a complete template set via `index.js` that the pipeline imports.
The `periods` table will carry a `template_set_name` field mapping to the right set.

### Print Fulfillment
Printers are **output profiles** (`src/magazine/core/printProfiles.ts`), never design constraints — the
790×1054 design canvas is the master and only the PDF output mapping changes per printer:
- **`screen`** (default) — 790×1054pt, PNG at deviceScaleFactor 4, printer marks on. Used by `generate-test`
  and the admin preview.
- **`magcloud`** — 8.5×11in (612×792pt) for MagCloud's Standard magazine (8.25×10.75in trim): asymmetric bleed
  (spine side 0), a 0.1in safety inset with a bleed underlay, no printer marks, JPEG q92 at deviceScaleFactor 3
  (~22MB, under MagCloud's 300MB cap). **MagCloud accepted the PDF** — the system is print-validated.
- **Next:** Mixam as a second profile (better unit price at ≥~10 copies, real paper choices), API later.

**First run:** MagCloud, manual upload of the `magcloud` PDF. Both printers handle RGB→CMYK; test terracotta
(#e05a28) and gold (#e8a020) on the first physical copy — warm colors can shift noticeably in CMYK.

The magazine templates' fonts (Instrument Serif / Instrument Sans / Courier Prime, loaded by the generated HTML)
and colors (`C.` constants above) are **unchanged by the app's Design System v2 redesign** — they are a separate
system and app design work never touches `src/magazine/`.

### Focal Points (Not Yet Implemented)
Templates support `focal_x` and `focal_y` (0–100 float) on each image entry.
These control CSS `object-position` for print crops. Currently defaults to 50/50.
Must be added to:
1. `content_entries` table (focal_x float, focal_y float, aspect_ratio float)
2. `/submit` form (clickable image preview, contributor sets crop center)
This is the highest-impact missing piece for print output quality.

---

## Magazine Pricing Model

Base price to curator: **$25.00** per edition
Each selected campaign: **−$2.00** (shown live in curate interface)
Min price: $25 − (max campaigns × $2) — no floor set yet

Unit print cost target: ~$8–10 at Magcloud for 40-page full-color saddle-stitched.
Margin improves at volume. First season priority: prove the model, not optimize margin.

---

## Go-to-Market Notes

**Not yet open to real users.** Development uses three test accounts.

When ready:
- Target: photographers, essayists, poets, visual artists dissatisfied with existing platforms
- The hook: "your work, printed" — no other platform offers this
- Local collab creates geographic texture that makes the platform feel personal
- Curator role appeals to editorial/curation-minded users who want to make something

**The name:** online//offline — the `//` represents the translation between digital submission and physical print. In the app wordmark, `//` renders in `--paper-5` (most muted). In the magazine, `//` always renders in terracotta `#e05a28`.

---

## What This Is Not

- Not a social feed — no algorithmic timeline, no likes, no follower counts
- Not a content marketplace — contributors don't sell their work directly
- Not a newsletter platform — the output is a physical magazine, not email
- Not Instagram for print — the deliberate pace and editorial layer are the product

The clearest one-line description: **a curated, modular, printed social magazine — made quarterly, one per curator, from contributed creative work.**
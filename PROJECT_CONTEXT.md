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

The aesthetic references: a **print shop at dusk**, proof light tables, letterpress type, registration marks, neon-lit darkrooms.

The single rule: every UI element participates in the neon color system or recedes into the warm dark. Nothing is neutral gray. Nothing is pure white. Nothing is default blue.

The app is warm, considered, and slightly industrial. Not tech. Not startup. Print culture, digitized.

This matters beyond aesthetics — the design communicates to users that this is a serious creative platform, not another content mill. The deliberate darkness, the serif type, the grain texture, the registration marks: these signal that what happens here has weight.

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

**Contributors** are the creative engine. They submit photos, art, poetry, essays, music. They join collaborations. They send private communications to curators they want to work with.

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

**Music:** MusicPage — single page with QR code placeholder (URL collection TBD)

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
| Music | any | MusicPage |
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
Cover → FrontMatter → Photography → Art → Essay/Poetry → Music → Collabs →
Communications → Campaigns → Colophon

FrontMatter TOC is built last (after page numbers are assigned to all other pages).

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
**First season:** Magcloud (manual PDF upload, no API integration needed)
**Future:** Mixam API (automated order submission, variable data per curator)

Both handle RGB→CMYK. Test terracotta (#e05a28) and gold (#e8a020) in a test print
before the first full run — warm colors can shift noticeably in CMYK.

### Focal Points (Not Yet Implemented)
Templates support `focal_x` and `focal_y` (0–100 float) on each image entry.
These control CSS `object-position` for print crops. Currently defaults to 50/50.
Must be added to:
1. `content_entries` table (focal_x float, focal_y float, aspect_ratio float)
2. `/submit` form (clickable image preview, contributor sets crop center)
This is the highest-impact missing piece for print output quality.

### Music Submission Flow (Planned)
Contributors submit a Spotify or Bandcamp URL with their music submission.
The URL is converted to a QR code at generation time and printed on MusicPage.
UI addition needed on `/submit` when content_type === 'Music'.

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
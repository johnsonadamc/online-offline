# online//offline — Claude Design kit

Everything Claude Design needs to design a full issue's templates from your own inspiration. Attach this file plus your reference images to a Claude Design session, then paste the prompts below one batch at a time.

**What you get:** a working HTML preview of every page type in your new style, built so it can drop into the renderer later.
**What you don't get yet:** pages in the printed book. Wiring a new set in needs the theme layer and a Claude Code session to port the components into `src/magazine/templates/`. The preview is the design; the port is a separate, mechanical step.

---

## How to run it

1. **Batch 0 — style sheet (one session, ~30 min).** Attach your inspiration images and paste the Batch 0 prompt. Iterate until the style sheet page feels right. Everything after follows it.
2. **Batches 1–5 — templates (one session each, ~30–60 min).** Each batch continues the same HTML file: attach the latest file, paste the next prompt. Keep batches small; 17 page types in one go degrades quality.
3. **Review each batch against the checklist at the bottom** before starting the next.
4. **When all batches pass:** hand the final HTML to Claude Code for the port (after the theme layer exists).

Tip: if a batch drifts from the style sheet, say "check every element against the style sheet page and list anything that doesn't trace back to it" before asking for fixes.

---

## The rules block

Every batch prompt below starts with this block. Paste it verbatim at the top of each prompt.

```
RULES FOR ALL online//offline TEMPLATES — follow exactly.

THE MAGAZINE
online//offline is a printed magazine made each season. Contributors submit photography, art, poetry and essays; each curator gets their own copy built from their picks. Pages are React components that receive a `data` object and are rendered to PDF by Puppeteer. Each issue has its own fonts, colors and layouts.

CANVAS
Single page: 790 × 1054 px (768 × 1032 trim + 11 px bleed on every side). Spread (two facing pages): 1580 × 1054 px, fold at x = 790.
Anything that touches an edge runs to the canvas edge (full bleed), never stopping short of it.
Safe zone: all text, faces and key detail at least 47 px from every canvas edge, and at least 36 px from the fold on each side (keep x = 754–826 clear on spreads). No body text crosses the fold; display type 40 px or larger may.
Use position: absolute for layout on the page root; no flex or grid on the root element.
Minimum text sizes: body 11 px with line-height at least 1.75; captions 8 px; labels and page numbers 7.5 px.

THEME
Every font and color comes from ONE `THEME` object at the top of the file: fonts { display, text, label } and colors as named roles (paper, ink, accent, accent2, muted, rule, …), plus any @font-face. Fonts are Google Fonts, or a font file I attach, embedded with @font-face as a base64 data URI. No hex value or font name may appear anywhere else in the file. Changing THEME alone must restyle every page.

DATA RULES
- Each component is `function Name({ data, theme = THEME })`.
- Sample content lives in separate sample data objects, never as fallback values inside components. If a field is empty or missing, omit that element and keep the layout looking finished. Never render placeholder text.
- Only the piece title and contributor name are guaranteed. City, image titles and captions may be missing.
- Images use object-fit: cover and object-position `${focal_x}% ${focal_y}%` (0–100, default 50). Every frame must work for landscape, portrait and square images; no frame more extreme than 1 : 2.5.
- Single pages receive data.page. Even = left-hand page, odd = right-hand page. Page number with season (e.g. "14 / Spring 2026") on the OUTSIDE bottom corner; mirror any asymmetric element. Spreads: left page = data.page (even), right page = data.page + 1. No page number on the cover, back cover or ad pages.
- The wordmark is online//offline, lowercase, with the // in the accent color.
- Content types are Photography, Art, Poetry and Essay. There is no Music.

OUTPUT
One self-contained HTML file: React, ReactDOM and Babel standalone from a CDN; Google Fonts link; the THEME object; the components; the sample data objects; and a preview that stacks every requested state vertically at full size with a small label above each. Export all components with Object.assign(window, { ... }). When I attach an existing file, APPEND to it: keep THEME and every existing component unchanged unless I ask.

After the file, list: (1) any rule you couldn't meet, and why; (2) any question my style sheet didn't answer, and the choice you made.
```

---

## Page catalogue — data shapes and states

These shapes are simplified. The real pipeline keys differ slightly (see `docs/TEMPLATE_CONTRACT.md` in the repo); the Claude Code port maps them. Design against these.

**Shared by every photo spread:**
`{ page, season, page_title, type ("Photography" | "Art"), contributor: { name, city }, entries: [{ media_url, title, caption, focal_x, focal_y }] }`

| Component | Pages | Holds | States to render |
|---|---|---|---|
| **Cover** | 1 | `{ season, volume, issue, cover_image }` | one |
| **FrontMatter** (contents) | 1, page 3 | `{ page, season, curator_name, entries: [{ page, title, contributor_name, type }] }` — 10–25 entries | 10 entries; 25 entries |
| **Endpaper** | 1 | `{ page, season }` — texture or pattern; inside front cover and filler | one |
| **ColophonPage** (back cover) | 1, last | `{ season, volume, issue, about_text (80–120 words), contributors: [names] (8–25), artist_credit, printer_line }` — no page number | 8 names; 25 names |
| **SpreadPanorama** | 2 | 1 entry · caption 0–60 words, clamp longer with an ellipsis | landscape + 55-word caption; portrait, no caption, no city |
| **Spread** (photo with story) | 2 | 1 entry · caption 51–250 words, set as a short text | landscape + 60 words; portrait + 250 words |
| **Spread2** | 2 | 2 entries · title 0–8 words, caption 0–80 words each | two portraits, full captions; landscape + portrait, one caption and one title missing |
| **Spread4** | 2 | 3–4 entries · caption 0–50 words · must look complete with 3 | 3 images; 4 mixed shapes |
| **SpreadMosaic** | 2 | 5–6 entries · caption 0–40 words | 5 images; 6 mixed, one caption missing |
| **Spread6** | 2 | 7–8 entries · caption 0–25 words, or a numbered caption list | 7 images; 8 portraits |
| **TextSubmission** (essay) | 1 | `{ page, season, page_title, contributor: { name, city }, body }` — 150–500 words, paragraphs split by blank lines, no pull quote | 500 words, page 7; 180 words, page 12 |
| **TextSpread** (long essay) | 2 | same shape — 501–1,200 words | 520 words; 1,200 words |
| **PoetryPage** | 1 | same shape — 4–40 lines, most under 60 characters, blank line = stanza break; never rewrap a line; two columns allowed over ~18 lines | 12 lines, page 6; 40 lines, page 9 |
| **CollabSpreadCommunity** | 2 | `{ page, season, collab_title, description (≤40 words), entries: [{ media_url, contributor_name, title, focal_x, focal_y }] (2–6), participants: [names] }` — show up to 5 names, then "and N others" | 2 entries, 3 participants; 6 entries, 40 participants |
| **CollabSpreadLocal** | 2 | same + `city` as a design element (shortest "Miami", longest "San Francisco") | Miami, 2 entries; San Francisco, 6 entries |
| **CollabSpreadPrivate** | 2 | same, but 2–10 members, every name shown; one entry per member (2–10) | 2 members; 10 members |
| **CommunicationsPage** (letters) | 1 | `{ page, season, curator_name, notes: [{ sender_name, subject (≤10 words), body (≤250 words) }] (1–4) }` — show an excerpt of ~200 words then "…" | 1 note; 4 notes at full length |
| CampaignPage (ad) | 1 | advertiser's own art, full bleed — **don't design** | — |

---

## Batch prompts

Paste the rules block first, then one of these.

### Batch 0 — style sheet
```
Before any templates, create ONE style sheet page (790 × 1054) for this issue from my attached inspiration images. It must define, visibly on the page:
- the issue's feeling in one sentence
- the THEME: display, text and label fonts, and 4–6 named colors
- how each recurring element looks: piece title, contributor name + city, caption, page number with season, section label ("POETRY", "ESSAY", "PHOTOGRAPHY", "COLLABORATION"), the wordmark
- any texture, rule, border or mark that repeats through the issue, and how photos are framed (bleed, borders, rules, gaps)
- how empty space is handled
My notes on the feel: [WRITE A FEW LINES HERE]
Every later page will follow this sheet, so make each rule specific enough to apply to a page it doesn't show.
```

### Batch 1 — cover and small photo spreads
```
Attached: the style sheet file. Following it exactly, build: Cover, SpreadPanorama, Spread2, Spread4. Render the states listed for each in the attached kit's page catalogue. Use my attached photos for images.
[Optional: describe or attach sketches for any of these layouts.]
```

### Batch 2 — larger photo spreads
```
Attached: the current file. Append: SpreadMosaic, Spread6, Spread (photo with story). Render the catalogue states. They should feel like siblings of Batch 1's spreads without repeating their layouts.
```

### Batch 3 — writing and letters
```
Attached: the current file. Append: TextSubmission, TextSpread, PoetryPage, CommunicationsPage. Render the catalogue states. The poem page can't reuse the essay's columns: line breaks are fixed.
```

### Batch 4 — collaborations
```
Attached: the current file. Append: CollabSpreadCommunity, CollabSpreadLocal, CollabSpreadPrivate. Render the catalogue states. Community should feel open and wide, Local should make the city the headline, Private should feel intimate — all within the style sheet.
```

### Batch 5 — frame of the book
```
Attached: the current file. Append: FrontMatter, Endpaper, ColophonPage. Render the catalogue states. The colophon is the outside back cover of the book.
```

---

## Review checklist (after every batch)

1. **It follows the style sheet.** Nothing new appears that the sheet doesn't account for.
2. **The theme swap works.** Change one color in `THEME`: every page updates. Search the file for `#`; no hex outside `THEME`.
3. **Safe zones hold.** No text near the edges or in the fold band (x 754–826 on spreads).
4. **Missing fields leave no holes** and no placeholder text.
5. **Counts hold.** The minimum and maximum states both look complete and nothing overflows.
6. **Left and right pages mirror.** Page numbers on the outside corner.
7. **Photos crop well** in every frame, portrait and landscape.
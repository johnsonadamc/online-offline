# TEMPLATE_CONTRACT.md — online//offline magazine templates, derived from the code

**Status:** written 2026-09-26 against `main` @ `26d167f`. Read-only investigation, and no template, primitive or
generator code was changed. Where this document and `src/magazine/TEMPLATE_DESIGN_GUIDE.md` /
`src/magazine/SELECTION_LOGIC.md` disagree, **this document wins**, because it was traced from the code. The guide's
problems are listed under "Guide discrepancies".

**Audience:** a designer building new or replacement templates that must drop into the existing renderer
unchanged.

**How to read coordinates:** every template renders on a design canvas of `AW×AH = 790×1054` CSS px per page
(768×1032 trim + 11 px bleed per side). The **design trim** is the rectangle x ∈ [11, 779], y ∈ [11, 1043]. On
spreads the canvas is 1580×1054. The left page is x ∈ [0, 790] and the right page is x ∈ [790, 1580], and the spine/gutter is
x = 790. "Page-local x" below is measured from the page's own left canvas edge. Unless stated, a number is computed
from the constants in code. Anything marked **(est.)** is an estimate from font metrics, not a measurement.

---

## 0. Pipeline in one paragraph (what a template actually receives)

`generateMagazine()` (`src/magazine/core/generator.ts:600`) fetches selections with the service role
(`generator.ts:259–489`), turns each selection into a `SelectionItem`, orders them with `orderContentForFlow()`
(`generator.ts:538`), assigns page numbers from 4 (`generator.ts:649–662`), and calls
`selectTemplate(item, page)` (`src/magazine/core/selectionLogic.ts:23`). That call returns
`{ templateName, pageCount, data }`. The generator then adds Cover/Blank/FrontMatter/Colophon
(`generator.ts:705–711`). Each page is rendered in its own headless-Chromium document built by `buildPageHtml()`
(`generator.ts:88–175`): Google Fonts + React 18 UMD + Babel standalone from unpkg, then **`primitives.jsx` and one
template `.jsx` file concatenated as text into a single `<script type="text/babel">`**. The component is looked up as
`window[templateName]` and rendered as `React.createElement(Component, { data })`. Nothing else is passed:
`showAnnotations` is always `false`. There is no per-issue template set. Every render uses
`src/magazine/templates/base/`.

---

## 1. Global rules

### 1.1 Constants (`src/magazine/core/primitives.jsx:4–7`)
```
W=768  H=1032  BLEED=11  SAFE_INSET=16
AW=790 AH=1054          (canvas incl. bleed; spreads are 1580×1054)
ML=58 MR=58 MT=56 MB=56 LIVEW=652
```
These are top-level `const`s in `primitives.jsx`. Because primitives and template share one Babel script, templates
see them lexically. `templates-1-4.jsx:365` also re-exports them on `window`.

The generator has its own copies: `AW=790, AH=1054` (`generator.ts:33–34`), `DESIGN_BLEED=11` (`generator.ts:734`).

### 1.2 Colors
`C` (`primitives.jsx:9–23`): `ground #252119 · ground2 #2e2a20 · ground3 #1e2428 · paper #f0ebe2 · paper2 #d8d2c8 ·
paper3 #b0a898 · paper4 #857d72 · paper5 #554d44 · terra #e05a28 · gold #e8a020 · rule rgba(240,235,226,.08) ·
ruleMid rgba(240,235,226,.14) · ruleStrong rgba(240,235,226,.24)`.

**Colors used outside `C.*` (literal values in code):**

| Value | Where |
|---|---|
| `#2a261d` | CoverA lower-zone tint (`templates-1-4.jsx:24`) |
| `#252119` literal | generator `<body>` background, BlankPage, placeholder template (`generator.ts:119,127,156`) |
| `#e8a020` literal | RegistrationMark strokes (`primitives.jsx:150–152`) |
| `#fff` | Annotation text (`primitives.jsx:226`), never rendered in production |
| `rgba(224,90,40,.5/.55/.6/.7)` | softened terra wordmarks on Spread/Spread2/Spread4/Spread6/SpreadPanorama/SpreadMosaic |
| `rgba(224,90,40,.12)` | CoverA margin rule (`templates-1-4.jsx:104`) |
| `rgba(240,235,226,.04 … .35)` | Folio dark text (.35), ImageFrame placeholder label (.2), CoverA meta (.28), Spread6 strip border (.10), CollabSpreadLocal city watermark (.04), `…,.14` card/strip rules |
| `rgba(232,160,32,.45/.5/.06)` | BleedMarks (light), Folio dark gold glyph, TextSubmission pull-quote tint |
| `rgba(37,33,25,.55/.88/.08)` | BleedMarks dark, SpreadPanorama caption band, FrontMatter TOC row rule |
| `rgba(0,0,0,.02–.35)` | every gutter-shadow gradient |

⚠️ `CommunicationsPage` card rules use `rgba(240,235,226,0.14)` (`templates-9-11.jsx:64`), a *light-on-dark* rule
colour, on a **paper** background. It is effectively invisible.

### 1.3 Fonts
`F` (`primitives.jsx:25–29`): `serif 'Instrument Serif', Georgia` · `sans 'Instrument Sans'` · `mono 'Courier Prime'`.

The generated HTML loads **exactly** (`generator.ts:150`):
`Instrument Serif ital@0;1` (regular + italic, weight 400) · `Instrument Sans wght@300;400;500` (roman only) ·
`Courier Prime` (regular 400 only). The admin preview loads the same URL
(`src/app/api/admin/preview/[curatorId]/route.ts:118`).

- **Courier Prime italic is NOT loaded**, but FrontMatter's TOC type label asks for it (`templates-20-24.jsx:115`,
  `fontStyle:'italic'` on `F.mono`). Chromium synthesises an oblique.
- `fontWeight:400` on serif and `fontWeight:300` on sans are the only weights used. No bold anywhere.
- Fonts come from the network at render time (`waitUntil:'networkidle0'` + `document.fonts.ready`,
  `generator.ts:203–204`). Offline renders fall back to Georgia / sans-serif / monospace.

### 1.4 Primitives available (all in `primitives.jsx`, all exported via `Object.assign(window, …)` at `:237–243`)

| Primitive | Signature (actual) | Behaviour |
|---|---|---|
| `ImageFrame` | `({ w, h, label='image', n='', focal_x=50, focal_y=50, media_url=null, style={} })` `:32` | `<img>` only when `media_url` starts with `https://`. `object-fit: cover`, `object-position: {focal_x}% {focal_y}%`. Otherwise it renders a `C.ground3` box + crosshair + terra dot + 7 px label. |
| `SectionMark` / `GoldMark` | `({ children })` `:64,73` | mono 8 px uppercase .16em, terra / gold. **Inline `<span>`**: it inherits the parent's line box. |
| `TerraRule` / `GoldRule` | `({ thickness=1.5 })` / `({ thickness=1 })` `:82,87` | full-width div |
| `DoubleRule` | `()` `:92` | 1.5 terra + 2 gap + 0.5 gold |
| `Folio` | `({ page, side, dark=false, season='Spring 2026' })` `:102` | left: gold `◉` + `"{page} / online//offline"`. Right: `"{page} / {season}"`, `justify-content:flex-end`. mono 8 px. **Season is a prop, with fallback `'Spring 2026'`.** |
| `GrainOverlay` | `()` `:122` | absolute inset 0, z 999, fractalNoise, blend overlay |
| `RegistrationMark` | `({ side })` `:140` | 14 px gold circle-cross at bottom 8 / left or right 8, opacity .18 |
| `VerticalContributorLabel` | `({ name, type, issue })` `:159` | box left:12, width 46, full height. Text rotated −90°, mono 8 px paper4. 0.5 px `C.paper5` rule at the box's right edge (page-local x = 57.5). **Always on the page's LEFT edge.** |
| `BleedMarks` | `({ dark=false })` `:188` | crop marks outside the trim, z 998 |
| `Annotation` | `({ label, style })` `:223` | design-review overlay; never rendered by the generator |

**Profile overrides:** with `includePrinterMarks:false` (magcloud) the generator rebinds `BleedMarks` and
`RegistrationMark` to `() => null` (`generator.ts:98–100`). With `includeGutterShadow:false` it injects
`.gutter-shadow{display:none!important}` (`generator.ts:107–109`). Every spread's gutter-shadow div **must** carry
`className="gutter-shadow"`.

### 1.5 Export / loading contract (what a new template MUST do)
1. Be a plain `function Name({ data={} })` in a `.jsx` file under `src/magazine/templates/base/`. It uses JSX, reads
   the constants and primitives as free identifiers, and has **no imports and no exports**. The file is concatenated
   as text, so a top-level name that collides with a primitive or with another component in the same file is a
   redeclaration error.
2. End the file with `Object.assign(window, { Name, … })`. The generator finds the component by
   `window[templateName]` (`generator.ts:167–168`).
3. Be registered in `TEMPLATE_FILE_MAP` (`generator.ts:39–60`), and in `SPREAD_TEMPLATES` if it renders 1580 px wide
   (`generator.ts:63–66`). That set decides the viewport width and the left/right screenshot split
   (`generator.ts:188–216`).
4. Also register it in the admin preview's **duplicate** `TEMPLATE_FILE_MAP` / spread set
   (`src/app/api/admin/preview/[curatorId]/route.ts:37`), or the preview renders the "Template not yet implemented"
   placeholder.
5. Be returned by `selectTemplate()` (`selectionLogic.ts`) for some item. `pageCount` there (1 or 2) must agree with
   `SPREAD_TEMPLATES`.
6. Render a root of exactly `AW×AH` (single) or `2·AW×AH` (spread) with `position:relative; overflow:hidden`. The
   page root's `overflow:hidden` is the **only** clip most templates have (see capacity notes).

`src/magazine/templates/base/index.js` is a comment-only catalogue. **The generator never imports it.**

### 1.6 How season / volume / issue / page reach a template
| Value | Source | Passed as |
|---|---|---|
| `season` | `periods.season` (`generator.ts:620`). Seed value is **`'Spring'`**, not `'Spring 2026'` (`scripts/seed.sql:42`). | `data.season` on every template except CampaignPage; Folio `season` prop is set explicitly by each template |
| `volume` / `issue` | `periods.volume ?? 'I'`, `periods.issue ?? 1` (`generator.ts:667`) | CoverA only: `data.volume`, `data.issue` |
| `page` | running cursor (`generator.ts:649–662`), cover=1, blank=2, frontmatter=3, content from 4 | `data.page` = the template's **first** page. Spreads print `data.page` on the left and `data.page + 1` on the right. |
| year | **never passed.** The only way a year appears is the fallback `'Spring 2026'` or if `periods.season` itself contains it |

`window._magazineSeason` is **not** used by any template, primitive or generator code. It survives only inside the
stale bundled preview `src/magazine/previews/online-offline-magazine-standalone.html`.

### 1.7 Left/right (recto/verso) handling
**No template reads `data.page` parity** (there is no `% 2` in any template, primitive or `isLeft` other than
RegistrationMark's `side` prop). Consequences:
- Spreads are always rendered as a pair, and the generator guarantees they start on an even (left-hand) page
  (`orderContentForFlow`, plus the blank-filler safety net at `generator.ts:653–657`).
- **Single-page templates are side-agnostic.** TextSubmission, PoetryPage and CommunicationsPage render BOTH a left
  folio and a right folio on the same page. PoetryPage and TextSubmission put `VerticalContributorLabel` on the
  page's left edge, which on an odd (right-hand) page is the **spine** side: the label text sits ~19 px inside the
  trim at the fold. The same applies to TextSpread's right page.
- The generator's even/odd mirroring (`generator.ts:764–765`) is a no-op since Option D (symmetric 0.125 in bleed).

### 1.8 Ordering, blank filler, and page count
- Page count = `3 + Σ pageCount + 1` (Colophon at `cursor`, `generator.ts:664`). **Nothing pads to a multiple of 4.**
  The only blank the generator can insert is the rule-4 alignment filler before a mis-aligned spread
  (`generator.ts:653–657`), and the ordering is built so it never fires.
- Measured (26 Sep 2026 dumps, `scripts/fixtures/`): **Lena 19 slots / 29 pages** (Colophon = page 29; saddle stitch
  needs 32). **Adam 19 slots / 28 pages** — a multiple of 4 by coincidence, not by padding. His book includes app-test
  data: extra 1-entry CollabSpreadPrivate and CollabSpreadCommunity spreads, and 4 campaigns. (This section's first
  version predicted 27 / 18 from the seed alone; the dumps supersede it.) See Open questions.
- `orderContentForFlow` only reorders. It never changes a template.
- ⚠️ The admin preview (`route.ts:486–492`) does **not** call `orderContentForFlow`. It lays items out grouped
  (creators → collabs → comms → campaigns) with no spread alignment, so its page numbers can differ from the printed
  book.

### 1.9 Global data caveats every template inherits
- **Content type comes from the contributor's profile**, not the submission: `profiles.content_type`
  (`generator.ts:292`, default `'photography'`). An `essay`/`poetry` contributor's submission always goes to the
  text templates, using `entries[0].caption` as the body. A photographer's submission always goes to the image
  templates.
- **`is_feature` is never fetched** (`generator.ts:279`), so no template knows which image is featured. Image order
  is `order_index` only (`generator.ts:295`).
- **`aspect_ratio` is fetched but no template reads it.**
- **Collab entries carry no focal point.** `collab_submissions` has no `focal_x/focal_y` and the fetch doesn't ask
  (`generator.ts:365–385`), so every collab image uses the template fallback of 50/50.
- **`focal_x || 50` bug-pattern:** every template passes `focal_x={entry.focal_x || 50}`, so a legitimate focal of
  **0** (hard left/top) becomes 50 (SpreadPanorama: 42/38). Use `??` in new templates.
- **Placeholder text leaks into print.** Templates use `data.x || 'Sample'`, so an empty string or a missing field
  prints the designer's sample copy. The generator sends `''` for a missing city (`generator.ts:312,382`), so
  **a contributor with no city prints the literal word "City"** on Spread/Spread2/Spread4/Spread6/SpreadPanorama/
  SpreadMosaic/TextSubmission/TextSpread/PoetryPage. The worst cases are the text templates (see TextSubmission and
  TextSpread).
- `content.status` filter is `.neq('status','draft')` (`generator.ts:283`), so **`archived` content prints too**.
- `contentType === 'music'` is still routed to `MusicPage` (`selectionLogic.ts:29–35`), even though Music is not a
  valid content type.

### 1.10 Edge-proximity baseline (applies to every page)
`RegistrationMark` (bottom 8 / side 8, 14 px) sits across the trim line at y 1032–1046. `BleedMarks` draws outside
the trim. Both are printer marks, suppressed under the magcloud profile, and are not repeated per template below.
The per-template "within 36 px" lists cover **text and rules** whose box is within 36 px of the design trim
(x 11/779, y 11/1043) or of the spine (x 790 on a spread). Everything else sits ≥ 36 px inside.

---

## 2. Template sections

Sample data in this section uses `$SEED/` = `https://cbdiujvqpirrvzodfujm.supabase.co/storage/v1/object/public/seed/`
(filenames from `scripts/seed-image-manifest.md`, which overrides the content doc). Seed season is shown as
`'Spring'`, which is what `periods.season` holds per `scripts/seed.sql:42`. `page` values are illustrative, because
the real numbers depend on `orderContentForFlow`.

Common `ContentPageData` (`src/magazine/core/types.ts:17–30`), built at `selectionLogic.ts:23–98`:
```ts
{
  page: number;                 // first page of the template
  type: string;                 // RAW profiles.content_type, lowercase: 'photography'|'art'|'essay'|'poetry'
                                //   (PoetryPage gets the literal 'poetry' from selectionLogic.ts:44)
  page_title: string;           // content.page_title ?? ''   (generator.ts:311)
  season: string;               // periods.season
  contributor: { name: string;  // "first last".trim() || 'Unknown' (generator.ts:234–236)
                 city: string };// profiles.city ?? ''  → '' prints the fallback 'City' in most templates
  entries: Array<{              // content_entries sorted by order_index (generator.ts:294–303)
    title?: string; caption?: string; media_url?: string;
    focal_x: number /*??50*/; focal_y: number /*??50*/; aspect_ratio: number|null;
  }>;
  // text templates only:
  body?: string; word_count?: number; body_para1?: string; body_para2?: string; body_para3?: string;
  pull_quote?: string;          // declared in types.ts:26 — NEVER set by selectionLogic
}
```

---

### 2.1 CoverA
- **File:** `templates/base/templates-1-4.jsx:11` · **pages:** 1 · **background:** dark (`C.ground`, lower 46% `#2a261d`)
- **Selection:** always page 1 (`generator.ts:706`), data built at `generator.ts:667`.
- **Data:** `{ page: 1, season: string, volume: string /*period.volume ?? 'I'*/, issue: number /*period.issue ?? 1*/ }`
  - `season` fallback `'Autumn / Winter 2026'`. The rendered word is `season.split(' / ')[0]` (`:13`), uppercase sans
    22 px. With seed data it prints **"SPRING"**.
  - `volume` fallback `'I'`, `issue` fallback `'1'`, printed as `Vol. {volume} · No. {issue}` (`:80`).
- **Passed, not rendered:** `page`.
- **Capacity:** season word is `nowrap`-free, single line at 22 px/.20em (a long season string wraps upward from the
  bottom-anchored block).
- **Frames:** none.
- **Primitives:** RegistrationMark ×2, BleedMarks (light), GrainOverlay. **No Folio** (by design).
- **Within 36 px of trim:** top metadata bar ("Curated Edition" / "Vol. · No."), top = BLEED+22 = y 33 → **22 px
  inside the top trim**, x 69–721.
- **Sample:** `{ page: 1, season: 'Spring', volume: 'I', issue: 1 }`

### 2.2 BlankPage
- **File:** inline string in `generator.ts:115–122` (no .jsx) · **pages:** 1 · **background:** dark `#252119`
- **Selection:** always page 2 (`generator.ts:707`), plus the last-resort alignment filler (`generator.ts:655`).
- **Data:** `{ season }`, which is **never read**.
- **Renders:** a bare 790×1054 div. **No GrainOverlay, RegistrationMark, BleedMarks or Folio.**
- **Sample:** `{ season: 'Spring' }`

### 2.3 FrontMatter
- **File:** `templates-20-24.jsx:5` · **pages:** 1 · **background:** light (`C.paper`)
- **Selection:** always page 3 (`generator.ts:708`). TOC built after numbering (`generator.ts:682–691`).
- **Data:**
  ```ts
  { page: 3,
    curator: { name: string /*profileName*/, city: string /*?? ''*/ },   // fallback {Lena Vasquez, Pensacola}; city '' → 'City'
    season: string,                                                       // fallback 'Spring 2026'
    toc: Array<{ page: number; contributor: string; type: string; title: string }> }
  ```
  `toc` contains **only solo creator submissions**: the filter keeps assignments whose data has `contributor` and
  `page_title` (`generator.ts:683`), so collabs, communications and campaigns are excluded. `type` goes through
  `normalizeContentType` (`generator.ts:670–680`: photography→Photography, art→Art, essay/writing→Essay,
  poetry→Poetry, music→Music). `title` = `page_title`.
- **Passed, not rendered:** `page` (no folio on this page).
- **Capacity:** TOC is an unbounded 2-column grid starting at y = BLEED+MT+274 = 341. Rows are ~24 px (13–14 px serif
  + 5+5 padding) (est.). The bottom imprint starts at ~y 960, so **≈25 rows × 2 = ~50 entries** fit before the TOC runs
  into the imprint, and nothing clips it. Contributor name is `nowrap` + `flexShrink:0`. Type and title ellipsize.
  Column width = (652 − 24)/2 = 314 px.
- **Frames:** none.
- **Primitives:** GoldRule, RegistrationMark ×2, BleedMarks dark, GrainOverlay, plus a local `ReverseDoubleRule`.
  **No Folio.**
- **Within 36 px:** none.
- **Sample (Lena):**
  ```js
  { page: 3, curator: { name: 'Lena Vasquez', city: '<profiles.city>' }, season: 'Spring',
    toc: [ { page: 4, contributor: 'Maya Torres', type: 'Photography', title: 'The Salt Line' },
           { page: 8, contributor: 'Daniel Osei', type: 'Essay', title: 'The Slow Channel' }, /* … 9 rows total */ ] }
  ```

### 2.4 SpreadPanorama
- **File:** `templates-18-19.jsx:7` · **pages:** 2 · **background:** one image across both pages (dark caption band
  at the bottom of both)
- **Selection:** `submissionType === 'fullSpread'` → always (`selectionLogic.ts:75–81`), whatever the image count
  or caption length. Or `regular` with exactly 1 entry and total caption words ≤ 50 (`selectionLogic.ts:87`).
- **Data:** `ContentPageData`. Reads `entries[0]` only: `media_url`, `focal_x` (fallback **42**), `focal_y`
  (fallback **38**), `caption` (fallback sample sentence). Also `contributor.name/city`, `page_title` (fallback
  'The Hour Before'), `type` (fallback 'Photography'), `page`, `season`.
- **Passed, not rendered:** `entries[0].title`, `aspect_ratio`, `entries[1..]` (a fullSpread with several images
  prints only the first).
- **Capacity:** caption 9.5 px italic / 1.3, **`WebkitLineClamp: 3`** (`:108`) inside a 38 px zone (y 988–1026).
  Measured (per code comment `:101–104`): 3 lines hold 67 words beside a short title, 57 beside a 209 px title.
  Longer captions are clipped with an ellipsis at line 3. Title: 22 px serif in a `flexShrink:0, minWidth:160`
  box with no max width. A very long title takes its max-content width, squeezes the caption to nothing and can run
  past x 721 toward the spine (there is no clip until the page root).
- **Frames:** one `ImageFrame` 1580×1054 (aspect 1.499), drawn twice (left page offset 0, right page offset −790)
  and cropped by each page's `overflow:hidden`. `object-fit: cover`. The bottom 72 px sits under an
  `rgba(37,33,25,.88)` band.
- **Primitives:** ImageFrame, SectionMark, Folio (right page, `dark`), RegistrationMark (left on L, right on R),
  BleedMarks (light) ×2, GrainOverlay ×2. **Left page has no page number at all** (wordmark only).
- **Within 36 px:** wordmark at top BLEED+MT−28 = y 39 → **28 px** inside top trim (x 69). Caption-band text zone
  y 988–1026 → lowest line **17 px** above the bottom trim, on both pages.
- **Sample ("The Salt Line", Maya Torres, 30-word caption):**
  ```js
  { page: 4, type: 'photography', page_title: 'The Salt Line', season: 'Spring',
    contributor: { name: 'Maya Torres', city: 'Pensacola' },
    entries: [ { title: 'Low Tide, Facing East',
                 caption: 'The line the water leaves is never the same twice, but it is always a line. I have photographed it for six years and it has never once been straight.',
                 media_url: '$SEED/panorama-01.jpeg', focal_x: 50, focal_y: 50, aspect_ratio: null } ] }
  ```

### 2.5 Spread
- **File:** `templates-9-11.jsx:110` · **pages:** 2 · **background:** L dark (full-bleed image) / R light
- **Selection:** `regular`, exactly 1 entry, total caption words > 50 (`selectionLogic.ts:88`).
- **Data:** `ContentPageData`. Reads `entries[0].media_url/focal_x/focal_y/caption` (caption fallback: long sample),
  `contributor.name/city`, `page_title` (fallback 'Between the Frames'), `type`, `page`, `season`.
- **Passed, not rendered:** `entries[0].title`, `aspect_ratio`.
- **Capacity:** the right-page caption is unbounded (9.5 px italic serif / 1.7, full 652 px width). It starts at
  about y 250–320 depending on title wrap (title 68 px / .88, **can wrap to 2–3 lines**). There is no clamp: text
  past ~y 990 runs over the folio rule and off the trim, clipped only by the page root. At ~16 px per line and
  ~22 words per line (est.) that is roughly 900+ words, so real 1-image captions (the app has no caption cap) fit in
  practice. The SectionMark always says "· Full Spread ·" even though this template is not the `fullSpread` type.
- **Frames:** one `ImageFrame` 790×1054 (0.750), `cover`.
- **Primitives:** ImageFrame, SectionMark, Folio (right page, side right only), RegistrationMark (L: left; R: left +
  right), BleedMarks (L light, R dark), GrainOverlay ×2. Left page page number is a bare gold mono div, not Folio.
- **Within 36 px:** L wordmark at y 37 → **26 px** inside top trim. L page number `bottom: BLEED+MB−20` → box bottom
  y 1007 = **36 px** above bottom trim (x ≤ 721, i.e. 69 px from the spine).
- **Sample ("What the Tide Left", Sarah Chen, 112-word caption):**
  ```js
  { page: 6, type: 'photography', page_title: 'What the Tide Left', season: 'Spring',
    contributor: { name: 'Sarah Chen', city: 'Portland' },
    entries: [ { title: 'Inventory, Morning After',
                 caption: "My grandmother collected what the water gave back. Bottle glass worn soft, a doll's arm, … That is precisely the point, and I have stopped apologizing for it.",
                 media_url: '$SEED/spread-01.jpeg', focal_x: 50, focal_y: 45, aspect_ratio: null } ] }
  ```

### 2.6 Spread2
- **File:** `templates-12-17.jsx:6` · **pages:** 2 · **background:** L dark / R light
- **Selection:** `regular`, exactly 2 entries (`selectionLogic.ts:89`).
- **Data:** `ContentPageData`. `entries[0..1]`: media_url/focal/title/caption. The right page uses
  `entries.slice(0, 2)` (`:101`).
- **Passed, not rendered:** `aspect_ratio`.
- **Capacity:** exactly 2 images. Right-page captions are unbounded 9 px sans / 1.6 below a 68 px title that can
  wrap. There is no clamp, and overflow runs toward the folio.
- **Frames:** entry 0 → 790×611 (1.293), entry 1 → 790×440 (1.795), separated by a 3 px terra rule. `cover`.
  Portrait images lose most of their height.
- **Primitives:** ImageFrame, SectionMark, Folio (R only), RegistrationMark, BleedMarks, GrainOverlay. L page number is
  a bare div.
- **Within 36 px:** wordmark y 37 (**26 px**); L page number box bottom **36 px** above trim; index "02" at
  left/bottom `idxEdge` 31 → **20 px** inside the left and bottom trims; "01" left 31 → **20 px** inside the left trim.
- **Sample ("Two Mornings", James Wilson):**
  ```js
  { page: 8, type: 'photography', page_title: 'Two Mornings', season: 'Spring',
    contributor: { name: 'James Wilson', city: 'Chicago' },
    entries: [ { title: 'Tuesday, 6:14', caption: 'Same chair, same window, eleven degrees colder than the day before.',
                 media_url: '$SEED/two-01.jpeg', focal_x: 50, focal_y: 40, aspect_ratio: null },
               { title: 'Wednesday, 6:11', caption: 'Three minutes earlier. The difference is the whole photograph.',
                 media_url: '$SEED/two-02.jpeg', focal_x: 50, focal_y: 40, aspect_ratio: null } ] }
  ```

### 2.7 Spread4
- **File:** `templates-12-17.jsx:138` · **pages:** 2 · **background:** L dark / R light
- **Selection:** `regular`, 3–4 entries (`selectionLogic.ts:90`). **Also 0 entries** (`count <= 4` catches 0), which
  renders four empty placeholder frames.
- **Data:** `ContentPageData`, `entries[0..3]`.
- **Passed, not rendered:** `aspect_ratio`, `entries[4..]` (not reachable by selection).
- **Capacity:** 4 cells. **3 entries leave cell 04 as an empty `C.ground3` placeholder frame with crosshair and terra
  dot** (known gap, Spread3 planned). The right caption grid skips missing entries (`:253`). Captions are unbounded
  9 px sans in 2×2 cells (~318 px wide each).
- **Frames:** 4 × 393×525 (0.749) in a 2×2 full-bleed grid, 4 px gutters, `cover`.
- **Primitives:** as Spread2.
- **Within 36 px:** wordmark y 37 (**26 px**); L page number **36 px**; labels "01"/"03" at left 31 (**20 px** inside
  the left trim); "03"/"04" at bottom 31 (**20 px** inside the bottom trim).
- **Sample ("Paper Studies", Maya Patel, 3 images → empty 4th cell):**
  ```js
  { page: 10, type: 'art', page_title: 'Paper Studies', season: 'Spring',
    contributor: { name: 'Maya Patel', city: 'Austin' },
    entries: [ { title: 'Study I — Fold',    caption: 'A single sheet, folded until it refused.',        media_url: '$SEED/four-01.jpeg', focal_x: 50, focal_y: 50, aspect_ratio: null },
               { title: 'Study II — Weight', caption: 'What the paper does when you stop helping it.',   media_url: '$SEED/four-02.jpeg', focal_x: 50, focal_y: 50, aspect_ratio: null },
               { title: 'Study III — Return',caption: 'Unfolded. The creases are the record.',          media_url: '$SEED/four-03.jpeg', focal_x: 50, focal_y: 50, aspect_ratio: null } ] }
  ```

### 2.8 SpreadMosaic
- **File:** `templates-18-19.jsx:137` · **pages:** 2 · **background:** L = `C.paper` root, visually image (86%) + dark
  info band; R light
- **Selection:** `regular`, 5–6 entries (`selectionLogic.ts:91`).
- **Data:** `ContentPageData`, `entries[0..4]`. `entries[0].caption` is rendered in the left info band.
  `entries[1..4]` title + caption are in the right caption strip (`slice(1,5)`, `:304`).
- **Passed, not rendered:** **`entries[5]` (the 6th image) is never rendered**, so a 6-image submission silently loses
  its last image. `entries[0].title` is not rendered (the band shows `page_title`). `aspect_ratio`.
- **Capacity:** left band title is ONE line of 26 px italic (flows from the top, `overflow:hidden`). Entry-0 caption
  is `maxWidth 280`, 9.5 px / 1.6, clipped by the band. Right strip: 56 px tall, `overflow:hidden`. Titles are one
  line with ellipsis, captions **2 lines** (`WebkitLineClamp:2`), 4 cells ~149 px wide each.
- **Frames:** 01: 790×906 (0.872). 02: 322×517 (0.623). 03: 322×309 (1.042). 04: 322×316 (1.019). 05: 322×510 (0.631).
  All `cover`.
- **Primitives:** ImageFrame, SectionMark, GoldMark, Folio (L left dark / R right), RegistrationMark (L left / R
  right), BleedMarks (L light / R dark), GrainOverlay.
- **Within 36 px:** "01" at left 31 → **20 px** inside the left trim. Nothing else.
- **Sample ("Neighborhood Index", Carlos Rodriguez):**
  ```js
  { page: 12, type: 'photography', page_title: 'Neighborhood Index', season: 'Spring',
    contributor: { name: 'Carlos Rodriguez', city: 'New Orleans' },
    entries: [ { title: 'Corner, North', caption: 'The same corner, the ninth year.',                    media_url: '$SEED/mosaic-01.jpeg', focal_x: 50, focal_y: 50, aspect_ratio: null },
               { title: 'Fence',         caption: 'It was blue when I moved here.',                      media_url: '$SEED/mosaic-02.jpeg', focal_x: 50, focal_y: 50, aspect_ratio: null },
               { title: 'Afternoon',     caption: 'Nobody home. Nobody ever home at this hour.',        media_url: '$SEED/mosaic-03.jpeg', focal_x: 50, focal_y: 50, aspect_ratio: null },
               { title: 'Utility',       caption: "Somebody's job to paint that number.",               media_url: '$SEED/mosaic-04.jpeg', focal_x: 50, focal_y: 50, aspect_ratio: null },
               { title: 'Corner, South', caption: 'Four blocks is enough. It has always been enough.',  media_url: '$SEED/mosaic-05.jpeg', focal_x: 50, focal_y: 50, aspect_ratio: null } ] }
  ```

### 2.9 Spread6
- **File:** `templates-12-17.jsx:295` · **pages:** 2 · **background:** **dark / dark** (both `C.ground`)
- **Selection:** `regular`, 7–8 entries (`selectionLogic.ts:92`, the `else` branch, so also >8).
- **Data:** `ContentPageData`. Images `entries.slice(0,3)` left (`:325`) and `entries.slice(3,6)` right (`:371`).
  The caption strip lists **every** entry's title (`:406`).
- **Passed, not rendered:** **`entries[6]` and `entries[7]`: images 7–8 are never rendered**, so every submission that
  selects Spread6 loses 1–2 images (their titles still appear in the list). **No captions are rendered at all.**
  `aspect_ratio`.
- **Capacity:** 6 frames. The title list is unbounded mono 7.5 px / 1.4, inline with `·` separators, in a 120 px
  strip with no `overflow:hidden`. Longer lists push the folio down (flow layout).
- **Frames:** 3 per page, 260×934 (0.278), last cell 262×934 (0.281), 4 px gutters, `cover`. **Why portraits crop
  heavily:** the frame is ~1:3.6, far narrower than any photo. Scaled to cover 934 px of height, a 2:3 portrait is
  623 px wide, so the frame shows **42%** of its width. A 3:2 landscape is 1401 px wide, so the frame shows **19%**. The
  crop is always horizontal and `focal_x` picks the strip.
- **Primitives:** ImageFrame, GoldMark, Folio (R, dark), RegistrationMark (L: left; R: both), BleedMarks (light) ×2,
  GrainOverlay ×2. L page number is a bare div in the strip.
- **Within 36 px:** L "01" left 31 → **20 px** inside the left trim. R "04" at page-local x 31 → **31 px from the
  spine** (20 px inside the right page's trim). R strip folio: flow-positioned, nominal box bottom ≈ y 1007 (est.) ≈
  **36 px** above the trim, and less when the title list wraps to a second line. Measure before relying on it.
- **Sample ("Field Notes", Emma Zhang, 7 images → image 07 dropped):**
  ```js
  { page: 14, type: 'art', page_title: 'Field Notes', season: 'Spring',
    contributor: { name: 'Emma Zhang', city: 'Seattle' },
    entries: [ { title: 'Note 01', caption: 'Begin anywhere.',                    media_url: '$SEED/six-01.jpeg', focal_x: 50, focal_y: 50, aspect_ratio: null },
               { title: 'Note 02', caption: 'Collected, not composed.',           media_url: '$SEED/six-02.jpeg', focal_x: 50, focal_y: 50, aspect_ratio: null },
               { title: 'Note 03', caption: 'The order arrived later.',           media_url: '$SEED/six-03.jpg',  focal_x: 50, focal_y: 50, aspect_ratio: null },
               { title: 'Note 04', caption: "Kept because it wouldn't resolve.",  media_url: '$SEED/six-04.jpeg', focal_x: 50, focal_y: 50, aspect_ratio: null },
               { title: 'Note 05', caption: 'Out of sequence on purpose.',        media_url: '$SEED/six-05.jpg',  focal_x: 50, focal_y: 50, aspect_ratio: null },
               { title: 'Note 06', caption: 'Nearly discarded twice.',            media_url: '$SEED/six-06.JPG',  focal_x: 50, focal_y: 50, aspect_ratio: null },
               { title: 'Note 07', caption: 'End anywhere.',                      media_url: '$SEED/six-07.jpeg', focal_x: 50, focal_y: 50, aspect_ratio: null } ] }
  ```

### 2.10 TextSubmission
- **File:** `templates-5-8.jsx:215` · **pages:** 1 · **background:** light
- **Selection:** profile `content_type` ∈ {essay, poetry}, `isPoetry(body)` false, `countWords(body) ≤ 500`
  (`selectionLogic.ts:38–58`). `body = entries[0].caption`.
- **Data:** `ContentPageData` + `body`, `word_count`, `body_para1..3` from `splitBody()` (`selectionLogic.ts:18–21`,
  split on `/\n\n+/`). `para1 = paras[0] ?? body`. **`para2`/`para3` = `''` when missing.**
- **Rendered:** `page_title` (58 px italic, can wrap), `contributor.name/city`, `word_count`, `season`, `type`
  (SectionMark + VerticalContributorLabel), `body_para1` (70 px drop cap on its first character), **`pull_quote`**,
  `body_para2`, `body_para3`.
- ⚠️ **Placeholder copy prints in the real magazine:**
  - `pull_quote` is never set by `selectionLogic`, so **every TextSubmission prints the sample quote
    "It lived between the frames — in the gap the camera could not close."** (`:220`).
  - An essay with 1 or 2 paragraphs gets `''` for `para2`/`para3`, which falls back to the sample paragraphs about
    "sorting through the photographs" / "a discipline in waiting" (`:218–219`).
  - **Paragraphs 4+ are silently dropped** (`splitBody` returns only 3).
- **Passed, not rendered:** `body`, `entries`, paragraphs 4+.
- **Capacity:** no clamp. The body is 12.5 px / 1.88 serif over 652 px (~20 words per line (est.)) and flows from
  about y 207 under the header, with the pull quote taking ~95 px. It is clipped only at the page root (y 1054), and
  before that it runs over the folio at ~y 991. Roughly **25–28 body lines ≈ 500–550 words** fit (est.), which
  matches the 500-word threshold only if every paragraph is actually rendered.
- **Frames:** none.
- **Primitives:** VerticalContributorLabel, DoubleRule, SectionMark, GoldMark, Folio (left AND right), RegistrationMark
  ×2, BleedMarks dark, GrainOverlay.
- **Within 36 px:** VerticalContributorLabel text ≈ **19 px** inside the left trim (page-local x ≈ 30). On an odd page
  that is the spine side.
- **Sample ("The Slow Channel", Daniel Osei, 403 words, 9 paragraphs, so paragraphs 4–9 are dropped and the sample
  pull quote prints):**
  ```js
  { page: 9, type: 'essay', page_title: 'The Slow Channel', season: 'Spring',
    contributor: { name: 'Daniel Osei', city: 'Boston' },
    entries: [ { title: undefined, caption: '<full 403-word body>', media_url: undefined, focal_x: 50, focal_y: 50, aspect_ratio: null } ],
    body: '<full 403-word body>', word_count: 403,
    body_para1: 'My father wrote letters. Not as a practice or a statement — …',
    body_para2: 'I have most of them. They are not interesting. …',
    body_para3: 'What strikes me now is not the content but the drag. …' }
  ```

### 2.11 TextSpread
- **File:** `templates-12-17.jsx:433` · **pages:** 2 · **background:** **light / light**
- **Selection:** essay/poetry, not poetry, `wordCount > 500` (`selectionLogic.ts:61–71`). Above 1800 words the body is
  cut to 1800 words and re-joined with single spaces (`body.split(/\s+/).slice(0,1800).join(' ') + '…'`), which
  **destroys the paragraph breaks**. `para1` is then the whole essay and `para2/3` are `''`. The app caps text
  submissions at 800 words (`src/lib/constants/submission.ts`), so this path is unreachable from the UI today.
- **Data:** as TextSubmission. `word_count = min(wordCount, 1800)`.
- **Rendered:** left page: `page_title` (76 px italic), meta row, `body_para1` (drop cap), `body_para2`. Right page:
  **`body_para3`, `body_para4`, `body_para5`**.
- ⚠️ `body_para4` and `body_para5` are **never produced** by `selectionLogic`, so **every TextSpread prints two sample
  paragraphs** ("She had been standing at the window…", "The archive, when she finally opened it…",
  `:440–441`) on its right page. Paragraphs 4+ of the real essay are dropped. With the seed essay (13 paragraphs),
  only paragraphs 1–3 of Leila Hassan's text print.
- **Passed, not rendered:** `body`, `entries`, `pull_quote`, paragraphs 4+.
- **Capacity:** no clamp on either page. Left page ≈ 30 lines after the 76 px title (est.). Right page ≈ 39 lines
  (est.), so roughly **1,200–1,300 words** for the spread (est.), well under the 1800-word threshold the selection
  assumes. Overflow is clipped only at the page root.
- **Frames:** none.
- **Primitives:** VerticalContributorLabel on BOTH pages, DoubleRule, SectionMark, GoldMark, **Folio left AND right on
  BOTH pages** (the left page shows `page` twice, the right page `page+1` twice), RegistrationMark (L: left; R: both),
  BleedMarks dark ×2, GrainOverlay ×2.
- **Within 36 px:** L page VerticalContributorLabel ≈ **19 px** inside the left trim. **R page VerticalContributorLabel
  at spread x ≈ 820, ~30 px from the spine** (19 px inside the right page's trim).
- **Sample ("Against the Feed", Leila Hassan, 825 words, 13 paragraphs):**
  ```js
  { page: 16, type: 'essay', page_title: 'Against the Feed', season: 'Spring',
    contributor: { name: 'Leila Hassan', city: 'New York' },
    entries: [ { caption: '<full 825-word body>', focal_x: 50, focal_y: 50, aspect_ratio: null } ],
    body: '<full body>', word_count: 825,
    body_para1: 'There is a particular sound a magazine makes when you drop it on a table. …',
    body_para2: 'Nothing on my phone makes that sound. …',
    body_para3: 'Consider what it costs to publish a photograph. …' }   // body_para4/5 absent → sample text prints
  ```

### 2.12 PoetryPage
- **File:** `templates-20-24.jsx:163` · **pages:** 1 · **background:** light
- **Selection:** essay/poetry profile and `isPoetry(body)` (`selectionLogic.ts:42–48`, `src/lib/textDetect.ts:11–25`):
  contains `\n\n`, average non-empty line < 60 chars, and `(all lines incl. blank / words) × 100 ≥ 3`. An *essay*
  contributor's text that passes these tests also becomes a poem.
- **Data:** `{ page, type: 'poetry', page_title, season, contributor, entries, body, word_count }`.
- **Rendered:** `page_title` (44 px italic, centred), `contributor.name/city`, `word_count` (shown only if truthy),
  `body` split into stanzas on `/\n\n+/` with `white-space: pre-wrap`, `season`, `type`. `epigraph` (read at `:167`)
  is never supplied, so it never renders.
- **Passed, not rendered:** `entries`.
- **Capacity / column switch:** `poemLineCount` = non-empty lines. **> 18 → two columns** (`:173`). Two-column box:
  top **fixed** at BLEED+MT+210 = y 277 (300 with an epigraph), bottom y 957 → 680 px high, `columnCount 2`,
  `columnGap 44`, column width 304 px, `columnFill balance`, stanzas `breakInside: avoid`. Lines are 28.6 px
  (13 × 2.2) and stanza gaps 22 px, so ≈ **40 lines** fit (est.). **Beyond that, CSS multicol overflows into a 3rd
  column at page-local x ≈ 765**, which crosses the right trim (779) and is clipped at 790. The two-column top is
  hard-coded, so a title that wraps to 2 lines pushes the header down into the poem.
  Single column (≤ 18 lines): max-width 420 centred, no clamp. The 3 px terra "anchor" rule is at a fixed y 737
  (70%), and the poem starts ≈ y 207 (est.), so a single-column poem of **~15–18 lines with stanza gaps runs over
  the anchor rule** (est., measure).
- **Frames:** none.
- **Primitives:** VerticalContributorLabel, DoubleRule, SectionMark, GoldMark, Folio (left AND right), RegistrationMark
  ×2, BleedMarks dark, GrainOverlay.
- **Within 36 px:** VerticalContributorLabel ≈ **19 px** inside the left trim (spine side on odd pages). A 3rd overflow
  column would reach the right trim.
- **Sample ("Inventory of a Rented Room", Olivia Martinez, 26 non-empty lines / 9 stanzas / 118 words, so two
  columns):**
  ```js
  { page: 5, type: 'poetry', page_title: 'Inventory of a Rented Room', season: 'Spring',
    contributor: { name: 'Olivia Martinez', city: 'Miami' },
    entries: [ { caption: '<poem>', focal_x: 50, focal_y: 50, aspect_ratio: null } ],
    body: 'One chair, which is enough.\nOne window, which is not.\n\nThe landlord painted over the hinges\n…\nto explain it.',
    word_count: 118 }
  ```

### 2.13 Collab data shape (all three collab spreads)
`CollabPageData` (`types.ts:36–45`), built at `selectionLogic.ts:101–118` from `generator.ts:324–402`:
```ts
{ page: number;
  collab_title: string;          // collabs.title ?? ''
  mode: string;                  // curator_collab_selections.participation_mode (lowercase)
  season: string;
  display_text: string;          // collab_templates.display_text if template_id, else collabs.description ?? ''
  location?: string;             // selection.location ?? undefined
  city?: string;                 // selection.location ?? ''   (community/private → '')
  entries: Array<{ title?: string; caption?: string; media_url?: string;      // ALL collab_submissions rows
                   contributor: { name: string; city: string } }> }           //   (no status filter, no order)
```
- `collab_submissions` are fetched with **no status filter and no `order`** (`generator.ts:365–371`), so drafts
  print too and image order is whatever PostgREST returns.
- Entries have **no focal point** (always 50/50) and no `is_feature`.
- `selectionLogic.ts:114` falls back to CollabSpreadCommunity for an unknown mode.

### 2.14 CollabSpreadCommunity
- **File:** `templates-20-24.jsx:319` · **pages:** 2 · **background:** **light / light** (left page has a 110 px dark
  header band)
- **Selection:** `mode === 'community'` (`selectionLogic.ts:104`).
- **Rendered:** `collab_title` (38 px, header band), `mode` (GoldMark, uppercased → "COMMUNITY"), unique-contributor
  count, `display_text`, `entries[0..2]` left and `entries[3..5]` right (image + `contributor.name` + `title`),
  roster (name + city), `season` (folio). The chip text "Community · open call" is hard-coded.
- **Passed, not rendered:** `entries[].caption`, entry `contributor.city` under images, `location`, `city`,
  `entries[6..]` images.
- **Capacity:** **6 images max** (`slice(0,3)` / `slice(3,6)`, `:334–335`). Fewer entries leave the row short, with
  no placeholders. Contributors are de-duplicated **by name** across ALL entries (`:337–338`). The header count and
  the roster use that list. **Roster: MAX_ROSTER 6** (`:367`). Up to 6 unique names are shown in full. With 7 or more,
  5 names plus a "+ N others" cell. It is 2 columns × 3 rows of 16 px, in an explicit-height (81 px),
  `overflow:hidden` box. `display_text`: 10 px / 1.6 in a **46 px `overflow:hidden` box**, which is 2.9 lines, so a
  third line is cut mid-glyph. The collab title is not clamped: a 2-line title grows the header band's content
  upward.
- **Frames:** 6 × 212×759 (0.279), `cover`, 50/50 (so portraits and landscapes both crop hard horizontally, as in
  Spread6).
- **Primitives:** ImageFrame, SectionMark, GoldMark, GoldRule, Folio (L left / R right), RegistrationMark (L left / R
  right), BleedMarks dark ×2, GrainOverlay ×2.
- **Within 36 px:** none.
- **Sample ("Somewhere Else Entirely", 6 submissions / 6 contributors):**
  ```js
  { page: 18, collab_title: 'Somewhere Else Entirely', mode: 'community', season: 'Spring',
    display_text: 'A shared archive of manufactured wonder. Contributors document the places built specifically to be nowhere near where they live.',
    location: undefined, city: '',
    entries: [ { title: 'Ninety minutes for four. Worth it, reportedly.', caption: 'Ninety minutes for four. Worth it, reportedly.', media_url: '$SEED/collab-local-01.JPG', contributor: { name: 'Miguel Garcia', city: 'Phoenix' } },
               { title: 'The castle from the angle nobody photographs.', /* … */ media_url: '$SEED/collab-local-02.JPG', contributor: { name: 'Fatima Al-Sayegh', city: 'Houston' } },
               /* Tomas Reyes, Helena Novak, David Okafor, Kai Tanaka — collab-local-03..06.JPG */ ] }
  ```
  (The seed stores the caption text in `title` as well, so the "title" line under each image shows the caption.)

### 2.15 CollabSpreadLocal
- **File:** `templates-20-24.jsx:532` · **pages:** 2 · **background:** L dark / R light
- **Selection:** `mode === 'local'` (`selectionLogic.ts:105`).
- **Rendered:** `collab_title` (34 px), **`city`** (fallback `'Pensacola'` when `''`), used for the header GoldMark,
  a 180 px watermark, the image sub-captions (`c.city || city`), the roster label "Contributors — {city}" and the
  footer note "…based in {city} during {season}." Also unique-contributor count, `display_text` (right page),
  `entries[0..2]` left (name + city, **no title**), `entries[3..5]` right (name + title), and the roster (names only).
  "Local Collaboration" is hard-coded, and `mode` is not rendered.
- **Passed, not rendered:** `mode`, `location`, `entries[].caption`, left-page titles, `entries[6..]`.
- **Capacity:** 6 images max. Roster MAX_ROSTER 6 (`:589`), same rules as Community, in an explicit 93 px
  `overflow:hidden` box. **`display_text` on the right page has NO height or overflow limit**: 11 px / 1.65
  (18 px/line) with the terra rule at +46 and images at +58. A description longer than **2 lines** (≈ 2 × 105 chars
  (est.)) runs into the rule and the images. The watermark is `nowrap` and centred, so long city names ("San
  Francisco" ≈ 1000 px at 180 px) extend past both trims and the spine (alpha .04, decorative).
- **Frames:** left 3 × 212×807 (0.263). Right 3 × 212×718 (0.295). `cover`, 50/50.
- **Primitives:** ImageFrame, GoldMark, GoldRule, Folio (L left dark / R right), RegistrationMark (L left / R right),
  BleedMarks (L light / R dark), GrainOverlay ×2.
- **Within 36 px:** only the decorative city watermark (see above).
- **Sample ("The Water Is Always There", 6 submissions / 2 unique contributors):**
  ```js
  { page: 20, collab_title: 'The Water Is Always There', mode: 'local', season: 'Spring',
    display_text: 'Pensacola contributors document the Gulf on ordinary days. Not the postcard — the Tuesday.',
    location: 'Pensacola', city: 'Pensacola',
    entries: [ { title: 'Before the parking lot fills.', caption: 'Before the parking lot fills.', media_url: '$SEED/collab-community-01.JPG', contributor: { name: 'Maya Torres', city: 'Pensacola' } },
               { title: 'The sand does this on its own.', /* … */ media_url: '$SEED/collab-community-02.JPG', contributor: { name: 'Adam Johnson', city: '<profiles.city>' } },
               /* alternating Maya Torres / Adam Johnson — collab-community-03..06.JPG */ ] }
  ```

### 2.16 CollabSpreadPrivate
- **File:** `templates-20-24.jsx:749` · **pages:** 2 · **background:** **dark / dark**
- **Selection:** `mode === 'private'` (`selectionLogic.ts:106`).
- **Rendered:** `collab_title` (42 px), `display_text` (10 px / 1.7, maxWidth 480), `entries[0..1]` left and
  `entries[2..5]` right (image + name + title), members line (all unique names), `season` (folios).
  "Private Collaboration" and the badge "Private · Invite Only" are hard-coded.
- **Passed, not rendered:** `mode`, `location`, `city`, `entries[].caption`, contributor cities, `entries[6..]`.
- **Capacity:** **6 images max** (`slice(0,2)` / `slice(2,6)`, `:763–764`). The members list is **uncapped**, inline,
  wrapping, with no overflow control. It sits in a fixed 48 px header zone above the grid, so ~2 lines of 7.5 px mono
  fit (est.; about 8–10 names). A longer list overlaps the image grid. Left header is a fixed 130 px: after the label,
  title and rules, ~2 lines of `display_text` fit (est.). A 2-line title or a longer description overlaps the
  images, with no clip.
- **Frames:** left 2 × 324×756 (0.429). Right 4 × 324×403 (0.804). `cover`, 50/50.
- **Primitives:** ImageFrame, GoldRule, Folio dark (L left / R right), RegistrationMark, BleedMarks (light) ×2,
  GrainOverlay ×2.
- **Within 36 px:** none.
- **Sample ("Everyone Who Was There", Adam's book, 6 submissions / 4 members):**
  ```js
  { page: 12, collab_title: 'Everyone Who Was There', mode: 'private', season: 'Spring',
    display_text: "A closed circle documenting the people they'd otherwise only photograph on their phones.",
    location: undefined, city: '',
    entries: [ { title: 'Nobody arranged this.', caption: 'Nobody arranged this.', media_url: '$SEED/collab-private-01.JPG', contributor: { name: 'Adam Johnson', city: '<city>' } },
               /* Adam, Maya Torres, Adam, Sarah Chen, Benjamin Lee — collab-private-02..06.JPG */ ] }
  ```

### 2.17 CommunicationsPage
- **File:** `templates-9-11.jsx:4` · **pages:** 1 · **background:** light
- **Selection:** one page when `curator_communication_selections.include_communications` is true AND at least one
  communication exists (`generator.ts:404–460`, `selectionLogic.ts:120–125`).
- **Data:**
  ```ts
  { page, season,
    messages: Array<{ from: { name: string; city: string }; to: { name: string };
                      date: string;     // created_at → toLocaleDateString('en-US',{day:'2-digit',month:'short',year:'numeric'}) e.g. "Sep 05, 2026"
                      subject?: string; body: string }> }
  ```
  The query takes **every `submitted` communication addressed to the curator in the period, newest first,
  `.limit(4)`** (`generator.ts:419–430`). There is no per-message selection. `communications.is_selected` /
  `is_included` are not read.
- **Rendered:** `from.name`, `subject` (if truthy), `date`, `to.name`, `body`, `season` (folio). Header copy is
  hard-coded ("Dispatches", "From the contributors", "Notes and messages to curators…").
- **Passed, not rendered:** `from.city`.
- **Capacity:** **max 4 cards** (by the query). The template maps whatever it gets. The layout is a 2-column grid
  (316 px cards), starting at y 147, with **no height limit, clamp or overflow control**. The body is 11.5 px italic
  / 1.82 (~21 px per line, ~12 words per line (est.)). **A 250-word note (the app's cap,
  `src/lib/supabase/communications.ts:200`) is ≈ 21 lines ≈ 440 px of body + ~80 px of header ≈ 520 px per card
  (est.).** One row of two such cards ends near y 667. A second row of long cards ends near y 1200, so it prints over
  the folio (y ≈ 991), crosses the bottom trim (1043) and is cut at the canvas edge. There is no truncation. The page
  safely holds roughly four cards of ≤ ~90 words or two long ones (est.).
- **Frames:** none.
- **Primitives:** SectionMark, GoldMark, DoubleRule, Folio (left AND right), RegistrationMark ×2, BleedMarks dark,
  GrainOverlay.
- **Within 36 px:** none by position (only via overflow).
- **Sample (Lena):**
  ```js
  { page: 7, season: 'Spring', messages: [
    { from: { name: 'Maya Torres', city: 'Pensacola' }, to: { name: 'Lena Vasquez' }, date: '<created_at>', subject: 'On the salt line',
      body: "I've been shooting this same stretch for six years and I still can't tell you why. If it makes the issue, put it early — it's a beginning, not an ending." },
    { from: { name: 'Daniel Osei', city: 'Boston' }, to: { name: 'Lena Vasquez' }, date: '<created_at>', subject: 'Re: the essay',
      body: "Cut it if it runs long. I'd rather be short and land than complete and drift. You have my permission to be ruthless." } ] }
  ```

### 2.18 CampaignPage
- **File:** `templates-9-11.jsx:211` · **pages:** 1 per campaign · **background:** the advertiser image
  (`C.ground` beneath)
- **Selection:** each `curator_campaign_selections` row (`generator.ts:462–489`, `selectionLogic.ts:127–133`).
- **Data:** `{ page, campaign_name: string /*name ?? ''*/, tagline: string /*campaigns.bio ?? ''*/,
  discount: number /*int, default 2 if not a number*/, avatar_url?: string }` (`types.ts:61–69` also allows
  `focal_x/focal_y`, which are never set).
- **Rendered:** only `avatar_url`, as a raw `<img>` 790×1054, `object-fit: cover`, `object-position: center`
  (**focal ignored**). With no `avatar_url` it renders the ImageFrame placeholder. The raw `<img>` path does not
  check for `https://`.
- **Passed, not rendered:** `page`, `campaign_name`, `tagline`, `discount` (the "price reduction hero" in `index.js`
  no longer exists).
- **Frames:** one 790×1054 (0.750) full-bleed `cover`. Ad art must be supplied at page proportion with ≥ 0.375 in
  clear space (CLAUDE.md).
- **Primitives:** BleedMarks only. **No GrainOverlay, RegistrationMark or Folio** (by design).
- **Within 36 px:** no text.
- **Sample:** `{ page: 11, campaign_name: 'Moleskine', tagline: 'Notebooks for people who still write things down before they mean them.', discount: 2, avatar_url: '$SEED/campaign-01.PNG' }`

### 2.19 ColophonPage
- **File:** `templates-12-17.jsx:719` · **pages:** 1 · **background:** dark
- **Selection:** always last (`generator.ts:694–701, 710`).
- **Data:** `{ page, season, contributors: Array<{name, city}>, printer: 'Magcloud', edition_number: 1, edition_total: 1 }`.
  `contributors = creatorItems.map(i => i.contributor)`: **one row per solo submission**, in fetch order
  (photography → art → essay → poetry → music, *not* page order). A contributor with two submissions is listed twice.
  **Collab-only contributors are missing.** `printer` and the edition values are hard-coded in the generator.
- **Rendered:** wordmark, `season` (×3), contributors (name — city, where city `''` prints "City"), About text
  (hard-coded, **still lists "music"**, `:784`), `printer`, `Edition n of m`.
- **Passed, not rendered:** `page` (no folio).
- **Capacity:** contributor column from y 215 to y 943 (728 px). Rows are ≈ 22 px, so **≈ 33 names** fit (est.). The
  column has explicit top/bottom but **no `overflow:hidden`**, so extra names spill over the bottom imprint.
- **Frames:** none.
- **Primitives:** RegistrationMark ×2, BleedMarks (light), GrainOverlay. **No Folio** (by design).
- **Within 36 px:** none.
- **Sample (Lena):**
  ```js
  { page: 27, season: 'Spring', printer: 'Magcloud', edition_number: 1, edition_total: 1,
    contributors: [ { name: 'Maya Torres', city: 'Pensacola' }, { name: 'Sarah Chen', city: 'Portland' },
                    { name: 'James Wilson', city: 'Chicago' }, { name: 'Carlos Rodriguez', city: 'New Orleans' },
                    { name: 'Maya Patel', city: 'Austin' }, { name: 'Emma Zhang', city: 'Seattle' },
                    { name: 'Daniel Osei', city: 'Boston' }, { name: 'Leila Hassan', city: 'New York' },
                    { name: 'Olivia Martinez', city: 'Miami' } ] }   // David Okafor (collab-only) absent
  ```

### 2.20 Still reachable but not in the active 18
- **MusicPage** (`templates-12-17.jsx:574`): reached when `profiles.content_type === 'music'`
  (`selectionLogic.ts:29–35`). It renders a fake QR code and `data.listen_url` (never supplied, so the fallback
  `onlineoffline.fm/s.muller` prints).
- **SinglePhoto** is still in `TEMPLATE_FILE_MAP` (`generator.ts:42`) but no selection path returns it.
  MultiPhoto2Stacked / MultiPhoto2SideBySide / MultiPhoto4Feature / MultiPhoto4Grid / CollabPage are defined and
  exported but unreachable.

### 2.21 Field-usage matrix (which templates read which entry fields)

| Template | media_url | focal_x/y | title | caption | aspect_ratio | is_feature |
|---|---|---|---|---|---|---|
| SpreadPanorama | [0] | [0] (fallback 42/38) | — | [0] (clamp 3) | — | not fetched |
| Spread | [0] | [0] | — | [0] | — | not fetched |
| Spread2 | [0..1] | [0..1] | [0..1] | [0..1] | — | not fetched |
| Spread4 | [0..3] | [0..3] | [0..3] | [0..3] | — | not fetched |
| SpreadMosaic | [0..4] | [0..4] | [1..4] | [0..4] | — | not fetched |
| Spread6 | [0..5] | [0..5] | all (list) | **none** | — | not fetched |
| Collab ×3 | [0..5] | (none sent → 50) | [0..5] (Local: right only) | **none** | — | n/a |
| Text / Poetry | — | — | — | [0] = body | — | — |
| CampaignPage | avatar_url | ignored | — | — | — | — |

---

## 3. Existing design docs (inventory, 2026-09-26)

| Path | Last commit | Summary | Status |
|---|---|---|---|
| `src/magazine/TEMPLATE_DESIGN_GUIDE.md` | 2026-09-19 | Boilerplate for Claude Design prompts, design language, wiring checklist, per-issue variation plan, gotchas | **Current guide**, partly stale (see §4). Superseded by this contract where they differ |
| `src/magazine/SELECTION_LOGIC.md` | 2026-09-10 | Decision tree + page sequencing + ordering rules | Current, with discrepancies (§4) |
| `src/magazine/templates/base/index.js` | (code file) | Comment-only template catalogue | Stale (lists MusicPage as active, "price reduction hero" ad). Never imported |
| `src/magazine/previews/online-offline-magazine-standalone.html` | 2026-06-01 | 1.5 MB bundled preview of all templates with sample data, sets `window._magazineSeason` | **Stale**: predates SAFE_INSET, Option D, roster cap, gutter-shadow class, CampaignPage full-bleed. Not v7 |
| `online-offline-magazine-v7.html` (guide Part 5) | — | — | **Does not exist** anywhere in the repo |
| `PROJECT_CONTEXT.md` (repo root) | 2026-09-11 | Project overview incl. template system summary, selection table, per-issue plan (`template_set_name`) | Secondary summary; the per-issue section is aspirational |
| `CLAUDE.md` (repo root) | 2026-09-19 | Session instructions incl. template notes, SAFE_INSET, print profiles | Current; operational notes |
| `scripts/seed-print-test-content.md` | 2026-07-18 | Seed text + template coverage table | Current seed spec. Its "Spread4 (3 img)" / "Spread6 (7 img)" rows predate the capacity findings in §2 |
| `scripts/seed.README.md` | 2026-06-01 | Original seed table list | Unrelated to design (mentions collab_templates) |
| `online-offline/README.md` | 2026-06-01 | create-next-app boilerplate | Unrelated ("template" = Vercel link) |
| `_design/redesign-b/PLAYBOOK.md`, `README-pages.md`, `*.html` (5 files) | 2026-09-09/10 | App UI redesign (Design System v2) | **Not magazine**. They match "template" only via collab templates |

---

## 4. Guide discrepancies (claim → code reality)

| # | Claim (guide / selection doc) | Code reality | Evidence |
|---|---|---|---|
| a | Folio "uses `window._magazineSeason`… will be removed" (Guide Part 6) | **Refuted.** `Folio({ page, side, dark=false, season='Spring 2026' })`: season is a prop, and no code reads the global. The global exists only in the stale standalone preview | `primitives.jsx:102`; `previews/online-offline-magazine-standalone.html:201` |
| a′ | Guide Part 1 lists `Folio({ page, side, dark=false })` | Signature also has `season` (default `'Spring 2026'`) | `primitives.jsx:102` |
| b | Music is not a content type (CLAUDE.md) | **Still referenced:** Guide Part 1 `content.type ← … / Music`; `ContentType` includes `'music'`; selectionLogic routes music → MusicPage; generator order/normalize maps; Colophon About text; `index.js` lists MusicPage as active | `TEMPLATE_DESIGN_GUIDE.md:135`; `types.ts:116`; `selectionLogic.ts:29–35`; `generator.ts:51,70,677`; `templates-12-17.jsx:574,784`; `index.js:30–31,68` |
| c | Attach `online-offline-magazine-v7.html` (Guide Part 5) | **No such file.** The only preview is `previews/online-offline-magazine-standalone.html` (2026-06-01, stale) | repo search |
| d | Per-issue `.tsx` files, `index.ts`, `TEMPLATE_SETS` registry, `periods.template_set_name` (Guide Part 4) | **None exist.** Templates are `.jsx` files under `templates/base/` only. `index.js` is comments. The generator loads files by name from `TEMPLATE_FILE_MAP` with `readFileSync` + in-browser Babel. `fetchPeriod` selects no `template_set_name` | `generator.ts:35,39–60,112–113,238–246` |
| d′ | Wiring Step 5: "Import the new template" in generator.ts | No imports. Register it in `TEMPLATE_FILE_MAP` + `SPREAD_TEMPLATES` **and** the admin preview's duplicate map | `generator.ts:39–66`; `route.ts:37` |
| e | Spreads: "Left page dark, right page light" | Follows it: **Spread, Spread2, Spread4, CollabSpreadLocal.** Does not: **Spread6 (dark/dark), CollabSpreadPrivate (dark/dark), TextSpread (light/light), CollabSpreadCommunity (light + dark band / light), SpreadMosaic (image + dark band on a paper root / light), SpreadPanorama (one image across both)** | per-template §2 |
| f | Every page has GrainOverlay, RegistrationMark L+R, BleedMarks, Folio (except Cover/Colophon) | **GrainOverlay** missing: BlankPage, CampaignPage. **RegistrationMark** missing: BlankPage, CampaignPage; only ONE per page on Spread/Spread2/Spread4/Spread6/TextSpread left pages, both SpreadPanorama pages, both SpreadMosaic pages, all collab spread pages. **BleedMarks** missing: BlankPage. **Folio** missing: CoverA, BlankPage, **FrontMatter**, CampaignPage, ColophonPage. Bare page-number div instead of Folio on the left pages of Spread/Spread2/Spread4/Spread6. **No page number at all** on SpreadPanorama's left page. TextSubmission/TextSpread/PoetryPage/CommunicationsPage render BOTH folios on one page (contradicting "left page left-only, right page right-only") | `generator.ts:115–122`; `templates-9-11.jsx:125–136,211–244`; `templates-18-19.jsx:29–41`; `templates-12-17.jsx:516–560`; `templates-20-24.jsx:152` |
| g | fullSpread → SpreadPanorama (SELECTION_LOGIC) | Confirmed (`selectionLogic.ts:75–81`), regardless of caption length and image count. A long caption is **clamped to 3 lines with an ellipsis** (`WebkitLineClamp:3`, 9.5 px / 1.3, 38 px zone), not shrunk and not overflowed. 3 lines ≈ 57–67 words. Images after `[0]` are dropped. Guide Part 6's "band is 72px, fitting ~20–30 words" is outdated; the measured fit is ~57–67 | `templates-18-19.jsx:101–110` |
| h | CommunicationsPage "up to 4 cards"; "if > 4 selected, show the 4 most recent" | 4 max via `.limit(4)`, newest `created_at` first, but it takes **all submitted comms to the curator**, not "selected" ones. A 250-word note is **neither truncated nor clipped** except at the page edge. Two long cards per row push row 2 over the folio and off the trim | `generator.ts:419–430`; `templates-9-11.jsx:54–93` |
| i | CollabSpreadCommunity roster (print overflow) | Fixed: 6 images max; roster de-duplicated by name, **MAX_ROSTER 6** (5 + "+ N others" when > 6), 2×3 grid in an 81 px `overflow:hidden` box. `display_text` box is 46 px `overflow:hidden` (≈ 2.9 lines, third line cut) | `templates-20-24.jsx:334–371,405–411,484–504` |
| j | Spread6 = "6–8 images grid" | Frames 260×934 / 262×934 (aspect **0.278**), `object-fit: cover`. A 2:3 portrait shows 42% of its width, a 3:2 landscape 19%. **Only 6 of 7–8 images render**; no captions render | `templates-12-17.jsx:306–333,371,406` |
| j′ | SELECTION_LOGIC: 5–6 images → SpreadMosaic | SpreadMosaic renders **5**, so the 6th image is dropped | `templates-18-19.jsx:185–290,304` |
| k | Guide: "VerticalContributorLabel in left margin of light pages" | No template reads page parity. Single pages render both folios and put the label on the left edge even on right-hand (odd) pages, i.e. at the spine | §1.7 |
| l | Saddle stitch needs page count divisible by 4 (CLAUDE.md, MagCloud) | **Not handled.** No padding. Measured books: Lena 29 pages (not a multiple of 4), Adam 28 (a multiple of 4 by coincidence) | `generator.ts:649–711` |
| m | "Load from Google Fonts. No other fonts ever." / no colors outside C | Fonts confirmed (Instrument Serif 400 + italic, Instrument Sans 300/400/500, Courier Prime 400 only). **Courier Prime italic used but not loaded** (FrontMatter). Many literal colors outside `C` (§1.2) | `generator.ts:150`; `templates-20-24.jsx:115` |
| n | SELECTION_LOGIC Known Limitations: "TextSpread truncation … not yet implemented" | Truncation IS implemented (`slice(0,1800)` + `…`) but flattens paragraphs. The real limit is that **only 3 paragraphs are ever passed**, and TextSpread's paras 4–5 and TextSubmission's pull quote print **sample copy** | `selectionLogic.ts:18–21,61–71`; `templates-12-17.jsx:440–441`; `templates-5-8.jsx:217–220` |
| o | Guide Part 1: "Use position:absolute for all layout — no flexbox or grid on the page root" | Every spread root is `display:flex` (two 790 px page children) | e.g. `templates-12-17.jsx:19` |
| p | Guide: "Nothing below 7.5px" | 7 px text: ImageFrame placeholder label; contributor city on SpreadPanorama, SpreadMosaic, Spread6; collab chips (Community / Private badge 7 px) | `primitives.jsx:56`; `templates-18-19.jsx:92,216`; `templates-12-17.jsx:395`; `templates-20-24.jsx:510–512,943–945` |
| q | Guide Part 1: `DATA FIELDS… content_entry.focal_x/y` passed to ImageFrame | Passed with `|| 50`, so focal 0 becomes 50. Collab entries never carry focal. CampaignPage ignores focal | §1.9 |
| r | Guide Part 3 Step 1 "Add render line to PrintApp / className print-page(-spread)" | That is the standalone preview only. The generator uses neither PrintApp nor those classes | `generator.ts:146–174` |
| s | SELECTION_LOGIC: FrontMatter TOC lists the content | TOC lists **solo submissions only**. Collabs, communications and campaigns never appear | `generator.ts:682–687` |
| t | CLAUDE.md "admin preview … Runs selectionLogic.ts" | It does, but it **skips `orderContentForFlow`** (grouped order, no spread alignment), so preview page numbers differ from print | `route.ts:486–492` |

---

## 5. Open questions (not determinable statically)

1. **`periods.season` in production.** The seed inserts `'Spring'` (`scripts/seed.sql:42`, only if the row did not
   exist). If production holds `'Spring'`, every folio reads "N / Spring", the cover says "SPRING" and the Colophon
   repeats "Spring" with no year. Confirm with `SELECT season, name FROM periods WHERE is_active`.
2. **All "(est.)" capacities** (TextSubmission ≈ 500–550 words, TextSpread ≈ 1,200–1,300, PoetryPage ≈ 40 lines,
   CommunicationsPage card heights, Colophon ≈ 33 names, Spread6 right-strip folio clearance, Private header fit) need
   a real-font render + `getBoundingClientRect` (the offline recipe in CLAUDE.md "Magazine Templates").
3. **Order of `collab_submissions`.** No `order()`, so image order on collab spreads is PostgREST's default (usually
   insertion order, not guaranteed).
4. **Content row order within a type.** `fetchCreatorItems` sorts by type only, so the round-robin in
   `orderContentForFlow` depends on DB return order, and exact page numbers can shift between runs.
5. **How MagCloud handled the 27-page Lena book** (not divisible by 4): did it reject it, append blanks, or reorder?
   The generator should probably pad with BlankPage before the Colophon. That is a design decision, not made here.
6. **Photographer submitting text / writer submitting images.** The template is chosen from `profiles.content_type`,
   not from the submission's format (`generator.ts:292`). What the submit form stores for a "text" submission by a
   photography-profile user (and vice versa) decides which template fires. Not traced here.
7. **Collab submissions with `status` other than submitted** (drafts) are included (no filter). Is that intended?
8. **`content.status = 'archived'`** prints (`.neq('status','draft')`). Intended?
9. **Whether Chromium's synthesised Courier Prime oblique** (FrontMatter TOC type label) is acceptable in print.

---

## 6. Data-dump script: blocked on a missing export

`scripts/dump-template-data.ts` was **not** written. `src/magazine/core/generator.ts` exports only
`generateMagazine()` (`:600`), which fetches, orders, renders and writes a PDF in one call. The pieces that produce the
final page list are module-private: `makeClient`, `fetchPeriod`, `fetchCuratorProfile`, `fetchCreatorItems`,
`fetchCollabItems`, `fetchCommunicationsItem`, `fetchCampaignItems`, `orderContentForFlow`, and the numbering /
Cover / TOC / Colophon assembly at `:613–711`. A script could only produce the page list by duplicating that logic,
and that is exactly how the admin preview drifted (§4 t).

**Smallest export that unblocks it (proposal, not applied):** move `generator.ts:613–711` (from `const db =
makeClient()` through the `pageSequence` literal) into

```ts
export type PageSpec = { templateName: string; data: unknown; pageCount: number };
export async function buildPageSequence(curatorId: string, periodId: string):
  Promise<{ pageSequence: PageSpec[]; totalPages: number }>;
```

and have `generateMagazine` call it before launching Puppeteer. Behaviour is unchanged, it is pure data and needs no
Puppeteer. The dump script (and the admin preview) can then import it relatively
(`../src/magazine/core/generator`). Importing `generator.ts` still loads `puppeteer`/`pdf-lib` at module scope, which
is harmless in Codespaces, where both are installed.

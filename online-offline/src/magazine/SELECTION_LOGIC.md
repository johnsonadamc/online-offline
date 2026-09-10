# online//offline — Template Selection Logic

This document defines the full decision tree for selecting which magazine template to use for each piece of content in a curator's edition. The generation pipeline reads this logic to assign templates before rendering.

---

## Page Structure

| Position | Template | Pages |
|---|---|---|
| 1 | CoverA | 1 |
| 2 | BlankPage (inside front cover) | 1 |
| 3 | FrontMatter (TOC) | 1 |
| 4 … N | Content — every selected submission, collab spread, CommunicationsPage and CampaignPage, **interspersed** by `orderContentForFlow()` in `generator.ts` (see below) | variable |
| Last | ColophonPage | 1 |

Content is **not grouped by type** and communications/campaigns are **not** appended at the end — everything
between FrontMatter and the Colophon is one interleaved run governed by four rules:

1. **Even-page spreads (hard rule).** Every two-page spread starts on an EVEN page so it reads across the fold.
   Content starts on page 4 (even); spreads are parity-neutral; only single pages flip parity, so single pages
   are placed in even-sized PAIRS ("mortar") before spreads. A lone leftover single goes to the tail.
2. **No two spreads back-to-back** where singles exist to separate them (yields to rule 1).
3. **Types dispersed evenly** via a deterministic largest-bucket-first round-robin (not random).
4. **BlankPage filler only as a last resort** — logs "alignment fallback: blank filler inserted"; the ordering
   should make this never fire.

More single-page content (poems, comms, campaigns, short essays) = better dispersion.

FrontMatter (table of contents) is built **last**, from the final numbered order (two-pass). Left page =
`data.page` (even), right = `data.page + 1`.

---

## Visual Submissions (Photography / Art)

### Standard submissions (type = `regular`)

| Image count | Caption word count | Template |
|---|---|---|
| 1 | ≤ 50 words | **SpreadPanorama** |
| 1 | > 50 words | **Spread** |
| 2 | any | **Spread2** |
| 3–4 | any | **Spread4** |
| 5–6 | any | **SpreadMosaic** |
| 7–8 | any | **Spread6** |

Caption word count = total words across all entry captions for the submission.

### Full spread submissions (type = `fullSpread`)

Always → **SpreadPanorama**, regardless of caption length.

---

## Text Submissions (Essay)

| Word count | Template |
|---|---|
| ≤ 500 words | **TextSubmission** (single page) |
| 501–1800 words | **TextSpread** (two pages) |
| > 1800 words | **TextSpread** (truncated at 1800 words with `…` indicator) |

---

## Poetry

**Auto-detection rules** (applied before essay thresholds):

A text submission is treated as poetry if ALL of the following are true:
- ≥ 3 line breaks per 100-word span
- Average line length < 60 characters
- At least one blank line (stanza break) present

If detected as poetry → **PoetryPage** (single page, narrow centered column).

If poetry detection is ambiguous, fall back to essay thresholds.

---

## Collaborations

| Participation mode | Template |
|---|---|
| `community` | **CollabSpreadCommunity** |
| `local` | **CollabSpreadLocal** |
| `private` | **CollabSpreadPrivate** |

Participation mode is read from `curator_collab_selections.participation_mode`.

Each selected collab = one two-page spread (2 pages in the page count).

---

## Communications

All selected communications → single **CommunicationsPage** (1 page).

- Displays up to 4 message cards in a 2-column grid
- If curator has selected > 4 communications, show the 4 most recent by date
- `curator_communication_selections.include_communications` must be `true`

---

## Campaigns

Each selected campaign → one **CampaignPage** (1 page each).

**Pricing displayed on CampaignPage:**

```
base price: $25.00
discount per campaign: $2.00
displayed discount = $2 × number of selected campaigns
```

The `discount` field on the `campaigns` table stores the integer value (e.g. `2` = $2 off). Pass as `data.discount` to `CampaignPage`.

---

## Page Number Sequencing

1. Count pages for all content items (spreads = 2 pages, single-page templates = 1 page)
2. Order the content run with `orderContentForFlow()` (see Page Structure) so every spread lands on an even page
3. Assign page numbers sequentially: CoverA = 1, BlankPage = 2, FrontMatter = 3, content from 4, ColophonPage last
4. Pass each page's number as `data.page` to its template component
5. After all pages are numbered, build the **FrontMatter** TOC from the final page map (two-pass)

---

## Known Limitations / Not Yet Implemented

| Item | Status |
|---|---|
| Poetry auto-detection | Edge cases exist for prose with heavy line breaks |
| TextSpread truncation | Logic defined, truncation rendering not yet implemented |
| Spread4 with 3 images | Leaves an empty grid cell — a dedicated Spread3 template is planned; submit 4 images until then |

Done and removed from this list: FrontMatter TOC (two-pass, wired), `window._magazineSeason` (Folio takes `season`
as a prop), Music QR codes (Music is not a content type; MusicPage is deprecated).

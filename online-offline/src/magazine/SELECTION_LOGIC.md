# online//offline — Template Selection Logic

This document defines the full decision tree for selecting which magazine template to use for each piece of content in a curator's edition. The generation pipeline reads this logic to assign templates before rendering.

---

## Page Structure

| Position | Template | Pages |
|---|---|---|
| 1 | CoverA | 1 |
| 2 | FrontMatter | 1 |
| 3–N | Content pages (see below) | variable |
| N+1 | CommunicationsPage | 1 |
| N+2… | CampaignPage × number of campaigns | 1 each |
| Last | ColophonPage | 1 |

FrontMatter (table of contents) must be built **last**, after all content page numbers are known.

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

## Music

Always → **MusicPage** (single page).

> **Known limitation**: QR code generation (Spotify/Bandcamp URL → QR) is not yet implemented. MusicPage renders a placeholder QR frame.

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
2. Assign page numbers sequentially starting from 1
3. Pass each page's number as `data.page` to its template component
4. After all pages are numbered, build the **FrontMatter** TOC with the final page map

---

## Known Limitations / Not Yet Implemented

| Item | Status |
|---|---|
| Poetry auto-detection | Edge cases exist for prose with heavy line breaks |
| Music QR codes | Placeholder only — no URL→QR generation |
| TextSpread truncation | Logic defined, truncation rendering not yet implemented |
| `window._magazineSeason` global | Needs replacement with proper prop/context passing |
| FrontMatter TOC | Requires two-pass page numbering (not yet wired) |

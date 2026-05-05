# CLAUDE.md — online//offline

## Project Vision
online//offline is "slowcial media" — the antithesis of dopamine-driven social platforms. Contributors submit creative work (photos, art, poetry, essays) quarterly. Curators select what goes into their personalized printed magazines. The physical magazine is the product. The app is the infrastructure that makes it possible.

The philosophy: deliberate pace, thoughtful curation, real-world creative collaboration, and a beautiful printed artifact as the payoff. The app should feel calm and purposeful, not stimulating.

---

## Tech Stack
- **Framework**: Next.js (App Router)
- **Database + Auth + Storage**: Supabase
- **UI**: Tailwind CSS + shadcn/ui (being phased out in favor of CSS variables + inline styles)
- **Dev environment**: GitHub Codespaces
- **Deployment**: Vercel
- **Language**: TypeScript throughout

### ⚠️ Known Dependency Issue — High Priority
`@supabase/auth-helpers-nextjs` and `@supabase/auth-helpers-shared` are deprecated. The entire codebase should be migrated to `@supabase/ssr`. This is a significant refactor touching most data-fetching files in `src/lib/supabase/`. Do not introduce new usage of the old helpers. Flag this migration as a standing priority.

### ⚠️ Branch Discipline
All work goes directly on **main** unless explicitly instructed otherwise. Always confirm with `git branch` before starting any work. After any session confirm with `git log --oneline -3` that commits landed on main. If diverged: `git pull origin main --rebase` then `git push origin main`.

### ⚠️ File Size / Stream Timeouts
Large files cause stream timeouts if rewritten in one pass. Always use targeted `str_replace` edits for changes to large files. Never rewrite an entire large file in one tool call.

---

## Project Structure
```
src/
├── app/
│   ├── admin/
│   ├── auth/
│   ├── collabs/
│   │   ├── page.tsx              # Collab library — browse + join + private invite modal ✅
│   │   └── [id]/
│   │       └── submit/
│   │           └── page.tsx      # Collab submission page ✅
│   ├── communicate/
│   │   ├── new/
│   │   │   └── page.tsx          # Re-exports [id]/page.tsx
│   │   └── [id]/
│   │       └── page.tsx          # Compose + send + read-only view ✅
│   ├── curate/
│   │   └── page.tsx              # Curator magazine selection interface ✅
│   ├── dashboard/
│   │   └── page.tsx              # Main user hub ✅
│   ├── profile/
│   │   └── page.tsx              # User profile + privacy settings ✅
│   └── submit/
│       └── page.tsx              # Content submission form ✅
├── components/
│   ├── IntegratedCollabsSection.tsx   # Curate collabs tab ✅
│   ├── SubmissionForm.tsx             # Focal point selector included ✅
│   ├── auth/
│   ├── layout/
│   └── ui/
├── lib/
│   ├── constants/
│   │   └── cities.ts             # Single source of truth for city list ✅
│   └── supabase/
│       ├── client.ts
│       ├── collabLibrary.ts
│       ├── collabs.ts
│       ├── communications.ts
│       ├── content.ts            # focal_x, focal_y, aspect_ratio wired ✅
│       ├── curation.ts
│       ├── profiles.ts
│       └── subscriptions.ts
├── magazine/                      # Magazine generation system ✅ (templates complete)
│   ├── core/
│   │   └── primitives.jsx         # Shared components: ImageFrame, Folio, GrainOverlay,
│   │                              # RegistrationMark, BleedMarks, SectionMark, etc.
│   ├── templates/
│   │   └── base/
│   │       ├── index.js           # Template registry + selection logic summary ✅
│   │       ├── templates-1-4.jsx  # CoverA, SinglePhoto†, MultiPhoto2Stacked†, MultiPhoto2SideBySide†
│   │       ├── templates-5-8.jsx  # MultiPhoto4Feature†, MultiPhoto4Grid†, TextSubmission, CollabPage†
│   │       ├── templates-9-11.jsx # CommunicationsPage, CampaignPage, Spread
│   │       ├── templates-12-17.jsx # Spread2, Spread4, Spread6, TextSpread, ColophonPage
│   │       ├── templates-18-19.jsx # SpreadPanorama, SpreadMosaic
│   │       └── templates-20-24.jsx # FrontMatter, PoetryPage, CollabSpreadCommunity,
│   │                               # CollabSpreadLocal, CollabSpreadPrivate
│   ├── previews/
│   │   └── online-offline-magazine-v7.html  # Standalone browser preview of all templates
│   ├── SELECTION_LOGIC.md         # Full decision tree: data → template mapping ✅
│   └── TEMPLATE_DESIGN_GUIDE.md   # How to design + wire new templates ✅
├── scripts/
│   ├── seed.ts
│   ├── seed.sql
│   └── seed.README.md
└── _design/                       # HTML mockup reference files
    ├── DESIGN_BRIEF.md
    ├── dashboard-final-v2.html
    ├── curate-page-v4.html
    ├── curate-collabs-mockup-v6.html
    ├── submit-redesign-v3.html
    └── collab-submit-mockup.html
```
† Deprecated — retained for reference only. Not used in generation pipeline.

---

## Database Schema (Key Tables)

### Users
```sql
profiles (id, first_name, last_name, avatar_url, identity_banner_url, content_type, is_public, bio, city, bank_info, curator_payment_info)
-- identity_banner_url: separate from avatar_url, used as full-width card banner in curate interface
-- content_type: 'photography' | 'art' | 'poetry' | 'essay'
-- city: text field, values from CITIES constant in src/lib/constants/cities.ts

profile_types (profile_id, type)   -- 'contributor' or 'curator'
profile_connections (follower_id, followed_id, status, relationship_type)
subscriptions (subscriber_id, creator_id, status)
```

### Periods (Quarterly)
```sql
periods (id, name, season, year, start_date, end_date, is_active)
-- Current active period: Spring 2026
```

### Content
```sql
content (id, creator_id, type, status, period_id, page_title, layout_preferences, content_dimensions, style_metadata)
-- type: 'regular' | 'fullSpread'
-- status: 'draft' | 'submitted' | 'archived'

content_entries (id, content_id, title, caption, media_url, is_feature, is_full_spread, order_index, focal_x, focal_y, aspect_ratio)
-- Up to 8 images per submission
-- title: per-image title (separate from page_title on content table)
-- is_feature: which image is the hero — can be null (no feature required)
-- focal_x: float 0–100, crop center X, default 50 ✅ (in DB + UI)
-- focal_y: float 0–100, crop center Y, default 50 ✅ (in DB + UI)
-- aspect_ratio: float, stored at upload time ✅ (in DB + UI)

content_tags (content_entry_id, tag, tag_type)
```

### Collaborations
```sql
collabs (id, title, type, is_private, participation_mode, location, template_id, period_id, metadata, description)
-- type: 'chain' | 'theme' | 'narrative'
-- participation_mode: 'community' | 'local' | 'private'
-- NOTE: both is_private (legacy boolean) and participation_mode exist — always prefer participation_mode

collab_participants (id, collab_id, profile_id, role, status, participation_mode, city, location)
-- city is preferred over location for local collabs

collab_templates (id, name, type, instructions, requirements, connection_rules, display_text, internal_reference, is_active)
-- IMPORTANT: field is 'name' not 'title'
-- display_text: public-facing description shown to curators
-- instructions: the prompt/brief shown to contributors on submit page

period_templates (period_id, template_id)

collab_submissions (id, collab_id, contributor_id, title, caption, media_url, status, metadata)
-- IMPORTANT: text field is 'caption' not 'content'
```

### Communications
```sql
communications (id, sender_id, recipient_id, subject, content, image_url, word_count, status, period_id, is_selected, is_included)
-- status: 'draft' | 'submitted'
communication_notifications (id, communication_id, recipient_id, is_read)
```

### Campaigns (Ads)
```sql
campaigns (id, name, bio, avatar_url, last_post, discount, period_id, is_active)
-- discount is int4 (integer, e.g. 2 = $2 off)
```

### Curation Selections
```sql
curator_creator_selections (curator_id, creator_id, period_id)
curator_campaign_selections (curator_id, campaign_id, period_id)
curator_collab_selections (curator_id, collab_id, period_id, participation_mode, location, source_id)
curator_communication_selections (curator_id, period_id, include_communications)
```

### Magazine Generation (To Be Built)
```sql
magazine_templates (id, name, type, description, file_path, frame_mapping, is_active)
magazine_generation_jobs (id, curator_id, period_id, status, mapping_data, output_path, error_log)
magazine_pages (id, generation_job_id, page_number, template_id, content_mapping, status)
```

---

## Magazine Generation System

### Status: Templates complete ✅ — Pipeline not yet built ⚠️

### Template File Structure
All templates live in `src/magazine/templates/base/`. They are currently browser-standalone
JSX files (loaded via script tags). When the Puppeteer pipeline is built they will be
refactored into individual ES module React components — do not add new templates as
monolithic batch files.

See `src/magazine/TEMPLATE_DESIGN_GUIDE.md` for the full design-to-pipeline workflow,
Claude Design prompt boilerplate, and per-issue variation pattern.

### Active Templates (17 total)
| Template | File | Pages | Trigger |
|---|---|---|---|
| CoverA | templates-1-4 | 1 | Always — page 1 |
| FrontMatter | templates-20-24 | 1 | Always — page 2 (TOC + curator name) |
| SpreadPanorama | templates-18-19 | 2 | 1 image, caption ≤50 words |
| Spread | templates-9-11 | 2 | 1 image, caption >50 words |
| Spread2 | templates-12-17 | 2 | 2 images |
| Spread4 | templates-12-17 | 2 | 3–4 images |
| SpreadMosaic | templates-18-19 | 2 | 5–6 images, light background |
| Spread6 | templates-12-17 | 2 | 7–8 images, dark image-dominant |
| TextSubmission | templates-5-8 | 1 | Essay ≤500 words |
| TextSpread | templates-12-17 | 2 | Essay 501–1800 words |
| PoetryPage | templates-20-24 | 1 | Auto-detected poetry |
| CollabSpreadCommunity | templates-20-24 | 2 | Collab, mode=community |
| CollabSpreadLocal | templates-20-24 | 2 | Collab, mode=local |
| CollabSpreadPrivate | templates-20-24 | 2 | Collab, mode=private |
| CommunicationsPage | templates-9-11 | 1 | Always (shared page, all comms) |
| CampaignPage | templates-9-11 | 1 | One per selected campaign |
| ColophonPage | templates-12-17 | 1 | Always — last page |

### Deprecated Templates (retained for reference, not used in pipeline)
SinglePhoto, MultiPhoto2Stacked, MultiPhoto2SideBySide, MultiPhoto4Feature,
MultiPhoto4Grid, CollabPage — all replaced by spread-based equivalents.
MusicPage — music is not a content type; deprecated by product decision.

### Selection Logic
Full decision tree in `src/magazine/SELECTION_LOGIC.md`. Summary:
- Photography/Art → spread variant chosen by image count
- Essay → single or two-page based on word count
- Poetry → auto-detected by line break density → PoetryPage
- All collabs → two-page spread differentiated by participation_mode

### Key Design Constants (primitives.jsx)
```javascript
W=768, H=1032, BLEED=11
AW=790, AH=1054  // full canvas with bleed
ML=58, MR=58, MT=56, MB=56
LIVEW=652  // live area width

Colors: C.ground=#252119, C.paper=#f0ebe2,
        C.terra=#e05a28 (identity/action),
        C.gold=#e8a020 (structure/warmth)
Fonts:  F.serif=Instrument Serif, F.sans=Instrument Sans,
        F.mono=Courier Prime
```

### Known Pipeline Issues (fix before Puppeteer build)
- `window._magazineSeason` global in `Folio` component — replace with prop/context
- FrontMatter TOC page numbers must be assigned after full page sequence is known

### Puppeteer Scale Factor
Render at `deviceScaleFactor: 4` for ~300dpi at 768px page width.

---

## Design System

### Philosophy
Every UI element participates in the neon color system or recedes into the warm dark. Nothing is neutral gray. Nothing is pure white. Nothing is default blue. The aesthetic: a print shop at dusk, proof light tables, letterpress type, registration marks, neon-lit darkrooms.

### CSS Variables (defined in globals.css — use these everywhere)
```css
/* Dashboard surfaces */
--ground:      #252119;
--ground-2:    #2e2a20;
--ground-3:    #373229;
--ground-4:    #413c31;
--ground-5:    #4c4639;

/* Text */
--paper:       #f0ebe2;
--paper-2:     #d8d2c8;
--paper-3:     #b0a898;
--paper-4:     #857d72;
--paper-5:     #554d44;

/* Neon accents */
--neon-accent: #e05a28;
--neon-blue:   #5a9fd4;
--neon-green:  #4ec47a;
--neon-amber:  #e0a830;
--neon-purple: #a888e8;

/* Glow variants */
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

/* Curate / proof light table (darker ground) */
--lt-bg:           #0f0e0b;
--lt-text:         rgba(235,225,205,0.85);
--lt-text-2:       rgba(235,225,205,0.65);
--lt-text-3:       rgba(235,225,205,0.42);
--lt-rule:         rgba(235,225,205,0.09);
--lt-card:         rgba(235,220,185,0.06);
--lt-card-bdr:     rgba(235,220,185,0.1);
--lt-card-bdr-sel: rgba(235,220,185,0.24);
```

### ⚠️ Invalid Variables — Never Use
- `var(--lt-surface)` → `var(--ground-2)`
- `var(--ground-raised)` → `var(--ground-3)`
- `var(--ground-base)` → `var(--ground)`
- `var(--rule-color)` → `var(--rule-mid)`
- `var(--paper-primary)` → `var(--paper)`
- `var(--paper-secondary)` → `var(--paper-3)`

### Typography
```
Instrument Serif  — display, titles, editorial, large numbers, status words (italic)
Instrument Sans   — body, descriptions, navigation (weights: 300, 400, 500)
Courier Prime     — monospace: badges, labels, metadata, buttons, counts, timestamps
```

### Neon Color Assignments
| Context | Color |
|---|---|
| Content submission | `--neon-accent` (terracotta) |
| Community collaborations | `--neon-blue` |
| Local collaborations | `--neon-green` |
| Private collaborations | `--neon-purple` |
| Communications | `--neon-amber` |
| Curate mode / save / confirm | `--neon-green` |
| Deadlines / urgency | `--neon-accent` |
| Submitted status | `--neon-accent` italic |
| Draft status | `--paper-4` italic (no neon, no badge) |
| Saved status | `--neon-green` italic |
| Sent status (communications) | `--neon-accent` italic |
| "★ you contribute" indicator | `--neon-amber` |

### Key Visual Patterns

**Press mechanic button:**
```css
font-family: var(--font-mono); font-size: 9px; letter-spacing: 0.14em; text-transform: uppercase;
border-radius: 2px;
border: 1px solid var(--rule-mid);
border-bottom: 2px solid var(--ground-4);
box-shadow: 0 2px 0 var(--ground-4), 0 3px 6px rgba(0,0,0,0.4);
/* on press: */ transform: translateY(2px); box-shadow: none;
/* on release: */ transition: transform 0.18s cubic-bezier(0.34,1.56,0.64,1);
/* IMPORTANT: never mix border shorthand with borderBottom — use explicit properties */
```

**Left border glow (selected states):**
```css
border-left: 2px solid var(--neon-[mode]);
box-shadow: -3px 0 10px -2px var(--glow-[mode]);
background: rgba([mode-rgb], 0.05);
```

**Thick paper rule:**
```css
height: 1px; background: var(--paper); opacity: 0.8;
box-shadow: 0 0 6px 1px rgba(240,235,226,0.25), 0 0 20px rgba(240,235,226,0.08);
```

**Loading state:** Courier Prime `loading…` in `--paper-4`. Never spinners.
**Empty state:** Instrument Serif italic 14px `--paper-4`.
**Grain overlay + registration marks:** Applied globally in layout.tsx.

### ⚠️ Lucide React — Never Use
Replace all lucide-react imports with inline SVGs. Standing rule.

---

## City List
Defined in `src/lib/constants/cities.ts` as `CITIES` array. Single source of truth:
```
Atlanta, Austin, Boston, Chicago, Dallas, Denver, Houston, Los Angeles,
Miami, Nashville, New Orleans, New York, Pensacola, Philadelphia, Phoenix,
Portland, San Antonio, San Diego, San Francisco, Seattle
```

---

## Collaboration System

### Three Types
1. **Chain** — sequential, phase-based
2. **Theme** — open-ended topical collection
3. **Narrative** — story-focused

### Three Participation Modes
1. **Private** — invite-only, 8–10 max
2. **Community** — open globally
3. **Local** — city-specific, uses `city` field from `collab_participants`

### Local Collab City Flow
- User's `city` from their profile is pre-filled when joining a local collab
- User can change the city before confirming via dropdown using `CITIES` constant
- Selected city written to both `collabs.location` and `collab_participants.city`

### IntegratedCollabsSection — Curate Collabs Tab ✅
- Shows ALL templates active for current period (not just joined ones)
- `★ you contribute` badge in amber on templates curator participates in
- `★ yours` on the specific city row matching curator's `collab_participants.city`
- Every option is an independent toggle — no internal slot cap
- Community = one row per template
- Local = collapsible section, one row per city with active participants
- Private = one row, only shown if curator has joined
- Description panel toggles on template name click

---

## Page-by-Page Status

### Content Submission (`/submit`) ✅
- Two modes: Collection (1–8 images, optional feature) / Full Spread (single portrait image)
- Three-level hierarchy: pageTitle → entry.title → entry.caption
- Feature image: `featureEntryId` null by default, `☆/★` button on viewer
- Filmstrip: 48×48px thumbnails, N/8 counter, add slot button
- Caption char count, turns accent over 200
- Focal point selector: clickable reticle on image viewer, stores focal_x/focal_y ✅
- Aspect ratio captured at upload time ✅

### Collab Submission (`/collabs/[id]/submit`) ✅
- Prompt strip always visible (amber left border)
- Mode badge: community=blue, local=green+location, private=purple
- Image title + caption + char count below viewer

### Communications (`/communicate/[id]` + `/communicate/new`) ✅
- Selecting recipient goes directly to compose
- Submitted communications open in read-only mode with Withdraw button
- Word count in amber, turns terracotta over 250

### Private Collab Invite Modal (`/collabs/page.tsx`) ✅
- Real Supabase query on profiles
- Purple left border glow on selected, purple press mechanic on Send Invites

### Profile (`/profile`) ✅
- City dropdown using CITIES constant
- identity_banner_url field present

---

## Seed Data

### Test Auth Users
| Email | UUID | Name | Role |
|---|---|---|---|
| contributor1@test.com | `0889833d-d56a-4969-83b4-43c9585bcd92` | Maya Torres | contributor |
| contributor2@test.com | `402f2415-65c1-4efa-a95e-c0ccb38f7048` | Daniel Osei | contributor |
| curator1@test.com | `185f8c7c-9837-425a-ac1c-ebf18d1af1b9` | Lena Vasquez | curator |

### Seeded Data (Spring 2026 period)
- 3 collab templates: One Hundred Mornings (chain), Edges (theme), The Long Way Round (narrative)
- 3 collabs: community, local (Austin), private
- 5 collab participants
- 2 content submissions (Maya: "Street Light Studies", Daniel: "Edges of Nothing")
- 3 content entries with picsum.photos placeholder images
- 2 collab submissions
- 2 communications from contributors to Lena
- 2 campaigns: Moleskine, Risograph Press Co.

### Running the seed
SQL version (recommended): copy `scripts/seed.sql` into Supabase SQL Editor and run.
Script version: requires `SUPABASE_SERVICE_ROLE_KEY` in `.env.local`, then `npm run seed`.

---

## Key Gotchas & Hard-Won Lessons

### Design
- Never mix `border` shorthand with `borderBottom`/`borderBottomWidth` on same element
- Press mechanic buttons: use explicit `borderTop`, `borderRight`, `borderLeft`, `borderBottom`

### Database
- `collab_templates` uses `name` not `title`
- `collab_submissions` uses `caption` not `content`
- Always prefer `participation_mode` over `is_private`
- Ad IDs must be real UUIDs from `campaigns` table — `discount` is int4 not text
- Use `?.` and `??` everywhere on Supabase responses
- UUIDs must be valid hex `[0-9a-f]` only, exactly 8-4-4-4-12 format

### Next.js
- Wrap `useSearchParams()` / `useParams()` in `<Suspense>`
- `images.remotePatterns` not `images.domains`

### React
- Functional state updates: `setState(prev => ...)`
- Clean up blob URLs on unmount
- Standard `<img>` for blob URLs, Next.js `<Image>` for remote

### TypeScript
- Index signatures on interfaces for Supabase responses
- `Array.isArray()` before mapping Supabase joins
- Default fallbacks: `data || []`, `value || ''`

### Magazine Templates
- Never use `window._magazineSeason` global — replace with prop before pipeline build
- All image frames use `object-fit: cover` with `object-position: {focal_x}% {focal_y}%`
- Spread templates: `className="print-page-spread"` (1580×1054px)
- Single page templates: `className="print-page"` (790×1054px)
- BleedMarks wrapper uses `position:absolute, inset:-20px` to escape overflow:hidden
- New templates: see `src/magazine/TEMPLATE_DESIGN_GUIDE.md` for full workflow

### Git / Codespaces
- Always confirm branch with `git branch` before starting — Claude Code has drifted
  to feature branches before. If not on main: `git checkout main && git pull origin main`
- Never use `git clean -fd` without first committing or stashing untracked files you want
  to keep — this deletes untracked files permanently
- After any Claude Code session: verify commits with `git log --oneline -3` in Codespaces
  and confirm they appear on origin/main before proceeding

---

## Magazine Generation — Architecture

### Pipeline (To Build — next major task)
```
Curator finalizes selections
→ Generation script reads Supabase:
    curator_creator_selections → contributor content + entries
    curator_collab_selections  → collab submissions + participant data
    curator_communication_selections → communications
    curator_campaign_selections → campaign/ad data
→ Selection logic maps each item to a template (see SELECTION_LOGIC.md)
→ Page sequence assembled, page numbers assigned
→ FrontMatter TOC built last from assembled sequence
→ Puppeteer renders each page at deviceScaleFactor:4
→ Pages assembled into single PDF per curator
→ Manual upload to Magcloud (first season) → Mixam API (future)
```

### Print Fulfillment
- **First season:** Magcloud (manual PDF upload, no API needed)
- **Future:** Mixam API (automated, variable data per curator)
- Print-on-demand handles RGB→CMYK — no CMYK output needed
- Test terracotta (#e05a28) and gold (#e8a020) in a test print before full run

### Magazine Pricing
- Base price: $25.00 per curator edition
- Each selected campaign: −$2.00 (shown live in curate interface)
- Target page count: ~38–40 pages for 20 selections

---

## Testing

### Playwright test suite
- `tests/contributor.spec.ts` — Maya flows
- `tests/curator.spec.ts` — Lena flows
- `tests/helpers/auth.ts` — gitignored, must be recreated per Codespaces instance
- 21/23 tests pass (2 failing = known correct behavior)

---

## Current Development Status

### Completed ✅
- Full dark neon UI redesign across all pages
- Complete CSS variable system in globals.css
- Fonts, grain overlay, registration marks in layout.tsx
- All main pages: dashboard, curate, profile, collabs, collab submit, communicate, submit
- IntegratedCollabsSection — all-period templates, city rows, star indicators
- Communications — compose, read-only view, Withdraw button
- Private collab invite — real Supabase search
- City constant + profile city field + local collab join city selector
- Seed data: Spring 2026 period, 3 templates, test users, content, comms, campaigns
- Playwright test suite (21/23 passing)
- **Magazine template system — 17 active templates, committed to src/magazine/** ✅
- **Selection logic: src/magazine/SELECTION_LOGIC.md** ✅
- **Template index: src/magazine/templates/base/index.js** ✅
- **Template design guide: src/magazine/TEMPLATE_DESIGN_GUIDE.md** ✅
- **Focal point selector on /submit — UI + DB + content.ts wired** ✅
- **content_entries: focal_x, focal_y, aspect_ratio columns added to Supabase** ✅

### Remaining / Known Issues ⚠️

1. **Magazine generation pipeline** — next major task. Build `src/magazine/core/generator.ts`.
   Reads curator selections from Supabase, maps to templates via SELECTION_LOGIC.md,
   renders via Puppeteer at deviceScaleFactor:4, outputs PDF per curator.

2. **`window._magazineSeason` global** — in Folio component in primitives.jsx.
   Must be replaced with a prop before Puppeteer pipeline is built.

3. **User onboarding** — no flow to set profile_type on new signup.

4. **Local city data in curate collabs tab** — city list should pull live from
   collab_participants grouped by city with real participant counts.

5. **Curator magazine preview** — browser preview route not yet built.

6. **Print fulfillment integration** — Magcloud manual first, Mixam API later.

7. **`@supabase/ssr` migration** — standing priority, touches most of src/lib/supabase/.

---

## Product Decisions

> **Music is not a content type.** Musicians participate through Photography, Art, Essay, and Poetry. The subject of the work may be musical; the artifact must stand alone in print. QR codes linking to audio or streaming platforms are explicitly out of scope. This is explained during onboarding.

---

## User Roles
- **Contributors**: Submit content, join collaborations, send communications to curators
- **Curators**: Select content for their personalized printed magazine
- Users can be both. Three test accounts exist for development testing.
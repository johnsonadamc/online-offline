# CLAUDE.md — online//offline

## Project Vision
online//offline is "slowcial media" — the antithesis of dopamine-driven social platforms. Contributors submit creative work (photos, art, poetry, essays, music) quarterly. Curators select what goes into their personalized printed magazines. The physical magazine is the product. The app is the infrastructure that makes it possible.

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
│   ├── SubmissionForm.tsx
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
│       ├── content.ts
│       ├── curation.ts
│       ├── profiles.ts
│       └── subscriptions.ts
├── scripts/
│   ├── seed.ts                   # Seed script (run via npm run seed)
│   ├── seed.sql                  # SQL equivalent — run in Supabase SQL editor
│   └── seed.README.md            # Instructions for running seed
└── _design/                      # HTML mockup reference files — read before implementing
    ├── DESIGN_BRIEF.md
    ├── dashboard-final-v2.html
    ├── curate-page-v4.html
    ├── curate-collabs-mockup-v6.html
    ├── submit-redesign-v3.html
    └── collab-submit-mockup.html
```

---

## Database Schema (Key Tables)

### Users
```sql
profiles (id, first_name, last_name, avatar_url, identity_banner_url, content_type, is_public, bio, city, bank_info, curator_payment_info)
-- identity_banner_url: separate from avatar_url, used as full-width card banner in curate interface
-- content_type: 'photography' | 'art' | 'poetry' | 'essay' | 'music'
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

content_entries (id, content_id, title, caption, media_url, is_feature, is_full_spread, order_index)
-- Up to 8 images per submission
-- title: per-image title (separate from page_title on content table)
-- is_feature: which image is the hero — can be null (no feature required)

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
These are from an old system and resolve to undefined/transparent:
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
Defined in `src/lib/constants/cities.ts` as `CITIES` array. Single source of truth used everywhere:
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
Read `_design/curate-collabs-mockup-v6.html` for full visual spec.

- Shows ALL templates active for current period (not just joined ones)
- `★ you contribute` badge in amber on templates curator participates in
- `★ yours` on the specific city row matching curator's `collab_participants.city`
- Every option is an independent toggle — no internal slot cap
- Community = one row per template
- Local = collapsible section, one row per city with active participants
- Private = one row, only shown if curator has joined
- Description panel toggles on template name click
- Empty state: Instrument Serif italic "No collaborations this period."

---

## Page-by-Page Status

### Content Submission (`/submit`) ✅
Read `_design/submit-redesign-v3.html` for full spec.
- Two modes: Collection (1–8 images, optional feature) / Full Spread (single portrait image)
- Three-level hierarchy: pageTitle → entry.title → entry.caption
- Feature image: `featureEntryId` null by default, `☆/★` button on viewer
- Filmstrip: 48×48px thumbnails, N/8 counter, add slot button
- "Copy from image 1" tags button on images 2+
- Caption char count, turns accent over 200
- Save state: status pill cycles draft → saving… → saved

### Collab Submission (`/collabs/[id]/submit`) ✅
Read `_design/collab-submit-mockup.html` for full spec.
- Prompt strip always visible (amber left border) — no floating FAB
- Mode badge: community=blue, local=green+location, private=purple
- Image title + caption + char count below viewer

### Communications (`/communicate/[id]` + `/communicate/new`) ✅
- Selecting recipient goes directly to compose — no intermediate screen
- Back arrow pre-fills search with recipient name
- Search results: Instrument Serif 17px name + italic bio + amber "to" label
- Submitted communications open in read-only mode with Withdraw button
- Withdraw updates status to draft and redirects to dashboard
- Word count in amber, turns terracotta over 250

### Private Collab Invite Modal (`/collabs/page.tsx`) ✅
- Real Supabase query on profiles (not hardcoded mock data)
- Loads all public profiles on modal open (limit 20)
- Result rows: Instrument Serif 17px name + italic bio (no "to" label)
- Purple left border glow on selected, purple press mechanic on Send Invites

### Profile (`/profile`) ✅
- City dropdown using CITIES constant
- identity_banner_url field present

---

## Seed Data

### Test Auth Users (already created in Supabase)
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
Script version: requires `SUPABASE_SERVICE_ROLE_KEY` in `.env.local`, then `npm run seed` from `online-offline/` directory.

---

## Key Gotchas & Hard-Won Lessons

### Design
- Never mix `border` shorthand with `borderBottom`/`borderBottomWidth` on same element — causes React style warning
- Press mechanic buttons: use explicit `borderTop`, `borderRight`, `borderLeft`, `borderBottom` separately

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

---

## Magazine Generation — Planned Architecture

### Pipeline
```
Curator finalizes selections → API reads Supabase → React page templates
→ Puppeteer renders with print CSS → PDF assembled per curator → Print fulfillment
```

### Page Templates (To Build)
1. Individual creator page — 1–8 images
2. Collaboration grid — 8–10 pieces
3. Communications page — text-heavy
4. Campaign/ad page
5. Cover — TBD

### Print Fulfillment
Target: Mixam (has API). Variable data printing — each curator gets a different magazine.

---

## Testing

### Playwright test suite
Located in `tests/` directory. Run with `npm test`. Requires `npm run dev` running locally.
- `tests/contributor.spec.ts` — auth, dashboard, submit, communicate, collabs flows for Maya
- `tests/curator.spec.ts` — auth, curate interface (all tabs), profile flows for Lena
- `tests/helpers/auth.ts` — shared login helpers and TEST_USERS constants

---

## Current Development Status (late April 2026)

### Completed ✅
- Full dark neon UI redesign across all pages
- Complete CSS variable system in globals.css
- Fonts, grain overlay, registration marks in layout.tsx
- All main pages redesigned: dashboard, curate, profile, collabs, collab submit, communicate, submit
- IntegratedCollabsSection — all-period templates, city rows, description panels, star indicators
- Ads save error fixed — real campaigns query
- Communications — direct to compose, read-only view for sent messages with Withdraw button
- Private collab invite — real Supabase search, design system styling
- City constant + profile city field + local collab join city selector
- Seed data loaded: Spring 2026 period, 3 templates, test users, content, comms, campaigns
- Playwright test suite scaffolded

### Remaining / Known Issues ⚠️

1. **Local city data in curate collabs tab** — city list should pull live from `collab_participants` grouped by city per template with real participant counts. May show placeholder data currently.

2. **User onboarding** — no flow to set profile_type on new signup. New users land with no role assigned which will cause issues as real users join.

3. **Magazine generation system** — not yet built. Highest priority remaining feature.

4. **Print fulfillment integration** — not yet built.

5. **Curator magazine preview** — not yet built.

6. **`@supabase/ssr` migration** — standing priority.

7. **End-to-end testing** — Playwright suite complete. The suite is running, 21/23 tests pass, the 2 remaining are known correct behavior (empty collab library because Maya joined everything).
    - tests/helpers/auth.ts is gitignored — must be recreated manually in each new Codespaces instance using the credentials in the Seed Data section.

---

## User Roles
- **Contributors**: Submit content, join collaborations, send communications to curators
- **Curators**: Select content for their personalized printed magazine
- Users can be both. Three test accounts exist for development testing.
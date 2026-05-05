CLAUDE.md — online//offline
Project Vision
online//offline is "slowcial media" — the antithesis of dopamine-driven social platforms. Contributors submit creative work (photos, art, poetry, and essays) quarterly. Curators select what goes into their personalized printed magazines. The physical magazine is the product. The app is the infrastructure that makes it possible.
The philosophy: deliberate pace, thoughtful curation, real-world creative collaboration, and a beautiful printed artifact as the payoff. The app should feel calm and purposeful, not stimulating.

Tech Stack

Framework: Next.js (App Router)
Database + Auth + Storage: Supabase
UI: Tailwind CSS + shadcn/ui (being phased out in favor of CSS variables + inline styles)
Dev environment: GitHub Codespaces
Deployment: Vercel
Language: TypeScript throughout

⚠️ Known Dependency Issue — High Priority
@supabase/auth-helpers-nextjs and @supabase/auth-helpers-shared are deprecated. The entire codebase should be migrated to @supabase/ssr. This is a significant refactor touching most data-fetching files in src/lib/supabase/. Do not introduce new usage of the old helpers. Flag this migration as a standing priority.

⚠️ Branch Discipline
All work goes directly on main unless explicitly instructed otherwise. Always confirm with git branch before starting any work. After any session confirm with git log --oneline -3 that commits landed on main. If diverged: git fetch origin && git merge origin/claude/[branch-name] && git push origin main.
Claude Code has a persistent pattern of claiming "main does not exist" and working on feature branches instead. This is always wrong. Main exists. Always merge feature branch work to main immediately after each session.
After committing, always push with: git push origin HEAD:main

⚠️ File Size / Stream Timeouts
Large files cause stream timeouts if rewritten in one pass. Always use targeted str_replace edits for changes to large files. Never rewrite an entire large file in one tool call.

Project Structure
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
├── magazine/                      # Magazine generation system ✅ COMPLETE
│   ├── core/
│   │   ├── primitives.jsx         # Shared components: ImageFrame (renders real images ✅),
│   │   │                          # Folio (season prop ✅), GrainOverlay, RegistrationMark,
│   │   │                          # BleedMarks, SectionMark, etc.
│   │   ├── generator.ts           # ✅ Puppeteer pipeline — fully operational
│   │   ├── selectionLogic.ts      # ✅ Template selection decision tree
│   │   └── types.ts               # ✅ Full TypeScript interfaces for all templates
│   ├── templates/
│   │   └── base/
│   │       ├── index.js           # Template registry + selection logic summary ✅
│   │       ├── templates-1-4.jsx  # CoverA, SinglePhoto†, MultiPhoto2Stacked†, MultiPhoto2SideBySide†
│   │       ├── templates-5-8.jsx  # MultiPhoto4Feature†, MultiPhoto4Grid†, TextSubmission, CollabPage†
│   │       ├── templates-9-11.jsx # CommunicationsPage, CampaignPage, Spread
│   │       ├── templates-12-17.jsx # Spread2, Spread4, Spread6, TextSpread, MusicPage†, ColophonPage
│   │       ├── templates-18-19.jsx # SpreadPanorama (gutter-safe ✅), SpreadMosaic
│   │       └── templates-20-24.jsx # FrontMatter, PoetryPage, CollabSpreadCommunity,
│   │                               # CollabSpreadLocal (city watermark wired ✅), CollabSpreadPrivate
│   ├── SELECTION_LOGIC.md         # Full decision tree: data → template mapping ✅
│   └── TEMPLATE_DESIGN_GUIDE.md   # How to design + wire new templates ✅
├── scripts/
│   ├── seed.ts
│   ├── seed.sql
│   ├── seed.README.md
│   └── test-generator.ts          # ✅ Smoke test — run with npm run generate-test
└── _design/                       # HTML mockup reference files
    ├── DESIGN_BRIEF.md
    ├── dashboard-final-v2.html
    ├── curate-page-v4.html
    ├── curate-collabs-mockup-v6.html
    ├── submit-redesign-v3.html
    └── collab-submit-mockup.html
† Deprecated — retained for reference only. Not used in generation pipeline.

Database Schema (Key Tables)
Users
profiles (id, first_name, last_name, avatar_url, identity_banner_url, content_type, is_public, bio, city, bank_info, curator_payment_info)
-- identity_banner_url: separate from avatar_url, used as full-width card banner in curate interface
-- content_type: 'photography' | 'art' | 'poetry' | 'essay'
-- city: text field, values from CITIES constant in src/lib/constants/cities.ts

profile_types (profile_id, type)   -- 'contributor' or 'curator'
profile_connections (follower_id, followed_id, status, relationship_type)
subscriptions (subscriber_id, creator_id, status)

Periods (Quarterly)
periods (id, name, season, year, start_date, end_date, is_active)
-- Current active period: Spring 2026 (id: aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa)
-- Only one period should have is_active = true at a time

Content
content (id, creator_id, type, status, period_id, page_title, layout_preferences, content_dimensions, style_metadata)
-- type: 'regular' | 'fullSpread'
-- status: 'draft' | 'submitted' | 'archived'

content_entries (id, content_id, title, caption, media_url, is_feature, is_full_spread, order_index, focal_x, focal_y, aspect_ratio)
-- Up to 8 images per submission
-- focal_x, focal_y: float 0–100, crop center, default 50 ✅
-- aspect_ratio: float, stored at upload time ✅
-- media_url: must be https:// URL — blob: URLs are invalid and will not render in Puppeteer

content_tags (content_entry_id, tag, tag_type)

Collaborations
collabs (id, title, type, is_private, participation_mode, location, template_id, period_id, metadata, description)
-- type: 'chain' | 'theme' | 'narrative'
-- participation_mode: 'community' | 'local' | 'private'
-- Always prefer participation_mode over is_private (legacy)

collab_participants (id, collab_id, profile_id, role, status, participation_mode, city, location)
-- city is preferred over location for local collabs

collab_templates (id, name, type, instructions, requirements, connection_rules, display_text, internal_reference, is_active)
-- IMPORTANT: field is 'name' not 'title'
-- display_text: public-facing description shown to curators
-- instructions: prompt/brief shown to contributors on submit page

period_templates (period_id, template_id)

collab_submissions (id, collab_id, contributor_id, title, caption, media_url, status, metadata)
-- IMPORTANT: text field is 'caption' not 'content'

Communications
communications (id, sender_id, recipient_id, subject, content, image_url, word_count, status, period_id, is_selected, is_included)
-- status: 'draft' | 'submitted'
communication_notifications (id, communication_id, recipient_id, is_read)

Campaigns (Ads)
campaigns (id, name, bio, avatar_url, last_post, discount, period_id, is_active)
-- discount is int4 (integer, e.g. 2 = $2 off)
-- avatar_url: brand image rendered full-bleed on CampaignPage ✅

Curation Selections
curator_creator_selections (curator_id, creator_id, period_id)
curator_campaign_selections (curator_id, campaign_id, period_id)
curator_collab_selections (curator_id, collab_id, period_id, participation_mode, location, source_id)
curator_communication_selections (curator_id, period_id, include_communications)

Magazine Generation
magazine_templates (id, name, type, description, file_path, frame_mapping, is_active)
magazine_generation_jobs (id, curator_id, period_id, status, mapping_data, output_path, error_log)
magazine_pages (id, generation_job_id, page_number, template_id, content_mapping, status)

Magazine Generation System
Status: ✅ FULLY OPERATIONAL
The pipeline runs end-to-end with real images. To generate a test magazine:
set -a && source .env.local && set +a && npm run generate-test
cp /tmp/magazine-*.pdf /tmp/magazine-review.pdf

Page Sequence
Page 1:  CoverA
Page 2:  BlankPage (dark, empty — left side of FrontMatter spread)
Page 3:  FrontMatter (TOC + curator name)
Page 4+: Content pages (photography → art → essay → poetry → collabs → comms → campaigns)
Last:    ColophonPage

Active Templates (18 total including BlankPage)
Template            File                Pages  Trigger
CoverA              templates-1-4       1      Always — page 1
BlankPage           inline generator    1      Always — page 2
FrontMatter         templates-20-24     1      Always — page 3 (TOC + curator name)
SpreadPanorama      templates-18-19     2      1 image, caption ≤50 words
Spread              templates-9-11      2      1 image, caption >50 words
Spread2             templates-12-17     2      2 images
Spread4             templates-12-17     2      3–4 images
SpreadMosaic        templates-18-19     2      5–6 images, light background
Spread6             templates-12-17     2      7–8 images, dark image-dominant
TextSubmission      templates-5-8       1      Essay ≤500 words
TextSpread          templates-12-17     2      Essay 501–1800 words
PoetryPage          templates-20-24     1      Auto-detected poetry
CollabSpreadCommunity templates-20-24   2      Collab, mode=community
CollabSpreadLocal   templates-20-24     2      Collab, mode=local
CollabSpreadPrivate templates-20-24     2      Collab, mode=private
CommunicationsPage  templates-9-11      1      Always if include_communications=true
CampaignPage        templates-9-11      1      One per selected campaign
ColophonPage        templates-12-17     1      Always — last page

Deprecated Templates (not used in pipeline)
SinglePhoto, MultiPhoto2Stacked, MultiPhoto2SideBySide, MultiPhoto4Feature, MultiPhoto4Grid, CollabPage, MusicPage

Key Design Constants (primitives.jsx)
W=768, H=1032, BLEED=11
AW=790, AH=1054  // full canvas with bleed
ML=58, MR=58, MT=56, MB=56
LIVEW=652  // live area width

Colors: C.ground=#252119, C.paper=#f0ebe2,
        C.terra=#e05a28 (identity/action),
        C.gold=#e8a020 (structure/warmth)
Fonts:  F.serif=Instrument Serif, F.sans=Instrument Sans,
        F.mono=Courier Prime

ImageFrame Component
ImageFrame in primitives.jsx accepts a media_url prop. When the URL starts with https://, a real <img> renders with object-fit: cover and object-position: {focal_x}% {focal_y}%. The crosshair SVG, terra dot, and label are hidden when a real image is present. blob: URLs fall back to placeholder.

Gutter Safety Rule
No body text or caption text may cross the center gutter on spread templates. Large display titles (fontSize ≥ 40px) may cross the gutter. SpreadPanorama caption band is gutter-safe ✅.

Cover Volume/Issue
CoverA reads data.volume and data.issue for the "Vol. I · No. 1" line. Currently hardcoded as volume: 'I', issue: 1 in generator.ts. Future: add volume and issue fields to the periods table and read dynamically.

Content Type Normalization
generator.ts includes a normalizeContentType() function that maps raw DB values to display labels:
photography → Photography
art → Art
essay / writing → Essay
poetry → Poetry
This is applied to all TOC entries in FrontMatter.

Print Notes
- Puppeteer renders at deviceScaleFactor: 4 (~300dpi at 768px page width)
- PDF assembled with pdf-lib
- Spread templates render at 1580px viewport, clipped into left/right 790px buffers
- Saddle-stitch binding consumes ~2-4mm at center gutter — keep critical subjects away
- Bleed and crop marks are correct and required — do not remove them
- First season: manual PDF upload to Magcloud
- Future: Mixam API (automated)
- Test terracotta (#e05a28) and gold (#e8a020) in a test print before full run

Running the Generator
# Required env vars in .env.local:
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...

# Load env vars and run:
set -a && source .env.local && set +a && npm run generate-test

# Output goes to /tmp — never copy to working directory
# View PDF by downloading from /tmp directly
Known Remaining Issues
1. User onboarding — no flow to set profile_type on new signup.
2. Local city data in curate collabs tab — city list should pull live from collab_participants grouped by city with real participant counts.
3. Curator magazine preview — browser preview route not yet built.
4. Print fulfillment integration — Magcloud manual first, Mixam API later.
5. @supabase/ssr migration — standing priority, touches most of src/lib/supabase/.
6. Magazine generation job tracking — pipeline writes to /tmp but does not record in magazine_generation_jobs table.
7. Volume/issue dynamic — volume: 'I', issue: 1 hardcoded in generator.ts. Add volume and issue fields to periods table and read dynamically.

Design System
Philosophy
Every UI element participates in the neon color system or recedes into the warm dark. Nothing is neutral gray. Nothing is pure white. Nothing is default blue. The aesthetic: a print shop at dusk, proof light tables, letterpress type, registration marks, neon-lit darkrooms.

CSS Variables (defined in globals.css — use these everywhere)
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

⚠️ Invalid Variables — Never Use
var(--lt-surface) → var(--ground-2)
var(--ground-raised) → var(--ground-3)
var(--ground-base) → var(--ground)
var(--rule-color) → var(--rule-mid)
var(--paper-primary) → var(--paper)
var(--paper-secondary) → var(--paper-3)

Typography
Instrument Serif  — display, titles, editorial, large numbers, status words (italic)
Instrument Sans   — body, descriptions, navigation (weights: 300, 400, 500)
Courier Prime     — monospace: badges, labels, metadata, buttons, counts, timestamps

Neon Color Assignments
Context                          Color
Content submission               --neon-accent (terracotta)
Community collaborations         --neon-blue
Local collaborations             --neon-green
Private collaborations           --neon-purple
Communications                   --neon-amber
Curate mode / save / confirm     --neon-green
Deadlines / urgency              --neon-accent
Submitted status                 --neon-accent italic
Draft status                     --paper-4 italic (no neon, no badge)
Saved status                     --neon-green italic
Sent status (communications)     --neon-accent italic
"★ you contribute" indicator     --neon-amber

Key Visual Patterns
Press mechanic button:
font-family: var(--font-mono); font-size: 9px; letter-spacing: 0.14em; text-transform: uppercase;
border-radius: 2px;
border: 1px solid var(--rule-mid);
border-bottom: 2px solid var(--ground-4);
box-shadow: 0 2px 0 var(--ground-4), 0 3px 6px rgba(0,0,0,0.4);
/* on press: */ transform: translateY(2px); box-shadow: none;
/* on release: */ transition: transform 0.18s cubic-bezier(0.34,1.56,0.64,1);
/* IMPORTANT: never mix border shorthand with borderBottom */

Left border glow:
border-left: 2px solid var(--neon-[mode]);
box-shadow: -3px 0 10px -2px var(--glow-[mode]);
background: rgba([mode-rgb], 0.05);

Thick paper rule:
height: 1px; background: var(--paper); opacity: 0.8;
box-shadow: 0 0 6px 1px rgba(240,235,226,0.25), 0 0 20px rgba(240,235,226,0.08);

Loading state: Courier Prime loading… in --paper-4. Never spinners.
Empty state: Instrument Serif italic 14px --paper-4.
Grain overlay + registration marks: Applied globally in layout.tsx.

⚠️ Lucide React — Never Use
Replace all lucide-react imports with inline SVGs. Standing rule.

City List
Defined in src/lib/constants/cities.ts as CITIES array:
Atlanta, Austin, Boston, Chicago, Dallas, Denver, Houston, Los Angeles,
Miami, Nashville, New Orleans, New York, Pensacola, Philadelphia, Phoenix,
Portland, San Antonio, San Diego, San Francisco, Seattle

Collaboration System
Three Participation Modes
- Private — invite-only, 8–10 max
- Community — open globally
- Local — city-specific, uses city field from collab_participants

Local Collab City Flow
- User's city from profile is pre-filled when joining a local collab
- User can change city via dropdown using CITIES constant
- Selected city written to both collabs.location and collab_participants.city

IntegratedCollabsSection — Curate Collabs Tab ✅
- Shows ALL templates active for current period
- ★ you contribute badge in amber on templates curator participates in
- Every option is an independent toggle — no internal slot cap
- Community = one row per template
- Local = collapsible section, one row per city with active participants
- Private = one row, only shown if curator has joined

Page-by-Page Status
Content Submission (/submit) ✅
- Two modes: Collection (1–8 images) / Full Spread (single portrait image)
- Focal point selector: clickable reticle, stores focal_x/focal_y ✅
- Aspect ratio captured at upload time ✅

Collab Submission (/collabs/[id]/submit) ✅
Communications (/communicate/[id] + /communicate/new) ✅
Private Collab Invite Modal ✅
Profile (/profile) ✅

Seed Data
Test Auth Users
Email                       UUID                                    Name            Role
contributor1@test.com       0889833d-d56a-4969-83b4-43c9585bcd92   Maya Torres     contributor
contributor2@test.com       402f2415-65c1-4efa-a95e-c0ccb38f7048   Daniel Osei     contributor
curator1@test.com           185f8c7c-9837-425a-ac1c-ebf18d1af1b9   Lena Vasquez    curator

Seeded Data (Spring 2026 period)
- 3 collab templates, 3 collabs (community, local Austin, private)
- Maya: "Street Light Studies" (2 images) + "After the Rain" (1 image)
- Daniel: "Edges of Nothing" (1 image, content_type=writing/Essay)
- 2 campaigns: Moleskine, Risograph Press Co. (both have avatar_url images)
- All content_entries for seed submissions have real Supabase storage URLs — do not re-run seed.sql without restoring these
- Collab submissions have Unsplash image URLs

Curator Selections for Lena (all manually added)
- curator_creator_selections: Maya Torres + Daniel Osei ✅
- curator_collab_selections: community (One Hundred Mornings), local (Edges-Austin), private (The Long Way Round) ✅
- curator_campaign_selections: Moleskine + Risograph ✅
- curator_communication_selections: include_communications=true ✅

Running the seed
SQL version (recommended): copy scripts/seed.sql into Supabase SQL Editor and run.
⚠️ Re-running seed will wipe manually added media_url values — restore them after.

Key Gotchas & Hard-Won Lessons

### Design
- Never mix border shorthand with borderBottom/borderBottomWidth on same element
- Never use lucide-react — inline SVGs only

### Database
- collab_templates uses name not title
- collab_submissions uses caption not content
- Always prefer participation_mode over is_private
- discount on campaigns is int4 not text
- Use .maybeSingle() not .single() when a row may not exist
- Only one period should have is_active = true
- media_url must be https:// — blob: URLs will not render in Puppeteer

### Magazine Templates
- ImageFrame hides crosshair/dot/label when real image present ✅
- Folio takes season as prop — never use window._magazineSeason
- No body text may cross center gutter on spreads (display titles ≥40px exempt)
- CollabSpreadLocal city watermark reads data.city from generator ✅
- CampaignPage full-bleed image reads data.avatar_url ✅
- Cover reads data.volume and data.issue for Vol/Issue line ✅

### Generator
- Run with set -a && source .env.local && set +a && npm run generate-test
- Requires SUPABASE_SERVICE_ROLE_KEY — anon key alone is insufficient
- networkidle0 waits for Google Fonts and image loads
- PDF output goes to /tmp only — never copy to working directory
- BlankPage defined inline in generator.ts
- normalizeContentType() maps DB values to display labels for TOC

### Git / Codespaces
- Always confirm branch with git branch before starting
- Claude Code persistently claims "main does not exist" — this is always wrong
- After every Claude Code session: git fetch origin && git merge origin/claude/[branch] && git push origin main
- Always push with: git push origin HEAD:main
- Confirm with git log --oneline -3 that commits are on origin/main

### Repository Hygiene
- Never commit PDF files — generated PDFs go to /tmp only, never to the working directory
- Never commit files over 50MB under any circumstances
- Verify .gitignore covers generated artifacts before every commit
- magazine-test.pdf and /tmp/magazine-*.pdf are in .gitignore — do not remove these entries

Magazine Pricing
- Base price: $25.00 per curator edition
- Each selected campaign: −$2.00
- Target: ~38–40 pages for 20 selections
- Unit print cost target: ~$8–10 at Magcloud

Testing
- tests/contributor.spec.ts — Maya flows
- tests/curator.spec.ts — Lena flows
- 21/23 tests pass (2 failing = known correct behavior)

Current Development Status
Completed ✅
- Full dark neon UI across all pages
- Complete CSS variable system
- All main pages: dashboard, curate, profile, collabs, collab submit, communicate, submit
- Magazine template system — 18 active templates (17 + BlankPage)
- Magazine generation pipeline — fully operational with real images
- FrontMatter TOC with correct content_type display
- Cover Vol/Issue line, removed "Quarterly Print" and coordinates
- ImageFrame crosshair hidden when real image present
- CollabSpreadLocal city watermark wired from data
- CampaignPage avatar_url wired
- Gutter safety enforced on all spread templates
- Focal point selector on /submit
- Playwright test suite (21/23 passing)
- Music removed as content type (product decision — see Product Decisions)

Remaining / Known Issues ⚠️
1. User onboarding — no flow to set profile_type on new signup.
2. Local city data in curate collabs tab — city list should pull live from collab_participants grouped by city with real participant counts.
3. Curator magazine preview — browser preview route not yet built.
4. Print fulfillment integration — Magcloud manual first, Mixam API later.
5. @supabase/ssr migration — standing priority, touches most of src/lib/supabase/.
6. Magazine generation job tracking — pipeline writes to /tmp but does not record in magazine_generation_jobs table.
7. Volume/issue dynamic — volume: 'I', issue: 1 hardcoded in generator.ts. Add volume and issue fields to periods table and read dynamically.

User Roles
- Contributors: Submit content, join collaborations, send communications to curators
- Curators: Select content for their personalized printed magazine
- Users can be both. Three test accounts exist for development testing.

Product Decisions

**Music is not a content type.** Musicians participate through Photography, Art, Essay, and Poetry. The subject of the work may be musical; the artifact must stand alone in print. QR codes linking to audio or streaming platforms are explicitly out of scope. This philosophy is communicated during onboarding. Sheet music, lyrics, and scores are submitted as Art or Poetry.
CLAUDE.md — online//offline
Project Vision
online//offline is "slowcial media" — the antithesis of dopamine-driven social platforms. Contributors submit creative work (photos, art, poetry, essays, music) quarterly. Curators select what goes into their personalized printed magazines. The physical magazine is the product. The app is the infrastructure that makes it possible.
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
│   │       ├── templates-12-17.jsx # Spread2, Spread4, Spread6, TextSpread, MusicPage, ColophonPage
│   │       ├── templates-18-19.jsx # SpreadPanorama (gutter-safe ✅), SpreadMosaic
│   │       └── templates-20-24.jsx # FrontMatter, PoetryPage, CollabSpreadCommunity,
│   │                               # CollabSpreadLocal, CollabSpreadPrivate
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
sqlprofiles (id, first_name, last_name, avatar_url, identity_banner_url, content_type, is_public, bio, city, bank_info, curator_payment_info)
-- identity_banner_url: separate from avatar_url, used as full-width card banner in curate interface
-- content_type: 'photography' | 'art' | 'poetry' | 'essay' | 'music'
-- city: text field, values from CITIES constant in src/lib/constants/cities.ts

profile_types (profile_id, type)   -- 'contributor' or 'curator'
profile_connections (follower_id, followed_id, status, relationship_type)
subscriptions (subscriber_id, creator_id, status)
Periods (Quarterly)
sqlperiods (id, name, season, year, start_date, end_date, is_active)
-- Current active period: Spring 2026 (id: aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa)
-- Only one period should have is_active = true at a time
Content
sqlcontent (id, creator_id, type, status, period_id, page_title, layout_preferences, content_dimensions, style_metadata)
-- type: 'regular' | 'fullSpread'
-- status: 'draft' | 'submitted' | 'archived'

content_entries (id, content_id, title, caption, media_url, is_feature, is_full_spread, order_index, focal_x, focal_y, aspect_ratio)
-- Up to 8 images per submission
-- title: per-image title (separate from page_title on content table)
-- is_feature: which image is the hero — can be null (no feature required)
-- focal_x: float 0–100, crop center X, default 50 ✅ (in DB + UI)
-- focal_y: float 0–100, crop center Y, default 50 ✅ (in DB + UI)
-- aspect_ratio: float, stored at upload time ✅ (in DB + UI)
-- media_url: must be https:// URL — blob: URLs are invalid and will not render in Puppeteer

content_tags (content_entry_id, tag, tag_type)
Collaborations
sqlcollabs (id, title, type, is_private, participation_mode, location, template_id, period_id, metadata, description)
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
Communications
sqlcommunications (id, sender_id, recipient_id, subject, content, image_url, word_count, status, period_id, is_selected, is_included)
-- status: 'draft' | 'submitted'
communication_notifications (id, communication_id, recipient_id, is_read)
Campaigns (Ads)
sqlcampaigns (id, name, bio, avatar_url, last_post, discount, period_id, is_active)
-- discount is int4 (integer, e.g. 2 = $2 off)
Curation Selections
sqlcurator_creator_selections (curator_id, creator_id, period_id)
curator_campaign_selections (curator_id, campaign_id, period_id)
curator_collab_selections (curator_id, collab_id, period_id, participation_mode, location, source_id)
curator_communication_selections (curator_id, period_id, include_communications)
Magazine Generation
sqlmagazine_templates (id, name, type, description, file_path, frame_mapping, is_active)
magazine_generation_jobs (id, curator_id, period_id, status, mapping_data, output_path, error_log)
magazine_pages (id, generation_job_id, page_number, template_id, content_mapping, status)

Magazine Generation System
Status: ✅ FULLY OPERATIONAL
The pipeline runs end-to-end. To generate a test magazine:
bashset -a && source .env.local && set +a && npm run generate-test
cp /tmp/magazine-*.pdf magazine-test.pdf
Page Sequence
Page 1:  CoverA
Page 2:  BlankPage (dark, empty — left side of FrontMatter spread)
Page 3:  FrontMatter (TOC + curator name)
Page 4+: Content pages (photography → art → essay → poetry → music → collabs → comms → campaigns)
Last:    ColophonPage
Template File Structure
All templates live in src/magazine/templates/base/. They are browser-standalone JSX files loaded via Puppeteer's setContent. The pipeline injects them as inline script strings alongside primitives.jsx.
Active Templates (19 total including BlankPage)
TemplateFilePagesTriggerCoverAtemplates-1-41Always — page 1BlankPageinline in generator.ts1Always — page 2FrontMattertemplates-20-241Always — page 3 (TOC + curator name)SpreadPanoramatemplates-18-1921 image, caption ≤50 wordsSpreadtemplates-9-1121 image, caption >50 wordsSpread2templates-12-1722 imagesSpread4templates-12-1723–4 imagesSpreadMosaictemplates-18-1925–6 images, light backgroundSpread6templates-12-1727–8 images, dark image-dominantTextSubmissiontemplates-5-81Essay ≤500 wordsTextSpreadtemplates-12-172Essay 501–1800 wordsPoetryPagetemplates-20-241Auto-detected poetryMusicPagetemplates-12-171Music submissionsCollabSpreadCommunitytemplates-20-242Collab, mode=communityCollabSpreadLocaltemplates-20-242Collab, mode=localCollabSpreadPrivatetemplates-20-242Collab, mode=privateCommunicationsPagetemplates-9-111Always if include_communications=trueCampaignPagetemplates-9-111One per selected campaignColophonPagetemplates-12-171Always — last page
Deprecated Templates (retained for reference, not used in pipeline)
SinglePhoto, MultiPhoto2Stacked, MultiPhoto2SideBySide, MultiPhoto4Feature,
MultiPhoto4Grid, CollabPage — all replaced by spread-based equivalents.
Key Design Constants (primitives.jsx)
javascriptW=768, H=1032, BLEED=11
AW=790, AH=1054  // full canvas with bleed
ML=58, MR=58, MT=56, MB=56
LIVEW=652  // live area width

Colors: C.ground=#252119, C.paper=#f0ebe2,
        C.terra=#e05a28 (identity/action),
        C.gold=#e8a020 (structure/warmth)
Fonts:  F.serif=Instrument Serif, F.sans=Instrument Sans,
        F.mono=Courier Prime
ImageFrame Component
ImageFrame in primitives.jsx accepts a media_url prop. When the URL starts with https://, a real <img> renders with object-fit: cover and object-position: {focal_x}% {focal_y}%. The placeholder crosshair SVG renders underneath when no image is present. blob: URLs are filtered out and fall back to placeholder.
Gutter Safety Rule
No body text or caption text may cross the center gutter on spread templates. Large display titles (fontSize ≥ 40px) may cross the gutter. Each spread page must keep its text content within its own page boundary:

Left page text: left ≥ ML (58px), right boundary ≤ AW (790px)
Right page text: contained within right-page wrapper div
SpreadPanorama caption band: already fixed and gutter-safe ✅

Print Notes

Puppeteer renders at deviceScaleFactor: 4 (~300dpi at 768px page width)
PDF assembled with pdf-lib
Spread templates render at 1580px viewport, clipped into left/right 790px buffers
Saddle-stitch binding consumes ~2-4mm at center gutter — keep critical subjects away from gutter
Bleed and crop marks are correct and required — do not remove them
First season: manual PDF upload to Magcloud
Future: Mixam API (automated)
Test terracotta (#e05a28) and gold (#e8a020) in a test print before full run

Running the Generator
bash# Required env vars in .env.local:
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...

# Load env vars and run:
set -a && source .env.local && set +a && npm run generate-test

# Copy PDF for download:
cp /tmp/magazine-*.pdf magazine-test.pdf
Known Remaining Issues

magazine_generation_jobs table exists in schema but pipeline writes directly to /tmp — no DB job tracking yet
Music QR code generation (Spotify/Bandcamp URL → QR) not yet implemented — MusicPage renders placeholder
FrontMatter TOC type field shows writing for Daniel Osei — should normalize content_type display


Design System
Philosophy
Every UI element participates in the neon color system or recedes into the warm dark. Nothing is neutral gray. Nothing is pure white. Nothing is default blue. The aesthetic: a print shop at dusk, proof light tables, letterpress type, registration marks, neon-lit darkrooms.
CSS Variables (defined in globals.css — use these everywhere)
css/* Dashboard surfaces */
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
ContextColorContent submission--neon-accent (terracotta)Community collaborations--neon-blueLocal collaborations--neon-greenPrivate collaborations--neon-purpleCommunications--neon-amberCurate mode / save / confirm--neon-greenDeadlines / urgency--neon-accentSubmitted status--neon-accent italicDraft status--paper-4 italic (no neon, no badge)Saved status--neon-green italicSent status (communications)--neon-accent italic"★ you contribute" indicator--neon-amber
Key Visual Patterns
Press mechanic button:
cssfont-family: var(--font-mono); font-size: 9px; letter-spacing: 0.14em; text-transform: uppercase;
border-radius: 2px;
border: 1px solid var(--rule-mid);
border-bottom: 2px solid var(--ground-4);
box-shadow: 0 2px 0 var(--ground-4), 0 3px 6px rgba(0,0,0,0.4);
/* on press: */ transform: translateY(2px); box-shadow: none;
/* on release: */ transition: transform 0.18s cubic-bezier(0.34,1.56,0.64,1);
/* IMPORTANT: never mix border shorthand with borderBottom — use explicit properties */
Left border glow (selected states):
cssborder-left: 2px solid var(--neon-[mode]);
box-shadow: -3px 0 10px -2px var(--glow-[mode]);
background: rgba([mode-rgb], 0.05);
Thick paper rule:
cssheight: 1px; background: var(--paper); opacity: 0.8;
box-shadow: 0 0 6px 1px rgba(240,235,226,0.25), 0 0 20px rgba(240,235,226,0.08);
Loading state: Courier Prime loading… in --paper-4. Never spinners.
Empty state: Instrument Serif italic 14px --paper-4.
Grain overlay + registration marks: Applied globally in layout.tsx.
⚠️ Lucide React — Never Use
Replace all lucide-react imports with inline SVGs. Standing rule.

City List
Defined in src/lib/constants/cities.ts as CITIES array. Single source of truth:
Atlanta, Austin, Boston, Chicago, Dallas, Denver, Houston, Los Angeles,
Miami, Nashville, New Orleans, New York, Pensacola, Philadelphia, Phoenix,
Portland, San Antonio, San Diego, San Francisco, Seattle

Collaboration System
Three Types

Chain — sequential, phase-based
Theme — open-ended topical collection
Narrative — story-focused

Three Participation Modes

Private — invite-only, 8–10 max
Community — open globally
Local — city-specific, uses city field from collab_participants

Local Collab City Flow

User's city from their profile is pre-filled when joining a local collab
User can change the city before confirming via dropdown using CITIES constant
Selected city written to both collabs.location and collab_participants.city

IntegratedCollabsSection — Curate Collabs Tab ✅

Shows ALL templates active for current period (not just joined ones)
★ you contribute badge in amber on templates curator participates in
★ yours on the specific city row matching curator's collab_participants.city
Every option is an independent toggle — no internal slot cap
Community = one row per template
Local = collapsible section, one row per city with active participants
Private = one row, only shown if curator has joined
Description panel toggles on template name click


Page-by-Page Status
Content Submission (/submit) ✅

Two modes: Collection (1–8 images, optional feature) / Full Spread (single portrait image)
Three-level hierarchy: pageTitle → entry.title → entry.caption
Feature image: featureEntryId null by default, ☆/★ button on viewer
Filmstrip: 48×48px thumbnails, N/8 counter, add slot button
Caption char count, turns accent over 200
Focal point selector: clickable reticle on image viewer, stores focal_x/focal_y ✅
Aspect ratio captured at upload time ✅

Collab Submission (/collabs/[id]/submit) ✅

Prompt strip always visible (amber left border)
Mode badge: community=blue, local=green+location, private=purple
Image title + caption + char count below viewer

Communications (/communicate/[id] + /communicate/new) ✅

Selecting recipient goes directly to compose
Submitted communications open in read-only mode with Withdraw button
Word count in amber, turns terracotta over 250

Private Collab Invite Modal (/collabs/page.tsx) ✅

Real Supabase query on profiles
Purple left border glow on selected, purple press mechanic on Send Invites

Profile (/profile) ✅

City dropdown using CITIES constant
identity_banner_url field present


Seed Data
Test Auth Users
EmailUUIDNameRolecontributor1@test.com0889833d-d56a-4969-83b4-43c9585bcd92Maya Torrescontributorcontributor2@test.com402f2415-65c1-4efa-a95e-c0ccb38f7048Daniel Oseicontributorcurator1@test.com185f8c7c-9837-425a-ac1c-ebf18d1af1b9Lena Vasquezcurator
Seeded Data (Spring 2026 period)

3 collab templates: One Hundred Mornings (chain), Edges (theme), The Long Way Round (narrative)
3 collabs: community, local (Austin), private
5 collab participants
2 content submissions (Maya: "Street Light Studies" + "After the Rain", Daniel: "Edges of Nothing")
Seed content entries have real Supabase storage URLs added manually — do not re-run seed.sql without restoring these
2 collab submissions
2 communications from contributors to Lena
2 campaigns: Moleskine, Risograph Press Co.

Curator Selections (added manually for testing)
Lena has the following selections in the DB for Spring 2026:

curator_creator_selections: Maya Torres + Daniel Osei
No collab, campaign, or communications selections yet

Running the seed
SQL version (recommended): copy scripts/seed.sql into Supabase SQL Editor and run.
Script version: requires SUPABASE_SERVICE_ROLE_KEY in .env.local, then npm run seed.
⚠️ Re-running seed will wipe manually added media_url values on content_entries — restore them after.

Key Gotchas & Hard-Won Lessons
Design

Never mix border shorthand with borderBottom/borderBottomWidth on same element
Press mechanic buttons: use explicit borderTop, borderRight, borderLeft, borderBottom

Database

collab_templates uses name not title
collab_submissions uses caption not content
Always prefer participation_mode over is_private
Ad IDs must be real UUIDs from campaigns table — discount is int4 not text
Use ?. and ?? everywhere on Supabase responses
UUIDs must be valid hex [0-9a-f] only, exactly 8-4-4-4-12 format
Only one period should have is_active = true — multiple active periods breaks the generator
media_url values must be https:// URLs — blob: URLs are browser-only and will not render in Puppeteer
Use .maybeSingle() not .single() when a row may not exist — .single() throws on zero rows

Next.js

Wrap useSearchParams() / useParams() in <Suspense>
images.remotePatterns not images.domains

React

Functional state updates: setState(prev => ...)
Clean up blob URLs on unmount
Standard <img> for blob URLs, Next.js <Image> for remote

TypeScript

Index signatures on interfaces for Supabase responses
Array.isArray() before mapping Supabase joins
Default fallbacks: data || [], value || ''

Magazine Templates

All image frames use object-fit: cover with object-position: {focal_x}% {focal_y}%
Spread templates: render at 1580px viewport, clip to left (0–790) and right (790–1580) buffers
Single page templates: 790×1054px canvas
BleedMarks wrapper uses position:absolute, inset:-20px to escape overflow:hidden
Folio component takes season as a prop — do not use window._magazineSeason global
No body text may cross the center gutter on spreads — large display titles (≥40px) are exempt
New templates: see src/magazine/TEMPLATE_DESIGN_GUIDE.md for full workflow

Generator

Run with set -a && source .env.local && set +a && npm run generate-test
Requires SUPABASE_SERVICE_ROLE_KEY in .env.local — anon key alone is insufficient
networkidle0 in Puppeteer waits for all network requests including Google Fonts and image loads
PDF output goes to /tmp/magazine-{curatorId}-{periodId}.pdf — copy to project root to download
BlankPage is defined inline in generator.ts, not in a template file

Git / Codespaces

Always confirm branch with git branch before starting
Claude Code persistently claims "main does not exist" and uses feature branches — this is always wrong
After every Claude Code session: git fetch origin && git merge origin/claude/[branch] && git push origin main
Never use git clean -fd without first committing or stashing untracked files
After any session confirm with git log --oneline -3 that commits are on main


Magazine Pricing

Base price: $25.00 per curator edition
Each selected campaign: −$2.00 (shown live in curate interface)
Target page count: ~38–40 pages for 20 selections
Unit print cost target: ~$8–10 at Magcloud for 40-page full-color saddle-stitched


Testing
Playwright test suite

tests/contributor.spec.ts — Maya flows
tests/curator.spec.ts — Lena flows
tests/helpers/auth.ts — gitignored, must be recreated per Codespaces instance
21/23 tests pass (2 failing = known correct behavior)


Current Development Status
Completed ✅

Full dark neon UI redesign across all pages
Complete CSS variable system in globals.css
Fonts, grain overlay, registration marks in layout.tsx
All main pages: dashboard, curate, profile, collabs, collab submit, communicate, submit
IntegratedCollabsSection — all-period templates, city rows, star indicators
Communications — compose, read-only view, Withdraw button
Private collab invite — real Supabase search
City constant + profile city field + local collab join city selector
Seed data: Spring 2026 period, 3 templates, test users, content, comms, campaigns
Playwright test suite (21/23 passing)
Magazine template system — 18 active templates + BlankPage ✅
Selection logic: src/magazine/SELECTION_LOGIC.md ✅
Template index: src/magazine/templates/base/index.js ✅
Template design guide: src/magazine/TEMPLATE_DESIGN_GUIDE.md ✅
Focal point selector on /submit — UI + DB + content.ts wired ✅
content_entries: focal_x, focal_y, aspect_ratio columns in Supabase ✅
Magazine generation pipeline — fully operational ✅

generator.ts: Puppeteer + pdf-lib, reads Supabase, maps templates, outputs PDF
selectionLogic.ts: full decision tree matching SELECTION_LOGIC.md
types.ts: complete TypeScript interfaces
ImageFrame renders real images via media_url prop ✅
Folio season prop replaces window._magazineSeason global ✅
BlankPage inserted between Cover and FrontMatter for correct print imposition ✅
Gutter safety enforced on spread templates ✅
End-to-end smoke test passing with real images from Supabase storage ✅



Remaining / Known Issues ⚠️

Collab, campaign, and communications selections — Lena has no selections in these tables yet. Add seed data to test CollabSpread, CampaignPage, and CommunicationsPage templates rendering in the pipeline.
Music submission UI — add Spotify/Bandcamp URL field to /submit when content_type is Music. URL → QR code needed for MusicPage template.
User onboarding — no flow to set profile_type on new signup.
Local city data in curate collabs tab — city list should pull live from collab_participants grouped by city with real participant counts.
Curator magazine preview — browser preview route not yet built. Curators cannot preview their magazine before generation.
Print fulfillment integration — Magcloud manual first, Mixam API later.
@supabase/ssr migration — standing priority, touches most of src/lib/supabase/.
Magazine generation job tracking — pipeline writes to /tmp but does not record job status in magazine_generation_jobs table.
FrontMatter content_type display — shows raw DB value (e.g. writing) instead of display label (e.g. Essay). Needs normalization in generator.ts.


User Roles

Contributors: Submit content, join collaborations, send communications to curators
Curators: Select content for their personalized printed magazine
Users can be both. Three test accounts exist for development testing.
CLAUDE.md — online//offline
Last updated: June 2026

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

⚠️ Auth Package — COMPLETED MIGRATION
@supabase/auth-helpers-nextjs and @supabase/auth-helpers-shared have been fully removed from the codebase. The project now uses @supabase/ssr throughout. Do not reintroduce @supabase/auth-helpers-nextjs under any circumstances — it is incompatible with Next.js 16 and will cause a fatal server crash.

Current auth pattern:
- Browser/client components: createBrowserClient from @supabase/ssr via useSupabase() hook in src/lib/supabase/useSupabase.ts
- Middleware: createServerClient from @supabase/ssr with cookies API
- Auth callback: createServerClient from @supabase/ssr in src/app/auth/callback/route.ts
- All lib functions in src/lib/supabase/*.ts accept supabase as their first parameter — do not remove this pattern

⚠️ Branch Discipline
All work goes directly on main unless explicitly instructed otherwise. Always confirm with git branch before starting any work. After any session confirm with git log --oneline -3 that commits landed on main. If diverged: git fetch origin && git merge origin/claude/[branch-name] && git push origin HEAD:main.
Claude Code has a persistent pattern of claiming "main does not exist" and working on feature branches instead. This is always wrong. Main exists. Always merge feature branch work to main immediately after each session.
After committing, always push with: git push origin HEAD:main
Always sync Codespaces before starting work: git fetch origin && git pull origin main

⚠️ Browser Claude Code vs Codespace — VERIFY PUSHES LANDED
When Claude Code runs in the browser (separate cloud sandbox from your Codespace), it sometimes reports "pushed to main" when the push did not actually reach GitHub, OR the push succeeded but your local Codespace has not fetched it yet. Both have happened repeatedly.
After EVERY browser Claude Code session, verify from your Codespace:
  git fetch origin && git log origin/main --oneline -3
If the expected commit is NOT at the top of origin/main, the push did not land — go back to the browser session and re-push, or have it run `git ls-remote origin main` to confirm the remote hash.
If the commit IS on origin/main but your local main is behind, just run: git pull origin main
Do not conclude a commit is missing until you have run git fetch first.

⚠️ File Size / Stream Timeouts
Large files cause stream timeouts if rewritten in one pass. Always use targeted str_replace edits for changes to large files. Never rewrite an entire large file in one tool call.

⚠️ Vercel Deployment
- Production branch must be set to main in Vercel Project Settings → Git
- After pushing to main, wait for Vercel build to complete before testing
- Hard-refresh (Cmd+Shift+R) after a deploy — the old build caches in the browser
- Confirm the build chunk filenames change between deployments — if they don't, the build is cached and not picking up new code
- Force a cache-free redeploy via Vercel dashboard → Redeploy → uncheck "Use existing build cache" if needed

Project Structure
src/
├── app/
│   ├── admin/
│   │   ├── page.tsx                  # Curator list — admin only ✅
│   │   └── preview/
│   │       └── [curatorId]/
│   │           └── page.tsx          # Magazine preview — admin only ✅
│   ├── api/
│   │   └── admin/
│   │       └── preview/
│   │           └── [curatorId]/
│   │               └── route.ts      # Data + HTML assembly for preview iframes ✅
│   ├── auth/
│   │   └── callback/
│   │       └── route.ts              # Email confirmation callback — uses @supabase/ssr ✅
│   ├── collabs/
│   │   ├── page.tsx                  # Collab library — browse + join + "create your own" CTA ✅
│   │   ├── create/
│   │   │   └── page.tsx              # Create user-created private collab (name/description/prompt) ✅
│   │   └── [id]/
│   │       ├── invite/
│   │       │   └── page.tsx          # Full-page invite + participant roster (lead/member aware) ✅
│   │       └── submit/
│   │           └── page.tsx          # Collab submission page ✅
│   ├── communicate/
│   │   ├── new/
│   │   │   └── page.tsx              # Re-exports [id]/page.tsx
│   │   └── [id]/
│   │       └── page.tsx              # Compose + send + read-only view ✅
│   ├── curate/
│   │   └── page.tsx                  # Curator magazine selection interface ✅
│   ├── dashboard/
│   │   └── page.tsx                  # Main user hub — collab accept/decline + invite affordance ✅
│   ├── onboarding/
│   │   └── page.tsx                  # 3-step onboarding flow ✅
│   ├── profile/
│   │   └── page.tsx                  # User profile + privacy settings ✅
│   └── submit/
│       └── page.tsx                  # Content submission form ✅
├── components/
│   ├── IntegratedCollabsSection.tsx   # Curate collabs tab — incl. user-created private collabs ✅
│   ├── SubmissionForm.tsx             # Focal point selector included ✅
│   ├── auth/
│   ├── layout/
│   └── ui/
├── lib/
│   ├── constants/
│   │   └── cities.ts                 # Single source of truth for city list ✅
│   └── supabase/
│       ├── client.ts                 # createBrowserClient wrapper ✅
│       ├── useSupabase.ts            # useSupabase() hook — use in all client components ✅
│       ├── collabLibrary.ts          # getCitiesWithParticipantCounts returns Record<template_id, cities[]> ✅
│       ├── collabs.ts                # find-or-create join, getUserCollabs, accepted-only counts ✅
│       ├── communications.ts
│       ├── content.ts                # focal_x, focal_y, aspect_ratio wired ✅
│       ├── curation.ts
│       ├── profiles.ts
│       └── subscriptions.ts
├── magazine/                          # Magazine generation system ✅ COMPLETE
│   ├── core/
│   │   ├── primitives.jsx
│   │   ├── generator.ts               # ✅ Puppeteer pipeline — fully operational
│   │   ├── selectionLogic.ts          # ✅ Template selection decision tree
│   │   └── types.ts                   # ✅ Full TypeScript interfaces
│   ├── templates/
│   │   └── base/
│   │       ├── index.js
│   │       ├── templates-1-4.jsx
│   │       ├── templates-5-8.jsx
│   │       ├── templates-9-11.jsx
│   │       ├── templates-12-17.jsx
│   │       ├── templates-18-19.jsx
│   │       └── templates-20-24.jsx
│   ├── SELECTION_LOGIC.md
│   └── TEMPLATE_DESIGN_GUIDE.md
├── middleware.ts                      # Route guard — onboarding redirect + admin protection ✅
├── scripts/
│   ├── seed.ts
│   ├── seed.sql
│   ├── seed.README.md
│   └── test-generator.ts
└── _design/
    ├── DESIGN_BRIEF.md
    ├── dashboard-final-v2.html
    ├── curate-page-v4.html
    ├── curate-collabs-mockup-v6.html
    ├── submit-redesign-v3.html
    └── collab-submit-mockup.html
† Deprecated — retained for reference only. Not used in generation pipeline.

Database Schema (Key Tables)
Users
profiles (id, first_name, last_name, avatar_url, identity_banner_url, content_type, is_public, bio, city, bank_info, curator_payment_info, address_line1, address_line2, address_city, address_state, address_zip)
-- identity_banner_url: separate from avatar_url, used as full-width card banner in curate interface
-- content_type: 'photography' | 'art' | 'poetry' | 'essay' — Music is NOT a valid content type
-- city: text field, values from CITIES constant in src/lib/constants/cities.ts
-- address_line1/2, address_city, address_state, address_zip: structured mailing address — added May 2026
-- address_line1 non-empty = address on file (used for curate gate check)

profile_types (profile_id, type)   -- 'contributor' | 'curator' | 'admin'
-- Roles are add-only — never remove a role programmatically
-- New users get no rows until onboarding is complete
-- Middleware redirects to /onboarding if authenticated user has zero rows here
-- 'admin' role assigned via SQL only — no UI for this
-- check constraint updated May 2026 to include 'admin'

profile_connections (follower_id, followed_id, status, relationship_type)
subscriptions (subscriber_id, creator_id, status)

Periods (Quarterly)
periods (id, name, season, year, start_date, end_date, is_active, volume, issue)
-- Current active period: Spring 2026 (id: aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa)
-- Only one period should have is_active = true at a time
-- volume (text) and issue (integer) added — read dynamically by generator + admin preview
-- end_date drives the collab invite deadline gate — see Collab System below
-- ⚠️ If end_date is in the past, submissions and collab invites are closed. To keep
--    testing, extend it: UPDATE periods SET end_date = '<future>' WHERE is_active = true;

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
collabs (id, title, type, is_private, participation_mode, location, template_id, period_id, metadata, description, is_user_created, prompt_text)
-- type: 'chain' | 'theme' | 'narrative'
-- participation_mode: 'community' | 'local' | 'private'
-- Always prefer participation_mode over is_private (legacy)
-- period_id is always set from periods WHERE is_active = true on creation
-- template_id is written directly to the column, not just metadata
-- template_id is NULL for user-created collabs
-- is_user_created (boolean, default false): true for contributor-created private collabs
-- prompt_text (text): contributor-facing brief for user-created collabs
--   Three-field model for user-created collabs: title (name) + description (public
--   sub-description) + prompt_text (contributor brief). Mirrors seeded collab_templates
--   which use name + display_text + instructions.

collab_participants (id, collab_id, profile_id, role, status, participation_mode, city, location, invited_by, invite_status)
-- city is preferred over location for local collabs
-- A city appears in the curate UI as soon as status = 'active' — no submission required
-- role: 'lead' | 'member' | 'organizer' — check constraint updated to include 'lead'
--   Private collabs: first active participant on a collab row becomes 'lead', rest 'member'
--   Only the lead can invite; members get read-only roster view
-- invited_by (uuid → profiles.id, nullable): set when a participant was invited
-- invite_status: 'pending' | 'accepted' | 'declined' (default 'accepted')
--   Lead is auto-'accepted'. Invitees start 'pending'. Decline sets 'declined' (soft).
--   PARTICIPANT COUNTS everywhere must filter to accepted-only:
--     invite_status IS NULL OR invite_status = 'accepted' (null = community/local, still counts)
--   Declined and pending are NOT counted on dashboard or curate.

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

-- IMPORTANT: curate page loads selections from DB on mount, NOT from localStorage
-- localStorage key is magazine_selections_{user_id} (user-scoped) — do not use unscoped key

Magazine Generation
magazine_templates (id, name, type, description, file_path, frame_mapping, is_active)
magazine_generation_jobs (id, curator_id, period_id, status, mapping_data, output_path, error_log)
magazine_pages (id, generation_job_id, page_number, template_id, content_mapping, status)

RLS Policies — Critical
profile_types table has RLS enabled. Required policies:
  - "Users can read own profile_types": FOR SELECT USING (auth.uid() = profile_id)
  - "Users can insert own profile_types": FOR INSERT WITH CHECK (auth.uid() = profile_id)
  - "Authenticated users can read all profile_types": FOR SELECT TO authenticated USING (true)
    ← added for the collab invite contributor search (needs to read others' roles).
    Safe: profile_types only holds role labels, nothing sensitive.
If middleware incorrectly redirects authenticated users to /onboarding, check these policies first.

profiles table has RLS enabled. Relevant policy for collab invite search:
  - "Public profiles are viewable by authenticated users":
    FOR SELECT TO authenticated USING (is_public = true OR id = auth.uid())
    ← lets the invite search read other public contributors. Private profiles stay hidden.

Onboarding Flow
Route: /onboarding
Guard: middleware.ts redirects any authenticated user with zero profile_types rows to /onboarding
Exempt routes: /onboarding, /auth/*, /api/*, /_next/*, /favicon.ico, /admin/*

Flow:
  Step 1: First name + last name (both required)
  Step 2: Role selection (Contributor / Curator / Both) + content type if contributor
  Step 3: Confirmation + "Enter online//offline →" press mechanic button

DB writes on step 3 press (not incrementally):
  - profiles: upsert first_name, last_name, content_type (nullable)
  - profile_types: insert one or two rows (contributor / curator)
  - Use .maybeSingle() guard to avoid duplicate inserts

Redirect after onboarding:
  - Contributor only → /submit
  - Curator only → /curate
  - Both → /submit

IMPORTANT: Use window.location.href (not router.push) for the post-onboarding redirect.
This forces a full browser navigation, ensuring the session cookie is sent with the
next request before middleware runs. router.push causes a race condition where middleware
fires before the session is established.

Curate Page — Address Gate
- Selections always save to DB regardless of address
- If address_line1 is missing, show a persistent terracotta banner below the stats bar
- Banner: "Add your mailing address to receive your printed edition →" linking to /profile
- Banner is dismissible per session (not permanently)
- hasAddress check: !!profile.address_line1

Collaboration System — Full Behavior
Three Participation Modes
- Private — invite-only, 8–10 max. Has a designated lead who controls invitations.
- Community — open globally
- Local — city-specific, uses city field from collab_participants

Two kinds of private collab:
- Seeded/library private collab — has a template_id (e.g. "The Long Way Round").
  First active participant to join becomes the lead (role = 'lead'), rest are members.
- User-created private collab — is_user_created = true, template_id = NULL.
  Created at /collabs/create with three fields: name → title, description, prompt_text.
  Creator is inserted as role = 'lead', invite_status = 'accepted', status = 'active'.

Lead / invite mechanics:
- Only the lead can invite contributors, up to the 8–10 cap, until the period end_date.
- Invite happens at the full-page /collabs/[id]/invite (NOT a modal — the old modal was removed).
- Lead reaches the invite page via a small "invite" affordance on the private collab row
  in the dashboard Collaborations list. The main row tap still routes one-tap to content;
  the × dismiss still works (stopPropagation on both the affordance and ×).
- Members see a "participants" affordance instead → same page, read-only roster, no invite controls.
- After end_date: invite page shows a read-only "invitations closed" banner; roster still visible.

Invite → accept/decline flow:
- Inviting a contributor inserts a collab_participants row: role 'member', status 'active',
  invite_status 'pending', invited_by = lead id.
- Invited contributors see the collab on their dashboard as a PENDING INVITATION (distinct
  treatment, "invited" badge, Accept / Decline buttons — does NOT route to content on tap).
- Accept → invite_status 'accepted' (status 'active'); item transitions in place to a normal
  active collab (list re-fetched, no navigation).
- Decline → invite_status 'declined' (soft); collab disappears from the invitee's list and is
  not re-surfaced. Lead sees a "declined" badge (terracotta) on the invite page roster.
- getUserCollabs filters OUT declined rows and flags pending rows with isPendingInvite = true.

Participant fetch pattern (IMPORTANT):
- collab_participants has TWO foreign keys to profiles (profile_id and invited_by).
- A PostgREST embed like profiles(...) fails with PGRST201 (ambiguous relationship).
- ALWAYS use a two-step fetch: query collab_participants for scalar columns, then query
  profiles separately with .in('id', profileIds) and merge in JS. Never use the embed.

IntegratedCollabsSection — Curate Collabs Tab ✅
- Shows ALL templates active for current period
- ★ you contribute badge in amber on templates curator participates in
- Every option is an independent toggle — no internal slot cap
- Community = one row per template
- Local = collapsible section, one row per city with active participants only
- LOCAL row hidden entirely when no cities have active participants (matches Private behavior)
- Private (seeded) = one row, only shown if curator has joined
- User-created private collabs (template_id = NULL) render in their own section AFTER the
  template loop — the template loop matches c.template_id === templateId, so null-template
  collabs would otherwise fall through and never appear. Do not change seeded grouping.
- getCitiesWithParticipantCounts returns Record<template_id, {city, count}[]>
  grouped by template — cities are scoped per template, not shown globally
- All participant counts here filter to accepted-only (invite_status null or 'accepted').

Email Confirmation ✅ COMPLETE
- Email confirmation is ENABLED in Supabase Auth settings ✅
- Custom SMTP configured via Resend — bypasses Supabase rate limits entirely ✅
- Resend domain: onlineoffline.online — DNS verified ✅
- SMTP settings in Supabase Auth → Email:
  - Host: smtp.resend.com
  - Port: 465
  - Username: resend
  - Sender email: noreply@onlineoffline.online
  - Sender name: online//offline
- Confirmation link routes through /auth/callback which uses @supabase/ssr ✅
- Full signup → confirm → onboarding → destination flow tested and working ✅
- Supabase is on Pro plan — rate limits adjustable, but moot with custom SMTP

Admin Magazine Preview ✅ COMPLETE
Route: /admin (curator list) + /admin/preview/[curatorId] (page-by-page preview)
Protected: middleware redirects non-admins to /dashboard, unauthenticated to /auth
API: /api/admin/preview/[curatorId] — uses SUPABASE_SERVICE_ROLE_KEY to bypass RLS

Admin role assignment (SQL only — no UI):
  ALTER TABLE profile_types DROP CONSTRAINT profile_types_type_check;
  ALTER TABLE profile_types ADD CONSTRAINT profile_types_type_check
    CHECK (type IN ('contributor', 'curator', 'admin'));
  INSERT INTO profile_types (profile_id, type) VALUES ('<uuid>', 'admin') ON CONFLICT DO NOTHING;

How the preview works:
- /admin lists all curators with creator selections for the active period
- Clicking a curator calls /api/admin/preview/[curatorId]
- API assembles magazine data (mirrors generator.ts logic) using service role key
- API runs selectionLogic.ts to assign templates, builds self-contained HTML per page
- Preview page renders each page in a sandboxed iframe at print dimensions (scaled 50%)
- Single pages: 790×1054px canvas scaled to 395×527px display
- Spreads: 1580×1054px canvas scaled to 790×527px display
- Read-only — no actions, no generate button

Editorial corrections via SQL (when preview shows crop problems):
  UPDATE content_entries SET focal_x = <0–100>, focal_y = <0–100> WHERE id = '<entry-id>';
  Then re-preview to verify before sending to print.

Magazine Generation System
Status: ✅ FULLY OPERATIONAL
The pipeline runs end-to-end with real images. To generate a test magazine:
set -a && source .env.local && set +a && npm run generate-test

Page Sequence
Page 1:  CoverA
Page 2:  BlankPage (dark, empty — left side of FrontMatter spread)
Page 3:  FrontMatter (TOC + curator name)
Page 4+: Content pages (photography → art → essay → poetry → collabs → comms → campaigns)
Last:    ColophonPage

Active Templates (18 total including BlankPage)
Template              File                Pages  Trigger
CoverA                templates-1-4       1      Always — page 1
BlankPage             inline generator    1      Always — page 2
FrontMatter           templates-20-24     1      Always — page 3
SpreadPanorama        templates-18-19     2      1 image, caption ≤50 words
Spread                templates-9-11      2      1 image, caption >50 words
Spread2               templates-12-17     2      2 images
Spread4               templates-12-17     2      3–4 images
SpreadMosaic          templates-18-19     2      5–6 images, light background
Spread6               templates-12-17     2      7–8 images, dark image-dominant
TextSubmission        templates-5-8       1      Essay ≤500 words
TextSpread            templates-12-17     2      Essay 501–1800 words
PoetryPage            templates-20-24     1      Auto-detected poetry
CollabSpreadCommunity templates-20-24     2      Collab, mode=community
CollabSpreadLocal     templates-20-24     2      Collab, mode=local
CollabSpreadPrivate   templates-20-24     2      Collab, mode=private
CommunicationsPage    templates-9-11      1      Always if include_communications=true
CampaignPage          templates-9-11      1      One per selected campaign
ColophonPage          templates-12-17     1      Always — last page

Deprecated Templates (not used in pipeline)
SinglePhoto, MultiPhoto2Stacked, MultiPhoto2SideBySide, MultiPhoto4Feature,
MultiPhoto4Grid, CollabPage, MusicPage

Key Design Constants (primitives.jsx)
W=768, H=1032, BLEED=11
AW=790, AH=1054
ML=58, MR=58, MT=56, MB=56
LIVEW=652

Colors: C.ground=#252119, C.paper=#f0ebe2,
        C.terra=#e05a28 (identity/action),
        C.gold=#e8a020 (structure/warmth)
Fonts:  F.serif=Instrument Serif, F.sans=Instrument Sans, F.mono=Courier Prime

Running the Generator
set -a && source .env.local && set +a && npm run generate-test
Requires SUPABASE_SERVICE_ROLE_KEY — anon key alone is insufficient
PDF output goes to /tmp only — never copy to working directory

Design System
Philosophy
Every UI element participates in the neon color system or recedes into the warm dark.
Nothing is neutral gray. Nothing is pure white. Nothing is default blue.
The aesthetic: a print shop at dusk, proof light tables, letterpress type, registration marks, neon-lit darkrooms.

⚠️ Page Background — STANDARDIZED ON --lt-bg
All page roots, content columns, AND sticky headers/footers use --lt-bg (#0f0e0b) — the deep
near-black, same as the curate proof-light-table surface. Earlier the dashboard and other pages
used the lighter --ground (#252119) as their page background; this was changed app-wide.
- Page root background → --lt-bg (never --ground)
- Inner content column background → --lt-bg
- Sticky headers / sticky footers → --lt-bg
- Cards, icon containers, inputs, section surfaces → still use --ground / --ground-3 etc.
  (these are meant to sit ON the dark background and must NOT be flattened to --lt-bg)

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

/* Curate / proof light table (darker ground) — also the app-wide page background */
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
Invite (accepted) badge          --neon-green
Invite (pending) badge           --paper-4 (muted, no neon)
Invite (declined) badge          --neon-accent (terracotta)
"invited" badge (pending invite) --neon-amber / --neon-purple

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

Profile Page — Structure (updated May 2026)
Section order (mobile-first):
1. IDENTITY — avatar, first/last name, city, bio, identity banner
2. YOUR ROLES — role cards (add-only, no removal), content type selector for contributors
3. MAILING ADDRESS — 5 structured fields (address_line1/2/city/state/zip), ON FILE indicator
4. PAYMENT DETAILS — placeholder cards (Stripe integration pending)
5. SAVE — press mechanic, full width

Input style throughout profile page:
background: transparent; border: none;
border-bottom: 1px solid var(--rule-mid); border-radius: 0;
padding: 12px 0; font-size: 15px; color: var(--paper); width: 100%;
On focus: border-bottom: 1px solid var(--paper-3)
Side-by-side pairs: display: flex; gap: 12px — each child flex: 1; min-width: 0

City List
Defined in src/lib/constants/cities.ts as CITIES array:
Atlanta, Austin, Boston, Chicago, Dallas, Denver, Houston, Los Angeles,
Miami, Nashville, New Orleans, New York, Pensacola, Philadelphia, Phoenix,
Portland, San Antonio, San Diego, San Francisco, Seattle

Seed Data
Test Auth Users
Email                       UUID                                    Name            Role
contributor1@test.com       0889833d-d56a-4969-83b4-43c9585bcd92   Maya Torres     contributor
contributor2@test.com       402f2415-65c1-4efa-a95e-c0ccb38f7048   Daniel Osei     contributor
curator1@test.com           185f8c7c-9837-425a-ac1c-ebf18d1af1b9   Lena Vasquez    curator
-- Plus ~20 additional seeded contributor profiles (Sarah Chen, James Wilson, etc.)
--   used for testing the collab invite contributor search. Most are is_public = true.

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

Cleaning up test collabs
User-created test collabs accumulate fast during testing. To wipe them (order matters — FKs):
  DELETE FROM collab_participants WHERE collab_id IN (SELECT id FROM collabs WHERE is_user_created = true);
  DELETE FROM curator_collab_selections WHERE collab_id IN (SELECT id FROM collabs WHERE is_user_created = true);
  DELETE FROM collab_submissions WHERE collab_id IN (SELECT id FROM collabs WHERE is_user_created = true);
  DELETE FROM collabs WHERE is_user_created = true;

Key Gotchas & Hard-Won Lessons

### Auth / Supabase
- NEVER use @supabase/auth-helpers-nextjs — it is removed and will crash the server on Next.js 16
- Use @supabase/ssr exclusively: createBrowserClient for client components, createServerClient for middleware/server
- All lib functions take supabase as their first parameter — this is intentional, do not revert
- Use .maybeSingle() not .single() when a row may not exist
- RLS on profile_types requires both SELECT and INSERT policies for authenticated users,
  PLUS the "Authenticated users can read all profile_types" policy for the invite search
- RLS on profiles needs "Public profiles viewable by authenticated users" for the invite search
- Supabase session cookie name: sb-cbdiujvqpirrvzodfujm-auth-token (array format, token at index [0])
- Middleware reads this cookie — if format changes, middleware breaks

### User Deletion (test accounts)
- Supabase dashboard delete will fail with "Database error deleting user"
  if dependent rows exist in other tables
- Always run SQL cleanup first, then delete from Authentication → Users in dashboard
- Full foreign key chain must be deleted in this order:

DO $$
DECLARE uid uuid := 'paste-uuid-here';
BEGIN
  DELETE FROM curator_communication_selections WHERE curator_id = uid;
  DELETE FROM curator_campaign_selections WHERE curator_id = uid;
  DELETE FROM curator_collab_selections WHERE curator_id = uid;
  DELETE FROM curator_creator_selections WHERE curator_id = uid OR creator_id = uid;
  DELETE FROM communications WHERE sender_id = uid OR recipient_id = uid;
  DELETE FROM collab_participants WHERE profile_id = uid;
  DELETE FROM collab_submissions WHERE contributor_id = uid;
  DELETE FROM content_entries WHERE content_id IN (SELECT id FROM content WHERE creator_id = uid);
  DELETE FROM content WHERE creator_id = uid;
  DELETE FROM subscriptions WHERE subscriber_id = uid OR creator_id = uid;
  DELETE FROM profile_connections WHERE follower_id = uid OR followed_id = uid;
  DELETE FROM profile_types WHERE profile_id = uid;
  DELETE FROM profiles WHERE id = uid;
END $$;

### Collabs
- Join flow uses find-or-create — never inserts a new collabs row if one already
  exists for that template_id + participation_mode + city + period_id
- First active participant on a PRIVATE collab row becomes role = 'lead'; rest are 'member'.
  Only applies to private — never lead-stamp community/local joins.
- period_id is always set from periods WHERE is_active = true on collab creation
- template_id is written directly to the collabs column, not just metadata; NULL for user-created
- collab_participants has TWO FKs to profiles (profile_id, invited_by) → never use a PostgREST
  embed for participant+profile (PGRST201). Two-step fetch + merge in JS, always.
- Participant counts everywhere filter to accepted-only: invite_status IS NULL OR = 'accepted'
- Invite controls only for the lead, only before period.end_date. Members get read-only roster.
- Invitee accept/decline lives on the dashboard; declined rows are soft (kept) and hidden from
  the invitee's list; lead sees declined badge on the invite page.
- Cities in curate Local section only appear when a contributor has joined (status = 'active')
- LOCAL row hidden entirely when no active city participants exist for that template
- Deleting collabs requires clearing curator_collab_selections and collab_submissions first
- When bulk-deleting bad collab rows, order matters:
  1. DELETE FROM curator_collab_selections WHERE collab_id IN (...)
  2. DELETE FROM collab_submissions WHERE collab_id IN (...)
  3. DELETE FROM collab_participants WHERE collab_id IN (...)
  4. DELETE FROM collabs WHERE ...

### Design
- Never mix border shorthand with borderBottom/borderBottomWidth on same element
- Never use lucide-react — inline SVGs only
- Music is NOT a content type — remove it wherever it appears
- Page backgrounds (root, content column, sticky header/footer) use --lt-bg, not --ground

### Database
- collab_templates uses name not title
- collab_submissions uses caption not content
- Always prefer participation_mode over is_private
- discount on campaigns is int4 not text
- Only one period should have is_active = true
- periods has volume (text) and issue (integer) — read dynamically, not hardcoded
- If the active period end_date is in the past, submissions and collab invites close.
  Extend it for testing: UPDATE periods SET end_date = '<future>' WHERE is_active = true;
- media_url must be https:// — blob: URLs will not render in Puppeteer
- profiles table has structured address fields: address_line1/2/city/state/zip (added May 2026)
- There is NO single 'address' column — always use the five structured fields
- hasAddress check: !!profile.address_line1
- profile_types accepts 'admin' role in addition to 'contributor' and 'curator' — assign via SQL only, no UI
- collab_participants.role accepts 'lead' in addition to 'member' and 'organizer'
- collab_participants.invite_status: 'pending' | 'accepted' | 'declined'

### Admin
- Admin role assigned via SQL only — see "Admin Magazine Preview" section above for full SQL
- /admin and /admin/* are middleware-protected: non-admins → /dashboard, unauthenticated → /auth
- API route /api/admin/preview/[curatorId] requires SUPABASE_SERVICE_ROLE_KEY in Vercel env vars
- SUPABASE_SERVICE_ROLE_KEY must be the service_role key from Supabase Settings → API, not the anon key
  (a wrong/anon key gives "Invalid API key" in the function logs)
- Focal point corrections when preview shows bad crops:
  UPDATE content_entries SET focal_x = <0–100>, focal_y = <0–100> WHERE id = '<entry-id>';
  Then re-preview to verify before sending to print.

### Onboarding
- window.location.href for post-onboarding redirect — NOT router.push (causes race condition with middleware)
- profile_types insert must use .maybeSingle() guard to prevent duplicate rows
- All DB writes happen on step 3 press, not incrementally
- Middleware exempts: /onboarding, /auth/*, /api/*, /_next/*, /favicon.ico, /admin/*

### Curate Page
- Selections load from DB on mount — NOT from localStorage
- localStorage key is magazine_selections_{user_id} (user-scoped)
- Address gate: warns but never blocks saves
- hasAddress: !!profile.address_line1

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
- volume/issue read dynamically from the active period (no longer hardcoded)

### Git / Codespaces
- Always sync before starting: git fetch origin && git pull origin main
- Always confirm branch with git branch before starting
- Claude Code persistently claims "main does not exist" — this is always wrong
- After every Claude Code session: git fetch origin && git merge origin/claude/[branch] && git push origin HEAD:main
- Confirm with git log --oneline -3 that commits are on origin/main
- ⚠️ Browser Claude Code runs in a separate sandbox. After every browser session verify the
  push landed: git fetch origin && git log origin/main --oneline -3. If the commit isn't on
  origin/main, the push didn't land — re-push. If origin has it but local is behind, git pull.
  Do not conclude a commit is missing until you've run git fetch.
- Vercel production branch must be set to main in Project Settings → Git

### Repository Hygiene
- Never commit PDF files — generated PDFs go to /tmp only
- Never commit files over 50MB under any circumstances
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
- Page backgrounds standardized on --lt-bg app-wide (root, content column, sticky header/footer)
- All main pages: dashboard, curate, profile, collabs, collab submit, communicate, submit
- Magazine template system — 18 active templates (17 + BlankPage)
- Magazine generation pipeline — fully operational with real images
- FrontMatter TOC with correct content_type display
- Focal point selector on /submit
- Playwright test suite (21/23 passing)
- Music removed as content type (product decision)
- @supabase/auth-helpers-nextjs fully removed — migrated to @supabase/ssr ✅
- User onboarding flow — 3 steps, middleware guard, DB writes ✅
- Curate address gate — warns but never blocks, persistent banner ✅
- Profile page restructured — 5 sections, structured address fields, mobile-first ✅
- Structured mailing address fields added to profiles table ✅
- Curate selections load from DB (not localStorage), user-scoped localStorage ✅
- Email confirmation enabled + custom SMTP via Resend configured ✅
- onlineoffline.online domain verified in Resend, DNS records live ✅
- Full signup → confirm → onboarding → destination flow tested end-to-end ✅
- Local city data in curate collabs tab — live from DB, grouped by template ✅
- Admin magazine preview — /admin + /admin/preview/[curatorId], admin-role protected ✅
- profile_types check constraint updated to include 'admin' role ✅
- SUPABASE_SERVICE_ROLE_KEY added to Vercel environment variables ✅
- Volume/issue dynamic — volume & issue fields on periods, read by generator + admin preview ✅
- User-created private collabs — /collabs/create (name/description/prompt), is_user_created flag ✅
- Private collab lead system — first joiner becomes lead (seeded) / creator is lead (user-created) ✅
- Full-page invite flow — /collabs/[id]/invite, contributor search, roster with status badges ✅
- Invite contributor search — RLS policies on profiles + profile_types, two-step fetch ✅
- Accept/decline invitation flow — pending invites surface on dashboard, accept/decline in place ✅
- Accepted-only participant counts everywhere (pending & declined excluded) ✅
- Invite deadline gate — invites close after period end_date, read-only roster after ✅
- Dashboard private-collab affordance — lead sees "invite", member sees "participants" ✅
- User-created private collabs appear in curate collabs tab (own section, null template_id) ✅

Remaining / Known Issues ⚠️
1. Print fulfillment integration — Magcloud manual first, Mixam API later.
2. Magazine generation job tracking — pipeline writes to /tmp but does not record in magazine_generation_jobs table.
3. Stripe integration — payment collection from curators not yet built. Profile page shows placeholder.
4. Subscription cancellation UI — blocked on Stripe integration.
5. Playwright test suite — needs update to cover onboarding, profile structure, and the full collab invite/accept flow.
6. Period rollover — no admin mechanism to close one period and open the next (close Spring 2026, open Summer 2026). Currently done via SQL. Ties into volume/issue dynamic.
7. Debug console.log statements remain in the collab invite/search/create code paths — remove before launch.
8. Content empty-state card — clicking the empty Content tile should route directly to /submit (like the populated state); the separate "Submit work this season" row is redundant in the empty state. Not yet changed.

User Roles
- Contributors: Submit content, join collaborations, create private collabs, invite others, send communications to curators
- Curators: Select content for their personalized printed magazine
- Admins: Review magazine previews before sending to print — assigned via SQL only
- Users can be contributor + curator simultaneously
- Roles are add-only — no programmatic role removal
- Three primary test accounts + ~20 seeded contributor profiles exist for development testing

Product Decisions

Music is not a content type. Musicians participate through Photography, Art, Essay, and Poetry. The artifact must stand alone in print. No QR codes. Sheet music and lyrics submit as Art or Poetry.

Roles are add-only. If a user wants to stop contributing or curating, they simply stop. No role removal UI needed. For edge cases, handle via Supabase directly.

Subscription cancellation. Curators will eventually be able to cancel their subscription via the profile page. This requires Stripe integration first. Until then, handle cancellation requests manually via email.

Mailing address is required to receive a printed edition but is NOT required to save curate selections. The address gate warns persistently but never blocks.

Curators do not get a magazine preview. The surprise of receiving the physical copy is intentional and core to the experience. The /admin preview is for the editor only, to review before sending to print.

Private collabs have one lead. For seeded/library private collabs the first joiner becomes lead; for user-created collabs the creator is lead. Only the lead can invite, up to the 8–10 cap, until the submission deadline. Invitees accept or decline from their dashboard; declined is tracked softly so the lead can see it.
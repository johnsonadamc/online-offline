CLAUDE.md — online//offline
Last updated: September 2026

Project Vision
online//offline is "slowcial media" — the antithesis of dopamine-driven social platforms. Contributors submit creative work (photos, art, poetry, and essays) quarterly. Curators select what goes into their personalized printed magazines. The physical magazine is the product. The app is the infrastructure that makes it possible.
The philosophy: deliberate pace, thoughtful curation, real-world creative collaboration, and a beautiful printed artifact as the payoff. The app should feel calm and purposeful, not stimulating.

Tech Stack

Framework: Next.js 16 (App Router)
Database + Auth + Storage: Supabase
UI: Tailwind CSS + shadcn/ui (shadcn retired in Design System v2 Phase 13 — see below)
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

⚠️ Branch Discipline — READ THIS EVERY SESSION
All work goes directly on main unless explicitly instructed otherwise. Always confirm with git branch before starting any work. After any session confirm with git log --oneline -3 that commits landed on main.

Claude Code has a persistent pattern of:
  (a) claiming "main does not exist" and working on feature branches — this is ALWAYS wrong, main exists
  (b) developing on a session-config branch (e.g. claude/some-branch-name) instead of main — when this happens, switch to main: git checkout main && git pull origin main, then proceed
  (c) reporting "pushed to main" when the push did NOT land — ALWAYS independently verify

VERIFICATION RITUAL (do this from Codespaces after every Claude Code session):
  git fetch origin && git log origin/main --oneline -3
If the expected commit is NOT at the top of origin/main, the push did not land. Do not test until confirmed.
Then sync local: git pull origin main

If Claude Code worked on a feature branch:
  git fetch origin && git merge origin/claude/[branch-name] && git push origin HEAD:main

⚠️ Claude Code (browser) runs in its own isolated cloud sandbox, separate from your Codespace.
"Pushed to main" from that sandbox does not guarantee the commit reached GitHub — and your Codespace
will not see it until you run git fetch. ALWAYS git fetch origin before concluding a commit is missing.
Many false alarms have been just a stale local view. The sandbox also cannot run Puppeteer or reach the
CDN the generator loads — Claude Code verifies generator changes by simulation; the real run is in Codespaces.

⚠️ MCP push hazard: Claude Code sometimes pushes via GitHub MCP tools and occasionally sends only a
file header instead of full content, corrupting a file on remote (caused a Vercel "Property 'default'
is missing" build failure once). If a build fails right after an MCP push, check the file is complete;
if corrupted, restore from last good commit (git checkout <hash> -- <path>) and re-apply cleanly.

⚠️ File Size / Stream Timeouts
Large files cause stream timeouts if rewritten in one pass. Always use targeted str_replace edits for changes to large files. Never rewrite an entire large file in one tool call.

⚠️ Vercel Deployment
- Production branch must be set to main in Vercel Project Settings → Git
- After pushing to main, wait for Vercel build to complete before testing
- Hard-refresh the browser (Cmd+Shift+R) after a deploy — the old build caches
- Confirm the build chunk filenames change between deployments — if they don't, the build is cached
- Force a cache-free redeploy via Vercel dashboard → Redeploy → uncheck "Use existing build cache"
- ⚠️ All server-side env vars used by code MUST be set in Vercel → Settings → Environment Variables.
  SUPABASE_SERVICE_ROLE_KEY lives in .env.local locally but must be added to Vercel separately, or any
  route using it throws "supabaseKey is required" (missing) / "Invalid API key" (wrong key or whitespace
  or anon key pasted) in production. Paste the service_role key, no whitespace, then redeploy.
- TypeScript errors fail the Vercel build even when the code compiles — always update the type when adding
  a field to a query/sort (e.g. ContentEntry.order_index).

Project Structure
src/
├── app/
│   ├── admin/page.tsx                # Curator list — admin only ✅
│   ├── admin/preview/[curatorId]/page.tsx       # Magazine preview — admin only ✅
│   ├── api/admin/preview/[curatorId]/route.ts   # Data + HTML assembly for preview iframes ✅
│   ├── auth/callback/route.ts        # Email confirmation callback — uses @supabase/ssr ✅
│   ├── collabs/page.tsx              # Collab library — browse + join ✅
│   ├── collabs/create/page.tsx       # Create user-created private collab (3 fields) ✅
│   ├── collabs/[id]/invite/page.tsx  # Full-page invite + participant roster ✅
│   ├── collabs/[id]/submit/page.tsx  # Collab submission page ✅
│   ├── communicate/new/page.tsx      # Re-exports [id]/page.tsx
│   ├── communicate/[id]/page.tsx     # Compose + send + read-only view ✅
│   ├── curate/page.tsx               # Curator magazine selection interface ✅
│   ├── dashboard/page.tsx            # Main user hub ✅
│   ├── onboarding/page.tsx           # 3-step onboarding flow ✅
│   ├── profile/page.tsx              # User profile + privacy settings ✅
│   ├── submit/page.tsx               # Content submission form ✅
│   └── page.tsx                      # Auth / sign-in / sign-up (the home route) ✅
├── components/
│   ├── IntegratedCollabsSection.tsx   # Curate collabs tab ✅
│   ├── SubmissionForm.tsx             # Focal point selector included ✅
│   ├── v2/                            # Design System v2 primitives (built in redesign Phase 0)
│   ├── auth/  layout/  ui/            # ui/ = shadcn, retired in redesign Phase 13
├── lib/
│   ├── constants/cities.ts           # Single source of truth for city list ✅
│   └── supabase/
│       ├── client.ts  useSupabase.ts  collabLibrary.ts
│       ├── collabs.ts                # find-or-create join, getUserCollabs (counts/invites) ✅
│       ├── communications.ts  content.ts  curation.ts  profiles.ts  subscriptions.ts
├── magazine/                          # Magazine generation system ✅ COMPLETE
│   ├── core/ (primitives.jsx, generator.ts, selectionLogic.ts, printProfiles.ts, types.ts)
│   ├── templates/base/ (index.js, templates-1-4 … templates-20-24.jsx)
│   └── SELECTION_LOGIC.md  TEMPLATE_DESIGN_GUIDE.md
├── middleware.ts                      # Route guard — onboarding redirect + admin protection ✅
├── scripts/ (seed.ts, seed.sql, seed.README.md, seed-print-test.sql, seed-print-test-content.md,
│             seed-image-manifest.md, test-generator.ts)
└── _design/
    ├── DESIGN_BRIEF.md + HTML mockups  † v1 reference only
    └── redesign-b/                     # Design System v2 package: README.md, README-pages.md,
                                        #   PLAYBOOK.md, B-final.html, B-pages.html, BC.html, B2.html

Database Schema (Key Tables)
Users
profiles (id, first_name, last_name, avatar_url, identity_banner_url, content_type, is_public, bio, city, bank_info, curator_payment_info, address_line1, address_line2, address_city, address_state, address_zip)
-- identity_banner_url: separate from avatar_url, full-width card banner in curate interface
-- content_type: 'photography' | 'art' | 'poetry' | 'essay' — Music is NOT a valid content type
-- city: text, values from CITIES constant in src/lib/constants/cities.ts
-- address_line1 non-empty = address on file (curate gate check)
-- RLS: "Public profiles are viewable by authenticated users" FOR SELECT USING (is_public=true OR id=auth.uid())
--   (added June 2026 so invite search can read other public contributors without service role)

profile_types (profile_id, type)   -- 'contributor' | 'curator' | 'admin'
-- Roles are add-only — never remove a role programmatically
-- New users get no rows until onboarding is complete
-- Middleware redirects to /onboarding if authenticated user has zero rows here
-- 'admin' assigned via SQL only — no UI. Check constraint includes 'admin'.
-- RLS: own-row SELECT + INSERT, PLUS "Authenticated users can read all profile_types" FOR SELECT
--   USING (true) — added June 2026; needed for the invite contributor-role filter. Safe (role info
--   not sensitive). Without it, invite contributor search returns nothing (typeData empty).

profile_connections (follower_id, followed_id, status, relationship_type)
subscriptions (subscriber_id, creator_id, status)

Periods (Quarterly)
periods (id, name, season, year, start_date, end_date, is_active, volume, issue)
-- Current active period: Spring 2026 (id: aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa); end_date currently
--   bumped to 2026-12-31 for testing (set by seed-print-test.sql)
-- Only one period should have is_active = true at a time
-- volume (text) + issue (integer): read dynamically by generator + admin preview (no longer hardcoded)
-- ⚠️ end_date gates submissions AND collab invites. When it passes, invite page goes read-only
--   ("Invitations closed"). To keep testing: UPDATE periods SET end_date='<future>' WHERE is_active=true;
--   NO admin UI yet to roll periods forward — known gap.

Content
content (id, creator_id, type, status, period_id, page_title, layout_preferences, content_dimensions, style_metadata)
-- type: 'regular' | 'fullSpread'   status: 'draft' | 'submitted' | 'archived'

content_entries (id, content_id, title, caption, media_url, is_feature, is_full_spread, order_index, focal_x, focal_y, aspect_ratio)
-- Up to 8 images per submission; focal_x/focal_y float 0–100 default 50; aspect_ratio float
-- media_url must be https:// — blob: URLs will not render in Puppeteer
-- ⚠️ order_index is the ONLY source of image order. Entries are inserted SEQUENTIALLY (not Promise.all —
--   concurrent inserts raced and swapped image order) and always sorted by order_index on read.
--   ContentEntry type includes order_index.

content_tags (content_entry_id, tag, tag_type)

Collaborations
collabs (id, title, type, is_private, participation_mode, location, template_id, period_id, metadata, description, prompt_text, is_user_created)
-- type: 'chain' | 'theme' | 'narrative'   participation_mode: 'community' | 'local' | 'private'
-- Always prefer participation_mode over is_private (legacy)
-- period_id always set from periods WHERE is_active=true; template_id written to column not just metadata
-- USER-CREATED: is_user_created=true, template_id=null, participation_mode='private'
-- THREE TEXT FIELDS (user-created, mirroring seeded): title=name, description=public sub-desc,
--   prompt_text=contributor brief. prompt_text column added June 2026.

collab_participants (id, collab_id, profile_id, role, status, participation_mode, city, location, invited_by, invite_status, joined_at)
-- role: check constraint allows 'organizer' | 'member' | 'lead' ('lead' added June 2026)
-- invited_by: uuid → profiles(id), set when invited rather than self-joined
-- invite_status: 'pending' | 'accepted' | 'declined' (default 'accepted')
-- RLS is DISABLED on this table (relrowsecurity=false)
-- ⚠️ TWO FKs point to profiles (profile_id AND invited_by). NEVER use a PostgREST embed
--   .select('*, profiles(...)') — throws PGRST201 "more than one relationship found".
--   ALWAYS fetch participants and profiles in TWO steps and merge in JS.

collab_templates (id, name, type, instructions, requirements, connection_rules, display_text, internal_reference, is_active)
-- field is 'name' not 'title'; display_text=public desc; instructions=contributor brief
-- ⚠️ Seeded collabs get brief from collab_templates.instructions via template_id join.
--   User-created (template_id=null) get brief from collabs.prompt_text. Submit/detail page falls
--   back to collabs.prompt_text/description when template_id is null.
-- ⚠️ The curate collabs tab is TEMPLATE-DRIVEN (period_templates → collab_templates). A community or
--   local collab only appears as a selectable row if it has a template linked to the period.

period_templates (period_id, template_id)
collab_submissions (id, collab_id, contributor_id, title, caption, media_url, status, metadata)
-- text field is 'caption' not 'content'

Communications
communications (id, sender_id, recipient_id, subject, content, image_url, word_count, status, period_id, is_selected, is_included)  -- status: 'draft' | 'submitted'
communication_notifications (id, communication_id, recipient_id, is_read)

Campaigns (Ads)
campaigns (id, name, bio, avatar_url, last_post, discount, period_id, is_active)
-- discount is int4 (e.g. 2 = $2 off); avatar_url rendered full-bleed on CampaignPage with object-fit cover
-- ⚠️ Ad art spec: supply at page proportion (8.25×10.75 trim + bleed) with ≥0.375" clear space from
--   every edge — CampaignPage crops to fill and MagCloud trims up to 1/8". Nothing is overlaid on ads.

Curation Selections
curator_creator_selections (curator_id, creator_id, period_id)
curator_campaign_selections (curator_id, campaign_id, period_id)
curator_collab_selections (curator_id, collab_id, period_id, participation_mode, location, source_id)
-- source_id: community → community_<template_id>; local → local_<template_id>_<City>; private → collab id.
-- Generator reads collab_id + participation_mode + location; curate UI reconciles checkboxes by source_id.
curator_communication_selections (curator_id, period_id, include_communications)
-- curate page loads selections from DB on mount, NOT localStorage
-- localStorage key is magazine_selections_{user_id} (user-scoped)
-- A selected CONTRIBUTOR brings ALL their submitted content for the period into the magazine.

Magazine Generation
magazine_templates (id, name, type, description, file_path, frame_mapping, is_active)
magazine_generation_jobs (id, curator_id, period_id, status, mapping_data, output_path, error_log)
magazine_pages (id, generation_job_id, page_number, template_id, content_mapping, status)

Storage
- Bucket for app uploads (existing content_entries point here — never move/rename).
- Bucket `seed` (PUBLIC): 41 print-test images at exact case-sensitive names (mixed .jpeg/.jpg/.JPG/.PNG —
  see scripts/seed-image-manifest.md). URL: https://cbdiujvqpirrvzodfujm.supabase.co/storage/v1/object/public/seed/<name>
- A private bucket → Puppeteer fetches nothing → every image frame renders empty with NO error.

Onboarding Flow
Route: /onboarding. Guard: middleware redirects authenticated users with zero profile_types rows to /onboarding.
Exempt routes: /onboarding, /auth/*, /api/*, /_next/*, /favicon.ico, /admin/*
Flow: Step 1 name; Step 2 role + content type; Step 3 confirm + press button.
DB writes happen on step 3 press (not incrementally): profiles upsert, profile_types insert (.maybeSingle() guard).
Redirect after: all roles → /dashboard (the Up-next strip surfaces "Submit your first piece" for new contributors).
IMPORTANT: use window.location.href NOT router.push for the post-onboarding redirect (avoids
middleware race condition before session cookie is set).

Curate Page — Address Gate
- Selections always save to DB regardless of address
- If address_line1 missing, persistent banner below the stats/meter linking to /profile
- Banner dismissible per session; hasAddress = !!profile.address_line1
- Address gate WARNS but never BLOCKS saves

Dashboard — Content row (v2, Phase 4)
- Populated: one `.piece` row — 56px thumbnail (feature entry, else first by order_index, from the same
  fetchCurrentPeriodDraft entries; quill icon for text), serif 21 title, "N images · Type" meta, italic orange
  "submitted" (draft shows no word). Row tap → /submit?draft=<id>. Quiet action line below: "Withdraw"
  (submitted only → handleWithdrawContent, direct — it never had a confirm) / orange "Delete" (→ DeleteContentDialog
  → handleDeleteContent). The × button and the "tap to edit" hint are gone.
- Empty: a single AddRow "Submit work" + 36px "+" square; the whole row is the one tap → /submit.
- Up next strip (above the rows, at most one, hidden if none): pending invite → "X invited you" (View opens the
  Collaborations row) · unsubmitted collab with ≤14d left → "X due in N days" (→ that collab's submit) · draft
  communication → "Finish your note to X" (→ /communicate/[id]) · no content → "Submit your first piece" (→ /submit).
  Uses only data already on the page; "due" = the active period's end_date (collabs are period-scoped).

Email Confirmation ✅ COMPLETE
- Enabled in Supabase Auth; custom SMTP via Resend (smtp.resend.com:465, user resend,
  noreply@onlineoffline.online, sender "online//offline"); domain DNS verified
- Confirmation link → /auth/callback (@supabase/ssr). Full flow tested. Supabase on Pro plan.

Admin Magazine Preview ✅ COMPLETE
Route: /admin (curator list) + /admin/preview/[curatorId]. Protected: non-admins→/dashboard, unauth→/auth.
API: /api/admin/preview/[curatorId] uses SUPABASE_SERVICE_ROLE_KEY to bypass RLS.
Admin role assignment (SQL only):
  ALTER TABLE profile_types DROP CONSTRAINT profile_types_type_check;
  ALTER TABLE profile_types ADD CONSTRAINT profile_types_type_check CHECK (type IN ('contributor','curator','admin'));
  INSERT INTO profile_types (profile_id, type) VALUES ('<uuid>', 'admin') ON CONFLICT DO NOTHING;
How it works:
- /admin lists curators with creator selections for active period
- API verifies admin via session client, then fetches ALL data via SERVICE ROLE client
  (⚠️ period query + all data fetching MUST use service role, not session client — otherwise
  "No active period found" / null data from RLS)
- Runs selectionLogic.ts, builds self-contained HTML per page, renders in sandboxed iframes at
  print dims scaled 50% (single 790×1054→395×527; spread 1580×1054→790×527). Read-only, screen profile.
Editorial corrections via SQL: UPDATE content_entries SET focal_x=<0–100>, focal_y=<0–100> WHERE id='<entry-id>'; re-preview.
When something looks wrong: crop→fix focal via SQL; bad submission→email contributor to resubmit;
layout→fix template. Rarely cancel a whole print (problems are per-submission). Future: in-preview focal editor.
⚠️ The admin preview is for REVIEW, not for producing print files — the print PDF comes from the generator.

Private Collaboration System ✅ COMPLETE
Two origins:
1. SEEDED/LIBRARY (template_id set) — joined from /collabs. First active joiner becomes role='lead';
   rest are 'member'. Lead can invite.
2. USER-CREATED (is_user_created=true, template_id=null) — built at /collabs/create with three fields
   (Name→title, Description→description, Prompt→prompt_text). No Type selector. Creator stamped
   role='lead', status='active', invite_status='accepted'.

Invite flow (unified, full-page /collabs/[id]/invite):
- Lead OR member can OPEN. Lead sees search + invite controls; member sees read-only roster.
- Contributor search: two-step (profiles by is_public+name ilike → profile_types filter 'contributor'
  → exclude self + existing). NO PostgREST embed.
- Invite inserts collab_participants: role='member', status='active', invite_status='pending',
  invited_by=lead. Cap 8–10 total. After invite, re-fetch participants (loadData) so invitee leaves search.
- Roster status: v2 StatusDot per RosterRow — 7px dot, green accepted / --line2 pending / orange declined — with a
  one-time legend (localStorage flag oo_invite_legend_seen). "lead" is the row's mono sub-line, not a chip.
- Deadline gate: if active period end_date passed, invite controls hidden; roster stays.

Accept/decline (invitee side, on dashboard):
- getUserCollabs surfaces pending invites with isPendingInvite=true; declined rows filtered out.
- Pending invitations render at top of dashboard Collaborations list with "invited" badge + Accept/
  Decline buttons. They do NOT route to content on tap.
- Accept → invite_status='accepted'; transitions in place to a normal active collab, no navigation.
- Decline → invite_status='declined'; disappears from invitee's list; lead sees "declined" badge.

Dashboard invite affordance (v2, Phase 4):
- Collab item body still routes ONE-TAP to /collabs/[id]/submit — do NOT change.
- Private rows get a SEPARATE 28px outlined add-person icon (stopPropagation) → /collabs/[id]/invite; aria-label
  "Invite" (lead) / "Participants" (member) — same page, lead sees controls, member sees the roster. Community/local: none.
- Leave: the × button is GONE. SwipeRow (swipe left → 84px orange "Leave"; long-press + hover "···" fallbacks)
  → showConfirmDialog('leave', id) → the same ConfirmationDialog → leaveCollab. Communications rows use the same
  SwipeRow: Withdraw (submitted → showConfirmDialog('withdraw')) / Delete (draft → DeleteCommDialog).
- Invited rows: gold outlined Accept / quiet Decline (handleAcceptInvite / handleDeclineInvite); no row tap.
  Active rows: green ✓ (22px slot) when a collab_submission is submitted, else an empty slot.

Counts: dashboard + curate reflect ACCEPTED-only (invite_status='accepted' AND status='active');
pending + declined never counted. Lead auto-accepted so fresh collab shows 1. Community/local have
null invite_status — counts use null-safe filter (invite_status.is.null OR invite_status.eq.accepted).

Curate visibility: IntegratedCollabsSection groups seeded by template_id. User-created (template_id=null)
fall through, so render in a SEPARATE "Your Private Collabs" section, filtered to private && !template_id
where curator is an active participant. Do NOT change seeded grouping/display.

Magazine Generation System
Status: ✅ FULLY OPERATIONAL, print-validated against MagCloud.

Running the generator (Codespaces)
  cd online-offline
  set -a && source .env.local && set +a
  npm run generate-test                                        # Lena, screen profile → /tmp/magazine-<curator>-<period>.pdf
  npm run generate-test -- --profile=magcloud                  # Lena, MagCloud-ready → …-magcloud.pdf
  npm run generate-test -- --profile=magcloud --curator=<uuid> # any curator
Direct call: generateMagazine(curatorId, periodId, profileName='screen') in src/magazine/core/generator.ts.
Requires SUPABASE_SERVICE_ROLE_KEY. PDF → /tmp only; copy into the workspace to download, never commit.
⚠️ Codespaces first-time setup: .env.local is gitignored and does NOT travel with the repo — recreate it
  (NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY; those are the only
  three env vars the code reads). Then `npm install` (tsx + Puppeteer), then Chromium's system libs on
  Ubuntu 24 (note the t64 names):
  sudo apt-get install -y libatk1.0-0t64 libatk-bridge2.0-0t64 libcups2t64 libdrm2 libxkbcommon0 \
    libxcomposite1 libxdamage1 libxfixes3 libxrandr2 libgbm1 libasound2t64 libpango-1.0-0 libcairo2 \
    libnss3 libnspr4 libatspi2.0-0t64 libgtk-3-0t64
  Verify env is ignored: git check-ignore online-offline/.env.local (must echo the path).

Page sequence (generator.ts) — INTERSPERSED, not grouped
1 CoverA · 2 BlankPage · 3 FrontMatter · 4+ content · last ColophonPage.
Content between FrontMatter and Colophon is ordered by orderContentForFlow():
  Rule 1 (hard): every 2-page spread starts on an EVEN page so it reads across the fold. Content starts on
    page 4 (even); spreads are parity-neutral; only single pages flip parity → single pages are placed in
    even-sized PAIRS ("mortar") before spreads. A lone leftover single goes to the tail.
  Rule 2: no two spreads back-to-back where singles exist to separate them (yields to Rule 1).
  Rule 3: content types dispersed evenly via deterministic largest-bucket-first round-robin (not random).
  Rule 4: BlankPage filler only as a last resort — logs "alignment fallback: blank filler inserted"; the
    ordering should make this never fire.
  FrontMatter TOC is built LAST from the final numbered order (two-pass). Left page = data.page (even),
  right = data.page+1. More single-page content (poems, comms, campaigns, short essays) = better dispersion.

Active Templates (18 incl. BlankPage)
CoverA(1-4,1) · BlankPage(inline,1) · FrontMatter(20-24,1) · SpreadPanorama(18-19,2: 1img ≤50w) ·
Spread(9-11,2: 1img >50w) · Spread2(12-17,2: 2img) · Spread4(12-17,2: 3-4img) · SpreadMosaic(18-19,2: 5-6img light) ·
Spread6(12-17,2: 7-8img dark) · TextSubmission(5-8,1: essay ≤500w) · TextSpread(12-17,2: 501-1800w) ·
PoetryPage(20-24,1) · CollabSpreadCommunity(20-24,2) · CollabSpreadLocal(20-24,2) · CollabSpreadPrivate(20-24,2) ·
CommunicationsPage(9-11,1) · CampaignPage(9-11,1 per campaign) · ColophonPage(12-17,1 last)
Deprecated (unused): SinglePhoto, MultiPhoto*, CollabPage, MusicPage
Template notes (changed Aug 2026):
- PoetryPage: poems >18 non-empty lines render in TWO columns (columnFill balance, stanzas breakInside avoid);
  ≤18 lines keep the original single centered column + 70% anchor rule.
- CampaignPage: PURE full-bleed ad — raw <img> object-fit cover, position absolute 0/0 AW×AH. No overlaid
  text, no folio, no wordmark, no registration marks, no grain. Only BleedMarks (printer trim). ImageFrame is
  used only as the no-image placeholder.
- ⚠️ Spread4 with 3 images leaves an EMPTY grid cell. Known gap — a dedicated 3-image template (Spread3) is
  planned. Until then, submissions should have 4 images, not 3.

Print profiles (src/magazine/core/printProfiles.ts) — the design canvas never changes; only PDF output maps
- screen (default): 790×1054pt output (design canvas 768×1032 + 11px bleed), PNG, deviceScaleFactor 4,
  printer marks on. Used by generate-test default and the admin preview.
- magcloud: 8.5×11in (612×792pt) output for MagCloud's Standard magazine (8.25×10.75in trim). Asymmetric
  bleed: 0.125in top/bottom, 0.25in OUTSIDE, 0 on the SPINE side → even/left pages and odd/right pages get
  mirrored horizontal offsets (cover = page 1 = right-hand page). safetyInsetIn 0.1 maps the design trim
  0.1in INSIDE MagCloud's trim (their cut wanders ±1/8"); a full-page bleed underlay (same image XObject,
  stretched) sits beneath the inset draw so a wide cut shows duplicated edge content, never white.
  includePrinterMarks=false: BleedMarks/RegistrationMark are reassigned to null-renderers in the injected
  HTML (no template edits). JPEG q92 at deviceScaleFactor 3 → ~279×288 dpi effective on trim; ~22MB vs
  318MB (MagCloud hard cap: 300MB). ~2.5% horizontal anisotropy is inherent to trim-to-trim mapping.
- PrintProfile fields: pageWidthIn/HeightIn, trimWidthIn/HeightIn, bleedTop/Bottom/Inside/OutsideIn,
  safetyInsetIn, includePrinterMarks, deviceScaleFactor, imageFormat, jpegQuality. Add printers as profiles
  (Mixam next) — never hard-code a printer's geometry into page.pdf().
Check a PDF: pdfinfo <file> | grep "Page size" (needs poppler-utils). screen = 790×1054 pts; magcloud = 612×792.

Key Design Constants (primitives.jsx)
W=768 H=1032 BLEED=11 AW=790 AH=1054 ML=58 MR=58 MT=56 MB=56 LIVEW=652
Colors: C.ground=#252119, C.paper=#f0ebe2, C.terra=#e05a28 (identity/action), C.gold=#e8a020 (structure/warmth)
Fonts: F.serif=Instrument Serif, F.sans=Instrument Sans, F.mono=Courier Prime (loaded by the generated HTML)
volume/issue read dynamically from active period.
⚠️ The magazine templates keep their OWN color/font constants. They are not part of Design System v1 or v2
and must never be touched by app redesign work.

Print Fulfillment
- First run: MagCloud (magcloud profile). Upload 8.5×11 PDF, no printer marks, <300MB. Their preview shows
  trim (red) — text must sit clear of it. $0.20/page; saddle stitch free (8–100pp, page count divisible by 4);
  perfect bind $1.00/piece (24–384pp). ~$6.40 print + ship for 32pp.
- Later: Mixam (better unit price ≥~10 copies, real paper choices) as a second print profile.
- Test terracotta #e05a28 and gold #e8a020 on the first physical copy — warm colors shift in CMYK.

Design System v1 (current app UI — being replaced by v2, see next section)
Philosophy: every UI element participates in the neon color system or recedes into the warm dark.
Page background: every page uses --lt-bg (#0f0e0b) as root AND content-column AND sticky header/footer
background. Card/section/icon backgrounds keep --ground-3 etc. for contrast.
CSS Variables (globals.css)
--ground:#252119 --ground-2:#2e2a20 --ground-3:#373229 --ground-4:#413c31 --ground-5:#4c4639
--paper:#f0ebe2 --paper-2:#d8d2c8 --paper-3:#b0a898 --paper-4:#857d72 --paper-5:#554d44
--neon-accent:#e05a28 --neon-blue:#5a9fd4 --neon-green:#4ec47a --neon-amber:#e0a830 --neon-purple:#a888e8
--glow-accent:rgba(224,90,40,0.4) --glow-blue:rgba(90,159,212,0.4) --glow-green:rgba(78,196,122,0.4)
--glow-amber:rgba(224,168,48,0.4) --glow-purple:rgba(168,136,232,0.35) --glow-paper:rgba(240,235,226,0.15)
--rule:rgba(240,235,226,0.08) --rule-mid:rgba(240,235,226,0.14) --rule-strong:rgba(240,235,226,0.24)
--lt-bg:#0f0e0b --lt-text:rgba(235,225,205,0.85) --lt-text-2:rgba(235,225,205,0.65)
--lt-text-3:rgba(235,225,205,0.42) --lt-rule:rgba(235,225,205,0.09) --lt-card:rgba(235,220,185,0.06)
--lt-card-bdr:rgba(235,220,185,0.1) --lt-card-bdr-sel:rgba(235,220,185,0.24)
Invalid — never use: --lt-surface→--ground-2 | --ground-raised→--ground-3 | --ground-base→--ground |
--rule-color→--rule-mid | --paper-primary→--paper | --paper-secondary→--paper-3
Typography: Instrument Serif (display, titles, status words italic) · Instrument Sans (body) · Courier Prime (labels, buttons, counts)
Neon assignments: Content → --neon-accent | Community → --neon-blue | Local → --neon-green | Private → --neon-purple |
Communications → --neon-amber | Curate/save → --neon-green | Submitted → --neon-accent italic | Draft → --paper-4 italic
Press mechanic button: var(--font-mono) 9px .14em uppercase; radius 2px; border 1px var(--rule-mid);
border-bottom 2px var(--ground-4); box-shadow 0 2px 0 var(--ground-4), 0 3px 6px rgba(0,0,0,.4);
press translateY(2px) shadow none; release transition .18s cubic-bezier(.34,1.56,.64,1). NEVER mix border shorthand with borderBottom.
Loading: Courier Prime "loading…" --paper-4, never spinners. Empty: Instrument Serif italic 14px --paper-4.
⚠️ Lucide React — never. Inline SVGs only.

Design System v2 — "B" redesign (September 2026) — ALL app screens
STATUS: rolling out in 14 phases per _design/redesign-b/PLAYBOOK.md (one phase per fresh Claude Code
session, run back to back). v1 tokens/fonts and the shadcn components in src/components/ui/ remain ONLY
until Phase 13 retires them. Do not remove them earlier; do not use them on a page already migrated.
Migrated pages so far: Phase 0 foundation (tokens, fonts, v2 primitives), / (auth), /onboarding, /profile, /dashboard, /submit, /collabs, /collabs/create, /collabs/[id]/invite, /collabs/[id]/submit

Reference: _design/redesign-b/ — README.md (Dashboard + Curate spec) and README-pages.md (all other
screens). Visual refs: online-offline-app-redesign-B-final.html (Dashboard/Curate frames) and
online-offline-app-redesign-B-pages.html (11 frames: Submit image/text, Collabs browse, Collab
create/invite/submit, Communicate new, Profile ×2, Onboarding, Sign in + primitives card). Design HTML is
reference only — never ship it. Read the CSS in the HTML for exact values.

Tokens (globals.css, coexist with v1 until Phase 13):
--bg:#0d0c0a --bg2:#131210 --line:#24211d --line2:#312d27
--ink:#ece7de --ink2:#a49c90 --ink3:#6a635a
--orange:oklch(0.74 0.13 45) --gold:oklch(0.8 0.11 85) --green:oklch(0.78 0.12 150)
--blue:oklch(0.76 0.09 240) --purple:oklch(0.74 0.1 300)
Fonts: Instrument Serif 400+italic (titles, names, prices, season); Hanken Grotesk 400/500 (labels, body,
buttons) as --font-sans-v2; JetBrains Mono 400/500 (numbers, counts, status words, 10px section labels)
as --font-mono-v2. Type sizes: row title 24 · sub-item 19 · card title 17 · price 26 · tab labels 12–13
500 .12–.14em uppercase · body 13.5 · section labels 10 mono .18em uppercase.

Meaning map: orange=content/deadline · gold=communications/invites/"yours"/prompt label ·
green=local collabs/primary action/selected/submitted ✓ · blue=community · purple=private.
Contributor type: photography=blue, art=purple, poetry+essay ("writing")=gold.
⚠️ Music is NOT a content type — ignore every "music" reference in the design files and remove `music`
from the `tc` map in curate/page.tsx.
Accent per screen: /dashboard sections by type · /curate green header · /submit orange · /collabs gold
header, pills by mode · /collabs/create and /collabs/[id]/invite purple · /collabs/[id]/submit mode color ·
/communicate/* gold · /profile gold header + green Save · /onboarding and / (auth) INK ONLY — green is
reserved for "adds to the issue"; its first appearance is on the dashboard.

Rules: color at rest is a 6px dot, a 28px tinted icon tile (12% tint), or a hairline — never a filled
panel, never colored body text (mono numbers excepted). Active section: icon tile takes the section color
(border + icon + 10% tint), no glowing underline. Glow ONLY on the one primary action per screen
(Save/Submit/Send) and newly-filled page-meter bars. Radii: rows 0 · icon tile 10 · type tile 7 · pill
full · cards 12 · buttons 5 · sheet 20 top. Inputs: borderless, bottom hairline, ink on focus. Loading =
mono "loading…". Empty = one italic serif line. No spinners. No lucide-react — inline SVGs.
Mobile-first 390px, single column, max ~560px centered. Sheets: 240ms slide, 45% scrim, grabber.

v2 primitives live in src/components/v2/ (built in Phase 0; presentational only, no data fetching):
IconTile, TypeTile, Pill (icon+count and label variants), SectionLabel, Sheet, Toast, SwipeRow, Input,
Select, Textarea, WordCount, SegmentedToggle, ChoiceCard, FocalPointFrame, ThumbStrip, SearchField,
RosterRow, StatusDot, Brief, ProgressSteps, Toggle, PageShell. Use these; do not restyle shadcn in place.
Every v2 page root is <PageShell>; page background is never set on an inner container. (PageShell = root
min-height 100dvh / width 100% / --bg / overflow-x hidden + centered 560px column, padding 0 24px, border-box,
min-width 0; `header` and sticky `footer` slots. body background in globals.css is --bg as well.)
SwipeRow: hover "···" only on (hover:hover) devices, in its own reserved right column; a tap on a non-open row always navigates.

Key v2 screen facts (full specs in the READMEs):
- Dashboard: section subtitles removed (count + "Up next" strip replace them); Up next shows at most one
  item by priority (pending invite → collab due ≤14d → draft communication → no content yet); Leave/
  Withdraw/Delete are swipe-left actions with long-press + hover "···" fallbacks; collab row body is still
  one tap to /collabs/[id]/submit.
- Curate: page meter (20 bars) replaces the stats strip; price ONLY in the sticky footer; the pill IS the
  toggle in the collabs tab (same toggleItem args); local pill opens a city sheet; alert() → Toast.
- Submit: FocalPointFrame drag/tap sets focal_x/focal_y; ThumbStrip order = order_index; handleCopyTags
  dropped from the UI.
- Auth/onboarding primary buttons are ink, not green.

NON-NEGOTIABLE during the redesign: every existing handler, route, DB write, and the curate save payload
(curator_*_selections rows incl. source_id format, participation_mode, location) stay IDENTICAL. Also
unchanged: content_entries order_index/focal_x/focal_y/is_feature writes, collab find-or-create +
first-joiner-lead, invite two-step fetch (no PostgREST embed), onboarding window.location.href redirect,
address gate warns-never-blocks. Verified per phase by the gates in PLAYBOOK.md (Gate A = curate selection
snapshot must be byte-identical; Gate B = page-specific DB writes; Gate C = commit on origin/main).

Profile Page — Structure (v2, mobile-first, single scroll — no tabs; redesign Phase 2)
Header: "‹ Dashboard" · wordmark · "Profile" gold. Sections in code order, mono SectionLabels:
1 IDENTITY — 64px avatar + "Change photo" (uploadAvatar); First/Last two-up Inputs; City Select (CITIES); Bio Textarea;
  identity-banner dashed 88px drop zone (uploadBanner) + note "Shown to curators… Not a preview of submitted work."
2 YOUR ROLES — role cards (28px tinted tile + serif name + mono green "active", or outlined "Add" → addRole); ADD-ONLY;
  contributor shows Pills Photo / Art / Writing → Writing opens Poetry / Essay sub-pills (content_type is always
  poetry|essay, never "writing"). Below: Public profile Toggle (gold) → isPublic, "?" expands the permissions note.
3 MAILING ADDRESS — 5 Inputs (line1, line2, city | state zip); green mono "on file" beside the label when address_line1 set.
4 PAYMENT — one italic serif line per role (curator "Card on file: coming soon." / contributor "Contributor payments:
  coming soon."); no logic, Stripe pending.
5 ACCESS REQUESTS — hidden when empty; RosterRow + green "Approve" (handleApproveRequest) / quiet "Deny" (handleDenyRequest).
6 CONNECTIONS — SearchField (searchProfiles → "Request" = handleFollowRequest, pendingRequestMap → "requested");
  RosterRows merge private profiles you follow + your followers by id; "···" opens a Sheet: Remove (handleUnfollow,
  rows you follow) / Block (handleBlockUser, rows that follow you).
7 BLOCKED — hidden when empty; "Unblock" → handleUnblockUser.
Footer: sticky green primary Save → updateProfile (same upsert payload). Toasts via v2 Toast, driven by showSuccess/showError.
Inputs: v2 Input/Select/Textarea (transparent bg, bottom hairline, radius 0). Two-ups: grid 1fr 1fr gap 16, each min-width:0.

City List (src/lib/constants/cities.ts CITIES array)
Atlanta, Austin, Boston, Chicago, Dallas, Denver, Houston, Los Angeles, Miami, Nashville,
New Orleans, New York, Pensacola, Philadelphia, Phoenix, Portland, San Antonio, San Diego, San Francisco, Seattle

Collaboration System — Three Participation Modes
- Private — invite-only, 8–10 max, lead/member roles (see "Private Collaboration System")
- Community — open globally
- Local — city-specific, uses city field from collab_participants
IntegratedCollabsSection (curate collabs tab): template-driven; shows all active templates; ★/gold dot where
curator contributes; independent toggles; Community=one row/template; Local=one row/active city, hidden when
none; Private(seeded)=one row if joined; "Your Private Collabs"=separate section for user-created
(template_id=null) where curator is active participant.

Seed Data
Test Auth Users:
  contributor1@test.com  0889833d-d56a-4969-83b4-43c9585bcd92  Maya Torres   contributor
  contributor2@test.com  402f2415-65c1-4efa-a95e-c0ccb38f7048  Daniel Osei   contributor
  curator1@test.com      185f8c7c-9837-425a-ac1c-ebf18d1af1b9  Lena Vasquez  curator (Curator A)
  Dev's own account:     2ad6af92-279d-4eb7-a1b6-b51ec042aa85  Adam Johnson  contributor+curator+admin (Curator B)
  (Plus ~20 seeded contributor profiles with fixed UUIDs, most is_public=true.)
Original seed (scripts/seed.sql): 3 collab templates, 3 collabs, Maya "After the Rain", 2 campaigns.
  ⚠️ Re-running seed.sql wipes manual media_url values. "Street Light Studies" and "Edges of Nothing" were
  DELETED from the DB (old placeholder images).
Print-test seed (scripts/seed-print-test.sql, Aug 2026 — additive, idempotent, never touches seed.sql):
  content spec in scripts/seed-print-test-content.md, exact image URLs in scripts/seed-image-manifest.md.
  Adds: 9 submissions firing every visual/text template (The Salt Line, What the Tide Left, Two Mornings,
  Paper Studies (4 img), Neighborhood Index, Field Notes, The Slow Channel, Against the Feed, Inventory of a
  Rented Room); 3 new collab_templates + period_templates + collabs ("Somewhere Else Entirely" community,
  "The Water Is Always There" local Pensacola, "Everyone Who Was There" private, lead Adam); 4 campaigns
  (Moleskine, Risograph, Gulf Coast Film Lab, The Standing Desk); 4 communications; full selections for
  Curator A (Lena: 10 contributors, community+local, 2 ads) and Curator B (Adam: 9 contributors, local+private,
  2 ads — shorter book; only 4 of his 9 have solo content). Bumps period end_date to 2026-12-31.
  Note: caption word counts are load-bearing (≤50 → SpreadPanorama, >50 → Spread).
Cleaning junk user-created test collabs:
  DELETE FROM collab_participants WHERE collab_id IN (SELECT id FROM collabs WHERE is_user_created=true);
  DELETE FROM curator_collab_selections WHERE collab_id IN (SELECT id FROM collabs WHERE is_user_created=true);
  DELETE FROM collab_submissions WHERE collab_id IN (SELECT id FROM collabs WHERE is_user_created=true);
  DELETE FROM collabs WHERE is_user_created=true;
(There is also leftover test noise: duplicate "Edges" private rows, "One Hundred Mornings" local rows in
 several cities, a Maya Torres curator selection set — harmless, clean up before launch.)

Key Gotchas & Hard-Won Lessons

### Auth / Supabase
- NEVER @supabase/auth-helpers-nextjs (removed; crashes Next.js 16). @supabase/ssr only.
- All lib functions take supabase as first param — do not revert. Use .maybeSingle() not .single().
- profile_types RLS: own-row SELECT+INSERT PLUS read-all SELECT (for invite search). profiles RLS:
  public + own. Session cookie: sb-cbdiujvqpirrvzodfujm-auth-token (array, token at [0]).
- Server routes using service role: create service role client FIRST, fetch ALL data with it;
  verify auth with session client.
- Prefer an RLS policy over the service role key when the data is meant to be readable by users
  (e.g. public profiles for invite search). Service role is for admin/cross-user reads only.

### Service Role Key
- Must be in BOTH .env.local AND Vercel env vars; use service_role NOT anon.
- Production symptoms: "supabaseKey is required" (missing) or "Invalid API key" (wrong/whitespace/anon).

### User Deletion (test accounts)
- Supabase dashboard delete fails with "Database error deleting user" if dependent rows exist.
- Run SQL cleanup first (in FK order), THEN delete from Authentication → Users:
  DO $$ DECLARE uid uuid := '<paste-uuid>';
  BEGIN
    DELETE FROM curator_communication_selections WHERE curator_id=uid;
    DELETE FROM curator_campaign_selections WHERE curator_id=uid;
    DELETE FROM curator_collab_selections WHERE curator_id=uid;
    DELETE FROM curator_creator_selections WHERE curator_id=uid OR creator_id=uid;
    DELETE FROM communications WHERE sender_id=uid OR recipient_id=uid;
    DELETE FROM collab_participants WHERE profile_id=uid;
    DELETE FROM collab_submissions WHERE contributor_id=uid;
    DELETE FROM content_entries WHERE content_id IN (SELECT id FROM content WHERE creator_id=uid);
    DELETE FROM content WHERE creator_id=uid;
    DELETE FROM subscriptions WHERE subscriber_id=uid OR creator_id=uid;
    DELETE FROM profile_connections WHERE follower_id=uid OR followed_id=uid;
    DELETE FROM profile_types WHERE profile_id=uid;
    DELETE FROM profiles WHERE id=uid;
  END $$;

### Collabs
- find-or-create join (no dup rows for same template_id+mode+city+period_id).
- First active joiner of private collab = 'lead'; rest 'member'. Private only — don't touch community/local.
- collab_participants has TWO FKs to profiles → NEVER PostgREST embed (PGRST201). Two-step fetch + merge.
  (Also applies to getUserCollabs — an embed there silently zeroed all participant counts.)
- Counts accepted-only (invite_status='accepted' AND status='active'), null-safe for community/local.
- User-created: template_id=null, is_user_created=true, three fields (title/description/prompt_text).
- Brief: seeded from collab_templates.instructions; user-created falls back to collabs.prompt_text/description.
- Bulk-delete order (FK): curator_collab_selections → collab_submissions → collab_participants → collabs.
- Curate collab rows are template-driven: a new community/local collab needs its own collab_templates row
  + period_templates link or it never appears in the curate tab.
- Collabs v2 (Phase 6): /collabs loadData FILTERS joined templates out of the list (activeTemplateIds), so the
  design's filled "Joined" pill can never show on a template card — it only appears on the user-created "Your
  collabs" cards (purple "Joined" + mono "lead" sub-line; title → /collabs/[id]/submit, lead's "Invite" pill →
  /collabs/[id]/invite). Do NOT add a joined map inside handleJoinClick/confirmLocalJoin to fake it — those handlers
  are byte-frozen. The per-template community/local counts loadData computes are no longer displayed (spec: no legend,
  no counts) but the queries were left untouched. Local join = Sheet of city Pills → the same confirmLocalJoin.
- Invite + collab submit v2 (Phase 7): removing the invite page's debug console.log lines orphans the `partsError` /
  `profileError` / `typeError` destructures they read — keep `void partsError;` in the frozen two-step fetch, drop the
  other two, or eslint no-unused-vars fails the build. The quiet "Invited" row after handleInvite is a UI-side
  recentlyInvited list shown only once the invitee appears in participants (the search effect re-filters them out).
  collab_submissions has NO focal_x/focal_y columns — the 1:1 FocalPointFrame crosshair on /collabs/[id]/submit is
  local display state and is never persisted; the v1 fullscreen toggle and caption char count were dropped (no v2 slot).

### Content / Submit
- Insert content_entries sequentially; sort by order_index on read. Never Promise.all the inserts.
- Exactly one is_feature per submission. focal_x/focal_y default 50.
- media_url https:// only. 4 images for a 2×2 grid — 3 leaves an empty cell (until Spread3 exists).
- Submit v2 (Phase 5): there is NO poetry/essay auto-detect outside src/magazine — the "Reads as poetry / essay" line
  mirrors isPoetry() from selectionLogic.ts as a display-only helper in SubmissionForm (never written to the DB; the
  generator still decides from profiles.content_type + its own isPoetry). FocalPointFrame captures the pointer for the
  focal drag, so a horizontal swipe on the frame also drags the crosshair — the form snapshots focal_x/focal_y on
  touchstart and restores them when the gesture qualifies as a swipe (≥60px x, ≤40px y) before moving prev/next.
  `periodLabel` state was never rendered; it is bound as `[, setPeriodLabel]` or eslint no-unused-vars fails the build.
  Footer Withdraw = withdrawContent() (the dashboard's DB write) then setStatus('draft'); Edit = local setStatus('draft')
  only (the old "Revert to Draft"). handleCopyTags was deleted; selectedTags still round-trip through load/save unseen.

### Design
- Never mix border shorthand with borderBottom on same element. No lucide-react (inline SVGs).
- v2 wordmark in JSX: write the slashes as {'//'} — a bare // text node fails eslint react/jsx-no-comment-textnodes.
- Mobile overflow culprit (fixed Sept 2026): a `width: 100%` row with 24px side padding and an explicit
  `boxSizing: 'content-box'` (the Phase 1–2 header rows) is 48px wider than a 390px viewport — the page scrolled
  sideways and the body's v1 --ground showed as a grey halo. Never set content-box on a padded 100%-wide element;
  PageShell owns the header/column/footer geometry now, and Input/Select/Textarea set border-box explicitly.
- Dashboard v2 shell (Phase 3): the v1 section chrome was a web of helpers keyed on activeSection (sectionColors,
  iconStroke/iconFilter/iconBox*, OpenRule, ChevronIcon). Removing SectionHeader/OpenRule makes ALL of them dead —
  delete them together or eslint no-unused-vars fails. (Phase 4 removed the last dead v1 bits: recentActivity,
  pressSubmit/submitPress, modeStyle, XIcon — the page now lints clean.)
- Dashboard v2 rows (Phase 4): a row inside SwipeRow must keep its own onClick on the INNER element — SwipeRow's
  onClickCapture swallows the synthesized click after a swipe/long-press and closes an open row on tap, so a row
  tap only fires when the row is at rest. Put stopPropagation on any button inside the row (add-person, Accept/Decline).
- Profile v2 (Phase 2): the design's 28px role tile is not a primitive (IconTile is 48px, TypeTile only takes content/collab
  types) — render it inline with tint(accent) + <Icon>. Keep the old tab state out; the page is one scroll.
- Music is NOT a content type. v1: all page backgrounds = --lt-bg. v2: see Design System v2.

### Database
- collab_templates uses name not title; collab_submissions uses caption not content.
- Prefer participation_mode over is_private. campaigns.discount is int4. One period is_active.
- Structured address fields (no single 'address' column). hasAddress=!!address_line1.
- profile_types: 'admin' via SQL only. collab_participants.role: organizer|member|lead. invite_status: pending|accepted|declined.
- Supabase Storage names are case-sensitive; .jpg ≠ .jpeg ≠ .JPG. Query storage.objects for exact names:
  SELECT name FROM storage.objects WHERE bucket_id='seed' ORDER BY name;

### Admin
- Admin via SQL only. /admin/* middleware-protected (non-admin→/dashboard, unauth→/auth).
- API needs SUPABASE_SERVICE_ROLE_KEY in Vercel; verify auth via session, fetch via service role.
- Focal corrections: UPDATE content_entries SET focal_x=<0–100>, focal_y=<0–100> WHERE id='<entry-id>'.

### Periods
- end_date gates submissions + invites. Past deadline → invite page read-only; dashboard shows "0d remaining".
- Keep testing: UPDATE periods SET end_date='<future>' WHERE is_active=true.
- volume/issue read dynamically. NO period roll-forward UI — known gap.

### Onboarding
- window.location.href (NOT router.push) for redirect; target is /dashboard for every role. .maybeSingle() guard on profile_types insert.
- DB writes on step 3 only. Middleware exempts /onboarding, /auth/*, /api/*, /_next/*, /favicon.ico, /admin/*.
- v2 step 2 shows Photo / Art / Writing pills; Writing opens Poetry / Essay sub-pills because profiles.content_type
  only accepts poetry|essay (never write "writing"). Roles are radio rows → handleSelectRole → handleToggleContributor.

### Curate Page
- Selections from DB on mount, not localStorage. Key magazine_selections_{user_id}. Address gate warns, never blocks.
- The save payload is what the generator reads. Any UI change to curate must leave the written rows identical.

### Magazine Templates
- ImageFrame hides crosshair/dot/label when real image present; its inner <img> hardcodes object-fit cover
  (override at the <img> level, never edit the primitive). Folio takes season as prop (no window._magazineSeason).
- No body text crosses center gutter on spreads (display titles ≥40px exempt).
- CollabSpreadLocal reads data.city (must be a CITIES value); CampaignPage reads data.avatar_url;
  Cover reads data.volume/data.issue.
- Templates never change for app-redesign work.

### Generator
- Codespaces run only (sandbox can't). Needs .env.local + npm install + Chromium libs (see "Running the generator").
- networkidle0 waits for fonts+images. PDF → /tmp only. BlankPage inline in generator.ts.
- normalizeContentType() maps DB values to display labels for TOC. volume/issue dynamic from active period.
- Ordering: orderContentForFlow() — see "Page sequence". Watch the log for "alignment fallback" (should never appear).
- Profiles: printProfiles.ts — add a printer as a profile; never hard-code page.pdf() geometry.
- Puppeteer maps CSS px → PDF pt 1:1; deviceScaleFactor affects raster quality, not page size.

### Git / Codespaces — see "Branch Discipline" at top. Short version:
- Sync before: git fetch origin && git pull origin main; confirm git branch.
- Claude Code claims "main does not exist" / works on feature branch — always wrong.
- VERIFY after every session from Codespaces: git fetch origin && git log origin/main --oneline -3.
  If commit not on origin/main, push didn't land. Then git pull origin main.
- Diverged with local VS Code commit (e.g. CLAUDE.md edit): git fetch origin && git reset --hard origin/main
  (safe only when local change is reproducible). Vercel production branch must be main.
- Two Codespaces exist for different repos — check `git remote -v` if the log looks foreign.
- Claude Code sandbox has NO node_modules: run `npm ci` in online-offline/ before `npx tsc --noEmit` / `npx eslint` /
  `npx next build`. A bare global `tsc` (TypeScript 6) fails with TS5101 "baseUrl is deprecated" — that's the wrong
  compiler, not a project error.

### Repository Hygiene
- ⚠️ The live app is the NESTED online-offline/ dir (package.json, src/, _design/redesign-b live there);
  the repo root also has stale top-level src/ and _design/ copies — never edit those by mistake.
- Never commit PDFs (→/tmp only; workspace copies for download are temporary) or files over 50MB.
  magazine-test.pdf + /tmp/magazine-*.pdf in .gitignore. .env.local is gitignored (.env* and .env.local).

Magazine Pricing
- Base $25.00/edition. Each campaign −$2.00. Target ~38–40 pages for 20 selections.
- Landed cost ~$12.50–13.50/copy at MagCloud (print ~$6.40–8 + bind + ship). Margin is thin at $20; the
  levers are Mixam at volume, page count, annual prepay, and sponsor-paid campaigns. Contributors are
  rewarded with print, not cash, at launch.

Testing
- tests/contributor.spec.ts (Maya), tests/curator.spec.ts (Lena). 21/23 pass (2 known correct).
- Suite does NOT yet cover onboarding, new profile structure, collab invite/accept, or the redesign.

Current Development Status
Completed ✅
- Full dark neon UI (v1), standardized to --lt-bg page background everywhere
- Magazine template system (18 templates) + generation pipeline + FrontMatter TOC
- Interspersed page ordering with guaranteed even-page spread alignment (Aug 2026)
- Print-profile system: screen + magcloud (asymmetric bleed, safety inset, bleed underlay, no printer
  marks, JPEG q92 dSF3); MagCloud accepted the PDF at 612×792
- PoetryPage two-column overflow fix; CampaignPage pure full-bleed ad
- Image order preserved on save (sequential inserts, order_index sort); order_index in ContentEntry type
- Dashboard empty-state Content card routes to /submit; redundant submit rows removed; "tap to edit" hint
- Focal point selector on /submit; Music removed as content type
- @supabase/ssr migration; onboarding flow; curate address gate; profile restructure
- Email confirmation + custom SMTP (Resend); local city data in curate collabs tab
- Admin magazine preview (/admin + /admin/preview/[curatorId], admin-protected)
- Volume/issue dynamic (periods.volume + periods.issue)
- User-created private collabs; full private collab lifecycle (create → invite → accept/decline →
  lead/member → accepted-only counts → curate visibility → dashboard invite affordance)
- profiles + profile_types RLS policies for invite contributor search
- Print-test seed dataset (41 real images, every template fired, two curators)

In Progress 🔧
- Design System v2 "B" redesign — 14 phases per _design/redesign-b/PLAYBOOK.md. Update "Migrated pages so
  far" in the v2 section as each phase lands.

Remaining / Known Issues ⚠️
1. Spread3 — a dedicated 3-image template so Spread4 never shows an empty cell (+ selectionLogic branch,
   TEMPLATE_DESIGN_GUIDE wiring). Until then submissions should use 4 images.
2. First physical print — order one MagCloud copy of Lena's magcloud PDF; check terracotta/gold shift,
   trim on bottom-edge text, type sharpness, source-image softness. Rebuild campaign-03 (San Carlos) art
   with edge clearance first.
3. Period roll-forward — no admin mechanism to close one season and open the next; SQL only.
4. Print fulfillment — MagCloud manual now; Mixam profile + API later.
5. Magazine generation job tracking — pipeline writes /tmp, does not record in magazine_generation_jobs.
6. Stripe integration — curator payment not built; profile shows placeholder. The real launch gate.
7. Subscription cancellation UI — blocked on Stripe.
8. Playwright suite — needs onboarding, new profile, collab invite/accept, and v2 coverage.
9. Debug console.log statements in collab invite/create/dashboard code — removed in redesign Phase 12.
10. Test-data noise in collabs/selections (see Seed Data) — clean before launch.
11. Personalization pass on the print-test content (real titles/captions/essay/poem for Adam's images).

User Roles
- Contributors: submit content, join/create collabs, invite, send communications
- Curators: select content for their printed magazine
- Admins: review magazine previews before print — SQL-assigned only
- Users can be contributor + curator (+ admin) simultaneously. Roles add-only.

Product Decisions
- Music is not a content type. Musicians participate via Photography/Art/Essay/Poetry. No QR codes.
- Onboarding lands on /dashboard for every role — orientation first, the dashboard's Up-next strip provides the next step.
- Roles are add-only (no removal UI; handle edge cases via Supabase).
- Subscription cancellation handled manually via email until Stripe exists.
- Mailing address required to receive print, NOT to save curate selections (gate warns, never blocks).
- Curators do NOT get a magazine preview — the surprise of the physical copy is core. /admin preview is editor-only.
- Private collabs have ONE lead who manages invitations (first joiner for seeded, creator for user-created).
  Lead invites up to the 8–10 cap until the submission deadline. Members view roster, cannot invite.
- Campaign pages are the advertiser's art, full-bleed, nothing overlaid. Advertisers supply art to spec.
- Magazine content is interspersed (varied), not grouped by type; spreads always read across the fold.
- Printers are output profiles, never design constraints — the design canvas is the master.
- Launch philosophy: must feel complete, effective, and cool from the start. Stripe + a real print run
  with real contributor content are the true gates before opening to real users.
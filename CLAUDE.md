CLAUDE.md — online//offline
Last updated: June 2026

Project Vision
online//offline is "slowcial media" — the antithesis of dopamine-driven social platforms. Contributors submit creative work (photos, art, poetry, and essays) quarterly. Curators select what goes into their personalized printed magazines. The physical magazine is the product. The app is the infrastructure that makes it possible.
The philosophy: deliberate pace, thoughtful curation, real-world creative collaboration, and a beautiful printed artifact as the payoff. The app should feel calm and purposeful, not stimulating.

Tech Stack

Framework: Next.js 16 (App Router)
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
Many false alarms this session were just a stale local view.

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
│   ├── auth/  layout/  ui/
├── lib/
│   ├── constants/cities.ts           # Single source of truth for city list ✅
│   └── supabase/
│       ├── client.ts  useSupabase.ts  collabLibrary.ts
│       ├── collabs.ts                # find-or-create join, getUserCollabs (counts/invites) ✅
│       ├── communications.ts  content.ts  curation.ts  profiles.ts  subscriptions.ts
├── magazine/                          # Magazine generation system ✅ COMPLETE
│   ├── core/ (primitives.jsx, generator.ts, selectionLogic.ts, types.ts)
│   ├── templates/base/ (index.js, templates-1-4 … templates-20-24.jsx)
│   └── SELECTION_LOGIC.md  TEMPLATE_DESIGN_GUIDE.md
├── middleware.ts                      # Route guard — onboarding redirect + admin protection ✅
├── scripts/ (seed.ts, seed.sql, seed.README.md, test-generator.ts)
└── _design/ (DESIGN_BRIEF.md + HTML mockups) † reference only

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
-- Current active period: Spring 2026 (id: aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa)
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

period_templates (period_id, template_id)
collab_submissions (id, collab_id, contributor_id, title, caption, media_url, status, metadata)
-- text field is 'caption' not 'content'

Communications
communications (id, sender_id, recipient_id, subject, content, image_url, word_count, status, period_id, is_selected, is_included)  -- status: 'draft' | 'submitted'
communication_notifications (id, communication_id, recipient_id, is_read)

Campaigns (Ads)
campaigns (id, name, bio, avatar_url, last_post, discount, period_id, is_active)
-- discount is int4 (e.g. 2 = $2 off); avatar_url rendered full-bleed on CampaignPage

Curation Selections
curator_creator_selections (curator_id, creator_id, period_id)
curator_campaign_selections (curator_id, campaign_id, period_id)
curator_collab_selections (curator_id, collab_id, period_id, participation_mode, location, source_id)
curator_communication_selections (curator_id, period_id, include_communications)
-- curate page loads selections from DB on mount, NOT localStorage
-- localStorage key is magazine_selections_{user_id} (user-scoped)

Magazine Generation
magazine_templates (id, name, type, description, file_path, frame_mapping, is_active)
magazine_generation_jobs (id, curator_id, period_id, status, mapping_data, output_path, error_log)
magazine_pages (id, generation_job_id, page_number, template_id, content_mapping, status)

Onboarding Flow
Route: /onboarding. Guard: middleware redirects authenticated users with zero profile_types rows to /onboarding.
Exempt routes: /onboarding, /auth/*, /api/*, /_next/*, /favicon.ico, /admin/*
Flow: Step 1 name; Step 2 role + content type; Step 3 confirm + press button.
DB writes happen on step 3 press (not incrementally): profiles upsert, profile_types insert (.maybeSingle() guard).
Redirect after: contributor→/submit, curator→/curate, both→/submit.
IMPORTANT: use window.location.href NOT router.push for the post-onboarding redirect (avoids
middleware race condition before session cookie is set).

Curate Page — Address Gate
- Selections always save to DB regardless of address
- If address_line1 missing, persistent terracotta banner below stats bar linking to /profile
- Banner dismissible per session; hasAddress = !!profile.address_line1
- Address gate WARNS but never BLOCKS saves

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
  print dims scaled 50% (single 790×1054→395×527; spread 1580×1054→790×527). Read-only.
Editorial corrections via SQL: UPDATE content_entries SET focal_x=<0–100>, focal_y=<0–100> WHERE id='<entry-id>'; re-preview.
When something looks wrong: crop→fix focal via SQL; bad submission→email contributor to resubmit;
layout→fix template. Rarely cancel a whole print (problems are per-submission). Future: in-preview focal editor.

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
  invited_by=lead. Cap 8–10 total. After invite, re-fetch participants so invitee leaves search.
- Roster status badges: accepted (green), pending (paper-4), declined (terracotta).
- Deadline gate: if active period end_date passed, invite controls hidden; roster stays.

Accept/decline (invitee side, on dashboard):
- getUserCollabs surfaces pending invites with isPendingInvite=true; declined rows filtered out.
- Pending invitations render at top of dashboard Collaborations list with "invited" badge + Accept/
  Decline buttons. They do NOT route to content on tap.
- Accept → invite_status='accepted'; transitions in place to a normal active collab, no navigation.
- Decline → invite_status='declined'; disappears from invitee's list; lead sees "declined" badge.

Dashboard invite affordance:
- Collab item body still routes ONE-TAP to /collabs/[id]/submit — do NOT change.
- Private items get a SEPARATE small affordance (stopPropagation): "invite" (purple, lead) →
  /collabs/[id]/invite; "participants" (muted, member) → same page read-only. Community/local: none.
  The × dismiss button keeps its own behavior.

Counts: dashboard + curate reflect ACCEPTED-only (invite_status='accepted' AND status='active');
pending + declined never counted. Lead auto-accepted so fresh collab shows 1. Community/local have
null invite_status — counts use null-safe filter (invite_status.is.null OR invite_status.eq.accepted).

Curate visibility: IntegratedCollabsSection groups seeded by template_id. User-created (template_id=null)
fall through, so render in a SEPARATE "Your Private Collabs" section, filtered to private && !template_id
where curator is an active participant. Do NOT change seeded grouping/display.

Magazine Generation System
Status: ✅ FULLY OPERATIONAL. Generate test: set -a && source .env.local && set +a && npm run generate-test
Page Sequence: 1 CoverA · 2 BlankPage · 3 FrontMatter · 4+ content (photo→art→essay→poetry→collabs→comms→campaigns) · last ColophonPage

Active Templates (18 incl. BlankPage)
CoverA(1-4,1) · BlankPage(inline,1) · FrontMatter(20-24,1) · SpreadPanorama(18-19,2: 1img ≤50w) ·
Spread(9-11,2: 1img >50w) · Spread2(12-17,2: 2img) · Spread4(12-17,2: 3-4img) · SpreadMosaic(18-19,2: 5-6img light) ·
Spread6(12-17,2: 7-8img dark) · TextSubmission(5-8,1: essay ≤500w) · TextSpread(12-17,2: 501-1800w) ·
PoetryPage(20-24,1) · CollabSpreadCommunity(20-24,2) · CollabSpreadLocal(20-24,2) · CollabSpreadPrivate(20-24,2) ·
CommunicationsPage(9-11,1) · CampaignPage(9-11,1 per campaign) · ColophonPage(12-17,1 last)
Deprecated (unused): SinglePhoto, MultiPhoto*, CollabPage, MusicPage

Key Design Constants (primitives.jsx)
W=768 H=1032 BLEED=11 AW=790 AH=1054 ML=58 MR=58 MT=56 MB=56 LIVEW=652
Colors: C.ground=#252119, C.paper=#f0ebe2, C.terra=#e05a28 (identity/action), C.gold=#e8a020 (structure/warmth)
Fonts: F.serif=Instrument Serif, F.sans=Instrument Sans, F.mono=Courier Prime
volume/issue read dynamically from active period (not hardcoded).

Running the Generator
set -a && source .env.local && set +a && npm run generate-test
Requires SUPABASE_SERVICE_ROLE_KEY (anon insufficient). PDF → /tmp only, never copy to working dir.

Design System
Philosophy: every UI element participates in the neon color system or recedes into the warm dark.
Nothing neutral gray, nothing pure white, nothing default blue. Aesthetic: print shop at dusk, proof
light tables, letterpress, registration marks, neon-lit darkrooms.

⚠️ PAGE BACKGROUND: every page uses --lt-bg (#0f0e0b) as root AND content-column AND sticky
header/footer background — the deep near-black, same as the curate light table. Earlier the dashboard
etc. used the lighter --ground (#252119) which looked grayer; standardized to --lt-bg June 2026.
Card/section/icon backgrounds keep --ground-3 etc. for contrast — only the page SURFACE is --lt-bg.

CSS Variables (globals.css — use everywhere)
--ground:#252119 --ground-2:#2e2a20 --ground-3:#373229 --ground-4:#413c31 --ground-5:#4c4639
--paper:#f0ebe2 --paper-2:#d8d2c8 --paper-3:#b0a898 --paper-4:#857d72 --paper-5:#554d44
--neon-accent:#e05a28 --neon-blue:#5a9fd4 --neon-green:#4ec47a --neon-amber:#e0a830 --neon-purple:#a888e8
--glow-accent:rgba(224,90,40,0.4) --glow-blue:rgba(90,159,212,0.4) --glow-green:rgba(78,196,122,0.4)
--glow-amber:rgba(224,168,48,0.4) --glow-purple:rgba(168,136,232,0.35) --glow-paper:rgba(240,235,226,0.15)
--rule:rgba(240,235,226,0.08) --rule-mid:rgba(240,235,226,0.14) --rule-strong:rgba(240,235,226,0.24)
--lt-bg:#0f0e0b (STANDARD PAGE BG) --lt-text:rgba(235,225,205,0.85) --lt-text-2:rgba(235,225,205,0.65)
--lt-text-3:rgba(235,225,205,0.42) --lt-rule:rgba(235,225,205,0.09) --lt-card:rgba(235,220,185,0.06)
--lt-card-bdr:rgba(235,220,185,0.1) --lt-card-bdr-sel:rgba(235,220,185,0.24)

⚠️ Invalid Variables — Never Use
--lt-surface→--ground-2 | --ground-raised→--ground-3 | --ground-base→--ground
--rule-color→--rule-mid | --paper-primary→--paper | --paper-secondary→--paper-3

Typography
Instrument Serif — display, titles, editorial, large numbers, status words (italic)
Instrument Sans  — body, descriptions, navigation (300/400/500)
Courier Prime    — badges, labels, metadata, buttons, counts, timestamps

Neon Color Assignments
Content submission → --neon-accent | Community → --neon-blue | Local → --neon-green
Private → --neon-purple | Communications → --neon-amber | Curate/save/confirm → --neon-green
Deadlines/urgency → --neon-accent | Submitted → --neon-accent italic | Draft → --paper-4 italic (no badge)
Saved → --neon-green italic | Sent → --neon-accent italic | "★ you contribute" → --neon-amber
Invite status: accepted → --neon-green | pending → --paper-4 | declined → --neon-accent

Press mechanic button:
font: var(--font-mono) 9px, letter-spacing 0.14em, uppercase; border-radius 2px;
border 1px var(--rule-mid); border-bottom 2px var(--ground-4);
box-shadow: 0 2px 0 var(--ground-4), 0 3px 6px rgba(0,0,0,0.4);
on press: translateY(2px) box-shadow none; on release: transition transform 0.18s cubic-bezier(0.34,1.56,0.64,1)
NEVER mix border shorthand with borderBottom.

Left border glow: border-left 2px var(--neon-[mode]); box-shadow -3px 0 10px -2px var(--glow-[mode]); background rgba([mode-rgb],0.05)
Thick paper rule: height 1px; background var(--paper) opacity 0.8; box-shadow 0 0 6px 1px rgba(240,235,226,0.25), 0 0 20px rgba(240,235,226,0.08)
Loading state: Courier Prime "loading…" in --paper-4. NEVER spinners.
Empty state: Instrument Serif italic 14px --paper-4.
Grain overlay + registration marks: applied globally in layout.tsx.

⚠️ Lucide React — Never Use. Inline SVGs only. Standing rule.

Profile Page — Structure (mobile-first)
1 IDENTITY (avatar, name, city, bio, identity banner) · 2 YOUR ROLES (add-only cards, content type) ·
3 MAILING ADDRESS (5 structured fields + ON FILE indicator) · 4 PAYMENT (placeholder, Stripe pending) · 5 SAVE (press mechanic)
Inputs: transparent bg, border-bottom 1px var(--rule-mid), radius 0, 12px 0 padding, 15px, var(--paper);
focus border-bottom var(--paper-3). Side-by-side pairs: flex gap 12px, each flex:1 min-width:0.

City List (src/lib/constants/cities.ts CITIES array)
Atlanta, Austin, Boston, Chicago, Dallas, Denver, Houston, Los Angeles, Miami, Nashville,
New Orleans, New York, Pensacola, Philadelphia, Phoenix, Portland, San Antonio, San Diego, San Francisco, Seattle

Collaboration System — Three Participation Modes
- Private — invite-only, 8–10 max, lead/member roles (see "Private Collaboration System")
- Community — open globally
- Local — city-specific, uses city field from collab_participants
IntegratedCollabsSection (curate collabs tab): shows all active templates; ★ amber badge where curator
contributes; independent toggles; Community=one row/template; Local=collapsible, one row/active city,
hidden when none; Private(seeded)=one row if joined; "Your Private Collabs"=separate section for
user-created (template_id=null) where curator is active participant.

Seed Data
Test Auth Users:
  contributor1@test.com  0889833d-d56a-4969-83b4-43c9585bcd92  Maya Torres   contributor
  contributor2@test.com  402f2415-65c1-4efa-a95e-c0ccb38f7048  Daniel Osei   contributor
  curator1@test.com      185f8c7c-9837-425a-ac1c-ebf18d1af1b9  Lena Vasquez  curator
  (Plus ~20 seeded contributor profiles for invite-search testing, most is_public=true.
   Dev's own account UUID: 2ad6af92-279d-4eb7-a1b6-b51ec042aa85 — has contributor+curator+admin.)
Seeded (Spring 2026): 3 collab templates, 3 collabs (community, local Austin, private);
  Maya "Street Light Studies"(2img)+"After the Rain"(1img); Daniel "Edges of Nothing"(1img Essay);
  2 campaigns (Moleskine, Risograph) w/ avatar_url. content_entries have real Supabase storage URLs —
  do not re-run seed.sql without restoring. Collab submissions use Unsplash URLs.
Running seed: paste scripts/seed.sql into Supabase SQL Editor. ⚠️ Re-running wipes manual media_url values.
Cleaning junk user-created test collabs:
  DELETE FROM collab_participants WHERE collab_id IN (SELECT id FROM collabs WHERE is_user_created=true);
  DELETE FROM curator_collab_selections WHERE collab_id IN (SELECT id FROM collabs WHERE is_user_created=true);
  DELETE FROM collab_submissions WHERE collab_id IN (SELECT id FROM collabs WHERE is_user_created=true);
  DELETE FROM collabs WHERE is_user_created=true;

Key Gotchas & Hard-Won Lessons

### Auth / Supabase
- NEVER @supabase/auth-helpers-nextjs (removed; crashes Next.js 16). @supabase/ssr only.
- All lib functions take supabase as first param — do not revert. Use .maybeSingle() not .single().
- profile_types RLS: own-row SELECT+INSERT PLUS read-all SELECT (for invite search). profiles RLS:
  public + own. Session cookie: sb-cbdiujvqpirrvzodfujm-auth-token (array, token at [0]).
- Server routes using service role: create service role client FIRST, fetch ALL data with it;
  verify auth with session client.

### Service Role Key
- Must be in BOTH .env.local AND Vercel env vars; use service_role NOT anon.
- Production symptoms: "supabaseKey is required" (missing) or "Invalid API key" (wrong/whitespace/anon).

### Collabs
- find-or-create join (no dup rows for same template_id+mode+city+period_id).
- First active joiner of private collab = 'lead'; rest 'member'. Private only — don't touch community/local.
- collab_participants has TWO FKs to profiles → NEVER PostgREST embed (PGRST201). Two-step fetch + merge.
- Counts accepted-only (invite_status='accepted' AND status='active'), null-safe for community/local.
- User-created: template_id=null, is_user_created=true, three fields (title/description/prompt_text).
- Brief: seeded from collab_templates.instructions; user-created falls back to collabs.prompt_text/description.
- Bulk-delete order (FK): curator_collab_selections → collab_submissions → collab_participants → collabs.

### Design
- Never mix border shorthand with borderBottom on same element. No lucide-react (inline SVGs).
- Music is NOT a content type. All page backgrounds (root+column+sticky header/footer) = --lt-bg.

### Database
- collab_templates uses name not title; collab_submissions uses caption not content.
- Prefer participation_mode over is_private. campaigns.discount is int4. One period is_active.
- media_url https:// only. Structured address fields (no single 'address' column). hasAddress=!!address_line1.
- profile_types: 'admin' via SQL only. collab_participants.role: organizer|member|lead. invite_status: pending|accepted|declined.

### Admin
- Admin via SQL only. /admin/* middleware-protected (non-admin→/dashboard, unauth→/auth).
- API needs SUPABASE_SERVICE_ROLE_KEY in Vercel; verify auth via session, fetch via service role.
- Focal corrections: UPDATE content_entries SET focal_x=<0–100>, focal_y=<0–100> WHERE id='<entry-id>'.

### Periods
- end_date gates submissions + invites. Past deadline → invite page read-only.
- Keep testing: UPDATE periods SET end_date='<future>' WHERE is_active=true.
- volume/issue read dynamically. NO period roll-forward UI — known gap.

### Onboarding
- window.location.href (NOT router.push) for redirect. .maybeSingle() guard on profile_types insert.
- DB writes on step 3 only. Middleware exempts /onboarding, /auth/*, /api/*, /_next/*, /favicon.ico, /admin/*.

### Curate Page
- Selections from DB on mount, not localStorage. Key magazine_selections_{user_id}. Address gate warns, never blocks.

### Magazine Templates
- ImageFrame hides crosshair/dot/label when real image present. Folio takes season as prop (no window._magazineSeason).
- No body text crosses center gutter on spreads (display titles ≥40px exempt).
- CollabSpreadLocal reads data.city; CampaignPage reads data.avatar_url; Cover reads data.volume/data.issue.

### Generator
- set -a && source .env.local && set +a && npm run generate-test. Needs SUPABASE_SERVICE_ROLE_KEY.
- networkidle0 waits for fonts+images. PDF → /tmp only. BlankPage inline in generator.ts.
- normalizeContentType() maps DB values to display labels for TOC. volume/issue dynamic from active period.

### Git / Codespaces — see "Branch Discipline" at top. Short version:
- Sync before: git fetch origin && git pull origin main; confirm git branch.
- Claude Code claims "main does not exist" / works on feature branch — always wrong.
- VERIFY after every session from Codespaces: git fetch origin && git log origin/main --oneline -3.
  If commit not on origin/main, push didn't land. Then git pull origin main.
- Diverged with local VS Code commit (e.g. CLAUDE.md edit): git fetch origin && git reset --hard origin/main
  (safe only when local change is reproducible). Vercel production branch must be main.

### Repository Hygiene
- Never commit PDFs (→/tmp only) or files over 50MB. magazine-test.pdf + /tmp/magazine-*.pdf in .gitignore.

Magazine Pricing
- Base $25.00/edition. Each campaign −$2.00. Target ~38–40 pages for 20 selections. Unit print ~$8–10 Magcloud.

Testing
- tests/contributor.spec.ts (Maya), tests/curator.spec.ts (Lena). 21/23 pass (2 known correct).
- Suite does NOT yet cover onboarding, new profile structure, or collab invite/accept flows.

Current Development Status
Completed ✅
- Full dark neon UI, standardized to --lt-bg page background everywhere
- Complete CSS variable system; all main pages built
- Magazine template system (18 templates) + generation pipeline (real images) + FrontMatter TOC
- Focal point selector on /submit; Music removed as content type
- @supabase/ssr migration; onboarding flow; curate address gate; profile restructure
- Email confirmation + custom SMTP (Resend); local city data in curate collabs tab
- Admin magazine preview (/admin + /admin/preview/[curatorId], admin-protected)
- profile_types 'admin' constraint; SUPABASE_SERVICE_ROLE_KEY in Vercel
- Volume/issue dynamic (periods.volume + periods.issue)
- User-created private collabs (/collabs/create, 3 fields, is_user_created, prompt_text)
- Full private collab lifecycle: create → invite (search/cap/deadline) → accept/decline →
  lead/member roles → accepted-only counts → curate visibility → dashboard invite affordance
- profiles + profile_types RLS policies for invite contributor search

Remaining / Known Issues ⚠️
1. Empty-state Content card on dashboard — when no submission exists, the main content card/tile should
   itself route to /submit on tap (like when populated); remove the separate "Submit work this season"
   row + button in the empty state. (NEXT UP — not yet built.)
2. Period roll-forward — no admin mechanism to close one season and open the next; SQL only.
3. Print fulfillment — Magcloud manual first, Mixam API later.
4. Magazine generation job tracking — pipeline writes /tmp, does not record in magazine_generation_jobs.
5. Stripe integration — curator payment not built; profile shows placeholder.
6. Subscription cancellation UI — blocked on Stripe.
7. Playwright suite — needs onboarding, new profile, collab invite/accept coverage.
8. Debug console.log statements remain in collab invite/create/dashboard code from troubleshooting —
   cleanup pass worthwhile before launch.

User Roles
- Contributors: submit content, join/create collabs, invite, send communications
- Curators: select content for their printed magazine
- Admins: review magazine previews before print — SQL-assigned only
- Users can be contributor + curator (+ admin) simultaneously. Roles add-only.

Product Decisions
- Music is not a content type. Musicians participate via Photography/Art/Essay/Poetry. No QR codes.
- Roles are add-only (no removal UI; handle edge cases via Supabase).
- Subscription cancellation handled manually via email until Stripe exists.
- Mailing address required to receive print, NOT to save curate selections (gate warns, never blocks).
- Curators do NOT get a magazine preview — the surprise of the physical copy is core. /admin preview is editor-only.
- Private collabs have ONE lead who manages invitations (first joiner for seeded, creator for user-created).
  Lead invites up to the 8–10 cap until the submission deadline. Members view roster, cannot invite.
- Launch philosophy: must feel complete, effective, and cool from the start. Stripe + a real print run
  with real contributor content are the true gates before opening to real users.
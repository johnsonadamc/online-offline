# Redesign "B" — Copy-Paste Playbook
### online//offline · Starting point: CLAUDE.md v2 committed, design package committed · September 2026

Commit this as `online-offline/_design/redesign-b/PLAYBOOK.md` (replace the old one).

**How to use:** one phase = one fresh Claude Code chat. Each prompt below is complete — paste the whole
block (between the `▶ PROMPT` and `◀ END` lines), nothing else. After Claude Code finishes, run the gate
listed under that phase from your Codespace. Then open a new chat for the next phase. Don't pause between
phases longer than you have to — the app is in a two-system state until Phase 13.

---

## STEP 0.3 — Capture the baseline (you, not Claude Code — do this FIRST)

In Supabase SQL Editor, run and save the output as `_design/redesign-b/baseline-selections.json`:
```sql
SELECT 'creator' AS kind, curator_id, creator_id::text AS ref, NULL AS mode, NULL AS loc, NULL AS src
  FROM curator_creator_selections WHERE period_id='aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'
UNION ALL SELECT 'collab', curator_id, collab_id::text, participation_mode, location, source_id
  FROM curator_collab_selections WHERE period_id='aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'
UNION ALL SELECT 'campaign', curator_id, campaign_id::text, NULL, NULL, NULL
  FROM curator_campaign_selections WHERE period_id='aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'
UNION ALL SELECT 'comm', curator_id, include_communications::text, NULL, NULL, NULL
  FROM curator_communication_selections WHERE period_id='aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'
ORDER BY 1,2,3;
```
In Codespaces, record the `Page sequence: N template slots, M total pages` line for each:
```bash
cd /workspaces/online-offline/online-offline
set -a && source .env.local && set +a
npm run generate-test
npm run generate-test -- --curator=2ad6af92-279d-4eb7-a1b6-b51ec042aa85
git add _design/redesign-b/baseline-selections.json && git commit -m "redesign: baseline snapshot" && git push origin HEAD:main
```

---

## THE GATES (run from Codespaces after the phase that names them)

**Gate C — every phase**
```bash
git fetch origin && git log origin/main --oneline -3      # phase commit at top?
git pull origin main
grep -n "Migrated pages so far" online-offline/CLAUDE.md   # updated by Claude Code?
```
Then wait for Vercel green, hard-refresh, check the page at 390px and desktop.

**Gate A — curate save payload (after Phases 9, 10, 11, 12)**
1. As Lena → /curate → change nothing → Save → re-run the baseline SQL → must be IDENTICAL to the JSON.
2. Toggle one contributor off → Save → SQL (one row gone). Toggle back on → Save → identical again.
3. Collabs tab: local Pensacola pill off, then on → Save → row returns with
   `source_id = local_<template>_Pensacola` and `location = 'Pensacola'`.
4. Regenerate Lena → page-sequence line matches baseline.
If 1–3 differ: STOP and paste the diff into chat.

**Gate B — page-specific DB writes (after the named phase)**
- Phase 1: throwaway account → confirm email → onboard → correct destination via full navigation;
  profiles + profile_types rows written on step 3 only.
- Phase 2: edit name/city/bio/address → Save → profiles row updated; add a role → row added, none removed;
  curate address banner behavior unchanged.
- Phase 4: accept + decline an invite (invite_status), withdraw a submission (content.status), leave a
  collab (collab_participants) — all change exactly as before.
- Phase 5: 3-image collection, feature #2, drag focal on #1, Save, reload → content_entries order_index
  0/1/2 in arranged order, exactly one is_feature, focal persisted, media_url all https://. Submit → status='submitted'.
- Phase 6: join community → one collab_participants row, no duplicate collabs row on second join; create
  private → is_user_created, template_id null, creator role='lead', invite_status='accepted'.
- Phase 7: invite → row with invite_status='pending' + invited_by; roster updates without reload;
  collab submit → collab_submissions row with caption.
- Phase 8: save draft / send → communications.status + word_count correct; withdraw works.

---

## PHASE 0 — Foundation: tokens, fonts, all primitives
Gate: C only.

▶ PROMPT
Read CLAUDE.md in full — especially the "Design System v2" and "Branch Discipline" sections. Sync to main (`git checkout main && git fetch origin && git pull origin main`), confirm `git branch`, and report the latest 3 commits before changing anything.

Orientation: online//offline is a Next.js 16 / Supabase app. We are executing a 14-phase visual redesign ("Design System v2 / B") of every app screen, one phase per session, with all existing behavior preserved. Full specs are in `_design/redesign-b/README.md` (Dashboard + Curate) and `_design/redesign-b/README-pages.md` (all other screens); visual references are `_design/redesign-b/online-offline-app-redesign-B-final.html` and `-B-pages.html` (read their CSS for exact values; the HTML is reference only, never shipped). The magazine generator under `src/magazine/**` is a separate print system and must never be touched by redesign work. Music is not a content type. No lucide-react (inline SVGs). Do not restyle `src/components/ui/` (shadcn) — it is retired in Phase 13.

THIS SESSION — Phase 0: foundation only. No visible UI change on any page.
1. `globals.css` `:root`: add every Design System v2 token listed in CLAUDE.md (`--bg`, `--bg2`, `--line`, `--line2`, `--ink`, `--ink2`, `--ink3`, `--orange`, `--gold`, `--green`, `--blue`, `--purple`). Do NOT remove or rename any v1 token — both systems coexist until Phase 13.
2. Font loading (`layout.tsx` or wherever fonts load): add Google Fonts Hanken Grotesk 400/500 and JetBrains Mono 400/500; expose `--font-sans-v2` and `--font-mono-v2`. Keep every v1 font.
3. Create `src/components/v2/` and build these presentational primitives per README "Design tokens" / "Color rules" and the primitives card at the bottom of `-B-pages.html` (read its CSS): `IconTile` (48px; `accent` prop → border + icon + 10% tint), `TypeTile` (28px, r7, 12% tint by type: photography blue / art purple / writing gold / community blue / local green / private purple), `Pill` (34px, full radius; two variants: icon+mono-count and label; states default / selected = filled mode color / dimmed), `SectionLabel` (10px mono .18em uppercase), `Sheet` (240ms slide-up, 45% scrim, r20 top, grabber, closes on scrim tap), `Toast`, `SwipeRow` (touch swipe-left reveals an 84px action; long-press and hover "···" fallbacks open the same action; must not steal vertical scroll or the row's own tap), `Input` (borderless, bottom hairline, ink on focus; serif size variant), `Select` (native select styled like Input), `Textarea`, `WordCount` (gold; orange past limit), `SegmentedToggle`, `ChoiceCard`, `FocalPointFrame` (aspect prop 4:3 / 1:1; crosshair at focal_x/focal_y; drag or tap sets it; live "CROP CENTER x%, y%" label; optional ★ Feature and × slots), `ThumbStrip`, `SearchField`, `RosterRow` (avatar/initial, name, TypeTile, right slot, optional mono sub-line), `StatusDot` (7px; green / line2 / orange), `Brief` (gold PROMPT label, serif body, collapsible), `ProgressSteps`, `Toggle` (gold). Every primitive is props-in / callbacks-out — no data fetching, no Supabase imports.
4. Add `src/components/v2/README.md` listing each primitive's props. `npx tsc --noEmit` must be clean. No page imports the primitives yet.

Before writing code, report the files you'll touch. If any primitive in the list has no counterpart in the design HTML, say so rather than inventing it.

Closing step — required, same commit: update CLAUDE.md with targeted `str_replace` edits (never rewrite the file): (1) in the "Design System v2" section, set `Migrated pages so far:` to `Phase 0 foundation (tokens, fonts, v2 primitives) — no pages yet`; (2) add one line under Project Structure for `components/v2/` if it isn't already described; (3) add one line for any gotcha you hit. Keep CLAUDE.md's dense one-line-per-fact style. Then commit code + CLAUDE.md together, push to main, run `git log --oneline -3`, and list every file touched.
◀ END

---

## PHASE 1 — Sign in (`/`) + Onboarding
Gate: B (Phase 1) + C.

▶ PROMPT
Read CLAUDE.md in full — especially the "Design System v2" and "Branch Discipline" sections. Sync to main (`git checkout main && git fetch origin && git pull origin main`), confirm `git branch`, and report the latest 3 commits before changing anything.

Orientation: online//offline is a Next.js 16 / Supabase app mid-way through a 14-phase visual redesign ("Design System v2"). Phase 0 built the v2 tokens, fonts, and primitives in `src/components/v2/` (read its README.md). Specs: `_design/redesign-b/README-pages.md` (§8 Onboarding, §9 Sign in, and its Functional mapping). Visual reference: frames "Onboarding" and "Sign in" in `_design/redesign-b/online-offline-app-redesign-B-pages.html` — read the CSS for exact values; the HTML is reference only. Every existing handler, route, state, and DB write is preserved. Music is not a content type. No lucide-react. Do not touch `src/magazine/**`, `src/lib/supabase/curation.ts`, DB schema, or `src/components/ui/`.

THIS SESSION — Phase 1: `src/app/page.tsx` (auth) and `src/app/onboarding/page.tsx`.
- Auth: centered wordmark 34px, 40px hairline, Email + Password `Input`s, INK primary button ("Sign in" / "Create account" — ink, not green, per README-pages §9), link "Need an account? Sign up" toggling the existing `isSignUp`; `handleAuth` unchanged; loading state = button label "Working…". Remove any leftover footer tagline.
- Onboarding: header wordmark + mono "N / 3"; `ProgressSteps`; Step 1 First/Last `Input`s; Step 2 serif 30px "How will you take part?" + three radio rows Contributor / Curator / Both → the existing handlers (e.g. `handleToggleContributor`), then a WHAT DO YOU MAKE? row of type `Pill`s Photo / Art / Writing (no Music) → `handleTogglePill`; Step 3 summary + ink primary "Enter online//offline →" → `handleEnter`. Footer ghost Back + ink Continue.
- PRESERVE EXACTLY: DB writes only on step 3; `.maybeSingle()` guard on the profile_types insert; the post-onboarding redirect via `window.location.href` (never `router.push`); redirect targets contributor → /submit, curator → /curate, both → /submit; the middleware exemption behavior.

Before writing code, report the files you'll change and which existing handler each new element calls. Then implement with targeted edits, keeping every handler name and call signature.

Closing step — required, same commit: update CLAUDE.md with targeted `str_replace` edits (never rewrite the file): (1) in "Design System v2", append `/ (auth), /onboarding` to the `Migrated pages so far:` line; (2) add one line for any gotcha you hit. Then commit code + CLAUDE.md together, push to main, `git log --oneline -3`, and list every file touched.
◀ END

---

## PHASE 2 — Profile
Gate: B (Phase 2) + C.

▶ PROMPT
Read CLAUDE.md in full — especially the "Design System v2" and "Branch Discipline" sections. Sync to main (`git checkout main && git fetch origin && git pull origin main`), confirm `git branch`, and report the latest 3 commits before changing anything.

Orientation: online//offline is a Next.js 16 / Supabase app mid-way through a 14-phase visual redesign ("Design System v2"). v2 primitives live in `src/components/v2/` (read its README.md). Spec: `_design/redesign-b/README-pages.md` §7 Profile + its Functional mapping. Visual reference: frames "Profile" and "Profile lower" in `_design/redesign-b/online-offline-app-redesign-B-pages.html` — read the CSS for exact values; HTML is reference only. Every existing handler, route, state, and DB write is preserved. Music is not a content type. No lucide-react. Do not touch `src/magazine/**`, `src/lib/supabase/curation.ts`, DB schema, or `src/components/ui/`.

THIS SESSION — Phase 2: `src/app/profile/page.tsx`.
Header: "‹ Dashboard", wordmark, "Profile" in gold. Sections in the EXISTING code order with `SectionLabel`s:
- IDENTITY: 64px avatar + "Change photo" → existing avatar upload; First/Last two-up `Input`s; City `Select` from `src/lib/constants/cities.ts`; Bio `Textarea`; identity-banner dashed 88px drop zone → existing `uploadBanner`, with the note "Shown to curators when selecting contributors. Not a preview of submitted work."
- YOUR ROLES: role cards (tile + serif name + mono "active", or outlined "Add" → the existing add-role path); ADD-ONLY, no removal UI; contributor shows type `Pill`s Photo / Art / Writing → existing content-type setter.
- Public profile `Toggle` (gold) → `isPublic`; permissions note collapsed under a "?".
- MAILING ADDRESS: 5 `Input`s (address_line1/2, city, state, zip); green mono "on file" beside the label when `!!address_line1`.
- PAYMENT: one italic line per role — placeholders, no logic.
- ACCESS REQUESTS: `RosterRow` + green "Approve" / quiet "Deny" → `handleApproveRequest` / `handleDenyRequest`.
- CONNECTIONS: `RosterRow`s; `SearchField` → `handleFollowRequest`; "···" opens a `Sheet` with Remove / Block → `handleUnfollow` / `handleBlockUser`.
- BLOCKED: hidden when empty; "Unblock" → `handleUnblockUser`.
- Footer: green primary Save → the existing upsert.
If any of the ACCESS REQUESTS / CONNECTIONS / BLOCKED / toggle handlers do NOT exist in the current code, do not build them — report it and skip that section.

Before writing code, report the files you'll change and which existing handler each new element calls. Then implement with targeted edits, keeping every handler name and call signature.

Closing step — required, same commit: update CLAUDE.md with targeted `str_replace` edits (never rewrite the file): (1) in "Design System v2", append `/profile` to the `Migrated pages so far:` line; (2) update the "Profile Page — Structure" section to the v2 structure you actually built (one line per section); (3) add one line for any gotcha you hit. Then commit code + CLAUDE.md together, push to main, `git log --oneline -3`, and list every file touched.
◀ END

---

## PHASE 3 — Dashboard shell
Gate: C.

▶ PROMPT
Read CLAUDE.md in full — especially the "Design System v2" and "Branch Discipline" sections. Sync to main (`git checkout main && git fetch origin && git pull origin main`), confirm `git branch`, and report the latest 3 commits before changing anything.

Orientation: online//offline is a Next.js 16 / Supabase app mid-way through a 14-phase visual redesign ("Design System v2"). v2 primitives live in `src/components/v2/` (read its README.md). Spec: `_design/redesign-b/README.md` → "Screens → Dashboard" items 1–3 and 5, plus "Functional mapping — Dashboard". Visual reference: frames "Dashboard content / collabs / comms" in `_design/redesign-b/online-offline-app-redesign-B-final.html` — read the CSS; HTML is reference only. Every existing handler, route, state, and DB write is preserved. Music is not a content type. No lucide-react. Do not touch `src/magazine/**`, `src/lib/supabase/curation.ts`, DB schema, or `src/components/ui/`.

THIS SESSION — Phase 3: `src/app/dashboard/page.tsx` — OUTER CHROME ONLY. The contents of the expanded sections stay exactly as they are (Phase 4).
- Header: wordmark (Instrument Serif 22px, the `//` in `--ink3`) left; 32px avatar → `/profile` right.
- Season bar: italic serif season name; 1px track with `--orange` fill = elapsed % of the active period; right side days-remaining (mono, orange 500) + "remaining" (mono, `--ink2`). Reuse the existing countdown data. When ≤7 days: stronger orange + glow — the only urgency signal.
- Tabs CONTRIBUTE / CURATE (Hanken 12–13px 500 uppercase .12–.14em; 1px `--ink` underline on active); Curate → `/curate` (existing).
- Three rows Content / Collaborations / Communications: 48px `IconTile` (camera / people / envelope, 1.5 stroke, `--ink2`), serif 24px title, right-aligned count (serif 20px `--ink2`), 14px chevron rotating 90° (200ms) → existing `toggleSection`. Active row's tile takes the section color (orange / blue / gold). REMOVE the text subtitles. Rows separated by `--line` hairlines. Page bg `--bg`, 24px side padding, max ~560px centered.
- The existing expanded markup must still render inside the new rows with every handler firing. Skip the "Up next" strip (Phase 4).

Before writing code, report where each row's count already comes from (no new queries) and the files you'll change. Then implement with targeted edits.

Closing step — required, same commit: update CLAUDE.md with targeted `str_replace` edits (never rewrite the file): (1) in "Design System v2", append `/dashboard (shell)` to the `Migrated pages so far:` line; (2) add one line for any gotcha you hit. Then commit code + CLAUDE.md together, push to main, `git log --oneline -3`, and list every file touched.
◀ END

---

## PHASE 4 — Dashboard expanded sections + Up-next strip
Gate: B (Phase 4) + C.

▶ PROMPT
Read CLAUDE.md in full — especially the "Design System v2" and "Branch Discipline" sections. Sync to main (`git checkout main && git fetch origin && git pull origin main`), confirm `git branch`, and report the latest 3 commits before changing anything.

Orientation: online//offline is a Next.js 16 / Supabase app mid-way through a 14-phase visual redesign ("Design System v2"). v2 primitives live in `src/components/v2/` (read its README.md). Spec: `_design/redesign-b/README.md` → "Screens → Dashboard → Expanded content" and item 4 (Up next), plus "Functional mapping — Dashboard" (the contract). Visual reference: frames "Dashboard content / collabs / comms" in `_design/redesign-b/online-offline-app-redesign-B-final.html`. Every existing handler, route, state, and DB write is preserved. Music is not a content type. No lucide-react. Do not touch `src/magazine/**`, `src/lib/supabase/curation.ts`, DB schema, or `src/components/ui/`.

THIS SESSION — Phase 4: `src/app/dashboard/page.tsx` expanded sections + the Up-next strip.
- CONTENT: 56px thumbnail, serif 21px title, 12.5px meta ("2 images · Photo"), italic serif orange "submitted" (draft: no word); tap → `/submit?draft=<id>`; quiet action line below: "Withdraw" (submitted) / "Delete" (orange) → `handleWithdrawContent` / `handleDeleteContent` with the existing confirm dialogs. Empty state: the card itself → `/submit` (keep the one-tap empty-state behavior; label "+ Submit work").
- COLLABORATIONS: `SectionLabel`s INVITED then ACTIVE. Row: 28px `TypeTile` (lock purple / people blue / pin green), serif 19px name, right slot. Invited rows: outlined "Accept" (gold) / "Decline" → `handleAcceptInvite` / `handleDeclineInvite`; invited rows do NOT route to content. Active rows: green ✓ glyph if submitted, else empty 22px slot. Private rows: 28px outlined add-person icon → `/collabs/[id]/invite` (keep the existing lead → "invite" / member → "participants" routing). Row body tap → `/collabs/[id]/submit` in ONE tap (unchanged). Leave: `SwipeRow` reveals an 84px orange "Leave" → existing `leaveCollab` confirm; the × button is removed; long-press + hover "···" fallbacks come from SwipeRow. Footer "Join a new collaboration" + 36px "+" square → `/collabs`.
- COMMUNICATIONS: 28px gold tile with recipient initial, serif 19px name, italic serif one-line preview (ellipsis), right ✓ if submitted; tap → `/communicate/[id]`; `SwipeRow` → Withdraw (submitted) / Delete (draft) → `withdrawCommunication` / `deleteDraftCommunication` with existing confirms. Footer "Write to a curator" + → `/communicate/new`.
- UP NEXT (new code): 12px-radius card, `--bg2`, `--line2` border, faint gold radial at left; "UP NEXT" 10px mono gold; serif 19px message; right outlined "View". Show at most ONE; hidden entirely if none. Priority: pending invite → "X invited you" (View opens the Collaborations row) · unsubmitted collab due ≤14d → "X due in N days" (→ that collab's submit) · draft communication → "Finish your note to X" (→ `/communicate/[id]`) · no content this season → "Submit your first piece" (→ `/submit`). Use only data the dashboard already loads — no new queries.

Before writing code, report the files you'll change, which existing handler each element calls, and how `SwipeRow` disambiguates tap vs swipe vs vertical scroll. Then implement with targeted edits, keeping every handler name and call signature.

Closing step — required, same commit: update CLAUDE.md with targeted `str_replace` edits (never rewrite the file): (1) in "Design System v2", change `/dashboard (shell)` to `/dashboard` on the `Migrated pages so far:` line; (2) update the "Dashboard invite affordance" bullet (× replaced by swipe Leave; add-person icon) and the "Dashboard — Content card" section to match what you built; (3) add one line for any gotcha you hit. Then commit code + CLAUDE.md together, push to main, `git log --oneline -3`, and list every file touched.
◀ END

---

## PHASE 5 — Submit (SubmissionForm)
Gate: B (Phase 5) + C. HIGH CARE — this writes order_index / focal / feature.

▶ PROMPT
Read CLAUDE.md in full — especially "Design System v2", "Content / Submit" gotchas, and "Branch Discipline". Sync to main (`git checkout main && git fetch origin && git pull origin main`), confirm `git branch`, and report the latest 3 commits before changing anything.

Orientation: online//offline is a Next.js 16 / Supabase app mid-way through a 14-phase visual redesign ("Design System v2"). v2 primitives live in `src/components/v2/` (read its README.md). Spec: `_design/redesign-b/README-pages.md` §1 + Functional mapping "SubmissionForm". Visual reference: frames "Submit image" and "Submit text" in `_design/redesign-b/online-offline-app-redesign-B-pages.html`. Every existing handler, route, state, and DB write is preserved. Music is not a content type. No lucide-react. Do not touch `src/magazine/**`, `src/lib/supabase/curation.ts`, DB schema, or `src/components/ui/`.

THIS SESSION — Phase 5: `src/components/SubmissionForm.tsx` and `src/app/submit/page.tsx`.
BEFORE ANY CODE, quote verbatim: the entry insert/update code (the SEQUENTIAL insert that sets `order_index` — never Promise.all), the focal-point write, `handleSetFeature`, `handleRemoveImage`, `handleAddEntry`, and the draft-load sort by `order_index`. These stay byte-identical.
Then rebuild the surface:
- Header: "‹ Dashboard" left; center italic serif status word (`draft` in `--ink3` / `submitted` in orange); right mono days remaining.
- Title `Input` serif 26px, placeholder per the existing label logic ("Collection title" / "Title").
- `SegmentedToggle` IMAGE / TEXT → `format`.
- IMAGE mode: `ChoiceCard` pair Collection ("1–8 images, one featured") / Full spread ("Single image, full page") → `submissionType`. `FocalPointFrame` 4:3, orange crosshair bound to `focal_x`/`focal_y` (drag or tap → the existing setter), live "CROP CENTER x%, y%", "★ Feature" bottom-right in collection mode (filled orange when `isFeature` → `handleSetFeature`), × top-right → `handleRemoveImage`; empty state dashed frame + italic "Add an image". `ThumbStrip` (collection only): order = `order_index`, tap → `setCurrentSlide`, ★ on the feature, dashed + → `handleAddEntry` (hidden at 8), "N / 8" at right. Per-image `Input` "Image N title" + caption `Input`. Keep the frame swipe for prev/next.
- TEXT mode: title `Input` + serif 17px `Textarea` ("Write your piece here…"); below it mono "Reads as **poetry / essay** · N words" from the existing auto-detect — no picker.
- Footer: Save (secondary → `handleSaveDraft`) + Submit (orange primary with glow → `handleSubmit`). Submitted state: footer becomes Withdraw (ghost) + Edit (secondary); fields read-only.
- `handleCopyTags` is removed from the UI (tags aren't shown); say whether you left the handler or deleted it.
Do not change upload logic, `media_url` handling, or the entry insert order.

Report the files you'll change and the handler mapping before implementing. After implementing, quote the insert/focal/feature code again and confirm it is unchanged.

Closing step — required, same commit: update CLAUDE.md with targeted `str_replace` edits (never rewrite the file): (1) in "Design System v2", append `/submit` to the `Migrated pages so far:` line; (2) add one line for any gotcha you hit. Then commit code + CLAUDE.md together, push to main, `git log --oneline -3`, and list every file touched.
◀ END

---

## PHASE 6 — Collabs browse + create
Gate: B (Phase 6) + C.

▶ PROMPT
Read CLAUDE.md in full — especially "Design System v2", the "Collabs" gotchas, and "Branch Discipline". Sync to main (`git checkout main && git fetch origin && git pull origin main`), confirm `git branch`, and report the latest 3 commits before changing anything.

Orientation: online//offline is a Next.js 16 / Supabase app mid-way through a 14-phase visual redesign ("Design System v2"). v2 primitives live in `src/components/v2/` (read its README.md). Spec: `_design/redesign-b/README-pages.md` §2–3 + Functional mapping "collabs/page" and "collabs/create". Visual reference: frames "Collabs browse" and "Collab create" in `_design/redesign-b/online-offline-app-redesign-B-pages.html`. Every existing handler, route, state, and DB write is preserved. Music is not a content type. No lucide-react. Do not touch `src/magazine/**`, `src/lib/supabase/curation.ts`, `collabs.ts` write paths, DB schema, or `src/components/ui/`.

THIS SESSION — Phase 6: `src/app/collabs/page.tsx` and `src/app/collabs/create/page.tsx`.
BEFORE ANY CODE, quote verbatim `handleJoinClick` for all three modes, including the find-or-create query, the first-joiner-becomes-lead logic, and the routing (lead → `/collabs/[id]/invite`, member → `/dashboard`). These stay identical.
Browse: header "‹ Dashboard", wordmark, "Collabs" in gold; no legend. One card per template (r12, `--bg2`, `--line` border, 18px padding): serif 22px title + italic serif 14.5px description at full width. Card footer above a `--line` hairline: three equal-width labeled `Pill`s "Community" / "Local" / "Private" → `handleJoinClick(id, title, mode)`; community joins directly; local opens the city `Sheet` then joins; private is find-or-create with lead routing. Joined pill fills with its mode color and reads "Joined" (local: city abbreviation); mono "lead" sub-line where relevant. Empty: italic "You've joined all available prompts for this period." Bottom: dashed "Start your own" card with purple + tile → `/collabs/create`.
Create: header "‹ Collabs", wordmark, "Private" in purple; hero serif 30px "Start a private collab" + one line; EXACTLY three fields — Name (serif `Input` → title), Description (`Textarea`, "What is this collab about? Shown publicly." → description), Prompt (`Textarea` → prompt_text); footer purple primary "Create and invite" → `handleCreate` → `/collabs/[id]/invite`. Non-contributor redirect unchanged.

Report the files you'll change and the handler mapping before implementing. After implementing, quote `handleJoinClick` again and confirm it is unchanged.

Closing step — required, same commit: update CLAUDE.md with targeted `str_replace` edits (never rewrite the file): (1) in "Design System v2", append `/collabs, /collabs/create` to the `Migrated pages so far:` line; (2) add one line for any gotcha you hit. Then commit code + CLAUDE.md together, push to main, `git log --oneline -3`, and list every file touched.
◀ END

---

## PHASE 7 — Invite + collab submit
Gate: B (Phase 7) + C.

▶ PROMPT
Read CLAUDE.md in full — especially "Design System v2", "Private Collaboration System", the "Collabs" gotchas, and "Branch Discipline". Sync to main (`git checkout main && git fetch origin && git pull origin main`), confirm `git branch`, and report the latest 3 commits before changing anything.

Orientation: online//offline is a Next.js 16 / Supabase app mid-way through a 14-phase visual redesign ("Design System v2"). v2 primitives live in `src/components/v2/` (read its README.md). Spec: `_design/redesign-b/README-pages.md` §4–5 + Functional mapping "invite" and "collab submit". Visual reference: frames "Collab invite" and "Collab submit" in `_design/redesign-b/online-offline-app-redesign-B-pages.html`. Every existing handler, route, state, and DB write is preserved. Music is not a content type. No lucide-react. Do not touch `src/magazine/**`, `src/lib/supabase/curation.ts`, DB schema, or `src/components/ui/`.

THIS SESSION — Phase 7: `src/app/collabs/[id]/invite/page.tsx` and `src/app/collabs/[id]/submit/page.tsx`.
Invite — PRESERVE: the two-step participants → profiles fetch (never a PostgREST embed on collab_participants — PGRST201), the `isLead` gate, `deadlinePassed`, `handleInvite`, the 8–10 cap, and the post-invite `loadData()` refresh. Surface: hero serif collab name + mono "N / 10"; lead sees `SearchField` "Search by name…" with `RosterRow` results (avatar, F. Lastname, `TypeTile`, purple outlined "Invite" → `handleInvite`; afterwards a quiet "Invited"); PARTICIPANTS section of `RosterRow`s with "lead" as a mono sub-line and a `StatusDot` (green accepted / line2 pending / orange declined) with a one-time legend; member sees the roster only; deadline passed → italic "Invitations closed — the submission deadline has passed." replaces the search; footer ink "Done" → `/collabs`.
Collab submit — header like `/submit`; hero: mode `TypeTile` (people / pin / lock in mode color) + serif 26px title + mono city if local; `Brief` panel (gold PROMPT label, serif body from `instructions || prompt_text`, chevron collapses); `FocalPointFrame` 1:1 with mode-color crosshair → `handleFileChange`; `Input` title + `Input` caption → `handleInputChange`; footer Save / Submit → `handleSubmit(false)` / `handleSubmit(true)`; submitted state: fields disabled, gold-outlined "Revert to draft" → `handleRevertToEdit` + disabled Submit; success/error → `Toast`.

Report the files you'll change and the handler mapping before implementing.

Closing step — required, same commit: update CLAUDE.md with targeted `str_replace` edits (never rewrite the file): (1) in "Design System v2", append `/collabs/[id]/invite, /collabs/[id]/submit` to the `Migrated pages so far:` line; (2) update the "Roster status badges" bullet under "Private Collaboration System" to the StatusDot treatment; (3) add one line for any gotcha you hit. Then commit code + CLAUDE.md together, push to main, `git log --oneline -3`, and list every file touched.
◀ END

---

## PHASE 8 — Communicate
Gate: B (Phase 8) + C.

▶ PROMPT
Read CLAUDE.md in full — especially "Design System v2" and "Branch Discipline". Sync to main (`git checkout main && git fetch origin && git pull origin main`), confirm `git branch`, and report the latest 3 commits before changing anything.

Orientation: online//offline is a Next.js 16 / Supabase app mid-way through a 14-phase visual redesign ("Design System v2"). v2 primitives live in `src/components/v2/` (read its README.md). Spec: `_design/redesign-b/README-pages.md` §6 + Functional mapping "communicate/[id]". Visual reference: frame "Communicate new" in `_design/redesign-b/online-offline-app-redesign-B-pages.html`. Every existing handler, route, state, and DB write is preserved. No lucide-react. Do not touch `src/magazine/**`, `src/lib/supabase/curation.ts`, DB schema, or `src/components/ui/`.

THIS SESSION — Phase 8: `src/app/communicate/[id]/page.tsx` (`/communicate/new` re-exports it — keep that).
Header: "‹ Dashboard", italic status word, "Note" in gold. Recipient hero: TO label + serif 30px name with chevron → `SearchField` "Search for a curator…" → `handleSearchChange`; if the recipient is private and `hasPermission` is false → italic "Request access to X's profile before sending." + Request pill, Send disabled (existing gate). Subject `Input` italic serif 18px. `Textarea` ≥220px. `WordCount` "N / LIMIT" in gold, orange past `WORD_LIMIT`. Dashed "Add an image (optional)" → the existing image handling. Footer: "Save draft" (secondary → `handleSaveDraft`) + "Send" (gold primary with glow → `handleSubmit`, disabled under the existing condition). Submitted view: all read-only; footer = ghost "Withdraw" → `handleWithdraw`. Error banner → `Toast`.

Report the files you'll change and the handler mapping before implementing.

Closing step — required, same commit: update CLAUDE.md with targeted `str_replace` edits (never rewrite the file): (1) in "Design System v2", append `/communicate/*` to the `Migrated pages so far:` line; (2) add one line for any gotcha you hit. Then commit code + CLAUDE.md together, push to main, `git log --oneline -3`, and list every file touched.
◀ END

---

## PHASE 9 — Curate shell (meter, tabs, footer)
Gate: A (full) + C. HIGH CARE — first touch of the save path.

▶ PROMPT
Read CLAUDE.md in full — especially "Design System v2", "Curation Selections", the "Curate Page" gotchas, and "Branch Discipline". Sync to main (`git checkout main && git fetch origin && git pull origin main`), confirm `git branch`, and report the latest 3 commits before changing anything.

Orientation: online//offline is a Next.js 16 / Supabase app mid-way through a 14-phase visual redesign ("Design System v2"). v2 primitives live in `src/components/v2/` (read its README.md). Spec: `_design/redesign-b/README.md` → "Screens → Curate" items 1–4 + "Functional mapping — Curate". Visual reference: the chrome of frame "Curate contributors" in `_design/redesign-b/online-offline-app-redesign-B-final.html`. THE CURATE SAVE PAYLOAD IS WHAT THE MAGAZINE GENERATOR READS — every row written to curator_*_selections must stay byte-identical. Every existing handler, route, state, and DB write is preserved. Music is not a content type. No lucide-react. Do not touch `src/magazine/**`, `src/lib/supabase/curation.ts`, `src/components/IntegratedCollabsSection.tsx` (Phase 11), DB schema, or `src/components/ui/`.

THIS SESSION — Phase 9: `src/app/curate/page.tsx` — the page shell only. Tab contents are unchanged this phase.
BEFORE ANY CODE, quote verbatim: the save function's DB-write calls, `calculatePrice`, `usedSlots`, `remainingContent`, the selection state shape, and the `magazine_selections_{user_id}` localStorage usage. All stay byte-identical.
- Header: "‹ Dashboard" left, small wordmark, "Curate" in green right. Page bg `--bg`.
- PAGE METER replaces the stats strip: 20 bars 4px×28px, 3px gap; `--line2` empty, `--ink2` filled for saved selections, `--green` + glow (`0 0 10px green/.5`) for selections made this session; driven by the existing `usedSlots` / `remainingContent`. Right: serif 20px "Your Spring issue" (season from the active period), mono "N of 20 pages · M open" with M in green. Tap the meter → `Sheet` listing everything currently selected (the existing "Added to magazine" list) with a remove control that calls the SAME toggle functions the tabs use. Search icon at far right expands into the existing search field.
- Tabs CONTRIBUTORS / COLLABS / COMMS / ADS with mono `--ink3` counts — same tab state, same counts.
- Address banner (if shown) sits above the tabs; logic unchanged (warns, never blocks).
- Sticky footer: "YOUR PRICE" 10.5px mono + serif 26px price from `calculatePrice`; "Reset" (`--ink3`, right-aligned → existing reset); green Save (the ONLY glowing element: `0 0 28px green/.35`) → the existing save; replace the `alert()` on save with `Toast`, then navigate to `/dashboard`. Price appears ONLY in the footer — remove it anywhere else it renders.
- Remove `music` from the `tc` map. Loading / empty / error restyled (mono "loading…", italic line), same logic.

Report the files you'll change and the handler mapping before implementing. After implementing, quote the save function's DB-write calls again and confirm they are unchanged.

Closing step — required, same commit: update CLAUDE.md with targeted `str_replace` edits (never rewrite the file): (1) in "Design System v2", append `/curate (shell)` to the `Migrated pages so far:` line; (2) update the "Curate Page — Address Gate" line about where the banner sits; (3) add one line for any gotcha you hit. Then commit code + CLAUDE.md together, push to main, `git log --oneline -3`, and list every file touched.
◀ END

---

## PHASE 10 — Curate Contributors + Ads tabs
Gate: A (steps 1–2 + 4) + C.

▶ PROMPT
Read CLAUDE.md in full — especially "Design System v2", "Curation Selections", and "Branch Discipline". Sync to main (`git checkout main && git fetch origin && git pull origin main`), confirm `git branch`, and report the latest 3 commits before changing anything.

Orientation: online//offline is a Next.js 16 / Supabase app mid-way through a 14-phase visual redesign ("Design System v2"). v2 primitives live in `src/components/v2/` (read its README.md). Spec: `_design/redesign-b/README.md` → "Contributors tab" and "Ads tab" + "Functional mapping — Curate". Visual reference: frames "Curate contributors" and "Curate ads" in `_design/redesign-b/online-offline-app-redesign-B-final.html`. THE CURATE SAVE PAYLOAD IS WHAT THE MAGAZINE GENERATOR READS — do not change what a selection writes, only how a card looks and what it calls on tap. Music is not a content type. No lucide-react. Do not touch `src/magazine/**`, `src/lib/supabase/curation.ts`, `IntegratedCollabsSection.tsx`, DB schema, or `src/components/ui/`.

THIS SESSION — Phase 10: the Contributors and Ads tab bodies in `src/app/curate/page.tsx`.
Contributors: 2-col grid, 10px gap, r12 cards. Cover 78px = `identity_banner_url` if present → else avatar → else type-tinted gradient with type icon (photography blue / art purple / poetry+essay gold — no music). Body: serif 17px "F. Lastname" + 20px `TypeTile`. Selected: 22px green disc ✓ top-right (glow) + green border — nothing else. Private without access: card 70% opacity, lock in cover, outlined "Request access" → `handleRequestFollow`; pending → plain "Request sent". Keep the existing stable selected-first sort. When `remainingContent === 0`, unselected cards dim to 40% and are non-selectable (existing gate). Filter chips All / Photo / Art / Writing above the grid — client-side only on `content_type` (Writing = poetry + essay). Dot legend on first visit only (localStorage flag). Remove the "Contributor"/season text from cards. Card tap → the SAME toggle used today.
Ads: same 2-col card grid. Cover = `avatar_url` or wordmark on a dark brand-tinted gradient. Body: serif 17px name; mono green "−$2" (from `campaigns.discount`) as the only meta. Note line above the grid: "Each ad is one page and takes $2 off." + running total. Selected/dim states identical to Contributors. Toggle → the SAME campaign toggle used today.

Report the files you'll change and the toggle each card calls before implementing.

Closing step — required, same commit: update CLAUDE.md with targeted `str_replace` edits (never rewrite the file): (1) in "Design System v2", change `/curate (shell)` to `/curate (shell, contributors, ads)` on the `Migrated pages so far:` line; (2) add one line for any gotcha you hit. Then commit code + CLAUDE.md together, push to main, `git log --oneline -3`, and list every file touched.
◀ END

---

## PHASE 11 — Curate Collabs tab (IntegratedCollabsSection)
Gate: A (FULL, incl. step 3) + C. HIGHEST RISK — writes source_id / participation_mode / location.

▶ PROMPT
Read CLAUDE.md in full — especially "Design System v2", "Curation Selections", "Private Collaboration System → Curate visibility", the "Collabs" gotchas, and "Branch Discipline". Sync to main (`git checkout main && git fetch origin && git pull origin main`), confirm `git branch`, and report the latest 3 commits before changing anything.

Orientation: online//offline is a Next.js 16 / Supabase app mid-way through a 14-phase visual redesign ("Design System v2"). v2 primitives live in `src/components/v2/` (read its README.md). Spec: `_design/redesign-b/README.md` → "Collabs tab" + "Functional mapping — Curate". Visual reference: frames "Curate collabs" and "Curate city sheet" in `_design/redesign-b/online-offline-app-redesign-B-final.html`. THIS COMPONENT WRITES THE source_id / participation_mode / location THAT THE MAGAZINE GENERATOR READS — the toggle calls must stay byte-identical. Music is not a content type. No lucide-react. Do not touch `src/magazine/**`, `src/lib/supabase/curation.ts`, `collabLibrary.ts`, DB schema, or `src/components/ui/`.

THIS SESSION — Phase 11: `src/components/IntegratedCollabsSection.tsx`.
BEFORE ANY CODE, quote verbatim: (a) the exact `toggleItem` calls for community / local / private rows, including how `source_id` (`community_<template_id>`, `local_<template_id>_<City>`, private = collab id), `participation_mode`, and `location` are built; (b) the "Your Private Collabs" filter (`template_id` null && private && curator is an active participant); (c) the props/callbacks this component receives from `curate/page.tsx`. None of these change.
Restyle: one row per collaboration, hairline separators, joined-first sort (existing). Left: serif 20px title; tap title → inline italic serif 14px description + `Brief` (gold PROMPT label) with the existing prompt text. Gold 5px dot after the title if the curator is a participant (replaces ★). Right: `Pill`s (icon + mono count), one per available variant, 34px: blue people = community, green pin = local, purple lock = private (private pill only if joined). THE PILL IS THE TOGGLE — same `toggleItem` call with the same args as today's row/checkbox. Counts are the existing accepted-only participant counts. Local pill has a tiny chevron → `Sheet` listing cities (name, count, checkbox, gold dot if you're in it); each city checkbox is exactly today's per-city toggle (same `source_id` / `location`); pill count = number of cities selected. "YOUR PRIVATE COLLABS" `SectionLabel` section below for user-created collabs — same filter, same toggle. Pills dim at `remainingContent === 0` (existing gate). Selected pill state reflects the selections loaded from the DB on mount.

Report the files you'll change before implementing. After implementing, quote the toggle calls again and confirm they are identical to (a).

Closing step — required, same commit: update CLAUDE.md with targeted `str_replace` edits (never rewrite the file): (1) in "Design System v2", change `/curate (shell, contributors, ads)` to `/curate (shell, contributors, ads, collabs)` on the `Migrated pages so far:` line; (2) update the "IntegratedCollabsSection" line under "Collaboration System — Three Participation Modes" (★ → gold dot; pill toggles; city sheet); (3) add one line for any gotcha you hit. Then commit code + CLAUDE.md together, push to main, `git log --oneline -3`, and list every file touched.
◀ END

---

## PHASE 12 — Comms tab + interaction polish (all pages)
Gate: A (full) + regenerate both magazines vs baseline + C.

▶ PROMPT
Read CLAUDE.md in full — especially "Design System v2" and "Branch Discipline". Sync to main (`git checkout main && git fetch origin && git pull origin main`), confirm `git branch`, and report the latest 3 commits before changing anything.

Orientation: online//offline is a Next.js 16 / Supabase app near the end of a 14-phase visual redesign ("Design System v2"). Every screen except the Curate Comms tab is now on v2 (see `Migrated pages so far:` in CLAUDE.md). v2 primitives live in `src/components/v2/`. Specs: `_design/redesign-b/README.md` ("Comms tab", "Interactions", "Color rules") and `_design/redesign-b/README-pages.md` ("Interactions"). Every existing handler, route, state, and DB write is preserved. No lucide-react. Do not touch `src/magazine/**`, `src/lib/supabase/curation.ts`, DB schema, or `src/components/ui/`.

THIS SESSION — Phase 12: Comms tab + cross-page polish.
1. Curate Comms tab (`src/app/curate/page.tsx`): unchanged logic (single `include_communications` toggle + preview list), restyled with the row/pill vocabulary from the Collabs tab; spacing per B-final frame 4. Same toggle call.
2. Interactions across migrated pages: row open/close 200ms ease-out + chevron rotate; Curate select → meter bar fills green with glow, footer price ticks (150ms), card border → green; season bar urgency at ≤7 days; sheets 240ms slide / 45% scrim / r20 / grabber; focal crosshair follows the pointer with a live label; thumb strip current-thumb ink border; `/collabs` pills fill on tap; word count ticks per keystroke.
3. Audit every migrated page against the Color rules: no filled colored panels, no colored body text (mono numbers excepted), at most one glow per screen. Remove leftover v1 neon / glow / press-mechanic styling on migrated pages.
4. Remove debug `console.log` statements in dashboard / curate / IntegratedCollabsSection / invite / create (CLAUDE.md known issue).

Report the files you'll change before implementing.

Closing step — required, same commit: update CLAUDE.md with targeted `str_replace` edits (never rewrite the file): (1) in "Design System v2", change the curate entry to `/curate` on the `Migrated pages so far:` line (every screen except /admin is now v2); (2) remove the debug-console.log item from "Remaining / Known Issues" and renumber; (3) add one line for any gotcha you hit. Then commit code + CLAUDE.md together, push to main, `git log --oneline -3`, and list every file touched.
◀ END

---

## PHASE 13 — Retire v1, admin light restyle, finalize CLAUDE.md
Gate: C + regenerate both magazines vs baseline (final proof that src/magazine never moved).

▶ PROMPT
Read CLAUDE.md in full — especially "Design System v1", "Design System v2", "Magazine Templates" gotchas, and "Branch Discipline". Sync to main (`git checkout main && git fetch origin && git pull origin main`), confirm `git branch`, and report the latest 3 commits before changing anything.

Orientation: online//offline is a Next.js 16 / Supabase app at the final phase of a 14-phase visual redesign ("Design System v2"). Every app screen except /admin is on v2. This phase retires v1. The magazine templates under `src/magazine/**` have their OWN font/color constants (C.*, F.*, loaded by the generated HTML) and are NOT part of v1 or v2 — they must not change. Do not touch `src/lib/supabase/curation.ts` or DB schema.

THIS SESSION — Phase 13:
1. Grep every import from `src/components/ui/` (shadcn). For each still used on any page, replace it with the v2 equivalent from `src/components/v2/`. Then delete the unused shadcn components (and any now-unused shadcn deps if trivially removable). Report what was deleted.
2. Grep `src/app` and `src/components` (NOT `src/magazine`) for v1 tokens (`--lt-*`, `--ground*`, `--paper*`, `--neon-*`, `--glow-*`, `--rule*`) and v1 fonts (Instrument Sans, Courier Prime, `--font-sans`, `--font-mono`). Migrate stragglers to v2; then remove the unused v1 tokens from `globals.css` and the unused font loads. Confirm with a grep that `src/magazine/**` is byte-unchanged (`git diff --stat -- src/magazine` must be empty).
3. `/admin` and `/admin/preview/[curatorId]`: a light restyle onto v2 tokens and fonts (header, rows, buttons, loading/error). The preview iframes and their print-dimension scaling are untouched.
4. `npx tsc --noEmit` clean.

Report the files you'll change before implementing.

Closing step — required, same commit: update CLAUDE.md with targeted `str_replace` edits (never rewrite the file): (1) retitle the "Design System v1" section to `Design System v1 — RETIRED (Phase 13). The magazine templates keep their own C./F. constants.` and trim its body to the two lines still needed for reading old commits (the invalid-variable list can go); (2) in "Design System v2", change STATUS to `COMPLETE — v1 and shadcn retired in Phase 13` and set `Migrated pages so far:` to `all app screens incl. /admin (light restyle)`; (3) update the Tech Stack UI line (shadcn removed) and the Project Structure `components/` line; (4) move the redesign from "In Progress" to "Completed ✅"; (5) add one line for any gotcha you hit. Then commit code + CLAUDE.md together, push to main, `git log --oneline -3`, and list every file touched.
◀ END

---

## After Phase 13
- Regenerate both magazines (screen + magcloud profiles) and compare page-sequence lines to baseline — last proof the generator never moved.
- Delete `baseline-selections.json` from the repo if you don't want it kept (it's just test data).
- Next up per CLAUDE.md Known Issues: Spread3 template, the first physical MagCloud print, Stripe.

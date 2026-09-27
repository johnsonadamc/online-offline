# Handoff: online//offline — remaining pages (Design System v2 "B")

Extends `README.md` (Dashboard + Curate). Same tokens, type, radii, color rules. Reference: `online-offline-app-redesign-B-pages.html` (frames 1–9 + primitives card). Frames are design references, not production code; rebuild in the existing Next.js components and keep every handler/route/DB write listed below.

Grounded in: `components/SubmissionForm.tsx`, `app/collabs/page.tsx`, `app/collabs/create/page.tsx`, `app/collabs/[id]/invite/page.tsx`, `app/collabs/[id]/submit/page.tsx`, `app/communicate/[id]/page.tsx`, `app/profile/page.tsx`, `app/onboarding/page.tsx`, `app/page.tsx`.

## Token additions
None to the palette. Additions are components (see "New primitives"). Content types: photography blue, art purple, poetry/essay gold as "writing". **No music anywhere** — remove `music` from the `tc` map in `curate/page.tsx` when restyling.

Accent per screen: `/submit` orange · `/collabs` header gold, pills by mode · `/collabs/create`, `/collabs/[id]/invite` purple · `/collabs/[id]/submit` mode color · `/communicate/*` gold · `/profile` gold header, green Save · `/onboarding`, `/` ink only.

Loading: mono "loading…" word. Empty: one italic serif line. No spinners.

## Per-screen spec

### 1. `/submit` (SubmissionForm)
Header: "‹ Dashboard" left; center italic serif status word (`draft` ink3 / `submitted` orange); right mono days remaining.
- Title Input, serif 26px, placeholder "Collection title" / "Title" (fullSpread or text). Same label logic as code line 392.
- SegmentedToggle IMAGE / TEXT (`format`).
- IMAGE: ChoiceCard pair Collection ("1–8 images, one featured") / Full spread ("Single image, full page") (`submissionType`). Hidden in TEXT.
- FocalPointFrame: 4:3, orange crosshair at `focal_x/focal_y`, drag or tap to set; "CROP CENTER 58%, 42%" bottom-left; "★ Feature" bottom-right in collection mode (filled orange when `isFeature`); × top-right = `handleRemoveImage`. Empty state: dashed frame, italic "Add an image".
- ThumbStrip (collection only): order = `order_index`, tap = `setCurrentSlide`, ★ on feature, dashed + = `handleAddEntry` (hidden at 8), "3 / 8" right.
- Per-image Input "Image N title" + caption Input.
- TEXT: Title Input + Textarea serif 17px, placeholder "Write your piece here…". Below: mono "Reads as **poetry** · 41 words" (auto-detected; no picker).
- Footer: Save (sec) + Submit (primary, glow). Submitted state: footer becomes Withdraw (ghost) + Edit (sec); fields read-only.

### 2. `/collabs`
Header: "‹ Dashboard", wordmark, "Collabs" gold. No legend. One card per template (12px radius, `--bg2`, `--line` border, 18px padding): serif 22px title + italic serif 14.5px description at full width. Card footer above a `--line` hairline: three equal-width labeled Pills "Community" / "Local" / "Private" = join actions for `handleJoinClick(id,title,mode)`: community joins directly; local opens the city sheet then joins; private is find-or-create (first joiner = lead → `/collabs/[id]/invite`, else `/dashboard`). Joined pill fills with mode color, label "Joined" (local: city abbreviation). Empty: italic "You've joined all available prompts for this period." Bottom: dashed "Start your own" card, purple + tile → `/collabs/create`.

### 3. `/collabs/create`
Header "‹ Collabs", wordmark, "Private" purple. Hero serif 30px "Start a private collab" + one line. Three fields only: Name (serif Input), Description (Textarea, "What is this collab about? Shown publicly."), Prompt (Textarea). Footer: purple primary "Create and invite" → `handleCreate` → `/collabs/[id]/invite`. Non-contributors redirect as today.

### 4. `/collabs/[id]/invite`
Hero: serif name + mono "4 / 10". Lead: SearchField "Search by name…", results as RosterRows (avatar, F. Lastname, type tile, purple outlined "Invite" → `handleInvite`; after: quiet "Invited"). PARTICIPANTS section: RosterRows with "lead" as 11px mono sub-line (replaces role chip), status as 7px dot (green accepted / line2 pending / orange declined) with a one-time legend. Member: roster only. Deadline passed: search replaced by italic "Invitations closed — the submission deadline has passed." Footer: ink "Done" → `/collabs`.

### 5. `/collabs/[id]/submit`
Header like `/submit`. Hero: mode tile (people/pin/lock in mode color) + serif 26px title + mono city if local. Brief panel: gold PROMPT label, serif body (`instructions || prompt_text`), chevron collapses. FocalPointFrame 1:1 with mode-color crosshair (`handleFileChange`), Input title, Input caption (`handleInputChange`). Footer Save/Submit (`handleSubmit(false/true)`). Submitted: fields disabled; footer shows gold-outlined "Revert to draft" (`handleRevertToEdit`) + disabled Submit.

### 6. `/communicate/new` and `/communicate/[id]`
Header: "‹ Dashboard", status word, "Note" gold. Recipient hero: TO label + serif 30px name with chevron → opens SearchField "Search for a curator…" (`handleSearchChange`). If recipient private and no permission: italic line "Request access to X's profile before sending." + Request pill; Send disabled. Subject Input italic serif 18px. Textarea 220px+. WordCount "31 / 250" gold, orange past `WORD_LIMIT`. Dashed "Add an image (optional)". Footer: "Save draft" (sec, `handleSaveDraft`) + "Send" (primary gold glow, `handleSubmit`; disabled per code line 455). Submitted view: all read-only; footer = ghost "Withdraw" (`handleWithdraw`).

### 7. `/profile`
Sections in code order, mono labels: IDENTITY (64px avatar + "Change photo"; First/Last two-up; City Select from `cities.ts`; Bio; Identity banner dashed 88px drop zone + note "Shown to curators when selecting contributors. Not a preview of submitted work."), YOUR ROLES (rolecards: tile + serif name + mono "active" or outlined "Add"; add-only; contributor shows type Pills Photo / Art / Writing), Public profile Toggle (gold), MAILING ADDRESS (5 Inputs; green mono "on file" beside label when complete), PAYMENT (one italic line per role: "Card on file: coming soon." / "Contributor payments: coming soon."), ACCESS REQUESTS (RosterRow + green "Approve" / quiet "Deny"), CONNECTIONS (following/followers RosterRows; "···" opens Remove / Block sheet), BLOCKED (RosterRow + "Unblock"; hidden when empty), permissions note collapsed under a "?" on the toggle. Footer: green primary Save (upsert, line 369).

### 8. `/onboarding`
Header: wordmark + mono "2 / 3". ProgressSteps. Step 1 First/Last Inputs. Step 2 serif 30px "How will you take part?" + three radio rows Contributor / Curator / Both (`handleToggleContributor`), then WHAT DO YOU MAKE? type Pills when contributor (`handleTogglePill`). Step 3 confirm summary + ink primary "Enter online//offline →" (`handleEnter`). Footer: ghost Back + ink Continue.

### 9. `/` sign in
Centered: wordmark 34px, 40px hairline, Email + Password Inputs, ink primary "Sign in" / "Create account", link "Need an account? Sign up" (toggles `isSignUp`). **Decision: ink, not green.** Green means "this adds to the issue" and its glow is reserved for the one primary action inside a season. Auth and onboarding are outside that meaning system; using ink there keeps green's first appearance on the dashboard meaningful. Same for onboarding Continue.

### 10. `/admin` — skipped this round. Restyle rows onto v2 tokens later; preview iframes untouched.

## Functional mapping (code → design)
**SubmissionForm**: `format` → SegmentedToggle · `submissionType` → ChoiceCards · title input → serif Input · focal click (line 581–610) → FocalPointFrame drag/tap, same `focal_x/focal_y` write · `handleSetFeature` → ★ Feature · `handleRemoveImage` → × · `handleAddEntry` → dashed + · `handlePrevSlide/NextSlide` → thumb taps (keep swipe on frame) · `handleCopyTags` → dropped from UI (tags not shown; keep handler unused or remove) · per-image title/caption → Inputs · text body → Textarea, auto-detect line unchanged · `handleSaveDraft` → Save · `handleSubmit` → Submit · days/status header → same · loading/error → mono word / italic line.
**collabs/page**: template list → rows · `handleJoinClick(community)` → blue pill · local + city choice → green pill → sheet → join · private find-or-create + lead routing → purple pill · joined state/role display (lead chip, line 590–614) → filled pill + "lead" sub-line where relevant · empty → italic line · Start your own → dashed card → `/collabs/create`.
**collabs/create**: contributor gate redirects → same · name/description/prompt → 3 fields · `handleCreate` → Create and invite.
**invite**: `isLead` → search shown/hidden · `deadlinePassed` → closed line · `handleInvite` → Invite button · N/10 → hero cap · role → sub-line · `invite_status` → StatusDot · Done → `/collabs`.
**collab submit**: mode/color → tile · promptText strip → Brief · `handleFileChange` → FocalPointFrame · `handleInputChange` → Inputs · `handleSubmit(bool)` → Save/Submit · `handleRevertToEdit` → Revert to draft · deadlineText → header · success/error → toast.
**communicate/[id]**: recipient search + `hasPermission` gate → hero chevron + italic line · subject/content → Inputs · `wordCount`/`WORD_LIMIT` → WordCount · image → dashed slot · `handleSaveDraft` → Save draft · `handleSubmit` → Send · `handleWithdraw` → Withdraw (submitted) · error banner → toast.
**profile**: avatar upload → Change photo · `uploadBanner` → banner zone · first/last/city/bio → Inputs/Select · roles add (`Failed to add role` path) → Add button · content type → Pills · `isPublic` → Toggle · address fields + On File → section · payment placeholders → italic lines · `handleApproveRequest/DenyRequest` → Approve/Deny · `handleUnfollow`, `handleBlockUser` → "···" sheet · `handleUnblockUser` → Unblock · `handleFollowRequest` (search by name) → SearchField in Connections · save upsert → footer Save.
**onboarding**: `step` → ProgressSteps · `handleToggleContributor` → radios · `handleTogglePill` → Pills · `handleEnter` → primary.
**page (auth)**: `handleAuth`, `isSignUp` toggle → form + link · loading "Working…" → button label.

## New primitives
Input · Select · Textarea · WordCount · SegmentedToggle · ChoiceCard · FocalPointFrame · ThumbStrip · SearchField · RosterRow · Pill (label variant) · Brief · ProgressSteps · Toggle · StatusDot. Anatomy and states on the last canvas card; all use existing tokens. Build in `components/ui/` replacing the current shadcn input/textarea/select/radio-group/checkbox styles.

## Interactions
- Focal point: crosshair follows pointer while dragging; label updates live; release writes state.
- Thumb strip: current thumb border ink; horizontal swipe on the frame changes slide.
- Pills in `/collabs`: tap → fills with mode color + "Joined" and routes as today.
- Word count ticks per keystroke; turns orange at limit and Send dims.
- Sheets (city, connections ···): slide up 240ms, 45% scrim.

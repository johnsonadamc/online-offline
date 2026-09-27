# Handoff: online//offline — Dashboard + Curate redesign ("B")

Repo: `johnsonadamc/online-offline`, branch `main`, app under `online-offline/src`.

## Overview
A visual and structural tightening of the Dashboard and Curate screens. Goal: keep the dark, neon-accented feel but make it minimal and quiet. Recognition over reading: icons and color identify type; the only words on list rows are names; status is a glyph. **Every existing handler, route and state in the current code is preserved.** Section "Functional mapping" lists each one and where it now lives.

## About the design files
The HTML files in this folder are **design references**, not production code. Recreate them in the existing Next.js / React / Tailwind codebase using its current components, data hooks and handlers. Do not ship the HTML.

Primary reference: `online-offline-app-redesign-B-final.html` (open it in a browser; frames 1–5 + audit cards; frame 6 Contributors and 7 Ads sit below).
Supporting: `online-offline-app-redesign-BC.html` (the original B direction, frames B1–B3) and `online-offline-app-redesign-B2.html` (principles card).
Not adopted: `online-offline-curate-card-system.html` (an alternative unified-card exploration; ignore unless asked).

## Fidelity
High-fidelity for color, type, spacing and component anatomy. Copy values from the CSS in the HTML. Mobile-first at 390px; the layout is a single column and should stretch fluidly on wider screens (max content width ~560px, centered).

## Design tokens
Backgrounds: `--bg #0d0c0a`, `--bg2 #131210`, hairlines `--line #24211d`, `--line2 #312d27`.
Ink: `--ink #ece7de`, `--ink2 #a49c90`, `--ink3 #6a635a`.
Accents (oklch; keep the existing meaning map from PROJECT_CONTEXT principle 8):
- orange `oklch(0.74 0.13 45)` — content, deadline/season progress
- gold `oklch(0.8 0.11 85)` — communications, invites, "yours" marker, prompt label
- green `oklch(0.78 0.12 150)` — local collabs, primary action, selected, submitted ✓
- blue `oklch(0.76 0.09 240)` — community collabs
- purple `oklch(0.74 0.1 300)` — private collabs
Contributor type map unchanged: photo blue, art purple, writing gold, music green.

Type (Google Fonts):
- Instrument Serif 400 (+ italic): titles, names, prices, season name. Row title 24px, sub-item 19px, card title 17px, price 26px.
- Hanken Grotesk 400/500: labels, body, buttons. Tab labels 12–13px, 500, letter-spacing .12–.14em, uppercase. Body 13.5px.
- JetBrains Mono 400/500: numbers, counts, status words, tiny section labels (10px, .18em, uppercase).

Radii: rows none; icon tile 10px; small type tile 7px; pill 17px (full); cards 12px; buttons 5px; sheet 20px top corners.
Glow: **only** on the primary Save button (`0 0 28px green/.35`) and on newly-filled page-meter bars (`0 0 10px green/.5`). No other glows.

## Color rules
- Color at rest is a 6px dot, a 28px tinted icon tile (12% tint bg), or a hairline. Never a filled panel, never colored body text (mono numbers excepted).
- Active section: icon tile takes the section color (border + icon + 10% tint). No glowing underline, no colored content border.

## Screens

### Dashboard (`src/app/dashboard/page.tsx`)
Layout top to bottom, 24px side padding:
1. Header: wordmark "online//offline" (Instrument Serif 22px, the `//` in `--ink3`) left, 32px avatar right → `/profile`.
2. Season bar: italic serif season name, 1px track with orange fill = elapsed %, right side `116d` (mono, orange 500) + "remaining" (mono, ink2).
3. Tabs: CONTRIBUTE / CURATE, 1px ink underline under active; Curate → `/curate`.
4. **Up next strip (new)**: 12px radius card, `--bg2`, `--line2` border, faint gold radial at left. "UP NEXT" 10px mono gold, then serif 19px message, right-side outlined "View" button. Show at most one; hide entirely if none. Selector, in priority: pending invite → "X invited you"; unsubmitted collab due ≤14d → "X due in N days"; draft communication → "Finish your note to X"; no content this season → "Submit your first piece". All data already loaded on the dashboard.
5. Three section rows (Content / Collaborations / Communications): 48px icon tile (camera / people / envelope, 1.5 stroke, `--ink2`), 24px serif title, right-aligned count (serif 20px `--ink2`), 14px chevron. Rotates 90° when open. Rows separated by `--line` hairlines. **Remove the text subtitles**; the count + Up next replace them.

Expanded content (indent 8px, `--line` hairline below):
- **Content**: 56px thumbnail, serif 21px title, 12.5px meta ("2 images · Photo"), right status word italic serif orange "submitted" (draft: no word). Tap → `/submit?draft=id`. Below the piece a quiet action line, 11px uppercase: "Withdraw" (submitted) / "Delete" (orange). Same confirm dialogs. Empty: "+ Submit work" → `/submit`.
- **Collaborations**: 10px mono section labels INVITED then ACTIVE. Row: 28px type tile (lock purple / people blue / pin green), serif 19px name, right slot. Invited rows: outlined "Accept" (gold) + "Decline" buttons (existing handlers). Active rows: green ✓ glyph if submitted, else empty 22px slot. Private rows also get a 28px outlined add-person icon → `/collabs/[id]/invite`. Tap row → `/collabs/[id]/submit`. **Leave**: swipe row left reveals an 84px orange-tinted "Leave" button (existing confirm). Provide long-press (touch) and hover "···" (desktop) fallbacks that open the same action. Footer line "Join a new collaboration" + 36px "+" square → `/collabs`.
- **Communications**: 28px gold tile with recipient initial, serif 19px name, italic serif preview (1 line, ellipsis), right ✓ if submitted. Tap → `/communicate/[id]`. Swipe left → Withdraw (submitted) or Delete (draft), existing confirms. Footer "Write to a curator" + → `/communicate/new`.

### Curate (`src/app/curate/page.tsx`, `src/components/IntegratedCollabsSection.tsx`)
Header: "‹ Dashboard" left, small wordmark, "Curate" in green right.
1. **Page meter (replaces stats strip)**: 20 bars 4px×28px, 3px gap, `--line2` empty, `--ink2` filled (saved), green + glow for selections made this session. Right: serif 20px "Your Spring issue", mono "14 of 20 pages · **6 open**" (green). Uses `usedSlots`/`remainingContent`. Tap meter → bottom sheet listing everything selected (the existing "Added to magazine" list) with remove. Search icon at far right expands into the existing search field.
2. Tabs: CONTRIBUTORS 9 / COLLABS 2 / COMMS 1 / ADS 2, count in mono `--ink3`. Address banner, if shown, sits above the tabs unchanged.
3. Sticky footer: "YOUR PRICE" 10.5px mono + serif 26px `$21.00` (`calculatePrice`), "Reset" (ink3, right-aligned), green Save button. Replace `alert()` on save with a toast, then `/dashboard`.
4. Price shows in the footer only. Never on cards or in the meter.

**Contributors tab**: 2-col grid, 10px gap, 12px radius cards. Cover 78px = identity image if present else type-tinted gradient with type icon. Body: serif 17px "F. Lastname" + 20px type tile. Selected: 22px green disc ✓ top-right (glow) + green border; nothing else. Private w/o access: card 70% opacity, lock in cover, outlined "Request access" button (→ `handleRequestFollow`); pending → plain "Request sent". Stable selected-first sort kept. When `remainingContent === 0`, unselected cards dim to 40%. Optional filter chips (All / Photo / Art / Writing / Music) above the grid, client-side on `contentType`. Legend row with dots only on first visit.

**Collabs tab**: one row per collaboration, hairline separators. Left: serif 20px title (tap → toggles description + Prompt inline, italic serif desc 14px, "PROMPT" gold mono label). Gold 5px dot after the title if user is a participant (replaces ★). Right: pills, one per available variant, 34px tall, icon + mono count: blue people = community, green pin = local, purple lock = private (private pill only if joined). **Pill is the toggle** (same `toggleItem`). Local pill has a tiny chevron and opens a bottom sheet listing cities (name, count, checkbox, gold dot if you're in it); pill count = cities selected. Section "YOUR PRIVATE COLLABS" below for user-created ones. Joined sorted first. Pills dim at 0 remaining.

**Comms tab**: unchanged logic (single toggle + preview list) styled with the same row/pill vocabulary; see B-final frame 4's tab treatment for spacing.

**Ads tab**: same 2-col card grid as Contributors. Cover = brand image or wordmark on a dark brand-tinted gradient. Body: serif 17px brand name, mono green "−$2" as the only meta. Note line above the grid: "Each ad is one page and takes $2 off." with running total. Selected/dim states identical to Contributors.

## Functional mapping (code → design)
Dashboard: toggleSection → row tap; avatar → /profile; Curate tab → /curate; countdown → season bar; content tap → /submit?draft; handleWithdrawContent / handleDeleteContent → action line; handleAcceptInvite / handleDeclineInvite → Accept / Decline buttons; collab tap → /collabs/[id]/submit; "submitted" → ✓ glyph; private invite link → add-person icon; leaveCollab (×) → swipe Leave (+ fallbacks), same confirm; Browse → "+ Join a new collaboration"; comm tap → /communicate/[id]; withdrawCommunication / deleteDraftCommunication → swipe actions; New → "+ Write to a curator"; toasts and confirm dialogs unchanged; **section subtitles removed**; **Up next selector is new code**.

Curate: used/remaining/20 → page meter; price → footer only; tabs+counts → same; search → icon on meter row; description+Prompt → tap title; community toggle/count/★ → blue pill/count/gold dot; local expand+cities → green pill → city sheet; private row → purple pill (if joined); user-created private group → same; disabled at 0 → dim; joined-first sort → same; "Added to magazine" → tap meter; Reset/Save → footer, alert → toast; address banner, loading/empty/error → unchanged; contributors grid, identity banner, type colors, request access/pending, selected-first → same, with "Contributor"/season text removed; filter chips → new, client-side only.

## Interactions
- Row open/close: chevron rotate 90°, content height 200ms ease-out.
- Selecting anything in Curate: meter bar fills green with glow, footer price ticks (150ms), card border → green.
- Season bar/countdown: shift to a stronger orange with glow when ≤7 days. This is the only urgency signal.
- Sheets: slide up 240ms, 45% scrim, 20px top radius, grabber.

## Files
- `online-offline-app-redesign-B-final.html` — primary
- `online-offline-app-redesign-BC.html` — original B frames
- `online-offline-app-redesign-B2.html` — principles
- `online-offline-curate-card-system.html` — alternative, not adopted

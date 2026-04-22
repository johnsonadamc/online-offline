# CLAUDE.md — online//offline

## Project Vision
online//offline is "slowcial media" — the antithesis of dopamine-driven social platforms. Contributors submit creative work (photos, art, poetry, essays, music) quarterly. Curators select what goes into their personalized printed magazines. The physical magazine is the product. The app is the infrastructure that makes it possible.

The philosophy: deliberate pace, thoughtful curation, real-world creative collaboration, and a beautiful printed artifact as the payoff. The app should feel calm and purposeful, not stimulating.

---

## Tech Stack
- **Framework**: Next.js (App Router)
- **Database + Auth + Storage**: Supabase
- **UI**: Tailwind CSS + shadcn/ui
- **Dev environment**: GitHub Codespaces
- **Deployment**: Vercel
- **Language**: TypeScript throughout

### ⚠️ Known Dependency Issue — High Priority
`@supabase/auth-helpers-nextjs` and `@supabase/auth-helpers-shared` are deprecated. The entire codebase should be migrated to `@supabase/ssr`. This is a significant refactor touching most data-fetching files in `src/lib/supabase/`. Do not introduce new usage of the old helpers. Flag this migration as a standing priority.

---

## Project Structure
```
src/
├── app/
│   ├── admin/
│   ├── auth/
│   ├── collabs/          # Browse, join, submit to collaborations
│   ├── communicate/      # Contributor → curator private messages
│   ├── curate/           # Curator magazine selection interface
│   ├── dashboard/        # Main user hub (contribute + curate tabs)
│   ├── profile/          # User profile + privacy settings
│   └── submit/           # Content submission form
├── components/
│   ├── CurationInterface.tsx
│   ├── IntegratedCollabsSection.tsx   # Complex — see collab notes below
│   ├── SubmissionForm.tsx
│   ├── auth/
│   ├── layout/
│   └── ui/
├── lib/
│   └── supabase/
│       ├── client.ts
│       ├── collabLibrary.ts
│       ├── collabs.ts
│       ├── communications.ts
│       ├── content.ts
│       ├── curation.ts
│       ├── profiles.ts
│       └── subscriptions.ts
└── types/
```

---

## Database Schema (Key Tables)

### Users
```sql
profiles (id, first_name, last_name, avatar_url, is_public, bio, city, bank_info, curator_payment_info)
profile_types (profile_id, type)   -- 'contributor' or 'curator'
profile_connections (follower_id, followed_id, status, relationship_type)
subscriptions (subscriber_id, creator_id, status)  -- used for access permissions
```

### Periods (Quarterly)
```sql
periods (id, name, season, year, start_date, end_date, is_active)
```

### Content
```sql
content (id, creator_id, type, status, period_id, page_title, layout_preferences, content_dimensions, style_metadata)
-- type: 'regular' | 'fullSpread'
-- status: 'draft' | 'submitted' | 'archived'

content_entries (id, content_id, title, caption, media_url, is_feature, is_full_spread, order_index)
-- Up to 8 images per submission

content_tags (content_entry_id, tag, tag_type)
```

### Collaborations
```sql
collabs (id, title, type, is_private, participation_mode, location, template_id, period_id, metadata, description)
-- type: 'chain' | 'theme' | 'narrative'
-- participation_mode: 'community' | 'local' | 'private'
-- NOTE: both is_private (legacy boolean) and participation_mode exist — prefer participation_mode

collab_participants (id, collab_id, profile_id, role, status, participation_mode, city, location)
-- city is preferred over location for local collabs

collab_templates (id, name, type, instructions, requirements, connection_rules, display_text, internal_reference, is_active)
-- IMPORTANT: field is 'name', not 'title'

period_templates (period_id, template_id)

collab_submissions (id, collab_id, contributor_id, title, caption, media_url, status, metadata)
-- IMPORTANT: text field is 'caption', not 'content'
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

### Brand Colors
- Primary: `#F05A28` (orange) — primary actions, headers, selected states
- Secondary: `#F5A93F` (amber) — supporting elements, highlights

### Collaboration Mode Colors
- Community: Blue `#3B82F6` + Globe icon
- Local: Green `#10B981` + MapPin icon
- Private: Purple `#9333EA` + Lock icon

### Collaboration Type Colors (for cards)
- Chain: Indigo
- Theme: Amber
- Narrative: Emerald

### Status Colors
- Published: `#F05A28` at 15% opacity
- Submitted: `#F5A93F` at 15% opacity
- Draft: Gray — **do not show a status badge for drafts, treat as default/implicit state**

### UI Principles
- Mobile-first. Primary usage is expected on phones.
- Minimal, editorial aesthetic. The app is infrastructure for a print product — it should not compete with the content.
- No flashy animations or heavy visual elements.
- Cards: white background, `shadow-sm`, `rounded-sm` (2px), subtle border
- Buttons: `rounded-sm`, primary orange, secondary white/gray border
- Base spacing unit: 4px. Container padding: 16px. Section margins: 24px.
- Typography: system UI stack. Titles 18px medium, body 16px, captions 14px, micro/badges 12px medium.
- Progressive disclosure: show minimal info, expand on demand. Reduce cognitive load.
- Only show status badges for `submitted` and `published` — never for `draft`.

---

## Collaboration System — Important Logic

### Three Types
1. **Chain** — sequential, each contribution builds on previous. Phase-based.
2. **Theme** — open-ended topical collection, non-sequential.
3. **Narrative** — story-focused, can be sequential or open.

### Three Participation Modes
1. **Private** — invite-only, 8-10 max. Magazine content: ALL contributions from all members, identical for everyone.
2. **Community** — open globally. Magazine content: curator's piece + 9 random. Also includes content from local versions of the same template.
3. **Local** — city-specific. Named `"[Template Name] - [City]"`. Magazine content: curator's piece + 9 random from same city only.

### Curation Selection Logic (IntegratedCollabsSection)
- Template-first organization (not grouped by participation mode)
- Each template shows community, local, and private options
- Joined collaborations shown with star icon indicator
- City selection dropdown for local collaborations
- **Count by template, not by individual city selection** — changing city should NOT increment total collab count
- Uses CustomEvent (`updateSelectedCollabs`) for cross-component state updates
- Virtual IDs for non-joined selections: `community_${templateId}` or `local_${templateId}_${cityName}`

### Known Issues to Audit
- Content deletion not persisting after page refresh (may be fixed, verify)
- Local collaboration city display after page navigation
- Collaboration selection/deselection edge cases in curation interface

---

## Magazine Generation — Planned Architecture

### Approach: Web-to-Print (React → PDF)
**Do NOT use InDesign.** The magazine generation system will be built entirely within the existing Next.js stack using React components rendered to press-ready PDFs.

### Pipeline
```
Curator finalizes selections
        ↓
API route reads selections from Supabase
        ↓
Content data mapped to React page template components
        ↓
Headless browser (Puppeteer or similar) renders pages with print CSS
        ↓
Pages assembled into single PDF per curator
        ↓
PDF sent to print fulfillment service (Mixam or similar)
```

### Page Template Types (To Build)
1. **Individual creator page** — single creator's content, 1–8 images
2. **Collaboration grid** — 8–10 pieces from collab contributors
3. **Communications page** — text-heavy, curator's selected communications
4. **Campaign/ad page** — sponsor content
5. **Cover** — TBD design

### Key Requirements
- Named frame conventions must be consistent across templates for the mapper
- Templates are React components — the browser IS the preview system
- Curators should be able to preview their magazine before print
- RGB color is acceptable for print-on-demand services (they handle conversion)
- Target output: single PDF per curator, print-ready with bleed/crop marks

### Print Fulfillment
- Target services: Mixam (has API), Magcloud, Newspaper Club
- Workflow: generate PDF → upload per curator → service prints + mails
- Variable data printing (each magazine different) is the goal
- Manual upload process is acceptable for early stage; automate later

---

## Key Gotchas & Hard-Won Lessons

### Database
- `collab_templates` uses `name` not `title`
- `collab_submissions` uses `caption` not `content` for text
- `is_private` boolean and `participation_mode` enum both exist — always prefer `participation_mode`
- Use optional chaining (`?.`) and nullish coalescing (`??`) everywhere on Supabase responses

### Next.js
- Always wrap components using `useSearchParams()` or `useParams()` in `<Suspense>` boundaries
- Use the wrapper/content component pattern for client components with routing hooks
- `images.domains` in `next.config.js` is deprecated — use `images.remotePatterns`

### React
- Always use functional state updates when new state depends on previous: `setState(prev => ...)`
- Use `useCallback` properly to avoid stale closure issues
- Clean up blob URLs on unmount to prevent memory leaks

### Images
- Use standard `<img>` tags for blob URLs (Next.js Image doesn't handle them)
- Use Next.js `<Image>` with `fill` prop for remote URLs, always with a relative-positioned parent
- Always include `sizes` attribute on Next.js Image components

### TypeScript
- Add index signatures `[key: string]: any` to interfaces for flexible Supabase responses
- Use `Array.isArray()` checks before mapping over Supabase join results (can return array or object)
- Always provide default fallbacks: `data || []`, `value || ''`

---

## Current Development Status

### Complete (~80%)
- Auth + profile management (avatar upload, privacy settings)
- Content submission (up to 8 images, collection titles, tagging, draft/submit flow)
- Collaboration system (browse, join, create private, submit content)
- Communications system (contributor → curator, draft/submit/withdraw/delete)
- Curation interface (select creators, collabs, comms, campaigns)
- Dashboard (contribute + curate tabs, delete flows, countdown timer)
- Mobile-responsive design on core components
- Period management

### Not Yet Built (~20%)
- **Magazine generation system** (highest priority remaining feature)
- Print fulfillment integration
- Curator magazine preview
- Final UI/UX polish pass
- `@supabase/ssr` migration
- End-to-end testing

---

## User Roles
- **Contributors**: Submit content, join/participate in collaborations, send communications to curators
- **Curators**: Select content for their personalized printed magazine, manage which creators/collabs/comms appear
- Users can be both. Currently single developer testing both roles, no real users yet.

## Design Reference Files

The `_design/` directory contains visual reference for the current UI redesign:

- `_design/DESIGN_BRIEF.md` — full design system spec (colors, typography, components)
- `_design/dashboard-final-v2.html` — contributor dashboard reference
- `_design/curate-page-v4.html` — curation proof light table reference

Read these before starting any UI work. The redesign is a visual-only change — do not alter any Supabase queries, state management, or business logic.
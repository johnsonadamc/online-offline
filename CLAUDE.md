# CLAUDE.md — online//offline

> "slowcial media, deliberate by design"

This file documents the codebase structure, development conventions, and workflows for AI assistants working on this repository. It reflects the state of the project as of April 2025.

---

## Project Overview

**online//offline** is the "online" component of a curated, modular, **printed** social media magazine. It is not a social feed — it is a deliberate, period-based publishing platform where:

- **Contributors** submit creative content (photos, art, poetry, essays, music) during a seasonal period
- **Collaborators** participate in themed multi-phase creative projects
- **Communicators** send private written pieces to specific curators
- **Curators** select content from contributors, collaborations, and communications to build their personalized printed magazine
- The **system** maps curator selections to InDesign templates for automated magazine generation (in progress)

The "slowcial media" philosophy is the design constraint: everything is deliberate, period-gated, and multi-step. Nothing is instant or feed-based.

---

## Repository Layout

```
online-offline/            ← git root
├── CLAUDE.md              ← this file
├── README.md              ← minimal project description
├── package.json           ← empty placeholder (NOT the app's package.json)
└── online-offline/        ← main Next.js application
    ├── package.json       ← actual app dependencies and scripts
    ├── next.config.js
    ├── tsconfig.json
    ├── tailwind.config.ts
    ├── postcss.config.mjs
    ├── eslint.config.mjs
    ├── components.json    ← shadcn/ui configuration
    ├── public/            ← static SVG assets
    └── src/
        ├── app/           ← Next.js App Router pages
        ├── components/    ← React components
        └── lib/           ← utilities and Supabase integration
```

**Critical:** All commands (`npm run dev`, `npm run build`, etc.) must be run from the `online-offline/` subdirectory, not the git root. The root `package.json` is an empty placeholder.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 15.1.6 (App Router) |
| Language | TypeScript 5 (strict mode) |
| UI Library | React 19 |
| Styling | Tailwind CSS 3.4 + shadcn/ui + Radix UI |
| Animation | Framer Motion 12 |
| Icons | Lucide React + Radix UI Icons |
| Database/Auth | Supabase (PostgreSQL + Auth) |
| Storage | Supabase Storage (avatars bucket) |
| Font | Inter (via `next/font/google`) |
| Deployment | Vercel |
| Development Env | GitHub Codespaces |

---

## Development Scripts

Run from the `online-offline/` subdirectory:

```bash
npm run dev      # Start dev server at localhost:3000
npm run build    # Production build
npm run start    # Run production server
npm run lint     # ESLint check
```

No test runner is configured. No Jest, Vitest, or E2E test setup exists yet.

---

## Source Directory Structure

### `src/app/` — Pages (Next.js App Router)

| Route | Purpose |
|---|---|
| `/` | Home/auth page (sign in / sign up) |
| `/dashboard` | Main user hub — Contribute tab + Curate tab |
| `/profile` | User profile management and permissions |
| `/submit` | Content submission form (up to 8 images) |
| `/collabs` | Browse and join collaborations |
| `/collabs/[id]/submit` | Submit to a specific collaboration |
| `/communicate/new` | Create new communication (text-only) |
| `/communicate/[id]` | View/edit a communication |
| `/curate` | Curator content selection interface |
| `/curate/communications` | Curate communications inclusion |
| `/auth/callback` | OAuth callback handler |

### `src/components/` — React Components

```
components/
├── layout/
│   ├── Header.tsx              # Navigation with avatar link
│   └── Footer.tsx
├── auth/
│   └── AuthButton.tsx
├── ui/                         # shadcn/ui primitives (do not modify manually)
│   ├── button.tsx, card.tsx, checkbox.tsx, dialog.tsx
│   ├── input.tsx, label.tsx, radio-group.tsx
│   ├── select.tsx, tabs.tsx, textarea.tsx
├── SubmissionForm.tsx          # Immersive image submission UI (up to 8 slots)
├── CurationInterface.tsx       # Magazine curation with tab-based mobile UI
└── IntegratedCollabsSection.tsx # Collaboration selection in curation
```

### `src/lib/` — Utilities and Data Access

```
lib/
├── utils.ts                    # cn() helper (clsx + tailwind-merge)
└── supabase/
    ├── profiles.ts             # User profile CRUD
    ├── content.ts              # Content submission management
    ├── collabs.ts              # Collaboration queries
    ├── collabLibrary.ts        # Collab templates and curation
    ├── communications.ts       # Messaging functions + cascade delete
    ├── storage.ts              # File/image upload via Supabase Storage
    ├── curation.ts             # Magazine curation logic
    └── subscriptions.ts        # Follow/permission management
```

---

## Database Schema

### User Management

```sql
CREATE TABLE profiles (
  id UUID REFERENCES auth.users PRIMARY KEY,
  first_name TEXT,
  last_name TEXT,
  avatar_url TEXT,
  is_public BOOLEAN DEFAULT true,
  bio TEXT,
  city TEXT,           -- used for local collaboration matching
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  bank_info JSONB,
  curator_payment_info JSONB
);

CREATE TABLE profile_types (
  profile_id UUID,
  type TEXT,
  PRIMARY KEY (profile_id, type)
);

-- Access control / follow system (reframed as "permissions")
CREATE TABLE profile_connections (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  follower_id UUID REFERENCES profiles(id),
  followed_id UUID REFERENCES profiles(id),
  status TEXT CHECK (status IN ('pending', 'approved', 'rejected', 'blocked')),
  relationship_type TEXT CHECK (relationship_type IN ('follow', 'communication')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (follower_id, followed_id)
);

CREATE TABLE notifications (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  recipient_id UUID REFERENCES profiles(id),
  sender_id UUID REFERENCES profiles(id),
  type TEXT NOT NULL,
  content JSONB,
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Currently used for access permissions (not billing)
CREATE TABLE subscriptions (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  subscriber_id UUID REFERENCES profiles(id),
  creator_id UUID REFERENCES profiles(id),
  status TEXT CHECK (status IN ('pending', 'active', 'rejected')),
  subscribed_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT unique_subscription UNIQUE (subscriber_id, creator_id)
);
```

### Period Management

```sql
CREATE TABLE periods (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  name TEXT NOT NULL,
  season TEXT NOT NULL,
  year INTEGER NOT NULL,
  start_date TIMESTAMP WITH TIME ZONE NOT NULL,
  end_date TIMESTAMP WITH TIME ZONE NOT NULL,
  is_active BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);
```

### Content Management

```sql
CREATE TABLE content (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  creator_id UUID REFERENCES profiles(id),
  type TEXT CHECK (type IN ('regular', 'fullSpread')),
  status TEXT CHECK (status IN ('draft', 'submitted', 'archived')),
  period_id UUID REFERENCES periods(id),
  page_title TEXT,          -- collection/page title for the submission
  layout_preferences JSONB,
  content_dimensions JSONB,
  style_metadata JSONB
);

CREATE TABLE content_entries (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  content_id UUID REFERENCES content(id),
  title TEXT,
  caption TEXT,
  media_url TEXT,
  is_feature BOOLEAN,
  is_full_spread BOOLEAN,
  order_index INTEGER
);

CREATE TABLE content_tags (
  content_entry_id UUID REFERENCES content_entries(id),
  tag TEXT,
  tag_type TEXT,
  PRIMARY KEY (content_entry_id, tag)
);

CREATE TABLE content_subscriptions (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  content_id UUID REFERENCES content(id),
  period_id UUID REFERENCES periods(id),
  subscriber_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

**Content status lifecycle:** `draft` → `submitted` → `published` → `archived`

**Content deletion order** (must respect FK constraints):
1. `content_tags` (look up by entry IDs first)
2. `content_entries`
3. `content`

### Collaboration System

```sql
-- IMPORTANT: uses 'name' field, NOT 'title'
CREATE TABLE collab_templates (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  name TEXT NOT NULL,       -- ← 'name', not 'title'
  type TEXT NOT NULL CHECK (type IN ('chain', 'theme', 'narrative')),
  instructions TEXT,
  requirements TEXT,
  connection_rules TEXT,
  display_text TEXT,
  internal_reference TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE TABLE period_templates (
  period_id UUID REFERENCES periods(id),
  template_id UUID REFERENCES collab_templates(id),
  PRIMARY KEY (period_id, template_id)
);

CREATE TABLE collabs (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  title TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('chain', 'theme', 'narrative')),
  is_private BOOLEAN DEFAULT false,
  participation_mode TEXT CHECK (participation_mode IN ('community', 'local', 'private')),
  location TEXT,            -- city name for local collaborations
  template_id UUID REFERENCES collab_templates(id),
  period_id UUID REFERENCES periods(id),
  metadata JSONB,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE TABLE collab_participants (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  collab_id UUID REFERENCES collabs(id),
  profile_id UUID REFERENCES profiles(id),
  role TEXT DEFAULT 'member',
  status TEXT DEFAULT 'active',
  participation_mode TEXT CHECK (participation_mode IN ('community', 'local', 'private')),
  city TEXT,                -- participant's city for local collabs
  location TEXT,            -- legacy field, city is preferred
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE (collab_id, profile_id)
);

-- IMPORTANT: uses 'caption' field, NOT 'content'
CREATE TABLE collab_submissions (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  collab_id UUID REFERENCES collabs(id),
  contributor_id UUID REFERENCES profiles(id),
  title TEXT,
  caption TEXT,             -- ← 'caption', not 'content'
  media_url TEXT,
  status TEXT DEFAULT 'draft',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  metadata JSONB            -- can contain tags and other submission metadata
);
```

### Communications System

```sql
CREATE TABLE communications (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  sender_id UUID REFERENCES profiles(id),
  recipient_id UUID REFERENCES profiles(id),
  subject TEXT NOT NULL,
  content TEXT NOT NULL,
  image_url TEXT,
  word_count INTEGER,
  status TEXT CHECK (status IN ('draft', 'submitted')),
  period_id UUID REFERENCES periods(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  is_selected BOOLEAN DEFAULT false,
  is_included BOOLEAN DEFAULT false,
  selection_method TEXT
);

CREATE TABLE communication_notifications (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  communication_id UUID REFERENCES communications(id) ON DELETE CASCADE,
  recipient_id UUID REFERENCES profiles(id),
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);
```

**Communications deletion order:**
1. Delete `communication_notifications` (by `communication_id`)
2. Delete `communications`

### Campaigns (Ads) System

```sql
CREATE TABLE campaigns (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  name TEXT NOT NULL,
  bio TEXT,
  avatar_url TEXT,
  last_post TEXT,
  discount INTEGER DEFAULT 2,
  period_id UUID REFERENCES periods(id),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);
```

### Curation Selection Tables

```sql
-- Curator selects which contributor's content to include
CREATE TABLE curator_creator_selections (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  curator_id UUID REFERENCES profiles(id),
  creator_id UUID REFERENCES profiles(id),
  period_id UUID REFERENCES periods(id),
  selected_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Curator selects which ads/campaigns to include
CREATE TABLE curator_campaign_selections (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  curator_id UUID REFERENCES profiles(id),
  campaign_id UUID REFERENCES campaigns(id),
  period_id UUID REFERENCES periods(id),
  selected_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Curator selects which collaborations to include
CREATE TABLE curator_collab_selections (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  curator_id UUID REFERENCES profiles(id),
  collab_id UUID REFERENCES collabs(id),
  period_id UUID REFERENCES periods(id),
  selected_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  participation_mode TEXT CHECK (participation_mode IN ('community', 'local', 'private')),
  location TEXT,
  source_id TEXT            -- tracks original virtual IDs for selection persistence
);

-- Curator opts in/out of communications section
CREATE TABLE curator_communication_selections (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  curator_id UUID REFERENCES profiles(id),
  period_id UUID REFERENCES periods(id),
  include_communications BOOLEAN DEFAULT false,
  selected_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);
```

### Magazine Generation Tables (Planned — not yet implemented)

```sql
CREATE TABLE magazine_templates (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  name TEXT NOT NULL,
  type TEXT NOT NULL,       -- individual, collab_grid, communications, ad
  description TEXT,
  file_path TEXT,
  frame_mapping JSONB,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE TABLE magazine_generation_jobs (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  curator_id UUID REFERENCES profiles(id),
  period_id UUID REFERENCES periods(id),
  status TEXT DEFAULT 'queued',
  mapping_data JSONB,
  output_path TEXT,
  error_log TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE TABLE magazine_pages (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  generation_job_id UUID REFERENCES magazine_generation_jobs(id),
  page_number INTEGER,
  template_id UUID REFERENCES magazine_templates(id),
  content_mapping JSONB,
  status TEXT DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);
```

---

## Collaboration System Business Logic

### Participation Modes

Each collaboration template can be instantiated in three modes:

**Private** (`participation_mode = 'private'`):
- Invitation-only, 8–10 participants max
- Magazine content: All participants see the **exact same content** — every contributor's work is compiled together on the same page
- Named: `"[Template Name]"` (no suffix)

**Community** (`participation_mode = 'community'`):
- Open to all users globally
- Magazine content: **Random selection** of 10 pieces
  - If curator contributed: their content + 9 randomly selected pieces
  - If curator did not contribute: 10 completely random pieces
- **Also includes content from local versions of the same template** (local submissions are in the community pool)
- Named: `"[Template Name]"`

**Local** (`participation_mode = 'local'`):
- City-specific instance, e.g. `"Autumn Reflections - Chicago"`
- Named format: `"[Template Name] - [City]"`
- Stored with `location = '[City Name]'`
- Magazine content: Same logic as community, but **only from that city's participants**
- Each city creates a separate `collabs` row

### Local Collaboration Creation Workflow

1. User selects a local collab template and picks a city
2. System checks if a `collabs` row exists for that `template_id + location`
3. If exists: user joins it; if not: system creates a new city-specific row
4. User is added to `collab_participants` with their city information

### Collaboration Virtual IDs (for curation when not yet joined)

When a curator selects a collab they haven't joined, a virtual ID is used:
- Community: `community_${templateId}`
- Local: `local_${templateId}_${cityName}`

These are stored in `curator_collab_selections.source_id`.

### Period Template Limits

Each period has a maximum of **3 active collaboration templates per type** (chain, theme, narrative).

### Critical Field Naming

| Table | Use this | Not this |
|---|---|---|
| `collab_templates` | `name` | `title` |
| `collab_submissions` | `caption` | `content` |

---

## Design System

### Brand Colors

| Role | Hex | Usage |
|---|---|---|
| Primary Orange | `#F05A28` | Primary actions, headers, selected states |
| Secondary Amber | `#F5A93F` | Supporting elements, highlights, secondary actions |
| Community Blue | `#3B82F6` | Community collaboration mode |
| Private Purple | `#9333EA` | Private collaboration mode |
| Local Green | `#10B981` | Local collaboration mode |

### Status Colors

| Status | Background | Usage |
|---|---|---|
| Published | `#F05A28` at 15% opacity | Published content badges |
| Submitted | `#F5A93F` at 15% opacity | Submitted content badges |
| Draft | `#f3f4f6` / `#1f2937` | Draft — **no explicit badge shown** |

**UX rule:** Draft status is the implicit default. Only show explicit status badges for `submitted` and `published` states.

### Collaboration Mode Icons

Always use these icons with their designated colors:
- Community: `Globe` icon, blue (`#3B82F6`)
- Local: `MapPin` icon, green (`#10B981`)
- Private: `Lock` icon, purple (`#9333EA`)

### Typography

- **Font**: Inter (system UI stack fallback)
- Title: 18px, medium weight
- Body: 16px, regular weight
- Caption: 14px, regular weight
- Micro (badges): 12px, medium weight
- Line height: 1.5 for body, 1.2 for headings

### Component Styles

**Buttons:**
- Primary: brand color bg, white text, `rounded-sm` (2px), padding `10px 16px`
- Secondary: white bg, gray border, gray text
- Danger: red bg, white text
- Full width on mobile, auto width on desktop

**Cards:** `shadow-sm`, white bg, `rounded-sm`, subtle border

**Inputs:** Borderless with light bottom border; focus ring uses brand color

### Spacing System

- Base unit: 4px (0.25rem)
- Container padding: 16px (1rem)
- Section margin: 24px (1.5rem)
- Related item gap: 8px (0.5rem)

---

## Architecture and Conventions

### Client Components

Nearly all pages and components use `"use client"`. State is managed locally with `useState` and `useEffect`. No global state library (no Redux, Zustand, etc.).

### Data Flow

```
Page Component
  └── useEffect (on mount)
        └── Supabase lib function (src/lib/supabase/*.ts)
              └── createClientComponentClient() → Supabase DB query
                    └── setState → re-render
```

### Supabase Client

Always instantiate with the helper — never import env vars directly in client components:
```ts
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
const supabase = createClientComponentClient();
```

### Return Value Convention

All `src/lib/supabase/` functions return:
```ts
{ success: true, data?: T }
{ success: false, error: string | object }
```

Always check `success` before using data.

### Authentication

- Supabase Auth (email/password + OAuth)
- Session managed via cookies by `@supabase/auth-helpers-nextjs`
- Pages check auth: `const { data: { user } } = await supabase.auth.getUser()`
- `/auth/callback` handles OAuth redirects
- Unauthenticated users redirect to `/`

### TypeScript

- Strict mode is on — no `any` without justification
- Path alias: `@/*` → `src/*`
- Interfaces are defined locally in each module
- Use optional chaining (`?.`) and nullish coalescing (`??`) for all database response access

---

## Key Code Patterns

### Functional State Updates

Always use the functional form when new state depends on previous state:

```typescript
// Wrong — may use stale state:
setSelected([...selected, newItem]);

// Correct:
setSelected(prev => [...prev, newItem]);
```

### Cross-Component Communication via CustomEvent

Used in `IntegratedCollabsSection` ↔ `CurationInterface`:

```typescript
// Child dispatches:
const event = new CustomEvent('updateSelectedCollabs', {
  detail: { updatedCollabs }
});
window.dispatchEvent(event);

// Parent listens:
useEffect(() => {
  const handler = (e: any) => {
    if (e.detail?.updatedCollabs) {
      setSelectedCollabs(e.detail.updatedCollabs);
    }
  };
  window.addEventListener('updateSelectedCollabs', handler as EventListener);
  return () => window.removeEventListener('updateSelectedCollabs', handler as EventListener);
}, []);
```

### Suspense Wrapping for Client Hooks

Any component using `useSearchParams()` or `useParams()` must be wrapped in `<Suspense>`:

```typescript
"use client";
import { Suspense } from 'react';

// Wrapper (default export):
export default function MyPage() {
  return (
    <Suspense fallback={<LoadingSpinner />}>
      <MyPageContent />
    </Suspense>
  );
}

// Content (with hooks):
function MyPageContent() {
  const params = useParams();
  const id = params?.id as string;
  // ...
}
```

### Type Assertions for Metadata Fields

```typescript
// participation_mode from JSONB metadata:
participation_mode: (metadata?.participation_mode as 'community' | 'local' | 'private') || 'community',
location: metadata?.location as string | null,
```

### Safe Array Access

```typescript
// Instead of:
const id = result.data[0].id;

// Do:
const resultData = result.data || [];
if (resultData.length > 0 && resultData[0]?.id) {
  const id = resultData[0].id;
}
```

### Image Blob URL Cleanup

Always revoke blob URLs to prevent memory leaks:

```typescript
useEffect(() => {
  if (!file) return;
  const url = URL.createObjectURL(file);
  setPreviewUrl(url);
  return () => URL.revokeObjectURL(url);
}, [file]);
```

### Next.js Image Component

Use `fill` with a positioned parent for images of unknown dimensions:

```tsx
<div className="relative w-24 h-24">
  <Image
    src={avatarUrl}
    alt="Avatar"
    fill
    sizes="96px"
    className="object-cover"
  />
</div>
```

### Entity Escaping in JSX

```tsx
// Wrong:
<p>Don't forget to save</p>

// Correct:
<p>Don&apos;t forget to save</p>
```

### Confirmation Dialog Pattern for Destructive Actions

Always use a two-step confirmation. Structure:

```tsx
{showDeleteConfirm && (
  <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
    <div className="bg-white rounded-sm max-w-sm w-full p-5 shadow-lg">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 rounded-sm bg-red-100 flex items-center justify-center">
          <X size={20} className="text-red-600" />
        </div>
        <h3 className="text-lg font-medium">Delete [Item]</h3>
      </div>
      <p className="text-gray-700 mb-6">
        Are you sure? This action cannot be undone.
      </p>
      <div className="flex justify-end gap-3">
        <button
          className="px-4 py-2 border border-gray-200 rounded-sm text-gray-700 hover:bg-gray-50"
          onClick={() => setShowDeleteConfirm(false)}
        >Cancel</button>
        <button
          className="px-4 py-2 bg-red-500 text-white rounded-sm hover:bg-red-600"
          onClick={handleDelete}
        >Delete</button>
      </div>
    </div>
  </div>
)}
```

---

## UX Principles

These govern product decisions. Follow them when making UI choices:

1. **Draft is implicit** — never label something as "Draft" in the UI; only show badges for `submitted` and `published`
2. **Participation first** — primary calls-to-action should encourage engaging with existing content, not creating new things
3. **Progressive disclosure** — reveal details only as needed; use "Show more/less" for complex cards
4. **No lost work** — always auto-save drafts; never let a user lose progress
5. **Content over chrome** — UI elements support content, not compete with it
6. **Mobile-first** — all new interfaces should be designed for mobile first and scale up
7. **Confirm destructive actions** — any delete or withdrawal requires a confirmation dialog
8. **Consistent color coding** — collaboration mode colors (blue/green/purple) must be used consistently everywhere
9. **Step-by-step flows** — break complex operations into logical steps with clear navigation between them

---

## IntegratedCollabsSection Component Notes

This component (`src/components/IntegratedCollabsSection.tsx`) is the most complex in the codebase. Key behaviors:

- **Template-first organization**: Collaborations are grouped by template, not by participation mode
- **Each template shows three sub-options**: Community, Local (with city dropdown), Private (only if user joined one)
- **Counting logic uses Sets** to deduplicate template IDs — changing city does NOT increment the total count
- **Joined collaborations show a star icon**; matched by template ID or by name as fallback
- **City selection uses `CustomEvent`** to communicate with the parent `CurationInterface`
- **Deselection edge case**: When deselecting the last joined collab, use unconditional deselection (no conditional guards)

---

## Environment Variables

Set in `online-offline/.env.local`:

```
NEXT_PUBLIC_SUPABASE_URL=https://<project-ref>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon-key>
```

Current Supabase project for image domains: `cbdiujvqpirrvzodfujm.supabase.co` (configured in `next.config.js`).

Access safely in code:
```typescript
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase environment variables');
}
```

---

## Magazine Generation Roadmap (Not Yet Implemented)

The magazine generation system maps curator selections to InDesign templates. Planned in phases:

| Phase | Work | Status |
|---|---|---|
| 1 | 3–5 basic InDesign page layouts with named frames (`img_1`, `caption_1`, etc.) | Planned |
| 2 | JSON content-to-frame mapping service + DB storage | Planned |
| 3 | Data export: folder structure with content, mapping files, manifest | Planned |
| 4 | InDesign scripts to place content; manual execution first | Planned |
| 5 | Admin-only preview page showing template assignments with real content | Planned |

**Collab-specific generation rules:**
- Private collabs: one fixed template, same layout for all members
- Local/community collabs: random selection from 5–10 grid templates; random content pool (8–10 pieces)
- Community pool includes content from local collabs of the same template

---

## Project Completion Status (as of April 2025)

**Complete (~75–80%):**
- User auth and profile management (including avatar upload)
- Content submission (up to 8 images, collection title, tags)
- Collaboration system (all modes, city-specific local, templates)
- Communications system (text-only, permission-based, cascade delete)
- Curation interface (mobile tab-based, slot management, collab/campaign/comm selection)
- Dashboard (Contribute + Curate tabs, delete flows, status badges)
- Permission/privacy system (public/private profiles, access requests)
- Campaigns/ads system

**Remaining (~20–25%):**
- Magazine generation system (the largest remaining piece)
- Final UI/UX polish and consistency pass
- End-to-end testing infrastructure
- Performance optimization
- Error boundaries and advanced error handling
- User documentation and onboarding

---

## Common Pitfalls

- **Run commands from `online-offline/`**, not the repo root
- **`supabase.auth.getUser()` is async** — always `await` it
- **`PGRST116` error** from Supabase = zero rows returned by `.single()`, not a real error; handle it gracefully as a null result
- **Multiple active periods**: `periods` may have >1 `is_active = true` row; always use `ORDER BY end_date DESC LIMIT 1`
- **`collab_templates.name`** — not `title`; wrong field name causes silent schema cache errors
- **`collab_submissions.caption`** — not `content`
- **Image domains**: new Supabase project URLs must be added to `images.domains` in `next.config.js`
- **`experimental.serverActions: true`** in `next.config.js` is a deprecated flag — produces a warning but is harmless
- **`useSearchParams()` / `useParams()` without Suspense** causes CSR bailout build errors in Next.js App Router
- **Blob URLs** must be revoked on component unmount to prevent memory leaks
- **Unused imports** cause TypeScript lint warnings — remove them; prefix with `_` only if required by an API signature
- **`subscriptions` table** is used for access permissions, not billing — the name is misleading

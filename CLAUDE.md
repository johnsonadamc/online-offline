# CLAUDE.md — online//offline

> "slowcial media, deliberate by design"

This file documents the codebase structure, development conventions, and workflows for AI assistants working on this repository.

---

## Project Overview

**online//offline** is a curated magazine creation platform built for slow, deliberate content sharing. Users contribute creative content (photo, art, poetry, essay, music), collaborate on multi-phase projects, communicate with other contributors, and curate magazine editions around seasonal publishing periods.

The deliberate design philosophy means workflows are multi-step, period-based, and collaborative — not instant or feed-based.

---

## Repository Layout

```
online-offline/            ← git root
├── CLAUDE.md              ← this file
├── README.md              ← minimal project description
├── package.json           ← empty placeholder (not the app's package.json)
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

**Important:** All commands (`npm run dev`, `npm run build`, etc.) must be run from the `online-offline/` subdirectory, not the git root.

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
| Font | Inter (via `next/font/google`) |

---

## Development Scripts

Run from the `online-offline/` subdirectory:

```bash
npm run dev      # Start dev server at localhost:3000
npm run build    # Production build
npm run start    # Run production server
npm run lint     # ESLint check
```

There is no test runner configured. No Jest, Vitest, or E2E test setup exists yet.

---

## Source Directory Structure

### `src/app/` — Pages (Next.js App Router)

| Route | File | Purpose |
|---|---|---|
| `/` | `page.tsx` | Home/auth page (sign in / sign up) |
| `/dashboard` | `dashboard/page.tsx` | Main user hub (Contribute + Curate tabs) |
| `/profile` | `profile/page.tsx` | User profile management |
| `/submit` | `submit/page.tsx` | Content submission form |
| `/collabs` | `collabs/page.tsx` | Browse and join collaborations |
| `/collabs/[id]/submit` | `collabs/[id]/submit/page.tsx` | Submit to a specific collaboration |
| `/communicate/new` | `communicate/new/page.tsx` | Create new communication |
| `/communicate/[id]` | `communicate/[id]/page.tsx` | View/edit a communication |
| `/curate` | `curate/page.tsx` | Curator interface for content selection |
| `/curate/communications` | `curate/communications/page.tsx` | Curate communications |
| `/auth/callback` | `auth/callback/route.ts` | OAuth callback handler |

### `src/components/` — React Components

```
components/
├── layout/
│   ├── Header.tsx              # Navigation header
│   └── Footer.tsx              # Page footer
├── auth/
│   └── AuthButton.tsx          # Sign in/out button
├── ui/                         # shadcn/ui primitives
│   ├── button.tsx
│   ├── card.tsx
│   ├── checkbox.tsx
│   ├── dialog.tsx
│   ├── input.tsx
│   ├── label.tsx
│   ├── radio-group.tsx
│   ├── select.tsx
│   ├── tabs.tsx
│   └── textarea.tsx
├── SubmissionForm.tsx          # Main content submission UI
├── CurationInterface.tsx       # Magazine curation UI
└── IntegratedCollabsSection.tsx # Collaboration listing
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
    ├── communications.ts       # Messaging functions
    ├── storage.ts              # File/image upload via Supabase Storage
    ├── curation.ts             # Magazine curation logic
    └── subscriptions.ts        # Follow/subscription management
```

---

## Architecture and Conventions

### Client Components

Nearly all pages and components use `"use client"`. State is managed locally with `useState` and `useEffect`. There is no global state library (no Redux, Zustand, etc.).

### Data Flow

```
Page Component
  └── useEffect (on mount)
        └── Supabase lib function (src/lib/supabase/*.ts)
              └── createClientComponentClient() → Supabase DB query
                    └── setState → re-render
```

### Supabase Client

Always instantiate using the helper:
```ts
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
const supabase = createClientComponentClient();
```

Never pass environment variables directly in client components — the helper handles this automatically.

### Return Value Convention

All `src/lib/supabase/` functions return a consistent shape:
```ts
{ success: true, data?: T }         // on success
{ success: false, error: string | object }  // on failure
```

Always check `success` before using the returned data.

### Authentication

- Supabase Auth (email/password and OAuth)
- Session is managed via cookies by `@supabase/auth-helpers-nextjs`
- Pages check auth client-side: `const { data: { user } } = await supabase.auth.getUser()`
- The `/auth/callback` route handles OAuth redirects
- Unauthenticated users are redirected to `/` (the auth page)

### TypeScript

- Strict mode is enabled — no `any` without justification
- Path alias `@/*` maps to `src/*` (e.g., `import { cn } from '@/lib/utils'`)
- Interfaces are defined locally in each module; there is no shared types file

### Styling

- Use Tailwind CSS utility classes exclusively — no CSS modules, no inline `style` props unless unavoidable
- Use the `cn()` helper from `@/lib/utils` for conditional/merged class names:
  ```ts
  import { cn } from '@/lib/utils';
  className={cn('base-class', condition && 'conditional-class')}
  ```
- UI colors use CSS custom properties (`--primary`, `--secondary`, `--muted`, etc.) defined in `globals.css`
- Dark mode is toggled via the `dark` class on the root element (`darkMode: ['class']` in Tailwind config)
- Border radius uses `var(--radius)` CSS variable (0.5rem base)

### shadcn/ui Components

- Style: `new-york`
- Base color: `neutral`
- Add new components via: `npx shadcn-ui@latest add <component>`
- Components live in `src/components/ui/` — do not modify generated files manually unless necessary

---

## Database Schema (Supabase Tables)

| Table | Purpose |
|---|---|
| `periods` | Publishing periods (season + year, has `is_active` flag) |
| `profiles` | User profiles and settings |
| `content` | Content submissions (types: `regular`, `fullSpread`, `collab`) |
| `content_entries` | Individual entries within a content submission |
| `content_tags` | Tags attached to content entries |
| `collabs` / `collaborations` | Collaborative projects |
| `communications` | User messages/communications |
| `subscriptions` | Follow/permission relationships between users |
| `curation_selections` | Curator's picks for publication |

### Content Statuses

`draft` → `submitted` → `published` → `archived`

### Deleting Content

Deletion must be done in order to respect foreign key constraints:
1. Delete `content_tags` (by entry IDs)
2. Delete `content_entries`
3. Delete `content`

See `src/lib/supabase/content.ts:deleteContent` for the reference implementation.

---

## Environment Variables

The app requires Supabase credentials. These should be set in `online-offline/.env.local`:

```
NEXT_PUBLIC_SUPABASE_URL=https://<project-ref>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon-key>
```

The Supabase project currently configured for image domains is `cbdiujvqpirrvzodfujm.supabase.co` (see `next.config.js`).

---

## Key Patterns to Follow

### Adding a New Page

1. Create `src/app/<route>/page.tsx`
2. Start with `"use client"` if the page uses state or effects
3. Add auth check with `supabase.auth.getUser()` and redirect if not authenticated
4. Fetch data in `useEffect` using a function from `src/lib/supabase/`

### Adding a New Supabase Query

1. Add the function to the appropriate file in `src/lib/supabase/`
2. Always instantiate: `const supabase = createClientComponentClient();`
3. Return `{ success: true, data }` or `{ success: false, error }`
4. Use `try/catch` and `console.error` for debugging

### Adding a New UI Component

1. For simple components, add to `src/components/`
2. For shadcn/ui-based primitives, use: `npx shadcn-ui@latest add <name>`
3. Use `cn()` for class merging

---

## What Does Not Exist Yet

- **Tests**: No unit, integration, or E2E tests are configured
- **API Routes**: No `app/api/` routes — all data access is direct client-side Supabase
- **Global State**: No state management library
- **Error Boundaries**: No React error boundary components
- **`.env.example`**: No example environment file committed to the repo
- **CI/CD**: No `.github/workflows/` pipeline

---

## Common Pitfalls

- **Run commands from `online-offline/`**, not the repo root — the root `package.json` is an empty placeholder
- **`supabase.auth.getUser()` is async** — always `await` it before checking `user`
- **`.single()` throws on zero rows** — Supabase error code `PGRST116` means no rows found (not an actual error); handle it gracefully
- **Multiple active periods**: The `periods` table may have multiple `is_active = true` rows; queries use `ORDER BY end_date DESC LIMIT 1` as a safeguard
- **Image domains**: Any new Supabase project URL for images must be added to `images.domains` in `next.config.js`
- **`experimental.serverActions: true`** in `next.config.js` is a deprecated flag for older Next.js — this may produce a warning but is harmless in the current version

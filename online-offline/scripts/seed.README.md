# Seed Script

Populates a local or staging Supabase instance with deterministic test data.
Safe to run multiple times — all inserts use upsert with fixed UUIDs.

## Prerequisites

- Node 18+
- A Supabase project (local or remote)
- `NEXT_PUBLIC_SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` set in your environment

The service role key is required because the script creates auth users via the
Admin API and bypasses row-level security. Never use it client-side.

## Setup

Copy `.env.local.example` to `.env.local` if it exists, or set the vars directly:

```bash
export NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
export SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

For a local Supabase instance (via `supabase start`):

```bash
export NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321
export SUPABASE_SERVICE_ROLE_KEY=<key from supabase status output>
```

## Run

```bash
npm run seed
```

## What it creates

| Step | Table(s) | Count |
|------|----------|-------|
| 1 | auth.users | 12 |
| 2 | profiles | 12 |
| 3 | profile_types | 13 (Sam is both roles) |
| 4 | periods | 1 (Spring 2026, active) |
| 5 | collab_templates | 3 |
| 6 | period_templates | 3 |
| 7 | collabs + collab_participants | 3 collabs, 6 participants |
| 8 | content + content_entries | 2 submissions, 3 entries |
| 9 | communications | 2 |
| 10 | campaigns | 2 |

## Primary test accounts

| Email | Password | Role | City |
|-------|----------|------|------|
| `contributor@seed.test` | `Password123!` | Contributor | Austin |
| `curator@seed.test` | `Password123!` | Curator | New York |
| `both@seed.test` | `Password123!` | Contributor + Curator | Chicago |

The 9 extra profiles (`mia@seed.test` through `ava@seed.test`) are
contributors used to populate search results and collab participant counts.

## Resetting

To wipe and re-seed, delete the seeded rows from Supabase (Dashboard → Table Editor)
then run `npm run seed` again. All IDs are fixed so re-seeding without deleting
is safe — it will update existing rows.

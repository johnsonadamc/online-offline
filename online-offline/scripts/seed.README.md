# Seed Script

Populates a local or staging Supabase instance with deterministic test data.
Safe to run multiple times — all inserts use upsert with fixed UUIDs.

The three auth accounts must already exist in `auth.users`. The script only
upserts profile data and dependent records — it does not create auth users.

## Prerequisites

- Node 18+
- A Supabase project (local or remote) with the three test auth accounts created
- `NEXT_PUBLIC_SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` set in your environment

The service role key bypasses row-level security. Never use it client-side.

## Setup

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

## Test accounts (auth must exist before seeding)

| Email | UUID | Name | Role | City |
|-------|------|------|------|------|
| `contributor1@test.com` | `0889833d-d56a-4969-83b4-43c9585bcd92` | Maya Torres | Contributor | Austin |
| `contributor2@test.com` | `402f2415-65c1-4efa-a95e-c0ccb38f7048` | Daniel Osei | Contributor | Chicago |
| `curator1@test.com` | `185f8c7c-9837-425a-ac1c-ebf18d1af1b9` | Lena Vasquez | Curator | New York |

## What it creates

| Step | Table(s) | Count |
|------|----------|-------|
| 1 | profiles | 3 |
| 2 | profile_types | 3 |
| 3 | periods | 1 (Spring 2026, active) |
| 4 | collab_templates | 3 |
| 5 | period_templates | 3 |
| 6 | collabs + collab_participants | 3 collabs, 5 participants |
| 7 | content + content_entries | 2 submissions, 3 entries |
| 8 | communications | 2 |
| 9 | campaigns | 2 |

## Resetting

All IDs are fixed — re-running the seed updates existing rows rather than
duplicating them. To fully reset, delete rows from the affected tables in the
Supabase Dashboard, then re-run `npm run seed`.

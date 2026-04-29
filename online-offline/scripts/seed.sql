-- online//offline — seed data
-- Run once in the Supabase SQL editor (Database → SQL Editor → New query).
-- Safe to re-run: ON CONFLICT DO NOTHING throughout.
-- Period and collab templates are found by name before inserting,
-- so pre-existing rows with different UUIDs are reused rather than duplicated.

BEGIN;

-- Temp table holds the resolved period + template IDs so downstream
-- inserts reference whichever UUID actually exists in the DB.
CREATE TEMP TABLE IF NOT EXISTS _seed_ids (
  key text PRIMARY KEY,
  val uuid
);

------------------------------------------------------------------------
-- 1. Profiles
-- Auth accounts already exist. UUIDs must match auth.users rows.
------------------------------------------------------------------------
INSERT INTO public.profiles (id, first_name, last_name, city, bio, is_public, content_type)
VALUES
  ('0889833d-d56a-4969-83b4-43c9585bcd92', 'Maya',   'Torres',  'Austin',   'Street photographer, documentary work.', true, 'photography'),
  ('402f2415-65c1-4efa-a95e-c0ccb38f7048', 'Daniel', 'Osei',    'Chicago',  'Poet, essayist, wanderer.',              true, 'writing'),
  ('185f8c7c-9837-425a-ac1c-ebf18d1af1b9', 'Lena',   'Vasquez', 'New York', 'Curator of slow moments.',               true, 'mixed')
ON CONFLICT (id) DO NOTHING;

------------------------------------------------------------------------
-- 2. Profile types
------------------------------------------------------------------------
INSERT INTO public.profile_types (profile_id, type)
VALUES
  ('0889833d-d56a-4969-83b4-43c9585bcd92', 'contributor'),
  ('402f2415-65c1-4efa-a95e-c0ccb38f7048', 'contributor'),
  ('185f8c7c-9837-425a-ac1c-ebf18d1af1b9', 'curator')
ON CONFLICT (profile_id, type) DO NOTHING;

------------------------------------------------------------------------
-- 3. Period — find by name, insert only if Spring 2026 doesn't exist
------------------------------------------------------------------------
INSERT INTO public.periods (id, name, season, year, start_date, end_date, is_active)
SELECT
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'::uuid,
  'Spring 2026', 'Spring', 2026,
  '2026-03-01'::date, '2026-05-31'::date,
  true
WHERE NOT EXISTS (
  SELECT 1 FROM public.periods WHERE name = 'Spring 2026'
);

INSERT INTO _seed_ids (key, val)
VALUES ('period_id', (SELECT id FROM public.periods WHERE name = 'Spring 2026'))
ON CONFLICT (key) DO UPDATE SET val = EXCLUDED.val;

------------------------------------------------------------------------
-- 4. Collab templates — find by name, insert only if name doesn't exist
------------------------------------------------------------------------
INSERT INTO public.collab_templates (id, name, type, display_text, instructions, is_active)
SELECT
  'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbb01'::uuid,
  'One Hundred Mornings', 'chain',
  'A chain of morning scenes — each contributor photographs their first moments of waking.',
  'Submit one image: something you see within the first 10 minutes of your morning. No staging.',
  true
WHERE NOT EXISTS (
  SELECT 1 FROM public.collab_templates WHERE name = 'One Hundred Mornings'
);

INSERT INTO public.collab_templates (id, name, type, display_text, instructions, is_active)
SELECT
  'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbb02'::uuid,
  'Edges', 'theme',
  'Where things meet. Coastlines, margins, doorways — any threshold between states.',
  'Submit 1–3 images or a short poem (under 200 words) exploring an edge or boundary.',
  true
WHERE NOT EXISTS (
  SELECT 1 FROM public.collab_templates WHERE name = 'Edges'
);

INSERT INTO public.collab_templates (id, name, type, display_text, instructions, is_active)
SELECT
  'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbb03'::uuid,
  'The Long Way Round', 'narrative',
  'A collective travelogue. Each contributor adds a chapter to a journey with no fixed destination.',
  'Build on the previous entry. Keep the journey continuous — in tone if not in geography.',
  true
WHERE NOT EXISTS (
  SELECT 1 FROM public.collab_templates WHERE name = 'The Long Way Round'
);

-- Resolve all three template IDs into the temp table
INSERT INTO _seed_ids (key, val)
VALUES
  ('tmpl_mornings', (SELECT id FROM public.collab_templates WHERE name = 'One Hundred Mornings')),
  ('tmpl_edges',    (SELECT id FROM public.collab_templates WHERE name = 'Edges')),
  ('tmpl_longway',  (SELECT id FROM public.collab_templates WHERE name = 'The Long Way Round'))
ON CONFLICT (key) DO UPDATE SET val = EXCLUDED.val;

------------------------------------------------------------------------
-- 5. Period templates
------------------------------------------------------------------------
INSERT INTO public.period_templates (period_id, template_id)
SELECT (SELECT val FROM _seed_ids WHERE key = 'period_id'),
       (SELECT val FROM _seed_ids WHERE key = 'tmpl_mornings')
ON CONFLICT (period_id, template_id) DO NOTHING;

INSERT INTO public.period_templates (period_id, template_id)
SELECT (SELECT val FROM _seed_ids WHERE key = 'period_id'),
       (SELECT val FROM _seed_ids WHERE key = 'tmpl_edges')
ON CONFLICT (period_id, template_id) DO NOTHING;

INSERT INTO public.period_templates (period_id, template_id)
SELECT (SELECT val FROM _seed_ids WHERE key = 'period_id'),
       (SELECT val FROM _seed_ids WHERE key = 'tmpl_longway')
ON CONFLICT (period_id, template_id) DO NOTHING;

------------------------------------------------------------------------
-- 6. Collabs
------------------------------------------------------------------------
INSERT INTO public.collabs
  (id, title, type, is_private, participation_mode, location,
   created_by, period_id, current_phase, metadata)
SELECT
  'dddddddd-dddd-dddd-dddd-dddddddddd01'::uuid,
  'One Hundred Mornings', 'chain', false, 'community', null,
  '402f2415-65c1-4efa-a95e-c0ccb38f7048'::uuid,
  (SELECT val FROM _seed_ids WHERE key = 'period_id'),
  1,
  jsonb_build_object(
    'template_id',        (SELECT val FROM _seed_ids WHERE key = 'tmpl_mornings'),
    'participation_mode', 'community'
  )
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.collabs
  (id, title, type, is_private, participation_mode, location,
   created_by, period_id, current_phase, metadata)
SELECT
  'dddddddd-dddd-dddd-dddd-dddddddddd02'::uuid,
  'Edges - Austin', 'theme', false, 'local', 'Austin',
  '0889833d-d56a-4969-83b4-43c9585bcd92'::uuid,
  (SELECT val FROM _seed_ids WHERE key = 'period_id'),
  1,
  jsonb_build_object(
    'template_id',        (SELECT val FROM _seed_ids WHERE key = 'tmpl_edges'),
    'participation_mode', 'local',
    'location',           'Austin'
  )
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.collabs
  (id, title, type, is_private, participation_mode, location,
   created_by, period_id, current_phase, metadata)
SELECT
  'dddddddd-dddd-dddd-dddd-dddddddddd03'::uuid,
  'The Long Way Round', 'narrative', true, 'private', null,
  '185f8c7c-9837-425a-ac1c-ebf18d1af1b9'::uuid,
  (SELECT val FROM _seed_ids WHERE key = 'period_id'),
  1,
  jsonb_build_object(
    'template_id',        (SELECT val FROM _seed_ids WHERE key = 'tmpl_longway'),
    'participation_mode', 'private'
  )
ON CONFLICT (id) DO NOTHING;

------------------------------------------------------------------------
-- 7. Collab participants
------------------------------------------------------------------------
INSERT INTO public.collab_participants
  (id, collab_id, profile_id, role, status, participation_mode, location, city)
VALUES
  -- One Hundred Mornings (community)
  ('eeeeeeee-eeee-eeee-eeee-eeeeeeeeee01',
   'dddddddd-dddd-dddd-dddd-dddddddddd01',
   '402f2415-65c1-4efa-a95e-c0ccb38f7048',
   'organizer', 'active', 'community', null, null),

  ('eeeeeeee-eeee-eeee-eeee-eeeeeeeeee02',
   'dddddddd-dddd-dddd-dddd-dddddddddd01',
   '0889833d-d56a-4969-83b4-43c9585bcd92',
   'member', 'active', 'community', null, null),

  -- Edges - Austin (local)
  ('eeeeeeee-eeee-eeee-eeee-eeeeeeeeee03',
   'dddddddd-dddd-dddd-dddd-dddddddddd02',
   '0889833d-d56a-4969-83b4-43c9585bcd92',
   'organizer', 'active', 'local', 'Austin', 'Austin'),

  -- The Long Way Round (private)
  ('eeeeeeee-eeee-eeee-eeee-eeeeeeeeee04',
   'dddddddd-dddd-dddd-dddd-dddddddddd03',
   '185f8c7c-9837-425a-ac1c-ebf18d1af1b9',
   'organizer', 'active', 'private', null, null),

  ('eeeeeeee-eeee-eeee-eeee-eeeeeeeeee05',
   'dddddddd-dddd-dddd-dddd-dddddddddd03',
   '402f2415-65c1-4efa-a95e-c0ccb38f7048',
   'member', 'invited', 'private', null, null)

ON CONFLICT (id) DO NOTHING;

------------------------------------------------------------------------
-- 8. Content
------------------------------------------------------------------------
INSERT INTO public.content (id, creator_id, type, status, period_id, page_title)
SELECT
  'ffffffff-ffff-ffff-ffff-ffffffffffff01'::uuid,
  '0889833d-d56a-4969-83b4-43c9585bcd92'::uuid,
  'regular', 'submitted',
  (SELECT val FROM _seed_ids WHERE key = 'period_id'),
  'Street Light Studies'
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.content (id, creator_id, type, status, period_id, page_title)
SELECT
  'ffffffff-ffff-ffff-ffff-ffffffffffff02'::uuid,
  '402f2415-65c1-4efa-a95e-c0ccb38f7048'::uuid,
  'regular', 'submitted',
  (SELECT val FROM _seed_ids WHERE key = 'period_id'),
  'Edges of Nothing'
ON CONFLICT (id) DO NOTHING;

------------------------------------------------------------------------
-- 9. Content entries
------------------------------------------------------------------------
INSERT INTO public.content_entries
  (id, content_id, title, caption, order_index, is_feature, is_full_spread)
VALUES
  ('gggggggg-gggg-gggg-gggg-gggggggggg01',
   'ffffffff-ffff-ffff-ffff-ffffffffffff01',
   'Late at 6th & Lamar', 'Waiting for the light to change.',
   0, true, false),

  ('gggggggg-gggg-gggg-gggg-gggggggggg02',
   'ffffffff-ffff-ffff-ffff-ffffffffffff01',
   'Congress at 2am', 'The bridge belongs to nobody.',
   1, false, false),

  ('gggggggg-gggg-gggg-gggg-gggggggggg03',
   'ffffffff-ffff-ffff-ffff-ffffffffffff02',
   'The Margin', 'A notebook page left half-blank.',
   0, true, false)

ON CONFLICT (id) DO NOTHING;

------------------------------------------------------------------------
-- 10. Collab submissions
------------------------------------------------------------------------
INSERT INTO public.collab_submissions
  (id, collab_id, contributor_id, title, caption, status)
VALUES
  ('cccccccc-cccc-4ccc-8ccc-cccccccccc01',
   'dddddddd-dddd-dddd-dddd-dddddddddd01',
   '402f2415-65c1-4efa-a95e-c0ccb38f7048',
   'First light through the blinds',
   'Couldn''t sleep. Was already watching the room change.',
   'submitted'),

  ('cccccccc-cccc-4ccc-8ccc-cccccccccc02',
   'dddddddd-dddd-dddd-dddd-dddddddddd02',
   '0889833d-d56a-4969-83b4-43c9585bcd92',
   'The edge of Barton Springs',
   'Where the water meets the limestone. Always that threshold.',
   'submitted')

ON CONFLICT (id) DO NOTHING;

------------------------------------------------------------------------
-- 11. Communications
------------------------------------------------------------------------
INSERT INTO public.communications
  (id, sender_id, recipient_id, subject, content, status, period_id, word_count)
SELECT
  'hhhhhhhh-hhhh-hhhh-hhhh-hhhhhhhhhh01'::uuid,
  '0889833d-d56a-4969-83b4-43c9585bcd92'::uuid,
  '185f8c7c-9837-425a-ac1c-ebf18d1af1b9'::uuid,
  'About my submission',
  'Hi Lena — I wanted to give you context for the series I submitted this quarter. All shots were taken on a single evening walk. Let me know if you have questions.',
  'submitted',
  (SELECT val FROM _seed_ids WHERE key = 'period_id'),
  38
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.communications
  (id, sender_id, recipient_id, subject, content, status, period_id, word_count)
SELECT
  'hhhhhhhh-hhhh-hhhh-hhhh-hhhhhhhhhh02'::uuid,
  '402f2415-65c1-4efa-a95e-c0ccb38f7048'::uuid,
  '185f8c7c-9837-425a-ac1c-ebf18d1af1b9'::uuid,
  'Collab idea for next season',
  'Thinking about a chain collaboration centered on silence. Long exposures, quiet writing. Would you want to co-organize?',
  'submitted',
  (SELECT val FROM _seed_ids WHERE key = 'period_id'),
  24
ON CONFLICT (id) DO NOTHING;

------------------------------------------------------------------------
-- 12. Campaigns
------------------------------------------------------------------------
INSERT INTO public.campaigns (id, name, bio, discount, period_id, is_active)
SELECT
  'iiiiiiii-iiii-iiii-iiii-iiiiiiiiiiii'::uuid,
  'Moleskine',
  'Notebooks for those who still write by hand.',
  '15% off with code SLOWMAG',
  (SELECT val FROM _seed_ids WHERE key = 'period_id'),
  true
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.campaigns (id, name, bio, discount, period_id, is_active)
SELECT
  'iiiiiiii-iiii-4iii-8iii-iiiiiiiiiiii'::uuid,
  'Risograph Press Co.',
  'Independent risograph printing for zines, books, and posters.',
  'Free shipping on first order',
  (SELECT val FROM _seed_ids WHERE key = 'period_id'),
  true
ON CONFLICT (id) DO NOTHING;

------------------------------------------------------------------------

COMMIT;

DROP TABLE IF EXISTS _seed_ids;

-- online//offline — Spring 2026 PRINT TEST seed
-- ============================================================================
-- Purpose: populate the active Spring 2026 period with a complete, realistic
-- dataset so TWO curators (Lena Vasquez + Adam Johnson) can each generate a
-- distinct, print-ready magazine in which EVERY template fires at least once.
--
-- This is an ADDITIVE, standalone script. It NEVER touches scripts/seed.sql's
-- rows and must NOT be confused with it. Re-running seed.sql wipes manually-set
-- media_url values; THIS script does not, and is itself safe to re-run.
--
-- Sources of truth (do not deviate):
--   scripts/seed-print-test-content.md   — all text content + selections
--   scripts/seed-image-manifest.md       — EXACT, case-sensitive image URLs
--     (five extension variants: .PNG .JPG .jpeg .jpg, and six-* mixes three)
--
-- Idempotency strategy:
--   * All new objects use deterministic UUIDs + ON CONFLICT (id) DO NOTHING
--     or INSERT ... WHERE NOT EXISTS.
--   * Profiles + campaigns are UPDATEd in place (they already exist).
--   * Curator selection tables are DELETEd only for the two print-test curators
--     in this period, then re-inserted — so a re-run reproduces the same state.
--
-- Run: paste this whole file into the Supabase SQL Editor and execute, OR
--   psql "$DATABASE_URL" -f scripts/seed-print-test.sql
-- ============================================================================

BEGIN;

-- Period (Spring 2026, active). Fixed UUID per project docs.
--   \set-style constant reused literally throughout: 'aaaaaaaa-...-aaaaaaaaaaaa'

-- Keep the deadline in the future so the app's submit/invite UI also works
-- during testing. Generation itself does not depend on this (submissions are
-- seeded as 'submitted' directly), but the pre-flight checklist calls for it.
UPDATE public.periods
   SET end_date = '2026-12-31'
 WHERE id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'
   AND end_date < '2026-12-31';

-- ============================================================================
-- 1. PROFILES — 19 contributors already exist (UUIDs from the content doc).
--    Update bio / city / content_type only. Do NOT insert profiles or auth users.
--    content_type drives template selection for essay/poetry (generator reads
--    profiles.content_type), so these values are load-bearing.
-- ============================================================================
UPDATE public.profiles p
   SET bio          = v.bio,
       city         = v.city,
       content_type = v.content_type
  FROM (VALUES
    ('0889833d-d56a-4969-83b4-43c9585bcd92'::uuid, $q$Photographer working in available light along the Gulf Coast. Interested in the hour before things open.$q$, 'Pensacola',     'photography'),
    ('11111111-1111-1111-1111-111111111111'::uuid, $q$Documents shorelines and the objects they surrender. Based in Portland, raised near water.$q$,                'Portland',      'photography'),
    ('22222222-2222-2222-2222-222222222222'::uuid, $q$Makes pictures of ordinary rooms at consistent intervals. Believes repetition is a form of attention.$q$,       'Chicago',       'photography'),
    ('33333333-3333-3333-3333-333333333333'::uuid, $q$Works in paper, pigment, and pressure. Studio practice built around what a single sheet can hold.$q$,            'Austin',        'art'),
    ('44444444-4444-4444-4444-444444444444'::uuid, $q$Photographs the four blocks around his apartment and nothing else. Ten years so far.$q$,                        'New Orleans',   'photography'),
    ('55555555-5555-5555-5555-555555555555'::uuid, $q$Mixed-media artist assembling field observations into visual notation.$q$,                                     'Seattle',       'art'),
    ('66666666-6666-6666-6666-666666666666'::uuid, $q$Street photographer, Atlanta. Prefers overcast.$q$,                                                             'Atlanta',       'photography'),
    ('77777777-7777-7777-7777-777777777777'::uuid, $q$Essayist writing on attention, technology, and the economics of slowness.$q$,                                  'New York',      'essay'),
    ('88888888-8888-8888-8888-888888888888'::uuid, $q$Photographs work sites, loading docks, and the people who keep them running.$q$,                               'San Antonio',   'photography'),
    ('402f2415-65c1-4efa-a95e-c0ccb38f7048'::uuid, $q$Writer. Interested in what gets lost between the draft and the post.$q$,                                        'Boston',        'essay'),
    ('cccccccc-cccc-cccc-cccc-cccccccccccc'::uuid, $q$Poet. Short lines, rented rooms, Miami humidity.$q$,                                                            'Miami',         'poetry'),
    ('dddddddd-dddd-dddd-dddd-dddddddddddd'::uuid, $q$Photographer documenting transitional architecture in the Bay Area.$q$,                                        'San Francisco', 'photography'),
    ('eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee'::uuid, $q$Painter and collagist working from Denver. Makes things that resist reproduction.$q$,                           'Denver',        'art'),
    ('ffffffff-ffff-ffff-ffff-ffffffffffff'::uuid, $q$Desert light, long exposures, Phoenix.$q$,                                                                     'Phoenix',       'photography'),
    ('11111111-2222-3333-4444-555555555555'::uuid, $q$Essayist and cultural critic writing about art, technology, and permanence.$q$,                                'Philadelphia',  'essay'),
    ('22222222-3333-4444-5555-666666666666'::uuid, $q$Poet and visual artist exploring themes of memory and identity.$q$,                                            'Nashville',     'poetry'),
    ('33333333-4444-5555-6666-777777777777'::uuid, $q$Photographs interiors after the people leave.$q$,                                                              'Houston',       'photography'),
    ('44444444-5555-6666-7777-888888888888'::uuid, $q$Assemblage artist, Los Angeles. Found objects, fixed frames.$q$,                                               'Los Angeles',   'art'),
    ('55555555-6666-7777-8888-999999999999'::uuid, $q$Photographer. Winter light, Boston, patience.$q$,                                                              'Boston',        'photography')
  ) AS v(id, bio, city, content_type)
 WHERE p.id = v.id;

-- ============================================================================
-- 2. COLLAB TEMPLATES (3 new) + PERIOD TEMPLATE LINKS
--    Each print-test collab gets its own template so it renders as a clean,
--    selectable row in the curate collabs tab. display_text = public description,
--    instructions = contributor brief (matches how the generator resolves
--    display_text, and how the curate UI shows the prompt).
-- ============================================================================
INSERT INTO public.collab_templates (id, name, type, display_text, instructions, is_active)
VALUES
  ('b7100000-0000-4000-a000-000000000001',
   'Somewhere Else Entirely', 'theme',
   $q$A shared archive of manufactured wonder. Contributors document the places built specifically to be nowhere near where they live.$q$,
   $q$Photograph a place engineered for delight. Not your delight — anyone's. Look for the seams: the maintenance door, the tired parent, the thing the place is working very hard to make you not notice. Bonus points if the photo is affectionate anyway.$q$,
   true),
  ('b7100000-0000-4000-a000-000000000002',
   'The Water Is Always There', 'theme',
   $q$Pensacola contributors document the Gulf on ordinary days. Not the postcard — the Tuesday.$q$,
   $q$Photograph the water on a day you weren't planning to. No sunsets unless the sunset is incidental. We are interested in what the Gulf looks like when nobody is performing for it.$q$,
   true),
  ('b7100000-0000-4000-a000-000000000003',
   'Everyone Who Was There', 'narrative',
   $q$A closed circle documenting the people they'd otherwise only photograph on their phones.$q$,
   $q$Photograph the people you actually know. Not portraits — evidence. The frame should feel like it was taken by someone who was invited. This collab is private and stays private; the page is identical for every member.$q$,
   true)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.period_templates (period_id, template_id)
VALUES
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'b7100000-0000-4000-a000-000000000001'),
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'b7100000-0000-4000-a000-000000000002'),
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'b7100000-0000-4000-a000-000000000003')
ON CONFLICT (period_id, template_id) DO NOTHING;

-- ============================================================================
-- 3. COLLABS (3 new) — community / local (Pensacola) / private
--    template_id set on the column (not just metadata). participation_mode
--    preferred over is_private. prompt_text = contributor brief.
-- ============================================================================
INSERT INTO public.collabs
  (id, title, type, is_private, participation_mode, location,
   created_by, period_id, current_phase, template_id, is_user_created,
   description, prompt_text, metadata)
VALUES
  -- Community
  ('d7100000-0000-4000-a000-000000000001',
   'Somewhere Else Entirely', 'theme', false, 'community', null,
   'ffffffff-ffff-ffff-ffff-ffffffffffff'::uuid,
   'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 1,
   'b7100000-0000-4000-a000-000000000001', false,
   $q$A shared archive of manufactured wonder. Contributors document the places built specifically to be nowhere near where they live.$q$,
   $q$Photograph a place engineered for delight. Not your delight — anyone's. Look for the seams: the maintenance door, the tired parent, the thing the place is working very hard to make you not notice. Bonus points if the photo is affectionate anyway.$q$,
   jsonb_build_object('template_id','b7100000-0000-4000-a000-000000000001','participation_mode','community')),

  -- Local (Pensacola)
  ('d7100000-0000-4000-a000-000000000002',
   'The Water Is Always There', 'theme', false, 'local', 'Pensacola',
   '0889833d-d56a-4969-83b4-43c9585bcd92'::uuid,
   'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 1,
   'b7100000-0000-4000-a000-000000000002', false,
   $q$Pensacola contributors document the Gulf on ordinary days. Not the postcard — the Tuesday.$q$,
   $q$Photograph the water on a day you weren't planning to. No sunsets unless the sunset is incidental. We are interested in what the Gulf looks like when nobody is performing for it.$q$,
   jsonb_build_object('template_id','b7100000-0000-4000-a000-000000000002','participation_mode','local','location','Pensacola')),

  -- Private
  ('d7100000-0000-4000-a000-000000000003',
   'Everyone Who Was There', 'narrative', true, 'private', null,
   '2ad6af92-279d-4eb7-a1b6-b51ec042aa85'::uuid,
   'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 1,
   'b7100000-0000-4000-a000-000000000003', false,
   $q$A closed circle documenting the people they'd otherwise only photograph on their phones.$q$,
   $q$Photograph the people you actually know. Not portraits — evidence. The frame should feel like it was taken by someone who was invited. This collab is private and stays private; the page is identical for every member.$q$,
   jsonb_build_object('template_id','b7100000-0000-4000-a000-000000000003','participation_mode','private'))
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- 4. COLLAB PARTICIPANTS
--    Community: 6 contributors (drives curate community count).
--    Local: 2 participants with city='Pensacola' (required for the Pensacola
--      city row to surface via getCitiesWithParticipantCounts).
--    Private: lead Adam Johnson + 3 members, all invite_status='accepted' and
--      status='active' so counts render and the private row shows for the lead.
-- ============================================================================
INSERT INTO public.collab_participants
  (id, collab_id, profile_id, role, status, participation_mode,
   location, city, invited_by, invite_status)
VALUES
  -- Community — Somewhere Else Entirely
  ('e7100000-0000-4000-a000-000000000101','d7100000-0000-4000-a000-000000000001','ffffffff-ffff-ffff-ffff-ffffffffffff','organizer','active','community',null,null,null,'accepted'),
  ('e7100000-0000-4000-a000-000000000102','d7100000-0000-4000-a000-000000000001','33333333-4444-5555-6666-777777777777','member','active','community',null,null,null,'accepted'),
  ('e7100000-0000-4000-a000-000000000103','d7100000-0000-4000-a000-000000000001','88888888-8888-8888-8888-888888888888','member','active','community',null,null,null,'accepted'),
  ('e7100000-0000-4000-a000-000000000104','d7100000-0000-4000-a000-000000000001','55555555-6666-7777-8888-999999999999','member','active','community',null,null,null,'accepted'),
  ('e7100000-0000-4000-a000-000000000105','d7100000-0000-4000-a000-000000000001','66666666-6666-6666-6666-666666666666','member','active','community',null,null,null,'accepted'),
  ('e7100000-0000-4000-a000-000000000106','d7100000-0000-4000-a000-000000000001','dddddddd-dddd-dddd-dddd-dddddddddddd','member','active','community',null,null,null,'accepted'),

  -- Local — The Water Is Always There (Pensacola)
  ('e7100000-0000-4000-a000-000000000201','d7100000-0000-4000-a000-000000000002','0889833d-d56a-4969-83b4-43c9585bcd92','organizer','active','local','Pensacola','Pensacola',null,'accepted'),
  ('e7100000-0000-4000-a000-000000000202','d7100000-0000-4000-a000-000000000002','2ad6af92-279d-4eb7-a1b6-b51ec042aa85','member','active','local','Pensacola','Pensacola',null,'accepted'),

  -- Private — Everyone Who Was There (lead = Adam Johnson)
  ('e7100000-0000-4000-a000-000000000301','d7100000-0000-4000-a000-000000000003','2ad6af92-279d-4eb7-a1b6-b51ec042aa85','lead','active','private',null,null,null,'accepted'),
  ('e7100000-0000-4000-a000-000000000302','d7100000-0000-4000-a000-000000000003','0889833d-d56a-4969-83b4-43c9585bcd92','member','active','private',null,null,'2ad6af92-279d-4eb7-a1b6-b51ec042aa85','accepted'),
  ('e7100000-0000-4000-a000-000000000303','d7100000-0000-4000-a000-000000000003','11111111-1111-1111-1111-111111111111','member','active','private',null,null,'2ad6af92-279d-4eb7-a1b6-b51ec042aa85','accepted'),
  ('e7100000-0000-4000-a000-000000000304','d7100000-0000-4000-a000-000000000003','22222222-3333-4444-5555-666666666666','member','active','private',null,null,'2ad6af92-279d-4eb7-a1b6-b51ec042aa85','accepted')
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- 5. COLLAB SUBMISSIONS  (text field is `caption`, not `content`)
--    media_url copied VERBATIM from seed-image-manifest.md. NOTE the filenames
--    intentionally do NOT match the modes:
--      community collab  -> collab-local-*.JPG   (Disney)
--      local collab      -> collab-community-*.JPG (Pensacola beach)
--      private collab    -> collab-private-*.JPG
--    All collab image files are uppercase .JPG. title mirrors caption so the
--    short line is visible in the collab spread layout.
-- ============================================================================
INSERT INTO public.collab_submissions
  (id, collab_id, contributor_id, title, caption, media_url, status)
VALUES
  -- Community — Somewhere Else Entirely  (collab-local-*.JPG)
  ('f7100000-0000-4000-a000-000000000101','d7100000-0000-4000-a000-000000000001','ffffffff-ffff-ffff-ffff-ffffffffffff',$q$Ninety minutes for four. Worth it, reportedly.$q$,$q$Ninety minutes for four. Worth it, reportedly.$q$,'https://cbdiujvqpirrvzodfujm.supabase.co/storage/v1/object/public/seed/collab-local-01.JPG','submitted'),
  ('f7100000-0000-4000-a000-000000000102','d7100000-0000-4000-a000-000000000001','33333333-4444-5555-6666-777777777777',$q$The castle from the angle nobody photographs.$q$,$q$The castle from the angle nobody photographs.$q$,'https://cbdiujvqpirrvzodfujm.supabase.co/storage/v1/object/public/seed/collab-local-02.JPG','submitted'),
  ('f7100000-0000-4000-a000-000000000103','d7100000-0000-4000-a000-000000000001','88888888-8888-8888-8888-888888888888',$q$Someone's whole day, in one frame.$q$,$q$Someone's whole day, in one frame.$q$,'https://cbdiujvqpirrvzodfujm.supabase.co/storage/v1/object/public/seed/collab-local-03.JPG','submitted'),
  ('f7100000-0000-4000-a000-000000000104','d7100000-0000-4000-a000-000000000001','55555555-6666-7777-8888-999999999999',$q$Manufactured, and it worked anyway.$q$,$q$Manufactured, and it worked anyway.$q$,'https://cbdiujvqpirrvzodfujm.supabase.co/storage/v1/object/public/seed/collab-local-04.JPG','submitted'),
  ('f7100000-0000-4000-a000-000000000105','d7100000-0000-4000-a000-000000000001','66666666-6666-6666-6666-666666666666',$q$The parade goes past regardless of who is watching.$q$,$q$The parade goes past regardless of who is watching.$q$,'https://cbdiujvqpirrvzodfujm.supabase.co/storage/v1/object/public/seed/collab-local-05.JPG','submitted'),
  ('f7100000-0000-4000-a000-000000000106','d7100000-0000-4000-a000-000000000001','dddddddd-dddd-dddd-dddd-dddddddddddd',$q$Leaving. Everyone leaves eventually.$q$,$q$Leaving. Everyone leaves eventually.$q$,'https://cbdiujvqpirrvzodfujm.supabase.co/storage/v1/object/public/seed/collab-local-06.JPG','submitted'),

  -- Local — The Water Is Always There  (collab-community-*.JPG)
  ('f7100000-0000-4000-a000-000000000201','d7100000-0000-4000-a000-000000000002','0889833d-d56a-4969-83b4-43c9585bcd92',$q$Before the parking lot fills.$q$,$q$Before the parking lot fills.$q$,'https://cbdiujvqpirrvzodfujm.supabase.co/storage/v1/object/public/seed/collab-community-01.JPG','submitted'),
  ('f7100000-0000-4000-a000-000000000202','d7100000-0000-4000-a000-000000000002','2ad6af92-279d-4eb7-a1b6-b51ec042aa85',$q$The sand does this on its own.$q$,$q$The sand does this on its own.$q$,'https://cbdiujvqpirrvzodfujm.supabase.co/storage/v1/object/public/seed/collab-community-02.JPG','submitted'),
  ('f7100000-0000-4000-a000-000000000203','d7100000-0000-4000-a000-000000000002','0889833d-d56a-4969-83b4-43c9585bcd92',$q$Same water. Different Tuesday.$q$,$q$Same water. Different Tuesday.$q$,'https://cbdiujvqpirrvzodfujm.supabase.co/storage/v1/object/public/seed/collab-community-03.JPG','submitted'),
  ('f7100000-0000-4000-a000-000000000204','d7100000-0000-4000-a000-000000000002','2ad6af92-279d-4eb7-a1b6-b51ec042aa85',$q$Nobody performing.$q$,$q$Nobody performing.$q$,'https://cbdiujvqpirrvzodfujm.supabase.co/storage/v1/object/public/seed/collab-community-04.JPG','submitted'),
  ('f7100000-0000-4000-a000-000000000205','d7100000-0000-4000-a000-000000000002','0889833d-d56a-4969-83b4-43c9585bcd92',$q$The Gulf, unbothered.$q$,$q$The Gulf, unbothered.$q$,'https://cbdiujvqpirrvzodfujm.supabase.co/storage/v1/object/public/seed/collab-community-05.JPG','submitted'),
  ('f7100000-0000-4000-a000-000000000206','d7100000-0000-4000-a000-000000000002','2ad6af92-279d-4eb7-a1b6-b51ec042aa85',$q$Still there tomorrow.$q$,$q$Still there tomorrow.$q$,'https://cbdiujvqpirrvzodfujm.supabase.co/storage/v1/object/public/seed/collab-community-06.JPG','submitted'),

  -- Private — Everyone Who Was There  (collab-private-*.JPG)
  ('f7100000-0000-4000-a000-000000000301','d7100000-0000-4000-a000-000000000003','2ad6af92-279d-4eb7-a1b6-b51ec042aa85',$q$Nobody arranged this.$q$,$q$Nobody arranged this.$q$,'https://cbdiujvqpirrvzodfujm.supabase.co/storage/v1/object/public/seed/collab-private-01.JPG','submitted'),
  ('f7100000-0000-4000-a000-000000000302','d7100000-0000-4000-a000-000000000003','2ad6af92-279d-4eb7-a1b6-b51ec042aa85',$q$The good camera stayed in the bag.$q$,$q$The good camera stayed in the bag.$q$,'https://cbdiujvqpirrvzodfujm.supabase.co/storage/v1/object/public/seed/collab-private-02.JPG','submitted'),
  ('f7100000-0000-4000-a000-000000000303','d7100000-0000-4000-a000-000000000003','0889833d-d56a-4969-83b4-43c9585bcd92',$q$Taken by someone who was invited.$q$,$q$Taken by someone who was invited.$q$,'https://cbdiujvqpirrvzodfujm.supabase.co/storage/v1/object/public/seed/collab-private-03.JPG','submitted'),
  ('f7100000-0000-4000-a000-000000000304','d7100000-0000-4000-a000-000000000003','2ad6af92-279d-4eb7-a1b6-b51ec042aa85',$q$Evidence, not portrait.$q$,$q$Evidence, not portrait.$q$,'https://cbdiujvqpirrvzodfujm.supabase.co/storage/v1/object/public/seed/collab-private-04.JPG','submitted'),
  ('f7100000-0000-4000-a000-000000000305','d7100000-0000-4000-a000-000000000003','11111111-1111-1111-1111-111111111111',$q$Everyone who was there.$q$,$q$Everyone who was there.$q$,'https://cbdiujvqpirrvzodfujm.supabase.co/storage/v1/object/public/seed/collab-private-05.JPG','submitted'),
  ('f7100000-0000-4000-a000-000000000306','d7100000-0000-4000-a000-000000000003','22222222-3333-4444-5555-666666666666',$q$And then it was over.$q$,$q$And then it was over.$q$,'https://cbdiujvqpirrvzodfujm.supabase.co/storage/v1/object/public/seed/collab-private-06.JPG','submitted')
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- 6. CONTENT (9 submissions) — all status='submitted', period Spring 2026,
--    type='regular'. Essay/poetry template is chosen from profiles.content_type;
--    visual template is chosen from entry count + total caption words.
-- ============================================================================
INSERT INTO public.content (id, creator_id, type, status, period_id, page_title)
VALUES
  ('c7100000-0000-4000-a000-000000000001','0889833d-d56a-4969-83b4-43c9585bcd92','regular','submitted','aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa','The Salt Line'),          -- Maya Torres     -> SpreadPanorama
  ('c7100000-0000-4000-a000-000000000002','11111111-1111-1111-1111-111111111111','regular','submitted','aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa','What the Tide Left'),      -- Sarah Chen      -> Spread
  ('c7100000-0000-4000-a000-000000000003','22222222-2222-2222-2222-222222222222','regular','submitted','aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa','Two Mornings'),            -- James Wilson    -> Spread2
  ('c7100000-0000-4000-a000-000000000004','33333333-3333-3333-3333-333333333333','regular','submitted','aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa','Paper Studies'),           -- Maya Patel      -> Spread4
  ('c7100000-0000-4000-a000-000000000005','44444444-4444-4444-4444-444444444444','regular','submitted','aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa','Neighborhood Index'),      -- Carlos Rodriguez-> SpreadMosaic
  ('c7100000-0000-4000-a000-000000000006','55555555-5555-5555-5555-555555555555','regular','submitted','aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa','Field Notes'),             -- Emma Zhang      -> Spread6
  ('c7100000-0000-4000-a000-000000000007','402f2415-65c1-4efa-a95e-c0ccb38f7048','regular','submitted','aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa','The Slow Channel'),        -- Daniel Osei     -> TextSubmission
  ('c7100000-0000-4000-a000-000000000008','77777777-7777-7777-7777-777777777777','regular','submitted','aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa','Against the Feed'),        -- Leila Hassan    -> TextSpread
  ('c7100000-0000-4000-a000-000000000009','cccccccc-cccc-cccc-cccc-cccccccccccc','regular','submitted','aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa','Inventory of a Rented Room') -- Olivia Martinez -> PoetryPage
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- 7. CONTENT ENTRIES
--    Visual: media_url VERBATIM from manifest (mind the mixed extensions!),
--      0-based order_index, exactly one is_feature=true, focal per doc.
--    Text (essay/poetry): body lives in `caption` (generator reads caption as
--      the body). Each paragraph is a single physical line separated by a blank
--      line, so essays are NOT misdetected as poetry. media_url = null.
-- ============================================================================
INSERT INTO public.content_entries
  (id, content_id, title, caption, media_url, order_index, is_feature, focal_x, focal_y)
VALUES
  -- The Salt Line (panorama-01.jpeg) — 1 img, 38-word caption -> SpreadPanorama
  ('c7200000-0000-4000-a000-000000000010','c7100000-0000-4000-a000-000000000001',
   $q$Low Tide, Facing East$q$,
   $q$The line the water leaves is never the same twice, but it is always a line. I have photographed it for six years and it has never once been straight.$q$,
   'https://cbdiujvqpirrvzodfujm.supabase.co/storage/v1/object/public/seed/panorama-01.jpeg',0,true,50,50),

  -- What the Tide Left (spread-01.jpeg) — 1 img, 112-word caption -> Spread
  ('c7200000-0000-4000-a000-000000000020','c7100000-0000-4000-a000-000000000002',
   $q$Inventory, Morning After$q$,
   $q$My grandmother collected what the water gave back. Bottle glass worn soft, a doll's arm, once a wedding ring with no name inside it. She kept everything in a coffee tin on the windowsill and never explained the system, if there was one. When she died we found the tin exactly where it had always been, and none of us could throw it out, and none of us could say why. I photograph the shoreline now the way she walked it — slowly, without a plan, looking down. This is what was there on a Tuesday. It is not important. That is precisely the point, and I have stopped apologizing for it.$q$,
   'https://cbdiujvqpirrvzodfujm.supabase.co/storage/v1/object/public/seed/spread-01.jpeg',0,true,50,45),

  -- Two Mornings (two-01/02.jpeg) — 2 img -> Spread2
  ('c7200000-0000-4000-a000-000000000031','c7100000-0000-4000-a000-000000000003',
   $q$Tuesday, 6:14$q$,$q$Same chair, same window, eleven degrees colder than the day before.$q$,
   'https://cbdiujvqpirrvzodfujm.supabase.co/storage/v1/object/public/seed/two-01.jpeg',0,true,50,40),
  ('c7200000-0000-4000-a000-000000000032','c7100000-0000-4000-a000-000000000003',
   $q$Wednesday, 6:11$q$,$q$Three minutes earlier. The difference is the whole photograph.$q$,
   'https://cbdiujvqpirrvzodfujm.supabase.co/storage/v1/object/public/seed/two-02.jpeg',1,false,50,40),

  -- Paper Studies (four-01/02/03.jpeg) — 3 img -> Spread4
  ('c7200000-0000-4000-a000-000000000041','c7100000-0000-4000-a000-000000000004',
   $q$Study I — Fold$q$,$q$A single sheet, folded until it refused.$q$,
   'https://cbdiujvqpirrvzodfujm.supabase.co/storage/v1/object/public/seed/four-01.jpeg',0,true,50,50),
  ('c7200000-0000-4000-a000-000000000042','c7100000-0000-4000-a000-000000000004',
   $q$Study II — Weight$q$,$q$What the paper does when you stop helping it.$q$,
   'https://cbdiujvqpirrvzodfujm.supabase.co/storage/v1/object/public/seed/four-02.jpeg',1,false,50,50),
  ('c7200000-0000-4000-a000-000000000043','c7100000-0000-4000-a000-000000000004',
   $q$Study III — Return$q$,$q$Unfolded. The creases are the record.$q$,
   'https://cbdiujvqpirrvzodfujm.supabase.co/storage/v1/object/public/seed/four-03.jpeg',2,false,50,50),

  -- Neighborhood Index (mosaic-01..05.jpeg) — 5 img -> SpreadMosaic
  ('c7200000-0000-4000-a000-000000000051','c7100000-0000-4000-a000-000000000005',
   $q$Corner, North$q$,$q$The same corner, the ninth year.$q$,
   'https://cbdiujvqpirrvzodfujm.supabase.co/storage/v1/object/public/seed/mosaic-01.jpeg',0,true,50,50),
  ('c7200000-0000-4000-a000-000000000052','c7100000-0000-4000-a000-000000000005',
   $q$Fence$q$,$q$It was blue when I moved here.$q$,
   'https://cbdiujvqpirrvzodfujm.supabase.co/storage/v1/object/public/seed/mosaic-02.jpeg',1,false,50,50),
  ('c7200000-0000-4000-a000-000000000053','c7100000-0000-4000-a000-000000000005',
   $q$Afternoon$q$,$q$Nobody home. Nobody ever home at this hour.$q$,
   'https://cbdiujvqpirrvzodfujm.supabase.co/storage/v1/object/public/seed/mosaic-03.jpeg',2,false,50,50),
  ('c7200000-0000-4000-a000-000000000054','c7100000-0000-4000-a000-000000000005',
   $q$Utility$q$,$q$Somebody's job to paint that number.$q$,
   'https://cbdiujvqpirrvzodfujm.supabase.co/storage/v1/object/public/seed/mosaic-04.jpeg',3,false,50,50),
  ('c7200000-0000-4000-a000-000000000055','c7100000-0000-4000-a000-000000000005',
   $q$Corner, South$q$,$q$Four blocks is enough. It has always been enough.$q$,
   'https://cbdiujvqpirrvzodfujm.supabase.co/storage/v1/object/public/seed/mosaic-05.jpeg',4,false,50,50),

  -- Field Notes (six-01..07 — MIXED extensions!) — 7 img -> Spread6
  ('c7200000-0000-4000-a000-000000000061','c7100000-0000-4000-a000-000000000006',
   $q$Note 01$q$,$q$Begin anywhere.$q$,
   'https://cbdiujvqpirrvzodfujm.supabase.co/storage/v1/object/public/seed/six-01.jpeg',0,true,50,50),
  ('c7200000-0000-4000-a000-000000000062','c7100000-0000-4000-a000-000000000006',
   $q$Note 02$q$,$q$Collected, not composed.$q$,
   'https://cbdiujvqpirrvzodfujm.supabase.co/storage/v1/object/public/seed/six-02.jpeg',1,false,50,50),
  ('c7200000-0000-4000-a000-000000000063','c7100000-0000-4000-a000-000000000006',
   $q$Note 03$q$,$q$The order arrived later.$q$,
   'https://cbdiujvqpirrvzodfujm.supabase.co/storage/v1/object/public/seed/six-03.jpg',2,false,50,50),
  ('c7200000-0000-4000-a000-000000000064','c7100000-0000-4000-a000-000000000006',
   $q$Note 04$q$,$q$Kept because it wouldn't resolve.$q$,
   'https://cbdiujvqpirrvzodfujm.supabase.co/storage/v1/object/public/seed/six-04.jpeg',3,false,50,50),
  ('c7200000-0000-4000-a000-000000000065','c7100000-0000-4000-a000-000000000006',
   $q$Note 05$q$,$q$Out of sequence on purpose.$q$,
   'https://cbdiujvqpirrvzodfujm.supabase.co/storage/v1/object/public/seed/six-05.jpg',4,false,50,50),
  ('c7200000-0000-4000-a000-000000000066','c7100000-0000-4000-a000-000000000006',
   $q$Note 06$q$,$q$Nearly discarded twice.$q$,
   'https://cbdiujvqpirrvzodfujm.supabase.co/storage/v1/object/public/seed/six-06.JPG',5,false,50,50),
  ('c7200000-0000-4000-a000-000000000067','c7100000-0000-4000-a000-000000000006',
   $q$Note 07$q$,$q$End anywhere.$q$,
   'https://cbdiujvqpirrvzodfujm.supabase.co/storage/v1/object/public/seed/six-07.jpeg',6,false,50,50),

  -- The Slow Channel — Daniel Osei essay (~440 words) -> TextSubmission (<=500)
  ('c7200000-0000-4000-a000-000000000070','c7100000-0000-4000-a000-000000000007',
   null,
   $q$My father wrote letters. Not as a practice or a statement — there simply wasn't another way, and by the time there was, he had gotten used to the shape of it.

I have most of them. They are not interesting. He describes weather, the state of a car he no longer owns, a dispute with a neighbor about a tree. He asks questions and then, because the answers were six weeks out, he answers them himself, badly, and the next letter corrects the guess. Reading them in order is like watching someone think slowly in public.

What strikes me now is not the content but the drag. Every letter had to survive the gap. He had six weeks to decide whether a sentence was worth the stamp, and the ones that made it through had been sanded down by waiting. There is nothing in that box he regretted sending. I cannot say the same about a single week of my own outgoing messages.

The argument for slowness usually arrives as an argument against speed, which is why nobody listens to it. Speed is not the enemy. Speed is extraordinary. The problem is that speed removed the gap, and the gap was doing work nobody had bothered to name — it was the part of the process where you found out whether you actually meant it.

We have replaced the gap with volume. This is not a trade anyone consciously made. It happened the way most things happen, one convenient decision at a time, and now I produce more sentences in a morning than my father produced in a decade, and I would not defend one of them in a box someone opens in forty years.

I am not proposing we go back. I don't want the six weeks. I want the sanding.

The interesting question is whether the drag can be manufactured — whether you can install a gap on purpose, artificially, and get the same result. My instinct is no. My father's patience wasn't a virtue; it was infrastructure. He wasn't waiting because waiting was good for him. He was waiting because the mail was slow.

But I keep the box on the shelf where I can see it, which is its own kind of argument, and every so often I write something and don't send it, and watch what happens to it overnight.

Usually it dies. That is the point.$q$,
   null,0,true,50,50),

  -- Against the Feed — Leila Hassan essay (~910 words) -> TextSpread (501-1800)
  ('c7200000-0000-4000-a000-000000000080','c7100000-0000-4000-a000-000000000008',
   null,
   $q$There is a particular sound a magazine makes when you drop it on a table. It is not a good sound or a bad sound. It is a sound that means something arrived and is now here, in the room, taking up space, and will continue taking up space until somebody deals with it.

Nothing on my phone makes that sound. Nothing on my phone takes up space. This is presented as the central achievement of the last twenty years and I have come to believe it is the central problem.

Consider what it costs to publish a photograph. Online: nothing. Not approximately nothing — actually nothing, to a rounding error, forever, at infinite scale. In print: paper, ink, a press, a person who decides, a person who ships, and a hard edge at page forty where the thing simply stops. The online photograph is free and therefore weightless. The printed photograph cost something and therefore has to be worth something, and somebody had to decide it was, and that decision is legible on the page in a way that no amount of engagement metrics can reproduce.

This is not nostalgia. I am not arguing that print is better. I am arguing that scarcity is a mechanism, and we removed it without building a replacement, and the thing it was doing turns out to have been most of the value.

The feed's fundamental promise is that nothing ever has to end. There is always another. This sounds like abundance and is actually a kind of poverty, because a thing that never ends can never be finished, and a thing that can never be finished can never be considered. You cannot contemplate a river. You can only stand in it.

What a magazine does — what any bounded object does — is stop. It has a last page. The last page is not a limitation of the format; it is the format's entire argument. It says: this much, and no more, and somebody chose. Everything inside those covers was chosen against everything that could have been there instead. That's what makes it worth your attention. Not that it's good, necessarily. That it's finite, and the finitude implies a choosing, and the choosing implies a person.

The counterargument is obvious and I want to take it seriously: gatekeeping. Scarcity in publishing has historically meant a small number of people deciding what a large number of people were allowed to see, and those people were, overwhelmingly, the same kind of person. The feed broke that, genuinely, and the breaking was good. I am not interested in restoring the gate.

But there is a difference between removing the gatekeeper and removing the gate. What we built instead is not an absence of curation — it is curation performed by a system optimizing for time spent, which is to say curation by an entity with a financial interest in your never being satisfied. We didn't democratize the decision. We automated it, and handed it to something that does not want what you want.

The alternative I'm interested in is not fewer gatekeepers but more of them — everyone their own editor, everyone assembling their own bounded object, everyone forced by the physical limits of paper to say: this and not that. Not because your choices are better than an algorithm's. Because they're yours, and you'll remember making them, and the object on your table will be evidence that you did.

There is a version of this that is precious and insufferable and I want to name it before someone else does. The fetishization of the analog is a genuine aesthetic failure — the person who bought a typewriter to be a certain kind of person, the vinyl that never gets played. If the argument for print is that it feels better, the argument is worthless. Feelings about objects are cheap and available for purchase.

The argument has to be structural or it isn't an argument. And structurally it's this: the constraint produces the attention. Not the paper. Not the smell. The constraint. Forty pages means somebody had to decide, and deciding is the whole job, and any medium that removes the necessity of deciding has removed the job while keeping the title.

My father used to get a magazine in the mail every month. He read it — all of it, including the parts he didn't care about, because it was there and it was finite and finishing it was possible. He could not do that with the internet. Nobody can do that with the internet. Not because the internet is worse but because it is not a thing, it's a condition, and you don't finish a condition, you just eventually stop.

I would like to finish something. That's all this is. I would like there to be a last page, and to reach it, and to put the thing down on the table and hear the sound it makes.$q$,
   null,0,true,50,50),

  -- Inventory of a Rented Room — Olivia Martinez poem -> PoetryPage
  -- Short lines + stanza breaks satisfy isPoetry(): avg line < 60 chars,
  -- >=3 line-breaks per 100 words, multiple '\n\n' stanza breaks.
  ('c7200000-0000-4000-a000-000000000090','c7100000-0000-4000-a000-000000000009',
   null,
   $q$One chair, which is enough.
One window, which is not.

The landlord painted over the hinges
so the whole thing opens
like a decision you regret.

August comes in anyway.
August does not need the window.

I have a table and a lamp
and the particular arrangement
of a person who does not expect
to be here long,
and has been here
four years.

Downstairs, someone's radio.
Upstairs, someone's floor.

In the drawer: a key
to an apartment in another city
that has by now been rented
to somebody else,
who found the drawer empty
and did not wonder.

I am not lonely.
I am inventoried.

There is a difference
and I have four years
to explain it.$q$,
   null,0,true,50,50)
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- 8. CAMPAIGNS (4 total: Moleskine + Risograph updated in place, 2 new added)
--    discount is int4 = 2. avatar_url VERBATIM from manifest (uppercase .PNG),
--    renders full-bleed on CampaignPage. Find-or-create by (name, period) so
--    the two existing seeded campaigns are reused, not duplicated, then UPDATE
--    all four to the print-test copy + avatars.
-- ============================================================================
-- Create only-if-missing (existing Moleskine/Risograph are matched by name+period)
INSERT INTO public.campaigns (id, name, bio, discount, avatar_url, last_post, period_id, is_active)
SELECT 'c7300000-0000-4000-a000-000000000001', $q$Moleskine$q$,
       $q$Notebooks for people who still write things down before they mean them.$q$, 2,
       'https://cbdiujvqpirrvzodfujm.supabase.co/storage/v1/object/public/seed/campaign-01.PNG',
       $q$Since 1997. Before that, since 1888, depending who you ask.$q$,
       'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', true
WHERE NOT EXISTS (SELECT 1 FROM public.campaigns WHERE name = $q$Moleskine$q$ AND period_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa');

INSERT INTO public.campaigns (id, name, bio, discount, avatar_url, last_post, period_id, is_active)
SELECT 'c7300000-0000-4000-a000-000000000002', $q$Risograph Press Co.$q$,
       $q$Small-run printing in impossible colors. Fluorescent pink is not a phase.$q$, 2,
       'https://cbdiujvqpirrvzodfujm.supabase.co/storage/v1/object/public/seed/campaign-02.PNG',
       $q$Now booking spring runs.$q$,
       'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', true
WHERE NOT EXISTS (SELECT 1 FROM public.campaigns WHERE name = $q$Risograph Press Co.$q$ AND period_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa');

INSERT INTO public.campaigns (id, name, bio, discount, avatar_url, last_post, period_id, is_active)
SELECT 'c7300000-0000-4000-a000-000000000003', $q$Gulf Coast Film Lab$q$,
       $q$Develop, scan, mail back. Two weeks, sometimes three. We are not sorry.$q$, 2,
       'https://cbdiujvqpirrvzodfujm.supabase.co/storage/v1/object/public/seed/campaign-03.PNG',
       $q$C-41, E-6, black and white by hand.$q$,
       'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', true
WHERE NOT EXISTS (SELECT 1 FROM public.campaigns WHERE name = $q$Gulf Coast Film Lab$q$ AND period_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa');

INSERT INTO public.campaigns (id, name, bio, discount, avatar_url, last_post, period_id, is_active)
SELECT 'c7300000-0000-4000-a000-000000000004', $q$The Standing Desk$q$,
       $q$Furniture built to outlast the person who bought it.$q$, 2,
       'https://cbdiujvqpirrvzodfujm.supabase.co/storage/v1/object/public/seed/campaign-04.PNG',
       $q$Ten-year warranty. Fifty-year intent.$q$,
       'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', true
WHERE NOT EXISTS (SELECT 1 FROM public.campaigns WHERE name = $q$The Standing Desk$q$ AND period_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa');

-- Bring all four to the print-test copy + avatars (updates the pre-existing two).
UPDATE public.campaigns SET bio=$q$Notebooks for people who still write things down before they mean them.$q$, discount=2, avatar_url='https://cbdiujvqpirrvzodfujm.supabase.co/storage/v1/object/public/seed/campaign-01.PNG', last_post=$q$Since 1997. Before that, since 1888, depending who you ask.$q$, is_active=true WHERE name=$q$Moleskine$q$ AND period_id='aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
UPDATE public.campaigns SET bio=$q$Small-run printing in impossible colors. Fluorescent pink is not a phase.$q$, discount=2, avatar_url='https://cbdiujvqpirrvzodfujm.supabase.co/storage/v1/object/public/seed/campaign-02.PNG', last_post=$q$Now booking spring runs.$q$, is_active=true WHERE name=$q$Risograph Press Co.$q$ AND period_id='aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
UPDATE public.campaigns SET bio=$q$Develop, scan, mail back. Two weeks, sometimes three. We are not sorry.$q$, discount=2, avatar_url='https://cbdiujvqpirrvzodfujm.supabase.co/storage/v1/object/public/seed/campaign-03.PNG', last_post=$q$C-41, E-6, black and white by hand.$q$, is_active=true WHERE name=$q$Gulf Coast Film Lab$q$ AND period_id='aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
UPDATE public.campaigns SET bio=$q$Furniture built to outlast the person who bought it.$q$, discount=2, avatar_url='https://cbdiujvqpirrvzodfujm.supabase.co/storage/v1/object/public/seed/campaign-04.PNG', last_post=$q$Ten-year warranty. Fifty-year intent.$q$, is_active=true WHERE name=$q$The Standing Desk$q$ AND period_id='aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';

-- ============================================================================
-- 9. COMMUNICATIONS (4) — status='submitted', period Spring 2026.
--    Generator shows up to 4, filtered by recipient + submitted + period.
-- ============================================================================
INSERT INTO public.communications
  (id, sender_id, recipient_id, subject, content, status, period_id, word_count)
VALUES
  -- -> Curator A (Lena Vasquez)
  ('c7400000-0000-4000-a000-000000000001','0889833d-d56a-4969-83b4-43c9585bcd92','185f8c7c-9837-425a-ac1c-ebf18d1af1b9',
   $q$On the salt line$q$,
   $q$I've been shooting this same stretch for six years and I still can't tell you why. If it makes the issue, put it early — it's a beginning, not an ending.$q$,
   'submitted','aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',31),
  ('c7400000-0000-4000-a000-000000000002','402f2415-65c1-4efa-a95e-c0ccb38f7048','185f8c7c-9837-425a-ac1c-ebf18d1af1b9',
   $q$Re: the essay$q$,
   $q$Cut it if it runs long. I'd rather be short and land than complete and drift. You have my permission to be ruthless.$q$,
   'submitted','aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',24),

  -- -> Curator B (Adam Johnson)
  ('c7400000-0000-4000-a000-000000000003','cccccccc-cccc-cccc-cccc-cccccccccccc','2ad6af92-279d-4eb7-a1b6-b51ec042aa85',
   $q$About the poem$q$,
   $q$Four years in the same room and it took me all four to write nine lines about it. Print it small. It wants to be small.$q$,
   'submitted','aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',27),
  ('c7400000-0000-4000-a000-000000000004','55555555-5555-5555-5555-555555555555','2ad6af92-279d-4eb7-a1b6-b51ec042aa85',
   $q$Field notes, sequencing$q$,
   $q$The order doesn't matter. I mean that — if the layout wants a different sequence, take it. The notes were never sequential.$q$,
   'submitted','aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',23)
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- 10. CURATOR SELECTIONS
--     Scoped-delete the two print-test curators' rows for THIS period only,
--     then re-insert exactly the doc's selections. Idempotent.
-- ============================================================================
DELETE FROM public.curator_creator_selections
 WHERE period_id='aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'
   AND curator_id IN ('185f8c7c-9837-425a-ac1c-ebf18d1af1b9','2ad6af92-279d-4eb7-a1b6-b51ec042aa85');
DELETE FROM public.curator_collab_selections
 WHERE period_id='aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'
   AND curator_id IN ('185f8c7c-9837-425a-ac1c-ebf18d1af1b9','2ad6af92-279d-4eb7-a1b6-b51ec042aa85');
DELETE FROM public.curator_campaign_selections
 WHERE period_id='aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'
   AND curator_id IN ('185f8c7c-9837-425a-ac1c-ebf18d1af1b9','2ad6af92-279d-4eb7-a1b6-b51ec042aa85');
DELETE FROM public.curator_communication_selections
 WHERE period_id='aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'
   AND curator_id IN ('185f8c7c-9837-425a-ac1c-ebf18d1af1b9','2ad6af92-279d-4eb7-a1b6-b51ec042aa85');

-- ── Curator A — Lena Vasquez — 10 contributors ─────────────────────────────
INSERT INTO public.curator_creator_selections (curator_id, creator_id, period_id)
VALUES
  ('185f8c7c-9837-425a-ac1c-ebf18d1af1b9','0889833d-d56a-4969-83b4-43c9585bcd92','aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'), -- Maya Torres
  ('185f8c7c-9837-425a-ac1c-ebf18d1af1b9','11111111-1111-1111-1111-111111111111','aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'), -- Sarah Chen
  ('185f8c7c-9837-425a-ac1c-ebf18d1af1b9','22222222-2222-2222-2222-222222222222','aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'), -- James Wilson
  ('185f8c7c-9837-425a-ac1c-ebf18d1af1b9','33333333-3333-3333-3333-333333333333','aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'), -- Maya Patel
  ('185f8c7c-9837-425a-ac1c-ebf18d1af1b9','44444444-4444-4444-4444-444444444444','aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'), -- Carlos Rodriguez
  ('185f8c7c-9837-425a-ac1c-ebf18d1af1b9','402f2415-65c1-4efa-a95e-c0ccb38f7048','aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'), -- Daniel Osei
  ('185f8c7c-9837-425a-ac1c-ebf18d1af1b9','77777777-7777-7777-7777-777777777777','aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'), -- Leila Hassan
  ('185f8c7c-9837-425a-ac1c-ebf18d1af1b9','cccccccc-cccc-cccc-cccc-cccccccccccc','aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'), -- Olivia Martinez
  ('185f8c7c-9837-425a-ac1c-ebf18d1af1b9','55555555-5555-5555-5555-555555555555','aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'), -- Emma Zhang
  ('185f8c7c-9837-425a-ac1c-ebf18d1af1b9','66666666-6666-6666-6666-666666666666','aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'); -- David Okafor

-- ── Curator B — Adam Johnson — 9 contributors ──────────────────────────────
INSERT INTO public.curator_creator_selections (curator_id, creator_id, period_id)
VALUES
  ('2ad6af92-279d-4eb7-a1b6-b51ec042aa85','0889833d-d56a-4969-83b4-43c9585bcd92','aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'), -- Maya Torres
  ('2ad6af92-279d-4eb7-a1b6-b51ec042aa85','55555555-5555-5555-5555-555555555555','aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'), -- Emma Zhang
  ('2ad6af92-279d-4eb7-a1b6-b51ec042aa85','44444444-4444-4444-4444-444444444444','aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'), -- Carlos Rodriguez
  ('2ad6af92-279d-4eb7-a1b6-b51ec042aa85','cccccccc-cccc-cccc-cccc-cccccccccccc','aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'), -- Olivia Martinez
  ('2ad6af92-279d-4eb7-a1b6-b51ec042aa85','dddddddd-dddd-dddd-dddd-dddddddddddd','aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'), -- Kai Tanaka
  ('2ad6af92-279d-4eb7-a1b6-b51ec042aa85','eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee','aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'), -- Zoe Williams
  ('2ad6af92-279d-4eb7-a1b6-b51ec042aa85','ffffffff-ffff-ffff-ffff-ffffffffffff','aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'), -- Miguel Garcia
  ('2ad6af92-279d-4eb7-a1b6-b51ec042aa85','11111111-2222-3333-4444-555555555555','aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'), -- Aisha Johnson
  ('2ad6af92-279d-4eb7-a1b6-b51ec042aa85','22222222-3333-4444-5555-666666666666','aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'); -- Benjamin Lee

-- ── Collab selections ──────────────────────────────────────────────────────
-- source_id patterns match curation.ts + IntegratedCollabsSection.tsx exactly:
--   community_<template_id> · local_<template_id>_<City> · <collab_id> (private)
INSERT INTO public.curator_collab_selections
  (curator_id, collab_id, period_id, participation_mode, location, source_id)
VALUES
  -- Curator A: community + local(Pensacola)
  ('185f8c7c-9837-425a-ac1c-ebf18d1af1b9','d7100000-0000-4000-a000-000000000001','aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa','community',null,'community_b7100000-0000-4000-a000-000000000001'),
  ('185f8c7c-9837-425a-ac1c-ebf18d1af1b9','d7100000-0000-4000-a000-000000000002','aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa','local','Pensacola','local_b7100000-0000-4000-a000-000000000002_Pensacola'),
  -- Curator B: local(Pensacola) + private
  ('2ad6af92-279d-4eb7-a1b6-b51ec042aa85','d7100000-0000-4000-a000-000000000002','aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa','local','Pensacola','local_b7100000-0000-4000-a000-000000000002_Pensacola'),
  ('2ad6af92-279d-4eb7-a1b6-b51ec042aa85','d7100000-0000-4000-a000-000000000003','aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa','private',null,'d7100000-0000-4000-a000-000000000003');

-- ── Campaign selections ────────────────────────────────────────────────────
-- Resolve campaign ids by name+period (robust to whatever UUID the pre-existing
-- Moleskine/Risograph rows carry).
INSERT INTO public.curator_campaign_selections (curator_id, campaign_id, period_id)
SELECT '185f8c7c-9837-425a-ac1c-ebf18d1af1b9', c.id, 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'
  FROM public.campaigns c
 WHERE c.period_id='aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'
   AND c.name IN ($q$Moleskine$q$, $q$Gulf Coast Film Lab$q$);

INSERT INTO public.curator_campaign_selections (curator_id, campaign_id, period_id)
SELECT '2ad6af92-279d-4eb7-a1b6-b51ec042aa85', c.id, 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'
  FROM public.campaigns c
 WHERE c.period_id='aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'
   AND c.name IN ($q$Risograph Press Co.$q$, $q$The Standing Desk$q$);

-- ── Communication selections ───────────────────────────────────────────────
INSERT INTO public.curator_communication_selections (curator_id, period_id, include_communications)
VALUES
  ('185f8c7c-9837-425a-ac1c-ebf18d1af1b9','aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',true),
  ('2ad6af92-279d-4eb7-a1b6-b51ec042aa85','aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',true);

COMMIT;

-- ============================================================================
-- POST-RUN SANITY CHECKS (optional — run separately, outside the transaction)
-- ============================================================================
-- SELECT name FROM storage.objects WHERE bucket_id='seed' ORDER BY name;  -- confirm 41 files
-- SELECT page_title, status FROM public.content WHERE id::text LIKE 'c7100000-%';         -- 9 rows, all 'submitted'
-- SELECT count(*) FROM public.content_entries WHERE id::text LIKE 'c7200000-%';           -- 22 rows
-- SELECT title, participation_mode FROM public.collabs WHERE id::text LIKE 'd7100000-%';  -- 3 rows
-- SELECT curator_id, count(*) FROM public.curator_creator_selections
--   WHERE period_id='aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa' GROUP BY curator_id;           -- 10 (Lena) + 9 (Adam)

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error('Missing env: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY required');
  process.exit(1);
}

const db = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

// Fixed UUIDs — deterministic re-seed
const CONTRIBUTOR_ID = '11111111-1111-1111-1111-111111111111';
const CURATOR_ID     = '22222222-2222-2222-2222-222222222222';
const BOTH_ID        = '33333333-3333-3333-3333-333333333333';
const PERIOD_ID      = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';

const TEMPLATE_IDS = [
  'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbb01',
  'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbb02',
  'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbb03',
];

const COLLAB_IDS = [
  'dddddddd-dddd-dddd-dddd-dddddddddd01',
  'dddddddd-dddd-dddd-dddd-dddddddddd02',
  'dddddddd-dddd-dddd-dddd-dddddddddd03',
];

const EXTRA_PROFILES = [
  { id: 'cccccccc-cccc-cccc-cccc-cccccccccc01', email: 'mia@seed.test',   first: 'Mia',   last: 'Torres',   city: 'Austin',        bio: 'Photographer and poet.' },
  { id: 'cccccccc-cccc-cccc-cccc-cccccccccc02', email: 'eli@seed.test',   first: 'Eli',   last: 'Park',     city: 'Chicago',       bio: 'Visual artist, printmaker.' },
  { id: 'cccccccc-cccc-cccc-cccc-cccccccccc03', email: 'nora@seed.test',  first: 'Nora',  last: 'Simms',    city: 'New York',      bio: 'Essay writer, archivist.' },
  { id: 'cccccccc-cccc-cccc-cccc-cccccccccc04', email: 'luca@seed.test',  first: 'Luca',  last: 'Bianchi',  city: 'Miami',         bio: 'Illustrator and muralist.' },
  { id: 'cccccccc-cccc-cccc-cccc-cccccccccc05', email: 'zoe@seed.test',   first: 'Zoe',   last: 'Marsh',    city: 'Seattle',       bio: 'Documentary photographer.' },
  { id: 'cccccccc-cccc-cccc-cccc-cccccccccc06', email: 'omar@seed.test',  first: 'Omar',  last: 'Ali',      city: 'Houston',       bio: 'Poet and songwriter.' },
  { id: 'cccccccc-cccc-cccc-cccc-cccccccccc07', email: 'iris@seed.test',  first: 'Iris',  last: 'Nakamura', city: 'San Francisco', bio: 'Ceramicist, writer.' },
  { id: 'cccccccc-cccc-cccc-cccc-cccccccccc08', email: 'theo@seed.test',  first: 'Theo',  last: 'Grant',    city: 'Nashville',     bio: 'Musician and zine maker.' },
  { id: 'cccccccc-cccc-cccc-cccc-cccccccccc09', email: 'ava@seed.test',   first: 'Ava',   last: 'Reyes',    city: 'Los Angeles',   bio: 'Collage artist.' },
];

async function upsert(table: string, rows: object[], conflict = 'id') {
  const { error } = await db.from(table).upsert(rows as any[], { onConflict: conflict });
  if (error) throw new Error(`[${table}] ${error.message}`);
}

async function createAuthUser(id: string, email: string, firstName: string, lastName: string) {
  const { error } = await db.auth.admin.createUser({
    id,
    email,
    password: 'Password123!',
    email_confirm: true,
    user_metadata: { first_name: firstName, last_name: lastName },
  });
  if (error && !error.message.toLowerCase().includes('already')) {
    console.warn(`  auth user ${email}: ${error.message}`);
  }
}

async function main() {
  console.log('Seeding online//offline…\n');

  // 1 — Auth users
  console.log('1. Auth users (12)');
  await createAuthUser(CONTRIBUTOR_ID, 'contributor@seed.test', 'Alex',   'Chen');
  await createAuthUser(CURATOR_ID,     'curator@seed.test',     'Jordan', 'Webb');
  await createAuthUser(BOTH_ID,        'both@seed.test',        'Sam',    'Okoro');
  for (const p of EXTRA_PROFILES) {
    await createAuthUser(p.id, p.email, p.first, p.last);
  }

  // 2 — Profiles
  console.log('2. Profiles');
  await upsert('profiles', [
    { id: CONTRIBUTOR_ID, first_name: 'Alex',   last_name: 'Chen',  city: 'Austin',   bio: 'Street photographer.',       is_public: true, content_type: 'photography' },
    { id: CURATOR_ID,     first_name: 'Jordan', last_name: 'Webb',  city: 'New York', bio: 'Curator of slow moments.',   is_public: true, content_type: 'mixed' },
    { id: BOTH_ID,        first_name: 'Sam',    last_name: 'Okoro', city: 'Chicago',  bio: 'Poet, curator, wanderer.',   is_public: true, content_type: 'writing' },
    ...EXTRA_PROFILES.map(p => ({
      id: p.id, first_name: p.first, last_name: p.last,
      city: p.city, bio: p.bio, is_public: true,
    })),
  ]);

  // 3 — Profile types
  console.log('3. Profile types');
  await upsert('profile_types', [
    { profile_id: CONTRIBUTOR_ID, type: 'contributor' },
    { profile_id: CURATOR_ID,     type: 'curator' },
    { profile_id: BOTH_ID,        type: 'contributor' },
    { profile_id: BOTH_ID,        type: 'curator' },
    ...EXTRA_PROFILES.map(p => ({ profile_id: p.id, type: 'contributor' })),
  ], 'profile_id,type');

  // 4 — Active period
  console.log('4. Period');
  await upsert('periods', [{
    id: PERIOD_ID,
    name: 'Spring 2026',
    season: 'Spring',
    year: 2026,
    start_date: '2026-03-01',
    end_date: '2026-05-31',
    is_active: true,
  }]);

  // 5 — Collab templates
  console.log('5. Collab templates');
  await upsert('collab_templates', [
    {
      id: TEMPLATE_IDS[0],
      name: 'One Hundred Mornings',
      type: 'chain',
      display_text: 'A chain of morning scenes — each contributor photographs their first moments of waking.',
      instructions: 'Submit one image: something you see within the first 10 minutes of your morning. No staging.',
      is_active: true,
    },
    {
      id: TEMPLATE_IDS[1],
      name: 'Edges',
      type: 'theme',
      display_text: 'Where things meet. Coastlines, margins, doorways — any threshold between states.',
      instructions: 'Submit 1–3 images or a short poem (under 200 words) exploring an edge or boundary.',
      is_active: true,
    },
    {
      id: TEMPLATE_IDS[2],
      name: 'The Long Way Round',
      type: 'narrative',
      display_text: 'A collective travelogue. Each contributor adds a chapter to a journey with no fixed destination.',
      instructions: 'Build on the previous entry. Keep the journey continuous — in tone if not in geography.',
      is_active: true,
    },
  ]);

  // 6 — Period templates
  console.log('6. Period templates');
  await upsert(
    'period_templates',
    TEMPLATE_IDS.map(tid => ({ period_id: PERIOD_ID, template_id: tid })),
    'period_id,template_id',
  );

  // 7 — Collab instances + participants
  console.log('7. Collabs + participants');
  await upsert('collabs', [
    {
      id: COLLAB_IDS[0],
      title: 'One Hundred Mornings',
      type: 'chain',
      is_private: false,
      participation_mode: 'community',
      location: null,
      created_by: BOTH_ID,
      period_id: PERIOD_ID,
      current_phase: 1,
      metadata: { template_id: TEMPLATE_IDS[0], participation_mode: 'community' },
    },
    {
      id: COLLAB_IDS[1],
      title: 'Edges - Austin',
      type: 'theme',
      is_private: false,
      participation_mode: 'local',
      location: 'Austin',
      created_by: CONTRIBUTOR_ID,
      period_id: PERIOD_ID,
      current_phase: 1,
      metadata: { template_id: TEMPLATE_IDS[1], participation_mode: 'local', location: 'Austin' },
    },
    {
      id: COLLAB_IDS[2],
      title: 'The Long Way Round',
      type: 'narrative',
      is_private: true,
      participation_mode: 'private',
      location: null,
      created_by: CURATOR_ID,
      period_id: PERIOD_ID,
      current_phase: 1,
      metadata: { template_id: TEMPLATE_IDS[2], participation_mode: 'private' },
    },
  ]);
  await upsert('collab_participants', [
    { id: 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeee01', collab_id: COLLAB_IDS[0], profile_id: BOTH_ID,        role: 'organizer', status: 'active',  participation_mode: 'community' },
    { id: 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeee02', collab_id: COLLAB_IDS[0], profile_id: EXTRA_PROFILES[0].id, role: 'member', status: 'active', participation_mode: 'community' },
    { id: 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeee03', collab_id: COLLAB_IDS[1], profile_id: CONTRIBUTOR_ID, role: 'organizer', status: 'active',  participation_mode: 'local', location: 'Austin', city: 'Austin' },
    { id: 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeee04', collab_id: COLLAB_IDS[1], profile_id: EXTRA_PROFILES[0].id, role: 'member', status: 'active', participation_mode: 'local', location: 'Austin', city: 'Austin' },
    { id: 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeee05', collab_id: COLLAB_IDS[2], profile_id: CURATOR_ID,     role: 'organizer', status: 'active',  participation_mode: 'private' },
    { id: 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeee06', collab_id: COLLAB_IDS[2], profile_id: BOTH_ID,        role: 'member',    status: 'invited', participation_mode: 'private' },
  ]);

  // 8 — Content + entries
  console.log('8. Content + entries');
  const CONTENT_IDS = [
    'ffffffff-ffff-ffff-ffff-ffffffffffff01',
    'ffffffff-ffff-ffff-ffff-ffffffffffff02',
  ];
  await upsert('content', [
    { id: CONTENT_IDS[0], creator_id: CONTRIBUTOR_ID, type: 'regular', status: 'submitted', period_id: PERIOD_ID, page_title: 'Street Light Studies' },
    { id: CONTENT_IDS[1], creator_id: BOTH_ID,        type: 'regular', status: 'submitted', period_id: PERIOD_ID, page_title: 'Edges of Nothing' },
  ]);
  await upsert('content_entries', [
    { id: 'gggggggg-gggg-gggg-gggg-gggggggggg01', content_id: CONTENT_IDS[0], title: 'Late at 6th & Lamar',       caption: 'Waiting for the light to change.', order_index: 0, is_feature: true,  is_full_spread: false },
    { id: 'gggggggg-gggg-gggg-gggg-gggggggggg02', content_id: CONTENT_IDS[0], title: 'Congress at 2am',           caption: 'The bridge belongs to nobody.',     order_index: 1, is_feature: false, is_full_spread: false },
    { id: 'gggggggg-gggg-gggg-gggg-gggggggggg03', content_id: CONTENT_IDS[1], title: 'The Margin',               caption: 'A notebook page left half-blank.',  order_index: 0, is_feature: true,  is_full_spread: false },
  ]);

  // 9 — Communications
  console.log('9. Communications');
  await upsert('communications', [
    {
      id: 'hhhhhhhh-hhhh-hhhh-hhhh-hhhhhhhhhh01',
      sender_id: CONTRIBUTOR_ID,
      recipient_id: CURATOR_ID,
      subject: 'About my submission',
      content: 'Hi Jordan — I wanted to give you context for the series I submitted this quarter. All shots were taken on a single evening walk. Let me know if you have questions.',
      status: 'submitted',
      period_id: PERIOD_ID,
      word_count: 38,
    },
    {
      id: 'hhhhhhhh-hhhh-hhhh-hhhh-hhhhhhhhhh02',
      sender_id: BOTH_ID,
      recipient_id: CURATOR_ID,
      subject: 'Collab idea for next season',
      content: 'Thinking about a chain collaboration centered on silence. Long exposures, quiet writing. Would you want to co-organize?',
      status: 'submitted',
      period_id: PERIOD_ID,
      word_count: 24,
    },
  ]);

  // 10 — Campaigns
  console.log('10. Campaigns');
  await upsert('campaigns', [
    {
      id: 'iiiiiiii-iiii-iiii-iiii-iiiiiiiiiiii',
      name: 'Moleskine',
      bio: 'Notebooks for those who still write by hand.',
      discount: '15% off with code SLOWMAG',
      period_id: PERIOD_ID,
      is_active: true,
    },
    {
      id: 'iiiiiiii-iiii-iiii-iiii-iiiiiiiiiii2',
      name: 'Risograph Press Co.',
      bio: 'Independent risograph printing for zines, books, and posters.',
      discount: 'Free shipping on first order',
      period_id: PERIOD_ID,
      is_active: true,
    },
  ]);

  console.log('\nSeed complete.');
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});

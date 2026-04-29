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

// Auth accounts already exist — UUIDs must match existing auth.users rows
const CONTRIBUTOR1_ID = '0889833d-d56a-4969-83b4-43c9585bcd92'; // Maya Torres
const CONTRIBUTOR2_ID = '402f2415-65c1-4efa-a95e-c0ccb38f7048'; // Daniel Osei
const CURATOR1_ID     = '185f8c7c-9837-425a-ac1c-ebf18d1af1b9'; // Lena Vasquez

const PERIOD_ID = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';

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

async function upsert(table: string, rows: object[], conflict = 'id') {
  const { error } = await db.from(table).upsert(rows as any[], { onConflict: conflict });
  if (error) throw new Error(`[${table}] ${error.message}`);
  console.log(`  ✓ ${table} (${rows.length} row${rows.length !== 1 ? 's' : ''})`);
}

async function main() {
  console.log('Seeding online//offline…\n');

  // 1 — Profiles (auth accounts already exist)
  console.log('1. Profiles');
  await upsert('profiles', [
    { id: CONTRIBUTOR1_ID, first_name: 'Maya',   last_name: 'Torres',  city: 'Austin',   bio: 'Street photographer, documentary work.', is_public: true, content_type: 'photography' },
    { id: CONTRIBUTOR2_ID, first_name: 'Daniel', last_name: 'Osei',    city: 'Chicago',  bio: 'Poet, essayist, wanderer.',              is_public: true, content_type: 'writing' },
    { id: CURATOR1_ID,     first_name: 'Lena',   last_name: 'Vasquez', city: 'New York', bio: 'Curator of slow moments.',               is_public: true, content_type: 'mixed' },
  ]);

  // 2 — Profile types
  console.log('2. Profile types');
  await upsert('profile_types', [
    { profile_id: CONTRIBUTOR1_ID, type: 'contributor' },
    { profile_id: CONTRIBUTOR2_ID, type: 'contributor' },
    { profile_id: CURATOR1_ID,     type: 'curator' },
  ], 'profile_id,type');

  // 3 — Active period
  console.log('3. Period');
  await upsert('periods', [{
    id: PERIOD_ID,
    name: 'Spring 2026',
    season: 'Spring',
    year: 2026,
    start_date: '2026-03-01',
    end_date: '2026-05-31',
    is_active: true,
  }]);

  // 4 — Collab templates
  console.log('4. Collab templates');
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

  // 5 — Period templates
  console.log('5. Period templates');
  await upsert(
    'period_templates',
    TEMPLATE_IDS.map(tid => ({ period_id: PERIOD_ID, template_id: tid })),
    'period_id,template_id',
  );

  // 6 — Collab instances + participants
  console.log('6. Collabs');
  await upsert('collabs', [
    {
      id: COLLAB_IDS[0],
      title: 'One Hundred Mornings',
      type: 'chain',
      is_private: false,
      participation_mode: 'community',
      location: null,
      created_by: CONTRIBUTOR2_ID,
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
      created_by: CONTRIBUTOR1_ID,
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
      created_by: CURATOR1_ID,
      period_id: PERIOD_ID,
      current_phase: 1,
      metadata: { template_id: TEMPLATE_IDS[2], participation_mode: 'private' },
    },
  ]);

  console.log('6b. Collab participants');
  await upsert('collab_participants', [
    { id: 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeee01', collab_id: COLLAB_IDS[0], profile_id: CONTRIBUTOR2_ID, role: 'organizer', status: 'active',  participation_mode: 'community' },
    { id: 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeee02', collab_id: COLLAB_IDS[0], profile_id: CONTRIBUTOR1_ID, role: 'member',    status: 'active',  participation_mode: 'community' },
    { id: 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeee03', collab_id: COLLAB_IDS[1], profile_id: CONTRIBUTOR1_ID, role: 'organizer', status: 'active',  participation_mode: 'local', location: 'Austin', city: 'Austin' },
    { id: 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeee04', collab_id: COLLAB_IDS[2], profile_id: CURATOR1_ID,     role: 'organizer', status: 'active',  participation_mode: 'private' },
    { id: 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeee05', collab_id: COLLAB_IDS[2], profile_id: CONTRIBUTOR2_ID, role: 'member',    status: 'invited', participation_mode: 'private' },
  ]);

  // 7 — Content + entries
  console.log('7. Content + entries');
  const CONTENT_IDS = [
    'ffffffff-ffff-ffff-ffff-ffffffffffff01',
    'ffffffff-ffff-ffff-ffff-ffffffffffff02',
  ];
  await upsert('content', [
    { id: CONTENT_IDS[0], creator_id: CONTRIBUTOR1_ID, type: 'regular', status: 'submitted', period_id: PERIOD_ID, page_title: 'Street Light Studies' },
    { id: CONTENT_IDS[1], creator_id: CONTRIBUTOR2_ID, type: 'regular', status: 'submitted', period_id: PERIOD_ID, page_title: 'Edges of Nothing' },
  ]);
  await upsert('content_entries', [
    { id: 'gggggggg-gggg-gggg-gggg-gggggggggg01', content_id: CONTENT_IDS[0], title: 'Late at 6th & Lamar', caption: 'Waiting for the light to change.', order_index: 0, is_feature: true,  is_full_spread: false },
    { id: 'gggggggg-gggg-gggg-gggg-gggggggggg02', content_id: CONTENT_IDS[0], title: 'Congress at 2am',    caption: 'The bridge belongs to nobody.',    order_index: 1, is_feature: false, is_full_spread: false },
    { id: 'gggggggg-gggg-gggg-gggg-gggggggggg03', content_id: CONTENT_IDS[1], title: 'The Margin',         caption: 'A notebook page left half-blank.', order_index: 0, is_feature: true,  is_full_spread: false },
  ]);

  // 8 — Communications
  console.log('8. Communications');
  await upsert('communications', [
    {
      id: 'hhhhhhhh-hhhh-hhhh-hhhh-hhhhhhhhhh01',
      sender_id: CONTRIBUTOR1_ID,
      recipient_id: CURATOR1_ID,
      subject: 'About my submission',
      content: 'Hi Lena — I wanted to give you context for the series I submitted this quarter. All shots were taken on a single evening walk. Let me know if you have questions.',
      status: 'submitted',
      period_id: PERIOD_ID,
      word_count: 38,
    },
    {
      id: 'hhhhhhhh-hhhh-hhhh-hhhh-hhhhhhhhhh02',
      sender_id: CONTRIBUTOR2_ID,
      recipient_id: CURATOR1_ID,
      subject: 'Collab idea for next season',
      content: 'Thinking about a chain collaboration centered on silence. Long exposures, quiet writing. Would you want to co-organize?',
      status: 'submitted',
      period_id: PERIOD_ID,
      word_count: 24,
    },
  ]);

  // 9 — Campaigns
  console.log('9. Campaigns');
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

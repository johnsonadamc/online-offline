// scripts/test-generator.ts — Smoke test for the magazine generation pipeline.
// Usage: NEXT_PUBLIC_SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... npm run generate-test

import { createClient } from '@supabase/supabase-js';
import { generateMagazine } from '../src/magazine/core/generator';

const CURATOR_ID = '185f8c7c-9837-425a-ac1c-ebf18d1af1b9'; // Lena Vasquez (seed data)

async function getActivePeriodId(): Promise<string> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) {
    throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY');
  }
  const db = createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
  const { data, error } = await db.from('periods').select('id, season').eq('is_active', true).single();
  if (error || !data) throw new Error(`No active period found: ${error?.message ?? 'no data'}`);
  const row = data as { id: string; season: string };
  console.log(`[test] Active period: ${row.season} (${row.id})`);
  return row.id;
}

async function main() {
  console.log(`[test] Generating magazine for curator ${CURATOR_ID}...`);
  const periodId = await getActivePeriodId();
  const outputPath = await generateMagazine(CURATOR_ID, periodId);
  console.log(`[test] Done. PDF at: ${outputPath}`);
}

main().catch(err => {
  console.error('[test] Error:', err instanceof Error ? err.message : String(err));
  process.exit(1);
});

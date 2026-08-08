// scripts/test-generator.ts — Smoke test for the magazine generation pipeline.
// Usage: NEXT_PUBLIC_SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... npm run generate-test
// Options (after --):
//   --profile=screen|magcloud   print profile for PDF output (default: screen)
//   --curator=<uuid>            curator to generate for (default: Lena Vasquez)
// Example: npm run generate-test -- --profile=magcloud --curator=2ad6af92-279d-4eb7-a1b6-b51ec042aa85

import { createClient } from '@supabase/supabase-js';
import { generateMagazine } from '../src/magazine/core/generator';

const DEFAULT_CURATOR_ID = '185f8c7c-9837-425a-ac1c-ebf18d1af1b9'; // Lena Vasquez (seed data)

function argValue(name: string): string | undefined {
  const prefix = `--${name}=`;
  const hit = process.argv.find(a => a.startsWith(prefix));
  return hit ? hit.slice(prefix.length) : undefined;
}

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
  const curatorId = argValue('curator') ?? DEFAULT_CURATOR_ID;
  const profile = argValue('profile') ?? 'screen';
  console.log(`[test] Generating magazine for curator ${curatorId} (profile: ${profile})...`);
  const periodId = await getActivePeriodId();
  const outputPath = await generateMagazine(curatorId, periodId, profile);
  console.log(`[test] Done. PDF at: ${outputPath}`);
}

main().catch(err => {
  console.error('[test] Error:', err instanceof Error ? err.message : String(err));
  process.exit(1);
});

// scripts/dump-template-data.ts — READ-ONLY dump of the magazine's pre-render page list.
//
// Calls buildPageSequence() from the generator (the exact list generateMagazine renders), assigns
// the physical page numbers, writes the full data objects to /tmp/template-data-<curator>.json and
// prints one line per page plus a per-template summary. No inserts/updates/deletes, no Puppeteer,
// no PDF. Ordering and template selection come ONLY from the generator — nothing is re-implemented here.
//
// Run (Codespaces):
//   cd online-offline && set -a && source .env.local && set +a && npx tsx scripts/dump-template-data.ts
//   … --curator=<uuid>   (default: Lena Vasquez 185f8c7c-9837-425a-ac1c-ebf18d1af1b9)
//
// Needs NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY (RLS hides other users' rows from the anon key).

import { writeFileSync } from 'fs';
import { createClient } from '@supabase/supabase-js';
import { buildPageSequence, type PageSpec } from '../src/magazine/core/generator';
import { countWords } from '../src/lib/textDetect';

const DEFAULT_CURATOR_ID = '185f8c7c-9837-425a-ac1c-ebf18d1af1b9'; // Lena Vasquez (seed data)

function argValue(name: string): string | undefined {
  const prefix = `--${name}=`;
  const hit = process.argv.find(a => a.startsWith(prefix));
  return hit ? hit.slice(prefix.length) : undefined;
}

async function getActivePeriodId(): Promise<string> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY');
  }
  const db = createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
  const { data, error } = await db.from('periods').select('id, season').eq('is_active', true).single();
  if (error || !data) throw new Error(`No active period found: ${error?.message ?? 'no data'}`);
  const row = data as { id: string; season: string };
  console.log(`[dump] Active period: ${row.season} (${row.id})`);
  return row.id;
}

// ─── Summary helpers (read the data objects; they never reorder or re-select) ─

type Entry = { title?: string; caption?: string; media_url?: string; contributor?: { name?: string } };
type AnyData = Record<string, unknown>;

interface TemplateStats {
  count: number;
  pages: number[];
  imageCounts: number[];        // entries per slot (with an https media_url)
  entryCounts: number[];        // entries per slot (all)
  maxCaptionWords: number;      // longest single caption
  maxTotalCaptionWords: number; // sum of captions in one slot (the selection threshold input)
  essayWords: number[];         // word_count passed
  essayParasInBody: number[];   // paragraphs in `body` (split on blank lines)
  essayParasPassed: number[];   // non-empty body_para1..5 actually passed
  poemLines: number[];          // non-empty lines in `body`
  rosterSizes: number[];        // unique contributor names (collabs) / contributors (colophon)
  noteWords: number[];          // communication body word counts
  tocEntries: number[];
}

function blankStats(): TemplateStats {
  return {
    count: 0, pages: [], imageCounts: [], entryCounts: [], maxCaptionWords: 0, maxTotalCaptionWords: 0,
    essayWords: [], essayParasInBody: [], essayParasPassed: [], poemLines: [], rosterSizes: [],
    noteWords: [], tocEntries: [],
  };
}

function collect(stats: TemplateStats, spec: PageSpec, page: number) {
  const d = (spec.data ?? {}) as AnyData;
  stats.count += 1;
  stats.pages.push(page);

  const entries = Array.isArray(d.entries) ? (d.entries as Entry[]) : null;
  if (entries) {
    stats.entryCounts.push(entries.length);
    stats.imageCounts.push(entries.filter(e => (e.media_url ?? '').startsWith('https://')).length);
    const words = entries.map(e => countWords(e.caption ?? ''));
    stats.maxCaptionWords = Math.max(stats.maxCaptionWords, ...words, 0);
    stats.maxTotalCaptionWords = Math.max(stats.maxTotalCaptionWords, words.reduce((a, b) => a + b, 0));
    if (spec.templateName.startsWith('CollabSpread')) {
      const names = new Set(entries.map(e => e.contributor?.name).filter(Boolean));
      stats.rosterSizes.push(names.size);
    }
  }

  const body = typeof d.body === 'string' ? d.body : null;
  if (body !== null && spec.templateName === 'PoetryPage') {
    stats.poemLines.push(body.split('\n').filter(l => l.trim().length > 0).length);
  } else if (body !== null) {
    if (typeof d.word_count === 'number') stats.essayWords.push(d.word_count);
    stats.essayParasInBody.push(body.split(/\n\n+/).filter(p => p.trim()).length);
    const passed = ['body_para1', 'body_para2', 'body_para3', 'body_para4', 'body_para5']
      .filter(k => typeof d[k] === 'string' && (d[k] as string).trim().length > 0).length;
    stats.essayParasPassed.push(passed);
  }

  if (Array.isArray(d.messages)) {
    for (const m of d.messages as Array<{ body?: string }>) stats.noteWords.push(countWords(m.body ?? ''));
  }
  if (Array.isArray(d.contributors)) stats.rosterSizes.push((d.contributors as unknown[]).length);
  if (Array.isArray(d.toc)) stats.tocEntries.push((d.toc as unknown[]).length);
}

function fmtList(label: string, xs: number[]): string | null {
  return xs.length ? `${label} [${xs.join(', ')}]` : null;
}

// ─── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  const curatorId = argValue('curator') ?? DEFAULT_CURATOR_ID;
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY is required (the anon key cannot read other users\' selections)');
  }
  console.log(`[dump] Curator ${curatorId}`);
  const periodId = await getActivePeriodId();

  const { pageSequence, colophonPage } = await buildPageSequence(curatorId, periodId);

  // Physical page numbers: the generator renders pageSequence in order, one PDF page per
  // pageCount — the same count it logs as "total pages" (colophonPage).
  let physical = 1;
  const pages = pageSequence.map(spec => {
    const first = physical;
    physical += spec.pageCount;
    const d = (spec.data ?? {}) as AnyData;
    return {
      page: first,
      pages: spec.pageCount === 2 ? [first, first + 1] : [first],
      templateName: spec.templateName,
      pageCount: spec.pageCount,
      dataPage: typeof d.page === 'number' ? d.page : null,
      data: spec.data,
    };
  });
  const totalPages = physical - 1;

  const outPath = `/tmp/template-data-${curatorId}.json`;
  writeFileSync(outPath, JSON.stringify({ curatorId, periodId, totalPages, colophonPage, pages }, null, 2));

  console.log('\n── Pages ──────────────────────────────────────────────');
  for (const p of pages) {
    const range = p.pages.length === 2 ? `${p.pages[0]}–${p.pages[1]}` : `${p.pages[0]}`;
    const mismatch = p.dataPage !== null && p.dataPage !== p.page ? `   ⚠ data.page=${p.dataPage}` : '';
    console.log(`${range.padStart(7)}  ${p.templateName}${mismatch}`);
  }
  console.log(`\nTotal pages: ${totalPages}${totalPages % 4 === 0 ? '' : `  (not a multiple of 4 — saddle stitch needs ${Math.ceil(totalPages / 4) * 4})`}`);
  if (totalPages !== colophonPage) console.log(`⚠ totalPages ${totalPages} ≠ colophonPage ${colophonPage}`);

  const byTemplate = new Map<string, TemplateStats>();
  pages.forEach((p, i) => {
    const stats = byTemplate.get(p.templateName) ?? blankStats();
    collect(stats, pageSequence[i], p.page);
    byTemplate.set(p.templateName, stats);
  });

  console.log('\n── Per-template summary ───────────────────────────────');
  for (const [name, s] of byTemplate) {
    const parts = [
      `×${s.count}`,
      `pages [${s.pages.join(', ')}]`,
      fmtList('entries', s.entryCounts),
      fmtList('images', s.imageCounts),
      s.entryCounts.length ? `max caption words ${s.maxCaptionWords} (max per-slot total ${s.maxTotalCaptionWords})` : null,
      fmtList('essay words', s.essayWords),
      fmtList('paragraphs in body', s.essayParasInBody),
      fmtList('paragraphs passed', s.essayParasPassed),
      fmtList('poem lines', s.poemLines),
      fmtList(name === 'ColophonPage' ? 'contributors' : 'roster sizes', s.rosterSizes),
      fmtList('note words', s.noteWords),
      fmtList('toc entries', s.tocEntries),
    ].filter(Boolean);
    console.log(`${name.padEnd(22)} ${parts.join(' · ')}`);
  }

  console.log(`\n[dump] Wrote ${outPath}`);
}

main().catch(err => {
  console.error('[dump] Error:', err instanceof Error ? err.message : String(err));
  process.exit(1);
});

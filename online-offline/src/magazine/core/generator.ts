// src/magazine/core/generator.ts — Magazine generation pipeline.
// Reads curator selections from Supabase, maps to templates, renders via Puppeteer, outputs PDF.

import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import puppeteer from 'puppeteer';
import { PDFDocument } from 'pdf-lib';
import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';

import { selectTemplate } from './selectionLogic';
import type {
  SelectionItem,
  SelectionItemCreator,
  SelectionItemCollab,
  SelectionItemCommunications,
  SelectionItemCampaign,
  CoverData,
  FrontMatterData,
  ColophonData,
  TocEntry,
  TemplateAssignment,
  ContentType,
  ParticipationMode,
  CommunicationMessage,
  CollabEntryData,
  ContentEntryData,
} from './types';

// ─── Constants ────────────────────────────────────────────────────────────────

const AW = 790;
const AH = 1054;
const TEMPLATE_BASE = join(process.cwd(), 'src/magazine/templates/base');
const PRIMITIVES_PATH = join(process.cwd(), 'src/magazine/core/primitives.jsx');

// Maps template name → JSX file (null = not yet implemented, renders placeholder)
const TEMPLATE_FILE_MAP: Record<string, string | null> = {
  CoverA:                'templates-1-4.jsx',
  BlankPage:             null,
  SinglePhoto:           'templates-1-4.jsx',
  TextSubmission:        'templates-5-8.jsx',
  CommunicationsPage:    'templates-9-11.jsx',
  Spread:                'templates-9-11.jsx',
  CampaignPage:          'templates-9-11.jsx',
  Spread2:               'templates-12-17.jsx',
  Spread4:               'templates-12-17.jsx',
  Spread6:               'templates-12-17.jsx',
  TextSpread:            'templates-12-17.jsx',
  MusicPage:             'templates-12-17.jsx',
  ColophonPage:          'templates-12-17.jsx',
  SpreadPanorama:        'templates-18-19.jsx',
  SpreadMosaic:          'templates-18-19.jsx',
  FrontMatter:           'templates-20-24.jsx',
  PoetryPage:            'templates-20-24.jsx',
  CollabSpreadCommunity: 'templates-20-24.jsx',
  CollabSpreadLocal:     'templates-20-24.jsx',
  CollabSpreadPrivate:   'templates-20-24.jsx',
};

// Templates that render as double-width spreads (1580 × 1054 CSS pixels)
const SPREAD_TEMPLATES = new Set([
  'Spread', 'SpreadPanorama', 'Spread2', 'Spread4', 'SpreadMosaic', 'Spread6',
  'TextSpread', 'CollabSpreadCommunity', 'CollabSpreadLocal', 'CollabSpreadPrivate',
]);

// Content type ordering for page sequencing
const CONTENT_TYPE_ORDER: Record<string, number> = {
  photography: 0, art: 1, essay: 2, poetry: 3, music: 4,
};

// ─── Supabase Client ──────────────────────────────────────────────────────────

function makeClient(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) {
    throw new Error(
      'Missing required env vars: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY'
    );
  }
  return createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
}

// ─── HTML Page Builder ────────────────────────────────────────────────────────

function buildPageHtml(templateName: string, data: unknown): string {
  const primitivesCode = readFileSync(PRIMITIVES_PATH, 'utf-8');
  const templateFile = TEMPLATE_FILE_MAP[templateName];

  const templateCode = templateFile
    ? readFileSync(join(TEMPLATE_BASE, templateFile), 'utf-8')
    : templateName === 'BlankPage'
    ? `function BlankPage({ data={} }) {
        return (
          <div style={{
            width: 790, height: 1054,
            background: '#252119',
          }}/>
        );
      }`
    : `function ${templateName}({ data={} }) {
        const label = String(data.templateName || '${templateName}');
        return (
          <div style={{
            width: 790, height: 1054, background: '#252119',
            display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center',
            fontFamily: "'Courier Prime', monospace", color: '#f0ebe2', gap: 16,
          }}>
            <div style={{ fontSize: 18, letterSpacing: '0.1em', color: '#e8a020' }}>
              {label}
            </div>
            <div style={{ fontSize: 10, color: 'rgba(240,235,226,0.4)', letterSpacing: '0.08em' }}>
              Template not yet implemented
            </div>
          </div>
        );
      }`;

  const isSpread = SPREAD_TEMPLATES.has(templateName);
  const pageW = isSpread ? AW * 2 : AW;
  const serialized = JSON.stringify({ templateName, data });

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <link href="https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&family=Instrument+Sans:wght@300;400;500&family=Courier+Prime&display=swap" rel="stylesheet">
  <script src="https://unpkg.com/react@18/umd/react.production.min.js"></script>
  <script src="https://unpkg.com/react-dom@18/umd/react-dom.production.min.js"></script>
  <script src="https://unpkg.com/@babel/standalone/babel.min.js"></script>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { background: #252119; width: ${pageW}px; height: ${AH}px; overflow: hidden; }
  </style>
</head>
<body>
  <div id="root"></div>
  <script>window.__magazine_page__ = ${serialized};</script>
  <script type="text/babel">
    ${primitivesCode}
    ${templateCode}
    const { templateName: _name, data: _data } = window.__magazine_page__;
    const _Component = window[_name];
    if (!_Component) throw new Error('Template not found on window: ' + _name);
    ReactDOM.createRoot(document.getElementById('root')).render(
      React.createElement(_Component, { data: _data })
    );
  </script>
</body>
</html>`;
}

// ─── Page Renderer ────────────────────────────────────────────────────────────

type PuppeteerBrowser = Awaited<ReturnType<typeof puppeteer.launch>>;

async function renderPageToBuffers(
  templateName: string,
  data: unknown,
  pageCount: number,
  browser: PuppeteerBrowser
): Promise<Buffer[]> {
  const isSpread = pageCount === 2 && SPREAD_TEMPLATES.has(templateName);
  const viewportW = isSpread ? AW * 2 : AW;

  const page = await browser.newPage();
  try {
    await page.setViewport({ width: viewportW, height: AH, deviceScaleFactor: 4 });
    const html = buildPageHtml(templateName, data);
    await page.setContent(html, { waitUntil: 'networkidle0', timeout: 30_000 });
    await page.evaluateHandle('document.fonts.ready');

    if (isSpread) {
      const leftBuf = await page.screenshot({
        type: 'png',
        clip: { x: 0, y: 0, width: AW, height: AH },
      });
      const rightBuf = await page.screenshot({
        type: 'png',
        clip: { x: AW, y: 0, width: AW, height: AH },
      });
      return [Buffer.from(leftBuf), Buffer.from(rightBuf)];
    }

    const buf = await page.screenshot({ type: 'png' });
    return [Buffer.from(buf)];
  } finally {
    await page.close();
  }
}

// ─── Supabase Data Fetchers ───────────────────────────────────────────────────

interface RawProfile {
  first_name?: string | null;
  last_name?: string | null;
  city?: string | null;
  content_type?: string | null;
}

function profileName(p: RawProfile): string {
  return `${p.first_name ?? ''} ${p.last_name ?? ''}`.trim() || 'Unknown';
}

async function fetchPeriod(db: SupabaseClient, periodId: string) {
  const { data, error } = await db
    .from('periods')
    .select('id, name, season, year, volume, issue')
    .eq('id', periodId)
    .single();
  if (error || !data) throw new Error(`Period not found: ${periodId}`);
  return data as { id: string; name: string; season: string; year: number; volume: string | null; issue: number | null };
}

async function fetchCuratorProfile(db: SupabaseClient, curatorId: string) {
  const { data, error } = await db
    .from('profiles')
    .select('first_name, last_name, city')
    .eq('id', curatorId)
    .single();
  if (error || !data) throw new Error(`Curator profile not found: ${curatorId}`);
  const p = data as RawProfile;
  return { name: profileName(p), city: p.city ?? '' };
}

async function fetchCreatorItems(
  db: SupabaseClient,
  curatorId: string,
  periodId: string,
  season: string
): Promise<SelectionItemCreator[]> {
  const { data: selections } = await db
    .from('curator_creator_selections')
    .select('creator_id')
    .eq('curator_id', curatorId)
    .eq('period_id', periodId);

  const creatorIds = (selections ?? []).map((s: { creator_id: string }) => s.creator_id);
  if (creatorIds.length === 0) return [];

  const { data: contentRows } = await db
    .from('content')
    .select(`
      id, creator_id, type, page_title,
      profiles:creator_id ( first_name, last_name, city, content_type ),
      content_entries ( id, title, caption, media_url, focal_x, focal_y, aspect_ratio, order_index )
    `)
    .in('creator_id', creatorIds)
    .eq('period_id', periodId)
    .neq('status', 'draft');

  const items: SelectionItemCreator[] = [];
  for (const row of (contentRows ?? []) as Array<Record<string, unknown>>) {
    const profileRaw = Array.isArray(row.profiles)
      ? (row.profiles[0] as RawProfile | undefined)
      : (row.profiles as RawProfile | undefined);
    if (!profileRaw) continue;

    const contentType = (profileRaw.content_type ?? 'photography') as ContentType;
    const rawEntries = Array.isArray(row.content_entries) ? row.content_entries : [];
    const entries: ContentEntryData[] = (rawEntries as Array<Record<string, unknown>>)
      .sort((a, b) => ((a.order_index as number) ?? 0) - ((b.order_index as number) ?? 0))
      .map(e => ({
        title:        (e.title as string | undefined) ?? undefined,
        caption:      (e.caption as string | undefined) ?? undefined,
        media_url:    (e.media_url as string | undefined) ?? undefined,
        focal_x:      (e.focal_x as number | undefined) ?? 50,
        focal_y:      (e.focal_y as number | undefined) ?? 50,
        aspect_ratio: (e.aspect_ratio as number | null | undefined) ?? null,
      }));

    items.push({
      kind: 'creator',
      creatorId: row.creator_id as string,
      contentType,
      submissionType: (row.type as 'regular' | 'fullSpread') ?? 'regular',
      entries,
      pageTitle: (row.page_title as string | undefined) ?? '',
      contributor: { name: profileName(profileRaw), city: profileRaw.city ?? '' },
      season,
    });
  }

  // Sort: photography → art → essay → poetry → music
  return items.sort(
    (a, b) =>
      (CONTENT_TYPE_ORDER[a.contentType] ?? 99) - (CONTENT_TYPE_ORDER[b.contentType] ?? 99)
  );
}

async function fetchCollabItems(
  db: SupabaseClient,
  curatorId: string,
  periodId: string,
  season: string
): Promise<SelectionItemCollab[]> {
  const { data: selections } = await db
    .from('curator_collab_selections')
    .select('collab_id, participation_mode, location')
    .eq('curator_id', curatorId)
    .eq('period_id', periodId);

  if (!selections || selections.length === 0) return [];

  const items: SelectionItemCollab[] = [];

  for (const sel of selections as Array<{
    collab_id: string;
    participation_mode: string;
    location: string | null;
  }>) {
    const { data: collab } = await db
      .from('collabs')
      .select('id, title, participation_mode, location, template_id, description')
      .eq('id', sel.collab_id)
      .maybeSingle();
    if (!collab) continue;

    // Fetch display_text from collab_template if available
    let displayText = (collab as Record<string, unknown>).description as string ?? '';
    const templateId = (collab as Record<string, unknown>).template_id as string | null;
    if (templateId) {
      const { data: tmpl } = await db
        .from('collab_templates')
        .select('display_text')
        .eq('id', templateId)
        .maybeSingle();
      if (tmpl) displayText = (tmpl as Record<string, unknown>).display_text as string ?? displayText;
    }

    // Fetch submissions for this collab
    const { data: submissions } = await db
      .from('collab_submissions')
      .select(`
        id, title, caption, media_url, contributor_id,
        profiles:contributor_id ( first_name, last_name, city )
      `)
      .eq('collab_id', sel.collab_id);

    const entries: CollabEntryData[] = ((submissions ?? []) as Array<Record<string, unknown>>).map(sub => {
      const pRaw = Array.isArray(sub.profiles)
        ? (sub.profiles[0] as RawProfile | undefined)
        : (sub.profiles as RawProfile | undefined);
      return {
        title:     (sub.title as string | undefined) ?? undefined,
        caption:   (sub.caption as string | undefined) ?? undefined,
        media_url: (sub.media_url as string | undefined) ?? undefined,
        contributor: pRaw
          ? { name: profileName(pRaw), city: pRaw.city ?? '' }
          : { name: 'Contributor', city: '' },
      };
    });

    const collabRecord = collab as Record<string, unknown>;
    items.push({
      kind: 'collab',
      collabId: sel.collab_id,
      collabTitle: (collabRecord.title as string | undefined) ?? '',
      participationMode: (sel.participation_mode ?? 'community') as ParticipationMode,
      location: sel.location ?? undefined,
      city: sel.location ?? '',
      displayText,
      entries,
      season,
    });
  }

  return items;
}

async function fetchCommunicationsItem(
  db: SupabaseClient,
  curatorId: string,
  periodId: string,
  season: string
): Promise<SelectionItemCommunications | null> {
  const { data: commSel } = await db
    .from('curator_communication_selections')
    .select('include_communications')
    .eq('curator_id', curatorId)
    .eq('period_id', periodId)
    .maybeSingle();

  if (!(commSel as Record<string, unknown> | null)?.include_communications) return null;

  const { data: comms } = await db
    .from('communications')
    .select(`
      id, subject, content, status, created_at,
      sender:sender_id ( first_name, last_name, city ),
      recipient:recipient_id ( first_name, last_name )
    `)
    .eq('recipient_id', curatorId)
    .eq('period_id', periodId)
    .eq('status', 'submitted')
    .order('created_at', { ascending: false })
    .limit(4);

  const messages: CommunicationMessage[] = ((comms ?? []) as Array<Record<string, unknown>>).map(c => {
    const senderRaw = Array.isArray(c.sender)
      ? (c.sender[0] as RawProfile | undefined)
      : (c.sender as RawProfile | undefined);
    const recipientRaw = Array.isArray(c.recipient)
      ? (c.recipient[0] as RawProfile | undefined)
      : (c.recipient as RawProfile | undefined);

    const createdAt = c.created_at as string | undefined;
    const date = createdAt
      ? new Date(createdAt).toLocaleDateString('en-US', { day: '2-digit', month: 'short', year: 'numeric' })
      : '';

    return {
      from: senderRaw
        ? { name: profileName(senderRaw), city: senderRaw.city ?? '' }
        : { name: 'Contributor', city: '' },
      to: recipientRaw
        ? { name: profileName(recipientRaw) }
        : { name: 'Curator' },
      date,
      subject: (c.subject as string | undefined) ?? undefined,
      body:    (c.content as string | undefined) ?? '',
    };
  });

  if (messages.length === 0) return null;
  return { kind: 'communications', messages, season };
}

async function fetchCampaignItems(
  db: SupabaseClient,
  curatorId: string,
  periodId: string
): Promise<SelectionItemCampaign[]> {
  const { data: selections } = await db
    .from('curator_campaign_selections')
    .select('campaign_id')
    .eq('curator_id', curatorId)
    .eq('period_id', periodId);

  const campaignIds = (selections ?? []).map((s: { campaign_id: string }) => s.campaign_id);
  if (campaignIds.length === 0) return [];

  const { data: campaigns } = await db
    .from('campaigns')
    .select('id, name, bio, discount, avatar_url')
    .in('id', campaignIds);

  return ((campaigns ?? []) as Array<Record<string, unknown>>).map(c => ({
    kind: 'campaign' as const,
    campaignId:   c.id as string,
    campaignName: (c.name as string | undefined) ?? '',
    tagline:      (c.bio as string | undefined) ?? '',
    discount:     typeof c.discount === 'number' ? c.discount : 2,
    avatar_url:   (c.avatar_url as string | undefined) ?? undefined,
  }));
}

// ─── Content Ordering (interspersing + even-page spread alignment) ─────────────
// Reorders content items ONLY — it never changes which template an item gets.
// Goals, in strict priority: (1) every two-page spread starts on an even page so
// it reads across the fold; (2) spreads are separated by single-page "mortar"
// where possible; (3) content types are dispersed rather than clumped.

type OrderableItem = { item: SelectionItem; pageCount: number; typeKey: string };

// The dispersion type for an item (used to space same-type items apart).
function dispersalTypeKey(item: SelectionItem): string {
  switch (item.kind) {
    case 'creator':        return item.contentType;   // photography|art|essay|poetry|music
    case 'collab':         return 'collab';
    case 'communications': return 'communication';
    case 'campaign':       return 'campaign';
  }
}

// Deterministic round-robin interleave by type so same-type items are spaced
// apart. Largest type groups are drawn first each round so they don't bunch up
// at the end. This is an even/varied distribution — not randomness.
function interleaveByType(items: OrderableItem[]): OrderableItem[] {
  const buckets = new Map<string, OrderableItem[]>();
  for (const it of items) {
    const arr = buckets.get(it.typeKey);
    if (arr) arr.push(it);
    else buckets.set(it.typeKey, [it]);
  }
  const keys = [...buckets.keys()].sort((a, b) => buckets.get(b)!.length - buckets.get(a)!.length);
  const out: OrderableItem[] = [];
  let remaining = items.length;
  while (remaining > 0) {
    for (const k of keys) {
      const arr = buckets.get(k)!;
      if (arr.length) { out.push(arr.shift()!); remaining--; }
    }
  }
  return out;
}

// Order content items for a varied, spread-aligned flow. Content starts on the
// even page 4, so alignment depends only on how many single pages precede each
// spread — an EVEN number keeps the spread even-aligned. Singles are therefore
// placed as even-sized pairs of "mortar": a pair both separates two spreads AND
// preserves alignment (a lone single would flip parity and misalign the next
// spread). Returns a pure reordering — no blank fillers (those are a last-resort
// safety net applied during page numbering).
function orderContentForFlow(items: SelectionItem[]): SelectionItem[] {
  const orderable: OrderableItem[] = items.map(item => ({
    item,
    pageCount: selectTemplate(item, 0).pageCount,
    typeKey: dispersalTypeKey(item),
  }));

  const spreads = interleaveByType(orderable.filter(o => o.pageCount === 2));
  const singles = interleaveByType(orderable.filter(o => o.pageCount !== 2));
  const S = spreads.length;

  // No spreads → nothing to align; emit singles in dispersed order.
  if (S === 0) return singles.map(o => o.item);

  // Distribute single pages as even-sized pairs into the gaps before each spread
  // (gap g precedes spreads[g]) plus a tail gap after the last spread. Gaps
  // before spreads must hold an even count to preserve alignment; the tail may
  // hold the single leftover. Pairs are spaced EVENLY through the sequence (not
  // front- or back-loaded) so separation and type variety are distributed rather
  // than clumped.
  const pairs = Math.floor(singles.length / 2);
  const gapPairs = new Array<number>(S).fill(0);   // pairs placed before spreads[g]
  let tailPairs = 0;
  const interSlots = S - 1;                         // gaps between consecutive spreads
  if (interSlots === 0) {
    // Single spread: split the mortar before/after so singles don't clump on one side.
    gapPairs[0] = Math.floor(pairs / 2);
    tailPairs   = pairs - gapPairs[0];
  } else {
    // Every inter-spread gap gets an equal base of pairs (separating all spreads
    // when supply allows); the remaining pairs land on evenly-spaced gaps, which
    // divides the spreads into roughly equal runs.
    const base = Math.floor(pairs / interSlots);
    for (let g = 1; g < S; g++) gapPairs[g] = base;
    const rem = pairs - base * interSlots;          // 0..interSlots-1 leftover pairs
    for (let i = 1; i <= rem; i++) {
      let g = Math.round((i * S) / (rem + 1));
      if (g < 1) g = 1;
      if (g > S - 1) g = S - 1;
      gapPairs[g] += 1;
    }
  }

  const ordered: SelectionItem[] = [];
  let si = 0;
  for (let g = 0; g < S; g++) {
    for (let p = 0; p < gapPairs[g]; p++) {
      ordered.push(singles[si++].item);
      ordered.push(singles[si++].item);
    }
    ordered.push(spreads[g].item);
  }
  for (let p = 0; p < tailPairs; p++) {
    ordered.push(singles[si++].item);
    ordered.push(singles[si++].item);
  }
  while (si < singles.length) ordered.push(singles[si++].item);  // leftover odd single
  return ordered;
}

// ─── Main Generator ───────────────────────────────────────────────────────────

export async function generateMagazine(curatorId: string, periodId: string): Promise<string> {
  const db = makeClient();

  console.log('[generator] Fetching period and curator...');
  const [period, curator] = await Promise.all([
    fetchPeriod(db, periodId),
    fetchCuratorProfile(db, curatorId),
  ]);
  const season = period.season;

  console.log('[generator] Fetching selections...');
  const [creatorItems, collabItems, commsItem, campaignItems] = await Promise.all([
    fetchCreatorItems(db, curatorId, periodId, season),
    fetchCollabItems(db, curatorId, periodId, season),
    fetchCommunicationsItem(db, curatorId, periodId, season),
    fetchCampaignItems(db, curatorId, periodId),
  ]);

  // ── Assemble selection list, then order for varied, spread-aligned flow ─────
  const selectionItems: SelectionItem[] = [
    ...creatorItems,
    ...collabItems,
    ...(commsItem ? [commsItem] : []),
    ...campaignItems,
  ];
  const orderedItems = orderContentForFlow(selectionItems);

  // ── Assign page numbers ────────────────────────────────────────────────────
  // Page 1 = Cover, Page 2 = Blank, Page 3 = FrontMatter, then content, last =
  // Colophon. Content starts on page 4 (even). Every two-page spread must start
  // on an even page; orderContentForFlow guarantees this by construction. The
  // odd-page check below is a last-resort safety net (rule 4): if a spread would
  // still land on an odd page with no single left to bump it, insert a blank
  // filler page. With the ordering above it should never trigger (it warns if
  // it does). contentAssignments holds real content only (no blanks) so the
  // FrontMatter TOC — built later from it — reflects the final page numbers.
  type MiddlePage = { templateName: string; data: unknown; pageCount: number };
  let cursor = 4; // content starts at page 4 (cover=1, blank=2, frontmatter=3)
  const contentAssignments: TemplateAssignment[] = [];
  const middlePages: MiddlePage[] = [];
  for (const item of orderedItems) {
    if (selectTemplate(item, 0).pageCount === 2 && cursor % 2 === 1) {
      console.warn(`[generator] alignment fallback: blank filler inserted before spread at page ${cursor}`);
      middlePages.push({ templateName: 'BlankPage', data: { season }, pageCount: 1 });
      cursor += 1;
    }
    const assignment = selectTemplate(item, cursor);
    contentAssignments.push(assignment);
    middlePages.push({ templateName: assignment.templateName, data: assignment.data, pageCount: assignment.pageCount });
    cursor += assignment.pageCount;
  }

  const colophonPage = cursor;

  // ── Build Cover ────────────────────────────────────────────────────────────
  const coverData: CoverData = { page: 1, season, volume: period.volume ?? 'I', issue: period.issue ?? 1 };

  // ── Build FrontMatter TOC (now that all page numbers are known) ────────────
  function normalizeContentType(raw: string): string {
    const map: Record<string, string> = {
      photography: 'Photography',
      art: 'Art',
      essay: 'Essay',
      writing: 'Essay',
      poetry: 'Poetry',
      music: 'Music',
    };
    return map[raw?.toLowerCase()] ?? raw;
  }

  const toc: TocEntry[] = contentAssignments
    .filter(a => a.data && 'contributor' in a.data && 'page_title' in a.data)
    .map(a => {
      const d = a.data as { contributor: { name: string }; page_title: string; type: string; page: number };
      return { page: d.page, contributor: d.contributor.name, type: normalizeContentType(d.type), title: d.page_title };
    });

  const frontMatterData: FrontMatterData = {
    page: 3, curator, season, toc,
  };

  // ── Build Colophon ─────────────────────────────────────────────────────────
  const contributors = creatorItems.map(i => i.contributor);
  const colophonData: ColophonData = {
    page: colophonPage, season,
    contributors,
    printer: 'Magcloud',
    edition_number: 1,
    edition_total: 1,
  };

  // ── Full page sequence ─────────────────────────────────────────────────────
  type PageSpec = { templateName: string; data: unknown; pageCount: number };
  const pageSequence: PageSpec[] = [
    { templateName: 'CoverA',      data: coverData,       pageCount: 1 },
    { templateName: 'BlankPage',   data: { season },      pageCount: 1 },
    { templateName: 'FrontMatter', data: frontMatterData, pageCount: 1 },
    ...middlePages,
    { templateName: 'ColophonPage', data: colophonData, pageCount: 1 },
  ];

  console.log(`[generator] Page sequence: ${pageSequence.length} template slots, ${colophonPage} total pages`);

  // ── Launch Puppeteer ───────────────────────────────────────────────────────
  console.log('[generator] Launching Puppeteer...');
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  const pdfDoc = await PDFDocument.create();

  try {
    for (let i = 0; i < pageSequence.length; i++) {
      const spec = pageSequence[i];
      console.log(`[generator] Rendering [${i + 1}/${pageSequence.length}]: ${spec.templateName}`);

      const buffers = await renderPageToBuffers(
        spec.templateName, spec.data, spec.pageCount, browser
      );

      for (const buf of buffers) {
        const pngImage = await pdfDoc.embedPng(buf);
        const pdfPage = pdfDoc.addPage([pngImage.width / 4, pngImage.height / 4]);
        pdfPage.drawImage(pngImage, {
          x: 0, y: 0,
          width: pdfPage.getWidth(), height: pdfPage.getHeight(),
        });
      }
    }
  } finally {
    await browser.close();
  }

  // ── Save PDF ───────────────────────────────────────────────────────────────
  const pdfBytes = await pdfDoc.save();
  const outputPath = `/tmp/magazine-${curatorId}-${periodId}.pdf`;
  writeFileSync(outputPath, pdfBytes);

  console.log(`[generator] PDF saved: ${outputPath}`);
  return outputPath;
}

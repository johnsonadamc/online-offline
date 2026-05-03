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
  SinglePhoto:           'templates-1-4.jsx',
  TextSubmission:        'templates-5-8.jsx',
  CommunicationsPage:    'templates-9-11.jsx',
  Spread:                'templates-9-11.jsx',
  CampaignPage:          'templates-9-11.jsx',
  // templates-12-17.jsx not yet created:
  Spread2:               null,
  Spread4:               null,
  Spread6:               null,
  TextSpread:            null,
  MusicPage:             null,
  ColophonPage:          null,
  // templates-18-19.jsx not yet created:
  SpreadPanorama:        null,
  SpreadMosaic:          null,
  // templates-20-24.jsx not yet created:
  FrontMatter:           null,
  PoetryPage:            null,
  CollabSpreadCommunity: null,
  CollabSpreadLocal:     null,
  CollabSpreadPrivate:   null,
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
    .select('id, name, season, year')
    .eq('id', periodId)
    .single();
  if (error || !data) throw new Error(`Period not found: ${periodId}`);
  return data as { id: string; name: string; season: string; year: number };
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
      .single();
    if (!collab) continue;

    // Fetch display_text from collab_template if available
    let displayText = (collab as Record<string, unknown>).description as string ?? '';
    const templateId = (collab as Record<string, unknown>).template_id as string | null;
    if (templateId) {
      const { data: tmpl } = await db
        .from('collab_templates')
        .select('display_text')
        .eq('id', templateId)
        .single();
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
    .single();

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
    .select('id, name, bio, discount')
    .in('id', campaignIds);

  return ((campaigns ?? []) as Array<Record<string, unknown>>).map(c => ({
    kind: 'campaign' as const,
    campaignId:   c.id as string,
    campaignName: (c.name as string | undefined) ?? '',
    tagline:      (c.bio as string | undefined) ?? '',
    discount:     typeof c.discount === 'number' ? c.discount : 2,
  }));
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

  // ── Assemble selection list in page order ──────────────────────────────────
  const selectionItems: SelectionItem[] = [
    ...creatorItems,
    ...collabItems,
    ...(commsItem ? [commsItem] : []),
    ...campaignItems,
  ];

  // ── Assign page numbers ────────────────────────────────────────────────────
  // Page 1 = Cover, Page 2 = FrontMatter (placeholder), then content, last = Colophon
  let cursor = 3; // content starts at page 3
  const contentAssignments: TemplateAssignment[] = selectionItems.map(item => {
    const assignment = selectTemplate(item, cursor);
    cursor += assignment.pageCount;
    return assignment;
  });

  const colophonPage = cursor;

  // ── Build Cover ────────────────────────────────────────────────────────────
  const coverData: CoverData = { page: 1, season };

  // ── Build FrontMatter TOC (now that all page numbers are known) ────────────
  const toc: TocEntry[] = contentAssignments
    .filter(a => a.data && 'contributor' in a.data && 'page_title' in a.data)
    .map(a => {
      const d = a.data as { contributor: { name: string }; page_title: string; type: string; page: number };
      return { page: d.page, contributor: d.contributor.name, type: d.type, title: d.page_title };
    });

  const frontMatterData: FrontMatterData = {
    page: 2, curator, season, toc,
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
    { templateName: 'FrontMatter', data: frontMatterData, pageCount: 1 },
    ...contentAssignments.map(a => ({
      templateName: a.templateName, data: a.data, pageCount: a.pageCount,
    })),
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

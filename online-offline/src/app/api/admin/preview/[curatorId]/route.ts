// src/app/api/admin/preview/[curatorId]/route.ts
// Returns an ordered array of page HTML strings for the admin magazine preview.
// Uses service role key to bypass RLS when reading curator data.

import { createServerClient } from '@supabase/ssr'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'
import { readFileSync } from 'fs'
import { join } from 'path'

import { selectTemplate } from '@/magazine/core/selectionLogic'
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
  ContentType,
  ParticipationMode,
  CommunicationMessage,
  CollabEntryData,
  ContentEntryData,
} from '@/magazine/core/types'

// ── HTML Builder ────────────────────────────────

const AW = 790
const AH = 1054
const TEMPLATE_BASE = join(process.cwd(), 'src/magazine/templates/base')
const PRIMITIVES_PATH = join(process.cwd(), 'src/magazine/core/primitives.jsx')

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
}

const SPREAD_TEMPLATES = new Set([
  'Spread', 'SpreadPanorama', 'Spread2', 'Spread4', 'SpreadMosaic', 'Spread6',
  'TextSpread', 'CollabSpreadCommunity', 'CollabSpreadLocal', 'CollabSpreadPrivate',
])

const CONTENT_TYPE_ORDER: Record<string, number> = {
  photography: 0, art: 1, essay: 2, poetry: 3, music: 4,
}

// Cache template file reads within a request
const fileCache: Record<string, string> = {}

function readCached(path: string): string {
  if (!fileCache[path]) fileCache[path] = readFileSync(path, 'utf-8')
  return fileCache[path]
}

function buildPageHtml(templateName: string, data: unknown): string {
  const primitivesCode = readCached(PRIMITIVES_PATH)
  const templateFile = TEMPLATE_FILE_MAP[templateName]

  let templateCode: string
  if (templateFile) {
    templateCode = readCached(join(TEMPLATE_BASE, templateFile))
  } else if (templateName === 'BlankPage') {
    templateCode = `function BlankPage({ data={} }) {
      return (
        <div style={{ width: 790, height: 1054, background: '#252119' }}/>
      );
    }`
  } else {
    templateCode = `function ${templateName}({ data={} }) {
      return (
        <div style={{
          width: 790, height: 1054, background: '#252119',
          display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center',
          fontFamily: "'Courier Prime', monospace", color: '#f0ebe2', gap: 16,
        }}>
          <div style={{ fontSize: 18, letterSpacing: '0.1em', color: '#e8a020' }}>
            ${templateName}
          </div>
          <div style={{ fontSize: 10, color: 'rgba(240,235,226,0.4)', letterSpacing: '0.08em' }}>
            Template not yet implemented
          </div>
        </div>
      );
    }`
  }

  const isSpread = SPREAD_TEMPLATES.has(templateName)
  const pageW = isSpread ? AW * 2 : AW
  const serialized = JSON.stringify({ templateName, data })

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
</html>`
}

// ── Supabase Data Fetchers (mirrors generator.ts) ────────────────────────────

interface RawProfile {
  first_name?: string | null
  last_name?: string | null
  city?: string | null
  content_type?: string | null
}

function profileName(p: RawProfile): string {
  return `${p.first_name ?? ''} ${p.last_name ?? ''}`.trim() || 'Unknown'
}

async function fetchActivePeriod(db: SupabaseClient) {
  const { data, error } = await db
    .from('periods')
    .select('id, name, season, year, volume, issue')
    .eq('is_active', true)
    .maybeSingle()
  if (error || !data) {
    console.error('[fetchActivePeriod] Supabase error:', error, '| data:', data)
    throw new Error('No active period found')
  }
  return data as { id: string; name: string; season: string; year: number; volume: string | null; issue: number | null }
}

async function fetchCuratorProfile(db: SupabaseClient, curatorId: string) {
  const { data } = await db
    .from('profiles')
    .select('first_name, last_name, city')
    .eq('id', curatorId)
    .maybeSingle()
  const p = (data ?? {}) as RawProfile
  return { name: profileName(p), city: p.city ?? '' }
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
    .eq('period_id', periodId)

  const creatorIds = (selections ?? []).map((s: { creator_id: string }) => s.creator_id)
  if (creatorIds.length === 0) return []

  const { data: contentRows } = await db
    .from('content')
    .select(`
      id, creator_id, type, page_title,
      profiles:creator_id ( first_name, last_name, city, content_type ),
      content_entries ( id, title, caption, media_url, focal_x, focal_y, aspect_ratio, order_index )
    `)
    .in('creator_id', creatorIds)
    .eq('period_id', periodId)
    .neq('status', 'draft')

  const items: SelectionItemCreator[] = []
  for (const row of (contentRows ?? []) as Array<Record<string, unknown>>) {
    const profileRaw = Array.isArray(row.profiles)
      ? (row.profiles[0] as RawProfile | undefined)
      : (row.profiles as RawProfile | undefined)
    if (!profileRaw) continue

    const contentType = (profileRaw.content_type ?? 'photography') as ContentType
    const rawEntries = Array.isArray(row.content_entries) ? row.content_entries : []
    const entries: ContentEntryData[] = (rawEntries as Array<Record<string, unknown>>)
      .sort((a, b) => ((a.order_index as number) ?? 0) - ((b.order_index as number) ?? 0))
      .map(e => ({
        title:        (e.title as string | undefined) ?? undefined,
        caption:      (e.caption as string | undefined) ?? undefined,
        media_url:    (e.media_url as string | undefined) ?? undefined,
        focal_x:      (e.focal_x as number | undefined) ?? 50,
        focal_y:      (e.focal_y as number | undefined) ?? 50,
        aspect_ratio: (e.aspect_ratio as number | null | undefined) ?? null,
      }))

    items.push({
      kind: 'creator',
      creatorId: row.creator_id as string,
      contentType,
      submissionType: (row.type as 'regular' | 'fullSpread') ?? 'regular',
      entries,
      pageTitle: (row.page_title as string | undefined) ?? '',
      contributor: { name: profileName(profileRaw), city: profileRaw.city ?? '' },
      season,
    })
  }

  return items.sort(
    (a, b) =>
      (CONTENT_TYPE_ORDER[a.contentType] ?? 99) - (CONTENT_TYPE_ORDER[b.contentType] ?? 99)
  )
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
    .eq('period_id', periodId)

  if (!selections || selections.length === 0) return []

  const items: SelectionItemCollab[] = []

  for (const sel of selections as Array<{
    collab_id: string
    participation_mode: string
    location: string | null
  }>) {
    const { data: collab } = await db
      .from('collabs')
      .select('id, title, participation_mode, location, template_id, description')
      .eq('id', sel.collab_id)
      .maybeSingle()
    if (!collab) continue

    let displayText = (collab as Record<string, unknown>).description as string ?? ''
    const templateId = (collab as Record<string, unknown>).template_id as string | null
    if (templateId) {
      const { data: tmpl } = await db
        .from('collab_templates')
        .select('display_text')
        .eq('id', templateId)
        .maybeSingle()
      if (tmpl) displayText = (tmpl as Record<string, unknown>).display_text as string ?? displayText
    }

    const { data: submissions } = await db
      .from('collab_submissions')
      .select(`
        id, title, caption, media_url, contributor_id,
        profiles:contributor_id ( first_name, last_name, city )
      `)
      .eq('collab_id', sel.collab_id)

    const entries: CollabEntryData[] = ((submissions ?? []) as Array<Record<string, unknown>>).map(sub => {
      const pRaw = Array.isArray(sub.profiles)
        ? (sub.profiles[0] as RawProfile | undefined)
        : (sub.profiles as RawProfile | undefined)
      return {
        title:     (sub.title as string | undefined) ?? undefined,
        caption:   (sub.caption as string | undefined) ?? undefined,
        media_url: (sub.media_url as string | undefined) ?? undefined,
        contributor: pRaw
          ? { name: profileName(pRaw), city: pRaw.city ?? '' }
          : { name: 'Contributor', city: '' },
      }
    })

    const collabRecord = collab as Record<string, unknown>
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
    })
  }

  return items
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
    .maybeSingle()

  if (!(commSel as Record<string, unknown> | null)?.include_communications) return null

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
    .limit(4)

  const messages: CommunicationMessage[] = ((comms ?? []) as Array<Record<string, unknown>>).map(c => {
    const senderRaw = Array.isArray(c.sender)
      ? (c.sender[0] as RawProfile | undefined)
      : (c.sender as RawProfile | undefined)
    const recipientRaw = Array.isArray(c.recipient)
      ? (c.recipient[0] as RawProfile | undefined)
      : (c.recipient as RawProfile | undefined)

    const createdAt = c.created_at as string | undefined
    const date = createdAt
      ? new Date(createdAt).toLocaleDateString('en-US', { day: '2-digit', month: 'short', year: 'numeric' })
      : ''

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
    }
  })

  if (messages.length === 0) return null
  return { kind: 'communications', messages, season }
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
    .eq('period_id', periodId)

  const campaignIds = (selections ?? []).map((s: { campaign_id: string }) => s.campaign_id)
  if (campaignIds.length === 0) return []

  const { data: campaigns } = await db
    .from('campaigns')
    .select('id, name, bio, discount, avatar_url')
    .in('id', campaignIds)

  return ((campaigns ?? []) as Array<Record<string, unknown>>).map(c => ({
    kind: 'campaign' as const,
    campaignId:   c.id as string,
    campaignName: (c.name as string | undefined) ?? '',
    tagline:      (c.bio as string | undefined) ?? '',
    discount:     typeof c.discount === 'number' ? c.discount : 2,
    avatar_url:   (c.avatar_url as string | undefined) ?? undefined,
  }))
}

function normalizeContentType(raw: string): string {
  const map: Record<string, string> = {
    photography: 'Photography', art: 'Art',
    essay: 'Essay', writing: 'Essay', poetry: 'Poetry', music: 'Music',
  }
  return map[raw?.toLowerCase()] ?? raw
}

// ── Route Handler ────────────────────────────────

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ curatorId: string }> }
) {
  const { curatorId } = await params

  // Service role client — used for ALL data fetching in this route (bypasses RLS)
  const db = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )

  // Verify requester is admin using their session (separate auth client)
  const cookieStore = await cookies()
  const authClient = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll() },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          )
        },
      },
    }
  )

  const { data: { user } } = await authClient.auth.getUser()
  if (!user) {
    console.error('[admin/preview] no authenticated user')
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data: adminRow, error: adminErr } = await authClient
    .from('profile_types')
    .select('type')
    .eq('profile_id', user.id)
    .eq('type', 'admin')
    .maybeSingle()

  if (!adminRow) {
    console.error('[admin/preview] admin check failed for user:', user.id, 'error:', adminErr)
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  try {
    const period = await fetchActivePeriod(db)
    const season = period.season

    const [curator, creatorItems, collabItems, commsItem, campaignItems] = await Promise.all([
      fetchCuratorProfile(db, curatorId),
      fetchCreatorItems(db, curatorId, period.id, season),
      fetchCollabItems(db, curatorId, period.id, season),
      fetchCommunicationsItem(db, curatorId, period.id, season),
      fetchCampaignItems(db, curatorId, period.id),
    ])

    // Assemble selection list
    const selectionItems: SelectionItem[] = [
      ...creatorItems,
      ...collabItems,
      ...(commsItem ? [commsItem] : []),
      ...campaignItems,
    ]

    // Assign page numbers (cover=1, blank=2, frontmatter=3, content starts at 4)
    let cursor = 4
    const contentAssignments = selectionItems.map(item => {
      const assignment = selectTemplate(item, cursor)
      cursor += assignment.pageCount
      return assignment
    })

    const colophonPage = cursor

    const coverData: CoverData = { page: 1, season, volume: period.volume ?? 'I', issue: period.issue ?? 1 }

    const toc: TocEntry[] = contentAssignments
      .filter(a => a.data && 'contributor' in a.data && 'page_title' in a.data)
      .map(a => {
        const d = a.data as { contributor: { name: string }; page_title: string; type: string; page: number }
        return { page: d.page, contributor: d.contributor.name, type: normalizeContentType(d.type), title: d.page_title }
      })

    const frontMatterData: FrontMatterData = { page: 3, curator, season, toc }

    const contributors = creatorItems.map(i => i.contributor)
    const colophonData: ColophonData = {
      page: colophonPage, season, contributors,
      printer: 'Magcloud', edition_number: 1, edition_total: 1,
    }

    type PageSpec = { templateName: string; data: unknown; pageCount: number }
    const pageSequence: PageSpec[] = [
      { templateName: 'CoverA',      data: coverData,       pageCount: 1 },
      { templateName: 'BlankPage',   data: { season },      pageCount: 1 },
      { templateName: 'FrontMatter', data: frontMatterData, pageCount: 1 },
      ...contentAssignments.map(a => ({ templateName: a.templateName, data: a.data, pageCount: a.pageCount })),
      { templateName: 'ColophonPage', data: colophonData, pageCount: 1 },
    ]

    // Build page HTML and metadata for each slot
    const pages = pageSequence.map((spec, idx) => {
      const isSpread = SPREAD_TEMPLATES.has(spec.templateName) && spec.pageCount === 2
      // Page label: page number(s) this slot covers
      const slotStart = idx === 0 ? 1
        : idx === 1 ? 2
        : idx === 2 ? 3
        : (() => {
          // Recalculate from contentAssignments index
          const contentIdx = idx - 3
          if (contentIdx < contentAssignments.length) {
            return (contentAssignments[contentIdx].data as { page?: number }).page ?? (idx + 1)
          }
          return colophonPage
        })()

      return {
        templateName: spec.templateName,
        pageCount: spec.pageCount,
        isSpread,
        slotStart,
        html: buildPageHtml(spec.templateName, spec.data),
      }
    })

    return NextResponse.json({
      curatorName: curator.name,
      periodName: period.name,
      season,
      pages,
    })
  } catch (err) {
    console.error('[admin/preview] unhandled error:', err)
    const message = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

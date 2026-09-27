// Blue Hour — template set manifest + adapter (Session P, Sept 2026). A LOADER TEST RIG, not a shippable
// issue: the design is AI-generated (Claude Design export, design/blue-hour/). Kit data shapes
// (docs/CLAUDE_DESIGN_KIT.md) ← pipeline shapes (docs/TEMPLATE_CONTRACT.md); the adapter runs on the Node side
// for the names in `provides` only. Missing-field decisions are listed per case below and in CLAUDE.md.
type Obj = Record<string, unknown>;
type Person = { name?: string; city?: string };
type CollabEntry = { title?: string; caption?: string; media_url?: string; focal_x?: number; focal_y?: number; contributor?: Person };

const ROMAN: Record<string, number> = { I: 1, V: 5, X: 10, L: 50, C: 100 };
// periods.volume is text ('I'); the kit pads a number ("Vol. 01"). Roman or digits → int; anything else → omitted.
function volumeNumber(v: unknown): number | null {
  if (typeof v === 'number') return v;
  if (typeof v !== 'string' || !v.trim()) return null;
  const s = v.trim().toUpperCase();
  if (/^\d+$/.test(s)) return Number(s);
  if (!/^[IVXLC]+$/.test(s)) return null;
  let n = 0;
  for (let i = 0; i < s.length; i++) { const a = ROMAN[s[i]], b = ROMAN[s[i + 1]] ?? 0; n += a < b ? -a : a; }
  return n;
}
const uniq = (xs: (string | undefined)[]) => [...new Set(xs.filter((x): x is string => !!x))];

// Base ColophonPage's hard-coded paragraph (templates-12-17.jsx), minus "and music" (Music is not a content type).
const ABOUT_TEXT = 'online//offline is a slowcial media platform — a curated, modular, printed social magazine made quarterly, one per curator, from contributed creative work. Contributors submit photography, art, poetry and essays. Curators select what goes into their personalized printed edition. The physical magazine is the product.';

function collab(d: Obj) {
  const entries = (d.entries as CollabEntry[]) ?? [];
  return {
    ...d,
    description: d.display_text || undefined,
    entries: entries.map(e => ({ media_url: e.media_url, title: e.title, focal_x: e.focal_x, focal_y: e.focal_y, contributor_name: e.contributor?.name })),
    participants: uniq(entries.map(e => e.contributor?.name)),
  };
}

export function adapt(templateName: string, data: unknown): unknown {
  const d = (data ?? {}) as Obj;
  switch (templateName) {
    case 'CoverA':
      return { season: d.season, volume: volumeNumber(d.volume), issue: d.issue ?? null /* cover_image: none in the pipeline */ };
    case 'FrontMatter': {
      const toc = (d.toc as { page: number; contributor: string; type: string; title: string }[]) ?? [];
      return { page: d.page, season: d.season, curator_name: (d.curator as Person | undefined)?.name, entries: toc.map(t => ({ page: t.page, title: t.title, contributor_name: t.contributor, type: t.type })) };
    }
    case 'ColophonPage': {
      const people = (d.contributors as Person[]) ?? [];
      const printer = d.printer ? `Printed by ${d.printer} · Edition ${d.edition_number ?? 1} of ${d.edition_total ?? 1}` : undefined;
      return { page: d.page, season: d.season, about_text: ABOUT_TEXT, contributors: uniq(people.map(p => p.name)), printer_line: printer /* volume, issue, artist_credit: not in ColophonData → omitted */ };
    }
    case 'CommunicationsPage': {
      const msgs = (d.messages as { from?: Person; to?: Person; subject?: string; body?: string }[]) ?? [];
      return { page: d.page, season: d.season, curator_name: msgs[0]?.to?.name, notes: msgs.map(m => ({ sender_name: m.from?.name, subject: m.subject, body: m.body })) };
    }
    case 'CollabSpreadCommunity': case 'CollabSpreadLocal': case 'CollabSpreadPrivate':
      return collab(d);
    default:
      return d; // photo spreads, TextSubmission/TextSpread/PoetryPage (read body), BlankPage→Endpaper: shapes already match
  }
}

const manifest = {
  name: 'blue-hour',
  provides: ['CoverA', 'BlankPage', 'FrontMatter', 'ColophonPage', 'SpreadPanorama', 'Spread', 'Spread2', 'Spread4', 'SpreadMosaic', 'Spread6',
    'TextSubmission', 'TextSpread', 'PoetryPage', 'CommunicationsPage', 'CollabSpreadCommunity', 'CollabSpreadLocal', 'CollabSpreadPrivate'],
  files: ['00-theme-primitives-batch1.jsx', '01-shared-marks.jsx', '03-batch2-mosaic-spread6-spread.jsx', '04-batch3-text-poetry-letters.jsx', '05-batch4-collabs.jsx', '06-batch5-frontmatter-endpaper-colophon.jsx'],
  fontCss: "@import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500&family=Lexend+Zetta:wght@200;300;400&family=Spectral:ital,wght@0,300;0,400;1,300;1,400&display=swap');",
  nameMap: { Cover: 'CoverA', Endpaper: 'BlankPage' },
  adapt,
};

export default manifest;

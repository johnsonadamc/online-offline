// Ported from design/blue-hour/00-theme-primitives-batch1.jsx (Session P, Sept 2026): sample data, style sheet, preview hooks, per-file
// `const {…} = window` lines and helper window exports removed; clampWords/maxWords truncation removed. Otherwise unchanged.
const THEME = {
  name: 'Autumn 2026 — Blue Hour',
  fontCss: "@import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500&family=Lexend+Zetta:wght@200;300;400&family=Spectral:ital,wght@0,300;0,400;1,300;1,400&display=swap');",
  fonts: { display: "'Lexend Zetta', sans-serif", text: "'Spectral', serif", label: "'IBM Plex Mono', monospace" },
  colors: {
    paper: '#0D1A1D',   // ground: blue-green night under the haze
    deep: '#1C3B3F',    // badge fill, empty frames, low haze
    ink: '#E4ECE8',     // text
    muted: '#93A9A6',   // cities, page numbers
    accent: '#8FB9D6',  // mist blue: the //, section labels, haze bloom
    accent2: '#86D2BF', // sea glass: image titles, glass panels, haze bloom
  },
};

const PAGE_W = 790, PAGE_H = 1054, SPREAD_W = 1580;
const alpha = (c, p) => `color-mix(in srgb, ${c} ${p}%, transparent)`;
const pad2 = n => String(n).padStart(2, '0');
const side = p => (p % 2 === 0 ? 'left' : 'right');

const NOISE = "url(\"data:image/svg+xml;utf8," + encodeURIComponent("<svg xmlns='http://www.w3.org/2000/svg' width='240' height='240'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='.85' numOctaves='2' stitchTiles='stitch'/><feColorMatrix values='.33 .33 .33 0 0 .33 .33 .33 0 0 .33 .33 .33 0 0 0 0 0 1 0'/></filter><rect width='100%' height='100%' filter='url(#n)'/></svg>") + "\")";

/* ---------- shared marks ---------- */
function Grain({ theme = THEME }) {
  return <div style={{ position: 'absolute', inset: 0, backgroundImage: NOISE, opacity: .16, mixBlendMode: 'overlay', pointerEvents: 'none', zIndex: 40 }}></div>;
}
function Haze({ seed = 0, theme = THEME }) {
  const c = theme.colors;
  const P = [[20, 18, 78, 62], [74, 14, 22, 70], [38, 58, 88, 22], [86, 76, 14, 36]][seed % 4];
  return <div style={{ position: 'absolute', inset: 0, zIndex: 0, pointerEvents: 'none' }}>
    <div style={{ position: 'absolute', inset: 0, background: `radial-gradient(ellipse 58% 46% at ${P[0]}% ${P[1]}%, ${alpha(c.accent2, 30)}, transparent 72%), radial-gradient(ellipse 62% 52% at ${P[2]}% ${P[3]}%, ${alpha(c.accent, 26)}, transparent 74%), radial-gradient(ellipse 90% 55% at 50% 104%, ${c.deep}, transparent 80%)` }}></div>
  </div>;
}
function PageRoot({ w = PAGE_W, theme = THEME, children, label, seed = 0 }) {
  return <div data-screen-label={label} style={{ position: 'relative', width: w, height: PAGE_H, overflow: 'hidden', background: theme.colors.paper, color: theme.colors.ink }}><Haze seed={seed} theme={theme} />{children}<Grain theme={theme} /></div>;
}
function Wordmark({ size = 14, theme = THEME, weight = 300, stacked = false }) {
  const s = { fontFamily: theme.fonts.display, fontWeight: weight, fontSize: size, color: theme.colors.ink, textTransform: 'lowercase', letterSpacing: '-.02em', lineHeight: 1.15, whiteSpace: 'nowrap' };
  const sl = <span style={{ color: theme.colors.accent }}>//</span>;
  return stacked ? <div style={s}><div>online{sl}</div><div>offline</div></div> : <span style={s}>online{sl}offline</span>;
}
function Badge({ d = 180, theme = THEME, children, style }) {
  return <div style={{ position: 'absolute', width: d, height: d, borderRadius: '50%', background: theme.colors.paper, boxShadow: `0 0 0 1px ${alpha(theme.colors.accent2, 70)}, 0 0 0 7px ${theme.colors.paper}`, display: 'flex', alignItems: 'center', justifyContent: 'center', textAlign: 'center', ...style }}>{children}</div>;
}
function TopBar({ x0 = 47, x1 = 743, left, right, theme = THEME }) {
  const t = { position: 'absolute', top: 56, fontFamily: theme.fonts.display, fontWeight: 300, fontSize: 8.5, letterSpacing: '.28em', textTransform: 'uppercase', color: theme.colors.ink, whiteSpace: 'nowrap' };
  return <>
    <div style={{ position: 'absolute', left: x0, width: x1 - x0, top: 78, height: 1, background: alpha(theme.colors.ink, 45), zIndex: 20 }}></div>
    {left && <div style={{ ...t, left: x0, zIndex: 20 }}>{left}</div>}
    {right && <div style={{ ...t, right: (x1 > PAGE_W ? SPREAD_W : PAGE_W) - x1, zIndex: 20, textAlign: 'right' }}>{right}</div>}
  </>;
}
function Folio({ page, season, theme = THEME, offset = 0 }) {
  const sd = side(page);
  return <div style={{ position: 'absolute', top: 994, left: offset + 47, width: 696, textAlign: sd, fontFamily: theme.fonts.label, fontSize: 9, letterSpacing: '.14em', color: theme.colors.muted, zIndex: 20 }}>{page} / {season}</div>;
}
function SectionLabel({ children, theme = THEME, style }) {
  return <div style={{ fontFamily: theme.fonts.label, fontWeight: 500, fontSize: 9, letterSpacing: '.32em', textTransform: 'uppercase', color: theme.colors.accent, ...style }}>— {children}</div>;
}
function PieceTitle({ children, size = 30, theme = THEME, split = false, style }) {
  return <div style={{ fontFamily: theme.fonts.display, fontWeight: 300, fontSize: size, lineHeight: 1.3, letterSpacing: '.06em', textTransform: 'uppercase', color: theme.colors.ink, textWrap: 'balance', textShadow: split ? `-3px 0 ${alpha(theme.colors.accent, 75)}, 3px 0 ${alpha(theme.colors.accent2, 75)}` : 'none', ...style }}>{children}</div>;
}
function Byline({ contributor, theme = THEME, style }) {
  if (!contributor) return null;
  return <div style={{ display: 'flex', alignItems: 'baseline', gap: 14, flexWrap: 'wrap', ...style }}>
    <span style={{ fontFamily: theme.fonts.text, fontStyle: 'italic', fontWeight: 300, fontSize: 18, color: theme.colors.ink }}>{contributor.name}</span>
    {contributor.city && <span style={{ fontFamily: theme.fonts.label, fontSize: 9, letterSpacing: '.28em', textTransform: 'uppercase', color: theme.colors.muted }}>{contributor.city}</span>}
  </div>;
}
function ImageTitle({ children, theme = THEME, size = 11, style }) {
  return <span style={{ fontFamily: theme.fonts.label, fontSize: size, letterSpacing: '.06em', textTransform: 'lowercase', color: theme.colors.accent2, ...style }}>{children}</span>;
}
function Caption({ children, theme = THEME, style }) {
  return <p style={{ fontFamily: theme.fonts.text, fontWeight: 300, fontSize: 12, lineHeight: 1.75, color: alpha(theme.colors.ink, 88), textWrap: 'pretty', ...style }}>{children}</p>;
}
function EntryNote({ n, entry, theme = THEME, width }) {
  if (!entry || (!entry.title && !entry.caption)) return null;
  return <div style={{ width }}>
    <div style={{ display: 'flex', gap: 12, alignItems: 'baseline', marginBottom: 6 }}>
      <span style={{ fontFamily: theme.fonts.label, fontSize: 9, color: theme.colors.accent, letterSpacing: '.1em' }}>{pad2(n)}</span>
      {entry.title && <ImageTitle theme={theme}>{entry.title}</ImageTitle>}
    </div>
    {entry.caption && <Caption theme={theme}>{entry.caption}</Caption>}
  </div>;
}
function Photo({ entry, x, y, w, h, theme = THEME, z = 2 }) {
  const fx = entry?.focal_x ?? 50, fy = entry?.focal_y ?? 50;
  return <div style={{ position: 'absolute', left: x, top: y, width: w, height: h, overflow: 'hidden', background: theme.colors.deep, zIndex: z }}>
    {entry?.media_url && <img src={entry.media_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: `${fx}% ${fy}%`, display: 'block' }} />}
    <div style={{ position: 'absolute', inset: 0, boxShadow: `inset 0 0 0 1px ${alpha(theme.colors.ink, 30)}` }}></div>
  </div>;
}
function Afterimage({ x, y, w, h, dx = 12, dy = 0, n = 3, theme = THEME }) {
  return <>{Array.from({ length: n }, (_, i) => <div key={i} style={{ position: 'absolute', left: x + dx * (i + 1), top: y + dy * (i + 1), width: w, height: h, border: `1px solid ${alpha(theme.colors.accent2, 50 - i * 13)}`, zIndex: 1, pointerEvents: 'none' }}></div>)}</>;
}
function TideDisc({ cx, cy, d, theme = THEME, slice = 7 }) {
  const c = theme.colors;
  const mask = `linear-gradient(black 0 48%, transparent 48%), repeating-linear-gradient(to bottom, black 0 ${slice}px, transparent ${slice}px ${slice * 1.9}px)`;
  return <>
    <div style={{ position: 'absolute', left: cx - d * .85, top: cy - d * .85, width: d * 1.7, height: d * 1.7, borderRadius: '50%', background: `radial-gradient(circle, ${alpha(c.accent2, 24)}, transparent 62%)`, zIndex: 0 }}></div>
    <div style={{ position: 'absolute', left: cx - d / 2, top: cy - d / 2, width: d, height: d, borderRadius: '50%', background: `linear-gradient(to bottom, ${alpha(c.accent2, 78)}, ${alpha(c.accent, 48)} 52%, ${alpha(c.deep, 70)})`, WebkitMaskImage: mask, maskImage: mask, zIndex: 0 }}></div>
  </>;
}
function Tideline({ x, y, w, h, theme = THEME, vertical = false }) {
  const fade = vertical ? 'linear-gradient(to bottom, transparent, black 12%, black 88%, transparent)' : 'linear-gradient(to right, transparent, black 14%, black 86%, transparent)';
  return <div style={{ position: 'absolute', left: x, top: y, width: w, height: h, background: `repeating-linear-gradient(to bottom, ${alpha(theme.colors.accent2, 26)} 0 1px, transparent 1px 5px)`, WebkitMaskImage: fade, maskImage: fade, zIndex: 0, pointerEvents: 'none' }}></div>;
}
function GhostType({ children, x, y, size = 140, rotate = 0, lower = false, theme = THEME }) {
  return <div style={{ position: 'absolute', left: x, top: y, fontFamily: theme.fonts.display, fontWeight: 200, fontSize: size, lineHeight: 1, textTransform: lower ? 'none' : 'uppercase', color: 'transparent', WebkitTextStroke: `1px ${alpha(theme.colors.accent2, 42)}`, whiteSpace: 'nowrap', transform: `rotate(${rotate}deg)`, transformOrigin: 'left top', zIndex: 0, pointerEvents: 'none' }}>{children}</div>;
}
function Streak({ x, y, w, theme = THEME, tone = 'accent2' }) {
  const col = theme.colors[tone];
  return <>
    <div style={{ position: 'absolute', left: x, top: y - 5, width: w, height: 12, background: `linear-gradient(to right, transparent, ${alpha(col, 28)}, transparent)`, filter: 'blur(6px)', zIndex: 1 }}></div>
    <div style={{ position: 'absolute', left: x, top: y, width: w, height: 2, background: `linear-gradient(to right, transparent, ${alpha(col, 85)} 60%, transparent)`, filter: 'blur(1px)', zIndex: 1 }}></div>
  </>;
}

function GridFloor({ x, y, w, h, theme = THEME, rows = 7, rays = 11 }) {
  const c = theme.colors, line = alpha(c.accent2, 60), cx = w / 2, spread = w * 1.1;
  const hs = Array.from({ length: rows }, (_, i) => h * Math.pow((i + 1) / rows, 1.9));
  const vs = Array.from({ length: rays * 2 + 1 }, (_, i) => (i - rays) / rays);
  return <div style={{ position: 'absolute', left: x, top: y, width: w, height: h, overflow: 'hidden', zIndex: 1, pointerEvents: 'none', background: `linear-gradient(${alpha(c.paper, 55)}, ${c.paper})` }}>
    {hs.map((t, i) => <div key={'h' + i} style={{ position: 'absolute', left: 0, right: 0, top: t, height: 1, background: line }}></div>)}
    {vs.map((k, i) => { const dx = k * spread, len = Math.hypot(dx, h) + 2, ang = Math.atan2(dx, h) * 180 / Math.PI; return <div key={'v' + i} style={{ position: 'absolute', left: cx, top: 0, width: 1, height: len, background: `linear-gradient(${alpha(c.accent2, 10)}, ${line} 40%)`, transformOrigin: '0 0', transform: `rotate(${-ang}deg)` }}></div>; })}
    <div style={{ position: 'absolute', left: 0, right: 0, top: 0, height: 1, background: alpha(c.accent2, 90), boxShadow: `0 0 14px 2px ${alpha(c.accent2, 45)}` }}></div>
  </div>;
}
function WireGlobe({ cx, cy, d, tilt = -14, theme = THEME }) {
  const c = theme.colors, b = `1px solid ${alpha(c.accent2, 75)}`;
  return <div style={{ position: 'absolute', left: cx - d / 2, top: cy - d / 2, width: d, height: d, transform: `rotate(${tilt}deg)`, zIndex: 1, pointerEvents: 'none' }}>
    <div style={{ position: 'absolute', inset: 0, borderRadius: '50%', background: `radial-gradient(circle at 34% 30%, ${alpha(c.accent2, 30)}, transparent 66%)` }}></div>
    {[1, .68, .32].map((k, i) => <div key={'m' + i} style={{ position: 'absolute', top: 0, height: d, left: d * (1 - k) / 2, width: d * k, borderRadius: '50%', border: b }}></div>)}
    {[0, .38, -.38, .7, -.7].map((y, i) => { const w = d * Math.sqrt(1 - y * y); return <div key={'l' + i} style={{ position: 'absolute', left: (d - w) / 2, width: w, top: d / 2 + y * d / 2 - w * .09, height: w * .18, borderRadius: '50%', border: b }}></div>; })}
  </div>;
}
function Orbit({ cx, cy, rx, ry, rotate = -12, dashed = false, theme = THEME }) {
  return <div style={{ position: 'absolute', left: cx - rx, top: cy - ry, width: rx * 2, height: ry * 2, borderRadius: '50%', border: `1px ${dashed ? 'dashed' : 'solid'} ${alpha(theme.colors.ink, 45)}`, transform: `rotate(${rotate}deg)`, zIndex: 1, pointerEvents: 'none' }}></div>;
}
function Sparkle({ x, y, s = 16, tone = 'ink', theme = THEME }) {
  return <div style={{ position: 'absolute', left: x - s / 2, top: y - s / 2, width: s, height: s, background: theme.colors[tone], clipPath: 'polygon(50% 0, 57% 43%, 100% 50%, 57% 57%, 50% 100%, 43% 57%, 0 50%, 43% 43%)', zIndex: 2, pointerEvents: 'none' }}></div>;
}
function Disc({ cx, cy, d, theme = THEME }) {
  const c = theme.colors, r = d * .09, hole = `radial-gradient(circle, transparent 0 ${r}px, black ${r + 1}px)`;
  return <div style={{ position: 'absolute', left: cx - d / 2, top: cy - d / 2, width: d, height: d, zIndex: 1, pointerEvents: 'none' }}>
    <div style={{ position: 'absolute', inset: 0, borderRadius: '50%', opacity: .78, background: `conic-gradient(from 200deg, ${c.accent2}, ${c.accent}, ${c.deep}, ${c.ink}, ${c.accent2}, ${c.deep}, ${c.accent}, ${c.accent2})`, WebkitMaskImage: hole, maskImage: hole }}></div>
    <div style={{ position: 'absolute', inset: d * .3, borderRadius: '50%', border: `1px solid ${alpha(c.paper, 60)}` }}></div>
  </div>;
}
function Prism({ x, y, s, rotate = 0, theme = THEME }) {
  const c = theme.colors;
  return <div style={{ position: 'absolute', left: x, top: y, width: s, height: s * .9, transform: `rotate(${rotate}deg)`, background: `linear-gradient(to bottom, ${alpha(c.accent2, 75)}, ${alpha(c.accent, 18)})`, clipPath: 'polygon(50% 0, 100% 100%, 0 100%)', zIndex: 1, pointerEvents: 'none' }}></div>;
}
function Checker({ x, y, w, h, cell = 12, rotate = 0, theme = THEME }) {
  const c = theme.colors;
  return <div style={{ position: 'absolute', left: x, top: y, width: w, height: h, transform: `rotate(${rotate}deg)`, background: `repeating-conic-gradient(${alpha(c.accent2, 32)} 0 25%, transparent 0 50%) 0 0 / ${cell * 2}px ${cell * 2}px`, boxShadow: `inset 0 0 0 1px ${alpha(c.accent2, 60)}`, zIndex: 1, pointerEvents: 'none' }}></div>;
}
function Cursor({ x, y, s = 30, theme = THEME }) {
  const clip = 'polygon(0 0, 0 80%, 22% 62%, 38% 96%, 53% 89%, 38% 56%, 66% 56%)';
  return <>
    <div style={{ position: 'absolute', left: x + 5, top: y + 5, width: s * .7, height: s, background: alpha(theme.colors.accent2, 70), clipPath: clip, zIndex: 2 }}></div>
    <div style={{ position: 'absolute', left: x, top: y, width: s * .7, height: s, background: theme.colors.ink, clipPath: clip, zIndex: 2 }}></div>
  </>;
}
function PixelSteps({ x, y, n = 6, s = 16, theme = THEME }) {
  const c = theme.colors;
  return <>{Array.from({ length: n }, (_, i) => <div key={i} style={{ position: 'absolute', left: x + i * s, top: y + i * s, width: s, height: s, background: alpha(i % 2 ? c.accent : c.accent2, 70 - i * 9), zIndex: 1 }}></div>)}</>;
}
function WindowBar({ x, y, w, label, theme = THEME }) {
  const c = theme.colors;
  const file = label ? label.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '') + '.jpg' : null;
  return <div style={{ position: 'absolute', left: x, top: y - 20, width: w, height: 20, boxShadow: `inset 0 0 0 1px ${alpha(c.ink, 30)}`, background: alpha(c.deep, 85), display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 8px', zIndex: 3 }}>
    <span style={{ fontFamily: theme.fonts.label, fontSize: 8, letterSpacing: '.06em', color: c.accent2 }}>{file}</span>
    <span style={{ display: 'flex', gap: 4 }}>{[0, 1, 2].map(i => <span key={i} style={{ width: 7, height: 7, border: `1px solid ${alpha(c.ink, 55)}` }}></span>)}</span>
  </div>;
}
function DotField({ x, y, w, h, theme = THEME, pitch = 18 }) {
  const fade = 'radial-gradient(ellipse at center, black 30%, transparent 72%)';
  return <div style={{ position: 'absolute', left: x, top: y, width: w, height: h, background: `radial-gradient(${alpha(theme.colors.accent2, 55)} 1px, transparent 1.6px) 0 0 / ${pitch}px ${pitch}px`, WebkitMaskImage: fade, maskImage: fade, zIndex: 0, pointerEvents: 'none' }}></div>;
}


/* ---------- Batch 1 ---------- */
function Cover({ data, theme = THEME }) {
  const img = data.cover_image || {};
  return <PageRoot theme={theme} label="Cover" seed={1}>
    <TideDisc theme={theme} cx={395} cy={870} d={340} slice={8} />
    <GridFloor theme={theme} x={0} y={936} w={PAGE_W} h={118} />
    {img.media_url && <Photo theme={theme} entry={img} x={95} y={170} w={600} h={600} />}
    <Sparkle theme={theme} x={70} y={128} s={18} />
    <Sparkle theme={theme} x={730} y={846} s={12} tone="accent2" />
    <Sparkle theme={theme} x={180} y={900} s={9} />
    <TopBar theme={theme} left={data.volume != null ? `Vol. ${pad2(data.volume)}` : null} right={data.season} />
    <Orbit theme={theme} cx={653} cy={212} rx={132} ry={34} rotate={-18} />
    <Badge theme={theme} d={200} style={{ left: 553, top: 112, zIndex: 20 }}><Wordmark theme={theme} size={17} stacked /></Badge>
    {data.issue != null && <div style={{ position: 'absolute', left: 95, top: 800, zIndex: 20 }}><ImageTitle theme={theme} size={20}>issue {pad2(data.issue)}</ImageTitle></div>}
  </PageRoot>;
}

function SpreadPanorama({ data, theme = THEME }) {
  const e = data.entries[0] || {};
  const cap = e.caption;
  return <PageRoot theme={theme} w={SPREAD_W} label="SpreadPanorama" seed={2}>
    <Checker theme={theme} x={760} y={984} w={300} h={70} cell={10} />
    <WireGlobe theme={theme} cx={910} cy={868} d={150} />
    <Orbit theme={theme} cx={910} cy={868} rx={150} ry={34} rotate={-12} />
    <Orbit theme={theme} cx={910} cy={868} rx={190} ry={48} rotate={-12} dashed />
    <Sparkle theme={theme} x={760} y={800} s={16} />
    <Sparkle theme={theme} x={1070} y={810} s={10} tone="accent2" />
    <Sparkle theme={theme} x={1100} y={925} s={7} />
    <Photo theme={theme} entry={e} x={47} y={118} w={1486} h={622} />
    <TopBar theme={theme} x0={47} x1={1533} left={data.type} right={<Wordmark theme={theme} size={9} weight={400} />} />
    <div style={{ position: 'absolute', left: 47, bottom: 118, width: 640, display: 'flex', flexDirection: 'column', gap: 16, zIndex: 20 }}>
      <PieceTitle theme={theme} size={36} split>{data.page_title}</PieceTitle>
      <Byline theme={theme} contributor={data.contributor} />
    </div>
    {(e.title || cap) && <div style={{ position: 'absolute', left: 1153, bottom: 118, width: 380, zIndex: 20 }}>
      {e.title && <div style={{ marginBottom: 8 }}><ImageTitle theme={theme}>{e.title}</ImageTitle></div>}
      {cap && <Caption theme={theme}>{cap}</Caption>}
    </div>}
    <Folio theme={theme} page={data.page} season={data.season} />
    <Folio theme={theme} page={data.page + 1} season={data.season} offset={PAGE_W} />
  </PageRoot>;
}

function Spread2({ data, theme = THEME }) {
  const [a, b] = data.entries;
  const notes = [[1, a], [2, b]].filter(([, e]) => e && (e.title || e.caption));
  return <PageRoot theme={theme} w={SPREAD_W} label="Spread2" seed={3}>
    <div style={{ position: 'absolute', left: 790, top: 118, width: 0, height: 820, borderLeft: `1px dashed ${alpha(theme.colors.accent2, 40)}`, zIndex: 0 }}></div>
    <Disc theme={theme} cx={790} cy={210} d={108} />
    <Prism theme={theme} x={744} y={330} s={92} rotate={9} />
    <Checker theme={theme} x={748} y={490} w={84} h={84} cell={10.5} rotate={-11} />
    <Orbit theme={theme} cx={790} cy={680} rx={46} ry={46} />
    <Orbit theme={theme} cx={790} cy={680} rx={62} ry={16} rotate={20} />
    <Sparkle theme={theme} x={790} y={680} s={14} />
    <PixelSteps theme={theme} x={756} y={800} n={5} s={14} />
    <Sparkle theme={theme} x={1520} y={100} s={10} tone="accent2" />
    <Photo theme={theme} entry={a} x={47} y={118} w={660} h={820} />
    <Streak theme={theme} x={900} y={98} w={560} />
    <TopBar theme={theme} x0={47} x1={1533} left={data.type} right={<Wordmark theme={theme} size={9} weight={400} />} />
    {b && <Photo theme={theme} entry={b} x={873} y={118} w={660} h={430} />}
    <div style={{ position: 'absolute', left: 873, top: 584, width: 660, display: 'flex', flexDirection: 'column', gap: 12, zIndex: 20 }}>
      <PieceTitle theme={theme} size={26}>{data.page_title}</PieceTitle>
      <Byline theme={theme} contributor={data.contributor} />
    </div>
    <div style={{ position: 'absolute', left: 873, top: 716, width: 660, display: 'flex', gap: 40, zIndex: 20 }}>
      {notes.map(([n, e]) => <EntryNote key={n} n={n} entry={e} theme={theme} width={310} />)}
    </div>
    <Folio theme={theme} page={data.page} season={data.season} />
    <Folio theme={theme} page={data.page + 1} season={data.season} offset={PAGE_W} />
  </PageRoot>;
}

function Spread4({ data, theme = THEME }) {
  const [lead, ...rest] = data.entries;
  const n = rest.length, top = 118, bottom = 970, gap = 24, bar = 20;
  const rowH = (bottom - top - gap * (n - 1)) / n;
  return <PageRoot theme={theme} w={SPREAD_W} label="Spread4" seed={0}>
    <DotField theme={theme} x={520} y={70} w={300} h={520} />
    <Cursor theme={theme} x={676} y={570} s={34} />
    <PixelSteps theme={theme} x={660} y={640} n={6} s={16} />
    <Sparkle theme={theme} x={720} y={900} s={14} />
    <Orbit theme={theme} cx={1560} cy={560} rx={60} ry={220} rotate={0} dashed />
    <Afterimage theme={theme} x={47} y={118} w={600} h={420} dx={14} dy={14} n={3} />
    <WindowBar theme={theme} x={47} y={138} w={600} label={lead?.title} />
    <Photo theme={theme} entry={lead} x={47} y={138} w={600} h={400} />
    <TopBar theme={theme} x0={47} x1={1533} left={data.type} right={<Wordmark theme={theme} size={9} weight={400} />} />
    <div style={{ position: 'absolute', left: 47, bottom: 118, width: 580, display: 'flex', flexDirection: 'column', gap: 16, zIndex: 20 }}>
      <PieceTitle theme={theme} size={32}>{data.page_title}</PieceTitle>
      <Byline theme={theme} contributor={data.contributor} />
      <div style={{ marginTop: 14 }}><EntryNote n={1} entry={lead} theme={theme} width={420} /></div>
    </div>
    {rest.map((e, i) => {
      const y = top + i * (rowH + gap), flip = i % 2 === 1, fx = flip ? 1173 : 873;
      return <React.Fragment key={i}>
        <WindowBar theme={theme} x={fx} y={y + bar} w={360} label={e.title} />
        <Photo theme={theme} entry={e} x={fx} y={y + bar} w={360} h={rowH - bar} />
        <div style={{ position: 'absolute', left: flip ? 873 : 1257, top: y + bar + 10, width: 276, zIndex: 20 }}><EntryNote n={i + 2} entry={e} theme={theme} width={276} /></div>
      </React.Fragment>;
    })}
    <Folio theme={theme} page={data.page} season={data.season} />
    <Folio theme={theme} page={data.page + 1} season={data.season} offset={PAGE_W} />
  </PageRoot>;
}

Object.assign(window, { Cover, SpreadPanorama, Spread2, Spread4 });

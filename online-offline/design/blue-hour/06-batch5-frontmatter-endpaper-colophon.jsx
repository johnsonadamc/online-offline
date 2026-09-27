// Batch 5 — FrontMatter, Endpaper, ColophonPage
const { THEME, alpha, PAGE_W, PAGE_H, side, pad2, PageRoot, TopBar, Folio, PieceTitle, Wordmark, Badge, Sparkle, Prism, DotField, Scrollbar, Blinds, Checker, Orbit, Key, SEASON, NAMES, TITLES, TYPES } = window;

function FrontMatter({ data, theme = THEME }) {
  const L = side(data.page) === 'left', E = data.entries.slice(0, 25), n = E.length, c = theme.colors;
  const rowH = Math.min(46, 640 / n), listX = L ? 79 : 47, listW = 664, top = 300;
  const colS = { pg: 44, title: 290, by: 200 };
  const hdr = { fontFamily: theme.fonts.label, fontSize: 7.5, letterSpacing: '.24em', textTransform: 'uppercase', color: c.muted };
  return <PageRoot theme={theme} label="FrontMatter" seed={2}>
    <DotField theme={theme} x={L ? -40 : 520} y={60} w={320} h={240} />
    <Prism theme={theme} x={L ? 90 : 640} y={150} s={56} rotate={L ? -10 : 10} />
    <Sparkle theme={theme} x={L ? 70 : 720} y={128} s={14} />
    <Sparkle theme={theme} x={L ? 170 : 610} y={236} s={8} tone="accent2" />
    <Scrollbar theme={theme} x={L ? 47 : 731} y={top - 26} h={rowH * n + 26} thumbTop={0} thumbSize={Math.min(1, 12 / n)} />
    <TopBar theme={theme} left="Contents" right={<Wordmark theme={theme} size={9} weight={400} />} />
    <div style={{ position: 'absolute', left: L ? 260 : 47, top: 118, width: 480, display: 'flex', flexDirection: 'column', gap: 12, zIndex: 20 }}>
      <PieceTitle theme={theme} size={40} split>Contents</PieceTitle>
      {data.curator_name && <div style={{ fontFamily: theme.fonts.text, fontStyle: 'italic', fontWeight: 300, fontSize: 18 }}>selected by {data.curator_name}</div>}
    </div>
    <div style={{ position: 'absolute', left: listX, top: top - 22, width: listW, display: 'flex', gap: 12, zIndex: 20, ...hdr }}>
      <span style={{ width: colS.pg }}>pg</span><span style={{ width: colS.title }}>title</span><span style={{ width: colS.by }}>by</span><span style={{ flex: 1, textAlign: 'right' }}>type</span>
    </div>
    <div style={{ position: 'absolute', left: listX, top, width: listW, zIndex: 20 }}>
      {E.map((e, i) => <div key={i} style={{ height: rowH, display: 'flex', alignItems: 'center', gap: 12, borderTop: `1px solid ${alpha(c.ink, i ? 12 : 30)}` }}>
        <span style={{ width: colS.pg, fontFamily: theme.fonts.label, fontSize: 10, color: c.accent }}>{pad2(e.page)}</span>
        <span style={{ width: colS.title, fontFamily: theme.fonts.text, fontWeight: 300, fontSize: n > 16 ? 13 : 15, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{e.title}</span>
        <span style={{ width: colS.by, fontFamily: theme.fonts.text, fontStyle: 'italic', fontWeight: 300, fontSize: n > 16 ? 12 : 13.5, color: alpha(c.ink, 80), whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{e.contributor_name}</span>
        <span style={{ flex: 1, textAlign: 'right', fontFamily: theme.fonts.label, fontSize: 7.5, letterSpacing: '.2em', textTransform: 'uppercase', color: c.accent2 }}>{e.type}</span>
      </div>)}
    </div>
    <Folio theme={theme} page={data.page} season={data.season} />
  </PageRoot>;
}

function Endpaper({ data, theme = THEME }) {
  const c = theme.colors, fade = 'radial-gradient(ellipse 70% 60% at 50% 60%, black 20%, transparent 75%)';
  const rings = `radial-gradient(circle, transparent 0 16px, ${alpha(c.accent2, 38)} 16px 17px, transparent 17px) 0 0 / 52px 52px`;
  return <PageRoot theme={theme} label="Endpaper" seed={3}>
    <div style={{ position: 'absolute', inset: 0, background: rings, WebkitMaskImage: fade, maskImage: fade, zIndex: 0 }}></div>
    <div style={{ position: 'absolute', left: -200, top: 560, width: 1200, height: 900, WebkitMaskImage: 'linear-gradient(transparent, black 40%)', maskImage: 'linear-gradient(transparent, black 40%)', zIndex: 0 }}>
      <Checker theme={theme} x={0} y={0} w={1200} h={900} cell={26} rotate={-8} />
    </div>
    {[[160, 210, 18], [610, 150, 11], [420, 470, 24], [120, 690, 9], [680, 620, 14], [300, 880, 8], [560, 940, 12]].map(([x, y, s], i) => <Sparkle key={i} theme={theme} x={x} y={y} s={s} tone={i % 3 ? 'ink' : 'accent2'} />)}
    <Orbit theme={theme} cx={420} cy={470} rx={70} ry={20} rotate={-16} />
    {data.page != null && <Folio theme={theme} page={data.page} season={data.season} />}
  </PageRoot>;
}

function ColophonPage({ data, theme = THEME }) {
  const c = theme.colors, names = data.contributors || [], ncol = names.length > 16 ? 3 : 2;
  const meta = [data.volume != null && `Vol. ${pad2(data.volume)}`, data.issue != null && `Issue ${pad2(data.issue)}`].filter(Boolean).join(' · ');
  const small = { fontFamily: theme.fonts.label, fontSize: 8.5, letterSpacing: '.08em', color: c.muted, lineHeight: 1.7 };
  return <PageRoot theme={theme} label="ColophonPage" seed={0}>
    <Blinds theme={theme} x={47} y={118} w={696} h={250} slat={8} />
    <Sparkle theme={theme} x={96} y={160} s={16} />
    <Sparkle theme={theme} x={380} y={330} s={9} tone="ink" />
    <TopBar theme={theme} left={meta || null} right={data.season} />
    <Badge theme={theme} d={170} style={{ left: 573, top: 283, zIndex: 20 }}><Wordmark theme={theme} size={14} stacked /></Badge>
    {data.about_text && <p style={{ position: 'absolute', left: 47, top: 410, width: 500, fontFamily: theme.fonts.text, fontWeight: 300, fontSize: 14, lineHeight: 1.75, color: c.ink, textWrap: 'pretty', zIndex: 20 }}>{data.about_text}</p>}
    {names.length > 0 && <div style={{ position: 'absolute', left: 47, top: 690, width: 696, zIndex: 20 }}>
      <Key theme={theme} style={{ marginBottom: 12 }}>contributors</Key>
      <div style={{ columnCount: ncol, columnGap: 24, fontFamily: theme.fonts.text, fontStyle: 'italic', fontWeight: 300, fontSize: names.length > 16 ? 13 : 15, lineHeight: 1.75 }}>
        {names.map(nm => <div key={nm} style={{ breakInside: 'avoid' }}>{nm}</div>)}
      </div>
    </div>}
    <div style={{ position: 'absolute', left: 47, top: 956, width: 696, display: 'flex', justifyContent: 'space-between', gap: 24, zIndex: 20, ...small }}>
      <span>{data.artist_credit}</span><span style={{ textAlign: 'right' }}>{data.printer_line}</span>
    </div>
  </PageRoot>;
}

Object.assign(window, { FrontMatter, Endpaper, ColophonPage });

const toc = n => Array.from({ length: n }, (_, i) => ({ page: 6 + i * (n > 12 ? 2 : 4), title: TITLES[i % TITLES.length], contributor_name: NAMES[(i * 7) % NAMES.length], type: TYPES[i % 4] }));
const ABOUT = 'online//offline is made each season by the people who read it. Contributors send photographs, art, poems and essays; each curator chooses the pieces they want, and their copy is printed from those choices alone, so no two books are quite the same. This issue was gathered in the weeks after the clocks went back, when the light goes early and the evenings turn blue. Thank you for looking slowly.';
window.DUSK_STATES.push(
  ['FrontMatter — 10 entries', FrontMatter, { page: 3, season: SEASON, curator_name: 'Rosa Albright', entries: toc(10) }],
  ['FrontMatter — 25 entries', FrontMatter, { page: 3, season: SEASON, curator_name: 'Rosa Albright', entries: toc(25) }],
  ['Endpaper', Endpaper, { page: 2, season: SEASON }],
  ['ColophonPage — 8 names', ColophonPage, { season: SEASON, volume: 3, issue: 2, about_text: ABOUT, contributors: NAMES.slice(0, 8), artist_credit: 'Cover and marks: the online//offline studio', printer_line: 'Printed on demand, one copy at a time' }],
  ['ColophonPage — 25 names', ColophonPage, { season: SEASON, volume: 3, issue: 2, about_text: ABOUT, contributors: NAMES.slice(0, 25), artist_credit: 'Cover and marks: the online//offline studio', printer_line: 'Printed on demand, one copy at a time' }],
);

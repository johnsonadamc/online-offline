// Ported from design/blue-hour/03-batch2-mosaic-spread6-spread.jsx (Session P, Sept 2026): sample data, style sheet, preview hooks, per-file
// `const {…} = window` lines and helper window exports removed; clampWords/maxWords truncation removed. Otherwise unchanged.
// Batch 2 — SpreadMosaic, Spread6, Spread (photo with story)

const bar2 = (data, theme) => <TopBar theme={theme} x0={47} x1={1533} left={data.type} right={<Wordmark theme={theme} size={9} weight={400} />} />;
const folios2 = (data, theme) => <><Folio theme={theme} page={data.page} season={data.season} /><Folio theme={theme} page={data.page + 1} season={data.season} offset={PAGE_W} /></>;

function SpreadMosaic({ data, theme = THEME }) {
  const E = data.entries, six = E.length >= 6;
  const F = [
    { x: 47, y: 260, w: 400, h: 278 }, { x: 471, y: 118, w: 272, h: 420 }, { x: 47, y: 562, w: 272, h: 382 },
    { x: 873, y: 118, w: 272, h: 420 }, six ? { x: 1169, y: 118, w: 364, h: 420 } : { x: 1169, y: 118, w: 364, h: 826 }, { x: 1261, y: 562, w: 272, h: 382 },
  ];
  const P = [[790, 150], [768, 300], [812, 430], [782, 570], [804, 720], [774, 880]];
  const notes = (from, to, w) => <div style={{ display: 'flex', flexDirection: 'column', gap: 18, width: w }}>{E.slice(from, to).map((e, i) => <EntryNote key={i} n={from + i + 1} entry={e} theme={theme} width={w} />)}</div>;
  return <PageRoot theme={theme} w={SPREAD_W} label="SpreadMosaic" seed={1}>
    {P.slice(0, -1).map((p, i) => <Line key={i} theme={theme} x1={p[0]} y1={p[1]} x2={P[i + 1][0]} y2={P[i + 1][1]} dashed a={50} />)}
    {P.map((p, i) => <Sparkle key={i} theme={theme} x={p[0]} y={p[1]} s={i === 2 ? 20 : i % 2 ? 9 : 13} tone={i % 2 ? 'accent2' : 'ink'} />)}
    <Orbit theme={theme} cx={812} cy={430} rx={30} ry={30} />
    <Orbit theme={theme} cx={812} cy={430} rx={44} ry={12} rotate={-24} />
    <Orbit theme={theme} cx={774} cy={880} rx={22} ry={22} dashed />
    {F.map((f, i) => E[i] && <Photo key={i} theme={theme} entry={E[i]} {...f} />)}
    {bar2(data, theme)}
    <div style={{ position: 'absolute', left: 47, top: 118, width: 400, display: 'flex', flexDirection: 'column', gap: 12, zIndex: 20 }}>
      <PieceTitle theme={theme} size={26} split>{data.page_title}</PieceTitle>
      <Byline theme={theme} contributor={data.contributor} />
    </div>
    <div style={{ position: 'absolute', left: 343, top: 562, zIndex: 20 }}>{notes(0, 3, 400)}</div>
    <div style={{ position: 'absolute', left: 873, top: 562, zIndex: 20 }}>{notes(3, 6, six ? 364 : 272)}</div>
    {folios2(data, theme)}
  </PageRoot>;
}

function Spread6({ data, theme = THEME }) {
  const E = data.entries.slice(0, 8), n = E.length, cw = 318, rh = 276;
  const slots = [[47, 200], [389, 200], [47, 500], [389, 500], [873, 200], [1215, 200], [873, 500], [1215, 500]].map(([x, y]) => ({ x, y, w: cw, h: rh }));
  if (n === 7) slots[6] = { x: 873, y: 500, w: 660, h: rh };
  const cols = [[0, 1], [2, 3], [4, 5], [6, 7]], colX = [47, 389, 873, 1215];
  const num = { fontFamily: theme.fonts.label, fontSize: 9, letterSpacing: '.1em', color: theme.colors.accent };
  return <PageRoot theme={theme} w={SPREAD_W} label="Spread6" seed={2}>
    <Marquee theme={theme} x={859} y={168} w={688} h={306} />
    <Sparkle theme={theme} x={1547} y={168} s={14} />
    <Chevrons theme={theme} x={783} y={806} n={4} s={12} dir="down" />
    <Sparkle theme={theme} x={790} y={300} s={10} tone="accent2" />
    <Sparkle theme={theme} x={776} y={560} s={7} />
    {E.map((e, i) => <React.Fragment key={i}>
      <div style={{ position: 'absolute', left: slots[i].x, top: slots[i].y - 16, zIndex: 20, ...num }}>{pad2(i + 1)}</div>
      <Photo theme={theme} entry={e} {...slots[i]} />
    </React.Fragment>)}
    {bar2(data, theme)}
    <div style={{ position: 'absolute', left: 47, top: 104, width: 660, zIndex: 20 }}><PieceTitle theme={theme} size={24} split>{data.page_title}</PieceTitle></div>
    <div style={{ position: 'absolute', left: 873, top: 110, width: 560, zIndex: 20 }}><Byline theme={theme} contributor={data.contributor} /></div>
    {cols.map((ids, c) => <div key={c} style={{ position: 'absolute', left: colX[c], top: 804, width: cw, display: 'flex', flexDirection: 'column', gap: 14, zIndex: 20 }}>
      {ids.filter(i => E[i]).map(i => <EntryNote key={i} n={i + 1} entry={E[i]} theme={theme} width={cw} />)}
    </div>)}
    {folios2(data, theme)}
  </PageRoot>;
}

function Spread({ data, theme = THEME }) {
  const e = data.entries[0] || {}, wc = wordCount(e.caption), long = wc > 120;
  return <PageRoot theme={theme} w={SPREAD_W} label="Spread" seed={3}>
    <Ripple theme={theme} cx={130} cy={1060} r0={30} step={34} n={7} />
    <Sparkle theme={theme} x={130} y={1000} s={16} />
    <Sparkle theme={theme} x={790} y={180} s={11} tone="accent2" />
    <Line theme={theme} x1={790} y1={196} x2={790} y2={900} dashed a={32} />
    <Sparkle theme={theme} x={790} y={900} s={7} />
    <Photo theme={theme} entry={e} x={873} y={118} w={660} h={836} />
    {bar2(data, theme)}
    <div style={{ position: 'absolute', left: 47, top: 118, width: 660, display: 'flex', flexDirection: 'column', gap: 14, zIndex: 20 }}>
      <PieceTitle theme={theme} size={40} split>{data.page_title}</PieceTitle>
      <Byline theme={theme} contributor={data.contributor} />
      {e.title && <div style={{ marginTop: 6 }}><ImageTitle theme={theme}>{e.title}</ImageTitle></div>}
    </div>
    {e.caption && <div style={{ position: 'absolute', left: 47, top: 380, width: long ? 660 : 480, zIndex: 20 }}>
      <Body theme={theme} text={e.caption} size={long ? 12.5 : 15} columns={long ? 2 : 1} gap={36} />
    </div>}
    {folios2(data, theme)}
  </PageRoot>;
}

Object.assign(window, { SpreadMosaic, Spread6, Spread });

// Ported from design/blue-hour/05-batch4-collabs.jsx (Session P, Sept 2026): sample data, style sheet, preview hooks, per-file
// `const {…} = window` lines and helper window exports removed; clampWords/maxWords truncation removed. Otherwise unchanged.
// Batch 4 — CollabSpreadCommunity, CollabSpreadLocal, CollabSpreadPrivate

const barC = (theme, kind) => <TopBar theme={theme} x0={47} x1={1533} left={`Collaboration · ${kind}`} right={<Wordmark theme={theme} size={9} weight={400} />} />;
const foliosC = (data, theme) => <><Folio theme={theme} page={data.page} season={data.season} /><Folio theme={theme} page={data.page + 1} season={data.season} offset={PAGE_W} /></>;
const framed = (e, cell, theme, key) => <React.Fragment key={key}>
  <Photo theme={theme} entry={e} x={cell.x} y={cell.y} w={cell.w} h={cell.h - 28} />
  <div style={{ position: 'absolute', left: cell.x, top: cell.y + cell.h - 18, zIndex: 20 }}><FrameLabel theme={theme} name={e.contributor_name} title={e.title} w={cell.w} /></div>
</React.Fragment>;

function CollabSpreadCommunity({ data, theme = THEME }) {
  const E = data.entries.slice(0, 6), n = E.length, nl = Math.ceil(n / 2), nr = n - nl;
  const cells = [...rowCells({ x: 47, y: 470, w: 660, h: 360, counts: [nl] }), ...rowCells({ x: 873, y: 470, w: 660, h: 360, counts: [nr] })]
    .map((c, i) => ({ ...c, y: c.y + (i % 2) * 40 }));
  const cx = 790, cy = 650, rx = 860, ry = 262, pt = t => [cx + rx * Math.cos(t * Math.PI / 180), cy + ry * Math.sin(t * Math.PI / 180)];
  return <PageRoot theme={theme} w={SPREAD_W} label="CollabSpreadCommunity" seed={0}>
    <Orbit theme={theme} cx={cx} cy={cy} rx={rx} ry={ry} rotate={0} dashed />
    <Orbit theme={theme} cx={cx} cy={cy + 20} rx={700} ry={196} rotate={-3} />
    {[-90, -122, -58, 90].map((t, i) => { const [x, y] = pt(t); return <Sparkle key={i} theme={theme} x={x} y={y} s={i ? 11 : 20} tone={i % 2 ? 'accent2' : 'ink'} />; })}
    {cells.map((c, i) => framed(E[i], c, theme, i))}
    {barC(theme, 'Community')}
    <div style={{ position: 'absolute', left: 47, top: 118, width: 600, display: 'flex', flexDirection: 'column', gap: 16, zIndex: 20 }}>
      <PieceTitle theme={theme} size={38} split>{data.collab_title}</PieceTitle>
      {data.description && <Caption theme={theme} style={{ fontSize: 13.5, maxWidth: 480 }}>{data.description}</Caption>}
    </div>
    {data.participants?.length > 0 && <div style={{ position: 'absolute', left: 1113, top: 122, width: 420, textAlign: 'right', zIndex: 20 }}>
      <Key theme={theme} style={{ marginBottom: 8 }}>with</Key>
      <NameLine theme={theme} names={data.participants} max={5} />
    </div>}
    {foliosC(data, theme)}
  </PageRoot>;
}

function CollabSpreadLocal({ data, theme = THEME }) {
  const E = data.entries.slice(0, 6), city = (data.city || '').toUpperCase();
  const size = Math.min(200, Math.floor(1420 / (Math.max(city.length, 1) * 1.0)));
  const rest = E.slice(1), k = rest.length;
  const counts = k <= 2 ? [k] : [Math.floor(k / 2), Math.ceil(k / 2)];
  const cells = k ? rowCells({ x: 873, y: 390, w: 660, h: 560, counts }) : [];
  const cityStyle = { fontFamily: theme.fonts.display, fontWeight: 300, fontSize: size, lineHeight: 1, letterSpacing: '.02em', whiteSpace: 'nowrap', width: 'max-content' };
  return <PageRoot theme={theme} w={SPREAD_W} label="CollabSpreadLocal" seed={3}>
    {city && <>
      <GhostType theme={theme} x={47 + 14} y={104 + 14} size={size}><span style={{ fontWeight: 300, letterSpacing: '.02em' }}>{city}</span></GhostType>
      <div style={{ position: 'absolute', left: 47, top: 104, zIndex: 3, color: theme.colors.ink, textShadow: `-4px 0 ${alpha(theme.colors.accent, 70)}, 4px 0 ${alpha(theme.colors.accent2, 70)}`, ...cityStyle }}>{city}</div>
      {390 - (104 + size + 30) - 24 > 16 && <Tideline theme={theme} x={0} y={104 + size + 30} w={SPREAD_W} h={390 - (104 + size + 30) - 24} />}
    </>}
    <DotField theme={theme} x={-60} y={640} w={420} h={420} />
    <Sparkle theme={theme} x={1533} y={104 + size + 22} s={14} />
    {E[0] && framed(E[0], { x: 431, y: 390, w: 312, h: 560 }, theme, 'lead')}
    {cells.map((c, i) => framed(rest[i], c, theme, i))}
    {barC(theme, 'Local')}
    <div style={{ position: 'absolute', left: 47, top: 390, width: 350, display: 'flex', flexDirection: 'column', gap: 16, zIndex: 20 }}>
      <PieceTitle theme={theme} size={24}>{data.collab_title}</PieceTitle>
      {data.description && <Caption theme={theme} style={{ fontSize: 13 }}>{data.description}</Caption>}
      {data.participants?.length > 0 && <div style={{ marginTop: 10 }}><Key theme={theme} style={{ marginBottom: 8 }}>with</Key><NameLine theme={theme} names={data.participants} max={5} size={14} /></div>}
    </div>
    {foliosC(data, theme)}
  </PageRoot>;
}

function CollabSpreadPrivate({ data, theme = THEME }) {
  const E = data.entries.slice(0, 10), n = E.length, members = (data.participants || []).slice(0, 10);
  const cols = n <= 4 ? 2 : n <= 9 ? 3 : 4, rowsN = Math.ceil(n / cols), base = Math.floor(n / rowsN), extra = n % rowsN;
  const counts = Array.from({ length: rowsN }, (_, i) => base + (i < extra ? 1 : 0));
  const box = { x: 873, y: 118, w: 660, h: 836 }, pad = 52, gap = 22;
  const cw = (box.w - 2 * pad - gap * (cols - 1)) / cols, rowH = (box.h - 2 * pad - gap * (rowsN - 1)) / rowsN;
  const fh = Math.min(rowH - 26, cw * 1.25), blockH = rowsN * (fh + 26) + (rowsN - 1) * gap, y0 = box.y + (box.h - blockH) / 2;
  const cells = []; counts.forEach((k, r) => { const rw = k * cw + (k - 1) * gap, x0 = box.x + (box.w - rw) / 2; for (let i = 0; i < k; i++) cells.push({ x: x0 + i * (cw + gap), y: y0 + r * (fh + 26 + gap), w: cw, h: fh + 26 }); });
  const half = Math.ceil(members.length / 2);
  return <PageRoot theme={theme} w={SPREAD_W} label="CollabSpreadPrivate" seed={1}>
    <div style={{ position: 'absolute', left: box.x - 12, top: box.y + 12, width: box.w, height: box.h, borderRadius: 40, border: `1px solid ${alpha(theme.colors.accent2, 28)}`, zIndex: 1 }}></div>
    <div style={{ position: 'absolute', left: box.x, top: box.y, width: box.w, height: box.h, borderRadius: 40, border: `1px solid ${alpha(theme.colors.accent2, 70)}`, background: alpha(theme.colors.paper, 45), zIndex: 1 }}></div>
    <Line theme={theme} x1={440} y1={box.y + box.h / 2} x2={box.x - 22} y2={box.y + box.h / 2} dashed a={55} />
    <Keyhole theme={theme} cx={box.x} cy={box.y + box.h / 2} s={16} />
    <Sparkle theme={theme} x={440} y={box.y + box.h / 2} s={10} tone="accent2" />
    <Sparkle theme={theme} x={1540} y={110} s={14} />
    <Sparkle theme={theme} x={690} y={900} s={9} />
    {cells.map((c, i) => framed({ ...E[i], contributor_name: E[i].contributor_name }, c, theme, i))}
    {barC(theme, 'Private')}
    <div style={{ position: 'absolute', left: 47, top: 118, width: 560, display: 'flex', flexDirection: 'column', gap: 16, zIndex: 20 }}>
      <PieceTitle theme={theme} size={32} split>{data.collab_title}</PieceTitle>
      {data.description && <Caption theme={theme} style={{ fontSize: 13.5, maxWidth: 440 }}>{data.description}</Caption>}
    </div>
    {members.length > 0 && <div style={{ position: 'absolute', left: 47, top: box.y + box.h / 2 + 30, width: 380, zIndex: 20 }}>
      <Key theme={theme} style={{ marginBottom: 12 }}>{members.length} members</Key>
      <div style={{ display: 'flex', gap: 24 }}>
        {[members.slice(0, half), members.slice(half)].filter(g => g.length).map((g, i) => <div key={i} style={{ flex: 1 }}>{g.map(m => <div key={m} style={{ fontFamily: theme.fonts.text, fontStyle: 'italic', fontWeight: 300, fontSize: 16, lineHeight: 1.9, color: theme.colors.ink }}>{m}</div>)}</div>)}
      </div>
    </div>}
    {foliosC(data, theme)}
  </PageRoot>;
}

Object.assign(window, { CollabSpreadCommunity, CollabSpreadLocal, CollabSpreadPrivate });

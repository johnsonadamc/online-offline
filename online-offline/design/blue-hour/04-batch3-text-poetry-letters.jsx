// Batch 3 — TextSubmission, TextSpread, PoetryPage, CommunicationsPage
const { THEME, alpha, PAGE_W, PAGE_H, SPREAD_W, side, clampWords, PageRoot, TopBar, Folio, PieceTitle, Byline, Wordmark, Sparkle, Portal, Wave, Moon, Envelope, Checker, Cursor, Body, Key, wordCount, SEASON, essay, POEM, LETTERS } = window;

const bar1 = (label, theme) => <TopBar theme={theme} left={label} right={<Wordmark theme={theme} size={9} weight={400} />} />;

function TextSubmission({ data, theme = THEME }) {
  const L = side(data.page) === 'left', wc = wordCount(data.body), long = wc > 220;
  const outerX = w => (L ? 47 : PAGE_W - 47 - w);
  return <PageRoot theme={theme} label="TextSubmission" seed={data.page % 4}>
    {long
      ? <><Portal theme={theme} x={outerX(84)} y={112} w={84} h={124} n={3} step={12} /><Sparkle theme={theme} x={outerX(84) + 42} y={100} s={12} /></>
      : <><Portal theme={theme} x={outerX(230)} y={430} w={230} h={440} n={4} step={20} /><Sparkle theme={theme} x={outerX(230) + 115} y={410} s={18} /><Sparkle theme={theme} x={outerX(230) + (L ? 250 : -20)} y={560} s={8} tone="accent2" /></>}
    {bar1('Essay', theme)}
    <div style={{ position: 'absolute', left: long && L ? 159 : 47, top: 118, width: long ? 584 : 696, display: 'flex', flexDirection: 'column', gap: 14, zIndex: 20 }}>
      <PieceTitle theme={theme} size={32} split>{data.page_title}</PieceTitle>
      <Byline theme={theme} contributor={data.contributor} />
    </div>
    <div style={{ position: 'absolute', left: long ? 47 : (L ? 743 - 420 : 47), top: 330, width: long ? 696 : 420, zIndex: 20 }}>
      <Body theme={theme} text={data.body} size={long ? 12 : 13.5} columns={long ? 2 : 1} gap={36} />
    </div>
    <Folio theme={theme} page={data.page} season={data.season} />
  </PageRoot>;
}

function TextSpread({ data, theme = THEME }) {
  const wc = wordCount(data.body), size = wc > 1000 ? 11.25 : 12;
  return <PageRoot theme={theme} w={SPREAD_W} label="TextSpread" seed={2}>
    {[0, 1, 2].map(i => <Wave key={i} theme={theme} x={873} y={128 + i * 38} r={14} n={23} a={64 - i * 18} tone={i === 1 ? 'accent' : 'accent2'} />)}
    <Sparkle theme={theme} x={1533} y={128 + 14} s={14} />
    <Sparkle theme={theme} x={873} y={128 + 90} s={8} tone="accent2" />
    <TopBar theme={theme} x0={47} x1={1533} left="Essay" right={<Wordmark theme={theme} size={9} weight={400} />} />
    <div style={{ position: 'absolute', left: 47, top: 118, width: 660, display: 'flex', flexDirection: 'column', gap: 14, zIndex: 20 }}>
      <PieceTitle theme={theme} size={34} split>{data.page_title}</PieceTitle>
      <Byline theme={theme} contributor={data.contributor} />
    </div>
    <div style={{ position: 'absolute', left: 47, top: 340, width: 1486, height: 640, overflow: 'hidden', zIndex: 20 }}>
      <Body theme={theme} text={data.body} size={size} columns={4} gap={80} style={{ height: 640 }} />
    </div>
    <Folio theme={theme} page={data.page} season={data.season} />
    <Folio theme={theme} page={data.page + 1} season={data.season} offset={PAGE_W} />
  </PageRoot>;
}

function PoetryPage({ data, theme = THEME }) {
  const L = side(data.page) === 'left';
  const stanzas = (data.body || '').split(/\n\s*\n/).map(s => s.split('\n'));
  const total = stanzas.reduce((a, s) => a + s.length, 0), two = total > 18;
  let cols = [stanzas];
  if (two) { let acc = 0, cut = 0, best = 1e9; stanzas.forEach((s, i) => { acc += s.length; const d = Math.abs(acc - total / 2); if (d < best) { best = d; cut = i + 1; } }); cols = [stanzas.slice(0, cut), stanzas.slice(cut)]; }
  const size = two ? 12.5 : 15, lh = two ? 1.8 : 1.9;
  const col = (ss, k) => <div key={k} style={{ fontFamily: theme.fonts.text, fontWeight: 300, fontSize: size, lineHeight: lh, color: theme.colors.ink }}>
    {ss.map((s, i) => <div key={i} style={{ marginBottom: i < ss.length - 1 ? `${lh}em` : 0 }}>{s.map((ln, j) => <div key={j} style={{ whiteSpace: 'pre' }}>{ln}</div>)}</div>)}
  </div>;
  const phases = [.85, .55, .25, 0, -.25, -.55, -.85];
  return <PageRoot theme={theme} label="PoetryPage" seed={(data.page + 1) % 4}>
    {two
      ? phases.map((p, i) => <Moon key={i} theme={theme} cx={(L ? 58 : 790 - 58 - 6 * 40) + i * 40} cy={912} d={22} phase={L ? -p : p} />)
      : phases.map((p, i) => <Moon key={i} theme={theme} cx={L ? 90 : 700} cy={340 + i * 88} d={32} phase={p} />)}
    {bar1('Poetry', theme)}
    <div style={{ position: 'absolute', left: 47, top: 118, width: 696, display: 'flex', flexDirection: 'column', gap: 14, zIndex: 20 }}>
      <PieceTitle theme={theme} size={30} split>{data.page_title}</PieceTitle>
      <Byline theme={theme} contributor={data.contributor} />
    </div>
    <div style={{ position: 'absolute', left: two ? 47 : (L ? 250 : 150), top: 300, width: two ? 696 : 440, display: 'flex', gap: 26, zIndex: 20 }}>
      {cols.map((c, k) => <div key={k} style={{ flex: 1, minWidth: 0 }}>{col(c, k)}</div>)}
    </div>
    <Folio theme={theme} page={data.page} season={data.season} />
  </PageRoot>;
}

function LetterWindow({ note, theme = THEME, w, x, y }) {
  const c = theme.colors;
  return <div style={{ position: x == null ? 'relative' : 'absolute', left: x, top: y, width: w, background: c.paper, boxShadow: `inset 0 0 0 1px ${alpha(c.ink, 34)}, 10px 10px 0 0 ${alpha(c.accent2, 20)}`, zIndex: 20 }}>
    <div style={{ height: 22, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, padding: '0 10px', background: c.deep, boxShadow: `inset 0 0 0 1px ${alpha(c.ink, 34)}` }}>
      <span style={{ fontFamily: theme.fonts.label, fontSize: 8.5, color: c.accent2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{note.subject ? `re: ${note.subject.toLowerCase()}` : ''}</span>
      <span style={{ display: 'flex', gap: 4, flex: 'none' }}>{[0, 1, 2].map(i => <span key={i} style={{ width: 7, height: 7, border: `1px solid ${alpha(c.ink, 55)}` }}></span>)}</span>
    </div>
    <div style={{ padding: '14px 16px 18px' }}>
      <div style={{ fontFamily: theme.fonts.label, fontSize: 9, letterSpacing: '.18em', textTransform: 'uppercase', color: c.accent, marginBottom: 8 }}>{note.sender_name}</div>
      <p style={{ fontFamily: theme.fonts.text, fontWeight: 300, fontSize: 12, lineHeight: 1.75, color: alpha(c.ink, 92), textWrap: 'pretty' }}>{clampWords(note.body, 90)}</p>
    </div>
  </div>;
}

function CommunicationsPage({ data, theme = THEME }) {
  const L = side(data.page) === 'left', N = (data.notes || []).slice(0, 4), n = N.length;
  const envX = L ? 47 : 743 - 104;
  const cells = n === 1 ? [{ x: L ? 743 - 520 : 47, y: 262, w: 520 }] : [0, 1, 2, 3].map(i => ({ x: 47 + (i % 2) * 360, y: 262 + Math.floor(i / 2) * 356, w: 336 }));
  const empty = n === 1 ? { x: L ? 47 : 600, y: 700 } : n === 3 ? { x: 47 + 360 + 100, y: 700 } : null;
  return <PageRoot theme={theme} label="CommunicationsPage" seed={data.page % 4}>
    <Envelope theme={theme} x={envX} y={124} w={104} h={68} />
    <Sparkle theme={theme} x={envX + (L ? 118 : -14)} y={118} s={12} />
    {empty && <><Checker theme={theme} x={empty.x} y={empty.y} w={120} h={72} cell={9} rotate={-8} /><Cursor theme={theme} x={empty.x + 96} y={empty.y + 46} s={32} /><Sparkle theme={theme} x={empty.x - 20} y={empty.y - 26} s={14} /></>}
    {bar1('Letters', theme)}
    <div style={{ position: 'absolute', left: L ? 175 : 47, top: 118, width: 540, display: 'flex', flexDirection: 'column', gap: 12, zIndex: 20 }}>
      <PieceTitle theme={theme} size={32} split>Letters</PieceTitle>
      {data.curator_name && <div style={{ fontFamily: theme.fonts.text, fontStyle: 'italic', fontWeight: 300, fontSize: 18, color: theme.colors.ink }}>for {data.curator_name}</div>}
    </div>
    {n === 1 ? <LetterWindow theme={theme} note={N[0]} {...cells[0]} /> : <div style={{ position: 'absolute', left: 47, top: 262, width: 720, display: 'flex', flexWrap: 'wrap', gap: '40px 24px', alignItems: 'flex-start', zIndex: 20 }}>{N.map((note, i) => <LetterWindow key={i} theme={theme} note={note} w={336} />)}</div>}
    <Folio theme={theme} page={data.page} season={data.season} />
  </PageRoot>;
}

Object.assign(window, { TextSubmission, TextSpread, PoetryPage, CommunicationsPage, LetterWindow });

const POEM12 = POEM.split(/\n\s*\n/).slice(0, 3).join('\n\n');
window.DUSK_STATES.push(
  ['TextSubmission — 500 words, page 7', TextSubmission, { page: 7, season: SEASON, page_title: 'Notes on Leaving the Lights On', contributor: { name: 'Noor Siddiqui', city: 'Karachi' }, body: essay(500) }],
  ['TextSubmission — 180 words, page 12', TextSubmission, { page: 12, season: SEASON, page_title: 'Glovebox', contributor: { name: 'Callum Reid' }, body: essay(180, 7) }],
  ['TextSpread — 520 words', TextSpread, { page: 40, season: SEASON, page_title: 'The Offline Hour', contributor: { name: 'Aoife Brennan', city: 'Galway' }, body: essay(520, 4) }],
  ['TextSpread — 1,200 words', TextSpread, { page: 40, season: SEASON, page_title: 'Night Desk: Three Summers on the Coast Road', contributor: { name: 'Lena Hoffmann', city: 'Hamburg' }, body: essay(1200) }],
  ['PoetryPage — 12 lines, page 6', PoetryPage, { page: 6, season: SEASON, page_title: 'Tidewater Radio', contributor: { name: 'Freya Holm', city: 'Bergen' }, body: POEM12 }],
  ['PoetryPage — 40 lines, page 9', PoetryPage, { page: 9, season: SEASON, page_title: 'Tidewater Radio (Long Wave)', contributor: { name: 'Freya Holm', city: 'Bergen' }, body: POEM }],
  ['CommunicationsPage — 1 note', CommunicationsPage, { page: 44, season: SEASON, curator_name: 'Rosa Albright', notes: LETTERS.slice(0, 1) }],
  ['CommunicationsPage — 4 notes, full length', CommunicationsPage, { page: 45, season: SEASON, curator_name: 'Rosa Albright', notes: LETTERS }],
);

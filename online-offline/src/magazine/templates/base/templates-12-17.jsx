// templates-12-17.jsx — Spread2, Spread4, Spread6, TextSpread, MusicPage, ColophonPage

// ─── 12. SPREAD 2 ─────────────────────────────────────────────────────────────
// Two-page spread for contributors who submitted exactly 2 images.
// Left: dark, two stacked full-bleed images. Right: paper, title + caption index.
function Spread2({ data={}, showAnnotations=false }) {
  const entries = data.entries || [];
  const contributor = data.contributor || {};
  const spreadW = AW * 2;
  const priH = Math.floor(AH * 0.58);
  const secH = AH - priH;
  // Index labels on a canvas edge sit 31px in (20px inside the trim); interior sides keep 10/12.
  const idxEdge = BLEED + SAFE_INSET + 4;

  return (
    <div style={{ width: spreadW, height: AH, position: 'relative', overflow: 'hidden', display: 'flex' }}>

      {/* ── SPREAD LEFT ── */}
      <div style={{ width: AW, height: AH, background: C.ground, position: 'relative', flexShrink: 0 }}>

        {/* Primary image — top ~58% */}
        <div style={{ position: 'absolute', top: 0, left: 0, width: AW, height: priH }}>
          <ImageFrame w={AW} h={priH} label={entries[0]?.title || 'primary image'} focal_x={entries[0]?.focal_x ?? 50} focal_y={entries[0]?.focal_y ?? 50} media_url={entries[0]?.media_url}/>
          <div style={{ position: 'absolute', bottom: 10, left: idxEdge, fontFamily: F.mono, fontSize: 12, color: C.gold, letterSpacing: '0.04em' }}>01</div>
          {showAnnotations && <Annotation label="entry[0] image" style={{ top: 8, left: 8 }}/>}
        </div>

        {/* 3px terra horizontal rule separator */}
        <div style={{ position: 'absolute', top: priH, left: 0, width: AW, height: 3, background: C.terra, zIndex: 2 }}/>

        {/* Secondary image — bottom ~42% */}
        <div style={{ position: 'absolute', top: priH + 3, left: 0, width: AW, height: secH - 3 }}>
          <ImageFrame w={AW} h={secH - 3} label={entries[1]?.title || 'secondary image'} focal_x={entries[1]?.focal_x ?? 50} focal_y={entries[1]?.focal_y ?? 50} media_url={entries[1]?.media_url}/>
          <div style={{ position: 'absolute', bottom: idxEdge, left: idxEdge, fontFamily: F.mono, fontSize: 12, color: C.gold, letterSpacing: '0.04em' }}>02</div>
          {showAnnotations && <Annotation label="entry[1] image" style={{ top: 8, left: 8 }}/>}
        </div>

        {/* Wordmark top-left */}
        <div style={{ position: 'absolute', top: BLEED + MT - 30, left: BLEED + ML, fontFamily: F.mono, fontSize: 8, letterSpacing: '0.10em', zIndex: 5 }}>
          <span style={{ color: 'rgba(224,90,40,0.7)' }}>online</span>
          <span style={{ color: C.terra }}>//</span>
          <span style={{ color: 'rgba(224,90,40,0.7)' }}>offline</span>
        </div>

        {/* Page number bottom-right */}
        <div style={{ position: 'absolute', bottom: BLEED + MB - 20, right: BLEED + MR, fontFamily: F.mono, fontSize: 8, color: C.gold, letterSpacing: '0.10em', zIndex: 5 }}>
          {data.page || 20}
        </div>

        <RegistrationMark side="left"/>
        <BleedMarks/>
        <GrainOverlay/>
      </div>

      {/* Gutter shadow */}
      <div className="gutter-shadow" style={{
        position: 'absolute', top: 0, left: AW - 5, width: 10, height: AH, zIndex: 10, pointerEvents: 'none',
        background: 'linear-gradient(to right, rgba(0,0,0,0.35) 0%, rgba(0,0,0,0.04) 50%, rgba(0,0,0,0.20) 100%)',
      }}/>

      {/* ── SPREAD RIGHT ── */}
      <div style={{ width: AW, height: AH, background: C.paper, position: 'relative', flexShrink: 0 }}>
        <div style={{ position: 'absolute', top: BLEED + MT, left: BLEED + ML, right: BLEED + MR }}>

          {/* Section mark */}
          <SectionMark>{data.type ? `${data.type} · ` : ''}Spread · {data.page || 20}</SectionMark>

          {/* Large title */}
          {data.page_title && (
            <div style={{
              fontFamily: F.serif, fontSize: 68, color: C.ground, lineHeight: 0.88,
              fontWeight: 400, letterSpacing: '-0.02em', marginTop: 10, marginBottom: 16,
            }}>
              {data.page_title}
            </div>
          )}

          {/* Thick rule */}
          <div style={{ height: 2, background: C.ground, width: '100%', marginBottom: 6 }}/>
          {/* Short gold rule */}
          <div style={{ width: 40, height: 1.5, background: C.gold, marginBottom: 22 }}/>

          {/* Contributor block */}
          <div style={{
            background: C.ground, height: 44,
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            paddingLeft: 12, paddingRight: 12,
            marginBottom: 20,
          }}>
            {contributor.name && (
              <span style={{ fontFamily: F.serif, fontSize: 15, color: C.paper }}>
                {contributor.name}
              </span>
            )}
            {contributor.city && (
              <span style={{ fontFamily: F.mono, fontSize: 8, color: C.paper4, letterSpacing: '0.10em', textTransform: 'uppercase' }}>
                {contributor.city}
              </span>
            )}
          </div>

          {/* Caption area — two indexed entries */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {entries.slice(0, 2).map((entry, i) => (
              <div key={i} style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                <span style={{ fontFamily: F.mono, fontSize: 12, color: C.gold, letterSpacing: '0.04em', flexShrink: 0, minWidth: 22 }}>
                  {String(i + 1).padStart(2, '0')}
                </span>
                <div>
                  {entry.title && (
                    <div style={{ fontFamily: F.serif, fontStyle: 'italic', fontSize: 10, color: C.ground, marginBottom: 3 }}>
                      {entry.title}
                    </div>
                  )}
                  {entry.caption && (
                    <div style={{ fontFamily: F.sans, fontSize: 9, color: C.paper4, lineHeight: 1.6 }}>
                      {entry.caption}
                    </div>
                  )}
                </div>
                {showAnnotations && i === 0 && <Annotation label="entry[0].title / caption" style={{ top: 0, right: 0 }}/>}
              </div>
            ))}
          </div>

        </div>

        {/* Folio — bottom right only */}
        <div style={{ position: 'absolute', bottom: BLEED + MB - 14, left: BLEED + ML, right: BLEED + MR, display: 'flex', justifyContent: 'flex-end' }}>
          <Folio page={(data.page || 20) + 1} side="right" season={data.season || 'Spring 2026'}/>
        </div>

        <RegistrationMark side="left"/>
        <RegistrationMark side="right"/>
        <BleedMarks dark={true}/>
        <GrainOverlay/>
      </div>
    </div>
  );
}

// ─── 13. SPREAD 4 ─────────────────────────────────────────────────────────────
// Two-page spread for contributors who submitted 3 or 4 images.
// Left: dark, 2×2 full-bleed image grid. Right: paper, title + 2×2 caption grid.
function Spread4({ data={}, showAnnotations=false }) {
  const entries = data.entries || [];
  const contributor = data.contributor || {};
  const spreadW = AW * 2;
  const gutter = 4;
  const cellW = Math.floor((AW - gutter) / 2);
  const cellH = Math.floor((AH - gutter) / 2);
  // Index labels on a canvas edge (left column, bottom row) sit 31px in (20px inside the trim); interior sides keep 8.
  const idxEdge = BLEED + SAFE_INSET + 4;

  return (
    <div style={{ width: spreadW, height: AH, position: 'relative', overflow: 'hidden', display: 'flex' }}>

      {/* ── SPREAD LEFT ── */}
      <div style={{ width: AW, height: AH, background: C.ground, position: 'relative', flexShrink: 0 }}>

        {/* 2×2 grid — full bleed */}
        <div style={{ position: 'absolute', top: 0, left: 0, width: AW, height: AH }}>
          {/* Row 1 */}
          <div style={{ display: 'flex', gap: gutter, marginBottom: gutter }}>
            {[0, 1].map(col => (
              <div key={col} style={{ position: 'relative', width: cellW, height: cellH, flexShrink: 0 }}>
                <ImageFrame w={cellW} h={cellH} label={entries[col]?.title || `image ${col + 1}`} focal_x={entries[col]?.focal_x ?? 50} focal_y={entries[col]?.focal_y ?? 50} media_url={entries[col]?.media_url}/>
                <div style={{ position: 'absolute', bottom: 8, left: col === 0 ? idxEdge : 8, fontFamily: F.mono, fontSize: 11, color: C.gold, letterSpacing: '0.04em' }}>
                  {String(col + 1).padStart(2, '0')}
                </div>
              </div>
            ))}
          </div>
          {/* Row 2 */}
          <div style={{ display: 'flex', gap: gutter }}>
            {[2, 3].map((idx, col) => (
              <div key={col} style={{ position: 'relative', width: cellW, height: cellH, flexShrink: 0 }}>
                <ImageFrame w={cellW} h={cellH} label={entries[idx]?.title || `image ${idx + 1}`} focal_x={entries[idx]?.focal_x ?? 50} focal_y={entries[idx]?.focal_y ?? 50} media_url={entries[idx]?.media_url}/>
                <div style={{ position: 'absolute', bottom: idxEdge, left: col === 0 ? idxEdge : 8, fontFamily: F.mono, fontSize: 11, color: C.gold, letterSpacing: '0.04em' }}>
                  {String(idx + 1).padStart(2, '0')}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Wordmark top-left */}
        <div style={{ position: 'absolute', top: BLEED + MT - 30, left: BLEED + ML, fontFamily: F.mono, fontSize: 8, letterSpacing: '0.10em', zIndex: 5 }}>
          <span style={{ color: 'rgba(224,90,40,0.7)' }}>online</span>
          <span style={{ color: C.terra }}>//</span>
          <span style={{ color: 'rgba(224,90,40,0.7)' }}>offline</span>
        </div>

        {/* Page number bottom-right */}
        <div style={{ position: 'absolute', bottom: BLEED + MB - 20, right: BLEED + MR, fontFamily: F.mono, fontSize: 8, color: C.gold, letterSpacing: '0.10em', zIndex: 5 }}>
          {data.page || 22}
        </div>

        <RegistrationMark side="left"/>
        <BleedMarks/>
        <GrainOverlay/>
        {showAnnotations && <Annotation label="2×2 image grid / entries[0..3]" style={{ top: BLEED + MT, left: BLEED + ML }}/>}
      </div>

      {/* Gutter shadow */}
      <div className="gutter-shadow" style={{
        position: 'absolute', top: 0, left: AW - 5, width: 10, height: AH, zIndex: 10, pointerEvents: 'none',
        background: 'linear-gradient(to right, rgba(0,0,0,0.35) 0%, rgba(0,0,0,0.04) 50%, rgba(0,0,0,0.20) 100%)',
      }}/>

      {/* ── SPREAD RIGHT ── */}
      <div style={{ width: AW, height: AH, background: C.paper, position: 'relative', flexShrink: 0 }}>
        <div style={{ position: 'absolute', top: BLEED + MT, left: BLEED + ML, right: BLEED + MR }}>

          {/* Section mark */}
          <SectionMark>{data.type ? `${data.type} · ` : ''}Spread · {data.page || 22}</SectionMark>

          {/* Large title */}
          {data.page_title && (
            <div style={{
              fontFamily: F.serif, fontSize: 60, color: C.ground, lineHeight: 0.88,
              fontWeight: 400, letterSpacing: '-0.02em', marginTop: 10, marginBottom: 16,
            }}>
              {data.page_title}
            </div>
          )}

          {/* Thick rule */}
          <div style={{ height: 2, background: C.ground, width: '100%', marginBottom: 6 }}/>
          {/* Short gold rule */}
          <div style={{ width: 40, height: 1.5, background: C.gold, marginBottom: 22 }}/>

          {/* Contributor block */}
          <div style={{
            background: C.ground, height: 44,
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            paddingLeft: 12, paddingRight: 12,
            marginBottom: 20,
          }}>
            {contributor.name && (
              <span style={{ fontFamily: F.serif, fontSize: 15, color: C.paper }}>
                {contributor.name}
              </span>
            )}
            {contributor.city && (
              <span style={{ fontFamily: F.mono, fontSize: 8, color: C.paper4, letterSpacing: '0.10em', textTransform: 'uppercase' }}>
                {contributor.city}
              </span>
            )}
          </div>

          {/* 2×2 caption grid matching image grid */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {[0, 1].map(row => (
              <div key={row} style={{ display: 'flex', gap: 16 }}>
                {[0, 1].map(col => {
                  const idx = row * 2 + col;
                  const entry = entries[idx];
                  return (
                    <div key={col} style={{ flex: 1 }}>
                      {entry ? (
                        <>
                          <div style={{ display: 'flex', gap: 8, alignItems: 'baseline', marginBottom: 3 }}>
                            <span style={{ fontFamily: F.mono, fontSize: 8, color: C.gold, letterSpacing: '0.08em', flexShrink: 0 }}>
                              {String(idx + 1).padStart(2, '0')}
                            </span>
                            <span style={{ fontFamily: F.serif, fontStyle: 'italic', fontSize: 9.5, color: C.ground }}>
                              {entry.title || ''}
                            </span>
                          </div>
                          <div style={{ fontFamily: F.sans, fontSize: 9, color: C.paper4, lineHeight: 1.55, paddingLeft: 16 }}>
                            {entry.caption || ''}
                          </div>
                        </>
                      ) : null}
                      {showAnnotations && idx === 0 && <Annotation label="entry[0].title / caption" style={{ top: 0, left: 0 }}/>}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>

        </div>

        {/* Folio — bottom right only */}
        <div style={{ position: 'absolute', bottom: BLEED + MB - 14, left: BLEED + ML, right: BLEED + MR, display: 'flex', justifyContent: 'flex-end' }}>
          <Folio page={(data.page || 22) + 1} side="right" season={data.season || 'Spring 2026'}/>
        </div>

        <RegistrationMark side="left"/>
        <RegistrationMark side="right"/>
        <BleedMarks dark={true}/>
        <GrainOverlay/>
      </div>
    </div>
  );
}

// ─── 14. SPREAD 6 ─────────────────────────────────────────────────────────────
// Two-page spread for contributors who submitted 5–8 images.
// Both pages: continuous dark surface, image grid across both pages, caption strip at bottom.
function Spread6({ data={}, showAnnotations=false }) {
  const entries = data.entries || [];
  const contributor = data.contributor || {};
  const spreadW = AW * 2;
  const captionH = 120;
  const imgAreaH = AH - captionH;
  const cols = 3;
  const gutter = 4;
  const cellW = Math.floor((AW - gutter * (cols - 1)) / cols);
  // floor() leaves 2px: 3×260 + 2×4 = 788 < AW. The last cell takes the remainder so the
  // grid reaches the canvas edge on both pages (no bare-ground sliver at the spine).
  const lastW = AW - (cellW + gutter) * (cols - 1);
  // Index labels on a canvas edge (first cell of each page) sit 31px in (20px inside the trim).
  const idxEdge = BLEED + SAFE_INSET + 4;

  return (
    <div style={{ width: spreadW, height: AH, position: 'relative', overflow: 'hidden', display: 'flex' }}>

      {/* ── SPREAD LEFT ── */}
      <div style={{ width: AW, height: AH, background: C.ground, position: 'relative', flexShrink: 0 }}>

        {/* Left 3 images */}
        <div style={{ position: 'absolute', top: 0, left: 0, width: AW, height: imgAreaH, display: 'flex', gap: gutter }}>
          {entries.slice(0, 3).map((entry, i) => (
            <div key={i} style={{ position: 'relative', width: i === cols - 1 ? lastW : cellW, height: imgAreaH, flexShrink: 0 }}>
              <ImageFrame w={i === cols - 1 ? lastW : cellW} h={imgAreaH} label={entry.title || `image ${i + 1}`} focal_x={entry.focal_x ?? 50} focal_y={entry.focal_y ?? 50} media_url={entry.media_url}/>
              <div style={{ position: 'absolute', bottom: 10, left: i === 0 ? idxEdge : 8, fontFamily: F.mono, fontSize: 11, color: C.gold, letterSpacing: '0.04em' }}>
                {String(i + 1).padStart(2, '0')}
              </div>
            </div>
          ))}
        </div>

        {/* Caption strip — bottom of left page */}
        <div style={{
          position: 'absolute', bottom: 0, left: 0, width: AW, height: captionH,
          background: C.ground,
          borderTop: '1px solid rgba(240,235,226,0.10)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          paddingLeft: BLEED + ML, paddingRight: BLEED + MR,
          boxSizing: 'border-box',
        }}>
          <div style={{ fontFamily: F.mono, fontSize: 8, letterSpacing: '0.10em' }}>
            <span style={{ color: 'rgba(224,90,40,0.5)' }}>online</span>
            <span style={{ color: 'rgba(224,90,40,0.6)' }}>//</span>
            <span style={{ color: 'rgba(224,90,40,0.5)' }}>offline</span>
          </div>
          <div style={{ fontFamily: F.mono, fontSize: 8, color: C.gold, letterSpacing: '0.10em' }}>
            {data.page || 24}
          </div>
        </div>

        <RegistrationMark side="left"/>
        <BleedMarks/>
        <GrainOverlay/>
        {showAnnotations && <Annotation label="entries[0..2] — left 3 images" style={{ top: BLEED + 8, left: BLEED + 8 }}/>}
      </div>

      {/* Gutter shadow */}
      <div className="gutter-shadow" style={{
        position: 'absolute', top: 0, left: AW - 5, width: 10, height: AH, zIndex: 10, pointerEvents: 'none',
        background: 'linear-gradient(to right, rgba(0,0,0,0.35) 0%, rgba(0,0,0,0.04) 50%, rgba(0,0,0,0.20) 100%)',
      }}/>

      {/* ── SPREAD RIGHT ── */}
      <div style={{ width: AW, height: AH, background: C.ground, position: 'relative', flexShrink: 0 }}>

        {/* Right 3 images */}
        <div style={{ position: 'absolute', top: 0, left: 0, width: AW, height: imgAreaH, display: 'flex', gap: gutter }}>
          {entries.slice(3, 6).map((entry, i) => (
            <div key={i} style={{ position: 'relative', width: i === cols - 1 ? lastW : cellW, height: imgAreaH, flexShrink: 0 }}>
              <ImageFrame w={i === cols - 1 ? lastW : cellW} h={imgAreaH} label={entry.title || `image ${i + 4}`} focal_x={entry.focal_x ?? 50} focal_y={entry.focal_y ?? 50} media_url={entry.media_url}/>
              <div style={{ position: 'absolute', bottom: 10, left: i === 0 ? idxEdge : 8, fontFamily: F.mono, fontSize: 11, color: C.gold, letterSpacing: '0.04em' }}>
                {String(i + 4).padStart(2, '0')}
              </div>
            </div>
          ))}
        </div>

        {/* Caption strip — bottom of right page */}
        <div style={{
          position: 'absolute', bottom: 0, left: 0, width: AW, height: captionH,
          background: C.ground,
          borderTop: '1px solid rgba(240,235,226,0.10)',
          paddingLeft: BLEED + ML, paddingRight: BLEED + MR,
          paddingTop: 18, paddingBottom: 14,
          boxSizing: 'border-box',
        }}>
          <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 8 }}>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
              {contributor.name && (
                <span style={{ fontFamily: F.mono, fontSize: 8, color: C.terra, letterSpacing: '0.10em' }}>
                  {contributor.name}
                </span>
              )}
              {contributor.city && (
                <span style={{ fontFamily: F.mono, fontSize: 7, color: C.paper4, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                  {contributor.city}
                </span>
              )}
            </div>
            {data.page_title ? (
              <div style={{ fontFamily: F.serif, fontStyle: 'italic', fontSize: 14, color: C.paper2, letterSpacing: '-0.01em' }}>
                {data.page_title}
              </div>
            ) : <div/>}
            <GoldMark>{data.season || 'Spring 2026'}</GoldMark>
          </div>

          <div style={{ fontFamily: F.mono, fontSize: 7.5, color: C.paper4, letterSpacing: '0.06em', marginBottom: 10, lineHeight: 1.4 }}>
            {entries.map((entry, i) => (
              <span key={i}>
                {i > 0 && <span style={{ color: C.paper5, margin: '0 5px' }}>·</span>}
                <span style={{ color: C.gold, marginRight: 3 }}>{String(i + 1).padStart(2, '0')}</span>
                {entry.title || ''}
              </span>
            ))}
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <Folio page={(data.page || 24) + 1} side="right" dark={true} season={data.season || 'Spring 2026'}/>
          </div>
        </div>

        <RegistrationMark side="left"/>
        <RegistrationMark side="right"/>
        <BleedMarks/>
        <GrainOverlay/>
        {showAnnotations && <Annotation label="entries[3..5] — right 3 images" style={{ top: BLEED + 8, left: BLEED + 8 }}/>}
      </div>
    </div>
  );
}

// Text-zone overflow TRIPWIRE — not a design element. The essay flow has a fixed height and overflow hidden;
// if the body does not fit, a terra "text continues" bar is drawn at the bottom of the zone so it is SEEN in
// review, never a silent clip. It can only fire if the app's 800-word essay cap fails upstream: TextSpread holds
// ~1,291 words (it gets 501–800 from the app) and TextSubmission ~599 (selection sends it ≤500).
// Re-measures after webfonts load (the generator waits for networkidle0 + fonts.ready before the screenshot).
// TextSubmission (templates-5-8.jsx) carries its own copy: each base file is loaded alone on a page.
function useOverflowFlag(ref) {
  const [over, setOver] = React.useState(false);
  React.useLayoutEffect(() => {
    const check = () => { const el = ref.current; if (el) setOver(el.scrollHeight > el.clientHeight + 1 || el.scrollWidth > el.clientWidth + 1); };
    check();
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(check);
  }, []);
  return over;
}
function OverflowFlag() {
  return (
    <div style={{ position:'absolute', left:0, right:0, bottom:0, height:14, background:C.terra, display:'flex', alignItems:'center', justifyContent:'center', fontFamily:F.mono, fontSize:8, lineHeight:'9px', letterSpacing:'0.14em', textTransform:'uppercase', color:C.paper, zIndex:5 }}>
      Text continues — this essay does not fit the page
    </div>
  );
}

// ─── 15. TEXT SPREAD ──────────────────────────────────────────────────────────
// Two-page spread for long text submissions (essays over 500 words).
// One text flow across both pages: hero title + drop cap opening on the left, body continues on the right.
function TextSpread({ data={}, showAnnotations=false }) {
  const contributor = data.contributor || {};
  const spreadW = AW * 2;
  const season = data.season || 'Spring 2026';
  const page = data.page || 26;
  // Every paragraph of the essay renders (split on blank lines); there is no sample copy.
  const paras = (data.body || '').split(/\n\s*\n/).map(p => p.trim()).filter(Boolean);
  const wordCount = data.word_count || (data.body || '').trim().split(/\s+/).filter(Boolean).length;
  const bodyRef = React.useRef(null);
  const overflow = useOverflowFlag(bodyRef);
  // Two columns, each exactly one page's live area (LIVEW 652). The gap is the two inside margins
  // (MR + BLEED + BLEED + ML = 138px), so no body text ever crosses the gutter. The header sits at the top of
  // column 1 and the essay continues at the top of column 2 (column-fill auto = sequential, not balanced).
  // The zone ends 10px above the folio line box, as on TextSubmission.
  const zoneTop = BLEED + MT;
  const zoneBottom = AH - ((BLEED + MB - 14) + 10 + 10);
  const sep = <span style={{ width: 0.5, height: 10, background: C.paper5, display: 'inline-block', margin: '0 8px', verticalAlign: 'middle' }}/>;

  return (
    <div style={{ width: spreadW, height: AH, position: 'relative', overflow: 'hidden', display: 'flex' }}>

      {/* ── TEXT SPREAD LEFT ── */}
      <div style={{ width: AW, height: AH, background: C.paper, position: 'relative', flexShrink: 0 }}>
        <VerticalContributorLabel name={contributor.name} type={data.type} issue={season}/>
        <div style={{ position: 'absolute', bottom: BLEED + MB - 14, left: BLEED + ML, right: BLEED + MR, display: 'flex', justifyContent: 'space-between' }}>
          <Folio page={page} side="left" season={season}/>
          <Folio page={page} side="right" season={season}/>
        </div>
        <RegistrationMark side="left"/>
        <BleedMarks dark={true}/>
        <GrainOverlay/>
      </div>

      {/* Gutter shadow */}
      <div className="gutter-shadow" style={{
        position: 'absolute', top: 0, left: AW - 5, width: 10, height: AH, zIndex: 10, pointerEvents: 'none',
        background: 'linear-gradient(to right, rgba(0,0,0,0.12) 0%, rgba(0,0,0,0.02) 50%, rgba(0,0,0,0.08) 100%)',
      }}/>

      {/* ── TEXT SPREAD RIGHT ── */}
      <div style={{ width: AW, height: AH, background: C.paper, position: 'relative', flexShrink: 0 }}>
        <VerticalContributorLabel name={contributor.name} type={data.type} issue={season}/>
        <div style={{ position: 'absolute', bottom: BLEED + MB - 14, left: BLEED + ML, right: BLEED + MR, display: 'flex', justifyContent: 'space-between' }}>
          <Folio page={page + 1} side="left" season={season}/>
          <Folio page={page + 1} side="right" season={season}/>
        </div>
        <RegistrationMark side="left"/>
        <RegistrationMark side="right"/>
        <BleedMarks dark={true}/>
        <GrainOverlay/>
      </div>

      {/* ── TEXT FLOW (both pages) ── */}
      <div ref={bodyRef} style={{
        position: 'absolute', top: zoneTop, left: BLEED + ML, width: AW + LIVEW, height: zoneBottom - zoneTop,
        columnCount: 2, columnGap: (MR + BLEED) + (BLEED + ML), columnFill: 'auto', overflow: 'hidden', zIndex: 2,
      }}>
        <DoubleRule/>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 8, marginBottom: 14 }}>
          {data.type && <SectionMark>{data.type}</SectionMark>}
          <GoldMark>{season}</GoldMark>
        </div>

        {data.page_title && (
          <div style={{
            fontFamily: F.serif, fontStyle: 'italic', fontSize: 76, color: C.ground,
            lineHeight: 0.88, letterSpacing: '-0.02em', marginBottom: 16,
          }}>
            {data.page_title}
          </div>
        )}

        <div style={{ display: 'flex', alignItems: 'center', marginBottom: 12 }}>
          <div style={{ width: 28, height: 1.5, background: C.terra, flexShrink: 0 }}/>
          <div style={{ flex: 1, height: 0.5, background: C.paper5 }}/>
        </div>

        {/* Contributor meta — an empty field drops out with its separator */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 0, marginBottom: 18, flexWrap: 'wrap' }}>
          {contributor.name && (
            <span style={{ fontFamily: F.mono, fontSize: 8.5, color: C.terra, letterSpacing: '0.10em', textTransform: 'uppercase' }}>
              {contributor.name}
            </span>
          )}
          {contributor.city && <>
            {contributor.name && sep}
            <span style={{ fontFamily: F.mono, fontSize: 7.5, color: C.paper4, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
              {contributor.city}
            </span>
          </>}
          {wordCount > 0 && <>
            {(contributor.name || contributor.city) && sep}
            <span style={{ fontFamily: F.mono, fontSize: 8, color: C.paper4, letterSpacing: '0.08em' }}>
              {wordCount} words
            </span>
          </>}
          {(contributor.name || contributor.city || wordCount > 0) && sep}
          <span style={{ fontFamily: F.mono, fontSize: 8, color: C.paper4, letterSpacing: '0.08em' }}>
            {season}
          </span>
        </div>

        <div style={{ fontFamily: F.serif, fontSize: 12.5, lineHeight: 1.88, color: C.ground }}>
          {paras.map((p, i) => (
            <p key={i} style={{ margin: 0, marginBottom: i < paras.length - 1 ? 10 : 0, clear: i === 1 ? 'left' : undefined }}>
              {i === 0 && (
                <span style={{
                  float: 'left', fontSize: 70, lineHeight: 0.78, fontFamily: F.serif,
                  color: C.ground, marginRight: 6, marginTop: 6, marginBottom: 0,
                }}>
                  {p[0]}
                </span>
              )}
              {i === 0 ? p.slice(1) : p}
            </p>
          ))}
        </div>

        {showAnnotations && (
          <>
            <Annotation label="content.page_title" style={{ top: 36, left: 0 }}/>
            <Annotation label="contributor.name / city / word_count" style={{ top: 190, left: 0 }}/>
            <Annotation label="body (all paragraphs) + drop cap" style={{ top: 230, left: 0 }}/>
          </>
        )}
      </div>
      {overflow && (
        <div style={{ position: 'absolute', left: AW + BLEED + ML, width: LIVEW, top: zoneBottom - 14, height: 14, zIndex: 3 }}>
          <OverflowFlag/>
        </div>
      )}
    </div>
  );
}

// ─── 16. MUSIC PAGE ───────────────────────────────────────────────────────────
// Single page for music submissions. Dark background.
// Left zone: large display text + contributor info. Right zone: QR placeholder + scan prompt.
function MusicPage({ data={}, showAnnotations=false }) {
  const contributor = data.contributor || { name: 'S. Müller', city: 'Berlin' };
  const entry = (data.entries || [{}])[0] || {};
  const caption = entry.caption || 'Field recordings made at Westhafen over three consecutive mornings. The container ships were loading. This is what the water sounded like before the city woke up.';
  const listenUrl = data.listen_url || 'onlineoffline.fm/s.muller';
  const divX = Math.floor(AW * 0.55);

  const qrSize = 120;
  const moduleCount = 21;
  const moduleSize = qrSize / moduleCount;

  const finderPattern = (ox, oy) => {
    const rects = [];
    for (let x = 0; x < 7; x++) {
      for (let y = 0; y < 7; y++) {
        const onEdge = x === 0 || x === 6 || y === 0 || y === 6;
        const inner = x >= 2 && x <= 4 && y >= 2 && y <= 4;
        if (onEdge || inner) {
          rects.push(<rect key={`${ox}-${oy}-${x}-${y}`} x={(ox + x) * moduleSize} y={(oy + y) * moduleSize} width={moduleSize - 0.5} height={moduleSize - 0.5} fill={C.paper}/>);
        }
      }
    }
    return rects;
  };

  const dataBits = [
    [9,0],[10,0],[12,0],[14,0],[16,0],[18,0],[20,0],
    [9,1],[11,1],[13,1],[15,1],[17,1],[19,1],
    [9,2],[10,2],[13,2],[15,2],[17,2],[20,2],
    [9,3],[12,3],[14,3],[16,3],[18,3],[20,3],
    [0,9],[2,9],[4,9],[6,9],[8,9],[10,9],[12,9],[14,9],[16,9],[18,9],[20,9],
    [1,10],[3,10],[5,10],[7,10],[9,10],[11,10],[13,10],[15,10],[17,10],[19,10],
    [0,11],[2,11],[4,11],[8,11],[10,11],[12,11],[14,11],[16,11],[18,11],[20,11],
    [1,12],[3,12],[6,12],[9,12],[11,12],[13,12],[15,12],[17,12],[19,12],
    [9,7],[11,7],[13,7],[15,7],[17,7],[19,7],
    [10,8],[12,8],[14,8],[16,8],[18,8],[20,8],
  ];

  return (
    <div style={{ width: AW, height: AH, background: C.ground, position: 'relative', overflow: 'hidden' }}>

      <VerticalContributorLabel
        name={contributor.name || 'Contributor Name'}
        type={data.type || 'Music'}
        issue={data.season || 'Spring 2026'}
      />

      {/* "Listen" watermark */}
      <div style={{
        position: 'absolute', top: '50%', left: BLEED + ML + 10,
        transform: 'translateY(-50%)',
        fontFamily: F.serif, fontStyle: 'italic', fontSize: 80,
        color: C.paper, opacity: 0.15, letterSpacing: '-0.02em',
        pointerEvents: 'none', zIndex: 1, userSelect: 'none',
      }}>
        Listen
      </div>

      {/* Terra vertical rule — divider */}
      <div style={{ position: 'absolute', top: 0, left: divX, width: 2, height: AH, background: C.terra, zIndex: 3 }}/>

      {/* ── LEFT ZONE ── */}
      <div style={{
        position: 'absolute', top: 0, left: BLEED + ML, width: divX - BLEED - ML - 16,
        height: AH, display: 'flex', flexDirection: 'column', justifyContent: 'center', zIndex: 2,
      }}>
        <div style={{ position: 'absolute', top: BLEED + MT, left: 0 }}>
          <SectionMark>Music</SectionMark>
        </div>

        <div style={{ fontFamily: F.serif, fontSize: 32, color: C.paper, lineHeight: 1.1, marginBottom: 6 }}>
          {contributor.name || 'Contributor Name'}
        </div>
        <div style={{ fontFamily: F.mono, fontSize: 10, color: C.paper4, letterSpacing: '0.10em', textTransform: 'uppercase', marginBottom: 14 }}>
          {contributor.city || 'City'}
        </div>
        <div style={{ width: 40, height: 1.5, background: C.gold, marginBottom: 16 }}/>
        <div style={{
          fontFamily: F.serif, fontStyle: 'italic', fontSize: 48, color: C.paper,
          lineHeight: 1.0, letterSpacing: '-0.02em', marginBottom: 18,
          maxWidth: divX - BLEED - ML - 24,
        }}>
          {data.page_title || 'Harbour Recordings'}
        </div>
        <div style={{ fontFamily: F.sans, fontWeight: 300, fontSize: 12, color: C.paper3, lineHeight: 1.7, maxWidth: 280 }}>
          {caption}
        </div>

        {showAnnotations && (
          <>
            <Annotation label="contributor.name" style={{ top: 0, left: 0 }}/>
            <Annotation label="page_title" style={{ top: 80, left: 0 }}/>
            <Annotation label="entries[0].caption" style={{ top: 160, left: 0 }}/>
          </>
        )}
      </div>

      {/* ── RIGHT ZONE ── */}
      <div style={{
        position: 'absolute', left: divX + 2, right: 0, top: 0, height: AH,
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        gap: 12, zIndex: 2, paddingRight: BLEED + MR,
      }}>
        <div style={{ width: qrSize, height: qrSize, background: C.ground3, padding: 8, boxSizing: 'border-box', position: 'relative' }}>
          <svg width={qrSize - 16} height={qrSize - 16} viewBox={`0 0 ${qrSize} ${qrSize}`} style={{ display: 'block' }}>
            {finderPattern(0, 0)}
            {finderPattern(14, 0)}
            {finderPattern(0, 14)}
            {dataBits.map(([x, y], i) => (
              <rect key={i} x={x * moduleSize} y={y * moduleSize} width={moduleSize - 0.5} height={moduleSize - 0.5} fill={C.paper}/>
            ))}
            {[8,10,12].map(i => (
              <rect key={`th-${i}`} x={i * moduleSize} y={6 * moduleSize} width={moduleSize - 0.5} height={moduleSize - 0.5} fill={C.paper}/>
            ))}
            {[8,10,12].map(i => (
              <rect key={`tv-${i}`} x={6 * moduleSize} y={i * moduleSize} width={moduleSize - 0.5} height={moduleSize - 0.5} fill={C.paper}/>
            ))}
          </svg>
        </div>

        <div style={{ fontFamily: F.mono, fontSize: 8, color: C.paper4, textTransform: 'uppercase', letterSpacing: '0.14em', textAlign: 'center' }}>
          Scan to listen
        </div>
        <div style={{ fontFamily: F.mono, fontSize: 7.5, color: C.terra, letterSpacing: '0.08em', textAlign: 'center' }}>
          {listenUrl}
        </div>
        <GoldMark>{data.season || 'Spring 2026'}</GoldMark>

        {showAnnotations && <Annotation label="listen_url / QR placeholder" style={{ bottom: 20, right: 0 }}/>}
      </div>

      <div style={{ position: 'absolute', bottom: BLEED + MB - 14, left: BLEED + ML, right: BLEED + MR, display: 'flex', justifyContent: 'flex-end' }}>
        <Folio page={data.page || 28} side="right" dark={true} season={data.season || 'Spring 2026'}/>
      </div>

      <RegistrationMark side="left"/>
      <RegistrationMark side="right"/>
      <BleedMarks/>
      <GrainOverlay/>
    </div>
  );
}

// ─── 17. COLOPHON PAGE ────────────────────────────────────────────────────────
// Back matter page. Dark background. Publication info, contributor credits, print info.
function ColophonPage({ data={}, showAnnotations=false }) {
  const contributors = data.contributors || [];
  const season = data.season || 'Spring 2026';
  const printer = data.printer || 'Magcloud';
  const editionNumber = data.edition_number || 1;
  const editionTotal = data.edition_total || 1;

  const topH = 148;
  const colW = Math.floor(LIVEW / 2) - 12;

  return (
    <div style={{ width: AW, height: AH, background: C.ground, position: 'relative', overflow: 'hidden' }}>

      <div style={{ position: 'absolute', top: BLEED + MT, left: BLEED + ML, right: BLEED + MR }}>
        <div style={{ marginBottom: 10 }}>
          <span style={{ fontFamily: F.serif, fontSize: 48, color: C.paper, letterSpacing: '-0.02em' }}>online</span>
          <span style={{ fontFamily: F.serif, fontSize: 48, color: C.terra, letterSpacing: '-0.01em' }}>//</span>
          <span style={{ fontFamily: F.serif, fontSize: 48, color: C.paper, letterSpacing: '-0.02em' }}>offline</span>
        </div>
        <div style={{ fontFamily: F.sans, fontWeight: 300, fontSize: 28, color: C.paper3, textTransform: 'uppercase', letterSpacing: '0.18em', lineHeight: 1, marginBottom: 16 }}>
          {season}
        </div>
        <div style={{ height: 1, background: C.gold, width: '100%' }}/>
        {showAnnotations && <Annotation label="season" style={{ top: 54, left: 0 }}/>}
      </div>

      <div style={{
        position: 'absolute', top: BLEED + MT + topH, left: BLEED + ML, right: BLEED + MR,
        bottom: BLEED + MB + 44, display: 'flex', gap: 0,
      }}>
        {/* Left column — Contributors */}
        <div style={{ width: colW, flexShrink: 0, paddingRight: 12 }}>
          <div style={{ fontFamily: F.mono, fontSize: 8, color: C.terra, textTransform: 'uppercase', letterSpacing: '0.16em', marginBottom: 6 }}>
            Contributors
          </div>
          <div style={{ width: '100%', height: 1, background: C.gold, marginBottom: 12 }}/>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
            {contributors.filter(c => c.name || c.city).map((c, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'baseline', gap: 0 }}>
                {c.name && <span style={{ fontFamily: F.serif, fontSize: 13, color: C.paper2, lineHeight: 1.3 }}>{c.name}</span>}
                {c.name && c.city && <span style={{ fontFamily: F.mono, fontSize: 8, color: C.paper5, margin: '0 6px' }}>—</span>}
                {c.city && <span style={{ fontFamily: F.mono, fontSize: 7.5, color: C.paper4, letterSpacing: '0.08em' }}>{c.city}</span>}
              </div>
            ))}
          </div>
          {showAnnotations && <Annotation label="contributors[] name + city" style={{ top: 60, left: 0 }}/>}
        </div>

        {/* Center vertical rule */}
        <div style={{ width: 0.5, background: C.paper5, flexShrink: 0, margin: '0 12px' }}/>

        {/* Right column — About */}
        <div style={{ flex: 1 }}>
          <div style={{ fontFamily: F.mono, fontSize: 8, color: C.terra, textTransform: 'uppercase', letterSpacing: '0.16em', marginBottom: 6 }}>
            About
          </div>
          <div style={{ width: '100%', height: 1, background: C.gold, marginBottom: 12 }}/>
          <div style={{ fontFamily: F.serif, fontStyle: 'italic', fontSize: 11, color: C.paper3, lineHeight: 1.75, marginBottom: 18 }}>
            online//offline is a slowcial media platform — a curated, modular, printed social magazine made quarterly, one per curator, from contributed creative work. Contributors submit photography, art, poetry, essays, and music. Curators select what goes into their personalized printed edition. The physical magazine is the product.
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <div style={{ fontFamily: F.mono, fontSize: 8, color: C.paper5, letterSpacing: '0.06em' }}>Printed by {printer}</div>
            <div style={{ fontFamily: F.mono, fontSize: 8, color: C.paper5, letterSpacing: '0.06em' }}>Edition {editionNumber} of {editionTotal}</div>
            <div style={{ fontFamily: F.mono, fontSize: 8, color: C.paper5, letterSpacing: '0.06em' }}>{season}</div>
          </div>
          {showAnnotations && <Annotation label="printer / edition_number / edition_total" style={{ bottom: 0, right: 0 }}/>}
        </div>
      </div>

      <div style={{ position: 'absolute', bottom: BLEED + MB, left: BLEED + ML, right: BLEED + MR }}>
        <div style={{ height: 0.5, background: C.paper5, marginBottom: 10 }}/>
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 0, marginBottom: 4 }}>
          <span style={{ fontFamily: F.mono, fontSize: 9, color: C.paper5, letterSpacing: '0.10em' }}>online</span>
          <span style={{ fontFamily: F.mono, fontSize: 9, color: C.terra, letterSpacing: '0.04em' }}>//</span>
          <span style={{ fontFamily: F.mono, fontSize: 9, color: C.paper5, letterSpacing: '0.10em' }}>offline</span>
          <span style={{ fontFamily: F.mono, fontSize: 8, color: C.paper5, margin: '0 10px' }}>·</span>
          <span style={{ fontFamily: F.mono, fontSize: 8, color: C.paper5, letterSpacing: '0.08em' }}>{season}</span>
          <span style={{ fontFamily: F.mono, fontSize: 8, color: C.paper5, margin: '0 10px' }}>·</span>
          <span style={{ fontFamily: F.mono, fontSize: 8, color: C.paper5, letterSpacing: '0.08em' }}>All rights reserved.</span>
        </div>
      </div>

      <RegistrationMark side="left"/>
      <RegistrationMark side="right"/>
      <BleedMarks/>
      <GrainOverlay/>
    </div>
  );
}

Object.assign(window, { Spread2, Spread4, Spread6, TextSpread, MusicPage, ColophonPage });

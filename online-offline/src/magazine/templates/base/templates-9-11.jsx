// templates-9-11.jsx — CommunicationsPage, Spread, CampaignPage

// ─── 9. COMMUNICATIONS PAGE ───────────────────────────────────────────────────
function CommunicationsPage({ data={}, showAnnotations=false }) {
  // Letters are excerpted, never overflowed: each card shows at most EXCERPT_WORDS words of the
  // note, cut at a word boundary with a visible "…". A 410px card holds ~230 words under a two-line
  // subject (measured, real fonts), so 200 prints most notes whole (the app caps notes at 250).
  // The generator fetches at most 4 notes (newest first); the slice is a backstop. Card height is
  // derived from the zone between the grid top and 10px above the folio: two rows, 14px gap.
  const EXCERPT_WORDS = 200;
  const excerpt = (text) => {
    const words = (text || '').trim().split(/\s+/).filter(Boolean);
    if (words.length <= EXCERPT_WORDS) return words.join(' ');
    return words.slice(0, EXCERPT_WORDS).join(' ').replace(/[,;:.\u2014\u2013-]+$/, '') + '\u2026';
  };
  const messages = (data.messages || []).slice(0, 4);
  const gridTop = BLEED + MT + 80;
  const zoneBottom = AH - (BLEED + MB - 14) - 10 - 10;
  const rowGap = 14;
  const cardH = Math.floor((zoneBottom - gridTop - rowGap) / 2);

  return (
    <div style={{ width:AW, height:AH, background:C.paper, position:'relative', overflow:'hidden' }}>
      {/* Header */}
      <div style={{ position:'absolute', top:BLEED+MT, left:BLEED+ML, right:BLEED+MR }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:6 }}>
          <SectionMark>Dispatches</SectionMark>
          <GoldMark>From the contributors</GoldMark>
        </div>
        <DoubleRule/>
        <div style={{
          fontFamily:F.serif, fontStyle:'italic', fontSize:13, color:C.paper3,
          lineHeight:1.55, marginTop:10, marginBottom:14,
        }}>
          Notes and messages to curators — closing weeks of the quarter.
        </div>
      </div>

      {/* 2-column message grid */}
      <div style={{
        position:'absolute',
        top:gridTop,
        left:BLEED+ML, right:BLEED+MR,
        display:'grid',
        gridTemplateColumns:'1fr 1fr',
        gridAutoRows:cardH,
        gap:`${rowGap}px 20px`,
      }}>
        {messages.map((msg, i) => (
          <div key={i} style={{
            borderTop:`0.5px solid ${C.paper5}`,
            paddingTop:10, height:cardH, overflow:'hidden', boxSizing:'border-box', minWidth:0,
          }}>
            <div style={{ fontFamily:F.mono, fontSize:7.5, color:C.terra, textTransform:'uppercase', letterSpacing:'0.14em', marginBottom:4 }}>
              From
            </div>
            {msg.from?.name && (
              <div style={{ fontFamily:F.serif, fontSize:14, color:C.ground, lineHeight:1.1, marginBottom:4 }}>
                {msg.from.name}
              </div>
            )}
            {msg.subject && (
              <div style={{ fontFamily:F.serif, fontStyle:'italic', fontSize:10, color:C.paper3, lineHeight:1.3, marginBottom:4 }}>
                {msg.subject}
              </div>
            )}
            <div style={{ fontFamily:F.mono, fontSize:7.5, color:C.paper4, letterSpacing:'0.08em', marginBottom:8 }}>
              {[msg.date, msg.to?.name ? `To: ${msg.to.name}` : ''].filter(Boolean).join(' — ')}
            </div>
            <div style={{ fontFamily:F.serif, fontStyle:'italic', fontSize:11.5, lineHeight:1.82, color:C.ground }}>
              {excerpt(msg.body)}
            </div>
            {showAnnotations && i===0 && (
              <>
                <Annotation label="contributor.name" style={{ top:24, left:0 }}/>
                <Annotation label="message date / recipient" style={{ top:40, left:0 }}/>
                <Annotation label="message body" style={{ top:56, left:0 }}/>
              </>
            )}
          </div>
        ))}
      </div>

      {/* Folio */}
      <div style={{ position:'absolute', bottom:BLEED+MB-14, left:BLEED+ML, right:BLEED+MR, display:'flex', justifyContent:'space-between' }}>
        <Folio page={data.page||16} side="left" season={data.season||'Spring 2026'}/>
        <Folio page={data.page||16} side="right" season={data.season||'Spring 2026'}/>
      </div>

      <RegistrationMark side="left"/>
      <RegistrationMark side="right"/>
      <BleedMarks dark={true}/>
      <GrainOverlay/>
    </div>
  );
}

// ─── 10. SPREAD (LEFT + RIGHT) ────────────────────────────────────────────────
function Spread({ data={}, showAnnotations=false }) {
  const entry = (data.entries||[{}])[0]||{};
  const contributor = data.contributor||{};
  const spreadW = AW * 2;
  const season = data.season || 'Spring 2026';

  return (
    <div style={{ width:spreadW, height:AH, position:'relative', overflow:'hidden', display:'flex' }}>
      {/* ── SPREAD LEFT ── */}
      <div style={{ width:AW, height:AH, background:C.ground, position:'relative', flexShrink:0 }}>
        {/* Full-bleed image fills entire page */}
        <div style={{ position:'absolute', top:0, left:0, width:AW, height:AH }}>
          <ImageFrame w={AW} h={AH} label="spread full-bleed" focal_x={entry.focal_x??50} focal_y={entry.focal_y??50} media_url={entry.media_url}/>
        </div>
        {/* "online//offline" top-left */}
        <div style={{ position:'absolute', top:BLEED+MT-30, left:BLEED+ML, fontFamily:F.mono, fontSize:8, letterSpacing:'0.10em' }}>
          <span style={{ color:'rgba(224,90,40,0.7)' }}>online</span>
          <span style={{ color:C.terra }}>//</span>
          <span style={{ color:'rgba(224,90,40,0.7)' }}>offline</span>
        </div>
        {/* Page number bottom-right */}
        <div style={{ position:'absolute', bottom:BLEED+MB-20, right:BLEED+MR, fontFamily:F.mono, fontSize:8, color:C.gold, letterSpacing:'0.10em' }}>
          {data.page || 18}
        </div>
        <RegistrationMark side="left"/>
        <BleedMarks/>
        <GrainOverlay/>
        {showAnnotations && <Annotation label="full-bleed image / focal_x, focal_y" style={{ top:BLEED+MT, left:BLEED+ML }}/>}
      </div>

      {/* Gutter shadow */}
      <div className="gutter-shadow" style={{
        position:'absolute', top:0, left:AW-5, width:10, height:AH, zIndex:10, pointerEvents:'none',
        background:'linear-gradient(to right, rgba(0,0,0,0.35) 0%, rgba(0,0,0,0.04) 50%, rgba(0,0,0,0.2) 100%)',
      }}/>

      {/* ── SPREAD RIGHT ── */}
      <div style={{ width:AW, height:AH, background:C.paper, position:'relative', flexShrink:0 }}>
        <div style={{ position:'absolute', top:BLEED+MT, left:BLEED+ML, right:BLEED+MR }}>
          {/* Section mark with page ref */}
          <SectionMark>{data.type ? `${data.type} · ` : ''}Full Spread · {data.page||18}</SectionMark>
          {/* Large title */}
          {data.page_title && (
            <div style={{
              fontFamily:F.serif, fontSize:68, color:C.ground, lineHeight:0.88,
              fontWeight:400, letterSpacing:'-0.02em', marginTop:10, marginBottom:16,
            }}>
              {data.page_title}
            </div>
          )}
          {/* Thick rule */}
          <div style={{ height:2, background:C.ground, width:'100%', marginBottom:6 }}/>
          {/* Short gold rule */}
          <div style={{ width:40, height:1.5, background:C.gold, marginBottom:22 }}/>

          {/* Contributor block */}
          <div style={{
            background:C.ground, height:44,
            display:'flex', alignItems:'center', justifyContent:'space-between',
            paddingLeft:12, paddingRight:12,
            marginBottom:14,
          }}>
            {contributor.name && (
              <span style={{ fontFamily:F.serif, fontSize:15, color:C.paper }}>
                {contributor.name}
              </span>
            )}
            {contributor.city && (
              <span style={{ fontFamily:F.mono, fontSize:8, color:C.paper4, letterSpacing:'0.10em', textTransform:'uppercase' }}>
                {contributor.city}
              </span>
            )}
          </div>

          {/* Long caption */}
          {entry.caption && (
            <div style={{ fontFamily:F.serif, fontStyle:'italic', fontSize:9.5, color:C.paper3, lineHeight:1.7 }}>
              {entry.caption}
            </div>
          )}

          {showAnnotations && (
            <>
              <Annotation label="content.type" style={{ top:0, left:0 }}/>
              <Annotation label="content.page_title" style={{ top:16, left:0 }}/>
              <Annotation label="contributor.name / city" style={{ top:148, left:0 }}/>
              <Annotation label="content_entry.caption" style={{ top:200, left:0 }}/>
            </>
          )}
        </div>

        {/* Bottom rule + folio */}
        <div style={{ position:'absolute', bottom:BLEED+MB-14, left:BLEED+ML, right:BLEED+MR }}>
          <div style={{ height:0.5, background:'rgba(240,235,226,0.14)', marginBottom:8 }}/>
          <div style={{ display:'flex', justifyContent:'space-between' }}>
            <Folio page={(data.page||18)+1} side="right" season={data.season||'Spring 2026'}/>
          </div>
        </div>

        <RegistrationMark side="left"/>
        <RegistrationMark side="right"/>
        <BleedMarks dark={true}/>
        <GrainOverlay/>
      </div>
    </div>
  );
}

// ─── 11. CAMPAIGN PAGE ────────────────────────────────────────────────────────
function CampaignPage({ data={}, showAnnotations=false }) {
  // A campaign page is a paid, full-page advertisement supplied entirely by the
  // advertiser. Nothing is printed over it — no name, bio, discount, wordmark,
  // folio, page number, or grain. Only the advertiser image (truly full-bleed,
  // edge to edge including bleed) plus crop marks for the printer's trimming.
  return (
    <div style={{ width:AW, height:AH, background:C.ground, position:'relative', overflow:'hidden' }}>

      {/* Advertiser image — fills the entire page edge-to-edge with object-fit
          cover, centered (no blank margins when the ad's aspect ratio differs
          from the page). Raw <img> so the ImageFrame path is kept only for the
          no-image placeholder fallback (shared primitive, not edited here). */}
      {data.avatar_url ? (
        <img
          src={data.avatar_url}
          style={{
            position:'absolute', top:0, left:0, width:AW, height:AH,
            objectFit:'cover', objectPosition:'center',
          }}
        />
      ) : (
        <ImageFrame
          w={AW} h={AH}
          label="campaign / brand image"
          focal_x={data.focal_x??50} focal_y={data.focal_y??50}
          media_url={data.avatar_url}
          style={{ position:'absolute', top:0, left:0, width:AW, height:AH }}
        />
      )}

      {/* Crop marks only — for the printer's trim, not visible content */}
      <BleedMarks/>
    </div>
  );
}

Object.assign(window, { CommunicationsPage, Spread, CampaignPage });

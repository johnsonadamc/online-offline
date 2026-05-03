// templates-9-11.jsx — CommunicationsPage, Spread, CampaignPage

// ─── 9. COMMUNICATIONS PAGE ───────────────────────────────────────────────────
function CommunicationsPage({ data={}, showAnnotations=false }) {
  const messages = data.messages || [
    {
      from: { name:'A. Chen', city:'Shanghai' },
      to:   { name:'The Editors' },
      subject: 'On finding the frame',
      date: '14 Mar 2026',
      body: 'I wanted to write before the quarter closed. The theme arrived late for me — I had been shooting for weeks without finding the right frame. Then one morning the fog came in low over the river and everything I had been trying to say was simply there, unavoidable.',
    },
    {
      from: { name:'M. Osei', city:'Accra' },
      to:   { name:'The Editors' },
      subject: 'The edit, final',
      date: '21 Mar 2026',
      body: 'Three photographs made it through the final edit. I had hoped for more. The ones that did not survive were technically stronger but emotionally thinner — you make the right call by not printing them. Trust the instinct.',
    },
    {
      from: { name:'L. Varga', city:'Budapest' },
      to:   { name:'Curatorial' },
      subject: 'Four quarters in',
      date: '28 Mar 2026',
      body: 'This is my fourth quarter contributing. Each time I submit I am surprised by which images you select. Not disappointed — surprised. I have started saving your selections alongside my own edits to understand the difference in seeing.',
    },
    {
      from: { name:'R. Patel', city:'Mumbai' },
      to:   { name:'The Editors' },
      subject: 'A note of gratitude',
      date: '02 Apr 2026',
      body: 'A note of gratitude. The printed edition reaches me two weeks after it ships. I take it to the café near the market where I made half of last year\'s work and read it slowly. It is the only magazine I still do that with.',
    },
  ];

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
        top:BLEED+MT+80,
        left:BLEED+ML, right:BLEED+MR,
        display:'grid',
        gridTemplateColumns:'1fr 1fr',
        gap:'14px 20px',
      }}>
        {messages.map((msg, i) => (
          <div key={i} style={{
            borderTop:`1px solid rgba(240,235,226,0.14)`,
            paddingTop:10,
          }}>
            <div style={{ fontFamily:F.mono, fontSize:7.5, color:C.terra, textTransform:'uppercase', letterSpacing:'0.14em', marginBottom:4 }}>
              From
            </div>
            <div style={{ fontFamily:F.serif, fontSize:14, color:C.ground, lineHeight:1.1, marginBottom:4 }}>
              {msg.from.name}
            </div>
            {msg.subject && (
              <div style={{ fontFamily:F.serif, fontStyle:'italic', fontSize:10, color:C.paper3, lineHeight:1.3, marginBottom:4 }}>
                {msg.subject}
              </div>
            )}
            <div style={{ fontFamily:F.mono, fontSize:7.5, color:C.paper4, letterSpacing:'0.08em', marginBottom:8 }}>
              {msg.date} — To: {msg.to.name}
            </div>
            <div style={{ fontFamily:F.serif, fontStyle:'italic', fontSize:11.5, lineHeight:1.82, color:C.ground }}>
              {msg.body}
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
          <ImageFrame w={AW} h={AH} label="spread full-bleed" focal_x={entry.focal_x||50} focal_y={entry.focal_y||50} media_url={entry.media_url}/>
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
      <div style={{
        position:'absolute', top:0, left:AW-5, width:10, height:AH, zIndex:10, pointerEvents:'none',
        background:'linear-gradient(to right, rgba(0,0,0,0.35) 0%, rgba(0,0,0,0.04) 50%, rgba(0,0,0,0.2) 100%)',
      }}/>

      {/* ── SPREAD RIGHT ── */}
      <div style={{ width:AW, height:AH, background:C.paper, position:'relative', flexShrink:0 }}>
        <div style={{ position:'absolute', top:BLEED+MT, left:BLEED+ML, right:BLEED+MR }}>
          {/* Section mark with page ref */}
          <SectionMark>{data.type||'Photography'} · Full Spread · {data.page||18}</SectionMark>
          {/* Large title */}
          <div style={{
            fontFamily:F.serif, fontSize:68, color:C.ground, lineHeight:0.88,
            fontWeight:400, letterSpacing:'-0.02em', marginTop:10, marginBottom:16,
          }}>
            {data.page_title || 'Between the Frames'}
          </div>
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
            <span style={{ fontFamily:F.serif, fontSize:15, color:C.paper }}>
              {contributor.name||'Contributor Name'}
            </span>
            <span style={{ fontFamily:F.mono, fontSize:8, color:C.paper4, letterSpacing:'0.10em', textTransform:'uppercase' }}>
              {contributor.city||'City'}
            </span>
          </div>

          {/* Long caption */}
          <div style={{ fontFamily:F.serif, fontStyle:'italic', fontSize:9.5, color:C.paper3, lineHeight:1.7 }}>
            {entry.caption||'A long descriptive caption for the full-spread photograph, providing context about the moment, the light, and what the contributor intended to capture. This runs to multiple lines, giving the reader enough information to sit with the image on the opposite page.'}
          </div>

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
  return (
    <div style={{ width:AW, height:AH, background:C.ground, position:'relative', overflow:'hidden' }}>

      {/* Full-bleed campaign image — fills entire page */}
      <div style={{ position:'absolute', inset:0 }}>
        <ImageFrame w={AW} h={AH} label="campaign / brand image" focal_x={data.focal_x||50} focal_y={data.focal_y||50}/>
      </div>

      {/* Dark gradient scrim — bottom two-thirds, for text legibility */}
      <div style={{
        position:'absolute', inset:0,
        background:'linear-gradient(to bottom, rgba(37,33,25,0.0) 0%, rgba(37,33,25,0.15) 30%, rgba(37,33,25,0.72) 60%, rgba(37,33,25,0.92) 100%)',
        pointerEvents:'none',
      }}/>

      {/* Top-left: Advertisement label */}
      <div style={{
        position:'absolute', top:BLEED+MT, left:BLEED+ML,
        display:'flex', alignItems:'center', gap:8,
      }}>
        <GoldMark>Advertisement</GoldMark>
        <div style={{ width:32, height:0.5, background:C.gold, opacity:0.5 }}/>
      </div>

      {/* Top-right: wordmark watermark */}
      <div style={{
        position:'absolute', top:BLEED+MT, right:BLEED+MR,
        fontFamily:F.mono, fontSize:7.5, letterSpacing:'0.12em',
        color:'rgba(240,235,226,0.25)',
      }}>
        online<span style={{ color:'rgba(224,90,40,0.5)' }}>//</span>offline
      </div>

      {/* Bottom content overlay */}
      <div style={{
        position:'absolute', bottom:0, left:0, right:0,
        padding:`0 ${BLEED+ML}px ${BLEED+MB+8}px`,
      }}>
        {/* Gold rule above name */}
        <div style={{ width:40, height:1.5, background:C.gold, marginBottom:14 }}/>

        {/* Campaign name — large display */}
        <div style={{
          fontFamily:F.serif, fontSize:52, color:C.paper,
          letterSpacing:'-0.02em', lineHeight:0.95,
          marginBottom:14,
        }}>
          {data.campaign_name || 'The Archive Project'}
        </div>

        {/* Tagline */}
        <div style={{
          fontFamily:F.sans, fontWeight:300, fontSize:13, color:C.paper3,
          lineHeight:1.55, maxWidth:460, marginBottom:20,
        }}>
          {data.tagline || 'A curated archive of analogue photography from the last decade. Every print tells a story the digital world forgot to save.'}
        </div>

        {/* Divider */}
        <div style={{ height:0.5, background:'rgba(240,235,226,0.18)', marginBottom:14 }}/>

        {/* Bottom bar: price left, folio right */}
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-end' }}>
          <div style={{ display:'flex', alignItems:'baseline', gap:10 }}>
            <span style={{
              fontFamily:F.serif, fontSize:44, color:C.gold, lineHeight:1,
              textShadow:'0 0 24px rgba(232,160,32,0.45)',
            }}>{data.discount ? `$${data.discount}` : '$2'}</span>
            <span style={{ fontFamily:F.mono, fontSize:8.5, color:C.paper4, letterSpacing:'0.10em', textTransform:'uppercase' }}>
              off your edition price
            </span>
          </div>
          <div style={{ display:'flex', justifyContent:'flex-end', gap:16 }}>
            <Folio page={data.page||22} side="left" dark={true} season={data.season||'Spring 2026'}/>
            <Folio page={data.page||22} side="right" dark={true} season={data.season||'Spring 2026'}/>
          </div>
        </div>
      </div>

      {showAnnotations && (
        <>
          <Annotation label="campaign image (focal_x/y)" style={{ top:BLEED+MT+20, left:BLEED+ML }}/>
          <Annotation label="campaign_name" style={{ bottom:180, left:BLEED+ML }}/>
          <Annotation label="tagline" style={{ bottom:140, left:BLEED+ML }}/>
        </>
      )}

      <RegistrationMark side="left"/>
      <RegistrationMark side="right"/>
      <BleedMarks/>
      <GrainOverlay/>
    </div>
  );
}

Object.assign(window, { CommunicationsPage, Spread, CampaignPage });

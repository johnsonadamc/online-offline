// templates-20-24.jsx — FrontMatter, PoetryPage, CollabSpreadCommunity, CollabSpreadLocal, CollabSpreadPrivate

// ─── 20. FRONT MATTER ────────────────────────────────────────────────────────
// First interior page. Curator identity + table of contents.
function FrontMatter({ data={}, showAnnotations=false }) {
  const curator = data.curator || { name: 'Lena Vasquez', city: 'Pensacola' };
  const season  = data.season  || 'Spring 2026';
  const toc     = data.toc || [
    { page:3,  contributor:'A. Chen',      type:'Photography',            title:'Still Waters' },
    { page:5,  contributor:'M. Osei',      type:'Photography',            title:'Threshold' },
    { page:7,  contributor:'L. Varga',     type:'Art',                    title:'Surfaces' },
    { page:9,  contributor:'R. Patel',     type:'Photography',            title:'Low Season' },
    { page:11, contributor:'S. Müller',    type:'Photography',            title:'Four Corners' },
    { page:13, contributor:'T. Nakamura',  type:'Essay',                  title:'Between the Frames' },
    { page:15, contributor:'Shared Light', type:'Collaboration · Community', title:'' },
    { page:17, contributor:'Dispatches',   type:'Correspondence',         title:'' },
    { page:19, contributor:'A. Chen',      type:'Photography',            title:'The Hour Before' },
  ];

  function ReverseDoubleRule() {
    return (
      <div style={{ display:'flex', flexDirection:'column', gap:2, width:'100%', flexShrink:0 }}>
        <div style={{ height:1,   background:C.gold }}/>
        <div style={{ height:0.5, background:C.terra }}/>
      </div>
    );
  }

  const curatorBlockTop = 88;

  return (
    <div style={{ width:AW, height:AH, background:C.paper, position:'relative', overflow:'hidden' }}>

      {/* ── TOP AREA ── */}
      <div style={{ position:'absolute', top:BLEED+MT, left:BLEED+ML, right:BLEED+MR }}>

        {/* Wordmark */}
        <div style={{ marginBottom:8 }}>
          <span style={{ fontFamily:F.serif, fontSize:28, color:C.ground, letterSpacing:'-0.01em' }}>online</span>
          <span style={{ fontFamily:F.serif, fontSize:28, color:C.terra,  letterSpacing:'0em'     }}>//</span>
          <span style={{ fontFamily:F.serif, fontSize:28, color:C.ground, letterSpacing:'-0.01em' }}>offline</span>
        </div>

        {/* Reverse double rule */}
        <ReverseDoubleRule/>

        {/* Season */}
        <div style={{
          fontFamily:F.sans, fontWeight:300, fontSize:22, color:C.paper3,
          textTransform:'uppercase', letterSpacing:'0.16em', lineHeight:1,
          marginTop:8,
        }}>
          {season}
        </div>

        {showAnnotations && <Annotation label="season" style={{ top:58, left:0 }}/>}
      </div>

      {/* ── CURATOR BLOCK ── */}
      <div style={{
        position:'absolute',
        top: BLEED+MT + curatorBlockTop + 46,
        left:BLEED+ML, right:BLEED+MR,
        display:'flex', flexDirection:'column', alignItems:'center',
        gap:4,
      }}>
        <div style={{ fontFamily:F.mono, fontSize:8, color:C.paper4, textTransform:'uppercase', letterSpacing:'0.14em' }}>
          Curated by
        </div>
        <div style={{ fontFamily:F.serif, fontStyle:'italic', fontSize:42, color:C.ground, lineHeight:1 }}>
          {curator.name || 'Curator Name'}
        </div>
        <div style={{ fontFamily:F.mono, fontSize:9, color:C.paper4, letterSpacing:'0.08em' }}>
          {curator.city || 'City'}
        </div>
        {/* Short centered terra rule */}
        <div style={{ width:28, height:1.5, background:C.terra, marginTop:4 }}/>
        {showAnnotations && <Annotation label="curator.name / city" style={{ top:24, left:'50%' }}/>}
      </div>

      {/* ── TABLE OF CONTENTS ── */}
      <div style={{
        position:'absolute',
        top: BLEED+MT + curatorBlockTop + 46 + 140,
        left:BLEED+ML, right:BLEED+MR,
      }}>
        {/* Contents label + gold rule */}
        <div style={{ fontFamily:F.mono, fontSize:8, color:C.terra, textTransform:'uppercase', letterSpacing:'0.16em', marginBottom:5 }}>
          Contents
        </div>
        <GoldRule/>
        <div style={{ height:10 }}/>

        {/* Two-column TOC layout */}
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'0 24px' }}>
          {toc.map((entry, i) => (
            <div key={i} style={{
              display:'flex', alignItems:'baseline', gap:0,
              borderBottom:`0.5px solid rgba(37,33,25,0.08)`,
              paddingTop:5, paddingBottom:5,
            }}>
              {/* Page number — right-aligned in 28px column */}
              <div style={{
                fontFamily:F.serif, fontSize:13, color:C.gold,
                width:28, flexShrink:0, textAlign:'right', marginRight:10,
              }}>
                {entry.page}
              </div>
              {/* Contributor name */}
              <div style={{ fontFamily:F.serif, fontSize:14, color:C.ground, flexShrink:0, marginRight:6, whiteSpace:'nowrap' }}>
                {entry.contributor || 'Contributor'}
              </div>
              {/* Type — italic Courier, truncated */}
              <div style={{
                fontFamily:F.mono, fontStyle:'italic', fontSize:7.5, color:C.paper4,
                flexShrink:1, overflow:'hidden', whiteSpace:'nowrap', textOverflow:'ellipsis',
                marginRight: entry.title ? 4 : 0,
              }}>
                {entry.type || ''}
              </div>
              {/* Title — if present */}
              {entry.title ? (
                <div style={{
                  fontFamily:F.serif, fontStyle:'italic', fontSize:10, color:C.paper3,
                  flexShrink:1, overflow:'hidden', whiteSpace:'nowrap', textOverflow:'ellipsis',
                  marginLeft:4,
                }}>
                  · {entry.title}
                </div>
              ) : null}
            </div>
          ))}
        </div>
        {showAnnotations && <Annotation label="toc[] entries" style={{ top:24, left:0 }}/>}
      </div>

      {/* ── BOTTOM IMPRINT ── */}
      <div style={{
        position:'absolute', bottom:BLEED+MB, left:BLEED+ML, right:BLEED+MR,
      }}>
        <div style={{ height:0.5, background:C.paper5, marginBottom:8 }}/>
        <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:3 }}>
          <div style={{ fontFamily:F.mono, fontSize:8, color:C.paper5, letterSpacing:'0.10em' }}>
            online<span style={{ color:C.terra }}>//</span>offline
          </div>
          <div style={{ fontFamily:F.mono, fontSize:8, color:C.paper5, letterSpacing:'0.10em' }}>
            {season}
          </div>
        </div>
      </div>

      {/* No folio on this page — page 2, conventionally unnumbered */}
      <RegistrationMark side="left"/>
      <RegistrationMark side="right"/>
      <BleedMarks dark={true}/>
      <GrainOverlay/>
    </div>
  );
}

// ─── 21. POETRY PAGE ─────────────────────────────────────────────────────────
// Narrow centered column. Preserved line breaks. Generous whitespace.
function PoetryPage({ data={}, showAnnotations=false }) {
  const contributor = data.contributor || { name:'T. Nakamura', city:'Osaka' };
  const season      = data.season      || 'Spring 2026';
  const body        = data.body        || `The gate opens once.\nNo one remembers\nwho left it ajar.\n\nMorning, the second crossing.\nThe water has opinions\nabout where it goes.\n\nBy the third gate\neven the light\nhas learned to wait.`;
  const epigraph    = data.epigraph    || '';
  const stanzas     = body.split(/\n\n+/);

  return (
    <div style={{ width:AW, height:AH, background:C.paper, position:'relative', overflow:'hidden' }}>

      <VerticalContributorLabel
        name={contributor.name || 'Contributor Name'}
        type={data.type || 'Poetry'}
        issue={season}
      />

      {/* Main content — left of vertical label is 46px, so we start at ML */}
      <div style={{ position:'absolute', top:BLEED+MT, left:BLEED+ML, right:BLEED+MR }}>

        <DoubleRule/>

        {/* SectionMark + GoldMark */}
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginTop:8, marginBottom:14 }}>
          <SectionMark>{data.type || 'Poetry'}</SectionMark>
          <GoldMark>{season}</GoldMark>
        </div>

        {/* Poem title */}
        <div style={{
          fontFamily:F.serif, fontStyle:'italic', fontSize:44, color:C.ground,
          lineHeight:0.92, letterSpacing:'-0.01em', marginBottom:14,
          textAlign:'center',
        }}>
          {data.page_title || 'Three Crossings'}
        </div>

        {/* Terra rule + full-width paper5 rule */}
        <div style={{ display:'flex', alignItems:'center', marginBottom:12, justifyContent:'center' }}>
          <div style={{ width:28, height:1.5, background:C.terra, flexShrink:0 }}/>
          <div style={{ flex:1, height:0.5, background:C.paper5 }}/>
        </div>

        {/* Contributor meta */}
        <div style={{ display:'flex', alignItems:'center', gap:0, marginBottom:24, justifyContent:'center' }}>
          <span style={{ fontFamily:F.mono, fontSize:8.5, color:C.terra, letterSpacing:'0.10em', textTransform:'uppercase' }}>
            {contributor.name || 'Contributor Name'}
          </span>
          <span style={{ width:0.5, height:10, background:C.paper5, display:'inline-block', margin:'0 8px', verticalAlign:'middle' }}/>
          <span style={{ fontFamily:F.mono, fontSize:8.5, color:C.paper4, letterSpacing:'0.08em', textTransform:'uppercase' }}>
            {contributor.city || 'City'}
          </span>
          {data.word_count && (
            <>
              <span style={{ width:0.5, height:10, background:C.paper5, display:'inline-block', margin:'0 8px', verticalAlign:'middle' }}/>
              <span style={{ fontFamily:F.mono, fontSize:8, color:C.paper4, letterSpacing:'0.08em' }}>{data.word_count} words</span>
            </>
          )}
        </div>

        {/* Epigraph — if provided */}
        {epigraph ? (
          <div style={{ display:'flex', flexDirection:'column', alignItems:'center', marginBottom:22 }}>
            <div style={{ width:60, height:0.5, background:C.paper5, marginBottom:10 }}/>
            <div style={{
              fontFamily:F.serif, fontStyle:'italic', fontSize:11, color:C.paper3,
              textAlign:'center', lineHeight:1.6,
            }}>
              {epigraph}
            </div>
          </div>
        ) : null}

        {/* Poem body — centered on page, max 420px */}
        <div style={{ display:'flex', justifyContent:'center' }}>
          <div style={{ maxWidth:420, width:'100%' }}>
            {stanzas.map((stanza, si) => (
              <p key={si} style={{
                fontFamily:F.serif, fontSize:13, color:C.ground,
                lineHeight:2.2, whiteSpace:'pre-wrap',
                margin:0,
                marginBottom: si < stanzas.length - 1 ? 22 : 0,
              }}>
                {stanza.trim()}
              </p>
            ))}
          </div>
        </div>

        {showAnnotations && (
          <>
            <Annotation label="page_title" style={{ top:36, left:0 }}/>
            <Annotation label="contributor.name / city" style={{ top:112, left:0 }}/>
            {epigraph && <Annotation label="epigraph" style={{ top:148, left:0 }}/>}
            <Annotation label="body (stanzas)" style={{ top:200, left:0 }}/>
          </>
        )}
      </div>

      {/* Anchoring terra rule at 70% if poem is short — always render */}
      <div style={{
        position:'absolute', top:Math.floor(AH*0.70),
        left:BLEED+ML, right:BLEED+MR,
        height:3, background:C.terra, opacity:0.55,
      }}/>

      {/* Folio */}
      <div style={{ position:'absolute', bottom:BLEED+MB-14, left:BLEED+ML, right:BLEED+MR, display:'flex', justifyContent:'space-between' }}>
        <Folio page={data.page||13} side="left" season={season}/>
        <Folio page={data.page||13} side="right" season={season}/>
      </div>

      <RegistrationMark side="left"/>
      <RegistrationMark side="right"/>
      <BleedMarks dark={true}/>
      <GrainOverlay/>
    </div>
  );
}

// ─── 22. COLLAB SPREAD — COMMUNITY ───────────────────────────────────────────
// Open global collaboration. Left: dark header + 3 images. Right: paper + 3 images + credits.
function CollabSpreadCommunity({ data={}, showAnnotations=false }) {
  const entries     = data.entries || [
    { title:'River Fog',    contributor:{ name:'A. Chen',     city:'Shanghai' }, focal_x:50, focal_y:50 },
    { title:'Market Gate',  contributor:{ name:'M. Osei',     city:'Accra'    }, focal_x:55, focal_y:45 },
    { title:'Patina I',     contributor:{ name:'L. Varga',    city:'Budapest' }, focal_x:50, focal_y:50 },
    { title:'Marine Lines', contributor:{ name:'R. Patel',    city:'Mumbai'   }, focal_x:50, focal_y:60 },
    { title:'Mitte 06:00',  contributor:{ name:'S. Müller',   city:'Berlin'   }, focal_x:50, focal_y:50 },
    { title:'Canal Study',  contributor:{ name:'T. Nakamura', city:'Osaka'    }, focal_x:50, focal_y:50 },
  ];
  const season      = data.season       || 'Spring 2026';
  const collabTitle = data.collab_title || 'Shared Light';
  const mode        = data.mode         || 'Community';
  const displayText = data.display_text || 'Contributors responding to a shared theme across cities, disciplines, and ways of seeing.';
  const spreadW     = AW * 2;

  const leftEntries  = entries.slice(0, 3);
  const rightEntries = entries.slice(3, 6);

  const uniqueContributors = entries.map(e => e.contributor).filter(Boolean)
    .filter((c, i, arr) => arr.findIndex(x => x.name === c.name) === i);

  const gutter      = 8;
  const cols        = 3;
  const colW        = Math.floor((LIVEW - gutter * (cols - 1)) / cols);
  const bandH       = 110;
  const descH       = 46;
  const ruleH       = 2;
  const captionH    = 32;
  const folioH      = BLEED + MB + 14;
  const gridTop     = bandH + 14 + descH + ruleH + 10;
  const imgH        = AH - gridTop - captionH - folioH;

  const rightGridTop    = BLEED + MT;
  const rightImgH       = imgH;
  const rightCreditsTop = rightGridTop + rightImgH + captionH + 14;

  return (
    <div style={{ width:spreadW, height:AH, position:'relative', overflow:'hidden', display:'flex' }}>

      {/* ── LEFT PAGE ── */}
      <div style={{ width:AW, height:AH, background:C.paper, position:'relative', flexShrink:0 }}>

        {/* Header band — dark, full width */}
        <div style={{
          position:'absolute', top:0, left:0, width:AW, height:bandH,
          background:C.ground,
          borderBottom:`2px solid ${C.terra}`,
          boxSizing:'border-box',
          paddingLeft:BLEED+ML, paddingRight:BLEED+MR,
          display:'flex', alignItems:'flex-end', paddingBottom:14,
          justifyContent:'space-between',
        }}>
          <div>
            <div style={{ marginBottom:5 }}><SectionMark>Collaboration</SectionMark></div>
            <div style={{ fontFamily:F.serif, fontSize:38, color:C.paper, letterSpacing:'-0.01em', lineHeight:0.92 }}>
              {collabTitle}
            </div>
          </div>
          <div style={{ display:'flex', flexDirection:'column', alignItems:'flex-end', gap:4 }}>
            <GoldMark>{mode}</GoldMark>
            <span style={{ fontFamily:F.mono, fontSize:8, color:C.paper4, letterSpacing:'0.08em' }}>
              {uniqueContributors.length} contributors
            </span>
          </div>
          {showAnnotations && <Annotation label="collab_title / mode" style={{ bottom:14, left:BLEED+ML }}/>}
        </div>

        {/* Description */}
        <div style={{
          position:'absolute', top:bandH+14, left:BLEED+ML, right:BLEED+MR,
          fontFamily:F.serif, fontStyle:'italic', fontSize:10, color:C.paper3, lineHeight:1.6,
          height:descH, overflow:'hidden',
        }}>
          {displayText}
        </div>

        {/* TerraRule below description */}
        <div style={{ position:'absolute', top:bandH+14+descH, left:BLEED+ML, right:BLEED+MR, height:ruleH, background:C.terra }}/>

        {/* Left 3 images */}
        <div style={{ position:'absolute', top:gridTop, left:BLEED+ML, right:BLEED+MR }}>
          <div style={{ display:'flex', gap:gutter }}>
            {leftEntries.map((entry, i) => {
              const c = entry.contributor || {};
              return (
                <div key={i} style={{ width:colW, flexShrink:0 }}>
                  <div style={{ position:'relative' }}>
                    <ImageFrame w={colW} h={imgH} label={entry.title||`image ${i+1}`} focal_x={entry.focal_x||50} focal_y={entry.focal_y||50} media_url={entry.media_url}/>
                    <div style={{ position:'absolute', bottom:6, left:6, fontFamily:F.mono, fontSize:11, color:C.gold }}>
                      {String(i+1).padStart(2,'0')}
                    </div>
                  </div>
                  <div style={{ marginTop:5 }}>
                    <div style={{ fontFamily:F.mono, fontSize:7.5, color:C.paper4, letterSpacing:'0.06em', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{c.name||''}</div>
                    <div style={{ fontFamily:F.serif, fontStyle:'italic', fontSize:8, color:C.paper3, lineHeight:1.4 }}>{entry.title||''}</div>
                  </div>
                </div>
              );
            })}
          </div>
          {showAnnotations && <Annotation label="entries[0..2] — left page" style={{ top:0, left:0 }}/>}
        </div>

        {/* Folio bottom-left */}
        <div style={{ position:'absolute', bottom:BLEED+MB-14, left:BLEED+ML }}>
          <Folio page={data.page||15} side="left" season={season}/>
        </div>

        <RegistrationMark side="left"/>
        <BleedMarks dark={true}/>
        <GrainOverlay/>
      </div>

      {/* Gutter shadow */}
      <div style={{
        position:'absolute', top:0, left:AW-5, width:10, height:AH, zIndex:10, pointerEvents:'none',
        background:'linear-gradient(to right, rgba(0,0,0,0.18) 0%, rgba(0,0,0,0.02) 50%, rgba(0,0,0,0.10) 100%)',
      }}/>

      {/* ── RIGHT PAGE ── */}
      <div style={{ width:AW, height:AH, background:C.paper, position:'relative', flexShrink:0 }}>

        {/* Right 3 images — starting at top margin */}
        <div style={{ position:'absolute', top:rightGridTop, left:BLEED+ML, right:BLEED+MR }}>
          <div style={{ display:'flex', gap:gutter }}>
            {rightEntries.map((entry, i) => {
              const c = entry.contributor || {};
              return (
                <div key={i} style={{ width:colW, flexShrink:0 }}>
                  <div style={{ position:'relative' }}>
                    <ImageFrame w={colW} h={rightImgH} label={entry.title||`image ${i+4}`} focal_x={entry.focal_x||50} focal_y={entry.focal_y||50} media_url={entry.media_url}/>
                    <div style={{ position:'absolute', bottom:6, left:6, fontFamily:F.mono, fontSize:11, color:C.gold }}>
                      {String(i+4).padStart(2,'0')}
                    </div>
                  </div>
                  <div style={{ marginTop:5 }}>
                    <div style={{ fontFamily:F.mono, fontSize:7.5, color:C.paper4, letterSpacing:'0.06em', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{c.name||''}</div>
                    <div style={{ fontFamily:F.serif, fontStyle:'italic', fontSize:8, color:C.paper3, lineHeight:1.4 }}>{entry.title||''}</div>
                  </div>
                </div>
              );
            })}
          </div>
          {showAnnotations && <Annotation label="entries[3..5] — right page" style={{ top:0, left:0 }}/>}
        </div>

        {/* Credits section */}
        <div style={{ position:'absolute', top:rightCreditsTop, left:BLEED+ML, right:BLEED+MR }}>
          <div style={{ fontFamily:F.mono, fontSize:8, color:C.terra, textTransform:'uppercase', letterSpacing:'0.16em', marginBottom:5 }}>
            Contributors to this collaboration
          </div>
          <GoldRule/>
          <div style={{ height:10 }}/>
          <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
            {uniqueContributors.map((c, i) => (
              <div key={i} style={{ display:'flex', justifyContent:'space-between', alignItems:'baseline' }}>
                <span style={{ fontFamily:F.serif, fontSize:13, color:C.ground }}>{c.name||'Contributor'}</span>
                <span style={{ fontFamily:F.mono, fontSize:7.5, color:C.paper4, letterSpacing:'0.08em' }}>{c.city||''}</span>
              </div>
            ))}
          </div>
          {showAnnotations && <Annotation label="contributors credits" style={{ top:0, left:0 }}/>}
        </div>

        {/* Mode badge */}
        <div style={{
          position:'absolute', bottom:BLEED+MB+10, right:BLEED+MR,
          background:C.ground, borderRadius:4, padding:'3px 8px',
        }}>
          <span style={{ fontFamily:F.mono, fontSize:7, color:C.paper3, letterSpacing:'0.08em' }}>
            Community · open call
          </span>
        </div>

        {/* Folio bottom-right */}
        <div style={{ position:'absolute', bottom:BLEED+MB-14, right:BLEED+MR }}>
          <Folio page={(data.page||15)+1} side="right" season={season}/>
        </div>

        <RegistrationMark side="right"/>
        <BleedMarks dark={true}/>
        <GrainOverlay/>
      </div>
    </div>
  );
}

// ─── 23. COLLAB SPREAD — LOCAL ────────────────────────────────────────────────
// City-specific collaboration. Left: dark. Right: paper.
function CollabSpreadLocal({ data={}, showAnnotations=false }) {
  const entries     = data.entries || [
    { title:'Before Noon',   contributor:{ name:'J. Walsh',  city:'Pensacola' }, focal_x:50, focal_y:45 },
    { title:'The Pier',      contributor:{ name:'C. Rivers', city:'Pensacola' }, focal_x:48, focal_y:55 },
    { title:'Sand Study',    contributor:{ name:'M. Alcott', city:'Pensacola' }, focal_x:52, focal_y:50 },
    { title:'Fort Pickens',  contributor:{ name:'J. Walsh',  city:'Pensacola' }, focal_x:50, focal_y:50 },
    { title:'Dusk, Palafox', contributor:{ name:'C. Rivers', city:'Pensacola' }, focal_x:50, focal_y:60 },
    { title:'The Sound',     contributor:{ name:'M. Alcott', city:'Pensacola' }, focal_x:45, focal_y:50 },
  ];
  const season      = data.season       || 'Spring 2026';
  const collabTitle = data.collab_title || 'Gulf Light';
  const mode        = data.mode         || 'Local';
  const city        = data.city         || 'Pensacola';
  const displayText = data.display_text || 'A local collaboration documenting the particular quality of light along the Gulf Coast in late winter.';
  const spreadW     = AW * 2;

  const leftEntries  = entries.slice(0, 3);
  const rightEntries = entries.slice(3, 6);

  const uniqueContributors = entries.map(e => e.contributor).filter(Boolean)
    .filter((c, i, arr) => arr.findIndex(x => x.name === c.name) === i);

  const bandH   = 108;
  const gutter  = 8;
  const cols    = 3;
  const colW    = Math.floor((LIVEW - gutter*(cols-1)) / cols);
  const captH   = 30;
  const folioH  = 28;
  const descH   = 46;
  const ruleH   = 2;
  const leftGridTop = bandH + 16;
  const imgHLeft = Math.floor((AH - leftGridTop - captH - folioH - 8));
  const rightDescTop = BLEED+MT;
  const rightGridTop = rightDescTop + descH + ruleH + 10;
  const creditsTop   = rightGridTop + imgHLeft + captH + 16;
  const imgHRight = imgHLeft;

  return (
    <div style={{ width:spreadW, height:AH, position:'relative', overflow:'hidden', display:'flex' }}>

      {/* ── LEFT PAGE — dark ── */}
      <div style={{ width:AW, height:AH, background:C.ground, position:'relative', flexShrink:0 }}>

        {/* City watermark */}
        <div style={{
          position:'absolute', top:'50%', left:'50%',
          transform:'translate(-50%, -50%)',
          fontFamily:F.serif, fontSize:180, color:'rgba(240,235,226,0.04)',
          letterSpacing:'-0.03em', lineHeight:1, whiteSpace:'nowrap',
          pointerEvents:'none', userSelect:'none', zIndex:1,
        }}>
          {city}
        </div>

        {/* Header — above watermark */}
        <div style={{ position:'absolute', top:BLEED+MT, left:BLEED+ML, right:BLEED+MR, zIndex:2 }}>
          <div style={{ fontFamily:F.mono, fontSize:8, color:C.terra, textTransform:'uppercase', letterSpacing:'0.16em', marginBottom:8 }}>
            Local Collaboration
          </div>
          <div style={{ fontFamily:F.serif, fontSize:34, color:C.paper, lineHeight:0.92, marginBottom:6 }}>
            {collabTitle}
          </div>
          <div style={{ marginBottom:4 }}><GoldMark>{city}</GoldMark></div>
          <div style={{ fontFamily:F.mono, fontSize:8, color:C.paper4, letterSpacing:'0.08em' }}>
            {uniqueContributors.length} contributors
          </div>
          {showAnnotations && <Annotation label="collab_title / city" style={{ top:0, left:0 }}/>}
        </div>

        {/* 3-image grid — left page */}
        <div style={{
          position:'absolute', top:leftGridTop, left:BLEED+ML, right:BLEED+MR,
          display:'flex', gap:gutter, zIndex:2,
        }}>
          {leftEntries.map((entry, i) => {
            const c = entry.contributor || {};
            return (
              <div key={i} style={{ width:colW, flexShrink:0 }}>
                <div style={{ position:'relative' }}>
                  <ImageFrame w={colW} h={imgHLeft} label={entry.title||`image ${i+1}`} focal_x={entry.focal_x||50} focal_y={entry.focal_y||50} media_url={entry.media_url}/>
                  <div style={{ position:'absolute', bottom:6, left:6, fontFamily:F.mono, fontSize:11, color:C.gold }}>
                    {String(i+1).padStart(2,'0')}
                  </div>
                </div>
                <div style={{ marginTop:4 }}>
                  <div style={{ fontFamily:F.mono, fontSize:7.5, color:C.paper3, letterSpacing:'0.06em' }}>{c.name||''}</div>
                  <div style={{ fontFamily:F.mono, fontSize:7.5, color:C.gold, letterSpacing:'0.06em' }}>{c.city||city}</div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Folio dark bottom-left */}
        <div style={{ position:'absolute', bottom:BLEED+MB-14, left:BLEED+ML }}>
          <Folio page={data.page||17} side="left" dark={true} season={season}/>
        </div>

        <RegistrationMark side="left"/>
        <BleedMarks/>
        <GrainOverlay/>
      </div>

      {/* Gutter shadow */}
      <div style={{
        position:'absolute', top:0, left:AW-5, width:10, height:AH, zIndex:10, pointerEvents:'none',
        background:'linear-gradient(to right, rgba(0,0,0,0.30) 0%, rgba(0,0,0,0.04) 50%, rgba(0,0,0,0.16) 100%)',
      }}/>

      {/* ── RIGHT PAGE — light paper ── */}
      <div style={{ width:AW, height:AH, background:C.paper, position:'relative', flexShrink:0 }}>

        {/* Description */}
        <div style={{
          position:'absolute', top:rightDescTop, left:BLEED+ML, right:BLEED+MR,
          fontFamily:F.serif, fontStyle:'italic', fontSize:11, color:C.paper3, lineHeight:1.65,
        }}>
          {displayText}
          {showAnnotations && <Annotation label="display_text" style={{ top:0, right:0 }}/>}
        </div>

        {/* TerraRule */}
        <div style={{ position:'absolute', top:rightDescTop+descH, left:BLEED+ML, right:BLEED+MR, height:ruleH, background:C.terra }}/>

        {/* 3-image grid — right page */}
        <div style={{
          position:'absolute', top:rightGridTop, left:BLEED+ML, right:BLEED+MR,
          display:'flex', gap:gutter,
        }}>
          {rightEntries.map((entry, i) => {
            const c = entry.contributor || {};
            return (
              <div key={i} style={{ width:colW, flexShrink:0 }}>
                <div style={{ position:'relative' }}>
                  <ImageFrame w={colW} h={imgHRight} label={entry.title||`image ${i+4}`} focal_x={entry.focal_x||50} focal_y={entry.focal_y||50} media_url={entry.media_url}/>
                  <div style={{ position:'absolute', bottom:6, left:6, fontFamily:F.mono, fontSize:11, color:C.gold }}>
                    {String(i+4).padStart(2,'0')}
                  </div>
                </div>
                <div style={{ marginTop:4 }}>
                  <div style={{ fontFamily:F.mono, fontSize:7.5, color:C.paper4, letterSpacing:'0.06em' }}>{c.name||''}</div>
                  <div style={{ fontFamily:F.serif, fontStyle:'italic', fontSize:8, color:C.paper3, lineHeight:1.4 }}>{entry.title||''}</div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Credits section */}
        <div style={{ position:'absolute', top:creditsTop, left:BLEED+ML, right:BLEED+MR }}>
          <div style={{ fontFamily:F.mono, fontSize:8, color:C.terra, textTransform:'uppercase', letterSpacing:'0.16em', marginBottom:5 }}>
            Contributors — {city}
          </div>
          <GoldRule/>
          <div style={{ height:10 }}/>
          <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
            {uniqueContributors.map((c, i) => (
              <div key={i} style={{ display:'flex', alignItems:'baseline', gap:8 }}>
                <span style={{ color:C.terra, fontFamily:F.mono, fontSize:8 }}>·</span>
                <span style={{ fontFamily:F.serif, fontSize:14, color:C.ground }}>{c.name||''}</span>
              </div>
            ))}
          </div>
          {/* Footer note */}
          <div style={{ marginTop:16, fontFamily:F.serif, fontStyle:'italic', fontSize:9, color:C.paper4, lineHeight:1.6 }}>
            This collaboration was open to contributors based in {city} during {season}.
          </div>
          {showAnnotations && <Annotation label="contributors / footer note" style={{ top:0, left:0 }}/>}
        </div>

        {/* Folio bottom-right */}
        <div style={{ position:'absolute', bottom:BLEED+MB-14, right:BLEED+MR }}>
          <Folio page={(data.page||17)+1} side="right" season={season}/>
        </div>

        <RegistrationMark side="right"/>
        <BleedMarks dark={true}/>
        <GrainOverlay/>
      </div>
    </div>
  );
}

// ─── 24. COLLAB SPREAD — PRIVATE ─────────────────────────────────────────────
// Invite-only. Fully dark both pages. Editorial, considered.
function CollabSpreadPrivate({ data={}, showAnnotations=false }) {
  const entries     = data.entries || [
    { title:'The Study',      contributor:{ name:'A. Chen',     city:'Shanghai' }, focal_x:50, focal_y:50 },
    { title:'Kitchen, 06:00', contributor:{ name:'M. Osei',     city:'Accra'    }, focal_x:55, focal_y:45 },
    { title:'The Hallway',    contributor:{ name:'L. Varga',    city:'Budapest' }, focal_x:50, focal_y:50 },
    { title:'Bedroom Light',  contributor:{ name:'R. Patel',    city:'Mumbai'   }, focal_x:50, focal_y:60 },
    { title:'The Archive',    contributor:{ name:'S. Müller',   city:'Berlin'   }, focal_x:50, focal_y:50 },
    { title:'Waiting Room',   contributor:{ name:'T. Nakamura', city:'Osaka'    }, focal_x:48, focal_y:52 },
  ];
  const season      = data.season       || 'Spring 2026';
  const collabTitle = data.collab_title || 'The Interior';
  const displayText = data.display_text || 'An invited group working with the theme of interior spaces — rooms, thresholds, the architecture of private life. Each contributor worked independently and submitted without seeing the others.';
  const spreadW     = AW * 2;

  const leftEntries  = entries.slice(0, 2);
  const rightEntries = entries.slice(2, 6);

  const uniqueContributors = entries.map(e => e.contributor).filter(Boolean)
    .filter((c, i, arr) => arr.findIndex(x => x.name === c.name) === i);

  const gutter    = 4;
  const leftImgW  = Math.floor((LIVEW - gutter) / 2);
  const headerH   = 130;
  const leftFolioH = BLEED+MB+14;
  const leftImgH  = AH - BLEED - MT - headerH - 20 - leftFolioH;

  const rightHeaderH = 48;
  const rightFolioH  = BLEED+MB+14;
  const rightGridGap = 4;
  const rightCellW   = Math.floor((LIVEW - rightGridGap) / 2);
  const rightBadgeH  = 28;
  const rightCellH   = Math.floor((AH - BLEED - MT - rightHeaderH - 12 - rightFolioH - rightBadgeH - 8 - rightGridGap) / 2);

  return (
    <div style={{ width:spreadW, height:AH, position:'relative', overflow:'hidden', display:'flex' }}>

      {/* ── LEFT PAGE — dark ── */}
      <div style={{ width:AW, height:AH, background:C.ground, position:'relative', flexShrink:0 }}>

        <div style={{ position:'absolute', top:BLEED+MT, left:BLEED+ML, right:BLEED+MR }}>

          {/* Private Collaboration label */}
          <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:12 }}>
            <div style={{ width:4, height:4, borderRadius:'50%', background:C.terra, flexShrink:0 }}/>
            <span style={{ fontFamily:F.mono, fontSize:8, color:C.paper3, textTransform:'uppercase', letterSpacing:'0.16em' }}>
              Private Collaboration
            </span>
          </div>

          {/* Title */}
          <div style={{
            fontFamily:F.serif, fontSize:42, color:C.paper,
            lineHeight:0.88, letterSpacing:'-0.01em', marginBottom:10,
          }}>
            {collabTitle}
          </div>

          {/* Thin paper5 rule + short gold rule */}
          <div style={{ height:0.5, background:C.paper5, marginBottom:6 }}/>
          <div style={{ width:28, height:1.5, background:C.gold, marginBottom:14 }}/>

          {/* Description */}
          <div style={{
            fontFamily:F.serif, fontStyle:'italic', fontSize:10, color:C.paper3,
            maxWidth:480, lineHeight:1.7, marginBottom:20,
          }}>
            {displayText}
          </div>

          {showAnnotations && <Annotation label="collab_title / displayText" style={{ top:0, left:0 }}/>}
        </div>

        {/* 2 images side-by-side */}
        <div style={{
          position:'absolute',
          top:BLEED+MT+headerH,
          left:BLEED+ML, right:BLEED+MR,
          display:'flex', gap:gutter,
        }}>
          {leftEntries.map((entry, i) => {
            const c = entry.contributor || {};
            return (
              <div key={i} style={{ width:leftImgW, flexShrink:0 }}>
                <div style={{ position:'relative' }}>
                  <ImageFrame w={leftImgW} h={leftImgH} label={entry.title||`image ${i+1}`} focal_x={entry.focal_x||50} focal_y={entry.focal_y||50} media_url={entry.media_url}/>
                  <div style={{ position:'absolute', bottom:8, left:8, fontFamily:F.mono, fontSize:12, color:C.gold }}>
                    {String(i+1).padStart(2,'0')}
                  </div>
                </div>
                <div style={{ marginTop:5 }}>
                  <div style={{ fontFamily:F.mono, fontSize:7.5, color:C.paper3, letterSpacing:'0.06em' }}>{c.name||''}</div>
                  <div style={{ fontFamily:F.serif, fontStyle:'italic', fontSize:8, color:C.paper4, lineHeight:1.4 }}>{entry.title||''}</div>
                </div>
              </div>
            );
          })}
          {showAnnotations && <Annotation label="entries[0..1] side-by-side" style={{ top:0, left:0 }}/>}
        </div>

        {/* Folio dark bottom-left */}
        <div style={{ position:'absolute', bottom:BLEED+MB-14, left:BLEED+ML }}>
          <Folio page={data.page||19} side="left" dark={true} season={season}/>
        </div>

        <RegistrationMark side="left"/>
        <BleedMarks/>
        <GrainOverlay/>
      </div>

      {/* Gutter shadow */}
      <div style={{
        position:'absolute', top:0, left:AW-5, width:10, height:AH, zIndex:10, pointerEvents:'none',
        background:'linear-gradient(to right, rgba(0,0,0,0.35) 0%, rgba(0,0,0,0.04) 50%, rgba(0,0,0,0.22) 100%)',
      }}/>

      {/* ── RIGHT PAGE — dark ── */}
      <div style={{ width:AW, height:AH, background:C.ground, position:'relative', flexShrink:0 }}>

        {/* Members header strip */}
        <div style={{
          position:'absolute', top:BLEED+MT, left:BLEED+ML, right:BLEED+MR,
        }}>
          <div style={{ fontFamily:F.mono, fontSize:8, color:C.terra, textTransform:'uppercase', letterSpacing:'0.16em', marginBottom:5 }}>
            Members
          </div>
          <GoldRule/>
          <div style={{ height:6 }}/>
          {/* All member names inline with gold separator */}
          <div style={{ display:'flex', flexWrap:'wrap', gap:0 }}>
            {uniqueContributors.map((c, i) => (
              <span key={i} style={{ display:'flex', alignItems:'center' }}>
                {i > 0 && <span style={{ color:C.gold, fontFamily:F.mono, fontSize:8, margin:'0 5px' }}>·</span>}
                <span style={{ fontFamily:F.mono, fontSize:7.5, color:C.paper4, letterSpacing:'0.06em' }}>{c.name}</span>
              </span>
            ))}
          </div>
          {showAnnotations && <Annotation label="members list" style={{ top:0, left:0 }}/>}
        </div>

        {/* 2×2 grid — images 03–06 */}
        <div style={{
          position:'absolute',
          top:BLEED+MT+rightHeaderH+12,
          left:BLEED+ML, right:BLEED+MR,
        }}>
          {/* Row 1 */}
          <div style={{ display:'flex', gap:rightGridGap, marginBottom:rightGridGap }}>
            {rightEntries.slice(0,2).map((entry, i) => {
              const globalIdx = i + 2;
              const c = entry.contributor || {};
              return (
                <div key={i} style={{ width:rightCellW, flexShrink:0 }}>
                  <div style={{ position:'relative' }}>
                    <ImageFrame w={rightCellW} h={rightCellH} label={entry.title||`image ${globalIdx+1}`} focal_x={entry.focal_x||50} focal_y={entry.focal_y||50} media_url={entry.media_url}/>
                    <div style={{ position:'absolute', bottom:8, left:8, fontFamily:F.mono, fontSize:12, color:C.gold }}>
                      {String(globalIdx+1).padStart(2,'0')}
                    </div>
                  </div>
                  <div style={{ marginTop:4 }}>
                    <div style={{ fontFamily:F.mono, fontSize:7.5, color:C.paper3, letterSpacing:'0.06em' }}>{c.name||''}</div>
                    <div style={{ fontFamily:F.serif, fontStyle:'italic', fontSize:8, color:C.paper4, lineHeight:1.4 }}>{entry.title||''}</div>
                  </div>
                </div>
              );
            })}
          </div>
          {/* Row 2 */}
          <div style={{ display:'flex', gap:rightGridGap }}>
            {rightEntries.slice(2,4).map((entry, i) => {
              const globalIdx = i + 4;
              const c = entry.contributor || {};
              return (
                <div key={i} style={{ width:rightCellW, flexShrink:0 }}>
                  <div style={{ position:'relative' }}>
                    <ImageFrame w={rightCellW} h={rightCellH} label={entry.title||`image ${globalIdx+1}`} focal_x={entry.focal_x||50} focal_y={entry.focal_y||50} media_url={entry.media_url}/>
                    <div style={{ position:'absolute', bottom:8, left:8, fontFamily:F.mono, fontSize:12, color:C.gold }}>
                      {String(globalIdx+1).padStart(2,'0')}
                    </div>
                  </div>
                  <div style={{ marginTop:4 }}>
                    <div style={{ fontFamily:F.mono, fontSize:7.5, color:C.paper3, letterSpacing:'0.06em' }}>{c.name||''}</div>
                    <div style={{ fontFamily:F.serif, fontStyle:'italic', fontSize:8, color:C.paper4, lineHeight:1.4 }}>{entry.title||''}</div>
                  </div>
                </div>
              );
            })}
          </div>
          {showAnnotations && <Annotation label="entries[2..5] 2×2 grid" style={{ top:0, right:0 }}/>}
        </div>

        {/* Private badge */}
        <div style={{
          position:'absolute', bottom:BLEED+MB+10, right:BLEED+MR,
          background:C.terra, borderRadius:4, padding:'3px 8px',
        }}>
          <span style={{ fontFamily:F.mono, fontSize:7, color:C.paper, letterSpacing:'0.08em' }}>
            Private · Invite Only
          </span>
        </div>

        {/* Folio dark bottom-right */}
        <div style={{ position:'absolute', bottom:BLEED+MB-14, right:BLEED+MR }}>
          <Folio page={(data.page||19)+1} side="right" dark={true} season={season}/>
        </div>

        <RegistrationMark side="right"/>
        <BleedMarks/>
        <GrainOverlay/>
      </div>
    </div>
  );
}

Object.assign(window, { FrontMatter, PoetryPage, CollabSpreadCommunity, CollabSpreadLocal, CollabSpreadPrivate });

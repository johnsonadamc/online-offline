// templates-1-4.jsx — CoverA, SinglePhoto, MultiPhoto2 stacked, MultiPhoto2 side-by-side
// Constants (W, H, BLEED, AW, AH, ML, MR, MT, MB, LIVEW) defined in primitives.jsx

// ─── 1. COVER A ───────────────────────────────────────────────────────────────
// Concept: A "split field" cover. The page is divided by a strong diagonal
// terra rule into a dark top-left zone (type) and a slightly lighter
// bottom-right zone (meta). "online" bleeds off the left edge; "offline"
// is tucked into the lower zone. The // lives alone on the dividing axis —
// oversized, gold, the only warm element at full opacity.

function CoverA({ data={}, showAnnotations=false }) {
  const season = data.season || 'Autumn / Winter 2026';
  const seasonWord = season.split(' / ')[0] || 'Autumn';

  // Divider: a strong horizontal band across page at ~55% height
  const divY = Math.floor(AH * 0.54);

  return (
    <div style={{ width:AW, height:AH, background:C.ground, position:'relative', overflow:'hidden' }}>

      {/* ── Lower zone tint — slightly warmer dark ── */}
      <div style={{
        position:'absolute', top:divY, left:0, right:0, bottom:0,
        background:'#2a261d',
      }}/>

      {/* ── Divider band: gold top edge, terra fill ── */}
      <div style={{ position:'absolute', top:divY, left:0, right:0, height:1, background:C.gold, zIndex:2 }}/>
      <div style={{ position:'absolute', top:divY+1, left:0, right:0, height:3, background:C.terra, zIndex:2 }}/>

      {/* ── "ONLINE" — large, left-anchored, bottom of upper zone ── */}
      <div style={{
        position:'absolute',
        bottom: AH - divY + 8,
        left: BLEED + ML,
        fontFamily:F.serif, fontSize:108, lineHeight:1,
        color:C.paper, letterSpacing:'-0.04em',
        whiteSpace:'nowrap',
      }}>
        online
      </div>

      {/* ── "//" — straddles divider, gold, left-anchored ── */}
      <div style={{
        position:'absolute',
        top: divY - 44,
        left: BLEED + ML + 2,
        fontFamily:F.serif, fontSize:80, lineHeight:1,
        color:C.gold, letterSpacing:'0.02em',
        zIndex:3,
      }}>
        //
      </div>

      {/* ── "OFFLINE" — lower zone, right-aligned, fits within live width ── */}
      <div style={{
        position:'absolute',
        top: divY + 16,
        right: BLEED + MR,
        fontFamily:F.serif, fontSize:108, lineHeight:1,
        color:C.paper, letterSpacing:'-0.04em',
        whiteSpace:'nowrap', opacity:0.92,
      }}>
        offline
      </div>

      {/* ── Top metadata bar ── */}
      <div style={{
        position:'absolute', top:BLEED+18, left:BLEED+ML, right:BLEED+MR,
        display:'flex', justifyContent:'space-between', alignItems:'center',
        zIndex:4,
      }}>
        <div style={{ display:'flex', alignItems:'center', gap:6 }}>
          <div style={{ width:6, height:6, borderRadius:'50%', background:C.terra }}/>
          <span style={{ fontFamily:F.mono, fontSize:7.5, textTransform:'uppercase', letterSpacing:'0.16em', color:'rgba(240,235,226,0.28)' }}>
            Curated Edition
          </span>
        </div>
        <span style={{ fontFamily:F.mono, fontSize:7.5, color:'rgba(240,235,226,0.28)', letterSpacing:'0.12em' }}>
          Vol. IV · No. 13
        </span>
      </div>

      {/* ── Right-side vertical label — upper zone ── */}
      <div style={{
        position:'absolute', top:BLEED+MT, right:BLEED+MR,
        display:'flex', flexDirection:'column', alignItems:'flex-end', gap:6,
        zIndex:4,
      }}>
        <div style={{ fontFamily:F.mono, fontSize:7.5, color:'rgba(240,235,226,0.2)', letterSpacing:'0.12em', textTransform:'uppercase' }}>
          Quarterly Print
        </div>
        <div style={{ width:20, height:0.5, background:'rgba(232,160,32,0.3)' }}/>
      </div>

      {/* ── Bottom-left: season block ── */}
      <div style={{
        position:'absolute', bottom:BLEED+MB, left:BLEED+ML,
        zIndex:4,
      }}>
        <div style={{ width:28, height:1.5, background:C.gold, marginBottom:10 }}/>
        <div style={{
          fontFamily:F.sans, fontWeight:300, fontSize:22,
          textTransform:'uppercase', color:C.paper,
          letterSpacing:'0.20em', lineHeight:1,
        }}>
          {seasonWord}
        </div>
        <div style={{ marginTop:5, fontFamily:F.mono, fontSize:7.5, color:'rgba(240,235,226,0.28)', letterSpacing:'0.10em' }}>
          {season} — Quarterly Curated
        </div>
        {showAnnotations && <Annotation label="period.season" style={{ top:-14, left:0 }}/>}
      </div>

      {/* ── Bottom-right: coordinate + issue ── */}
      <div style={{
        position:'absolute', bottom:BLEED+MB, right:BLEED+MR,
        textAlign:'right', zIndex:4,
      }}>
        <div style={{ fontFamily:F.mono, fontSize:7.5, color:'rgba(240,235,226,0.18)', letterSpacing:'0.10em', lineHeight:1.9 }}>
          2026.Q4<br/>48.8566° N · 2.3522° E
        </div>
      </div>

      {/* ── Thin left-margin vertical rule ── */}
      <div style={{
        position:'absolute', left:BLEED+ML-14,
        top:BLEED+MT+30, bottom:BLEED+MB+30,
        width:0.5, background:'rgba(224,90,40,0.12)',
        zIndex:1,
      }}/>

      <RegistrationMark side="left"/>
      <RegistrationMark side="right"/>
      <BleedMarks/>
      <GrainOverlay/>

      {showAnnotations && (
        <>
          <Annotation label="period.season" style={{ bottom:BLEED+MB+44, left:BLEED+ML }}/>
          <Annotation label="wordmark" style={{ top: divY - 80, left:BLEED+ML }}/>
        </>
      )}
    </div>
  );
}

// ─── 2. SINGLE PHOTO ──────────────────────────────────────────────────────────
function SinglePhoto({ data={}, showAnnotations=false }) {
  const entry = (data.entries || [{}])[0] || {};
  const contributor = data.contributor || {};
  const bandH = 88;
  const imgH = AH - bandH;
  return (
    <div style={{ width:AW, height:AH, background:C.ground, position:'relative', overflow:'hidden' }}>
      {/* Full-bleed image */}
      <div style={{ position:'absolute', top:0, left:0, width:AW, height:imgH }}>
        <ImageFrame w={AW} h={imgH} label="main photograph" focal_x={entry.focal_x||50} focal_y={entry.focal_y||50} media_url={entry.media_url}/>
        {showAnnotations && <Annotation label="content_entry.focal_x / focal_y" style={{ top:8, left:8 }}/>}
      </div>

      {/* Caption band */}
      <div style={{
        position:'absolute', bottom:0, left:0, width:AW, height:bandH,
        background:C.ground, boxSizing:'border-box',
      }}>
        {/* Terra rule at top of band */}
        <div style={{ position:'absolute', top:0, left:0, right:0, height:1.5, background:C.terra }}/>

        <div style={{
          position:'absolute', top:0, left:BLEED+ML, right:BLEED+MR, bottom:0,
          display:'flex', justifyContent:'space-between', alignItems:'flex-start',
          paddingTop:14, paddingBottom:12,
        }}>
          {/* Left: contributor + caption */}
          <div style={{ display:'flex', flexDirection:'column', gap:3, maxWidth:'68%' }}>
            <div style={{ display:'flex', alignItems:'baseline', gap:8 }}>
              <span style={{ fontFamily:F.mono, fontSize:8, color:C.terra, textTransform:'uppercase', letterSpacing:'0.12em' }}>
                {contributor.name || 'Contributor Name'}
              </span>
              <span style={{ fontFamily:F.mono, fontSize:7, color:C.paper4, textTransform:'uppercase', letterSpacing:'0.10em' }}>
                {contributor.city || 'City'}
              </span>
            </div>
            <div style={{ fontFamily:F.serif, fontSize:26, color:C.paper, lineHeight:1, letterSpacing:'-0.01em' }}>
              {data.page_title || 'Collection Title'}
            </div>
            <div style={{ fontFamily:F.serif, fontStyle:'italic', fontSize:9.5, color:C.paper3, lineHeight:1.5, marginTop:2 }}>
              {entry.caption || 'Image caption describing the photograph and its context within the collection.'}
            </div>
          </div>

          {/* Right: section mark + folio */}
          <div style={{ display:'flex', flexDirection:'column', alignItems:'flex-end', gap:6, paddingTop:2 }}>
            <SectionMark>{data.type || 'Photography'}</SectionMark>
            <Folio page={data.page||2} side="right" season={data.season||'Spring 2026'}/>
          </div>
        </div>
      </div>

      {showAnnotations && (
        <>
          <Annotation label="contributor.name" style={{ bottom:bandH-32, left:BLEED+ML }}/>
          <Annotation label="content.page_title" style={{ bottom:bandH-50, left:BLEED+ML }}/>
          <Annotation label="content_entry.caption" style={{ bottom:bandH-66, left:BLEED+ML }}/>
          <Annotation label="content.type" style={{ bottom:bandH-26, right:BLEED+MR }}/>
        </>
      )}

      <RegistrationMark side="left"/>
      <RegistrationMark side="right"/>
      <BleedMarks/>
      <GrainOverlay/>
    </div>
  );
}

// ─── 3. MULTI PHOTO 2 — STACKED ───────────────────────────────────────────────
function MultiPhoto2Stacked({ data={}, showAnnotations=false }) {
  const entries = data.entries || [{},{} ];
  const contributor = data.contributor || {};
  const headerH = 58;        // header block height below MT
  const folioH = 22;         // folio line height
  const captionRowH = 34;    // per-image caption block height
  const imgGap = 9;          // gap between images
  // total vertical space available for images + captions
  const availH = H - MT - headerH - 12 - captionRowH - imgGap - captionRowH - folioH - MB - 8;
  const pri = Math.floor(availH * 0.62);
  const sec = availH - pri;

  return (
    <div style={{ width:AW, height:AH, background:C.paper, position:'relative', overflow:'hidden' }}>
      <VerticalContributorLabel
        name={contributor.name || 'Contributor Name'}
        type={data.type || 'Photography'}
        issue={data.season || 'Spring 2026'}
      />

      {/* Header */}
      <div style={{ position:'absolute', top:BLEED+MT, left:BLEED+ML, right:BLEED+MR }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:6 }}>
          <SectionMark>{data.type || 'Photography'}</SectionMark>
          <GoldMark>{data.season || 'Spring 2026'}</GoldMark>
        </div>
        <DoubleRule/>
        <div style={{ display:'flex', alignItems:'baseline', gap:12, marginTop:10 }}>
          <span style={{ fontFamily:F.serif, fontSize:28, color:C.ground, letterSpacing:'-0.01em', lineHeight:1 }}>
            {data.page_title || 'Collection Title'}
          </span>
          <span style={{ fontFamily:F.mono, fontSize:8, color:C.terra, textTransform:'uppercase', letterSpacing:'0.10em' }}>
            {contributor.name || 'Contributor Name'}
          </span>
          <span style={{ fontFamily:F.mono, fontSize:7, color:C.paper4, letterSpacing:'0.08em' }}>
            {contributor.city || 'City'}
          </span>
        </div>
        {showAnnotations && (
          <>
            <Annotation label="content.type" style={{ top:0, left:0 }}/>
            <Annotation label="period.season" style={{ top:0, right:0 }}/>
            <Annotation label="content.page_title" style={{ top:28, left:0 }}/>
            <Annotation label="contributor.name" style={{ top:28, left:280 }}/>
          </>
        )}
      </div>

      {/* Primary image */}
      <div style={{ position:'absolute', top:BLEED+MT+headerH+12, left:BLEED+ML, width:LIVEW, overflow:'hidden' }}>
        {/* Terra vertical rule on left edge */}
        <div style={{ display:'flex' }}>
          <div style={{ width:2, background:C.terra, flexShrink:0, alignSelf:'stretch' }}/>
          <ImageFrame w={LIVEW-2} h={pri} label={`entry 1 — ${entries[0]?.title||'primary image'}`} n="01" focal_x={entries[0]?.focal_x||50} focal_y={entries[0]?.focal_y||50} media_url={entries[0]?.media_url}/>
        </div>
        <div style={{ marginTop:5, display:'flex', flexDirection:'column', gap:2 }}>
          <span style={{ fontFamily:F.serif, fontStyle:'italic', fontSize:10, color:C.ground }}>{entries[0]?.title||'Primary Image Title'}</span>
          <span style={{ fontFamily:F.sans, fontSize:9, color:C.paper4, lineHeight:1.5 }}>{entries[0]?.caption||'Caption describing the primary photograph.'}</span>
        </div>
        {showAnnotations && <Annotation label="content_entry[0].title / caption" style={{ top:0, right:0 }}/>}

        {/* Secondary image */}
        <div style={{ marginTop:9 }}>
          <ImageFrame w={LIVEW} h={sec} label={`entry 2 — ${entries[1]?.title||'secondary image'}`} n="02" focal_x={entries[1]?.focal_x||50} focal_y={entries[1]?.focal_y||50} media_url={entries[1]?.media_url}/>
          <div style={{ marginTop:5, display:'flex', flexDirection:'column', gap:2 }}>
            <span style={{ fontFamily:F.serif, fontStyle:'italic', fontSize:10, color:C.ground }}>{entries[1]?.title||'Secondary Image Title'}</span>
            <span style={{ fontFamily:F.sans, fontSize:9, color:C.paper4, lineHeight:1.5 }}>{entries[1]?.caption||'Caption for the secondary photograph.'}</span>
          </div>
          {showAnnotations && <Annotation label="content_entry[1].title / caption" style={{ top:0, right:0 }}/>}
        </div>
      </div>

      {/* Folio */}
      <div style={{ position:'absolute', bottom:BLEED+MB, left:BLEED+ML, right:BLEED+MR, display:'flex', justifyContent:'space-between' }}>
        <Folio page={data.page||4} side="left" season={data.season||'Spring 2026'}/>
        <Folio page={data.page||4} side="right" season={data.season||'Spring 2026'}/>
      </div>

      <RegistrationMark side="left"/>
      <RegistrationMark side="right"/>
      <BleedMarks dark={true}/>
      <GrainOverlay/>
    </div>
  );
}

// ─── 4. MULTI PHOTO 2 — SIDE BY SIDE ─────────────────────────────────────────
function MultiPhoto2SideBySide({ data={}, showAnnotations=false }) {
  const entries = data.entries || [{},{}];
  const contributor = data.contributor || {};
  const leftW = Math.floor(LIVEW * 0.55);
  const rightW = LIVEW - leftW - 3; // 3px for the terra gutter rule
  const headerH = 72;
  const folioH = 22;
  const captionH = 38; // captions below images
  const imgH = H - MT - headerH - MB - captionH - folioH - 8; // 8px breathing room

  return (
    <div style={{ width:AW, height:AH, background:C.paper, position:'relative', overflow:'hidden' }}>
      {/* Header */}
      <div style={{ position:'absolute', top:BLEED+MT, left:BLEED+ML, right:BLEED+MR }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start' }}>
          <div style={{ fontFamily:F.serif, fontSize:44, color:C.ground, letterSpacing:'-0.02em', lineHeight:1, maxWidth:'65%' }}>
            {data.page_title || 'Collection Title'}
          </div>
          <div style={{ display:'flex', flexDirection:'column', alignItems:'flex-end', gap:3, paddingTop:4 }}>
            <span style={{ fontFamily:F.mono, fontSize:8, color:C.terra, textTransform:'uppercase', letterSpacing:'0.10em' }}>
              {contributor.name || 'Contributor Name'}
            </span>
            <span style={{ fontFamily:F.mono, fontSize:7, color:C.paper4, letterSpacing:'0.08em' }}>
              {contributor.city || 'City'}
            </span>
            <span style={{ fontFamily:F.mono, fontSize:7.5, color:C.paper4, letterSpacing:'0.08em' }}>
              {data.season || 'Spring 2026'}
            </span>
          </div>
        </div>
        <div style={{ marginTop:10 }}>
          <TerraRule thickness={3}/>
        </div>
        {showAnnotations && (
          <>
            <Annotation label="content.page_title" style={{ top:0, left:0 }}/>
            <Annotation label="contributor.name" style={{ top:0, right:0 }}/>
            <Annotation label="period.season" style={{ top:18, right:0 }}/>
          </>
        )}
      </div>

      {/* Images side by side */}
      <div style={{ position:'absolute', top:BLEED+MT+headerH, left:BLEED+ML, right:BLEED+MR }}>
        <div style={{ display:'flex', alignItems:'flex-start', gap:0 }}>
          {/* Left image */}
          <div style={{ width:leftW, flexShrink:0 }}>
            <ImageFrame w={leftW} h={imgH} label={entries[0]?.title||'left image'} focal_x={entries[0]?.focal_x||50} focal_y={entries[0]?.focal_y||50} media_url={entries[0]?.media_url}/>
            <div style={{ marginTop:6, paddingRight:8 }}>
              <div style={{ fontFamily:F.serif, fontStyle:'italic', fontSize:9.5, color:C.ground }}>{entries[0]?.title||'Left Image Title'}</div>
              <div style={{ fontFamily:F.sans, fontSize:9, color:C.paper4, lineHeight:1.5, marginTop:2 }}>{entries[0]?.caption||'Caption for left image.'}</div>
            </div>
            {showAnnotations && <Annotation label="content_entry[0].title/caption" style={{ top:0, left:0 }}/>}
          </div>

          {/* Terra gutter rule */}
          <div style={{ width:3, background:C.terra, height:imgH, flexShrink:0 }}/>

          {/* Right image */}
          <div style={{ width:rightW, flexShrink:0 }}>
            <ImageFrame w={rightW} h={imgH} label={entries[1]?.title||'right image'} focal_x={entries[1]?.focal_x||50} focal_y={entries[1]?.focal_y||50} media_url={entries[1]?.media_url}/>
            <div style={{ marginTop:6, paddingLeft:8 }}>
              <div style={{ fontFamily:F.serif, fontStyle:'italic', fontSize:9.5, color:C.ground }}>{entries[1]?.title||'Right Image Title'}</div>
              <div style={{ fontFamily:F.sans, fontSize:9, color:C.paper4, lineHeight:1.5, marginTop:2 }}>{entries[1]?.caption||'Caption for right image.'}</div>
            </div>
            {showAnnotations && <Annotation label="content_entry[1].title/caption" style={{ top:0, right:0 }}/>}
          </div>
        </div>
      </div>

      {/* Folio */}
      <div style={{ position:'absolute', bottom:BLEED+MB, left:BLEED+ML, right:BLEED+MR, display:'flex', justifyContent:'space-between' }}>
        <Folio page={data.page||6} side="left" season={data.season||'Spring 2026'}/>
        <Folio page={data.page||6} side="right" season={data.season||'Spring 2026'}/>
      </div>

      <RegistrationMark side="left"/>
      <RegistrationMark side="right"/>
      <BleedMarks dark={true}/>
      <GrainOverlay/>
    </div>
  );
}

Object.assign(window, { CoverA, SinglePhoto, MultiPhoto2Stacked, MultiPhoto2SideBySide, W, H, BLEED, AW, AH, ML, MR, MT, MB, LIVEW });

// templates-5-8.jsx — MultiPhoto4 feature, MultiPhoto4 2x2, TextSubmission, CollabPage

// ─── 5. MULTI PHOTO 4 — FEATURE + SUPPORTING ──────────────────────────────────
function MultiPhoto4Feature({ data={}, showAnnotations=false }) {
  const entries = data.entries || [{},{},{},{}];
  const contributor = data.contributor || {};
  const headerH = 58;
  const leftColW = Math.floor(LIVEW * 0.57);
  const rightColW = LIVEW - leftColW - 9; // 9px gap
  const captionH = 30; // height reserved below feature image for caption
  const folioH = 28;   // height reserved for folio
  const contentH = H - MT - headerH - 20 - MB - captionH - folioH;
  const rightImgH = Math.floor((contentH - 18) / 3); // 3 images, 9px gaps × 2

  return (
    <div style={{ width:AW, height:AH, background:C.paper, position:'relative', overflow:'hidden' }}>
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
            <Annotation label="contributor.name" style={{ top:28, left:240 }}/>
          </>
        )}
      </div>

      {/* Layout: left col (feature) + right col (3 supporting) */}
      <div style={{ position:'absolute', top:BLEED+MT+headerH+16, left:BLEED+ML, right:BLEED+MR, display:'flex', gap:9 }}>
        {/* Left: feature image */}
        <div style={{ width:leftColW, flexShrink:0 }}>
          <div style={{ position:'relative' }}>
            <ImageFrame w={leftColW} h={contentH} label={entries[0]?.title||'feature image'} focal_x={entries[0]?.focal_x||50} focal_y={entries[0]?.focal_y||50}/>
            {/* Gold index number overlay */}
            <div style={{ position:'absolute', bottom:8, left:8, fontFamily:F.mono, fontSize:12, color:C.gold, letterSpacing:'0.04em' }}>01</div>
            {showAnnotations && <Annotation label="content_entry[0] focal_x/y" style={{ top:8, left:8 }}/>}
          </div>
          <div style={{ marginTop:5 }}>
            <div style={{ fontFamily:F.serif, fontStyle:'italic', fontSize:9.5, color:C.ground }}>{entries[0]?.title||'Feature Image Title'}</div>
            <div style={{ fontFamily:F.sans, fontSize:9, color:C.paper4, lineHeight:1.5, marginTop:2 }}>{entries[0]?.caption||'Caption for the feature image.'}</div>
          </div>
          {showAnnotations && <Annotation label="content_entry[0].title/caption" style={{ bottom:0, left:0 }}/>}
        </div>

        {/* Right: 3 supporting images stacked */}
        <div style={{ width:rightColW, flexShrink:0, display:'flex', flexDirection:'column', gap:9 }}>
          {[1,2,3].map(i => (
            <div key={i} style={{ position:'relative' }}>
              <ImageFrame
                w={rightColW} h={rightImgH}
                label={entries[i]?.title||`supporting image ${i}`}
                focal_x={entries[i]?.focal_x||50} focal_y={entries[i]?.focal_y||50}
              />
              <div style={{ position:'absolute', bottom:6, left:6, fontFamily:F.mono, fontSize:12, color:C.gold, letterSpacing:'0.04em' }}>
                0{i+1}
              </div>
            </div>
          ))}
          {/* Right column captions: index list */}
          <div style={{ display:'flex', flexDirection:'column', gap:3, marginTop:2 }}>
            {[1,2,3].map(i => (
              <div key={i} style={{ display:'flex', gap:6, alignItems:'baseline' }}>
                <span style={{ fontFamily:F.mono, fontSize:8, color:C.gold, letterSpacing:'0.08em', flexShrink:0 }}>0{i+1}</span>
                <span style={{ fontFamily:F.mono, fontSize:8, color:C.paper4 }}>{entries[i]?.title||`Supporting Image ${i} Title`}</span>
              </div>
            ))}
          </div>
          {showAnnotations && <Annotation label="content_entry[1..3].title" style={{ bottom:0, right:0 }}/>}
        </div>
      </div>

      {/* Folio */}
      <div style={{ position:'absolute', bottom:BLEED+MB-14, left:BLEED+ML, right:BLEED+MR, display:'flex', justifyContent:'space-between' }}>
        <Folio page={data.page||8} side="left" season={data.season||'Spring 2026'}/>
        <Folio page={data.page||8} side="right" season={data.season||'Spring 2026'}/>
      </div>

      <RegistrationMark side="left"/>
      <RegistrationMark side="right"/>
      <BleedMarks dark={true}/>
      <GrainOverlay/>
    </div>
  );
}

// ─── 6. MULTI PHOTO 4 — 2×2 GRID ──────────────────────────────────────────────
function MultiPhoto4Grid({ data={}, showAnnotations=false }) {
  const entries = data.entries || [{},{},{},{}];
  const contributor = data.contributor || {};
  const topPad = BLEED;
  const bandH = topPad + 68;
  const gutterSize = 4;
  const captionRowH = 40;
  const folioH = BLEED + MB;
  const gridH = AH - bandH - captionRowH - folioH;
  const cellW = Math.floor((AW - gutterSize) / 2);
  const cellH = Math.floor((gridH - gutterSize) / 2);

  return (
    <div style={{ width:AW, height:AH, background:C.ground, position:'relative', overflow:'hidden' }}>
      {/* Header band */}
      <div style={{
        position:'absolute', top:0, left:0, width:AW, height:bandH,
        background:C.ground,
        borderBottom:`1px solid ${C.terra}`,
        boxSizing:'border-box',
        display:'flex', alignItems:'center',
        paddingLeft:BLEED+ML, paddingRight:BLEED+MR,
        justifyContent:'space-between',
      }}>
        <div>
          <div style={{ fontFamily:F.serif, fontSize:36, color:C.paper, letterSpacing:'-0.01em', lineHeight:1 }}>
            {data.page_title || 'Collection Title'}
          </div>
          {showAnnotations && <Annotation label="content.page_title" style={{ bottom:0, left:0 }}/>}
        </div>
        <div style={{ display:'flex', flexDirection:'column', alignItems:'flex-end', gap:3 }}>
          <span style={{ fontFamily:F.mono, fontSize:8, color:C.paper3, textTransform:'uppercase', letterSpacing:'0.10em' }}>
            {contributor.name || 'Contributor Name'}
          </span>
          <span style={{ fontFamily:F.mono, fontSize:7, color:C.paper4, letterSpacing:'0.08em' }}>
            {contributor.city || 'City'}
          </span>
          <SectionMark>{data.type || 'Photography'}</SectionMark>
          {showAnnotations && (
            <>
              <Annotation label="contributor.name" style={{ top:0, right:0 }}/>
              <Annotation label="contributor.city" style={{ top:14, right:0 }}/>
              <Annotation label="content.type" style={{ top:28, right:0 }}/>
            </>
          )}
        </div>
      </div>

      {/* 2×2 image grid */}
      <div style={{ position:'absolute', top:bandH, left:0, width:AW }}>
        {/* Row 1 */}
        <div style={{ display:'flex', gap:gutterSize, marginBottom:gutterSize }}>
          {[0,1].map(i => (
            <div key={i} style={{ position:'relative', width:cellW, height:cellH, flexShrink:0 }}>
              <ImageFrame w={cellW} h={cellH} label={entries[i]?.title||`image ${i+1}`} focal_x={entries[i]?.focal_x||50} focal_y={entries[i]?.focal_y||50}/>
              <div style={{ position:'absolute', bottom:8, left:8, fontFamily:F.mono, fontSize:13, color:C.gold }}>0{i+1}</div>
              {showAnnotations && <Annotation label={`entry[${i}] focal`} style={{ top:4, left:4 }}/>}
            </div>
          ))}
        </div>
        {/* Row 2 */}
        <div style={{ display:'flex', gap:gutterSize }}>
          {[2,3].map(i => (
            <div key={i} style={{ position:'relative', width:cellW, height:cellH, flexShrink:0 }}>
              <ImageFrame w={cellW} h={cellH} label={entries[i]?.title||`image ${i+1}`} focal_x={entries[i]?.focal_x||50} focal_y={entries[i]?.focal_y||50}/>
              <div style={{ position:'absolute', bottom:8, left:8, fontFamily:F.mono, fontSize:13, color:C.gold }}>0{i+1}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Caption row */}
      <div style={{
        position:'absolute', bottom:folioH, left:0, width:AW, height:captionRowH,
        borderTop:`0.5px solid rgba(240,235,226,0.14)`,
        display:'flex', alignItems:'center',
        paddingLeft:BLEED+ML, paddingRight:BLEED+MR,
        boxSizing:'border-box',
      }}>
        {/* 2 caption columns matching grid columns */}
        {[0,1].map(col => (
          <div key={col} style={{ width:'50%', paddingTop:8, paddingRight:col===0?16:0, paddingLeft:col===1?16:0, boxSizing:'border-box' }}>
            <div style={{ display:'flex', gap:6, marginBottom:3 }}>
              {[col*2, col*2+1].map(i => (
                <div key={i} style={{ flex:1 }}>
                  <div style={{ fontFamily:F.mono, fontSize:8, color:C.paper3, marginBottom:2 }}>{entries[i]?.title||`Image 0${i+1}`}</div>
                  <div style={{ fontFamily:F.mono, fontSize:7.5, color:C.paper4, lineHeight:1.4 }}>{entries[i]?.caption||'Caption text.'}</div>
                  {showAnnotations && <Annotation label={`entry[${i}].title/caption`} style={{ top:0, left:0 }}/>}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Folio */}
      <div style={{ position:'absolute', bottom:BLEED+MB-16, left:BLEED+ML, right:BLEED+MR, display:'flex', justifyContent:'space-between' }}>
        <Folio page={data.page||10} side="left" dark={true} season={data.season||'Spring 2026'}/>
        <Folio page={data.page||10} side="right" dark={true} season={data.season||'Spring 2026'}/>
      </div>

      <RegistrationMark side="left"/>
      <RegistrationMark side="right"/>
      <BleedMarks/>
      <GrainOverlay/>
    </div>
  );
}

// ─── 7. TEXT SUBMISSION ────────────────────────────────────────────────────────
function TextSubmission({ data={}, showAnnotations=false }) {
  const contributor = data.contributor || {};
  const bodyText1 = data.body_para1 || 'The light changed before we noticed it had moved at all. That is the way of certain mornings — they arrive quietly, without announcement, and are already half-spent before attention finds them. She had been standing at the window for some time, watching the quality of the air above the rooftops, the particular way it held the early fog.';
  const bodyText2 = data.body_para2 || 'Later, sorting through the photographs, she would try to identify the exact moment the shift occurred. It was not in any single frame. It lived between them, in the gap the camera could not close — that interval of pure unrecorded time where the real change had quietly taken place without witness.';
  const bodyText3 = data.body_para3 || 'There is a discipline in waiting for the right light. Most people mistake it for patience. It is closer to a form of grief: the acceptance that what you are waiting for may not come, and that you will wait anyway, because the waiting itself has become the practice.';
  const pullQuote = data.pull_quote || '"It lived between the frames — in the gap the camera could not close."';

  return (
    <div style={{ width:AW, height:AH, background:C.paper, position:'relative', overflow:'hidden' }}>
      <VerticalContributorLabel
        name={contributor.name || 'Contributor Name'}
        type={data.type || 'Essay'}
        issue={data.season || 'Spring 2026'}
      />

      {/* Main content area */}
      <div style={{ position:'absolute', top:BLEED+MT, left:BLEED+ML, right:BLEED+MR }}>
        <DoubleRule/>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginTop:8, marginBottom:12 }}>
          <SectionMark>{data.type || 'Essay'}</SectionMark>
          <GoldMark>{data.season || 'Spring 2026'}</GoldMark>
        </div>

        {/* Title */}
        <div style={{ fontFamily:F.serif, fontStyle:'italic', fontSize:58, color:C.ground, lineHeight:0.92, letterSpacing:'-0.02em', marginBottom:14 }}>
          {data.page_title || 'Between the Frames'}
        </div>

        {/* Short terra rule + full-width paper-5 rule inline */}
        <div style={{ display:'flex', alignItems:'center', gap:0, marginBottom:10 }}>
          <div style={{ width:28, height:1.5, background:C.terra, flexShrink:0 }}/>
          <div style={{ flex:1, height:0.5, background:C.paper5, marginLeft:0 }}/>
        </div>

        {/* Contributor meta */}
        <div style={{ display:'flex', alignItems:'center', gap:0, marginBottom:16 }}>
          <span style={{ fontFamily:F.mono, fontSize:8.5, color:C.terra, letterSpacing:'0.10em', textTransform:'uppercase' }}>
            {contributor.name || 'Contributor Name'}
          </span>
          <span style={{ width:0.5, height:10, background:C.paper5, display:'inline-block', margin:'0 8px', verticalAlign:'middle' }}/>
          <span style={{ fontFamily:F.mono, fontSize:8.5, color:C.paper4, letterSpacing:'0.08em' }}>
            {contributor.city || 'City'}
          </span>
          <span style={{ width:0.5, height:10, background:C.paper5, display:'inline-block', margin:'0 8px', verticalAlign:'middle' }}/>
          <span style={{ fontFamily:F.mono, fontSize:8.5, color:C.paper4, letterSpacing:'0.08em' }}>
            {data.word_count || '1,240'} words
          </span>
          <span style={{ width:0.5, height:10, background:C.paper5, display:'inline-block', margin:'0 8px', verticalAlign:'middle' }}/>
          <span style={{ fontFamily:F.mono, fontSize:8.5, color:C.paper4, letterSpacing:'0.08em' }}>
            {data.season || 'Spring 2026'}
          </span>
        </div>

        {/* Body text — first paragraph with drop cap */}
        <div style={{ fontFamily:F.serif, fontSize:12.5, lineHeight:1.88, color:C.ground }}>
          <p style={{ margin:0, marginBottom:10 }}>
            <span style={{
              float:'left', fontSize:70, lineHeight:0.78, fontFamily:F.serif,
              color:C.ground, marginRight:6, marginTop:6, marginBottom:0,
            }}>
              {bodyText1[0]}
            </span>
            {bodyText1.slice(1)}
          </p>

          {/* Pull quote */}
          <div style={{
            borderLeft:`3px solid ${C.gold}`,
            background:'rgba(232,160,32,0.06)',
            paddingLeft:14, paddingTop:10, paddingBottom:10, paddingRight:10,
            margin:'12px 0',
            fontFamily:F.serif, fontStyle:'italic', fontSize:18, color:C.ground,
            lineHeight:1.42,
            clear:'both',
          }}>
            {pullQuote}
          </div>

          <p style={{ margin:0, marginBottom:10 }}>{bodyText2}</p>
          <p style={{ margin:0 }}>{bodyText3}</p>
        </div>

        {showAnnotations && (
          <>
            <Annotation label="content.page_title" style={{ top:36, left:0 }}/>
            <Annotation label="contributor.name" style={{ top:108, left:0 }}/>
            <Annotation label="body text + drop cap" style={{ top:140, left:0 }}/>
            <Annotation label="pull_quote" style={{ top:270, left:0 }}/>
          </>
        )}
      </div>

      {/* Folio */}
      <div style={{ position:'absolute', bottom:BLEED+MB-14, left:BLEED+ML, right:BLEED+MR, display:'flex', justifyContent:'space-between' }}>
        <Folio page={data.page||12} side="left" season={data.season||'Spring 2026'}/>
        <Folio page={data.page||12} side="right" season={data.season||'Spring 2026'}/>
      </div>

      <RegistrationMark side="left"/>
      <RegistrationMark side="right"/>
      <BleedMarks dark={true}/>
      <GrainOverlay/>
    </div>
  );
}

// ─── 8. COLLAB PAGE ────────────────────────────────────────────────────────────
function CollabPage({ data={}, showAnnotations=false }) {
  const contributors = data.contributors || [
    { name:'A. Chen', city:'Shanghai' },
    { name:'M. Osei', city:'Accra' },
    { name:'L. Varga', city:'Budapest' },
    { name:'R. Patel', city:'Mumbai' },
    { name:'S. Müller', city:'Berlin' },
    { name:'T. Nakamura', city:'Osaka' },
  ];
  const entries = data.entries || contributors.map((c,i) => ({ title:`Untitled ${i+1}`, contributor:c }));
  const bandH = BLEED + 90;
  const descH = 36;
  const creditsH = 28;
  const folioH = 24;
  const gridTop = bandH + 14 + descH + 10;
  const gridH = AH - gridTop - creditsH - folioH - 16;
  const colW = Math.floor(LIVEW / 3);
  const rowH = Math.floor(gridH / 2);
  const imgH = rowH - 28; // 28 for caption below

  return (
    <div style={{ width:AW, height:AH, background:C.paper, position:'relative', overflow:'hidden' }}>
      {/* Header band */}
      <div style={{
        position:'absolute', top:0, left:0, width:AW, height:bandH,
        background:C.ground,
        borderBottom:`1px solid ${C.terra}`,
        boxSizing:'border-box',
        paddingLeft:BLEED+ML, paddingRight:BLEED+MR,
        display:'flex', alignItems:'flex-end', paddingBottom:14,
        justifyContent:'space-between',
      }}>
        <div>
          <div style={{ marginBottom:6 }}><SectionMark>Collaboration</SectionMark></div>
          <div style={{ fontFamily:F.serif, fontSize:34, color:C.paper, letterSpacing:'-0.01em', lineHeight:1 }}>
            {data.collab_title || 'Shared Light'}
          </div>
        </div>
        <div style={{ display:'flex', flexDirection:'column', alignItems:'flex-end', gap:4 }}>
          <GoldMark>{data.mode || 'Community'}</GoldMark>
          <span style={{ fontFamily:F.mono, fontSize:8, color:C.paper4, letterSpacing:'0.08em' }}>
            {contributors.length} contributors
          </span>
        </div>
        {showAnnotations && (
          <>
            <Annotation label="collab_title" style={{ bottom:14, left:BLEED+ML }}/>
            <Annotation label="mode" style={{ top:BLEED+14, right:BLEED+MR }}/>
          </>
        )}
      </div>

      {/* Collab description */}
      <div style={{
        position:'absolute', top:bandH+14, left:BLEED+ML, right:BLEED+MR,
        fontFamily:F.serif, fontStyle:'italic', fontSize:9.5, color:C.paper3, lineHeight:1.6,
      }}>
        {data.display_text || 'A collaborative submission — contributors responding to a shared theme across cities, disciplines, and ways of seeing. Each image was made independently, without knowledge of the others.'}
        {showAnnotations && <Annotation label="collab_templates.display_text" style={{ top:0, right:0 }}/>}
      </div>

      {/* 3-column image grid — 2 rows = 6 cells */}
      <div style={{ position:'absolute', top:gridTop, left:BLEED+ML, right:BLEED+MR }}>
        <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
          {[0,1].map(row => (
            <div key={row} style={{ display:'flex', gap:8 }}>
              {[0,1,2].map(col => {
                const idx = row*3+col;
                const e = entries[idx] || {};
                const c = e.contributor || contributors[idx] || {};
                return (
                  <div key={col} style={{ width:colW, flexShrink:0 }}>
                    <div style={{ position:'relative' }}>
                      <ImageFrame w={colW} h={imgH} label={c.name||'contributor'} focal_x={e.focal_x||50} focal_y={e.focal_y||50}/>
                      <div style={{ position:'absolute', top:5, left:6, fontFamily:F.mono, fontSize:9, color:C.gold }}>
                        {String(idx+1).padStart(2,'0')}
                      </div>
                    </div>
                    <div style={{ marginTop:4 }}>
                      <div style={{ fontFamily:F.mono, fontSize:8, color:C.paper3, letterSpacing:'0.06em' }}>{c.name||'Name'}</div>
                      <div style={{ fontFamily:F.serif, fontStyle:'italic', fontSize:8, color:C.paper4, lineHeight:1.4 }}>{e.title||'Untitled'}</div>
                    </div>
                    {showAnnotations && idx===0 && <Annotation label="contributor.name / entry.title" style={{ bottom:0, left:0 }}/>}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>

      {/* Credits row */}
      <div style={{
        position:'absolute', bottom:folioH+8, left:BLEED+ML, right:BLEED+MR,
        borderTop:`0.5px solid rgba(240,235,226,0.14)`,
        paddingTop:7,
        fontFamily:F.mono, fontSize:7.5, color:C.paper5, textTransform:'uppercase', letterSpacing:'0.10em',
        display:'flex', flexWrap:'wrap', gap:0,
      }}>
        {contributors.map((c, i) => (
          <span key={i} style={{ display:'flex', alignItems:'center' }}>
            {i > 0 && <span style={{ color:C.gold, margin:'0 5px' }}>·</span>}
            <span>{c.name}</span>
          </span>
        ))}
      </div>

      {/* Folio */}
      <div style={{ position:'absolute', bottom:BLEED+4, left:BLEED+ML, right:BLEED+MR, display:'flex', justifyContent:'space-between' }}>
        <Folio page={data.page||14} side="left" season={data.season||'Spring 2026'}/>
        <Folio page={data.page||14} side="right" season={data.season||'Spring 2026'}/>
      </div>

      <RegistrationMark side="left"/>
      <RegistrationMark side="right"/>
      <BleedMarks dark={true}/>
      <GrainOverlay/>
    </div>
  );
}

Object.assign(window, { MultiPhoto4Feature, MultiPhoto4Grid, TextSubmission, CollabPage });

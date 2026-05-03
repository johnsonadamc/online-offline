// templates-18-19.jsx — SpreadPanorama, SpreadMosaic

// ─── 18. SPREAD PANORAMA ──────────────────────────────────────────────────────
// Single photograph printed continuously across both pages as one canvas.
// Full bleed top/bottom/outer edges. Gutter interruption is intentional.
// Caption band at very bottom spanning full spread width.
function SpreadPanorama({ data={}, showAnnotations=false }) {
  const entry = (data.entries || [{}])[0] || {};
  const contributor = data.contributor || { name: 'A. Chen', city: 'Shanghai' };
  const spreadW = AW * 2;
  const bandH = 72;

  return (
    <div style={{ width: spreadW, height: AH, position: 'relative', overflow: 'hidden', display: 'flex' }}>

      {/* ── FULL-SPREAD IMAGE — both pages as one canvas ── */}
      {/* Left page image half */}
      <div style={{ width: AW, height: AH, position: 'relative', flexShrink: 0, overflow: 'hidden' }}>
        <div style={{ position: 'absolute', top: 0, left: 0, width: spreadW, height: AH }}>
          <ImageFrame
            w={spreadW} h={AH}
            label="panorama image — full spread"
            focal_x={entry.focal_x || 42}
            focal_y={entry.focal_y || 38}
            media_url={entry.media_url}
          />
        </div>

        {/* Wordmark top-left of left page */}
        <div style={{
          position: 'absolute', top: BLEED + MT - 28, left: BLEED + ML,
          fontFamily: F.mono, fontSize: 8, letterSpacing: '0.10em', zIndex: 5,
        }}>
          <span style={{ color: 'rgba(224,90,40,0.55)' }}>online</span>
          <span style={{ color: C.terra }}>//</span>
          <span style={{ color: 'rgba(224,90,40,0.55)' }}>offline</span>
        </div>

        <RegistrationMark side="left"/>
        <BleedMarks/>
        <GrainOverlay/>
      </div>

      {/* Gutter shadow */}
      <div style={{
        position: 'absolute', top: 0, left: AW - 5, width: 10, height: AH, zIndex: 10, pointerEvents: 'none',
        background: 'linear-gradient(to right, rgba(0,0,0,0.30) 0%, rgba(0,0,0,0.04) 50%, rgba(0,0,0,0.18) 100%)',
      }}/>

      {/* Right page image half */}
      <div style={{ width: AW, height: AH, position: 'relative', flexShrink: 0, overflow: 'hidden' }}>
        <div style={{ position: 'absolute', top: 0, left: -AW, width: spreadW, height: AH }}>
          <ImageFrame
            w={spreadW} h={AH}
            label="panorama image — full spread"
            focal_x={entry.focal_x || 42}
            focal_y={entry.focal_y || 38}
            media_url={entry.media_url}
          />
        </div>

        <RegistrationMark side="right"/>
        <BleedMarks/>
        <GrainOverlay/>
      </div>

      {/* ── CAPTION BAND — spans full spread width, positioned over both pages ── */}
      <div style={{
        position: 'absolute',
        bottom: 0, left: 0,
        width: spreadW, height: bandH,
        background: 'rgba(37,33,25,0.88)',
        zIndex: 6,
        boxSizing: 'border-box',
      }}>
        {/* Terra rule at top of band */}
        <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: 1.5, background: C.terra }}/>

        {/* Band content — left margin of left page to right margin of right page */}
        <div style={{
          position: 'absolute', top: 0, bottom: 0,
          left: BLEED + ML, right: BLEED + MR,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          gap: 16,
        }}>

          {/* Left: contributor name + city stacked, page title below */}
          <div style={{ flexShrink: 0, minWidth: 160 }}>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 5 }}>
              <span style={{ fontFamily: F.mono, fontSize: 8, color: C.terra, textTransform: 'uppercase', letterSpacing: '0.12em' }}>
                {contributor.name || 'Contributor Name'}
              </span>
              <span style={{ fontFamily: F.mono, fontSize: 7, color: C.paper4, textTransform: 'uppercase', letterSpacing: '0.10em' }}>
                {contributor.city || 'City'}
              </span>
            </div>
            <div style={{ fontFamily: F.serif, fontSize: 22, color: C.paper, lineHeight: 1, letterSpacing: '-0.01em' }}>
              {data.page_title || 'The Hour Before'}
            </div>
            {showAnnotations && <Annotation label="contributor.name / city / page_title" style={{ top: 0, left: 0 }}/>}
          </div>

          {/* Center: caption text */}
          <div style={{
            fontFamily: F.serif, fontStyle: 'italic', fontSize: 9.5, color: C.paper3,
            maxWidth: 340, textAlign: 'center', lineHeight: 1.55, flexShrink: 1,
          }}>
            {entry.caption || 'A caption describing the panoramic photograph and the moment it captures.'}
            {showAnnotations && <Annotation label="entry.caption" style={{ top: 0, left: 0 }}/>}
          </div>

          {/* Right: SectionMark + GoldMark stacked, folio below */}
          <div style={{ flexShrink: 0, minWidth: 120, display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
            <SectionMark>{data.type || 'Photography'}</SectionMark>
            <GoldMark>{data.season || 'Spring 2026'}</GoldMark>
            <div style={{ marginTop: 2 }}>
              <Folio page={data.page || 30} side="right" dark={true} season={data.season || 'Spring 2026'}/>
            </div>
            {showAnnotations && <Annotation label="type / season / folio" style={{ top: 0, right: 0 }}/>}
          </div>

        </div>
      </div>

    </div>
  );
}

// ─── 19. SPREAD MOSAIC ────────────────────────────────────────────────────────
// Both pages. 5 images in a clean asymmetric grid — no overlapping content zones.
// Left page: large primary (top 58%) + info band (bottom 42%).
// Right page: two columns, each with a tall + short image stacked, caption strip at base.
function SpreadMosaic({ data={}, showAnnotations=false }) {
  const entries = data.entries || [
    { title: 'Marine Lines at Dusk', caption: 'The promenade empties by 19:30 in winter.', focal_x: 50, focal_y: 60 },
    { title: 'Gateway Approach', caption: 'October light, long shadows.', focal_x: 45, focal_y: 50 },
    { title: 'Tide Marker', caption: 'High-water line. The monsoon was generous.', focal_x: 52, focal_y: 48 },
    { title: 'Haze Study', caption: 'The haze is structural. The city breathing.', focal_x: 50, focal_y: 50 },
    { title: 'Sea Wall', caption: 'Before the rain. Everything reflects.', focal_x: 48, focal_y: 55 },
  ];
  const contributor = data.contributor || { name: 'R. Patel', city: 'Mumbai' };
  const spreadW = AW * 2;

  // ── LEFT PAGE geometry ──
  const infoBandH = 148;
  const img01H = AH - infoBandH;

  // ── RIGHT PAGE geometry ──
  const rpLeft = BLEED + ML;
  const rpRight = BLEED + MR;
  const rpLiveW = LIVEW;
  const captionStripH = 56;
  const gutter = 8;
  const colW = Math.floor((rpLiveW - gutter) / 2);
  const rightImgTotalH = AH - BLEED - MT - captionStripH - BLEED - MB;
  const img02H = Math.floor(rightImgTotalH * 0.62);
  const img03H = rightImgTotalH - img02H - gutter;
  const img04H = Math.floor(rightImgTotalH * 0.38);
  const img05H = rightImgTotalH - img04H - gutter;

  return (
    <div style={{ width: spreadW, height: AH, position: 'relative', overflow: 'hidden', display: 'flex' }}>

      {/* ── LEFT PAGE ── */}
      <div style={{ width: AW, height: AH, background: C.paper, position: 'relative', flexShrink: 0 }}>

        {/* Image 01 — fills top of left page */}
        <div style={{ position: 'absolute', top: 0, left: 0, width: AW, height: img01H }}>
          <ImageFrame w={AW} h={img01H} label={entries[0]?.title || 'image 01'} focal_x={entries[0]?.focal_x || 50} focal_y={entries[0]?.focal_y || 50} media_url={entries[0]?.media_url}/>
          <div style={{ position: 'absolute', bottom: 10, left: 12, fontFamily: F.mono, fontSize: 12, color: C.gold, letterSpacing: '0.04em' }}>01</div>
          {showAnnotations && <Annotation label="entry[0] — primary" style={{ top: 8, left: 8 }}/>}
        </div>

        {/* Terra rule separating image from info band */}
        <div style={{ position: 'absolute', top: img01H, left: 0, width: AW, height: 2, background: C.terra }}/>

        {/* Info band — contributor, title, caption for image 01 */}
        <div style={{
          position: 'absolute', top: img01H + 2, left: 0, width: AW, height: infoBandH - 2,
          background: C.ground,
          display: 'flex', flexDirection: 'column', justifyContent: 'center',
          paddingLeft: BLEED + ML, paddingRight: BLEED + MR,
          gap: 6, boxSizing: 'border-box',
        }}>
          {/* Wordmark top-left inside band */}
          <div style={{ position: 'absolute', top: 12, left: BLEED + ML, fontFamily: F.mono, fontSize: 8, letterSpacing: '0.10em' }}>
            <span style={{ color: 'rgba(224,90,40,0.55)' }}>online</span>
            <span style={{ color: C.terra }}>//</span>
            <span style={{ color: 'rgba(224,90,40,0.55)' }}>offline</span>
          </div>

          <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 16 }}>
            {/* Left: contributor + title */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
                <span style={{ fontFamily: F.mono, fontSize: 8, color: C.terra, textTransform: 'uppercase', letterSpacing: '0.12em' }}>
                  {contributor.name || 'Contributor Name'}
                </span>
                <span style={{ fontFamily: F.mono, fontSize: 7, color: C.paper4, textTransform: 'uppercase', letterSpacing: '0.10em' }}>
                  {contributor.city || 'City'}
                </span>
              </div>
              <div style={{ fontFamily: F.serif, fontStyle: 'italic', fontSize: 26, color: C.paper, lineHeight: 1, letterSpacing: '-0.01em' }}>
                {data.page_title || 'Marine Lines'}
              </div>
            </div>
            {/* Right: caption for image 01 */}
            <div style={{ maxWidth: 280, fontFamily: F.serif, fontStyle: 'italic', fontSize: 9.5, color: C.paper3, lineHeight: 1.6, textAlign: 'right' }}>
              {entries[0]?.caption || ''}
            </div>
          </div>

          {showAnnotations && <Annotation label="contributor / page_title / entry[0].caption" style={{ top: 8, left: BLEED + ML }}/>}
        </div>

        {/* Folio bottom-left */}
        <div style={{ position: 'absolute', bottom: BLEED + MB - 14, left: BLEED + ML, zIndex: 5 }}>
          <Folio page={data.page || 32} side="left" dark={true} season={data.season || 'Spring 2026'}/>
        </div>

        <RegistrationMark side="left"/>
        <BleedMarks/>
        <GrainOverlay/>
      </div>

      {/* Gutter shadow */}
      <div style={{
        position: 'absolute', top: 0, left: AW - 4, width: 8, height: AH, zIndex: 10, pointerEvents: 'none',
        background: 'linear-gradient(to right, rgba(0,0,0,0.22) 0%, rgba(0,0,0,0.03) 50%, rgba(0,0,0,0.12) 100%)',
      }}/>

      {/* ── RIGHT PAGE ── */}
      <div style={{ width: AW, height: AH, background: C.paper, position: 'relative', flexShrink: 0 }}>

        {/* Section header */}
        <div style={{ position: 'absolute', top: BLEED + MT, left: rpLeft, right: rpRight, display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
          <SectionMark>{data.type || 'Photography'}</SectionMark>
          <GoldMark>{data.season || 'Spring 2026'}</GoldMark>
        </div>

        {/* Two-column image grid */}
        <div style={{
          position: 'absolute',
          top: BLEED + MT + 22,
          left: rpLeft, right: rpRight,
          display: 'flex', gap: gutter,
        }}>
          {/* Left column: img02 tall + img03 short */}
          <div style={{ width: colW, flexShrink: 0, display: 'flex', flexDirection: 'column', gap: gutter }}>
            <div style={{ position: 'relative' }}>
              <ImageFrame w={colW} h={img02H} label={entries[1]?.title || 'image 02'} focal_x={entries[1]?.focal_x || 50} focal_y={entries[1]?.focal_y || 50} media_url={entries[1]?.media_url}/>
              <div style={{ position: 'absolute', bottom: 8, left: 8, fontFamily: F.mono, fontSize: 11, color: C.gold }}>02</div>
              {showAnnotations && <Annotation label="entry[1]" style={{ top: 6, left: 6 }}/>}
            </div>
            <div style={{ position: 'relative' }}>
              <ImageFrame w={colW} h={img03H} label={entries[2]?.title || 'image 03'} focal_x={entries[2]?.focal_x || 50} focal_y={entries[2]?.focal_y || 50} media_url={entries[2]?.media_url}/>
              <div style={{ position: 'absolute', bottom: 8, left: 8, fontFamily: F.mono, fontSize: 11, color: C.gold }}>03</div>
              {showAnnotations && <Annotation label="entry[2]" style={{ top: 6, left: 6 }}/>}
            </div>
          </div>

          {/* Right column: img04 short + img05 tall */}
          <div style={{ width: colW, flexShrink: 0, display: 'flex', flexDirection: 'column', gap: gutter }}>
            <div style={{ position: 'relative' }}>
              <ImageFrame w={colW} h={img04H} label={entries[3]?.title || 'image 04'} focal_x={entries[3]?.focal_x || 50} focal_y={entries[3]?.focal_y || 50} media_url={entries[3]?.media_url}/>
              <div style={{ position: 'absolute', bottom: 8, left: 8, fontFamily: F.mono, fontSize: 11, color: C.gold }}>04</div>
              {showAnnotations && <Annotation label="entry[3]" style={{ top: 6, left: 6 }}/>}
            </div>
            <div style={{ position: 'relative' }}>
              <ImageFrame w={colW} h={img05H} label={entries[4]?.title || 'image 05'} focal_x={entries[4]?.focal_x || 50} focal_y={entries[4]?.focal_y || 50} media_url={entries[4]?.media_url}/>
              <div style={{ position: 'absolute', bottom: 8, left: 8, fontFamily: F.mono, fontSize: 11, color: C.gold }}>05</div>
              {showAnnotations && <Annotation label="entry[4]" style={{ top: 6, left: 6 }}/>}
            </div>
          </div>
        </div>

        {/* Caption strip — bottom of right page */}
        <div style={{
          position: 'absolute',
          bottom: BLEED + MB,
          left: rpLeft, right: rpRight,
          borderTop: `0.5px solid ${C.paper5}`,
          paddingTop: 8,
          display: 'flex', gap: 16,
        }}>
          {entries.slice(1, 5).map((entry, i) => (
            <div key={i} style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', gap: 4, alignItems: 'baseline', marginBottom: 2 }}>
                <span style={{ fontFamily: F.mono, fontSize: 8, color: C.gold, flexShrink: 0 }}>{String(i + 2).padStart(2, '0')}</span>
                <span style={{ fontFamily: F.serif, fontStyle: 'italic', fontSize: 8.5, color: C.ground, overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>
                  {entry.title || ''}
                </span>
              </div>
              <div style={{ fontFamily: F.sans, fontSize: 7.5, color: C.paper4, lineHeight: 1.4, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
                {entry.caption || ''}
              </div>
            </div>
          ))}
          {showAnnotations && <Annotation label="entries[1..4] captions" style={{ top: 0, right: 0 }}/>}
        </div>

        {/* Folio bottom-right */}
        <div style={{ position: 'absolute', bottom: BLEED + MB - 14, right: rpRight, zIndex: 5 }}>
          <Folio page={(data.page || 32) + 1} side="right" season={data.season || 'Spring 2026'}/>
        </div>

        <RegistrationMark side="right"/>
        <BleedMarks dark={true}/>
        <GrainOverlay/>
      </div>
    </div>
  );
}

Object.assign(window, { SpreadPanorama, SpreadMosaic });

// primitives.jsx — Reusable primitive components for online//offline magazine

// Page constants — shared across all templates
const W=768, H=1032, BLEED=11;
const AW=W+BLEED*2, AH=H+BLEED*2;
const ML=58, MR=58, MT=56, MB=56;
const LIVEW=W-ML-MR;

const C = {
  ground:    '#252119',
  ground2:   '#2e2a20',
  ground3:   '#1e2428',
  paper:     '#f0ebe2',
  paper2:    '#d8d2c8',
  paper3:    '#b0a898',
  paper4:    '#857d72',
  paper5:    '#554d44',
  terra:     '#e05a28',
  gold:      '#e8a020',
  rule:      'rgba(240,235,226,0.08)',
  ruleMid:   'rgba(240,235,226,0.14)',
  ruleStrong:'rgba(240,235,226,0.24)',
};

const F = {
  serif:  "'Instrument Serif', Georgia, serif",
  sans:   "'Instrument Sans', sans-serif",
  mono:   "'Courier Prime', monospace",
};

// ImageFrame
function ImageFrame({ w, h, label='image', n='', focal_x=50, focal_y=50, style={} }) {
  return (
    <div style={{
      width: w, height: h, background: C.ground3,
      position: 'relative', overflow: 'hidden', flexShrink: 0,
      ...style,
    }}>
      {/* SVG crosshair */}
      <svg style={{ position:'absolute', inset:0, width:'100%', height:'100%', opacity:0.18 }} viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="xMidYMid meet">
        <line x1={w/2} y1="0" x2={w/2} y2={h} stroke={C.paper} strokeWidth="0.5"/>
        <line x1="0" y1={h/2} x2={w} y2={h/2} stroke={C.paper} strokeWidth="0.5"/>
        <circle cx={w/2} cy={h/2} r="8" stroke={C.paper} strokeWidth="0.5" fill="none"/>
        <circle cx={w/2} cy={h/2} r="2" fill={C.paper} opacity="0.3"/>
      </svg>
      {/* Terra dot top-center */}
      <div style={{ position:'absolute', top:8, left:'50%', transform:'translateX(-50%)', width:4, height:4, borderRadius:'50%', background:C.terra }}/>
      {/* Label bottom-left */}
      <div style={{ position:'absolute', bottom:6, left:8, fontFamily:F.mono, fontSize:7, color:'rgba(240,235,226,0.2)', letterSpacing:'0.08em', textTransform:'uppercase' }}>
        {n ? `${n} · ` : ''}{label}
      </div>
    </div>
  );
}

// SectionMark
function SectionMark({ children }) {
  return (
    <span style={{ fontFamily:F.mono, fontSize:8, textTransform:'uppercase', letterSpacing:'0.16em', color:C.terra }}>
      {children}
    </span>
  );
}

// GoldMark
function GoldMark({ children }) {
  return (
    <span style={{ fontFamily:F.mono, fontSize:8, textTransform:'uppercase', letterSpacing:'0.16em', color:C.gold }}>
      {children}
    </span>
  );
}

// TerraRule
function TerraRule({ thickness=1.5 }) {
  return <div style={{ width:'100%', height:thickness, background:C.terra, flexShrink:0 }}/>;
}

// GoldRule
function GoldRule({ thickness=1 }) {
  return <div style={{ width:'100%', height:thickness, background:C.gold, flexShrink:0 }}/>;
}

// DoubleRule
function DoubleRule() {
  return (
    <div style={{ display:'flex', flexDirection:'column', gap:2, width:'100%', flexShrink:0 }}>
      <div style={{ height:1.5, background:C.terra }}/>
      <div style={{ height:0.5, background:C.gold }}/>
    </div>
  );
}

// Folio
function Folio({ page, side, dark=false }) {
  const textColor = dark ? 'rgba(240,235,226,0.35)' : C.paper4;
  const goldColor = dark ? 'rgba(232,160,32,0.5)' : C.gold;
  const baseStyle = { fontFamily:F.mono, fontSize:8, letterSpacing:'0.10em', color:textColor, display:'flex', alignItems:'center', gap:4 };
  if (side === 'left') {
    return (
      <div style={baseStyle}>
        <span style={{ color:goldColor }}>◉</span>
        <span>{page} / online//offline</span>
      </div>
    );
  }
  return (
    <div style={{ ...baseStyle, justifyContent:'flex-end' }}>
      <span>{page} / {window._magazineSeason || 'Spring 2026'}</span>
    </div>
  );
}

// GrainOverlay
function GrainOverlay() {
  return (
    <div style={{
      position:'absolute', inset:0, zIndex:999, pointerEvents:'none',
      mixBlendMode:'overlay', opacity:0.7,
    }}>
      <svg style={{ width:'100%', height:'100%' }} xmlns="http://www.w3.org/2000/svg">
        <filter id="grain-filter">
          <feTurbulence type="fractalNoise" baseFrequency="0.78" numOctaves="4" stitchTiles="stitch"/>
          <feColorMatrix type="saturate" values="0"/>
        </filter>
        <rect width="100%" height="100%" filter="url(#grain-filter)" opacity="0.055"/>
      </svg>
    </div>
  );
}

// RegistrationMark
function RegistrationMark({ side }) {
  const isLeft = side === 'left';
  return (
    <div style={{
      position:'absolute', bottom:8,
      left: isLeft ? 8 : undefined,
      right: isLeft ? undefined : 8,
      opacity:0.18, pointerEvents:'none',
    }}>
      <svg width="14" height="14" viewBox="0 0 14 14">
        <circle cx="7" cy="7" r="4" stroke="#e8a020" strokeWidth="0.8" fill="none"/>
        <line x1="7" y1="0" x2="7" y2="14" stroke="#e8a020" strokeWidth="0.8"/>
        <line x1="0" y1="7" x2="14" y2="7" stroke="#e8a020" strokeWidth="0.8"/>
      </svg>
    </div>
  );
}

// VerticalContributorLabel
function VerticalContributorLabel({ name, type, issue }) {
  return (
    <div style={{
      position:'absolute', left:0, top:0, bottom:0, width:46,
      display:'flex', alignItems:'center', justifyContent:'center',
    }}>
      <div style={{
        transform:'rotate(-90deg)',
        transformOrigin:'center center',
        whiteSpace:'nowrap',
        fontFamily:F.mono, fontSize:8, textTransform:'uppercase',
        letterSpacing:'0.14em', color:C.paper4,
        display:'flex', alignItems:'center', gap:6,
      }}>
        <span style={{ color:C.gold }}>◆</span>
        <span>{name}</span>
        <span style={{ color:C.paper5 }}>—</span>
        <span>{type}</span>
        <span style={{ color:C.paper5 }}>—</span>
        <span>{issue}</span>
      </div>
      {/* Thin vertical rule to the right */}
      <div style={{ position:'absolute', right:0, top:0, bottom:0, width:0.5, background:C.paper5 }}/>
    </div>
  );
}

function BleedMarks({ dark=false }) {
  const col = dark ? 'rgba(37,33,25,0.55)' : 'rgba(232,160,32,0.45)';
  const sw = 0.5;
  const gap = 2;
  const tick = 10;
  const L = BLEED;
  return (
    <div style={{
      position:'absolute', top:-20, left:-20, right:-20, bottom:-20,
      pointerEvents:'none', zIndex:998, overflow:'visible',
    }}>
      <svg
        style={{ position:'absolute', top:0, left:0, overflow:'visible' }}
        width={AW+40} height={AH+40}
        viewBox={`-20 -20 ${AW+40} ${AH+40}`}
        overflow="visible"
      >
        {/* Top-left */}
        <line x1={0-tick} y1={L} x2={L-gap} y2={L} stroke={col} strokeWidth={sw}/>
        <line x1={L} y1={0-tick} x2={L} y2={L-gap} stroke={col} strokeWidth={sw}/>
        {/* Top-right */}
        <line x1={AW+tick} y1={L} x2={AW-L+gap} y2={L} stroke={col} strokeWidth={sw}/>
        <line x1={AW-L} y1={0-tick} x2={AW-L} y2={L-gap} stroke={col} strokeWidth={sw}/>
        {/* Bottom-left */}
        <line x1={0-tick} y1={AH-L} x2={L-gap} y2={AH-L} stroke={col} strokeWidth={sw}/>
        <line x1={L} y1={AH+tick} x2={L} y2={AH-L+gap} stroke={col} strokeWidth={sw}/>
        {/* Bottom-right */}
        <line x1={AW+tick} y1={AH-L} x2={AW-L+gap} y2={AH-L} stroke={col} strokeWidth={sw}/>
        <line x1={AW-L} y1={AH+tick} x2={AW-L} y2={AH-L+gap} stroke={col} strokeWidth={sw}/>
      </svg>
    </div>
  );
}

// Annotation overlay for data fields
function Annotation({ label, style={} }) {
  return (
    <div style={{
      position:'absolute', background:C.terra, color:'#fff',
      fontFamily:F.mono, fontSize:7.5, padding:'1px 4px',
      letterSpacing:'0.06em', pointerEvents:'none', zIndex:1000,
      lineHeight:1.3, whiteSpace:'nowrap',
      ...style,
    }}>
      {label}
    </div>
  );
}

Object.assign(window, {
  C, F,
  ImageFrame, SectionMark, GoldMark,
  TerraRule, GoldRule, DoubleRule,
  Folio, GrainOverlay, RegistrationMark,
  VerticalContributorLabel, Annotation, BleedMarks,
});

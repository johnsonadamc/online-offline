// Shared marks + helpers for Batches 2–5. All colour/font from theme.
const { THEME, alpha } = window;

function Line({ x1, y1, x2, y2, dashed = false, a = 55, tone = 'accent2', theme = THEME }) {
  const len = Math.hypot(x2 - x1, y2 - y1), ang = Math.atan2(y2 - y1, x2 - x1) * 180 / Math.PI;
  return <div style={{ position: 'absolute', left: x1, top: y1, width: len, height: 0, borderTop: `1px ${dashed ? 'dashed' : 'solid'} ${alpha(theme.colors[tone], a)}`, transform: `rotate(${ang}deg)`, transformOrigin: '0 0', zIndex: 1, pointerEvents: 'none' }}></div>;
}
function Ripple({ cx, cy, r0 = 24, step = 30, n = 6, theme = THEME }) {
  return <>{Array.from({ length: n }, (_, i) => { const r = r0 + i * step; return <div key={i} style={{ position: 'absolute', left: cx - r, top: cy - r, width: r * 2, height: r * 2, borderRadius: '50%', border: `1px solid ${alpha(theme.colors.accent2, 72 - i * (56 / n))}`, zIndex: 1, pointerEvents: 'none' }}></div>; })}</>;
}
function Wave({ x, y, r = 14, n = 12, a = 60, tone = 'accent2', theme = THEME }) {
  const b = `1px solid ${alpha(theme.colors[tone], a)}`;
  return <>{Array.from({ length: n }, (_, i) => { const up = i % 2 === 0; return <div key={i} style={{ position: 'absolute', left: x + i * 2 * r, top: up ? y : y + r, width: 2 * r, height: r + 1, borderTop: up ? b : 'none', borderBottom: up ? 'none' : b, borderLeft: b, borderRight: b, borderRadius: up ? `${r}px ${r}px 0 0` : `0 0 ${r}px ${r}px`, zIndex: 1, pointerEvents: 'none' }}></div>; })}</>;
}
function Portal({ x, y, w, h, n = 3, step = 16, theme = THEME }) {
  const c = theme.colors;
  return <>{Array.from({ length: n }, (_, i) => { const ww = w - 2 * i * step, last = i === n - 1; return <div key={i} style={{ position: 'absolute', left: x + i * step, top: y + i * step, width: ww, height: h - i * step, borderRadius: `${ww / 2}px ${ww / 2}px 0 0`, border: `1px solid ${alpha(c.accent2, 72 - i * 14)}`, borderBottom: 'none', background: last ? `linear-gradient(${alpha(c.accent2, 42)}, ${alpha(c.accent, 12)} 70%, transparent)` : 'transparent', zIndex: 1, pointerEvents: 'none' }}></div>; })}</>;
}
function Blinds({ x, y, w, h, slat = 9, theme = THEME }) {
  const c = theme.colors, mask = `repeating-linear-gradient(to bottom, black 0 ${slat}px, transparent ${slat}px ${slat + 4}px)`;
  return <div style={{ position: 'absolute', left: x, top: y, width: w, height: h, background: `linear-gradient(to bottom, ${alpha(c.accent2, 72)}, ${alpha(c.accent, 45)} 55%, ${alpha(c.deep, 80)})`, WebkitMaskImage: mask, maskImage: mask, zIndex: 1, pointerEvents: 'none' }}></div>;
}
function Moon({ cx, cy, d, phase = 0, theme = THEME }) {
  const c = theme.colors;
  return <div style={{ position: 'absolute', left: cx - d / 2, top: cy - d / 2, width: d, height: d, borderRadius: '50%', background: alpha(c.accent2, 78), boxShadow: `inset ${phase * d}px 0 0 0 ${c.paper}, 0 0 0 1px ${alpha(c.accent2, 60)}`, zIndex: 1 }}></div>;
}
function Marquee({ x, y, w, h, theme = THEME }) {
  const c = theme.colors, hs = 7;
  return <>
    <div style={{ position: 'absolute', left: x, top: y, width: w, height: h, border: `1px dashed ${alpha(c.accent2, 80)}`, background: alpha(c.accent2, 5), zIndex: 1, pointerEvents: 'none' }}></div>
    {[[0, 0], [1, 0], [0, 1], [1, 1]].map(([a, b], i) => <div key={i} style={{ position: 'absolute', left: x + a * w - hs / 2, top: y + b * h - hs / 2, width: hs, height: hs, background: c.paper, border: `1px solid ${c.ink}`, zIndex: 3 }}></div>)}
  </>;
}
function Chevrons({ x, y, n = 4, s = 14, dir = 'down', theme = THEME }) {
  const rot = { right: 45, down: 135, left: 225, up: -45 }[dir];
  return <>{Array.from({ length: n }, (_, i) => <div key={i} style={{ position: 'absolute', left: dir === 'down' || dir === 'up' ? x : x + i * s * .9, top: dir === 'down' || dir === 'up' ? y + i * s * .9 : y, width: s, height: s, borderTop: `1.5px solid ${alpha(theme.colors.accent2, 88 - i * 16)}`, borderRight: `1.5px solid ${alpha(theme.colors.accent2, 88 - i * 16)}`, transform: `rotate(${rot}deg)`, zIndex: 1 }}></div>)}</>;
}
function Scrollbar({ x, y, h, thumbTop = .08, thumbSize = .3, theme = THEME }) {
  const c = theme.colors, w = 12, inner = h - 30;
  const tri = up => ({ position: 'absolute', left: 3, width: 6, height: 5, background: alpha(c.ink, 70), clipPath: up ? 'polygon(50% 0, 100% 100%, 0 100%)' : 'polygon(0 0, 100% 0, 50% 100%)' });
  return <div style={{ position: 'absolute', left: x, top: y, width: w, height: h, boxShadow: `inset 0 0 0 1px ${alpha(c.ink, 30)}`, zIndex: 1 }}>
    <div style={{ ...tri(true), top: 5 }}></div>
    <div style={{ position: 'absolute', left: 2, width: w - 4, top: 15 + inner * thumbTop, height: inner * thumbSize, background: alpha(c.accent2, 60) }}></div>
    <div style={{ ...tri(false), bottom: 5 }}></div>
  </div>;
}
function Envelope({ x, y, w, h, theme = THEME }) {
  const c = theme.colors;
  return <>
    <div style={{ position: 'absolute', left: x, top: y, width: w, height: h, border: `1px solid ${alpha(c.accent2, 75)}`, background: alpha(c.accent2, 6), zIndex: 1 }}></div>
    <Line theme={theme} x1={x} y1={y} x2={x + w / 2} y2={y + h * .58} a={75} />
    <Line theme={theme} x1={x + w} y1={y} x2={x + w / 2} y2={y + h * .58} a={75} />
  </>;
}
function Keyhole({ cx, cy, s = 22, theme = THEME }) {
  const c = theme.colors;
  return <div style={{ position: 'absolute', left: cx - s, top: cy - s * 1.2, width: s * 2, height: s * 2.4, borderRadius: s, background: c.paper, boxShadow: `0 0 0 1px ${alpha(c.accent2, 70)}`, zIndex: 3 }}>
    <div style={{ position: 'absolute', left: s * .62, top: s * .45, width: s * .76, height: s * .76, borderRadius: '50%', background: c.ink }}></div>
    <div style={{ position: 'absolute', left: s * .7, top: s * .95, width: s * .6, height: s * .95, background: c.ink, clipPath: 'polygon(30% 0, 70% 0, 100% 100%, 0 100%)' }}></div>
  </div>;
}
function Body({ text, size = 12, columns = 1, gap = 32, theme = THEME, style }) {
  const paras = (text || '').split(/\n\s*\n/).map(p => p.trim()).filter(Boolean);
  return <div lang="en" style={{ ...(columns > 1 ? { columnCount: columns, columnGap: gap, columnFill: 'balance' } : {}), fontFamily: theme.fonts.text, fontWeight: 300, fontSize: size, lineHeight: 1.75, color: alpha(theme.colors.ink, 92), hyphens: 'auto', WebkitHyphens: 'auto', ...style }}>
    {paras.map((p, i) => <p key={i} style={{ textIndent: i ? '1.6em' : 0, textWrap: 'pretty' }}>{p}</p>)}
  </div>;
}
function NameLine({ names = [], max = 5, theme = THEME, size = 15, style }) {
  if (!names.length) return null;
  const shown = max ? names.slice(0, max) : names, rest = names.length - shown.length;
  const txt = rest > 0 ? `${shown.join(', ')} and ${rest} others` : shown.length > 1 ? `${shown.slice(0, -1).join(', ')} and ${shown[shown.length - 1]}` : shown[0];
  return <div style={{ fontFamily: theme.fonts.text, fontStyle: 'italic', fontWeight: 300, fontSize: size, lineHeight: 1.6, color: theme.colors.ink, textWrap: 'pretty', ...style }}>{txt}</div>;
}
function Key({ children, theme = THEME, style }) {
  return <div style={{ fontFamily: theme.fonts.label, fontSize: 8, letterSpacing: '.24em', textTransform: 'uppercase', color: theme.colors.muted, ...style }}>{children}</div>;
}
function FrameLabel({ name, title, w, theme = THEME }) {
  if (!name && !title) return null;
  return <div style={{ width: w, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', fontFamily: theme.fonts.label, fontSize: 9, letterSpacing: '.04em', color: theme.colors.accent2 }}>
    {name}{title && <span style={{ fontFamily: theme.fonts.text, fontStyle: 'italic', fontSize: 12, letterSpacing: 0, color: alpha(theme.colors.ink, 80) }}>{name ? '  ' : ''}{title}</span>}
  </div>;
}
const wordCount = s => (s || '').trim().split(/\s+/).filter(Boolean).length;
function rowCells({ x, y, w, h, counts, gap = 24 }) {
  const rh = (h - gap * (counts.length - 1)) / counts.length, out = [];
  counts.forEach((k, r) => { const cw = (w - gap * (k - 1)) / k; for (let i = 0; i < k; i++) out.push({ x: x + i * (cw + gap), y: y + r * (rh + gap), w: cw, h: rh }); });
  return out;
}

Object.assign(window, { Line, Ripple, Wave, Portal, Blinds, Moon, Marquee, Chevrons, Scrollbar, Envelope, Keyhole, Body, NameLine, Key, FrameLabel, wordCount, rowCells });

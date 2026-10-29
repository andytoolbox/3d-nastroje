/* ===== Medaile – tvary, nápisy, texty po obvodu, ozdoby. Created by Julius Andy Antoš ===== */
const $ = (id) => document.getElementById(id);
const FONTS = { poppins: 'Poppins', anton: 'Anton', bebas: 'Bebas Neue', baloo: 'Baloo', playfair: 'Playfair', lobster: 'Lobster' };
const PRESETS = ['1.', '2.', '3.', 'Vítěz', 'Za účast', 'Čestné uznání', 'Mistr', 'Šampion'];
const METALS = [['Zlatá', '#d4a72c'], ['Stříbrná', '#b9c0c6'], ['Bronzová', '#b06f3c']];
const SHAPES = [['circle', 'Kruh', '<circle cx="17" cy="15" r="11"/>'], ['rosette', 'Kokarda', '<path d="M17 3l3 3 4-1 1 4 4 1-1 4 3 3-3 3 1 4-4 1-1 4-4-1-3 3-3-3-4 1-1-4-4-1 1-4-3-3 3-3-1-4 4-1 1-4 4 1z"/>'],
  ['gear', 'Ozubené kolo', '<path d="M15 3h4l1 3 3 1 2-2 3 3-2 2 1 3 3 1v4l-3 1-1 3 2 2-3 3-2-2-3 1-1 3h-4l-1-3-3-1-2 2-3-3 2-2-1-3-3-1v-4l3-1 1-3-2-2 3-3 2 2 3-1z"/>'],
  ['hex', 'Šestiúhelník', '<path d="M17 3l11 6v12l-11 6-11-6V9z"/>'], ['shield', 'Štít', '<path d="M6 4h22v10c0 7-5 11-11 14C11 25 6 21 6 14z"/>'], ['star', 'Hvězda', '<path d="M17 2l4 9 9 1-7 6 2 10-8-5-8 5 2-10-7-6 9-1z"/>'],
  ['heart', 'Srdce', '<path d="M17 27S4 19 4 11c0-4 3-7 6.5-7 2.8 0 4.8 1.7 6.5 4 1.7-2.3 3.7-4 6.5-4C27 4 30 7 30 11c0 8-13 16-13 16z"/>'], ['oval', 'Ovál', '<ellipse cx="17" cy="15" rx="9" ry="12"/>']];
// ozdoby: SVG 24 × 24 (vlastní kresby); obrys i tahy se převedou na plochy
const IC = (() => {
  const g = ICONS.reduce((o, i) => (o[i.id] = i, o), {});
  const p = (d, rule) => `<path d="${d}"${rule ? ` fill-rule="${rule}"` : ''}/>`, st = (d, w) => `<path d="${d}" fill="none" stroke="#000" stroke-width="${w || 1.6}" stroke-linecap="round" stroke-linejoin="round"/>`;
  return [
    ['none', 'Bez', ''],
    ['cup', 'Pohár', p('M6 2h12v6a6 6 0 0 1-4.6 5.8V17H17v4H7v-4h3.6v-3.2A6 6 0 0 1 6 8z') + st('M6 4.2H3.4v1.6a4 4 0 0 0 3.4 4M18 4.2h2.6v1.6a4 4 0 0 1-3.4 4')],
    ['star', 'Hvězda', p(g.hvezda.d)],
    ['crown', 'Koruna', p('M2 7.5l5 4.2 5-7.2 5 7.2 5-4.2-2 10.8H4z') + p('M4 19.3h16v2.4H4z')],
    ['ball', 'Míč', st('M12 2.2a9.8 9.8 0 1 1 0 19.6a9.8 9.8 0 1 1 0-19.6z', 1.7) + p('M12 7.6l4.2 3-1.6 5h-5.2l-1.6-5z') + st('M12 7.6V3M16.2 10.6l4.3-1.4M14.6 15.6l2.6 3.7M9.4 15.6l-2.6 3.7M7.8 10.6 3.5 9.2', 1.4)],
    ['bike', 'Kolo', st('M5.5 15.5a4.2 4.2 0 1 1 0 .01M18.5 15.5a4.2 4.2 0 1 1 0 .01', 1.6) + st('M5.5 15.5 9.5 8h6.5l2.5 7.5M9.5 8l2.6 7.5H5.5M15.2 5.2h2.4M9.5 8 8.6 5.6H7', 1.5)],
    ['heart', 'Srdce', p(g.srdce.d)],
    ['note', 'Nota', p(g.nota.d)],
    ['bolt', 'Blesk', p(g.blesk.d)],
    ['pawn', 'Šachy', p('M12 2.2a3.3 3.3 0 0 1 2 5.9h1.3v1.8h-1.6l1.1 7.1h2.4l2.3 4H5.5l2.3-4h2.4l1.1-7.1H9.7V8.1H11a3.3 3.3 0 0 1 1-5.9z')],
    ['wave', 'Plavání', st('M2.5 9c2.4-2 4.8-2 7.1 0s4.8 2 7.1 0 4.8-2 4.8-2M2.5 14c2.4-2 4.8-2 7.1 0s4.8 2 7.1 0 4.8-2 4.8-2M2.5 19c2.4-2 4.8-2 7.1 0s4.8 2 7.1 0 4.8-2 4.8-2', 1.9)],
    ['paw', 'Tlapka', p(g.tlapka.d)],
  ];
})();
const DEF = { shape: 'circle', D: 60, t: 3, rim: 2.5, rh: 1.2, txt: '1.', set: false, font: 'poppins', ts: 100, top: 'ZÁVOD 2026', bot: '', as: 100, icon: 'none', laurel: true, hang: 'slot', rib: 22, back: '',
  colors: 'swap', c1: '#d4a72c', c2: '#7a4f12', lh: 0.2, bedX: 220, bedY: 220, bedZ: 250 };
const STORE = 'medaile-v1';
const D = Object.assign({}, DEF);
try { const s = JSON.parse(localStorage.getItem(STORE) || '{}'); for (const k in DEF) if (k in s && typeof s[k] === typeof DEF[k]) D[k] = s[k]; } catch (e) {}
if (!FONTS[D.font]) D.font = DEF.font;
const saveState = () => { try { localStorage.setItem(STORE, JSON.stringify(D)); } catch (e) {} };
const fmt = (v, d = 1) => (+v).toLocaleString('cs-CZ', { maximumFractionDigits: d, minimumFractionDigits: d });
const fmtP = (v) => (+v).toLocaleString('cs-CZ', { maximumFractionDigits: 2 });
const css = (v) => getComputedStyle(document.documentElement).getPropertyValue(v).trim();
const clamp = (v, a, b) => Math.min(b, Math.max(a, +v || 0));

/* ===== Písma ===== */
const FONT_CACHE = {};
const fontBuf = (id) => { const s = atob(MD_FONTS[id]), u = new Uint8Array(s.length); for (let i = 0; i < s.length; i++) u[i] = s.charCodeAt(i); return u.buffer; };
function getFont(id) { if (!FONT_CACHE[id]) FONT_CACHE[id] = opentype.parse(fontBuf(id)); return FONT_CACHE[id]; }

/* ===== Manifold ===== */
let MF = null, GC = [];
const T = (m) => { GC.push(m); return m; };
function freeAll() { for (const m of GC) { try { m.delete(); } catch (e) {} } GC = []; }
async function initMF() { const s = atob(MANIFOLD_WASM_B64), u = new Uint8Array(s.length); for (let i = 0; i < s.length; i++) u[i] = s.charCodeAt(i); MF = await ManifoldModule({ wasmBinary: u }); MF.setup(); }
function toGeom(m) {
  const me = m.getMesh(), np = me.numProp, vp = me.vertProperties, tv = me.triVerts, n = tv.length, pos = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) { const v = tv[i] * np; pos[3 * i] = vp[v]; pos[3 * i + 1] = vp[v + 1]; pos[3 * i + 2] = vp[v + 2]; }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); return g;
}
const ext = (cs, z0, z1) => T(T(cs.extrude(z1 - z0)).translate([0, 0, z0]));
const U = (list) => T(MF.Manifold.union(list.filter(Boolean)));
const sub = (a, b) => T(a.subtract(b));
const CU = (list) => { list = list.filter(c => c && !c.isEmpty()); return list.length ? T(MF.CrossSection.union(list)) : null; };
const cl = (cs) => T(T(T(cs.offset(-0.02, 'Round')).offset(0.02, 'Round')).simplify(0.002));
const empty = (cs) => !cs || cs.isEmpty() || cs.area() < 0.01;
const poly = (pts) => T(new MF.CrossSection([pts], 'NonZero'));
const fromEx = (exs) => T(new MF.CrossSection(exToPaths(exs).map(p => p.map(q => [q.X / SC, q.Y / SC])), 'NonZero'));

/* ===== Text ===== */
function textCS(fontId, text, size, mirror) {
  const L = layoutText(getFont(fontId), text, { size, lineH: 1.15, spacing: 0, align: 'center', mirror: !!mirror, slant: 0 });
  return { cs: T(fromEx(unionEx(L.paths)).simplify(0.002)), missing: L.missing };
}
// text po oblouku: horní čte se zleva doprava s hlavou ven, spodní s hlavou ke středu
function arcText(fontId, text, size, r, top) {
  const font = getFont(fontId), chars = [...text], gap = size * 0.12, items = []; let total = 0;
  for (const ch of chars) {
    if (/\s/.test(ch)) { const w = size * 0.35; items.push({ w }); total += w + gap; continue; }
    const g = textCS(fontId, ch, size), b = g.cs.isEmpty() ? null : g.cs.bounds();
    const adv = font.getAdvanceWidth(ch, size * font.unitsPerEm / capHeight(font)) || size * 0.6;
    items.push({ cs: g.cs, w: adv, b }); total += adv + gap;
  }
  total -= gap; if (total <= 0) return null;
  const span = total / r, parts = []; let pos = 0;
  for (const it of items) {
    if (it.cs && it.b) {
      const mid = pos + it.w / 2, a = top ? Math.PI / 2 + span / 2 - mid / r : -Math.PI / 2 - span / 2 + mid / r;
      // znak vystředěný vodorovně, účaří v 0
      let g = T(it.cs.translate([-(it.b.min[0] + it.b.max[0]) / 2, 0]));
      if (top) g = T(T(g.rotate((a - Math.PI / 2) * 180 / Math.PI)).translate([r * Math.cos(a), r * Math.sin(a)]));
      else g = T(T(T(g.translate([0, -size])).rotate((a + Math.PI / 2) * 180 / Math.PI)).translate([r * Math.cos(a), r * Math.sin(a)]));
      parts.push(g);
    }
    pos += it.w + gap;
  }
  return { cs: CU(parts), span };
}

/* ===== Tvary ===== */
function shapeCS(kind, Dm) {
  const R = Dm / 2, P = [];
  const smooth = (cs, r) => cl(T(T(cs.offset(-r, 'Round')).offset(r, 'Round')));
  if (kind === 'circle') return T(MF.CrossSection.circle(R, 160));
  if (kind === 'oval') return T(T(MF.CrossSection.circle(R, 160)).scale([0.78, 1]));
  if (kind === 'hex') return smooth(T(T(MF.CrossSection.circle(R, 6)).rotate(90)), R * 0.06);
  if (kind === 'rosette') { const n = 16, parts = [T(MF.CrossSection.circle(R * 0.86, 120))]; for (let i = 0; i < n; i++) { const a = i / n * 2 * Math.PI; parts.push(T(T(MF.CrossSection.circle(R * 0.17, 40)).translate([R * 0.83 * Math.cos(a), R * 0.83 * Math.sin(a)]))); } return CU(parts); }
  if (kind === 'gear') { const n = 20; for (let i = 0; i < n; i++) { const a = i / n * 2 * Math.PI, d = Math.PI / n; for (const [da, rr] of [[-d * 0.95, R * 0.88], [-d * 0.45, R], [d * 0.45, R], [d * 0.95, R * 0.88]]) P.push([rr * Math.cos(a + da), rr * Math.sin(a + da)]); } return smooth(poly(P), R * 0.02); }
  if (kind === 'star') { for (let i = 0; i < 10; i++) { const a = Math.PI / 2 + i * Math.PI / 5, rr = i % 2 ? R * 0.55 : R; P.push([rr * Math.cos(a), rr * Math.sin(a)]); } return smooth(poly(P), R * 0.06); }
  if (kind === 'heart') { for (let i = 0; i < 120; i++) { const t = i / 120 * 2 * Math.PI, x = 16 * Math.sin(t) ** 3, y = 13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t); P.push([x / 17 * R, y / 17 * R + R * 0.12]); } return poly(P); }
  // štít: rovný horní okraj, oblé boky, špička dole
  for (let i = 0; i <= 40; i++) { const t = i / 40; P.push([R * 0.86 * (1 - t * t * 0.95) * Math.cos(t * 0.2), R * 0.75 - t * R * 1.72]); }
  const right = P.map(([x, y]) => [x, y]); const left = right.slice().reverse().map(([x, y]) => [-x, y]);
  return smooth(poly([[-R * 0.86, R * 0.9], [R * 0.86, R * 0.9]].concat(right).concat(left.slice(1))), R * 0.05);
}
// největší kružnice se středem v počátku, která se do tvaru vejde
function inRadius(cs) { let r = 1e9; for (const p of cs.toPolygons()) for (let i = 0, j = p.length - 1; i < p.length; j = i++) { const [ax, ay] = p[j], [bx, by] = p[i], dx = bx - ax, dy = by - ay, L = dx * dx + dy * dy, t = L ? Math.max(0, Math.min(1, -(ax * dx + ay * dy) / L)) : 0; r = Math.min(r, Math.hypot(ax + t * dx, ay + t * dy)); } return r; }

/* ===== Vavřín ===== */
function laurelCS(r, from, to, size) {
  const parts = [], w = size * 0.07, n = Math.max(5, Math.round((to - from) * r / (size * 0.42)));
  for (const side of [1, -1]) {
    const pts = [], pts2 = [];
    for (let i = 0; i <= 40; i++) { const a = from + (to - from) * i / 40; pts.push([side * r * Math.cos(a), r * Math.sin(a)]); }
    // stonek jako tenký pás podél oblouku
    const o = pts.map(([x, y]) => { const l = Math.hypot(x, y); return [x / l, y / l]; });
    const outer = pts.map(([x, y], i) => [x + o[i][0] * w / 2, y + o[i][1] * w / 2]), inner = pts.map(([x, y], i) => [x - o[i][0] * w / 2, y - o[i][1] * w / 2]).reverse();
    parts.push(poly(outer.concat(inner)));
    for (let i = 0; i < n; i++) {
      const a = from + (to - from) * (i + 0.6) / n, px = side * r * Math.cos(a), py = r * Math.sin(a), tang = Math.atan2(Math.cos(a), side * -Math.sin(a)) * 180 / Math.PI;
      for (const io of [1, -1]) {
        const L = size * (0.42 - 0.12 * i / n), W = L * 0.36, dir = tang + side * io * 32;
        const leaf = T(T(T(T(MF.CrossSection.circle(1, 24)).scale([L / 2, W / 2])).translate([L / 2, 0])).rotate(dir));
        parts.push(T(leaf.translate([px, py])));
      }
    }
    pts2.length = 0;
  }
  return CU(parts);
}

/* ===== Stavba medaile ===== */
let SYMS = {};
function iconCS(id, h) {
  const it = IC.find(i => i[0] === id); if (!it || !it[2]) return null;
  if (!SYMS[id]) SYMS[id] = svgToSymbol(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">${it[2]}</svg>`);
  const s = SYMS[id]; if (!s) return null;
  const cs = fromEx(placeSymbol(s, h, -s.aspect * h / 2, -h / 2)); return cs;
}
function medal(msgs, text, warnOnce) {
  const Dm = clamp(D.D, 25, 150), t = clamp(D.t, 1.2, 10), rim = clamp(D.rim, 0, 8), rh = clamp(D.rh, 0.4, 4);
  let shape = shapeCS(D.shape, Dm);
  const sb = shape.bounds(), inner = rim > 0 ? T(shape.offset(-rim, 'Round')) : shape;
  const rIn = inRadius(rim > 0 ? inner : shape) - 0.6;
  const relief = [];
  if (rim > 0) relief.push(T(shape.subtract(inner)));
  // texty po obvodu
  const asz = clamp(Dm * 0.075 * clamp(D.as, 50, 150) / 100, 2.5, 14), arcs = { top: 0, bot: 0 };
  let rText = rIn - 1.2;
  for (const [key, top] of [['top', true], ['bot', false]]) {
    const s = String(D[key] || '').trim(); if (!s) continue;
    const r = top ? rText - asz : rText, a = arcText(D.font, s, asz, r, top);
    if (!a || !a.cs) continue;
    if (a.span > Math.PI * 0.95 && warnOnce) msgs.push({ lvl: 'warn', msg: `Text „${s}“ je na obvod moc dlouhý. Zkraťte ho nebo zmenšete písmo.` });
    relief.push(a.cs); arcs[key] = a.span;
  }
  const hasArc = arcs.top || arcs.bot, core = hasArc ? rIn - asz - 2.4 : rIn;
  // ozdoba a velký nápis
  const hasIcon = D.icon !== 'none';
  if (hasIcon) { const ih = core * 0.48, ic = iconCS(D.icon, ih); if (ic) relief.push(T(ic.translate([0, core * 0.5]))); }
  const tx = String(text || '').trim();
  if (tx) {
    const maxW = core * (D.laurel ? 1.15 : 1.5), maxH = core * (hasIcon ? 0.62 : 0.85) * clamp(D.ts, 40, 130) / 100;
    let T1 = textCS(D.font, tx, 10), b = T1.cs.isEmpty() ? null : T1.cs.bounds();
    if (T1.missing.length && warnOnce) msgs.push({ lvl: 'warn', msg: `Písmo neumí znaky: ${T1.missing.join(' ')}` });
    if (b) {
      let k = Math.min(maxW / (b.max[0] - b.min[0]), maxH / (b.max[1] - b.min[1]));
      // dlouhý text se dvěma slovy zkusí na dva řádky
      if (/\s/.test(tx) && k * 10 < maxH * 0.42) { const words = tx.split(/\s+/), mid = Math.ceil(words.length / 2), T2 = textCS(D.font, words.slice(0, mid).join(' ') + '\n' + words.slice(mid).join(' '), 10), b2 = T2.cs.bounds(), k2 = Math.min(maxW / (b2.max[0] - b2.min[0]), maxH / (b2.max[1] - b2.min[1])); if (k2 > k) { T1 = T2; b = b2; k = k2; } }
      const cy = hasIcon ? -core * 0.2 : 0;
      relief.push(T(T(T(T1.cs.translate([-(b.min[0] + b.max[0]) / 2, -(b.min[1] + b.max[1]) / 2])).scale([k, k])).translate([0, cy])));
      const stroke = 2 * T1.cs.area() * k * k / Math.max(1, (() => { let P = 0; for (const p of T1.cs.toPolygons()) for (let i = 0, j = p.length - 1; i < p.length; j = i++) P += Math.hypot(p[i][0] - p[j][0], p[i][1] - p[j][1]); return P * k; })());
      if (stroke < 1 && warnOnce) msgs.push({ lvl: 'info', msg: 'Nápis uprostřed má tenké tahy. Zvolte tučnější písmo nebo kratší text.' });
    }
  }
  if (D.laurel) { const lr = core * 0.84, from = -Math.PI / 2 + (arcs.bot ? Math.max(0.35, arcs.bot / 2 + 0.12) : 0.22), to = Math.PI / 2 - (arcs.top ? Math.max(0.5, arcs.top / 2 + 0.1) : 0.45); if (to > from + 0.4) relief.push(laurelCS(lr, from, to, core * 0.32)); }
  // zavěšení
  const top = sb.max[1], baseParts = [shape], holes = [];
  if (D.hang === 'loop') { const ro = Math.max(4, Dm * 0.08), ri = ro * 0.5, cy = top + ro - Math.max(1.5, rim * 0.6); baseParts.push(T(T(MF.CrossSection.circle(ro, 48)).translate([0, cy]))); holes.push(T(T(MF.CrossSection.circle(ri, 40)).translate([0, cy]))); }
  else if (D.hang === 'slot') { const rb = clamp(D.rib, 8, 40), w = rb + 1, h = 3, tab = T(T(T(T(MF.CrossSection.square([w + 7, h + 6], true)).offset(-2, 'Round')).offset(2, 'Round')).translate([0, top + (h + 6) / 2 - 2.2])); baseParts.push(tab); holes.push(T(T(T(T(MF.CrossSection.square([w, h], true)).offset(-0.6, 'Round')).offset(0.6, 'Round')).translate([0, top + h / 2 + 0.8]))); if (rb + 8 > Dm && warnOnce) msgs.push({ lvl: 'info', msg: 'Průvlak je širší než medaile. Zvolte užší stuhu nebo očko.' }); }
  else if (D.hang === 'hole') { const hy = top - Math.max(rim, 1) - 2.6; holes.push(T(T(MF.CrossSection.circle(1.9, 32)).translate([0, hy]))); relief.push(T(T(MF.CrossSection.circle(3.4, 32)).translate([0, hy]))); }
  let base = cl(CU(baseParts)); const holeCS = CU(holes);
  // reliéf jen uvnitř tvaru, mimo díry
  let rel = CU(relief); if (rel) { rel = T(rel.intersect(T(shape.offset(-0.031, 'Round'))));   // nepatrně uvnitř, aby stěny reliéfu a medaile neležely v jedné rovině
 if (holeCS) rel = T(rel.subtract(T(holeCS.offset(1.2, 'Round')))); rel = cl(rel); }
  if (holeCS) base = T(base.subtract(holeCS));
  let B = ext(base, 0, t), Rl = rel && !empty(rel) ? ext(rel, t - 0.3, t + rh) : null;
  // zadní strana: zrcadlový text vyrytý zespodu
  const back = String(D.back || '').trim();
  if (back) {
    const bt = textCS('poppins', back, 10, true), bb = bt.cs.isEmpty() ? null : bt.cs.bounds();
    if (bb) { const k = Math.min(rIn * 1.4 / (bb.max[0] - bb.min[0]), rIn * 0.9 / (bb.max[1] - bb.min[1]), 1.2); const e = T(T(bt.cs.translate([-(bb.min[0] + bb.max[0]) / 2, -(bb.min[1] + bb.max[1]) / 2])).scale([k, k])); B = sub(B, ext(e, -1, Math.min(0.6, t * 0.3))); }
  }
  return { B, R: Rl, t, rh };
}
function build(msgs) {
  const list = D.set ? [['1.', METALS[0][1]], ['2.', METALS[1][1]], ['3.', METALS[2][1]]] : [[D.txt, D.c1]];
  const out = [], gap = 8; let x = 0;
  list.forEach(([tx, col], k) => {
    const m = medal(msgs, tx, k === 0), b = m.B.boundingBox(), w = b.max[0] - b.min[0], dx = list.length > 1 ? x - b.min[0] : 0;
    out.push({ B: dx ? T(m.B.translate([dx, 0, 0])) : m.B, R: m.R ? (dx ? T(m.R.translate([dx, 0, 0])) : m.R) : null, col, label: list.length > 1 ? ['zlata', 'stribrna', 'bronzova'][k] : '' });
    x += w + gap;
  });
  return { meds: out, t: clamp(D.t, 1.2, 10), rh: clamp(D.rh, 0.4, 4), lh: clamp(D.lh, 0.05, 0.4) };
}

/* ===== Ovládání ===== */
function syncUI() {
  document.querySelectorAll('[data-k]').forEach(el => { const v = D[el.dataset.k]; if (el.type === 'checkbox') el.checked = !!v; else el.value = v; });
  document.querySelectorAll('input[type=radio][name]').forEach(r => { r.checked = String(D[r.name]) === r.value; });
  updateUI();
}
function updateUI() {
  document.querySelectorAll('[data-show]').forEach(el => { el.hidden = !({ slot: D.hang === 'slot', single: !D.set })[el.dataset.show]; });
  document.querySelectorAll('#shapes [data-v]').forEach(b => b.setAttribute('aria-checked', String(b.dataset.v === D.shape)));
  document.querySelectorAll('#icons [data-v]').forEach(b => b.setAttribute('aria-checked', String(b.dataset.v === D.icon)));
  document.querySelectorAll('#fonts [data-v]').forEach(b => b.setAttribute('aria-checked', String(b.dataset.v === D.font)));
  document.querySelectorAll('#presets button').forEach(b => b.setAttribute('aria-pressed', String(!D.set && b.textContent === D.txt)));
  document.querySelectorAll('#metals button').forEach(b => b.setAttribute('aria-pressed', String(!D.set && b.dataset.c === D.c1)));
  $('metals').hidden = D.set; document.querySelector('[data-k=txt]').disabled = D.set;
  $('oTs').textContent = D.ts + ' %'; $('oAs').textContent = D.as + ' %';
  $('modeHint').textContent = (D.set ? 'Tři medaile vedle sebe, ve zlaté, stříbrné a bronzové. ' : '') + (D.colors === 'swap' ? 'Reliéf jinou barvou: jedna výměna filamentu na začátku reliéfu.' : 'Medaile a reliéf jako dva díly jednoho objektu, každý své barvy.');
}
(function () {
  const mk = (box, list, key, svgFn) => { for (const [v, n, svg] of list) { const b = document.createElement('button'); b.type = 'button'; b.setAttribute('role', 'radio'); b.dataset.v = v; b.innerHTML = svgFn(svg) + n; b.onclick = () => { D[key] = v; syncUI(); onChange(key); }; box.append(b); } };
  mk($('shapes'), SHAPES, 'shape', (s) => `<svg viewBox="0 0 34 30">${s}</svg>`);
  mk($('icons'), IC, 'icon', (s) => s ? `<svg viewBox="0 0 24 24" style="fill:currentColor;stroke:none">${s.replace(/stroke="#000"/g, 'stroke="currentColor"')}</svg>` : '<svg viewBox="0 0 24 24"><path d="M5 5l14 14M19 5 5 19" style="fill:none;stroke:currentColor;stroke-width:1.5"/></svg>');
  const fb = $('fonts'); for (const id in FONTS) { const b = document.createElement('button'); b.type = 'button'; b.setAttribute('role', 'radio'); b.dataset.v = id; b.innerHTML = `<span style="font-family:'md-${id}',var(--f-ui)">1. Vítěz</span><small>${FONTS[id]}</small>`; b.onclick = () => { D.font = id; syncUI(); onChange('font'); }; fb.append(b); }
  if (window.FontFace) for (const id in FONTS) { try { const f = new FontFace('md-' + id, fontBuf(id)); f.load().then(ff => document.fonts.add(ff)).catch(() => {}); } catch (e) {} }
  const pb = $('presets'); for (const p of PRESETS) { const b = document.createElement('button'); b.type = 'button'; b.textContent = p; b.onclick = () => { D.txt = p; D.set = false; syncUI(); onChange('txt'); }; pb.append(b); }
  const mb = $('metals'); for (const [n, c] of METALS) { const b = document.createElement('button'); b.type = 'button'; b.dataset.c = c; b.innerHTML = `<i style="display:inline-block;width:10px;height:10px;border-radius:50%;background:${c};margin-right:5px"></i>${n}`; b.onclick = () => { D.c1 = c; syncUI(); onChange('c1'); }; mb.append(b); }
})();
function onChange(path) { if (/^(D|set|shape|hang)$/.test(path)) fitNext = true; updateUI(); saveState(); if (/^c[12]$/.test(path)) { recolor(); return; } schedule(); }
document.querySelectorAll('[data-k]').forEach(el => el.addEventListener(el.type === 'checkbox' ? 'change' : 'input', () => {
  const k = el.dataset.k; let v;
  if (el.type === 'checkbox') v = el.checked; else if (el.type === 'text' || el.type === 'color' || el.tagName === 'TEXTAREA') v = el.value; else { v = parseFloat(el.value); if (!isFinite(v)) return; }
  D[k] = v; onChange(k);
}));
document.querySelectorAll('input[type=radio][name]').forEach(r => r.addEventListener('change', () => { D[r.name] = r.value; onChange(r.name); }));
let tmr = 0;
function schedule(now) { clearTimeout(tmr); tmr = setTimeout(() => { if (!MF) return; busy(true, 'Počítám…'); setTimeout(() => { try { rebuild(); } finally { busy(false); } }, 20); }, now ? 0 : 400); }
function busy(on, txt) { $('busy').hidden = !on; if (txt) $('busy').textContent = txt; }

/* ===== 3D scéna ===== */
const cv = $('cv');
let renderer = null, scene, camera, bedGroup, group = null, fitNext = true, model = null;
const orbit = { theta: -Math.PI / 2, phi: 1.2, r: 300, target: new THREE.Vector3() };
function initGL() {
  try { renderer = new THREE.WebGLRenderer({ canvas: cv, antialias: true }); } catch (e) { renderer = null; return; }
  renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
  scene = new THREE.Scene(); camera = new THREE.PerspectiveCamera(30, 1, 0.5, 6000); camera.up.set(0, 0, 1);
  scene.add(new THREE.HemisphereLight(0xffffff, 0x8a9599, 0.85));
  const d1 = new THREE.DirectionalLight(0xffffff, 0.65); d1.position.set(-150, -220, 260); scene.add(d1);
  const d2 = new THREE.DirectionalLight(0xffffff, 0.35); d2.position.set(240, 120, 140); scene.add(d2);
  applyTheme(); new ResizeObserver(resize).observe($('viewer'));
}
function makeBed() {
  if (bedGroup) { scene.remove(bedGroup); bedGroup.traverse(o => o.geometry && o.geometry.dispose()); }
  bedGroup = new THREE.Group(); const X = D.bedX, Y = D.bedY, minor = [], major = [];
  for (let x = -X / 2; x <= X / 2 + 0.01; x += 10) (Math.round(x) % 50 === 0 ? major : minor).push(x, -Y / 2, 0, x, Y / 2, 0);
  for (let y = -Y / 2; y <= Y / 2 + 0.01; y += 10) (Math.round(y) % 50 === 0 ? major : minor).push(-X / 2, y, 0, X / 2, y, 0);
  for (const [arr, col] of [[minor, css('--grid')], [major, css('--grid-major')]]) { const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(arr, 3)); bedGroup.add(new THREE.LineSegments(g, new THREE.LineBasicMaterial({ color: new THREE.Color(col) }))); }
  bedGroup.position.z = -0.05; scene.add(bedGroup);
}
function applyTheme() { if (!renderer) return; scene.background = new THREE.Color(css('--view')); makeBed(); draw(); }
matchMedia('(prefers-color-scheme: dark)').addEventListener('change', applyTheme);
new MutationObserver(applyTheme).observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
function resize() { if (!renderer) return; const r = $('viewer').getBoundingClientRect(); if (!r.width) return; renderer.setSize(r.width, r.height, false); camera.aspect = r.width / r.height; camera.updateProjectionMatrix(); draw(); }
let raf = 0;
function draw() { if (!renderer || raf) return; raf = requestAnimationFrame(() => { raf = 0; const t = orbit.target, s = Math.sin(orbit.phi);
  camera.position.set(t.x + orbit.r * s * Math.cos(orbit.theta), t.y + orbit.r * s * Math.sin(orbit.theta), t.z + orbit.r * Math.cos(orbit.phi)); camera.lookAt(t); renderer.render(scene, camera); }); }
function fit(view) {
  if (!model || !renderer) return; const b = model.bbox, sx = b.max.x - b.min.x, sy = b.max.y - b.min.y, sz = b.max.z - b.min.z;
  orbit.target.set((b.min.x + b.max.x) / 2, (b.min.y + b.max.y) / 2, sz / 2); const span = Math.max(sx, sy, 20);
  orbit.r = span / (2 * Math.tan(THREE.MathUtils.degToRad(30) / 2)) * Math.max(1.2, 1.6 / camera.aspect);
  if (view === 'top') { orbit.theta = -Math.PI / 2; orbit.phi = 0.001; } else if (view === 'back') { orbit.theta = -Math.PI / 2; orbit.phi = Math.PI - 0.02; } else { orbit.theta = -Math.PI / 2 - 0.3; orbit.phi = 0.7; }
  draw();
}
$('vTop').onclick = () => fit('top'); $('vPersp').onclick = () => fit('persp'); $('vBack').onclick = () => fit('back');
const ptrs = new Map(); let pinch0 = 0, r0 = 0;
cv.addEventListener('contextmenu', e => e.preventDefault());
cv.addEventListener('pointerdown', e => { cv.setPointerCapture(e.pointerId); ptrs.set(e.pointerId, { x: e.clientX, y: e.clientY, b: e.button, shift: e.shiftKey }); if (ptrs.size === 2) { const [a, b] = [...ptrs.values()]; pinch0 = Math.hypot(a.x - b.x, a.y - b.y); r0 = orbit.r; } });
cv.addEventListener('pointermove', e => { const p = ptrs.get(e.pointerId); if (!p) return; const dx = e.clientX - p.x, dy = e.clientY - p.y; p.x = e.clientX; p.y = e.clientY;
  if (ptrs.size === 2) { const [a, b] = [...ptrs.values()]; const d = Math.hypot(a.x - b.x, a.y - b.y); if (pinch0) orbit.r = r0 * pinch0 / d; }
  else if (p.b === 2 || p.shift) { const k = orbit.r * 0.0016, right = new THREE.Vector3(), up = new THREE.Vector3(); camera.matrixWorld.extractBasis(right, up, new THREE.Vector3()); orbit.target.addScaledVector(right, -dx * k).addScaledVector(up, dy * k); }
  else { orbit.theta -= dx * 0.008; orbit.phi = Math.min(Math.PI - 0.02, Math.max(0.001, orbit.phi - dy * 0.008)); } draw(); });
const pup = e => { ptrs.delete(e.pointerId); if (ptrs.size < 2) pinch0 = 0; }; cv.addEventListener('pointerup', pup); cv.addEventListener('pointercancel', pup);
cv.addEventListener('wheel', e => { e.preventDefault(); orbit.r = Math.min(6000, Math.max(5, orbit.r * Math.exp(e.deltaY * 0.0012))); draw(); }, { passive: false });
function showMsgs(list) { const bx = $('msgs'); bx.textContent = ''; for (const m of list) { const d = document.createElement('div'); d.className = 'msg ' + m.lvl; d.textContent = m.msg; bx.append(d); } }
function recolor() { if (!group) return; group.children.forEach(m => { const u = m.userData; m.material.color = new THREE.Color(u.rel ? D.c2 : (D.set ? u.col : D.c1)); }); draw(); updateSwaps(); }

/* ===== Výpočet ===== */
function rebuild() {
  const msgs = []; let r = null;
  try { r = build(msgs); } catch (e) { console.error(e); msgs.push({ lvl: 'bad', msg: 'Medaili se nepodařilo spočítat. Zkuste jiný text nebo tvar.' }); r = null; }
  if (group) { scene && scene.remove(group); group.traverse(o => { o.geometry && o.geometry.dispose(); o.material && o.material.dispose(); }); group = null; }
  if (!r) { model = null; freeAll(); $('btnSave').disabled = true; showMsgs(msgs); $('stats').textContent = ''; $('swaps').textContent = ''; $('dims').textContent = '–'; draw(); return; }
  let vol = 0; const items = [];
  r.meds.forEach((m, mi) => { vol += m.B.volume(); items.push({ g: toGeom(m.B), rel: false, col: m.col, mi }); if (m.R) { vol += m.R.volume(); items.push({ g: toGeom(m.R), rel: true, col: m.col, mi }); } });
  // jeden kus pro výměnu filamentu: sjednocení medaile a reliéfu
  const single = r.meds.map(m => toGeom(m.R ? U([m.B, m.R]) : m.B));
  freeAll();
  const bb = new THREE.Box3(); for (const it of items) { it.g.computeBoundingBox(); bb.union(it.g.boundingBox); }
  const cx = (bb.min.x + bb.max.x) / 2, cy = (bb.min.y + bb.max.y) / 2;
  for (const it of items) it.g.translate(-cx, -cy, 0); for (const g of single) g.translate(-cx, -cy, 0); bb.translate(new THREE.Vector3(-cx, -cy, 0));
  model = { items, single, bbox: bb, r, labels: r.meds.map(m => m.label) };
  group = new THREE.Group();
  for (const it of items) { it.g.computeVertexNormals(); const mesh = new THREE.Mesh(it.g, new THREE.MeshStandardMaterial({ roughness: 0.35, metalness: 0.25, flatShading: true })); mesh.userData = { rel: it.rel, col: it.col }; group.add(mesh); }
  if (renderer) scene.add(group);
  recolor();
  const sx = bb.max.x - bb.min.x, sy = bb.max.y - bb.min.y, sz = bb.max.z - bb.min.z;
  if (sx > D.bedX || sy > D.bedY) msgs.push({ lvl: 'warn', msg: `Medaile (${fmt(sx, 0)} × ${fmt(sy, 0)} mm) se nevejdou na tiskovou plochu.` });
  showMsgs(msgs);
  const nf = r.meds.length * (D.colors === 'ams' ? 2 : 1);
  $('btnSave').disabled = false; $('btnSave').textContent = nf > 1 ? `Stáhnout STL (${nf} soubory)` : 'Stáhnout STL';
  $('dims').innerHTML = `<b>${fmt(sx)}</b> × <b>${fmt(sy)}</b> × <b>${fmt(sz)}</b> mm`;
  const grams = vol / 1000 * 1.24 * 0.8, hrs = grams / 8 + 0.15 * r.meds.length;
  const bx = $('stats'); bx.textContent = '';
  for (const [a, v] of [['Medaile', r.meds.length > 1 ? 'sada 1.–3.' : (String(D.txt).trim() || '—')], ['Rozměry', `${fmt(sx, 0)} × ${fmt(sy, 0)} × ${fmt(sz, 1)} mm`], ['Materiál', `${fmt(Math.max(0.5, grams), grams < 10 ? 1 : 0)} g`], ['Tisk zhruba', hrs < 1 ? `${fmt(hrs * 60, 0)} min` : `${fmt(hrs, 1)} h`]]) {
    const d = document.createElement('div'); d.className = 'stat'; const s1 = document.createElement('span'); s1.textContent = a; const s2 = document.createElement('b'); s2.textContent = v; d.append(s1, s2); bx.append(d);
  }
  if (fitNext) { fit('persp'); fitNext = false; } else draw();
}
function updateSwaps() {
  const bx = $('swaps'); bx.textContent = ''; if (!model) return; const r = model.r, lh = r.lh;
  const line = (h) => { const d = document.createElement('div'); d.innerHTML = h; bx.append(d); };
  const sw = (c) => `<i style="background:${c}"></i>`;
  if (D.colors === 'swap') { line(`<b>Výměna filamentu</b> (vrstva ${fmtP(lh)} mm):`); line(`${sw(D.set ? METALS[0][1] : D.c1)}začátek tisku${D.set ? ' (každá medaile svou barvou)' : ''}`); line(`${sw(D.c2)}od výšky ${fmtP(r.t)} mm → vrstva č. ${Math.round(r.t / lh) + 1}`); if (Math.abs(r.t / lh - Math.round(r.t / lh)) > 0.01) line('<small>Tloušťku volte jako násobek výšky vrstvy, ať výměna sedne přesně.</small>'); }
  else line('Medaile a reliéf jsou samostatné soubory se stejným umístěním: načtěte je najednou jako jeden objekt s více díly.');
}

/* ===== Stažení ===== */
const inViewer = !!(window.claude && typeof window.claude.use === 'function');
let dlCap = null;
if (inViewer) window.claude.use('downloads').then(d => { dlCap = d; updateNote(); }).catch(() => updateNote());
function updateNote() { $('saveNote').textContent = inViewer ? (dlCap ? 'Tady se soubory stáhnou zabalené v ZIP.' : 'Stahování je v tomto zobrazení nedostupné.') : 'Medaile leží reliéfem nahoru, jak se tiskne. Jednotky jsou milimetry.'; }
$('btnSave').onclick = async () => {
  if (!model) return;
  const enc = (geoms) => { const u = stlBinary(geoms), head = 'Created by Julius Andy Antos | Medaile | mm'; for (let i = 0; i < 80; i++) u[i] = i < head.length ? head.charCodeAt(i) : 32; return u; };
  const base = ('medaile_' + (D.set ? 'sada' : String(D.txt).trim() || 'medaile')).normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^A-Za-z0-9_-]+/g, '_').replace(/_+$/, '');
  const files = [];
  model.single.forEach((g, k) => {
    const lab = model.labels[k] ? '_' + model.labels[k] : '';
    if (D.colors === 'swap') files.push({ name: `${base}${lab}.stl`, data: enc([g]) });
    else { const its = model.items.filter(it => it.mi === k); const b = its.filter(i => !i.rel), r = its.filter(i => i.rel); files.push({ name: `${base}${lab}_medaile.stl`, data: enc(b.map(i => i.g)) }); if (r.length) files.push({ name: `${base}${lab}_relief.stl`, data: enc(r.map(i => i.g)) }); }
  });
  if (inViewer) { if (!dlCap) return; try { await dlCap.save({ filename: base + '.zip', data: makeZip(files) }); $('saveNote').textContent = 'ZIP je uložený.'; } catch (err) { if (err && err.code !== 'declined') $('saveNote').textContent = 'Soubor se nepodařilo uložit.'; } return; }
  for (const f of files) { const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([f.data], { type: 'model/stl' })); a.download = f.name; document.body.append(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 2000); if (files.length > 1) await new Promise(r => setTimeout(r, 300)); }
};

/* ===== Instalace jako aplikace a sbalitelné sekce ===== */
let installEvt = null;
window.addEventListener('beforeinstallprompt', (e) => { e.preventDefault(); installEvt = e; $('btnInstall').hidden = false; });
window.addEventListener('appinstalled', () => { installEvt = null; $('btnInstall').hidden = true; });
$('btnInstall').onclick = async () => { if (!installEvt) return; installEvt.prompt(); try { await installEvt.userChoice; } catch (e) {} installEvt = null; $('btnInstall').hidden = true; };
if (!inViewer && 'serviceWorker' in navigator && (location.protocol === 'https:' || location.hostname === 'localhost')) navigator.serviceWorker.register('sw.js').catch(() => {});
(function () {
  const KEY = 'medaile-sbaleno';
  let closed; try { closed = JSON.parse(localStorage.getItem(KEY) || 'null'); } catch (e) { closed = null; }
  if (!Array.isArray(closed)) closed = ['Tiskárna', 'Rady', 'Zadní strana'];
  document.querySelectorAll('aside section.card > h2').forEach(h => {
    const card = h.parentElement, name = h.textContent.replace(/^\d/, '').trim();
    h.tabIndex = 0; h.setAttribute('role', 'button');
    const apply = () => { const c = closed.includes(name); card.classList.toggle('collapsed', c); h.setAttribute('aria-expanded', String(!c)); };
    const toggle = () => { closed = closed.includes(name) ? closed.filter(n => n !== name) : closed.concat(name); try { localStorage.setItem(KEY, JSON.stringify(closed)); } catch (e) {} apply(); };
    h.onclick = toggle; h.onkeydown = (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggle(); } };
    apply();
  });
})();
const deskMQ = matchMedia('(min-width: 861px)');
const pinTop = () => { if (deskMQ.matches && (window.scrollY || document.documentElement.scrollTop || document.body.scrollTop)) { window.scrollTo(0, 0); document.body.scrollTop = 0; } };
window.addEventListener('scroll', pinTop, { passive: true }); document.body.addEventListener('scroll', pinTop, { passive: true });
document.addEventListener('focusin', () => requestAnimationFrame(pinTop));

/* ===== Start ===== */
initGL(); syncUI(); updateNote();
initMF().then(() => { busy(false); schedule(true); }).catch((e) => { console.error(e); busy(false); showMsgs([{ lvl: 'bad', msg: 'Výpočetní modul se nepodařilo načíst. Zkuste novější prohlížeč.' }]); });

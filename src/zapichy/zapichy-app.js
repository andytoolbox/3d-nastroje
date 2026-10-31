/* ===== Zápichy do dortu – nápis s ozdobou nebo destička se vkládanými znaky. Created by Julius Andy Antoš ===== */
const $ = (id) => document.getElementById(id);
// písma: [název, psací]
const FONTS = { greatvibes: ['Great Vibes', 1], dancing: ['Dancing Script', 1], pacifico: ['Pacifico', 1], lobster: ['Lobster', 1], playball: ['Playball', 1],
  norican: ['Norican', 1], grandhotel: ['Grand Hotel', 1], damion: ['Damion', 1], baloo: ['Baloo', 0], poppins: ['Poppins', 0], playfair: ['Playfair', 0], anton: ['Anton', 0] };
const PRESETS = ['Krásné\nnarozeniny', 'Všechno\nnejlepší', 'Šťastné\nvýročí', 'Love', 'Mr & Mrs', 'Na zdraví', 'Křtiny', 'Happy\nBirthday'];
const TYPES = [['text', 'Nápis', '<path d="M6 14c2-6 6-6 6 0s3 4 5-1 5-4 6 0 3 3 5 0"/><path d="M17 17v11"/>'],
  ['plate', 'Destička se znaky', '<rect x="5" y="7" width="24" height="12" rx="2"/><path d="M11 10v6M15 10h4v6h-4M23 10v6"/><path d="M12 19v9M22 19v9"/>']];
const ORNS = [['none', 'Bez', '<path d="M9 7l16 16M25 7 9 23"/>'], ['heart', 'Srdce', '<path d="M17 25S6 18 6 11.5C6 8 8.5 6 11 6c2.4 0 4.3 1.6 6 4 1.7-2.4 3.6-4 6-4 2.5 0 5 2 5 5.5C28 18 17 25 17 25z"/>'],
  ['hearts', 'Tři srdce', '<path d="M19 20s-8-5-8-10c0-2.5 2-4 3.8-4 1.8 0 3.1 1.2 4.2 2.8 1.1-1.6 2.4-2.8 4.2-2.8 1.8 0 3.8 1.5 3.8 4 0 5-8 10-8 10z"/><path d="M12 26s-6-3.6-6-7.3c0-1.8 1.4-2.9 2.8-2.9 1.3 0 2.3.9 3.2 2 .9-1.1 1.9-2 3.2-2 1.4 0 2.8 1.1 2.8 2.9 0 3.7-6 7.3-6 7.3z"/>'],
  ['swirl', 'Ornament', '<path d="M17 16c-3 0-6-1-8 1s0 5 2 4 0-3-1-2M17 16c3 0 6-1 8 1s0 5-2 4 0-3 1-2"/><path d="M17 14s-2-1.5-2-3c0-1 .8-1.6 1.4-1.6.3 0 .5.2.6.4.1-.2.3-.4.6-.4.6 0 1.4.6 1.4 1.6 0 1.5-2 3-2 3z"/>'],
  ['crown', 'Koruna', '<path d="M6 22l-1-12 6 5 6-9 6 9 6-5-1 12z"/>'], ['stars', 'Hvězdy', '<path d="M14 6l2 5 5 .5-4 3.5 1.2 5L14 17l-4.2 3 1.2-5-4-3.5 5-.5z"/><path d="M25 16l1 2.4 2.5.3-2 1.7.6 2.5-2.1-1.4-2.1 1.4.6-2.5-2-1.7 2.5-.3z"/>']];
const DEF = { type: 'text', lines: 'Krásné\nnarozeniny', font: 'greatvibes', W: 150, bold: 0.5, ls: 72, t: 3,
  age: '40', name: 'Jana', shape: 'arch', fAge: 'baloo', fName: 'pacifico', PW: 110, pt: 4, dp: 1.2, raise: 0.8, clr: 0.15, pbold: 0.3, rim: true,
  orn: 'hearts', ornPos: 'top', os: 30, sticks: '2', L: 90, sw: 5, c1: '#d9b25f', c2: '#e05a8a', bedX: 220, bedY: 220, bedZ: 250 };
const STORE = 'zapichy-v1';
const D = Object.assign({}, DEF);
try { const s = JSON.parse(localStorage.getItem(STORE) || '{}'); for (const k in DEF) if (k in s && typeof s[k] === typeof DEF[k]) D[k] = s[k]; } catch (e) {}
for (const k of ['font', 'fAge', 'fName']) if (!FONTS[D[k]]) D[k] = DEF[k];
const saveState = () => { try { localStorage.setItem(STORE, JSON.stringify(D)); } catch (e) {} };
const fmt = (v, d = 1) => (+v).toLocaleString('cs-CZ', { maximumFractionDigits: d, minimumFractionDigits: d });
const fmtP = (v) => (+v).toLocaleString('cs-CZ', { maximumFractionDigits: 2 });
const css = (v) => getComputedStyle(document.documentElement).getPropertyValue(v).trim();
const clamp = (v, a, b) => Math.min(b, Math.max(a, +v || 0));

/* ===== Písma ===== */
const FONT_CACHE = {};
const fontBuf = (id) => { const s = atob(ZP_FONTS[id]), u = new Uint8Array(s.length); for (let i = 0; i < s.length; i++) u[i] = s.charCodeAt(i); return u.buffer; };
const getFont = (id) => FONT_CACHE[id] || (FONT_CACHE[id] = opentype.parse(fontBuf(id)));

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
const U = (list) => { list = list.filter(Boolean); return list.length ? T(MF.Manifold.union(list)) : null; };
const CU = (list) => { list = list.filter(c => c && !c.isEmpty()); return list.length ? T(MF.CrossSection.union(list)) : null; };
const cl = (cs) => T(T(T(cs.offset(-0.02, 'Round')).offset(0.02, 'Round')).simplify(0.002));
const empty = (cs) => !cs || cs.isEmpty() || cs.area() < 0.01;
const poly = (pts) => T(new MF.CrossSection([pts], 'NonZero'));
const circ = (r, x, y, n) => T(T(MF.CrossSection.circle(r, n || 32)).translate([x, y]));
const fromEx = (exs) => T(new MF.CrossSection(exToPaths(exs).map(p => p.map(q => [q.X / SC, q.Y / SC])), 'NonZero'));
const rrect = (w, h, r) => T(T(MF.CrossSection.square([Math.max(0.01, w - 2 * r), Math.max(0.01, h - 2 * r)], true)).offset(r, 'Round', 2, 64));
const center = (cs, x, y) => { const b = cs.bounds(); return T(cs.translate([x - (b.min[0] + b.max[0]) / 2, y - (b.min[1] + b.max[1]) / 2])); };

/* ===== Text ===== */
function textCS(fontId, text, lineH) {
  const L = layoutText(getFont(fontId), text, { size: 10, lineH: lineH || 1.15, spacing: 0, align: 'center', mirror: false, slant: 0 });
  return { cs: T(fromEx(unionEx(L.paths)).simplify(0.002)), missing: L.missing };
}
// nápis do obdélníku w × h, střed v (cx, cy)
function fitText(fontId, text, w, h, cx, cy) {
  const r = textCS(fontId, text); if (empty(r.cs)) return { cs: null, missing: r.missing };
  const b = r.cs.bounds(), k = Math.min(w / (b.max[0] - b.min[0]), h / (b.max[1] - b.min[1]));
  return { cs: T(T(center(r.cs, 0, 0).scale([k, k])).translate([cx, cy])), missing: r.missing };
}

/* ===== Ozdoby ===== */
// tah po lomené čáře: úsečky a kolečka v kloubech
function stroke(pts, w) {
  const parts = [];
  for (let i = 0; i < pts.length; i++) {
    parts.push(circ(w / 2, pts[i][0], pts[i][1], 16));
    if (i) { const [a, b] = [pts[i - 1], pts[i]], L = Math.hypot(b[0] - a[0], b[1] - a[1]); if (L < 1e-6) continue; const nx = -(b[1] - a[1]) / L * w / 2, ny = (b[0] - a[0]) / L * w / 2;
      parts.push(poly([[a[0] + nx, a[1] + ny], [a[0] - nx, a[1] - ny], [b[0] - nx, b[1] - ny], [b[0] + nx, b[1] + ny]])); }
  }
  return CU(parts);
}
function heartCS(s) { const P = []; for (let i = 0; i < 120; i++) { const t = i / 120 * 2 * Math.PI, x = 16 * Math.sin(t) ** 3, y = 13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t); P.push([x / 32 * s, y / 32 * s]); } return poly(P); }
function starCS(r) { const P = []; for (let i = 0; i < 10; i++) { const a = Math.PI / 2 + i * Math.PI / 5, rr = i % 2 ? r * 0.45 : r; P.push([rr * Math.cos(a), rr * Math.sin(a)]); } return T(T(poly(P).offset(-r * 0.04, 'Round')).offset(r * 0.04, 'Round')); }
const outline = (cs, w) => T(cs.subtract(T(cs.offset(-w, 'Round'))));
function ornCS(kind, s) {
  const w = Math.max(1.6, s * 0.045);
  if (kind === 'heart') return outline(heartCS(s), w);
  if (kind === 'hearts') {
    const a = T(outline(heartCS(s * 0.62), w).rotate(-10)), b = T(T(outline(heartCS(s * 0.46), w).rotate(14)).translate([s * 0.25, -s * 0.2])), c = T(T(outline(heartCS(s * 0.3), w).rotate(-4)).translate([-s * 0.24, -s * 0.22]));
    return CU([T(a.translate([0, s * 0.06])), b, c]);
  }
  if (kind === 'swirl') {
    const half = [];
    for (let i = 0; i <= 30; i++) { const u = i / 30; half.push([s * (0.04 + 0.24 * u), -s * 0.035 * Math.sin(2 * Math.PI * u)]); }
    const C = [s * 0.4, 0], r0 = s * 0.12;
    for (let i = 1; i <= 90; i++) { const th = Math.PI + i / 90 * 1.7 * Math.PI, r = r0 * (1 - (th - Math.PI) / (2.8 * Math.PI)); half.push([C[0] + r * Math.cos(th), C[1] - r * Math.sin(th)]); }
    const right = stroke(half, w), left = T(right.mirror([1, 0]));
    const top = []; for (let i = 0; i <= 40; i++) { const u = i / 40; top.push([s * 0.03 + s * 0.17 * u, s * 0.03 + s * 0.09 * Math.sin(Math.PI * u) + s * 0.02 * u]); }
    const tr = stroke(top, w * 0.8), tl = T(tr.mirror([1, 0]));
    return CU([right, left, tr, tl, T(heartCS(s * 0.16).translate([0, s * 0.1]))]);
  }
  if (kind === 'crown') {
    const h = s * 0.5, P = [[-s / 2, -h / 2], [s / 2, -h / 2], [s * 0.5, h * 0.3], [s * 0.25, -h * 0.02], [0, h * 0.5], [-s * 0.25, -h * 0.02], [-s * 0.5, h * 0.3]];
    const body = T(T(poly(P).offset(-0.6, 'Round')).offset(0.6, 'Round'));
    return CU([outline(body, w), T(T(MF.CrossSection.square([s, w * 1.4], true)).translate([0, -h * 0.25])), circ(w * 1.1, -s * 0.5, h * 0.3 + w * 0.6), circ(w * 1.1, 0, h * 0.5 + w * 0.6), circ(w * 1.1, s * 0.5, h * 0.3 + w * 0.6)]);
  }
  if (kind === 'stars') {
    const st = (r, x, y, rot) => T(T(outline(starCS(r), w).rotate(rot)).translate([x, y]));
    return CU([st(s * 0.26, 0, s * 0.05, 0), st(s * 0.15, -s * 0.33, -s * 0.08, 12), st(s * 0.17, s * 0.32, -s * 0.06, -10)]);
  }
  return null;
}

/* ===== Spojení do jednoho kusu ===== */
// samostatné kousky (tečky, čárky, slova, ozdoba) se připojí můstkem k největšímu kusu
function weld(S, w) {
  let comps = S.decompose().map(c => T(c)).filter(c => c.area() > 0.3).sort((a, b) => b.area() - a.area());
  if (comps.length <= 1) return { S: comps[0] || S, n: 0 };
  const pts = (cs) => T(cs.simplify(0.15)).toPolygons().flat();
  let target = pts(comps[0]); const loose = comps.slice(1), bridges = [];
  while (loose.length) {
    let best = null;
    loose.forEach((c, i) => { for (const p of pts(c)) for (const q of target) { const d = (p[0] - q[0]) ** 2 + (p[1] - q[1]) ** 2; if (!best || d < best.d) best = { d, p, q, i }; } });
    const c = loose.splice(best.i, 1)[0], L = Math.sqrt(best.d);
    if (L > 0.01) { const [p, q] = [best.p, best.q], ux = (q[0] - p[0]) / L, uy = (q[1] - p[1]) / L, e = w * 0.8; bridges.push(stroke([[p[0] - ux * e, p[1] - uy * e], [q[0] + ux * e, q[1] + uy * e]], w)); }
    target = target.concat(pts(c));
  }
  return { S: cl(CU(comps.concat(bridges))), n: bridges.length };
}
// tahy tenčí než 2·r (část plochy, která zmizí po zúžení a rozšíření)
const thinShare = (cs, r) => { const a = cs.area(); return a ? 1 - T(T(cs.offset(-r, 'Round')).offset(r, 'Round')).area() / a : 0; };

/* ===== Zápichy ===== */
function stickCS(x, yTop, yTip, sw) {
  const tip = Math.min(sw * 2.2, (yTop - yTip) * 0.4), e = Math.min(0.5, sw * 0.12);
  return poly([[x - sw / 2, yTop], [x - sw / 2, yTip + tip], [x - e, yTip], [x + e, yTip], [x + sw / 2, yTip + tip], [x + sw / 2, yTop]]);
}
// místo pro zápich: sloupec pod nápisem, kde je nejvíc materiálu (aby se zápich napojil na písmeno)
function stickX(S, target, range, sw, y0, y1) {
  let best = null;
  for (let dx = 0; dx <= range; dx += 1) for (const sg of dx ? [1, -1] : [1]) {
    const x = target + sg * dx, a = T(S.intersect(T(T(MF.CrossSection.square([sw, y1 - y0])).translate([x - sw / 2, y0])))).area();
    const score = a - dx * sw * 0.05; if (!best || score > best.score) best = { x, a, score };
  }
  return best;
}

/* ===== Stavba ===== */
function buildText(msgs) {
  const W = clamp(D.W, 60, 300), t = clamp(D.t, 1.5, 8), bold = clamp(D.bold, 0, 2), ls = clamp(D.ls, 50, 130) / 100;
  const txt = String(D.lines || '').replace(/\r/g, '').split('\n').map(s => s.trim()).filter(Boolean).slice(0, 4).join('\n');
  if (!txt) { msgs.push({ lvl: 'bad', msg: 'Napište text zápichu.' }); return null; }
  const r = textCS(D.font, txt, 1.15 * ls);
  if (r.missing.length) msgs.push({ lvl: 'warn', msg: `Písmo neumí znaky: ${r.missing.join(' ')}` });
  if (empty(r.cs)) return null;
  const b0 = r.cs.bounds(), k = (W - 2 * bold) / (b0.max[0] - b0.min[0]);
  let S = T(center(r.cs, 0, 0).scale([k, k]));
  if (bold > 0) S = T(S.offset(bold, 'Round'));
  S = cl(S);
  const nLines = txt.split('\n').length; let b = S.bounds();
  const lineH = (b.max[1] - b.min[1]) / Math.max(1, nLines * 0.9);
  // ozdoba
  const s = W * clamp(D.os, 15, 70) / 100; let O = ornCS(D.orn, s);
  if (O) {
    const ob = O.bounds(), oh = ob.max[1] - ob.min[1], ow = ob.max[0] - ob.min[0];
    if (D.ornPos === 'left') O = center(O, b.min[0] - ow * 0.38, b.max[1] - lineH * 0.45);
    else if (D.ornPos === 'right') O = center(O, b.max[0] + ow * 0.38, b.max[1] - lineH * 0.45);
    else O = center(O, 0, b.max[1] + oh * 0.36);
    S = cl(CU([S, O]));
  }
  const wBr = Math.max(1.6, bold * 2 + 1);
  const wd = weld(S, wBr); S = wd.S;
  if (wd.n) msgs.push({ lvl: 'info', msg: `Oddělené části (${wd.n}) jsou připojené tenkým můstkem, aby zápich držel pohromadě.` });
  b = S.bounds();
  // zápichy pod spodním řádkem
  const sw = clamp(D.sw, 3, 10), L = clamp(D.L, 30, 200), n = D.sticks === '2' ? 2 : 1, y0 = b.min[1], probeTop = y0 + lineH * 0.55;
  const targets = n === 2 ? [-W * 0.26, W * 0.26] : [0], sticks = [];
  for (const tx of targets) {
    const best = stickX(S, tx, W * 0.14, sw, y0 - 1, probeTop);
    const top = best.a > sw * 1.5 ? probeTop : (b.min[1] + b.max[1]) / 2;
    sticks.push(stickCS(best.x, top, y0 - L, sw));
  }
  let A = cl(CU([S, ...sticks]));
  const w2 = weld(A, Math.max(wBr, sw * 0.6)); A = w2.S;
  if (w2.n) msgs.push({ lvl: 'info', msg: 'Zápich nedosáhl na písmeno, je připojený můstkem.' });
  const th = thinShare(S, 0.6);
  if (th > 0.04) msgs.push({ lvl: 'warn', msg: `Některé tahy jsou tenčí než 1,2 mm (asi ${Math.round(th * 100)} % plochy) a tryskou 0,4 mm se vytisknou špatně. Zvyšte zesílení tahů nebo šířku nápisu.` });
  return { parts: [{ m: ext(A, 0, t), role: 'body' }], files: [['', [0]]], t, label: txt.replace(/\n/g, ' ') };
}

function plateShape(kind, W, H) {
  if (kind === 'oval') return T(T(MF.CrossSection.circle(W / 2, 160)).scale([1, H / W]));
  if (kind === 'arch') { // rovný spodek s oblými rohy, nahoře půlelipsa přes celou šířku
    const r = Math.min(8, H * 0.15), a = Math.min(H * 0.32, W * 0.3), yc = H / 2 - a, hb = H - a;
    const body = T(rrect(W, hb, r).translate([0, yc - hb / 2])), upper = T(T(MF.CrossSection.square([W, hb / 2])).translate([-W / 2, yc - hb / 2]));
    const top = T(T(T(MF.CrossSection.circle(W / 2, 160)).scale([1, a / (W / 2)])).translate([0, yc]));
    return cl(CU([body, upper, top])); }
  return rrect(W, H, Math.min(8, H * 0.15));
}
function buildPlate(msgs) {
  const W = clamp(D.PW, 50, 250), t = clamp(D.pt, 2.5, 10), dp = Math.min(clamp(D.dp, 0.6, 4), t - 1.2), raise = clamp(D.raise, 0, 4), clr = clamp(D.clr, 0, 0.6), pb = clamp(D.pbold, 0, 1.5);
  const age = String(D.age || '').trim(), name = String(D.name || '').trim();
  if (!age && !name) { msgs.push({ lvl: 'bad', msg: 'Napište věk nebo jméno.' }); return null; }
  const pad = Math.max(6, W * 0.08), Wi = W - 2 * pad, Ha = age ? W * 0.36 : 0, Hn = name ? W * 0.15 : 0, gap = age && name ? W * 0.05 : 0;
  const H = pad * 2 + Ha + gap + Hn + (D.shape === 'oval' ? W * 0.12 : D.shape === 'arch' ? W * 0.1 : 0);
  const shape = plateShape(D.shape, W, H), sb = shape.bounds(), cy = (sb.min[1] + sb.max[1]) / 2 - (D.shape === 'arch' ? H * 0.03 : 0);
  const top = cy + (Ha + gap + Hn) / 2, letters = [];
  const add = (fid, text, w, h, y) => { const r = fitText(fid, text, w, h, 0, y); if (r.missing.length) msgs.push({ lvl: 'warn', msg: `Písmo neumí znaky: ${r.missing.join(' ')}` }); if (r.cs) letters.push(pb ? T(r.cs.offset(pb, 'Round')) : r.cs); };
  if (age) add(D.fAge, age, Wi * (D.shape === 'oval' ? 0.62 : 0.7), Ha, top - Ha / 2);
  if (name) add(D.fName, name, Wi * (D.shape === 'oval' ? 0.78 : 0.92), Hn, top - Ha - gap - Hn / 2);
  let Lt = CU(letters); if (!Lt) return null;
  Lt = cl(T(Lt.intersect(T(shape.offset(-2.5 - clr, 'Round')))));
  // díly: každý souvislý kousek zvlášť; drobné (čárky, tečky) se jen ohlásí
  const pieces = Lt.decompose().map(c => T(c)).filter(c => c.area() > 0.2);
  const tiny = pieces.filter(c => c.area() < 6).length;
  if (tiny) msgs.push({ lvl: 'info', msg: `${tiny} ${tiny === 1 ? 'drobný díl' : tiny < 5 ? 'drobné díly' : 'drobných dílů'} (čárka, tečka, háček): vkládejte pinzetou.` });
  const th = thinShare(Lt, 0.6); if (th > 0.04) msgs.push({ lvl: 'warn', msg: 'Některé tahy znaků jsou tenčí než 1,2 mm. Zvyšte zesílení znaků, zvolte tučnější písmo nebo větší destičku.' });
  const pocket = cl(T(Lt.offset(clr + 0.003, 'Round')));
  // ozdoba nahoře a zápichy dole
  const s = W * clamp(D.os, 15, 70) / 100 * 1.2; let O = ornCS(D.orn, s);
  if (O) { const ob = O.bounds(), oh = ob.max[1] - ob.min[1]; O = center(O, 0, sb.max[1] + oh * 0.36); }
  const sw = clamp(D.sw, 3, 10), L = clamp(D.L, 30, 200), y0 = sb.min[1], sticks = [];
  for (const x of D.sticks === '2' ? [-W * 0.26, W * 0.26] : [0]) {
    // spodek tvaru v místě zápichu (ovál se zaobluje)
    const col = T(shape.intersect(T(T(MF.CrossSection.square([sw, H])).translate([x - sw / 2, y0])))), yb = empty(col) ? cy : col.bounds().min[1];
    sticks.push(stickCS(x, yb + Math.min(6, H * 0.2), yb - L, sw));
  }
  let base = CU([shape, ...sticks]);
  if (O) { const wd = weld(cl(CU([base, O])), Math.max(1.6, s * 0.045)); base = wd.S; }
  let P = sub(ext(base, 0, t), ext(pocket, t - dp, t + 1));
  if (D.rim) { const rw = Math.max(1.6, W * 0.018); const ring = T(T(shape.offset(-0.031, 'Round')).subtract(T(shape.offset(-rw, 'Round')))); P = U([P, ext(ring, t - 0.3, t + Math.max(0.6, raise))]); }
  const ins = U(pieces.map(c => ext(c, 0, dp + raise)));
  const shown = ins ? T(ins.translate([0, 0, t - dp])) : null;
  // ke stažení: znaky vedle destičky
  const pbb = P.boundingBox(), ib = ins ? ins.boundingBox() : null, laid = ins ? T(ins.translate([pbb.max[0] + 8 - ib.min[0], 0, 0])) : null;
  if (raise + dp < 1.2) msgs.push({ lvl: 'info', msg: 'Vkládané znaky jsou tenké (pod 1,2 mm). Zvětšete hloubku prohlubní nebo výšku nad destičkou.' });
  msgs.push({ lvl: 'info', msg: `Znaky jsou vysoké ${fmtP(Math.round((dp + raise) * 10) / 10)} mm, v destičce zapadnou ${fmtP(dp)} mm hluboko a ${raise ? fmtP(raise) + ' mm vystoupí' : 'budou zarovnané s povrchem'}.` });
  return { parts: [{ m: P, role: 'body' }, ...(shown ? [{ m: shown, role: 'ins', dl: laid }] : [])], t, label: [age, name].filter(Boolean).join(' ') };
}
const sub = (a, b) => T(a.subtract(b));
function build(msgs) { return D.type === 'plate' ? buildPlate(msgs) : buildText(msgs); }

/* ===== Ovládání ===== */
function syncUI() {
  document.querySelectorAll('[data-k]').forEach(el => { const v = D[el.dataset.k]; if (el.type === 'checkbox') el.checked = !!v; else el.value = v; });
  document.querySelectorAll('input[type=radio][name]').forEach(r => { r.checked = String(D[r.name]) === r.value; });
  updateUI();
}
function updateUI() {
  document.querySelectorAll('[data-show]').forEach(el => { el.hidden = !({ text: D.type === 'text', plate: D.type === 'plate' })[el.dataset.show]; });
  for (const [box, key] of [['types', 'type'], ['orns', 'orn'], ['fonts', 'font'], ['fAge', 'fAge'], ['fName', 'fName']]) document.querySelectorAll('#' + box + ' [data-v]').forEach(b => b.setAttribute('aria-checked', String(b.dataset.v === D[key])));
  document.querySelectorAll('#presets button').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.v === D.lines)));
  $('oOs').textContent = D.os + ' %';
  $('c1lbl').textContent = D.type === 'plate' ? 'Destička' : 'Zápich';
  $('modeHint').textContent = D.type === 'plate' ? 'Destička a znaky jsou dva soubory. Znaky se tisknou zvlášť jinou barvou a vlepí se do prohlubní.' : 'Nápis, ozdoba a zápich jsou jeden kus, tiskne se jednou barvou.';
}
(function () {
  const mk = (box, list, key, svg) => { for (const [v, n, s] of list) { const b = document.createElement('button'); b.type = 'button'; b.setAttribute('role', 'radio'); b.dataset.v = v; b.innerHTML = svg(s) + n; b.onclick = () => { D[key] = v; fitNext = true; syncUI(); onChange(key); }; $(box).append(b); } };
  mk('types', TYPES, 'type', (s) => `<svg viewBox="0 0 34 30">${s}</svg>`);
  mk('orns', ORNS, 'orn', (s) => `<svg viewBox="0 0 34 30">${s}</svg>`);
  const fb = (box, key, filt, sample) => { for (const id in FONTS) { if (filt !== null && FONTS[id][1] !== filt && filt !== 2) continue; const b = document.createElement('button'); b.type = 'button'; b.setAttribute('role', 'radio'); b.dataset.v = id;
    b.innerHTML = `<span style="font-family:'zp-${id}',var(--f-ui)">${sample}</span><small>${FONTS[id][0]}</small>`; b.onclick = () => { D[key] = id; syncUI(); onChange(key); }; $(box).append(b); } };
  fb('fonts', 'font', 2, 'Love'); fb('fAge', 'fAge', 2, '40'); fb('fName', 'fName', 2, 'Jana');
  if (window.FontFace) for (const id in FONTS) { try { const f = new FontFace('zp-' + id, fontBuf(id)); f.load().then(ff => document.fonts.add(ff)).catch(() => {}); } catch (e) {} }
  for (const p of PRESETS) { const b = document.createElement('button'); b.type = 'button'; b.dataset.v = p; b.textContent = p.replace('\n', ' '); b.onclick = () => { D.lines = p; syncUI(); onChange('lines'); }; $('presets').append(b); }
})();
function onChange(path) { if (/^(W|PW|L|sticks|type|shape|ornPos)$/.test(path)) fitNext = true; updateUI(); saveState(); if (/^c[12]$/.test(path)) { recolor(); return; } schedule(); }
document.querySelectorAll('[data-k]').forEach(el => el.addEventListener(el.type === 'checkbox' ? 'change' : 'input', () => {
  const k = el.dataset.k; let v;
  if (el.type === 'checkbox') v = el.checked; else if (el.type === 'text' || el.type === 'color' || el.tagName === 'TEXTAREA') v = el.value; else { v = parseFloat(el.value); if (!isFinite(v)) return; }
  D[k] = v; onChange(k);
}));
document.querySelectorAll('input[type=radio][name]').forEach(r => r.addEventListener('change', () => { D[r.name] = r.value; onChange(r.name); }));
let tmr = 0;
function schedule(now) { clearTimeout(tmr); tmr = setTimeout(() => { if (!MF) return; busy(true, 'Počítám…'); setTimeout(() => { try { rebuild(); } finally { busy(false); } }, 20); }, now ? 0 : 450); }
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
  const d1 = new THREE.DirectionalLight(0xffffff, 0.6); d1.position.set(-150, -220, 260); scene.add(d1);
  const d2 = new THREE.DirectionalLight(0xffffff, 0.3); d2.position.set(240, 120, 140); scene.add(d2);
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
let raf = 0, userMoved = false, lastView = 'top';
function resize() { if (!renderer) return; const r = $('viewer').getBoundingClientRect(); if (!r.width) return; renderer.setSize(r.width, r.height, false); camera.aspect = r.width / r.height; camera.updateProjectionMatrix(); if (!userMoved && model) fit(lastView); else draw(); }
function draw() { if (!renderer || raf) return; raf = requestAnimationFrame(() => { raf = 0; const t = orbit.target, s = Math.sin(orbit.phi);
  camera.position.set(t.x + orbit.r * s * Math.cos(orbit.theta), t.y + orbit.r * s * Math.sin(orbit.theta), t.z + orbit.r * Math.cos(orbit.phi)); camera.lookAt(t); renderer.render(scene, camera); }); }
function fit(view) {
  if (!model || !renderer) return; lastView = view; const b = model.bbox, sx = b.max.x - b.min.x, sy = b.max.y - b.min.y, sz = b.max.z - b.min.z;
  orbit.target.set((b.min.x + b.max.x) / 2, (b.min.y + b.max.y) / 2, sz / 2); const span = Math.max(sy, sx / camera.aspect, 20);
  orbit.r = span / (2 * Math.tan(THREE.MathUtils.degToRad(30) / 2)) * (view === 'top' ? 1.12 : 1.3);
  if (view === 'top') { orbit.theta = -Math.PI / 2; orbit.phi = 0.001; } else { orbit.theta = -Math.PI / 2 - 0.25; orbit.phi = 0.6; }
  draw();
}
$('vTop').onclick = () => { userMoved = false; fit('top'); }; $('vPersp').onclick = () => { userMoved = false; fit('persp'); };
const ptrs = new Map(); let pinch0 = 0, r0 = 0;
cv.addEventListener('contextmenu', e => e.preventDefault());
cv.addEventListener('pointerdown', e => { cv.setPointerCapture(e.pointerId); userMoved = true; ptrs.set(e.pointerId, { x: e.clientX, y: e.clientY, b: e.button, shift: e.shiftKey }); if (ptrs.size === 2) { const [a, b] = [...ptrs.values()]; pinch0 = Math.hypot(a.x - b.x, a.y - b.y); r0 = orbit.r; } });
cv.addEventListener('pointermove', e => { const p = ptrs.get(e.pointerId); if (!p) return; const dx = e.clientX - p.x, dy = e.clientY - p.y; p.x = e.clientX; p.y = e.clientY;
  if (ptrs.size === 2) { const [a, b] = [...ptrs.values()]; const d = Math.hypot(a.x - b.x, a.y - b.y); if (pinch0) orbit.r = r0 * pinch0 / d; }
  else if (p.b === 2 || p.shift) { const k = orbit.r * 0.0016, right = new THREE.Vector3(), up = new THREE.Vector3(); camera.matrixWorld.extractBasis(right, up, new THREE.Vector3()); orbit.target.addScaledVector(right, -dx * k).addScaledVector(up, dy * k); }
  else { orbit.theta -= dx * 0.008; orbit.phi = Math.min(Math.PI - 0.02, Math.max(0.001, orbit.phi - dy * 0.008)); } draw(); });
const pup = e => { ptrs.delete(e.pointerId); if (ptrs.size < 2) pinch0 = 0; }; cv.addEventListener('pointerup', pup); cv.addEventListener('pointercancel', pup);
cv.addEventListener('wheel', e => { e.preventDefault(); userMoved = true; orbit.r = Math.min(6000, Math.max(5, orbit.r * Math.exp(e.deltaY * 0.0012))); draw(); }, { passive: false });
function showMsgs(list) { const bx = $('msgs'); bx.textContent = ''; for (const m of list) { const d = document.createElement('div'); d.className = 'msg ' + m.lvl; d.textContent = m.msg; bx.append(d); } }
function recolor() { if (!group) return; group.children.forEach(m => { m.material.color = new THREE.Color(m.userData.role === 'ins' ? D.c2 : D.c1); }); draw(); updateSwaps(); }

/* ===== Výpočet ===== */
function rebuild() {
  const msgs = []; let r = null;
  try { r = build(msgs); } catch (e) { console.error(e); msgs.push({ lvl: 'bad', msg: 'Zápich se nepodařilo spočítat. Zkuste jiný text, písmo nebo rozměr.' }); r = null; }
  if (group) { scene && scene.remove(group); group.traverse(o => { o.geometry && o.geometry.dispose(); o.material && o.material.dispose(); }); group = null; }
  if (!r) { model = null; freeAll(); $('btnSave').disabled = true; showMsgs(msgs); $('stats').textContent = ''; $('swaps').textContent = ''; $('dims').textContent = '–'; draw(); return; }
  let vol = 0; const view = [], files = [];
  for (const p of r.parts) { vol += p.m.volume(); const g = toGeom(p.m); view.push({ g, role: p.role }); files.push({ role: p.role, g: p.dl ? toGeom(p.dl) : g }); }
  freeAll();
  const bb = new THREE.Box3(); for (const it of view) { it.g.computeBoundingBox(); bb.union(it.g.boundingBox); }
  model = { files, bbox: bb, r };
  group = new THREE.Group();
  for (const it of view) { it.g.computeVertexNormals(); const mesh = new THREE.Mesh(it.g, new THREE.MeshStandardMaterial({ roughness: 0.4, metalness: 0.1, flatShading: true })); mesh.userData = { role: it.role }; group.add(mesh); }
  if (renderer) scene.add(group);
  recolor();
  const sx = bb.max.x - bb.min.x, sy = bb.max.y - bb.min.y, sz = bb.max.z - bb.min.z;
  if (sx > D.bedX || sy > D.bedY) { const diag = Math.hypot(D.bedX, D.bedY) * 0.95; msgs.push({ lvl: 'warn', msg: `Zápich (${fmt(sx, 0)} × ${fmt(sy, 0)} mm) se nevejde na tiskovou plochu rovně.${Math.hypot(sx, sy) < diag ? ' Natočte ho ve sliceru úhlopříčně.' : ' Zkraťte zápich nebo zmenšete šířku.'}` }); }
  showMsgs(msgs);
  $('btnSave').disabled = false; $('btnSave').textContent = files.length > 1 ? `Stáhnout STL (${files.length} soubory)` : 'Stáhnout STL';
  $('dims').innerHTML = `<b>${fmt(sx)}</b> × <b>${fmt(sy)}</b> × <b>${fmt(sz)}</b> mm`;
  const grams = vol / 1000 * 1.24, hrs = grams / 9 + 0.1;
  const bx = $('stats'); bx.textContent = '';
  for (const [a, v] of [['Zápich', r.label || '—'], ['Rozměry', `${fmt(sx, 0)} × ${fmt(sy, 0)} × ${fmt(sz, 1)} mm`], ['Materiál', `${fmt(Math.max(0.5, grams), grams < 10 ? 1 : 0)} g`], ['Tisk zhruba', hrs < 1 ? `${fmt(hrs * 60, 0)} min` : `${fmt(hrs, 1)} h`]]) {
    const d = document.createElement('div'); d.className = 'stat'; const s1 = document.createElement('span'); s1.textContent = a; const s2 = document.createElement('b'); s2.textContent = v; d.append(s1, s2); bx.append(d);
  }
  if (fitNext || !userMoved) { fit(fitNext ? 'top' : lastView); fitNext = false; } else draw();
}
function updateSwaps() {
  const bx = $('swaps'); bx.textContent = ''; if (!model) return;
  const sw = (c) => `<i style="background:${c}"></i>`;
  const d = document.createElement('div');
  d.innerHTML = model.files.length > 1 ? `${sw(D.c1)}destička &nbsp; ${sw(D.c2)}znaky (tisknou se zvlášť, v souboru leží vedle destičky)` : `${sw(D.c1)}jeden kus, jedna barva`;
  bx.append(d);
}

/* ===== Stažení ===== */
const inViewer = !!(window.claude && typeof window.claude.use === 'function');
let dlCap = null;
if (inViewer) window.claude.use('downloads').then(d => { dlCap = d; updateNote(); }).catch(() => updateNote());
function updateNote() { $('saveNote').textContent = inViewer ? (dlCap ? 'Tady se soubory stáhnou zabalené v ZIP.' : 'Stahování je v tomto zobrazení nedostupné.') : 'Zápich leží naplocho, jak se tiskne. Jednotky jsou milimetry.'; }
$('btnSave').onclick = async () => {
  if (!model) return;
  const enc = (geoms) => { const u = stlBinary(geoms), head = 'Created by Julius Andy Antos | Zapich do dortu | mm'; for (let i = 0; i < 80; i++) u[i] = i < head.length ? head.charCodeAt(i) : 32; return u; };
  const base = ('zapich_' + (model.r.label || 'dort')).normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^A-Za-z0-9_-]+/g, '_').replace(/_+$/, '').slice(0, 40);
  const files = model.files.map(f => ({ name: model.files.length > 1 ? `${base}_${f.role === 'ins' ? 'znaky' : 'desticka'}.stl` : `${base}.stl`, data: enc([f.g]) }));
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
  const KEY = 'zapichy-sbaleno';
  let closed; try { closed = JSON.parse(localStorage.getItem(KEY) || 'null'); } catch (e) { closed = null; }
  if (!Array.isArray(closed)) closed = ['Tiskárna', 'Rady'];
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

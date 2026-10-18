/* ===== Závity a šrouby — aplikace. Created by Julius Andy Antoš ===== */
const $ = (id) => document.getElementById(id);
const DEF = {
  type: 'bolt',
  thr: { kind: 'M', size: '8', d: 8, pitch: 'std', P: 1.25, starts: 1, left: false, clr: 0.3, q: '2' },
  bolt: { head: 'hex', drive: 'hex', L: 25, tl: 0 },
  nut: { kind: 'hex' },
  rod: { L: 60 },
  model: { mode: 'hole', depth: 12, through: false, studL: 12 },
  ov: {},
  bedX: 220, bedY: 220, bedZ: 250,
};
const STORE = 'zavity-v1';
const deepMerge = (a, b) => { for (const k in b) { if (b[k] && typeof b[k] === 'object' && !Array.isArray(b[k]) && a[k] && typeof a[k] === 'object') deepMerge(a[k], b[k]); else if (k in a && (typeof a[k] === typeof b[k] || k === 'ov')) a[k] = b[k]; } return a; };
const D = JSON.parse(JSON.stringify(DEF));
try { deepMerge(D, JSON.parse(localStorage.getItem(STORE) || '{}')); } catch (e) {}
if (!D.ov || typeof D.ov !== 'object') D.ov = {};
const saveState = () => { try { localStorage.setItem(STORE, JSON.stringify(D)); } catch (e) {} };
const getK = (p) => p.split('.').reduce((o, k) => o[k], D);
const setK = (p, v) => { const ks = p.split('.'); let o = D; for (let i = 0; i < ks.length - 1; i++) o = o[ks[i]]; o[ks[ks.length - 1]] = v; };
const fmt = (v, d = 1) => v.toLocaleString('cs-CZ', { maximumFractionDigits: d, minimumFractionDigits: d });
const fmtP = (v) => v.toLocaleString('cs-CZ', { maximumFractionDigits: 2 });
const css = (v) => getComputedStyle(document.documentElement).getPropertyValue(v).trim();
const clamp = (v, a, b) => Math.min(b, Math.max(a, +v || 0));
const COL = '#0b7a72';

/* ===== Normy ===== */
// d: [hrubé stoupání, jemná], šestihran s/k, výška matice m, imbus dk/klíč, čočková dk/k, zápustná dk, podložka d2/h, torx A
const MT = {
  2: [0.4, [0.25], 4, 1.4, 1.6, 3.8, 1.5, 4, 1.3, 3.8, 5, 0.3, 1.4],
  2.5: [0.45, [0.35], 5, 1.7, 2, 4.5, 2, 5, 1.5, 4.7, 6, 0.5, 1.8],
  3: [0.5, [0.35], 5.5, 2, 2.4, 5.5, 2.5, 5.6, 1.8, 6.7, 7, 0.5, 3.9],
  4: [0.7, [0.5], 7, 2.8, 3.2, 7, 3, 8, 2.4, 9, 9, 0.8, 4.4],
  5: [0.8, [0.5], 8, 3.5, 4.7, 8.5, 4, 9.5, 3, 11.2, 10, 1, 5.5],
  6: [1, [0.75], 10, 4, 5.2, 10, 5, 12, 3.6, 13.4, 12, 1.6, 5.5],
  8: [1.25, [1, 0.75], 13, 5.3, 6.8, 13, 6, 16, 4.8, 17.9, 16, 1.6, 7.8],
  10: [1.5, [1.25, 1], 16, 6.4, 8.4, 16, 8, 20, 6, 22.4, 20, 2, 9],
  12: [1.75, [1.5, 1.25], 18, 7.5, 10.8, 18, 10, 24, 7.2, 26.9, 24, 2.5, 11.4],
  14: [2, [1.5], 21, 8.8, 12.8, 21, 12, 28, 8.4, 30.8, 28, 2.5, 13.5],
  16: [2, [1.5], 24, 10, 14.8, 24, 14, 32, 9.6, 33.6, 30, 3, 15.7],
  20: [2.5, [2, 1.5], 30, 12.5, 18, 30, 17, 40, 12, 40.3, 37, 3, 20.2],
  24: [3, [2], 36, 15, 21.5, 36, 19, 48, 14.4, 48, 44, 4, 22],
  30: [3.5, [2], 46, 18.7, 25.6, 45, 22, 60, 18, 60, 56, 4, 26],
};
const TR = { 8: [1.5, 2], 10: [2, 3], 12: [3, 2], 14: [3, 4], 16: [4, 2], 18: [4], 20: [4, 2], 22: [5], 24: [5, 3], 28: [5], 30: [6, 3], 36: [6], 40: [7] };
function norm(d) { // rozměry dílů: z tabulky, jinak odhad podle průměru
  const t = MT[d];
  if (t) return { s: t[2], k: t[3], m: t[4], sdk: t[5], ss: t[6], pdk: t[7], pk: t[8], cdk: t[9], wd: t[10], wh: t[11], tx: t[12] };
  return { s: Math.round((1.5 * d + 1) * 2) / 2, k: +(0.62 * d).toFixed(1), m: +(0.85 * d).toFixed(1), sdk: +(1.5 * d).toFixed(1), ss: Math.max(1.5, Math.round(d * 0.75 * 2) / 2), pdk: 2 * d, pk: +(0.6 * d).toFixed(1), cdk: +(2.24 * d).toFixed(1), wd: Math.round(2 * d + 2), wh: +(0.15 * d + 0.2).toFixed(1), tx: +(0.95 * d).toFixed(1) };
}
function thread() { // průměr, stoupání, chody, levý
  const T = D.thr, custom = T.size === 'custom';
  const d = custom ? clamp(T.d, 2, 80) : +T.size;
  let P;
  if (T.pitch === 'custom') P = clamp(T.P, 0.25, 12);
  else if (T.pitch === 'std') P = T.kind === 'Tr' ? (TR[d] ? TR[d][0] : Math.max(1.5, Math.round(d / 4))) : (MT[d] ? MT[d][0] : Math.max(0.35, +(d * 0.15).toFixed(2)));
  else P = +T.pitch;
  const starts = T.kind === 'Tr' ? Math.round(clamp(T.starts, 1, 6)) : 1;
  return { kind: T.kind, d, P, starts, lead: P * starts, left: !!T.left, clr: clamp(T.clr, 0, 1.5) };
}
/* profil závitu: vnější (šroub) nebo vnitřní (díra = „závitník“, který se odečte) */
function profile(t, internal) {
  const c = t.clr / 4, d = t.d, P = t.P;
  if (t.kind === 'Tr') {
    const ac = P <= 1.5 ? 0.15 : P <= 5 ? 0.25 : 0.5, tanA = Math.tan(15 * Math.PI / 180);
    return internal ? { R: (d + 2 * ac) / 2 + c, r: (d - P) / 2 + c, Rp: (d - 0.5 * P) / 2 + c, tanA }
      : { R: d / 2 - c, r: (d - P - 2 * ac) / 2 - c, Rp: (d - 0.5 * P) / 2 - c, tanA };
  }
  const tanA = Math.tan(30 * Math.PI / 180);
  return internal ? { R: d / 2 + c + 0.06 * P, r: (d - 1.0825 * P) / 2 + c, Rp: (d - 0.649519 * P) / 2 + c, tanA }
    : { R: d / 2 - c, r: (d - 1.226869 * P) / 2 - c, Rp: (d - 0.649519 * P) / 2 - c, tanA };
}

/* ===== Manifold (geometrické operace) ===== */
let MF = null, GC = [];
const T = (m) => { GC.push(m); return m; };
function freeAll() { for (const m of GC) { try { m.delete(); } catch (e) {} } GC = []; }
async function initMF() {
  const s = atob(MANIFOLD_WASM_B64), u = new Uint8Array(s.length); for (let i = 0; i < s.length; i++) u[i] = s.charCodeAt(i);
  MF = await ManifoldModule({ wasmBinary: u }); MF.setup();
}
function meshToManifold(pos, idx) {
  const mesh = new MF.Mesh({ numProp: 3, vertProperties: pos instanceof Float32Array ? pos : new Float32Array(pos), triVerts: idx instanceof Uint32Array ? idx : new Uint32Array(idx) });
  mesh.merge();
  return T(new MF.Manifold(mesh));
}
function toGeom(m) { // Manifold -> THREE.BufferGeometry (trojúhelníky)
  const me = m.getMesh(), np = me.numProp, vp = me.vertProperties, tv = me.triVerts, n = tv.length, pos = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) { const v = tv[i] * np; pos[3 * i] = vp[v]; pos[3 * i + 1] = vp[v + 1]; pos[3 * i + 2] = vp[v + 2]; }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); return g;
}
/* závitový válec od z0 do z1 (osa Z). opt.end0/end1: 'chamfer' (sražení hrotu), 'flare' (zahloubení vstupu díry), nic */
function threadSolid(t, pr, z0, z1, opt = {}) {
  const q = +D.thr.q || 2, P = t.P, dir = t.left ? -1 : 1;
  const NT = Math.max(40, Math.min(q === 3 ? 320 : q === 2 ? 220 : 120, Math.round(2 * Math.PI * pr.R / (q === 3 ? 0.2 : q === 2 ? 0.3 : 0.5)))) & ~1;
  const dz = P / (q === 3 ? 16 : q === 2 ? 10 : 6), NZ = Math.max(2, Math.ceil((z1 - z0) / dz)), h = (z1 - z0) / NZ;
  const prof = (x) => Math.min(pr.R, Math.max(pr.r, pr.Rp + (P / 4 - x) / pr.tanA));
  const pos = new Float32Array((NZ + 1) * NT * 3 + 6), idx = [];
  for (let k = 0; k <= NZ; k++) {
    const z = z0 + k * h;
    for (let j = 0; j < NT; j++) {
      const th = j / NT * Math.PI * 2;
      let u = (z - dir * t.lead * th / (Math.PI * 2)) % P; if (u < 0) u += P; u -= P / 2;
      let rho = prof(Math.abs(u));
      if (opt.end0 === 'chamfer') rho = Math.min(rho, pr.r - 0.15 + (z - z0));
      if (opt.end1 === 'chamfer') rho = Math.min(rho, pr.r - 0.15 + (z1 - z));
      if (opt.end0 === 'flare') rho = Math.max(rho, pr.R + 0.4 - (z - (opt.face0 ?? z0)));
      if (opt.end1 === 'flare') rho = Math.max(rho, pr.R + 0.4 - ((opt.face1 ?? z1) - z));
      rho = Math.max(0.3, rho);
      const o = 3 * (k * NT + j); pos[o] = rho * Math.cos(th); pos[o + 1] = rho * Math.sin(th); pos[o + 2] = z;
    }
  }
  const c0 = (NZ + 1) * NT, c1 = c0 + 1;
  pos.set([0, 0, z0, 0, 0, z1], 3 * c0);
  for (let k = 0; k < NZ; k++) { const a = k * NT, b = a + NT; for (let j = 0; j < NT; j++) { const jn = (j + 1) % NT; idx.push(a + j, a + jn, b + jn, a + j, b + jn, b + j); } }
  for (let j = 0; j < NT; j++) { const jn = (j + 1) % NT; idx.push(c0, jn, j, c1, NZ * NT + j, NZ * NT + jn); }
  return meshToManifold(pos, idx);
}
const cyl = (h, r0, r1, z = 0, n) => T(T(MF.Manifold.cylinder(h, r0, r1 ?? r0, n || Math.max(48, Math.round(r0 * 8)))).translate([0, 0, z]));
const poly = (pts) => T(new MF.CrossSection([pts]));
const hexCS = (s) => T(T(MF.CrossSection.circle(s / Math.sqrt(3), 6)).rotate(30));
const ext = (cs, h, z = 0) => T(T(cs.extrude(h)).translate([0, 0, z]));
const U = (list) => T(MF.Manifold.union(list));
const sub = (a, b) => T(a.subtract(b));
const inter = (a, b) => T(a.intersect(b));
const revolve = (pts, n = 96) => T(poly(pts).revolve(n));
function ov(key, def) { const v = +D.ov[key]; return v > 0 ? v : def; }

/* ===== Drážky do hlavy (vyříznou se od z = 0 do hloubky) ===== */
function drive(kind, size, depth) {
  if (kind === 'hex') return ext(hexCS(size), depth + 1, -1);
  if (kind === 'torx') {
    const R = size / 2, Ri = R * 0.72, pts = [];
    for (let i = 0; i < 96; i++) { const a = i / 96 * Math.PI * 2, c = 0.5 + 0.5 * Math.cos(6 * a); const r = Ri + (R - Ri) * Math.pow(c, 0.7); pts.push([r * Math.cos(a), r * Math.sin(a)]); }
    return ext(poly(pts), depth + 1, -1);
  }
  if (kind === 'cross') {
    const w = Math.max(0.8, size * 0.13), L = size * 0.5;
    const cs = T(MF.CrossSection.union([T(MF.CrossSection.square([L, w], true)), T(MF.CrossSection.square([w, L], true))]));
    return T(T(cs.extrude(depth + 1, 0, 0, [0.45, 0.45])).translate([0, 0, -1]));
  }
  if (kind === 'slot') { const w = Math.max(0.8, size * 0.16); return ext(T(MF.CrossSection.square([size + 4, w], true)), depth + 1, -1); }
  return null;
}
function knurlCS(dk) {
  const N = Math.max(12, Math.round(dk * 1.1)), R = dk / 2, dep = Math.min(1.2, dk * 0.05), pts = [];
  for (let i = 0; i < N * 8; i++) { const a = i / (N * 8) * Math.PI * 2, f = 0.5 - 0.5 * Math.cos(N * a); pts.push([(R - dep * Math.pow(f, 2)) * Math.cos(a), (R - dep * Math.pow(f, 2)) * Math.sin(a)]); }
  return poly(pts);
}
function wings(hubR, span, hubH, thick, wideAtBottom) { // dvě křidélka v rovině XZ, vrací { m, H }
  // spodní hrana stoupá od náboje strmě ven (tiskne se bez podpěr), nejvyšší je zaoblená špička, horní hrana klesá k náboji
  const R = span / 2, x0 = hubR * 0.6, rr = Math.max(1.2, (R - hubR) * 0.22);
  const cx = R - rr, cy = Math.max(1, (cx - hubR - 0.5) * 1.4);   // spodní hrana asi 55° od vodorovné
  const pts = [[x0, 0], [hubR + 0.5, 0]];
  for (let i = 0; i <= 16; i++) { const a = -0.6 + i / 16 * (Math.PI * 0.85 + 0.6); pts.push([cx + rr * Math.cos(a), cy + rr * Math.sin(a)]); }
  const H = cy + rr;
  const zi = hubH > H * 0.55 ? hubH - 0.31 : H * 0.55;  // vnitřní horní hrana, ne v rovině s nábojem
  pts.push([hubR + thick * 0.4, zi], [x0, zi]);
  let w = ext(poly(pts), thick, -thick / 2);
  w = T(w.rotate([90, 0, 0]));
  if (wideAtBottom) w = T(T(w.mirror([0, 0, 1])).translate([0, 0, H]));
  return { m: U([w, T(w.rotate([0, 0, 180]))]), H };
}

/* ===== Díly ===== */
function buildBolt(msgs, t) {
  const B = D.bolt, n = norm(t.d), L = clamp(B.L, 3, 300), ext_ = profile(t, false);
  let head, k, dk, hk = B.head, total;
  const drv = (dkk, kk, size) => { const dd = B.drive === 'hex' ? size : B.drive === 'torx' ? ov('tx', n.tx) : dkk; return drive(B.drive, dd, Math.max(0.6, kk * (B.drive === 'slot' ? 0.45 : 0.6))); };
  if (hk === 'hex') {
    const s = ov('s', n.s); k = ov('k', n.k); dk = s / Math.cos(Math.PI / 6);
    head = inter(ext(hexCS(s), k), cyl(k, s / 2 * 0.95, s / 2 * 0.95 + k * 1.732, 0, 96));
  } else if (hk === 'socket') {
    dk = ov('dk', n.sdk); k = ov('k', t.d);
    head = inter(cyl(k, dk / 2), cyl(k, dk / 2 - 0.4, dk / 2 - 0.4 + k * 2, 0));
    const dr = drv(dk, k, ov('ss', n.ss)); if (dr) head = sub(head, dr);
  } else if (hk === 'pan') {
    dk = ov('dk', n.pdk); k = ov('k', n.pk);
    const pts = [[0, 0]]; for (let i = 0; i <= 12; i++) { const a = i / 12 * Math.PI / 2; pts.push([dk * 0.3 + (dk * 0.2) * Math.sin(a), k * 0.55 * (1 - Math.cos(a))]); }
    pts.push([dk / 2, k], [0, k]);
    head = revolve(pts);
    const dr = drv(dk, k, ov('ss', n.ss)); if (dr) head = sub(head, dr);
  } else if (hk === 'csk') {
    dk = ov('dk', n.cdk); k = (dk - t.d) / 2 + 0.3;
    head = revolve([[0, 0], [dk / 2, 0], [dk / 2, 0.3], [t.d / 2 - 0.05, k], [0, k]]);
    const dr = drv(dk, k, ov('ss', n.ss)); if (dr) head = sub(head, dr);
  } else if (hk === 'knurl') {
    dk = ov('dk', Math.round(2.6 * t.d + 4)); k = ov('k', Math.round(t.d * 0.9 + 2.5));
    head = inter(ext(knurlCS(dk), k), cyl(k, dk / 2 - 0.6, dk / 2 - 0.6 + k * 2, 0, 128));
  } else { // motýlková
    const hubR = t.d * 0.95 + 1, span = ov('span', Math.round(4.2 * t.d + 9));
    const wg = wings(hubR, span, 0, Math.max(2, 0.4 * t.d + 1.2), true);
    k = Math.max(ov('k', 0), wg.H, t.d * 1.2); dk = span;
    head = U([cyl(k, hubR, hubR + 0.4), wg.m]);
  }
  // dřík: hlava leží na podložce (z = 0..k), dřík jde nahoru
  const shaftL = hk === 'csk' ? L - k : L; total = k + shaftL;
  if (shaftL < 1) { msgs.push({ lvl: 'bad', msg: 'Délka šroubu je kratší než hlava.' }); return null; }
  const tl = B.tl > 0 ? Math.min(clamp(B.tl, 1, 300), shaftL) : shaftL;
  const parts = [head];
  if (tl < shaftL) parts.push(cyl(shaftL - tl + 0.53, ext_.R, ext_.R, k - 0.53, Math.max(48, Math.round(ext_.R * 10))));
  parts.push(threadSolid(t, ext_, total - tl - 0.537, total, { end1: 'chamfer' }));
  const m = U(parts);
  return { m, info: `${t.kind === 'Tr' ? 'Tr' : 'M'}${fmtP(t.d)}×${fmtP(shaftL)}`, name: `sroub_${t.kind === 'Tr' ? 'Tr' : 'M'}${t.d}x${Math.round(shaftL)}` };
}
function buildNut(msgs, t) {
  const n = norm(t.d), kind = D.nut.kind, int = profile(t, true);
  let body, h, blind = 0;
  if (kind === 'hex' || kind === 'thin' || kind === 'square') {
    const s = ov('s', n.s); h = ov('m', kind === 'thin' ? Math.max(t.P * 3, +(0.5 * t.d).toFixed(1)) : t.kind === 'Tr' ? 1.5 * t.d : n.m);
    const cs = kind === 'square' ? T(MF.CrossSection.square([s, s], true)) : hexCS(s);
    const rr = kind === 'square' ? s * 0.68 : s / 2 * 0.95;
    body = inter(inter(ext(cs, h), cyl(h, rr, rr + h * 1.732, 0, 96)), cyl(h, rr + h * 1.732, rr, 0, 96));
  } else if (kind === 'cap') {
    const s = ov('s', n.s); const hh = ov('m', n.m); h = hh + s * 0.42;
    body = U([inter(ext(hexCS(s), hh), cyl(hh, s / 2 * 0.95, s / 2 * 0.95 + hh * 1.732, 0, 96)), T(T(MF.Manifold.sphere(s * 0.45, 96)).translate([0, 0, hh - s * 0.03])), cyl(0.5, s * 0.45, s * 0.45, hh - 0.5)]);
    body = inter(body, cyl(h, s, s, 0)); blind = hh + Math.min(s * 0.25, t.d * 0.4);
  } else if (kind === 'knurl') {
    const dk = ov('dk', Math.round(2.6 * t.d + 4)); h = ov('m', Math.round(t.d * 1.1 + 2));
    body = inter(inter(ext(knurlCS(dk), h), cyl(h, dk / 2 - 0.6, dk / 2 - 0.6 + h * 2, 0, 128)), cyl(h, dk / 2 - 0.6 + h * 2, dk / 2 - 0.6, 0, 128));
  } else { // motýlková
    const hubR = t.d * 0.95 + 1.2, span = ov('span', Math.round(4.2 * t.d + 9)); h = ov('m', Math.round(2.2 * t.d + 4));
    const hubH = Math.max(t.d * 1.2, h * 0.6);
    body = U([cyl(hubH, hubR + 0.6, hubR), wings(hubR, span, hubH, Math.max(2, 0.4 * t.d + 1.2)).m]);
    h = hubH;                                            // závit jde celým nábojem
  }
  const tap = blind ? threadSolid(t, int, -1.037, blind + 0.013, { end0: 'flare', face0: 0 }) : threadSolid(t, int, -1.037, h + 1.029, { end0: 'flare', end1: 'flare', face0: 0, face1: h });
  const m = sub(body, tap);
  return { m, info: `matice ${t.kind === 'Tr' ? 'Tr' : 'M'}${fmtP(t.d)}`, name: `matice_${t.kind === 'Tr' ? 'Tr' : 'M'}${t.d}_${kind}` };
}
function buildWasher(msgs, t) {
  const n = norm(t.d), d2 = ov('wd', n.wd), h = ov('wh', Math.max(1, n.wh)), d1 = t.d + 0.4 + t.clr;
  if (d2 <= d1 + 1) { msgs.push({ lvl: 'bad', msg: 'Vnější průměr podložky musí být větší než otvor.' }); return null; }
  return { m: sub(cyl(h, d2 / 2), cyl(h + 2, d1 / 2, d1 / 2, -1)), info: `podložka ${fmtP(t.d)} mm`, name: `podlozka_${t.d}` };
}
function buildRod(msgs, t) {
  const L = clamp(D.rod.L, 5, 400);
  return { m: threadSolid(t, profile(t, false), 0, L, { end0: 'chamfer', end1: 'chamfer' }), info: `tyč ${t.kind === 'Tr' ? 'Tr' : 'M'}${fmtP(t.d)}×${fmtP(L)}`, name: `zavitova_tyc_${t.kind === 'Tr' ? 'Tr' : 'M'}${t.d}x${L}` };
}

/* ===== Závit do vlastního modelu ===== */
let user = null; // { pos, idx, name, steps: [Manifold mesh data], base geometry }
function placeUser(soup) { // položit na podložku a vystředit, sloučit body
  let x0 = Infinity, y0 = Infinity, z0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (let i = 0; i < soup.length; i += 3) { x0 = Math.min(x0, soup[i]); x1 = Math.max(x1, soup[i]); y0 = Math.min(y0, soup[i + 1]); y1 = Math.max(y1, soup[i + 1]); z0 = Math.min(z0, soup[i + 2]); }
  const cx = (x0 + x1) / 2, cy = (y0 + y1) / 2, map = new Map(), V = [], I = new Uint32Array(soup.length / 3);
  for (let i = 0; i < soup.length; i += 3) {
    const x = soup[i] - cx, y = soup[i + 1] - cy, z = soup[i + 2] - z0, key = Math.round(x * 1e4) + ',' + Math.round(y * 1e4) + ',' + Math.round(z * 1e4);
    let id = map.get(key); if (id === undefined) { id = V.length / 3; map.set(key, id); V.push(x, y, z); } I[i / 3] = id;
  }
  return { pos: new Float32Array(V), idx: I };
}
async function loadUser(file) {
  if (!file) return;
  busy(true, 'Načítám model…'); await new Promise(r => setTimeout(r, 30));
  try {
    const buf = await file.arrayBuffer(); let soup;
    if (/\.obj$/i.test(file.name)) soup = parseObj(new TextDecoder().decode(buf));
    else if (/\.3mf$/i.test(file.name)) soup = await parse3mf(buf);
    else soup = parseStl(buf);
    const p = placeUser(soup);
    const m = meshToManifold(p.pos, p.idx);
    if (m.status && m.status() !== 'NoError' && m.status() !== 0) throw new Error('nm');
    if (m.isEmpty()) throw new Error('nm');
    user = { name: file.name, steps: [mfToMesh(m)] };
    freeAll();
    $('fname').textContent = file.name; $('btnPick').disabled = false; $('btnUndo').hidden = true; updateUI();
    fitNext = true; schedule(true);
  } catch (e) {
    console.error(e); freeAll();
    showMsgs([{ lvl: 'bad', msg: e.message === 'nm' || /manifold|Manifold/i.test(String(e)) ? `Model „${file.name}“ není uzavřený, závit do něj nejde vložit. Opravte ho nejdřív v Kontrole STL a stáhněte opravený.` : `Soubor „${file.name}“ se nepodařilo přečíst.` }]);
  } finally { busy(false); }
}
function mfToMesh(m) { const me = m.getMesh(); return { vp: me.vertProperties.slice(), tv: me.triVerts.slice(), np: me.numProp }; }
function meshToMf(s) { const pos = new Float32Array(s.tv.length ? (s.vp.length / s.np) * 3 : 0); for (let i = 0, j = 0; i < s.vp.length; i += s.np, j += 3) { pos[j] = s.vp[i]; pos[j + 1] = s.vp[i + 1]; pos[j + 2] = s.vp[i + 2]; } return meshToManifold(pos, s.tv); }
function addThreadAt(point, normal) { // normal = vnější normála plochy
  const t = thread(); const cur = meshToMf(user.steps[user.steps.length - 1]);
  const n = normal.clone().normalize();
  let tool, result;
  if (D.model.mode === 'hole') {
    const pr = profile(t, true);
    let depth = clamp(D.model.depth, 1, 300);
    if (D.model.through) { const bb = cur.boundingBox(); depth = Math.hypot(bb.max[0] - bb.min[0], bb.max[1] - bb.min[1], bb.max[2] - bb.min[2]) + 2; }
    tool = threadSolid(t, pr, -1.537, depth + 0.013, { end0: 'flare', face0: 0 });
    const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 0, 1), n.clone().negate());
    const M = new THREE.Matrix4().compose(point, q, new THREE.Vector3(1, 1, 1));
    tool = T(tool.transform(Array.from(M.elements)));
    result = sub(cur, tool);
  } else {
    const pr = profile(t, false), L = clamp(D.model.studL, 2, 300);
    tool = threadSolid(t, pr, -1.537, L, { end1: 'chamfer' });
    const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 0, 1), n);
    const M = new THREE.Matrix4().compose(point, q, new THREE.Vector3(1, 1, 1));
    tool = T(tool.transform(Array.from(M.elements)));
    result = U([cur, tool]);
  }
  user.steps.push(mfToMesh(result)); freeAll();
  $('btnUndo').hidden = false;
}

/* ===== Načtení souborů (STL, OBJ, 3MF) ===== */
function parseObj(txt) {
  const v = [], out = [];
  for (const line of txt.split('\n')) { const p = line.trim().split(/\s+/);
    if (p[0] === 'v') v.push([+p[1], +p[2], +p[3]]);
    else if (p[0] === 'f') { const id = p.slice(1).map(s => { const i = parseInt(s, 10); return i < 0 ? v.length + i : i - 1; }); for (let k = 1; k < id.length - 1; k++) for (const i of [id[0], id[k], id[k + 1]]) out.push(...v[i]); } }
  if (!out.length) throw new Error('obj'); return new Float32Array(out);
}
async function parse3mf(buf) {
  const dv = new DataView(buf), u8 = new Uint8Array(buf), dec = new TextDecoder();
  let e = -1; for (let i = u8.length - 22; i >= Math.max(0, u8.length - 70000); i--) if (dv.getUint32(i, true) === 0x06054b50) { e = i; break; }
  if (e < 0) throw new Error('zip');
  const n = dv.getUint16(e + 10, true); let p = dv.getUint32(e + 16, true); const out = [];
  for (let k = 0; k < n && dv.getUint32(p, true) === 0x02014b50; k++) {
    const method = dv.getUint16(p + 10, true), cs = dv.getUint32(p + 20, true), nl = dv.getUint16(p + 28, true), xl = dv.getUint16(p + 30, true), cl = dv.getUint16(p + 32, true), off = dv.getUint32(p + 42, true);
    const name = dec.decode(u8.subarray(p + 46, p + 46 + nl)); p += 46 + nl + xl + cl;
    if (!/\.model$/i.test(name)) continue;
    const ds = off + 30 + dv.getUint16(off + 26, true) + dv.getUint16(off + 28, true); let raw = u8.subarray(ds, ds + cs);
    if (method === 8) raw = new Uint8Array(await new Response(new Blob([raw]).stream().pipeThrough(new DecompressionStream('deflate-raw'))).arrayBuffer());
    const doc = new DOMParser().parseFromString(dec.decode(raw), 'application/xml');
    doc.querySelectorAll('object').forEach(o => { const vs = [...o.querySelectorAll('mesh > vertices > vertex')].map(v => [+v.getAttribute('x'), +v.getAttribute('y'), +v.getAttribute('z')]);
      o.querySelectorAll('mesh > triangles > triangle').forEach(t => { for (const a of ['v1', 'v2', 'v3']) out.push(...vs[+t.getAttribute(a)]); }); });
  }
  if (!out.length) throw new Error('3mf'); return new Float32Array(out);
}

/* ===== Ovládání ===== */
const HEADS = [['hex', 'Šestihranná', '<path d="M8 8h18l5 7-5 7H8l-5-7z"/>'], ['socket', 'Válcová (imbus)', '<rect x="5" y="7" width="24" height="16" rx="2"/><path d="M14 11h6l3 4-3 4h-6l-3-4z"/>'], ['pan', 'Čočková', '<path d="M4 22h26c0-9-5-13-13-13S4 13 4 22z"/><path d="M13 16h8M17 12v8"/>'],
  ['csk', 'Zápustná', '<path d="M3 9h28l-9 13h-10z"/><path d="M13 13h8M17 9v7"/>'], ['wing', 'Motýlková', '<path d="M13 24V12h8v12M13 14C6 4 2 6 4 14s7 6 9 6M21 14c7-10 11-8 9 0s-7 6-9 6"/>'], ['knurl', 'Rýhovaná', '<path d="M5 9h24v13H5zM9 9v13M13 9v13M17 9v13M21 9v13M25 9v13"/>']];
const NUTS = [['hex', 'Šestihranná', '<path d="M8 6h18l6 9-6 9H8l-6-9z"/><circle cx="17" cy="15" r="5"/>'], ['thin', 'Nízká', '<path d="M8 10h18l6 5-6 5H8l-6-5z"/><circle cx="17" cy="15" r="3"/>'], ['square', 'Čtyřhranná', '<rect x="6" y="4" width="22" height="22"/><circle cx="17" cy="15" r="5"/>'],
  ['wing', 'Motýlková', '<path d="M13 26V14h8v12M13 16C6 6 2 8 4 16s7 6 9 6M21 16c7-10 11-8 9 0s-7 6-9 6"/>'], ['knurl', 'Rýhovaná', '<circle cx="17" cy="15" r="11"/><circle cx="17" cy="15" r="4"/><path d="M17 4v3M17 23v3M6 15h3M25 15h3M9 7l2 2M23 21l2 2M25 7l-2 2M9 23l2-2"/>'], ['cap', 'Kloboučková', '<path d="M7 24h20v-7H7zM8 17c0-7 4-11 9-11s9 4 9 11"/>']];
function picks(id, list, key) {
  const box = $(id); box.innerHTML = '';
  for (const [v, name, svg] of list) { const b = document.createElement('button'); b.type = 'button'; b.setAttribute('role', 'radio'); b.dataset.v = v; b.innerHTML = `<svg viewBox="0 0 34 30">${svg}</svg>${name}`; b.onclick = () => { setK(key, v); D.ov = {}; onChange(key); }; box.append(b); }
}
picks('heads', HEADS, 'bolt.head'); picks('nuts', NUTS, 'nut.kind');
function fillSelects() {
  const T_ = D.thr, sizes = T_.kind === 'Tr' ? Object.keys(TR).map(Number) : Object.keys(MT).map(Number).sort((a, b) => a - b);
  const ss = $('selSize'); ss.innerHTML = sizes.map(s => `<option value="${s}">${T_.kind === 'Tr' ? 'Tr' : 'M'}${fmtP(s)}</option>`).join('') + '<option value="custom">Vlastní průměr</option>';
  if (T_.size !== 'custom' && !sizes.includes(+T_.size)) T_.size = String(T_.kind === 'Tr' ? 10 : 8);
  ss.value = T_.size;
  const t = thread(), d = t.d, sp = $('selPitch');
  let opts = [];
  if (T_.kind === 'Tr') { const l = TR[d] || []; opts = [['std', `${l[0] ? fmtP(l[0]) : fmtP(t.P)} mm (běžné)`]].concat(l.slice(1).map(p => [String(p), `${fmtP(p)} mm`])); }
  else { const l = MT[d]; opts = [['std', `${fmtP(l ? l[0] : t.P)} mm (hrubé)`]].concat((l ? l[1] : []).map(p => [String(p), `${fmtP(p)} mm (jemné)`])); }
  opts.push(['custom', 'Vlastní stoupání']);
  sp.innerHTML = opts.map(([v, n]) => `<option value="${v}">${n}</option>`).join('');
  if (!opts.some(o => o[0] === T_.pitch)) T_.pitch = 'std';
  sp.value = T_.pitch;
}
const DIMS = {
  bolt: { hex: [['s', 'Klíč (šířka hlavy)'], ['k', 'Výška hlavy']], socket: [['dk', 'Průměr hlavy'], ['k', 'Výška hlavy'], ['ss', 'Velikost imbusu'], ['tx', 'Velikost torxu']], pan: [['dk', 'Průměr hlavy'], ['k', 'Výška hlavy'], ['ss', 'Velikost imbusu']],
    csk: [['dk', 'Průměr hlavy'], ['ss', 'Velikost imbusu']], wing: [['span', 'Rozpětí křidélek'], ['k', 'Výška hlavy']], knurl: [['dk', 'Průměr hlavy'], ['k', 'Výška hlavy']] },
  nut: { hex: [['s', 'Klíč'], ['m', 'Výška']], thin: [['s', 'Klíč'], ['m', 'Výška']], square: [['s', 'Šířka'], ['m', 'Výška']], wing: [['span', 'Rozpětí křidélek'], ['m', 'Výška']], knurl: [['dk', 'Průměr'], ['m', 'Výška']], cap: [['s', 'Klíč'], ['m', 'Výška šestihranu']] },
  washer: [['wd', 'Vnější průměr'], ['wh', 'Tloušťka']],
};
function dimFields() {
  const list = D.type === 'bolt' ? DIMS.bolt[D.bolt.head] : D.type === 'nut' ? DIMS.nut[D.nut.kind] : D.type === 'washer' ? DIMS.washer : null;
  const box = $('dimFields'); box.innerHTML = '';
  if (!list) return;
  for (const [k, lbl] of list) {
    if (k === 'tx' && D.bolt.drive !== 'torx') continue; if (k === 'ss' && D.bolt.drive !== 'hex') continue;
    const l = document.createElement('label'); l.className = 'f'; l.innerHTML = `<span>${lbl}</span><span class="num"><input type="number" min="0" max="200" step="0.1" placeholder="podle normy"><span>mm</span></span>`;
    const inp = l.querySelector('input'); inp.value = D.ov[k] > 0 ? D.ov[k] : ''; inp.addEventListener('input', () => { const v = parseFloat(inp.value); if (isFinite(v) && v > 0) D.ov[k] = v; else delete D.ov[k]; saveState(); schedule(); });
    box.append(l);
  }
}
function syncUI() {
  fillSelects();
  document.querySelectorAll('[data-k]').forEach(el => { const v = getK(el.dataset.k); if (el.type === 'checkbox') el.checked = !!v; else el.value = v; });
  document.querySelectorAll('input[type=radio][name*="."]').forEach(r => { r.checked = String(getK(r.name)) === r.value; });
  updateUI();
}
function updateUI() {
  const t = thread(), h = D.bolt.head;
  const show = { bolt: D.type === 'bolt', nut: D.type === 'nut', rod: D.type === 'rod', model: D.type === 'model', dims: /bolt|nut|washer/.test(D.type), customD: D.thr.size === 'custom', customP: D.thr.pitch === 'custom', tr: D.thr.kind === 'Tr', drive: /socket|pan|csk/.test(h), mHole: D.model.mode === 'hole', mStud: D.model.mode === 'stud' };
  document.querySelectorAll('[data-show]').forEach(el => { el.hidden = !show[el.dataset.show]; });
  document.querySelectorAll('#types [data-type]').forEach(b => b.setAttribute('aria-checked', String(b.dataset.type === D.type)));
  document.querySelectorAll('#heads [data-v]').forEach(b => b.setAttribute('aria-checked', String(b.dataset.v === h)));
  document.querySelectorAll('#nuts [data-v]').forEach(b => b.setAttribute('aria-checked', String(b.dataset.v === D.nut.kind)));
  $('lblL').textContent = h === 'csk' ? 'Délka včetně hlavy' : 'Délka (bez hlavy)';
  const pe = profile(t, false), pi = profile(t, true);
  $('spec').innerHTML = `${t.kind === 'Tr' ? 'Tr' : 'M'}${fmtP(t.d)}×${fmtP(t.lead)}${t.starts > 1 ? ` (P${fmtP(t.P)}, ${t.starts} chody)` : ''}${t.left ? ' LH' : ''} · šroub ⌀ <b>${fmt(pe.R * 2, 2)}</b>/<b>${fmt(pe.r * 2, 2)}</b> · díra ⌀ <b>${fmt(pi.r * 2, 2)}</b>/<b>${fmt(pi.R * 2, 2)}</b> mm`;
  $('empty').hidden = !(D.type === 'model' && !user);
  dimFields();
}
function onChange(path) { if (/^(type|thr\.(size|kind|d)|bolt\.(head|L)|nut\.kind|rod\.L)$/.test(path)) fitNext = true; if (/^thr\.(kind|size|d)$/.test(path)) { fillSelects(); } updateUI(); saveState(); schedule(); }
document.querySelectorAll('[data-k]').forEach(el => {
  const ev = (el.type === 'checkbox' || el.tagName === 'SELECT') ? 'change' : 'input';
  el.addEventListener(ev, () => {
    let v = el.type === 'checkbox' ? el.checked : el.value;
    if (el.type === 'number') { v = parseFloat(v); if (!isFinite(v)) return; }
    setK(el.dataset.k, v);
    if (el.dataset.k === 'thr.kind' || el.dataset.k === 'thr.size') D.thr.pitch = 'std';
    onChange(el.dataset.k);
  });
});
document.querySelectorAll('input[type=radio][name*="."]').forEach(r => r.addEventListener('change', () => { setK(r.name, r.value); if (r.name === 'thr.kind') { D.thr.pitch = 'std'; D.thr.size = r.value === 'Tr' ? '10' : '8'; } onChange(r.name); }));
document.querySelectorAll('#types [data-type]').forEach(b => b.addEventListener('click', () => { D.type = b.dataset.type; D.ov = {}; onChange('type'); }));
let tmr = 0;
function schedule(now) { clearTimeout(tmr); tmr = setTimeout(() => { if (!MF) return; busy(true, 'Počítám model…'); setTimeout(() => { try { rebuild(); } finally { busy(false); } }, 20); }, now ? 0 : 350); }
function busy(on, txt) { $('busy').hidden = !on; if (txt) $('busy').textContent = txt; }

/* ===== 3D scéna ===== */
const cv = $('cv');
let renderer = null, scene, camera, bedGroup, mesh = null, fitNext = true, model = null;
const orbit = { theta: -Math.PI / 2, phi: 1.2, r: 300, target: new THREE.Vector3() };
function initGL() {
  try { renderer = new THREE.WebGLRenderer({ canvas: cv, antialias: true }); } catch (e) { renderer = null; return; }
  renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
  scene = new THREE.Scene(); camera = new THREE.PerspectiveCamera(30, 1, 0.3, 6000); camera.up.set(0, 0, 1);
  scene.add(new THREE.HemisphereLight(0xffffff, 0x445055, 0.7));
  const d1 = new THREE.DirectionalLight(0xffffff, 0.6); d1.position.set(-150, -220, 260); scene.add(d1);
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
  orbit.target.set((b.min.x + b.max.x) / 2, (b.min.y + b.max.y) / 2, sz / 2);
  const span = Math.max(sx, sy, sz, 12);
  orbit.r = span / (2 * Math.tan(THREE.MathUtils.degToRad(30) / 2)) * Math.max(1.3, 1.7 / camera.aspect);
  if (view === 'front') { orbit.theta = -Math.PI / 2; orbit.phi = Math.PI / 2 - 0.06; }
  else if (view === 'top') { orbit.theta = -Math.PI / 2; orbit.phi = 0.001; }
  else { orbit.theta = -Math.PI / 2 - 0.6; orbit.phi = 1.1; }
  draw();
}
$('vFront').onclick = () => fit('front'); $('vTop').onclick = () => fit('top'); $('vPersp').onclick = () => fit('persp');
let pickMode = false;
$('btnPick').onclick = () => { pickMode = !pickMode; $('viewer').classList.toggle('pick', pickMode); $('btnPick').setAttribute('aria-pressed', String(pickMode)); $('help').textContent = pickMode ? 'Klikněte na plochu, kam má přijít závit' : 'Táhnutím otáčíte · kolečkem nebo dvěma prsty přibližujete'; };
$('btnUndo').onclick = () => { if (user && user.steps.length > 1) { user.steps.pop(); $('btnUndo').hidden = user.steps.length < 2; schedule(true); } };
const ptrs = new Map(); let pinch0 = 0, r0 = 0, downAt = null;
cv.addEventListener('contextmenu', e => e.preventDefault());
cv.addEventListener('pointerdown', e => { cv.setPointerCapture(e.pointerId); downAt = { x: e.clientX, y: e.clientY }; ptrs.set(e.pointerId, { x: e.clientX, y: e.clientY, b: e.button, shift: e.shiftKey }); if (ptrs.size === 2) { const [a, b] = [...ptrs.values()]; pinch0 = Math.hypot(a.x - b.x, a.y - b.y); r0 = orbit.r; } });
cv.addEventListener('pointermove', e => { const p = ptrs.get(e.pointerId); if (!p) return; const dx = e.clientX - p.x, dy = e.clientY - p.y; p.x = e.clientX; p.y = e.clientY;
  if (ptrs.size === 2) { const [a, b] = [...ptrs.values()]; const d = Math.hypot(a.x - b.x, a.y - b.y); if (pinch0) orbit.r = r0 * pinch0 / d; }
  else if (p.b === 2 || p.shift) { const k = orbit.r * 0.0016, right = new THREE.Vector3(), up = new THREE.Vector3(); camera.matrixWorld.extractBasis(right, up, new THREE.Vector3()); orbit.target.addScaledVector(right, -dx * k).addScaledVector(up, dy * k); }
  else { orbit.theta -= dx * 0.008; orbit.phi = Math.min(Math.PI - 0.05, Math.max(0.001, orbit.phi - dy * 0.008)); } draw(); });
const pup = e => {
  const single = ptrs.size === 1; ptrs.delete(e.pointerId); if (ptrs.size < 2) pinch0 = 0;
  if (pickMode && single && downAt && Math.hypot(e.clientX - downAt.x, e.clientY - downAt.y) < 6 && mesh && user) {
    const r = cv.getBoundingClientRect(), m = new THREE.Vector2((e.clientX - r.left) / r.width * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
    const rc = new THREE.Raycaster(); rc.setFromCamera(m, camera); const hit = rc.intersectObject(mesh)[0];
    if (hit && hit.face) {
      const n = hit.face.normal.clone(); if (n.dot(rc.ray.direction) > 0) n.negate();
      $('btnPick').click(); busy(true, 'Vkládám závit…');
      setTimeout(() => { try { addThreadAt(hit.point.clone(), n); rebuild(); } catch (err) { console.error(err); freeAll(); showMsgs([{ lvl: 'bad', msg: 'Závit se nepodařilo vložit. Zkuste jiné místo nebo menší závit.' }]); } finally { busy(false); } }, 30);
    }
  }
};
cv.addEventListener('pointerup', pup); cv.addEventListener('pointercancel', pup);
cv.addEventListener('wheel', e => { e.preventDefault(); orbit.r = Math.min(5000, Math.max(3, orbit.r * Math.exp(e.deltaY * 0.0012))); draw(); }, { passive: false });
function showMsgs(list) { const box = $('msgs'); box.textContent = ''; for (const m of list) { const d = document.createElement('div'); d.className = 'msg ' + m.lvl; d.textContent = m.msg; box.append(d); } }

/* ===== Výpočet ===== */
function rebuild() {
  const msgs = [], t = thread(); let r = null;
  try {
    if (D.type === 'model') {
      if (user) { const m = meshToMf(user.steps[user.steps.length - 1]); r = { m, info: user.name + (user.steps.length > 1 ? ` + ${user.steps.length - 1}× závit` : ''), name: user.name.replace(/\.(stl|obj|3mf)$/i, '') + '_se_zavitem' }; }
    } else r = ({ bolt: buildBolt, nut: buildNut, washer: buildWasher, rod: buildRod })[D.type](msgs, t);
    if (r && t.P < 0.6 && D.type !== 'washer') msgs.push({ lvl: 'warn', msg: `Stoupání ${fmtP(t.P)} mm je na tisk velmi jemné. Závit nemusí jít zašroubovat, zkuste vrstvu 0,1 mm nebo větší závit.` });
    if (r && t.d < 5 && D.type !== 'washer' && D.type !== 'model') msgs.push({ lvl: 'info', msg: 'Závity menší než M5 jsou na hraně možností běžné tiskárny.' });
  } catch (e) { console.error(e); msgs.push({ lvl: 'bad', msg: 'Model se nepodařilo spočítat. Zkuste jiné rozměry.' }); r = null; }
  if (mesh) { scene && scene.remove(mesh); mesh.geometry.dispose(); mesh.material.dispose(); mesh = null; }
  if (model && model.g) model.g.dispose();
  if (!r || !r.m) { model = null; freeAll(); $('btnSave').disabled = true; showMsgs(msgs); $('stats').textContent = ''; $('dims').textContent = '–'; draw(); return; }
  const g = toGeom(r.m); const vol = r.m.volume(); freeAll();
  g.computeBoundingBox(); const b = g.boundingBox; if (D.type !== 'model') { g.translate(-(b.min.x + b.max.x) / 2, -(b.min.y + b.max.y) / 2, -b.min.z); g.computeBoundingBox(); }
  model = { g, bbox: g.boundingBox.clone(), name: r.name }; $('btnSave').disabled = false;
  const sx = model.bbox.max.x - model.bbox.min.x, sy = model.bbox.max.y - model.bbox.min.y, sz = model.bbox.max.z - model.bbox.min.z;
  if (sx > D.bedX || sy > D.bedY || sz > D.bedZ) msgs.push({ lvl: 'warn', msg: `Díl (${fmt(sx, 0)} × ${fmt(sy, 0)} × ${fmt(sz, 0)} mm) se nevejde na tiskovou plochu.` });
  showMsgs(msgs);
  if (renderer) { g.computeVertexNormals(); mesh = new THREE.Mesh(g, new THREE.MeshStandardMaterial({ color: new THREE.Color(COL), roughness: 0.5, metalness: 0.05, flatShading: true })); scene.add(mesh); }
  $('dims').innerHTML = `<b>${fmt(sx)}</b> × <b>${fmt(sy)}</b> × <b>${fmt(sz)}</b> mm`;
  const st = meshStats(g.attributes.position.array), grams = filamentEstimate({ volume: vol, area: st.area }, { wall: 1.2, infill: 30, density: 1.24, diameter: 1.75, pricePerKg: 500 }).grams, hrs = grams / 9 + 0.12;
  const box = $('stats'); box.textContent = '';
  for (const [a, v] of [['Díl', r.info], ['Rozměry', `${fmt(sx, 1)} × ${fmt(sy, 1)} × ${fmt(sz, 1)} mm`], ['Materiál', `${fmt(Math.max(0.5, grams), grams < 10 ? 1 : 0)} g`], ['Tisk zhruba', hrs < 1 ? `${fmt(hrs * 60, 0)} min` : `${fmt(hrs, 1)} h`]]) {
    const d = document.createElement('div'); d.className = 'stat'; const s1 = document.createElement('span'); s1.textContent = a; const s2 = document.createElement('b'); s2.textContent = v; d.append(s1, s2); box.append(d);
  }
  if (fitNext) { fit('persp'); fitNext = false; } else draw();
}

/* ===== Stažení ===== */
const inViewer = !!(window.claude && typeof window.claude.use === 'function');
let dlCap = null;
if (inViewer) window.claude.use('downloads').then(d => { dlCap = d; updateNote(); }).catch(() => updateNote());
function updateNote() { $('saveNote').textContent = inViewer ? (dlCap ? 'Tady se STL stáhne zabalené v ZIP souboru.' : 'Stahování je v tomto zobrazení nedostupné.') : 'Díl je natočený tak, jak se má tisknout. Jednotky jsou milimetry.'; }
$('btnSave').onclick = async () => {
  if (!model) return;
  const u = stlBinary([model.g]), head = 'Created by Julius Andy Antos | Zavity a srouby | mm'; for (let i = 0; i < 80; i++) u[i] = i < head.length ? head.charCodeAt(i) : 32;
  const name = model.name.replace(/[^A-Za-z0-9_.-]+/g, '_') + '.stl';
  if (inViewer) { if (!dlCap) return; try { await dlCap.save({ filename: name.replace(/\.stl$/, '.zip'), data: makeZip([{ name, data: u }]) }); $('saveNote').textContent = 'ZIP je uložený.'; } catch (err) { if (err && err.code !== 'declined') $('saveNote').textContent = 'Soubor se nepodařilo uložit.'; } return; }
  const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([u], { type: 'model/stl' })); a.download = name; document.body.append(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 2000);
};
const drop = $('drop'), fileIn = $('file');
drop.onclick = () => fileIn.click(); $('btnOpen2').onclick = () => fileIn.click();
drop.onkeydown = (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); fileIn.click(); } };
fileIn.onchange = () => { loadUser(fileIn.files[0]); fileIn.value = ''; };
['dragenter', 'dragover'].forEach(t => drop.addEventListener(t, (e) => { e.preventDefault(); drop.classList.add('over'); }));
['dragleave', 'drop'].forEach(t => drop.addEventListener(t, (e) => { e.preventDefault(); drop.classList.remove('over'); }));
window.addEventListener('dragover', (e) => e.preventDefault());
window.addEventListener('drop', (e) => { e.preventDefault(); const f = e.dataTransfer && e.dataTransfer.files[0]; if (f) { D.type = 'model'; onChange('type'); loadUser(f); } });

/* ===== Instalace jako aplikace a sbalitelné sekce ===== */
let installEvt = null;
window.addEventListener('beforeinstallprompt', (e) => { e.preventDefault(); installEvt = e; $('btnInstall').hidden = false; });
window.addEventListener('appinstalled', () => { installEvt = null; $('btnInstall').hidden = true; });
$('btnInstall').onclick = async () => { if (!installEvt) return; installEvt.prompt(); try { await installEvt.userChoice; } catch (e) {} installEvt = null; $('btnInstall').hidden = true; };
if (!inViewer && 'serviceWorker' in navigator && (location.protocol === 'https:' || location.hostname === 'localhost')) navigator.serviceWorker.register('sw.js').catch(() => {});
(function () {
  const KEY = 'zavity-sbaleno';
  let closed; try { closed = JSON.parse(localStorage.getItem(KEY) || 'null'); } catch (e) { closed = null; }
  if (!Array.isArray(closed)) closed = ['Tiskárna', 'Rady', 'Rozměry dílu'];
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

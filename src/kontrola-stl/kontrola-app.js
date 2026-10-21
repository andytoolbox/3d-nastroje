/* ===== Kontrola STL — aplikace. Created by Julius Andy Antoš ===== */
const $ = (id) => document.getElementById(id);
const DEF = { fmt: 'stl', mat: '1.24', infill: 15, wall: 1.2, price: 500, ang: 45, bedX: 220, bedY: 220, bedZ: 250, showOver: true, showEdges: true };
const STORE = 'kontrola-stl-v1';
const D = Object.assign({}, DEF);
try { const s = JSON.parse(localStorage.getItem(STORE) || '{}'); for (const k in DEF) if (k in s && typeof s[k] === typeof DEF[k]) D[k] = s[k]; } catch (e) {}
const saveState = () => { try { localStorage.setItem(STORE, JSON.stringify(D)); } catch (e) {} };
const fmt = (v, d = 1) => v.toLocaleString('cs-CZ', { maximumFractionDigits: d, minimumFractionDigits: d });
const fmtN = (n) => n.toLocaleString('cs-CZ');
const css = (v) => getComputedStyle(document.documentElement).getPropertyValue(v).trim();
const clamp = (v, a, b) => Math.min(b, Math.max(a, +v || 0));
const plural = (n, a, b, c) => `${fmtN(n)} ${n === 1 ? a : n >= 2 && n <= 4 ? b : c}`;
const COL = { base: new THREE.Color('#0b7a72'), over: new THREE.Color('#d9534f'), err: new THREE.Color('#ffb000') };

/* ===== Načtení souborů ===== */
function parseObj(txt) {
  const v = [], out = [];
  for (const line of txt.split('\n')) {
    const p = line.trim().split(/\s+/);
    if (p[0] === 'v') v.push([+p[1], +p[2], +p[3]]);
    else if (p[0] === 'f') {
      const idx = p.slice(1).map(s => { const i = parseInt(s, 10); return i < 0 ? v.length + i : i - 1; });
      for (let k = 1; k < idx.length - 1; k++) for (const i of [idx[0], idx[k], idx[k + 1]]) { const q = v[i]; if (!q) throw new Error('obj'); out.push(q[0], q[1], q[2]); }
    }
  }
  if (!out.length) throw new Error('obj');
  return new Float32Array(out);
}
async function inflateRaw(u8) {
  if (typeof DecompressionStream === 'undefined') throw new Error('old');
  return new Uint8Array(await new Response(new Blob([u8]).stream().pipeThrough(new DecompressionStream('deflate-raw'))).arrayBuffer());
}
async function unzip(buf, want) {
  const dv = new DataView(buf), u8 = new Uint8Array(buf), dec = new TextDecoder();
  let e = -1; for (let i = u8.length - 22; i >= Math.max(0, u8.length - 70000); i--) if (dv.getUint32(i, true) === 0x06054b50) { e = i; break; }
  if (e < 0) throw new Error('zip');
  const n = dv.getUint16(e + 10, true); let p = dv.getUint32(e + 16, true); const out = {};
  for (let k = 0; k < n && dv.getUint32(p, true) === 0x02014b50; k++) {
    const method = dv.getUint16(p + 10, true), csize = dv.getUint32(p + 20, true), nl = dv.getUint16(p + 28, true), xl = dv.getUint16(p + 30, true), cl = dv.getUint16(p + 32, true), off = dv.getUint32(p + 42, true);
    const name = dec.decode(u8.subarray(p + 46, p + 46 + nl)); p += 46 + nl + xl + cl;
    if (!want(name)) continue;
    const ds = off + 30 + dv.getUint16(off + 26, true) + dv.getUint16(off + 28, true), raw = u8.subarray(ds, ds + csize);
    out[name] = method === 0 ? raw : method === 8 ? await inflateRaw(raw) : null;
  }
  return out;
}
async function parse3mf(buf) {
  const files = await unzip(buf, n => /\.model$/i.test(n));
  const objs = {}, items = [];
  const mat = (s) => { if (!s) return null; const a = s.trim().split(/\s+/).map(Number); return a.length === 12 ? a : null; };
  const apply = (m, x, y, z) => m ? [m[0] * x + m[3] * y + m[6] * z + m[9], m[1] * x + m[4] * y + m[7] * z + m[10], m[2] * x + m[5] * y + m[8] * z + m[11]] : [x, y, z];
  const mul = (a, b) => { if (!a) return b; if (!b) return a; // b potom a
    const r = []; for (let c = 0; c < 4; c++) { const v = c < 3 ? [b[c * 3], b[c * 3 + 1], b[c * 3 + 2]] : [b[9], b[10], b[11]];
      const t = c < 3 ? [a[0] * v[0] + a[3] * v[1] + a[6] * v[2], a[1] * v[0] + a[4] * v[1] + a[7] * v[2], a[2] * v[0] + a[5] * v[1] + a[8] * v[2]] : apply(a, v[0], v[1], v[2]); r.push(...t); } return r; };
  for (const name of Object.keys(files)) {
    if (!files[name]) continue;
    const doc = new DOMParser().parseFromString(new TextDecoder().decode(files[name]), 'application/xml');
    doc.querySelectorAll('object').forEach(o => {
      const vs = [...o.querySelectorAll('mesh > vertices > vertex')].map(v => [+v.getAttribute('x'), +v.getAttribute('y'), +v.getAttribute('z')]);
      const ts = [...o.querySelectorAll('mesh > triangles > triangle')].map(t => [+t.getAttribute('v1'), +t.getAttribute('v2'), +t.getAttribute('v3')]);
      const comps = [...o.querySelectorAll('components > component')].map(c => ({ id: c.getAttribute('objectid'), m: mat(c.getAttribute('transform')) }));
      objs[name + '#' + o.getAttribute('id')] = { vs, ts, comps, file: name };
      if (!objs['#' + o.getAttribute('id')]) objs['#' + o.getAttribute('id')] = objs[name + '#' + o.getAttribute('id')];
    });
    doc.querySelectorAll('build > item').forEach(it => items.push({ id: it.getAttribute('objectid'), m: mat(it.getAttribute('transform')), file: name }));
  }
  const out = [];
  const emit = (key, m, depth) => {
    const o = objs[key] || objs['#' + key.split('#').pop()]; if (!o || depth > 8) return;
    for (const t of o.ts) for (const i of t) { const v = o.vs[i]; if (v) out.push(...apply(m, v[0], v[1], v[2])); }
    for (const c of o.comps) emit(o.file + '#' + c.id, mul(m, c.m), depth + 1);
  };
  if (items.length) items.forEach(it => emit(it.file + '#' + it.id, it.m, 0));
  else Object.keys(objs).filter(k => !k.startsWith('#')).forEach(k => emit(k, null, 0));
  if (!out.length) throw new Error('3mf');
  return new Float32Array(out);
}

/* ===== Síť: sloučení bodů, analýza, oprava ===== */
function weld(soup) {
  const map = new Map(), V = [], T = new Uint32Array(soup.length / 3), q = 1e4;
  for (let i = 0; i < soup.length; i += 3) {
    const k = Math.round(soup[i] * q) + ',' + Math.round(soup[i + 1] * q) + ',' + Math.round(soup[i + 2] * q);
    let id = map.get(k); if (id === undefined) { id = V.length / 3; map.set(k, id); V.push(soup[i], soup[i + 1], soup[i + 2]); }
    T[i / 3] = id;
  }
  return { V: new Float64Array(V), T };
}
function triArea(V, a, b, c) {
  const ux = V[3 * b] - V[3 * a], uy = V[3 * b + 1] - V[3 * a + 1], uz = V[3 * b + 2] - V[3 * a + 2], vx = V[3 * c] - V[3 * a], vy = V[3 * c + 1] - V[3 * a + 1], vz = V[3 * c + 2] - V[3 * a + 2];
  return Math.hypot(uy * vz - uz * vy, uz * vx - ux * vz, ux * vy - uy * vx) / 2;
}
function edges(V, T) { // hrany: počet použití a sousedství trojúhelníků
  const nV = V.length / 3, nT = T.length / 3, E = new Map();
  for (let t = 0; t < nT; t++) for (let k = 0; k < 3; k++) {
    const a = T[3 * t + k], b = T[3 * t + (k + 1) % 3]; if (a === b) continue;
    const key = a < b ? a * nV + b : b * nV + a;
    let e = E.get(key); if (!e) { e = { a, b, tris: [], dirs: [] }; E.set(key, e); }
    e.tris.push(t); e.dirs.push(a < b);
  }
  return E;
}
function analyze(V, T) {
  const nT = T.length / 3, E = edges(V, T);
  let open = 0, nonMan = 0, flipped = 0, degen = 0, vol = 0, area = 0;
  const parent = new Int32Array(nT).map((_, i) => i);
  const find = (x) => { while (parent[x] !== x) { parent[x] = parent[parent[x]]; x = parent[x]; } return x; };
  const badTri = new Uint8Array(nT), openEdges = [];
  for (const e of E.values()) {
    const n = e.tris.length;
    if (n === 1) { open++; openEdges.push(e.a, e.b); }
    else if (n > 2) { nonMan++; openEdges.push(e.a, e.b); }
    else if (e.dirs[0] === e.dirs[1]) { flipped++; badTri[e.tris[0]] = badTri[e.tris[1]] = 1; }
    for (let i = 1; i < n; i++) { const a = find(e.tris[0]), b = find(e.tris[i]); if (a !== b) parent[a] = b; }
  }
  const seen = new Set();
  for (let t = 0; t < nT; t++) {
    const a = T[3 * t], b = T[3 * t + 1], c = T[3 * t + 2], ar = triArea(V, a, b, c);
    if (ar < 1e-10 || a === b || b === c || a === c) degen++;
    area += ar;
    vol += (V[3 * a] * (V[3 * b + 1] * V[3 * c + 2] - V[3 * b + 2] * V[3 * c + 1]) - V[3 * a + 1] * (V[3 * b] * V[3 * c + 2] - V[3 * b + 2] * V[3 * c]) + V[3 * a + 2] * (V[3 * b] * V[3 * c + 1] - V[3 * b + 1] * V[3 * c])) / 6;
    seen.add(find(t));
  }
  const tk = new Set(); let dup = 0;
  for (let t = 0; t < nT; t++) { const s = [T[3 * t], T[3 * t + 1], T[3 * t + 2]].sort((x, y) => x - y).join(','); if (tk.has(s)) dup++; else tk.add(s); }
  return { nT, open, nonMan, flipped, degen, dup, shells: seen.size, vol, area, badTri, openEdges };
}
function repair(V, T) {
  // 1) nulové a zdvojené trojúhelníky pryč
  const keep = [], tk = new Set();
  for (let t = 0; t < T.length / 3; t++) {
    const a = T[3 * t], b = T[3 * t + 1], c = T[3 * t + 2];
    if (a === b || b === c || a === c || triArea(V, a, b, c) < 1e-10) continue;
    const s = [a, b, c].sort((x, y) => x - y).join(','); if (tk.has(s)) continue; tk.add(s);
    keep.push(a, b, c);
  }
  let T2 = Uint32Array.from(keep), nT = T2.length / 3;
  // 2) jednotný směr stěn v každém tělese (průchod do šířky přes sdílené hrany)
  let E = edges(V, T2);
  const adj = Array.from({ length: nT }, () => []);
  for (const e of E.values()) if (e.tris.length === 2) { const [t1, t2] = e.tris, same = e.dirs[0] === e.dirs[1]; adj[t1].push([t2, same]); adj[t2].push([t1, same]); }
  const flip = new Int8Array(nT).fill(-1), comp = new Int32Array(nT).fill(-1); let nc = 0;
  for (let s = 0; s < nT; s++) {
    if (flip[s] >= 0) continue; flip[s] = 0; comp[s] = nc; const q = [s];
    while (q.length) { const t = q.pop(); for (const [u, same] of adj[t]) if (flip[u] < 0) { flip[u] = same ? 1 - flip[t] : flip[t]; comp[u] = nc; q.push(u); } }
    nc++;
  }
  for (let t = 0; t < nT; t++) if (flip[t]) { const x = T2[3 * t + 1]; T2[3 * t + 1] = T2[3 * t + 2]; T2[3 * t + 2] = x; }
  // 3) těleso naruby -> otočit celé
  const cv = new Float64Array(nc);
  for (let t = 0; t < nT; t++) { const a = T2[3 * t], b = T2[3 * t + 1], c = T2[3 * t + 2];
    cv[comp[t]] += (V[3 * a] * (V[3 * b + 1] * V[3 * c + 2] - V[3 * b + 2] * V[3 * c + 1]) - V[3 * a + 1] * (V[3 * b] * V[3 * c + 2] - V[3 * b + 2] * V[3 * c]) + V[3 * a + 2] * (V[3 * b] * V[3 * c + 1] - V[3 * b + 1] * V[3 * c])); }
  for (let t = 0; t < nT; t++) if (cv[comp[t]] < 0) { const x = T2[3 * t + 1]; T2[3 * t + 1] = T2[3 * t + 2]; T2[3 * t + 2] = x; }
  // 4) zacelení děr: okrajové hrany a->b (díra vpravo); další hranu najdeme obcházením trojúhelníků kolem bodu b
  E = edges(V, T2);
  const nV = V.length / 3, ek = (a, b) => (a < b ? a * nV + b : b * nV + a);
  const third = (t, a, b) => { for (let k = 0; k < 3; k++) { const v = T2[3 * t + k]; if (v !== a && v !== b) return v; } return -1; };
  const bnd = []; for (const e of E.values()) if (e.tris.length === 1) { const t = e.tris[0]; for (let k = 0; k < 3; k++) { const p = T2[3 * t + k], q2 = T2[3 * t + (k + 1) % 3]; if ((p === e.a && q2 === e.b) || (p === e.b && q2 === e.a)) bnd.push([p, q2, t]); } }
  const outB = new Map(); for (const [p0, q0, t0] of bnd) { if (!outB.has(p0)) outB.set(p0, []); outB.get(p0).push([q0, t0]); }
  const succ = (a, b, t) => { // a->b okraj (díra vpravo); z více okrajových hran z b vybereme první proti směru hodin od b->a
    const cands = outB.get(b) || []; if (cands.length <= 1) return cands.length ? cands[0][0] : -1;
    const P3 = (i) => [V[3 * i], V[3 * i + 1], V[3 * i + 2]], sub = (p, q) => [p[0] - q[0], p[1] - q[1], p[2] - q[2]];
    const cr = (p, q) => [p[1] * q[2] - p[2] * q[1], p[2] * q[0] - p[0] * q[2], p[0] * q[1] - p[1] * q[0]], dt = (p, q) => p[0] * q[0] + p[1] * q[1] + p[2] * q[2];
    const t0 = [T2[3 * t], T2[3 * t + 1], T2[3 * t + 2]].map(P3), n = cr(sub(t0[1], t0[0]), sub(t0[2], t0[0]));
    const pb = P3(b), u = sub(P3(a), pb);
    let best = -1, bestA = Infinity;
    for (const [c] of cands) { const v = sub(P3(c), pb); let ang = Math.atan2(dt(cr(u, v), n), dt(u, v)); if (ang <= 1e-9) ang += Math.PI * 2; if (ang < bestA) { bestA = ang; best = c; } }
    return best;
  };
  const Vx = Array.from(V), add = [], used = new Set();
  let filled = 0, skipped = 0;
  for (const [s0, f0, t0] of bnd) {
    if (used.has(s0 + '>' + f0)) continue;
    const loop = [s0]; let a = s0, b = f0, t = t0, ok = false; used.add(s0 + '>' + f0);
    for (let guard = 0; guard < 200000; guard++) {
      if (b === s0) { ok = true; break; }
      loop.push(b);
      const c = succ(a, b, t); if (c < 0) break;
      const k = b + '>' + c; if (used.has(k)) break; used.add(k);
      const tt = (outB.get(b) || []).find(([q0]) => q0 === c); if (!tt) break;
      a = b; b = c; t = tt[1];
    }
    if (!ok || loop.length < 3) { skipped++; continue; }
      // výplň: smyčka a->b má díru vpravo, nové trojúhelníky musí mít hrany b->a
      const L = loop.length;
      if (L === 3) { add.push(loop[2], loop[1], loop[0]); filled++; continue; }
      let nx = 0, ny = 0, nz = 0, cx = 0, cy = 0, cz = 0;
      for (let i = 0; i < L; i++) { const p = loop[i], q2 = loop[(i + 1) % L];
        nx += (Vx[3 * p + 1] - Vx[3 * q2 + 1]) * (Vx[3 * p + 2] + Vx[3 * q2 + 2]); ny += (Vx[3 * p + 2] - Vx[3 * q2 + 2]) * (Vx[3 * p] + Vx[3 * q2]); nz += (Vx[3 * p] - Vx[3 * q2]) * (Vx[3 * p + 1] + Vx[3 * q2 + 1]);
        cx += Vx[3 * p]; cy += Vx[3 * p + 1]; cz += Vx[3 * p + 2]; }
      const nl = Math.hypot(nx, ny, nz) || 1; nx /= nl; ny /= nl; nz /= nl;
      // rovinná díra: ušní ořezávání v promítnutí, jinak vějíř ze středu
      const ax = Math.abs(nx) < 0.9 ? [1, 0, 0] : [0, 1, 0];
      let ux = ny * ax[2] - nz * ax[1], uy = nz * ax[0] - nx * ax[2], uz = nx * ax[1] - ny * ax[0]; const ul = Math.hypot(ux, uy, uz); ux /= ul; uy /= ul; uz /= ul;
      const wx = ny * uz - nz * uy, wy = nz * ux - nx * uz, wz = nx * uy - ny * ux;
      const pts = loop.map(p => new THREE.Vector2(Vx[3 * p] * ux + Vx[3 * p + 1] * uy + Vx[3 * p + 2] * uz, Vx[3 * p] * wx + Vx[3 * p + 1] * wy + Vx[3 * p + 2] * wz));
      let tris = null;
      try { tris = THREE.ShapeUtils.triangulateShape(pts, []); if (tris.length !== L - 2) tris = null; } catch (e) { tris = null; }
      const want = [-nx, -ny, -nz];
      const push = (a, b, c) => { // orientace podle požadované normály
        const ux2 = Vx[3 * b] - Vx[3 * a], uy2 = Vx[3 * b + 1] - Vx[3 * a + 1], uz2 = Vx[3 * b + 2] - Vx[3 * a + 2], vx2 = Vx[3 * c] - Vx[3 * a], vy2 = Vx[3 * c + 1] - Vx[3 * a + 1], vz2 = Vx[3 * c + 2] - Vx[3 * a + 2];
        const d = (uy2 * vz2 - uz2 * vy2) * want[0] + (uz2 * vx2 - ux2 * vz2) * want[1] + (ux2 * vy2 - uy2 * vx2) * want[2];
        if (d >= 0) add.push(a, b, c); else add.push(a, c, b);
      };
      if (tris) for (const f of tris) push(loop[f[0]], loop[f[1]], loop[f[2]]);
      else { const c = Vx.length / 3; Vx.push(cx / L, cy / L, cz / L); for (let i = 0; i < L; i++) add.push(c, loop[(i + 1) % L], loop[i]); }
      filled++;
  }
  const T3 = new Uint32Array(T2.length + add.length); T3.set(T2); T3.set(add, T2.length);
  return { V: new Float64Array(Vx), T: T3, filled, skipped, removed: T.length / 3 - nT };
}

/* ===== Stav modelu ===== */
let base = null;        // { V, T, name } po sloučení bodů (a případně po opravě)
let rot = new THREE.Quaternion(), scale = 1, A = null, P = null;   // A = analýza, P = umístěné body
function placed() { // body po otočení a měřítku, položené na podložku a vystředěné
  const V = base.V, n = V.length / 3, out = new Float64Array(V.length), v = new THREE.Vector3();
  let x0 = Infinity, y0 = Infinity, z0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (let i = 0; i < n; i++) { v.set(V[3 * i], V[3 * i + 1], V[3 * i + 2]).applyQuaternion(rot).multiplyScalar(scale); out[3 * i] = v.x; out[3 * i + 1] = v.y; out[3 * i + 2] = v.z; if (v.x < x0) x0 = v.x; if (v.x > x1) x1 = v.x; if (v.y < y0) y0 = v.y; if (v.y > y1) y1 = v.y; if (v.z < z0) z0 = v.z; }
  const cx = (x0 + x1) / 2, cy = (y0 + y1) / 2; let z1 = -Infinity;
  for (let i = 0; i < n; i++) { out[3 * i] -= cx; out[3 * i + 1] -= cy; out[3 * i + 2] -= z0; if (out[3 * i + 2] > z1) z1 = out[3 * i + 2]; }
  return { V: out, size: [x1 - x0, y1 - y0, z1] };
}
function overhangs(V, T, ang) { // plocha a maska převisů (trojúhelníky na podložce se nepočítají)
  const nT = T.length / 3, mask = new Uint8Array(nT), lim = -Math.sin(ang * Math.PI / 180); let area = 0, bed = 0;
  for (let t = 0; t < nT; t++) {
    const a = T[3 * t], b = T[3 * t + 1], c = T[3 * t + 2];
    const ux = V[3 * b] - V[3 * a], uy = V[3 * b + 1] - V[3 * a + 1], uz = V[3 * b + 2] - V[3 * a + 2], vx = V[3 * c] - V[3 * a], vy = V[3 * c + 1] - V[3 * a + 1], vz = V[3 * c + 2] - V[3 * a + 2];
    const nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx, l = Math.hypot(nx, ny, nz); if (!l) continue;
    if (V[3 * a + 2] < 0.05 && V[3 * b + 2] < 0.05 && V[3 * c + 2] < 0.05) { bed += l / 2; continue; }
    if (nz / l < lim) { mask[t] = 1; area += l / 2; }
  }
  return { mask, area, bed };
}

/* ===== Načtení ===== */
let loadSeq = 0;
async function loadFile(file) {
  if (!file) return;
  const my = ++loadSeq; busy(true); await new Promise(r => setTimeout(r, 30));
  try {
    const buf = await file.arrayBuffer(); let soup;
    if (/\.obj$/i.test(file.name)) soup = parseObj(new TextDecoder().decode(buf));
    else if (/\.3mf$/i.test(file.name)) soup = await parse3mf(buf);
    else soup = parseStl(buf);
    if (my !== loadSeq) return;           // mezitím se otevřel jiný soubor
    setModel(soup, file.name);
  } catch (e) {
    console.error(e);
    showMsgs([{ lvl: 'bad', msg: e.message === 'old' ? 'Tento prohlížeč neumí otevřít 3MF. Použijte STL nebo novější prohlížeč.' : `Soubor „${file.name}“ se nepodařilo přečíst. Podporované jsou STL, OBJ a 3MF.` }]);
  } finally { if (my === loadSeq) busy(false); }
}
function setModel(soup, name) {
  if (soup.length < 9) throw new Error('empty');
  const w = weld(soup); base = { V: w.V, T: w.T, name, origV: w.V.slice(), origT: w.T.slice() };
  rot = new THREE.Quaternion(); scale = 1; fixed = null;
  A = analyze(base.V, base.T);
  $('fname').textContent = name + ' · ' + plural(A.nT, 'trojúhelník', 'trojúhelníky', 'trojúhelníků');
  $('scale').value = 100; $('orientHint').textContent = '';
  fitNext = true; refresh();
}
let fixed = null;
function refresh() {
  if (!base) return;
  const pl = placed(); P = pl;
  const oh = overhangs(P.V, base.T, clamp(D.ang, 20, 80));
  render(oh); checks(pl, oh); stats(pl, oh);
  document.querySelectorAll('[data-show="loaded"]').forEach(el => { el.hidden = false; });
  $('btnSave').disabled = false; $('empty').hidden = true; $('lgd').hidden = false;
}

/* ===== Výsledky kontroly ===== */
function checks(pl, oh) {
  const L = [], s = pl.size, mx = Math.max(...s);
  const closed = !A.open && !A.nonMan, oriented = !A.flipped && A.vol > 0;
  L.push(closed ? ['ok', 'Model je uzavřený', 'Nemá díry ani nejednoznačné hrany.'] : ['bad', 'Model má díry', [A.open ? plural(A.open, 'otevřená hrana', 'otevřené hrany', 'otevřených hran') : '', A.nonMan ? plural(A.nonMan, 'hrana sdílená víc stěnami', 'hrany sdílené víc stěnami', 'hran sdílených víc stěnami') : ''].filter(Boolean).join(', ') + '. Na modelu jsou vyznačené žlutě.']);
  L.push(oriented ? ['ok', 'Stěny míří správně ven', ''] : ['bad', A.vol <= 0 && !A.flipped ? 'Model je naruby' : 'Některé stěny jsou otočené', A.flipped ? plural(A.flipped, 'hrana', 'hrany', 'hran') + ' mezi opačně otočenými stěnami.' : 'Všechny stěny míří dovnitř.']);
  if (A.degen || A.dup) L.push(['warn', 'Nadbytečné trojúhelníky', [A.degen ? fmtN(A.degen) + ' s nulovou plochou' : '', A.dup ? fmtN(A.dup) + ' zdvojených' : ''].filter(Boolean).join(', ') + '.']);
  L.push(['info', A.shells === 1 ? 'Jedno těleso' : plural(A.shells, 'těleso', 'tělesa', 'těles'), A.shells > 1 ? 'Samostatné díly nevadí, překrývající se slicer spojí.' : '']);
  const fits = s[0] <= D.bedX && s[1] <= D.bedY && s[2] <= D.bedZ;
  L.push(fits ? ['ok', 'Vejde se na tiskovou plochu', `${fmt(s[0], 1)} × ${fmt(s[1], 1)} × ${fmt(s[2], 1)} mm`] : ['bad', 'Nevejde se na tiskovou plochu', `${fmt(s[0], 0)} × ${fmt(s[1], 0)} × ${fmt(s[2], 0)} mm, plocha ${D.bedX} × ${D.bedY} × ${D.bedZ} mm. Zmenšete měřítko nebo model otočte.`]);
  if (mx < 5) L.push(['warn', 'Model je velmi malý', 'Možná je v centimetrech nebo palcích. Použijte tlačítko × 10 nebo × 25,4.']);
  const pct = A.area ? oh.area / (A.area * scale * scale) * 100 : 0;
  L.push(pct < 0.5 ? ['ok', 'Bez převisů', 'Model se vytiskne bez podpěr.'] : [pct > 15 ? 'warn' : 'info', `Převisy: ${fmt(pct, 0)} % povrchu`, `${fmt(oh.area / 100, 1)} cm² potřebuje podpěry (červeně). Zkuste jiné natočení.`]);
  if (oh.bed < 1) L.push(['warn', 'Malá plocha na podložce', 'Model se podložky skoro nedotýká. Položte ho rovnou stěnou dolů nebo zapněte podpěry a lem (brim).']);
  $('checks').innerHTML = L.map(([c, t, d]) => `<div class="chk ${c}"><i>${c === 'ok' ? '✓' : c === 'info' ? 'i' : '!'}</i><span>${t}${d ? `<small>${d}</small>` : ''}</span></div>`).join('');
  const needFix = !closed || !oriented || A.degen || A.dup;
  $('btnUnion').hidden = A.shells < 2;
  $('btnFix').hidden = !needFix;
  const msgs = [];
  if (fixed) msgs.push({ lvl: closed && oriented ? 'ok' : 'warn', msg: `Oprava: ${fixed.filled ? plural(fixed.filled, 'díra zacelena', 'díry zaceleny', 'děr zaceleno') : 'bez děr'}${fixed.removed ? ', odstraněno ' + plural(fixed.removed, 'nadbytečný trojúhelník', 'nadbytečné trojúhelníky', 'nadbytečných trojúhelníků') : ''}, směr stěn sjednocen.` + (fixed.skipped ? ' Některé díry jsou příliš složité, opravte je v původním programu.' : '') });
  showMsgs(msgs);
}
function stats(pl, oh) {
  const vol = Math.abs(A.vol) * scale ** 3, area = A.area * scale ** 2;
  const est = filamentEstimate({ volume: vol, area }, { wall: clamp(D.wall, 0.4, 5), infill: clamp(D.infill, 0, 100), density: +D.mat, diameter: 1.75, pricePerKg: clamp(D.price, 0, 10000) });
  const hrs = est.grams / 11 + 0.15;
  const s = pl.size;
  $('dims').innerHTML = `<b>${fmt(s[0])}</b> × <b>${fmt(s[1])}</b> × <b>${fmt(s[2])}</b> mm`;
  const tiles = [['Rozměry', `${fmt(s[0], 1)} × ${fmt(s[1], 1)} × ${fmt(s[2], 1)} mm`], ['Objem', `${fmt(vol / 1000, 1)} cm³`], ['Hmotnost', `${fmt(est.grams, 0)} g`], ['Filament', `${fmt(est.meters, 1)} m · ${fmt(est.price, 0)} Kč`], ['Tisk zhruba', hrs < 1 ? `${fmt(hrs * 60, 0)} min` : `${fmt(hrs, 1)} h`]];
  const box = $('stats'); box.textContent = '';
  for (const [a, b] of tiles) { const d = document.createElement('div'); d.className = 'stat'; const s1 = document.createElement('span'); s1.textContent = a; const s2 = document.createElement('b'); s2.textContent = b; d.append(s1, s2); box.append(d); }
}

/* ===== Manifold: zjednodušení a sloučení těles ===== */
let MF = null;
async function mf() { if (!MF) { const s2 = atob(MANIFOLD_WASM_B64), u = new Uint8Array(s2.length); for (let i = 0; i < s2.length; i++) u[i] = s2.charCodeAt(i); MF = await ManifoldModule({ wasmBinary: u }); MF.setup(); } return MF; }
function toMF(V, T) { const mesh = new MF.Mesh({ numProp: 3, vertProperties: Float32Array.from(V), triVerts: Uint32Array.from(T) }); mesh.merge(); return new MF.Manifold(mesh); }
function fromMF(m) { const me = m.getMesh(), np = me.numProp, n = me.vertProperties.length / np, V = new Float64Array(n * 3); for (let i = 0; i < n; i++) { V[3 * i] = me.vertProperties[i * np]; V[3 * i + 1] = me.vertProperties[i * np + 1]; V[3 * i + 2] = me.vertProperties[i * np + 2]; } return { V, T: Uint32Array.from(me.triVerts) }; }
async function mfStep(fn, okMsg) {
  if (!base) return; busy(true); await new Promise(r => setTimeout(r, 30));
  const trash = [];
  try {
    await mf();
    if (A.open || A.nonMan || A.flipped || A.vol <= 0) { const r = repair(base.V, base.T); base.V = r.V; base.T = r.T; fixed = r; }
    const m = toMF(base.V, base.T); trash.push(m);
    const st = m.status(); if (st !== 'NoError' && st !== 0) throw new Error('nm');
    const before = base.T.length / 3, out = fn(m, trash); trash.push(out);
    const r = fromMF(out); base.V = r.V; base.T = r.T; A = analyze(base.V, base.T);
    $('fname').textContent = base.name + ' · ' + plural(A.nT, 'trojúhelník', 'trojúhelníky', 'trojúhelníků');
    refresh(); extraMsg = { lvl: 'ok', msg: okMsg(before, A.nT) }; showMsgs([extraMsg]);
  } catch (e) {
    console.error(e); showMsgs([{ lvl: 'bad', msg: 'Model se nepodařilo zpracovat. Nejdřív ho opravte tlačítkem „Opravit model“; pokud to nepomůže, má složitější chyby (protínající se plochy).' }]);
  } finally { trash.forEach(x => { try { x.delete(); } catch (e) {} }); busy(false); }
}
let extraMsg = null;
$('btnSimp').onclick = () => { const tol = +$('simpTol').value; mfStep((m) => m.simplify(tol), (b, a) => `Zjednodušeno s přesností ${fmt(tol, 2)} mm: ${fmtN(b)} → ${fmtN(a)} trojúhelníků (${fmt(100 - a / b * 100, 0)} % méně).`); };
$('btnUnion').onclick = () => mfStep((m, trash) => { const parts = m.decompose(); parts.forEach(x => trash.push(x)); return MF.Manifold.union(parts); }, (b, a) => `Tělesa jsou sloučená do ${A.shells === 1 ? 'jednoho' : fmtN(A.shells)}.`);

/* ===== Úpravy ===== */
$('btnFix').onclick = () => {
  if (!base) return; busy(true);
  setTimeout(() => { try {
    const r = repair(base.V, base.T); base.V = r.V; base.T = r.T; fixed = r; A = analyze(base.V, base.T);
    $('fname').textContent = base.name + ' · ' + plural(A.nT, 'trojúhelník', 'trojúhelníky', 'trojúhelníků'); refresh();
  } finally { busy(false); } }, 30);
};
$('scale').addEventListener('input', () => { const v = parseFloat($('scale').value); if (!(v > 0)) return; scale = v / 100; fitNext = true; refresh(); });
document.querySelectorAll('[data-sc]').forEach(b => b.onclick = () => { scale = scale * +b.dataset.sc; $('scale').value = Math.round(scale * 1000) / 10; fitNext = true; refresh(); });
document.querySelectorAll('[data-rot]').forEach(b => b.onclick = () => { const ax = { x: [1, 0, 0], y: [0, 1, 0], z: [0, 0, 1] }[b.dataset.rot]; rot.premultiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(...ax), Math.PI / 2)); fitNext = true; refresh(); });
$('btnReset').onclick = () => { if (!base) return; rot = new THREE.Quaternion(); fitNext = true; refresh(); $('orientHint').textContent = ''; };
let pickMode = false;
$('btnPick').onclick = () => { pickMode = !pickMode; $('viewer').classList.toggle('pick', pickMode); $('btnPick').setAttribute('aria-pressed', String(pickMode)); $('help').textContent = pickMode ? 'Klikněte na stěnu, která má ležet na podložce' : 'Táhnutím otáčíte · kolečkem nebo dvěma prsty přibližujete'; };
function layOn(normal) { // normála v současné poloze -> dolů
  rot.premultiply(new THREE.Quaternion().setFromUnitVectors(normal.clone().normalize(), new THREE.Vector3(0, 0, -1))); fitNext = true; refresh();
}
$('btnBest').onclick = () => {
  if (!base) return; busy(true);
  setTimeout(() => { try {
    const V = base.V, T = base.T, nT = T.length / 3, cur = new THREE.Vector3();
    // kandidáti: 6 os a normály největších rovných ploch
    const cl = new Map();
    for (let t = 0; t < nT; t++) { const a = T[3 * t], b = T[3 * t + 1], c = T[3 * t + 2];
      const ux = V[3 * b] - V[3 * a], uy = V[3 * b + 1] - V[3 * a + 1], uz = V[3 * b + 2] - V[3 * a + 2], vx = V[3 * c] - V[3 * a], vy = V[3 * c + 1] - V[3 * a + 1], vz = V[3 * c + 2] - V[3 * a + 2];
      const nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx, l = Math.hypot(nx, ny, nz); if (!l) continue;
      const k = Math.round(nx / l * 50) + ',' + Math.round(ny / l * 50) + ',' + Math.round(nz / l * 50); const e = cl.get(k) || { x: 0, y: 0, z: 0, a: 0 }; e.x += nx / 2; e.y += ny / 2; e.z += nz / 2; e.a += l / 2; cl.set(k, e); }
    const cands = [[1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1]].map(v => new THREE.Vector3(...v));
    [...cl.values()].sort((a, b) => b.a - a.a).slice(0, 14).forEach(e => cands.push(new THREE.Vector3(e.x, e.y, e.z).normalize()));
    const lim = Math.sin(clamp(D.ang, 20, 80) * Math.PI / 180);
    let best = null;
    for (const d of cands) { // d = směr v původním modelu, který má mířit dolů
      let zmin = Infinity, zmax = -Infinity; for (let i = 0; i < V.length; i += 3) { const z = -(V[i] * d.x + V[i + 1] * d.y + V[i + 2] * d.z); if (z < zmin) zmin = z; if (z > zmax) zmax = z; }
      let over = 0, bed = 0;
      for (let t = 0; t < nT; t++) { const a = T[3 * t], b = T[3 * t + 1], c = T[3 * t + 2];
        const ux = V[3 * b] - V[3 * a], uy = V[3 * b + 1] - V[3 * a + 1], uz = V[3 * b + 2] - V[3 * a + 2], vx = V[3 * c] - V[3 * a], vy = V[3 * c + 1] - V[3 * a + 1], vz = V[3 * c + 2] - V[3 * a + 2];
        const nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx, l = Math.hypot(nx, ny, nz); if (!l) continue;
        const za = -(V[3 * a] * d.x + V[3 * a + 1] * d.y + V[3 * a + 2] * d.z) - zmin, zb = -(V[3 * b] * d.x + V[3 * b + 1] * d.y + V[3 * b + 2] * d.z) - zmin, zc = -(V[3 * c] * d.x + V[3 * c + 1] * d.y + V[3 * c + 2] * d.z) - zmin;
        const dn = (nx * d.x + ny * d.y + nz * d.z) / l; // = -nz v nové poloze
        if (za < 0.05 && zb < 0.05 && zc < 0.05) { bed += l / 2; continue; }
        if (dn > lim) over += l / 2; }
      const score = over + (zmax - zmin) * 2 - Math.min(bed, 400) * 0.5;
      if (!best || score < best.score) best = { d, over, score, h: zmax - zmin };
    }
    rot = new THREE.Quaternion().setFromUnitVectors(best.d, new THREE.Vector3(0, 0, -1));
    $('orientHint').textContent = `Natočeno tak, aby bylo co nejméně převisů (${fmt(best.over * scale * scale / 100, 1)} cm²) a model stál stabilně.`;
    fitNext = true; refresh();
  } finally { busy(false); } }, 30);
};

/* ===== 3D scéna ===== */
const cv = $('cv');
let renderer = null, scene, camera, bedGroup, meshObj = null, lineObj = null, fitNext = true, bbox = null;
const orbit = { theta: -Math.PI / 2, phi: 1.2, r: 300, target: new THREE.Vector3() };
function initGL() {
  try { renderer = new THREE.WebGLRenderer({ canvas: cv, antialias: true }); } catch (e) { renderer = null; return; }
  renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
  scene = new THREE.Scene(); camera = new THREE.PerspectiveCamera(30, 1, 0.5, 20000); camera.up.set(0, 0, 1);
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
  if (!bbox || !renderer) return; const b = bbox, sx = b.max.x - b.min.x, sy = b.max.y - b.min.y, sz = b.max.z - b.min.z;
  orbit.target.set((b.min.x + b.max.x) / 2, (b.min.y + b.max.y) / 2, sz / 2);
  const span = Math.max(sx, sy, sz, 10);
  orbit.r = span / (2 * Math.tan(THREE.MathUtils.degToRad(30) / 2)) * Math.max(1.3, 1.7 / camera.aspect);
  if (view === 'front') { orbit.theta = -Math.PI / 2; orbit.phi = Math.PI / 2 - 0.06; }
  else if (view === 'top') { orbit.theta = -Math.PI / 2; orbit.phi = 0.001; }
  else { orbit.theta = -Math.PI / 2 - 0.6; orbit.phi = 1.05; }
  draw();
}
$('vFront').onclick = () => fit('front'); $('vTop').onclick = () => fit('top'); $('vPersp').onclick = () => fit('persp');
$('vOver').onclick = () => { D.showOver = !D.showOver; saveState(); refresh(); };
$('vEdges').onclick = () => { D.showEdges = !D.showEdges; saveState(); refresh(); };
function render(oh) {
  $('vOver').setAttribute('aria-pressed', String(D.showOver)); $('vEdges').setAttribute('aria-pressed', String(D.showEdges));
  if (!renderer) { bbox = new THREE.Box3(new THREE.Vector3(-P.size[0] / 2, -P.size[1] / 2, 0), new THREE.Vector3(P.size[0] / 2, P.size[1] / 2, P.size[2])); return; }
  if (meshObj) { scene.remove(meshObj); meshObj.geometry.dispose(); meshObj.material.dispose(); meshObj = null; }
  if (lineObj) { scene.remove(lineObj); lineObj.geometry.dispose(); lineObj.material.dispose(); lineObj = null; }
  const T = base.T, V = P.V, nT = T.length / 3, pos = new Float32Array(nT * 9), col = new Float32Array(nT * 9);
  for (let t = 0; t < nT; t++) {
    const c = D.showEdges && A.badTri[t] ? COL.err : D.showOver && oh.mask[t] ? COL.over : COL.base;
    for (let k = 0; k < 3; k++) { const v = T[3 * t + k]; pos.set([V[3 * v], V[3 * v + 1], V[3 * v + 2]], 9 * t + 3 * k); col.set([c.r, c.g, c.b], 9 * t + 3 * k); }
  }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.setAttribute('color', new THREE.BufferAttribute(col, 3)); g.computeVertexNormals();
  meshObj = new THREE.Mesh(g, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.6, metalness: 0.03, side: THREE.DoubleSide, flatShading: true }));
  scene.add(meshObj);
  if (D.showEdges && A.openEdges.length) {
    const lp = new Float32Array(A.openEdges.length * 3);
    A.openEdges.forEach((v, i) => lp.set([V[3 * v], V[3 * v + 1], V[3 * v + 2]], 3 * i));
    const lg = new THREE.BufferGeometry(); lg.setAttribute('position', new THREE.BufferAttribute(lp, 3));
    lineObj = new THREE.LineSegments(lg, new THREE.LineBasicMaterial({ color: COL.err, depthTest: false })); lineObj.renderOrder = 2; scene.add(lineObj);
  }
  g.computeBoundingBox(); bbox = g.boundingBox.clone();
  if (fitNext) { fit('persp'); fitNext = false; } else draw();
}
const ptrs = new Map(); let pinch0 = 0, r0 = 0, downAt = null;
cv.addEventListener('contextmenu', e => e.preventDefault());
cv.addEventListener('pointerdown', e => { cv.setPointerCapture(e.pointerId); downAt = { x: e.clientX, y: e.clientY }; ptrs.set(e.pointerId, { x: e.clientX, y: e.clientY, b: e.button, shift: e.shiftKey }); if (ptrs.size === 2) { const [a, b] = [...ptrs.values()]; pinch0 = Math.hypot(a.x - b.x, a.y - b.y); r0 = orbit.r; } });
cv.addEventListener('pointermove', e => { const p = ptrs.get(e.pointerId); if (!p) return; const dx = e.clientX - p.x, dy = e.clientY - p.y; p.x = e.clientX; p.y = e.clientY;
  if (ptrs.size === 2) { const [a, b] = [...ptrs.values()]; const d = Math.hypot(a.x - b.x, a.y - b.y); if (pinch0) orbit.r = r0 * pinch0 / d; }
  else if (p.b === 2 || p.shift) { const k = orbit.r * 0.0016, right = new THREE.Vector3(), up = new THREE.Vector3(); camera.matrixWorld.extractBasis(right, up, new THREE.Vector3()); orbit.target.addScaledVector(right, -dx * k).addScaledVector(up, dy * k); }
  else { orbit.theta -= dx * 0.008; orbit.phi = Math.min(Math.PI - 0.05, Math.max(0.001, orbit.phi - dy * 0.008)); } draw(); });
const pup = e => {
  const wasSingle = ptrs.size === 1; ptrs.delete(e.pointerId); if (ptrs.size < 2) pinch0 = 0;
  if (pickMode && wasSingle && downAt && Math.hypot(e.clientX - downAt.x, e.clientY - downAt.y) < 6 && meshObj) {
    const r = cv.getBoundingClientRect(), m = new THREE.Vector2((e.clientX - r.left) / r.width * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
    const rc = new THREE.Raycaster(); rc.setFromCamera(m, camera); const hit = rc.intersectObject(meshObj)[0];
    if (hit && hit.face) { const n = hit.face.normal.clone(); if (n.dot(rc.ray.direction) > 0) n.negate(); $('btnPick').click(); layOn(n); }
  }
};
cv.addEventListener('pointerup', pup); cv.addEventListener('pointercancel', pup);
cv.addEventListener('wheel', e => { e.preventDefault(); orbit.r = Math.min(20000, Math.max(2, orbit.r * Math.exp(e.deltaY * 0.0012))); draw(); }, { passive: false });
function showMsgs(list) { const box = $('msgs'); box.textContent = ''; for (const m of list) { const d = document.createElement('div'); d.className = 'msg ' + m.lvl; d.textContent = m.msg; box.append(d); } }
function busy(on) { $('busy').hidden = !on; }

/* ===== Ovládání ===== */
document.querySelectorAll('[data-k]').forEach(el => {
  el.value = D[el.dataset.k];
  el.addEventListener('input', () => { const v = parseFloat(el.value); if (!isFinite(v)) return; D[el.dataset.k] = v; saveState(); if (/^bed/.test(el.dataset.k) && renderer) makeBed(); if (base) refresh(); });
});
$('mat').value = D.mat; $('mat').addEventListener('change', () => { D.mat = $('mat').value; saveState(); if (base) refresh(); });
const drop = $('drop'), fileIn = $('file');
drop.onclick = () => fileIn.click();
$('btnOpen2').onclick = () => fileIn.click(); $('btnDemo2').onclick = () => $('btnDemo').click();
drop.onkeydown = (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); fileIn.click(); } };
fileIn.onchange = () => { loadFile(fileIn.files[0]); fileIn.value = ''; };
['dragenter', 'dragover'].forEach(t => drop.addEventListener(t, (e) => { e.preventDefault(); drop.classList.add('over'); }));
['dragleave', 'drop'].forEach(t => drop.addEventListener(t, (e) => { e.preventDefault(); drop.classList.remove('over'); }));
window.addEventListener('dragover', (e) => e.preventDefault());
window.addEventListener('drop', (e) => { e.preventDefault(); const f = e.dataTransfer && e.dataTransfer.files[0]; if (f) loadFile(f); });
$('btnDemo').onclick = () => { // ukázka: stojánek s převisem, dírou a otočenými stěnami
  const g = stackSolid([{ z0: 0, z1: 12, ex: exOf(rrect(0, 0, 30, 30, 3)) }, { z0: 12, z1: 18, ex: exOf(rrect(0, 0, 60, 30, 3)) }, { z0: 18, z1: 40, ex: exOf(circ(0, 0, 9, 48)) }]);
  const p = Array.from(g.attributes.position.array), n = p.length / 9;
  const top = []; for (let t = 0; t < n; t++) if (p[9 * t + 2] > 39.9 && p[9 * t + 5] > 39.9 && p[9 * t + 8] > 39.9) top.push(t);
  const drop2 = new Set(top.slice(0, Math.ceil(top.length / 3)));
  const out = []; for (let t = 0; t < n; t++) { if (drop2.has(t)) continue; const tri = p.slice(9 * t, 9 * t + 9); if (t % 97 === 5) out.push(...tri.slice(0, 3), ...tri.slice(6, 9), ...tri.slice(3, 6)); else out.push(...tri); }
  setModel(new Float32Array(out), 'ukazka.stl');
};

/* ===== Stažení ===== */
const inViewer = !!(window.claude && typeof window.claude.use === 'function');
let dlCap = null;
if (inViewer) window.claude.use('downloads').then(d => { dlCap = d; updateNote(); }).catch(() => updateNote());
function updateNote() { $('saveNote').textContent = inViewer ? (dlCap ? 'Tady se STL stáhne zabalené v ZIP souboru.' : 'Stahování je v tomto zobrazení nedostupné.') : 'Uloží model tak, jak ho vidíte: opravený, natočený a ve zvoleném měřítku. Formát STL přečte každý slicer.'; }
$('fmt').value = D.fmt; $('fmt').addEventListener('change', () => { D.fmt = $('fmt').value; saveState(); });
function exportData(fmtName) {
  const T = base.T, V = P.V, nT = T.length / 3, nV = V.length / 3;
  if (fmtName === 'obj') {
    const L = ['# Created by Julius Andy Antos | Kontrola STL | mm'];
    for (let i = 0; i < nV; i++) L.push('v ' + V[3 * i].toFixed(4) + ' ' + V[3 * i + 1].toFixed(4) + ' ' + V[3 * i + 2].toFixed(4));
    for (let t = 0; t < nT; t++) L.push('f ' + (T[3 * t] + 1) + ' ' + (T[3 * t + 1] + 1) + ' ' + (T[3 * t + 2] + 1));
    return new TextEncoder().encode(L.join('\n') + '\n');
  }
  if (fmtName === '3mf') {
    const vs = [], ts = [];
    for (let i = 0; i < nV; i++) vs.push(`<vertex x="${V[3 * i].toFixed(4)}" y="${V[3 * i + 1].toFixed(4)}" z="${V[3 * i + 2].toFixed(4)}"/>`);
    for (let t = 0; t < nT; t++) ts.push(`<triangle v1="${T[3 * t]}" v2="${T[3 * t + 1]}" v3="${T[3 * t + 2]}"/>`);
    const model = '<?xml version="1.0" encoding="UTF-8"?>\n<model unit="millimeter" xml:lang="cs-CZ" xmlns="http://schemas.microsoft.com/3dmanufacturing/core/2015/02"><metadata name="Application">Kontrola STL - Julius Andy Antos</metadata><resources><object id="1" type="model"><mesh><vertices>' + vs.join('') + '</vertices><triangles>' + ts.join('') + '</triangles></mesh></object></resources><build><item objectid="1"/></build></model>';
    const enc = (t) => new TextEncoder().encode(t);
    return makeZip([
      { name: '[Content_Types].xml', data: enc('<?xml version="1.0" encoding="UTF-8"?>\n<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="model" ContentType="application/vnd.ms-package.3dmanufacturing-3dmodel+xml"/></Types>') },
      { name: '_rels/.rels', data: enc('<?xml version="1.0" encoding="UTF-8"?>\n<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Target="/3D/3dmodel.model" Id="rel0" Type="http://schemas.microsoft.com/3dmanufacturing/2013/01/3dmodel"/></Relationships>') },
      { name: '3D/3dmodel.model', data: enc(model) },
    ]);
  }
  const pos = new Float32Array(nT * 9);
  for (let t = 0; t < nT; t++) for (let k = 0; k < 3; k++) { const v = T[3 * t + k]; pos[9 * t + 3 * k] = V[3 * v]; pos[9 * t + 3 * k + 1] = V[3 * v + 1]; pos[9 * t + 3 * k + 2] = V[3 * v + 2]; }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const u = stlBinary([g]), head = 'Created by Julius Andy Antos | Kontrola STL | mm'; for (let i = 0; i < 80; i++) u[i] = i < head.length ? head.charCodeAt(i) : 32;
  return u;
}
$('btnSave').onclick = async () => {
  if (!base || !P) return;
  const f = D.fmt || 'stl', data = exportData(f);
  const name = base.name.replace(/\.(stl|obj|3mf)$/i, '') + '_upraveno.' + f;
  if (inViewer) {
    if (!dlCap) return;
    try { await dlCap.save({ filename: name.replace(/\.\w+$/, '.zip'), data: makeZip([{ name, data }]) }); $('saveNote').textContent = 'ZIP je uložený.'; }
    catch (err) { if (err && err.code !== 'declined') $('saveNote').textContent = 'Soubor se nepodařilo uložit.'; }
    return;
  }
  const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([data], { type: 'application/octet-stream' })); a.download = name; document.body.append(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 2000);
};

/* ===== Instalace jako aplikace a sbalitelné sekce ===== */
let installEvt = null;
window.addEventListener('beforeinstallprompt', (e) => { e.preventDefault(); installEvt = e; $('btnInstall').hidden = false; });
window.addEventListener('appinstalled', () => { installEvt = null; $('btnInstall').hidden = true; });
$('btnInstall').onclick = async () => { if (!installEvt) return; installEvt.prompt(); try { await installEvt.userChoice; } catch (e) {} installEvt = null; $('btnInstall').hidden = true; };
if (!inViewer && 'serviceWorker' in navigator && (location.protocol === 'https:' || location.hostname === 'localhost')) navigator.serviceWorker.register('sw.js').catch(() => {});
(function () {
  const KEY = 'kontrola-stl-sbaleno';
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
document.querySelectorAll('[data-show="loaded"]').forEach(el => { el.hidden = true; });
initGL(); updateNote(); makeBed && renderer && makeBed();

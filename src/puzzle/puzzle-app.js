/* ===== Puzzle z modelu – rozřezání plochého modelu na dílky se zámky. Created by Julius Andy Antoš ===== */
const $ = (id) => document.getElementById(id);
const DEF = { pv: 'model', src: 'plate', pw: 120, ph: 80, pt: 3, pr: 6, lay: 'z', N: 24, tab: 100, jit: 50, kerf: 0.25, seed: 7, merge: true, lay2: 'spread', nums: true, tray: false, tw: 3, bedX: 220, bedY: 220, bedZ: 250 };
const STORE = 'puzzle-v1';
const D = Object.assign({}, DEF);
try { const s = JSON.parse(localStorage.getItem(STORE) || '{}'); for (const k in DEF) if (k in s && typeof s[k] === typeof DEF[k]) D[k] = s[k]; } catch (e) {}
const saveState = () => { try { localStorage.setItem(STORE, JSON.stringify(D)); } catch (e) {} };
const fmt = (v, d = 1) => (+v).toLocaleString('cs-CZ', { maximumFractionDigits: d, minimumFractionDigits: d });
const fmtP = (v) => (+v).toLocaleString('cs-CZ', { maximumFractionDigits: 2 });
const css = (v) => getComputedStyle(document.documentElement).getPropertyValue(v).trim();
const clamp = (v, a, b) => Math.min(b, Math.max(a, +v || 0));
const PALETTE = ['#0b7a72', '#e07a3f', '#3f7fbf', '#c9a227', '#8e5aa8', '#4c9a4f', '#c4566b', '#5f7d8c'];

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
const cl = (cs) => T(T(T(cs.offset(-0.02, 'Round')).offset(0.02, 'Round')).simplify(0.002));
const empty = (cs) => !cs || cs.isEmpty() || cs.area() < 0.01;
function meshToManifold(pos, idx) {
  const mesh = new MF.Mesh({ numProp: 3, vertProperties: pos instanceof Float32Array ? pos : new Float32Array(pos), triVerts: idx instanceof Uint32Array ? idx : new Uint32Array(idx) });
  mesh.merge(); return T(new MF.Manifold(mesh));
}
// náhodná čísla se zadaným semínkem, aby šlo rozložení zopakovat
function rng(seed) { let a = seed >>> 0; return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }

/* ===== Načtení vlastního modelu (STL, OBJ, 3MF, i vícebarevné) ===== */
let user = null; // { parts: [{ pos, idx, color, name }], name }
function parseObj(txt) {
  const v = [], out = [];
  for (const line of txt.split('\n')) { const p = line.trim().split(/\s+/);
    if (p[0] === 'v') v.push([+p[1], +p[2], +p[3]]);
    else if (p[0] === 'f') { const id = p.slice(1).map(s => { const i = parseInt(s, 10); return i < 0 ? v.length + i : i - 1; }); for (let k = 1; k < id.length - 1; k++) for (const i of [id[0], id[k], id[k + 1]]) out.push(...v[i]); } }
  if (!out.length) throw new Error('obj'); return new Float32Array(out);
}
async function unzipAll(buf) {
  const dv = new DataView(buf), u8 = new Uint8Array(buf), dec = new TextDecoder(), files = {};
  let e = -1; for (let i = u8.length - 22; i >= Math.max(0, u8.length - 70000); i--) if (dv.getUint32(i, true) === 0x06054b50) { e = i; break; }
  if (e < 0) throw new Error('zip');
  const n = dv.getUint16(e + 10, true); let p = dv.getUint32(e + 16, true);
  for (let k = 0; k < n && dv.getUint32(p, true) === 0x02014b50; k++) {
    const method = dv.getUint16(p + 10, true), cs = dv.getUint32(p + 20, true), nl = dv.getUint16(p + 28, true), xl = dv.getUint16(p + 30, true), cl_ = dv.getUint16(p + 32, true), off = dv.getUint32(p + 42, true);
    const name = dec.decode(u8.subarray(p + 46, p + 46 + nl)); p += 46 + nl + xl + cl_;
    if (!/\.(model|config|rels)$/i.test(name)) continue;
    const ds = off + 30 + dv.getUint16(off + 26, true) + dv.getUint16(off + 28, true); let raw = u8.subarray(ds, ds + cs);
    if (method === 8) raw = new Uint8Array(await new Response(new Blob([raw]).stream().pipeThrough(new DecompressionStream('deflate-raw'))).arrayBuffer());
    files['/' + name.replace(/^\//, '')] = dec.decode(raw);
  }
  return files;
}
// 3MF: rozloží objekty a díly (komponenty) včetně posunutí a zjistí jejich barvy (Bambu Studio, OrcaSlicer, PrusaSlicer, barvy materiálů)
async function parse3mfParts(buf) {
  const F = await unzipAll(buf), dp = new DOMParser(), objs = {}, mats = {};
  const mul = (A, B) => { const r = new Array(12); for (let i = 0; i < 4; i++) for (let j = 0; j < 3; j++) r[i * 3 + j] = (i < 3 ? 0 : B[9 + j]) + A[i * 3] * B[j] + A[i * 3 + 1] * B[3 + j] + A[i * 3 + 2] * B[6 + j]; return r; };
  const I12 = [1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0], tf = (s) => s ? s.trim().split(/\s+/).map(Number) : I12;
  let root = Object.keys(F).find(k => /3dmodel\.model$/i.test(k) && /^\/3D\//i.test(k)) || Object.keys(F).find(k => /\.model$/i.test(k));
  if (!root) throw new Error('3mf');
  for (const path of Object.keys(F).filter(k => /\.model$/i.test(k))) {
    const doc = dp.parseFromString(F[path], 'application/xml');
    doc.querySelectorAll('basematerials').forEach(bm => { mats[path + '#' + bm.getAttribute('id')] = [...bm.querySelectorAll('base')].map(b => (b.getAttribute('displaycolor') || '').slice(0, 7)); });
    doc.querySelectorAll('resources > object').forEach(o => {
      const id = o.getAttribute('id'), mesh = o.querySelector(':scope > mesh'), comps = [...o.querySelectorAll(':scope > components > component')];
      const rec = { path, id, pid: o.getAttribute('pid'), pindex: o.getAttribute('pindex'), comps: comps.map(c => ({ path: c.getAttribute('p:path') || c.getAttributeNS('http://schemas.microsoft.com/3dmanufacturing/production/2015/06', 'path') || path, id: c.getAttribute('objectid'), t: tf(c.getAttribute('transform')) })) };
      if (mesh) { rec.v = [...mesh.querySelectorAll('vertices > vertex')].map(v => [+v.getAttribute('x'), +v.getAttribute('y'), +v.getAttribute('z')]); rec.t3 = [...mesh.querySelectorAll('triangles > triangle')].map(t => [+t.getAttribute('v1'), +t.getAttribute('v2'), +t.getAttribute('v3')]); }
      objs[path + '#' + id] = rec;
    });
  }
  // barvy podle extruderu (Bambu/Orca: model_settings.config + project_settings.config, Prusa: Slic3r_PE_model.config + Slic3r_PE.config)
  let fcol = []; const ps = F['/Metadata/project_settings.config']; if (ps) { try { fcol = JSON.parse(ps).filament_colour || []; } catch (e) {} }
  const pc = F['/Metadata/Slic3r_PE.config']; if (pc) { const m = pc.match(/filament_colour\s*=\s*([^\n]+)/); if (m) fcol = m[1].split(';').map(x => x.trim()); }
  const ext = {}; const ms = F['/Metadata/model_settings.config'];
  if (ms) { const d = dp.parseFromString(ms, 'application/xml'); d.querySelectorAll('object').forEach(o => { const oe = o.querySelector(':scope > metadata[key="extruder"]'); ext[o.getAttribute('id')] = { e: oe ? +oe.getAttribute('value') : 0, parts: {} };
    o.querySelectorAll(':scope > part').forEach(p => { const pe = p.querySelector('metadata[key="extruder"]'); if (pe) ext[o.getAttribute('id')].parts[p.getAttribute('id')] = +pe.getAttribute('value'); }); }); }
  const pv = {}; const pm = F['/Metadata/Slic3r_PE_model.config'];
  if (pm) { const d = dp.parseFromString(pm, 'application/xml'); d.querySelectorAll('object').forEach(o => { pv[o.getAttribute('id')] = [...o.querySelectorAll(':scope > volume')].map(v => { const me = v.querySelector('metadata[key="extruder"]'); return { a: +v.getAttribute('firstid'), b: +v.getAttribute('lastid'), e: me ? +me.getAttribute('value') : 0 }; }); }); }
  const parts = [];
  const emit = (rec, M, key, color) => {
    const vs = rec.v.map(([x, y, z]) => [x * M[0] + y * M[3] + z * M[6] + M[9], x * M[1] + y * M[4] + z * M[7] + M[10], x * M[2] + y * M[5] + z * M[8] + M[11]]);
    const ranges = pv[rec.id] && rec.path === root && pv[rec.id].length > 1 ? pv[rec.id] : [{ a: 0, b: rec.t3.length - 1, e: 0 }];
    for (const r of ranges) {
      const out = new Float32Array((r.b - r.a + 1) * 9); let k = 0;
      for (let i = r.a; i <= r.b && i < rec.t3.length; i++) for (const vi of rec.t3[i]) { out[k++] = vs[vi][0]; out[k++] = vs[vi][1]; out[k++] = vs[vi][2]; }
      const c = r.e && fcol[r.e - 1] ? fcol[r.e - 1] : color;
      parts.push({ soup: out.subarray(0, k), key: r.e ? 'e' + r.e : key, color: c });
    }
  };
  const walk = (rec, M, top, depth) => {
    if (!rec || depth > 8) return;
    const mcol = rec.pid && mats[rec.path + '#' + rec.pid] ? mats[rec.path + '#' + rec.pid][+rec.pindex || 0] : null;
    if (rec.v) { const pe = top && ext[top.oid] ? (ext[top.oid].parts[rec.id] || ext[top.oid].e) : 0; emit(rec, M, pe ? 'e' + pe : (mcol ? 'c' + mcol : 'o' + (top ? top.oid + '_' + rec.id : rec.id)), pe && fcol[pe - 1] ? fcol[pe - 1] : mcol); }
    for (const c of rec.comps) walk(objs[c.path + '#' + c.id], mul(c.t, M), top || { oid: rec.id }, depth + 1);
  };
  const rd = dp.parseFromString(F[root], 'application/xml'), items = [...rd.querySelectorAll('build > item')];
  if (items.length) for (const it of items) { const rec = objs[root + '#' + it.getAttribute('objectid')]; walk(rec, tf(it.getAttribute('transform')), { oid: it.getAttribute('objectid') }, 0); }
  else for (const k in objs) if (objs[k].v) walk(objs[k], I12, null, 0);
  if (!parts.length) throw new Error('3mf');
  return parts;
}
function indexSoup(soup) {
  const map = new Map(), V = [], I = new Uint32Array(soup.length / 3);
  for (let i = 0; i < soup.length; i += 3) {
    const key = Math.round(soup[i] * 1e4) + ',' + Math.round(soup[i + 1] * 1e4) + ',' + Math.round(soup[i + 2] * 1e4);
    let id = map.get(key); if (id === undefined) { id = V.length / 3; map.set(key, id); V.push(soup[i], soup[i + 1], soup[i + 2]); } I[i / 3] = id;
  }
  return { pos: new Float32Array(V), idx: I };
}
const PART_COLS = ['#f4f1ea', '#262a2e', '#d9452b', '#2f6fb5', '#e8b923', '#3c9a5f', '#8e5aa8', '#e07a3f'];
// více souborů najednou = více barevných dílů jednoho modelu
async function loadUser(fileList) {
  const files = [...(fileList || [])].filter(Boolean); if (!files.length) return;
  busy(true, 'Načítám model…'); await new Promise(r => setTimeout(r, 30));
  try {
    const raw = [];
    for (const file of files) {
      const buf = await file.arrayBuffer();
      if (/\.3mf$/i.test(file.name)) (await parse3mfParts(buf)).forEach(p => raw.push(p));
      else raw.push({ soup: /\.obj$/i.test(file.name) ? parseObj(new TextDecoder().decode(buf)) : parseStl(buf), key: 'f' + raw.length + file.name, color: null, name: file.name });
    }
    // díly stejné barvy se sloučí
    const by = new Map(); for (const p of raw) { const k = p.color ? 'c' + p.color.toLowerCase() : p.key; if (!by.has(k)) by.set(k, { soups: [], color: p.color, name: p.name }); by.get(k).soups.push(p.soup); }
    const parts = []; let ci = 0;
    for (const [, g] of by) {
      const n = g.soups.reduce((a, s) => a + s.length, 0), soup = new Float32Array(n); let o = 0; for (const s of g.soups) { soup.set(s, o); o += s.length; }
      const p = indexSoup(soup), m = meshToManifold(p.pos, p.idx);
      if (m.status() !== 'NoError' || m.isEmpty()) throw new Error('nm');
      parts.push({ pos: p.pos, idx: p.idx, color: g.color || PART_COLS[ci % PART_COLS.length] }); ci++;
    }
    const name = files.length > 1 ? files[0].name.replace(/\.(stl|obj|3mf)$/i, '') + '_a_dalsi' : files[0].name;
    user = { parts, name }; freeAll();
    D.src = 'file'; $('fname').textContent = files.map(f => f.name).join(', ') + (parts.length > 1 ? ` · ${parts.length} barevné díly` : ''); syncUI(); fitNext = true; saveState(); schedule(true);
  } catch (e) {
    console.error(e); freeAll();
    showMsgs([{ lvl: 'bad', msg: e.message === 'nm' ? 'Model (nebo některý jeho díl) není uzavřený a nejde rozřezat. Opravte ho nejdřív v Kontrole STL a stáhněte opravený.' : 'Soubor se nepodařilo přečíst.' }]);
  } finally { busy(false); }
}
// model položený na podložku a vystředěný: seznam barevných dílů a jejich sjednocení
function sourceModel(msgs) {
  if (D.src === 'file') {
    if (!user) return null;
    const R = { z: null, y: [90, 0, 0], x: [0, -90, 0], '-z': [180, 0, 0] }[D.lay];
    let parts = user.parts.map(p => { let m = meshToManifold(p.pos, p.idx); if (R) m = T(m.rotate(R)); return { m, color: p.color }; });
    const M0 = parts.length > 1 ? U(parts.map(p => p.m)) : parts[0].m, b = M0.boundingBox(), t = [-(b.min[0] + b.max[0]) / 2, -(b.min[1] + b.max[1]) / 2, -b.min[2]];
    parts = parts.map(p => ({ m: T(p.m.translate(t)), color: p.color }));
    return { parts, M: T(M0.translate(t)) };
  }
  const w = clamp(D.pw, 20, 400), h = clamp(D.ph, 20, 400), t = clamp(D.pt, 1, 20), r = Math.min(clamp(D.pr, 0, 50), w / 2 - 1, h / 2 - 1);
  let cs = T(MF.CrossSection.square([w, h], true)); if (r > 0.1) cs = T(T(cs.offset(-r, 'Round')).offset(r, 'Round'));
  const m = ext(cs, 0, t); return { parts: [{ m, color: PART_COLS[0] }], M: m };
}
// obrys modelu shora: rychle z několika vodorovných řezů (průmět složitého povrchu by trval dlouho)
function silhouette(M, Z) {
  const hs = [0.05, 0.3, 0.6, 0.9].map(f => Math.max(0.05, Z * f)), sl = hs.map(z => T(M.slice(z))).filter(c => !c.isEmpty());
  return sl.length ? T(T(MF.CrossSection.union(sl)).simplify(0.05)) : T(M.project());
}

/* ===== Hrana se zámkem ===== */
// body hrany od P0 do P1; zámek vystupuje na stranu normály (znaménko f), velikost u
function tabEdge(P0, P1, u, f, R, jit) {
  const dx = P1[0] - P0[0], dy = P1[1] - P0[1], L = Math.hypot(dx, dy), tx = dx / L, ty = dy / L, nx = -ty * f, ny = tx * f;
  const j = (a) => (R() * 2 - 1) * a * jit;
  const c = L / 2 + j(L * 0.08), hr = u * (0.12 + j(0.015)), hc = u * (0.175 + j(0.02)), nw = u * (0.055 + j(0.008)), fl = u * 0.06;
  const P = (t, s) => [P0[0] + tx * t + nx * s, P0[1] + ty * t + ny * s];
  const pts = [P(0, 0)];
  const sNeck = hc - Math.sqrt(Math.max(0.0001, hr * hr - nw * nw));
  // náběh do krčku (Bézier), hlava jako oblouk, sestup
  const bez = (p0, p1, p2, p3, n) => { for (let i = 1; i <= n; i++) { const t = i / n, a = 1 - t; pts.push(P(a * a * a * p0[0] + 3 * a * a * t * p1[0] + 3 * a * t * t * p2[0] + t * t * t * p3[0], a * a * a * p0[1] + 3 * a * a * t * p1[1] + 3 * a * t * t * p2[1] + t * t * t * p3[1])); } };
  pts.push(P(c - nw - fl, 0));
  bez([c - nw - fl, 0], [c - nw, 0], [c - nw, sNeck * 0.4], [c - nw, sNeck], 8);
  const al = Math.acos(Math.min(1, nw / hr)), a0 = Math.PI + al, a1 = -al, n = 28;
  for (let i = 1; i < n; i++) { const a = a0 + (a1 - a0) * i / n; pts.push(P(c + hr * Math.cos(a), hc + hr * Math.sin(a))); }
  pts.push(P(c + nw, sNeck));
  bez([c + nw, sNeck], [c + nw, sNeck * 0.4], [c + nw, 0], [c + nw + fl, 0], 8);
  pts.push(P(L, 0));
  return pts;
}

/* ===== Rozřezání ===== */
let FONT = null;
function labelCS(txt, h) {
  if (!FONT) { const s = atob(PUZZLE_FONTS.sans), u = new Uint8Array(s.length); for (let i = 0; i < s.length; i++) u[i] = s.charCodeAt(i); FONT = opentype.parse(u.buffer); }
  const L = layoutText(FONT, txt, { size: h, lineH: 1.2, spacing: 0.2, align: 'center', mirror: true, slant: 0 });
  return T(T(new MF.CrossSection(exToPaths(unionEx(L.paths)).map(p => p.map(q => [q.X / SC, q.Y / SC])), 'NonZero')).simplify(0.002));
}
function centroidXY(cs) { let A = 0, cx = 0, cy = 0; for (const p of cs.toPolygons()) for (let i = 0, j = p.length - 1; i < p.length; j = i++) { const f = p[j][0] * p[i][1] - p[i][0] * p[j][1]; A += f; cx += (p[j][0] + p[i][0]) * f; cy += (p[j][1] + p[i][1]) * f; } return A ? [cx / (3 * A), cy / (3 * A)] : [0, 0]; }
async function build(msgs, job) {
  // průběžně pustí prohlížeč ke slovu, aby nezamrzl, a skončí, když se mezitím změnilo nastavení
  const tick = async (txt) => { if (job.cancel) throw new Error('cancel'); if (txt) busy(true, txt); await new Promise(r => setTimeout(r, 0)); if (job.cancel) throw new Error('cancel'); };
  await tick('Připravuji model…');
  const SRC = sourceModel(msgs);
  if (!SRC) { msgs.push({ lvl: 'info', msg: 'Nahrajte plochý model (STL, OBJ nebo 3MF), nebo zvolte desku.' }); return null; }
  const M = SRC.M, CP = SRC.parts, multi = CP.length > 1;
  const bb = M.boundingBox(), W = bb.max[0] - bb.min[0], H = bb.max[1] - bb.min[1], Z = bb.max[2] - bb.min[2];
  if (Z > Math.min(W, H) * 0.5) msgs.push({ lvl: 'warn', msg: 'Model nevypadá plochý. Puzzle se řeže svisle přes celou výšku, u prostorových modelů to nebude fungovat. Zkuste ho jinak položit.' });
  await tick('Hledám obrys modelu…');
  const sil = silhouette(M, Z), N = Math.round(clamp(D.N, 2, 300)), m0 = 2;
  const R0 = Math.round(clamp(D.seed, 1, 9999)), jit = clamp(D.jit, 0, 100) / 100, kerf = clamp(D.kerf, 0.1, 1), zmax = bb.max[2] + 1;
  const gridFor = (n) => { const c = Math.max(1, Math.round(Math.sqrt(n * W / H))); return [c, Math.max(1, Math.round(n / c))]; };
  // u nepravidelného tvaru se mřížka zahustí podle toho, kolik obdélníku model skutečně zabírá
  let f0 = 1;
  if (sil.area() < W * H * 0.9) {
    let best = 1e9;
    for (let f = 1; f <= 4.01; f += 0.15) {
      const [c, r] = gridFor(N * f), w = (W + 2 * m0) / c, h = (H + 2 * m0) / r; let n = 0;
      for (let j = 0; j < r; j++) for (let i = 0; i < c; i++) { const a = T(sil.intersect(T(T(MF.CrossSection.square([w, h])).translate([bb.min[0] - m0 + i * w, bb.min[1] - m0 + j * h])))).area(); if (a >= w * h * 0.22) n++; }
      if (Math.abs(n - N) < best) { best = Math.abs(n - N); f0 = f; }
      if (n > N * 1.3) break;
    }
  }
  let res = null;
  for (let attempt = 0; attempt < 3; attempt++) {
    const [cols, rows] = gridFor(N * f0);
    res = await cutGrid(cols, rows);
    if (res.groups.length >= N * 0.75 || cols * rows > 400) break;
    f0 *= 1.35; // po sloučení vyšlo dílků moc málo: zkusí hustší mřížku
  }
  const { groups, cols, rows, cw, ch, u, moved, merged, lost } = res;

  async function cutGrid(cols, rows) {
    const x0 = bb.min[0] - m0, y0 = bb.min[1] - m0, cw = (W + 2 * m0) / cols, ch = (H + 2 * m0) / rows, u = Math.min(cw, ch) * clamp(D.tab, 60, 120) / 100;
    const R = rng(R0), X = (i) => x0 + i * cw, Y = (j) => y0 + j * ch;
    // vnitřní hrany se zámky: hE[j][i] vodorovná mezi řadou j-1 a j, vE[i][j] svislá mezi sloupcem i-1 a i
    const hE = [], vE = [];
    for (let j = 1; j < rows; j++) { hE[j] = []; for (let i = 0; i < cols; i++) hE[j][i] = tabEdge([X(i), Y(j)], [X(i + 1), Y(j)], u, R() < 0.5 ? 1 : -1, R, jit); }
    for (let i = 1; i < cols; i++) { vE[i] = []; for (let j = 0; j < rows; j++) vE[i][j] = tabEdge([X(i), Y(j)], [X(i), Y(j + 1)], u, R() < 0.5 ? 1 : -1, R, jit); }
    const cellPoly = (i, j) => {
      const p = [];
      const add = (pts) => { for (const q of pts) { const l = p[p.length - 1]; if (!l || Math.abs(l[0] - q[0]) > 1e-9 || Math.abs(l[1] - q[1]) > 1e-9) p.push(q); } };
      add(j > 0 ? hE[j][i] : [[X(i), Y(j)], [X(i + 1), Y(j)]]);
      add(i < cols - 1 ? vE[i + 1][j] : [[X(i + 1), Y(j)], [X(i + 1), Y(j + 1)]]);
      add(j < rows - 1 ? hE[j + 1][i].slice().reverse() : [[X(i + 1), Y(j + 1)], [X(i), Y(j + 1)]]);
      add(i > 0 ? vE[i][j].slice().reverse() : [[X(i), Y(j + 1)], [X(i), Y(j)]]);
      if (p.length > 1 && Math.abs(p[0][0] - p[p.length - 1][0]) < 1e-9 && Math.abs(p[0][1] - p[p.length - 1][1]) < 1e-9) p.pop();
      return T(new MF.CrossSection([p], 'NonZero'));
    };
    // skupiny = oblasti, z nichž vznikne jeden dílek (na začátku jedna buňka mřížky)
    let G = [];
    for (let j = 0; j < rows; j++) for (let i = 0; i < cols; i++) { const reg = cellPoly(i, j); if (T(reg.intersect(sil)).area() > 0.01) G.push({ reg, ci: i, cj: j }); }
    const cut = async (g, k, n) => {
      await tick(`Řežu dílek ${k} z ${n}…`);
      g.prism = ext(cl(T(g.reg.offset(-kerf / 2, 'Round'))), -1, zmax);
      g.p = T(M.intersect(g.prism)); g.vol = g.p.isEmpty() ? 0 : g.p.volume();
      g.isl = g.vol > 0 ? g.p.decompose().map(x => T(x)).sort((a, b) => b.volume() - a.volume()) : [];
    };
    for (let k = 0; k < G.length; k++) await cut(G[k], k + 1, G.length);
    G = G.filter(g => g.vol > 0.01);
    // soused, jehož materiál modelu na daný kus přes řez navazuje (ne jen leží vedle)
    const linked = (fp, self) => { const probe = ext(T(fp.offset(kerf + 0.6, 'Round')), -1, zmax), pb = probe.boundingBox(); let h = null, hv = 1e-3;
      for (const q of G) { if (q === self || q.dead || q.vol <= 0) continue; const qb = q.p.boundingBox(); if (qb.max[0] < pb.min[0] || pb.max[0] < qb.min[0] || qb.max[1] < pb.min[1] || pb.max[1] < qb.min[1]) continue; const v = T(q.p.intersect(probe)).volume(); if (v > hv) { hv = v; h = q; } }
      return h; };
    const best = (fp, self) => { let b = null, ba = 0.05; for (const h of G) { if (h === self || h.dead) continue; const a = T(fp.intersect(h.reg)).area(); if (a > ba) { ba = a; b = h; } } return b; };
    let moved = 0, merged = 0;
    for (let pass = 0; pass < 8; pass++) {
      const dirty = new Set();
      // 1) odtržené kousky: každý dílek si nechá největší kus (kotvu), ostatní kusy se přes navazující materiál
      //    (i přes další odtržené kusy) přidají k nejbližší kotvě, se kterou souvisejí
      const frags = [];
      for (const g of G) if (!g.dead) g.isl.forEach((I, i) => frags.push({ I, g, anchor: i === 0, bb: I.boundingBox(), fp: null }));
      const loose = frags.filter(f => !f.anchor);
      if (loose.length) {
        await tick('Spojuji odtržené kousky…');
        for (const f of frags) f.fp = T(f.I.project());
        const near = (a, b) => a.bb.max[0] + kerf + 1 >= b.bb.min[0] && b.bb.max[0] + kerf + 1 >= a.bb.min[0] && a.bb.max[1] + kerf + 1 >= b.bb.min[1] && b.bb.max[1] + kerf + 1 >= a.bb.min[1];
        const touch = (a, b) => near(a, b) && T(T(a.fp.offset(kerf + 0.4, 'Round')).intersect(b.fp)).area() > 0.01;
        // hledání od kotev do šířky přes odtržené kusy
        let front = frags.filter(f => f.anchor); front.forEach(f => { f.to = f.g; });
        while (front.length) {
          const next = [];
          for (const f of front) for (const q of loose) { if (q.to || q.g === f.to && false) continue; if (touch(f, q)) { q.to = f.to; next.push(q); } }
          front = next;
        }
        for (const q of loose) {
          if (!q.to || q.to === q.g) continue;
          const fr = cl(T(T(q.fp.offset(kerf / 2 + 0.25, 'Round')).intersect(q.g.reg)));
          q.to.reg = cl(T(MF.CrossSection.union([q.to.reg, fr]))); q.g.reg = cl(T(q.g.reg.subtract(fr))); dirty.add(q.g); dirty.add(q.to); moved++;
        }
      }
      // 2) příliš malé dílky sloučit se sousedem
      const vols = G.filter(g => !g.dead).map(g => g.vol).sort((a, b) => a - b), med = vols[Math.floor(vols.length / 2)] || 0;
      if (D.merge) for (const g of G) {
        if (g.dead || dirty.has(g) || g.vol >= med * 0.3) continue;
        const h = linked(T(g.p.project()), g) || best(T(g.reg.offset(1, 'Round')), g); if (!h) continue;
        h.reg = cl(T(MF.CrossSection.union([h.reg, g.reg]))); h.ci = Math.min(h.ci, g.ci); h.cj = Math.min(h.cj, g.cj); g.dead = true; dirty.add(h); merged++;
      }
      G = G.filter(g => !g.dead);
      if (!dirty.size) break;
      let k = 0; for (const g of dirty) { if (!g.dead) await cut(g, ++k, dirty.size); }
      G = G.filter(g => g.vol > 0.01);
    }
    // co zůstalo odtržené a je drobné (méně než 3 % průměrného dílku), se vynechá
    const avg = G.reduce((a, g) => a + g.vol, 0) / Math.max(1, G.length); let lost = 0;
    for (const g of G) { const keep = g.isl.filter((x, i) => i === 0 || x.volume() > avg * 0.03); lost += g.isl.length - keep.length; g.isl = keep; }
    return { groups: G, cols, rows, cw, ch, u, moved, merged, lost };
  }

  // dílky
  const pieces = [], spread = D.lay2 === 'spread' ? u * 0.32 + 4 : 0;
  let islands = 0;
  for (const g of groups) {
    if (g.isl.length > 1) islands += g.isl.length - 1;
    if (multi) { await tick('Barevné díly…'); pieces.push({ m: g.p, ci: g.ci, cj: g.cj, colors: CP.map(cp => ({ m: T(cp.m.intersect(g.prism)), color: cp.color })).filter(x => !x.m.isEmpty()) }); }
    else for (const part of g.isl) pieces.push({ m: part, ci: g.ci, cj: g.cj, colors: [{ m: part, color: CP[0].color }] });
  }
  // čísla dílků zespodu (zrcadlově, aby se daly číst při pohledu zespodu)
  let numbered = 0;
  if (D.nums) {
    const sz = clamp(Math.min(cw, ch) * 0.2, 3, 8);
    for (let k = 0; k < pieces.length; k++) { const pc = pieces[k]; await tick(`Číslo dílku ${k + 1} z ${pieces.length}…`);
      const bot = T(pc.m.slice(Math.min(0.2, Z * 0.3))); if (empty(bot)) continue;
      const inner = T(bot.offset(-0.8, 'Round')); if (empty(inner)) continue;
      const [cx, cy] = centroidXY(inner);
      for (const f of [1, 0.7, 0.5]) {
        let lb = labelCS(String(k + 1), sz * f); const b = lb.bounds();
        lb = T(lb.translate([cx - (b.min[0] + b.max[0]) / 2, cy - (b.min[1] + b.max[1]) / 2]));
        if (T(lb.intersect(inner)).area() >= lb.area() * 0.99 && Z > 1.2) { const c = ext(lb, -1, Math.min(0.4, Z * 0.3)); pc.m = sub(pc.m, c); pc.colors.forEach(x => { x.m = sub(x.m, c); }); numbered++; break; }
      }
    }
    if (numbered < pieces.length) msgs.push({ lvl: 'info', msg: `Číslo se nevešlo na ${pieces.length - numbered} ${pieces.length - numbered === 1 ? 'dílek' : 'dílků'} (malá nebo nerovná spodní plocha).` });
  }
  pieces.forEach(pc => { pc.off = [pc.ci * spread, pc.cj * spread, 0]; });
  // rámeček na skládání
  let tray = null;
  if (D.tray) {
    await tick('Rámeček…');
    const clr = 0.5, wall = 2.4, tb = 1.2, tw = clamp(D.tw, 1, 20), outer = T(sil.offset(clr + wall, 'Round')), inner = T(sil.offset(clr, 'Round'));
    tray = sub(ext(outer, 0, tb + tw), ext(inner, tb, tb + tw + 1));
  }
  if (moved) msgs.push({ lvl: 'info', msg: `${moved} ${moved === 1 ? 'odtržený kousek je připojený' : 'odtržených kousků je připojených'} k sousednímu dílku, se kterým souvisí.` });
  if (merged) msgs.push({ lvl: 'info', msg: `${merged} ${merged === 1 ? 'malý dílek je sloučený' : 'malých dílků je sloučených'} se sousedem.` });
  if (lost) msgs.push({ lvl: 'info', msg: `${lost} ${lost === 1 ? 'drobný úlomek na okraji modelu byl vynechán' : 'drobných úlomků na okraji modelu bylo vynecháno'}.` });
  if (islands) msgs.push({ lvl: 'warn', msg: `${islands} ${islands === 1 ? 'kousek modelu zůstal samostatný' : 'kousků modelu zůstalo samostatných'} (v modelu nejsou s ničím spojené). Vytisknou se jako zvláštní dílky.` });
  msgs.push({ lvl: 'info', msg: `${pieces.length} dílků, mřížka ${cols} × ${rows}, dílek asi ${fmtP(Math.round(cw))} × ${fmtP(Math.round(ch))} mm, řez ${fmtP(kerf)} mm.` });
  if (D.lay2 === 'asm' && kerf < 0.3) msgs.push({ lvl: 'warn', msg: 'Složené dílky s vůlí pod 0,3 mm se při tisku mohou slepit. Tiskněte je od sebe nebo vůli zvětšete.' });
  if (multi) msgs.push({ lvl: 'info', msg: `Model má ${CP.length} barevné díly, každý dílek puzzle si barvy nechá. Stáhne se jeden soubor pro každou barvu, ve sliceru je načtěte najednou jako jeden objekt s více díly.` });
  return { pieces, tray, cols, rows, W, H, Z, multi, cps: CP.map(c => c.color), name: D.src === 'file' && user ? user.name.replace(/\.(stl|obj|3mf)$/i, '') : `deska_${Math.round(W)}x${Math.round(H)}` };
}

/* ===== Ovládání ===== */
function syncUI() {
  document.querySelectorAll('[data-k]').forEach(el => { const v = D[el.dataset.k]; if (el.type === 'checkbox') el.checked = !!v; else el.value = v; });
  document.querySelectorAll('input[type=radio][name]').forEach(r => { r.checked = String(D[r.name]) === r.value; });
  updateUI();
}
function updateUI() {
  const show = { file: D.src === 'file', plate: D.src === 'plate', tray: !!D.tray };
  document.querySelectorAll('[data-show]').forEach(el => { el.hidden = !show[el.dataset.show]; });
  $('oTab').textContent = D.tab + ' %'; $('oJit').textContent = D.jit + ' %';
  $('srcHint').textContent = D.src === 'file' ? (user ? '' : 'Řeže se svisle přes celou tloušťku, hodí se ploché modely.') : 'Obyčejná deska, třeba pro dětské puzzle nebo na barevný tisk obrázku.';
}
function onChange(path) { if (path === 'pv') { saveState(); recolor(); return; } if (/^(src|pw|ph|lay|lay2|tray)$/.test(path)) fitNext = true; updateUI(); saveState(); schedule(); }
document.querySelectorAll('[data-k]').forEach(el => el.addEventListener(el.type === 'checkbox' || el.tagName === 'SELECT' ? 'change' : 'input', () => {
  const k = el.dataset.k; let v;
  if (el.type === 'checkbox') v = el.checked; else if (el.tagName === 'SELECT') v = el.value; else { v = parseFloat(el.value); if (!isFinite(v)) return; }
  D[k] = v; onChange(k);
}));
document.querySelectorAll('input[type=radio][name]').forEach(r => r.addEventListener('change', () => { D[r.name] = r.value; onChange(r.name); }));
$('btnSeed').onclick = () => { D.seed = 1 + Math.floor(Math.random() * 9998); syncUI(); onChange('seed'); };
const drop = $('drop'), fileIn = $('file');
drop.onclick = () => fileIn.click(); drop.onkeydown = (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); fileIn.click(); } };
fileIn.onchange = () => { loadUser(fileIn.files); fileIn.value = ''; };
['dragenter', 'dragover'].forEach(t => drop.addEventListener(t, (e) => { e.preventDefault(); drop.classList.add('over'); }));
['dragleave', 'drop'].forEach(t => drop.addEventListener(t, (e) => { e.preventDefault(); drop.classList.remove('over'); }));
window.addEventListener('dragover', (e) => e.preventDefault());
window.addEventListener('drop', (e) => { e.preventDefault(); const f = e.dataTransfer && e.dataTransfer.files; if (f && f.length) loadUser(f); });
let tmr = 0, running = null, pending = false;
// výpočet běží po kouscích; změna nastavení rozpracovaný výpočet přeruší a spustí nový
function schedule(now) { clearTimeout(tmr); tmr = setTimeout(() => { if (!MF) return; if (running) { running.cancel = true; pending = true; return; } start(); }, now ? 0 : 450); }
async function start() { const job = { cancel: false }; running = job; try { await rebuild(job); } finally { running = null; busy(false); if (pending) { pending = false; start(); } } }
function busy(on, txt) { $('busy').hidden = !on; if (txt) $('busy').textContent = txt; }

/* ===== 3D scéna ===== */
const cv = $('cv');
let renderer = null, scene, camera, bedGroup, group = null, fitNext = true, model = null;
const orbit = { theta: -Math.PI / 2, phi: 1.2, r: 300, target: new THREE.Vector3() };
function initGL() {
  try { renderer = new THREE.WebGLRenderer({ canvas: cv, antialias: true }); } catch (e) { renderer = null; return; }
  renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
  scene = new THREE.Scene(); camera = new THREE.PerspectiveCamera(30, 1, 0.5, 6000); camera.up.set(0, 0, 1);
  scene.add(new THREE.HemisphereLight(0xffffff, 0x6a7579, 0.85));
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
  orbit.target.set((b.min.x + b.max.x) / 2, (b.min.y + b.max.y) / 2, sz / 2); const span = Math.max(sx, sy, 20);
  orbit.r = span / (2 * Math.tan(THREE.MathUtils.degToRad(30) / 2)) * Math.max(1.15, 1.6 / camera.aspect);
  if (view === 'top') { orbit.theta = -Math.PI / 2; orbit.phi = 0.001; } else { orbit.theta = -Math.PI / 2 - 0.35; orbit.phi = 0.75; }
  draw();
}
$('vTop').onclick = () => fit('top'); $('vPersp').onclick = () => fit('persp');
const ptrs = new Map(); let pinch0 = 0, r0 = 0;
cv.addEventListener('contextmenu', e => e.preventDefault());
cv.addEventListener('pointerdown', e => { cv.setPointerCapture(e.pointerId); ptrs.set(e.pointerId, { x: e.clientX, y: e.clientY, b: e.button, shift: e.shiftKey }); if (ptrs.size === 2) { const [a, b] = [...ptrs.values()]; pinch0 = Math.hypot(a.x - b.x, a.y - b.y); r0 = orbit.r; } });
cv.addEventListener('pointermove', e => { const p = ptrs.get(e.pointerId); if (!p) return; const dx = e.clientX - p.x, dy = e.clientY - p.y; p.x = e.clientX; p.y = e.clientY;
  if (ptrs.size === 2) { const [a, b] = [...ptrs.values()]; const d = Math.hypot(a.x - b.x, a.y - b.y); if (pinch0) orbit.r = r0 * pinch0 / d; }
  else if (p.b === 2 || p.shift) { const k = orbit.r * 0.0016, right = new THREE.Vector3(), up = new THREE.Vector3(); camera.matrixWorld.extractBasis(right, up, new THREE.Vector3()); orbit.target.addScaledVector(right, -dx * k).addScaledVector(up, dy * k); }
  else { orbit.theta -= dx * 0.008; orbit.phi = Math.min(Math.PI - 0.05, Math.max(0.001, orbit.phi - dy * 0.008)); } draw(); });
const pup = e => { ptrs.delete(e.pointerId); if (ptrs.size < 2) pinch0 = 0; }; cv.addEventListener('pointerup', pup); cv.addEventListener('pointercancel', pup);
cv.addEventListener('wheel', e => { e.preventDefault(); orbit.r = Math.min(6000, Math.max(5, orbit.r * Math.exp(e.deltaY * 0.0012))); draw(); }, { passive: false });
function showMsgs(list) { const bx = $('msgs'); bx.textContent = ''; for (const m of list) { const d = document.createElement('div'); d.className = 'msg ' + m.lvl; d.textContent = m.msg; bx.append(d); } }

/* ===== Výpočet ===== */
async function rebuild(job) {
  const msgs = []; let r = null;
  try { r = await build(msgs, job); } catch (e) { if (e && e.message === 'cancel') { freeAll(); return; } console.error(e); msgs.push({ lvl: 'bad', msg: 'Model se nepodařilo rozřezat. Zkuste jiný počet dílků.' }); r = null; }
  if (group) { scene && scene.remove(group); group.traverse(o => { o.geometry && o.geometry.dispose(); o.material && o.material.dispose(); }); group = null; }
  if (!r || !r.pieces.length) { model = null; freeAll(); $('btnSave').disabled = true; showMsgs(msgs); $('stats').textContent = ''; $('dims').textContent = '–'; $('gridSpec').textContent = ''; draw(); return; }
  let vol = 0;
  const items = [];
  r.pieces.forEach(pc => { vol += pc.m.volume(); const pcol = PALETTE[(pc.ci + pc.cj * 3) % PALETTE.length];
    pc.colors.forEach(c => { const g = toGeom(c.m); g.translate(...pc.off); items.push({ g, col: pcol, mcol: c.color, ck: r.cps.indexOf(c.color) }); }); });
  let trayG = null; if (r.tray) { vol += r.tray.volume(); trayG = toGeom(r.tray); }
  freeAll();
  const bb = new THREE.Box3(); for (const it of items) { it.g.computeBoundingBox(); bb.union(it.g.boundingBox); }
  const cx = (bb.min.x + bb.max.x) / 2, cy = (bb.min.y + bb.max.y) / 2;
  for (const it of items) it.g.translate(-cx, -cy, 0); bb.translate(new THREE.Vector3(-cx, -cy, 0));
  if (trayG) { trayG.computeBoundingBox(); const tb = trayG.boundingBox; trayG.translate(bb.max.x + 10 - tb.min.x, -(tb.min.y + tb.max.y) / 2, 0); trayG.computeBoundingBox(); }
  const vb = bb.clone(); if (trayG) vb.union(trayG.boundingBox);
  model = { items, trayG, bbox: vb, name: r.name, multi: r.multi, cps: r.cps };
  group = new THREE.Group();
  for (const it of items) { it.g.computeVertexNormals(); const mesh = new THREE.Mesh(it.g, new THREE.MeshStandardMaterial({ roughness: 0.55, metalness: 0.03, flatShading: true })); mesh.userData.it = it; group.add(mesh); }
  recolor(); updateNote();
  if (trayG) { trayG.computeVertexNormals(); group.add(new THREE.Mesh(trayG, new THREE.MeshStandardMaterial({ color: new THREE.Color('#c9d1d4'), roughness: 0.6, flatShading: true }))); }
  if (renderer) scene.add(group);
  const sx = bb.max.x - bb.min.x, sy = bb.max.y - bb.min.y, sz = bb.max.z - bb.min.z;
  if (sx > D.bedX || sy > D.bedY) msgs.push({ lvl: 'warn', msg: `Dílky zabírají ${fmt(sx, 0)} × ${fmt(sy, 0)} mm a nevejdou se na tiskovou plochu najednou. Tiskněte je po částech, nebo je ve sliceru přeskládejte.` });
  showMsgs(msgs);
  $('gridSpec').innerHTML = `Mřížka <b>${r.cols} × ${r.rows}</b> · <b>${r.pieces.length}</b> dílků · model ${fmtP(Math.round(r.W))} × ${fmtP(Math.round(r.H))} × ${fmtP(Math.round(r.Z * 10) / 10)} mm`;
  const nf = (r.multi ? r.cps.length : 1) + (trayG ? 1 : 0);
  $('btnSave').disabled = false; $('btnSave').textContent = nf > 1 ? `Stáhnout STL (${nf} soubory)` : 'Stáhnout STL';
  $('dims').innerHTML = `<b>${fmt(sx)}</b> × <b>${fmt(sy)}</b> × <b>${fmt(sz)}</b> mm`;
  const grams = vol / 1000 * 1.24 * 0.9, hrs = grams / 9 + 0.15;
  const bx = $('stats'); bx.textContent = '';
  for (const [a, v] of [['Dílků', String(r.pieces.length)], ['Rozložení', `${fmt(sx, 0)} × ${fmt(sy, 0)} mm`], ['Materiál', `${fmt(Math.max(0.5, grams), grams < 10 ? 1 : 0)} g`], ['Tisk zhruba', hrs < 1 ? `${fmt(hrs * 60, 0)} min` : `${fmt(hrs, 1)} h`]]) {
    const d = document.createElement('div'); d.className = 'stat'; const s1 = document.createElement('span'); s1.textContent = a; const s2 = document.createElement('b'); s2.textContent = v; d.append(s1, s2); bx.append(d);
  }
  if (fitNext) { fit('persp'); fitNext = false; } else draw();
}

function recolor() { if (!group || !model) return; const byModel = model.multi && D.pv !== 'pieces'; group.children.forEach(m => { const it = m.userData.it; if (it) m.material.color = new THREE.Color(byModel ? it.mcol : it.col); }); $('pvRow').hidden = !model.multi; draw(); }

/* ===== Stažení ===== */
const inViewer = !!(window.claude && typeof window.claude.use === 'function');
let dlCap = null;
if (inViewer) window.claude.use('downloads').then(d => { dlCap = d; updateNote(); }).catch(() => updateNote());
function updateNote() { $('saveNote').textContent = inViewer ? (dlCap ? 'Tady se soubory stáhnou zabalené v ZIP.' : 'Stahování je v tomto zobrazení nedostupné.') : (model && model.multi ? 'Soubor pro každou barvu, všechny se stejným umístěním. Ve sliceru je načtěte najednou jako jeden objekt.' : 'Všechny dílky v jednom souboru, rozložené k tisku. Jednotky jsou milimetry.'); }
$('btnSave').onclick = async () => {
  if (!model) return;
  const enc = (geoms) => { const u = stlBinary(geoms), head = 'Created by Julius Andy Antos | Puzzle z modelu | mm'; for (let i = 0; i < 80; i++) u[i] = i < head.length ? head.charCodeAt(i) : 32; return u; };
  const base = ('puzzle_' + model.name).normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^A-Za-z0-9_-]+/g, '_');
  const files = model.multi
    ? model.cps.map((c, k) => ({ name: `${base}_barva${k + 1}_${String(c).replace('#', '')}.stl`, data: enc(model.items.filter(it => it.ck === k).map(it => it.g)) })).filter(f => f.data.length > 84)
    : [{ name: base + '.stl', data: enc(model.items.map(it => it.g)) }];
  if (model.trayG) { const g = model.trayG.clone(); g.computeBoundingBox(); const b = g.boundingBox; g.translate(-(b.min.x + b.max.x) / 2, -(b.min.y + b.max.y) / 2, 0); files.push({ name: base + '_ramecek.stl', data: enc([g]) }); }
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
  const KEY = 'puzzle-sbaleno';
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
if (D.src === 'file' && !user) D.src = 'plate';
initGL(); syncUI(); updateNote();
initMF().then(() => { busy(false); schedule(true); }).catch((e) => { console.error(e); busy(false); showMsgs([{ lvl: 'bad', msg: 'Výpočetní modul se nepodařilo načíst. Zkuste novější prohlížeč.' }]); });

/* ===== Dual Text Studio — aplikace. Created by Julius Andy Antoš ===== */
const $ = (id) => document.getElementById(id);
const DEF = {
  wA: 'MAMA', wB: 'TATA', wC: 'LOVE', three: false, upper: true, noDia: true,
  font: 'anton', H: 30, gap: 1.5, dz: 0.1,
  base: { on: true, shape: 'band', t: 3, m: 3, text: '', textH: 6 },
  split: false, bedX: 220, bedY: 220, bedZ: 250,
};
const STORE = 'dual-text-studio-v1';
const deepMerge = (a, b) => { for (const k in b) { if (b[k] && typeof b[k] === 'object' && !Array.isArray(b[k]) && a[k] && typeof a[k] === 'object') deepMerge(a[k], b[k]); else if (k in a) a[k] = b[k]; } return a; };
const D = JSON.parse(JSON.stringify(DEF));
try { deepMerge(D, JSON.parse(localStorage.getItem(STORE) || '{}')); } catch (e) {}
const saveState = () => { try { localStorage.setItem(STORE, JSON.stringify(D)); } catch (e) {} };
const getK = (p) => p.split('.').reduce((o, k) => o[k], D);
const setK = (p, v) => { const ks = p.split('.'); let o = D; for (let i = 0; i < ks.length - 1; i++) o = o[ks[i]]; o[ks[ks.length - 1]] = v; };
const fmt = (v, d = 1) => v.toLocaleString('cs-CZ', { maximumFractionDigits: d, minimumFractionDigits: d });
const plural = (n, one, few, many) => `${n.toLocaleString('cs-CZ')} ${n === 1 ? one : n >= 2 && n <= 4 ? few : many}`;
const css = (v) => getComputedStyle(document.documentElement).getPropertyValue(v).trim();
const isNum = (s) => /^-?\d+(\.\d+)?$/.test(s);
const COL = { letters: '#0b7a72', base: '#c9d1d4' };

/* ===== Písma ===== */
const FONT_LIST = [['anton', 'Anton (úzké tučné)'], ['bebas', 'Bebas Neue (úzké)'], ['bungee', 'Bungee (hranaté)'], ['baloo', 'Baloo (kulaté)'], ['poppins', 'Poppins Bold'], ['liberation', 'Liberation Sans Bold']];
const FONT_CACHE = {};
function getFont(id) {
  if (!FONT_CACHE[id]) { const b64 = DUAL_FONTS[id] || DUAL_FONTS.anton, s = atob(b64), u = new Uint8Array(s.length); for (let i = 0; i < s.length; i++) u[i] = s.charCodeAt(i); FONT_CACHE[id] = opentype.parse(u.buffer); }
  return FONT_CACHE[id];
}
(function () { const sel = $('fontSel'); for (const [id, name] of FONT_LIST) { const o = document.createElement('option'); o.value = id; o.textContent = name; sel.append(o); } })();
const prep = (s) => { s = (s || '').trim(); if (D.noDia) s = s.normalize('NFD').replace(/[̀-ͯ]/g, ''); if (D.upper) s = s.toLocaleUpperCase('cs-CZ'); return [...s.normalize('NFC')]; };

/** Obrys jednoho písmena: výška H mm, levý dolní roh v 0,0 (Clipper jednotky). */
const glyphCache = new Map();
function glyph(fontId, ch, H) {
  const key = fontId + '|' + ch + '|' + H; if (glyphCache.has(key)) return glyphCache.get(key);
  const L = layoutText(getFont(fontId), ch, { size: 100, spacing: 0, lineH: 1, align: 'left', mirror: false });
  let g = null;
  if (L.paths.length && !L.missing.length) {
    const ex = unionEx(L.paths), bb = boundsEx(ex);
    if (bb.y1 > bb.y0) { const s = H / (bb.y1 - bb.y0); const ex2 = mapEx(ex, (x, y) => [(x - bb.x0) * s, (y - bb.y0) * s]);
      g = { ex: ex2, loops: exToPaths(ex2), w: (bb.x1 - bb.x0) * s, area: areaEx(ex2) }; }
  }
  glyphCache.set(key, g); return g;
}
/** Úseky, kde vodorovná přímka ve výšce z (Clipper jednotky) protíná písmeno: [a0,b0,a1,b1,…], posunuté o off. */
function rowIv(g, z, off) {
  const xs = [];
  for (const L of g.loops) for (let i = 0, n = L.length; i < n; i++) { const p = L[i], q = L[(i + 1) % n];
    if ((p.Y <= z && q.Y > z) || (q.Y <= z && p.Y > z)) xs.push(Math.round(p.X + (z - p.Y) * (q.X - p.X) / (q.Y - p.Y))); }
  xs.sort((a, b) => a - b); const out = [];
  for (let i = 0; i + 1 < xs.length; i += 2) if (xs[i + 1] > xs[i]) { if (out.length && out[out.length - 1] >= xs[i] + off) out[out.length - 1] = Math.max(out[out.length - 1], xs[i + 1] + off); else out.push(xs[i] + off, xs[i + 1] + off); }
  return out;
}
const inIv = (iv, v) => { for (let i = 0; i < iv.length; i += 2) if (v > iv[i] && v < iv[i + 1]) return true; return false; };
const uniq = (arr) => { arr.sort((a, b) => a - b); const o = []; for (const v of arr) if (!o.length || o[o.length - 1] !== v) o.push(v); return o; };
function lowerBound(a, v) { let lo = 0, hi = a.length; while (lo < hi) { const m = (lo + hi) >> 1; if (a[m] < v) lo = m + 1; else hi = m; } return lo; }
const sliceRange = (a, s, e) => a.slice(lowerBound(a, s), lowerBound(a, e + 1));

/* Rastr třetího písmena (pohled shora) */
function rasterC(g, x0, y0, wA, wB, cp) { // písmeno shora roztažené na celý půdorys bloku, ať zbytečně neubírá
  const H = boundsEx(g.ex).y1, kx = wA / g.w, ky = wB / H, nx = Math.ceil(wA / cp), ny = Math.ceil(wB / cp), bits = new Uint8Array(nx * ny);
  for (let j = 0; j < ny; j++) { const iv = rowIv(g, ((j + 0.5) * cp) / ky * SC, 0);
    for (let i = 0; i < nx; i++) if (inIv(iv, ((i + 0.5) * cp) / kx * SC)) bits[j * nx + i] = 1; }
  const X0 = Math.round(x0 * SC), Y0 = Math.round(y0 * SC), CP = Math.round(cp * SC);
  return { X0, Y0, CP, nx, ny, bits, at: (x, y) => { const i = Math.floor((x - X0) / CP), j = Math.floor((y - Y0) / CP); return i >= 0 && j >= 0 && i < nx && j < ny && bits[j * nx + i] === 1; },
    xs: Array.from({ length: nx + 1 }, (_, i) => X0 + i * CP), ys: Array.from({ length: ny + 1 }, (_, j) => Y0 + j * CP) };
}

/* ===== Jedno písmeno-blok: průnik hranolů po tenkých vrstvách, výsledek je jedno uzavřené těleso ===== */
function buildBlock(b, H, dz, z0) {
  const L = Math.max(1, Math.round(H / dz)), dzs = H / L, layers = [];
  for (let k = 0; k < L; k++) {
    const zz = (k + 0.5) * dzs * SC, ax = rowIv(b.A, zz, b.X0), by = rowIv(b.B, zz, b.Y0);
    let X = ax.slice(), Y = by.slice();
    if (b.C && ax.length && by.length) { X = X.concat(b.C.xs.filter(v => v > ax[0] && v < ax[ax.length - 1])); Y = Y.concat(b.C.ys.filter(v => v > by[0] && v < by[by.length - 1])); }
    X = uniq(X); Y = uniq(Y);
    const empty = !ax.length || !by.length;
    layers.push({ ax, by, X: empty ? [] : X, Y: empty ? [] : Y, empty });
  }
  const C = b.C;
  const inL = (k, x, y) => { if (k < 0 || k >= L) return false; const l = layers[k]; if (l.empty) return false; return inIv(l.ax, x) && inIv(l.by, y) && (!C || C.at(x, y)); };
  const planes = []; for (let p = 0; p <= L; p++) { const lo = layers[p - 1], hi = layers[p]; planes.push({ UX: uniq([].concat(lo ? lo.X : [], hi ? hi.X : [])), UY: uniq([].concat(lo ? lo.Y : [], hi ? hi.Y : [])) }); }
  let pos = new Float32Array(1 << 16), n = 0;
  const push = (v) => { if (n + 9 > pos.length) { const p2 = new Float32Array(pos.length * 2); p2.set(pos); pos = p2; } for (let i = 0; i < 9; i++) pos[n++] = v[i]; };
  const tri = (a, b2, c, nx, ny, nz) => { // trojúhelník s požadovaným směrem normály
    const ux = b2[0] - a[0], uy = b2[1] - a[1], uz = b2[2] - a[2], vx = c[0] - a[0], vy = c[1] - a[1], vz = c[2] - a[2];
    const d = (uy * vz - uz * vy) * nx + (uz * vx - ux * vz) * ny + (ux * vy - uy * vx) * nz;
    if (d >= 0) push([a[0], a[1], a[2], b2[0], b2[1], b2[2], c[0], c[1], c[2]]); else push([a[0], a[1], a[2], c[0], c[1], c[2], b2[0], b2[1], b2[2]]);
  };
  const zOf = (p) => z0 + p * dzs;
  // vodorovné plochy (schody mezi vrstvami, dno a vršek)
  let overhang = 0;
  for (let p = 0; p <= L; p++) {
    const { UX, UY } = planes[p], z = zOf(p);
    for (let a = 0; a + 1 < UX.length; a++) { const mx = (UX[a] + UX[a + 1]) / 2;
      for (let c = 0; c + 1 < UY.length; c++) { const my = (UY[c] + UY[c + 1]) / 2, lo = inL(p - 1, mx, my), hi = inL(p, mx, my); if (lo === hi) continue;
        const x0 = UX[a] / SC, x1 = UX[a + 1] / SC, y0 = UY[c] / SC, y1 = UY[c + 1] / SC, nz = lo ? 1 : -1;
        tri([x0, y0, z], [x1, y0, z], [x1, y1, z], 0, 0, nz); tri([x0, y0, z], [x1, y1, z], [x0, y1, z], 0, 0, nz);
        if (!lo && p > 0 && Math.min(x1 - x0, y1 - y0) > 0.8) overhang += (x1 - x0) * (y1 - y0);
      } }
  }
  // svislé stěny každé vrstvy, sešité s body sousedních rovin (bez T-spojů)
  const zip = (bot, top, P, nx, ny) => { // bot/top: souřadnice podél stěny; P(t, z) -> bod
    let i = 0, j = 0; const zb = bot.z, zt = top.z, B = bot.v, T = top.v;
    while (i < B.length - 1 || j < T.length - 1) {
      if (j >= T.length - 1 || (i < B.length - 1 && B[i + 1] <= T[j + 1])) { tri(P(B[i], zb), P(B[i + 1], zb), P(T[j], zt), nx, ny, 0); i++; }
      else { tri(P(B[i], zb), P(T[j + 1], zt), P(T[j], zt), nx, ny, 0); j++; }
    }
  };
  const silF = [], silS = [];
  for (let k = 0; k < L; k++) {
    const l = layers[k]; silF.push([]); silS.push([]); if (l.empty) continue;
    const X = l.X, Y = l.Y, nxc = X.length - 1, nyc = Y.length - 1;
    const colIn = new Uint8Array(nxc), rowIn = new Uint8Array(nyc);
    for (let a = 0; a < nxc; a++) colIn[a] = inIv(l.ax, (X[a] + X[a + 1]) / 2) ? 1 : 0;
    for (let c = 0; c < nyc; c++) rowIn[c] = inIv(l.by, (Y[c] + Y[c + 1]) / 2) ? 1 : 0;
    const cell = (a, c) => !!(a >= 0 && c >= 0 && a < nxc && c < nyc && colIn[a] && rowIn[c] && (!C || C.at((X[a] + X[a + 1]) / 2, (Y[c] + Y[c + 1]) / 2)));
    const zb = zOf(k), zt = zOf(k + 1), pb = planes[k], pt = planes[k + 1];
    // silueta zepředu (sloupce s materiálem) a z boku (řádky)
    for (let a = 0; a < nxc; a++) { let any = false; for (let c = 0; c < nyc && !any; c++) any = cell(a, c); if (any) silF[k].push(X[a], X[a + 1]); }
    for (let c = 0; c < nyc; c++) { let any = false; for (let a = 0; a < nxc && !any; a++) any = cell(a, c); if (any) silS[k].push(Y[c], Y[c + 1]); }
    // stěny kolmé na X
    for (let a = 0; a <= nxc; a++) { let c = 0;
      while (c < nyc) { const L1 = cell(a - 1, c), R1 = cell(a, c); if (L1 === R1) { c++; continue; }
        let e = c + 1; while (e < nyc && cell(a - 1, e) === L1 && cell(a, e) === R1) e++;
        const s = Y[c], t = Y[e], xx = X[a] / SC, nx = L1 ? 1 : -1;
        zip({ z: zb, v: sliceRange(pb.UY, s, t) }, { z: zt, v: sliceRange(pt.UY, s, t) }, (v, z) => [xx, v / SC, z], nx, 0); c = e; } }
    // stěny kolmé na Y
    for (let c = 0; c <= nyc; c++) { let a = 0;
      while (a < nxc) { const D1 = cell(a, c - 1), U1 = cell(a, c); if (D1 === U1) { a++; continue; }
        let e = a + 1; while (e < nxc && cell(e, c - 1) === D1 && cell(e, c) === U1) e++;
        const s = X[a], t = X[e], yy = Y[c] / SC, ny = D1 ? 1 : -1;
        zip({ z: zb, v: sliceRange(pb.UX, s, t) }, { z: zt, v: sliceRange(pt.UX, s, t) }, (v, z) => [v / SC, yy, z], 0, ny); a = e; } }
  }
  // kontrola: odtržené kousky (mezera mezi vrstvami s materiálem)
  let seen = false, gap = false, floating = false; for (let k = 0; k < L; k++) { const has = silF[k].length > 0; if (has && gap) floating = true; if (has) seen = true; else if (seen) gap = true; }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos.slice(0, n), 3));
  return { g, silF, silS, dzs, L, overhang, floating };
}

/* ===== Ovládání ===== */
function syncUI() {
  document.querySelectorAll('[data-k]').forEach(el => { const v = getK(el.dataset.k); if (el.type === 'checkbox') el.checked = !!v; else el.value = v; });
  document.querySelectorAll('input[type=radio][name*="."]').forEach(r => { r.checked = String(getK(r.name)) === r.value; });
  updateUI();
}
function updateUI() {
  const show = { three: D.three, base: D.base.on, noBase: !D.base.on, baseText: !!D.base.text.trim() };
  document.querySelectorAll('[data-show]').forEach(el => { el.hidden = !show[el.dataset.show]; });
  const a = prep(D.wA).length, b = prep(D.wB).length;
  $('lenA').textContent = plural(a, 'písmeno', 'písmena', 'písmen'); $('lenB').textContent = plural(b, 'písmeno', 'písmena', 'písmen');
  $('figTop').hidden = !D.three;
}
let anchor = null; // ovládací prvek, na který uživatel naposledy klepl: po přepočtu zůstane na stejném místě
function keepInPlace(el, fn) {
  if (window.innerWidth > 860) return fn();
  const t0 = el.getBoundingClientRect().top; fn();
  const t1 = el.getBoundingClientRect().top; if (Math.abs(t1 - t0) > 2) window.scrollBy(0, t1 - t0);
  anchor = { el, top: t0, t: Date.now() };
}
function holdAnchor() {
  if (!anchor || window.innerWidth > 860 || Date.now() - anchor.t > 4000 || !anchor.el.isConnected) return;
  const t = anchor.el.getBoundingClientRect().top; if (Math.abs(t - anchor.top) > 2) window.scrollBy(0, t - anchor.top);
}
function onChange(path) { if (/^(wA|wB|wC|three|H|base\.on|base\.shape)$/.test(path)) fitNext = true; updateUI(); saveState(); schedule(); }
document.querySelectorAll('[data-k]').forEach(el => {
  const ev = (el.type === 'checkbox' || el.tagName === 'SELECT') ? 'change' : 'input';
  el.addEventListener(ev, () => {
    let v = el.type === 'checkbox' ? el.checked : el.value;
    if (el.type === 'number' || el.type === 'range') { v = parseFloat(v); if (!isFinite(v)) return; }
    else if (el.tagName === 'SELECT' && isNum(v)) v = parseFloat(v);
    setK(el.dataset.k, v);
    if (el.type === 'checkbox') keepInPlace(el, () => onChange(el.dataset.k)); else { anchor = { el, top: el.getBoundingClientRect().top, t: Date.now() }; onChange(el.dataset.k); }
  });
});
document.querySelectorAll('input[type=radio][name*="."]').forEach(r => r.addEventListener('change', () => keepInPlace(r.closest('label') || r, () => { setK(r.name, r.value); onChange(r.name); })));
let tmr = 0;
function schedule(now) { clearTimeout(tmr); tmr = setTimeout(() => { $('busy').hidden = false; setTimeout(() => { try { rebuild(); } finally { $('busy').hidden = true; } }, 20); }, now ? 0 : 350); }

/* ===== 3D scéna ===== */
const cv = $('cv');
let renderer = null, scene, camera, bedGroup, meshes = [], fitNext = true, model = null;
const orbit = { theta: -Math.PI / 2, phi: 1.2, r: 300, target: new THREE.Vector3() };
function initGL() {
  try { renderer = new THREE.WebGLRenderer({ canvas: cv, antialias: true }); } catch (e) { renderer = null; return; }
  renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
  scene = new THREE.Scene(); camera = new THREE.PerspectiveCamera(30, 1, 0.5, 6000); camera.up.set(0, 0, 1);
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
  if (!model || !renderer) return; const s = model.size; orbit.target.set(0, 0, s.z / 2);
  const span = Math.max(s.x, s.y, s.z, 20);
  orbit.r = span / (2 * Math.tan(THREE.MathUtils.degToRad(30) / 2)) * Math.max(1.15, 1.6 / camera.aspect);
  if (view === 'front') { orbit.theta = -Math.PI / 2; orbit.phi = Math.PI / 2 - 0.06; }
  else if (view === 'side') { orbit.theta = 0; orbit.phi = Math.PI / 2 - 0.06; }
  else if (view === 'top') { orbit.theta = -Math.PI / 2; orbit.phi = 0.001; }
  else { orbit.theta = -Math.PI / 4 - 0.15; orbit.phi = 1.05; }
  draw();
}
$('vFront').onclick = () => fit('front'); $('vSide').onclick = () => fit('side'); $('vTop').onclick = () => fit('top'); $('vPersp').onclick = () => fit('persp');
const ptrs = new Map(); let pinch0 = 0, r0 = 0;
cv.addEventListener('contextmenu', e => e.preventDefault());
cv.addEventListener('pointerdown', e => { cv.setPointerCapture(e.pointerId); ptrs.set(e.pointerId, { x: e.clientX, y: e.clientY, b: e.button, shift: e.shiftKey }); if (ptrs.size === 2) { const [a, b] = [...ptrs.values()]; pinch0 = Math.hypot(a.x - b.x, a.y - b.y); r0 = orbit.r; } });
cv.addEventListener('pointermove', e => { const p = ptrs.get(e.pointerId); if (!p) return; const dx = e.clientX - p.x, dy = e.clientY - p.y; p.x = e.clientX; p.y = e.clientY;
  if (ptrs.size === 2) { const [a, b] = [...ptrs.values()]; const d = Math.hypot(a.x - b.x, a.y - b.y); if (pinch0) orbit.r = r0 * pinch0 / d; }
  else if (p.b === 2 || p.shift) { const k = orbit.r * 0.0016, right = new THREE.Vector3(), up = new THREE.Vector3(); camera.matrixWorld.extractBasis(right, up, new THREE.Vector3()); orbit.target.addScaledVector(right, -dx * k).addScaledVector(up, dy * k); }
  else { orbit.theta -= dx * 0.008; orbit.phi = Math.min(Math.PI - 0.05, Math.max(0.001, orbit.phi - dy * 0.008)); } draw(); });
const pup = e => { ptrs.delete(e.pointerId); if (ptrs.size < 2) pinch0 = 0; }; cv.addEventListener('pointerup', pup); cv.addEventListener('pointercancel', pup);
cv.addEventListener('wheel', e => { e.preventDefault(); orbit.r = Math.min(5000, Math.max(5, orbit.r * Math.exp(e.deltaY * 0.0012))); draw(); }, { passive: false });

function setModel(m) {
  for (const mm of meshes) { scene && scene.remove(mm); mm.geometry.dispose(); mm.material.dispose(); }
  meshes = []; model = m; $('btnSave').disabled = !m;
  if (!m) { $('dims').textContent = '–'; $('stats').textContent = ''; $('views').hidden = true; draw(); return; }
  $('dims').innerHTML = `<b>${fmt(m.size.x)}</b> × <b>${fmt(m.size.y)}</b> × <b>${fmt(m.size.z)}</b> mm`;
  if (renderer) for (const [list, col, rough] of [[m.letters, COL.letters, 0.55], [m.base, COL.base, 0.75]])
    for (const g of list) { const mesh = new THREE.Mesh(g, new THREE.MeshStandardMaterial({ color: new THREE.Color(col), roughness: rough, metalness: 0.03 })); scene.add(mesh); meshes.push(mesh); }
  if (fitNext) { fit('persp'); fitNext = false; } else draw();
}
function showMsgs(list) { const box = $('msgs'); box.textContent = ''; for (const m of list) { const d = document.createElement('div'); d.className = 'msg ' + m.lvl; d.textContent = m.msg; box.append(d); } }

/* ===== Výpočet ===== */
function rebuild() {
  const msgs = [];
  try { build(msgs); } catch (e) { msgs.push({ lvl: 'bad', msg: 'Model se nepodařilo sestavit: ' + e.message }); setModel(null); }
  showMsgs(msgs); holdAnchor();
}
function build(msgs) {
  const A = prep(D.wA), B = prep(D.wB), Cw = D.three ? prep(D.wC) : null;
  if (!A.length || !B.length) { msgs.push({ lvl: 'bad', msg: 'Napište obě slova.' }); setModel(null); return; }
  if (A.length !== B.length || (Cw && Cw.length !== A.length)) {
    msgs.push({ lvl: 'bad', msg: `Slova musí mít stejný počet písmen: ${A.join('')} má ${A.length}, ${B.join('')} má ${B.length}${Cw ? `, ${Cw.join('')} má ${Cw.length}` : ''}. Upravte je, třeba přidáním vykřičníku nebo zkrácením.` });
    setModel(null); return; }
  const H = Math.max(5, D.H), gap = Math.max(0, D.gap), fontId = D.font, dz = D.three ? Math.max(0.2, D.dz) : D.dz;
  const blocks = []; let xo = 0, yo = 0; const missing = new Set();
  for (let i = 0; i < A.length; i++) {
    const sa = /\s/.test(A[i]), sb = /\s/.test(B[i]), sc = Cw ? /\s/.test(Cw[i]) : sa;
    if (sa || sb || sc) {
      if (!(sa && sb && sc)) { msgs.push({ lvl: 'bad', msg: `Na ${i + 1}. místě je v jednom slově mezera a v druhém písmeno. Mezery musí být ve všech slovech na stejném místě.` }); setModel(null); return; }
      xo += H * 0.35; yo += H * 0.35; continue;
    }
    const ga = glyph(fontId, A[i], H), gb = glyph(fontId, B[i], H), gc = Cw ? glyph(fontId, Cw[i], H) : null;
    if (!ga) missing.add(A[i]); if (!gb) missing.add(B[i]); if (Cw && !gc) missing.add(Cw[i]);
    if (!ga || !gb || (Cw && !gc)) continue;
    const blk = { A: ga, B: gb, X0: Math.round(xo * SC), Y0: Math.round(yo * SC), x0: xo, y0: yo, wA: ga.w, wB: gb.w, chA: A[i], chB: B[i], chC: Cw && Cw[i] };
    if (gc) blk.C = rasterC(gc, xo, yo, ga.w, gb.w, 0.35);
    blocks.push(blk); xo += ga.w + gap; yo += gb.w + gap;
  }
  if (missing.size) msgs.push({ lvl: 'warn', msg: `Písmo nemá znaky: ${[...missing].join(' ')}. Vynechal jsem je, zkuste jiné písmo.` });
  if (!blocks.length) { setModel(null); if (!missing.size) msgs.push({ lvl: 'bad', msg: 'Ze slov nevzniklo žádné písmeno.' }); return; }

  const baseOn = D.base.on, bt = Math.max(1, D.base.t), z0 = baseOn ? bt - 0.2 : 0;
  const letters = [], base = [], probs = { loss: [], floating: [], overhang: [] };
  for (const b of blocks) {
    const r = buildBlock(b, H, dz, z0); letters.push(r.g); b.res = r;
    let sf = 0, ss = 0; for (let k = 0; k < r.L; k++) { const f = r.silF[k], s = r.silS[k]; for (let i = 0; i < f.length; i += 2) sf += (f[i + 1] - f[i]) / SC * r.dzs; for (let i = 0; i < s.length; i += 2) ss += (s[i + 1] - s[i]) / SC * r.dzs; }
    const lA = 1 - sf / b.A.area, lB = 1 - ss / b.B.area;
    if (lA > 0.06) probs.loss.push(`${b.chA} zepředu (−${fmt(lA * 100, 0)} %)`); if (lB > 0.06) probs.loss.push(`${b.chB} z boku (−${fmt(lB * 100, 0)} %)`);
    if (r.floating) probs.floating.push(`${b.chA}/${b.chB}`);
    if (r.overhang > 4) probs.overhang.push(`${b.chA}/${b.chB}`);
  }
  // podstavec
  let plateEx = null, textGeom = null;
  if (baseOn) {
    const m = Math.max(1, D.base.m), rects = blocks.map(b => rectPath(b.x0 - m, b.y0 - m, b.x0 + b.wA + m, b.y0 + b.wB + m));
    let ex = unionEx(rects);
    const bb = boundsEx(ex);
    if (D.base.shape === 'rect') ex = [{ outer: rectPath(bb.x0, bb.y0, bb.x1, bb.y1), holes: [] }];
    const txt = D.base.text.trim(); let tex = null;
    if (txt) {
      const L = layoutText(getFont(fontId), txt, { size: D.base.textH, spacing: 0, lineH: 1.2, align: 'center', mirror: false });
      if (L.paths.length) { tex = unionEx(L.paths); let tb = boundsEx(tex); const maxW = (bb.x1 - bb.x0) - 2 * m;
        if (tb.x1 - tb.x0 > maxW) { const k = maxW / (tb.x1 - tb.x0); tex = mapEx(tex, (x, y) => [x * k, y * k]); tb = boundsEx(tex); msgs.push({ lvl: 'info', msg: `Text na podstavci jsem zmenšil na ${fmt(D.base.textH * k)} mm, aby se vešel.` }); }
        const stripH = (tb.y1 - tb.y0) + 2 * m, sy1 = bb.y0 + 0.01, sy0 = sy1 - stripH;
        ex = unionEx(exToPaths(ex).concat([rectPath(bb.x0, sy0, bb.x1, sy1 + m)]));
        tex = mapEx(tex, (x, y) => [x + (bb.x0 + bb.x1) / 2 - (tb.x0 + tb.x1) / 2, y + (sy0 + sy1) / 2 - (tb.y0 + tb.y1) / 2]);
        if (L.missing.length) msgs.push({ lvl: 'warn', msg: `Písmo nemá pro text na podstavci znaky: ${L.missing.join(' ')}.` }); }
    }
    ex = offsetEx(offsetEx(ex, 4), -4); // vyplnit schody mezi písmeny
    ex = offsetEx(offsetEx(ex, -2.5), 2.5); // zaoblit rohy
    plateEx = ex; base.push(prismSolid(ex, 0, bt));
    if (tex) { textGeom = prismSolid(tex, bt - 0.2, bt + 0.8); letters.push(textGeom); }
  }
  const all = letters.concat(base), size = centerGeoms(all);
  const m = { letters, base, size, blocks, H, name: A.join('') + '_' + B.join('') + (Cw ? '_' + Cw.join('') : '') };
  setModel(m); drawViews(blocks, !!Cw);

  if (size.z > D.bedZ) msgs.push({ lvl: 'bad', msg: `Nápis je vysoký ${fmt(size.z)} mm, tiskárna zvládne jen ${D.bedZ} mm.` });
  if (!((size.x <= D.bedX && size.y <= D.bedY) || (size.y <= D.bedX && size.x <= D.bedY))) msgs.push({ lvl: 'bad', msg: `Nápis (${fmt(size.x)} × ${fmt(size.y)} mm) se nevejde na tiskovou plochu ${D.bedX} × ${D.bedY} mm. Zmenšete výšku písmen.` });
  if (probs.floating.length) msgs.push({ lvl: 'warn', msg: `U dvojice ${probs.floating.join(', ')} vznikne kousek, který visí ve vzduchu (typicky tečka, háček nebo čárka). Po tisku odpadne, zvolte jiná písmena.` });
  if (probs.loss.length) msgs.push({ lvl: Cw ? 'info' : 'warn', msg: Cw ? `Se třetím slovem budou písmena zepředu a z boku oříznutá: ${probs.loss.join(', ')}. To k trojitému nápisu patří; čitelnost zlepší tučnější písmo.` : `Některá písmena budou oříznutá, protože druhé písmeno v té výšce nemá materiál: ${probs.loss.join(', ')}. Zkuste jiné písmo nebo jiné dvojice písmen.` });
  if (probs.overhang.length) msgs.push({ lvl: 'info', msg: `Dvojice ${probs.overhang.join(', ')} mají převisy (například horní příčka T nebo F). Ve sliceru zapněte podpěry, nejlépe stromové.` });
  if (!baseOn && blocks.length > 1) msgs.push({ lvl: 'info', msg: 'Bez podstavce bude každé písmeno samostatný kousek. Pro jeden kus zapněte podstavec.' });
  if (!msgs.some(x => x.lvl === 'bad' || x.lvl === 'warn')) msgs.unshift({ lvl: 'ok', msg: 'Nápis je připravený. Tlačítky Zepředu a Z boku si ho prohlédněte z obou stran.' });
  m.colorZ = bt; showStats(m);
}
function drawViews(blocks, three) {
  const s = 4; // pixelů na mm
  const draw2 = (canvas, kind) => {
    let x0 = Infinity, x1 = -Infinity; const H = model.H;
    for (const b of blocks) { const a = kind === 'f' ? b.x0 : b.y0, w = kind === 'f' ? b.wA : b.wB; x0 = Math.min(x0, a); x1 = Math.max(x1, a + w); }
    const W = x1 - x0, k = Math.min(s, 520 / W); canvas.width = Math.ceil(W * k) + 8; canvas.height = Math.ceil(H * k) + 8; const x = canvas.getContext('2d');
    x.fillStyle = '#fff'; x.fillRect(0, 0, canvas.width, canvas.height); x.fillStyle = COL.letters;
    for (const b of blocks) { const r = b.res; for (let l = 0; l < r.L; l++) { const iv = kind === 'f' ? r.silF[l] : r.silS[l], zz = canvas.height - 4 - (l + 1) * r.dzs * k;
      for (let i = 0; i < iv.length; i += 2) x.fillRect(4 + (iv[i] / SC - x0) * k, zz, (iv[i + 1] - iv[i]) / SC * k, r.dzs * k + 0.6); } }
  };
  draw2($('svFront'), 'f'); draw2($('svSide'), 's');
  if (three) {
    const c = $('svTop'); let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity;
    for (const b of blocks) { x0 = Math.min(x0, b.x0); x1 = Math.max(x1, b.x0 + b.wA); y0 = Math.min(y0, b.y0); y1 = Math.max(y1, b.y0 + b.wB); }
    const k = Math.min(3, 400 / Math.max(x1 - x0, y1 - y0)); c.width = Math.ceil((x1 - x0) * k) + 8; c.height = Math.ceil((y1 - y0) * k) + 8; const x = c.getContext('2d');
    x.fillStyle = '#fff'; x.fillRect(0, 0, c.width, c.height); x.fillStyle = COL.letters;
    for (const b of blocks) { const C = b.C; if (!C) continue; // shora: písmeno C omezené tím, kam sahají písmena A a B
      const r = b.res; for (let j = 0; j < C.ny; j++) for (let i = 0; i < C.nx; i++) { if (!C.bits[j * C.nx + i]) continue;
        const cx = C.X0 + (i + 0.5) * C.CP, cy = C.Y0 + (j + 0.5) * C.CP; let hit = false;
        for (let l = 0; l < r.L && !hit; l++) { const f = r.silF[l], sd = r.silS[l]; if (f.length && sd.length && inIv(f, cx) && inIv(sd, cy)) hit = true; }
        if (hit) x.fillRect(4 + (C.X0 / SC + i * C.CP / SC - x0) * k, c.height - 4 - (C.Y0 / SC + (j + 1) * C.CP / SC - y0) * k, C.CP / SC * k + 0.5, C.CP / SC * k + 0.5); } }
  }
  $('views').hidden = false;
}
function showStats(m) {
  const box = $('stats'); box.textContent = ''; let grams = 0, tris = 0;
  for (const g of m.letters.concat(m.base)) { const st = meshStats(g.attributes.position.array); tris += st.tris; grams += filamentEstimate(st, { wall: 1.2, infill: 15, density: 1.24, diameter: 1.75, pricePerKg: 500 }).grams; }
  const hrs = grams / 10 + 0.2;
  const tiles = [['Rozměry', `${fmt(m.size.x, 0)} × ${fmt(m.size.y, 0)} × ${fmt(m.size.z, 0)} mm`], ['Materiál', `${fmt(grams, 0)} g PLA`], ['Tisk zhruba', hrs < 1 ? `${fmt(hrs * 60, 0)} min` : `${fmt(hrs, 1)} h`], ['Soubor', `${fmt(Math.max(0.1, tris * 50 / 1048576), 1)} MB`]];
  for (const [a, b] of tiles) { const d = document.createElement('div'); d.className = 'stat'; const s1 = document.createElement('span'); s1.textContent = a; const s2 = document.createElement('b'); s2.textContent = b; d.append(s1, s2); box.append(d); }
  $('colorHint').textContent = !D.base.on ? '' : D.split ? 'Stáhnete písmena a podstavec jako dva soubory. Ve sliceru je vložte jako jeden objekt a každému dejte jinou barvu.' : `Dvě barvy z jedné cívky: ve sliceru nastavte změnu filamentu ve výšce ${fmt(m.colorZ)} mm.`;
}

/* ===== Stažení ===== */
const inViewer = !!(window.claude && typeof window.claude.use === 'function');
let dlCap = null;
if (inViewer) window.claude.use('downloads').then(d => { dlCap = d; updateNote(); }).catch(() => updateNote());
function updateNote() { $('saveNote').textContent = inViewer ? (dlCap ? 'Tady se STL stáhne zabalené v ZIP souboru.' : 'Stahování je v tomto zobrazení nedostupné.') : 'STL otevřete ve sliceru (Creality Print, Bambu Studio, PrusaSlicer, Cura). Jednotky jsou milimetry.'; }
const slug = (t) => (t || 'napis').normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^A-Za-z0-9_]+/g, '').slice(0, 40).toLowerCase() || 'napis';
function stl(geoms) { const u = stlBinary(geoms), head = 'Created by Julius Andy Antos | Dual Text Studio | mm'; for (let i = 0; i < 80; i++) u[i] = i < head.length ? head.charCodeAt(i) : 32; return u; }
async function saveFiles(files, zipName) {
  if (inViewer) {
    if (!dlCap) return;
    try { await dlCap.save({ filename: zipName, data: makeZip(files) }); $('saveNote').textContent = 'ZIP je uložený. Rozbalte ho a STL otevřete ve sliceru.'; }
    catch (err) { if (err && err.code !== 'declined') $('saveNote').textContent = err.code === 'rate_limited' ? 'Počkejte chvíli a zkuste to znovu.' : 'Soubor se nepodařilo uložit.'; }
    return;
  }
  for (const f of files) {
    const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([f.data], { type: 'model/stl' })); a.download = f.name;
    document.body.append(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 2000); await new Promise(r => setTimeout(r, 300));
  }
}
$('btnSave').onclick = () => {
  if (!model) return; const base = 'dual_' + slug(model.name);
  const files = D.split && model.base.length ? [{ name: base + '_pismena.stl', data: stl(model.letters) }, { name: base + '_podstavec.stl', data: stl(model.base) }] : [{ name: base + '.stl', data: stl(model.letters.concat(model.base)) }];
  saveFiles(files, base + '.zip');
};

/* ===== Instalace jako aplikace a sbalitelné sekce ===== */
let installEvt = null;
window.addEventListener('beforeinstallprompt', (e) => { e.preventDefault(); installEvt = e; $('btnInstall').hidden = false; });
window.addEventListener('appinstalled', () => { installEvt = null; $('btnInstall').hidden = true; });
$('btnInstall').onclick = async () => { if (!installEvt) return; installEvt.prompt(); try { await installEvt.userChoice; } catch (e) {} installEvt = null; $('btnInstall').hidden = true; };
if (!inViewer && 'serviceWorker' in navigator && (location.protocol === 'https:' || location.hostname === 'localhost')) navigator.serviceWorker.register('sw.js').catch(() => {});
(function () {
  const KEY = 'dual-text-studio-sbaleno';
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

/* ===== Pojistka proti posunutí celé stránky na počítači ===== */
const deskMQ = matchMedia('(min-width: 861px)');
const pinTop = () => { if (deskMQ.matches && (window.scrollY || document.documentElement.scrollTop || document.body.scrollTop)) { window.scrollTo(0, 0); document.body.scrollTop = 0; } };
window.addEventListener('scroll', pinTop, { passive: true }); document.body.addEventListener('scroll', pinTop, { passive: true });
document.addEventListener('focusin', () => requestAnimationFrame(pinTop));

/* ===== Start ===== */
initGL(); syncUI(); updateNote(); schedule(true);
if (!renderer) showMsgs([{ lvl: 'warn', msg: 'Prohlížeč nepodporuje WebGL, 3D náhled se nezobrazí. Stažení funguje dál.' }]);

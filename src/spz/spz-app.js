/* ===== SPZ přívěsek – poznávací značka jako přívěsek na klíče. Created by Julius Andy Antoš ===== */
const $ = (id) => document.getElementById(id);
const DEF = { text: '1A2 3456', cc: 'CZ', code: 'D', prop: 'tag', W: 70, t: 2, h: 0.6, frame: true, hole: 'band', stars: false,
  colors: 'ams', cW: '#f4f4f0', cK: '#1a1a1a', cB: '#1f3f9a', cY: '#f5c518', lh: 0.2, bedX: 220, bedY: 220, bedZ: 250 };
const STORE = 'spz-v1';
const D = Object.assign({}, DEF);
try { const s = JSON.parse(localStorage.getItem(STORE) || '{}'); for (const k in DEF) if (k in s && typeof s[k] === typeof DEF[k]) D[k] = s[k]; } catch (e) {}
const saveState = () => { try { localStorage.setItem(STORE, JSON.stringify(D)); } catch (e) {} };
const fmt = (v, d = 1) => (+v).toLocaleString('cs-CZ', { maximumFractionDigits: d, minimumFractionDigits: d });
const fmtP = (v) => (+v).toLocaleString('cs-CZ', { maximumFractionDigits: 2 });
const css = (v) => getComputedStyle(document.documentElement).getPropertyValue(v).trim();
const clamp = (v, a, b) => Math.min(b, Math.max(a, +v || 0));
const NAMES = { W: 'bila', K: 'cerna', B: 'modra', Y: 'zluta' };
const LABELS = { W: 'Podklad', K: 'Znaky a lem', B: 'Modrý pruh', Y: 'Hvězdy' };

/* ===== Písmo ===== */
let FONT = null;
const fontBuf = () => { const s = atob(SPZ_FONTS.plate), u = new Uint8Array(s.length); for (let i = 0; i < s.length; i++) u[i] = s.charCodeAt(i); return u.buffer; };
const getFont = () => FONT || (FONT = opentype.parse(fontBuf()));

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
const fromEx = (exs) => T(new MF.CrossSection(exToPaths(exs).map(p => p.map(q => [q.X / SC, q.Y / SC])), 'NonZero'));
const rect = (x0, y0, x1, y1) => T(T(MF.CrossSection.square([x1 - x0, y1 - y0])).translate([x0, y0]));
const rrect = (w, h, r) => T(T(T(MF.CrossSection.square([w - 2 * r, h - 2 * r], true)).offset(r, 'Round', 2, 64)));

/* ===== Text ===== */
function textCS(text) {
  const L = layoutText(getFont(), text, { size: 10, lineH: 1.15, spacing: 0, align: 'center', mirror: false, slant: 0 });
  return { cs: T(fromEx(unionEx(L.paths)).simplify(0.002)), missing: L.missing };
}
// nápis do obdélníku: výška h, šířka nejvýš w; úzké zúžení písma až na 78 %, pak se zmenší celé
function fitText(text, w, h, cx, cy) {
  const r = textCS(text); if (r.cs.isEmpty()) return { cs: null, missing: r.missing };
  const b = r.cs.bounds(), tw = b.max[0] - b.min[0], th = b.max[1] - b.min[1];
  let ky = h / th, kx = ky; if (tw * kx > w) { kx = Math.max(ky * 0.78, w / tw); if (tw * kx > w) { const f = w / (tw * kx); kx *= f; ky *= f; } }
  const cs = T(T(T(r.cs.translate([-(b.min[0] + b.max[0]) / 2, -(b.min[1] + b.max[1]) / 2])).scale([kx, ky])).translate([cx, cy]));
  return { cs, missing: r.missing, squeeze: kx / ky, shrink: ky * th / h };
}
function starCS(r) { const P = []; for (let i = 0; i < 10; i++) { const a = Math.PI / 2 + i * Math.PI / 5, rr = i % 2 ? r * 0.4 : r; P.push([rr * Math.cos(a), rr * Math.sin(a)]); } return T(new MF.CrossSection([P], 'NonZero')); }

/* ===== Formát ===== */
const plateText = () => String(D.text || '').toUpperCase().replace(/\s+/g, ' ').trim();
const codeText = () => D.cc === 'custom' ? String(D.code || '').toUpperCase().trim().slice(0, 3) : D.cc === 'none' ? '' : D.cc;
function formatHint() {
  const s = plateText();
  if (!s) return 'Napište čísla a písmena značky, nebo vlastní text velkými písmeny.';
  if (/^[0-9][A-Z][0-9A-Z] ?[0-9]{4}$/.test(s)) return 'Tvar české značky (např. 1A2 3456).';
  if (/^[A-Z]{2}[ -]?[0-9]{3}[A-Z]{2}$/.test(s)) return 'Tvar slovenské značky (např. BA 123AB).';
  if (/^[A-Z]{2}[ -]?[0-9]{3}[A-Z]{2}$|^[A-Z]{2}[ -]?[0-9]{3}[0-9A-Z]{2}$/.test(s)) return 'Tvar slovenské značky.';
  return 'Vlastní text: vypíše se písmem jako na SPZ. Krátký text (do 8 znaků) je nejčitelnější.';
}

/* ===== Stavba ===== */
function build(msgs) {
  const W = clamp(D.W, 30, 300), law = D.prop === 'law', H = law ? W * 110 / 520 : W * 0.27;
  const t = clamp(D.t, 1, 6), lh = clamp(D.lh, 0.05, 0.4);
  const swap = D.colors === 'swap';
  // ve výměnném režimu: pruh 2 vrstvy, znaky a lem aspoň o 2 vrstvy výš
  const hb = swap ? 2 * lh : 0, h = Math.max(clamp(D.h, 0.4, 3), swap ? hb + 2 * lh : 0);
  const rc = Math.max(1, H * 0.09), m1 = Math.max(0.8, H * 0.04), bw = D.frame ? Math.max(1, H * 0.05) : 0;
  const outer = rrect(W, H, rc);
  const fieldOut = T(outer.offset(-m1, 'Round', 2, 64)), field = D.frame ? T(outer.offset(-m1 - bw, 'Round', 2, 64)) : fieldOut;
  const frame = D.frame ? cl(T(fieldOut.subtract(field))) : null;
  const fb = field.bounds(), fx0 = fb.min[0], fx1 = fb.max[0], fy0 = fb.min[1], fy1 = fb.max[1], fh = fy1 - fy0;
  const code = codeText(), hasBand = D.cc !== 'none';
  const bandW = hasBand ? (law ? W * 40 / 520 : W * 0.17) : 0, bx1 = fx0 + bandW, bcx = (fx0 + bx1) / 2;
  const band = hasBand ? cl(T(field.intersect(rect(fx0 - 1, fy0 - 1, bx1, fy1 + 1)))) : null;
  // díra na kroužek nahoře v pruhu, jinak v levém horním rohu bílého pole
  let hole = null, hr = 0, hy = 0, hx = 0;
  if (D.hole === 'band') {
    hr = hasBand ? Math.min(2.2, Math.max(1.2, bandW * 0.3)) : Math.min(2.2, Math.max(1.2, fh * 0.16));
    hx = hasBand ? bcx : fx0 + hr + 1.4; hy = fy1 - hr - Math.max(0.9, fh * 0.07);
    hole = T(T(MF.CrossSection.circle(hr, 48)).translate([hx, hy]));
    if (hasBand && hr * 2 + 1.2 > bandW) msgs.push({ lvl: 'info', msg: 'Pruh je úzký pro díru. Zvolte širší přívěsek nebo proporce přívěsku.' });
  }
  // kód státu dole v pruhu
  let codeCS = null;
  if (hasBand && code) {
    const top = hole ? hy - hr - 0.8 : fy0 + fh * 0.62, ch = Math.min(bandW * 0.5, (top - fy0) * 0.62);
    const r = fitText(code, bandW * 0.78, ch, bcx, fy0 + Math.max(0.9, fh * 0.08) + ch / 2);
    if (r.cs) codeCS = cl(T(r.cs.intersect(T(band.offset(-0.3, 'Round')))));
    if (ch < 2.2) msgs.push({ lvl: 'info', msg: `Kód ${code} je vysoký jen ${fmtP(Math.round(ch * 10) / 10)} mm. Pro čitelný kód zvolte šířku přívěsku aspoň ${Math.ceil(W * 2.4 / Math.max(ch, 0.1) / 5) * 5} mm.` });
  }
  // hvězdy EU (jen vícebarevný tisk, bez díry)
  let starsCS = null;
  if (hasBand && D.stars && !hole && !swap) {
    const cy = fy1 - fh * 0.3, R = Math.min(bandW * 0.3, fh * 0.2), sr = Math.max(0.6, R * 0.22), list = [];
    for (let i = 0; i < 12; i++) { const a = i / 12 * 2 * Math.PI; list.push(T(starCS(sr).translate([bcx + R * Math.cos(a), cy + R * Math.sin(a)]))); }
    starsCS = cl(T(CU(list).intersect(T(band.offset(-0.3, 'Round')))));
    if (sr < 0.9) msgs.push({ lvl: 'info', msg: 'Hvězdy jsou na tisk hodně drobné. Hodí se tryska 0,2 mm nebo větší přívěsek.' });
  }
  // znaky
  const tx0 = (hasBand ? bx1 : fx0) + Math.max(1, fh * 0.1), tx1 = fx1 - Math.max(1, fh * 0.1);
  const txt = plateText(); let charsCS = null;
  if (txt) {
    const r = fitText(txt, tx1 - tx0, fh * 0.72, (tx0 + tx1) / 2, (fy0 + fy1) / 2);
    if (r.missing.length) msgs.push({ lvl: 'warn', msg: `Písmo neumí znaky: ${r.missing.join(' ')}` });
    if (r.cs) {
      charsCS = cl(T(r.cs.intersect(T(field.offset(-0.3, 'Round')))));
      if (r.shrink < 0.99) msgs.push({ lvl: 'info', msg: `Text je dlouhý, znaky jsou menší (${Math.round(r.shrink * 100)} % výšky).` });
      const chH = fh * 0.72 * Math.min(1, r.shrink);
      if (chH < 5) msgs.push({ lvl: 'info', msg: `Znaky jsou vysoké ${fmtP(Math.round(chH * 10) / 10)} mm. Tahy písma vyjdou kolem ${fmtP(Math.round(chH * 1.6) / 10)} mm, hodí se tryska 0,2 mm.` });
    }
  } else msgs.push({ lvl: 'info', msg: 'Bez textu vznikne prázdná značka.' });

  const holeCyl = hole ? ext(hole, -1, t + h + 1) : null;
  const cut = (m) => m && holeCyl ? T(m.subtract(holeCyl)) : m;
  const black = CU([frame, charsCS]);
  const parts = {};
  if (!swap) {
    // samostatná tělesa vedle sebe, každé své barvy
    parts.W = cut(U([ext(outer, 0, t), codeCS ? ext(codeCS, t, t + h) : null]));
    if (band) { let b = band; for (const c of [codeCS, starsCS]) if (c) b = T(b.subtract(c)); parts.B = cut(ext(b, t, t + h)); }
    if (black) parts.K = cut(ext(black, t, t + h));
    if (starsCS) parts.Y = ext(starsCS, t, t + h);
  } else {
    // jedno těleso, barvy podle výšky: bílá, modrá, černá
    let bnd = null;
    if (band) { let b = cl(T(fieldOut.offset(-Math.min(0.3, bw / 2), 'Round').intersect(rect(fx0 - m1 - 2, fy0 - 2, bx1, fy1 + 2)))); if (codeCS) b = T(b.subtract(codeCS)); bnd = ext(b, t, t + hb); }
    parts.S = cut(U([ext(outer, 0, t), bnd, black ? ext(black, t, t + h) : null]));
  }
  return { parts, W, H, t, h, hb, lh, swap, txt, code };
}

/* ===== Ovládání ===== */
function syncUI() {
  document.querySelectorAll('[data-k]').forEach(el => { const v = D[el.dataset.k]; if (el.type === 'checkbox') el.checked = !!v; else el.value = v; });
  document.querySelectorAll('input[type=radio][name]').forEach(r => { r.checked = String(D[r.name]) === r.value; });
  updateUI();
}
function updateUI() {
  const starsOk = D.cc !== 'none' && D.hole === 'none' && D.colors === 'ams';
  document.querySelectorAll('[data-show]').forEach(el => { el.hidden = !({ ccCustom: D.cc === 'custom', stars: starsOk, starCol: starsOk && D.stars })[el.dataset.show]; });
  $('fmtHint').textContent = formatHint();
  const W = clamp(D.W, 30, 300);
  $('propHint').textContent = D.prop === 'law' ? `Poměr stran skutečné značky 520 × 110 mm, tedy ${fmt(W, 0)} × ${fmt(W * 110 / 520, 1)} mm. Na přívěsek je nízká, znaky vyjdou drobné.` : `Vyšší a lépe čitelná: ${fmt(W, 0)} × ${fmt(W * 0.27, 1)} mm.`;
  $('modeHint').textContent = D.colors === 'swap' ? 'Jedno těleso, barvy se mění podle výšky: bílá, modrá, černá. Kód státu je vyřezaný do modrého pruhu až na bílý podklad.' : 'Každá barva je samostatný soubor se stejným umístěním: načtěte je najednou jako jeden objekt s více díly.';
  const ta = document.querySelector('[data-k=text]'); if (ta && document.activeElement !== ta) ta.value = D.text;
}
function onChange(path) { if (/^(W|prop)$/.test(path)) fitNext = true; updateUI(); saveState(); if (/^c[WKBY]$/.test(path)) { recolor(); return; } schedule(); }
document.querySelectorAll('[data-k]').forEach(el => el.addEventListener(el.type === 'checkbox' ? 'change' : 'input', () => {
  const k = el.dataset.k; let v;
  if (el.type === 'checkbox') v = el.checked; else if (el.type === 'text' || el.type === 'color') v = el.value; else { v = parseFloat(el.value); if (!isFinite(v)) return; }
  if (k === 'text' || k === 'code') v = String(v).toUpperCase();
  D[k] = v; onChange(k);
}));
document.querySelectorAll('input[type=radio][name]').forEach(r => r.addEventListener('change', () => { D[r.name] = r.value; onChange(r.name); }));
let tmr = 0;
function schedule(now) { clearTimeout(tmr); tmr = setTimeout(() => { if (!MF) return; busy(true, 'Počítám…'); setTimeout(() => { try { rebuild(); } finally { busy(false); } }, 20); }, now ? 0 : 350); }
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
function resize() { if (!renderer) return; const r = $('viewer').getBoundingClientRect(); if (!r.width) return; renderer.setSize(r.width, r.height, false); camera.aspect = r.width / r.height; camera.updateProjectionMatrix(); if (!userMoved && model) fit(lastView); else draw(); }
let raf = 0, userMoved = false, lastView = 'persp';
function draw() { if (!renderer || raf) return; raf = requestAnimationFrame(() => { raf = 0; const t = orbit.target, s = Math.sin(orbit.phi);
  camera.position.set(t.x + orbit.r * s * Math.cos(orbit.theta), t.y + orbit.r * s * Math.sin(orbit.theta), t.z + orbit.r * Math.cos(orbit.phi)); camera.lookAt(t); renderer.render(scene, camera); }); }
function fit(view) {
  if (!model || !renderer) return; lastView = view; const b = model.bbox, sx = b.max.x - b.min.x, sy = b.max.y - b.min.y, sz = b.max.z - b.min.z;
  orbit.target.set((b.min.x + b.max.x) / 2, (b.min.y + b.max.y) / 2, sz / 2); const span = Math.max(sx, sy * camera.aspect, 20);
  orbit.r = span / (2 * Math.tan(THREE.MathUtils.degToRad(30) / 2)) * Math.max(1.15, 1.5 / camera.aspect);
  if (view === 'top') { orbit.theta = -Math.PI / 2; orbit.phi = 0.001; } else { orbit.theta = -Math.PI / 2 - 0.25; orbit.phi = 0.65; }
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
function recolor() { if (!group) return; group.children.forEach(m => { m.material.color = new THREE.Color(D['c' + m.userData.c]); }); draw(); updateSwaps(); }

/* ===== Výpočet ===== */
function rebuild() {
  const msgs = []; let r = null;
  try { r = build(msgs); } catch (e) { console.error(e); msgs.push({ lvl: 'bad', msg: 'Značku se nepodařilo spočítat. Zkuste jiný text nebo rozměr.' }); r = null; }
  if (group) { scene && scene.remove(group); group.traverse(o => { o.geometry && o.geometry.dispose(); o.material && o.material.dispose(); }); group = null; }
  if (!r || !Object.keys(r.parts).length) { model = null; freeAll(); $('btnSave').disabled = true; showMsgs(msgs); $('stats').textContent = ''; $('swaps').textContent = ''; $('dims').textContent = '–'; draw(); return; }
  let vol = 0; const files = [], view = [];
  if (r.swap) {
    const S = r.parts.S; vol = S.volume(); files.push({ c: '', g: toGeom(S) });
    // náhled: těleso rozřezané podle výšky výměn
    const big = 1000, cut = (z0, z1) => T(S.intersect(T(T(MF.Manifold.cube([big, big, z1 - z0], true)).translate([0, 0, (z0 + z1) / 2]))));
    for (const [c, z0, z1] of [['W', -1, r.t + 0.01], ['B', r.t + 0.01, r.t + r.hb + 0.01], ['K', r.t + r.hb + 0.01, r.t + r.h + 1]]) { const m = cut(z0, z1); if (!m.isEmpty()) view.push({ c, g: toGeom(m) }); }
  } else {
    for (const c of ['W', 'B', 'K', 'Y']) { const m = r.parts[c]; if (!m || m.isEmpty()) continue; vol += m.volume(); const g = toGeom(m); files.push({ c, g }); view.push({ c, g }); }
  }
  freeAll();
  const bb = new THREE.Box3(); for (const it of view) { it.g.computeBoundingBox(); bb.union(it.g.boundingBox); }
  model = { files, view, bbox: bb, r };
  group = new THREE.Group();
  for (const it of view) { const g = it.g; g.computeVertexNormals(); const mesh = new THREE.Mesh(g, new THREE.MeshStandardMaterial({ roughness: 0.45, metalness: 0.05, flatShading: true })); mesh.userData = { c: it.c }; group.add(mesh); }
  if (renderer) scene.add(group);
  recolor();
  const sx = bb.max.x - bb.min.x, sy = bb.max.y - bb.min.y, sz = bb.max.z - bb.min.z;
  if (sx > D.bedX || sy > D.bedY) msgs.push({ lvl: 'warn', msg: `Přívěsek (${fmt(sx, 0)} × ${fmt(sy, 0)} mm) se nevejde na tiskovou plochu.` });
  if (r.swap && Math.abs(clamp(D.h, 0.4, 3) - r.h) > 0.001) msgs.push({ lvl: 'info', msg: `Při výměně filamentu jsou znaky vysoké ${fmtP(r.h)} mm, aby nad modrým pruhem zbyly aspoň dvě černé vrstvy.` });
  showMsgs(msgs);
  $('btnSave').disabled = false; $('btnSave').textContent = files.length > 1 ? `Stáhnout STL (${files.length} soubory)` : 'Stáhnout STL';
  $('dims').innerHTML = `<b>${fmt(sx)}</b> × <b>${fmt(sy)}</b> × <b>${fmt(sz)}</b> mm`;
  const grams = vol / 1000 * 1.24, hrs = grams / 9 + 0.1 + (r.swap ? 0 : 0.15 * (files.length - 1));
  const bx = $('stats'); bx.textContent = '';
  for (const [a, v] of [['Značka', r.txt || '—'], ['Rozměry', `${fmt(sx, 0)} × ${fmt(sy, 1)} × ${fmt(sz, 1)} mm`], ['Materiál', `${fmt(Math.max(0.5, grams), grams < 10 ? 1 : 0)} g`], ['Tisk zhruba', hrs < 1 ? `${fmt(hrs * 60, 0)} min` : `${fmt(hrs, 1)} h`]]) {
    const d = document.createElement('div'); d.className = 'stat'; const s1 = document.createElement('span'); s1.textContent = a; const s2 = document.createElement('b'); s2.textContent = v; d.append(s1, s2); bx.append(d);
  }
  if (fitNext || !userMoved) { fit(fitNext ? 'persp' : lastView); fitNext = false; } else draw();
}
function updateSwaps() {
  const bx = $('swaps'); bx.textContent = ''; if (!model) return; const r = model.r, lh = r.lh;
  const line = (h) => { const d = document.createElement('div'); d.innerHTML = h; bx.append(d); };
  const sw = (c) => `<i style="background:${c}"></i>`;
  if (r.swap) {
    line(`<b>Výměna filamentu</b> (vrstva ${fmtP(lh)} mm):`);
    line(`${sw(D.cW)}začátek tisku`);
    if (r.code !== undefined && D.cc !== 'none') line(`${sw(D.cB)}od výšky ${fmtP(r.t)} mm → vrstva č. ${Math.round(r.t / lh) + 1}`);
    line(`${sw(D.cK)}od výšky ${fmtP(Math.round((r.t + (D.cc !== 'none' ? r.hb : 0)) * 100) / 100)} mm → vrstva č. ${Math.round((r.t + (D.cc !== 'none' ? r.hb : 0)) / lh) + 1}`);
    if (Math.abs(r.t / lh - Math.round(r.t / lh)) > 0.01) line('<small>Tloušťku volte jako násobek výšky vrstvy, ať výměna sedne přesně.</small>');
  } else line(model.files.map(f => `${sw(D['c' + f.c])}${LABELS[f.c]}`).join(' &nbsp; '));
}

/* ===== Stažení ===== */
const inViewer = !!(window.claude && typeof window.claude.use === 'function');
let dlCap = null;
if (inViewer) window.claude.use('downloads').then(d => { dlCap = d; updateNote(); }).catch(() => updateNote());
function updateNote() { $('saveNote').textContent = inViewer ? (dlCap ? 'Tady se soubory stáhnou zabalené v ZIP.' : 'Stahování je v tomto zobrazení nedostupné.') : 'Přívěsek leží znaky nahoru, jak se tiskne. Jednotky jsou milimetry.'; }
$('btnSave').onclick = async () => {
  if (!model) return;
  const enc = (geoms) => { const u = stlBinary(geoms), head = 'Created by Julius Andy Antos | SPZ privesek | mm'; for (let i = 0; i < 80; i++) u[i] = i < head.length ? head.charCodeAt(i) : 32; return u; };
  const base = ('spz_' + (model.r.txt || 'privesek')).normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^A-Za-z0-9_-]+/g, '_').replace(/_+$/, '');
  const files = model.files.map(f => ({ name: f.c ? `${base}_${NAMES[f.c]}.stl` : `${base}.stl`, data: enc([f.g]) }));
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
  const KEY = 'spz-sbaleno';
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

/* ===== Mřížky na ventilátor — aplikace. Created by Julius Andy Antoš ===== */
const $ = (id) => document.getElementById(id);
// velikost ventilátoru: rozteč montážních děr a průměr díry na šroub
const FANS = { 25: [20, 2.6], 30: [24, 3.2], 40: [32, 3.4], 50: [40, 3.4], 60: [50, 3.4], 70: [60, 4.3], 80: [71.5, 4.3], 92: [82.5, 4.3], 120: [105, 4.5], 140: [124.5, 4.5] };
const DEF = { size: 120, S: 120, pitch: 105, hole: 4.5, csk: false, pat: 'rings', w: 1.6, gap: 6, sp: 4, rot: 0, hub: true, shape: 'dome', h: 15, t: 1.6, T: 3, off: 0, bedX: 220, bedY: 220, bedZ: 250 };
const STORE = 'mrizky-v1';
const D = Object.assign({}, DEF);
try { const s = JSON.parse(localStorage.getItem(STORE) || '{}'); for (const k in DEF) if (k in s && typeof s[k] === typeof DEF[k]) D[k] = s[k]; } catch (e) {}
const saveState = () => { try { localStorage.setItem(STORE, JSON.stringify(D)); } catch (e) {} };
const fmt = (v, d = 1) => v.toLocaleString('cs-CZ', { maximumFractionDigits: d, minimumFractionDigits: d });
const css = (v) => getComputedStyle(document.documentElement).getPropertyValue(v).trim();
const clamp = (v, a, b) => Math.min(b, Math.max(a, +v || 0));
const PATS = [['rings', 'Kruhy', '<circle cx="17" cy="15" r="11"/><circle cx="17" cy="15" r="7"/><circle cx="17" cy="15" r="3"/><path d="M17 4v22M6 15h22"/>'], ['hex', 'Plástev', '<path d="M11 6l4 0 2 3.5-2 3.5h-4l-2-3.5zM19 10.5h4l2 3.5-2 3.5h-4l-2-3.5zM11 15h4l2 3.5-2 3.5h-4l-2-3.5z"/>'],
  ['slots', 'Štěrbiny', '<circle cx="17" cy="15" r="11"/><path d="M8 9h18M6 13h22M6 17h22M8 21h18"/>'], ['grid', 'Mříž', '<circle cx="17" cy="15" r="11"/><path d="M6 11h22M6 15h22M6 19h22M13 4v22M17 4v22M21 4v22"/>'],
  ['spiral', 'Spirála', '<circle cx="17" cy="15" r="11"/><path d="M17 15c3-4 7-5 11-2M17 15c-1 5-5 8-9 7M17 15c-4-2-6-6-4-10"/>']];

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
const C = { circle: (r, n) => T(MF.CrossSection.circle(r, n || Math.max(48, Math.round(r * 6)))), rect: (w, h) => T(MF.CrossSection.square([w, h], true)), poly: (pts) => T(new MF.CrossSection([pts], 'NonZero')) };
const U2 = (list) => list.length ? T(MF.CrossSection.union(list)) : null;
const mv = (cs, x, y) => T(cs.translate([x, y]));
const rotCS = (cs, deg) => T(cs.rotate(deg));
const annulus = (r0, r1) => T(C.circle(r1).subtract(C.circle(Math.max(0.01, r0))));

/* ===== Geometrie ===== */
function fanDims() {
  const custom = !FANS[D.size], S = custom ? clamp(D.S, 15, 250) : D.size, P = custom ? clamp(D.pitch, 10, S) : FANS[D.size][0];
  const hole = clamp(D.hole, 1.5, 8);
  const Ro = Math.max(5, Math.min(S * 0.47, P / Math.SQRT2 - hole / 2 - 2.2));
  return { S, P, hole, Ro };
}
/* plochy žeber (2D) uvnitř otvoru o poloměru Ro */
function pattern(Ro) {
  const w = clamp(D.w, 0.8, 6), g = clamp(D.gap, 1.5, 30), sp = Math.round(clamp(D.sp, 0, 16)), rot = clamp(D.rot, -90, 90);
  const hubR = D.hub ? Math.min(Ro * 0.42, Math.max(w * 2, D.S * 0 + fanDims().S * 0.18)) : Math.max(w * 1.2, 1.5);
  const disk = C.circle(Ro + 1, 160), inner = C.circle(Ro - w / 2, 160), parts = [annulus(Ro - w, Ro + 1), C.circle(hubR)];
  const clip = (cs) => T(cs.intersect(inner));   // vzor končí uvnitř okrajového kruhu, jinak by na okraji vznikla ostrá zúžení
  if (D.pat === 'rings') {
    for (let r = hubR + g; r + w < Ro - w * 0.5; r += w + g) parts.push(annulus(r, r + w));
    for (let i = 0; i < sp; i++) parts.push(clip(rotCS(mv(C.rect(Ro + 1, w), (Ro + 1) / 2, 0), rot + i * 360 / sp)));
  } else if (D.pat === 'hex') {
    const p = g + w, R = g / Math.sqrt(3), holes = [], hx = T(T(MF.CrossSection.circle(R, 6)).rotate(30));
    const ny = Math.ceil(Ro / (p * Math.sqrt(3) / 2)) + 1, nx = Math.ceil(Ro / p) + 1;
    for (let j = -ny; j <= ny; j++) for (let i = -nx; i <= nx; i++) {
      const x = (i + (j & 1) * 0.5) * p, y = j * p * Math.sqrt(3) / 2;
      if (Math.hypot(x, y) < Ro + R) holes.push(mv(hx, x, y));
    }
    parts.push(T(inner.subtract(rotCS(U2(holes), rot))));
  } else if (D.pat === 'slots' || D.pat === 'grid') {
    const p = w + g, bars = [];
    for (let y = -Math.floor(Ro / p) * p; y <= Ro; y += p) bars.push(mv(C.rect(2 * Ro + 4, w), 0, y));
    if (D.pat === 'grid') for (let x = -Math.floor(Ro / p) * p; x <= Ro; x += p) bars.push(mv(C.rect(w, 2 * Ro + 4), x, 0));
    else for (let i = 0; i < sp; i++) { const x = -Ro + (i + 1) * 2 * Ro / (sp + 1); bars.push(mv(C.rect(w, 2 * Ro + 4), x, 0)); }
    parts.push(clip(rotCS(U2(bars), rot)));
  } else { // spirála
    const arms = Math.max(3, sp || 8), sweep = 75 * Math.PI / 180, r0 = hubR * 0.8;
    for (let a = 0; a < arms; a++) {
      const L = [], Rr = [], N = 40, t0 = a / arms * 2 * Math.PI + rot * Math.PI / 180;
      for (let i = 0; i <= N; i++) {
        const r = r0 + (Ro + 0.5 - r0) * i / N, th = t0 + sweep * Math.pow(i / N, 1.2);
        const x = r * Math.cos(th), y = r * Math.sin(th);
        const dr = (Ro - r0) / N, dth = sweep * (Math.pow((i + 1) / N, 1.2) - Math.pow(i / N, 1.2));
        let tx = dr * Math.cos(th) - r * dth * Math.sin(th), ty = dr * Math.sin(th) + r * dth * Math.cos(th); const l = Math.hypot(tx, ty) || 1; tx /= l; ty /= l;
        L.push([x - ty * w / 2, y + tx * w / 2]); Rr.push([x + ty * w / 2, y - tx * w / 2]);
      }
      parts.push(clip(C.poly(L.concat(Rr.reverse()))));
    }
    for (let r = hubR + g * 2.5; r + w < Ro - w; r += (w + g) * 2.5) parts.push(annulus(r, r + w));   // pár podpůrných kruhů
  }
  return T(T(U2(parts)).intersect(disk));
}
function surf(Ro) { // výška plochy mřížky nad rovinou f(r) a její sklon
  const h = D.shape === 'flat' ? 0 : clamp(D.h, 2, 80);
  if (!h) return { f: () => 0, k: () => 1, area: 1, h: 0 };
  if (D.shape === 'cone') { const s = h / Ro; return { f: (r) => r >= Ro ? 0 : h * (1 - r / Ro), k: () => Math.sqrt(1 + s * s), area: Math.sqrt(1 + s * s), h }; }
  const Rs = (Ro * Ro + h * h) / (2 * h);   // kulový vrchlík
  return { f: (r) => r >= Ro ? 0 : Math.sqrt(Math.max(0, Rs * Rs - r * r)) - (Rs - h), k: (r) => { const z = Math.sqrt(Math.max(1e-6, Rs * Rs - Math.min(r, Ro) ** 2)); return Rs / z; }, area: (Ro * Ro + h * h) / (Ro * Ro), h };
}
function build(msgs) {
  const F = fanDims(), { S, P, hole, Ro } = F, Tf = clamp(D.T, 1, 10), t = clamp(D.t, 0.8, 6), curved = D.shape !== 'flat', off = curved ? clamp(D.off, 0, 20) : 0;
  const rr = Math.max(2, S * 0.06);
  // rám: čtverec se zaoblenými rohy, otvor a díry na šrouby
  let frameCS = T(C.rect(S, S).offset(-rr, 'Round').offset(rr, 'Round'));
  const holes = [-1, 1].flatMap(a => [-1, 1].map(b => mv(C.circle(hole / 2, 40), a * P / 2, b * P / 2)));
  frameCS = T(frameCS.subtract(T(MF.CrossSection.union([C.circle(Ro, 160), ...holes]))));
  let frame = T(frameCS.extrude(Tf));
  if (D.csk) { const hd = hole * 2 + 0.6; for (const [a, b] of [[-1, -1], [-1, 1], [1, -1], [1, 1]]) frame = T(frame.subtract(T(T(MF.Manifold.cylinder(hd / 2 - hole / 2 + 0.31, hole / 2 - 0.3, hd / 2 + 0.01, 48)).translate([a * P / 2, b * P / 2, Tf - (hd / 2 - hole / 2) - 0.3])))); }
  // mřížka
  const G = pattern(Ro), sf = surf(Ro);
  let grille = T(T(G.extrude(t)).translate([0, 0, 0.013]));   // nepatrný posun: plochy mřížky a rámu nesmí ležet v jedné rovině
  if (curved) {
    grille = T(grille.refineToLength(Math.max(0.8, Math.min(2, Ro / 40))));
    grille = T(grille.warp((v) => { const r = Math.hypot(v[0], v[1]); v[2] = off + sf.f(r) + v[2] * sf.k(r); }));
  }
  const parts = [frame, grille];
  if (off > 0) parts.push(T(T(annulus(Ro - 0.537, Ro + 2.02).extrude(off + t * 0.7)).translate([0, 0, 0.007])));
  const m = T(MF.Manifold.union(parts));
  // volná plocha
  const A0 = Math.PI * Ro * Ro, bars = T(G.intersect(C.circle(Ro, 160))).area(), free = (A0 - bars) / A0;
  if (curved && sf.h > Ro * 0.9 && D.shape === 'dome') msgs.push({ lvl: 'info', msg: 'Vysoká kopule má u okraje strmé stěny. Tiskne se dobře, ale žebra tam budou tenčí na pohled.' });
  if (D.w < 1.2) msgs.push({ lvl: 'info', msg: 'Žebra užší než 1,2 mm jsou křehká. Pro odolnou mřížku zvolte 1,2–1,6 mm.' });
  if (D.gap > 12 && S <= 80) msgs.push({ lvl: 'warn', msg: 'Mezera nad 12 mm propustí prsty. Pro ochrannou mřížku volte menší.' });
  return { m, F, free, freeCurved: free * sf.area, h: sf.h + off };
}

/* ===== Ovládání ===== */
function syncUI() {
  document.querySelectorAll('[data-k]').forEach(el => { const v = D[el.dataset.k]; if (el.type === 'checkbox') el.checked = !!v; else el.value = v; });
  document.querySelectorAll('input[type=radio][name]').forEach(r => { r.checked = String(D[r.name]) === r.value; });
  updateUI();
}
function updateUI() {
  const custom = !FANS[D.size];
  const show = { custom, spokes: D.pat !== 'hex' && D.pat !== 'grid', angle: D.pat !== 'rings', curved: D.shape !== 'flat' };
  document.querySelectorAll('[data-show]').forEach(el => { el.hidden = !show[el.dataset.show]; });
  document.querySelectorAll('#sizes button').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.s === String(custom ? 0 : D.size))));
  document.querySelectorAll('#pats [data-v]').forEach(b => b.setAttribute('aria-checked', String(b.dataset.v === D.pat)));
  $('lblSp').textContent = D.pat === 'spiral' ? 'Počet ramen' : D.pat === 'slots' ? 'Příčky' : 'Paprsky';
  const F = fanDims();
  $('spec').innerHTML = `Ventilátor <b>${F.S} mm</b> · rozteč děr <b>${fmt(F.P, 1)} mm</b> · otvor ⌀ <b>${fmt(F.Ro * 2, 1)} mm</b>`;
  $('shapeHint').textContent = D.shape === 'flat' ? 'Odstup od lopatek jde nastavit jen u kužele a kopule (rovná mřížka by visela ve vzduchu).' : '';
}
(function () {
  const box = $('sizes');
  for (const s of Object.keys(FANS).map(Number).concat(0)) { const b = document.createElement('button'); b.type = 'button'; b.dataset.s = s; b.textContent = s ? s + ' mm' : 'Vlastní'; b.onclick = () => {
    if (s) { D.size = s; D.S = s; D.pitch = FANS[s][0]; D.hole = FANS[s][1]; D.gap = Math.max(3, Math.round(s / 20)); D.h = Math.round(s / 8); } else { D.size = 0; }
    syncUI(); onChange('size'); }; box.append(b); }
  const pb = $('pats'); for (const [v, n, svg] of PATS) { const b = document.createElement('button'); b.type = 'button'; b.setAttribute('role', 'radio'); b.dataset.v = v; b.innerHTML = `<svg viewBox="0 0 34 30">${svg}</svg>${n}`; b.onclick = () => { D.pat = v; if (v === 'spiral' && D.sp < 3) D.sp = 8; syncUI(); onChange('pat'); }; pb.append(b); }
})();
function onChange(path) { if (/^(size|S|shape|h|off)$/.test(path)) fitNext = true; updateUI(); saveState(); schedule(); }
document.querySelectorAll('[data-k]').forEach(el => el.addEventListener(el.type === 'checkbox' ? 'change' : 'input', () => {
  const v = el.type === 'checkbox' ? el.checked : parseFloat(el.value); if (el.type !== 'checkbox' && !isFinite(v)) return; D[el.dataset.k] = v; onChange(el.dataset.k);
}));
document.querySelectorAll('input[type=radio][name]').forEach(r => r.addEventListener('change', () => { D[r.name] = r.value; onChange(r.name); }));
let tmr = 0;
function schedule(now) { clearTimeout(tmr); tmr = setTimeout(() => { if (!MF) return; busy(true, 'Počítám mřížku…'); setTimeout(() => { try { rebuild(); } finally { busy(false); } }, 20); }, now ? 0 : 400); }
function busy(on, txt) { $('busy').hidden = !on; if (txt) $('busy').textContent = txt; }

/* ===== 3D scéna ===== */
const cv = $('cv');
let renderer = null, scene, camera, bedGroup, mesh = null, fitNext = true, model = null;
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
  if (!model || !renderer) return; const b = model.bbox, sx = b.max.x - b.min.x, sy = b.max.y - b.min.y, sz = b.max.z - b.min.z;
  orbit.target.set(0, 0, sz / 2); const span = Math.max(sx, sy, sz, 20);
  orbit.r = span / (2 * Math.tan(THREE.MathUtils.degToRad(30) / 2)) * Math.max(1.15, 1.6 / camera.aspect);
  if (view === 'front') { orbit.theta = -Math.PI / 2; orbit.phi = Math.PI / 2 - 0.06; } else if (view === 'top') { orbit.theta = -Math.PI / 2; orbit.phi = 0.001; } else { orbit.theta = -Math.PI / 2 - 0.4; orbit.phi = 0.95; }
  draw();
}
$('vFront').onclick = () => fit('front'); $('vTop').onclick = () => fit('top'); $('vPersp').onclick = () => fit('persp');
const ptrs = new Map(); let pinch0 = 0, r0 = 0;
cv.addEventListener('contextmenu', e => e.preventDefault());
cv.addEventListener('pointerdown', e => { cv.setPointerCapture(e.pointerId); ptrs.set(e.pointerId, { x: e.clientX, y: e.clientY, b: e.button, shift: e.shiftKey }); if (ptrs.size === 2) { const [a, b] = [...ptrs.values()]; pinch0 = Math.hypot(a.x - b.x, a.y - b.y); r0 = orbit.r; } });
cv.addEventListener('pointermove', e => { const p = ptrs.get(e.pointerId); if (!p) return; const dx = e.clientX - p.x, dy = e.clientY - p.y; p.x = e.clientX; p.y = e.clientY;
  if (ptrs.size === 2) { const [a, b] = [...ptrs.values()]; const d = Math.hypot(a.x - b.x, a.y - b.y); if (pinch0) orbit.r = r0 * pinch0 / d; }
  else if (p.b === 2 || p.shift) { const k = orbit.r * 0.0016, right = new THREE.Vector3(), up = new THREE.Vector3(); camera.matrixWorld.extractBasis(right, up, new THREE.Vector3()); orbit.target.addScaledVector(right, -dx * k).addScaledVector(up, dy * k); }
  else { orbit.theta -= dx * 0.008; orbit.phi = Math.min(Math.PI - 0.05, Math.max(0.001, orbit.phi - dy * 0.008)); } draw(); });
const pup = e => { ptrs.delete(e.pointerId); if (ptrs.size < 2) pinch0 = 0; }; cv.addEventListener('pointerup', pup); cv.addEventListener('pointercancel', pup);
cv.addEventListener('wheel', e => { e.preventDefault(); orbit.r = Math.min(6000, Math.max(5, orbit.r * Math.exp(e.deltaY * 0.0012))); draw(); }, { passive: false });
function showMsgs(list) { const box = $('msgs'); box.textContent = ''; for (const m of list) { const d = document.createElement('div'); d.className = 'msg ' + m.lvl; d.textContent = m.msg; box.append(d); } }

/* ===== Výpočet ===== */
function rebuild() {
  const msgs = []; let r = null;
  try { r = build(msgs); } catch (e) { console.error(e); msgs.push({ lvl: 'bad', msg: 'Mřížku se nepodařilo spočítat. Zkuste jinou šířku žeber nebo mezeru.' }); }
  if (mesh) { scene && scene.remove(mesh); mesh.geometry.dispose(); mesh.material.dispose(); mesh = null; }
  if (model) model.g.dispose();
  if (!r) { freeAll(); model = null; $('btnSave').disabled = true; showMsgs(msgs); $('stats').textContent = ''; draw(); return; }
  const g = toGeom(r.m); const vol = r.m.volume(); freeAll();
  g.computeBoundingBox(); model = { g, bbox: g.boundingBox.clone(), r }; $('btnSave').disabled = false;
  const b = model.bbox, sx = b.max.x - b.min.x, sy = b.max.y - b.min.y, sz = b.max.z - b.min.z;
  if (sx > D.bedX || sy > D.bedY || sz > D.bedZ) msgs.push({ lvl: 'warn', msg: `Mřížka (${fmt(sx, 0)} × ${fmt(sy, 0)} mm) se nevejde na tiskovou plochu.` });
  msgs.unshift({ lvl: r.freeCurved >= 0.7 ? 'ok' : 'info', msg: D.shape === 'flat' ? `Volná plocha ${fmt(r.free * 100, 0)} % otvoru.` : `Volná plocha ${fmt(r.freeCurved * 100, 0)} % otvoru (rovná mřížka se stejným vzorem by měla ${fmt(r.free * 100, 0)} %).` });
  showMsgs(msgs);
  if (renderer) { g.computeVertexNormals(); mesh = new THREE.Mesh(g, new THREE.MeshStandardMaterial({ color: new THREE.Color('#0b7a72'), roughness: 0.55, metalness: 0.03, flatShading: true })); scene.add(mesh); }
  $('dims').innerHTML = `<b>${fmt(sx)}</b> × <b>${fmt(sy)}</b> × <b>${fmt(sz)}</b> mm`;
  const grams = vol / 1000 * 1.24 * 1.05, hrs = grams / 9 + 0.15;
  const box = $('stats'); box.textContent = '';
  for (const [a, v] of [['Rozměry', `${fmt(sx, 0)} × ${fmt(sy, 0)} × ${fmt(sz, 1)} mm`], ['Volná plocha', `${fmt((D.shape === 'flat' ? r.free : r.freeCurved) * 100, 0)} %`], ['Materiál', `${fmt(grams, 0)} g`], ['Tisk zhruba', hrs < 1 ? `${fmt(hrs * 60, 0)} min` : `${fmt(hrs, 1)} h`]]) {
    const d = document.createElement('div'); d.className = 'stat'; const s1 = document.createElement('span'); s1.textContent = a; const s2 = document.createElement('b'); s2.textContent = v; d.append(s1, s2); box.append(d);
  }
  if (fitNext) { fit('persp'); fitNext = false; } else draw();
}

/* ===== Stažení ===== */
const inViewer = !!(window.claude && typeof window.claude.use === 'function');
let dlCap = null;
if (inViewer) window.claude.use('downloads').then(d => { dlCap = d; updateNote(); }).catch(() => updateNote());
function updateNote() { $('saveNote').textContent = inViewer ? (dlCap ? 'Tady se STL stáhne zabalené v ZIP souboru.' : 'Stahování je v tomto zobrazení nedostupné.') : 'Tiskne se rámem na podložce, bez podpěr. Jednotky jsou milimetry.'; }
$('btnSave').onclick = async () => {
  if (!model) return;
  const u = stlBinary([model.g]), head = 'Created by Julius Andy Antos | Mrizky na ventilator | mm'; for (let i = 0; i < 80; i++) u[i] = i < head.length ? head.charCodeAt(i) : 32;
  const name = `mrizka_${model.r.F.S}mm_${D.pat}_${D.shape}.stl`;
  if (inViewer) { if (!dlCap) return; try { await dlCap.save({ filename: name.replace('.stl', '.zip'), data: makeZip([{ name, data: u }]) }); $('saveNote').textContent = 'ZIP je uložený.'; } catch (err) { if (err && err.code !== 'declined') $('saveNote').textContent = 'Soubor se nepodařilo uložit.'; } return; }
  const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([u], { type: 'model/stl' })); a.download = name; document.body.append(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 2000);
};

/* ===== Instalace jako aplikace a sbalitelné sekce ===== */
let installEvt = null;
window.addEventListener('beforeinstallprompt', (e) => { e.preventDefault(); installEvt = e; $('btnInstall').hidden = false; });
window.addEventListener('appinstalled', () => { installEvt = null; $('btnInstall').hidden = true; });
$('btnInstall').onclick = async () => { if (!installEvt) return; installEvt.prompt(); try { await installEvt.userChoice; } catch (e) {} installEvt = null; $('btnInstall').hidden = true; };
if (!inViewer && 'serviceWorker' in navigator && (location.protocol === 'https:' || location.hostname === 'localhost')) navigator.serviceWorker.register('sw.js').catch(() => {});
(function () {
  const KEY = 'mrizky-sbaleno';
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

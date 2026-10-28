/* ===== Jmenovky – velké písmeno se vsazeným jménem. Created by Julius Andy Antoš ===== */
const $ = (id) => document.getElementById(id);
// písma: id -> [název, je pro velké písmeno, je pro jméno]
const FONTS = {
  playfair: ['Playfair', 1, 0], dejavu: ['DejaVu Serif', 1, 0], anton: ['Anton', 1, 0], bebas: ['Bebas Neue', 1, 0], poppins: ['Poppins', 1, 0],
  baloo: ['Baloo', 1, 0], bungee: ['Bungee', 1, 0], righteous: ['Righteous', 1, 0], lobsterB: ['Lobster', 1, 0],
  dancing: ['Dancing Script', 0, 1], pacifico: ['Pacifico', 0, 1], lobster: ['Lobster', 0, 1], courgette: ['Courgette', 0, 1], caveat: ['Caveat', 0, 1], kalam: ['Kalam', 0, 1],
};
const DEF = { name: 'Amélie', letter: '', fBig: 'playfair', fName: 'dancing', H: 100, T: 16, ch: 1.6, flat: true, nw: 115, ny: 28, nx: 0, rot: -6, ow: 2.2, oh: 1.2, th: 1.2, over: 'keep',
  mode: 'one', colors: 'swap', pd: 1, c1: '#74c2a8', c2: '#f6f1e7', c3: '#e88fa6', lh: 0.2, bedX: 220, bedY: 220, bedZ: 250 };
const STORE = 'jmenovky-v1';
const D = Object.assign({}, DEF);
try { const s = JSON.parse(localStorage.getItem(STORE) || '{}'); for (const k in DEF) if (k in s && typeof s[k] === typeof DEF[k]) D[k] = s[k]; } catch (e) {}
if (!FONTS[D.fBig] || !FONTS[D.fBig][1]) D.fBig = DEF.fBig; if (!FONTS[D.fName] || !FONTS[D.fName][2]) D.fName = DEF.fName;
const saveState = () => { try { localStorage.setItem(STORE, JSON.stringify(D)); } catch (e) {} };
const fmt = (v, d = 1) => (+v).toLocaleString('cs-CZ', { maximumFractionDigits: d, minimumFractionDigits: d });
const fmtP = (v) => (+v).toLocaleString('cs-CZ', { maximumFractionDigits: 2 });
const css = (v) => getComputedStyle(document.documentElement).getPropertyValue(v).trim();
const clamp = (v, a, b) => Math.min(b, Math.max(a, +v || 0));

/* ===== Písma ===== */
const FONT_CACHE = {};
const fontBuf = (id) => { const s = atob(JM_FONTS[id]), u = new Uint8Array(s.length); for (let i = 0; i < s.length; i++) u[i] = s.charCodeAt(i); return u.buffer; };
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
const csBox = (x0, y0, x1, y1) => T(T(MF.CrossSection.square([x1 - x0, y1 - y0])).translate([x0, y0]));
const csArea = (cs) => cs.area();
// vyčištění 2D tvaru: odstraní dotyky v jednom bodě a téměř shodné vrcholy, které by v 3D daly nečisté hrany
const cl = (cs) => T(T(T(cs.offset(-0.03, 'Round')).offset(0.03, 'Round')).simplify(0.002));
const empty = (cs) => !cs || cs.isEmpty() || cs.area() < 0.01;

/* text -> 2D tvar (mm, osa y nahoru) */
function textCS(fontId, text, size) {
  const font = getFont(fontId);
  const L = layoutText(font, text, { size, lineH: 1.2, spacing: 0, align: 'left', mirror: false, slant: 0 });
  const exs = unionEx(L.paths);
  const polys = exToPaths(exs).map(p => p.map(q => [q.X / SC, q.Y / SC]));
  return { cs: T(T(new MF.CrossSection(polys, 'NonZero')).simplify(0.002)), exs, missing: L.missing };
}
// obrys bez děr (jako samolepka)
function fillHoles(cs) {
  const keep = cs.toPolygons().filter(p => { let a = 0; for (let i = 0, j = p.length - 1; i < p.length; j = i++) a += (p[j][0] - p[i][0]) * (p[j][1] + p[i][1]); return a > 0; });
  return keep.length ? T(new MF.CrossSection(keep, 'NonZero')) : cs;
}

/* ===== Geometrie ===== */
function initialOf(name) { const ch = [...name.trim()][0] || ''; return ch.toLocaleUpperCase('cs'); }
function build(msgs) {
  const name = (D.name || '').trim(), letter = (D.letter || '').trim() ? [...D.letter.trim()][0].toLocaleUpperCase('cs') : initialOf(name);
  if (!letter) { msgs.push({ lvl: 'bad', msg: 'Napište jméno nebo velké písmeno.' }); return null; }
  const H = clamp(D.H, 30, 300), Th = clamp(D.T, 3, 60), ch = Math.min(clamp(D.ch, 0, 5), Th * 0.3), lh = clamp(D.lh, 0.05, 0.4);
  // velké písmeno: výška přesně H, střed na x = 0, spodek na y = 0
  const L0 = textCS(D.fBig, letter, 100);
  if (L0.missing.length || empty(L0.cs)) { msgs.push({ lvl: 'bad', msg: `Písmeno „${letter}“ toto písmo neumí. Zvolte jiné.` }); return null; }
  let b = L0.cs.bounds(), k = H / (b.max[1] - b.min[1]);
  let Lc = T(T(L0.cs.translate([-(b.min[0] + b.max[0]) / 2, -b.min[1]])).scale([k, k]));
  let cut = 0;
  if (D.flat) { // odřízne spodek, dokud písmeno nestojí na dost široké ploše
    const W = Lc.bounds().max[0] - Lc.bounds().min[0], need = Math.min(Math.max(Th, 10), W * 0.35);
    for (let c = 0; c <= H * 0.12; c += 0.25) {
      const strip = T(Lc.intersect(csBox(-1e4, c, 1e4, c + 0.4))), len = strip.area() / 0.4;
      cut = c; if (len >= need) break;
    }
    if (cut > 0.01) { Lc = T(T(Lc.intersect(csBox(-1e4, cut, 1e4, 1e4))).translate([0, -cut])); if (cut > 1) msgs.push({ lvl: 'info', msg: `Spodek písmene je zarovnaný o ${fmtP(Math.round(cut * 10) / 10)} mm, aby stálo.` }); }
  }
  b = Lc.bounds(); const LW = b.max[0] - b.min[0], LH = b.max[1] - b.min[1];
  // písmeno se zkosením (schody po výšce vrstvy)
  const parts = [ext(Lc, 0, Th - ch)];
  if (ch > 0.05) { const n = Math.max(1, Math.round(ch / lh)); for (let i = 1; i <= n; i++) { const o = cl(T(Lc.offset(-ch * i / n, 'Round'))); if (!empty(o)) parts.push(ext(o, Th - ch - 0.3 - i * 0.0137, Th - ch + ch * i / n)); } }
  const letterSolid = T(MF.Manifold.union(parts));
  if (Th < H * 0.1) msgs.push({ lvl: 'info', msg: 'Tenké písmeno se snadno převrhne. Na stání doporučuji tloušťku aspoň desetinu výšky.' });

  // jméno
  let S = null, O = null, nameInfo = null;
  if (name) {
    const N0 = textCS(D.fName, name, 10);
    if (N0.missing.length) msgs.push({ lvl: 'warn', msg: `Písmo jména neumí znaky: ${N0.missing.join(' ')}` });
    if (!empty(N0.cs)) {
      const nb = N0.cs.bounds(), s = clamp(D.nw, 40, 160) / 100 * LW / (nb.max[0] - nb.min[0]);
      const cx = clamp(D.nx, -50, 50) / 100 * LW, cy = clamp(D.ny, 0, 100) / 100 * LH;
      S = T(T(T(T(N0.cs.translate([-(nb.min[0] + nb.max[0]) / 2, -(nb.min[1] + nb.max[1]) / 2])).scale([s, s])).rotate(clamp(D.rot, -30, 30))).translate([cx, cy]));
      const ow = clamp(D.ow, 0.8, 8);
      O = fillHoles(T(S.offset(ow, 'Round', 2, 64)));
      O = T(O.intersect(csBox(-1e4, 0, 1e4, 1e4)));   // nic pod podstavou
      if (D.over === 'clip') { O = T(O.intersect(T(Lc.offset(-0.33, 'Round')))); S = T(S.intersect(T(O.offset(-ow * 0.4, 'Round')))); }
      O = cl(O); S = cl(T(S.intersect(T(O.offset(-0.05, 'Round')))));
      const loss = thinLoss(N0.exs, 0.8 / s);
      if (loss > 0.1) msgs.push({ lvl: 'warn', msg: `Část tahů jména je tenčí než 0,8 mm (asi ${Math.round(loss * 100)} %). Zvětšete šířku jména nebo zvolte silnější písmo.` });
      nameInfo = { s };
      const ob = O.bounds(); if (ob.min[0] < b.min[0] - 0.5 || ob.max[0] > b.max[0] + 0.5) { if (D.over === 'keep' && D.mode === 'one') msgs.push({ lvl: 'info', msg: 'Jméno přesahuje písmeno. Přesah je podepřený až k podložce, takže se tiskne bez podpěr.' }); }
    }
  }
  const oh = clamp(D.oh, 0.4, 6), th = clamp(D.th, 0.4, 6), zIn = Th - ch - 0.6;
  const bodies = [], swaps = [];
  if (D.mode === 'one') {
    const z0 = D.over === 'keep' ? 0 : zIn;
    if (!O) { bodies.push({ m: letterSolid, role: 1, name: 'pismeno' }); }
    else if (D.colors === 'swap') {
      const m = T(MF.Manifold.union([letterSolid, ext(O, z0, Th + oh), ext(S, Th + oh - 0.3, Th + oh + th)]));
      bodies.push({ m, role: 0, name: 'jmenovka', bands: [[0, 1], [Th, 2], [Th + oh, 3]] });
      swaps.push([Th, 2], [Th + oh, 3]);
    } else {
      const col = T(ext(Lc, -1, zIn));
      bodies.push({ m: T(letterSolid.subtract(ext(O, zIn, Th + oh + 1))), role: 1, name: 'pismeno' });
      bodies.push({ m: T(ext(O, z0, Th + oh).subtract(col)), role: 2, name: 'obrys' });
      bodies.push({ m: ext(S, Th + oh, Th + oh + th), role: 3, name: 'jmeno' });
    }
  } else { // zvlášť: písmeno s vybráním + plochá jmenovka
    const pd = O ? clamp(D.pd, 0, 3) : 0, clr = 0.15;
    let lm = letterSolid;
    if (pd > 0) { const pk = cl(T(T(O.intersect(Lc)).offset(clr, 'Round'))); if (!empty(pk)) lm = T(lm.subtract(ext(pk, Th - pd, Th + 2))); }
    bodies.push({ m: lm, role: 1, name: 'pismeno', at: [0, 0, 0] });
    if (O) {
      const pt = Math.max(1.2, pd + oh), ob = O.bounds(), dx = b.max[0] - ob.min[0] + 8, asm = [0, 0, Th - pd];
      if (D.colors === 'swap') { bodies.push({ m: T(MF.Manifold.union([ext(O, 0, pt), ext(S, pt - 0.3, pt + th)])), role: 0, name: 'jmenovka', bands: [[0, 2], [pt, 3]], print: [dx, 0, 0], asm }); swaps.push([pt, 3, 'jmenovka']); }
      else { bodies.push({ m: ext(O, 0, pt), role: 2, name: 'obrys', print: [dx, 0, 0], asm }); bodies.push({ m: ext(S, pt, pt + th), role: 3, name: 'jmeno', print: [dx, 0, 0], asm }); }
      if (pd > 0 && D.over === 'keep') { const out = T(O.subtract(Lc)); if (!empty(out) && out.area() > 1) msgs.push({ lvl: 'info', msg: 'Jmenovka přesahuje písmeno, část mimo vybrání se jen přilepí.' }); }
    }
  }
  return { bodies, swaps, letter, name, H, Th, LW, LH, oh, th, lh, nameInfo };
}

/* ===== Ovládání ===== */
function syncUI() {
  document.querySelectorAll('[data-k]').forEach(el => { const v = D[el.dataset.k]; if (el.type === 'checkbox') el.checked = !!v; else el.value = v; });
  document.querySelectorAll('input[type=radio][name]').forEach(r => { r.checked = String(D[r.name]) === r.value; });
  updateUI();
}
function updateUI() {
  document.querySelectorAll('[data-show]').forEach(el => { el.hidden = !({ pocket: D.mode === 'parts' })[el.dataset.show]; });
  document.querySelectorAll('#fBig [data-v]').forEach(b => b.setAttribute('aria-checked', String(b.dataset.v === D.fBig)));
  document.querySelectorAll('#fName [data-v]').forEach(b => b.setAttribute('aria-checked', String(b.dataset.v === D.fName)));
  $('oW').textContent = D.nw + ' %'; $('oY').textContent = D.ny + ' %'; $('oX').textContent = (D.nx > 0 ? '+' : '') + D.nx + ' %'; $('oR').textContent = D.rot + '°';
  $('inLetter').placeholder = initialOf(D.name || '') || 'A';
  $('modeHint').textContent = D.mode === 'one'
    ? (D.colors === 'swap' ? 'Jeden soubor. Barvy se mění podle výšky, stačí dvě výměny filamentu.' : 'Tři soubory se stejným umístěním: písmeno, obrys a jméno. Načtěte je najednou jako jeden objekt.')
    : (D.colors === 'swap' ? 'Dva soubory: písmeno a jmenovka. Na jmenovce jedna výměna filamentu, pak ji vlepíte do písmene.' : 'Tři soubory: písmeno, obrys a jméno. Obrys se jménem tiskněte spolu, pak vlepte do písmene.');
}
(function () {
  const mk = (box, key, filt, sample) => { for (const id in FONTS) { if (!FONTS[id][filt]) continue; const b = document.createElement('button'); b.type = 'button'; b.setAttribute('role', 'radio'); b.dataset.v = id;
    b.innerHTML = `<span style="font-family:'jm-${id}',var(--f-ui)">${sample}</span><small>${FONTS[id][0]}</small>`; b.onclick = () => { D[key] = id; syncUI(); onChange(key); }; box.append(b); } };
  mk($('fBig'), 'fBig', 1, 'A'); mk($('fName'), 'fName', 2, 'Jana');
  if (window.FontFace) for (const id in FONTS) { try { const f = new FontFace('jm-' + id, fontBuf(id)); f.load().then(ff => document.fonts.add(ff)).catch(() => {}); } catch (e) {} }
})();
function onChange(path) { if (/^(H|T|mode|fBig|letter)$/.test(path)) fitNext = true; updateUI(); saveState(); if (/^c[123]$/.test(path)) { recolor(); return; } schedule(); }
document.querySelectorAll('[data-k]').forEach(el => el.addEventListener(el.type === 'checkbox' || el.type === 'color' ? (el.type === 'color' ? 'input' : 'change') : 'input', () => {
  const k = el.dataset.k; let v;
  if (el.type === 'checkbox') v = el.checked; else if (el.type === 'text' || el.type === 'color') v = el.value; else { v = parseFloat(el.value); if (!isFinite(v)) return; }
  D[k] = v; onChange(k);
}));
document.querySelectorAll('input[type=radio][name]').forEach(r => r.addEventListener('change', () => { D[r.name] = r.value; onChange(r.name); }));
let tmr = 0;
function schedule(now) { clearTimeout(tmr); tmr = setTimeout(() => { if (!MF) return; busy(true, 'Počítám…'); setTimeout(() => { try { rebuild(); } finally { busy(false); } }, 20); }, now ? 0 : 350); }
function busy(on, txt) { $('busy').hidden = !on; if (txt) $('busy').textContent = txt; }

/* ===== 3D scéna ===== */
const cv = $('cv');
let renderer = null, scene, camera, bedGroup, group = null, fitNext = true, model = null, stand = true;
const orbit = { theta: -Math.PI / 2, phi: 1.2, r: 300, target: new THREE.Vector3() };
function initGL() {
  try { renderer = new THREE.WebGLRenderer({ canvas: cv, antialias: true }); } catch (e) { renderer = null; return; }
  renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
  scene = new THREE.Scene(); camera = new THREE.PerspectiveCamera(30, 1, 0.5, 6000); camera.up.set(0, 0, 1);
  scene.add(new THREE.HemisphereLight(0xffffff, 0x8a9599, 0.95));
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
function resize() { if (!renderer) return; const r = $('viewer').getBoundingClientRect(); if (!r.width) return; renderer.setSize(r.width, r.height, false); camera.aspect = r.width / r.height; camera.updateProjectionMatrix(); draw(); }
let raf = 0;
function draw() { if (!renderer || raf) return; raf = requestAnimationFrame(() => { raf = 0; const t = orbit.target, s = Math.sin(orbit.phi);
  camera.position.set(t.x + orbit.r * s * Math.cos(orbit.theta), t.y + orbit.r * s * Math.sin(orbit.theta), t.z + orbit.r * Math.cos(orbit.phi)); camera.lookAt(t); renderer.render(scene, camera); }); }
function viewBox() { const bb = new THREE.Box3(); if (group) bb.setFromObject(group); return bb; }
function fit(view) {
  if (!group || !renderer) return; const b = viewBox(), sx = b.max.x - b.min.x, sy = b.max.y - b.min.y, sz = b.max.z - b.min.z;
  orbit.target.set((b.min.x + b.max.x) / 2, (b.min.y + b.max.y) / 2, sz / 2); const span = Math.max(sx, sy, sz, 20);
  orbit.r = span / (2 * Math.tan(THREE.MathUtils.degToRad(30) / 2)) * Math.max(1.1, 1.5 / camera.aspect);
  if (view === 'front') { orbit.theta = -Math.PI / 2; orbit.phi = stand ? Math.PI / 2 - 0.03 : 0.001; } else { orbit.theta = -Math.PI / 2 - 0.5; orbit.phi = stand ? 1.25 : 0.85; }
  draw();
}
$('vFront').onclick = () => fit('front'); $('vPersp').onclick = () => fit('persp');
$('vStand').onclick = () => { stand = !stand; $('vStand').setAttribute('aria-pressed', String(stand)); $('vStand').textContent = stand ? 'Jak stojí' : 'Jak se tiskne'; placeGroup(); fit('persp'); };
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

// barvy v náhledu: u jednoho tělesa s výměnou filamentu se barví podle výšky
const colOf = (role) => D['c' + role];
function bandMaterial(bands) {
  const mat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.55, metalness: 0.02, flatShading: true }); mat.userData.bands = bands; return mat;
}
function paint(mesh) {
  const g = mesh.geometry, bands = mesh.userData.bands, role = mesh.userData.role;
  if (!bands) { mesh.material.color = new THREE.Color(colOf(role)); return; }
  const p = g.attributes.position.array, n = p.length / 3, c = new Float32Array(n * 3), cols = bands.map(b => new THREE.Color(colOf(b[1])));
  for (let t = 0; t < n; t += 3) { const zc = (p[3 * t + 2] + p[3 * t + 5] + p[3 * t + 8]) / 3; let k = 0; for (let i = 0; i < bands.length; i++) if (zc > bands[i][0] + 0.001) k = i;
    for (let j = 0; j < 3; j++) { c[3 * (t + j)] = cols[k].r; c[3 * (t + j) + 1] = cols[k].g; c[3 * (t + j) + 2] = cols[k].b; } }
  g.setAttribute('color', new THREE.BufferAttribute(c, 3));
}
function recolor() { if (!group) return; group.children.forEach(m => paint(m)); draw(); updateSwaps(); }
function placeGroup() {
  if (!group || !model) return;
  const zmin = model.zmin;
  group.children.forEach(m => { const it = m.userData.item, t = stand ? (it.asm || [0, 0, 0]) : (it.print || [0, 0, 0]); m.position.set(t[0], t[1], t[2] - zmin); });
  group.rotation.set(stand ? Math.PI / 2 : 0, 0, 0); group.position.set(0, 0, 0);
  group.updateMatrixWorld(true); const bb = new THREE.Box3().setFromObject(group);
  group.position.set(-(bb.min.x + bb.max.x) / 2, -(bb.min.y + bb.max.y) / 2, -bb.min.z);
  draw();
}

/* ===== Výpočet ===== */
function rebuild() {
  const msgs = []; let r = null;
  try { r = build(msgs); } catch (e) { console.error(e); msgs.push({ lvl: 'bad', msg: 'Jmenovku se nepodařilo spočítat. Zkuste jiné písmo nebo rozměry.' }); r = null; }
  if (group) { scene && scene.remove(group); group.traverse(o => { o.geometry && o.geometry.dispose(); o.material && o.material.dispose(); }); group = null; }
  if (!r) { model = null; freeAll(); $('btnSave').disabled = true; showMsgs(msgs); $('stats').textContent = ''; $('swaps').textContent = ''; $('dims').textContent = '–'; draw(); return; }
  let vol = 0, zmin = Infinity;
  const items = r.bodies.map(bd => { const g = toGeom(bd.m); vol += bd.m.volume(); g.computeBoundingBox(); zmin = Math.min(zmin, g.boundingBox.min.z); return Object.assign({ g }, bd, { m: null }); });
  freeAll();
  model = { items, r, zmin };
  group = new THREE.Group();
  for (const it of items) { it.g.computeVertexNormals(); const mesh = new THREE.Mesh(it.g, it.bands ? bandMaterial(it.bands) : new THREE.MeshStandardMaterial({ roughness: 0.55, metalness: 0.02, flatShading: true })); mesh.userData = { item: it, role: it.role, bands: it.bands }; paint(mesh); group.add(mesh); }
  if (renderer) scene.add(group);
  placeGroup();
  // rozměry dílů na tiskové ploše
  const bb = new THREE.Box3(); for (const it of items) { const b = it.g.boundingBox.clone(); const t = it.print || [0, 0, 0]; b.translate(new THREE.Vector3(...t)); bb.union(b); }
  const sx = bb.max.x - bb.min.x, sy = bb.max.y - bb.min.y, sz = bb.max.z - bb.min.z;
  if (sx > D.bedX || sy > D.bedY || sz > D.bedZ) msgs.push({ lvl: 'warn', msg: `Jmenovka (${fmt(sx, 0)} × ${fmt(sy, 0)} mm) se nevejde na tiskovou plochu. Zmenšete výšku písmene.` });
  const lh = r.lh, notMul = (v) => Math.abs(v / lh - Math.round(v / lh)) > 0.01;
  if (r.swaps.length && (notMul(r.Th) || notMul(r.oh))) msgs.push({ lvl: 'info', msg: `Tloušťka písmene a výšky obrysu a jména by měly být násobkem výšky vrstvy ${fmtP(lh)} mm, aby výměna barvy vyšla přesně na hranu.` });
  showMsgs(msgs);
  const AB = (() => { const b = new THREE.Box3(); for (const it of items) { const x = it.g.boundingBox.clone(); x.translate(new THREE.Vector3(...(it.asm || [0, 0, 0]))); b.union(x); } return b; })();
  $('dims').innerHTML = `<b>${fmt(AB.max.x - AB.min.x)}</b> × <b>${fmt(AB.max.y - AB.min.y)}</b> × <b>${fmt(AB.max.z - AB.min.z)}</b> mm`;
  $('btnSave').disabled = false; $('btnSave').textContent = items.length > 1 ? `Stáhnout STL (${items.length} soubory)` : 'Stáhnout STL';
  const grams = vol / 1000 * 1.24 * 0.45, hrs = grams / 11 + 0.2;   // výplň zhruba 15 %, stěny a vrchní vrstvy
  const bx = $('stats'); bx.textContent = '';
  for (const [a, v] of [['Jmenovka', (r.letter + ' · ' + (r.name || '—')).slice(0, 28)], ['Rozměry', `${fmt(AB.max.x - AB.min.x, 0)} × ${fmt(AB.max.y - AB.min.y, 0)} × ${fmt(AB.max.z - AB.min.z, 1)} mm`], ['Materiál', `${fmt(Math.max(1, grams), 0)} g`], ['Tisk zhruba', hrs < 1 ? `${fmt(hrs * 60, 0)} min` : `${fmt(hrs, 1)} h`]]) {
    const d = document.createElement('div'); d.className = 'stat'; const s1 = document.createElement('span'); s1.textContent = a; const s2 = document.createElement('b'); s2.textContent = v; d.append(s1, s2); bx.append(d);
  }
  updateSwaps();
  if (fitNext) { fit('persp'); fitNext = false; } else draw();
}
function updateSwaps() {
  const bx = $('swaps'); bx.textContent = ''; if (!model) return; const r = model.r, lh = r.lh;
  const line = (html) => { const d = document.createElement('div'); d.innerHTML = html; bx.append(d); };
  const sw = (c) => `<i style="background:${colOf(c)}"></i>`;
  if (r.swaps.length) {
    line(`<b>Výměna filamentu</b> (vrstva ${fmtP(lh)} mm, první vrstva stejně vysoká):`);
    line(`${sw(D.mode === 'one' ? 1 : 2)}začátek tisku${D.mode === 'parts' ? ' jmenovky' : ''}`);
    for (const [z, c] of r.swaps) line(`${sw(c)}od výšky ${fmtP(Math.round(z * 100) / 100)} mm → vrstva č. ${Math.round(z / lh) + 1} (končí ve ${fmtP(Math.round((z + lh) * 100) / 100)} mm)`);
  } else if (D.colors === 'ams') line('Každý soubor jeden díl jedné barvy: ' + model.items.map(it => `${sw(it.role)}${it.name}`).join(' &nbsp; '));
}

/* ===== Stažení ===== */
const inViewer = !!(window.claude && typeof window.claude.use === 'function');
let dlCap = null;
if (inViewer) window.claude.use('downloads').then(d => { dlCap = d; updateNote(); }).catch(() => updateNote());
function updateNote() { $('saveNote').textContent = inViewer ? (dlCap ? 'Tady se soubory stáhnou zabalené v ZIP.' : 'Stahování je v tomto zobrazení nedostupné.') : 'Díly jsou natočené tak, jak se tisknou. Jednotky jsou milimetry.'; }
$('btnSave').onclick = async () => {
  if (!model) return;
  const base = ('jmenovka_' + (model.r.name || model.r.letter)).normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^A-Za-z0-9_-]+/g, '_');
  const enc = (g) => { const u = stlBinary([g]), head = 'Created by Julius Andy Antos | Jmenovky | mm'; for (let i = 0; i < 80; i++) u[i] = i < head.length ? head.charCodeAt(i) : 32; return u; };
  // díly pro vícebarevný tisk mají společný počátek, aby do sebe ve sliceru zapadly
  const files = model.items.map(it => ({ name: `${base}_${it.name}.stl`, data: enc(it.g) }));
  if (files.length === 1) files[0].name = base + '.stl';
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
  const KEY = 'jmenovky-sbaleno';
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

/* ===== Panty – tištěné vcelku, na kolík, pružné, zkušební sada. Created by Julius Andy Antoš ===== */
const $ = (id) => document.getElementById(id);
const TYPES = [
  ['pip', 'Vcelku', '<rect x="3" y="15" width="12" height="4"/><rect x="19" y="15" width="12" height="4"/><circle cx="17" cy="14" r="4"/><circle cx="17" cy="14" r="1.5" class="f"/>'],
  ['pin', 'Na kolík', '<rect x="3" y="15" width="12" height="4"/><rect x="19" y="15" width="12" height="4"/><circle cx="17" cy="14" r="4"/><path d="M5 14h24" stroke-dasharray="2 1.5"/>'],
  ['living', 'Pružný', '<path d="M3 15h12c1 0 1.5 3 2 3s1-3 2-3h12v4H3z"/>'],
  ['test', 'Zkušební sada', '<rect x="4" y="5" width="26" height="5" rx="1"/><rect x="4" y="13" width="26" height="5" rx="1"/><rect x="4" y="21" width="26" height="5" rx="1"/>'],
];
const PINS = { fil: [1.75, 'filament 1,75 mm'], f285: [2.85, 'filament 2,85 mm'], nail2: [2, 'hřebík 2 mm'], m3: [3, 'šroub M3'], m4: [4, 'šroub M4'], m5: [5, 'šroub M5'] };
const DEF = { type: 'pip', L: 40, W: 16, t: 3, D: 7, n: '5', c: 0.35, pin: 'fil', pd: 2, tf: 0.5, wf: 3, nh: '2', scr: '3', csk: true, c0: 0.2, cs: 0.05, cn: 5, bedX: 220, bedY: 220, bedZ: 250 };
const STORE = 'panty-v1';
const D = Object.assign({}, DEF);
try { const s = JSON.parse(localStorage.getItem(STORE) || '{}'); for (const k in DEF) if (k in s && typeof s[k] === typeof DEF[k]) D[k] = s[k]; } catch (e) {}
const saveState = () => { try { localStorage.setItem(STORE, JSON.stringify(D)); } catch (e) {} };
const fmt = (v, d = 1) => (+v).toLocaleString('cs-CZ', { maximumFractionDigits: d, minimumFractionDigits: d });
const fmtP = (v) => (+v).toLocaleString('cs-CZ', { maximumFractionDigits: 2 });
const css = (v) => getComputedStyle(document.documentElement).getPropertyValue(v).trim();
const clamp = (v, a, b) => Math.min(b, Math.max(a, +v || 0));

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
const U = (list) => T(MF.Manifold.union(list.filter(Boolean)));
const sub = (a, b) => T(a.subtract(b));
const box = (x0, y0, z0, x1, y1, z1) => T(T(MF.Manifold.cube([x1 - x0, y1 - y0, z1 - z0])).translate([x0, y0, z0]));
const segs = (r) => Math.max(40, Math.min(128, Math.round(r * 16)));
// válec v ose x od x0 do x1, osa ve výšce z
const xcyl = (r, x0, x1, y, z) => T(T(T(MF.Manifold.cylinder(x1 - x0, r, r, segs(r))).rotate([0, 90, 0])).translate([x0, y, z]));
// hranol v ose x z mnohoúhelníku zadaného v rovině (y, z); otočení kolem y o 90° mapuje (u, v, w) -> (w, v, -u)
const xprism = (polys, x0, x1) => T(T(T(T(new MF.CrossSection(polys.map(p => p.map(([y, z]) => [-z, y])), 'NonZero')).extrude(x1 - x0)).rotate([0, 90, 0])).translate([x0, 0, 0]));
// díra ve tvaru kapky (špička nahoru), aby se strop díry vytiskl bez podpěr
function xtear(r, x0, x1, y, z) {
  const n = segs(r); // oblouk od 45° vpravo nahoře přes spodek k 45° vlevo nahoře, pak špička
  const arc = []; for (let i = 0; i <= n; i++) { const a = Math.PI / 4 - i / n * 1.5 * Math.PI; arc.push([y + r * Math.cos(a), z + r * Math.sin(a)]); }
  arc.push([y, z + r * Math.SQRT2]);
  return xprism([arc], x0, x1);
}
// díra na šroub (svislá) se zahloubením nahoře
function screwHole(d, x, y, t, csk) {
  const r = d / 2 + 0.2, parts = [T(T(MF.Manifold.cylinder(t + 2, r, r, 40)).translate([x, y, -1]))];
  if (csk) { const R = d + 0.4, h = Math.min(t - 0.6, R - r); if (h > 0.3) parts.push(T(T(MF.Manifold.cylinder(h + 0.01, R - h, R, 48)).translate([x, y, t - h]))); }
  return U(parts);
}

/* ===== Pant s klouby (vcelku nebo na kolík) ===== */
function knuckleHinge(o, msgs) {
  const L = o.L, W = o.W, R = o.D / 2, c = o.c, n = o.n, t = Math.min(o.t, o.D), z = R;
  const s = (L - (n - 1) * c) / n;
  const segA = [], segB = [];
  for (let k = 0; k < n; k++) { const x0 = k * (s + c); (k % 2 ? segB : segA).push([x0, x0 + s]); }
  const e = c * 0.8;
  let leafA = box(0, -W, 0, L, 0, t), leafB = box(0, 0, 0, L, W, t);
  // křídlo nesmí zasahovat do kloubů druhého dílu
  leafA = sub(leafA, U(segB.map(([a, b]) => xcyl(R + c, a - e, b + e, 0, z))));
  leafB = sub(leafB, U(segA.map(([a, b]) => xcyl(R + c, a - e, b + e, 0, z))));
  let A = U([leafA, ...segA.map(([a, b]) => xcyl(R, a, b, 0, z))]);
  let B = U([leafB, ...segB.map(([a, b]) => xcyl(R, a, b, 0, z))]);
  let pinInfo = '';
  if (o.kind === 'pip') {
    const rp = Math.max(0.9, Math.min(R - c - 1.0, R * 0.45));
    if (R - (rp + c) < 0.9) msgs.push({ lvl: 'warn', msg: 'Kloub je na tuto vůli moc malý, stěna kolem čepu by byla tenčí než 0,9 mm. Zvětšete průměr kloubu.' });
    A = U([A, xcyl(rp, 0.01, L - 0.01, 0, z)]);
    B = sub(B, xtear(rp + c, -1, L + 1, 0, z));
    pinInfo = `čep ⌀ ${fmtP(Math.round(rp * 20) / 10)} mm`;
  } else {
    const pd = o.pd, rh = pd / 2 + Math.max(0.1, c * 0.5);
    if (R - rh < 1) msgs.push({ lvl: 'warn', msg: `Na kolík ⌀ ${fmtP(pd)} mm je kloub malý, stěna by byla tenčí než 1 mm. Zvětšete průměr kloubu aspoň na ${fmtP(Math.ceil((rh + 1.2) * 4) / 2)} mm.` });
    const hole = xtear(rh, -1, L + 1, 0, z); A = sub(A, hole); B = sub(B, hole);
    pinInfo = `díra ⌀ ${fmtP(Math.round(rh * 20) / 10)} mm`;
  }
  // díry na šrouby
  if (o.nh > 0) {
    const free0 = R + c + 0.6, yc = (free0 + W) / 2, d = o.scr, need = d + 3;
    if (W - free0 < need) msgs.push({ lvl: 'warn', msg: `Na šroub ${fmtP(d)} mm je křídlo úzké. Zvětšete šířku křídla aspoň na ${fmtP(Math.ceil(free0 + need))} mm.` });
    else {
      const xs = []; for (let i = 0; i < o.nh; i++) xs.push(L * (i + 0.5) / o.nh);
      A = sub(A, U(xs.map(x => screwHole(d, x, -yc, t, o.csk))));
      B = sub(B, U(xs.map(x => screwHole(d, x, yc, t, o.csk))));
    }
  }
  if (o.t > o.D) msgs.push({ lvl: 'info', msg: 'Křídlo nemůže být silnější než kloub, tloušťka je upravená na průměr kloubu.' });
  else if (t > R + 0.01 && o.kind !== 'test') msgs.push({ lvl: 'info', msg: `Křídla jsou silnější než polovina kloubu (${fmtP(R)} mm), pant proto nepůjde sklapnout úplně naplocho. Pro plné sklopení zvolte tloušťku do ${fmtP(R)} mm nebo větší kloub.` });
  return { A, B, axis: z, pinInfo, s };
}
function livingHinge(o, msgs) {
  const L = o.L, W = o.W, t = o.t, tf = Math.min(o.tf, t - 0.4), wf = o.wf;
  let m = sub(box(0, -W, 0, L, W, t), box(-1, -wf / 2, tf, L + 1, wf / 2, t + 1));
  // zkosené hrany drážky, aby se ohyb nelámal v jednom místě
  const ch = Math.min(t - tf, wf) * 0.6;
  if (ch > 0.3) for (const sy of [-1, 1]) m = sub(m, xprism([[[sy * wf / 2, t + 0.01], [sy * (wf / 2 + ch), t + 0.01], [sy * wf / 2, t - ch]]], -1, L + 1));
  if (o.nh > 0) {
    const yc = (wf / 2 + ch + W) / 2, xs = []; for (let i = 0; i < o.nh; i++) xs.push(L * (i + 0.5) / o.nh);
    if (W - wf / 2 - ch < o.scr + 3) msgs.push({ lvl: 'warn', msg: 'Na šrouby je křídlo úzké. Zvětšete šířku křídla.' });
    else m = sub(m, U(xs.flatMap(x => [screwHole(o.scr, x, -yc, t, o.csk), screwHole(o.scr, x, yc, t, o.csk)])));
  }
  if (tf < 0.35) msgs.push({ lvl: 'warn', msg: 'Ohyb tenčí než 0,35 mm se nemusí vytisknout celistvě (méně než dvě vrstvy).' });
  msgs.push({ lvl: 'info', msg: `Ohyb ${fmtP(tf)} mm silný a ${fmtP(wf)} mm široký. Tiskněte drážkou nahoru, ohyb je tak vytištěný ze spodních vrstev v jednom tahu podél pantu.` });
  return m;
}
/* popisky zkušební sady */
let FONT = null;
function labelCS(txt, h) {
  if (!FONT) { const s = atob(PANTY_FONTS.sans), u = new Uint8Array(s.length); for (let i = 0; i < s.length; i++) u[i] = s.charCodeAt(i); FONT = opentype.parse(u.buffer); }
  const L = layoutText(FONT, txt, { size: h, lineH: 1.2, spacing: 0.2, align: 'center', mirror: false, slant: 0 });
  const polys = exToPaths(unionEx(L.paths)).map(p => p.map(q => [q.X / SC, q.Y / SC]));
  return T(T(new MF.CrossSection(polys, 'NonZero')).simplify(0.002));
}

/* ===== Sestavení podle typu ===== */
function build(msgs) {
  const o = { kind: D.type, L: clamp(D.L, 10, 300), W: clamp(D.W, 5, 100), t: clamp(D.t, 1, 20), D: clamp(D.D, 3, 40), n: +D.n || 5, c: clamp(D.c, 0.1, 1), nh: +D.nh || 0, scr: +D.scr || 3, csk: !!D.csk, tf: clamp(D.tf, 0.2, 2), wf: clamp(D.wf, 0.5, 15) };
  o.pd = D.pin === 'custom' ? clamp(D.pd, 1, 12) : PINS[D.pin][0];
  if (D.type === 'living') { const m = livingHinge(o, msgs); return { bodies: [{ m, name: 'pant', part: 'A' }], info: `pružný pant ${fmtP(o.L)} mm`, name: `pant_pruzny_${o.L}mm` }; }
  if (D.type === 'test') {
    const c0 = clamp(D.c0, 0.05, 1), cs = clamp(D.cs, 0.02, 0.3), cn = Math.round(clamp(D.cn, 2, 10)), Dk = clamp(D.D, 3, 40);
    const bodies = [], gap = 4, W = Math.max(9, Dk / 2 + 7), L = 26;
    for (let i = 0; i < cn; i++) {
      const c = Math.round((c0 + i * cs) * 1000) / 1000, y = i * (2 * W + gap);
      const h = knuckleHinge({ kind: 'pip', L, W, t: Math.min(3, Dk), D: Dk, n: 3, c, nh: 0 }, i ? [] : msgs);
      const lbl = labelCS(fmtP(c).replace('.', ','), Math.min(4, W - Dk / 2 - c - 2.5));
      const lb = lbl.bounds(), yc = -(Dk / 2 + c + W) / 2 - 0.3;
      const eng = T(T(lbl.extrude(1)).translate([L / 2 - (lb.min[0] + lb.max[0]) / 2, yc - (lb.min[1] + lb.max[1]) / 2, Math.min(3, Dk) - 0.6]));
      bodies.push({ m: T(T(sub(h.A, eng)).translate([0, y, 0])), name: 'A' + i, part: 'A', axis: [y, h.axis] }, { m: T(h.B.translate([0, y, 0])), name: 'B' + i, part: 'B', axis: [y, h.axis] });
    }
    msgs.push({ lvl: 'info', msg: `${cn} pantů s vůlí ${fmtP(c0)} až ${fmtP(Math.round((c0 + (cn - 1) * cs) * 1000) / 1000)} mm, číslo je vyryté na křídle. Po tisku zkuste každým otočit a pamatujte si nejmenší vůli, která se uvolnila.` });
    return { bodies, info: `zkušební sada ${cn}×`, name: `panty_zkusebni_sada`, single: true };
  }
  const h = knuckleHinge(o, msgs);
  const info = D.type === 'pip' ? `pant vcelku, ${o.n} článků` : `pant na ${D.pin === 'custom' ? 'kolík ⌀ ' + fmtP(o.pd) + ' mm' : PINS[D.pin][1]}`;
  msgs.push({ lvl: 'info', msg: `Články ${fmtP(Math.round(h.s * 10) / 10)} mm, vůle ${fmtP(o.c)} mm, ${h.pinInfo}.${D.type === 'pin' ? ' Díly se tisknou sestavené, kolík zasuňte po tisku.' : ''}` });
  if (h.s < 3) msgs.push({ lvl: 'warn', msg: 'Články jsou kratší než 3 mm. Zmenšete počet článků nebo prodlužte pant.' });
  return { bodies: [{ m: h.A, name: 'A', part: 'A', axis: [0, h.axis] }, { m: h.B, name: 'B', part: 'B', axis: [0, h.axis] }], info, name: `pant_${D.type === 'pip' ? 'vcelku' : 'na_kolik'}_${o.L}mm`, single: true };
}

/* ===== Ovládání ===== */
function syncUI() {
  document.querySelectorAll('[data-k]').forEach(el => { const v = D[el.dataset.k]; if (el.type === 'checkbox') el.checked = !!v; else el.value = v; });
  updateUI();
}
function updateUI() {
  const show = { hinge: D.type !== 'test', knuckle: D.type === 'pip' || D.type === 'pin', pin: D.type === 'pin', pinCustom: D.pin === 'custom', living: D.type === 'living', holes: D.type !== 'test', hasHoles: +D.nh > 0, test: D.type === 'test' };
  document.querySelectorAll('[data-show]').forEach(el => { el.hidden = !show[el.dataset.show]; });
  document.querySelectorAll('#types [data-v]').forEach(b => b.setAttribute('aria-checked', String(b.dataset.v === D.type)));
  $('stHoles').textContent = D.type === 'pip' ? '3' : '4';
  $('typeHint').textContent = { pip: 'Vytiskne se i s čepem uvnitř a hned se otáčí. Potřebuje správnou vůli, zjistíte ji zkušební sadou.', pin: 'Dva díly s dírou, osu tvoří kus filamentu, hřebík nebo šroub. Nejspolehlivější varianta.', living: 'Jeden kus s tenkým ohebným místem. Pro PP, PETG nebo TPU.', test: 'Řada malých pantů s rostoucí vůlí. Podle ní nastavíte vůli pro vlastní panty.' }[D.type];
  const pd = D.pin === 'custom' ? clamp(D.pd, 1, 12) : PINS[D.pin][0];
  $('pinHint').textContent = `Díra ⌀ ${fmtP(Math.round((pd + 2 * Math.max(0.1, clamp(D.c, 0.1, 1) * 0.5)) * 100) / 100)} mm. Kloub doporučuji aspoň ⌀ ${fmtP(Math.ceil((pd + 3) * 2) / 2)} mm.`;
  $('testHint').textContent = `Vůle ${fmtP(clamp(D.c0, 0.05, 1))} až ${fmtP(Math.round((clamp(D.c0, 0.05, 1) + (Math.round(clamp(D.cn, 2, 10)) - 1) * clamp(D.cs, 0.02, 0.3)) * 1000) / 1000)} mm.`;
  $('vFold').hidden = D.type === 'living';
}
(function () {
  const tb = $('types'); for (const [v, n, svg] of TYPES) { const b = document.createElement('button'); b.type = 'button'; b.setAttribute('role', 'radio'); b.dataset.v = v; b.innerHTML = `<svg viewBox="0 0 34 30">${svg}</svg>${n}`; b.onclick = () => { D.type = v; syncUI(); onChange('type'); }; tb.append(b); }
})();
function onChange(path) { if (/^(type|L|W|cn)$/.test(path)) fitNext = true; updateUI(); saveState(); schedule(); }
document.querySelectorAll('[data-k]').forEach(el => el.addEventListener(el.type === 'checkbox' || el.tagName === 'SELECT' ? 'change' : 'input', () => {
  const k = el.dataset.k; let v;
  if (el.type === 'checkbox') v = el.checked; else if (el.tagName === 'SELECT') v = el.value; else { v = parseFloat(el.value); if (!isFinite(v)) return; }
  D[k] = v; onChange(k);
}));
let tmr = 0;
function schedule(now) { clearTimeout(tmr); tmr = setTimeout(() => { if (!MF) return; busy(true, 'Počítám…'); setTimeout(() => { try { rebuild(); } finally { busy(false); } }, 20); }, now ? 0 : 350); }
function busy(on, txt) { $('busy').hidden = !on; if (txt) $('busy').textContent = txt; }

/* ===== 3D scéna ===== */
const cv = $('cv');
let renderer = null, scene, camera, bedGroup, group = null, fitNext = true, model = null, fold = false, foldAnim = 0;
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
  orbit.target.set(0, 0, sz / 2); const span = Math.max(sx, sy, sz, 20);
  orbit.r = span / (2 * Math.tan(THREE.MathUtils.degToRad(30) / 2)) * Math.max(1.15, 1.6 / camera.aspect);
  if (view === 'front') { orbit.theta = Math.PI; orbit.phi = Math.PI / 2 - 0.05; } else if (view === 'top') { orbit.theta = -Math.PI / 2; orbit.phi = 0.001; } else { orbit.theta = -Math.PI / 2 - 0.55; orbit.phi = 0.95; }
  draw();
}
$('vFront').onclick = () => fit('front'); $('vTop').onclick = () => fit('top'); $('vPersp').onclick = () => fit('persp');
// náhled ohnutí: díl B se otočí kolem osy kloubu
function setFold(a) { if (!group) return; for (const m of group.children) { if (m.userData.part !== 'B') continue; const [y, z] = m.userData.axis; m.position.set(0, 0, 0); m.rotation.set(0, 0, 0); const p = new THREE.Object3D(); m.updateMatrix(); const M = new THREE.Matrix4().makeTranslation(0, y, z).multiply(new THREE.Matrix4().makeRotationX(a)).multiply(new THREE.Matrix4().makeTranslation(0, -y, -z)); m.matrix.copy(M); m.matrixAutoUpdate = false; } draw(); }
$('vFold').onclick = () => { fold = !fold; $('vFold').setAttribute('aria-pressed', String(fold)); const a0 = foldAnim, a1 = fold ? Math.PI * 0.75 : 0, t0 = performance.now();
  const step = (now) => { const k = Math.min(1, (now - t0) / 700), e = k < 0.5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2; foldAnim = a0 + (a1 - a0) * e; setFold(foldAnim); if (k < 1) requestAnimationFrame(step); }; requestAnimationFrame(step); };
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
function rebuild() {
  const msgs = []; let r = null;
  try { r = build(msgs); } catch (e) { console.error(e); msgs.push({ lvl: 'bad', msg: 'Pant se nepodařilo spočítat. Zkuste jiné rozměry.' }); r = null; }
  if (group) { scene && scene.remove(group); group.traverse(o => { o.geometry && o.geometry.dispose(); o.material && o.material.dispose(); }); group = null; }
  if (!r) { model = null; freeAll(); $('btnSave').disabled = true; showMsgs(msgs); $('stats').textContent = ''; $('dims').textContent = '–'; draw(); return; }
  let vol = 0; const items = r.bodies.map(b => { vol += b.m.volume(); const g = toGeom(b.m); return { g, part: b.part, axis: b.axis || [0, 0], name: b.name }; });
  freeAll();
  const bb = new THREE.Box3(); for (const it of items) { it.g.computeBoundingBox(); bb.union(it.g.boundingBox); }
  const cx = (bb.min.x + bb.max.x) / 2, cy = (bb.min.y + bb.max.y) / 2;
  for (const it of items) { it.g.translate(-cx, -cy, 0); it.axis = [it.axis[0] - cy, it.axis[1]]; it.g.computeBoundingBox(); }
  bb.translate(new THREE.Vector3(-cx, -cy, 0));
  model = { items, bbox: bb, name: r.name };
  group = new THREE.Group();
  const colA = new THREE.Color('#0b7a72'), colB = new THREE.Color('#e07a3f');
  for (const it of items) { it.g.computeVertexNormals(); const m = new THREE.Mesh(it.g, new THREE.MeshStandardMaterial({ color: it.part === 'B' ? colB : colA, roughness: 0.55, metalness: 0.03, flatShading: true })); m.userData = { part: it.part, axis: it.axis }; group.add(m); }
  if (renderer) scene.add(group);
  if (foldAnim) setFold(foldAnim);
  const sx = bb.max.x - bb.min.x, sy = bb.max.y - bb.min.y, sz = bb.max.z - bb.min.z;
  if (sx > D.bedX || sy > D.bedY || sz > D.bedZ) msgs.push({ lvl: 'warn', msg: `Pant (${fmt(sx, 0)} × ${fmt(sy, 0)} mm) se nevejde na tiskovou plochu.` });
  showMsgs(msgs);
  $('btnSave').disabled = false;
  $('dims').innerHTML = `<b>${fmt(sx)}</b> × <b>${fmt(sy)}</b> × <b>${fmt(sz)}</b> mm`;
  const grams = vol / 1000 * 1.24 * 0.85, hrs = grams / 9 + 0.12;
  const bx = $('stats'); bx.textContent = '';
  for (const [a, v] of [['Díl', r.info], ['Rozměry', `${fmt(sx, 1)} × ${fmt(sy, 1)} × ${fmt(sz, 1)} mm`], ['Materiál', `${fmt(Math.max(0.5, grams), grams < 10 ? 1 : 0)} g`], ['Tisk zhruba', hrs < 1 ? `${fmt(hrs * 60, 0)} min` : `${fmt(hrs, 1)} h`]]) {
    const d = document.createElement('div'); d.className = 'stat'; const s1 = document.createElement('span'); s1.textContent = a; const s2 = document.createElement('b'); s2.textContent = v; d.append(s1, s2); bx.append(d);
  }
  if (fitNext) { fit('persp'); fitNext = false; } else draw();
}

/* ===== Stažení ===== */
const inViewer = !!(window.claude && typeof window.claude.use === 'function');
let dlCap = null;
if (inViewer) window.claude.use('downloads').then(d => { dlCap = d; updateNote(); }).catch(() => updateNote());
function updateNote() { $('saveNote').textContent = inViewer ? (dlCap ? 'Tady se STL stáhne zabalené v ZIP souboru.' : 'Stahování je v tomto zobrazení nedostupné.') : 'Pant je rozložený tak, jak se tiskne, oba díly v jednom souboru. Jednotky jsou milimetry.'; }
$('btnSave').onclick = async () => {
  if (!model) return;
  // všechny díly do jednoho STL: tisknou se najednou, jak leží
  const u = stlBinary(model.items.map(it => it.g)), head = 'Created by Julius Andy Antos | Panty | mm'; for (let i = 0; i < 80; i++) u[i] = i < head.length ? head.charCodeAt(i) : 32;
  const name = model.name + '.stl';
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
  const KEY = 'panty-sbaleno';
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

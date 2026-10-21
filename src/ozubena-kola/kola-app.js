/* ===== Ozubená kola — aplikace. Created by Julius Andy Antoš ===== */
const $ = (id) => document.getElementById(id);
const DEF = {
  type: 'gear', m: 1.5, z1: 24, z2: 12, np: 3, zr: 20, b: 8, tooth: 'spur', beta: 20, alpha: 20, bl: 0.15,
  bore: 'round', bd: 5, bc: 0.2, hh: 0, hd: 0, light: false, rim: 4, rackH: 6,
  bedX: 220, bedY: 220, bedZ: 250,
};
const STORE = 'ozubena-kola-v1';
const D = Object.assign({}, DEF);
try { const s = JSON.parse(localStorage.getItem(STORE) || '{}'); for (const k in DEF) if (k in s && typeof s[k] === typeof DEF[k]) D[k] = s[k]; } catch (e) {}
const saveState = () => { try { localStorage.setItem(STORE, JSON.stringify(D)); } catch (e) {} };
const fmt = (v, d = 1) => v.toLocaleString('cs-CZ', { maximumFractionDigits: d, minimumFractionDigits: d });
const fmtP = (v) => v.toLocaleString('cs-CZ', { maximumFractionDigits: 2 });
const css = (v) => getComputedStyle(document.documentElement).getPropertyValue(v).trim();
const clamp = (v, a, b) => Math.min(b, Math.max(a, +v || 0));
const COLS = ['#0b7a72', '#e07a3f', '#b9c3c7', '#3d6fb6'];
const MODS = [0.5, 0.8, 1, 1.25, 1.5, 2, 2.5, 3];

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

/* ===== Evolventní profil ===== */
const inv = (a) => Math.tan(a) - a;
/* obrys vnějšího kola (body proti směru hodin). add/ded = hlava/pata zubu v násobcích modulu, s = tloušťka zubu na roztečné kružnici */
function gearOutline(z, m, alphaDeg, s, add = 1, ded = 1.25) {
  const a = alphaDeg * Math.PI / 180, r = m * z / 2, rb = r * Math.cos(a), ra = r + add * m, rf = Math.max(0.5, r - ded * m);
  const half = s / (2 * r) + inv(a);                     // úhel poloviny zubu na základní kružnici (od středu zubu)
  const th = (rho) => half - inv(Math.acos(Math.min(1, rb / Math.max(rb, rho))));
  const r0 = Math.max(rb, rf), N = 10, step = 2 * Math.PI / z, pts = [];
  const tipHalf = Math.max(0.0005, th(ra)), rootHalf = Math.min(step / 2 - 0.0005, th(r0));
  const P = (rho, ang) => pts.push([rho * Math.cos(ang), rho * Math.sin(ang)]);
  for (let k = 0; k < z; k++) {
    const c = k * step;
    if (rf < r0 - 1e-6) P(rf, c - rootHalf);                          // pata: radiálně od patní kružnice k základní
    for (let i = 0; i <= N; i++) { const rho = r0 + (ra - r0) * i / N; P(rho, c - Math.max(tipHalf, th(rho))); }
    for (let i = 1; i < 4; i++) P(ra, c - tipHalf + 2 * tipHalf * i / 4);  // hlava zubu
    for (let i = N; i >= 0; i--) { const rho = r0 + (ra - r0) * i / N; P(rho, c + Math.max(tipHalf, th(rho))); }
    if (rf < r0 - 1e-6) P(rf, c + rootHalf);
    const gap = step - 2 * rootHalf, nr = Math.max(1, Math.round(gap / 0.12));   // patní kružnice mezi zuby
    for (let i = 1; i < nr; i++) P(rf, c + rootHalf + gap * i / nr);
  }
  return { pts, r, rb, ra, rf };
}
const cs = (pts) => T(new MF.CrossSection([pts]));
/* vytažení profilu: rovné, šikmé (twist) nebo šípové */
function extrudeGear(sec, b, r, hand) {
  const tooth = D.tooth;
  if (tooth === 'spur' || !r) return T(sec.extrude(b));
  const beta = clamp(D.beta, 5, 45) * Math.PI / 180;
  if (tooth === 'helical') { const tw = hand * b * Math.tan(beta) / r * 180 / Math.PI; return T(sec.extrude(b, Math.max(2, Math.ceil(Math.abs(tw) / 1.5)), tw)); }
  const tw = hand * (b / 2) * Math.tan(beta) / r * 180 / Math.PI, n = Math.max(2, Math.ceil(Math.abs(tw) / 1.5));
  const lower = T(sec.extrude(b / 2, n, tw));
  const upper = T(T(T(lower.mirror([0, 0, 1])).translate([0, 0, b])));
  return T(MF.Manifold.union([lower, upper]));
}
function boreCS() {
  const d = clamp(D.bd, 1, 100) + clamp(D.bc, 0, 1), R = d / 2;
  if (D.bore === 'none') return null;
  if (D.bore === 'hex') return T(T(MF.CrossSection.circle(d / Math.sqrt(3), 6)).rotate(30));
  const c = T(MF.CrossSection.circle(R, Math.max(32, Math.round(R * 10))));
  if (D.bore === 'd') { const flat = R - Math.max(0.5, clamp(D.bd, 1, 100) * 0.1); return T(c.intersect(T(T(MF.CrossSection.square([d * 2, R + flat], false)).translate([-d, -R])))); }
  if (D.bore === 'key') { const w = Math.max(1, Math.round(d * 0.25)), k = T(T(MF.CrossSection.square([w, R + Math.max(0.8, d * 0.12)], false)).translate([-w / 2, 0])); return T(MF.CrossSection.union([c, k])); }
  return c;
}
/* celé kolo s dírou, nábojem a odlehčením */
function buildGear(z, hand, opts = {}) {
  const m = clamp(D.m, 0.3, 10), b = clamp(D.b, 1, 100), bl = clamp(D.bl, 0, 1);
  const g = gearOutline(z, m, clamp(D.alpha, 14.5, 30), Math.PI * m / 2 - bl / 2);
  let body = extrudeGear(cs(g.pts), b, g.r, hand);
  const bore = opts.noBore ? null : boreCS();
  const boreR = bore ? (clamp(D.bd, 1, 100) + clamp(D.bc, 0, 1)) / 2 : 0;
  const hh = opts.noHub ? 0 : clamp(D.hh, 0, 60);
  const hubR = D.hd > 0 ? D.hd / 2 : Math.max(boreR + 2.5, boreR * 1.8, 4);
  if (hh > 0) body = T(MF.Manifold.union([body, T(T(MF.Manifold.cylinder(hh + 0.01, Math.min(hubR, g.rf - 0.5), Math.min(hubR, g.rf - 0.5), 96)).translate([0, 0, b - 0.01]))]));
  if (D.light && !opts.noLight) {
    const inner = g.rf - Math.max(2.5, 1.5 * m), hr = Math.max(hubR, boreR + 2.5), space = inner - hr;
    if (space > 7) {
      const n = space > 25 ? 6 : space > 14 ? 5 : 4, rc = (inner + hr) / 2, holeR = Math.min(space * 0.38, rc * Math.sin(Math.PI / n) - 1.6);
      if (holeR > 2) { const holes = []; for (let i = 0; i < n; i++) { const a = (i + 0.5) / n * Math.PI * 2; holes.push(T(T(MF.Manifold.cylinder(b + 2, holeR, holeR, 64)).translate([rc * Math.cos(a), rc * Math.sin(a), -1]))); } body = T(body.subtract(T(MF.Manifold.union(holes)))); }
    }
  }
  if (bore) body = T(body.subtract(T(T(bore.extrude(b + hh + 2)).translate([0, 0, -1]))));
  return { m: body, g };
}
/* vnitřní ozubený věnec: kotouč minus „zuby“ tvaru mezer */
function buildRing(z, hand) {
  const m = clamp(D.m, 0.3, 10), b = clamp(D.b, 1, 100), bl = clamp(D.bl, 0, 1);
  const cut = gearOutline(z, m, clamp(D.alpha, 14.5, 30), Math.PI * m / 2 + bl / 2, 1.25, 1);
  const Ro = cut.ra + clamp(D.rim, 1, 30);
  const disk = T(MF.Manifold.cylinder(b, Ro, Ro, 180));
  // nástroj je o 1 mm delší na obě strany; u šikmých zubů ho pootočíme zpět, aby fáze v rovině z = 0 seděla
  const pre = D.tooth === 'spur' ? 0 : -hand * Math.tan(clamp(D.beta, 5, 45) * Math.PI / 180) / cut.r * 180 / Math.PI;
  const cutter = T(T(T(extrudeGear(cs(cut.pts), b + 2, cut.r, hand)).rotate([0, 0, pre])).translate([0, 0, -1]));
  // šikmé zuby: řezný nástroj delší o 2 mm, aby se nekryl s čely; posun zkroucení vyrovnáme otočením
  return { m: T(disk.subtract(cutter)), g: { r: cut.r, ra: cut.rf, rf: cut.ra, Ro } };
}
function buildRack(n, pinionZ) {
  const m = clamp(D.m, 0.3, 10), b = clamp(D.b, 1, 100), bl = clamp(D.bl, 0, 1), a = clamp(D.alpha, 14.5, 30) * Math.PI / 180;
  const p = Math.PI * m, s = p / 2 - bl / 2, H = clamp(D.rackH, 2, 40), tan = Math.tan(a);
  const yT = m, yR = -1.25 * m, pts = [[0, -H - 1.25 * m]];
  const L = n * p;
  pts.push([L, -H - 1.25 * m]);
  for (let k = n - 1; k >= 0; k--) {           // zprava doleva (proti směru hodin)
    const c = k * p + p / 2;
    pts.push([c + s / 2 - yR * tan, yR], [c + s / 2 - yT * tan, yT], [c - s / 2 + yT * tan, yT], [c - s / 2 + yR * tan, yR]);
  }
  pts.push([0, yR]);
  const q = pts.map(([x, y]) => [x - L / 2, y]);
  return { m: T(cs(q).extrude(b)), L, H };
}

/* ===== Sestava podle typu ===== */
let parts = []; // { name, label, geom, place: {x,y,rot}, spin: rychlost (násobek otáčení vstupu) }
function build(msgs) {
  const m = clamp(D.m, 0.3, 10), z1 = Math.round(clamp(D.z1, 6, 300)), z2 = Math.round(clamp(D.z2, 6, 300)), hel = D.tooth !== 'spur';
  const out = [];
  const add = (r, name, label, x, y, rot, spin) => { const g = toGeom(r.m); out.push({ name, label, geom: g, x, y, rot, spin }); };
  if (z1 < 12 && D.type !== 'ring') msgs.push({ lvl: 'warn', msg: `Kolo s ${z1} zuby bude mít zuby u paty podříznuté a slabší. Pro pevnější pastorek volte aspoň 12 zubů.` });
  if (m < 0.8) msgs.push({ lvl: 'info', msg: 'Modul pod 0,8 mm je na hraně možností 0,4mm trysky.' });
  if (D.type === 'gear') {
    const r = buildGear(z1, 1); add(r, `kolo_m${m}_z${z1}`, `Kolo ${z1} z`, 0, 0, 0, 1);
  } else if (D.type === 'pair') {
    const a = m * (z1 + z2) / 2;
    const r1 = buildGear(z1, 1), r2 = buildGear(z2, -1);
    add(r1, `kolo_m${m}_z${z1}`, `Kolo ${z1} z`, -a * z2 / (z1 + z2), 0, 0, 1);
    add(r2, `kolo_m${m}_z${z2}`, `Kolo ${z2} z`, a * z1 / (z1 + z2), 0, Math.PI - Math.PI / z2, -z1 / z2);
    msgs.push({ lvl: 'info', msg: `Osová vzdálenost ${fmt(a, 2)} mm, převod ${fmtP(z1)} : ${fmtP(z2)} (${fmt(z2 / z1, 2)} : 1).` });
  } else if (D.type === 'ring') {
    const r = buildRing(z1, 1); add(r, `venec_m${m}_z${z1}`, `Věnec ${z1} z`, 0, 0, 0, 1);
    msgs.push({ lvl: 'info', msg: `Vnější průměr ${fmt(r.g.Ro * 2, 1)} mm. Zabírá s kolem stejného modulu, které má aspoň o 10 zubů méně.` });
  } else if (D.type === 'planet') {
    const zs = z1, zp = z2, zr = zs + 2 * zp, n = Math.round(clamp(D.np, 2, 8)), a = m * (zs + zp) / 2;
    if ((zs + zr) % n) msgs.push({ lvl: 'warn', msg: `Satelity nejdou rozmístit rovnoměrně: (${zs} + ${zr}) není dělitelné ${n}. Změňte počet zubů nebo satelitů.` });
    if (2 * a * Math.sin(Math.PI / n) < m * (zp + 2) + 1) msgs.push({ lvl: 'bad', msg: 'Satelity se navzájem dotýkají. Zmenšete jejich počet nebo velikost.' });
    const sun = buildGear(zs, 1), pl = buildGear(zp, -1, { noLight: true }), ring = buildRing(zr, -1);
    add(sun, `slunce_m${m}_z${zs}`, `Slunce ${zs} z`, 0, 0, 0, 1);
    const step = 2 * Math.PI / zp, psi0 = Math.PI - Math.PI / zp, plGeom = toGeom(pl.m);
    for (let i = 0; i < n; i++) { const f = i / n * 2 * Math.PI, psi = psi0 + f + f * zs / zp; out.push({ name: `satelit_m${m}_z${zp}`, label: `Satelit ${zp} z`, geom: i ? plGeom.clone() : plGeom, x: a * Math.cos(f), y: a * Math.sin(f), rot: psi, spin: -zs / zp, copy: i > 0 }); }
    let tau = ((psi0 % step) + step) % step; if (tau > step / 2) tau -= step;    // zub satelitu nejblíž ke směru věnce
    add(ring, `venec_m${m}_z${zr}`, `Věnec ${zr} z`, 0, 0, (zp * tau) / zr, -zs / zr);           // mezera věnce proti zubu satelitu
    msgs.push({ lvl: 'info', msg: `Věnec má ${zr} zubů, převod při stojícím věnci ${fmt(1 + zr / zs, 2)} : 1. Satelity se tisknou ${n}×.` });
  } else if (D.type === 'rack') {
    const n = Math.round(clamp(D.zr, 3, 200)), rk = buildRack(n), pin = buildGear(z1, 1, {});
    const rp = m * z1 / 2;
    add(rk, `hreben_m${m}_${n}z`, `Hřeben ${n} z`, 0, -rk.H / 2 - 4, 0, 0);
    out[0].rack = true;
    add(pin, `pastorek_m${m}_z${z1}`, `Pastorek ${z1} z`, 0, 0, 0, 1);
    out[1].pinion = { rp, py: out[0].y + 0 }; // umístění dopočítá zobrazení
    if (rk.L > D.bedX && rk.L > D.bedY) msgs.push({ lvl: 'warn', msg: `Hřeben je dlouhý ${fmt(rk.L, 0)} mm a nevejde se na tiskovou plochu. Rozdělte ho na více kusů.` });
  }
  freeAll();
  return out;
}

/* ===== Ovládání ===== */
function syncUI() {
  document.querySelectorAll('[data-k]').forEach(el => { const v = D[el.dataset.k]; if (el.type === 'checkbox') el.checked = !!v; else el.value = v; });
  document.querySelectorAll('input[type=radio][name]').forEach(r => { r.checked = String(D[r.name]) === r.value; });
  updateUI();
}
function updateUI() {
  const t = D.type;
  const show = { z1: true, z2: t === 'pair' || t === 'planet', planet: t === 'planet', rack: t === 'rack', helix: t !== 'rack', beta: t !== 'rack' && D.tooth !== 'spur',
    hubCard: t !== 'ring', boreD: D.bore !== 'none', hubD: D.hh > 0, ringCard: t === 'ring' || t === 'planet' || t === 'rack' };
  document.querySelectorAll('[data-show]').forEach(el => { el.hidden = !show[el.dataset.show]; });
  document.querySelectorAll('#types [data-type]').forEach(b => b.setAttribute('aria-checked', String(b.dataset.type === t)));
  document.querySelectorAll('#modChips button').forEach(b => b.setAttribute('aria-pressed', String(+b.dataset.m === +D.m)));
  $('lblZ1').textContent = { gear: 'Počet zubů', pair: 'Zuby prvního kola', ring: 'Počet zubů věnce', planet: 'Zuby slunce (střed)', rack: 'Zuby pastorku' }[t];
  $('lblZ2').textContent = t === 'planet' ? 'Zuby satelitů' : 'Zuby druhého kola';
  $('lblBore').textContent = D.bore === 'hex' ? 'Šestihran (na plochy)' : 'Průměr hřídele';
  const m = clamp(D.m, 0.3, 10), z = Math.round(clamp(D.z1, 6, 300));
  $('spec').innerHTML = `Roztečný ⌀ <b>${fmt(m * z, 2)}</b> · hlavový ⌀ <b>${fmt(m * (z + 2), 2)}</b> · patní ⌀ <b>${fmt(m * (z - 2.5), 2)}</b> mm · rozteč <b>${fmt(Math.PI * m, 2)}</b> mm`;
}
(function () { const box = $('modChips'); MODS.forEach(v => { const b = document.createElement('button'); b.type = 'button'; b.textContent = 'm ' + fmtP(v); b.dataset.m = v; b.onclick = () => { D.m = v; syncUI(); onChange('m'); }; box.append(b); }); })();
function onChange(path) { if (/^(type|m|z1|z2|np|zr|b)$/.test(path)) fitNext = true; updateUI(); saveState(); schedule(); }
document.querySelectorAll('[data-k]').forEach(el => {
  el.addEventListener(el.type === 'checkbox' ? 'change' : 'input', () => {
    let v = el.type === 'checkbox' ? el.checked : parseFloat(el.value); if (el.type !== 'checkbox' && !isFinite(v)) return;
    D[el.dataset.k] = v; onChange(el.dataset.k);
  });
});
document.querySelectorAll('input[type=radio][name]').forEach(r => r.addEventListener('change', () => { D[r.name] = r.value; onChange(r.name); }));
document.querySelectorAll('#types [data-type]').forEach(b => b.addEventListener('click', () => {
  D.type = b.dataset.type;
  if (D.type === 'planet' && D.z1 < 10) D.z1 = 12;
  if (D.type === 'ring' && D.z1 < 30) D.z1 = 48;
  if (D.type === 'rack' && D.z1 > 40) D.z1 = 16;
  syncUI(); onChange('type');
}));
let tmr = 0;
function schedule(now) { clearTimeout(tmr); tmr = setTimeout(() => { if (!MF) return; busy(true, 'Počítám ozubení…'); setTimeout(() => { try { rebuild(); } finally { busy(false); } }, 20); }, now ? 0 : 350); }
function busy(on, txt) { $('busy').hidden = !on; if (txt) $('busy').textContent = txt; }

/* ===== 3D scéna ===== */
const cv = $('cv');
let renderer = null, scene, camera, bedGroup, meshes = [], fitNext = true, bbox = null, spin = false, angle = 0, lastT = 0;
const orbit = { theta: -Math.PI / 2, phi: 1.2, r: 300, target: new THREE.Vector3() };
function initGL() {
  try { renderer = new THREE.WebGLRenderer({ canvas: cv, antialias: true }); } catch (e) { renderer = null; return; }
  renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
  scene = new THREE.Scene(); camera = new THREE.PerspectiveCamera(30, 1, 0.5, 8000); camera.up.set(0, 0, 1);
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
function draw() { if (!renderer || raf) return; raf = requestAnimationFrame(frame); }
function frame(t) {
  raf = 0;
  if (spin) { const dt = lastT ? Math.min(0.05, (t - lastT) / 1000) : 0; lastT = t; angle += dt * 0.6; place(); raf = requestAnimationFrame(frame); } else lastT = 0;
  const tg = orbit.target, s = Math.sin(orbit.phi);
  camera.position.set(tg.x + orbit.r * s * Math.cos(orbit.theta), tg.y + orbit.r * s * Math.sin(orbit.theta), tg.z + orbit.r * Math.cos(orbit.phi)); camera.lookAt(tg); renderer.render(scene, camera);
}
function place() { for (const mm of meshes) { const p = mm.userData.p; if (p.rack) { mm.position.x = p.x + angle * p.rackRp; continue; } mm.rotation.z = p.rot + angle * p.spin; } }
function fit(view) {
  if (!bbox || !renderer) return; const b = bbox, sx = b.max.x - b.min.x, sy = b.max.y - b.min.y, sz = b.max.z - b.min.z;
  orbit.target.set((b.min.x + b.max.x) / 2, (b.min.y + b.max.y) / 2, sz / 2);
  const span = Math.max(sx, sy, sz, 20);
  orbit.r = span / (2 * Math.tan(THREE.MathUtils.degToRad(30) / 2)) * Math.max(1.15, 1.6 / camera.aspect);
  if (view === 'front') { orbit.theta = -Math.PI / 2; orbit.phi = Math.PI / 2 - 0.06; }
  else if (view === 'top') { orbit.theta = -Math.PI / 2; orbit.phi = 0.001; }
  else { orbit.theta = -Math.PI / 2 - 0.4; orbit.phi = 0.85; }
  draw();
}
$('vFront').onclick = () => fit('front'); $('vTop').onclick = () => fit('top'); $('vPersp').onclick = () => fit('persp');
$('vSpin').onclick = () => { spin = !spin; $('vSpin').setAttribute('aria-pressed', String(spin)); draw(); };
const ptrs = new Map(); let pinch0 = 0, r0 = 0;
cv.addEventListener('contextmenu', e => e.preventDefault());
cv.addEventListener('pointerdown', e => { cv.setPointerCapture(e.pointerId); ptrs.set(e.pointerId, { x: e.clientX, y: e.clientY, b: e.button, shift: e.shiftKey }); if (ptrs.size === 2) { const [a, b] = [...ptrs.values()]; pinch0 = Math.hypot(a.x - b.x, a.y - b.y); r0 = orbit.r; } });
cv.addEventListener('pointermove', e => { const p = ptrs.get(e.pointerId); if (!p) return; const dx = e.clientX - p.x, dy = e.clientY - p.y; p.x = e.clientX; p.y = e.clientY;
  if (ptrs.size === 2) { const [a, b] = [...ptrs.values()]; const d = Math.hypot(a.x - b.x, a.y - b.y); if (pinch0) orbit.r = r0 * pinch0 / d; }
  else if (p.b === 2 || p.shift) { const k = orbit.r * 0.0016, right = new THREE.Vector3(), up = new THREE.Vector3(); camera.matrixWorld.extractBasis(right, up, new THREE.Vector3()); orbit.target.addScaledVector(right, -dx * k).addScaledVector(up, dy * k); }
  else { orbit.theta -= dx * 0.008; orbit.phi = Math.min(Math.PI - 0.05, Math.max(0.001, orbit.phi - dy * 0.008)); } draw(); });
const pup = e => { ptrs.delete(e.pointerId); if (ptrs.size < 2) pinch0 = 0; }; cv.addEventListener('pointerup', pup); cv.addEventListener('pointercancel', pup);
cv.addEventListener('wheel', e => { e.preventDefault(); orbit.r = Math.min(8000, Math.max(5, orbit.r * Math.exp(e.deltaY * 0.0012))); draw(); }, { passive: false });
function showMsgs(list) { const box = $('msgs'); box.textContent = ''; for (const m of list) { const d = document.createElement('div'); d.className = 'msg ' + m.lvl; d.textContent = m.msg; box.append(d); } }

/* ===== Výpočet ===== */
function rebuild() {
  const msgs = []; let out = [];
  try { out = build(msgs); } catch (e) { console.error(e); freeAll(); msgs.push({ lvl: 'bad', msg: 'Ozubení se nepodařilo spočítat. Zkuste jiný počet zubů nebo modul.' }); }
  for (const mm of meshes) { scene && scene.remove(mm); if (!mm.userData.p.copy) mm.geometry.dispose(); mm.material.dispose(); }
  meshes = []; parts = out; angle = 0;
  $('btnSave').disabled = !out.length;
  if (!out.length) { showMsgs(msgs); $('stats').textContent = ''; $('dims').textContent = '–'; draw(); return; }
  // hřeben: pastorek nad hřebenem tak, aby se roztečná kružnice dotýkala roztečné přímky
  const rk = out.find(p => p.rack), pin = out.find(p => p.pinion);
  if (rk && pin) { // zub pastorku dolů proti mezeře hřebene (sudý počet zubů hřebene = mezera uprostřed)
    const zp = Math.round(clamp(D.z1, 6, 300)), nr = Math.round(clamp(D.zr, 3, 200));
    pin.y = rk.y + pin.pinion.rp; pin.x = 0; rk.rackRp = pin.pinion.rp; pin.rot = -Math.PI / 2 + (nr % 2 ? Math.PI / zp : 0); pin.spin = 1;
  }
  const bb = new THREE.Box3();
  out.forEach((p, i) => {
    p.geom.computeBoundingBox();
    if (renderer) {
      if (!p.copy) p.geom.computeVertexNormals();
      const mesh = new THREE.Mesh(p.geom, new THREE.MeshStandardMaterial({ color: new THREE.Color(COLS[Math.min(i, p.copy ? 1 : i) % COLS.length]), roughness: 0.55, metalness: 0.05, flatShading: true }));
      if (p.name.startsWith('satelit')) mesh.material.color.set(COLS[1]);
      if (p.name.startsWith('venec')) mesh.material.color.set(COLS[2]);
      mesh.position.set(p.x, p.y, 0); mesh.rotation.z = p.rot; mesh.userData.p = p; scene.add(mesh); meshes.push(mesh);
      mesh.updateMatrixWorld(); bb.union(new THREE.Box3().setFromObject(mesh));
    } else { const b = p.geom.boundingBox.clone(); b.translate(new THREE.Vector3(p.x, p.y, 0)); bb.union(b); }
  });
  bbox = bb;
  const sx = bb.max.x - bb.min.x, sy = bb.max.y - bb.min.y, sz = bb.max.z - bb.min.z;
  for (const p of out) { const b = p.geom.boundingBox, w = b.max.x - b.min.x, h = b.max.y - b.min.y; if ((w > D.bedX || h > D.bedY) && (h > D.bedX || w > D.bedY)) { msgs.push({ lvl: 'warn', msg: `${p.label} (${fmt(w, 0)} × ${fmt(h, 0)} mm) se nevejde na tiskovou plochu.` }); break; } }
  showMsgs(msgs);
  $('dims').innerHTML = `<b>${fmt(sx)}</b> × <b>${fmt(sy)}</b> × <b>${fmt(sz)}</b> mm`;
  const uniq = out.filter(p => !p.copy);
  let grams = 0; for (const p of out) { const st = meshStats(p.geom.attributes.position.array); grams += filamentEstimate(st, { wall: 1.2, infill: 40, density: 1.24, diameter: 1.75, pricePerKg: 500 }).grams; }
  const box = $('stats'); box.textContent = '';
  const tiles = [['Díly', uniq.map(p => p.label + (out.filter(q => q.name === p.name).length > 1 ? ` ×${out.filter(q => q.name === p.name).length}` : '')).join(', ')], ['Rozměry sestavy', `${fmt(sx, 0)} × ${fmt(sy, 0)} × ${fmt(sz, 1)} mm`], ['Materiál', `${fmt(grams, 0)} g`], ['Tisk zhruba', `${fmt(grams / 10 + 0.2, 1)} h`]];
  for (const [a, v] of tiles) { const d = document.createElement('div'); d.className = 'stat'; const s1 = document.createElement('span'); s1.textContent = a; const s2 = document.createElement('b'); s2.textContent = v; d.append(s1, s2); box.append(d); }
  $('btnSave').textContent = uniq.length > 1 ? `Stáhnout STL (${uniq.length} díly)` : 'Stáhnout STL';
  if (fitNext) { fit('persp'); fitNext = false; } else draw();
}

/* ===== Stažení ===== */
const inViewer = !!(window.claude && typeof window.claude.use === 'function');
let dlCap = null;
if (inViewer) window.claude.use('downloads').then(d => { dlCap = d; updateNote(); }).catch(() => updateNote());
function updateNote() { $('saveNote').textContent = inViewer ? (dlCap ? 'Tady se STL stáhne zabalené v ZIP souboru.' : 'Stahování je v tomto zobrazení nedostupné.') : 'Každý díl je samostatný soubor STL, tiskne se naplocho. Jednotky jsou milimetry.'; }
function stl(g) { const u = stlBinary([g]), head = 'Created by Julius Andy Antos | Ozubena kola | mm'; for (let i = 0; i < 80; i++) u[i] = i < head.length ? head.charCodeAt(i) : 32; return u; }
$('btnSave').onclick = async () => {
  const uniq = parts.filter(p => !p.copy); if (!uniq.length) return;
  const files = uniq.map(p => ({ name: p.name.replace(/\./g, '_') + '.stl', data: stl(p.geom) }));
  if (inViewer) { if (!dlCap) return; try { await dlCap.save({ filename: 'ozubeni.zip', data: makeZip(files) }); $('saveNote').textContent = 'ZIP je uložený.'; } catch (err) { if (err && err.code !== 'declined') $('saveNote').textContent = 'Soubor se nepodařilo uložit.'; } return; }
  for (const f of files) { const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([f.data], { type: 'model/stl' })); a.download = f.name; document.body.append(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 2000); await new Promise(r => setTimeout(r, 300)); }
};

/* ===== Instalace jako aplikace a sbalitelné sekce ===== */
let installEvt = null;
window.addEventListener('beforeinstallprompt', (e) => { e.preventDefault(); installEvt = e; $('btnInstall').hidden = false; });
window.addEventListener('appinstalled', () => { installEvt = null; $('btnInstall').hidden = true; });
$('btnInstall').onclick = async () => { if (!installEvt) return; installEvt.prompt(); try { await installEvt.userChoice; } catch (e) {} installEvt = null; $('btnInstall').hidden = true; };
if (!inViewer && 'serviceWorker' in navigator && (location.protocol === 'https:' || location.hostname === 'localhost')) navigator.serviceWorker.register('sw.js').catch(() => {});
(function () {
  const KEY = 'ozubena-kola-sbaleno';
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

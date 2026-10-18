/* ===== Kalibrační testy — aplikace. Created by Julius Andy Antoš ===== */
const $ = (id) => document.getElementById(id);
const DEF = {
  test: 'cube',
  cube: { s: 20, mx: 0, my: 0, mz: 0 },
  temp: { hi: 220, lo: 190, step: 5 },
  over: { a0: 30, a1: 70, step: 10 },
  bridge: { list: '10, 20, 30, 40, 50' },
  tol: { d: 10, c0: 0.1, cs: 0.1, n: 5 },
  string: { gap: 50, h: 30 },
  bedX: 220, bedY: 220, bedZ: 250,
};
const STORE = 'kalibrace-v1';
const deepMerge = (a, b) => { for (const k in b) { if (b[k] && typeof b[k] === 'object' && !Array.isArray(b[k]) && a[k] && typeof a[k] === 'object') deepMerge(a[k], b[k]); else if (k in a && typeof a[k] === typeof b[k]) a[k] = b[k]; } return a; };
const D = JSON.parse(JSON.stringify(DEF));
try { deepMerge(D, JSON.parse(localStorage.getItem(STORE) || '{}')); } catch (e) {}
const saveState = () => { try { localStorage.setItem(STORE, JSON.stringify(D)); } catch (e) {} };
const getK = (p) => p.split('.').reduce((o, k) => o[k], D);
const setK = (p, v) => { const ks = p.split('.'); let o = D; for (let i = 0; i < ks.length - 1; i++) o = o[ks[i]]; o[ks[ks.length - 1]] = v; };
const fmt = (v, d = 1) => v.toLocaleString('cs-CZ', { maximumFractionDigits: d, minimumFractionDigits: d });
const css = (v) => getComputedStyle(document.documentElement).getPropertyValue(v).trim();
const clamp = (v, a, b) => Math.min(b, Math.max(a, +v || 0));
const esc = (s) => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const COL = '#0b7a72';
const TEMP_PRESETS = [['PLA', 220, 190], ['PETG', 250, 220], ['ABS', 260, 230], ['ASA', 265, 235], ['TPU', 235, 205]];

let FONT = null;
function font() { if (!FONT) { const s = atob(LABEL_FONT_B64), u = new Uint8Array(s.length); for (let i = 0; i < s.length; i++) u[i] = s.charCodeAt(i); FONT = opentype.parse(u.buffer); } return FONT; }
/* text jako ExPolygony se středem v (cx, cy), výška velkých písmen h */
function text(str, h, cx, cy) {
  const L = layoutText(font(), str, { size: h, spacing: 0, lineH: 1.2, align: 'center', mirror: false });
  const ex = unionEx(L.paths); if (!ex.length) return [];
  const b = boundsEx(ex), ox = cx - (b.x0 + b.x1) / 2, oy = cy - (b.y0 + b.y1) / 2;
  return mapEx(ex, (x, y) => [x + ox, y + oy]);
}
const deg = () => font().charToGlyphIndex('°') > 0 ? '°' : '';
const P = (pts) => pts.map(([x, y]) => ({ X: Math.round(x * SC), Y: Math.round(y * SC) }));
const rectEx = (x0, y0, x1, y1) => exOf(rectPath(x0, y0, x1, y1));
/* převod souřadnic geometrie: f(x, y, z) -> [x', y', z'] (musí zachovat orientaci) */
function remap(g, f) { const p = g.attributes.position.array; for (let i = 0; i < p.length; i += 3) { const q = f(p[i], p[i + 1], p[i + 2]); p[i] = q[0]; p[i + 1] = q[1]; p[i + 2] = q[2]; } g.attributes.position.needsUpdate = true; return g; }
/* profil v rovině XZ vytažený do hloubky (osa Y): profil (x, z), hloubka d -> svět (x, d/2 - d', z) */
const profileSolid = (ex, depth) => remap(prismSolid(ex, 0, depth), (x, y, z) => [x, depth / 2 - z, y]);

/* ===== Testy ===== */
function buildCube(msgs) {
  const s = clamp(D.cube.s, 10, 60), h = s / 2, dpt = 0.6, fs = s * 0.26;
  const letters = exUnion([text('X', fs, h * 0.55, 0), text('Y', fs, 0, h * 0.55), text('Z', fs * 0.7, -h * 0.5, -h * 0.5)]);
  const sq = rectEx(-h, -h, h, h);
  return { geoms: [stackSolid([{ z0: 0, z1: s - dpt, ex: sq }, { z0: s - dpt, z1: s, ex: exDiff(sq, letters) }])], info: `Kostka ${fmt(s, 0)} mm` };
}
function tempList() {
  let hi = clamp(D.temp.hi, 150, 350), lo = clamp(D.temp.lo, 150, 350), st = Math.round(clamp(D.temp.step, 1, 20));
  if (lo > hi) [hi, lo] = [lo, hi];
  const out = []; for (let t = hi; t >= lo - 1e-9 && out.length < 15; t -= st) out.push(t);
  return out;
}
const TEMP_FLOOR = 10, TEMP_BASE = 1;
function buildTemp(msgs) {
  const temps = tempList();
  if (temps.length >= 15 && temps[temps.length - 1] > clamp(D.temp.lo, 150, 350)) msgs.push({ lvl: 'info', msg: 'Věž má nejvýš 15 pater, zvětšete krok teploty.' });
  const paths = [];
  temps.forEach((t, i) => {
    const z = TEMP_BASE + i * TEMP_FLOOR;
    paths.push(P([[0, 0], [6, 0], [6, 4], [16, 4], [16, 0], [28, 0], [28, 2], [36, 10], [0, 10]].map(([x, y]) => [x - 18, y + z])));
  });
  const tower = profileSolid(unionEx(paths), 10);
  const geoms = [tower, prismSolid(rectEx(-22, -8, 22, 8), 0, TEMP_BASE + 0.4)];
  temps.forEach((t, i) => { const ex = text(String(t), 4.2, 22 - 18, TEMP_BASE + i * TEMP_FLOOR + 5.6); geoms.push(remap(prismSolid(ex, 0, 0.9), (x, y, z) => [x, -4.6 - z, y])); });
  return { geoms, info: `${temps.length} pater, ${temps[0]}–${temps[temps.length - 1]} °C` };
}
function buildOver(msgs) {
  let a0 = clamp(D.over.a0, 10, 85), a1 = clamp(D.over.a1, 10, 85), st = clamp(D.over.step, 5, 20); if (a1 < a0) [a0, a1] = [a1, a0];
  const angs = []; for (let a = a0; a <= a1 + 1e-9 && angs.length < 10; a += st) angs.push(a);
  const pitch = 13, W = angs.length * pitch + 4, x0 = -W / 2 + 2, T = 1.5, d = deg();
  const maxOff = 20, hMax = 18;
  const geoms = [];
  let yMax = 0;
  const labels = [];
  angs.forEach((a, i) => {
    const t = Math.tan(a * Math.PI / 180), h = Math.min(hMax, maxOff / t), off = h * t, xa = x0 + i * pitch + 1.5;
    yMax = Math.max(yMax, 3 + off);
    const prof = exOf(P([[0, T - 0.5], [3, T - 0.5], [3 + off, T - 0.5 + h], [off, T - 0.5 + h]]));
    geoms.push(remap(prismSolid(prof, 0, 10), (x, y, z) => [xa + z, x, y]));     // (y, z) profil, vytažený podél X
    labels.push(text(a + d, 3.4, xa + 5, -4));
  });
  const plate = rectEx(-W / 2, -8, W / 2, yMax + 3);
  geoms.unshift(stackSolid([{ z0: 0, z1: T, ex: plate }, { z0: T, z1: T + 0.6, ex: exUnion(labels) }]));
  return { geoms, info: `${angs.length} převisů, ${angs[0]}–${angs[angs.length - 1]}°` };
}
function bridgeList() { return String(D.bridge.list).split(/[,;\s]+/).map(v => parseFloat(v.replace(',', '.'))).filter(v => isFinite(v) && v >= 2 && v <= 100).slice(0, 8); }
function buildBridge(msgs) {
  const Ls = bridgeList(); if (!Ls.length) { msgs.push({ lvl: 'bad', msg: 'Zadejte aspoň jednu délku mostu (2–100 mm).' }); return null; }
  const pw = 5, Hb = 9, bt = 1.5, total = Ls.reduce((a, v) => a + v, 0) + pw * (Ls.length + 1), x0 = -total / 2;
  const paths = [P([[x0, 0], [x0 + total, 0], [x0 + total, 1], [x0, 1]])];
  let x = x0; const labels = [];
  paths.push(P([[x, 0], [x + pw, 0], [x + pw, Hb], [x, Hb]])); x += pw;
  for (const L of Ls) {
    paths.push(P([[x, Hb - bt], [x + L, Hb - bt], [x + L, Hb], [x, Hb]]));
    labels.push(text(fmt(L, L % 1 ? 1 : 0), Math.min(4, L * 0.35 + 1.5), x + L / 2, 0));
    x += L;
    paths.push(P([[x, 0], [x + pw, 0], [x + pw, Hb], [x, Hb]])); x += pw;
  }
  const geoms = [profileSolid(unionEx(paths), 10)];
  for (const l of labels) if (l.length) geoms.push(prismSolid(l, Hb - 0.3, Hb + 0.5));
  return { geoms, info: `${Ls.length} mostů` };
}
function tolList() { const n = Math.round(clamp(D.tol.n, 2, 8)), c0 = clamp(D.tol.c0, 0, 1), cs = clamp(D.tol.cs, 0.05, 0.5); return Array.from({ length: n }, (_, i) => Math.round((c0 + i * cs) * 100) / 100); }
function buildTol(msgs) {
  const d = clamp(D.tol.d, 4, 30), cl = tolList(), cmax = cl[cl.length - 1], pitch = d + cmax + 7;
  const W = cl.length * pitch + 4, Dp = d + 18, T = 6, x0 = -W / 2 + 2 + pitch / 2;
  const plate = rectEx(-W / 2, -Dp / 2, W / 2, Dp / 2);
  const N = Math.max(64, Math.round(d * 8));
  const holes = cl.map((c, i) => ({ outer: circ(x0 + i * pitch, -2.5, (d + c) / 2, N), holes: [] }));
  const labels = exUnion(cl.map((c, i) => text(fmt(c, 2), 3.2, x0 + i * pitch, Dp / 2 - 4)));
  const body = exDiff(plate, holes);
  const plateG = stackSolid([{ z0: 0, z1: T - 0.6, ex: body }, { z0: T - 0.6, z1: T, ex: exDiff(body, labels) }]);
  const py = -Dp / 2 - d / 2 - 6, pc = circ(0, py, d / 2, N);
  const peg = stackSolid([{ z0: 0, z1: 14.4, ex: exOf(pc) }, { z0: 14.4, z1: 15, ex: exOf(pc), top: exOf(circ(0, py, d / 2 - 0.6, N)) }]);
  return { geoms: [plateG, peg], info: `${cl.length} děr pro kolík ⌀ ${fmt(d, 1)} mm` };
}
function buildString(msgs) {
  const gap = clamp(D.string.gap, 20, 150), h = clamp(D.string.h, 15, 100), N = 64;
  const c = (r) => [-1, 1].map(s => ({ outer: circ(s * gap / 2, 0, r, N), holes: [] }));
  const g = stackSolid([
    { z0: 0, z1: 1, ex: rectEx(-gap / 2 - 10, -10, gap / 2 + 10, 10) },
    { z0: 1, z1: h - 4, ex: c(4) },
    { z0: h - 4, z1: h, ex: c(4), top: c(1.5) },
  ]);
  return { geoms: [g], info: `2 věže ${fmt(gap, 0)} mm od sebe` };
}

/* ===== Vyhodnocení a návody ===== */
const GUIDE = {
  cube: `<h3>Jak tisknout</h3><ul><li>Běžné nastavení: vrstva 0,2 mm, 2–3 perimetry, výplň 15–20 %.</li><li>Písmena X a Y na horní stěně ukazují osy tiskárny. Kostku ve sliceru neotáčejte.</li></ul>
    <h3>Vyhodnocení</h3><ul><li>Změřte šířku ve směru X a Y uprostřed stěn (ne na hranách, kde bývá „sloní noha“) a výšku Z.</li><li>Odchylka do 0,1 mm je v pořádku. Větší odchylka ve všech osách je spíš smrštění filamentu, odchylka jen v jedné ose ukazuje na kroky motoru nebo volný řemen.</li><li>Rozšířená spodní hrana (sloní noha) znamená moc nízko nastavenou trysku nebo horkou podložku.</li></ul>`,
  temp: `<h3>Jak tisknout</h3><ul><li>Nastavte ve sliceru teplotu prvního patra a na začátek dalších pater přidejte změnu teploty (tabulka vlevo).</li><li>Chlazení a rychlost nechte tak, jak tisknete běžně.</li></ul>
    <h3>Vyhodnocení</h3><ul><li>Vyberte patro s nejhladší stěnou, ostrým převisem vpravo, čistým mostem nad tunelem a bez vlasů.</li><li>Při moc vysoké teplotě je převis rozteklý a tvoří se vlasy, při moc nízké je povrch matný a vrstvy špatně drží (věž jde zlomit).</li><li>Zlomte věž v rukou: patra, která se lámou snadno, jsou pro pevné díly moc studená.</li></ul>`,
  over: `<h3>Jak tisknout</h3><ul><li>Bez podpěr, s chlazením na 100 %. Popisky na desce udávají úhel od svislice.</li></ul>
    <h3>Vyhodnocení</h3><ul><li>Najděte největší úhel, který je ještě hladký a bez odstávajících okrajů. To je hranice, od které potřebujete podpěry.</li><li>Ve sliceru nastavte práh podpěr o 5° pod tento úhel (Bambu Studio a Orca počítají práh od vodorovné roviny, tedy 90° minus úhel z testu).</li><li>Lepší převisy dává silnější chlazení, nižší teplota a pomalejší vnější stěny.</li></ul>`,
  bridge: `<h3>Jak tisknout</h3><ul><li>Bez podpěr. Číslo na mostě udává jeho délku v mm.</li></ul>
    <h3>Vyhodnocení</h3><ul><li>Podívejte se zespodu: dobrý most má rovná napnutá vlákna bez prověšení.</li><li>Nejdelší most, který se neprověsil, je délka, kterou tiskárna zvládne bez podpěr.</li><li>Pomůže silnější chlazení, nižší rychlost mostů a menší průtok mostů (Bridge flow 0,8–0,95).</li></ul>`,
  tol: `<h3>Jak tisknout</h3><ul><li>Desku i kolík tiskněte najednou, stejně jako budete tisknout skutečné díly.</li></ul>
    <h3>Vyhodnocení</h3><ul><li>Zkoušejte kolík zasunout do děr od nejmenší vůle. Číslo u díry je vůle v mm (o kolik je díra větší než kolík).</li><li>Nejmenší vůle, kde kolík jde dovnitř rukou a drží, je vůle pro <b>pevné spoje</b>. O 0,1–0,2 mm větší je vůle pro <b>volně otočné</b> díly.</li><li>Tuto vůli zadejte třeba do Krabiček a organizérů u víčka.</li><li>Díry vycházejí menší než v modelu, protože se okraje tisku zaoblí dovnitř. Některé slicery to umí vyrovnat (X-Y hole compensation).</li></ul>`,
  string: `<h3>Jak tisknout</h3><ul><li>Tiskněte s běžnou retrakcí. Tryska mezi věžemi přejíždí vzduchem a test ukáže, jestli táhne vlasy.</li></ul>
    <h3>Vyhodnocení</h3><ul><li>Bez vlasů: retrakce je v pořádku.</li><li>Jemné pavučiny: zvyšte retrakci o 0,2–0,5 mm (přímý podavač) nebo 0,5–1 mm (bowden), případně snižte teplotu o 5 °C.</li><li>Hodně vlasů i po úpravě: filament může být vlhký, vysušte ho.</li><li>Moc velká retrakce způsobuje mezery na začátku tahů nebo ucpávání, zvyšujte ji po malých krocích.</li></ul>`,
};
const HINT = {
  cube: 'Ověří rozměry v osách X, Y a Z a odhalí sloní nohu.',
  temp: 'Každé patro se tiskne jinou teplotou. Najdete ideální teplotu filamentu.',
  over: 'Ukáže, jak velký převis tiskárna zvládne bez podpěr.',
  bridge: 'Ukáže, jak dlouhé přemostění tiskárna zvládne bez podpěr.',
  tol: 'Najdete vůli pro díly, které do sebe mají zapadnout.',
  string: 'Ukáže, jestli filament při přejezdech táhne vlasy.',
};
function evalUI() {
  // kostka
  const s = clamp(D.cube.s, 10, 60), rows = [];
  [['X', D.cube.mx], ['Y', D.cube.my], ['Z', D.cube.mz]].forEach(([ax, m]) => {
    if (!(m > 0)) return; const dv = m - s, pct = dv / s * 100, ok = Math.abs(dv) <= 0.1;
    rows.push(`<span><b>${ax}:</b> ${fmt(dv, 2)} mm (${dv > 0 ? '+' : ''}${fmt(pct, 2)} %) <span class="${ok ? 'ok' : 'warn'}">${ok ? 'v pořádku' : 'měřítko ' + fmt(s / m * 100, 2) + ' %'}</span></span>`);
  });
  $('cubeRes').innerHTML = rows.length ? rows.join('') + (rows.some(r => r.includes('měřítko')) ? '<span class="hint">Měřítko zadejte ve sliceru pro danou osu, nebo upravte kroky motoru: nové kroky = staré × (zadaný ÷ naměřený rozměr).</span>' : '') : '';
  // teplotní věž
  const temps = tempList();
  $('tempTable').innerHTML = temps.map((t, i) => `<tr><td>${i + 1}.</td><td>${i ? fmt(TEMP_BASE + i * TEMP_FLOOR, 1) + ' mm' : 'od začátku'}</td><td>${i ? 'M104 S' + t : t + ' °C ve sliceru'}</td></tr>`).join('');
  // vůle
  $('tolHint').textContent = 'Díry: ' + tolList().map(c => fmt(clamp(D.tol.d, 4, 30) + c, 2)).join(', ') + ' mm.';
}

/* ===== Ovládání ===== */
function syncUI() {
  document.querySelectorAll('[data-k]').forEach(el => { const v = getK(el.dataset.k); if (el.type === 'checkbox') el.checked = !!v; else el.value = v; });
  updateUI();
}
function updateUI() {
  document.querySelectorAll('[data-show]').forEach(el => { el.hidden = el.dataset.show !== D.test; });
  document.querySelectorAll('#tests [data-test]').forEach(b => b.setAttribute('aria-checked', String(b.dataset.test === D.test)));
  document.querySelectorAll('#tempPresets button').forEach(b => { const p = TEMP_PRESETS[+b.dataset.i]; b.setAttribute('aria-pressed', String(D.temp.hi === p[1] && D.temp.lo === p[2])); });
  $('testHint').textContent = HINT[D.test]; $('guide').innerHTML = GUIDE[D.test];
  evalUI();
}
(function () { const box = $('tempPresets'); TEMP_PRESETS.forEach(([n], i) => { const b = document.createElement('button'); b.type = 'button'; b.textContent = n; b.dataset.i = i; b.onclick = () => { D.temp.hi = TEMP_PRESETS[i][1]; D.temp.lo = TEMP_PRESETS[i][2]; D.temp.step = 5; syncUI(); onChange('temp.hi'); }; box.append(b); }); })();
function onChange(path) { if (path === 'test') fitNext = true; updateUI(); saveState(); if (!/^cube\.m/.test(path)) schedule(); }
document.querySelectorAll('[data-k]').forEach(el => {
  el.addEventListener(el.type === 'checkbox' ? 'change' : 'input', () => {
    let v = el.type === 'checkbox' ? el.checked : el.value;
    if (el.type === 'number') { v = parseFloat(v); if (!isFinite(v)) v = 0; }
    setK(el.dataset.k, v); onChange(el.dataset.k);
  });
});
document.querySelectorAll('#tests [data-test]').forEach(b => b.addEventListener('click', () => { D.test = b.dataset.test; onChange('test'); }));
let tmr = 0;
function schedule(now) { clearTimeout(tmr); tmr = setTimeout(() => { $('busy').hidden = false; setTimeout(() => { try { rebuild(); } finally { $('busy').hidden = true; } }, 20); }, now ? 0 : 300); }

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
  if (!model || !renderer) return; const b = model.bbox, sx = b.max.x - b.min.x, sy = b.max.y - b.min.y, sz = b.max.z - b.min.z;
  orbit.target.set((b.min.x + b.max.x) / 2, (b.min.y + b.max.y) / 2, sz / 2);
  const span = Math.max(sx, sy, sz, 45);
  orbit.r = span / (2 * Math.tan(THREE.MathUtils.degToRad(30) / 2)) * Math.max(1.2, 1.6 / camera.aspect);
  if (view === 'front') { orbit.theta = -Math.PI / 2; orbit.phi = Math.PI / 2 - 0.06; }
  else if (view === 'top') { orbit.theta = -Math.PI / 2; orbit.phi = 0.001; }
  else { orbit.theta = -Math.PI / 2 - 0.55; orbit.phi = 1.05; }
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
cv.addEventListener('wheel', e => { e.preventDefault(); orbit.r = Math.min(5000, Math.max(5, orbit.r * Math.exp(e.deltaY * 0.0012))); draw(); }, { passive: false });
function showMsgs(list) { const box = $('msgs'); box.textContent = ''; for (const m of list) { const d = document.createElement('div'); d.className = 'msg ' + m.lvl; d.textContent = m.msg; box.append(d); } }

/* ===== Výpočet ===== */
const BUILD = { cube: buildCube, temp: buildTemp, over: buildOver, bridge: buildBridge, tol: buildTol, string: buildString };
function rebuild() {
  const msgs = []; let m = null;
  try { m = BUILD[D.test](msgs); } catch (e) { console.error(e); msgs.push({ lvl: 'bad', msg: 'Model se nepodařilo spočítat. Zkuste upravit hodnoty.' }); }
  for (const mm of meshes) { scene && scene.remove(mm); mm.material.dispose(); }
  meshes = [];
  if (model) model.g.dispose();
  if (!m) { model = null; $('btnSave').disabled = true; showMsgs(msgs); $('stats').textContent = ''; $('dims').textContent = '–'; draw(); return; }
  const g = mergeGeoms(m.geoms); m.geoms.forEach(x => x.dispose());
  g.computeBoundingBox(); const b = g.boundingBox; g.translate(-(b.min.x + b.max.x) / 2, -(b.min.y + b.max.y) / 2, -b.min.z); g.computeBoundingBox();
  model = { g, bbox: g.boundingBox.clone(), info: m.info }; $('btnSave').disabled = false;
  const sx = b.max.x - b.min.x, sy = b.max.y - b.min.y, sz = b.max.z - b.min.z;
  if (sx > D.bedX || sy > D.bedY || sz > D.bedZ) msgs.push({ lvl: 'warn', msg: `Test (${fmt(sx, 0)} × ${fmt(sy, 0)} × ${fmt(sz, 0)} mm) se nevejde na tiskovou plochu.` });
  showMsgs(msgs);
  if (renderer) { g.computeVertexNormals(); const mesh = new THREE.Mesh(g, new THREE.MeshStandardMaterial({ color: new THREE.Color(COL), roughness: 0.6, metalness: 0.03, flatShading: true })); scene.add(mesh); meshes.push(mesh); }
  $('dims').innerHTML = `<b>${fmt(sx)}</b> × <b>${fmt(sy)}</b> × <b>${fmt(sz)}</b> mm`;
  const st = meshStats(g.attributes.position.array), grams = filamentEstimate(st, { wall: 1.2, infill: 15, density: 1.24, diameter: 1.75, pricePerKg: 500 }).grams, hrs = grams / 10 + 0.15;
  const box = $('stats'); box.textContent = '';
  for (const [a, v] of [['Test', m.info], ['Rozměry', `${fmt(sx, 0)} × ${fmt(sy, 0)} × ${fmt(sz, 0)} mm`], ['Materiál', `${fmt(Math.max(1, grams), 0)} g`], ['Tisk zhruba', hrs < 1 ? `${fmt(hrs * 60, 0)} min` : `${fmt(hrs, 1)} h`]]) {
    const d = document.createElement('div'); d.className = 'stat'; const s1 = document.createElement('span'); s1.textContent = a; const s2 = document.createElement('b'); s2.textContent = v; d.append(s1, s2); box.append(d);
  }
  if (fitNext) { fit('persp'); fitNext = false; } else draw();
}

/* ===== Stažení ===== */
const inViewer = !!(window.claude && typeof window.claude.use === 'function');
let dlCap = null;
if (inViewer) window.claude.use('downloads').then(d => { dlCap = d; updateNote(); }).catch(() => updateNote());
function updateNote() { $('saveNote').textContent = inViewer ? (dlCap ? 'Tady se STL stáhne zabalené v ZIP souboru.' : 'Stahování je v tomto zobrazení nedostupné.') : 'STL otevřete ve sliceru, jednotky jsou milimetry. Model neotáčejte.'; }
function stl(geoms) { const u = stlBinary(geoms), head = 'Created by Julius Andy Antos | Kalibracni testy | mm'; for (let i = 0; i < 80; i++) u[i] = i < head.length ? head.charCodeAt(i) : 32; return u; }
async function saveFiles(files, zipName) {
  if (inViewer) {
    if (!dlCap) return;
    try { await dlCap.save({ filename: zipName, data: makeZip(files) }); $('saveNote').textContent = 'ZIP je uložený. Rozbalte ho a STL otevřete ve sliceru.'; }
    catch (err) { if (err && err.code !== 'declined') $('saveNote').textContent = err.code === 'rate_limited' ? 'Počkejte chvíli a zkuste to znovu.' : 'Soubor se nepodařilo uložit.'; }
    return;
  }
  for (const f of files) { const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([f.data], { type: 'model/stl' })); a.download = f.name; document.body.append(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 2000); }
}
$('btnSave').onclick = () => {
  if (!model) return;
  const name = { cube: 'kostka_' + clamp(D.cube.s, 10, 60) + 'mm', temp: 'teplotni_vez_' + tempList()[0] + '-' + tempList().slice(-1)[0], over: 'test_previsu', bridge: 'test_mostu', tol: 'test_vule', string: 'test_vlaseni' }[D.test];
  saveFiles([{ name: name + '.stl', data: stl([model.g]) }], name + '.zip');
};

/* ===== Instalace jako aplikace a sbalitelné sekce ===== */
let installEvt = null;
window.addEventListener('beforeinstallprompt', (e) => { e.preventDefault(); installEvt = e; $('btnInstall').hidden = false; });
window.addEventListener('appinstalled', () => { installEvt = null; $('btnInstall').hidden = true; });
$('btnInstall').onclick = async () => { if (!installEvt) return; installEvt.prompt(); try { await installEvt.userChoice; } catch (e) {} installEvt = null; $('btnInstall').hidden = true; };
if (!inViewer && 'serviceWorker' in navigator && (location.protocol === 'https:' || location.hostname === 'localhost')) navigator.serviceWorker.register('sw.js').catch(() => {});
(function () {
  const KEY = 'kalibrace-sbaleno';
  let closed; try { closed = JSON.parse(localStorage.getItem(KEY) || 'null'); } catch (e) { closed = null; }
  if (!Array.isArray(closed)) closed = ['Tiskárna'];
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
initGL(); syncUI(); updateNote(); schedule(true);

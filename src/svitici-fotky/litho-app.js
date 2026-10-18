/* ===== Svítící fotky — aplikace. Created by Julius Andy Antoš ===== */
const $ = (id) => document.getElementById(id);
const DEF = {
  shape: 'flat', outline: 'heart', shadeProfile: 'cyl',
  width: 100, autoH: true, height: 75, curveDeg: 120, stand: true,
  shapedSize: 100, hang: true,
  diameter: 90, heartW: 120, lanternH: 100, floor: true,
  shadeD: 140, shadeH: 130, lobes: 6, waveDepth: 10, shadeSide: 'straight', shadeDTop: 100, waist: 15, bow: 10,
  cross: true, crossPos: 'top', socket: 'E27', socketD: 40, spokes: 4, spokeW: 5, crossH: 6,
  fit: 'cover', autoLevels: true, bright: 0, contrast: 1.1, invert: false,
  tMin: 0.8, tMax: 3.0, frame: 3, res: 3, bedX: 220, bedY: 220, bedZ: 250,
};
const STORE = 'svitici-fotky-v1';
const D = Object.assign({}, DEF);
try { const s = JSON.parse(localStorage.getItem(STORE) || '{}'); for (const k in s) if (k in DEF) D[k] = s[k]; } catch (e) {}
const saveState = () => { try { localStorage.setItem(STORE, JSON.stringify(D)); } catch (e) {} };
const fmt = (v, d = 1) => v.toLocaleString('cs-CZ', { maximumFractionDigits: d, minimumFractionDigits: d });
const plural = (n, one, few, many) => `${n.toLocaleString('cs-CZ')} ${n === 1 ? one : n >= 2 && n <= 4 ? few : many}`;
const css = (v) => getComputedStyle(document.documentElement).getPropertyValue(v).trim();
const isNum = (s) => /^-?\d+(\.\d+)?$/.test(s);
const SOCKETS = { E27: 40, E14: 29 };
const MULTI = ['cyl', 'heartL', 'shade'];

/* ===== Vysvětlivky ke tvarům ===== */
const EXPLAIN = {
  flat: { t: 'Rovná destička', d: 'Klasická litofánie. Ve dne vypadá jako bílý reliéf, proti oknu nebo lampičce se objeví fotka.', li: ['Použije se 1. fotka.', 'S podstavcem stojí sama na stole nebo na parapetu.', 'Tiskne se nastojato, jak ji vidíte v náhledu.'] },
  arc: { t: 'Prohnutá destička', d: 'Destička ohnutá do oblouku. Stojí sama i bez podstavce a fotka působí plastičtěji.', li: ['Použije se 1. fotka.', 'Za ni se hodí LED svíčka nebo malá lampička.', 'Tiskne se nastojato.'] },
  shaped: { t: 'Srdce, kruh, ovál nebo hvězda', d: 'Fotka v ozdobném obrysu s rámečkem. Pěkný dárek k zavěšení do okna.', li: ['Použije se 1. fotka, ořízne se do obrysu.', 'S očkem ji pověsíte na provázek nebo přísavku.', 'Tiskne se naležato.'] },
  cyl: { t: 'Válec – lucerna', d: 'Fotky poskládané dokola do válce. S dnem z něj je lucerna, do které se vloží LED čajová svíčka.', li: ['Každá fotka je jeden díl dokola (1–8 fotek).', 'Mezi fotkami je úzký proužek, který válec zpevní.', 'Tiskne se nastojato, bez podpěr.'] },
  heartL: { t: 'Srdcová lucerna', d: 'Lucerna ve tvaru srdce, fotky jdou za sebou po obvodu. Dovnitř LED svíčka.', li: ['Nejlépe 2 fotky: rozdělí se v prohlubni a ve špičce srdce.', 'Hodí se jako svatební nebo valentýnský dárek.', 'Tiskne se nastojato.'] },
  shade: { t: 'Stínítko na lampu', d: 'Stínítko kulaté nebo vlnité, rovné, kuželové, v pase nebo jako oblý kužel. Na objímku žárovky ho nasadíte pomocí kříže uprostřed.', li: ['Každá fotka je jeden díl; u vlnitého stínítka ideálně jedna fotka na každou vlnu.', 'Kříž s kroužkem pro objímku E27 nebo E14, nahoře (závěsná lampa) nebo dole (stolní).', 'Jen LED žárovka, nejvýš asi 7 W.'] },
};
function renderExplain() {
  const e = EXPLAIN[D.shape], box = $('explain'); box.textContent = '';
  const b = document.createElement('b'); b.textContent = 'Co z toho bude: ' + e.t; const p = document.createElement('div'); p.textContent = e.d;
  const ul = document.createElement('ul'); for (const t of e.li) { const li = document.createElement('li'); li.textContent = t; ul.append(li); }
  box.append(b, p, ul);
}

/* ===== Fotky ===== */
let PH = [], phSeq = 0;
const PANS = { c: [0, 0, 'střed'], t: [0, -1, 'nahoře'], b: [0, 1, 'dole'], l: [-1, 0, 'vlevo'], r: [1, 0, 'vpravo'] };
const loadImage = (url) => new Promise((res, rej) => { const im = new Image(); im.onload = () => res(im); im.onerror = rej; im.src = url; });
async function addFiles(list) {
  const files = [...list].filter(f => /^image\//.test(f.type) || /\.(jpe?g|png|webp|gif|bmp)$/i.test(f.name));
  for (const f of files) { try { PH.push({ id: ++phSeq, name: f.name, img: await loadImage(URL.createObjectURL(f)), pan: 'c' }); } catch (e) {} }
  renderPhotos(); schedule();
}
function renderPhotos() {
  const box = $('photos'); box.textContent = '';
  const used = MULTI.includes(D.shape) ? 8 : 1;
  PH.forEach((ph, i) => {
    const row = document.createElement('div'); row.className = 'ph' + (i >= used ? ' unused' : '');
    const no = document.createElement('span'); no.className = 'no'; no.textContent = i + 1;
    const cv = document.createElement('canvas'); cv.width = 104; cv.height = 76; const x = cv.getContext('2d');
    const iw = ph.img.naturalWidth || ph.img.width, ih = ph.img.naturalHeight || ph.img.height, k = Math.max(104 / iw, 76 / ih);
    x.drawImage(ph.img, (104 - iw * k) / 2, (76 - ih * k) / 2, iw * k, ih * k);
    const mid = document.createElement('div'); mid.style.minWidth = '0';
    const nm = document.createElement('div'); nm.className = 'nm'; nm.textContent = ph.name; nm.title = ph.name;
    const sel = document.createElement('select'); sel.setAttribute('aria-label', 'Výřez fotky');
    for (const [k2, v] of Object.entries(PANS)) { const o = document.createElement('option'); o.value = k2; o.textContent = 'výřez: ' + v[2]; sel.append(o); }
    sel.value = ph.pan; sel.onchange = () => { ph.pan = sel.value; schedule(); };
    mid.append(nm, sel);
    if (i >= used) { const s = document.createElement('div'); s.className = 'hint'; s.textContent = used === 1 ? 'tento tvar použije jen 1. fotku' : 'víc než 8 fotek se nepoužije'; mid.append(s); }
    const btns = document.createElement('div'); btns.className = 'btns';
    const mk = (t, lbl, fn, dis) => { const b = document.createElement('button'); b.type = 'button'; b.textContent = t; b.title = lbl; b.setAttribute('aria-label', lbl); b.disabled = !!dis; b.onclick = fn; btns.append(b); };
    mk('↑', 'Posunout výš', () => { [PH[i - 1], PH[i]] = [PH[i], PH[i - 1]]; renderPhotos(); schedule(); }, i === 0);
    mk('↓', 'Posunout níž', () => { [PH[i + 1], PH[i]] = [PH[i], PH[i + 1]]; renderPhotos(); schedule(); }, i === PH.length - 1);
    mk('×', 'Odebrat fotku', () => { PH.splice(i, 1); renderPhotos(); schedule(); });
    row.append(no, cv, mid, btns); box.append(row);
  });
  $('btnClear').hidden = !PH.length;
}
function samplePhoto(kind) {
  const c = document.createElement('canvas'); c.width = 900; c.height = 600; const x = c.getContext('2d');
  const grad = (y0, y1, a, b) => { const g = x.createLinearGradient(0, y0, 0, y1); g.addColorStop(0, a); g.addColorStop(1, b); return g; };
  const glow = (cx, cy, r, col) => { const g = x.createRadialGradient(cx, cy, 4, cx, cy, r); g.addColorStop(0, col); g.addColorStop(1, 'rgba(255,255,255,0)'); x.fillStyle = g; x.fillRect(0, 0, 900, 600); };
  const hill = (pts, col) => { x.fillStyle = col; x.beginPath(); x.moveTo(0, 600); pts.forEach(p => x.lineTo(p[0], p[1])); x.lineTo(900, 600); x.closePath(); x.fill(); };
  if (kind === 0) { // hory a jezero
    x.fillStyle = grad(0, 360, '#8d99a6', '#f1f2ee'); x.fillRect(0, 0, 900, 600); glow(660, 150, 140, '#ffffff');
    hill([[0, 330], [120, 200], [230, 280], [360, 140], [480, 270], [600, 200], [740, 300], [900, 220]], '#77818a');
    hill([[0, 400], [170, 320], [320, 380], [470, 310], [640, 390], [780, 330], [900, 370]], '#4b545b');
    x.fillStyle = grad(430, 600, '#c8cdd1', '#7d858a'); x.fillRect(0, 432, 900, 168);
    x.fillStyle = '#262b2f'; for (let i = 0; i < 12; i++) { const tx = 20 + i * 34 + (i % 2) * 10, th = 90 + (i * 41) % 60; x.beginPath(); x.moveTo(tx, 440 - th); x.lineTo(tx + 20, 442); x.lineTo(tx - 20, 442); x.fill(); }
  } else if (kind === 1) { // západ slunce nad mořem
    x.fillStyle = grad(0, 380, '#5b6470', '#e9e3d6'); x.fillRect(0, 0, 900, 600); glow(450, 360, 260, '#fffaf0');
    x.fillStyle = '#fffdf8'; x.beginPath(); x.arc(450, 365, 60, 0, Math.PI * 2); x.fill();
    x.fillStyle = grad(380, 600, '#9aa1a6', '#3a4045'); x.fillRect(0, 380, 900, 220);
    x.fillStyle = 'rgba(255,255,250,.55)'; for (let i = 0; i < 14; i++) x.fillRect(450 - 90 + i * 3 - (i * 7) % 40, 395 + i * 14, 180 - i * 9, 4);
    x.fillStyle = '#2a2f33'; x.beginPath(); x.moveTo(0, 600); x.lineTo(0, 470); x.quadraticCurveTo(140, 440, 260, 520); x.lineTo(300, 600); x.fill();
  } else { // strom na louce
    x.fillStyle = grad(0, 420, '#a7b0b8', '#f4f4f0'); x.fillRect(0, 0, 900, 600); glow(220, 130, 160, '#ffffff');
    hill([[0, 470], [300, 430], [600, 455], [900, 420]], '#6c757b');
    x.fillStyle = '#2f3438'; x.fillRect(520, 270, 26, 190);
    for (const [cx, cy, r] of [[533, 230, 95], [470, 270, 70], [600, 265, 75], [533, 170, 70]]) { x.beginPath(); x.arc(cx, cy, r, 0, Math.PI * 2); x.fill(); }
    x.fillStyle = '#3d4449'; x.fillRect(0, 520, 900, 80);
  }
  return c;
}
$('btnSamples').onclick = () => { ['Hory a jezero', 'Západ slunce', 'Strom na louce'].forEach((n, i) => PH.push({ id: ++phSeq, name: 'Ukázka: ' + n, img: samplePhoto(i), pan: 'c' })); renderPhotos(); schedule(); };
$('btnClear').onclick = () => { PH = []; renderPhotos(); schedule(); };
const drop = $('drop');
drop.onclick = () => $('inPh').click();
drop.onkeydown = (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); $('inPh').click(); } };
$('inPh').onchange = (e) => { addFiles(e.target.files); e.target.value = ''; };
drop.addEventListener('dragover', (e) => { e.preventDefault(); drop.classList.add('over'); });
drop.addEventListener('dragleave', () => drop.classList.remove('over'));
drop.addEventListener('drop', (e) => { e.preventDefault(); drop.classList.remove('over'); addFiles(e.dataTransfer.files); });

/* ===== Ovládání ===== */
function syncUI() {
  document.querySelectorAll('[data-k]').forEach(el => { const v = D[el.dataset.k]; if (el.type === 'checkbox') el.checked = !!v; else el.value = v; });
  document.querySelectorAll('input[type=radio]').forEach(r => { r.checked = String(D[r.name]) === r.value; });
  updateUI();
}
function updateUI() {
  const tok = { flat: D.shape === 'flat', arc: D.shape === 'arc', shaped: D.shape === 'shaped', cyl: D.shape === 'cyl', heartL: D.shape === 'heartL', shade: D.shape === 'shade',
    wave: D.shape === 'shade' && D.shadeProfile === 'wave', cross: D.cross, customSocket: D.socket === 'custom',
    sideTop: D.shape === 'shade' && D.shadeSide !== 'straight', sideWaist: D.shape === 'shade' && D.shadeSide === 'waist', sideBell: D.shape === 'shade' && D.shadeSide === 'bell' };
  $('lblShadeD').textContent = tok.sideTop ? 'Průměr dole' : 'Průměr';
  $('sideHint').textContent = { straight: 'Klasický válec.', cone: 'Rovné šikmé stěny, nahoře užší nebo širší podle průměrů.', waist: 'Uprostřed zúžené jako přesýpací hodiny. Průměr dole a nahoře může být stejný, nebo různý.', bell: 'Kužel se stěnou vyklenutou po výšce: kladné vyklenutí dá tvar zvonu, záporné tvar tulipánu.' }[D.shadeSide] || '';
  document.querySelectorAll('[data-show]').forEach(el => { el.hidden = !el.dataset.show.split(' ').some(t => tok[t]); });
  $('rowH').hidden = !(tok.flat || tok.arc) || D.autoH;
  $('oBright').textContent = (D.bright > 0 ? '+' : '') + fmt(D.bright * 100, 0) + ' %';
  $('oContrast').textContent = fmt(D.contrast, 2) + '×';
  renderExplain();
}
/** Na telefonu udrží ovládací prvek na stejném místě obrazovky, i když se nad ním změní obsah. */
function keepInPlace(el, fn) {
  if (window.innerWidth > 860) return fn();
  const t0 = el.getBoundingClientRect().top; fn();
  const t1 = el.getBoundingClientRect().top; if (Math.abs(t1 - t0) > 2) window.scrollBy(0, t1 - t0);
}
document.querySelectorAll('[data-k]').forEach(el => {
  const ev = (el.type === 'checkbox' || el.tagName === 'SELECT') ? 'change' : 'input';
  el.addEventListener(ev, () => {
    let v = el.type === 'checkbox' ? el.checked : el.value;
    if (el.type === 'number' || el.type === 'range') { v = parseFloat(v); if (!isFinite(v)) return; }
    else if (el.tagName === 'SELECT' && isNum(v)) v = parseFloat(v);
    D[el.dataset.k] = v;
    if (el.dataset.k === 'socket' && SOCKETS[v]) { D.socketD = SOCKETS[v]; document.querySelector('[data-k="socketD"]').value = D.socketD; }
    keepInPlace(el, updateUI); saveState(); schedule();
  });
});
document.querySelectorAll('input[type=radio]').forEach(r => r.addEventListener('change', () => {
  D[r.name] = r.value;
  keepInPlace(r.closest('label') || r, () => { if (r.name === 'shape') { fitNext = true; renderPhotos(); } updateUI(); });
  saveState(); schedule();
}));

/* ===== 3D scéna ===== */
const cv = $('cv');
let renderer = null, scene, camera, bedGroup, meshes = [], fitNext = true, model = null, lit = false;
const orbit = { theta: -Math.PI / 2, phi: 1.2, r: 300, target: new THREE.Vector3() };
function initGL() {
  try { renderer = new THREE.WebGLRenderer({ canvas: cv, antialias: true }); } catch (e) { renderer = null; return; }
  renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
  scene = new THREE.Scene(); camera = new THREE.PerspectiveCamera(35, 1, 0.5, 6000); camera.up.set(0, 0, 1);
  scene.add(new THREE.HemisphereLight(0xffffff, 0x445055, 0.8));
  const d1 = new THREE.DirectionalLight(0xffffff, 0.55); d1.position.set(-150, -250, 300); scene.add(d1);
  const d2 = new THREE.DirectionalLight(0xffffff, 0.3); d2.position.set(200, 150, 120); scene.add(d2);
  applyTheme(); new ResizeObserver(resize).observe($('viewer'));
}
function makeBed() {
  if (bedGroup) { scene.remove(bedGroup); bedGroup.traverse(o => o.geometry && o.geometry.dispose()); }
  bedGroup = new THREE.Group(); const X = D.bedX, Y = D.bedY, minor = [], major = [];
  for (let x = -X / 2; x <= X / 2 + 0.01; x += 10) (Math.round(x) % 50 === 0 ? major : minor).push(x, -Y / 2, 0, x, Y / 2, 0);
  for (let y = -Y / 2; y <= Y / 2 + 0.01; y += 10) (Math.round(y) % 50 === 0 ? major : minor).push(-X / 2, y, 0, X / 2, y, 0);
  for (const [arr, col] of [[minor, css('--grid')], [major, css('--grid-major')]]) { const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(arr, 3)); bedGroup.add(new THREE.LineSegments(g, new THREE.LineBasicMaterial({ color: new THREE.Color(col) }))); }
  bedGroup.position.z = -0.05; bedGroup.visible = !lit; scene.add(bedGroup);
}
function applyTheme() { if (!renderer) return; scene.background = new THREE.Color(css(lit ? '--night' : '--view')); makeBed(); paintMeshes(); draw(); }
matchMedia('(prefers-color-scheme: dark)').addEventListener('change', applyTheme);
new MutationObserver(applyTheme).observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
function resize() { if (!renderer) return; const r = $('viewer').getBoundingClientRect(); if (!r.width) return; renderer.setSize(r.width, r.height, false); camera.aspect = r.width / r.height; camera.updateProjectionMatrix(); draw(); }
let raf = 0;
function draw() { if (!renderer || raf) return; raf = requestAnimationFrame(() => { raf = 0; const t = orbit.target, s = Math.sin(orbit.phi);
  camera.position.set(t.x + orbit.r * s * Math.cos(orbit.theta), t.y + orbit.r * s * Math.sin(orbit.theta), t.z + orbit.r * Math.cos(orbit.phi)); camera.lookAt(t); renderer.render(scene, camera); }); }
function fit(view) {
  if (!model || !renderer) return; const s = model.size; orbit.target.set(0, 0, s.z / 2);
  const span = Math.max(s.x, s.y, s.z, 20);
  orbit.r = span / (2 * Math.tan(THREE.MathUtils.degToRad(35) / 2)) * Math.max(1.65, 2.3 / camera.aspect);
  if (view === 'front') { orbit.theta = -Math.PI / 2; orbit.phi = model.lying ? 0.001 : Math.PI / 2 - 0.02; }
  else { orbit.theta = -Math.PI / 2 - 0.5; orbit.phi = model.lying ? 0.7 : 1.25; }
  draw();
}
$('vFront').onclick = () => fit('front'); $('vPersp').onclick = () => fit('persp');
const ptrs = new Map(); let pinch0 = 0, r0 = 0;
cv.addEventListener('contextmenu', e => e.preventDefault());
cv.addEventListener('pointerdown', e => { cv.setPointerCapture(e.pointerId); ptrs.set(e.pointerId, { x: e.clientX, y: e.clientY }); if (ptrs.size === 2) { const [a, b] = [...ptrs.values()]; pinch0 = Math.hypot(a.x - b.x, a.y - b.y); r0 = orbit.r; } });
cv.addEventListener('pointermove', e => { const p = ptrs.get(e.pointerId); if (!p) return; const dx = e.clientX - p.x, dy = e.clientY - p.y; p.x = e.clientX; p.y = e.clientY;
  if (ptrs.size === 2) { const [a, b] = [...ptrs.values()]; const d = Math.hypot(a.x - b.x, a.y - b.y); if (pinch0) orbit.r = r0 * pinch0 / d; }
  else { orbit.theta -= dx * 0.008; orbit.phi = Math.min(Math.PI - 0.05, Math.max(0.001, orbit.phi - dy * 0.008)); } draw(); });
const pup = e => { ptrs.delete(e.pointerId); if (ptrs.size < 2) pinch0 = 0; }; cv.addEventListener('pointerup', pup); cv.addEventListener('pointercancel', pup);
cv.addEventListener('wheel', e => { e.preventDefault(); orbit.r = Math.min(5000, Math.max(5, orbit.r * Math.exp(e.deltaY * 0.0012))); draw(); }, { passive: false });

/* „Rozsvítit“: barva podle tloušťky – tenké místo propustí víc světla */
function paintMeshes() {
  if (!renderer) return;
  const glow = new THREE.Color(css('--glow')), base = new THREE.Color(css('--model'));
  for (const m of meshes) {
    if (m.material) m.material.dispose();
    if (lit) {
      const g = m.geometry, tv = g.userData.tv, n = g.attributes.position.count;
      if (!g.attributes.color || g.userData.colTMin !== model.tMin) {
        const col = new Float32Array(n * 3);
        for (let i = 0; i < n; i++) {
          const t = tv ? tv[i] : 6; const k = 0.04 + 0.96 * Math.exp(-1.35 * Math.max(0, t - model.tMin));
          col[i * 3] = glow.r * k; col[i * 3 + 1] = glow.g * k; col[i * 3 + 2] = glow.b * k;
        }
        g.setAttribute('color', new THREE.BufferAttribute(col, 3)); g.userData.colTMin = model.tMin;
      }
      m.material = new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.DoubleSide });
    } else m.material = new THREE.MeshStandardMaterial({ color: base, roughness: 0.75, metalness: 0 });
  }
  $('viewer').classList.toggle('lit', lit);
  if (bedGroup) bedGroup.visible = !lit;
  scene.background = new THREE.Color(css(lit ? '--night' : '--view'));
}
$('btnLight').onclick = () => { lit = !lit; $('btnLight').setAttribute('aria-pressed', String(lit)); $('btnLight').textContent = lit ? 'Zhasnout' : 'Rozsvítit'; paintMeshes(); draw(); };
function setModel(m) {
  for (const mm of meshes) { scene && scene.remove(mm); mm.geometry.dispose(); }
  meshes = []; model = m;
  if (!m) { $('dims').textContent = '–'; $('stats').textContent = ''; $('btnSave').disabled = true; draw(); return; }
  $('btnSave').disabled = false;
  if (renderer) { for (const p of m.parts) { const mesh = new THREE.Mesh(p); scene.add(mesh); meshes.push(mesh); } paintMeshes(); }
  if (fitNext) { fit('persp'); fitNext = false; } else draw();
}

/* ===== Výpočet modelu ===== */
let tmr = 0;
function schedule() { clearTimeout(tmr); tmr = setTimeout(() => { $('busy').hidden = false; setTimeout(() => { try { build(); } finally { $('busy').hidden = true; } }, 30); }, 250); }
function showMsgs(list) { const box = $('msgs'); box.textContent = ''; for (const m of list) { const d = document.createElement('div'); d.className = 'msg ' + m.lvl; d.textContent = m.msg; box.append(d); } }
function adjFor(ph) { const p = PANS[ph.pan] || PANS.c; return { fit: D.fit, auto: D.autoLevels, bright: D.bright, contrast: D.contrast, invert: D.invert, panX: p[0], panY: p[1] }; }
const MAX_CELLS = 1300000;

function build() {
  const msgs = [];
  if (!PH.length) { setModel(null); showMsgs([{ lvl: 'info', msg: 'Začněte krokem 1: vyberte fotky, nebo si to vyzkoušejte s ukázkovými fotkami.' }]); return; }
  const tMin = Math.max(0.3, Math.min(D.tMin, D.tMax - 0.4)), tMax = Math.max(D.tMax, tMin + 0.4);
  let res = D.res; const parts = []; let lying = false, flip = false, note = '';
  const s = D.shape;

  if (s === 'flat' || s === 'arc') {
    const ph = PH[0], iw = ph.img.naturalWidth || ph.img.width, ih = ph.img.naturalHeight || ph.img.height;
    const Wmm = D.width, Hmm = D.autoH ? Math.round(Wmm * ih / iw) : D.height;
    if (Wmm * Hmm * res * res > MAX_CELLS) { res = Math.sqrt(MAX_CELLS / (Wmm * Hmm)); msgs.push({ lvl: 'info', msg: 'Jemnost jsem pro tuto velikost snížil, aby soubor nebyl příliš velký.' }); }
    const W = Math.round(Wmm * res) + 1, H = Math.round(Hmm * res) + 1, f = Math.round(D.frame * res);
    if (W - 2 * f < 8 || H - 2 * f < 8) { setModel(null); showMsgs([{ lvl: 'bad', msg: 'Destička je pro takový rámeček příliš malá. Zvětšete ji nebo zmenšete rámeček.' }]); return; }
    const T = new Float32Array(W * H).fill(tMax);
    const L = photoLuma(ph.img, W - 2 * f, H - 2 * f, adjFor(ph));
    for (let y = 0; y < H - 2 * f; y++) for (let x = 0; x < W - 2 * f; x++) T[(y + f) * W + x + f] = lumaToT(L[y * (W - 2 * f) + x], tMin, tMax);
    const g = openLitho(T, W, H, 1 / res, s === 'arc' ? D.curveDeg : 0);
    parts.push(g);
    if (D.stand) {
      const footH = 4; g.translate(0, 0, footH - 1); g.computeBoundingBox(); const b = g.boundingBox;
      parts.push(prismSolid([{ outer: rectPath(b.min.x - 3, b.min.y - 8, b.max.x + 3, b.max.y + 8), holes: [] }], 0, footH));
    }
    if (PH.length > 1) msgs.push({ lvl: 'info', msg: 'Tento tvar použije jen první fotku. Pořadí změníte šipkami u fotek.' });
  } else if (s === 'shaped') {
    const ph = PH[0], S = D.shapedSize;
    const pts = D.outline === 'heart' ? heartOutline(S * 0.97) : D.outline === 'circle' ? circleOutline(S / 2) : D.outline === 'oval' ? ellipseOutline(S * 0.38, S / 2) : roundOutline(starOutline(S / 2), 1.5, 1.5);
    let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity; for (const p of pts) { x0 = Math.min(x0, p[0]); x1 = Math.max(x1, p[0]); y0 = Math.min(y0, p[1]); y1 = Math.max(y1, p[1]); }
    x0 -= 1; y0 -= 1; x1 += 1; y1 += 1;
    if ((x1 - x0) * (y1 - y0) * res * res > MAX_CELLS) res = Math.sqrt(MAX_CELLS / ((x1 - x0) * (y1 - y0)));
    const W = Math.ceil((x1 - x0) * res) + 1, H = Math.ceil((y1 - y0) * res) + 1, px = 1 / res, cw = W - 1, ch = H - 1;
    const c = document.createElement('canvas'); c.width = cw; c.height = ch; const ctx = c.getContext('2d');
    ctx.setTransform(res, 0, 0, -res, -x0 * res, y1 * res);
    ctx.beginPath(); pts.forEach((p, i) => i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1])); ctx.closePath(); ctx.fill();
    let insideTmp = ctx.getImageData(0, 0, cw, ch).data;
    if (D.hang) { // očko: otvor ve středu horního okraje, kolem něj rámeček
      const colX = Math.round((0 - x0) * res); let top = 0; while (top < ch && insideTmp[(top * cw + colX) * 4 + 3] < 128) top++;
      const holeR = 2.6, cy = y1 - (top * px) - (holeR + Math.max(2.5, D.frame) + 0.5);
      ctx.globalCompositeOperation = 'destination-out'; ctx.beginPath(); ctx.arc(0, cy, holeR, 0, Math.PI * 2); ctx.fill(); ctx.globalCompositeOperation = 'source-over';
      insideTmp = ctx.getImageData(0, 0, cw, ch).data;
    }
    const inside = new Uint8Array(cw * ch); for (let i = 0; i < inside.length; i++) inside[i] = insideTmp[i * 4 + 3] >= 128 ? 1 : 0;
    const dist = maskDistance(inside, cw, ch), frameCells = Math.max(D.frame, D.hang ? 2.5 : 0) * res;
    const L = photoLuma(ph.img, W, H, adjFor(ph)), T = new Float32Array(W * H);
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      let m = Infinity; for (const [cx, cy] of [[x - 1, y - 1], [x, y - 1], [x - 1, y], [x, y]]) m = Math.min(m, cx < 0 || cy < 0 || cx >= cw || cy >= ch ? 0 : dist[cy * cw + cx]);
      T[y * W + x] = m <= frameCells ? tMax : lumaToT(L[y * W + x], tMin, tMax);
    }
    parts.push(maskLitho(inside, T, W, H, px)); lying = true;
    if (PH.length > 1) msgs.push({ lvl: 'info', msg: 'Tento tvar použije jen první fotku. Pořadí změníte šipkami u fotek.' });
  } else {
    // uzavřené tvary: válec, srdcová lucerna, stínítko
    let base, Hmm, label, prof = null, note2 = '';
    if (s === 'cyl') { base = circleOutline(D.diameter / 2 - tMax, 1440); Hmm = D.lanternH; label = 'válce'; }
    else if (s === 'heartL') {
      base = roundOutline(heartOutline(D.heartW - 2 * tMax), tMax + 3, 3);
      let bi = 0, bv = Infinity; base.forEach((p, i) => { if (p[1] > 0 && Math.abs(p[0]) < bv) { bv = Math.abs(p[0]); bi = i; } }); base = base.slice(bi).concat(base.slice(0, bi)); // šev v prohlubni srdce
      Hmm = D.lanternH; label = 'srdce';
    } else {
      base = D.shadeProfile === 'wave' ? waveOutline(D.shadeD / 2 - tMax, D.waveDepth, D.lobes) : circleOutline(D.shadeD / 2 - tMax, 1440);
      Hmm = D.shadeH; label = 'stínítka';
      const Rb = D.shadeD / 2 - tMax, Rt = D.shadeDTop / 2 - tMax;
      prof = sideProfile(D.shadeSide, Rb, Rt, Hmm, D.waist, D.bow);
      let sMin = Infinity, slope = 0; for (let z = 0; z <= Hmm; z += Hmm / 60) { sMin = Math.min(sMin, prof.s(z)); slope = Math.max(slope, Math.abs(prof.ds(z) * Rb)); }
      if (sMin < 0.25) { setModel(null); showMsgs([{ lvl: 'bad', msg: 'Stínítko by se v nejužším místě skoro uzavřelo. Zmenšete zúžení nebo vyklenutí, nebo zvětšete průměr.' }]); return; }
      if (slope > 1) msgs.push({ lvl: 'warn', msg: 'Stěna je místy skloněná víc než 45°. Taková převislá místa se bez podpěr tisknou špatně, zkuste mírnější tvar.' });
      if (D.shadeSide !== 'straight') note2 = 'Fotky se na šikmé stěně směrem k užšímu konci mírně zúží.';
    }
    const len = resampleClosed(base, 400).length;
    if (len * Hmm * res * res > MAX_CELLS) { res = Math.sqrt(MAX_CELLS / (len * Hmm)); msgs.push({ lvl: 'info', msg: 'Jemnost jsem pro tuto velikost snížil, aby soubor nebyl příliš velký (do 70 MB).' }); }
    const M = Math.max(60, Math.round(len * res)), curve = resampleClosed(base, M);
    const Rr = Math.round(Hmm * res) + 1, rowH = Hmm / (Rr - 1);
    if (minConcaveRadius(curve) < tMax + 0.3) msgs.push({ lvl: 'warn', msg: `Prohnutí ${label} je na tloušťku stěny příliš ostré a stěna by se mohla sama překrývat. Zmenšete hloubku vln, nebo přidejte méně vln.` });
    // pásy nahoře a dole (rámeček, dno, kříž)
    const floorT = 1.6, crossOn = s === 'shade' && D.cross;
    let topMM = D.frame, botMM = D.frame;
    if ((s === 'cyl' || s === 'heartL') && D.floor) botMM = Math.max(D.frame, floorT + 2);
    if (crossOn) { if (D.crossPos === 'top') topMM = Math.max(D.frame, D.crossH + 2); else botMM = Math.max(D.frame, D.crossH + 2); }
    const r0 = Math.round(topMM / rowH), r1 = Rr - Math.round(botMM / rowH);
    const N = Math.min(8, PH.length), gap = Math.max(1, Math.round(D.frame * res));
    const T = new Float32Array(Rr * M).fill(tMax);
    for (let k = 0; k < N; k++) {
      const c0 = Math.round(k * M / N) + Math.ceil(gap / 2), c1 = Math.round((k + 1) * M / N) - Math.floor(gap / 2), pw = c1 - c0, ph_ = r1 - r0;
      if (pw < 8 || ph_ < 8) continue;
      const L = photoLuma(PH[k].img, pw, ph_, adjFor(PH[k]));
      for (let y = 0; y < ph_; y++) for (let x = 0; x < pw; x++) T[(r0 + y) * M + c0 + x] = lumaToT(L[y * pw + x], tMin, tMax);
    }
    parts.push(closedLitho(curve, T, Rr, M, rowH, prof));
    if ((s === 'cyl' || s === 'heartL') && D.floor) parts.push(lanternFloor(curve, floorT, tMax * 0.6));
    if (crossOn) {
      const zc = D.crossPos === 'top' ? Hmm - D.crossH / 2 : D.crossH / 2, kc = prof ? prof.s(zc) : 1;
      const cCurve = { p: curve.p.map(q => [q[0] * kc, q[1] * kc]) };
      let rMin = Infinity; for (const p of cCurve.p) rMin = Math.min(rMin, Math.hypot(p[0], p[1]));
      const holeD = D.socket === 'custom' ? D.socketD : SOCKETS[D.socket], ringW = 5;
      if (holeD / 2 + ringW + 6 > rMin) msgs.push({ lvl: 'bad', msg: `Otvor pro objímku (${fmt(holeD)} mm) se do stínítka nevejde. Zvětšete průměr stínítka.` });
      else {
        const z0 = D.crossPos === 'top' ? Hmm - D.crossH : 0, z1 = D.crossPos === 'top' ? Hmm : D.crossH;
        const start = D.shadeProfile === 'wave' ? Math.PI / D.lobes : 0;
        parts.push(spiderCross(cCurve, holeD, ringW, D.spokes, D.spokeW, z0, z1, start));
        flip = D.crossPos === 'top';
      }
    }
    const per = len / N;
    if (N < 2 && s !== 'cyl') msgs.push({ lvl: 'info', msg: `Přidejte víc fotek: každá fotka vytvoří jeden díl ${label}.` });
    if (s === 'shade' && D.shadeProfile === 'wave' && N !== D.lobes && N > 1) msgs.push({ lvl: 'info', msg: `Máte ${plural(N, 'fotku', 'fotky', 'fotek')} a ${plural(D.lobes, 'vlnu', 'vlny', 'vln')}. Nejhezčí je stejný počet, pak připadne jedna fotka na každou vlnu.` });
    note = `Jeden díl s fotkou má asi ${fmt(per - D.frame, 0)} × ${fmt(Hmm - topMM - botMM, 0)} mm.` + (note2 ? ' ' + note2 : '');
  }

  const size = centerGeoms(parts);
  const m = { parts, size, lying, flip, tMin, res };
  setModel(m);

  // kontroly a souhrn
  const fits = (size.x <= D.bedX && size.y <= D.bedY) || (size.y <= D.bedX && size.x <= D.bedY);
  if (!fits) msgs.push({ lvl: 'bad', msg: `Model (${fmt(size.x)} × ${fmt(size.y)} mm) se nevejde na tiskovou plochu ${D.bedX} × ${D.bedY} mm.` });
  if (size.z > D.bedZ) msgs.push({ lvl: 'bad', msg: `Model je vysoký ${fmt(size.z)} mm, tiskárna zvládne jen ${D.bedZ} mm.` });
  if (flip) msgs.push({ lvl: 'info', msg: 'Ve staženém souboru bude stínítko otočené křížem dolů, aby se kříž tiskl na podložce a ne ve vzduchu. Po vytištění ho jen otočíte.' });
  if (s === 'shade') msgs.push({ lvl: 'warn', msg: 'Do stínítka patří jen LED žárovka (nejvýš asi 7 W). Klasická nebo halogenová žárovka by plast roztavila.' });
  if (!msgs.some(x => x.lvl === 'bad' || x.lvl === 'warn')) msgs.unshift({ lvl: 'ok', msg: 'Model je připravený. Klepněte na „Rozsvítit“ a uvidíte, jak bude fotka vypadat proti světlu.' });
  showMsgs(msgs);

  let tris = 0, vol = 0; for (const g of parts) { tris += g.attributes.position.count / 3; vol += Math.abs(signedVolume(g.attributes.position.array)); }
  const cm3 = vol / 1000, grams = cm3 * 1.24, hours = cm3 * 0.25 + 0.3;
  $('dims').innerHTML = `<b>${fmt(size.x)}</b> × <b>${fmt(size.y)}</b> × <b>${fmt(size.z)}</b> mm`;
  const tiles = [['Materiál', `${fmt(grams, 0)} g`], ['Tisk zhruba', hours < 1 ? `${fmt(hours * 60, 0)} min` : `${fmt(hours, 0)} h`], ['Soubor', `${fmt(tris * 50 / 1048576, 0)} MB`], ['Jemnost', `${fmt(1 / res, 2)} mm`]];
  const box = $('stats'); box.textContent = '';
  for (const [a, b] of tiles) { const d = document.createElement('div'); d.className = 'stat'; const s1 = document.createElement('span'); s1.textContent = a; const s2 = document.createElement('b'); s2.textContent = b; d.append(s1, s2); box.append(d); }
  $('saveNote').textContent = (note ? note + ' ' : '') + 'Odhad počítá s bílým PLA a výplní 100 %.';
}

/* ===== Stažení ===== */
const inViewer = !!(window.claude && typeof window.claude.use === 'function');
let dlCap = null;
if (inViewer) window.claude.use('downloads').then(d => { dlCap = d; });
$('btnSave').onclick = async () => {
  if (!model) return;
  const geoms = model.parts.map(g => { const c = new THREE.BufferGeometry(); c.setAttribute('position', g.attributes.position.clone()); return c; });
  if (model.flip) { for (const g of geoms) g.rotateX(Math.PI); centerGeoms(geoms); }
  const data = stlBinary(geoms);
  const names = { flat: 'rovna', arc: 'prohnuta', shaped: D.outline === 'heart' ? 'srdce' : D.outline, cyl: 'lucerna', heartL: 'srdcova-lucerna', shade: 'stinitko' };
  const name = `svitici-fotka_${names[D.shape]}.stl`;
  if (inViewer) {
    if (!dlCap) { $('saveNote').textContent = 'Stahování je v tomto zobrazení nedostupné.'; return; }
    try { await dlCap.save({ filename: name.replace(/\.stl$/, '.zip'), data: makeZip([{ name, data }]) }); $('saveNote').textContent = 'ZIP je uložený. Rozbalte ho a STL otevřete ve sliceru.'; }
    catch (e) { if (e && e.code !== 'declined') $('saveNote').textContent = 'Soubor se nepodařilo uložit.'; }
    return;
  }
  const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([data], { type: 'model/stl' })); a.download = name; document.body.append(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 3000);
};

/* ===== Instalace jako aplikace a sbalitelné sekce ===== */
let installEvt = null;
window.addEventListener('beforeinstallprompt', (e) => { e.preventDefault(); installEvt = e; $('btnInstall').hidden = false; });
window.addEventListener('appinstalled', () => { installEvt = null; $('btnInstall').hidden = true; });
$('btnInstall').onclick = async () => { if (!installEvt) return; installEvt.prompt(); try { await installEvt.userChoice; } catch (e) {} installEvt = null; $('btnInstall').hidden = true; };
if (!inViewer && 'serviceWorker' in navigator && (location.protocol === 'https:' || location.hostname === 'localhost')) navigator.serviceWorker.register('sw.js').catch(() => {});
(function () {
  const KEY = 'svitici-fotky-sbaleno';
  let closed; try { closed = JSON.parse(localStorage.getItem(KEY) || 'null'); } catch (e) { closed = null; }
  if (!Array.isArray(closed)) closed = ['Tloušťka a jemnost', 'Tiskárna', 'Rady k tisku a výběru fotek'];
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
initGL(); syncUI(); renderPhotos();
$('btnSamples').click(); // ukázka hned po otevření
if (!renderer) showMsgs([{ lvl: 'warn', msg: 'Prohlížeč nepodporuje WebGL, 3D náhled se nezobrazí. Stažení funguje dál.' }]);

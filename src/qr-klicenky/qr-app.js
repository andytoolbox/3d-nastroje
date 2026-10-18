/* ===== QR klíčenky — aplikace. Created by Julius Andy Antoš ===== */
const $ = (id) => document.getElementById(id);
const DEF = {
  qr: { type: 'text', web: '', ig: '', fb: '', tt: '', yt: '', wa: '', waMsg: '', tel: '', mail: '', mailSubj: '', sms: '', smsMsg: '',
        vcFirst: '', vcLast: '', vcTel: '', vcMail: '', vcOrg: '', vcWeb: '', geo: '', text: 'Ahoj z 3D tiskárny!',
        ssid: '', pass: '', sec: 'WPA', hidden: false, acc: '', amount: 0, vs: '', msg: '',
        labelOn: true, label: '', labelH: 3.5,
        size: 40, quiet: 2, relief: 'raised', height: 0.8, engDepth: 0.8, baseT: 2.4, radius: 3, ecc: 'M', split: true, stand: false },
  hole: { on: true, pos: 'top', d: 4.5, rim: 2.5 },
  logo: { on: false, src: 'icon', icon: 'srdce', size: 22, shape: 'square', mode: 'dark' },
  bedX: 220, bedY: 220, minStroke: 0.45,
};
const PRESETS = {
  key: { qr: { size: 40, quiet: 2, labelOn: true, labelH: 3.5, baseT: 2.4, height: 0.8, engDepth: 0.8, radius: 3, stand: false }, hole: { on: true, pos: 'top', d: 4.5, rim: 2.5 } },
  card: { qr: { size: 70, quiet: 2, labelOn: true, labelH: 5, baseT: 3, height: 1, engDepth: 1, radius: 4, stand: false }, hole: { on: true, pos: 'top', d: 5, rim: 3 } },
  sign: { qr: { size: 100, quiet: 3, labelOn: true, labelH: 7, baseT: 3, height: 1, engDepth: 1, radius: 5, stand: true }, hole: { on: false } },
};
const STORE = 'qr-klicenky-v1';
const deepMerge = (a, b) => { for (const k in b) { if (b[k] && typeof b[k] === 'object' && !Array.isArray(b[k]) && a[k] && typeof a[k] === 'object') deepMerge(a[k], b[k]); else if (k in a) a[k] = b[k]; } return a; };
const D = JSON.parse(JSON.stringify(DEF));
try { deepMerge(D, JSON.parse(localStorage.getItem(STORE) || '{}')); } catch (e) {}
const saveState = () => { try { localStorage.setItem(STORE, JSON.stringify(D)); } catch (e) {} };
const getK = (p) => p.split('.').reduce((o, k) => o[k], D);
const setK = (p, v) => { const ks = p.split('.'); let o = D; for (let i = 0; i < ks.length - 1; i++) o = o[ks[i]]; o[ks[ks.length - 1]] = v; };
const fmt = (v, d = 1) => v.toLocaleString('cs-CZ', { maximumFractionDigits: d, minimumFractionDigits: d });
const css = (v) => getComputedStyle(document.documentElement).getPropertyValue(v).trim();
const isNum = (s) => /^-?\d+(\.\d+)?$/.test(s);
const COL = { mod: '#1e2428', plate: '#f4f1ea', stand: '#e2ddd1' };

/* ===== Ovládání ===== */
function syncUI() {
  document.querySelectorAll('[data-k]').forEach(el => { const v = getK(el.dataset.k); if (el.type === 'checkbox') el.checked = !!v; else el.value = v; });
  document.querySelectorAll('input[type=radio][name*="."]').forEach(r => { r.checked = String(getK(r.name)) === r.value; });
  updateUI();
}
function updateUI() {
  const eng = D.qr.relief === 'engraved';
  const show = { qrLabel: D.qr.labelOn, hole: D.hole.on, stand: D.qr.stand, logo: D.logo.on, logoImg: D.logo.src === 'img' && LOGO && !LOGO.svgText };
  for (const t of QR_TYPES) show['qr_' + t.id] = D.qr.type === t.id;
  document.querySelectorAll('[data-show]').forEach(el => { el.hidden = !show[el.dataset.show]; });
  renderQrTypes(); renderLogoIcons(); $('oLogo').textContent = D.logo.size + ' %';
  $('qrhLbl').textContent = eng ? 'Hloubka rytí' : 'Výška modulů';
  $('qrh').value = eng ? D.qr.engDepth : D.qr.height;
  $('split').checked = D.qr.split;
  $('splitLbl').textContent = eng ? 'Dvoubarevný tisk: výplň rytí jako samostatný díl' : 'Dvoubarevný tisk: QR a destička jako dva soubory';
}
/** Na telefonu udrží ovládací prvek na stejném místě obrazovky, i když se nad ním změní obsah. */
let anchor = null; // ovládací prvek, na který uživatel naposledy klepl: po přepočtu modelu zůstane na stejném místě
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
function onChange(path) {
  if (path === 'qr.relief' && D.qr.relief === 'engraved' && D.qr.baseT < 2.4) { D.qr.baseT = 2.4; document.querySelector('[data-k="qr.baseT"]').value = 2.4; }
  if (path === 'qr.stand' || path === 'qr.size' || path === 'hole.on') fitNext = true;
  updateUI(); saveState(); schedule();
}
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
$('qrh').oninput = () => { const v = parseFloat($('qrh').value); if (!isFinite(v)) return; if (D.qr.relief === 'engraved') D.qr.engDepth = v; else D.qr.height = v; saveState(); schedule(); };
$('split').onchange = () => { D.qr.split = $('split').checked; saveState(); applyVisibility(); showStats(); };
document.querySelectorAll('[data-preset]').forEach(b => b.onclick = () => {
  const p = PRESETS[b.dataset.preset]; Object.assign(D.qr, p.qr); Object.assign(D.hole, p.hole);
  saveState(); keepInPlace(b, syncUI); fitNext = true; schedule(true);
});
let tmr = 0;
function schedule(now) { clearTimeout(tmr); tmr = setTimeout(rebuild, now ? 0 : 200); }

/* ===== Logo uprostřed QR kódu ===== */
let LOGO = null; // vlastní logo: { img, name, svgText }
const LOGO_KEY = 'qr-klicenky-logo';
function renderLogoIcons() {
  const box = $('logoIcons');
  if (!box.childElementCount) {
    const mk = (id, inner, name) => { const b = document.createElement('button'); b.type = 'button'; b.dataset.id = id; b.setAttribute('role', 'radio'); b.innerHTML = inner; b.append(document.createTextNode(name)); box.append(b); return b; };
    const own = mk('__own', '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 4h16v16H4zM6 17l4-5 3 3 2-2 3 4z"/></svg>', 'Vlastní'); own.id = 'logoOwn';
    own.onclick = () => { if (LOGO) { D.logo.src = 'img'; saveState(); updateUI(); schedule(); } else $('inLogo').click(); };
    for (const ic of ICONS) { const b = mk(ic.id, ic.svg.replace('<svg ', '<svg aria-hidden="true" ').replace(/fill="#000"/, ''), ic.name);
      b.onclick = () => { D.logo.src = 'icon'; D.logo.icon = ic.id; saveState(); updateUI(); schedule(); }; }
  }
  box.querySelectorAll('button').forEach(b => b.setAttribute('aria-checked', String(D.logo.src === 'img' ? b.dataset.id === '__own' : b.dataset.id === D.logo.icon)));
  const own = $('logoOwn'); if (LOGO && LOGO.thumb && !own.querySelector('img')) { own.querySelector('svg').replaceWith(Object.assign(document.createElement('img'), { src: LOGO.thumb, alt: '' })); }
}
const loadImage = (url) => new Promise((res, rej) => { const im = new Image(); im.onload = () => res(im); im.onerror = () => rej(new Error('img')); im.src = url; });
async function setLogoFile(f) {
  if (!f) return;
  try {
    if (/svg/i.test(f.type) || /\.svg$/i.test(f.name)) { const t = await f.text(); LOGO = { name: f.name, svgText: t, thumb: 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(t) }; }
    else { // zmenšit a uložit, aby logo zůstalo i po zavření aplikace
      const im = await loadImage(URL.createObjectURL(f)), k = Math.min(1, 500 / Math.max(im.naturalWidth, im.naturalHeight));
      const c = document.createElement('canvas'); c.width = Math.max(1, Math.round(im.naturalWidth * k)); c.height = Math.max(1, Math.round(im.naturalHeight * k)); c.getContext('2d').drawImage(im, 0, 0, c.width, c.height);
      const url = c.toDataURL('image/png'); LOGO = { name: f.name, img: c, thumb: url };
      if (D.logo.mode === 'alpha' || /png/i.test(f.type)) { const d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data; let tr = false; for (let i = 3; i < d.length; i += 4) if (d[i] < 200) { tr = true; break; } if (tr) D.logo.mode = 'alpha'; else if (D.logo.mode === 'alpha') D.logo.mode = 'dark'; }
    }
    try { localStorage.setItem(LOGO_KEY, JSON.stringify({ name: LOGO.name, svgText: LOGO.svgText || null, png: LOGO.svgText ? null : LOGO.thumb })); } catch (e) {}
    const own = $('logoOwn'), old = own.querySelector('img, svg'); old.replaceWith(Object.assign(document.createElement('img'), { src: LOGO.thumb, alt: '' }));
    D.logo.on = true; D.logo.src = 'img'; logoCache.key = ''; saveState(); syncUI(); schedule();
  } catch (e) { showMsgs([{ lvl: 'bad', msg: 'Logo se nepodařilo otevřít. Zkuste PNG, JPG nebo SVG.' }]); }
}
(function () {
  const drop = $('dropLogo'), inp = $('inLogo');
  drop.onclick = () => inp.click(); drop.onkeydown = (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); inp.click(); } };
  inp.onchange = (e) => { setLogoFile(e.target.files[0]); e.target.value = ''; };
  drop.addEventListener('dragover', (e) => { e.preventDefault(); drop.classList.add('over'); });
  drop.addEventListener('dragleave', () => drop.classList.remove('over'));
  drop.addEventListener('drop', (e) => { e.preventDefault(); drop.classList.remove('over'); setLogoFile(e.dataTransfer.files[0]); });
})();
async function restoreLogo() {
  try { const s = JSON.parse(localStorage.getItem(LOGO_KEY) || 'null'); if (!s) return;
    if (s.svgText) LOGO = { name: s.name, svgText: s.svgText, thumb: 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(s.svgText) };
    else if (s.png) { const im = await loadImage(s.png); const c = document.createElement('canvas'); c.width = im.naturalWidth; c.height = im.naturalHeight; c.getContext('2d').drawImage(im, 0, 0); LOGO = { name: s.name, img: c, thumb: s.png }; }
  } catch (e) { LOGO = null; }
  if (!LOGO && D.logo.src === 'img') D.logo.src = 'icon';
}
let logoCache = { key: '', val: null };
/** Tvar loga jako ExPolygony (libovolné měřítko), nebo { err } */
function logoShape() {
  const L = D.logo, key = L.src === 'img' ? ['img', LOGO && LOGO.name, LOGO && LOGO.thumb && LOGO.thumb.length, L.mode].join('|') : 'icon|' + L.icon;
  if (logoCache.key === key) return logoCache.val;
  let val;
  try {
    if (L.src === 'img' && LOGO && LOGO.svgText) { const sym = svgToSymbol(LOGO.svgText, true); val = sym ? symbolToEx(sym) : { err: 'V SVG logu nejsou žádné plochy ani čáry.' }; }
    else if (L.src === 'img' && LOGO) {
      const c = LOGO.img, data = c.getContext('2d').getImageData(0, 0, c.width, c.height);
      const M = makeMask(data, { mode: L.mode, threshold: null, blur: 1 });
      const ex = loopsToEx(traceMask(M.mask, M.w, M.h), M.h, { smooth: 2, minArea: 12, pxSize: 1 });
      val = ex.length ? ex : { err: 'V logu se nenašel žádný tvar. Zkuste u „Logo tvoří“ jinou možnost.' };
    } else { const ic = ICONS.find(i => i.id === L.icon) || ICONS[0]; val = symbolToEx(svgToSymbol(ic.svg, true)); }
  } catch (e) { val = { err: 'Logo se nepodařilo převést na tvar.' }; }
  logoCache = { key, val }; return val;
}
/* Kreslení QR kódu (i s logem) do plátna: s = pixelů na modul */
function paintQr(c, m, quiet, s, logoEx, module) {
  const n = m.length, tot = (n + 2 * quiet) * s; c.width = c.height = tot; const x = c.getContext('2d');
  x.fillStyle = '#fff'; x.fillRect(0, 0, tot, tot); x.fillStyle = '#000';
  for (let r = 0; r < n; r++) for (let k = 0; k < n; k++) if (m[r][k]) x.fillRect((k + quiet) * s, (r + quiet) * s, s, s);
  if (logoEx && logoEx.length) {
    x.beginPath();
    for (const p of exToPaths(logoEx)) { p.forEach((q, i) => { const px = (q.X / SC / module + quiet) * s, py = (n - q.Y / SC / module + quiet) * s; i ? x.lineTo(px, py) : x.moveTo(px, py); }); x.closePath(); }
    x.fill('nonzero');
  }
  return x;
}
/** Zkusí QR kód přečíst stejně jako telefon. Vrací true / false, nebo null, když čtečka není k dispozici. */
function verifyQr(m, logoEx, module, expect) {
  if (typeof jsQR !== 'function') return null;
  const c = document.createElement('canvas'), x = paintQr(c, m, 4, 6, logoEx, module), d = x.getImageData(0, 0, c.width, c.height);
  const r = jsQR(d.data, c.width, c.height, { inversionAttempts: 'dontInvert' });
  return !!r && r.data === expect;
}

/* ===== 3D scéna ===== */
const cv = $('cv');
let renderer = null, scene, camera, meshA, meshB, meshC, bedGroup, fitNext = true, model = null;
const orbit = { theta: -Math.PI / 2, phi: 0.95, r: 200, target: new THREE.Vector3() };
function initGL() {
  try { renderer = new THREE.WebGLRenderer({ canvas: cv, antialias: true }); } catch (e) { renderer = null; return; }
  renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
  scene = new THREE.Scene(); camera = new THREE.PerspectiveCamera(35, 1, 0.5, 5000); camera.up.set(0, 0, 1);
  scene.add(new THREE.HemisphereLight(0xffffff, 0x445055, 0.75));
  const d1 = new THREE.DirectionalLight(0xffffff, 0.6); d1.position.set(-120, -200, 300); scene.add(d1);
  const d2 = new THREE.DirectionalLight(0xffffff, 0.3); d2.position.set(200, 150, 120); scene.add(d2);
  const mk = (c, r) => new THREE.Mesh(new THREE.BufferGeometry(), new THREE.MeshStandardMaterial({ color: new THREE.Color(c), roughness: r, metalness: 0.02 }));
  meshA = mk(COL.mod, 0.6); meshB = mk(COL.plate, 0.75); meshC = mk(COL.stand, 0.75);
  scene.add(meshA, meshB, meshC); applyTheme();
  new ResizeObserver(resize).observe($('viewer'));
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
  orbit.r = span / (2 * Math.tan(THREE.MathUtils.degToRad(35) / 2)) * Math.max(1.3, 1.9 / camera.aspect);
  if (view === 'top') { orbit.phi = 0.001; orbit.theta = -Math.PI / 2; } else { orbit.phi = 0.75; orbit.theta = -Math.PI / 2 - 0.35; }
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
cv.addEventListener('wheel', e => { e.preventDefault(); orbit.r = Math.min(4000, Math.max(5, orbit.r * Math.exp(e.deltaY * 0.0012))); draw(); }, { passive: false });

function setModel(m) {
  model = m; $('btnSave').disabled = !m; $('btnPng').disabled = !m;
  if (!m) { $('dims').textContent = '–'; $('stats').textContent = ''; }
  else $('dims').innerHTML = `<b>${fmt(m.size.x)}</b> × <b>${fmt(m.size.y)}</b> × <b>${fmt(m.size.z)}</b> mm`;
  if (!renderer) return;
  for (const [mesh, g] of [[meshA, m && m.a], [meshB, m && m.b], [meshC, m && m.c]]) { mesh.geometry.dispose(); mesh.geometry = g || new THREE.BufferGeometry(); }
  applyVisibility(false);
  if (fitNext && m) { fit('persp'); fitNext = false; } else draw();
}
/* Rytý QR bez dvoubarevného tisku: výplň rytí se nezobrazí ani nestáhne */
function applyVisibility(redraw = true) { if (meshA) meshA.visible = !(model && model.inlay && !D.qr.split); if (redraw) draw(); }
function showMsgs(list) { const box = $('msgs'); box.textContent = ''; for (const m of list) { const d = document.createElement('div'); d.className = 'msg ' + m.lvl; d.textContent = m.msg; box.append(d); } }

/* ===== Stojánek: hranol se štěrbinou, tiskne se zvlášť ===== */
const STAND = { ext: 8, slotDepth: 6.5, h: 10, clear: 0.4 };
function standGeometry(plateW, plateT) {
  const L = Math.max(35, Math.min(plateW, plateW * 0.8)), slotW = plateT + STAND.clear, Dp = Math.max(24, slotW + 18), H = STAND.h, floor = H - STAND.slotDepth;
  const prof = diffEx([{ outer: rectPath(0, -Dp / 2, H, Dp / 2), holes: [] }], [{ outer: rectPath(floor, -slotW / 2, H + 1, slotW / 2), holes: [] }]);
  const g = prismSolid(prof, 0, L); g.rotateY(-Math.PI / 2); g.translate(L / 2, 0, 0);
  return { g, L, Dp, slotW };
}

/* ===== Výpočet modelu ===== */
let LASTQR = null;
function rebuild() {
  const msgs = [];
  try { buildQr(msgs); } catch (e) { msgs.push({ lvl: 'bad', msg: 'Model se nepodařilo sestavit: ' + e.message }); setModel(null); }
  showMsgs(msgs); showStats(); holdAnchor();
}
function buildQr(msgs) {
  const q = D.qr, c = qrContent();
  if (c.err) { msgs.push({ lvl: 'bad', msg: c.err }); setModel(null); $('qrInfo').textContent = ''; LASTQR = null; clearScan(); return; }
  const logoOn = D.logo.on, ecc = logoOn ? 'H' : q.ecc;
  let mtx; try { mtx = qrMatrixSmall(c.s, ecc); } catch (e) { msgs.push({ lvl: 'bad', msg: 'Text je pro QR kód příliš dlouhý. Zkraťte ho nebo v části Pokročilé snižte odolnost proti poškození.' }); setModel(null); LASTQR = null; clearScan(); return; }
  const n = mtx.length, module = q.size / (n + 2 * q.quiet);
  // logo: vyčistit střed QR kódu a vložit tvar loga
  let logoEx = null, qm = mtx;
  if (logoOn) {
    const ls = logoShape();
    if (ls.err) msgs.push({ lvl: 'warn', msg: ls.err });
    else {
      let Lm = Math.max(5, Math.round(n * D.logo.size / 100)); if ((n - Lm) % 2) Lm++;
      const c0 = (n - Lm) / 2, ctr = n / 2, circle = D.logo.shape === 'circle';
      qm = mtx.map((row, r) => row.map((v, k) => {
        if (circle) return Math.hypot(k + 0.5 - ctr, r + 0.5 - ctr) <= Lm / 2 + 0.35 ? false : v;
        return r >= c0 && r < c0 + Lm && k >= c0 && k < c0 + Lm ? false : v;
      }));
      const box = (Lm - 1.4) * module * (circle ? 0.74 : 1), bb = boundsEx(ls), kk = box / Math.max(bb.x1 - bb.x0, bb.y1 - bb.y0), mid = n * module / 2;
      logoEx = mapEx(ls, (x, y) => [(x - (bb.x0 + bb.x1) / 2) * kk + mid, (y - (bb.y0 + bb.y1) / 2) * kk + mid]);
      if (thinLoss(logoEx, 0.6) >= 0.15) msgs.push({ lvl: 'warn', msg: 'Logo má tenké čáry, které se nemusí vytisknout. Zvětšete logo nebo celou destičku.' });
    }
  }
  LASTQR = { m: qm, quiet: q.quiet, module, logoEx };
  $('qrInfo').textContent = `${n} × ${n} čtverečků (modulů), jeden má ${fmt(module, 2)} mm` + (logoOn ? ' · kvůli logu vysoká odolnost' : '') + (c.note ? ` · ${c.note}` : '');
  const readable = verifyQr(qm, logoEx, module, mtx.text);
  if (readable === false) msgs.push({ lvl: 'bad', msg: logoEx ? 'S logem v této velikosti se QR kód nedá spolehlivě přečíst. Zmenšete logo, nebo zkraťte obsah QR kódu.' : 'QR kód se nepodařilo ověřit čtečkou. Zkuste jinou odolnost v části Pokročilé.' });
  else if (readable && logoEx) msgs.push({ lvl: 'ok', msg: 'Vyzkoušel jsem QR kód s logem přečíst čtečkou a jde to. Před tiskem ho pro jistotu načtěte i telefonem.' });
  if (module < 1.2) msgs.push({ lvl: 'warn', msg: `Čtverečky mají jen ${fmt(module, 2)} mm a telefon je nemusí přečíst. Zvětšete destičku nebo zkraťte obsah (doporučeno aspoň 1,5 mm).` });
  else if (module < 1.5) msgs.push({ lvl: 'info', msg: `Čtverečky mají ${fmt(module, 2)} mm. Vytisknout to půjde, ale s většími (od 1,5 mm) bude načítání spolehlivější.` });
  let qex = qrToEx(qm, module);
  if (logoEx) qex = unionEx(exToPaths(qex).concat(exToPaths(logoEx)));
  $('qrLabel').placeholder = c.label ? 'Návrh: ' + c.label : 'Text popisku';
  const labelText = (q.label.trim() || c.label || '').trim();
  let labelEx = null;
  if (q.labelOn && labelText) {
    const font = getLabelFont(), side = n * module, maxW = side + q.quiet * module;
    let h = q.labelH, L = layoutText(font, labelText, { size: h, spacing: 0, lineH: 1.2, align: 'center', mirror: false });
    if (L.missing.length) msgs.push({ lvl: 'warn', msg: `Písmo popisku nemá znaky: ${L.missing.join(' ')}. V popisku chybí.` });
    if (L.paths.length) {
      let tex = unionEx(L.paths), b = boundsEx(tex), txt = labelText, lh = 1.2;
      if (b.x1 - b.x0 > maxW && !labelText.includes('\n') && labelText.includes(' ')) { // dlouhý popisek: zalomit na dva řádky v nejlepší mezeře
        const sp = [...labelText].map((ch, i) => ch === ' ' ? i : -1).filter(i => i > 0);
        const cut = sp.reduce((best, i) => Math.abs(i - labelText.length / 2) < Math.abs(best - labelText.length / 2) ? i : best, sp[0]);
        txt = labelText.slice(0, cut) + '\n' + labelText.slice(cut + 1); lh = 1.25;
        L = layoutText(font, txt, { size: h, spacing: 0, lineH: lh, align: 'center', mirror: false }); tex = unionEx(L.paths); b = boundsEx(tex);
      }
      if (b.x1 - b.x0 > maxW) { h = h * maxW / (b.x1 - b.x0); L = layoutText(font, txt, { size: h, spacing: 0, lineH: lh, align: 'center', mirror: false }); tex = unionEx(L.paths); b = boundsEx(tex);
        msgs.push({ lvl: h < 2.5 ? 'warn' : 'info', msg: h < 2.5 ? `Popisek je dlouhý, písmo jsem zmenšil na ${fmt(h)} mm a bude špatně čitelné. Zkraťte ho nebo zvětšete destičku.` : `Popisek jsem zmenšil na ${fmt(h)} mm, aby se vešel pod QR kód.` }); }
      const dx = side / 2 - (b.x0 + b.x1) / 2, dy = -q.quiet * module - b.y1; // pod QR kód, odsazený o tichou zónu
      labelEx = mapEx(tex, (x, y) => [x + dx, y + dy]);
      qex = unionEx(exToPaths(qex).concat(exToPaths(labelEx)));
    }
  }
  if (labelEx && thinLoss(labelEx, D.minStroke) >= 0.12) msgs.push({ lvl: 'warn', msg: 'Písmena popisku jsou na tisk hodně tenká. Zvětšete výšku písma, nebo popisek vypněte.' });

  // destička: obdélník se zaoblením, případně prodloužená dolů pro stojánek, a dírka na kroužek
  const eng = q.relief === 'engraved', padW = q.quiet * module;
  const S = { mode: 'plate', padW, radius: Math.min(q.radius, padW), baseT: q.baseT, height: q.height, engDepth: q.engDepth, relief: eng ? 'engraved' : 'raised', mirror: false, hole: false };
  const parts = finishParts(qex, Object.assign({}, S, { relief: 'raised' }), {});
  const tb = boundsEx(parts.textEx);
  const ext = q.stand ? STAND.ext : 0;
  const x0 = tb.x0 - padW, x1 = tb.x1 + padW, y0 = tb.y0 - padW - ext, y1 = tb.y1 + padW;
  const r = Math.max(0, Math.min(q.radius, (x1 - x0) / 2 - 0.01, (y1 - y0) / 2 - 0.01));
  let baseEx = r > 0 ? offsetEx([{ outer: rectPath(x0 + r, y0 + r, x1 - r, y1 - r), holes: [] }], r) : [{ outer: rectPath(x0, y0, x1, y1), holes: [] }];
  if (D.hole.on) {
    const R = D.hole.d / 2 + D.hole.rim, my = (y0 + y1) / 2 + ext / 2, mx = (x0 + x1) / 2;
    const cx = D.hole.pos === 'left' ? x0 - R / 2 : D.hole.pos === 'right' ? x1 + R / 2 : mx, cy = D.hole.pos === 'top' ? y1 + R / 2 : my;
    baseEx = diffEx(unionEx(exToPaths(baseEx).concat([circlePath(cx, cy, R)])), [{ outer: circlePath(cx, cy, D.hole.d / 2), holes: [] }]);
  }
  parts.baseEx = baseEx;
  if (eng) {
    parts.depth = Math.min(q.engDepth, q.baseT - 0.4);
    if (q.engDepth > q.baseT - 0.4) msgs.push({ lvl: 'warn', msg: `Hloubka rytí je omezená na ${fmt(Math.max(0, parts.depth))} mm, aby pod QR kódem zůstalo aspoň 0,4 mm destičky. Pro hlubší rytí zvyšte tloušťku destičky.` });
    parts.topEx = diffEx(baseEx, parts.textEx);
  }
  const g = buildGeometry(parts, S);
  const m = { a: g.text, b: g.base, c: null, inlay: g.inlay, module, n };
  if (q.stand) {
    g.base.computeBoundingBox(); const bb = g.base.boundingBox;
    const st = standGeometry(bb.max.x - bb.min.x, q.baseT);
    st.g.translate((bb.min.x + bb.max.x) / 2, bb.min.y - 8 - st.Dp / 2, 0);
    m.c = st.g; m.stand = st;
  }
  m.size = centerGeoms([m.a, m.b, m.c]);
  m.colorZ = eng ? q.baseT - parts.depth : q.baseT;
  if (fitNext === false && model && Math.abs(model.size.x - m.size.x) > model.size.x * 0.25) fitNext = true;
  setModel(m);
  drawScan(qm, q.quiet, logoEx, module);

  const fits = (m.size.x <= D.bedX && m.size.y <= D.bedY) || (m.size.y <= D.bedX && m.size.x <= D.bedY);
  if (!fits) msgs.push({ lvl: 'bad', msg: `Model (${fmt(m.size.x)} × ${fmt(m.size.y)} mm) se nevejde na tiskovou plochu ${D.bedX} × ${D.bedY} mm.` });
  if (D.hole.on && q.stand && D.hole.pos !== 'top') msgs.push({ lvl: 'info', msg: 'Se stojánkem se hodí dírka nahoře, nebo žádná.' });
  if (!q.split) msgs.push({ lvl: 'info', msg: `Z jedné barvy se QR kód nenačte. Ve sliceru nastavte změnu filamentu ve výšce ${fmt(m.colorZ)} mm, nebo zapněte dvoubarevný tisk v kroku 5.` });
  else msgs.push({ lvl: 'info', msg: eng ? 'Stáhnete destičku a výplň rytí jako dva soubory. Ve sliceru je vložte jako jeden objekt a výplni dejte tmavou barvu.' : 'Stáhnete QR kód a destičku jako dva soubory. Ve sliceru je vložte jako jeden objekt, QR kód tmavou a destičku světlou barvou.' });
  if (q.stand) msgs.push({ lvl: 'info', msg: `Stojánek je samostatný díl se štěrbinou ${fmt(m.stand.slotW)} mm. Pokud destička drží moc volně nebo nejde zasunout, upravte tloušťku destičky o 0,2 mm.` });
  if (!msgs.some(x => x.lvl === 'bad' || x.lvl === 'warn' || x.lvl === 'ok')) msgs.unshift({ lvl: 'ok', msg: 'Model je připravený. Před tiskem načtěte kontrolní QR kód v náhledu telefonem.' });
}
/* Menší QR kód = větší čtverečky: adresu bez cesty a telefon lze psát velkými písmeny,
   pak se vejdou do úspornějšího alfanumerického režimu (velikost písmen v doméně nevadí). */
function qrMatrixSmall(text, ecc) {
  let t = text;
  if (/^https?:\/\/[^/?#]+\/?$/i.test(t) || /^tel:\+?\d+$/i.test(t)) t = t.toUpperCase();
  if (!/^[0-9A-Z $%*+\-./:]+$/.test(t)) { const m = qrMatrix(text, ecc); m.text = text; return m; }
  const qq = qrcode(0, ecc || 'M'); qq.addData(t, 'Alphanumeric'); qq.make();
  const n = qq.getModuleCount(), m = []; for (let r = 0; r < n; r++) { const row = []; for (let k = 0; k < n; k++) row.push(qq.isDark(r, k)); m.push(row); }
  m.text = t; return m;
}
function clearScan() { $('scan').hidden = true; const c = $('cvScan'); c.width = c.height = 10; c.getContext('2d').clearRect(0, 0, 10, 10); }
function drawScan(m, quiet, logoEx, module) { $('scan').hidden = false; paintQr($('cvScan'), m, quiet, 6, logoEx, module); }
function exportFiles() {
  if (!model) return [];
  const base = 'qr_' + D.qr.type, f = [];
  if (model.inlay) { if (D.qr.split) f.push({ name: base + '_desticka.stl', g: [model.b] }, { name: base + '_vypln.stl', g: [model.a] }); else f.push({ name: base + '_ryty.stl', g: [model.b] }); }
  else if (D.qr.split) f.push({ name: base + '_qr.stl', g: [model.a] }, { name: base + '_desticka.stl', g: [model.b] });
  else f.push({ name: base + '.stl', g: [model.a, model.b] });
  if (model.c) f.push({ name: base + '_stojanek.stl', g: [model.c] });
  return f;
}
function showStats() {
  const box = $('stats'); box.textContent = ''; if (!model) return;
  const files = exportFiles(); let grams = 0;
  for (const fl of files) for (const g of fl.g) grams += filamentEstimate(meshStats(g.attributes.position.array), { wall: 1.2, infill: 20, density: 1.24, diameter: 1.75, pricePerKg: 500 }).grams;
  const tiles = [['Čtvereček QR', `${fmt(model.module, 2)} mm`], ['Materiál', `${fmt(grams, 0)} g PLA`],
    D.qr.split ? ['Barvy', 'dva soubory'] : ['Změna barvy', `ve výšce ${fmt(model.colorZ)} mm`], ['Souborů', String(files.length)]];
  for (const [a, b] of tiles) { const d = document.createElement('div'); d.className = 'stat'; const s1 = document.createElement('span'); s1.textContent = a; const s2 = document.createElement('b'); s2.textContent = b; d.append(s1, s2); box.append(d); }
  $('colorHint').textContent = D.qr.split ? '' : `Bez dvoubarevného tisku: ve sliceru přidejte změnu filamentu ve výšce ${fmt(model.colorZ)} mm.`;
}

/* ===== Stažení ===== */
const inViewer = !!(window.claude && typeof window.claude.use === 'function');
let dlCap = null;
if (inViewer) window.claude.use('downloads').then(d => { dlCap = d; updateNote(); }).catch(() => updateNote());
function updateNote() { $('saveNote').textContent = inViewer ? (dlCap ? 'Tady se STL stáhne zabalené v ZIP souboru.' : 'Stahování je v tomto zobrazení nedostupné.') : 'STL otevřete ve sliceru (Creality Print, Bambu Studio, PrusaSlicer, Cura). Jednotky jsou milimetry.'; }
async function saveFiles(files, zipName) {
  if (inViewer) {
    if (!dlCap) return;
    try {
      const direct = files.length === 1 && /\.png$/.test(files[0].name);
      await dlCap.save(direct ? { filename: files[0].name, data: files[0].data } : { filename: zipName, data: makeZip(files) });
      $('saveNote').textContent = direct ? 'Obrázek je uložený.' : 'ZIP je uložený. Rozbalte ho a STL otevřete ve sliceru.';
    } catch (err) { if (err && err.code !== 'declined') $('saveNote').textContent = err.code === 'rate_limited' ? 'Počkejte chvíli a zkuste to znovu.' : 'Soubor se nepodařilo uložit.'; }
    return;
  }
  for (const f of files) {
    const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([f.data], { type: /\.png$/.test(f.name) ? 'image/png' : 'model/stl' })); a.download = f.name;
    document.body.append(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 2000); await new Promise(r => setTimeout(r, 300));
  }
}
$('btnSave').onclick = () => { const fl = exportFiles(); if (!fl.length) return; saveFiles(fl.map(f => ({ name: f.name, data: stlBinary(f.g) })), 'qr_' + D.qr.type + '.zip'); };
$('btnPng').onclick = async () => {
  if (!LASTQR) return;
  const m = LASTQR.m, n = m.length, q = Math.max(4, LASTQR.quiet), s = Math.max(8, Math.ceil(1200 / (n + 2 * q)));
  const c = document.createElement('canvas'); paintQr(c, m, q, s, LASTQR.logoEx, LASTQR.module);
  const blob = await new Promise(res => c.toBlob(res, 'image/png'));
  saveFiles([{ name: 'qr_' + D.qr.type + '.png', data: new Uint8Array(await blob.arrayBuffer()) }], 'qr_' + D.qr.type + '_png.zip');
};

/* ===== Instalace jako aplikace a sbalitelné sekce ===== */
let installEvt = null;
window.addEventListener('beforeinstallprompt', (e) => { e.preventDefault(); installEvt = e; $('btnInstall').hidden = false; });
window.addEventListener('appinstalled', () => { installEvt = null; $('btnInstall').hidden = true; });
$('btnInstall').onclick = async () => { if (!installEvt) return; installEvt.prompt(); try { await installEvt.userChoice; } catch (e) {} installEvt = null; $('btnInstall').hidden = true; };
if (!inViewer && 'serviceWorker' in navigator && (location.protocol === 'https:' || location.hostname === 'localhost')) navigator.serviceWorker.register('sw.js').catch(() => {});
(function () {
  const KEY = 'qr-klicenky-sbaleno';
  let closed; try { closed = JSON.parse(localStorage.getItem(KEY) || 'null'); } catch (e) { closed = null; }
  if (!Array.isArray(closed)) closed = ['Pokročilé', 'Rady k tisku'];
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
initGL(); syncUI(); updateNote(); restoreLogo().then(() => { updateUI(); renderLogoIcons(); schedule(true); });
if (!renderer) showMsgs([{ lvl: 'warn', msg: 'Prohlížeč nepodporuje WebGL, 3D náhled se nezobrazí. Stažení funguje dál.' }]);

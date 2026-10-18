/* ===== SVG Studio — aplikace. Created by Julius Andy Antoš ===== */
const $ = (id) => document.getElementById(id);
const DEF = {
  out: 'shape', sample: 'kvetina',
  trace: { mode: 'dark', auto: true, thr: 128, blur: 0, detail: 600, smooth: 2, speck: 30 },
  size: 60,
  m3: { mode: 'plate', relief: 'raised', height: 2, engDepth: 1.2, baseT: 2, offW: 3, fillHoles: true, padW: 4, radius: 3, mirror: false, split: false },
  hole: { on: false, pos: 'top', d: 4.5, rim: 2.5 },
  rel: { shape: 'rect', width: 100, high: 'light', height: 3, base: 1.6, contrast: 1.1, bright: 0, smooth: 1, frame: 3, res: 3, hang: false, hangPos: 'outside' },
  bedX: 220, bedY: 220, minStroke: 0.8,
};
const STORE = 'svg-studio-v1';
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
const COL = { a: '#0b7a72', b: '#c9d1d4', rel: '#ece7dc' };

/* ===== Zdroj obrázku ===== */
let SRC = null, srcSeq = 0;
const SAMPLES = { kvetina: 'Květina', logo: 'Logo s textem', krajina: 'Krajina' };
function makeSample(id) {
  const c = document.createElement('canvas'), x = c.getContext('2d');
  if (id === 'kvetina') {
    c.width = c.height = 600; x.fillStyle = '#fff'; x.fillRect(0, 0, 600, 600);
    x.save(); x.translate(300, 300); x.scale(22, 22); x.translate(-12, -12); x.fillStyle = '#111';
    x.fill(new Path2D(ICONS.find(i => i.id === 'kvetina').d)); x.fillStyle = '#fff'; x.beginPath(); x.arc(12, 12, 1.9, 0, Math.PI * 2); x.fill(); x.restore();
  } else if (id === 'logo') {
    c.width = 980; c.height = 320; x.fillStyle = '#fff'; x.fillRect(0, 0, c.width, c.height);
    x.save(); x.translate(40, 40); x.scale(10.5, 10.5); x.fillStyle = '#111'; x.fill(new Path2D(ICONS.find(i => i.id === 'srdce').d)); x.restore();
    x.fillStyle = '#111'; x.font = '700 170px "Segoe UI", Arial, Helvetica, sans-serif'; x.textBaseline = 'alphabetic'; x.fillText('Ahoj 3D', 310, 225);
  } else {
    c.width = 900; c.height = 600;
    const g = (y0, y1, a, b) => { const q = x.createLinearGradient(0, y0, 0, y1); q.addColorStop(0, a); q.addColorStop(1, b); return q; };
    x.fillStyle = g(0, 360, '#8d99a6', '#f1f2ee'); x.fillRect(0, 0, 900, 600);
    const sun = x.createRadialGradient(660, 150, 4, 660, 150, 140); sun.addColorStop(0, '#fff'); sun.addColorStop(1, 'rgba(255,255,255,0)'); x.fillStyle = sun; x.fillRect(0, 0, 900, 600);
    const hill = (pts, col) => { x.fillStyle = col; x.beginPath(); x.moveTo(0, 600); pts.forEach(p => x.lineTo(p[0], p[1])); x.lineTo(900, 600); x.closePath(); x.fill(); };
    hill([[0, 330], [120, 200], [230, 280], [360, 140], [480, 270], [600, 200], [740, 300], [900, 220]], '#77818a');
    hill([[0, 400], [170, 320], [320, 380], [470, 310], [640, 390], [780, 330], [900, 370]], '#4b545b');
    x.fillStyle = g(430, 600, '#c8cdd1', '#7d858a'); x.fillRect(0, 432, 900, 168);
    x.fillStyle = '#262b2f'; for (let i = 0; i < 12; i++) { const tx = 20 + i * 34 + (i % 2) * 10, th = 90 + (i * 41) % 60; x.beginPath(); x.moveTo(tx, 440 - th); x.lineTo(tx + 20, 442); x.lineTo(tx - 20, 442); x.fill(); }
  }
  return c;
}
function useSample(id) { D.sample = id; SRC = { kind: 'raster', name: 'Ukázka: ' + SAMPLES[id], img: makeSample(id), id: ++srcSeq, sample: id }; fitNext = true; renderSamples(); saveState(); updateUI(); schedule(); }
function renderSamples() {
  const box = $('samples');
  if (!box.childElementCount) for (const [id, label] of Object.entries(SAMPLES)) { const b = document.createElement('button'); b.type = 'button'; b.dataset.id = id; b.textContent = label; b.onclick = () => useSample(id); box.append(b); }
  box.querySelectorAll('button').forEach(b => b.setAttribute('aria-pressed', String(!!(SRC && SRC.sample === b.dataset.id))));
  $('srcName').textContent = SRC && !SRC.sample ? SRC.name : '';
}
const loadImage = (url) => new Promise((res, rej) => { const im = new Image(); im.onload = () => res(im); im.onerror = () => rej(new Error('img')); im.src = url; });
async function openFile(f) {
  if (!f) return;
  try {
    const isSvg = /svg/i.test(f.type) || /\.svg$/i.test(f.name), text = isSvg ? await f.text() : null;
    const img = await loadImage(isSvg ? URL.createObjectURL(new Blob([text], { type: 'image/svg+xml' })) : URL.createObjectURL(f));
    SRC = { kind: isSvg ? 'svg' : 'raster', name: f.name, img, id: ++srcSeq, svgText: text };
    fitNext = true; renderSamples(); updateUI(); schedule();
  } catch (e) { $('srcName').textContent = 'Obrázek se nepodařilo otevřít. Zkuste jiný soubor (PNG, JPG, WEBP, SVG).'; }
}
(function () {
  const drop = $('drop'), inp = $('inImg');
  drop.onclick = () => inp.click(); drop.onkeydown = (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); inp.click(); } };
  inp.onchange = (e) => { openFile(e.target.files[0]); e.target.value = ''; };
  drop.addEventListener('dragover', (e) => { e.preventDefault(); drop.classList.add('over'); });
  drop.addEventListener('dragleave', () => drop.classList.remove('over'));
  drop.addEventListener('drop', (e) => { e.preventDefault(); drop.classList.remove('over'); openFile(e.dataTransfer.files[0]); });
})();
function rasterize(img, maxDim) {
  let w = img.naturalWidth || img.width || 800, h = img.naturalHeight || img.height || 800;
  const k = Math.min(1, maxDim / Math.max(w, h)); w = Math.max(1, Math.round(w * k)); h = Math.max(1, Math.round(h * k));
  const c = document.createElement('canvas'); c.width = w; c.height = h; const x = c.getContext('2d');
  x.imageSmoothingQuality = 'high'; x.drawImage(img, 0, 0, w, h);
  return { img: x.getImageData(0, 0, w, h), canvas: c };
}

/* ===== Obrys z obrázku (s mezipamětí) ===== */
let shapeCache = { key: '', val: null };
function getShape() {
  if (!SRC) return { error: 'Nahrajte obrázek nebo vyberte ukázku.' };
  const t = D.trace;
  const key = SRC.kind === 'svg' ? `svg|${SRC.id}|${D.size}` : [SRC.id, t.mode, t.auto, t.thr, t.blur, t.detail, t.smooth, t.speck, D.size].join('|');
  if (shapeCache.key === key) return shapeCache.val;
  let val;
  try {
    if (SRC.kind === 'svg') {
      const sym = svgToSymbol(SRC.svgText, true);
      val = sym ? { ex: normalizeEx(symbolToEx(sym), D.size), vector: true } : { error: 'V SVG nejsou žádné vyplněné plochy ani čáry, které by šly převést.' };
    } else {
      const R = rasterize(SRC.img, t.detail);
      if (t.mode === 'alpha') { let tr = false; const d = R.img.data; for (let i = 3; i < d.length; i += 4) if (d[i] < 250) { tr = true; break; }
        if (!tr) { val = { error: 'Obrázek nemá průhledné pozadí, takže „Neprůhledné“ by vytvořilo celý obdélník. Přepněte „Tvar tvoří“ na Tmavé nebo Světlé.' }; shapeCache = { key, val }; return val; } }
      const M = makeMask(R.img, { mode: t.mode, threshold: t.auto ? null : t.thr, blur: t.blur });
      const exPx = loopsToEx(traceMask(M.mask, M.w, M.h), M.h, { smooth: t.smooth, minArea: Math.max(1, t.speck), pxSize: 1 });
      val = exPx.length ? { ex: normalizeEx(exPx, D.size), exPx, raster: R.canvas, w: M.w, h: M.h, thr: M.thr }
        : { error: 'V obrázku se nenašel žádný tvar. Přepněte „Tmavé / Světlé“ nebo upravte práh jasu.', thr: M.thr };
    }
  } catch (e) { val = { error: 'Obrázek se nepodařilo převést: ' + e.message }; }
  shapeCache = { key, val };
  return val;
}

/* ===== Ovládání ===== */
const OUT_HINT = {
  shape: 'Logo, ikona nebo kresba jako 3D tvar: samotný, s obrysem nebo na podložce. Hodí se na magnetky, přívěsky, cedulky a klíčenky.',
  svg: 'Převede obrázek na vektorový obrys. SVG použijete v laseru, plotru, v Inkscape nebo ve slicerech, které SVG umí.',
  rel: 'Fotka jako plastický obrázek: světlá místa vystoupí, tmavá zůstanou nízko (nebo obráceně). Prohlíží se shora, ne proti světlu.',
};
function syncUI() {
  document.querySelectorAll('[data-k]').forEach(el => { const v = getK(el.dataset.k); if (el.type === 'checkbox') el.checked = !!v; else el.value = v; });
  document.querySelectorAll('input[type=radio][name*="."]').forEach(r => { r.checked = String(getK(r.name)) === r.value; });
  updateUI();
}
function updateUI() {
  const o = D.out, eng = D.m3.relief === 'engraved' && D.m3.mode !== 'text', isSvg = !!(SRC && SRC.kind === 'svg');
  const show = { trace: o !== 'rel', thr: !D.trace.auto && !isSvg, isSvg, sized: o !== 'rel', shape: o === 'shape', rel: o === 'rel',
    m3base: D.m3.mode !== 'text', hang: D.rel.hang, m3offset: D.m3.mode === 'offset', m3plate: D.m3.mode === 'plate', hole: D.hole.on && D.m3.mode !== 'text' };
  document.querySelectorAll('[data-show]').forEach(el => { el.hidden = !show[el.dataset.show]; });
  document.querySelectorAll('#outs button').forEach(b => b.setAttribute('aria-checked', String(b.dataset.out === o)));
  $('outHint').textContent = OUT_HINT[o];
  document.querySelectorAll('[data-show="trace"] input, [data-show="trace"] select').forEach(el => { el.disabled = isSvg; });
  $('m3hLbl').textContent = eng ? 'Hloubka rytí' : D.m3.mode === 'text' ? 'Výška tvaru' : 'Výška nad podkladem';
  $('m3h').value = eng ? D.m3.engDepth : D.m3.height;
  $('split').checked = D.m3.split;
  $('splitLbl').textContent = eng ? 'Přidat výplň rytí jako samostatný díl (dvoubarevný tisk)' : 'Tvar a podklad zvlášť (dvoubarevný tisk)';
  $('flat').hidden = o !== 'svg'; $('viewer').hidden = o === 'svg';
  $('btnSave').textContent = o === 'svg' ? 'Stáhnout SVG' : 'Stáhnout STL'; $('btnSvg').hidden = o !== 'shape';
  $('oContrast').textContent = fmt(D.rel.contrast, 2) + '×'; $('oBright').textContent = (D.rel.bright > 0 ? '+' : '') + fmt(D.rel.bright * 100, 0) + ' %'; $('oRelSmooth').textContent = String(D.rel.smooth);
  if (!D.trace.auto) $('oThr').textContent = String(D.trace.thr);
  updateNote(); if (renderer) resize();
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
function onChange(path) {
  if (path === 'm3.relief' && D.m3.relief === 'engraved' && D.m3.baseT < 2.4) { D.m3.baseT = 3; document.querySelector('[data-k="m3.baseT"]').value = 3; }
  if (path === 'size' || path === 'rel.width' || path === 'rel.shape' || path === 'm3.mode') fitNext = true;
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
document.querySelectorAll('input[type=radio][name*="."]').forEach(r => r.addEventListener('change', () => keepInPlace(r.closest('label') || r, () => { setK(r.name, isNum(r.value) ? parseFloat(r.value) : r.value); onChange(r.name); })));
$('m3h').oninput = () => { const v = parseFloat($('m3h').value); if (!isFinite(v)) return; if (D.m3.relief === 'engraved' && D.m3.mode !== 'text') D.m3.engDepth = v; else D.m3.height = v; saveState(); schedule(); };
$('split').onchange = () => { D.m3.split = $('split').checked; saveState(); applyVisibility(); showStats(); };
document.querySelectorAll('#outs button').forEach(b => b.onclick = () => keepInPlace(b, () => setOut(b.dataset.out)));
function setOut(o) {
  D.out = o; fitNext = true;
  if (SRC && SRC.sample) { if (o === 'rel' && SRC.sample !== 'krajina') useSample('krajina'); else if (o !== 'rel' && SRC.sample === 'krajina') useSample('kvetina'); }
  saveState(); updateUI(); schedule(true);
}
let tmr = 0;
function schedule(now) { clearTimeout(tmr); tmr = setTimeout(() => { $('busy').hidden = false; setTimeout(() => { try { rebuild(); } finally { $('busy').hidden = true; } }, 20); }, now ? 0 : 220); }

/* ===== 3D scéna ===== */
const cv = $('cv');
let renderer = null, scene, camera, meshA, meshB, bedGroup, fitNext = true, model = null;
const orbit = { theta: -Math.PI / 2, phi: 0.95, r: 250, target: new THREE.Vector3() };
function initGL() {
  try { renderer = new THREE.WebGLRenderer({ canvas: cv, antialias: true }); } catch (e) { renderer = null; return; }
  renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
  scene = new THREE.Scene(); camera = new THREE.PerspectiveCamera(35, 1, 0.5, 5000); camera.up.set(0, 0, 1);
  scene.add(new THREE.HemisphereLight(0xffffff, 0x445055, 0.7));
  const d1 = new THREE.DirectionalLight(0xffffff, 0.7); d1.position.set(-160, -120, 140); scene.add(d1);
  const d2 = new THREE.DirectionalLight(0xffffff, 0.25); d2.position.set(200, 150, 120); scene.add(d2);
  meshA = new THREE.Mesh(new THREE.BufferGeometry(), new THREE.MeshStandardMaterial({ color: new THREE.Color(COL.a), roughness: 0.55, metalness: 0.05 }));
  meshB = new THREE.Mesh(new THREE.BufferGeometry(), new THREE.MeshStandardMaterial({ color: new THREE.Color(COL.b), roughness: 0.7, metalness: 0.02 }));
  scene.add(meshA, meshB); applyTheme();
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
function applyTheme() { if (!renderer) return; scene.background = new THREE.Color(css('--view')); makeBed(); draw(); if (D.out === 'svg') drawFlat(); }
matchMedia('(prefers-color-scheme: dark)').addEventListener('change', applyTheme);
new MutationObserver(applyTheme).observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
function resize() { if (!renderer || $('viewer').hidden) return; const r = $('viewer').getBoundingClientRect(); if (!r.width) return; renderer.setSize(r.width, r.height, false); camera.aspect = r.width / r.height; camera.updateProjectionMatrix(); draw(); }
let raf = 0;
function draw() { if (!renderer || raf) return; raf = requestAnimationFrame(() => { raf = 0; const t = orbit.target, s = Math.sin(orbit.phi);
  camera.position.set(t.x + orbit.r * s * Math.cos(orbit.theta), t.y + orbit.r * s * Math.sin(orbit.theta), t.z + orbit.r * Math.cos(orbit.phi)); camera.lookAt(t); renderer.render(scene, camera); }); }
function fit(view) {
  if (!model || !renderer) return; const s = model.size; orbit.target.set(0, 0, s.z / 2);
  const span = Math.max(s.x, s.y, s.z, 20);
  orbit.r = span / (2 * Math.tan(THREE.MathUtils.degToRad(35) / 2)) * Math.max(1.25, 1.8 / camera.aspect);
  if (view === 'top') { orbit.phi = 0.001; orbit.theta = -Math.PI / 2; } else { orbit.phi = 0.8; orbit.theta = -Math.PI / 2 - 0.35; }
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
  model = m; $('btnSave').disabled = !m; $('btnSvg').disabled = !m;
  if (!m) { $('dims').textContent = '–'; $('stats').textContent = ''; }
  else $('dims').innerHTML = `<b>${fmt(m.size.x)}</b> × <b>${fmt(m.size.y)}</b> × <b>${fmt(m.size.z)}</b> mm`;
  if (!renderer) return;
  meshA.geometry.dispose(); meshA.geometry = (m && m.a) || new THREE.BufferGeometry();
  meshB.geometry.dispose(); meshB.geometry = (m && m.b) || new THREE.BufferGeometry();
  meshA.material.color.set(m && m.relief ? COL.rel : COL.a);
  $('lgAc').style.background = m && m.relief ? COL.rel : COL.a; $('lgBc').style.background = COL.b;
  $('lgAn').textContent = (m && m.aName) || 'Tvar'; $('lgBn').textContent = (m && m.bName) || 'Podklad';
  applyVisibility(false);
  if (fitNext && m) { fit('persp'); fitNext = false; } else draw();
}
const exportGeoms = () => !model ? [] : model.inlay && !D.m3.split ? [model.b] : [model.a, model.b].filter(Boolean);
function applyVisibility(redraw = true) {
  if (!meshA) return;
  const hideA = model && model.inlay && !D.m3.split;
  meshA.visible = !hideA; $('lgA').hidden = !model || !model.a || hideA || model.relief; $('lgB').hidden = !model || !model.b;
  if (redraw) draw();
}
function showMsgs(list) { const box = $('msgs'); box.textContent = ''; for (const m of list) { const d = document.createElement('div'); d.className = 'msg ' + m.lvl; d.textContent = m.msg; box.append(d); } }
const bedCheck = (s, msgs) => { if (!((s.x <= D.bedX && s.y <= D.bedY) || (s.y <= D.bedX && s.x <= D.bedY))) msgs.push({ lvl: 'bad', msg: `Model (${fmt(s.x)} × ${fmt(s.y)} mm) se nevejde na tiskovou plochu ${D.bedX} × ${D.bedY} mm.` }); };

/* ===== Výpočet ===== */
function rebuild() {
  const msgs = [];
  $('inset').hidden = D.out !== 'rel';
  try { if (D.out === 'svg') buildSvg(msgs); else if (D.out === 'shape') buildShape(msgs); else buildRelief(msgs); }
  catch (e) { msgs.push({ lvl: 'bad', msg: 'Model se nepodařilo sestavit: ' + e.message }); setModel(null); }
  showMsgs(msgs); showStats(); holdAnchor();
}
let shapeNow = null;
function thrLabel(sh) { $('oThr').textContent = D.trace.auto ? (sh && sh.thr != null ? 'auto ' + sh.thr : 'auto') : String(D.trace.thr); }
function buildSvg(msgs) {
  const sh = getShape(); thrLabel(sh); shapeNow = sh; model = null;
  if (sh.error) { msgs.push({ lvl: 'bad', msg: sh.error }); $('btnSave').disabled = true; drawFlat(); return; }
  $('btnSave').disabled = false;
  const paths = exToPaths(sh.ex), n = sh.ex.length, pts = paths.reduce((s, p) => s + p.length, 0);
  if (pts > 150000) msgs.push({ lvl: 'warn', msg: 'Obrys je velmi složitý. Zvyšte „Odstranit drobnosti“, přidejte rozmazání nebo snižte detail.' });
  msgs.push({ lvl: 'ok', msg: sh.vector ? 'Vektorový obrázek je připravený ke stažení jako SVG.' : 'Obrys je připravený ke stažení jako SVG. Rozměry v souboru jsou v milimetrech.' });
  const bb = boundsEx(sh.ex);
  $('flatInfo').textContent = `${fmt(bb.x1 - bb.x0)} × ${fmt(bb.y1 - bb.y0)} mm · ${plural(n, 'tvar', 'tvary', 'tvarů')} · ${plural(pts, 'bod', 'body', 'bodů')}`;
  drawFlat();
}
function drawFlat() {
  const c = $('cv2'), r = $('flat').getBoundingClientRect(); if (!r.width) return;
  const dpr = Math.min(2, window.devicePixelRatio || 1); c.width = r.width * dpr; c.height = r.height * dpr;
  const x = c.getContext('2d'); x.setTransform(dpr, 0, 0, dpr, 0, 0); x.clearRect(0, 0, r.width, r.height);
  const sh = shapeNow; if (!sh || sh.error) return;
  const pad = 36, W = r.width - 2 * pad, H = r.height - 2 * pad - 20;
  let map, paths;
  if (sh.exPx) { const bw = sh.w, bh = sh.h, k = Math.min(W / bw, H / bh), ox = (r.width - bw * k) / 2, oy = (r.height - bh * k) / 2 + 10;
    x.fillStyle = '#fff'; x.fillRect(ox, oy, bw * k, bh * k); x.globalAlpha = 0.22; x.drawImage(sh.raster, ox, oy, bw * k, bh * k); x.globalAlpha = 1;
    map = (q) => [ox + q.X / SC * k, oy + (bh - q.Y / SC) * k]; x.strokeStyle = css('--line'); x.strokeRect(ox, oy, bw * k, bh * k); paths = exToPaths(sh.exPx);
  } else { const bb = boundsEx(sh.ex), bw = bb.x1 - bb.x0, bh = bb.y1 - bb.y0, k = Math.min(W / bw, H / bh), ox = (r.width - bw * k) / 2, oy = (r.height - bh * k) / 2 + 10;
    x.fillStyle = '#fff'; x.fillRect(ox - 8, oy - 8, bw * k + 16, bh * k + 16); map = (q) => [ox + (q.X / SC - bb.x0) * k, oy + (bb.y1 - q.Y / SC) * k]; paths = exToPaths(sh.ex); }
  x.beginPath(); for (const p of paths) { p.forEach((q, i) => { const [px, py] = map(q); i ? x.lineTo(px, py) : x.moveTo(px, py); }); x.closePath(); }
  x.fillStyle = css('--accent'); x.globalAlpha = 0.85; x.fill('evenodd'); x.globalAlpha = 1; x.lineWidth = 1; x.strokeStyle = '#1b2428'; x.stroke();
}
new ResizeObserver(() => { if (D.out === 'svg') drawFlat(); }).observe($('flat'));

function buildShape(msgs) {
  const sh = getShape(); thrLabel(sh); shapeNow = sh;
  if (sh.error) { msgs.push({ lvl: 'bad', msg: sh.error }); setModel(null); return; }
  const m = D.m3;
  const S = { mode: m.mode, relief: m.relief, height: m.height, engDepth: m.engDepth, baseT: m.baseT, offW: m.offW, fillHoles: m.fillHoles, padW: m.padW, radius: m.radius, mirror: m.mirror,
    hole: D.hole.on && m.mode !== 'text', holePos: D.hole.pos, holeD: D.hole.d, holeRim: D.hole.rim };
  const parts = finishParts(sh.ex, S, {});
  msgs.push(...parts.warnings);
  const loss = thinLoss(parts.textEx, D.minStroke);
  if (loss >= 0.1) msgs.push({ lvl: 'bad', msg: `Velká část tvaru je tenčí než ${fmt(D.minStroke)} mm a tiskárna ji nevytiskne. Zvětšete model nebo zvyšte vyhlazení.` });
  else if (loss >= 0.03) msgs.push({ lvl: 'warn', msg: `Některé detaily jsou tenčí než ${fmt(D.minStroke)} mm a nemusí se vytisknout čistě.` });
  if (m.mode === 'text' && sh.ex.length > 1) msgs.push({ lvl: 'info', msg: `Tvar má ${plural(sh.ex.length, 'samostatnou část', 'samostatné části', 'samostatných částí')}. Bez podkladu se vytisknou jako oddělené kousky; pro jeden kus zvolte „S obrysem“ nebo „Na podložce“.` });
  const g = buildGeometry(parts, S);
  const mm = { a: g.text, b: g.base, inlay: g.inlay, size: g.size, aName: g.inlay ? 'Výplň rytí' : 'Tvar', bName: 'Podklad', ex: sh.ex, colorZ: g.inlay ? m.baseT - parts.depth : m.baseT };
  bedCheck(g.size, msgs); setModel(mm);
  if (m.mode !== 'text') {
    if (D.m3.split) msgs.push({ lvl: 'info', msg: g.inlay ? 'Stáhnete podklad a výplň rytí jako dva soubory. Ve sliceru je vložte jako jeden objekt a každému dejte jinou barvu.' : 'Stáhnete tvar a podklad jako dva soubory. Ve sliceru je vložte jako jeden objekt a každému dejte jinou barvu.' });
    else msgs.push({ lvl: 'info', msg: `Pro dvě barvy z jedné cívky nastavte ve sliceru změnu filamentu ve výšce ${fmt(mm.colorZ)} mm.` });
  }
  if (!msgs.some(x => x.lvl === 'bad' || x.lvl === 'warn')) msgs.unshift({ lvl: 'ok', msg: 'Model je připravený k tisku.' });
}

/* Reliéf: výšková mapa z fotky, tiskne se naležato */
const MAX_CELLS = 1300000;
function boxBlurF(a, w, h, r) {
  if (r < 1) return a; const t = new Float32Array(a.length), o = new Float32Array(a.length);
  for (let y = 0; y < h; y++) { let s = 0; for (let x = -r; x <= r; x++) s += a[y * w + Math.min(w - 1, Math.max(0, x))];
    for (let x = 0; x < w; x++) { t[y * w + x] = s / (2 * r + 1); s += a[y * w + Math.min(w - 1, x + r + 1)] - a[y * w + Math.max(0, x - r)]; } }
  for (let x = 0; x < w; x++) { let s = 0; for (let y = -r; y <= r; y++) s += t[Math.min(h - 1, Math.max(0, y)) * w + x];
    for (let y = 0; y < h; y++) { o[y * w + x] = s / (2 * r + 1); s += t[Math.min(h - 1, y + r + 1) * w + x] - t[Math.max(0, y - r) * w + x]; } }
  return o;
}
function buildRelief(msgs) {
  if (!SRC) { msgs.push({ lvl: 'bad', msg: 'Nahrajte fotku nebo vyberte ukázku.' }); setModel(null); return; }
  const R = D.rel, iw = SRC.img.naturalWidth || SRC.img.width, ih = SRC.img.naturalHeight || SRC.img.height;
  const Wmm = R.width, Hmm = R.shape === 'circle' || R.shape === 'heart' ? (R.shape === 'heart' ? Wmm * 0.92 : Wmm) : Math.round(Wmm * ih / iw);
  let res = R.res;
  if (Wmm * Hmm * res * res > MAX_CELLS) { res = Math.sqrt(MAX_CELLS / (Wmm * Hmm)); msgs.push({ lvl: 'info', msg: 'Jemnost jsem pro tuto velikost snížil, aby soubor nebyl příliš velký.' }); }
  const out = R.hang && R.hangPos === 'outside', hr = 2.6, rim = Math.max(2.5, R.frame), Ro = hr + rim;
  const Hmain = Math.round(Hmm * res), extRows = out ? Math.ceil((2 * Ro + 1) * res) : 0;
  const W = Math.round(Wmm * res) + 1, H = Hmain + extRows + 1, cw = W - 1, ch = H - 1, px = 1 / res, yCanvasTop = Hmm / 2 + extRows * px;
  // maska tvaru
  const c = document.createElement('canvas'); c.width = cw; c.height = ch; const x = c.getContext('2d');
  x.setTransform(res, 0, 0, -res, Wmm / 2 * res, Hmm / 2 * res + extRows);
  let pts = null;
  if (R.shape === 'circle') pts = circleOutline(Wmm / 2 - 0.01);
  else if (R.shape === 'oval') pts = ellipseOutline(Wmm / 2 - 0.01, Hmm / 2 - 0.01);
  else if (R.shape === 'heart') { pts = heartOutline(Wmm * 0.97); let y0 = Infinity, y1 = -Infinity; for (const p of pts) { y0 = Math.min(y0, p[1]); y1 = Math.max(y1, p[1]); } const dy = -(y0 + y1) / 2; pts = pts.map(p => [p[0], p[1] + dy]); }
  if (pts) { x.beginPath(); pts.forEach((p, i) => i ? x.lineTo(p[0], p[1]) : x.moveTo(p[0], p[1])); x.closePath(); x.fill(); } else x.fillRect(-Wmm / 2, -Hmm / 2, Wmm, Hmm);
  const d0 = x.getImageData(0, 0, cw, ch).data, inBase = new Uint8Array(cw * ch);
  for (let i = 0; i < inBase.length; i++) inBase[i] = d0[i * 4 + 3] >= 128 ? 1 : 0;
  if (R.hang) { // očko nahoře uprostřed: uvnitř (otvor v rámečku), nebo zvenku (ouško nad okrajem)
    const col = Math.round(cw / 2); let top = 0; while (top < ch && !inBase[top * cw + col]) top++;
    const yTop = yCanvasTop - top * px;
    const hy = out ? yTop + Ro * 0.6 : yTop - (hr + rim + 0.5);
    if (out) { x.beginPath(); x.arc(0, hy, Ro, 0, Math.PI * 2); x.fill(); }
    x.globalCompositeOperation = 'destination-out'; x.beginPath(); x.arc(0, hy, hr, 0, Math.PI * 2); x.fill(); x.globalCompositeOperation = 'source-over';
  }
  const md = x.getImageData(0, 0, cw, ch).data, inside = new Uint8Array(cw * ch);
  for (let i = 0; i < inside.length; i++) inside[i] = md[i * 4 + 3] >= 128 ? 1 : 0;
  const dist = maskDistance(inside, cw, ch), frameCells = Math.max(R.frame, R.hang && !out ? 2.5 : 0) * res;
  // výšky: fotka jen v hlavní ploše, ouško nad ní má plnou výšku rámečku
  let Lm = photoLuma(SRC.img, W, Hmain + 1, { fit: 'cover', auto: true, bright: R.bright, contrast: R.contrast, invert: R.high === 'dark' });
  Lm = boxBlurF(Lm, W, Hmain + 1, Math.round(R.smooth * res / 3));
  const L = new Float32Array(W * H).fill(1); L.set(Lm, extRows * W);
  const T = new Float32Array(W * H), top = R.base + R.height;
  const cellIn = (arr, ax, ay) => ax >= 0 && ay >= 0 && ax < cw && ay < ch && arr[ay * cw + ax];
  for (let yy = 0; yy < H; yy++) for (let xx = 0; xx < W; xx++) {
    let m = Infinity, base = 0;
    for (const [ax, ay] of [[xx - 1, yy - 1], [xx, yy - 1], [xx - 1, yy], [xx, yy]]) { m = Math.min(m, cellIn(inside, ax, ay) ? dist[ay * cw + ax] : 0); if (cellIn(inBase, ax, ay)) base++; }
    T[yy * W + xx] = (R.frame > 0 && m <= frameCells) || (out && base === 0) ? top : R.base + R.height * L[yy * W + xx];
  }
  const geom = maskLitho(inside, T, W, H, px);
  const size = centerGeoms([geom]);
  const mm = { a: geom, b: null, size, relief: true, aName: 'Reliéf' };
  bedCheck(size, msgs); setModel(mm); drawHeight(L, W, H, inside, cw, ch);
  $('inset').querySelector('span').textContent = R.high === 'dark' ? 'Výšková mapa: tmavé na fotce = vyšší' : 'Výšková mapa: světlé na fotce = vyšší';
  if (R.height > 8) msgs.push({ lvl: 'info', msg: 'Vysoký reliéf má strmé stěny a tiskne se déle. Pro obrázky obvykle stačí 2–4 mm.' });
  msgs.push({ lvl: 'ok', msg: 'Reliéf je připravený. Tiskněte naležato s výškou vrstvy 0,12–0,16 mm, bez podpěr.' });
}
function drawHeight(L, W, H, inside, cw, ch) {
  const c = $('cvInset'), k = Math.min(1, 300 / W), w = Math.max(1, Math.round(W * k)), h = Math.max(1, Math.round(H * k));
  c.width = w; c.height = h; const x = c.getContext('2d'), im = x.createImageData(w, h);
  for (let y = 0; y < h; y++) for (let xx = 0; xx < w; xx++) {
    const sx = Math.min(W - 1, Math.floor(xx / k)), sy = Math.min(H - 1, Math.floor(y / k)), ins = inside[Math.min(ch - 1, sy) * cw + Math.min(cw - 1, sx)];
    const v = 255 * L[sy * W + sx], i = (y * w + xx) * 4; im.data[i] = im.data[i + 1] = im.data[i + 2] = v; im.data[i + 3] = ins ? 255 : 0;
  }
  x.putImageData(im, 0, 0);
}
function showStats() {
  const box = $('stats'); box.textContent = '';
  if (D.out === 'svg' || !model) return;
  let grams = 0, tris = 0;
  for (const g of exportGeoms()) { const st = meshStats(g.attributes.position.array); tris += st.tris; grams += filamentEstimate(st, { wall: 1.2, infill: model.relief ? 100 : 20, density: 1.24, diameter: 1.75, pricePerKg: 500 }).grams; }
  const hrs = grams / (model.relief ? 9 : 11) + 0.15;
  const tiles = [['Rozměry', `${fmt(model.size.x, 0)} × ${fmt(model.size.y, 0)} × ${fmt(model.size.z, 1)} mm`], ['Materiál', `${fmt(grams, 0)} g PLA`],
    ['Tisk zhruba', hrs < 1 ? `${fmt(hrs * 60, 0)} min` : `${fmt(hrs, 1)} h`], ['Soubor', `${fmt(Math.max(0.1, tris * 50 / 1048576), 1)} MB`]];
  for (const [a, b] of tiles) { const d = document.createElement('div'); d.className = 'stat'; const s1 = document.createElement('span'); s1.textContent = a; const s2 = document.createElement('b'); s2.textContent = b; d.append(s1, s2); box.append(d); }
}

/* ===== Stažení ===== */
const inViewer = !!(window.claude && typeof window.claude.use === 'function');
let dlCap = null;
if (inViewer) window.claude.use('downloads').then(d => { dlCap = d; updateNote(); }).catch(() => updateNote());
function updateNote() { $('saveNote').textContent = inViewer && !dlCap ? 'Stahování je v tomto zobrazení nedostupné.' : D.out === 'svg' ? 'SVG má rozměry v milimetrech. Otevřete ho v Inkscape, v softwaru laseru nebo plotru, nebo ve sliceru.' : inViewer ? 'Tady se STL stáhne zabalené v ZIP souboru, SVG přímo.' : 'STL otevřete ve sliceru (Creality Print, Bambu Studio, PrusaSlicer, Cura). Jednotky jsou milimetry.'; }
const slug = (t) => (t || 'obrazek').replace(/^Ukázka: /, '').normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/\.[a-z0-9]+$/i, '').replace(/[^A-Za-z0-9]+/g, '_').replace(/^_|_$/g, '').slice(0, 30).toLowerCase() || 'obrazek';
function stl(geoms) { const u = stlBinary(geoms), head = 'Created by Julius Andy Antos | SVG Studio | mm'; for (let i = 0; i < 80; i++) u[i] = i < head.length ? head.charCodeAt(i) : 32; return u; }
const svgText = (ex) => exToSvg(ex, 'SVG Studio').replace('3D dílna', 'SVG Studio');
async function saveFiles(files, zipName) {
  if (inViewer) {
    if (!dlCap) return;
    try {
      const direct = files.length === 1 && /\.svg$/.test(files[0].name);
      await dlCap.save(direct ? { filename: files[0].name, data: files[0].data } : { filename: zipName, data: makeZip(files.map(f => ({ name: f.name, data: typeof f.data === 'string' ? new TextEncoder().encode(f.data) : f.data }))) });
      $('saveNote').textContent = direct ? 'SVG je uložené.' : 'ZIP je uložený. Rozbalte ho a STL otevřete ve sliceru.';
    } catch (err) { if (err && err.code !== 'declined') $('saveNote').textContent = err.code === 'rate_limited' ? 'Počkejte chvíli a zkuste to znovu.' : 'Soubor se nepodařilo uložit.'; }
    return;
  }
  for (const f of files) {
    const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([f.data], { type: /\.svg$/.test(f.name) ? 'image/svg+xml' : 'model/stl' })); a.download = f.name;
    document.body.append(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 2000); await new Promise(r => setTimeout(r, 300));
  }
}
$('btnSave').onclick = () => {
  const base = slug(SRC && SRC.name);
  if (D.out === 'svg') { if (!shapeNow || shapeNow.error) return; saveFiles([{ name: base + '.svg', data: svgText(shapeNow.ex) }], base + '.zip'); return; }
  if (!model) return;
  let files;
  if (model.relief) files = [{ name: base + '_relief.stl', data: stl([model.a]) }];
  else if (model.inlay) files = D.m3.split ? [{ name: base + '_podklad.stl', data: stl([model.b]) }, { name: base + '_vypln.stl', data: stl([model.a]) }] : [{ name: base + '_ryty.stl', data: stl([model.b]) }];
  else if (D.m3.split && model.b) files = [{ name: base + '_tvar.stl', data: stl([model.a]) }, { name: base + '_podklad.stl', data: stl([model.b]) }];
  else files = [{ name: base + '.stl', data: stl([model.a, model.b].filter(Boolean)) }];
  saveFiles(files, base + '.zip');
};
$('btnSvg').onclick = () => { if (!model || !model.ex) return; const base = slug(SRC && SRC.name); saveFiles([{ name: base + '.svg', data: svgText(model.ex) }], base + '_svg.zip'); };

/* ===== Instalace jako aplikace a sbalitelné sekce ===== */
let installEvt = null;
window.addEventListener('beforeinstallprompt', (e) => { e.preventDefault(); installEvt = e; $('btnInstall').hidden = false; });
window.addEventListener('appinstalled', () => { installEvt = null; $('btnInstall').hidden = true; });
$('btnInstall').onclick = async () => { if (!installEvt) return; installEvt.prompt(); try { await installEvt.userChoice; } catch (e) {} installEvt = null; $('btnInstall').hidden = true; };
if (!inViewer && 'serviceWorker' in navigator && (location.protocol === 'https:' || location.hostname === 'localhost')) navigator.serviceWorker.register('sw.js').catch(() => {});
(function () {
  const KEY = 'svg-studio-sbaleno';
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
initGL(); updateNote();
{ const s = D.out === 'rel' ? 'krajina' : (D.sample === 'krajina' ? 'kvetina' : D.sample); D.sample = s; SRC = { kind: 'raster', name: 'Ukázka: ' + SAMPLES[s], img: makeSample(s), id: ++srcSeq, sample: s }; }
renderSamples(); syncUI(); schedule(true);
if (!renderer) showMsgs([{ lvl: 'warn', msg: 'Prohlížeč nepodporuje WebGL, 3D náhled se nezobrazí. Stažení funguje dál.' }]);

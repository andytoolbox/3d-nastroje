/* ===== Cookie Cutter Studio — aplikace. Created by Julius Andy Antoš ===== */
const $ = (id) => document.getElementById(id);
const DEF = {
  src: 'shape', shape: 'pernicek', deco: true, largest: true,
  img: { mode: 'dark', auto: true, thr: 128, smooth: 2 },
  text: { s: 'Ema', font: 'pacifico', margin: 3 },
  size: 80,
  stamp: { on: true, pick: 'auto', text: '', textH: 8, thick: 0.4, depth: 2, plate: 2, handle: true },
  cut: { height: 15, flange: true, wall: 1.6, blade: 0.8, bladeH: 4, flangeW: 4, flangeH: 1.6, clear: 0.6 },
  bedX: 220, bedY: 220,
};
const STORE = 'cookie-cutter-studio-v1';
const deepMerge = (a, b) => { for (const k in b) { if (b[k] && typeof b[k] === 'object' && !Array.isArray(b[k]) && a[k] && typeof a[k] === 'object') deepMerge(a[k], b[k]); else if (k in a) a[k] = b[k]; } return a; };
const D = JSON.parse(JSON.stringify(DEF));
try { deepMerge(D, JSON.parse(localStorage.getItem(STORE) || '{}')); } catch (e) {}
if (D.src === 'img' || D.src === 'svg') D.src = 'shape'; // obrázky se neukládají, po otevření začneme hotovým tvarem
const saveState = () => { try { localStorage.setItem(STORE, JSON.stringify(D)); } catch (e) {} };
const getK = (p) => p.split('.').reduce((o, k) => o[k], D);
const setK = (p, v) => { const ks = p.split('.'); let o = D; for (let i = 0; i < ks.length - 1; i++) o = o[ks[i]]; o[ks[ks.length - 1]] = v; };
const fmt = (v, d = 1) => v.toLocaleString('cs-CZ', { maximumFractionDigits: d, minimumFractionDigits: d });
const plural = (n, one, few, many) => `${n.toLocaleString('cs-CZ')} ${n === 1 ? one : n >= 2 && n <= 4 ? few : many}`;
const css = (v) => getComputedStyle(document.documentElement).getPropertyValue(v).trim();
const isNum = (s) => /^-?\d+(\.\d+)?$/.test(s);
const COL = { cut: '#e07a3f', plate: '#f2efe8', relief: '#d9cdb6', dough: '#e2b277', doughDark: '#a8692e' };

/* ===== 2D pomocníci ===== */
const P = (pts) => pts.map(([x, y]) => ({ X: Math.round(x * SC), Y: Math.round(y * SC) }));
const circ = (cx, cy, r) => circlePath(cx, cy, r, 120);
const outersOf = (ex) => unionEx(ex.map(e => e.outer));
function intersectEx(aEx, bEx) {
  const c = new ClipperLib.Clipper();
  c.AddPaths(exToPaths(aEx), ClipperLib.PolyType.ptSubject, true); c.AddPaths(exToPaths(bEx), ClipperLib.PolyType.ptClip, true);
  const pt = new ClipperLib.PolyTree(); c.Execute(ClipperLib.ClipType.ctIntersection, pt, ClipperLib.PolyFillType.pftNonZero, ClipperLib.PolyFillType.pftNonZero);
  return ClipperLib.JS.PolyTreeToExPolygons(pt);
}
function strokeEx(pts, w) {
  const co = new ClipperLib.ClipperOffset(2, 0.02 * SC); co.AddPath(P(pts), ClipperLib.JoinType.jtRound, ClipperLib.EndType.etOpenRound);
  const pt = new ClipperLib.PolyTree(); co.Execute(pt, w / 2 * SC); return ClipperLib.JS.PolyTreeToExPolygons(pt);
}
const roundEx = (ex, r) => offsetEx(offsetEx(offsetEx(ex, r), -2 * r), r); // zaoblí vnitřní i vnější rohy
const U = (...parts) => unionEx(parts.flatMap(p => Array.isArray(p[0]) || (p[0] && p[0].X !== undefined) ? [p] : exToPaths(p)));
const arc = (cx, cy, r, a0, a1, n = 24) => { const p = []; for (let i = 0; i <= n; i++) { const a = (a0 + (a1 - a0) * i / n) * Math.PI / 180; p.push([cx + r * Math.cos(a), cy + r * Math.sin(a)]); } return p; };
const dots = (list, r) => unionEx(list.map(([x, y]) => circ(x, y, r)));

/* ===== Hotové tvary (vlastní kresba) ===== */
const SHAPES = [
  { id: 'pernicek', name: 'Perníček', make: () => ({
      ex: roundEx(U(circ(0, 30, 16), P([[-18, -22], [18, -22], [18, 16], [-18, 16]]), strokeEx([[-14, 8], [-40, 2]], 15), strokeEx([[14, 8], [40, 2]], 15), strokeEx([[-9, -18], [-16, -46]], 16), strokeEx([[9, -18], [16, -46]], 16)), 3),
      deco: U(dots([[-6, 34], [6, 34], [0, 8], [0, -2], [0, -12]], 2.6), strokeEx(arc(0, 30, 8, 210, 330), 2.2), strokeEx([[-38, 4], [-30, 6], [-38, 8]].map(([x, y]) => [x, y - 2]), 1.8), strokeEx([[38, 2], [30, 4], [38, 6]], 1.8)) }) },
  { id: 'srdce', name: 'Srdce', make: () => { const p = []; for (let i = 0; i < 240; i++) { const t = i / 240 * Math.PI * 2; p.push([16 * Math.sin(t) ** 3 * 3, (13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t)) * 3]); }
      const ex = roundEx(unionEx([P(p)]), 1.5); return { ex, deco: offsetEx(ex, -7).length ? diffEx(offsetEx(ex, -6), offsetEx(ex, -8)) : [] }; } },
  { id: 'hvezda', name: 'Hvězda', make: () => { const p = []; for (let i = 0; i < 10; i++) { const a = Math.PI / 2 + i * Math.PI / 5, r = i % 2 ? 22 : 50; p.push([r * Math.cos(a), r * Math.sin(a)]); }
      const ex = roundEx(unionEx([P(p)]), 3); return { ex, deco: dots([[0, 0]], 6) }; } },
  { id: 'kolecko', name: 'Kolečko', make: () => ({ ex: unionEx([circ(0, 0, 50)]), deco: diffEx(unionEx([circ(0, 0, 40)]), unionEx([circ(0, 0, 37.5)])) }) },
  { id: 'vlnka', name: 'Vlnka', make: () => { const c = [circ(0, 0, 42)]; for (let i = 0; i < 14; i++) { const a = i / 14 * Math.PI * 2; c.push(circ(42 * Math.cos(a), 42 * Math.sin(a), 9.6)); }
      return { ex: roundEx(unionEx(c), 1), deco: dots(Array.from({ length: 7 }, (_, i) => i < 6 ? [22 * Math.cos(i * Math.PI / 3), 22 * Math.sin(i * Math.PI / 3)] : [0, 0]), 3.2) }; } },
  { id: 'kyticka', name: 'Kytička', make: () => { const c = [circ(0, 0, 24)]; for (let i = 0; i < 6; i++) { const a = i / 6 * Math.PI * 2 + Math.PI / 2; c.push(circ(28 * Math.cos(a), 28 * Math.sin(a), 20)); }
      const ex = roundEx(unionEx(c), 2); return { ex, deco: diffEx(unionEx([circ(0, 0, 14)]), unionEx([circ(0, 0, 11.5)])) }; } },
  { id: 'stromek', name: 'Stromeček', make: () => ({
      ex: roundEx(U(P([[-42, -24], [42, -24], [0, 12]]), P([[-34, -4], [34, -4], [0, 32]]), P([[-25, 16], [25, 16], [0, 52]]), P([[-8, -40], [8, -40], [8, -20], [-8, -20]])), 3),
      deco: U(dots([[-20, -16], [14, -12], [-4, 4], [16, 8], [-12, 12], [2, 26], [-6, 36]], 2.8), strokeEx([[-26, -6], [-10, -10], [8, -6], [26, -12]], 2)) }) },
  { id: 'snehulak', name: 'Sněhulák', make: () => ({
      ex: roundEx(U(circ(0, -26, 26), circ(0, 10, 19), circ(0, 38, 14)), 2.5),
      deco: U(dots([[-5, 42], [5, 42], [0, 14], [0, 4], [0, -18], [0, -30]], 2.4), strokeEx([[1, 37], [10, 35]], 2.6), strokeEx(arc(0, 38, 7, 220, 320), 1.8)) }) },
  { id: 'vajicko', name: 'Vajíčko', make: () => { const p = []; for (let i = 0; i < 200; i++) { const t = i / 200 * Math.PI * 2; p.push([38 * Math.cos(t) * (1 - 0.13 * Math.sin(t)), 50 * Math.sin(t)]); }
      const zig = []; for (let i = 0; i <= 8; i++) zig.push([-30 + i * 7.5, i % 2 ? 6 : -2]);
      return { ex: unionEx([P(p)]), deco: U(strokeEx(zig, 2.4), dots([[-14, 22], [0, 26], [14, 22], [-12, -24], [12, -24], [0, -30]], 2.6)) }; } },
  { id: 'mesic', name: 'Měsíc', make: () => ({ ex: roundEx(diffEx(unionEx([circ(0, 0, 50)]), unionEx([circ(24, 12, 42)])), 2), deco: dots([[-30, 4], [-22, -22], [-6, -36]], 3) }) },
  { id: 'mracek', name: 'Mráček', make: () => ({ ex: roundEx(U(circ(-27, -8, 19), circ(-2, 8, 26), circ(26, -4, 20), P([[-27, -27], [26, -27], [26, -10], [-27, -10]])), 3), deco: U(dots([[-10, 2], [8, 2]], 2.6), strokeEx(arc(-1, -2, 8, 210, 330), 2.2)) }) },
  { id: 'domek', name: 'Domeček', make: () => ({
      ex: roundEx(U(P([[-32, -40], [32, -40], [32, 8], [-32, 8]]), P([[-44, 4], [44, 4], [0, 46]])), 2.5),
      deco: U(diffEx(unionEx([P([[-9, -34], [9, -34], [9, -8], [-9, -8]])]), unionEx([P([[-6.5, -34], [6.5, -34], [6.5, -10.5], [-6.5, -10.5]])])), dots([[0, 22]], 6), strokeEx([[-24, -10], [-14, -10]], 2), strokeEx([[14, -10], [24, -10]], 2)) }) },
];
const SHAPE_CACHE = {};
const shapeData = (id) => SHAPE_CACHE[id] || (SHAPE_CACHE[id] = (SHAPES.find(s => s.id === id) || SHAPES[0]).make());
function exPathD(exs, box) {
  const bb = boundsEx(exs), k = box / Math.max(bb.x1 - bb.x0, bb.y1 - bb.y0), ox = (box - (bb.x1 - bb.x0) * k) / 2, oy = (box - (bb.y1 - bb.y0) * k) / 2;
  let d = ''; for (const p of exToPaths(exs)) d += 'M' + p.map(q => `${(ox + (q.X / SC - bb.x0) * k).toFixed(2)} ${(oy + (bb.y1 - q.Y / SC) * k).toFixed(2)}`).join('L') + 'Z';
  return d;
}
function renderShapes() {
  const box = $('shapes');
  if (!box.childElementCount) for (const s of SHAPES) {
    const b = document.createElement('button'); b.type = 'button'; b.dataset.id = s.id; b.setAttribute('role', 'radio');
    b.innerHTML = `<svg viewBox="0 0 24 24" aria-hidden="true"><path fill-rule="evenodd" d="${exPathD(shapeData(s.id).ex, 24)}"/></svg>`;
    b.append(document.createTextNode(s.name));
    b.onclick = () => keepInPlace(b, () => { D.shape = s.id; fitNext = true; saveState(); updateUI(); schedule(); });
    box.append(b);
  }
  box.querySelectorAll('button').forEach(b => b.setAttribute('aria-checked', String(b.dataset.id === D.shape)));
}

/* ===== Písma pro text ===== */
const FONT_LIST = [['pacifico', 'Pacifico (psací, spojené)'], ['lobster', 'Lobster (psací)'], ['baloo', 'Baloo (kulaté tučné)'], ['poppins', 'Poppins (tučné)'], ['comic', 'Comic Neue (hravé)']];
const FONT_CACHE = {};
function getFont(id) {
  if (!FONT_CACHE[id]) { const b64 = COOKIE_FONTS[id] || COOKIE_FONTS.poppins, s = atob(b64), u = new Uint8Array(s.length); for (let i = 0; i < s.length; i++) u[i] = s.charCodeAt(i); FONT_CACHE[id] = opentype.parse(u.buffer); }
  return FONT_CACHE[id];
}
(function () { const sel = $('fontSel'); for (const [id, name] of FONT_LIST) { const o = document.createElement('option'); o.value = id; o.textContent = name; sel.append(o); } })();
function textEx(font, s, size) {
  const L = layoutText(font, s, { size, spacing: 0, lineH: 1.15, align: 'center', mirror: false });
  return { ex: L.paths.length ? unionEx(L.paths) : [], missing: L.missing };
}

/* ===== Obrázek a SVG ===== */
let IMG = null, SVG = null, imgSeq = 0;
const loadImage = (url) => new Promise((res, rej) => { const im = new Image(); im.onload = () => res(im); im.onerror = () => rej(new Error('img')); im.src = url; });
function sampleOwl() {
  const c = document.createElement('canvas'); c.width = c.height = 600; const x = c.getContext('2d');
  x.fillStyle = '#fff'; x.fillRect(0, 0, 600, 600); x.fillStyle = '#111';
  x.beginPath(); x.ellipse(300, 340, 165, 210, 0, 0, Math.PI * 2); x.fill();
  x.beginPath(); x.moveTo(150, 230); x.lineTo(175, 70); x.lineTo(265, 160); x.closePath(); x.fill();
  x.beginPath(); x.moveTo(450, 230); x.lineTo(425, 70); x.lineTo(335, 160); x.closePath(); x.fill();
  x.fillStyle = '#fff'; for (const ex of [228, 372]) { x.beginPath(); x.arc(ex, 265, 62, 0, Math.PI * 2); x.fill(); }
  x.fillStyle = '#111'; for (const ex of [238, 362]) { x.beginPath(); x.arc(ex, 272, 27, 0, Math.PI * 2); x.fill(); }
  x.fillStyle = '#fff'; x.beginPath(); x.moveTo(276, 318); x.lineTo(324, 318); x.lineTo(300, 362); x.closePath(); x.fill();
  x.strokeStyle = '#fff'; x.lineWidth = 15; x.lineCap = 'round'; x.lineJoin = 'round';
  for (const [y, w] of [[415, 70], [465, 90], [515, 70]]) { x.beginPath(); x.moveTo(300 - w, y); x.lineTo(300 - w / 2, y + 22); x.lineTo(300, y); x.lineTo(300 + w / 2, y + 22); x.lineTo(300 + w, y); x.stroke(); }
  return c;
}
function setImg(img, name) { IMG = { img, name, id: ++imgSeq }; $('imgName').textContent = name; D.src = 'img'; fitNext = true; updateUI(); schedule(); }
function setSvg(text, name) { SVG = { text, name, id: ++imgSeq }; $('svgName').textContent = name; D.src = 'svg'; fitNext = true; updateUI(); schedule(); }
async function openImgFile(f) {
  if (!f) return; if (/svg/i.test(f.type) || /\.svg$/i.test(f.name)) return setSvg(await f.text(), f.name);
  try { setImg(await loadImage(URL.createObjectURL(f)), f.name); } catch (e) { $('imgName').textContent = 'Obrázek se nepodařilo otevřít.'; }
}
function wireDrop(drop, input, onFile) {
  drop.onclick = () => input.click();
  drop.onkeydown = (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); input.click(); } };
  input.onchange = (e) => { onFile(e.target.files[0]); e.target.value = ''; };
  drop.addEventListener('dragover', (e) => { e.preventDefault(); drop.classList.add('over'); });
  drop.addEventListener('dragleave', () => drop.classList.remove('over'));
  drop.addEventListener('drop', (e) => { e.preventDefault(); drop.classList.remove('over'); onFile(e.dataTransfer.files[0]); });
}
wireDrop($('dropImg'), $('inImg'), openImgFile);
wireDrop($('dropSvg'), $('inSvg'), async (f) => { if (f) setSvg(await f.text(), f.name); });
$('btnImgSample').onclick = () => setImg(sampleOwl(), 'Ukázka: sova');
$('btnSvgSample').onclick = () => setSvg(ICONS.find(i => i.id === 'smajlik').svg, 'Ukázka: smajlík');

let traceCache = { key: '', val: null };
function traceImg() {
  const t = D.img, key = [IMG.id, t.mode, t.auto, t.thr, t.smooth].join('|');
  if (traceCache.key === key) return traceCache.val;
  const im = IMG.img; let w = im.naturalWidth || im.width, h = im.naturalHeight || im.height; const k = Math.min(1, 700 / Math.max(w, h)); w = Math.max(1, Math.round(w * k)); h = Math.max(1, Math.round(h * k));
  const c = document.createElement('canvas'); c.width = w; c.height = h; const x = c.getContext('2d'); x.imageSmoothingQuality = 'high'; x.drawImage(im, 0, 0, w, h);
  let val;
  const data = x.getImageData(0, 0, w, h);
  if (t.mode === 'alpha') { let tr = false; for (let i = 3; i < data.data.length; i += 4) if (data.data[i] < 250) { tr = true; break; } if (!tr) { val = { err: 'Obrázek nemá průhledné pozadí. Přepněte „Tvar tvoří“ na Tmavé nebo Světlé.' }; traceCache = { key, val }; return val; } }
  const M = makeMask(data, { mode: t.mode, threshold: t.auto ? null : t.thr, blur: 1 });
  const ex = loopsToEx(traceMask(M.mask, M.w, M.h), M.h, { smooth: t.smooth, minArea: 40, pxSize: 1 });
  val = ex.length ? { ex, thr: M.thr } : { err: 'V obrázku se nenašel žádný tvar. Přepněte „Tmavé / Světlé“ nebo upravte práh jasu.', thr: M.thr };
  traceCache = { key, val }; return val;
}
function keepLargest(ex) {
  if (ex.length < 2) return ex;
  let best = null, ba = -1; for (const e of ex) { const a = Math.abs(ClipperLib.Clipper.Area(e.outer)); if (a > ba) { ba = a; best = e; } }
  return ex.filter(e => e === best || ClipperLib.Clipper.PointInPolygon(e.outer[0], best.outer) !== 0);
}
/* Přeškálování návrhu: delší strana = size mm, střed v počátku */
function fitTo(list, ref, size) {
  const bb = boundsEx(ref), k = size / Math.max(bb.x1 - bb.x0, bb.y1 - bb.y0), cx = (bb.x0 + bb.x1) / 2, cy = (bb.y0 + bb.y1) / 2;
  return list.map(ex => ex && ex.length ? mapEx(ex, (x, y) => [(x - cx) * k, (y - cy) * k]) : []);
}

/* Návrh v rovině sušenky (jak ji uvidíte shora): obrys a kresba pro razítko */
function design(msgs) {
  const S = D.size;
  if (D.src === 'shape') {
    const sd = shapeData(D.shape); const [sil, deco] = fitTo([sd.ex, sd.deco], sd.ex, S);
    return { sil: outersOf(sil), rel: D.deco ? deco : [], name: D.shape, kind: 'shape' };
  }
  if (D.src === 'text') {
    const s = D.text.s.trim(); if (!s) return { err: 'Napište text vykrajovátka.' };
    const font = getFont(D.text.font), T = textEx(font, s, 20);
    if (T.missing.length) msgs.push({ lvl: 'warn', msg: `Písmo nemá znaky: ${T.missing.join(' ')}. Ve vykrajovátku chybí.` });
    if (!T.ex.length) return { err: 'Z textu nevznikl žádný tvar.' };
    const m = Math.max(0, D.text.margin), bb = boundsEx(T.ex), k = Math.max(5, S - 2 * m) / Math.max(bb.x1 - bb.x0, bb.y1 - bb.y0);
    const cx = (bb.x0 + bb.x1) / 2, cy = (bb.y0 + bb.y1) / 2, letters = mapEx(T.ex, (x, y) => [(x - cx) * k, (y - cy) * k]);
    const sil = m > 0 ? outersOf(offsetEx(letters, m)) : outersOf(letters);
    if (m < 1 && D.stamp.on) msgs.push({ lvl: 'info', msg: 'Bez okraje kolem písmen nemá razítko co otisknout, protože vykrojená písmena jsou celá. Přidejte okraj, nebo napište na razítko jiný text.' });
    return { sil, rel: m >= 1 ? letters : [], name: s, kind: 'text' };
  }
  let ex, name;
  if (D.src === 'img') {
    if (!IMG) return { err: 'Vyberte obrázek, nebo zkuste ukázku se sovou.' };
    const t = traceImg(); $('oThr').textContent = D.img.auto ? (t.thr != null ? 'auto ' + t.thr : 'auto') : String(D.img.thr);
    if (t.err) return { err: t.err }; ex = t.ex; name = IMG.name;
  } else {
    if (!SVG) return { err: 'Vyberte soubor SVG, nebo zkuste ukázku se smajlíkem.' };
    let sym = null; try { sym = svgToSymbol(SVG.text, true); } catch (e) {}
    if (!sym) return { err: 'V SVG nejsou žádné vyplněné plochy ani čáry, ze kterých by šel udělat tvar.' };
    ex = symbolToEx(sym); name = SVG.name;
  }
  if (D.largest) ex = keepLargest(ex);
  const sil0 = outersOf(ex);
  const [sil, exS] = fitTo([sil0, ex], sil0, S);
  const dark = exS, light = diffEx(sil, exS);
  return { sil, dark, light, name, kind: 'pic' };
}

/* ===== Ovládání ===== */
function syncUI() {
  document.querySelectorAll('[data-k]').forEach(el => { const v = getK(el.dataset.k); if (el.type === 'checkbox') el.checked = !!v; else el.value = v; });
  document.querySelectorAll('input[type=radio][name*="."]').forEach(r => { r.checked = String(getK(r.name)) === r.value; });
  updateUI();
}
function updateUI() {
  const show = { src_shape: D.src === 'shape', src_img: D.src === 'img', src_svg: D.src === 'svg', src_text: D.src === 'text',
    shapeDeco: D.src === 'shape', imgThr: !D.img.auto, stamp: D.stamp.on, stampPick: D.src === 'img' || D.src === 'svg', stampText: !!D.stamp.text.trim(), flange: D.cut.flange };
  document.querySelectorAll('[data-show]').forEach(el => { el.hidden = !show[el.dataset.show]; });
  document.querySelectorAll('#srcTabs button').forEach(b => b.setAttribute('aria-checked', String(b.dataset.src === D.src)));
  renderShapes();
  $('decoLbl').textContent = { pernicek: 'Ozdoby na razítko: oči, úsměv, knoflíky', stromek: 'Ozdoby na razítko: koule a řetěz', snehulak: 'Ozdoby na razítko: oči, nos, knoflíky', domek: 'Ozdoby na razítko: dveře a okna', vajicko: 'Ozdoby na razítko: kraslicový vzor' }[D.shape] || 'Ozdoba na razítko';
  $('oSmooth').textContent = String(D.img.smooth);
  if (!D.img.auto) $('oThr').textContent = String(D.img.thr);
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
function onChange(path) { if (path === 'size' || path === 'stamp.on' || path === 'stamp.handle') fitNext = true; updateUI(); saveState(); schedule(); }
document.querySelectorAll('[data-k]').forEach(el => {
  const ev = (el.type === 'checkbox' || el.tagName === 'SELECT') ? 'change' : 'input';
  el.addEventListener(ev, () => {
    let v = el.type === 'checkbox' ? el.checked : el.value;
    if (el.type === 'number' || el.type === 'range') { v = parseFloat(v); if (!isFinite(v)) return; }
    else if (el.tagName === 'SELECT' && isNum(v)) v = parseFloat(v);
    setK(el.dataset.k, v);
    document.querySelectorAll(`[data-k="${el.dataset.k}"]`).forEach(o => { if (o !== el && o.type === 'checkbox') o.checked = !!v; });
    if (el.type === 'checkbox') keepInPlace(el, () => onChange(el.dataset.k)); else { anchor = { el, top: el.getBoundingClientRect().top, t: Date.now() }; onChange(el.dataset.k); }
  });
});
document.querySelectorAll('input[type=radio][name*="."]').forEach(r => r.addEventListener('change', () => keepInPlace(r.closest('label') || r, () => { setK(r.name, r.value); onChange(r.name); })));
document.querySelectorAll('#srcTabs button').forEach(b => b.onclick = () => keepInPlace(b, () => { D.src = b.dataset.src; fitNext = true; saveState(); updateUI(); schedule(); }));
document.querySelectorAll('[data-size]').forEach(b => b.onclick = () => { D.size = +b.dataset.size; document.querySelector('[data-k="size"]').value = D.size; onChange('size'); });
let tmr = 0;
function schedule(now) { clearTimeout(tmr); tmr = setTimeout(() => { $('busy').hidden = false; setTimeout(() => { try { rebuild(); } finally { $('busy').hidden = true; } }, 20); }, now ? 0 : 220); }

/* ===== 3D scéna ===== */
const cv = $('cv');
let renderer = null, scene, camera, bedGroup, meshes = [], fitNext = true, model = null;
const orbit = { theta: -Math.PI / 2, phi: 0.95, r: 300, target: new THREE.Vector3() };
function initGL() {
  try { renderer = new THREE.WebGLRenderer({ canvas: cv, antialias: true }); } catch (e) { renderer = null; return; }
  renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
  scene = new THREE.Scene(); camera = new THREE.PerspectiveCamera(35, 1, 0.5, 6000); camera.up.set(0, 0, 1);
  scene.add(new THREE.HemisphereLight(0xffffff, 0x445055, 0.75));
  const d1 = new THREE.DirectionalLight(0xffffff, 0.6); d1.position.set(-120, -200, 300); scene.add(d1);
  const d2 = new THREE.DirectionalLight(0xffffff, 0.3); d2.position.set(200, 150, 120); scene.add(d2);
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
  if (!model || !renderer) return; const s = model.size; orbit.target.set(0, 0, s.z / 3);
  const span = Math.max(s.x, s.y, s.z, 20);
  orbit.r = span / (2 * Math.tan(THREE.MathUtils.degToRad(35) / 2)) * Math.max(1.2, 1.75 / camera.aspect);
  if (view === 'top') { orbit.phi = 0.001; orbit.theta = -Math.PI / 2; } else { orbit.phi = 0.85; orbit.theta = -Math.PI / 2 - 0.3; }
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
cv.addEventListener('wheel', e => { e.preventDefault(); orbit.r = Math.min(5000, Math.max(5, orbit.r * Math.exp(e.deltaY * 0.0012))); draw(); }, { passive: false });
$('lgCutC').style.background = COL.cut; $('lgStampC').style.background = COL.plate;

function setModel(m) {
  for (const mm of meshes) { scene && scene.remove(mm); mm.geometry.dispose(); mm.material.dispose(); }
  meshes = []; model = m;
  $('btnSave').disabled = !m; $('btnSvg').disabled = !m; $('lgStamp').hidden = !(m && m.stamp.length);
  if (!m) { $('dims').textContent = '–'; $('stats').textContent = ''; $('cookie').hidden = true; draw(); return; }
  $('dims').innerHTML = `<b>${fmt(m.size.x)}</b> × <b>${fmt(m.size.y)}</b> × <b>${fmt(m.size.z)}</b> mm`;
  if (renderer) {
    for (const [list, col, rough] of [[m.cutter, COL.cut, 0.55], [m.stampPlate, COL.plate, 0.75], [m.stampRelief, COL.relief, 0.75]])
      for (const g of list) { const mesh = new THREE.Mesh(g, new THREE.MeshStandardMaterial({ color: new THREE.Color(col), roughness: rough, metalness: 0.02 })); scene.add(mesh); meshes.push(mesh); }
  }
  if (fitNext) { fit('persp'); fitNext = false; } else draw();
}
function showMsgs(list) { const box = $('msgs'); box.textContent = ''; for (const m of list) { const d = document.createElement('div'); d.className = 'msg ' + m.lvl; d.textContent = m.msg; box.append(d); } }

/* ===== Vykrajovátko jako jedno uzavřené těleso: vnitřní stěna rovná, vně schody (límec, stěna, ostří) ===== */
function diffKeep(aEx, bEx) {
  const c = new ClipperLib.Clipper(); c.PreserveCollinear = true;
  c.AddPaths(exToPaths(aEx), ClipperLib.PolyType.ptSubject, true); c.AddPaths(exToPaths(bEx), ClipperLib.PolyType.ptClip, true);
  const pt = new ClipperLib.PolyTree(); c.Execute(ClipperLib.ClipType.ctDifference, pt, ClipperLib.PolyFillType.pftNonZero, ClipperLib.PolyFillType.pftNonZero);
  return ClipperLib.JS.PolyTreeToExPolygons(pt);
}
function cutterSolid(silM, levels) { // levels: [[odsazení, z0, z1], …] zdola nahoru, odsazení se zmenšuje
  const M = meshBuilder(), S0 = cleanEx(silM), off = levels.map(([d]) => cleanEx(offsetEx(S0, d)));
  const caps = (exs, z, up) => { for (const e of exs) M.cap(M.orient(e.outer, true), e.holes.map(h => M.orient(h, false)), z, up); };
  const H = levels[levels.length - 1][2];
  caps(diffKeep(off[0], S0), levels[0][1], false);
  for (let i = 0; i < levels.length - 1; i++) caps(diffKeep(off[i], off[i + 1]), levels[i][2], true);
  caps(diffKeep(off[off.length - 1], S0), H, true);
  levels.forEach(([, z0, z1], i) => { for (const e of off[i]) { M.wall(M.orient(e.outer, true), z0, z1); e.holes.forEach(h => M.wall(M.orient(h, false), z0, z1)); } });
  for (const e of S0) M.wall(M.orient(e.outer, false), levels[0][1], H);
  return M.geom();
}

/* ===== Výpočet ===== */
const mirrorY = (ex) => ex.length ? mapEx(ex, (x, y) => [x, -y]) : [];
const geomBox = (list) => { const b = new THREE.Box3(); for (const g of list) { g.computeBoundingBox(); b.union(g.boundingBox); } return b; };
function rebuild() {
  const msgs = [];
  try { build(msgs); } catch (e) { msgs.push({ lvl: 'bad', msg: 'Model se nepodařilo sestavit: ' + e.message }); setModel(null); }
  showMsgs(msgs); holdAnchor();
}
function build(msgs) {
  const des = design(msgs);
  if (des.err) { msgs.push({ lvl: 'bad', msg: des.err }); setModel(null); return; }
  const C = D.cut, sil = des.sil.filter(e => Math.abs(ClipperLib.Clipper.Area(e.outer)) > 4 * SC * SC);
  if (!sil.length) { msgs.push({ lvl: 'bad', msg: 'Tvar je příliš malý. Zvětšete sušenku.' }); setModel(null); return; }
  if (sil.length > 1) msgs.push({ lvl: 'warn', msg: `Tvar má ${plural(sil.length, 'samostatnou část', 'samostatné části', 'samostatných částí')}. Každá se vykrojí zvlášť a drží je pohromadě jen límec. ${des.kind === 'text' ? 'Zvětšete okraj kolem písmen, nebo zvolte psací písmo.' : 'Zapněte „Jen největší tvar“, nebo upravte obrázek.'}` });
  const narrow = thinLoss(sil, 6);
  if (narrow >= 0.04) msgs.push({ lvl: 'warn', msg: 'Některé části sušenky jsou užší než 6 mm. Těsto v nich bude váznout a snadno se utrhne. Zvětšete sušenku nebo zvolte jednodušší tvar.' });

  // --- vykrajovátko (tiskne se límcem dolů, proto zrcadlově) ---
  const silM = mirrorY(sil), H = Math.max(C.height, C.bladeH + 1);
  const levels = (C.flange ? [[C.wall + C.flangeW, 0, C.flangeH], [C.wall, C.flangeH, H - C.bladeH]] : [[C.wall, 0, H - C.bladeH]]).concat([[Math.min(C.blade, C.wall), H - C.bladeH, H]]);
  const cutter = [cutterSolid(silM, levels)];

  // --- razítko ---
  let relief = [], plateEx = [], stampPlate = [], stampRelief = [];
  if (D.stamp.on) {
    const inner = offsetEx(sil, -(C.clear + 1.2));
    let rel = [];
    if (des.kind === 'pic') {
      const pick = D.stamp.pick === 'auto' ? null : D.stamp.pick;
      const dk = intersectEx(des.dark, inner), lt = intersectEx(des.light, inner), aD = areaEx(dk), aL = areaEx(lt);
      if (pick === 'dark') rel = dk; else if (pick === 'light') rel = lt;
      else if (!pick) { const cand = [[dk, aD], [lt, aL]].filter(([, a]) => a > 2).sort((a, b) => a[1] - b[1]); rel = cand.length ? cand[0][0] : []; }
      if (rel.length && areaEx(rel) > areaEx(inner) * 0.8) { msgs.push({ lvl: 'info', msg: 'Vybraná část zabírá skoro celou sušenku, otisk by byl jen placka. Zkuste v razítku „Co otisknout“ druhou možnost.' }); }
    } else rel = des.rel || [];
    const st = D.stamp.text.trim();
    if (st) {
      const font = getFont(des.kind === 'text' ? D.text.font : 'poppins'), T = textEx(font, st, D.stamp.textH);
      if (T.ex.length) {
        let tex = T.ex, bb = boundsEx(tex); const ib = boundsEx(inner.length ? inner : sil), maxW = (ib.x1 - ib.x0) * 0.85;
        if (bb.x1 - bb.x0 > maxW) { const k = maxW / (bb.x1 - bb.x0); tex = mapEx(tex, (x, y) => [x * k, y * k]); bb = boundsEx(tex); msgs.push({ lvl: 'info', msg: `Text na razítku jsem zmenšil na ${fmt(D.stamp.textH * k)} mm, aby se vešel.` }); }
        const cx = (ib.x0 + ib.x1) / 2 - (bb.x0 + bb.x1) / 2, cy = (ib.y0 + ib.y1) / 2 - (bb.y0 + bb.y1) / 2;
        rel = unionEx(exToPaths(rel).concat(exToPaths(mapEx(tex, (x, y) => [x + cx, y + cy]))));
      }
    }
    if (rel.length && D.stamp.thick > 0) rel = offsetEx(rel, D.stamp.thick / 2);
    relief = rel.length ? intersectEx(rel, inner) : [];
    relief = relief.filter(e => Math.abs(ClipperLib.Clipper.Area(e.outer)) > 0.3 * SC * SC);
    if (!relief.length) msgs.push({ lvl: 'warn', msg: des.kind === 'shape' ? 'Razítko nemá co otisknout. Zapněte ozdoby, nebo napište na razítko text.' : 'Razítko nemá co otisknout. Napište na něj text, nebo vypněte razítko.' });
    else {
      if (thinLoss(relief, 0.8) >= 0.15) msgs.push({ lvl: 'warn', msg: 'Některé čáry razítka jsou tenčí než 0,8 mm a do těsta se skoro neotisknou. Zvyšte „Zesílit čáry“.' });
      plateEx = offsetEx(sil, -C.clear);
      const pT = D.stamp.plate, dep = D.stamp.depth;
      if (D.stamp.handle) { // tiskne se kresbou dolů, tak jak se používá: bez zrcadlení
        stampRelief.push(extrudeEx(relief, 0, dep)); stampPlate.push(extrudeEx(plateEx, dep, dep + pT));
        const pb = boundsEx(plateEx), wide = pb.x1 - pb.x0 >= pb.y1 - pb.y0, cx = (pb.x0 + pb.x1) / 2, cy = (pb.y0 + pb.y1) / 2;
        const L = Math.max(14, 0.6 * Math.max(pb.x1 - pb.x0, pb.y1 - pb.y0)) / 2, Wd = 4.5;
        const bar = [{ outer: wide ? rectPath(cx - L, cy - Wd, cx + L, cy + Wd) : rectPath(cx - Wd, cy - L, cx + Wd, cy + L), holes: [] }];
        let hEx = roundEx(intersectEx(bar, offsetEx(plateEx, -3)), 1.5); const hMax = Math.max(0, ...hEx.map(e => areaEx([e]))); hEx = hEx.filter(e => areaEx([e]) >= hMax * 0.35);
        if (hEx.length) stampPlate.push(extrudeEx(hEx, dep + pT, dep + pT + 12));
        else msgs.push({ lvl: 'info', msg: 'Na tak malé razítko se držátko nevejde.' });
      } else {
        stampPlate.push(extrudeEx(mirrorY(plateEx), 0, pT)); stampRelief.push(extrudeEx(mirrorY(relief), pT, pT + dep));
      }
    }
  }
  // rozložení: razítko vedle vykrajovátka
  const stamp = stampPlate.concat(stampRelief);
  if (stamp.length) {
    const a = geomBox(cutter), b = geomBox(stamp), wide = a.max.x - a.min.x > (a.max.y - a.min.y) * 1.4;
    for (const g of stamp) wide ? g.translate((a.min.x + a.max.x) / 2 - (b.min.x + b.max.x) / 2, a.min.y - 10 - b.max.y, 0) : g.translate(a.max.x + 10 - b.min.x, (a.min.y + a.max.y) / 2 - (b.min.y + b.max.y) / 2, 0);
  }
  const all = cutter.concat(stamp), size = centerGeoms(all);
  const cb = geomBox(cutter), sb = stamp.length ? geomBox(stamp) : null;
  const m = { cutter, stampPlate, stampRelief, stamp, size, sil, relief, name: des.name, kind: des.kind,
    cutSize: [cb.max.x - cb.min.x, cb.max.y - cb.min.y, cb.max.z - cb.min.z], stampSize: sb && [sb.max.x - sb.min.x, sb.max.y - sb.min.y, sb.max.z - sb.min.z] };
  setModel(m); drawCookie(sil, relief); showStats(m);

  const fits = (s) => (s[0] <= D.bedX && s[1] <= D.bedY) || (s[1] <= D.bedX && s[0] <= D.bedY);
  if (!fits(m.cutSize)) msgs.push({ lvl: 'bad', msg: `Vykrajovátko (${fmt(m.cutSize[0])} × ${fmt(m.cutSize[1])} mm) se nevejde na tiskovou plochu ${D.bedX} × ${D.bedY} mm.` });
  else if (!fits([m.size.x, m.size.y])) msgs.push({ lvl: 'info', msg: 'Vykrajovátko a razítko se vedle sebe na podložku nevejdou. Vytiskněte je jedno po druhém.' });
  if (stamp.length) msgs.push({ lvl: 'info', msg: D.stamp.handle ? 'Razítko se tiskne kresbou dolů a držátkem nahoru, bez podpěr. První vrstva musí dobře přilnout, aby byly čáry ostré.' : 'Razítko se tiskne destičkou dolů a kresbou nahoru, bez podpěr.' });
  if (!msgs.some(x => x.lvl === 'bad' || x.lvl === 'warn')) msgs.unshift({ lvl: 'ok', msg: stamp.length ? 'Vykrajovátko a razítko jsou připravené. Vpravo dole vidíte, jak bude vypadat sušenka.' : 'Vykrajovátko je připravené.' });
}
function drawCookie(sil, relief) {
  const c = $('cvCookie'), N = 300, bb = boundsEx(sil), w = bb.x1 - bb.x0, h = bb.y1 - bb.y0, k = (N - 16) / Math.max(w, h);
  c.width = Math.round(w * k + 16); c.height = Math.round(h * k + 16); const x = c.getContext('2d');
  const path = (exs) => { x.beginPath(); for (const p of exToPaths(exs)) p.forEach((q, i) => { const px = 8 + (q.X / SC - bb.x0) * k, py = 8 + (bb.y1 - q.Y / SC) * k; i ? x.lineTo(px, py) : x.moveTo(px, py); }), x.closePath(); };
  x.clearRect(0, 0, c.width, c.height);
  path(sil); x.fillStyle = COL.dough; x.fill('evenodd'); x.strokeStyle = COL.doughDark; x.lineWidth = 2; x.stroke();
  if (relief.length) { path(relief); x.fillStyle = COL.doughDark; x.globalAlpha = 0.75; x.fill('evenodd'); x.globalAlpha = 1; }
  $('cookie').hidden = false;
}
function showStats(m) {
  const box = $('stats'); box.textContent = ''; let grams = 0, vol = 0;
  for (const g of m.cutter.concat(m.stamp)) { const st = meshStats(g.attributes.position.array); vol += st.volume / 1000; grams += filamentEstimate(st, { wall: 1.2, infill: 20, density: 1.24, diameter: 1.75, pricePerKg: 500 }).grams; }
  const tiles = [['Vykrajovátko', `${fmt(m.cutSize[0], 0)} × ${fmt(m.cutSize[1], 0)} × ${fmt(m.cutSize[2], 0)} mm`], ['Razítko', m.stampSize ? `${fmt(m.stampSize[0], 0)} × ${fmt(m.stampSize[1], 0)} × ${fmt(m.stampSize[2], 0)} mm` : 'bez razítka'],
    ['Materiál', `${fmt(grams, 0)} g PLA`], ['Tisk zhruba', (() => { const hrs = grams / 11 + 0.15; return hrs < 1 ? `${fmt(hrs * 60, 0)} min` : `${fmt(hrs, 1)} h`; })()]];
  for (const [a, b] of tiles) { const d = document.createElement('div'); d.className = 'stat'; const s1 = document.createElement('span'); s1.textContent = a; const s2 = document.createElement('b'); s2.textContent = b; d.append(s1, s2); box.append(d); }
}

/* ===== Stažení ===== */
const inViewer = !!(window.claude && typeof window.claude.use === 'function');
let dlCap = null;
if (inViewer) window.claude.use('downloads').then(d => { dlCap = d; updateNote(); }).catch(() => updateNote());
function updateNote() { $('saveNote').textContent = inViewer ? (dlCap ? 'Tady se STL stáhne zabalené v ZIP souboru.' : 'Stahování je v tomto zobrazení nedostupné.') : 'STL otevřete ve sliceru (Creality Print, Bambu Studio, PrusaSlicer, Cura). Jednotky jsou milimetry.'; }
const slug = (t) => (t || 'tvar').replace(/^Ukázka: /, '').normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/\.[a-z0-9]+$/i, '').replace(/[^A-Za-z0-9]+/g, '_').replace(/^_|_$/g, '').slice(0, 24).toLowerCase() || 'tvar';
function stl(geoms) { const u = stlBinary(geoms), head = 'Created by Julius Andy Antos | Cookie Cutter Studio | mm'; for (let i = 0; i < 80; i++) u[i] = i < head.length ? head.charCodeAt(i) : 32; return u; }
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
  if (!model) return; const base = 'cookie_' + slug(model.name), files = [{ name: base + '_vykrajovatko.stl', data: stl(model.cutter) }];
  if (model.stamp.length) files.push({ name: base + '_razitko.stl', data: stl(model.stamp) });
  saveFiles(files, base + '.zip');
};
$('btnSvg').onclick = () => { if (!model) return; const base = 'cookie_' + slug(model.name); saveFiles([{ name: base + '_obrys.svg', data: exToSvg(model.sil, 'Cookie Cutter Studio') }], base + '_svg.zip'); };

/* ===== Instalace jako aplikace a sbalitelné sekce ===== */
let installEvt = null;
window.addEventListener('beforeinstallprompt', (e) => { e.preventDefault(); installEvt = e; $('btnInstall').hidden = false; });
window.addEventListener('appinstalled', () => { installEvt = null; $('btnInstall').hidden = true; });
$('btnInstall').onclick = async () => { if (!installEvt) return; installEvt.prompt(); try { await installEvt.userChoice; } catch (e) {} installEvt = null; $('btnInstall').hidden = true; };
if (!inViewer && 'serviceWorker' in navigator && (location.protocol === 'https:' || location.hostname === 'localhost')) navigator.serviceWorker.register('sw.js').catch(() => {});
(function () {
  const KEY = 'cookie-cutter-studio-sbaleno';
  let closed; try { closed = JSON.parse(localStorage.getItem(KEY) || 'null'); } catch (e) { closed = null; }
  if (!Array.isArray(closed)) closed = ['Pokročilé', 'Rady k tisku a používání'];
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

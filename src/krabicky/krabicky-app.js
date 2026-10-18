/* ===== Krabičky a organizéry — aplikace. Created by Julius Andy Antoš ===== */
const $ = (id) => document.getElementById(id);
const DEF = {
  type: 'box',
  box: { shape: 'rect', inner: '0', W: 80, D: 60, H: 40, r: 4, t: 2, f: 1.6, nx: 2, ny: 1, dt: 1.2, dh: 100, lid: 'cap', L: 6, lt: 1.6, c: 0.2, text: '', th: 10, td: 0.6 },
  bin: { gx: 2, gy: 1, hu: 6, nx: 2, ny: 1, t: 1.2, lip: true, mag: false },
  plate: { gx: 4, gy: 3, m: 1, dw: 0, dd: 0 },
  bedX: 220, bedY: 220, bedZ: 250,
};
const STORE = 'krabicky-v1';
const deepMerge = (a, b) => { for (const k in b) { if (b[k] && typeof b[k] === 'object' && !Array.isArray(b[k]) && a[k] && typeof a[k] === 'object') deepMerge(a[k], b[k]); else if (k in a && typeof a[k] === typeof b[k]) a[k] = b[k]; } return a; };
const D = JSON.parse(JSON.stringify(DEF));
try { deepMerge(D, JSON.parse(localStorage.getItem(STORE) || '{}')); } catch (e) {}
const saveState = () => { try { localStorage.setItem(STORE, JSON.stringify(D)); } catch (e) {} };
const getK = (p) => p.split('.').reduce((o, k) => o[k], D);
const setK = (p, v) => { const ks = p.split('.'); let o = D; for (let i = 0; i < ks.length - 1; i++) o = o[ks[i]]; o[ks[ks.length - 1]] = v; };
const fmt = (v, d = 1) => v.toLocaleString('cs-CZ', { maximumFractionDigits: d, minimumFractionDigits: d });
const css = (v) => getComputedStyle(document.documentElement).getPropertyValue(v).trim();
const clamp = (v, a, b) => Math.min(b, Math.max(a, +v || 0));
const COL = { box: '#0b7a72', lid: '#b9c3c7' };
const GF = 42, GH = 7; // Gridfinity: pole 42 mm, výšková jednotka 7 mm

let FONT = null;
function font() {
  if (!FONT) { const s = atob(LABEL_FONT_B64), u = new Uint8Array(s.length); for (let i = 0; i < s.length; i++) u[i] = s.charCodeAt(i); FONT = opentype.parse(u.buffer); }
  return FONT;
}
const rectEx = (x0, y0, x1, y1) => exOf(rectPath(x0, y0, x1, y1));
const moveGeom = (g, dx, dy, dz) => { g.translate(dx, dy, dz); return g; };

/* ===== Krabička ===== */
function buildBox(msgs) {
  const B = D.box, rect = B.shape === 'rect';
  const t = clamp(B.t, 0.8, 6), f = clamp(B.f, 0.6, 6), r = clamp(B.r, 0, 50);
  let lid = B.lid; if (!rect && lid === 'slide') lid = 'cap';
  const lt = clamp(B.lt, 1, 6), c = clamp(B.c, 0, 1);
  const rt = 1.2, gd = Math.max(0.6, t / 2), gh = lt + c;                  // posuvné víčko: horní lišta, hloubka a výška drážky
  let W = clamp(B.W, 10, 400), Dp = rect ? clamp(B.D, 10, 400) : W, H = clamp(B.H, 5, 300);
  if (B.inner === '1') { W += 2 * t; Dp += 2 * t; H += f + (lid === 'slide' ? rt + gh : 0); }
  const N = Math.max(48, Math.min(160, Math.round(W * 1.2)));            // body kruhu
  const hexR = (w) => w / 2 / Math.cos(Math.PI / 6);
  const shapeO = (off) => {
    if (B.shape === 'round') return circ(0, 0, W / 2 + off, N);
    if (B.shape === 'hex') return regPoly(0, 0, hexR(W + 2 * off), 6, Math.max(0, r + off), 6, Math.PI / 6);
    return rrect(0, 0, W + 2 * off, Dp + 2 * off, Math.max(0, r + off));
  };
  const O = shapeO(0), I = shapeO(-t);
  const ib = boundsEx(exOf(I)), Hin = H - f - (lid === 'slide' ? rt + gh : 0);
  if (Hin < 2) { msgs.push({ lvl: 'bad', msg: 'Krabička je na zvolené dno a víčko příliš nízká.' }); return null; }

  // přihrádky = vnitřek bez přepážek
  const nx = Math.round(clamp(B.nx, 1, 12)), ny = Math.round(clamp(B.ny, 1, 12)), dt = clamp(B.dt, 0.8, 5);
  const strips = [];
  const cw = (ib.x1 - ib.x0 - (nx - 1) * dt) / nx, ch = (ib.y1 - ib.y0 - (ny - 1) * dt) / ny;
  for (let i = 1; i < nx; i++) { const x = ib.x0 + i * cw + (i - 1) * dt; strips.push(rectPath(x, ib.y0 - 5, x + dt, ib.y1 + 5)); }
  for (let j = 1; j < ny; j++) { const y = ib.y0 + j * ch + (j - 1) * dt; strips.push(rectPath(ib.x0 - 5, y, ib.x1 + 5, y + dt)); }
  const divs = strips.length > 0;
  if (divs && (cw < 4 || ch < 4)) msgs.push({ lvl: 'warn', msg: 'Přihrádky jsou užší než 4 mm. Zmenšete jejich počet nebo zvětšete krabičku.' });
  const cells = divs ? exDiff(exOf(I), unionEx(strips)) : exOf(I);
  let zDiv = divs ? f + Hin * clamp(B.dh, 20, 100) / 100 : f;

  // víčko a jeho uložení
  const lp = Math.max(0.8, t * 0.5);                                         // nasazovací: tloušťka límce na krabičce
  const L = clamp(B.L, 2, 30), zLip = H - L, skirt = t - lp - c;
  const zg1 = H - rt, zg0 = zg1 - gh;
  if (lid === 'cap') {
    if (skirt < 0.6) msgs.push({ lvl: 'warn', msg: `Okraj víčka vychází jen ${fmt(skirt)} mm. Pro nasazovací víčko nastavte stěnu aspoň ${fmt(2 + c)} mm.` });
    if (zLip <= f + 1) { msgs.push({ lvl: 'bad', msg: 'Výška nasazení víčka je větší než krabička.' }); return null; }
  }
  if (lid === 'slide') zDiv = Math.min(zDiv, zg0);
  const Ol = lid === 'cap' ? shapeO(-(t - lp)) : null;
  const slotY = ib.y0 - t - 5;
  const cavGroove = rectEx(ib.x0 - gd, slotY, ib.x1 + gd, ib.y1 + gd);
  const cavRail = exUnion([exOf(I), rectEx(ib.x0, slotY, ib.x1, ib.y0 + Math.max(1, r))]);

  const zs = [0, f, H];
  if (divs) zs.push(zDiv);
  if (lid === 'cap') zs.push(zLip);
  if (lid === 'slide') zs.push(zg0, zg1);
  const lv = [...new Set(zs.map(z => Math.round(z * 1000) / 1000))].filter(z => z >= 0 && z <= H).sort((a, b) => a - b);
  const region = (zm) => {
    if (zm < f) return exOf(O);
    const outer = lid === 'cap' && zm > zLip ? Ol : O;
    let hole;
    if (lid === 'slide' && zm > zg1) hole = cavRail;
    else if (lid === 'slide' && zm > zg0) hole = cavGroove;
    else hole = zm < zDiv ? cells : exOf(I);
    return exDiff(exOf(outer), hole);
  };
  const slabs = [];
  for (let i = 0; i < lv.length - 1; i++) slabs.push({ z0: lv[i], z1: lv[i + 1], ex: region((lv[i] + lv[i + 1]) / 2) });
  const box = stackSolid(slabs);

  // víčko
  let lidG = null, asm = null, lidSize = null;
  const txt = (B.text || '').trim();
  const td = Math.min(clamp(B.td, 0.2, 2), lt - 0.6);
  const textEx = (maxW, maxH, mirrorY) => {
    if (!txt) return [];
    let h = clamp(B.th, 3, 60), L2 = layoutText(font(), txt, { size: h, spacing: 0, lineH: 1.2, align: 'center', mirror: false });
    let ex = unionEx(L2.paths), b = boundsEx(ex);
    const k = Math.min(1, maxW / (b.x1 - b.x0), maxH / (b.y1 - b.y0));
    if (k < 1) msgs.push({ lvl: 'info', msg: `Nápis je zmenšený na výšku písmen ${fmt(h * k)} mm, aby se vešel na víčko.` });
    if (L2.missing.length) msgs.push({ lvl: 'warn', msg: 'Některé znaky písmo nemá: ' + L2.missing.join(' ') });
    const cx = (b.x0 + b.x1) / 2, cy = (b.y0 + b.y1) / 2;
    ex = mapEx(ex, (x, y) => [(x - cx) * k, (mirrorY ? -1 : 1) * (y - cy) * k]);
    if (thinLoss(ex, 0.8) > 0.25) msgs.push({ lvl: 'warn', msg: 'Písmena nápisu jsou tenká, rytí může být nevýrazné. Zvětšete výšku písmen.' });
    return ex;
  };
  if (lid === 'cap') {
    const bw = boundsEx(exOf(I));
    const tEx = textEx((bw.x1 - bw.x0) * 0.85, (bw.y1 - bw.y0) * 0.7, true);
    const ring = exDiff(exOf(O), exOf(shapeO(-(t - lp) + c)));
    const sk = Math.max(1, L - 0.3);
    const sl = [];
    if (tEx.length) sl.push({ z0: 0, z1: td, ex: exDiff(exOf(O), tEx) }, { z0: td, z1: lt, ex: exOf(O) });
    else sl.push({ z0: 0, z1: lt, ex: exOf(O) });
    sl.push({ z0: lt, z1: lt + sk, ex: ring });
    lidG = stackSolid(sl);
    lidSize = boundsEx(exOf(O));
    asm = (g) => { g.rotateX(Math.PI); g.translate(0, 0, H + lt); return g; };
  } else if (lid === 'slide') {
    const x0 = ib.x0 - gd + c, x1 = ib.x1 + gd - c, y0 = -Dp / 2, y1 = ib.y1 + gd - c;
    const plate = rectEx(x0, y0, x1, y1);
    const tEx = textEx((x1 - x0) * 0.8, (y1 - y0) * 0.55, false);
    const sl = [];
    const ridge = rectEx(-(ib.x1 - ib.x0) * 0.2, y0 + 2, (ib.x1 - ib.x0) * 0.2, y0 + 4);
    if (tEx.length) {
      const tm = mapEx(tEx, (x, y) => [x, y + 3]);
      sl.push({ z0: 0, z1: lt - td, ex: plate }, { z0: lt - td, z1: lt, ex: exDiff(plate, tm) });
    } else sl.push({ z0: 0, z1: lt, ex: plate });
    sl.push({ z0: lt, z1: lt + 0.8, ex: ridge });
    lidG = stackSolid(sl);
    lidSize = { x0, y0, x1, y1 };
    asm = (g) => { g.translate(0, 0, zg0); return g; };
  }
  const info = { W, D: Dp, H, inW: ib.x1 - ib.x0, inD: ib.y1 - ib.y0, inH: (lid === 'slide' ? zg0 : H) - f, cw, ch, nx, ny, lid };
  return { parts: [{ g: box, role: 'box', name: 'krabicka' }].concat(lidG ? [{ g: lidG, role: 'lid', name: 'vicko', asm }] : []), info };
}

/* ===== Gridfinity box ===== */
function buildBin(msgs) {
  const Bn = D.bin, gx = Math.round(clamp(Bn.gx, 1, 8)), gy = Math.round(clamp(Bn.gy, 1, 8)), hu = Math.round(clamp(Bn.hu, 2, 20));
  const t = clamp(Bn.t, 0.8, 2.4), Sx = gx * GF - 0.5, Sy = gy * GF - 0.5, Hb = hu * GH, zF = 6;
  const cellsC = [];
  for (let i = 0; i < gx; i++) for (let j = 0; j < gy; j++) cellsC.push([(i - (gx - 1) / 2) * GF, (j - (gy - 1) / 2) * GF]);
  const foot = (s, r) => cellsC.map(([x, y]) => rrect(x, y, s, s, r));
  const mags = ([x, y]) => Bn.mag ? [[-1, -1], [1, -1], [1, 1], [-1, 1]].map(([a, b]) => circ(x + a * 13, y + b * 13, 3.25, 40)) : [];
  const withMag = (loops) => loops.map((o, k) => ({ outer: o, holes: mags(cellsC[k]) }));
  const plain = (loops) => loops.map(o => ({ outer: o, holes: [] }));
  const F0 = foot(35.6, 0.8), F1 = foot(37.2, 1.6), F3 = foot(41.5, 3.75);
  const O = rrect(0, 0, Sx, Sy, 3.75), rr = (d) => rrect(0, 0, Sx + 2 * d, Sy + 2 * d, 3.75 + d);
  const I = rr(-t), ib = boundsEx(exOf(I));
  const nx = Math.round(clamp(Bn.nx, 1, 12)), ny = Math.round(clamp(Bn.ny, 1, 12)), dt = 1.2, strips = [];
  const cw = (ib.x1 - ib.x0 - (nx - 1) * dt) / nx, ch = (ib.y1 - ib.y0 - (ny - 1) * dt) / ny;
  for (let i = 1; i < nx; i++) { const x = ib.x0 + i * cw + (i - 1) * dt; strips.push(rectPath(x, ib.y0 - 5, x + dt, ib.y1 + 5)); }
  for (let j = 1; j < ny; j++) { const y = ib.y0 + j * ch + (j - 1) * dt; strips.push(rectPath(ib.x0 - 5, y, ib.x1 + 5, y + dt)); }
  if (strips.length && (cw < 6 || ch < 6)) msgs.push({ lvl: 'warn', msg: 'Přihrádky jsou užší než 6 mm. Zmenšete jejich počet.' });
  const cells = strips.length ? exDiff(exOf(I), unionEx(strips)) : exOf(I);
  const slabs = [];
  if (Bn.mag) slabs.push({ z0: 0, z1: 0.8, ex: withMag(F0), top: withMag(F1) }, { z0: 0.8, z1: 2.4, ex: withMag(F1) }, { z0: 2.4, z1: 2.6, ex: plain(F1) });
  else slabs.push({ z0: 0, z1: 0.8, ex: plain(F0), top: plain(F1) }, { z0: 0.8, z1: 2.6, ex: plain(F1) });
  slabs.push({ z0: 2.6, z1: 4.75, ex: plain(F1), top: plain(F3) }, { z0: 4.75, z1: zF, ex: exOf(O) });
  const ring = (hole) => [{ outer: O, holes: [hole] }];
  let top = Hb;
  if (Bn.lip) {
    const Hs = Hb - (3.25 - t);
    slabs.push({ z0: zF, z1: Hs, ex: exDiff(exOf(O), cells) });
    slabs.push({ z0: Hs, z1: Hb, ex: ring(I), top: ring(rr(-3.25)) });
    slabs.push({ z0: Hb, z1: Hb + 0.7, ex: ring(rr(-3.25)), top: ring(rr(-2.55)) });
    slabs.push({ z0: Hb + 0.7, z1: Hb + 2.5, ex: ring(rr(-2.55)) });
    slabs.push({ z0: Hb + 2.5, z1: Hb + 4.65, ex: ring(rr(-2.55)), top: ring(rr(-0.4)) });
    top = Hb + 4.65;
  } else slabs.push({ z0: zF, z1: Hb, ex: exDiff(exOf(O), cells) });
  const g = stackSolid(slabs);
  const info = { W: Sx, D: Sy, H: top, inW: ib.x1 - ib.x0, inD: ib.y1 - ib.y0, inH: Hb - zF, cw, ch, nx, ny, gx, gy, hu };
  return { parts: [{ g, role: 'box', name: `gridfinity_${gx}x${gy}x${hu}` }], info };
}

/* ===== Gridfinity podložka (otevřený rám) ===== */
function buildPlate(msgs) {
  const P = D.plate, gx = Math.round(clamp(P.gx, 1, 12)), gy = Math.round(clamp(P.gy, 1, 12)), m = clamp(P.m, 0.4, 20);
  const W = gx * GF + 2 * m, Dp = gy * GF + 2 * m, Po = rrect(0, 0, W, Dp, 4 + Math.min(m, 4));
  const cellsC = []; for (let i = 0; i < gx; i++) for (let j = 0; j < gy; j++) cellsC.push([(i - (gx - 1) / 2) * GF, (j - (gy - 1) / 2) * GF]);
  const pk = (s, r) => [{ outer: Po, holes: cellsC.map(([x, y]) => rrect(x, y, s, s, r)) }];
  const g = stackSolid([
    { z0: 0, z1: 0.7, ex: pk(36.1, 1.05), top: pk(37.5, 1.75) },
    { z0: 0.7, z1: 2.5, ex: pk(37.5, 1.75) },
    { z0: 2.5, z1: 4.65, ex: pk(37.5, 1.75), top: pk(41.8, 3.9) },
  ]);
  return { parts: [{ g, role: 'box', name: `gridfinity_podlozka_${gx}x${gy}` }], info: { W, D: Dp, H: 4.65, gx, gy } };
}

/* ===== Ovládání ===== */
function syncUI() {
  document.querySelectorAll('[data-k]').forEach(el => { const v = getK(el.dataset.k); if (el.type === 'checkbox') el.checked = !!v; else el.value = v; });
  document.querySelectorAll('input[type=radio][name*="."]').forEach(r => { r.checked = String(getK(r.name)) === r.value; });
  updateUI();
}
function updateUI() {
  const B = D.box, rect = B.shape === 'rect', lid = !rect && B.lid === 'slide' ? 'cap' : B.lid;
  const show = {
    box: D.type === 'box', bin: D.type === 'bin', plate: D.type === 'plate', rect, cornerR: B.shape !== 'round',
    boxDiv: B.nx > 1 || B.ny > 1, lid: lid !== 'none', lidCap: lid === 'cap', lidText: !!(B.text || '').trim(),
  };
  document.querySelectorAll('[data-show]').forEach(el => { el.hidden = !show[el.dataset.show]; });
  document.querySelectorAll('#types [data-type]').forEach(b => b.setAttribute('aria-checked', String(b.dataset.type === D.type)));
  $('lblW').textContent = B.shape === 'round' ? 'Průměr' : B.shape === 'hex' ? 'Šířka (mezi stěnami)' : 'Šířka';
  $('hHint').textContent = B.inner === '1' ? 'vnitřní, bez víčka' : (lid === 'cap' ? 'bez víčka' : '');
  $('lidHint').textContent = lid === 'cap' ? 'Víčko se nasadí na zúžený okraj krabičky a sedí v rovině s jejími stěnami.' : lid === 'slide' ? 'Víčko se zasune drážkami zepředu. Na přední straně má malou lištu pro prst.' : '';
  if (!rect && B.lid === 'slide') $('lidHint').textContent = 'Posuvné víčko jde jen u obdélníkové krabičky, použije se nasazovací.';
  $('vAsm').hidden = !(D.type === 'box' && lid !== 'none');
  const P = D.plate;
  if (P.dw > 0 && P.dd > 0) {
    const fx = Math.floor((P.dw - 1) / GF), fy = Math.floor((P.dd - 1) / GF);
    $('drawerHint').textContent = fx < 1 || fy < 1 ? 'Do šuplíku se nevejde ani jedno pole.' : `Vejde se ${fx} × ${fy} polí (${fx * GF} × ${fy * GF} mm). Zbyde ${fmt(P.dw - fx * GF, 0)} × ${fmt(P.dd - fy * GF, 0)} mm, okraj podložky může být až ${fmt(Math.max(0.4, Math.min((P.dw - fx * GF) / 2, (P.dd - fy * GF) / 2) - 0.5))} mm.`;
    $('btnFit').disabled = fx < 1 || fy < 1;
  } else { $('drawerHint').textContent = 'Zadejte vnitřní rozměry šuplíku a spočítám, kolik polí se do něj vejde.'; $('btnFit').disabled = true; }
  $('binHint').textContent = `Vnější rozměr ${fmt(D.bin.gx * GF - 0.5, 1)} × ${fmt(D.bin.gy * GF - 0.5, 1)} mm, výška ${D.bin.hu * GH} mm` + (D.bin.lip ? ' + stohovací okraj.' : '.');
}
$('btnFit').onclick = () => {
  const P = D.plate, fx = Math.floor((P.dw - 1) / GF), fy = Math.floor((P.dd - 1) / GF); if (fx < 1 || fy < 1) return;
  P.gx = fx; P.gy = fy; P.m = Math.round(Math.max(0.4, Math.min((P.dw - fx * GF) / 2, (P.dd - fy * GF) / 2) - 0.5) * 10) / 10;
  fitNext = true; syncUI(); saveState(); schedule();
};
function onChange(path) { if (/^(type|box\.(W|D|H|shape|lid|inner)|bin\.(gx|gy|hu)|plate\.(gx|gy))$/.test(path)) fitNext = true; updateUI(); saveState(); if (!/^plate\.d[wd]$/.test(path)) schedule(); }
document.querySelectorAll('[data-k]').forEach(el => {
  const ev = (el.type === 'checkbox' || el.tagName === 'SELECT') ? 'change' : 'input';
  el.addEventListener(ev, () => {
    let v = el.type === 'checkbox' ? el.checked : el.value;
    if (el.type === 'number') { v = parseFloat(v); if (!isFinite(v)) return; }
    setK(el.dataset.k, v); onChange(el.dataset.k);
  });
});
document.querySelectorAll('input[type=radio][name*="."]').forEach(r => r.addEventListener('change', () => { setK(r.name, r.value); onChange(r.name); }));
document.querySelectorAll('#types [data-type]').forEach(b => b.addEventListener('click', () => { D.type = b.dataset.type; asmView = false; onChange('type'); }));
let tmr = 0;
function schedule(now) { clearTimeout(tmr); tmr = setTimeout(() => { $('busy').hidden = false; setTimeout(() => { try { rebuild(); } finally { $('busy').hidden = true; } }, 20); }, now ? 0 : 300); }

/* ===== 3D scéna ===== */
const cv = $('cv');
let renderer = null, scene, camera, bedGroup, meshes = [], fitNext = true, model = null, asmView = false;
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
  const span = Math.max(sx, sy, sz, 20);
  orbit.r = span / (2 * Math.tan(THREE.MathUtils.degToRad(30) / 2)) * Math.max(1.15, 1.6 / camera.aspect);
  if (view === 'front') { orbit.theta = -Math.PI / 2; orbit.phi = Math.PI / 2 - 0.06; }
  else if (view === 'top') { orbit.theta = -Math.PI / 2; orbit.phi = 0.001; }
  else { orbit.theta = -Math.PI / 4 - 0.25; orbit.phi = 0.95; }
  draw();
}
$('vFront').onclick = () => fit('front'); $('vTop').onclick = () => fit('top'); $('vPersp').onclick = () => fit('persp');
$('vAsm').onclick = () => { asmView = !asmView; fitNext = true; if (model) show(model); };
const ptrs = new Map(); let pinch0 = 0, r0 = 0;
cv.addEventListener('contextmenu', e => e.preventDefault());
cv.addEventListener('pointerdown', e => { cv.setPointerCapture(e.pointerId); ptrs.set(e.pointerId, { x: e.clientX, y: e.clientY, b: e.button, shift: e.shiftKey }); if (ptrs.size === 2) { const [a, b] = [...ptrs.values()]; pinch0 = Math.hypot(a.x - b.x, a.y - b.y); r0 = orbit.r; } });
cv.addEventListener('pointermove', e => { const p = ptrs.get(e.pointerId); if (!p) return; const dx = e.clientX - p.x, dy = e.clientY - p.y; p.x = e.clientX; p.y = e.clientY;
  if (ptrs.size === 2) { const [a, b] = [...ptrs.values()]; const d = Math.hypot(a.x - b.x, a.y - b.y); if (pinch0) orbit.r = r0 * pinch0 / d; }
  else if (p.b === 2 || p.shift) { const k = orbit.r * 0.0016, right = new THREE.Vector3(), up = new THREE.Vector3(); camera.matrixWorld.extractBasis(right, up, new THREE.Vector3()); orbit.target.addScaledVector(right, -dx * k).addScaledVector(up, dy * k); }
  else { orbit.theta -= dx * 0.008; orbit.phi = Math.min(Math.PI - 0.05, Math.max(0.001, orbit.phi - dy * 0.008)); } draw(); });
const pup = e => { ptrs.delete(e.pointerId); if (ptrs.size < 2) pinch0 = 0; }; cv.addEventListener('pointerup', pup); cv.addEventListener('pointercancel', pup);
cv.addEventListener('wheel', e => { e.preventDefault(); orbit.r = Math.min(5000, Math.max(5, orbit.r * Math.exp(e.deltaY * 0.0012))); draw(); }, { passive: false });

/* rozmístění dílů: k tisku vedle sebe, nebo sestavené */
function layout(m) {
  const out = [];
  const box = m.parts.find(p => p.role === 'box'), lid = m.parts.find(p => p.role === 'lid');
  if (lid && asmView) {
    out.push({ g: box.g.clone(), role: 'box' });
    out.push({ g: lid.asm(lid.g.clone()), role: 'lid' });
    return out;
  }
  const gap = 8; let x = 0; const items = m.parts.map(p => { const g = p.g.clone(); g.computeBoundingBox(); return { g, role: p.role, b: g.boundingBox }; });
  const total = items.reduce((a, it) => a + (it.b.max.x - it.b.min.x), 0) + gap * (items.length - 1);
  x = -total / 2;
  for (const it of items) { it.g.translate(x - it.b.min.x, -(it.b.min.y + it.b.max.y) / 2, -it.b.min.z); x += it.b.max.x - it.b.min.x + gap; out.push({ g: it.g, role: it.role }); }
  return out;
}
function show(m) {
  for (const mm of meshes) { scene && scene.remove(mm); mm.geometry.dispose(); mm.material.dispose(); }
  meshes = [];
  const list = layout(m), bb = new THREE.Box3();
  for (const it of list) { it.g.computeBoundingBox(); bb.union(it.g.boundingBox); }
  m.bbox = bb;
  if (renderer) for (const it of list) {
    it.g.computeVertexNormals();
    const mesh = new THREE.Mesh(it.g, new THREE.MeshStandardMaterial({ color: new THREE.Color(it.role === 'lid' ? COL.lid : COL.box), roughness: 0.6, metalness: 0.03, flatShading: true }));
    scene.add(mesh); meshes.push(mesh);
  } else list.forEach(it => it.g.dispose());
  $('vAsm').setAttribute('aria-pressed', String(asmView));
  $('lgd').hidden = m.parts.length < 2;
  if (fitNext) { fit('persp'); fitNext = false; } else draw();
}
function showMsgs(list) { const box = $('msgs'); box.textContent = ''; for (const m of list) { const d = document.createElement('div'); d.className = 'msg ' + m.lvl; d.textContent = m.msg; box.append(d); } }

/* ===== Výpočet ===== */
function rebuild() {
  const msgs = []; let m = null;
  try { m = D.type === 'bin' ? buildBin(msgs) : D.type === 'plate' ? buildPlate(msgs) : buildBox(msgs); }
  catch (e) { console.error(e); msgs.push({ lvl: 'bad', msg: 'Model se nepodařilo spočítat. Zkuste upravit rozměry.' }); m = null; }
  if (model) model.parts.forEach(p => p.g.dispose());
  model = m; $('btnSave').disabled = !m;
  if (!m) { showMsgs(msgs); $('dims').textContent = '–'; $('stats').textContent = ''; for (const mm of meshes) scene && scene.remove(mm); meshes = []; draw(); return; }
  // tisková plocha
  for (const p of m.parts) {
    p.g.computeBoundingBox(); const b = p.g.boundingBox, sx = b.max.x - b.min.x, sy = b.max.y - b.min.y, sz = b.max.z - b.min.z;
    if (sx > D.bedX || sy > D.bedY || sz > D.bedZ) msgs.push({ lvl: 'warn', msg: `${p.role === 'lid' ? 'Víčko' : 'Model'} (${fmt(sx, 0)} × ${fmt(sy, 0)} × ${fmt(sz, 0)} mm) se nevejde na tiskovou plochu ${D.bedX} × ${D.bedY} × ${D.bedZ} mm.` + (D.type === 'plate' ? ' Rozdělte podložku na menší díly.' : '') });
  }
  showMsgs(msgs); show(m); showStats(m);
}
function showStats(m) {
  const i = m.info, box = $('stats'); box.textContent = ''; let grams = 0, tris = 0;
  for (const p of m.parts) { const st = meshStats(p.g.attributes.position.array); tris += st.tris; grams += filamentEstimate(st, { wall: 1.2, infill: 15, density: 1.24, diameter: 1.75, pricePerKg: 500 }).grams; }
  const hrs = grams / 11 + 0.2;
  $('dims').innerHTML = `<b>${fmt(i.W)}</b> × <b>${fmt(i.D)}</b> × <b>${fmt(i.H)}</b> mm`;
  const tiles = [['Vnější rozměr', `${fmt(i.W, 0)} × ${fmt(i.D, 0)} × ${fmt(i.H, 0)} mm`]];
  if (i.inW) {
    tiles.push(['Vnitřní prostor', `${fmt(i.inW, 0)} × ${fmt(i.inD, 0)} × ${fmt(i.inH, 0)} mm`]);
    if (i.nx * i.ny > 1) tiles.push(['Přihrádka', `${fmt(i.cw, 0)} × ${fmt(i.ch, 0)} mm`]);
    else if (D.type === 'box') tiles.push(['Objem', `${fmt(i.inW * i.inD * i.inH / 1000 * (D.box.shape === 'round' ? Math.PI / 4 : D.box.shape === 'hex' ? 0.866 : 1), 0)} ml`]);
  }
  tiles.push(['Materiál', `${fmt(grams, 0)} g PLA`], ['Tisk zhruba', hrs < 1 ? `${fmt(hrs * 60, 0)} min` : `${fmt(hrs, 1)} h`]);
  for (const [a, b] of tiles) { const d = document.createElement('div'); d.className = 'stat'; const s1 = document.createElement('span'); s1.textContent = a; const s2 = document.createElement('b'); s2.textContent = b; d.append(s1, s2); box.append(d); }
  const parts = m.parts.length;
  $('btnSave').textContent = parts > 1 ? 'Stáhnout STL (krabička a víčko)' : 'Stáhnout STL';
}

/* ===== Stažení ===== */
const inViewer = !!(window.claude && typeof window.claude.use === 'function');
let dlCap = null;
if (inViewer) window.claude.use('downloads').then(d => { dlCap = d; updateNote(); }).catch(() => updateNote());
function updateNote() { $('saveNote').textContent = inViewer ? (dlCap ? 'Tady se STL stáhne zabalené v ZIP souboru.' : 'Stahování je v tomto zobrazení nedostupné.') : 'Každý díl je samostatný soubor STL. Otevřete ho ve sliceru, jednotky jsou milimetry.'; }
function stl(geoms) { const u = stlBinary(geoms), head = 'Created by Julius Andy Antos | Krabicky a organizery | mm'; for (let i = 0; i < 80; i++) u[i] = i < head.length ? head.charCodeAt(i) : 32; return u; }
async function saveFiles(files, zipName) {
  if (inViewer) {
    if (!dlCap) return;
    try { await dlCap.save({ filename: zipName, data: makeZip(files) }); $('saveNote').textContent = 'ZIP je uložený. Rozbalte ho a STL otevřete ve sliceru.'; }
    catch (err) { if (err && err.code !== 'declined') $('saveNote').textContent = err.code === 'rate_limited' ? 'Počkejte chvíli a zkuste to znovu.' : 'Soubor se nepodařilo uložit.'; }
    return;
  }
  for (const f of files) {
    const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([f.data], { type: 'model/stl' })); a.download = f.name;
    document.body.append(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 2000); await new Promise(r => setTimeout(r, 300));
  }
}
$('btnSave').onclick = () => {
  if (!model) return;
  const i = model.info, base = D.type === 'box' ? `krabicka_${Math.round(i.W)}x${Math.round(i.D)}x${Math.round(i.H)}` : model.parts[0].name;
  // díly ve stejné poloze jako na tiskové ploše, každý zvlášť
  const files = model.parts.map(p => {
    const g = p.g.clone(); g.computeBoundingBox(); const b = g.boundingBox;
    g.translate(-(b.min.x + b.max.x) / 2, -(b.min.y + b.max.y) / 2, -b.min.z);
    const f = { name: base + (p.role === 'lid' ? '_vicko' : '') + '.stl', data: stl([g]) }; g.dispose(); return f;
  });
  saveFiles(files, base + '.zip');
};

/* ===== Instalace jako aplikace a sbalitelné sekce ===== */
let installEvt = null;
window.addEventListener('beforeinstallprompt', (e) => { e.preventDefault(); installEvt = e; $('btnInstall').hidden = false; });
window.addEventListener('appinstalled', () => { installEvt = null; $('btnInstall').hidden = true; });
$('btnInstall').onclick = async () => { if (!installEvt) return; installEvt.prompt(); try { await installEvt.userChoice; } catch (e) {} installEvt = null; $('btnInstall').hidden = true; };
if (!inViewer && 'serviceWorker' in navigator && (location.protocol === 'https:' || location.hostname === 'localhost')) navigator.serviceWorker.register('sw.js').catch(() => {});
(function () {
  const KEY = 'krabicky-sbaleno';
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
initGL(); syncUI(); updateNote(); schedule(true);

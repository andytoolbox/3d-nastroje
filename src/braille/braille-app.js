/* ===== Braillovo písmo – štítky, přívěsky, pásky. Created by Julius Andy Antoš ===== */
const $ = (id) => document.getElementById(id);
// česká bodová abeceda (body 1–6: levý sloupec shora 1, 2, 3, pravý 4, 5, 6)
const BR = { a: '1', b: '12', c: '14', d: '145', e: '15', f: '124', g: '1245', h: '125', i: '24', j: '245', k: '13', l: '123', m: '134', n: '1345', o: '135', p: '1234', q: '12345', r: '1235', s: '234', t: '2345',
  u: '136', v: '1236', w: '12356', x: '1346', y: '13456', z: '1356', á: '16', č: '146', ď: '1456', é: '345', ě: '126', í: '34', ň: '1246', ó: '246', ř: '2456', š: '156', ť: '1256', ú: '346', ů: '23456', ý: '12346', ž: '2346',
  '.': '3', ',': '2', '?': '26', '!': '235', '-': '36', ':': '25', ';': '23' };
const DIG = { 1: 'a', 2: 'b', 3: 'c', 4: 'd', 5: 'e', 6: 'f', 7: 'g', 8: 'h', 9: 'i', 0: 'j' };
const NUM = '3456', CAP = '6', CAPS = '56', LOW = '5';
const TEST_TEXT = 'abcdefghij\nklmnopqrst\nuvwxyz\náčďéěíňóř\nšťúůýž\n1234567890';
const KINDS = [['label', 'Štítek', '<rect x="3" y="7" width="28" height="16" rx="2"/><circle cx="10" cy="13" r="1.3" class="f"/><circle cx="10" cy="17" r="1.3" class="f"/><circle cx="14" cy="13" r="1.3" class="f"/><circle cx="20" cy="17" r="1.3" class="f"/><circle cx="24" cy="13" r="1.3" class="f"/>'],
  ['tag', 'Přívěsek', '<path d="M3 15l6-7h22v14H9z"/><circle cx="9" cy="15" r="1.8"/><circle cx="16" cy="13" r="1.3" class="f"/><circle cx="20" cy="17" r="1.3" class="f"/><circle cx="25" cy="13" r="1.3" class="f"/>'],
  ['strip', 'Pásek', '<rect x="2" y="12" width="30" height="7" rx="1.5"/><circle cx="8" cy="15.5" r="1.2" class="f"/><circle cx="13" cy="15.5" r="1.2" class="f"/><circle cx="20" cy="15.5" r="1.2" class="f"/><circle cx="26" cy="15.5" r="1.2" class="f"/>'],
  ['test', 'Zkušební kartička', '<rect x="4" y="4" width="26" height="22" rx="2"/><path d="M8 9h4M15 9h4M22 9h4M8 15h4M15 15h4M22 15h4M8 21h4M15 21h4" stroke-dasharray="1.2 1.6"/>']];
const DOTS = { norm: { dd: 1.6, dh: 0.65, ds: 2.5, cs: 6, ls: 10 }, big: { dd: 1.8, dh: 0.8, ds: 2.7, cs: 6.6, ls: 11 } };
const DEF = { text: 'Kuchyně', caps: true, wrap: 16, kind: 'label', dots: 'norm', dd: 1.6, dh: 0.65, ds: 2.5, cs: 6, ls: 10, pt: 2, mg: 4, cut: true, mount: 'none', vis: 'engrave', vs: 6, orient: 'stand', bedX: 220, bedY: 220, bedZ: 250 };
const STORE = 'braille-v1';
const D = Object.assign({}, DEF);
try { const s = JSON.parse(localStorage.getItem(STORE) || '{}'); for (const k in DEF) if (k in s && typeof s[k] === typeof DEF[k]) D[k] = s[k]; } catch (e) {}
const saveState = () => { try { localStorage.setItem(STORE, JSON.stringify(D)); } catch (e) {} };
const fmt = (v, d = 1) => (+v).toLocaleString('cs-CZ', { maximumFractionDigits: d, minimumFractionDigits: d });
const fmtP = (v) => (+v).toLocaleString('cs-CZ', { maximumFractionDigits: 2 });
const css = (v) => getComputedStyle(document.documentElement).getPropertyValue(v).trim();
const clamp = (v, a, b) => Math.min(b, Math.max(a, +v || 0));

/* ===== Převod textu do Braillova písma ===== */
function toBraille(text, caps) {
  const lines = [], bad = new Set();
  for (const raw of String(text).normalize('NFC').replace(/\r/g, '').split('\n')) {
    const out = [], ch = [...raw.replace(/\s+$/, '')]; let num = false;
    for (let i = 0; i < ch.length; i++) {
      const c = ch[i], lc = c.toLocaleLowerCase('cs'), up = c !== lc;
      if (/\s/.test(c)) { out.push(''); num = false; continue; }
      if (/[0-9]/.test(c)) { if (!num) { out.push(NUM); num = true; } out.push(BR[DIG[c]]); continue; }
      // desetinná čárka nebo tečka uvnitř čísla číselný režim neukončí
      if (num && (c === ',' || c === '.') && /[0-9]/.test(ch[i + 1] || '')) { out.push(BR[c]); continue; }
      if (!BR[lc]) { bad.add(c); num = false; continue; }
      if (num && /[a-j]/.test(lc) && !up) out.push(LOW);
      num = false;
      if (up && caps) {
        // celé slovo velkými písmeny: jeden předznak pro celé slovo
        let j = i; while (j < ch.length && /\p{L}/u.test(ch[j])) j++;
        const word = ch.slice(i, j), allUp = word.length > 1 && word.every(x => x !== x.toLocaleLowerCase('cs'));
        const prevUp = i > 0 && /\p{L}/u.test(ch[i - 1]) && ch[i - 1] !== ch[i - 1].toLocaleLowerCase('cs');
        if (allUp) { if (!prevUp) out.push(CAPS); } else out.push(CAP);
      }
      out.push(BR[lc]);
    }
    lines.push(out);
  }
  while (lines.length > 1 && !lines[lines.length - 1].length) lines.pop();
  return { lines, bad: [...bad] };
}
// zalomení dlouhých řádků po slovech (prázdná buňka = mezera)
function wrapLines(lines, max) {
  if (!max) return lines; const out = [];
  for (const l of lines) {
    const words = []; let w = []; for (const c of l) { if (c === '') { if (w.length) words.push(w); w = []; } else w.push(c); } if (w.length) words.push(w);
    let cur = []; for (const wd of words) { if (cur.length && cur.length + 1 + wd.length > max) { out.push(cur); cur = []; } cur = cur.length ? cur.concat([''], wd) : wd.slice(); }
    out.push(cur);
  }
  return out;
}
const uni = (d) => String.fromCharCode(0x2800 + [...d].reduce((a, k) => a | (1 << (+k - 1)), 0));

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
const U = (list) => T(MF.Manifold.union(list.filter(Boolean)));
const sub = (a, b) => T(a.subtract(b));
const rrect = (x0, y0, x1, y1, r) => { const s = T(T(MF.CrossSection.square([x1 - x0, y1 - y0])).translate([x0, y0])); return r > 0.05 ? T(T(s.offset(-r, 'Round')).offset(r, 'Round')) : s; };
let FONT = null;
function textCS(txt, h) {
  if (!FONT) { const s = atob(BR_FONTS.sans), u = new Uint8Array(s.length); for (let i = 0; i < s.length; i++) u[i] = s.charCodeAt(i); FONT = opentype.parse(u.buffer); }
  const L = layoutText(FONT, txt, { size: h, lineH: 1.25, spacing: 0, align: 'center', mirror: false, slant: 0 });
  return T(T(new MF.CrossSection(exToPaths(unionEx(L.paths)).map(p => p.map(q => [q.X / SC, q.Y / SC])), 'NonZero')).simplify(0.002));
}

/* ===== Stavba ===== */
function dims() { return D.dots === 'custom' ? { dd: clamp(D.dd, 1, 2.5), dh: clamp(D.dh, 0.3, 1.2), ds: clamp(D.ds, 2, 3.5), cs: clamp(D.cs, 5, 8), ls: clamp(D.ls, 8, 14) } : DOTS[D.dots] || DOTS.norm; }
function build(msgs) {
  const kind = D.kind, txt = kind === 'test' ? TEST_TEXT : String(D.text || ''), B = toBraille(txt, kind === 'test' ? false : D.caps), P = dims();
  if (B.bad.length) msgs.push({ lvl: 'warn', msg: `Tyto znaky Braillovo písmo na štítku nezobrazí: ${B.bad.join(' ')}` });
  const lines = wrapLines(B.lines, kind === 'test' ? 0 : Math.round(clamp(D.wrap, 0, 60))).filter((l, i, a) => l.length || i < a.length - 1), nCells = Math.max(0, ...lines.map(l => l.length));
  if (!nCells) { msgs.push({ lvl: 'info', msg: 'Napište text, který se má převést do Braillova písma.' }); return null; }
  const strip = kind === 'strip', t = strip ? Math.min(clamp(D.pt, 0.8, 6), 1.2) : clamp(D.pt, 0.8, 6), mg = strip ? 2 : Math.max(clamp(D.mg, 2, 20), 2), r = P.dd / 2;
  // poloha teček: levý horní bod prvního znaku v (0, 0)
  const pts = [];
  lines.forEach((cells, li) => cells.forEach((d, ci) => { for (const k of d) { const n = +k - 1; pts.push([ci * P.cs + (n >= 3 ? P.ds : 0), -li * P.ls - (n % 3) * P.ds]); } }));
  const bw = (nCells - 1) * P.cs + P.ds, bh = (lines.length - 1) * P.ls + 2 * P.ds;
  let x0 = -mg - r, x1 = bw + mg + r, y1 = mg + r, y0 = -bh - mg - r;
  // text pro vidící nad Braillem
  const visTxt = kind === 'test' ? 'Zkušební kartička' : txt.trim();
  const vis = !strip && D.vis !== 'none' && visTxt, vs = clamp(D.vs, 3, 20);
  let visCS = null;
  const wrapTxt = (str, max) => !max ? str : str.split('\n').map(l => { const out = []; let cur = ''; for (const w of l.split(/\s+/)) { if (cur && (cur + ' ' + w).length > max) { out.push(cur); cur = w; } else cur = cur ? cur + ' ' + w : w; } out.push(cur); return out.join('\n'); }).join('\n');
  if (vis) { visCS = textCS(wrapTxt(visTxt, kind === 'test' ? 0 : Math.round(clamp(D.wrap, 0, 60)) * 1.4 | 0).split('\n').slice(0, 4).join('\n'), kind === 'test' ? 4 : vs); const b = visCS.bounds(), vh = b.max[1] - b.min[1], vw = b.max[0] - b.min[0];
    visCS = T(visCS.translate([(bw) / 2 - (b.min[0] + b.max[0]) / 2, y1 + 4 + vh / 2 - (b.min[1] + b.max[1]) / 2 - r]));
    y1 = mg + 4 + vh + Math.max(3, mg * 0.75); if (vw + 2 * mg > x1 - x0) { const extra = (vw + 2 * mg - (x1 - x0)) / 2; x0 -= extra; x1 += extra; } }
  let ex0 = x0, ex1 = x1;
  if (kind === 'tag') ex0 -= 9;
  if (kind === 'label' && D.mount === 'holes') { ex0 -= 8; ex1 += 8; }
  let plate = rrect(ex0, y0, ex1, y1, strip ? 1 : 2);
  // seříznutý pravý horní roh: hmatem pozná, kde je začátek a kde vršek
  if (D.cut && !strip) { const c = 5; plate = T(plate.subtract(T(new MF.CrossSection([[[ex1 - c, y1 + 1], [ex1 + 1, y1 + 1], [ex1 + 1, y1 - c]]], 'NonZero')))); }
  const holes = [];
  if (kind === 'tag') { holes.push(T(T(MF.CrossSection.circle(2.4, 40)).translate([ex0 + 4.5, (y0 + y1) / 2]))); }
  let m = ext(plate, 0, t);
  if (kind === 'label' && D.mount === 'holes') for (const x of [ex0 + 4, ex1 - 4]) { const y = (y0 + y1) / 2; m = sub(m, U([T(T(MF.Manifold.cylinder(t + 2, 1.7, 1.7, 32)).translate([x, y, -1])), t > 1.6 ? T(T(MF.Manifold.cylinder(1.6, 1.7, 3.3, 32)).translate([x, y, t - 1.6 + 0.001])) : null])); }
  if (holes.length) m = sub(m, ext(T(MF.CrossSection.union(holes)), -1, t + 1));
  if (vis && visCS) m = D.vis === 'engrave' ? sub(m, ext(visCS, t - Math.min(0.6, t * 0.4), t + 1)) : U([m, ext(visCS, t - 0.2, t + 0.8)]);
  // tečky jako kulové vrchlíky
  const h = P.dh, Rs = (r * r + h * h) / (2 * h), sph = T(MF.Manifold.sphere(Rs, 48)), cap = T(T(sph.translate([0, 0, h - Rs])).intersect(T(T(MF.Manifold.cube([2 * Rs + 1, 2 * Rs + 1, h + 0.3])).translate([-Rs - 0.5, -Rs - 0.5, -0.25]))));
  const caps = pts.map(([x, y]) => T(cap.translate([x, y, t])));
  m = U([m, T(MF.Manifold.compose(caps))]);
  const W = ex1 - ex0, H = y1 - y0;
  if (D.orient === 'stand') { m = T(T(m.rotate([90, 0, 0])).translate([0, 0, 0])); }
  const bb = m.boundingBox(); m = T(m.translate([-(bb.min[0] + bb.max[0]) / 2, -(bb.min[1] + bb.max[1]) / 2, -bb.min[2]]));
  if (mg < 3 && !strip) msgs.push({ lvl: 'info', msg: 'Okraj kolem bodů je menší než 3 mm. Nevidomí doporučují aspoň 3–4 mm volného místa.' });
  if (D.orient === 'stand' && H > 60) msgs.push({ lvl: 'info', msg: 'Vysoký štítek nastojato potřebuje límec (brim), aby se při tisku nepřevrhl.' });
  if (D.orient === 'flat') msgs.push({ lvl: 'info', msg: 'Naležato se body tisknou ve schodech a čtou se hůř. Pokud můžete, tiskněte nastojato, nebo body jemně zabruste do kulata.' });
  return { m, W, H, t, cells: nCells, lines: lines.length, dots: pts.length, B, P };
}

/* ===== Ovládání ===== */
function syncUI() {
  document.querySelectorAll('[data-k]').forEach(el => { const v = D[el.dataset.k]; if (el.type === 'checkbox') el.checked = !!v; else el.value = v; });
  document.querySelectorAll('input[type=radio][name]').forEach(r => { r.checked = String(D[r.name]) === r.value; });
  updateUI();
}
function updateUI() {
  const show = { custom: D.dots === 'custom', plate: true, notStrip: D.kind !== 'strip', label: D.kind === 'label', vis: D.kind !== 'strip' && D.vis !== 'none' && D.kind !== 'test' };
  document.querySelectorAll('[data-show]').forEach(el => { el.hidden = !show[el.dataset.show]; });
  document.querySelectorAll('#kinds [data-v]').forEach(b => b.setAttribute('aria-checked', String(b.dataset.v === D.kind)));
  document.querySelector('[data-k=text]').disabled = D.kind === 'test';
  const B = toBraille(D.kind === 'test' ? TEST_TEXT : D.text, D.kind === 'test' ? false : D.caps);
  B.lines = wrapLines(B.lines, D.kind === 'test' ? 0 : Math.round(clamp(D.wrap, 0, 60)));
  $('bpre').textContent = B.lines.map(l => l.map(d => d ? uni(d) : '⠀').join('')).join('\n') || '⠀';
  const lab = (d) => d === NUM ? 'číslo' : d === CAP ? 'velké' : d === CAPS ? 'VELKÉ' : d === LOW ? 'malé' : '';
  $('bdots').innerHTML = B.lines.map(l => l.map(d => d ? `<b>${uni(d)}</b>&nbsp;${[...d].join('-')}${lab(d) && l.length ? ' (' + lab(d) + ')' : ''}` : '·').join(' · ')).join('<br>');
  const P = dims(); $('dotSpec').innerHTML = `bod ⌀ <b>${fmtP(P.dd)}</b> × <b>${fmtP(P.dh)}</b> mm · body <b>${fmtP(P.ds)}</b> · znaky <b>${fmtP(P.cs)}</b> · řádky <b>${fmtP(P.ls)}</b> mm`;
  $('kindHint').textContent = { label: 'Štítek na dveře, krabice, zásuvky nebo kořenky.', tag: 'Přívěsek s dírou na kroužek, třeba na klíče nebo tašku.', strip: 'Tenký pásek jen s body, který se nalepí na hrnek, ovladač nebo krabičku.', test: 'Celá česká abeceda a číslice. Pro vyzkoušení čitelnosti s vaší tiskárnou.' }[D.kind];
  $('orientHint').textContent = D.orient === 'stand' ? 'Štítek stojí na delší hraně a body rostou do strany. Čtou se tak výrazně lépe. Přidejte ve sliceru límec (brim).' : 'Naležato je tisk jednodušší, ale body jsou ve schodech a čtou se hůř.';
}
(function () {
  const kb = $('kinds'); for (const [v, n, svg] of KINDS) { const b = document.createElement('button'); b.type = 'button'; b.setAttribute('role', 'radio'); b.dataset.v = v; b.innerHTML = `<svg viewBox="0 0 34 30">${svg}</svg>${n}`; b.onclick = () => { D.kind = v; syncUI(); onChange('kind'); }; kb.append(b); }
})();
function onChange(path) { if (path === 'dots' && D.dots !== 'custom') Object.assign(D, DOTS[D.dots]); if (/^(kind|orient)$/.test(path)) fitNext = true; if (path === 'dots') syncUI(); updateUI(); saveState(); schedule(); }
document.querySelectorAll('[data-k]').forEach(el => el.addEventListener(el.type === 'checkbox' || el.tagName === 'SELECT' ? 'change' : 'input', () => {
  const k = el.dataset.k; let v;
  if (el.type === 'checkbox') v = el.checked; else if (el.tagName === 'SELECT' || el.tagName === 'TEXTAREA' || el.type === 'text') v = el.value; else { v = parseFloat(el.value); if (!isFinite(v)) return; }
  D[k] = v; onChange(k);
}));
document.querySelectorAll('input[type=radio][name]').forEach(r => r.addEventListener('change', () => { D[r.name] = r.value; onChange(r.name); }));
let tmr = 0;
function schedule(now) { clearTimeout(tmr); tmr = setTimeout(() => { if (!MF) return; busy(true, 'Počítám…'); setTimeout(() => { try { rebuild(); } finally { busy(false); } }, 20); }, now ? 0 : 350); }
function busy(on, txt) { $('busy').hidden = !on; if (txt) $('busy').textContent = txt; }

/* ===== 3D scéna ===== */
const cv = $('cv');
let userMoved = false, lastView = 'persp';
let renderer = null, scene, camera, bedGroup, mesh = null, fitNext = true, model = null;
const orbit = { theta: -Math.PI / 2, phi: 1.2, r: 300, target: new THREE.Vector3() };
function initGL() {
  try { renderer = new THREE.WebGLRenderer({ canvas: cv, antialias: true }); } catch (e) { renderer = null; return; }
  renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
  scene = new THREE.Scene(); camera = new THREE.PerspectiveCamera(30, 1, 0.5, 6000); camera.up.set(0, 0, 1);
  scene.add(new THREE.HemisphereLight(0xffffff, 0x6a7579, 0.8));
  const d1 = new THREE.DirectionalLight(0xffffff, 0.7); d1.position.set(-150, -220, 260); scene.add(d1);
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
function resize() { if (!renderer) return; const r = $('viewer').getBoundingClientRect(); if (!r.width) return; renderer.setSize(r.width, r.height, false); camera.aspect = r.width / r.height; camera.updateProjectionMatrix(); if (model && !userMoved) fit(lastView); else draw(); }
let raf = 0;
function draw() { if (!renderer || raf) return; raf = requestAnimationFrame(() => { raf = 0; const t = orbit.target, s = Math.sin(orbit.phi);
  camera.position.set(t.x + orbit.r * s * Math.cos(orbit.theta), t.y + orbit.r * s * Math.sin(orbit.theta), t.z + orbit.r * Math.cos(orbit.phi)); camera.lookAt(t); renderer.render(scene, camera); }); }
function fit(view) {
  if (!model || !renderer) return; lastView = view; const b = model.bbox, sx = b.max.x - b.min.x, sy = b.max.y - b.min.y, sz = b.max.z - b.min.z;
  orbit.target.set(0, 0, sz / 2); const span = Math.max(sx, sy, sz, 20);
  orbit.r = span / (2 * Math.tan(THREE.MathUtils.degToRad(30) / 2)) * Math.max(1.25, 1.7 / camera.aspect);
  const stand = D.orient === 'stand';
  if (view === 'front') { orbit.theta = -Math.PI / 2; orbit.phi = stand ? Math.PI / 2 - 0.04 : 0.001; } else { orbit.theta = -Math.PI / 2 - 0.45; orbit.phi = stand ? 1.2 : 0.8; }
  draw();
}
$('vFront').onclick = () => fit('front'); $('vPersp').onclick = () => fit('persp');
const ptrs = new Map(); let pinch0 = 0, r0 = 0;
cv.addEventListener('contextmenu', e => e.preventDefault());
cv.addEventListener('pointerdown', e => { userMoved = true; cv.setPointerCapture(e.pointerId); ptrs.set(e.pointerId, { x: e.clientX, y: e.clientY, b: e.button, shift: e.shiftKey }); if (ptrs.size === 2) { const [a, b] = [...ptrs.values()]; pinch0 = Math.hypot(a.x - b.x, a.y - b.y); r0 = orbit.r; } });
cv.addEventListener('pointermove', e => { const p = ptrs.get(e.pointerId); if (!p) return; const dx = e.clientX - p.x, dy = e.clientY - p.y; p.x = e.clientX; p.y = e.clientY;
  if (ptrs.size === 2) { const [a, b] = [...ptrs.values()]; const d = Math.hypot(a.x - b.x, a.y - b.y); if (pinch0) orbit.r = r0 * pinch0 / d; }
  else if (p.b === 2 || p.shift) { const k = orbit.r * 0.0016, right = new THREE.Vector3(), up = new THREE.Vector3(); camera.matrixWorld.extractBasis(right, up, new THREE.Vector3()); orbit.target.addScaledVector(right, -dx * k).addScaledVector(up, dy * k); }
  else { orbit.theta -= dx * 0.008; orbit.phi = Math.min(Math.PI - 0.05, Math.max(0.001, orbit.phi - dy * 0.008)); } draw(); });
const pup = e => { ptrs.delete(e.pointerId); if (ptrs.size < 2) pinch0 = 0; }; cv.addEventListener('pointerup', pup); cv.addEventListener('pointercancel', pup);
cv.addEventListener('wheel', e => { userMoved = true; e.preventDefault(); orbit.r = Math.min(6000, Math.max(5, orbit.r * Math.exp(e.deltaY * 0.0012))); draw(); }, { passive: false });
function showMsgs(list) { const bx = $('msgs'); bx.textContent = ''; for (const m of list) { const d = document.createElement('div'); d.className = 'msg ' + m.lvl; d.textContent = m.msg; bx.append(d); } }

/* ===== Výpočet ===== */
function rebuild() {
  const msgs = []; let r = null;
  try { r = build(msgs); } catch (e) { console.error(e); msgs.push({ lvl: 'bad', msg: 'Štítek se nepodařilo spočítat. Zkuste kratší text.' }); r = null; }
  if (mesh) { scene && scene.remove(mesh); mesh.geometry.dispose(); mesh.material.dispose(); mesh = null; }
  if (!r) { model = null; freeAll(); $('btnSave').disabled = true; showMsgs(msgs); $('stats').textContent = ''; $('dims').textContent = '–'; draw(); return; }
  const g = toGeom(r.m), vol = r.m.volume(); freeAll();
  g.computeBoundingBox(); model = { g, bbox: g.boundingBox.clone(), r };
  const b = model.bbox, sx = b.max.x - b.min.x, sy = b.max.y - b.min.y, sz = b.max.z - b.min.z;
  if (sx > D.bedX || sy > D.bedY || sz > D.bedZ) msgs.push({ lvl: 'warn', msg: `Štítek (${fmt(sx, 0)} × ${fmt(sy, 0)} × ${fmt(sz, 0)} mm) se nevejde na tiskovou plochu. Rozdělte text na víc řádků.` });
  showMsgs(msgs);
  if (renderer) { g.computeVertexNormals(); mesh = new THREE.Mesh(g, new THREE.MeshStandardMaterial({ color: new THREE.Color('#0b7a72'), roughness: 0.5, metalness: 0.03, flatShading: false })); scene.add(mesh); }
  $('btnSave').disabled = false;
  $('dims').innerHTML = `<b>${fmt(sx)}</b> × <b>${fmt(sy)}</b> × <b>${fmt(sz)}</b> mm`;
  const grams = vol / 1000 * 1.24, hrs = grams / 8 + 0.15;
  const bx = $('stats'); bx.textContent = '';
  for (const [a, v] of [['Znaků', `${r.cells} × ${r.lines} ${r.lines === 1 ? 'řádek' : r.lines < 5 ? 'řádky' : 'řádků'}`], ['Štítek', `${fmt(r.W, 0)} × ${fmt(r.H, 0)} × ${fmt(r.t, 1)} mm`], ['Materiál', `${fmt(Math.max(0.5, grams), grams < 10 ? 1 : 0)} g`], ['Tisk zhruba', hrs < 1 ? `${fmt(hrs * 60, 0)} min` : `${fmt(hrs, 1)} h`]]) {
    const d = document.createElement('div'); d.className = 'stat'; const s1 = document.createElement('span'); s1.textContent = a; const s2 = document.createElement('b'); s2.textContent = v; d.append(s1, s2); bx.append(d);
  }
  if (fitNext) { fit('persp'); fitNext = false; } else draw();
}

/* ===== Stažení ===== */
const inViewer = !!(window.claude && typeof window.claude.use === 'function');
let dlCap = null;
if (inViewer) window.claude.use('downloads').then(d => { dlCap = d; updateNote(); }).catch(() => updateNote());
function updateNote() { $('saveNote').textContent = inViewer ? (dlCap ? 'Tady se STL stáhne zabalené v ZIP souboru.' : 'Stahování je v tomto zobrazení nedostupné.') : 'Štítek je natočený tak, jak se má tisknout. Jednotky jsou milimetry.'; }
$('btnSave').onclick = async () => {
  if (!model) return;
  const u = stlBinary([model.g]), head = 'Created by Julius Andy Antos | Braillovo pismo | mm'; for (let i = 0; i < 80; i++) u[i] = i < head.length ? head.charCodeAt(i) : 32;
  const base = ('braille_' + (D.kind === 'test' ? 'zkusebni_karticka' : String(D.text).trim().split('\n')[0].slice(0, 24) || 'stitek')).normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^A-Za-z0-9_-]+/g, '_').replace(/_+$/, '');
  const name = base + '.stl';
  if (inViewer) { if (!dlCap) return; try { await dlCap.save({ filename: base + '.zip', data: makeZip([{ name, data: u }]) }); $('saveNote').textContent = 'ZIP je uložený.'; } catch (err) { if (err && err.code !== 'declined') $('saveNote').textContent = 'Soubor se nepodařilo uložit.'; } return; }
  const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([u], { type: 'model/stl' })); a.download = name; document.body.append(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 2000);
};

/* ===== Instalace jako aplikace a sbalitelné sekce ===== */
let installEvt = null;
window.addEventListener('beforeinstallprompt', (e) => { e.preventDefault(); installEvt = e; $('btnInstall').hidden = false; });
window.addEventListener('appinstalled', () => { installEvt = null; $('btnInstall').hidden = true; });
$('btnInstall').onclick = async () => { if (!installEvt) return; installEvt.prompt(); try { await installEvt.userChoice; } catch (e) {} installEvt = null; $('btnInstall').hidden = true; };
if (!inViewer && 'serviceWorker' in navigator && (location.protocol === 'https:' || location.hostname === 'localhost')) navigator.serviceWorker.register('sw.js').catch(() => {});
(function () {
  const KEY = 'braille-sbaleno';
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
initGL(); syncUI(); updateNote();
initMF().then(() => { busy(false); schedule(true); }).catch((e) => { console.error(e); busy(false); showMsgs([{ lvl: 'bad', msg: 'Výpočetní modul se nepodařilo načíst. Zkuste novější prohlížeč.' }]); });

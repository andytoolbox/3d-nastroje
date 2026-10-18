/* ===== Vázy a lampy — aplikace. Created by Julius Andy Antoš ===== */
const $ = (id) => document.getElementById(id);
const DEF = {
  kind: 'vase', H: 150, d0: 70, d1: 110, d2: 95, d3: 65,
  sec: 'wave', n: 8, depth: 10, round: 50,
  twist: 90, twistMode: 'lin', ribs: 0, ribD: 1, rings: 0, ringD: 1.5,
  mode: 'vase', t: 2, f: 2, hole: 8, saucer: true, color: '#0b7a72',
  bedX: 220, bedY: 220, bedZ: 250,
};
const STORE = 'vazy-v1';
const deepMerge = (a, b) => { for (const k in b) { if (b[k] && typeof b[k] === 'object' && !Array.isArray(b[k]) && a[k] && typeof a[k] === 'object') deepMerge(a[k], b[k]); else if (k in a && typeof a[k] === typeof b[k]) a[k] = b[k]; } return a; };
const D = JSON.parse(JSON.stringify(DEF));
try { deepMerge(D, JSON.parse(localStorage.getItem(STORE) || '{}')); } catch (e) {}
const saveState = () => { try { localStorage.setItem(STORE, JSON.stringify(D)); } catch (e) {} };
const getK = (p) => p.split('.').reduce((o, k) => o[k], D);
const setK = (p, v) => { const ks = p.split('.'); let o = D; for (let i = 0; i < ks.length - 1; i++) o = o[ks[i]]; o[ks[ks.length - 1]] = v; };
const fmt = (v, d = 1) => v.toLocaleString('cs-CZ', { maximumFractionDigits: d, minimumFractionDigits: d });
const css = (v) => getComputedStyle(document.documentElement).getPropertyValue(v).trim();
const clamp = (v, a, b) => Math.min(b, Math.max(a, +v || 0));
const TAU = Math.PI * 2;
const PRESETS = [['Válec', [80, 80, 80, 80]], ['Kužel', [60, 73, 87, 100]], ['Baňatá', [70, 110, 95, 65]], ['Tulipán', [60, 90, 105, 95]], ['Přesýpací', [90, 62, 62, 90]], ['Amfora', [62, 105, 70, 82]]];
const COLORS = [['#0b7a72', 'Tyrkysová'], ['#f2efe8', 'Bílá'], ['#2b2b2b', 'Černá'], ['#c9302c', 'Červená'], ['#2f6db5', 'Modrá'], ['#e8b04a', 'Zlatá'], ['#8a5cb8', 'Fialová'], ['#e98fb0', 'Růžová']];

/* ===== Tvar ===== */
function profile(H, d) { // Catmull-Rom přes 4 průměry v 0, 1/3, 2/3 a 1 výšky; vrací poloměr v mm
  const P = d.map(v => v / 2);
  const m = [P[1] - P[0], (P[2] - P[0]) / 2, (P[3] - P[1]) / 2, P[3] - P[2]];
  return (z) => {
    const u = Math.min(0.999999, Math.max(0, z / H)) * 3, i = Math.floor(u), t = u - i;
    const t2 = t * t, t3 = t2 * t;
    return (2 * t3 - 3 * t2 + 1) * P[i] + (t3 - 2 * t2 + t) * m[i] + (-2 * t3 + 3 * t2) * P[i + 1] + (t3 - t2) * m[i + 1];
  };
}
function section() { // vrací f(θ) s maximem 1
  const n = Math.round(clamp(D.n, 3, 24)), dep = clamp(D.depth, 2, 45) / 100;
  if (D.sec === 'poly') {
    const k = 4 + (1 - clamp(D.round, 0, 100) / 100) * 60, a = Math.cos(Math.PI / n);
    const raw = (th) => { let s = 0; for (let i = 0; i < n; i++) { const c = Math.cos(th - (i + 0.5) / n * TAU); if (c > 1e-3) s += Math.exp(-k * a / c); } return -Math.log(s) / k; };
    let mx = 0; for (let i = 0; i < 720; i++) mx = Math.max(mx, raw(i / 720 * TAU));
    return (th) => raw(th) / mx;
  }
  if (D.sec === 'star' || D.sec === 'flower') { // ostré cípy a záhyby vyhladit, jinak se vnitřní stěna kříží
    const M = 4096, T = new Float64Array(M);
    for (let i = 0; i < M; i++) { const th = i / M * TAU;
      if (D.sec === 'star') { const u = ((n * th / TAU) % 1 + 1) % 1; T[i] = 1 - dep * 2 * (1 - Math.abs(2 * u - 1)); }
      else T[i] = 1 - 2 * dep + 2 * dep * Math.pow(Math.abs(Math.cos(n * th / 2)), 0.6); }
    const w = Math.max(1, Math.round(M / n * (D.sec === 'star' ? 0.02 + clamp(D.round, 0, 100) / 100 * 0.2 : 0.08)));
    let A = T;
    for (let pass = 0; pass < 2; pass++) { const B = new Float64Array(M); let acc = 0; for (let i = -w; i <= w; i++) acc += A[(i + M) % M];
      for (let i = 0; i < M; i++) { B[i] = acc / (2 * w + 1); acc += A[(i + w + 1) % M] - A[(i - w + M) % M]; } A = B; }
    let mx = 0; for (let i = 0; i < M; i++) mx = Math.max(mx, A[i]);
    return (th) => { const u = ((th / TAU) % 1 + 1) % 1 * M, i = Math.floor(u), f = u - i; return (A[i % M] * (1 - f) + A[(i + 1) % M] * f) / mx; };
  }
  if (D.sec === 'wave') return (th) => (1 + dep * Math.cos(n * th)) / (1 + dep);
  return () => 1;
}

function buildVase(msgs) {
  const H = clamp(D.H, 20, 400), d = [D.d0, D.d1, D.d2, D.d3].map(v => clamp(v, 10, 400));
  const R = profile(H, d), S = section();
  const ribs = Math.round(clamp(D.ribs, 0, 120)), ribD = clamp(D.ribD, 0.2, 8), rings = Math.round(clamp(D.rings, 0, 60)), ringD = clamp(D.ringD, 0.2, 8);
  const tw = clamp(D.twist, -720, 720) * Math.PI / 180;
  const twist = (z) => D.twistMode === 'wave' ? tw * Math.sin(Math.PI * z / H) : tw * z / H;
  const NT = Math.min(900, Math.max(240, ribs * 8, (D.sec === 'circle' ? 0 : Math.round(clamp(D.n, 3, 24)) * (/star|flower/.test(D.sec) ? 48 : 24)))) & ~1;
  const dz0 = rings ? Math.min(1, H / (rings * 12)) : (Math.abs(tw) > 3 ? 0.8 : 1);
  const NZ = Math.ceil(H / dz0), dz = H / NZ;
  const rAt = (th, z) => {
    const a = th + twist(z);
    let r = R(z) * S(a);
    if (ribs) r -= ribD * (0.5 - 0.5 * Math.cos(ribs * a));
    if (rings) r -= ringD * (0.5 - 0.5 * Math.cos(TAU * rings * z / H));
    return Math.max(2, r);
  };
  // vnější prstence
  const rings2d = [];
  let maxSlope = 0, maxR = 0, minR = Infinity;
  for (let k = 0; k <= NZ; k++) {
    const z = k * dz, ring = new Float32Array(NT * 2);
    for (let j = 0; j < NT; j++) { const th = j / NT * TAU, r = rAt(th, z); ring[2 * j] = r * Math.cos(th); ring[2 * j + 1] = r * Math.sin(th); if (r > maxR) maxR = r; if (r < minR) minR = r; }
    if (k > 0 && k % 2 === 0) { // vodorovný přesah proti vrstvě pod ní (bere v úvahu i zkroucení)
      const pr = rings2d[k - 1], shift = Math.abs(twist(z) - twist(z - dz)) / TAU * NT, win = Math.ceil(shift) + 3;
      for (let j = 0; j < NT; j += 3) {
        const px = ring[2 * j], py = ring[2 * j + 1]; let best = Infinity;
        for (let q = j - win; q <= j + win; q++) {
          const a = ((q % NT) + NT) % NT, b2 = (a + 1) % NT, ax = pr[2 * a], ay = pr[2 * a + 1], bx = pr[2 * b2], by = pr[2 * b2 + 1];
          const ex = bx - ax, ey = by - ay, l2 = ex * ex + ey * ey || 1, u = Math.max(0, Math.min(1, ((px - ax) * ex + (py - ay) * ey) / l2));
          best = Math.min(best, Math.hypot(px - ax - u * ex, py - ay - u * ey));
        }
        if (best / dz > maxSlope) maxSlope = best / dz;
      }
    }
    rings2d.push(ring);
  }
  const ang = Math.atan(maxSlope) * 180 / Math.PI;
  if (ang > 50) msgs.push({ lvl: 'warn', msg: `Stěna je místy skloněná o ${fmt(ang, 0)}° od svislice. Nad 45° se může tisk propadat, zmírněte změny průměru nebo hloubku vln.` });
  const hollow = D.mode === 'wall', floor = D.kind !== 'shade';
  const t = clamp(D.t, 0.8, 8);
  let kf = 0; if (hollow && floor) kf = Math.max(1, Math.ceil(clamp(D.f, 0.8, 10) / dz - 1e-9));
  const holeR = hollow && D.kind === 'pot' ? clamp(D.hole, 0, 60) / 2 : 0;

  // vnitřní prstence: posun o tloušťku stěny po normále obrysu
  let inner = null;
  if (hollow) {
    inner = []; let bad = false;
    for (let k = 0; k <= NZ; k++) {
      if (k < kf) { inner.push(null); continue; }
      const o = rings2d[k], ir = new Float32Array(NT * 2);
      for (let j = 0; j < NT; j++) {
        const jp = (j + 1) % NT, jm = (j + NT - 1) % NT;
        const tx = o[2 * jp] - o[2 * jm], ty = o[2 * jp + 1] - o[2 * jm + 1], l = Math.hypot(tx, ty) || 1;
        ir[2 * j] = o[2 * j] - t * ty / l; ir[2 * j + 1] = o[2 * j + 1] + t * tx / l;
      }
      for (let j = 0; j < NT && !bad; j++) { // obrácené pořadí bodů = stěna je na vzor moc tlustá
        const jp = (j + 1) % NT, ax = o[2 * jp] - o[2 * j], ay = o[2 * jp + 1] - o[2 * j + 1], bx = ir[2 * jp] - ir[2 * j], by = ir[2 * jp + 1] - ir[2 * j + 1];
        if (ax * bx + ay * by < 0 || Math.hypot(ir[2 * j], ir[2 * j + 1]) < 1) bad = true;
      }
      inner.push(ir);
    }
    if (bad) msgs.push({ lvl: 'warn', msg: 'Na tak hluboký nebo hustý vzor je stěna příliš tlustá, vnitřek se místy kříží. Zmenšete tloušťku stěny nebo hloubku vzoru.' });
    if (holeR) { let minIn = Infinity; const ir = inner[kf]; for (let j = 0; j < NT; j++) minIn = Math.min(minIn, Math.hypot(ir[2 * j], ir[2 * j + 1])); if (holeR > minIn - 2) { msgs.push({ lvl: 'warn', msg: 'Odtokový otvor je na dno moc velký, model je bez otvoru.' }); } }
  }
  const useHole = holeR > 0 && hollow && floor && (() => { const ir = inner[kf]; for (let j = 0; j < NT; j++) if (Math.hypot(ir[2 * j], ir[2 * j + 1]) < holeR + 2) return false; return true; })();

  // ===== síť =====
  const V = [], I = [];
  const vtx = (x, y, z) => { V.push(x, y, z); return V.length / 3 - 1; };
  const ringV = (r2, z) => { const s = V.length / 3; for (let j = 0; j < NT; j++) V.push(r2[2 * j], r2[2 * j + 1], z); return s; };
  const circle = (r) => { const c = new Float32Array(NT * 2); for (let j = 0; j < NT; j++) { const th = j / NT * TAU; c[2 * j] = r * Math.cos(th); c[2 * j + 1] = r * Math.sin(th); } return c; };
  const band = (a, b, out) => { // a = spodní prstenec, b = horní; out = normála ven (od osy)
    for (let j = 0; j < NT; j++) { const jn = (j + 1) % NT;
      if (out) I.push(a + j, a + jn, b + jn, a + j, b + jn, b + j); else I.push(a + j, b + jn, a + jn, a + j, b + j, b + jn); }
  };
  const fan = (r2, z, up) => { const c = vtx(0, 0, z), s = ringV(r2, z); for (let j = 0; j < NT; j++) { const jn = (j + 1) % NT; if (up) I.push(c, s + j, s + jn); else I.push(c, s + jn, s + j); } };
  const annulus = (o2, i2, z, up) => { const so = ringV(o2, z), si = ringV(i2, z); for (let j = 0; j < NT; j++) { const jn = (j + 1) % NT;
      if (up) I.push(so + j, so + jn, si + jn, so + j, si + jn, si + j); else I.push(so + j, si + jn, so + jn, so + j, si + j, si + jn); } };
  const outerIdx = rings2d.map((r2, k) => ringV(r2, k * dz));
  for (let k = 0; k < NZ; k++) band(outerIdx[k], outerIdx[k + 1], true);
  if (!hollow) { fan(rings2d[0], 0, false); fan(rings2d[NZ], H, true); }
  else {
    const innerIdx = inner.map((r2, k) => r2 ? ringV(r2, k * dz) : -1);
    for (let k = kf; k < NZ; k++) band(innerIdx[k], innerIdx[k + 1], false);
    annulus(rings2d[NZ], inner[NZ], H, true);                       // horní okraj
    if (!floor) annulus(rings2d[0], inner[0], 0, false);              // stínidlo: spodní okraj
    else if (useHole) {
      const hc = circle(holeR), zf = kf * dz;
      annulus(rings2d[0], hc, 0, false); annulus(inner[kf], hc, zf, true);
      const h0 = ringV(hc, 0), h1 = ringV(hc, zf); band(h0, h1, false);
    } else { fan(rings2d[0], 0, false); fan(inner[kf], kf * dz, true); }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(V, 3)); g.setIndex(I);

  // podmiska
  let saucer = null;
  if (D.kind === 'pot' && D.saucer) {
    let r0 = 0; const b = rings2d[0]; for (let j = 0; j < NT; j++) r0 = Math.max(r0, Math.hypot(b[2 * j], b[2 * j + 1]));
    const Rs = r0 + 6, N = 160;
    saucer = stackSolid([{ z0: 0, z1: 2, ex: exOf(circ(0, 0, Rs, N)) }, { z0: 2, z1: 12, ex: [{ outer: circ(0, 0, Rs, N), holes: [circ(0, 0, Rs - 2, N)] }] }]);
  }

  // statistiky: plocha a obvod prstenců
  let cap = 0, side = 0;
  const area = (r2) => { let a = 0; for (let j = 0; j < NT; j++) { const jn = (j + 1) % NT; a += r2[2 * j] * r2[2 * jn + 1] - r2[2 * jn] * r2[2 * j + 1]; } return a / 2; };
  const perim = (r2) => { let p = 0; for (let j = 0; j < NT; j++) { const jn = (j + 1) % NT; p += Math.hypot(r2[2 * jn] - r2[2 * j], r2[2 * jn + 1] - r2[2 * j + 1]); } return p; };
  for (let k = 0; k < NZ; k++) { const pk = perim(rings2d[k]); side += pk * dz; if (floor) { const zz = k * dz; if (hollow ? k >= kf : zz >= 1.2) cap += (hollow ? area(inner[k]) : area(rings2d[k]) - pk * 0.6) * dz; } }
  return { g, saucer, info: { H, W: maxR * 2, side, cap, NZ, NT, dz, area0: area(rings2d[0]) } };
}

/* ===== Ovládání ===== */
function syncUI() {
  document.querySelectorAll('[data-k]').forEach(el => { const v = getK(el.dataset.k); if (el.type === 'checkbox') el.checked = !!v; else el.value = v; });
  document.querySelectorAll('input[type=radio][name]').forEach(r => { r.checked = String(getK(r.name)) === r.value; });
  updateUI();
}
function updateUI() {
  const show = { secN: D.sec !== 'circle', secDepth: /^(star|wave|flower)$/.test(D.sec), secRound: D.sec === 'poly' || D.sec === 'star', ribs: D.ribs > 0, rings: D.rings > 0, wall: D.mode === 'wall', floor: D.kind !== 'shade', pot: D.kind === 'pot' && D.mode === 'wall' };
  document.querySelectorAll('[data-show]').forEach(el => { el.hidden = !show[el.dataset.show]; });
  document.querySelectorAll('#kinds [data-kind]').forEach(b => b.setAttribute('aria-checked', String(b.dataset.kind === D.kind)));
  $('lblN').textContent = { poly: 'Počet stran', star: 'Počet cípů', wave: 'Počet vln', flower: 'Počet okvětních lístků' }[D.sec] || 'Počet';
  $('modeHint').textContent = D.mode === 'vase'
    ? (D.kind === 'shade' ? 'Stáhnete plný model. Ve sliceru zapněte režim váza a spodní vrstvy nastavte na 0, vznikne stínidlo bez dna.' : 'Stáhnete plný model. Ve sliceru zapněte režim váza (spiral vase), slicer vytiskne jen jednu stěnu a dno.')
    : (D.kind === 'shade' ? 'Dutý model bez dna s nastavenou stěnou, tiskne se normálně.' : 'Dutý model s nastavenou stěnou a dnem, tiskne se normálně.');
  document.querySelectorAll('#presets button').forEach(b => { const p = PRESETS[+b.dataset.i][1]; b.setAttribute('aria-pressed', String(p[0] === D.d0 && p[1] === D.d1 && p[2] === D.d2 && p[3] === D.d3)); });
  document.querySelectorAll('#swatches button').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.c === D.color)));
  drawProfile();
}
function drawProfile() {
  const c = $('prof'), r = c.getBoundingClientRect(); if (!r.width) return;
  const dpr = Math.min(2, devicePixelRatio || 1); c.width = r.width * dpr; c.height = r.height * dpr;
  const x = c.getContext('2d'); x.scale(dpr, dpr);
  const H = clamp(D.H, 20, 400), d = [D.d0, D.d1, D.d2, D.d3].map(v => clamp(v, 10, 400)), R = profile(H, d);
  let mr = 0; for (let i = 0; i <= 60; i++) mr = Math.max(mr, R(i / 60 * H));
  const pad = 10, k = Math.min((r.height - 2 * pad) / H, (r.width / 2 - pad) / mr), cx = r.width / 2, by = r.height - pad;
  x.fillStyle = css('--accent-soft'); x.strokeStyle = css('--accent'); x.lineWidth = 1.5; x.beginPath();
  for (let i = 0; i <= 60; i++) { const z = i / 60 * H; x.lineTo(cx + R(z) * k, by - z * k); }
  for (let i = 60; i >= 0; i--) { const z = i / 60 * H; x.lineTo(cx - R(z) * k, by - z * k); }
  x.closePath(); x.fill(); x.stroke();
  x.fillStyle = css('--accent');
  d.forEach((v, i) => { const z = i / 3 * H; x.beginPath(); x.arc(cx + v / 2 * k, by - z * k, 3, 0, TAU); x.fill(); });
}
(function () {
  const box = $('presets'); PRESETS.forEach(([name], i) => { const b = document.createElement('button'); b.type = 'button'; b.textContent = name; b.dataset.i = i; b.onclick = () => { [D.d0, D.d1, D.d2, D.d3] = PRESETS[i][1]; syncUI(); onChange('d0'); }; box.append(b); });
  const sw = $('swatches'); COLORS.forEach(([c, n]) => { const b = document.createElement('button'); b.type = 'button'; b.style.background = c; b.dataset.c = c; b.title = n; b.setAttribute('aria-label', n); b.onclick = () => { D.color = c; updateUI(); saveState(); if (mesh) { mesh.material.color.set(c); draw(); } }; sw.append(b); });
})();
function onChange(path) { if (/^(H|d\d|kind)$/.test(path)) fitNext = true; updateUI(); updateNote(); saveState(); schedule(); }
document.querySelectorAll('[data-k]').forEach(el => {
  const ev = (el.type === 'checkbox' || el.tagName === 'SELECT') ? 'change' : 'input';
  el.addEventListener(ev, () => {
    let v = el.type === 'checkbox' ? el.checked : el.value;
    if (el.type === 'number') { v = parseFloat(v); if (!isFinite(v)) return; }
    setK(el.dataset.k, v); onChange(el.dataset.k);
  });
});
document.querySelectorAll('input[type=radio][name]').forEach(r => r.addEventListener('change', () => { setK(r.name, r.value); onChange(r.name); }));
document.querySelectorAll('#kinds [data-kind]').forEach(b => b.addEventListener('click', () => {
  D.kind = b.dataset.kind; D.mode = D.kind === 'pot' ? 'wall' : 'vase'; syncUI(); onChange('kind');
}));
let tmr = 0;
function schedule(now) { clearTimeout(tmr); tmr = setTimeout(() => { $('busy').hidden = false; setTimeout(() => { try { rebuild(); } finally { $('busy').hidden = true; } }, 20); }, now ? 0 : 300); }
new ResizeObserver(drawProfile).observe($('prof'));

/* ===== 3D scéna ===== */
const cv = $('cv');
let renderer = null, scene, camera, bedGroup, meshes = [], mesh = null, fitNext = true, model = null;
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
function applyTheme() { if (!renderer) return; scene.background = new THREE.Color(css('--view')); makeBed(); draw(); drawProfile(); }
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
  orbit.r = span / (2 * Math.tan(THREE.MathUtils.degToRad(30) / 2)) * Math.max(1.45, 1.9 / camera.aspect);
  if (view === 'front') { orbit.theta = -Math.PI / 2; orbit.phi = Math.PI / 2 - 0.06; }
  else if (view === 'top') { orbit.theta = -Math.PI / 2; orbit.phi = 0.001; }
  else { orbit.theta = -Math.PI / 2 - 0.5; orbit.phi = 1.15; }
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
function rebuild() {
  const msgs = []; let m = null;
  try { m = buildVase(msgs); } catch (e) { console.error(e); msgs.push({ lvl: 'bad', msg: 'Model se nepodařilo spočítat. Zkuste upravit rozměry.' }); }
  for (const mm of meshes) { scene && scene.remove(mm); mm.geometry.dispose(); mm.material.dispose(); }
  meshes = []; mesh = null;
  if (model) { model.g.dispose(); if (model.saucer) model.saucer.dispose(); }
  model = m; $('btnSave').disabled = !m;
  if (!m) { showMsgs(msgs); $('stats').textContent = ''; $('dims').textContent = '–'; draw(); return; }
  const i = m.info;
  if (i.W > Math.min(D.bedX, D.bedY) || i.H > D.bedZ) msgs.push({ lvl: 'warn', msg: `Model (${fmt(i.W, 0)} × ${fmt(i.W, 0)} × ${fmt(i.H, 0)} mm) se nevejde na tiskovou plochu ${D.bedX} × ${D.bedY} × ${D.bedZ} mm.` });
  showMsgs(msgs);
  const bb = new THREE.Box3();
  if (renderer) {
    m.g.computeVertexNormals();
    mesh = new THREE.Mesh(m.g, new THREE.MeshStandardMaterial({ color: new THREE.Color(D.color), roughness: 0.55, metalness: 0.02, side: THREE.DoubleSide }));
    scene.add(mesh); meshes.push(mesh);
    if (m.saucer) {
      const sg = m.saucer.clone(); sg.computeBoundingBox(); sg.translate(i.W / 2 - sg.boundingBox.min.x + 10, 0, 0); sg.computeVertexNormals();
      const sm = new THREE.Mesh(sg, new THREE.MeshStandardMaterial({ color: new THREE.Color(D.color), roughness: 0.6, metalness: 0.02, flatShading: true })); scene.add(sm); meshes.push(sm);
    }
    meshes.forEach(x => { x.geometry.computeBoundingBox(); bb.union(x.geometry.boundingBox); });
  } else { m.g.computeBoundingBox(); bb.copy(m.g.boundingBox); }
  m.bbox = bb;
  $('dims').innerHTML = `<b>${fmt(i.W)}</b> × <b>${fmt(i.W)}</b> × <b>${fmt(i.H)}</b> mm`;
  showStats(m);
  if (fitNext) { fit('persp'); fitNext = false; } else draw();
}
function showStats(m) {
  const i = m.info, box = $('stats'); box.textContent = '';
  let grams, hrs;
  if (D.mode === 'vase') { grams = (i.side * 0.6 + (D.kind !== 'shade' ? i.area0 * 1.0 : 0)) * 1.24 / 1000; hrs = i.side / 0.2 / 60 / 3600 + 0.15; }
  else { const st = meshStats(m.g.toNonIndexed().attributes.position.array); grams = st.volume * 1.24 / 1000; hrs = grams / 12 + 0.2; }
  if (m.saucer) grams += meshStats(m.saucer.attributes.position.array).volume * 1.24 / 1000;
  const tiles = [['Rozměry', `⌀ ${fmt(i.W, 0)} × ${fmt(i.H, 0)} mm`]];
  if (D.kind !== 'shade') tiles.push(['Objem uvnitř', i.cap >= 1e6 ? `${fmt(i.cap / 1e6, 2)} l` : `${fmt(i.cap / 1000, 0)} ml`]);
  tiles.push(['Materiál', `${fmt(grams, 0)} g`], ['Tisk zhruba', hrs < 1 ? `${fmt(hrs * 60, 0)} min` : `${fmt(hrs, 1)} h`]);
  for (const [a, b] of tiles) { const d = document.createElement('div'); d.className = 'stat'; const s1 = document.createElement('span'); s1.textContent = a; const s2 = document.createElement('b'); s2.textContent = b; d.append(s1, s2); box.append(d); }
  $('btnSave').textContent = m.saucer ? 'Stáhnout STL (květináč a miska)' : 'Stáhnout STL';
}

/* ===== Stažení ===== */
const inViewer = !!(window.claude && typeof window.claude.use === 'function');
let dlCap = null;
if (inViewer) window.claude.use('downloads').then(d => { dlCap = d; updateNote(); }).catch(() => updateNote());
function updateNote() { $('saveNote').textContent = inViewer ? (dlCap ? 'Tady se STL stáhne zabalené v ZIP souboru.' : 'Stahování je v tomto zobrazení nedostupné.') : (D.mode === 'vase' ? 'Ve sliceru zapněte režim váza. Jednotky jsou milimetry.' : 'STL otevřete ve sliceru, jednotky jsou milimetry.'); }
function stl(geoms) { const u = stlBinary(geoms), head = 'Created by Julius Andy Antos | Vazy a lampy | mm'; for (let i = 0; i < 80; i++) u[i] = i < head.length ? head.charCodeAt(i) : 32; return u; }
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
  const base = { vase: 'vaza', pot: 'kvetinac', shade: 'stinidlo' }[D.kind] + '_' + Math.round(model.info.H) + 'mm' + (D.mode === 'vase' ? '_rezim_vaza' : '');
  const files = [{ name: base + '.stl', data: stl([model.g.toNonIndexed()]) }];
  if (model.saucer) files.push({ name: base + '_miska.stl', data: stl([model.saucer]) });
  saveFiles(files, base + '.zip');
};

/* ===== Instalace jako aplikace a sbalitelné sekce ===== */
let installEvt = null;
window.addEventListener('beforeinstallprompt', (e) => { e.preventDefault(); installEvt = e; $('btnInstall').hidden = false; });
window.addEventListener('appinstalled', () => { installEvt = null; $('btnInstall').hidden = true; });
$('btnInstall').onclick = async () => { if (!installEvt) return; installEvt.prompt(); try { await installEvt.userChoice; } catch (e) {} installEvt = null; $('btnInstall').hidden = true; };
if (!inViewer && 'serviceWorker' in navigator && (location.protocol === 'https:' || location.hostname === 'localhost')) navigator.serviceWorker.register('sw.js').catch(() => {});
(function () {
  const KEY = 'vazy-sbaleno';
  let closed; try { closed = JSON.parse(localStorage.getItem(KEY) || 'null'); } catch (e) { closed = null; }
  if (!Array.isArray(closed)) closed = ['Tiskárna', 'Rady', 'Barva náhledu'];
  document.querySelectorAll('aside section.card > h2').forEach(h => {
    const card = h.parentElement, name = h.textContent.replace(/^\d/, '').trim();
    h.tabIndex = 0; h.setAttribute('role', 'button');
    const apply = () => { const c = closed.includes(name); card.classList.toggle('collapsed', c); h.setAttribute('aria-expanded', String(!c)); if (!c) requestAnimationFrame(drawProfile); };
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

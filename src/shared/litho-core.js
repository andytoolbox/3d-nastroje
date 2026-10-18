/* ===== Svítící fotky (litofánie) — výpočty. Created by Julius Andy Antoš ===== */

/* ---------- Fotka -> jas 0..1 v cílovém rozlišení ---------- */
/* adj = {fit:'cover'|'contain', auto:bool, bright:-0.3..0.3, contrast:0.5..2, invert:bool} */
function lumaFromImageData(d, w, h, adj) {
  const L = new Float32Array(w * h);
  for (let i = 0; i < w * h; i++) {
    const a = d[i * 4 + 3] / 255;
    L[i] = ((0.299 * d[i * 4] + 0.587 * d[i * 4 + 1] + 0.114 * d[i * 4 + 2]) * a + 255 * (1 - a)) / 255;
  }
  if (adj.auto) { // vyrovnání jasu: 1 % nejtmavších -> černá, 1 % nejsvětlejších -> bílá
    const hist = new Uint32Array(256); for (const v of L) hist[Math.min(255, v * 255 | 0)]++;
    const n = L.length; let lo = 0, hi = 255, acc = 0;
    for (let i = 0; i < 256; i++) { acc += hist[i]; if (acc >= n * 0.01) { lo = i; break; } }
    acc = 0; for (let i = 255; i >= 0; i--) { acc += hist[i]; if (acc >= n * 0.01) { hi = i; break; } }
    if (hi - lo > 10) { const a = lo / 255, b = hi / 255; for (let i = 0; i < n; i++) L[i] = (L[i] - a) / (b - a); }
  }
  const c = adj.contrast || 1, br = adj.bright || 0;
  for (let i = 0; i < L.length; i++) {
    let v = (L[i] - 0.5) * c + 0.5 + br;
    v = v < 0 ? 0 : v > 1 ? 1 : v;
    L[i] = adj.invert ? 1 - v : v;
  }
  return L;
}
/** Vykreslí fotku do w×h (vyplnit = oříznout, celá = s bílými okraji) a vrátí jas. */
function photoLuma(img, w, h, adj) {
  const c = document.createElement('canvas'); c.width = w; c.height = h; const x = c.getContext('2d');
  x.fillStyle = '#fff'; x.fillRect(0, 0, w, h);
  const iw = img.naturalWidth || img.width, ih = img.naturalHeight || img.height;
  const k = adj.fit === 'contain' ? Math.min(w / iw, h / ih) : Math.max(w / iw, h / ih);
  const dw = iw * k, dh = ih * k;
  x.imageSmoothingQuality = 'high';
  x.drawImage(img, (w - dw) / 2 + (adj.panX || 0) * Math.max(0, dw - w) / 2, (h - dh) / 2 + (adj.panY || 0) * Math.max(0, dh - h) / 2, dw, dh);
  return lumaFromImageData(x.getImageData(0, 0, w, h).data, w, h, adj);
}
const lumaToT = (b, tMin, tMax) => tMax - (tMax - tMin) * b; // tmavé = silné

/* ---------- Pomocné pro sítě ---------- */
function meshAcc(cap) {
  let pos = new Float32Array(cap * 9), tv = new Float32Array(cap * 3), n = 0;
  const grow = () => { const p2 = new Float32Array(pos.length * 2); p2.set(pos); pos = p2; const t2 = new Float32Array(tv.length * 2); t2.set(tv); tv = t2; };
  return {
    tri(a, b, c) { // a = [x,y,z,t]
      if ((n + 1) * 9 > pos.length) grow();
      const o = n * 9, q = n * 3;
      pos[o] = a[0]; pos[o + 1] = a[1]; pos[o + 2] = a[2]; pos[o + 3] = b[0]; pos[o + 4] = b[1]; pos[o + 5] = b[2]; pos[o + 6] = c[0]; pos[o + 7] = c[1]; pos[o + 8] = c[2];
      tv[q] = a[3]; tv[q + 1] = b[3]; tv[q + 2] = c[3]; n++;
    },
    geom() {
      const g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.BufferAttribute(pos.slice(0, n * 9), 3));
      g.userData.tv = tv.slice(0, n * 3);
      return fixWindingT(g);
    },
  };
}
function fixWindingT(g) { // jako fixWinding, jen prohazuje i tloušťky
  const p = g.attributes.position.array, tv = g.userData.tv;
  if (signedVolume(p) < 0) for (let i = 0; i < p.length; i += 9) {
    for (let k = 0; k < 3; k++) { const t = p[i + 3 + k]; p[i + 3 + k] = p[i + 6 + k]; p[i + 6 + k] = t; }
    if (tv) { const j = i / 3; const t = tv[j + 1]; tv[j + 1] = tv[j + 2]; tv[j + 2] = t; }
  }
  return g;
}

/* ---------- Otevřená destička: rovná nebo prohnutá, nastojato ---------- */
/* T = tloušťky W×H (řádek 0 = horní okraj fotky), px = rozteč v mm */
function openLitho(T, W, H, px, curveDeg) {
  const totalW = (W - 1) * px, R = curveDeg > 0 ? totalW / (curveDeg * Math.PI / 180) : 0;
  const P = (x, y, z) => {
    const X = x * px, Z = (H - 1 - y) * px;
    if (!R) return [X - totalW / 2, -z, Z, z];
    const a = (X - totalW / 2) / R, r = R + z;
    return [r * Math.sin(a), R - r * Math.cos(a), Z, z];
  };
  const M = meshAcc((W - 1) * (H - 1) * 2 + (W + H) * 8 + 64);
  const T_ = (x, y) => P(x, y, T[y * W + x]), B = (x, y) => { const p = P(x, y, 0); p[3] = T[y * W + x]; return p; };
  for (let y = 0; y < H - 1; y++) for (let x = 0; x < W - 1; x++) { const a = T_(x, y), b = T_(x + 1, y), c = T_(x + 1, y + 1), d = T_(x, y + 1); M.tri(a, d, c); M.tri(a, c, b); }
  for (let x = 0; x < W - 1; x++) {
    M.tri(T_(x, 0), T_(x + 1, 0), B(x + 1, 0)); M.tri(T_(x, 0), B(x + 1, 0), B(x, 0));
    M.tri(T_(x, H - 1), B(x + 1, H - 1), T_(x + 1, H - 1)); M.tri(T_(x, H - 1), B(x, H - 1), B(x + 1, H - 1));
  }
  for (let y = 0; y < H - 1; y++) {
    M.tri(T_(0, y), B(0, y + 1), T_(0, y + 1)); M.tri(T_(0, y), B(0, y), B(0, y + 1));
    M.tri(T_(W - 1, y), T_(W - 1, y + 1), B(W - 1, y + 1)); M.tri(T_(W - 1, y), B(W - 1, y + 1), B(W - 1, y));
  }
  for (let x = 1; x < W - 2; x++) { const a = B(x, 0), b = B(x + 1, 0), c = B(x + 1, H - 1), d = B(x, H - 1); M.tri(a, b, c); M.tri(a, c, d); }
  const fan = (x0, x1, flip) => {
    const ring = []; for (let y = 0; y < H; y++) ring.push([x0, y]); ring.push([x1, H - 1]); ring.push([x1, 0]);
    const C = P((x0 + x1) / 2, (H - 1) / 2, 0); C[3] = T[0];
    for (let i = 0; i < ring.length; i++) { const p = ring[i], q = ring[(i + 1) % ring.length];
      if (flip) M.tri(C, B(p[0], p[1]), B(q[0], q[1])); else M.tri(C, B(q[0], q[1]), B(p[0], p[1])); }
  };
  fan(0, 1, false); fan(W - 1, W - 2, true);
  return M.geom();
}

/* ---------- Uzavřená stěna kolem křivky (válec, srdce, stínítko) ---------- */
/* curve = {p:[[x,y]], n:[[nx,ny]]} rovnoměrně po obvodu, proti směru hodin; T = R×M (řádek 0 = horní okraj) */
function closedLitho(curve, T, Rr, M, rowH, prof) {
  // prof (nepovinné): s(z) = měřítko průřezu ve výšce z (mm od spodu), ds(z) = jeho derivace, ruled = rovné povrchové přímky (válec, kužel)
  const Hm = (Rr - 1) * rowH;
  const s = prof ? prof.s : () => 1, ds = prof ? prof.ds : () => 0, ruled = !prof || prof.ruled;
  const rad = curve.p.map(q => Math.hypot(q[0], q[1]));
  const O = (m, r) => {
    const z = Hm - r * rowH, k = s(z), t = T[r * M + m], p = curve.p[m], n = curve.n[m];
    const tt = t * Math.sqrt(1 + (ds(z) * rad[m]) ** 2); // tloušťka kolmo ke skloněné stěně
    return [p[0] * k + n[0] * tt, p[1] * k + n[1] * tt, z, t];
  };
  const I = (m, r) => { const z = Hm - r * rowH, k = s(z), p = curve.p[m]; return [p[0] * k, p[1] * k, z, T[r * M + m]]; };
  const A = meshAcc((Rr - 1) * M * (ruled ? 2 : 4) + M * 8);
  for (let r = 0; r < Rr - 1; r++) for (let m = 0; m < M; m++) {
    const m2 = (m + 1) % M; // řádek r je výš než r+1
    const a = O(m, r + 1), b = O(m2, r + 1), c = O(m2, r), d = O(m, r);
    A.tri(a, b, c); A.tri(a, c, d);
    if (!ruled) { const ia = I(m, r + 1), ib = I(m2, r + 1), ic = I(m2, r), id = I(m, r); A.tri(ia, ic, ib); A.tri(ia, id, ic); }
  }
  for (let m = 0; m < M; m++) {
    const m2 = (m + 1) % M;
    const ib = I(m, Rr - 1), ib2 = I(m2, Rr - 1), it = I(m, 0), it2 = I(m2, 0);
    if (ruled) { A.tri(ib, it2, ib2); A.tri(ib, it, it2); }            // vnitřní plocha (pruh přes celou výšku)
    const ot = O(m, 0), ot2 = O(m2, 0); A.tri(ot, it2, it); A.tri(ot, ot2, it2);   // horní lem
    const ob = O(m, Rr - 1), ob2 = O(m2, Rr - 1); A.tri(ob, ib, ib2); A.tri(ob, ib2, ob2); // spodní lem
  }
  return A.geom();
}
/** Boční tvar stínítka: měřítko průřezu podle výšky. Rb = poloměr dole, Rt = nahoře, waist/bow v mm. */
function sideProfile(kind, Rb, Rt, H, waist, bow) {
  const S = Math.PI / H;
  if (kind === 'cone') return { ruled: true, s: z => (Rb + (Rt - Rb) * z / H) / Rb, ds: () => (Rt - Rb) / H / Rb };
  if (kind === 'waist') return { ruled: false, s: z => (Rb + (Rt - Rb) * z / H - waist * Math.sin(S * z)) / Rb, ds: z => ((Rt - Rb) / H - waist * S * Math.cos(S * z)) / Rb };
  if (kind === 'bell') return { ruled: false, s: z => (Rb + (Rt - Rb) * z / H + bow * Math.sin(S * z)) / Rb, ds: z => ((Rt - Rb) / H + bow * S * Math.cos(S * z)) / Rb };
  return { ruled: true, s: () => 1, ds: () => 0 };
}
/* ---------- Tvarovaná destička (srdce, kruh…) naležato podle masky ---------- */
/* inside = (W-1)×(H-1) buněk, T = W×H vrcholů */
function maskLitho(inside, T, W, H, px) {
  const P = (x, y, z) => [x * px, (H - 1 - y) * px, z, T[y * W + x]];
  const top = (x, y) => P(x, y, T[y * W + x]), bot = (x, y) => P(x, y, 0);
  const cw = W - 1, ch = H - 1;
  const inC = (x, y) => x >= 0 && y >= 0 && x < cw && y < ch && inside[y * cw + x];
  let cnt = 0; for (let i = 0; i < inside.length; i++) cnt += inside[i];
  const A = meshAcc(cnt * 4 + 64);
  const wall = (p, q) => { const P1 = top(p[0], p[1]), Q1 = top(q[0], q[1]), P0 = bot(p[0], p[1]), Q0 = bot(q[0], q[1]); A.tri(P1, Q1, Q0); A.tri(P1, Q0, P0); };
  for (let y = 0; y < ch; y++) for (let x = 0; x < cw; x++) {
    if (!inside[y * cw + x]) continue;
    A.tri(top(x, y), top(x + 1, y + 1), top(x + 1, y)); A.tri(top(x, y), top(x, y + 1), top(x + 1, y + 1));
    A.tri(bot(x, y), bot(x + 1, y), bot(x + 1, y + 1)); A.tri(bot(x, y), bot(x + 1, y + 1), bot(x, y + 1));
    if (!inC(x, y - 1)) wall([x, y], [x + 1, y]);
    if (!inC(x + 1, y)) wall([x + 1, y], [x + 1, y + 1]);
    if (!inC(x, y + 1)) wall([x + 1, y + 1], [x, y + 1]);
    if (!inC(x - 1, y)) wall([x, y + 1], [x, y]);
  }
  return A.geom();
}
/** Vzdálenost buněk od okraje masky v buňkách (dvouprůchodová chamfer transformace). */
function maskDistance(inside, w, h) {
  const INF = 1e9, d = new Float32Array(w * h);
  for (let i = 0; i < d.length; i++) d[i] = inside[i] ? INF : 0;
  const s = Math.SQRT2;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const i = y * w + x; if (!d[i]) continue;
    let v = d[i];
    v = Math.min(v, x > 0 ? d[i - 1] + 1 : 1, y > 0 ? d[i - w] + 1 : 1, x > 0 && y > 0 ? d[i - w - 1] + s : s, x < w - 1 && y > 0 ? d[i - w + 1] + s : s);
    d[i] = v; }
  for (let y = h - 1; y >= 0; y--) for (let x = w - 1; x >= 0; x--) { const i = y * w + x; if (!d[i]) continue;
    let v = d[i];
    v = Math.min(v, x < w - 1 ? d[i + 1] + 1 : 1, y < h - 1 ? d[i + w] + 1 : 1, x < w - 1 && y < h - 1 ? d[i + w + 1] + s : s, x > 0 && y < h - 1 ? d[i + w - 1] + s : s);
    d[i] = v; }
  return d;
}

/* ---------- Křivky a obrysy (mm, střed v 0,0) ---------- */
function polyArea(p) { let a = 0; for (let i = 0, j = p.length - 1; i < p.length; j = i++) a += (p[j][0] + p[i][0]) * (p[j][1] - p[i][1]); return -a / 2; }
function resampleClosed(pts, M) {
  if (polyArea(pts) < 0) pts = pts.slice().reverse();
  const L = [0]; for (let i = 1; i <= pts.length; i++) { const a = pts[i - 1], b = pts[i % pts.length]; L.push(L[i - 1] + Math.hypot(b[0] - a[0], b[1] - a[1])); }
  const total = L[pts.length], out = []; let j = 0;
  for (let k = 0; k < M; k++) {
    const s = k / M * total; while (L[j + 1] < s) j++;
    const a = pts[j], b = pts[(j + 1) % pts.length], f = (s - L[j]) / ((L[j + 1] - L[j]) || 1);
    out.push([a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f]);
  }
  const n = out.map((p, i) => { const a = out[(i - 1 + M) % M], b = out[(i + 1) % M]; const tx = b[0] - a[0], ty = b[1] - a[1], l = Math.hypot(tx, ty) || 1; return [ty / l, -tx / l]; });
  return { p: out, n, length: total };
}
function heartOutline(width) { // klasické srdce, šířka v mm
  const pts = []; for (let i = 0; i < 720; i++) { const t = i / 720 * Math.PI * 2; pts.push([16 * Math.sin(t) ** 3, 13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t)]); }
  const k = width / 32; return pts.map(p => [p[0] * k, p[1] * k]);
}
/** Zaoblí ostré rohy a „zuby“ obrysu (aby se stěna nekřížila sama se sebou). */
function roundOutline(pts, rConcave, rConvex) {
  let ex = unionEx([pts.map(p => ({ X: Math.round(p[0] * SC), Y: Math.round(p[1] * SC) }))]);
  if (rConcave > 0) ex = offsetEx(offsetEx(ex, rConcave), -rConcave);
  if (rConvex > 0) ex = offsetEx(offsetEx(ex, -rConvex), rConvex);
  ex.sort((a, b) => Math.abs(ClipperLib.Clipper.Area(b.outer)) - Math.abs(ClipperLib.Clipper.Area(a.outer)));
  return ex[0].outer.map(p => [p.X / SC, p.Y / SC]);
}
function circleOutline(r, n = 360) { const p = []; for (let i = 0; i < n; i++) { const a = i / n * Math.PI * 2; p.push([r * Math.cos(a), r * Math.sin(a)]); } return p; }
function ellipseOutline(rx, ry, n = 360) { const p = []; for (let i = 0; i < n; i++) { const a = i / n * Math.PI * 2; p.push([rx * Math.cos(a), ry * Math.sin(a)]); } return p; }
function starOutline(r, n = 5) { const p = []; for (let i = 0; i < n * 2; i++) { const a = Math.PI / 2 + i * Math.PI / n, rr = i % 2 ? r * 0.5 : r; p.push([rr * Math.cos(a), rr * Math.sin(a)]); } return p; }
/** Vlnitý (prohnutý) obrys stínítka: lalokům odpovídají fotky, švy jsou v prohlubních. */
function waveOutline(R, depth, lobes, n = 1440) {
  const p = []; const a0 = Math.PI / lobes; // začátek v prohlubni
  for (let i = 0; i < n; i++) { const a = a0 + i / n * Math.PI * 2; const r = R - depth + depth * (0.5 + 0.5 * Math.cos(lobes * (a - a0) + Math.PI)); p.push([r * Math.cos(a), r * Math.sin(a)]); }
  return p;
}
/** Nejmenší poloměr zakřivení vydutých (vnitřních) částí křivky – stěna nesmí být silnější. */
function minConcaveRadius(c) {
  let m = Infinity; const M = c.p.length;
  const k = Math.max(1, Math.round(1.5 / (c.length / M))); // body cca 1,5 mm od sebe (méně šumu)
  for (let i = 0; i < M; i++) {
    const a = c.p[(i - k + M) % M], b = c.p[i], d = c.p[(i + k) % M];
    const cross = (b[0] - a[0]) * (d[1] - b[1]) - (b[1] - a[1]) * (d[0] - b[0]);
    if (cross >= 0) continue; // vypouklé místo
    const la = Math.hypot(b[0] - a[0], b[1] - a[1]), lb = Math.hypot(d[0] - b[0], d[1] - b[1]), lc = Math.hypot(d[0] - a[0], d[1] - a[1]);
    const r = la * lb * lc / (2 * Math.abs(cross) || 1e-9); if (r < m) m = r;
  }
  return m;
}

/* ---------- Kříž pro objímku žárovky ---------- */
function spiderCross(curve, holeD, ringW, spokes, spokeW, z0, z1, startAngle) {
  const rIn = holeD / 2, rOut = rIn + ringW;
  const parts = [prismSolid([{ outer: circlePath(0, 0, rOut, 96), holes: [circlePath(0, 0, rIn, 96).reverse()] }], z0, z1)];
  for (let k = 0; k < spokes; k++) {
    const a = startAngle + k * Math.PI * 2 / spokes, ca = Math.cos(a), sa = Math.sin(a);
    let best = null; // vnitřní stěna ve směru ramene: bod křivky s nejbližším úhlem
    for (const p of curve.p) { const ap = Math.atan2(p[1], p[0]); const da = Math.abs(Math.atan2(Math.sin(ap - a), Math.cos(ap - a))); if (!best || da < best.da) best = { da, r: Math.hypot(p[0], p[1]) }; }
    const r1 = (rIn + rOut) / 2, r2 = best.r + 1.2; // rameno zasahuje do kroužku i do stěny (slicer díly spojí)
    const hw = spokeW / 2, px = -sa * hw, py = ca * hw;
    const rect = [[ca * r1 + px, sa * r1 + py], [ca * r1 - px, sa * r1 - py], [ca * r2 - px, sa * r2 - py], [ca * r2 + px, sa * r2 + py]].map(q => ({ X: Math.round(q[0] * SC), Y: Math.round(q[1] * SC) }));
    parts.push(prismSolid(unionEx([rect]), z0, z1));
  }
  return mergeGeoms(parts);
}
/** Dno lucerny: vyplněný vnitřní obrys s přesahem do stěny. */
function lanternFloor(curve, t, overlap) {
  const pts = curve.p.map((p, i) => ({ X: Math.round((p[0] + curve.n[i][0] * overlap) * SC), Y: Math.round((p[1] + curve.n[i][1] * overlap) * SC) }));
  return prismSolid(unionEx([pts]), 0, t);
}

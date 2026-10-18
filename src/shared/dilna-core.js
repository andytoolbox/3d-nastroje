/* ===== 3D dílna — Created by Julius Andy Antoš ===== */

/* ---------- Obrázek -> maska ---------- */
/* img = {width, height, data: RGBA}; o = {mode:'dark'|'light'|'alpha', threshold (0-255 | null = auto), blur} */
function toGray(img) {
  const n = img.width * img.height, g = new Float32Array(n), a = new Float32Array(n), d = img.data;
  for (let i = 0; i < n; i++) {
    const al = d[i * 4 + 3] / 255;
    const lum = 0.299 * d[i * 4] + 0.587 * d[i * 4 + 1] + 0.114 * d[i * 4 + 2];
    g[i] = lum * al + 255 * (1 - al); // průhledné = bílé pozadí
    a[i] = al * 255;
  }
  return { g, a };
}
function boxBlur(src, w, h, r) {
  if (r < 1) return src;
  const tmp = new Float32Array(src.length), out = new Float32Array(src.length), k = 2 * r + 1;
  for (let y = 0; y < h; y++) { let s = 0; for (let x = -r; x <= r; x++) s += src[y * w + Math.min(w - 1, Math.max(0, x))];
    for (let x = 0; x < w; x++) { tmp[y * w + x] = s / k; s += src[y * w + Math.min(w - 1, x + r + 1)] - src[y * w + Math.max(0, x - r)]; } }
  for (let x = 0; x < w; x++) { let s = 0; for (let y = -r; y <= r; y++) s += tmp[Math.min(h - 1, Math.max(0, y)) * w + x];
    for (let y = 0; y < h; y++) { out[y * w + x] = s / k; s += tmp[Math.min(h - 1, y + r + 1) * w + x] - tmp[Math.max(0, y - r) * w + x]; } }
  return out;
}
function otsu(vals) {
  const hist = new Float64Array(256); for (const v of vals) hist[Math.max(0, Math.min(255, v | 0))]++;
  const total = vals.length; let sum = 0; for (let i = 0; i < 256; i++) sum += i * hist[i];
  let sB = 0, wB = 0, best = 0, thr = 128;
  for (let t = 0; t < 256; t++) { wB += hist[t]; if (!wB) continue; const wF = total - wB; if (!wF) break;
    sB += t * hist[t]; const mB = sB / wB, mF = (sum - sB) / wF, between = wB * wF * (mB - mF) ** 2;
    if (between > best) { best = between; thr = t; } }
  return thr;
}
function makeMask(img, o) {
  const { g, a } = toGray(img); const w = img.width, h = img.height;
  const src = o.mode === 'alpha' ? a : g;
  const v = boxBlur(src, w, h, o.blur | 0);
  const thr = o.threshold == null ? otsu(v) : o.threshold;
  const m = new Uint8Array(w * h);
  for (let i = 0; i < m.length; i++) m[i] = o.mode === 'dark' ? (v[i] <= thr ? 1 : 0) : (v[i] > thr ? 1 : 0);
  return { mask: m, w, h, thr };
}

/* ---------- Maska -> obrysy (sledování hran pixelů) ---------- */
function traceMask(mask, w, h) {
  const at = (x, y) => (x >= 0 && y >= 0 && x < w && y < h) ? mask[y * w + x] : 0;
  const W1 = w + 1; const ex = [], ey = [], edx = [], edy = [];
  const out = new Map();
  const add = (x0, y0, x1, y1) => { const i = ex.length; ex.push(x0); ey.push(y0); edx.push(x1 - x0); edy.push(y1 - y0); const k = y0 * W1 + x0; const l = out.get(k); if (l) l.push(i); else out.set(k, [i]); };
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    if (!mask[y * w + x]) continue;
    if (!at(x, y - 1)) add(x, y, x + 1, y);
    if (!at(x + 1, y)) add(x + 1, y, x + 1, y + 1);
    if (!at(x, y + 1)) add(x + 1, y + 1, x, y + 1);
    if (!at(x - 1, y)) add(x, y + 1, x, y);
  }
  const used = new Uint8Array(ex.length); const loops = [];
  for (let s = 0; s < ex.length; s++) {
    if (used[s]) continue;
    const pts = []; let e = s;
    while (!used[e]) {
      used[e] = 1; pts.push([ex[e], ey[e]]);
      const nx = ex[e] + edx[e], ny = ey[e] + edy[e];
      const cand = (out.get(ny * W1 + nx) || []).filter(i => !used[i]);
      if (!cand.length) break;
      const rx = -edy[e], ry = edx[e]; // odbočka doprava (osa y dolů)
      e = cand.find(i => edx[i] === rx && edy[i] === ry) ?? cand[0];
    }
    if (pts.length > 2) loops.push(pts);
  }
  return loops;
}
function loopArea(p) { let a = 0; for (let i = 0, j = p.length - 1; i < p.length; j = i++) a += (p[j][0] + p[i][0]) * (p[j][1] - p[i][1]); return a / 2; }
function dpSimplify(pts, tol) { // Douglas–Peucker pro uzavřenou smyčku
  if (pts.length < 5) return pts;
  let far = 0, fd = -1; for (let i = 1; i < pts.length; i++) { const d = (pts[i][0] - pts[0][0]) ** 2 + (pts[i][1] - pts[0][1]) ** 2; if (d > fd) { fd = d; far = i; } }
  const keep = new Uint8Array(pts.length); keep[0] = keep[far] = 1;
  const rec = (a, b) => {
    const [ax, ay] = pts[a], [bx, by] = pts[b % pts.length]; const L = Math.hypot(bx - ax, by - ay) || 1e-9;
    let md = -1, mi = -1;
    for (let i = a + 1; i < b; i++) { const d = Math.abs((bx - ax) * (ay - pts[i][1]) - (ax - pts[i][0]) * (by - ay)) / L; if (d > md) { md = d; mi = i; } }
    if (md > tol) { keep[mi] = 1; rec(a, mi); rec(mi, b); }
  };
  rec(0, far); rec(far, pts.length);
  return pts.filter((_, i) => keep[i]);
}
function chaikin(pts, it) {
  for (let k = 0; k < it; k++) { const o = []; for (let i = 0; i < pts.length; i++) { const a = pts[i], b = pts[(i + 1) % pts.length];
    o.push([a[0] * 0.75 + b[0] * 0.25, a[1] * 0.75 + b[1] * 0.25], [a[0] * 0.25 + b[0] * 0.75, a[1] * 0.25 + b[1] * 0.75]); } pts = o; }
  return pts;
}
/* o = {smooth 0-3, minArea (px²), pxSize (mm/px)} -> ExPolygony v mm, osa y nahoru */
function loopsToEx(loops, h, o) {
  const paths = [];
  for (let L of loops) {
    if (Math.abs(loopArea(L)) < o.minArea) continue;
    if (o.smooth > 0) {
      const mids = L.map((p, i) => { const q = L[(i + 1) % L.length]; return [(p[0] + q[0]) / 2, (p[1] + q[1]) / 2]; });
      L = chaikin(dpSimplify(mids, 0.35 + 0.25 * o.smooth), o.smooth - 1);
    } else {
      L = L.filter((p, i) => { const a = L[(i - 1 + L.length) % L.length], b = L[(i + 1) % L.length]; return (p[0] - a[0]) * (b[1] - p[1]) !== (p[1] - a[1]) * (b[0] - p[0]); });
    }
    if (L.length < 3) continue;
    paths.push(L.map(p => ({ X: Math.round(p[0] * o.pxSize * SC), Y: Math.round((h - p[1]) * o.pxSize * SC) })));
  }
  return paths.length ? unionEx(paths) : [];
}
function exToSvg(exs, title) {
  const bb = boundsEx(exs), w = bb.x1 - bb.x0, h = bb.y1 - bb.y0, f = (v) => +v.toFixed(3);
  let d = '';
  for (const p of exToPaths(exs)) d += 'M' + p.map(q => `${f(q.X / SC - bb.x0)} ${f(bb.y1 - q.Y / SC)}`).join('L') + 'Z';
  return `<?xml version="1.0" encoding="UTF-8"?>\n<!-- ${title || '3D dílna'} | Created by Julius Andy Antoš -->\n<svg xmlns="http://www.w3.org/2000/svg" width="${f(w)}mm" height="${f(h)}mm" viewBox="0 0 ${f(w)} ${f(h)}"><path d="${d}" fill="#000" fill-rule="evenodd"/></svg>\n`;
}
function normalizeEx(exs, size, byWidth) { // přeškáluje tak, aby delší (nebo šířková) strana měla size mm, levý dolní roh v 0,0
  const bb = boundsEx(exs), w = bb.x1 - bb.x0, h = bb.y1 - bb.y0;
  const k = size / (byWidth ? w : Math.max(w, h));
  return mapEx(exs, (x, y) => [(x - bb.x0) * k, (y - bb.y0) * k]);
}
function symbolToEx(sym) { // výstup svgToSymbol -> ExPolygony (výška 1 mm)
  const paths = []; const cv = (p) => p.map(q => ({ X: Math.round(q[0] * SC * 100), Y: Math.round(q[1] * SC * 100) }));
  for (const e of sym.ex) { paths.push(cv(e.outer)); for (const hh of e.holes) paths.push(cv(hh)); }
  return unionEx(paths);
}

/* ---------- Pomocné pro sítě ---------- */
function signedVolume(pos) { let v = 0; for (let i = 0; i < pos.length; i += 9) {
  const ax = pos[i], ay = pos[i + 1], az = pos[i + 2], bx = pos[i + 3], by = pos[i + 4], bz = pos[i + 5], cx = pos[i + 6], cy = pos[i + 7], cz = pos[i + 8];
  v += ax * (by * cz - bz * cy) - ay * (bx * cz - bz * cx) + az * (bx * cy - by * cx); } return v / 6; }
function fixWinding(geom) { const p = geom.attributes.position.array; if (signedVolume(p) < 0) for (let i = 0; i < p.length; i += 9) for (let k = 0; k < 3; k++) { const t = p[i + 3 + k]; p[i + 3 + k] = p[i + 6 + k]; p[i + 6 + k] = t; } geom.attributes.position.needsUpdate = true; return geom; }
function centerGeoms(list) {
  const box = new THREE.Box3(); for (const g of list) if (g) { g.computeBoundingBox(); box.union(g.boundingBox); }
  const cx = (box.min.x + box.max.x) / 2, cy = (box.min.y + box.max.y) / 2, mz = box.min.z;
  for (const g of list) if (g) { g.translate(-cx, -cy, -mz); g.computeVertexNormals(); g.computeBoundingBox(); }
  const size = new THREE.Vector3(); box.getSize(size); return size;
}

/* ---------- Litofánie ---------- */
/* gray: Float32Array (0 = černá, 255 = bílá) w×h; o = {widthMM, tMin, tMax, frameMM, frameT, invert, gamma, curveDeg} */
function lithophane(gray, w, h, o) {
  const px = o.widthMM / w, fr = Math.max(0, Math.round(o.frameMM / px));
  const W = w + 2 * fr, H = h + 2 * fr;
  const t = new Float32Array(W * H);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const ix = x - fr, iy = y - fr;
    if (ix < 0 || iy < 0 || ix >= w || iy >= h) { t[y * W + x] = o.frameT; continue; }
    let b = gray[iy * w + ix] / 255; b = Math.pow(Math.min(1, Math.max(0, b)), o.gamma); if (o.invert) b = 1 - b;
    t[y * W + x] = o.tMax - (o.tMax - o.tMin) * b;
  }
  const totalW = (W - 1) * px, R = o.curveDeg > 0 ? totalW / (o.curveDeg * Math.PI / 180) : 0;
  const P = (x, y, z) => { // x,y v mřížce, z = tloušťka
    const X = x * px, Y = (H - 1 - y) * px;
    if (!R) return [X, Y, z];
    const a = (X - totalW / 2) / R, r = R + z;
    return [r * Math.sin(a), R - r * Math.cos(a), Y]; // prohnutá, stojí na spodní hraně
  };
  const tris = (H - 1) * (W - 1) * 2 + (W - 1) * 4 + (H - 1) * 4 + (W - 3) * 2 + (H + 4) * 2;
  const pos = new Float32Array(tris * 9 + 90); let o9 = 0;
  const push = (a, b, c) => { pos.set(a, o9); pos.set(b, o9 + 3); pos.set(c, o9 + 6); o9 += 9; };
  const T = (x, y) => P(x, y, t[y * W + x]), B = (x, y) => P(x, y, 0);
  for (let y = 0; y < H - 1; y++) for (let x = 0; x < W - 1; x++) { const a = T(x, y), b = T(x + 1, y), c = T(x + 1, y + 1), d = T(x, y + 1); push(a, d, c); push(a, c, b); }
  for (let x = 0; x < W - 1; x++) { // přední a zadní stěna
    push(T(x, 0), T(x + 1, 0), B(x + 1, 0)); push(T(x, 0), B(x + 1, 0), B(x, 0));
    push(T(x, H - 1), B(x + 1, H - 1), T(x + 1, H - 1)); push(T(x, H - 1), B(x, H - 1), B(x + 1, H - 1));
  }
  for (let y = 0; y < H - 1; y++) { // boční stěny
    push(T(0, y), B(0, y + 1), T(0, y + 1)); push(T(0, y), B(0, y), B(0, y + 1));
    push(T(W - 1, y), T(W - 1, y + 1), B(W - 1, y + 1)); push(T(W - 1, y), B(W - 1, y + 1), B(W - 1, y));
  }
  // spodek: vnitřní pruhy po sloupcích + vějíře na krajích (bez T-spojů)
  for (let x = 1; x < W - 2; x++) { const a = B(x, 0), b = B(x + 1, 0), c = B(x + 1, H - 1), d = B(x, H - 1); push(a, b, c); push(a, c, d); }
  const fan = (x0, x1, flip) => { // okraj pás mezi sloupci x0 a x1 (x0 = kraj s jemnými body)
    const ring = []; for (let y = 0; y < H; y++) ring.push([x0, y]); ring.push([x1, H - 1]); ring.push([x1, 0]);
    const cxm = (x0 + x1) / 2, cym = (H - 1) / 2; const C = P(cxm, cym, 0);
    for (let i = 0; i < ring.length; i++) { const p = ring[i], q = ring[(i + 1) % ring.length]; if (flip) push(C, B(p[0], p[1]), B(q[0], q[1])); else push(C, B(q[0], q[1]), B(p[0], p[1])); }
  };
  fan(0, 1, false); fan(W - 1, W - 2, true);
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos.slice(0, o9), 3));
  return fixWinding(g);
}

/* ---------- Vykrajovátko ---------- */
/* shape = ExPolygony v mm; o = {height, wall, blade, bladeH, flangeW, flangeH} */
function cookieCutter(shapeEx, o) {
  const outer = unionEx(shapeEx.map(e => e.outer)); // jen obrys, vnitřní otvory se ignorují
  const ring = (d) => diffEx(offsetEx(outer, d), outer);
  const parts = [
    extrudeEx(ring(o.wall), 0, Math.max(0.4, o.height - o.bladeH)),
    extrudeEx(ring(o.blade), 0, o.height),
  ];
  if (o.flangeW > 0 && o.flangeH > 0) parts.push(extrudeEx(ring(o.wall + o.flangeW), 0, o.flangeH));
  return { geom: mergeGeoms(parts), islands: outer.length };
}

/* ---------- QR kód ---------- */
function qrMatrix(text, ecc) {
  qrcode.stringToBytes = qrcode.stringToBytesFuncs['UTF-8'];
  const q = qrcode(0, ecc || 'M'); q.addData(text, 'Byte'); q.make();
  const n = q.getModuleCount(); const m = []; for (let r = 0; r < n; r++) { const row = []; for (let c = 0; c < n; c++) row.push(q.isDark(r, c)); m.push(row); }
  return m;
}
function qrToEx(m, module) {
  const n = m.length, paths = [];
  for (let r = 0; r < n; r++) { let c = 0; while (c < n) { if (!m[r][c]) { c++; continue; } let e = c; while (e < n && m[r][e]) e++;
    const y0 = (n - 1 - r) * module, y1 = y0 + module, g = 0.02; paths.push(rectPath(c * module - g, y0 - g, e * module + g, y1 + g)); c = e; } }
  return unionEx(paths);
}
function spdString(o) {
  const iban = o.iban.replace(/\s+/g, '').toUpperCase();
  let s = `SPD*1.0*ACC:${iban}`;
  if (o.amount > 0) s += `*AM:${o.amount.toFixed(2)}*CC:CZK`;
  if (o.vs) s += `*X-VS:${o.vs.replace(/\D/g, '').slice(0, 10)}`;
  const msg = o.msg.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^\x20-\x7E]/g, '').replace(/\*/g, '').trim().slice(0, 60);
  if (msg) s += `*MSG:${msg}`;
  return s;
}
function ibanValid(iban) {
  const s = iban.replace(/\s+/g, '').toUpperCase(); if (!/^[A-Z]{2}\d{2}[A-Z0-9]{10,30}$/.test(s)) return false;
  const r = s.slice(4) + s.slice(0, 4); let m = 0;
  for (const ch of r) { const v = /[A-Z]/.test(ch) ? String(ch.charCodeAt(0) - 55) : ch; for (const d of v) m = (m * 10 + +d) % 97; }
  return m === 1;
}
function czAccountToIban(acc) { // "123-4567890/0300" -> IBAN
  const m = acc.replace(/\s+/g, '').match(/^(?:(\d{1,6})-)?(\d{2,10})\/(\d{4})$/); if (!m) return null;
  const bban = m[3] + (m[1] || '').padStart(6, '0') + m[2].padStart(10, '0');
  const r = bban + '123500'; let mod = 0; for (const d of r) mod = (mod * 10 + +d) % 97;
  return 'CZ' + String(98 - mod).padStart(2, '0') + bban;
}
function wifiString(o) {
  const esc = (s) => s.replace(/([\\;,:"])/g, '\\$1');
  return `WIFI:T:${o.sec === 'none' ? 'nopass' : o.sec};S:${esc(o.ssid)};${o.sec === 'none' ? '' : `P:${esc(o.pass)};`}${o.hidden ? 'H:true;' : ''};`;
}

/* ---------- STL -> údaje ---------- */
function parseStl(buf) {
  const dv = new DataView(buf);
  let tris = 0, pos;
  if (buf.byteLength >= 84) tris = dv.getUint32(80, true);
  if (buf.byteLength >= 84 && 84 + tris * 50 === buf.byteLength) {
    pos = new Float32Array(tris * 9);
    for (let i = 0; i < tris; i++) for (let k = 0; k < 9; k++) pos[i * 9 + k] = dv.getFloat32(84 + i * 50 + 12 + k * 4, true);
  } else {
    const txt = new TextDecoder().decode(buf); const nums = [];
    const re = /vertex\s+([-+\d.eE]+)\s+([-+\d.eE]+)\s+([-+\d.eE]+)/g; let m;
    while ((m = re.exec(txt))) nums.push(+m[1], +m[2], +m[3]);
    if (!nums.length || nums.length % 9) throw new Error('Soubor není platné STL.');
    pos = new Float32Array(nums);
  }
  return pos;
}
function meshStats(pos) {
  let area = 0; const mn = [Infinity, Infinity, Infinity], mx = [-Infinity, -Infinity, -Infinity];
  for (let i = 0; i < pos.length; i += 9) {
    const ux = pos[i + 3] - pos[i], uy = pos[i + 4] - pos[i + 1], uz = pos[i + 5] - pos[i + 2], vx = pos[i + 6] - pos[i], vy = pos[i + 7] - pos[i + 1], vz = pos[i + 8] - pos[i + 2];
    area += Math.hypot(uy * vz - uz * vy, uz * vx - ux * vz, ux * vy - uy * vx) / 2;
  }
  for (let i = 0; i < pos.length; i += 3) for (let k = 0; k < 3; k++) { if (pos[i + k] < mn[k]) mn[k] = pos[i + k]; if (pos[i + k] > mx[k]) mx[k] = pos[i + k]; }
  return { volume: Math.abs(signedVolume(pos)), area, size: [mx[0] - mn[0], mx[1] - mn[1], mx[2] - mn[2]], tris: pos.length / 9 };
}
/* odhad spotřeby: stěny (plocha × tloušťka stěny) + výplň zbytku */
function filamentEstimate(st, o) {
  const V = st.volume / 1000; // cm³
  const shell = Math.min(V, st.area * o.wall / 1000);
  const used = shell + (V - shell) * o.infill / 100;
  const grams = used * o.density;
  const r = o.diameter / 20; const meters = used / (Math.PI * r * r) / 100;
  return { V, used, grams, meters, price: grams / 1000 * o.pricePerKg };
}

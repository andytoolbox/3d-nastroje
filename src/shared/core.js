/* ===== Písmo do STL — Created by Julius Andy Antoš ===== */
/* ===== Geometrie: text -> obrysy -> 3D díly -> STL ===== */
const SC = 1000; // Clipper pracuje v celých číslech: 1 mm = 1000 jednotek (µm)
const CZ_TEST = 'ěščřžýáíéúůťďňĚŠČŘŽÝÁÍÉÚŮŤĎŇ';

function flattenCommands(cmds, step, mirror) {
  const out = []; let cur = []; let px = 0, py = 0;
  const P = (x, y) => cur.push([mirror ? -x : x, -y]);
  const segs = (len) => Math.max(2, Math.min(40, Math.ceil(len / step)));
  const d = (ax, ay, bx, by) => Math.hypot(bx - ax, by - ay);
  const close = () => { if (cur.length > 2) out.push(cur); cur = []; };
  for (const c of cmds) {
    if (c.type === 'M') { close(); P(c.x, c.y); px = c.x; py = c.y; }
    else if (c.type === 'L') { P(c.x, c.y); px = c.x; py = c.y; }
    else if (c.type === 'Q') {
      const n = segs(d(px, py, c.x1, c.y1) + d(c.x1, c.y1, c.x, c.y));
      for (let i = 1; i <= n; i++) { const t = i / n, u = 1 - t;
        P(u*u*px + 2*u*t*c.x1 + t*t*c.x, u*u*py + 2*u*t*c.y1 + t*t*c.y); }
      px = c.x; py = c.y;
    } else if (c.type === 'C') {
      const n = segs(d(px, py, c.x1, c.y1) + d(c.x1, c.y1, c.x2, c.y2) + d(c.x2, c.y2, c.x, c.y));
      for (let i = 1; i <= n; i++) { const t = i / n, u = 1 - t;
        P(u*u*u*px + 3*u*u*t*c.x1 + 3*u*t*t*c.x2 + t*t*t*c.x,
          u*u*u*py + 3*u*u*t*c.y1 + 3*u*t*t*c.y2 + t*t*t*c.y); }
      px = c.x; py = c.y;
    } else if (c.type === 'Z') close();
  }
  close();
  return out;
}

function capHeight(font) {
  const os2 = font.tables.os2;
  if (os2 && os2.sCapHeight > 0) return os2.sCapHeight;
  const h = font.charToGlyph('H'); const bb = h && h.getBoundingBox();
  if (bb && bb.y2 > 0) return bb.y2;
  return font.unitsPerEm * 0.7;
}

/* Rozvržení textu. Vrací obrysy v Clipper jednotkách + informace o řádcích. */
function layoutText(font, text, o) {
  const lines = text.normalize('NFC').replace(/\r/g, '').split('\n');
  const fs = o.size * font.unitsPerEm / capHeight(font);
  const scale = fs / font.unitsPerEm;
  const lineGap = fs * o.lineH;
  const step = Math.max(0.04, o.size / 90);
  const paths = []; const missing = new Set();
  lines.forEach((line, k) => {
    const glyphs = font.stringToGlyphs(line);
    let x = 0; const items = [];
    glyphs.forEach((g, i) => {
      items.push({ g, x });
      x += g.advanceWidth * scale + o.spacing;
      if (i < glyphs.length - 1) x += (font.getKerningValue(g, glyphs[i + 1]) || 0) * scale;
    });
    const w = glyphs.length ? x - o.spacing : 0;
    const shift = o.align === 'left' ? 0 : o.align === 'right' ? -w : -w / 2;
    for (const it of items) {
      const cmds = it.g.getPath(it.x + shift, k * lineGap, fs).commands;
      const baseY = -k * lineGap, sl = o.slant || 0;
      for (const c of flattenCommands(cmds, step, o.mirror))
        paths.push(c.map(p => ({ X: Math.round((p[0] + (p[1] - baseY) * sl) * SC), Y: Math.round(p[1] * SC) })));
    }
    for (const ch of line) if (!/\s/.test(ch) && font.charToGlyphIndex(ch) === 0) missing.add(ch);
  });
  return { paths, missing: [...missing], lastBaseline: -(lines.length - 1) * lineGap };
}

function unionEx(paths) {
  const c = new ClipperLib.Clipper(); c.StrictlySimple = true;
  c.AddPaths(paths, ClipperLib.PolyType.ptSubject, true);
  const pt = new ClipperLib.PolyTree();
  c.Execute(ClipperLib.ClipType.ctUnion, pt, ClipperLib.PolyFillType.pftNonZero, ClipperLib.PolyFillType.pftNonZero);
  return ClipperLib.JS.PolyTreeToExPolygons(pt);
}
function exToPaths(exs) { const r = []; for (const e of exs) { r.push(e.outer); for (const h of e.holes) r.push(h); } return r; }
function offsetEx(exs, deltaMM) {
  const co = new ClipperLib.ClipperOffset(2, 0.02 * SC);
  co.AddPaths(exToPaths(exs), ClipperLib.JoinType.jtRound, ClipperLib.EndType.etClosedPolygon);
  const pt = new ClipperLib.PolyTree();
  co.Execute(pt, deltaMM * SC);
  return ClipperLib.JS.PolyTreeToExPolygons(pt);
}
function areaEx(exs) {
  let a = 0;
  for (const e of exs) { a += Math.abs(ClipperLib.Clipper.Area(e.outer)); for (const h of e.holes) a -= Math.abs(ClipperLib.Clipper.Area(h)); }
  return a / (SC * SC);
}
function boundsEx(exs) {
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (const e of exs) for (const p of e.outer) { if (p.X < x0) x0 = p.X; if (p.X > x1) x1 = p.X; if (p.Y < y0) y0 = p.Y; if (p.Y > y1) y1 = p.Y; }
  return { x0: x0 / SC, y0: y0 / SC, x1: x1 / SC, y1: y1 / SC };
}
function rectPath(x0, y0, x1, y1) {
  return [{ X: x0, Y: y0 }, { X: x1, Y: y0 }, { X: x1, Y: y1 }, { X: x0, Y: y1 }].map(p => ({ X: Math.round(p.X * SC), Y: Math.round(p.Y * SC) }));
}
/* Podíl plochy, který zmizí po „otevření“ poloměrem r: měřítko tenkých tahů */
function thinLoss(exs, minStroke) {
  const a = areaEx(exs); if (a <= 0) return 0;
  const r = minStroke / 2;
  const opened = offsetEx(offsetEx(exs, -r), r);
  return 1 - areaEx(opened) / a;
}

/* ===== 3D ===== */
function extrudeEx(exs, z0, z1) { return prismSolid(exs, z0, z1); }

function stlBinary(geoms) {
  let tris = 0; for (const g of geoms) tris += g.attributes.position.count / 3;
  const buf = new ArrayBuffer(84 + tris * 50); const dv = new DataView(buf);
  const head = 'Created by Julius Andy Antos | Pismo do STL | jednotky mm';
  for (let i = 0; i < head.length; i++) dv.setUint8(i, head.charCodeAt(i));
  dv.setUint32(80, tris, true);
  let o = 84;
  for (const g of geoms) {
    const p = g.attributes.position.array;
    for (let i = 0; i < p.length; i += 9) {
      const ax = p[i], ay = p[i+1], az = p[i+2], bx = p[i+3], by = p[i+4], bz = p[i+5], cx = p[i+6], cy = p[i+7], cz = p[i+8];
      let nx = (by - ay) * (cz - az) - (bz - az) * (cy - ay), ny = (bz - az) * (cx - ax) - (bx - ax) * (cz - az), nz = (bx - ax) * (cy - ay) - (by - ay) * (cx - ax);
      const l = Math.hypot(nx, ny, nz) || 1; nx /= l; ny /= l; nz /= l;
      for (const v of [nx, ny, nz, ax, ay, az, bx, by, bz, cx, cy, cz]) { dv.setFloat32(o, v, true); o += 4; }
      dv.setUint16(o, 0, true); o += 2;
    }
  }
  return new Uint8Array(buf);
}

/* ZIP bez komprese (pro prohlížeč v Claude, kde nelze stáhnout .stl přímo) */
const CRC_T = (() => { const t = new Uint32Array(256); for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; } return t; })();
function crc32(u8) { let c = 0xFFFFFFFF; for (let i = 0; i < u8.length; i++) c = CRC_T[(c ^ u8[i]) & 0xFF] ^ (c >>> 8); return (c ^ 0xFFFFFFFF) >>> 0; }
function makeZip(files) {
  const enc = new TextEncoder(); const chunks = []; const central = []; let off = 0;
  for (const f of files) {
    const name = enc.encode(f.name), crc = crc32(f.data), n = f.data.length;
    const lh = new DataView(new ArrayBuffer(30));
    lh.setUint32(0, 0x04034b50, true); lh.setUint16(4, 20, true); lh.setUint16(6, 0x0800, true);
    lh.setUint32(14, crc, true); lh.setUint32(18, n, true); lh.setUint32(22, n, true); lh.setUint16(26, name.length, true);
    chunks.push(new Uint8Array(lh.buffer), name, f.data);
    const ch = new DataView(new ArrayBuffer(46));
    ch.setUint32(0, 0x02014b50, true); ch.setUint16(4, 20, true); ch.setUint16(6, 20, true); ch.setUint16(8, 0x0800, true);
    ch.setUint32(16, crc, true); ch.setUint32(20, n, true); ch.setUint32(24, n, true); ch.setUint16(28, name.length, true); ch.setUint32(42, off, true);
    central.push(new Uint8Array(ch.buffer), name);
    off += 30 + name.length + n;
  }
  const cdSize = central.reduce((s, c) => s + c.length, 0);
  const end = new DataView(new ArrayBuffer(22));
  end.setUint32(0, 0x06054b50, true); end.setUint16(8, files.length, true); end.setUint16(10, files.length, true);
  end.setUint32(12, cdSize, true); end.setUint32(16, off, true);
  return new Blob([...chunks, ...central, new Uint8Array(end.buffer)], { type: 'application/zip' });
}

/* ===== Rozšíření: symboly, rytí, klíčenka ===== */
function diffEx(aEx, bEx) {
  const c = new ClipperLib.Clipper();
  c.AddPaths(exToPaths(aEx), ClipperLib.PolyType.ptSubject, true);
  c.AddPaths(exToPaths(bEx), ClipperLib.PolyType.ptClip, true);
  const pt = new ClipperLib.PolyTree();
  c.Execute(ClipperLib.ClipType.ctDifference, pt, ClipperLib.PolyFillType.pftNonZero, ClipperLib.PolyFillType.pftNonZero);
  return ClipperLib.JS.PolyTreeToExPolygons(pt);
}
function circlePath(cx, cy, r, n = 72) {
  const p = []; for (let i = 0; i < n; i++) { const a = i / n * Math.PI * 2; p.push({ X: Math.round((cx + r * Math.cos(a)) * SC), Y: Math.round((cy + r * Math.sin(a)) * SC) }); }
  return p;
}
function mapEx(exs, fx) { // fx(x,y)->[x,y] v mm; vrací nové ExPolygony
  const m = (path) => path.map(p => { const q = fx(p.X / SC, p.Y / SC); return { X: Math.round(q[0] * SC), Y: Math.round(q[1] * SC) }; });
  return unionEx(exToPaths(exs).map(m));
}

/* SVG -> normalizovaný symbol (výška 1, levý dolní roh v 0,0), osa Y nahoru */
function svgFillRule(node) {
  for (let n = node; n && n.getAttribute; n = n.parentNode) {
    const st = (n.getAttribute('style') || '').match(/fill-rule\s*:\s*(evenodd|nonzero)/i);
    if (st) return st[1].toLowerCase();
    const a = n.getAttribute('fill-rule'); if (a) return a.toLowerCase();
  }
  return 'nonzero';
}
/* Úprava SVG před převodem: rozbalí <use>, odstraní ořezové cesty, masky, skryté prvky a zkosení převede na matici.
   SVGLoader by jinak kreslil ořezové obdélníky jako plochy a nezvládl by některé soubory z Inkscape, Illustratoru a Figmy. */
function svgPrepare(txt) {
  try {
    txt = String(txt).replace(/^\uFEFF/, '');
    const NS = 'http://www.w3.org/2000/svg', XL = 'http://www.w3.org/1999/xlink';
    const doc = new DOMParser().parseFromString(txt, 'image/svg+xml');
    if (doc.getElementsByTagName('parsererror').length) return txt;
    const root = doc.documentElement, all = (tag) => Array.from(root.getElementsByTagName(tag));
    for (let pass = 0; pass < 5; pass++) {
      const uses = all('use'); if (!uses.length) break;
      for (const u of uses) {
        const href = u.getAttribute('href') || u.getAttributeNS(XL, 'href') || u.getAttribute('xlink:href') || '';
        const ref = href.charAt(0) === '#' ? doc.getElementById(href.slice(1)) : null;
        const g = doc.createElementNS(NS, 'g');
        for (const a of Array.from(u.attributes)) if (!/^(x|y|width|height|href|xlink:href|transform|id)$/.test(a.name)) g.setAttribute(a.name, a.value);
        const x = parseFloat(u.getAttribute('x')) || 0, y = parseFloat(u.getAttribute('y')) || 0;
        const tr = ((u.getAttribute('transform') || '') + (x || y ? ` translate(${x},${y})` : '')).trim();
        if (tr) g.setAttribute('transform', tr);
        if (ref && !ref.contains(u)) {
          const c = ref.cloneNode(true); c.removeAttribute('id');
          if (/^symbol$/i.test(c.localName)) { const gg = doc.createElementNS(NS, 'g'); while (c.firstChild) gg.appendChild(c.firstChild); g.appendChild(gg); } else g.appendChild(c);
        }
        u.parentNode.replaceChild(g, u);
      }
    }
    for (const tag of ['clipPath', 'mask', 'pattern', 'marker', 'symbol', 'metadata', 'title', 'desc', 'script', 'foreignObject', 'filter', 'image', 'text'])
      for (const el of all(tag)) el.parentNode && el.parentNode.removeChild(el);
    for (const el of Array.from(root.getElementsByTagName('*'))) {
      const st = (el.getAttribute('style') || '').replace(/\s/g, '');
      if (el.getAttribute('display') === 'none' || el.getAttribute('visibility') === 'hidden' || /display:none|visibility:hidden/.test(st)) { el.parentNode && el.parentNode.removeChild(el); continue; }
      for (const a of ['clip-path', 'mask', 'filter']) el.removeAttribute(a);
      const t = el.getAttribute('transform');
      if (t && /skew/i.test(t)) el.setAttribute('transform', t.replace(/skewX\(\s*([-\d.eE]+)\s*\)/g, (m, a) => `matrix(1,0,${Math.tan(a * Math.PI / 180)},1,0,0)`).replace(/skewY\(\s*([-\d.eE]+)\s*\)/g, (m, a) => `matrix(1,${Math.tan(a * Math.PI / 180)},0,1,0,0)`));
    }
    return new XMLSerializer().serializeToString(doc);
  } catch (e) { return txt; }
}
/* Obsahuje SVG něco, co se z vektorů převést nedá (text, obrázky, masky)? Pak je spolehlivější převod přes obrázek. */
function svgRisky(txt) { return /<(?:\w+:)?(text|image|filter|foreignObject|pattern)\b/i.test(txt); }
/* SVG pro vykreslení jako obrázek: doplní xmlns a rozměry v pixelech (podle viewBox) */
function svgForImage(txt, maxPx) {
  try {
    const doc = new DOMParser().parseFromString(String(txt).replace(/^\uFEFF/, ''), 'image/svg+xml');
    if (doc.getElementsByTagName('parsererror').length) return txt;
    const r = doc.documentElement;
    let w = 0, h = 0; const vb = (r.getAttribute('viewBox') || '').trim().split(/[\s,]+/).map(Number);
    if (vb.length === 4 && vb[2] > 0 && vb[3] > 0) { w = vb[2]; h = vb[3]; }
    else { w = parseFloat(r.getAttribute('width')) || 0; h = parseFloat(r.getAttribute('height')) || 0; if (w > 0 && h > 0 && !/%/.test(r.getAttribute('width') || '')) r.setAttribute('viewBox', `0 0 ${w} ${h}`); else { w = h = 1000; } }
    const k = (maxPx || 1600) / Math.max(w, h);
    r.setAttribute('width', Math.round(w * k)); r.setAttribute('height', Math.round(h * k));
    if (!r.getAttribute('xmlns')) r.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
    return new XMLSerializer().serializeToString(doc);
  } catch (e) { return txt; }
}
function svgToSymbol(svgText, ignoreWhite) {
  const data = new THREE.SVGLoader().parse(svgPrepare(svgText));
  const K = 1000;
  const white = (c) => /^(#fff|#ffffff|white|rgb\(\s*255\s*,\s*255\s*,\s*255\s*\))$/i.test(String(c || '').trim());
  const toInt = (pts) => pts.map(v => ({ X: Math.round(v.x * K), Y: Math.round(-v.y * K) }));
  let all = [];
  const cut = (paths) => { // bílá plocha nakreslená přes tmavou: vyřízne ji (jako při vykreslení)
    if (!all.length || !paths.length) return;
    const c = new ClipperLib.Clipper(); c.AddPaths(exToPaths(unionEx(all)), ClipperLib.PolyType.ptSubject, true); c.AddPaths(paths, ClipperLib.PolyType.ptClip, true);
    const pt = new ClipperLib.PolyTree(); c.Execute(ClipperLib.ClipType.ctDifference, pt, ClipperLib.PolyFillType.pftNonZero, ClipperLib.PolyFillType.pftNonZero);
    all = exToPaths(ClipperLib.JS.PolyTreeToExPolygons(pt));
  };
  for (const sp of data.paths) {
    const st = (sp.userData && sp.userData.style) || {};
    if (st.visibility === 'hidden' || st.opacity === 0) continue;
    const subs = sp.subPaths.map(p => p.getPoints(24)).filter(p => p.length > 1);
    const fill = st.fill;
    if (fill && fill !== 'none' && fill !== 'transparent' && st.fillOpacity !== 0) {
      const conts = subs.filter(p => p.length > 2).map(toInt);
      const rule = svgFillRule(sp.userData.node) === 'evenodd' ? ClipperLib.PolyFillType.pftEvenOdd : ClipperLib.PolyFillType.pftNonZero;
      const c = new ClipperLib.Clipper(); c.AddPaths(conts, ClipperLib.PolyType.ptSubject, true);
      const pt = new ClipperLib.PolyTree(); c.Execute(ClipperLib.ClipType.ctUnion, pt, rule, rule);
      const paths = exToPaths(ClipperLib.JS.PolyTreeToExPolygons(pt));
      if (ignoreWhite && white(fill)) cut(paths); else all.push(...paths);
    }
    const stroke = st.stroke, sw = st.strokeWidth;
    if (stroke && stroke !== 'none' && sw > 0 && st.strokeOpacity !== 0) {
      const co = new ClipperLib.ClipperOffset(2, Math.max(1, sw * K * 0.01));
      for (const p of subs) {
        const a = p[0], b = p[p.length - 1]; const closed = a.distanceTo(b) < 1e-6;
        co.AddPath(toInt(closed ? p.slice(0, -1) : p), ClipperLib.JoinType.jtRound, closed ? ClipperLib.EndType.etClosedLine : ClipperLib.EndType.etOpenRound);
      }
      const pt = new ClipperLib.PolyTree(); co.Execute(pt, sw / 2 * K);
      const paths = exToPaths(ClipperLib.JS.PolyTreeToExPolygons(pt));
      if (ignoreWhite && white(stroke)) cut(paths); else all.push(...paths);
    }
  }
  if (!all.length) return null;
  const ex = unionEx(all);
  if (!ex.length) return null;
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (const e of ex) for (const p of e.outer) { x0 = Math.min(x0, p.X); x1 = Math.max(x1, p.X); y0 = Math.min(y0, p.Y); y1 = Math.max(y1, p.Y); }
  const h = y1 - y0; if (h <= 0) return null;
  const norm = (path) => path.map(p => [(p.X - x0) / h, (p.Y - y0) / h]);
  return { ex: ex.map(e => ({ outer: norm(e.outer), holes: e.holes.map(norm) })), aspect: (x1 - x0) / h };
}
function placeSymbol(sym, h, ox, oy) { // ox,oy = levý dolní roh v mm
  const conv = (path) => path.map(q => ({ X: Math.round((ox + q[0] * h) * SC), Y: Math.round((oy + q[1] * h) * SC) }));
  const paths = []; for (const e of sym.ex) { paths.push(conv(e.outer)); for (const hh of e.holes) paths.push(conv(hh)); }
  return unionEx(paths);
}

/* Přepsané sestavení 2D dílů: text + symbol, obrys/podložka, klíčenka, rytí */
function buildParts(font, S, sym) {
  const warnings = [];
  const onlySym = sym && S.symPos === 'only';
  const L = onlySym ? { paths: [], missing: [], lastBaseline: 0 } : layoutText(font, S.text, Object.assign({}, S, { mirror: false, slant: S.slant ? Math.tan(12 * Math.PI / 180) : 0 }));
  let textEx = L.paths.length ? unionEx(L.paths) : [];
  if (textEx.length && S.embolden) textEx = offsetEx(textEx, S.embolden / 2);
  if (sym) {
    const h = S.symH, w = sym.aspect * h, g = S.symGap;
    let ox = -w / 2, oy = 0;
    if (textEx.length && !onlySym) {
      const tb = boundsEx(textEx), midY = (tb.y0 + tb.y1) / 2, midX = (tb.x0 + tb.x1) / 2;
      const vy = S.mode === 'stand' ? L.lastBaseline : midY - h / 2;
      if (S.symPos === 'left') { ox = tb.x0 - g - w; oy = vy; }
      else if (S.symPos === 'right') { ox = tb.x1 + g; oy = vy; }
      else if (S.symPos === 'above') { ox = midX - w / 2; oy = tb.y1 + g; }
      else { ox = midX - w / 2; oy = tb.y0 - g - h; }
    }
    const se = placeSymbol(sym, h, ox, oy);
    textEx = textEx.length ? unionEx(exToPaths(textEx).concat(exToPaths(se))) : se;
  }
  return finishParts(textEx, S, { warnings, missing: L.missing, lastBaseline: L.lastBaseline });
}

/* Společné dokončení pro libovolný 2D tvar (text, logo, obrázek, QR): podklad, stojan, klíčenka, rytí */
function finishParts(textEx, S, info) {
  const warnings = info.warnings || [];
  if (!textEx.length) return { empty: true, warnings, missing: info.missing || [] };
  if (S.mirror) textEx = mapEx(textEx, (x, y) => [-x, y]);
  const L = { lastBaseline: info.lastBaseline || 0 };
  const res = { textEx, baseEx: null, topEx: null, foot: null, warnings, missing: info.missing || [], lastBaseline: L.lastBaseline };
  const bb = boundsEx(textEx);
  if (S.mode === 'offset') {
    let ex = offsetEx(textEx, S.offW);
    if (S.fillHoles) ex = unionEx(ex.map(e => e.outer));
    res.baseEx = ex;
  } else if (S.mode === 'plate') {
    const r = Math.max(0, Math.min(S.radius, (bb.x1 - bb.x0) / 2 + S.padW - 0.01, (bb.y1 - bb.y0) / 2 + S.padW - 0.01));
    const inner = rectPath(bb.x0 - S.padW + r, bb.y0 - S.padW + r, bb.x1 + S.padW - r, bb.y1 + S.padW - r);
    res.baseEx = r > 0 ? offsetEx([{ outer: inner, holes: [] }], r) : [{ outer: inner, holes: [] }];
  } else if (S.mode === 'stand') {
    const top = L.lastBaseline + 0.4;
    const bottom = Math.min(top - S.footH, bb.y0);
    res.foot = { x0: bb.x0 - S.footOver, x1: bb.x1 + S.footOver, z0: bottom, z1: top, depth: Math.max(S.footD, S.height) };
    const floating = textEx.filter(e => { let m = Infinity; for (const p of e.outer) m = Math.min(m, p.Y); return m / SC > top + 0.01; }).length;
    if (floating) warnings.push({ lvl: 'warn', msg: `${floating} ${floating === 1 ? 'část není spojená' : floating < 5 ? 'části nejsou spojené' : 'částí není spojených'} s podstavcem (háčky, čárky, tečky nad i/j, části symbolu). Na stojato by odpadly: zvolte font s navazující diakritikou nebo tiskněte naležato.` });
  }
  if (res.baseEx && S.hole) {
    const R = S.holeD / 2 + S.holeRim;
    let best = null; const bbB = boundsEx(res.baseEx), mx = (bbB.x0 + bbB.x1) / 2, my = (bbB.y0 + bbB.y1) / 2;
    if (S.mode === 'plate') best = S.holePos === 'left' ? { x: bbB.x0, y: my } : S.holePos === 'right' ? { x: bbB.x1, y: my } : { x: mx, y: bbB.y1 };
    else for (const e of res.baseEx) for (const p of e.outer) {
      const x = p.X / SC, y = p.Y / SC;
      const score = S.holePos === 'left' ? -x - 0.3 * Math.abs(y - my) : S.holePos === 'right' ? x - 0.3 * Math.abs(y - my) : y - 0.5 * Math.abs(x - mx);
      if (!best || score > best.s) best = { s: score, x, y };
    }
    const cx = S.holePos === 'left' ? best.x - R / 2 : S.holePos === 'right' ? best.x + R / 2 : best.x;
    const cy = S.holePos === 'top' ? best.y + R / 2 : best.y;
    res.baseEx = diffEx(unionEx(exToPaths(res.baseEx).concat([circlePath(cx, cy, R)])), [{ outer: circlePath(cx, cy, S.holeD / 2), holes: [] }]);
  }
  if (res.baseEx && S.relief === 'engraved') {
    res.depth = Math.min(S.engDepth, S.baseT - 0.4);
    if (S.engDepth > S.baseT - 0.4) warnings.push({ lvl: 'warn', msg: `Hloubka rytí je omezená na ${String(Math.max(0, res.depth).toFixed(1)).replace('.', ',')} mm, aby pod písmem zůstalo aspoň 0,4 mm podkladu. Pro hlubší rytí zvyšte tloušťku podkladu.` });
    res.topEx = diffEx(res.baseEx, textEx);
  }
  return res;
}

function mergeGeoms(list) {
  const arrs = list.filter(Boolean).map(g => g.attributes.position.array);
  const out = new Float32Array(arrs.reduce((s, a) => s + a.length, 0)); let o = 0;
  for (const a of arrs) { out.set(a, o); o += a.length; }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(out, 3)); return g;
}

/* Přepsané 3D sestavení; inlay = výplň rytého textu (jen pro vícebarevný tisk) */
function buildGeometry(parts, S) {
  const OV = 0.2;
  let text = null, base = null, inlay = false;
  if (S.mode === 'text') text = extrudeEx(parts.textEx, 0, S.height);
  else if ((S.mode === 'offset' || S.mode === 'plate') && S.relief === 'engraved') {
    const d = Math.max(0.2, parts.depth);
    base = engravedSolid(parts.baseEx, parts.textEx, S.baseT, d);
    text = extrudeEx(parts.textEx, S.baseT - d, S.baseT); inlay = true;
  } else if (S.mode === 'offset' || S.mode === 'plate') {
    base = extrudeEx(parts.baseEx, 0, S.baseT);
    text = extrudeEx(parts.textEx, S.baseT - OV, S.baseT + S.height);
  } else {
    text = extrudeEx(parts.textEx, 0, S.height);
    text.rotateX(Math.PI / 2);
    const f = parts.foot;
    base = new THREE.BoxGeometry(f.x1 - f.x0, f.depth, f.z1 - f.z0).toNonIndexed();
    base.translate((f.x0 + f.x1) / 2, -S.height / 2, (f.z0 + f.z1) / 2);
  }
  const box = new THREE.Box3();
  for (const g of [text, base]) if (g) { g.computeBoundingBox(); box.union(g.boundingBox); }
  const cx = (box.min.x + box.max.x) / 2, cy = (box.min.y + box.max.y) / 2, mz = box.min.z;
  for (const g of [text, base]) if (g) { g.translate(-cx, -cy, -mz); g.computeVertexNormals(); g.computeBoundingBox(); }
  const size = new THREE.Vector3(); box.getSize(size);
  return { text, base, size, inlay };
}

/* Vestavěné ikony (vlastní kresba, mřížka 24 × 24) */
const ICONS = (() => {
  const c = (cx, cy, r) => `M${cx - r} ${cy}a${r} ${r} 0 1 0 ${2 * r} 0a${r} ${r} 0 1 0 ${-2 * r} 0z`;
  const star = (() => { let d = ''; for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, r = i % 2 ? 4.7 : 11; d += (i ? 'L' : 'M') + (12 + r * Math.cos(a)).toFixed(2) + ' ' + (13 + r * Math.sin(a)).toFixed(2); } return d + 'z'; })();
  const flower = (() => { let d = ''; for (let i = 0; i < 5; i++) { const a = -Math.PI / 2 + i * 2 * Math.PI / 5; d += c(+(12 + 5.4 * Math.cos(a)).toFixed(2), +(12 + 5.4 * Math.sin(a)).toFixed(2), 4.4); } return d + c(12, 12, 3.4); })();
  return [
    { id: 'srdce', name: 'Srdce', d: 'M12 21.2S3.8 16.3 2.2 11.1C1 7.4 3.4 3.8 7 3.8c2.2 0 3.8 1.2 5 3 1.2-1.8 2.8-3 5-3 3.6 0 6 3.6 4.8 7.3C20.2 16.3 12 21.2 12 21.2z' },
    { id: 'hvezda', name: 'Hvězda', d: star },
    { id: 'kvetina', name: 'Květina', d: flower },
    { id: 'list', name: 'List', d: 'M21 2.5C11.5 2.5 4.5 6.5 4.5 14c0 1.7.4 3.1 1.1 4.3L2.5 21.4l1.6 1.6 3.1-3.1c1.3.9 2.9 1.4 4.8 1.4 7.5 0 9.8-7.6 9-18.8z' },
    { id: 'jablko', name: 'Jablko', d: 'M12 7.6c-1.4-.9-3.1-1.3-4.7-.9C4.5 7.3 3 10 3 13c0 4.3 3 8.8 5.8 8.8 1.3 0 1.9-.6 3.2-.6s1.9.6 3.2.6C18 21.8 21 17.3 21 13c0-3-1.5-5.7-4.3-6.3-1.6-.4-3.3 0-4.7.9zM12.4 6.4c.1-2.3 1.7-4.1 4-4.3-.1 2.3-1.7 4.1-4 4.3z' },
    { id: 'kapka', name: 'Kapka', d: 'M12 2S4.8 10.4 4.8 15.2a7.2 7.2 0 0 0 14.4 0C19.2 10.4 12 2 12 2z' },
    { id: 'domek', name: 'Domeček', d: 'M12 2.5 1.5 11.5h3V21.5h5.5v-6h4v6h5.5v-10h3z' },
    { id: 'sipka', name: 'Šipka', d: 'M1.5 9.5h12.5V4l8.5 8-8.5 8v-5.5H1.5z' },
    { id: 'blesk', name: 'Blesk', d: 'M14 1.5 4 13.5h6.5l-1.5 9 11-13h-6.8z' },
    { id: 'nota', name: 'Nota', d: 'M8.5 2.5H20v5h-8v10.2a4 4 0 1 1-3.5-4z' },
    { id: 'smajlik', name: 'Smajlík', rule: 'evenodd', d: c(12, 12, 10.5) + c(8.3, 9.3, 1.7) + c(15.7, 9.3, 1.7) + 'M6.6 13.2h10.8a5.4 5.4 0 0 1-10.8 0z' },
    { id: 'tlapka', name: 'Tlapka', d: 'M12 11.5c3.3 0 6.5 3.7 6.5 6.6 0 2.4-2.2 3.4-3.8 3.4-1.2 0-1.8-.7-2.7-.7s-1.5.7-2.7.7c-1.6 0-3.8-1-3.8-3.4 0-2.9 3.2-6.6 6.5-6.6z' + c(4.2, 10.2, 2.2) + c(19.8, 10.2, 2.2) + c(8.6, 5.2, 2.4) + c(15.4, 5.2, 2.4) },
  ].map(i => Object.assign(i, { svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="${i.d}" fill="#000"${i.rule ? ` fill-rule="${i.rule}"` : ''}/></svg>` }));
})();

/* Rytý podklad jako jedno uzavřené těleso (dno, vrch, dno kapes, vnější a vnitřní stěny) */
function cleanEx(exs) {
  const cl = (p) => ClipperLib.Clipper.CleanPolygon(p, 2);
  return exs.map(e => ({ outer: cl(e.outer), holes: e.holes.map(cl).filter(h => h.length > 2) })).filter(e => e.outer.length > 2);
}
function meshBuilder() {
  const pos = [];
  const orient = (path, ccw) => (ClipperLib.Clipper.Orientation(path) === ccw ? path : path.slice().reverse());
  const V = (p, z) => [p.X / SC, p.Y / SC, z];
  const tri = (a, b, c, upWanted) => {
    const nz = (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0]);
    if ((nz > 0) !== upWanted) { const t = b; b = c; c = t; }
    pos.push(...a, ...b, ...c);
  };
  const cap = (outer, holes, z, up) => {
    const o = outer.map(p => new THREE.Vector2(p.X / SC, p.Y / SC));
    const hs = holes.map(h => h.map(p => new THREE.Vector2(p.X / SC, p.Y / SC)));
    const ints = outer.concat(...holes);
    // mřížka vrcholů pro opravu T-spojů (vrchol ležící přesně na hraně trojúhelníku)
    const G = 2000, grid = new Map();
    ints.forEach((p, i) => { const k = Math.floor(p.X / G) + ',' + Math.floor(p.Y / G); (grid.get(k) || grid.set(k, []).get(k)).push(i); });
    const onEdge = (ia, ib) => {
      const a = ints[ia], b = ints[ib];
      const x0 = Math.floor(Math.min(a.X, b.X) / G), x1 = Math.floor(Math.max(a.X, b.X) / G), y0 = Math.floor(Math.min(a.Y, b.Y) / G), y1 = Math.floor(Math.max(a.Y, b.Y) / G);
      if ((x1 - x0 + 1) * (y1 - y0 + 1) > 400) return -1;
      for (let gx = x0; gx <= x1; gx++) for (let gy = y0; gy <= y1; gy++) {
        const cell = grid.get(gx + ',' + gy); if (!cell) continue;
        for (const i of cell) {
          if (i === ia || i === ib) continue; const p = ints[i];
          if ((p.X === a.X && p.Y === a.Y) || (p.X === b.X && p.Y === b.Y)) continue;
          if ((b.X - a.X) * (p.Y - a.Y) - (b.Y - a.Y) * (p.X - a.X) !== 0) continue;
          const t = (p.X - a.X) * (b.X - a.X) + (p.Y - a.Y) * (b.Y - a.Y), L = (b.X - a.X) ** 2 + (b.Y - a.Y) ** 2;
          if (t > 0 && t < L) return i;
        }
      }
      return -1;
    };
    const emit = (i, j, k, depth) => {
      if ((ints[j].X - ints[i].X) * (ints[k].Y - ints[i].Y) - (ints[j].Y - ints[i].Y) * (ints[k].X - ints[i].X) === 0) return; // nulová plocha (tři body v řadě)
      if (depth < 8) {
        let m;
        if ((m = onEdge(i, j)) >= 0) { emit(i, m, k, depth + 1); emit(m, j, k, depth + 1); return; }
        if ((m = onEdge(j, k)) >= 0) { emit(j, m, i, depth + 1); emit(m, k, i, depth + 1); return; }
        if ((m = onEdge(k, i)) >= 0) { emit(k, m, j, depth + 1); emit(m, i, j, depth + 1); return; }
      }
      const P = (n) => [ints[n].X / SC, ints[n].Y / SC, z];
      tri(P(i), P(j), P(k), up);
    };
    for (const f of THREE.ShapeUtils.triangulateShape(o, hs)) emit(f[0], f[1], f[2], 0);
  };
  const wall = (path, z0, z1) => { // stěna s normálou vpravo od směru obíhání
    for (let i = 0; i < path.length; i++) {
      const a = path[i], b = path[(i + 1) % path.length];
      const a0 = V(a, z0), b0 = V(b, z0), b1 = V(b, z1), a1 = V(a, z1);
      pos.push(...a0, ...b0, ...b1, ...a0, ...b1, ...a1);
    }
  };
  const geom = () => { const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); return g; };
  const raw = (a, b, c) => { pos.push(...a, ...b, ...c); };
  return { cap, wall, orient, geom, raw };
}
/* Robustní vytažení ExPolygonů do hranolu (uzavřené těleso) */
function prismSolid(exs, z0, z1) {
  const M = meshBuilder();
  for (const e of cleanEx(exs)) {
    const outer = M.orient(e.outer, true), holes = e.holes.map(h => M.orient(h, false));
    M.cap(outer, holes, z0, false); M.cap(outer, holes, z1, true);
    M.wall(outer, z0, z1); holes.forEach(h => M.wall(h, z0, z1));
  }
  return M.geom();
}
function engravedSolid(baseEx, textEx, T, d) {
  baseEx = cleanEx(baseEx); textEx = cleanEx(textEx);
  const pos = [];
  const orient = (path, ccw) => (ClipperLib.Clipper.Orientation(path) === ccw ? path : path.slice().reverse());
  const V = (p, z) => [p.X / SC, p.Y / SC, z];
  const tri = (a, b, c, upWanted) => {
    const nz = (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0]);
    if ((nz > 0) !== upWanted) { const t = b; b = c; c = t; }
    pos.push(...a, ...b, ...c);
  };
  const cap = (outer, holes, z, up) => {
    const o = outer.map(p => new THREE.Vector2(p.X / SC, p.Y / SC));
    const hs = holes.map(h => h.map(p => new THREE.Vector2(p.X / SC, p.Y / SC)));
    const ints = outer.concat(...holes);
    // mřížka vrcholů pro opravu T-spojů (vrchol ležící přesně na hraně trojúhelníku)
    const G = 2000, grid = new Map();
    ints.forEach((p, i) => { const k = Math.floor(p.X / G) + ',' + Math.floor(p.Y / G); (grid.get(k) || grid.set(k, []).get(k)).push(i); });
    const onEdge = (ia, ib) => {
      const a = ints[ia], b = ints[ib];
      const x0 = Math.floor(Math.min(a.X, b.X) / G), x1 = Math.floor(Math.max(a.X, b.X) / G), y0 = Math.floor(Math.min(a.Y, b.Y) / G), y1 = Math.floor(Math.max(a.Y, b.Y) / G);
      if ((x1 - x0 + 1) * (y1 - y0 + 1) > 400) return -1;
      for (let gx = x0; gx <= x1; gx++) for (let gy = y0; gy <= y1; gy++) {
        const cell = grid.get(gx + ',' + gy); if (!cell) continue;
        for (const i of cell) {
          if (i === ia || i === ib) continue; const p = ints[i];
          if ((p.X === a.X && p.Y === a.Y) || (p.X === b.X && p.Y === b.Y)) continue;
          if ((b.X - a.X) * (p.Y - a.Y) - (b.Y - a.Y) * (p.X - a.X) !== 0) continue;
          const t = (p.X - a.X) * (b.X - a.X) + (p.Y - a.Y) * (b.Y - a.Y), L = (b.X - a.X) ** 2 + (b.Y - a.Y) ** 2;
          if (t > 0 && t < L) return i;
        }
      }
      return -1;
    };
    const emit = (i, j, k, depth) => {
      if ((ints[j].X - ints[i].X) * (ints[k].Y - ints[i].Y) - (ints[j].Y - ints[i].Y) * (ints[k].X - ints[i].X) === 0) return; // nulová plocha (tři body v řadě)
      if (depth < 8) {
        let m;
        if ((m = onEdge(i, j)) >= 0) { emit(i, m, k, depth + 1); emit(m, j, k, depth + 1); return; }
        if ((m = onEdge(j, k)) >= 0) { emit(j, m, i, depth + 1); emit(m, k, i, depth + 1); return; }
        if ((m = onEdge(k, i)) >= 0) { emit(k, m, j, depth + 1); emit(m, i, j, depth + 1); return; }
      }
      const P = (n) => [ints[n].X / SC, ints[n].Y / SC, z];
      tri(P(i), P(j), P(k), up);
    };
    for (const f of THREE.ShapeUtils.triangulateShape(o, hs)) emit(f[0], f[1], f[2], 0);
  };
  const wall = (path, z0, z1) => { // stěna s normálou vpravo od směru obíhání
    for (let i = 0; i < path.length; i++) {
      const a = path[i], b = path[(i + 1) % path.length];
      const a0 = V(a, z0), b0 = V(b, z0), b1 = V(b, z1), a1 = V(a, z1);
      pos.push(...a0, ...b0, ...b1, ...a0, ...b1, ...a1);
    }
  };
  const inside = (pt, path) => ClipperLib.Clipper.PointInPolygon(pt, path) !== 0;
  const tOuters = textEx.map(e => orient(e.outer, true));
  const tHoles = []; textEx.forEach(e => e.holes.forEach(h => tHoles.push(orient(h, false))));
  const topLevel = tOuters.filter(t => !tHoles.some(h => inside(t[0], h)));
  const allBaseHoles = [];
  for (const e of baseEx) {
    const outer = orient(e.outer, true), holes = e.holes.map(h => orient(h, false));
    allBaseHoles.push(...holes);
    cap(outer, holes, 0, false);
    const inner = topLevel.filter(t => inside(t[0], outer));
    const freeHoles = holes.filter(bh => !tHoles.some(h => inside(bh[0], h)));
    cap(outer, freeHoles.concat(inner), T, true);
    wall(outer, 0, T); holes.forEach(h => wall(h, 0, T));
  }
  for (const h of tHoles) { // ostrůvky uvnitř písmen (např. vnitřek „o“) zůstávají nahoře
    const islandOuter = h.slice().reverse();
    const nestedText = tOuters.filter(t => inside(t[0], h));
    const nestedBase = allBaseHoles.filter(bh => inside(bh[0], h) && !nestedText.some(t => inside(bh[0], t)));
    cap(islandOuter, nestedText.concat(nestedBase), T, true);
  }
  for (const e of textEx) {
    const outer = orient(e.outer, true), holes = e.holes.map(h => orient(h, false));
    cap(outer, holes, T - d, true);                         // dno kapsy
    wall(outer.slice().reverse(), T - d, T);                 // stěny kapsy míří dovnitř písmene
    holes.forEach(h => wall(h.slice().reverse(), T - d, T));
  }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  return g;
}

/* ===== Vrstvená tělesa: uzavřený model z vodorovných vrstev (krabičky, Gridfinity, vázy)
   Created by Julius Andy Antoš
   Těleso je složené z vrstev (slab) nad sebou. Každá vrstva má půdorys (ExPolygony v Clipper
   jednotkách) dole a nahoře. Když je horní půdorys jiný se stejným počtem bodů, stěny jsou šikmé.
   Na rozhraní vrstev vzniknou vodorovné plochy (rozdíl půdorysů) a všechny hrany se sešijí
   tak, aby výsledek byl jedno uzavřené těleso bez děr (vhodné pro každý slicer). ===== */

/* Rozdíl ExPolygonů se zachováním bodů na přímkách (potřebné pro sešití) */
function exDiff(aEx, bEx) {
  if (!aEx.length) return [];
  if (!bEx.length) return aEx;
  const c = new ClipperLib.Clipper(); c.PreserveCollinear = true;
  c.AddPaths(exToPaths(aEx), ClipperLib.PolyType.ptSubject, true); c.AddPaths(exToPaths(bEx), ClipperLib.PolyType.ptClip, true);
  const pt = new ClipperLib.PolyTree(); c.Execute(ClipperLib.ClipType.ctDifference, pt, ClipperLib.PolyFillType.pftNonZero, ClipperLib.PolyFillType.pftNonZero);
  return ClipperLib.JS.PolyTreeToExPolygons(pt);
}
function exUnion(list) { return unionEx(list.flatMap(exToPaths)); }
function exInter(aEx, bEx) {
  if (!aEx.length || !bEx.length) return [];
  const c = new ClipperLib.Clipper();
  c.AddPaths(exToPaths(aEx), ClipperLib.PolyType.ptSubject, true); c.AddPaths(exToPaths(bEx), ClipperLib.PolyType.ptClip, true);
  const pt = new ClipperLib.PolyTree(); c.Execute(ClipperLib.ClipType.ctIntersection, pt, ClipperLib.PolyFillType.pftNonZero, ClipperLib.PolyFillType.pftNonZero);
  return ClipperLib.JS.PolyTreeToExPolygons(pt);
}
const exOf = (path) => [{ outer: path, holes: [] }];

/* Zaoblený konvexní mnohoúhelník. Rohy zadané v mm, poloměr r v mm; body v celých µm.
   Střed oblouku se zaokrouhlí na celé µm, takže stejné rohy dvou tvarů mají přesně stejné body. */
function roundedPoly(corners, r, segs) {
  const n = corners.length, out = [], R = Math.round(r * SC);
  for (let i = 0; i < n; i++) {
    const p = corners[(i + n - 1) % n], c = corners[i], q = corners[(i + 1) % n];
    if (R <= 0) { out.push({ X: Math.round(c[0] * SC), Y: Math.round(c[1] * SC) }); continue; }
    const ux = p[0] - c[0], uy = p[1] - c[1], vx = q[0] - c[0], vy = q[1] - c[1];
    const la = Math.hypot(ux, uy), lb = Math.hypot(vx, vy);
    const half = Math.acos(Math.max(-1, Math.min(1, (ux * vx + uy * vy) / (la * lb)))) / 2;
    const bx = ux / la + vx / lb, by = uy / la + vy / lb, bl = Math.hypot(bx, by), dc = r / Math.sin(half);
    const cx = Math.round((c[0] + bx / bl * dc) * SC), cy = Math.round((c[1] + by / bl * dc) * SC);
    const from = Math.atan2(ux, -uy);          // normála ven příchozí hrany (p -> c), obíhání proti směru hodin
    let to = Math.atan2(-vx, vy);              // normála ven odchozí hrany (c -> q)
    while (to < from) to += Math.PI * 2;
    for (let k = 0; k <= segs; k++) { const a = from + (to - from) * k / segs; out.push({ X: cx + Math.round(R * Math.cos(a)), Y: cy + Math.round(R * Math.sin(a)) }); }
  }
  return out;
}
/* obdélník se středem (cx, cy), šířka w, hloubka d, poloměr rohů r (mm) */
function rrect(cx, cy, w, d, r, segs = 8) {
  const x0 = cx - w / 2, x1 = cx + w / 2, y0 = cy - d / 2, y1 = cy + d / 2;
  return roundedPoly([[x0, y0], [x1, y0], [x1, y1], [x0, y1]], Math.max(0, Math.min(r, w / 2 - 0.01, d / 2 - 0.01)), segs);
}
function regPoly(cx, cy, R, n, r, segs = 6, rot = 0) { // R = poloměr opsané kružnice
  const c = []; for (let i = 0; i < n; i++) { const a = rot + i / n * Math.PI * 2; c.push([cx + R * Math.cos(a), cy + R * Math.sin(a)]); }
  return roundedPoly(c, r, segs);
}
function circ(cx, cy, r, n) {
  n = n || Math.max(24, Math.min(160, Math.round(r * 6)));
  const C = [Math.round(cx * SC), Math.round(cy * SC)], R = r * SC, p = [];
  for (let i = 0; i < n; i++) { const a = i / n * Math.PI * 2; p.push({ X: C[0] + Math.round(R * Math.cos(a)), Y: C[1] + Math.round(R * Math.sin(a)) }); }
  return p;
}

/* Hlavní funkce. slabs: [{ z0, z1, ex, top? }] zdola nahoru, z1 jedné = z0 další.
   top = ExPolygony se stejnou strukturou a počtem bodů jako ex (šikmé stěny); bez top jsou stěny svislé. */
function stackSolid(slabs) {
  const orientEx = (exs, ref) => exs.map((e, i) => {
    const r = ref ? ref[i] : null;
    const fo = r ? r.fo : ClipperLib.Clipper.Orientation(e.outer) !== true;
    const fh = e.holes.map((h, k) => r ? r.fh[k] : ClipperLib.Clipper.Orientation(h) !== false);
    return { outer: fo ? e.outer.slice().reverse() : e.outer, holes: e.holes.map((h, k) => fh[k] ? h.slice().reverse() : h), fo, fh };
  });
  const S = slabs.filter(s => s.z1 > s.z0 + 1e-6 && s.ex && s.ex.length).map(s => {
    const ex = s.top ? s.ex : cleanEx(s.ex);
    const bot = orientEx(ex); const top = s.top ? orientEx(s.top, bot) : bot;
    return { z0: s.z0, z1: s.z1, bot, top };
  });
  const M = meshBuilder();
  const n = S.length; if (!n) return M.geom();
  // hladiny: dole spodní vrstva, nahoře horní; rozhraní mezi vrstvami
  const levels = [];
  for (let j = 0; j <= n; j++) {
    const lower = j > 0 ? S[j - 1].top : [], upper = j < n ? S[j].bot : [];
    const z = j < n ? S[j].z0 : S[n - 1].z1;
    if (j > 0 && j < n && Math.abs(S[j - 1].z1 - S[j].z0) > 1e-6) throw new Error('Vrstvy na sebe nenavazují');
    const up = cleanEx(exDiff(lower, upper)), down = cleanEx(exDiff(upper, lower));
    // body na hladině (všechny obrysy) pro sešití hran
    const pts = [], grid = new Map(), G = 2000;
    const add = (path) => { for (const p of path) pts.push(p); };
    for (const list of [lower, upper, up, down]) for (const e of list) { add(e.outer); e.holes.forEach(add); }
    pts.forEach((p, i) => { const k = Math.floor(p.X / G) + ',' + Math.floor(p.Y / G); (grid.get(k) || grid.set(k, []).get(k)).push(i); });
    levels.push({ z, up, down, pts, grid, G });
  }
  const TOL = 3; // µm
  // body ležící na hraně a->b (bez krajních), seřazené podle polohy
  function onSeg(L, a, b) {
    const dx = b.X - a.X, dy = b.Y - a.Y, len2 = dx * dx + dy * dy; if (!len2) return [];
    const len = Math.sqrt(len2), res = [], G = L.G;
    const x0 = Math.floor((Math.min(a.X, b.X) - TOL) / G), x1 = Math.floor((Math.max(a.X, b.X) + TOL) / G);
    const y0 = Math.floor((Math.min(a.Y, b.Y) - TOL) / G), y1 = Math.floor((Math.max(a.Y, b.Y) + TOL) / G);
    const test = (i) => {
      const p = L.pts[i];
      if ((p.X === a.X && p.Y === a.Y) || (p.X === b.X && p.Y === b.Y)) return;
      const t = ((p.X - a.X) * dx + (p.Y - a.Y) * dy) / len2; if (t <= 0 || t >= 1) return;
      const dist = Math.abs((p.X - a.X) * dy - (p.Y - a.Y) * dx) / len; if (dist > TOL) return;
      if (t * len < 0.5 || (1 - t) * len < 0.5) return;
      res.push({ p, t });
    };
    if ((x1 - x0 + 1) * (y1 - y0 + 1) <= 4000) {
      for (let gx = x0; gx <= x1; gx++) for (let gy = y0; gy <= y1; gy++) { const cell = L.grid.get(gx + ',' + gy); if (cell) cell.forEach(test); }
    } else for (let i = 0; i < L.pts.length; i++) test(i);
    res.sort((u, v) => u.t - v.t);
    const out = []; for (const r of res) { const l = out[out.length - 1]; if (!l || l.p.X !== r.p.X || l.p.Y !== r.p.Y) out.push(r); }
    return out;
  }
  function densify(path, L) {
    const out = [];
    for (let i = 0; i < path.length; i++) { const a = path[i], b = path[(i + 1) % path.length]; out.push(a); for (const r of onSeg(L, a, b)) out.push(r.p); }
    return out;
  }
  // vodorovné plochy
  for (const L of levels) {
    for (const [list, up] of [[L.up, true], [L.down, false]])
      for (const e of list) {
        const outer = densify(M.orient(e.outer, true), L), holes = e.holes.map(h => densify(M.orient(h, false), L));
        M.cap(outer, holes, L.z, up);
      }
  }
  // stěny (svislé nebo šikmé), sešité se zipem bodů dole a nahoře
  const P = (p, z) => [p.X / SC, p.Y / SC, z];
  function wallLoop(lb, lt, z0, z1, L0, L1) {
    const m = lb.length;
    for (let i = 0; i < m; i++) {
      const a0 = lb[i], b0 = lb[(i + 1) % m], a1 = lt[i], b1 = lt[(i + 1) % m];
      const B = [{ p: a0, t: 0 }].concat(onSeg(L0, a0, b0), [{ p: b0, t: 1 }]);
      const T = [{ p: a1, t: 0 }].concat(onSeg(L1, a1, b1), [{ p: b1, t: 1 }]);
      let bi = 0, ti = 0;
      while (bi < B.length - 1 || ti < T.length - 1) {
        const advB = ti >= T.length - 1 || (bi < B.length - 1 && B[bi + 1].t <= T[ti + 1].t);
        if (advB) { M.raw(P(B[bi].p, z0), P(B[bi + 1].p, z0), P(T[ti].p, z1)); bi++; }
        else { M.raw(P(B[bi].p, z0), P(T[ti + 1].p, z1), P(T[ti].p, z1)); ti++; }
      }
    }
  }
  S.forEach((s, i) => {
    s.bot.forEach((e, k) => {
      const t = s.top[k];
      wallLoop(e.outer, t.outer, s.z0, s.z1, levels[i], levels[i + 1]);
      e.holes.forEach((h, hk) => wallLoop(h, t.holes[hk], s.z0, s.z1, levels[i], levels[i + 1]));
    });
  });
  return M.geom();
}

/* Kontrola uzavřenosti: každá hrana musí být použita právě dvakrát, jednou v každém směru */
function meshCheck(geom) {
  const p = geom.attributes.position.array, key = (i) => Math.round(p[i] * 1e4) + ',' + Math.round(p[i + 1] * 1e4) + ',' + Math.round(p[i + 2] * 1e4);
  const E = new Map(); let bad = 0;
  for (let i = 0; i < p.length; i += 9) {
    const k = [key(i), key(i + 3), key(i + 6)];
    for (let j = 0; j < 3; j++) { const a = k[j], b = k[(j + 1) % 3]; if (a === b) continue; E.set(a + '|' + b, (E.get(a + '|' + b) || 0) + 1); }
  }
  for (const [e, c] of E) { const [a, b] = e.split('|'); if (E.get(b + '|' + a) !== c || c !== 1) bad++; }
  return { edges: E.size, bad };
}

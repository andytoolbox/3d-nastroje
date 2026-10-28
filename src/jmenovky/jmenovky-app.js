/* ===== Jmenovky – velké písmeno se vsazeným jménem. Created by Julius Andy Antoš ===== */
const $ = (id) => document.getElementById(id);
// písma: id -> [název, je pro velké písmeno, je pro jméno]
const FONTS = {
  playfair: ['Playfair', 1, 0], dejavu: ['DejaVu Serif', 1, 0], anton: ['Anton', 1, 0], bebas: ['Bebas Neue', 1, 0], poppins: ['Poppins', 1, 0],
  baloo: ['Baloo', 1, 0], bungee: ['Bungee', 1, 0], righteous: ['Righteous', 1, 0], lobsterB: ['Lobster', 1, 0],
  pacifico: ['Pacifico', 0, 1], norican: ['Norican', 0, 1], damion: ['Damion', 0, 1], dancing: ['Dancing Script', 0, 1], lobster: ['Lobster', 0, 1],
  grandhotel: ['Grand Hotel', 0, 1], playball: ['Playball', 0, 1], greatvibes: ['Great Vibes', 0, 1],
};
const DEF = { name: 'Amélie', letter: '', fBig: 'playfair', fName: 'pacifico', H: 100, T: 16, ch: 1.6, base: 'auto', nw: 92, ny: 24, nx: 0, rot: 0, bold: 0.3, d: 1.2, r: 0.8, rw: 0.6, rh: 0.4, lemSame: true, out: 'full',
  mode: 'one', colors: 'swap', clr: 0.15, c1: '#74c2a8', c2: '#f6f1e7', c3: '#e88fa6', lh: 0.2, bedX: 220, bedY: 220, bedZ: 250 };
const STORE = 'jmenovky-v3';
const D = Object.assign({}, DEF);
try { const s = JSON.parse(localStorage.getItem(STORE) || '{}'); for (const k in DEF) if (k in s && typeof s[k] === typeof DEF[k]) D[k] = s[k]; } catch (e) {}
if (!FONTS[D.fBig] || !FONTS[D.fBig][1]) D.fBig = DEF.fBig; if (!FONTS[D.fName] || !FONTS[D.fName][2]) D.fName = DEF.fName;
const saveState = () => { try { localStorage.setItem(STORE, JSON.stringify(D)); } catch (e) {} };
const fmt = (v, d = 1) => (+v).toLocaleString('cs-CZ', { maximumFractionDigits: d, minimumFractionDigits: d });
const fmtP = (v) => (+v).toLocaleString('cs-CZ', { maximumFractionDigits: 2 });
const css = (v) => getComputedStyle(document.documentElement).getPropertyValue(v).trim();
const clamp = (v, a, b) => Math.min(b, Math.max(a, +v || 0));

/* ===== Písma ===== */
const FONT_CACHE = {};
const fontBuf = (id) => { const s = atob(JM_FONTS[id]), u = new Uint8Array(s.length); for (let i = 0; i < s.length; i++) u[i] = s.charCodeAt(i); return u.buffer; };
function getFont(id) { if (!FONT_CACHE[id]) FONT_CACHE[id] = opentype.parse(fontBuf(id)); return FONT_CACHE[id]; }

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
const csBox = (x0, y0, x1, y1) => T(T(MF.CrossSection.square([x1 - x0, y1 - y0])).translate([x0, y0]));
const csArea = (cs) => cs.area();
// vyčištění 2D tvaru: odstraní dotyky v jednom bodě a téměř shodné vrcholy, které by v 3D daly nečisté hrany
const cl = (cs) => T(T(T(cs.offset(-0.03, 'Round')).offset(0.03, 'Round')).simplify(0.002));
const empty = (cs) => !cs || cs.isEmpty() || cs.area() < 0.01;

/* text -> 2D tvar (mm, osa y nahoru) */
function textCS(fontId, text, size) {
  const font = getFont(fontId);
  const L = layoutText(font, text, { size, lineH: 1.2, spacing: 0, align: 'left', mirror: false, slant: 0 });
  const exs = unionEx(L.paths);
  const polys = exToPaths(exs).map(p => p.map(q => [q.X / SC, q.Y / SC]));
  return { cs: T(T(new MF.CrossSection(polys, 'NonZero')).simplify(0.002)), exs, missing: L.missing };
}
// těžiště plochy (pro kontrolu, jestli písmeno stojí)
function centroid(cs) { let A = 0, cx = 0; for (const p of cs.toPolygons()) for (let i = 0, j = p.length - 1; i < p.length; j = i++) { const f = p[j][0] * p[i][1] - p[i][0] * p[j][1]; A += f; cx += (p[j][0] + p[i][0]) * f; } return A ? cx / (3 * A) : 0; }

// části jména, které neleží na písmenu (háčky, čárky, tečky, konec jména), by po postavení odpadly: připojí se můstkem
function anchorIslands(S, Lc, w) {
  const comps = S.decompose(), pts = (cs) => cs.toPolygons().flat();
  const anchored = [], loose = [];
  for (const c of comps) { T(c); const a = c.area(); if (a < 0.05) continue; const ov = T(c.intersect(Lc)).area(); (ov > Math.min(a * 0.15, 4) ? anchored : loose).push(c); }
  if (!loose.length) return { S, n: 0 };
  const bridges = [];
  let target = pts(Lc).concat(...anchored.map(pts));
  // nejdřív připojí kousky nejblíž k ukotveným, ty se pak samy stávají kotvou pro další
  while (loose.length) {
    let best = null;
    loose.forEach((c, i) => { for (const p of pts(c)) for (const q of target) { const d = (p[0] - q[0]) ** 2 + (p[1] - q[1]) ** 2; if (!best || d < best.d) best = { d, p, q, i }; } });
    const c = loose.splice(best.i, 1)[0], [p, q] = [best.p, best.q], L = Math.sqrt(best.d);
    if (L > 0.01) { const ux = (q[0] - p[0]) / L, uy = (q[1] - p[1]) / L, e = w * 0.8, nx = -uy * w / 2, ny = ux * w / 2;
      const a = [p[0] - ux * e, p[1] - uy * e], b = [q[0] + ux * e, q[1] + uy * e];
      bridges.push(T(new MF.CrossSection([[[a[0] + nx, a[1] + ny], [b[0] + nx, b[1] + ny], [b[0] - nx, b[1] - ny], [a[0] - nx, a[1] - ny]]], 'NonZero'))); }
    target = target.concat(pts(c));
  }
  return { S: cl(T(MF.CrossSection.union([S, ...bridges]))), n: bridges.length };
}

/* ===== Geometrie ===== */
function initialOf(name) { const ch = [...name.trim()][0] || ''; return ch.toLocaleUpperCase('cs'); }
function build(msgs) {
  const name = (D.name || '').trim(), letter = (D.letter || '').trim() ? [...D.letter.trim()][0].toLocaleUpperCase('cs') : initialOf(name);
  if (!letter) { msgs.push({ lvl: 'bad', msg: 'Napište jméno nebo velké písmeno.' }); return null; }
  const H = clamp(D.H, 30, 300), Th = clamp(D.T, 3, 60), ch = Math.min(clamp(D.ch, 0, 5), Th * 0.3), lh = clamp(D.lh, 0.05, 0.4);
  // velké písmeno: výška přesně H, střed na x = 0, spodek na y = 0
  const L0 = textCS(D.fBig, letter, 100);
  if (L0.missing.length || empty(L0.cs)) { msgs.push({ lvl: 'bad', msg: `Písmeno „${letter}“ toto písmo neumí. Zvolte jiné.` }); return null; }
  let b = L0.cs.bounds(), k = H / (b.max[1] - b.min[1]);
  let Lc = T(T(L0.cs.translate([-(b.min[0] + b.max[0]) / 2, -b.min[1]])).scale([k, k]));
  { // háček nebo čárka velkého písmene (Š, Č, Á…) je samostatný kousek: připojí se k písmenu
    const comps = Lc.decompose().map(c => T(c)).sort((p, q) => q.area() - p.area());
    if (comps.length > 1) { const r0 = anchorIslands(Lc, comps[0], Math.max(2, H * 0.03)); Lc = r0.S; if (r0.n) msgs.push({ lvl: 'info', msg: 'Háček nebo čárka velkého písmene je k písmenu připojená můstkem, aby držela.' }); }
  }
  b = Lc.bounds(); let LW = b.max[0] - b.min[0], LH = b.max[1] - b.min[1];
  const full = D.mode === 'one' && D.out === 'full';

  // jméno psacím písmem, zesílené a umístěné na písmeno
  let S = null, sc = 1;
  if (name) {
    const N0 = textCS(D.fName, name, 10);
    if (N0.missing.length) msgs.push({ lvl: 'warn', msg: `Písmo jména neumí znaky: ${N0.missing.join(' ')}` });
    if (!empty(N0.cs)) {
      const nb = N0.cs.bounds(); sc = clamp(D.nw, 40, 160) / 100 * LW / (nb.max[0] - nb.min[0]);
      const cx = clamp(D.nx, -50, 50) / 100 * LW, cy = clamp(D.ny, 0, 100) / 100 * LH, bold = clamp(D.bold, 0, 1.5);
      S = T(T(T(T(N0.cs.translate([-(nb.min[0] + nb.max[0]) / 2, -(nb.min[1] + nb.max[1]) / 2])).scale([sc, sc])).rotate(clamp(D.rot, -30, 30))).translate([cx, cy]));
      if (bold > 0) S = T(S.offset(bold / 2, 'Round'));
      S = T(S.intersect(csBox(-1e4, 0, 1e4, 1e4)));
      if (!full) { const before = S.area(); S = T(S.intersect(T(Lc.offset(-0.83, 'Round')))); if (S.area() < before * 0.97) msgs.push({ lvl: 'info', msg: 'Část jména leží mimo písmeno a je oříznutá. Zmenšete šířku jména nebo ho posuňte.' }); }
      S = cl(S); if (empty(S)) S = null;
      const loss = thinLoss(N0.exs, Math.max(0.1, 0.8 - bold) / sc);
      if (loss > 0.1) msgs.push({ lvl: 'warn', msg: `Část tahů jména je tenčí než 0,8 mm (asi ${Math.round(loss * 100)} %). Zvětšete jméno, přidejte zesílení písma nebo zvolte silnější písmo.` });
    }
  }
  // stabilita: spodek se zarovná, a když by písmeno se jménem nestálo, přidá se podstavec
  const base = full && S ? T(MF.CrossSection.union([Lc, S])) : Lc, bb = base.bounds(), BW = bb.max[0] - bb.min[0];
  const need = Math.min(Math.max(Th, 10), BW * 0.3), margin = Math.max(2, BW * 0.06), cen = centroid(base);
  let cut = -1;
  for (let c = 0; c <= H * 0.06; c += 0.25) {
    const strip = T(base.intersect(csBox(-1e4, c, 1e4, c + 0.4))); if (empty(strip)) continue;
    const sb = strip.bounds(), len = strip.area() / 0.4;
    if (len >= need && cen > sb.min[0] + margin && cen < sb.max[0] - margin) { cut = c; break; }
  }
  let plinth = D.base === 'always' || (D.base === 'auto' && cut < 0);
  if (plinth) {
    const hb = Math.max(3, Math.round(H * 0.05)), pl = T(T(MF.CrossSection.square([BW + 4, hb + 0.8])).translate([bb.min[0] - 2, -hb]));
    Lc = T(T(MF.CrossSection.union([Lc, cl(T(T(pl.offset(-1, 'Round')).offset(1, 'Round')))])).translate([0, hb]));
    if (S) S = T(S.translate([0, hb]));
    msgs.push({ lvl: 'info', msg: D.base === 'always' ? 'Písmeno má podstavec.' : 'Písmeno by se jménem samo nestálo, proto má nízký podstavec. Můžete ho vypnout.' });
  } else if (cut > 0.01) {
    Lc = T(T(Lc.intersect(csBox(-1e4, cut, 1e4, 1e4))).translate([0, -cut]));
    if (S) { S = cl(T(T(S.translate([0, -cut])).intersect(csBox(-1e4, 0, 1e4, 1e4)))); if (empty(S)) S = null; }
    if (cut > 1) msgs.push({ lvl: 'info', msg: `Spodek písmene je zarovnaný o ${fmtP(Math.round(cut * 10) / 10)} mm, aby stálo.` });
  } else if (cut < 0) msgs.push({ lvl: 'warn', msg: 'Písmeno bez podstavce asi nebude stát. Zapněte podstavec nebo posuňte jméno.' });
  if (S && full) { const r0 = anchorIslands(S, Lc, Math.max(1.2, clamp(D.bold, 0, 1.5) + 1)); S = r0.S; if (r0.n) msgs.push({ lvl: 'info', msg: r0.n === 1 ? 'Jedna část jména (háček, čárka nebo tečka) leží mimo písmeno, proto je k němu připojená tenkým můstkem, aby neodpadla.' : `${r0.n} části jména (háčky, čárky, tečky) leží mimo písmeno, proto jsou připojené tenkými můstky, aby neodpadly.` }); }
  b = Lc.bounds(); LW = b.max[0] - b.min[0]; LH = b.max[1] - b.min[1];
  // písmeno se zkosením (schody po výšce vrstvy)
  const parts = [ext(Lc, 0, Th - ch)];
  if (ch > 0.05) { const n = Math.max(1, Math.round(ch / lh)); for (let i = 1; i <= n; i++) { const o = cl(T(Lc.offset(-ch * i / n, 'Round'))); if (!empty(o)) parts.push(ext(o, Th - ch - 0.3 - i * 0.0137, Th - ch + ch * i / n)); } }
  const letterSolid = T(MF.Manifold.union(parts));
  if (Th < H * 0.1) msgs.push({ lvl: 'info', msg: 'Tenké písmeno se snadno převrhne. Na stání doporučuji tloušťku aspoň desetinu výšky.' });

  const bodies = [], swaps = [];
  if (!S) { bodies.push({ m: letterSolid, role: 1, name: 'pismeno' }); return { bodies, swaps, letter, name, H, Th, LW, LH, lh }; }
  const d = Math.min(clamp(D.d, 0.4, 10), Th - 1); let r = clamp(D.r, 0, 5);
  const rw = clamp(D.rw, 0, 3); let rh = clamp(D.rh, 0, 3);
  const swap = D.colors === 'swap', rimRole = D.lemSame ? 1 : 3;
  // lem = pás podél okraje písmen jména; výplň = zbytek uvnitř
  const inner = rw > 0 ? cl(T(S.offset(-rw, 'Round'))) : null;
  const hasRim = rw > 0, hasIn = hasRim && inner && !empty(inner);
  // lem nad jménem: jméno se vytáhne o výšku lemu výš a výplň uvnitř lemu se vybere zpět dolů
  const cutIn = (z0, z1) => hasIn ? ext(inner, z0, z1) : null;
  if (swap && D.mode === 'one' && r < 0.4) { r = 0.4; msgs.push({ lvl: 'info', msg: 'Při výměně filamentu musí jméno vystupovat nad písmeno, výška je upravená na 0,4 mm. Zarovnané jméno jde vytisknout na vícebarevné tiskárně nebo zvlášť.' }); }
  if (swap && hasRim && rh < 0.4) { rh = 0.4; msgs.push({ lvl: 'info', msg: 'Při výměně filamentu musí lem vystupovat nad jméno, aby měl svou barvu. Výška lemu je upravená na 0,4 mm.' }); }
  const rimUp = hasRim && rh > 0;
  if (hasRim && !hasIn) msgs.push({ lvl: 'info', msg: 'Lem je na tahy písma moc široký, celé jméno je lemem. Zmenšete šířku lemu.' });
  if (D.mode === 'one') {
    const zb = Th - d, top = Th + r;
    if (swap) {
      let nm = ext(S, full ? 0 : zb, top + (rimUp ? rh : 0)); if (rimUp && hasIn) nm = sub(nm, cutIn(top, top + rh + 1));
      const m = U([letterSolid, nm]);
      const bands = [[0, 1], [Th, 2]]; swaps.push([Th, 2]); if (rimUp) { bands.push([top, rimRole]); swaps.push([top, rimRole]); }
      bodies.push({ m, role: 0, name: 'jmenovka', bands });
    } else {
      const outside = full ? T(sub(ext(S, 0, zb + 0.3), ext(Lc, -1, Th + 1))) : null;
      const NS = U([ext(S, zb, top), outside && outside.volume() > 0.01 ? outside : null]);
      bodies.push({ m: sub(letterSolid, ext(S, zb, top + 1)), role: 1, name: 'pismeno' });
      if (hasRim) {
        const all = rimUp ? U([NS, ext(S, top - 0.3, top + rh)]) : NS;
        if (hasIn) bodies.push({ m: T(NS.intersect(cutIn(-1, top + 1))), role: 2, name: 'jmeno' });
        bodies.push({ m: hasIn ? sub(all, cutIn(-1, top + rh + 1)) : all, role: rimRole, name: 'lem' });
      } else bodies.push({ m: NS, role: 2, name: 'jmeno' });
    }
    const out = full ? T(S.subtract(Lc)) : null;
    if (out && out.area() > 1) msgs.push({ lvl: 'info', msg: 'Část jména je mimo písmeno, tam je jméno vytištěné v celé tloušťce, takže drží a tiskne se bez podpěr.' });
  } else { // jméno zvlášť a vsadit do vybrání
    const clr = clamp(D.clr, 0, 0.6), h = d + r, ob = S.bounds(), dx = b.max[0] - ob.min[0] + 8, asm = [0, 0, Th - d];
    bodies.push({ m: sub(letterSolid, ext(cl(T(S.offset(clr, 'Round'))), Th - d, Th + 1)), role: 1, name: 'pismeno' });
    if (swap || !hasRim) {
      const m = rimUp && hasIn ? sub(ext(S, 0, h + rh), cutIn(h, h + rh + 1)) : ext(S, 0, h + (rimUp ? rh : 0));
      bodies.push({ m, role: rimUp ? 0 : 2, name: 'jmeno', bands: rimUp ? [[0, 2], [h, rimRole]] : null, print: [dx, 0, 0], asm });
      if (rimUp) swaps.push([h, rimRole]);
    } else {
      if (hasIn) bodies.push({ m: cutIn(0, h), role: 2, name: 'jmeno', print: [dx, 0, 0], asm });
      bodies.push({ m: hasIn ? sub(ext(S, 0, h + rh), cutIn(-1, h + rh + 1)) : ext(S, 0, h + rh), role: rimRole, name: 'lem', print: [dx, 0, 0], asm });
    }
    msgs.push({ lvl: 'info', msg: `Jméno se tiskne zvlášť, ${fmtP(h)} mm vysoké, a vsadí se do vybrání hlubokého ${fmtP(d)} mm s vůlí ${fmtP(clr)} mm.` });
  }
  return { bodies, swaps, letter, name, H, Th, LW, LH, lh };
}

/* ===== Ovládání ===== */
function syncUI() {
  document.querySelectorAll('[data-k]').forEach(el => { const v = D[el.dataset.k]; if (el.type === 'checkbox') el.checked = !!v; else el.value = v; });
  document.querySelectorAll('input[type=radio][name]').forEach(r => { r.checked = String(D[r.name]) === r.value; });
  updateUI();
}
function updateUI() {
  document.querySelectorAll('[data-show]').forEach(el => { el.hidden = !({ rim: +D.rw > 0, rimCol: +D.rw > 0 && !D.lemSame, onePiece: D.mode === 'one', parts: D.mode === 'parts' })[el.dataset.show]; });
  document.querySelectorAll('#fBig [data-v]').forEach(b => b.setAttribute('aria-checked', String(b.dataset.v === D.fBig)));
  document.querySelectorAll('#fName [data-v]').forEach(b => b.setAttribute('aria-checked', String(b.dataset.v === D.fName)));
  $('oW').textContent = D.nw + ' %'; $('oY').textContent = D.ny + ' %'; $('oX').textContent = (D.nx > 0 ? '+' : '') + D.nx + ' %'; $('oR').textContent = D.rot + '°';
  $('inLetter').placeholder = initialOf(D.name || '') || 'A';
  const rim = +D.rw > 0;
  $('modeHint').textContent = D.mode === 'one'
    ? (D.colors === 'swap' ? `Jeden soubor. Barva se mění podle výšky: písmeno, nad ním jméno${rim ? ' a nahoře lem okrajů písmen' : ''}.` : `${rim ? 'Tři' : 'Dva'} soubory se stejným umístěním: písmeno, jméno${rim ? ' a lem' : ''}. Načtěte je najednou jako jeden objekt.`)
    : (D.colors === 'swap' ? `Písmeno s vybráním a jméno zvlášť${rim ? ' (nahoře lem jinou barvou)' : ''}. Jméno vsadíte do vybrání.` : `Písmeno s vybráním a jméno${rim ? ' s lemem (dva díly jednoho objektu)' : ''} zvlášť.`);
}
(function () {
  const mk = (box, key, filt, sample) => { for (const id in FONTS) { if (!FONTS[id][filt]) continue; const b = document.createElement('button'); b.type = 'button'; b.setAttribute('role', 'radio'); b.dataset.v = id;
    b.innerHTML = `<span style="font-family:'jm-${id}',var(--f-ui)">${sample}</span><small>${FONTS[id][0]}</small>`; b.onclick = () => { D[key] = id; syncUI(); onChange(key); }; box.append(b); } };
  mk($('fBig'), 'fBig', 1, 'A'); mk($('fName'), 'fName', 2, 'Jana');
  if (window.FontFace) for (const id in FONTS) { try { const f = new FontFace('jm-' + id, fontBuf(id)); f.load().then(ff => document.fonts.add(ff)).catch(() => {}); } catch (e) {} }
})();
function onChange(path) { if (/^(H|T|mode|fBig|letter)$/.test(path)) fitNext = true; updateUI(); saveState(); if (/^c[123]$/.test(path)) { recolor(); return; } schedule(); }
document.querySelectorAll('[data-k]').forEach(el => el.addEventListener(el.type === 'checkbox' || el.type === 'color' ? (el.type === 'color' ? 'input' : 'change') : 'input', () => {
  const k = el.dataset.k; let v;
  if (el.type === 'checkbox') v = el.checked; else if (el.type === 'text' || el.type === 'color') v = el.value; else { v = parseFloat(el.value); if (!isFinite(v)) return; }
  D[k] = v; onChange(k);
}));
document.querySelectorAll('input[type=radio][name]').forEach(r => r.addEventListener('change', () => { D[r.name] = r.value; onChange(r.name); }));
let tmr = 0;
function schedule(now) { clearTimeout(tmr); tmr = setTimeout(() => { if (!MF) return; busy(true, 'Počítám…'); setTimeout(() => { try { rebuild(); } finally { busy(false); } }, 20); }, now ? 0 : 350); }
function busy(on, txt) { $('busy').hidden = !on; if (txt) $('busy').textContent = txt; }

/* ===== 3D scéna ===== */
const cv = $('cv');
let renderer = null, scene, camera, bedGroup, group = null, fitNext = true, model = null, stand = true;
const orbit = { theta: -Math.PI / 2, phi: 1.2, r: 300, target: new THREE.Vector3() };
function initGL() {
  try { renderer = new THREE.WebGLRenderer({ canvas: cv, antialias: true }); } catch (e) { renderer = null; return; }
  renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
  scene = new THREE.Scene(); camera = new THREE.PerspectiveCamera(30, 1, 0.5, 6000); camera.up.set(0, 0, 1);
  scene.add(new THREE.HemisphereLight(0xffffff, 0x8a9599, 0.95));
  const d1 = new THREE.DirectionalLight(0xffffff, 0.6); d1.position.set(-150, -220, 260); scene.add(d1);
  const d2 = new THREE.DirectionalLight(0xffffff, 0.3); d2.position.set(240, 120, 140); scene.add(d2);
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
function viewBox() { const bb = new THREE.Box3(); if (group) bb.setFromObject(group); return bb; }
function fit(view) {
  if (!group || !renderer) return; const b = viewBox(), sx = b.max.x - b.min.x, sy = b.max.y - b.min.y, sz = b.max.z - b.min.z;
  orbit.target.set((b.min.x + b.max.x) / 2, (b.min.y + b.max.y) / 2, sz / 2); const span = Math.max(sx, sy, sz, 20);
  orbit.r = span / (2 * Math.tan(THREE.MathUtils.degToRad(30) / 2)) * Math.max(1.35, 1.7 / camera.aspect);
  if (view === 'front') { orbit.theta = -Math.PI / 2; orbit.phi = stand ? Math.PI / 2 - 0.03 : 0.001; } else { orbit.theta = -Math.PI / 2 - 0.5; orbit.phi = stand ? 1.25 : 0.85; }
  draw();
}
$('vFront').onclick = () => fit('front'); $('vPersp').onclick = () => fit('persp');
$('vStand').onclick = () => { stand = !stand; $('vStand').setAttribute('aria-pressed', String(stand)); $('vStand').textContent = stand ? 'Jak stojí' : 'Jak se tiskne'; placeGroup(); fit('persp'); };
const ptrs = new Map(); let pinch0 = 0, r0 = 0;
cv.addEventListener('contextmenu', e => e.preventDefault());
cv.addEventListener('pointerdown', e => { cv.setPointerCapture(e.pointerId); ptrs.set(e.pointerId, { x: e.clientX, y: e.clientY, b: e.button, shift: e.shiftKey }); if (ptrs.size === 2) { const [a, b] = [...ptrs.values()]; pinch0 = Math.hypot(a.x - b.x, a.y - b.y); r0 = orbit.r; } });
cv.addEventListener('pointermove', e => { const p = ptrs.get(e.pointerId); if (!p) return; const dx = e.clientX - p.x, dy = e.clientY - p.y; p.x = e.clientX; p.y = e.clientY;
  if (ptrs.size === 2) { const [a, b] = [...ptrs.values()]; const d = Math.hypot(a.x - b.x, a.y - b.y); if (pinch0) orbit.r = r0 * pinch0 / d; }
  else if (p.b === 2 || p.shift) { const k = orbit.r * 0.0016, right = new THREE.Vector3(), up = new THREE.Vector3(); camera.matrixWorld.extractBasis(right, up, new THREE.Vector3()); orbit.target.addScaledVector(right, -dx * k).addScaledVector(up, dy * k); }
  else { orbit.theta -= dx * 0.008; orbit.phi = Math.min(Math.PI - 0.05, Math.max(0.001, orbit.phi - dy * 0.008)); } draw(); });
const pup = e => { ptrs.delete(e.pointerId); if (ptrs.size < 2) pinch0 = 0; }; cv.addEventListener('pointerup', pup); cv.addEventListener('pointercancel', pup);
cv.addEventListener('wheel', e => { e.preventDefault(); orbit.r = Math.min(6000, Math.max(5, orbit.r * Math.exp(e.deltaY * 0.0012))); draw(); }, { passive: false });
function showMsgs(list) { const bx = $('msgs'); bx.textContent = ''; for (const m of list) { const d = document.createElement('div'); d.className = 'msg ' + m.lvl; d.textContent = m.msg; bx.append(d); } }

// barvy v náhledu: u jednoho tělesa s výměnou filamentu se barví podle výšky
const colOf = (role) => D['c' + role];
function bandMaterial(bands) {
  const mat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.55, metalness: 0.02, flatShading: true }); mat.userData.bands = bands; return mat;
}
function paint(mesh) {
  const g = mesh.geometry, bands = mesh.userData.bands, role = mesh.userData.role;
  if (!bands) { mesh.material.color = new THREE.Color(colOf(role)); return; }
  const p = g.attributes.position.array, n = p.length / 3, c = new Float32Array(n * 3), cols = bands.map(b => new THREE.Color(colOf(b[1])));
  for (let t = 0; t < n; t += 3) { const zc = (p[3 * t + 2] + p[3 * t + 5] + p[3 * t + 8]) / 3; let k = 0; for (let i = 0; i < bands.length; i++) if (zc > bands[i][0] + 0.001) k = i;
    for (let j = 0; j < 3; j++) { c[3 * (t + j)] = cols[k].r; c[3 * (t + j) + 1] = cols[k].g; c[3 * (t + j) + 2] = cols[k].b; } }
  g.setAttribute('color', new THREE.BufferAttribute(c, 3));
}
function recolor() { if (!group) return; group.children.forEach(m => paint(m)); draw(); updateSwaps(); }
function placeGroup() {
  if (!group || !model) return;
  const zmin = model.zmin;
  group.children.forEach(m => { const it = m.userData.item, t = stand ? (it.asm || [0, 0, 0]) : (it.print || [0, 0, 0]); m.position.set(t[0], t[1], t[2] - zmin); });
  group.rotation.set(stand ? Math.PI / 2 : 0, 0, 0); group.position.set(0, 0, 0);
  group.updateMatrixWorld(true); const bb = new THREE.Box3().setFromObject(group);
  group.position.set(-(bb.min.x + bb.max.x) / 2, -(bb.min.y + bb.max.y) / 2, -bb.min.z);
  draw();
}

/* ===== Výpočet ===== */
function rebuild() {
  const msgs = []; let r = null;
  try { r = build(msgs); } catch (e) { console.error(e); msgs.push({ lvl: 'bad', msg: 'Jmenovku se nepodařilo spočítat. Zkuste jiné písmo nebo rozměry.' }); r = null; }
  if (group) { scene && scene.remove(group); group.traverse(o => { o.geometry && o.geometry.dispose(); o.material && o.material.dispose(); }); group = null; }
  if (!r) { model = null; freeAll(); $('btnSave').disabled = true; showMsgs(msgs); $('stats').textContent = ''; $('swaps').textContent = ''; $('dims').textContent = '–'; draw(); return; }
  let vol = 0, zmin = Infinity;
  const items = r.bodies.map(bd => { const g = toGeom(bd.m); vol += bd.m.volume(); g.computeBoundingBox(); zmin = Math.min(zmin, g.boundingBox.min.z); return Object.assign({ g }, bd, { m: null }); });
  freeAll();
  model = { items, r, zmin };
  group = new THREE.Group();
  for (const it of items) { it.g.computeVertexNormals(); const mesh = new THREE.Mesh(it.g, it.bands ? bandMaterial(it.bands) : new THREE.MeshStandardMaterial({ roughness: 0.55, metalness: 0.02, flatShading: true })); mesh.userData = { item: it, role: it.role, bands: it.bands }; paint(mesh); group.add(mesh); }
  if (renderer) scene.add(group);
  placeGroup();
  // rozměry dílů na tiskové ploše
  const bb = new THREE.Box3(); for (const it of items) { const b = it.g.boundingBox.clone(); const t = it.print || [0, 0, 0]; b.translate(new THREE.Vector3(...t)); bb.union(b); }
  const sx = bb.max.x - bb.min.x, sy = bb.max.y - bb.min.y, sz = bb.max.z - bb.min.z;
  if (sx > D.bedX || sy > D.bedY || sz > D.bedZ) msgs.push({ lvl: 'warn', msg: `Jmenovka (${fmt(sx, 0)} × ${fmt(sy, 0)} mm) se nevejde na tiskovou plochu. Zmenšete výšku písmene.` });
  const lh = r.lh, notMul = (v) => Math.abs(v / lh - Math.round(v / lh)) > 0.01;
  if (r.swaps.length && (notMul(r.Th) || notMul(r.oh))) msgs.push({ lvl: 'info', msg: `Tloušťka písmene a výšky obrysu a jména by měly být násobkem výšky vrstvy ${fmtP(lh)} mm, aby výměna barvy vyšla přesně na hranu.` });
  showMsgs(msgs);
  const AB = (() => { const b = new THREE.Box3(); for (const it of items) { const x = it.g.boundingBox.clone(); x.translate(new THREE.Vector3(...(it.asm || [0, 0, 0]))); b.union(x); } return b; })();
  $('dims').innerHTML = `<b>${fmt(AB.max.x - AB.min.x)}</b> × <b>${fmt(AB.max.y - AB.min.y)}</b> × <b>${fmt(AB.max.z - AB.min.z)}</b> mm`;
  $('btnSave').disabled = false; $('btnSave').textContent = items.length > 1 ? `Stáhnout STL (${items.length} soubory)` : 'Stáhnout STL';
  const grams = vol / 1000 * 1.24 * 0.45, hrs = grams / 11 + 0.2;   // výplň zhruba 15 %, stěny a vrchní vrstvy
  const bx = $('stats'); bx.textContent = '';
  for (const [a, v] of [['Jmenovka', (r.letter + ' · ' + (r.name || '—')).slice(0, 28)], ['Rozměry', `${fmt(AB.max.x - AB.min.x, 0)} × ${fmt(AB.max.y - AB.min.y, 0)} × ${fmt(AB.max.z - AB.min.z, 1)} mm`], ['Materiál', `${fmt(Math.max(1, grams), 0)} g`], ['Tisk zhruba', hrs < 1 ? `${fmt(hrs * 60, 0)} min` : `${fmt(hrs, 1)} h`]]) {
    const d = document.createElement('div'); d.className = 'stat'; const s1 = document.createElement('span'); s1.textContent = a; const s2 = document.createElement('b'); s2.textContent = v; d.append(s1, s2); bx.append(d);
  }
  updateSwaps();
  if (fitNext) { fit('persp'); fitNext = false; } else draw();
}
function updateSwaps() {
  const bx = $('swaps'); bx.textContent = ''; if (!model) return; const r = model.r, lh = r.lh;
  const line = (html) => { const d = document.createElement('div'); d.innerHTML = html; bx.append(d); };
  const sw = (c) => `<i style="background:${colOf(c)}"></i>`;
  if (r.swaps.length) {
    line(`<b>Výměna filamentu</b> (vrstva ${fmtP(lh)} mm, první vrstva stejně vysoká):`);
    line(`${sw(D.mode === 'one' ? 1 : 2)}začátek tisku${D.mode === 'parts' ? ' jmenovky' : ''}`);
    for (const [z, c] of r.swaps) line(`${sw(c)}od výšky ${fmtP(Math.round(z * 100) / 100)} mm → vrstva č. ${Math.round(z / lh) + 1} (končí ve ${fmtP(Math.round((z + lh) * 100) / 100)} mm)`);
  } else if (D.colors === 'ams') line('Každý soubor jeden díl jedné barvy: ' + model.items.map(it => `${sw(it.role)}${it.name}`).join(' &nbsp; '));
}

/* ===== Stažení ===== */
const inViewer = !!(window.claude && typeof window.claude.use === 'function');
let dlCap = null;
if (inViewer) window.claude.use('downloads').then(d => { dlCap = d; updateNote(); }).catch(() => updateNote());
function updateNote() { $('saveNote').textContent = inViewer ? (dlCap ? 'Tady se soubory stáhnou zabalené v ZIP.' : 'Stahování je v tomto zobrazení nedostupné.') : 'Díly jsou natočené tak, jak se tisknou. Jednotky jsou milimetry.'; }
$('btnSave').onclick = async () => {
  if (!model) return;
  const base = ('jmenovka_' + (model.r.name || model.r.letter)).normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^A-Za-z0-9_-]+/g, '_');
  const enc = (g) => { const u = stlBinary([g]), head = 'Created by Julius Andy Antos | Jmenovky | mm'; for (let i = 0; i < 80; i++) u[i] = i < head.length ? head.charCodeAt(i) : 32; return u; };
  // díly pro vícebarevný tisk mají společný počátek, aby do sebe ve sliceru zapadly
  const files = model.items.map(it => ({ name: `${base}_${it.name}.stl`, data: enc(it.g) }));
  if (files.length === 1) files[0].name = base + '.stl';
  if (inViewer) { if (!dlCap) return; try { await dlCap.save({ filename: base + '.zip', data: makeZip(files) }); $('saveNote').textContent = 'ZIP je uložený.'; } catch (err) { if (err && err.code !== 'declined') $('saveNote').textContent = 'Soubor se nepodařilo uložit.'; } return; }
  for (const f of files) { const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([f.data], { type: 'model/stl' })); a.download = f.name; document.body.append(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 2000); if (files.length > 1) await new Promise(r => setTimeout(r, 300)); }
};

/* ===== Instalace jako aplikace a sbalitelné sekce ===== */
let installEvt = null;
window.addEventListener('beforeinstallprompt', (e) => { e.preventDefault(); installEvt = e; $('btnInstall').hidden = false; });
window.addEventListener('appinstalled', () => { installEvt = null; $('btnInstall').hidden = true; });
$('btnInstall').onclick = async () => { if (!installEvt) return; installEvt.prompt(); try { await installEvt.userChoice; } catch (e) {} installEvt = null; $('btnInstall').hidden = true; };
if (!inViewer && 'serviceWorker' in navigator && (location.protocol === 'https:' || location.hostname === 'localhost')) navigator.serviceWorker.register('sw.js').catch(() => {});
(function () {
  const KEY = 'jmenovky-sbaleno';
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
initGL(); syncUI(); updateNote();
initMF().then(() => { busy(false); schedule(true); }).catch((e) => { console.error(e); busy(false); showMsgs([{ lvl: 'bad', msg: 'Výpočetní modul se nepodařilo načíst. Zkuste novější prohlížeč.' }]); });

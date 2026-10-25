/* ===== Elektronika – držáky desek, panely displejů a LED. Created by Julius Andy Antoš ===== */
const $ = (id) => document.getElementById(id);
const rect4 = (ix, iy, sx, sy) => [[ix, iy], [ix + sx, iy], [ix, iy + sy], [ix + sx, iy + sy]];
const UNO = [[13.97, 2.54], [15.24, 50.8], [66.04, 7.62], [66.04, 35.56]];
// desky: název, šířka, hloubka, díry [x, y] od levého dolního rohu, průměr díry, poznámka (≈ = rozměr se u klonů liší)
const BOARDS = {
  rpi5: ['Raspberry Pi 5 / 4 / 3B+', 85, 56, rect4(3.5, 3.5, 58, 49), 2.7, 'oficiální výkres, šrouby M2,5'],
  rpi3a: ['Raspberry Pi 3A+', 65, 56, rect4(3.5, 3.5, 58, 49), 2.7, 'oficiální výkres, šrouby M2,5'],
  rpiz: ['Raspberry Pi Zero / Zero 2 W', 65, 30, rect4(3.5, 3.5, 58, 23), 2.75, 'oficiální výkres, šrouby M2,5'],
  pico: ['Raspberry Pi Pico / Pico 2 / Pico W', 51, 21, rect4(2, 4.8, 47, 11.4), 2.1, 'oficiální výkres, šrouby M2'],
  uno: ['Arduino Uno / Leonardo / Uno R4', 68.6, 53.3, UNO, 3.2, 'oficiální výkres, šrouby M3'],
  mega: ['Arduino Mega 2560', 101.6, 53.3, UNO.concat([[90.17, 50.8], [96.52, 2.54]]), 3.2, 'oficiální výkres, šrouby M3'],
  nano: ['Arduino Nano / Nano Every', 43.18, 17.78, rect4(1.27, 1.27, 40.64, 15.24), 1.78, 'díry ⌀ 1,78, kolík nebo šroub M1,6'],
  nmcu2: ['NodeMCU V2 (Amica, ESP8266)', 48, 26, rect4(2.5, 2.5, 43, 21), 3, '≈ klony se liší, přeměřte'],
  nmcu3: ['NodeMCU V3 (LoLin, ESP8266)', 58, 31, rect4(3, 3, 52, 25), 3, '≈ klony se liší, přeměřte'],
  esp32c: ['ESP32 DevKitC (38 pinů)', 54.4, 27.9, [], 0, '≈ bez děr – kolébka'],
  esp32v1: ['ESP32 DevKit V1 (30 pinů)', 51.5, 28.4, [], 0, '≈ bez děr – kolébka'],
  d1mini: ['Wemos D1 mini', 34.2, 25.6, [], 0, 'bez děr – kolébka'],
  esp32cam: ['ESP32-CAM', 40.5, 27, [], 0, 'bez děr – kolébka'],
  c3mini: ['ESP32-C3 / S3 SuperMini', 22.5, 18, [], 0, '≈ bez děr – kolébka'],
  xiao: ['Seeed XIAO', 21, 17.8, [], 0, 'bez děr – kolébka'],
  promini: ['Arduino Pro Mini', 33, 18, [], 0, 'bez děr – kolébka'],
  custom: ['Vlastní rozměr', 0, 0, null, 0, ''],
};
// displeje: název, DPS š × v, díry, ⌀ díry, okno š × v, posun okna od středu (y+ = strana s piny), výška čela nad DPS, poznámka
const DISPS = {
  oled096: ['OLED 0,96″ (SSD1306, 128×64)', 27, 27, rect4(2.35, 2, 22.3, 23), 2.5, 21.8, 11, 0, -1.6, 1.6, '≈ klony se liší, přeměřte rozteč děr'],
  oled13: ['OLED 1,3″ (SH1106, 128×64)', 35.4, 33.5, rect4(2.5, 2.5, 30.4, 28.5), 3, 29.5, 14.8, 0, -1.6, 1.6, '≈ klony se liší, přeměřte rozteč děr'],
  lcd1602: ['LCD 1602 (16×2 znaky)', 80, 36, rect4(2.5, 2.5, 75, 31), 3, 64.5, 14.5, 0, 0, 7, 'rámeček displeje 71 × 24 mm'],
  lcd2004: ['LCD 2004 (20×4 znaky)', 98, 60, rect4(2.5, 2.5, 93, 55), 3, 76, 25.2, 0, 0, 9, 'rámeček displeje 97 × 40 mm'],
  custom: ['Vlastní rozměr', 0, 0, null, 0, 0, 0, 0, 0, 0, ''],
};
// šrouby: [díra pro samořezný šroub, průchozí díra, díra pro insert, matice přes plochy, výška matice]
const SCR = { 1.6: [1.3, 1.9, 0, 3.2, 1.3], 2: [1.6, 2.4, 3.2, 4, 1.6], 2.5: [2.0, 2.9, 3.6, 5, 2.0], 3: [2.5, 3.4, 4.0, 5.5, 2.4] };
const DEF = {
  mode: 'board', board: 'rpi5', bW: 85, bH: 56, bsx: 58, bsy: 49, bix: 3.5, biy: 3.5, bhd: 2.7, fix: 'screw', scr: '0', sh: 6, under: 3, pcb: 1.6, lips: true, bt: 2.4, mg: 3, ears: false, light: true,
  disp: 'lcd1602', dW: 80, dH: 36, dsx: 75, dsy: 31, vw: 64.5, vh: 14.5, vdx: 0, vdy: 0, dhd: 3, dz: 7, pt: 2, dmg: 5, wm: 0.5, chf: true, dfix: 'screw', dears: false,
  led: '5', lkind: 'panel', nx: 3, ny: 1, lp: 12, lpt: 2, lclr: 0.15,
  sw: 10, sL: 150, sd: 8, swall: 1.8, sdif: true, sholes: true,
  bedX: 220, bedY: 220, bedZ: 250,
};
const STORE = 'elektronika-v1';
const D = Object.assign({}, DEF);
try { const s = JSON.parse(localStorage.getItem(STORE) || '{}'); for (const k in DEF) if (k in s && typeof s[k] === typeof DEF[k]) D[k] = s[k]; } catch (e) {}
if (!BOARDS[D.board]) D.board = 'rpi5'; if (!DISPS[D.disp]) D.disp = 'lcd1602';
const saveState = () => { try { localStorage.setItem(STORE, JSON.stringify(D)); } catch (e) {} };
const fmt = (v, d = 1) => (+v).toLocaleString('cs-CZ', { maximumFractionDigits: d, minimumFractionDigits: d });
const fmtP = (v) => (+v).toLocaleString('cs-CZ', { maximumFractionDigits: 2 });
const css = (v) => getComputedStyle(document.documentElement).getPropertyValue(v).trim();
const clamp = (v, a, b) => Math.min(b, Math.max(a, +v || 0));
const MODES = [['board', 'Deska', '<rect x="3" y="7" width="28" height="17" rx="2"/><circle cx="7" cy="11" r="1.5"/><circle cx="27" cy="11" r="1.5"/><circle cx="7" cy="20" r="1.5"/><circle cx="27" cy="20" r="1.5"/><rect x="13" y="12" width="8" height="7"/>'],
  ['disp', 'Displej', '<rect x="3" y="6" width="28" height="19" rx="2"/><rect x="7" y="10" width="20" height="9" class="f"/><rect x="7" y="10" width="20" height="9"/>'],
  ['led', 'LED', '<path d="M12 22v-9a5 5 0 0 1 10 0v9z"/><path d="M10 22h14M14 22v5M20 22v3"/><path d="M26 7l3-3M8 7l-3-3M17 4v-3"/>'],
  ['strip', 'LED pásek', '<path d="M3 20h28M3 20v-9h2v7h24v-7h2v9"/><path d="M5 11h24" stroke-dasharray="2 2"/><circle cx="10" cy="16" r="1.2"/><circle cx="17" cy="16" r="1.2"/><circle cx="24" cy="16" r="1.2"/>']];

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
const seg = (r) => Math.max(32, Math.min(96, Math.round(r * 12)));
const cyl = (h, r0, r1, z, n, x = 0, y = 0) => T(T(MF.Manifold.cylinder(h, r0, r1 == null ? r0 : r1, n || seg(Math.max(r0, r1 || 0)))).translate([x, y, z || 0]));
const box = (x0, y0, z0, x1, y1, z1) => T(T(MF.Manifold.cube([x1 - x0, y1 - y0, z1 - z0])).translate([x0, y0, z0]));
const rrect = (w, h, r) => { r = Math.max(0, Math.min(r, w / 2 - 0.01, h / 2 - 0.01)); const s = T(MF.CrossSection.square([w, h], true)); return r > 0.05 ? T(T(s.offset(-r, 'Round')).offset(r, 'Round')) : s; };
const U = (list) => T(MF.Manifold.union(list.filter(Boolean)));
const sub = (a, b) => T(a.subtract(b));
const hexPrism = (s, h, z, x, y) => T(T(T(MF.CrossSection.circle(s / Math.sqrt(3), 6)).extrude(h)).translate([x, y, z]));

/* ===== Specifikace ===== */
function boardSpec() {
  const p = BOARDS[D.board];
  if (D.board !== 'custom') return { name: p[0], W: p[1], H: p[2], holes: p[3], hd: p[3].length ? clamp(D.bhd, 1, 5) : 0, note: p[5] };
  const W = clamp(D.bW, 10, 300), H = clamp(D.bH, 10, 300), sx = clamp(D.bsx, 0, 300), sy = clamp(D.bsy, 0, 300);
  const holes = sx > 0 && sy > 0 ? rect4(clamp(D.bix, 0, W), clamp(D.biy, 0, H), sx, sy) : [];
  return { name: 'vlastní deska', W, H, holes, hd: holes.length ? clamp(D.bhd, 1, 5) : 0, note: '' };
}
function dispSpec() {
  const p = DISPS[D.disp];
  if (D.disp !== 'custom') return { name: p[0], W: p[1], H: p[2], holes: p[3], hd: clamp(D.dhd, 1, 5), vw: p[5], vh: p[6], dx: p[7], dy: p[8], note: p[10] };
  const W = clamp(D.dW, 10, 300), H = clamp(D.dH, 10, 300), sx = clamp(D.dsx, 0, 300), sy = clamp(D.dsy, 0, 300);
  return { name: 'vlastní displej', W, H, holes: sx > 0 && sy > 0 ? rect4((W - sx) / 2, (H - sy) / 2, sx, sy) : [], hd: clamp(D.dhd, 1, 5), vw: clamp(D.vw, 3, W), vh: clamp(D.vh, 3, H), dx: clamp(D.vdx, -100, 100), dy: clamp(D.vdy, -100, 100), note: '' };
}
function screwFor(hd) { const s = +D.scr; if (SCR[s]) return s; return hd >= 3.05 ? 3 : hd >= 2.55 ? 2.5 : hd >= 1.95 ? 2 : 1.6; }
const LED = { 3: { d: 3, fl: 3.8, flh: 1.0 }, 5: { d: 5, fl: 5.8, flh: 1.0 }, 8: { d: 8, fl: 9, flh: 1.2 }, 10: { d: 10, fl: 11, flh: 1.2 } };

/* ===== Sloupek na desku ===== */
// sloupek od z0 do z0+h na pozici x,y; vrací [plus, minus] – minus se odečte od celku (díry)
function standoff(fix, hd, x, y, z0, h, msgs) {
  const s = screwFor(hd), S = SCR[s];
  if (fix === 'pin') {
    const pd = Math.max(0.9, hd - 0.25), od = Math.max(hd + 2.4, 4), pl = 2.2;
    return { plus: [cyl(h + 0.3, od / 2, od / 2, z0 - 0.3, 0, x, y), cyl(pl, pd / 2, pd / 2, z0 + h - 0.11, 0, x, y), cyl(0.6, pd / 2, Math.max(0.3, pd / 2 - 0.35), z0 + h + pl - 0.11 - 0.01, 0, x, y)], minus: [], od };
  }
  let od, minus = [];
  if (fix === 'insert' && S[2]) { od = Math.max(hd + 2.4, S[2] + 2.6); const dep = Math.min(h + z0 - 0.8, s * 2 + 0.6); minus.push(cyl(dep + 1, S[2] / 2, S[2] / 2, z0 + h - dep, 0, x, y)); }
  else if (fix === 'nut') { od = Math.max(hd + 2.4, S[1] + 2.8); minus.push(cyl(z0 + h + 2, S[1] / 2, S[1] / 2, -1, 0, x, y), hexPrism(S[3] + 0.35, S[4] + 0.4 + 1, -1, x, y)); }
  else { od = Math.max(hd + 2.4, S[0] + 3); minus.push(cyl(z0 + h - 0.8 + 1, S[0] / 2, S[0] / 2, 0.8, 0, x, y)); }
  if (fix === 'insert' && !S[2]) msgs && msgs.push({ lvl: 'info', msg: 'Insert pro M1,6 se běžně nevyrábí, sloupek je udělaný na samořezný šroub.' });
  return { plus: [cyl(h + 0.3, od / 2, od / 2, z0 - 0.3, 0, x, y)], minus, od };
}
// rovná podložka se zaoblenými rohy, případně s oušky
function plate(w, h, t, ears) {
  let p = T(rrect(w, h, 3).extrude(t)).translate([0, 0, 0]); p = T(p);
  const minus = [];
  if (ears) {
    const ew = 9, eo = w / 2 + ew / 2 - 1;
    const ear = rrect(ew + 2, Math.min(h, 16), 4);
    p = U([p, T(T(T(ear.translate([eo, 0])).extrude(t))), T(T(T(ear.translate([-eo, 0])).extrude(t)))]);
    for (const sx of [-1, 1]) minus.push(cyl(t + 2, 1.7, 1.7, -1, 32, sx * (w / 2 + ew / 2 - 0.5), 0), cyl(1.6 + 0.01, 1.7, 3.3, t - 1.6, 32, sx * (w / 2 + ew / 2 - 0.5), 0));
  }
  return { p, minus };
}

/* ===== Deska ===== */
function buildBoard(msgs) {
  const B = boardSpec(), bt = clamp(D.bt, 1.2, 8), mg = clamp(D.mg, 0, 30);
  if (!B.holes.length) return buildCradle(B, msgs);
  const sh = clamp(D.sh, 2, 40), hs = B.holes.map(([x, y]) => [x - B.W / 2, y - B.H / 2]);
  const pw = B.W + 2 * mg, ph = B.H + 2 * mg;
  const pl = plate(pw, ph, bt, D.ears); let plus = [pl.p], minus = pl.minus.slice(), od = 0;
  for (const [x, y] of hs) { const s = standoff(D.fix, B.hd, x, y, bt, sh, msgs); plus.push(...s.plus); minus.push(...s.minus); od = s.od; }
  if (D.light) { // odlehčení uvnitř obrysu děr
    const xs = hs.map(h => h[0]), ys = hs.map(h => h[1]), x0 = Math.min(...xs) + od / 2 + 2.5, x1 = Math.max(...xs) - od / 2 - 2.5, y0 = Math.min(...ys) + od / 2 + 2.5, y1 = Math.max(...ys) - od / 2 - 2.5;
    if (x1 - x0 > 8 && y1 - y0 > 8) {
      // u nepravidelných děr (Uno, Mega) nesmí výřez zasáhnout do žádného sloupku
      const ok = hs.every(([x, y]) => x < x0 - od / 2 - 2 || x > x1 + od / 2 + 2 || y < y0 - od / 2 - 2 || y > y1 + od / 2 + 2);
      if (ok) minus.push(T(T(T(rrect(x1 - x0, y1 - y0, 3).translate([(x0 + x1) / 2, (y0 + y1) / 2])).extrude(bt + 2)).translate([0, 0, -1])));
    }
  }
  if (D.fix === 'nut' && bt + sh < SCR[screwFor(B.hd)][4] + 2) msgs.push({ lvl: 'warn', msg: 'Na matici je podložka se sloupkem příliš nízká. Zvyšte sloupky nebo tloušťku podložky.' });
  if (sh < 3 && /screw|insert/.test(D.fix)) msgs.push({ lvl: 'info', msg: 'Nízké sloupky: pod deskou zůstane málo místa na vývody součástek.' });
  if (D.fix === 'pin' && B.hd < 2.2) msgs.push({ lvl: 'info', msg: 'Kolíky do malých děr jsou křehké. Tiskněte pomalu a nasazujte desku opatrně, nebo zvolte šroub.' });
  const m = sub(U(plus), U(minus));
  const s = screwFor(B.hd);
  const fixTxt = { screw: `samořezné šrouby M${fmtP(s)} (díra ⌀ ${fmtP(SCR[s][0])})`, insert: SCR[s][2] ? `inserty M${fmtP(s)} (díra ⌀ ${fmtP(SCR[s][2])})` : `šrouby M${fmtP(s)}`, nut: `šrouby M${fmtP(s)} s maticí zespodu`, pin: 'kolíky bez šroubů' }[D.fix];
  msgs.push({ lvl: 'info', msg: `${B.name}: ${hs.length} sloupky výšky ${fmtP(sh)} mm, ${fixTxt}.` });
  return { m, pcb: { W: B.W, H: B.H, z: bt + sh, holes: hs, hd: B.hd, t: 1.6 }, info: B.name, name: 'drzak_' + D.board, tpl: { W: pw, H: ph, holes: hs.map(([x, y]) => [x, y, B.hd]), pcb: [B.W, B.H], title: B.name } };
}
function buildCradle(B, msgs) {
  const bt = clamp(D.bt, 1.2, 8), mg = clamp(D.mg, 0, 30), under = clamp(D.under, 0, 20), pcb = clamp(D.pcb, 0.6, 3), c = 0.25, wall = 1.6;
  const iw = B.W + 2 * c, ih = B.H + 2 * c, top = bt + under + pcb + (D.lips ? 1.3 : 0.8);
  const pw = iw + 2 * wall + 2 * mg, ph = ih + 2 * wall + 2 * mg;
  const pl = plate(pw, ph, bt, D.ears); const plus = [pl.p], minus = pl.minus.slice();
  const long = B.W >= B.H, arm = Math.min(6, (long ? B.H : B.W) * 0.3);
  // rohové úhelníky (zrcadlené do všech čtyř rohů)
  const mb = (sx, sy, x0, x1, y0, y1, z0, z1) => box(Math.min(sx * x0, sx * x1), Math.min(sy * y0, sy * y1), z0, Math.max(sx * x0, sx * x1), Math.max(sy * y0, sy * y1), z1);
  for (const sx of [-1, 1]) for (const sy of [-1, 1]) {
    plus.push(mb(sx, sy, iw / 2, iw / 2 + wall, ih / 2 - arm, ih / 2 + wall, bt - 0.3, top));
    plus.push(mb(sx, sy, iw / 2 - arm, iw / 2 + wall, ih / 2, ih / 2 + wall, bt - 0.3, top));
    if (D.lips) { // západka: rovná spodní hrana drží desku, šikmý nájezd shora
      const zl = bt + under + pcb + 0.15, ov = 0.6, len = arm - 0.6;
      const cs = T(new MF.CrossSection([[[sx * 0.4, 0], [-sx * ov, 0], [sx * 0.4, 1.0]]], 'NonZero'));
      const lip = T(T(cs.extrude(len)).rotate([90, 0, 0]));
      plus.push(T(lip.translate([sx * iw / 2, sy > 0 ? ih / 2 : -ih / 2 + len, zl])));
    }
  }
  // opěrné lišty pod krátkými konci desky
  const ld = 1.8;
  if (under > 0.05) for (const sx of [-1, 1]) plus.push(box(sx > 0 ? iw / 2 - ld : -iw / 2 - 0.3, -ih / 2 - 0.3, bt - 0.3, sx > 0 ? iw / 2 + 0.3 : -iw / 2 + ld, ih / 2 + 0.3, bt + under));
  let m = U(plus); if (minus.length) m = sub(m, U(minus));
  msgs.push({ lvl: 'info', msg: `${B.name} nemá montážní díry. Deska se opře o lišty na kratších koncích${D.lips ? ' a zacvakne pod západky v rozích (nejdřív zasuňte jeden konec)' : ''}. Kontrolujte, že u konektoru USB není úhelník v cestě.` });
  if (B.note.startsWith('≈')) msgs.push({ lvl: 'info', msg: 'Rozměr desky se u klonů liší. Přeměřte ji a případně zvolte „Vlastní rozměr“.' });
  return { m, pcb: { W: B.W, H: B.H, z: bt + under, holes: [], hd: 0, t: pcb }, info: B.name, name: 'kolebka_' + D.board, tpl: { W: pw, H: ph, holes: [], pcb: [B.W, B.H], title: B.name } };
}

/* ===== Displej ===== */
function buildDisp(msgs) {
  const S = dispSpec(), pt = clamp(D.pt, 1, 6), mg = clamp(D.dmg, 0, 40), wm = clamp(D.wm, -2, 5), dz = clamp(D.dz, 0.5, 30);
  const pw = S.W + 2 * mg, ph = S.H + 2 * mg;
  const pl = plate(pw, ph, pt, false); const plus = [pl.p], minus = [];
  const ww = S.vw + 2 * wm, wh = S.vh + 2 * wm;
  // panel leží čelem na podložce: okno je zrcadlově v ose y vůči pohledu zezadu → piny nahoře při pohledu zepředu
  const wx = -S.dx, wy = S.dy;   // díváme se na panel zezadu, proto je posun v ose x zrcadlený
  minus.push(T(T(T(rrect(ww, wh, 0.6).translate([wx, wy])).extrude(pt + 2)).translate([0, 0, -1])));
  if (D.chf) { const ch = Math.max(0, Math.min(pt - 0.6, 1.6)); if (ch > 0.2) { const bw = ww + 2 * (ch + 0.5), bh = wh + 2 * (ch + 0.5); minus.push(T(T(rrect(bw, bh, 0.6 + ch).extrude(ch + 0.6, 0, 0, [(ww - 0.2) / bw, (wh - 0.2) / bh])).translate([wx, wy, -0.5]))); } }
  const hs = S.holes.map(([x, y]) => [x - S.W / 2, y - S.H / 2]);
  for (const [x, y] of hs) { const s = standoff(D.dfix, S.hd, x, y, pt, dz, msgs); plus.push(...s.plus); minus.push(...s.minus); }
  if (D.dears) { if (mg < 5) msgs.push({ lvl: 'warn', msg: 'Na díry pro přišroubování panelu je potřeba okraj aspoň 5 mm.' }); else for (const sx of [-1, 1]) for (const sy of [-1, 1]) { const x = sx * (pw / 2 - mg / 2), y = sy * (ph / 2 - mg / 2); minus.push(cyl(pt + 2, 1.7, 1.7, -1, 32, x, y), cyl(1.61, 3.3, 1.7, -0.01, 32, x, y)); } }
  if (!hs.length) msgs.push({ lvl: 'info', msg: 'Bez montážních děr: displej přilepte na zadní stranu panelu nebo ho přitlačte držákem.' });
  if (S.note.startsWith('≈')) msgs.push({ lvl: 'info', msg: 'Rozteč děr se u různých výrobců liší. Přeměřte ji posuvkou nebo přiložte displej na vytištěnou šablonu SVG.' });
  msgs.push({ lvl: 'info', msg: `Panel se tiskne čelem dolů. Okno ${fmtP(ww)} × ${fmtP(wh)} mm, sloupky ${fmtP(dz)} mm drží DPS tak, aby displej dosedl na panel.` });
  const m = sub(U(plus), U(minus));
  return { m, pcb: { W: S.W, H: S.H, z: pt + dz, holes: hs, hd: S.hd, t: 1.6, win: [wx, wy, S.vw, S.vh], base: pt }, info: S.name, name: 'panel_' + D.disp, tpl: { W: pw, H: ph, holes: D.dears && mg >= 5 ? [-1, 1].flatMap(sx => [-1, 1].map(sy => [sx * (pw / 2 - mg / 2), sy * (ph / 2 - mg / 2), 3.4])) : [], win: [wx, wy, ww, wh], pcb: [S.W, S.H], mirror: true, title: S.name, holesPcb: hs.map(([x, y]) => [x, y, S.hd]) } };
}

/* ===== LED ===== */
function buildLed(msgs) {
  const L = LED[D.led] || LED[5], nx = Math.round(clamp(D.nx, 1, 40)), ny = Math.round(clamp(D.ny, 1, 40)), clr = clamp(D.lclr, 0, 1), pt = clamp(D.lpt, 1, 6);
  if (D.lkind === 'holder') {
    const bore = L.d + clr, body = L.d + 2.4, fl = L.d + 5.5, flh = 1.2, len = pt + 1.6, n = nx * ny, parts = [];
    for (let i = 0; i < n; i++) {
      let o = U([cyl(flh, fl / 2, fl / 2, 0), cyl(len + 0.3, body / 2, body / 2, flh - 0.3), cyl(0.8, body / 2 + 0.45, body / 2, flh + pt + 0.15)]);
      // čtyři zářezy, aby se objímka dala zacvaknout
      const sl = []; for (let k = 0; k < 4; k++) sl.push(T(T(box(-0.45, 0, flh + 0.8, 0.45, body, flh + len + 1)).rotate([0, 0, k * 90 + 45])));
      o = sub(o, U([cyl(flh + len + 2, bore / 2, bore / 2, -1), cyl(L.flh + 0.6, L.fl / 2 + clr, L.fl / 2 + clr, flh + len - L.flh - 0.3), ...sl]));
      const p = Math.ceil(Math.sqrt(n)), x = (i % p) * (fl + 4), y = Math.floor(i / p) * (fl + 4);
      parts.push(T(o.translate([x, y, 0])));
    }
    msgs.push({ lvl: 'info', msg: `Objímka pro LED ${D.led} mm: do panelu tloušťky ${fmtP(pt)} mm vyvrtejte otvor ⌀ ${fmtP(body + 0.2)} mm. Objímku zatlačte zepředu, LED zasuňte zezadu.` });
    return { m: U(parts), info: `${n}× objímka LED ${D.led} mm`, name: `objimka_led${D.led}mm`, tpl: { W: fl + 10, H: fl + 10, holes: [[0, 0, body + 0.2]], title: `Otvor pro objímku LED ${D.led} mm` } };
  }
  const p = Math.max(clamp(D.lp, 3, 100), L.fl + 1.2), mg = Math.max(4, p / 2), pw = (nx - 1) * p + 2 * mg, ph = (ny - 1) * p + 2 * mg;
  const pl = plate(pw, ph, pt, false), minus = [], hs = [];
  for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) {
    const x = (i - (nx - 1) / 2) * p, y = (j - (ny - 1) / 2) * p; hs.push([x, y, L.d + clr]);
    minus.push(cyl(pt + 2, (L.d + clr) / 2, (L.d + clr) / 2, -1, 0, x, y));
    if (pt > L.flh + 0.8) minus.push(cyl(L.flh + 1, (L.fl + clr + 0.2) / 2, (L.fl + clr + 0.2) / 2, pt - L.flh, 0, x, y));
  }
  if (p > clamp(D.lp, 3, 100) + 0.01) msgs.push({ lvl: 'info', msg: `Rozteč zvětšena na ${fmtP(p)} mm, aby se LED vešly vedle sebe.` });
  msgs.push({ lvl: 'info', msg: `LED se zasouvá zezadu, límeček LED dosedne do zahloubení. Otvor ⌀ ${fmtP(L.d + clr)} mm.` });
  return { m: sub(pl.p, U(minus)), info: `panel ${nx * ny}× LED ${D.led} mm`, name: `panel_led${D.led}mm_${nx}x${ny}`, tpl: { W: pw, H: ph, holes: hs, title: `Panel LED ${D.led} mm` } };
}

/* ===== LED pásek ===== */
function buildStrip(msgs) {
  const sw = clamp(D.sw, 3, 40), L = clamp(D.sL, 20, 1000), dep = clamp(D.sd, 3, 30), wall = clamp(D.swall, 1.6, 4), base = 1.6, dt = 1.0, gr = 0.8;
  const iw = sw + 0.5, ow = iw + 2 * wall, H = base + dep + (D.sdif ? dt + 0.3 + 0.8 : 0);
  // průřez profilu (u = šířka, v = výška)
  let cs = T(MF.CrossSection.square([ow, H]).translate([-ow / 2, 0]));
  cs = T(cs.subtract(T(MF.CrossSection.square([iw, H]).translate([-iw / 2, base]))));
  if (D.sdif) cs = T(cs.subtract(T(MF.CrossSection.square([iw + 2 * gr, dt + 0.3]).translate([-(iw + 2 * gr) / 2, base + dep]))));
  // vytažení podél osy x
  let prof = T(T(T(cs.extrude(L)).rotate([90, 0, 0])).rotate([0, 0, 90])); prof = T(prof.translate([-L / 2, 0, 0]));
  if (D.sholes) {
    const n = Math.max(2, Math.round(L / 100) + 1), minus = [];
    for (let i = 0; i < n; i++) { const x = -L / 2 + 12 + i * (L - 24) / (n - 1); minus.push(cyl(base + 2, 1.7, 1.7, -1, 32, x, 0), cyl(Math.min(1.2, base - 0.4) + 0.01, 1.7, Math.min(3, iw / 2 - 0.2), base - Math.min(1.2, base - 0.4), 32, x, 0)); }
    if (iw < 6) msgs.push({ lvl: 'info', msg: 'Úzký pásek: hlava šroubu se do dna nevejde celá, použijte šroub M2 nebo profil přilepte.' });
    prof = sub(prof, U(minus));
  }
  const parts = [{ m: prof, name: 'profil', label: 'Profil' }];
  if (D.sdif) parts.push({ m: box(-L / 2, -(iw + 2 * gr - 0.3) / 2, 0, L / 2 - 0.5, (iw + 2 * gr - 0.3) / 2, dt), name: 'difuzor', label: 'Difuzor' });
  if (L > Math.hypot(D.bedX, D.bedY) - 10) msgs.push({ lvl: 'warn', msg: 'Profil je delší než úhlopříčka tiskové plochy. Rozdělte ho na více kusů.' });
  else if (L > D.bedX) msgs.push({ lvl: 'info', msg: 'Profil je delší než tisková plocha X, položte ho v ořezávači úhlopříčně.' });
  msgs.push({ lvl: 'info', msg: `Profil ${fmtP(ow)} × ${fmtP(H)} mm pro pásek ${fmtP(sw)} mm.${D.sdif ? ' Difuzor se zasouvá z čela do drážky.' : ''}` });
  return { parts, info: `profil ${fmtP(sw)} mm × ${fmtP(L)} mm`, name: `profil_led_${sw}mm_${L}mm` };
}

/* ===== Ovládání ===== */
function syncUI() {
  document.querySelectorAll('[data-k]').forEach(el => { const v = D[el.dataset.k]; if (el.type === 'checkbox') el.checked = !!v; else el.value = v; });
  document.querySelectorAll('input[type=radio][name]').forEach(r => { r.checked = String(D[r.name]) === r.value; });
  updateUI();
}
function updateUI() {
  const B = boardSpec(), S = dispSpec();
  const show = { board: D.mode === 'board', disp: D.mode === 'disp', led: D.mode === 'led', strip: D.mode === 'strip', bCustom: D.board === 'custom', bHoles: B.holes.length > 0, cradle: !B.holes.length, fixScrew: D.fix !== 'pin',
    dCustom: D.disp === 'custom', dHoles: S.holes.length > 0, lPanel: D.lkind === 'panel' };
  document.querySelectorAll('[data-show]').forEach(el => { el.hidden = !show[el.dataset.show]; });
  document.querySelectorAll('#modes [data-v]').forEach(b => b.setAttribute('aria-checked', String(b.dataset.v === D.mode)));
  document.querySelectorAll('#strips button').forEach(b => b.setAttribute('aria-pressed', String(+b.dataset.w === +D.sw)));
  $('bSpec').innerHTML = `<b>${fmtP(B.W)} × ${fmtP(B.H)} mm</b> · ${B.holes.length ? `${B.holes.length} díry ⌀ ${fmtP(B.hd)}` : 'bez děr'}${B.note ? ' · ' + B.note.replace('≈', '') : ''}`;
  $('dSpec').innerHTML = `DPS <b>${fmtP(S.W)} × ${fmtP(S.H)} mm</b> · okno <b>${fmtP(S.vw)} × ${fmtP(S.vh)}</b>${S.note ? ' · ' + S.note.replace('≈', '') : ''}`;
  const L = LED[D.led] || LED[5];
  $('lSpec').innerHTML = D.lkind === 'panel' ? `otvor ⌀ <b>${fmtP(L.d + clamp(D.lclr, 0, 1))} mm</b> · zahloubení pro límeček ⌀ ${fmtP(L.fl)}` : `otvor v krabici ⌀ <b>${fmtP(L.d + 2.6)} mm</b> · ${Math.round(clamp(D.nx, 1, 40) * clamp(D.ny, 1, 40))} ks`;
  $('lblLpt').textContent = D.lkind === 'panel' ? 'Tloušťka panelu' : 'Tloušťka stěny krabice';
  const s = screwFor(B.hd);
  $('fixHint').textContent = { screw: `Samořezný šroub M${fmtP(s)}, díra ⌀ ${fmtP(SCR[s][0])} mm.`, insert: SCR[s][2] ? `Zalisovací matice M${fmtP(s)}, díra ⌀ ${fmtP(SCR[s][2])} mm.` : 'Pro M1,6 se inserty nevyrábí.', nut: `Šroub M${fmtP(s)} skrz a matice v lůžku ze spodu.`, pin: 'Deska se nasadí na kolíky.' }[D.fix];
  $('vPcb').hidden = !(D.mode === 'board' || D.mode === 'disp');
}
(function () {
  const sb = $('selBoard'); for (const k in BOARDS) { const o = document.createElement('option'); o.value = k; o.textContent = BOARDS[k][0]; sb.append(o); }
  const sd = $('selDisp'); for (const k in DISPS) { const o = document.createElement('option'); o.value = k; o.textContent = DISPS[k][0]; sd.append(o); }
  const mb = $('modes'); for (const [v, n, svg] of MODES) { const b = document.createElement('button'); b.type = 'button'; b.setAttribute('role', 'radio'); b.dataset.v = v; b.innerHTML = `<svg viewBox="0 0 34 30">${svg}</svg>${n}`; b.onclick = () => { D.mode = v; syncUI(); onChange('mode'); }; mb.append(b); }
  const st = $('strips'); for (const w of [5, 8, 10, 12, 15]) { const b = document.createElement('button'); b.type = 'button'; b.dataset.w = w; b.textContent = w + ' mm'; b.onclick = () => { D.sw = w; syncUI(); onChange('sw'); }; st.append(b); }
})();
function presetChanged(k) {
  if (k === 'board' && D.board !== 'custom') { const p = BOARDS[D.board]; if (p[3].length) { D.bhd = p[4]; const xs = p[3].map(h => h[0]), ys = p[3].map(h => h[1]); D.bix = Math.min(...xs); D.biy = Math.min(...ys); D.bsx = +(Math.max(...xs) - D.bix).toFixed(2); D.bsy = +(Math.max(...ys) - D.biy).toFixed(2); } else { D.bsx = 0; D.bsy = 0; } D.bW = p[1]; D.bH = p[2]; }
  if (k === 'disp' && D.disp !== 'custom') { const p = DISPS[D.disp]; Object.assign(D, { dW: p[1], dH: p[2], dhd: p[4], vw: p[5], vh: p[6], vdx: p[7], vdy: p[8], dz: p[9] }); const xs = p[3].map(h => h[0]), ys = p[3].map(h => h[1]); D.dsx = +(Math.max(...xs) - Math.min(...xs)).toFixed(2); D.dsy = +(Math.max(...ys) - Math.min(...ys)).toFixed(2); }
  if (k === 'led') { const L = LED[D.led]; D.lp = Math.max(D.lp, L.fl + 4); }
  syncUI();
}
function onChange(path) { if (/^(mode|board|disp|led|lkind|sw|sL)$/.test(path)) fitNext = true; updateUI(); saveState(); schedule(); }
document.querySelectorAll('[data-k]').forEach(el => el.addEventListener(el.type === 'checkbox' || el.tagName === 'SELECT' ? 'change' : 'input', () => {
  const k = el.dataset.k; let v;
  if (el.type === 'checkbox') v = el.checked; else if (el.tagName === 'SELECT') v = el.value; else { v = parseFloat(el.value); if (!isFinite(v)) return; }
  D[k] = v; if (k === 'board' || k === 'disp') presetChanged(k); onChange(k);
}));
document.querySelectorAll('input[type=radio][name]').forEach(r => r.addEventListener('change', () => { D[r.name] = r.value; if (r.name === 'led') presetChanged('led'); onChange(r.name); }));
let tmr = 0;
function schedule(now) { clearTimeout(tmr); tmr = setTimeout(() => { if (!MF) return; busy(true, 'Počítám…'); setTimeout(() => { try { rebuild(); } finally { busy(false); } }, 20); }, now ? 0 : 350); }
function busy(on, txt) { $('busy').hidden = !on; if (txt) $('busy').textContent = txt; }

/* ===== 3D scéna ===== */
const cv = $('cv');
let renderer = null, scene, camera, bedGroup, mesh = null, ghost = null, fitNext = true, model = null, showPcb = true;
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
  if (!model || !renderer) return; const b = model.bbox, sx = b.max.x - b.min.x, sy = b.max.y - b.min.y, sz = b.max.z - b.min.z + (ghost && ghost.visible ? 3 : 0);
  orbit.target.set(0, 0, sz / 2); const span = Math.max(sx, sy, sz, 20);
  orbit.r = span / (2 * Math.tan(THREE.MathUtils.degToRad(30) / 2)) * Math.max(1.15, 1.6 / camera.aspect);
  if (view === 'front') { orbit.theta = -Math.PI / 2; orbit.phi = Math.PI / 2 - 0.06; } else if (view === 'top') { orbit.theta = -Math.PI / 2; orbit.phi = 0.001; } else { orbit.theta = -Math.PI / 2 - 0.45; orbit.phi = 0.95; }
  draw();
}
$('vFront').onclick = () => fit('front'); $('vTop').onclick = () => fit('top'); $('vPersp').onclick = () => fit('persp');
$('vPcb').onclick = () => { showPcb = !showPcb; $('vPcb').setAttribute('aria-pressed', String(showPcb)); if (ghost) ghost.visible = showPcb; draw(); };
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
// průsvitná deska (DPS) v náhledu, aby bylo vidět, jak sedí
function makeGhost(p) {
  const grp = new THREE.Group();
  const shape = new THREE.Shape(); const w = p.W / 2, h = p.H / 2; shape.moveTo(-w, -h); shape.lineTo(w, -h); shape.lineTo(w, h); shape.lineTo(-w, h); shape.lineTo(-w, -h);
  for (const [x, y] of p.holes) { const hp = new THREE.Path(); hp.absarc(x, y, p.hd / 2, 0, Math.PI * 2, true); shape.holes.push(hp); }
  const g = new THREE.ExtrudeGeometry(shape, { depth: p.t, bevelEnabled: false, curveSegments: 16 });
  grp.add(new THREE.Mesh(g, new THREE.MeshStandardMaterial({ color: 0x2f8a3a, transparent: true, opacity: 0.55, roughness: 0.6 })));
  if (p.win) { const [x, y, vw, vh] = p.win, hz = Math.max(0.3, p.z - p.base - 0.05); const sc = new THREE.Mesh(new THREE.BoxGeometry(vw + 2, vh + 2, hz), new THREE.MeshStandardMaterial({ color: 0x14202a, roughness: 0.3 })); sc.position.set(x, y, -hz / 2); grp.add(sc); }
  grp.position.z = p.z;
  return grp;
}

/* ===== Výpočet ===== */
function rebuild() {
  const msgs = []; let r = null;
  try {
    r = ({ board: buildBoard, disp: buildDisp, led: buildLed, strip: buildStrip })[D.mode](msgs);
    if (r && r.parts) {
      let x = 0; const placed = [];
      r.files = r.parts.map(p => { const g = toGeom(p.m); g.computeBoundingBox(); const b = g.boundingBox; g.translate(-(b.min.x + b.max.x) / 2, -(b.min.y + b.max.y) / 2, -b.min.z); g.computeBoundingBox(); return { g, name: p.name, label: p.label, w: b.max.y - b.min.y, cx: (b.min.x + b.max.x) / 2, cy: (b.min.y + b.max.y) / 2 }; });
      const tot = r.files.reduce((a, f) => a + f.w, 0) + 6 * (r.files.length - 1); x = -tot / 2;
      r.files.forEach((f, i) => { placed.push(T(T(r.parts[i].m).translate([-f.cx, x + f.w / 2 - f.cy, 0]))); x += f.w + 6; });
      r.m = T(MF.Manifold.compose(placed));
    }
  } catch (e) { console.error(e); msgs.push({ lvl: 'bad', msg: 'Model se nepodařilo spočítat. Zkuste jiné rozměry.' }); r = null; }
  if (mesh) { scene && scene.remove(mesh); mesh.geometry.dispose(); mesh.material.dispose(); mesh = null; }
  if (ghost) { scene && scene.remove(ghost); ghost.traverse(o => { o.geometry && o.geometry.dispose(); o.material && o.material.dispose(); }); ghost = null; }
  if (model && model.g) model.g.dispose();
  if (!r || !r.m) { model = null; freeAll(); $('btnSave').disabled = true; $('btnSvg').disabled = true; showMsgs(msgs); $('stats').textContent = ''; $('dims').textContent = '–'; draw(); return; }
  const g = toGeom(r.m); const vol = r.m.volume(); freeAll();
  g.computeBoundingBox(); const b = g.boundingBox, cx = (b.min.x + b.max.x) / 2, cy = (b.min.y + b.max.y) / 2, z0 = b.min.z;
  g.translate(-cx, -cy, -z0); g.computeBoundingBox();
  model = { g, bbox: g.boundingBox.clone(), name: r.name, files: r.files || null, tpl: r.tpl || null };
  $('btnSave').disabled = false; $('btnSvg').disabled = !r.tpl;
  $('btnSave').textContent = r.files && r.files.length > 1 ? `Stáhnout STL (${r.files.length} díly)` : 'Stáhnout STL';
  const sx = model.bbox.max.x - model.bbox.min.x, sy = model.bbox.max.y - model.bbox.min.y, sz = model.bbox.max.z - model.bbox.min.z;
  if (sx > D.bedX || sy > D.bedY || sz > D.bedZ) msgs.push({ lvl: 'warn', msg: `Díl (${fmt(sx, 0)} × ${fmt(sy, 0)} × ${fmt(sz, 0)} mm) se nevejde na tiskovou plochu.` });
  showMsgs(msgs);
  if (renderer) {
    g.computeVertexNormals(); mesh = new THREE.Mesh(g, new THREE.MeshStandardMaterial({ color: new THREE.Color('#0b7a72'), roughness: 0.55, metalness: 0.03, flatShading: true })); scene.add(mesh);
    if (r.pcb) { ghost = makeGhost(r.pcb); ghost.position.x -= cx; ghost.position.y -= cy; ghost.position.z -= z0; ghost.visible = showPcb; scene.add(ghost); }
  }
  $('dims').innerHTML = `<b>${fmt(sx)}</b> × <b>${fmt(sy)}</b> × <b>${fmt(sz)}</b> mm`;
  const grams = vol / 1000 * 1.24 * 1.1, hrs = grams / 9 + 0.12;
  const bx = $('stats'); bx.textContent = '';
  for (const [a, v] of [['Díl', r.info], ['Rozměry', `${fmt(sx, 1)} × ${fmt(sy, 1)} × ${fmt(sz, 1)} mm`], ['Materiál', `${fmt(Math.max(0.5, grams), grams < 10 ? 1 : 0)} g`], ['Tisk zhruba', hrs < 1 ? `${fmt(hrs * 60, 0)} min` : `${fmt(hrs, 1)} h`]]) {
    const d = document.createElement('div'); d.className = 'stat'; const s1 = document.createElement('span'); s1.textContent = a; const s2 = document.createElement('b'); s2.textContent = v; d.append(s1, s2); bx.append(d);
  }
  if (fitNext) { fit('persp'); fitNext = false; } else draw();
}

/* ===== Šablona otvorů (SVG v milimetrech, tisk 1:1) ===== */
function templateSVG(t) {
  const pad = 12, W = Math.max(t.W + 2 * pad, 135), H = t.H + 2 * pad + 14, ox = W / 2, oy = pad + 14 + t.H / 2, f = (v) => +v.toFixed(3);
  const Y = (y) => f(oy - y), X = (x) => f(t.mirror ? ox - x : ox + x);
  let s = `<?xml version="1.0" encoding="UTF-8"?>\n<svg xmlns="http://www.w3.org/2000/svg" width="${f(W)}mm" height="${f(H)}mm" viewBox="0 0 ${f(W)} ${f(H)}">\n`;
  s += `<rect width="100%" height="100%" fill="#fff"/>\n<g fill="none" stroke="#000" stroke-width="0.2">\n`;
  const R = (x, y, w, h, a) => { s += `<rect x="${f(Math.min(X(x - w / 2), X(x + w / 2)))}" y="${Y(y + h / 2)}" width="${f(w)}" height="${f(h)}"${a || ''}/>\n`; };
  R(0, 0, t.W, t.H, ' stroke-dasharray="2 1"');
  if (t.pcb) R(0, 0, t.pcb[0], t.pcb[1], ' stroke="#2f8a3a"');
  const hole = (x, y, d, col) => { s += `<circle cx="${X(x)}" cy="${Y(y)}" r="${f(d / 2)}"${col ? ` stroke="${col}"` : ''}/><path d="M${f(X(x) - d / 2 - 1.5)} ${Y(y)}h${f(d + 3)}M${X(x)} ${Y(y + d / 2 + 1.5)}v${f(d + 3)}" stroke-width="0.1"${col ? ` stroke="${col}"` : ''}/>\n`; };
  for (const [x, y, d] of t.holes) hole(x, y, d);
  for (const [x, y, d] of t.holesPcb || []) hole(x, y, d, '#2f8a3a');
  if (t.win) { const [x, y, w, h] = t.win; R(x, y, w, h, ' stroke-width="0.3"'); }
  s += `<path d="M${f(pad)} ${f(H - 4)}h50M${f(pad)} ${f(H - 5)}v2M${f(pad + 50)} ${f(H - 5)}v2"/>\n</g>\n`;
  s += `<text x="${f(pad)}" y="7" font-family="Arial, sans-serif" font-size="4">${t.title.replace(/&/g, '&amp;').replace(/</g, '&lt;')} – šablona 1:1 (pohled zepředu)</text>\n`;
  s += `<text x="${f(pad)}" y="11.5" font-family="Arial, sans-serif" font-size="2.6" fill="#555">Tiskněte ve skutečné velikosti (100 %). Kontrolní úsečka dole má 50 mm. Created by Julius Andy Antoš</text>\n`;
  s += `<text x="${f(pad + 52)}" y="${f(H - 3)}" font-family="Arial, sans-serif" font-size="2.6" fill="#555">50 mm</text>\n</svg>\n`;
  return s;
}
const inViewer = !!(window.claude && typeof window.claude.use === 'function');
let dlCap = null;
if (inViewer) window.claude.use('downloads').then(d => { dlCap = d; updateNote(); }).catch(() => updateNote());
function updateNote() { $('saveNote').textContent = inViewer ? (dlCap ? 'Tady se soubory stáhnou zabalené v ZIP.' : 'Stahování je v tomto zobrazení nedostupné.') : 'Díl je natočený tak, jak se má tisknout. Jednotky jsou milimetry.'; }
async function saveFiles(files, zipName) {
  if (inViewer) { if (!dlCap) return; try { await dlCap.save({ filename: zipName, data: makeZip(files) }); $('saveNote').textContent = 'ZIP je uložený.'; } catch (err) { if (err && err.code !== 'declined') $('saveNote').textContent = 'Soubor se nepodařilo uložit.'; } return; }
  for (const f of files) { const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([f.data], { type: f.type || 'model/stl' })); a.download = f.name; document.body.append(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 2000); if (files.length > 1) await new Promise(r => setTimeout(r, 300)); }
}
$('btnSave').onclick = () => {
  if (!model) return;
  const enc = (g) => { const u = stlBinary([g]), head = 'Created by Julius Andy Antos | Elektronika | mm'; for (let i = 0; i < 80; i++) u[i] = i < head.length ? head.charCodeAt(i) : 32; return u; };
  const files = model.files && model.files.length > 1 ? model.files.map(f => ({ name: model.name + '_' + f.name + '.stl', data: enc(f.g) })) : [{ name: model.name + '.stl', data: enc(model.files ? model.files[0].g : model.g) }];
  saveFiles(files, model.name + '.zip');
};
$('btnSvg').onclick = () => { if (!model || !model.tpl) return; const data = new TextEncoder().encode(templateSVG(model.tpl)); saveFiles([{ name: model.name + '_sablona.svg', data, type: 'image/svg+xml' }], model.name + '_sablona.zip'); };

/* ===== Instalace jako aplikace a sbalitelné sekce ===== */
let installEvt = null;
window.addEventListener('beforeinstallprompt', (e) => { e.preventDefault(); installEvt = e; $('btnInstall').hidden = false; });
window.addEventListener('appinstalled', () => { installEvt = null; $('btnInstall').hidden = true; });
$('btnInstall').onclick = async () => { if (!installEvt) return; installEvt.prompt(); try { await installEvt.userChoice; } catch (e) {} installEvt = null; $('btnInstall').hidden = true; };
if (!inViewer && 'serviceWorker' in navigator && (location.protocol === 'https:' || location.hostname === 'localhost')) navigator.serviceWorker.register('sw.js').catch(() => {});
(function () {
  const KEY = 'elektronika-sbaleno';
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

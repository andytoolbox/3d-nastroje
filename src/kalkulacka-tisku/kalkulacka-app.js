/* =====================================================================
   Kalkulačka ceny tisku – cena 3D tisku včetně vícebarevného tisku
   Created by Julius Andy Antoš
   ===================================================================== */
'use strict';
const $ = (id) => document.getElementById(id);
const STORE = 'kalkulacka-tisku-v1';

/* ===== Materiály: výchozí cena cívky, hmotnost cívky, hustota (g/cm³) ===== */
const MATS = {
  'PLA': [499, 1000, 1.24], 'PLA+': [549, 1000, 1.24], 'PLA Silk': [599, 1000, 1.24], 'PLA-CF': [899, 1000, 1.30],
  'PETG': [499, 1000, 1.27], 'PETG-CF': [899, 1000, 1.30], 'ABS': [549, 1000, 1.04], 'ASA': [649, 1000, 1.07],
  'TPU': [799, 1000, 1.21], 'PA': [1290, 1000, 1.14], 'PA-CF': [1690, 1000, 1.20], 'PC': [1190, 1000, 1.20],
  'PVA': [1490, 500, 1.23], 'HIPS': [549, 1000, 1.04], 'Jiný': [599, 1000, 1.24]
};
const COLORS = ['#e8e4da', '#2b2b2b', '#c9302c', '#2f6db5', '#f2c230', '#3a9a4a', '#e07b28', '#8a4fb0', '#7a7f85', '#f08cb4'];
const MAX_FIL = 16;

function defaults() {
  const prices = {}; Object.keys(MATS).forEach(m => { prices[m] = { price: MATS[m][0], spool: MATS[m][1] }; });
  return {
    name: '', h: 2, m: 30, perPlate: 1, plates: 1,
    fil: [{ mat: 'PLA', color: COLORS[0], price: 499, spool: 1000, g: 40 }],
    incl: false,
    waste: { on: false, mode: 'est', changes: 0, per: 0.8, tower: 0, g: 0 },
    el: { on: true, W: 120, kwh: 6 },
    wear: { on: true, price: 15000, life: 5000, maint: 2 },
    work: { on: false, prep: 10, post: 5, rate: 300 },
    extra: { on: false, piece: 0, job: 0 },
    risk: { on: false, pct: 10 },
    margin: { on: false, mode: 'markup', pct: 30, min: 0 },
    vat: { on: false, pct: 21 },
    round: '0', cur: 'Kč', prices
  };
}
function merge(base, add) {
  if (!add || typeof add !== 'object') return base;
  Object.keys(base).forEach(k => {
    if (!(k in add)) return;
    const b = base[k], a = add[k];
    if (Array.isArray(b)) { if (Array.isArray(a) && a.length) base[k] = a; }
    else if (b && typeof b === 'object') base[k] = merge(b, a);
    else if (typeof a === typeof b) base[k] = a;
  });
  if (add.prices && typeof add.prices === 'object') Object.keys(add.prices).forEach(m => { base.prices[m] = Object.assign({}, base.prices[m] || {}, add.prices[m]); });
  return base;
}
let S = defaults();
try { S = merge(defaults(), JSON.parse(localStorage.getItem(STORE) || 'null')); } catch (e) { S = defaults(); }
S.fil = S.fil.slice(0, MAX_FIL).map((f, i) => ({ mat: MATS[f.mat] ? f.mat : 'Jiný', color: /^#[0-9a-f]{6}$/i.test(f.color) ? f.color : COLORS[i % COLORS.length], price: +f.price || 0, spool: +f.spool || 1000, g: +f.g || 0 }));
let saveT = 0;
function saveNow() { clearTimeout(saveT); try { localStorage.setItem(STORE, JSON.stringify(S)); } catch (e) {} }
function save() { clearTimeout(saveT); saveT = setTimeout(saveNow, 300); }
window.addEventListener('pagehide', saveNow);
document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') saveNow(); });

/* ===== Pomocné ===== */
const getK = (k) => k.split('.').reduce((o, p) => (o == null ? o : o[p]), S);
function setK(k, v) { const p = k.split('.'); let o = S; for (let i = 0; i < p.length - 1; i++) o = o[p[i]]; o[p[p.length - 1]] = v; }
const num = (v) => { const n = parseFloat(String(v).replace(',', '.')); return isFinite(n) && n > 0 ? n : 0; };
const nf2 = new Intl.NumberFormat('cs-CZ', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const nf1 = new Intl.NumberFormat('cs-CZ', { minimumFractionDigits: 0, maximumFractionDigits: 1 });
const nf0 = new Intl.NumberFormat('cs-CZ', { maximumFractionDigits: 0 });
const money = (v) => nf2.format(v) + ' ' + S.cur;
const grams = (g) => (g >= 1000 ? nf2.format(g / 1000) + ' kg' : nf1.format(g) + ' g');
const hm = (hours) => { const t = Math.round(hours * 60), d = Math.floor(t / 1440), h = Math.floor((t % 1440) / 60), m = t % 60; return (d ? d + ' d ' : '') + (d || h ? h + ' h ' : '') + m + ' min'; };
const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

/* ===== Výpočet ===== */
function compute() {
  const T = num(S.h) + Math.min(num(S.m), 59.999) / 60;
  const perPlate = Math.max(1, Math.round(num(S.perPlate)) || 1), plates = Math.max(1, Math.round(num(S.plates)) || 1), N = perPlate * plates;
  const fil = S.fil.map(f => { const g = num(f.g), pg = num(f.price) / (num(f.spool) || 1000); return { f, g, pg, cost: g * pg }; });
  const gModel = fil.reduce((a, x) => a + x.g, 0);
  const filCost = fil.reduce((a, x) => a + x.cost, 0);
  const avgPG = gModel > 0 ? filCost / gModel : (fil[0] ? fil[0].pg : 0);
  const w = S.waste, wasteG = !w.on ? 0 : (w.mode === 'g' ? num(w.g) : Math.round(num(w.changes)) * num(w.per) + num(w.tower));
  const wasteCost = wasteG * avgPG;
  const kWh = S.el.on ? num(S.el.W) * T / 1000 : 0, elCost = kWh * num(S.el.kwh);
  const wearRate = num(S.wear.price) / (num(S.wear.life) || 1) + num(S.wear.maint), wearCost = S.wear.on ? wearRate * T : 0;
  const base1 = filCost + wasteCost + elCost + wearCost;                     // jeden výtisk
  const riskCost = S.risk.on ? base1 * num(S.risk.pct) / 100 : 0;
  const workMin = S.work.on ? num(S.work.prep) + num(S.work.post) * N : 0, workCost = workMin / 60 * num(S.work.rate);
  const extraCost = S.extra.on ? num(S.extra.piece) * N + num(S.extra.job) : 0;

  const items = [
    { k: 'fil', label: 'Filament', v: filCost * plates, c: 'var(--c1)', sub: fil.map(x => ({ label: x.f.mat + ' · ' + grams(x.g * plates), color: x.f.color, v: x.cost * plates })) },
    { k: 'waste', label: 'Odpad z výměn barev', v: wasteCost * plates, c: 'var(--c2)', note: wasteG ? grams(wasteG * plates) : '', on: w.on },
    { k: 'el', label: 'Elektřina', v: elCost * plates, c: 'var(--c3)', note: kWh ? nf2.format(kWh * plates) + ' kWh' : '', on: S.el.on },
    { k: 'wear', label: 'Opotřebení tiskárny', v: wearCost * plates, c: 'var(--c4)', note: S.wear.on ? hm(T * plates) + ' × ' + money(wearRate) + '/h' : '', on: S.wear.on },
    { k: 'risk', label: 'Rezerva na nepovedené tisky', v: riskCost * plates, c: 'var(--c7)', note: S.risk.on ? num(S.risk.pct) + ' %' : '', on: S.risk.on },
    { k: 'work', label: 'Práce', v: workCost, c: 'var(--c5)', note: workMin ? hm(workMin / 60) : '', on: S.work.on },
    { k: 'extra', label: 'Další náklady', v: extraCost, c: 'var(--c6)', on: S.extra.on }
  ];
  const cost = items.reduce((a, it) => a + it.v, 0);

  let price = cost, markup = 0, minAdd = 0;
  const pct = num(S.margin.pct), badMargin = S.margin.on && S.margin.mode === 'margin' && pct >= 100;
  if (S.margin.on && !badMargin) {
    price = S.margin.mode === 'margin' ? cost / (1 - pct / 100) : cost * (1 + pct / 100);
    markup = price - cost;
    const min = num(S.margin.min); if (min > 0 && price < min) { minAdd = min - price; price = min; }
  }
  const vat = S.vat.on ? num(S.vat.pct) / 100 : 0;
  const step = +S.round || 0;
  let pieceGross = price * (1 + vat) / N;
  if (step) pieceGross = Math.ceil(pieceGross / step - 1e-9) * step;
  const jobGross = step ? pieceGross * N : price * (1 + vat);
  if (!step) pieceGross = jobGross / N;
  const jobNet = jobGross / (1 + vat), roundAdd = step ? jobNet - price : 0, vatAmt = jobGross - jobNet;
  return { T, N, perPlate, plates, fil, gModel, wasteG, kWh, wearRate, items, cost, markup, minAdd, price, vat, vatAmt, roundAdd, jobNet, jobGross, pieceGross, pieceNet: jobNet / N, badMargin, avgPG };
}

/* ===== Filamenty (řádky) ===== */
function renderFils() {
  const box = $('fils'); box.innerHTML = '';
  S.fil.forEach((f, i) => {
    const d = document.createElement('div'); d.className = 'fil'; d.dataset.i = i;
    d.innerHTML =
      '<input type="color" data-f="color" aria-label="Barva ' + (i + 1) + '" value="' + esc(f.color) + '">' +
      '<div class="mat"><select data-f="mat" aria-label="Materiál ' + (i + 1) + '">' + Object.keys(MATS).map(m => '<option' + (m === f.mat ? ' selected' : '') + '>' + m + '</option>').join('') + '</select>' +
      '<span class="calc" data-o="pg"></span></div>' +
      '<button type="button" class="del" data-del aria-label="Odebrat barvu ' + (i + 1) + '"' + (S.fil.length < 2 ? ' hidden' : '') + '>✕</button>' +
      '<div class="vals">' +
      '<label>Spotřeba<span class="num"><input type="number" data-f="g" min="0" max="100000" step="0.1" inputmode="decimal" value="' + f.g + '"><span>g</span></span></label>' +
      '<label>Cena cívky<span class="num"><input type="number" data-f="price" min="0" max="100000" step="1" inputmode="decimal" value="' + f.price + '"><span>' + esc(S.cur) + '</span></span></label>' +
      '<label>Cívka<span class="num"><input type="number" data-f="spool" min="1" max="100000" step="50" inputmode="numeric" value="' + f.spool + '"><span>g</span></span></label>' +
      '</div>';
    box.appendChild(d);
  });
  $('addFil').hidden = S.fil.length >= MAX_FIL;
}
$('fils').addEventListener('input', (e) => {
  const row = e.target.closest('.fil'); if (!row) return;
  const f = S.fil[+row.dataset.i], k = e.target.dataset.f; if (!f || !k) return;
  if (k === 'mat') {
    f.mat = e.target.value; const p = S.prices[f.mat]; if (p) { f.price = p.price; f.spool = p.spool; }
    row.querySelector('[data-f=price]').value = f.price; row.querySelector('[data-f=spool]').value = f.spool;
  } else if (k === 'color') f.color = e.target.value;
  else {
    f[k] = e.target.value === '' ? 0 : num(e.target.value);
    if (k === 'price' || k === 'spool') S.prices[f.mat] = { price: f.price, spool: f.spool };   // zapamatovat cenu materiálu
  }
  update();
});
$('fils').addEventListener('click', (e) => {
  if (!e.target.closest('[data-del]')) return;
  const i = +e.target.closest('.fil').dataset.i; S.fil.splice(i, 1); renderFils(); update();
});
$('addFil').onclick = () => {
  if (S.fil.length >= MAX_FIL) return;
  const last = S.fil[S.fil.length - 1] || { mat: 'PLA' }, p = S.prices[last.mat] || { price: 499, spool: 1000 };
  const used = S.fil.map(f => f.color.toLowerCase());
  S.fil.push({ mat: last.mat, color: COLORS.find(c => !used.includes(c)) || COLORS[S.fil.length % COLORS.length], price: p.price, spool: p.spool, g: 0 });
  renderFils(); update();
  const inp = $('fils').lastElementChild.querySelector('[data-f=g]'); if (inp) { inp.focus(); inp.select(); }
};

/* ===== Propojení polí ===== */
function syncUI() {
  document.querySelectorAll('[data-k]').forEach(el => { const v = getK(el.dataset.k); if (el.type === 'checkbox') el.checked = !!v; else el.value = v; });
  document.querySelectorAll('input[type=radio][name]').forEach(el => { el.checked = String(getK(el.name)) === el.value; });
  renderFils();
}
document.querySelectorAll('[data-k]').forEach(el => {
  const on = () => {
    const k = el.dataset.k;
    let v = el.type === 'checkbox' ? el.checked : el.value;
    if (el.type === 'number') v = el.value === '' ? 0 : num(el.value);
    setK(k, v);
    if (k === 'cur') renderFils();
    update();
  };
  el.addEventListener(el.tagName === 'SELECT' || el.type === 'checkbox' ? 'change' : 'input', on);
});
document.querySelectorAll('input[type=radio][name]').forEach(el => el.addEventListener('change', () => { if (el.checked) { setK(el.name, el.value); update(); } }));

/* ===== Zobrazení výsledku ===== */
let last = null;
function update() {
  const r = compute(); last = r; save();
  document.querySelectorAll('section.card').forEach(c => { const t = c.querySelector(':scope > h2 .sw input'); if (t) c.classList.toggle('off', !t.checked); });
  document.querySelectorAll('[data-show]').forEach(el => {
    const s = el.dataset.show; el.hidden = !({ wasteEst: S.waste.mode !== 'g', wasteG: S.waste.mode === 'g' }[s]);
  });
  document.querySelectorAll('[data-cur]').forEach(el => { el.textContent = S.cur + el.dataset.cur; el.parentElement.classList.toggle('w', el.textContent.length > 3); });
  $('marginLbl').textContent = S.margin.mode === 'margin' ? 'Marže z prodejní ceny' : 'Přirážka k nákladům';
  const pct = num(S.margin.pct);
  $('marginHint').textContent = r.badMargin ? 'Marže z ceny musí být menší než 100 %.' :
    S.margin.mode === 'margin' ? 'Cena = náklady ÷ ' + nf2.format(1 - pct / 100) + ', tedy náklady × ' + nf2.format(1 / (1 - pct / 100)) + '.' : 'Cena = náklady × ' + nf2.format(1 + pct / 100) + '.';

  // částky v záhlaví karet
  const byK = {}; r.items.forEach(it => { byK[it.k] = it.v; });
  byK.margin = r.markup + r.minAdd; byK.vat = r.vatAmt;
  document.querySelectorAll('[data-cv]').forEach(el => { const v = byK[el.dataset.cv]; el.textContent = v ? money(v) : ''; });
  // řádky filamentu
  $('fils').querySelectorAll('.fil').forEach((row, i) => {
    const x = r.fil[i]; if (!x) return;
    row.querySelector('[data-o=pg]').innerHTML = nf2.format(x.pg * 1000) + '&nbsp;' + esc(S.cur) + '/kg · <b>' + money(x.cost) + '</b>';
  });
  $('filHint').textContent = S.fil.length > 1 ? S.fil.length + ' barvy · ' + grams(r.gModel) : '';
  $('elCalc').innerHTML = S.el.on ? 'Jeden výtisk: <b>' + nf2.format(r.kWh / r.plates) + ' kWh</b> · ' + money(r.kWh / r.plates * num(S.el.kwh)) : '';
  $('wearCalc').innerHTML = 'Hodina tisku: <b>' + money(r.wearRate) + '</b> (' + money(num(S.wear.price) / (num(S.wear.life) || 1)) + ' odpis + ' + money(num(S.wear.maint)) + ' údržba)';
  $('wasteHint').textContent = S.waste.mode === 'est'
    ? (r.wasteG ? 'Odpad na jeden výtisk ' + grams(r.wasteG) + ', počítá se průměrnou cenou použitých filamentů (' + nf2.format(r.avgPG * 1000) + ' ' + S.cur + '/kg). ' : '') + 'Počet výměn ukáže slicer. Odpad na výměnu bývá 0,3–1,5 g podle tiskárny a rozdílu barev (z tmavé na světlou víc).'
    : 'Bambu Studio a Orca ukazují po slicování zvlášť Flushed (proplach) a Tower (věž). Sečtěte je.';

  // zprávy
  const msgs = [];
  if (!r.T && (S.el.on || S.wear.on)) msgs.push(['warn', 'Zadejte dobu tisku, jinak se elektřina a opotřebení nespočítají.']);
  if (!r.gModel) msgs.push(['warn', 'Zadejte spotřebu filamentu v gramech, nebo načtěte soubor ze sliceru.']);
  if (S.fil.length > 1 && !S.waste.on && !S.incl) msgs.push(['info', 'Tisknete více barev. Zapněte „Odpad z výměn barev“, nebo zaškrtněte, že gramy už odpad obsahují.']);
  if (S.waste.on && S.incl) msgs.push(['warn', 'Gramy už obsahují odpad a zároveň je zapnutý odpad z výměn barev, takže se počítá dvakrát.']);
  if (r.badMargin) msgs.push(['bad', 'Marže z prodejní ceny musí být menší než 100 %. Cena se zatím počítá bez marže.']);
  renderMsgs(msgs);

  // hlavní čísla
  const selling = S.margin.on || S.vat.on;
  $('lblPiece').textContent = (selling ? 'Cena za kus' : 'Náklady na kus') + (S.vat.on ? ' s DPH' : '');
  $('lblJob').textContent = (selling ? 'Cena zakázky' : 'Náklady zakázky') + (S.vat.on ? ' s DPH' : '');
  $('outPiece').textContent = money(r.pieceGross);
  $('outJob').textContent = money(r.jobGross);
  $('subPiece').textContent = S.vat.on ? 'bez DPH ' + money(r.pieceNet) : (S.margin.on ? 'náklady ' + money(r.cost / r.N) : '');
  $('subJob').textContent = r.N + ' ks' + (r.plates > 1 ? ' (' + r.perPlate + ' ks × ' + r.plates + ' výtisků)' : '') + (S.margin.on ? ' · zisk ' + money(r.jobNet - r.cost) : '');
  $('stLbl').textContent = $('lblPiece').textContent; $('stPiece').textContent = money(r.pieceGross); $('stJob').textContent = r.N > 1 ? r.N + ' ks: ' + money(r.jobGross) : '';
  $('ptitle').textContent = (S.name ? S.name + ' · ' : '') + new Date().toLocaleDateString('cs-CZ');

  // pruh a legenda
  const vis = r.items.filter(it => it.v > 0);
  $('bar').innerHTML = vis.map(it => '<i style="flex:' + it.v + ';background:' + it.c + '" title="' + esc(it.label) + '"></i>').join('');
  $('legend').innerHTML = vis.map(it => '<span><i style="background:' + it.c + '"></i>' + esc(it.label) + ' ' + nf0.format(r.cost ? it.v / r.cost * 100 : 0) + ' %</span>').join('');

  // tabulka
  const N = r.N, rows = [];
  const tr = (cls, label, v, sub, color) => rows.push('<tr' + (cls ? ' class="' + cls + '"' : '') + '><td>' + (color ? '<i style="background:' + color + '"></i>' : '') + esc(label) + (sub ? '<small>' + esc(sub) + '</small>' : '') + '</td><td class="n">' + money(v) + '</td><td class="n">' + money(v / N) + '</td></tr>');
  r.items.forEach(it => {
    if (it.on === false) return;
    tr('', it.label, it.v, it.k === 'fil' ? grams(r.gModel * r.plates) : it.note, it.c);
    if (it.k === 'fil' && it.sub.length > 1) it.sub.forEach(s => tr('sub', s.label, s.v, '', s.color));
  });
  if (selling) tr('sum', 'Náklady celkem', r.cost);
  if (S.margin.on && !r.badMargin) tr('', (S.margin.mode === 'margin' ? 'Marže ' : 'Přirážka ') + nf1.format(num(S.margin.pct)) + ' %', r.markup);
  if (r.minAdd) tr('', 'Doplatek do minimální ceny', r.minAdd);
  if (r.roundAdd > 0.004) tr('', 'Zaokrouhlení', r.roundAdd);
  if (S.vat.on) { tr('sum', 'Cena bez DPH', r.jobNet); tr('', 'DPH ' + nf1.format(num(S.vat.pct)) + ' %', r.vatAmt); }
  tr('fin', selling ? 'Cena celkem' + (S.vat.on ? ' s DPH' : '') : 'Náklady celkem', r.jobGross);
  $('tbody').innerHTML = rows.join('');

  // souhrnná čísla
  const gTot = (r.gModel + r.wasteG) * r.plates;
  const stats = [['Filament celkem', grams(gTot)], ['Čas tisku', hm(r.T * r.plates)]];
  if (S.el.on) stats.push(['Spotřeba', nf2.format(r.kWh * r.plates) + ' kWh']);
  if (S.margin.on) stats.push(['Zisk', money(r.jobNet - r.cost)]);
  if (gTot) stats.push(['Cena za gram', money(r.jobGross / gTot)]);
  if (r.T) stats.push(['Za hodinu tisku', money(r.jobGross / (r.T * r.plates))]);
  $('stats').innerHTML = stats.map(s => '<div class="stat"><span>' + s[0] + '</span><b>' + s[1] + '</b></div>').join('');
}

let extraMsgs = [];
function renderMsgs(list) {
  $('msgs').innerHTML = extraMsgs.concat(list).map((m, i) => '<div class="msg ' + m[0] + '"><span>' + esc(m[1]) + '</span>' + (i < extraMsgs.length ? '<button type="button" data-x="' + i + '" aria-label="Zavřít">×</button>' : '') + '</div>').join('');
}
$('msgs').addEventListener('click', (e) => { const b = e.target.closest('[data-x]'); if (b) { extraMsgs.splice(+b.dataset.x, 1); update(); } });
function flash(type, text) { extraMsgs = [[type, text]]; update(); }

/* ===== Textový rozpis ===== */
function summary() {
  const r = last || compute(), L = [];
  L.push('Kalkulace 3D tisku' + (S.name ? ': ' + S.name : ''));
  L.push(r.N + ' ks' + (r.plates > 1 ? ' (' + r.perPlate + ' ks × ' + r.plates + ' výtisků)' : '') + ', čas tisku ' + hm(r.T * r.plates) + ', filament ' + grams((r.gModel + r.wasteG) * r.plates));
  L.push('');
  r.items.forEach(it => {
    if (it.on === false || !it.v) return;
    L.push(it.label + ': ' + money(it.v));
    if (it.k === 'fil' && it.sub.length > 1) it.sub.forEach(s => L.push('  – ' + s.label + ': ' + money(s.v)));
  });
  L.push('Náklady celkem: ' + money(r.cost));
  if (S.margin.on && !r.badMargin) L.push((S.margin.mode === 'margin' ? 'Marže ' : 'Přirážka ') + nf1.format(num(S.margin.pct)) + ' %: ' + money(r.markup));
  if (r.minAdd) L.push('Doplatek do minimální ceny: ' + money(r.minAdd));
  if (r.roundAdd > 0.004) L.push('Zaokrouhlení: ' + money(r.roundAdd));
  if (S.vat.on) { L.push('Cena bez DPH: ' + money(r.jobNet)); L.push('DPH ' + nf1.format(num(S.vat.pct)) + ' %: ' + money(r.vatAmt)); }
  L.push('');
  const sell = S.margin.on || S.vat.on, dph = S.vat.on ? ' s DPH' : '';
  L.push((sell ? 'Cena za kus' : 'Náklady na kus') + dph + ': ' + money(r.pieceGross));
  if (r.N > 1) L.push((sell ? 'Cena zakázky' : 'Náklady zakázky') + dph + ': ' + money(r.jobGross));
  return L.join('\n');
}
$('btnCopy').onclick = async () => {
  const t = summary(); let ok = false;
  try { await navigator.clipboard.writeText(t); ok = true; } catch (e) {
    const ta = document.createElement('textarea'); ta.value = t; ta.style.position = 'fixed'; ta.style.opacity = '0'; document.body.appendChild(ta); ta.select();
    try { ok = document.execCommand('copy'); } catch (e2) {} ta.remove();
  }
  $('actNote').textContent = ok ? 'Rozpis je ve schránce, můžete ho vložit do zprávy nebo e-mailu.' : 'Kopírování tu nejde, použijte Vytisknout / PDF.';
  setTimeout(() => { $('actNote').textContent = ''; }, 4000);
};
$('btnPrint').onclick = () => { update(); window.print(); };
$('btnNew').onclick = () => {
  Object.assign(S, { name: '', h: 0, m: 0, perPlate: 1, plates: 1, incl: false });
  S.fil.forEach(f => { f.g = 0; });
  Object.assign(S.waste, { changes: 0, tower: 0, g: 0 });
  extraMsgs = []; syncUI(); update();
  const n = document.querySelector('[data-k=name]'); if (n) n.focus();
};
let resetArm = 0;
$('btnReset').onclick = () => {
  const b = $('btnReset');
  if (!resetArm) { b.textContent = 'Opravdu? Klikněte znovu'; resetArm = setTimeout(() => { resetArm = 0; b.textContent = 'Obnovit výchozí nastavení'; }, 3500); return; }
  clearTimeout(resetArm); resetArm = 0; b.textContent = 'Obnovit výchozí nastavení';
  S = defaults(); extraMsgs = []; syncUI(); update();
};

/* ===== Načtení ze sliceru (G-code, .bgcode, .gcode.3mf) ===== */
function parseDur(s) {
  if (!s) return 0; let t = 0, m;
  const re = /(\d+(?:\.\d+)?)\s*([dhms])/gi;
  while ((m = re.exec(s))) t += +m[1] * { d: 86400, h: 3600, m: 60, s: 1 }[m[2].toLowerCase()];
  if (!t && /^\s*\d+:\d+(:\d+)?\s*$/.test(s)) { const p = s.trim().split(':').map(Number); t = p.length === 3 ? p[0] * 3600 + p[1] * 60 + p[2] : p[0] * 3600 + p[1] * 60; }
  return t;
}
const list = (s) => String(s || '').split(/[,;]/).map(x => parseFloat(x.trim())).filter(x => isFinite(x));
const strList = (s) => String(s || '').split(/[;,]/).map(x => x.trim().replace(/^"|"$/g, ''));
function normMat(t) {
  const u = String(t || '').toUpperCase().replace(/\s+/g, ' ').trim(); if (!u) return 'PLA';
  const keys = Object.keys(MATS).filter(k => k !== 'Jiný').sort((a, b) => b.length - a.length);
  const exact = keys.find(k => k.toUpperCase() === u); if (exact) return exact;
  if (/SILK/.test(u)) return 'PLA Silk';
  if (/PLA/.test(u) && /CF/.test(u)) return 'PLA-CF';
  if (/PETG|PCTG/.test(u)) return /CF/.test(u) ? 'PETG-CF' : 'PETG';
  if (/^(PA|PAHT|PA6|PA12|NYLON)/.test(u)) return /CF|GF/.test(u) ? 'PA-CF' : 'PA';
  return keys.find(k => u.startsWith(k.toUpperCase())) || 'Jiný';
}
function parseGcode(txt) {
  const g1 = (re) => { const m = txt.match(re); return m ? m[1] : null; };
  let sec = parseDur(g1(/total estimated time\s*[:=]\s*([^;\n]+)/i))
    || parseDur(g1(/estimated printing time \(normal mode\)\s*[:=]\s*([^\n]+)/i))
    || parseDur(g1(/model printing time\s*[:=]\s*([^;\n]+)/i))
    || parseDur(g1(/estimated printing time[^=:\n]*[:=]\s*([^\n]+)/i));
  if (!sec) { const c = g1(/;\s*TIME\s*:\s*(\d+)/); if (c) sec = +c; }
  const types = strList(g1(/;\s*filament_type\s*=\s*([^\n]+)/i));
  const colors = strList(g1(/;\s*filament_colou?r\s*=\s*([^\n]+)/i));
  let gl = list(g1(/total filament weight \[g\]\s*[:=]\s*([^\n]+)/i));
  if (!gl.length) gl = list(g1(/;\s*filament used \[g\]\s*[:=]\s*([^\n]+)/i));
  if (!gl.length) { const cm3 = list(g1(/filament used \[cm(?:3|\^3)\]\s*[:=]\s*([^\n]+)/i)); gl = cm3.map((v, i) => v * (MATS[normMat(types[i])] || MATS.PLA)[2]); }
  if (!gl.length) {                                   // Cura: délka v metrech, průměr 1,75 mm
    const mm = g1(/;\s*Filament used\s*:\s*([^\n]+)/i);
    if (mm) gl = list(mm.replace(/m/g, '')).map((v, i) => v * 100 * Math.PI * 0.0875 * 0.0875 * (MATS[normMat(types[i])] || MATS.PLA)[2]);
  }
  if (!gl.length) { const t = g1(/total filament used \[g\]\s*[:=]\s*([\d.]+)/i); if (t) gl = [+t]; }
  const ch = g1(/total toolchanges\s*[:=]\s*(\d+)/i) || g1(/filament change(?:s| times)?\s*[:=]\s*(\d+)/i);
  const fil = gl.map((g, i) => ({ g, type: types[i] || types[0], color: colors[i] })).filter(f => f.g > 0.005);
  return { sec, fil, changes: ch ? +ch : null };
}
async function inflateRaw(u8) {
  if (typeof DecompressionStream === 'undefined') throw new Error('old');
  const s = new Blob([u8]).stream().pipeThrough(new DecompressionStream('deflate-raw'));
  return new Uint8Array(await new Response(s).arrayBuffer());
}
async function unzip(buf, want) {
  const dv = new DataView(buf), u8 = new Uint8Array(buf), dec = new TextDecoder();
  let e = -1; for (let i = u8.length - 22; i >= Math.max(0, u8.length - 70000); i--) if (dv.getUint32(i, true) === 0x06054b50) { e = i; break; }
  if (e < 0) throw new Error('zip');
  const n = dv.getUint16(e + 10, true); let p = dv.getUint32(e + 16, true); const out = {};
  for (let k = 0; k < n && p + 46 <= u8.length && dv.getUint32(p, true) === 0x02014b50; k++) {
    const method = dv.getUint16(p + 10, true), csize = dv.getUint32(p + 20, true), nl = dv.getUint16(p + 28, true), xl = dv.getUint16(p + 30, true), cl = dv.getUint16(p + 32, true), off = dv.getUint32(p + 42, true);
    const name = dec.decode(u8.subarray(p + 46, p + 46 + nl)); p += 46 + nl + xl + cl;
    if (!want(name)) continue;
    const ds = off + 30 + dv.getUint16(off + 26, true) + dv.getUint16(off + 28, true), raw = u8.subarray(ds, ds + csize);
    out[name] = method === 0 ? raw : method === 8 ? await inflateRaw(raw) : null;
  }
  return out;
}
function headTail(u8) { const d = new TextDecoder('utf-8', { fatal: false }), L = 600000; return u8.length <= 2 * L ? d.decode(u8) : d.decode(u8.subarray(0, L)) + '\n' + d.decode(u8.subarray(u8.length - L)); }
async function parse3mf(buf) {
  const files = await unzip(buf, n => /slice_info\.config$/i.test(n) || /plate_\d+\.gcode$/i.test(n));
  const si = Object.keys(files).find(n => /slice_info/i.test(n));
  if (si && files[si]) {
    const doc = new DOMParser().parseFromString(new TextDecoder().decode(files[si]), 'application/xml');
    let sec = 0; const byId = {}, order = [];
    doc.querySelectorAll('plate').forEach(pl => {
      pl.querySelectorAll(':scope > metadata').forEach(m => { if (m.getAttribute('key') === 'prediction') sec += +m.getAttribute('value') || 0; });
      pl.querySelectorAll('filament').forEach(f => {
        const id = f.getAttribute('id') || String(order.length); const g = parseFloat(f.getAttribute('used_g')) || 0;
        if (!byId[id]) { byId[id] = { g: 0, type: f.getAttribute('type'), color: f.getAttribute('color') }; order.push(id); }
        byId[id].g += g;
      });
    });
    const fil = order.map(id => byId[id]).filter(f => f.g > 0.005);
    if (sec || fil.length) return { sec, fil, changes: null };
  }
  const gc = Object.keys(files).filter(n => /\.gcode$/i.test(n) && files[n]);
  if (gc.length) {
    const parts = gc.map(n => parseGcode(headTail(files[n])));
    const fil = []; parts.forEach(p => p.fil.forEach((f, i) => { if (fil[i]) fil[i].g += f.g; else fil[i] = Object.assign({}, f); }));
    return { sec: parts.reduce((a, p) => a + p.sec, 0), fil, changes: null };
  }
  return null;
}
async function loadFile(file) {
  if (!file) return;
  const isZip = /\.3mf$/i.test(file.name);
  let res = null;
  try {
    if (isZip) res = await parse3mf(await file.arrayBuffer());
    else {
      const L = 600000, head = await file.slice(0, L).text(), tail = file.size > L ? await file.slice(Math.max(L, file.size - L)).text() : '';
      res = parseGcode(head + '\n' + tail);
    }
  } catch (e) {
    flash('bad', e.message === 'old' ? 'Tento prohlížeč neumí otevřít soubor 3MF. Použijte G-code, nebo novější prohlížeč.' : 'Soubor se nepodařilo přečíst. Zkuste G-code nebo .gcode.3mf ze sliceru.');
    return;
  }
  if (!res || (!res.sec && !res.fil.length)) {
    flash('warn', isZip ? 'V souboru 3MF nejsou výsledky slicování. Ve sliceru klikněte na Slice a uložte „Export plate sliced file“ (.gcode.3mf), nebo načtěte G-code.'
      : 'V souboru jsem nenašel čas tisku ani spotřebu filamentu. Zadejte údaje ručně.');
    return;
  }
  if (res.sec) { const min = Math.ceil(res.sec / 60); S.h = Math.floor(min / 60); S.m = min % 60; }
  if (res.fil.length) {
    S.fil = res.fil.slice(0, MAX_FIL).map((f, i) => {
      const mat = normMat(f.type), p = S.prices[mat] || { price: MATS[mat][0], spool: MATS[mat][1] };
      const col = /^#?[0-9a-f]{6}/i.test(f.color || '') ? '#' + f.color.replace('#', '').slice(0, 6).toLowerCase() : COLORS[i % COLORS.length];
      return { mat, color: col, price: p.price, spool: p.spool, g: Math.round(f.g * 100) / 100 };
    });
    S.incl = true;
    if (S.fil.length > 1) S.waste.on = false;
  }
  if (res.changes != null) S.waste.changes = res.changes;
  if (!S.name) S.name = file.name.replace(/(\.gcode)?\.(3mf|gcode|gco|g|bgcode)$/i, '');
  const parts = [];
  if (res.sec) parts.push('čas ' + hm(res.sec / 3600));
  if (res.fil.length) parts.push(res.fil.length > 1 ? res.fil.length + ' barvy, ' + grams(res.fil.reduce((a, f) => a + f.g, 0)) : grams(res.fil[0].g));
  extraMsgs = [['ok', 'Načteno z „' + file.name + '“: ' + parts.join(', ') + '.' + (res.fil.length > 1 ? ' Gramy ze sliceru už obsahují odpad z výměn barev.' : '') + ' Zkontrolujte ceny filamentů.']];
  if (!res.sec) extraMsgs.push(['warn', 'Čas tisku v souboru nebyl, doplňte ho ručně.']);
  if (!res.fil.length) extraMsgs.push(['warn', 'Spotřeba filamentu v souboru nebyla, doplňte ji ručně.']);
  syncUI(); update();
}
const drop = $('drop'), fileIn = $('file');
drop.onclick = () => fileIn.click();
drop.onkeydown = (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); fileIn.click(); } };
fileIn.onchange = () => { loadFile(fileIn.files[0]); fileIn.value = ''; };
['dragenter', 'dragover'].forEach(t => drop.addEventListener(t, (e) => { e.preventDefault(); drop.classList.add('over'); }));
['dragleave', 'drop'].forEach(t => drop.addEventListener(t, (e) => { e.preventDefault(); drop.classList.remove('over'); }));
drop.addEventListener('drop', (e) => { const f = e.dataTransfer && e.dataTransfer.files[0]; if (f) loadFile(f); });
window.addEventListener('dragover', (e) => e.preventDefault());
window.addEventListener('drop', (e) => { e.preventDefault(); const f = e.dataTransfer && e.dataTransfer.files[0]; if (f) loadFile(f); });

$('sticky').onclick = () => $('hero').scrollIntoView({ behavior: 'smooth', block: 'start' });
$('sticky').onkeydown = (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); $('sticky').click(); } };

/* ===== Instalace jako aplikace ===== */
const inViewer = !!(window.claude && typeof window.claude.use === 'function');
let installEvt = null;
window.addEventListener('beforeinstallprompt', (e) => { e.preventDefault(); installEvt = e; $('btnInstall').hidden = false; });
window.addEventListener('appinstalled', () => { installEvt = null; $('btnInstall').hidden = true; });
$('btnInstall').onclick = async () => { if (!installEvt) return; installEvt.prompt(); try { await installEvt.userChoice; } catch (e) {} installEvt = null; $('btnInstall').hidden = true; };
if (!inViewer && 'serviceWorker' in navigator && (location.protocol === 'https:' || location.hostname === 'localhost')) navigator.serviceWorker.register('sw.js').catch(() => {});

/* ===== Start ===== */
syncUI(); update();

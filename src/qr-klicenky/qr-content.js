/* ===== QR klíčenky — obsah QR kódů. Created by Julius Andy Antoš ===== */
const QR_TYPES = [
  { id: 'web', name: 'Web' }, { id: 'ig', name: 'Instagram' }, { id: 'fb', name: 'Facebook' }, { id: 'tt', name: 'TikTok' }, { id: 'yt', name: 'YouTube' },
  { id: 'wa', name: 'WhatsApp' }, { id: 'tel', name: 'Telefon' }, { id: 'mail', name: 'E-mail' }, { id: 'sms', name: 'SMS' }, { id: 'vcard', name: 'Kontakt' },
  { id: 'wifi', name: 'Wi-Fi' }, { id: 'pay', name: 'Platba' }, { id: 'geo', name: 'Místo na mapě' }, { id: 'text', name: 'Text' },
];
function renderQrTypes() {
  const box = $('qrTypes'); if (!box || box.childElementCount === QR_TYPES.length) { if (box) box.querySelectorAll('button').forEach(b => b.setAttribute('aria-checked', String(b.dataset.id === D.qr.type))); return; }
  box.textContent = '';
  for (const t of QR_TYPES) {
    const b = document.createElement('button'); b.type = 'button'; b.textContent = t.name; b.dataset.id = t.id; b.setAttribute('role', 'radio');
    b.setAttribute('aria-checked', String(t.id === D.qr.type));
    b.onclick = () => keepInPlace(b, () => { D.qr.type = t.id; saveState(); updateUI(); schedule(); });
    box.append(b);
  }
}
/** Uživatelské jméno: odstraní @, mezery a případnou celou adresu profilu. */
function handle(s) { s = (s || '').trim().replace(/^https?:\/\/[^/]+\/?/i, '').replace(/^@/, '').split(/[/?#\s]/)[0]; return s.replace(/^@/, ''); }
/** Telefon do mezinárodního tvaru (+420 doplní u devítimístných čísel). */
function phone(s) {
  let d = (s || '').replace(/[^\d+]/g, ''); if (d.startsWith('00')) d = '+' + d.slice(2);
  if (/^\d{9}$/.test(d)) d = '+420' + d;
  return /^\+\d{8,15}$/.test(d) ? d : null;
}
const prettyPhone = (p) => p.replace(/^\+420(\d{3})(\d{3})(\d{3})$/, '+420 $1 $2 $3');
const vEsc = (s) => (s || '').replace(/([\\;,])/g, '\\$1').replace(/\n/g, '\\n');
function qrContent() {
  const q = D.qr, t = q.type;
  if (t === 'web') { let u = q.web.trim(); if (!u) return { err: 'Napište webovou adresu.' }; if (!/^[a-z][a-z0-9+.-]*:/i.test(u)) u = 'https://' + u;
    return { s: u, label: u.replace(/^https?:\/\//i, '').replace(/^www\./i, '').replace(/\/$/, '') }; }
  if (t === 'ig' || t === 'tt' || t === 'yt' || t === 'fb') {
    const h = handle(q[t]); if (!h) return { err: 'Napište uživatelské jméno.' };
    const url = { ig: `https://instagram.com/${h}`, tt: `https://www.tiktok.com/@${h}`, yt: `https://youtube.com/@${h}`, fb: `https://facebook.com/${h}` }[t];
    return { s: url, label: t === 'fb' ? h : '@' + h };
  }
  if (t === 'wa') { const p = phone(q.wa); if (!p) return { err: 'Napište platné telefonní číslo, např. 777 123 456 nebo +420 777 123 456.' };
    return { s: `https://wa.me/${p.slice(1)}` + (q.waMsg.trim() ? `?text=${encodeURIComponent(q.waMsg.trim())}` : ''), label: prettyPhone(p) }; }
  if (t === 'tel') { const p = phone(q.tel); if (!p) return { err: 'Napište platné telefonní číslo, např. 777 123 456 nebo +420 777 123 456.' }; return { s: `tel:${p}`, label: prettyPhone(p) }; }
  if (t === 'sms') { const p = phone(q.sms); if (!p) return { err: 'Napište platné telefonní číslo.' }; return { s: `SMSTO:${p}:${q.smsMsg.trim()}`, label: prettyPhone(p) }; }
  if (t === 'mail') { const m = q.mail.trim(); if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(m)) return { err: 'Napište platnou e-mailovou adresu.' };
    return { s: `mailto:${m}` + (q.mailSubj.trim() ? `?subject=${encodeURIComponent(q.mailSubj.trim())}` : ''), label: m }; }
  if (t === 'vcard') {
    if (!q.vcFirst.trim() && !q.vcLast.trim()) return { err: 'Vyplňte aspoň jméno nebo příjmení.' };
    const p = q.vcTel.trim() ? phone(q.vcTel) : null; if (q.vcTel.trim() && !p) return { err: 'Telefon v kontaktu není platný.' };
    const L = ['BEGIN:VCARD', 'VERSION:3.0', `N:${vEsc(q.vcLast.trim())};${vEsc(q.vcFirst.trim())};;;`, `FN:${vEsc((q.vcFirst.trim() + ' ' + q.vcLast.trim()).trim())}`];
    if (q.vcOrg.trim()) L.push(`ORG:${vEsc(q.vcOrg.trim())}`); if (p) L.push(`TEL;TYPE=CELL:${p}`);
    if (q.vcMail.trim()) L.push(`EMAIL:${q.vcMail.trim()}`); if (q.vcWeb.trim()) L.push(`URL:${q.vcWeb.trim()}`); L.push('END:VCARD');
    return { s: L.join('\n'), label: (q.vcFirst.trim() + ' ' + q.vcLast.trim()).trim() };
  }
  if (t === 'wifi') { if (!q.ssid.trim()) return { err: 'Vyplňte název Wi-Fi sítě.' }; return { s: wifiString({ sec: q.sec, ssid: q.ssid, pass: q.pass, hidden: q.hidden }), label: 'Wi-Fi ' + q.ssid.trim() }; }
  if (t === 'geo') {
    const m = q.geo.replace(/°/g, '').match(/(-?\d{1,3}(?:\.\d+)?)[NS]?\s*[,;\s]\s*(-?\d{1,3}(?:\.\d+)?)/i);
    if (!m || Math.abs(+m[1]) > 90 || Math.abs(+m[2]) > 180) return { err: 'Napište souřadnice jako dvě čísla s desetinnou tečkou, např. 50.0755, 14.4378.' };
    return { s: `https://www.google.com/maps?q=${(+m[1]).toFixed(6)},${(+m[2]).toFixed(6)}`, label: 'Najdete nás zde' };
  }
  if (t === 'text') { const s = q.text.trim(); return s ? { s, label: '' } : { err: 'Napište text.' }; }
  const raw = q.acc.trim(); if (!raw) return { err: 'Vyplňte číslo účtu nebo IBAN.' };
  const iban = /^[A-Za-z]{2}/.test(raw) ? raw.replace(/\s+/g, '').toUpperCase() : czAccountToIban(raw);
  if (!iban || !ibanValid(iban)) return { err: 'Číslo účtu nebo IBAN není platné. Zkontrolujte ho (formát 123456789/0300 nebo CZ…).' };
  return { s: spdString({ iban, amount: q.amount || 0, vs: q.vs, msg: q.msg }), note: `Účet ${iban}`, label: q.amount > 0 ? `QR platba ${q.amount} Kč` : 'QR platba' };
}
let labelFont = null;
function getLabelFont() { if (!labelFont) { const s = atob(LABEL_FONT_B64), u = new Uint8Array(s.length); for (let i = 0; i < s.length; i++) u[i] = s.charCodeAt(i); labelFont = opentype.parse(u.buffer); } return labelFont; }

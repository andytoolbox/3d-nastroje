# 3D nástroje

Bezplatné nástroje pro 3D tisk v češtině. Všechno se počítá přímo v prohlížeči, nic se nikam neodesílá a nástroje fungují i na mobilu a bez internetu.

**Created by Julius Andy Antoš**

![Rozcestník 3D nástrojů](.github/nahled.jpg)

## Nástroje

| | Nástroj | Co umí |
|---|---|---|
| <img src="docs/img/pismo-do-stl-ikona.png" width="32"> | **Písmo do STL** | Text jako 3D model: samotná písmena, s obrysem, na destičce nebo nastojato. Klíčenky, jmenovky, rytý text, ikony, vlastní logo. |
| <img src="docs/img/dual-text-studio-ikona.png" width="32"> | **Dual Text Studio** | Dvojitý 3D nápis: zepředu jedno slovo, z boku druhé, případně shora třetí. |
| <img src="docs/img/svitici-fotky-ikona.png" width="32"> | **Svítící fotky** | Litofánie z fotek: rovné a prohnuté destičky, srdce, lucerny a stínítka na lampu s křížem na objímku. |
| <img src="docs/img/svg-studio-ikona.png" width="32"> | **SVG Studio** | Z obrázku nebo SVG udělá 3D tvar, vektorový obrys SVG nebo plastický reliéf z fotky. |
| <img src="docs/img/qr-klicenky-ikona.png" width="32"> | **QR klíčenky** | QR kód na klíčence, cedulce nebo stojánku: web, sociální sítě, kontakt, Wi-Fi, QR platba, logo uprostřed. |
| <img src="docs/img/cookie-cutter-studio-ikona.png" width="32"> | **Cookie Cutter Studio** | Vykrajovátka na cukroví z tvarů, obrázku, SVG nebo textu, k tomu razítko s reliéfem. |

Všechny nástroje stahují model jako **STL** (jednotky mm), který otevřete v libovolném sliceru (Bambu Studio, PrusaSlicer, Creality Print, Cura). Modely jsou uzavřená tělesa připravená k tisku.

## Spuštění

- **Online:** složka [`docs/`](docs) je hotový web. Zapněte GitHub Pages (*Settings → Pages → Branch: `main`, složka `/docs`*) a web poběží na adrese `https://<uživatel>.github.io/3d-nastroje/`.
- **Na vlastním serveru:** obsah složky `docs/` nahrajte přes FTP, např. do `www/3d-nastroje/`. Server nepotřebuje nic dalšího. PHP je potřeba jen pro volitelný seznam vlastních písem v Písmu do STL (`fonts/list.php`).
- **Bez internetu:** po sestavení najdete ve `dist/offline/` každý nástroj jako jeden HTML soubor, stačí ho otevřít v prohlížeči.

## Struktura

```
build.py               sestavení webu a offline verzí
src/
  hub/                 rozcestník (index.html, nastroje.js = seznam nástrojů, styl.css, img/)
  shared/              společný kód: geometrie, převody obrázků, litofánie
  vendor/              přibalené knihovny (three.js, opentype.js, Clipper, qrcode, jsQR)
  fonts/               písma (zmenšená na české znaky)
  <nástroj>/           stránka nástroje (*.html), jeho kód (*-app.js), pwa/ (ikony, manifest, offline režim)
docs/                  sestavený web (vzniká příkazem python build.py)
```

Stránka nástroje obsahuje značky jako `/*__CORE__*/` nebo `/*__APP__*/` a `build.py` je nahradí obsahem souborů a knihovnami. Díky tomu je každý nástroj na webu jediný soubor `index.html`, který funguje i offline.

## Úpravy a sestavení

```bash
pip install -r requirements.txt   # jen poprvé (fonttools)
python build.py                   # sestaví rozcestník a všechny nástroje
python build.py qr-klicenky       # jen jeden nástroj
```

Po úpravě v `src/` spusťte `python build.py`, zkontrolujte `docs/` v prohlížeči a změny nahrajte (commit + push). GitHub Pages se aktualizují samy.

### Přidání nového nástroje

1. Vytvořte složku `src/novy-nastroj/` se stránkou, kódem a složkou `pwa/` (stačí zkopírovat z jiného nástroje a upravit).
2. Doplňte nástroj do slovníku `TOOLS` v `build.py`.
3. Na rozcestník ho přidáte v `src/hub/nastroje.js` (jeden blok textu) a do `src/hub/img/` dáte náhled `novy-nastroj.jpg` (640 × 400) a ikonu `novy-nastroj-ikona.png`.
4. Spusťte `python build.py`.

## Licence

Kód je pod licencí [MIT](LICENSE): můžete ho volně používat i upravovat, jen zachovejte uvedení autora a licenci.
Přibalené knihovny a písma mají vlastní licence, viz [THIRD-PARTY.md](THIRD-PARTY.md).

---

*English: Free browser-based tools for 3D printing (text to STL, lithophanes, QR keychains, cookie cutters, SVG/relief conversion, dual-text illusions). Everything runs locally in the browser. Czech UI. MIT licensed.*

/* =====================================================================
   3D nástroje – seznam nástrojů na rozcestníku
   Created by Julius Andy Antoš
   ---------------------------------------------------------------------
   NOVÝ NÁSTROJ PŘIDÁTE TAK, ŽE:
   1. nahrajete jeho složku vedle ostatních (např. www/3d-nastroje/novy-nastroj/),
   2. do img/ dáte náhled (novy-nastroj.jpg, 640 × 400) a ikonu (novy-nastroj-ikona.png),
   3. níže zkopírujete jeden blok { … }, upravíte texty a uložíte.
   Pořadí na stránce = pořadí v seznamu. Kategorie se vytvoří samy podle „kategorie“.
   ===================================================================== */
window.WEB = {
  nazev: '3D nástroje',
  podnadpis: 'Bezplatné nástroje pro 3D tisk v češtině. Vše se počítá ve vašem prohlížeči, nic se nikam neodesílá a funguje to i na mobilu.',
  domu: null,   // odkaz vpravo nahoře, např. { text: 'Úvod', odkaz: '/' }; null = bez odkazu
  podpis: 'Created by Julius Andy Antoš'
};

window.NASTROJE = [
  {
    id: 'pismo-do-stl',
    nazev: 'Písmo do STL',
    popis: 'Text jako 3D model: samotná písmena, s obrysem, na destičce nebo nastojato. Klíčenky, jmenovky, rytý text, ikony a vlastní logo.',
    kategorie: 'Text a písmo',
    stitky: ['jmenovky', 'klíčenky', 'cedulky', 'písma'],
    odkaz: 'pismo-do-stl/'
  },
  {
    id: 'dual-text-studio',
    nazev: 'Dual Text Studio',
    popis: 'Dvojitý 3D nápis: zepředu jedno slovo, z boku druhé. Dárek pro rodiče, dvě jména nebo jméno a datum.',
    kategorie: 'Text a písmo',
    stitky: ['dárky', 'jména', 'iluze'],
    odkaz: 'dual-text-studio/',
    novinka: true
  },
  {
    id: 'svitici-fotky',
    nazev: 'Svítící fotky',
    popis: 'Litofánie z vašich fotek: rovné i prohnuté destičky, srdce, lucerny a stínítka na lampu s křížem na objímku.',
    kategorie: 'Fotky',
    stitky: ['litofánie', 'lampa', 'dárky'],
    odkaz: 'svitici-fotky/'
  },
  {
    id: 'svg-studio',
    nazev: 'SVG Studio',
    popis: 'Převody obrázků: z obrázku nebo SVG udělá 3D tvar, vektorový obrys SVG pro laser a plotr, nebo plastický reliéf z fotky.',
    kategorie: 'Převody obrázků',
    stitky: ['SVG', 'reliéf', 'logo', 'laser'],
    odkaz: 'svg-studio/',
    novinka: true
  },
  {
    id: 'qr-klicenky',
    nazev: 'QR klíčenky',
    popis: 'QR kód na klíčence, cedulce nebo stojánku: web, Instagram, kontakt, Wi-Fi nebo QR platba. I s logem uprostřed.',
    kategorie: 'Dárky a drobnosti',
    stitky: ['QR kód', 'Wi-Fi', 'platba', 'klíčenky'],
    odkaz: 'qr-klicenky/'
  },
  {
    id: 'cookie-cutter-studio',
    nazev: 'Cookie Cutter Studio',
    popis: 'Vykrajovátka na cukroví a perníčky z hotových tvarů, obrázku, SVG nebo textu. K tomu razítko, které otiskne kresbu.',
    kategorie: 'Kuchyně',
    stitky: ['vykrajovátka', 'perníčky', 'razítka'],
    odkaz: 'cookie-cutter-studio/',
    novinka: true
  },
  {
    id: 'krabicky',
    nazev: 'Krabičky a organizéry',
    popis: 'Krabička na míru s přihrádkami a víčkem (nasazovací nebo posuvné, s nápisem), Gridfinity boxy s magnety a podložky do šuplíku.',
    kategorie: 'Organizace',
    stitky: ['krabička', 'víčko', 'přihrádky', 'Gridfinity', 'šuplík'],
    odkaz: 'krabicky/',
    novinka: true
  },
  {
    id: 'vazy',
    nazev: 'Vázy a lampy',
    popis: 'Vázy, květináče s miskou a stínidla: tvar, vlny, hvězdy, žebra a zkroucení. Pro tisk v režimu váza nebo se stěnou.',
    kategorie: 'Domov',
    stitky: ['váza', 'květináč', 'stínidlo', 'režim váza', 'spiralize'],
    odkaz: 'vazy/',
    novinka: true
  },
  {
    id: 'zavity',
    nazev: 'Závity a šrouby',
    popis: 'Šrouby, matice, podložky a závitové tyče s metrickým i trapézovým závitem. Hlavy imbus, torx, šestihran, křížová, zápustná i motýlková. Závit vloží i do vašeho modelu.',
    kategorie: 'Díly',
    stitky: ['šroub', 'matice', 'závit', 'trapézový závit', 'motýlková matice'],
    odkaz: 'zavity/',
    novinka: true
  },
  {
    id: 'ozubena-kola',
    nazev: 'Ozubená kola',
    popis: 'Čelní kola a pastorky (rovné, šikmé, šípové), vnitřní věnce, hřebeny, dvojice kol a planetové převodovky. V náhledu je jde roztočit.',
    kategorie: 'Díly',
    stitky: ['ozubené kolo', 'pastorek', 'věnec', 'hřeben', 'planetová převodovka'],
    odkaz: 'ozubena-kola/',
    novinka: true
  },
  {
    id: 'kalibrace',
    nazev: 'Kalibrační testy',
    popis: 'Kostka, teplotní věž, převisy, mosty, vůle a vlasení. Ke každému testu návod, jak ho vyhodnotit, a u kostky výpočet odchylek.',
    kategorie: 'Nastavení tiskárny',
    stitky: ['kalibrace', 'teplota', 'převisy', 'tolerance', 'retrakce'],
    odkaz: 'kalibrace/',
    novinka: true
  },
  {
    id: 'kontrola-stl',
    nazev: 'Kontrola STL',
    popis: 'Otevře STL, OBJ i 3MF: rozměry, hmotnost, cena, díry a převisy. Model opraví, zjednoduší, převede mezi formáty a najde nejlepší natočení k tisku.',
    kategorie: 'Nastavení tiskárny',
    stitky: ['STL', 'oprava', 'převod OBJ 3MF', 'zjednodušení', 'převisy'],
    odkaz: 'kontrola-stl/',
    novinka: true
  },
  {
    id: 'kalkulacka-tisku',
    nazev: 'Kalkulačka ceny tisku',
    popis: 'Kolik výtisk stojí a za kolik ho prodat: filament i vícebarevný tisk, elektřina, opotřebení, práce, marže a DPH. Čas a gramy načte ze sliceru.',
    kategorie: 'Výpočty',
    stitky: ['cena', 'filament', 'vícebarevný tisk', 'nabídka'],
    odkaz: 'kalkulacka-tisku/',
    novinka: true
  }
];

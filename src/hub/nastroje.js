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
    popis: 'Dvojitý 3D nápis: zepředu jedno slovo, z boku druhé, a když chcete, shora i třetí. Dárek pro rodiče nebo dvě jména.',
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
  }
];

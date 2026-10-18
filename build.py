#!/usr/bin/env python3
"""
3D nástroje – sestavení webu a offline verzí
Created by Julius Andy Antoš

Použití:
    pip install fonttools        (jen poprvé)
    python build.py              sestaví vše
    python build.py qr-klicenky  sestaví jen jeden nástroj (a rozcestník)

Výstup:
    docs/                    hotový web (rozcestník + nástroje) – nahrává se na server
                             nebo ho zobrazí GitHub Pages (Settings → Pages → /docs)
    dist/offline/*.html      každý nástroj jako jeden soubor, funguje bez internetu
    dist/artifact/*.html     verze s knihovnami z CDN (menší, pro vložení jinam)
"""
import base64, json, os, re, shutil, sys, time

ROOT = os.path.dirname(os.path.abspath(__file__))
SRC = os.path.join(ROOT, 'src')
DOCS = os.path.join(ROOT, 'docs')
DIST = os.path.join(ROOT, 'dist')

def rd(*p, mode='r'):
    with open(os.path.join(SRC, *p), mode, **({} if 'b' in mode else {'encoding': 'utf-8'})) as f:
        return f.read()

def b64(*p):
    return base64.b64encode(rd(*p, mode='rb')).decode()

# Knihovny: adresa v HTML -> soubor ve src/vendor (pro offline a webovou verzi se vloží přímo do stránky)
VENDOR = {
    'https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js': 'three.min.js',
    'https://cdnjs.cloudflare.com/ajax/libs/opentype.js/1.3.4/opentype.min.js': 'opentype.min.js',
    'https://cdn.jsdelivr.net/npm/clipper-lib@6.4.2/clipper.js': 'clipper.min.js',
    'https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/loaders/SVGLoader.js': 'SVGLoader.min.js',
    'https://cdn.jsdelivr.net/npm/qrcode-generator@1.4.4/qrcode.js': 'qrcode.min.js',
    'https://cdn.jsdelivr.net/npm/jsqr@1.4.0/dist/jsQR.js': 'jsQR.js',
}

def pismo_fonts():
    """Vestavěná písma pro Písmo do STL: název písma -> base64, plus rozdělení do kategorií."""
    from fontTools.ttLib import TTFont
    fonts = {}
    for f in sorted(os.listdir(os.path.join(SRC, 'fonts'))):
        if f.endswith('.sub.ttf'):
            name = TTFont(os.path.join(SRC, 'fonts', f))['name'].getDebugName(4)
            fonts[name] = b64('fonts', f)
    cats = json.dumps(json.loads(rd('fonts', 'font-cats.json')), ensure_ascii=False)
    return 'const BUILTIN = ' + json.dumps(fonts) + ';\nconst BUILTIN_CAT = ' + cats + ';'

def font_set(var, mapping):
    return 'const %s = %s;' % (var, json.dumps({k: b64('fonts', v) for k, v in mapping.items()}))

# Popis nástrojů: zdrojová stránka, co se vloží místo značek /*__NAZEV__*/, název pro instalaci na telefon
TOOLS = {
    'pismo-do-stl': {
        'page': 'page.html', 'title': 'Písmo STL', 'extra': {'list.php': 'fonts/list.php'},
        'parts': {'FONTS': pismo_fonts, 'CORE': 'shared/core.js'},
    },
    'svitici-fotky': {
        'page': 'litho.html', 'title': 'Svítící fotky',
        'parts': {'CORE': 'shared/core.js', 'DILNA': 'shared/dilna-core.js', 'LITHO': 'shared/litho-core.js', 'APP': 'litho-app.js'},
    },
    'qr-klicenky': {
        'page': 'qr.html', 'title': 'QR klíčenky',
        'parts': {'FONT': lambda: 'const LABEL_FONT_B64 = "%s";' % b64('fonts', 'Poppins-Bold.sub.ttf'),
                  'CORE': 'shared/core.js', 'DILNA': 'shared/dilna-core.js', 'QRC': 'qr-content.js', 'APP': 'qr-app.js'},
    },
    'cookie-cutter-studio': {
        'page': 'cookie.html', 'title': 'Cookie Cutter Studio',
        'parts': {'FONTS': lambda: font_set('COOKIE_FONTS', {'pacifico': 'GF-Pacifico-Regular.sub.ttf', 'lobster': 'GF-Lobster-Regular.sub.ttf',
                      'baloo': 'GF-Baloo2-ExtraBold.sub.ttf', 'poppins': 'Poppins-Bold.sub.ttf', 'comic': 'GF-ComicNeue-Bold.sub.ttf'}),
                  'CORE': 'shared/core.js', 'DILNA': 'shared/dilna-core.js', 'APP': 'cookie-app.js'},
    },
    'svg-studio': {
        'page': 'studio.html', 'title': 'SVG Studio',
        'parts': {'CORE': 'shared/core.js', 'DILNA': 'shared/dilna-core.js', 'LITHO': 'shared/litho-core.js', 'APP': 'studio-app.js'},
    },
    'dual-text-studio': {
        'page': 'dual.html', 'title': 'Dual Text Studio',
        'parts': {'FONTS': lambda: font_set('DUAL_FONTS', {'anton': 'GF-Anton-Regular.sub.ttf', 'bebas': 'GF-BebasNeue-Regular.sub.ttf',
                      'bungee': 'GF-Bungee-Regular.sub.ttf', 'baloo': 'GF-Baloo2-ExtraBold.sub.ttf', 'poppins': 'Poppins-Bold.sub.ttf',
                      'liberation': 'LiberationSans-Bold.sub.ttf'}),
                  'CORE': 'shared/core.js', 'DILNA': 'shared/dilna-core.js', 'APP': 'dual-app.js'},
    },
}

def build_tool(tid, cfg, stamp):
    page = rd(tid, cfg['page'])
    for key, val in cfg['parts'].items():
        tag = '/*__%s__*/' % key
        assert tag in page, '%s: chybí značka %s' % (tid, tag)
        content = val() if callable(val) else (rd(val) if '/' in val else rd(tid, val))
        page = page.replace(tag, content)
    left = re.findall(r'/\*__[A-Z]+__\*/', page)
    assert not left, '%s: nevyplněné značky %s' % (tid, left)

    # 1) verze s knihovnami z CDN (fragment bez <html>, jak se vkládá do artefaktu)
    os.makedirs(os.path.join(DIST, 'artifact'), exist_ok=True)
    with open(os.path.join(DIST, 'artifact', tid + '.html'), 'w', encoding='utf-8') as f: f.write(page)

    # 2) celý dokument
    t_end = page.index('</style>') + len('</style>')
    doc = ('<!DOCTYPE html>\n<html lang="cs">\n<head>\n<meta charset="utf-8">\n'
           '<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">\n'
           + page[:t_end] + '\n</head>\n<body>\n' + page[t_end:] + '\n</body>\n</html>\n')

    # 3) offline: knihovny přímo ve stránce, bez písem z Googlu
    for url in re.findall(r'<script src="(https://[^"]+)"></script>', doc):
        assert url in VENDOR, '%s: neznámá knihovna %s (doplňte do VENDOR)' % (tid, url)
        doc = doc.replace('<script src="%s"></script>' % url,
                          '<script>/* %s (přibaleno pro offline použití) */\n%s\n</script>' % (url.split('/')[-1], rd('vendor', VENDOR[url])))
    doc = re.sub(r'<link rel="preconnect"[^>]*>\n?', '', doc)
    doc = re.sub(r'<link rel="stylesheet" href="https://fonts.googleapis.com[^>]*>\n?', '', doc)
    doc = doc.replace('<meta charset="utf-8">', '<meta charset="utf-8">\n<meta name="author" content="Julius Andy Antoš">', 1)
    os.makedirs(os.path.join(DIST, 'offline'), exist_ok=True)
    with open(os.path.join(DIST, 'offline', tid + '-offline.html'), 'w', encoding='utf-8') as f: f.write(doc)

    # 4) web: offline verze + instalace jako aplikace (PWA)
    pwa = ('<link rel="manifest" href="manifest.json">\n<meta name="theme-color" content="#0b7a72">\n'
           '<link rel="icon" type="image/png" sizes="192x192" href="icons/icon-192.png">\n<link rel="apple-touch-icon" href="icons/apple-touch-icon.png">\n'
           '<meta name="mobile-web-app-capable" content="yes">\n<meta name="apple-mobile-web-app-title" content="%s">\n' % cfg['title'])
    web = doc.replace('<meta name="author" content="Julius Andy Antoš">', '<meta name="author" content="Julius Andy Antoš">\n' + pwa, 1)
    out = os.path.join(DOCS, tid)
    shutil.rmtree(out, ignore_errors=True); os.makedirs(out)
    with open(os.path.join(out, 'index.html'), 'w', encoding='utf-8') as f: f.write(web)
    shutil.copytree(os.path.join(SRC, tid, 'pwa', 'icons'), os.path.join(out, 'icons'))
    shutil.copy(os.path.join(SRC, tid, 'pwa', 'manifest.json'), out)
    with open(os.path.join(out, 'sw.js'), 'w', encoding='utf-8') as f: f.write(rd(tid, 'pwa', 'sw.js').replace('__BUILD__', stamp))
    if os.path.exists(os.path.join(SRC, tid, 'CTIMNE.txt')): shutil.copy(os.path.join(SRC, tid, 'CTIMNE.txt'), out)
    for src, dst in cfg.get('extra', {}).items():
        os.makedirs(os.path.dirname(os.path.join(out, dst)), exist_ok=True); shutil.copy(os.path.join(SRC, tid, src), os.path.join(out, dst))
    print('  %-22s web %5d kB · offline %5d kB' % (tid, len(web.encode()) // 1024, len(doc.encode()) // 1024))

def build_hub():
    os.makedirs(DOCS, exist_ok=True)
    for name in os.listdir(os.path.join(SRC, 'hub')):
        s, d = os.path.join(SRC, 'hub', name), os.path.join(DOCS, name)
        if os.path.isdir(s): shutil.rmtree(d, ignore_errors=True); shutil.copytree(s, d)
        else: shutil.copy(s, d)
    open(os.path.join(DOCS, '.nojekyll'), 'w').close()  # GitHub Pages: soubory brát tak, jak jsou
    print('  rozcestník')

if __name__ == '__main__':
    only = sys.argv[1:]
    for t in only: assert t in TOOLS, 'Neznámý nástroj: %s (možnosti: %s)' % (t, ', '.join(TOOLS))
    stamp = time.strftime('%Y%m%d%H%M%S')
    print('Sestavuji 3D nástroje…')
    build_hub()
    for tid, cfg in TOOLS.items():
        if not only or tid in only: build_tool(tid, cfg, stamp)
    print('Hotovo: docs/ (web) a dist/offline/ (offline soubory).')

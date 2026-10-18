# Knihovny a písma třetích stran

Tyto soubory nejsou dílem autora 3D nástrojů a platí pro ně jejich vlastní licence.
Ve složce `src/vendor/` jsou přibalené beze změn, aby nástroje fungovaly i bez internetu.

## Knihovny (`src/vendor/`)

| Soubor | Projekt | Verze | Licence |
|---|---|---|---|
| `three.min.js`, `SVGLoader.min.js` | [three.js](https://github.com/mrdoob/three.js) | r128 | MIT |
| `opentype.min.js` | [opentype.js](https://github.com/opentypejs/opentype.js) | 1.3.4 | MIT |
| `clipper.min.js` | [clipper-lib](https://www.npmjs.com/package/clipper-lib) (Clipper, Angus Johnson) | 6.4.2 | Boost Software License 1.0 |
| `qrcode.min.js` | [qrcode-generator](https://github.com/kazuhikoarase/qrcode-generator) (Kazuhiko Arase) | 1.4.4 | MIT |
| `jsQR.js` | [jsQR](https://github.com/cozmo/jsQR) | 1.4.0 | Apache License 2.0 |

## Písma (`src/fonts/`)

Písma jsou zmenšená jen na znaky potřebné pro češtinu a slovenštinu (soubory `*.sub.ttf`)
a vkládají se do nástrojů, aby šlo z textu vytvořit 3D model.

| Písma | Licence |
|---|---|
| Poppins | SIL Open Font License 1.1 |
| Anton, Bebas Neue, Bungee, Baloo 2, Caveat, Pacifico, Dancing Script, Courgette, Kalam, Patrick Hand, Amatic SC, Indie Flower, Comic Neue, Lobster, Righteous, Playfair Display, Saira Stencil One, Big Shoulders Stencil (Google Fonts) | SIL Open Font License 1.1 |
| Liberation Sans, Liberation Mono | SIL Open Font License 1.1 |
| DejaVu Serif | Bitstream Vera / DejaVu Fonts License (volná licence) |

Plné znění licence SIL OFL 1.1: https://openfontlicense.org

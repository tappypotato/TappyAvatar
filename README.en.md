# TappyAvatar (English)

[![npm version](https://img.shields.io/npm/v/tappy-avatar)](https://www.npmjs.com/package/tappy-avatar) [![npm downloads](https://img.shields.io/npm/dm/tappy-avatar)](https://www.npmjs.com/package/tappy-avatar)

> [English](README.en.md) · [中文](README.md)

> Same string, same avatar — forever.

TappyAvatar is a **deterministic avatar generator**: any username, email or ID
is turned into a unique SVG avatar entirely in the browser. No database, no
stored images, no backend — a single zero-dependency file, ideal as a default
avatar solution for websites and apps.

```
"alain"  →  always the same avatar
"tove"   →  always a different avatar
one name, another style  →  same seed, 8 different looks
```

## Highlights

- **Deterministic**: same name + same style → byte-identical output, every time.
- **Zero deps, zero requests**: one file `tappy-avatar.js`, global variable
  ready to use; no npm deps, no network, no backend.
- **Tiny**: ~6.8 KB gzipped (with comments); each avatar SVG is only 0.3–0.5 KB.
- **8 styles**: snowflake / plant / pixel / line / geo / robot / emoji /
  silhouette, each with internal random variants — one name can yield a huge
  variety of looks.
- **Style by choice or by name**: `style: "auto"` lets the name pick the style;
  you can also fix any style explicitly.
- **Background options**: none (transparent), circle, square, squircle; plus a
  dark mode for dark UIs.
- **Any size**: `size` controls the output `width`/`height`; geometry never
  scales or distorts.
- **Framework-agnostic**: output is a plain SVG string — works with
  React / Vue / mini-programs / SSR, or as a `data:` URI for `<img src>`.
- **Reproducible**: no reliance on time, randomness or network; server and
  client render byte-identical results.

> **Try it live**: [Demo playground](https://tappypotato.github.io/TappyAvatar/demo.en.html) ·
> [Automated test page](https://tappypotato.github.io/TappyAvatar/test.en.html)
> (enable Pages on the `main` branch in repo Settings first)

## Quick start

### Install

```bash
npm install tappy-avatar
```

```js
const tappyAvatar = require("tappy-avatar");
```

### Standalone (single file)

Only one file is needed:

```
tappy-avatar.js   ← the only required file (~25 KB raw, ~6.8 KB gzipped)
```

### Browser

```html
<script src="./tappy-avatar.js"></script>
<script>
  document.body.innerHTML = tappyAvatar(user.id, { style: "pixel", size: 48 });
</script>
```

### Node / CommonJS

```js
const tappyAvatar = require("./tappy-avatar.js");
el.style.backgroundImage = `url("${tappyAvatar.uri(user.id, { style: "robot" })}")`;
```

## Usage

```js
tappyAvatar("alain")                                      // default style, no background
tappyAvatar("alain", { style: "robot" })                  // fixed style
tappyAvatar("alain", { style: "auto" })                   // name decides the style
tappyAvatar("alain", { background: "circle" })            // circle plate
tappyAvatar("alain", { background: "square", dark: true })// square plate, dark mode
tappyAvatar("alain", { size: 48 })                        // 48×48 px output
tappyAvatar("alain", { hue: 210 })                        // lock the hue
tappyAvatar.uri("alain")                                  // data: URI for <img> / CSS
tappyAvatar("alain", { style: "plant", overrides: { "pl.type": 0.5 } }) // lock a trait
// => '<svg xmlns="..." viewBox="0 0 100 100">…</svg>'
```

## Options

| Option | Type | Default | Description |
|---|---|---|---|
| `style` | style key or `"auto"` | `"snowflake"` | Visual style; unknown values fall back to default |
| `size` | number | CSS decides | Output `width`/`height` (px) |
| `hue` | number | name decides | Lock hue 0–360°, name controls shape only |
| `background` | `"circle"`/`"square"`/`"squircle"` | none (transparent) | Plate shape |
| `dark` | boolean | `false` | Dark mode (deeper plate & strokes) |
| `pixel` | number | name decides | (pixel style) lock grid 9/11 |
| `overrides` | object | — | Lock any trait to a 0–1 value, e.g. `{ "pl.type": 0.5 }` |
| `title` | string | — | Accessible `<title>` |

## Styles

| style | description | keywords |
|---|---|---|
| `snowflake` | six-fold crystal: arm length / branches / center / sparkles | ice, symmetric, fresh |
| `plant` | potted plant: cactus (arms/flower/face) / leaf / sprout | cute, healing, nature |
| `pixel` | symmetric pixel face: 9/11 grid, hair/eyes/mouth per name | retro, game, pixel |
| `line` | minimal line face: outline + hair strands + dots + mood | hand-drawn, minimal |
| `geo` | low-poly face: facets + top hair block | low-poly, angular, abstract |
| `robot` | robot: rounded-square head + antenna + LED eyes + grill | tech, mechanical, futuristic |
| `emoji` | round face: 5 seeded expressions + blush | expressive, round |
| `silhouette` | negative-space head & shoulders, features cut out | silhouette, deep, clean |

## Architecture

**Deterministic core (shared by all styles)**: one 32-bit seed hash from the
normalized name (`NFC + trim + lowercase`), then every trait key is mixed with
the seed through a non-linear multiply-shift mixer to derive independent
[0,1) values — no chaining, adding styles never disturbs existing avatars.
`"alain"` and `"alaim"` look completely unrelated.

**Style layer (independent)**: each style is a `drawXxx(rng, opts, ramp)`
function reading only the shared random source, palette and geometry helpers.
Adding a style = one function + one entry in `STYLES`.

## Size & performance

- ~6.8 KB gzipped (with comments), all 8 styles included.
- ~0.3–0.5 KB gzipped per avatar.
- ~5 µs per avatar (MacBook Air M4, Node/V8, mixed 8 styles).
- v1.0.0 perf work: trait-key hash cache + hoisted hex conversion,
  output byte-identical to the previous release.

## Determinism guarantees

- Same name + same style → byte-identical SVG (within a version).
- Same name + different style → 8 distinct looks from one seed.
- Different names + same style → all unique across 8 styles × 1000 names.
- 2000/2000 unique under `auto` style.
- Independent of time, randomness and network; `size` never changes geometry.

## Verification

- Node unit tests: determinism, 1000-name uniqueness, option matrix,
  SVG structure, special characters.
- Headless browser screenshots: 8 styles × 8 names, dark mode, pixel grid.
- `demo.html`: live style switching, pixel grid param, 16-name auto wall,
  real-time byte/gzip stats.
- `test.html`: 13 in-browser assertions + 8×8 visual matrix + option
  comparisons + measured performance.

## License

MIT.

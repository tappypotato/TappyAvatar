# TappyAvatar

[![中文](https://img.shields.io/badge/lang-中文-red.svg)](./README.md)
[![English](https://img.shields.io/badge/lang-English-blue.svg)](./README.en.md)
[![v1.8.0](https://img.shields.io/badge/version-1.8.0-0171E3.svg)](./tappy-avatar.js)
[![gzip](https://img.shields.io/badge/gzip-6%20KB-4CAF50.svg)](./tappy-avatar.js)

> Single-file zero-dependency deterministic avatar generator · v1.8.0

**The same string always renders the same avatar. No database. No backend.**

<div align="center">

[🔧 **Live Demo**](https://tappypotato.github.io/TappyAvatar/demo.html) ·
[🧪 **Automated Test**](https://tappypotato.github.io/TappyAvatar/test.html) ·
[📖 **Full Documentation**](./docs/README.md)

</div>

```html
<script src="./tappy-avatar.js"></script>
<script>
  document.body.innerHTML = tappyAvatar("alain", { style: "portal", background: "circle" })
</script>
```

## 12 Curated Styles

| | | | |
|---|---|---|---|
| `pixel` · pixel face | `robot` · rounded bot | `emoji` · expression | `wireframe` · hex outline |
| `neonwaves` · neon sine | `petal` · radial petals | `waveform` · fluid waves | `prism` · rainbow halo |
| `honeycomb` · hex grid | `explosion` · burst | `starfield` · spiral nebula | `portal` · ring vortex |

## Features

- **Zero dependencies, zero requests**: pure JS + SVG, drop-in global
- **Deterministic**: same seed + style → byte-identical SVG
- **Reproducible**: server-side Node and client-side browser render identically
- **Arbitrary size**: `size` controls pixel dimensions; geometry is always 100×100
- **12 styles × 300 names = zero collisions**

## Quick Install

```bash
# Direct download
curl -O https://raw.githubusercontent.com/tappypotato/TappyAvatar/main/tappy-avatar.js

# Or clone the whole repo
git clone https://github.com/tappypotato/TappyAvatar.git
```

| File | Purpose |
|---|---|
| `tappy-avatar.js` | **Core library** (31.8 KB, gzip ~6 KB) |
| `demo.html` | Interactive playground (style picker + param panel) |
| `test.html` | Automated test page (12 styles × 8 names matrix + perf) |
| `docs/README.md` | **Full documentation** (API · architecture · style table · changelog) |

## Full Documentation

[📖 docs/README.md](./docs/README.md) — API reference, architecture design,
detailed descriptions of all 12 styles, version history and decision log.

MIT License.

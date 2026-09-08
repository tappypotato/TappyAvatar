# TappyAvatar

> 同一个字符串，永远渲染同一个头像。

TappyAvatar 是一个**确定性的头像生成器**：把任意用户名、邮箱、ID 等字符串，
在浏览器本地直接算出一个专属 SVG 头像。不需要数据库、不需要存储图片、
不需要任何后端接口——纯前端、单文件、零依赖，是网站 / APP 做用户默认头像
的理想方案。

```
用户名 "alain"  →  永远同一个头像
用户名 "tove"   →  永远另一个头像
同一名字换风格  →  同一颗种子，8 种不同观感
```

## 特色

- **确定性**：同名字同风格，输出字节级一致，每次打开永远相同。
- **零依赖零请求**：单文件 `tappy-avatar.js`，浏览器全局变量直接可用，
  无 npm 依赖、无网络请求、无后端。
- **体积小**：gzip（含注释）约 6.8 KB；单颗头像 SVG 仅 0.3–0.5 KB。
- **8 种风格**：雪花 / 植物 / 像素 / 线条 / 低多边形 / 机器人 / 表情 / 剪影，
  每个风格内部还有随机变体，同一个名字能生成海量不同观感。
- **风格可指定、可自动**：`style: "auto"` 让名字自己决定风格，
  你也可以固定任意一种风格。
- **背景可选**：无（透明）、圆形、方形、圆角方四种底衬，直接可用；
  另有暗色模式适配深色 UI。
- **任意尺寸**：输出 `size` 属性控制像素大小，几何永远不缩放变形。
- **框架无关**：输出是纯 SVG 字符串，React / Vue / 小程序 / SSR 通吃，
  也可转成 `data:` URI 直接塞进 `<img src>`。
- **可复现可测试**：不依赖时间、随机数、网络，服务端与客户端渲染逐字节一致。

> **在线体验**：[Demo 调试器](https://tappypotato.github.io/TappyAvatar/demo.html) ·
> [自动化测试页](https://tappypotato.github.io/TappyAvatar/test.html)
> （首次使用请在仓库 Settings → Pages 启用 main 分支，链接即可访问）

## 快速开始

仓库里只需要引入这一个文件：

```
tappy-avatar.js   ← 唯一需要的文件（约 25 KB，gzip 约 6.8 KB）
```

### 浏览器引入

```html
<script src="./tappy-avatar.js"></script>
<script>
  // 全局变量 tappyAvatar 直接可用
  document.body.innerHTML = tappyAvatar(user.id, { style: "pixel", size: 48 });
</script>
```

### Node / CommonJS 引入

```js
const tappyAvatar = require("./tappy-avatar.js");
// 转成 data URI，塞进 <img> 或 CSS background
el.style.backgroundImage = `url("${tappyAvatar.uri(user.id, { style: "robot" })}")`;
```

## 调用方式

### 1. 基础调用

```js
tappyAvatar("alain")                     // 默认风格（snowflake），无背景
tappyAvatar("alain@example.com")         // 任意字符串都行，邮箱、ID、中文名均可
// => '<svg xmlns="..." viewBox="0 0 100 100">…</svg>'
```

### 2. 指定风格（分类）

```js
tappyAvatar("alain", { style: "robot" })    // 固定用机器人风格
tappyAvatar("alain", { style: "emoji" })    // 固定用表情风格
```

8 种风格见下方风格表。`style` 缺省为 `snowflake`；未知风格名自动回退
`snowflake`。

### 3. 随机风格（由名字决定）

```js
tappyAvatar("alain", { style: "auto" })   // 同一名字永远选同一种风格
```

`"auto"` 不是真随机：风格由名字哈希决定，所以同一个用户每次看到的
都是同一个风格，但不同用户会分到不同风格，观感丰富又不乱跳。

### 4. 背景（有无底色）

```js
tappyAvatar("alain")                                        // 无（透明背景）
tappyAvatar("alain", { background: "circle" })              // 圆形
tappyAvatar("alain", { background: "square" })              // 方形
tappyAvatar("alain", { background: "squircle" })            // 圆角方
tappyAvatar("alain", { background: "circle", dark: true })  // 圆形 + 暗色模式
```

### 5. 尺寸

```js
tappyAvatar("alain", { size: 48 })   // 输出 width="48" height="48"
```

不传 `size` 时 SVG 不带宽高属性，尺寸完全由 CSS 决定。

### 6. 色相锁定

```js
tappyAvatar("alain", { hue: 210 })   // 锁住颜色，名字只决定形状
```

缺省时色相由名字决定（`0–360°`）。

### 7. 转成图片 / 背景

```js
tappyAvatar.uri("alain", { style: "robot", background: "circle" })
// => "data:image/svg+xml;utf8,%3Csvg…"

<img src={tappyAvatar.uri(user.id)} />                          // React
document.querySelector("img").src = tappyAvatar.uri(user.id);    // 原生
el.style.backgroundImage = `url("${tappyAvatar.uri(user.id)}")`; // CSS
```

### 8. 高级：锁定细节（overrides）

固定任一内部参数在 0–1 位置，名字仍决定其余一切：

```js
tappyAvatar("alain", { style: "plant", overrides: { "pl.type": 0.5 } })
```

## 选项一览

| 选项 | 类型 | 默认 | 说明 |
|---|---|---|---|
| `style` | 风格 key 或 `"auto"` | `"snowflake"` | 视觉风格，未知值回退默认 |
| `size` | number | 由 CSS 决定 | 输出 `width`/`height` 属性（px） |
| `hue` | number | 由名字决定 | 锁定色相 0–360°，名字只决定形状 |
| `background` | `"circle"`/`"square"`/`"squircle"` | 无（透明） | 底衬形状 |
| `dark` | boolean | `false` | 暗色模式（更深的底色与描边） |
| `pixel` | number | 由名字决定 | （pixel 风格）锁定网格 9/11 |
| `overrides` | object | — | 固定任一 trait 的 0–1 位置，如 `{ "pl.type": 0.5 }` |
| `title` | string | — | 无障碍 `<title>` |

## 8 种风格

| style | 说明 | 视觉关键词 |
|---|---|---|
| `snowflake` | 六角雪花：臂长 / 分支数 / 中心大小 / 星点随名字 | 冰晶、对称、清新 |
| `plant` | 盆栽植物：仙人掌（手臂/花/笑脸）/ 大叶 / 嫩芽三种变体 | 可爱、治愈、自然 |
| `pixel` | 对称像素人脸：9/11 网格，发型 / 眼行 / 嘴宽随名字 | 复古、游戏、像素 |
| `line` | 极简线条脸：轮廓 + 发丝 + 点眼 + 表情 | 手绘、极简、线条 |
| `geo` | 低多边形脸：碎块拼接 + 顶部发块 | 低多边形、棱角、抽象 |
| `robot` | 机器人：圆角方头 + 天线 + LED 眼 + 格栅嘴 | 科技、机械、未来 |
| `emoji` | 圆脸表情：5 种种子化表情 + 腮红 | 表情、情绪、圆润 |
| `silhouette` | 负空间剪影：头 + 发 + 肩，五官镂空 | 剪影、深邃、简洁 |

每个风格内部还有大量随机变体：植物有 3 种形态 × 手臂/花/笑脸有无，
雪花有臂长/分支/星点组合，机器人有天线/眼型/格栅组合……同一风格下
不同名字仍能保证观感互不相同（1000 名字零碰撞）。

## 架构

**确定性核心（所有风格共享）**：

1. **一次哈希，无限 trait** — `normalize`（NFC+trim+小写）→ `hashString`
   单遍加法-旋转混合 + 乘法-移位 mix-down 得到 32-bit 种子；每个参数
   key 独立与种子异或后再过一遍非线性乘法-移位混合，派生出相互独立的
   [0,1) 浮点。无续流、无链式状态，加新风格/新参数不会扰动已有头像；
   `"alain"` 与 `"alaim"` 视觉完全无关。
2. **随机源** — `range/int/choose/yes/nudge` 一行一个派生，
   override 走同一单位同一路径，锁定任何参数都不破坏几何不变量。
3. **纯函数 → SVG 字符串** — 无状态、无 DOM 依赖，可任意 memoize，
   服务端与客户端渲染结果逐字节一致。

**风格层（各写各的，互不依赖）**：每个风格是一个 `drawXxx(rng, opts, ramp)`
函数，只读公共随机源、调色板与几何助手（squircle、多边形、圆）。新增一种
风格 = 新增一个函数 + 注册进 `STYLES` 数组，既有风格的种子映射完全不动。

## 为什么小

- 库体积（gzip，含全部注释）：**约 6.8 KB**，8 种风格打包。
- 单颗头像 gzip 约 **0.3–0.5 KB**。
- 生成耗时约 **5 µs/次**（MacBook Air M4，Node / V8 实测，混合 8 风格）。
- 性能优化 v1.0.0：trait key 哈希缓存 + 十六进制转换提级，输出与旧版字节级一致。

## 确定性保证

- 同名字 + 同风格 → 字节级相同的 SVG（同版本内）。
- 同名字 + 不同风格 → 8 种完全不同的观感，同源不同表达。
- 不同名字 + 同风格 → 8 风格 × 1000 名字全部唯一（测试语料）。
- `auto` 风格下 2000 个名字 2000/2000 唯一。
- 不依赖时间、随机数、网络。`size` 不影响几何，只影响输出属性。

## 验证

- Node 单测：8 风格确定性、1000 名字唯一性、选项组合无崩溃、
  SVG 结构、特殊字符处理。
- 浏览器 headless 截图：8 风格 × 8 名字、暗色模式、pixel 网格检查。
- `demo.html`：8 风格即时切换、pixel 网格参数、16 名字自动风格墙、
  SVG 字节与 gzip 实时统计。
- `test.html`：浏览器内 13 项断言 + 8×8 视觉矩阵 + 参数对照 + 性能实测。

## 许可

MIT。

---

# TappyAvatar (English)

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

> **Try it live**: [Demo playground](https://tappypotato.github.io/TappyAvatar/demo.html) ·
> [Automated test page](https://tappypotato.github.io/TappyAvatar/test.html)
> (enable Pages on the `main` branch in repo Settings first)

## Quick start

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

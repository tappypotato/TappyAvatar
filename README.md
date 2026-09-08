# TappyAvatar

> [English](README.en.md) · [中文](README.md)

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

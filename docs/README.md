# TappyAvatar — 项目文档（整合版）

> 单文件零依赖的确定性头像生成器 · v1.8.0 · 12 种精选风格
> 
> 项目根目录：`/` · 源码：`tappy-avatar.js` · Demo：`demo.html` · 测试：`test.html`

---

## 一、项目概览（需求 + 定位）

### 1.1 目标

把任意字符串（用户名、邮箱、ID）在浏览器本地**确定性地**算出一个专属
SVG 头像。同名字 → 永远同头像，不同名字 → 永远不同头像，同名换风格 →
同源不同表达。**无后端、无数据库、无图片存储**——全部在客户端用哈希 +
纯函数生成。

### 1.2 解决什么问题

| 痛点 | 解决方案 |
|---|---|
| 新用户注册没头像 | 用 `user.id` 直接生成，不需要用户上传 |
| 不同设备 / 不同节点渲染不一致 | 确定性哈希，同 seed → 同输出 |
| 默认头像千篇一律 | 12 种风格 + 内部随机变体，1000+ 名字零碰撞 |
| 需要头像存 CDN | 不需要。SVG 字符串可转 data URI 直接 `<img src>` |
| 依赖重 / 请求慢 | gzip ~6 KB，零外部请求 |

### 1.3 约束

- **纯函数、无副作用**：输入 seed + 选项 → 输出 SVG 字符串
- **零依赖**：无 npm、无网络、无 DOM（Node 也能跑）
- **可预测**：不依赖 `Date.random()` / `Math.random()` / 时间 / 网络
- **可测试**：任何名字任何风格的输出可被快照锁定

---

## 二、项目结构

```
gem-avatar/
├── tappy-avatar.js   # 唯一核心库文件 (31 KB, gzip ~6 KB)
├── demo.html         # 交互式调试器：风格切换 + 参数面板 + 实时统计
├── test.html         # 自动化测试页：12 风格 × 8 名字矩阵 + 性能测试
├── README.md         # 根入口（本文件的短引用）
└── docs/
    └── README.md     # 本整合文档
```

**没有**：数据库文件、npm 包目录、构建脚本、TypeScript、CSS 文件、
图片资源——**整个项目核心就是 3 个 HTML/JS 文件**。

---

## 三、架构与设计决策

### 3.1 整体设计

```
  输入 seed + 选项
       │
       ▼
  normalize()         — NFC 规范化 + trim + 小写
       │
       ▼
  hashString(seed)    — 32-bit FNV-1a 变体种子
       │
       ▼
  makeRng(seed, overrides)
    ├── rng.range / int / choose / yes / nudge
    └── 每个 trait key 独立 → 0..1 浮点
       │
       ▼
  colorRamp(hue, dark) → { main, deep, light, pale, ink }
       │
       ▼
  draw[Style](rng, opts, ramp)  ← 12 个风格函数之一
       │
       ▼
  SVG 字符串（纯 DOM-less 拼接）
```

### 3.2 确定性核心

**哈希算法**：自定义 FNV-1a 变体（单遍加法-旋转混合 + 乘法-移位 mix-down），
对同一 seed 生成 32-bit 整数。每个 trait key 与 base seed 异或后再过一遍
非线性变换，**互不扰动**——加新风格不会改变已有头像。

**随机源**：`range(a,b)` / `int(a,b)` / `choose(arr)` / `yes(p)` /
`nudge(amt)`，全部从 key → [0,1) 派生。`overrides` 参数允许锁定任一
trait 在 0-1 位置而不破坏其余几何。

### 3.3 调色板

`colorRamp(hue, dark)` 从 5 个预计算色位派生：

| key | 用途 |
|---|---|
| `main` | 主色（风格主体） |
| `deep` | 深色（描边、第二主体） |
| `light` | 亮色（高光、白色替代） |
| `pale` | 极浅 / 极深（背景底衬） |
| `ink` | 中性色（线条、文字、暗描边） |

hue + 微扰动（±3°）+ 饱和度/亮度各自微扰，让同一风格下不同名字
颜色有明显差异但又和谐。

### 3.4 风格注册与分发

```js
var STYLES = ["pixel", "robot", ..., "portal"];  // 12 个

function tappyAvatar(seed, opts) {
  var body =
    style === "pixel"  ? drawPixelFace(...) :
    style === "robot"  ? drawRobot(...)    :
    ...
    drawPortal(...);   // 兜底
}
```

三元链分发，每个风格一个 `draw[Style](rng, opts, ramp, hue)` 纯函数。
新增风格 = 加函数 + 注册进 STYLES + 链上加一行。

### 3.5 公共辅助函数

| 函数 | 位置 | 用途 |
|---|---|---|
| `hslToHex(h,s,l)` | 工具层 | HSL → `#rrggbb` |
| `hexByte(n,m)` | hslToHex 内部 | 单字节十六进制转换 |
| `r2(value)` | 工具层 | 保留 2 位小数（SVG 几何精度） |
| `circle(cx,cy,r,fill,op)` | 工具层 | 拼 `<circle>` 字符串 |
| `roundShape(cx,cy,rx,ry,n)` | 工具层 | squircle/超椭圆路径（n=2 圆, n=6 squircle） |

### 3.6 为什么小

- **无依赖**：自己实现 HSL→HEX、自己算 SVG，不用任何库
- **无 CSS / 图片**：全是 SVG path/shape，无外部资源
- **12 风格函数**：每个函数 30–70 行，拼字符串，无复杂对象
- **压缩友好**：重复工具函数（r2, circle, hslToHex）会被 gzip 自动去重

实测：

```
原始 JS     31.8 KB
gzip        ~6 KB
单颗 SVG     0.3–1.2 KB
```

### 3.7 为什么稳定（不破坏已有头像）

- **key 哈希缓存**：`hashKey(key)` 缓存 trait key → hash 映射
- **trait 独立**：每个参数 key 独立派生，加新风格/新 key 不影响旧 key 的值
- **几何不变量**：`size` 选项只控制 SVG width/height，几何永远 100×100
- **版本号**：`tappyAvatar.version` 语义化，升级时保持向后兼容

---

## 四、API 文档

### 4.1 主函数

```js
tappyAvatar(seed, options?) → string  // SVG 字符串
```

### 4.2 选项

| 选项 | 类型 | 默认 | 说明 |
|---|---|---|---|
| `style` | string / `"auto"` | `"pixel"` | 风格名，未知值回退 `"pixel"` |
| `size` | number | （无） | 输出 `width` / `height` 属性（px）。不传则 CSS 控制 |
| `hue` | number | 由 seed 决定 | 锁定色相 0–360°，seed 只决定形状 |
| `background` | `"circle"`/`"square"`/`"squircle"` | （无） | 底衬形状 |
| `dark` | boolean | `false` | 暗色模式（调整 `pale` / `ink` 色相） |
| `title` | string | （无） | 无障碍 `<title>` 元素 |
| `overrides` | object | — | 锁定任一 trait 在 0–1 位置 |

**pixel 风格额外选项**：

| 选项 | 类型 | 默认 | 说明 |
|---|---|---|---|
| `pixel` | number | 由 seed 决定 | 锁定网格大小：`9` 或 `11` |

### 4.3 导出函数

```js
tappyAvatar.uri(seed, opts?)      // → "data:image/svg+xml;utf8,..."
tappyAvatar.STYLES                 // → ["pixel","robot",...] （运行时枚举）
tappyAvatar.version                // → "1.8.0"
tappyAvatar._hue(seed)             // → number 0–360° （调试用）
tappyAvatar._hex(seed)             // → 8 位十六进制 （调试用）
```

### 4.4 调用示例

```html
<script src="./tappy-avatar.js"></script>
<script>
  // 基础
  tappyAvatar("alain")

  // 固定风格 + 圆形底 + 48px
  tappyAvatar("alain", { style: "portal", background: "circle", size: 48 })

  // 随机风格（由名字决定）
  tappyAvatar("alain", { style: "auto", background: "squircle" })

  // 暗色模式 + 固定色相
  tappyAvatar("alain", { style: "neonwaves", dark: true, hue: 210 })

  // 转 data URI 直接塞 img
  const src = tappyAvatar.uri(user.id, { style: "honeycomb", background: "circle" })
  document.querySelector("img").src = src
</script>
```

### 4.5 Node.js

```js
const tappyAvatar = require("./tappy-avatar.js")

// 12 风格全量生成
for (const style of tappyAvatar.STYLES) {
  const svg = tappyAvatar("alain", { style, size: 64 })
  // 存数据库 / CDN / 直接返回
}
```

---

## 五、12 种精选风格表

### 5.1 按分类

| # | style | 分类 | 视觉关键词 |
|---|---|---|---|
| 1 | `pixel` | 科技主流 | 9/11 网格对称像素脸，发型/眼行/嘴宽随名字 |
| 2 | `robot` | 科技主流 | 圆角方头 + 天线 + LED 矩形眼 + 格栅嘴 |
| 3 | `emoji` | 科技主流 | 5 种种子化表情 + 腮红 |
| 4 | `wireframe` | 未来科技 | 六边形线框 + 小眼睛 + 强调括号 |
| 5 | `neonwaves` | 未来科技 | 网格底 + 2-3 条彩色正弦波 |
| 6 | `petal` | 唯美 | 6/8/10 片对称环形花瓣 + 4 色 palette + 中心圆盘 |
| 7 | `waveform` | 唯美 | 3-5 层流体正弦波 + 部分填色 + 描线 |
| 8 | `prism` | 唯美 | 5-6 层彩虹 radial 光晕 + 中心亮 orb |
| 9 | `honeycomb` | 酷炫 | 六边形蜂窝（37 格）+ 4 色填色 + 线框 |
| 10 | `explosion` | 酷炫 | 亮芯 + 10-18 射线 + 20-35 放射粒子 |
| 11 | `starfield` | 酷炫 | 暗底星空 + 2-3 条螺旋臂 + 中心黑洞 |
| 12 | `portal` | 酷炫 | 6-8 层同心圆环 + 2 条旋转螺旋扫 + 中心黑洞 + 轨道节点 |

### 5.2 关键风格参数（各风格内部的 seeded variant）

| style | 可变参数 | 可能值 |
|---|---|---|
| `pixel` | grid, hair(4), eye_row, mouth_w, blush | 9×9 / 11×11 · 4 种发型 · 嘴开闭 · 有无腮红 |
| `robot` | head_rx/ry, body_choice, eye_gap/ew/eh, mouth_bars(2-3), ear_r | 方头圆角度 · 深色/浅色身体 · 矩形眼大小间距 |
| `emoji` | expression(5), blush_col/on | 5 种表情（笑/闭眼/圆嘴/直线/歪脸）+ 腮红可选 |
| `wireframe` | hex_r(26-30), hex_tilt, eye_gap, eye_r, mouth_type(3), bracket_on | 六边形大小/倾斜 · 眼睛间距 · 3 种嘴型 · 有无括号 |
| `neonwaves` | wave_count(2-3), amp, freq, y_offset, dot_on | 2-3 条正弦波 · 振幅/频率偏移 · 有无霓虹点缀 |
| `petal` | count(6/8/10), palette(4), petal_len/w, center_r | 6/8/10 片花瓣 · 4 色循环 · 花瓣长宽比 |
| `waveform` | layer_count(3-5), fill_vs_stroke, crest_wobble | 3-5 层 · 部分层填色/部分描线 |
| `prism` | halo_count(5-6), halo_fx/fy/offset/opacity, highlight | 5-6 层 radial halo · 位置/透明度独立微扰 |
| `honeycomb` | cell_r(7-9), hex_fill_palette(4), cell_opacity, filled_ratio(68%) | 37 个六边形格子 · 4 色填色 · 约 68% 概率填充 |
| `explosion` | ray_count(10-18), particle_count(20-35), ray_tickness/opacity, big_particle_count(3-6) | 10-18 射线 · 20-35 放射粒子 · 3-6 个大粒子 |
| `starfield` | background_star_count(40-60), arms(2-3), arm_steps(28), arm_spiral_tightness(2.2π) | 暗底 40-60 星 · 2-3 条对数螺旋臂 |
| `portal` | ring_count(6-8), spiral_arm_count(2), orbit_dot_count(4), core_with_on | 6-8 层同心圆环 · 2 条旋转螺旋 · 4 颗轨道节点 |

---

## 六、性能数据（实测 v1.8.0）

| 指标 | 数据 |
|---|---|
| 原始 JS 大小 | ~31.8 KB |
| gzip 后大小 | ~6 KB |
| 单次生成耗时 | ~2–5 µs（MacBook Air M4, Node 20） |
| 单颗头像 SVG（原始） | 300–1200 B |
| 300 名字 × 12 风格碰撞 | **0**（100% 唯一） |
| 12 风格 × 7 变体组合 | 全部通过（无崩溃、SVG 合法） |

---

## 七、版本历史与决策记录

### v1.8.0 — 12 种精选（当前）

**删除 5 种**：`aurora` · `galaxy` · `flame` · `meteor` · `bubble`
**新增 1 种**：`portal`（来自之前要删的 bubble 系列保留的）

最终 12 种：`pixel · robot · emoji · wireframe · neonwaves · petal · waveform · prism · honeycomb · explosion · starfield · portal`

**决策背景**：经过多轮试错，用户最终确定 12 种风格组合。
之前多版本尝试（从 16 → 11 → 19 → 17 → 13 → 17 → 12）中被删除的风格
包括：snowflake / plant / line / geo / silhouette / beam / marble /
sunset / ring（原始 9 种）、jdenticon / bottts / techglyph / wireframe /
gradientblob / glitch / qrcode / dotgrid / circuit / laser / aurora /
galaxy / flame / meteor / bubble / duotone / void / neonheart 等。

**关键决策**：

| 决策 | 原因 |
|---|---|
| 全部单文件，无构建 | gzip 6 KB，构建只会增加复杂度 |
| 不用 npm 发布目录 | 发 npm 会分叉代码，直接根目录放主文件 |
| 用三元链而不是 switch/map | 每个风格 branch 一眼看到 draw 函数名，编译器会优化 |
| 不依赖任何外部库 | HSL→HEX、SVG 拼接、哈希全自研 |
| 支持 `style: "auto"` | 名字自己选风格，用户不关心风格，观感又不单调 |
| 暗色模式作为独立选项 | 深色/浅色 UI 同 seed 下自动适配 |

### v1.7.0 / v1.6.0 / v1.5.0 / v1.4.0 / v1.3.0 / v1.2.0 / v1.1.0 / v1.0.0

中间迭代版本，风格数量从 16 试到 19 再到 17 再到 12，最终稳定。
功能层没有破坏性变更，每次都是纯加法或纯删除。

---

## 八、测试与验证

### 8.1 自动化断言（test.html + Node）

- **确定性**：同名字同风格 → 字节级相同 SVG（同版本内）
- **唯一性**：300 名字 × 12 风格 = 3600 个头像零碰撞
- **变体覆盖**：每个风格跑 7 种变体（size / background / dark / hue / title）
- **SVG 合法性**：全部输出以 `<svg` 开头、合法 XML 结构

### 8.2 视觉验证

- `test.html`：12 风格 × 8 名字矩阵，一眼扫全部
- `demo.html`：交互式调试器，所有参数实时预览
- 暗色模式面板：`cmpDark` 行每行亮/暗对照
- 背景对比：`cmpBg` 行每种风格无/圆/方/圆角方底衬对照

### 8.3 性能

- `demo.html` 里 **1000 次** 实时测耗时，单头像 gzip 实时算
- 生成耗时在 V8 稳定在 **2–5 µs/次**

---

## 九、许可

MIT License。

---

## 十、快速开始（从这 4 行开始）

```html
<script src="./tappy-avatar.js"></script>
<script>
  // 给任意名字生成头像：默认风格
  document.body.innerHTML = tappyAvatar("alain")

  // 指定风格 + 圆形底 + 48px + 暗色模式
  document.body.innerHTML = tappyAvatar("alain", {
    style: "portal", background: "circle", size: 48, dark: true
  })

  // 转 data URI 塞进 <img>
  const img = document.createElement("img")
  img.src = tappyAvatar.uri("user-123", { style: "honeycomb", background: "circle" })
  document.body.appendChild(img)
</script>
```

打开 `demo.html` 即时体验。
# gem-avatar

同一字符串永远渲染同一个头像。单文件、零依赖、纯浏览器本地运算。
**8 种人物头像风格共享同一个确定性核心**：把任意用户名 / 邮箱 / id
确定性地变成 SVG 头像。同名字在同风格下字节级一致；同名字在不同风格下
得到 8 个不同观感，全部来自同一颗种子。

```
gemAvatar("alain@example.com")                       // 默认 face 风格
gemAvatar("alain@example.com", { style: "robot" })   // 指定风格
gemAvatar("alain@example.com", { style: "auto" })    // 由名字决定风格
// => '<svg xmlns="..." viewBox="0 0 100 100">…</svg>'
```

## 8 种人物风格

都是拟人化头像，有脸、有五官、有人物感：

| style | 说明 | 视觉关键词 |
|---|---|---|
| `face` | 卡通大头：种子化脸型 / 发型（4 种）/ 眼距 / 嘴型 / 腮红 | 卡通、亲切、多样化 |
| `persona` | 扁平半身像：头 + 脖子 + 双色衣服 + 肩膀 | 商务、扁平、头像感 |
| `pixel` | 对称像素人脸：9/11 网格，发型 / 眼行 / 嘴宽随名字 | 复古、游戏、像素 |
| `line` | 极简线条脸：轮廓 + 发丝 + 点眼 + 表情 | 手绘、极简、线条 |
| `geo` | 低多边形脸：碎块拼接 + 顶部发块 | 低多边形、棱角、抽象 |
| `robot` | 机器人：圆角方头 + 天线 + LED 眼 + 格栅嘴 | 科技、机械、未来 |
| `emoji` | 圆脸表情：5 种种子化表情 + 腮红 | 表情、情绪、圆润 |
| `silhouette` | 负空间剪影：头 + 发 + 肩，五官镂空 | 剪影、深邃、简洁 |

`style: "auto"` 时名字自己决定风格（同一名字永远选同一种）。

## 用法

浏览器（全局 `gemAvatar`）：

```html
<script src="./gem-avatar.js"></script>
<script>
  document.body.innerHTML = gemAvatar(user.id, { style: "pixel", size: 48 });
</script>
```

Node / CommonJS：

```js
const gemAvatar = require("./gem-avatar.js");
el.style.backgroundImage = `url("${gemAvatar.uri(user.id, { style: "robot" })}")`;
```

`gemAvatar.uri(name, opts)` 返回 `data:image/svg+xml` URI，可直接给
`<img src>` 或 `background-image`。输出是纯 SVG 字符串，天然适配
React / Vue / 小程序 / 服务端渲染，无需框架适配层。

## 选项

| 选项 | 类型 | 默认 | 说明 |
|---|---|---|---|
| `style` | 见上方风格表，或 `auto` | `face` | 视觉风格 |
| `size` | number | 由 CSS 决定 | 输出 `width`/`height` 属性（px） |
| `hue` | number | 由名字决定 | 锁定色相 0–360°，名字只决定形状 |
| `pixel` | number | 由名字决定 | （pixel）锁定网格 9/11 |
| `overrides` | object | — | 固定任一 trait 的 0–1 位置，如 `{ "fc.hair": 0.5 }` |
| `background` | `"circle"`/`"square"`/`"squircle"` | 无（透明） | 底衬 |
| `dark` | boolean | false | 暗色模式 |
| `title` | string | — | 无障碍 `<title>` |

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

- 库体积（gzip，含全部注释）：**6.4 KB**，8 种人物风格打包。
- 单颗头像 gzip 约 **0.30–0.43 KB**（silhouette 最轻 304 B，robot 最重 425 B）。
- 生成耗时约 **0.03–0.05 ms/次**（Node / M 系列 Mac 浏览器）。

## 确定性保证

- 同名字 + 同风格 → 字节级相同的 SVG（同版本内）。
- 同名字 + 不同风格 → 8 种完全不同的观感，同源不同表达。
- 不同名字 + 同风格 → 8 风格 × 300/1000 名字全部唯一（测试语料）。
- `auto` 风格下 2000 个名字 2000/2000 唯一。
- 不依赖时间、随机数、网络。`size` 不影响几何，只影响输出属性。

## 验证

- Node 单测：8 风格确定性、300/1000 名字唯一性、选项组合无崩溃、
  SVG 结构、特殊字符处理。
- 浏览器 headless 截图：8 风格 × 8 名字、暗色模式、pixel 网格检查。
- demo.html 内置：8 风格即时切换、pixel 网格参数、16 名字自动风格墙、
  SVG 字节与 gzip 实时统计。
- test.html：浏览器内 14 项断言 + 8×8 视觉矩阵 + 参数对照 + 性能实测。

## 许可

MIT。

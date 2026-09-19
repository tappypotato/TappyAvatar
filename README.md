# TappyAvatar

[![中文](https://img.shields.io/badge/lang-中文-red.svg)](./README.md)
[![English](https://img.shields.io/badge/lang-English-blue.svg)](./README.en.md)
[![v1.8.0](https://img.shields.io/badge/version-1.8.0-0171E3.svg)](./tappy-avatar.js)
[![gzip](https://img.shields.io/badge/gzip-6%20KB-4CAF50.svg)](./tappy-avatar.js)

> 单文件零依赖的确定性头像生成器 · v1.8.0

**同一个字符串永远渲染同一个头像。不需要数据库，不需要后端。**

<div align="center">

[🔧 **在线 Demo**](https://tappypotato.github.io/TappyAvatar/demo.html) ·
[🧪 **自动化测试**](https://tappypotato.github.io/TappyAvatar/test.html) ·
[📖 **完整文档**](./docs/README.md)

</div>

```html
<script src="./tappy-avatar.js"></script>
<script>
  document.body.innerHTML = tappyAvatar("alain", { style: "portal", background: "circle" })
</script>
```

## 12 种精选风格

| | | | |
|---|---|---|---|
| `pixel` · 像素脸 | `robot` · 机器人 | `emoji` · 表情 | `wireframe` · 六边形线框 |
| `neonwaves` · 霓虹波 | `petal` · 环形花瓣 | `waveform` · 流体正弦 | `prism` · 彩虹光晕 |
| `honeycomb` · 蜂窝 | `explosion` · 爆炸 | `starfield` · 星尘漩涡 | `portal` · 传送门 |

## 特性

- **零依赖零请求**：纯 JS + SVG，浏览器全局变量直接用
- **确定性**：同 seed 同风格 → 字节级一致
- **可复现**：服务端 Node 和客户端浏览器渲染完全相同
- **任意尺寸**：`size` 属性控制像素大小，几何永远 100×100
- **12 风格 × 300 名字 = 零碰撞**

## 快速安装

```bash
# 直接下载
curl -O https://raw.githubusercontent.com/tappypotato/TappyAvatar/main/tappy-avatar.js

# 或者 clone 整个仓库
git clone https://github.com/tappypotato/TappyAvatar.git
```

| 文件 | 说明 |
|---|---|
| `tappy-avatar.js` | **核心库文件**（31.8 KB，gzip ~6 KB） |
| `demo.html` | 交互式调试器（风格切换 + 参数面板） |
| `test.html` | 自动化测试（12 风格 × 8 名字矩阵 + 性能） |
| `docs/README.md` | **完整项目文档**（API + 架构 + 风格表 + 版本历史） |

## 完整文档

[📖 docs/README.md](./docs/README.md) — 包含 API 文档、架构设计、12 种风格详细说明、版本历史与决策记录。

MIT License。

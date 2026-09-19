# TappyAvatar

> 单文件零依赖的确定性头像生成器 · v1.8.0

**同一个字符串永远渲染同一个头像。不需要数据库，不需要后端。**

```html
<script src="./tappy-avatar.js"></script>
<script>
  document.body.innerHTML = tappyAvatar("alain", { style: "portal", background: "circle" })
</script>
```

| 文件 | 说明 |
|---|---|
| `tappy-avatar.js` | **核心库文件**（31.8 KB，gzip ~6 KB） |
| `demo.html` | 交互式调试器（风格切换 + 参数面板） |
| `test.html` | 自动化测试（12 风格 × 8 名字矩阵 + 性能） |
| `docs/README.md` | **完整项目文档**（API + 架构 + 风格表 + 版本历史） |

12 种精选风格：
`pixel · robot · emoji · wireframe · neonwaves · petal · waveform · prism · honeycomb · explosion · starfield · portal`

- **零依赖零请求**：纯 JS + SVG，浏览器全局变量直接用
- **确定性**：同 seed 同风格 → 字节级一致
- **可复现**：服务端 Node 和客户端浏览器渲染完全相同
- **任意尺寸**：`size` 属性控制像素大小，几何永远 100×100

详见 [`docs/README.md`](docs/README.md) 。

MIT License。

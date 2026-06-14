# standalone — 独立 HTML 用法

learnvis 的 IIFE 构建产物可直接通过 `<script>` 标签在独立 HTML 页面中加载，无需打包工具。

## CDN 路径

```
https://cdn.jsdelivr.net/gh/0xlxx/skills@main/learnvis/assets/learnvis.iife.js
```

> IIFE 构建产物随 skill 分发，jsDelivr 从 skills 仓库自动提供。

## 本地使用（无需 CDN）

skill 安装后自带 IIFE 文件，agent 应复制到输出目录：

```bash
cp ~/.claude/skills/learnvis/assets/learnvis.iife.js ./lessons/
```

```html
<script src="./learnvis.iife.js"></script>
```

> 安装 learnvis skill 即可使用，无需 `npm install`。

## 最小模板

```html
<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <title>learnvis Demo</title>
  <style>
    *,*::before,*::after{box-sizing:border-box}
    body{background:#fafaf8;color:#333;font-family:system-ui,sans-serif;margin:0;padding:2rem}
    #stage{width:780px;height:460px;display:block;margin:0 auto}
  </style>
</head>
<body>
<div id="stage"></div>

<script src="https://cdn.jsdelivr.net/gh/0xlxx/learnvis@main/dist/learnvis.iife.js"></script>
<script>
const s = LearnVis.stage('#stage', {
  width: 780, height: 460,
  theme: 'paper',  // warm | cool | dark | paper | vivid | soft
});

// 声明式 API：每次调用 begin() → 声明元素 → commit()
s.frames.begin();
s.math.point('O', [390, 230]).color('danger').label('O').size(6);
s.frames.commit({ animate: false });
</script>
</body>
</html>
```

## 关键 API 入口

```js
const s = LearnVis.stage(selector, options)
// options: { width, height, theme, ms (默认动画时长) }
```

- `s.math` — 数学原语（point、vector、segment、circle、polygon、axes、fn 等）
- `s.graph` — 图论原语（vertex、edge、layout）
- `s.layout` — 布局原语（node、block、port、edge、layer、enclosure）
- `s.frames` — FrameManager（begin/declare/patch/commit）
- `s.steps(defs)` — 声明式步骤动画
- `s.ctx.callout(pos, html, opts)` — HTML overlay 标注

## 动画示例

```js
const steps = [
  {
    label: 'Step 1',
    frame: s => {
      s.math.point('P', [100, 230]).color('danger').label('A').size(6);
    },
  },
  {
    label: 'Step 2',
    frame: s => {
      s.math.point('P', [300, 230]).color('primary').label('B').size(6);
      s.math.vector('v', [100, 230], [300, 230]).color('accent').label('v⃗');
    },
  },
];

const ctrl = s.steps(steps);
// 配合 LearnVis.stepper(container, labels, onChange) 渲染按钮
```

## 主题

| 主题 | 风格 |
|------|------|
| `warm` | 暖色调，教学友好 |
| `cool` | 冷色调，科技感 |
| `dark` | 暗色，终端风 |
| `paper` | 学术风，极简黑白 |
| `vivid` | 高饱和，演示/演讲 |
| `soft` | 低对比，柔和灰绿 |

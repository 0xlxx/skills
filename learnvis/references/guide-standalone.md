# standalone — 独立 HTML 用法

Skill 自带 IIFE 文件（`assets/learnvis.iife.js`），无需 npm install 或 CDN。

## 使用步骤

### 1. 复制文件

```bash
cp ~/.claude/skills/learnvis/assets/learnvis.iife.js ./lessons/
```

### 2. 在 HTML 中引用

```html
<script src="./learnvis.iife.js"></script>
```

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

<script src="./learnvis.iife.js"></script>
<script>
const s = LearnVis.stage('#stage', { width: 780, height: 460 });
s.frames.begin();
s.math.point('O', [390, 230]).color('danger').label('O').size(6);
s.frames.commit();
</script>
</body>
</html>
```

## 主题

`stage({ theme: 'warm' | 'cool' | 'dark' | 'paper' | 'vivid' | 'soft' })`

| 主题 | 风格 |
|------|------|
| `warm` | 暖色调，教学友好 |
| `cool` | 冷色调，科技感 |
| `dark` | 暗色，终端风 |
| `paper` | 学术风，极简黑白 |
| `vivid` | 高饱和，演示/演讲 |
| `soft` | 低对比，柔和灰绿 |

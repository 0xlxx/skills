---
name: style-decide
description: 指导 agent 生成可视化候选方案来辅助样式决策。当用户需要选择配色、尺寸、间距、字体等视觉参数时使用。触发词：样式、配色、选颜色、候选、theme、对比。
---

# Style Decide

## 核心原则

**预览即提案，选择即决定。**

不讨论颜色的文字描述。不解释 RGB/OKLCH 数值的优劣。agent 直接生成 `components/candidate.html`，把所有候选渲染到网格里，用户打开页面一目了然。

## 流程

```
用户: "我要选 X 的样式"
agent:   分析可变参数 → 生成 4-8 套候选 → 写入 components/candidate.html → 告知用户打开
用户:   "第2套和第5套"
agent:   应用选择，更新 skill 或代码
结束
```

## 候选生成规则

### 排列方式
- 超出 3 套 → 用 CSS Grid 网格平铺，每行一个候选
- 3 套以内→ 竖排，每套一行
- 同一维度（如 strokeWidth） → 同列对齐，方便横向对比

### 每个候选单元包含
1. 名称/编号（如 `#3 · vivid`）
2. 简短描述（用词：暖/冷/高饱和/低对比/柔和/锐利，不用数字）
3. 该样式在上下文中的真实渲染效果（箭头、区域、点、标签等）
4. 如果涉及颜色→ 同时展示该颜色的箭头/填充/描边效果

### 参数扫描策略
| 用户意图 | agent 生成策略 |
|----------|--------------|
| "选一个颜色" | 从色调环均匀采样 6-8 个 OKLCH 颜色，保持亮度/饱和度一致，只变 hue |
| "选箭头粗细" | 从 0.8 到 4.0 均匀取 5 档 |
| "选配色方案" | 冷暖暗亮各一套，加一套高饱和、一套柔和 |
| "选整体风格" | 每套展示完整小场景（一个坐标系 + 一条路径 + 一个点 + 一个箭头 + 一个标签） |

## 预览页模板

```html
<!doctype html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Style Candidate — {决策名称}</title>
  <link rel="stylesheet" href="../theme.css">
  <style>
    *{box-sizing:border-box} body{background:var(--bg);color:var(--text);font-family:var(--font);margin:0;padding:2rem;line-height:1.6}
    h1{font-size:1.3rem;margin:0 0 0.3rem}
    .sub{color:var(--text-muted);font-size:0.82rem;margin:0 0 1.5rem}
    .grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(300px,1fr));gap:12px}
    .card{background:var(--card);border:1px solid var(--border);border-radius:10px;padding:12px}
    .card h2{font-size:0.85rem;margin:0 0 2px}
    .card .desc{font-size:0.72rem;color:var(--text-muted);margin-bottom:8px}
    .card .stage{width:100%}
  </style>
</head>
<body>
<h1>{决策名称}</h1>
<p class="sub">{简要说明}</p>
<div class="grid" id="grid"></div>
<script src="https://d3js.org/d3.v7.min.js"></script>
<script src="../dist/learnvis.js"></script>
<script>
const candidates = [ /* ... */ ];
const grid = document.getElementById('grid');
candidates.forEach((c, i) => {
  const card = document.createElement('div');
  card.className = 'card';
  card.innerHTML = `<h2>#${i+1}</h2><div class="desc">${c.desc}</div><div class="stage" id="st${i}"></div>`;
  if (c.bg) { card.style.background = c.bg; card.style.color = '#fff'; }
  grid.appendChild(card);
  const s = LearnVis.stage('#st' + i, { width: 300, height: 120, ms: 0 });
  // 渲染候选在这里
  s.draw();
});
</script>
</body>
</html>
```

## 决策完成后

1. 将选中的候选值写入对应模块（如 `vis/themes.js` 或 `vis/tokens.js`）
2. 清理 `components/candidate.html`（改为归档名如 `components/arrow-styles.html` 或删除）
3. 更新 skill 文档记录新默认值

## 不应该做的事

- ❌ 用文字描述颜色差异
- ❌ 只给数字不给预览
- ❌ 选完后不落代码
- ❌ 候选之间 baseline 不一致（对比无意义）

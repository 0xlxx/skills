---
name: visual-teaching
description: 创建可视化教学材料——课程、图解、参考资料、lesson、reference。HTML 优先，本质先行，逐层拆解。Use when creating lessons, visual explanations, teaching content, diagrams, learning materials, or when the user asks to teach, explain, or illustrate a concept.
---

# Visual Teaching

创建教学内容的准则——课程、图解、参考资料。

## 文件组织

**多文件目录结构**。一个概念一个文件，目录内首尾导航链接。

```
lessons/000N-topic/
├── index.html              ← 第一层：本质（5 分钟，零代码）
├── 01-concept-a.html       ← 拆解①
├── 02-concept-b.html       ← 拆解②
├── ...
└── 0N-put-together.html    ← 合起来 + 权衡 + 练习
```

每层一个 HTML 文件，页面首尾有 prev/next/index 导航。

## 本质先行（第一层）

每课第一层：**问题 → 一句本质 → 具体例子**。零代码，纯图解。学完能给别人讲清楚。

1. 先讲它解决什么问题——在整个系统里扮演什么角色
2. 一句话讲清本质——不依赖领域术语
3. 给一个最小、最具体的例子——具体到用户能在脑中运行
4. 之后才是细节——每给一个细节都问"这帮助理解本质了吗"

完成标志：用户能用一句话说清"这个东西为什么存在、它从根本上是什么"。

## 逐层拆解（第二层）

第一层得本质，第二层拆内部。结构：**总览 → 逐个子概念 → 合起来**。

类比：算法 A 拆成 B、C、D 子函数。主函数只展示调用结构（总览/合起来），子函数各讲各的（拆解文件）。关注始终聚焦在当前层次上。

每个拆解文件只讲一个概念。文件内不分层——一个 HTML 文件 = 一个拆解 + 它的文字说明。

## HTML 优先（禁止完整 SVG）

**所有内容用 HTML/CSS 表达。禁止完整 SVG 图示。**

| 需求 | 方案 |
|---|---|
| 表格数据 | `<table>` |
| 彩色标签 | `<span>` + CSS class |
| 对比框、签名框 | `<div>` + CSS border/background |
| 流程图 | flexbox + 箭头字符 `→` |
| 缓存行/内存排列 | `<div>` + 等宽字体 `<span>` + 背景色 |
| 步骤卡片 | `<div class="step-card">` |
| 单个箭头/图标 | 内联 `<svg>`，仅 16×16 大小的图形符号 |

判断标准：这个视觉元素有没有**空间信息**（连接线、精确定位、位置变化）？没有 → HTML。有 → 还是先想 HTML 方案（flexbox 行 + 箭头字符），只有 HTML 真的做不到才用内联 SVG 小图标。

HTML 的优势：文本自动换行、浏览器原生字体渲染、响应式、无障碍。SVG 在这些方面全面输给 HTML。

## 图示原则

当必须用内联 SVG 图标时（仅限小符号）：

- `width`/`height` = `viewBox`，1:1 像素映射，不缩放
- `font-size` 直接等于屏幕像素
- 共享样式类写入 `assets/style.css`，文件内只放页面特有样式

文字和图解互补不重复。图只放结构性视觉信息，解释性文字全部放 HTML 段落。一句超过 15 字的中文 → 拿出来放 HTML。

## KaTeX 公式

用 `data-latex` 属性避让 HTML 转义，不写 `$...$` 分隔符：

```html
<span class="math" data-latex="\mathrm{sig}_{arch} \mathbin{\&} \mathrm{sig}_{query} = \mathrm{sig}_{query}"></span>
```

页面底部统一渲染：

```html
<script defer src="https://cdn.jsdelivr.net/npm/katex@0.17.0/dist/katex.min.js"></script>
<script>
document.addEventListener('DOMContentLoaded', () => {
  document.querySelectorAll('.math').forEach(el => {
    katex.render(el.dataset.latex, el, { throwOnError: false });
  });
});
</script>
```

## 不要做的事

- 不要在 SVG 里放解释性文字
- 不要把多个步骤塞进一张图
- 不要用 `$...$` 分隔符（用 `data-latex`）
- 不要给 SVG 设 `width:100%`（用固定像素 1:1）
- 不要在一个大 HTML 里分层（拆成独立文件）
- 不要用 viewBox 缩放（1:1 像素映射）

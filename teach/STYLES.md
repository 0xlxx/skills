# Styles — Teaching HTML Defaults

## Hard Rules

- 不设固定 `width`/`height`——内容决定尺寸，用 `fit-content`、`minmax()`、`clamp()`。固定尺寸 = 内容变了就崩。
- 不先写 `@media`——先试 RAM grid、flex-wrap、`clamp()`。断点是最后手段，不是第一反应。

---

每次创建教学 HTML 页面时，引入以下样式。

## Typography

一切为了读者不用缩放、不用眯眼。以下是基线，按内容密度上下调整。

正文用 `clamp()` 做流式字号——小屏不巨大，大屏不渺小。行高 1.6 保证长文本可读，标题 1.3 保证多行标题不散。正文栏宽不超过 65ch——再宽眼球扫读开始吃力。

```css
:root {
    --font-body: clamp(1.125rem, 2.5vw, 1.375rem);
    --font-heading: clamp(1.5rem, 5vw + 1rem, 3rem);
    --font-code: clamp(0.875rem, 1.5vw, 1rem);
}

body { font-size: var(--font-body); line-height: 1.6; max-width: 65ch; }
h1, h2, h3 { font-size: var(--font-heading); line-height: 1.3; }
pre, code { font-size: var(--font-code); line-height: 1.5; }
```

## HTML Elements

用原生元素表达视觉，不依赖 SVG 图示。

| 需求 | 方案 |
|---|---|
| 表格数据 | `<table>` |
| 彩色标签 | `<span>` + CSS class |
| 对比框、签名框 | `<div>` + CSS border/background |
| 流程图 | flexbox + 箭头字符 `→` |
| 缓存行/内存排列 | `<div>` + 等宽字体 `<span>` + 背景色 |
| 步骤卡片 | `<div class="step-card">` |
| 箭头/图标 | Unicode 字符或内联小图标 |

## Layout

**RAM 卡片网格**——自动增减列数，零断点。卡片最小宽度取内容不拥挤的尺寸：
```css
.cards {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(min(100%, var(--card-min, 320px)), 1fr));
    gap: clamp(1rem, 3vw, 2rem);
}
```

**Flexbox 折行**——宽屏并排，窄屏堆叠。`flex-basis` 按内容自然宽度设：
```css
.comparison { display: flex; flex-wrap: wrap; }
.comparison > * { flex: 1 1 var(--cmp-min, 280px); }
```

**内容驱动尺寸**——标题下划线跟文字走，代码块不溢出：
```css
h2 { width: fit-content; border-bottom: 2px solid; }
pre { width: min(100%, max-content); overflow: auto; }
```

## Spacing & Radius

间距和圆角随视口缩放——宽屏给呼吸感，窄屏不浪费空间。以下为基线，按内容密度调。

```css
:root {
    --gap: clamp(0.75rem, 2vmax, 1.5rem);
    --padding: clamp(1rem, 4vw, 2.5rem);
    --radius: clamp(0px, (100vw - 480px) * 1000, 8px);  /* 窄屏直角，宽屏微圆 */
}
```

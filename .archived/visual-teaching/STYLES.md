# Styles — Teaching HTML Defaults

## Hard Rules

- 不设固定 `width`/`height`——用 `fit-content`、`minmax()`、`clamp()`
- 不先写 `@media`——先试 RAM grid、flex-wrap、`clamp()`

---

每次创建教学 HTML 页面时，引入以下样式。

## Typography

- 正文 ≥ 18px（1.125rem），标题 ≥ 24px（1.5rem），代码 ≥ 14px
- 正文行高 1.6，标题 1.3，代码 1.5
- 正文 max-width: 65ch

```css
:root {
    --font-body: clamp(1.125rem, 2.5vw, 1.375rem);   /* 18–22px */
    --font-heading: clamp(1.5rem, 5vw + 1rem, 3rem);  /* 24–48px */
    --font-code: clamp(0.875rem, 1.5vw, 1rem);        /* 14–16px */
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

**RAM 卡片网格**——自动增减列数，零断点：
```css
.cards {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(min(100%, 320px), 1fr));
    gap: clamp(1rem, 3vw, 2rem);
}
```

**Flexbox 折行**——宽屏并排，窄屏堆叠：
```css
.comparison { display: flex; flex-wrap: wrap; }
.comparison > * { flex: 1 1 280px; }
```

**内容驱动尺寸**——标题下划线跟文字走，代码块不溢出：
```css
h2 { width: fit-content; border-bottom: 2px solid; }
pre { width: min(100%, max-content); overflow: auto; }
```

## Spacing & Radius

```css
:root {
    --gap: clamp(0.75rem, 2vmax, 1.5rem);
    --padding: clamp(1rem, 4vw, 2.5rem);
    --radius: clamp(0px, (100vw - 480px) * 1000, 8px);
}
```

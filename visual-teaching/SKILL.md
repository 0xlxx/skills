---
name: visual-teaching
description: 创建可视化教学材料——HTML 优先，本质先行，逐层拆解。当用户要求创建课程、图解、教学资料、lesson、diagram、visual explanation，或需要讲解、演示概念时使用。
---

<visual-teaching>

<core-principle>
教学内容 = 多文件 HTML 目录，按本质→拆解→合起来的层次组织。**所有视觉内容用 HTML/CSS 表达，禁止完整 SVG 图示。** 浏览器原生渲染在文本换行、字体、响应式、无障碍上全面优于 SVG。
</core-principle>

<rules>

### 1. 文件组织——一个概念一个文件

```
lessons/000N-topic/
├── index.html              ← 第一层：本质（5 分钟，零代码）
├── 01-concept-a.html       ← 拆解①
├── 02-concept-b.html       ← 拆解②
├── ...
└── 0N-put-together.html    ← 合起来 + 权衡 + 练习
```

每层一个 HTML 文件，页面首尾有 prev/next/index 导航。文件内不分层——一个 HTML 文件 = 一个拆解 + 它的文字说明。

### 2. 本质先行（第一层）→ 与 @essence-first 一致

问题 → 一句本质 → 具体例子。零代码，纯图解。学完能给别人讲清楚。细节见 essence-first 的 explanation-order。

完成标志：用户能用一句话说清"这个东西为什么存在、它从根本上是什么"。

### 3. 逐层拆解（第二层）

第一层得本质，第二层拆内部。结构：**总览 → 逐个子概念 → 合起来**。

类比：算法 A 拆成 B、C、D 子函数。主函数只展示调用结构（总览/合起来），子函数各讲各的（拆解文件）。

### 4. HTML 优先——禁止完整 SVG

| 需求 | 方案 |
|---|---|
| 表格数据 | `<table>` |
| 彩色标签 | `<span>` + CSS class |
| 对比框、签名框 | `<div>` + CSS border/background |
| 流程图 | flexbox + 箭头字符 `→` |
| 缓存行/内存排列 | `<div>` + 等宽字体 `<span>` + 背景色 |
| 步骤卡片 | `<div class="step-card">` |
| 单个箭头/图标 | 内联 `<svg>`，仅 16×16 大小的图形符号 |

判断标准：有没有**空间信息**（连接线、精确定位、位置变化）？没有 → HTML。有 → 先想 HTML 方案（flexbox + 箭头），只有 HTML 真的做不到才用内联 SVG 小图标。

### 5. SVG 图示约束（仅限内联小图标）

- `width`/`height` = `viewBox`，1:1 像素映射，不缩放
- `font-size` = 屏幕像素
- 共享样式写入 `assets/style.css`，页面特有样式写文件内
- 不要给 SVG 设 `width:100%`

文字和图解互补不重复。图只放结构性视觉信息，解释性文字全放 HTML 段落。一句超过 15 字的中文 → 拿出来放 HTML。

### 6. KaTeX 公式 → [KATEX.md](KATEX.md)

</rules>

<constraints>
- 不要在 SVG 里放解释性文字
- 不要把多个步骤塞进一张图
- 不要在一个大 HTML 里分层（拆成独立文件）
- 不要用 viewBox 缩放（1:1 像素映射）
- KaTeX 不写 `$...$` 分隔符（用 `data-latex`）
</constraints>

</visual-teaching>

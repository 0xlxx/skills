---
name: visual-teaching
description: 创建可视化教学材料——HTML 优先，本质先行，逐层拆解，内在响应式。当用户需要 lesson、diagram、visual explanation、讲解概念时使用。
---

<visual-teaching>

<core-principle>
教学内容 = 多文件 HTML 目录，按本质→拆解→合起来组织。HTML 优先——浏览器原生渲染自带响应式、无障碍、零依赖。
</core-principle>

<pre-flight>

### 前置摸底

用 AskUserQuestion 摸底学生对前置概念的掌握程度。有不清楚的术语，创建 `prerequisite.html` 做前置科普。

完成标志：已摸底，`prerequisite.html` 已创建或确认不需要。

</pre-flight>

<steps>

### Step 1: 建目录，定拆解

把概念拆成 2–5 个子概念，创建目录：

```
lessons/NNNN-topic/
├── prerequisite.html       ← 前置科普（按需）
├── index.html              ← 概念层
├── 01-subtopic.html        ← 拆解①
├── 02-subtopic.html        ← 拆解②
├── ...
└── 0N-put-together.html    ← 合起来 + 权衡 + 练习
```

一文件一概念。文件内不分层——一个 HTML = 一个拆解 + 它的文字说明。

完成标志：目录已创建，子概念列表已定，每个文件已命名。

### Step 2: 写 index.html（本质层）

问题 → 本质概念 → 具体例子。回答：这个东西为什么存在、包含什么、从根本上是什么。

完成标志：HTML 包含 ① 它解决什么问题 ② 定义本质概念 ③ 至少一个具体例子。页面首尾有 prev/index/next 导航（index.html 无 prev，put-together 无 next）。

### Step 3: 拆分

每个文件：总览 → 逐点展开 → 回连整体。用递阶控制——每层只管自己这层，下层细节交给后续文件。

完成标志：每个文件已创建，导航链（prev/index/next）首尾完整可遍历。

### Step 4: 全图

串联所有子概念，展示它们如何协作。加权衡和至少一道练习。

完成标志：文件已创建，包含权衡讨论和至少一道练习。

</steps>

<rules>

### 样式 → [STYLES.md](STYLES.md)——每次创建 HTML 前读

### KaTeX → [KATEX.md](KATEX.md)——每次写公式前读，用 `data-latex`，不写 `$...$`

</rules>

</visual-teaching>

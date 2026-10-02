# 容器查询（Container Queries）Agent 参考

## 何时来读

- 给组件加容器查询，或为同一组件在侧边栏、主内容区等不同容器中提供不同 UI。
- 判断该用媒体查询还是容器查询。
- 排查 `@container` 不生效、命中了错误容器、旧语法不工作。
- 需要选择 `container-type`、容器查询单位、polyfill 与渐进增强策略。
- 原文未覆盖时，本文件只报告缺口，不补造规范结论。

## 步骤

### 1. 先判断查询对象

- 媒体查询只知道视口，不知道组件实际可用宽度。
- 容器查询让组件响应最近查询容器，而不是浏览器视窗。
- 媒体查询负责页面级宏观布局（Macro Layout）；容器查询负责组件级微观布局（Micro Layout）。二者共存，不是替代关系。
- 同一卡片放在 `aside` 和 `main` 中时，可因容器宽度不同自动呈现不同 UI；原文示例把同一页面中的卡片分为 `S`、`M`、`L` 三种状态。
- 若组件结构必须大幅改变，或只是因安排不下就隐藏大量内容，考虑重做组件，而不是堆叠容器查询。
- 适合：卡片、搜索表单、导航栏、分页器、侧边栏、用户信息组件。
- 用户信息组件的原则是内部结构基本不变，只调整布局、字号、间距或显隐；例如在 `>20rem`、`>35rem`、`>45rem` 使用不同排列。

### 2. 在组件的包装层声明包含上下文

```css
.card__container {
  container-name: card;
  container-type: inline-size;
  min-width: 300px;
  width: 360px;
  overflow: hidden;
  resize: horizontal; /* 仅为演示拖拽改变容器尺寸 */
}
```

- `container-type: inline-size`：原文用它按容器内联轴（Inline Axis）方向尺寸变化查询。
- `container-type: size`：原文用它查询宽高比、取向并使用 `cqh` 等块方向单位；即尺寸查询涉及两个轴时用 `size`。
- `container-name`：为包含上下文命名，多个上下文并存时用于消除歧义。
- 简写顺序固定为“名称 / 类型”：

```css
.card__container {
  container: card / inline-size;
}
```

- `container-name` 可省略，初始值为 `none`；原文强调 `container-type` 不可省略，省略即没有显式声明包含上下文。
- 名称不能使用 `default`、`inherit`、`initial` 等 CSS 关键词。
- 查询容器必须由祖先显式声明；`body`、`html` 没有默认回退包含上下文。
- 原文说“允许开发者定义任何一个元素为包含上下文”，但未给出不能作为查询容器的完整元素清单。

### 3. 在容器后代上写 `@container`

```css
@container card (inline-size > 650px) {
  .card {
    grid-template-columns: 300px minmax(0, 1fr);
  }
}

@container card (inline-size > 820px) {
  .card {
    grid-template-columns: 420px minmax(0, 1fr) auto;
  }
}
```

- 命名查询：`@container card (...)`，`card` 是 `container-name`。
- 匿名查询：`@container (...)`，命中最靠近目标元素的、已显式声明包含上下文的祖先。
- `@container` 与 `@media`、`@supports` 类似；条件为真才应用，否则忽略规则块。
- 原文反复使用 `.card__container` 包住 `.card`，再在 `@container` 中设置 `.card`。因此不要同时把 `.card` 当查询容器又查询 `.card` 自身：原文定义的是“查询容器的后代元素”可改变样式，不是容器自身。
- 嵌套匿名容器会命中最近的容器；需要跨越就近容器时，先命名目标容器。

### 4. 选择尺寸条件

原文展示的尺寸查询包括：

- `width`、`min-width`、`max-width`。
- `height`。
- `inline-size`、`block-size`。
- `aspect-ratio`、`max-aspect-ratio`、`orientation`。
- 支持逻辑轴查询时，`inline-size` / `block-size` 分别对应内联轴 / 块方向。
- 原文的水平布局示例既写过 `width`，也写过 `inline-size`；它没有解释非水平书写模式下二者是否可以互替。
- 查询宽高比与取向的完整示例使用 `container-type: size`，不是因为 `inline-size` 在该例中够用。

```css
.card__container {
  container-name: info-card;
  container-type: size;
}

@container info-card (max-aspect-ratio: 3/2) {
  .card {
    grid-template-columns: auto;
  }
}

@container info-card (orientation: landscape) {
  .card {
    /* 横向布局 */
  }
}
```

### 5. 需要连续缩放时改用容器查询单位

```css
.card__title {
  font-size: clamp(1rem, 3cqw, 2rem);
}

.card__title--with-offset {
  font-size: clamp(1.2rem, 5cqi + 1rem, 3rem);
}
```

- 对多个断点逐级改字号，可合并为一个 `clamp()`。
- `min()` / `max()` 也可使用容器单位，例如 `font-size: max(1.25rem, 12cqi - 1rem)`。
- 容器查询单位可出现在任何接受 `<length>` 的属性中，如 `font-size`、`margin`、`padding`、`border-width`、`background-size`、`inset`、`gap`。
- 旧原型使用 `q*`，例如 `qw`、`qh`；现行示例使用 `cq*`。旧写法很可能不工作。

### 6. 与 RAM 配合，让容器宽度先变化

```css
main .grid {
  display: grid;
  gap: 1rem;
  grid-template-columns: repeat(auto-fit, minmax(min(100% - 2rem, 30em), 1fr));
}
```

- RAM 自适应列轨道改变 `.card__container` 宽度；卡片再用 `@container` 改内部布局。
- 页面级列数和侧栏宽度继续用媒体查询控制。
- 原文示例：`aside`、`main` 命名为 `layout` 后，`.grid` 在 `>40em`、`>60em`、`>80em` 分别切为 2、3、4 列。
- 卡片列表数量不齐时，可用 `grid-auto-flow: dense` 与 `grid-column: span 2/3/4` 配合 `layout` 容器查询。

## 参考

### 语法与属性清单

| 名称 | 作用 | 原文要点 |
| --- | --- | --- |
| `container-type` | 声明查询容器类型 | `inline-size` 查内联轴；`size` 用于涉及高度、宽高比等两个轴的示例 |
| `container-name` | 给包含上下文命名 | 可省略，初始值 `none`；不能是关键词 |
| `container` | `container-name / container-type` 的简写 | 名称在 `/` 前，类型在 `/` 后 |
| `@container` | 条件组规则 | 可带容器名；不带名称时选最近祖先容器 |
| `container-type: normal` | — | 原文未覆盖 |
| `size` / `inline-size` 对布局、百分比和包含性的副作用 | — | 原文只警告样式与尺寸会形成循环，未展开具体副作用 |
| 不能作为查询容器的元素清单 | — | 原文未覆盖；只明确 `body`、`html` 没有默认包含上下文 |

### 容器查询单位

| 单位 | 相对量 |
| --- | --- |
| `1cqw` | 查询容器宽度的 1% |
| `1cqh` | 查询容器高度的 1% |
| `1cqi` | 查询容器内联尺寸的 1% |
| `1cqb` | 查询容器块尺寸的 1% |
| `1cqmin` | `1cqi`、`1cqb` 中较小者 |
| `1cqmax` | `1cqi`、`1cqb` 中较大者 |

### 媒体查询与容器查询

| 问题 | 媒体查询 | 容器查询 |
| --- | --- | --- |
| 查询依据 | 浏览器视窗、设备环境 | 最近的显式查询容器或命名容器 |
| 主要层级 | 页面宏观布局 | 组件内部微观布局 |
| 适用场景 | 整页网格、侧栏/主栏切换 | 卡片、表单、导航、分页、侧边栏状态 |
| 关系 | 保留 | 与媒体查询共存 |

## 排查清单

1. 目标的祖先是否显式写了 `container-type`？`body`、`html` 不会自动兜底。
2. 是否把 `container-type` 写在了被样式化的元素自身？原文要求查询容器的后代变化样式；改用包装元素。
3. 命名查询是否与 `container-name` 完全一致？名称拼错、忘了命名都会命中错误容器或被忽略。
4. 匿名查询是否被更近的嵌套容器截获？给目标容器命名。
5. 是否查询了高度、块尺寸或宽高比，却只声明 `inline-size`？原文对应完整示例使用 `size`。
6. 是否使用了旧 `q*` 单位或旧容器查询语法？这类教程示例可能没有任何效果。
7. 容器尺寸是否真的会变化？若外层 Grid/Flex 永远给出固定宽度，组件断点不会触发；先用 RAM 等方式让包装层可变。
8. 是否在查询目标自身、而不是查询容器后代？把包装层与组件层分开。
9. 是否把样式查询误当尺寸查询？`style(...)` 只查容器样式或自定义属性。
10. 原文只把循环依赖列为容器查询的实现难点；`.card { container-type: size }` 的完整浏览器行为、百分比影响与元素限制，原文未覆盖。
11. 循环依赖的原因链：容器查询要求样式取决于组件尺寸，而组件样式又会影响尺寸；原文称任意打破循环会产生奇怪结果、干扰浏览器，并增加浏览器优化成本。

## 兼容、回退与边界

- 原文写作时，现代主流浏览器已可查看容器查询效果，但投入生产仍建议慎重。
- 原文给出的生产 polyfill：`https://github.com/GoogleChromeLabs/container-query-polyfill`。
- 默认样式先按窄容器写，再在 `@container` 内增强；不满足条件或不支持规则的浏览器会保留默认布局。
- 原文未给出针对容器查询的 `@supports` 精确写法。若必须使用，需按目标浏览器另行验证，不能把本文件当作 `@supports` 语法来源。
- 样式查询（Style Queries）与尺寸容器查询不同：前者查容器计算样式或 CSS 变量。原文写作时仅在 Chrome Canary、开启 Experimental Web Platform features 后可用，原型主要支持 CSS 变量，并预计在 Chrome M111 发布。
- 样式查询示例：容器写 `--boxed: true`，后代使用 `@container style(--boxed: true)`。
- 不要把样式查询当作当前通用生产方案；原文仍在实验阶段。

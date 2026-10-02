# 组件驱动式 Web 设计参考

## 什么时候来读

- 设计或重构可复用组件，要求它在窄卡片、宽主栏、侧栏等不同容器中都可用。
- 同一组件会在同一视口（viewport）下同时出现多种宽度，不能只按页面断点切成一个版本。
- 卡片数量、可用空间或文案长度不固定，希望组件自动换行、收缩或重排。
- 需要判断：该用内在尺寸（intrinsic sizing） / RAM（Repeat, Auto, Minmax）、媒体查询（Media Queries），还是容器查询（Container Queries）。
- 组件还需响应用户偏好（减少动效、深色模式、低数据、对比度）或折叠屏外形。
- 组件适配不同语言文案时，用它检查断点是否由内容驱动，而不是由设备名驱动。

## 执行步骤

1. 先给问题分类，不要一律加 `@media`。
   - 变化来自用户系统偏好：用用户偏好媒体查询。
   - 变化来自折叠屏、双屏或视口被物理分割：用外形查询与环境变量。
   - 变化只是内容在可用宽度内自然换列、填满剩余空间：优先用 CSS Grid 的 RAM 布局。
   - 同一组件在同一视口下因父容器宽窄不同而出现不同结构：需要查询祖先容器，而不是查询视窗。
   - 原文未覆盖 RAM 与容器查询的完整取舍规则；它只明确了几类可操作场景。

2. 从内容变化点定义组件状态，不从设备名定义。
   - 原文明确：不要根据设备、产品、品牌或操作系统定义断点，否则会形成维护噩梦。
   - 由小到大设计：先把内容做适合小尺寸，再逐步扩大，直到布局真的需要变化时才加断点。
   - 主断点用于布局显著变化；次断点用于较小调整，但断点越多，开发与维护成本越高。
   - 面向多语言文案时，原则仍是“由内容决定适配”。原文没有给出文案膨胀率、语言断点或测试矩阵，需按真实文案测量。

3. 能用 RAM 解决时，先让布局自己重排。
   - 原文明示：动态内容数量与剩余空间造成的卡片排布问题，可用 Grid RAM 解决；不必为每种数量写媒体查询。
   - 原文示例：

```css
.container {
  width: 100%;
  max-width: 720px;
  display: grid;
  grid-template-columns: repeat(
    auto-fit,
    minmax(min(100% - 2rem, 280px), 1fr)
  );
  gap: 1rem;
}
```

   - 数值含义：单列最小目标为 `280px`，同时最多占 `100% - 2rem`；剩余空间由 `1fr` 分配。
   - 原文反例：卡片容器若改用 Flexbox，而不是 Grid RAM，卡片可能跨越多列；动态内容有时还会留下空白或让卡片扩张填补剩余空间。

4. 同一组件在同一断点出现多个 UI 时，停止用视窗猜布局。
   - 原文的卡片在手机、平板、桌面各有一个媒体查询版本；但桌面同一断点下需要“普通卡片”和“特色卡片”两种 UI。
   - 原作者的做法是增加 `card--feature` 类；这只是同一断点下的变体选择，不能知道卡片父容器的真实宽度。
   - 原文明示：特色卡片在平板端看不到，是因为其样式被限制为视窗宽度 `1024px` 以上才生效。
   - 应把“组件自己占多大空间”交给祖先容器查询。原文说容器查询是组件驱动设计最关键部分，但具体语法留给下一节，本文件不伪造 `@container` 代码。
   - 原文未覆盖容器查询的 `container-type`、查询单位、后备方案、浏览器支持表和调试方法。

5. 仅在语义确实属于视窗、用户或外形时保留 `@media`。
   - 视窗：`min-width`、`max-width`、`min-height`、`max-height`、`orientation`、`aspect-ratio`。
   - 用户偏好：见下方“用户偏好查询”。
   - 折叠设备：见下方“外形查询”。
   - 若组件只是要在可用宽度内重排，不要把其内部状态继续绑定到 `vw` 或页面断点。

6. 写断点边界时避免重叠和缝隙。
   - 原文要求在 `480px` 分界时写 `@media (max-width: 480px)` 与 `@media (min-width: 481px)`。
   - Media Queries Level 4 起可用数学表达：

```css
@media (width <= 768px) { /* ... */ }
@media (width >= 375px) { /* ... */ }
@media (375px <= width <= 768px) { /* ... */ }
```

7. 加入用户偏好响应，但保留信息语义。
   - 减少动效不等于删除所有反馈；原文要求保留坚实的、去除非必要动效的基础体验，再做渐进增强。
   - 主题要允许用户显式覆盖系统颜色，而不是让系统深色规则覆盖用户选择。
   - 低数据模式应替换为大图、高分辨率图或更省流量的资源，不是只改 CSS 表象。
   - 强制颜色模式会删除阴影等视觉效果，重要边界应改用边框或轮廓表达。

8. 折叠设备只用其几何信息做布局，不用猜品牌型号。
   - 优先查询视口分段数量；原文指出 `horizontal-viewport-segments`、`vertical-viewport-segments` 将替代旧的 `screen-spanning`。
   - 用环境变量拿分段几何，和 CSS Grid 组合，避免把物理铰链写成固定像素。
   - 折叠相关 CSS/API 原文称为很新、差异大；上线前需在目标浏览器和设备验证。

9. 交付前按真实边界验证。
   - 同一组件放入最窄、最宽、最窄且长文案、宽容器但窄视口等上下文。
   - 调整动态条目数量，确认没有空列、跨列或内容溢出。
   - 验证键盘/指针、浅色/深色、正常/减少动效、正常/高对比度、正常/低数据。
   - 验证折叠设备至少覆盖单屏、横向跨双屏、纵向跨双屏；原文未给统一测试浏览器矩阵。

## 参考

### 核心模型

- 组件驱动式 Web 设计（Component-Driven Web Design）：CSS 新增能力直接给组件注入响应能力，而不是只给整页按视窗注入样式。
- 下一代响应式布局应具备三项能力：响应用户需求、响应外形需求、响应容器需求。
- 原文本文只展开前两项；响应容器是单独下一节的主题。
- 这里的组件是 Web 元素，可由若干设计元素组成；卡片、幻灯片、内容块都符合这个含义。
- 组件应依据自身可用空间和自身上下文决定排布，不应要求调用方传入尺寸参数或额外选择卡片的 UI 变体。
- 仅靠全局视窗信息，可以改字体大小、最大宽度、背景图或布局，但不能让组件真正拥有自适应的内部样式。
- 当设计系统基于组件而不是页面时，只用视窗媒体查询会明显失效。

### 卡片案例：数值与结构

- 原文组件结构：卡片容器、缩略图 `figure`、标题 `h3`、描述 `p`。
- 手机版 Grid：`grid-template-columns: 0.3fr 0.7fr`；区域为 `figure title / figure description`。
- 手机版尺寸：`padding: 1rem`、`border-radius: 6px`、`gap: 0.5rem 1rem`。
- 图片：`width: 100%`、`height: 100%`、`aspect-ratio: 3 / 2`、`object-fit: cover`。
- 手机版描述截断：`--line-clamp: 3`。
- 平板断点：`min-width: 768px`；改为单列区域 `figure / title / description`；描述截断改为 `--line-clamp: 4`。
- 桌面断点：`min-width: 1024px`；特色卡片将图片铺满网格，标题和描述叠在其上。
- 桌面遮罩：伪元素铺满网格，渐变从 `rgb(0 0 0 / 0.85)` 到 `rgb(0 0 0 / 0.0125)`；标题和描述置于更高 `z-index`。
- 桌面特色卡片描述截断：`--line-clamp: 1`。
- 原文标题字号示例为 `clamp(1.25rem, 3vw + 1.5rem, 1.75rem)`。
- 坑：`vw` 仍绑定视窗；宽视口里的窄组件可能因此得到不合适的字号。原文没有给出容器相对单位方案。

### 媒体查询规则

- 原文称 `@media` 约有 `24` 个可查询特性，其中约 `19` 个得到较好支持；不要假设所有特性都可直接上线。
- 媒体查询适合视窗尺寸、方向、宽高比、用户偏好和设备外形。
- 媒体查询不适合判断“同一视口下，这个组件所在的父容器有多宽”。
- 增加类名可以强行在同一断点选择不同 UI，但调用方或模板必须知道该选哪个类，组件并未自行适配上下文。
- 原文未给出通用断点表；它主张由内容触发断点，而不是照搬设备尺寸。

### 用户偏好查询

- `prefers-reduced-motion`：检测系统是否要求减少运动。
- 简单处理可令动画 `animation: none`。
- 原文的全局处理为：`animation-duration: 0.001ms !important`、`animation-iteration-count: 1 !important`、`transition-duration: 0.001ms !important`。
- 可同时匹配 `(update: slow)`，照顾低刷新率或性能较弱设备。
- `prefers-color-scheme`：根据系统深浅色偏好覆盖颜色变量；示例先在 `:root` 定义亮色，再在 `dark` 分支重置。
- 显式用户主题必须能覆盖系统偏好；原文示例用 `:root:not([data-user-color-scheme])` 限制系统分支，并单独定义 `[data-user-color-scheme="dark"]`。
- `color-scheme` 决定浏览器默认外观；`prefers-color-scheme` 决定可样式化外观，两者应配合。
- `<meta name="color-scheme" content="dark light">` 告诉浏览器页面支持并优先选择深色。
- `theme-color` 可和组件状态或进度联动，改变浏览器/系统界面主题色。
- `prefers-reduced-data`：低数据模式时切换轻量资源，原文示例从 `images/heavy.jpg` 切到 `images/light.avif`。
- `prefers-contrast: high`：提高文本与背景对比度。
- 其他原文列出的偏好查询：`prefers-reduced-transparency`、`forced-colors`、`light-level`。
- `forced-colors: active` 下，原文通过变量把对话框外框从细线改成粗线；因为阴影会被移除，边界不能只靠 `box-shadow`。
- 这些偏好查询也可用于 `<picture><source media="...">`，按用户偏好选择图片源。

### 外形查询

- 外形响应针对双屏可折叠设备（有缝，例如 Microsoft Surface Duo）和单屏可折叠设备（无缝，例如 Huawei Mate XS）。
- 旧的有缝查询示例：`@media (spanning: single-fold-vertical)`。
- 无缝姿态示例：`@media (screen-fold-posture: laptop)`。
- 折叠角度示例：`@media (max-screen-fold-angle: 120deg)`。
- 视口分段示例：`@media (horizontal-viewport-segments: 2)`、`@media (vertical-viewport-segments: 2)`。
- 原文明确指出，`horizontal-viewport-segments` 与 `vertical-viewport-segments` 是最新特性，将替代最初的 `screen-spanning`；后文旧示例仍使用 `screen-spanning` 和 polyfill，属于过渡写法。
- 环境变量示例：`env(viewport-segment-left 0 0)`、`env(viewport-segment-width 0 0)`。
- 原文说六个新环境变量将替代 `env(fold-top)`、`env(fold-left)`、`env(fold-width)`、`env(fold-height)`；原文未逐个列出六个变量名称。
- 典型组合：媒体查询切换 Grid 模板，`env()` 提供分段尺寸，`1fr` 或 `minmax()` 分配剩余空间。

```css
:root { --sidebar-width: 5rem; }

@media (spanning: single-fold-vertical) {
  :root { --sidebar-width: env(viewport-segment-left 0 0); }
}

main {
  display: grid;
  grid-template-columns: var(--sidebar-width) 1fr;
}
```

### 明确边界

- 原文未覆盖容器查询的具体语法、容器类型、查询单位、样式查询与响应式图片结合方式。
- 原文未覆盖不同语言文案长度变化时的断点选择、测试数据或具体单位。
- 原文未覆盖 RAM 与容器查询的完整优先级规则。
- 原文未覆盖折叠屏 API 的完整兼容表；它反而强调规范很新、差异较大、需要验证。
- 不要把设备品牌名写进组件；不要用调用方传入宽度作为默认方案；不要在宽视口等同宽组件。

# Foundations

用于判断 Web 界面的结构、可读性、视觉克制、动效和无障碍基线。先读 `SKILL.md` 的核心判据；当任务涉及布局、颜色、字体、动效或无障碍时再读本文件。

## Apple 设计原则如何用于取舍

- **Purpose：有意义。** 先问产品真正要帮助用户完成什么，再决定界面元素；不要为“高级感”增加功能。
- **Agency：自己掌控。** 提供清楚状态、自由探索、跳过和恢复错误的路径；不要用强制线性流程困住用户。
- **Responsibility：以用户利益为先。** 权限、数据、自动化和不可逆操作要透明、最小化、可解释。
- **Familiarity：建立在已知之上。** 使用熟悉的导航、控件、图标和反馈；同一行为在全产品保持一致。
- **Flexibility：适配不同情境。** 支持不同输入、设备、语言、字号、对比度、动效偏好和网络条件。
- **Simplicity：清楚直接。** 精简不等于最少；保留完成任务所需的信息和动作，移除没有价值的元素。
- **Craft：关注每个细节。** 文字、焦点、空态、边界、性能、响应和错误恢复都要达到同一质量线。
- **Delight：让人感到自然。** 愉悦来自顺畅、可信和有分寸的细节，不来自装饰或动画本身。

## Layout

### HIG 思想

- 按重要性组织阅读顺序；在 LTR/RTL 与不同语言下保持自然方向。
- 用对齐表达关系，用缩进表达从属，用间距和分隔表达分组。
- 通过 progressive disclosure 控制初始信息量；高级或低频内容可以延后，主任务不能被藏起来。
- 控件与内容要可区分；内容应优先，控件不要遮住或抢夺内容。
- 布局要适应窗口、方向、尺寸和输入方式；功能可以按空间减少可见范围，但不能因为尺寸变化而改变产品的基本含义。
- 重要内容应避开会被硬件、浏览器或浮动 UI 遮挡的区域。
- 视觉密度服务任务：数据密集型界面优先可扫描性，媒体界面可以优先沉浸感。

### Web 等效做法

- 使用 CSS Grid、Flexbox、logical properties、`minmax()`、`clamp()`、container queries 和 `@media` 表达适配，不照搬 Apple 的 size classes 或 point 数值。
- 主内容设定可读行宽；长表格和代码区允许内部滚动，不让整页产生横向滚动。
- 用 `env(safe-area-inset-*)` 和 `viewport-fit=cover` 处理移动端圆角、刘海、浏览器工具栏带来的安全区；桌面 Web 主要考虑浏览器 chrome 与固定 header。
- 固定 header、drawer、bottom sheet 要为内容和焦点留出空间；不要只做视觉覆盖。
- 重要内容在窄屏下应重排或改为堆叠，而不是缩小到不可读或依赖 hover。

### Review 问题

- 第一眼看到的是用户目标，还是产品自己的导航和装饰？
- 主任务在最小可用宽度下是否仍能完成？
- 对齐、间距和分组是否表达了真实关系，而不只是装饰节奏？
- 是否有内容被固定元素、软键盘、浏览器 chrome 或移动安全区遮住？

## Color

### HIG 思想

- 颜色要有稳定语义；同一颜色不应同时表示品牌、可点击、成功和普通装饰。
- 颜色不能是唯一的信息通道；状态、选中、错误、图表系列都需要文字、形状、图案或结构辅助。
- 颜色要在浅色、深色和增强对比环境中可读；自定义颜色应提供适应变体。
- 强调色应服务主要动作、选择或重要状态，不应铺满多个控件。
- 背景层级可以帮助组织内容，但层级越多不等于越清楚。
- HIG 中的 exact system colors、Liquid Glass 和 Apple 平台外观不是 Web 标准；Web 应建立自己的语义 token。

### Web 等效做法

- 建立语义 token：`--text-primary`、`--text-secondary`、`--surface`、`--surface-raised`、`--border`、`--accent`、`--danger`、`--success`、`--warning`。
- 使用 `prefers-color-scheme` 提供浅色/深色；需要产品级手动主题时，默认跟随系统并持久化用户选择。
- 使用 `prefers-contrast`、`forced-colors` 和实际测试检查高对比模式；不要假设浏览器会替你修正所有颜色。
- WCAG 基线：正文通常至少 4.5:1；大号文字至少 3:1；控件边界、焦点和关键图形至少约 3:1。不要只依赖 Apple 文档中的某个固定比值，按 Web 内容类型测试。
- 使用 CSS 变量集中管理颜色，避免组件内散落硬编码色值；用 `currentColor` 让图标随文字语义（而非误随背景）变化。
- 透明、模糊和渐变需要有不透明 fallback；不要把 `backdrop-filter` 当作信息层级本身。

### Review 问题

- 颜色能否被替换为文字后仍完整表达状态？
- 灰度/色盲模拟下，选中、错误、成功和图表系列是否仍可区分？
- 强调色是否只出现在真正值得强调的地方？
- 深色模式下图片、阴影、边框、disable 态和 placeholder 是否仍清楚？

## Typography

### HIG 思想

- 字号、字重、行距和颜色共同建立层级；阅读内容是主任务时，可读性优先于风格。
- 保持少量字体家族和稳定层级；细字重在低对比或小字号下风险很高。
- 不要因为用户放大字体就让布局溢出、重叠或截断关键信息。
- 应优先保留主要内容的可读性；辅助信息可以更早折叠，但核心内容不应因为放大而消失。
- Apple 的 San Francisco、Dynamic Type、point sizes 和平台字号表不直接适用于 Web；Web 需要浏览器缩放、适应性和 WCAG 约束。

### Web 等效做法

- 用 `rem` 表达正文和控件字号，让浏览器字号和 200% 缩放真正生效；标题可用 `clamp()`，但不要用只看视口宽度的方式锁死可访问缩放。
- 正文行高通常 1.4–1.7；长文行宽通常约 45–75ch。代码、表格和元数据按任务调整，不要机械套用。
- 建立少量稳定层级，如 display、h1–h4、body、label、caption、code；避免同时用字号、字重、颜色和全大写制造过多层级。
- 长文本用 `overflow-wrap`、多行截断策略或详情展开；关键标题和操作名称不要只在 hover 时出现。
- 中英混排、数字、货币、代码和 CJK 标点都要在真实内容下测试，不使用理想化的 Lorem Ipsum。

### Review 问题

- 页面上是否存在为了“轻盈”而导致低对比、小字号或细字重的正文？
- 200% 缩放后，主任务和关键说明是否仍可读、可操作？
- 用户能否从字号/字重/颜色判断信息层级，而不靠猜测？
- 最长中文标题、英文单词、数字和代码是否破坏布局？

## Motion

### HIG 思想

- 动效用于解释状态变化、空间关系、直接操控和反馈，不能只是装饰。
- 动效不能成为传达关键信息的唯一方式。
- 与应用手势一致的转场更容易理解；重复或高频操作不应持续要求用户等待动画。
- 动效应尽量短、精确，并允许用户取消或继续操作。
- 尊重减少动态、辅助功能和低性能设备的偏好。

### Web 等效做法

- 小型即时反馈可用约 80–180ms 的透明度/轻微位移；较大层级变化通常控制在约 200–400ms，具体按距离、频率和设备测试。
- 优先动画 `transform` 和 `opacity`，避免每帧触发布局和绘制；不要在频繁滚动或输入时做大面积模糊、阴影和滤镜动画。
- 使用 `prefers-reduced-motion: reduce` 降低或关闭非必要位移、缩放、视差和自动播放；保留必要的状态文字反馈。
- 动画应可跳过、可中断、不阻断操作；不要在导航、表单提交、搜索输入等高频动作上强制播放。
- 避免闪烁、快速重复和强烈缩放；不要把 loading 动画当成唯一状态表达。

### Review 问题

- 删除所有装饰性动画后，用户是否仍能理解发生了什么？
- 动画是否让用户等待或无法操作？
- 减少动态模式下，状态、焦点和成功/失败是否仍然可见？

## Accessibility

### HIG 思想

- 无障碍不是附加功能：信息应可用多种方式感知，交互应适配不同能力和输入方式。
- 支持字号放大、颜色对比、非颜色提示、字幕/转录、键盘、辅助技术和输入的替代路径。
- 避免只有自动消失的提示、不可延长的限时、自动播放和不可暂停的媒体。
- 避免让用户必须记忆复杂手势或长流程；提供清楚、熟悉的恢复路径。
- 复杂图表和视觉数据需要结构说明、摘要或等价数据，不应只提供悬停 tooltip。

### Web 等效做法

- 优先语义 HTML：`button`、`a`、`input`、`form`、`table`、`nav`、`dialog`；只有缺失语义时才补 ARIA。
- 保证完整键盘路径、可见 focus、合理 tab order、`Esc` 关闭和关闭后的焦点返回。
- 动态消息使用合适的 live region；状态更新不要每次输入都播报。忙碌状态考虑 `aria-busy`。
- 让图标、图表和自定义控件有可访问名称、状态与角色；不要只给 SVG 加装饰性 `title`。
- 支持浏览器缩放、系统字体设置、减少动态、增强对比、强制颜色和不同输入方式。
- 移动触控目标尽量至少 44×44 CSS px；WCAG 2.2 的 24×24 是最低基线，不是理想目标。
- 媒体不要自动播放声音；需要时提供字幕、转录和控制。

### Review 问题

- 不用鼠标是否可完成主任务？焦点是否总能看见？
- 屏幕阅读器是否会重复播报、跳过关键状态或读不到自定义控件？
- 颜色、动效、hover、拖放、声音是否有非唯一替代？
- 缩放、高对比、减少动态和系统字体变化是否会破坏任务？

## 相关 HIG 来源

- 设计原则：https://developer.apple.com/design/human-interface-guidelines/design-principles
- Layout：https://developer.apple.com/design/human-interface-guidelines/layout
- Color：https://developer.apple.com/design/human-interface-guidelines/color
- Typography：https://developer.apple.com/design/human-interface-guidelines/typography
- Motion：https://developer.apple.com/design/human-interface-guidelines/motion
- Accessibility：https://developer.apple.com/design/human-interface-guidelines/accessibility
- Dark Mode：https://developer.apple.com/design/human-interface-guidelines/dark-mode
- Inclusion：https://developer.apple.com/design/human-interface-guidelines/inclusion
- Writing：https://developer.apple.com/design/human-interface-guidelines/writing
- Materials：https://developer.apple.com/design/human-interface-guidelines/materials

# Web Implementation Mapping

Apple HIG 是平台设计指南，不是 Web 技术规范。把 HIG 的判断带过来，把 Apple 的 API、尺寸、外观和系统行为留在 Apple 平台上。Web 的基线来自语义 HTML、浏览器行为、WCAG、渐进增强和真实设备测试。

## 映射总表

| Apple 概念 | Web 等效 | 必须保留 | 不要照搬 |
|---|---|---|---|
| safe area | `env(safe-area-inset-*)`、`viewport-fit=cover`、动态 viewport 单位 | 内容与关键操作不被刘海、圆角、软键盘、浏览器 chrome 遮挡 | 固定按某款设备的 point 数值排布 |
| size class / window resizing | media queries、container queries、Grid/Flex、ResizeObserver | 不同宽度下功能与主任务仍可完成；优先内容而非设备型号 | 把 iPhone/iPad/macOS 尺寸类直接翻译成断点 |
| system colors / appearance | 语义 CSS variables、`prefers-color-scheme`、`prefers-contrast`、`forced-colors` | 语义一致、浅深色可读、颜色不是唯一信号 | UIKit/AppKit 颜色名称和 Apple 精确色值 |
| Liquid Glass / materials | 半透明表面、backdrop blur、渐变与边框的克制组合 | 只用于有明确层级或交互意义的表面；有可读 fallback | 所有卡片/工具栏都做玻璃；把模糊当层级本身 |
| SF Symbols | 一套一致的 SVG 图标库或产品图标系统 | 熟悉含义、可缩放、可访问名称、与文字一致 | 复制 Apple 图标资源，或让图标成为无语义唯一入口 |
| Dynamic Type | `rem`、浏览器缩放、用户字体设置、响应式排版 | 200% 缩放可用，关键文本不丢失，布局能重排 | Apple point-size 表、强制锁定 viewport 缩放 |
| haptics / audio feedback | Vibration API、Web Audio、可选音效 | 只作补充反馈，不承载唯一关键信息，可关闭 | 把震动/声音当作所有浏览器都可靠支持的能力 |
| touch / pointer / keyboard gestures | Pointer Events、键盘事件、可见焦点、普通点击/拖拽 | 同一主任务支持多种输入，Focus 可追踪 | 三指手势、摇一摇、Force Touch、悬停边缘等平台手势 |
| toolbar | `<header>` / command bar / toolbar region | 高频动作、分组、主操作和 overflow 优先级 | macOS 窗口按钮、iOS 导航栏、系统自动 overflow 行为 |
| tab bar | 顶部/底部导航、路由导航 | 顶级区域清楚、当前项明确、移动端可达 | 伪装成原生 tab bar，或让导航和内容层级混淆 |
| sidebar | `<aside>` + `<nav>`、rail、drawer | 顶级层级、折叠后上下文、选中态、窄屏替代 | 将临时工具面板叫 sidebar；用固定宽度硬挤压内容 |
| popover | Popover API、`<dialog>`、anchored layer、bottom sheet | 锚定关系、临时性、单层、`Esc`、焦点返回 | 桌面样式强行套小屏；弹层套弹层；把警告放 popover |
| sheet / modal | `<dialog>`、native modal、full-screen layer | 任务边界、焦点闭环、明确退出、数据丢失处理 | 把完整导航/深层任务塞进 modal；同时打开多个主模态 |
| menus | button + menu/dropdown 或普通导航链接 | 可预测的标签、状态、键盘路径、分组、危险动作隔离 | OS menu bar、无限子菜单、把站点导航误用为 ARIA menu |
| lists / tables | `<ul>`、`<ol>`、`<table>`、grid/list layout | 行语义、列头、排序/选择状态、长文本策略 | 用 div + CSS 假表格而不补语义；只靠 hover 显示关键字段 |
| charts | SVG / Canvas / chart library + accessible fallback | 标题、轴、单位、摘要、数据表、键盘/屏幕阅读器路径 | Swift Charts API、只靠颜色、把 tooltip 当唯一数据入口 |
| undo / redo | 应用历史栈 + Cmd/Ctrl+Z、菜单和历史面板 | 可预测的撤销目标、多次撤销、结果可见、批量还原 | 把浏览器 Back 当 Undo；只提供一个会自动消失的 toast |
| drag and drop | HTML5 DnD、Pointer Events、DataTransfer | 移动/复制规则、drop 状态、键盘替代、撤销 | 让拖放成为唯一操作；依赖系统跨应用拖放 |
| search | site search、筛选、URL query、`role="search"` | 主入口、范围、无结果、隐私、刷新/分享/Back 可恢复 | 复制 Spotlight 的系统级搜索；拦截浏览器 Find |
| onboarding | 上下文提示、示例数据、空态帮助、帮助中心 | 可选、可跳过、可重新打开、记住状态、先让用户成功 | 首屏多页 tour、强制权限/购买/评分、每次重启重复 |
| app launch / installation | 首次渲染、代码分割、Service Worker、PWA | 尽快显示可用内容；离线/恢复尽量可解释 | 原生 splash screen、安装后首启流程、App Store 许可屏 |
| privacy permission | 浏览器 Permissions API、just-in-time 请求 | 在用户需要具体功能时解释请求原因，拒绝后可用替代路径 | 把系统隐私弹窗文案和时机当成 Web 标准 |
| systemwide integrations | 浏览器/操作系统能力检测 | 有就增强，没有也要可用 | Spotlight、Siri、Universal Control、Share Sheet、App Intents 等系统集成 |

## 平台细节不适用于 Web

以下内容只能作为设计思想参考，不能作为 Web 需求直接实现：

### 硬件与平台专属

- Dynamic Island、摄像头 housing、iPhone/iPad/Mac 的物理尺寸和安全区数值。
- Apple Pencil、Force Touch、Digital Crown、visionOS 空间布局、tvOS focus 放大、watchOS 旋转表冠。
- 摇一摇、三指滑动、边缘 swipe、系统返回手势、系统级轻扫与多指组合。
- 触觉反馈、空间音频、系统级音效和依赖硬件的传感器行为。

### 系统 UI 与平台约定

- macOS 菜单栏、Dock 菜单、交通灯按钮、原生窗口控制、macOS toolbar 自动 overflow。
- iOS/PadOS navigation bar、tab bar、action sheet、系统 Share Sheet、系统 Alert 的精确外观和转场。
- Siri、Spotlight、Universal Control、系统文件选择器、系统分享目标、App Intents。
- 系统级 Dynamic Type 设置、Apple 平台 point sizes、系统 accent color 和系统 dark mode 控件实现。

### Apple 设计与资产

- SF Symbols 的具体资源、San Francisco/New York 字体的平台许可与系统集成。
- Liquid Glass 的材质定义、系统级 vibrancy/背景扩展效果及其精确动画。
- Apple 颜色空间和 display 适配策略不能替代 Web sRGB、P3 与浏览器 color management 测试。
- Apple 的英文 title-style capitalization 不适用于所有语言；中文、日文等应按本地语言规范处理。

### 应用生命周期与商店

- 安装、后台下载、启动屏、App Store 许可、评分提示、购买流程和原生更新机制。
- 原生 app 的沙盒、文件系统、后台任务、通知权限和应用内购买语义。
- 应用级 appearance setting 的取舍需要重新判断；Web 默认应尊重系统/浏览器偏好，手动主题只在产品确有需要时提供。

### 只能部分映射的交互

- **跨应用拖放**：Web 通常限制在页面/浏览器授权范围内，不能承诺 Finder、其他 App 或系统共享目标都可用。
- **系统级撤销**：Web 可以用键盘快捷键和应用历史，但不能控制其他应用或操作系统级撤销栈。
- **系统搜索与索引**：站点搜索可借鉴单一入口、scope、建议和隐私取舍，但不能假定 Spotlight 式索引或系统结果聚合。
- **窗口与多任务**：浏览器窗口、标签页、PWA 和分屏行为不归产品控制；不要设计依赖某个窗口摆放方式的唯一路径。
- **模态与后退**：浏览器 Back 是导航历史，不是对话框关闭或编辑撤销。使用 `<dialog>` 时也要决定历史记录是否变化。

## Web 专属验证优先级

1. 语义 HTML 与浏览器原生行为是否优先使用？
2. 键盘、屏幕阅读器、缩放和减少动态是否可用？
3. URL、Back/Forward、刷新、分享和复制粘贴是否能保留上下文？
4. 320 CSS px、200% zoom、长内容、离线/慢网和低性能设备是否可完成主任务？
5. 颜色、模糊、阴影、动画和固定层是否在有 fallback 的情况下增强体验，而不是成为必要条件？

## 相关 HIG 来源

- HIG 根页：https://developer.apple.com/design/human-interface-guidelines/
- Foundations：https://developer.apple.com/design/human-interface-guidelines/foundations
- Patterns：https://developer.apple.com/design/human-interface-guidelines/patterns
- Components：https://developer.apple.com/design/human-interface-guidelines/components
- Accessibility：https://developer.apple.com/design/human-interface-guidelines/accessibility
- Materials：https://developer.apple.com/design/human-interface-guidelines/materials

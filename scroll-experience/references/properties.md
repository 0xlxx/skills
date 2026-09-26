# 滚动属性参考

按“容器属性”和“项目属性”区分。先确定滚动轴和作用对象，再选值。

## 容器属性

### `overflow` / `overflow-x` / `overflow-y`

滚动容器需要同时具备：受上下文的尺寸约束、内容溢出、对应轴的 `overflow` 不是 `visible`。

- `auto`：内容溢出时才显示滚动条。普通页面、面板和列表的默认选择。
- `scroll`：无论内容是否溢出都占据滚动沟槽，适合必须保持固定滚动条位置的界面。
- `hidden`：裁剪内容并保留滚动容器语义；用户通常不能直接滚动。只有确实需要程序化滚动或特殊滚动控制时使用。
- `clip`：裁剪但不创建滚动容器。目标是纯视觉裁剪时优先于 `hidden`。
- `overflow-inline` / `overflow-block`：随书写模式映射到水平或垂直轴，适合多语言和竖排内容。

内容可达性是底线。一个看起来更整洁的 `hidden` 不能替代合理的布局和滚动路径。

```css
.panel {
  overflow-y: auto;
}
```

### `scrollbar-gutter`

为经典滚动条预留空间，避免内容从“无滚动条”切换到“有滚动条”时发生回流。

- `stable`：始终保留沟槽空间，即使内容暂时没有溢出。
- `stable both-edges`：两侧对称预留，适合居中布局。
- 根元素上的值作用于视窗；`body` 不会向视窗传播这个属性。
- 覆盖式滚动条通常不占据沟槽，不要为了统一外观而盲目使用。
- 沟槽只存在于**经典型滚动条**下：macOS 默认是覆盖式滚动条，写 `stable` 也看不到预留效果。验证前先把系统「显示滚动条」设为「始终」，否则很容易把“这条 CSS 没生效”误判成 bug。

```css
.panel {
  overflow-y: auto;
  scrollbar-gutter: stable;
}
```

### `overscroll-behavior` / `-x` / `-y`

控制滚动到边界后是否发生滚动链和过度滚动效果。

- `auto`：默认行为，边界滚动可以传给父滚动器。
- `contain`：阻止滚动链，但保留当前滚动器自身的边界反馈和浏览器行为。
- `none`：同时阻止滚动链和当前滚动器上的原生过度滚动效果。
- 在根滚动器上设 `none` 可以阻止下拉刷新等根级效果；在弹层或嵌套列表上通常先选 `contain`。

```css
.modal__body {
  overflow-y: auto;
  overscroll-behavior-y: contain;
}
```

### `scroll-behavior`

控制由导航、CSSOM 或脚本请求产生的滚动行为，不会把用户直接拖拽或滚轮变成平滑滚动。

- `auto`：立即滚动。
- `smooth`：使用浏览器约定的时长和缓动。
- 作用在根元素时会影响视窗。
- 放在具体的滚动容器上，能避免影响无关脚本和嵌套区域。

```css
@media (prefers-reduced-motion: no-preference) {
  .scroll-container {
    scroll-behavior: smooth;
  }
}
```

在 Chrome 等项目实测中，`scrollTop = value` 也可能受它影响。已有同步滚动逻辑时，先验证赋值是否变成异步动画。

### `scroll-snap-type`

定义滚动容器的捕捉轴和严格程度。

轴值：

- `x` / `y`：按物理方向捕捉。
- `block` / `inline`：按书写模式逻辑方向捕捉。
- `both`：两个轴独立捕捉。

严格程度：

- `mandatory`：滚动结束后必须停在捕捉点。适合全屏页面、固定尺寸轮播、步骤面板。
- `proximity`：接近捕捉点时才吸附。适合高度变化的信息流、普通列表和可自由停靠的容器。

内容单元高度不一致、超过视口、动态加载或会被添加删除时，默认选择 `proximity`。

```css
.feed {
  overflow-y: auto;
  scroll-snap-type: y proximity;
}
```

### `scroll-padding`

定义滚动视口中的“最佳浏览区域”，可以理解为容器端的捕捉内距。

- `scroll-padding-block` / `scroll-padding-inline`：推荐使用逻辑属性。
- `scroll-padding-top` / `scroll-padding-left` 等：需要与固定头部或特定物理方向绑定时使用。
- 容器有 `padding` 且使用捕捉时，通常需要同步设置 `scroll-padding`，否则捕捉点会贴住 padding-box 边缘。

```css
.scroll-container {
  scroll-snap-type: y proximity;
  scroll-padding-block: var(--sticky-header-height, 1rem);
}
```

## 项目属性

### `scroll-snap-align`

定义项目哪一部分参与捕捉。

- `start`：项目起点对齐滚动容器的捕捉区域起点。
- `center`：项目中心对齐滚动容器中心。
- `end`：项目终点对齐滚动容器捕捉区域终点。
- `none`：该项目不参与捕捉。
- 写两个值时分别对应块轴和内联轴；写一个值时两轴使用同一个值。

```css
.feed__item {
  scroll-snap-align: start;
}
```

### `scroll-margin`

定义项目相对捕捉点的外部偏移，适合给单个项目留空间。

```css
.feed__item--with-badge {
  scroll-margin-block-start: var(--badge-space);
}
```

### `scroll-snap-stop`

控制快速滚动时是否允许越过捕捉点。

- `normal`：默认行为，可以跳过多个捕捉点。
- `always`：尽量在每个捕捉点停一下，适合必须逐项查看的重要内容。
- 它作用在项目上；大量使用时会让快速滚动变得停滞，先确认用户确实需要逐项停靠。

```css
.onboarding-step {
  scroll-snap-align: start;
  scroll-snap-stop: always;
}
```

## 键盘与脚本滚动

浏览器没有为“选中下一项”提供统一的 CSS 属性。用最小 JS 配合 CSS：

```js
function revealItem(item) {
  const container = item.closest('.scroll-container');
  container.style.scrollSnapType = 'none';
  item.scrollIntoView({ block: 'nearest', inline: 'nearest' });
}

function restoreSnap(container) {
  container.style.removeProperty('scroll-snap-type');
}
```

只在项目未完整可见时滚动。连续按键时不要每次都把项目居中；`nearest` 会尽量保留已有位置。长按产生的高频 repeat 要合并到一帧只滚一次，并使用 `behavior: 'instant'` 跟随最新选中项；单次按键可以让 `behavior: 'auto'` 继承容器的平滑设置。用户滚轮或触控后调用 `restoreSnap`，让捕捉重新接管。

## 触控与兼容

- `touch-action` 用来声明浏览器可以处理哪些触控手势。水平轮播通常只需要保留横向平移；设置过窄会影响嵌套纵向滚动。
- `-webkit-overflow-scrolling: touch` 是旧 iOS 时代的兼容手段。只有目标环境仍需要它时才加入，不要把它当作现代滚动性能修复。
- 在 `body` 上使用强制捕捉可能触发旧版 iOS 的滚动问题。优先把捕捉放在专门的滚动容器上。
- iOS 上把模态框锁住时，只写 `overflow: hidden` 仍会滚动穿透。老办法是给被锁的元素同时加 `touch-action: none`、`-webkit-overflow-scrolling: none`、`overflow: hidden`、`overscroll-behavior: none`（iOS 13+ 有效）。现代目标只需要 `overscroll-behavior`，这条组合拳留给真机复现出穿透的场景。

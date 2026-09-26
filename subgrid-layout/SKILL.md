---
name: subgrid-layout
description: CSS 子网格（Subgrid）：当多个卡片、菜单栏目、Branding 区域或图片墙需要共享列/行轨道，处理跨项对齐、父子网格继承与 fallback 时使用。
---

# Subgrid Layout

<core-principle>
Subgrid 的本质不是“自动对齐”，而是让子网格**继承父网格的轨道**。父网格拥有轨道的数量、尺寸和间距，子网格只决定内容如何落进这些轨道。先找到多条兄弟项必须共享的同一条线，再决定用列子网格还是行子网格；没有共享轴时，普通 Grid 或 Flex 更简单。
</core-principle>

## 判断

用一个问题决定是否使用 Subgrid：

**多个兄弟项是否必须共享同一组轨道边界？**

- **是，且边界沿列方向重复**：父网格定义列，子项跨列并使用 `grid-template-columns: subgrid`。
- **是，且兄弟项确实处在同一组父级行中**：父网格定义行，子项跨行并使用 `grid-template-rows: subgrid`。
- **没有共享边界**：保持独立 Grid / Flex，不要为了“使用 Subgrid”而使用它。

最重要的区分是：

- **横向并排的卡片**可以共享行轨道。标题一行、正文一行、底栏一行，所有卡片跨同一组父级行，因此同一区域可以跨卡片对齐。
- **纵向堆叠的列表**每张卡处在不同的父级行。给每张卡设置 `grid-template-rows: subgrid` 不会让不同卡片的标题互相对齐；它们只是各自继承自己所在的那组行。
- 纵向列表仍可使用**列子网格**：列表拥有“正文列 + 操作/封面列”，每张卡跨两列并继承列轨道，从而统一左右边界。

## 步骤

### 1. 定共享轴

先写出要对齐的重复边界，例如：

- 卡片组的标题基线、正文顶部、底栏顶部；
- 纵向列表的正文右边界、封面左边界、操作区右边界；
- 页脚各栏的标题行、菜单列表行；
- Branding 区域中各模块跨过的父级列。

完成标志：能明确说出“谁定义轨道、哪些兄弟跨过它们、继承列还是行”。

分支：

- **列重复** → 父网格定义列；子项 `grid-column: 1 / -1`（或实际跨度），然后 `grid-template-columns: subgrid`。
- **行重复且兄弟共享父级行** → 父网格定义行；子项 `grid-row: span N`（或具体跨度），然后 `grid-template-rows: subgrid`。
- **纵向列表的跨项行对齐** → 放弃行子网格，改做普通行布局；若要统一横向边界，只对列使用子网格。

### 2. 让父网格拥有轨道

父网格负责真正的尺寸约束：

```css
.cards {
  display: grid;
  grid-template-columns:
    minmax(7rem, 12rem)
    repeat(3, max-content)
    minmax(0, 1fr);
  column-gap: 1rem;
}
```

轨道可以来自 `grid-template-*` 的显式定义，也可以来自 `grid-auto-*` 的隐式轨道；关键是父网格能稳定决定尺寸。

完成标志：父网格的轨道尺寸和间距能独立复现设计意图；子项不需要靠各自的 magic number 补齐。

### 3. 让子项跨越并继承轨道

子网格必须先成为父网格中的项目，并覆盖它要继承的轨道：

```css
.card {
  grid-column: 1 / -1;
  display: grid;
  grid-template-columns: subgrid;
}
```

行轨道同理：

```css
.card {
  grid-row: span 3;
  display: grid;
  grid-template-rows: subgrid;
}
```

用 `display: grid`，不要依赖不透明的 `display: inherit`。完成标志：子项明确跨过父网格轨道，并且声明的 `subgrid` 轴与共享轴一致。

### 4. 放置子网格内部内容

Subgrid 只提供轨道。内部元素仍需用网格线或命名区域落入轨道：

```css
.card__title {
  grid-column: 2 / -1;
}

.card__media {
  grid-row: 1 / -1;
}
```

也可以用局部命名区域组织内容，但轨道仍来自父网格：

```css
.card {
  grid-template-areas: "media title" "media description";
}
```

完成标志：兄弟项在目标轴上共享边界；内容增加、减少或换行不会把该边界推走。

### 5. 处理间距

- 在 `subgrid` 轴上，间距属于父网格的 gutter；子网格上的同名 gap 不会重新定义这条共享轴。
- 在非 `subgrid` 轴上，子网格可以正常使用自己的 `row-gap` / `column-gap`。
- 需要局部留白时，用子项自身的 `padding`、`margin` 或 `grid-area`，不要把共享轨道重新切碎。

完成标志：共享轴的间距从父网格一处控制；局部间距不会改变兄弟项的基准线。

### 6. 提供回退并验收

Subgrid 支持度已经覆盖现代 Chromium、Safari 和 Firefox，但组件库仍应提供降级：

```css
.card {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 5.5rem;
}

@supports (grid-template-columns: subgrid) {
  .card {
    grid-column: 1 / -1;
    grid-template-columns: subgrid;
  }
}
```

完成标志：

- 不支持 Subgrid 时仍能布局，不出现溢出或零尺寸轨道；
- 支持时，父网格轨道真正被继承；
- 通过真实几何断言验证跨项边界，而不是只检查 CSS 声明。

## 常用模式

按当前布局分支查阅 [`references/patterns.md`](references/patterns.md)：

- **横向卡片组**：共享行，让标题、正文、底栏跨卡片对齐。
- **纵向列表**：共享列，不共享行；每张卡的高度仍由本地轨道控制。
- **页脚栏目**：共享行，让各栏标题和菜单项逐行对齐。
- **Branding 区域**：跨父网格多列，内部仍落在父列线上。
- **图片墙**：局部拼图继承父列，内部自由跨列。
- **语义结构受限**：用子网格替代额外 wrapper，保留 `figure`、`article` 等语义。

## 风险

- **误把纵向列表当作共享行**：每张卡片处在不同父级行，行子网格不能实现跨卡片标题对齐。
- **父网格没有稳定的轨道尺寸规则**：`grid-template-*` 与 `grid-auto-*` 都没有定义时，子网格没有可继承的明确节奏。
- **只写 `subgrid`，不让子项跨轨道**：子项会只继承自己覆盖的那一小段轨道。
- **在 Subgrid 轴上重新定义 gap**：共享间距应由父网格拥有；局部间距应下沉到子项。
- **把嵌套网格当子网格**：嵌套网格拥有自己的轨道；Subgrid 继承父轨道。两者不能混用概念。
- **过度使用 Subgrid**：只有一个子项、没有重复对齐，或一维 Flex 足够时，更简单的布局更可维护。

## 验收清单

- [ ] 父网格通过 `grid-template-*` 或 `grid-auto-*` 稳定决定轨道尺寸与间距。
- [ ] 每个子网格都跨过它要继承的完整轨道范围。
- [ ] 列子网格与行子网格的选择符合兄弟项实际所在的父级网格位置。
- [ ] 内容长度变化、图片比例变化、缺失封面或动态增删后，共享边界仍不移动。
- [ ] Subgrid 轴上的 gap 来自父网格；局部间距没有破坏共享轨道。
- [ ] `@supports` 回退路径在真实浏览器中可用。
- [ ] 用几何断言验证边界对齐；只看到 `subgrid` 声明不算通过。

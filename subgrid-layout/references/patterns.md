# Subgrid 常用模式

这些配方按布局分支查阅。共同前提不变：父网格拥有轨道，子网格跨过并继承它们。

## 横向卡片组：共享行

适用：卡片组中每张卡片的标题、正文、底栏需要横向对齐。

```css
.cards {
  display: grid;
  grid-template-rows: min-content auto auto;
  gap: 1rem;
}

.card {
  grid-row: span 3;
  display: grid;
  grid-template-rows: subgrid;
}

.card__title { grid-row: 1; }
.card__body  { grid-row: 2; }
.card__meta  { grid-row: 3; }
```

## 纵向列表：共享列，不共享行

适用：列表项纵向堆叠，但正文列、封面列、操作列必须对齐。

```css
.list {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 5.5rem;
  column-gap: 0.75rem;
}

.row {
  grid-column: 1 / -1;
  display: grid;
  grid-template-columns: subgrid;
  grid-template-areas:
    "meta cover"
    "body cover";
}
```

`meta` 只占正文列；`body` 在无封面时可以跨两列；`cover` 在第二列内对齐。行高仍由每张卡片自己的 `grid-template-rows` 控制。

## 页脚栏目：共享行

适用：多个菜单栏目并排，标题与第一项、第二项菜单需要各自对齐。

```css
.footer {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(min(100% - 2rem, 20rem), 1fr));
  row-gap: 1rem;
}

.footer__column {
  grid-row: span 2;
  display: grid;
  grid-template-rows: subgrid;
}
```

## Branding：跨父级列

适用：特色区跨父网格的多列，内部内容仍要落在父网格的列线上。

```css
.branding {
  display: grid;
  grid-template-columns: repeat(5, minmax(0, 1fr));
}

.featured {
  grid-column: 2 / span 3;
  display: grid;
  grid-template-columns: subgrid;
}
```

## 图片墙：局部拼图继承父列

适用：左侧内容与右侧图片墙共用一套列边界，右侧内部再做不规则拼图。

```css
.gallery {
  display: grid;
  grid-template-columns: repeat(6, minmax(0, 1fr));
  gap: 2rem;
}

.gallery__content {
  grid-column: 1 / span 3;
  place-self: center;
}

.gallery__photos {
  grid-column: 4 / span 3;
  display: grid;
  grid-template-columns: subgrid;
  grid-template-rows: minmax(auto, 180px);
  gap: 1rem;
  grid-auto-flow: dense;
}

.gallery__photos img:nth-child(1) {
  grid-row: 1;
  grid-column: 1 / span 2;
}
```

右侧拼图可以自由跨父网格列，但不会创造一套新的列边界。

## 语义结构受限：用子网格替代额外 wrapper

适用：为了屏幕阅读器必须保留 `figure > img + figcaption`、`article > title + body` 等语义结构，但视觉上又需要跨行跨列对齐。

```css
.card {
  display: grid;
  grid-template-columns: repeat(6, 1fr);
  grid-template-rows: repeat(3, min-content);
  gap: 1rem 1.25rem;
}

.card figure {
  grid-column: 1 / span 5;
  grid-row: 2 / span 2;
  display: grid;
  grid-template-columns: subgrid;
  grid-template-rows: subgrid;
}

.card figure img {
  grid-column: 1 / span 3;
  grid-row: 1 / span 2;
}

.card figcaption {
  grid-column: 4 / span 2;
  grid-row: 2;
}
```

子网格让已有语义元素直接参与父布局，不必为了摆放再包一层无意义容器。

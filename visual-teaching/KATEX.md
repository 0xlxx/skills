# KaTeX Formula Rendering

用 `data-latex` 属性避让 HTML 转义，不写 `$...$` 分隔符：

```html
<span class="math" data-latex="\mathrm{sig}_{arch} \mathbin{\&} \mathrm{sig}_{query} = \mathrm{sig}_{query}"></span>
```

页面底部统一渲染：

```html
<script defer src="https://cdn.jsdelivr.net/npm/katex@0.17.0/dist/katex.min.js"></script>
<script>
document.addEventListener('DOMContentLoaded', () => {
  document.querySelectorAll('.math').forEach(el => {
    katex.render(el.dataset.latex, el, { throwOnError: false });
  });
});
</script>
```

约束：
- 不写 `$...$` 分隔符（用 `data-latex`）
- 公式放 HTML 段落外，用 `<span class="math">`

# KaTeX 公式渲染

用 `data-latex` 属性代替 `$...$` 分隔符——避让 HTML 特殊字符（`&`、`<`、`>`、`\`）被浏览器转义。

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

公式用 `<span class="math">` 独立成行，不嵌在正文段落内——教学材料中公式应独立展示，被段落折行打断后难以阅读。

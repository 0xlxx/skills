# Generation Info

- **Source（原文，非 git 仓库，按路径溯源）:**
  - `/Users/bjorn/Documents/book/设计与前端/掘金小册/现代 Web 布局/24. 内在 Web 设计.md`（74 KB）
  - `/Users/bjorn/Documents/book/设计与前端/掘金小册/现代 Web 布局/27. 下一代响应式 Web 设计：组件驱动式 Web 设计.md`（82 KB）
  - `/Users/bjorn/Documents/book/设计与前端/掘金小册/现代 Web 布局/28. 下一代响应式 Web 设计：容器查询.md`（111 KB）
- **Generated:** 2026-10-02
- **方式:** 三篇原文由三个子代理分别精读（各自独占上下文，不进入主 agent 的 context window），各产出 `reference/` 下一份精炼参考；`SKILL.md` 由主 agent 组装（决策层 + 上下文指针 + 验收线）。
- **Files:**
  - `SKILL.md` —— 心智模型、选型决策表、改造流程与验收线、三个参考文件的指针
  - `reference/intrinsic-sizing.md` —— 源自第 24 章（内在尺寸 / Flex / Grid / 8 步改造）
  - `reference/component-driven.md` —— 源自第 27 章（组件驱动式响应式分类法与边界）
  - `reference/container-queries.md` —— 源自第 28 章（容器查询语法、排查清单、回退）
- **同步约定:** 原文目录不是 git 仓库，无法按 SHA 差分；原文更新时按文件名与大小对比（上列 KB 为数），需人工重新精读对应章节。
- **已知缺口（原文未覆盖，参考文件内已标注）:** `container-type` 的百分比副作用与元素限制、精确的 `@supports` 回退写法、完整浏览器兼容矩阵、跨语言断点选择的具体单位。

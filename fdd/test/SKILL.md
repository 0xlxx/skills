---
name: fdd-test
description: 根据需求规约编写测试，与 fdd-dev 可并行执行。当用户说"给这个功能写测试"、PM完成规约后需要编写测试验证时使用。
---

# FDD Test — 测试验证

## 职责

根据规约写测试。独立于 Dev，可并行执行。

**流程**：

```
PM 出规约
    ├── Dev 实现 ──────────────┐
    └── Test ↻ Review ────────┘  → Dev 跑测试 → 修复循环 → 全绿

Test 写完 → Review 审查 → 缺覆盖 → Test 补充 → Review 再审 → ✅ → Dev 接手
```

## 文件入口（强制）

**第一步**：读 `plans/ACTIVE.md`，确定当前活跃任务及其规约文件路径。绝不可猜测文件名。

## 输入

- `plans/ACTIVE.md` → 找到当前任务 → 读规约文件
- PM 的类型定义文件（从 ACTIVE.md 确定路径）
- 项目测试框架和目录结构

Test 写测试时 Dev 的实现可能还不存在——根据规约和类型定义即可写出测试。

## 工作流

### 1. 定位任务

```
读 plans/ACTIVE.md → 确认任务 PX → 读规约文件 → 读类型定义
```

如果 ACTIVE.md 不存在或没有活跃任务，停止并要求用户先启动 PM。

### 2. 编写测试

```ts
// tests/pX.test.ts
import type { XxxOptions, XxxResult } from '../plans/pX-types';

describe('P1: 功能名称', () => {
  it('T01: 基础场景', () => { ... });
  it('T02: 不变量 I1 — ...', () => { ... });
  it('T03: 空输入', () => { ... });
  it('T04: 单个元素', () => { ... });
  it('T05: 极端值', () => { ... });
});
```

如果实现尚不存在，使用 `@ts-expect-error` + 类型标注保证编译通过。

### 3. 覆盖自查

- 每个验收标准一个测试
- 每个边界情况一个测试
- 不变量至少一个测试

### 4. 提交 Review

测试初版完成后，更新 `plans/ACTIVE.md` 状态为"待 Review"。告知用户启动 fdd-review agent 审查。

### 5. 补充循环

Review 输出 `plans/pX-test-review.md` 后：
- 读 review 报告中的 Missing 项
- 逐条补充测试
- 补充完成后更新 ACTIVE.md，再次提交 Review
- 循环直到 Review 判 ✅

## 不负责运行测试

**测试由 Dev 运行，不是 Test。** Test 只编写测试文件，确保能编译。Dev 在实现完成后运行并修复循环。

如果 Dev 反馈测试有问题，Test 根据规约修正测试。

## 禁止

- 不接触上游参考源码
- 测试不依赖未导出的内部细节
- 实现有 bug 时不去改实现——那是 Dev 的事
- 不碰 `plans/` 下非当前任务的遗留文件

## 交接

Review 判决 ✅ 后，更新 `plans/ACTIVE.md` 状态为"测试就绪"。告知用户测试已通过审查，Dev 可以跑 `pnpm build && pnpm test`。

---
name: fdd-pm
description: 定义开发需求、范围与验收标准，以 API 签名+类型为核心输出规约文档，遵循 api-design 原则。不写代码不写测试。当用户说"定义这个功能的需求"、"做形式化分析"、"写规约"或任何需要先厘清要做什么再动手的场景时使用。
---

# FDD PM — 需求与规约

## 职责

厘清"要做什么"。核心产出是 **API 签名 + 类型定义 + 验收标准**。不写实现，不写测试。

设计 API 时遵循 api-design 原则：渐进式增强、框架无关、DX 优先、原子化。

**流程**：

```
PM 出规约（API 签名 + 类型）
    ├── Dev 实现 ──────────────┐
    └── Test 写测试（可并行）──┘  → Dev 跑测试 → 修复循环 → 全绿
```

## 输入

- 上游参考源码
- 用户描述的功能目标
- 项目现有代码结构

## 核心产出：API 规约

**API 签名即规约主体**。Dev 照着实现，Test 照着写测试。双方基于同一份类型，无需翻译。

## 文件约定（强制）

**必须遵循以下命名规则，Dev 和 Test 只读这些文件：**

| 内容 | 路径 | 说明 |
|------|------|------|
| 任务清单 | `plans/ACTIVE.md` | 当前活跃任务及文件索引。Dev/Test 读这个文件找目标 |
| 复杂算法规约 | `plans/pX-formal-analysis.md` | X 为任务序号（PM 分配，如 p1、p2） |
| 纯功能规约 | `plans/pX-spec.md` | 同上 |
| 类型定义 | `src/fdd-types.ts` 或 `plans/pX-types.ts` | Dev 和 Test 共享 import |

### 文件目录示例

```
plans/
  ACTIVE.md              ← 任务清单（当前活跃任务）
  p1-formal-analysis.md  ← PM 写入
src/
  fdd-types.ts           ← PM 写入（类型定义）
```

完成后任务清单移动到 `plans/archive/`。

### ACTIVE.md 格式

```md
# 活跃任务

## P1: 功能名称
- 规约：plans/p1-spec.md
- 类型：plans/p1-types.ts
- 状态：Dev 实现中 / Test 编写中
```

## 输出后步骤

1. 创建或更新 `plans/ACTIVE.md`，注明规约文件路径和类型文件路径
2. 告知用户："需求就绪，规约在 `plans/pX-xxx.md`，类型在 `plans/pX-types.ts`，已写入 `plans/ACTIVE.md`"

## 禁止

- 不写测试代码
- 不写实现代码
- 不在需求不明确时猜测——先追问再写

# FDD — 形式化驱动开发

> 归档。8 个 agent，4 个 skill，通过 `plans/ACTIVE.md` 交接状态。`fdd-runner` 统一编排，子 agent 通过 `inherit_context` 继承上下文。

## 新功能开发流程

```mermaid
flowchart TB
    subgraph RN [Runner]
        A([识别意图]) --> B[启动 fdd-pm]
    end

    subgraph PM [PM]
        B --> C{追问用户<hr/>需求明确?}
        C -->|N| C
        C -->|Y| D[spec + types + ACTIVE]
    end

    subgraph DEV [Dev]
        D --> E[实现代码]
    end

    subgraph TR [Test + Review]
        D --> F[写单测]
        F --> G[Review]
        G --> H{覆盖充分?}
        H -->|N| I[补充]
        I --> G
        H -->|Y| J[单测就绪]
    end

    J -.-> K[Dev 跑单测]
    K --> L{全绿?}
    L -->|N| M[修复]
    M --> K
    L -->|Y| N[单测通过]

    N --> O[Integration: 集成/E2E]
    O --> P[Review]
    P --> Q{覆盖充分?}
    Q -->|N| R[补充]
    R --> P
    Q -->|Y| S[集成就绪]

    S -.-> T[Dev: 全量测试]
    T --> U{全绿?}
    U -->|N| V[修复]
    V --> T
    U -->|Y| W([交付])

    style RN fill:#fefce8,stroke:#eab308
    style PM fill:#eef2ff,stroke:#6366f1
    style DEV fill:#fef3c7,stroke:#f59e0b
    style TR fill:#ecfdf5,stroke:#10b981
```

## Bug 修复流程

```mermaid
flowchart TB
    subgraph RN [Runner]
        A([识别意图]) --> B[启动 fdd-fix-pm]
    end

    subgraph PM [Fix PM]
        B --> C{追问<hr/>现象+预期}
        C -->|N| C
        C -->|Y| D[ACTIVE: 复现步骤+验收标准]
    end

    subgraph T1 [Test: 复现]
        D --> E[复现步骤 → 可执行测试]
        E --> F[交接给 Dev]
    end

    subgraph DV [Fix Dev]
        F --> G[读代码定位根因]
        G --> H[写根因到 ACTIVE]
        H --> I[最小修复]
        I --> J{全绿?}
        J -->|N| I
        J -->|Y| K[修复完成]
    end

    subgraph T2 [Test: 扩展]
        K --> L[扩展同类场景]
        L --> M[提交 Review]
    end

    subgraph RV [Review]
        M --> N{覆盖充分?}
        N -->|N| O[补充]
        O --> M
        N -->|Y| P[就绪]
    end

    P -.-> Q[Fix Dev: 修复]
    Q --> R{全绿?}
    R -->|N| Q
    R -->|Y| S([交付])

    style RN fill:#fefce8,stroke:#eab308
    style PM fill:#fef2f2,stroke:#ef4444
    style DV fill:#fef3c7,stroke:#f59e0b
    style T1 fill:#ecfdf5,stroke:#10b981
    style T2 fill:#ecfdf5,stroke:#10b981
    style RV fill:#ecfdf5,stroke:#10b981
```

## Agent 职责

| Agent | 场景 | 职责 | 边界 |
|-------|------|------|------|
| `fdd-runner` | 编排 | 识别意图、按流程调度子 agent、跟踪 ACTIVE 状态 | 不写代码，不分析需求 |
| `fdd-pm` | 新功能 | 需求规约 + API 设计 + 类型定义 | 不写实现，不写测试，不猜需求 |
| `fdd-fix-pm` | Bug | 厘清现象、复现步骤、预期行为、验收标准 | 不分析根因，不写修复方案 |
| `fdd-dev` | 新功能 | 实现功能，跑测试修复到全绿 | 不写测试，不读上游源码 |
| `fdd-fix-dev` | Bug | 诊断根因、最小修复、回归验证 | 不改测试，不引入回归 |
| `fdd-test` | 两者 | 新功能单测 / Bug 复现用例(串行) + 同类扩展(送审) | 不读实现，不跑测试 |
| `fdd-review` | 两者 | 审查测试覆盖（单测 + 集成/E2E + Bug扩展） | 不读实现，不改测试 |
| `fdd-integration` | 新功能 | 集成测试优先，必要时写 E2E | 不跑测试，不重复单测 |

## Skills 重用

| Skill | 服务 Agent |
|-------|-----------|
| `fdd-pm` | fdd-pm, fdd-fix-pm |
| `fdd-dev` | fdd-dev, fdd-fix-dev |
| `fdd-test` | fdd-test, fdd-review |
| `fdd-runner` | fdd-runner |

## 状态节点

| 状态 | 流程 | 谁更新 | 下一动作 |
|------|------|--------|----------|
| 需求确认中 | 新功能 | fdd-pm | 问清后输出规约 |
| 待复现 | Bug | fdd-fix-pm | Test 写复现用例 |
| 复现就绪 | Bug | fdd-test | fdd-fix-dev 诊断根因 |
| 开发中 | 两者 | PM/Test | Dev/Test 并行（新功能）或 Dev 诊断（Bug） |
| 待 Review | 两者 | fdd-test | fdd-review 审查 |
| 单测就绪 | 新功能 | fdd-review | fdd-dev 跑单测 |
| 单测通过 | 新功能 | fdd-dev | fdd-integration 集成测试 |
| 修复完成 | Bug | fdd-fix-dev | fdd-test 扩展同类场景 |
| 集成/E2E 待 Review | 新功能 | fdd-integration | fdd-review 审查 |
| 集成就绪 | 新功能 | fdd-review | fdd-dev 全量测试 |
| 已完成 | 两者 | Dev | 交付 |
| ⚠️ 审查未通过 | 两者 | fdd-review | 补充 → 再审 |

## 调用方式

```bash
启动 fdd-runner，分析这个新功能：XXX
启动 fdd-runner，修这个bug：点击保存白屏
```

Runner 自动调度后续所有子 agent。

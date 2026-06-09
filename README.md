# Skills

> `pi install git:github.com/0xlxx/skills`

## FDD 形式化驱动开发

7 个 agent，3 个通用 skill，通过 `plans/ACTIVE.md` 交接状态。

### 新功能开发流程

```mermaid
flowchart TB
    subgraph PM ["PM"]
        direction TB
        A([追问用户]) --> B{需求明确?}
        B -->|N| A
        B -->|Y| C[输出 spec + types<br/>+ ACTIVE]
    end

    subgraph DEV ["Dev"]
        direction TB
        D[实现代码] --> K[跑单测]
        K --> L{全绿?}
        L -->|N| M[修复]
        M --> K
        L -->|Y| N[单测通过]
    end

    subgraph TR ["Test + Review"]
        direction TB
        E[写单测] --> F[提交 Review]
        F --> G{覆盖充分?}
        G -->|N| H[补充单测]
        H --> F
        G -->|Y| J[单测就绪]
    end

    subgraph IN ["Integration"]
        direction TB
        O[集成/E2E 测试] --> P[提交 Review]
        P --> Q{覆盖充分?}
        Q -->|N| R[补充]
        R --> P
        Q -->|Y| S[就绪]
    end

    subgraph DV ["Dev Final"]
        direction TB
        U[全量测试] --> V{全绿?}
        V -->|N| W[修复]
        W --> U
        V -->|Y| X([交付])
    end

    C --> D
    C --> E
    J -.-> K
    N --> O
    S -.-> U

    style PM fill:#eef2ff,stroke:#6366f1
    style DEV fill:#fef3c7,stroke:#f59e0b
    style TR fill:#ecfdf5,stroke:#10b981
    style IN fill:#fdf2f8,stroke:#ec4899
    style DV fill:#fef3c7,stroke:#f59e0b
```

### Bug 修复流程

```mermaid
flowchart TB
    subgraph FPM ["Fix PM"]
        direction TB
        A([追问现象+预期]) --> B[ACTIVE: 复现步骤<br/>+ 验收标准]
    end

    subgraph FT ["Test: 复现用例"]
        direction TB
        C[复现步骤 →<br/>可执行测试] --> D[交接给 Dev]
    end

    subgraph FD ["Fix Dev"]
        direction TB
        E[读 ACTIVE + 复现用例<br/>定位根因] --> F[写根因到 ACTIVE]
        F --> G[最小修复]
        G --> H{全绿?}
        H -->|N| G
        H -->|Y| I[完成]
    end

    subgraph FT2 ["Test: 扩展"]
        direction TB
        J[扩展同类场景] --> K[提交 Review]
    end

    subgraph FR ["Review"]
        direction TB
        K --> L{覆盖充分?}
        L -->|N| M[补充]
        M --> K
        L -->|Y| N[就绪]
    end

    B --> C
    D --> E
    I --> J
    N -.-> G
    I --> O([交付])

    style FPM fill:#fef2f2,stroke:#ef4444
    style FD fill:#fef3c7,stroke:#f59e0b
    style FT fill:#ecfdf5,stroke:#10b981
    style FT2 fill:#ecfdf5,stroke:#10b981
    style FR fill:#ecfdf5,stroke:#10b981
```

### Agent 职责

| Agent | 场景 | 职责 | 边界 |
|-------|------|------|------|
| `fdd-pm` | 新功能 | 需求规约 + API 设计 + 类型定义 | 不写实现，不写测试，不猜需求 |
| `fdd-fix-pm` | Bug | 厘清现象、复现步骤、预期行为、验收标准 | 不分析根因，不写修复方案 |
| `fdd-dev` | 新功能 | 实现功能，跑测试修复到全绿 | 不写测试，不读上游源码 |
| `fdd-fix-dev` | Bug | 诊断根因、最小修复、回归验证 | 不改测试，不引入回归 |
| `fdd-test` | 两者 | 新功能单测 / Bug 复现用例(串行) + 同类扩展(送审) | 不读实现，不跑测试 |
| `fdd-review` | 新功能 + Bug扩展 | 审查测试覆盖（单测 + 集成/E2E + 同类扩展） | 不读实现，不改测试 |
| `fdd-integration` | 新功能 | 集成测试优先，必要时写 E2E | 不跑测试，不重复单测 |

### Skills 重用

| Skill | 服务 Agent |
|-------|-----------|
| `fdd-pm` | fdd-pm, fdd-fix-pm |
| `fdd-dev` | fdd-dev, fdd-fix-dev |
| `fdd-test` | fdd-test, fdd-review |

### 状态节点

| 状态 | 流程 | 谁更新 | 下一动作 |
|------|------|--------|----------|
| 需求确认中 | 新功能 | fdd-pm | 问清后输出规约 |
| 待复现 | Bug | fdd-fix-pm | Test 写复现用例 |
| 复现就绪 | Bug | fdd-test | fdd-fix-dev 诊断根因 |
| 开发中 | 两者 | PM/Test | Dev/Test 并行（新功能）或 Dev 诊断（Bug） |
| 待 Review | 新功能 + Bug扩展 | fdd-test | fdd-review 审查 |
| 单测就绪 | 新功能 | fdd-review | fdd-dev 跑单测 |
| 单测通过 | 新功能 | fdd-dev | fdd-integration 集成测试 |
| 集成/E2E 待 Review | 新功能 | fdd-integration | fdd-review 审查 |
| 集成就绪 | 新功能 | fdd-review | fdd-dev 全量测试 |
| 已完成 | 两者 | Dev | 交付 |
| ⚠️ 审查未通过 | 新功能 + Bug扩展 | fdd-review | 补充 → 再审 |

### 调用方式

**新功能**：

```bash
# 1. PM
Agent({ subagent_type: "fdd-pm", description: "需求分析", prompt: "分析XXX功能" })

# 2. 并行
Agent({ subagent_type: "fdd-dev", description: "实现", prompt: "根据规约实现", run_in_background: true })
Agent({ subagent_type: "fdd-test", description: "单测", prompt: "写单元测试", run_in_background: true })

# 3. Review
Agent({ subagent_type: "fdd-review", description: "审查单测", prompt: "检查覆盖" })

# 4. Dev 修复
Agent({ subagent_type: "fdd-dev", description: "修复", prompt: "跑测试修复到全绿" })

# 5. 集成/E2E
Agent({ subagent_type: "fdd-integration", description: "集成测试", prompt: "写集成/E2E测试" })

# 6. Review + Dev 修复
Agent({ subagent_type: "fdd-review", description: "审查集成", prompt: "检查覆盖" })
Agent({ subagent_type: "fdd-dev", description: "修复", prompt: "全量测试修复" })
```

**Bug 修复**：

```bash
# 1. PM 厘清 bug
Agent({ subagent_type: "fdd-fix-pm", description: "Bug分析", prompt: "分析这个bug的现象和预期" })

# 2. Test 写复现用例（串行，不Review）
Agent({ subagent_type: "fdd-test", description: "复现测试", prompt: "将PM确认的复现步骤写成可执行测试" })

# 3. Dev 诊断根因并修复
Agent({ subagent_type: "fdd-fix-dev", description: "诊断修复", prompt: "读ACTIVE+复现用例，定位根因，修复到全绿" })

# 4. Test 扩展同类场景 + Review ↻
Agent({ subagent_type: "fdd-test", description: "扩展测试", prompt: "补充同类场景的测试" })
Agent({ subagent_type: "fdd-review", description: "审查", prompt: "检查扩展测试覆盖" })
Agent({ subagent_type: "fdd-fix-dev", description: "修复", prompt: "修复到全绿" })
```

## 通用 Skills

| Skill | 说明 |
|-------|------|
| `api-design` | API 设计原则：渐进式增强、框架无关、DX 优先、原子化 |
| `essence-first` | 本质优先解释法：先给上下文和本质，不堆砌细节 |

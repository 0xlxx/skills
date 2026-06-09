# Skills

> `pi install git:github.com/0xlxx/skills`

## FDD 形式化驱动开发

六个 agent 协作，通过 `plans/ACTIVE.md` 交接状态。

### 完整流程

```mermaid
%%{init: {'theme': 'base', 'themeVariables': { 'primaryColor': '#6366f1', 'primaryTextColor': '#fff', 'primaryBorderColor': '#4f46e5', 'lineColor': '#94a3b8', 'secondaryColor': '#f1f5f9', 'tertiaryColor': '#f8fafc'}}}%%
graph TB
    subgraph PM["👤 PM"]
        A([追问用户]) --> B{需求明确?}
        B -->|不明确| A
        B -->|确认| C[📋 输出规约<br/>spec + types + ACTIVE]
    end

    C --> D
    C --> E

    subgraph Dev["🔧 Dev"]
        D[实现代码] --> K[跑单测]
        K --> L{全绿?}
        L -->|❌| M[修复]
        M --> K
        L -->|✅| N[单测通过]
    end

    subgraph TestReview["🧪 Test ⇄ 🔍 Review"]
        E[写单测] --> F[提交 Review]
        F --> G{覆盖充分?}
        G -->|⚠️| H[补充单测]
        H --> F
        G -->|✅| J[单测就绪]
    end

    J -.-> K
    N --> O

    subgraph Integration["🔗 Integration"]
        O[写集成测试] --> P[提交 Review]
        P --> Q{覆盖充分?}
        Q -->|⚠️| R[补充集成]
        R --> P
        Q -->|✅| S[集成就绪]
    end

    S -.-> U

    subgraph DevFinal["🔧 Dev 最终"]
        U[跑全量测试] --> V{全绿?}
        V -->|❌| W[修复]
        W --> U
        V -->|✅| X([✅ 已完成交付])
    end

    style PM fill:#eef2ff,stroke:#6366f1,stroke-width:2px
    style Dev fill:#fef3c7,stroke:#f59e0b,stroke-width:2px
    style TestReview fill:#ecfdf5,stroke:#10b981,stroke-width:2px
    style Integration fill:#fdf2f8,stroke:#ec4899,stroke-width:2px
    style DevFinal fill:#fef3c7,stroke:#f59e0b,stroke-width:2px
```

### Agent 职责

| Agent | 职责 | 输入 | 输出 | 边界 |
|-------|------|------|------|------|
| `fdd-pm` | 需求规约 + API 设计 + 类型定义 | 用户目标、上游源码（必须追问确认后才写规约） | `plans/ACTIVE.md`、规约、类型文件 | 不写实现，不写测试，不猜需求 |
| `fdd-dev` | 实现功能，跑测试修复到全绿 | PM 规约 | `src/pX-*.ts`，更新 ACTIVE | 不写测试，不读上游源码 |
| `fdd-test` | 编写单元测试，配合 Review 补充 | PM 规约 | `tests/pX.test.ts`，更新 ACTIVE | 不读实现代码 |
| `fdd-review` | 审查测试覆盖（单测 + 集成） | 规约 + 测试文件 | `plans/pX-test-review.md`，更新 ACTIVE | 不读实现，不改测试 |
| `fdd-integration` | 编写集成测试 | 规约 + 实现代码 | `tests/pX-integration.test.ts`，更新 ACTIVE | 不跑测试，不重复单测 |

### 状态节点

| 状态 | 谁更新 | 下一动作 |
|------|--------|----------|
| 需求确认中 | PM（追问用户） | 问清楚后输出规约 |
| 开发中 | PM | Dev + Test 并行开始 |
| 待 Review | Test | Review 审查单测 |
| 单测就绪 | Review | Dev 跑单测 |
| 单测通过 | Dev | Integration 写集成测试 |
| 集成测试待 Review | Integration | Review 审查集成 |
| 集成就绪 | Review | Dev 跑全量测试 |
| 已完成 | Dev | 交付 |
| Review ⚠️ | Review | Test/Integration 补充 → Review 再审 |

### 调用方式

```bash
# 1. PM 出规约
Agent({ subagent_type: "fdd-pm", description: "需求分析", prompt: "分析XXX功能" })

# 2. 并行启动 Dev 和 Test
Agent({ subagent_type: "fdd-dev", description: "实现", prompt: "根据规约实现", run_in_background: true })
Agent({ subagent_type: "fdd-test", description: "单测", prompt: "根据规约写单元测试", run_in_background: true })

# 3. Review 审查单测覆盖（循环直到 ✅）
Agent({ subagent_type: "fdd-review", description: "审查单测", prompt: "检查单元测试覆盖" })

# 4. Dev 跑测试修复
Agent({ subagent_type: "fdd-dev", description: "修复", prompt: "运行 pnpm test，修复到全绿" })

# 5. 单测全绿后，写集成测试
Agent({ subagent_type: "fdd-integration", description: "集成测试", prompt: "编写集成测试" })

# 6. Review 审查集成测试
Agent({ subagent_type: "fdd-review", description: "审查集成", prompt: "检查集成测试覆盖" })

# 7. Dev 跑全量测试修复
Agent({ subagent_type: "fdd-dev", description: "修复集成", prompt: "运行全部测试并修复到全绿" })
```

## 通用 Skills

| Skill | 说明 |
|-------|------|
| `api-design` | API 设计原则：渐进式增强、框架无关、DX 优先、原子化 |
| `essence-first` | 本质优先解释法：先给上下文和本质，不堆砌细节 |

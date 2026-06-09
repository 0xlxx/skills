# Skills

> `pi install git:github.com/0xlxx/skills`

## FDD 形式化驱动开发

```
PM 出规约
 ├── Dev 实现 ────────────────────────────────┐
 └── Test ↻ Review ─┐                         │
                     │ 单测 ✅                 │
                     ├── Dev 跑测试修复循环 ───┤
                     │                         │
                     │ 全绿                    │
                     ├── Integration 集成测试 ─┤
                     └── Review ─┐             │
                                 │ 集成 ✅     │
                                 └── Dev 修复 ─┘  → 全绿交付
```

| Agent | 职责 | 阶段 |
|-------|------|------|
| `fdd-pm` | 需求规约 + API 设计 + 类型定义 | 第 1 步 |
| `fdd-dev` | 实现功能，跑测试并修复到全绿 | 与 Test 并行，最后修复循环 |
| `fdd-test` | 编写单元测试，配合 Review 循环补充 | 与 Dev 并行 |
| `fdd-review` | 审查单测和集成测试覆盖 | 单测后、集成后各审查一次 |
| `fdd-integration` | 编写集成测试（端到端数据流） | Dev 单测全绿后 |

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

# 6. Review 审查集成测试 + Dev 修复
Agent({ subagent_type: "fdd-review", description: "审查集成", prompt: "检查集成测试覆盖" })
Agent({ subagent_type: "fdd-dev", description: "修复集成", prompt: "运行集成测试并修复" })
```

## 通用 Skills

| Skill | 说明 |
|-------|------|
| `api-design` | API 设计原则：渐进式增强、框架无关、DX 优先、原子化 |
| `essence-first` | 本质优先解释法：先给上下文和本质，不堆砌细节 |

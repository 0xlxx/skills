# Skills

> `pi install git:github.com/0xlxx/skills`

## FDD 形式化驱动开发

```
PM 出规约
    ├── Dev 实现 ──────────────┐
    └── Test ↻ Review ────────┘  → Dev 跑测试 → 修复循环 → 全绿
```

| Agent | 职责 | 输入 | 输出 |
|-------|------|------|------|
| `fdd-pm` | 需求规约 + API 设计 | 用户目标、上游源码 | `plans/ACTIVE.md`、规约文档、类型定义 |
| `fdd-dev` | 实现功能 | PM 规约 | 实现代码，跑测试修复到全绿 |
| `fdd-test` | 编写测试 | PM 规约 | 测试文件，提交 Review |
| `fdd-review` | 审查测试覆盖 | 规约 + 测试 | `plans/pX-test-review.md`，循环直到 ✅ |

### 使用方式

```bash
# 1. PM 出规约
Agent({ subagent_type: "fdd-pm", description: "需求分析", prompt: "分析XXX功能" })

# 2. 并行：Dev 实现 + Test 写测试
Agent({ subagent_type: "fdd-dev", description: "实现", prompt: "根据规约实现", run_in_background: true })
Agent({ subagent_type: "fdd-test", description: "测试", prompt: "根据规约写测试", run_in_background: true })

# 3. Review 审查测试覆盖
Agent({ subagent_type: "fdd-review", description: "审查测试", prompt: "检查测试覆盖", run_in_background: true })

# 4. Dev 跑测试修复循环
Agent({ subagent_type: "fdd-dev", description: "修复", prompt: "运行测试并修复" })
```

## 通用 Skills

| Skill | 说明 |
|-------|------|
| `api-design` | API 设计原则：渐进式增强、框架无关、DX 优先、原子化 |
| `essence-first` | 本质优先解释法：先给上下文和本质，不堆砌细节 |

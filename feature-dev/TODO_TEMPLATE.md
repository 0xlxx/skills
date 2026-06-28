# TODO — {feature-name}

## Active DAG

### DAG Visualization
```
┌──────────┐     ┌──────────┐
│ 1. {节点} │────▶│ 3. {节点} │
└──────────┘     └──────────┘
     │                 │
     ▼                 ▼
┌──────────┐     ┌──────────┐
│ 2. {节点} │────▶│ 4. {节点} │
└──────────┘     └──────────┘
```

### Task Table
| # | Task | Layer | Deps | Status |
|---|------|-------|------|--------|
| 1 | {任务名} | 物理层 | - | ⬜ |
| 2 | {任务名} | 物理层 | - | ⬜ |
| 3 | {任务名} | 逻辑层 | 1 | ⬜ |
| 4 | {任务名} | 策略层 | 2,3 | ⬜ |

Status: ⬜ pending, 🔄 in progress, ✅ done

## Archive
- [YYYY-MM-DD] {一句话概括} → [archive/{file}.md](archive/{file}.md)

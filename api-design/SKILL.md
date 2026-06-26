---
name: api-design
description: API 设计指南——渐进式增强、框架无关、DX 优先、原子化。当设计新 API、评审接口、讨论函数/CLI/REST/GraphQL 对外形态时使用。不涵盖向后兼容与旧 API 迁移。
---

# API 设计指南

## 核心哲学

让正确的用法显而易见，让错误的用法难以写出。四个原则互为支撑：渐进式增强定门槛，框架无关保寿命，直觉 DX 管顺滑，原子化给组合力。

## 设计流程

每一步完成后再进下一步。完成标志是硬门槛——没达到不前进。

**此流程只做新 API 设计。** 不涵盖向后兼容、旧 API 迁移、共存期。旧 API 重构场景需要不同的流程。

1. **理清使用场景** — 谁调用？最常见的 2-3 个用例？**完成标志**：用例写成一句话，用户确认无误。
2. **草拟最小接口** — 从零配置即工作的版本开始，不加 option。**完成标志**：一个签名覆盖核心用例，调用方不超过 3 行。
3. **调用方视角过一遍** — 把每个用例写成调用代码。参数顺序自然吗？IDE 自动补全路径完整吗？**完成标志**：每个用例的调用代码读起来像散文。
4. **检查正交性** — 每个方法做且只做一件事。能否组合现有方法满足新需求而不加新 API？**完成标志**：每问一个"能不能做 X"，答案都是组合已有 API，不新增。
5. **进阶场景** — 默认覆盖 80% 后，给高级用户 escape hatch。**完成标志**：高级场景有明确扩展点，不破坏基础用例。
6. **输出方案** — 按[输出格式](#输出格式)呈现。**完成标志**：输出格式中所有必填段均已填充，调用示例在接口定义之前。

## 原则一：渐进式增强

初学者 3 行搞定，专家能精细控制——一个 API 同时服务两端，靠的是分层暴露能力，不是堆参数。

```
零配置启动 → 默认值覆盖 80% → 可选参数暴露 → escape hatch 完全控制
```

每一层是前一层的增强，不是替代。

```typescript
// 第 1 层：零配置
const client = createClient({ apiKey: "sk_xxx" })
const result = await client.chat("Hello!")

// 第 2 层：按需覆盖
const result = await client.chat("Hello!", { model: "sonnet-4.6", temperature: 0.7 })

// 第 3 层：escape hatch
const result = await client.chat("Hello!", { ...overrides, headers: { "X-Custom": "v" } })
```

关键约束：第 1 层的调用方式在第 3 层仍然有效。增强不破坏。

## 原则二：框架无关

前端框架 3-5 年换代，核心逻辑能活 10 年。绑在框架上的业务逻辑每次换代都要重写。

```
业务逻辑层（纯 JS/TS，零框架 import）
    ↓
框架适配层（React hook / Vue composable / Svelte store）
    ↓
视图层（只做渲染和事件绑定）
```

```typescript
// ❌ 业务逻辑写在 hook 里——换框架时全废
function useChat(config) {
  const [messages, setMessages] = useState([])
  async function send(text) { ... fetch("/api/chat", ...) ... }
  return { messages, send }
}

// ✅ 核心层零框架依赖，适配层只做转发
class ChatClient {
  async send(text: string): Promise<Message> { ... }
}

function useChat(config: ChatConfig) {
  const [client] = useState(() => new ChatClient(config))
  return { messages, send: (text) => client.send(text).then(refresh) }
}
```

适配层不写业务逻辑——只桥接状态和事件。

## 原则三：符合直觉的 DX

开发者大部分时间在编辑器里，不在文档里。自动补全驱动发现，类型即文档，合理默认值消除样板。

- **参数顺序**：必需在前，可选在后
- **命名一致**：同一概念全 API 用同一个词——不在 `createUser` 叫 `name` 到 `updateUser` 变 `userName`
- **返回值形状一致**：列表都返回 `{ items, total }`，不因接口不同而变形
- **类型即文档**：导出有意义的名字；JSDoc 描述"为什么"，"是什么"类型已经说了

```typescript
// ✅ 必需在前，可选在后，有默认值
function paginate<T>(items: T[], options?: { page?: number; pageSize?: number }): PaginatedResult<T>

// ❌ 可选夹中间，无默认值
function paginate<T>(page: number | undefined, items: T[], pageSize: number)
```

## 原则四：原子化

"万能方法"表面方便实则脆弱——50 个参数、30 种返回格式、加新功能破坏旧功能。

判断标准：**能否不改源码，通过组合现有 API 实现新需求？**

- 每个函数做且只做一件事，函数名就是这件事的描述
- 提供组合子：`pipe`、`compose`、`chain`
- 中间产物可访问——不把流程锁在黑盒里
- Builder 模式是 escape hatch，options 对象是主力

```typescript
// ✅ 原子化：组合胜于巨石
const result = pipe(
  filter(todos, t => !t.done),
  sort(byPriority),
  paginate({ page: 1, pageSize: 10 })
)

// ❌ 巨石 API
function getTodos(filters?, sortBy?, pagination?, includeArchived?, ...)
```

## 反模式速查

评审时对照 [ANTIPATTERNS.md](ANTIPATTERNS.md)。

## 输出格式

```
## API 设计方案：{名称}

### 使用场景
- 场景 1：{一句话}
- 场景 2：{一句话}

### 最小可用示例
\```typescript
// 最简单的调用方式
\```

### 完整接口
\```typescript
// 所有方法签名、类型定义
\```

### 进阶用法
\```typescript
// 1-2 个高级场景
\```

### 设计决策
- 为什么参数是这个顺序
- 为什么这个不是可选的
- 已知的权衡

### 与现有 API 的一致性
- 命名是否和项目已有 API 一致
- 返回形状是否遵循项目惯例
```

先给调用示例，接口定义排其后——先看到"怎么用"再看到"有什么"。

多组件架构用 ASCII 框图辅助：
```
┌──┐  ┌──┐
│A │  │B │
└──┘  └──┘
```

---
name: api-design
description: 通用 API 设计指南，涵盖渐进式增强、框架无关、DX 优先、原子化正交设计。当用户设计新 API、评审 API 设计、重构接口、或询问"这个 API 该怎么设计"时使用。哪怕用户只是在讨论某个函数签名、库的对外接口、CLI 参数、或是 REST/GraphQL 端点设计，也应该触发此 skill——API 设计无处不在。
---

# API 设计指南

## 核心哲学

好的 API 设计不是"把所有功能暴露出来"，而是**让正确的用法显而易见，让错误的用法难以写出**。

四个原则互相支撑：
- **渐进式增强** 保证入门门槛低
- **框架无关** 保证设计不绑定特定生态
- **符合直觉的 DX** 保证日常使用顺畅
- **原子化** 保证复杂场景不失控

它们最终指向同一个目标：**开发者不需要读文档就能猜出怎么用**。

## 设计流程

当用户请你设计或评审 API 时，按以下步骤走：

1. **先理清使用场景** — 问用户：谁会调用这个 API？最常见的 2-3 个用例是什么？不要上来就写签名。
2. **草拟最小接口** — 从零配置即可工作的最小版本开始，不急着加 option。
3. **用调用方视角过一遍** — 把每个用例写成调用代码，感受 DX 是否顺滑。自动补全能工作吗？参数顺序自然吗？
4. **检查正交性** — 每个方法做一件事吗？能否通过组合现有方法实现新需求而不加新 API？
5. **考虑进阶场景** — 默认行为覆盖了 80% 用例后，再考虑高级用户需要的 escape hatch、Builder 模式、链式调用等可选增强。
6. **检查向后兼容** — 如果是重构现有 API，必须考虑迁移路径：旧调用方怎么过渡？能否提供兼容垫片（deprecation wrapper）？新旧接口共存期多长？
7. **输出设计方案** — 按下方"输出格式"呈现。

## 原则一：渐进式增强

### 为什么重要

API 的使用者技能水平差异巨大。初学者只想 3 行代码解决问题，高级用户需要精细控制。一个 API 如果只服务一端，要么劝退新手，要么限制专家——两种都丢用户。

### 怎么做

```
零配置启动 → 合理的默认值覆盖 80% 场景 → 可选参数逐步暴露 → 底层原语提供完全控制
```

每一层都建立在前一层之上，不是替代关系。

### 示例

```typescript
// 第 1 层：零配置 —— 初学者 3 行搞定
const client = createClient({ apiKey: "sk_xxx" })
const result = await client.chat("Hello!")

// 第 2 层：按需覆盖 —— 需要控制时自然浮出
const result = await client.chat("Hello!", {
  model: "sonnet-4.6",
  temperature: 0.7,
  maxTokens: 4096,
})

// 第 3 层：escape hatch —— 高级用户完全控制
const result = await client.chat("Hello!", {
  ...overrides,
  headers: { "X-Custom-Header": "value" },
  fetch: customFetch,
})
```

关键点：第 1 层的调用方式在第 3 层仍然有效。增强不是破坏。

## 原则二：框架无关

### 为什么重要

前端框架的生命周期 3-5 年，好的核心逻辑能活 10 年以上。把业务逻辑绑死在框架上，意味着每次框架换代都要重写。更实际的是：同一个团队的成员可能用不同框架——核心逻辑共享，框架适配层各自维护。

### 怎么做

三层架构：

```
业务逻辑层（纯 JS/TS，零框架依赖）
    ↓
框架适配层（Vue composable / React hook / Svelte store）
    ↓
视图层（组件，只做渲染和事件绑定）
```

核心层不 import 任何框架。适配层只做桥接，不写业务逻辑。

### 反例 → 正例

```typescript
// ❌ 反例：业务逻辑直接写在 React hook 里
function useChat(config: ChatConfig) {
  const [messages, setMessages] = useState([])
  async function send(text: string) {
    const result = await fetch("/api/chat", { ... })
    setMessages([...messages, result])
  }
  return { messages, send }
}

// ✅ 正例：核心逻辑纯粹，不依赖任何框架
class ChatClient {
  private messages: Message[] = []
  constructor(private config: ChatConfig) {}
  async send(text: string): Promise<Message> {
    const msg = await this.transport.send(text, this.config)
    this.messages.push(msg)
    return msg
  }
  getMessages(): Message[] { return [...this.messages] }
}

// 框架适配层只做薄薄一层桥接
function useChat(config: ChatConfig) {
  const [client] = useState(() => new ChatClient(config))
  const [messages, setMessages] = useState([])
  return {
    messages,
    send: async (text: string) => {
      const msg = await client.send(text)
      setMessages(client.getMessages())
      return msg
    }
  }
}
```

## 原则三：符合直觉的 DX

### 为什么重要

开发者用 API 时大部分时间在编辑器里，不是在读文档。自动补全驱动发现，TypeScript 类型即文档，合理的默认值消除样板代码。一个好的 API 让开发者写完第一行后，IDE 会引导他们写完剩下的——他们甚至感觉不到自己在"学"一个 API。

### 怎样做到

- **参数顺序**：必需的在前，可选的在后。最常见的可选参数应该有默认值，不需要显式传入。
- **命名一致性**：同一个概念在全 API 中用同一个词。不要在 `createUser` 里叫 `name` 到 `updateUser` 里变成 `userName`。
- **返回值形状一致**：如果列表接口返回 `{ items: T[], total: number }`，所有列表接口都应该是这个形状。
- **类型即文档**：给类型起有意义的名字，导出给使用者 import。JSDoc 描述"为什么"而非"是什么"（"是什么"类型已经说了）。

### 示例

```typescript
// ✅ 好：参数顺序直观，可选参数有默认值
function paginate<T>(
  items: T[],           // 必需的在前
  options?: {           // 可选的在后
    page?: number,      // 默认 1
    pageSize?: number,  // 默认 20
  }
): PaginatedResult<T>

// ❌ 差：可选参数夹在中间，没有默认值
function paginate<T>(
  page: number | undefined,
  items: T[],
  pageSize: number,
)
```

## 原则四：原子化

### 为什么重要

一个"万能方法"的 API 表面方便，实则脆弱。50 个参数、30 种返回格式、内部 if-else 嵌套 10 层——加一个新功能可能破坏 10 个老功能。原子化的 API 每个只做一件事，但能自由组合出设计者没预想到的用法。

判断标准：**能否在不改源码的情况下，通过组合现有 API 实现新需求？**

### 怎么做

- 每个函数只做一件事，函数名准确描述这件事
- 提供组合子：`pipe`、`compose`、`chain` 让多个原子操作串联
- 中间产物可访问：不把整个流程锁在一个黑盒里，使用者在中间步骤可以介入
- 可选进阶：对极度复杂的配置场景，Builder 模式（`.from(data).format('pdf').watermark('DRAFT').generate()`）是有效的补充——但 options 对象仍是主力，Builder 是 escape hatch。

### 示例

```typescript
// ✅ 原子化：每个函数只做一件事
const filtered = filter(todos, todo => !todo.done)       // 只过滤
const sorted   = sort(filtered, byPriority)               // 只排序
const paged    = paginate(sorted, { page: 1, pageSize: 10 }) // 只分页

// 使用者可以自由组合
const urgentOnly = pipe(
  filter(t => t.priority === "urgent"),
  sort(byDeadline),
  take(5)
)

// ❌ 巨石 API：一个函数试图做所有事
function getTodos(filters?, sortBy?, pagination?, includeArchived?, ...)
```

## 反模式速查

| 反模式 | 为什么是问题 | 替代方案 |
|--------|-------------|----------|
| 用字符串常量代替枚举或联合类型 | 无自动补全，typo 到运行时才报错 | `type Status = "idle" \| "loading" \| "done"` |
| 返回裸数据，结构随参数变化 | 调用方需要类型收窄，增加心智负担 | 始终返回一致的结构，多余的键为 `undefined` 也好过结构变化 |
| 把配置散落在多个位置 | 让调用方猜测选项应该传在第几个参数的哪个字段里 | 收敛到一个 `options` 对象 |
| 暴露内部实现细节 | 换实现时破坏使用者的代码 | 只暴露行为，不暴露内部状态 |
| 版本号体现在 API 路径里 | 同时维护 N 个版本，最终变成兼容债务 | API 自身通过渐进式增强保持向后兼容 |

## 输出格式

当用户请你设计 API 时，用以下结构呈现方案：

```
## API 设计方案：{名称}

### 使用场景
- 场景 1：{一句话描述}
- 场景 2：{一句话描述}

### 最小可用示例
\```typescript
// 展示最简单的调用方式
\```

### 完整接口
\```typescript
// 所有方法签名、类型定义
\```

### 进阶用法
\```typescript
// 1-2 个高级场景的调用示例
\```

### 设计决策
- 为什么参数是这个顺序
- 为什么这个东西不是可选的
- 有什么已知的权衡

### 与现有 API 的一致性检查
- 命名是否和项目中已有 API 一致
- 返回形状是否遵循项目惯例

### 迁移兼容（重构场景必填）
- 旧调用方如何过渡到新接口
- 兼容垫片（deprecation wrapper）长什么样
- 新旧接口共存期和废弃时间线
```

优先给调用示例，接口定义排在其后——用户先看到"怎么用"再看到"有什么"，理解更快。

如果方案涉及多个组件或渠道的架构，用 ASCII 框图（```
┌──┐  ┌──┐
│A │  │B │
└──┘  └──┘
```）辅助表达，比纯文字更直观。

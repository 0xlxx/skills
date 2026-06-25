---
name: direct-readme
description: 编写或生成 GitHub 项目的 README 文件——开门见山，开箱即用。当用户要求为仓库写 README、强调"简单直接"、"不要废话"、"直接给安装命令"时使用。
---

# Direct README Writer

当你为项目（尤其是小众或工具类项目）编写 README 时，请遵循以下核心指令。这个原则的核心理念是：**不要浪费读者的注意力，开箱即用，开门见山。**

## 核心原则

1. **拒绝开头的过度包装 (No Bloat at the Beginning)**
   - **绝对不要**在 README 开头大谈特谈复杂的架构设计。
   - **绝对不要**在开头放各种 Benchmark（跑分）或与竞品的对比。
   - 目标受众通常是来解决某个具体问题的，不需要你去证明项目有多好，讲清楚它能干嘛就行。

2. **安装命令紧跟标题 (Install Command First)**
   - 读者寻找的是开箱即用的解决方案。
   - 在主标题（`# 标题`）和简短的一两句功能介绍之后，**必须立刻提供**安装命令（如 `brew install`、`npm install`、`pip install` 等）。

3. **聚焦于核心价值和用法 (Focus on Value and Usage)**
   - 清晰明确地说明这个项目解决了什么痛点。
   - 提供一个最简化的、能直接复制粘贴运行的示例代码（Quick Start）。

## 期望的 README 结构模板

请严格遵循以下结构组织内容：

# [项目名称]

[一到两句话简述：本项目能解决什么具体的痛点/问题。]

## ▣ Installation / 安装

```bash
# 给出最直接的安装命令
npm install [package-name]
# or
brew install [package-name]
```

## ▣ Quick Start / 快速上手

```[language]
// 提供最简单的、开箱即用的示例代码
```

## ▣ Motivation & Details / 动机与详情 (可选)

[复杂的架构说明、为何开发此项目的动机、跑分等内容，如果有，**必须**放在安装和快速使用之后。绝不允许放在文件顶部。]

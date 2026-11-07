---
name: pre-commit-token-budget
description: Install or repair a Git pre-commit guard that rejects staged agent-authored files above 5,000 estimated tokens (bytes / 4). Use for a 5,000-token pre-commit hook, a staged-file token budget, an agent-context file-size limit, or a commit blocked by an oversized-file token-budget error.
---

# Pre-commit token budget

在目标项目安装一个零依赖 Git hook：只检查已 staged 文件，按 `tokens = bytes / 4` 拒绝超过 5,000 tokens（20,000 bytes）的 agent-authored 文本。锁文件、常见 codegen/vendor/build 产物、二进制，以及项目显式声明忽略的路径不参与检查。

## 安装

1. **确认目标仓库和现有 hook**

   ```bash
   git rev-parse --show-toplevel
   git rev-parse --git-path hooks
   git config --get core.hooksPath
   ```

   **完成标志**：知道仓库根目录、实际 hook 目录，以及 `pre-commit` 是否已存在。

2. **安装检查器**

   在目标仓库根目录运行：

   ```bash
   python3 <此-skill-目录>/scripts/check_token_budget.py --install
   git add .agent-hooks/pre-commit-token-budget.py
   ```

   安装器把检查器复制到 `.agent-hooks/pre-commit-token-budget.py`，并在实际 hook 目录写入一个带管理标记的 `pre-commit` shim。

   **完成标志**：安装器退出 0；hook 文件可执行；`.agent-hooks/pre-commit-token-budget.py` 已纳入版本控制。

3. **保留已有 pre-commit**

   若安装器报告已有非托管 hook，它不会覆盖。把下面这一行加到原 hook 的 shebang 之后、其他检查之前，并保留原有逻辑：

   ```sh
   python3 "$(git rev-parse --show-toplevel)/.agent-hooks/pre-commit-token-budget.py" || exit $?
   ```

   `pre-commit` framework 或 husky 项目也采用同一原则：把该命令接进现有 `pre-commit` 入口，不替换整套 hook。

   **完成标志**：原 hook 仍执行原逻辑，新检查也会执行。

4. **按需声明项目级例外**

   内置忽略规则已覆盖常见锁文件与生成目录。项目特有例外写到仓库根目录 `.token-budget-ignore`，语法同 `.gitignore`：

   ```gitignore
   fixtures/**/*.json
   src/schema.ts
   ```

   文件若由工具生成，也可在 `.gitattributes` 标记：

   ```gitattributes
   path/to/generated.ts linguist-generated=true
   ```

   **完成标志**：每个例外都是可再生成、第三方或非 agent-authored 的内容；agent 撰写的文档与代码没有借例外绕过限制。

5. **验证**

   在临时仓库验证边界，不改动目标仓库的 index：

   ```bash
   python3 <此-skill-目录>/tests/test_check_token_budget.py
   ```

   然后在目标仓库运行一次 hook：

   ```bash
   "$(git rev-parse --path-format=absolute --git-path hooks)/pre-commit"
   ```

   **完成标志**：测试全绿；当前 staged 内容通过时 hook 静默退出 0。超限时退出 1，并打印超限文件、估算 tokens 和拆分步骤。

## 规则

- **staged 内容才是真相**：按 Git index 中的 blob 计字节，不读工作区；未 `git add` 的修改不参与。
- **阈值**：`20,000 bytes`。`20,000 bytes = 5,000 tokens` 通过，`20,001 bytes` 失败。估算向上取整展示。
- **忽略不等于放行 agent 内容**：例外只用于 lockfile、codegen、vendor、二进制等非 agent-authored 文件。
- **错误必须可行动**：失败信息包含每个文件的字节数、tokens、超出量、按语义拆分的原则、示例和重新 stage 的命令。
- **不覆盖既有 hook**：已有非托管 `pre-commit` 时安装器退出 2 并打印接入命令。

## 核心实现

- [scripts/check_token_budget.py](scripts/check_token_budget.py)：检查器与安装器，仅依赖 Python 3 标准库和 Git。
- [tests/test_check_token_budget.py](tests/test_check_token_budget.py)：覆盖 staged-only、阈值边界、忽略规则、二进制、gitattributes、安装与 hook 保留。

估算不是模型 tokenizer；中文、压缩数据或高比例符号会与真实 token 数有偏差。这是需求指定的固定近似，不改成按字符或按行计数。

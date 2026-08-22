#!/usr/bin/env bash
# cluster-prompt.sh — 执行器 prompt 生成库（ccx 与 Codex 子代理共源，防两处漂移）。
#
# 用法:
#   source cluster-prompt.sh
#   build_cluster_prompt <briefs-dir> <cluster-name> [worktree]
#
#   briefs-dir   簇简报目录（须含 <name>.md 与 _COMMON.md）
#   cluster-name 簇名
#   worktree     可选。Codex 子代理没有 --cwd 参数，必须显式告知工作目录；
#                ccx 路径不传（--cwd 已指好）。
#
# 输出到 stdout；失败（简报缺失）返回非 0 并写 stderr。
# 兼容性: 避免 bash 关联数组（macOS bash 3.2 不支持）；本库仅用 POSIX 语法 + function。

build_cluster_prompt() {
  local briefs="$1" name="$2" wt="${3:-}" brief common locator
  brief="${briefs}/${name}.md"
  common="${briefs}/_COMMON.md"
  if [[ ! -f "$brief" ]]; then
    echo "错误: 简报不存在 ${brief}" >&2
    return 1
  fi
  if [[ ! -f "$common" ]]; then
    echo "错误: 公共简报不存在 ${common}" >&2
    return 1
  fi
  if [[ -n "$wt" ]]; then
    locator="你的工作目录是 ${wt}。所有 shell 命令都必须用 exec_command 的 workdir=${wt} 在该目录下执行，禁止碰其他 checkout。"
  fi
  cat <<PROMPT_EOF
你是本簇执行器。${locator}严格执行 ${brief} 与 ${common} 的全部步骤（方法 / Scope 边界 / 铁律 / 退出条件 / 汇报格式）。完成后按模板汇报，并把你改动的具体文件 git add + git commit。不要跑变异测试。不要碰 Scope 之外的文件。某步卡住超过 2 分钟，记录问题继续推进或合理降级并注明。
PROMPT_EOF
}

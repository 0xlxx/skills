#!/usr/bin/env bash
# check-gates.sh — 跑全部门禁并汇总（机器可检查退出条件）。
#
# 用法:
#   check-gates.sh <workdir> <gate>...                  # gate 格式: 名称::shell 命令
#   check-gates.sh <workdir> --from-file gates.txt      # 每行一个 gate（# 开头为注释）
#
# 示例:
#   check-gates.sh packages/elk-layout \
#     '簇级::bun scripts/verify-elkg-java-layout.ts "tickets/core/9*"' \
#     'bdd::bunx vitest run tests/bdd' \
#     'oracle::bunx vitest run tests/oracle/generated' \
#     '回归::node scripts/diff-failures.mjs collect-all && node scripts/diff-failures.mjs check /tmp/failures-696.json'
#
# 输出: 每个 gate ✅/❌ + 尾部输出摘要；全部通过退出码 0，否则退出码 = 失败数。

set -uo pipefail

workdir="${1:?用法: check-gates.sh <workdir> '名称::命令'...}"
shift

gates=()
if [[ "${1:-}" == "--from-file" ]]; then
  while IFS= read -r line; do
    [[ -z "$line" || "$line" == \#* ]] && continue
    gates+=("$line")
  done < "${2:?缺少 gates 文件}"
else
  gates=("$@")
fi

if [[ ${#gates[@]} -eq 0 ]]; then
  echo "没有 gate。用法: check-gates.sh <workdir> '名称::命令'..." >&2
  exit 2
fi

failed=0
for gate in "${gates[@]}"; do
  name="${gate%%::*}"
  cmd="${gate#*::}"
  echo "── gate: $name ──"
  echo "> cd $workdir && $cmd"
  out="$( (cd "$workdir" && eval "$cmd") 2>&1 )"
  code=$?
  if [[ $code -eq 0 ]]; then
    echo "  ✅ $name PASS"
  else
    echo "  ❌ $name FAIL (exit=$code)"
    failed=$((failed+1))
  fi
  echo "$out" | tail -6
  echo
done

echo "════════ 门禁汇总 ════════"
if [[ $failed -eq 0 ]]; then
  echo "全部通过 ✅"
else
  echo "$failed 个 gate 失败 ❌"
fi
exit $failed

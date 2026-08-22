#!/usr/bin/env bash
# check-secrets.sh — skills 公共仓库提交前安全门禁（须 0 命中）
# 用法：bash scripts/check-secrets.sh
# 覆盖：私钥、生产 IP、apiv2 token、订阅短码、子令牌（portal test/friend 已轮换为占位符，禁止回填）
set -euo pipefail
cd "$(dirname "$0")/.."
HITS=$(grep -rnE 'BEGIN (RSA |EC |OPENSSH )?PRIVATE|23\.106\.158\.198|38\.79\.118\.181|217\.156\.67\.105|3ePJc[1]vW|cZO28TN2[5]icG|a84faa346e85b3d72c5db2059d2742fd|c7c4efd034fc153d5d345c76b5e66958' \
  . 2>/dev/null | grep -v '\.git/' | grep -v 'scripts/check-secrets.sh' || true)
if [ -n "$HITS" ]; then
  echo "✗ 检测到敏感内容（禁止提交到公共仓库）：" >&2
  echo "$HITS" >&2
  exit 1
fi
echo "✅ check-secrets 通过：skills 仓库无真实凭据/IP/令牌"

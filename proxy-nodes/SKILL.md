---
name: proxy-nodes
description: 管理 VPS 代理节点 —— 增、删、改、验证（SSOT 单一事实来源，SSH 必须通过 Bitwarden，节点凭据不入库）。适用任何「多 VPS + sing-box/s-ui + 订阅生成」的代理节点池；部署实例细节见 FILES.md。
disable-model-invocation: true
---

# Proxy Nodes

## 适用范围（先读）

- 本 skill 是**通用工作流**：连接规范、IP 体检、节点生命周期、命名约定、安全红线。换部署可复用。
- **部署实例**（主机表、端口、render.py/sub_server.py/s-ui/cloudflared 具体命令、当前命名）在 [`FILES.md`](FILES.md)——按你的部署调整，不要把它当成通用事实。
- 真实凭据一律在 Bitwarden，见文末「真实值映射」。

> ## ⚠️ 安全与脱敏说明（公共仓库必读）
>
> - 本 skill **不含任何真实凭据、IP、域名或订阅短码**——所有真实值一律用 `<PLACEHOLDER>` 表示。
> - 真实值只存放在 **Bitwarden**（见文末「真实值映射」），使用时从 Bitwarden 取用，**禁止**写回本文件或提交任何含真实值的文件。
> - **订阅短码是敏感信息**：短码对应公开订阅链接，链接内容包含全部节点凭据。切勿把真实短码写入任何文件。
> - 禁止提交：`nodes.json`、私钥、证书、`config-running.json`、`.bak` 备份。
> - **订阅短码是低熵 bearer 凭据**（约 36 bit，可枚举）：Worker 侧应限流/加访问控制，并周期性轮换短码。
> - `nodes.example.json`、快照类文件等入库模板**只允许占位符内容**；提交前用 `grep -nE 'BEGIN.*PRIVATE|[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}'` 校验必须 0 命中。

## Connection（必须通过 Bitwarden）

> ⚠️ SSH key **必须**从 Bitwarden 获取；禁止直接使用本机本地 key 文件。
> SSH key 存放在 Bitwarden item `<BW_SSH_ITEM>` 的 `notes` 字段（含 OPENSSH 格式私钥全文）。

```bash
# 1. 解锁 Bitwarden（如未解锁）：bw unlock，然后 export BW_SESSION="..."
# 2. 取出 SSH key 到随机临时文件（umask 077 保证权限，mktemp 防符号链接预置攻击）
umask 077
SSH_KEY=$(mktemp /tmp/bw-ssh.XXXXXX)
trap 'rm -f "$SSH_KEY"' EXIT INT TERM HUP
bw get item "<BW_SSH_ITEM>" --raw | jq -r '.notes' > "$SSH_KEY"
[ -s "$SSH_KEY" ] || { echo "bw 取 key 失败（未解锁或条目缺失？）"; exit 1; }

# 3. 连接（accept-new：首连记录指纹后严格校验；IdentitiesOnly 只用这把 key）
ssh -o StrictHostKeyChecking=accept-new -o IdentitiesOnly=yes -i "$SSH_KEY" root@<VPS_IP> "<command>"
```

- 前提：`bw` 已登录且解锁（导出 `BW_SESSION`，或每条命令加 `--session <KEY>`）。
- 用完即删：`trap` 在 `EXIT/INT/TERM/HUP` 时清理 `$SSH_KEY`。
- 建议把 `known_hosts` 一并存入 Bitwarden，彻底固定主机指纹。
- 无本地 key 时，恢复入口 = Bitwarden item `<BW_SSH_ITEM>`（见「真实值映射」）。
- **重启主机的 sing-box 可能断开当前 SSH**（若本机流量经该主机 NAT）——见「Add a node」的 nohup 说明。

## IP 体检（新 VPS 接入前必做）

新主机接入节点池前，先跑一次社区权威体检脚本 **xykt/IPQuality**（整合 Maxmind + IPinfo / ipregistry / ipapi / AbuseIPDB / IP2Location / IPQS / DB-IP / Scamalytics + 400+ 黑名单 + 流媒体/AI 解锁 + 邮局连通），确认 IP 类型、风险与解锁能力，避免把不合格（被标记/高滥用/服务不解锁）的 IP 接进来。

```bash
# 经 Bitwarden 取 key 登录目标主机后执行：
#   先装 jq（JSON 输出需要）；-4 只查 IPv4；-n 跳过交互式依赖安装；-p 隐私模式（禁在线报告）
ssh ... root@<VPS_IP> 'apt-get install -y -qq jq >/dev/null 2>&1; \
  bash <(curl -Ls https://IP.Check.Place) -4 -n -j'          # JSON，适合 agent 解析
# 可视化完整报告（含流媒体/邮局排版）：bash <(curl -Ls https://IP.Check.Place) -I
```

### 看哪些字段（按优先级）

1. **IP 类型属性**（各库使用类型 / 公司类型）：`IP2Location=机房` 或多家 `公司类型=机房` → 判机房；IPinfo 系把 Cogent 这类骨干传输商标「家宽」属误判（见下节）。
2. **风险因子**：`服务器=是`（多家）→ 机房 IP；`代理/Tor/VPN=是` → 直接淘汰。
3. **风险评分**：Scamalytics ≥80、ipapi 滥用率偏高、AbuseIPDB 非 0 且黑名单命中多 → 谨慎或换机。
4. **流媒体及 AI 解锁**：记录 ChatGPT / Claude / Gemini / Netflix / YouTube 结果，用于节点命名「能力」标签。
5. **黑名单**：423 个库里命中数；≥3 个黑名单 → 换机。

### 双 ISP / 住宅的判断（避免被商家话术骗）

- 严格标准：ipinfo 的 `asn.type` 与 `company.type` **都为 `isp`**，且指向**同一家真实家宽运营商**（Comcast / AT&T / Charter 等）。
- 常见陷阱：Cogent（AS174）这类骨干/传输商在 ipinfo 里 `asn.type=isp`，会被标成「家宽」；但实际是机房段（IP2Location=机房、多家 `服务器=是`），公司字段常显示租用方（IDC/VPS 商）。**各库结论打架时，以 IP2Location「机房」+ 多家「服务器=是」为准。**
- 需要住宅/双 ISP 的场景（TikTok / 跨境电商矩阵）：机房 IP 不合格，直接排除。
- 代理节点场景（本 skill）：机房 IP 通常可接受，但要求**原生**（无代理/VPN/Tor）+ 低风险 + 目标服务解锁达标。

### 体检结论 → 节点命名

把体检结果（线路/能力）记入「节点命名规范」的能力标签；同一 IP 不同库结论不一致时，在备注注明实测（如「YouTube 区=CN」「25 端口出站被阻断」）。

## 节点生命周期（通用骨架；具体命令见 FILES.md「部署实例」）

**SSOT 原则**：节点定义只在一个地方改（`nodes.json` / s-ui inbound），配置与订阅都由它生成/推送——不要手改生成产物。

### Add a node

1. 按「Connection」取 key 后 SSH 进主机，在 **SSOT** 追加节点（类型/凭据字段见 FILES.md 模板）。
2. 生成配置并重启 sing-box。**注意：重启可能断开当前 SSH**，用 nohup 后台执行，稍后重连验证。
3. 推送订阅。
4. 验证：订阅已含新节点 + 健康检查通过。
5. 提交版本（SSOT 已 gitignore，凭据不入库）。

> 加在别的 VPS：除更新 SSOT（订阅可见）外，还需在目标 VPS 上同步 sing-box inbound，并在该机放行防火墙端口。

### Remove / Change a node

1. 从 SSOT 删除/修改对应条目（改端口/协议时同步调整 inbound 相关字段）。
2. 重新渲染 + 重启 + 推送。
3. 验证：订阅里节点已消失/已变更。

### Verify

健康检查 + 服务状态 + 端口监听（TCP/UDP）+ 订阅完整性。具体命令见 FILES.md。

## 节点命名规范（命名即信息，schema 可按部署调整）

格式（当前部署采用）：`[旗标][城市]-[线路]-[序号]`，例如 `🇺🇸 洛杉矶 CN2 01`、`🇺🇸 洛杉矶 9929 02`、`🛫 洛杉矶中转 01`。

通用约定：
- **地点-线路-序号**：用户一眼知道在哪、什么线路；中转节点用「中转」标注（入口→出口链式节点）。
- **协议用后缀区分**：同节点多协议时，序号区分（`01`=VLESS+Reality、`02`=Trojan）。
- **不暴露 IP/凭据**：节点名不含 IP 地址。
- 可选能力标签：需要时按实测加（如「全解/半解/受限」，定义见 FILES.md）。

## 真实值映射（仅私有记录，禁止提交）

> 本 skill 的所有 `<PLACEHOLDER>` 真实值**集中存放于 Bitwarden**（唯一权威来源）：
>
> - **SSH key**：Bitwarden 条目的 `notes` 字段（OPENSSH 格式私钥全文）
> - **IP / 域名 / 订阅短码 / 节点凭据**：条目字段与附件 `nodes.json`（与服务器 SSOT 一致）
> - **s-ui 面板 / Cloudflare / 订阅域名**：对应 Bitwarden 条目（条目名见私有笔记）
> - 新增主机 IP、端口等：同 `<BW_SSH_ITEM>` 字段
> - 条目名与取值见**私有笔记**，禁止写入任何公共文件。

## 凭据 / 备份

- **SSH key 唯一存放点 = Bitwarden item `<BW_SSH_ITEM>`（notes 字段）**；新增/轮换 key 后必须同步更新该条目。
- 节点 SSOT 含全部凭据，**严禁提交 git**；新增节点后把凭据同步存入 Bitwarden。
- 部署相关备份/快照清单见 FILES.md。

Key files & 部署实例: [`FILES.md`](FILES.md)

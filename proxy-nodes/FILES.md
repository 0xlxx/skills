# 部署实例（本仓库参考部署）

> ⚠️ 这是**实例**，不是通用事实：主机表、端口、命令、命名都是本部署的当前状态。换部署请按你的实际情况调整，并把真实值保持为占位符/存 Bitwarden。

## 实例主机表（真实 IP 见 Secrets Manager「agent」项目）

| 主机 | 角色 | 线路 | 配额 |
|------|------|------|------|
| `<HOST_A>`（主 VPS，CN2-GIA 节点） | s-ui **控制面**（:2095 面板 / :2096 订阅 / :2097 portal）+ **sui-agent 数据面**（CN2 直连 :443/:18443 vless-reality + :8443/udp hysteria2 + :24443 中转） | **CN2 GIA**（电信精品，低延迟） | ~1TB/月 |
| `<HOST_666>`（9929，LA-666 节点） | **sui-agent 数据面**（9929 直连 :443/:18443 vless-reality + :8443/udp hysteria2）+ cloudflared 隧道连接器 | **9929 优化 + Cogent 双 ISP** | ~800GB/月 |
| `<HOST_MD>`（摩尔多瓦，落地/exit） | **sui-agent 数据面**（仅 :443 vless-reality 落地；**防火墙只放行主 VPS IP**，客户端不直连）+ 经主 VPS 中转接入 | 摩尔多瓦（欧洲落地） | 512MB 小内存 |

- 摩尔多瓦落地已接回：重装 Ubuntu 24.04，root 密码已轮换存 Secrets Manager（`MOLDOVA_VPS_PASSWORD`），SSH/ufw/agent 已就绪；接入方式 = 「主 VPS 中转 + 摩尔多瓦落地」，客户端不直连落地机。
- 主 VPS 实测下载 ~2Gbps、666 ~186Mbps（666 端口慢，不适合扛大流量）。

## 参考架构（当前实际）

```
s-ui 控制面（主 VPS :2095/2096/2097，状态全在 SQLite /etc/s-ui/db/s-ui.db）
  ── apiv2 ──> sui CLI（本机，Secrets Manager 自动加载 token + CF Access）
  ├── node CN2-GIA（主 VPS） → inbound 🇺🇸 洛杉矶 CN2 01/02/03（:443/:18443 vless-reality，:8443/udp hysteria2）
  ├── node LA-666（9929）    → inbound 🇺🇸 洛杉矶 9929 01/02/03（:443/:18443 vless-reality，:8443/udp hysteria2）
  └── inbound 🛫 洛杉矶中转 01（主 VPS :24443 vless-reality → 666 出口，仅手动）
  ├── node MD（摩尔多瓦）   → inbound 🇲🇩 摩尔多瓦落地 01（:443 vless-reality，防火墙仅放行主 VPS IP）
  └── inbound 🛫 摩尔多瓦中转 01（主 VPS :24444 vless-reality → MD 出口，node relay 管理）

订阅：subs.bjorn.men/sub/<client>（s-ui 原生 :2096）→ sub.bjorn.men/clash（sublink-worker 转换器）；sub.bjorn.men/c/<短码> 302 短链
面板：panel.bjorn.men/app（CF Access 保护）；订阅域名禁止裸 IP 明文
```

**订阅策略（sublink-worker /clash 模板）**：
- 自动组默认 **url-test**（每个客户端按自己网络选最快线路：电信→CN2、联通→9929）；`auto_strategy=load-balance` 可切回负载均衡。
- **中转节点不进自动组**（链式出口双倍烧配额：1GB 用户流量 ≈ 两台面板各 2GB），只在「🚀 节点选择」手动选。
- 中转只用于需要特定出口的备用/应急场景（`🛫 洛杉矶中转 01`→666、`🛫 摩尔多瓦中转 01`→MD）。
- **hysteria2 也不进自动组**（手动选；避免 url-test 对 UDP 链路误判）。

## 关键文件

| 文件/条目 | 作用 |
|------|------|
| Secrets Manager secret `SSH_KEY_PROXY_VPS` | **SSH key 唯一存放点**（OPENSSH 私钥全文，连接必须经它获取） |
| Secrets Manager secrets `PANEL_ADMIN_USER` / `PANEL_ADMIN_PASSWORD` | s-ui 面板 admin 凭据；面板/订阅域名、隧道信息见私有笔记 |
| `/etc/s-ui/db/s-ui.db`（主 VPS） | **控制面 SSOT**（节点/入站/用户/订阅/配置全部状态，SQLite；备份见「主控备份/恢复」） |
| Secrets Manager secrets `SUI_TOKEN` / `SUI_CF_ACCESS_ID` / `SUI_CF_ACCESS_SECRET` | s-ui 面板 API + Cloudflare Access 认证（`sui` wrapper 自动读取） |
| Secrets Manager secrets `MAIN_VPS_IP` / `PROXY_DOMAIN` / `SUBLINK_DOMAIN` / `SUB_SHORT_CODE` | 主机 IP / 代理域名 / 订阅域名 / 订阅短码 |
| Secrets Manager secret `MOLDOVA_VPS_PASSWORD` | 摩尔多瓦 root SSH 密码（2026-08-24 轮换，SSH/ufw/agent 用） |
| `/etc/systemd/system/{sui,sui-agent}.service` | 控制面（:2095/2096/2097）/ 节点数据面（:443/:18443/…）systemd unit |
| `/etc/cloudflared/config.yml`（`<HOST_666>`） | Cloudflare Tunnel 连接器配置（ingress 面板/订阅/portal 域名 → 主 VPS） |
| `~/.cloudflared/cert.pem`（本机） | cloudflared OAuth 证书（建隧道/DNS 用） |
| `~/backups/s-ui/`（本机）+ `/root/sui-backups/`（主 VPS） | 控制面数据库备份（sui-backup / 每日 03:17 cron） |
| ~~`/etc/sing-box/*`~~（旧栈，已归档 `.bak-*`） | **旧 sing-box + render.py + sub_server.py + nodes.json 栈已停用**（勿恢复） |

## 部署命令（当前栈）

### s-ui 控制面（CLI 在本地：`sui`，自动从 Secrets Manager 加载认证）

```bash
# sui 自动从 Secrets Manager 加载认证（无需 bw 解锁）
sui node list --concise                 # 节点列表
sui inbound list --concise              # inbound 列表（tag/type/node/port）
sui client create --name X --volume 1G --inbounds 2,4,6,8 --expiry +3m   # 建用户（expiry 支持 +3m/+1h/+30d）
sui client list --concise               # 用户/配额/流量/到期
sui inbound delete --tag "<TAG>"        # 删 inbound（clients 自动解绑）
sui show sub preview --client test --format clash   # 预览某用户订阅
sui show settings --key subClashExt --value "<yaml>" # 改 clash 模板（按需）
```

### 用户管理速查表（sui client）

```bash
sui doctor                                                        # 一键体检认证链路（token/secret/面板连通）
sui inbound list --concise                                            # 查 inbound id（建号 --inbounds 用）
sui client create --name X --volume 20G --inbounds 2,4,6,8 --expiry +30d  # 建号（volume 支持 100G/10T/500M；expiry 支持 +3m/+1h/+30d）
sui client list --concise                                                  # 看全部：id/name/quota/流量/到期
sui client edit --id N --volume 100G        # 改额度（流量计数保留）
sui client edit --id N --expiry +30d        # 改到期（unix 秒或 +30d）
sui client edit --id N --enable false       # 封禁 / true 解封
sui client reset-traffic --id N             # 清零已用流量
sui client reset-token --id N                # 轮换订阅令牌（泄漏链接立即作废，返回新 subToken）
sui client delete --id N                    # 删除用户
sui show sub preview --client X --format clash   # 预览某用户订阅
```

### 节点管理（sui CLI + sui-agent 数据面）

```bash
# 新增 VPS 节点：
sui node create --name <NODE> --address <HOST>            # 返回 nodeId + 节点 token
sudo bash scripts/install-agent.sh --master https://<PANEL_DOMAIN>/app --token <node-token> --name <NODE>
sui node list --concise                                   # 验证 online（status/heartbeat）

# 给节点一次性加协议（DNS A 记录 → ACME TLS → 建 inbound → 绑用户 → 防火墙；幂等可重跑）：
sui node add-protocols --node <NODE> --protocols "trojan:18443,hysteria2:8443" \
  --domain <NODE_DOMAIN> --dns <IP> --cf-token $CF_TOKEN --clients 1,4 --firewall [--dry-run]

# 中转/落地（入口节点 → 落地机，node relay 管理）：
sui node relay list --node <入口节点>                        # 查看（默认不含 uuid，--verbose 才含）
sui node relay add --node <入口> --inbound "<🛫 xx中转 01>" \
  --exit <落地机> --exit-inbound "<🇲🇩 xx落地 01>" --via-client <relay账户> \
  --tag relay-<地点> --dry-run                               # 派生模式，先看推导再实跑
sui node relay rm --id N                                      # 或 --node <入口> --tag relay-<地点>
sui node relay edit --id N --tcp-fast-open                    # fetch-merge 局部改（如开 TFO）
# Hysteria2 加完还要（add-protocols 不做）：
#  1) 注入 obfs + 端口跳跃范围（不进 Auto 组）：
#     sui ops save --object inbounds --action edit --data '{"id":<INBOUND_ID>,"obfs":{"type":"salamander","password":"<pw>"},"server_ports":["8443:8453"]}'
#  2) 规范命名（inferLocation 对空格 tag 失效）：
#     sui inbound edit --id <INBOUND_ID> --tag "<地点-线路-03>"
#  3) 服务端：iptables REDIRECT 8443:8453→8443 + ufw allow 8443:8453/udp（见「已知坑 6」）

# 改完立即验证订阅（不用等客户端导入）：
sui show sub preview --client <NAME> --format clash
sui node status --id N                                    # 节点完整状态
sui show onlines                                          # 当前在线 inbound/用户
```

### 主控备份 / 恢复（重要：配置曾被误清空）

```bash
sui-backup --keep 10                       # 本地按需备份（远端 sqlite3 在线快照 → 下载 ~/backups/s-ui/）
# VPS 每日 03:17 自动快照已装：/root/sui-backups/（保留 7 份）
# 恢复：scp 回主 VPS → systemctl stop sui → 覆盖 /etc/s-ui/db/s-ui.db → systemctl start sui
#   （恢复前先另存当前库；只替换 .db，WAL 会自动重建）
```

### 凭据轮换（安全项，按需执行）

```bash
# 1) machine access token 轮换（BWS 机器账户）：
#    Bitwarden 网页 → Secrets Manager → Machine Accounts → <机器账户> → Create access token
#    新 token 只显示一次；然后本地覆盖（0600）并验证：
install -m 600 /path/to/new-token "$HOME/.config/bws/access-token"
sui doctor                                  # 验证新 token 可用
#    旧 token 在网页端删除

# 2) 订阅子令牌轮换（client 级）：
#    sui client reset-token --id N        # 已实现（需控制面 ≥ 8906f2d；部署后可用）
#    # 回退：面板 admin（用户 → 编辑 → 订阅令牌）或 DB 更新 sub_token 后重启 sui

# 3) 清理个人 vault 已迁移条目：
#    确认 SM 稳定后，删除 bw 中 sui-panel / proxy-vps 已迁移字段（SSOT 只留 Secrets Manager）
```

### Cloudflare CLI / 隧道

```bash
cloudflared tunnel list / info <TUNNEL_NAME> / route dns <TUNNEL_NAME> <SUB_DOMAIN> / delete <TUNNEL_NAME>
# 连接器在 <HOST_666>：systemctl is-active cloudflared；journalctl -u cloudflared | grep 'Registered tunnel'
# 面板登录：https://<PANEL_DOMAIN>/app/（admin 凭据在 Secrets Manager）
```

### 防火墙

```bash
ufw allow <port>/tcp          # 放行节点端口
# 面板/订阅端口仅允许连接器 IP（防裸 IP 明文访问）
```

## 命名实例与能力定义

- 当前命名：`🇺🇸 洛杉矶 CN2 01/02/03`、`🇺🇸 洛杉矶 9929 01/02/03`、`🛫 洛杉矶中转 01`、`🛫 摩尔多瓦中转 01`、`🇲🇩 摩尔多瓦落地 01`。
  - `01`=VLESS+Reality :443、`02`=VLESS+Reality :18443、`03`=Hysteria2 :8443/udp（obfs-salamander + 端口跳跃）。
  - **trojan 已移除**（曾用 us1/us2 真域名 = 明文 SNI，被墙风险；全部换 Reality）。
- 能力标签（可选，以 lmc999 RegionRestrictionCheck 实测为准）：
  - `全解`：ChatGPT / Claude / Gemini / YouTube Premium / Netflix 全库 / Disney+ 均可
  - `半解`：ChatGPT / Claude / Netflix / Disney+ 可，Gemini / YouTube Premium 不可
  - `受限`：ChatGPT / Claude / Gemini 可，但 Netflix 仅自制剧、部分流媒体平台被禁

## 协议安全基线（本部署强制）

- **一律 vless+Reality**（无证书、诱饵 SNI=swdist.apple.com、抗主动探测）或 **hysteria2 + ACME 真证书 + obfs-salamander**（QUIC 含 SNI 全混淆）。
- **禁止**：明文域名（trojan/anytls 这类真证书明文 SNI）、自签证书、无 TLS。
- 新协议先查 sing-box 文档/changelog 再引入；`anytls` 也是明文 SNI，**不采用**。

## 已知坑（踩过的，重建/排障必读）

1. **sui-agent 必须带 `with_acme` tag 编译**：缺它时 trojan/hysteria2 这类 ACME inbound 静默失败（agent 一直 keep old config、节点 degraded，日志报 `ACME is not included in this build`）。统一用 `scripts/build.sh` 完整 tag 集（`with_quic,with_grpc,with_utls,with_acme,with_gvisor,with_tailscale,badlinkname,tfogo_checklinkname0`）；交叉编译 `GOOS=linux GOARCH=amd64 ./scripts/build.sh`（需 zig）。
2. **`server_ports` 是订阅专用字段**：它进 DB Options（订阅渲染 `ports: 8443-8453` 端口跳跃），但 sing-box **inbound 不接受**（outbound-only，报 `unknown field "server_ports"`）。控制面 `GetAllConfigByNode` 已做剥离；手动改配置时别把它塞进节点侧。
3. **控制面 inbound edit 的节点刷新**：`service/config.go` 已修——edit 带 `id` 即可按 id 反查并 bump 节点 `config_version`（旧版必须 payload 同时含 `node_id`+`tag` 才 bump，`ops save` 只发 `{id, options}` 会静默不刷新）。
4. **hysteria2 订阅渲染**：`util/outJson.go` 的 `hysteria2Out` 必须复制 `server_ports` 到 OutJson，否则 clash 订阅不出 `ports`。改完要重新触发一次 inbound edit 让 OutJson 重建。
5. **`inferLocation` 用 `-` 切 tag 前缀**，本部署 tag 用空格（`🇺🇸 洛杉矶 9929 01`）→ 自动命名退化为 `proto-id`（如 `hysteria2-30`）；建完 inbound 手动 `sui inbound edit --id N --tag "<规范名>"`。
6. **端口跳跃**：hysteria2 服务端只监听单端口，跳跃靠客户端随机目标端口 + 服务端 iptables `REDIRECT` 范围到实际端口（两台节点都加：`iptables -t nat -A PREROUTING -p udp --dport 8443:8453 -j REDIRECT --to-ports 8443`）+ ufw 放行范围 `8443:8453/udp`。换机器记得重加。
7. **运营监控**：主 VPS `/usr/local/bin/sui-alert.sh`（cron */10）→ Telegram：用户配额≥80%、≤3 天到期、节点心跳 >180s 离线、portal/sub/panel HTTP 异常。配置 `/etc/sui-alert/config`（0600，TELEGRAM_BOT_TOKEN/CHAT_ID）。
8. **中转出站必须用专用中转账户**：relay 出站（node_outbounds）的 uuid 必须是**永久启用、无限量（volume=0）**的专用 client（如 `relay`），不能借用普通用户——普通用户被禁用/到期后 uuid 从出口 inbound users 移除，中转链路静默断开（`sui node` 仍 online，但中转节点连不上）。建法：`sui client create --name relay --volume 0 --inbounds <出口inbound id>`，再把 relay 出站 options.uuid 改成它的 uuid（`sui node relay edit --id N --uuid <新uuid>`，fetch-merge 只改这一处）。
9. **`clients.inbounds` BLOB + SQLite json_each 怪癖**：inbounds 以 BLOB 存储，`json_each` 对特定值（如 `[2,32]`）直接报 `malformed JSON`，把**全部节点**配置渲染拖挂（所有 agent `poll rejected`、主控日志刷 `WARNING - failed : malformed JSON`）。后端已统一 `CAST(... AS TEXT)` 修复（service/inbounds.go、client.go）；再遇到先 `select id,name,json_valid(cast(inbounds as text)) from clients;` 定位坏行。


> 历史（已归档，勿恢复）：x-ui (3x-ui) 与 caddy 已停用；**sing-box + render.py + sub_server.py + nodes.json 旧栈已归档**（服务 disabled，文件在 /etc/sing-box 下改名 .bak-*）；摩尔多瓦 VPS 曾退款移除，2026-08-24 已重装（Ubuntu 24.04）接回为「主 VPS 中转 + 摩尔多瓦落地」。

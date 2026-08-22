# 部署实例（本仓库参考部署）

> ⚠️ 这是**实例**，不是通用事实：主机表、端口、命令、命名都是本部署的当前状态。换部署请按你的实际情况调整，并把真实值保持为占位符/存 Bitwarden。

## 实例主机表（真实 IP 见 Secrets Manager「agent」项目）

| 主机 | 角色 | 线路 | 配额 |
|------|------|------|------|
| `<HOST_A>`（主 VPS，CN2-GIA 节点） | s-ui **控制面**（:2095 面板 / :2096 订阅 / :2097 portal）+ **sui-agent 数据面**（CN2 直连 :443/:18443/:24443） | **CN2 GIA**（电信精品，低延迟） | ~1TB/月 |
| `<HOST_666>`（9929，LA-666 节点） | **sui-agent 数据面**（9929 直连 :443/:18443）+ cloudflared 隧道连接器 | **9929 优化 + Cogent 双 ISP** | ~800GB/月 |

- 摩尔多瓦旧落地已退款移除，不在节点池。
- 主 VPS 实测下载 ~2Gbps、666 ~186Mbps（666 端口慢，不适合扛大流量）。

## 参考架构（当前实际）

```
s-ui 控制面（主 VPS :2095/2096/2097，状态全在 SQLite /etc/s-ui/db/s-ui.db）
  ── apiv2 ──> sui CLI（本机，Secrets Manager 自动加载 token + CF Access）
  ├── node CN2-GIA（主 VPS） → inbound 🇺🇸 洛杉矶 CN2 01/02（:443 vless / :18443 trojan，sui-agent 监听）
  ├── node LA-666（9929）    → inbound 🇺🇸 洛杉矶 9929 01/02（:443 vless / :18443 trojan，sui-agent 监听）
  └── inbound 🛫 洛杉矶中转 01（主 VPS :24443 → 666 出口，仅手动）

订阅：subs.bjorn.men/sub/<client>（s-ui 原生 :2096）→ sub.bjorn.men/clash（sublink-worker 转换器）；sub.bjorn.men/c/<短码> 302 短链
面板：panel.bjorn.men/app（CF Access 保护）；订阅域名禁止裸 IP 明文
```

**订阅策略（sublink-worker /clash 模板）**：
- 自动组默认 **url-test**（每个客户端按自己网络选最快线路：电信→CN2、联通→9929）；`auto_strategy=load-balance` 可切回负载均衡。
- **中转节点不进自动组**（链式出口双倍烧配额：1GB 用户流量 ≈ 两台面板各 2GB），只在「🚀 节点选择」手动选。
- 中转只用于需要 666 出口的特定场景（备用/应急）。

## 关键文件

| 文件/条目 | 作用 |
|------|------|
| Secrets Manager secret `SSH_KEY_PROXY_VPS` | **SSH key 唯一存放点**（OPENSSH 私钥全文，连接必须经它获取） |
| Secrets Manager secrets `PANEL_ADMIN_USER` / `PANEL_ADMIN_PASSWORD` | s-ui 面板 admin 凭据；面板/订阅域名、隧道信息见私有笔记 |
| `/etc/s-ui/db/s-ui.db`（主 VPS） | **控制面 SSOT**（节点/入站/用户/订阅/配置全部状态，SQLite；备份见「主控备份/恢复」） |
| Secrets Manager secrets `SUI_TOKEN` / `SUI_CF_ACCESS_ID` / `SUI_CF_ACCESS_SECRET` | s-ui 面板 API + Cloudflare Access 认证（`sui` wrapper 自动读取） |
| Secrets Manager secrets `MAIN_VPS_IP` / `PROXY_DOMAIN` / `SUBLINK_DOMAIN` / `SUB_SHORT_CODE` | 主机 IP / 代理域名 / 订阅域名 / 订阅短码 |
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

- 当前命名：`🇺🇸 洛杉矶 CN2 01/02`、`🇺🇸 洛杉矶 9929 01/02`、`🛫 洛杉矶中转 01`（地点-线路-序号；`01`=VLESS+Reality、`02`=Trojan）。
- 能力标签（可选，以 lmc999 RegionRestrictionCheck 实测为准）：
  - `全解`：ChatGPT / Claude / Gemini / YouTube Premium / Netflix 全库 / Disney+ 均可
  - `半解`：ChatGPT / Claude / Netflix / Disney+ 可，Gemini / YouTube Premium 不可
  - `受限`：ChatGPT / Claude / Gemini 可，但 Netflix 仅自制剧、部分流媒体平台被禁

> 历史（已归档，勿恢复）：x-ui (3x-ui) 与 caddy 已停用；**sing-box + render.py + sub_server.py + nodes.json 旧栈已归档**（服务 disabled，文件在 /etc/sing-box 下改名 .bak-*）；摩尔多瓦 VPS 已退款移除。

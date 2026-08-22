# 部署实例（本仓库参考部署）

> ⚠️ 这是**实例**，不是通用事实：主机表、端口、命令、命名都是本部署的当前状态。换部署请按你的实际情况调整，并把真实值保持为占位符/存 Bitwarden。

## 实例主机表（真实 IP 见 Bitwarden）

| 主机 | 角色 | 线路 | 配额 |
|------|------|------|------|
| `<HOST_A>`（主 VPS） | s-ui **控制面** + sing-box 出口（CN2 直连）+ node agent | **CN2 GIA**（电信精品，低延迟） | ~1TB/月 |
| `<HOST_666>`（9929） | sing-box 出口（9929 直连）+ node agent + cloudflared 隧道连接器 | **9929 优化 + Cogent 双 ISP** | ~800GB/月 |

- 摩尔多瓦旧落地已退款移除，不在节点池。
- 主 VPS 实测下载 ~2Gbps、666 ~186Mbps（666 端口慢，不适合扛大流量）。

## 参考架构（当前实际）

```
s-ui 控制面（主 VPS）── apiv2 ──> sui CLI（本机，bw 自动加载 token + CF Access）
  ├── inbound: 🇺🇸 洛杉矶 CN2 01/02（主 VPS 直连 :443 / trojan :18443）
  ├── inbound: 🇺🇸 洛杉矶 9929 01/02（666 直连 :443 / trojan :18443）
  └── inbound: 🛫 洛杉矶中转 01（主 VPS :24443 → 666 出口，仅手动）

订阅渲染：subs.bjorn.men/sub/<token>（s-ui 原生）→ sub.bjorn.men/clash（sublink-worker 转换器）
面板：panel.bjorn.men/app（CF Access 保护）；订阅域名禁止裸 IP 明文
```

**订阅策略（sublink-worker /clash 模板）**：
- 自动组默认 **url-test**（每个客户端按自己网络选最快线路：电信→CN2、联通→9929）；`auto_strategy=load-balance` 可切回负载均衡。
- **中转节点不进自动组**（链式出口双倍烧配额：1GB 用户流量 ≈ 两台面板各 2GB），只在「🚀 节点选择」手动选。
- 中转只用于需要 666 出口的特定场景（备用/应急）。

## 关键文件

| 文件/条目 | 作用 |
|------|------|
| Bitwarden item `<BW_SSH_ITEM>` | **SSH key 唯一存放点**（notes 字段含私钥全文，连接必须经它获取） |
| Bitwarden item `<BW_PANEL_ITEM>` | s-ui 面板 admin 凭据 + 面板/订阅域名 + 隧道信息 |
| `/etc/sing-box/nodes.json` | **SSOT 节点定义**（含全部凭据，gitignored，勿提交） |
| `/etc/sing-box/render.py` | 生成器：nodes.json → config-running.json / raw / push |
| `/etc/sing-box/sub_server.py` | 订阅生成 + 短链推送（读 nodes.json，启动自动推送） |
| `/etc/sing-box/config-running.json` | sing-box 入站配置（由 render.py 生成，勿手改） |
| `/etc/sing-box/healthcheck.py` | 健康检查脚本（cron 每 5 分钟） |
| `/etc/systemd/system/{sing-box,sub-server}.service` | sing-box / sub-server systemd unit |
| `/etc/cloudflared/config.yml`（`<HOST_666>`） | Cloudflare Tunnel 连接器配置（ingress 面板/订阅域名 → 主 VPS） |
| `~/.cloudflared/cert.pem`（本机） | cloudflared OAuth 证书（建隧道/DNS 用） |

## 部署命令（当前栈）

### s-ui 控制面（CLI 在本地：`sui`，自动从 bw 加载认证）

```bash
export BW_SESSION="..."                 # bw unlock 后
sui node list --concise                 # 节点列表
sui inbound list --concise              # inbound 列表（tag/type/node/port）
sui client create --name X --volume 1G --inbounds 2,4,6,8 --expiry +3m   # 建用户（expiry 支持 +3m/+1h/+30d）
sui client list --concise               # 用户/配额/流量/到期
sui inbound delete --tag "<TAG>"        # 删 inbound（clients 自动解绑）
sui show sub preview --client test --format clash   # 预览某用户订阅
sui show settings --key subClashExt --value "<yaml>" # 改 clash 模板（按需）
```

### 直连节点（render.py 栈）

```bash
# 增/删/改后：
cd /etc/sing-box && python3 render.py config <HOST_ID>
nohup systemctl restart sing-box >/tmp/sb-restart.log 2>&1 &   # 重启可能断 SSH，用 nohup
systemctl restart sub-server                                    # 推送订阅
curl -sL "https://<SUBLINK_DOMAIN>/c/<SHORT_CODE>" | grep '<NODE_NAME>'   # 订阅已含/已移除
/etc/sing-box/healthcheck.py                                    # 服务+端口+订阅完整性
```

### Cloudflare CLI / 隧道

```bash
cloudflared tunnel list / info <TUNNEL_NAME> / route dns <TUNNEL_NAME> <SUB_DOMAIN> / delete <TUNNEL_NAME>
# 连接器在 <HOST_666>：systemctl is-active cloudflared；journalctl -u cloudflared | grep 'Registered tunnel'
# 面板登录：https://<PANEL_DOMAIN>/app/（admin 凭据在 <BW_PANEL_ITEM>）
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

> 历史（已归档，勿恢复）：x-ui (3x-ui) 与 caddy 已停用；摩尔多瓦 VPS 已退款移除。

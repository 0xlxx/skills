---
name: proxy-nodes
description: 管理 VPS 代理节点 —— 增、删、改、验证（SSOT 单一事实来源，SSH 必须通过 Bitwarden）。
disable-model-invocation: true
---

# Proxy Nodes

> ## ⚠️ 安全与脱敏说明（公共仓库必读）
>
> - 本 skill **不含任何真实凭据、IP、域名或订阅短码**——所有真实值一律用 `<PLACEHOLDER>` 表示。
> - 真实值只存放在 **Bitwarden**（见文末「真实值映射」），使用时从 Bitwarden 取用，**禁止**写回本文件或提交任何含真实值的文件。
> - **订阅短码是敏感信息**：短码对应公开订阅链接，链接内容包含全部节点凭据（uuid/密码/密钥）。切勿把真实短码写入任何文件。
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

主机清单（真实 IP 见 Bitwarden）：

| 主机 | 角色 |
|------|------|
| `<HOST_A>`（主 VPS） | sing-box 出口 + sub-server + 订阅 SSOT（`<PROXY_DOMAIN>`） |
| `<HOST_B>`（第二台 VPS） | sing-box 出口（示例节点 `<MD_NODE_NAME>`） |
| `<HOST_MD>`（摩尔多瓦） | s-ui 控制面 + 面板（`<PANEL_PORT>` / `<SUB_PORT>`）+ 节点 agent（trojan `<TROJAN_PORT>`） |
| `<HOST_666>`（9929） | s-ui 节点 agent（VLESS+Reality :443）+ cloudflared 隧道连接器 |

## Architecture

```
<HOST_A>（root）
  │
  ├── sing-box               → 唯一代理内核，systemd 管理
  │   config: /etc/sing-box/config-running.json  ← 由 render.py 生成，勿手改
  │
  ├── SSOT                   → /etc/sing-box/nodes.json（唯一节点定义，含凭据，gitignored）
  │   render.py: nodes.json → config-running.json / raw / push
  │   git: /etc/sing-box 已版本化（nodes.json 不入库）
  │
  ├── sub-server             → 订阅生成器，systemd 管理
  │   script: /etc/sing-box/sub_server.py（读 nodes.json，启动时自动推短链）
  │   port:   127.0.0.1:12096（仅本地）
  │
  └── sublink-worker         → 短链 (Cloudflare Worker，真正渲染 Clash 模板)
      订阅: https://<SUBLINK_DOMAIN>/c/<SHORT_CODE>

<HOST_B>（root）
  └── sing-box               → VLESS+Reality :443（config-running.json 静态管理）
```

- **节点定义只改 `/etc/sing-box/nodes.json`**，主机的 sing-box 配置与订阅均由它生成/推送。
- x-ui (3x-ui) 与 caddy **已停用**（内核已收敛为 sing-box）；如需恢复面板：`systemctl enable --now x-ui caddy`（备份 `/root/x-ui.db.bak-*`）。
- 健康检查：`/etc/sing-box/healthcheck.py`，cron 每 5 分钟。
- 另有 s-ui 多节点控制面：主控在 `<HOST_MD>`（面板 `<PANEL_PORT>`，订阅 `<SUB_PORT>`），节点 agent 部署于 `<HOST_MD>` 与 `<HOST_666>`；面板经 Cloudflare Tunnel 暴露在 `<PANEL_DOMAIN>`（见「Cloudflare CLI / 域名与隧道」）。

## Add a node

1. 按「Connection」经 Bitwarden 取 key 后 SSH 进主机，编辑 `/etc/sing-box/nodes.json` 的 `nodes` 数组追加（`host` 决定渲染/归属：`<HOST_A_ID>`=主 VPS，`<HOST_B_ID>`=第二台）：

   ```json
   // trojan（TCP，TLS 用 LE 证书）
   {"name":"<NODE_NAME>","host":"<HOST_A_ID>","type":"trojan","server":"<PROXY_DOMAIN>","port":<PORT>,"password":"<PASS>",
    "tls_cert":"<CERT_DIR>/fullchain.pem","tls_key":"<CERT_DIR>/privkey.pem"}

   // vless reality（TCP）
   {"name":"<NODE_NAME>","host":"<HOST_A_ID>","type":"vless","server":"<PROXY_DOMAIN>","port":<PORT>,"uuid":"<UUID>","sni":"<DEST>",
    "rpbk":"<PUBKEY>","rsid":"<SHORTID>","reality_private_key":"<PRIVKEY>","reality_short_ids":["<SHORTID>"],
    "handshake_server":"<DEST>"}

   // hysteria2（UDP）
   {"name":"<NODE_NAME>","host":"<HOST_A_ID>","type":"hysteria2","server":"<PROXY_DOMAIN>","port":<PORT>,"password":"<PASS>",
    "sni":"<PROXY_DOMAIN>","tls_cert":"<CERT_DIR>/fullchain.pem","tls_key":"<CERT_DIR>/privkey.pem"}
   ```

   生成 reality 凭据：`sing-box generate reality-keypair`、`sing-box generate uuid`。

2. 生成配置并重启 sing-box。**注意：重启可能断开当前 SSH**，用 nohup 后台执行，稍后重连验证：

   ```bash
   cd /etc/sing-box && python3 render.py config <HOST_A_ID>
   nohup systemctl restart sing-box >/tmp/sb-restart.log 2>&1 &
   ```

3. 推送订阅（sub-server 重启时自动推送；也可手动 `python3 render.py push`）：

   ```bash
   systemctl restart sub-server
   ```

4. 验证：

   ```bash
   curl -sL "https://<SUBLINK_DOMAIN>/c/<SHORT_CODE>" | grep '<NODE_NAME>'   # 订阅已含
   /etc/sing-box/healthcheck.py                                              # 服务+端口+订阅完整性
   ```

5. 提交版本：`cd /etc/sing-box && git add -A && git commit -m "..."`（nodes.json 已被 .gitignore，不会入库）。

> **加在别的 VPS（如 `<HOST_B>`）**：除更新 nodes.json（订阅可见）外，还需在目标 VPS 上手工同步 sing-box inbound（当前为静态 `config-running.json`，与 nodes.json 字段保持一致），并在该机放行防火墙端口（ufw：`ufw allow <port>/tcp`）。

## Remove a node

1. 从 `/etc/sing-box/nodes.json` 删除该条目
2. `python3 render.py config <HOST_A_ID>` + nohup 重启 sing-box + `systemctl restart sub-server`
3. `curl -sL "https://<SUBLINK_DOMAIN>/c/<SHORT_CODE>" | grep '<NODE_NAME>'` — 无输出即成功

## Change a node

1. 修改 `nodes.json` 对应字段（改端口/协议时同步调整 inbound 相关字段）
2. 重新渲染 + 重启 + 推送（同上）
3. `curl -sL "https://<SUBLINK_DOMAIN>/c/<SHORT_CODE>" | grep '<NODE_NAME>'` 确认变更生效

## Verify

```bash
/etc/sing-box/healthcheck.py                   # 服务 + TCP/UDP 端口 + 订阅完整性
systemctl is-active sing-box sub-server        # 服务状态
ss -tlnp | grep sing-box                       # TCP 监听
ss -ulnp | grep sing-box                       # UDP 监听（hy2）
curl -sL "https://<SUBLINK_DOMAIN>/c/<SHORT_CODE>" | grep 'name:'   # 短链节点
fail2ban-client status sshd                    # SSH 防护（主机白名单已含自身 IP）
```

## Cloudflare CLI / 域名与隧道（面板/短链接入）

> 用 Cloudflare CLI（`wrangler` + `cloudflared`）管理 `<MAIN_DOMAIN>` 下的子域名与内网服务暴露。
> 所有真实值（账号密码、隧道 ID、域名）只存 Bitwarden；本文件仅占位符。

### 前置与授权

- 本机已装：`wrangler`（Workers/通用）与 `cloudflared`（隧道）：`brew install cloudflared`。
- OAuth 登录（需用户在**自己的浏览器**手动授权；自动化浏览器会被 CF Turnstile 人机验证拦截）：

  ```bash
  wrangler login              # 完成后 wrangler whoami 确认账号
  cloudflared tunnel login    # 生成 ~/.cloudflared/cert.pem（隧道/DNS 操作必需）
  ```

- 权限要点：wrangler OAuth 只有 `zone:read`，**不能写 DNS**；DNS 记录必须走
  `cloudflared tunnel route dns`（其 OAuth 含 Zone DNS 写），或先在 dashboard 生成
  带 `Zone:DNS:Edit` 的 API Token 再设 `CLOUDFLARE_API_TOKEN`。
- Cloudflare 账号密码：Bitwarden item `<BW_CF_ITEM>`（账号 `<CF_ACCOUNT>`）。

### 为什么用 Cloudflare Tunnel（而非 A 记录直连）

- origin 的 443 已被 sing-box / s-ui agent 占用，A 记录无法指定端口；
- 小内存 VPS（如 `<HOST_MD>`）不再多跑常驻进程——连接器放在内存充裕的 `<HOST_666>`；
- 连接器**出站**连 CF 边缘：无需开新端口、无需公网证书；TLS 由 CF 边缘终结（Universal SSL 自动签发）。

### 新建子域名并暴露面板

```bash
# 1) 创建隧道（名字唯一；credentials JSON 写到 ~/.cloudflared/<TUNNEL_ID>.json，勿外泄勿提交）
cloudflared tunnel create <TUNNEL_NAME>

# 2) 建 DNS CNAME：<PANEL_DOMAIN> → 隧道（自动 proxied，CF 边缘 TLS）
cloudflared tunnel route dns <TUNNEL_NAME> <PANEL_DOMAIN>

# 3) 连接器配置（部署在哪台就放哪台，示例 /etc/cloudflared/config.yml）
#    tunnel: <TUNNEL_ID>
#    credentials-file: /etc/cloudflared/<TUNNEL_ID>.json
#    ingress:
#      - hostname: <PANEL_DOMAIN>
#        service: http://<HOST_MD_IP>:<PANEL_PORT>   # s-ui 控制面面板
#      - hostname: <SUB_DOMAIN>
#        service: http://<HOST_MD_IP>:<SUB_PORT>     # s-ui 订阅（禁止裸 IP）
#      - service: http_status:404
```

连接器部署（示例：`<HOST_666>`，systemd 常驻）：

```bash
curl -sL -o /usr/local/bin/cloudflared https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64 && chmod +x /usr/local/bin/cloudflared
scp ~/.cloudflared/<TUNNEL_ID>.json root@<HOST_666_IP>:/etc/cloudflared/
# /etc/cloudflared/config.yml 同第 3) 步（credentials-file 用 /etc/cloudflared/ 绝对路径）
# systemd: ExecStart=/usr/local/bin/cloudflared tunnel --config /etc/cloudflared/config.yml run
#          Restart=on-failure；After=network-online.target
systemctl daemon-reload && systemctl enable --now cloudflared
```

验证：

```bash
curl -sS -o /dev/null -w '%{http_code}\n' https://<PANEL_DOMAIN>/app/login   # 200
systemctl is-active cloudflared                                              # 连接器 active
journalctl -u cloudflared | grep 'Registered tunnel'                         # 已注册连接
```

管理命令：

```bash
cloudflared tunnel list                                   # 全部隧道
cloudflared tunnel info <TUNNEL_NAME>                     # 隧道详情（含 DNS 路由）
cloudflared tunnel route dns <TUNNEL_NAME> <NEW_DOMAIN>   # 同一隧道再加子域名
cloudflared tunnel delete <TUNNEL_NAME>                   # 删除（先删对应 DNS 记录）
```

> 面板登录：`https://<PANEL_DOMAIN>/app/`，admin 凭据存 Bitwarden item `<BW_PANEL_ITEM>`。
> **禁止裸 IP 明文**：在 s-ui 设置 `subDomain=<SUB_DOMAIN>`（启用 Host 校验，裸 IP 访问订阅返回 403），
> 并把 MD 的 `<PANEL_PORT>` / `<SUB_PORT>` 用 ufw 限制为仅连接器 IP（如 `<HOST_666_IP>`），
> 订阅地址即 `https://<SUB_DOMAIN>/sub/<subToken>`。
> 管理面板暴露公网属敏感面：建议轮换强密码、必要时套 CF Access，禁止把面板 URL/凭据写入公共文件。

## 节点命名规范（命名即信息）

格式：`[旗标][城市]-[来源]-[线路]-[能力]-[协议号]`

| 字段 | 取值 | 含义 |
|---|---|---|
| 来源 | `主` / `备` / `转` | 主力节点 / 备用节点 / 中转（入口→出口） |
| 线路 | `CN2+9929` / `9929` / `直连` | 电信 CN2 GIA + 联通 9929 双线 / 纯 9929 优化 / 普通直连 |
| 能力 | `全解` / `半解` / `受限` | 见下方能力定义（以实测为准） |
| 协议号 | `T` / `V` / `R` / `H` | Trojan / VLESS / REALITY(VLESS) / Hysteria2 |

能力定义（以 lmc999 RegionRestrictionCheck 实测为准）：
- `全解`：ChatGPT / Claude / Gemini / YouTube Premium / Netflix 全库 / Disney+ 均可
- `半解`：ChatGPT / Claude / Netflix / Disney+ 可，Gemini / YouTube Premium 不可
- `受限`：ChatGPT / Claude / Gemini 可，但 Netflix 仅自制剧、部分流媒体平台被禁

节点清单（占位；真实节点名/IP 见 Bitwarden nodes.json）：

| 占位节点 | 来源 | 线路 | 能力 |
|---|---|---|---|
| `<HOST_A>` 系列（T/V/R/H-xx） | 主 VPS | `CN2+9929` 双线 | 全解 |
| `<HOST_B>-V-01` | 备用 VPS | `9929` | 半解 |
| `<RELAY>-V-01` | 主→第三出口 | 中转 | 受限 |

> 新增节点时按上述规范命名，并在 Bitwarden nodes.json 附件同步；线路/能力标签以实测为准，避免虚标。

## 真实值映射（仅私有记录，禁止提交）

> 本 skill 的所有 `<PLACEHOLDER>` 真实值**集中存放于 Bitwarden**（唯一权威来源）：
>
> - **SSH key**：Bitwarden 条目的 `notes` 字段（OPENSSH 格式私钥全文）
> - **IP / 域名 / 订阅短码**：同一条目的字段（`主VPS_IP`、`第二VPS_IP`、`旧VPS_IP`、`PROXY_DOMAIN`、`SUBLINK_DOMAIN`、`SHORT_CODE`）
> - **节点全量凭据**：同一条目的附件 `nodes.json`（与服务器 `/etc/sing-box/nodes.json` 一致，含 uuid/密码/私钥）
> - **Cloudflare 账号**：Bitwarden item `<BW_CF_ITEM>`（dash.cloudflare.com 登录密码；wrangler / cloudflared OAuth 均用它）
> - **s-ui 面板**：Bitwarden item `<BW_PANEL_ITEM>`（admin 凭据 + `<PANEL_DOMAIN>` + 隧道 `<TUNNEL_NAME>`/`<TUNNEL_ID>` + 连接器位置）
> - **订阅域名**：`<SUB_DOMAIN>`（`<BW_PANEL_ITEM>` 内；`sub.bjorn.men` 已被 sublink-worker 占用，勿复用）
> - **隧道凭证**：`<HOST_666>` 的 `/etc/cloudflared/<TUNNEL_ID>.json`（本地 `~/.cloudflared/` 同款，勿提交）；新建/删除隧道后同步更新 `<BW_PANEL_ITEM>`
> - 新增主机 IP（`<HOST_MD_IP>`、`<HOST_666_IP>`）与面板/订阅端口（`<PANEL_PORT>`、`<SUB_PORT>`、`<TROJAN_PORT>`）同 `<BW_SSH_ITEM>` 字段
> - 条目名与取值见**私有笔记**，禁止写入任何公共文件。

## 凭据 / 备份

- **SSH key 唯一存放点 = Bitwarden item `<BW_SSH_ITEM>`（notes 字段）**；新增/轮换 key 后必须同步更新该条目。
- `nodes.json` 含全部节点私钥，**严禁提交 git**；新增节点后把凭据同步存入 Bitwarden。
- 配置自动备份：`render.py` 每次生成前会复制 `config-running.json.bak`。
- x-ui 备份：`/root/x-ui.db.bak-*`、`/root/x-ui-config.json.bak-*`。
- 订阅真正渲染模板在 Cloudflare Worker（快照存于 `/etc/sing-box/sub_worker_template.snapshot.yaml`），改订阅样式需改 Worker 代码。

Key files: [`FILES.md`](FILES.md)

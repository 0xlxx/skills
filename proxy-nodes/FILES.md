# Key files

> 公共版本：所有真实值已脱敏为 `<PLACEHOLDER>`，真实值见 Bitwarden（SKILL.md「真实值映射」）。

| 文件/条目 | 作用 |
|------|------|
| Bitwarden item `<BW_SSH_ITEM>` | **SSH key 唯一存放点**（notes 字段含私钥全文，连接必须经它获取） |
| `/etc/sing-box/nodes.json` | **SSOT 节点定义**（含全部凭据，gitignored，勿提交） |
| `/etc/sing-box/render.py` | 生成器：nodes.json → config-running.json / raw / push |
| `/etc/sing-box/sub_server.py` | 订阅生成 + 短链推送（读 nodes.json，启动自动推送） |
| `/etc/sing-box/config-running.json` | sing-box 入站配置（由 render.py 生成，勿手改） |
| `/etc/sing-box/healthcheck.py` | 健康检查脚本（cron 每 5 分钟） |
| `/etc/sing-box/nodes.example.json` | 脱敏节点模板（入库参考） |
| `/etc/sing-box/sub_worker_template.snapshot.yaml` | CF Worker /clash 模板快照（参考，改订阅样式需改 Worker 代码） |
| `/etc/sing-box/.gitignore` | 排除 nodes.json / config / 证书 / 备份 |
| `<CERT_DIR>/` | LE 证书（acme.sh 自动续期；trojan/hy2 使用） |
| `/etc/systemd/system/sing-box.service` | sing-box systemd unit |
| `/etc/systemd/system/sub-server.service` | sub-server systemd unit |
| `/root/x-ui.db.bak-*` | x-ui 数据库备份（面板已停用，可恢复） |
| `/root/x-ui-config.json.bak-*` | x-ui 配置备份（同上） |

> `<HOST_B>`（第二台 VPS）侧：`/etc/sing-box/config-running.json`（VLESS+Reality :443，静态管理）、旧 shadowsocks 备份（`.bak-ss`）。

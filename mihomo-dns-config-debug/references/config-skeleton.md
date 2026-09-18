# 配置骨架与参数职责

表中「省略则回落」的行为来自 mihomo 官方文档 <https://wiki.metacubex.one/config/dns/>，视频只讲了 `proxy-server-nameserver` 不设置时走标准 DNS 流程这一例。

骨架取自七尺宇的配套配置 <https://github.com/qichiyuhub/rule/tree/main/config/mihomo/config>，只保留与 DNS 分流链路相关的部分，省略节点与策略组细节。注释标出每行服务于哪条主线。

**来源区分**：视频逐条讲过的只有 DNS 分流参数、规则顺序与五个坑；骨架里的 `cache-algorithm`、`fake-ip-ttl`、`stack`、嗅探端口、各类 URL 等属于配套配置的可运行默认值，视频没有展开，改动它们之前先确认必要性。

## 参数职责

四个专用解析器各管一段，混用就是最常见的自举失败与解析错位来源。

| 参数 | 职责 | 可省略条件 / 注意 |
|---|---|---|
| `default-nameserver` | 解析其他 DNS 服务器自身的域名 | 条目必须是 IP，或其 IP 形式的 DoH URL；所有 DNS 服务器本身就写 IP 时可以整个省略 |
| `proxy-server-nameserver` | 解析代理节点的域名 | 用国内 DNS 完成自举，避免「解析节点前先依赖已连通的节点」；省略则回落到 `nameserver-policy` / `nameserver` / `fallback`，而这些默认是境外 DNS |
| `direct-nameserver` | direct 出口的域名解析 | 直连时用它拿本地真正最优的 CDN；省略则回落到 `nameserver-policy` / `nameserver` / `fallback` |
| `nameserver-policy` | 按域名或规则集指定解析器 | 优先于 `nameserver` / `fallback`；只对能走到策略匹配的域名生效——名单外的域名拿不到这个机会 |
| `nameserver` | 默认解析器，这份配置里带国内 ECS 并走代理 | ECS 让境外 DNS 按大陆网段返回国内 IP，避免国内冷门服务被判成国外 |
| `fallback` | 后备解析器，纯净结果、走代理 | 在这套配置里专门给 UDP 提供精准目标 IP；只优化 TCP 时可省略，`geox-url.mmdb` 也随之可删 |
| `fallback-filter` | GeoIP 筛选，决定采用 `nameserver` 还是 `fallback` 的结果 | `geoip-code: CN` 时，非该国家的 IP 视为污染，改用 `fallback` 结果 |
| `disable-qtype-65` | 丢弃 HTTPS/SVCB(65) 类型的回应，强制回落 A/AAAA | 防止浏览器利用记录里的连接元数据（ECH 等）绕过分流或造成卡顿。视频口述为「里面的 ECS 加密信息」，按 HTTPS RR 的实际机制应理解为 ECH 一类连接元数据。这道保险只对需要真实解析的域名有意义：fake-ip 域名本来就不查真 IP，mihomo 对这类查询默认返回空值，不影响 fake-ip 工作 |

## DNS 模块

```yaml
dns:
  enable: true
  cache-algorithm: arc
  ipv6: false
  enhanced-mode: fake-ip
  fake-ip-ttl: 1
  fake-ip-range: 198.18.0.0/16
  fake-ip-filter-mode: blacklist

  # 解析其他 DNS 服务器自身的域名——条目必须是 IP 或其 IP 形式的 DoH URL
  default-nameserver:
    - https://223.5.5.5/dns-query

  # 用国内 DNS 完成节点域名自举，避免解析节点前先依赖已连通的节点
  proxy-server-nameserver:
    - https://dns.alidns.com/dns-query
    - https://doh.pub/dns-query

  # direct 出口的解析——拿本地真正最优的 CDN
  direct-nameserver:
    - https://dns.alidns.com/dns-query
    - https://doh.pub/dns-query

  nameserver-policy:
    # 第一条：国内域名 → 国内 DoH 真实解析
    "rule-set:cn_domain,private_domain,fakeipfilter_cn,steamcn_domain,microsoftcn_domain,applecn_domain":
      - https://dns.alidns.com/dns-query#disable-qtype-65=true
      - https://doh.pub/dns-query#disable-qtype-65=true
    # 第二条：排除名单里的海外服务 → 走默认代理查海外
    "rule-set:fakeipfilter_!cn":
      - https://8.8.8.8/dns-query#默认代理&disable-qtype-65=true

  # 主解析：带国内 ECS，走代理
  nameserver:
    - https://8.8.8.8/dns-query#默认代理&ecs=223.5.5.0/24

  # 纯净解析（不带 ECS），走代理——为 UDP 提供精准 IP
  fallback:
    - https://8.8.8.8/dns-query#默认代理

  fallback-filter:
    geoip: true
    geoip-code: CN

  # 名单 ↔ policy：两侧引用同一组规则集
  fake-ip-filter:
    - rule-set:fakeipfilter_cn
    - rule-set:fakeipfilter_!cn
    - rule-set:private_domain
    - rule-set:cn_domain
    - rule-set:microsoftcn_domain
    - rule-set:applecn_domain
    - rule-set:steamcn_domain
```

## 入站与嗅探

```yaml
tun:
  enable: true
  stack: mixed
  dns-hijack: ["any:53", "tcp://any:53"]   # 无差别接管 53 端口
  auto-route: true
  auto-redirect: true                      # Linux/nftables 专属
  auto-detect-interface: true
  route-exclude-address-set:               # 国内真实 IP 可绕过内核（Linux 专属）
    - cn_ip

sniffer:
  enable: true
  override-destination: false
  force-dns-mapping: false                 # 只为未映射的纯 IP 建立 DNS 映射
  parse-pure-ip: true                      # 覆盖没走内核 DNS 的纯 IP 流量
  sniff:
    HTTP: {ports: [80, 8080-8880]}
    TLS: {ports: [443, 8443]}
    QUIC: {ports: [443, 8443]}
```

## 规则顺序（决定探针落在哪条）

```yaml
rules:
  # 海外 + 443 + UDP 直接拒绝（QUIC 阻断，防 TCP over TCP）
  - AND,((RULE-SET,cn!_domain),(DST-PORT,443),(NETWORK,UDP)),REJECT
  # 私有 IP 带 no-resolve —— 跳过，不触发真实解析
  - RULE-SET,private_ip,直连,no-resolve
  # ……各域名规则集……
  - RULE-SET,cn!_domain,默认代理      # 非中国大陆域名走代理
  # ↓ IP 规则区：第一条不带 no-resolve 的规则就是探针
  - RULE-SET,google_ip,Google
  - RULE-SET,apple_ip,Apple
  - RULE-SET,telegram_ip,Telegram
  - RULE-SET,netflix_ip,NETFLIX
  - RULE-SET,cn_ip,直连
  - MATCH,漏网之鱼
```

`cn!_domain` 这个规则集名对应上游的 `geolocation-!cn`（非中国大陆域名），不是国内域名。

## GeoIP 数据库

```yaml
geox-url:
  mmdb: "https://testingcf.jsdelivr.net/gh/MetaCubeX/meta-rules-dat@release/country.mmdb"
```

这份配置对 mmdb 的唯一依赖是 `fallback-filter`。省略 `fallback` 时这条定义也可以删掉。

## 来源与版本

- 视频：七尺宇《【全网最细】mihomo DNS 深度精讲：从敲下回车到数据包出站》<https://www.youtube.com/watch?v=rKfdZDgNJrE>（2026-09-18，19:20）
- 配套配置：<https://github.com/qichiyuhub/rule/tree/main/config/mihomo/config>（`mihomo.yaml` 完整版、`config.yaml` 新手版）
- 本 skill 于 2026-09-19 从上述素材提炼；视频未覆盖的部分（DNS 泄露检测原理、IPv6 细节）以作者标注为准。

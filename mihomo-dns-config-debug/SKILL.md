---
name: mihomo-dns-config-debug
description: mihomo / Clash.Meta 系内核（Nikki、OpenClash、OpenWrt、裸核）的 DNS 分流与防泄露。当用户要配置或排查 fake-ip 名单、nameserver-policy 不生效、UDP 或 QUIC 出站异常、fallback 解析位置错位、DNS 泄露、检测站结果不一致时使用。
---

# mihomo DNS 分流与防泄露

这套方案出自七尺宇的《mihomo DNS 深度精讲》，**面向高级用户**：分流准、防泄露，但参数耦合多。作者另有一份更精简的版本——首次配置、或只想要基本可用的人用精简版更省事。

## 两问

| 问 | 决定什么 |
|---|---|
| 域名在不在**名单**里 | 客户端首次拿到的 DNS 响应是真 IP 还是假 IP |
| 连接是 **TCP 还是 UDP** | 本地还要不要再解析一次，出站发域名还是发 IP |

每条 DNS 路径都由这两问定位。四个后文反复出现的词：

- **名单**：`fake-ip-filter`。命中即跳过 fake-ip，进入真实解析。
- **探针**：IP 规则区第一条不带 `no-resolve` 的规则，它逼出本次唯一一次本地真实解析。
- **双路判定**：`nameserver`（带 ECS）与 `fallback`（纯净）并发查询，由 `fallback-filter` 的 GeoIP 判定选可信结果。
- **视角对齐**：`fallback` 的解析出口与兜底出站指向同一节点位置。

## 三类场景

三个阶段分开看：**首次响应**（客户端第一次拿到什么）、**本地再解析**（要不要、被谁触发）、**出站形态**（最终发域名还是 IP）。

| 场景 | 首次响应 | 本地再解析 | 出站形态 |
|---|---|---|---|
| **国内域名**（国内规则集收录，且在名单里） | 真 IP（`nameserver-policy` 第一条，国内 DoH） | 不再解析；直连出站时由 `direct-nameserver` 再查一次拿本地最优 CDN | 直连 IP；配了 `route-exclude-address-set` 时客户端绕过内核 |
| **国外域名**（规则已收录，不在名单里） | 假 IP，本地零查询 | 走代理的 TCP 不再解析；UDP 按优先级走「443 先拒 / 排除名单 / 双路判定」 | TCP 走代理时发域名（需协议支持域名封装）；UDP 发 IP |
| **未收录的小众域名** | 假 IP | 会——探针逼出一次本地真实解析 | 走代理时发域名；命中直连时由 `direct-nameserver` 重新解析后发 IP |

## 工作步骤

**排查**（配置时按同一顺序走一遍）：

1. **定场景。** 把目标域名落到三类之一。
   完成标志：写出「域名 → 命中规则集 → DNS 解析器 → 出站策略组」四段链路，每段对应配置里的实际行。
2. **核对名单与 policy 成对。** 需要 `nameserver-policy` 生效的域名，同时在 `fake-ip-filter` 里有一席。
   完成标志：给出两侧对应的规则集行；只有一边时，说明该域名实际由哪条路径接管。
3. **定协议与端口。** 判断 TCP / UDP；UDP 按优先级对号：非 CN 域名的 443/UDP 先命中 REJECT，其次看是否在排除名单，两者都不是才进入双路判定。
   完成标志：写出命中的分支，以及最终发出去的是域名还是 IP。
4. **走到探针时，跟一遍双路判定。** 这一步只对未收录域名有效——国内域名和排除名单里的海外服务在 policy 阶段就结束了，走不到探针。
   完成标志：给出探针规则的原文与序号；确认这次解析由 `nameserver` 发起（policy 此时已匹配失败），再由 `fallback-filter` 决定是否改用 `fallback` 的结果。要断言「全局只查一次」，附内核日志或请求 trace 作为证据。
5. **视角对齐（只在 `fallback` 参与 UDP 精度时）。**
   完成标志：列出 `fallback` 的解析出口与兜底出站的策略组、节点；两者一致，或写明差异对 UDP 精度的影响。
6. **环境取证。** IPv6、浏览器 DoH、插件覆盖三项。
   完成标志：每项附证据（设备 IPv6 状态、浏览器 DoH 配置或实际 DNS 请求、生效配置与磁盘配置的对比），并列出需要改的项。
7. **改完回归。**
   完成标志：配置校验与实际加载都没有报错，日志或请求证明 DNS 查询出口和连接出站符合目标；不满足就保留失败证据继续查。

**配置**：列出目标域名与协议 → 名单和 policy 同时落 → 为 UDP 选阻断 / 排除 / 双路 → 视角对齐 → 按平台裁剪参数 → 校验生效配置。

## 必须记住的不变量

- **policy 的名单前置条件**：要让指定 DNS 生效，先让域名跳过 fake-ip。
- **视角对齐**：`fallback` 与兜底出站指向同一节点。
- `proxy-server-nameserver` 用国内 DNS 完成节点域名自举。
- `direct-nameserver` 负责直连流量的最终解析，拿本地最优 CDN。

其余参数——四个专用解析器、`disable-qtype-65`、`sniffer`——的职责与可省略条件见 [`references/config-skeleton.md`](references/config-skeleton.md)。基础参数（`cache-algorithm`、`fake-ip-ttl`、`fake-ip-range` 等）照抄配套配置即可，不是分流调优的着力点。

## 症状速查

| 症状 | 先查 |
|---|---|
| 国内 CDN 跑偏、直连速度差 | `direct-nameserver` 是否缺失，直连是否走了境外解析 |
| 国外网站卡顿（尤其流媒体） | 海外 443/UDP 是否被 REJECT，QUIC 阻断是否生效 |
| 指定 DNS 不生效 | policy 的名单前置条件 |
| 检测站结果不一致 | [`references/pitfalls.md`](references/pitfalls.md) 的泄露检测原理 |
| UDP 走到奇怪地区、时延高 | 视角对齐 |

五个坑——policy 忘了配名单、Linux 专属参数迁移、IPv6 旁路、浏览器 DoH、插件覆盖——的逐坑症状与改法见 [`references/pitfalls.md`](references/pitfalls.md)。

## 深入

- 三类场景逐跳推演、UDP 三种情况、探针与双路判定 → [`references/flows.md`](references/flows.md)
- 五个坑与泄露检测为什么测不准 → [`references/pitfalls.md`](references/pitfalls.md)
- 带注释的配置骨架、参数职责、可省略条件 → [`references/config-skeleton.md`](references/config-skeleton.md)

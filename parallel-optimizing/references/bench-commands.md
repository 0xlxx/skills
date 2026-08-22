# 性能量化方法（命令占位, 实际值见 references/<project>.md）

> **双运行时**: 开发运行时（如 bun/JSC）快不代表目标运行时（如 node/Chrome V8）快。
> 端到端 bench 用两种运行时各跑一遍; 所有优化在目标环境复验。

## 三级定位

```bash
<端到端 bench 命令>            # 1) 端到端 (开发运行时)
<端到端 bench 命令 (目标运行时)> #    端到端 (目标运行时)
<热点定位命令 --phase>        # 2) 模块级耗时表, 锁热点模块
<cpu profile 命令>           # 3) 函数级 profile, 锁热点函数
```

## 分段计时（构建 vs 算法核心）

```bash
<bench 命令> --out baseline.json   # 优化前基线
<bench 命令> --out after.json      # 优化后对比
```

## 复杂度回归（n/2n/4n 缩放指数, 抓超线性热点）

```bash
# 同一生成器按输入规模翻倍跑 bench, 记 mean; 耗时斜率 > 2 → 疑似 O(n²)
<bench 命令> --graph gen-1k --out n1.json
<bench 命令> --graph gen-2k --out n2.json
<bench 命令> --graph gen-4k --out n3.json
```

## 内存 / GC

```bash
# --expose-gc 前后 heap delta, 量化每次运行分配字节 (免分配改造的直接证据)
<bench 命令 带 --expose-gc>
```

## bench 方差（门禁阈值前置, 必须做）

```bash
# 同输入重复采样定 CV; 门禁阈值 = max(20%, 3×CV)
<bench 命令> --repeat 10 --graph <同输入>
```

## 正确性门禁基线（每次优化前重采样）

```bash
<bit-exact 命令>    # N 覆盖, exit 0
<对齐命令>          # M/K 对齐, exit 0
<回归命令>          # 0 失败
<端到端 bench --outputJson baseline>
```

## Bundle 分析

```bash
# minify 后 raw/gzip + 按模块字节贡献 (metafile inputs) 定位「算法税」
<bundler build --minify --metafile> && gzip -9 -c <out> | wc -c
```

## CI 回归门禁

- `<check-bench-regression 脚本>`（缺失则补）: 默认阈值, 建议先定 CV 再定。
- 门禁组合: bit-exact + 对齐 + 回归 + 端到端 bench。

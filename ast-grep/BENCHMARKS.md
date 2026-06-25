# ast-grep outline — Benchmarks

Benchmarked across 7 repos (56 independent sessions), outline vs no-outline on architecture-level prompts:

| Repo | Files | Token Δ | Time Δ |
|---|---|---|---|
| VS Code | 11,370 | **−45%** | −12% |
| Django | 3,030 | **−67%** | −33% |
| OkHttp | 640 | **−40%** | −5% |
| Tokio | 779 | −12% | −3% |
| Excalidraw | 625 | −26% | ~even |
| Gin | 99 | +39% | +13% |
| Alamofire | 108 | ~even | +26% |

The crossover is around 200–500 files. Below that, outline adds overhead instead of saving it.

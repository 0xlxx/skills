# 翻译引擎与参数

脚本只要求一个 **OpenAI 兼容的 `/chat/completions` 端点**，本地和云端因此可以互换。

## 本地：LM Studio + Hy-MT2（推荐）

```bash
# 1. 装推理引擎（LM Studio 默认不带 runtime）
lms runtime get llama.cpp -y
lms runtime select llama.cpp-mac-arm64-apple-metal-advsimd@2.41.0

# 2. 取模型：Hy-MT2 是腾讯 2026 年的翻译专用模型（33 语言，另附 IFMTBench 基准）
lms get "https://huggingface.co/tencent/Hy-MT2-1.8B-GGUF" --gguf -y   # 1.13GB
# 质量优先可换：tencent/Hy-MT2-7B-GGUF（约 4.4GB）或 Hy-MT2-30B-A3B

# 3. 起服务（默认 127.0.0.1:1234）
lms server start
```

调用时 `--base-url http://127.0.0.1:1234/v1 --api-key-env none --model hy-mt2-1.8b`。

实测（M4 Pro / 24GB）：1.8B Q4_K_M 首次请求约 21 秒（含加载），之后 8 分钟视频、37 个块、2400 in / 1500 out tokens，**13 秒翻完**，离线零成本。

## 云端：OpenRouter

```bash
export OPENROUTER_API_KEY=...
python3 scripts/translate_srt.py in.srt --model google/gemini-2.5-flash
```

不传 `--base-url` 即走 OpenRouter。**必须传 `max_tokens`**——省略时接口会按模型上限预留额度，余额不足直接 402（脚本已默认 1024）。

## 模型选择

| 模型 | 体积 | 适用 |
|---|---|---|
| `Hy-MT2-1.8B`（GGUF Q4_K_M） | 1.13GB | 默认。字幕这种短段高频场景，速度最快、质量够用 |
| `Hy-MT2-7B` | ~4.4GB | 术语密集、长句多、要更稳的语法 |
| `Hy-MT2-30B-A3B`（MoE） | ~18GB | 质量上限最高；24GB 内存机器勉强，需留意换页 |
| `TranslateGemma-12B`（Google，2026-01） | ~8GB | 55 语言，跨语种比中英互译更有优势 |
| 通用 LLM（GPT / Gemini / Qwen） | — | 需要顺带润色、改写语气时；纯翻译不如专用模型稳 |

## Hy-MT2 官方用法（必须照做）

官方 README 明确写着**模型没有默认 system prompt**，走它自己的模板：

```
将以下文本翻译为{目标语言}，注意只需要输出翻译后的结果，不要额外解释：

{原文}
```

术语用官方 terminology 模板，写在正文之前：

```
参考下面的翻译：
{原文词} 翻译成 {译文词}
{原文词} 翻译成 {译文词}
将以下文本翻译为{目标语言}，注意只需要输出翻译后的结果，不要额外解释：

{原文}
```

推荐采样参数（1.8B / 7B）：`temperature 0.7 / top_p 0.6 / top_k 20 / repetition_penalty 1.05`。

**语言名要用全称**：中文 prompt 用「中文」「英语」，英文 prompt 用 `Chinese`、`English`。

## 踩过的坑

| 现象 | 原因与处理 |
|---|---|
| `No LM Runtime found for model format 'gguf'` | LM Studio 未装推理引擎，`lms runtime get llama.cpp -y` |
| 402 并要求减少 max_tokens | 请求没带 `max_tokens`，接口按上限预留额度 |
| `lms get owner/repo` 报 artifact 不存在 | LM Studio 目录里没有该条目，改用 Hugging Face 全 URL |
| 译文里混入解说或英文原文 | 没用官方模板，或用了 system prompt |
| 字幕时间倒退 | 自动字幕时间重叠，需要线性化（脚本已处理） |

# 命令与模型

## 工具链

```bash
brew install yt-dlp ffmpeg whisper-cpp
```

| 工具 | 职责 |
|---|---|
| `yt-dlp` | 探测字幕、下载字幕或音轨 |
| `ffmpeg` | 转成模型吃的 16kHz 单声道 WAV |
| `whisper-cli`（whisper.cpp） | 本地听写，Apple Silicon 走 Metal 加速 |

## 模型

```bash
mkdir -p ~/.cache/whisper-models && cd ~/.cache/whisper-models
curl -L --retry 3 -C - -o ggml-large-v3-turbo.bin \
  https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-large-v3-turbo.bin
```

`-C -` 让中断后的重跑接着下，1.6GB 不用从头来。

| 模型 | 体积 | 速度（M4 Pro） | 适用 |
|---|---|---|---|
| `ggml-large-v3-turbo` | 1.6GB | 19 分钟音频 ≈ 1 分钟 | 默认。技术内容、术语密集、要能引用的稿子 |
| `ggml-large-v3` | 3GB | 更慢 | 音质差、口音重、turbo 仍然错得多时 |
| `ggml-medium` | 1.5GB | 快 | 只想快速了解大意，不打算引用原话 |

## 探测与下载

```bash
# 有没有字幕？人工字幕和自动字幕分开列
yt-dlp --list-subs "<url>"

# 有字幕：从清单里挑出确切语言代码，再按代码下载（不要用 zh.* 这类贪婪匹配，见下方说明）
PICKED=zh-Hans
yt-dlp --write-subs --write-auto-subs --sub-langs "$PICKED" \
       --sub-format "srt/vtt/best" --convert-subs srt --skip-download "<url>"

# 无字幕：取音轨
yt-dlp -x --audio-format m4a -o "audio.%(ext)s" "<url>"

# 只要元信息（标题、时长、简介里的章节表）
yt-dlp --skip-download --dump-json "<url>" | python3 -c "
import json,sys; d=json.load(sys.stdin)
print(d['title'], d['duration']); print(d.get('description',''))"
```

视频简介里的**章节表**很值钱：它既是对齐时间轴的锚点，也是校对时的语义提示。

**字幕语言要给确切代码。** `--sub-langs "zh.*"` 这种贪婪匹配会连 `zh-en` 这类**翻译轨**一起拉，轨数一多站点会回 429。正确做法：先 `--list-subs` 看清单，再把确切代码（`zh-Hans`、`en`）传进去。`scripts/transcribe.sh` 已经这么做了。

**bot 检查。** 报 `Sign in to confirm you're not a bot` 时加 `--cookies-from-browser chrome` 复用浏览器登录态。

## 听写

```bash
# 归一化
ffmpeg -y -i audio.m4a -ar 16000 -ac 1 -c:a pcm_s16le audio16k.wav

# 第一遍：裸跑，拿基线
whisper-cli -m ~/.cache/whisper-models/ggml-large-v3-turbo.bin \
  -f audio16k.wav -l zh -otxt -osrt -of transcript.pass1 -t 8

# 第二遍：注入领域词
whisper-cli -m ~/.cache/whisper-models/ggml-large-v3-turbo.bin \
  -f audio16k.wav -l zh -otxt -osrt -of transcript -t 8 \
  --carry-initial-prompt \
  --prompt "以下是关于 <领域> 的技术讲解，涉及：<词1>、<词2>、<缩写>、<产品名>。"
```

| 参数 | 作用 |
|---|---|
| `-l zh` | 指定语言。不指定会先花时间探测，中文内容还可能被判成日文 |
| `-otxt` / `-osrt` | 输出纯文本 / 带时间轴的 SRT；`-oj` 出 JSON（要程序化处理时用） |
| `--prompt` | 初始提示词，塞领域词汇。上限约上下文的一半，塞满反而挤掉内容 |
| `--carry-initial-prompt` | 每一段都带上提示词，长音频里防止提示衰减 |
| `-t 8` | 线程数，按机器核数调 |
| `--vad` | 开启语音活动检测，长静音或音乐片段多的素材能少出幻觉 |

模型吃不了超长文件时，用 `ffmpeg -f segment -segment_time 600` 切成 10 分钟分片分别转，再按时间偏移拼接 SRT。

## 其他来源

| 来源 | 做法 |
|---|---|
| B 站 / 其他 yt-dlp 支持的站点 | 同样的命令；需要登录才可见的内容加 `--cookies-from-browser chrome` |
| 本地视频或音频 | 跳过 yt-dlp，直接进 ffmpeg 归一化 |
| 播客 RSS | `yt-dlp` 可直接接 RSS URL 下的音频条目 |
| 已有一份字幕但格式不对 | `ffmpeg -i in.vtt out.srt` 或 `--convert-subs srt` |

## 备选后端

| 方案 | 什么时候用 |
|---|---|
| `mlx-whisper`（Python，Apple Silicon） | 想用 Python 生态、要拿词级时间戳或批量处理时。注意它对新版 Python 的兼容性，必要时用 `uv` 建独立环境 |
| 云端 ASR API | 素材不敏感、想要更快或更省本地算力时。**先把隐私边界说清楚**：音频会上传到第三方 |
| 直接读现成文字稿 | 视频平台自带的文稿、作者提供的字幕文件——有就别转录 |

## 故障排查

| 现象 | 处理 |
|---|---|
| `has no automatic captions` / `no subtitles` | 正常分支，转音频听写 |
| 下载音轨很慢或失败 | 加 `--retry 3`；必要时换 `-f bestaudio` 或指定 client |
| `whisper-cli` 报找不到模型 | 确认 `-m` 指到实际 `.bin` 路径，模型不是仓库里的小占位文件 |
| 结果语言判错 | 显式 `-l zh`；中英混说严重的素材考虑先按语种分段 |
| 输出里出现重复句子、整段幻觉 | 开 `--vad`，或提高 `--no-speech-thold` 过滤静音段 |
| 长音频中途崩 | 切分片跑，别指望一次吃完整场直播 |
| `Sign in to confirm you're not a bot` | 加 `--cookies-from-browser chrome` |
| 自己写 shell 片段时变量名报错 | 变量紧邻中文标点要用 `${VAR}` 包裹——bash 3.2 会把多字节字符当成变量名的一部分 |

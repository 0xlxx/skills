#!/usr/bin/env bash
# transcribe.sh — 把视频/音频变成文字稿：字幕优先，没有就本地听写两遍。
#
# 用法:
#   transcribe.sh <url|file> [选项]
#
# 选项:
#   --out DIR      输出根目录（默认 ./transcript-out）；每次运行在其下新建 run.XXXX 目录
#   --lang CODE    目标语言，默认 zh
#   --terms "a,b"  领域词表，喂给第二遍听写（强烈建议，缺省会退化成通用提示）
#   --model PATH   模型，默认 ~/.cache/whisper-models/ggml-large-v3-turbo.bin
#   --passes 1|2   听写遍数，默认 2
#   -h, --help     帮助
set -euo pipefail

MODEL_DEFAULT="${HOME}/.cache/whisper-models/ggml-large-v3-turbo.bin"
SRC=""
OUT="./transcript-out"
LANG_CODE="zh"
TERMS=""
MODEL="$MODEL_DEFAULT"
PASSES=2

usage() { sed -n '2,15p' "$0" | sed 's/^# \{0,1\}//'; }

die() { echo "✗ ${1}" >&2; exit 1; }

while [ $# -gt 0 ]; do
  case "$1" in
    --out|--lang|--terms|--model|--passes)
      [ "$#" -ge 2 ] || die "选项 ${1} 缺少取值"
      case "$1" in
        --out)    OUT="$2" ;;
        --lang)   LANG_CODE="$2" ;;
        --terms)  TERMS="$2" ;;
        --model)  MODEL="$2" ;;
        --passes) PASSES="$2" ;;
      esac
      shift 2 ;;
    -h|--help) usage; exit 0 ;;
    -*) die "未知选项：${1}" ;;
    *)  SRC="$1"; shift ;;
  esac
done

[ -n "$SRC" ] || { usage >&2; exit 1; }
case "$PASSES" in 1|2) ;; *) die "--passes 只接受 1 或 2，收到：${PASSES}" ;; esac

need() { command -v "$1" >/dev/null 2>&1 || die "缺少依赖 ${1}（brew install ${2}）"; }
need ffmpeg ffmpeg
need python3 python

THREADS="$(sysctl -n hw.ncpu 2>/dev/null || nproc 2>/dev/null || echo 4)"
mkdir -p "$OUT"
RUN="$(mktemp -d "${OUT}/run.XXXXXX")"
echo "▸ 本次运行目录：${RUN}"

# SRT/VTT → 纯文本：按 cue 块解析，正文字面保留（数字台词不会被当成序号丢掉）
srt_to_txt() {
  python3 - "$1" "$2" <<'PY'
import re, sys
src, dst = sys.argv[1], sys.argv[2]
text = open(src, encoding='utf-8-sig', errors='replace').read()
cues = []
for block in re.split(r'\r?\n\r?\n+', text.strip()):
    lines = block.splitlines()
    ts = next((i for i, l in enumerate(lines) if '-->' in l), None)
    if ts is None:
        continue
    body = [l.strip() for l in lines[ts + 1:] if l.strip()]
    if body:
        cues.append('\n'.join(body))
open(dst, 'w', encoding='utf-8').write('\n'.join(cues) + ('\n' if cues else ''))
print(len(cues))
PY
}

# 从 --list-subs 输出里选语言：精确 > 方言 > 前缀；没有匹配就返回空（交给听写），不静默换语言
pick_lang() {
  python3 - "$1" "$2" <<'PY'
import re, sys
listing, want = sys.argv[1], sys.argv[2]
langs, seen = [], set()
for line in listing.splitlines():
    m = re.match(r'^([A-Za-z]{2,3}(?:-[A-Za-z0-9]+)*)\s+(?:.*)$', line)
    if m and re.search(r'\b(vtt|srt|json3|ttml|ass)\b', line):
        code = m.group(1)
        if code not in seen:
            seen.add(code); langs.append(code)
def first(pred):
    return next((l for l in langs if pred(l)), '')
print(first(lambda l: l == want)
      or first(lambda l: l in (f'{want}-Hans', f'{want}-CN', f'{want}-orig', f'{want}-Hant', f'{want}-TW'))
      or first(lambda l: l.startswith(want + '-')))
PY
}

AUDIO=""
case "$SRC" in
  http://*|https://*)
    need yt-dlp yt-dlp
    echo "▸ 探测字幕…"
    SUBS="$(yt-dlp --list-subs "$SRC" 2>&1 || true)"
    grep -q "Sign in to confirm" <<<"$SUBS" && \
      echo "⚠ 站点要求登录验证；加 --cookies-from-browser chrome 后重试" >&2
    PICKED="$(pick_lang "$SUBS" "$LANG_CODE")"
    if [ -n "$PICKED" ]; then
      echo "▸ 有字幕轨（${PICKED}），直接下载，不占用本地算力"
      if yt-dlp --write-subs --write-auto-subs --sub-langs "$PICKED" \
                --sub-format "srt/vtt/best" --convert-subs srt --skip-download \
                -o "$RUN/source.%(ext)s" "$SRC" >"$RUN/yt-dlp.subs.log" 2>&1; then
        SUB_FILE="$(find "$RUN" -maxdepth 1 -type f \( -name 'source*.srt' -o -name 'source*.vtt' \) -print -quit)"
        if [ -n "$SUB_FILE" ]; then
          case "$SUB_FILE" in
            *.vtt)
              ffmpeg -y -loglevel error -i "$SUB_FILE" "${SUB_FILE%.vtt}.srt"
              SUB_FILE="${SUB_FILE%.vtt}.srt" ;;
          esac
          CUES="$(srt_to_txt "$SUB_FILE" "$RUN/transcript.txt")"
          if [ "${CUES:-0}" -gt 0 ]; then
            echo
            echo "✓ 完成（字幕来源，未经听写）"
            echo "  文字稿   ${RUN}/transcript.txt"
            echo "  字幕原文 ${SUB_FILE}"
            echo "  解析到   ${CUES} 条字幕"
            echo
            echo "提示：平台字幕也会错人名、术语与断句，引用前按 references/proofreading.md 校对。"
            exit 0
          fi
          echo "⚠ 字幕解析出 0 条有效内容，改走听写" >&2
        else
          echo "⚠ 下载完成但没找到字幕文件，改走听写" >&2
        fi
      else
        echo "⚠ 字幕下载失败（详见 ${RUN}/yt-dlp.subs.log），改走听写" >&2
      fi
    else
      AVAIL="$(python3 - <<PY
import re
lines = """$SUBS""".splitlines()
codes = []
for line in lines:
    m = re.match(r'^([A-Za-z]{2,3}(?:-[A-Za-z0-9]+)*)\s+', line)
    if m and re.search(r'\b(vtt|srt|json3|ttml)\b', line): codes.append(m.group(1))
print(', '.join(codes[:12]))
PY
)"
      [ -n "$AVAIL" ] && echo "▸ 没有匹配 ${LANG_CODE} 的字幕轨（可用：${AVAIL}），走本地听写" \
                     || echo "▸ 无字幕，走本地听写"
    fi
    echo "▸ 下载音轨…"
    yt-dlp -x --audio-format m4a -o "$RUN/audio.%(ext)s" "$SRC" || \
      die "音轨下载失败（素材可能需要 --cookies-from-browser chrome）"
    AUDIO="$(find "$RUN" -maxdepth 1 -type f -name 'audio.*' -print -quit)"
    [ -n "$AUDIO" ] || die "音轨下载后没找到文件"
    ;;
  *)
    [ -f "$SRC" ] || die "找不到文件：${SRC}"
    AUDIO="$SRC"
    ;;
esac

need whisper-cli whisper-cpp
[ -f "$MODEL" ] || die "模型不存在：${MODEL}（下载命令见 references/commands.md）"

echo "▸ 归一化音频…"
WAV="$RUN/audio16k.wav"
ffmpeg -y -loglevel error -i "$AUDIO" -ar 16000 -ac 1 -c:a pcm_s16le "$WAV"

echo "▸ 第一遍听写（基线）…"
whisper-cli -m "$MODEL" -f "$WAV" -l "$LANG_CODE" \
  -otxt -osrt -of "$RUN/transcript.pass1" -t "$THREADS" >"$RUN/whisper.pass1.log" 2>&1 || {
    tail -5 "$RUN/whisper.pass1.log" >&2
    die "第一遍听写失败（日志：${RUN}/whisper.pass1.log）"
  }

if [ "$PASSES" -eq 2 ]; then
  if [ -n "$TERMS" ]; then
    PROMPT="以下是关于相关内容的技术讲解，涉及：${TERMS}。请保持这些术语与专有名词原样。"
    echo "▸ 第二遍听写（注入词表 ${TERMS}）…"
  else
    PROMPT="请逐字转写以下音频，保留术语与专有名词原样，不要改写或总结。"
    echo "⚠ 未提供 --terms，第二遍退化为通用提示；补上词表能显著减少同音串字" >&2
    echo "▸ 第二遍听写（通用提示，未注入词表）…"
  fi
  whisper-cli -m "$MODEL" -f "$WAV" -l "$LANG_CODE" \
    -otxt -osrt -of "$RUN/transcript" -t "$THREADS" \
    --carry-initial-prompt --prompt "$PROMPT" >"$RUN/whisper.pass2.log" 2>&1 || {
      tail -5 "$RUN/whisper.pass2.log" >&2
      die "第二遍听写失败（日志：${RUN}/whisper.pass2.log）"
    }
  MAIN="$RUN/transcript.txt"; SRT="$RUN/transcript.srt"; BASE="$RUN/transcript.pass1.txt"
else
  MAIN="$RUN/transcript.pass1.txt"; SRT="$RUN/transcript.pass1.srt"; BASE=""
fi

[ -s "$MAIN" ] || die "听写产物为空：${MAIN}"

echo
echo "✓ 完成（本地听写，${PASSES} 遍）"
echo "  文字稿   ${MAIN}"
echo "  时间轴   ${SRT}"
[ -n "$BASE" ] && echo "  基线     ${BASE}"
echo "  音频     ${WAV}"
echo
echo "接下来（第 5–6 步，由 agent 完成）：按 references/proofreading.md 校对同音串字，交付时附词表、改动清单与残留不确定。"

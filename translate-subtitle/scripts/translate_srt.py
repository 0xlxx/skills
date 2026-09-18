#!/usr/bin/env python3
"""把字幕文件翻译成目标语言，保留时间轴。

用法:
  translate_srt.py in.srt --out out.zh.srt [--to "简体中文"] [--terms "a=甲,b=乙"]
                         [--model google/gemini-2.5-flash] [--base-url URL] [--bilingual]
                         [--dry-run]

要点:
  * 自动字幕是滚动的（同一句被切成多条、还带重复尾巴），先合并成语义块再翻译；
    逐行翻译会把句子拦腰截断，代词和术语都会崩。
  * 术语表用 "原文=译法" 强制固定译法。
  * 输出时间轴来自原块的首末时间；译文过长时按标点切分并按字数分配时长。
"""
import argparse, json, os, re, sys, time, urllib.request, urllib.error

TS = r'(\d{1,2}):(\d{2}):(\d{2})[,.](\d{1,3})'

def sec(ts):
    h, m, s, ms = re.match(TS, ts).groups()
    return int(h) * 3600 + int(m) * 60 + int(s) + int(ms.ljust(3, '0')) / 1000

def fmt(t):
    t = max(0.0, t)
    h = int(t // 3600); m = int(t % 3600 // 60); s = int(t % 60); ms = int(round((t - int(t)) * 1000))
    if ms == 1000: s += 1; ms = 0
    return f'{h:02d}:{m:02d}:{s:02d},{ms:03d}'

def parse_cues(text):
    cues = []
    for block in re.split(r'\r?\n\s*\r?\n+', text.strip()):
        lines = [l for l in block.splitlines() if l.strip()]
        idx = next((i for i, l in enumerate(lines) if '-->' in l), None)
        if idx is None:
            continue
        m = re.search(TS + r'\s*-->\s*' + TS, lines[idx])
        if not m:
            continue
        body = ' '.join(l.strip() for l in lines[idx + 1:])
        body = re.sub(r'<[^>]+>', '', body).strip()
        if body:
            cues.append({'start': sec(lines[idx].split('-->')[0].strip()),
                         'end': sec(lines[idx].split('-->')[1].strip().split()[0]),
                         'text': body})
    return cues

def dedupe(cues):
    """去掉滚动字幕的渐进重复：新文本以前一条开头时只保留增量。"""
    out = []
    for c in cues:
        t = c['text'].strip()
        if out:
            prev = out[-1]['text']
            if t.startswith(prev) and len(t) > len(prev):
                t = t[len(prev):].strip()
                if not t:
                    continue
        if out and t == out[-1]['text']:
            continue
        out.append({**c, 'text': t})
    return out

def linearize(cues):
    """YouTube 等自动字幕是滚动显示：相邻 cue 时间重叠。
    按后一条的起点截断前一条，让时间轴单调，否则翻译重组后会出现时间倒退。"""
    for i in range(len(cues) - 1):
        nxt = cues[i + 1]['start']
        if cues[i]['end'] > nxt:
            cues[i]['end'] = max(nxt, cues[i]['start'] + 0.2)
    return cues


def to_blocks(cues, max_sec, max_chars):
    blocks, cur = [], []
    for c in cues:
        cur.append(c)
        text = ' '.join(x['text'] for x in cur)
        dur = cur[-1]['end'] - cur[0]['start']
        if re.search(r'[.!?…]["\')\]]?$', text.strip()) or dur >= max_sec or len(text) >= max_chars:
            blocks.append(cur); cur = []
    if cur:
        blocks.append(cur)
    return blocks

def call_llm(messages, model, base_url, api_key, max_tokens):
    payload = {'model': model, 'messages': messages,
               'temperature': 0.7, 'top_p': 0.6, 'top_k': 20,
               'repetition_penalty': 1.05, 'max_tokens': max_tokens}
    headers = {'Content-Type': 'application/json'}
    if api_key:                      # 本地端点通常不校验 key
        headers['Authorization'] = f'Bearer {api_key}'
    req = urllib.request.Request(base_url.rstrip('/') + '/chat/completions',
                                data=json.dumps(payload).encode(), headers=headers)
    last = None
    for attempt in range(3):
        try:
            with urllib.request.urlopen(req, timeout=180) as r:
                d = json.load(r)
            return d['choices'][0]['message']['content'].strip(), d.get('usage', {})
        except urllib.error.HTTPError as e:
            last = f'HTTP {e.code}: {e.read().decode()[:200]}'
        except Exception as e:
            last = f'{type(e).__name__}: {e}'
        time.sleep(2 * (attempt + 1))
    raise SystemExit(f'翻译请求失败：{last}')

def split_long(text, max_chars):
    """按标点优先切分；没有标点的长串（歌词、连读）再按空格/♪ 兜底硬切。"""
    parts, buf = [], ''
    for piece in re.split(r'(?<=[。！？；，、,♪])', text):
        if len(buf) + len(piece) <= max_chars or not buf:
            buf += piece
        else:
            parts.append(buf); buf = piece
    if buf:
        parts.append(buf)
    out = []
    for p in parts:
        p = p.strip()
        while len(p) > max_chars:
            window = p[:max_chars]
            cut = max(window.rfind(' '), window.rfind('♪'), window.rfind('、'))
            if cut <= 0:
                cut = max_chars
            out.append(p[:cut].strip())
            p = p[cut:].strip()
        if p and re.search(r'[^\s\W_♪]', p, re.UNICODE):
            out.append(p)
    return out

def translate_text(a, src):
    """文稿模式：按空行分段，再按 --block-chars 合并成块翻译，输出带段落的中文文本。"""
    lines = [l.strip() for l in src.splitlines()]
    if not any(lines):
        raise SystemExit('输入文稿为空')
    blocks, cur, limit = [], '', a.text_block_chars
    for line in lines:
        if not line:                       # 空行 = 段落边界
            if cur:
                blocks.append(cur); cur = ''
            continue
        if cur and len(cur) + len(line) + 1 > limit:
            blocks.append(cur); cur = line
        else:
            cur = f'{cur}\n{line}'.strip()
    if cur:
        blocks.append(cur)
    paras = [b for b in blocks]

    api_key = '' if a.api_key_env.lower() in ('', 'none') else os.environ.get(a.api_key_env, '')
    if not api_key and 'localhost' not in a.base_url and '127.0.0.1' not in a.base_url:
        raise SystemExit(f'缺少 API key：设置 {a.api_key_env}，或把 --base-url 指向本地端点')

    tgt = '中文' if ('中文' in a.to or a.to.lower() in ('zh', 'chinese')) else a.to
    refs = ''
    if a.terms:
        pairs = [kv for kv in a.terms.split(',') if '=' in kv]
        if pairs:
            refs = '参考下面的翻译：\n' + '\n'.join(
                f'{kv.split("=",1)[0].strip()} 翻译成 {kv.split("=",1)[1].strip()}' for kv in pairs) + '\n'

    print(f'▸ {len(paras)} 段 → {len(blocks)} 个翻译块', file=sys.stderr)
    out_parts, total = [], {}
    for i, b in enumerate(blocks):
        content = f'{refs}将以下文本翻译为{tgt}，注意只需要输出翻译后的结果，不要额外解释：\n\n{b}' \
            if a.engine == 'hy-mt' else \
            f'把下面的文本翻译成{tgt}，只输出译文。\n\n{b}'
        messages = [{'role': 'user', 'content': content}]
        zh, usage = call_llm(messages, a.model, a.base_url, api_key, a.max_tokens)
        out_parts.append(zh.strip().strip('“”"\''))
        for k, v in usage.items():
            if isinstance(v, (int, float)):
                total[k] = total.get(k, 0) + v
        print(f'  块 {i+1}/{len(blocks)} 已译（{len(b)} → {len(out_parts[-1])} 字）', file=sys.stderr)

    out = a.out or re.sub(r'\.(txt|md)$', '', a.input, flags=re.I) + f'.{a.to}.txt'
    open(out, 'w', encoding='utf-8').write('\n\n'.join(out_parts) + '\n')
    print(f'✓ {len(blocks)} 块 → {out}')
    if total:
        cost = total.get('cost')
        print(f'  用量：{total.get("prompt_tokens", 0):.0f} in / {total.get("completion_tokens", 0):.0f} out'
              + (f'，成本 ${cost:.5f}' if isinstance(cost, (int, float)) else ''))


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('input')
    ap.add_argument('--out')
    ap.add_argument('--to', default='简体中文')
    ap.add_argument('--terms', default='')
    ap.add_argument('--model', default=os.environ.get('TRANSLATE_MODEL', 'google/gemini-2.5-flash'))
    ap.add_argument('--base-url', default=os.environ.get('TRANSLATE_BASE_URL', 'https://openrouter.ai/api/v1'))
    ap.add_argument('--api-key-env', default='OPENROUTER_API_KEY')
    ap.add_argument('--max-sec', type=float, default=15.0)
    ap.add_argument('--max-chars', type=int, default=20)
    ap.add_argument('--block-chars', type=int, default=220,
                    help='字幕模式下单个语义块的最大字符数')
    ap.add_argument('--text-block-chars', type=int, default=1600,
                    help='文稿模式下单个翻译块的最大字符数（比字幕大得多，上下文更完整）')
    ap.add_argument('--bilingual', action='store_true')
    ap.add_argument('--engine', choices=['generic', 'hy-mt'], default='generic',
                    help='hy-mt 走腾讯 Hy-MT2 官方模板（无 system prompt、无上下文拼接），'
                         'generic 走通用指令 + 术语表，适合任意 OpenAI 兼容模型')
    ap.add_argument('--max-tokens', type=int, default=1024)
    ap.add_argument('--mode', choices=['auto', 'srt', 'text'], default='auto',
                    help='auto 按扩展名判断；text 模式翻译纯文稿（无时间轴，块更大）')
    ap.add_argument('--dry-run', action='store_true')
    a = ap.parse_args()

    mode = a.mode
    if mode == 'auto':
        mode = 'text' if a.input.lower().endswith(('.txt', '.md')) else 'srt'
    src = open(a.input, encoding='utf-8-sig', errors='replace').read()

    if mode == 'text':
        translate_text(a, src)
        return

    cues = linearize(dedupe(parse_cues(src)))
    if not cues:
        raise SystemExit('输入里没有解析到字幕 cue')
    blocks = to_blocks(cues, a.max_sec, a.block_chars)

    print(f'▸ 解析 {len(cues)} 条 cue → 合并成 {len(blocks)} 个语义块', file=sys.stderr)
    if a.dry_run:
        for i, b in enumerate(blocks):
            t = ' '.join(x['text'] for x in b)
            print(f'[{i+1}] {fmt(b[0]["start"])} → {fmt(b[-1]["end"])} ({len(b)} cue, {len(t)} chars)')
            print(f'    {t}')
        return

    api_key = '' if a.api_key_env.lower() in ('', 'none') else os.environ.get(a.api_key_env, '')
    if not api_key and 'localhost' not in a.base_url and '127.0.0.1' not in a.base_url:
        raise SystemExit(f'缺少 API key：设置 {a.api_key_env}，或把 --base-url 指向本地端点')
    system = (f'你是专业字幕译者。把用户给出的英文翻译成{a.to}，自然口语、句子完整。'
              f'只输出译文本身：不要加引号、不要解释、不要保留英文原文、不要加任何标记。')
    glossary = ''
    if a.terms:
        glossary = '\n术语表（必须严格采用）：\n' + '\n'.join(
            f'- {kv.split("=", 1)[0].strip()} → {kv.split("=", 1)[1].strip()}'
            for kv in a.terms.split(',') if '=' in kv)

    out_blocks, usage_total, prev = [], {}, ''
    for i, b in enumerate(blocks):
        text = ' '.join(x['text'] for x in b)
        if a.engine == 'hy-mt':
            # Hy-MT2 官方模板：中文 prompt 用中文语言名；模型没有 system prompt
            tgt = '中文' if ('中文' in a.to or a.to.lower() in ('zh', 'chinese')) else a.to
            refs = ''
            if a.terms:
                pairs = [kv for kv in a.terms.split(',') if '=' in kv]
                if pairs:
                    refs = '参考下面的翻译：\n' + '\n'.join(
                        f'{kv.split("=",1)[0].strip()} 翻译成 {kv.split("=",1)[1].strip()}' for kv in pairs) + '\n'
            messages = [{'role': 'user',
                         'content': f'{refs}将以下文本翻译为{tgt}，注意只需要输出翻译后的结果，不要额外解释：\n\n{text}'}]
        else:
            prompt = (f'{glossary}\n\n上一块译文（仅供衔接，不要重复输出）：{prev}\n\n待翻译：\n{text}'
                      if prev else f'{glossary}\n\n待翻译：\n{text}')
            messages = [{'role': 'system', 'content': system}, {'role': 'user', 'content': prompt}]
        zh, usage = call_llm(messages, a.model, a.base_url, api_key, a.max_tokens)
        zh = zh.strip().strip('“”"\'')
        out_blocks.append((b, zh))
        prev = zh
        for k, v in usage.items():
            if isinstance(v, (int, float)):
                usage_total[k] = usage_total.get(k, 0) + v
        print(f'  块 {i+1}/{len(blocks)} 已译（{len(text)} → {len(zh)} 字）', file=sys.stderr)

    lines, n, last_end = [], 0, 0.0
    for b, zh in out_blocks:
        start, end = b[0]['start'], b[-1]['end']
        parts = split_long(zh, a.max_chars) or [zh]
        total = sum(len(p) for p in parts) or 1
        span, cur = max(end - start, 1.0), max(start, last_end)
        for p in parts:
            dur = span * len(p) / total
            n += 1
            lines.append(str(n))
            lines.append(f'{fmt(cur)} --> {fmt(min(cur + dur, end))}')
            lines.append(p.strip())
            if a.bilingual:
                lines.append(' '.join(x['text'] for x in b))
            lines.append('')
            cur += dur
            last_end = min(cur, end)

    out = a.out or re.sub(r'\.(srt|vtt)$', '', a.input, flags=re.I) + f'.{a.to}.srt'
    open(out, 'w', encoding='utf-8').write('\n'.join(lines))
    print(f'✓ {len(blocks)} 块 → {n} 条中文字幕：{out}')
    if usage_total:
        cost = usage_total.get('cost')
        print(f'  用量：{usage_total.get("prompt_tokens", 0):.0f} in / {usage_total.get("completion_tokens", 0):.0f} out'
              + (f'，成本 ${cost:.5f}' if isinstance(cost, (int, float)) else ''))

if __name__ == '__main__':
    main()

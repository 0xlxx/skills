---
name: chrome-extension-shortcuts
description: Chrome 扩展快捷键：设计或排查 browser commands 与 in-page keymap —— 快捷键按了没反应、被占用或未绑定、平台默认键、global 作用域、键盘可达性与设置页可发现性。
---

# Chrome Extension Shortcuts

<core-principle>
Chrome 扩展有两种快捷键，先认清作用域，再选实现：

- **browser commands**：manifest `commands` + Commands API 管理。受 Chrome 冲突检测和用户重映射控制，能拿到 focus，也能在页面吞键的情况下触发。
- **in-page keymap**：只在扩展自己的面板、浮层里存在，由局部 keydown 处理，宿主页面看不见。

把 browser 级动作藏进页面 keydown，就绕过了 Chrome 的冲突检测和用户重映射；把仅属于面板的动作声明成浏览器命令，就去抢了一个用户全局的键。两者的实现细节与限制见 [`references/browser-commands.md`](references/browser-commands.md) 与 [`references/in-page-keymap.md`](references/in-page-keymap.md)。
</core-principle>

## 决策

按顺序问，第一个「是」就是答案：

1. **动作是否只在这个面板、这个选中项、这个浮层里才有意义？**
   是 → in-page keymap。方向键、Enter、Escape、Tab 这类局部语义都在这里。
2. **是否需要"Chrome 有焦点就能用"，且要扛住宿主页面自己吞键？**
   是 → browser command。
3. **是否还需要 Chrome 失去焦点时也能用？**
   是 → browser command + `global: true`（建议键仅 `Ctrl+Shift+0..9`，ChromeOS 不支持）。

完成标志：每条快捷键能指回上面某一问，且没有任何一条同时被两种机制实现 —— 同键双实现会变成两次触发。

## 跨分支要求

这些与走哪条分支无关，两条路都要满足：

- **在设置页公开快捷键**，这是官方对 options page 的要求，也是用户发现键位、发现冲突的唯一入口。列出的必须是**运行时读到的真实绑定**，不是 manifest 默认值；浏览器级命令同时给一个通往 `chrome://extensions/shortcuts` 的入口，并把"未绑定"和"已绑定"显示成不同状态。界面内的浮层、状态条同样读真实绑定 —— 用户改完键，浮层还在教他一个按不出来的键，等于把默认值当契约。
- **不要干扰 Chrome 内置快捷键**，官方点名的是缩放组合（`Ctrl/Cmd` + `+`、`-`、`0`）：页面级 keydown 一旦对它们 `preventDefault()`，用户就失去了缩放。
- **只用键盘能走完核心流程**，且焦点位置始终可见。优先原生控件；自定义列表用 `aria-activedescendant` 或真实焦点同步活动项。
- **200% 文本或页面缩放后仍然可用**（官方 a11y 的缩放测试）：功能不丢、文字可读、控件可点。

完成标志：上面四条各自能在设置页/键盘/缩放下被实际验证，而不只是"代码里写了"。

## 验收清单

- [ ] 每条快捷键归属明确（问题 1–3 之一），没有同键双实现。
- [ ] browser 级动作在 manifest 声明，且 service worker 里注册了 `onCommand` 处理分支。
- [ ] 没有用 `Escape`、`Enter`、`Ctrl+Alt` 或系统保留组合作为 browser 级默认键。
- [ ] 命令冲突或未绑定对用户可见（角标/设置页/文案），而不是静默失败。
- [ ] 用户能在 `chrome://extensions/shortcuts` 重映射。
- [ ] 设置页与界面内展示的键位都来自真实绑定。
- [ ] Chrome 自带的缩放组合不被接管。
- [ ] 200% 缩放与纯键盘走查各过一次。

## 官方来源

- [Chrome Extensions Commands API](https://developer.chrome.com/docs/extensions/reference/api/commands)
- [Respond to commands](https://developer.chrome.com/docs/extensions/develop/ui/respond-to-commands)
- [Support accessibility](https://developer.chrome.com/docs/extensions/how-to/ui/a11y)
- [Chrome keyboard shortcuts](https://support.google.com/chrome/answer/157179)

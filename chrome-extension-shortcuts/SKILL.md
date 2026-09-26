---
name: chrome-extension-shortcuts
description: Chrome 扩展快捷键设计与改进：判断浏览器级 Commands API 与面板内 keymap 的边界，处理平台默认键、用户重映射、冲突检测、保留快捷键、全局命令限制、键盘无障碍与设置页可发现性。
---

# Chrome Extension Shortcuts

<core-principle>
Chrome 扩展有两种快捷键，先分清作用域，再选实现：

- **浏览器级命令**：由 manifest `commands` + Commands API 管理，受 Chrome 冲突检测和用户重映射控制。
- **界面内快捷键**：只在扩展自己的面板、弹层或组件中存在，由局部 keymap 管理，不应假装成浏览器命令。

动作需要“页面/焦点无关”或在 Chrome 内随时可调用时，用 commands；动作只属于某个已打开 UI 时，用局部 keymap。系统或 Chrome 已保留的组合不要抢。
</core-principle>

## 决策

先问两个问题：

1. **动作是否需要在扩展 UI 尚未打开时也能触发？**
   - 是：浏览器级命令。
   - 否：界面内快捷键。
2. **动作是否依赖当前面板、当前选中项或局部浮层？**
   - 是：界面内快捷键。
   - 否，且是稳定的全局动作：浏览器级命令。

禁止把“浏览器级入口”伪装成一个页面 `keydown` 监听器。这样会绕过 Chrome 的冲突检测、用户重映射和标准管理 UI。

## 浏览器级命令

### 1. 在 manifest 声明命令

命令要有稳定的 id、可读 `description` 和平台化 `suggested_key`。

```json
{
  "commands": {
    "toggle-panel": {
      "suggested_key": {
        "default": "Ctrl+K",
        "mac": "Command+K"
      },
      "description": "打开或关闭收藏面板"
    }
  }
}
```

`suggested_key` 允许的平台键只有 `default`、`chromeos`、`linux`、`mac`、`windows`；给字符串则是全平台同一个键。

- 省略 `suggested_key`：命令保持未绑定，等用户自己指定。需要一个"存在但默认不占键"的命令时用它。
- `description` 对标准命令是**必填**，会显示在快捷键管理 UI；对 `_execute_action` 等 Action 命令会被忽略。

`_execute_action` / `_execute_browser_action` / `_execute_page_action` 是保留的命令名，只用来给扩展图标绑键，**不会**触发 `onCommand`。想响应弹窗打开，就在弹窗自己的脚本里监听 `DOMContentLoaded`。

完成标志：命令会出现在 `chrome://extensions/shortcuts`，用户可以重新绑定。

### 2. 遵守 Commands API 限制

官方支持：

- 字母：`A`–`Z`
- 数字：`0`–`9`
- 通用：`Comma`、`Period`、`Home`、`End`、`PageUp`、`PageDown`、`Space`、`Insert`、`Delete`
- 方向键：`Up`、`Down`、`Left`、`Right`
- 媒体键：`MediaNextTrack`、`MediaPlayPause`、`MediaPrevTrack`、`MediaStop`
- 修饰键：`Ctrl`、`Alt`、`Shift`、`MacCtrl`（仅 macOS）、`Option`（仅 macOS）、`Command`（仅 macOS）、`Search`（仅 ChromeOS）

关键约束：

- 必须包含 `Ctrl` 或 `Alt`；macOS 可用 `Command` 或 `MacCtrl` 代替，`Option` 代替 `Alt`。
- `Shift` 可选。
- `Ctrl+Alt` 不允许（避免与 AltGr 冲突）。
- 媒体键不能和任何修饰键组合。
- `Escape` 和 `Enter` 不是可注册的 Commands API 按键 —— 这两个只能留在界面内 keymap。
- 键名区分大小写：写成 `ctrl+k` 之类会导致**安装时 manifest 解析错误**，不是安静忽略。
- `MacCtrl` 出现在非 macOS 平台的组合里会**校验失败、阻止安装**。
- macOS 上 `Ctrl` 会被自动转换成 `Command`；确实要 Control 键时必须写 `MacCtrl`。
- 每个扩展最多提供 4 个建议快捷键；更多只能由用户在 `chrome://extensions/shortcuts` 里手动加。
- 系统或 Chrome 保留快捷键（窗口管理一类）永远优先，扩展不能覆盖。

完成标志：每个默认键都符合平台语法，且没有使用不支持或已保留的键。

### 3. 选择作用域

- 默认命令只在 Chrome 有焦点时生效。
- 只有确实需要在 Chrome 外运行时才设置 `global: true`。
- 全局命令的建议键只能是 `Ctrl+Shift+0..9`。
- ChromeOS 不支持全局命令。
- 用户仍可通过 `chrome://extensions/shortcuts` 重新绑定。

完成标志：命令作用域与用户实际使用场景一致，没有为了“更强”而无理由全局化。

### 4. 检查冲突

扩展不能保证建议键一定注册成功。另一个扩展已占用时，本次绑定会失败。

安装时检查：

```js
const OWN_COMMANDS = ['toggle-panel'];

chrome.runtime.onInstalled.addListener(async ({ reason }) => {
  if (reason !== 'install') return;
  const commands = await chrome.commands.getAll();
  // 只看自己的命令：getAll() 还会返回 _execute_action 一族，
  // 它们没有描述、shortcut 也常为空，会把这里误报成"冲突"。
  const missing = commands.filter(
    (command) => OWN_COMMANDS.includes(command.name) && command.shortcut === '',
  );
  if (missing.length > 0) {
    // 在扩展 UI、badge 或设置页提示用户去 chrome://extensions/shortcuts 重新绑定
  }
});
```

只在安装时提示；之后用户可能有意解除绑定，重复打扰是错误行为。

完成标志：冲突和未绑定状态对用户可见，且不会静默失败。

### 5. 让用户可发现、可修改

- `description` 写清动作，不要只写内部 id。
- 在设置页列出快捷键，或提供明确入口。
- 把浏览器级命令指向 `chrome://extensions/shortcuts` 作为最终管理面。
- 不要把默认键当成永久契约；读取实际绑定状态再展示。
- **界面内也要读实际绑定**：帮助浮层、状态条上写着键位的地方，同样要跟真实绑定走。否则用户改完键，浮层还在教他一个按不出来的键 —— 这是把"默认值"当契约的另一种形态。
- 内容脚本里没有 `chrome.commands`（只有扩展页面与后台有）。界面内需要真实绑定时，让后台代读一条消息，不要因为够不着就退回写死默认值。

完成标志：用户知道有哪些快捷键、如何改、当前是否真的生效。

### 6. 验证绑定，而不是假设

`chrome.commands.getAll()` 是唯一可信来源：

- 返回非空 `shortcut`：Chrome 接受了你的建议键。
  注意这只说明"注册成功"，不代表按键在宿主页面上一定先到扩展 —— 系统与浏览器保留组合仍然优先。
- 返回空串：注册失败（被别的扩展或系统占用）。这是正常结果，不是异常，必须让用户看见。

`getAll()` 会连同保留的 Action 命令（`_execute_action` 等）一起返回，展示时同样要按名字过滤：它们没有描述，渲染出来就是一行没有名字的"未绑定"，看起来像功能坏了。

各类测试手段的边界：

- **Playwright / CDP 注入的按键不经过浏览器加速表。**
  `page.keyboard.press('Meta+K')` 会直接送进渲染进程，永远触发不了扩展命令。
  用它做断言等于在测自动化工具，不是在测你的链路。
  正确做法是：用 `getAll()` 断言绑定已注册，再用 `tabs.sendMessage` 投递 Chrome 本来会投递的那条事件，验证收到命令之后的行为。
- 真实按键（加速表、冲突优先级、用户重映射）只能靠人工在浏览器里按一次确认。

完成标志：自动测试覆盖"绑定已注册"与"收到命令后的行为"两段，人工确认过真实按键。

## 界面内快捷键

### 1. 建立作用域，而不是到处监听

面板、列表、弹层各自定义键盘作用域，优先级从内到外：

```text
浮层 > 列表 > 面板 > 宿主页面
```

当前作用域处理过的按键要阻止继续传播，未处理的按键再交给外层。

完成标志：同一按键在不同 UI 状态下有明确归属，不会同时触发两层动作。

### 2. 尊重原生键盘行为

- 输入框、文本域、选择器内的方向键和 Enter 保留原生语义，除非该控件明确实现了自己的完整键盘模型。
- Space、Tab、Escape 在按钮、菜单和输入控件中不能随意吞掉。
- 自定义列表要用 `aria-activedescendant` 或真实焦点同步当前活动项。
- 不能用全局 `preventDefault()` 把浏览器和宿主站点全部封死。
- **别碰 Chrome 内置快捷键**：官方点名的是缩放组合（`Ctrl/Cmd` + `+`、`-`、`0`）。页面级 keydown 一旦 `preventDefault()` 掉这些键，用户就失去了缩放能力。

完成标志：键盘操作完整闭环，输入法、选择器、Tab 顺序和辅助技术都能工作；Chrome 自带的导航与缩放组合仍然可用。

### 3. 焦点和可访问性

- 优先使用原生 `button`、`input`、`select` 等控件。
- 自定义控件使用合理的 `tabIndex` 和 ARIA。
- 始终保留清晰、可辨识的焦点指示。
- 快捷键应覆盖重要动作，不是把所有功能都塞进键盘。

完成标志：只用键盘可以完成核心流程；焦点位置始终可见；无鼠标操作不中断。

### 4. 在设置页公开快捷键

官方原文是"通过 options page 让用户知道有哪些快捷键"。帮助浮层可以作为补充，但设置页必须有入口或完整列表。

列出时要区分两类来源，别把两者混成一张表：

- 浏览器级命令：展示 `getAll()` 读回来的**真实**绑定，附一个通往 `chrome://extensions/shortcuts` 的入口。
- 界面内快捷键：展示你自己定义的键位。

完成标志：用户能在设置页查到快捷键、知道哪些可以改、以及去哪里改。

### 5. 通过 200% 缩放测试

官方用 [WCAG 的 200% 测试](https://www.w3.org/TR/2008/REC-WCAG20-20081211/#visual-audio-contrast-scale)衡量 UI 的弹性：文本或页面放大到 200% 之后，界面是否仍然可用。

快捷键面板最容易在这里翻车 —— 键位列通常用固定宽度排布，放大后要么被裁掉，要么把说明挤出可视区。

完成标志：200% 缩放下快捷键面板与设置页仍可阅读、可操作，没有内容被裁切或需要横向滚动。

## 常见误用

- **把 `Escape` 当成扩展命令**：Commands API 不支持，浏览器/OS 也可能优先处理。需要取消语义时，用局部 keymap。
- **用内容脚本抢全局快捷键**：绕过 Chrome 的冲突检测和用户重映射。浏览器级动作应使用 commands。
- **默认占用太多组合**：最多 4 个建议键已经足够；其余让用户主动绑定。
- **覆盖 Chrome 或系统快捷键**：例如缩放、窗口管理、任务管理器等组合。保留键优先，无法覆盖。
- **快捷键只写代码不写 UI**：用户不知道存在，也不知道冲突时为什么没反应。
- **隐藏焦点环**：视觉上“干净”了，键盘用户却失去了位置感。

## 验收清单

- [ ] 浏览器级动作已经声明为 manifest commands。
- [ ] 每个命令都有可读 description 和平台化 suggested_key。
- [ ] 没有使用 Escape、Enter、Ctrl+Alt 或系统保留组合作为 commands 默认键。
- [ ] 全局命令只在确实需要 Chrome 外触发时启用。
- [ ] 安装时检查过命令冲突和空绑定。
- [ ] 用户可以从 `chrome://extensions/shortcuts` 重映射。
- [ ] 用 `chrome.commands.getAll()` 验证过建议键真的注册成功（空绑定有提示）。
- [ ] 界面内快捷键有明确作用域和传播规则。
- [ ] 输入控件、选择器、IME、Tab 顺序和焦点环没有被破坏。
- [ ] 设置页列出了浏览器级命令的真实绑定与重映射入口。
- [ ] 200% 放大下快捷键面板与设置页仍可使用。
- [ ] 只用键盘可以完成核心操作流程。

## 官方来源

- [Chrome Extensions Commands API](https://developer.chrome.com/docs/extensions/reference/api/commands)
- [Respond to commands](https://developer.chrome.com/docs/extensions/develop/ui/respond-to-commands)
- [Support accessibility](https://developer.chrome.com/docs/extensions/how-to/ui/a11y)
- [Chrome keyboard shortcuts](https://support.google.com/chrome/answer/157179)

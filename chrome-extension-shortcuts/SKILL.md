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

完成标志：命令会出现在 `chrome://extensions/shortcuts`，用户可以重新绑定。

### 2. 遵守 Commands API 限制

官方支持：

- `A`–`Z`
- `0`–`9`
- `Comma`、`Period`、`Home`、`End`、`PageUp`、`PageDown`、`Space`、`Insert`、`Delete`
- 方向键和媒体键
- `Ctrl`、`Alt`、`Shift`、`MacCtrl`、`Option`、`Command`

关键约束：

- 必须包含 `Ctrl` 或 `Alt`；macOS 可用 `Command`。
- `Shift` 可选。
- `Ctrl+Alt` 不允许。
- `Escape` 和 `Enter` 不是可注册的 Commands API 按键。
- 每个扩展最多提供 4 个建议快捷键。
- 系统或 Chrome 保留快捷键永远优先，扩展不能覆盖。

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
chrome.runtime.onInstalled.addListener(async ({ reason }) => {
  if (reason !== 'install') return;
  const commands = await chrome.commands.getAll();
  const missing = commands.filter((command) => command.shortcut === '');
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

完成标志：用户知道有哪些快捷键、如何改、当前是否真的生效。

### 6. 验证绑定，而不是假设

`chrome.commands.getAll()` 是唯一可信来源：

- 返回非空 `shortcut`：Chrome 接受了你的建议键。
  注意这只说明"注册成功"，不代表按键在宿主页面上一定先到扩展 —— 系统与浏览器保留组合仍然优先。
- 返回空串：注册失败（被别的扩展或系统占用）。这是正常结果，不是异常，必须让用户看见。

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

完成标志：键盘操作完整闭环，输入法、选择器、Tab 顺序和辅助技术都能工作。

### 3. 焦点和可访问性

- 优先使用原生 `button`、`input`、`select` 等控件。
- 自定义控件使用合理的 `tabIndex` 和 ARIA。
- 始终保留清晰、可辨识的焦点指示。
- 快捷键应覆盖重要动作，不是把所有功能都塞进键盘。

完成标志：只用键盘可以完成核心流程；焦点位置始终可见；无鼠标操作不中断。

### 4. 在设置页公开快捷键

官方建议在 options page 中说明扩展快捷键。帮助浮层可以作为补充，但设置页应提供入口或完整列表。

完成标志：用户能在设置页查到快捷键，不需要猜。

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
- [ ] 设置页或帮助页列出了用户可用快捷键。
- [ ] 只用键盘可以完成核心操作流程。

## 官方来源

- [Chrome Extensions Commands API](https://developer.chrome.com/docs/extensions/reference/api/commands)
- [Respond to commands](https://developer.chrome.com/docs/extensions/develop/ui/respond-to-commands)
- [Support accessibility](https://developer.chrome.com/docs/extensions/how-to/ui/a11y)
- [Chrome keyboard shortcuts](https://support.google.com/chrome/answer/157179)

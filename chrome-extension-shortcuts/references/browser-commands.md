# Browser commands

Chrome 有焦点时生效、由浏览器管理键位的快捷键。官方入口：[Commands API](https://developer.chrome.com/docs/extensions/reference/api/commands)。

## 1. 在 manifest 声明命令

```json
{
  "commands": {
    "toggle-panel": {
      "suggested_key": {
        "default": "Alt+K",
        "mac": "Command+K"
      },
      "description": "打开或关闭收藏面板"
    }
  }
}
```

- 平台键只有 `default`、`chromeos`、`linux`、`mac`、`windows`；给字符串是全平台同一个键。
- 省略 `suggested_key` 的命令保持未绑定，等用户自己指定 —— 需要一个"存在但不默认占键"的命令时用它。
- `description` 对标准命令**必填**，会出现在快捷键管理 UI；对 Action 命令会被忽略。
- 默认键不要落在 Chrome 自己的快捷键上（见第 4 节）。同一个动作在 Windows/Linux 与 macOS 上通常要给两套键。

完成标志：命令能在 `chrome://extensions/shortcuts` 里看到并改键。

## 2. 在 service worker 注册 onCommand

**声明只是登记键位，不会执行任何东西。** 官方原文："This key combination triggers the `commands.onCommand` event in the service worker." 事件必须在 service worker 里接：

```js
chrome.commands.onCommand.addListener((command, tab) => {
  if (command !== 'toggle-panel') return;
  // tab 是触发这次命令的标签页
  if (typeof tab?.id !== 'number') return;
  chrome.tabs.sendMessage(tab.id, { type: 'ui.toggle-panel' });
});
```

三条容易写错的：

- **用 `tab` 定向投递，不要广播。** 回调给的 `tab` 就是用户当时所在的页面；换成"发给所有标签页"会让每一次按键同时切换所有标签页的界面。
- **拿不到 `tab.id` 时什么都不做。** 没有目标就宁可这次没反应，也不能退化成一个全局广播。
- **每个 command id 一个显式分支**，并把它抽成可单独调用的函数 —— 理由见第 6 节。

完成标志：每个标准命令都有对应的处理分支，`_execute_*` 不走进来。

## 3. 遵守键位与作用域限制

官方支持的键：

| 类别 | 可用值 |
|---|---|
| 字母 / 数字 | `A`–`Z`、`0`–`9`（**大小写敏感**） |
| 通用 | `Comma`、`Period`、`Home`、`End`、`PageUp`、`PageDown`、`Space`、`Insert`、`Delete` |
| 方向键 | `Up`、`Down`、`Left`、`Right` |
| 媒体键 | `MediaNextTrack`、`MediaPlayPause`、`MediaPrevTrack`、`MediaStop` |
| 修饰键 | `Ctrl`、`Alt`、`Shift`、`MacCtrl`(macOS)、`Option`(macOS)、`Command`(macOS)、`Search`(ChromeOS) |

约束：

- 必须含 `Ctrl` 或 `Alt`；macOS 可用 `Command`/`MacCtrl` 代替 `Ctrl`，`Option` 代替 `Alt`。
- `Shift` 可选。`Ctrl+Alt` 不允许（避开 AltGr）。媒体键不能与任何修饰键组合。
- `Escape`、`Enter` 不在支持列表里 —— 这两个只能留在 in-page keymap。
- 键名写错大小写会导致**安装时 manifest 解析错误**，不是安静忽略。
- `MacCtrl` 出现在非 macOS 平台会**校验失败、阻止安装**。
- macOS 上 `Ctrl` 会被自动转成 `Command`；真要 Control 键必须写 `MacCtrl`。
- 每个扩展最多 4 个建议键；更多只能用户自己加。

作用域：

- 默认命令需要 Chrome 有焦点；`global: true` 才能在 Chrome 失焦时触发（ChromeOS 不支持，建议键仅 `Ctrl+Shift+0..9`）。
- **系统与 Chrome 保留快捷键永远优先，扩展覆盖不了。**

完成标志：每个默认键都符合上表，且没有占用系统或 Chrome 已保留的组合。

## 4. 避开 Chrome 已经用掉的键

保留键分两类，都要躲：

- **系统级**：窗口管理、输入法切换等。
- **Chrome 级**：官方快捷键表里的每一条。高频踩坑项是 `Ctrl+K`（"Search from anywhere on the page"）—— 写这个值在 Windows/Linux 上会和浏览器自己抢。核对时以官方表为准，不要凭记忆。

改键代价低，改错代价高：**Windows/Linux 与 macOS 分别给键**，让两边都落在没被占用的组合上。

完成标志：每个默认键都能在官方快捷键表里确认"不存在"。

## 5. 检查冲突与未绑定

建议键可能被别的扩展或系统占用而注册失败，官方要求扩展不能假设它生效：

```js
const OWN_COMMANDS = ['toggle-panel'];

chrome.runtime.onInstalled.addListener(async () => {
  const commands = await chrome.commands.getAll();
  // 只看自己的命令：getAll() 还会返回 _execute_action 一族，
  // 它们没有描述、shortcut 也常为空，会把这里误报成"冲突"。
  const missing = commands.filter(
    (command) => OWN_COMMANDS.includes(command.name) && command.shortcut === '',
  );
  if (missing.length > 0) {
    // 在扩展 UI、badge 或设置页告知用户去 chrome://extensions/shortcuts 重新绑定
  }
});
```

`getAll()` 的语义要读准，否则会把正常的"没配"报成"坏了"：

- `shortcut` 字段是「当前是否 active」。**空串只表示"当前没有绑定"**，可能是建议键被占用、可能本来就没配、也可能是用户主动解绑 —— 不要一律归因成冲突。
- **非空只表示"现在有一个绑定"**，不表示它等于你的 `suggested_key`（用户可能改过）。
- Chrome 110 起 `getAll()` 会返回 `_execute_action`；检查与展示都按**命令名白名单**收窄，别靠"没有描述"或"shortcut 为空"来识别保留命令。

提示的时机与收起：

- 只在安装、或这次更新新增了命令时检查一次。装完之后用户可能是有意解绑，反复提示是打扰。
- 只靠"命令成功触发过"来收起提示是不够的：用户解绑后命令永远不会触发，角标会一直挂着。用户主动打开快捷键设置页、或命令真的触发过，都应收起。
- 角标只是视觉信息 —— 把原因同时写进 `action.setTitle()`，读屏和悬停才拿得到。

完成标志：冲突与未绑定对用户可见且能收起，不静默失败、也不长期滞留。

## 6. 验证绑定，而不是假设

`chrome.commands.getAll()` 是判断"当前有没有绑定"的可信来源；但它**证明不了按键真的能到达扩展**（保留组合仍然优先）。

测试手段的边界（这条是实测结论，不是官方文档的表述）：

- **Playwright / CDP 注入的按键不经过浏览器加速表。** `page.keyboard.press('Meta+K')` 直接进渲染进程，触发不了扩展命令；用它断言等于在测自动化工具。
- **`tabs.sendMessage` 触发的是内容脚本的 `runtime.onMessage`，和 `commands.onCommand` 是两个不同的事件、不同的接收方。** 用前者冒充后者，等于这段链路根本没被测到。
- 可行做法：把"命令名 → 动作"抽成可调用函数，用假依赖单测它（包括"只投递给触发页""没有触发页时不动"）；内容脚本那一侧单独测"收到事件后的反应"。
- 真实加速器（含冲突优先级、用户重映射）留在浏览器里手动 smoke 一次。

完成标志：自动化分别覆盖"命令处理逻辑"与"收到事件后的反应"，且真实按键被人工确认过一次。

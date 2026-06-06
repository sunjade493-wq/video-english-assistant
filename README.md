# video-english-assistant

一个纯 HTML/CSS/Vanilla JavaScript 实现的 Video English Assistant。

当前版本：V1.7 Obstacle Detection Engine。

V1.7 在保持 V1.5 页面 UI、布局与样式不变的前提下，加入第一个可工作的障碍识别引擎：

```text
英文字幕文本
↓
障碍识别
↓
障碍流生成
```

## 项目结构

```text
video-english-assistant/
├── index.html
├── styles.css
├── script.js
├── preview-v1.5.svg
├── preview-v1.7.svg
└── README.md
```

## 功能

- 左侧 70% 视频学习区，右侧 30% 障碍流。
- 障碍流按出现顺序只显示「生词」和「理解」两种卡片。
- 生词卡片固定字段：生词、音标、中文释义。
- 理解卡片固定字段：出处、字面意思、实际意思、语法解释。
- 点击「✓ 不用管我了」可隐藏单张卡片。
- 使用 `localStorage` 永久记忆隐藏状态，刷新页面后保持隐藏。
- 顶部「恢复全部」按钮可清空隐藏记录。
- 右侧障碍流支持滚动。
- 支持平板和手机响应式布局。
- V1.7 新增障碍识别引擎，可从英文字幕文本自动生成障碍流。

## V1.7 障碍识别规则

### 生词障碍

根据用户词汇等级判断单词是否超出范围。当前支持等级：

- 初中：`junior`
- 高中：`senior`
- CET4：`cet4`
- CET6：`cet6`
- 自定义词汇量：`custom`

超出当前等级的单词会进入「生词障碍」。例如在初中等级下：

```text
If you enjoyed this lecture, I'm sure you're too busy to lay it on us.
```

会识别出：

```text
生词障碍：lecture
```

### 理解障碍

理解障碍与词汇等级无关，用于识别：

- 固定搭配
- 短语动词
- 习语
- 俚语
- 非字面义表达

当前内置识别项：

- `lay it on us`
- `pull me off the project`
- `straight up`
- `come on`

例如：

```text
理解障碍：lay it on us
```

## 使用方式

直接用浏览器打开 `index.html`，或使用任意静态文件服务器运行本项目。

页面默认使用示例字幕生成障碍流：

```text
If you enjoyed this lecture, I'm sure you're too busy to lay it on us.
```

也可以在浏览器控制台调用 V1.7 引擎，不需要修改页面结构：

```js
ObstacleDetectionEngine.analyze(
  "If you enjoyed this lecture, I'm sure you're too busy to lay it on us.",
  { level: 'junior' },
);
```

返回并渲染：

```text
生词障碍：lecture
理解障碍：lay it on us
```

如需加入用户自定义已掌握词汇：

```js
ObstacleDetectionEngine.analyze(
  'Please pull me off the project.',
  {
    level: 'custom',
    customWords: ['please', 'pull', 'me', 'off', 'the', 'project'],
  },
);
```

## V1.7 暂不包含

- 暂不接视频。
- 暂不接字幕文件。
- 暂不接播放器。
- 暂不修改 V1.5 UI、页面布局或样式。

## 网页预览截图

V1.7 没有修改 UI、页面布局或样式，因此网页预览截图保持 V1.5 页面外观：`preview-v1.7.svg`。

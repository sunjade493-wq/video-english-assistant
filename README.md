# video-english-assistant

一个纯 HTML/CSS/Vanilla JavaScript 实现的 Video English Assistant。

当前版本：V1.10 Compact Understanding Card。

V1.7 在保持 V1.5 页面 UI、布局与样式不变的前提下，加入第一个可工作的障碍识别引擎。

V1.8 在左侧视频区域下方加入 Analyze 工作流入口。

V1.9 Frozen：冻结 V1.9 既有交互与布局基线。

V1.10 仅优化理解卡阅读密度：保持理解卡四个字段不变，将字段标题与内容改为同一行展示。

```text
Subtitle Text
↓
Analyze
↓
Obstacle Detection Engine
↓
Obstacle Stream
```

## 项目结构

```text
video-english-assistant/
├── index.html
├── styles.css
├── script.js
├── preview-v1.5.svg
├── preview-v1.7.svg
├── preview-v1.9.svg
└── README.md
```

## 功能

- 左侧 70% 视频学习区，右侧 30% 障碍流。
- 障碍流按出现顺序只显示「生词」和「理解」两种卡片。
- 生词卡片固定字段：生词、音标、中文释义。
- 理解卡片固定字段：出处、字面意思、实际意思、语法解释。
- V1.10 理解卡展示方式为「字段：内容」同一行展示，提高阅读密度。
- 点击「✓ 不用管我了」可隐藏单张卡片。
- 使用 `localStorage` 永久记忆隐藏状态，刷新页面后保持隐藏。
- 顶部「恢复全部」按钮可清空隐藏记录。
- 右侧障碍流支持滚动。
- 支持平板和手机响应式布局。
- V1.7 新增障碍识别引擎，可从英文字幕文本自动生成障碍流。
- V1.8 新增 Subtitle Input 多行文本框和 Analyze 按钮，点击后清空旧障碍流并渲染新障碍流。

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

## V1.8 Analyze Workflow

```text
Subtitle Text
↓
Analyze
↓
Obstacle Detection Engine
↓
Obstacle Stream
```

点击左侧视频区域下方的 `Analyze` 按钮后，页面会读取 `Subtitle Input` 多行文本框中的英文字幕文本，调用 `ObstacleDetectionEngine.analyzeSubtitleText()` 生成新的障碍流，并重新渲染右侧卡片。

生词障碍优先输出，理解障碍第二优先输出。生词卡片固定显示：生词、音标、中文释义；理解卡片固定显示：出处、字面意思、实际意思、语法解释。隐藏卡片、`localStorage` 记忆隐藏状态、恢复全部按钮继续保留。

## V1.10 Compact Understanding Card

V1.10 只调整理解卡的展示密度，不修改生词卡、Analyze 工作流、障碍识别引擎、70% / 30% 布局，也保留「✓ 不用管我了」。

理解卡四个字段保持不变：

- 出处
- 字面意思
- 实际意思
- 语法解释

展示方式从标题和内容分行：

```text
出处：
内容

字面意思：
内容

实际意思：
内容

语法解释：
内容
```

调整为标题和内容同行：

```text
出处：内容

字面意思：内容

实际意思：内容

语法解释：内容
```

## 使用方式

直接用浏览器打开 `index.html`，或使用任意静态文件服务器运行本项目。

页面默认在 `Subtitle Input` 中填入示例字幕：

```text
If you enjoyed this lecture, I'm sure you're too busy to lay it on us.
```

点击 `Analyze` 后会生成：

```text
生词障碍：lecture
理解障碍：lay it on us
```

也可以在浏览器控制台调用引擎：

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

## Testing

```text
✅ node --check script.js
✅ 理解卡字段同行展示检查
✅ Analyze 按钮测试
✅ 默认文本测试
```

## V1.10 暂不包含

- 暂不接视频。
- 暂不接字幕文件。
- 暂不接播放器。
- 暂不修改生词卡。
- 暂不修改 Analyze 工作流。
- 暂不修改障碍识别引擎。
- 暂不修改 V1.5 左侧 70% / 右侧 30% 整体布局和整体视觉风格。

## 网页预览截图

V1.10 保持 V1.5 左侧 70% / 右侧 30% 页面布局与整体视觉风格，仅将理解卡字段调整为同一行紧凑展示。

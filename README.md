# video-english-assistant

一个纯 HTML/CSS/Vanilla JavaScript 实现的 Video English Assistant V1.5 障碍流结构冻结。

## 项目结构

```text
video-english-assistant/
├── index.html
├── styles.css
├── script.js
├── preview-v1.5.svg
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

## 运行方式

直接用浏览器打开 `index.html`，或使用任意静态文件服务器运行本项目。

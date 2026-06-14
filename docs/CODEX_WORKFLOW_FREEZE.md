# Codex 开发工作流冻结（CODEX_WORKFLOW_FREEZE）

## 1. 单一事实仓库（Single Source of Truth）

Codex 和 GitHub 唯一工作目录：

C:\Users\10604\Desktop\video-english-assistant-github

本机实验目录：

C:\Users\10604\Desktop\Video_English_Assistant

仅允许：

* 本机实验
* 临时调试
* 数据验证

禁止：

* 直接作为 Codex 基线
* 直接作为 GitHub 基线
* 直接要求 Codex 基于该目录修改

## 2. 每次开始 Codex 工作前必须执行

git status
git pull origin main

目的：

* 确保工作区干净
* 确保基于最新 main
* 避免旧文件、旧分支、旧缓存导致错误修改

## 3. 所有关键输入文件必须先进入 GitHub

例如：

* *.py
* *.csv
* *.json
* prompt templates
* test fixtures

流程：

本机实验目录
↓
复制到 github 工作目录
↓
git add
↓
git commit
↓
git push origin main
↓
Codex 开始工作

禁止：

上传本地文件给 Codex 作为唯一基线。

## 4. Codex 默认约束

每次任务必须明确写：

只基于 main 最新代码。

不要创建 demo 数据。

不要猜测缺失文件。

缺文件必须暂停并报告。

不要自行重构。

不要新增替代 pipeline。

不要修改未授权文件。

## 5. Diff 白名单机制

每个任务必须指定允许修改文件：

例如：

允许修改：

v29a_obstacle_generator.py
output_text/v29a_obstacles.json
output_text/v29a_obstacles.csv

禁止修改：

script.js
analyze-engine.js
v28d_bilingual_subtitles.csv
docs/*
其他任何文件

完成后必须输出：

git diff --name-only

如果 diff 超出白名单：

立即停止。

## 6. 大修复禁止一次完成

禁止：

"顺手优化"
"顺手重构"
"顺手统一"

必须采用：

调查
↓
冻结
↓
最小补丁
↓
验证
↓
下一轮

原则：

每轮只解决一个问题。

## 7. 文件不存在原则

如果：

* 文件不存在
* 文件未进入 GitHub
* 无法确定真实基线

必须：

暂停
报告缺失文件
等待用户提供

禁止：

* 创建 demo 文件
* 猜测实现
* 重写 generator
* 自动补全 pipeline

## 8. 所有任务结束必须输出

Testing

git status
git diff --name-only
git diff --check

Counts

Modified files

Commit hash

PR name

如果没有修改：

明确说明：

No files modified.
No commit.
No PR.

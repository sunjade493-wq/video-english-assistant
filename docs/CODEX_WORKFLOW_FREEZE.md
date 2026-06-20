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

## 9. Repository Ready Check

Before every Codex task:

```powershell
cd C:\Users\10604\Desktop\video-english-assistant-github

git status
git pull origin main
```

Repository is considered READY only if:

### Condition 1

git status contains:

```text
nothing to commit, working tree clean
```

### Condition 2

git pull origin main contains:

```text
Already up to date.
```

Only when BOTH conditions are satisfied may a new Codex task begin.

If either condition fails:

❌ Do not ask Codex to work.

First resolve repository synchronization issues.

Reason:

The V29E/V29F incident showed that starting Codex work before repository synchronization can lead to:

- missing real files
- multiple baselines
- demo data generation
- file guessing and rewrites
- incorrect fixes based on non-canonical code

## Codex Workspace Exception

Codex workspace may not have an origin remote.

If the user's local repository has already passed:

```text
git status
→ nothing to commit, working tree clean
```

```text
git pull origin main
→ Already up to date.
```

then:

```text
'origin does not appear to be a git repository'
```

inside Codex workspace is NOT considered a repository failure.

It does NOT imply:

* GitHub is broken
* Repository is out of sync
* Baseline is lost
* Files are missing

Codex may continue with:

* documentation tasks
* read-only investigations
* code tasks that already have real files available

## P0-4F Baseline Protection Rule

Lessons learned from P0-4F:

1. Always verify repository baseline before editing.

Required checks:
git branch --show-current
git status --short
git log --oneline -1

2. Never assume file locations.

Search implementation location first:
findstr
Select-String
rg

3. Small UI fixes must use minimal-scope edits.

Do not rebuild menus.
Do not refactor existing architecture.
Do not introduce helper functions unless explicitly required.

4. Every Codex task must specify:

* exact branch when available
* exact commit hash
* allowed files
* forbidden files
* expected git diff scope

5. UI work process:
   Edit
   → Video verification
   → User acceptance
   → Commit
   → Tag
   → Freeze

Never commit before video verification.

6. If Codex workspace baseline differs from the required repository baseline:
   STOP.
   Do not edit until branch, commit, and files are confirmed identical.
   If branch name differs but HEAD commit matches the required commit, editing docs-only tasks is allowed.

7. Search before instructing.
   Before asking Codex to modify logic:

* locate actual implementation file
* paste evidence snippets
* write modification instruction based on evidence

Never write requirements based on assumptions.

Protection rules:

* Append only.
* Do not recreate existing documents.
* Do not modify previous frozen sections.
* Deleted lines must be 0.
* Keep diff minimal.

Validation:
git diff --stat docs/PROJECT_STATUS_V6.md docs/CODEX_WORKFLOW_FREEZE.md
git diff docs/PROJECT_STATUS_V6.md
git diff docs/CODEX_WORKFLOW_FREEZE.md

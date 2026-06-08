# Changelog

## V2.5A Comprehension Progress – Design Freeze Candidate

V2.5A Comprehension Progress 进入 Design Freeze Candidate 状态。本条目只记录候选设计方向，不表示 Implemented、Frozen 或 Released。

设计方向：

- 产品目标：攻克视频，而不是背单词。
- 学习目标：听懂这一集。
- 核心指标：剩余障碍数。
- 用户关注的是“这集还剩多少障碍”以及“我离听懂这一集还有多远”，而不是学过、掌握或待复习了多少单词。

明确不做传统学习系统：

- 生词本
- 复习系统
- 遗忘曲线
- 已掌握状态
- 学过状态
- 待复习状态
- 学习耗时统计

原因：这些系统不符合当前产品路线。本产品关注障碍减少、听懂度提升与攻克视频内容。

学习进度逻辑候选：

- 一集视频首次 Analyze 后，初始障碍数等于当前视频全部识别出的障碍数。
- 点击 `✓ 不用管我了` 表示该障碍在本集中已处理，剩余障碍数减少。
- `✓ 不用管我了` 不表示永久掌握，不加入生词本，不加入复习计划。
- 同一集视频再次打开时，应从上次剩余障碍状态继续，不重新从初始障碍数开始。
- 示例：初始 100 个障碍，处理进度可以表现为 `100 → 90 → 60 → 20 → 0`；若第一遍处理后剩余 90，第二遍打开仍从 90 开始。

按钮与菜单候选：

- 主界面 Learning Tips 卡片内保留 `✓ 不用管我了`，含义为“本集已处理该障碍”。
- 主界面 Learning Tips 卡片内新增 `↶ 撤回上一步`，用于撤销最近一次 `✓ 不用管我了` 隐藏操作。
- 示例：`lecture` → `✓ 不用管我了` → `↶ 撤回上一步` → `lecture` 恢复。
- 原 `恢复全部` 重命名为 `重置本集学习进度`。
- `重置本集学习进度` 不放主界面，移入 `⋯` 菜单。
- 点击 `重置本集学习进度` 后必须弹确认：`确定重置本集学习进度？`；说明重置后本集所有障碍会重新出现；选项为 `取消` 与 `确认重置`。

V2.4B Learning Heatmap Polish 仍保持 Backlog（暂缓开发），不随 V2.5A Design Freeze Candidate 进入开发。

## V2.4B Learning Heatmap Polish – Backlog（暂缓开发）

V2.4B 已完成设计讨论，但暂不进入开发；待 V2.5 Learning Progress System 全部完成后，再评估是否实施。

记录但不实现：

### UI Polish

- 聚合点尺寸渐变
- 聚合点颜色渐变
- 聚合动画
- Bottom Sheet 动画
- 当前区域高亮动画优化

### Advanced Heatmap

- 二级聚合
- 缩放级别
- 长视频支持
- 100+ 障碍优化

### Visual Analytics

- 热力图颜色强度
- 难度等级可视化
- 集级难度评分

## V2.4A Obstacle Timeline Frozen ✅

V2.4A Obstacle Timeline 已验收完成，并正式标记为 Frozen。

Frozen Scope：

- 双时间轴
- 障碍热力轴
- Google Maps 式视觉密度聚合
- 聚合点数字显示
- Bottom Sheet
- 当前区域高亮
- 按字幕节点分组
- 同句多障碍绑定
- 点击障碍跳转
- Learning Tips 同步
- 播放状态保持

冻结说明：

- V2.4A 锁定 Obstacle Timeline 的已验收范围，不继续追加视觉动画、二级聚合、缩放级别、长视频优化或 Visual Analytics。
- `✓ 不用管我了` 仍只隐藏 Learning Tips 当前卡片，不改变热力图聚合数字，也不改变播放 / 暂停状态。
- V2.4B 仅作为设计记录进入 Backlog，暂不实现。

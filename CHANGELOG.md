# Changelog

## V2.6F Multi-Meaning Stress Test

Validation dataset for context-dependent and multi-meaning comprehension obstacles.


## V2.6E Quality Validation Round 1

Human review dataset generated.

## V2.6A Analyze Engine Mock Layer – Frozen ✅

V2.6A Analyze Engine Mock Layer 已验收并冻结。

项目状态：V2.6A Analyze Engine Mock Layer，Status: Frozen ✅。

Freeze Date: 2026-06-09

Implementation Commit: `9f2660d`

Review Fix Commit: `0f6708a9f5634364553758acdae3837895cebd7a`

Frozen Scope：

1. Analyze Engine 独立模块
   - Input: subtitle items + user vocab level
   - Output: vocab obstacles + comprehension obstacles
2. 生词障碍
   - 显示 `word + phonetic + part of speech`
   - 显示句中含义
   - 示例：`lecture /ˈlektʃər/ n./v.` / `句中含义：讲座`
3. 理解障碍
   - 使用原型结构显示
   - 示例：`lay something on somebody`、`pull somebody off something`、`give somebody a hand`
   - 显示结构：原型结构（标题）、字面意思、实际意思、语法解释
4. Principle #7 Frozen
   - 理解障碍必须显示原型结构。
   - 禁止显示剧中具体变体作为知识点标题。
   - 正确：`pull somebody off something`、`lay something on somebody`
   - 错误：`pull me off the project`、`lay it on us`
5. Grammar Explanation Frozen
   - 语法解释必须解释为什么这个表达会产生这个意思。
   - 不能仅说明“这是一个习语”或“这是固定搭配”。
6. Multiple Obstacles Frozen
   - 允许多个生词、多个理解障碍，以及生词 + 理解障碍。
   - 同一句全部保留。
7. Removed
   - 删除 `重置本集学习进度`。
   - 原因：不符合“攻克视频”这一产品目标，而是偏向管理学习记录。
   - Future：未来由剧集管理系统提供 `重新学习本集`，暂不开发。

Regression Verification：

- ✓ V2.4A Obstacle Timeline
- ✓ V2.5A Progress
- ✓ Obstacle Navigation
- ✓ Bottom Sheet
- ✓ Progress Persistence
- ✓ Undo
- ✓ Analyze Recovery

V2.6A Frozen ✅

## V2.5C Learning Tips Layout Polish – Backlog（暂缓开发）

V2.5C Learning Tips Layout Polish 已记录为 Backlog，暂缓开发。

暂缓原因：

- 当前优先完成核心学习流程与理解障碍系统。
- 当前 Learning Tips 布局可用，但存在信息密度不足问题。
- 待主要功能完成后，再统一进行 UI 精修。

布局紧凑度目标：

- 在保留短语标题、字面意思、实际意思与语法解释的前提下，减少 40%~60% 卡片高度。
- 提高单屏可见信息量。
- 保持移动端可读性。

解释质量原则：

- 不允许为了压缩高度而牺牲解释质量。
- 不把语法解释退化成 `固定习语` 这类词典式标签。
- 理解障碍需要解释表达形成过程，例如 `call A B` 表示“把 A 称为 B”，进而说明 `it` 与 `day` 在 `call it a day` 中如何引申出“今天就做到这里”。
- 详细不等于长篇大论，详细是解释到位。
- 简练不等于信息减少，简练是不说废话。

未来验收标准：

- 卡片高度明显降低。
- 信息密度提升。
- 字面意思 / 实际意思 / 语法解释仍完整保留。
- 理解障碍解释质量不得下降。
- 优先保证理解效果，再考虑视觉紧凑度。

## V2.5A Comprehension Progress – Frozen ✅

V2.5A Comprehension Progress 已从 Design Freeze Candidate 更新为 Frozen ✅。本次冻结只确认本集理解进度范围，不追加新功能。

已验收通过范围：

- `✓ 已攻克 N`
- `○ 剩余 N`
- `↶ 撤回上一步`
- 本集进度持久化（localStorage）
- Analyze 同一字幕恢复进度
- 浏览器刷新恢复进度
- Learning Tips 顶部进度模块

明确不包含：

- 学习第几遍
- 学习耗时统计
- 生词本
- 复习系统
- 遗忘曲线
- 已掌握
- 待复习

冻结说明：

- V2.5A 的核心目标仍是攻克视频，而不是背单词。
- 学习目标是帮助用户逐步听懂这一集视频。
- 核心指标锁定为本集已攻克障碍数与剩余障碍数。
- `✓ 不用管我了` 表示该障碍在本集中已处理，不表示永久掌握，不加入生词本，不加入复习计划。
- 同一字幕再次 Analyze 时恢复本集学习进度。
- 浏览器刷新后恢复本集学习进度。
- Review Fix：`重置本集学习进度` 已移除；未来由 Episode Management System 提供 `重新学习本集`。

V2.5C Learning Tips Layout Polish 与 V2.4B Learning Heatmap Polish 仍保持 Backlog（暂缓开发），不随 V2.5A Frozen 追加开发。

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

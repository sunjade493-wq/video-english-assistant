# Project Status V6

## V29I（Vocabulary Runtime / POS Display）

## V29I-0E Backend Complete POS Combination Repair ✅ (Completed)

日期：2026-06-16

问题：

* Runtime 原先显示的是句子里的单一词性或第一个词性。
* frozen 合同要求显示词典级（dictionary-level）全部可能词性。
* 示例：

  * outside 错误显示：adv.
  * outside 正确显示：adv./adj./prep./n.

修复内容：

* 后端生成器（v29a_obstacle_generator.py）成为 partOfSpeech 显示值唯一来源（source of truth）。
* 新增 POS_DISPLAY_OVERRIDES_BY_WORD 完整词性库存：

  * outside → adv./adj./prep./n.
  * official → adj./n.
  * alone → adj./adv.
  * believe → vt./vi.
  * project → n./vi./vt.
  * pull → n./vi./vt.
* normalize_part_of_speech(entry) 优先读取：

  1. POS_DISPLAY_OVERRIDES_BY_WORD
  2. POS_DISPLAY_BY_SOURCE
  3. SUPPORTED_POS_DISPLAY_FORMATS
  4. POS_CANONICAL_COMBINATIONS
* output_text/v29a_obstacles.json
* output_text/v29a_obstacles.csv
  均改为直接写入后端规范化后的完整词性组合。

验证结果：

* invalid vocabulary required field count = 0
* invalid POS count = 0
* outside = adv./adj./prep./n.
* official = adj./n.
* alone = adj./adv.
* believe = vt./vi.

冻结原则（Frozen Rule）：
Vocabulary 卡片显示的是词典级完整词性组合（dictionary-level POS inventory），而不是当前句子的实际词性，也不是第一个词性。Runtime 不再推断、拼接或裁剪词性，仅负责原样显示后端生成结果。

状态：
✅ Completed
✅ Merged to main
PR：
Fix V29A vocabulary POS combinations (#126)
Commit：
c3f28c3dbecf26b799274ad054a1dc3ac0c3c1c4

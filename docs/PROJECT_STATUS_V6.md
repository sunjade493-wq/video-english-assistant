# PROJECT_STATUS_V6

# V29I — Vocabulary Display Contract (Frozen)

日期：
2026-06-15

目标：
统一生词卡的数据契约，保证展示层永远显示词典原型（dictionary/base form），而不是字幕中的变形词。

冻结内容：

## 1. Vocabulary Output Contract

* word：词典原型（dictionary form）
* lemma：词典原型
* phonetic：原型音标
* sentenceMeaning：简短句中含义（建议 ≤10 个汉字）
* translation：完整中文释义
* partOfSpeech：冻结显示格式

## 2. Surface Form Matching

字幕中的变形词通过：
surfaceForms

进行匹配，例如：

* ordered → order
* sleeping → sleep
* bedsheets → bedsheet
* consummated → consummate

输出障碍卡时：
word、lemma、phonetic、partOfSpeech、sentenceMeaning
全部使用原型数据。

## 3. baseForm Compatibility Rule

baseForm 保留为 legacy-compatible 字段：

* 可以输出
* 可以为空
* 不再属于 vocabulary validation required fields
* 前端不得依赖 baseForm 渲染

## 4. Frozen POS Display Formats

允许格式：

n.
pron.
adj.
adv.
prep.
conj.
interj.
det.
num.
vt.
vi.
vt./vi.
n./vt.
n./vi.
n./vi./vt.
adj./n.
adj./vt.
adj./adv.
adv./adj.
aux. v.
modal v.
linking v.

禁止输出未冻结的新格式。

## 5. Vocabulary Card UI Contract

Line 1：
word + phonetic + partOfSpeech

示例：
order /ˈɔːrdər/ n./vi./vt.

Line 2：
仅显示音频按钮（🔊）

Line 3：
句中含义：{sentenceMeaning}

示例：
句中含义：点餐

禁止显示：
原型：baseForm

禁止显示：
translation 全释义

## 6. Validation Result

Total vocabulary obstacle count：
39

Invalid POS count：
0

Long sentenceMeaning count：
0

Inflected display word count：
0

## 7. Modified Files

v29a_obstacle_generator.py
output_text/v29a_obstacles.json
output_text/v29a_obstacles.csv
script.js
styles.css

## 8. Verification Commands

python3 v29a_obstacle_generator.py
python3 -m py_compile v29a_obstacle_generator.py
node --check script.js

状态：
V29I Frozen

可作为后续 Analyze Engine、OCR Pipeline、Obstacle Stream 和 Learning Card UI 的稳定数据契约。

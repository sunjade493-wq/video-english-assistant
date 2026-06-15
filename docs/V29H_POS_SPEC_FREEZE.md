# V29H-2A POS Specification Freeze

Status: Frozen ✅

## 1. Scope

本文件只冻结 POS 标准格式，不执行代码修改。

## 2. Supported POS Formats

允许的 POS 格式如下：

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
adj./adv.
adv./adj.

aux. v.
modal v.
linking v.

## 3. Canonical Ordering

组合词性必须使用固定顺序，避免输出不稳定：

n./vt.
n./vi.
n./vi./vt.
adj./adv.
adv./adj.
vt./vi.

如果一个词具有多个词性，后端应输出上述 canonical order。

## 4. Runtime Rule

Runtime displays partOfSpeech exactly as provided.

Runtime does not:

- infer POS
- guess POS
- reorder POS
- normalize POS
- convert POS
- fallback to dictionary POS

## 5. Backend Rule

Backend generator / Analyze Engine must output final display-ready POS string.

Examples:

noun → n.
pronoun → pron.
adjective → adj.
adverb → adv.
preposition → prep.
conjunction → conj.
interjection → interj.
determiner → det.
numeral → num.
transitive verb → vt.
intransitive verb → vi.
verb with both transitive and intransitive usage → vt./vi.
auxiliary verb → aux. v.
modal verb → modal v.
linking verb → linking v.

## 6. Non-Goals

This document does not:

- update current output_text data
- modify v29a_obstacle_generator.py
- modify script.js
- modify styles.css
- change card layout
- change runtime behavior

## 7. Next Task

Recommended next task:

V29H-2B Backend POS Data Normalize

目标：

Update backend dictionary/generator so output_text/v29a_obstacles.json uses the frozen POS formats.

## 8. Bootstrap Maintenance Note

Because this task creates a new freeze document, PROJECT_STATUS_V6.md must be updated in a separate follow-up PR after this PR is merged.

Do not update PROJECT_STATUS_V6.md in this PR.

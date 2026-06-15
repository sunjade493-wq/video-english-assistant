# V29I-0A Vocabulary Display Data Contract Freeze

Status: Frozen ✅

## 1. Scope

This document freezes the corrected backend-to-frontend vocabulary display data contract.

This is a documentation-only freeze.

No code changes.

No runtime implementation.

No backend implementation.

No output regeneration.

Repository files are the canonical project state. Repository evidence wins over chat memory.

## 2. Core Correction

The vocabulary card should display the dictionary/base form directly as `word`.

Therefore:

- `word` = dictionary/base form of the vocabulary item
- `baseForm` should no longer be required for vocabulary card display
- frontend should not display a separate `原型：...` line
- `phonetic` = phonetic of the dictionary/base form
- `partOfSpeech` = complete POS combination for the word
- `sentenceMeaning` = short best-fit meaning of this word in the current sentence
- frontend displays provided fields directly

## 3. Backend Vocabulary Data Contract

For each vocabulary obstacle, backend / generator must output display-ready vocabulary data.

Required fields:

- `word`
- `lemma`
- `phonetic`
- `partOfSpeech`
- `sentenceMeaning`
- `translation`

Optional / legacy compatibility field:

- `baseForm`

`baseForm` may exist temporarily for compatibility, but it must not be required by the vocabulary card display contract.

## 4. Field Semantics

### 4.1 word

`word` means:

The dictionary/base form of the vocabulary item.

Examples:

```text
ordered → order
sleeping → sleep
consummated → consummate
believe → believe
```

`word` must NOT mean the surface form from the subtitle if the subtitle form is inflected.

### 4.2 lemma

`lemma` means:

Backend internal lemma used for vocabulary grouping, dictionary lookup, and validation.

Examples:

```text
ordered → order
sleeping → sleep
consummated → consummate
```

`lemma` should generally match `word` for display vocabulary items, unless future backend evidence defines a distinction.

### 4.3 phonetic

`phonetic` means:

The phonetic transcription of the dictionary/base form shown in `word`.

Examples:

```text
order → /ˈɔːrdər/
sleep → /sliːp/
believe → /bɪˈliːv/
consummate → /ˈkɑːnsəmeɪt/
```

`phonetic` must not be the phonetic transcription of an inflected subtitle surface form when `word` is normalized to base form.

### 4.4 partOfSpeech

`partOfSpeech` means:

The complete POS combination of the vocabulary word.

It does NOT mean only the POS used in the current sentence.

Examples:

```text
believe → vt./vi.
lecture → n./vi./vt.
alone → adj./adv.
official → adj./n.
order → n./vi./vt.
consummate → adj./vt.
```

Rules:

- Must use frozen POS formats from `docs/V29H_POS_SPEC_FREEZE.md`.
- Must preserve all major POS information.
- Must use frozen canonical ordering.
- Must not collapse verbs into `v.`.
- Must not output `verb`.
- Must not drop valid POS categories just because the current sentence uses one of them.

### 4.5 sentenceMeaning

`sentenceMeaning` means:

The short best-fit meaning of this word in the current sentence.

Examples:

```text
believe → 相信
order → 点餐
sleep → 睡觉
consummate → 圆房
official → 正式的
```

Rules:

- Must be short.
- Must be concise.
- Must be word-level meaning only.
- Must be directly displayable after `句中含义：`.
- Must not explain the whole sentence.
- Must not explain grammar.
- Must not provide usage notes.
- Must not provide learning tips.
- Must not be a long description.

Bad examples:

```text
在 Can you believe 中用来表达惊讶和难以置信。
在酒店语境中表示叫了客房服务。
在婚姻语境中委婉表示“圆房/完成夫妻关系”。
这里表示某个过程或事件开始发生。
```

### 4.6 translation

`translation` means:

General Chinese dictionary-style translation of the word.

It may contain multiple meanings.

Examples:

```text
believe → 相信；认为
order → 命令；点餐；订购；顺序
consummate → 完成；使圆满；圆房
```

Rules:

- Current vocabulary card does not display `translation`.
- `translation` must not replace `sentenceMeaning`.
- Frontend must not fallback from `sentenceMeaning` to `translation`.

## 5. Frontend Display Contract

Vocabulary card displays:

Line 1:

```text
word + phonetic + partOfSpeech
```

Line 2:

```text
🔊
```

Line 3:

```text
句中含义：{sentenceMeaning}
```

Examples:

```text
order /ˈɔːrdər/ n./vi./vt.
🔊
句中含义：点餐

sleep /sliːp/ n./vi.
🔊
句中含义：睡觉

believe /bɪˈliːv/ vt./vi.
🔊
句中含义：相信
```

Do not display:

```text
原型：baseForm
```

because `word` is already the dictionary/base form.

## 6. Non-Goals

Do NOT:

- modify `script.js`
- modify `styles.css`
- modify backend generator files
- regenerate `output_text` files
- modify `PROJECT_STATUS_V6.md`
- modify existing freeze documents
- implement frontend changes
- implement backend changes
- change comprehension cards
- introduce new pipeline
- create demo data

## 7. Modified Files Whitelist

Only this file may be modified in this PR:

```text
docs/V29I_VOCAB_DISPLAY_DATA_CONTRACT_FREEZE.md
```

No other files may be modified.

## 8. Bootstrap Maintenance Note

Because this task creates a new freeze document, `PROJECT_STATUS_V6.md` must be updated in a separate follow-up PR after this PR is merged.

Do not update `PROJECT_STATUS_V6.md` in this PR.

# V29I-0C Vocabulary SentenceMeaning Semantic Responsibility Freeze

Status: Frozen

## 1. Scope

This document freezes ownership of `sentenceMeaning` semantic correctness and the evidence Backend / Analyze Engine must use when generating it.

This is a documentation-only freeze.

No code changes.

No runtime implementation.

No backend implementation.

No output regeneration.

Repository files are the canonical project state. Repository evidence wins over chat memory.

## 2. Core Principle

Backend / Analyze Engine owns `sentenceMeaning` semantic correctness.

Frontend does not own semantic correctness.

Frontend only displays `sentenceMeaning` exactly as provided.

## 3. Responsibility Split

### 3.1 Backend / Analyze Engine Responsibilities

Backend / Analyze Engine is responsible for generating:

```text
sentenceMeaning
```

as:

The short best-fit meaning of the vocabulary word in the current sentence.

Backend / Analyze Engine must use available semantic evidence to decide this value.

Backend / Analyze Engine must not output long explanations as `sentenceMeaning`.

Backend / Analyze Engine must not delegate meaning selection to Frontend.

### 3.2 Frontend Responsibilities

Frontend only displays:

```text
句中含义：{sentenceMeaning}
```

Frontend must not:

- infer `sentenceMeaning`
- rewrite `sentenceMeaning`
- shorten `sentenceMeaning`
- translate `sentenceMeaning`
- replace `sentenceMeaning` with `translation`
- derive `sentenceMeaning` from `source_zh`
- derive `sentenceMeaning` from `source_en`
- apply word-specific semantic fixes

## 4. Required Semantic Evidence

When generating `sentenceMeaning`, Backend / Analyze Engine must consider:

1. `source_en` — original English subtitle
2. `source_zh` — Chinese subtitle translation
3. `word` / `lemma`
4. `translation` — general dictionary-style Chinese meanings
5. current sentence context
6. nearby subtitle context when needed

## 5. Evidence Priority Principle

AI / Analyze Engine may decide the best-fit short meaning.

However:

`source_zh` must be treated as important semantic evidence.

`source_zh` is not the only source of truth.

Therefore:

- Do not blindly copy `source_zh`.
- Do not ignore `source_zh`.
- Use `source_en` and `source_zh` together.
- Use dictionary meaning and context to resolve the best short meaning.

## 6. Examples

### 6.1 Example 1

source_en:

```text
While you were sleeping, I ordered room service.
```

source_zh:

```text
在你睡觉的时候，我点了客房送餐。
```

Vocabulary outputs:

```text
sleep → 睡觉
order → 点餐
room service → 客房服务
```

Reason:

The English sentence and Chinese subtitle align closely, so `source_zh` directly helps determine short word-level meanings.

### 6.2 Example 2

source_en:

```text
Well, I suppose you're right.
```

source_zh:

```text
你说的有道理。
```

Vocabulary output:

```text
suppose → 认为
```

Reason:

The Chinese subtitle is natural but not word-for-word. Backend / Analyze Engine must use English structure, dictionary meaning, and context to determine that `suppose` means roughly “认为 / 想”.

### 6.3 Example 3

source_en:

```text
The autotrophs began to drool, Neanderthals developed tools?
```

source_zh:

```text
自养生物开始发育，尼安德特人发明工具？
```

Vocabulary output:

```text
develop → 发明 / 发展出
```

Reason:

Backend / Analyze Engine must use both `source_en` and `source_zh`. If the Chinese subtitle uses “发明”, that is important evidence; if English context suggests “发展出 / 研发出” is more precise, Backend may choose the best short learner-friendly meaning.

## 7. sentenceMeaning Quality Requirements

`sentenceMeaning` must be:

- short
- concise
- word-level
- current-sentence-specific
- learner-friendly
- directly displayable after `句中含义：`

`sentenceMeaning` must not be:

- a whole sentence explanation
- grammar explanation
- usage note
- learning tip
- long description
- frontend-generated text

## 8. Non-Goals

Do NOT:

- modify `script.js`
- modify `styles.css`
- modify backend generator files
- regenerate `output_text` files
- modify `PROJECT_STATUS_V6.md`
- modify existing freeze documents
- implement semantic QA
- implement Runtime Fail Fast
- change vocabulary card layout
- change comprehension card behavior
- create demo data

## 9. Modified Files Whitelist

Only this file may be modified in this PR:

```text
docs/V29I_SENTENCE_MEANING_SEMANTIC_RESPONSIBILITY_FREEZE.md
```

No other files may be modified.

## 10. Bootstrap Note

Because this task creates a new freeze document, `PROJECT_STATUS_V6.md` must be updated in a separate follow-up PR after this PR is merged.

Do not update `PROJECT_STATUS_V6.md` in this PR.

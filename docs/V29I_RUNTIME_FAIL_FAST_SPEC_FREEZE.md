# V29I-1A Runtime Fail Fast Specification Freeze

Status: Frozen

## 1. Scope

This document freezes Runtime Fail Fast behavior for invalid generated learning obstacle data.

This is a documentation-only freeze.

No code changes.

No runtime implementation.

No backend implementation.

No output regeneration.

Repository files are the canonical project state. Repository evidence wins over chat memory.

## 2. Core Principle

Runtime / Frontend is a read-only consumer of generated learning data.

Runtime must not silently accept invalid obstacle data.

Runtime must not guess, infer, normalize, enrich, rewrite, shorten, translate, or fallback language intelligence fields.

If required obstacle data is missing, empty, or invalid, Runtime must fail fast with a clear developer-facing signal.

## 3. Runtime Fail Fast Purpose

Fail Fast is designed to expose bad data early during development.

Its purpose is not to repair data in the frontend.

Its purpose is to force Backend / Analyze Engine / generator output to comply with frozen data contracts.

## 4. Vocabulary Obstacle Required Fields

For vocabulary obstacles, Runtime must require:

- `word`
- `phonetic`
- `partOfSpeech`
- `sentenceMeaning`

A vocabulary obstacle is invalid if any required field is:

- missing
- null
- empty string
- whitespace-only

## 5. Vocabulary Field Validation Rules

### 5.1 word

`word` must be a non-empty dictionary/base form.

Runtime must not convert an inflected word to base form.

Runtime must not fallback from:

- `word` to `text`
- `word` to `baseForm`
- `word` to `lemma`
- `word` to `phrase`

### 5.2 phonetic

`phonetic` must be non-empty and display-ready.

Runtime must not generate phonetic values.

Runtime must not fallback to:

- placeholder phonetic
- baseForm phonetic
- dictionary lookup
- `待补充`

### 5.3 partOfSpeech

`partOfSpeech` must be one of the frozen supported POS display formats.

Supported formats:

- `n.`
- `pron.`
- `adj.`
- `adv.`
- `prep.`
- `conj.`
- `interj.`
- `det.`
- `num.`
- `vt.`
- `vi.`
- `vt./vi.`
- `n./vt.`
- `n./vi.`
- `n./vi./vt.`
- `adj./n.`
- `adj./vt.`
- `adj./adv.`
- `adv./adj.`
- `aux. v.`
- `modal v.`
- `linking v.`

Runtime must not:

- convert `verb` to `vt./vi.`
- convert `v.` to any frozen verb format
- reorder POS combinations
- infer missing POS
- normalize POS
- fallback to another POS source

### 5.4 sentenceMeaning

`sentenceMeaning` must be:

- non-empty
- short
- word-level
- current-sentence-specific
- directly displayable after `句中含义：`

Runtime must not:

- infer `sentenceMeaning`
- rewrite `sentenceMeaning`
- shorten `sentenceMeaning`
- translate `sentenceMeaning`
- replace `sentenceMeaning` with `translation`
- derive `sentenceMeaning` from `source_zh`
- derive `sentenceMeaning` from `source_en`
- generate word-specific semantic fixes

Runtime should treat clearly long explanatory `sentenceMeaning` values as invalid or at least developer-error data.

Long explanatory warning patterns include:

- `在`
- `这里`
- `语境`
- `表示`
- `用来`
- `指`
- `说明`
- `意思是`
- `相当于`

## 6. Legacy Fields

`baseForm` may exist in data for legacy compatibility.

Runtime must not require `baseForm`.

Runtime must not render a separate `原型：baseForm` line.

Runtime must not use `baseForm` as fallback for `word`.

`translation` may exist for future learning modes.

Runtime must not display `translation` in the current vocabulary card.

Runtime must not use `translation` as fallback for `sentenceMeaning`.

## 7. Comprehension Obstacle Required Fields

For comprehension obstacles, Runtime must require:

- `prototype` or `phrase` or `text`
- `literal`
- `actual`
- `grammar`

A comprehension obstacle is invalid if:

- no display title can be resolved from `prototype` / `phrase` / `text`
- `literal` is missing or empty
- `actual` is missing or empty
- `grammar` is missing or empty

Runtime must not generate comprehension explanations.

Runtime must not fallback from vocabulary fields to comprehension explanation fields.

## 8. Failure Behavior

When invalid obstacle data is detected, Runtime must provide a clear developer-facing failure signal.

The signal should include:

- obstacle id if available
- obstacle type
- invalid field name
- reason
- `source_en` if available
- `source_zh` if available

Acceptable development-time behavior:

- throw an Error during normalization/loading, or
- `console.error` the invalid obstacle and skip rendering that obstacle

The implementation choice will be decided in V29I-1B.

However, silent rendering of incomplete or invalid cards is forbidden.

## 9. User-Facing Behavior

Fail Fast is primarily developer-facing.

Runtime should not show guessed or degraded learning content to learners.

Future production behavior may use a safe fallback UI, but that must be separately frozen.

For V29I-1A, the frozen requirement is:

Invalid learning data must not silently render as if valid.

## 10. Non-Goals

Do NOT:

- modify `script.js`
- modify `styles.css`
- modify backend generator files
- regenerate `output_text` files
- modify `PROJECT_STATUS_V6.md`
- modify existing freeze documents
- implement runtime validation
- change vocabulary card layout
- change comprehension card layout
- change obstacle detection
- introduce new pipeline
- create demo data

## 11. Modified Files Whitelist

Only this file may be modified in this PR:

```text
docs/V29I_RUNTIME_FAIL_FAST_SPEC_FREEZE.md
```

No other files may be modified.

## 12. Bootstrap Note

Because this task creates a new freeze document, `PROJECT_STATUS_V6.md` must be updated in a separate follow-up PR after this PR is merged.

Do not update `PROJECT_STATUS_V6.md` in this PR.

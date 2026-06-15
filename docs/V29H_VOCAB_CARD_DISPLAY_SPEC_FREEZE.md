# V29H-3A Vocabulary Card Display + SentenceMeaning Specification Freeze

Status: Frozen ✅

## 1. Scope

This document freezes the final Vocabulary Card display rules and the meaning of the `sentenceMeaning` field.

This is a documentation freeze only.

No code changes.

No runtime changes.

No UI implementation.

No output regeneration.

## 2. Frozen Vocabulary Card Display Rules

### Rule 1 — Header Line

Display:

```text
word + phonetic + partOfSpeech
```

Examples:

```text
believe /bɪˈliːv/ vt.
official /əˈfɪʃəl/ adj.
lecture /ˈlektʃər/ n./vi./vt.
alone /əˈloʊn/ adj./adv.
```

### Rule 2 — Second Line

If:

```text
word != baseForm
```

Display:

```text
原型：{baseForm}        🔊
```

Example:

```text
ordered /ˈɔːrdərd/ vt.
原型：order        🔊
句中含义：点了
```

If:

```text
word == baseForm
```

Do not display `baseForm`.

Display only:

```text
🔊
```

Example:

```text
believe /bɪˈliːv/ vt.
🔊
句中含义：认为
```

### Rule 3 — Meaning Line

Display:

```text
句中含义：{sentenceMeaning}
```

Examples:

```text
句中含义：认为
句中含义：点了
句中含义：开始了
句中含义：正式的
```

## 3. sentenceMeaning Freeze

`sentenceMeaning` is defined as:

The meaning of this word in the current sentence only.

`sentenceMeaning` must be:

- short
- concise
- word-level meaning only
- directly usable by learners

`sentenceMeaning` must NOT:

- explain the entire sentence
- explain grammar
- explain why the expression has that meaning
- provide usage notes
- provide learning tips
- provide long descriptions

Examples:

GOOD:

```text
认为
点了
开始了
正式的
```

BAD:

```text
在 Can you believe 中用来表达惊讶和难以置信。
```

BAD:

```text
这里表示某个过程或事件开始发生。
```

BAD:

```text
在语境中强调某事被正式确认、具有官方性质。
```

Long explanations belong to future advanced learning capabilities and are outside the scope of `sentenceMeaning`.

## 4. Non-Goals

Do NOT:

- modify `script.js`
- modify `styles.css`
- modify runtime behavior
- modify generator files
- regenerate `output_text` files
- modify `PROJECT_STATUS_V6.md`
- modify existing freeze documents
- implement UI
- implement backend changes

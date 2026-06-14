# V29E Root Cause Freeze

## 1. Evidence Summary

V29E-2 freezes the root cause based on evidence from the user's real local runtime environment.

The real generated obstacle file exists and contains vocabulary obstacles that are only partially enriched. The backend generator already writes `word`, `phonetic`, and `translation`, but it does not write the V29D-required `lemma` / `baseForm`, `partOfSpeech`, or `sentenceMeaning` fields.

Therefore, all observed vocabulary obstacles in the real generated file violate the frozen V29D Backend Data Contract. This is a backend obstacle JSON schema/enrichment completeness issue.

## 2. Actual Runtime Path

The actual runtime file path is:

```text
C:\Users\10604\Desktop\Video_English_Assistant\output_text\v29a_obstacles.json
```

Observed file information:

```text
Length: 29307
LastWriteTime: 2026/6/13 3:20:13
```

## 3. Vocab Completeness Statistics

The real vocabulary completeness statistics are:

```text
vocab count: 39
missing lemma/baseForm: 39
missing phonetic: 0
missing partOfSpeech: 39
missing sentenceMeaning: 39
missing translation: 0
```

## 4. Sample Broken Vocab Entries

The following entries are representative examples of the broken legacy vocabulary schema in the real generated obstacle JSON.

### official

```json
{
  "start": "49.5",
  "end": "51.5",
  "type": "vocabulary",
  "priority": 1,
  "text": "official",
  "word": "official",
  "phonetic": "/əˈfɪʃəl/",
  "translation": "官方的；正式的；官员",
  "literal": "",
  "actual": "",
  "grammar": "",
  "source_en": "It's official. According to tradition,",
  "source_zh": "正式完婚了 根据传统"
}
```

### interlock

```json
{
  "start": "70.0",
  "end": "79.5",
  "type": "vocabulary",
  "priority": 1,
  "text": "interlock",
  "word": "interlock",
  "phonetic": "/ˌɪntərˈlɑːk/",
  "translation": "互锁；扣在一起；咬合",
  "literal": "",
  "actual": "",
  "grammar": "",
  "source_en": "Two pieces that interlock with a satisfying snap.",
  "source_zh": "两片乐高\"合体\"并带有爽度十足的咔哒声"
}
```

### sleeping

```json
{
  "start": "80.5",
  "end": "83.5",
  "type": "vocabulary",
  "priority": 1,
  "text": "sleeping",
  "word": "sleeping",
  "phonetic": "/ˈsliːpɪŋ/",
  "translation": "睡觉；睡着的",
  "literal": "",
  "actual": "",
  "grammar": "",
  "source_en": "While you were sleeping, I ordered room service.",
  "source_zh": "在你睡觉的时候 我点了客房送餐"
}
```

### ordered

```json
{
  "start": "80.5",
  "end": "83.5",
  "type": "vocabulary",
  "priority": 1,
  "text": "ordered",
  "word": "ordered",
  "phonetic": "/ˈɔːrdərd/",
  "translation": "点了；订购了；命令了；有序的",
  "literal": "",
  "actual": "",
  "grammar": "",
  "source_en": "While you were sleeping, I ordered room service.",
  "source_zh": "在你睡觉的时候 我点了客房送餐"
}
```

### room service

```json
{
  "start": "80.5",
  "end": "83.5",
  "type": "vocabulary",
  "priority": 1,
  "text": "room service",
  "word": "room service",
  "phonetic": "/ˈruːm ˌsɜːrvɪs/",
  "translation": "客房送餐服务",
  "literal": "",
  "actual": "",
  "grammar": "",
  "source_en": "While you were sleeping, I ordered room service.",
  "source_zh": "在你睡觉的时候 我点了客房送餐"
}
```

## 5. Frozen Root Cause

The backend generator outputs partially enriched legacy vocab rows.

The current backend generator is producing the legacy vocabulary schema:

```text
type: "vocabulary"
word
phonetic
translation
```

instead of the frozen V29D vocabulary schema:

```text
type: "vocab"
word
lemma
baseForm
phonetic
partOfSpeech
sentenceMeaning
translation
```

## 6. Not Root Causes

The following are explicitly **not** the root cause:

- frontend card rendering
- CSS
- DOM structure
- browser cache
- individual missing dictionary entries
- V29D data contract
- only a few special words

## 7. Required Fix Direction

A future V29E fix must update the backend generator/enrichment pipeline so every vocabulary obstacle written to `output_text/v29a_obstacles.json` contains all of the following fields:

```text
lemma
baseForm
phonetic
partOfSpeech
sentenceMeaning
translation
```

The generated vocabulary obstacles must also use the frozen type:

```text
type: "vocab"
```

## 8. No Fix Implemented In This PR

Do not implement the fix in this PR.

This PR only freezes the root cause. It must not modify `output_text/*.json`, `script.js`, frontend rendering, CSS, DOM structure, or dictionary entries.

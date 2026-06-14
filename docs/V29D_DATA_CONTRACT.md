# V29D Backend Data Contract Frozen ✅

Status: Frozen ✅

Purpose:

The Video English Assistant has entered the real-video experiment stage.

The frontend is already frozen.

The backend data contract must now also be frozen.

The frontend must never become an English dictionary, morphology engine, or obstacle analysis engine.

All language intelligence belongs to the backend.

## 1. Product Goal

The product does not aim to make users permanently memorize all vocabulary or grammar.

The goal is:

* remove obstacles while watching English videos
* make users increasingly able to understand videos
* improve confidence
* improve efficiency
* maintain learning motivation

## 2. Vocabulary Level System — Frozen

Vocabulary levels are approximate coverage references only.

* Junior High (1500)
* Senior High (3500)
* CET-4 (4500)
* CET-6 (6000)
* TEM-4 (8000)
* TEM-8 (12000)
* GRE (20000+)

Numbers are approximate vocabulary coverage references only.

## 3. Analyze Engine Input / Output — Frozen

Input:

- subtitle items
- user vocabulary level
- analyzer version
- vocabulary database version

Output:

* vocab obstacles
* comprehension obstacles

## 4. Vocab Obstacle Principle — Frozen

Vocabulary obstacles are user-level dependent.

Detection flow:

```text
surface form
↓
lemma
↓
vocabulary level lookup
↓
compare with user vocabulary level
↓
generate vocab obstacle or ignore
```

Examples:

```text
believed
↓
believe
↓
approximately 1000
↓
Senior High (3500)
↓
ignore
```

```text
consummated
↓
consummate
↓
approximately 8000+
↓
Senior High (3500)
↓
generate vocab obstacle
```

## 5. Comprehension Obstacle Principle — Frozen

Comprehension obstacles are expression-dependent.

Comprehension obstacles are independent of vocabulary level.

Examples:

* lay it on us
* pull somebody off something
* call it a day

Even GRE (20000+) users may still receive comprehension obstacles.

## 6. Backend Responsibilities — Frozen

The backend is responsible for:

1. obstacle detection
2. vocabulary-level filtering
3. lemma restoration
4. prototype abstraction
5. phonetic generation
6. part-of-speech generation
7. translation generation
8. sentence meaning generation
9. vocab deduplication
10. comprehension deduplication
11. data validation
12. data enrichment

The frontend is not allowed to perform any of these responsibilities.

## 7. Vocab Obstacle Contract — Frozen

Every vocab obstacle must contain:

* lemma
* phonetic
* partOfSpeech
* sentenceMeaning
* translation

Optional compatibility fields may exist:

* word
* baseForm
* surfaceForm
* kind
* index
* phrase

However, the required fields above must always exist.

## 8. Completeness Rule — Frozen

Any selected vocab obstacle must be fully completed before being written into:

output_text/v29a_obstacles.json

Incomplete vocab entries are forbidden.

The generator must never output half-complete vocab data.

The backend must not drop a selected vocab obstacle simply because some fields are temporarily unavailable.

A selected vocab obstacle must continue enrichment until all required fields are completed.

Examples of forbidden output:

```json
{
  "word": "interlock",
  "phonetic": "",
  "partOfSpeech": ""
}
```

```json
{
  "word": "ordered",
  "phonetic": "/ˈɔːrdərd/",
  "partOfSpeech": ""
}
```

These entries must continue enrichment until all required fields are complete.

## 9. Data Validation Rule — Frozen

Every generated vocab obstacle must pass validation before being written into:

output_text/v29a_obstacles.json

Required fields:

* lemma
* phonetic
* partOfSpeech
* sentenceMeaning
* translation

If any required field is missing, the generator must:

* continue dictionary lookup
* continue normalization
* continue enrichment

The generator must not silently output incomplete vocab data.

The following data is forbidden:

```json
{
  "word": "interlock",
  "phonetic": "",
  "partOfSpeech": ""
}
```

The generator must continue completing the required fields before outputting the vocab obstacle to the frontend.

## 10. Deterministic Output Rule — Frozen

Under identical inputs:

* episode
* subtitle items
* user vocabulary level
* analyzer version
* vocabulary database version

The output must be:

* deterministic
* reproducible
* stable

For the same inputs and the same backend version, the generated obstacle JSON must be identical.

The same user must receive exactly the same obstacle data every time.

Obstacle output must not randomly change.

## 11. Lemma Rule — Frozen

Vocabulary obstacles always display lemma.

Examples:

```text
believes
believed
believing
↓

believe
```

```text
marries
married
marrying
↓

marry
```

## 12. Prototype Rule — Frozen

Comprehension obstacles always display prototypes.

Examples:

```text
lay it on us
↓

lay something on somebody
```

```text
pull me off the project
↓

pull somebody off something
```

```text
give me a hand
↓

give somebody a hand
```

Fixed expressions display themselves:

* call it a day
* by the way
* come on

## 13. Deduplication Rule — Frozen

Vocabulary dedupe key:

```text
vocab:${lemma}
```

Examples:

```text
believe
believes
believed
believing

↓

one obstacle only:

vocab:believe
```

Comprehension obstacles must dedupe by prototype.

Examples:

```text
give me a hand
give him a hand
give us a hand

↓

one obstacle only:

give somebody a hand
```

## 14. Frontend Responsibilities — Frozen

The frontend may only:

1. read obstacle JSON
2. render cards
3. render subtitles
4. manage progress
5. manage interaction state

## 15. Frontend Prohibitions — Frozen

The frontend must never:

* perform dictionary lookup
* infer lemma
* infer prototype
* infer phonetic
* infer partOfSpeech
* determine whether a word is unknown
* perform vocabulary-level filtering
* deduplicate vocab obstacles
* deduplicate comprehension obstacles
* enrich incomplete data
* use local dictionaryEntries to complete learning data

The frontend is display-only.

All language intelligence belongs to the backend.

## 16. Acceptance Criteria — Frozen

For every vocab obstacle:

lemma ✅
phonetic ✅
partOfSpeech ✅
sentenceMeaning ✅
translation ✅

For every comprehension obstacle:

prototype ✅

For obstacle output:

deduplication by lemma/prototype ✅
deterministic output ✅

No incomplete vocab entries may exist inside:

output_text/v29a_obstacles.json

This contract is frozen and becomes the canonical backend specification for V29D.

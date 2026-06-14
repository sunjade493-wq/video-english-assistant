# V29D Data Contract Frozen

Status: Frozen

Scope: Backend data contract for generating video learning obstacles.

This document freezes the V29D backend data responsibility boundary. The goal is to prevent unstable or incomplete learning cards, including cases where the same word inconsistently has part of speech data, the same word changes between known and unknown, the same expression alternates between prototype and subtitle variants, or the frontend silently performs dictionary lookup, lemma guessing, or part-of-speech guessing.

## 1. Product Goal

The product goal is not to:

- Permanently memorize every English word.
- Prepare users for CET-4, CET-6, or any other exam as the primary objective.
- Teach all grammar knowledge exhaustively.

The product goal is to:

- Remove comprehension blockers in the current video.
- Help users listen to and understand English videos more smoothly over time.
- Improve learning efficiency, confidence, and motivation to continue.

## 2. Vocabulary Level System

The vocabulary level system is frozen as:

| Level | Approximate vocabulary coverage |
| --- | ---: |
| Junior High | 1,500 |
| Senior High | 3,500 |
| CET-4 | 4,500 |
| CET-6 | 6,000 |
| TEM-4 | 8,000 |
| TEM-8 | 12,000 |
| GRE | 20,000+ |

These numbers are approximate vocabulary coverage references only.

They indicate an approximate known-vocabulary range. They do not indicate education level, school grade, or exam score.

## 3. Vocab Obstacle Mechanism

Frozen principle: vocabulary obstacles are user-level dependent.

The backend must use this decision flow:

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

## 4. Comprehension Obstacle Mechanism

Frozen principle: comprehension obstacles are expression-dependent.

Comprehension obstacles are independent of vocabulary level.

Examples include:

- `lay it on us`
- `pull somebody off something`
- `call it a day`

Even a user at `GRE (20000+)` level may still receive comprehension obstacles.

## 5. Backend Responsibilities

The backend is responsible for all of the following.

### 5.1 Identify obstacle type

The backend must identify whether an obstacle is:

- `vocab`
- `comprehension`

### 5.2 Make vocabulary level decisions

The backend must decide whether to generate or ignore a vocab obstacle by comparing:

- `lemma`
- user vocabulary level

The result is either:

- generate vocab obstacle
- ignore

### 5.3 Restore lemma

The backend must normalize inflected surface forms to their lemma/base form.

Examples:

```text
believed
believes
believing
→ believe
```

```text
married
marries
marrying
→ marry
```

```text
sleeping
→ sleep
```

### 5.4 Abstract prototypes

The backend must normalize expression instances to stable prototypes.

Examples:

```text
give me a hand
→ give somebody a hand
```

```text
lay it on us
→ lay something on somebody
```

### 5.5 Deduplicate obstacles

For vocab obstacles, the deduplication key is:

```text
vocab:${lemma}
```

For example, these surface forms must produce only one vocab obstacle:

```text
believe
believes
believed
believing
```

For comprehension obstacles, deduplication is based on the prototype.

For example, these subtitle variants must produce only one comprehension obstacle:

```text
give me a hand
give him a hand
give us a hand
```

The resulting obstacle must use the prototype:

```text
give somebody a hand
```

## 6. Vocab Data Completeness Principle

If a word is selected as a `vocab` obstacle, the backend must complete all learning fields before sending it to the frontend.

Required fields:

- `lemma` / `baseForm`
- `phonetic`
- `partOfSpeech`
- `sentenceMeaning`
- `translation`

Example:

```json
{
  "type": "vocab",
  "word": "consummated",
  "lemma": "consummate",
  "baseForm": "consummate",
  "phonetic": "/ˈkɑːnsəmeɪt/",
  "partOfSpeech": "vt.",
  "sentenceMeaning": "圆房；完成",
  "translation": "圆房；完成"
}
```

Important principle: there is no such thing as a selected vocab obstacle whose part of speech, phonetic transcription, or explanation is unknowable.

The following values do not mean the knowledge does not exist:

```json
{
  "phonetic": "",
  "partOfSpeech": "",
  "sentenceMeaning": ""
}
```

They only mean the generator failed to complete dictionary lookup.

## 7. Completeness Rule

If a word has been classified as a `vocab` obstacle, the backend must not abandon it or emit a partial card.

Examples include:

- `interlock`
- `snap`
- `sleeping`
- `ordered`

The backend must not output a partially complete card because `partOfSpeech` or `phonetic` is missing.

Correct flow:

```text
identified as vocab
↓
continue dictionary lookup
↓
complete all required fields
↓
output complete obstacle
↓
send to frontend
```


## Data Validation Rule

Every generated vocab obstacle must pass validation before being written into `output_text/v29a_obstacles.json`.

Required fields:

- `lemma`
- `phonetic`
- `partOfSpeech`
- `sentenceMeaning`
- `translation`

If any required field is missing, the generator must:

- continue dictionary lookup
- continue normalization
- continue enrichment

The generator must not silently output incomplete vocab data.

For example, the following incomplete vocab data is not allowed to be written directly into `output_text/v29a_obstacles.json`:

```json
{
  "word": "interlock",
  "phonetic": "",
  "partOfSpeech": ""
}
```

## 8. Frontend Responsibilities

The frontend is responsible only for:

- Reading JSON.
- Rendering cards.
- Showing the timeline.
- Pausing video playback.
- Handling `✓ 不用管我了`.
- Returning to the previous obstacle.
- Storing learning progress in `localStorage`.

## 9. Frontend Must Not

The frontend must not:

- Query a complete English dictionary.
- Guess lemma.
- Guess prototype.
- Guess phonetic transcription.
- Guess part of speech.
- Decide whether a word is unknown.
- Decide vocabulary level.
- Deduplicate obstacles.
- Use local `dictionaryEntries` to complete learning data.

## 10. Deterministic Output Rule

For the same:

- episode
- subtitle data
- user vocabulary level
- analyzer version
- vocabulary database version

The generated outputs must be deterministic, reproducible, and stable for:

- vocab obstacles
- comprehension obstacles

For the same video, same subtitles, same user vocabulary level, and same analysis versions, the output must be fixed.

The system must not produce unstable results such as:

- 52 obstacles today and 58 obstacles tomorrow for the same inputs.
- `interlock` has part of speech today but no part of speech tomorrow for the same inputs.

## 11. One-Sentence Summary

The backend kitchen is responsible for identifying, deciding, looking up dictionary data, completing data, deduplicating, and outputting complete learning data.

The frontend waiter is responsible for reading, displaying, interaction, and learning progress.

Core principle: the kitchen must finish the dish before serving it. The frontend only serves the dish; it does not cook.

# V29F-1 Backend Vocabulary Schema Design Freeze

## 1. V29F-1 Goal

V29F-1 upgrades the backend vocabulary schema so that `v29a_obstacle_generator.py` can output complete vocabulary obstacles.

## 2. Current Problem

`v29a_obstacle_generator.py` currently uses the legacy three-field schema:

- `word`
- `phonetic`
- `translation`

The current schema is missing:

- `lemma`
- `baseForm`
- `partOfSpeech`
- `sentenceMeaning`

## 3. New Vocab Schema

Each vocabulary obstacle must contain:

- `word`
- `lemma`
- `baseForm`
- `phonetic`
- `partOfSpeech`
- `sentenceMeaning`
- `translation`

## 4. Field Responsibilities

### `word`

The surface/display word actually matched in the subtitle.

### `lemma`

The canonical lemma used for dictionary lookup, vocabulary level judgment, and deduplication.

### `baseForm`

For this stage, `baseForm` is fixed to equal `lemma`.

### `phonetic`

The phonetic transcription corresponding to `lemma` / `baseForm`.

### `partOfSpeech`

The part of speech in the current context, for example: `n.`, `v.`, `vt./vi.`, `adj.`, `adv.`, `adj./adv.`, `n./vt.`, or `phr.`.

### `translation`

The dictionary-level Chinese definition.

### `sentenceMeaning`

The contextual meaning in the current subtitle sentence. It must not simply copy `translation`.

## 5. Inflection / Lemma Mapping Principles

Inflection-to-lemma mappings must be written explicitly into dictionary entries. The frontend must not guess these mappings.

Examples:

- `sleeping` → `sleep`
- `ordered` → `order`
- `satisfying` → `satisfy`
- `consummated` → `consummate`
- `bedsheets` → `bedsheet`
- `autotrophs` → `autotroph`
- `Neanderthals` → `Neanderthal`

## 6. Phrase Vocab Principles

Phrase vocabulary must also use the complete seven-field schema.

Example: `room service`

- `word`: `room service`
- `lemma`: `room service`
- `baseForm`: `room service`
- `partOfSpeech`: `n.`
- `sentenceMeaning`: 当前句子中表示“酒店客房送餐服务”。

## 7. `type` Temporarily Unchanged

For this stage, keep:

```json
"type": "vocabulary"
```

Do not change it to `type: "vocab"` in V29F-2.

Reason: this stage targets completion of the missing fields and does not perform a type rename, avoiding extra frontend compatibility risk.

If type unification is needed in the future, it should be handled separately as V30 Vocabulary Type Rename.

## 8. `OUTPUT_FIELDS` Design

`OUTPUT_FIELDS` must add:

- `lemma`
- `baseForm`
- `partOfSpeech`
- `sentenceMeaning`

And must retain:

- `word`
- `phonetic`
- `translation`

## 9. `generate_vocabulary_obstacles(...)` Design

`generate_vocabulary_obstacles(...)` must copy the complete seven fields from `VOCABULARY_DICTIONARY` into each vocabulary obstacle:

- `word`
- `lemma`
- `baseForm`
- `phonetic`
- `partOfSpeech`
- `sentenceMeaning`
- `translation`

## 10. Validation Design

Add:

```python
VOCAB_REQUIRED_FIELDS = (
    "word",
    "lemma",
    "baseForm",
    "phonetic",
    "partOfSpeech",
    "sentenceMeaning",
    "translation",
)
```

Add:

```python
validate_vocab_obstacle(obstacle)
```

Rules:

- Any required field that is `None`, `""`, or a whitespace-only string must raise `ValueError`.
- Silent output is not allowed.
- Falling back to the frontend is not allowed.
- Skipping fields is not allowed.
- Writing partially broken vocabulary obstacles to `output_text/v29a_obstacles.json` is not allowed.

## 11. `write_json(...)` / `write_csv(...)` Design

`write_json(...)` must validate all vocabulary obstacles before writing.

`write_csv(...)` must also preserve the complete fields and must not continue outputting legacy three-field CSV.

## 12. Acceptance Criteria

After V29F-2 implementation is complete:

- Every vocabulary dictionary entry in `v29a_obstacle_generator.py` has all seven fields.
- Every vocabulary obstacle in `output_text/v29a_obstacles.json` has all seven fields.
- `output_text/v29a_obstacles.csv` also preserves the complete fields.
- 39 vocab rows missing `lemma` / `baseForm` = 0.
- Missing `partOfSpeech` = 0.
- Missing `sentenceMeaning` = 0.
- Missing `phonetic` = 0.
- Missing `translation` = 0.
- The frontend no longer needs a fallback dictionary to fill these fields.

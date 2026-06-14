# V29E-3B Root Cause Freeze

## Scope

This document freezes the V29E-3B root cause candidate ranking only. It does **not** implement a fix.

Do not modify production code as part of this freeze:

- `script.js`
- `analyze-engine.js`
- `index.html`
- `styles.css`
- `output_text/*.json`

Do not add a new `dictionaryEntries` path, fallback, normalizer, serializer, or production-code commit for this investigation stage.

## Prior Investigation Context

The following V29E investigation stages have already been completed:

- V29E-1
- V29E-1B
- V29E-1C
- V29E-3A

Those investigations established that the frontend path is read-only for the real obstacle JSON:

```text
REAL_OBSTACLE_DATA_URL
↓
loadRealEpisodeData()
↓
fetchJson(...)
↓
normalizeRealObstacleRows(...)
↓
render
```

The frontend reads only:

```text
output_text/v29a_obstacles.json
```

It does not generate or write that file.

## Current Repository Generator Evidence

The only obstacle generator found in the currently checked-in repository is:

```text
AnalyzeEngine.analyzeSubtitleItems(...)
↓
buildVocabObstacles(...)
```

The vocabulary object produced by this generator already contains the enrichment fields expected by the V29D-style vocabulary contract:

- `baseForm`
- `partOfSpeech`
- `sentenceMeaning`
- `word`
- `phonetic`
- `translation`

This means the checked-in `buildVocabObstacles(...)` path is more complete than the real runtime JSON currently observed.

## Real Runtime JSON Evidence

The real runtime file under investigation is:

```text
C:\Users\10604\Desktop\Video_English_Assistant\output_text\v29a_obstacles.json
```

Observed vocabulary completeness statistics from the real runtime file:

```text
vocab count: 39
missing lemma/baseForm: 39
missing phonetic: 0
missing partOfSpeech: 39
missing sentenceMeaning: 39
missing translation: 0
```

The real JSON vocabulary entries follow this legacy shape:

```json
{
  "type": "vocabulary",
  "word": "...",
  "phonetic": "...",
  "translation": "..."
}
```

They are missing:

- `lemma`
- `baseForm`
- `partOfSpeech`
- `sentenceMeaning`

## Frozen Root Cause Candidate

The highest-likelihood root cause candidate is:

> The real runtime obstacle JSON is produced by a legacy serializer or another generator that is outside the current checked-in repository.

Evidence:

1. `buildVocabObstacles(...)` already generates `baseForm`, `partOfSpeech`, and `sentenceMeaning`.
2. The real runtime JSON only contains `word`, `phonetic`, and `translation` for vocabulary entries.
3. Therefore, either:
   - another generator writes `output_text/v29a_obstacles.json`, or
   - a legacy serializer projects an enriched object into a legacy schema and discards `lemma` / `baseForm`, `partOfSpeech`, and `sentenceMeaning`.

## Root Cause Candidate Ranking

1. Legacy serializer outside current repository
   Likelihood: Very High

2. Real backend generator is not `analyze-engine.js`
   Likelihood: High

3. Enriched object exists but serializer discards fields
   Likelihood: Medium-High

4. Enrichment stops too early
   Likelihood: Medium

5. Frontend rendering issue
   Likelihood: Ruled Out

## Explicit Non-Root-Causes

The following are explicitly **not** the root cause:

- frontend rendering
- CSS
- DOM structure
- browser cache
- missing dictionary entries
- only a few special words
- card rendering
- part-of-speech rendering
- V29D data contract

## Required Next Step Before Any Fix

Before any implementation work begins, the project must locate the actual serializer or generator that writes:

```text
C:\Users\10604\Desktop\Video_English_Assistant\output_text\v29a_obstacles.json
```

No production-code fix may begin before that serializer or generator is identified.

## No Fix Implemented

This freeze intentionally does not modify production code, generated obstacle JSON, frontend rendering, CSS, DOM structure, dictionary entries, normalizers, serializers, or fallbacks.

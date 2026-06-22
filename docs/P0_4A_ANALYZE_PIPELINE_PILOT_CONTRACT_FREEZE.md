# P0-4A Analyze Pipeline Pilot Contract Freeze

Status: FROZEN

Freeze Date: 2026-06-22

Milestone: P0-4A — AI-assisted Analyze Pipeline Pilot (First 2 Minutes Only)

## 1. Purpose

P0-4A freezes the architecture and contracts for the first AI-assisted analyze pipeline pilot.

This milestone is documentation and contract freeze only. It must not generate obstacles, call Qwen-VL, create a cropped video, or modify Runtime files.

P0-3D-C Marker Rendering is paused until obstacle generation is frozen. Do not continue marker rendering work during P0-4A.

## 2. Pilot Scope

Video:

```text
assets/videos/TBBT_S12E01.mp4
```

Pilot time range:

```text
00:00:00 <= subtitle timestamp < 00:02:00
```

The pipeline must use the existing episode video and process only subtitle rows whose timestamps fall within the first two minutes. It must not create or depend on a separate cropped video.

## 3. Roadmap Position

```text
P0-4A
AI-assisted Analyze Pipeline Pilot (2 min)

↓

P0-4B
Qwen Coordinate Extraction Pilot (2 min)

↓

P0-4C
Runtime Marker & Obstacle Rendering Pilot (2 min)

↓

P0-5
Expand From Pilot To Full Episode
```

## 4. Pipeline Contract

```text
Subtitle
+
Learner Level
↓
Vocabulary Engine
(Rule-based + AI-assisted)
↓
Comprehension Engine
(AI-driven + Rule Validation)
↓
Generate Draft Obstacles
↓
output_text/drafts/p0_4a_obstacles_pilot_draft.json
↓
Human Review
+
Script Validation
↓
Freeze
↓
output_text/v29a_obstacles_pilot.json
```

Runtime remains read-only and is outside the P0-4A implementation scope.

## 5. Analyze Prompt Contract

The analyze prompt must instruct the AI assistant to produce draft obstacle candidates only for subtitle rows in the pilot time range.

Required prompt inputs:

- `videoId`
- `sourceVideoPath`
- `pilotRange`
- `learnerLevel`
- `vocabularyLevels`
- `subtitleItems[]`
- `obstacleContracts`
- `outputSchemaVersion`

The prompt must explicitly state:

1. Vocabulary obstacles are items beyond the learner's vocabulary level.
2. Final vocabulary decisions must be constrained by learner level rules.
3. AI may assist contextual meaning analysis, part-of-speech determination, sentence meaning generation, and fixed expression recognition.
4. Comprehension obstacles are expressions whose combined meaning is not immediately understandable even when individual words are known.
5. Comprehension recognition must prioritize fixed expressions, collocations, slang, extended meanings, culture-dependent expressions, phrase meanings, sentence meanings, and difficult combined meanings.
6. The AI must not infer visual coordinates.
7. The AI must not create marker positioning data.
8. The AI must not process subtitles outside the pilot time range.
9. The AI must return JSON conforming to the P0-4A output schema.
10. The AI must preserve subtitle references exactly as provided.

Recommended prompt output discipline:

- Prefer fewer high-confidence obstacles over broad speculative coverage.
- Use exact source text boundaries from `source_en`.
- Do not duplicate the same learning item within the pilot.
- If unsure whether an item is above the learner level, mark it as a draft candidate and include a review note rather than silently converting it into a frozen obstacle.

## 6. Input JSON Schema

P0-4A input JSON is the offline analyzer request. It is not consumed by Runtime.

```json
{
  "schemaVersion": "p0-4a.analyze-input.v1",
  "analyzerVersion": "p0-4a",
  "videoId": "TBBT_S12E01",
  "sourceVideoPath": "assets/videos/TBBT_S12E01.mp4",
  "pilotRange": {
    "start": "00:00:00.000",
    "end": "00:02:00.000",
    "endExclusive": true
  },
  "learnerLevel": "Senior High",
  "vocabularyLevels": [
    { "name": "Junior High", "size": 1500 },
    { "name": "Senior High", "size": 3500 },
    { "name": "CET-4", "size": 4500 },
    { "name": "CET-6", "size": 6000 },
    { "name": "TEM-4", "size": 8000 },
    { "name": "TEM-8", "size": 12000 },
    { "name": "GRE", "size": 20000 }
  ],
  "subtitleItems": [
    {
      "subtitleIndex": 0,
      "start": "00:00:00.000",
      "end": "00:00:02.000",
      "source_en": "Example English subtitle.",
      "source_zh": "示例中文字幕。"
    }
  ]
}
```

Required validation rules:

- `schemaVersion` must equal `p0-4a.analyze-input.v1`.
- `videoId` must be `TBBT_S12E01` for this pilot.
- `sourceVideoPath` must be `assets/videos/TBBT_S12E01.mp4`.
- `pilotRange.start` must be `00:00:00.000`.
- `pilotRange.end` must be `00:02:00.000`.
- `pilotRange.endExclusive` must be `true`.
- `learnerLevel` must be one of the frozen vocabulary level names.
- Every `subtitleItems[]` row must include `subtitleIndex`, `start`, `end`, and non-empty `source_en`.
- Every subtitle row must overlap the pilot range and must have `start < end`.
- No cropped-video path may appear in the input.

## 7. Output JSON Schema

P0-4A output JSON has two review states: draft and frozen. Draft files are AI-generated candidates that still require review; frozen files are human-reviewed and script-validated outputs approved for downstream consumption.

Draft output path:

```text
output_text/drafts/p0_4a_obstacles_pilot_draft.json
```

Frozen output path:

```text
output_text/v29a_obstacles_pilot.json
```

Top-level structure:

```json
{
  "schemaVersion": "p0-4a.obstacles-output.v1",
  "analyzerVersion": "p0-4a",
  "videoId": "TBBT_S12E01",
  "sourceVideoPath": "assets/videos/TBBT_S12E01.mp4",
  "pilotRange": {
    "start": "00:00:00.000",
    "end": "00:02:00.000",
    "endExclusive": true
  },
  "learnerLevel": "Senior High",
  "reviewStatus": "frozen",
  "obstacles": [
    {
      "obstacleId": "tbbt-s12e01-obstacle-000001",
      "type": "vocabulary",
      "subtitleIndex": 0,
      "start": "00:00:00.000",
      "end": "00:00:02.000",
      "source_en": "Example English subtitle.",
      "text": "example",
      "markerStart": 0,
      "markerEnd": 7,
      "lemma": "example",
      "phonetic": "/ɪɡˈzæmpəl/",
      "partOfSpeech": "n.",
      "translation": "例子",
      "sentenceMeaning": "The word refers to a representative instance.",
      "difficultyLevel": "CET-4",
      "decisionSource": "rule+ai",
      "reviewDecision": "approved"
    }
  ]
}
```

Common required fields for every obstacle:

- `obstacleId`
- `type`
- `subtitleIndex`
- `start`
- `end`
- `source_en`
- `text`
- `markerStart`
- `markerEnd`
- `sentenceMeaning`
- `decisionSource`
- `reviewDecision`

Vocabulary obstacle required fields:

- `lemma`
- `phonetic`
- `partOfSpeech`
- `translation`
- `difficultyLevel`

Comprehension obstacle required fields:

- `prototype`
- `normalizedText`
- `explanation`
- `translation`
- `category`

Allowed `type` values:

- `vocabulary`
- `comprehension`

Allowed `decisionSource` values:

- `rule`
- `ai`
- `rule+ai`

Allowed `reviewDecision` values:

- `approved`
- `rejected`
- `needs_revision`

Allowed top-level `reviewStatus` values:

- `draft`: AI-generated candidate obstacle set that still requires review.
- `frozen`: Human-reviewed and script-validated obstacle set approved for downstream consumption.

Only `approved` obstacles may appear in the frozen `output_text/v29a_obstacles_pilot.json` file. Only frozen obstacle files may be consumed by Qwen Coordinate Extraction, Runtime, and Marker Rendering. Draft files must never be consumed by Runtime.

## 8. obstacleId Naming Rules

Obstacle IDs must be deterministic within the frozen pilot file.

Format:

```text
tbbt-s12e01-obstacle-NNNNNN
```

Examples:

```text
tbbt-s12e01-obstacle-000001
tbbt-s12e01-obstacle-000002
```

Rules:

- Prefix must be lowercase `tbbt-s12e01-obstacle-`.
- `NNNNNN` must be a six-digit, zero-padded integer.
- Numbering starts at `000001`.
- Numbering follows the final frozen order after deduplication and review.
- Obstacle IDs belong to product data and must remain independent of milestone names such as P0, P1, or P2.
- Final frozen order is:
  1. `subtitleIndex`
  2. `markerStart`
  3. `type`, with `vocabulary` before `comprehension` when positions tie
  4. `text`, alphabetically
- IDs must be unique within `output_text/v29a_obstacles_pilot.json`.
- Runtime must never generate obstacle IDs.
- IDs must not change unless the pilot obstacle file is intentionally regenerated before freeze.
- The same subtitle input, learner level, and analyzer version must generate the same obstacle ordering.
- Stable ordering is required because downstream systems depend on deterministic obstacle IDs across Obstacle JSON, Qwen Coordinate Extraction, `word_boxes.json`, Marker Binding, Human Review, and Runtime Rendering.

## 9. Human Review Workflow

Human review validates AI-assisted draft output without manually recreating all obstacles.

Required workflow:

1. Validate the overall obstacle count for the two-minute pilot.
2. Randomly inspect approximately 20% of generated obstacles.
3. Fully inspect every sentence containing multiple obstacles.
4. Fully inspect every comprehension-heavy sentence.
5. Check for obvious false positives and false negatives.
6. Confirm vocabulary obstacles obey learner-level rules.
7. Confirm comprehension obstacles represent combined meaning difficulty rather than ordinary literal phrases.
8. Approve freeze only when no obvious false positives or false negatives remain.

Review artifacts should record:

- reviewer name or role
- review date
- sampled obstacle IDs
- sentences fully inspected
- rejected or revised obstacle IDs
- final freeze decision

## 10. Script Validation Rules

Validation scripts verify data integrity only. They must not make language-learning judgments.

Required checks:

- top-level schema version equals `p0-4a.obstacles-output.v1`
- top-level `reviewStatus` is either `draft` or `frozen`
- frozen output has top-level `reviewStatus` equal to `frozen`
- `videoId` equals `TBBT_S12E01`
- `sourceVideoPath` equals `assets/videos/TBBT_S12E01.mp4`
- pilot range equals `00:00:00.000` to `00:02:00.000` with exclusive end
- all obstacle IDs are unique
- every obstacle ID matches `^tbbt-s12e01-obstacle-[0-9]{6}$`
- allowed obstacle types are only `vocabulary` and `comprehension`
- `text` and `source_en` are non-empty
- `subtitleIndex` exists in the pilot subtitle input
- obstacle timestamps are valid and fall within the pilot range
- `markerStart` and `markerEnd` are integers with `0 <= markerStart < markerEnd <= source_en.length`
- obstacle `text` corresponds to the declared source text boundary after normalization
- vocabulary obstacles include all vocabulary-required fields
- comprehension obstacles include all comprehension-required fields
- duplicate learning items are detected
- nested comprehension obstacles in the same subtitle are detected for review
- no rejected or `needs_revision` obstacle appears in the frozen output
- final frozen obstacle ordering follows `subtitleIndex`, `markerStart`, `type`, then `text`

Forbidden validation behavior:

- Do not call AI.
- Do not run OCR.
- Do not infer missing obstacles.
- Do not rewrite subtitle JSON.
- Do not mutate the frozen obstacle JSON during validation.

## 11. Pilot File Naming Conventions

Draft obstacle output:

```text
output_text/drafts/p0_4a_obstacles_pilot_draft.json
```

Frozen pilot obstacle output:

```text
output_text/v29a_obstacles_pilot.json
```

Permitted draft and review artifact names:

```text
output_text/drafts/p0_4a_analyze_input_pilot.json
output_text/drafts/p0_4a_obstacles_pilot_draft.json
output_text/reviews/p0_4a_human_review_pilot.md
output_text/reports/p0_4a_validation_report_pilot.md
```

Rules:

- Draft files must live under `output_text/drafts/`.
- Review notes must live under `output_text/reviews/`.
- Validation reports must live under `output_text/reports/`.
- The only frozen pilot obstacle output is `output_text/v29a_obstacles_pilot.json`.
- Runtime may consume only `output_text/v29a_obstacles_pilot.json`.
- Runtime must never consume `output_text/drafts/p0_4a_obstacles_pilot_draft.json`.
- P0-4A must not overwrite `output_text/v29a_obstacles.json`.
- P0-4A must not create cropped video assets.

## 12. Runtime Boundary

Runtime is read-only.

Runtime must not:

- call AI
- run OCR
- infer new obstacles
- generate obstacle IDs
- modify obstacle JSON
- modify subtitle JSON

Runtime may only consume the frozen pilot obstacle file after P0-4A freeze:

```text
output_text/v29a_obstacles_pilot.json
```

Runtime must never consume the draft obstacle file:

```text
output_text/drafts/p0_4a_obstacles_pilot_draft.json
```

P0-4A does not implement Runtime consumption. Runtime integration belongs to P0-4C.

## 13. Explicit Non-Goals For P0-4A

P0-4A must not:

- generate the actual obstacle file
- call Qwen-VL
- extract coordinates
- modify `script.js`
- modify `styles.css`
- modify marker positioning logic
- modify marker sizing logic
- modify runtime rendering logic
- process beyond the first two minutes
- create a separate cropped video

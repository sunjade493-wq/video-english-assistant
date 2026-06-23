# P0-4A-4 Runtime Promotion Contract

## Status

Frozen

## Purpose

Define how frozen pilot obstacle data may be promoted into Runtime-readable obstacle data while preserving Runtime read-only principles and avoiding leakage of offline production metadata into Runtime.

## Background

The Offline Analyze Pipeline now supports:

* Analyze Input
* Real AI Draft Generation
* Draft Validation
* Human Review Decision Generation
* Human Review Apply Pipeline
* Frozen Pilot Promotion
* Frozen Promotion Cleanup

Frozen pilot output exists at:

```text
output_text/frozen/p0_4a_obstacles_pilot_frozen.json
```

But Runtime must not consume frozen pilot files directly until a Runtime Promotion step creates an explicitly Runtime-readable artifact.

## Runtime Promotion Principle

Runtime must consume only explicitly promoted Runtime obstacle files.

Runtime must not consume:

* `output_text/drafts/*`
* `output_text/fixtures/*`
* `output_text/frozen/p0_4a_obstacles_pilot_frozen.json`

Runtime promotion must be deterministic, offline, review-safe, and schema-validated.

## Allowed Runtime Output Path

The future allowed Runtime pilot output path is:

```text
output_text/runtime/p0_4a_obstacles_pilot_runtime.json
```

This contract only defines the path.

It does not create the file.

## Runtime Output Top-Level Fields

Allowed top-level fields:

* `schemaVersion`: `"p0-4a-runtime-obstacles-pilot-v1"`
* `sourceFrozenPath`
* `generatedAt`
* `runtimeMayConsume`: `true`
* `episodeId`
* `learnerLevel`
* `smokeScope`
* `summary`
* `obstacles`

Forbidden top-level fields:

* `frozenStatus`
* `runtimePromotionRequired`
* `sourceReviewResultsPath`
* `sourceReviewReportPath`
* `sourceDraftPath`
* `reviewResultsInputKind`
* `frozenSource`
* `reviewedAt`
* `reviewer`
* `reviewNotes`

## Runtime Obstacle Allowed Common Fields

Every Runtime obstacle may include only:

* `obstacleId`
* `type`
* `subtitleIndex`
* `startTime`
* `endTime`
* `source_en`
* `source_zh`
* `text`
* `markerStart`
* `markerEnd`
* `decisionSource`
* `confidence`

## Runtime Vocabulary Fields

Vocabulary obstacles may include:

* `word`
* `lemma`
* `phonetic`
* `partOfSpeech`
* `sentenceMeaning`
* `translation`
* `difficultyLevel`
* `difficultyEvidence`

## Runtime Comprehension Fields

Comprehension obstacles may include:

* `phrase`
* `literal`
* `actual`
* `grammar`
* `explanationWhy`
* `transferableUsage`
* `comprehensionCategory`

## Runtime Forbidden Obstacle Fields

Runtime obstacles must not include:

* `reviewDecision`
* `humanDecision`
* `reviewStatus`
* `reviewer`
* `reviewedAt`
* `reviewNotes`
* `frozenAt`
* `frozenSource`
* `provenance`
* `runtimePromotionRequired`

## Filtering Rules

Only frozen obstacles with:

* `reviewStatus === "approved"`
* `humanDecision === "approved"`

may be promoted.

Rejected obstacles must not be promoted.

Pending obstacles must fail promotion.

## Ordering Rules

Runtime obstacle order must preserve frozen obstacle order.

Obstacle IDs must remain unchanged.

No renumbering during Runtime promotion.

## Marker Rules

Runtime promotion must not generate marker coordinates.

Runtime promotion may only carry existing:

* `markerStart`
* `markerEnd`

Coordinates and visual mapping remain separate.

## Validation Rules

Runtime promotion must fail if:

* source frozen file `runtimeMayConsume !== false`
* source frozen file `runtimePromotionRequired !== true`
* source frozen file `frozenStatus !== "frozen_pilot"`
* source frozen obstacles contain forbidden Runtime fields
* any obstacle has invalid marker bounds: `0 <= markerStart < markerEnd <= source_en.length`
* any obstacle type is not:
  * `vocabulary`
  * `comprehension`

## Forbidden

This contract does NOT authorize:

* Runtime integration
* `script.js` modification
* `styles.css` modification
* `output_text/v29a_obstacles.json` modification
* `output_text/v29a_obstacles_pilot.json` modification
* marker rendering
* coordinate generation
* OCR
* Qwen-VL
* production obstacle replacement

## Future Implementation Note

Next implementation task may be:

```text
P0-4A-5
Runtime Pilot Obstacle Promotion Script
```

Goal:

Read:

```text
output_text/frozen/p0_4a_obstacles_pilot_frozen.json
```

Write:

```text
output_text/runtime/p0_4a_obstacles_pilot_runtime.json
```

under the rules frozen in this contract.

## Verification

No runtime test required.

Recommended check:

```sh
test -f docs/P0_4A_4_RUNTIME_PROMOTION_CONTRACT.md
```

Success criteria:

* Contract document exists.
* No code files modified.
* No Runtime files modified.
* No production obstacle files modified.
* Frozen → Runtime field mapping is clearly defined.

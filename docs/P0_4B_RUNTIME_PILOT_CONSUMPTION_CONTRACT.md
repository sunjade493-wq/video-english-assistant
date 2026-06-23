# P0-4B Runtime Pilot Consumption Contract

## Status

Frozen

## Purpose

Define how Runtime may safely read and use the promoted Runtime pilot obstacle file while preserving existing Runtime read-only principles, UI behavior, subtitle marker boundaries, and frozen obstacle contracts.

## Background

P0-4A completed:

* Real AI Draft Generation
* Draft Validation
* Human Review
* Frozen Pilot Promotion
* Frozen Cleanup
* Runtime Promotion Contract
* Runtime Pilot Obstacle Promotion Script

The generated Runtime-readable pilot obstacle file is:

```text
output_text/runtime/p0_4a_obstacles_pilot_runtime.json
```

This file is the only P0-4A output that may be considered for Runtime consumption.

## Runtime Consumption Principle

Runtime may consume only files with:

* `runtimeMayConsume === true`
* `schemaVersion === "p0-4a-runtime-obstacles-pilot-v1"`

Runtime must never consume:

* `output_text/drafts/*`
* `output_text/fixtures/*`
* `output_text/frozen/*`
* `output_text/v29a_obstacles.json`
* `output_text/v29a_obstacles_pilot.json`

unless a separate contract explicitly permits it.

## Pilot Runtime Data Source

For P0-4B, the only allowed new Runtime data source is:

```text
output_text/runtime/p0_4a_obstacles_pilot_runtime.json
```

This contract does not authorize replacing existing production obstacle data.

## Runtime Loading Rules

Runtime loader must:

* fetch/read the Runtime pilot obstacle JSON
* validate `schemaVersion`
* validate `runtimeMayConsume === true`
* validate `obstacles` is an array
* fail closed if the file is missing, invalid, or `runtimeMayConsume !== true`
* never silently fall back to drafts/frozen/fixtures

## Runtime Fail-Closed Behavior

If Runtime pilot file cannot be loaded:

* existing UI must remain functional
* app must not crash
* no fake obstacles may be generated
* no AI call may be made
* no OCR or coordinate generation may be triggered
* a clear console warning is allowed

## Runtime Obstacle Fields

Runtime may read only:

### Common

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

### Vocabulary

* `word`
* `lemma`
* `phonetic`
* `partOfSpeech`
* `sentenceMeaning`
* `translation`
* `difficultyLevel`
* `difficultyEvidence`

### Comprehension

* `phrase`
* `literal`
* `actual`
* `grammar`
* `explanationWhy`
* `transferableUsage`
* `comprehensionCategory`

## Runtime Forbidden Fields

Runtime must not require or read:

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

## Runtime Type Rules

Allowed obstacle types remain only:

* `vocabulary`
* `comprehension`

No third obstacle type is introduced.

## Marker Rules

Runtime may use:

* `markerStart`
* `markerEnd`
* `subtitleIndex`

for subtitle text marker binding.

Runtime must not generate coordinates.

Runtime must not call Qwen-VL.

Runtime must not modify visual mapping files.

Visual coordinate binding remains separate.

## UI Boundary Rules

This contract does not authorize UI redesign.

Runtime consumption must preserve:

* existing player layout
* existing right-panel behavior
* existing obstacle card behavior
* existing subtitle marker style
* existing timeline/heatmap behavior

## Existing Production Data Boundary

This contract does not authorize modifying:

* `output_text/v29a_obstacles.json`
* `output_text/v29a_obstacles_pilot.json`

P0-4B is pilot-only.

## Forbidden

This contract does NOT authorize:

* `script.js` modification
* `styles.css` modification
* Runtime integration code
* production obstacle replacement
* marker rendering redesign
* coordinate generation
* OCR
* Qwen
* Qwen-VL
* AI calls
* episode selector changes
* playback control changes

## Future Implementation Note

Next implementation task may be:

```text
P0-4B-1
Runtime Pilot Data Loader Skeleton
```

Goal:

Add a runtime loader that can read:

```text
output_text/runtime/p0_4a_obstacles_pilot_runtime.json
```

validate it, and expose it internally without changing UI behavior.

## Verification

No runtime test required.

Recommended check:

```sh
test -f docs/P0_4B_RUNTIME_PILOT_CONSUMPTION_CONTRACT.md
```

Success criteria:

* Contract document exists.
* No code files modified.
* No Runtime files modified.
* No production obstacle files modified.
* Runtime consumption boundaries are clearly frozen.

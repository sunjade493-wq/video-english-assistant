# P0-4A-3D Frozen Cleanup Contract

## Status

Frozen

## Purpose

Clarify which review-state fields belong to which pipeline stage:

* Draft stage
* Human Review stage
* Frozen stage

## Background

P0-4A-3A/3B/3C successfully generated:

```text
output_text/frozen/p0_4a_obstacles_pilot_frozen.json
```

During verification, the frozen obstacles contained both:

* `reviewDecision`: `"pending"`
* `reviewStatus`: `"approved"`
* `humanDecision`: `"approved"`

This is not a Runtime bug, but it can confuse future promotion/runtime work if not clarified.

## Field Ownership Rules

### Draft stage

* `reviewDecision` belongs to AI draft lifecycle only.
* Allowed value in draft output:
  * `pending`
* It means:
  * AI-generated obstacle has not yet been human-reviewed.
* Runtime must not consume this field.

### Human Review stage

* `humanDecision` belongs to human review lifecycle.
* Allowed values:
  * `pending`
  * `approved`
  * `rejected`
* `reviewer`, `reviewedAt`, `reviewNotes` belong to this stage.
* Runtime must not infer final frozen status from draft `reviewDecision`.

### Frozen stage

* `reviewStatus` belongs to frozen lifecycle.
* Allowed frozen values:
  * `approved`
  * `rejected`
  * `frozen_pilot`
  * `frozen_production`
* `humanDecision` may be preserved as review provenance.
* `reviewDecision` should not be used by Runtime.

## Cleanup Decision

For P0-4A frozen pilot outputs:

* `reviewDecision` may remain temporarily for provenance.
* `reviewDecision` is deprecated in frozen outputs.
* Future frozen promotion scripts should either:
  * A. remove `reviewDecision` from promoted frozen obstacles
  * B. move it under `provenance.aiDraft.reviewDecision`

Recommended direction:

Remove `reviewDecision` from top-level obstacle fields in frozen outputs.

Reason:

Frozen obstacle top-level fields should describe final approved/frozen state, not draft pending state.

## Runtime Contract

Runtime must only consume frozen obstacle files after an explicit Runtime Promotion step.

Runtime must not consume:

```text
output_text/drafts/*
output_text/fixtures/*
output_text/frozen/p0_4a_obstacles_pilot_frozen.json
```

until a separate Runtime Promotion Contract explicitly permits it.

For now:

```yaml
runtimeMayConsume: false
```

remains mandatory in frozen pilot output.

## Promotion Contract

Frozen promotion scripts must preserve:

* `obstacleId`
* `type`
* `subtitleIndex`
* `source_en`
* `source_zh`
* `markerStart`
* `markerEnd`
* vocabulary fields
* comprehension fields
* `humanDecision`
* `reviewer`
* `reviewedAt`
* `reviewNotes`
* `reviewStatus`
* `frozenAt`
* `frozenSource`

Frozen promotion scripts should not preserve top-level:

* `reviewDecision`

unless explicitly nested under provenance.

## Forbidden

This contract does NOT authorize:

* Runtime integration
* `script.js` modification
* `styles.css` modification
* `output_text/v29a_obstacles.json` modification
* `output_text/v29a_obstacles_pilot.json` modification
* marker generation
* coordinate generation
* OCR
* Qwen-VL
* production obstacle replacement

## Future Implementation Note

The next implementation task may be:

```text
P0-4A-3E
Frozen Promotion Cleanup Implementation
```

Goal:

Update frozen promotion script so promoted frozen obstacles no longer include top-level `reviewDecision`.

## Verification Command

No runtime test required.

Recommended check:

```bash
git diff -- docs/P0_4A_3D_FROZEN_CLEANUP_CONTRACT.md
```

Success criteria:

* New contract document exists.
* No code files modified.
* No Runtime files modified.
* No production obstacle files modified.
* Contract clearly freezes review-state field ownership.

# P8 — Offline Visual Mapping Engine Implementation Plan

**Status:** PLAN
**Date:** 2026-06-30

---

## Source of Truth

This plan is derived exclusively from the following frozen P7 documents:

- `docs/P7_OFFLINE_VISUAL_MARKER_ARCHITECTURE_FREEZE.md`
- `docs/P7_OFFLINE_VISUAL_MARKER_DATA_CONTRACT_FREEZE.md`
- `docs/P7_OFFLINE_VISUAL_MAPPING_WORKFLOW_FREEZE.md`

All contracts defined in those documents are binding. This plan does not introduce new contracts.

---

## P8 Goal

Implement the Offline Visual Mapping Engine that generates frozen `visualMarker` coordinates.

The engine takes three inputs:

- Original video
- Burned English subtitle (text and timing)
- Frozen Analyze Engine output

And produces:

- Frozen `visualMarker` JSON consumed by Runtime

Runtime never generates, estimates, or recalculates coordinates.

---

## Pipeline Position

```
Offline Analyze Engine
        ↓
Frozen Analyze Output
        ↓
Offline Visual Mapping Engine  ← P8 implements this
        ↓
Frozen visualMarker JSON
        ↓
Runtime Renderer
```

---

## Stage P8-A: Pilot Scope

Define a minimal, verifiable pilot before building the full engine.

**Pilot scope:**

- Episode: TBBT S12E01
- Time range: first 2 minutes
- Obstacles: Batch 1 only
- Marker type priority:
  1. Vocabulary dot (implement first)
  2. Comprehension line (implement after dot is verified)

**Rationale:**

A constrained pilot reveals vision-mapping failure modes on real video before committing to a full pipeline. Dot-first ordering reduces surface area during initial validation.

**Pilot acceptance criteria:**

- At least one Vocabulary obstacle in the pilot scope receives a correctly positioned `visualMarker.kind = "dot"` with valid `centerX`, `baselineY`, and `radius`.
- The dot visually aligns beneath the target English word when overlaid on the source frame.
- No Runtime participation in coordinate generation.

---

## Stage P8-B: Input Adapter

Define how the engine receives its three inputs for each subtitle unit.

**Inputs per subtitle unit:**

| Input | Description |
|---|---|
| Video frame | Single decoded frame at or near subtitle display time |
| Subtitle timing | `start_time`, `end_time` of the subtitle |
| `source_en` | The burned English subtitle text string |
| Obstacle type | `vocabulary` or `comprehension` (from frozen Analyze output) |
| Target word | For Vocabulary: the specific English word to mark |
| Target span | For Comprehension: the start/end character range within `source_en` |

**Adapter responsibilities:**

- Accept the frozen Analyze Engine output as the semantic source.
- Extract the relevant frame from the video at the subtitle timing.
- Pass the frame, subtitle text, obstacle type, and target to the Vision Mapping Probe.

**Adapter constraints:**

- The adapter must not modify semantic decisions from the Analyze Engine.
- The adapter must not infer or guess obstacle type or target word.
- All semantic inputs come exclusively from the frozen Analyze output.

---

## Stage P8-C: Vision Mapping Probe

Use an offline AI / vision model to locate the burned English subtitle text within the original video frame.

**Responsibilities:**

- Locate the subtitle region bounding box within the frame.
- Locate the target word or target span within that region.
- Return pixel coordinates for the located region.

**Constraints:**

- All processing is entirely offline.
- No Runtime participation.
- No network calls during processing.
- The probe must not make semantic decisions. It receives the target from the Input Adapter and locates it visually.

**Outputs from probe:**

For Vocabulary:

- Pixel bounding box of the target word within the frame

For Comprehension:

- Pixel bounding box of the target sentence span within the frame

**Failure behavior:**

- If the probe cannot locate the target, the obstacle is skipped.
- A diagnostic error is emitted with the subtitle text, target, and frame timestamp.
- No fallback coordinate is fabricated.

---

## Stage P8-D: Vocabulary Dot Generation

For each Vocabulary obstacle, generate the frozen dot marker from the bounding box produced by P8-C.

**Output fields:**

```json
{
  "visualMarker": {
    "kind": "dot",
    "centerX": <number>,
    "baselineY": <number>,
    "radius": <number>
  }
}
```

**Field derivation:**

| Field | Derivation |
|---|---|
| `centerX` | Horizontal midpoint of the target word bounding box |
| `baselineY` | Bottom edge of the target word bounding box, offset below the subtitle baseline |
| `radius` | Fixed or probe-derived value appropriate to subtitle font size |

**Constraints:**

- Exactly one dot per Vocabulary obstacle.
- Dot must be centered beneath the target English word.
- No underline.
- Coordinates expressed in original video pixel space.

---

## Stage P8-E: Comprehension Line Generation

For each Comprehension obstacle, generate the frozen line marker from the bounding box produced by P8-C.

**Output fields:**

```json
{
  "visualMarker": {
    "kind": "line",
    "left": <number>,
    "right": <number>,
    "baselineY": <number>,
    "strokeWidth": <number>
  }
}
```

**Field derivation:**

| Field | Derivation |
|---|---|
| `left` | Left edge of the semantic sentence span bounding box |
| `right` | Right edge of the semantic sentence span bounding box |
| `baselineY` | Bottom edge of the span bounding box, offset below the subtitle baseline |
| `strokeWidth` | Fixed value appropriate to subtitle font size |

**Constraints:**

- Exactly one horizontal line per Comprehension obstacle.
- Line spans beneath the semantic sentence span only.
- No dot unless a Vocabulary obstacle also exists for the same subtitle.
- Coordinates expressed in original video pixel space.

---

## Stage P8-F: Frozen JSON Producer

Write the frozen `visualMarker` JSON output that Runtime will consume.

**Responsibilities:**

- Accept the `visualMarker` objects produced by P8-D and P8-E.
- Merge them into the obstacle entries in the frozen Analyze output.
- Write the resulting JSON to the frozen output path.

**Output structure:**

Each obstacle entry in the frozen JSON gains a `visualMarker` field:

```json
{
  "obstacleType": "vocabulary",
  "word": "...",
  "visualMarker": {
    "kind": "dot",
    "centerX": 471.5,
    "baselineY": 829,
    "radius": 3
  }
}
```

**Constraints:**

- The producer must not modify any other fields in the frozen Analyze output.
- The producer must only append `visualMarker` to existing obstacle entries.
- Runtime consumes this JSON without modification.
- Runtime must not recalculate any coordinate from this output.

---

## Stage P8-G: Runtime Consumer

Runtime reads the frozen `visualMarker` JSON and renders only.

This stage defines what Runtime must and must not do when consuming P8 output.

**Runtime MUST:**

- Read `visualMarker.kind` to determine which marker to render.
- For `kind: "dot"`: render a solid dot at `centerX`, `baselineY` with `radius`.
- For `kind: "line"`: render a horizontal line from `left` to `right` at `baselineY` with `strokeWidth`.
- Skip rendering if `visualMarker` is absent from an obstacle.
- Emit a developer-facing diagnostic when an obstacle is skipped due to missing `visualMarker`.

**Runtime MUST NOT:**

- OCR
- AI inference
- `measureText` or any canvas/DOM text measurement
- Estimate subtitle geometry
- Character-ratio positioning
- Pixel mapping or pixel approximation
- Regenerate coordinates
- Normalize coordinates
- Interpolate coordinates
- Fabricate coordinates as fallback

**Combined rendering order (when both types exist for the same subtitle):**

```
English Subtitle
      ↓
Vocabulary Dot
      ↓
Comprehension Line
```

Maximum two marker layers per subtitle.

---

## Implementation Order

```
P8-A  Pilot scope definition
P8-B  Input Adapter
P8-C  Vision Mapping Probe
P8-D  Vocabulary Dot Generation
P8-F  Frozen JSON Producer (dot only, validate pilot)
P8-E  Comprehension Line Generation
P8-F  Frozen JSON Producer (full, dot + line)
P8-G  Runtime Consumer verification
```

P8-E and the second P8-F pass are gated on successful pilot verification of P8-D output.

---

## What This Plan Does Not Define

- Specific vision model or OCR library selection (deferred to implementation)
- Runtime code changes (Runtime is read-only consumer; changes require separate instruction)
- Fallback logic of any kind
- New data contracts (all contracts are defined in P7 freeze documents)

---

**End of P8 Implementation Plan**

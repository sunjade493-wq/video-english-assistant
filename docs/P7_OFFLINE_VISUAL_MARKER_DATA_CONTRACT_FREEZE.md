# P7 — Offline Visual Marker Data Contract Freeze

**Status:** FROZEN
**Date:** 2026-06-30

---

## Purpose

Offline Visual Mapping Engine consumes frozen Analyze Engine output and produces frozen `visualMarker` data for Runtime.

Runtime never generates marker coordinates.

---

## Inputs

Offline Visual Mapping Engine receives:

- Video frame
- Burned English subtitle
- Frozen Analyze Engine output

Analyze Engine already determines:

- Obstacle type
- Target word (Vocabulary) or target sentence span (Comprehension)

Visual Mapping Engine does NOT change semantic decisions.

---

## Output Schema

Each obstacle produces exactly one `visualMarker` object.

**Vocabulary:**

```json
{
  "visualMarker": {
    "kind": "dot",
    "centerX": 471.5,
    "baselineY": 829,
    "radius": 3
  }
}
```

**Comprehension:**

```json
{
  "visualMarker": {
    "kind": "line",
    "left": 351,
    "right": 612,
    "baselineY": 839,
    "strokeWidth": 2
  }
}
```

---

## Field Definitions

### Vocabulary (`kind: "dot"`)

| Field | Type | Description |
|---|---|---|
| `kind` | string | Always `"dot"` |
| `centerX` | number | Horizontal center of dot, in pixels |
| `baselineY` | number | Vertical position of dot baseline, in pixels |
| `radius` | number | Dot radius, in pixels |

### Comprehension (`kind: "line"`)

| Field | Type | Description |
|---|---|---|
| `kind` | string | Always `"line"` |
| `left` | number | Left edge of line, in pixels |
| `right` | number | Right edge of line, in pixels |
| `baselineY` | number | Vertical position of line, in pixels |
| `strokeWidth` | number | Line stroke width, in pixels |

---

## Rendering Rules

### Vocabulary

- Exactly one dot per Vocabulary obstacle.
- Dot is centered beneath the target English word.
- No underline.

### Comprehension

- Exactly one horizontal line per Comprehension obstacle.
- Line spans beneath the semantic sentence span.
- No dot unless a Vocabulary obstacle also exists for the same subtitle.

---

## Combined Obstacles

If both obstacle types exist for the same subtitle, rendering order is fixed:

```
English Subtitle
      ↓
Vocabulary Dot
      ↓
Comprehension Line
```

Both markers belong to the same subtitle. Maximum two marker layers.

---

## Coordinate Rules

Coordinates are expressed in the original video coordinate space produced by the Offline Visual Mapping Engine.

All coordinates are frozen at offline processing time.

Runtime must never:

- Adjust coordinates
- Normalize coordinates
- Estimate coordinates
- Interpolate coordinates
- Regenerate coordinates

---

## Failure Policy

If `visualMarker` is missing from an obstacle, Runtime skips rendering for that obstacle.

Runtime must never fabricate coordinates.

---

## Frozen Contract

This document defines the permanent data contract for the Offline Visual Marker system.

- All `visualMarker` fields are produced by the Offline Visual Mapping Engine.
- Runtime consumes these fields read-only.
- This contract is binding for all P7 and downstream implementation.

# P7 — Offline Visual Marker Architecture Freeze

**Status:** FROZEN
**Date:** 2026-06-30

---

## Product Principle

Marker positions are NOT determined by Runtime.

Marker positions are determined entirely by Offline AI + Offline Visual Mapping.

Runtime is a pure renderer.

Offline Analyze Engine determines which word or sentence span should receive a marker.

Offline Visual Mapping Engine determines the final screen coordinates for that marker.

Runtime renders the frozen coordinates without modification.

---

## Vocabulary Marker

AI determines:

- `centerX`
- `baselineY`
- `radius`

Runtime renders exactly one solid dot, centered directly beneath the target English word.

---

## Comprehension Marker

AI determines:

- `left`
- `right`
- `baselineY`
- `strokeWidth`

Runtime renders exactly one thin horizontal line representing the semantic learning span.

---

## Combined Rendering

If one sentence contains both obstacle types, the rendering order is fixed:

```
English Subtitle
      ↓
Vocabulary Dot
      ↓
Comprehension Line
```

The dot is always above the line. The line is always below the dot. Maximum two marker layers.

---

## Runtime Responsibilities

Runtime MUST NOT:

- OCR
- AI inference
- `measureText`
- Estimate subtitle geometry
- Character-ratio positioning
- Pixel mapping
- Regenerate coordinates
- Modify marker positions

Runtime ONLY consumes the frozen `visualMarker` fields from JSON:

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

## Pipeline

```
Offline Analyze Engine
      ↓
Offline Visual Mapping Engine
      ↓
Frozen Marker JSON
      ↓
Runtime Renderer
```

---

## Frozen Contract

This document is the architecture specification for all future marker positioning work.

- Runtime never approximates, guesses, or recalculates marker positions.
- All coordinate fields are produced offline and consumed read-only by Runtime.
- This contract is binding for all P7 and downstream implementation.

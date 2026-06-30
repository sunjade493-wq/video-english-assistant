# P7 Offline Visual Mapping Engine — Workflow Freeze

**Status:** FROZEN
**Date:** 2026-06-30

This document freezes the permanent workflow for the Offline Visual Mapping Engine.
It defines workflow only. It does not describe implementation algorithms.

---

## 1. Overall Pipeline

```
Offline Analyze Engine
        ↓
Frozen Analyze Output
        ↓
Offline Visual Mapping Engine
        ↓
Frozen visualMarker JSON
        ↓
Runtime Renderer
```

---

## 2. Workflow Steps

### Step 1 — Receive Inputs

The Offline Visual Mapping Engine receives:

- The original video frame
- The burned English subtitle text
- The frozen Analyze Engine output for that subtitle

### Step 2 — Locate Subtitle on Frame

Locate the burned English subtitle region within the original video frame.

This step is performed entirely offline.
Runtime has no participation in subtitle location.

### Step 3 — Vocabulary Obstacle Coordinate Generation

For each Vocabulary obstacle:

- Locate the target English word within the subtitle region
- Generate: `centerX`, `baselineY`, `radius`

### Step 4 — Comprehension Obstacle Coordinate Generation

For each Comprehension obstacle:

- Locate the semantic sentence span within the subtitle region
- Generate: `left`, `right`, `baselineY`, `strokeWidth`

### Step 5 — Assemble Frozen visualMarker Objects

Generate frozen `visualMarker` objects from the coordinates produced in Steps 3 and 4.

### Step 6 — Write Frozen JSON

Write the frozen `visualMarker` JSON output.
Runtime consumes this JSON without modification.

---

## 3. Responsibilities

### Offline Analyze Engine

- Semantic understanding of subtitle content
- Obstacle type classification
- Target word identification (Vocabulary obstacles)
- Target sentence span identification (Comprehension obstacles)

### Offline Visual Mapping Engine

- Locating the subtitle region on the video frame
- Locating the target word or sentence span within that region
- Generating all `visualMarker` coordinate fields

### Runtime Renderer

- Reading the frozen `visualMarker` JSON
- Rendering markers at the frozen coordinates
- No participation in coordinate generation

---

## 4. Runtime Prohibitions

Runtime must never perform any of the following in relation to `visualMarker` coordinates:

- OCR
- AI inference
- `measureText` or any canvas/DOM text measurement
- Subtitle geometry estimation
- Character-ratio positioning
- Pixel mapping or pixel approximation
- Coordinate regeneration
- Coordinate normalization
- Coordinate interpolation

All coordinate values consumed by Runtime are frozen offline. Runtime is read-only.

---

**End of P7 Offline Visual Mapping Workflow Freeze**

# P0.5 Subtitle Marker Position Contract Freeze

Status: FROZEN

Date: 2026-06-19

## 1. Goal

Subtitle markers are lightweight dashed hints rendered below the video subtitle. They indicate that the current subtitle contains a vocabulary or comprehension obstacle.

The marker must remain visually tied to the original subtitle expression that triggered the obstacle.

## 2. Runtime Principles

Runtime only reads marker data. Runtime must not infer language intelligence or obstacle ranges.

Runtime may render marker positions from backend-provided `markerStart` / `markerEnd` fields in the current MVP, or from future subtitle token bounding boxes in the real episode pipeline.

## 3. Current MVP Contract

During the current demo / fixture stage, every obstacle must include:

- `source_en`
- `markerStart`
- `markerEnd`

`markerStart` and `markerEnd` are character-level ranges in `source_en`.

Runtime uses this range to render the dashed marker under the matching text in the current subtitle.

## 4. Real Episode Future Contract

In the real video stage, subtitles are burned into the source video.

The pipeline should add subtitle token position data before runtime attempts real burned-in subtitle marker placement:

- `subtitleId`
- `tokens[]`

Each token should include:

- `text`
- `x`
- `y`
- `width`
- `height`
- `lineIndex`

## 5. Obstacle to Token Mapping

Future obstacles must be mappable to a token range, for example:

- `subtitleId`
- `tokenStart`
- `tokenEnd`

An equivalent structure is acceptable if it preserves the same backend-owned mapping semantics.

## 6. Marker Rendering Contract

In the real video stage, marker rendering follows this chain:

Obstacle → token range → token bounding boxes → overlay marker rendered under the original burned-in subtitle.

## 7. Overlay Approach

Do not modify the video's original subtitles.

Use a video overlay layer to draw markers below the native subtitle text.

When the user clicks a marker:

- pause video
- enter Learning Pause
- position the right panel / bottom sheet on the corresponding obstacle

## 8. Forbidden Practices

- Runtime must not use AI or OCR to temporarily guess marker positions.
- Frontend must not guess token coordinates from obstacle text by itself.
- Marker logic must not be hard-coded into UI components.
- Real video integration must not remove the subtitle marker feature.

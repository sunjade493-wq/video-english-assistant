# P0-2 Burned Subtitle Overlay Architecture Freeze

Status:
Frozen and accepted.

Milestone:
P0-2 Burned Subtitle Overlay

## 1. Default Subtitle Strategy

P0 default visible subtitle source is the video’s built-in burned white subtitle.

The generated yellow full-sentence subtitle Overlay must be disabled by default.

The yellow full-sentence Overlay code may remain in the codebase as inactive fallback capability, but it is not part of the P0 runtime experience.

Yellow Overlay subtitles are historical demo/testing UI and must not be treated as the official subtitle source for P0.

## 2. Reason

The built-in burned subtitle is already synchronized with the real video audio and frames.

The generated yellow Overlay subtitle was created for demo/testing before real video integration and may be delayed, early, incomplete, or visually inconsistent with the real burned subtitle.

P0 should prioritize real viewing stability over generated subtitle duplication.

## 3. Learning Sync Data Source

Even though the yellow Overlay subtitle is disabled visually, the app still uses existing generated data as the learning synchronization source:

* subtitle JSON
* obstacle JSON

Runtime flow remains:

video.currentTime
→ subtitle JSON timing
→ obstacle JSON
→ right obstacle cards
→ bottom obstacle heat axis

The burned subtitle is for human viewing.
The JSON subtitle/obstacle data is for runtime learning synchronization.

## 4. Accepted P0-2 Timing Limitation

Existing subtitle JSON may not perfectly align with the built-in burned subtitle.

This is acceptable for P0-2.

P0-2 does not solve precise subtitle-marker alignment.

Precise marker alignment belongs to:

P0-3 Subtitle Marker On Real Subtitle

## 5. Marker Scope

P0-2 does not implement subtitle marker positioning.

P0-2 does not attempt word-level underline, word-level highlight, or phrase-level highlight on burned subtitles.

Because burned subtitles are video pixels, not DOM text, they cannot be directly selected, copied, or styled as text.

P0-3 may later implement a visual marker near the burned subtitle area.

P0-3 does not need to start with word-level precision. It may begin with sentence-level or region-level markers if exact word-level placement is not reliable yet.

## 6. Video Area Policy

P0-2 video area should remain clean.

P0-2 must not add new video-area learning UI, such as:

* extra learning subtitle text
* new floating tips
* “click here to learn” hints
* current obstacle count overlays
* new pause overlays
* new marker UI

Learning information remains in:

* right obstacle cards
* bottom obstacle heat axis

Existing Learning Pause behavior is not redesigned in P0-2.

## 7. Visual Policy

P0-2 must not adjust video brightness.

P0-2 must not add subtitle-region shadows, gradients, dark masks, or readability overlays.

White burned subtitle clarity polish may be handled later as a separate UI polish task.

## 8. Obstacle Count Policy

P0-2 must not change obstacle detection, obstacle data, or obstacle count logic.

Current baseline obstacle total must remain unchanged.

For the current P0-1 / P0-2 baseline, the expected total remains 48.

This does not freeze final Level Runtime behavior.

Dynamic obstacle counts by vocabulary level belong to:

P0-4 Level Selector Runtime

## 9. Explicit Non-Goals

P0-2 must not implement:

* P0-3 Subtitle Marker On Real Subtitle
* word-level marker placement
* OCR bounding boxes
* regenerated subtitles
* regenerated obstacles
* Level Runtime
* Episode Runtime
* Speed menu changes
* right panel redesign
* footer redesign
* obstacle contract changes
* subtitle JSON contract changes
* audio pronunciation feature
* video brightness or subtitle readability polish

## 10. Validation Environment

All P0-2 validation involving real video must use Live Server:

http://127.0.0.1:5500

Do not use `py -m http.server` to validate real-video playback, seeking, subtitle synchronization, playback speed, or HTML5 media events.

## 11. Acceptance Criteria

P0-2 is accepted when:

* Page loads under Live Server 5500.
* Real video plays normally.
* Built-in burned white subtitle remains visible.
* Generated yellow full-sentence Overlay subtitle is not displayed by default.
* Play / pause works.
* Timeline seek works.
* Speed menu still works.
* Right obstacle cards still sync from current JSON data.
* Bottom obstacle heat axis remains stable.
* Level / Episodes / Speed menus remain unchanged.
* Current baseline obstacle total remains unchanged.
* For the current P0-1 / P0-2 baseline, expected total remains 48.
* No new console errors are introduced.

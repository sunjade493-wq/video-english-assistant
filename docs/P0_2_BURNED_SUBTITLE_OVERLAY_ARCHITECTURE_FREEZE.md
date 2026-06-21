## P0-2 Timing Clarification

P0-2 accepts temporary timing differences between the built-in burned subtitle and the generated JSON timing, provided that:

* right obstacle cards remain functional
* bottom obstacle heat axis remains functional
* learning synchronization flow remains functional

Minor subtitle timing differences do not constitute a P0-2 failure.

Precise subtitle-marker alignment remains a P0-3 responsibility.

---

## Yellow Overlay Preservation Rule

The generated yellow full-sentence subtitle Overlay should be disabled through configuration or rendering logic.

The implementation must not be physically removed from the codebase during P0-2.

The Overlay implementation remains an inactive fallback capability for potential future use cases, including videos without burned subtitles or optional advanced subtitle modes.

---

## JSON Data Preservation Rule

P0-2 must not modify:

* output_text/v28d_bilingual_subtitles.json
* output_text/v29a_obstacles.json

P0-2 must not regenerate subtitles or obstacles.

P0-2 uses existing generated JSON files as read-only learning synchronization data.

Future subtitle-marker calibration work belongs to P0-3 and should begin from the current validated data baseline.

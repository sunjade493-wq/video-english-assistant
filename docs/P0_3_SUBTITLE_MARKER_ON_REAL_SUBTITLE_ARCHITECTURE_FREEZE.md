# P0-3 Subtitle Marker On Real Subtitle Architecture Freeze

Status: Frozen

Scope: Documentation-only architecture freeze for P0-3.

No runtime code changes.

P0-3 defines the architecture for lightweight learning markers associated with the real burned subtitle area. Implementation is intentionally deferred.

## P0-3 Architecture Freeze

1. Built-in white burned subtitles remain the only visible sentence subtitle source.

2. Generated yellow full-sentence subtitle overlay remains disabled by default and must not be physically removed from the codebase.

3. Runtime remains a read-only consumer of existing generated learning data.

4. Do not regenerate or modify:

   - `output_text/v28d_bilingual_subtitles.json`
   - `output_text/v29a_obstacles.json`

5. P0-3 markers are lightweight approximate learning markers associated with the burned subtitle area.

6. No OCR.

7. No text selection.

8. No word selection.

9. No pixel-perfect alignment.

10. Each obstacle gets one marker.

11. Marker visual style is:

    ```text
    ···
    ```

12. Markers are placed below the burned subtitle area.

13. Multiple obstacles in the same subtitle render as multiple separate `···` markers.

14. Clicking a marker pauses video and opens the existing Learning Tips / Learning Pause flow.

15. Marker timing may use a small tolerance window to better match burned subtitle perception.

16. Initial marker validation color is yellow, but final marker color remains subject to video validation.

17. P0-3 does not require fixing subtitle timing drift.

18. P0-3 does not require burned-subtitle OCR alignment.

19. P0-3 does not require pixel-level mapping between generated subtitle JSON and burned subtitle text.

20. The goal of P0-3 is discoverability of learning points associated with the burned subtitle area, not exact subtitle annotation.

## Non-Goals

P0-3 does not implement markers in this architecture freeze.

P0-3 does not change Runtime, JavaScript, CSS, HTML, generated subtitle JSON, or generated obstacle JSON in this architecture freeze.

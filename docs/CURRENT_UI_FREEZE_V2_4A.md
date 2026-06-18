# Current UI Freeze — V2.4A MVP Baseline

Status: FROZEN

Freeze date: 2026-06-18

Purpose: freeze the currently accepted Video English Assistant V2.4A MVP player UI and interaction state as the active development baseline. This is a baseline record only; it does not introduce new UI logic, styling, or data-structure changes.

## Frozen Modules

### 1. Layout Freeze

- Keep the left 70% / right 30% layout.
- Keep the current player card, right obstacle panel, and three-line footer structure.
- Do not change the player visual design, right-panel scrolling behavior, or obstacle-card density.

### 2. Subtitle Marker Freeze

- Subtitle dashed markers must read only backend / Analyze Engine generated `markerStart` / `markerEnd` values.
- Runtime must not guess marker positions, perform phrase search, use token fallback, or fall back to `obstacle.index` / `obstacle.end`.
- If `markerStart` / `markerEnd` is missing, illegal, reversed, or out of bounds, Runtime must not render the dashed underline.
- Multiple vocabulary and comprehension obstacles may be marked simultaneously in the current subtitle.
- Clicking a dashed marker only pauses playback and syncs the right obstacle panel; it must not open a popup or floating explanation.

### 3. Right Panel Freeze

- Keep the right-panel title row: `本集障碍 ✓ 已攻克 n · ○ 剩余 n · ↩ 返回上一个障碍`.
- Keep obstacle group titles: `生词障碍` / `理解障碍`.
- Keep vocabulary cards in the current compact structure: `word + phonetic + partOfSpeech + 🔊`; sentence meaning is displayed separately.
- Keep comprehension cards in the current structure: title / literal meaning / actual meaning / grammar explanation.
- Keep the current right-panel scrolling implementation; do not introduce a mobile Dynamic Stream.

### 4. Playback Control Freeze

- Freeze playback-state icons:
  - Paused state displays `▶`.
  - Playing state displays `⏸`.
- Freeze the bottom playback button:
  - Paused state displays `▶` for play.
  - Playing state displays `⏸` for pause.
- Do not use `Ⅱ` or `▷`.
- Keep the existing play / pause logic and `aria-label` logic.

### 5. Heat Timeline Freeze

- Analyze Engine only generates obstacle items; Runtime aggregates heat markers by visual pixel distance.
- Freeze aggregation thresholds:
  - Desktop: `24px`
  - Mobile: `18px`
- Cluster count equals the sum of obstacles inside the cluster.
- Clicking a cluster continues to open the existing Bottom Sheet.
- Markers must not overlap in a way that makes them unreadable.

### 6. Obstacle Heat Marker V2 Freeze

- Freeze heat marker display as pure text square-bracket labels:
  - `[1]`
  - `[5]`
  - `[10]`
  - `[99+]`
- Counts from 1 to 99 display the real number.
- Counts greater than or equal to 100 display `[99+]`.
- `aria-label` continues to preserve the real obstacle count, for example `111 obstacles`.
- Freeze marker style:
  - no background
  - no border
  - no border radius
  - no shadow
  - no capsule padding
  - `nowrap`
  - current blue text color
- Selected / hover states may only use darker text color and underline.
- The following must not reappear: blue solid circle, outer highlight ring, capsule background, shadow, or `heat-cluster-highlight`.

### 7. Bottom Sheet Freeze

- Clicking a heat marker opens the existing Bottom Sheet.
- Bottom Sheet keeps obstacle display grouped by subtitle segment.
- Obstacles in the same sentence remain bound inside the same subtitle group.
- Clicking an obstacle item inside Bottom Sheet syncs video time and the right obstacle card, then closes Bottom Sheet.
- Do not change the current Bottom Sheet visual style.

## Prohibited Regression / Rework Items

- Do not rework accepted player-page layout, player card, right obstacle panel, footer structure, subtitle marker behavior, playback icons, heat marker visual style, or Bottom Sheet interaction without an explicit unfreeze decision.
- Do not add frontend marker-position guessing, phrase search, token fallback, or obstacle index fallback.
- Do not replace the right-panel scroll implementation with a mobile Dynamic Stream.
- Do not replace bracket text heat markers with circles, capsules, shadows, highlight rings, or `heat-cluster-highlight`.

## Baseline Validation Status

Current validation commands for this freeze:

- `node --check script.js`
- `node --check analyze-engine.js`
- `bash scripts/check_baseline.sh`
- `git diff --check`

`test-current-subtitle-sync.js` is not part of this freeze's required validation set. If it still fails because of historical assertions or test-stub mismatch, record that status separately and do not make large Runtime changes for this documentation-only freeze.

## Recommended Next P0 Work

After this freeze, the next P0 development track should move to:

- Real episode video
- Subtitle downward adjustment
- Episode selector
- Speed controls
- Remove demo-only workflow

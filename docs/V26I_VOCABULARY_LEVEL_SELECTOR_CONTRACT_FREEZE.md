# V2.6I Vocabulary Level Selector Contract Freeze

Status: FROZEN

Date: 2026-06-19

Scope: Documentation-only contract freeze before P0 Real Episode Video work.

## 1. Purpose

V2.6I freezes the Vocabulary Level Selector contract before Real Episode Video work.

This freeze defines the accepted vocabulary level entry point, runtime loading behavior, and future dataset shape. It does not authorize Runtime, UI, generator, `output_text`, or obstacle regeneration changes.

## 2. Frozen Vocabulary Levels

Use the existing frozen vocabulary level system:

- Junior High (1500)
- Senior High (3500)
- CET-4 (4500)
- CET-6 (6000)
- TEM-4 (8000)
- TEM-8 (12000)
- GRE (20000+)

Do not replace with:

- CEFR
- Beginner / Intermediate / Advanced
- any unverified new level system

## 3. UI Placement

Vocabulary Level Selector should be placed in the video footer Row 1.

Frozen order:

```text
Time / Level / Episode / Speed
```

Example:

```text
00:58 / 02:05                         Level ▼   S12E01 ▼   Speed ▼
```

Reason:

Level, Episode, and Speed are all viewing-learning parameters.

Level should appear before Episode because the user first decides personal learning level, then chooses episode, then adjusts playback speed.

## 4. Runtime Behavior

Changing Level should take effect immediately for the current episode.

User action:

```text
Level changes from CET-4 to CET-6
```

Expected result:

- current episode obstacle dataset reloads
- total obstacle count updates
- right panel cards update
- subtitle dashed markers update
- heat timeline updates
- Bottom Sheet data updates

## 5. Runtime Read-Only Rule

Runtime must not:

- judge vocabulary difficulty
- remove vocabulary obstacles by itself
- add vocabulary obstacles by itself
- recompute obstacles
- run language-intelligence filtering
- infer user level effect from word lists

Runtime may only:

- read selectedLevel
- load the corresponding level-specific obstacle dataset
- render the returned obstacle data

## 6. Level-Specific Dataset Contract

Each episode may have level-specific obstacle files.

Recommended future path pattern:

```text
output_text/{episodeId}/{level}/v29a_obstacles.json
```

Example:

```text
output_text/S12E01/junior/v29a_obstacles.json
output_text/S12E01/senior/v29a_obstacles.json
output_text/S12E01/cet4/v29a_obstacles.json
output_text/S12E01/cet6/v29a_obstacles.json
output_text/S12E01/tem4/v29a_obstacles.json
output_text/S12E01/tem8/v29a_obstacles.json
output_text/S12E01/gre/v29a_obstacles.json
```

Current flat fixture path may remain temporarily for MVP compatibility, but future Real Episode Video work should migrate toward episode + level scoped datasets.

## 7. Vocabulary vs Comprehension Behavior

Vocabulary obstacles:

- depend on selected Level
- may increase or decrease when Level changes

Comprehension obstacles:

- do not depend on vocabulary Level
- should remain stable across Levels unless a later explicit freeze changes this

Backend / generator should produce level-specific datasets where:

- vocabulary obstacles vary by Level
- comprehension obstacles are shared or regenerated consistently

## 8. UX Rule

Do not make Level changes “next episode only”.

Do not require the user to manually rerun analysis.

Switching Level should feel immediate.

If the dataset is not yet available:

- show a clear unavailable/loading/error state
- do not silently keep old data while pretending Level changed

## 9. Persistence

Selected Level may be persisted as user preference.

Persistence should not change data contract:

- selectedLevel determines which obstacle dataset is loaded
- obstacle data remains backend-generated

## 10. Forbidden Regressions

Do not regress:

- Runtime read-only principle
- V2.6H Obstacle Data Contract
- markerStart / markerEnd contract
- episode-level learning-item dedupe
- comprehension obstacle boundary
- V2.4A UI baseline

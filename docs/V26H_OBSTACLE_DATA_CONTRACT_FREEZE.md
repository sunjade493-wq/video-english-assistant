# V2.6H Obstacle Data Contract Freeze

Status: FROZEN

Freeze Date: 2026-06-19

## 1. Purpose

V2.6H freezes the final obstacle data contract before entering P0 Real Episode Video work.

This is a documentation-only freeze after the V2.6F / V2.6G merge and video validation. It must not modify Runtime, UI, generator logic, `output_text` data files, or regenerated obstacles.

## 2. V2.6F Comprehension Obstacle Boundary

Comprehension obstacles are expressions where learners may know every individual word but still misunderstand the expression.

A comprehension obstacle must satisfy all of the following:

- non-literal / fixed / idiomatic / slang / culturally loaded / phrasal-verb / otherwise non-compositional expression
- plot-comprehension risk
- transferable learning value

Explicitly excluded from MVP comprehension obstacles:

- `Can you believe...?`
- `Are you serious?`
- `Would you mind...?`
- `Do you know...?`
- `I think so.`
- `I hope so.`
- `I guess so.`
- `Thank you.`
- `Good morning.`

These are non-obstacles in MVP.

They may be reconsidered later for Native Expressions / Advanced Learning Mode.

## 3. V2.6G Episode-Level Learning-Item Dedup

Obstacle count means unique learning items in the current episode, not occurrences.

Vocabulary dedupe key:

```text
word
+
partOfSpeech
+
sentenceMeaning
```

Examples:

```text
order | n./vi./vt. | 点餐
order | n./vi./vt. | 命令
```

If `sentenceMeaning` differs, they are different learning items.

Forbidden:

- word-only dedupe
- baseForm-only dedupe
- lemma-only dedupe

Comprehension dedupe key priority:

```text
prototype
>
normalizedText
>
baseForm
>
phrase
>
text
```

Same episode:

- keep first occurrence
- remove later duplicate learning items

Cross episode:

- do not do static season-level or series-level dedupe
- future cross-episode hiding belongs to user mastery / learning state

## 4. Nested Comprehension Cleanup

Within the same `source_en` / subtitle row:

If one comprehension obstacle marker range fully contains another comprehension obstacle marker range, keep the larger parent expression and remove the nested child expression.

Examples:

Keep:

```text
interlock with a satisfying snap
```

Remove:

```text
with a satisfying snap
```

Keep:

```text
our whole universe was in a hot, dense state
```

Remove:

```text
a hot, dense state
whole universe
```

Rules:

- only applies to comprehension obstacles
- does not affect vocabulary obstacles
- must be generic marker-containment logic
- must not be hard-coded text exclusions

## 5. Subtitle Marker Position Contract

Current MVP:

Each obstacle must include:

- `source_en`
- `markerStart`
- `markerEnd`

`markerStart` / `markerEnd` are character ranges in `source_en`.

Backend / generator responsibility:

- generate `markerStart` / `markerEnd`
- validate marker bounds
- fail fast if invalid

Runtime responsibility:

- read `markerStart` / `markerEnd`
- render subtitle dashed underline marker
- preserve marker click behavior:
  - pause video
  - enter Learning Pause
  - select corresponding obstacle
  - update right panel / bottom sheet

Runtime forbidden:

- do not infer marker positions
- do not search obstacle text in `source_en` to guess range
- do not use AI/OCR during Runtime to guess marker position

## 6. Future Real Episode Video Contract

For burned-in subtitles, future implementation may add:

- `subtitleId`
- `tokens[]`
- token bounding boxes:
  - `text`
  - `x`
  - `y`
  - `width`
  - `height`
  - `lineIndex`

Obstacle may map to:

- `subtitleId`
- `tokenStart`
- `tokenEnd`

Rendering chain:

```text
Obstacle
→ token range
→ token bounding boxes
→ overlay dashed marker under burned-in subtitle
```

Do not modify original video subtitles.

Use overlay marker layer.

## 7. Current Validated Baseline

Current validated baseline:

- `obstacle_count = 48`
- `believe` appears once as vocabulary
- `Can you believe` absent as comprehension
- `interlock with a satisfying snap` retained
- `with a satisfying snap` removed
- `our whole universe was in a hot, dense state` retained
- `a hot, dense state` removed
- `whole universe` removed
- subtitle dashed underline markers restored
- heat marker style remains pure text bracket labels

## 8. Forbidden Regressions

Do not regress:

- comprehension boundary
- episode-level dedupe
- nested comprehension cleanup
- `markerStart` / `markerEnd` generation
- Runtime read-only marker rendering
- heat marker bracket style
- V2.4A UI baseline

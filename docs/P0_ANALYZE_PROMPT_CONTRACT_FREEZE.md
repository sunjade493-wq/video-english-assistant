# P0 Analyze Prompt Contract Freeze

Status: FROZEN

Freeze Date: 2026-06-22

Milestone: P0-4A — AI-assisted Analyze Pipeline Pilot

## 1. Purpose

This document freezes the prompt contract for the P0-4A AI-assisted Analyze Pipeline Pilot before implementation.

It defines how the offline Analyze Engine should ask AI to identify Vocabulary Obstacles and Comprehension Obstacles.

This is the final guidance layer before P0-4A implementation:

```text
Product Philosophy
↓
Vocabulary Level Determination Contract
↓
Comprehension Obstacle Determination Contract
↓
Analyze Prompt Contract
↓
AI Draft Generation
↓
Human Review
↓
Script Validation
↓
Frozen Obstacles
```

This is a documentation-only freeze.

Do not implement code. Do not generate obstacles. Do not call AI. Do not call Qwen-VL. Do not modify Runtime files. Do not modify `script.js` or `styles.css`. Do not modify `output_text` data files.

## 2. Prompt Input Contract

The Analyze Prompt must receive structured input.

Required input fields:

- `episodeId`
- `subtitleIndex`
- `startTime`
- `endTime`
- `source_en`
- `source_zh`
- `learnerLevel`
- `contextBefore`
- `contextAfter`
- `analyzerVersion`

Field definitions:

- `episodeId`: episode identifier, for example `tbbt-s12e01`.
- `subtitleIndex`: index of the current subtitle in the source subtitle list.
- `startTime` / `endTime`: subtitle time range.
- `source_en`: current English subtitle text.
- `source_zh`: current Chinese subtitle text.
- `learnerLevel`: selected learner level.
- `contextBefore`: nearby subtitle context before the current subtitle.
- `contextAfter`: nearby subtitle context after the current subtitle.
- `analyzerVersion`: stable analyzer version string used for reproducibility.

Allowed learner levels:

- Junior High
- Senior High
- CET-4
- CET-6
- TEM-4
- TEM-8
- GRE

## 3. Prompt Thinking Order

The AI prompt must guide the model to follow the order below.

### Step 1 — Vocabulary Determination

Determine vocabulary obstacles according to:

- P0 Product Positioning & Learning Philosophy Freeze
- P0 Vocabulary Level Determination Contract Freeze

The Vocabulary Engine must use the hierarchical decision principle:

1. Frozen Vocabulary Lists
2. Expression Knowledge Base
3. Frequency Dictionaries
4. AI Assistance

AI recommendations remain draft and reviewable.

### Step 2 — Comprehension Determination

Determine comprehension obstacles according to:

- P0 Product Positioning & Learning Philosophy Freeze
- P0 Comprehension Obstacle Determination Contract Freeze

The Comprehension Engine must follow the constitutional principles:

1. Known words but meaning not immediately understandable.
2. Meaning-level obstacles rather than vocabulary-level obstacles.
3. Usefulness alone does not justify creating a comprehension obstacle.
4. Comprehension obstacles are context-dependent.
5. Comprehension obstacles should represent meaning bottlenecks rather than learning opportunities.
6. A comprehension obstacle should materially affect surrounding sentence understanding.
7. Generate the minimum number of comprehension obstacles necessary.
8. Comprehension obstacles should reflect learner-level progression.

### Step 3 — Deduplication

Remove duplicate or equivalent obstacles.

Rules:

- Do not create duplicate vocabulary obstacles for the same word or expression.
- Do not create duplicate comprehension obstacles for the same meaning bottleneck.
- Do not create overlapping comprehension obstacles unless they represent clearly different meaning problems.
- Do not let a comprehension obstacle replace valid vocabulary obstacles.
- Do not let vocabulary obstacles prevent a valid comprehension obstacle from being generated.

### Step 4 — Boundary Selection

Select meaningful and minimal text spans.

Rules:

- Vocabulary obstacle boundary should match the relevant word or expression.
- Comprehension obstacle boundary should match the smallest phrase, clause, or sentence span that carries the comprehension difficulty.
- Do not select the entire sentence if a shorter phrase captures the obstacle.
- Do not select only one word if the difficulty comes from phrase or sentence meaning.
- Use exact source text boundaries from `source_en` whenever possible.

### Step 5 — Explanation Generation

Generate learner-facing explanation fields.

Vocabulary obstacles should include:

- `word`
- `lemma`
- `phonetic`
- `partOfSpeech`
- `sentenceMeaning`
- `translation`

Comprehension obstacles should include:

- `text` or `phrase`
- `literal`
- `actual`
- `grammar`
- `explanationWhy`
- `transferableUsage`

Comprehension explanations must explain WHY the expression means what it means. They must not only translate the expression.

### Step 6 — Draft Output

Return structured JSON only.

The AI output must be treated as draft. The AI must not claim the output is frozen.

## 4. Prompt Output Contract

The output must be valid JSON.

Top-level fields:

- `schemaVersion`
- `reviewStatus`
- `episodeId`
- `learnerLevel`
- `analyzerVersion`
- `generatedAt`
- `pilotScope`
- `obstacles`

`reviewStatus` must be `draft`.

The AI must not output `frozen`.

`pilotScope` must include:

- `startTime`
- `endTime`

For the P0-4A pilot:

- `startTime`: `00:00:00`
- `endTime`: `00:02:00`

## 5. Obstacle Output Fields

Each obstacle must include:

- `obstacleId`
- `type`
- `subtitleIndex`
- `startTime`
- `endTime`
- `source_en`
- `source_zh`
- `text`
- `markerStart`
- `markerEnd`
- `decisionSource`
- `confidence`
- `reviewDecision`

Allowed `type` values:

- `vocabulary`
- `comprehension`

`obstacleId` format:

```text
tbbt-s12e01-obstacle-NNNNNN
```

Rules:

- `NNNNNN` must be six-digit zero-padded.
- Numbering starts at `000001`.
- Ordering must be deterministic.
- Runtime must never generate obstacle IDs.

Allowed `decisionSource` values:

- `frozen_vocabulary_list`
- `expression_knowledge_base`
- `frequency_dictionary`
- `ai_assisted`
- `ai_comprehension`

Initial `reviewDecision` value:

```text
pending
```

## 6. Vocabulary Obstacle Fields

Vocabulary obstacles must additionally include:

- `word`
- `lemma`
- `phonetic`
- `partOfSpeech`
- `sentenceMeaning`
- `translation`
- `difficultyLevel`
- `difficultyEvidence`

`sentenceMeaning` must be short and current-context-specific.

Runtime must display vocabulary fields exactly as provided.

## 7. Comprehension Obstacle Fields

Comprehension obstacles must additionally include:

- `phrase`
- `literal`
- `actual`
- `grammar`
- `explanationWhy`
- `transferableUsage`
- `comprehensionCategory`

Allowed `comprehensionCategory` values:

- `fixed_expression`
- `collocation`
- `slang`
- `extended_meaning`
- `culture_dependent`
- `phrase_meaning`
- `sentence_meaning`
- `known_words_difficult_combined_meaning`

Comprehension explanations must explain:

- literal meaning
- actual meaning
- why the actual meaning is produced
- how learners can transfer the usage to future contexts

## 8. Forbidden Prompt Behavior

The AI prompt must explicitly forbid:

- coordinate generation
- marker generation
- subtitle visual mapping
- Qwen-VL calls
- OCR
- Runtime modification
- obstacle count inference
- changing subtitle JSON
- changing existing `output_text` data files
- inventing obstacle IDs outside the required format
- returning non-JSON explanations
- returning markdown fences
- claiming draft output is frozen

## 9. Draft Boundary

The AI output belongs to Draft stage only.

Draft output path:

```text
output_text/drafts/p0_4a_obstacles_pilot_draft.json
```

Draft files must never be consumed by Runtime.

Only after:

- Human Review
- Script Validation
- Freeze Approval

may the data become:

```text
output_text/v29a_obstacles_pilot.json
```

## 10. Human Review Hook

Prompt output must be designed for human review.

Each obstacle should contain enough evidence for review:

- why it was selected
- which rule or source triggered it
- why the boundary was chosen
- why it is appropriate for the selected learner level
- confidence score

Human review decides whether the obstacle remains, is revised, or is rejected.

## 11. Stable Ordering Contract

The same:

- subtitle input
- learner level
- analyzerVersion

must generate the same obstacle ordering before review.

Final ordering:

1. `subtitleIndex`
2. `markerStart`
3. `type`, with vocabulary before comprehension when positions tie
4. `text`, in alphabetical order

Stable ordering is required because downstream systems depend on deterministic obstacle IDs.

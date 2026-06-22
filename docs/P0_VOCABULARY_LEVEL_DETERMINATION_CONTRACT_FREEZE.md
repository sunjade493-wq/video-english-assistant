# P0 Vocabulary Level Determination Contract Freeze

Status: FROZEN

Freeze Date: 2026-06-22

Scope: Vocabulary Engine difficulty determination contract. This is a documentation-only freeze and does not modify Runtime, UI, generator implementation, `output_text` data files, or regenerated obstacles.

## 1. Purpose

This contract freezes deterministic and explainable vocabulary difficulty determination rules for the Vocabulary Engine.

The goal is to prevent obstacle generation from depending entirely on unstable AI judgment.

Vocabulary difficulty determination must use a hierarchical decision system.

## 2. Layer 1 — Frozen Vocabulary Lists

Frozen vocabulary lists are the highest-priority authority and the source of truth.

Official source categories:

- Junior High: Compulsory Education English Curriculum Standards (2022)
- Senior High: General Senior High School English Curriculum Standards (2017, revised 2020)
- CET-4: National College English Test Band 4 Vocabulary List
- CET-6: National College English Test Band 6 Vocabulary List
- TEM-4: Test for English Majors Band 4 Vocabulary List
- TEM-8: Test for English Majors Band 8 Vocabulary List
- GRE: GRE High-Frequency Vocabulary Lists plus official GRE preparation vocabulary resources

Rules:

- If an item exists in frozen vocabulary lists, the frozen level must be used.
- Higher-level systems must not automatically override frozen lists.
- Frozen vocabulary lists are the source of truth.

## 3. Layer 2 — Expression Knowledge Base

The Expression Knowledge Base handles expressions that are not adequately represented by isolated word lists.

Examples:

- `gonna`
- `hang out`
- `mess up`
- `a couple of`
- `according to`
- `according to tradition`

Expression categories include:

- Fixed Expressions
- Phrasal Verbs
- Reduced Forms
- Collocations
- Multi-word Expressions

Rules:

- Expressions may have their own difficulty levels.
- Expression difficulty may differ from individual word difficulty.
- Expression-level decisions override individual-word lookup results.

## 4. Layer 3 — Frequency Dictionaries

Frequency dictionaries provide real-world language frequency information when an item is absent from both frozen vocabulary lists and the Expression Knowledge Base.

Sources:

- COCA (Corpus of Contemporary American English)
- SUBTLEX-US (Movie and TV Subtitle Frequency Lists)

Examples:

- `bedsheets`
- `roommate`
- `onesie`

Rules:

- Frequency information provides recommendations only.
- Frequency information does not override frozen vocabulary lists.
- Frequency information does not override expression knowledge.

## 5. Layer 4 — AI Assistance

AI assistance is the lowest-priority layer.

AI may assist only when at least one of the following applies after higher-priority resources have been checked:

1. The item is absent from frozen vocabulary lists.
2. The item is absent from the Expression Knowledge Base.
3. Frequency information is unavailable or insufficient.
4. Context-dependent meanings have different difficulty levels.
5. Multiple interpretations require semantic disambiguation.

Examples:

- `pull off`
- `take off`
- `figure out`

Rules:

- AI provides recommendations only.
- AI must never automatically override frozen resources.
- AI output remains reviewable.

## 6. Decision Priority

Vocabulary level determination is hierarchical.

Priority order:

```text
Layer 1
Frozen Vocabulary Lists
↓
Layer 2
Expression Knowledge Base
↓
Layer 3
Frequency Dictionaries
↓
Layer 4
AI Assistance
```

Higher-priority layers always override lower-priority layers.

## 7. Vocabulary Engine Guiding Principle

The Vocabulary Engine is not a simple vocabulary-list lookup system.

The engine asks:

> For a learner at this level, which expressions are most likely to hinder comprehension and usage of English?

Vocabulary obstacle determination may consider:

- Frozen vocabulary lists
- Expression knowledge
- Real-world frequency
- Contextual meaning
- Practical usage difficulty

## 8. Frozen Workflow

```text
word / expression
↓
Layer 1
Frozen Vocabulary Lists
↓
Found
→ Output Level

Not Found
↓
Layer 2
Expression Knowledge Base
↓
Found
→ Output Level

Not Found
↓
Layer 3
Frequency Dictionaries
↓
Recommendation

Insufficient
↓
Layer 4
AI Assistance
↓
Recommendation
↓
Draft
↓
Human Review
↓
Frozen
```

## 9. Product Principle

Learner levels are selected using familiar exam-based labels.

Obstacle identification is based on real-world English comprehension and usage difficulty for learners at that level.

The goal is not merely to determine whether a word belongs to an exam vocabulary list.

The goal is to determine which expressions are most likely to hinder understanding and usage for learners at that level.

## 10. Runtime Boundary

Runtime remains a read-only consumer of generated obstacle data.

Runtime must not:

- Perform vocabulary level determination.
- Query frozen vocabulary lists.
- Query the Expression Knowledge Base.
- Query frequency dictionaries.
- Call AI for vocabulary difficulty judgment.
- Override generated obstacle levels.

The Analyze Engine / Vocabulary Engine owns vocabulary difficulty determination before data is frozen.

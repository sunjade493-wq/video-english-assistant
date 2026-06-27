# P0-6B Scene Meaning Engine Freeze

Status: **FROZEN**

Version: **Final V1.0**

---

# Architecture Philosophy

Scene Meaning Engine is **not** an obstacle generator.

It is a **context understanding engine**.

Its purpose is to establish the standard contextual understanding of every subtitle before any downstream analysis begins.

Scene Meaning does not decide Vocabulary Obstacles.

Scene Meaning does not decide Comprehension Obstacles.

Scene Meaning only establishes the contextual truth of the dialogue.

Every downstream AI component should reason from the same Scene Meaning.

When Vocabulary Analyze, Comprehension Analyze, and AI Review all start from one shared contextual understanding, their decisions become consistent, comparable, and reproducible.

Scene Meaning is the shared starting point of contextual truth.

---

# 1. Purpose

This document freezes the architecture of the Scene Meaning Engine.

It defines what Scene Meaning is, what it owns, what it produces, and what it must never do.

## Why Scene Meaning Is Required

Dictionary meaning is insufficient for dialogue understanding.

A dictionary explains what a word can mean in general, not what it means in this scene.

Literal translation is insufficient.

A literal translation may preserve words while losing intent, tone, humor, or implication.

Grammar is insufficient.

Grammar explains sentence structure, not why the speaker chose this sentence in this moment.

Scene Meaning provides the contextual understanding that later AI components rely on.

Its purpose is to improve evidence quality rather than produce obstacle decisions.

Scene Meaning is an upstream evidence-improvement layer, not a decision layer.

---

# 2. Core Principles

## Principle 1: Subtitle-Level Meaning

Scene Meaning is established at the subtitle level.

It describes the contextual understanding of one subtitle line within its scene.

It is not a word-level meaning, and it is not a whole-episode summary.

## Principle 2: Context First

Scene Meaning is derived from context, not from isolated lexical lookup.

The current subtitle is understood in relation to surrounding dialogue, speaker intention, and scene situation.

## Principle 3: Evidence Source Only

Scene Meaning is an evidence source.

It exists to improve the quality of evidence available to downstream Analyze components.

It is never a final decision.

## Principle 4: Not Obstacle Data

Scene Meaning is not an obstacle.

It is not a Vocabulary Obstacle, a Comprehension Obstacle, or any obstacle field.

It is not consumed directly by Runtime and is not displayed in the UI.

## Principle 5: Independent From Vocabulary

Scene Meaning does not contain or replace vocabulary `sentenceMeaning`.

The Vocabulary Engine may consume Scene Meaning, but Scene Meaning never owns vocabulary decisions.

## Principle 6: Independent From Comprehension

Scene Meaning does not contain or replace comprehension explanations (`literal`, `actual`, `grammar`).

The Comprehension Engine may consume Scene Meaning, but Scene Meaning never owns comprehension decisions.

## Principle 7: Reusable Across Multiple Obstacles

One subtitle line owns one Scene Meaning.

Many obstacles within that subtitle may consume the same Scene Meaning.

Scene Meaning is shared evidence, not per-obstacle data.

## Principle 8: Runtime Never Participates

Scene Meaning generation, inference, validation, and repair belong entirely to the offline Analyze Pipeline.

Runtime never participates in any Scene Meaning activity.

---

# 3. Scene Meaning Generation Principles

Scene Meaning must be generated from all available contextual evidence.

Possible evidence includes:

* English subtitle
* Chinese subtitle (if available)
* Previous dialogue
* Following dialogue
* Character relationship
* Current scene
* Conversation objective
* Speaker intention
* Common knowledge

## Required Conceptual Generation Flow

```text
Subtitle
↓
Context Collection
↓
Scene Understanding
↓
Scene Meaning
```

## Forbidden Generation Flow

```text
Dictionary
↓
Scene Meaning
```

Scene Meaning must represent contextual understanding rather than dictionary interpretation.

A Scene Meaning derived directly from dictionary definitions, bypassing context collection, violates this freeze.

The engine must understand the scene first, then express its meaning — never the reverse.

---

# 4. Data Ownership

Scene Meaning belongs to the subtitle.

It does not belong to an obstacle.

One subtitle line owns one Scene Meaning.

Many obstacles may consume one Scene Meaning.

Obstacles must never duplicate Scene Meaning.

If an obstacle needs contextual understanding, it references the subtitle's Scene Meaning as evidence rather than copying it into obstacle fields.

This ownership rule guarantees a single source of contextual truth per subtitle line.

---

# 5. Evidence Generation Boundary

Scene Meaning Engine produces evidence only.

It never decides:

* Vocabulary obstacle
* Comprehension obstacle
* Freeze
* Reject
* Needs Human

Those decisions belong to downstream Analyze components.

Scene Meaning only establishes contextual evidence.

The boundary is strict: the Scene Meaning Engine describes, it does not decide.

---

# 6. Evidence Role

Scene Meaning becomes one evidence source inside the Evidence Engine defined by P0-6A.

It may later be consumed by:

* AI Analyze
* AI Review
* Human Review
* QA
* Batch Analyze Pipeline

Scene Meaning should never bypass the Evidence Engine.

Within the P0-6A evidence priority hierarchy, Scene Meaning is the Scene Meaning Layer evidence source.

It is subordinate to frozen contracts, dictionary/grammar/POS rules, and the English subtitle, and it carries more authority than dialogue context, expression knowledge, and model confidence.

Scene Meaning improves evidence quality; it does not change the evidence priority order.

---

# 7. Conceptual Record

This section describes a conceptual record only.

It does **not** define a frozen implementation schema.

Possible conceptual fields:

* `episodeId`
* `subtitleId`
* `timestamp`
* `source_en`
* `source_zh` (optional)
* nearby dialogue
* `sceneMeaning`
* `dialogueFunction`
* `speakerIntent`
* `ambiguity`
* `evidenceSource`
* optional `confidence`

This is not the frozen implementation schema.

Field names, structure, and storage format are not frozen by this document.

Implementation contracts will be frozen later.

This conceptual record exists only to communicate the intended shape of contextual evidence, not to bind implementation.

---

# 8. What Scene Meaning Should Capture

Scene Meaning should capture contextual understanding such as:

* actual contextual meaning
* dialogue purpose
* speaker intention
* implied meaning
* emotional tone
* pragmatic meaning
* relationship with nearby dialogue
* ambiguity when multiple interpretations remain possible

When ambiguity exists, Scene Meaning should record the ambiguity honestly rather than forcing a single interpretation.

Recorded ambiguity is itself valuable evidence for downstream review.

---

# 9. What Scene Meaning Must NOT Capture

Scene Meaning must not replace or contain:

* vocabulary `sentenceMeaning`
* comprehension explanation
* grammar explanation
* dictionary meaning
* marker coordinates
* obstacle fields
* Runtime data
* UI text

Scene Meaning describes the scene context.

It does not perform the responsibilities owned by the Vocabulary Engine, the Comprehension Engine, the marker/coordinate pipeline, Runtime, or the UI.

---

# 10. Interaction With Obstacles

Scene Meaning is consumed by downstream engines as evidence.

The Vocabulary Engine may consume Scene Meaning to determine the correct `sentenceMeaning`.

The Comprehension Engine may consume Scene Meaning to identify:

* implicit meaning
* idioms
* humor
* sarcasm
* pragmatic meaning
* cultural references

AI Review may consume Scene Meaning as evidence within the Evidence Engine.

Scene Meaning itself never creates an obstacle.

The relationship is one-directional: obstacles consume Scene Meaning; Scene Meaning never produces obstacles.

---

# 11. Runtime Boundary

Runtime must never:

* generate Scene Meaning
* infer Scene Meaning
* validate Scene Meaning
* repair Scene Meaning

Runtime remains a read-only consumer of frozen Runtime artifacts.

Scene Meaning belongs entirely to the offline Analyze Pipeline.

This boundary is consistent with the project-wide rule: Analyze generates, Runtime consumes.

Scene Meaning is Analyze-side evidence and never enters the Runtime read-only artifact path unless a separate future freeze explicitly authorizes it.

---

# 12. Future Compatibility

Scene Meaning is designed to support:

* the first episode full pipeline
* multiple TV shows
* multiple subtitle qualities
* videos with Chinese subtitles
* videos without Chinese subtitles
* future AI model replacement
* batch Analyze Pipeline
* long-term content factory

Because Scene Meaning is an evidence source rather than obstacle data, new evidence sources and new content can be added without changing Runtime architecture.

The contextual understanding layer is intended to remain stable even as AI models, vendors, and content scale change.

---

# 13. Non-Goals

This document does **not** define:

* final JSON schema
* prompts
* model vendor
* implementation code
* API contracts
* Runtime behavior
* UI behavior
* obstacle generation
* batch execution details

This document freezes architecture only.

Implementation contracts, data schemas, and pipeline execution details will be frozen in later documents.

---

# Final Frozen Statement

P0-6B establishes the Scene Meaning Engine as the contextual understanding layer of the Analyze Pipeline.

Scene Meaning is not an obstacle generator.

Scene Meaning is a context understanding engine.

Scene Meaning belongs to the subtitle, is consumed as evidence, and never decides obstacles.

Scene Meaning establishes the contextual truth that every downstream AI component reasons from.

Scene Meaning is offline Analyze-side evidence. Runtime never participates.

This freeze is consistent with:

* CLAUDE.md (Repository Evidence First, Frozen Contract First, Runtime Read-only, Analyze Generates / Runtime Consumes)
* P0-5C Comprehension Obstacle Philosophy
* P0-6A AI Review Evidence Engine Architecture

Unless superseded by a future officially approved Freeze, this document shall remain the governing architecture for the Scene Meaning Engine.

---

**End of P0-6B Scene Meaning Engine Freeze**

Version: Final V1.0

Status: FROZEN

===== END OF DOCUMENT =====

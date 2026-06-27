# P0-6A AI Review Evidence Rules Freeze

Status: **FROZEN**

Version: **Final V1.0**

---

# Architecture Philosophy

AI Review is not a confidence engine.

It is an evidence-driven decision engine.

**Evidence always precedes reasoning.**

**Reasoning always precedes decision.**

**Confidence never replaces evidence.**

AI does not need to prove how confident it is.

AI must prove why it reached a decision.

Every decision must be reconstructable from evidence.

Every decision must be reproducible given identical evidence.

Confidence is supplementary information only.

Evidence determines every decision.

---

# 1. Purpose

This document freezes the Evidence Engine architecture for the Analyze Pipeline.

This freeze is intended to become one of the highest-level architecture contracts of the project.

P0-6A defines the evidence system that every future decision-making component of the Analyze Pipeline must follow.

## Why Confidence Is Insufficient

AI model confidence scores reflect internal statistical certainty, not external factual correctness.

A model can be highly confident and factually wrong.

A model can be uncertain and factually correct.

Confidence measures how strongly a model believes its own output, not whether its output matches reality.

Therefore, confidence alone cannot determine whether an AI-generated draft obstacle should be frozen, rejected, or escalated to human review.

## The Purpose of AI Review

The purpose of AI Review is to justify every decision with explicit, verifiable evidence.

AI Review does **not** decide based on confidence.

AI Review decides based on evidence.

Confidence may be recorded as supplementary information, but confidence alone must **never** determine Frozen, Reject, or Needs Human.

Every decision must trace back to evidence sources that can be independently verified:

* Frozen contracts
* Dictionary definitions
* Grammar rules
* POS (part of speech) specifications
* English subtitle text
* Chinese subtitle text
* Scene meaning (when available)
* Dialogue context
* Expression knowledge

If the evidence is sufficient, freeze the obstacle.

If the evidence proves the obstacle incorrect, reject it.

If all available evidence has been examined and remains insufficient or conflicting, escalate to human review.

Confidence may support a decision, but it must never replace evidence.

---

# 2. Core Principles

## Principle 1: Evidence First

Every AI Review decision must be grounded in explicit, verifiable evidence.

Evidence sources include:

* Frozen contracts
* Dictionary definitions
* Grammar specifications
* POS rules
* Subtitle text (English and Chinese)
* Scene meaning layer (when available)
* Dialogue context
* Expression knowledge

Decisions without evidence are not allowed.

## Principle 2: Contract First

Frozen contracts are the highest-priority evidence source.

If a frozen contract explicitly defines or forbids a behavior, that contract overrides all other evidence sources.

Examples:

* P0-5C freezes the boundary between Vocabulary and Comprehension Obstacles.
* Vocabulary Level Determination Contract freezes the priority order of vocabulary level sources.
* POS Spec Freeze defines valid part-of-speech formats.

AI Review must consult frozen contracts before evaluating any other evidence.

## Principle 3: Context Before Human

Human review is expensive and does not scale.

Before escalating a decision to human review, AI Review must exhaust all available context:

* English subtitle
* Chinese subtitle (if available)
* Scene meaning (if available)
* Dialogue context (preceding and following subtitles)
* Expression knowledge
* Grammar rules

If sufficient context exists to make a justified decision, AI Review must make that decision.

If all available context has been examined and remains insufficient or conflicting, only then escalate to human review.

Human review should be the last resort, not the default fallback.

## Principle 4: Explainability First

Every AI Review decision must be explainable.

"The model is confident" is not an explanation.

"The dictionary confirms this meaning, the POS matches the frozen format, and the sentence context supports this interpretation" is an explanation.

AI Review output must include:

* Decision (Frozen, Reject, Needs Human)
* Evidence sources consulted
* Reasoning that connects evidence to decision
* Conflicting evidence (if any)
* Why this decision is justified despite conflicting evidence (if applicable)

Explainability is not optional.

If AI Review cannot explain why it made a decision, that decision is not valid.

## Principle 5: Runtime Never Participates

AI Review is an **offline Analyze Pipeline responsibility**.

Runtime is a **read-only consumer**.

Runtime must never:

* Perform AI Review
* Call AI models
* Infer missing obstacle fields
* Normalize obstacle data
* Repair obstacle data
* Generate confidence scores
* Validate obstacle decisions

AI Review produces frozen obstacle artifacts.

Runtime consumes frozen obstacle artifacts.

This boundary is immutable.

---

# 2A. Evidence Completeness Rule

AI Review must never begin reasoning until Evidence Collection has been completed.

Partial evidence must never be used to:

* Freeze
* Reject
* Escalate

Only after the entire Evidence Collection Checklist (Section 4) has been completed may AI Review begin reasoning.

The required architecture is:

```text
Evidence Collection
↓
Evidence Complete
↓
Reasoning
↓
Decision
```

Reasoning that begins before Evidence Collection is complete is invalid, regardless of how strong the partial evidence appears.

---

# 2B. Decision Traceability Rule

Every AI Review decision must be reconstructable.

Future reviewers must always be able to determine:

* which evidence was collected;
* which evidence was accepted;
* which evidence was rejected;
* why the final decision was made.

If the reasoning cannot be reconstructed, the review is incomplete.

An incomplete review must not be treated as a valid Frozen, Reject, or Needs Human decision.

Explainability is mandatory.

Confidence is never an explanation.

---

# 2C. Evidence Reproducibility Rule

Given identical:

* Frozen Contracts
* Dictionary
* Subtitle
* Scene Meaning
* Evidence Rules

AI Review should reach the same (or equivalent) conclusion, regardless of:

* AI model vendor;
* execution time;
* deployment environment.

Evidence changes may change the decision.

Model randomness alone must never change the decision.

The Analyze Pipeline should therefore be deterministic at the architecture level.

If two runs over identical evidence produce different decisions, the divergence is an architecture defect, not an acceptable model variation.

---

# 2D. Evidence Engine Architecture

P0-6A defines an Evidence Engine, not only an AI Review process.

The Evidence Engine is the shared decision-making substrate of the Analyze Pipeline.

Evidence Engine responsibilities include:

* Evidence Collection
* Evidence Validation
* Evidence Prioritization
* Evidence Traceability
* Evidence Reproducibility

AI Review is only one consumer of the Evidence Engine.

Future consumers include:

* AI Analyze
* AI Review
* Human Review
* QA
* Batch Analyze Pipeline

Future components must consume the same Evidence Engine rather than creating independent reasoning systems.

A component that invents its own private reasoning path, bypassing the Evidence Engine, violates this freeze.

---

# 3. Evidence Priority

Evidence sources are prioritized from highest to lowest authority.

Higher-priority evidence always overrides lower-priority evidence.

Model confidence is always the lowest-priority evidence.

Confidence may support a decision.

Confidence must never replace evidence.

## Level 1: Frozen Contracts

**Authority:** Highest

**Examples:**

* P0-5C Comprehension Obstacle Philosophy Freeze
* Vocabulary Level Determination Contract Freeze
* POS Spec Freeze
* Vocabulary Display Data Contract Freeze
* Sentence Meaning Semantic Responsibility Freeze

**Rule:**

If a frozen contract explicitly defines or forbids a behavior, that contract is the final authority.

No other evidence source can override a frozen contract.

## Level 2: Dictionary, Grammar, POS, Vocabulary Rules

**Authority:** High

**Examples:**

* Dictionary definitions (authoritative English dictionaries)
* Grammar specifications (standard English grammar references)
* POS rules (frozen part-of-speech format specifications)
* Vocabulary level lists (frozen exam-based vocabulary lists)

**Rule:**

If a dictionary, grammar rule, or frozen vocabulary list provides an explicit answer, that answer is highly authoritative.

Dictionary and grammar sources are only overridden by frozen contracts.

## Level 3: English Subtitle

**Authority:** Medium-High

**Source:** `output_text/v28d_bilingual_subtitles.json` (or current subtitle baseline)

**Rule:**

The English subtitle is the primary source of truth for what was actually said.

Obstacle boundaries (markerStart, markerEnd) must align with the English subtitle text.

Sentence meaning must reflect how the word/expression is used in the English subtitle.

The English subtitle is only overridden by frozen contracts or dictionary/grammar rules.

## Level 4: Chinese Subtitle

**Authority:** Medium

**Source:** `output_text/v28d_bilingual_subtitles.json` (or current subtitle baseline)

**Rule:**

The Chinese subtitle provides contextual meaning and cultural interpretation.

It is highly valuable for understanding scene intent, but it is not authoritative for English lexical analysis.

Chinese subtitle translations may vary across subtitle sources.

If the English subtitle and Chinese subtitle conflict, the English subtitle wins for lexical analysis.

If the Chinese subtitle provides scene context not evident in the English subtitle alone, that context is valuable evidence.

## Level 5: Scene Meaning Layer (Future)

**Authority:** Medium

**Source:** Future scene meaning artifact (not yet implemented in P0-6A)

**Rule:**

The Scene Meaning Layer will provide the overall contextual meaning of each subtitle line within the scene.

Scene meaning is distinct from:

* `sentenceMeaning` (meaning of a word in the sentence)
* `source_zh` (Chinese translation of the subtitle)

Scene meaning is an **evidence source for AI Review**, not Runtime data.

Scene meaning helps AI Review understand whether a word/expression creates a real learning obstacle in the scene context.

Scene meaning is only overridden by frozen contracts, dictionary/grammar rules, or the English subtitle itself.

## Level 6: Dialogue Context

**Authority:** Medium-Low

**Source:** Preceding and following subtitles

**Rule:**

Dialogue context helps disambiguate meaning when the current subtitle alone is insufficient.

Examples:

* A pronoun reference ("it") whose antecedent appears in a prior subtitle
* A response ("Yes, exactly") whose meaning depends on the prior question
* A continuation ("And then...") that extends a prior sentence

Dialogue context is valuable but must not override higher-priority evidence.

If the dialogue context suggests one interpretation but the dictionary suggests another, the dictionary wins.

## Level 7: Expression / Language Knowledge

**Authority:** Low

**Source:** AI model's internal knowledge of English expressions, idioms, collocations, pragmatic meaning

**Rule:**

Expression knowledge is valuable when no higher-priority evidence source provides a clear answer.

Examples:

* Recognizing that "break the ice" is an idiom
* Understanding that "actually" can signal contradiction or correction
* Knowing that "you know" is a discourse marker

Expression knowledge is the lowest-priority explicit evidence source.

It is only overridden by model confidence (Level 8).

## Level 8: Model Internal Confidence

**Authority:** Lowest

**Source:** AI model's confidence score or certainty estimate

**Rule:**

Model confidence is the **lowest-priority evidence source**.

Confidence may **support** a decision when all other evidence is ambiguous.

Confidence must **never replace** evidence.

**Valid use of confidence:**

* "The dictionary confirms meaning A (evidence), the English subtitle supports meaning A (evidence), and the model is highly confident in meaning A (supplementary)."

**Invalid use of confidence:**

* "The model is highly confident, so we freeze this obstacle." (No evidence cited)

**Confidence as a tiebreaker:**

If two interpretations are equally supported by all available evidence, confidence may serve as a tiebreaker.

If one interpretation has stronger evidence than another, confidence is irrelevant.

---

# 4. Evidence Collection Checklist

AI Review must explicitly verify the following evidence sources before making any decision.

Skipping steps is **not allowed**.

AI Review may not skip any applicable evidence source.

If an evidence source is unavailable, its absence must be explicitly recorded.

For each evidence source, the review record must distinguish between:

* **Not Available** — the evidence source does not exist for this obstacle
* **Checked** — the evidence source was consulted
* **Accepted** — the evidence supports the decision
* **Rejected** — the evidence was consulted but found not to support the decision

An evidence source silently omitted (neither checked nor recorded as Not Available) makes the review incomplete.

## Mandatory Checklist

☐ **Frozen Contract**

Has any frozen contract defined or forbidden this obstacle type, boundary, field, or decision?

If yes, cite the contract and follow it unconditionally.

☐ **Dictionary**

What does the authoritative English dictionary say about this word or expression?

If the dictionary provides a clear definition that matches the subtitle context, cite it.

☐ **POS (Part of Speech)**

What is the correct part of speech for this word in this sentence?

Does the POS match the frozen POS format specification?

If not, reject or escalate.

☐ **Grammar**

Does the grammar of the sentence affect the interpretation of this word or expression?

If yes, cite the grammar rule and explain how it affects meaning.

☐ **English Subtitle**

What is the exact English subtitle text?

Does the obstacle boundary (markerStart, markerEnd) align correctly with the English subtitle?

Does the sentence meaning reflect how the word/expression is used in this subtitle?

☐ **Chinese Subtitle (if available)**

What does the Chinese subtitle say?

Does the Chinese subtitle provide additional scene context or cultural interpretation?

Does the Chinese subtitle conflict with the English subtitle?

If yes, explain the conflict and state which interpretation is correct.

☐ **Scene Meaning (if available)**

What is the overall contextual meaning of this subtitle line in the scene?

Does the scene meaning support or contradict the obstacle's interpretation?

☐ **Dialogue Context**

What do the preceding and following subtitles say?

Does the dialogue context clarify or disambiguate the meaning of this obstacle?

☐ **Conflicting Evidence**

Is there any evidence that contradicts the proposed obstacle?

Examples:

* Dictionary says meaning A, but Chinese subtitle suggests meaning B
* Grammar rule suggests POS X, but the obstacle claims POS Y
* English subtitle text does not support the claimed marker boundary

If conflicting evidence exists, list all conflicts explicitly.

☐ **Multiple Plausible Interpretations**

Are there multiple interpretations that are equally supported by the evidence?

If yes, list all plausible interpretations and explain why they are equally valid.

☐ **Final Decision**

Based on all evidence collected, what is the decision?

* **Frozen:** Evidence sufficiently supports freezing this obstacle.
* **Reject:** Evidence proves this obstacle is incorrect.
* **Needs Human:** All available evidence has been examined, and evidence remains insufficient or conflicting.

☐ **Evidence Supporting That Decision**

List all evidence sources that support the final decision.

Explain how the evidence justifies the decision.

If confidence is mentioned, it must appear **after** the evidence, never before.

---

# 5. Decision Rules

Decisions are determined by **evidence quality**, not confidence thresholds.

## Decision: Frozen

**Condition:**

Evidence sufficiently supports one conclusion.

**Requirements:**

* All mandatory checklist items have been verified.
* No frozen contract forbids this obstacle.
* Dictionary, POS, grammar, and subtitle evidence align consistently.
* Any conflicting evidence has been resolved or is minor.
* The obstacle meets all frozen quality standards (e.g., P0-5C New Learning Value Principle).

**Confidence role:**

Confidence may be recorded as supplementary information, but it is not required for freezing.

High confidence without evidence does not justify freezing.

Low confidence with strong evidence may still justify freezing.

## Decision: Reject

**Condition:**

Evidence proves the draft is incorrect.

**Examples:**

* The obstacle violates a frozen contract (e.g., Comprehension Obstacle duplicates Vocabulary Obstacle, violating P0-5C).
* The dictionary definition contradicts the claimed meaning.
* The POS format does not match the frozen POS specification.
* The marker boundary does not align with the English subtitle text.
* The obstacle provides no new learning value (violates P0-5C New Learning Value Principle).

**Requirements:**

* At least one piece of evidence definitively proves the obstacle is wrong.
* The rejection reason must be explicit and verifiable.

**Confidence role:**

Confidence is irrelevant when evidence proves the obstacle incorrect.

Even if the model is highly confident, strong evidence of incorrectness overrides confidence.

## Decision: Needs Human

**Condition:**

All available evidence has been examined.

Evidence is still insufficient or conflicting.

**Examples:**

* Dictionary provides two equally plausible meanings, and neither the English subtitle nor the Chinese subtitle disambiguates.
* Grammar could support two interpretations, and dialogue context does not clarify.
* Chinese subtitle suggests one interpretation, but English subtitle suggests another, and both are linguistically valid.
* Scene meaning (when available) conflicts with dictionary meaning, and both have reasonable support.

**Requirements:**

* All mandatory checklist items have been verified.
* All available evidence sources have been consulted.
* No single interpretation is clearly stronger than the alternatives.
* The ambiguity or conflict cannot be resolved by AI Review alone.

**Confidence role:**

Confidence cannot resolve genuine ambiguity.

If evidence is insufficient, confidence does not make it sufficient.

Escalating to human review is the correct decision when evidence is genuinely ambiguous, regardless of confidence.

Human Review is the final escalation path, not the default uncertainty path.

A decision must not be routed to Needs Human simply because the model feels uncertain; it must be routed there only after all available evidence has genuinely been examined and found insufficient or conflicting.

---

# 6. AI Review Output Requirements

Every AI Review result must include the following fields.

The required output order is:

```text
Decision
Evidence Chain
Reasoning
Optional Confidence
```

The Evidence Chain is the primary review artifact. It is the durable record that makes a decision traceable (Section 2B) and reproducible (Section 2C). A review result whose Evidence Chain is missing or incomplete is not a valid review result, even if a Decision is present.

## Required Fields

### Decision

**Type:** String (enum)

**Values:** `"frozen"`, `"reject"`, `"needs_human"`

**Rule:** Must match one of the three decision rules in Section 5.

### Evidence

**Type:** Object or Array

This field constitutes the **Evidence Chain** — the primary review artifact. For each evidence source, it should record the availability state (Not Available, Checked, Accepted, Rejected) per Section 4, so the decision can be reconstructed from the Evidence Chain alone.

**Contents:**

* Frozen contracts consulted (if any)
* Dictionary definitions cited
* POS specifications verified
* Grammar rules applied
* English subtitle text referenced
* Chinese subtitle interpretation (if available)
* Scene meaning context (if available)
* Dialogue context examined
* Expression knowledge applied

**Rule:** Must list all evidence sources consulted, not just the evidence supporting the decision.

### Reasoning

**Type:** String

**Contents:**

* Explanation of how the evidence supports the decision
* Handling of conflicting evidence (if any)
* Why this decision is justified despite ambiguity (if applicable)

**Rule:** Reasoning must be explicit, step-by-step, and traceable back to evidence sources.

### Optional: Confidence

**Type:** Number (0.0 to 1.0) or String ("high", "medium", "low")

**Contents:**

* Model's internal confidence score or certainty estimate

**Rule:** Confidence must always appear **after** the reasoning, never before.

**Correct order:**

```
Decision: frozen
Evidence: [dictionary, POS, English subtitle, Chinese subtitle]
Reasoning: The dictionary confirms meaning A, the POS matches the frozen format, the English subtitle supports interpretation A, and the Chinese subtitle aligns with interpretation A. Therefore, freezing is justified.
Confidence: high
```

**Incorrect order:**

```
Confidence: high
Decision: frozen
Reasoning: The model is confident, so we freeze this obstacle.
```

---

# 7. Future Compatibility

## Scene Meaning Layer

The Scene Meaning Layer is a future evidence source for AI Review.

**Purpose:**

Provide the overall contextual meaning of each subtitle line within the scene.

**Scope:**

Scene meaning is distinct from:

* `sentenceMeaning` (meaning of a **word** in the sentence — Vocabulary Obstacle responsibility)
* `source_zh` (Chinese **translation** of the subtitle line)
* `actual` (actual meaning of an **expression** — Comprehension Obstacle responsibility)

Scene meaning explains:

* What is happening in the scene at this moment
* What the speaker's intent is
* What emotional tone or pragmatic effect the line conveys
* What background context is required to understand the line

**Example:**

| Subtitle | sentenceMeaning (word) | source_zh (translation) | sceneMeaning (scene context) |
|----------|------------------------|-------------------------|------------------------------|
| "Can you believe our little lamb is finally getting married?" | "lamb" = innocent person | "你能相信我们的小羊羔终于要嫁人了吗" | Mother expressing affectionate surprise/disbelief that her daughter is getting married; uses endearing language reflecting parental tenderness at a major life event. |

**Scene Meaning is an Evidence Source, Not Runtime Data**

Scene meaning is **not** obstacle data.

Scene meaning is **not** Runtime data.

Scene meaning is **not** displayed in the UI.

Scene meaning is an **evidence source** that helps AI Review determine:

* Whether a word/expression creates a real learning obstacle in this scene
* Whether the obstacle boundary is correct
* Whether the sentence meaning is accurate
* Whether a Comprehension Obstacle provides new learning value (P0-5C)

**Integration:**

When the Scene Meaning Layer becomes available, AI Review must add it to the mandatory evidence checklist (Section 4).

Scene meaning will be Level 5 evidence (higher than dialogue context, lower than Chinese subtitle).

---

# 8. Non-Goals

This document explicitly defines what this freeze **does not** cover.

## This Freeze Affects

* Analyze Engine
* AI Review
* AI Draft Generation
* Validation stages
* Review decision rules
* Future AI vendor benchmarks
* Future content factory production

## This Freeze Does NOT Affect

* **Runtime behavior**

Runtime is a read-only consumer. This freeze does not define how Runtime validates, loads, or renders obstacles.

* **UI**

This freeze does not define how obstacles are displayed, styled, or interacted with in the user interface.

* **Obstacle JSON schema**

This freeze does not define the obstacle data contract. Refer to existing data contract freeze documents for schema definitions.

* **API contracts**

This freeze does not define API endpoints, request/response formats, or network protocols.

* **Model selection**

This freeze does not mandate which AI model (Claude, GPT, Qwen, etc.) must be used for AI Review. The evidence-based review architecture is model-agnostic.

* **Prompt engineering**

This freeze does not define specific prompts, prompt templates, or prompt chaining strategies. It defines the **architectural principles** that prompts must follow, not the prompts themselves.

## This Freeze Defines

This freeze defines the **evidence-based review architecture** for the Analyze Pipeline.

It is an **architecture contract**, not an implementation contract.

It defines **what evidence sources must be consulted** and **how decisions must be justified**, not how the AI Review system is implemented.

Future AI Review implementations must comply with this architecture, regardless of:

* Programming language
* AI model vendor
* Deployment environment
* Implementation details

This freeze is intended to be a **long-term architecture constitution**, not a temporary design note.

---

# Final Frozen Statement

P0-6A establishes the permanent evidence-based review architecture for the Analyze Pipeline.

AI Review does **not** decide based on confidence.

AI Review decides based on evidence.

Confidence may be recorded as supplementary information, but confidence alone must **never** determine Frozen, Reject, or Needs Human.

Every decision must be grounded in explicit, verifiable evidence.

Every decision must be explainable.

Evidence priority is frozen:

1. Frozen Contracts (highest)
2. Dictionary, Grammar, POS, Vocabulary Rules
3. English Subtitle
4. Chinese Subtitle
5. Scene Meaning Layer (future)
6. Dialogue Context
7. Expression / Language Knowledge
8. Model Internal Confidence (lowest)

The evidence collection checklist is mandatory.

Skipping steps is not allowed.

This architecture is model-agnostic, implementation-agnostic, and intended to govern all future Analyze Pipeline AI Review implementations.

Unless superseded by a future officially approved Freeze, this document shall remain the governing architecture for AI Review evidence rules.

---

**End of P0-6A AI Review Evidence Rules Freeze**

Version: Final V1.0

Status: FROZEN

===== END OF DOCUMENT =====

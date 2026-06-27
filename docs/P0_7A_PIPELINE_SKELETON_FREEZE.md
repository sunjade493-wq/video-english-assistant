# P0-7A Pipeline Skeleton Freeze

Status: **FROZEN**

Version: **Final V1.0**

---

# Architecture Philosophy

The Analyze Pipeline does not invent intelligence.

It connects frozen engines.

Every engine referenced by this skeleton has already been frozen by a prior architecture document.

P0-7A does not redesign any engine.

P0-7A defines only how the frozen engines are connected, in what order they run, what each stage consumes, and what each stage produces.

The pipeline is a wiring contract, not an algorithm.

It establishes the first complete end-to-end skeleton from raw subtitle input to a Runtime-consumable frozen artifact, while preserving every existing frozen boundary.

---

# 1. Purpose

This document freezes the first complete Analyze Pipeline Skeleton.

It defines:

* Pipeline responsibilities
* Pipeline execution order
* Engine boundaries
* Data flow
* Input / Output contract between engines
* Future batch compatibility

It does **not** define:

* algorithms
* prompts
* model selection
* obstacle schema
* Runtime behavior
* UI behavior

The purpose is to establish a stable connective structure so that frozen engines can be composed into a repeatable, end-to-end pipeline without redesigning any engine.

---

# 2. Reused Frozen Architecture

P0-7A reuses, and must not redesign, the following frozen engines and contracts.

## Scene Meaning Engine

Source: `docs/P0_6B_SCENE_MEANING_ENGINE_FREEZE.md`

Establishes the contextual understanding of each subtitle line. Produces evidence only. Owns one Scene Meaning per subtitle.

## Evidence Engine

Source: `docs/P0_6A_AI_REVIEW_EVIDENCE_RULES_FREEZE.md`

Provides Evidence Collection, Validation, Prioritization, Traceability, and Reproducibility. Every decision-making stage reasons through the Evidence Engine.

## Vocabulary Engine

Sources: `docs/P0_VOCABULARY_LEVEL_DETERMINATION_CONTRACT_FREEZE.md` and related vocabulary freeze documents.

Determines vocabulary obstacles using the frozen hierarchical level-determination contract.

## Comprehension Engine

Sources: `docs/P0_COMPREHENSION_OBSTACLE_DETERMINATION_CONTRACT_FREEZE.md` and `docs/P0_5C_COMPREHENSION_OBSTACLE_PHILOSOPHY_FREEZE.md`

Determines comprehension obstacles using the frozen comprehension boundary and New Learning Value Principle.

## AI Review

Source: `docs/P0_6A_AI_REVIEW_EVIDENCE_RULES_FREEZE.md`

Evidence-driven decision engine. Produces Frozen / Reject / Needs Human decisions justified by an Evidence Chain.

## Analyze / Runtime Boundary

Sources: `docs/P0_ANALYZE_PROMPT_CONTRACT_FREEZE.md`, `docs/P0_4A_PILOT_ASSET_CONTRACT_FREEZE.md`, and the Runtime promotion contracts.

Defines the draft → frozen → runtime promotion boundary and the Runtime read-only principle.

P0-7A connects these engines. It does not modify them.

---

# 3. Pipeline Responsibilities

The Analyze Pipeline is responsible for:

* Accepting subtitle input for a defined scope.
* Establishing contextual understanding before analysis.
* Collecting evidence before any decision.
* Generating draft obstacles from frozen engine logic.
* Reviewing draft obstacles through evidence-driven AI Review.
* Routing review outcomes (Frozen / Reject / Needs Human).
* Promoting only approved, frozen obstacles toward Runtime consumption.

The Analyze Pipeline is **not** responsible for:

* Runtime rendering
* UI behavior
* Marker coordinate generation
* Inventing new engine logic
* Overriding any frozen contract

---

# 4. Pipeline Execution Order

The skeleton defines the following frozen execution order.

```text
Subtitle Input (scoped)
↓
Scene Meaning Engine        (context understanding — evidence)
↓
Evidence Collection         (Evidence Engine assembles all evidence)
↓
Vocabulary Engine           (vocabulary obstacle candidates)
Comprehension Engine        (comprehension obstacle candidates)
↓
Draft Obstacle Assembly     (combine candidates into draft)
↓
AI Review                   (evidence-driven decision per obstacle)
↓
Decision Routing            (Frozen / Reject / Needs Human)
↓
Human Review                (only for Needs Human items)
↓
Frozen Promotion            (approved obstacles only)
↓
Runtime Promotion           (frozen → runtime-consumable artifact)
```

## Ordering Rules

1. Scene Meaning must be established before Evidence Collection.
2. Evidence Collection must complete before Vocabulary or Comprehension analysis reasons toward a decision (per P0-6A Evidence Completeness Rule).
3. Vocabulary Engine and Comprehension Engine operate on the same shared Scene Meaning and evidence.
4. AI Review must not begin until draft obstacles and their Evidence Chains are assembled.
5. Human Review is the final escalation path, entered only for Needs Human items.
6. Frozen Promotion may promote only approved obstacles.
7. Runtime Promotion is the only stage that produces a Runtime-consumable artifact.

The order is frozen. Stages must not be reordered or skipped.

---

# 5. Engine Boundaries

Each engine owns a single responsibility and must not absorb another engine's responsibility.

| Engine | Owns | Must Not |
|--------|------|----------|
| Scene Meaning Engine | Contextual understanding per subtitle | Decide obstacles |
| Evidence Engine | Evidence collection, prioritization, traceability | Decide obstacles by itself |
| Vocabulary Engine | Vocabulary obstacle determination | Decide comprehension obstacles |
| Comprehension Engine | Comprehension obstacle determination | Duplicate vocabulary obstacles |
| AI Review | Evidence-driven decisions | Generate obstacles or invent evidence |
| Promotion stages | Moving approved data toward Runtime | Modify obstacle meaning |

No engine may bypass the Evidence Engine.

No engine may write Runtime data directly.

---

# 6. Data Flow

The skeleton defines a one-directional data flow.

```text
Subtitle
→ Scene Meaning (evidence)
→ Evidence Chain (assembled evidence)
→ Draft Obstacles (vocabulary + comprehension candidates)
→ Reviewed Obstacles (AI Review decisions)
→ Frozen Obstacles (approved only)
→ Runtime Obstacles (runtime-consumable)
```

## Flow Rules

* Data flows forward only.
* A downstream stage never mutates an upstream artifact.
* Each stage produces a new artifact rather than overwriting prior artifacts.
* Scene Meaning is shared evidence, consumed by multiple stages, owned by the subtitle.
* Draft artifacts are never consumed by Runtime.
* Only the Runtime Promotion stage produces a Runtime-consumable artifact.

---

# 7. Input / Output Contract Between Engines

This section freezes the conceptual contract between stages.

It does **not** freeze field-level schemas; those are defined by their own contracts.

## Scene Meaning Engine

* **Input:** scoped subtitle line + surrounding dialogue context.
* **Output:** Scene Meaning evidence (one per subtitle).

## Evidence Engine (Evidence Collection)

* **Input:** subtitle, Scene Meaning, frozen contracts, dictionary/grammar/POS rules, English subtitle, Chinese subtitle (if available), dialogue context.
* **Output:** a completed Evidence Chain per analysis unit.

## Vocabulary Engine

* **Input:** Evidence Chain + Scene Meaning.
* **Output:** vocabulary obstacle candidates.

## Comprehension Engine

* **Input:** Evidence Chain + Scene Meaning.
* **Output:** comprehension obstacle candidates.

## Draft Obstacle Assembly

* **Input:** vocabulary candidates + comprehension candidates.
* **Output:** draft obstacle set with attached Evidence Chains.

## AI Review

* **Input:** draft obstacle + its Evidence Chain.
* **Output:** decision (Frozen / Reject / Needs Human) + Evidence Chain + reasoning.

## Human Review

* **Input:** Needs Human items + Evidence Chains.
* **Output:** resolved review decisions.

## Frozen Promotion

* **Input:** approved reviewed obstacles.
* **Output:** frozen artifact (`reviewStatus: frozen`, not Runtime-consumable).

## Runtime Promotion

* **Input:** frozen artifact.
* **Output:** Runtime-consumable artifact (`runtimeMayConsume: true`).

Each contract is conceptual. Existing field-level contracts remain authoritative.

---

# 8. Promotion Boundary

The skeleton preserves the existing promotion boundary.

* Draft artifacts must never be consumed by Runtime.
* Only reviewed and approved obstacles may be promoted to frozen.
* `runtimeMayConsume` becomes `true` only in the Runtime artifact, never in the frozen artifact.
* Frozen source artifacts remain unchanged when a Runtime artifact is produced.

This boundary is consistent with the P0-4 / P0-5 promotion contracts and must not be weakened by the pipeline skeleton.

---

# 9. Runtime Boundary

Runtime does not participate in any pipeline stage.

Runtime must never:

* run Scene Meaning
* run Evidence Collection
* run Vocabulary or Comprehension analysis
* run AI Review
* perform promotion
* generate, infer, normalize, or repair obstacle data

Runtime remains a read-only consumer of the final Runtime-consumable artifact.

Analyze generates. Runtime consumes.

---

# 10. Future Batch Compatibility

The skeleton is designed to scale from a single scope to batch processing.

* The same stage order applies to one subtitle, one scene, one episode, or many episodes.
* Each subtitle still owns one Scene Meaning under batch execution.
* Each obstacle still passes through Evidence Collection, AI Review, and promotion.
* Batch execution must not skip stages or bypass the Evidence Engine.
* Batch execution must preserve traceability and reproducibility per P0-6A.

Batch scaling is a volume change, not an architecture change. The skeleton remains identical.

---

# 11. Non-Goals

This document does **not** define:

* algorithms for any engine
* prompts or prompt templates
* AI model vendor or model selection
* obstacle JSON schema
* marker / coordinate generation
* Runtime behavior
* UI behavior
* batch execution implementation details
* any redesign of a previously frozen engine

This document freezes the pipeline skeleton only.

---

# Final Frozen Statement

P0-7A establishes the first complete Analyze Pipeline Skeleton.

The pipeline connects frozen engines; it does not invent or redesign them.

Execution order is frozen:

```text
Subtitle → Scene Meaning → Evidence Collection → Vocabulary + Comprehension → Draft Assembly → AI Review → Decision Routing → Human Review → Frozen Promotion → Runtime Promotion
```

Data flows forward only. No stage mutates an upstream artifact. Draft data never reaches Runtime. Only Runtime Promotion produces a Runtime-consumable artifact.

Runtime never participates. Analyze generates; Runtime consumes.

This freeze is consistent with:

* CLAUDE.md (Repository Evidence First, Frozen Contract First, Runtime Read-only, Analyze Generates / Runtime Consumes)
* P0-5C Comprehension Obstacle Philosophy
* P0-6A AI Review Evidence Engine Architecture
* P0-6B Scene Meaning Engine Architecture

Unless superseded by a future officially approved Freeze, this document shall remain the governing architecture for the Analyze Pipeline Skeleton.

---

**End of P0-7A Pipeline Skeleton Freeze**

Version: Final V1.0

Status: FROZEN

===== END OF DOCUMENT =====

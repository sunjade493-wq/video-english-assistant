# P0-7B Artifact Pipeline Freeze

Status: **FROZEN**

Version: **Final V1.0**

---

# Architecture Philosophy

The Analyze Pipeline is driven by Artifact Contracts.

Each stage is responsible for producing one Artifact.

The Artifact Contract defines the responsibility of that stage.

AI models are implementations.

Artifacts are architecture.

P0-7A froze how stages are wired together. P0-7B freezes what each stage must produce.

The pipeline is therefore Artifact-driven, not Engine-driven. A stage is defined by the Artifact it owns, not by the model, prompt, or algorithm that produces it.

---

# 1. Why Artifact First

An Engine-driven architecture binds the pipeline to specific implementations. When the engine changes, the architecture is disturbed.

An Artifact-driven architecture binds the pipeline to stable contracts. The implementation may change freely as long as it produces a conforming Artifact.

## Reasons

* **Stability.** Artifacts outlive engines. A frozen Artifact Contract remains valid even when its producer is rewritten.
* **Substitutability.** Any producer that emits a conforming Artifact can replace the previous producer without disturbing downstream stages.
* **Traceability.** Each Artifact is an inspectable record, enabling reconstruction of how a result was reached.
* **Reproducibility.** Given identical upstream Artifacts, a stage should produce an equivalent Artifact.
* **Composability.** Stages connect through Artifacts, not through internal engine state, so the pipeline can be assembled, replayed, and tested stage by stage.

Artifact First means the architecture commits to the contract of each stage's output, not to the method of producing it.

---

# 2. Artifact Lifecycle

Every Artifact moves through the same conceptual lifecycle.

```text
Produced
↓
Validated
↓
Consumed
↓
Retained (for traceability)
```

## Lifecycle Rules

* **Produced.** Exactly one stage produces each Artifact.
* **Validated.** An Artifact is checked against its contract before downstream consumption.
* **Consumed.** Downstream stages read the Artifact as input.
* **Retained.** Artifacts are retained so the decision path remains reconstructable.

An Artifact that has not been validated must not be consumed downstream.

---

# 3. Artifact Ownership

Each Artifact has exactly one owning stage.

* One stage owns one Artifact type.
* Ownership means responsibility for producing that Artifact according to its contract.
* No stage may produce an Artifact it does not own.
* No stage may overwrite an Artifact owned by another stage.
* Many downstream stages may consume an Artifact, but only one stage owns it.

Ownership is exclusive for production and shared for consumption.

---

# 4. Artifact Dependency Rules

Artifacts form a one-directional dependency chain.

* Each Artifact depends only on Artifacts produced upstream.
* No Artifact may depend on a downstream Artifact.
* A stage may not begin producing its Artifact until all required upstream Artifacts are produced and validated.
* A downstream Artifact never mutates an upstream Artifact; it references it.
* Circular dependencies are forbidden.

This preserves the forward-only data flow frozen by P0-7A.

---

# 5. Required Pipeline Artifacts

The Artifact chain is frozen as follows.

```text
Subtitle Artifact
↓
Scene Meaning Artifact
↓
Evidence Artifact
↓
Draft Obstacle Artifact
↓
Review Artifact
↓
Frozen Artifact
↓
Runtime Artifact
```

Each Artifact below defines only Purpose, Owner, Inputs, Outputs, and Downstream Consumer. No implementation is defined.

## 5.1 Subtitle Artifact

* **Purpose:** Provide the scoped subtitle input that the pipeline operates on.
* **Owner:** Subtitle input stage.
* **Inputs:** Source subtitle data within the defined scope.
* **Outputs:** A scoped subtitle record (English, Chinese if available, timing, ordering).
* **Downstream Consumer:** Scene Meaning Artifact stage.

## 5.2 Scene Meaning Artifact

* **Purpose:** Capture the contextual understanding of each subtitle line.
* **Owner:** Scene Meaning Engine (per P0-6B).
* **Inputs:** Subtitle Artifact + surrounding dialogue context.
* **Outputs:** One Scene Meaning per subtitle, as contextual evidence.
* **Downstream Consumer:** Evidence Artifact stage.

## 5.3 Evidence Artifact

* **Purpose:** Assemble all collected evidence into a complete Evidence Chain.
* **Owner:** Evidence Engine (per P0-6A).
* **Inputs:** Subtitle Artifact, Scene Meaning Artifact, frozen contracts, dictionary/grammar/POS rules, dialogue context.
* **Outputs:** A validated, prioritized, traceable Evidence Chain.
* **Downstream Consumer:** Draft Obstacle Artifact stage (Vocabulary and Comprehension Engines).

## 5.4 Draft Obstacle Artifact

* **Purpose:** Hold draft obstacle candidates with their attached Evidence Chains.
* **Owner:** Draft Obstacle Assembly stage (consuming Vocabulary Engine and Comprehension Engine outputs).
* **Inputs:** Evidence Artifact + Scene Meaning Artifact.
* **Outputs:** Draft obstacle set (vocabulary + comprehension candidates) with evidence attached.
* **Downstream Consumer:** Review Artifact stage (AI Review).

## 5.5 Review Artifact

* **Purpose:** Record the evidence-driven decision for each draft obstacle.
* **Owner:** AI Review (per P0-6A), with Human Review resolving Needs Human items.
* **Inputs:** Draft Obstacle Artifact + its Evidence Chains.
* **Outputs:** Per-obstacle decision (Frozen / Reject / Needs Human) with Evidence Chain and reasoning.
* **Downstream Consumer:** Frozen Artifact stage.

## 5.6 Frozen Artifact

* **Purpose:** Hold approved obstacles promoted to frozen status.
* **Owner:** Frozen Promotion stage.
* **Inputs:** Review Artifact (approved obstacles only).
* **Outputs:** Frozen obstacle set (`reviewStatus: frozen`, not Runtime-consumable).
* **Downstream Consumer:** Runtime Artifact stage.

## 5.7 Runtime Artifact

* **Purpose:** Provide the Runtime-consumable obstacle set.
* **Owner:** Runtime Promotion stage.
* **Inputs:** Frozen Artifact.
* **Outputs:** Runtime-consumable artifact (`runtimeMayConsume: true`).
* **Downstream Consumer:** Runtime (read-only consumption only).

The Frozen Artifact is never modified when the Runtime Artifact is produced.

---

# 6. Artifact Principles

The following principles are frozen for every Artifact.

## Immutable After Production

Once produced and validated, an Artifact is not mutated. Corrections produce a new Artifact rather than editing an existing one.

## Reproducible

Given identical upstream Artifacts and identical rules, a stage should produce an equivalent Artifact. Model randomness alone must not change the Artifact.

## Traceable

Every Artifact must be reconstructable: it must be possible to determine what inputs produced it and why.

## Replaceable Producer

The producer of an Artifact may be replaced — different engine, model, vendor, or method — as long as the new producer emits a conforming Artifact.

## Stable Contract

The Artifact Contract is stable. Downstream stages depend on the contract, not on the producer's internals.

---

# 7. Engines Change, Artifacts Endure

Engines may change.

AI vendors may change.

Prompts may change.

Models may be replaced.

Algorithms may be rewritten.

Artifact Contracts must remain stable.

This separation is the core guarantee of P0-7B: the architecture is anchored to Artifact Contracts, so implementation churn does not destabilize the pipeline. A stage's identity is its Artifact, not its implementation.

---

# 8. Why Artifact-First Architecture Enables Scale

The Artifact-driven architecture directly enables:

* **Batch production.** Each Artifact stage applies uniformly across one subtitle or many episodes; batch is a volume change, not an architecture change.
* **Multi-model support.** Any model that produces a conforming Artifact can be used; the contract is model-agnostic.
* **Multi-show support.** New content flows through the same Artifact chain without architectural changes.
* **Replay.** Retained Artifacts allow any stage to be re-run from its upstream Artifacts.
* **Debugging.** Each Artifact is an inspectable checkpoint, isolating where an issue originated.
* **Regression testing.** Artifacts produced by a new implementation can be compared against prior Artifacts for the same inputs.
* **Future scalability.** New stages or evidence sources can be added by defining new Artifact Contracts without disturbing existing ones.

---

# 9. Runtime Boundary

Runtime does not produce any Artifact.

Runtime consumes only the Runtime Artifact.

Runtime must never:

* produce, mutate, validate, or repair any Artifact
* consume Draft Obstacle, Review, or Frozen Artifacts
* participate in any production stage

Analyze produces Artifacts. Runtime consumes the final Runtime Artifact only.

---

# 10. Non-Goals

This document does **not** define:

* JSON schema
* prompts
* API contracts
* Runtime behavior
* UI behavior
* implementation code
* model selection

This document freezes the Artifact Pipeline architecture only.

Field-level schemas and implementation contracts remain governed by their own documents and will be frozen separately.

---

# Final Frozen Statement

P0-7B establishes the Artifact Pipeline architecture.

The Analyze Pipeline is Artifact-driven. Each stage owns and produces exactly one Artifact, defined by a stable contract.

The frozen Artifact chain is:

```text
Subtitle Artifact → Scene Meaning Artifact → Evidence Artifact → Draft Obstacle Artifact → Review Artifact → Frozen Artifact → Runtime Artifact
```

Artifacts are immutable after production, reproducible, traceable, produced by replaceable producers, and governed by stable contracts.

Engines, models, vendors, and prompts may change. Artifact Contracts must remain stable.

Runtime never produces an Artifact and consumes only the Runtime Artifact.

This freeze is consistent with:

* CLAUDE.md (Repository Evidence First, Frozen Contract First, Runtime Read-only, Analyze Generates / Runtime Consumes)
* P0-6A AI Review Evidence Engine Architecture
* P0-6B Scene Meaning Engine Architecture
* P0-7A Pipeline Skeleton Architecture

Unless superseded by a future officially approved Freeze, this document shall remain the governing architecture for the Artifact Pipeline.

---

**End of P0-7B Artifact Pipeline Freeze**

Version: Final V1.0

Status: FROZEN

===== END OF DOCUMENT =====

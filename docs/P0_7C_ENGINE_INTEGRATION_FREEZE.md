# P0-7C Engine Integration Freeze

Status: **FROZEN**

Version: **Final V1.0**

---

# Architecture Philosophy

Artifact Contracts define what is produced.

Engine Integration defines how producers collaborate.

Each Engine has one responsibility.

Each Engine communicates only through frozen Artifacts.

No Engine may bypass another Engine's Artifact.

P0-7A froze the stage order. P0-7B froze the Artifacts each stage produces. P0-7C freezes how the Engines that produce those Artifacts are allowed to collaborate.

This document defines wiring only. It does not define algorithms, prompts, or implementations.

---

# 1. Engine Responsibilities

Each Engine owns exactly one responsibility and produces exactly one Artifact (per P0-7B).

## Scene Meaning Engine

Establishes the contextual understanding of each subtitle line. Produces the Scene Meaning Artifact. Produces evidence only; never decides obstacles.

## Evidence Engine

Collects, validates, prioritizes, and records evidence. Produces the Evidence Artifact (the Evidence Chain). Provides the shared reasoning substrate; never decides obstacles by itself.

## Vocabulary Engine

Determines vocabulary obstacle candidates using the frozen vocabulary level-determination contract. Contributes to the Draft Obstacle Artifact. Never decides comprehension obstacles.

## Comprehension Engine

Determines comprehension obstacle candidates using the frozen comprehension boundary and New Learning Value Principle. Contributes to the Draft Obstacle Artifact. Never duplicates vocabulary obstacles.

## AI Review

Makes evidence-driven decisions (Frozen / Reject / Needs Human) for each draft obstacle. Produces the Review Artifact. Never generates obstacles or invents evidence.

## Human Review

Resolves only Needs Human items escalated by AI Review. Contributes resolved decisions to the Review Artifact. The final escalation path, not the default path.

## Frozen Promotion

Promotes approved obstacles to frozen status. Produces the Frozen Artifact. Promotes approved obstacles only; never includes rejected or needs-edit items.

## Runtime Promotion

Produces the Runtime-consumable artifact from the Frozen Artifact. Produces the Runtime Artifact. Sets `runtimeMayConsume: true` only in the Runtime Artifact, never in the Frozen Artifact.

---

# 2. Engine Inputs

| Engine | Inputs (Artifacts consumed) |
|--------|------------------------------|
| Scene Meaning Engine | Subtitle Artifact + surrounding dialogue context |
| Evidence Engine | Subtitle Artifact, Scene Meaning Artifact, frozen contracts, dictionary/grammar/POS rules, dialogue context |
| Vocabulary Engine | Evidence Artifact + Scene Meaning Artifact |
| Comprehension Engine | Evidence Artifact + Scene Meaning Artifact |
| AI Review | Draft Obstacle Artifact + attached Evidence Chains |
| Human Review | Review Artifact (Needs Human items) + Evidence Chains |
| Frozen Promotion | Review Artifact (approved obstacles only) |
| Runtime Promotion | Frozen Artifact |

An Engine consumes only Artifacts produced upstream of it.

---

# 3. Engine Outputs

| Engine | Output Artifact |
|--------|-----------------|
| Scene Meaning Engine | Scene Meaning Artifact |
| Evidence Engine | Evidence Artifact |
| Vocabulary Engine | Vocabulary obstacle candidates (into Draft Obstacle Artifact) |
| Comprehension Engine | Comprehension obstacle candidates (into Draft Obstacle Artifact) |
| AI Review | Review Artifact |
| Human Review | Resolved decisions (into Review Artifact) |
| Frozen Promotion | Frozen Artifact |
| Runtime Promotion | Runtime Artifact |

Each Engine produces only the Artifact it owns.

---

# 4. Engine Dependency Rules

* An Engine may begin only after all required upstream Artifacts are produced and validated.
* Dependencies are forward-only; no Engine depends on a downstream Engine.
* The Vocabulary Engine and Comprehension Engine depend on the same Evidence Artifact and Scene Meaning Artifact.
* AI Review depends on a fully assembled Draft Obstacle Artifact.
* Human Review depends only on Needs Human items within the Review Artifact.
* Frozen Promotion depends on approved items within the Review Artifact.
* Runtime Promotion depends on the Frozen Artifact.
* Circular dependencies are forbidden.

---

# 5. Allowed Communication

* Engines communicate exclusively by producing and consuming frozen Artifacts.
* An Engine reads upstream Artifacts as read-only input.
* Multiple Engines may consume the same upstream Artifact (e.g., both Vocabulary and Comprehension Engines consume the Evidence Artifact and Scene Meaning Artifact).
* All evidence-dependent reasoning passes through the Evidence Engine.

Communication is Artifact-mediated only. There is no direct engine-to-engine invocation outside the Artifact chain.

---

# 6. Forbidden Communication

* No Engine may bypass another Engine's Artifact.
* No Engine may modify an upstream Artifact.
* The Vocabulary Engine cannot call Runtime.
* The Comprehension Engine cannot call Runtime.
* AI Review cannot regenerate Scene Meaning.
* AI Review cannot invent evidence outside the Evidence Engine.
* No Engine may bypass the Evidence Engine to reason from raw sources directly when an Evidence Artifact is required.
* Runtime never invokes any Analyze Engine.
* No Analyze Engine is invoked by, or runs inside, Runtime.
* No downstream Engine reaches back to mutate or re-run an upstream Engine's Artifact in place.

---

# 7. Artifact Consumption Rules

* Artifacts are consumed read-only.
* An Engine must not consume an Artifact that has not been validated.
* An Engine must not consume a downstream Artifact.
* Draft Obstacle, Review, and Frozen Artifacts are never consumed by Runtime.
* Only the Runtime Artifact is consumed by Runtime.
* Consuming an Artifact never alters it; a consuming Engine produces a new Artifact instead.

---

# 8. Failure Propagation

* If an Engine cannot produce a valid Artifact, the pipeline must not fabricate one downstream.
* A failed or invalid Artifact halts forward progress for the affected unit; downstream Engines must not consume it.
* Failures must be recorded so the failure point is traceable (consistent with P0-6A traceability).
* Failure in one analysis unit must not silently corrupt other units.
* The Runtime read-only boundary is preserved on failure: failure in any Analyze Engine never causes Runtime to participate or to consume non-Runtime Artifacts.
* This freeze does not define fail-open or fail-closed Runtime behavior; that is governed by existing Runtime promotion and opt-in contracts.

---

# 9. Retry Rules

* A retry re-runs an Engine from its upstream Artifacts.
* A retry must not mutate the upstream Artifacts it reads.
* A retry produces a new Artifact rather than editing a prior one (consistent with P0-7B immutability).
* Retries must remain reproducible: identical upstream Artifacts and rules should yield an equivalent Artifact.
* Retrying a downstream Engine must not trigger regeneration of an upstream Artifact unless that upstream Artifact is itself explicitly re-produced from its own inputs.

---

# 10. Future Parallel Execution Compatibility

* Engines that share the same upstream Artifacts and do not depend on each other may run in parallel.
* The Vocabulary Engine and Comprehension Engine may execute in parallel because both consume the same upstream Artifacts and neither depends on the other.
* Parallel execution must preserve forward-only dependencies and Artifact immutability.
* Parallel execution must not allow two Engines to write the same Artifact.
* Parallel execution is a performance optimization, not an architecture change; the Engine Integration Contract remains identical.

---

# 11. Non-Goals

This document does **not** define:

* JSON schema
* prompts
* API contracts
* Runtime behavior
* UI behavior
* implementation code
* model selection
* algorithms for any Engine

This document freezes the Engine Integration Contract only.

---

# Final Frozen Statement

P0-7C establishes the Engine Integration Contract for the Analyze Pipeline.

Engines collaborate exclusively through frozen Artifacts. Each Engine has one responsibility, consumes only upstream Artifacts, and produces only the Artifact it owns.

No Engine bypasses another Engine's Artifact. No Engine modifies an upstream Artifact. Runtime never invokes any Analyze Engine, and no Analyze Engine runs inside Runtime.

Failures halt forward progress for the affected unit and remain traceable. Retries re-run from upstream Artifacts and produce new Artifacts without mutating prior ones. Independent Engines sharing the same upstream Artifacts may run in parallel without changing the contract.

This freeze is consistent with:

* CLAUDE.md (Repository Evidence First, Frozen Contract First, Runtime Read-only, Analyze Generates / Runtime Consumes)
* P0-6A AI Review Evidence Engine Architecture
* P0-6B Scene Meaning Engine Architecture
* P0-7A Pipeline Skeleton Architecture
* P0-7B Artifact Pipeline Architecture

Unless superseded by a future officially approved Freeze, this document shall remain the governing architecture for Engine Integration.

---

**End of P0-7C Engine Integration Freeze**

Version: Final V1.0

Status: FROZEN

===== END OF DOCUMENT =====

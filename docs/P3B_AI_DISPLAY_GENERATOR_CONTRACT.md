# P3-B AI Display Generator Contract

Status: **FROZEN**

Version: **Final V1.0**

This document freezes the contract for Real Offline AI Display Field Generation before implementation. It governs the P3-B stage of the Runtime Candidate display-field pipeline and must be respected by the implementation that follows.

---

## 1. Stage Name

**P3-B Offline AI Display Field Generation REAL**

This is the first stage that performs real offline AI generation of display fields (no longer a probe or skeleton). It follows P3-A (generator skeleton) and precedes P3-C (review) and P3-D (review-gated promotion).

---

## 2. Purpose

- Generate user-facing display fields for Runtime Candidate records.
- Offline only — generation happens in the offline Analyze Pipeline, never at Runtime.
- Human review required — all generated display fields are drafts pending human review.
- Runtime remains read-only — Runtime never generates, infers, or enriches display fields.

---

## 3. AI Model

- **Provider:** Qwen / DashScope OpenAI-compatible API.
- **model:** `qwen-plus`
- **temperature:** `0`
- **response_format:** `json_object`
- **Failure mode:** fail closed on invalid JSON. Any invalid, missing, or unparseable JSON response produces zero drafts for the affected items and does not partially apply.

No other model, provider, temperature, or response format is authorized by this contract.

---

## 4. Input Contract

Each input item provided to the generator must include:

- `runtimeCandidateId`
- `sourceDraftObstacleId` (if available)
- `type`
- `subtitleIndex`
- `source_en`
- `source_zh`
- nearby subtitle context
- upstream evidence ids (if present)

Input items must contain only the evidence needed for generation. Large uncontrolled blobs are not permitted.

---

## 5. Output JSON Contract

Top-level shape:

```json
{
  "drafts": [ ... ]
}
```

Each draft object must include:

- `runtimeCandidateId`
- `sourceDraftObstacleId`
- `type`
- `subtitleIndex`
- `source_en`
- `source_zh`
- `generatedFields`
- `generationSource`: `"qwen-plus-display-field-generator"`
- `confidence`
- `reviewStatus`: `"pending_human_review"`
- `runtimeDisplayMayConsume`: `false`

---

## 6. Vocabulary `generatedFields`

For `type === "vocabulary"`, `generatedFields` must include:

- `word`
- `phonetic`
- `partOfSpeech`
- `sentenceMeaning`

Rules:

- `word` must be the dictionary/base form.
- `phonetic` must describe the base form.
- `partOfSpeech` must follow the existing Runtime POS style.
- `sentenceMeaning` must be a short Chinese meaning for the current sentence only.

---

## 7. Comprehension `generatedFields`

For `type === "comprehension"`, `generatedFields` must include:

- `prototype` or `phrase` or `text`
- `literal`
- `actual`
- `grammar`

Rules:

- `literal` explains the surface meaning.
- `actual` explains the intended/contextual meaning.
- `grammar` explains why the meaning arises.

---

## 8. Forbidden

- No Runtime inference.
- No Runtime generation.
- No `runtimeMayConsume` true.
- No `runtimeConsumable` true.
- No placeholders: `待补充`, `unknown`, `TODO`.
- No writing generated fields into `runtime_candidate_artifact`.
- No UI changes.
- No new Runtime behavior.
- No OCR / Qwen-VL / Internet scraping.

---

## 9. Review and Promotion

- **P3-B** creates draft-only display fields.
- **P3-C** must review them.
- **P3-D** may promote only reviewed display fields.
- Runtime may consume only after review-gated promotion.

No stage may shortcut this order. Draft display fields are never consumed by Runtime directly.

---

## 10. Validation

The generator output must be validated. The following are rejected:

- Invalid JSON.
- Missing required fields.
- Placeholders (`待补充`, `unknown`, `TODO`).
- `confidence` outside `[0, 1]`.
- `runtimeDisplayMayConsume !== false`.
- `reviewStatus` not equal to `pending_human_review`.

Rejected drafts are not emitted. Validation failures fail closed.

---

## 11. Implementation Note

P3-B implementation must modify only `scripts/p1_a_analyze_pipeline_bootstrap.js` unless explicitly re-authorized.

---

## Final Frozen Statement

P3-B is the real offline AI display-field generation stage. It uses `qwen-plus` at temperature 0 with JSON-object responses, fails closed on invalid output, and produces only human-review-pending drafts. It never writes into the runtime candidate artifact, never enables Runtime consumption, and never bypasses the P3-C review / P3-D promotion gates. Runtime remains read-only throughout.

Unless superseded by a future officially approved Freeze, this document shall remain the governing contract for P3-B Offline AI Display Field Generation.

---

**End of P3-B AI Display Generator Contract**

Version: Final V1.0

Status: FROZEN

===== END OF DOCUMENT =====

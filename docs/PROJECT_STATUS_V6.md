# Video English Assistant — PROJECT_STATUS_V6

Status: Bootstrap V1.1 ✅

## Bootstrap Maintenance Rule

PROJECT_STATUS_V6.md is the bootstrap index of all frozen project knowledge.

Whenever a new document is added or updated that belongs to any of the following categories:

* freeze
* frozen
* spec
* specification
* status
* contract
* workflow
* bootstrap
* major architecture/design document

the workflow is mandatory:

1. Create or update the document.
2. Merge it.
3. Update PROJECT_STATUS_V6.md.
4. Merge the PROJECT_STATUS_V6.md update.

No exceptions.

PROJECT_STATUS_V6.md must always reflect the latest frozen repository state.

Hard safety rule for future updates:

- Do not overwrite the entire status document.
- Only append content to the specified section(s).
- Deleted lines in a PROJECT_STATUS_V6.md update must not exceed 5 lines.

Future conversations are expected to read PROJECT_STATUS_V6.md first.

Therefore:

A freeze document that is not referenced by PROJECT_STATUS_V6.md is considered an incomplete bootstrap update.

## 1. How to Use This Document

This document is the bootstrap document for future Video English Assistant conversations.

Future conversations should read this document first.

Repository evidence wins over chat memory.

This document is generated from repository freeze documents, repository code evidence, repository runtime evidence, and verified git history. It must not be treated as a replacement for the frozen documents referenced inside it.

## 2. Evidence Rules

- Repository Evidence First: repository files are authoritative. Chat memory, assistant memory, and human recollection are not authoritative project state.
- Conflict Resolution: if chat history, assistant memory, human recollection, and repository documents conflict, repository documents always win.
- Verification Rule: statements such as "I remember", "We discussed", or "I think we froze" are not freeze evidence. Freeze evidence requires repository freeze/specification documents, repository code evidence, git history, or PR history.
- Investigation First: when uncertainty exists, investigate repository evidence first, produce an investigation report, freeze conclusions, and only then update this bootstrap status document.

## 3. Single Source of Truth

Canonical repository:

GitHub main branch.

Local canonical working directory:

```text
C:\Users\10604\Desktop\video-english-assistant-github
```

Local experiment directory:

```text
C:\Users\10604\Desktop\Video_English_Assistant
```

The local experiment directory may be used only for local experiments, temporary debugging, and data validation. It must not be used as the Codex or GitHub baseline.

## 4. Long-Term Product Direction

Status: FROZEN

Source: `docs/LONG_TERM_PRODUCT_DIRECTION_FREEZE.md`

- Platform provides built-in learning materials.
- Users should not upload videos.
- Users should not upload subtitles.
- Users should not manage learning resources.
- Users choose learning content by interests and difficulty level.
- Users are not responsible for finding learning materials.
- The platform provides learning materials.
- Analyze Engine produces learning data for platform-provided content.
- Runtime consumes generated learning data and presents learning interactions.

## 5. Product Goal

Sources: `docs/V29D_DATA_CONTRACT.md`, `README.md`

The product goal is not permanent memorization, grammar mastery, or exam preparation.

The goal is to remove obstacles while watching English videos and improve comprehension, confidence, efficiency, and learning motivation.

## 6. Frozen Obstacle System

Sources: `docs/V29D_DATA_CONTRACT.md`, `Freeze_Summary.md`, `README.md`

- The obstacle system contains Vocabulary Obstacles and Comprehension Obstacles.
- Vocabulary obstacles are user-level dependent.
- Comprehension obstacles are expression-dependent and independent of vocabulary level.
- Vocabulary obstacles are prioritized before comprehension obstacles in current Learning Tips.
- Analyze Engine uses a Vocabulary Pipeline, Comprehension Pipeline, and Merge Pipeline.
- Runtime reads frozen obstacle data; users do not run obstacle detection.

## 7. Vocabulary Level System

Status: FROZEN

Sources: `docs/V29D_DATA_CONTRACT.md`, `Freeze_Summary.md`

Current frozen vocabulary levels:

- Junior High (1500)
- Senior High (3500)
- CET-4 (4500)
- CET-6 (6000)
- TEM-4 (8000)
- TEM-8 (12000)
- GRE (20000+)

Numbers are approximate coverage references only.

Do not replace this system with:

- CEFR A1/A2/B1/B2/C1/C2
- Beginner / Elementary / Intermediate
- Any unverified new vocabulary level system

## 8. Backend / Frontend Responsibility Split

Sources: `docs/V29D_DATA_CONTRACT.md`, `docs/V29F_BACKEND_VOCAB_SCHEMA_DESIGN.md`

Backend / Analyze Engine is responsible for language intelligence:

- obstacle detection
- vocabulary level filtering
- lemma restoration
- prototype abstraction
- phonetic
- partOfSpeech
- translation
- sentenceMeaning
- validation
- enrichment

Runtime / Frontend is a read-only consumer.

Frontend must not guess, infer, enrich, or fallback language intelligence fields.

## 9. Vocabulary Schema

Source: `docs/V29F_BACKEND_VOCAB_SCHEMA_DESIGN.md`

Current frozen vocab schema:

- word
- lemma
- baseForm
- phonetic
- partOfSpeech
- sentenceMeaning
- translation

## 10. Runtime Capability

Sources: `docs/V29H_RUNTIME_CAPABILITY_FREEZE.md`, `docs/V29H_POS_SPEC_FREEZE.md`, `docs/V29H_VOCAB_CARD_DISPLAY_SPEC_FREEZE.md`, `docs/V29I_VOCAB_DISPLAY_DATA_CONTRACT_FREEZE.md`, `docs/V29I_RUNTIME_FAIL_FAST_SPEC_FREEZE.md`

Runtime can load:

- `output_text/v28d_bilingual_subtitles.json`
- `output_text/v29a_obstacles.json`

Runtime can distinguish and render:

- `[vocab]`
- `[comprehension]`

Vocabulary card current capability:

- word
- baseForm optional
- phonetic
- partOfSpeech
- sentenceMeaning

Comprehension card current capability:

- prototype / phrase
- literal
- actual
- grammar

V29H freezes runtime capability only.

V29H does NOT freeze:

- UI layout
- CSS styling
- field ordering
- wording
- typography
- spacing
- card redesign
- POS display format
- baseForm display style
- sentenceMeaning display style

Note: the list above is the V29H runtime capability baseline scope. POS display format is frozen later by V29H-2A. Vocabulary card field ordering, baseForm display style, and sentenceMeaning display style are frozen later by V29H-3A and implemented by V29H-3B.

## 10A. POS Specification and Backend Normalize Status

Sources: `docs/V29H_POS_SPEC_FREEZE.md`, `v29a_obstacle_generator.py`, `output_text/v29a_obstacles.json`

V29H-2A POS Specification Freeze is completed.

Frozen POS rules:

- Runtime displays `partOfSpeech` exactly as provided.
- Runtime does not infer, guess, reorder, normalize, convert, or fallback POS.
- Backend generator / Analyze Engine must output final display-ready POS strings.
- Supported POS formats and canonical ordering are defined in `docs/V29H_POS_SPEC_FREEZE.md`.

V29H-2B Backend POS Normalize is completed in repository state:

- `v29a_obstacle_generator.py` contains POS display normalization, supported POS display formats, canonical combination ordering, and validation for vocabulary obstacles.
- `output_text/v29a_obstacles.json` contains normalized vocabulary `partOfSpeech` values such as `vt.`, `vi.`, `adj.`, `adv.`, `prep.`, and `n.`.

## 10B. Vocabulary Card Display Specification and Runtime Implementation Status

Sources: `docs/V29H_VOCAB_CARD_DISPLAY_SPEC_FREEZE.md`, `script.js`, `styles.css`

V29H-3A Vocabulary Card Display Specification Freeze is completed.

Frozen vocabulary card display rules:

- Header line displays `word + phonetic + partOfSpeech`.
- Second line displays `原型：{baseForm}` only when `word != baseForm`; otherwise baseForm is not displayed.
- The audio icon displays on the second line.
- Meaning line displays `句中含义：{sentenceMeaning}`.
- `sentenceMeaning` means the word-level meaning in the current sentence only, and must remain short and directly usable by learners.

V29H-3B Implement Vocabulary Card Display is completed in repository state:

- `script.js` renders vocabulary cards according to the frozen V29H-3A field order and conditional baseForm rule.
- `styles.css` contains the vocabulary card display classes for the headline, title line, second line, audio icon, and sentence meaning line.

## 10C. Vocabulary Display Data Contract Status

Sources: `docs/V29I_VOCAB_DISPLAY_DATA_CONTRACT_FREEZE.md`, `docs/V29I_SENTENCE_MEANING_SEMANTIC_RESPONSIBILITY_FREEZE.md`, `docs/V29I_RUNTIME_FAIL_FAST_SPEC_FREEZE.md`

V29I-0A Backend + Frontend Vocabulary Display Data Contract Freeze is completed.

Corrected vocabulary display data contract:

- `word` = dictionary/base form of the vocabulary item.
- `baseForm` is optional / legacy compatibility only and is not required by the vocabulary card display contract.
- `phonetic` = phonetic transcription of the dictionary/base form shown in `word`.
- `partOfSpeech` = complete POS combination for the vocabulary word, using the frozen POS formats and canonical ordering from `docs/V29H_POS_SPEC_FREEZE.md`.
- `sentenceMeaning` = short best-fit meaning of the word in the current sentence.
- `translation` = general dictionary-style translation of the word; it does not replace `sentenceMeaning`, and the current vocabulary card does not display it.
- Vocabulary card display no longer shows a separate `原型：baseForm` line because `word` is already the dictionary/base form.

Frontend display contract after V29I-0A:

- Line 1 displays `word + phonetic + partOfSpeech`.
- Line 2 displays `🔊`.
- Line 3 displays `句中含义：{sentenceMeaning}`.

V29I-0A corrects the vocabulary display data contract. All other frozen decisions remain unchanged unless a later repository freeze document explicitly revises them.

V29I-0B Backend + Frontend Vocabulary Display Data Normalize is completed in repository state:

- Backend generator now outputs vocabulary `word` as the dictionary/base form.
- `lemma` generally matches the dictionary/base form.
- `phonetic` is the dictionary/base form phonetic.
- `partOfSpeech` preserves complete frozen POS combinations.
- `sentenceMeaning` is short current-sentence word-level meaning.
- `baseForm` is legacy-compatible only and is not required by vocabulary display.
- Frontend no longer renders a separate `原型：baseForm` line.
- Regenerated `output_text/v29a_obstacles.json` and `output_text/v29a_obstacles.csv` comply with the V29I vocabulary display data contract.

V29I-0B validation results:

- Total vocabulary obstacle count: 39
- Invalid POS count: 0
- Long sentenceMeaning count: 0
- Inflected display word count: 0

V29I-0C Vocabulary SentenceMeaning Semantic Responsibility Freeze is completed and merged.

Frozen `sentenceMeaning` semantic responsibility rules:

- Backend / Analyze Engine owns `sentenceMeaning` semantic correctness.
- Frontend only displays `sentenceMeaning` exactly as provided.
- Frontend must not infer, rewrite, shorten, translate, replace, or derive `sentenceMeaning`.
- Backend / Analyze Engine uses multiple semantic evidence sources: `source_en`, `source_zh`, `word` / `lemma`, `translation`, current sentence context, and nearby subtitle context when needed.
- `source_zh` is important semantic evidence but is not the only source of truth.
- AI / Analyze Engine may decide the best-fit short learner-friendly meaning by combining available evidence.

V29I-1A Runtime Fail Fast Specification Freeze is completed and merged.

Runtime fail-fast status note:

- Runtime / Frontend is a read-only consumer of generated learning data.
- Runtime must not silently accept invalid obstacle data.
- Runtime must not guess, infer, normalize, enrich, rewrite, shorten, translate, or fallback language intelligence fields.
- Vocabulary required fields are `word`, `phonetic`, `partOfSpeech`, and `sentenceMeaning`.
- Comprehension required fields are `prototype` or `phrase` or `text`, plus `literal`, `actual`, and `grammar`.
- Invalid obstacle data must produce a clear developer-facing failure signal in implementation.
- Silent rendering of incomplete or invalid learning cards is forbidden.

V29I-1B Runtime Fail Fast has been completed and merged.

Runtime fail-fast implementation status note:

- Runtime is a read-only consumer of generated obstacle data.
- Runtime validates obstacle data before normalization and rendering.
- Invalid obstacles are skipped and never rendered.
- Runtime emits developer-facing `console.error` diagnostics for invalid obstacles.
- Vocabulary obstacles require `word`, `phonetic`, `partOfSpeech`, and `sentenceMeaning`.
- `partOfSpeech` must match frozen runtime-supported formats exactly.
- `sentenceMeaning` must not use explanatory/fallback text patterns.
- Comprehension obstacles require a `prototype` / `phrase` / `text` display title, `literal`, `actual`, and `grammar`.
- Runtime no longer infers, rewrites, translates, normalizes, enriches, or falls back language-intelligence fields.
- Runtime no longer derives `word` from `lemma` / `baseForm` / `phrase`, `sentenceMeaning` from `translation` / `source_zh`, or comprehension fields from unrelated fallback fields.

### V29I-0F POS Architecture Freeze

Status: FROZEN

Date: 2026-06-16

V29I-0F POS Architecture Freeze is completed and merged.

Frozen POS architecture rules:

- Backend-generated dictionary-level `partOfSpeech` is the only source of truth.
- Runtime must not infer, stitch, trim, reorder, normalize, or generate fallback POS values.
- Runtime may validate POS formats via allowlist.
- Runtime must display backend-generated POS values exactly as emitted.

Obstacle count:

59 / 59

Future development must not modify the POS architecture unless an explicit unfreeze decision is made.

## 11. Runtime Interaction Status

Sources: `README.md`, `CHANGELOG.md`, `Freeze_Summary.md`

- V2.3A current subtitle Learning Tips behavior is frozen: Learning Tips only displays obstacles from the current subtitle, does not preload previous/next/global obstacles, shows all obstacles in the current subtitle, and orders Vocabulary Obstacles before Comprehension Obstacles.
- V2.3A subtitle marker / Learning Pause behavior is frozen: clicking a subtitle obstacle underline enters Learning Pause, forces video pause, shows the Learning Pause Hint, and keeps Learning Tips on all current-subtitle obstacles rather than only the clicked obstacle.
- V2.3A card actions are decoupled from playback: `✓ 不用管我了` hides only the current card, `恢复全部` restores current-round hidden cards, and neither controls playback.
- V2.4A Obstacle Timeline is frozen: dual timeline, obstacle heat axis, visual density clustering, cluster counts, Bottom Sheet, selected-region highlight, subtitle-node grouping, same-subtitle obstacle binding, obstacle click-to-seek, Learning Tips sync, and playback-state preservation.
- V2.5A episode progress is frozen: `✓ 已攻克 N`, `○ 剩余 N`, `↶ 撤回上一步`, localStorage persistence, same-subtitle Analyze recovery, browser-refresh recovery, and the Learning Tips top progress module.

## 12. Root Cause / Backend Repair Status

Sources: `docs/V29E_ROOT_CAUSE_FREEZE.md`, `docs/V29F_BACKEND_VOCAB_SCHEMA_DESIGN.md`

V29E final root cause:

V29A Python generator used legacy three-field vocabulary schema.

V29F design fixed the backend vocabulary schema direction by defining seven required vocab fields and validation.

## 13. Current Development Status

Completed:

- Repository Evidence First Rule
- Codex Workflow Freeze
- Codex Workspace Exception Rule
- Long-Term Product Direction Freeze
- V29H Runtime Capability Baseline
- V29H-1 Vocabulary Card UI Polish
- V29H-2A POS Specification Freeze
- V29H-2B Backend POS Normalize
- V29H-3A Vocabulary Card Display Specification Freeze
- V29H-3B Implement Vocabulary Card Display
- V29I-0A Backend + Frontend Vocabulary Display Data Contract Freeze
- V29I-0B Backend + Frontend Vocabulary Display Data Normalize
- V29I-0C Vocabulary SentenceMeaning Semantic Responsibility Freeze
- V29I-1A Runtime Fail Fast Specification Freeze
- V29I-1B Implement Runtime Fail Fast

Completed:

- V29I Runtime Fail Fast Video QA

## 14. Explicitly Unverified / Not Frozen

The following are NOT currently frozen unless later repository evidence is added:

- Vocabulary card future UI redesign beyond the frozen V29H-3A / V29H-3B display rules
- CEFR vocabulary level system
- Beginner / Elementary / Intermediate vocabulary level system
- Any user-upload workflow
- Any creator mode
- Any alternative content-ingestion pipeline

## 15. Future Conversation Startup Prompt

Future conversations should begin with:

Please read:

```text
docs/PROJECT_STATUS_V6.md
```

and all frozen documents referenced inside it.

Treat repository files as the canonical project state.

Do not infer project history from chat memory.

Do not re-discuss frozen decisions unless the user explicitly asks to revise them.

## 16. V2.4A MVP UI Baseline Freeze

Status: FROZEN

Date: 2026-06-18

Source: `docs/CURRENT_UI_FREEZE_V2_4A.md`

V2.4A MVP UI baseline is frozen as the currently accepted player-page state. The freeze records layout, subtitle marker behavior, right obstacle panel, playback controls, heat timeline clustering, bracket-text heat markers, and Bottom Sheet interactions.

This is a documentation-only baseline record. It must not be treated as permission to change UI logic, styling, or obstacle data structures.

Future work should avoid reworking these accepted modules unless an explicit unfreeze decision is made. Recommended next P0 work: real episode video, subtitle downward adjustment, episode selector, speed controls, and removal of demo-only workflow.

## 17. V2.6F Comprehension Obstacle Generation Freeze

Status: FROZEN

Date: 2026-06-19

Source: `docs/V26F_COMPREHENSION_OBSTACLE_GENERATION_FREEZE.md`

V2.6F freezes the Comprehension Obstacle generation boundary as expressions where the learner may know every individual word but still likely misunderstands the expression.

Frozen generation rules:

- Comprehension Obstacles must be fixed, non-literal, idiomatic, slang, culturally loaded, phrasal-verb-like, or otherwise not directly derivable from individual words.
- Ordinary tone patterns, politeness patterns, high-frequency spoken sentence patterns, and generally useful learnable sentences do not qualify by default.
- `Can you believe...?`, `Are you serious?`, and `Would you mind...?` are temporarily classified as non-obstacles for V2.6F.
- `Voila` / `voilà` should be treated as a Vocabulary Obstacle candidate with POS `interj.`, not as a Comprehension Obstacle.
- A future Native Expressions / 本集地道表达 system may cover ordinary useful spoken patterns, but that system is deferred to V3 or a later version and is not part of the current MVP.

This is a generation-rule freeze only. It does not require Runtime UI changes unless a later implementation task explicitly requests them.

## 18. V2.6H Obstacle Data Contract Freeze

Status: FROZEN

Date: 2026-06-19

Source: `docs/V26H_OBSTACLE_DATA_CONTRACT_FREEZE.md`

V2.6H freezes the final obstacle data contract after the V2.6F / V2.6G merge and video validation, before P0 Real Episode Video work.

This is documentation-only. It does not modify Runtime, UI, generator logic, `output_text` data files, or regenerated obstacles.

Frozen V2.6H scope:

- V2.6F comprehension obstacle boundary.
- V2.6G episode-level learning-item dedupe.
- Nested comprehension cleanup by same-subtitle marker containment.
- Subtitle `markerStart` / `markerEnd` position contract.
- Future burned-in subtitle token / bounding-box mapping direction.
- Current validated baseline: `obstacle_count = 48`, `believe` appears once as vocabulary, `Can you believe` is absent as comprehension, nested child comprehension obstacles are removed, subtitle dashed underline markers are restored, and heat marker style remains pure text bracket labels.

Forbidden regressions include the comprehension boundary, episode-level dedupe, nested comprehension cleanup, marker generation, Runtime read-only marker rendering, heat marker bracket style, and the V2.4A UI baseline.

Next step remains P0 Real Episode Video after this freeze/tag.

## 19. V2.6I Vocabulary Level Selector Contract Freeze

Status: FROZEN

Date: 2026-06-19

Source: `docs/V26I_VOCABULARY_LEVEL_SELECTOR_CONTRACT_FREEZE.md`

V2.6I freezes the Vocabulary Level Selector contract before P0 Real Episode Video work.

This is documentation-only. It does not modify Runtime, UI, generator logic, `output_text` data files, or regenerated obstacles.

Frozen V2.6I scope:

- Vocabulary levels remain Junior High (1500), Senior High (3500), CET-4 (4500), CET-6 (6000), TEM-4 (8000), TEM-8 (12000), and GRE (20000+).
- Vocabulary Level Selector belongs in video footer Row 1 using the order: Time / Level / Episode / Speed.
- Changing Level should immediately reload the current episode's corresponding level-specific obstacle dataset and update obstacle count, right panel cards, subtitle dashed markers, heat timeline, and Bottom Sheet data.
- Runtime remains a read-only consumer: it may read `selectedLevel`, load the corresponding level-specific obstacle dataset, and render returned obstacle data, but must not perform language-intelligence filtering or recompute obstacles.
- Future Real Episode Video work should migrate toward episode + level scoped obstacle datasets such as `output_text/{episodeId}/{level}/v29a_obstacles.json`.
- Vocabulary obstacles depend on selected Level; comprehension obstacles do not depend on vocabulary Level and should remain stable across Levels unless a later explicit freeze changes this.

Next step remains P0 Real Episode Video after this freeze/tag.

## P0-4F Footer Menu Final Verified

Milestone:
P0-4F Footer Menu Final Verified

Status:
Frozen ✅

Video Verification:
Passed ✅

Merge Commit:
b086bd3

Feature Commit:
aa85551

Tag:
p0-4f-footer-menu-final-verified

Feature Freeze:

* Episodes menu:

  * 4×6 dark popup
  * header: 第12季 · 共24集
  * Episode 1 has no member badge
  * Episodes 2–24 display blue 会员 badges

* Level menu:

  * dark blue popup
  * white text
  * blue selected state
  * blue hover state
  * seven frozen English levels:

    * Junior High (1500)
    * Senior High (3500)
    * CET-4 (4500)
    * CET-6 (6000)
    * TEM-4 (8000)
    * TEM-8 (12000)
    * GRE (20000+)

* Speed menu:

  * dark blue popup
  * white text
  * blue selected state
  * blue hover state
  * includes:

    * 0.5x
    * 0.75x
    * 1.0x
    * 1.25x
    * 1.5x
    * 1.75x
    * 2.0x

## Development Environment Rule

For features involving:

* real MP4 playback
* timeline seeking
* subtitle synchronization
* playback speed
* HTML5 media events

Validation must use Live Server:

http://127.0.0.1:5500

because `py -m http.server` can behave differently for HTML5 video interactions and may produce misleading seek/playback behavior during development.

`py -m http.server` may still be used for:

* ordinary static page development
* simple UI work
* non-media testing

but it must not be used as the validation environment for real-video playback and seeking behavior.

Status:
Frozen and accepted.

## P0-1 Real Episode Video Validation Environment Frozen

Milestone:
P0-1 Real Episode Video

Validation environment:

Live Server
http://127.0.0.1:5500

Reason:

Real MP4 playback, seeking, subtitle synchronization, playback speed, and HTML5 media event validation must be performed under Live Server because `py -m http.server` may produce misleading behavior for real-video interactions.

Status:
Frozen and accepted.

## P0-2 Burned Subtitle Overlay Architecture Frozen

Milestone:
P0-2 Burned Subtitle Overlay Architecture

Source:
`docs/P0_2_BURNED_SUBTITLE_OVERLAY_ARCHITECTURE_FREEZE.md`

Status:
Frozen and accepted.

P0-2 freezes a burned-subtitle-first runtime architecture for real episode video playback.

The MP4 built-in burned subtitle remains the visible primary sentence subtitle during P0-2.

The generated yellow full-sentence subtitle Overlay must be disabled through configuration or rendering logic, but the implementation must not be physically removed during P0-2.

Existing generated JSON files remain read-only learning synchronization data:

* `output_text/v28d_bilingual_subtitles.json`
* `output_text/v29a_obstacles.json`

P0-2 must not regenerate subtitles or obstacles and must not modify those JSON files.

Temporary timing differences between the burned subtitle and generated JSON timing are acceptable during P0-2 when obstacle cards, bottom obstacle heat axis, and learning synchronization remain functional.

Precise subtitle-marker alignment remains a P0-3 responsibility.

## P0-3 Subtitle Marker On Real Subtitle Architecture Frozen

Milestone:
P0-3 Subtitle Marker On Real Subtitle Architecture

Source:
`docs/P0_3_SUBTITLE_MARKER_ON_REAL_SUBTITLE_ARCHITECTURE_FREEZE.md`

Status:
Frozen and accepted.

P0-3 freezes lightweight approximate learning markers associated with the burned subtitle area.

Built-in white burned subtitles remain the only visible sentence subtitle source.

The generated yellow full-sentence subtitle overlay remains disabled by default and must not be physically removed from the codebase.

Runtime remains a read-only consumer of existing generated learning data and must not regenerate or modify:

* `output_text/v28d_bilingual_subtitles.json`
* `output_text/v29a_obstacles.json`

P0-3 markers use the visual style `···`, are placed below the burned subtitle area, and each obstacle gets one marker.

Multiple obstacles in the same subtitle render as multiple separate `···` markers.

Clicking a marker pauses video and opens the existing Learning Tips / Learning Pause flow.

Marker timing may use a small tolerance window to better match burned subtitle perception.

Initial marker validation color is yellow, but final marker color remains subject to video validation.

P0-3 explicitly does not require OCR, text selection, word selection, pixel-perfect alignment, fixing subtitle timing drift, burned-subtitle OCR alignment, or pixel-level mapping between generated subtitle JSON and burned subtitle text.

The goal of P0-3 is discoverability of learning points associated with the burned subtitle area, not exact subtitle annotation.

## P0-3B-Reframe Subtitle Visual Mapping Layer Required Frozen

Milestone:
P0-3B-Reframe Subtitle Visual Mapping Layer Required

Source:
`docs/P0_3B_SUBTITLE_VISUAL_MAPPING_LAYER_REQUIRED_FREEZE.md`

Status:
Frozen and accepted as an architecture reframe.

P0-3B character-ratio marker positioning is not accepted and must not be tagged as the accepted marker architecture.

Character-ratio marker positioning is not reliable for burned subtitles because burned white English subtitles are pixels inside the MP4, not DOM text.

Runtime currently knows obstacle text ranges through `markerStart` / `markerEnd`, but it does not know the real visual `x` / `y` coordinates of burned English subtitle words.

Burned subtitle marker alignment requires a text-to-visual-coordinate mapping layer that connects subtitle text, obstacle `markerStart` / `markerEnd`, and real burned English subtitle visual coordinates.

Runtime must remain a read-only consumer and must not perform real-time OCR or real-time AI inference during playback.

OCR / AI coordinate extraction, if used, belongs to an offline preprocessing pipeline, and generated subtitle visual mapping data must be exported as read-only JSON consumed by Runtime.

The architecture intentionally does not freeze a specific OCR engine or AI model. Acceptable approaches include OCR-based extraction, vision-language-model-assisted extraction, hybrid extraction pipelines, and human-assisted verification workflows.

Generated coordinate data may eventually be stored as read-only data such as:

* `output_text/visual_mapping/TBBT_S12E01_word_boxes.json`

Future marker rendering should prefer visual mapping coordinates when available.

Character-ratio positioning may remain only as a fallback or debugging aid, but must not be considered the accepted production approach for burned subtitle markers.

P0-3C should be a small prototype for the current TBBT S12E01 video, first 2 minutes only, because the first minute contains too few learning obstacles to evaluate the architecture.

P0-3C should generate or simulate subtitle visual mapping data for the first two minutes and allow Runtime to render markers using the mapping layer.

P0-3C validation examples should include obstacles such as `believe`, `bedsheets`, `outside`, and any other available obstacles within the first two minutes.

P0-3C success criteria include markers appearing below the burned white English subtitle line, aligning visually to the corresponding word or phrase better than character-ratio positioning, not misleading the learner, keeping Runtime read-only, preserving the existing obstacle count of 48, and not modifying generated subtitle JSON or obstacle JSON.

## P0-4A AI-assisted Offline Analyze Architecture Freeze

Milestone:
P0-4A
AI-assisted Offline Analyze Architecture Freeze

Source:
`docs/P0_ARCHITECTURE_FREEZE_AI_REINTRODUCTION.md`

Status:
Planned

Depends on:
This roadmap adjustment. P0-4A now precedes P0-4B coordinate extraction and P0-4C marker rendering.

## 20. P0 Pilot Roadmap Dependency Adjustment

Status: FROZEN ROADMAP ADJUSTMENT

Date: 2026-06-22

Source: `docs/P0_ARCHITECTURE_FREEZE_AI_REINTRODUCTION.md`

Completed work remains valid and must be kept:

- Fix ffmpeg detection — Infrastructure Ready.
- Qwen coordinate extraction — Prototype Verified.
- AI architecture freeze — Frozen.

P0-3D-C Marker Rendering is paused because marker rendering is downstream of frozen analyze-pipeline outputs. Previous marker rendering work is retained as prototype / spike validation only and must not be treated as the final marker-rendering implementation contract.

Before finalizing marker positioning, sizing, or binding rules, the project must first freeze:

1. AI obstacle identification.
2. Frozen obstacle JSON generation.
3. Coordinate extraction based on frozen obstacles.

New P0 pilot dependency order:

```text
P0-4A AI-assisted Analyze Pipeline Pilot (2 min)
↓
P0-4B Qwen Coordinate Extraction Pilot (2 min)
↓
P0-4C Runtime Marker Rendering Pilot (2 min)
↓
P0-5 Expand From Pilot To Full Episode
```

Current implementation constraints:

- Do not continue implementing P0-3D-C for now.
- Do not modify marker rendering logic further until P0-4A / P0-4B outputs are available.
- Do not write P0-4A implementation code as part of this documentation-only adjustment.

## P0 Vocabulary Level Determination Contract Freeze

Status: FROZEN

Date: 2026-06-22

Source: `docs/P0_VOCABULARY_LEVEL_DETERMINATION_CONTRACT_FREEZE.md`

P0 freezes the Vocabulary Engine difficulty determination contract as a hierarchical, deterministic, and explainable system.

Frozen priority order:

- Layer 1: Frozen Vocabulary Lists are the source of truth and use familiar exam-based levels: Junior High, Senior High, CET-4, CET-6, TEM-4, TEM-8, and GRE.
- Layer 2: Expression Knowledge Base handles fixed expressions, phrasal verbs, reduced forms, collocations, and multi-word expressions whose difficulty may differ from isolated words.
- Layer 3: Frequency Dictionaries, including COCA and SUBTLEX-US, provide recommendations only when the item is absent from higher-priority resources.
- Layer 4: AI Assistance is the lowest-priority recommendation layer and may only assist when higher-priority resources are absent, insufficient, or semantic disambiguation is required.

Higher-priority layers always override lower-priority layers. AI must never automatically override frozen vocabulary lists or expression knowledge.

The Vocabulary Engine is not a simple vocabulary-list lookup system. It determines which words or expressions are most likely to hinder comprehension and usage for learners at the selected level, using frozen lists, expression knowledge, real-world frequency, contextual meaning, and practical usage difficulty.

Runtime remains a read-only consumer and must not perform vocabulary level determination, query vocabulary resources, call AI for difficulty judgment, or override generated obstacle levels.

## P0 Product Positioning & Learning Philosophy Freeze

Status: FROZEN

Date: 2026-06-22

Source: `docs/P0_PRODUCT_POSITIONING_AND_LEARNING_PHILOSOPHY_FREEZE.md`

P0 freezes the highest-level product positioning, learning philosophy, and North Star principles for Video English Assistant.

Frozen positioning:

- Video English Assistant is an AI-powered English learning assistant primarily designed for exam-oriented learners.
- Primary user-facing levels are Junior High, Senior High, CET-4, CET-6, TEM-4, TEM-8, and GRE.
- The product improves examination performance by strengthening real-world English comprehension and usage ability.
- Examination performance and real-world language ability reinforce each other rather than compete with each other.

Frozen learning philosophy:

- Improving English performance comes primarily from improving language understanding ability rather than memorizing isolated knowledge points.
- Memorization remains important, but understanding determines whether knowledge can be correctly recognized, transferred, and used.
- The product focuses on understanding, usage, transferable language ability, and long-term language acquisition.

Frozen obstacle identification principle:

- Obstacle identification is based on real-world English comprehension and usage difficulty for learners at the selected level.
- The system must not reduce obstacle identification to asking whether a word appears inside a particular exam vocabulary list.
- The system asks which expressions are most likely to hinder comprehension, understanding, and usage for a learner at the selected level.

Frozen North Star:

- Product entry uses familiar exam-based level labels.
- Product goal is to improve examination learning efficiency.
- Core capability is to discover and solve real language obstacles that affect comprehension and usage.
- Long-term mission is to help learners move from memorizing English to understanding English, using English, and ultimately thinking in English.

This freeze is upper-level guidance for the Vocabulary Engine, Comprehension Engine, AI prompt design, human review, script validation, obstacle generation, and Runtime read-only boundary unless explicitly unfrozen.

## P0 Comprehension Obstacle Determination Contract Freeze

Status: FROZEN

Date: 2026-06-22

Source: `docs/P0_COMPREHENSION_OBSTACLE_DETERMINATION_CONTRACT_FREEZE.md`

P0 freezes the Comprehension Engine obstacle determination contract before P0-4A AI-assisted Analyze Pipeline implementation.

Frozen core definition:

- Even if every individual word is known, if the real meaning of the expression cannot be immediately understood, it shall be classified as a Comprehension Obstacle.
- Chinese definition: 即使认识所有单词，但表达的真实含义无法立即理解，判定为理解障碍。
- Meaning-Level Principle: Comprehension Obstacles are meaning-level obstacles rather than vocabulary-level obstacles.
- Chinese principle: 理解障碍是意义层面的障碍，而不是词汇层面的障碍。

Frozen priority recognition targets:

- Fixed expressions.
- Collocations.
- Slang.
- Extended meaning.
- Culture-dependent expressions.
- Phrase meaning.
- Sentence meaning.
- Known words but difficult combined meaning.

Frozen boundaries:

- Not every useful sentence is a Comprehension Obstacle.
- Ordinary literal sentences, simple grammar patterns, common tone or politeness patterns, directly understandable sentences, broadly useful expressions, or interesting expressions should not automatically become comprehension obstacles.
- A sentence or expression should become a Comprehension Obstacle only when it creates a real understanding barrier for learners at the selected level.
- Usefulness Is Not Enough Principle: usefulness alone does not justify creating a Comprehension Obstacle.
- Chinese principle: 仅因为表达有学习价值，并不能成为生成理解障碍的理由。

Frozen relationship with Vocabulary Obstacles:

- Vocabulary Obstacles and Comprehension Obstacles are separate obstacle types.
- Both may coexist in the same subtitle.
- A Comprehension Obstacle must not replace Vocabulary Obstacles.
- Vocabulary Obstacles must not prevent the Comprehension Obstacle from being generated.

Frozen selection and explanation requirements:

- Comprehension obstacle text boundaries must be meaningful and minimal.
- The selected span must be the smallest phrase, clause, or sentence span that carries the comprehension difficulty.
- Explanations must explain why the expression means what it means, including literal meaning, actual meaning, why the actual meaning is produced, and transferable usage or extension.
- The explanation must not only translate the expression.

Frozen AI and review role:

- The Comprehension Engine is AI-driven with rule validation.
- AI output remains draft until human review and script validation are complete.
- Human review must confirm the obstacle is a real understanding barrier, not merely a useful sentence, uses a meaningful minimal boundary, answers WHY rather than only WHAT, has the correct type, removes false positives, and adds or flags obvious false negatives.

Refinement entry — constitutional-level guardrails added before P0-4A AI-assisted Analyze Pipeline implementation:

- Context-Dependent Principle: comprehension obstacles depend on actual meaning in context.
- Meaning Bottleneck Principle: obstacles represent meaning bottlenecks, not mere learning opportunities.
- Comprehension Impact Principle: obstacles should materially affect surrounding sentence understanding.
- Minimum Necessary Principle: generate only the minimum necessary obstacles and avoid excessive, overlapping, equivalent, or low-value obstacles.
- Progressive Difficulty Principle: obstacle generation should reflect learner-level progression and contextual, idiomatic, cultural, misunderstanding, and comprehension-impact factors.
- Constitutional Principles Summary: the frozen principles guide Analyze Prompt Design, AI Draft Generation, Human Review, Script Validation, False Positive Detection, and Future Model Replacement.

Frozen Runtime boundary:

- Runtime is read-only.
- Runtime must not decide comprehension obstacles, infer phrase meanings, call AI, generate explanations, rewrite explanations, generate obstacle IDs, or modify obstacle JSON.
- Runtime may only consume frozen obstacle data generated by the offline Analyze Engine.

## P0 Analyze Prompt Contract Freeze

Status: FROZEN

Date: 2026-06-22

Source: `docs/P0_ANALYZE_PROMPT_CONTRACT_FREEZE.md`

P0 freezes the Analyze Prompt contract for the P0-4A AI-assisted Analyze Pipeline Pilot before implementation.

This freeze sits after the Product Philosophy, Vocabulary Level Determination Contract, and Comprehension Obstacle Determination Contract, and before AI Draft Generation, Human Review, Script Validation, and Frozen Obstacles.

Frozen prompt input fields:

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

Frozen prompt thinking order:

1. Vocabulary Determination.
2. Comprehension Determination.
3. Deduplication.
4. Boundary Selection.
5. Explanation Generation.
6. Draft Output.

Frozen output contract:

- The AI must return valid JSON only.
- `reviewStatus` must be `draft`; the AI must not output or claim `frozen`.
- P0-4A `pilotScope` is `00:00:00` to `00:02:00`.
- Every obstacle must include deterministic `obstacleId`, type, subtitle reference, source text, marker boundary fields, decision source, confidence, and `reviewDecision`.
- Obstacle IDs must follow `tbbt-s12e01-obstacle-NNNNNN`, starting at `000001`.
- Runtime must never generate obstacle IDs.

Frozen AI prohibition boundary:

- The prompt must forbid coordinate generation, marker generation, subtitle visual mapping, Qwen-VL calls, OCR, Runtime modification, obstacle count inference, subtitle JSON changes, existing `output_text` data file changes, invalid obstacle IDs, non-JSON explanations, markdown fences, and claiming draft output is frozen.

Draft boundary:

- AI output belongs only to Draft stage.
- Draft path is `output_text/drafts/p0_4a_obstacles_pilot_draft.json`.
- Draft files must never be consumed by Runtime.
- Only Human Review, Script Validation, and Freeze Approval may promote data to `output_text/v29a_obstacles_pilot.json`.

Stable ordering is frozen as `subtitleIndex`, then `markerStart`, then `type` with vocabulary before comprehension when tied, then alphabetical `text`.

## P0-4A Pilot Asset Contract Freeze

Status: FROZEN

Date: 2026-06-22

Source: `docs/P0_4A_PILOT_ASSET_CONTRACT_FREEZE.md`

P0-4A freezes the pilot asset scope and data boundaries for the AI-assisted Analyze Pipeline Pilot.

Frozen pilot processing scope:

```text
00:00:00
~
00:02:00
```

Only the first two minutes of `assets/videos/TBBT_S12E01.mp4` may be processed. The pilot must not process the full episode or any other episode.

Frozen read-only inputs:

- `assets/videos/TBBT_S12E01.mp4`
- `output_text/v28d_bilingual_subtitles.json`

P0-4A must not modify, crop, regenerate, rewrite, or retime these input assets. It must not generate new video assets or temporary pilot videos.

Permitted generated draft files:

- `output_text/drafts/p0_4a_analyze_input_pilot.json`
- `output_text/drafts/p0_4a_obstacles_pilot_draft.json`

The draft obstacle output must keep `reviewStatus` as `draft`, requires Human Review and Script Validation, and must never be consumed by Runtime.

Only after Human Review, Script Validation, and Freeze Approval may the draft become:

- `output_text/v29a_obstacles_pilot.json`

The frozen obstacle output must use `reviewStatus: frozen`. Runtime may consume only this frozen pilot obstacle file and must never read `output_text/drafts/*`.

Explicit P0-4A non-goals include processing beyond the first two minutes, generating coordinates or marker positions, calling Qwen-VL, performing OCR, generating visual mappings, modifying Runtime files, modifying `script.js`, modifying `styles.css`, modifying existing obstacle or subtitle JSON, and generating Marker rendering logic.

P0-4A is an obstacle-generation pilot only. Its responsibility ends at Draft Obstacle Generation, Human Review, Script Validation, and Frozen Obstacle JSON. Qwen coordinate extraction belongs to P0-4B, and Runtime marker rendering belongs to P0-4C.

## P0-4B-4 Runtime Pilot Controlled Opt-in Contract

Status: FROZEN CONTRACT

Date: 2026-06-23

Source tag: `p0-4b-3b-runtime-pilot-selection-shadow-probe-verified`

P0-4B-4 freezes the controlled opt-in contract for future Runtime Pilot UI consumption. This is a contract-only status entry; controlled opt-in implementation is not authorized by this task.

Verified prior runtime pilot status:

- Runtime pilot obstacles load.
- Runtime pilot candidates are available.
- Runtime pilot normalization succeeds.
- Runtime pilot shadow comparison succeeds.
- Runtime pilot read-only selection adapter exists.
- Runtime pilot selection shadow comparison succeeds.

Frozen controlled opt-in contract:

1. Default behavior must remain Production Flow.
2. Runtime Pilot Flow must never activate unless the explicit opt-in query parameter is present.
3. The opt-in query parameter is `runtimePilot=1`.
4. Runtime Pilot opt-in is developer/test-only.
5. Runtime Pilot opt-in must be fail-closed.
6. If runtime pilot data fails to load, validate, normalize, or adapt, the app must fall back to Production Flow.
7. No AI, OCR, Qwen, or Qwen-VL calls are allowed at runtime.
8. Runtime must remain read-only.
9. Runtime Pilot must not write files.
10. Runtime Pilot must not modify source obstacle JSON files.
11. Runtime Pilot must not modify subtitle JSON files.
12. Runtime Pilot must not modify visual mapping JSON files.
13. Production obstacle flow must remain the default source for the right panel, subtitle markers, heatmap, timeline, bottom sheet, and progress counts.
14. Controlled opt-in implementation is not authorized in this task.
15. This task freezes the contract only.

Intended future implementation shape:

```text
Default:
Production Flow → UI

Opt-in:
?runtimePilot=1 → Runtime Pilot Flow → UI

Failure:
Runtime Pilot unavailable → Production Flow → UI
```

Default URL:

```text
http://127.0.0.1:5500/
```

The default URL must continue using Production Flow.

Development opt-in URL:

```text
http://127.0.0.1:5500/?runtimePilot=1
```

The development opt-in URL may later allow Runtime Pilot Flow to drive UI only after this frozen contract and only after future implementation is explicitly authorized.

Explicit non-goals:

- Do not replace Production Flow by default.
- Do not enable Runtime Pilot for normal users.
- Do not introduce UI redesign.
- Do not introduce a visible toggle yet.
- Do not call AI, OCR, Qwen, or Qwen-VL.
- Do not change marker rendering rules in this contract.

Merge gate:

Yes, merge only if only `docs/PROJECT_STATUS_V6.md` changed, no code files changed, no `output_text` files changed, the contract clearly states default Production Flow remains unchanged, `runtimePilot=1` is documented as future developer-only opt-in, and fail-closed fallback to Production Flow is documented.

## P0-4B-5 Runtime Pilot Controlled Opt-in Polish / Contract Freeze

Status: FROZEN

Date: 2026-06-23

Source tag: `p0-4b-4-runtime-pilot-controlled-opt-in-contract`

P0-4B-5 freezes the verified Runtime Pilot controlled opt-in behavior and isolation rules before any Runtime Pilot data scope expansion. Runtime Pilot is not default Production, is not enabled for normal users, and may drive the existing UI only under explicit developer opt-in.

Frozen default URL behavior:

```text
http://127.0.0.1:5500/
```

The default URL must use Production Flow.

Frozen default Production Flow contract:

- `activeDataSource` must be `real`.
- Obstacle total must be the Production count: 48.
- Progress total must be 48.
- Progress key scope must be `production`.
- Runtime Pilot must not take over the UI.

Frozen developer opt-in URL behavior:

```text
http://127.0.0.1:5500/?runtimePilot=1
```

The developer opt-in URL may use Runtime Pilot Flow.

Frozen Runtime Pilot Flow contract:

- `activeDataSource` must be `runtime-pilot`.
- Obstacle total must be the Runtime Pilot count for the current pilot: 10.
- Progress total must be 10 for the current pilot.
- Progress key scope must be `runtime-pilot`.
- Runtime Pilot may drive the existing UI only under explicit opt-in.
- No visible UI toggle is introduced.

Frozen exit and isolation behavior:

- Removing `?runtimePilot=1` and refreshing must restore Production Flow.
- Runtime Pilot progress must not affect Production progress.
- Runtime Pilot `hiddenObstacleIds` must not affect Production `hiddenObstacleIds`.
- Runtime Pilot `dismissedObstacleHistory` must not affect Production `dismissedObstacleHistory`.
- Runtime Pilot localStorage/progress key must remain separate from the Production localStorage/progress key.
- `activeDataSource` must return to `real` after exiting opt-in.

Frozen fail-closed rule:

- If Runtime Pilot load, validation, normalization, candidate preparation, or activation fails, Production Flow must remain active.
- Failure must not blank the UI.
- Failure must not overwrite Production obstacles.
- Failure must not mutate source JSON.
- Failure must not require clearing cache or localStorage to return to Production Flow.

Frozen Runtime read-only boundaries:

- No AI/OCR/Qwen/Qwen-VL runtime calls.
- No file writes.
- No modification to `output_text` files.
- No modification to production obstacle JSON.
- No modification to subtitle JSON.
- No modification to visual mapping JSON.

Explicit non-goals:

- Do not expand Runtime Pilot obstacle count in this task.
- Do not process the full episode in this task.
- Do not promote Runtime Pilot to default Production.
- Do not enable Runtime Pilot for normal users.
- Do not introduce a visible user-facing toggle.
- Do not redesign UI.
- Do not change marker rendering rules.
- Do not remove existing P0-4B probe logs yet.

Future allowed direction after this freeze:

- Controlled expansion of Runtime Pilot data scope may begin only after this freeze.
- Runtime Pilot expansion must keep default Production Flow unchanged.
- Any future Runtime Pilot full-episode expansion must preserve progress/localStorage isolation and fail-closed fallback.

Merge gate:

Yes, merge only if only `docs/PROJECT_STATUS_V6.md` changed, no code files changed, no `output_text` files changed, the freeze documents default Production Flow as 48 obstacles, the freeze documents developer opt-in Runtime Pilot Flow as 10 obstacles for the current pilot, the freeze documents exit/isolation behavior, the freeze documents separate progress/localStorage scope, the freeze documents fail-closed fallback to Production Flow, and the freeze explicitly says Runtime Pilot is not default and not enabled for normal users.

## P0-5A AI-assisted Offline Analyze Engine Expansion Contract

Status: FROZEN CONTRACT

Date: 2026-06-23

Source tags:

- `p0-4b-5-runtime-pilot-controlled-opt-in-polish-contract-freeze`
- `p0-4b-5-runtime-pilot-controlled-opt-in-polish-verified`

P0-5A freezes the expansion contract for the AI-assisted Offline Analyze Engine before increasing Runtime Pilot obstacle scope beyond the current 10-obstacle pilot.

Current Runtime Pilot scope:

- 10 Runtime Pilot obstacles.

Next allowed expansion stages:

1. 30-obstacle pilot.
2. 100-obstacle pilot.
3. Full episode pilot.
4. Future multi-episode expansion.

Frozen expansion rules:

1. Production Flow must remain default at:

   ```text
   http://127.0.0.1:5500/
   ```

2. Runtime Pilot expansion must remain accessible only through:

   ```text
   http://127.0.0.1:5500/?runtimePilot=1
   ```

3. Runtime Pilot expansion must not replace Production by default.
4. Runtime Pilot expansion must continue to use isolated progress/localStorage scope.
5. Runtime Pilot expansion must continue to use isolated `hiddenObstacleIds` and `dismissedObstacleHistory`.
6. Runtime Pilot expansion must fail closed to Production Flow if:
   - runtime data fails to load
   - validation fails
   - normalization fails
   - candidate preparation fails
   - activation fails
7. Runtime must remain read-only:
   - no AI calls
   - no OCR calls
   - no Qwen calls
   - no Qwen-VL calls
   - no file writes
   - no runtime obstacle generation
   - no subtitle JSON modification
   - no production obstacle JSON modification
   - no visual mapping JSON modification
8. AI-assisted obstacle generation must remain offline-only.
9. Draft AI output must never be consumed directly by Runtime.
10. Expansion data must pass:
    - draft generation
    - validation gate
    - human review
    - frozen promotion
    - runtime promotion
    before Runtime may consume it.
11. Runtime Pilot expanded data must continue to use:

    ```text
    output_text/runtime/p0_4a_obstacles_pilot_runtime.json
    ```

    or a future explicitly frozen runtime path.
12. Any future path change must be documented before implementation.
13. Expansion must not redesign UI.
14. Expansion must not change marker rendering rules.
15. Expansion must not change the default Production obstacle count or source.
16. Expansion must not remove existing P0-4B probe logs unless a later cleanup contract explicitly authorizes it.

Explicit non-goals:

- Do not generate 30/100/full-episode obstacles in this task.
- Do not modify Analyze scripts in this task.
- Do not modify Runtime in this task.
- Do not modify Qwen/Qwen-VL pipeline in this task.
- Do not process full episode in this task.
- Do not promote Runtime Pilot to default Production.
- Do not enable Runtime Pilot for normal users.
- Do not introduce a visible UI toggle.

Recommended next implementation after this contract:

P0-5B 30-obstacle AI Draft Expansion

Allowed future implementation shape:

- Extend offline analyze input scope only after contract freeze.
- Generate draft output only.
- Validate draft output.
- Require human review.
- Promote only approved/frozen data.
- Regenerate runtime pilot output only after promotion.
- Verify under `?runtimePilot=1`.
- Verify default `/` remains Production 48.

Merge gate:

Yes, merge only if only `docs/PROJECT_STATUS_V6.md` changed, no code files changed, no `output_text` files changed, the contract preserves Production as default, the contract preserves Runtime Pilot as developer-only, the contract preserves progress/localStorage isolation, the contract preserves fail-closed fallback, the contract states AI generation is offline-only, and the contract states draft AI output must never be consumed directly by Runtime.

## P0-5B-1 30-obstacle Offline Analyze Scope Expansion Contract

Status: FROZEN CONTRACT

Date: 2026-06-23

Source tag:

- `p0-5a-ai-assisted-offline-analyze-expansion-contract`

P0-5B-1 freezes the scope and workflow contract for expanding Runtime Pilot obstacle data from the current 10-obstacle pilot to a 30-obstacle offline analyze pilot. This is a documentation-only contract; it does not authorize obstacle generation, Analyze script changes, Runtime changes, output file changes, or production behavior changes.

Expansion target:

- Current Runtime Pilot obstacle count: 10.
- Next target Runtime Pilot obstacle count: 30.
- This is a pilot expansion, not full-episode production.

Production safety:

- Default Production Flow must remain unchanged.
- Default URL must remain:

  ```text
  http://127.0.0.1:5500/
  ```

- Production obstacle count remains 48.
- Runtime Pilot must not become default.
- Runtime Pilot must remain developer-only through:

  ```text
  http://127.0.0.1:5500/?runtimePilot=1
  ```

Input scope:

- The 30-obstacle expansion may extend the offline analyze input beyond the previous 10-obstacle pilot scope.
- The exact subtitle/time range for the 30-obstacle pilot must be determined by offline input generation, not by Runtime.
- Runtime must not decide expansion scope.
- Runtime must not call AI to fill missing obstacles.
- Runtime must not infer missing obstacles.

Selection principle:

- The 30 obstacles should be selected by the offline Analyze pipeline according to the frozen product philosophy, vocabulary level determination contract, comprehension obstacle determination contract, and analyze prompt contract.
- The 30-obstacle set should preserve real learning value and avoid padding low-value obstacles just to reach 30.
- If fewer than 30 high-quality obstacles are found in the selected scope, the pipeline should report the count instead of fabricating weak obstacles.
- False positives are worse than having fewer than 30 obstacles.

Required pipeline gates:

The 30-obstacle expansion must pass:

- AI draft generation.
- draft validation gate.
- human review decision.
- human review apply.
- frozen promotion.
- runtime promotion.
- developer opt-in Runtime verification.

Draft boundary:

- Draft AI output must remain draft.
- Draft AI output must not be consumed directly by Runtime.
- Draft files must remain under `output_text/drafts/`.
- Runtime must not read `output_text/drafts/*`.

Frozen promotion boundary:

- Only reviewed and approved data may be promoted to frozen.
- Frozen data must retain `reviewStatus: frozen`.
- Frozen data must not be silently overwritten without validation and review evidence.

Runtime promotion boundary:

- Runtime may consume only runtime-promoted data.
- Runtime-promoted data must remain under:

  ```text
  output_text/runtime/p0_4a_obstacles_pilot_runtime.json
  ```

  unless a future path change is explicitly frozen first.
- Runtime promotion must preserve normalized display-ready fields.
- Runtime promotion must preserve `runtimeMayConsume: true`.
- Runtime promotion must preserve `schemaVersion` expectations.

Runtime verification:

Under:

```text
http://127.0.0.1:5500/?runtimePilot=1
```

Expected after future implementation:

- Runtime Pilot obstacle total should be 30 if exactly 30 approved obstacles are promoted.
- UI should consume Runtime Pilot data only under opt-in.
- Progress total should reflect Runtime Pilot count.
- No crash.
- No direct AI/OCR/Qwen/Qwen-VL calls.

Under:

```text
http://127.0.0.1:5500/
```

Expected:

- Production Flow remains active.
- Production obstacle total remains 48.
- Runtime Pilot does not take over UI.

Isolation rules:

- Runtime Pilot 30-obstacle progress must remain isolated from Production progress.
- Runtime Pilot `hiddenObstacleIds` must remain isolated from Production `hiddenObstacleIds`.
- Runtime Pilot `dismissedObstacleHistory` must remain isolated from Production `dismissedObstacleHistory`.
- Runtime Pilot localStorage/progress key must remain isolated from Production progress key.
- Exit from `?runtimePilot=1` back to `/` must restore Production Flow.

Fail-closed boundary:

- If Runtime Pilot load, validation, normalization, candidate preparation, promotion validation, or activation fails, Production Flow must remain active.
- Failure must not blank the UI.
- Failure must not overwrite Production obstacles, subtitle JSON, visual mapping JSON, or runtime-promoted data.
- Failure must not require clearing cache or localStorage to return to Production Flow.

Runtime read-only boundaries:

- No AI calls at runtime.
- No OCR calls at runtime.
- No Qwen calls at runtime.
- No Qwen-VL calls at runtime.
- No runtime file writes.
- No runtime obstacle generation.
- No runtime subtitle JSON modification.
- No runtime production obstacle JSON modification.
- No runtime visual mapping JSON modification.

Explicit non-goals:

- Do not generate 30 obstacles in this task.
- Do not modify Analyze scripts in this task.
- Do not modify Runtime in this task.
- Do not modify Qwen/Qwen-VL pipeline in this task.
- Do not modify `output_text` files in this task.
- Do not process the full episode in this task.
- Do not expand to 100 obstacles in this task.
- Do not promote Runtime Pilot to default Production.
- Do not enable Runtime Pilot for normal users.
- Do not introduce a visible UI toggle.
- Do not redesign UI.
- Do not change marker rendering rules.

Recommended next implementation after this contract:

1. P0-5B-2 30-obstacle Offline Analyze Input Expansion.
2. P0-5B-3 30-obstacle AI Draft Generation.
3. P0-5B-4 Draft Validation Gate.
4. P0-5B-5 Human Review Decision.
5. P0-5B-6 Human Review Apply.
6. P0-5B-7 Frozen Promotion.
7. P0-5B-8 Runtime Promotion.
8. P0-5B-9 Runtime Opt-in Verification.

Merge gate:

Yes, merge only if only `docs/PROJECT_STATUS_V6.md` changed, no code files changed, no `output_text` files changed, the contract freezes 30-obstacle expansion scope, the contract preserves Production default 48, the contract preserves Runtime Pilot developer-only opt-in, the contract requires validation, human review, frozen promotion, and runtime promotion, the contract says draft AI output must never be consumed directly by Runtime, and the contract preserves Runtime read-only and fail-closed boundaries.

## P0-5B-2 30-obstacle Offline Analyze Input Expansion Contract

Status: FROZEN CONTRACT

Date: 2026-06-23

Source tag:

- `p0-5b-1-30-obstacle-offline-analyze-scope-expansion-contract`

P0-5B-2 freezes the offline analyze input boundary for the 30-obstacle Runtime Pilot expansion. This task decides the 30-obstacle pilot input scope only. It is a documentation-only contract; it does not authorize obstacle generation, AI calls, Analyze script changes, Runtime changes, Qwen/Qwen-VL pipeline changes, `output_text` changes, or production behavior changes.

Frozen pilot input scope:

```text
00:00:00
~
00:06:00
```

Equivalent subtitle-index scope from current repository subtitle data:

- Source checked: `output_text/v28d_bilingual_subtitles.json`.
- Rows whose subtitle time range overlaps `00:00:00~00:06:00`: subtitle indexes `0~36`.
- Current repository subtitle data ends at subtitle index `36` (`122.5` seconds to `124.5` seconds), so every currently versioned subtitle row overlaps the frozen time range.
- If a later input generation task uses a fuller subtitle source than the currently versioned repository subtitle JSON, the subtitle-index boundary must be computed by that input generation script from the frozen time range `00:00:00~00:06:00`.

Rationale:

- The previous 10-obstacle pilot used a smaller early-episode scope.
- The 30-obstacle pilot needs a larger but still bounded early-episode scope.
- `00:00:00~00:06:00` is large enough to give the offline Analyze pipeline a chance to find around 30 high-quality obstacles.
- `00:00:00~00:06:00` remains small enough to keep AI cost, human review cost, and validation scope controlled.
- The pipeline must not pad low-value obstacles just to reach 30.
- If fewer than 30 high-quality obstacles are found in this scope, the pipeline must report the actual count.

Frozen input rules:

1. The 30-obstacle pilot input must be derived from the frozen time range:

   ```text
   00:00:00~00:06:00
   ```

2. The input generation script may select subtitle rows whose time range overlaps the frozen time range.
3. The input generation script must not modify:
   - source subtitle JSON
   - source video file
   - production obstacle JSON
   - runtime obstacle JSON
   - visual mapping JSON
4. The input generation script must write only future draft/input artifacts explicitly authorized by later implementation tasks.
5. Runtime must not decide or change the input scope.
6. Runtime must not call AI/OCR/Qwen/Qwen-VL.
7. Runtime must not infer missing obstacles.
8. AI draft generation must occur only after this input scope contract is frozen and after a future implementation task explicitly authorizes draft generation.
9. Draft AI output must never be consumed directly by Runtime.
10. Production default must remain unchanged:

    ```text
    http://127.0.0.1:5500/
    Production Flow
    48 obstacles
    ```

11. Runtime Pilot remains developer-only:

    ```text
    http://127.0.0.1:5500/?runtimePilot=1
    ```

12. This scope expansion must preserve P0-4B and P0-5A isolation/fail-closed rules.

Explicit non-goals:

- Do not generate 30 obstacles in this task.
- Do not call AI in this task.
- Do not modify Analyze scripts in this task.
- Do not modify Runtime in this task.
- Do not modify Qwen/Qwen-VL pipeline in this task.
- Do not modify `output_text` files in this task.
- Do not process the full episode in this task.
- Do not expand to 100 obstacles in this task.
- Do not promote Runtime Pilot to Production.
- Do not enable Runtime Pilot for normal users.
- Do not introduce a visible UI toggle.
- Do not redesign UI.
- Do not change marker rendering rules.

Recommended next implementation after this contract:

P0-5B-3 30-obstacle Offline Analyze Input Generation

Allowed next implementation shape:

- Create or update only the input generation script if needed.
- Generate only the `00:00:00~00:06:00` analyze input artifact under `output_text/drafts/`.
- Do not call AI yet unless explicitly authorized by the next task.
- Do not modify Runtime.
- Do not modify production obstacle files.
- Verify generated input subtitle count and time range.
- Confirm no `output_text/runtime` file changed.

Merge gate:

Yes, merge only if only `docs/PROJECT_STATUS_V6.md` changed, no code files changed, no `output_text` files changed, the contract freezes the 30-obstacle input time scope as `00:00:00~00:06:00`, the contract preserves Production default 48, the contract preserves Runtime Pilot developer-only opt-in, the contract says Runtime must not decide input scope, and the contract says this task does not generate obstacles or call AI.

## P0-5B-5A Draft Auto-normalization / Repair Contract

Status:

FROZEN CONTRACT

Document purpose:

P0-5B-5A freezes which P0-5B draft validation failures may be repaired automatically and which must remain for human review.

Document current failed validation evidence:

- Validation gate completed.
- Report path:
  `output_text/drafts/p0_5b_30_obstacle_ai_draft_validation_report.json`
- status: failed
- actualObstacleCount: 30
- vocabularyCount: 21
- comprehensionCount: 9
- invalidCount: 34
- warningCount: 0
- nextStageAllowed: false

Freeze auto-repair allowed scope:

1. Allowed auto-repair category A:
   Vocabulary partOfSpeech display normalization.

   Source values may be normalized as:
   - noun -> n.
   - verb -> vt./vi.
   - adjective -> adj.
   - adverb -> adv.
   - proper noun -> n.

   Rationale:
   These are display-format normalization issues, not semantic obstacle-selection changes.

2. Allowed auto-repair category B:
   Vocabulary sentenceMeaning shortening.

   Allowed rule:
   - If sentenceMeaning is too long, replace it with a short Chinese current-sentence meaning.
   - The meaning must be derived only from existing draft fields and subtitle context:
     word
     lemma
     translation
     source_en
     source_zh
     current subtitle context
   - It must not use Runtime.
   - It must not call AI.
   - It must be concise:
     preferably 2~8 Chinese characters
     hard maximum 30 Chinese characters
     hard maximum 80 total characters

   Rationale:
   Runtime card requires short learner-facing current-sentence meaning, not long English explanation.

Freeze auto-repair prohibited scope:

1. Do NOT auto-approve or reject obstacles.
2. Do NOT change obstacle type.
3. Do NOT add new obstacles.
4. Do NOT remove obstacles.
5. Do NOT reorder obstacles except preserving existing stable order if script rewrites file.
6. Do NOT change obstacleId.
7. Do NOT change subtitleIndex.
8. Do NOT change source_en/source_zh/startTime/endTime.
9. Do NOT change markerStart/markerEnd/text unless a future explicit marker repair contract authorizes it.
10. Do NOT rewrite comprehension literal/actual/grammar in this repair step.
11. Do NOT modify reviewStatus.
12. Do NOT modify reviewDecision.
13. Do NOT set runtimeMayConsume true.
14. Do NOT promote data.
15. Do NOT write output_text/frozen.
16. Do NOT write output_text/runtime.
17. Do NOT modify Production obstacle files.
18. Do NOT modify Runtime.

Freeze output strategy for future implementation:

The future repair script must not overwrite the original AI draft.
It must create a repaired draft copy, for example:

`output_text/drafts/p0_5b_30_obstacle_ai_draft_repaired.json`

The original remains:

`output_text/drafts/p0_5b_30_obstacle_ai_draft.json`

A future repair report may be written as:

`output_text/drafts/p0_5b_30_obstacle_ai_draft_repair_report.json`

Freeze validation flow after future repair:

1. Generate repaired draft copy.
2. Run validation gate against repaired draft or a repair-aware validation path.
3. Only if validation passes may the project proceed to Human Review Decision.
4. If validation still fails, do not proceed to Human Review Decision.

Freeze human review boundary:

Human review may later decide whether the repaired draft obstacles are actually good learning obstacles.
Auto-repair may only fix mechanical/schema/display issues.
Auto-repair must not decide learning value.

Explicit non-goals:

- Do not implement the repair script in this task.
- Do not edit the draft in this task.
- Do not regenerate AI draft in this task.
- Do not call AI in this task.
- Do not run validation in this task.
- Do not run human review in this task.
- Do not promote frozen data in this task.
- Do not modify Runtime in this task.
- Do not modify output_text in this task.

Recommended next implementation:

P0-5B-5B Draft Auto-normalization Repair Script

Expected future implementation shape:

- Create only:
  `scripts/p0_5b_repair_30_obstacle_ai_draft.js`
- Read:
  `output_text/drafts/p0_5b_30_obstacle_ai_draft.json`
  `output_text/drafts/p0_5b_30_obstacle_ai_draft_validation_report.json`
- Write:
  `output_text/drafts/p0_5b_30_obstacle_ai_draft_repaired.json`
  `output_text/drafts/p0_5b_30_obstacle_ai_draft_repair_report.json`
- Do not overwrite original draft.
- Do not call AI.
- Do not modify Runtime.
- Do not promote data.

Merge gate:

Yes, merge only if only `docs/PROJECT_STATUS_V6.md` changed, no code files changed, no `output_text` files changed, the contract allows POS display normalization, the contract allows short Chinese `sentenceMeaning` repair, the contract forbids changing obstacle identity, type, marker span, review status, review decision, Runtime, Production, frozen, or runtime outputs, and the contract requires a repaired draft copy instead of overwriting the original draft.

## P0-5B-7A Needs-edit Resolution Contract

Status:
FROZEN CONTRACT

Document source tag:
p0-5b-7-human-review-apply-completed

Document current evidence:
- Reviewed draft path:
  `output_text/drafts/p0_5b_30_obstacle_reviewed_draft.json`
- Apply report path:
  `output_text/drafts/p0_5b_30_obstacle_human_review_apply_report.json`
- sourceObstacleCount: 30
- approvedCount: 17
- rejectedCount: 12
- needsEditCount: 1
- pendingCount: 0
- reviewedObstacleCount: 17
- runtimeMayConsume: false

Freeze approved-only promotion policy:

1. P0-5B frozen promotion may promote only the 17 approved reviewed obstacles.
2. Rejected obstacles must not be promoted.
3. needs_edit obstacles must not be promoted in this pass.
4. The single needs_edit item does not block approved-only promotion.
5. The needs_edit item remains traceable through the apply report.
6. Any future recovery/edit pass for the needs_edit item must be separate and explicitly authorized.
7. Approved-only promotion is allowed only because:
   - pendingCount is 0
   - approvedCount is greater than 0
   - reviewed draft contains only approved obstacles
   - reviewed draft runtimeMayConsume is false
   - no rejected/needs_edit obstacle appears in reviewed draft

Freeze next allowed stage:

Next allowed implementation:
P0-5B-8 Frozen Promotion

P0-5B-8 must:
- Read only:
  `output_text/drafts/p0_5b_30_obstacle_reviewed_draft.json`
  `output_text/drafts/p0_5b_30_obstacle_human_review_apply_report.json`
- Write only a frozen artifact under `output_text/frozen/`
- Promote only reviewed/approved obstacles
- Preserve Runtime read-only principles
- Keep runtimeMayConsume false unless a later runtime promotion explicitly authorizes runtime output
- Not modify Runtime
- Not modify Production
- Not modify draft sources
- Not include rejected or needs_edit obstacles

Freeze hard prohibitions:

- Do NOT include needs_edit item in frozen promotion.
- Do NOT auto-edit needs_edit item.
- Do NOT silently drop traceability.
- Do NOT promote rejected items.
- Do NOT promote pending items.
- Do NOT call AI/OCR/Qwen/Qwen-VL.
- Do NOT modify Runtime.
- Do NOT write `output_text/runtime` in P0-5B-8.
- Do NOT replace Production flow.
- Do NOT enable Runtime Pilot for normal users.

Explicit non-goals:

- Do not implement Frozen Promotion in this task.
- Do not repair the needs_edit item in this task.
- Do not change review decisions in this task.
- Do not modify `output_text` in this task.
- Do not modify code in this task.

Merge gate:

Yes, merge only if only `docs/PROJECT_STATUS_V6.md` changed, no code files changed, no `output_text` files changed, the contract explicitly allows approved-only frozen promotion, the contract explicitly forbids needs_edit/rejected promotion, the contract preserves Runtime and Production boundaries, and the contract states P0-5B-8 is the next allowed stage.

---

## P0-5B Runtime Pilot Verification

Status: VERIFIED ✅

Verification Tag: `p0-5b-runtime-pilot-verified`

Date: 2026-06-27

P0-5B Runtime Pilot verification completed successfully.

Runtime Pilot obstacle count: 17

Production obstacle count: 48

Runtime / Production isolation: VERIFIED ✅

Runtime data source updated:
- `output_text/runtime/p0_5b_30_obstacle_runtime.json`

Runtime validator schema support:
- `p0-4a-runtime-obstacles-pilot-v1` (backward compatible)
- `p0-5b-30-obstacle-runtime.v1` (P0-5B forward compatible)

Console verification:
- runtime pilot obstacles loaded: 17
- runtime pilot normalized candidates available: 17
- runtime pilot opt-in active: 17 obstacles

Runtime pipeline verification: PASSED ✅

Marker bound warnings classification:
- Marker bound warnings are Data QA issues only.
- Marker bound warnings are NOT Runtime Pipeline bugs.
- Runtime pipeline correctly validates and reports data quality issues.

Recommended next milestone: P0-5C

---

### P0-5C Comprehension Obstacle Philosophy Freeze

Status: FROZEN.

Source: `docs/P0_5C_COMPREHENSION_OBSTACLE_PHILOSOPHY_FREEZE.md`

P0-5C freezes the New Learning Value Principle for Comprehension Obstacle generation.

Comprehension Obstacles must provide learning value that cannot be obtained from Vocabulary Obstacles.

Vocabulary Obstacles answer what a word means in the current sentence.

Comprehension Obstacles answer why the expression is used in the current context.

Vocabulary and Comprehension Obstacles may coexist on the same word, phrase, or subtitle line only when they serve different learning goals.

Comprehension Obstacles must be rejected if they merely repeat the Vocabulary Obstacle, sentenceMeaning, translation, or basic lexical explanation.

This freeze affects Analyze Engine policy, AI draft generation, review decision rules, future AI vendor benchmarks, and future content factory production.

This freeze does not affect Runtime, UI, marker rendering, or data contract behavior.

Runtime remains read-only and continues to consume only frozen artifacts.

---

## P0-6A AI Review Evidence Rules Freeze

Status: COMPLETE ✅

Git Tag: `p0-6a-ai-review-evidence-rules-freeze`

Source: `docs/P0_6A_AI_REVIEW_EVIDENCE_RULES_FREEZE.md`

P0-6A upgrades AI Review from a confidence-driven review model to an evidence-driven Evidence Engine.

AI Review does not decide based on confidence. AI Review decides based on evidence.

New architecture principles introduced:

- Architecture Philosophy
- Evidence Completeness
- Decision Traceability
- Evidence Reproducibility
- Evidence Engine Architecture

Frozen rules:

- Evidence Collection must complete before reasoning begins.
- Evidence always precedes reasoning; reasoning always precedes decision.
- Confidence is supplementary information only and must never replace evidence.
- Decisions (Frozen, Reject, Needs Human) are determined by evidence quality, not confidence thresholds.
- Every decision must be reconstructable and reproducible from the Evidence Chain.
- Human Review is the final escalation path, not the default uncertainty path.

This freeze affects Analyze Engine, AI Review, AI Draft Generation, validation, review decision rules, future AI vendor benchmarks, and future content factory production.

Runtime remains read-only and is not part of AI Review.

---

## P0-6B Scene Meaning Engine Freeze

Status: COMPLETE ✅

Git Tag: `p0-6b-scene-meaning-engine-freeze`

Source: `docs/P0_6B_SCENE_MEANING_ENGINE_FREEZE.md`

P0-6B freezes the architecture of the Scene Meaning Engine as the contextual understanding layer of the Analyze Pipeline.

Frozen architecture summary:

- Scene Meaning is an independent Evidence Engine.
- One subtitle owns one Scene Meaning.
- Multiple obstacles consume one Scene Meaning.
- Scene Meaning never decides obstacles.
- Scene Meaning produces evidence only.
- AI Review consumes Scene Meaning through the P0-6A Evidence Engine.
- Runtime never participates.
- Scene Meaning is not obstacle data.
- Scene Meaning is not Runtime data.
- Scene Meaning is reusable across Vocabulary, Comprehension, AI Review, QA, and future Analyze Pipeline components.
- Future Runtime continues to consume frozen artifacts only.

---

## P0-7A Pipeline Skeleton Freeze

Status: COMPLETE ✅

Git Tag: `p0-7a-pipeline-skeleton-freeze`

Source: `docs/P0_7A_PIPELINE_SKELETON_FREEZE.md`

P0-7A freezes the first complete Analyze Pipeline Skeleton.

Frozen architecture summary:

- P0-7A freezes the first complete Analyze Pipeline Skeleton.
- This is a wiring contract, not an algorithm task.
- The pipeline connects existing frozen engines without redesigning them.
- Frozen execution order:
  Subtitle Input
  → Scene Meaning Engine
  → Evidence Collection
  → Vocabulary Engine + Comprehension Engine
  → Draft Obstacle Assembly
  → AI Review
  → Decision Routing
  → Human Review
  → Frozen Promotion
  → Runtime Promotion
- Runtime never participates.
- Runtime remains read-only and consumes only frozen runtime artifacts.
- Batch processing is a volume change, not an architecture change.

---

## P0-7B Artifact Pipeline Freeze

Status: COMPLETE ✅

Git Tag: `p0-7b-artifact-pipeline-freeze`

Source: `docs/P0_7B_ARTIFACT_PIPELINE_FREEZE.md`

P0-7B freezes the Artifact Pipeline architecture for the Analyze Pipeline.

Frozen architecture summary:

- Artifact-first architecture.
- Artifact Contracts define every stage.
- Engines are implementations.
- Artifacts are architecture.
- Frozen Artifact Chain:
  Subtitle
  → Scene Meaning
  → Evidence
  → Draft
  → Review
  → Frozen
  → Runtime
- Artifact ownership: one stage owns one Artifact; many stages may consume it.
- Forward-only dependencies; no Artifact depends on a downstream Artifact.
- Artifacts are immutable after production.
- Artifacts are traceable.
- Artifacts are reproducible.
- Producers are replaceable as long as they emit a conforming Artifact.
- Runtime remains read-only and consumes only the Runtime Artifact.

---

## P0-7C Engine Integration Freeze

Status: COMPLETE ✅

Git Tag: `p0-7c-engine-integration-freeze`

Source: `docs/P0_7C_ENGINE_INTEGRATION_FREEZE.md`

P0-7C freezes the Engine Integration Contract for the Analyze Pipeline.

Frozen architecture summary:

- P0-7C freezes Engine Integration.
- Engines communicate only through frozen Artifacts.
- No Engine may directly invoke another Engine.
- No Engine may modify another Engine's Artifact.
- Failure propagates through Artifacts only.
- Retry recreates a new Artifact and never mutates an existing one.
- Future parallel execution is enabled through Artifact isolation.
- Runtime never participates and remains read-only.

---

## P0-7D Pipeline Constitution Freeze

Status: COMPLETE ✅

Git Tag: `p0-7d-pipeline-constitution-freeze`

Source: `docs/P0_7D_PIPELINE_CONSTITUTION_FREEZE.md`

P0-7D freezes the Constitution of the Analyze Pipeline — the highest architectural contract that governs every Analyze Engine.

Frozen architecture summary:

- P0-7D is the highest architectural contract; it is not an Engine, Artifact, or Pipeline stage.
- Constitutional principles: Evidence before Decision, Context before Analysis, Artifact before Engine, Immutable Artifacts, Forward-only Pipeline, Runtime Read-only, Analyze Generates, Runtime Consumes, Human Review is Final Escalation, Every Decision is Traceable, Every Artifact is Reproducible, Replaceable Producers, Stable Contracts.
- Constitutional Hierarchy:
  Pipeline Constitution
  → Pipeline Skeleton
  → Artifact Pipeline
  → Engine Integration
  → Individual Engines
  → Runtime
- Higher layers govern lower layers; lower layers never redefine higher layers.
- Governs Evidence Engine, Scene Meaning Engine, Vocabulary Engine, Comprehension Engine, AI Review, Human Review, Frozen Promotion, and Runtime Promotion.
- Future AI vendors, LLMs, prompts, batch generation, content factory, multiple shows, regression testing, replay, and QA are supported without changing Runtime.
- Architecture changes require a new Architecture Freeze; implementation changes do not.
- Runtime remains read-only and consumes only frozen runtime artifacts.

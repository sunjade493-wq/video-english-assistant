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

Sources: `docs/V29H_RUNTIME_CAPABILITY_FREEZE.md`, `docs/V29H_POS_SPEC_FREEZE.md`, `docs/V29H_VOCAB_CARD_DISPLAY_SPEC_FREEZE.md`, `docs/V29I_VOCAB_DISPLAY_DATA_CONTRACT_FREEZE.md`

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

Source: `docs/V29I_VOCAB_DISPLAY_DATA_CONTRACT_FREEZE.md`

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

Current / Next:

- V29I Runtime Fail Fast

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

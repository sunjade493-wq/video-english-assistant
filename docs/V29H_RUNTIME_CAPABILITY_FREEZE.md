# V29H Runtime Capability Freeze

## Scope

This document freezes the V29H runtime capability baseline only.

It does not freeze the final UI, visual design, card layout, or copywriting choices.

## Confirmed Runtime Capability

The real runtime is already capable of loading both canonical runtime data files:

- `output_text/v28d_bilingual_subtitles.json`
- `output_text/v29a_obstacles.json`

The frontend is already capable of distinguishing and displaying both obstacle categories:

- `[vocab]`
- `[comprehension]`

The current vocabulary card already has rendering capability for:

- `word`
- `baseForm` (optional)
- `phonetic`
- `partOfSpeech`
- `sentenceMeaning`

The current comprehension card already has rendering capability for:

- `prototype` / `phrase`
- `literal`
- `actual`
- `grammar`

## Explicit Non-Goals

The following items are not frozen by V29H:

- UI layout
- CSS styling
- field ordering
- wording
- typography
- spacing
- card redesign
- POS display format
- `baseForm` display style
- `sentenceMeaning` display style

## Recommended Next Tasks

1. V29H-1 UI Polish
2. V29H-2 POS Display Normalize
3. V29H-3 Vocabulary Card Redesign
4. V29I Runtime Fail Fast

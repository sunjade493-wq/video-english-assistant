
## V2.6G Follow-up Dedup Key Correction — 2026-06-19

The V2.6G obstacle dedup freeze is clarified as follows:

- Vocabulary items MUST dedupe by the full learning-item identity: `word + partOfSpeech + sentenceMeaning`.
- Vocabulary items MUST NOT dedupe by `baseForm` alone, because the same English form can represent different parts of speech or different sentence meanings.
- Example: `order | n./vt. | 命令` and `order | vt. | 点餐` are distinct learning items and must not be merged.
- Comprehension items continue to dedupe by normalized expression identity, not by direct `surfaceText`.
- Comprehension expression identity resolution priority is frozen as: `prototype > normalizedText > baseForm > phrase > text`.
- Implementations must expose and use `makeVocabularyDedupKey()` and `makeComprehensionDedupKey()` in the analyzer, runtime normalization, and obstacle generator layers.

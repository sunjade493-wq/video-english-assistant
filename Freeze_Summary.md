# Freeze Summary

## V2.7B Actual OpenAI-Compatible Episode Pipeline

Status: Implemented for human review. Not frozen.

V2.7B introduces a real episode obstacle generation path from `.srt` subtitles through an OpenAI-compatible provider and into generated frozen JSON. Runtime playback reads `sample-obstacles.json` only and must not call AI. Human review is still required before any V2.7B freeze declaration.


## V2.6B Analyze Engine Detection Pipeline

Status: Frozen ✅

### Principle #1

Analyze Engine is a content production tool.

Users do not run obstacle detection.

All obstacle data is generated before episode release and frozen.

Runtime only reads frozen obstacle data.

### Principle #2

Comprehension obstacle detection criteria:

* Fixed Expressions
* Phrasal Verbs
* Idioms
* Slang
* Spoken contractions
* Cultural expressions
* Elliptical expressions
* High-frequency TV expressions
* Cases where all words are known but the combined meaning is difficult

### Principle #3

Vocabulary level system:

* Junior High (1500)
* Senior High (3500)
* CET-4 (4500)
* CET-6 (6000)
* TEM-4 (8000)
* TEM-8 (12000)
* GRE (20000+)

Numbers are approximate vocabulary coverage references only.

### Principle #4

Analyze Engine uses:

* Vocabulary Pipeline
* Comprehension Pipeline
* Merge Pipeline

### Principle #5

Vocabulary obstacles are lemma-based.

Examples:

```text
lecture
lectures
lectured
lecturing

→ lecture
```

Spoken contractions such as:

```text
gonna
wanna
gotta
lemme
gimme
```

belong to Comprehension Pipeline.

### Principle #6

Vocabulary card format:

```text
project /ˈprɒdʒekt/

n./vt./vi.

Sentence meaning:
项目
```

Display:

* lemma
* phonetic
* all parts of speech
* sentence meaning

Do not display dictionary-style long definitions.

### Principle #7

Vocabulary detection strictly follows user-selected level.

Users choose the level.

The system executes the level.

No guessing of actual vocabulary knowledge.

### Principle #8

Vocabulary Pipeline detects individual words by default.

Named entities may be detected as a whole:

* person names
* locations
* countries
* brands
* organizations
* works/titles

Examples:

```text
New York
Microsoft
The Big Bang Theory
```

General phrases such as:

```text
credit card
high school
phone number
coffee shop
ice cream
```

are not treated as vocabulary units.

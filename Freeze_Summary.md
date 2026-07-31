# Freeze Summary

## V2.7C Obstacle Recall Optimization

Status: Frozen ✅

V2.7C freezes the recall-optimized comprehension obstacle generation prompt for the offline AI episode pipeline.

Frozen scope:

* Content production AI must scan every subtitle line.
* Detection must actively target fixed expressions, phrasal verbs, idioms, slang, spoken conversational chunks, multi-meaning expressions, context-dependent expressions, literal-vs-actual expressions, and common Chinese-learner confusion patterns.
* Multiple valid obstacles in the same subtitle must all be preserved.
* The prompt must not skip expressions merely because the words are simple.
* The prompt must avoid meaningless over-tagging of transparent literal phrases and ordinary grammar.
* V2.6E comprehension-card fields remain: Expression, 字面意思, 实际意思, 固定用法, 表示.
* Grammar Explanation, Usage Notes, and Example Sentences remain forbidden in generated comprehension cards.
* Runtime still never calls AI and only reads frozen JSON data.

Validation fixture candidates:

* No worries
* clear my head
* bottle it up
* threw me off
* saved me a seat
* grab coffee

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

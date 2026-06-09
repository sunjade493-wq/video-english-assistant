# Freeze Summary

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

## V2.6C Real AI Analyze Engine v1

Status: Frozen ✅

### Principle #9

Real AI analysis is allowed only during content production.

Runtime must not call AI.

Runtime only reads frozen episode obstacle data generated before release.

```text
Subtitles
→ AI Analyze during content production
→ Generate vocab obstacles + comprehension obstacles
→ Save frozen episode obstacle data
→ Runtime reads frozen obstacle data
```

### Principle #10

V2.6C keeps all V2.6B product rules frozen.

It does not redesign obstacle criteria, card structure, user level behavior, or runtime UI behavior.

### Principle #11

Vocabulary analysis uses Oxford 3000 / 5000 + CEFR mapping as the vocabulary source, then bridges that source into the frozen user-facing level system:

| Frozen user level | Approximate CEFR / Oxford known range |
| --- | --- |
| Junior High (1500) | A1–A2 |
| Senior High (3500) | A1–B1 |
| CET-4 (4500) | A1–B2 |
| CET-6 (6000) | A1–B2 |
| TEM-4 (8000) | A1–C1 |
| TEM-8 (12000) | A1–C1 |
| GRE (20000+) | A1–C2 plus advanced/non-Oxford vocabulary |

The numbers remain approximate vocabulary coverage references only.

### Principle #12

Frozen episode obstacle data must preserve subtitle order.

It must not group all vocab obstacles first or all comprehension obstacles first.

The same subtitle may contain:

* multiple vocab obstacles
* multiple comprehension obstacles
* vocab and comprehension obstacles together

### Principle #13

Comprehension grammar explanations must explain why the expression means what it means.

Do not only write:

```text
this is an idiom
```

or

```text
this is a fixed expression
```

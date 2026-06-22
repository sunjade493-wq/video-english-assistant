# P0 Comprehension Obstacle Determination Contract Freeze

Status: Frozen

Purpose:

Freeze the Comprehension Engine's obstacle determination contract before P0-4A AI-assisted Analyze Pipeline implementation.

This document provides the missing third layer in the Analyze Engine guidance chain:

Product Philosophy
↓
Vocabulary Contract
↓
Comprehension Contract
↓
Analyze Prompt
↓
AI Draft Generation

This is a documentation-only freeze.

Do not implement code.
Do not generate obstacles.
Do not call AI.
Do not call Qwen-VL.
Do not modify Runtime files.
Do not modify `script.js` or `styles.css`.
Do not modify `output_text` data files.

## 1. Core Definition

### Comprehension Obstacle

Even if every individual word is known,
if the real meaning of the expression cannot be immediately understood,
it shall be classified as a Comprehension Obstacle.

Chinese definition:

即使认识所有单词，
但表达的真实含义无法立即理解，
判定为理解障碍。

### Meaning-Level Principle

Comprehension Obstacles are meaning-level obstacles rather than vocabulary-level obstacles.

Chinese:

理解障碍是意义层面的障碍，而不是词汇层面的障碍。

## 2. Product-Level Rationale

Comprehension obstacles exist because knowing individual words does not guarantee understanding the expression.

The product identifies comprehension obstacles because they directly affect:

- Reading speed
- Listening comprehension
- Expression
- Writing
- Examination performance
- Real-world language ability

The Comprehension Engine exists to identify understanding barriers, not merely vocabulary gaps.

## 3. Priority Recognition Targets

The Comprehension Engine should prioritize the following categories:

1. Fixed Expressions

Examples:

- according to
- as far as I know
- no wonder

2. Collocations

Examples:

- make a decision
- take responsibility
- pay attention

3. Slang

Examples:

- You gotta be kidding me.
- No way.
- What's up?

4. Extended Meaning

Examples:

- I can't believe it.
- pull off
- figure out

5. Culture-dependent Expressions

Examples:

- According to tradition
- Thanksgiving dinner
- prom night

6. Phrase Meaning

Examples:

- hang the bedsheets outside
- start our honeymoon
- a couple of days

7. Sentence Meaning

Examples:

- where we're starting our honeymoon
- That explains everything.

8. Known Words But Difficult Combined Meaning

Expressions whose individual words may be known, but whose combined meaning remains difficult to understand.

## 4. Non-Obstacle Boundary

Not every useful sentence is a Comprehension Obstacle.

The following should not automatically become comprehension obstacles:

- Ordinary literal sentences
- Simple grammar patterns
- Common tone or politeness patterns
- Sentences that are directly understandable from individual words
- Broadly useful but not meaning-difficult expressions
- Expressions selected only because they are interesting or nice to learn

A sentence or expression should become a Comprehension Obstacle only when it creates a real understanding barrier for learners at the selected level.

### Usefulness Is Not Enough Principle

Usefulness alone does not justify creating a Comprehension Obstacle.

Chinese:

仅因为表达有学习价值，并不能成为生成理解障碍的理由。

## 5. Relationship With Vocabulary Obstacles

Vocabulary Obstacles and Comprehension Obstacles are separate obstacle types.

Vocabulary Obstacle:
The learner likely does not know the word or expression at the selected level.

Comprehension Obstacle:
The learner may know the words, but still cannot immediately understand the real meaning.

Both may coexist in the same subtitle.

Example:

We should hang the bedsheets outside.

Vocabulary Obstacles:

- bedsheets
- outside

Comprehension Obstacle:

- hang the bedsheets outside

The Comprehension Obstacle must not replace the Vocabulary Obstacles.
The Vocabulary Obstacles must not prevent the Comprehension Obstacle from being generated.

## 6. Boundary Selection Rules

Comprehension obstacle text boundaries must be meaningful and minimal.

Rules:

- Select the smallest phrase, clause, or sentence span that carries the comprehension difficulty.
- Do not select the entire sentence if a shorter phrase captures the obstacle.
- Do not select only one word if the difficulty comes from phrase or sentence meaning.
- Do not create nested comprehension obstacles unless they represent clearly different meanings.
- Avoid overlapping comprehension obstacles unless review explicitly approves them.
- Use exact source text boundaries from `source_en` whenever possible.

Examples:

Good:

- according to tradition
- pull off
- where we're starting our honeymoon

Too broad:

- Can you believe our little lamb is finally getting married?

Too narrow:

- tradition
  when the obstacle is according to tradition

## 7. Explanation Requirements

Comprehension obstacle explanations must explain WHY the expression means what it means.

Each Comprehension Obstacle should include:

- literal meaning
- actual meaning
- why the actual meaning is produced
- common transferable usage or extension

The explanation must not only translate the expression.

The goal is to help learners transfer understanding to future contexts.

## 8. Level Sensitivity

Comprehension obstacles are influenced by learner level, but they are not simple vocabulary-level lookups.

An expression may be a comprehension obstacle for Junior High or Senior High learners but not for GRE-level learners.

However, some idiomatic, cultural, or highly contextual expressions may remain comprehension obstacles even for advanced learners.

The Comprehension Engine should judge difficulty according to:

- learner level
- expression transparency
- idiomaticity
- cultural dependence
- contextual dependence
- likelihood of misunderstanding
- impact on comprehension and usage

## 9. AI Role

Comprehension Engine is AI-driven with rule validation.

AI may identify:

- fixed expressions
- collocations
- slang
- extended meanings
- culture-dependent meanings
- phrase-level meaning
- sentence-level meaning
- known-words-but-difficult-combined-meaning cases

Rule validation must check:

- schema validity
- obstacle boundary validity
- duplicate detection
- nested obstacle review
- overlap review
- type correctness
- explanation completeness

AI output remains draft until human review and script validation are complete.

## 10. Human Review Rules

Human review should confirm:

1. The obstacle is a real understanding barrier.
2. The obstacle is not merely a useful sentence.
3. The boundary is meaningful and minimal.
4. The explanation answers WHY, not only WHAT.
5. The obstacle type is correct.
6. False positives are removed.
7. Obvious false negatives are added or flagged for revision.

## 11. Runtime Boundary

Runtime is read-only.

Runtime must not:

- decide comprehension obstacles
- infer phrase meanings
- call AI
- generate explanations
- rewrite explanations
- generate obstacle IDs
- modify obstacle JSON

Runtime may only consume frozen obstacle data generated by the offline Analyze Engine.

# V2.6F Comprehension Obstacle Generation Freeze

Status: FROZEN

Date: 2026-06-19

## 1. Purpose

This document freezes the V2.6F generation boundary for Comprehension Obstacles.

The goal is to prevent ordinary spoken sentence patterns, tone patterns, politeness patterns, and generally useful expressions from being misclassified as Comprehension Obstacles. Over-generating these obstacles inflates obstacle count and interrupts the learner's viewing flow.

## 2. Core Definition

A Comprehension Obstacle means:

> The learner may know every individual word, but is still likely to misunderstand the expression.

A Comprehension Obstacle is not the same as:

- every sentence worth learning;
- every sentence with tone, attitude, or emotion;
- every high-frequency spoken pattern;
- every sentence that can be explained with literal meaning, actual meaning, or grammar notes.

## 3. Required Generation Criteria

A Comprehension Obstacle must satisfy all of the following criteria.

### 3.1 Fixedness or Non-Literal Meaning

The expression must have fixedness or non-literal meaning, including at least one of the following:

- idiom;
- phrasal verb;
- fixed expression;
- slang;
- culturally loaded expression;
- meaning not directly derivable from the individual words.

### 3.2 Plot-Comprehension Impact or Misunderstanding Risk

If the expression is not explained, it must either:

- clearly affect the learner's understanding of the current plot, interaction, or speaker intent; or
- be easy for the learner to misunderstand even if they know every word.

### 3.3 Transfer Value

The explanation must help the learner transfer the expression to other contexts.

The obstacle should teach a reusable expression pattern, not merely explain the current sentence in isolation.

## 4. Positive Examples

The following are examples that should be eligible for Comprehension Obstacle generation when they appear in suitable subtitle context:

- `pull off`
- `figure out`
- `call it a day`
- `No way`
- `It's up to you`
- `give somebody a hand`
- `under the weather`
- `piece of cake`

## 5. Negative Examples

The following should not be generated as Comprehension Obstacles in V2.6F:

- `Can you believe...?`
- `Are you serious?`
- `Would you mind...?`
- `Do you know...?`
- `I think so.`
- `I hope so.`
- `I guess so.`
- `Thank you.`
- `Good morning.`

These expressions may be useful for learning, but they are ordinary sentence patterns, tone patterns, politeness patterns, or basic routine expressions. They must not interrupt viewing flow as Comprehension Obstacles in the current MVP.

## 6. Special Frozen Rules

### 6.1 `Can you believe...?`

`Can you believe...?` is temporarily classified as non-obstacle.

Reason: it is a high-frequency surprise pattern and may be worth learning, but it usually does not prevent understanding of the current plot. It should not interrupt viewing in V2.6F.

### 6.2 `Are you serious?`

`Are you serious?` is temporarily classified as non-obstacle.

Reason: it is an ordinary spoken rhetorical / surprise pattern with low comprehension cost. It should not be counted as a Comprehension Obstacle in V2.6F.

### 6.3 `Would you mind...?`

`Would you mind...?` is temporarily classified as non-obstacle.

Reason: it is a polite request pattern and belongs to basic sentence-pattern learning. It should not be counted as a Comprehension Obstacle in V2.6F.

### 6.4 `Voila` / `voilà`

`Voila` / `voilà` should be treated as a Vocabulary Obstacle candidate, not a Comprehension Obstacle.

Reason: it is a word / interjection recognition issue. If the learner does not know it, the obstacle is vocabulary-level rather than expression-comprehension-level.

Recommended part of speech:

```text
interj.
```

Recommended current-sentence meaning:

```text
瞧；看；就是这样；搞定。
```

## 7. Native Expressions Deferred

The examples excluded from Comprehension Obstacles may later belong to a separate Native Expressions / 本集地道表达 system.

That system is not part of V2.6F and is not implemented in the current MVP.

Until that future system is explicitly frozen and implemented, these ordinary spoken patterns must:

- not display as Comprehension Obstacles;
- not interrupt the learner's viewing flow;
- not be included in the Comprehension Obstacle count.

## 8. Runtime UI Scope

This is a generation-rule freeze only.

V2.6F does not require Runtime UI changes unless a later implementation task explicitly requests them.

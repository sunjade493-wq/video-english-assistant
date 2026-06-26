# P0-5C Comprehension Obstacle Philosophy Freeze

Status: **FROZEN**

Version: **Final V1.0**

---

# 1. Purpose

This document freezes the product philosophy, generation principles, and Analyze Engine decision rules for Comprehension Obstacle generation.

The objective of this freeze is to establish a long-term, stable boundary between Vocabulary Obstacles and Comprehension Obstacles before the production pipeline expands beyond the first completed TBBT episode.

This freeze is intended to become the permanent reference for:

* Analyze Engine
* AI Draft Generation
* Human Review
* Future AI Vendor Benchmark
* Future Content Factory production

This document defines **product philosophy**, not model-specific behavior.

Future AI models may change.

The product philosophy defined here must not.

---

# 2. Freeze Scope

## This freeze affects

* Analyze Engine
* AI Draft Generation
* Human Review
* Future AI Benchmark
* Future Content Factory production rules

---

## This freeze does NOT affect

* Runtime
* Runtime rendering
* Runtime behavior
* Runtime read-only architecture
* UI
* Marker rendering
* Obstacle Data Contract
* Existing Runtime JSON format

Therefore,

P0-5C is an **Analyze Policy Freeze**.

It is **not** a Runtime Freeze.

---

# 3. Core Product Philosophy

Video English Assistant is **not** a dictionary.

The purpose of the product is not to explain as many English words as possible.

The purpose of the product is to remove learning obstacles that prevent users from understanding authentic English video content.

Therefore:

Vocabulary Obstacles and Comprehension Obstacles exist for different learning purposes.

Neither replaces the other.

Neither should duplicate the other.

---

# 4. Learning Objectives

Vocabulary Obstacles answer one question:

> **What does this word mean in this sentence?**

Comprehension Obstacles answer another question:

> **Why is this expression used here?**

These are different learning objectives.

They may refer to the same word, phrase, or subtitle line.

However, they must never teach the same knowledge.

---

# 5. Vocabulary Obstacle Responsibility

Vocabulary Obstacles are responsible for lexical understanding.

Their responsibility is limited to explaining the word itself.

A Vocabulary Obstacle may contain:

* word
* lemma
* phonetic
* partOfSpeech
* sentenceMeaning
* translation

The sentenceMeaning field explains the meaning of the word or phrase **inside the current sentence**, not every dictionary definition.

Vocabulary Obstacles must not explain:

* cultural background
* pragmatic meaning
* humor
* irony
* sarcasm
* character personality
* storytelling purpose
* why the speaker chose this wording

Vocabulary Obstacles answer only:

> **What does this word mean here?**

---

# 6. Comprehension Obstacle Responsibility

Comprehension Obstacles are responsible for contextual understanding.

Their responsibility is to explain knowledge that Vocabulary Obstacles cannot provide.

Comprehension Obstacles answer:

> **Why is this expression used here?**

Typical topics include:

* literal meaning vs actual meaning
* idiomatic meaning
* fixed expressions
* phrasal verbs
* cultural references
* pragmatic meaning
* implied meaning
* humor
* irony
* sarcasm
* double meaning
* character-specific speaking style
* grammar that changes interpretation
* dialogue intention
* story understanding

Comprehension Obstacles are not vocabulary explanations.

They exist only when additional contextual understanding is required.

---

# 7. Rule 1 — Vocabulary Responsibility

Vocabulary Obstacles are responsible for lexical learning only.

They must never expand into contextual explanation.

Vocabulary Obstacles shall teach:

* pronunciation
* part of speech
* sentence meaning
* translation

They shall not teach:

* humor
* culture
* storytelling
* pragmatic intention
* character personality
* dialogue design

If additional contextual understanding is required, that responsibility belongs exclusively to Comprehension Obstacles.

---

# 8. Rule 2 — Comprehension Responsibility

Comprehension Obstacles are responsible for contextual learning.

They explain why the current wording, expression, or sentence works in the current context.

They must never become another Vocabulary Obstacle.

They must never simply restate:

* word meaning
* sentenceMeaning
* translation
* dictionary explanation

Their responsibility begins where Vocabulary Obstacles end.

---

# 9. Rule 3 — New Learning Value Principle (Highest Principle)

This is the highest principle of P0-5C.

Every Comprehension Obstacle must provide learning value that cannot be obtained from the corresponding Vocabulary Obstacle.

If a Comprehension Obstacle merely repeats lexical information already provided by Vocabulary, it must be rejected.

The existence of a Comprehension Obstacle is justified only when it teaches something genuinely new.

Possible new learning value includes:

* why this wording was chosen
* why this expression sounds natural
* why the literal meaning differs from the intended meaning
* why the expression is humorous
* why the speaker deliberately chose a formal or informal register
* why the expression reflects the speaker's personality
* why the wording matters to the story
* what cultural or pragmatic knowledge is required to understand the dialogue

This principle has priority over obstacle count.

Learning value is more important than producing additional cards.

# 10. Rule 4 — Independent Learning Goal Rule

Every Comprehension Obstacle must have its own independent learning objective.

Before generating a Comprehension Obstacle, Analyze Engine must ask:

> **Does this obstacle teach something that the corresponding Vocabulary Obstacle cannot teach?**

If the answer is:

**YES**

The Comprehension Obstacle may continue to evaluation.

If the answer is:

**NO**

The Comprehension Obstacle must be rejected.

Independent learning objectives include, but are not limited to:

* understanding the speaker's intention
* understanding why a specific expression is chosen
* understanding cultural knowledge required by the dialogue
* understanding humor or irony
* understanding pragmatic meaning
* understanding why the audience understands the sentence differently from its literal meaning

---

# 11. Rule 5 — Vocabulary and Comprehension Coexistence Rule

Vocabulary Obstacles and Comprehension Obstacles are allowed to coexist on the same:

* word
* phrase
* subtitle
* dialogue

Coexistence is allowed only when they serve different learning objectives.

Vocabulary teaches:

> What does this word mean?

Comprehension teaches:

> Why is this expression used here?

If both obstacles teach different knowledge, coexistence is encouraged.

If they teach the same knowledge, coexistence is forbidden.

The Analyze Engine must avoid duplicate learning items.

---

# 12. Rule 6 — Reject Conditions

A Comprehension Obstacle must be rejected if any of the following conditions is true.

## Reject Condition 1

It only repeats the Vocabulary Obstacle.

---

## Reject Condition 2

It only repeats sentenceMeaning.

---

## Reject Condition 3

It only repeats the translation.

---

## Reject Condition 4

It provides no new learning value.

---

## Reject Condition 5

It does not help users understand the current dialogue.

---

## Reject Condition 6

It explains general English knowledge without improving understanding of the current sentence.

---

## Reject Condition 7

It behaves like a dictionary entry instead of contextual explanation.

---

## Reject Condition 8

It increases obstacle count without increasing learning quality.

---

If any Reject Condition is satisfied,

the Comprehension Obstacle must not be generated.

---

# 13. Rule 7 — Story Understanding First Principle

The purpose of Comprehension Obstacles is to improve understanding of the story.

Every explanation must ultimately help users understand one or more of the following:

* the dialogue
* the speaker
* the listener
* the character relationship
* the emotional effect
* the humor
* the dramatic purpose
* the cultural context
* the pragmatic intention

Comprehension Obstacles must never become:

* grammar textbooks
* dictionaries
* encyclopedias
* unrelated cultural articles

Every explanation should answer one question:

> **Why does this matter in this scene?**

---

# 14. Rule 8 — Analyze Engine Decision Tree

Analyze Engine shall follow the following decision process.

Step 1

Is there a genuine understanding difficulty beyond lexical meaning?

If NO

Reject.

If YES

Continue.

---

Step 2

Would the corresponding Vocabulary Obstacle alone completely solve the learner's understanding problem?

If YES

Reject.

If NO

Continue.

---

Step 3

Does this Comprehension Obstacle provide new learning value?

If NO

Reject.

If YES

Continue.

---

Step 4

Does it improve understanding of one or more of the following?

* story
* dialogue
* speaker intention
* character personality
* humor
* culture
* pragmatic meaning
* grammar that changes interpretation

If NO

Reject.

If YES

Generate Comprehension Obstacle.

---

# 15. Positive Example

Sentence:

> We consummated our marriage.

Vocabulary Obstacle

Word:

consummate

Sentence Meaning:

to make a marriage complete by having sexual intercourse

Translation:

圆房；使婚姻圆满完成

This Vocabulary Obstacle is correct because it teaches the lexical meaning.

---

Comprehension Obstacle

Literal Meaning:

to complete a marriage formally

Actual Meaning:

to have sexual intercourse after marriage

Explanation:

The expression "consummate the marriage" is a formal legal and religious expression.

Most native speakers would simply say "have sex."

Sheldon deliberately chooses an unusually formal expression because it matches his academic, highly intellectual speaking style.

The wording itself contributes to the humor of the dialogue.

Result:

Generate.

Reason:

The Comprehension Obstacle introduces entirely new learning value:

* register
* character personality
* humor
* dialogue understanding

Vocabulary alone cannot teach these.

---

# 16. Negative Example

Sentence:

> We consummated our marriage.

Vocabulary Obstacle

Word:

consummate

Sentence Meaning:

圆房

---

Comprehension Obstacle

Explanation:

"consummate" means "圆房" here.

Result:

Reject.

Reason:

The explanation merely repeats the Vocabulary Obstacle.

It introduces no additional learning value.

It fails the New Learning Value Principle.

# 17. Runtime Boundary

P0-5C is an Analyze Policy Freeze.

It does not change Runtime behavior.

Runtime remains read-only.

Runtime shall never:

* generate Vocabulary Obstacles
* generate Comprehension Obstacles
* infer obstacle types
* modify obstacle data
* rewrite explanations
* call AI models
* call OCR
* call Qwen
* call Claude
* call GPT
* call Gemini
* call Qwen-VL
* perform any real-time reasoning

Runtime only consumes frozen obstacle artifacts generated by the offline Analyze Pipeline.

This freeze has no impact on:

* Runtime architecture
* UI behavior
* Marker rendering
* Obstacle Data Contract

---

# 18. Analyze Engine Impact

P0-5C affects all future offline content production.

The following stages must comply with this freeze:

* Analyze Prompt Design
* AI Draft Generation
* Validation
* Human Review
* Review Decision
* Promotion
* Future AI Vendor Benchmark
* Future Content Factory production

Future AI models may change.

The product philosophy defined in this document shall remain unchanged unless a future Freeze explicitly replaces it.

---

# 19. Learning Value First Principle

This principle summarizes the design philosophy of Video English Assistant.

Video English Assistant does not pursue producing more obstacles.

Video English Assistant pursues producing more valuable learning obstacles.

Therefore:

Obstacle Count

does not equal

Learning Quality.

The quality of the product should be evaluated by:

* whether the obstacle removes a real learning difficulty
* whether it provides new learning value
* whether it improves story understanding
* whether it improves authentic English comprehension

Generating additional cards without additional learning value is considered a quality reduction rather than an improvement.

Future Analyze Engine optimization should always prioritize learning value over obstacle quantity.

---

# 20. Frozen Principle Summary

The following principles are permanently frozen under P0-5C.

Vocabulary Obstacles answer:

> What does this word mean in this sentence?

Comprehension Obstacles answer:

> Why is this expression used here?

Vocabulary Obstacles are responsible only for lexical understanding.

Comprehension Obstacles are responsible only for contextual understanding.

Vocabulary and Comprehension Obstacles may coexist on the same word, phrase, or subtitle line only when they teach different learning objectives.

Comprehension Obstacles must provide learning value that Vocabulary Obstacles cannot provide.

Comprehension Obstacles must be rejected if they:

* repeat Vocabulary
* repeat sentenceMeaning
* repeat translation
* provide no new learning value
* fail to improve understanding of the current dialogue

The highest design principle of Comprehension Obstacle generation is:

> **New Learning Value Principle**

The highest product philosophy introduced by P0-5C is:

> **Learning Value First.**

---

# 21. PROJECT_STATUS Reference

The corresponding entry inside:

docs/PROJECT_STATUS_V6.md

should remain a summary only.

The PROJECT_STATUS entry should contain:

* Milestone Name
* Status
* Source Document
* Short Summary
* Impact Scope

Recommended source reference:

Source:

docs/P0_5C_COMPREHENSION_OBSTACLE_PHILOSOPHY_FREEZE.md

PROJECT_STATUS should not duplicate the complete contents of this freeze document.

The standalone freeze document is the authoritative specification.

PROJECT_STATUS serves only as the project milestone index.

---

# Final Frozen Statement

P0-5C establishes the permanent philosophical boundary between Vocabulary Obstacles and Comprehension Obstacles.

Vocabulary Obstacles teach lexical meaning.

Comprehension Obstacles teach contextual understanding.

The Analyze Engine shall generate Comprehension Obstacles only when they provide new learning value beyond lexical explanation.

This freeze applies to all future offline content production and AI-assisted analysis.

Unless superseded by a future officially approved Freeze, this document shall remain the governing specification for Comprehension Obstacle generation.

---

**End of P0-5C Comprehension Obstacle Philosophy Freeze**

Version: Final V1.0

Status: FROZEN

===== END OF DOCUMENT =====

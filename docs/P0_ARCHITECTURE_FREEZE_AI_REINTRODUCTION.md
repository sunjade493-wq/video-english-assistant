========================================
P0 Architecture Principles
========================================

Principle 1
AI participates in offline preprocessing only.

AI may be used for:
- Obstacle identification
- Obstacle explanation generation
- Coordinate extraction

All AI processing happens offline only.


Principle 2
Runtime consumes frozen JSON only.

Runtime must never perform:
- Runtime OCR
- Runtime AI calls
- Runtime obstacle generation
- Runtime explanation generation
- Runtime marker generation
- Runtime coordinate inference

Runtime responsibilities are limited to:
- Load frozen JSON
- Render video
- Render obstacles
- Render markers


========================================
P0 Offline Analyze Pipeline
========================================

Subtitle
+
Learner Level
↓
Vocabulary Engine
( Rule-based + AI-assisted )
↓
Comprehension Engine
( AI-driven + Rule Validation )
↓
Generate Draft Obstacle JSON
↓
Human Review
+
Script Validation
↓
Freeze
↓
v29a_obstacles.json
↓
Qwen-VL Visual Mapping Engine
↓
word_boxes.json
↓
Runtime (Read-Only)


========================================
Vocabulary Judgment Contract
========================================

Vocabulary Obstacle
=
Beyond learner's vocabulary level.

A word or fixed expression that exceeds the learner's current vocabulary level shall be classified as a Vocabulary Obstacle.


Vocabulary Levels:

Junior High (1500)
Senior High (3500)
CET-4 (4500)
CET-6 (6000)
TEM-4 (8000)
TEM-8 (12000)
GRE (20000+)


Vocabulary Engine:
- Rule-based
- AI-assisted

AI may assist:
- Contextual meaning analysis
- Part-of-speech determination
- Sentence meaning generation
- Fixed expression recognition

Final vocabulary obstacle decisions must remain constrained by learner level rules.


========================================
Comprehension Judgment Contract
========================================

Even if every individual word is known,
if the real meaning of the expression cannot be immediately understood,
it shall be classified as a Comprehension Obstacle.

Priority recognition targets:

- Fixed Expressions
- Collocations
- Slang
- Extended Meaning
- Culture-dependent Expressions
- Phrase Meaning
- Sentence Meaning
- Expressions whose words are individually known but whose combined meaning remains difficult to understand


Comprehension Engine:
- AI-driven
- Rule Validation

Rule validation is responsible for:
- Output schema validation
- Obstacle boundary validation
- Deduplication
- Data consistency validation


========================================
Human Review Contract
========================================

Human review does not re-create all obstacles manually.

Human review responsibilities:

1. Validate overall obstacle count.
2. Randomly inspect approximately 20% of generated obstacles.
3. Fully inspect sentences containing multiple obstacles.
4. Fully inspect comprehension-heavy sentences.
5. Approve freeze only when obvious false positives and false negatives are absent.


========================================
Script Validation Contract
========================================

Validation scripts verify data integrity only.

Examples:

- obstacleId uniqueness
- allowed types:
    vocabulary
    comprehension
- non-empty text
- obstacleId continuity
- duplicate detection
- schema validation


========================================
Visual Mapping Engine
========================================

Qwen-VL responsibilities:

Existing obstacle
↓
Real subtitle coordinates
↓
word_boxes.json

Qwen-VL must never:
- Discover new obstacles
- Judge learning difficulty
- Decide whether something is an obstacle
- Modify obstacle count
- Run during Runtime

Qwen-VL only answers:

"Where does this obstacle appear on the screen?"


========================================
Marker Position Rules
========================================

Markers must be rendered below the white English burned subtitles.

Markers must never:
- Appear below Chinese subtitles
- Cover subtitles
- Drift into unrelated video regions


========================================
Marker Size Rules
========================================

Marker sizes shall be designed according to the current white English subtitle size.

Marker dimensions must not inherit the old yellow Chinese subtitle era sizing.


========================================
Marker Rendering Rules
========================================

Vocabulary Marker
- Compact yellow dots (···)
- Rendered immediately below the corresponding word
- Highest visual priority
- One obstacleId produces exactly one marker

Comprehension Marker
- Thin yellow underline (━━━━)
- Rendered below vocabulary markers
- Represents phrase-level or sentence-level understanding obstacles
- Width must not exceed the visual phrase boundary

Vocabulary and comprehension markers may coexist on the same subtitle line.
They are semantically independent and must remain visually distinguishable.


Example:

We should hang the bedsheets outside.
                     ···      ···
            ━━━━━━━━━━━━━━━━━━━

bedsheets
→ Vocabulary Obstacle

outside
→ Vocabulary Obstacle

hang the bedsheets outside
→ Comprehension Obstacle


========================================
Obstacle-Driven Rendering Rule
========================================

Marker
=
Obstacle
+
Coordinate

Only obstacleIds existing in v29a_obstacles.json may generate markers.

Qwen-VL may provide coordinates only for existing obstacles.

The system must never perform:

Video
↓
AI freely discovers obstacles
↓
Generate markers


========================================
Architecture Statement
========================================

AI determines WHAT should be learned.

Qwen-VL determines WHERE it appears.

Runtime only determines HOW to render it.

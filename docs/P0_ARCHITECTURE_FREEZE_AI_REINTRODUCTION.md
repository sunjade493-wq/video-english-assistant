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


========================================
P0 Pilot Roadmap Dependency Adjustment
========================================

Status: Frozen roadmap adjustment
Date: 2026-06-22

Completed work remains valid and must be kept:

- Fix ffmpeg detection
  - Status: Infrastructure Ready
- Qwen coordinate extraction
  - Status: Prototype Verified
- AI architecture freeze
  - Status: Frozen

P0-3D-C Marker Rendering is paused.

Reason:

Marker rendering is downstream work. Before finalizing runtime marker positioning, sizing, and binding rules, the project must first freeze:

1. AI obstacle identification
2. Frozen obstacle JSON generation
3. Coordinate extraction based on frozen obstacles

Previous marker rendering work is retained as prototype / spike validation only. It must not be treated as the final marker-rendering implementation contract.

New dependency order:

```text
P0-4A
AI-assisted Analyze Pipeline Pilot (2 min)

↓

P0-4B
Qwen Coordinate Extraction Pilot (2 min)

↓

P0-4C
Runtime Marker Rendering Pilot (2 min)

↓

P0-5
Expand From Pilot To Full Episode
```

Implementation constraints for the next phase:

- Do not continue implementing P0-3D-C for now.
- Do not modify marker rendering logic further until P0-4A and P0-4B outputs are frozen enough to consume.
- Do not write P0-4A implementation code as part of this roadmap adjustment.
- First update architecture documents and project status only.

========================================
P0-4A Pilot Contract Addendum
========================================

P0-4A freezes the AI-assisted analyze pipeline pilot for the first two minutes of `assets/videos/TBBT_S12E01.mp4`.

P0-4A output freezes to:

```text
output_text/v29a_obstacles_pilot.json
```

P0-4A is documentation and contract work only. It must not generate obstacles, call Qwen-VL, create cropped video assets, or modify Runtime marker rendering files.

The detailed P0-4A prompt contract, input schema, output schema, obstacleId naming rules, human review workflow, script validation rules, and pilot file naming conventions are frozen in:

```text
docs/P0_4A_ANALYZE_PIPELINE_PILOT_CONTRACT_FREEZE.md
```

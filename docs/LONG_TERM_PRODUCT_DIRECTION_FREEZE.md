# Long-Term Product Direction Freeze

Status: Frozen ✅

---

## Platform Direction

Platform provides built-in learning materials.

Users should not:

* upload videos
* upload subtitles
* manage learning resources

Users choose learning content by:

* interests
* difficulty level

Examples:

* The Big Bang Theory
* Friends
* Young Sheldon
* Peppa Pig

Principle:

Users are not responsible for finding learning materials.

The platform provides learning materials.

---

## Architectural Implications

Analyze Engine:

Responsible for producing learning data for platform-provided content.

Runtime:

Responsible for consuming generated learning data and presenting learning interactions.

The platform owns learning materials.

Users are not responsible for providing learning resources.

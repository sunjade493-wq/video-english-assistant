# Project Memory Rules

---

## 1. Repository Evidence First

Repository files are authoritative.

Chat memory is not authoritative.

Assistant memory is not authoritative.

Human recollection is not authoritative.

GitHub repository evidence is the canonical project state.

---

## 2. Conflict Resolution Rule

If the following sources conflict:

1. Chat history
2. Assistant memory
3. Human recollection
4. Repository documents

Repository documents always win.

Never overwrite repository facts using memory.

---

## 3. Verification Rule

Statements such as:

* "I remember..."
* "We discussed..."
* "I think we froze..."

are NOT considered freeze evidence.

Freeze evidence requires at least one of:

* freeze document
* specification document
* repository code evidence
* git history
* PR history

---

## 4. PROJECT_STATUS_V6 Generation Rule

PROJECT_STATUS_V6.md must be generated only from:

* repository freeze documents
* repository code evidence
* repository runtime evidence
* verified git history

Never generate PROJECT_STATUS_V6.md from chat memory alone.

---

## 5. Investigation First Rule

When uncertainty exists:

1. Investigate repository evidence.
2. Produce investigation report.
3. Freeze conclusions.
4. Update PROJECT_STATUS_V6.md.

Never guess project history.

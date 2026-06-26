# CLAUDE.md — Development Constitution

This document defines the permanent development rules for this repository.

All development work must comply with the principles defined here.

For project-specific architecture, frozen contracts, and current project status, always refer to:

- `docs/PROJECT_STATUS_V6.md`
- Relevant freeze documents referenced therein

---

## 1. Project Philosophy

### 1.1 Repository Evidence First

- **Repository files are the only authoritative source of truth.**
- Chat memory, assistant memory, and human recollection are not authoritative project state.
- When chat history, assistant memory, human recollection, and repository documents conflict, repository documents always win.
- Statements such as "I remember", "We discussed", or "I think we froze" are not freeze evidence.
- Freeze evidence requires repository freeze/specification documents, repository code evidence, git history, or PR history.

### 1.2 Frozen Documents Are Authoritative

- Frozen documents define immutable contracts.
- Never modify frozen behavior unless explicitly instructed to unfreeze.
- Never bypass frozen contracts through alternative implementations.
- Respect every freeze document referenced in `docs/PROJECT_STATUS_V6.md`.

### 1.3 Never Invent Architecture

- Read existing architecture before proposing changes.
- Do not introduce new abstractions, layers, or patterns without explicit instruction.
- Do not replace working implementations with "better" alternatives unless explicitly requested.
- Follow the existing codebase style, conventions, and libraries.

### 1.4 Preserve Production Behavior

- Production behavior must remain unchanged unless explicitly instructed.
- Do not enable experimental features for normal users without explicit approval.

---

## 2. Architecture Principles

### 2.1 Backend Generates, Runtime Consumes

**Backend / Analyze Engine is responsible for language intelligence:**

- Obstacle detection and validation
- Language data enrichment (phonetics, part of speech, translations, meanings)
- All AI-assisted processing (must remain offline)

**Runtime / Frontend is a read-only consumer.**

Runtime must never:

- Generate, infer, normalize, enrich, or repair language data
- Guess missing fields or fallback to alternative fields
- Call AI models, OCR, or external language services
- Modify JSON data files

### 2.2 Runtime Consumes Frozen Data Only

- Runtime may only consume explicitly frozen and approved data files.
- Runtime must never read draft files (e.g., `output_text/drafts/*`).
- Draft AI output must never be consumed directly by Runtime.

### 2.3 Runtime Must Fail Fast

- Runtime must not silently accept invalid data.
- Invalid items must be skipped with clear developer-facing diagnostics.
- Silent rendering of incomplete or invalid content is forbidden.

For specific required fields and validation rules, refer to relevant freeze documents in `docs/`.

---

## 3. Frozen Contract Rules

### 3.1 Respect Every Freeze Document

- All freeze documents referenced in `docs/PROJECT_STATUS_V6.md` are permanently binding unless explicitly unfrozen.
- Consult `docs/PROJECT_STATUS_V6.md` for the complete list of active freeze documents.

### 3.2 Never Bypass a Frozen Contract

If a requested change conflicts with a frozen contract:

1. Stop.
2. Explain the conflict clearly.
3. Reference the specific freeze document.
4. Do not implement the change.
5. Wait for explicit unfreeze instruction.

Do not:

- Work around the freeze through alternative implementations.
- Silently modify frozen behavior.
- Assume the freeze is outdated.
- Implement and warn afterward.

---

## 4. Task Guard Rails

### 4.1 Modify Only Explicitly Permitted Files

**For coding tasks:**

- Modify only files explicitly listed in the task instruction.
- Never modify unrelated files.

Example valid instruction:

```
Modify only:
- script.js
- styles.css

Do not modify:
- index.html
- analyze-engine.js
- output_text/*
```

**For documentation tasks:**

- Modify only documents explicitly listed in the task instruction.

### 4.2 PROJECT_STATUS_V6.md Safety Rule

`docs/PROJECT_STATUS_V6.md` is the bootstrap index of all frozen project knowledge.

**Hard safety rule:**

- Do not overwrite the entire document.
- Only append content to the specified section(s).
- Deleted lines in a `PROJECT_STATUS_V6.md` update must not exceed 5 lines.

### 4.3 Prefer Append or Minimal Edits

When updating frozen or status documents:

- Append new sections instead of rewriting existing sections.
- Make minimal edits to preserve git history clarity.
- Never silently remove frozen contracts.

---

## 5. Repository Reading Strategy

### 5.1 Read Only Relevant Documents

**Before every task:**

- Read only the documents directly related to the requested work.
- Do not scan the whole repository unless explicitly requested.
- Do not read all freeze documents for every task.

### 5.2 Minimize Token Usage

- Read targeted files only.
- Use `Grep` to locate relevant code before reading full files.
- Use `Glob` to discover file structure before reading.
- Avoid re-reading files already in context unless they changed.

### 5.3 Avoid Rereading Unchanged Files

If a file was read earlier in the conversation and has not been modified:

- Do not re-read it.
- Reference prior context instead.

---

## 6. Coding Standards

### 6.1 Keep Changes Minimal

- Change only what the task requests.
- Do not refactor unrelated code.
- Do not add features beyond the task scope.
- Do not introduce new abstractions unless explicitly requested.

### 6.2 Preserve Existing Architecture

- Match the existing code style.
- Use the same naming conventions.
- Follow the same comment density.
- Preserve the same idiom.

### 6.3 No Placeholder Implementations

Do not write:

```js
// TODO: implement this later
function generateObstacles() {
  return [];
}
```

Either implement the function completely, or do not create it.

### 6.4 No TODO Code

Do not leave `TODO`, `FIXME`, `HACK`, or `PLACEHOLDER` comments in committed code.

If implementation is incomplete:

- Stop and explain what is missing.
- Wait for further instruction.

### 6.5 Prefer Complete Implementations

When implementing a feature:

- Implement all required fields.
- Implement all required validation.
- Implement all required error handling.
- Do not ship partial implementations.

### 6.6 Fail Fast Instead of Silent Fallback

When encountering invalid data:

- Skip the invalid item.
- Emit clear diagnostic errors.
- Do not silently render incomplete content.
- Do not guess missing fields.
- Do not fallback to alternative fields.

Example forbidden fallback:

```js
// ❌ FORBIDDEN
const displayWord = obstacle.word || obstacle.lemma || obstacle.baseForm || 'Unknown';
```

Correct fail-fast behavior:

```js
// ✅ CORRECT
if (!obstacle.word) {
  console.error('Invalid vocabulary obstacle: missing required field "word"', obstacle);
  return; // skip this obstacle
}
const displayWord = obstacle.word;
```

---

## 7. Output Rules

### 7.1 Before Making Changes

**Summarize understanding:**

```
I understand the task is to:
- [list key objectives]
- [list key constraints]
```

**List risks:**

```
Risks:
- [potential conflict with frozen contract X]
- [potential unintended side effect Y]
```

**State the modification scope:**

```
Files to modify:
- [file1]
- [file2]

Files NOT to modify:
- [file3]
- [file4]
```

### 7.2 After Changes

**Summarize what changed:**

```
Changes completed:
- [change 1]
- [change 2]
```

**List modified files:**

```
Modified files:
- [file1]
- [file2]
```

**Stop:**

Do not:

- Continue to the next task without instruction.
- Propose additional improvements.
- Ask "what's next?"

Wait for further instruction.

---

## 8. Summary

This document defines the permanent development rules for this repository.

**Core principles:**

- Repository evidence always wins.
- Frozen documents are immutable contracts.
- Never invent architecture.
- Preserve production behavior.
- Backend generates, Runtime consumes.
- Runtime is read-only and must fail fast.
- Modify only explicitly permitted files.
- Read only relevant documents.
- Keep changes minimal and complete.

For project-specific architecture, vocabulary systems, comprehension obstacle rules, data contracts, validation environment requirements, and current project status, always refer to:

- `docs/PROJECT_STATUS_V6.md`
- Relevant freeze documents referenced therein

Future conversations must comply with this constitution.

---

**End of CLAUDE.md**

# P3-I Manual Runtime Acceptance Record

Status: **ACCEPTED (PASS)**

Stage: P3-I Manual Runtime Acceptance

Scope: First episode (TBBT S12E01) Offline AI Pipeline → Runtime card rendering under explicit opt-in.

This document records the manual, user-observed browser verification that the full Offline AI Pipeline successfully reached Runtime card rendering under explicit developer opt-in. It is a verification record only; it changes no code, no artifacts, and no Runtime behavior.

---

## 1. URL Used

```text
http://127.0.0.1:5500/?runtimeDisplay=1
```

Verified under Live Server, per the repository Development Environment Rule for real-video playback and HTML5 media interactions.

---

## 2. Runtime Card Rendered

A vocabulary card rendered from a promoted display record:

- `word`: on
- `phonetic`: /ɒn/
- `partOfSpeech`: prep.
- `sentenceMeaning`: 关于，有关（用于引出节目名称）

The card content originates entirely from promoted display `generatedFields`. Runtime did not generate, infer, or repair any field.

---

## 3. Console Evidence

```text
P3-G promoted display count: 2
P3-G promoted display validation passed
P3-G Runtime Display Consumption active: 2 promoted displays
active data source: promoted-display
obstacle count: 2
progress total: 2
progress key scope: promoted-display
```

---

## 4. Verified Working

- Real video displayed.
- Burned subtitles visible.
- Runtime card rendered from promoted display.
- Progress state isolated under `promoted-display`.
- Runtime remained read-only.
- No AI call in Runtime.
- No artifact modification in Runtime.

---

## 5. Known Warning

- A subtitle marker warning appears because promoted display records currently do not carry `markerStart` / `markerEnd`.
- This is **NOT** a blocker for Runtime card rendering.
- It should be tracked as a future marker binding stage.

---

## 6. Acceptance Conclusion

- **P3-I Manual Runtime Acceptance: PASS.**
- Offline AI Pipeline → AI QA → Promotion → Runtime card rendering is verified under `runtimeDisplay=1`.
- V1 architecture is functionally accepted except for future marker binding.

---

## 7. Next Recommended Stage

- **P3-J Marker Binding** for promoted display records.

---

## Boundary Notes

- This acceptance applies only to the explicit opt-in flow `?runtimeDisplay=1`.
- Default `/` behavior remains Production Flow, unchanged.
- The promoted display artifact remains not runtime-consumable at the artifact level: `runtimeMayConsume` and `runtimeDisplayMayConsume` both remain `false`. P3-I records observed Runtime consumption of promoted display content under developer opt-in; it does not change those frozen guard flags.
- Runtime remains a read-only consumer throughout.

---

**End of P3-I Manual Runtime Acceptance Record**

Status: ACCEPTED (PASS)

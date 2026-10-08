# JITEM production quality wave — 2026-10-08

Baseline: upstream `0c1fc08db3f050ebf34e237ef4fd1018ba223293`; TarikLab production/main `99c7ddb94b5f32b25c7186cd76e3a15bdf2d9836` (#145), confirmed READY and live SOURCE.json matched.

## Audit

- DONE: conditional event families, actor memory, independent faction knowledge, strategic atlas with exact move previews and delayed callbacks, schema-5 backup recovery. Baseline core tests: 83/83.
- PARTIAL: historical/source/game distinctions exist in records but need plain explanations at decision time. Resource glossary lacked actionable thresholds. Research and law remain experimental lines.
- MISSING: resource/support actions already implemented in the engine were absent from the current action UI.
- BROKEN: event sheet covered other mobile tabs; desktop event columns required at least 1080px at a 1024px breakpoint; embedded help had no bounded scroll owner; person file opened the first unrelated claim; rejected store moves falsely produced success feedback; mobile resolution report lacked its next-turn control; end-screen bottom alignment could hide overflow above the scroll origin.

## Changes

Restore existing support work with exact engine preview and role gates. Keep targeted evidence work in the contextual desk. Allow resolving a turn without forced spending (already supported by the engine). Fix event/tab ownership, flexible desktop columns, bounded help/end scrolling, HUD/atlas touch targets and warning contrast. Match the atlas background to the existing palette. Show held claims associated with the selected person. Separate record confidence from historical truth; label claim layers and explain fixed history versus player-created outcomes. Reject failed store commits without state/save/feedback writes.

No engine, source catalogue, historical event, assets, save key/schema or replay format replacement. No new historical assertions. TC SIM and all other games are outside this wave.

## Verification

- Full existing suite plus store regressions: 151 + 130 = 281 passing, zero failing.
- Typecheck PASS. Production build PASS.
- 50 deterministic campaign simulations: 5 endings, 0 softlocks, 0 early secrecy collapse, 0 resource saturation; no balance warnings. This is a regression sample, not a claim of perfect balance.
- Added browser checks for TR/EN at 320/390/1024/1440: event navigation, budget action, real save/reload, help scrolling and overflow. Existing atlas renderer/lifecycle checks retained.
- Local browser unavailable: Chromium download returned invalid/truncated archives. Cloud browser can render production; CI browser results are recorded in the release report.

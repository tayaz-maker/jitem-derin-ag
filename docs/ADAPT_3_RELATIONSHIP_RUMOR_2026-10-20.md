# ADAPT 3 — existing relationship risk in the existing rumor channel

Follows accepted Astra section 8 after ADAPT 2 (#28, canonical `042e5f489ad35dc29d723595e681a87d185181d6`). One pure helper in knowledge.ts reads current catalog edges, endpoint factions/appearance/death and existing propagationRisk. Player visibility is not world existence. The current ally roll uses the maximum eligible channel risk and the bounded 0.52–0.72 threshold; unrepresented/pre-appearance pairs retain 0.62. These coefficients are game balance choices, not historical measurements.

No new draw, ally/rival, source assertion, reputation/rumor engine, state field, resource transfer or UI. Existing source/recipient eligibility, RUMOR/confidence/risk reduction, one leak per tick and opaque note remain. Player hand/truth is not copied into NPC knowledge.

Two direct behavior regressions fail on baseline: same-roll low/high channels are indistinguishable, and an actual bag_koru cannot affect that rumor roll. New source acceptance: 9 targeted and 307/307 full tests, lint/typecheck/build PASS. The current eight balance styles each complete 50 deterministic campaigns (400 total), no softlock and more than one ending; existing balance tests remain.

Exact-head Chromium requires the prior 51 cases and 12 fixed-seed full-turn exposed/protected/closed channel cases at TR/EN × 1280/390. aiSeed 36 exercises a leak on the exposed channel and no leak after a real protection decision, followed by exact source-state comparison and reload. No historical claim is inferred. TarikLab production updates only through the subsequent controlled sync.

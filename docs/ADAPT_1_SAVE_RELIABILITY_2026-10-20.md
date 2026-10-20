# ADAPT 1 — save reliability

Accepted Astra handoff section 8, original report SHA-256: `2d767644511b2f5cc2a336dac1643b11adb7e18568c14ef4d333d9585fcc9bd3`. Baseline JITEM `37c5416e7a49b2ecc998f0d1071a7484d6e508c0`; TarikLab `cfa6d8c25652b33093ecc8734e6e8ae262d98dfe`. No direct code transfer.

One pure schema-5 plan parser serves save admission and defensive pending-plan inspection. Invalid tag contents/future explicit versions reject the entire candidate; missing legacy fields and unrelated string namespaces remain valid. Paid duplicate callbacks and late due-11/12 plans are preserved. Loading retains primary/backup/legacy priority and performs no writes.

Saving validates the outgoing payload, retains a differing valid primary as backup before replacement, preserves a good backup while recovering a corrupt primary, and leaves the backup generation stable on idempotent persistence. Failed/silent backup writes abort primary replacement. Key, envelope and schema 5 remain unchanged.

Five added behaviour regressions fail on baseline, then 13/13 targeted tests and 293/293 full tests PASS; lint/typecheck/build PASS with two existing lint warnings. Real Chromium matrix is required on the exact PR head: recover malformed semantic primary from good backup, commit twice, inspect previous-generation bytes, reload unchanged, TR/EN × 1280/390. Existing atlas/product/#26 support matrices remain mandatory. No production acceptance is inferred from local tests.

ADAPT 2 and 3 remain pending. Existing actor-family #24–26 fixes, visuals, gameplay loop, source catalogue, save identity and other games are untouched.

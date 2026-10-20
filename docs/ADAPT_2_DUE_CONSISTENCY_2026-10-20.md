# ADAPT 2 — consistent arrivals

Follows accepted Astra section 8 and ADAPT 1 (#27, canonical `2a07f673fff67779326ec38fa561d59c3850dae4`). Uses the current planning module, not an imported scheduler.

Same-due callbacks calculate against one group snapshot, aggregate their edge/stat/heat/hostility deltas and clamp once. Due groups remain chronological; notes use deterministic due/origin/method/target ordering. Paid identical callbacks retain multiplicity and consumed callbacks never replay.

Only quiet personal returns check the existing actor death/spent/abandoned/promise-broken fields. Unavailable contact has zero deltas, consumes the callback and refunds nothing; actor history and institutional/operational consequences remain. The existing summary/note slots provide TR/EN unavailable text. No layout, source catalogue, schema/key, RNG or turn-loop replacement; #24–26 family fixes are untouched.

Four behaviour regressions fail before the fix. Targeted operations 12/12, full 298/298, lint/typecheck/build PASS with two existing warnings. Exact-head CI additionally requires 20 real Chromium arrival/reload cases (both tag orders, living, betrayal, actual historical death × TR/EN × desktop/phone), plus all prior atlas/product/support/save matrices. Live product sync follows the three-group source acceptance; do not call an upstream merge a production deployment.

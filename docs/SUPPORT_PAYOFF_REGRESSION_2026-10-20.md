# Support payoff eligibility — production finding

Baseline: JITEM main 1171d15aff54a2758c46c514455bb2795014572f / TarikLab release 27beb9c1827ba893916aceb173c9109cf503d0d4. Live Chromium proof run 39413841246, artifact 12260003950.

The 12 targeted personal-memory/save-reload cases and eight existing product cases PASS. Their notes/screenshots reveal a separate semantic regression: after a real spend decision writes promise-broken, fam_promise_payoff still emits the kept-promise reward. A dead actor's retained protected tag also qualifies fam_protect_payoff. These are event-family eligibility gaps; #24/#25 correctly fixed their narrower tickMemory paths. Do not present the narrower PASS counts as full relationship acceptance.

Use the existing actorState predicate in those two families. Fresh support requires the same candidate actor to be alive, retain the relevant protected/kept tag, and have no spent/abandoned/broken-promise history. Keep triggers, historical records, negative/institutional consequences, source-backed scheduled events, UI/copy and schema 5 unchanged. A different living eligible source can still provide support, but its unrelated tag cannot satisfy another actor's promise. Older saved histories without promise-broken still respect spent/abandoned. No new historical claim or source catalogue change.

Three deterministic regressions fail on baseline and cover actual spend action, actual historical death anchor, same-actor attribution, living alternate source, legacy/save reload and nonmutation. The existing full source/Chromium CI must pass before merge. Full production acceptance and IHTILAL transfer/archival remain open; no game removal is justified by this patch.

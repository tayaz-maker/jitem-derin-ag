# JITEM #25 production acceptance checkpoint

TarikLab canonical release: 27beb9c1827ba893916aceb173c9109cf503d0d4. JITEM source canonical: 1171d15aff54a2758c46c514455bb2795014572f. Source #24/#25 and product #203/#204 merged. Game source, artwork, save schema and engine are unchanged by this QA checkpoint.

## Released bytes and build

www Vercel READY at the TarikLab release SHA. Live SOURCE.json pins the JITEM source SHA, key jitem-derin-ag-v3 and schema 5. Three live files match the exact clean integration build:

- runtime.js: 3658b08b7a2c377d4780a3ef37416a1d523f4ef02387bde873e4df35e622e7d9
- index.html: 72ae08ac3a49fda2617f54c74a606e339189d6943e2f221546dac890ace23a3a
- integration-TF9RduP9.css: 296c51f61752a2687927a7f1e8c30e9e55686753e9c5395894764b49c7429a81

Upstream accepted tests 285/285, lint/typecheck/build and built Chromium atlas 7/7 + product 8/8. Product integration 2/2, lint/typecheck/build PASS. Do not sum overlapping source/product/QA suites as one test count.

## Targeted live Chromium gate

Release-specific QA branch qa/jitem-production-1171 adds only a test and an isolated proof workflow. Workflow 39413841246 checks exact live source/three hashes before injecting any synthetic save, then verifies three scenarios × TR/EN × 1280/390 (12 cases): prior assistance → actual spend decision fixture → delayed personal talk/media consequence; historical death prevents fresh personal help; historical death prevents fresh personal talk. Real UI closes each turn; old actor memory and independent institutional notes remain, and reload/Continue must retain exact saved bytes without replay. A separate existing eight-case live product matrix covers fresh campaign, real stance/transaction, controls, file/help, scrolling and reload. Isolated contexts never read an existing user's saves. Workflow 39413841246 completed SUCCESS: 12/12 targeted cases and 8/8 existing live product cases PASS. Desktop/mobile artifact screenshots inspected. These assertions cover the named personal-memory tick boundaries, not every event-family callback. Artifact review proved a separate failure: retained protected/kept tags still allow positive event-family payoffs after death/broken promises. Full semantic acceptance remains PARTIAL pending a small event-family eligibility correction. Main software gates still require completion.

## Workers and boundaries

Workers deployment build PASS at the release SHA. Browser/runtime acceptance is UNKNOWN/BLOCKED after the observed client HTTP403 body error code 1010. Cloudflare documentation defines 1010 as rejection based on the browser signature: https://developers.cloudflare.com/support/troubleshooting/http-status-codes/cloudflare-1xxx-errors/error-1010/. This is access-layer evidence, not an observed JITEM engine exception. No security setting was weakened, client fingerprint spoofed, alternative endpoint tried or protection bypassed. Provider security-event access would be needed to identify the specific account rule; no such account-management connector is available. Workers browser is not certified.

Physical devices UNKNOWN. JITEM remains schema 5; TC SIM's independent SAVE_VERSION 6 is not shared. Existing legacy TR fragments in EN and absence of a distinct PL game locale remain limitations. Research/law are experimental, not full historical/legal simulations.

## IHTILAL transfer and archival gate

Source-backed compatibility table: TarikLab docs/jitem-derin-ag/IHTILAL_TRANSFER_GATE_2026-10-20.md; upstream docs/CONTINUATION_2026-10-20.md. IHTILAL baseline 69/69 PASS. Existing JITEM previews, delayed decisions, one-shot objective rewards, backup recovery and decision-derived reports already cover several useful principles; they must not be rewritten. The fictional seven-region aid network and card-game victory rules are not compatible drop-in modules. Missing conditional/covert alliance depth must use current faction/knowledge/relationship engines after production gates close.

Actual Resources entry is public/credits.html, linked by src/components/portal/portal-home.tsx. At the release commit it explicitly lists data-game=ihtilal with live route /oyna/ihtilal. Retirement must update that entry and all generated language variants, catalogue/category/list entries in src/lib/games.ts, locale entries in src/lib/i18n.ts, src/routes/ihtilal.tsx and generic play dispatch, generated routing, public/sw.js app-shell entry and direct/deep-link tests. Preserve exact source via a named archive ref before removal; keep user save keys and historical docs/source ledger. A source inventory finds 32 IHTILAL runtime/docs/script candidates at this commit (selection scope excludes unrelated assets and is not claimed exhaustive). No source or catalogue removal has occurred.

Release-transfer decision: do not mark full production acceptance, completed transfer or archival while required main/production gates or agreed transfer behaviours remain unresolved. Racon follows accepted transfer/retirement. Cards/Atlas/site optimization remain deferred.


## Correction checkpoint

JITEM PR #26: https://github.com/tayaz-maker/jitem-derin-ag/pull/26, current head 2657665d6a5574ffb6ae106bb5db054e6453fa05. Two event-family actorState guards reuse existing eligibility and keep old history/institutional consequences. Three fail-before source regressions now PASS; full source 288/288, lint/typecheck/build PASS. A targeted 12-case built Chromium living/betrayed/dead support and exact reload matrix was added to the unchanged required atlas/product workflow. Current-head browser CI remains required before merge, followed by exact-source product sync and renewed production acceptance.

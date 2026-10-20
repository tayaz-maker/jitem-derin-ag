# JITEM continuation and IHTILAL transfer gate

Source baseline: `63c21bca89050d1f3ac9982dd515073a256743b8` in `tayaz-maker/jitem-derin-ag`. Product baseline: TarikLab `133dbbd1912b91f651d474f2e14331e31d7becfe`. JITEM remains its own source canonical; do not hand-edit TarikLab's compiled `assets/runtime.js`. No TV characters, dialogue, plots or expressive assets are imported.

## Existing scope and evidence

| Area | Source evidence | Assessment |
|---|---|---|
| Conditional events, prerequisite/faction/history checks, followups | sim/families.ts; sim/engine.test.ts | DONE for existing ten-turn campaign; do not rebuild |
| Separate institutional knowledge, rivalry, allies and faction responses | sim/factions.ts, knowledge.ts, intel.ts | DONE for existing authored rules; new covert-relationship depth remains PARTIAL |
| Actor protection/use/spend, broken promises, leaks/help | sim/memory.ts; engine action handlers | PARTIAL: a prior helped tag incorrectly blocked all later betrayal reactions; corrected in this first small PR |
| Trust/dependency/secrecy/tension and propagation previews | sim/edges.ts, preview.ts; move-preview/operations-depth tests | DONE existing rules, not a full autonomous society |
| Delayed decisions, contextual options, exact engine previews | sim/planning.ts; operations-depth.test.ts | DONE existing due-turn mechanics; long-form player acceptance remains separate |
| Save/backup, deterministic replay | sim/save.ts, recap.ts; save-recovery.test.ts | DONE existing schema-5 scope; preserve key jitem-derin-ag-v3 |
| Language coverage | i18n TR/EN; production-quality-browser.mjs | TR/EN implemented; PL is MISSING as a distinct JITEM locale, not silently certified |
| Research/law branches | hats.ts, investigation.ts; existing product report | PARTIAL experimental lines, not a complete legal simulator |
| Physical devices and long-form human balance | No new physical evidence | UNKNOWN |

## First correction: previous help does not erase later betrayal

A deterministic seed-4 sequence first grants an actor's existing one-shot assistance, then commits the actual kisi_harca decision. The existing promise-break, heat and later media-rumour consequence should remain possible. Previously tickMemory skipped all actors carrying helped:<id>, permanently suppressing those consequences.

The correction keeps the historical help tag and one-shot assistance, the existing talk probability/impact, two-turn talk cooldown, save key and schema. It only allows the existing betrayal branch to evaluate once the existing talk threshold is met. Previously helped actors below that threshold still skip before consuming RNG, preserving the unaffected deterministic path. No new historical allegation or source record is added; this is an authored game consequence.

Regression evidence: the new sequence fails against the baseline with no talk/leak notes; after the fix it verifies actual decision → delayed leak → institutional rumour, input immutability, cooldown and identical serialized save/reload outcome. A second test retains one-shot help without betrayal.

## IHTILAL assessment (TarikLab source)

Inspected public/games/ihtilal/{engine,solo,basin-network,save,report,briefing}.js and its basin-network/preview/save tests. No direct IHTILAL imports or copied module were found in JITEM's source. Prior transfer is therefore NOT claimed complete.

| Useful rule | JITEM equivalent / decision | Next gate |
|---|---|---|
| Exact preview through the real move implementation | preview.ts already uses executeAction on a private copy; planning.ts exposes delayed result | Reuse existing JITEM path; no second engine |
| Due-date consequences and bounded log/history | planning.ts due tags, faction memory and event followups already exist | Check exact due turn and one application after reload in a dedicated compatibility group |
| Multi-hop regional pulses, immutable arrival snapshot, conserved capacity shipment | basin-network.js has seven fictional regions and its own state/calendar; JITEM uses source-backed actor/institution graph | Do not transplant fictional geography or state. Consider only a narrowly specified information-spread rule after proving a real JITEM gap |
| Fail-closed save and fallback backup | JITEM has schema-5 migration and backup recovery | Preserve JITEM save format; transfer validation ideas/tests only when a failing reproduction exists |
| End report explains actual compared values | JITEM dossier/causal narrative already derives from decisions and knowledge | Check that statements match known information; do not copy card-game victory rules |

## Controlled groups and archive dependencies

1. This PR: fix the confirmed memory-accountability regression using existing rules and tests; full upstream CI plus existing real Chromium product/atlas checks must PASS before merge.
2. Existing-engine integration: target only verified gaps in delayed consequences, faction memory/knowledge and player-visible causality; no blanket rewrite or duplicate systems. Preserve existing visuals and source/fact/game labels.
3. Product sync and archive gate: after upstream merge, clean exact-SHA build with the lockfile, sync generated output and SOURCE.json to TarikLab in one small integration PR. Verify product route, language, backup/reload and mobile. Only after the transfer checklist is explicitly closed may IHTILAL be removed from live catalogue and Resources.

IHTILAL archival must first preserve a named GitHub ref at the exact pre-removal commit and inventory runtime, original cards, source ledger, docs, tests and saves. Then audit catalogue src/lib/games.ts, localized catalogue entries, /ihtilal redirect, /oyna/$slug dispatch, Resources links/content, service-worker app-shell entries, route tests and historical deep links. Keep archived source and user saves; removal from discoverable live routes is not source deletion. Do not mark archived or unpublish before those gates pass. No runtime/catalogue removal occurs in this PR.

Racon Manager follows verified JITEM transfer/archive. Kıyı Eşiği (slug esik) needs its own reuse assessment and preserved GitHub archive before removal. Cards, Anatomy Atlas, comic-map production and site optimization remain deferred.

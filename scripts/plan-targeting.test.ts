import assert from "node:assert/strict";
import { test } from "node:test";
import { createGame, executeAction, startActions } from "../src/game/engine.ts";
import { decisionOptions, planMethods, targetClaims, tickPlans } from "../src/game/sim/planning.ts";
import { EDGES } from "../src/game/data.ts";
import { serialize, parseSave } from "../src/game/sim/save.ts";

test("network methods alter edges, spend real resources and return after their due turn", () => {
  let state = startActions(createGame("saha", 71));
  state = { ...state, turn: 3, actionsLeft: 4 };
  const edge = EDGES.find((e) => state.revealed[e.from] && state.revealed[e.to])!;
  assert.ok(edge);
  const target = { kind: "edge" as const, id: edge.id, label: edge.label };
  const id = decisionOptions(state, target).find((id) =>
    planMethods(state, id).includes("operational"),
  )!;
  const quiet = executeAction(state, { id, edgeId: edge.id, method: "quiet", contextual: true });
  const fast = executeAction(state, {
    id,
    edgeId: edge.id,
    method: "operational",
    contextual: true,
  });
  assert.notDeepEqual(quiet.edgeLive[edge.id], fast.edgeLive[edge.id]);
  assert.equal(fast.actionsLeft, quiet.actionsLeft - 1);
  assert.equal(fast.stats.kara, quiet.stats.kara - 4);
  assert.ok(quiet.tags.some((t) => t.startsWith("plan-due:5:")));
  const notes: string[] = [];
  const early = tickPlans({ ...quiet, turn: 4 }, notes);
  assert.equal(notes.length, 0);
  const resumed = parseSave(JSON.stringify(serialize(early)))!;
  assert.ok(resumed);
  const due = tickPlans({ ...resumed, turn: 5 }, notes);
  assert.equal(notes.length, 1);
  assert.match(notes[0], /note.plan.quiet/);
  assert.equal(
    due.tags.some((t) => t.startsWith("plan-due:")),
    false,
  );
  tickPlans(due, notes);
  assert.equal(notes.length, 1);
});
test("contextual repeated action is not spent twice and unavailable methods cannot run", () => {
  const state = { ...startActions(createGame("saha", 71)), turn: 3, actionsLeft: 4 };
  const edge = EDGES.find((e) => state.revealed[e.from] && state.revealed[e.to])!;
  const p = {
    id: "bag_gozet" as const,
    edgeId: edge.id,
    method: "quiet" as const,
    contextual: true,
  };
  const next = executeAction(state, p);
  assert.ok(next.actionsLeft < state.actionsLeft);
  assert.equal(executeAction(next, p), next);
  const poor = { ...state, stats: { ...state.stats, kara: 0 } };
  assert.equal(executeAction(poor, { ...p, method: "operational" }), poor);
});
test("research decisions are bound to a held record about the actual selected actor", () => {
  const state = { ...startActions(createGame("arastirmaci", 71)), turn: 3, actionsLeft: 4 };
  const target = { kind: "node" as const, id: "dogan", label: "Doğan" };
  const claims = targetClaims(state, target);
  assert.ok(claims.length);
  const claim = claims.find((c) =>
    decisionOptions(state, target, c.id).includes("kaynak_karsilastir"),
  );
  if (claim) {
    const next = executeAction(state, {
      id: "kaynak_karsilastir",
      nodeId: "dogan",
      claimId: claim.id,
      contextual: true,
    });
    assert.ok(next.investigation.comparisons?.some((c) => c.claimId === claim.id));
  }
  assert.deepEqual(decisionOptions(state, target, "not-held"), []);
});

// Keep the focused role acceptance in the existing CI test entry point.
import "./role-objectives.test.ts";
import { claimEvidence, recordComparison } from "../src/game/sim/investigation.ts";
import { syncObjectives } from "../src/game/sim/objectives.ts";
import { diffState, moveInput, previewMove } from "../src/game/sim/preview.ts";

test("proof uses distinct sources for the selected claim, never generic or other-claim documents", () => {
  const a = "clm_official_denial";
  const b = "clm_jitem_exists";
  let s = startActions(createGame("hukuk", 42));
  s = executeAction(s, { id: "delil_zincir", claimId: a });
  const first = structuredClone(s);
  s = executeAction(s, { id: "dosya_oku" });
  const withGeneric = structuredClone(s);
  s = { ...s, turn: 2, actionsLeft: 4 };
  const held = executeAction(s, { id: "kanit_esigi", claimId: a });
  assert.ok(!held.tags.includes("inv-direct"));
  assert.ok(held.tags.includes("inv-limit"));
  assert.deepEqual(held.investigation.documents, withGeneric.investigation.documents);
  const foreign = recordComparison(s, b, ["src_dogan", "src_aygan"]);
  assert.equal(claimEvidence(foreign, a).sufficient, false);
  const target = { kind: "node" as const, id: "jitem", label: "JİTEM" };
  assert.ok(decisionOptions(s, target, a).includes("delil_zincir"));
  const second = executeAction(s, { id: "delil_zincir", claimId: a, nodeId: "jitem", contextual: true });
  assert.equal(claimEvidence(second, a).sufficient, true);
  assert.equal(claimEvidence(second, a).sources.size, 2);
  const plan = { id: "kanit_esigi" as const, claimId: a, nodeId: "jitem", contextual: true };
  const before = structuredClone(second);
  const preview = previewMove(second, plan);
  const committed = executeAction(moveInput(second, plan), plan);
  assert.deepEqual(preview.changes, diffState(second, committed));
  assert.ok(committed.tags.includes("inv-direct"));
  assert.deepEqual(second, before);
  assert.equal(committed.actionsLeft, second.actionsLeft - 2);
  // A relevant comparison is another paid research contribution, if present
  // in a legacy/imported dossier; an unrelated comparison above was not.
  const compared = recordComparison(first, a, ["src_dogan", "src_tbmm_susurluk"]);
  assert.equal(claimEvidence(compared, a).sufficient, true);
  const repeat = executeAction({ ...second, actionsLeft: 4, turn: 3 }, { id: "delil_zincir", claimId: a });
  assert.deepEqual(repeat.investigation.chain, second.investigation.chain);
  assert.deepEqual(repeat.investigation.documents, second.investigation.documents);
});

test("generic duplicate reads count actual unique notes, while legacy notes and completions survive", () => {
  let s = startActions(createGame("saha", 42));
  s = executeAction(executeAction(s, { id: "dosya_oku" }), { id: "dosya_oku" });
  assert.deepEqual(s.investigation.documents, ["dosya-t1"]);
  const projected = syncObjectives({ ...s, turn: 9 });
  assert.equal(projected.objectives.find(o => o.id === "obj_chain")?.status, "open");
  const later = executeAction({ ...s, turn: 2, actionsLeft: 4 }, { id: "dosya_oku" });
  assert.equal(syncObjectives({ ...later, turn: 9 }).objectives.find(o => o.id === "obj_chain")?.status, "done");
  const legacy = structuredClone(s);
  delete legacy.investigation.comparisons;
  delete legacy.investigation.chain;
  const resumed = parseSave(JSON.stringify(serialize(legacy)))!;
  assert.deepEqual(resumed.investigation.documents, ["dosya-t1"]);
  assert.equal(claimEvidence(resumed, "clm_official_denial").sufficient, false);
});

import { ALL_CLAIMS } from "../src/game/db/catalog.ts";
import { buildDossier, displayDossier, formatReplayJson, researchHistory } from "../src/game/sim/recap.ts";

test("actual claim, actor and edge targets survive schema-5 reload; failed and legacy actions gain no invented target", () => {
  let s = { ...startActions(createGame("arastirmaci", 42)), actionsLeft: 20 };
  s = executeAction(s, { id: "kaynak_karsilastir" });
  const a = s.investigation.comparisons![0].claimId;
  assert.equal(s.decisions.at(-1)?.target, a, "fallback records actual selected claim");
  for (const id of ["src_tut", "src_paylas", "src_yayin", "dogrula"] as const) {
    s = executeAction(s, { id, claimId: a });
    assert.equal(s.decisions.at(-1)?.target, a);
  }
  const h = executeAction(startActions(createGame("hukuk", 42)), { id: "delil_zincir" });
  assert.equal(h.decisions.at(-1)?.target, h.investigation.chain![0].claimId);
  let f = { ...startActions(createGame("saha", 42)), turn: 3, actionsLeft: 10 };
  const edge = EDGES.find(e => f.revealed[e.from] && f.revealed[e.to])!;
  f = executeAction(f, { id: "bag_gozet", edgeId: edge.id });
  assert.equal(f.decisions.at(-1)?.target, edge.id);
  f = executeAction(f, { id: "kisi_koru", nodeId: "dogan" });
  assert.equal(f.decisions.at(-1)?.target, "dogan");
  for (const state of [s, h, f]) {
    const resumed = parseSave(JSON.stringify(serialize(state)))!;
    assert.deepEqual(resumed.decisions, state.decisions);
    assert.equal(resumed.schemaVersion, 5);
  }
  const legacy = structuredClone(s);
  for (const d of legacy.decisions) delete d.target;
  const raw = JSON.stringify(serialize(legacy));
  const resumed = parseSave(raw)!;
  const before = JSON.stringify(serialize(resumed));
  formatReplayJson(resumed); displayDossier(resumed, "en");
  assert.equal(JSON.stringify(serialize(resumed)), before);
  assert.ok(resumed.decisions.every(d => d.target === undefined));
  const invalid = executeAction(startActions(createGame("saha", 42)), { id: "bag_gozet", edgeId: "nonexistent" });
  assert.equal(invalid.decisions.at(-1)?.target, undefined);
});

test("different investigations produce personal final dossiers, with unresolved claims kept unresolved", () => {
  const base = { ...startActions(createGame("arastirmaci", 42)), actionsLeft: 20 };
  const claims = ALL_CLAIMS.filter(c => c.contradiction && base.hand[c.id]?.status && base.hand[c.id].status !== "UNKNOWN");
  assert.ok(claims.length >= 2);
  const run = (id: string) => executeAction(executeAction(base, { id: "kaynak_karsilastir", claimId: id }), { id: "src_yayin", claimId: id });
  const a = run(claims[0].id), b = run(claims[1].id);
  const ah = researchHistory(a), bh = researchHistory(b);
  assert.notDeepEqual(ah, bh);
  const row = ah.find(c => c.claimId === claims[0].id)!;
  assert.ok(row.opened && row.compared && row.published && row.openQuestion);
  assert.equal(row.status, "PARTIAL");
  const foreign = ALL_CLAIMS.find(c => c.contradiction && (!a.hand[c.id] || a.hand[c.id].status === "UNKNOWN"))!;
  // A stale pre-fix final cache must not reintroduce unencountered catalogue material.
  a.dossier = { ...buildDossier(a), contradictions: [foreign.contradiction!] };
  for (const locale of ["tr", "en"] as const) {
    const dossier = displayDossier(a, locale);
    assert.ok(!dossier.contradictions.some(x => x.includes(foreign.contradiction!)));
    assert.notDeepEqual(dossier.causal, displayDossier(b, locale).causal);
    assert.match(dossier.causal.at(-1)!, locale === "en" ? /unresolved/ : /çözülmüş sayılmaz/);
  }
  const replay = formatReplayJson(a);
  assert.deepEqual(replay.research, ah);
  assert.ok(replay.decisions.some(d => d.target === claims[0].id));
  const field = createGame("saha", 42);
  assert.ok(buildDossier(field).contradictions.every(line => ALL_CLAIMS.some(c =>
    field.hand[c.id]?.status !== "UNKNOWN" && field.hand[c.id] && line.startsWith(c.title + ":"))));
});

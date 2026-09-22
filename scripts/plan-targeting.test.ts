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
  let notes: string[] = [];
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
  let state = { ...startActions(createGame("saha", 71)), turn: 3, actionsLeft: 4 };
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

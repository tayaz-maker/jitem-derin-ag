import assert from "node:assert/strict";
import { test } from "node:test";
import { createGame, executeAction, startActions } from "../src/game/engine.ts";
import {
  decisionOptions,
  planDue,
  planMethods,
  pendingPlans,
  tickPlans,
  QUIET_BURN_HEAT,
  type PlanMethod,
} from "../src/game/sim/planning.ts";
import { OBJECTIVE_REWARDS, syncObjectives } from "../src/game/sim/objectives.ts";
import { previewMove } from "../src/game/sim/preview.ts";
import { EDGES } from "../src/game/data.ts";
import { serialize, parseSave } from "../src/game/sim/save.ts";
import type { GameState } from "../src/game/types.ts";

function setup(seed = 71) {
  let state = startActions(createGame("saha", seed));
  state = { ...state, turn: 3, actionsLeft: 4, stats: { ...state.stats, etki: 20, kara: 20 } };
  const edge = EDGES.find((e) => state.revealed[e.from] && state.revealed[e.to])!;
  const target = { kind: "edge" as const, id: edge.id, label: edge.label };
  const id = decisionOptions(state, target).find((a) => planMethods(state, a).length === 3)!;
  return { state, edge, id };
}

const vector = (before: GameState, after: GameState, edgeId: string) => [
  after.stats.etki - before.stats.etki,
  after.stats.kara - before.stats.kara,
  after.stats.bilgi - before.stats.bilgi,
  before.stats.hukuk - after.stats.hukuk,
  before.investigation.heat - after.investigation.heat,
  after.edgeLive[edgeId].trust - before.edgeLive[edgeId].trust,
  after.edgeLive[edgeId].secrecy - before.edgeLive[edgeId].secrecy,
  after.actionsLeft - before.actionsLeft,
];

test("no approach dominates another once its delayed half has landed", () => {
  const { state, edge, id } = setup();
  const out: Record<string, number[]> = {};
  for (const m of ["quiet", "institutional", "operational"] as PlanMethod[]) {
    const now = executeAction(state, { id, edgeId: edge.id, method: m, contextual: true });
    const due = pendingPlans(now).at(-1)!;
    out[m] = vector(state, tickPlans({ ...now, turn: due.due }, []), edge.id);
  }
  for (const a of Object.keys(out))
    for (const b of Object.keys(out)) {
      if (a === b) continue;
      const dominates = out[a].every((v, i) => v >= out[b][i]) && out[a].some((v, i) => v > out[b][i]);
      assert.equal(dominates, false, `${a} dominates ${b}: ${out[a]} vs ${out[b]}`);
    }
  // Each approach buys something the others do not.
  assert.ok(out.institutional[3] > out.quiet[3], "institutional builds legal cover");
  assert.ok(out.operational[2] > out.quiet[2], "operational yields intelligence now");
  assert.ok(out.quiet[7] > out.operational[7], "quiet costs no extra action");
});

test("a quiet contact burns when the investigation is hot, and the desk says so first", () => {
  const { state, edge, id } = setup();
  const plan = { id, edgeId: edge.id, method: "quiet" as const, contextual: true };
  const cold = previewMove(state, plan);
  assert.equal(cold.due?.effect.outcome, "returned");
  const hotState = { ...state, investigation: { ...state.investigation, heat: QUIET_BURN_HEAT } };
  const hot = previewMove(hotState, plan);
  assert.equal(hot.due?.effect.outcome, "burned");
  const now = executeAction(hotState, plan);
  const notes: string[] = [];
  const landed = tickPlans({ ...now, turn: hot.due!.turn }, notes);
  assert.match(notes[0], /note.plan.burned/);
  assert.equal(landed.edgeLive[edge.id].trust, now.edgeLive[edge.id].trust + hot.due!.effect.edge.trust!);
  assert.equal(landed.stats.giz, now.stats.giz + hot.due!.effect.stats.giz!);
});

test("the projected delayed effect is exactly what lands if nothing changes", () => {
  for (const m of ["quiet", "institutional", "operational"] as PlanMethod[]) {
    const { state, edge, id } = setup(113);
    const plan = { id, edgeId: edge.id, method: m, contextual: true };
    const p = previewMove(state, plan);
    const now = executeAction(state, plan);
    const landed = tickPlans({ ...now, turn: p.due!.turn }, []);
    for (const [k, v] of Object.entries(p.due!.effect.edge))
      assert.equal(
        landed.edgeLive[edge.id][k as "trust"],
        Math.max(0, Math.min(100, now.edgeLive[edge.id][k as "trust"] + (v ?? 0))),
        `${m} ${k}`,
      );
    assert.equal(landed.investigation.heat, now.investigation.heat + p.due!.effect.heat, m);
  }
});

test("objective rewards pay once, survive save/load and show in the preview", () => {
  const { state, edge } = setup();
  const target = { kind: "edge" as const, id: edge.id, label: edge.label };
  const strengthen = decisionOptions(state, target).find((a) => a === "bag_guclendir" || a === "bag_gevset");
  assert.ok(strengthen, "a tie move is available");
  const synced = syncObjectives({ ...state, turn: 1 });
  const plan = { id: strengthen!, edgeId: edge.id, method: "quiet" as const, contextual: true };
  const p = previewMove({ ...synced, turn: 1 }, plan);
  assert.deepEqual(p.rewards, ["obj_edge"]);
  const after = executeAction({ ...synced, turn: 1 }, plan);
  assert.ok(after.tags.includes("obj-reward:obj_edge"));
  const again = syncObjectives(syncObjectives(after));
  assert.equal(again.stats.etki, after.stats.etki, "paid once");
  const resumed = parseSave(JSON.stringify(serialize(again)))!;
  assert.equal(syncObjectives(resumed).stats.etki, after.stats.etki, "not paid again after load");
  assert.equal(OBJECTIVE_REWARDS.obj_edge.etki, 3);
});

test("old plan tags from saves before this change still land", () => {
  const { state, edge } = setup();
  const legacy = { ...state, tags: [...state.tags, `plan-due:4:institutional::${edge.id}:3`] };
  const notes: string[] = [];
  const landed = tickPlans({ ...legacy, turn: 4 }, notes);
  assert.equal(notes.length, 1);
  assert.equal(landed.tags.some((t) => t.startsWith("plan-due:")), false);
  assert.equal(planDue(legacy, "institutional", undefined, edge.id).outcome, "response");
});

test("a desk move commits exactly its preview even while a person is selected on the map", async () => {
  const mem = new Map<string, string>();
  (globalThis as { localStorage?: unknown }).localStorage = {
    getItem: (k: string) => mem.get(k) ?? null,
    setItem: (k: string, v: string) => void mem.set(k, v),
    removeItem: (k: string) => void mem.delete(k),
  };
  const { useGame } = await import("../src/game/store.ts");
  const { state, edge, id } = setup();
  const selectedPerson = edge.from;
  const withSelection = { ...state, selectedNodeId: selectedPerson, selectedEdgeId: null };
  const plan = { id, edgeId: edge.id, method: "operational" as const, contextual: true };
  const expected = previewMove(withSelection, plan).changes;
  useGame.setState({ state: withSelection });
  useGame.getState().play(plan);
  assert.deepEqual(useGame.getState().lastResult?.changes, expected);
});

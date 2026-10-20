import assert from "node:assert/strict";
import { test } from "node:test";
import { applyEvent, createGame, executeAction, startActions } from "../src/game/engine.ts";
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
import { remember } from "../src/game/sim/memory.ts";

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

test("pending plans tolerate malformed in-memory rows but keep paid duplicate callbacks", () => {
  const state = createGame("saha", 71);
  const tag = "plan-due:12:quiet:ersever::10";
  const tags = [null, 7, "plan-due:bad:quiet:ersever::2", "foreign:keep", tag, tag];
  assert.deepEqual(pendingPlans({ ...state, tags } as never).map(p => p.tag), [tag, tag]);
  assert.deepEqual(pendingPlans({ ...state, tags: null } as never), []);
});

const sameDue = ["plan-due:4:institutional::dogan-ersever:3", "plan-due:4:quiet::dogan-ersever:2"];
function arrivalState(tags = sameDue): GameState {
  const state = createGame("saha", 71);
  return { ...state, turn: 4, investigation: { ...state.investigation, heat: 34 }, tags,
    revealed: { ...state.revealed, dogan: true, ersever: true } };
}

test("same-due plans use one arrival snapshot and deterministic semantic notes", () => {
  const aNotes: string[] = [], bNotes: string[] = [];
  const state = arrivalState(); const original = structuredClone(state);
  const a = tickPlans(state, aNotes), b = tickPlans(arrivalState([...sameDue].reverse()), bNotes);
  assert.equal(a.edgeLive["dogan-ersever"].trust, 61);
  assert.equal(a.stats.giz, 72); assert.equal(a.investigation.heat, 35);
  assert.deepEqual(a, b); assert.deepEqual(aNotes, bNotes);
  assert.deepEqual(state, original);
});

test("same-due opposing edge deltas clamp once at both boundaries", () => {
  for (const heat of [0, 35]) for (const boundary of [0, 99, 100]) {
    const base = arrivalState();
    const state = { ...base, investigation: { ...base.investigation, heat }, edgeLive: {
      ...base.edgeLive, "dogan-ersever": { ...base.edgeLive["dogan-ersever"], trust: boundary, tension: boundary },
    } };
    const a = tickPlans(state, []), b = tickPlans({ ...state, tags: [...sameDue].reverse() }, []);
    assert.deepEqual(a, b);
    if (heat === 35) assert.equal(a.edgeLive["dogan-ersever"].trust, boundary, "+4 and -4 conserve trust before clamp");
    else assert.equal(a.edgeLive["dogan-ersever"].tension, boundary, "+3 and -3 conserve tension before clamp");
  }
});

test("different due groups stay chronological, paid identical callbacks both land, and no callback replays", () => {
  const duplicate = "plan-due:4:quiet::dogan-ersever:2";
  const future = "plan-due:5:quiet::dogan-ersever:3";
  const base = arrivalState([duplicate, duplicate, future]);
  const state = { ...base, investigation: { ...base.investigation, heat: 0 } };
  const restored = parseSave(JSON.stringify(serialize(state)))!;
  const notes: string[] = []; const landed = tickPlans(restored, notes);
  assert.equal(landed.edgeLive["dogan-ersever"].trust, state.edgeLive["dogan-ersever"].trust + 10);
  assert.equal(notes.length, 2); assert.deepEqual(landed.tags, [future]);
  const again: string[] = []; assert.deepEqual(tickPlans(landed, again), landed); assert.deepEqual(again, []);
  const early = "plan-due:3:quiet::dogan-ersever:1", late = sameDue[0];
  const first: string[] = [], second: string[] = [];
  assert.deepEqual(tickPlans(arrivalState([late, early, future]), first), tickPlans(arrivalState([future, early, late]), second));
  assert.deepEqual(first, second); assert.match(first[0], /note.plan.quiet/);
});

test("a real historical death cancels only the new personal quiet return, not institutional consequences", () => {
  const anchored = applyEvent({ ...createGame("saha", 7), turn: 7 });
  assert.equal(anchored.dead.ersever, true);
  const state = { ...anchored, turn: 8, tags: ["plan-due:8:quiet:ersever::6"], investigation: { ...anchored.investigation, heat: 0 } };
  const before = structuredClone(state); const notes: string[] = [];
  const effect = planDue(state, "quiet", "ersever");
  assert.equal(effect.outcome, "unavailable"); assert.deepEqual(effect.edge, {}); assert.deepEqual(effect.stats, {});
  const after = tickPlans(state, notes);
  assert.deepEqual(after.edgeLive, before.edgeLive); assert.deepEqual(after.stats, before.stats);
  assert.deepEqual(after.actorMemory, before.actorMemory); assert.deepEqual(after.dead, before.dead);
  assert.equal(after.actionsLeft, before.actionsLeft); assert.equal(notes.length, 1); assert.match(notes[0], /note.plan.unavailable/);
  assert.equal(planDue(state, "institutional", "ersever").outcome, "response");
  assert.equal(planDue(state, "operational", "ersever").outcome, "blowback");
  assert.equal(planDue(state, "quiet", undefined, "dogan-ersever").outcome, "unavailable");
  assert.equal(planDue({ ...state, revealed: {} }, "quiet", undefined, "dogan-ersever").outcome, "unavailable", "visibility cannot revive a dead personal contact");
});

test("actual spend/distance and legacy betrayal block personal returns while living positive controls remain", () => {
  const base = remember(remember({ ...createGame("saha", 27), turn: 6, phase: "actions" as const, actionsLeft: 4 }, "ersever", "protected"), "ersever", "promise-kept");
  for (const id of ["kisi_harca", "kisi_mesafe"] as const) {
    const changed = executeAction(base, { id, nodeId: "ersever" });
    assert.ok(changed.actorMemory.ersever.includes(id === "kisi_harca" ? "spent" : "abandoned"));
    assert.equal(planDue(changed, "quiet", "ersever").outcome, "unavailable");
    assert.equal(planDue(changed, "quiet", undefined, "dogan-ersever").outcome, "unavailable");
  }
  for (const tag of ["spent", "abandoned", "promise-broken"] as const)
    assert.equal(planDue(remember(base, "ersever", tag), "quiet", "ersever").outcome, "unavailable");
  assert.equal(planDue(base, "quiet", "ersever").outcome, "returned");
  assert.equal(planDue(remember(base, "ersever", "used"), "quiet", "ersever").outcome, "returned");
  const p = previewMove(base, { id: "kisi_mesafe", nodeId: "ersever", method: "quiet", contextual: true });
  assert.equal(p.due?.effect.outcome, "unavailable");
});

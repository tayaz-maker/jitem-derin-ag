import assert from "node:assert/strict";
import { test } from "node:test";
import { performance } from "node:perf_hooks";
import { buildAtlas, atlasPlan } from "../src/game/sim/atlas.ts";
import { createGame, startActions, executeAction, isEdgeVisible } from "../src/game/engine.ts";
import { NODES, EDGES } from "../src/game/data.ts";
import { moveInput, previewMove, diffState } from "../src/game/sim/preview.ts";
import { tickPlans } from "../src/game/sim/planning.ts";
import { propagationRisk } from "../src/game/sim/edges.ts";
import { serialize, parseSave } from "../src/game/sim/save.ts";
import { SAVE_KEY, SCHEMA_VERSION, type PlannedAction } from "../src/game/types.ts";

function fixture() {
  const s = startActions(createGame("saha", 71));
  const state = {
    ...s,
    turn: 3,
    actionsLeft: 4,
    stats: { ...s.stats, etki: 20, kara: 20 },
    revealed: Object.fromEntries(NODES.map((n) => [n.id, true])),
  };
  const edge = EDGES.find((e) => isEdgeVisible(state, e.id))!;
  const plan: PlannedAction = {
    id: "bag_gozet",
    edgeId: edge.id,
    method: "operational",
    contextual: true,
  };
  return { state: { ...state, selectedEdgeId: edge.id }, plan, edge };
}

test("atlas is pure and exactly mirrors immediate preview and shared actor risk", () => {
  const { state, plan, edge } = fixture();
  const before = JSON.stringify(state);
  const model = buildAtlas(state, plan),
    actual = executeAction(structuredClone(moveInput(state, plan)), plan);
  assert.equal(JSON.stringify(state), before);
  assert.deepEqual(model.changes, previewMove(state, plan).changes);
  for (const e of model.edges) assert.equal(e.afterRisk, propagationRisk(actual, e.id));
  assert.ok(
    model.edges.some((e) => e.id !== edge.id && e.affected && !e.direct),
    "shared actor exposure reaches another visible edge",
  );
  assert.ok(model.pending.some((p) => p.proposed && p.due === state.turn + 1));
  const next = tickPlans({ ...structuredClone(actual), turn: state.turn + 1 }, []);
  assert.deepEqual(model.nextChanges, diffState(actual, next));
});

test("hidden nodes, edges and pending targets never escape through the atlas", () => {
  const state = startActions(createGame("saha", 71));
  const hidden = NODES.find((n) => !state.revealed[n.id] && n.appearTurn > state.turn)!;
  assert.ok(hidden);
  const model = buildAtlas(
    { ...state, tags: [...state.tags, `plan-due:2:quiet:${hidden.id}::1`] },
    { id: "kisi_koru", nodeId: hidden.id, method: "quiet", contextual: true },
  );
  assert.equal(model.plan, null);
  assert.ok(!model.nodes.some((n) => n.id === hidden.id));
  assert.ok(!model.edges.some((e) => e.from === hidden.id || e.to === hidden.id));
  assert.equal(model.pending.length, 0);
});

test("draft target is exact; unavailable moves do not produce proposed returns", () => {
  const { state, edge } = fixture();
  const draft = {
    id: "bag_gozet" as const,
    targetKind: "edge" as const,
    targetId: edge.id,
    method: "operational" as const,
  };
  assert.equal(
    atlasPlan({ ...state, selectedEdgeId: null, selectedNodeId: "different" }, draft),
    null,
  );
  const model = buildAtlas({ ...state, actionsLeft: 0 }, atlasPlan(state, draft));
  assert.equal(model.preview?.ok, false);
  assert.equal(model.pending.length, 0);
  assert.equal(
    model.edges.some((e) => e.affected),
    false,
  );
});

test("schema-5 queued returns survive reload and remain once-only", () => {
  const { state, plan } = fixture();
  const actual = executeAction(moveInput(state, plan), plan);
  const loaded = parseSave(JSON.stringify(serialize(actual)))!;
  assert.equal(SAVE_KEY, "jitem-derin-ag-v3");
  assert.equal(SCHEMA_VERSION, 5);
  assert.deepEqual(buildAtlas(loaded).pending, buildAtlas(actual).pending);
  const next = tickPlans({ ...loaded, turn: loaded.turn + 1 }, []);
  assert.equal(buildAtlas(next).pending.length, 0);
  assert.deepEqual(tickPlans(next, []), next);
});

test("bounded atlas projection stays below 50ms per model on this fixture", () => {
  const { state, plan } = fixture();
  buildAtlas(state, plan);
  const start = performance.now();
  for (let i = 0; i < 30; i++) buildAtlas(state, plan);
  const elapsed = performance.now() - start;
  assert.ok(elapsed < 1500, `30 models took ${elapsed.toFixed(1)}ms`);
});

import assert from "node:assert/strict";
import test from "node:test";
import { useGame } from "../src/game/store.ts";
import { createGame, startActions } from "../src/game/engine.ts";
import { previewMove } from "../src/game/sim/preview.ts";
import { serialize, parseSave } from "../src/game/sim/save.ts";
import { SAVE_KEY } from "../src/game/types.ts";

const values = new Map<string, string>();
Object.defineProperty(globalThis, "localStorage", {
  configurable: true,
  value: {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => values.set(key, value),
    removeItem: (key: string) => values.delete(key),
  },
});

test("refused move preserves live state, save, draft and feedback", () => {
  const state = startActions(createGame("saha", 71));
  state.actionsLeft = 0;
  const saved = JSON.stringify(serialize(state));
  values.set(SAVE_KEY, saved);
  useGame.setState({ state, feedback: null, lastResult: null });
  useGame.getState().play({ id: "kara_topla" });
  assert.equal(useGame.getState().state, state);
  assert.equal(useGame.getState().feedback, null);
  assert.equal(useGame.getState().lastResult, null);
  assert.equal(values.get(SAVE_KEY), saved);
});

test("restored resource work commits the exact preview and round-trips schema 5", () => {
  const state = startActions(createGame("saha", 71));
  const plan = { id: "kara_topla" as const };
  const preview = previewMove(state, plan);
  const snapshot = structuredClone(state);
  assert.equal(preview.ok, true);
  assert.deepEqual(state, snapshot);
  useGame.setState({ state, feedback: null, lastResult: null });
  useGame.getState().play(plan);
  const result = useGame.getState();
  assert.deepEqual(result.lastResult?.changes, preview.changes);
  assert.ok(result.state!.stats.kara > state.stats.kara);
  assert.ok(result.state!.actionsLeft < state.actionsLeft);
  assert.deepEqual(parseSave(values.get(SAVE_KEY)!), JSON.parse(JSON.stringify(result.state)));
});

test("edge outcome names the chosen edge even when a node is still selected", () => {
  const state = startActions(createGame("saha", 71));
  state.selectedNodeId = "jitem";
  const id = "dogan-jitem";
  useGame.setState({ state, feedback: null, lastResult: null });
  useGame.getState().play({ id: "bag_guclendir", edgeId: id });
  assert.equal(useGame.getState().lastResult?.targetId, id);
});

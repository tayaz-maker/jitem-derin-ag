import assert from "node:assert/strict";
import { test } from "node:test";
import { createGame, executeAction, startActions } from "../src/game/engine.ts";
import { decisionOptions, planMethods, targetClaims } from "../src/game/sim/planning.ts";
import { diffState, moveInput, nextStep, previewMove } from "../src/game/sim/preview.ts";
import { EDGES, NODES } from "../src/game/data.ts";
import { parseSave, serialize } from "../src/game/sim/save.ts";
import { SAVE_KEY, SCHEMA_VERSION } from "../src/game/types.ts";
import type { GameState, Hat, PlannedAction } from "../src/game/types.ts";

const HATS: Hat[] = ["saha", "idari", "arastirmaci", "hukuk"];

function plansFor(state: GameState): PlannedAction[] {
  const out: PlannedAction[] = [];
  const targets = [
    ...EDGES.filter((e) => state.revealed[e.from] && state.revealed[e.to]).map((e) => ({
      kind: "edge" as const,
      id: e.id,
      label: e.label,
    })),
    ...NODES.filter((n) => state.revealed[n.id]).map((n) => ({
      kind: "node" as const,
      id: n.id,
      label: n.name,
    })),
  ];
  for (const target of targets) {
    const claims = targetClaims(state, target).map((c) => c.id);
    for (const claimId of claims.length ? claims : [undefined]) {
      for (const id of decisionOptions(state, target, claimId)) {
        const methods = planMethods(state, id);
        for (const method of methods.length ? methods : [undefined]) {
          out.push({
            id,
            contextual: true,
            method,
            claimId,
            ...(target.kind === "edge" ? { edgeId: target.id } : { nodeId: target.id }),
          });
        }
      }
    }
  }
  return out;
}

test("the move preview is exactly the committed result and never touches the live state", () => {
  let checked = 0;
  let refused = 0;
  for (const hat of HATS) {
    for (const seed of [3, 71, 404]) {
      const state = { ...startActions(createGame(hat, seed)), actionsLeft: 4 };
      const snapshot = JSON.stringify(state);
      for (const plan of plansFor(state)) {
        const preview = previewMove(state, plan);
        assert.equal(JSON.stringify(state), snapshot, "preview must not mutate the live state");
        const input = moveInput(state, plan);
        const applied = executeAction(input, plan);
        assert.equal(preview.ok, applied !== input, `${hat}/${seed} ${plan.id}`);
        assert.deepEqual(preview.changes, preview.ok ? diffState(state, applied) : []);
        if (preview.ok) checked++;
        else refused++;
      }
    }
  }
  assert.ok(checked > 40, `enough real moves were compared (${checked}, refused ${refused})`);
});

test("the guidance always names one next step during play", () => {
  const state = startActions(createGame("saha", 71));
  assert.equal(nextStep(state, { hasTarget: false, hasMove: false }), "target");
  assert.equal(nextStep(state, { hasTarget: true, hasMove: false }), "move");
  assert.equal(nextStep(state, { hasTarget: true, hasMove: true }), "confirm");
  assert.equal(
    nextStep({ ...state, actionsLeft: 0 }, { hasTarget: true, hasMove: true }),
    "resolve",
  );
  assert.equal(
    nextStep({ ...state, phase: "event" }, { hasTarget: false, hasMove: false }),
    "event",
  );
  assert.equal(
    nextStep({ ...state, phase: "resolution" }, { hasTarget: false, hasMove: false }),
    "report",
  );
});

test("move selection and results stay out of the save; key and schema are unchanged", () => {
  assert.equal(SAVE_KEY, "jitem-derin-ag-v3");
  assert.equal(SCHEMA_VERSION, 5);
  const state = startActions(createGame("saha", 71));
  const raw = JSON.stringify(serialize(state));
  assert.doesNotMatch(raw, /"(move|lastResult|changes)"/);
  assert.ok(parseSave(raw));
});

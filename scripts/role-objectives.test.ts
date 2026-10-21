import assert from "node:assert/strict";
import { test } from "node:test";
import { createGame, applyEventChoice, eventViewFor, executeAction, isEdgeVisible } from "../src/game/engine.ts";
import { NODES, EDGES } from "../src/game/data.ts";
import { decisionOptions, targetClaims } from "../src/game/sim/planning.ts";
import { objectiveKey, syncObjectives } from "../src/game/sim/objectives.ts";
import { parseSave, serialize } from "../src/game/sim/save.ts";
import { t } from "../src/game/i18n/copy.ts";
import type { Hat, PlannedAction } from "../src/game/types.ts";

for (const hat of ["saha", "idari", "arastirmaci", "hukuk"] as Hat[]) {
  test(`${hat}: natural opening objective completes through offered atlas moves, once`, () => {
    let s = createGame(hat, 42);
    s = applyEventChoice(s, eventViewFor(s).choices[0].id);
    const original = structuredClone(s);
    const targets = [
      ...EDGES.filter(e => isEdgeVisible(s, e.id)).map(e => ({ kind: "edge" as const, id: e.id, label: e.label })),
      ...NODES.filter(n => s.revealed[n.id]).map(n => ({ kind: "node" as const, id: n.id, label: n.name })),
    ];
    const wanted = hat === "arastirmaci" ? "kaynak_karsilastir" : hat === "hukuk" ? "delil_zincir" : "bag_guclendir";
    let plan: PlannedAction | undefined;
    for (const target of targets) {
      for (const claim of [undefined, ...targetClaims(s, target)]) {
        if (!decisionOptions(s, target, claim?.id).includes(wanted)) continue;
        plan = { id: wanted, contextual: true, claimId: claim?.id,
          ...(target.kind === "edge" ? { edgeId: target.id } : { nodeId: target.id }) };
        break;
      }
      if (plan) break;
    }
    assert.ok(plan, "real UI offers required move");
    s = executeAction(s, plan);
    assert.ok(s.actionsLeft < original.actionsLeft);
    assert.equal(s.objectives.find(o => o.id === "obj_edge")?.status, "done");
    assert.equal(s.tags.filter(x => x === "obj-reward:obj_edge").length, 1);
    const resumed = parseSave(JSON.stringify(serialize(s)))!;
    const again = syncObjectives(resumed);
    assert.deepEqual(again.stats, s.stats);
    for (const locale of ["tr", "en"] as const)
      assert.notEqual(t(locale, objectiveKey(s, "obj_edge")), objectiveKey(s, "obj_edge"));
    assert.deepEqual(original, applyEventChoice(createGame(hat, 42), eventViewFor(createGame(hat, 42)).choices[0].id));
  });
}

test("completed legacy role objectives stay done and cannot pay again without a receipt", () => {
  const s = createGame("arastirmaci", 42);
  s.objectives[0].status = "done";
  s.tags = s.tags.filter(x => !x.startsWith("obj-reward:"));
  const legacy = parseSave(JSON.stringify(serialize(s)))!;
  const next = syncObjectives(legacy);
  assert.equal(next.objectives[0].status, "done");
  assert.deepEqual(next.stats, s.stats);
  assert.equal(next.tags.filter(x => x === "obj-reward:obj_edge").length, 1);
});

test("later evidence-role objectives use research records and stages, never network-only tasks", () => {
  for (const hat of ["arastirmaci", "hukuk"] as Hat[])
    for (const turn of [2, 3, 5, 8, 9, 10]) {
      const s = syncObjectives({ ...createGame(hat, 42), turn });
      for (const o of s.objectives.filter(o => o.status === "open"))
        assert.ok(["obj_person", "obj_truth", "obj_inv", "obj_chain"].includes(o.id));
    }
});

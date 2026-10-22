import assert from "node:assert/strict";
import { test } from "node:test";
import { createGame, applyEventChoice, eventViewFor, executeAction, onboardingHint, resolveTurn, advanceTurn, isNodeVisible, isEdgeVisible } from "../src/game/engine.ts";
import { EDGES, NODES } from "../src/game/data.ts";
import { previewMove } from "../src/game/sim/preview.ts";
import { decisionOptions, targetClaims } from "../src/game/sim/planning.ts";
import { parseSave, serialize } from "../src/game/sim/save.ts";
import { t } from "../src/game/i18n/copy.ts";
import type { GameState, Hat, PlannedAction } from "../src/game/types.ts";

function offered(state: GameState): PlannedAction[] {
  const targets = [
    ...EDGES.filter(e => isEdgeVisible(state, e.id)).map(e => ({ kind: "edge" as const, id: e.id, label: e.label })),
    ...NODES.filter(n => isNodeVisible(state, n.id)).map(n => ({ kind: "node" as const, id: n.id, label: n.name })),
  ];
  return targets.flatMap(target => [undefined, ...targetClaims(state, target)].flatMap(claim =>
    decisionOptions(state, target, claim?.id).map(id => ({ id, contextual: true, claimId: claim?.id,
      ...(target.kind === "edge" ? { edgeId: target.id } : { nodeId: target.id }) }))));
}
for (const hat of ["saha", "idari", "arastirmaci", "hukuk"] as Hat[]) {
  test(`${hat}: T1–T3 guidance describes real role options and never acknowledges previews or refusals`, () => {
    let s = createGame(hat, 42);
    for (const turn of [1, 2, 3]) {
      assert.equal(s.turn, turn);
      assert.equal(onboardingHint(s), null, "no action instruction during an event");
      s = applyEventChoice(s, eventViewFor(s).choices[0].id);
      const plans = offered(s), before = JSON.stringify(serialize(s));
      const key = onboardingHint(s)!;
      if (["arastirmaci", "hukuk"].includes(hat)) {
        assert.equal(key, `onboard.${hat}.t${turn}`);
        assert.ok(plans.some(p => hat === "arastirmaci"
          ? ["kaynak_karsilastir", "dogrula", "src_tut", "src_paylas", "src_yayin"].includes(p.id)
          : ["delil_zincir", "kanit_esigi"].includes(p.id)), "role work is offered on a visible claim");
      } else assert.equal(key, `onboard.t${turn}`, "field/admin guide remains unchanged");
      for (const locale of ["tr", "en"] as const) {
        const text = t(locale, key);
        assert.notEqual(text, key);
        assert.ok(text.length <= 155, "copy fits the existing hint area");
        if (hat === "arastirmaci") assert.match(text, locale === "tr" ? /karşılaştır|Karşılaştır/ : /compar/i);
        if (hat === "hukuk") assert.match(text, locale === "tr" ? /iddia/ : /claim/i);
      }
      assert.equal(JSON.stringify(serialize(s)), before, "reading/translating a hint is presentation only");
      const plan = plans.find(p => p.id === (hat === "hukuk" ? "delil_zincir" : hat === "arastirmaci" ? "kaynak_karsilastir" : "bag_guclendir"))!;
      assert.ok(plan);
      previewMove(s, plan);
      assert.equal(onboardingHint(s), key, "preview is not a completed action");
      assert.equal(JSON.stringify(serialize(s)), before);
      const refused = executeAction(s, { id: "delil_zincir", claimId: "missing-claim", contextual: true });
      assert.equal(onboardingHint(refused), key, "refusal is not success");
      const played = executeAction(s, plan);
      assert.ok(played.actionsLeft < s.actionsLeft);
      assert.equal(onboardingHint(played), key, "instruction never turns into an unverified completion claim");
      const loaded = parseSave(JSON.stringify(serialize(played)))!;
      assert.ok(loaded); assert.equal(loaded.schemaVersion, 5);
      assert.equal(onboardingHint(loaded), key);
      s = advanceTurn(resolveTurn(loaded));
    }
    assert.equal(s.turn, 4); assert.equal(onboardingHint(s), null);
  });
}

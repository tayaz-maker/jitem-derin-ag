import assert from "node:assert/strict";
import { test } from "node:test";
import { createGame, applyEventChoice, eventViewFor, executeAction, canPlay, resolveTurn, advanceTurn, isNodeVisible } from "../src/game/engine.ts";
import { NODES } from "../src/game/data.ts";
import { decisionOptions, planMethods } from "../src/game/sim/planning.ts";
import { causalNarrative, displayDossier, formatReplayJson, pickEnding } from "../src/game/sim/recap.ts";
import { parseSave, serialize } from "../src/game/sim/save.ts";
import type { GameState, PlannedAction } from "../src/game/types.ts";

function campaign(protectTurn?: number) {
  let s = createGame("idari", 42), guard = 0;
  while (s.phase !== "ended" && guard++ < 40) {
    if (s.phase === "event") {
      const event = eventViewFor(s); assert.ok(event);
      const choice = [...event.choices].sort((a, b) => (b.effects.giz ?? 0) - (a.effects.giz ?? 0))[0];
      s = applyEventChoice(s, choice.id);
    } else if (s.phase === "actions") {
      for (let i = 0; i < 5 && s.actionsLeft > 0; i++) {
        let plan: PlannedAction | undefined;
        if (s.turn === protectTurn) {
          for (const n of NODES.filter(n => isNodeVisible(s, n.id))) {
            if (decisionOptions(s, { kind: "node", id: n.id, label: n.name }).includes("kisi_koru") && canPlay(s, "kisi_koru")) {
              plan = { id: "kisi_koru", nodeId: n.id, contextual: true, method: planMethods(s, "kisi_koru")[0] }; break;
            }
          }
        } else {
          const id = (["inkar_yaz", "ankara_koru", "dosya_oku"] as const).find(id => canPlay(s, id));
          if (id) plan = { id };
        }
        if (!plan) break;
        const next = executeAction(s, plan);
        if (next.actionsLeft >= s.actionsLeft) break;
        s = next;
      }
      s = resolveTurn(s);
    } else s = advanceTurn(s);
  }
  assert.equal(s.phase, "ended");
  return s;
}

test("natural early protection and public pressure 100 are described from the real record, in TR/EN", () => {
  const s = campaign(2);
  assert.equal(s.ending, "inkar_ayakta"); assert.equal(s.stats.giz, 88); assert.equal(s.stats.kamuoyu, 100);
  const protections = s.decisions.filter(d => d.kind === "stance" && d.id === "protect");
  assert.equal(protections.length, 2); assert.ok(protections.every(d => d.turn === 2));
  const before = JSON.stringify(serialize(s));
  for (const locale of ["tr", "en"] as const) {
    const text = causalNarrative(s, locale).join(" ");
    assert.doesNotMatch(text, /geç dönemde|limiting public pressure|kamuoyu baskısını sınırlaman|critical ties late/);
    assert.match(text, /T2/); assert.match(text, /100/); assert.match(text, /88/);
    assert.ok(text.includes(NODES.find(n => n.id === protections[0].target)!.name));
    assert.deepEqual(displayDossier(s, locale).causal, causalNarrative(s, locale));
  }
  formatReplayJson(s);
  assert.equal(JSON.stringify(serialize(s)), before, "the narrative never changes ending, AP, stats or save state");
});

test("the same ending distinguishes actual early and late protection instead of inferring timing", () => {
  const early = campaign(2), late = campaign(8), none = campaign();
  assert.equal(early.ending, late.ending);
  for (const locale of ["tr", "en"] as const) {
    const a = causalNarrative(early, locale).join(" "), b = causalNarrative(late, locale).join(" ");
    assert.match(a, /T2/); assert.match(b, /T8/); assert.notEqual(a, b);
    assert.doesNotMatch(causalNarrative(none, locale).join(" "), /T2|T8/);
  }
});

test("legacy targetless decisions do not acquire invented target names or dates and remain schema-5 identical", () => {
  const s = campaign(2);
  for (const d of s.decisions) delete d.target;
  const loaded = parseSave(JSON.stringify(serialize(s)))!; assert.ok(loaded);
  const before = JSON.stringify(serialize(loaded));
  for (const locale of ["tr", "en"] as const) {
    const text = causalNarrative(loaded, locale).join(" ");
    assert.doesNotMatch(text, /T2|T8|geç dönemde|critical ties late/);
    assert.ok(text.includes("Ersever"), "existing protected memory remains usable without an invented date");
  }
  assert.equal(JSON.stringify(serialize(loaded)), before);
});

test("a partial-justice ending with no evidence chain does not claim ties were documented", () => {
  const s: GameState = { ...createGame("hukuk", 42), turn: 10, phase: "ended", ending: "kismi_adalet" };
  s.investigation.stage = "public"; s.investigation.chain = [];
  s.stats.hukuk = 60; s.stats.kamuoyu = 50;
  assert.equal(pickEnding(s), "kismi_adalet");
  assert.doesNotMatch(causalNarrative(s, "tr").join(" "), /bağlar belgelendi/);
  assert.doesNotMatch(causalNarrative(s, "en").join(" "), /ties were documented/);
});

test("spending and broken promises are remembered without inventing a later talk or collapse", () => {
  const s = createGame("idari", 42);
  s.actorMemory.dogan = ["spent"]; s.actorMemory.ersever = ["promise-broken"];
  s.ending = "kurumsal_tasfiye";
  assert.doesNotMatch(causalNarrative(s, "tr").join(" "), /Konuşma ve kin bunu izledi|Ağ kendi içinde kırıldı/);
  assert.doesNotMatch(causalNarrative(s, "en").join(" "), /Talk and resentment followed|broke from inside/);
});

import assert from "node:assert/strict";
import { test } from "node:test";
import { createGame, executeAction } from "../engine.ts";
import type { Faction, GameState } from "../types.ts";
import { allyLeakThreshold, entry, tickKnowledge } from "./knowledge.ts";
import { propagationRisk } from "./edges.ts";
import { rollAi } from "./rng.ts";
import { parseSave, serialize } from "./save.ts";
import { autoCampaign, BALANCE_STYLES } from "./balance.ts";

const claim = "clm_agar_catli";
function fixture(turn = 8, from: Faction = "siyaset", ally: Faction = "emniyet"): GameState {
  const s = createGame("saha", 71);
  assert.ok(s.factions[from].allies.includes(ally), "fixture isolates an existing ally channel");
  const factions = Object.fromEntries(Object.entries(s.factions).map(([id, mind]) => [id, {
    ...mind, allies: [], knowledgeBase: {}, known: [], rumor: [],
  }]));
  factions[from] = { ...factions[from], allies: [ally] as never,
    knowledgeBase: { [claim]: entry(claim, "RUMOR", { confidence: 70, propagationRisk: 50 }) } };
  return { ...s, turn, phase: "actions", actionsLeft: 4, factions,
    revealed: { ...s.revealed, agar: true, catli: true, emniyet: true } };
}
function channel(s: GameState, risk: "low" | "high" | "middle"): GameState {
  const edgeLive = { ...s.edgeLive };
  for (const id of ["agar-emniyet", "agar-catli"]) edgeLive[id] = {
    trust: 52, dependency: 40, secrecy: risk === "low" ? 100 : risk === "middle" ? 38 : 0,
    tension: risk === "low" ? 0 : risk === "middle" ? 50 : 100,
  };
  return { ...s, edgeLive, nodeHeat: risk === "high" ? { ...s.nodeHeat, agar: 2 } : { ...s.nodeHeat, agar: 0 } };
}
function withRoll(s: GameState, min: number, max: number, ally = "emniyet"): GameState {
  for (let aiSeed = 0; aiSeed < 20000; aiSeed++) {
    const candidate = { ...s, aiSeed };
    const r = rollAi(candidate, s.turn + claim.length + ally.length)[1];
    if (r > min && r <= max) return candidate;
  }
  throw new Error("no deterministic roll in the requested interval");
}

test("existing cross-faction edge risk changes the same single rumor roll without copying player truth", () => {
  const base = withRoll(fixture(), 0.62, 0.72);
  const low = channel(base, "low"), high = channel(base, "high");
  assert.equal(propagationRisk(low, "agar-catli"), 0); assert.equal(propagationRisk(high, "agar-catli"), 100);
  const before = structuredClone(low); const a: string[] = [], b: string[] = [];
  const quiet = tickKnowledge(low, a), leaked = tickKnowledge(high, b);
  assert.equal(a.length, 0); assert.equal(b.length, 1);
  assert.equal(quiet.rngCursor, low.rngCursor + 1); assert.equal(leaked.rngCursor, high.rngCursor + 1);
  assert.deepEqual(low, before); assert.deepEqual(leaked.hand, high.hand); assert.deepEqual(leaked.truth, high.truth);
  assert.equal(leaked.factions.emniyet.knowledgeBase[claim].status, "RUMOR");
  assert.equal(leaked.factions.emniyet.knowledgeBase[claim].confidence, 38);
  assert.equal(leaked.factions.emniyet.knowledgeBase[claim].propagationRisk, 40);
  assert.match(b[0], /^note\.know\.leak\|ally=emniyet\|from=siyaset$/);
});

test("an actual bag_koru decision lowers current channel risk and can prevent the later same-roll leak", () => {
  let s = channel(fixture(), "middle");
  s = { ...s, edgeLive: { ...s.edgeLive, "agar-catli": { trust: 52, dependency: 40, secrecy: 100, tension: 0 } } };
  const protectedState = executeAction(s, { id: "bag_koru", edgeId: "agar-emniyet" });
  const beforeRisk = propagationRisk(s, "agar-emniyet"), afterRisk = propagationRisk(protectedState, "agar-emniyet");
  assert.ok(afterRisk < beforeRisk); assert.ok(protectedState.actionsLeft < s.actionsLeft);
  const beforeThreshold = 0.62 + (50 - beforeRisk) / 500, afterThreshold = 0.62 + (50 - afterRisk) / 500;
  const seed = withRoll(s, beforeThreshold, afterThreshold).aiSeed;
  const a: string[] = [], b: string[] = [];
  tickKnowledge({ ...s, aiSeed: seed }, a); tickKnowledge({ ...protectedState, aiSeed: seed }, b);
  assert.equal(a.length, 1); assert.equal(b.length, 0);
});

test("pre-appearance and unrepresented ally pairs retain the original leak behavior", () => {
  for (const s of [fixture(7), fixture(8, "hukuk", "media"), fixture(8, "yeralti", "emniyet")]) {
    const a: string[] = [], b: string[] = [];
    const low = tickKnowledge(channel(s, "low"), a), high = tickKnowledge(channel(s, "high"), b);
    assert.deepEqual(low.factions, high.factions); assert.equal(low.rngCursor, high.rngCursor); assert.deepEqual(a, b);
  }
});

test("eligibility, known recipients and once-only rumors preserve their existing gates", () => {
  const s = channel(withRoll(fixture(), 0.73, 0.9), "high");
  for (const patch of [{ status: "TRUE" as const }, { status: "UNKNOWN" as const }, { propagationRisk: 31 }]) {
    const state = { ...s };
    state.factions = { ...s.factions, siyaset: { ...s.factions.siyaset, knowledgeBase: {
      [claim]: { ...s.factions.siyaset.knowledgeBase[claim], ...patch },
    } } };
    const notes: string[] = []; const after = tickKnowledge(state, notes);
    assert.deepEqual(notes, []); assert.equal(after.rngCursor, state.rngCursor);
  }
  const first: string[] = [], second: string[] = [];
  const once = tickKnowledge(s, first), twice = tickKnowledge(once, second);
  assert.equal(first.length, 1); assert.deepEqual(second, []); assert.equal(twice.rngCursor, once.rngCursor);
});

test("save/reload retains deterministic NPC knowledge, existing alliances and player resources", () => {
  const s = channel(withRoll(fixture(), 0.62, 0.72), "high");
  const restored = parseSave(JSON.stringify(serialize(s)))!; const a: string[] = [], b: string[] = [];
  const first = tickKnowledge(s, a), reloaded = tickKnowledge(restored, b);
  assert.deepEqual(JSON.parse(JSON.stringify(first)), JSON.parse(JSON.stringify(reloaded))); assert.deepEqual(a, b);
  assert.deepEqual(first.stats, s.stats); assert.equal(first.actionsLeft, s.actionsLeft);
  for (const [id, mind] of Object.entries(s.factions)) {
    assert.deepEqual(first.factions[id].allies, mind.allies); assert.deepEqual(first.factions[id].rivals, mind.rivals);
  }
});

test("channel risk 0/50/100 gives the bounded threshold, independent of player visibility", () => {
  for (const [risk, expected] of [["low", 0.72], ["middle", 0.62], ["high", 0.52]] as const) {
    const s = channel(fixture(), risk);
    assert.ok(Math.abs(allyLeakThreshold(s, "siyaset", "emniyet") - expected) < 1e-12);
    assert.equal(allyLeakThreshold({ ...s, revealed: {} }, "siyaset", "emniyet"), allyLeakThreshold(s, "siyaset", "emniyet"));
  }
  assert.equal(allyLeakThreshold(channel(fixture(7), "high"), "siyaset", "emniyet"), 0.62);
  assert.equal(allyLeakThreshold(channel(fixture(), "high"), "hukuk", "media"), 0.62);
});

test("dead personal endpoints are excluded while the existing no-edge institutional fallback remains", () => {
  const low = channel(fixture(), "low");
  const mixed = { ...low, edgeLive: { ...low.edgeLive,
    "agar-catli": { trust: 52, dependency: 40, secrecy: 0, tension: 100 } }, nodeHeat: { catli: 2 } };
  assert.equal(allyLeakThreshold(mixed, "siyaset", "emniyet"), 0.52);
  assert.equal(allyLeakThreshold({ ...mixed, dead: { catli: true } }, "siyaset", "emniyet"), 0.72);
  assert.equal(allyLeakThreshold({ ...mixed, dead: { agar: true } }, "siyaset", "emniyet"), 0.62);
});

test("multiple eligible records still produce at most one leak with the existing opaque note", () => {
  const s = channel(withRoll(fixture(), 0.73, 0.9), "high");
  s.factions = { ...s.factions, siyaset: { ...s.factions.siyaset, knowledgeBase: {
    ...s.factions.siyaset.knowledgeBase, clm_jitem_exists: entry("clm_jitem_exists", "RUMOR", { propagationRisk: 70 }),
  } } };
  const notes: string[] = []; const after = tickKnowledge(s, notes);
  assert.equal(notes.length, 1); assert.equal(Object.keys(after.factions.emniyet.knowledgeBase).length, 1);
  assert.ok(!notes[0].includes("agar") && !notes[0].includes(claim));
});

test("all current balance styles complete fifty deterministic campaigns without a single-ending collapse", () => {
  const endings = new Set<string>();
  for (const style of BALANCE_STYLES) for (let i = 0; i < 50; i++) {
    const state = autoCampaign(style, 1000 + i * 7919);
    assert.equal(state.phase, "ended", `${style}/${i} must not softlock`); endings.add(state.ending!);
  }
  assert.ok(endings.size > 1);
});

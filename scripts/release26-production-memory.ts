/** Release-specific production proof. Isolated synthetic saves, no game-source changes. */
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import { chromium } from "playwright";
import { createGame, applyEvent, executeAction, resolveTurn } from "../src/game/engine.ts";
import { remember, tickMemory } from "../src/game/sim/memory.ts";
import { serialize } from "../src/game/sim/save.ts";
import { SAVE_KEY, type GameState } from "../src/game/types.ts";

const origin = "https://www.tariklab.com";
const base = origin + "/games/jitem-derin-ag";
const expectedSource = "37c5416e7a49b2ecc998f0d1071a7484d6e508c0";
const expectedFiles = {
  "assets/runtime.js": "cab531fa229d9050171a7f8e3fda9034a0b9b3a089bbb63903d7cea97d1a6453",
  "index.html": "72ae08ac3a49fda2617f54c74a606e339189d6943e2f221546dac890ace23a3a",
  "assets/integration-TF9RduP9.css": "296c51f61752a2687927a7f1e8c30e9e55686753e9c5395894764b49c7429a81",
};
const out = process.env.ATLAS_BROWSER_OUT ?? "/workspace/screenshots/jitem-production";
await mkdir(out, { recursive: true });
const rows: unknown[] = [];
let failure: string | null = null;
const get = async (path: string) => {
  const response = await fetch(base + "/" + path, { redirect: "error", cache: "no-store", signal: AbortSignal.timeout(15000) });
  assert.equal(response.status, 200, path);
  return Buffer.from(await response.arrayBuffer());
};
const source = JSON.parse((await get("SOURCE.json")).toString());
assert.equal(source.standaloneSha, expectedSource);
assert.equal(source.saveKey, SAVE_KEY);
assert.equal(source.schemaVersion, 5);
assert.equal(source.runtimeSha256, expectedFiles["assets/runtime.js"]);
for (const [file, hash] of Object.entries(expectedFiles))
  assert.equal(createHash("sha256").update(await get(file)).digest("hex"), hash, file);

function betrayal(): GameState {
  let state = { ...createGame("saha", 27), turn: 4 };
  state = remember(remember(state, "ersever", "protected"), "ersever", "promise-kept");
  state = tickMemory(state, []);
  assert.ok(state.tags.includes("helped:ersever"));
  state = { ...state, turn: 6, phase: "actions", actionsLeft: 3, selectedNodeId: "ersever", revealed: { ...state.revealed, ersever: true } };
  state = executeAction(state, { id: "kisi_harca", nodeId: "ersever" });
  assert.ok(state.actorMemory.ersever.includes("promise-broken"));
  const expected = resolveTurn(state);
  assert.ok(expected.tags.includes("talked:ersever:t6"));
  return state;
}
function dead(seed: number, tag: "protected" | "spent"): GameState {
  const state = remember({ ...applyEvent({ ...createGame("saha", seed), turn: 7 }), phase: "actions", actionsLeft: 0 }, "ersever", tag);
  assert.equal(state.dead.ersever, true);
  assert.equal(state.flags.erseverDead, true);
  return state;
}
const cases = [
  { name: "betrayal-after-help", state: betrayal() },
  { name: "dead-help-blocked", state: dead(7, "protected") },
  { name: "dead-talk-blocked", state: dead(8, "spent") },
];
const browser = await chromium.launch({ headless: true, args: ["--no-sandbox"] });
try {
  for (const locale of ["tr", "en"]) for (const width of [1280, 390]) for (const item of cases) {
    const context = await browser.newContext({ viewport: { width, height: 844 } });
    try {
      const payload = JSON.stringify(serialize(item.state));
      await context.addInitScript(({ key, payload }) => {
        if (!localStorage.getItem(key + ":production-fixture")) {
          localStorage.setItem(key, payload);
          localStorage.setItem(key + ":bak", payload);
          localStorage.setItem(key + ":production-fixture", "1");
        }
      }, { key: SAVE_KEY, payload });
      const page = await context.newPage();
      const errors: string[] = [];
      page.on("pageerror", e => errors.push(e.message));
      await page.goto(`${base}/?embed=1&lang=${locale}`, { waitUntil: "networkidle" });
      await page.getByRole("button", { name: /Devam|Continue/ }).click();
      await page.getByRole("button", { name: locale === "tr" ? "İşler" : "Work", exact: true }).filter({ visible: true }).first().click();
      await page.getByRole("button", { name: locale === "tr" ? "Turu kapat" : "Close the turn", exact: true }).filter({ visible: true }).click();
      await page.waitForFunction(key => JSON.parse(localStorage.getItem(key)!).state.phase === "resolution", SAVE_KEY);
      const saved = await page.evaluate(key => localStorage.getItem(key)!, SAVE_KEY);
      const state = JSON.parse(saved).state as GameState;
      assert.equal(state.version, 5); assert.equal(state.schemaVersion, 5);
      assert.deepEqual(state.actorMemory.ersever, item.state.actorMemory.ersever);
      for (const tag of ["ex:promise", "ex:protect-pay"]) assert.equal(state.tags.includes(tag), false, `${item.name}: stale support ${tag}`);
      assert.ok(state.lastResolution.some(note => !note.startsWith("note.mem.")), "institutional consequences still resolve");
      if (item.name === "betrayal-after-help") {
        assert.ok(state.tags.includes("helped:ersever"));
        assert.ok(state.tags.includes("talked:ersever:t6"));
        assert.ok(state.tags.includes("leaked-media:ersever"));
        assert.ok(state.lastResolution.includes("note.mem.talk|id=ersever"));
      } else {
        assert.equal(state.dead.ersever, true);
        assert.ok(!state.lastResolution.some(note => note.startsWith("note.mem.") && note.includes("id=ersever")));
        assert.ok(!state.tags.includes("helped:ersever"));
        assert.ok(!state.tags.includes("leaked-media:ersever"));
        assert.ok(!state.tags.some(tag => tag.startsWith("talked:ersever:")));
      }
      await page.reload({ waitUntil: "networkidle" });
      await page.getByRole("button", { name: /Devam|Continue/ }).click();
      await page.locator(".start-screen-shell").waitFor({ state: "detached" });
      assert.equal(await page.evaluate(key => localStorage.getItem(key), SAVE_KEY), saved, "reload must not replay any consequence");
      assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1));
      assert.deepEqual(errors, []);
      await page.screenshot({ path: `${out}/production-${item.name}-${locale}-${width}.png`, fullPage: true });
      rows.push({ case: item.name, locale, width, status: "PASS", phase: state.phase, notes: state.lastResolution });
    } finally { await context.close(); }
  }
} catch (error) {
  failure = error instanceof Error ? error.stack ?? error.message : String(error);
  throw error;
} finally {
  await writeFile(`${out}/production-results.json`, JSON.stringify({ origin, expectedSource, expectedFiles, source, status: failure ? "FAIL" : "PASS", failure, rows, scope: "Synthetic saves in isolated Chromium contexts on allowlisted www; no existing user saves accessed. Workers not tested and not certified." }, null, 2));
  await browser.close();
}

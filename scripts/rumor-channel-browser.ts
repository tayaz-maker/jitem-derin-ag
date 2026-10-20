/** Existing rumor channel after a real protection decision, through built turn UI. */
import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import { chromium } from "playwright";
import { createGame, executeAction, resolveTurn } from "../src/game/engine.ts";
import { entry } from "../src/game/sim/knowledge.ts";
import { serialize } from "../src/game/sim/save.ts";
import { SAVE_KEY, type GameState } from "../src/game/types.ts";

const base = process.argv[2] ?? "http://127.0.0.1:8081";
const out = process.env.ATLAS_BROWSER_OUT ?? "/workspace/screenshots/jitem-rumor-channel";
await mkdir(out, { recursive: true });
const original = createGame("saha", 71);
const factions = Object.fromEntries(Object.entries(original.factions).map(([id, mind]) => [id, {
  ...mind, allies: [], knowledgeBase: {}, known: [], rumor: [],
}]));
factions.siyaset = { ...factions.siyaset, allies: ["emniyet"] as never,
  knowledgeBase: { clm_agar_catli: entry("clm_agar_catli", "RUMOR", { confidence: 70, propagationRisk: 50 }) } };
const exposed: GameState = { ...original, turn: 8, phase: "actions", actionsLeft: 4, aiSeed: 36, factions,
  revealed: { ...original.revealed, agar: true, catli: true, emniyet: true }, edgeLive: { ...original.edgeLive,
    "agar-emniyet": { trust: 52, dependency: 40, secrecy: 38, tension: 50 },
    "agar-catli": { trust: 52, dependency: 40, secrecy: 100, tension: 0 },
  } };
const protectedState = executeAction(exposed, { id: "bag_koru", edgeId: "agar-emniyet" });
assert.ok(protectedState.actionsLeft < exposed.actionsLeft);
const closed = { ...exposed, edgeLive: { ...exposed.edgeLive,
  "agar-emniyet": { trust: 52, dependency: 40, secrecy: 100, tension: 0 },
} };
const fixtures = [{ name: "exposed", state: exposed, leaks: true },
  { name: "actual-protection", state: protectedState, leaks: false }, { name: "closed", state: closed, leaks: false }];
const leakNote = "note.know.leak|ally=emniyet|from=siyaset";
const rows: unknown[] = [];
const browser = await chromium.launch({ headless: true, args: ["--no-sandbox"] });
try {
  for (const locale of ["tr", "en"]) for (const width of [1280, 390]) for (const item of fixtures) {
    const context = await browser.newContext({ viewport: { width, height: 844 } });
    try {
      const state = { ...item.state, actionsLeft: 0 }; const expected = resolveTurn(state);
      assert.equal(expected.lastResolution.includes(leakNote), item.leaks, "fixed full-turn seed must exercise channel sensitivity");
      const payload = JSON.stringify(serialize(state));
      await context.addInitScript(({ key, payload }) => {
        if (!localStorage.getItem(key + ":rumor-proof")) {
          localStorage.setItem(key, payload); localStorage.setItem(key + ":bak", payload);
          localStorage.setItem(key + ":rumor-proof", "1");
        }
      }, { key: SAVE_KEY, payload });
      const page = await context.newPage(); const errors: string[] = [];
      page.on("pageerror", e => errors.push(e.message));
      await page.goto(`${base}/?embed=1&lang=${locale}`, { waitUntil: "networkidle" });
      await page.getByRole("button", { name: /Devam|Continue/ }).click();
      await page.getByRole("button", { name: locale === "tr" ? "İşler" : "Work", exact: true }).filter({ visible: true }).first().click();
      await page.getByRole("button", { name: locale === "tr" ? "Turu kapat" : "Close the turn", exact: true }).filter({ visible: true }).first().click();
      await page.waitForFunction(key => JSON.parse(localStorage.getItem(key)!).state.phase === "resolution", SAVE_KEY);
      const saved = await page.evaluate(key => localStorage.getItem(key)!, SAVE_KEY);
      const after = JSON.parse(saved).state as GameState;
      assert.deepEqual(after.factions, expected.factions); assert.deepEqual(after.lastResolution, expected.lastResolution);
      assert.deepEqual(after.hand, expected.hand); assert.deepEqual(after.truth, expected.truth);
      assert.deepEqual(after.stats, expected.stats); assert.equal(after.rngCursor, expected.rngCursor);
      assert.equal(after.lastResolution.includes(leakNote), item.leaks);
      await page.reload({ waitUntil: "networkidle" });
      await page.getByRole("button", { name: /Devam|Continue/ }).click();
      await page.locator(".start-screen-shell").waitFor({ state: "detached" });
      assert.equal(await page.evaluate(key => localStorage.getItem(key), SAVE_KEY), saved);
      assert.deepEqual(errors, []); assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1));
      await page.screenshot({ path: `${out}/rumor-${item.name}-${locale}-${width}.png`, fullPage: true });
      rows.push({ case: item.name, locale, width, leaks: item.leaks, status: "PASS" });
    } finally { await context.close(); }
  }
} finally {
  await writeFile(`${out}/rumor-channel-results.json`, JSON.stringify(rows, null, 2));
  await browser.close();
}

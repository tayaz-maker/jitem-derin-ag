/** Actual built-game payoff boundary, existing save/UI only. */
import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import { chromium } from "playwright";
import { createGame, applyEvent, executeAction, resolveTurn } from "../src/game/engine.ts";
import { remember, tickMemory } from "../src/game/sim/memory.ts";
import { serialize } from "../src/game/sim/save.ts";
import { SAVE_KEY, type GameState } from "../src/game/types.ts";
const base = process.argv[2] ?? "http://127.0.0.1:8081";
assert.ok(["http://127.0.0.1:8081", "http://localhost:8081"].includes(base));
const out = process.env.ATLAS_BROWSER_OUT ?? "/workspace/screenshots/jitem-support";
await mkdir(out, { recursive: true });
let betrayed = { ...createGame("saha", 27), turn: 4 };
betrayed = tickMemory(remember(remember(betrayed, "ersever", "protected"), "ersever", "promise-kept"), []);
assert.ok(betrayed.tags.includes("helped:ersever"));
betrayed = executeAction({ ...betrayed, turn: 6, phase: "actions", actionsLeft: 3, selectedNodeId: "ersever", revealed: { ...betrayed.revealed, ersever: true } }, { id: "kisi_harca", nodeId: "ersever" });
const dead = remember(remember({ ...applyEvent({ ...createGame("saha", 7), turn: 7 }), phase: "actions" as const, actionsLeft: 0 }, "ersever", "protected"), "ersever", "promise-kept");
const living = remember(remember({ ...createGame("saha", 2), turn: 6, phase: "actions" as const, actionsLeft: 0 }, "ersever", "protected"), "ersever", "promise-kept");
const cases = [{ name: "betrayed", state: betrayed, eligible: false }, { name: "dead", state: dead, eligible: false }, { name: "living-kept", state: living, eligible: true }];
const browser = await chromium.launch({ headless: true, args: ["--no-sandbox"] });
const rows: unknown[] = [];
try {
  for (const locale of ["tr", "en"]) for (const width of [1280, 390]) for (const item of cases) {
    const context = await browser.newContext({ viewport: { width, height: 844 } });
    try {
      const payload = JSON.stringify(serialize(item.state));
      await context.addInitScript(({ key, payload }) => {
        if (!localStorage.getItem(key + ":support-proof")) {
          localStorage.setItem(key, payload); localStorage.setItem(key + ":bak", payload); localStorage.setItem(key + ":support-proof", "1");
        }
      }, { key: SAVE_KEY, payload });
      const page = await context.newPage(); const errors: string[] = [];
      page.on("pageerror", e => errors.push(e.message));
      await page.goto(`${base}/?embed=1&lang=${locale}`, { waitUntil: "networkidle" });
      await page.getByRole("button", { name: /Devam|Continue/ }).click();
      await page.getByRole("button", { name: locale === "tr" ? "İşler" : "Work", exact: true }).filter({ visible: true }).first().click();
      await page.getByRole("button", { name: locale === "tr" ? "Turu kapat" : "Close the turn", exact: true }).filter({ visible: true }).click();
      await page.waitForFunction(key => JSON.parse(localStorage.getItem(key)!).state.phase === "resolution", SAVE_KEY);
      const saved = await page.evaluate(key => localStorage.getItem(key)!, SAVE_KEY);
      const state = JSON.parse(saved).state as GameState;
      for (const tag of ["ex:promise", "ex:protect-pay"]) assert.equal(state.tags.includes(tag), item.eligible, `${item.name}: ${tag}`);
      assert.deepEqual(state.actorMemory.ersever, item.state.actorMemory.ersever);
      assert.deepEqual(state.dead, item.state.dead);
      assert.equal(state.schemaVersion, 5);
      assert.deepEqual(state.lastResolution, resolveTurn(item.state).lastResolution);
      await page.reload({ waitUntil: "networkidle" });
      await page.getByRole("button", { name: /Devam|Continue/ }).click();
      await page.locator(".start-screen-shell").waitFor({ state: "detached" });
      assert.equal(await page.evaluate(key => localStorage.getItem(key), SAVE_KEY), saved);
      assert.deepEqual(errors, []);
      await page.screenshot({ path: `${out}/support-${item.name}-${locale}-${width}.png`, fullPage: true });
      rows.push({ case: item.name, locale, width, status: "PASS" });
    } finally { await context.close(); }
  }
} finally {
  await writeFile(`${out}/support-results.json`, JSON.stringify(rows, null, 2));
  await browser.close();
}

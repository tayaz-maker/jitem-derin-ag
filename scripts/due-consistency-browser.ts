/** Arrival-boundary acceptance through the built game's existing turn/reload UI. */
import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import { chromium } from "playwright";
import { applyEvent, createGame, executeAction, resolveTurn } from "../src/game/engine.ts";
import { remember } from "../src/game/sim/memory.ts";
import { serialize } from "../src/game/sim/save.ts";
import { SAVE_KEY, type GameState } from "../src/game/types.ts";

const base = process.argv[2] ?? "http://127.0.0.1:8081";
const out = process.env.ATLAS_BROWSER_OUT ?? "/workspace/screenshots/jitem-due-consistency";
await mkdir(out, { recursive: true });
const tags = ["plan-due:4:institutional::dogan-ersever:3", "plan-due:4:quiet::dogan-ersever:2"];
const initial = createGame("saha", 71);
const simultaneous = { ...initial, turn: 4, phase: "actions" as const, actionsLeft: 0,
  investigation: { ...initial.investigation, heat: 34 }, tags };
const living = remember(remember({ ...createGame("saha", 2), turn: 6, phase: "actions" as const, actionsLeft: 0,
  tags: ["plan-due:6:quiet:ersever::4"] }, "ersever", "protected"), "ersever", "promise-kept");
const betrayed = executeAction({ ...living, actionsLeft: 3 }, { id: "kisi_harca", nodeId: "ersever" });
const dead = remember(remember({ ...applyEvent({ ...createGame("saha", 7), turn: 7 }), turn: 8,
  phase: "actions" as const, actionsLeft: 0, tags: ["plan-due:8:quiet:ersever::6"] }, "ersever", "protected"), "ersever", "promise-kept");
const fixtures: Array<{ name: string; state: GameState; unavailable?: boolean }> = [
  { name: "same-due-forward", state: simultaneous },
  { name: "same-due-reversed", state: { ...simultaneous, tags: [...tags].reverse() } },
  { name: "living", state: living }, { name: "betrayed", state: betrayed, unavailable: true },
  { name: "historical-death", state: dead, unavailable: true },
];
const rows: unknown[] = [];
const browser = await chromium.launch({ headless: true, args: ["--no-sandbox"] });
try {
  for (const locale of ["tr", "en"]) for (const width of [1280, 390]) {
    let ordered: GameState | undefined;
    for (const item of fixtures) {
      const context = await browser.newContext({ viewport: { width, height: 844 } });
      try {
        const payload = JSON.stringify(serialize(item.state));
        await context.addInitScript(({ key, payload }) => {
          if (!localStorage.getItem(key + ":due-proof")) {
            localStorage.setItem(key, payload); localStorage.setItem(key + ":bak", payload);
            localStorage.setItem(key + ":due-proof", "1");
          }
        }, { key: SAVE_KEY, payload });
        const page = await context.newPage(); const errors: string[] = [];
        page.on("pageerror", e => errors.push(e.message));
        await page.goto(`${base}/?embed=1&lang=${locale}`, { waitUntil: "networkidle" });
        await page.getByRole("button", { name: /Devam|Continue/ }).click();
        await page.getByRole("button", { name: locale === "tr" ? "İşler" : "Work", exact: true }).filter({ visible: true }).first().click();
        await page.getByRole("button", { name: locale === "tr" ? "Turu kapat" : "Close the turn", exact: true }).filter({ visible: true }).first().click();
        const expected = resolveTurn(item.state);
        await page.waitForFunction(({ key, phase }) => JSON.parse(localStorage.getItem(key)!).state.phase === phase, { key: SAVE_KEY, phase: expected.phase });
        const saved = await page.evaluate(key => localStorage.getItem(key)!, SAVE_KEY);
        const state = JSON.parse(saved).state as GameState;
        assert.deepEqual(state.edgeLive, expected.edgeLive); assert.deepEqual(state.stats, expected.stats);
        assert.deepEqual(state.lastResolution, expected.lastResolution); assert.deepEqual(state.actorMemory, expected.actorMemory);
        assert.deepEqual(state.dead, item.state.dead); assert.ok(!state.tags.some(tag => tag.startsWith("plan-due:")));
        if (item.unavailable) {
          assert.ok(state.lastResolution.some(note => note.startsWith("note.plan.unavailable")));
          await page.getByText(/kişisel temas artık karşılık veremiyor|personal contact.*can no longer respond/i).filter({ visible: true }).first().waitFor({ state: "visible" });
        }
        if (item.name === "same-due-forward") ordered = state;
        if (item.name === "same-due-reversed") assert.deepEqual(state, ordered, "tag order cannot change state or semantic note order");
        await page.reload({ waitUntil: "networkidle" });
        await page.getByRole("button", { name: /Devam|Continue/ }).click();
        await page.locator(".start-screen-shell").waitFor({ state: "detached" });
        assert.equal(await page.evaluate(key => localStorage.getItem(key), SAVE_KEY), saved);
        assert.deepEqual(errors, []); assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1));
        await page.screenshot({ path: `${out}/due-${item.name}-${locale}-${width}.png`, fullPage: true });
        rows.push({ case: item.name, locale, width, status: "PASS" });
      } finally { await context.close(); }
    }
  }
} finally {
  await writeFile(`${out}/due-consistency-results.json`, JSON.stringify(rows, null, 2));
  await browser.close();
}

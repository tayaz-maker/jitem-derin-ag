/** Real UI recovery and previous-generation retention; isolated generated saves only. */
import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import { chromium } from "playwright";
import { createGame } from "../src/game/engine.ts";
import { serialize } from "../src/game/sim/save.ts";
import { SAVE_KEY } from "../src/game/types.ts";

const base = process.argv[2] ?? "http://127.0.0.1:8081";
const out = process.env.ATLAS_BROWSER_OUT ?? "/workspace/screenshots/jitem-save-reliability";
await mkdir(out, { recursive: true });
const valid = JSON.stringify(serialize(createGame("saha", 71)));
const corrupt = JSON.stringify({ ...JSON.parse(valid), state: { ...JSON.parse(valid).state, tags: [null] } });
const rows: unknown[] = [];
const browser = await chromium.launch({ headless: true, args: ["--no-sandbox"] });
try {
  for (const locale of ["tr", "en"]) for (const width of [1280, 390]) {
    const context = await browser.newContext({ viewport: { width, height: 844 } });
    try {
      await context.addInitScript(({ key, valid, corrupt }) => {
        if (!localStorage.getItem(key + ":recovery-proof")) {
          localStorage.setItem(key, corrupt); localStorage.setItem(key + ":bak", valid);
          localStorage.setItem(key + ":recovery-proof", "1");
        }
      }, { key: SAVE_KEY, valid, corrupt });
      const page = await context.newPage(); const errors: string[] = [];
      page.on("pageerror", e => errors.push(e.message));
      const bytes = () => page.evaluate(key => [localStorage.getItem(key), localStorage.getItem(key + ":bak")], SAVE_KEY);
      await page.goto(`${base}/?embed=1&lang=${locale}`, { waitUntil: "networkidle" });
      await page.getByRole("button", { name: /Devam|Continue/ }).click();
      assert.deepEqual(await bytes(), [corrupt, valid], "recovering and loading never rewrites either candidate");
      await page.locator("article:visible button").first().click();
      const [generationB, backupA] = await bytes();
      assert.notEqual(generationB, corrupt); assert.equal(backupA, valid);
      await page.getByRole("button", { name: locale === "tr" ? "İşler" : "Work", exact: true }).filter({ visible: true }).first().click();
      await page.locator(".plan-record:visible").selectOption("kara_topla");
      await page.getByRole("button", { name: locale === "tr" ? "Kararı uygula" : "Commit decision", exact: true }).filter({ visible: true }).click();
      const saved = await bytes();
      assert.notEqual(saved[0], generationB); assert.equal(saved[1], generationB, "second actual commit retains its previous valid primary");
      assert.equal(JSON.parse(saved[0]!).state.schemaVersion, 5);
      await page.reload({ waitUntil: "networkidle" });
      await page.getByRole("button", { name: /Devam|Continue/ }).click();
      await page.locator(".start-screen-shell").waitFor({ state: "detached" });
      assert.deepEqual(await bytes(), saved, "reload/persist does not advance the backup generation");
      assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1));
      assert.deepEqual(errors, []);
      await page.screenshot({ path: `${out}/save-reliability-${locale}-${width}.png`, fullPage: true });
      rows.push({ locale, width, recovery: true, previousGeneration: true, reload: true, status: "PASS" });
    } finally { await context.close(); }
  }
} finally {
  await writeFile(`${out}/save-reliability-results.json`, JSON.stringify(rows, null, 2));
  await browser.close();
}

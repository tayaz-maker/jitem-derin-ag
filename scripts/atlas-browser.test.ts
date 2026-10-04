/** Bounded real-browser matrix; uses a deterministic, real schema-5 save fixture.
 * npm run test:atlas:browser -- http://127.0.0.1:8080
 * Optional PLAYWRIGHT_CHROMIUM_EXECUTABLE and ATLAS_BROWSER_OUT.
 * This file is deliberately not part of the Node unit suite.
 */
import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import { chromium, type Page } from "playwright";
import { createGame, startActions, isEdgeVisible } from "../src/game/engine.ts";
import { EDGES, NODES } from "../src/game/data.ts";
import { serialize } from "../src/game/sim/save.ts";
import { SAVE_KEY } from "../src/game/types.ts";
import { t } from "../src/game/i18n/copy.ts";
import { copyForAction } from "../src/game/i18n/interactive.ts";

const base = process.argv[2] ?? "http://127.0.0.1:8080";
const out = process.env.ATLAS_BROWSER_OUT ?? "/workspace/screenshots/jitem-atlas";
await mkdir(out, { recursive: true });
const fixture = startActions(createGame("saha", 71));
fixture.turn = 3;
fixture.actionsLeft = 4;
fixture.stats.etki = 20;
fixture.stats.kara = 20;
fixture.revealed = Object.fromEntries(NODES.map((n) => [n.id, true]));
const edge = EDGES.find((e) => isEdgeVisible(fixture, e.id))!;
fixture.selectedEdgeId = edge.id;
fixture.selectedNodeId = null;
const payload = JSON.stringify(serialize(fixture));
const results: unknown[] = [];
const browser = await chromium.launch({
  executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE,
  headless: true,
  args: [
    "--no-sandbox",
    "--disable-dev-shm-usage",
    "--use-gl=angle",
    "--use-angle=swiftshader",
    "--enable-unsafe-swiftshader",
  ],
});
async function rendered(page: Page, mode: "pixi" | "svg") {
  await page.locator(`.atlas-surface[data-renderer="${mode}"]`).waitFor();
  assert.equal(await page.locator(".atlas-surface canvas").count(), mode === "pixi" ? 1 : 0);
}
async function inViewport(page: Page, width: number) {
  assert.ok(
    await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
    `${width}px overflow`,
  );
  const box = await page.locator(".atlas-surface").boundingBox();
  assert.ok(box && box.width > 100 && box.height >= 140, "visible decision surface");
  assert.ok(box.x >= -1 && box.x + box.width <= width + 1, "atlas stays in viewport");
}
try {
  for (const locale of ["tr", "en"] as const)
    for (const width of [1440, 390, 320]) {
      const context = await browser.newContext({ viewport: { width, height: 900 } });
      const page = await context.newPage();
      const errors: string[] = [];
      page.on("pageerror", (e) => errors.push(e.message));
      page.on("console", (m) => {
        if (m.type() === "error") errors.push(m.text());
      });
      await context.addInitScript(
        ({ key, value }) => {
          if (!localStorage.getItem(key + ":atlas-fixture-loaded")) {
            localStorage.setItem(key, value);
            localStorage.setItem(key + ":bak", value);
            localStorage.setItem(key + ":atlas-fixture-loaded", "1");
          }
        },
        { key: SAVE_KEY, value: payload },
      );
      await page.goto(`${base}/?lang=${locale}`, { waitUntil: "networkidle" });
      await page.getByRole("button", { name: new RegExp(t(locale, "start.continue")) }).click();
      await rendered(page, "pixi");
      await inViewport(page, width);
      const before = await page.evaluate((key) => localStorage.getItem(key), SAVE_KEY);
      if (width < 1024)
        await page
          .getByRole("button", { name: locale === "tr" ? "Hamle seç" : "Choose move", exact: true })
          .click();
      const actionCopy = copyForAction("bag_gozet", locale, fixture);
      const verb = actionCopy.verb ?? actionCopy.label;
      await page
        .locator(".decision-desk:visible")
        .getByRole("button", { name: new RegExp(verb) })
        .click();
      if (width < 1024)
        await page
          .locator("nav")
          .getByRole("button", { name: t(locale, "pane.map"), exact: true })
          .click();
      await page.locator('[data-testid="atlas-decision"]').waitFor();
      assert.equal(
        await page.evaluate((key) => localStorage.getItem(key), SAVE_KEY),
        before,
        "preview does not save or mutate game",
      );
      const readout = await page.locator(".atlas-readout").innerText();
      await page
        .getByRole("button", {
          name: locale === "tr" ? "Basit çizim" : "Simple rendering",
          exact: true,
        })
        .click();
      await rendered(page, "svg");
      assert.equal(await page.locator(".atlas-readout").innerText(), readout);
      await page
        .getByRole("button", {
          name: locale === "tr" ? "Otomatik çizim" : "Automatic rendering",
          exact: true,
        })
        .click();
      await rendered(page, "pixi");
      await page
        .getByRole("button", {
          name: locale === "tr" ? "Bu hamleyi uygula" : "Commit this move",
          exact: true,
        })
        .click();
      const after = await page.evaluate((key) => localStorage.getItem(key), SAVE_KEY);
      assert.notEqual(after, before, "commit persists real consequences");
      assert.ok(JSON.parse(after!).state.tags.some((tag: string) => tag.startsWith("plan-due:")));
      await page.screenshot({ path: `${out}/${locale}-${width}.png`, fullPage: true });
      await page.reload({ waitUntil: "networkidle" });
      await page.getByRole("button", { name: new RegExp(t(locale, "start.continue")) }).click();
      await rendered(page, "pixi");
      assert.equal(await page.evaluate((key) => localStorage.getItem(key), SAVE_KEY), after);
      const lost = await page
        .locator(".atlas-surface canvas")
        .evaluate((canvas: HTMLCanvasElement) => {
          const gl = canvas.getContext("webgl2") ?? canvas.getContext("webgl");
          const extension = gl?.getExtension("WEBGL_lose_context");
          extension?.loseContext();
          return Boolean(extension);
        });
      assert.equal(lost, true, "context-loss extension");
      await rendered(page, "svg");
      await page.setViewportSize({ width: width === 1440 ? 390 : 1440, height: 900 });
      await inViewport(page, width === 1440 ? 390 : 1440);
      await page.setViewportSize({ width, height: 900 });
      await inViewport(page, width);
      await page.getByRole("button", { name: t(locale, "hud.file"), exact: true }).click();
      assert.equal(
        await page.locator(".atlas-surface canvas").count(),
        0,
        "screen switch cleans canvas",
      );
      results.push({
        locale,
        width,
        pixi: true,
        fallback: true,
        reload: true,
        contextLoss: true,
        resize: true,
        consoleErrors: errors,
      });
      assert.deepEqual(errors, [], "console must be clean");
      await context.close();
    }
  // Startup without WebGL: the fallback still selects targets and persists play.
  const context = await browser.newContext({ viewport: { width: 320, height: 900 } });
  await context.addInitScript(
    ({ key, value }) => {
      localStorage.setItem(key, "{");
      localStorage.setItem(key + ":bak", value);
      const original = HTMLCanvasElement.prototype.getContext;
      HTMLCanvasElement.prototype.getContext = function (
        this: HTMLCanvasElement,
        kind: string,
        ...args: unknown[]
      ) {
        if (kind.includes("webgl") || kind === "experimental-webgl") return null;
        return Reflect.apply(original, this, [kind, ...args]);
      } as typeof original;
    },
    { key: SAVE_KEY, value: payload },
  );
  const page = await context.newPage();
  await page.goto(`${base}/?lang=tr`, { waitUntil: "networkidle" });
  await page.getByRole("button", { name: new RegExp(t("tr", "start.continue")) }).click();
  await rendered(page, "svg");
  await inViewport(page, 320);
  await page.getByLabel("Karar hedefi", { exact: true }).selectOption(`edge:${edge.id}`);
  assert.equal(await page.locator(".atlas-surface canvas").count(), 0);
  results.push({ noWebGL: true, corruptPrimaryRecovery: true });
  await context.close();
} finally {
  await writeFile(`${out}/results.json`, JSON.stringify(results, null, 2));
  await browser.close();
}
console.log(JSON.stringify({ pass: results.length, results }, null, 2));

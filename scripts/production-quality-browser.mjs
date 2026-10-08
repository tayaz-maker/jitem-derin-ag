import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import { chromium } from "playwright";
const base = process.argv[2] ?? "http://127.0.0.1:8081";
const out = process.env.ATLAS_BROWSER_OUT ?? "/workspace/screenshots/jitem-quality";
await mkdir(out, { recursive: true });
const browser = await chromium.launch({ headless: true, args: ["--no-sandbox"] });
const results = [];
try {
  for (const locale of ["tr", "en"]) for (const width of [320, 390, 1024, 1440]) {
    const context = await browser.newContext({ viewport: { width, height: 844 } });
    const page = await context.newPage();
    const errors = [];
    page.on("pageerror", (e) => errors.push(e.message));
    await page.goto(`${base}/?embed=1&lang=${locale}`, { waitUntil: "networkidle" });
    await page.locator(".start-screen-shell button").filter({ hasText: locale === "tr" ? "Saha hattı" : "Field line" }).click();
    const fits = async () => {
      const overflow = await page.evaluate(() => [...document.querySelectorAll("body, .game-shell, header")].some((el) => el.scrollWidth > el.clientWidth + 1));
      assert.equal(overflow, false, `${locale}/${width} must fit`);
    };
    await fits();
    assert.equal(await page.locator("header p").first().evaluate((el) => el.scrollWidth <= el.clientWidth), true, "date and phase must remain readable");
    if (width < 1024) {
      await page.locator("nav").getByRole("button", { name: locale === "tr" ? "Harita" : "Map", exact: true }).click();
      await page.getByLabel(locale === "tr" ? "Karar hedefi" : "Decision target", { exact: true }).selectOption("node:dogan");
      // Selecting a target opens Decision; the event sheet must not cover it.
      await page.locator(".target-pane:visible h2").filter({ hasText: "Arif Doğan" }).waitFor();
      await page.locator("nav").getByRole("button", { name: locale === "tr" ? "Olay" : "Event", exact: true }).click();
    }
    await page.locator("article:visible button").first().click();
    // Agenda must make the existing budget action reachable.
    await page.getByRole("button", { name: locale === "tr" ? "İşler" : "Work", exact: true }).filter({ visible: true }).first().click();
    const select = page.locator(".plan-record:visible");
    await select.selectOption("kara_topla");
    await page.locator(".op-grid:visible").waitFor();
    const saveBefore = await page.evaluate(() => localStorage.getItem("jitem-derin-ag-v3"));
    await page.getByRole("button", { name: locale === "tr" ? "Kararı uygula" : "Commit decision", exact: true }).filter({ visible: true }).click();
    const saveAfter = await page.evaluate(() => localStorage.getItem("jitem-derin-ag-v3"));
    assert.ok(JSON.parse(saveAfter).state.stats.kara > JSON.parse(saveBefore).state.stats.kara);
    await fits();
    await page.screenshot({ path: `${out}/quality-${locale}-${width}.png`, fullPage: true });
    await page.getByRole("button", { name: locale === "tr" ? "Dosya" : "File", exact: true }).click();
    await page.getByRole("button", { name: locale === "tr" ? "Kaynak" : "Source", exact: true }).click();
    const scroll = page.locator(".game-shell > div").last();
    await scroll.evaluate((el) => { el.scrollTop = el.scrollHeight; });
    assert.ok(await scroll.evaluate((el) => el.scrollHeight <= el.clientHeight + 1 || el.scrollTop > 0));
    await page.getByRole("button", { name: locale === "tr" ? "Kapat" : "Close", exact: true }).click();
    await page.reload({ waitUntil: "networkidle" });
    await page.getByRole("button", { name: /Devam|Continue/ }).click();
    assert.equal(await page.evaluate(() => localStorage.getItem("jitem-derin-ag-v3")), saveAfter);
    assert.deepEqual(errors, []);
    results.push({ locale, width, pass: true });
    await context.close();
  }
} finally {
  await writeFile(`${out}/quality-results.json`, JSON.stringify(results, null, 2));
  await browser.close();
}
console.log(JSON.stringify(results));

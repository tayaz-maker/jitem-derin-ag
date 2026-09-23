import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { t } from "../src/game/i18n/copy.ts";

test("selected target leads with the result chain and the decision desk", () => {
  const src = readFileSync(new URL("../src/components/game/SidePanel.tsx", import.meta.url), "utf8");
  const body = src.slice(src.indexOf("export function PersonPane"), src.indexOf("function ActionBlock"));
  const outcome = body.indexOf("<OutcomeCard");
  const desk = body.indexOf("<ContextualDecisions");
  const file = body.indexOf("map.file");
  assert.ok(outcome > 0 && desk > outcome && file > desk);
  const lastOutcome = body.lastIndexOf("<OutcomeCard");
  const lastDesk = body.lastIndexOf("<ContextualDecisions");
  const lastFile = body.lastIndexOf("map.file");
  assert.ok(lastDesk > lastOutcome && lastFile > lastDesk);
  assert.equal(t("tr", "pane.kisi"), "Karar");
  assert.equal(t("en", "pane.kisi"), "Decision");
  assert.equal(t("tr", "map.file"), "Hedef dosyası");
  assert.equal(t("en", "decision.openObj"), "Open objective");
});

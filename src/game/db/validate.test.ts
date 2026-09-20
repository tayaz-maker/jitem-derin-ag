import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { validateResearch } from "./validate.ts";
import { ALL_RESEARCH, CLAIMS, RELATIONS } from "./catalog.ts";
import { SOURCES } from "./sources.ts";

describe("research db", () => {
  it("has no blocking errors", () => {
    const errors = validateResearch().filter((i) => i.level === "error");
    assert.deepEqual(errors, []);
  });

  it("every playable person has provenance split", () => {
    for (const rec of ALL_RESEARCH.filter((r) => r.playId)) {
      assert.ok(rec.provenance.historicalFact.length > 8, rec.id);
      assert.ok(rec.provenance.sourceClaim.length > 8, rec.id);
      assert.ok(rec.provenance.gameReconstruction.length > 8, rec.id);
    }
  });

  it("claims declare contradiction field", () => {
    for (const c of CLAIMS) {
      assert.ok("contradiction" in c, c.id);
      assert.ok(c.sourceIds.length, c.id);
    }
  });

  it("relations only connect catalog playIds", () => {
    const plays = new Set(ALL_RESEARCH.map((r) => r.playId).filter(Boolean));
    for (const r of RELATIONS) {
      assert.ok(plays.has(r.fromPlayId), r.id);
      assert.ok(plays.has(r.toPlayId), r.id);
    }
  });

  it("source catalog is non-empty", () => {
    assert.ok(SOURCES.length >= 8);
  });
});

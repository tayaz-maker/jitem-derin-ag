import assert from "node:assert/strict";
import { test } from "node:test";
import { createGame } from "../src/game/engine.ts";
import { serialize } from "../src/game/sim/save.ts";
import { SAVE_KEY, LEGACY_SAVE_KEY } from "../src/game/types.ts";
import { useGame } from "../src/game/store.ts";

test("corrupt primary does not hide valid backup and loading preserves every byte", () => {
  const backup = JSON.stringify(serialize(createGame("saha", 71)));
  const entries = new Map([
    [SAVE_KEY, "{"],
    [SAVE_KEY + ":bak", backup],
  ]);
  const before = [...entries];
  const old = Object.getOwnPropertyDescriptor(globalThis, "localStorage");
  Object.defineProperty(globalThis, "localStorage", {
    configurable: true,
    value: {
      getItem: (key: string) => entries.get(key) ?? null,
      setItem: () => assert.fail("loading must not overwrite data"),
      removeItem: () => assert.fail("loading must not delete data"),
    },
  });
  try {
    assert.equal(useGame.getState().load(), true);
    assert.equal(useGame.getState().state?.worldSeed, 71);
    assert.deepEqual([...entries], before);
    entries.set(SAVE_KEY + ":bak", "{");
    entries.set(LEGACY_SAVE_KEY, backup);
    assert.equal(useGame.getState().load(), true);
    entries.delete(LEGACY_SAVE_KEY);
    assert.equal(useGame.getState().load(), false);
  } finally {
    if (old) Object.defineProperty(globalThis, "localStorage", old);
    else Reflect.deleteProperty(globalThis, "localStorage");
  }
});

test("a syntactically valid but non-object state is corrupt, not a new game", async () => {
  const { parseSave } = await import("../src/game/sim/save.ts");
  for (const state of [[], "broken", 42, true]) {
    assert.equal(parseSave(JSON.stringify({ version: 5, schemaVersion: 5, state })), null);
  }
});

import assert from "node:assert/strict";
import { test } from "node:test";
import { createGame } from "../src/game/engine.ts";
import { parseSave, serialize } from "../src/game/sim/save.ts";
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

test("save admission rejects malformed plan records and explicit future versions atomically", () => {
  const good = serialize(createGame("saha", 71));
  for (const tags of [null, "broken", [null], [42],
    ["plan-due:4:quiet:ersever::"], ["plan-due:4:other:ersever::2"],
    ["plan-due:4:quiet:missing::2"], ["plan-due:4:quiet:ersever:missing:2"],
    ["plan-due:Infinity:quiet:ersever::2"], ["plan-due:4.5:quiet:ersever::2"],
    ["plan-due:4:quiet:ersever::4"], ["plan-due:13:quiet:ersever::10"],
    ["plan-due:4:quiet:::2"], ["plan-due:4:quiet:ersever::2:extra"]]) {
    assert.equal(parseSave(JSON.stringify({ ...good, state: { ...good.state, tags } })), null, JSON.stringify(tags));
  }
  for (const key of ["version", "schemaVersion"]) for (const value of [6, 99, "5", null, 3.5]) {
    assert.equal(parseSave(JSON.stringify({ ...good, [key]: value })), null);
    assert.equal(parseSave(JSON.stringify({ ...good, state: { ...good.state, [key]: value } })), null);
  }
  const tags = ["foreign:keep-me", "plan-due:11:quiet:ersever::10", "plan-due:12:quiet:ersever::10", "plan-due:12:quiet:ersever::10"];
  assert.deepEqual(parseSave(JSON.stringify({ ...good, state: { ...good.state, tags } }))!.tags, tags);
  assert.ok(parseSave(JSON.stringify({ version: 3, state: { hat: "idari", turn: 4, stats: { giz: 50 } } })));
});

test("malformed semantic primary falls back without changing primary or backup bytes", () => {
  const good = JSON.stringify(serialize(createGame("saha", 71)));
  const bad = JSON.stringify({ ...JSON.parse(good), state: { ...JSON.parse(good).state, tags: [null] } });
  const entries = new Map([[SAVE_KEY, bad], [SAVE_KEY + ":bak", good]]);
  withStorage(entries, () => {
    const before = [...entries];
    assert.equal(useGame.getState().load(), true);
    assert.deepEqual(useGame.getState().state?.tags, createGame("saha", 71).tags);
    assert.deepEqual([...entries], before);
  }, () => assert.fail("load must not write"));
});

function withStorage(entries: Map<string, string>, run: () => void, write?: (key: string, value: string) => void) {
  const old = Object.getOwnPropertyDescriptor(globalThis, "localStorage");
  const previous = useGame.getState();
  Object.defineProperty(globalThis, "localStorage", { configurable: true, value: {
    getItem: (key: string) => entries.get(key) ?? null,
    setItem: (key: string, value: string) => write ? write(key, value) : void entries.set(key, value),
    removeItem: () => assert.fail("no save deletion"),
  } });
  try { run(); } finally {
    useGame.setState(previous);
    if (old) Object.defineProperty(globalThis, "localStorage", old);
    else Reflect.deleteProperty(globalThis, "localStorage");
  }
}

test("writes retain the previous valid generation and idempotent writes do not advance it", () => {
  const entries = new Map<string, string>();
  withStorage(entries, () => {
    useGame.getState().start("saha", 71);
    const a = entries.get(SAVE_KEY)!;
    assert.equal(entries.get(SAVE_KEY + ":bak"), a, "first write initializes recovery");
    useGame.getState().start("saha", 72);
    const b = entries.get(SAVE_KEY)!;
    assert.notEqual(a, b);
    assert.equal(entries.get(SAVE_KEY + ":bak"), a);
    useGame.getState().persist();
    assert.equal(entries.get(SAVE_KEY + ":bak"), a);
    entries.set(SAVE_KEY, "{");
    useGame.getState().persist();
    assert.equal(entries.get(SAVE_KEY), b);
    assert.equal(entries.get(SAVE_KEY + ":bak"), a, "corrupt primary never poisons good backup");
    useGame.setState({ state: { ...createGame("saha", 73), tags: [null] } as never });
    useGame.getState().persist();
    assert.equal(entries.get(SAVE_KEY), b, "invalid in-memory state cannot overwrite a good save");
  });
});

test("backup failure aborts primary replacement; primary quota failure preserves a recoverable generation", () => {
  const a = JSON.stringify(serialize(createGame("saha", 71)));
  const older = JSON.stringify(serialize(createGame("saha", 70)));
  for (const failure of ["backup", "primary", "silent-backup"]) {
    const entries = new Map([[SAVE_KEY, a], [SAVE_KEY + ":bak", older]]);
    const writes: string[] = [];
    withStorage(entries, () => {
      useGame.getState().start("saha", 72);
      assert.equal(entries.get(SAVE_KEY), a);
      assert.ok(parseSave(entries.get(SAVE_KEY + ":bak")!));
      if (failure !== "primary") assert.deepEqual(writes, [SAVE_KEY + ":bak"]);
      else assert.equal(entries.get(SAVE_KEY + ":bak"), a);
    }, (key, value) => {
      writes.push(key);
      if (failure === "backup" && key.endsWith(":bak")) throw new Error("quota");
      if (failure === "primary" && key === SAVE_KEY) throw new Error("quota");
      if (failure === "silent-backup" && key.endsWith(":bak")) return;
      entries.set(key, value);
    });
  }
});

// Every public image must resolve under Vite's base, so the embedded build
// (served from /games/jitem-derin-ag/) loads the same files as the standalone.
import test from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

function files(dir) {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    return statSync(path).isDirectory() ? files(path) : /\.(tsx?|css)$/.test(name) ? [path] : [];
  });
}

test("no source file hard-codes a root-absolute /images/ path", () => {
  const offenders = files("src").filter((path) => /["'`(]\/images\//.test(readFileSync(path, "utf8")));
  assert.deepEqual(offenders, []);
});

test("every referenced public image exists", () => {
  const names = new Set();
  for (const path of files("src"))
    for (const match of readFileSync(path, "utf8").matchAll(/images\/([a-z0-9-]+\.(?:jpg|png|webp|svg))/g)) names.add(match[1]);
  assert.ok(names.has("map.jpg"));
  for (const name of names) assert.ok(statSync(join("public/images", name)).isFile(), name);
});

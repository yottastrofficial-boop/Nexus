import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);
const read = path => readFile(new URL(path, root), "utf8");
const [packageJson, ignore, auth, config, smoke, guide] = await Promise.all([
  read("tools/foundry-testing/package.json"),
  read("tools/foundry-testing/.gitignore"),
  read("tools/foundry-testing/auth/setup-session.mjs"),
  read("tools/foundry-testing/playwright.config.js"),
  read("tools/foundry-testing/tests/foundry-smoke.spec.js"),
  read("tools/foundry-testing/README.md")
]);

test("Foundry Testing Bridge is isolated and ignores local session artifacts", () => {
  const pkg = JSON.parse(packageJson);
  assert.equal(pkg.private, true);
  assert.equal(pkg.devDependencies["@playwright/test"], "1.56.1");
  assert.match(ignore, /^node_modules\/$/m);
  assert.match(ignore, /^\.auth\/$/m);
  assert.match(ignore, /^test-results\/$/m);
  assert.match(ignore, /^playwright-report\/$/m);
  assert.match(config, /storageState: authState/);
});

test("session preparation requires the exact disposable world and GM access", () => {
  assert.match(auth, /FOUNDRY_TEST_WORLD_ID/);
  assert.match(auth, /runtime\.worldId !== expectedWorldId/);
  assert.match(auth, /runtime\.isGM/);
  assert.match(auth, /context\.storageState\(\{ path: statePath \}\)/);
});

test("smoke test checks the world ID and removes only its own temporary Actor", () => {
  assert.match(smoke, /process\.env\.FOUNDRY_TEST_WORLD_ID/);
  assert.match(smoke, /runtime\.worldId\)\.toBe\(expectedWorldId\)/);
  assert.match(smoke, /Actor\.create\(\{ name, type: "player-character" \}\)/);
  assert.match(smoke, /finally[\s\S]*?if \(actorId\)[\s\S]*?actor\.delete\(\)/);
  assert.match(smoke, /form\.nexus-sheet/);
  assert.match(smoke, /nexus-canvas-stage/);
});

test("local guide warns that session state must not be shared", () => {
  assert.match(guide, /não compartilhe/i);
  assert.match(guide, /mundo descartável/i);
});

import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";

const read = path => readFileSync(new URL(path, import.meta.url), "utf8");
const workflows = { "validate.yml": read("../.github/workflows/validate.yml"), "release.yml": read("../.github/workflows/release.yml") };

for (const [name, text] of Object.entries(workflows)) {
  assert.match(text, /node tests\/run-all\.mjs/, `${name} must run the unified suite.`);
  assert.doesNotMatch(text, /node [^\n]*tests\/(?!run-all)[\w.-]+\.mjs/,
    `${name} must not list individual test files; add tests under tests/ and run-all.mjs discovers them.`);
}

const runner = read("./run-all.mjs");
assert.ok(runner.includes('endsWith(".mjs")') && runner.includes('readdirSync(join(root, "tests"))'),
  "The runner must discover test files instead of using a hard-coded list.");
assert.ok(readdirSync(new URL("./", import.meta.url)).includes("run-all.mjs"), "tests/run-all.mjs must exist.");

console.log("NEXUS CI suite contract: OK");

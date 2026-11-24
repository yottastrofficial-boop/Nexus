// Single entry point for the NEXUS automated suite.
// Used by .github/workflows/validate.yml and release.yml so both always run
// the same checks. Every tests/*.mjs file is discovered automatically, so a
// new test can never be left out of CI by forgetting to list it.
import { readdirSync, readFileSync } from "node:fs";
import { join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const root = fileURLToPath(new URL("../", import.meta.url));
const self = fileURLToPath(import.meta.url);

function walk(dir, out = []) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) walk(path, out);
    else if (entry.isFile() && entry.name.endsWith(".js")) out.push(path);
  }
  return out;
}

const failures = [];

// 1. Syntax check of every shipped script (same check release.yml used before).
const sources = ["scripts", "assets"].flatMap(dir => walk(join(root, dir)));
for (const file of sources) {
  const result = spawnSync(process.execPath, ["--input-type=module", "--check"], {
    input: readFileSync(file), encoding: "utf8"
  });
  if (result.status !== 0) {
    failures.push(`syntax: ${relative(root, file)}`);
    process.stderr.write(result.stderr);
  }
}
console.log(`Syntax check: ${sources.length - failures.length}/${sources.length} files OK`);

// 2. Every test file in tests/, in stable alphabetical order.
const tests = readdirSync(join(root, "tests"))
  .filter(name => name.endsWith(".mjs"))
  .map(name => join(root, "tests", name))
  .filter(file => file !== self)
  .sort();
if (!tests.length) { console.error("No test files found in tests/."); process.exit(1); }

for (const file of tests) {
  const name = relative(root, file);
  console.log(`\n▶ ${name}`);
  const result = spawnSync(process.execPath, ["--experimental-default-type=module", file], {
    cwd: root, stdio: "inherit"
  });
  if (result.status !== 0) failures.push(name);
}

console.log(`\nSuite: ${tests.length - failures.filter(f => !f.startsWith("syntax:")).length}/${tests.length} test files passed`);
if (failures.length) {
  console.error(`FAILED:\n - ${failures.join("\n - ")}`);
  process.exit(1);
}

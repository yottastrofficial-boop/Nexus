import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const system = JSON.parse(readFileSync(new URL("../system.json", import.meta.url), "utf8"));
const stable = JSON.parse(readFileSync(new URL("../manifest.json", import.meta.url), "utf8"));
const readme = readFileSync(new URL("../README.md", import.meta.url), "utf8");
const changelog = readFileSync(new URL("../CHANGELOG.md", import.meta.url), "utf8");

const versionParts = value => value.split("-")[0].split(".").map(Number);
const compareCore = (left, right) => {
  const a = versionParts(left);
  const b = versionParts(right);
  for (let i = 0; i < Math.max(a.length, b.length); i++) {
    if ((a[i] ?? 0) !== (b[i] ?? 0)) return (a[i] ?? 0) > (b[i] ?? 0) ? 1 : -1;
  }
  return 0;
};

const coreOrder = compareCore(system.version, stable.version);
assert.ok(coreOrder > 0 || (coreOrder === 0 && /^\\d+\\.\\d+\\.\\d+\\.\\d+-rc\\.[1-9]\\d*$/.test(stable.version)),
  "The development base must be newer than the installed manifest, or the manifest must be a candidate of that same base.");
assert.match(system.download, /\\/releases\\/download\\/v[^/]+\\/nexus\\.zip$/,
  "The development system metadata must retain a valid published package URL.");
assert.equal(system.manifest, "https://raw.githubusercontent.com/yottastrofficial-boop/Nexus/main/manifest.json",
  "The system metadata must use the original main manifest.");
assert.ok(readme.includes(system.version), "README must identify the current development build.");
assert.ok(changelog.startsWith(`## ${system.version} —`),
  "CHANGELOG must start with the current development build.");

console.log("NEXUS package/stable-manifest version contract: OK");

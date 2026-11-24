import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const system = JSON.parse(readFileSync(new URL("../system.json", import.meta.url), "utf8"));
const stable = JSON.parse(readFileSync(new URL("../manifest.json", import.meta.url), "utf8"));
const readme = readFileSync(new URL("../README.md", import.meta.url), "utf8");
const changelog = readFileSync(new URL("../CHANGELOG.md", import.meta.url), "utf8");

const versionParts = value => value.split(".").map(Number);
const isNewer = (current, previous) => {
  const a = versionParts(current);
  const b = versionParts(previous);
  for (let i = 0; i < Math.max(a.length, b.length); i++) {
    if ((a[i] ?? 0) !== (b[i] ?? 0)) return (a[i] ?? 0) > (b[i] ?? 0);
  }
  return false;
};

assert.ok(isNewer(system.version, stable.version),
  "The development package must be newer than the stable update manifest.");
assert.ok(system.download.endsWith(`/v${stable.version}/nexus.zip`),
  "The development system metadata must retain the last published stable download URL.");
assert.ok(readme.includes(system.version), "README must identify the current development build.");
assert.ok(changelog.startsWith(`## ${system.version} —`),
  "CHANGELOG must start with the current development build.");

console.log("NEXUS package/stable-manifest version contract: OK");

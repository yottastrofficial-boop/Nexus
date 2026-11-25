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

assert.ok(compareCore(system.version, stable.version) >= 0,
  "The main package version must not be older than the stable manifest version.");
const packageDownloadVersion = system.download.match(/\/releases\/download\/v([^/]+)\/nexus\.zip$/)?.[1];
assert.equal(packageDownloadVersion, system.version,
  "The packaged system metadata must point to the package matching its own version.");
const stableDownloadVersion = stable.download.match(/\/releases\/download\/v([^/]+)\/nexus\.zip$/)?.[1];
assert.equal(stableDownloadVersion, stable.version,
  "The original manifest must point to the package matching its stable version.");
assert.equal(system.manifest, "https://raw.githubusercontent.com/yottastrofficial-boop/Nexus/main/manifest.json",
  "The system metadata must use the original main manifest.");
assert.ok(readme.includes(system.version), "README must identify the current main build.");
assert.ok(changelog.startsWith(`## ${system.version} —`),
  "CHANGELOG must start with the current main build.");

console.log("NEXUS package/stable-manifest version contract: OK");

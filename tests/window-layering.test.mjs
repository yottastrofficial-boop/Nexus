import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const sheet = readFileSync(new URL("../scripts/sheets/actor-sheet-v1.0.0.js", import.meta.url), "utf8");

assert.match(sheet, /app\.appendChild\(portal\)/,
  "Floating rails must be children of the native ApplicationV2 sheet.");
assert.doesNotMatch(sheet, /document\.body\.appendChild\(portal\)/,
  "Floating rails must not be placed in a separate body-level layer.");
assert.doesNotMatch(sheet, /resolveNexusFloatingLayer|syncRailFocus/,
  "The sheet must not maintain a parallel z-index or focus calculation.");
assert.match(sheet, /app\.getBoundingClientRect\(\)/,
  "Rail positions must be calculated relative to their owning application.");
assert.match(sheet, /position:\s*"absolute"/,
  "Rails must remain app-relative so Foundry controls their stacking order.");

console.log("NEXUS native window layering contract: OK");

import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { buildGroupHierarchy } from "../scripts/core/group-hierarchy.js";

// Deep trees must reuse the hierarchy's precomputed depth index in the
// renderer instead of repeatedly walking every ancestor chain.
const count = 2500;
const groups = Array.from({ length: count }, (_, index) => ({
  id: `depth-${index}`,
  parentGroupId: index === 0 ? "" : `depth-${index - 1}`,
  componentIds: []
}));
const hierarchy = buildGroupHierarchy(groups, []);
assert.equal(hierarchy.depthById.get(`depth-${count - 1}`), count - 1);

const renderer = await readFile(new URL("../scripts/sheets/canvas-group-rendering.js", import.meta.url), "utf8");
assert.match(renderer, /hierarchy\.depthById\.get\(String\(id\)\)/,
  "Canvas group rendering must use the precomputed depth index");
assert.match(renderer, /groups\.reduce\(\(max, group\) => Math\.max\(max, depthOf\(group\.id\)\), 0\)/,
  "Maximum depth must be computed without spreading a potentially large array");
assert.doesNotMatch(renderer, /let depth = 0, cursor = hierarchy\.parentById/,
  "Canvas group rendering must not walk each group's ancestor chain repeatedly");

console.log("Canvas group performance regressions passed.");

import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { buildGroupHierarchy } from "../scripts/core/group-hierarchy.js";
import { iterateCanvasContactPairs } from "../scripts/sheets/canvas-connected-corners.js";

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

const actorSheet = await readFile(new URL("../scripts/sheets/actor-sheet-v1.0.0.js", import.meta.url), "utf8");
assert.match(actorSheet, /pendingActorRulesInitialization = new WeakMap\(\)/,
  "Rules initialization must be coordinated per Actor, not only per sheet instance");
assert.match(actorSheet, /pendingActorRulesInitialization\.get\(actor\)/,
  "A second sheet for the same Actor must await the in-flight initialization");
assert.match(actorSheet, /pendingActorRulesInitialization\.set\(actor, operation\)/,
  "The first sheet must publish its initialization Promise before another sheet can start a duplicate write");

const touchingRects = [
  { left: 0, right: 10, top: 0, bottom: 10 },
  { left: 10, right: 20, top: 0, bottom: 10 },
  { left: 0, right: 10, top: 10, bottom: 20 },
  { left: 10, right: 20, top: 10, bottom: 20 },
  { left: 100, right: 110, top: 100, bottom: 110 }
];
const touchingPairs = new Set([...iterateCanvasContactPairs(touchingRects)].map(([a, b]) => `${a}:${b}`));
assert.ok(touchingPairs.has("0:1"), "Adjacent horizontal surfaces must remain candidate pairs");
assert.ok(touchingPairs.has("0:2"), "Adjacent vertical surfaces must remain candidate pairs");
assert.ok(touchingPairs.has("0:3"), "Corner-touching surfaces must remain candidate pairs");
assert.ok(!touchingPairs.has("0:4"), "Distant surfaces must not be compared");

const scatteredRects = Array.from({ length: 2000 }, (_, index) => ({
  left: index * 20, right: index * 20 + 10, top: (index % 7) * 20, bottom: (index % 7) * 20 + 10
}));
assert.equal([...iterateCanvasContactPairs(scatteredRects)].length, 0,
  "A large scattered Canvas should avoid the quadratic all-pairs scan");

const contactSource = await readFile(new URL("../scripts/sheets/canvas-connected-corners.js", import.meta.url), "utf8");
assert.match(contactSource, /iterateCanvasContactPairs\(visible\.map\(item => item\.rect\), tolerance\)/,
  "Corner updates must use the spatial sweep rather than nested all-pairs loops");
assert.doesNotMatch(contactSource, /for \(let i = 0; i < visible\.length; i\+\+\) for \(let j = i \+ 1/,
  "The quadratic pairwise scan must not return");

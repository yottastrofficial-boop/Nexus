import assert from "node:assert/strict";
import { getAxisAnchors, findBestAlignmentMatch } from "../scripts/core/canvas-geometry.js";

const source = { x: 0, y: 0, w: 10, h: 10 };
const target = { x: 14, y: 20, w: 10, h: 10 };

assert.deepEqual(getAxisAnchors(source, "x"), [0, 5, 10]);
assert.deepEqual(getAxisAnchors(source, "y"), [0, 5, 10]);

assert.deepEqual(
  findBestAlignmentMatch([source], [target], "x"),
  { delta: 4, pos: 14, distance: 10, labelAt: 15 },
  "horizontal alignment should snap the nearest source edge to the target edge"
);

assert.deepEqual(
  findBestAlignmentMatch([source], [target], "y"),
  { delta: 10, pos: 20, distance: 4, labelAt: 12 },
  "vertical alignment should snap the nearest source edge to the target edge"
);

assert.equal(findBestAlignmentMatch([], [target], "x"), null);
assert.equal(findBestAlignmentMatch([source], [], "x"), null);
assert.equal(findBestAlignmentMatch([source], [{ x: 100, y: 0, w: 10, h: 10 }], "x"), null);
assert.equal(findBestAlignmentMatch([source], [target], "x", 3), null);

const closer = { x: 11, y: 0, w: 10, h: 10 };
assert.equal(
  findBestAlignmentMatch([source], [target, closer], "x")?.pos,
  11,
  "the closest eligible anchor should win regardless of target array order"
);

console.log("NEXUS canvas-geometry: testes aprovados.");

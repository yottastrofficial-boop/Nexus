import assert from "node:assert/strict";
import { NEXUS_COMPONENTS, NEXUS_COMPONENT_GRID_UNIT, normalizeNexusComponentDimension } from "../scripts/core/component-types.js";
import { NEXUS_LIBRARY_CATALOG } from "../assets/library/catalog.js";

assert.equal(NEXUS_COMPONENT_GRID_UNIT, 10);
assert.equal(normalizeNexusComponentDimension(58), 60);
assert.equal(normalizeNexusComponentDimension(64), 60);
assert.equal(normalizeNexusComponentDimension(66), 70);
assert.equal(normalizeNexusComponentDimension(0, 40), 40);
assert.equal(normalizeNexusComponentDimension("invalid", 30), 30);

for (const [type, definition] of Object.entries(NEXUS_COMPONENTS)) {
  assert.equal(definition.w % NEXUS_COMPONENT_GRID_UNIT, 0, `${type} width must follow the 10px grid`);
  assert.equal(definition.h % NEXUS_COMPONENT_GRID_UNIT, 0, `${type} height must follow the 10px grid`);
}

console.log("NEXUS component grid contract: OK");

for (const asset of NEXUS_LIBRARY_CATALOG.assets ?? []) {
  const template = asset.template ?? {};
  if (Number.isFinite(Number(template.w))) assert.equal(Number(template.w) % NEXUS_COMPONENT_GRID_UNIT, 0, `${asset.key} width must follow the 10px grid`);
  if (Number.isFinite(Number(template.h))) assert.equal(Number(template.h) % NEXUS_COMPONENT_GRID_UNIT, 0, `${asset.key} height must follow the 10px grid`);
}

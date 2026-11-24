import assert from "node:assert/strict";
import {
  buildGroupHierarchy,
  getGroupDescendantComponentIds,
  getGroupTreeSnapshot,
  validateGroupParent
} from "../scripts/core/group-hierarchy.js";

const groups = [
  { id: "root", name: "Raiz", componentIds: ["a", "a", "missing"] },
  { id: "child", name: "Filho", parentGroupId: "root", componentIds: ["b", "a"] },
  { id: "orphan", name: "Órfão", parentGroupId: "missing-group", componentIds: [] }
];
const components = [
  { id: "a", type: "resource", definition: { internal: true }, settings: { label: "PV" } },
  { id: "b", type: "attribute", settings: { label: "FOR" } },
  { id: "c", type: "text" }
];

const hierarchy = buildGroupHierarchy(groups, components);
assert.deepEqual(hierarchy.roots, ["root", "orphan"]);
assert.equal(hierarchy.parentById.get("orphan"), "", "missing parents must be normalized to roots");
assert.deepEqual(hierarchy.directComponents.get("root"), ["a"]);
assert.deepEqual(hierarchy.directComponents.get("child"), ["b"]);
assert.equal(hierarchy.componentOwner.get("a"), "root", "the first valid group keeps ownership of a duplicated component");
assert.deepEqual(getGroupDescendantComponentIds("root", hierarchy), ["a", "b"]);
assert.deepEqual(getGroupDescendantComponentIds("unknown", hierarchy), []);
assert.deepEqual(
  hierarchy.rows.map(row => [row.id, row.kind, row.depth]),
  [
    ["root", "group", 0],
    ["a", "component", 1],
    ["child", "group", 1],
    ["b", "component", 2],
    ["orphan", "group", 0],
    ["c", "component", 0]
  ]
);

const cyclicGroups = [
  { id: "a", parentGroupId: "b", componentIds: [] },
  { id: "b", parentGroupId: "a", componentIds: [] },
  { id: "c", parentGroupId: "b", componentIds: [] }
];
const repaired = buildGroupHierarchy(cyclicGroups, []);
assert.deepEqual(repaired.roots, ["a"], "a corrupt cycle must be broken deterministically");
assert.equal(repaired.parentById.get("a"), "");
assert.equal(repaired.parentById.get("b"), "a");
assert.equal(repaired.depthById.get("c"), 2);
assert.equal(validateGroupParent(cyclicGroups, "b", "c"), false, "a descendant cannot become its ancestor");
assert.equal(validateGroupParent(cyclicGroups, "b", "a"), false, "a corrupt ancestor cycle must not be accepted as a new parent");
assert.equal(
  validateGroupParent([
    { id: "root", parentGroupId: "" },
    { id: "child", parentGroupId: "root" },
    { id: "sibling", parentGroupId: "root" }
  ], "child", "root"),
  true,
  "moving a group beneath its valid existing ancestor remains valid"
);
assert.equal(validateGroupParent(cyclicGroups, "b", "missing"), false);
assert.equal(validateGroupParent(cyclicGroups, "b", "b"), false);

const snapshotGroups = [
  { id: "snapshot-root", name: "Composição", parentGroupId: "", componentIds: ["snapshot-component"], kind: "container", customMetadata: { keep: true } },
  { id: "snapshot-child", name: "Subgrupo", parentGroupId: "snapshot-root", componentIds: [] }
];
const snapshotComponents = [
  { id: "snapshot-component", type: "resource", definition: { private: true }, settings: { label: "PV" } }
];
const snapshot = getGroupTreeSnapshot("snapshot-root", snapshotGroups, snapshotComponents);
assert.equal(snapshot.name, "Composição");
assert.deepEqual(snapshot.customMetadata, { keep: true });
assert.equal("id" in snapshot, false);
assert.equal("parentGroupId" in snapshot, false);
assert.equal("x" in snapshot, false);
assert.equal(snapshot.componentIds[0].sourceId, "snapshot-component");
assert.equal("id" in snapshot.componentIds[0], false);
assert.equal("definition" in snapshot.componentIds[0], false);
assert.deepEqual(snapshot.groups.map(group => group.name), ["Subgrupo"]);
assert.equal(getGroupTreeSnapshot("missing", snapshotGroups, snapshotComponents), null);
assert.equal(snapshotComponents[0].id, "snapshot-component", "snapshot creation must not mutate source components");

console.log("NEXUS group-hierarchy: testes aprovados.");

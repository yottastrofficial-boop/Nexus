import assert from "node:assert/strict";
import { getLibraryCatalogResourceKey, getLibraryCatalogPreferenceReference } from "../scripts/library/catalog-explorer.js";

assert.equal(
  getLibraryCatalogResourceKey({
    providerId: "nexus-library",
    id: "components:abc",
    reference: { providerId: "nexus-library", collection: "components", id: "abc" }
  }),
  "components:abc",
  "Personal NEXUS entries must retain compatibility with existing collection preferences."
);

assert.equal(
  getLibraryCatalogResourceKey({
    providerId: "foundry-documents",
    id: "Actor.123",
    reference: { providerId: "foundry-documents", uuid: "Actor.123" }
  }),
  "foundry-documents:Actor.123",
  "Foundry documents must use stable UUID-based preference keys."
);

assert.equal(
  getLibraryCatalogResourceKey({
    providerId: "nexus-library",
    id: "builtin:asset-1",
    reference: { providerId: "nexus-library", builtin: "asset", key: "asset-1" }
  }),
  "nexus-library:builtin:asset-1",
  "Built-in resources must have a stable provider-scoped key."
);

assert.deepEqual(
  getLibraryCatalogPreferenceReference("components:abc"),
  { providerId: "nexus-library", id: "components:abc" },
  "Legacy collection keys must resolve through the NEXUS provider."
);
assert.deepEqual(
  getLibraryCatalogPreferenceReference("foundry-documents:Actor.abc"),
  { providerId: "foundry-documents", id: "Actor.abc" },
  "Foundry preferences must resolve by UUID, not by the current catalog page."
);
assert.deepEqual(
  getLibraryCatalogPreferenceReference("nexus-library:builtin:asset-1"),
  { providerId: "nexus-library", id: "builtin:asset-1" },
  "Built-in resources must retain their full provider-scoped identifier."
);
assert.equal(getLibraryCatalogPreferenceReference("invalid"), null);

console.log("Library catalog Explorer identity tests passed.");

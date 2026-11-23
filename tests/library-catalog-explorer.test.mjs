import assert from "node:assert/strict";
import { getLibraryCatalogResourceKey } from "../scripts/library/catalog-explorer.js";

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

console.log("Library catalog Explorer identity tests passed.");

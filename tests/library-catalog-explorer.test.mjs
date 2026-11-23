import assert from "node:assert/strict";
import { getLibraryCatalogResourceKey, getLibraryCatalogPreferenceReference, populateLibraryCompendiumSelect } from "../scripts/library/catalog-explorer.js";

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

test("compendium selector exposes only packs allowed by Foundry permissions", () => {
  const previousGame = globalThis.game;
  const previousConst = globalThis.CONST;
  const previousDocument = globalThis.document;
  try {
    const user = { isGM: false };
    const allowed = {
      collection: "world.public", documentName: "JournalEntry", visible: true,
      metadata: { label: "Público" },
      testUserPermission: (candidate, level) => candidate === user && level === 2
    };
    const denied = {
      collection: "world.private", documentName: "JournalEntry", visible: true,
      metadata: { label: "Privado" },
      testUserPermission: () => false
    };
    const unchecked = {
      collection: "world.unknown", documentName: "JournalEntry", visible: true,
      metadata: { label: "Sem verificação" }
    };
    const hidden = {
      collection: "world.hidden", documentName: "JournalEntry", visible: false,
      metadata: { label: "Oculto" },
      testUserPermission: () => true
    };
    globalThis.game = { user, packs: { contents: [allowed, denied, unchecked, hidden] } };
    globalThis.CONST = { DOCUMENT_OWNERSHIP_LEVELS: { OBSERVER: 2 } };
    globalThis.document = { createElement: tag => ({ tagName: tag }) };
    const select = {
      children: [],
      replaceChildren() { this.children = []; },
      append(option) { this.children.push(option); }
    };

    const result = populateLibraryCompendiumSelect(select, ["world.public", "world.private"]);
    assert.deepEqual(result, ["world.public"]);
    assert.equal(select.children.length, 1);
    assert.equal(select.children[0].value, "world.public");
    assert.equal(select.children[0].selected, true);
    assert.match(select.children[0].textContent, /Público/);
  } finally {
    if (previousGame === undefined) delete globalThis.game; else globalThis.game = previousGame;
    if (previousConst === undefined) delete globalThis.CONST; else globalThis.CONST = previousConst;
    if (previousDocument === undefined) delete globalThis.document; else globalThis.document = previousDocument;
  }
});

test("GM can select visible supported compendiums without a player permission check", () => {
  const previousGame = globalThis.game;
  const previousDocument = globalThis.document;
  try {
    globalThis.game = {
      user: { isGM: true },
      packs: { contents: [{ collection: "world.gm", documentName: "Macro", visible: true }] }
    };
    globalThis.document = { createElement: tag => ({ tagName: tag }) };
    const select = { children: [], replaceChildren() { this.children = []; }, append(option) { this.children.push(option); } };
    assert.deepEqual(populateLibraryCompendiumSelect(select), ["world.gm"]);
  } finally {
    if (previousGame === undefined) delete globalThis.game; else globalThis.game = previousGame;
    if (previousDocument === undefined) delete globalThis.document; else globalThis.document = previousDocument;
  }
});

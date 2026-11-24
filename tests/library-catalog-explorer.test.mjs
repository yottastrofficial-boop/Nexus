import test from "node:test";
import assert from "node:assert/strict";
import { getLibraryCatalogResourceKey, getLibraryCatalogPreferenceReference, populateLibraryCompendiumSelect, getLibraryResourceIcon, getLibraryThemePreviewColors, getLibraryResourcePreviewModel } from "../scripts/library/catalog-explorer.js";

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

test("catalog cards use semantic icons for each resource family", () => {
  assert.equal(getLibraryResourceIcon({ kind: "component" }), "fa-solid fa-puzzle-piece");
  assert.equal(getLibraryResourceIcon({ kind: "composition" }), "fa-solid fa-layer-group");
  assert.equal(getLibraryResourceIcon({ kind: "theme" }), "fa-solid fa-palette");
  assert.equal(getLibraryResourceIcon({ kind: "logic", type: "flow" }), "fa-solid fa-diagram-project");
  assert.equal(getLibraryResourceIcon({ kind: "logic", type: "function" }), "fa-solid fa-code");
  assert.equal(getLibraryResourceIcon({ kind: "document", type: "Actor" }), "fa-solid fa-user");
  assert.equal(getLibraryResourceIcon({ kind: "document", type: "Scene" }), "fa-solid fa-map");
  assert.equal(getLibraryResourceIcon({ kind: "unknown" }), "fa-solid fa-cube");
});

test("theme Inspector preview exposes only supported valid palette colors", () => {
  assert.deepEqual(getLibraryThemePreviewColors({
    palette: {
      canvasColor: "#101820",
      cardColor: "#223344",
      highlightColor: "#abc",
      buttonColor: "url(javascript:alert(1))",
      unknown: "#ffffff"
    }
  }), [
    { label: "Canvas", value: "#101820" },
    { label: "Cartão", value: "#223344" },
    { label: "Destaque", value: "#abc" }
  ]);
  assert.deepEqual(getLibraryThemePreviewColors({ palette: null }), []);
  assert.deepEqual(getLibraryThemePreviewColors({}), []);
});


test("resource Inspector previews expose safe summaries for components, groups and layouts", () => {
  const component = getLibraryResourcePreviewModel(
    { kind: "component", type: "sheet-resource", reference: { collection: "components" } },
    { type: "sheet-resource", settings: { w: 220, h: 58, sheetCode: "PV" } }
  );
  assert.equal(component.kind, "component");
  assert.match(component.summary, /220 × 58 px/);
  assert.equal(component.details.find(([label]) => label === "Configurações")[1], "3");

  const group = getLibraryResourcePreviewModel(
    { kind: "composition", reference: { collection: "groups" } },
    { components: [{}, {}, {}], groups: [{}] }
  );
  assert.equal(group.summary, "3 componentes · 1 subgrupo");

  const layout = getLibraryResourcePreviewModel(
    { kind: "layout", reference: { collection: "layouts" } },
    { name: "Ficha", layout: { width: 900, height: 700, components: [{}, {}], groups: [{}] } }
  );
  assert.equal(layout.summary, "2 componentes · 1 grupo · 900 × 700 px");
});

test("media Inspector previews reject executable, traversal and SVG sources", () => {
  const unsafe = getLibraryResourcePreviewModel(
    { kind: "media", reference: { collection: "media" } },
    { url: "javascript:alert(1)" }
  );
  assert.equal(unsafe.source, "");
  assert.equal(unsafe.mediaType, "unsupported");

  const traversal = getLibraryResourcePreviewModel(
    { kind: "media", reference: { collection: "media" } },
    { path: "../private/secret.png" }
  );
  assert.equal(traversal.source, "");

  const svg = getLibraryResourcePreviewModel(
    { kind: "media", reference: { collection: "media" } },
    { path: "icons/unsafe.svg" }
  );
  assert.equal(svg.mediaType, "unsupported");

  const svgMime = getLibraryResourcePreviewModel(
    { kind: "media", reference: { collection: "media" } },
    { path: "icons/image.png", mimeType: "image/svg+xml" }
  );
  assert.equal(svgMime.mediaType, "unsupported");

  const video = getLibraryResourcePreviewModel(
    { kind: "media", reference: { collection: "media" } },
    { path: "media/preview.mp4" }
  );
  assert.equal(video.mediaType, "video");
  assert.equal(video.source, "media/preview.mp4");
});

test("logic Inspector previews remain descriptive and do not execute payloads", () => {
  const flow = getLibraryResourcePreviewModel(
    { kind: "logic", type: "flow" },
    { flow: { triggers: [{}], conditions: [{}, {}], actions: [{}, {}, {}] } }
  );
  assert.equal(flow.details.find(([label]) => label === "Gatilhos")[1], "1");
  assert.equal(flow.details.find(([label]) => label === "Condições")[1], "2");
  assert.equal(flow.details.find(([label]) => label === "Ações")[1], "3");

  const rule = getLibraryResourcePreviewModel(
    { kind: "logic", type: "rule" },
    { payload: { expression: "@resources.pv.value > 0" } }
  );
  assert.equal(rule.details[0][1], "@resources.pv.value > 0");
});

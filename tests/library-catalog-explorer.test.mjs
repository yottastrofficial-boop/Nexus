import test from "node:test";
import assert from "node:assert/strict";
import { getLibraryCatalogResourceKey, getLibraryCatalogPreferenceReference, populateLibraryCompendiumSelect, getLibraryResourceIcon, getLibraryResourcePreviewModel, getLibraryMediaInsertionSource, getLibraryThemePreviewColors } from "../scripts/library/catalog-explorer.js";

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


assert.equal(getLibraryResourceIcon({ kind: "document", type: "actors" }), "fa-solid fa-user");
assert.equal(getLibraryResourceIcon({ kind: "logic", type: "rule" }), "fa-solid fa-scale-balanced");

assert.equal(getLibraryResourceIcon({ kind: "media" }), "fa-solid fa-photo-film");


const imageResource = { kind: "media", reference: { collection: "media" }, thumbnail: "maps/region.webp", name: "Mapa" };
const imagePreview = getLibraryResourcePreviewModel(imageResource, { path: "maps/region.webp", mimeType: "image/webp" });
assert.equal(imagePreview.mediaType, "image");
assert.equal(getLibraryMediaInsertionSource(imageResource, { path: "maps/region.webp", mimeType: "image/webp" }), "maps/region.webp");
assert.equal(getLibraryMediaInsertionSource(imageResource, { path: "maps/region.svg", mimeType: "image/svg+xml" }), "");
assert.equal(getLibraryMediaInsertionSource(imageResource, { path: "javascript:alert(1)", mimeType: "image/png" }), "");

const audioPreview = getLibraryResourcePreviewModel({ kind: "media", reference: { collection: "media" } }, { path: "audio/theme.ogg", mimeType: "audio/ogg" });
assert.equal(audioPreview.mediaType, "audio");
assert.equal(getLibraryResourcePreviewModel({ kind: "media", reference: { collection: "media" } }, { path: "data:image/png;base64,AAAA" }).mediaType, "unsupported");

const logicPreview = getLibraryResourcePreviewModel({ kind: "logic", type: "flow" }, { payload: { triggers: [{}], conditions: [{}, {}], actions: [{}, {}, {}] } });
assert.equal(logicPreview.details.find(([label]) => label === "Ações")[1], "3");


test("theme detail previews expose only known, safe palette colors", () => {
  assert.deepEqual(
    getLibraryThemePreviewColors({
      palette: {
        canvasColor: "#101820",
        cardColor: "#223344",
        highlightColor: "#abc",
        buttonColor: "url(javascript:alert(1))",
        unknownColor: "#ffffff"
      }
    }),
    [
      { label: "Canvas", value: "#101820" },
      { label: "Cartão", value: "#223344" },
      { label: "Destaque", value: "#abc" }
    ]
  );
  assert.deepEqual(getLibraryThemePreviewColors({ palette: { canvasColor: "red" } }), []);
});

test("component inspector preview model carries safe appearance data", () => {
  const preview = getLibraryResourcePreviewModel(
    { kind: "component", type: "asset-meter", name: "Barra de recurso", reference: { collection: "components", id: "meter" } },
    { type: "asset-meter", settings: { label: "PV", previewCurrent: 18, previewMax: 30, w: 220, h: 58 } }
  );
  assert.equal(preview.kind, "component");
  assert.equal(preview.preview.label, "PV");
  assert.equal(preview.preview.current, 18);
  assert.equal(preview.preview.max, 30);
  assert.equal(preview.summary, "asset-meter · 220 × 58 px");
  const unsafe = getLibraryResourcePreviewModel(
    { kind: "component", type: "asset-image", name: "Imagem", reference: { collection: "components", id: "image" } },
    { type: "asset-image", settings: { src: "javascript:alert(1)" } }
  );
  assert.equal(unsafe.preview.source, "");
});


test("font resources expose a typographic specimen model using the resolved family", () => {
  const model = getLibraryResourcePreviewModel(
    { kind: "style", type: "font", name: "Inter", reference: { providerId: "nexus-library", builtin: "font", key: "inter" } },
    { name: "Inter", family: '"Inter", system-ui, sans-serif', category: "Interface" }
  );
  assert.equal(model.kind, "font");
  assert.equal(model.family, '"Inter", system-ui, sans-serif');
  assert.equal(model.sample, "Lorem ipsum dolor sit amet");
  assert.match(model.family, /Inter/);
});


const monospacePreview = getLibraryResourcePreviewModel(
  { kind: "style", type: "font", reference: { builtin: "font", key: "monospace" } },
  { family: "ui-monospace, SFMono-Regular, Consolas, monospace", category: "Código" }
);
assert.equal(monospacePreview.kind, "font");
assert.equal(monospacePreview.family, "ui-monospace, SFMono-Regular, Consolas, monospace");
assert.equal(monospacePreview.sample, "Lorem ipsum dolor sit amet",
  "Font specimens must use the resolved font family for both Aa and the longer sample.");

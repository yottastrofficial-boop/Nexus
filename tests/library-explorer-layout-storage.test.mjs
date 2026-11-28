import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { normalizeNexusLibraryStore } from "../scripts/core/library-store.js";
import { createFoundryMediaStorageAdapter } from "../scripts/core/media-storage.js";

const read = path => readFileSync(new URL(path, import.meta.url), "utf8");
const application = read("../scripts/library/library-application.js");
const explorer = read("../scripts/library/catalog-explorer.js");
const gridRenderer = read("../scripts/library/catalog-grid-renderer.js");
const previewRenderers = read("../scripts/library/catalog-preview-renderers.js");
const catalogStyles = read("../styles/nexus-library-catalog.css");
const template = read("../templates/library/library.hbs");
const styles = read("../styles/nexus-universal-library.css");
const libraryArchitecture = read("../docs/LIBRARY_ARCHITECTURE.md");
const mediaSpec = read("../docs/MEDIA_COMPATIBILITY_SPEC.md");

test("Library Name header toggles alphabetical direction", () => {
  assert.match(template, /data-library-sort-name/);
  assert.match(application, /nameSortControl\?\.addEventListener\("click"/);
  assert.match(application, /this\._state\.sortMode === "name-asc" \? "name-desc" : "name-asc"/);
  assert.match(explorer, /currentSortMode === "name-desc"[\s\S]*?compareText\(right\.name, left\.name\)/);
});

test("list rows use exactly Name, Category and Type, including folders", () => {
  assert.match(template, /data-library-list-column="name"[\s\S]*?data-library-list-column="category"[\s\S]*?data-library-list-column="type"/);
  assert.match(explorer, /createLibraryGridCard[\s\S]*?viewMode: currentViewMode/);
  assert.match(gridRenderer, /nexus-library-catalog-card__name-cell[\s\S]*?nexus-library-catalog-card__category[\s\S]*?nexus-library-catalog-card__type/);
  assert.match(catalogStyles, /data-view-mode="list"[\s\S]*?grid-template-columns: minmax\(0, 1fr\)/);
});

test("font and theme cards stay compact in grid while Inspector retains the full preview", () => {
  assert.match(gridRenderer, /createFontPreview[\s\S]*?resource\.fontFamily/);
  assert.match(gridRenderer, /createThemePreview[\s\S]*?createLibraryThemeSample/);
  assert.match(gridRenderer, /createResourceBarPreview[\s\S]*?nexus-catalog-resource-track/);
  assert.doesNotMatch(gridRenderer, /nexus-library-favorite|data-library-resource-favorite/);
  assert.match(previewRenderers, /nexus-library-font-preview-samples/);
  assert.match(previewRenderers, /nexus-library-font-preview-aa/);
  assert.match(previewRenderers, /nexus-library-font-preview-glyphs/);
  assert.match(previewRenderers, /nexus-library-theme-live-preview/);
  assert.match(explorer, /nexus-library-inspector-tabs/);
  assert.match(explorer, /nexus-library-design-preview/);
});

test("Inspector starts on Padrão, places identity in Padrão and technical metadata in Detalhes", () => {
  assert.match(explorer, /makeElement\("button", "nexus-library-inspector-tab-button", "Padrão"\)/);
  assert.match(explorer, /makeElement\("button", "nexus-library-inspector-tab-button", "Detalhes"\)/);
  assert.match(explorer, /previewContent\.filter\(Boolean\)/);
  assert.match(explorer, /detail\.replaceChildren\(inspector\.root\)/);
  assert.match(explorer, /\[heading, meta, \...\(fontPreview \? \[fontPreview\] : \[\]\), themePreview/);
  assert.match(explorer, /\[description, resourceSummary, facts, folderLabel, collectionSection/);
  assert.match(explorer, /\["Etiquetas", resource\.tags\.join\(", "\) \|\| "—"\]/);
  assert.match(explorer, /nexus-library-resource-preview-summary/);
  assert.doesNotMatch(explorer, /nexus-library-resource-preview-title/);
  assert.match(previewRenderers, /function renderLibraryFontPreview/);
  assert.match(previewRenderers, /nexus-library-font-preview-samples/);
  assert.match(previewRenderers, /nexus-library-font-preview-aa/);
  assert.match(previewRenderers, /nexus-library-font-preview-glyphs/);
  assert.match(explorer, /themeModel\?\.palette/);
  assert.match(previewRenderers, /nexus-library-theme-live-preview/);
  assert.match(explorer, /currentInspectorTab = "preview"/);
  assert.match(explorer, /await renderDetails\(resource\)/);
});

test("small configuration records stay structured in the canonical Library store", () => {
  const store = normalizeNexusLibraryStore({
    schemaVersion: 2,
    collections: {
      assets: [{ id: "compact-preset", kind: "config", name: "Preset", payload: { density: "compact", accent: "#78b7e8" } }]
    }
  });
  assert.deepEqual(store.collections.assets[0].payload, { density: "compact", accent: "#78b7e8" });
  assert.match(libraryArchitecture, /Configurações pequenas não devem gerar um arquivo físico por ajuste/);
  assert.match(libraryArchitecture, /libraryStore/);
});

test("Foundry storage does not claim a physical move operation that its public adapter lacks", () => {
  const adapter = createFoundryMediaStorageAdapter({
    FilePicker: { upload: async () => ({ path: "audio/song.ogg" }) },
    extensions: ["ogg"]
  });
  assert.equal(adapter.supports({ name: "song.ogg" }), true);
  assert.equal(typeof adapter.move, "undefined");
  assert.match(mediaSpec, /não documenta uma operação pública de mover ou excluir arquivos/);
  assert.match(libraryArchitecture, /pasta lógica de organização/);
});

console.log("NEXUS Library Explorer layout/storage contracts: OK");

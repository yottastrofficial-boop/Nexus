import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const libraryView = await readFile(new URL("../scripts/sheets/library-view.js", import.meta.url), "utf8");

test("sheet Library only inserts media that passes the safe image-source resolver", () => {
  assert.match(libraryView, /getLibraryMediaInsertionSource/);
  assert.match(libraryView, /reference\.collection === "media" && Boolean\(getLibraryMediaInsertionSource\(resource, resolved\)\)/);
  assert.match(libraryView, /return sheet\._addComponent\("asset-image", \{ template: \{ dataPath: source \} \}\);/);
});

test("sheet Library can apply built-in theme presets", () => {
  assert.match(libraryView, /reference\.builtin === "theme"/);
  assert.match(libraryView, /sheet\._applyThemePreset\?\.\(resolved\?\.id\)/);
});

test("reusable component definition updates guard stale versions and preserve concurrent edits", () => {
  assert.match(libraryView, /updateNexusLibraryCollection\(game\.user, "components", entries => \{/);
  assert.match(libraryView, /currentVersion !== Math\.max\(1, Number\(definition\.version\) \|\| 1\)/);
  assert.match(libraryView, /JSON\.stringify\(latestComponent\) !== JSON\.stringify\(selectedComponentSnapshot\)/);
  assert.match(libraryView, /instância selecionada mudou durante a operação e foi preservada/);
});

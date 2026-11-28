import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  getLibraryResourceIcon,
  getLibraryResourceCategoryLabel,
  getLibraryResourceTypeLabel
} from "../scripts/library/catalog-grid-renderer.js";
import {
  getLibraryThemePreviewTokens,
  getLibraryResourceBarCardPreviewModel
} from "../scripts/library/catalog-preview-renderers.js";

const read = path => readFileSync(new URL(path, import.meta.url), "utf8");
const grid = read("../scripts/library/catalog-grid-renderer.js");
const previews = read("../scripts/library/catalog-preview-renderers.js");
const styles = read("../styles/nexus-library-catalog.css");
const manifest = JSON.parse(read("../system.json"));

test("resource iconography uses a stable semantic map", () => {
  assert.equal(getLibraryResourceIcon({ kind: "document", type: "actors" }), "fa-solid fa-user");
  assert.equal(getLibraryResourceIcon({ kind: "document", type: "items" }), "fa-solid fa-box");
  assert.equal(getLibraryResourceIcon({ kind: "document", type: "scenes" }), "fa-solid fa-map");
  assert.equal(getLibraryResourceIcon({ kind: "logic", type: "rule" }), "fa-solid fa-scale-balanced");
  assert.equal(getLibraryResourceIcon({ kind: "media" }), "fa-solid fa-photo-film");
});

test("category and type labels remain separate from provider identifiers", () => {
  assert.equal(getLibraryResourceCategoryLabel({ kind: "theme" }), "Coleção visual");
  assert.equal(getLibraryResourceCategoryLabel({ reference: { builtin: "font" } }), "Fonte");
  assert.equal(getLibraryResourceTypeLabel({ type: "items" }), "Itens");
  assert.equal(getLibraryResourceTypeLabel({ type: "actors", documentType: "Personagem" }), "Personagem");
});

test("theme preview tokens normalize only valid hex colors and retain semantic fallbacks", () => {
  const tokens = getLibraryThemePreviewTokens([
    { key: "canvasColor", value: "#101820" },
    { key: "highlight", value: "#ffcc00" },
    { key: "text", value: "url(javascript:alert(1))" }
  ]);
  assert.equal(tokens.canvas, "#101820");
  assert.equal(tokens.highlight, "#ffcc00");
  assert.equal(tokens.text, "#e7edf5");
  assert.equal(tokens.panel, "#182330");
});

test("resource meter card previews are typed and bounded", () => {
  const model = getLibraryResourceBarCardPreviewModel({
    kind: "component",
    type: "resource-meter",
    name: "Pontos de Vida"
  });
  assert.equal(model.label, "Pontos de Vida");
  assert.equal(model.percent, 80);
  assert.equal(getLibraryResourceBarCardPreviewModel({ kind: "asset", type: "resource-meter" }), null);
});

test("grid rendering has no favorite controls and keeps a single selection action", () => {
  assert.match(grid, /dataset\.libraryResource/);
  assert.match(grid, /aria-pressed/);
  assert.doesNotMatch(grid, /nexus-library-favorite|data-library-resource-favorite|fa-star/);
  assert.match(grid, /createLibraryGridCard/);
  assert.match(grid, /createLibraryFolderGridCard/);
});

test("font and theme specimens use dedicated renderers and safe font-family tokens", () => {
  assert.match(grid, /createFontPreview/);
  assert.match(grid, /safeFontFamily\(resource\.fontFamily\)/);
  assert.match(grid, /createThemePreview/);
  assert.match(previews, /font-family/);
  assert.match(previews, /createLibraryThemeSample/);
  assert.doesNotMatch(grid, /innerHTML|insertAdjacentHTML/);
  assert.doesNotMatch(previews, /innerHTML|insertAdjacentHTML/);
});

test("catalog cards reserve independent preview, title and tag rows at the three supported sizes", () => {
  assert.match(styles, /data-card-size="small"[\s\S]*?--nexus-catalog-preview-size: 32px/);
  assert.match(styles, /data-card-size="medium"[\s\S]*?--nexus-catalog-preview-size: 64px/);
  assert.match(styles, /data-card-size="large"[\s\S]*?--nexus-catalog-preview-size: 128px/);
  assert.match(styles, /grid-template-rows: var\(--nexus-catalog-preview-size, 64px\) minmax\(2\.4em, auto\) auto/);
  assert.match(styles, /overflow-wrap: anywhere/);
  assert.match(styles, /aspect-ratio: 1 \/ 1/);
  assert.equal(manifest.styles.at(-1), "styles/nexus-design-system.css");
  assert.ok(manifest.styles.includes("styles/nexus-library-catalog.css"));
});

console.log("NEXUS Library grid renderer contracts: OK");

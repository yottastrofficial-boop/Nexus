import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const grid = readFileSync(new URL("../scripts/library/catalog-grid-renderer.js", import.meta.url), "utf8");
const previews = readFileSync(new URL("../scripts/library/catalog-preview-renderers.js", import.meta.url), "utf8");
const styles = readFileSync(new URL("../styles/nexus-library-catalog.css", import.meta.url), "utf8");

test("cartões médios de tema usam seis tokens semânticos sem comprimir a mini-interface", () => {
  assert.match(grid, /size === "medium"[\s\S]*?createThemePalettePreview\(preview, palette\)/);
  for (const token of ["canvas", "panel", "surface", "accent", "highlight", "button"]) {
    assert.ok(grid.includes(`["${token}"`), `Missing theme palette token: ${token}`);
  }
  assert.match(styles, /nexus-catalog-theme-palette[\s\S]*?grid-template-columns:\s*repeat\(3/);
});

test("cartões grandes usam a amostra completa e removem o título literal de prévia", () => {
  assert.match(grid, /compact:\s*false/);
  assert.doesNotMatch(previews, /NEXUS · PRÉVIA|Exemplo de interface/);
  assert.match(previews, /Ficha de personagem/);
});

test("a amostra aplica os tokens individuais de componentes", () => {
  for (const category of ["buttons", "panels", "containers", "highlights", "fields"]) {
    assert.ok(styles.includes(`--nexus-library-theme-component-${category}-background`), `Missing component token: ${category}`);
  }
});

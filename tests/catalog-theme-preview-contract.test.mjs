import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
const grid = readFileSync(new URL("../scripts/library/catalog-grid-renderer.js", import.meta.url), "utf8");
const previews = readFileSync(new URL("../scripts/library/catalog-preview-renderers.js", import.meta.url), "utf8");
const styles = readFileSync(new URL("../styles/nexus-library-catalog.css", import.meta.url), "utf8");
test("miniaturas médias de tema usam versão compacta da interface real", () => {
  assert.match(grid, /size === "medium"[\s\S]*?createLibraryThemeSample\([\s\S]*?compact: true[\s\S]*?is-theme-thumbnail/);
  assert.match(styles, /is-theme-thumbnail[\s\S]*?nexus-catalog-theme-sample/);
  assert.match(previews, /Ficha de personagem/);
});
test("cartões grandes mantêm a amostra completa", () => assert.match(grid, /compact: false/));
test("a amostra aplica tokens individuais de componentes", () => {
  for (const category of ["buttons", "panels", "containers", "highlights", "fields"])
    assert.ok(styles.includes(`--nexus-library-theme-component-${category}-background`));
});
test("somente o item selecionado mantém contorno visível", () => {
  assert.match(styles, /catalog-card__button:hover[\s\S]*?border-color:\s*transparent\s*!important/);
  assert.match(styles, /catalog-card__button\.is-selected[\s\S]*?border:\s*1px solid/);
  assert.match(styles, /catalog-card__preview \{[\s\S]*?border:\s*0\s*!important/);
});

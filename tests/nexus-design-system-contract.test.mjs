import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const manifest = JSON.parse(readFileSync(new URL("../system.json", import.meta.url), "utf8"));
const designSystem = readFileSync(new URL("../styles/nexus-design-system.css", import.meta.url), "utf8");
const sheet = readFileSync(new URL("../scripts/sheets/actor-sheet-v1.0.0.js", import.meta.url), "utf8");
const libraryTemplate = readFileSync(new URL("../templates/library/library.hbs", import.meta.url), "utf8");
const libraryApplication = readFileSync(new URL("../scripts/library/library-application.js", import.meta.url), "utf8");

assert.equal(manifest.styles.at(-1), "styles/nexus-design-system.css",
  "The global design system must load after legacy and library styles.");
assert.match(designSystem, /backdrop-filter:\s*none\s*!important/,
  "Floating controls must not use the glass effect.");
assert.match(designSystem, /text-shadow:\s*none\s*!important/,
  "The default NEXUS surfaces must not add text shadows.");
assert.match(designSystem, /#controls[\s\S]*?\.control-tool/,
  "Foundry scene controls must inherit the NEXUS control surface.");
assert.match(designSystem, /#sidebar[\s\S]*?sidebar-tabs/,
  "Foundry sidebar tabs must inherit the NEXUS design system.");
assert.match(designSystem, /\.nexus-floating-left[\s\S]*?background:\s*transparent\s*!important/,
  "The left rail wrapper must not draw a panel surface.");
assert.match(designSystem, /\.nexus-floating-right[\s\S]*?background:\s*transparent\s*!important/,
  "The right rail wrapper must not draw a panel surface.");
assert.match(designSystem, /\.nexus-more-button::before[\s\S]*?\\f142/,
  "The more button must have an explicit icon glyph.");
assert.match(designSystem, /\.nexus-floating-close::before[\s\S]*?\\f00d/,
  "The close button must have an explicit icon glyph.");

assert.match(sheet, /app\.appendChild\(portal\)/,
  "The floating portal must live inside the native sheet application.");
assert.doesNotMatch(sheet, /document\.body\.appendChild\(portal\)/,
  "The floating portal must not create an independent body-level stacking context.");
assert.doesNotMatch(sheet, /syncRailFocus/,
  "The floating rails must not use a parallel z-index focus system.");
assert.match(sheet, /normalizeNexusComponentDimension/,
  "Saved component dimensions must follow the 10px grid.");

assert.match(libraryTemplate, /data-library-toggle-filters/,
  "Filters must be collapsed behind a compact toolbar control.");
assert.match(libraryTemplate, /data-library-filter-panel hidden/,
  "The filter panel must start collapsed.");
assert.match(libraryTemplate, /fa-magnifying-glass/,
  "The search icon must be inside the single search surface.");
assert.match(libraryApplication, /moveLibraryFolder/,
  "Folder drag-and-drop must use the hierarchy-aware move operation.");
assert.match(libraryApplication, /parentId:\s*folderId/,
  "The folder context action must be able to create subfolders.");

console.log("NEXUS global design system contract: OK");

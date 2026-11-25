import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const manifest = JSON.parse(readFileSync(new URL("../system.json", import.meta.url), "utf8"));
const designSystem = readFileSync(new URL("../styles/nexus-design-system.css", import.meta.url), "utf8");
const legacyStyles = readFileSync(new URL("../styles/nexus-v1.0.0.css", import.meta.url), "utf8");
const sheet = readFileSync(new URL("../scripts/sheets/actor-sheet-v1.0.0.js", import.meta.url), "utf8");
const libraryTemplate = readFileSync(new URL("../templates/library/library.hbs", import.meta.url), "utf8");
const libraryApplication = readFileSync(new URL("../scripts/library/library-application.js", import.meta.url), "utf8");

assert.equal(manifest.styles.at(-1), "styles/nexus-design-system.css",
  "The global design system must load after legacy and library styles.");
assert.doesNotMatch(designSystem, /backdrop-filter:\s*blur/i,
  "The minimalist Design System must not apply a glass effect to interface surfaces.");
assert.match(designSystem, /text-shadow:\s*none\s*!important/,
  "The default NEXUS surfaces must not add text shadows.");
assert.doesNotMatch(designSystem, /:is\(#controls, #ui-left, #ui-top\)\s*:is\(\.ui-control, \.control-tool\)/,
  "Native Foundry tool buttons must retain the minimal Foundry appearance.");
assert.match(designSystem, /#sidebar[\s\S]*?sidebar-tabs/,
  "Foundry sidebar tabs must inherit the NEXUS design system.");
assert.match(designSystem, /\.application\.nexus-themed-application/,
  "NEXUS and explicitly supported Foundry applications must receive the shared styles.");
assert.doesNotMatch(designSystem, /html\.nexus-design-system\s+:is\(\.application,\s*\.window-app\)/,
  "Unrelated third-party application windows must not be globally restyled.");
assert.doesNotMatch(designSystem, /nexus-floating/,
  "The active Design System must not contain external floating editor rails.");
assert.match(sheet, /NexusPanelWindow/,
  "Editor tools must open in independent native ApplicationV2 windows.");
assert.match(sheet, /_mountFloatingUI/,
  "The sheet must mount floating editor rails outside its content layout.");
assert.match(sheet, /data-nexus-floating-for/,
  "Floating editor portals must be scoped to their owning sheet.");
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

assert.match(designSystem, /html\.nexus-design-system\s+\.nexus-sheet\s*\{[\s\S]*?background:\s*var\(--nexus-panel-bg,\s*#182330\)\s*!important;/,
  "The legacy sheet shell must use the active global theme instead of its fixed background.");
assert.match(designSystem, /html\.nexus-design-system\s+\.nexus-sheet\s+\.nexus-component:not\(\.is-group-member\)\s*\{[\s\S]*?background-color:\s*var\(--nexus-panel-card,\s*var\(--nexus-panel-surface,\s*#273443\)\);/,
  "Sheet components must inherit the active semantic card color.");
assert.match(designSystem, /html\.nexus-design-system\s+\.nexus-sheet\s+\.nexus-sheet-element\s*\{[\s\S]*?background:\s*var\(--nexus-panel-surface,\s*#202e3e\);/,
  "Sheet elements must inherit the active semantic surface color.");

assert.match(designSystem, /--nexus-ui-control-size:\s*clamp\(30px,\s*var\(--nexus-control-height/,
  "Native control geometry must consume the active Design Studio control-height token.");
assert.doesNotMatch(designSystem, /\.nexus-appearance-rail|\.nexus-appearance-drawer/,
  "The global Design System must not rebuild the rejected in-sheet editor sidebar.");
assert.match(designSystem, /nexus-workspace-clean[\s\S]*?grid-template-columns:\s*minmax\(0,\s*1fr\)/,
  "The appearance workspace must reclaim the space formerly occupied by in-sheet sidebars.");
assert.match(designSystem, /#navigation \.scene:is\(\.active, \.view\)/,
  "Scene navigation must distinguish the viewed and active scene states.");
assert.match(designSystem, /#navigation #scene-list[\s\S]*?overflow-x:\s*auto/,
  "Long scene lists must remain horizontally navigable instead of forcing clipped controls.");
assert.match(designSystem, /\.nexus-sheet \.nexus-sidebar-right[\s\S]*?overflow:\s*auto/,
  "Layout navigation must remain scrollable inside the character sheet.");
assert.match(legacyStyles, /\.nexus-panel-window/,
  "Appearance tools must retain independent native panel windows.");
assert.match(legacyStyles, /\.nexus-design-studio-toolbar[\s\S]*?min-height:\s*58px/,
  "The Design Studio toolbar must remain compact.");
assert.doesNotMatch(designSystem, /fa-style-family|Font Awesome 6 Free|\.fa-solid[^{}]*font-family/i,
  "The Design System must leave Font Awesome font selection to Foundry's native styles.");
assert.match(designSystem, /body :not\(i\):not\(svg\):not\(code\):not\(pre\):not\(\[class\*="fa-"\]\)/,
  "Profile typography must exclude native icon elements and Font Awesome classes.");
assert.match(designSystem, /@media \(prefers-reduced-motion: reduce\)/,
  "Native control transitions must respect the operating system reduced-motion preference.");


const groupSelectionRules = [...legacyStyles.matchAll(/[^{}]*\.nexus-group-surface\.is-selected[^{}]*\{[^{}]*\}/g)].map(match => match[0]);
assert.ok(groupSelectionRules.length >= 5, "Group selection must remain explicitly styled across its supported sheet states.");
for (const rule of groupSelectionRules) {
  const outlineDeclarations = rule.match(/outline(?:-color)?\s*:[^;]+;/gi) ?? [];
  for (const declaration of outlineDeclarations) {
    assert.match(declaration, /var\(--nexus-highlight-color/i,
      "Selected groups must use the active semantic highlight token instead of a fixed or unrelated color.");
  }
}

const groupInspectionRules = [...legacyStyles.matchAll(/[^{}]*\.nexus-component\.is-group-inspecting[^{}]*\{[^{}]*\}/g)].map(match => match[0]);
assert.ok(groupInspectionRules.length >= 2, "Group inspection must retain its visual state in the sheet.");
for (const rule of groupInspectionRules) {
  assert.match(rule, /var\(--nexus-highlight-color/i,
    "Group inspection must use the active semantic highlight token.");
  assert.doesNotMatch(rule, /var\(--nexus-accent-color/i,
    "Group inspection must not diverge from the dedicated highlight color.");
}

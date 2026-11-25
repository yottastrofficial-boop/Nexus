import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const manifest = JSON.parse(readFileSync(new URL("../system.json", import.meta.url), "utf8"));
const designSystem = readFileSync(new URL("../styles/nexus-design-system.css", import.meta.url), "utf8");
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
assert.doesNotMatch(sheet, /nexus-floating|data-nexus-floating-for|NexusPanelWindow|_mountFloatingUI/,
  "The character sheet must keep its editor navigation inside the sheet.");
assert.match(sheet, /_mountInlineEditorPanels/,
  "The character sheet must initialize its in-sheet editor panels.");
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
assert.match(designSystem, /\.nexus-appearance-rail[\s\S]*?var\(--nexus-ui-border\)/,
  "The in-sheet editor rail must use the same semantic theme tokens as the rest of the interface.");
assert.match(designSystem, /#navigation \.scene:is\(\.active, \.view\)/,
  "Scene navigation must distinguish the viewed and active scene states.");
assert.match(designSystem, /#navigation #scene-list[\s\S]*?overflow-x:\s*auto/,
  "Long scene lists must remain horizontally navigable instead of forcing clipped controls.");
assert.match(designSystem, /\.nexus-sheet \.nexus-sidebar-right[\s\S]*?overflow:\s*auto/,
  "Layout navigation must remain scrollable inside the character sheet.");
assert.match(designSystem, /\.nexus-sheet \.nexus-appearance-drawer[\s\S]*?background:\s*var\(--nexus-panel-bg/,
  "Appearance tools must use the inline drawer instead of detached floating windows.");
assert.match(designSystem, /@media \(prefers-reduced-motion: reduce\)/,
  "Native control transitions must respect the operating system reduced-motion preference.");

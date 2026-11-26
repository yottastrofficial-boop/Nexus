import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = path => readFileSync(new URL(path, import.meta.url), "utf8");
const legacy = read("../styles/nexus-v1.0.0.css");
const template = read("../templates/actors/actor-sheet.hbs");
const sheet = read("../scripts/sheets/actor-sheet-v1.0.0.js");

assert.match(template, /class="nexus-layout-tabs-source" hidden/,
  "The tab source must not render as an attached sidebar panel.");
assert.doesNotMatch(template, /class="nexus-sidebar nexus-sidebar-right"/,
  "The actor sheet must not keep a permanent right sidebar for layout navigation.");
assert.match(sheet, /const libraryButton = root\.querySelector\("\.nexus-open-library"\)/);
assert.match(sheet, /floatingLibrary\?\.append\(libraryButton\)/,
  "The Library entry remains accessible in the detached floating control group.");
assert.match(sheet, /floatingTabs\?\.append\(tabs\)/,
  "Layout buttons are moved into the floating portal outside the sheet's layout.");
const floatingRightRule = legacy.slice(legacy.indexOf("NEXUS 1.0.0.117 — rails independentes"));
assert.ok(floatingRightRule.includes(".nexus-floating-ui .nexus-floating-right {") &&
  floatingRightRule.includes("background:transparent !important; box-shadow:none !important; backdrop-filter:none !important;"),
  "The right rail container must be transparent while each button keeps its own surface.");
assert.match(legacy, /\.nexus-floating-tabs \.nexus-layout-tab,[\s\S]*?box-shadow:0 3px 10px #0005 !important;/,
  "Each layout button must retain its own floating surface.");
assert.match(legacy, /html\.nexus-design-system #hotbar #action-bar,[\s\S]*?background:transparent !important/,
  "Only the action-bar backdrop behind the macro slots is made transparent.");
assert.match(legacy, /html\.nexus-design-system #hotbar \.macro:hover/,
  "Native macro slots and hover behavior remain available.");
assert.match(legacy, /html\.nexus-design-system #players,[\s\S]*?background:transparent !important/,
  "The player list's outer panel is transparent.");
assert.match(legacy, /html\.nexus-design-system #players \.player \{/,
  "Player entries are preserved rather than hidden or removed.");

console.log("NEXUS floating tabs and clean Foundry chrome contract: OK");

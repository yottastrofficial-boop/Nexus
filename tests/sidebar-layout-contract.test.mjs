import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
const designCss = readFileSync(new URL("../styles/nexus-design-system.css", import.meta.url), "utf8");
const legacyCss = readFileSync(new URL("../styles/nexus-v1.0.0.css", import.meta.url), "utf8");
const manifest = JSON.parse(readFileSync(new URL("../system.json", import.meta.url), "utf8"));
assert.equal(manifest.styles.at(-1), "styles/nexus-design-system.css",
  "The Design System must remain the final stylesheet.");
assert.ok(designCss.includes("Foundry V14 owns the native sidebar layout, vertical orientation and tab controller"));
assert.ok(designCss.includes('#sidebar-tabs menu > li > button[role="tab"]'),
  "V14 native tab buttons must be targeted through menu/li/button.");
assert.ok(!designCss.includes("#sidebar-tabs > .sidebar-tab"),
  "The .sidebar-tab content pane must not be styled as a navigation button.");
assert.ok(!designCss.includes("#sidebar {\n  display:flex"),
  "Foundry must own the sidebar's display and geometry.");
assert.ok(!designCss.includes("#sidebar-tabs {\n  display:flex"),
  "NEXUS must not hardcode the native tab rail width or flex direction.");
assert.ok(designCss.includes("grid-template-columns: minmax(0, 1fr) !important"),
  "The Canvas workspace must not reserve a hidden rail column.");
assert.ok(!legacyCss.includes("#sidebar-tabs") && !legacyCss.includes("#sidebar-content"),
  "Legacy styles must not reintroduce custom sidebar geometry.");
assert.ok(legacyCss.includes("#sidebar .sidebar-tab.directory"),
  "NEXUS directory color styling remains available without replacing native navigation.");
assert.ok(designCss.includes("Compact, full-width Foundry V14 chat sidebar"));
assert.ok(designCss.includes("#sidebar #chat .chat-log"));
assert.ok(designCss.includes("@container nexus-chat-sidebar"));
console.log("NEXUS native sidebar preservation contract: OK");

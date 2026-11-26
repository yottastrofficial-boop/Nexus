import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const designCss = readFileSync(new URL("../styles/nexus-design-system.css", import.meta.url), "utf8");
const legacyCss = readFileSync(new URL("../styles/nexus-v1.0.0.css", import.meta.url), "utf8");
const manifest = JSON.parse(readFileSync(new URL("../system.json", import.meta.url), "utf8"));

assert.equal(manifest.styles.at(-1), "styles/nexus-design-system.css",
  "The Design System must remain the final stylesheet.");
assert.match(designCss, /Foundry V14 owns the native sidebar layout, vertical orientation and tab controller/,
  "The native Foundry sidebar must own its original vertical navigation.");
assert.match(designCss, /#sidebar-tabs[\s\S]*?flex-direction:column/,
  "The native tab rail remains vertical.");
assert.match(designCss, /#sidebar-tabs > \.sidebar-tab[\s\S]*?flex:0 0 32px/,
  "Native tabs use individual controls within the rail.");
assert.match(designCss, /#sidebar\s*\{[^}]*flex-direction\s*:\s*row/i,
  "The shell separates the vertical rail from its adjacent content pane.");
assert.doesNotMatch(legacyCss, /#sidebar-tabs|#sidebar-content|#sidebar\s*>\s*\.sidebar-tabs/,
  "Legacy styles must not reintroduce a custom sidebar navigation layout.");
assert.match(legacyCss, /#sidebar \.sidebar-tab\.directory/,
  "NEXUS directory color styling remains available without replacing native navigation.");
assert.match(designCss, /Compact, full-width Foundry V14 chat sidebar/,
  "The independent chat presentation may remain customized.");
assert.match(designCss, /#sidebar #chat \.chat-log/,
  "Chat history layout must remain scoped to its own panel.");
assert.match(designCss, /@container nexus-chat-sidebar/,
  "Adaptive chat spacing must remain independent of sidebar navigation.");

console.log("NEXUS native vertical sidebar contract: OK");

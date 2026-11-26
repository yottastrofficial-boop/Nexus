import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const designCss = readFileSync(new URL("../styles/nexus-design-system.css", import.meta.url), "utf8");
const legacyCss = readFileSync(new URL("../styles/nexus-v1.0.0.css", import.meta.url), "utf8");
const manifest = JSON.parse(readFileSync(new URL("../system.json", import.meta.url), "utf8"));

assert.equal(manifest.styles.at(-1), "styles/nexus-design-system.css",
  "The Design System must remain the final stylesheet.");
assert.match(designCss, /Foundry V14 owns the native sidebar layout, vertical orientation and tab controller/,
  "The native Foundry sidebar must own its original vertical navigation.");
assert.doesNotMatch(designCss, /#sidebar-tabs|#sidebar-content|\.sidebar-tabs\s*\{/,
  "NEXUS must not impose custom geometry on native sidebar navigation or panels.");
assert.doesNotMatch(designCss, /#sidebar\s*\{[^}]*flex-direction\s*:\s*row/i,
  "The sidebar shell must not be converted into a horizontal layout.");
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

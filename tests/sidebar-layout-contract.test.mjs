import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const css = readFileSync(new URL("../styles/nexus-design-system.css", import.meta.url), "utf8");
const manifest = JSON.parse(readFileSync(new URL("../system.json", import.meta.url), "utf8"));
const globalControlFontRule = css.slice(
  css.indexOf("/* Global Foundry presentation: shared theme tokens, native behavior preserved. */"),
  css.indexOf("/* Do not assign font-family to native sidebar controls:")
);
assert.match(globalControlFontRule, /:not\(\[class\*="fa-"\]\)/,
  "Global control typography must not override Font Awesome classes applied directly to Foundry buttons.");

const start = css.indexOf("/* Sidebar navigation and panels — Foundry V14 ApplicationV2.");
const end = css.indexOf("/* Advanced CSS editor */", start);

assert.ok(start >= 0 && end > start, "The complete V14 sidebar block must exist before the advanced CSS editor.");
const sidebar = css.slice(start, end);

assert.match(manifest.styles.at(-1), /nexus-design-system\.css$/,
  "The sidebar stylesheet must load after the legacy styles.");
assert.match(sidebar, /#sidebar\s*\{[\s\S]*?display:\s*flex\s*!important;[\s\S]*?flex-direction:\s*column\s*!important;/,
  "The sidebar shell must stack navigation above its panel.");
assert.match(sidebar, /#sidebar-tabs[\s\S]*?flex-direction:\s*row\s*!important;[\s\S]*?flex-wrap:\s*wrap\s*!important;/,
  "The native tab bar must lay out horizontally and wrap when needed.");
assert.match(sidebar, /#sidebar-tabs\s*>\s*:is\(\.item, button, \[role="tab"\], \.sidebar-tab:not\(\.tab\)\)/,
  "Only direct native tab controls may receive button geometry.");
assert.match(sidebar, /\.tab\.sidebar-tab is a content panel, never an icon button/,
  "The implementation must explicitly protect content panels from button sizing.");
assert.match(sidebar, /#sidebar-content[\s\S]*?flex:\s*1 1 0\s*!important;/,
  "The panel area must consume the remaining sidebar height.");
const panelRules = sidebar.slice(sidebar.indexOf("/* Panels fill the remaining area."));
assert.ok(panelRules.length > 0, "The native panel sizing rules must exist.");
assert.doesNotMatch(panelRules, /(?:display|visibility):\s*(?:none|hidden)\s*!important/i,
  "The stylesheet must leave panel visibility to Foundry's native tab controller.");
assert.match(sidebar, /:focus-visible[\s\S]*?outline:\s*2px solid var\(--nexus-ui-accent/,
  "Keyboard focus must remain visible.");
assert.match(sidebar, /:is\(\.active, \[aria-selected="true"\]\)/,
  "Selected native tabs must be styled through active and accessible state.");
assert.doesNotMatch(sidebar, /#sidebar-tabs[^{}]*\{[^{}]*font-family\s*:/,
  "The sidebar must not override the native icon font.");
assert.doesNotMatch(sidebar, /::before\s*\{[^{}]*content\s*:/,
  "The sidebar must not synthesize replacement icon glyphs.");

// Lightweight stylesheet structural check: ignore comments and quoted strings,
// then ensure braces remain balanced after the sidebar rewrite.
const structural = css
  .replace(/\/\*[\s\S]*?\*\//g, "")
  .replace(/"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'/g, "");
let depth = 0;
for (const char of structural) {
  if (char === "{") depth++;
  if (char === "}") depth--;
  assert.ok(depth >= 0, "CSS contains an unmatched closing brace.");
}
assert.equal(depth, 0, "CSS contains an unmatched opening brace.");

console.log("NEXUS Foundry V14 sidebar layout contract: OK");

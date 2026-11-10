import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";

const read = path => readFileSync(path, "utf8");
const manifest = JSON.parse(read("system.json"));
assert.equal(manifest.id, "nexus", "Package id must remain stable");
assert.equal(manifest.version, "1.0.0.1", "Unexpected release version");
assert.equal(manifest.compatibility?.minimum, "14", "Minimum Foundry version must be V14");
assert.equal(manifest.compatibility?.verified, "14", "Verified Foundry version must be V14");
assert.match(manifest.download ?? "", /releases\/download\/v1\.0\.0\.1\/nexus\.zip$/, "Download must target the versioned release ZIP");
assert.match(manifest.manifest ?? "", /raw\.githubusercontent\.com\/yottastrofficial-boop\/Nexus\/main\/system\.json$/, "Manifest URL must remain stable");

for (const path of [
  ...(manifest.esmodules ?? []),
  ...(manifest.styles ?? []),
  ...(manifest.languages ?? []).map(language => language.path),
  "templates/actors/actor-sheet.hbs",
  "templates/actors/panel-window.hbs",
  "assets/library/catalog.js"
]) {
  assert.ok(existsSync(path), `Referenced package file is missing: ${path}`);
}

JSON.parse(read("lang/pt-BR.json"));

const sheet = read("scripts/sheets/actor-sheet-v1.0.0.js");
const template = read("templates/actors/actor-sheet.hbs");
const css = read("styles/nexus-v1.0.0.css");

assert.match(sheet, /writeActorProperty\(this\.actor, path, value\)/, "Property editor must use the validated writer");
assert.match(sheet, /html\.find\("\[data-component-local-value\]"\)/, "Unbound component values must have a persistence handler");
assert.match(sheet, /\$\(window\)\.off\(inspectorNamespace\)/, "Window listeners must be replaced on re-render");
assert.match(sheet, /\$\(window\)\.off\(this\._nexusInspectorNamespace\)/, "Window listeners must be removed on close");
assert.match(sheet, /querySelectorAll\("\[data-component-custom-binding\]"\)/, "Shared custom-binding selectors must query all matching controls");

assert.match(template, /component\.hasBorderRadius/, "Zero border radius must render explicitly");
assert.match(template, /component\.hasOpacity/, "Zero opacity must render explicitly");
assert.match(template, /min="0" max="100" data-component-setting="opacity"/, "Opacity input must allow zero");
assert.match(template, /data-component-local-value/, "Unbound text controls must identify their local persistence");
assert.match(sheet, /\["asset-field", "asset-notes", "text-field"\]/, "Local persistence must cover all unbound text components");

const stack = [];
const blockPattern = /\\{\\{\\s*([#/])\\s*(if|each|unless|with)\\b[^}]*\\}\\}/g;
for (const match of template.matchAll(blockPattern)) {
  if (match[1] === "#") stack.push(match[2]);
  else {
    const opening = stack.pop();
    assert.equal(opening, match[2], `Mismatched Handlebars block: expected ${opening}, got ${match[2]}`);
  }
}
assert.equal(stack.length, 0, `Unclosed Handlebars blocks: ${stack.join(", ")}`);

const cssWithoutCommentsOrStrings = css
  .replace(/\/\*[\s\S]*?\*\//g, "")
  .replace(/"(?:\\\\.|[^"\\\\])*"|'(?:\\\\.|[^'\\\\])*'/g, "");
let braceDepth = 0;
for (const character of cssWithoutCommentsOrStrings) {
  if (character === "{") braceDepth++;
  if (character === "}") braceDepth--;
  assert.ok(braceDepth >= 0, "CSS contains a closing brace without a matching opening brace");
}
assert.equal(braceDepth, 0, "CSS braces must be balanced");

console.log("NEXUS 1.0.0.1 static validation passed.");

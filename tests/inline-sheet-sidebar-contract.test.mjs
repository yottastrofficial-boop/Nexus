import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = path => readFileSync(new URL(path, import.meta.url), "utf8");
const sheet = read("../scripts/sheets/actor-sheet-v1.0.0.js");
const listeners = read("../scripts/sheets/actor-sheet-listeners.js");
const canvas = read("../scripts/sheets/canvas-interactions.js");
const template = read("../templates/actors/actor-sheet.hbs");
const designSystem = read("../styles/nexus-design-system.css");
const legacyStyles = read("../styles/nexus-v1.0.0.css");
const universalStyles = read("../styles/nexus-universal-library.css");

test("character-sheet tools open detached ApplicationV2 panels from floating rails", () => {
  assert.match(sheet, /_mountFloatingUI/);
  assert.match(sheet, /new NexusPanelWindow/);
  assert.match(sheet, /_nexusFloatingCleanup\?\.\(\{ preserveWindows: false \}\)/);
  assert.match(sheet, /this\._setSelection\?\.\(\$\(this\.element\), \[\]\)/);
  assert.match(sheet, /data-nexus-floating-for/);
  assert.match(sheet, /data-floating-panel/);
  assert.match(listeners, /sheet\._mountFloatingUI\(html\)/);
    assert.doesNotMatch(listeners, /_openInlineEditorPanel/);
  assert.doesNotMatch(canvas, /data-nexus-floating-for|data-floating-panel|nexus-floating/);
  for (const panel of ["settings", "style", "component", "layers", "aliases", "behavior"]) {
    assert.match(template, new RegExp(`data-appearance-panel="${panel}"`));
    assert.match(template, new RegExp(`data-tool-panel="${panel}"`));
  }
  assert.match(template, /class="nexus-sidebar nexus-sidebar-left"/);
  assert.doesNotMatch(template, /class="nexus-sidebar nexus-sidebar-right"/,
    "Layout buttons must no longer live inside a sheet sidebar panel.");
  assert.match(template, /class="nexus-layout-tabs-source" hidden/);
  assert.match(template, /data-open-nexus-library/);
  assert.match(sheet, /floatingLibrary\?\.append\(libraryButton\)/);
  assert.match(sheet, /floatingTabs\?\.append\(tabs\)/);
  assert.match(legacyStyles, /\.nexus-floating-right\s*\{[\s\S]*?background:transparent !important; box-shadow:none !important;/);
  assert.doesNotMatch(designSystem, /nexus-floating/);
  assert.match(legacyStyles, /\.nexus-floating-left/);
  assert.match(legacyStyles, /\.nexus-panel-window/);
  assert.doesNotMatch(legacyStyles, /v0\.5 — barras flutuantes externas/);
  assert.match(legacyStyles, /\.nexus-group-surface \{ min-width:0; min-height:0;/,
    "The legacy stylesheet must preserve the existing group-surface sizing contract.");
});

test("native Foundry chrome receives global typography without replacing icon fonts", () => {
  assert.match(designSystem, /body[\s\S]*:not\(#sidebar\):not\(#sidebar \*\)/);
  assert.match(designSystem, /html\.nexus-design-system:not\(\[data-nexus-theme="foundry"\]\) body \{ color: var\(--nexus-ui-text\); \}/);
  assert.match(designSystem, /data-nexus-theme="foundry"/);
  assert.match(designSystem, /--nexus-font-family/);
  assert.match(designSystem, /#chat-log, \.chat-log, \.chat-scroll/);
  assert.match(designSystem, /#chat-log \.message-content[\s\S]*?background: var\(--nexus-ui-surface-raised\)/);
  assert.doesNotMatch(designSystem, /fa-style-family|Font Awesome 6 Free|\.fa-solid[^{}]*font-family/i);
  assert.match(designSystem, /:not\(i\):not\(svg\):not\(code\):not\(pre\)[\s\S]*:not\(\[class\*="fa-"\]\)/);
  assert.match(designSystem, /#sidebar \.tab\.sidebar-tab\.nexus-themed-application\.active/);
  assert.doesNotMatch(universalStyles, /#sidebar \.tab\.sidebar-tab\.nexus-themed-application\.active/);
});

test("floating right rail is a body portal with independent controls and no legacy panel chrome", () => {
  assert.match(sheet, /document\.body\.appendChild\(portal\)/);
  assert.match(sheet, /floatingTabs\?\.append\(tabs\)/);
  assert.match(sheet, /floatingLibrary\?\.append\(libraryButton\)/);
  const canonicalRail = legacyStyles.slice(legacyStyles.indexOf("NEXUS 1.0.0.117 — rails independentes"));
  assert.match(canonicalRail, /\.nexus-floating-ui \.nexus-floating-right[\s\S]*?background:transparent !important; box-shadow:none !important; backdrop-filter:none !important;/);
  assert.match(canonicalRail, /\.nexus-floating-ui \.nexus-floating-tabs \.nexus-layout-tab[\s\S]*?height:34px !important/);
});

test("component inspector follows current selection and uses the floating ApplicationV2 panel", () => {
  assert.match(sheet, /normalizeSheetSelection\(ids, components\)/);
  assert.match(sheet, /resolveSheetFocusTarget\(/);
  assert.match(sheet, /this\._componentEditorTargetId = one\?\.id \?\? null/);
  assert.match(sheet, /else delete field\.dataset\.componentTargetId/);
  assert.match(listeners, /const getInspectorComponentId = \(\) =>/);
  assert.match(sheet, /normalizeSheetSelection\(ids, components\)/);
  assert.doesNotMatch(listeners, /dataset\.componentTargetId \|\| sheet\._componentEditorTargetId \|\|/);
  assert.match(canvas, /sheet\._openFloatingPanel\?\.\("component"\)/);
  assert.doesNotMatch(canvas, /_openInlineEditorPanel/);
});

test("V14 native tab controls are styled without rebuilding the Foundry sidebar", () => {
  assert.match(designSystem, /#sidebar-tabs menu > li > button\[role="tab"\]/);
  assert.doesNotMatch(designSystem, /#sidebar-tabs > \.sidebar-tab/);
  assert.doesNotMatch(designSystem, /#sidebar\s*\{[^}]*display:\s*flex/s);
  assert.match(designSystem, /grid-template-columns: minmax\(0, 1fr\) !important/);
});

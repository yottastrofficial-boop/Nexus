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

test("character-sheet editing stays in the native sheet sidebars", () => {
  assert.match(sheet, /_mountInlineEditorPanels/);
  assert.doesNotMatch(sheet, /_mountFloatingUI|NexusPanelWindow|data-nexus-floating-for|nexus-floating/);
  assert.doesNotMatch(listeners, /_mountFloatingUI|data-nexus-floating-for|data-floating-panel|_nexusPanelWindows/);
  assert.doesNotMatch(canvas, /data-nexus-floating-for|data-floating-panel|nexus-floating/);
  for (const panel of ["settings", "style", "component", "layers", "aliases", "behavior"]) {
    assert.match(template, new RegExp(`data-appearance-panel="${panel}"`));
    assert.match(template, new RegExp(`data-tool-panel="${panel}"`));
  }
  assert.match(template, /class="nexus-sidebar nexus-sidebar-left"/);
  assert.match(template, /class="nexus-sidebar nexus-sidebar-right"/);
  assert.match(template, /data-open-nexus-library/);
  assert.doesNotMatch(designSystem, /nexus-floating/);
  assert.doesNotMatch(legacyStyles, /nexus-floating/);
});

test("native Foundry chrome receives global typography and unified Chat surfaces", () => {
  assert.match(designSystem, /#sidebar, #sidebar \*, #hotbar, #hotbar \*/);
  assert.match(designSystem, /#chat, #chat \*/);
  assert.match(designSystem, /#chat-log, \.chat-log, \.chat-scroll/);
  assert.match(designSystem, /#chat-log \.message-content[\s\S]*?background: var\(--nexus-ui-surface-raised\)/);
});

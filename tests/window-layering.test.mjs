import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const sheet = readFileSync(new URL("../scripts/sheets/actor-sheet-v1.0.0.js", import.meta.url), "utf8");
const template = readFileSync(new URL("../templates/actors/actor-sheet.hbs", import.meta.url), "utf8");
const styles = readFileSync(new URL("../styles/nexus-design-system.css", import.meta.url), "utf8");

assert.match(sheet, /_mountInlineEditorPanels/,
  "The sheet must initialize its in-sheet editor navigation and panels.");
assert.doesNotMatch(sheet, /_mountFloatingUI|data-nexus-floating-for|NexusPanelWindow|nexus-floating/,
  "The sheet must not create external floating rails or detached editor windows.");
assert.match(template, /class="nexus-sidebar nexus-sidebar-left"/,
  "Appearance tools must remain inside the native left sheet sidebar.");
assert.match(template, /class="nexus-sidebar nexus-sidebar-right"/,
  "Layout navigation must remain inside the native right sheet sidebar.");
assert.match(styles, /\.nexus-sheet \.nexus-workspace[\s\S]*?display:\s*grid/,
  "The character sheet must preserve its native in-window grid layout.");
assert.doesNotMatch(styles, /nexus-floating/,
  "The active global stylesheet must not retain floating-rail presentation rules.");

console.log("NEXUS minimalist sheet layout contract: OK");

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const sheet = readFileSync(new URL("../scripts/sheets/actor-sheet-v1.0.0.js", import.meta.url), "utf8");
const listeners = readFileSync(new URL("../scripts/sheets/actor-sheet-listeners.js", import.meta.url), "utf8");
const template = readFileSync(new URL("../templates/actors/actor-sheet.hbs", import.meta.url), "utf8");
const styles = readFileSync(new URL("../styles/nexus-design-system.css", import.meta.url), "utf8");
const legacyStyles = readFileSync(new URL("../styles/nexus-v1.0.0.css", import.meta.url), "utf8");

assert.match(sheet, /_mountFloatingUI/);
assert.match(sheet, /NexusPanelWindow/);
assert.match(sheet, /_nexusFloatingCleanup/);
assert.match(listeners, /sheet\._mountFloatingUI\(html\)/);
assert.match(template, /class="nexus-sidebar nexus-sidebar-left"/,
  "The source panel container must remain available to be portaled into floating windows.");
assert.match(template, /class="nexus-sidebar nexus-sidebar-right"/,
  "The source layout tabs must remain available to be portaled into the floating navigation rail.");
assert.match(styles, /\.nexus-sheet \.nexus-workspace[\s\S]*?display:\s*grid/);
assert.match(legacyStyles, /\.nexus-floating-left/);
assert.match(legacyStyles, /\.nexus-workspace\.nexus-workspace-clean[\s\S]*?grid-template-columns:\s*minmax\(0,\s*1fr\)/);
assert.doesNotMatch(styles, /\.nexus-appearance-rail|\.nexus-appearance-drawer/);

console.log("NEXUS floating sheet-window contract: OK");

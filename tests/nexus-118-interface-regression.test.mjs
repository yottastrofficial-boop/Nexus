import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
const read = path => readFileSync(new URL(path, import.meta.url), "utf8");
const sheet = read("../scripts/sheets/actor-sheet-v1.0.0.js");
const studio = read("../scripts/apps/design-studio.js");
const init = read("../scripts/nexus-v1.0.0.js");
const dsCss = read("../styles/nexus-design-system.css");
const sheetCss = read("../styles/nexus-v1.0.0.css");
assert.match(sheet,/position: \{ width: 800, height: 800 \}/);
assert.match(sheet,/normalizeSheetSelection\(ids, components\)/);
assert.match(sheet,/resolveSheetFocusTarget\(/);
assert.match(sheet,/componentPanel\?\.isConnected \? componentPanel/);
assert.match(sheet,/else this\._componentEditorTargetId = null/);
assert.match(studio,/design\.application = this/);
assert.match(studio,/if \(design\.application === this\) design\.application = null/);
assert.match(init,/registerStudio\(DesignStudioMenuApplication\)/);
assert.doesNotMatch(init,/const DesignStudioMenuApplication = class/);
assert.match(dsCss, /#sidebar-tabs menu > li > button\[role="tab"\]/);
assert.doesNotMatch(dsCss, /#sidebar-tabs > \.sidebar-tab/);
assert.doesNotMatch(dsCss, /#sidebar\s*\{[^}]*display:\s*flex/s);
assert.match(dsCss, /grid-template-columns: minmax\(0, 1fr\) !important/);
assert.match(sheetCss,/\.nexus-sheet\[data-mode="play"\] \.nexus-workspace/);
assert.match(sheetCss,/min-height:0 !important/);
console.log("NEXUS 1.0.0.119 interface regression contracts passed");

// Painel Propriedades/Comportamento/Camadas ressincroniza a seleção ao terminar de abrir.
assert.match(sheet,/\["component", "behavior", "layers"\]\.includes\(key\)\) this\._setSelection\(\$\(this\.element\), \[\.\.\.\(this\._selectedIds \?\? \[\]\)\]\);\s*focusPanelWindow\(instance\)/);

assert.match(sheet,/createSheetInteractionState/);
assert.match(sheet,/get _selectedIds\(\)/);
assert.match(sheet,/get _componentEditorTargetId\(\)/);
assert.match(dsCss,/\.nexus-themed-configuration/);
assert.doesNotMatch(dsCss,/body :not\(#sidebar\)/);

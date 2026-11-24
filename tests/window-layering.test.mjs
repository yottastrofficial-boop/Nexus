import assert from "node:assert/strict";
import { resolveNexusFloatingLayer } from "../scripts/core/window-layering.js";

assert.deepEqual(resolveNexusFloatingLayer({ sheetZIndex: 100, sheetFocused: true, activePanelZIndex: 130 }), {
  railZ: 102, activePanelZIndex: 130
});
assert.deepEqual(resolveNexusFloatingLayer({ sheetZIndex: 100, sheetFocused: false, activePanelZIndex: 130 }), {
  railZ: 129, activePanelZIndex: 130
});
assert.deepEqual(resolveNexusFloatingLayer({ sheetZIndex: 100, sheetFocused: false, activePanelZIndex: null }), {
  railZ: 99, activePanelZIndex: null
});
assert.deepEqual(resolveNexusFloatingLayer({ sheetZIndex: "invalid", sheetFocused: true }), {
  railZ: 102, activePanelZIndex: null
});
console.log("NEXUS window layering: OK");

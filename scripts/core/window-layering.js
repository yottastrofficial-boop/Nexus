/**
 * Resolve the external tool-rail layer without allowing an inactive panel to
 * permanently cover the sheet controls. Only the currently focused panel is
 * allowed to sit above the sheet rail.
 */
export function resolveNexusFloatingLayer({ sheetZIndex = 100, sheetFocused = false, activePanelZIndex = null } = {}) {
  const sheetZ = Number.isFinite(Number(sheetZIndex)) ? Number(sheetZIndex) : 100;
  const panelZ = activePanelZIndex === null || activePanelZIndex === undefined
    ? null
    : Number(activePanelZIndex);
  const desired = Math.max(1, sheetZ + (sheetFocused ? 2 : -1));
  const railZ = !sheetFocused && Number.isFinite(panelZ)
    ? Math.max(1, Math.min(desired, panelZ - 1))
    : desired;
  return { railZ, activePanelZIndex: Number.isFinite(panelZ) ? panelZ : null };
}

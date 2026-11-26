/** Shared selection and inspector target resolution for the NEXUS Actor Sheet. */
const toId = value => String(value ?? "").trim();
export function normalizeSheetSelection(ids, components = []) {
  const valid = new Set((components ?? []).map(component => toId(component?.id)).filter(Boolean));
  const source = ids instanceof Set ? [...ids] : Array.isArray(ids) ? ids : ids == null ? [] : [ids];
  return [...new Set(source.map(toId).filter(id => id && valid.has(id)))];
}
export function resolveSheetFocusTarget({ selectedIds = [], focusTargetId = null, components = [] } = {}) {
  const byId = new Map((components ?? []).map(component => [toId(component?.id), component]).filter(([id]) => id));
  const selected = selectedIds instanceof Set ? [...selectedIds] : Array.from(selectedIds ?? []);
  if (selected.length === 1) return byId.get(toId(selected[0])) ?? null;
  if (selected.length > 1) return null;
  return byId.get(toId(focusTargetId)) ?? null;
}

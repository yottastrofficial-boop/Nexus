const SAFE_PROPERTY_PATH = /^[a-zA-Z][a-zA-Z0-9_-]*(?:\.[a-zA-Z][a-zA-Z0-9_-]*)*$/;
const UNSAFE_SEGMENTS = new Set(["__proto__", "prototype", "constructor"]);
function normalizePath(value) {
  const path = String(value ?? "").trim().replace(/^actor\./, "").replace(/^system\./, "");
  if (!SAFE_PROPERTY_PATH.test(path) || path.split(".").some(part => UNSAFE_SEGMENTS.has(part))) return "";
  return path;
}
function normalizeDefinition(raw, origin) {
  if (!raw || typeof raw !== "object") return null;
  const path = normalizePath(raw.path ?? raw.key ?? raw.targetPath);
  if (!path) return null;
  const type = String(raw.type ?? "unknown").toLowerCase();
  const id = String(raw.id ?? `nexus.${origin}.${path.replaceAll(".", "-")}`).slice(0, 160);
  return Object.freeze({ id, path, key: path, label: String(raw.label ?? raw.name ?? path.split(".").at(-1)).trim().slice(0, 80) || path, type, category: String(raw.category ?? origin).slice(0, 64), origin, targetPath: normalizePath(raw.targetPath ?? (origin === "external" ? path : "")) || "", active: raw.active !== false, readOnly: raw.derived === true || raw.readOnly === true, formula: String(raw.formula ?? "").slice(0, 500), calculationMode: raw.calculationMode === "formula" ? "formula" : "manual", legacyKeys: Object.freeze(Array.isArray(raw.legacyKeys) ? raw.legacyKeys.map(normalizePath).filter(Boolean) : []) });
}
/** Immutable read model for Actor properties. It never mutates or persists Actor data. */
export function createPropertyRegistry({ core = [], native = [], custom = [], external = [] } = {}) {
  const byId = new Map(), byPath = new Map();
  const add = (raw, origin) => {
    const definition = normalizeDefinition(raw, origin);
    if (!definition || !definition.active) return;
    const existing = byPath.get(definition.path);
    const merged = existing ? Object.freeze({
      ...existing,
      ...definition,
      id: existing.origin === "core" ? existing.id : definition.id,
      origin: existing.origin === "core" ? "core" : definition.origin,
      type: existing.origin === "core" ? existing.type : definition.type,
      readOnly: existing.origin === "core" ? existing.readOnly : definition.readOnly,
      targetPath: existing.origin === "core" ? (existing.targetPath || existing.path) : (definition.targetPath || existing.targetPath),
      legacyKeys: Object.freeze([...new Set([...existing.legacyKeys, ...definition.legacyKeys])])
    }) : definition;
    byPath.set(merged.path, merged); byId.set(merged.id, merged);
  };
  core.forEach(item => add(item, "core"));
  native.forEach(item => { const path = normalizePath(item?.key ?? item?.targetPath); if (path) add({ ...item, path }, "native"); });
  custom.forEach(item => add({ ...item, path: item?.key ?? item?.path }, "custom"));
  external.forEach(item => add(typeof item === "string" ? { path: item } : item, "external"));
  const list = Object.freeze([...byPath.values()].sort((a, b) => a.label.localeCompare(b.label, "pt-BR") || a.path.localeCompare(b.path)));
  return Object.freeze({ list, getById: id => byId.get(String(id ?? "")) ?? null, getByPath: path => byPath.get(normalizePath(path)) ?? null, resolve: path => { const normalized = normalizePath(path); if (!normalized) return null; return byPath.get(normalized) ?? list.find(item => item.legacyKeys.includes(normalized)) ?? null; } });
}
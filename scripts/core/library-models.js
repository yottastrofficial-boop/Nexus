/**
 * Library definition / instance boundary.
 *
 * A definition is an immutable reusable model stored in the user's library.
 * An instance is a fresh copy placed on an Actor layout. Its overrides never
 * mutate the source definition.
 */
const INSTANCE_ONLY_KEYS = new Set([
  "id", "definition", "x", "y", "z", "stackOrder",
  "libraryDefinitionId", "libraryDefinitionVersion", "libraryOverrides"
]);

function cloneSerializable(value) {
  if (value === null || typeof value !== "object") return value;
  if (Array.isArray(value)) return value.map(cloneSerializable);
  const result = {};
  for (const [key, child] of Object.entries(value)) {
    if (["__proto__", "prototype", "constructor"].includes(key)) continue;
    result[key] = cloneSerializable(child);
  }
  return result;
}

export function createLibraryDefinition({ id, type, label, settings = {}, version = 1, metadata = {} } = {}) {
  const definitionId = String(id ?? "").trim();
  const componentType = String(type ?? "").trim();
  if (!definitionId || !componentType) throw new Error("A definição precisa de identificador e tipo.");
  const cleanSettings = cloneSerializable(settings);
  for (const key of INSTANCE_ONLY_KEYS) delete cleanSettings[key];
  return {
    id: definitionId,
    schemaVersion: 1,
    version: Math.max(1, Number(version) || 1),
    kind: "component",
    type: componentType,
    label: String(label ?? "Componente").trim().slice(0, 80) || "Componente",
    settings: cleanSettings,
    metadata: cloneSerializable(metadata)
  };
}

/**
 * Creates an Actor-local instance. Overrides are copied and recorded separately
 * so the source definition can be edited or reused without changing this copy.
 */
export function createLibraryComponentInstance(definition, {
  id,
  overrides = {},
  position = {},
  definitionVersion
} = {}) {
  if (!definition || definition.kind !== "component" || !definition.id || !definition.type) {
    throw new Error("A definição do componente é inválida.");
  }
  const cleanOverrides = cloneSerializable(overrides);
  for (const key of INSTANCE_ONLY_KEYS) delete cleanOverrides[key];
  const settings = cloneSerializable(definition.settings ?? {});
  const merged = { ...settings, ...cleanOverrides };
  const x = Number(position.x ?? 0), y = Number(position.y ?? 0);
  return {
    ...merged,
    id: String(id ?? ""),
    type: definition.type,
    x: Number.isFinite(x) ? x : 0,
    y: Number.isFinite(y) ? y : 0,
    libraryDefinitionId: String(definition.id),
    libraryDefinitionVersion: Math.max(1, Number(definitionVersion ?? definition.version) || 1),
    libraryOverrides: cleanOverrides
  };
}

export function collectLibraryInstanceOverrides(definition, instance) {
  const defaults = definition?.settings ?? {};
  const overrides = {};
  for (const [key, value] of Object.entries(instance ?? {})) {
    if (INSTANCE_ONLY_KEYS.has(key) || key === "type") continue;
    const baseline = defaults[key];
    if (JSON.stringify(value) !== JSON.stringify(baseline)) overrides[key] = cloneSerializable(value);
  }
  return overrides;
}


/** Applies user-selected layout overrides to a fresh copy, never to the saved source. */
export function applyLibraryLayoutOverrides(layout, overrides = {}) {
  if (!layout || typeof layout !== "object" || Array.isArray(layout)) throw new Error("O layout salvo é inválido.");
  const result = cloneSerializable(layout);
  const name = String(overrides.name ?? "").trim();
  if (name) result.name = name.slice(0, 32);
  for (const key of ["width", "height"]) {
    if (overrides[key] === undefined || overrides[key] === "") continue;
    const value = Number(overrides[key]);
    if (!Number.isFinite(value)) throw new Error(`A dimensão ${key} é inválida.`);
    result[key] = Math.round(Math.min(5000, Math.max(320, value)));
  }
  for (const key of ["canvasColor", "cardColor", "accentColor", "highlightColor", "buttonColor"]) {
    if (overrides[key] === undefined || overrides[key] === "") continue;
    const color = String(overrides[key]).trim();
    if (!/^#(?:[0-9a-f]{3}|[0-9a-f]{6})$/i.test(color)) throw new Error(`A cor ${key} é inválida.`);
    result[key] = color;
  }
  return result;
}

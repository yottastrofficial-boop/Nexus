/**
 * Library definition / instance boundary.
 *
 * A definition is an immutable reusable model stored in the user's library.
 * An instance is a fresh copy placed on an Actor layout. Its overrides never
 * mutate the source definition.
 */
const INSTANCE_ONLY_KEYS = new Set([
  "id", "definition", "x", "y", "z", "stackOrder",
  "libraryDefinitionId", "libraryDefinitionVersion", "libraryDefinitionBaseline", "libraryOverrides"
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

export function createLibraryDefinition({ id, type, label, settings = {}, version = 1, metadata = {}, history = [] } = {}) {
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
    metadata: cloneSerializable(metadata),
    history: (Array.isArray(history) ? history : []).map(entry => ({
      version: Math.max(1, Number(entry?.version) || 1),
      settings: cloneSerializable(entry?.settings ?? {})
    })).filter(entry => entry.version < Math.max(1, Number(version) || 1))
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

export function getLibraryDefinitionUpdateStatus(definition, instance) {
  if (!definition?.id || !instance?.libraryDefinitionId) return "unlinked";
  if (String(instance.libraryDefinitionId) !== String(definition.id)) return "unlinked";
  if (String(instance.type) !== String(definition.type)) return "type-mismatch";
  const definitionVersion = Math.max(1, Number(definition.version) || 1);
  const instanceVersion = Math.max(1, Number(instance.libraryDefinitionVersion) || 1);
  if (definitionVersion > instanceVersion) {
    const hasInstanceBaseline = instance.libraryDefinitionBaseline && typeof instance.libraryDefinitionBaseline === "object";
    const hasLibraryOverrides = instance.libraryOverrides && typeof instance.libraryOverrides === "object" && !Array.isArray(instance.libraryOverrides);
    const hasDefinitionHistory = Array.isArray(definition.history) && definition.history.some(entry =>
      Math.max(1, Number(entry?.version) || 1) === instanceVersion && entry?.settings && typeof entry.settings === "object"
    );
    // Legacy instances without an override snapshot cannot be updated safely:
    // their manual changes cannot be distinguished from the old definition.
    return hasInstanceBaseline || (hasLibraryOverrides && hasDefinitionHistory)
      ? "update-available"
      : "baseline-missing";
  }
  if (definitionVersion < instanceVersion) return "instance-newer";
  return "current";
}

/**
 * Creates an updated instance while preserving Actor-local overrides and
 * position. The original layout and definition are never mutated.
 */
export function updateLibraryComponentInstance(definition, instance) {
  const status = getLibraryDefinitionUpdateStatus(definition, instance);
  if (!["update-available", "current"].includes(status)) {
    throw new Error("Esta instância não pode receber a definição selecionada: " + status);
  }
  const historical = Array.isArray(definition.history)
    ? definition.history.find(entry => Math.max(1, Number(entry?.version) || 1) === Math.max(1, Number(instance.libraryDefinitionVersion) || 1))
    : null;
  const baseline = instance.libraryDefinitionBaseline && typeof instance.libraryDefinitionBaseline === "object"
    ? instance.libraryDefinitionBaseline
    : historical?.settings ?? definition.settings ?? {};
  const overrides = collectLibraryInstanceOverrides({ settings: baseline }, instance);
  const updated = createLibraryComponentInstance(definition, {
    id: instance.id,
    position: { x: instance.x, y: instance.y },
    overrides,
    definitionVersion: definition.version
  });
  for (const key of ["z", "stackOrder"]) {
    if (instance[key] !== undefined) updated[key] = cloneSerializable(instance[key]);
  }
  return updated;
}

/**
 * Builds a reviewable update plan for one Actor's saved layouts.
 * selectedInstanceKeys uses the stable form "<layoutId>:<instanceId>".
 */
export function planLibraryDefinitionUpdate(definition, layouts, { selectedInstanceKeys = null } = {}) {
  if (!definition?.id || !layouts || typeof layouts !== "object" || Array.isArray(layouts)) {
    throw new Error("Definição ou layouts inválidos.");
  }
  const result = cloneSerializable(layouts);
  const selected = Array.isArray(selectedInstanceKeys) ? new Set(selectedInstanceKeys.map(String)) : null;
  const available = [];
  let updatedCount = 0;
  let skippedCount = 0;
  const requiresReview = [];

  for (const [layoutId, layout] of Object.entries(result)) {
    if (!Array.isArray(layout?.components)) continue;
    for (let index = 0; index < layout.components.length; index++) {
      const instance = layout.components[index];
      if (String(instance?.libraryDefinitionId ?? "") !== String(definition.id)) continue;
      const status = getLibraryDefinitionUpdateStatus(definition, instance);
      if (status !== "update-available") {
        if (status === "baseline-missing") {
          requiresReview.push({ layoutId: String(layoutId), instanceId: String(instance.id), status });
        }
        if (status !== "current") skippedCount++;
        continue;
      }
      const key = String(layoutId) + ":" + String(instance.id);
      available.push({
        key,
        layoutId: String(layoutId),
        instanceId: String(instance.id),
        label: String(instance.label ?? instance.resourceLabel ?? definition.label ?? definition.type)
      });
      if (selected && !selected.has(key)) continue;
      layout.components[index] = updateLibraryComponentInstance(definition, instance);
      updatedCount++;
    }
  }

  return {
    layouts: result,
    available,
    requiresReview,
    updatedCount,
    pendingCount: available.length - updatedCount,
    skippedCount
  };
}

import { NEXUS_SKILLS, normalizeNexusProficientLevel } from "./skills.js";
import { NEXUS_PROPERTY_SCHEMA_VERSION } from "./property-schema.js";
import { moveActorAliasCustomData } from "./actor-aliases.js";

const getActiveLayoutId = (layouts, storedId) =>
  layouts[storedId] ? storedId : "principal";

/**
 * Build default-value updates without flattening legacy nested attribute data.
 * Scalar attributes remain scalar; object-backed attributes retain their shape.
 */
export function getNexusAttributeInitializationUpdates(system = {}) {
  const updates = {};
  for (const key of ["for", "des", "sab", "int", "car", "von"]) {
    const stored = system.attributes?.[key];
    const nested = stored !== null && typeof stored === "object" && !Array.isArray(stored);
    const value = nested ? stored.value : stored;
    if (value === undefined || value === null || value === "" || !Number.isFinite(Number(value))) {
      updates[`system.attributes.${key}${nested ? ".value" : ""}`] = 0;
    }
  }
  return updates;
}

/**
 * Applies one-time compatibility migrations for persisted Actor flags.
 * Context preparation remains read-only; this function is called explicitly
 * from the sheet render lifecycle and is safe to retry after partial failure.
 */
const pendingActorMigrations = new WeakMap();

async function performLegacyActorDataMigration({
  actor,
  readLayouts,
  getAliasDefinitions,
  getCustomAliasData,
  normalizeAliasDefinition,
  invalidateAliasDefinitionCache,
  clone
}) {
  const storedSchemaVersion = Number(actor?.getFlag?.("nexus", "propertySchemaVersion")) || 0;
  if (storedSchemaVersion > NEXUS_PROPERTY_SCHEMA_VERSION) {
    console.warn(`NEXUS | O Actor ${actor.name ?? actor.id ?? "desconhecido"} usa o esquema de propriedades ${storedSchemaVersion}, mais novo que o suportado (${NEXUS_PROPERTY_SCHEMA_VERSION}). A migração foi ignorada para evitar perda de dados.`);
    return { changed: false, futureSchema: true, propertySchemaVersion: storedSchemaVersion, aliasesMigrated: false, aliasDataConflicts: 0, propertiesMigrated: false };
  }

  const layouts = await readLayouts();
  let changed = false;
  let schemaVersionMigrated = false;
  let aliasesChanged = false;
  let aliasDataConflicts = 0;
  let propertiesMigrated = false;

  // Migrate legacy sheet fields to the rulebook-aligned property model.
  // Preserve stored mechanical values; formulas are opt-in and never imposed by migration.
  if (actor?.system && typeof actor.update === "function") {
    const system = actor.system;
    const updates = {};

    const currentSkills = system.skills ?? {};
    const nextSkills = structuredClone(currentSkills);
    for (const skill of NEXUS_SKILLS) {
      const current = nextSkills[skill.key] ?? nextSkills[skill.legacyKey] ?? {};
      const proficientLevel = normalizeNexusProficientLevel(
        current.proficientLevel ?? (current.opposed === true ? -1 : current.proficient ?? current.proficiency) ?? false
      );
      const next = { ...current, proficientLevel };
      delete next.proficient;
      delete next.proficiency;
      delete next.opposed;
      nextSkills[skill.key] = next;
      if (skill.legacyKey !== skill.key) delete nextSkills[skill.legacyKey];
    }
    if (JSON.stringify(nextSkills) !== JSON.stringify(currentSkills)) updates["system.skills"] = nextSkills;

    const currentCombat = system.combat ?? {};
    const nextCombat = { ...currentCombat };
    // Keep previously stored mechanical values intact. The property layer
    // must not reinterpret them as formula snapshots or overwrite user data.
    if (nextCombat.movement === undefined && Number(nextCombat.desl) > 0) {
      nextCombat.movement = Number(nextCombat.desl);
    }
    if (JSON.stringify(nextCombat) !== JSON.stringify(currentCombat)) updates["system.combat"] = nextCombat;

    const currentResources = system.resources ?? {};
    const nextResources = { ...currentResources };
    for (const key of ["pv", "pm", "pe"]) {
      if (nextResources[key]) {
        nextResources[key] = { ...nextResources[key], temporary: Number(nextResources[key].temporary) || 0 };
      }
    }
    if (JSON.stringify(nextResources) !== JSON.stringify(currentResources)) updates["system.resources"] = nextResources;

    if (!Array.isArray(system.conditions)) updates["system.conditions"] = [];

    if (Object.keys(updates).length) {
      await actor.update(updates, { render: false });
      propertiesMigrated = true;
      changed = true;
    }
  }
  const storedActiveId = String(actor.getFlag("nexus", "activeLayout") ?? "principal");
  const activeId = getActiveLayoutId(layouts, storedActiveId);
  if (activeId !== storedActiveId) {
    await actor.setFlag("nexus", "activeLayout", activeId);
    changed = true;
  }

  const storedAliases = actor.getFlag("nexus", "aliases") ?? [];
  const rawAliases = Array.isArray(storedAliases) ? storedAliases : [];
  const normalizedAliases = getAliasDefinitions(actor);

  if (JSON.stringify(rawAliases) !== JSON.stringify(normalizedAliases)) {
    const customData = clone(getCustomAliasData(actor));
    for (const raw of rawAliases) {
      const normalized = normalizeAliasDefinition(raw);
      if (!normalized || normalized.targetPath || normalized.key === raw.key) continue;
      const result = moveActorAliasCustomData(customData, raw.key, normalized.key);
      if (result.status === "conflict") aliasDataConflicts++;
    }

    if (JSON.stringify(customData) !== JSON.stringify(getCustomAliasData(actor))) {
      await actor.setFlag("nexus", "customData", customData);
      changed = true;
    }
    await actor.setFlag("nexus", "aliases", normalizedAliases);
    invalidateAliasDefinitionCache(actor);
    aliasesChanged = true;
    changed = true;
  }

  // Record the schema only after the compatibility work above has completed.
  // Future releases must increment the schema and add an explicit, idempotent migration.
  if (storedSchemaVersion < NEXUS_PROPERTY_SCHEMA_VERSION) {
    await actor.setFlag("nexus", "propertySchemaVersion", NEXUS_PROPERTY_SCHEMA_VERSION);
    schemaVersionMigrated = true;
    changed = true;
  }

  return { activeLayout: activeId, aliasesMigrated: aliasesChanged, aliasDataConflicts, propertiesMigrated, schemaVersionMigrated, propertySchemaVersion: NEXUS_PROPERTY_SCHEMA_VERSION, changed };
}


/**
 * Share an in-flight migration between sheet instances for the same Actor.
 * This prevents duplicate reads and competing writes when multiple sheets
 * for one Actor are opened at the same time in the same client.
 */
export function migrateLegacyActorData(dependencies) {
  const actor = dependencies?.actor;
  if (!actor || (typeof actor !== "object" && typeof actor !== "function")) {
    return performLegacyActorDataMigration(dependencies);
  }
  const pending = pendingActorMigrations.get(actor);
  if (pending) return pending;

  const operation = performLegacyActorDataMigration(dependencies);
  pendingActorMigrations.set(actor, operation);
  return operation.finally(() => {
    if (pendingActorMigrations.get(actor) === operation) pendingActorMigrations.delete(actor);
  });
}

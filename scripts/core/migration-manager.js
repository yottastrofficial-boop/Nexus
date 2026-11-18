import { NEXUS_SKILLS, normalizeNexusProficientLevel } from "./skills.js";

const getActiveLayoutId = (layouts, storedId) =>
  layouts[storedId] ? storedId : "principal";

/**
 * Applies one-time compatibility migrations for persisted Actor flags.
 * Context preparation remains read-only; this function is called explicitly
 * from the sheet render lifecycle and is safe to retry after partial failure.
 */
export async function migrateLegacyActorData({
  actor,
  readLayouts,
  getAliasDefinitions,
  getCustomAliasData,
  normalizeAliasDefinition,
  invalidateAliasDefinitionCache,
  getPath,
  clone,
  setProperty
}) {
  const layouts = await readLayouts();
  let changed = false;
  let aliasesChanged = false;
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
      await actor.update(updates);
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
      const oldValue = getPath(customData, raw.key);
      if (oldValue === undefined || getPath(customData, normalized.key) !== undefined) continue;

      setProperty(customData, normalized.key, oldValue);
      const parts = String(raw.key).split(".");
      const leaf = parts.pop();
      const parent = getPath(customData, parts.join("."));
      if (parent && typeof parent === "object") delete parent[leaf];
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

  return { activeLayout: activeId, aliasesMigrated: aliasesChanged, propertiesMigrated, changed };
}

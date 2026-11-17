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
  // Derived values (MB, recovery count, defense total) are no longer persisted.
  if (actor?.system && typeof actor.update === "function") {
    const system = actor.system;
    const updates = {};

    const makeDeletion = () => {
      const ForcedDeletion = globalThis.foundry?.data?.operators?.ForcedDeletion;
      if (typeof ForcedDeletion !== "function") throw new Error("Foundry VTT ForcedDeletion operator is unavailable.");
      return new ForcedDeletion();
    };
    const currentSkills = system.skills ?? {};
    for (const skill of NEXUS_SKILLS) {
      const current = currentSkills[skill.key] ?? currentSkills[skill.legacyKey] ?? {};
      const proficientLevel = normalizeNexusProficientLevel(
        current.proficientLevel ?? (current.opposed === true ? -1 : current.proficient ?? current.proficiency) ?? false
      );
      if (currentSkills[skill.key]?.proficientLevel !== proficientLevel) {
        updates[`system.skills.${skill.key}.proficientLevel`] = proficientLevel;
      }
      for (const legacyField of ["proficient", "proficiency", "opposed"]) {
        if (Object.hasOwn(current, legacyField)) updates[`system.skills.${skill.key}.${legacyField}`] = makeDeletion();
      }
      if (skill.legacyKey !== skill.key && Object.hasOwn(currentSkills, skill.legacyKey)) {
        updates[`system.skills.${skill.legacyKey}`] = makeDeletion();
      }
    }

    const currentCombat = system.combat ?? {};
    if (currentCombat.defenseModifier === undefined) {
      const legacyDefense = Number(currentCombat.defense);
      const storedDexterity = system.attributes?.des;
      const dexterity = Number(storedDexterity && typeof storedDexterity === "object" ? storedDexterity.value : storedDexterity) || 0;
      updates["system.combat.defenseModifier"] = Number.isFinite(legacyDefense) && legacyDefense !== 10
        ? legacyDefense - 8 - dexterity
        : 0;
    }
    if (currentCombat.movement === undefined && Number(currentCombat.desl) > 0) {
      updates["system.combat.movement"] = Number(currentCombat.desl);
    }
    for (const legacyField of ["defense", "mb", "ddr", "desl"]) {
      if (Object.hasOwn(currentCombat, legacyField)) updates[`system.combat.${legacyField}`] = makeDeletion();
    }

    for (const key of ["pv", "pm", "pe"]) {
      const resource = system.resources?.[key];
      if (resource && (resource.temporary === undefined || !Number.isFinite(Number(resource.temporary)))) {
        updates[`system.resources.${key}.temporary`] = 0;
      }
    }

    if (!Array.isArray(system.conditions)) updates["system.conditions"] = [];
    if (!system.recovery || typeof system.recovery !== "object" || system.recovery.spent === undefined) updates["system.recovery.spent"] = 0;
    if (!system.encumbrance || typeof system.encumbrance !== "object" || system.encumbrance.current === undefined) updates["system.encumbrance.current"] = 0;

    if (Object.keys(updates).length) {
      await actor.update(updates);
      propertiesMigrated = true;
      changed = true;
    }
    const legacyNativeProperties = actor.getFlag("nexus", "nativeProperties");
    if (Array.isArray(legacyNativeProperties) && legacyNativeProperties.length) {
      await actor.setFlag("nexus", "nativeProperties", []);
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

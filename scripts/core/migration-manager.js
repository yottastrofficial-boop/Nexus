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

  return { activeLayout: activeId, aliasesMigrated: aliasesChanged, changed };
}

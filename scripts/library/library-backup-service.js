import { createNexusLibraryBackup, parseNexusLibraryBackup } from "../core/library-sharing.js";
import {
  NEXUS_LIBRARY_COLLECTIONS,
  createEmptyNexusLibraryStore,
  getLegacyNexusLibraryFlags,
  mergeNexusLibraryStores,
  readNexusLibraryStore,
  updateNexusLibraryStore
} from "../core/library-store.js";

/**
 * Library-owned backup composition and transfer pipeline.
 * Parsing/validation and conflict preview are separate from committing changes.
 */
export function createLibraryBackupService({
  getUser,
  getCatalog = () => ({}),
  getThemePalettes = () => ({}),
  getWorldFlows = () => [],
  setWorldFlows = null,
  getComponentTypes
} = {}) {
  if (typeof getUser !== "function" || typeof getComponentTypes !== "function") {
    throw new TypeError("O serviço de backup precisa de usuário e tipos de componentes.");
  }

  const createIncomingStore = (data, catalog, themePalettes, createId) => {
    const store = createEmptyNexusLibraryStore();
    const builtinAssetKeys = new Set((Array.isArray(catalog.assets) ? catalog.assets : []).map(asset => String(asset.key)));
    const builtinThemeIds = new Set(Object.keys(themePalettes ?? {}));
    const makeEntryId = (collection, index) => String(createId(collection, index));

    for (const collection of ["components", "groups", "layouts", "templates", "media", "styles", "properties", "rules", "behaviors", "functions"]) {
      const entries = Array.isArray(data[collection]) ? data[collection] : [];
      store.collections[collection] = entries.map((entry, index) => {
        const copy = structuredClone(entry);
        if (["components", "groups", "layouts"].includes(collection)) copy.id = makeEntryId(collection, index);
        else copy.id = String(copy.id ?? makeEntryId(collection, index));
        return copy;
      });
    }

    store.collections.assets = (Array.isArray(data.assets) ? data.assets : [])
      .filter(asset => !builtinAssetKeys.has(String(asset.key)))
      .map((asset, index) => ({
        ...structuredClone(asset),
        id: makeEntryId("assets", index),
        sourceId: String(asset.sourceId ?? asset.key ?? "")
      }));

    store.collections.themes = Object.entries(data.themes ?? {})
      .filter(([id]) => !builtinThemeIds.has(String(id)))
      .map(([sourceId, palette], index) => ({
        id: makeEntryId("themes", index),
        sourceId: String(sourceId),
        name: String(sourceId),
        palette: structuredClone(palette)
      }));

    store.collections.flows = (Array.isArray(data.flows) ? data.flows : [])
      .filter(entry => entry?.origin !== "world")
      .map((entry, index) => ({
        ...structuredClone(entry),
        id: makeEntryId("flows", index),
        sourceId: String(entry.sourceId ?? entry.id ?? "")
      }));

    return store;
  };

  const mirrorLegacyCollections = async (user, store) => {
    const legacyFlags = {
      components: "libraryComponents",
      groups: "libraryGroups",
      layouts: "libraryLayouts",
      templates: "libraryTemplates",
      assets: "libraryAssets",
      media: "libraryMedia",
      themes: "libraryThemes",
      styles: "libraryStyles",
      properties: "libraryProperties",
      rules: "libraryRules",
      behaviors: "libraryBehaviors",
      flows: "interactionLibrary",
      functions: "libraryFunctions"
    };
    const warnings = [];
    for (const collection of NEXUS_LIBRARY_COLLECTIONS) {
      const flag = legacyFlags[collection];
      if (!flag) continue;
      try { await user.setFlag("nexus", flag, store.collections[collection]); }
      catch (error) { warnings.push("Não foi possível atualizar a compatibilidade antiga de " + collection + ": " + (error?.message ?? error)); }
    }
    return warnings;
  };

  const exportCode = () => {
    const user = getUser();
    if (!user) throw new Error("Não foi possível identificar o usuário da Biblioteca.");
    const { store } = readNexusLibraryStore(user, getLegacyNexusLibraryFlags(user));
    const catalog = getCatalog() ?? {};
    const themePalettes = getThemePalettes() ?? {};
    let worldFlows = [];
    try { worldFlows = getWorldFlows() ?? []; } catch { worldFlows = []; }

    const personalThemes = Object.fromEntries((store.collections.themes ?? [])
      .filter(theme => theme?.palette && typeof theme.palette === "object")
      .map(theme => [String(theme.sourceId ?? theme.id), theme.palette]));

    return createNexusLibraryBackup({
      name: "Biblioteca NEXUS",
      components: store.collections.components,
      groups: store.collections.groups,
      layouts: store.collections.layouts,
      assets: [
        ...(Array.isArray(catalog.assets) ? catalog.assets : []),
        ...store.collections.assets
      ],
      themes: { ...themePalettes, ...personalThemes },
      flows: [
        ...store.collections.flows.map(entry => ({ ...entry, origin: "personal" })),
        ...(Array.isArray(worldFlows) ? worldFlows : []).map(entry => ({ ...entry, origin: "world" }))
      ],
      templates: store.collections.templates,
      media: store.collections.media,
      styles: store.collections.styles,
      properties: store.collections.properties,
      rules: store.collections.rules,
      behaviors: store.collections.behaviors,
      functions: store.collections.functions
    }, getComponentTypes());
  };

  const prepareImport = (source, {
    createId = (collection, index) => collection + "-import-" + index + "-" + globalThis.foundry?.utils?.randomID?.(8)
  } = {}) => {
    const user = getUser();
    if (!user) throw new Error("Não foi possível identificar o usuário da Biblioteca.");
    const parsed = parseNexusLibraryBackup(source, getComponentTypes());
    const incoming = createIncomingStore(parsed.collections, getCatalog() ?? {}, getThemePalettes() ?? {}, createId);
    const current = readNexusLibraryStore(user, getLegacyNexusLibraryFlags(user)).store;
    const merged = mergeNexusLibraryStores(current, incoming, { conflictMode: "skip" });

    const importedWorldFlows = (Array.isArray(parsed.collections.flows) ? parsed.collections.flows : [])
      .filter(entry => entry?.origin === "world" && entry.flow);
    let currentWorldFlows = [];
    try { currentWorldFlows = getWorldFlows() ?? []; } catch { currentWorldFlows = []; }
    const nextWorldFlows = Array.isArray(currentWorldFlows) ? [...currentWorldFlows] : [];
    let addedWorldFlows = 0;
    for (const entry of importedWorldFlows) {
      const signature = JSON.stringify(entry.flow);
      if (nextWorldFlows.some(savedEntry => JSON.stringify(savedEntry?.flow) === signature)) continue;
      nextWorldFlows.push({
        id: String(createId("world-flows", nextWorldFlows.length)),
        name: String(entry.name ?? entry.flow.name ?? "Fluxo importado").slice(0, 60),
        flow: structuredClone(entry.flow)
      });
      addedWorldFlows++;
    }
    merged.report.added.worldFlows = typeof setWorldFlows === "function" ? addedWorldFlows : 0;
    merged.report.skipped.worldFlows = importedWorldFlows.length - merged.report.added.worldFlows;

    const warnings = [];
    if (importedWorldFlows.length && typeof setWorldFlows !== "function") {
      warnings.push("Os fluxos de origem mundial foram validados, mas não podem ser importados neste contexto.");
    }

    return Object.freeze({
      name: parsed.name,
      report: merged.report,
      warnings: Object.freeze(warnings),
      incoming,
      importedWorldFlows: Object.freeze(importedWorldFlows),
      createId
    });
  };

  const commitImport = async plan => {
    const user = getUser();
    if (!user || !plan?.incoming || !plan?.report) throw new Error("Prévia de importação inválida ou expirada.");
    let committedReport = null;
    const saved = await updateNexusLibraryStore(user, current => {
      const merged = mergeNexusLibraryStores(current, plan.incoming, { conflictMode: "skip" });
      const previewSignature = JSON.stringify({ added: plan.report.added, skipped: plan.report.skipped, conflicts: plan.report.conflicts });
      const currentSignature = JSON.stringify({ added: merged.report.added, skipped: merged.report.skipped, conflicts: merged.report.conflicts });
      if (previewSignature !== currentSignature) {
        throw new Error("A Biblioteca mudou desde a prévia. Gere uma nova prévia antes de importar.");
      }
      committedReport = merged.report;
      return merged.store;
    });
    const warnings = [...(plan.warnings ?? []), ...await mirrorLegacyCollections(user, saved)];

    if (typeof setWorldFlows === "function" && plan.importedWorldFlows?.length) {
      try {
        const currentWorldFlows = getWorldFlows() ?? [];
        const nextWorldFlows = Array.isArray(currentWorldFlows) ? [...currentWorldFlows] : [];
        let addedWorldFlows = 0;
        for (const entry of plan.importedWorldFlows) {
          const signature = JSON.stringify(entry.flow);
          if (nextWorldFlows.some(savedEntry => JSON.stringify(savedEntry?.flow) === signature)) continue;
          nextWorldFlows.push({
            id: String(plan.createId("world-flows", nextWorldFlows.length)),
            name: String(entry.name ?? entry.flow.name ?? "Fluxo importado").slice(0, 60),
            flow: structuredClone(entry.flow)
          });
          addedWorldFlows++;
        }
        if (addedWorldFlows) await setWorldFlows(nextWorldFlows);
        committedReport.added.worldFlows = addedWorldFlows;
        committedReport.skipped.worldFlows = plan.importedWorldFlows.length - addedWorldFlows;
      } catch (error) {
        warnings.push("Não foi possível importar os fluxos do mundo: " + (error?.message ?? error));
      }
    }

    return { name: plan.name, report: committedReport ?? plan.report, warnings, store: saved };
  };

  const importCode = async (source, options) => commitImport(prepareImport(source, options));

  return Object.freeze({ exportCode, prepareImport, commitImport, importCode });
}

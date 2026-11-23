import { createNexusLibraryBackup } from "../core/library-sharing.js";
import { getLegacyNexusLibraryFlags, readNexusLibraryStore } from "../core/library-store.js";

/**
 * Library-owned backup composition. The sheet may provide a download/copy UI,
 * but it never assembles or interprets the Library's data model.
 */
export function createLibraryBackupService({
  getUser,
  getCatalog = () => ({}),
  getThemePalettes = () => ({}),
  getWorldFlows = () => [],
  getComponentTypes
} = {}) {
  if (typeof getUser !== "function" || typeof getComponentTypes !== "function") {
    throw new TypeError("O serviço de backup precisa de usuário e tipos de componentes.");
  }

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

  return Object.freeze({ exportCode });
}

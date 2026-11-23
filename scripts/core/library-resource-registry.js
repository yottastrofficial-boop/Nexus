import { THEME_PALETTES } from "./theme.js";
import {
  NEXUS_LIBRARY_COLLECTIONS,
  getLegacyNexusLibraryFlags,
  readNexusLibraryStore,
  updateNexusLibraryStore
} from "./library-store.js";
/**
 * NEXUS Universal Library Resource Registry.
 *
 * A single catalog contract for native Foundry documents, NEXUS definitions,
 * logic assets and resources contributed by optional modules. Providers expose
 * lightweight metadata first; full objects are resolved only on demand.
 */

const PROVIDER_ID = /^[a-z][a-z0-9._-]{1,63}$/i;
const MAX_PAGE_SIZE = 50;
const COLLECTION_TYPES = Object.freeze({
  components: "component",
  groups: "composition",
  layouts: "layout",
  templates: "template",
  assets: "asset",
  media: "media",
  themes: "theme",
  styles: "style",
  properties: "property",
  rules: "rule",
  behaviors: "behavior",
  flows: "flow",
  functions: "function"
});
const THEME_LABELS = Object.freeze({
  "nexus-dark": "NEXUS Escuro",
  midnight: "Meia-noite",
  light: "Claro",
  steam: "Steam",
  linux: "Linux",
  medieval: "Medieval",
  "pixel-art": "Pixel Art"
});
const COLLECTION_KINDS = Object.freeze({
  components: "component",
  groups: "composition",
  layouts: "layout",
  templates: "template",
  assets: "asset",
  media: "media",
  themes: "theme",
  styles: "style",
  properties: "logic",
  rules: "logic",
  behaviors: "logic",
  flows: "logic",
  functions: "logic"
});

const cleanText = (value, max = 240) => String(value ?? "").trim().slice(0, max);
const safeLimit = value => Math.min(MAX_PAGE_SIZE, Math.max(1, Math.floor(Number(value) || 30)));
const safeOffset = value => Math.max(0, Math.floor(Number(value) || 0));
const isPlainObject = value => Boolean(value && typeof value === "object" && !Array.isArray(value) &&
  (Object.getPrototypeOf(value) === Object.prototype || Object.getPrototypeOf(value) === null));

function cloneReference(value, depth = 0) {
  if (depth > 8) throw new Error("A referência da Biblioteca é profunda demais.");
  if (value === null || typeof value === "string" || typeof value === "boolean") return value;
  if (typeof value === "number") {
    if (!Number.isFinite(value)) throw new Error("A referência contém um número inválido.");
    return value;
  }
  if (Array.isArray(value)) return value.slice(0, 64).map(item => cloneReference(item, depth + 1));
  if (!isPlainObject(value)) throw new Error("A referência precisa conter somente dados simples.");
  const result = {};
  for (const [key, child] of Object.entries(value)) {
    if (["__proto__", "prototype", "constructor"].includes(key)) continue;
    result[key] = cloneReference(child, depth + 1);
  }
  return result;
}

function normalizeResource(raw, providerId, defaultOrigin = providerId) {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    throw new TypeError("O provedor retornou um recurso inválido.");
  }
  const id = cleanText(raw.id, 192);
  const kind = cleanText(raw.kind, 48);
  const type = cleanText(raw.type, 64);
  const name = cleanText(raw.name, 160);
  if (!id || !kind || !type || !name) {
    throw new Error("Cada recurso precisa de id, kind, type e name.");
  }
  const tags = Array.isArray(raw.tags)
    ? [...new Set(raw.tags.map(tag => cleanText(tag, 48)).filter(Boolean))].slice(0, 32)
    : [];
  const capabilities = Array.isArray(raw.capabilities)
    ? [...new Set(raw.capabilities.map(value => cleanText(value, 48)).filter(Boolean))].slice(0, 24)
    : [];
  return Object.freeze({
    id,
    providerId,
    kind,
    type,
    name,
    description: cleanText(raw.description, 1000),
    tags: Object.freeze(tags),
    thumbnail: cleanText(raw.thumbnail, 2048),
    folder: cleanText(raw.folder, 160),
    origin: cleanText(raw.origin, 48) || defaultOrigin,
    reference: Object.freeze(cloneReference(raw.reference ?? {})),
    capabilities: Object.freeze(capabilities),
    isExternal: Boolean(raw.isExternal),
    isCompendium: Boolean(raw.isCompendium)
  });
}

function matchesText(resource, query) {
  if (!query) return true;
  const haystack = [resource.name, resource.description, resource.type, resource.folder, ...resource.tags]
    .join(" ").toLocaleLowerCase();
  return haystack.includes(query);
}

/**
 * Providers are deliberately small adapters. They never own the UI and never
 * create another button or window; optional modules contribute to this registry.
 */
export function createLibraryResourceRegistry() {
  const providers = new Map();

  const register = provider => {
    const id = cleanText(provider?.id, 64);
    if (!PROVIDER_ID.test(id) || typeof provider?.list !== "function") {
      throw new TypeError("Um provedor precisa de ID estável e list().");
    }
    if (provider.resolve !== undefined && typeof provider.resolve !== "function") {
      throw new TypeError("resolve() precisa ser uma função.");
    }
    if (providers.has(id)) throw new Error("Provedor da Biblioteca já registrado: " + id);
    const record = Object.freeze({
      id,
      label: cleanText(provider.label, 80) || id,
      origin: cleanText(provider.origin, 48) || id,
      kinds: Object.freeze(Array.isArray(provider.kinds)
        ? [...new Set(provider.kinds.map(value => cleanText(value, 48)).filter(Boolean))]
        : []),
      list: provider.list,
      resolve: provider.resolve ?? null,
      getActions: typeof provider.getActions === "function" ? provider.getActions : null,
      executeAction: typeof provider.executeAction === "function" ? provider.executeAction : null
    });
    providers.set(id, record);
    return () => providers.get(id) === record ? providers.delete(id) : false;
  };

  const list = async ({
    query = "",
    kind = "all",
    type = "all",
    source = "all",
    limit = 30,
    cursor = {},
    compendiumIds = [],
    references = [],
    tags = [],
    origin = "all"
  } = {}) => {
    const search = cleanText(query, 160).toLocaleLowerCase();
    const requestedKind = cleanText(kind, 48) || "all";
    const requestedType = cleanText(type, 64) || "all";
    const pageSize = safeLimit(limit);
    const cursors = isPlainObject(cursor) ? cursor : {};
    const normalizedTags = Array.isArray(tags) ? [...new Set(tags.map(value => cleanText(value, 48).toLocaleLowerCase()).filter(Boolean))].slice(0, 32) : [];
    const normalizedReferences = Array.isArray(references)
      ? references.filter(reference => reference && typeof reference === "object" && String(reference.providerId ?? "") && String(reference.id ?? "")).slice(0, 500)
      : [];
    const selected = [...providers.values()].filter(provider =>
      (source === "all" || provider.id === source) &&
      (!normalizedReferences.length || normalizedReferences.some(reference => reference.providerId === provider.id))
    );
    const results = await Promise.all(selected.map(async provider => {
      try {
        const page = await provider.list({
          query: search,
          kind: requestedKind,
          type: requestedType,
          limit: pageSize,
          cursor: cursors[provider.id] ?? null,
          compendiumIds: Array.isArray(compendiumIds) ? compendiumIds.slice(0, 32).map(String) : [],
          ids: normalizedReferences.filter(reference => reference.providerId === provider.id).map(reference => String(reference.id)),
          tags: normalizedTags,
          origin
        });
        const rawItems = Array.isArray(page) ? page : page?.items;
        if (!Array.isArray(rawItems)) throw new Error("O provedor não retornou uma lista de recursos.");
        const items = rawItems.map(item => normalizeResource(item, provider.id, provider.origin)).filter(item =>
          (requestedKind === "all" || item.kind === requestedKind) &&
          (requestedType === "all" || item.type === requestedType) &&
          (!normalizedTags.length || normalizedTags.every(tag => item.tags.some(value => value.toLocaleLowerCase() === tag))) &&
          (origin === "all" || item.origin === origin) &&
          matchesText(item, search)
        );
        return {
          providerId: provider.id,
          items,
          total: Math.max(items.length, Number(page?.total) || 0),
          hasMore: Boolean(page?.hasMore),
          nextCursor: page?.nextCursor === null || page?.nextCursor === undefined ? null : cloneReference(page.nextCursor),
          error: "",
          warnings: Array.isArray(page?.errors) ? page.errors : []
        };
      } catch (error) {
        return {
          providerId: provider.id, items: [], total: 0, hasMore: false,
          nextCursor: null, error: String(error?.message ?? error), warnings: []
        };
      }
    }));

    const items = results.flatMap(result => result.items).sort((a, b) =>
      a.name.localeCompare(b.name, undefined, { sensitivity: "base" }) ||
      a.providerId.localeCompare(b.providerId) || a.id.localeCompare(b.id)
    );
    const nextCursor = Object.fromEntries(results
      .filter(result => result.hasMore && result.nextCursor !== null && result.nextCursor !== undefined)
      .map(result => [result.providerId, result.nextCursor]));
    return Object.freeze({
      items: Object.freeze(items),
      total: results.reduce((sum, result) => sum + result.total, 0),
      hasMore: results.some(result => result.hasMore),
      cursor: Object.freeze(nextCursor),
      sources: Object.freeze(results.map(result => Object.freeze({
        providerId: result.providerId,
        count: result.items.length,
        total: result.total,
        hasMore: result.hasMore
      }))),
      errors: Object.freeze([
        ...results.filter(result => result.error).map(result =>
          Object.freeze({ providerId: result.providerId, message: result.error })),
        ...results.flatMap(result => result.warnings.map(warning =>
          Object.freeze({ providerId: result.providerId, ...cloneReference(warning) })))
      ])
    });
  };

  const resolve = async (reference, resource = null) => {
    const providerId = cleanText(reference?.providerId ?? resource?.providerId, 64);
    const provider = providers.get(providerId);
    if (!provider?.resolve) throw new Error("Não existe resolvedor para este recurso: " + providerId);
    return provider.resolve(cloneReference(reference), resource);
  };

  const getActions = (reference, resource = null) => {
    const providerId = cleanText(reference?.providerId ?? resource?.providerId, 64);
    const provider = providers.get(providerId);
    if (typeof provider?.getActions !== "function") return Object.freeze([]);
    const actions = provider.getActions(cloneReference(reference), resource);
    if (!Array.isArray(actions)) return Object.freeze([]);
    return Object.freeze(actions.map(action => Object.freeze({
      id: cleanText(action?.id, 48),
      label: cleanText(action?.label, 80),
      description: cleanText(action?.description, 200),
      requiresConfirmation: action?.requiresConfirmation === true,
      destructive: action?.destructive === true
    })).filter(action => /^[a-z][a-z0-9-]{1,47}$/i.test(action.id) && action.label));
  };

  const executeAction = async (actionId, reference, resource = null, params = {}) => {
    const providerId = cleanText(reference?.providerId ?? resource?.providerId, 64);
    const provider = providers.get(providerId);
    if (typeof provider?.executeAction !== "function") throw new Error("Este provedor não oferece operações para o recurso.");
    const action = cleanText(actionId, 48);
    if (!getActions(reference, resource).some(item => item.id === action)) {
      throw new Error("A operação não está disponível para este recurso.");
    }
    return provider.executeAction(action, cloneReference(reference), resource, params);
  };

  const getProviders = () => Object.freeze([...providers.values()].map(provider => Object.freeze({
    id: provider.id, label: provider.label, kinds: provider.kinds
  })));

  return Object.freeze({ register, list, resolve, getActions, executeAction, getProviders });
}

/** Provider for personal NEXUS collections and the built-in component catalog. */
export function createNexusLibraryProvider({ getUser, getWorldFlows = () => [], catalog = {} } = {}) {
  if (typeof getUser !== "function") throw new TypeError("getUser() é obrigatório.");
  const metadataCache = new WeakMap();

  const getCollections = async user => {
    if (!user) return {};
    const canonical = user.getFlag?.("nexus", "libraryStore");
    if (canonical?.collections && typeof canonical.collections === "object" &&
        Number(canonical.schemaVersion ?? 1) <= 2) return canonical.collections;
    const { getLegacyNexusLibraryFlags, readNexusLibraryStore } = await import("./library-store.js");
    return readNexusLibraryStore(user, getLegacyNexusLibraryFlags(user)).store.collections;
  };

  const buildMetadata = async user => {
    const collections = await getCollections(user);
    const resources = [];
    for (const [collection, entries] of Object.entries(collections)) {
      if (!Array.isArray(entries) || !COLLECTION_KINDS[collection]) continue;
      for (const entry of entries) {
        resources.push(normalizeResource({
          id: collection + ":" + String(entry.id),
          kind: COLLECTION_KINDS[collection],
          type: COLLECTION_TYPES[collection] === "component" ? String(entry.type ?? "component") : COLLECTION_TYPES[collection] ?? collection,
          name: entry.name ?? entry.label ?? entry.title ?? entry.id,
          description: entry.description ?? "",
          tags: entry.tags ?? [],
          thumbnail: entry.thumbnail ?? entry.img ?? entry.icon ?? "",
          folder: entry.folder ?? "",
          origin: entry.origin ?? "personal",
          reference: { providerId: "nexus-library", collection, id: String(entry.id) },
          capabilities: ["resolve"]
        }, "nexus-library"));
      }
    }
    let worldFlows = [];
    try { worldFlows = getWorldFlows() ?? []; } catch { worldFlows = []; }
    for (const entry of Array.isArray(worldFlows) ? worldFlows : []) {
      if (!entry || typeof entry !== "object" || !entry.id || !entry.flow) continue;
      resources.push(normalizeResource({
        id: "world-flows:" + String(entry.id),
        kind: "logic",
        type: "flow",
        name: entry.name ?? entry.flow.name ?? "Fluxo salvo",
        description: entry.flow.description ?? "",
        tags: entry.flow.tags ?? [],
        origin: "world",
        reference: { providerId: "nexus-library", collection: "world-flows", id: String(entry.id) },
        capabilities: ["resolve"]
      }, "nexus-library"));
    }

    for (const asset of Array.isArray(catalog.assets) ? catalog.assets : []) {
      resources.push(normalizeResource({
        id: "builtin:" + String(asset.key),
        kind: "component",
        type: String(asset.type ?? "asset"),
        name: asset.label ?? asset.key,
        description: asset.description ?? "",
        tags: asset.tags ?? [],
        thumbnail: asset.thumbnail ?? "",
        origin: "core",
        reference: { providerId: "nexus-library", builtin: "asset", key: String(asset.key) },
        capabilities: ["resolve"]
      }, "nexus-library"));
    }
    const builtInThemes = [
      ...Object.entries(THEME_PALETTES).map(([id, palette]) => ({ id, name: id, palette })),
      ...(Array.isArray(catalog.themes) ? catalog.themes : [])
    ];
    for (const theme of builtInThemes) {
      resources.push(normalizeResource({
        id: "builtin-theme:" + String(theme.id ?? theme.key),
        kind: "theme",
        type: "theme",
        name: theme.name ?? theme.label ?? THEME_LABELS[theme.id] ?? theme.id,
        description: theme.description ?? "",
        tags: theme.tags ?? [],
        origin: "core",
        reference: { providerId: "nexus-library", builtin: "theme", key: String(theme.id ?? theme.key) },
        capabilities: ["resolve"]
      }, "nexus-library"));
    }
    resources.sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: "base" }));
    return Object.freeze(resources);
  };

  const getMetadata = async () => {
    const user = getUser();
    if (!user || (typeof user !== "object" && typeof user !== "function")) return buildMetadata(user);
    let metadata = metadataCache.get(user);
    if (!metadata) {
      metadata = await buildMetadata(user);
      metadataCache.set(user, metadata);
    }
    return metadata;
  };

  // Canonical Library writes invalidate the metadata-only index; full payloads are never cached here.
  globalThis.Hooks?.on?.("nexusLibraryUpdated", user => {
    if (user && (typeof user === "object" || typeof user === "function")) metadataCache.delete(user);
  });
  globalThis.Hooks?.on?.("updateSetting", setting => {
    if (setting?.namespace === "nexus" && setting?.key === "interactionLibrary") {
      const user = getUser();
      if (user && (typeof user === "object" || typeof user === "function")) metadataCache.delete(user);
    }
  });

  const list = async ({ query = "", kind = "all", type = "all", limit = 30, cursor = 0, ids = [], tags = [], origin = "all" } = {}) => {
    const resources = await getMetadata();
    const search = cleanText(query, 160).toLocaleLowerCase();
    const requestedIds = new Set(Array.isArray(ids) ? ids.map(String).slice(0, 500) : []);
    const requestedTags = Array.isArray(tags) ? tags.map(value => String(value).toLocaleLowerCase()) : [];
    const filtered = resources.filter(resource =>
      (!requestedIds.size || requestedIds.has(resource.id)) &&
      (!requestedTags.length || requestedTags.every(tag => resource.tags.some(value => value.toLocaleLowerCase() === tag))) &&
      (origin === "all" || resource.origin === origin) &&
      (kind === "all" || resource.kind === kind) &&
      (type === "all" || resource.type === type) &&
      matchesText(resource, search)
    );
    const offset = safeOffset(cursor);
    const pageSize = safeLimit(limit);
    const items = filtered.slice(offset, offset + pageSize);
    return {
      items,
      total: filtered.length,
      hasMore: offset + items.length < filtered.length,
      nextCursor: offset + items.length
    };
  };

  const getActions = reference => {
    const collection = String(reference?.collection ?? "");
    const id = String(reference?.id ?? "");
    if (!NEXUS_LIBRARY_COLLECTIONS.includes(collection) || collection === "world-flows" || !id) return [];
    return [
      { id: "edit-metadata", label: "Editar metadados" },
      { id: "duplicate", label: "Duplicar" },
      { id: "delete", label: "Excluir", requiresConfirmation: true, destructive: true }
    ];
  };

  const executeAction = async (actionId, reference, params = {}) => {
    const user = getUser();
    if (!user) throw new Error("Não foi possível identificar o usuário da Biblioteca.");
    const collection = String(reference?.collection ?? "");
    const id = String(reference?.id ?? "");
    if (!NEXUS_LIBRARY_COLLECTIONS.includes(collection) || collection === "world-flows" || !id) {
      throw new Error("Este recurso não pertence a uma coleção pessoal editável.");
    }
    const current = readNexusLibraryStore(user, getLegacyNexusLibraryFlags(user)).store;
    const original = current.collections[collection].find(entry => String(entry.id) === id);
    if (!original) throw new Error("O recurso não existe mais na Biblioteca.");
    const logicCollections = new Set(["properties", "rules", "behaviors", "flows", "functions"]);
    const legacyFlags = {
      components: "libraryComponents", groups: "libraryGroups", layouts: "libraryLayouts",
      templates: "libraryTemplates", assets: "libraryAssets", media: "libraryMedia",
      themes: "libraryThemes", styles: "libraryStyles", properties: "libraryProperties",
      rules: "libraryRules", behaviors: "libraryBehaviors", flows: "interactionLibrary",
      functions: "libraryFunctions"
    };
    const mirrorLegacy = async saved => {
      const flag = legacyFlags[collection];
      if (flag) await user.setFlag("nexus", flag, saved.collections[collection]);
    };
    const updateLogicRegistry = asset => {
      if (logicCollections.has(collection) && asset) {
        try { globalThis.game?.nexus?.logic?.registry?.register?.(asset, { replace: true }); }
        catch (error) { globalThis.console?.warn?.("NEXUS | Não foi possível atualizar o registro lógico.", error); }
      }
    };

    if (actionId === "edit-metadata") {
      const name = String(params.name ?? "").trim().slice(0, 120);
      if (!name) throw new Error("O nome não pode ficar vazio.");
      const description = String(params.description ?? "").trim().slice(0, 1000);
      const tags = [...new Set((Array.isArray(params.tags) ? params.tags : String(params.tags ?? "").split(","))
        .map(tag => String(tag).trim().slice(0, 48)).filter(Boolean))].slice(0, 20);
      const saved = await updateNexusLibraryStore(user, store => {
        const entry = store.collections[collection].find(item => String(item.id) === id);
        if (!entry) throw new Error("O recurso não existe mais na Biblioteca.");
        if ("name" in entry || !("label" in entry)) entry.name = name;
        else entry.label = name;
        if ("description" in entry || description) entry.description = description;
        entry.tags = tags;
        return store;
      });
      await mirrorLegacy(saved);
      updateLogicRegistry(saved.collections[collection].find(entry => String(entry.id) === id));
      return { updated: true, entry: saved.collections[collection].find(entry => String(entry.id) === id) };
    }

    if (actionId === "duplicate") {
      const suffix = globalThis.foundry?.utils?.randomID?.(8)?.toLowerCase() ?? Math.random().toString(36).slice(2, 10);
      const copy = structuredClone(original);
      copy.id = logicCollections.has(collection) ? `nexus.personal.${collection.slice(0, -1)}.copy-${suffix}` : suffix;
      if (copy.sourceId) copy.sourceId = String(copy.sourceId) + "-copy-" + suffix;
      if ("name" in copy || !("label" in copy)) copy.name = String(original.name ?? original.label ?? "Item") + " (cópia)";
      else copy.label = String(original.label) + " (cópia)";
      const saved = await updateNexusLibraryStore(user, store => { store.collections[collection].push(copy); return store; });
      await mirrorLegacy(saved);
      updateLogicRegistry(copy);
      return { duplicated: true, entry: copy };
    }

    if (actionId === "delete") {
      const dependents = NEXUS_LIBRARY_COLLECTIONS.flatMap(name => current.collections[name]
        .filter(entry => String(entry.id) !== id && Array.isArray(entry.dependencies))
        .filter(entry => entry.dependencies.some(dependency => String(typeof dependency === "string" ? dependency : dependency?.id ?? "") === id)));
      const logicDependents = logicCollections.has(collection)
        ? (globalThis.game?.nexus?.logic?.registry?.getDependents?.(id) ?? []) : [];
      if (dependents.length || logicDependents.length) {
        throw new Error("Este recurso possui dependências e não pode ser excluído agora.");
      }
      const saved = await updateNexusLibraryStore(user, store => {
        store.collections[collection] = store.collections[collection].filter(entry => String(entry.id) !== id);
        return store;
      });
      await mirrorLegacy(saved);
      if (logicCollections.has(collection)) globalThis.game?.nexus?.logic?.registry?.remove?.(id);
      return { deleted: true, id };
    }

    throw new Error("Operação da Biblioteca não reconhecida.");
  };

  const resolve = async reference => {
    if (reference?.collection === "world-flows") {
      let entries = [];
      try { entries = getWorldFlows() ?? []; } catch { entries = []; }
      return (Array.isArray(entries) ? entries : []).find(entry => String(entry?.id ?? "") === String(reference.id ?? "")) ?? null;
    }
    if (reference?.builtin === "asset") {
      return (catalog.assets ?? []).find(item => String(item.key) === String(reference.key)) ?? null;
    }
    if (reference?.builtin === "theme") {
      return [...Object.entries(THEME_PALETTES).map(([id, palette]) => ({ id, name: id, palette })), ...(catalog.themes ?? [])].find(item => String(item.id ?? item.key) === String(reference.key)) ?? null;
    }
    const collections = await getCollections(getUser());
    const collection = String(reference?.collection ?? "");
    const id = String(reference?.id ?? "");
    if (!Array.isArray(collections[collection])) throw new Error("Coleção NEXUS desconhecida: " + collection);
    return collections[collection].find(entry => String(entry.id) === id) ?? null;
  };

  return Object.freeze({
    id: "nexus-library",
    label: "Biblioteca NEXUS",
    kinds: Object.freeze(["component", "composition", "layout", "template", "asset", "media", "theme", "style", "logic"]),
    list,
    resolve,
    getActions,
    executeAction
  });
}

/** Provider for native Foundry documents. It stores only UUID references and metadata. */
export function createFoundryLibraryProvider({ documentBridge } = {}) {
  if (!documentBridge || typeof documentBridge.list !== "function" || typeof documentBridge.resolve !== "function") {
    throw new TypeError("O FoundryDocumentBridge é obrigatório.");
  }
  const toResource = record => ({
    id: record.uuid,
    kind: "document",
    type: record.type,
    name: record.name,
    description: "",
    tags: [record.type, record.isCompendium ? "compendium" : "world"],
    thumbnail: record.img,
    folder: record.folder,
    origin: record.isCompendium ? "compendium" : "world",
    reference: { providerId: "foundry-documents", uuid: record.uuid },
    capabilities: ["resolve"],
    isExternal: false,
    isCompendium: record.isCompendium
  });

  const list = async ({
    query = "",
    type = "all",
    kind = "all",
    limit = 30,
    cursor = 0,
    compendiumIds = [],
    ids = [],
    tags = [],
    origin = "all"
  } = {}) => {
    if (kind !== "all" && kind !== "document") {
      return { items: [], total: 0, hasMore: false, nextCursor: null };
    }
    const validTypes = new Set(Object.keys(documentBridge.types ?? {}));
    const requestedType = type === "all" || !validTypes.has(type) ? "all" : type;
    const requestedIds = [...new Set(Array.isArray(ids) ? ids.map(String).filter(Boolean).slice(0, 500) : [])];

    if (requestedIds.length) {
      const requestedTags = Array.isArray(tags) ? tags.map(value => String(value).toLocaleLowerCase()) : [];
      if (typeof documentBridge.reference !== "function") {
        throw new Error("O bridge de documentos não oferece referências estáveis para esta consulta.");
      }
      const records = await Promise.all(requestedIds.map(async uuid => {
        try {
          const document = await documentBridge.resolve({ uuid });
          return documentBridge.reference(document);
        } catch {
          return null;
        }
      }));
      const items = records.filter(record => record && (requestedType === "all" || record.type === requestedType))
        .map(toResource).filter(resource => (!requestedTags.length || requestedTags.every(tag => resource.tags.some(value => value.toLocaleLowerCase() === tag))) && (origin === "all" || resource.origin === origin));
      return { items, total: items.length, hasMore: false, nextCursor: null, errors: [] };
    }

    const offset = safeOffset(cursor);
    const page = await documentBridge.list({
      type: requestedType,
      query,
      offset,
      limit: safeLimit(limit),
      compendiumIds,
      tags,
      origin
    });
    return {
      items: page.items.map(toResource).filter(resource => origin === "all" || resource.origin === origin),
      total: page.total,
      hasMore: page.hasMore,
      nextCursor: page.hasMore ? offset + page.items.length : null,
      errors: page.errors ?? []
    };
  };

  return Object.freeze({
    id: "foundry-documents",
    label: "Documentos Foundry",
    kinds: Object.freeze(["document"]),
    list,
    resolve: reference => documentBridge.resolve(reference),
    getActions: () => [{ id: "open", label: "Abrir documento" }],
    executeAction: async (actionId, reference) => {
      if (actionId !== "open") throw new Error("Operação de documento Foundry não reconhecida.");
      const document = await documentBridge.resolve(reference);
      if (typeof document?.sheet?.render !== "function") {
        throw new Error("Este documento não possui uma ficha que possa ser aberta.");
      }
      document.sheet.render(true);
      return { opened: true, uuid: reference.uuid };
    }
  });
}

/** Creates the default unified catalog with NEXUS and Foundry sources connected. */
export function createDefaultLibraryResourceRegistry({ getUser, getWorldFlows, documentBridge, catalog } = {}) {
  const registry = createLibraryResourceRegistry();
  registry.register(createNexusLibraryProvider({ getUser, getWorldFlows, catalog }));
  if (documentBridge) registry.register(createFoundryLibraryProvider({ documentBridge }));
  return registry;
}

import assert from "node:assert/strict";
import {
  createLibraryResourceRegistry,
  createNexusLibraryProvider,
  createFoundryLibraryProvider,
  createDefaultLibraryResourceRegistry
} from "../scripts/core/library-resource-registry.js";
import { createEmptyNexusLibraryStore, updateNexusLibraryStore } from "../scripts/core/library-store.js";

const hookListeners = new Map();
globalThis.Hooks = {
  on(name, callback) { const listeners = hookListeners.get(name) ?? []; listeners.push(callback); hookListeners.set(name, listeners); },
  callAll(name, ...args) { for (const callback of hookListeners.get(name) ?? []) callback(...args); }
};

const store = createEmptyNexusLibraryStore();
store.collections.components.push({
  id: "component-health",
  name: "Indicador de recurso",
  description: "Componente reutilizável",
  tags: ["ficha", "recurso"],
  payload: { settings: { currentPath: "resources.vitality.value" } }
});
store.collections.media.push({
  id: "media-map",
  name: "Mapa da região",
  tags: ["mapa"],
  url: "https://example.invalid/map.webp"
});
store.collections.behaviors.push({
  id: "behavior-open",
  name: "Abrir painel",
  type: "behavior",
  payload: { actions: [{ type: "open" }] }
});

const user = {
  libraryStore: store,
  getFlag(scope, key) {
    return scope === "nexus" && key === "libraryStore" ? this.libraryStore : undefined;
  },
  async setFlag(scope, key, value) {
    if (scope === "nexus" && key === "libraryStore") this.libraryStore = value;
    return value;
  }
};

const nexusProvider = createNexusLibraryProvider({
  getUser: () => user,
  catalog: {
    assets: [{ key: "core-resource", type: "sheet-resource", label: "Barra neutra", tags: ["recurso"] }],
    themes: []
  }
});

const nexusPage = await nexusProvider.list({ limit: 2 });
assert.equal(nexusPage.items.length, 2);
assert.equal(nexusPage.total, 11, "A listagem inclui coleções pessoais, catálogo de componentes e temas padrão.");
assert.equal(nexusPage.hasMore, true);
assert.equal(nexusPage.nextCursor, 2);
assert.ok(nexusPage.items.every(item => !Object.hasOwn(item, "payload")),
  "A listagem deve expor metadados, não payloads completos.");

const nextNexusPage = await nexusProvider.list({ limit: 2, cursor: nexusPage.nextCursor });
assert.equal(nextNexusPage.items.length, 2);
assert.equal(nextNexusPage.hasMore, true);
assert.equal(nextNexusPage.nextCursor, 4);
const behaviorPage = await nexusProvider.list({ kind: "logic", type: "behavior" });
assert.equal(behaviorPage.items.length, 1);
assert.equal(behaviorPage.items[0].kind, "logic");
const taggedNexusPage = await nexusProvider.list({ tags: ["recurso"] });
assert.ok(taggedNexusPage.items.length >= 1);
assert.ok(taggedNexusPage.items.every(item => item.tags.some(tag => tag.toLocaleLowerCase() === "recurso")),
  "Tag filtering must happen at the provider before pagination.");
const personalNexusPage = await nexusProvider.list({ origin: "personal" });
assert.ok(personalNexusPage.items.length > 0);
assert.ok(personalNexusPage.items.every(item => item.origin === "personal"),
  "Origin filtering must distinguish personal definitions from built-in resources.");

const component = await nexusProvider.resolve({
  providerId: "nexus-library",
  collection: "components",
  id: "component-health"
});
assert.equal(component.payload.settings.currentPath, "resources.vitality.value");
const componentReference = { providerId: "nexus-library", collection: "components", id: "component-health" };
assert.deepEqual(nexusProvider.getActions(componentReference).map(action => action.id), ["edit-metadata", "duplicate", "delete"]);
const metadataResult = await nexusProvider.executeAction("edit-metadata", componentReference, {
  name: "Indicador de vitalidade",
  description: "Metadados atualizados",
  tags: ["ficha", "vitalidade"]
});
assert.equal(metadataResult.entry.name, "Indicador de vitalidade");
const duplicateResult = await nexusProvider.executeAction("duplicate", componentReference);
assert.equal(duplicateResult.duplicated, true);
assert.notEqual(duplicateResult.entry.id, "component-health");
assert.equal(duplicateResult.entry.name, "Indicador de vitalidade (cópia)");
const deleteResult = await nexusProvider.executeAction("delete", {
  providerId: "nexus-library",
  collection: "components",
  id: duplicateResult.entry.id
});
assert.equal(deleteResult.deleted, true);
let worldFlows = [{ id: "world-flow-1", name: "Fluxo de sessão", flow: { name: "Fluxo de sessão", triggers: [], conditions: [], actions: [] } }];
const flowProvider = createNexusLibraryProvider({ getUser: () => user, getWorldFlows: () => worldFlows, catalog: { assets: [], themes: [] } });
const worldFlowPage = await flowProvider.list({ origin: "world", type: "flow" });
assert.equal(worldFlowPage.items.length, 1, "World-scoped interaction flows must be visible in the universal catalog.");
assert.equal(worldFlowPage.items[0].reference.collection, "world-flows");
assert.equal((await flowProvider.resolve(worldFlowPage.items[0].reference)).name, "Fluxo de sessão");
worldFlows = [{ id: "world-flow-2", name: "Fluxo atualizado", flow: { name: "Fluxo atualizado", triggers: [], conditions: [], actions: [] } }];
globalThis.Hooks.callAll("updateSetting", { namespace: "nexus", key: "interactionLibrary" });
const refreshedWorldFlowPage = await flowProvider.list({ query: "Fluxo atualizado", origin: "world" });
assert.equal(refreshedWorldFlowPage.items.length, 1, "World setting updates must invalidate the flow metadata index.");

await updateNexusLibraryStore(user, current => {
  current.collections.media.push({ id: "media-new", name: "Trilha ambiente", tags: ["audio"] });
  return current;
});
const refreshedPage = await nexusProvider.list({ query: "Trilha ambiente" });
assert.equal(refreshedPage.items.length, 1,
  "A gravação canônica deve invalidar o índice leve da Biblioteca.");

const bridgeCalls = [];
const documentBridge = {
  types: { actors: {}, items: {}, scenes: {}, journals: {}, macros: {}, playlists: {}, tables: {}, cards: {} },
  async list(options) {
    bridgeCalls.push(options);
    const records = [
      { uuid: "Actor.abc", type: "actors", name: "Aventureiro", img: "actor.webp", folder: "Personagens", isCompendium: false },
      { uuid: "Macro.def", type: "macros", name: "Preparar sessão", img: "", folder: "Ferramentas", isCompendium: false },
      { uuid: "Scene.xyz", type: "scenes", name: "Sala de jogo", img: "scene.webp", folder: "Cenas", isCompendium: false }
    ];
    const filtered = records.filter(record =>
      (options.type === "all" || options.type === record.type) &&
      record.name.toLocaleLowerCase().includes(options.query)
    );
    const items = filtered.slice(options.offset, options.offset + options.limit);
    return {
      items,
      total: filtered.length,
      hasMore: options.offset + items.length < filtered.length,
      errors: []
    };
  },
  async resolve(reference) {
    return { uuid: reference.uuid, documentName: "Actor", name: "Documento resolvido" };
  },
  reference(document) {
    const record = [
      { uuid: "Actor.abc", type: "actors", name: "Aventureiro", img: "actor.webp", folder: "Personagens", isCompendium: false },
      { uuid: "Macro.def", type: "macros", name: "Preparar sessão", img: "", folder: "Ferramentas", isCompendium: false },
      { uuid: "Scene.xyz", type: "scenes", name: "Sala de jogo", img: "scene.webp", folder: "Cenas", isCompendium: false }
    ].find(item => item.uuid === document.uuid);
    if (!record) throw new Error("Documento não encontrado.");
    return record;
  }
};

const foundryProvider = createFoundryLibraryProvider({ documentBridge });
const foundryPage = await foundryProvider.list({ kind: "document", limit: 1 });
assert.equal(foundryPage.items[0].kind, "document");
assert.equal(foundryPage.items[0].reference.uuid, "Actor.abc");
assert.equal(foundryPage.hasMore, true);
assert.equal(bridgeCalls[0].compendiumIds.length, 0,
  "Compêndios não devem ser varridos automaticamente.");
const foundryResolved = await foundryProvider.resolve(foundryPage.items[0].reference);
assert.equal(foundryResolved.name, "Documento resolvido");
const favoritePage = await foundryProvider.list({ kind: "document", ids: ["Scene.xyz"] });
assert.equal(favoritePage.items.length, 1, "Referências favoritas devem ser resolvidas mesmo fora da primeira página.");
assert.equal(favoritePage.items[0].reference.uuid, "Scene.xyz");
assert.equal(favoritePage.hasMore, false);

const registry = createLibraryResourceRegistry();
registry.register(nexusProvider);
registry.register(foundryProvider);
assert.throws(() => registry.register(nexusProvider), /já registrado/);

const unifiedPage = await registry.list({ limit: 2 });
assert.equal(unifiedPage.items.length, 4,
  "Cada provedor pode contribuir uma página para o mesmo explorador.");
assert.deepEqual(unifiedPage.sources.map(source => source.providerId).sort(),
  ["foundry-documents", "nexus-library"]);
assert.equal(unifiedPage.hasMore, true);
assert.ok(unifiedPage.cursor["nexus-library"] !== undefined);
assert.ok(unifiedPage.cursor["foundry-documents"] !== undefined);

const foundryOnly = await registry.list({ source: "foundry-documents", type: "actors" });
assert.ok(foundryOnly.items.every(item => item.type === "actors"));
const worldTagged = await registry.list({ tags: ["world"], source: "foundry-documents" });
assert.ok(worldTagged.items.length > 0);
assert.ok(worldTagged.items.every(item => item.tags.includes("world")));
const foundryWorldOnly = await registry.list({ origin: "world", source: "foundry-documents" });
assert.ok(foundryWorldOnly.items.length > 0);
assert.ok(foundryWorldOnly.items.every(item => item.origin === "world"));
const resolved = await registry.resolve(
  foundryOnly.items[0].reference,
  foundryOnly.items[0]
);
assert.equal(resolved.name, "Documento resolvido");
assert.deepEqual(registry.getActions(foundryOnly.items[0].reference).map(action => action.id), ["open"]);
await assert.rejects(registry.executeAction("delete", foundryOnly.items[0].reference), /não oferece operações|não está disponível/);
const referencedPage = await registry.list({
  references: [
    { providerId: "nexus-library", id: "components:component-health" },
    { providerId: "foundry-documents", id: "Scene.xyz" }
  ],
  limit: 10
});
assert.equal(referencedPage.items.length, 2, "A consulta por referências deve buscar itens de qualquer posição do catálogo.");
assert.deepEqual(referencedPage.items.map(item => item.providerId).sort(), ["foundry-documents", "nexus-library"]);

const brokenRegistry = createLibraryResourceRegistry();
brokenRegistry.register({
  id: "provider-broken",
  list: async () => { throw new Error("fonte indisponível"); }
});
brokenRegistry.register({
  id: "provider-good",
  list: async () => [{ id: "good:1", kind: "asset", type: "test", name: "Disponível", reference: {} }]
});
const partial = await brokenRegistry.list();
assert.equal(partial.items.length, 1);
assert.equal(partial.errors[0].message, "fonte indisponível");

const defaults = createDefaultLibraryResourceRegistry({
  getUser: () => user,
  documentBridge,
  catalog: { assets: [], themes: [] }
});
assert.deepEqual(defaults.getProviders().map(provider => provider.id).sort(),
  ["foundry-documents", "nexus-library"]);

console.log("Universal Library Resource Registry: OK");

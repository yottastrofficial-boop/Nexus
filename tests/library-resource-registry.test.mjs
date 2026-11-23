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
assert.equal(nextNexusPage.hasMore, false);
const behaviorPage = await nexusProvider.list({ kind: "logic", type: "behavior" });
assert.equal(behaviorPage.items.length, 1);
assert.equal(behaviorPage.items[0].kind, "logic");

const component = await nexusProvider.resolve({
  providerId: "nexus-library",
  collection: "components",
  id: "component-health"
});
assert.equal(component.payload.settings.currentPath, "resources.vitality.value");

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
const resolved = await registry.resolve(
  foundryOnly.items[0].reference,
  foundryOnly.items[0]
);
assert.equal(resolved.name, "Documento resolvido");

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

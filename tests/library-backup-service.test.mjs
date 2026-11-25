import test from "node:test";
import assert from "node:assert/strict";
import { createEmptyNexusLibraryStore } from "../scripts/core/library-store.js";
import { parseNexusLibraryBackup } from "../scripts/core/library-sharing.js";
import { createLibraryBackupService } from "../scripts/library/library-backup-service.js";

function makeUser(store = createEmptyNexusLibraryStore()) {
  const flags = new Map([["libraryStore", store]]);
  return {
    getFlag(scope, key) { return scope === "nexus" ? flags.get(key) : undefined; },
    async setFlag(scope, key, value) { if (scope === "nexus") flags.set(key, value); return value; },
    flags
  };
}

test("backup export is owned by the Library and includes every collection plus world flows", () => {
  const store = createEmptyNexusLibraryStore();
  store.collections.components.push({ id: "component-a", label: "Token", type: "token", settings: { w: 100, h: 100 } });
  store.collections.assets.push({ id: "asset-custom", key: "custom-asset", type: "token", label: "Asset personalizado", template: {} });
  store.collections.properties.push({ id: "property-a", name: "Propriedade" });
  store.collections.functions.push({ id: "function-a", name: "Função", expression: "1 + 1" });
  store.collections.flows.push({ id: "personal-flow", name: "Fluxo pessoal", flow: { name: "Fluxo pessoal", triggers: [], conditions: [], actions: [] } });
  const user = makeUser(store);
  const service = createLibraryBackupService({
    getUser: () => user,
    getCatalog: () => ({ assets: [{ key: "builtin-asset", type: "token", label: "Asset padrão", template: {} }] }),
    getThemePalettes: () => ({ "nexus-dark": { background: "#000000" } }),
    getWorldFlows: () => [{ id: "world-flow", name: "Fluxo do mundo", flow: { name: "Fluxo do mundo", triggers: [], conditions: [], actions: [] } }],
    getComponentTypes: () => ["token"]
  });

  const code = service.exportCode();
  const parsed = parseNexusLibraryBackup(code, ["token"]);
  assert.equal(parsed.collections.properties.length, 1);
  assert.equal(parsed.collections.functions.length, 1);
  assert.equal(parsed.collections.assets.length, 2);
  assert.ok(parsed.collections.flows.some(entry => entry.origin === "personal"));
  assert.ok(parsed.collections.flows.some(entry => entry.origin === "world"));
});

test("backup import merges into the canonical store, preserves world-flow scope and mirrors legacy flags", async () => {
  const sourceStore = createEmptyNexusLibraryStore();
  sourceStore.collections.components.push({ id: "component-a", label: "Token", type: "token", settings: { w: 100, h: 100 } });
  sourceStore.collections.properties.push({ id: "property-a", name: "Propriedade" });
  sourceStore.collections.functions.push({ id: "function-a", name: "Função", expression: "1 + 1" });
  sourceStore.collections.flows.push({ id: "personal-flow", name: "Fluxo pessoal", flow: { name: "Fluxo pessoal", triggers: [], conditions: [], actions: [] } });
  const sourceUser = makeUser(sourceStore);
  const sourceService = createLibraryBackupService({
    getUser: () => sourceUser,
    getCatalog: () => ({ assets: [] }),
    getThemePalettes: () => ({}),
    getWorldFlows: () => [{ id: "world-flow", name: "Fluxo do mundo", flow: { name: "Fluxo do mundo", triggers: [], conditions: [], actions: [] } }],
    getComponentTypes: () => ["token"]
  });
  const code = sourceService.exportCode();

  const targetUser = makeUser();
  let worldFlows = [];
  let sequence = 0;
  const targetService = createLibraryBackupService({
    getUser: () => targetUser,
    getCatalog: () => ({ assets: [] }),
    getThemePalettes: () => ({}),
    getWorldFlows: () => worldFlows,
    setWorldFlows: async next => { worldFlows = next; },
    getComponentTypes: () => ["token"]
  });
  const result = await targetService.importCode(code, { createId: collection => `${collection}-generated-${++sequence}` });

  assert.equal(result.report.added.components, 1);
  assert.equal(result.report.added.properties, 1);
  assert.equal(result.report.added.functions, 1);
  assert.equal(result.report.added.flows, 1);
  assert.equal(result.report.added.worldFlows, 1);
  assert.equal(targetUser.flags.get("libraryStore").collections.components.length, 1);
  assert.equal(targetUser.flags.get("libraryProperties").length, 1);
  assert.equal(targetUser.flags.get("libraryFunctions").length, 1);
  assert.equal(worldFlows.length, 1);
  assert.equal(worldFlows[0].name, "Fluxo do mundo");
});

test("importação recusa uma prévia obsoleta quando surge conflito antes da confirmação", async () => {
  const sourceStore = createEmptyNexusLibraryStore();
  sourceStore.collections.components.push({ id: "component-a", label: "Token", type: "token", settings: { w: 100, h: 100 } });
  const sourceUser = makeUser(sourceStore);
  const sourceService = createLibraryBackupService({
    getUser: () => sourceUser,
    getCatalog: () => ({ assets: [] }),
    getThemePalettes: () => ({}),
    getComponentTypes: () => ["token"]
  });
  const code = sourceService.exportCode();

  const targetUser = makeUser();
  const targetService = createLibraryBackupService({
    getUser: () => targetUser,
    getCatalog: () => ({ assets: [] }),
    getThemePalettes: () => ({}),
    getComponentTypes: () => ["token"]
  });
  const preview = targetService.prepareImport(code, {
    createId: (collection, index) => collection + "-planned-" + index
  });

  const changed = targetUser.flags.get("libraryStore");
  changed.collections.components.push({
    id: "existing-component",
    sourceId: "component-a",
    label: "Já existe",
    type: "token",
    settings: { w: 50, h: 50 }
  });
  await targetUser.setFlag("nexus", "libraryStore", changed);

  await assert.rejects(targetService.commitImport(preview), /Biblioteca mudou desde a prévia/);
  assert.equal(targetUser.flags.get("libraryStore").collections.components[0].label, "Já existe");
});


test("backup round-trips complete custom design profiles without flattening them into palettes", () => {
  const store = createEmptyNexusLibraryStore();
  store.collections.themes.push({
    id: "design-forest",
    sourceId: "design-profile-design-forest",
    kind: "design-profile",
    name: "Bosque Antigo",
    palette: { panel: "#123456" },
    profile: {
      schemaVersion: 2, id: "design-forest", name: "Bosque Antigo", preset: "medieval",
      palette: { panel: "#123456" },
      components: { buttons: { background: "#abcdef", text: "#ffffff", border: "#123456", borderStyle: "dashed", borderWidth: 2, radius: 10 } },
      typography: { family: "Georgia", baseSize: 16 },
      layout: { density: "spacious" },
      accessibility: { reducedMotion: true }
    }
  });
  const user = makeUser(store);
  const service = createLibraryBackupService({
    getUser: () => user,
    getCatalog: () => ({ assets: [] }),
    getThemePalettes: () => ({ "nexus-dark": { panel: "#000000" } }),
    getComponentTypes: () => ["token"]
  });
  const code = service.exportCode();
  assert.ok(code.startsWith("NEXUS-LIBRARY/3"));
  const target = makeUser();
  const targetService = createLibraryBackupService({
    getUser: () => target,
    getCatalog: () => ({ assets: [] }),
    getThemePalettes: () => ({ "nexus-dark": { panel: "#000000" } }),
    getComponentTypes: () => ["token"]
  });
  const preview = targetService.prepareImport(code, { createId: () => "imported-design-profile" });
  const incoming = preview.incoming.collections.themes.find(entry => entry.kind === "design-profile");
  assert.equal(incoming.name, "Bosque Antigo");
  assert.equal(incoming.profile.palette.panel, "#123456");
  assert.equal(incoming.profile.typography.baseSize, 16);
  assert.equal(incoming.profile.layout.density, "spacious");
  assert.equal(incoming.profile.accessibility.reducedMotion, true);
});


test("backup refuses to downgrade a future design profile schema", () => {
  const user = makeUser();
  const service = createLibraryBackupService({
    getUser: () => user,
    getCatalog: () => ({ assets: [] }),
    getThemePalettes: () => ({}),
    getComponentTypes: () => ["token"]
  });
  const futureBackup = "NEXUS-LIBRARY/3\\n" + JSON.stringify({
    format: "nexus-library", version: 3, name: "Future",
    collections: { themes: { "design-profile-future": {
      __nexusDesignProfile: 1, name: "Future", palette: { panel: "#112233" },
      profile: { schemaVersion: 99, palette: { panel: "#112233" } }
    } } }
  });
  assert.throws(() => service.prepareImport(futureBackup), /versão mais recente/);
});

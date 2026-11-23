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

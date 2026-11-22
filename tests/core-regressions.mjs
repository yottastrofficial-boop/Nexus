import assert from "node:assert/strict";
import {
  evaluateNexusCondition,
  evaluateNexusExpression,
  evaluateNexusFormula
} from "../scripts/core/formula-engine.js";
import { createLibraryDefinition, createLibraryComponentInstance } from "../scripts/core/library-models.js";
import { mergeNexusLibraryStores, normalizeNexusLibraryStore, updateNexusLibraryStore, writeNexusLibraryCollection } from "../scripts/core/library-store.js";
import { createPropertyRegistry } from "../scripts/core/property-registry.js";

const resolver = path => path === "pv" ? "" : path === "level" ? 3 : undefined;

assert.equal(evaluateNexusFormula("@pv + 2", resolver), 2, "valor vazio deve ser tratado como zero em cálculo numérico");
assert.equal(evaluateNexusCondition("@pv == 0", resolver), true, "valor vazio deve comparar como zero");
assert.equal(evaluateNexusExpression('"NEXUS" + " RPG"', resolver), "NEXUS RPG");
assert.equal(evaluateNexusExpression('{{"texto com espaços"}}', resolver), "texto com espaços");
assert.equal(evaluateNexusFormula("-3 + @level", resolver), 0, "valores negativos devem ser preservados");
assert.equal(evaluateNexusExpression("globalThis.process", resolver), null, "JavaScript arbitrário não pode ser executado");

const normalized = normalizeNexusLibraryStore({
  schemaVersion: 1,
  metadata: { origin: "future-compatible", revision: 2 },
  collections: { components: [{ id: "component-1", label: "PV" }] }
});
assert.deepEqual(normalized.metadata, { origin: "future-compatible", revision: 2 });
const merged = mergeNexusLibraryStores(normalized, { schemaVersion: 1, collections: { rules: [{ id: "imported-rule" }] } });
assert.deepEqual(merged.store.metadata, normalized.metadata, "a mesclagem deve preservar os metadados atuais");

const state = Object.create(null);
const fakeUser = {
  getFlag(_scope, key) { return state[key]; },
  async setFlag(_scope, key, value) {
    await new Promise(resolve => setTimeout(resolve, 2));
    state[key] = structuredClone(value);
  }
};
await Promise.all([
  writeNexusLibraryCollection(fakeUser, "components", [{ id: "component-1", label: "PV" }]),
  updateNexusLibraryStore(fakeUser, store => {
    store.collections.rules = [{ id: "rule-1", name: "Regra de teste" }];
    return store;
  })
]);
assert.equal(state.libraryStore.collections.components[0].id, "component-1");
assert.equal(state.libraryStore.collections.rules[0].id, "rule-1");
assert.equal(state.libraryComponents[0].id, "component-1");

const propertyRegistry = createPropertyRegistry({
  custom: [
    { id: "custom.safe", path: "custom.safe", label: "Seguro", type: "number" },
    { id: "custom.unsafe", path: "__proto__.polluted", label: "Inválido", type: "number" }
  ]
});
assert.equal(propertyRegistry.resolve("custom.safe")?.type, "number");
assert.equal(propertyRegistry.resolve("__proto__.polluted"), null);

const definition = createLibraryDefinition({
  id: "component-definition",
  type: "resource",
  label: "PV",
  settings: { text: "PV", width: 100 }
});
const instance = createLibraryComponentInstance(definition, {
  id: "actor-component",
  overrides: { text: "Vida" },
  position: { x: 20, y: 30 }
});
instance.text = "Outro texto";
assert.equal(definition.settings.text, "PV");
assert.equal(instance.text, "Outro texto");

console.log("NEXUS core-regressions: testes aprovados.");

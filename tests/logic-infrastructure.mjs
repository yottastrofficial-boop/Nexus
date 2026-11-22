import assert from "node:assert/strict";
import { createLogicRegistry } from "../scripts/core/logic-registry.js";
import { createLogicRuntime } from "../scripts/core/logic-runtime.js";
import { deleteLogicAsset, loadLogicLibrary, saveLogicAsset } from "../scripts/core/logic-library.js";

const registry = createLogicRegistry({ schemas: { rule: payload => typeof payload.expression === "string" } });
registry.register({ id: "nexus.core.rule.valid", type: "rule", origin: "core", payload: { expression: "@level >= 2" } });
registry.register({ id: "nexus.core.flow.level-up", type: "flow", origin: "core", dependencies: [{ id: "nexus.core.rule.valid", type: "rule" }], payload: { conditions: [{ expression: "@actor.level >= 2" }], actions: [{ id: "a1", type: "record", config: { value: 1 } }] } });
registry.register({ id: "nexus.core.behavior.level", type: "behavior", origin: "core", payload: { event: "level-up", flowId: "nexus.core.flow.level-up" } });
assert.equal(registry.validateDependencies().valid, true);
assert.equal(registry.resolve("nexus.core.rule.valid", "rule").payload.expression, "@level >= 2");
assert.throws(() => registry.remove("nexus.core.rule.valid"), /dependentes/);

const runtime = createLogicRuntime({
  registry,
  canExecute: ({ permissions }) => permissions.length === 0,
  resolveProperty: (path, context) => path === "actor.level" ? context.actor.level : undefined
});
let calls = 0;
runtime.registerAction({ type: "record", execute: ({ action }) => { calls++; return action.config.value; } });
const dispatched = await runtime.dispatch("level-up", { actor: { level: 3 } });
assert.equal(dispatched.length, 1);
assert.equal(dispatched[0].result.status, "success");
assert.equal(calls, 1);
const skipped = await runtime.runFlow({ conditions: [{ expression: "@actor.level > 5" }], actions: [] }, { actor: { level: 3 } });
assert.equal(skipped.status, "skipped");
const lockedRuntime = createLogicRuntime({ registry });
lockedRuntime.registerFunction({ id: "nexus.test.function.write", effects: ["write"], execute: () => true });
await assert.rejects(() => lockedRuntime.invokeFunction("nexus.test.function.write"), /Permissão insuficiente/);
lockedRuntime.setPermissionResolver(async ({ effects }) => effects.includes("write"));
assert.equal(await lockedRuntime.invokeFunction("nexus.test.function.write"), true);
assert.throws(() => runtime.registerAction({ type: "invalid" }), /Executor/);

const cyclic = createLogicRegistry();
cyclic.register({ id: "nexus.test.rule.a", type: "rule", dependencies: ["nexus.test.rule.b"], payload: {} });
cyclic.register({ id: "nexus.test.rule.b", type: "rule", dependencies: ["nexus.test.rule.a"], payload: {} });
assert.equal(cyclic.validateDependencies().errors[0].code, "dependency-cycle");
const withDependent = createLogicRegistry();
withDependent.register({ id: "nexus.test.rule.a", type: "rule", dependencies: ["nexus.test.rule.b"], payload: {} });
withDependent.register({ id: "nexus.test.rule.b", type: "rule", dependencies: ["nexus.test.rule.a"], payload: {} });
withDependent.register({ id: "nexus.test.rule.c", type: "rule", dependencies: ["nexus.test.rule.a"], payload: {} });
const cycleReport = withDependent.validateDependencies();
assert.deepEqual(new Set(cycleReport.cyclic), new Set(["nexus.test.rule.a", "nexus.test.rule.b"]));
assert.deepEqual(cycleReport.blockedByCycle, ["nexus.test.rule.c"]);
const libraryState = Object.create(null);
const libraryUser = {
  getFlag(_scope, key) { return libraryState[key]; },
  async setFlag(_scope, key, value) { libraryState[key] = structuredClone(value); }
};
const saved = await saveLogicAsset(libraryUser, {
  id: "nexus.personal.rule.double",
  type: "rule",
  namespace: "nexus.personal",
  name: "Regra dupla",
  payload: { expression: "@actor.level * 2" }
});
assert.equal(saved.id, "nexus.personal.rule.double");
await saveLogicAsset(libraryUser, {
  id: "nexus.personal.property.focus",
  type: "property",
  namespace: "nexus.personal",
  name: "Foco",
  payload: { path: "system.custom.focus", valueType: "number" }
});
await saveLogicAsset(libraryUser, {
  id: "nexus.personal.function.twice",
  type: "function",
  namespace: "nexus.personal",
  name: "Dobro",
  payload: { operation: "multiply", factor: 2 }
});
assert.equal(libraryState.libraryStore.collections.properties[0].id, "nexus.personal.property.focus");
assert.equal(libraryState.libraryStore.collections.functions[0].id, "nexus.personal.function.twice");
const loadedRegistry = createLogicRegistry();
const loadReport = loadLogicLibrary(libraryUser, loadedRegistry);
assert.equal(loadReport.errors.length, 0);
assert.equal(loadedRegistry.get(saved.id).payload.expression, "@actor.level * 2");
assert.equal((await deleteLogicAsset(libraryUser, loadedRegistry, saved.id)).removed, true);
assert.equal(loadedRegistry.get(saved.id), null);
const legacyUserState = { interactionLibrary: [{ id: "flow-old", name: "Fluxo legado", flow: { actions: [{ id: "old-action", type: "record" }] } }] };
const legacyUser = { getFlag(_scope, key) { return legacyUserState[key]; }, async setFlag(_scope, key, value) { legacyUserState[key] = structuredClone(value); } };
const legacyRegistry = createLogicRegistry();
const legacyReport = loadLogicLibrary(legacyUser, legacyRegistry);
assert.equal(legacyReport.migratedPreview, true);
assert.equal(legacyRegistry.get("flow-old").payload.actions[0].id, "old-action");

console.log("NEXUS logic infrastructure: testes aprovados.");

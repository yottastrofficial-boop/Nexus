import test from "node:test";
import assert from "node:assert/strict";
import { createLogicRegistry } from "../scripts/core/logic-registry.js";
import { createLogicRuntime } from "../scripts/core/logic-runtime.js";
import { createNexusLogicSchemas } from "../scripts/core/logic-schemas.js";
import {
  FOUNDRY_LOGIC_EVENTS,
  createFoundryLogicEventBridge,
  createFoundryLogicPermissionResolver,
  installFoundryLogicIntegration
} from "../scripts/core/foundry-logic-integration.js";

function createHooks() {
  const listeners = new Map();
  return {
    listeners,
    on(name, callback) {
      const entries = listeners.get(name) ?? [];
      entries.push(callback);
      listeners.set(name, entries);
      return callback;
    },
    off(name, callback) {
      listeners.set(name, (listeners.get(name) ?? []).filter(item => item !== callback));
    },
    emit(name, ...args) {
      for (const callback of [...(listeners.get(name) ?? [])]) callback(...args);
    }
  };
}

const flush = () => new Promise(resolve => setImmediate(resolve));

test("eventos de ciclo de vida são reconhecidos nos schemas de Comportamento", () => {
  const registry = createLogicRegistry({ schemas: createNexusLogicSchemas() });
  for (const event of FOUNDRY_LOGIC_EVENTS) {
    assert.equal(registry.validateAsset({
      id: "nexus.test.behavior." + event.replaceAll(".", "-"),
      type: "behavior",
      payload: { event, flow: { actions: [] } }
    }).valid, true, event);
  }
  assert.equal(registry.validateAsset({
    id: "nexus.test.behavior.invalid",
    type: "behavior",
    payload: { event: "actor.execute-arbitrary" }
  }).valid, false);
});

test("bridge despacha evento Foundry com documento, Actor e alterações", async () => {
  const hooks = createHooks();
  const calls = [];
  const runtime = { dispatch: async (event, context) => { calls.push({ event, context }); return []; } };
  const gameRef = { user: { id: "user-1", isGM: true } };
  const bridge = createFoundryLogicEventBridge({ hooks, runtime, gameRef, logger: { warn() {}, error() {} } });
  assert.equal(bridge.install(), true);
  assert.equal(bridge.install(), false);
  assert.equal(bridge.hookCount, 15);

  const actor = {
    documentName: "Actor",
    uuid: "Actor.actor-1",
    testUserPermission: () => true,
    system: { resources: { pv: { value: 3 } } }
  };
  hooks.emit("updateActor", actor, { "system.resources.pv.value": 2 }, { diff: true }, "user-2");
  await flush();

  assert.equal(calls.length, 1);
  assert.equal(calls[0].event, "actor.updated");
  assert.equal(calls[0].context.actor, actor);
  assert.equal(calls[0].context.document, actor);
  assert.equal(calls[0].context.system, actor.system);
  assert.deepEqual(calls[0].context.changes, { "system.resources.pv.value": 2 });
  assert.equal(calls[0].context.userId, "user-2");
  assert.equal(calls[0].context.currentUserId, "user-1");
  assert.equal(bridge.uninstall(), true);
  assert.equal(bridge.installed, false);
  assert.equal(hooks.listeners.get("updateActor").length, 0);
});

test("bridge impede reentrada do mesmo evento/documento enquanto o despacho está ativo", async () => {
  const hooks = createHooks();
  let calls = 0;
  let release;
  const gate = new Promise(resolve => { release = resolve; });
  const runtime = { dispatch: async () => { calls++; await gate; } };
  const bridge = createFoundryLogicEventBridge({ hooks, runtime, gameRef: { user: { id: "gm-1", isGM: true } }, logger: { warn() {}, error() {} } });
  bridge.install();
  const actor = { documentName: "Actor", uuid: "Actor.recursive" };
  hooks.emit("updateActor", actor, {}, {}, "u1");
  await flush();
  hooks.emit("updateActor", actor, {}, {}, "u1");
  await flush();
  assert.equal(calls, 1);
  release();
  await flush();
  bridge.uninstall();
});

test("executor nexus.actor.update exige propriedade OWNER e altera apenas system.*", async () => {
  const registry = createLogicRegistry({ schemas: createNexusLogicSchemas() });
  registry.register({
    id: "nexus.test.flow.update-pv",
    type: "flow",
    payload: { conditions: [{ expression: "@system.resources.pv.value > 0" }], actions: [{ id: "set-pv", type: "nexus.actor.update", config: { path: "system.resources.pv.value", value: 1 } }] }
  });
  registry.register({
    id: "nexus.test.behavior.actor-update",
    type: "behavior",
    payload: { event: "actor.updated", flowId: "nexus.test.flow.update-pv" }
  });
  const runtime = createLogicRuntime({ registry });
  const hooks = createHooks();
  const user = { id: "gm-1", isGM: true };
  const gameRef = { user, users: { get: id => id === user.id ? user : null } };
  const constRef = { DOCUMENT_OWNERSHIP_LEVELS: { OBSERVER: 2, OWNER: 3 } };
  const integration = installFoundryLogicIntegration({ hooks, runtime, gameRef, constRef, logger: { warn() {}, error() {} } });
  const updates = [];
  const actor = {
    documentName: "Actor",
    uuid: "Actor.pc-1",
    system: { resources: { pv: { value: 2 } } },
    testUserPermission: (_user, level) => level <= 3,
    async update(changes) { updates.push(changes); }
  };

  hooks.emit("updateActor", actor, { name: "Novo nome" }, {}, user.id);
  await flush();
  await flush();
  assert.deepEqual(updates, [{ "system.resources.pv.value": 1 }]);
  assert.equal(runtime.actionTypes.includes("nexus.actor.update"), true);
  integration.uninstall();
});

test("executor nega escrita sem OWNER e rejeita caminhos fora de system", async () => {
  const registry = createLogicRegistry({ schemas: createNexusLogicSchemas() });
  registry.register({
    id: "nexus.test.flow.denied",
    type: "flow",
    payload: { actions: [{ id: "set-name", type: "nexus.actor.update", config: { path: "system.identity.alias", value: "Alterado" } }] }
  });
  registry.register({
    id: "nexus.test.behavior.denied",
    type: "behavior",
    payload: { event: "actor.updated", flowId: "nexus.test.flow.denied" }
  });
  const runtime = createLogicRuntime({ registry });
  const hooks = createHooks();
  const user = { id: "player-2", isGM: false };
  const integration = installFoundryLogicIntegration({
    hooks, runtime, gameRef: { user },
    constRef: { DOCUMENT_OWNERSHIP_LEVELS: { OBSERVER: 2, OWNER: 3 } },
    logger: { warn() {}, error() {} }
  });
  const updates = [];
  const actor = {
    documentName: "Actor",
    uuid: "Actor.not-owner",
    testUserPermission: (_user, level) => level === 2,
    async update(changes) { updates.push(changes); }
  };
  const result = await runtime.dispatch("actor.updated", { actor, document: actor });
  assert.equal(result[0].result.status, "failed");
  assert.equal(updates.length, 0);
  integration.uninstall();
});

test("resolver de permissões falha fechado para permissões desconhecidas", async () => {
  const resolver = createFoundryLogicPermissionResolver({
    gameRef: { user: { id: "u1", isGM: false } },
    constRef: { DOCUMENT_OWNERSHIP_LEVELS: { OBSERVER: 2, OWNER: 3 } }
  });
  const actor = { documentName: "Actor", testUserPermission: () => true };
  assert.equal(await resolver({ permissions: ["actor:update"], effects: ["write"], context: { actor } }), true);
  assert.equal(await resolver({ permissions: ["custom:unknown"], effects: ["read"], context: { actor } }), false);
  assert.equal(await resolver({ permissions: ["actor:update"], effects: ["write"], context: { actor: { documentName: "Actor", testUserPermission: () => false } } }), false);
});

console.log("NEXUS Foundry logic integration: tests passed.");

test("bridge não executa efeitos nos jogadores nem em GMs que não são o GM ativo", async () => {
  const hooks = createHooks();
  let calls = 0;
  const runtime = { dispatch: async () => { calls++; } };
  const playerBridge = createFoundryLogicEventBridge({
    hooks, runtime, gameRef: { user: { id: "player", isGM: false } },
    logger: { warn() {}, error() {} }
  });
  playerBridge.install();
  const actor = { documentName: "Actor", uuid: "Actor.authority" };
  hooks.emit("updateActor", actor, {}, {}, "player");
  await flush();
  assert.equal(calls, 0);
  playerBridge.uninstall();

  const secondaryGM = createFoundryLogicEventBridge({
    hooks, runtime,
    gameRef: { user: { id: "gm-secondary", isGM: true }, users: { activeGM: { id: "gm-primary" } } },
    logger: { warn() {}, error() {} }
  });
  secondaryGM.install();
  hooks.emit("updateActor", actor, {}, {}, "gm-secondary");
  await flush();
  assert.equal(calls, 0);
  secondaryGM.uninstall();
});

test("runFlow preserva enabled e permissões quando recebe um ativo do Registry", async () => {
  const registry = createLogicRegistry({ schemas: createNexusLogicSchemas() });
  registry.register({
    id: "nexus.test.flow.disabled",
    type: "flow",
    enabled: false,
    payload: { actions: [{ id: "disabled", type: "test.noop", config: {} }] }
  });
  registry.register({
    id: "nexus.test.flow.permission",
    type: "flow",
    permissions: ["actor:update"],
    payload: { actions: [{ id: "protected", type: "test.noop", config: {} }] }
  });
  registry.register({
    id: "nexus.test.behavior.permission",
    type: "behavior",
    payload: { event: "actor.updated", flowId: "nexus.test.flow.permission" }
  });
  const runtime = createLogicRuntime({ registry });
  let calls = 0;
  runtime.registerAction({ type: "test.noop", effects: ["pure"], execute: () => { calls++; return true; } });
  runtime.setPermissionResolver(async ({ permissions, effects }) => {
    if (permissions.includes("actor:update")) return false;
    return effects.every(effect => ["pure", "read"].includes(effect));
  });

  const disabled = await runtime.runFlow(registry.resolve("nexus.test.flow.disabled", "flow"));
  assert.equal(disabled.status, "disabled");
  const protectedResult = await runtime.runFlow(registry.resolve("nexus.test.flow.permission", "flow"), {});
  assert.equal(protectedResult.status, "failed");
  const dispatched = await runtime.dispatch("actor.updated", {});
  assert.equal(dispatched[0].result.status, "failed");
  assert.equal(calls, 0);
});

test("permissões usam o usuário que originou o Hook, não os privilégios do GM executor", async () => {
  const gm = { id: "gm-1", isGM: true };
  const player = { id: "player-1", isGM: false };
  const gameRef = { user: gm, users: { get: id => id === player.id ? player : (id === gm.id ? gm : null) } };
  const resolver = createFoundryLogicPermissionResolver({
    gameRef,
    constRef: { DOCUMENT_OWNERSHIP_LEVELS: { OBSERVER: 2, OWNER: 3 } }
  });
  const actor = {
    documentName: "Actor",
    testUserPermission: (user, level) => user.id === "player-1" && level === 2
  };
  assert.equal(await resolver({
    permissions: ["actor:update"], effects: ["write"],
    context: { actor, userId: "player-1" }
  }), false);
  assert.equal(await resolver({
    permissions: ["actor:update"], effects: ["write"],
    context: { actor, userId: "gm-1" }
  }), true);
});

test("executor rejeita caminhos fora de system mesmo sem schema prévio", async () => {
  const registry = createLogicRegistry();
  const runtime = createLogicRuntime({ registry });
  const hooks = createHooks();
  const user = { id: "gm-path", isGM: true };
  const integration = installFoundryLogicIntegration({
    hooks, runtime, gameRef: { user, users: { get: id => id === user.id ? user : null } },
    constRef: { DOCUMENT_OWNERSHIP_LEVELS: { OBSERVER: 2, OWNER: 3 } },
    logger: { warn() {}, error() {} }
  });
  const updates = [];
  const actor = {
    documentName: "Actor",
    uuid: "Actor.invalid-path",
    async update(changes) { updates.push(changes); }
  };
  const result = await runtime.runFlow({
    actions: [{ id: "bad-path", type: "nexus.actor.update", config: { path: "name", value: "Não permitido" } }]
  }, { actor, document: actor });
  assert.equal(result.status, "failed");
  assert.match(result.errors[0].message, /Caminho de atualização não permitido/);
  assert.equal(updates.length, 0);
  integration.uninstall();
});

test("simulação avalia condições e permissões sem executar nenhum executor", async () => {
  const registry = createLogicRegistry({ schemas: createNexusLogicSchemas() });
  registry.register({
    id: "nexus.test.flow.simulation",
    type: "flow",
    payload: {
      conditions: [{ expression: "@system.resources.pv.value > 0" }],
      actions: [
        { id: "preview", type: "test.preview", config: {} },
        { id: "write", type: "test.write", config: {} },
        { id: "missing", type: "test.missing", config: {} }
      ]
    }
  });
  const runtime = createLogicRuntime({ registry });
  let executions = 0;
  runtime.registerAction({ type: "test.preview", effects: ["pure"], execute: () => { executions++; } });
  runtime.registerAction({ type: "test.write", effects: ["write"], execute: () => { executions++; } });
  runtime.setPermissionResolver(async ({ effects }) => effects.every(effect => effect === "pure"));
  const asset = registry.resolve("nexus.test.flow.simulation", "flow");

  const preview = await runtime.simulateFlow(asset, { system: { resources: { pv: { value: 3 } } } });
  assert.equal(preview.status, "blocked");
  assert.equal(preview.executed, false);
  assert.deepEqual(preview.actions.map(item => item.status), ["ready", "denied", "unregistered"]);
  assert.equal(executions, 0);

  const skipped = await runtime.simulateFlow(asset, { system: { resources: { pv: { value: 0 } } } });
  assert.equal(skipped.status, "skipped");
  assert.equal(skipped.reason, "conditions");
  const invalid = await runtime.simulateFlow({
    ...asset,
    payload: { actions: [{ id: "bad", type: "nexus.actor.update", config: { path: "name", value: "unsafe" } }] }
  }, { system: { resources: { pv: { value: 1 } } } });
  assert.equal(invalid.status, "invalid");
  assert.equal(invalid.executed, false);
  assert.equal(executions, 0);
});

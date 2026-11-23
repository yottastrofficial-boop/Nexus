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

test("runtime valida fluxos transitórios antes de executar ou simular", async () => {
  const registry = createLogicRegistry({ schemas: createNexusLogicSchemas() });
  const runtime = createLogicRuntime({ registry });
  const invalidFlow = {
    actions: [{ id: "unsafe", type: "nexus.actor.update", config: { path: "ownership.default", value: 3 } }]
  };
  await assert.rejects(() => runtime.runFlow(invalidFlow), /config.path/);
  const preview = await runtime.simulateFlow(invalidFlow);
  assert.equal(preview.status, "invalid");
  assert.equal(preview.executed, false);
});


test("runtime percorre ramificações do grafo e simula sem executar ações", async () => {
  const registry = createLogicRegistry({ schemas: createNexusLogicSchemas() });
  const graph = {
    entryNodeId: "start-node",
    nodes: [
      { id: "start-node", type: "start" },
      { id: "check-node", type: "condition", expression: "@system.resources.pv.value > 0" },
      { id: "yes-action", type: "action", action: { id: "mark", type: "test.graph.mark", config: { value: "yes" } } },
      { id: "yes-end", type: "end" },
      { id: "no-end", type: "end" }
    ],
    edges: [
      { from: "start-node", to: "check-node", when: "next" },
      { from: "check-node", to: "yes-action", when: "true" },
      { from: "check-node", to: "no-end", when: "false" },
      { from: "yes-action", to: "yes-end", when: "next" }
    ]
  };
  const asset = registry.register({ id: "nexus.test.flow.graph-runtime", type: "flow", payload: { graph } });
  const runtime = createLogicRuntime({ registry });
  const calls = [];
  runtime.registerAction({ type: "test.graph.mark", effects: ["pure"], execute: ({ config }) => { calls.push(config.value); return config.value; } });

  const yesPreview = await runtime.simulateFlow(asset, { system: { resources: { pv: { value: 4 } } } });
  assert.equal(yesPreview.status, "ready");
  assert.equal(yesPreview.executed, false);
  assert.deepEqual(yesPreview.trace.map(item => item.nodeId), ["start-node", "check-node", "yes-action", "yes-end"]);
  assert.equal(yesPreview.actions.length, 1);
  assert.equal(calls.length, 0);

  const noPreview = await runtime.simulateFlow(asset, { system: { resources: { pv: { value: 0 } } } });
  assert.equal(noPreview.status, "ready");
  assert.deepEqual(noPreview.trace.map(item => item.nodeId), ["start-node", "check-node", "no-end"]);
  assert.equal(noPreview.actions.length, 0);

  const executed = await runtime.runFlow(asset, { system: { resources: { pv: { value: 4 } } } });
  assert.equal(executed.status, "success");
  assert.deepEqual(calls, ["yes"]);
  const skippedBranch = await runtime.runFlow(asset, { system: { resources: { pv: { value: 0 } } } });
  assert.equal(skippedBranch.status, "success");
  assert.deepEqual(calls, ["yes"]);
});

test("executor nexus.actor.adjust altera propriedade numérica genérica e respeita limites", async () => {
  const registry = createLogicRegistry({ schemas: createNexusLogicSchemas() });
  const runtime = createLogicRuntime({ registry });
  const hooks = createHooks();
  const user = { id: "gm-adjust", isGM: true };
  const integration = installFoundryLogicIntegration({
    hooks, runtime,
    gameRef: { user, users: { get: id => id === user.id ? user : null } },
    constRef: { DOCUMENT_OWNERSHIP_LEVELS: { OBSERVER: 2, OWNER: 3 } },
    logger: { warn() {}, error() {} }
  });
  const updates = [];
  const actor = {
    documentName: "Actor",
    uuid: "Actor.adjust-test",
    system: Object.create({ customModule: { energy: 4 } }),
    async update(changes) { updates.push(changes); },
    testUserPermission: (_user, level) => level <= 3
  };
  const decreased = await runtime.runFlow({
    actions: [{
      id: "decrease-energy", type: "nexus.actor.adjust",
      config: { path: "system.customModule.energy", delta: -10, min: 0, max: 12 }
    }]
  }, { actor, document: actor });
  assert.equal(decreased.status, "success");
  assert.deepEqual(updates[0], { "system.customModule.energy": 0 });

  const increased = await runtime.runFlow({
    actions: [{
      id: "increase-energy", type: "nexus.actor.adjust",
      config: { path: "system.customModule.energy", delta: 20, min: 0, max: 12 }
    }]
  }, { actor, document: actor });
  assert.equal(increased.status, "success");
  assert.deepEqual(updates[1], { "system.customModule.energy": 12 });

  const graphAdjusted = await runtime.runFlow({
    graph: {
      entryNodeId: "start",
      nodes: [
        { id: "start", type: "start" },
        { id: "adjust", type: "action", action: {
          id: "adjust-energy", type: "nexus.actor.adjust",
          config: { path: "system.customModule.energy", delta: -2, min: 0 }
        } },
        { id: "end", type: "end" }
      ],
      edges: [
        { from: "start", to: "adjust", when: "next" },
        { from: "adjust", to: "end", when: "next" }
      ]
    }
  }, { actor, document: actor });
  assert.equal(graphAdjusted.status, "success");
  assert.deepEqual(updates[2], { "system.customModule.energy": 2 });

  const invalidTarget = await runtime.runFlow({
    actions: [{
      id: "invalid-target", type: "nexus.actor.adjust",
      config: { path: "system.customModule.label", delta: 1 }
    }]
  }, { actor, document: actor });
  assert.equal(invalidTarget.status, "failed");
  assert.match(invalidTarget.errors[0].message, /não contém um número válido/);
  integration.uninstall();
});

test("schemas visuais de executores são declarativos, isolados e validados em execução", async () => {
  const registry = createLogicRegistry({ schemas: createNexusLogicSchemas() });
  const runtime = createLogicRuntime({ registry });
  const calls = [];
  runtime.registerAction({
    type: "test.configured",
    effects: ["pure"],
    configSchema: { fields: [
      { key: "target", label: "Alvo", type: "text", required: true },
      { key: "amount", label: "Quantidade", type: "number", required: true, min: 0, max: 10 },
      { key: "mode", label: "Modo", type: "select", required: true, options: [
        { value: "add", label: "Adicionar" }, { value: "subtract", label: "Subtrair" }
      ] },
      { key: "enabled", label: "Ativo", type: "checkbox" },
      { key: "note", label: "Observação", type: "textarea" },
      { key: "metadata", label: "Metadados", type: "json", required: true },
      { key: "defaults", label: "Padrões", type: "json", defaultValue: { nested: { enabled: true } } },
      { key: "requiredFlag", label: "Confirmação", type: "checkbox", required: true, defaultValue: false }
    ] },
    execute: ({ config }) => { calls.push(config); return true; }
  });

  const publicValidation = runtime.validateActionConfig("test.configured", {
    target: "PV", amount: 3, mode: "add", metadata: null
  });
  assert.deepEqual(publicValidation, { registered: true, hasSchema: true, valid: true, errors: [] });
  assert.deepEqual(runtime.validateActionConfig("test.configured", {
    target: "PV", amount: 30, mode: "add", metadata: null
  }).errors, ["Quantidade está fora dos limites permitidos."]);
  assert.deepEqual(runtime.validateActionConfig("test.legacy", {}).valid, true);
  assert.equal(runtime.validateActionConfig("test.legacy", {}).hasSchema, false);

  assert.throws(() => runtime.registerAction({
    type: "test.bad-default",
    execute() {},
    configSchema: { fields: [{ key: "amount", label: "Quantidade", type: "number", defaultValue: "inválido" }] }
  }), /Valor padrão inválido/);

  const exposed = runtime.getActionDefinition("test.configured");
  assert.equal(exposed.configSchema.fields[0].label, "Alvo");
  exposed.configSchema.fields[0].label = "Alterado externamente";
  exposed.configSchema.fields[6].defaultValue.nested.enabled = false;
  const isolated = runtime.getActionDefinition("test.configured").configSchema;
  assert.equal(isolated.fields[0].label, "Alvo");
  assert.equal(isolated.fields[6].defaultValue.nested.enabled, true);
  assert.equal(isolated.fields[7].defaultValue, false);

  const invalid = await runtime.simulateFlow({
    actions: [{ id: "configured", type: "test.configured", config: { target: "PV", amount: 20, mode: "multiply" } }]
  });
  assert.equal(invalid.status, "invalid");
  assert.equal(invalid.executed, false);
  assert.equal(invalid.actions[0].status, "invalid-config");
  assert.equal(calls.length, 0);

  const storedConfig = { target: "PV", amount: 3, mode: "add", metadata: null };
  const missing = await runtime.runFlow({
    actions: [{ id: "configured", type: "test.configured", config: storedConfig }]
  });
  assert.equal(missing.status, "success");
  assert.equal(calls.length, 1);
  assert.deepEqual(calls[0].defaults, { nested: { enabled: true } });
  assert.equal(calls[0].requiredFlag, false);
  assert.equal(Object.prototype.hasOwnProperty.call(storedConfig, "defaults"), false);
  assert.equal(Object.prototype.hasOwnProperty.call(storedConfig, "requiredFlag"), false);

  const graphInvalid = await runtime.simulateFlow({
    graph: {
      entryNodeId: "start",
      nodes: [
        { id: "start", type: "start" },
        { id: "action", type: "action", action: { id: "configured", type: "test.configured", config: { target: "PV", amount: -1, mode: "add" } } },
        { id: "end", type: "end" }
      ],
      edges: [
        { from: "start", to: "action", when: "next" },
        { from: "action", to: "end", when: "next" }
      ]
    }
  });
  assert.equal(graphInvalid.status, "invalid");
  assert.equal(graphInvalid.actions[0].status, "invalid-config");
  assert.equal(calls.length, 1);

  const graphDefaulted = await runtime.runFlow({
    graph: {
      entryNodeId: "start",
      nodes: [
        { id: "start", type: "start" },
        { id: "action", type: "action", action: {
          id: "configured-graph", type: "test.configured",
          config: { target: "PM", amount: 4, mode: "subtract", metadata: null }
        } },
        { id: "end", type: "end" }
      ],
      edges: [
        { from: "start", to: "action", when: "next" },
        { from: "action", to: "end", when: "next" }
      ]
    }
  });
  assert.equal(graphDefaulted.status, "success");
  assert.deepEqual(calls[1].defaults, { nested: { enabled: true } });
  assert.equal(calls[1].requiredFlag, false);

  assert.throws(() => runtime.registerAction({
    type: "test.bad-schema",
    execute() {},
    configSchema: { fields: [
      { key: "__proto__", label: "Inseguro", type: "text" }
    ] }
  }), /Chave visual inválida/);
  assert.throws(() => runtime.registerAction({
    type: "test.duplicate-fields",
    execute() {},
    configSchema: { fields: [
      { key: "value", label: "Um", type: "text" },
      { key: "value", label: "Dois", type: "text" }
    ] }
  }), /duplicada/);
});

test("executores Core publicam schemas visuais sem mudar os contratos de execução", () => {
  const registry = createLogicRegistry({ schemas: createNexusLogicSchemas() });
  const runtime = createLogicRuntime({ registry });
  const hooks = createHooks();
  const user = { id: "schema-gm", isGM: true };
  const integration = installFoundryLogicIntegration({
    hooks, runtime,
    gameRef: { user, users: { get: id => id === user.id ? user : null } },
    constRef: { DOCUMENT_OWNERSHIP_LEVELS: { OBSERVER: 2, OWNER: 3 } },
    logger: { warn() {}, error() {} }
  });
  const update = runtime.getActionDefinition("nexus.actor.update");
  const adjust = runtime.getActionDefinition("nexus.actor.adjust");
  assert.deepEqual(update.configSchema.fields.map(field => field.key), ["path", "value"]);
  assert.deepEqual(adjust.configSchema.fields.map(field => field.key), ["path", "delta", "min", "max"]);
  assert.ok(runtime.actionTypes.includes("nexus.actor.update"));
  assert.ok(runtime.actionTypes.includes("nexus.actor.adjust"));
  integration.uninstall();
});

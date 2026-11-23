import test from "node:test";
import assert from "node:assert/strict";
import { createLogicRegistry } from "../scripts/core/logic-registry.js";
import { createNexusLogicSchemas } from "../scripts/core/logic-schemas.js";

const registry = createLogicRegistry({ schemas: createNexusLogicSchemas() });
const invalidPreview = registry.validateAsset({ id: "nexus.personal.rule.preview", type: "rule", payload: { expression: "1 + )" } });
assert.equal(invalidPreview.valid, false);
assert.equal(registry.size, 0, "A validação de prévia não pode registrar nem persistir ativos.");

test("valida propriedades sem rejeitar zero, false ou string vazia", () => {
  const property = registry.register({
    id: "nexus.personal.property.enabled",
    type: "property",
    payload: { path: "system.flags.enabled", valueType: "boolean", defaultValue: false }
  });
  assert.equal(property.payload.defaultValue, false);
  assert.throws(() => registry.register({
    id: "nexus.personal.property.unsafe",
    type: "property",
    payload: { path: "system.__proto__.polluted", valueType: "string" }
  }), /caminho inválido/);
});

test("valida expressões lógicas usando o parser seguro do Core", () => {
  assert.doesNotThrow(() => registry.register({
    id: "nexus.personal.rule.threshold",
    type: "rule",
    payload: { expression: "@system.resources.pv.value > 0 AND true", resultType: "boolean" }
  }));
  assert.throws(() => registry.register({
    id: "nexus.personal.rule.invalid",
    type: "rule",
    payload: { expression: "1 + )" }
  }), /expressão inválida/);
  assert.doesNotThrow(() => registry.register({
    id: "nexus.personal.rule.numeric",
    type: "rule",
    payload: { expression: "@system.attributes.corpo.value + 2", resultType: "number" }
  }), "Regras também podem produzir cálculos numéricos, não apenas booleanos.");
});

test("valida gatilhos, condições e ações de fluxos sem executar payloads", () => {
  assert.doesNotThrow(() => registry.register({
    id: "nexus.personal.flow.turn-start",
    type: "flow",
    payload: {
      triggers: [{ id: "t1", event: "interact" }],
      conditions: [{ id: "c1", expression: "@system.resources.pv.value > 0" }],
      actions: [{ id: "a1", type: "nexus.update", config: { path: "system.resources.pv.value", value: 1 } }],
      conditionJoin: "all",
      execution: { onError: "stop" }
    }
  }));
  assert.throws(() => registry.register({
    id: "nexus.personal.flow.bad",
    type: "flow",
    payload: { triggers: [{ event: "not-an-event" }] }
  }), /event não é reconhecido/);
  assert.throws(() => registry.register({
    id: "nexus.personal.flow.script",
    type: "flow",
    payload: { actions: [{ type: "run", config: { script: "alert(1)" } }] }
  }), /código executável não é aceito/);
});

test("comportamentos e funções guardam referências, não código executável", () => {
  assert.doesNotThrow(() => registry.register({
    id: "nexus.personal.behavior.on-click",
    type: "behavior",
    payload: { events: ["click"], flowId: "nexus.personal.flow.turn-start" }
  }));
  assert.doesNotThrow(() => registry.register({
    id: "nexus.personal.function.sum",
    type: "function",
    payload: { functionId: "nexus.core.sum", signature: "sum(a:number,b:number)", returnType: "number" }
  }));
  assert.throws(() => registry.register({
    id: "nexus.personal.function.unsafe",
    type: "function",
    payload: { functionId: "nexus.core.unsafe", functionBody: "return 1" }
  }), /código executável não é aceito/);
});

console.log("NEXUS logic schemas: tests passed.");

test("valida configuração do executor seguro de atualização de Actor", () => {
  assert.equal(registry.validateAsset({
    id: "nexus.personal.flow.safe-update",
    type: "flow",
    payload: { actions: [{ type: "nexus.actor.update", config: { path: "system.resources.pv.value", value: 2 } }] }
  }).valid, true);
  assert.equal(registry.validateAsset({
    id: "nexus.personal.flow.unsafe-update",
    type: "flow",
    payload: { actions: [{ type: "nexus.actor.update", config: { path: "ownership.default", value: 3 } }] }
  }).valid, false);
  assert.equal(registry.validateAsset({
    id: "nexus.personal.flow.missing-value",
    type: "flow",
    payload: { actions: [{ type: "nexus.actor.update", config: { path: "system.resources.pv.value" } }] }
  }).valid, false);
});


test("valida grafo visual, ramificações obrigatórias e ausência de ciclos", () => {
  const graph = {
    entryNodeId: "start-node",
    nodes: [
      { id: "start-node", type: "start" },
      { id: "check-node", type: "condition", expression: "@system.resources.pv.value > 0" },
      { id: "yes-action", type: "action", action: { id: "set-flag", type: "nexus.actor.update", config: { path: "system.flags.active", value: true } } },
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
  const validGraph = registry.validateAsset({ id: "nexus.personal.flow.graph-valid", type: "flow", payload: { graph } });
  assert.equal(validGraph.valid, true, JSON.stringify(validGraph.errors));
  const missingBranch = structuredClone(graph);
  missingBranch.edges = missingBranch.edges.filter(edge => edge.when !== "false");
  assert.equal(registry.validateAsset({ id: "nexus.personal.flow.graph-branch", type: "flow", payload: { graph: missingBranch } }).valid, false);
  const cycle = structuredClone(graph);
  cycle.edges.push({ from: "yes-end", to: "check-node", when: "next" });
  assert.equal(registry.validateAsset({ id: "nexus.personal.flow.graph-cycle", type: "flow", payload: { graph: cycle } }).valid, false);
});

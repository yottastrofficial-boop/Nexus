import test from "node:test";
import assert from "node:assert/strict";
import { buildLogicEditorPayload } from "../scripts/library/logic-editors.js";

test("editor de propriedades preserva valores zero, false e string vazia", () => {
  const payload = buildLogicEditorPayload("property", {}, {
    path: "system.flags.enabled", valueType: "boolean", hasDefault: true, defaultValue: "false"
  });
  assert.equal(payload.defaultValue, false);
  const emptyString = buildLogicEditorPayload("property", {}, {
    path: "system.identity.alias", valueType: "string", hasDefault: true, defaultValue: '""'
  });
  assert.equal(emptyString.defaultValue, "");
});

test("editor de regra aceita expressões e tipos de retorno distintos", () => {
  const payload = buildLogicEditorPayload("rule", {}, { expression: "@system.attributes.corpo.value + 2", resultType: "number" });
  assert.equal(payload.resultType, "number");
  assert.equal(payload.expression, "@system.attributes.corpo.value + 2");
});

test("editor de fluxo exige listas JSON e preserva política de execução", () => {
  const payload = buildLogicEditorPayload("flow", { execution: { retries: 2 } }, {
    triggers: '[{"event":"interact"}]',
    conditions: '[{"expression":"true"}]',
    actions: '[{"type":"nexus.update","config":{}}]',
    conditionJoin: "any",
    onError: "continue"
  });
  assert.equal(payload.triggers.length, 1);
  assert.equal(payload.execution.retries, 2);
  assert.equal(payload.execution.onError, "continue");
  assert.throws(() => buildLogicEditorPayload("flow", {}, { triggers: "{}", conditions: "[]", actions: "[]" }), /lista JSON/);
});

test("editor de função registra apenas referência e assinatura, nunca código", () => {
  const payload = buildLogicEditorPayload("function", {}, {
    functionId: "nexus.core.sum", signature: "sum(a:number,b:number)", returnType: "number", arguments: "[]"
  });
  assert.equal(payload.functionId, "nexus.core.sum");
  assert.equal(Object.hasOwn(payload, "functionBody"), false);
});

console.log("NEXUS logic editors: tests passed.");

test("editor visual de fluxo salva gatilhos, condições e ações como dados estruturados", () => {
  const payload = buildLogicEditorPayload("flow", { execution: { retries: 1 } }, {
    triggers: [{ id: "trigger-keep", event: "click", modifiers: ["ctrl"] }],
    conditions: [{ id: "condition-keep", expression: "@system.resources.pv.value > 0" }],
    actions: [{ id: "action-keep", type: "nexus.update", enabled: true, config: { path: "system.resources.pv.value", value: 2 } }],
    conditionJoin: "all",
    onError: "stop"
  });
  assert.equal(payload.triggers[0].id, "trigger-keep");
  assert.deepEqual(payload.triggers[0].modifiers, ["ctrl"]);
  assert.equal(payload.conditions[0].expression, "@system.resources.pv.value > 0");
  assert.equal(payload.actions[0].config.value, 2);
  assert.equal(payload.execution.retries, 1);
});


test("editor preserva grafo de Fluxo e permite removê-lo explicitamente", () => {
  const graph = {
    entryNodeId: "start-node",
    nodes: [{ id: "start-node", type: "start" }, { id: "end-node", type: "end" }],
    edges: [{ from: "start-node", to: "end-node", when: "next" }]
  };
  const withGraph = buildLogicEditorPayload("flow", {}, {
    triggers: "[]", conditions: "[]", actions: "[]", conditionJoin: "all", onError: "stop", graph
  });
  assert.deepEqual(withGraph.graph, graph);
  const withoutGraph = buildLogicEditorPayload("flow", { graph }, {
    triggers: "[]", conditions: "[]", actions: "[]", conditionJoin: "all", onError: "stop", graph: null
  });
  assert.equal(Object.hasOwn(withoutGraph, "graph"), false);
});

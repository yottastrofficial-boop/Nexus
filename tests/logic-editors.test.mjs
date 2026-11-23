import test from "node:test";
import assert from "node:assert/strict";
import { buildLogicEditorPayload } from "../scripts/library/logic-editors.js";
import { layoutFlowGraph, getFlowGraphCanvasSize } from "../scripts/library/flow-graph-layout.js";
import { createLogicRegistry } from "../scripts/core/logic-registry.js";
import { createNexusLogicSchemas } from "../scripts/core/logic-schemas.js";

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

test("layout do grafo posiciona nós por camada e preserva posições manuais", () => {
  const graph = {
    entryNodeId: "start",
    nodes: [
      { id: "start", type: "start" },
      { id: "check", type: "condition" },
      { id: "yes", type: "action", x: 777, y: 333 },
      { id: "no", type: "end" }
    ],
    edges: [
      { from: "start", to: "check", when: "next" },
      { from: "check", to: "yes", when: "true" },
      { from: "check", to: "no", when: "false" }
    ]
  };
  const laidOut = layoutFlowGraph(graph);
  assert.deepEqual(graph.nodes[0], { id: "start", type: "start" }, "O layout não deve alterar o objeto de entrada.");
  assert.ok(laidOut.nodes[0].x < laidOut.nodes[1].x);
  assert.equal(laidOut.nodes[2].x, 777, "Posições manuais devem ser preservadas.");
  assert.equal(laidOut.nodes[2].y, 333);
  const arranged = layoutFlowGraph(laidOut, { force: true });
  assert.notEqual(arranged.nodes[2].x, 777, "Organizar automaticamente deve recalcular posições.");
  const size = getFlowGraphCanvasSize(arranged);
  assert.ok(size.width >= 720);
  assert.ok(size.height >= 360);
});

test("layout de grafo rejeita estrutura ausente sem lançar erro obscuro", () => {
  assert.throws(() => layoutFlowGraph(null), /Grafo inválido/);
});

test("schema rejeita coordenadas visuais fora dos limites do canvas", () => {
  const registry = createLogicRegistry({ schemas: createNexusLogicSchemas() });
  const bad = registry.validateAsset({
    id: "nexus.personal.flow.bad-layout",
    type: "flow",
    payload: { graph: {
      entryNodeId: "start-node",
      nodes: [
        { id: "start-node", type: "start", x: 9000, y: 0 },
        { id: "end-node", type: "end", x: 300, y: 0 }
      ],
      edges: [{ from: "start-node", to: "end-node", when: "next" }]
    } }
  });
  assert.equal(bad.valid, false);
  assert.ok(bad.errors.some(error => error.includes("coordenadas visuais inválidas")));
});

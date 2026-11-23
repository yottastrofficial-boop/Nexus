import test from "node:test";
import assert from "node:assert/strict";
import { createLogicRegistry } from "../scripts/core/logic-registry.js";
import { createNexusLogicSchemas } from "../scripts/core/logic-schemas.js";

const registry = createLogicRegistry({ schemas: createNexusLogicSchemas() });

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
  }), /expressão lógica válida/);
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
  }), /evento não é reconhecido/);
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

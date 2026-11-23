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

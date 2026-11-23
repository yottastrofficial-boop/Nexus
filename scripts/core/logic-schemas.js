import { evaluateNexusExpression } from "./formula-engine.js";
import { INTERACTION_EVENTS } from "./interactions.js";

const SAFE_PATH = /^[A-Za-z][A-Za-z0-9_-]*(?:\\.[A-Za-z][A-Za-z0-9_-]*)*$/;
const SAFE_ID = /^[a-z0-9][a-z0-9._:-]{2,159}$/i;
const VALUE_TYPES = new Set(["string", "number", "boolean", "array", "object", "formula"]);
const FORBIDDEN_CODE_KEYS = new Set(["javascript", "script", "sourceCode", "eval", "functionBody"]);

const isRecord = value => Boolean(value && typeof value === "object" && !Array.isArray(value) && Object.getPrototypeOf(value) === Object.prototype);
const hasOwn = (value, key) => Object.prototype.hasOwnProperty.call(value, key);
const result = errors => ({ valid: errors.length === 0, errors });
const checkExpression = (expression, label, errors) => {
  if (typeof expression !== "string" || !expression.trim() || expression.length > 500) {
    errors.push(label + ": expressão ausente ou acima de 500 caracteres.");
    return;
  }
  const value = evaluateNexusExpression(expression, () => 0, { maxLength: 500, maxTokens: 128, maxDepth: 16 });
  if (typeof value !== "boolean") errors.push(label + ": use uma expressão lógica válida que resulte em verdadeiro/falso.");
};
const checkNoExecutablePayload = (value, path, errors, depth = 0) => {
  if (depth > 20 || !value || typeof value !== "object") return;
  for (const [key, child] of Object.entries(value)) {
    if (FORBIDDEN_CODE_KEYS.has(key)) errors.push(path + "." + key + ": código executável não é aceito como payload.");
    if (isRecord(child) || Array.isArray(child)) checkNoExecutablePayload(child, path + "." + key, errors, depth + 1);
  }
};

function validateProperty(payload) {
  const errors = [];
  if (payload.path !== undefined && (typeof payload.path !== "string" || !SAFE_PATH.test(payload.path))) errors.push("property.path: caminho inválido.");
  if (payload.key !== undefined && (typeof payload.key !== "string" || !SAFE_ID.test(payload.key))) errors.push("property.key: chave inválida.");
  if (payload.valueType !== undefined && !VALUE_TYPES.has(String(payload.valueType).toLowerCase())) errors.push("property.valueType: tipo não suportado.");
  if (hasOwn(payload, "defaultValue") && payload.valueType) {
    const type = String(payload.valueType).toLowerCase();
    const value = payload.defaultValue;
    const valid = type === "formula" ? typeof value === "string"
      : type === "array" ? Array.isArray(value)
      : type === "object" ? isRecord(value)
      : typeof value === type;
    if (!valid) errors.push("property.defaultValue: valor incompatível com valueType.");
  }
  checkNoExecutablePayload(payload, "property", errors);
  return result(errors);
}

function validateRule(payload) {
  const errors = [];
  const expression = payload.expression ?? payload.formula;
  if (expression !== undefined) checkExpression(expression, "rule.expression", errors);
  if (payload.resultType !== undefined && !["boolean", "number", "string"].includes(String(payload.resultType))) errors.push("rule.resultType: tipo de resultado inválido.");
  checkNoExecutablePayload(payload, "rule", errors);
  return result(errors);
}

function validateFlow(payload) {
  const errors = [];
  if (payload.triggers !== undefined && !Array.isArray(payload.triggers)) errors.push("flow.triggers precisa ser uma lista.");
  for (const [index, trigger] of (Array.isArray(payload.triggers) ? payload.triggers : []).entries()) {
    if (!isRecord(trigger)) { errors.push("flow.triggers[" + index + "] precisa ser um objeto."); continue; }
    const event = String(trigger.event ?? trigger.type ?? "");
    if (event && !INTERACTION_EVENTS.includes(event)) errors.push("flow.triggers[" + index + "].event não é reconhecido.");
  }
  if (payload.conditions !== undefined && !Array.isArray(payload.conditions)) errors.push("flow.conditions precisa ser uma lista.");
  for (const [index, condition] of (Array.isArray(payload.conditions) ? payload.conditions : []).entries()) {
    if (!isRecord(condition)) { errors.push("flow.conditions[" + index + "] precisa ser um objeto."); continue; }
    if (condition.expression !== undefined) checkExpression(condition.expression, "flow.conditions[" + index + "].expression", errors);
  }
  if (payload.conditionJoin !== undefined && !["all", "any"].includes(payload.conditionJoin)) errors.push("flow.conditionJoin deve ser all ou any.");
  if (payload.actions !== undefined && !Array.isArray(payload.actions)) errors.push("flow.actions precisa ser uma lista.");
  for (const [index, action] of (Array.isArray(payload.actions) ? payload.actions : []).entries()) {
    if (!isRecord(action)) { errors.push("flow.actions[" + index + "] precisa ser um objeto."); continue; }
    if (action.type !== undefined && !/^[a-z][a-z0-9._-]{0,63}$/i.test(String(action.type))) errors.push("flow.actions[" + index + "].type inválido.");
    if (action.config !== undefined && !isRecord(action.config)) errors.push("flow.actions[" + index + "].config precisa ser um objeto.");
  }
  if (payload.execution !== undefined && (!isRecord(payload.execution) || (payload.execution.onError !== undefined && !["stop", "continue"].includes(payload.execution.onError)))) {
    errors.push("flow.execution.onError deve ser stop ou continue.");
  }
  checkNoExecutablePayload(payload, "flow", errors);
  return result(errors);
}

function validateBehavior(payload) {
  const errors = [];
  const events = Array.isArray(payload.events) ? payload.events : (payload.event ? [payload.event] : []);
  if (payload.events !== undefined && !Array.isArray(payload.events)) errors.push("behavior.events precisa ser uma lista.");
  for (const event of events) if (!INTERACTION_EVENTS.includes(String(event))) errors.push("behavior.events contém evento não reconhecido: " + event);
  if (payload.flowId !== undefined && (typeof payload.flowId !== "string" || !SAFE_ID.test(payload.flowId))) errors.push("behavior.flowId inválido.");
  if (payload.flow !== undefined) {
    if (!isRecord(payload.flow)) errors.push("behavior.flow precisa ser um objeto.");
    else errors.push(...validateFlow(payload.flow).errors);
  }
  checkNoExecutablePayload(payload, "behavior", errors);
  return result(errors);
}

function validateFunction(payload) {
  const errors = [];
  if (payload.functionId !== undefined && (typeof payload.functionId !== "string" || !SAFE_ID.test(payload.functionId))) errors.push("function.functionId inválido.");
  if (payload.signature !== undefined && (typeof payload.signature !== "string" || payload.signature.length > 300)) errors.push("function.signature inválida.");
  if (payload.returnType !== undefined && !["void", "string", "number", "boolean", "object", "array", "any"].includes(String(payload.returnType))) errors.push("function.returnType não suportado.");
  if (payload.arguments !== undefined && (!Array.isArray(payload.arguments) || payload.arguments.length > 32)) errors.push("function.arguments precisa ser uma lista de até 32 argumentos.");
  checkNoExecutablePayload(payload, "function", errors);
  return result(errors);
}

/**
 * Built-in structural validators for NEXUS logic assets.
 * They validate inert data only; trusted modules still register executable actions/functions.
 */
export function createNexusLogicSchemas() {
  return Object.freeze({
    property: validateProperty,
    rule: validateRule,
    behavior: validateBehavior,
    flow: validateFlow,
    function: validateFunction
  });
}

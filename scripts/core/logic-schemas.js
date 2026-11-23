import { evaluateNexusExpression } from "./formula-engine.js";
import { INTERACTION_EVENTS } from "./interactions.js";
import { FOUNDRY_LOGIC_EVENTS } from "./foundry-logic-integration.js";

const SAFE_PATH = /^[A-Za-z][A-Za-z0-9_-]*(?:\.[A-Za-z][A-Za-z0-9_-]*)*$/;
const SAFE_ACTOR_UPDATE_PATH = /^system\.[A-Za-z][A-Za-z0-9_-]*(?:\.[A-Za-z][A-Za-z0-9_-]*)*$/;
const FORBIDDEN_UPDATE_KEYS = new Set(["__proto__", "prototype", "constructor", "ownership", "permission", "flags", "items", "_id", "id"]);
const SAFE_ID = /^[a-z0-9][a-z0-9._:-]{2,159}$/i;
const VALUE_TYPES = new Set(["string", "number", "boolean", "array", "object", "formula"]);
const FORBIDDEN_CODE_KEYS = new Set(["javascript", "script", "sourceCode", "eval", "functionBody"]);

const isRecord = value => Boolean(value && typeof value === "object" && !Array.isArray(value) && Object.getPrototypeOf(value) === Object.prototype);
const hasOwn = (value, key) => Object.prototype.hasOwnProperty.call(value, key);
const result = errors => ({ valid: errors.length === 0, errors });
const checkExpression = (expression, label, errors, expectedType = null) => {
  if (typeof expression !== "string" || !expression.trim() || expression.length > 500) {
    errors.push(label + ": expressão ausente ou acima de 500 caracteres.");
    return;
  }
  const value = evaluateNexusExpression(expression, () => 0, { maxLength: 500, maxTokens: 128, maxDepth: 16 });
  if (value === null || (expectedType && typeof value !== expectedType)) {
    errors.push(label + ": expressão inválida ou incompatível com o tipo de resultado esperado.");
  }
};
const validateActorAdjustConfig = (config, label, errors) => {
  const path = String(config.path ?? "");
  if (!SAFE_ACTOR_UPDATE_PATH.test(path) || path.split(".").some(part => FORBIDDEN_UPDATE_KEYS.has(part))) {
    errors.push(label + ".path precisa apontar para uma propriedade permitida em system.*.");
  }
  if (typeof config.delta !== "number" || !Number.isFinite(config.delta)) errors.push(label + ".delta precisa ser um número finito.");
  for (const key of ["min", "max"]) {
    if (config[key] !== undefined && (typeof config[key] !== "number" || !Number.isFinite(config[key]))) {
      errors.push(label + "." + key + " precisa ser um número finito.");
    }
  }
  if (typeof config.min === "number" && typeof config.max === "number" && config.min > config.max) {
    errors.push(label + ": o limite mínimo não pode superar o máximo.");
  }
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
  if (payload.resultType !== undefined && !["boolean", "number", "string"].includes(String(payload.resultType))) errors.push("rule.resultType: tipo de resultado inválido.");
  if (expression !== undefined) checkExpression(expression, "rule.expression", errors, payload.resultType ?? null);
  checkNoExecutablePayload(payload, "rule", errors);
  return result(errors);
}


function validateFlowGraph(graph, errors) {
  if (!isRecord(graph)) { errors.push("flow.graph precisa ser um objeto."); return; }
  if (!Array.isArray(graph.nodes) || graph.nodes.length < 2 || graph.nodes.length > 64) {
    errors.push("flow.graph.nodes precisa conter de 2 a 64 nós.");
    return;
  }
  if (!Array.isArray(graph.edges) || graph.edges.length > 128) errors.push("flow.graph.edges precisa conter até 128 conexões.");
  const nodes = new Map();
  for (const [index, node] of graph.nodes.entries()) {
    if (!isRecord(node)) { errors.push("flow.graph.nodes[" + index + "] precisa ser um objeto."); continue; }
    const id = String(node.id ?? "");
    if (!SAFE_ID.test(id) || nodes.has(id)) errors.push("flow.graph.nodes[" + index + "].id inválido ou duplicado.");
    else nodes.set(id, node);
    if (!["start", "condition", "action", "end"].includes(node.type)) errors.push("flow.graph.nodes[" + index + "].type não reconhecido.");
    if ((node.x !== undefined && (!Number.isFinite(node.x) || node.x < 0 || node.x > 4800)) ||
        (node.y !== undefined && (!Number.isFinite(node.y) || node.y < 0 || node.y > 4800))) {
      errors.push("flow.graph.nodes[" + index + "] possui coordenadas visuais inválidas.");
    }
    if (node.type === "condition") checkExpression(node.expression, "flow.graph.nodes[" + index + "].expression", errors, "boolean");
    if (node.type === "action") {
      if (!isRecord(node.action)) errors.push("flow.graph.nodes[" + index + "].action precisa ser um objeto.");
      else {
        if (typeof node.action.type !== "string" || !/^[a-z][a-z0-9._-]{0,63}$/i.test(node.action.type)) errors.push("flow.graph.nodes[" + index + "].action.type inválido.");
        if (node.action.config !== undefined && !isRecord(node.action.config)) errors.push("flow.graph.nodes[" + index + "].action.config precisa ser um objeto.");
        if (String(node.action.type ?? "").toLowerCase() === "nexus.actor.update" && isRecord(node.action.config)) {
          const path = String(node.action.config.path ?? "");
          if (!SAFE_ACTOR_UPDATE_PATH.test(path) || path.split(".").some(part => FORBIDDEN_UPDATE_KEYS.has(part))) errors.push("flow.graph.nodes[" + index + "].action.config.path precisa apontar para system.*.");
          if (!hasOwn(node.action.config, "value")) errors.push("flow.graph.nodes[" + index + "].action.config.value é obrigatório.");
        }
        if (String(node.action.type ?? "").toLowerCase() === "nexus.actor.adjust" && isRecord(node.action.config)) {
          validateActorAdjustConfig(node.action.config, "flow.graph.nodes[" + index + "].action.config", errors);
        }
      }
    }
  }
  const starts = [...nodes.values()].filter(node => node.type === "start");
  if (starts.length !== 1 || graph.entryNodeId !== starts[0]?.id) errors.push("flow.graph.entryNodeId precisa apontar para o único nó start.");
  const outgoing = new Map([...nodes.keys()].map(id => [id, []]));
  const incoming = new Map([...nodes.keys()].map(id => [id, 0]));
  const edgeKeys = new Set();
  for (const [index, edge] of (Array.isArray(graph.edges) ? graph.edges : []).entries()) {
    if (!isRecord(edge)) { errors.push("flow.graph.edges[" + index + "] precisa ser um objeto."); continue; }
    if (!nodes.has(edge.from) || !nodes.has(edge.to)) { errors.push("flow.graph.edges[" + index + "] referencia um nó inexistente."); continue; }
    const when = String(edge.when ?? "next");
    if (!["next", "true", "false"].includes(when)) errors.push("flow.graph.edges[" + index + "].when inválido.");
    const key = edge.from + ">" + edge.to + ":" + when;
    if (edgeKeys.has(key)) errors.push("flow.graph contém conexão duplicada.");
    edgeKeys.add(key);
    outgoing.get(edge.from).push({ ...edge, when });
    incoming.set(edge.to, incoming.get(edge.to) + 1);
  }
  for (const [id, node] of nodes) {
    const edges = outgoing.get(id) ?? [];
    const branches = edges.map(edge => edge.when);
    if (node.type === "end" && edges.length) errors.push("Nós end não podem ter saídas.");
    if (node.type === "condition" && (edges.length !== 2 || branches.filter(value => value === "true").length !== 1 || branches.filter(value => value === "false").length !== 1)) errors.push("Cada nó condition precisa de uma saída true e uma false.");
    if (["start", "action"].includes(node.type) && (edges.length !== 1 || branches[0] !== "next")) errors.push("Nós start/action precisam de exatamente uma saída next.");
    if (node.type === "start" && incoming.get(id) !== 0) errors.push("O nó start não pode receber conexões.");
    if (node.type !== "start" && incoming.get(id) === 0) errors.push("Todos os nós, exceto start, precisam receber uma conexão.");
  }
  const visiting = new Set(), visited = new Set();
  const visit = id => {
    if (visiting.has(id)) { errors.push("flow.graph não pode conter ciclos."); return; }
    if (visited.has(id)) return;
    visiting.add(id);
    for (const edge of outgoing.get(id) ?? []) visit(edge.to);
    visiting.delete(id); visited.add(id);
  };
  if (starts[0]) visit(starts[0].id);
  if (visited.size !== nodes.size) errors.push("Todos os nós do grafo precisam ser alcançáveis a partir de start.");
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
    if (condition.expression !== undefined) checkExpression(condition.expression, "flow.conditions[" + index + "].expression", errors, "boolean");
  }
  if (payload.conditionJoin !== undefined && !["all", "any"].includes(payload.conditionJoin)) errors.push("flow.conditionJoin deve ser all ou any.");
  if (payload.actions !== undefined && !Array.isArray(payload.actions)) errors.push("flow.actions precisa ser uma lista.");
  for (const [index, action] of (Array.isArray(payload.actions) ? payload.actions : []).entries()) {
    if (!isRecord(action)) { errors.push("flow.actions[" + index + "] precisa ser um objeto."); continue; }
    if (action.type !== undefined && !/^[a-z][a-z0-9._-]{0,63}$/i.test(String(action.type))) errors.push("flow.actions[" + index + "].type inválido.");
    if (action.config !== undefined && !isRecord(action.config)) errors.push("flow.actions[" + index + "].config precisa ser um objeto.");
    if (String(action.type ?? "").toLowerCase() === "nexus.actor.update" && isRecord(action.config)) {
      const path = String(action.config.path ?? "");
      if (!SAFE_ACTOR_UPDATE_PATH.test(path) || path.split(".").some(part => FORBIDDEN_UPDATE_KEYS.has(part))) {
        errors.push("flow.actions[" + index + "].config.path precisa apontar para uma propriedade permitida em system.*.");
      }
      if (!hasOwn(action.config, "value")) errors.push("flow.actions[" + index + "].config.value é obrigatório.");
    }
    if (String(action.type ?? "").toLowerCase() === "nexus.actor.adjust" && isRecord(action.config)) {
      validateActorAdjustConfig(action.config, "flow.actions[" + index + "].config", errors);
    }
  }
  if (payload.graph !== undefined) validateFlowGraph(payload.graph, errors);
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
  for (const event of events) if (!INTERACTION_EVENTS.includes(String(event)) && !FOUNDRY_LOGIC_EVENTS.includes(String(event))) errors.push("behavior.events contém evento não reconhecido: " + event);
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

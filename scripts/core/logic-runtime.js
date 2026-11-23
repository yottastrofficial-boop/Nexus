import { evaluateNexusCondition } from "./formula-engine.js";

const SAFE_PATH = /^[a-zA-Z][a-zA-Z0-9_-]*(?:\.[a-zA-Z][a-zA-Z0-9_-]*)*$/;
const FORBIDDEN = new Set(["__proto__", "prototype", "constructor"]);
const DEFAULT_LIMITS = Object.freeze({ maxActions: 32, maxConditions: 32, timeoutMs: 10000 });

function readContextPath(context, path) {
  const key = String(path ?? "").replace(/^@/, "");
  if (!SAFE_PATH.test(key) || key.split(".").some(part => FORBIDDEN.has(part))) return undefined;
  let value = context;
  for (const part of key.split(".")) {
    if (!value || typeof value !== "object" || !Object.prototype.hasOwnProperty.call(value, part)) return undefined;
    value = value[part];
  }
  return value;
}

export function createLogicRuntime({ registry, resolveProperty, canExecute, limits = {} } = {}) {
  if (!registry || typeof registry.get !== "function") throw new TypeError("O runtime exige um LogicRegistry.");
  const actions = new Map(), functions = new Map();
  let permissionResolver = typeof canExecute === "function" ? canExecute : null;
  const maxActions = Math.max(1, Math.min(128, Number(limits.maxActions) || DEFAULT_LIMITS.maxActions));
  const maxConditions = Math.max(1, Math.min(128, Number(limits.maxConditions) || DEFAULT_LIMITS.maxConditions));
  const timeoutMs = Math.max(100, Math.min(60000, Number(limits.timeoutMs) || DEFAULT_LIMITS.timeoutMs));

  const setPermissionResolver = resolver => {
    if (typeof resolver !== "function") throw new TypeError("O verificador de permissões precisa ser uma função.");
    permissionResolver = resolver;
  };
  const registerAction = ({ type, execute, effects = ["write"], permissions = [] } = {}) => {
    const id = String(type ?? "").trim().toLowerCase();
    if (!/^[a-z][a-z0-9._-]{0,63}$/.test(id) || typeof execute !== "function") throw new TypeError("Executor de ação inválido.");
    if (actions.has(id)) throw new Error("Executor já registrado: " + id);
    actions.set(id, Object.freeze({ execute, effects: [...new Set(effects)], permissions: [...new Set(permissions)] }));
    return id;
  };
  const registerFunction = ({ id, execute, effects = ["read"], permissions = [] } = {}) => {
    const key = String(id ?? "").trim().toLowerCase();
    if (!/^[a-z0-9][a-z0-9._-]{2,127}$/.test(key) || typeof execute !== "function") throw new TypeError("Função lógica inválida.");
    if (functions.has(key)) throw new Error("Função já registrada: " + key);
    functions.set(key, Object.freeze({ execute, effects: [...new Set(effects)], permissions: [...new Set(permissions)] }));
    return key;
  };
  const permitted = async (descriptor, context, target) => {
    if (typeof permissionResolver !== "function") {
      return descriptor.permissions.length === 0 &&
        descriptor.effects.every(effect => effect === "read" || effect === "pure");
    }
    return (await permissionResolver({ permissions: descriptor.permissions, effects: descriptor.effects, context, target })) === true;
  };
  const resolveFlowInput = flowInput => {
    const asset = typeof flowInput === "string"
      ? registry.resolve(flowInput, "flow")
      : (flowInput?.type === "flow" && flowInput?.payload && typeof flowInput.payload === "object" ? flowInput : null);
    return { asset, flow: asset ? asset.payload : (flowInput?.payload ?? flowInput) };
  };
  const validateFlowInput = (asset, flow) => {
    if (typeof registry.validateAsset !== "function") return [];
    const candidate = asset ?? {
      id: "nexus.runtime.flow.transient",
      namespace: "nexus.runtime",
      type: "flow",
      origin: "core",
      payload: flow
    };
    const validation = registry.validateAsset(candidate);
    return validation.valid ? [] : [...validation.errors];
  };

  const getFlowResolver = context => typeof resolveProperty === "function"
    ? path => resolveProperty(path, context)
    : path => readContextPath(context, path);
  const graphPath = (graph, conditionValue) => {
    const nodes = new Map(graph.nodes.map(node => [node.id, node]));
    const edges = new Map();
    for (const edge of graph.edges) {
      if (!edges.has(edge.from)) edges.set(edge.from, []);
      edges.get(edge.from).push(edge);
    }
    const trace = [], actionResults = [], errors = [];
    let current = graph.entryNodeId, steps = 0;
    while (current && steps++ < 128) {
      const node = nodes.get(current);
      if (!node) { errors.push({ nodeId: current, message: "Nó inexistente." }); break; }
      trace.push({ nodeId: node.id, type: node.type });
      if (node.type === "end") break;
      let branch = "next";
      if (node.type === "condition") {
        let passed = false;
        try { passed = evaluateNexusCondition(node.expression, conditionValue) === true; }
        catch (error) { errors.push({ nodeId: node.id, message: String(error?.message ?? error) }); break; }
        branch = passed ? "true" : "false";
        trace[trace.length - 1].result = passed;
      }
      const edge = (edges.get(current) ?? []).find(item => (item.when ?? "next") === branch);
      if (!edge) { errors.push({ nodeId: node.id, message: "Conexão de saída ausente: " + branch }); break; }
      current = edge.to;
    }
    if (steps >= 128) errors.push({ message: "Limite de 128 nós visitados excedido." });
    return { trace, actionResults, errors };
  };
  const runGraph = async (asset, flow, context) => {
    const resolver = getFlowResolver(context);
    const nodes = new Map(flow.graph.nodes.map(node => [node.id, node]));
    const edges = new Map();
    for (const edge of flow.graph.edges) {
      if (!edges.has(edge.from)) edges.set(edge.from, []);
      edges.get(edge.from).push(edge);
    }
    const trace = [], results = [], errors = [];
    const onError = flow.execution?.onError === "continue" ? "continue" : "stop";
    let current = flow.graph.entryNodeId, steps = 0;
    while (current && steps++ < 128) {
      const node = nodes.get(current);
      if (!node) { errors.push({ nodeId: current, message: "Nó inexistente." }); break; }
      trace.push({ nodeId: node.id, type: node.type });
      if (node.type === "end") break;
      let branch = "next";
      if (node.type === "condition") {
        const passed = evaluateNexusCondition(node.expression, resolver) === true;
        branch = passed ? "true" : "false";
        trace[trace.length - 1].result = passed;
      } else if (node.type === "action" && node.action?.enabled !== false) {
        const action = node.action, type = String(action.type ?? "").trim().toLowerCase();
        const executor = actions.get(type);
        if (!executor) {
          errors.push({ nodeId: node.id, actionId: action.id ?? node.id, type, message: "Ação não registrada no runtime: " + type });
          if (onError === "stop") break;
        } else {
          const permissionDescriptor = { permissions: [...new Set([...(asset?.permissions ?? []), ...executor.permissions])], effects: executor.effects };
          if (!(await permitted(permissionDescriptor, context, action))) {
            errors.push({ nodeId: node.id, actionId: action.id ?? node.id, type, message: "Permissão insuficiente para executar a ação." });
            if (onError === "stop") break;
          } else {
            const controller = new AbortController();
            let timer;
            try {
              const execution = Promise.resolve(executor.execute({ action, config: action.config ?? {}, context, signal: controller.signal, invokeFunction, registry }));
              const timeout = new Promise((_, reject) => { timer = setTimeout(() => { controller.abort(); reject(new Error("Tempo limite da ação excedido.")); }, timeoutMs); });
              const value = await Promise.race([execution, timeout]);
              results.push({ nodeId: node.id, actionId: action.id ?? node.id, type, status: "success", value });
            } catch (error) {
              errors.push({ nodeId: node.id, actionId: action.id ?? node.id, type, message: String(error?.message ?? error) });
              if (onError === "stop") break;
            } finally { clearTimeout(timer); }
          }
        }
      }
      const edge = (edges.get(current) ?? []).find(item => (item.when ?? "next") === branch);
      if (!edge) { errors.push({ nodeId: node.id, message: "Conexão de saída ausente: " + branch }); break; }
      current = edge.to;
    }
    if (steps >= 128) errors.push({ message: "Limite de 128 nós visitados excedido." });
    return { status: errors.length ? (results.length ? "partial" : "failed") : "success", trace, results, errors };
  };
  const simulateGraph = async (asset, flow, context) => {
    const resolver = getFlowResolver(context);
    const nodes = new Map(flow.graph.nodes.map(node => [node.id, node]));
    const edges = new Map();
    for (const edge of flow.graph.edges) {
      if (!edges.has(edge.from)) edges.set(edge.from, []);
      edges.get(edge.from).push(edge);
    }
    const trace = [], preview = [], errors = [];
    let current = flow.graph.entryNodeId, steps = 0;
    while (current && steps++ < 128) {
      const node = nodes.get(current);
      if (!node) { errors.push("Nó inexistente: " + current); break; }
      trace.push({ nodeId: node.id, type: node.type });
      if (node.type === "end") break;
      let branch = "next";
      if (node.type === "condition") {
        const passed = evaluateNexusCondition(node.expression, resolver) === true;
        branch = passed ? "true" : "false";
        trace[trace.length - 1].result = passed;
      } else if (node.type === "action" && node.action?.enabled !== false) {
        const action = node.action, type = String(action.type ?? "").trim().toLowerCase();
        const executor = actions.get(type);
        if (!executor) preview.push({ nodeId: node.id, type, status: "unregistered", allowed: false, effects: [], permissions: [] });
        else {
          const descriptor = { permissions: [...new Set([...(asset?.permissions ?? []), ...executor.permissions])], effects: executor.effects };
          let allowed = false;
          try { allowed = await permitted(descriptor, context, action); } catch { allowed = false; }
          preview.push({ nodeId: node.id, type, status: allowed ? "ready" : "denied", allowed, effects: [...executor.effects], permissions: [...descriptor.permissions] });
        }
      }
      const edge = (edges.get(current) ?? []).find(item => (item.when ?? "next") === branch);
      if (!edge) { errors.push("Conexão de saída ausente: " + branch + " em " + node.id); break; }
      current = edge.to;
    }
    if (steps >= 128) errors.push("Limite de 128 nós visitados excedido.");
    return { status: errors.length ? "invalid" : preview.some(item => !item.allowed) ? "blocked" : "ready", executed: false, trace, actions: preview, errors };
  };

  const runFlow = async (flowInput, context = {}) => {
    const { asset, flow } = resolveFlowInput(flowInput);
    if (!flow || typeof flow !== "object") throw new Error("Fluxo lógico inválido.");
    const validationErrors = validateFlowInput(asset, flow);
    if (validationErrors.length) throw new Error(validationErrors.join(" "));
    if (asset && !asset.enabled) return { status: "disabled", results: [], errors: [] };
    if (flow.graph) return runGraph(asset, flow, context);
    const conditions = Array.isArray(flow.conditions) ? flow.conditions.filter(item => item && String(item.expression ?? "").trim()) : [];
    if (conditions.length > maxConditions) throw new Error("Fluxo excede o limite de condições.");
    const resolver = typeof resolveProperty === "function"
      ? path => resolveProperty(path, context)
      : path => readContextPath(context, path);
    const conditionResults = conditions.map(condition => evaluateNexusCondition(condition.expression, resolver) === true);
    const join = flow.conditionJoin === "any" ? "any" : "all";
    const conditionsPass = !conditions.length || (join === "all" ? conditionResults.every(Boolean) : conditionResults.some(Boolean));
    if (!conditionsPass) return { status: "skipped", reason: "conditions", conditionResults, results: [], errors: [] };
    const queue = (Array.isArray(flow.actions) ? flow.actions : []).filter(action => action && action.enabled !== false);
    if (queue.length > maxActions) throw new Error("Fluxo excede o limite de ações.");
    const results = [], errors = [];
    const onError = flow.execution?.onError === "continue" ? "continue" : "stop";
    for (const action of queue) {
      const type = String(action.type ?? "").trim().toLowerCase();
      const executor = actions.get(type);
      if (!executor) {
        const error = { actionId: action.id ?? null, type, message: "Ação não registrada no runtime: " + type };
        errors.push(error);
        if (onError === "stop") break;
        continue;
      }
      const permissionDescriptor = {
        permissions: [...new Set([...(asset?.permissions ?? []), ...executor.permissions])],
        effects: executor.effects
      };
      if (!(await permitted(permissionDescriptor, context, action))) {
        errors.push({ actionId: action.id ?? null, type, message: "Permissão insuficiente para executar a ação." });
        if (onError === "stop") break;
        continue;
      }
      const controller = new AbortController();
      let timer;
      try {
        const execution = Promise.resolve(executor.execute({
          action, config: action.config ?? {}, context, signal: controller.signal,
          invokeFunction, registry
        }));
        const timeout = new Promise((_, reject) => {
          timer = setTimeout(() => {
            controller.abort();
            reject(new Error("Tempo limite da ação excedido."));
          }, timeoutMs);
        });
        const value = await Promise.race([execution, timeout]);
        results.push({ actionId: action.id ?? null, type, status: "success", value });
      } catch (error) {
        errors.push({ actionId: action.id ?? null, type, message: String(error?.message ?? error) });
        if (onError === "stop") break;
      } finally {
        clearTimeout(timer);
      }
    }
    return { status: errors.length ? (results.length ? "partial" : "failed") : "success", conditionResults, results, errors };
  };
  const simulateFlow = async (flowInput, context = {}) => {
    const { asset, flow } = resolveFlowInput(flowInput);
    if (!flow || typeof flow !== "object") return { status: "invalid", executed: false, actions: [], errors: ["Fluxo lógico inválido."] };
    const validationErrors = validateFlowInput(asset, flow);
    if (validationErrors.length) return { status: "invalid", executed: false, actions: [], errors: validationErrors };
    if (asset && !asset.enabled) return { status: "disabled", executed: false, actions: [], errors: [] };
    if (flow.graph) return simulateGraph(asset, flow, context);
    const conditions = Array.isArray(flow.conditions) ? flow.conditions.filter(item => item && String(item.expression ?? "").trim()) : [];
    if (conditions.length > maxConditions) return { status: "invalid", executed: false, actions: [], errors: ["Fluxo excede o limite de condições."] };
    const resolver = typeof resolveProperty === "function"
      ? path => resolveProperty(path, context)
      : path => readContextPath(context, path);
    const conditionResults = conditions.map(condition => evaluateNexusCondition(condition.expression, resolver) === true);
    const join = flow.conditionJoin === "any" ? "any" : "all";
    const conditionsPass = !conditions.length || (join === "all" ? conditionResults.every(Boolean) : conditionResults.some(Boolean));
    if (!conditionsPass) return { status: "skipped", executed: false, reason: "conditions", conditionResults, actions: [], errors: [] };
    const queue = (Array.isArray(flow.actions) ? flow.actions : []).filter(action => action && action.enabled !== false);
    if (queue.length > maxActions) return { status: "invalid", executed: false, conditionResults, actions: [], errors: ["Fluxo excede o limite de ações."] };
    const actionsPreview = [];
    for (const action of queue) {
      const type = String(action.type ?? "").trim().toLowerCase();
      const executor = actions.get(type);
      if (!executor) {
        actionsPreview.push({ actionId: action.id ?? null, type, status: "unregistered", allowed: false, effects: [], permissions: [] });
        continue;
      }
      const permissionDescriptor = {
        permissions: [...new Set([...(asset?.permissions ?? []), ...executor.permissions])],
        effects: executor.effects
      };
      let allowed = false;
      try { allowed = await permitted(permissionDescriptor, context, action); }
      catch { allowed = false; }
      actionsPreview.push({
        actionId: action.id ?? null,
        type,
        status: allowed ? "ready" : "denied",
        allowed,
        effects: [...executor.effects],
        permissions: [...permissionDescriptor.permissions]
      });
    }
    const blocked = actionsPreview.some(item => !item.allowed);
    return {
      status: blocked ? "blocked" : "ready",
      executed: false,
      conditionResults,
      actions: actionsPreview,
      errors: []
    };
  };
  const invokeFunction = async (id, args = [], context = {}) => {
    const fn = functions.get(String(id ?? "").toLowerCase());
    if (!fn) throw new Error("Função lógica não registrada: " + id);
    if (!Array.isArray(args) || args.length > 32) throw new Error("Argumentos da função excedem o limite.");
    if (!(await permitted(fn, context, { functionId: id }))) throw new Error("Permissão insuficiente para a função.");
    return fn.execute({ args, context, registry });
  };
  const dispatch = async (eventName, context = {}) => {
    const event = String(eventName ?? "").trim();
    if (!event) return [];
    const results = [];
    for (const behavior of registry.list({ type: "behavior", enabled: true })) {
      const payload = behavior.payload;
      const events = Array.isArray(payload.events) ? payload.events : [payload.event].filter(Boolean);
      if (!events.includes(event)) continue;
      if (!(await permitted({ permissions: behavior.permissions, effects: ["read"] }, context, behavior))) {
        results.push({ behaviorId: behavior.id, status: "denied" });
        continue;
      }
      const flowId = String(payload.flowId ?? "");
      const flow = flowId ? registry.resolve(flowId, "flow") : payload.flow;
      if (!flow) {
        results.push({ behaviorId: behavior.id, status: "missing-flow" });
        continue;
      }
      try {
        results.push({ behaviorId: behavior.id, result: await runFlow(flow, context) });
      } catch (error) {
        results.push({ behaviorId: behavior.id, status: "failed", error: String(error?.message ?? error) });
      }
    }
    return results;
  };
  return Object.freeze({ setPermissionResolver, registerAction, registerFunction, runFlow, simulateFlow, dispatch, invokeFunction, get actionTypes() { return [...actions.keys()]; }, get functionIds() { return [...functions.keys()]; } });
}

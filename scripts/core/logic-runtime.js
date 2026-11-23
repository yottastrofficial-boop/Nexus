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
  const runFlow = async (flowInput, context = {}) => {
    const asset = typeof flowInput === "string" ? registry.resolve(flowInput, "flow") : null;
    const flow = asset ? asset.payload : (flowInput?.payload ?? flowInput);
    if (!flow || typeof flow !== "object") throw new Error("Fluxo lógico inválido.");
    if (asset && !asset.enabled) return { status: "disabled", results: [], errors: [] };
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
  return Object.freeze({ setPermissionResolver, registerAction, registerFunction, runFlow, dispatch, invokeFunction, get actionTypes() { return [...actions.keys()]; }, get functionIds() { return [...functions.keys()]; } });
}

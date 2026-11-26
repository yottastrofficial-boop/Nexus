import { evaluateNexusExpression } from "./formula-engine.js";

import { FOUNDRY_LOGIC_EVENTS } from "./logic-events.js";
export { FOUNDRY_LOGIC_EVENTS } from "./logic-events.js";

const HOOK_BINDINGS = Object.freeze([
  ["createActor", "actor.created"],
  ["updateActor", "actor.updated"],
  ["deleteActor", "actor.deleted"],
  ["createItem", "item.created"],
  ["updateItem", "item.updated"],
  ["deleteItem", "item.deleted"],
  ["createToken", "token.created"],
  ["updateToken", "token.updated"],
  ["deleteToken", "token.deleted"],
  ["createCombat", "combat.created"],
  ["updateCombat", "combat.updated"],
  ["deleteCombat", "combat.deleted"],
  ["combatStart", "combat.started"],
  ["combatRound", "combat.round"],
  ["combatTurn", "combat.turn"]
]);

const SAFE_UPDATE_PATH = /^system\.[A-Za-z][A-Za-z0-9_-]*(?:\.[A-Za-z][A-Za-z0-9_-]*)*$/;
const FORBIDDEN_KEYS = new Set(["__proto__", "prototype", "constructor", "ownership", "permission", "flags", "items", "_id", "id"]);

function cloneJson(value, depth = 0, budget = { nodes: 0, bytes: 0 }) {
  if (depth > 12) throw new Error("Valor da ação excede a profundidade permitida.");
  budget.nodes++;
  if (budget.nodes > 5000) throw new Error("Valor da ação excede a quantidade permitida.");
  if (typeof value === "string") {
    budget.bytes += value.length;
    if (budget.bytes > 256000) throw new Error("Valor da ação excede o tamanho permitido.");
    return value;
  }
  if (value === null || typeof value === "boolean") return value;
  if (typeof value === "number") {
    if (!Number.isFinite(value)) throw new Error("Valor numérico inválido.");
    return value;
  }
  if (Array.isArray(value)) {
    if (value.length > 1000) throw new Error("Lista da ação muito grande.");
    return value.map(item => cloneJson(item, depth + 1, budget));
  }
  if (!value || typeof value !== "object" || Object.getPrototypeOf(value) !== Object.prototype) {
    throw new Error("Ações aceitam somente valores JSON simples.");
  }
  const entries = Object.entries(value);
  if (entries.length > 1000) throw new Error("Objeto da ação muito grande.");
  const result = {};
  for (const [key, child] of entries) {
    if (FORBIDDEN_KEYS.has(key)) throw new Error("Chave não permitida no valor da ação: " + key);
    budget.bytes += key.length;
    if (budget.bytes > 256000) throw new Error("Valor da ação excede o tamanho permitido.");
    result[key] = cloneJson(child, depth + 1, budget);
  }
  return result;
}

function snapshotHookData(value) {
  if (!value || typeof value !== "object" || Array.isArray(value) || Object.getPrototypeOf(value) !== Object.prototype) return {};
  try { return cloneJson(value); }
  catch { return {}; }
}

function getActor(document) {
  if (!document) return null;
  if (document.documentName === "Actor") return document;
  if (document.actor?.documentName === "Actor") return document.actor;
  if (document.parent?.documentName === "Actor") return document.parent;
  if (document.combatant?.actor?.documentName === "Actor") return document.combatant.actor;
  return null;
}

function getDocumentKind(document) {
  const name = String(document?.documentName ?? "");
  if (["Actor", "Item", "Token", "Combat"].includes(name)) return name.toLowerCase();
  return "document";
}

export function createFoundryLogicPermissionResolver({ gameRef = globalThis.game, constRef = globalThis.CONST } = {}) {
  return async ({ permissions = [], effects = [], context = {} } = {}) => {
    const currentUser = gameRef?.user;
    if (!currentUser) return false;
    // O GM ativo executa o Hook, mas a autorização de escrita deve refletir
    // o usuário que originou a alteração, não os privilégios do GM executor.
    const user = context.userId
      ? gameRef?.users?.get?.(context.userId)
      : currentUser;
    if (!user) return false;
    if (user.isGM === true) return true;

    const actor = context.actor?.documentName === "Actor" ? context.actor : getActor(context.document);
    const document = actor ?? context.document ?? null;
    const levels = constRef?.DOCUMENT_OWNERSHIP_LEVELS ?? {};
    const observer = levels.OBSERVER;
    const owner = levels.OWNER;

    const hasLevel = level => {
      if (!document || typeof document.testUserPermission !== "function" || level === undefined) return false;
      try { return document.testUserPermission(user, level) === true; }
      catch { return false; }
    };

    for (const permission of permissions) {
      if (permission === "actor:read") {
        if (!actor || !hasLevel(observer)) return false;
      } else if (permission === "actor:update") {
        if (!actor || !hasLevel(owner)) return false;
      } else {
        // Permissões desconhecidas nunca são concedidas implicitamente.
        return false;
      }
    }

    const effectList = Array.isArray(effects) ? effects : [];
    if (effectList.some(effect => ["write", "update", "create", "delete"].includes(effect))) {
      return Boolean(document && hasLevel(owner));
    }
    if (effectList.includes("read") && document) return hasLevel(observer);
    return effectList.every(effect => ["pure", "read"].includes(effect));
  };
}

function readActorSystemPath(system, path) {
  const segments = String(path ?? "").split(".").slice(1);
  let value = system;
  for (const segment of segments) {
    if (!value || typeof value !== "object") return undefined;
    value = value[segment];
  }
  return value;
}

export function registerFoundryLogicExecutors({ runtime } = {}) {
  if (!runtime || typeof runtime.registerAction !== "function") throw new TypeError("Runtime lógico indisponível.");
  const registered = [];
  registered.push(runtime.registerAction({
    type: "nexus.actor.update",
    effects: ["write"],
    permissions: ["actor:update"],
    configSchema: { fields: [
      { key: "path", label: "Caminho da propriedade", type: "text", required: true, placeholder: "system.resources.pv.value" },
      { key: "value", label: "Novo valor (JSON)", type: "json", required: true, help: "Aceita texto, número, booleano, lista, objeto ou null." }
    ] },
    execute: async ({ config, context, signal }) => {
      if (signal?.aborted) throw new Error("Ação cancelada.");
      const actor = context.actor?.documentName === "Actor" ? context.actor : getActor(context.document);
      if (!actor || typeof actor.update !== "function") throw new Error("A ação exige um Actor válido no contexto.");
      const path = String(config.path ?? "").trim();
      if (!SAFE_UPDATE_PATH.test(path) || path.split(".").some(part => FORBIDDEN_KEYS.has(part))) {
        throw new Error("Caminho de atualização não permitido. Use somente propriedades em system.*.");
      }
      if (!Object.prototype.hasOwnProperty.call(config, "value")) throw new Error("A ação exige um valor explícito.");
      const value = cloneJson(config.value);
      if (signal?.aborted) throw new Error("Ação cancelada.");
      await actor.update({ [path]: value });
      return { actorUuid: actor.uuid ?? null, path, value };
    }
  }));
  registered.push(runtime.registerAction({
    type: "nexus.actor.adjust",
    effects: ["write"],
    permissions: ["actor:update"],
    configSchema: { fields: [
      { key: "path", label: "Propriedade numérica", type: "text", required: true, placeholder: "system.resources.pv.value" },
      { key: "delta", label: "Variação (+/-)", type: "number", required: true, step: "any", help: "Use um valor positivo para adicionar ou negativo para subtrair." },
      { key: "min", label: "Limite mínimo", type: "number", step: "any", help: "Opcional; impede que o resultado fique abaixo deste valor." },
      { key: "max", label: "Limite máximo", type: "number", step: "any", help: "Opcional; impede que o resultado ultrapasse este valor." }
    ] },
    execute: async ({ config, context, signal }) => {
      if (signal?.aborted) throw new Error("Ação cancelada.");
      const actor = context.actor?.documentName === "Actor" ? context.actor : getActor(context.document);
      if (!actor || typeof actor.update !== "function") throw new Error("A ação exige um Actor válido no contexto.");
      const path = String(config.path ?? "").trim();
      if (!SAFE_UPDATE_PATH.test(path) || path.split(".").some(part => FORBIDDEN_KEYS.has(part))) {
        throw new Error("Caminho de ajuste não permitido. Use somente propriedades em system.*.");
      }
      if (typeof config.delta !== "number" || !Number.isFinite(config.delta)) throw new Error("O ajuste exige um delta numérico finito.");
      for (const key of ["min", "max"]) {
        if (config[key] !== undefined && (typeof config[key] !== "number" || !Number.isFinite(config[key]))) {
          throw new Error("Os limites min/max precisam ser números finitos.");
        }
      }
      if (config.min !== undefined && config.max !== undefined && config.min > config.max) {
        throw new Error("O limite mínimo não pode superar o máximo.");
      }
      const current = readActorSystemPath(actor.system, path);
      if (typeof current !== "number" || !Number.isFinite(current)) {
        throw new Error("A propriedade indicada não contém um número válido.");
      }
      let value = current + config.delta;
      if (config.min !== undefined) value = Math.max(config.min, value);
      if (config.max !== undefined) value = Math.min(config.max, value);
      if (signal?.aborted) throw new Error("Ação cancelada.");
      await actor.update({ [path]: value });
      return { actorUuid: actor.uuid ?? null, path, previous: current, delta: config.delta, value };
    }
  }));
  return registered;
}

export function createFoundryLogicEventBridge({ hooks = globalThis.Hooks, runtime, gameRef = globalThis.game, logger = console, maxNestedDispatches = 4 } = {}) {
  if (!hooks || typeof hooks.on !== "function") throw new TypeError("Hooks do Foundry indisponíveis.");
  if (!runtime || typeof runtime.dispatch !== "function") throw new TypeError("Runtime lógico indisponível.");
  const activeDocuments = new WeakMap();
  const documentDepth = new WeakMap();
  const removers = [];
  let installed = false;

  const dispatch = (eventName, document, changes, options, userId) => {
    // Hooks de documentos chegam a todos os clientes. Apenas o GM executa
    // comportamentos de ciclo de vida para evitar efeitos colaterais duplicados.
    if (gameRef?.user?.isGM !== true) return;
    const activeGM = gameRef?.users?.activeGM;
    if (activeGM?.id && activeGM.id !== gameRef.user.id) return;
    if (!document || (typeof document !== "object" && typeof document !== "function")) return;
    let active = activeDocuments.get(document);
    if (!active) { active = new Set(); activeDocuments.set(document, active); }
    if (active.has(eventName)) return;
    const depth = documentDepth.get(document) ?? 0;
    if (depth >= maxNestedDispatches) {
      logger?.warn?.("NEXUS | Limite de eventos lógicos encadeados atingido.", { eventName, uuid: document.uuid });
      return;
    }
    active.add(eventName);
    documentDepth.set(document, depth + 1);
    const actor = getActor(document);
    const kind = getDocumentKind(document);
    const context = {
      eventName,
      document,
      documentKind: kind,
      documentUuid: document.uuid ?? null,
      actor,
      system: actor?.system?.toObject?.() ?? actor?.system ?? null,
      actorName: actor?.name ?? null,
      item: kind === "item" ? document : null,
      itemSystem: kind === "item" ? (document.system?.toObject?.() ?? document.system ?? null) : null,
      token: kind === "token" ? document : null,
      combat: kind === "combat" ? document : null,
      changes: snapshotHookData(changes),
      options: snapshotHookData(options),
      userId: typeof userId === "string" ? userId : null,
      currentUserId: gameRef?.user?.id ?? null
    };
    Promise.resolve()
      .then(() => runtime.dispatch(eventName, context))
      .catch(error => logger?.error?.("NEXUS | Falha ao executar Comportamento " + eventName + ".", error))
      .finally(() => {
        active.delete(eventName);
        const nextDepth = Math.max(0, (documentDepth.get(document) ?? 1) - 1);
        if (nextDepth) documentDepth.set(document, nextDepth);
        else documentDepth.delete(document);
      });
  };

  const install = () => {
    if (installed) return false;
    for (const [hookName, eventName] of HOOK_BINDINGS) {
      const callback = (document, changesOrOptions = {}, optionsOrUserId = {}, maybeUserId = undefined) => {
        const isUpdate = hookName.startsWith("update");
        const isCombatPhase = ["combatStart", "combatRound", "combatTurn"].includes(hookName);
        const changes = isUpdate || isCombatPhase ? changesOrOptions : {};
        const options = isUpdate ? optionsOrUserId : (isCombatPhase ? {} : changesOrOptions);
        const userId = isUpdate ? maybeUserId : (typeof optionsOrUserId === "string" ? optionsOrUserId : undefined);
        dispatch(eventName, document, changes, options, userId);
      };
      hooks.on(hookName, callback);
      removers.push(() => {
        if (typeof hooks.off === "function") hooks.off(hookName, callback);
      });
    }
    installed = true;
    return true;
  };

  const uninstall = () => {
    if (!installed) return false;
    for (const remove of removers.splice(0)) {
      try { remove(); } catch (error) { logger?.warn?.("NEXUS | Não foi possível remover um Hook de Lógica.", error); }
    }
    installed = false;
    return true;
  };

  return Object.freeze({ install, uninstall, get installed() { return installed; }, get hookCount() { return removers.length; } });
}

export function installFoundryLogicIntegration({ hooks = globalThis.Hooks, runtime, gameRef = globalThis.game, constRef = globalThis.CONST, logger = console } = {}) {
  if (!runtime) throw new TypeError("Runtime lógico indisponível.");
  runtime.setPermissionResolver?.(createFoundryLogicPermissionResolver({ gameRef, constRef }));
  const registeredActions = registerFoundryLogicExecutors({ runtime });
  const bridge = createFoundryLogicEventBridge({ hooks, runtime, gameRef, logger });
  bridge.install();
  return Object.freeze({ bridge, registeredActions, uninstall: () => bridge.uninstall() });
}

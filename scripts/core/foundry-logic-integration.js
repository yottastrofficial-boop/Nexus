import { evaluateNexusExpression } from "./formula-engine.js";

export const FOUNDRY_LOGIC_EVENTS = Object.freeze([
  "actor.created", "actor.updated", "actor.deleted",
  "item.created", "item.updated", "item.deleted",
  "token.created", "token.updated", "token.deleted",
  "combat.created", "combat.updated", "combat.deleted",
  "combat.started", "combat.round", "combat.turn"
]);

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
    const user = gameRef?.user;
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

export function registerFoundryLogicExecutors({ runtime } = {}) {
  if (!runtime || typeof runtime.registerAction !== "function") throw new TypeError("Runtime lógico indisponível.");
  const registered = [];
  registered.push(runtime.registerAction({
    type: "nexus.actor.update",
    effects: ["write"],
    permissions: ["actor:update"],
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
      item: kind === "item" ? document : null,
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

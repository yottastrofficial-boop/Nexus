const LOGIC_TYPES = Object.freeze(["property", "rule", "behavior", "flow", "function"]);
const ORIGINS = new Set(["core", "personal", "module", "addon"]);
const ID_PATTERN = /^[a-z0-9][a-z0-9._:-]{2,159}$/i;
const NAMESPACE_PATTERN = /^[a-z0-9][a-z0-9._-]{1,95}$/i;
const FORBIDDEN_KEYS = new Set(["__proto__", "prototype", "constructor"]);
const MAX_DEPTH = 20;
const MAX_ASSETS = 5000;

function deepFreeze(value) {
  if (!value || typeof value !== "object" || Object.isFrozen(value)) return value;
  for (const child of Object.values(value)) deepFreeze(child);
  return Object.freeze(value);
}

function cloneData(value, depth = 0) {
  if (depth > MAX_DEPTH) throw new Error("Ativo lógico excede a profundidade permitida.");
  if (value === null || typeof value === "boolean" || typeof value === "string") return value;
  if (typeof value === "number") {
    if (!Number.isFinite(value)) throw new Error("Ativo lógico contém número inválido.");
    return value;
  }
  if (Array.isArray(value)) {
    if (value.length > 2000) throw new Error("Ativo lógico contém lista muito grande.");
    return value.map(item => cloneData(item, depth + 1));
  }
  if (!value || typeof value !== "object" || Object.getPrototypeOf(value) !== Object.prototype) {
    throw new Error("Ativos lógicos aceitam somente dados JSON simples.");
  }
  const result = {};
  for (const [key, child] of Object.entries(value)) {
    if (FORBIDDEN_KEYS.has(key)) continue;
    result[key] = cloneData(child, depth + 1);
  }
  return result;
}

function normalizeDependency(raw) {
  const dependency = typeof raw === "string" ? { id: raw } : raw;
  const id = String(dependency?.id ?? "").trim();
  if (!ID_PATTERN.test(id)) throw new Error("Referência de dependência inválida.");
  const type = dependency.type == null ? null : String(dependency.type).toLowerCase();
  if (type && !LOGIC_TYPES.includes(type)) throw new Error("Tipo de dependência inválido.");
  return Object.freeze({ id, type, optional: dependency.optional === true, minVersion: String(dependency.minVersion ?? "") });
}

export function normalizeLogicAsset(raw, defaults = {}) {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) throw new TypeError("Ativo lógico inválido.");
  const id = String(raw.id ?? "").trim();
  const type = String(raw.type ?? "").trim().toLowerCase();
  const namespace = String(raw.namespace ?? defaults.namespace ?? id.split(".").slice(0, 2).join(".")).trim();
  if (!ID_PATTERN.test(id)) throw new Error("ID lógico inválido.");
  if (!LOGIC_TYPES.includes(type)) throw new Error("Tipo lógico não reconhecido: " + type);
  if (!NAMESPACE_PATTERN.test(namespace)) throw new Error("Namespace lógico inválido.");
  const origin = String(raw.origin ?? defaults.origin ?? "personal").toLowerCase();
  if (!ORIGINS.has(origin)) throw new Error("Origem lógica inválida.");
  const schemaVersion = Math.max(1, Math.trunc(Number(raw.schemaVersion) || 1));
  const payload = cloneData(raw.payload ?? {});
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) throw new Error("Payload lógico precisa ser um objeto.");
  const tags = [...new Set((Array.isArray(raw.tags) ? raw.tags : []).map(tag => String(tag).trim().slice(0, 48)).filter(Boolean))].slice(0, 40);
  const dependencies = [...new Map((Array.isArray(raw.dependencies) ? raw.dependencies : []).map(normalizeDependency).map(item => [item.id, item])).values()];
  const permissions = [...new Set((Array.isArray(raw.permissions) ? raw.permissions : []).map(value => String(value).trim().toLowerCase()).filter(value => /^[a-z][a-z0-9:._-]{0,63}$/.test(value)))].slice(0, 40);
  return Object.freeze({
    id, namespace, type, schemaVersion,
    name: String(raw.name ?? id).trim().slice(0, 100) || id,
    description: String(raw.description ?? "").slice(0, 2000),
    origin,
    packageVersion: String(raw.packageVersion ?? defaults.packageVersion ?? "").slice(0, 32),
    tags: Object.freeze(tags),
    enabled: raw.enabled !== false,
    dependencies: Object.freeze(dependencies),
    permissions: Object.freeze(permissions),
    payload: deepFreeze(payload)
  });
}

export function createLogicRegistry({ schemas = {} } = {}) {
  const assets = new Map();
  const validators = new Map();
  for (const [type, validator] of Object.entries(schemas)) {
    if (!LOGIC_TYPES.includes(type) || typeof validator !== "function") throw new TypeError("Schema lógico inválido.");
    validators.set(type, validator);
  }
  const registerSchema = (type, validator) => {
    const key = String(type ?? "").toLowerCase();
    if (!LOGIC_TYPES.includes(key) || typeof validator !== "function") throw new TypeError("Schema lógico inválido.");
    validators.set(key, validator);
  };
  const validate = asset => {
    const validator = validators.get(asset.type);
    if (!validator) return { valid: true, errors: [] };
    const result = validator(asset.payload, asset);
    if (result === false) return { valid: false, errors: ["Payload rejeitado pelo schema de " + asset.type + "."] };
    if (result && typeof result === "object" && result.valid === false) return { valid: false, errors: [...(result.errors ?? [])] };
    return { valid: true, errors: [] };
  };
  const validateAsset = (raw, defaults = {}) => {
    try {
      const asset = normalizeLogicAsset(raw, defaults);
      const validation = validate(asset);
      return { ...validation, asset };
    } catch (error) {
      return { valid: false, errors: [String(error?.message ?? error)], asset: null };
    }
  };
  const register = (raw, { replace = false, origin, namespace } = {}) => {
    const checked = validateAsset(raw, { origin, namespace });
    if (!checked.valid || !checked.asset) throw new Error(checked.errors.join(" "));
    const asset = checked.asset;
    const existing = assets.get(asset.id);
    if (existing && !replace) throw new Error("Ativo lógico já registrado: " + asset.id);
    if (existing && existing.namespace !== asset.namespace) throw new Error("Um namespace não pode substituir ativo de outro namespace.");
    assets.set(asset.id, asset);
    return asset;
  };
  const registerMany = (items, options = {}) => {
    if (!Array.isArray(items) || items.length > MAX_ASSETS) throw new Error("Lote de ativos lógicos inválido ou muito grande.");
    const prepared = items.map(item => normalizeLogicAsset(item, options));
    const ids = new Set();
    for (const asset of prepared) {
      if (ids.has(asset.id) || (assets.has(asset.id) && !options.replace)) throw new Error("Conflito de ID lógico: " + asset.id);
      if (assets.has(asset.id) && assets.get(asset.id).namespace !== asset.namespace) throw new Error("Conflito de namespace: " + asset.id);
      const result = validate(asset);
      if (!result.valid) throw new Error(result.errors.join(" "));
      ids.add(asset.id);
    }
    for (const asset of prepared) assets.set(asset.id, asset);
    return prepared;
  };
  const get = id => assets.get(String(id ?? "")) ?? null;
  const resolve = (id, type) => {
    const asset = get(id);
    return asset && (!type || asset.type === type) ? asset : null;
  };
  const list = ({ type, origin, namespace, tag, enabled } = {}) => [...assets.values()].filter(asset =>
    (!type || asset.type === type) && (!origin || asset.origin === origin) &&
    (!namespace || asset.namespace === namespace) && (!tag || asset.tags.includes(tag)) &&
    (enabled === undefined || asset.enabled === enabled)
  ).sort((a, b) => a.name.localeCompare(b.name, "pt-BR") || a.id.localeCompare(b.id));
  const getDependents = id => [...assets.values()].filter(asset => asset.dependencies.some(dep => dep.id === id));
  const validateDependencies = () => {
    const errors = [], indegree = new Map([...assets.keys()].map(id => [id, 0]));
    const outgoing = new Map([...assets.keys()].map(id => [id, []]));
    for (const asset of assets.values()) {
      for (const dependency of asset.dependencies) {
        const target = assets.get(dependency.id);
        if (!target) {
          if (!dependency.optional) errors.push({ code: "missing-dependency", assetId: asset.id, dependencyId: dependency.id });
          continue;
        }
        if (dependency.type && target.type !== dependency.type) {
          errors.push({ code: "dependency-type-mismatch", assetId: asset.id, dependencyId: dependency.id, expected: dependency.type, actual: target.type });
          continue;
        }
        outgoing.get(dependency.id).push(asset.id);
        indegree.set(asset.id, indegree.get(asset.id) + 1);
      }
    }
    const queue = [...indegree].filter(([, degree]) => degree === 0).map(([id]) => id);
    const order = [];
    for (let cursor = 0; cursor < queue.length; cursor++) {
      const id = queue[cursor];
      order.push(id);
      for (const dependent of outgoing.get(id)) {
        const next = indegree.get(dependent) - 1;
        indegree.set(dependent, next);
        if (next === 0) queue.push(dependent);
      }
    }
    const blocked = [...indegree].filter(([, degree]) => degree > 0).map(([id]) => id);
    const color = new Map([...assets.keys()].map(id => [id, 0]));
    const path = [], pathIndex = new Map(), cycleNodes = new Set();
    const dependenciesById = new Map([...assets.values()].map(asset => [
      asset.id,
      asset.dependencies.map(dep => assets.get(dep.id)).filter(target => target && (!asset.dependencies.find(dep => dep.id === target.id)?.type || asset.dependencies.find(dep => dep.id === target.id).type === target.type)).map(target => target.id)
    ]));
    for (const startId of assets.keys()) {
      if (color.get(startId) !== 0) continue;
      color.set(startId, 1); pathIndex.set(startId, path.length); path.push(startId);
      const stack = [{ id: startId, index: 0 }];
      while (stack.length) {
        const frame = stack[stack.length - 1];
        const dependencies = dependenciesById.get(frame.id) ?? [];
        if (frame.index >= dependencies.length) {
          stack.pop(); color.set(frame.id, 2); pathIndex.delete(frame.id); path.pop();
          continue;
        }
        const targetId = dependencies[frame.index++];
        const targetColor = color.get(targetId) ?? 0;
        if (targetColor === 0) {
          color.set(targetId, 1); pathIndex.set(targetId, path.length); path.push(targetId);
          stack.push({ id: targetId, index: 0 });
        } else if (targetColor === 1) {
          const cycleStart = pathIndex.get(targetId);
          if (cycleStart !== undefined) for (const cycleId of path.slice(cycleStart)) cycleNodes.add(cycleId);
        }
      }
    }
    const cyclic = [...cycleNodes];
    const blockedByCycle = blocked.filter(id => !cycleNodes.has(id));
    if (cyclic.length) errors.push({ code: "dependency-cycle", assetIds: cyclic, blockedByCycle });
    return { valid: errors.length === 0, errors, order, cyclic, blockedByCycle };
  };
  const remove = (id, { cascade = false } = {}) => {
    const target = get(id);
    if (!target) return { removed: false, dependents: [] };
    const dependents = getDependents(target.id);
    if (dependents.length && !cascade) throw new Error("Ativo lógico possui dependentes: " + dependents.map(item => item.id).join(", "));
    const removed = new Set([target.id]);
    if (cascade) {
      const queue = [target.id];
      for (let cursor = 0; cursor < queue.length; cursor++) {
        for (const dependent of getDependents(queue[cursor])) {
          if (removed.has(dependent.id)) continue;
          removed.add(dependent.id);
          queue.push(dependent.id);
        }
      }
    }
    for (const key of removed) assets.delete(key);
    return { removed: true, ids: [...removed], dependents };
  };
  return Object.freeze({ registerSchema, validateAsset, register, registerMany, get, resolve, list, getDependents, validateDependencies, remove, get size() { return assets.size; } });
}

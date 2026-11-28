/**
 * NEXUS service registry.
 *
 * Provides a stable, dependency-aware service boundary for system modules.
 * Services are created lazily, shared across consumers and disposed in
 * reverse initialization order. It is intentionally independent of Foundry
 * globals so it can be tested in isolation.
 */
const VALID_SERVICE_NAME = /^[a-z][a-z0-9]*(?:[.-][a-z0-9]+)*$/i;

export function createNexusServiceRegistry({ context = {}, logger = console } = {}) {
  const definitions = new Map();
  const instances = new Map();
  const resolving = new Set();
  const creationOrder = [];
  let disposed = false;
  let disposalPromise = null;

  const assertName = name => {
    const key = String(name ?? "").trim();
    if (!VALID_SERVICE_NAME.test(key)) throw new TypeError("Nome de serviço NEXUS inválido: " + key);
    return key;
  };

  const assertActive = () => {
    if (disposed || disposalPromise) throw new Error("O registro de serviços NEXUS está encerrando ou já foi encerrado.");
  };

  const register = (name, factory, { dependencies = [], dispose = null, replace = false } = {}) => {
    assertActive();
    const key = assertName(name);
    if (typeof factory !== "function") throw new TypeError("A fábrica do serviço deve ser uma função.");
    if (instances.has(key)) throw new Error("Não é permitido substituir um serviço já inicializado: " + key);
    if (definitions.has(key) && !replace) throw new Error("Serviço já registrado: " + key);
    const deps = [...new Set(dependencies.map(assertName))];
    definitions.set(key, { key, factory, dependencies: deps, dispose });
    if (replace) instances.delete(key);
    return api;
  };

  const publish = (name, value, { replace = false, dispose = null } = {}) => {
    assertActive();
    const key = assertName(name);
    if (instances.has(key)) {
      if (instances.get(key).value === value) return value;
      throw new Error("Não é permitido substituir um serviço já publicado: " + key);
    }
    if (definitions.has(key) && !replace) throw new Error("Serviço já registrado: " + key);
    definitions.set(key, { key, factory: () => value, dependencies: [], dispose });
    instances.set(key, { value, promise: Promise.resolve(value), state: "ready", error: null });
    if (!creationOrder.includes(key)) creationOrder.push(key);
    return value;
  };

  const has = name => {
    const key = assertName(name);
    return definitions.has(key) || instances.has(key);
  };

  const get = name => {
    const key = assertName(name);
    const entry = instances.get(key);
    return entry?.state === "ready" ? entry.value : undefined;
  };

  const defineAccessor = (target, property, name) => {
    assertActive();
    const key = assertName(name);
    if (!definitions.has(key)) throw new Error("Serviço não registrado: " + key);
    if (!target || (typeof target !== "object" && typeof target !== "function")) {
      throw new TypeError("O alvo do accessor de serviço deve ser um objeto.");
    }
    Object.defineProperty(target, property, {
      configurable: true,
      enumerable: true,
      get: () => resolveSync(key),
      set: value => {
        const entry = instances.get(key);
        if (entry?.state === "ready") {
          if (entry.value === value) return;
          throw new Error("Não é permitido substituir um serviço já inicializado: " + key);
        }
        if (entry?.state === "initializing") {
          throw new Error("Não é permitido substituir um serviço em inicialização: " + key);
        }
        publish(key, value, { replace: true });
      }
    });
    return target;
  };

  const resolve = async (name, ancestry = []) => {
    assertActive();
    const key = assertName(name);
    if (ancestry.includes(key)) {
      throw new Error("Dependência circular de serviços: " + [...ancestry, key].join(" → "));
    }
    const existing = instances.get(key);
    if (existing) return existing.promise;
    const definition = definitions.get(key);
    if (!definition) throw new Error("Serviço não registrado: " + key);
    if (resolving.has(key)) {
      throw new Error("Dependência circular de serviços: " + [...ancestry, key].join(" → "));
    }

    resolving.add(key);
    const entry = { value: undefined, promise: null, state: "initializing", error: null };
    entry.promise = (async () => {
      try {
        const nextAncestry = [...ancestry, key];
        const values = await Promise.all(definition.dependencies.map(dep => resolve(dep, nextAncestry)));
        const deps = Object.freeze(Object.fromEntries(definition.dependencies.map((dep, index) => [dep, values[index]])));
        const value = await definition.factory(deps, Object.freeze({ registry: api, context, name: key }));
        if (value === undefined) throw new Error("A fábrica retornou undefined para o serviço: " + key);
        entry.value = value;
        entry.state = "ready";
        if (!creationOrder.includes(key)) creationOrder.push(key);
        return value;
      } catch (error) {
        entry.state = "failed";
        entry.error = error;
        instances.delete(key);
        throw error;
      } finally {
        resolving.delete(key);
      }
    })();
    instances.set(key, entry);
    return entry.promise;
  };

  const resolveSync = (name, ancestry = []) => {
    assertActive();
    const key = assertName(name);
    if (ancestry.includes(key)) {
      throw new Error("Dependência circular de serviços: " + [...ancestry, key].join(" → "));
    }
    const existing = instances.get(key);
    if (existing) {
      if (existing.state !== "ready") throw new Error("Serviço ainda está inicializando de forma assíncrona: " + key);
      return existing.value;
    }
    const definition = definitions.get(key);
    if (!definition) throw new Error("Serviço não registrado: " + key);
    if (resolving.has(key)) throw new Error("Dependência circular de serviços: " + [...ancestry, key].concat(key).join(" → "));
    resolving.add(key);
    try {
      const nextAncestry = [...ancestry, key];
      const values = definition.dependencies.map(dep => resolveSync(dep, nextAncestry));
      const deps = Object.freeze(Object.fromEntries(definition.dependencies.map((dep, index) => [dep, values[index]])));
      const value = definition.factory(deps, Object.freeze({ registry: api, context, name: key }));
      if (value && typeof value.then === "function") throw new Error("A fábrica do serviço " + key + " é assíncrona; use resolve().");
      if (value === undefined) throw new Error("A fábrica retornou undefined para o serviço: " + key);
      instances.set(key, { value, promise: Promise.resolve(value), state: "ready", error: null });
      if (!creationOrder.includes(key)) creationOrder.push(key);
      return value;
    } catch (error) {
      instances.delete(key);
      throw error;
    } finally {
      resolving.delete(key);
    }
  };

  const initializeSync = names => {
    assertActive();
    const requested = names == null ? [...definitions.keys()] : [...names].map(assertName);
    const results = {};
    for (const name of requested) results[name] = resolveSync(name);
    return Object.freeze(results);
  };

  const initialize = async names => {
    assertActive();
    const requested = names == null ? [...definitions.keys()] : [...names].map(assertName);
    const results = {};
    for (const name of requested) results[name] = await resolve(name);
    return Object.freeze(results);
  };

  const list = () => [...definitions.keys()].map(name => {
    const entry = instances.get(name);
    return Object.freeze({
      name,
      dependencies: [...(definitions.get(name)?.dependencies ?? [])],
      state: entry?.state ?? "registered",
      error: entry?.error ? String(entry.error.message ?? entry.error) : ""
    });
  });

  const dispose = () => {
    // Return the same in-flight promise to every caller. Mark the registry as
    // closing immediately so no new service can begin while current factories
    // settle, then dispose every successfully created instance in reverse order.
    if (disposalPromise) return disposalPromise;

    disposalPromise = (async () => {
      const pending = [...instances.values()]
        .filter(entry => entry.state === "initializing" && entry.promise)
        .map(entry => entry.promise);
      await Promise.allSettled(pending);
      disposed = true;

      const errors = [];
      for (const name of [...creationOrder].reverse()) {
        const entry = instances.get(name);
        const definition = definitions.get(name);
        if (!entry || entry.state !== "ready") continue;
        try {
          const cleanup = definition?.dispose
            ?? entry.value?.dispose
            ?? entry.value?.close
            ?? entry.value?.destroy;
          if (typeof cleanup === "function") await cleanup.call(entry.value, entry.value);
        } catch (error) {
          errors.push({ name, error });
          logger?.error?.("NEXUS | Falha ao encerrar serviço " + name, error);
        }
      }
      instances.clear();
      definitions.clear();
      creationOrder.length = 0;
      return { disposed: true, errors };
    })();

    return disposalPromise;
  };

  const api = Object.freeze({ register, publish, has, get, defineAccessor, resolve, resolveSync, initialize, initializeSync, list, dispose, get disposed() { return disposed; } });
  return api;
}

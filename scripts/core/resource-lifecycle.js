/**
 * NEXUS Resource Lifecycle — gerenciamento de recursos residentes em memória.
 *
 * Este serviço controla recursos transitórios (decoders, previews, buffers e
 * adaptadores) sem assumir propriedade dos documentos nativos do Foundry.
 * Ele não faz cache em disco/IndexedDB: controla apenas o ciclo de vida em RAM.
 */
const DEFAULT_LIMITS = Object.freeze({
  maxResidentBytes: 96 * 1024 * 1024,
  maxIdleBytes: 24 * 1024 * 1024,
  maxConcurrentLoads: 2
});

const validId = value => /^[a-z0-9][a-z0-9._:-]{2,159}$/i.test(String(value ?? ""));
const safeBytes = value => Math.max(0, Math.ceil(Number(value) || 0));

export function createResourceLifecycleManager({
  maxResidentBytes = DEFAULT_LIMITS.maxResidentBytes,
  maxIdleBytes = DEFAULT_LIMITS.maxIdleBytes,
  maxConcurrentLoads = DEFAULT_LIMITS.maxConcurrentLoads,
  now = Date.now
} = {}) {
  const residentLimit = Math.max(1, safeBytes(maxResidentBytes));
  const idleLimit = Math.min(residentLimit, safeBytes(maxIdleBytes));
  const concurrentLimit = Math.max(1, Math.floor(Number(maxConcurrentLoads) || DEFAULT_LIMITS.maxConcurrentLoads));
  const entries = new Map();
  let residentBytes = 0;
  let reservedBytes = 0;
  let activeLoads = 0;
  let disposed = false;
  let capacityQueue = Promise.resolve();
  const loadWaiters = [];

  const requireEntry = id => {
    const entry = entries.get(String(id));
    if (!entry) throw new Error("Recurso não registrado: " + String(id));
    return entry;
  };

  const acquireLoadSlot = () => new Promise(resolve => {
    const grant = () => {
      activeLoads++;
      let released = false;
      resolve(() => {
        if (released) return;
        released = true;
        activeLoads--;
        loadWaiters.shift()?.();
      });
    };
    if (activeLoads < concurrentLimit) grant();
    else loadWaiters.push(grant);
  });

  const unloadEntry = async entry => {
    if (entry.state === "unloading" && entry.unloadPromise) {
      await entry.unloadPromise;
      return false;
    }
    if (entry.state !== "ready" || entry.references > 0 || entry.pins > 0) return false;
    entry.state = "unloading";
    entry.unloadPromise = (async () => {
      try {
        await entry.unload?.(entry.value, { id: entry.id });
        residentBytes = Math.max(0, residentBytes - entry.residentBytes);
        entry.value = undefined;
        entry.residentBytes = 0;
        entry.state = "registered";
        entry.lastError = "";
        return true;
      } catch (error) {
        entry.state = "ready";
        entry.lastError = String(error?.message ?? error);
        return false;
      } finally {
        entry.unloadPromise = null;
      }
    })();
    return entry.unloadPromise;
  };

  const trimInternal = async targetBytes => {
    const target = Math.max(0, safeBytes(targetBytes));
    while (residentBytes + reservedBytes > target) {
      const candidates = [...entries.values()]
        .filter(entry => entry.state === "ready" && entry.references === 0 && entry.pins === 0)
        .sort((a, b) => a.priority - b.priority || a.lastUsed - b.lastUsed);
      if (!candidates.length) break;
      let removed = false;
      for (const entry of candidates) {
        if (await unloadEntry(entry)) { removed = true; break; }
      }
      if (!removed) break;
    }
  };

  const trimIdle = async () => {
    const protectedBytes = [...entries.values()]
      .filter(entry => entry.state === "ready" && (entry.references > 0 || entry.pins > 0))
      .reduce((sum, entry) => sum + entry.residentBytes, 0);
    await trimInternal(protectedBytes + idleLimit);
  };

  const reserveCapacity = bytes => {
    const requested = safeBytes(bytes);
    if (requested > residentLimit) return Promise.reject(new Error("O recurso excede o limite de memória RAM configurado."));
    const operation = capacityQueue.then(async () => {
      await trimInternal(residentLimit - requested);
      if (residentBytes + reservedBytes + requested > residentLimit) {
        throw new Error("Memória RAM insuficiente: recursos em uso ou reservados ocupam o limite configurado.");
      }
      reservedBytes += requested;
    });
    capacityQueue = operation.catch(() => {});
    return operation;
  };

  const loadEntry = async entry => {
    if (entry.state === "unloading" && entry.unloadPromise) await entry.unloadPromise;
    if (entry.state === "ready") return entry.value;
    if (entry.loadPromise) return entry.loadPromise;
    if (disposed) throw new Error("O gerenciador de recursos já foi encerrado.");
    entry.state = "loading";
    entry.loadPromise = (async () => {
      const releaseSlot = await acquireLoadSlot();
      let reserved = false;
      try {
        await reserveCapacity(entry.estimatedBytes);
        reserved = true;
        const value = await entry.load({ id: entry.id });
        if (value === undefined) throw new Error("O carregador não retornou um recurso válido.");
        reservedBytes = Math.max(0, reservedBytes - entry.estimatedBytes);
        reserved = false;
        entry.value = value;
        entry.residentBytes = entry.estimatedBytes;
        residentBytes += entry.residentBytes;
        entry.lastUsed = now();
        entry.state = "ready";
        entry.lastError = "";
        return value;
      } catch (error) {
        if (reserved) reservedBytes = Math.max(0, reservedBytes - entry.estimatedBytes);
        entry.state = "registered";
        entry.lastError = String(error?.message ?? error);
        throw error;
      } finally {
        releaseSlot();
        entry.loadPromise = null;
      }
    })();
    return entry.loadPromise;
  };

  const createLease = (entry, kind, value) => {
    let released = false;
    return Object.freeze({
      id: entry.id,
      value,
      release: async () => {
        if (released) return false;
        released = true;
        if (kind === "pin") entry.pins = Math.max(0, entry.pins - 1);
        else entry.references = Math.max(0, entry.references - 1);
        entry.lastUsed = now();
        await trimIdle();
        return true;
      }
    });
  };

  const register = ({ id, load, unload, estimateBytes = 0, priority = 0 } = {}) => {
    const key = String(id ?? "");
    if (disposed) throw new Error("O gerenciador de recursos já foi encerrado.");
    if (!validId(key)) throw new TypeError("O recurso precisa de um ID estável válido.");
    if (typeof load !== "function") throw new TypeError("O recurso precisa fornecer load().");
    if (unload !== undefined && typeof unload !== "function") throw new TypeError("unload() precisa ser uma função.");
    if (entries.has(key)) throw new Error("Recurso já registrado: " + key);
    entries.set(key, {
      id: key, load, unload, estimatedBytes: safeBytes(estimateBytes),
      priority: Number.isFinite(Number(priority)) ? Number(priority) : 0,
      state: "registered", value: undefined, references: 0, pins: 0,
      residentBytes: 0, lastUsed: now(), lastError: "", loadPromise: null, unloadPromise: null
    });
    return key;
  };

  const acquire = async (id, { priority } = {}) => {
    const entry = requireEntry(id);
    if (disposed) throw new Error("O gerenciador de recursos já foi encerrado.");
    entry.references++;
    if (Number.isFinite(Number(priority))) entry.priority = Number(priority);
    try {
      const value = await loadEntry(entry);
      entry.lastUsed = now();
      return createLease(entry, "reference", value);
    } catch (error) {
      entry.references = Math.max(0, entry.references - 1);
      throw error;
    }
  };

  const preload = async (id, { priority = 10 } = {}) => {
    const entry = requireEntry(id);
    if (disposed) throw new Error("O gerenciador de recursos já foi encerrado.");
    entry.pins++;
    entry.priority = Number.isFinite(Number(priority)) ? Number(priority) : entry.priority;
    try {
      const value = await loadEntry(entry);
      entry.lastUsed = now();
      return createLease(entry, "pin", value);
    } catch (error) {
      entry.pins = Math.max(0, entry.pins - 1);
      throw error;
    }
  };

  const trim = async ({ maxBytes = idleLimit } = {}) => {
    const target = Math.min(residentLimit, safeBytes(maxBytes));
    await trimInternal(target);
    return stats();
  };

  const unregister = async id => {
    const entry = requireEntry(id);
    if (entry.state === "unloading" && entry.unloadPromise) await entry.unloadPromise;
    if (entry.references || entry.pins || entry.state === "loading") {
      throw new Error("Não é possível remover um recurso que está em uso ou sendo carregado.");
    }
    if (entry.state === "ready" && !(await unloadEntry(entry))) {
      throw new Error("Não foi possível descarregar o recurso antes de removê-lo.");
    }
    entries.delete(entry.id);
    return true;
  };

  const stats = () => {
    const states = { registered: 0, loading: 0, ready: 0, unloading: 0 };
    let referenced = 0, pinned = 0;
    for (const entry of entries.values()) {
      states[entry.state] = (states[entry.state] ?? 0) + 1;
      referenced += entry.references;
      pinned += entry.pins;
    }
    return Object.freeze({
      resourceCount: entries.size, states, residentBytes, reservedBytes,
      maxResidentBytes: residentLimit, maxIdleBytes: idleLimit,
      activeLoads, maxConcurrentLoads: concurrentLimit, references: referenced, pins: pinned
    });
  };

  const get = id => {
    const entry = requireEntry(id);
    return Object.freeze({
      id: entry.id, state: entry.state, estimatedBytes: entry.estimatedBytes,
      residentBytes: entry.residentBytes, references: entry.references, pins: entry.pins,
      priority: entry.priority, lastUsed: entry.lastUsed, lastError: entry.lastError
    });
  };

  const dispose = async () => {
    disposed = true;
    const pending = [];
    let unloaded = 0;
    for (const entry of entries.values()) {
      if (entry.references || entry.pins || entry.state === "loading") { pending.push(entry.id); continue; }
      if (entry.state === "ready" && await unloadEntry(entry)) unloaded++;
    }
    return Object.freeze({ unloaded, pending });
  };

  return Object.freeze({ register, acquire, preload, trim, unregister, get, stats, dispose });
}

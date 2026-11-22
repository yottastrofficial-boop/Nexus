/**
 * NEXUS Library Store — contrato unificado de coleções reutilizáveis.
 *
 * Este módulo é independente do Foundry e trabalha apenas com dados JSON.
 * Conteúdo HTML/CSS/JS avançado, quando suportado futuramente, permanece texto
 * inerte durante importação; este serviço nunca executa conteúdo importado.
 */
export const NEXUS_LIBRARY_SCHEMA_VERSION = 2;
export const NEXUS_LIBRARY_COLLECTIONS = Object.freeze([
  "components", "groups", "layouts", "templates", "assets", "media",
  "themes", "styles", "rules", "behaviors", "flows"
]);
const COLLECTION_LIMITS = Object.freeze({
  components: 500, groups: 250, layouts: 100, templates: 100,
  assets: 500, media: 500, themes: 100, styles: 250,
  rules: 250, behaviors: 500, flows: 500
});
const FORBIDDEN_KEYS = new Set(["__proto__", "prototype", "constructor"]);
const MAX_DEPTH = 16;
const MAX_STRING = 100_000;
const libraryWriteQueues = new WeakMap();

function enqueueLibraryWrite(user, operation) {
  if (!user || (typeof user !== "object" && typeof user !== "function")) {
    throw new Error("Não foi possível identificar o usuário da Biblioteca.");
  }
  const previous = libraryWriteQueues.get(user) ?? Promise.resolve();
  const pending = previous.catch(() => {}).then(operation);
  libraryWriteQueues.set(user, pending);
  return pending.finally(() => {
    if (libraryWriteQueues.get(user) === pending) libraryWriteQueues.delete(user);
  });
}

function cloneJson(value, depth = 0) {
  if (depth > MAX_DEPTH) throw new Error("A Biblioteca contém uma estrutura profunda demais.");
  if (value === null || typeof value === "boolean") return value;
  if (typeof value === "string") {
    if (value.length > MAX_STRING) throw new Error("Um texto da Biblioteca excede o limite permitido.");
    return value;
  }
  if (typeof value === "number") {
    if (!Number.isFinite(value)) throw new Error("A Biblioteca contém um número inválido.");
    return value;
  }
  if (Array.isArray(value)) {
    if (value.length > 2000) throw new Error("Uma lista da Biblioteca excede o limite permitido.");
    return value.map(item => cloneJson(item, depth + 1));
  }
  if (!value || typeof value !== "object" || Object.getPrototypeOf(value) !== Object.prototype) {
    throw new Error("A Biblioteca aceita somente dados JSON simples.");
  }
  const result = {};
  for (const [key, child] of Object.entries(value)) {
    if (FORBIDDEN_KEYS.has(key)) continue;
    result[key] = cloneJson(child, depth + 1);
  }
  return result;
}

const makeId = (prefix, index) => `${prefix}-${index + 1}`;
const entryIdentity = entry => String(entry?.sourceId ?? entry?.id ?? "").trim();
const stableValue = value => Array.isArray(value) ? value.map(stableValue) : value && typeof value === "object" ? Object.fromEntries(Object.keys(value).sort().map(key => [key, stableValue(value[key])])) : value;
const stableFingerprint = entry => JSON.stringify(stableValue(entry));

export function createEmptyNexusLibraryStore() {
  return {
    schemaVersion: NEXUS_LIBRARY_SCHEMA_VERSION,
    collections: Object.fromEntries(NEXUS_LIBRARY_COLLECTIONS.map(name => [name, []]))
  };
}

/** Validates and normalizes the unified store while retaining unknown future-safe metadata. */
export function normalizeNexusLibraryStore(raw = {}) {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) throw new Error("A Biblioteca possui um formato inválido.");
  if (Number(raw.schemaVersion ?? NEXUS_LIBRARY_SCHEMA_VERSION) > NEXUS_LIBRARY_SCHEMA_VERSION) {
    throw new Error("Esta Biblioteca foi criada por uma versão mais nova do NEXUS.");
  }
  const source = raw.collections && typeof raw.collections === "object" ? raw.collections : raw;
  const store = createEmptyNexusLibraryStore();

  // Metadados adicionados por versões compatíveis devem sobreviver à normalização.
  if (raw.collections && typeof raw.collections === "object") {
    for (const [key, value] of Object.entries(raw)) {
      if (key === "schemaVersion" || key === "collections" || NEXUS_LIBRARY_COLLECTIONS.includes(key) || FORBIDDEN_KEYS.has(key)) continue;
      store[key] = cloneJson(value);
    }
  }

  for (const name of NEXUS_LIBRARY_COLLECTIONS) {
    const entries = source[name] ?? [];
    if (!Array.isArray(entries)) throw new Error(`A coleção "${name}" precisa ser uma lista.`);
    if (entries.length > COLLECTION_LIMITS[name]) throw new Error(`A coleção "${name}" excede o limite de itens.`);
    store.collections[name] = entries.map((entry, index) => {
      if (!entry || typeof entry !== "object" || Array.isArray(entry)) throw new Error(`Um item da coleção "${name}" é inválido.`);
      const copy = cloneJson(entry);
      copy.id = String(copy.id ?? makeId(name.slice(0, -1) || "entry", index)).slice(0, 128);
      if (copy.sourceId !== undefined) copy.sourceId = String(copy.sourceId).slice(0, 128);
      return copy;
    });
  }
  return store;
}

/**
 * Migrates the legacy per-flag collections into one in-memory store.
 * The caller decides when to persist the returned value, so migration is explicit.
 */
export function migrateLegacyNexusLibrary(flags = {}) {
  const store = createEmptyNexusLibraryStore();
  const mapping = {
    components: "libraryComponents", groups: "libraryGroups", layouts: "libraryLayouts",
    assets: "libraryAssets", themes: "libraryThemes", styles: "libraryStyles",
    rules: "libraryRules", behaviors: "libraryBehaviors", media: "libraryMedia",
    templates: "libraryTemplates"
  };
  for (const [collection, flag] of Object.entries(mapping)) {
    if (Array.isArray(flags[flag])) store.collections[collection] = cloneJson(flags[flag]);
  }
  const flowEntries = Array.isArray(flags.interactionLibrary) ? flags.interactionLibrary : [];
  store.collections.flows = cloneJson(flowEntries);
  const customThemes = store.collections.themes;
  const themeMap = flags.themePalettes && typeof flags.themePalettes === "object" ? flags.themePalettes : {};
  for (const [sourceId, palette] of Object.entries(themeMap)) {
    if (!customThemes.some(item => String(item.sourceId ?? item.id) === sourceId)) {
      customThemes.push({ id: `theme-${sourceId}`, sourceId, name: sourceId, palette: cloneJson(palette) });
    }
  }
  return normalizeNexusLibraryStore(store);
}

/**
 * Merges imported entries without silently overwriting existing definitions.
 * Conflicts are reported by collection and identity; callers can present a UI
 * for skip/duplicate/replace in a later stage.
 */
export function mergeNexusLibraryStores(currentRaw, incomingRaw, options = {}) {
  const current = normalizeNexusLibraryStore(currentRaw);
  const incoming = normalizeNexusLibraryStore(incomingRaw);
  const mode = ["skip", "duplicate", "replace"].includes(options.conflictMode) ? options.conflictMode : "skip";
  const createId = typeof options.createId === "function" ? options.createId : ((collection, index) => makeId(collection.slice(0, -1) || "entry", index));
  const result = createEmptyNexusLibraryStore();
  for (const [key, value] of Object.entries(current)) {
    if (key !== "schemaVersion" && key !== "collections") result[key] = cloneJson(value);
  }
  const report = { added: {}, skipped: {}, replaced: {}, conflicts: [] };
  for (const collection of NEXUS_LIBRARY_COLLECTIONS) {
    const target = current.collections[collection].map(cloneJson);
    let added = 0, skipped = 0, replaced = 0;
    for (const candidateRaw of incoming.collections[collection]) {
      const candidate = cloneJson(candidateRaw);
      const identity = entryIdentity(candidate);
      const existingIndex = identity ? target.findIndex(item => entryIdentity(item) === identity) : -1;
      const fingerprintMatch = existingIndex < 0 ? target.findIndex(item => stableFingerprint(item) === stableFingerprint(candidate)) : -1;
      const conflictIndex = existingIndex >= 0 ? existingIndex : fingerprintMatch;
      if (conflictIndex < 0) {
        candidate.id = String(candidate.id || createId(collection, target.length));
        target.push(candidate); added++; continue;
      }
      report.conflicts.push({ collection, identity: identity || entryIdentity(target[conflictIndex]), existingId: target[conflictIndex].id, incomingId: candidate.id });
      if (mode === "replace") {
        candidate.id = target[conflictIndex].id;
        target[conflictIndex] = candidate; replaced++;
      } else if (mode === "duplicate") {
        candidate.id = String(createId(collection, target.length));
        if (candidate.sourceId) candidate.sourceId = `${candidate.sourceId}-copy-${target.length + 1}`;
        target.push(candidate); added++;
      } else skipped++;
    }
    if (target.length > COLLECTION_LIMITS[collection]) throw new Error(`A importação excederia o limite da coleção "${collection}".`);
    result.collections[collection] = target;
    report.added[collection] = added;
    report.skipped[collection] = skipped;
    report.replaced[collection] = replaced;
  }
  return { store: result, report };
}

/** Reads the canonical user flag or returns an explicit legacy migration preview. */
export function readNexusLibraryStore(user, legacyFlags = {}) {
  const canonical = user?.getFlag?.("nexus", "libraryStore");
  if (canonical) return { store: normalizeNexusLibraryStore(canonical), migrated: false };
  return { store: migrateLegacyNexusLibrary(legacyFlags), migrated: true };
}

/** Writes one canonical flag to avoid partial imports across many independent flags. */
export function writeNexusLibraryStore(user, raw) {
  if (typeof user?.setFlag !== "function") throw new Error("Não foi possível acessar o armazenamento pessoal da Biblioteca.");
  const store = normalizeNexusLibraryStore(raw);
  return enqueueLibraryWrite(user, async () => {
    await user.setFlag("nexus", "libraryStore", store);
    return store;
  });
}

/**
 * Applies a read-modify-write operation against the latest stored snapshot.
 * The updater runs inside the per-user queue to avoid stale full-store writes.
 */
export function updateNexusLibraryStore(user, updater) {
  if (typeof user?.setFlag !== "function") throw new Error("Não foi possível acessar o armazenamento pessoal da Biblioteca.");
  if (typeof updater !== "function") throw new TypeError("A atualização da Biblioteca precisa ser uma função.");
  return enqueueLibraryWrite(user, async () => {
    const { store } = readNexusLibraryStore(user, getLegacyNexusLibraryFlags(user));
    const result = await updater(store);
    const saved = normalizeNexusLibraryStore(result ?? store);
    await user.setFlag("nexus", "libraryStore", saved);
    return saved;
  });
}

const LEGACY_LIBRARY_FLAG_BY_COLLECTION = Object.freeze({
  components: "libraryComponents", groups: "libraryGroups", layouts: "libraryLayouts",
  templates: "libraryTemplates", assets: "libraryAssets", media: "libraryMedia",
  themes: "libraryThemes", styles: "libraryStyles", rules: "libraryRules",
  behaviors: "libraryBehaviors", flows: "interactionLibrary"
});

/** Reads every legacy collection only when the canonical store has not been created yet. */
export function getLegacyNexusLibraryFlags(user) {
  return Object.fromEntries(Object.values(LEGACY_LIBRARY_FLAG_BY_COLLECTION).map(flag => [
    flag, user?.getFlag?.("nexus", flag)
  ]));
}

/** Returns one collection from the canonical store, migrating legacy flags in memory when needed. */
export function readNexusLibraryCollection(user, collection) {
  if (!NEXUS_LIBRARY_COLLECTIONS.includes(collection)) throw new Error(`Coleção desconhecida: ${collection}`);
  const { store, migrated } = readNexusLibraryStore(user, getLegacyNexusLibraryFlags(user));
  return { entries: store.collections[collection], store, migrated };
}

/**
 * Saves a collection atomically in the canonical store and mirrors its legacy
 * flag for compatibility with older NEXUS builds and existing sheet listeners.
 * Writes for one user are serialized to prevent stale snapshots overwriting
 * another collection when two UI operations finish at nearly the same time.
 */
export function writeNexusLibraryCollection(user, collection, entries) {
  if (!NEXUS_LIBRARY_COLLECTIONS.includes(collection)) throw new Error("Coleção desconhecida: " + collection);
  if (!Array.isArray(entries)) throw new Error("A coleção \"" + collection + "\" precisa ser uma lista.");
  if (typeof user?.setFlag !== "function") throw new Error("Não foi possível acessar o armazenamento pessoal da Biblioteca.");

  return enqueueLibraryWrite(user, async () => {
    const { store } = readNexusLibraryStore(user, getLegacyNexusLibraryFlags(user));
    store.collections[collection] = entries;
    const saved = normalizeNexusLibraryStore(store);
    await user.setFlag("nexus", "libraryStore", saved);
    const legacyFlag = LEGACY_LIBRARY_FLAG_BY_COLLECTION[collection];
    if (legacyFlag) await user.setFlag("nexus", legacyFlag, saved.collections[collection]);
    return saved.collections[collection];
  });
}

import { normalizeLogicAsset } from "./logic-registry.js";
import { getLegacyNexusLibraryFlags, readNexusLibraryStore, updateNexusLibraryStore } from "./library-store.js";

const COLLECTION_BY_TYPE = Object.freeze({
  property: "properties", rule: "rules", behavior: "behaviors", flow: "flows", function: "functions"
});
const LEGACY_FLAG_BY_COLLECTION = Object.freeze({
  properties: "libraryProperties", rules: "libraryRules", behaviors: "libraryBehaviors",
  flows: "interactionLibrary", functions: "libraryFunctions"
});
const VALID_ID = /^[a-z0-9][a-z0-9._:-]{2,159}$/i;

function wrapLegacyAsset(raw, type, index) {
  const originalId = String(raw?.id ?? raw?.sourceId ?? "").trim();
  const id = VALID_ID.test(originalId) ? originalId : "nexus.personal." + type + ".legacy-" + (index + 1);
  const payload = raw?.payload && typeof raw.payload === "object" && !Array.isArray(raw.payload)
    ? raw.payload
    : type === "flow" && raw?.flow && typeof raw.flow === "object"
      ? raw.flow
      : raw;
  return normalizeLogicAsset({
    id,
    namespace: raw?.namespace ?? id.split(".").slice(0, 2).join("."),
    type,
    schemaVersion: raw?.schemaVersion ?? 1,
    name: raw?.name ?? raw?.label ?? raw?.title ?? (type + " " + (index + 1)),
    description: raw?.description ?? "",
    origin: ["core", "personal", "module", "addon"].includes(String(raw?.origin ?? "").toLowerCase())
      ? String(raw.origin).toLowerCase() : "personal",
    packageVersion: raw?.packageVersion ?? "",
    tags: raw?.tags ?? [],
    enabled: raw?.enabled !== false,
    dependencies: raw?.dependencies ?? [],
    permissions: raw?.permissions ?? [],
    payload
  });
}

/** Loads legacy and canonical Library collections as typed logic assets without persisting migrations. */
export function loadLogicLibrary(user, registry) {
  if (!user || !registry || typeof registry.register !== "function") throw new TypeError("Usuário e LogicRegistry são obrigatórios.");
  const { store, migrated } = readNexusLibraryStore(user, getLegacyNexusLibraryFlags(user));
  const loaded = [], errors = [];
  for (const [type, collection] of Object.entries(COLLECTION_BY_TYPE)) {
    for (const [index, raw] of store.collections[collection].entries()) {
      try {
        const asset = wrapLegacyAsset(raw, type, index);
        registry.register(asset, { replace: true });
        loaded.push(asset.id);
      } catch (error) {
        errors.push({ collection, index, id: raw?.id ?? null, message: String(error?.message ?? error) });
      }
    }
  }
  return { loaded, errors, migratedPreview: migrated };
}

/** Saves a typed logic asset to its canonical Library collection. */
export async function saveLogicAsset(user, raw) {
  const asset = normalizeLogicAsset(raw);
  const collection = COLLECTION_BY_TYPE[asset.type];
  const savedStore = await updateNexusLibraryStore(user, store => {
    const entries = store.collections[collection];
    const index = entries.findIndex(item => String(item.id) === asset.id);
    const serialized = {
      id: asset.id, namespace: asset.namespace, type: asset.type,
      schemaVersion: asset.schemaVersion, name: asset.name, description: asset.description,
      origin: asset.origin, packageVersion: asset.packageVersion, tags: [...asset.tags],
      enabled: asset.enabled, dependencies: asset.dependencies.map(item => ({ ...item })),
      permissions: [...asset.permissions], payload: asset.payload
    };
    if (index < 0) entries.push(serialized);
    else entries[index] = serialized;
    return store;
  });
  const legacyFlag = LEGACY_FLAG_BY_COLLECTION[collection];
  if (legacyFlag && typeof user?.setFlag === "function") {
    await user.setFlag("nexus", legacyFlag, savedStore.collections[collection]);
  }
  return asset;
}

/** Removes a logic asset only when no other registered asset depends on it. */
export async function deleteLogicAsset(user, registry, id) {
  const asset = registry?.get?.(id);
  if (!asset) return { removed: false, id: String(id ?? "") };
  const dependents = registry.getDependents(id);
  if (dependents.length) throw new Error("Ativo lógico possui dependentes: " + dependents.map(item => item.id).join(", "));
  const collection = COLLECTION_BY_TYPE[asset.type];
  await updateNexusLibraryStore(user, store => {
    store.collections[collection] = store.collections[collection].filter(item => String(item.id) !== asset.id);
    return store;
  });
  registry.remove(asset.id);
  const legacyFlag = LEGACY_FLAG_BY_COLLECTION[collection];
  if (legacyFlag && typeof user?.setFlag === "function") {
    const { store } = readNexusLibraryStore(user, getLegacyNexusLibraryFlags(user));
    await user.setFlag("nexus", legacyFlag, store.collections[collection]);
  }
  return { removed: true, id: asset.id };
}

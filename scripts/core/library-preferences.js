/**
 * User-local organization metadata for the NEXUS Library.
 * Kept separate from reusable definitions so folders/favorites never mutate assets.
 */
const MAX_FOLDERS = 100;
const MAX_RECENT = 30;
const MAX_FAVORITES = 500;
const MAX_COLLECTIONS = 100;
const MAX_COLLECTION_RESOURCES = 1000;
const cleanText = (value, limit = 80) => String(value ?? "").trim().slice(0, limit);
const referenceKey = (collection, entryId) => `${String(collection ?? "")}:${String(entryId ?? "")}`;

export function createEmptyLibraryPreferences() {
  return { schemaVersion: 2, folders: [], assignments: {}, favorites: [], recent: [], collections: [] };
}

export function normalizeLibraryPreferences(raw = {}) {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return createEmptyLibraryPreferences();
  const source = [1, 2].includes(raw.schemaVersion) ? raw : {};
  const folders = Array.isArray(source.folders) ? source.folders : [];
  const assignments = source.assignments && typeof source.assignments === "object" && !Array.isArray(source.assignments) ? source.assignments : {};
  const favorites = Array.isArray(source.favorites) ? source.favorites : [];
  const recent = Array.isArray(source.recent) ? source.recent : [];
  const collections = Array.isArray(source.collections) ? source.collections : [];
  return {
    schemaVersion: 2,
    folders: [...new Map(folders.map(folder => {
      const id = cleanText(folder?.id, 64);
      return [id, id ? { id, name: cleanText(folder?.name) || "Pasta sem nome", collection: cleanText(folder?.collection, 32) } : null];
    }).filter(([id, value]) => id && value)).values()].slice(0, MAX_FOLDERS),
    assignments: Object.fromEntries(Object.entries(assignments).filter(([key, value]) => key.length <= 160 && typeof value === "string").map(([key, value]) => [key, cleanText(value, 64)])),
    favorites: [...new Set(favorites.filter(value => typeof value === "string" && value.length <= 160))].slice(0, MAX_FAVORITES),
    recent: [...new Set(recent.filter(value => typeof value === "string" && value.length <= 160))].slice(0, MAX_RECENT),
    collections: [...new Map(collections.map(collection => {
      const id = cleanText(collection?.id, 64);
      if (!id) return [null, null];
      const resources = Array.isArray(collection?.resources)
        ? [...new Set(collection.resources.filter(value => typeof value === "string" && value.length <= 160))].slice(0, MAX_COLLECTION_RESOURCES)
        : [];
      return [id, {
        id,
        name: cleanText(collection?.name) || "Coleção sem nome",
        description: cleanText(collection?.description, 240),
        resources
      }];
    }).filter(([id, value]) => id && value)).values()].slice(0, MAX_COLLECTIONS)
  };
}

export function createLibraryFolder(raw, { id, name, collection = "" } = {}) {
  const preferences = normalizeLibraryPreferences(raw);
  const cleanName = cleanText(name);
  if (!cleanName) throw new Error("Informe um nome para a pasta.");
  if (preferences.folders.some(folder => folder.name.toLocaleLowerCase("pt-BR") === cleanName.toLocaleLowerCase("pt-BR") && folder.collection === cleanText(collection, 32))) {
    throw new Error("Já existe uma pasta com esse nome nesta coleção.");
  }
  if (preferences.folders.length >= MAX_FOLDERS) throw new Error("A Biblioteca atingiu o limite de pastas.");
  const folder = { id: cleanText(id, 64) || `folder-${preferences.folders.length + 1}`, name: cleanName, collection: cleanText(collection, 32) };
  preferences.folders.push(folder);
  return { preferences, folder };
}

export function assignLibraryEntryFolder(raw, collection, entryId, folderId = "") {
  const preferences = normalizeLibraryPreferences(raw);
  const key = referenceKey(collection, entryId);
  if (!collection || !entryId) throw new Error("Referência de item inválida.");
  if (folderId && !preferences.folders.some(folder => folder.id === folderId && (!folder.collection || folder.collection === collection))) {
    throw new Error("A pasta selecionada não pertence a esta coleção.");
  }
  if (folderId) preferences.assignments[key] = folderId;
  else delete preferences.assignments[key];
  return preferences;
}

export function toggleLibraryFavorite(raw, collection, entryId) {
  const preferences = normalizeLibraryPreferences(raw);
  const key = referenceKey(collection, entryId);
  const index = preferences.favorites.indexOf(key);
  if (index >= 0) preferences.favorites.splice(index, 1);
  else {
    preferences.favorites.unshift(key);
    preferences.favorites = preferences.favorites.slice(0, MAX_FAVORITES);
  }
  return preferences;
}

export function recordLibraryRecent(raw, collection, entryId) {
  const preferences = normalizeLibraryPreferences(raw);
  const key = referenceKey(collection, entryId);
  preferences.recent = [key, ...preferences.recent.filter(item => item !== key)].slice(0, MAX_RECENT);
  return preferences;
}

export function renameLibraryFolder(raw, folderId, name) {
  const preferences = normalizeLibraryPreferences(raw);
  const folder = preferences.folders.find(item => item.id === folderId);
  if (!folder) throw new Error("A pasta selecionada não existe.");
  const cleanName = cleanText(name);
  if (!cleanName) throw new Error("Informe um nome para a pasta.");
  if (preferences.folders.some(item =>
    item.id !== folderId &&
    item.collection === folder.collection &&
    item.name.toLocaleLowerCase("pt-BR") === cleanName.toLocaleLowerCase("pt-BR")
  )) {
    throw new Error("Já existe uma pasta com esse nome nesta coleção.");
  }
  folder.name = cleanName;
  return preferences;
}

export function createLibraryCollection(raw, { id, name, description = "" } = {}) {
  const preferences = normalizeLibraryPreferences(raw);
  const cleanName = cleanText(name);
  if (!cleanName) throw new Error("Informe um nome para a coleção.");
  if (preferences.collections.some(collection => collection.name.toLocaleLowerCase("pt-BR") === cleanName.toLocaleLowerCase("pt-BR"))) {
    throw new Error("Já existe uma coleção com esse nome.");
  }
  if (preferences.collections.length >= MAX_COLLECTIONS) throw new Error("A Biblioteca atingiu o limite de coleções.");
  const collection = {
    id: cleanText(id, 64) || "collection-" + (preferences.collections.length + 1),
    name: cleanName,
    description: cleanText(description, 240),
    resources: []
  };
  preferences.collections.push(collection);
  return { preferences, collection };
}

export function renameLibraryCollection(raw, collectionId, name) {
  const preferences = normalizeLibraryPreferences(raw);
  const collection = preferences.collections.find(item => item.id === collectionId);
  if (!collection) throw new Error("A coleção selecionada não existe.");
  const cleanName = cleanText(name);
  if (!cleanName) throw new Error("Informe um nome para a coleção.");
  if (preferences.collections.some(item =>
    item.id !== collectionId && item.name.toLocaleLowerCase("pt-BR") === cleanName.toLocaleLowerCase("pt-BR")
  )) throw new Error("Já existe uma coleção com esse nome.");
  collection.name = cleanName;
  return preferences;
}

export function toggleLibraryCollectionResource(raw, collectionId, resourceKey) {
  const preferences = normalizeLibraryPreferences(raw);
  const collection = preferences.collections.find(item => item.id === collectionId);
  const key = cleanText(resourceKey, 160);
  if (!collection) throw new Error("A coleção selecionada não existe.");
  if (!key) throw new Error("Referência de recurso inválida.");
  const index = collection.resources.indexOf(key);
  if (index >= 0) collection.resources.splice(index, 1);
  else {
    if (collection.resources.length >= MAX_COLLECTION_RESOURCES) throw new Error("A coleção atingiu o limite de recursos.");
    collection.resources.push(key);
  }
  return preferences;
}

export function removeLibraryCollection(raw, collectionId) {
  const preferences = normalizeLibraryPreferences(raw);
  preferences.collections = preferences.collections.filter(collection => collection.id !== collectionId);
  return preferences;
}

export function removeLibraryFolder(raw, folderId) {
  const preferences = normalizeLibraryPreferences(raw);
  preferences.folders = preferences.folders.filter(folder => folder.id !== folderId);
  for (const [key, value] of Object.entries(preferences.assignments)) if (value === folderId) delete preferences.assignments[key];
  return preferences;
}

/**
 * User-local organization metadata for the NEXUS Library.
 * Kept separate from reusable definitions so folders/favorites never mutate assets.
 */
const MAX_FOLDERS = 250;
const MAX_RECENT = 30;
const MAX_FAVORITES = 500;
const MAX_COLLECTIONS = 100;
const MAX_COLLECTION_RESOURCES = 1000;
const cleanText = (value, limit = 80) => String(value ?? "").trim().slice(0, limit);
const referenceKey = (collection, entryId) => `${String(collection ?? "")}:${String(entryId ?? "")}`;

export function createEmptyLibraryPreferences() {
  return { schemaVersion: 4, baseFoldersInitialized: false, folders: [], assignments: {}, favorites: [], recent: [], collections: [], shortcuts: [] };
}

export function normalizeLibraryPreferences(raw = {}) {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return createEmptyLibraryPreferences();
  const source = [1, 2, 3, 4].includes(raw.schemaVersion) ? raw : {};
  const rawFolders = Array.isArray(source.folders) ? source.folders : [];
  const assignments = source.assignments && typeof source.assignments === "object" && !Array.isArray(source.assignments) ? source.assignments : {};
  const favorites = Array.isArray(source.favorites) ? source.favorites : [];
  const recent = Array.isArray(source.recent) ? source.recent : [];
  const collections = Array.isArray(source.collections) ? source.collections : [];
  const shortcuts = Array.isArray(source.shortcuts) ? source.shortcuts : [];
  const folders = [...new Map(rawFolders.map(folder => {
    const id = cleanText(folder?.id, 64);
    return [id, id ? {
      id,
      name: cleanText(folder?.name) || "Pasta sem nome",
      collection: cleanText(folder?.collection, 32),
      parentId: cleanText(folder?.parentId, 64),
      isDefault: folder?.isDefault === true
    } : null];
  }).filter(([id, value]) => id && value)).values()].slice(0, MAX_FOLDERS);
  const folderById = new Map(folders.map(folder => [folder.id, folder]));
  for (const folder of folders) {
    const parent = folderById.get(folder.parentId);
    if (!parent || parent.id === folder.id || parent.collection !== folder.collection) folder.parentId = "";
  }
  // Repair corrupt legacy/imported cycles deterministically instead of hiding the tree.
  for (const folder of folders) {
    const visited = new Set([folder.id]);
    let parentId = folder.parentId;
    while (parentId) {
      if (visited.has(parentId)) {
        folder.parentId = "";
        break;
      }
      visited.add(parentId);
      parentId = folderById.get(parentId)?.parentId ?? "";
    }
  }
  const validFolderIds = new Set(folders.map(folder => folder.id));
  return {
    schemaVersion: 4,
    baseFoldersInitialized: source.baseFoldersInitialized === true,
    folders,
    assignments: Object.fromEntries(Object.entries(assignments)
      .filter(([key, value]) => key.length <= 160 && typeof value === "string" && validFolderIds.has(value))
      .map(([key, value]) => [key, cleanText(value, 64)])),
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
    }).filter(([id, value]) => id && value)).values()].slice(0, MAX_COLLECTIONS),
    shortcuts: [...new Map(shortcuts.map(shortcut => {
      const id = cleanText(shortcut?.id, 64);
      const resourceKey = cleanText(shortcut?.resourceKey, 160);
      const providerId = cleanText(shortcut?.reference?.providerId, 64);
      const referenceId = cleanText(shortcut?.reference?.id ?? shortcut?.reference?.uuid, 160);
      if (!id || !resourceKey || !providerId || !referenceId) return [null, null];
      return [id, {
        id,
        name: cleanText(shortcut?.name) || "Atalho sem nome",
        resourceKey,
        reference: { providerId, id: referenceId },
        folderId: validFolderIds.has(cleanText(shortcut?.folderId, 64)) ? cleanText(shortcut?.folderId, 64) : ""
      }];
    }).filter(([id, value]) => id && value)).values()].slice(0, 100)
  };
}

export function createLibraryFolder(raw, { id, name, collection = "", parentId = "" } = {}) {
  const preferences = normalizeLibraryPreferences(raw);
  const cleanName = cleanText(name);
  const cleanCollection = cleanText(collection, 32);
  const cleanParentId = cleanText(parentId, 64);
  if (!cleanName) throw new Error("Informe um nome para a pasta.");
  const parent = cleanParentId ? preferences.folders.find(folder => folder.id === cleanParentId) : null;
  if (cleanParentId && (!parent || parent.collection !== cleanCollection)) {
    throw new Error("A pasta superior não pertence a esta coleção.");
  }
  if (preferences.folders.some(folder =>
    folder.name.toLocaleLowerCase("pt-BR") === cleanName.toLocaleLowerCase("pt-BR") &&
    folder.collection === cleanCollection && folder.parentId === cleanParentId
  )) throw new Error("Já existe uma pasta com esse nome neste local.");
  if (preferences.folders.length >= MAX_FOLDERS) throw new Error("A Biblioteca atingiu o limite de pastas.");
  const folderId = cleanText(id, 64) || `folder-${preferences.folders.length + 1}`;
  if (preferences.folders.some(folder => folder.id === folderId)) throw new Error("Já existe uma pasta com este identificador.");
  const folder = { id: folderId, name: cleanName, collection: cleanCollection, parentId: cleanParentId };
  preferences.folders.push(folder);
  return { preferences, folder };
}

const LIBRARY_BASE_TREE = [
  ["atores", "Atores", [
    ["atores-conteudo", "Atores", []],
    ["atores-assets", "Assets", [["atores-retratos", "Retratos", []], ["atores-tokens", "Tokens", []], ["atores-icones", "Ícones", []], ["atores-assets-outros", "Outros assets", []]]],
    ["atores-layouts", "Layouts", []],
    ["atores-modelos-ficha", "Modelos de ficha", []],
    ["atores-relacionados", "Recursos relacionados", []]
  ]],
  ["itens", "Itens", [
    ["itens-classes", "Classes", []], ["itens-origens", "Origens", []], ["itens-legados", "Legados", []], ["itens-acoes", "Ações", []],
    ["itens-equipamentos", "Equipamentos", [
      ["itens-armas", "Armas", []], ["itens-armaduras", "Armaduras", []], ["itens-consumiveis", "Consumíveis", []],
      ["itens-conteineres", "Contêineres", []], ["itens-equipamentos-outros", "Outros equipamentos", []]
    ]],
    ["itens-assets", "Assets", []], ["itens-layouts", "Layouts", []], ["itens-modelos", "Modelos de item", []], ["itens-relacionados", "Recursos relacionados", []]
  ]],
  ["cenas", "Cenas", [
    ["cenas-conteudo", "Cenas", []], ["cenas-mapas", "Mapas", []], ["cenas-elementos", "Elementos de mapa", []],
    ["cenas-placeables", "Elementos de cena", [
      ["cenas-tokens", "Tokens", []], ["cenas-tiles", "Tiles", []], ["cenas-desenhos", "Desenhos", []],
      ["cenas-paredes", "Paredes", []], ["cenas-luzes", "Luzes ambientes", []], ["cenas-sons", "Sons ambientes", []],
      ["cenas-notas", "Notas", []], ["cenas-modelos-medidos", "Modelos medidos", []], ["cenas-regioes", "Regiões", []],
      ["cenas-comportamentos-regiao", "Comportamentos de região", []]
    ]],
    ["cenas-assets", "Assets", []], ["cenas-modelos", "Modelos de cena", []]
  ]],
  ["documentos", "Documentos", [
    ["documentos-regras", "Regras", []], ["documentos-lore", "Lore", []], ["documentos-aventuras", "Aventuras", []],
    ["documentos-missoes", "Missões", []], ["documentos-personagens", "Personagens e NPCs", []],
    ["documentos-locais", "Locais", []], ["documentos-referencias", "Referências", []]
  ]],
  ["baralhos", "Baralhos", [["baralhos-cartas", "Cartas", []], ["baralhos-assets", "Assets", []], ["baralhos-modelos", "Modelos", []]]],
  ["tabelas-rolagem", "Tabelas de rolagem", [["tabelas-conteudo", "Tabelas", []], ["tabelas-modelos", "Modelos", []]]],
  ["audio", "Áudio", [["audio-playlists", "Playlists", []], ["audio-musica", "Música", []], ["audio-ambientes", "Ambientes", []], ["audio-efeitos", "Efeitos sonoros", []], ["audio-assets", "Assets de áudio", []]]],
  ["compendios", "Compêndios", [["compendios-nexus", "Compêndios NEXUS", []], ["compendios-mundo", "Compêndios do mundo", []], ["compendios-referencias", "Referências externas", []]]],
  ["macros", "Macros", []],
  ["assets-globais", "Assets globais", [["assets-imagens", "Imagens", []], ["assets-icones", "Ícones", []], ["assets-texturas", "Texturas", []], ["assets-fontes", "Fontes", []], ["assets-outros", "Outros arquivos", []]]],
  ["nexus", "NEXUS", [["nexus-layouts", "Layouts", []], ["nexus-componentes", "Componentes", []], ["nexus-temas", "Temas", []], ["nexus-templates", "Templates", []], ["nexus-regras", "Regras", []], ["nexus-comportamentos", "Comportamentos", []], ["nexus-extensoes", "Extensões", []]]]
];

/** Adds the initial domain-based tree once, without overwriting or reclassifying user folders. */
export function ensureLibraryDefaultFolders(raw) {
  const preferences = normalizeLibraryPreferences(raw);
  if (preferences.baseFoldersInitialized) return preferences;
  const ensureNodes = (nodes, parentId = "") => {
    for (const [key, name, children] of nodes) {
      const id = "nexus-base-" + key;
      let folder = preferences.folders.find(item => item.id === id);
      if (!folder) folder = preferences.folders.find(item =>
        item.parentId === parentId && item.collection === "" &&
        item.name.toLocaleLowerCase("pt-BR") === name.toLocaleLowerCase("pt-BR")
      );
      if (!folder) {
        const created = createLibraryFolder(preferences, { id, name, collection: "", parentId });
        Object.assign(preferences, created.preferences);
        folder = created.folder;
      }
      folder.isDefault = true;
      ensureNodes(children, folder.id);
    }
  };
  ensureNodes(LIBRARY_BASE_TREE);
  preferences.baseFoldersInitialized = true;
  return normalizeLibraryPreferences(preferences);
}

/** Creates a personal shortcut to a catalog resource; it never clones the source document. */
export function createLibraryShortcut(raw, { id, name, resourceKey, reference, folderId = "" } = {}) {
  const preferences = normalizeLibraryPreferences(raw);
  const key = cleanText(resourceKey, 160);
  const providerId = cleanText(reference?.providerId, 64);
  const referenceId = cleanText(reference?.id ?? reference?.uuid, 160);
  const cleanNameValue = cleanText(name);
  if (!key || !providerId || !referenceId || !cleanNameValue) throw new Error("Informe um nome e uma referência válida para o atalho.");
  if (folderId && !preferences.folders.some(folder => folder.id === folderId)) throw new Error("A pasta do atalho não existe.");
  const shortcutId = cleanText(id, 64) || "shortcut-" + (globalThis.foundry?.utils?.randomID?.(8) ?? Math.random().toString(36).slice(2, 10));
  if (preferences.shortcuts.some(item => item.id === shortcutId)) throw new Error("Já existe um atalho com este identificador.");
  preferences.shortcuts.push({ id: shortcutId, name: cleanNameValue, resourceKey: key, reference: { providerId, id: referenceId }, folderId });
  preferences.shortcuts = preferences.shortcuts.slice(-100);
  return { preferences, shortcut: preferences.shortcuts.at(-1) };
}

export function removeLibraryShortcut(raw, shortcutId) {
  const preferences = normalizeLibraryPreferences(raw);
  preferences.shortcuts = preferences.shortcuts.filter(item => item.id !== shortcutId);
  return preferences;
}

/** Duplicates a folder tree as organization metadata only; resource documents are never copied. */
export function duplicateLibraryFolderTree(raw, folderId, { parentId = "", idPrefix = "copy" } = {}) {
  const preferences = normalizeLibraryPreferences(raw);
  const source = preferences.folders.find(folder => folder.id === folderId);
  if (!source) throw new Error("A pasta selecionada não existe.");
  const childrenOf = parent => preferences.folders.filter(folder => folder.parentId === parent);
  const makeId = original => (idPrefix + "-" + original + "-" + (globalThis.foundry?.utils?.randomID?.(5) ?? Math.random().toString(36).slice(2, 7))).slice(0, 64);
  const copyNode = (node, destinationParent, root = false) => {
    const baseName = root ? node.name + " (cópia)" : node.name;
    let name = baseName;
    let suffix = 2;
    while (preferences.folders.some(folder => folder.collection === node.collection && folder.parentId === destinationParent && folder.name.toLocaleLowerCase("pt-BR") === name.toLocaleLowerCase("pt-BR"))) {
      name = (root ? node.name + " (cópia " : node.name + " (") + suffix++ + ")";
    }
    const created = createLibraryFolder(preferences, { id: makeId(node.id), name, collection: node.collection, parentId: destinationParent });
    Object.assign(preferences, created.preferences);
    for (const child of childrenOf(node.id)) copyNode(child, created.folder.id, false);
    return created.folder;
  };
  const folder = copyNode(source, parentId, true);
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
    item.parentId === folder.parentId &&
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

export function moveLibraryFolder(raw, folderId, parentId = "") {
  const preferences = normalizeLibraryPreferences(raw);
  const folder = preferences.folders.find(item => item.id === folderId);
  if (!folder) throw new Error("A pasta selecionada não existe.");
  const nextParentId = cleanText(parentId, 64);
  const parent = nextParentId ? preferences.folders.find(item => item.id === nextParentId) : null;
  if (nextParentId && (!parent || parent.collection !== folder.collection)) {
    throw new Error("A pasta de destino não pertence à mesma coleção.");
  }
  if (nextParentId === folderId) throw new Error("Uma pasta não pode conter a si mesma.");
  let ancestor = parent;
  while (ancestor) {
    if (ancestor.id === folderId) throw new Error("Não é possível mover uma pasta para dentro de sua própria hierarquia.");
    ancestor = preferences.folders.find(item => item.id === ancestor.parentId);
  }
  if (preferences.folders.some(item =>
    item.id !== folderId && item.collection === folder.collection && item.parentId === nextParentId &&
    item.name.toLocaleLowerCase("pt-BR") === folder.name.toLocaleLowerCase("pt-BR")
  )) throw new Error("Já existe uma pasta com esse nome no destino.");
  folder.parentId = nextParentId;
  return preferences;
}

export function removeLibraryFolder(raw, folderId) {
  const preferences = normalizeLibraryPreferences(raw);
  const descendants = new Set([folderId]);
  let changed = true;
  while (changed) {
    changed = false;
    for (const folder of preferences.folders) {
      if (folder.parentId && descendants.has(folder.parentId) && !descendants.has(folder.id)) {
        descendants.add(folder.id);
        changed = true;
      }
    }
  }
  preferences.folders = preferences.folders.filter(folder => !descendants.has(folder.id));
  for (const [key, value] of Object.entries(preferences.assignments)) if (descendants.has(value)) delete preferences.assignments[key];
  return preferences;
}

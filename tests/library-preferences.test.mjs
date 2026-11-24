import test from "node:test";
import assert from "node:assert/strict";
import {
  createEmptyLibraryPreferences,
  createLibraryFolder,
  moveLibraryFolder,
  renameLibraryFolder,
  removeLibraryFolder,
  assignLibraryEntryFolder,
  toggleLibraryFavorite,
  recordLibraryRecent,
  createLibraryCollection,
  renameLibraryCollection,
  toggleLibraryCollectionResource,
  removeLibraryCollection,
  normalizeLibraryPreferences
} from "../scripts/core/library-preferences.js";

test("pastas universais podem ser criadas, renomeadas e removidas sem apagar recursos", () => {
  const initial = createEmptyLibraryPreferences();
  const created = createLibraryFolder(initial, { id: "folder-global", name: "Referências" });
  const assigned = assignLibraryEntryFolder(created.preferences, "foundry-documents", "Actor.abc", "folder-global");
  const renamed = renameLibraryFolder(assigned, "folder-global", "Documentos");
  assert.equal(renamed.folders[0].name, "Documentos");
  assert.equal(renamed.assignments["foundry-documents:Actor.abc"], "folder-global");

  const removed = removeLibraryFolder(renamed, "folder-global");
  assert.equal(removed.folders.length, 0);
  assert.equal(removed.assignments["foundry-documents:Actor.abc"], undefined);
});

test("pastas vinculadas a coleção preservam a restrição de escopo", () => {
  const created = createLibraryFolder(createEmptyLibraryPreferences(), {
    id: "folder-components",
    name: "Componentes",
    collection: "components"
  });
  assert.throws(
    () => assignLibraryEntryFolder(created.preferences, "foundry-documents", "Actor.abc", "folder-components"),
    /não pertence a esta coleção/
  );
});

test("favoritos e recentes aceitam identidades de provedores diferentes", () => {
  let preferences = createEmptyLibraryPreferences();
  preferences = toggleLibraryFavorite(preferences, "foundry-documents", "Actor.abc");
  preferences = recordLibraryRecent(preferences, "world-flows", "flow-1");
  assert.deepEqual(preferences.favorites, ["foundry-documents:Actor.abc"]);
  assert.deepEqual(preferences.recent, ["world-flows:flow-1"]);
});

test("coleções universais agrupam referências de provedores e tipos diferentes", () => {
  const legacy = { schemaVersion: 1, folders: [], assignments: {}, favorites: [], recent: [] };
  const migrated = normalizeLibraryPreferences(legacy);
  assert.equal(migrated.schemaVersion, 3);
  assert.deepEqual(migrated.collections, []);

  const created = createLibraryCollection(migrated, { id: "collection-session", name: "Sessão" });
  let preferences = toggleLibraryCollectionResource(created.preferences, "collection-session", "nexus-library:components:health");
  preferences = toggleLibraryCollectionResource(preferences, "collection-session", "foundry-documents:Actor.abc");
  preferences = toggleLibraryCollectionResource(preferences, "collection-session", "nexus-library:world-flows:flow-1");
  assert.equal(preferences.collections[0].resources.length, 3);

  preferences = renameLibraryCollection(preferences, "collection-session", "Preparação");
  assert.equal(preferences.collections[0].name, "Preparação");
  preferences = toggleLibraryCollectionResource(preferences, "collection-session", "foundry-documents:Actor.abc");
  assert.equal(preferences.collections[0].resources.length, 2);
  preferences = removeLibraryCollection(preferences, "collection-session");
  assert.equal(preferences.collections.length, 0);
});


test("pastas suportam hierarquia, movimentação e remoção recursiva sem ciclos", () => {
  const root = createLibraryFolder(createEmptyLibraryPreferences(), {
    id: "folder-root", name: "Assets"
  });
  const child = createLibraryFolder(root.preferences, {
    id: "folder-child", name: "Imagens", parentId: "folder-root"
  });
  const grandchild = createLibraryFolder(child.preferences, {
    id: "folder-grandchild", name: "Mapas", parentId: "folder-child"
  });
  assert.equal(grandchild.preferences.schemaVersion, 3);
  assert.equal(grandchild.folder.parentId, "folder-child");
  assert.throws(
    () => moveLibraryFolder(grandchild.preferences, "folder-root", "folder-grandchild"),
    /própria hierarquia/
  );
  const moved = moveLibraryFolder(grandchild.preferences, "folder-grandchild", "");
  assert.equal(moved.folders.find(folder => folder.id === "folder-grandchild").parentId, "");
  const assigned = assignLibraryEntryFolder(moved, "foundry-documents", "Actor.abc", "folder-child");
  const removed = removeLibraryFolder(assigned, "folder-root");
  assert.deepEqual(removed.folders.map(folder => folder.id), ["folder-grandchild"]);
  assert.equal(removed.assignments["foundry-documents:Actor.abc"], undefined);
});

test("normalização preserva pastas legadas como raiz e repara hierarquia inválida", () => {
  const migrated = normalizeLibraryPreferences({
    schemaVersion: 2,
    folders: [
      { id: "legacy", name: "Legada" },
      { id: "a", name: "A", parentId: "b" },
      { id: "b", name: "B", parentId: "a" },
      { id: "orphan", name: "Órfã", parentId: "missing" }
    ],
    assignments: {}
  });
  assert.equal(migrated.folders.find(folder => folder.id === "legacy").parentId, "");
  assert.equal(migrated.folders.find(folder => folder.id === "orphan").parentId, "");
  assert.equal(migrated.folders.filter(folder => folder.parentId === "").length, 3);
});

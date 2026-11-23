import test from "node:test";
import assert from "node:assert/strict";
import {
  createEmptyLibraryPreferences,
  createLibraryFolder,
  renameLibraryFolder,
  removeLibraryFolder,
  assignLibraryEntryFolder,
  toggleLibraryFavorite,
  recordLibraryRecent
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

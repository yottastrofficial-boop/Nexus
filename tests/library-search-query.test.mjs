import test from "node:test";
import assert from "node:assert/strict";
import { parseLibrarySearchQuery, matchesLibrarySearchQuery } from "../scripts/core/library-search-query.js";

test("interpreta texto livre, frases e qualificadores sem acentos", () => {
  const record = {
    name: "Bola de Fogo",
    type: "items",
    documentType: "spell",
    folder: "Magias Arcanas",
    pack: "world.core",
    packLabel: "Livro do Jogador",
    origin: "compendium",
    tags: ["items", "compendium"],
    searchText: "Bola de Fogo spell evocação dano flamejante"
  };
  assert.equal(matchesLibrarySearchQuery(record, '"bola de fogo" type:spell source:"livro do jogador"'), true);
  assert.equal(matchesLibrarySearchQuery(record, "folder:arcanas -tag:restricted"), true);
  assert.equal(matchesLibrarySearchQuery(record, "name:raio type:spell"), false);
  assert.equal(matchesLibrarySearchQuery(record, "source:monster"), false);
});

test("qualificadores desconhecidos permanecem como busca textual", () => {
  const record = { name: "Teste", searchText: "sourcecode exemplo", type: "items" };
  assert.equal(matchesLibrarySearchQuery(record, "sourcecode"), true);
  assert.equal(parseLibrarySearchQuery("type:spell tag:fire").length, 2);
});

test("consulta vazia corresponde a todos os documentos", () => {
  assert.equal(matchesLibrarySearchQuery({ name: "Qualquer coisa" }, ""), true);
});

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const manifest = JSON.parse(readFileSync(new URL("../system.json", import.meta.url), "utf8"));
const styles = readFileSync(new URL("../styles/nexus-universal-library.css", import.meta.url), "utf8");
const libraryTemplate = readFileSync(new URL("../templates/library/library.hbs", import.meta.url), "utf8");
const libraryApplication = readFileSync(new URL("../scripts/library/library-application.js", import.meta.url), "utf8");

assert.ok(manifest.styles.includes("styles/nexus-universal-library.css"),
  "A camada complementar deve ser carregada depois do stylesheet legado.");
assert.match(styles, /\.nexus-library-application \.nexus-library-workspace[\s\S]*?grid-template-columns: minmax\(0, 1fr\) var\(--nexus-library-inspector-width\)/,
  "A Biblioteca independente deve manter o Inspector lateral em desktop.");
assert.match(styles, /\.nexus-library-application \.nexus-library-details[\s\S]*?overflow: auto/,
  "O Inspector deve ter rolagem independente e não ser recortado.");
assert.match(styles, /@media \(max-width: 720px\)[\s\S]*?\.nexus-library-details/,
  "Em telas estreitas, o Inspector deve continuar acessível em painel responsivo.");
assert.match(styles, /#sidebar \.tab\.sidebar-tab\.nexus-themed-application\.active/,
  "Abas especializadas do Foundry devem receber estado ativo explícito.");
assert.match(styles, /#ui-left, #ui-top\) \.ui-control/,
  "Controles nativos de UI devem compartilhar a superfície visual flutuante do NEXUS.");
assert.match(libraryTemplate, /<option value="tables">RollTables<\/option>/,
  "O filtro de RollTables deve usar a chave declarada pelo Foundry Document Bridge.");
assert.doesNotMatch(libraryTemplate, /<option value="rolltables">RollTables<\/option>/,
  "A chave legada rolltables não deve impedir a filtragem do tipo tables.");
assert.match(styles, /:focus-visible/,
  "Os controles devem preservar foco visível para navegação por teclado.");

assert.match(libraryTemplate, /data-library-clear-search/,
  "The search field must provide an explicit accessible clear action.");
assert.match(libraryTemplate, /Buscar por nome, descrição ou etiqueta/,
  "The search hint must explain the searchable resource fields.");
assert.ok(libraryTemplate.includes('<details class="nexus-library-actions-menu">') &&
  libraryTemplate.includes('data-library-backup-export') &&
  libraryTemplate.includes('data-library-backup-import-file'),
  "Backup and restore actions must live in a compact overflow menu.");
assert.doesNotMatch(libraryTemplate, /nexus-library-header-actions" role="group" aria-label="Backup da Biblioteca"/,
  "Backup actions must no longer occupy the primary toolbar row.");
assert.ok(libraryApplication.includes('root.querySelector("[data-library-clear-search]")') &&
  libraryApplication.includes('searchClear?.addEventListener("click", clearSearch)'),
  "The search clear control must be wired to the library query state.");
assert.ok(libraryApplication.includes('event.key !== "Escape"') &&
  libraryApplication.includes('syncSearchClear();'),
  "Escape must clear an active search and keep the clear control synchronized.");

assert.ok(libraryApplication.includes("event.stopPropagation();\n        clearSearch();"),
  "Escape that clears the search must not also dismiss the window.");
assert.ok(libraryApplication.includes('root.querySelector(".nexus-library-actions-menu")') &&
  libraryApplication.includes('actionsMenu.addEventListener("focusout"') &&
  libraryApplication.includes('actionsMenu.querySelector("summary")?.focus()'),
  "The backup menu must close after an action, with Escape and when focus leaves it.");

console.log("NEXUS universal library UI contract: OK");

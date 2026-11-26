import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const manifest = JSON.parse(readFileSync(new URL("../system.json", import.meta.url), "utf8"));
const styles = readFileSync(new URL("../styles/nexus-universal-library.css", import.meta.url), "utf8");
const designSystem = readFileSync(new URL("../styles/nexus-design-system.css", import.meta.url), "utf8");
const libraryTemplate = readFileSync(new URL("../templates/library/library.hbs", import.meta.url), "utf8");
const libraryApplication = readFileSync(new URL("../scripts/library/library-application.js", import.meta.url), "utf8");
const catalogExplorer = readFileSync(new URL("../scripts/library/catalog-explorer.js", import.meta.url), "utf8");

const actorSheet = readFileSync(new URL("../scripts/sheets/actor-sheet-v1.0.0.js", import.meta.url), "utf8");
const actorListeners = readFileSync(new URL("../scripts/sheets/actor-sheet-listeners.js", import.meta.url), "utf8");
const documentBridge = readFileSync(new URL("../scripts/core/foundry-document-bridge.js", import.meta.url), "utf8");


assert.ok(manifest.styles.includes("styles/nexus-universal-library.css"),
  "A camada complementar deve ser carregada depois do stylesheet legado.");
assert.match(styles, /\.nexus-library-application \.nexus-library-workspace[\s\S]*?grid-template-columns: minmax\(0, 1fr\) var\(--nexus-library-inspector-width\)/,
  "A Biblioteca independente deve manter o Inspector lateral em desktop.");
assert.match(styles, /\.nexus-library-application \.nexus-library-details[\s\S]*?overflow: auto/,
  "O Inspector deve ter rolagem independente e não ser recortado.");
assert.match(styles, /@media \(max-width: 720px\)[\s\S]*?\.nexus-library-details/,
  "Em telas estreitas, o Inspector deve continuar acessível em painel responsivo.");
assert.match(designSystem, /#sidebar \.tab\.sidebar-tab\.nexus-themed-application\.active/,
  "Abas especializadas do Foundry devem receber estado ativo explícito.");
assert.doesNotMatch(styles, /#sidebar \.tab\.sidebar-tab\.nexus-themed-application/,
  "A Biblioteca Universal não deve estilizar o sidebar do Foundry.");
assert.doesNotMatch(styles, /#ui-left|#ui-top|#controls/,
  "A camada da Biblioteca não deve impor botões flutuantes aos controles nativos do Foundry.");
assert.match(libraryTemplate, /<option value="tables">RollTables<\/option>/,
  "O filtro de RollTables deve usar a chave declarada pelo Foundry Document Bridge.");
assert.doesNotMatch(libraryTemplate, /<option value="rolltables">RollTables<\/option>/,
  "A chave legada rolltables não deve impedir a filtragem do tipo tables.");
assert.match(designSystem, /:focus-visible/,
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

assert.ok(libraryApplication.includes("await DialogV2.input("),
  "DialogV2 input helpers must be invoked through their class to preserve the static receiver.");
assert.ok(libraryApplication.includes("await DialogV2.confirm("),
  "DialogV2 confirmation helpers must preserve their static receiver.");
assert.ok(!libraryApplication.includes("const input = globalThis.foundry?.applications?.api?.DialogV2?.input") &&
  !libraryApplication.includes("const prompt = globalThis.foundry?.applications?.api?.DialogV2?.input") &&
  !libraryApplication.includes("const confirm = globalThis.foundry?.applications?.api?.DialogV2?.confirm"),
  "DialogV2 static helpers must not be detached from their class.");
assert.ok(catalogExplorer.includes("thumbnailInput"),
  "Saved Library resources must expose a custom thumbnail metadata field.");
assert.ok(styles.includes(".nexus-library-search-wrap > .nexus-library-search"),
  "The search input must not render a second nested surface.");


assert.match(libraryTemplate, /aria-describedby="nexus-library-search-help"/,
  "The advanced search syntax must be discoverable to assistive technology.");
assert.match(catalogExplorer, /application\/x-nexus-library-resource/,
  "Library cards must preserve the NEXUS transfer payload.");
assert.match(catalogExplorer, /setData\("text\/plain", nativeData\)/,
  "Native Foundry documents must use the standard UUID drag contract.");
assert.match(actorListeners, /_addSavedLibraryComponent\(payload\.entryId, \{\}, position\)/,
  "Saved components must be insertable by dropping directly onto the Canvas.");
assert.match(actorListeners, /nexusLibraryCanvasDropBound/,
  "Canvas drop listeners must be bound once per rendered sheet root.");
assert.match(actorSheet, /position: \{ width: 800, height: 836 \}/,
  "The initial sheet window must preserve the canvas-plus-header geometry.");
assert.match(actorSheet, /window: \{ resizable: false \}/,
  "The character sheet window must retain the requested fixed dimensions.");
assert.match(documentBridge, /matchesLibrarySearchQuery/,
  "The Foundry bridge must use the structured search query engine.");
assert.match(documentBridge, /documentType: String\(entry\.type \?\? ""\)/,
  "Compendium index subtype must be retained for precise filtering.");
console.log("NEXUS library import/search contracts: OK");

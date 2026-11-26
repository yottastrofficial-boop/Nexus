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

assert.match(libraryApplication, /ensureLibraryDefaultFolders/,
  "The Library should initialize the user-editable base folder taxonomy once.");
assert.match(libraryTemplate, /data-library-create-new-toggle/,
  "The Library should expose a universal New action instead of a folder-only button.");
assert.match(libraryTemplate, /data-library-new-action="asset"/,
  "The New menu should provide asset import.");
assert.match(libraryTemplate, /data-library-new-action="shortcut"/,
  "The New menu should provide shortcuts.");
assert.match(libraryApplication, /FilePicker\.upload\("data", "nexus\/library"/,
  "Asset creation must use the Foundry upload service rather than a dead UI action.");
assert.match(libraryApplication, /showLibraryContextMenu/,
  "Folder and resource context menus should use an actual compact context menu.");
assert.match(libraryApplication, /duplicateLibraryFolderTree/,
  "Copying a folder should duplicate only its organization tree.");
assert.match(styles, /nexus-library-generic-card:has\(\.nexus-library-generic-item\.is-selected\)[\s\S]*?border-color:[\s\S]*?background: transparent !important/,
  "Selected resources should receive only a highlight border, without a filled card panel.");
assert.match(styles, /nexus-library-generic-preview[\s\S]*?aspect-ratio: 1 \/ 1/,
  "Resource previews should use a consistent square aspect ratio.");
console.log("NEXUS Library taxonomy and context actions contracts: OK");

assert.match(libraryTemplate, /data-library-tabs/,
  "The independent Library window should provide a browser-like tab strip.");
assert.match(libraryTemplate, /data-library-breadcrumbs/,
  "The Library should show a navigable Windows-style path.");
assert.ok(["data-library-history-back", "data-library-history-forward", "data-library-history-up"].every(attribute => libraryTemplate.includes(attribute)),
  "The path bar should expose back, forward and parent navigation.");
assert.doesNotMatch(libraryTemplate, /data-library-resize-sidebar|data-library-resize-inspector/,
  "The redesigned Explorer must not expose visible pane-resizer controls.");
assert.doesNotMatch(libraryTemplate, /nexus-tool-panel/,
  "The standalone Library must not be wrapped in an additional nested tool panel.");
assert.match(libraryApplication, /this\.window\?\.header[\s\S]*?nativeHeader\.prepend\(tabStrip\)/,
  "Browser tabs must be mounted in the native Foundry window header.");
assert.match(libraryApplication, /title: ""/,
  "The native window header must not repeat the Library title beside its tabs.");
assert.match(libraryTemplate, /data-library-sort/,
  "The command row must expose functional sorting.");
assert.match(catalogExplorer, /currentSortMode === "name-desc"/,
  "The catalog must apply the selected sorting mode.");
assert.match(libraryTemplate, /data-library-create-new-toggle[\s\S]*?data-library-create-new-menu/,
  "The New menu must be anchored in the command bar.");
assert.doesNotMatch(libraryTemplate, /<span>(Recortar|Copiar|Colar|Renomear|Excluir|Atualizar)<\/span>/,
  "Primary file commands must use compact icon-only controls.");
assert.match(libraryApplication, /createLibraryTabManager/,
  "The application should use a dedicated, testable tab/history manager.");
assert.match(styles, /--nexus-library-navigation-width/,
  "The folder navigation width should be controlled by a user-adjustable CSS variable.");
assert.match(styles, /--nexus-library-inspector-width/,
  "The Inspector width should be controlled by a user-adjustable CSS variable.");
console.log("NEXUS browser-style Library shell contract: OK");

assert.doesNotMatch(libraryApplication, /bindPanelResizer|_panelSizes/,
  "The redesigned Library must not retain unused resize-handle logic.");
assert.match(libraryApplication, /setAttribute\("aria-controls", childrenId\)/,
  "Folder disclosure buttons must identify the nested tree region they control.");
assert.match(styles, /folder-row > \.nexus-library-custom-folder::before[\s\S]*?content: none !important/,
  "Folder labels must not show a second decorative arrow beside the functional disclosure control.");
assert.match(styles, /folder-row > \.nexus-library-custom-folder[\s\S]*?min-height: 23px !important/,
  "Folder rows must use the compact density requested for parent and child folders.");
console.log("NEXUS Library accessibility and folder density contracts: OK");

assert.ok(libraryTemplate.includes('data-library-command="cut"') &&
  libraryTemplate.includes('data-library-command="copy"') &&
  libraryTemplate.includes('data-library-command="paste"') &&
  libraryTemplate.includes('data-library-command="rename"') &&
  libraryTemplate.includes('data-library-command="delete"'),
  "The editing toolbar must expose the requested common file operations.");
assert.ok(libraryApplication.includes('data-library-command="paste"') &&
  libraryApplication.includes("pasteClipboard") &&
  libraryApplication.includes("setClipboard"),
  "Cut, copy and paste controls must execute Library operations rather than remain decorative.");
console.log("NEXUS Library command bar contracts: OK");

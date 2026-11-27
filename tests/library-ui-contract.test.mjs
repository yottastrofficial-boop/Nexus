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
assert.match(catalogExplorer, /\["tables", "Tabelas"\]/,
  "O filtro de tipo deve sugerir a chave canônica tables usada pelo Foundry Document Bridge.");
assert.doesNotMatch(catalogExplorer, /rolltables/,
  "A chave legada rolltables não deve substituir a chave canônica tables.");
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
assert.match(actorSheet, /position: \{ width: 1100, height: 920 \}/,
  "The initial sheet window must provide a larger viewport for the configured Canvas.");
assert.match(actorSheet, /window: \{ resizable: true \}/,
  "The character sheet window must remain user-resizable.");
assert.match(actorSheet, /window: \{ resizable: true \}/,
  "The character sheet window must allow resizing to fit the configured Canvas.");
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
assert.match(styles, /data-view-mode="list"[\s\S]*?\.nexus-library-generic-item\.is-selected[\s\S]*?border: 0 !important[\s\S]*?outline: 0 !important/,
  "List rows must not use border or outline highlights; selection uses a restrained surface tint.");
assert.match(styles, /nexus-library-list-name-header > \.nexus-library-list-sort[\s\S]*?width: 100% !important[\s\S]*?min-height: 34px/);
assert.match(styles, /nexus-library-list-filter > button\[data-library-open-list-filter\][\s\S]*?flex: 1 1 auto[\s\S]*?width: 100% !important/);
assert.match(styles, /nexus-library-inspector-tabs[\s\S]*?grid-template-columns: repeat\(2, minmax\(0, 1fr\)\)/);
assert.match(styles, /nexus-library-font-preview-samples/);
assert.match(styles, /nexus-library-font-preview-aa/);
assert.match(styles, /nexus-library-font-preview-glyphs/);
assert.match(styles, /nexus-library-font-preview-aa/);
assert.match(styles, /nexus-library-font-preview-glyphs/);
assert.match(styles, /nexus-library-theme-live-preview/);
assert.match(styles, /nexus-library-generic-preview[\s\S]*?aspect-ratio: 1 \/ 1/,
  "Resource previews should use a consistent square aspect ratio.");
assert.match(libraryTemplate, /nexus-library-folder-root-label[^>]*>Todas as pastas/);
assert.doesNotMatch(libraryTemplate, /data-library-folder-clear/, "The all-folders root is a heading, not a pseudo-folder item.");
assert.match(libraryTemplate, /data-library-list-header[\s\S]*?Nome[\s\S]*?Categoria[\s\S]*?Tipo/, "List view exposes the compact Name, Category and Type columns.");
assert.doesNotMatch(libraryTemplate, /data-library-list-column="(?:size|modified|tags)"/, "Size, modification date and tags are not list columns.");
assert.doesNotMatch(libraryTemplate, /data-library-create-collection/, "Empty collections must not be advertised as a permanent sidebar destination.");
assert.doesNotMatch(libraryTemplate, /data-library-tag|nexus-library-tag-options/, "Tags are not exposed as a dedicated filter; they remain searchable through the global query.");
assert.match(libraryApplication, /data-library-resize[\s\S]*?pointerdown[\s\S]*?setPointerCapture/, "Sidebar and Inspector resize hit areas must work with pointer input.");
assert.match(libraryApplication, /defaultFolderFilters[\s\S]*?assets-fontes[\s\S]*?nexus-temas/, "Default folders must query relevant native catalog resources.");
assert.match(libraryApplication, /Criar coleção com[\s\S]*?selectedKeys\.slice\(0, 500\)/, "Right-clicking a multi-selection creates a collection of the selected resource references.");
assert.match(catalogExplorer, /selectedResourceKeys[\s\S]*?event\.shiftKey[\s\S]*?nexus-library-multi-selection-context/, "The catalog supports Ctrl/Shift multi-selection and context actions.");
assert.match(catalogExplorer, /currentSortMode === "size-desc"[\s\S]*?currentSortMode === "modified-desc"[\s\S]*?currentSortMode === "tag-asc"/, "Explorer sorting supports size, modification date and tags.");
assert.match(styles, /nexus-library-generic-items\[data-view-mode="list"\][\s\S]*?grid-template-columns[\s\S]*?nexus-library-list-type/, "List view uses compact Category and Type metadata columns with adaptive icons.");
assert.match(styles, /nexus-library-panel-resizer:hover::after[\s\S]*?nexus-accent/, "Resize separators remain visually quiet until hover/focus.");
assert.match(styles, /nexus-library-folder-row > \.nexus-library-folder-toggle:hover[\s\S]*?background: transparent !important/, "Folder disclosure arrows do not receive a second button highlight.");
assert.match(catalogExplorer, /\["font", "Fonte"\]/, "Built-in fonts can be filtered through the searchable type suggestions.");
assert.match(libraryApplication, /"assets-fontes": \{ kind: "style", type: "font" \}/, "The Fonts folder maps to native font resources.");
assert.match(libraryApplication, /"nexus-temas": \{ kind: "theme" \}/, "The Themes folder maps to built-in and personal themes.");
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


assert.ok(libraryApplication.includes("type-desc") && libraryApplication.includes("size-asc") && libraryApplication.includes("tag-desc"),
  "The sort control must accept all ascending and descending options, not silently reset them.");
assert.ok(libraryTemplate.includes('data-library-column-resize="name"') &&
  libraryTemplate.includes('data-library-column-resize="category"') &&
  libraryTemplate.includes('data-library-column-resize="type"'),
  "The compact Name/Category/Type list headers must expose adjustable column separators.");
assert.ok(libraryApplication.includes("applyListColumnWidths") && libraryApplication.includes("setPointerCapture"),
  "Column resizing must respond to pointer input and apply shared grid widths.");
assert.ok(libraryTemplate.includes('data-library-open-list-filter="category"') &&
  libraryTemplate.includes('data-library-open-list-filter="type"') &&
  libraryTemplate.includes('data-library-kind list="nexus-library-category-options"') &&
  libraryTemplate.includes('data-library-type list="nexus-library-type-options"') &&
  !libraryTemplate.includes("data-library-tag"),
  "Category and type filters must be searchable from list headers; tags remain searchable only through global search.");
assert.ok(styles.includes(".nexus-library-theme-miniature") &&
  styles.includes(".nexus-library-theme-list-mark") &&
  styles.includes(".nexus-library-theme-highlight") &&
  styles.includes(".nexus-library-theme-card-swatches"),
  "Theme cards must show palette colors without adding a framed specimen panel.");
assert.ok(styles.includes("input.nexus-library-search:focus") && styles.includes("border: 0 !important"),
  "The search input must not draw a second border inside its single wrapper.");
assert.ok(libraryApplication.includes("button.append(textNode)") &&
  !libraryApplication.includes("button.append(icon, textNode)") &&
  libraryApplication.includes('separator.textContent = "/"') &&
  libraryApplication.includes('icon: "fa-solid fa-folder-open"'),
  "Breadcrumbs must show only the path while the native window header owns the Library icon.");
console.log("NEXUS Library 1.0.0.132 visual refinement contracts: OK");


assert.ok(catalogExplorer.includes("data-library-open-folder") &&
  catalogExplorer.includes("data-library-folder-select") &&
  catalogExplorer.includes('addEventListener("dblclick"') &&
  catalogExplorer.includes("renderFolderCard") && catalogExplorer.includes("folderEntries"),
  "Folder single click selects and double click opens the selected folder.");
assert.ok(libraryApplication.includes('"assets-globais": { kind: "asset" }') === false &&
  libraryApplication.includes("folder: this._state.folder"),
  "Assets global must behave as a parent directory instead of a file-type filter that hides child folders.");
assert.ok(catalogExplorer.includes("nexus-library-font-grid-specimen") &&
  catalogExplorer.includes("resource.fontFamily") &&
  catalogExplorer.includes('"Aa"') &&
  catalogExplorer.includes("Lorem ipsum dolor sit amet") &&
  !catalogExplorer.includes("nexus-library-font-specimen") &&
  !catalogExplorer.includes("nexus-library-resource-preview-facts"),
  "Font metadata stays out of the visual preview while the compact Aa card remains.");
assert.ok(catalogExplorer.includes("nexus-library-design-preview") &&
  catalogExplorer.includes("nexus-library-theme-preview") &&
  catalogExplorer.includes("nexus-library-theme-card-swatches") &&
  catalogExplorer.includes("fa-solid fa-palette") &&
  styles.includes("nexus-library-theme-swatches"),
  "Theme details retain semantic previews and grid cards display actual palette colors.");
assert.ok(styles.includes("nexus-library-folder-card") &&
  styles.includes("nexus-library-folder-preview") &&
  styles.includes("--nexus-library-preview-size: 64px") &&
  styles.includes("-webkit-line-clamp: 3") &&
  styles.includes("nexus-library-inspector-tabs"),
  "Grid uses a true 64px preview, up to three title lines, and a separate Inspector Details tab.");
assert.ok(actorSheet.includes("position: { width: 1100, height: 920 }") &&
  actorSheet.includes("window: { resizable: true }"),
  "The character sheet must provide enough default viewport for the 800px configured canvas.");
console.log("NEXUS 1.0.0.130 folder, preview and canvas contracts: OK");

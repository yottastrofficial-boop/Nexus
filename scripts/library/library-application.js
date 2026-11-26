import { createLibraryCatalogExplorer, populateLibraryCompendiumSelect, getLibraryCatalogPreferenceReference } from "./catalog-explorer.js";
import { createLogicAssetEditor } from "./logic-editors.js";
import { createLibraryThemeApplicationAdapter } from "./theme-inspector.js";
import { createLibraryFolder, normalizeLibraryPreferences, ensureLibraryDefaultFolders, renameLibraryFolder, removeLibraryFolder, moveLibraryFolder, duplicateLibraryFolderTree, assignLibraryEntryFolder, createLibraryCollection, renameLibraryCollection, removeLibraryCollection, createLibraryShortcut, removeLibraryShortcut } from "../core/library-preferences.js";
import { updateNexusLibraryCollection } from "../core/library-store.js";
import { createLibraryTabManager } from "./library-tab-manager.js";

/**
 * Standalone ApplicationV2 shell for the same universal Library services used
 * by the sheet adapter. It owns window lifecycle and navigation, not providers
 * or persisted definitions.
 */
const showLibraryContextMenu = (event, items) => {
  event.preventDefault();
  document.querySelectorAll(".nexus-library-context-menu").forEach(menu => menu.remove());
  const menu = document.createElement("div");
  menu.className = "nexus-library-context-menu";
  menu.setAttribute("role", "menu");
  menu.style.position = "fixed";
  menu.style.zIndex = "100000";
  menu.style.left = Math.max(8, Math.min(event.clientX, window.innerWidth - 250)) + "px";
  menu.style.top = Math.max(8, Math.min(event.clientY, window.innerHeight - 360)) + "px";
  for (const item of items) {
    if (item.separator) {
      const separator = document.createElement("div");
      separator.className = "nexus-library-context-separator";
      separator.setAttribute("role", "separator");
      menu.append(separator);
      continue;
    }
    const button = document.createElement("button");
    button.type = "button";
    button.setAttribute("role", "menuitem");
    button.textContent = item.label;
    button.disabled = item.disabled === true;
    if (item.danger) button.classList.add("is-danger");
    button.addEventListener("click", async () => {
      cleanup();
      try { await item.action?.(); }
      catch (error) { globalThis.ui?.notifications?.warn?.(String(error?.message ?? error)); }
    });
    menu.append(button);
  }
  document.body.append(menu);
  const cleanup = () => {
    menu.remove();
    document.removeEventListener("pointerdown", onPointerDown, true);
    document.removeEventListener("keydown", onKeyDown, true);
  };
  const onPointerDown = nextEvent => { if (!menu.contains(nextEvent.target)) cleanup(); };
  const onKeyDown = nextEvent => { if (nextEvent.key === "Escape") { nextEvent.preventDefault(); cleanup(); } };
  document.addEventListener("pointerdown", onPointerDown, true);
  document.addEventListener("keydown", onKeyDown, true);
  menu.querySelector("button:not(:disabled)")?.focus();
  return cleanup;
};

const promptLibraryValue = async (title, fields) => {
  const DialogV2 = globalThis.foundry?.applications?.api?.DialogV2;
  if (typeof DialogV2?.input !== "function") throw new Error("O diálogo de entrada do Foundry não está disponível.");
  const content = fields.map(field => '<label class="nexus-library-dialog-field">' + field.label +
    '<input type="text" name="' + field.name + '" maxlength="' + (field.maxLength ?? 160) +
    '" autocomplete="off" value="' + String(field.value ?? "").replaceAll("&", "&amp;").replaceAll('"', "&quot;").replaceAll("<", "&lt;") + '"></label>').join("");
  return DialogV2.input({ window: { title }, content, ok: { label: "Confirmar" }, rejectClose: false });
};

const confirmLibraryAction = async (title, content) => {
  const DialogV2 = globalThis.foundry?.applications?.api?.DialogV2;
  if (typeof DialogV2?.confirm !== "function") throw new Error("O diálogo de confirmação do Foundry não está disponível.");
  return DialogV2.confirm({ window: { title }, content, yes: { label: "Confirmar" }, no: { label: "Cancelar" }, rejectClose: false });
};

export function createLibraryApplicationClass({
  ApplicationV2,
  HandlebarsApplicationMixin,
  registry,
  getPreferences,
  savePreferences
} = {}) {
  if (typeof ApplicationV2 !== "function" || typeof HandlebarsApplicationMixin !== "function") {
    throw new TypeError("ApplicationV2 e HandlebarsApplicationMixin são obrigatórios.");
  }
  if (!registry || typeof registry.list !== "function") throw new TypeError("O catálogo universal é obrigatório.");
  if (typeof getPreferences !== "function" || typeof savePreferences !== "function") {
    throw new TypeError("Callbacks de preferências são obrigatórios.");
  }

  const BaseApplication = HandlebarsApplicationMixin(ApplicationV2);
  const applicationOptions = {
    id: "nexus-library",
    classes: ["nexus", "nexus-library-application"],
    position: { width: 1180, height: 760 },
    window: {
      title: "Biblioteca NEXUS",
      icon: "fa-solid fa-book-open",
      frame: true,
      positioned: true,
      resizable: true,
      minimizable: true
    }
  };
  const defaultOptions = globalThis.foundry?.utils?.mergeObject
    ? globalThis.foundry.utils.mergeObject(ApplicationV2.DEFAULT_OPTIONS ?? {}, applicationOptions, { inplace: false })
    : { ...(ApplicationV2.DEFAULT_OPTIONS ?? {}), ...applicationOptions };

  return class NexusLibraryApplication extends BaseApplication {
    static DEFAULT_OPTIONS = defaultOptions;

    static PARTS = {
      main: { template: "systems/nexus/templates/library/library.hbs" }
    };

    constructor(options = {}) {
      super({ id: "nexus-library", ...options });
      this._registry = registry;
      this._getPreferences = getPreferences;
      this._savePreferences = savePreferences;
      this._state = {
        query: "",
        smartView: "all",
        folder: "",
        collectionId: "",
        tag: "all",
        origin: "all",
        kind: "all",
        type: "all",
        compendiumIds: [],
        viewMode: "grid",
        cardSize: "medium"
      };
      this._tabManager = createLibraryTabManager(this._state, {
        createId: () => globalThis.foundry?.utils?.randomID?.(8) ?? "library-tab-" + Date.now()
      });
      this._state = this._tabManager.getActiveState();
      this._panelSizes = {
        navigation: 224,
        inspector: 292,
        inspectorHeight: 300,
        ...(globalThis.game?.user?.getFlag?.("nexus", "libraryWindowPreferences") ?? {})
      };
      this._explorer = null;
      this._context = {};
      this._searchTimer = 0;
      this._libraryClipboard = null;
      this._closeLibraryContextMenu = null;
    }

    setContext(context = {}) {
      this._context = context && typeof context === "object" ? context : {};
      return this;
    }

    async _prepareContext(options = {}) {
      const context = await super._prepareContext(options);
      return { ...context, libraryTitle: "Biblioteca NEXUS" };
    }

    async _onRender(context, options) {
      await super._onRender(context, options);
      await this._mountExplorer();
    }

    async _mountExplorer() {
      const root = this.element;
      const container = root?.querySelector("[data-library-generic-items]");
      const detail = root?.querySelector("[data-library-generic-details]");
      if (!container || !detail) return;

      let preferences = normalizeLibraryPreferences(this._getPreferences());
      if (!preferences.baseFoldersInitialized) {
        preferences = ensureLibraryDefaultFolders(preferences);
        try { await this._savePreferences(preferences); }
        catch (error) { globalThis.ui?.notifications?.warn?.("Não foi possível inicializar a estrutura da Biblioteca: " + error.message); }
      }
      this._state.viewMode = this._state.viewMode === "list" ? "list" : "grid";
      this._explorer = createLibraryCatalogExplorer({
        registry: this._registry,
        ...createLibraryThemeApplicationAdapter(),
        container,
        detail,
        getPreferences: () => normalizeLibraryPreferences(this._getPreferences()),
        savePreferences: value => this._savePreferences(normalizeLibraryPreferences(value)),
        canApplyResource: (resource, resolved) => this._context.canApplyResource?.(resource, resolved) === true,
        onApplyResource: this._context.applyResource,
        getUpdateInfo: this._context.getUpdateInfo,
        onUpdateInstances: this._context.updateInstances,
        canUpdateDefinition: this._context.canUpdateDefinition,
        onUpdateDefinition: this._context.updateDefinition,
        applyLabel: this._context.applyLabel ?? "Aplicar ao contexto",
        renderSpecializedEditor: (resource, resolved) => {
          if (resource?.providerId !== "nexus-library" || resource?.kind !== "logic") return null;
          const logic = globalThis.game?.nexus?.logic;
          if (typeof logic?.save !== "function") return null;
          return createLogicAssetEditor({
            asset: resolved,
            runtime: logic.runtime,
            onSave: asset => logic.save(asset)
          });
        }
      });

      const search = root.querySelector("[data-library-search]");
      const searchClear = root.querySelector("[data-library-clear-search]");
      const filterToggle = root.querySelector("[data-library-toggle-filters]");
      const filterPanel = root.querySelector("[data-library-filter-panel]");
      filterToggle?.addEventListener("click", () => {
        if (!filterPanel) return;
        filterPanel.hidden = !filterPanel.hidden;
        filterToggle.setAttribute("aria-expanded", String(!filterPanel.hidden));
        filterToggle.setAttribute("aria-label", filterPanel.hidden ? "Mostrar filtros" : "Ocultar filtros");
        filterToggle.title = filterPanel.hidden ? "Mostrar filtros" : "Ocultar filtros";
        filterToggle.classList.toggle("active", !filterPanel.hidden);
      });
      const tag = root.querySelector("[data-library-tag]");
      const origin = root.querySelector("[data-library-origin]");
      const kind = root.querySelector("[data-library-kind]");
      const type = root.querySelector("[data-library-type]");
      const compendiums = root.querySelector("[data-library-compendiums]");
      const viewControls = [...root.querySelectorAll("[data-library-collection-view-mode]")];
      const cardSize = root.querySelector("[data-library-card-size]");
      if (search) search.value = this._state.query;
      const syncSearchClear = () => {
        const hasQuery = Boolean(search?.value?.trim());
        if (searchClear) searchClear.hidden = !hasQuery;
      };
      syncSearchClear();
      if (tag) tag.value = this._state.tag;
      if (origin) origin.value = this._state.origin;
      if (kind) kind.value = this._state.kind;
      if (type) type.value = this._state.type;
      if (compendiums) populateLibraryCompendiumSelect(compendiums, this._state.compendiumIds);
      if (cardSize) cardSize.value = this._state.cardSize;
      viewControls.forEach(button => {
        const active = button.dataset.libraryCollectionViewMode === this._state.viewMode;
        button.classList.toggle("active", active);
        button.setAttribute("aria-pressed", String(active));
      });

      this._collapsedLibraryFolders ??= new Set(preferences.folders.filter(folder => folder.isDefault && folder.parentId && preferences.folders.some(child => child.parentId === folder.id)).map(folder => folder.id));
      const refreshFolders = () => {
        const nav = root.querySelector("[data-library-app-folders]");
        if (!nav) return;
        const preferences = normalizeLibraryPreferences(this._getPreferences());
        nav.replaceChildren();
        const clear = document.createElement("button");
        clear.type = "button";
        clear.dataset.libraryFolderClear = "";
        clear.className = "nexus-library-custom-folder nexus-library-folder-clear";
        clear.innerHTML = '<i class="fa-solid fa-folder-open" aria-hidden="true"></i><span>Todas as pastas</span>';
        clear.classList.toggle("active", !this._state.folder && !this._state.collectionId && this._state.smartView === "all");
        nav.append(clear);
        const childrenByParent = new Map();
        for (const folder of preferences.folders) {
          const parentId = folder.parentId || "";
          if (!childrenByParent.has(parentId)) childrenByParent.set(parentId, []);
          childrenByParent.get(parentId).push(folder);
        }
        for (const children of childrenByParent.values()) {
          children.sort((left, right) => left.name.localeCompare(right.name, "pt-BR", { sensitivity: "base" }));
        }
        // Render recursively into explicit containers, preserving folder order.
        const appendTree = (folder, parent, depth = 0) => {
          const children = childrenByParent.get(folder.id) ?? [];
          const expanded = !this._collapsedLibraryFolders.has(folder.id);
          const row = document.createElement("div");
          row.className = "nexus-library-folder-row";
          row.dataset.libraryFolderDrop = folder.id;
          row.dataset.depth = String(Math.min(depth, 8));
          row.style.setProperty("--nexus-library-folder-depth", String(Math.min(depth, 12)));
          row.draggable = true;
          const toggle = document.createElement("button");
          toggle.type = "button";
          toggle.className = "nexus-library-folder-toggle";
          toggle.dataset.libraryFolderToggle = folder.id;
          toggle.hidden = children.length === 0;
          toggle.setAttribute("aria-label", expanded ? "Recolher subpastas" : "Expandir subpastas");
          toggle.setAttribute("aria-expanded", String(expanded));
          const childrenId = "nexus-library-folder-children-" + String(folder.id).replace(/[^a-zA-Z0-9_-]/g, "-");
          if (children.length) toggle.setAttribute("aria-controls", childrenId);
          toggle.innerHTML = '<i class="fa-solid ' + (expanded ? "fa-chevron-down" : "fa-chevron-right") + '" aria-hidden="true"></i>';
          const button = document.createElement("button");
          button.type = "button";
          button.className = "nexus-library-custom-folder";
          button.dataset.libraryFolder = folder.id;
          button.innerHTML = '<i class="fa-regular fa-folder" aria-hidden="true"></i><span></span>';
          button.querySelector("span").textContent = folder.name;
          button.classList.toggle("active", this._state.folder === folder.id);
          row.append(toggle, button);
          parent.append(row);
          if (children.length && expanded) {
            const nested = document.createElement("div");
            nested.className = "nexus-library-folder-children";
            nested.id = childrenId;
            nested.dataset.parentFolder = folder.id;
            for (const child of children) appendTree(child, nested, depth + 1);
            parent.append(nested);
          }
        };
        for (const folder of childrenByParent.get("") ?? []) appendTree(folder, nav);
      };
      refreshFolders();
      const refreshCollections = () => {
        const nav = root.querySelector("[data-library-app-collections]");
        if (!nav) return;
        nav.replaceChildren();
        for (const collection of normalizeLibraryPreferences(this._getPreferences()).collections) {
          const button = document.createElement("button");
          button.type = "button";
          button.className = "nexus-library-custom-folder";
          button.dataset.libraryCollection = collection.id;
          button.textContent = collection.name;
          button.classList.toggle("active", this._state.collectionId === collection.id);
          nav.append(button);
        }
      };
      const refreshShortcuts = () => {
        const nav = root.querySelector("[data-library-app-shortcuts]");
        if (!nav) return;
        nav.replaceChildren();
        for (const shortcut of normalizeLibraryPreferences(this._getPreferences()).shortcuts) {
          const button = document.createElement("button");
          button.type = "button";
          button.className = "nexus-library-custom-folder nexus-library-shortcut";
          button.dataset.libraryShortcut = shortcut.id;
          button.innerHTML = '<i class="fa-solid fa-link" aria-hidden="true"></i><span></span>';
          button.querySelector("span").textContent = shortcut.name;
          button.classList.toggle("active", this._state.smartView === "shortcut" && this._state.collectionId === shortcut.id);
          nav.append(button);
        }
      };
      refreshShortcuts();

      const appRoot = root.closest(".nexus-library-application") ?? root;
      const tabStrip = root.querySelector("[data-library-tabs]");
      const breadcrumbs = root.querySelector("[data-library-breadcrumbs]");
      const navigationSearch = root.querySelector("[data-library-navigation-search]");
      const searchWrap = root.querySelector(".nexus-library-search-wrap");
      if (navigationSearch && searchWrap && !navigationSearch.contains(searchWrap)) navigationSearch.append(searchWrap);
      const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
      const applyPanelSizes = () => {
        const values = {
          navigation: clamp(Number(this._panelSizes.navigation) || 224, 150, 420),
          inspector: clamp(Number(this._panelSizes.inspector) || 292, 210, 480),
          inspectorHeight: clamp(Number(this._panelSizes.inspectorHeight) || 300, 180, 620)
        };
        this._panelSizes = { ...this._panelSizes, ...values };
        appRoot.style.setProperty("--nexus-library-navigation-width", values.navigation + "px");
        appRoot.style.setProperty("--nexus-library-inspector-width", values.inspector + "px");
        appRoot.style.setProperty("--nexus-library-inspector-height", values.inspectorHeight + "px");
        root.querySelector("[data-library-resize-sidebar]")?.setAttribute("aria-valuenow", String(values.navigation));
        const inspectorHandle = root.querySelector("[data-library-resize-inspector]");
        inspectorHandle?.setAttribute("aria-valuenow", String(isNarrowViewport() ? values.inspectorHeight : values.inspector));
      };
      const isNarrowViewport = () => globalThis.matchMedia?.("(max-width: 720px)")?.matches === true;
      applyPanelSizes();
      const savePanelSizes = async () => {
        try { await globalThis.game?.user?.setFlag?.("nexus", "libraryWindowPreferences", this._panelSizes); }
        catch (error) { notify("warn", "Não foi possível salvar o tamanho dos painéis: " + error.message); }
      };
      const bindPanelResizer = (handle, type) => {
        if (!handle || handle.dataset.bound === "true") return;
        handle.dataset.bound = "true";
        const isInspector = type === "inspector";
        const min = isInspector ? 210 : 150;
        const max = isInspector ? 480 : 420;
        handle.setAttribute("role", "slider");
        handle.setAttribute("tabindex", "0");
        handle.setAttribute("aria-valuemin", String(isInspector ? 180 : min));
        handle.setAttribute("aria-valuemax", String(isInspector ? 620 : max));
        handle.setAttribute("aria-orientation", isInspector && isNarrowViewport() ? "horizontal" : "vertical");
        handle.setAttribute("aria-valuenow", String(isInspector ? this._panelSizes.inspector : this._panelSizes.navigation));
        const start = event => {
          const isVertical = isInspector && isNarrowViewport();
          const dimension = isVertical ? "y" : "x";
          const sizeKey = isVertical ? "inspectorHeight" : isInspector ? "inspector" : "navigation";
          handle.setAttribute("aria-orientation", isVertical ? "horizontal" : "vertical");
          if (event.button !== 0) return;
          event.preventDefault();
          const startPoint = dimension === "y" ? event.clientY : event.clientX;
          const startSize = Number(this._panelSizes[sizeKey]) || (sizeKey === "navigation" ? 224 : sizeKey === "inspector" ? 292 : 300);
          handle.classList.add("is-resizing");
          handle.setPointerCapture?.(event.pointerId);
          const move = next => {
            const point = dimension === "y" ? next.clientY : next.clientX;
            const delta = point - startPoint;
            const nextSize = isInspector ? startSize - delta : startSize + delta;
            this._panelSizes[sizeKey] = clamp(nextSize, sizeKey === "navigation" ? 150 : sizeKey === "inspector" ? 210 : 180, sizeKey === "navigation" ? 420 : sizeKey === "inspector" ? 480 : 620);
            applyPanelSizes();
          };
          const finish = async next => {
            move(next);
            handle.classList.remove("is-resizing");
            handle.removeEventListener("pointermove", move);
            handle.removeEventListener("pointerup", finish);
            handle.removeEventListener("pointercancel", finish);
            await savePanelSizes();
          };
          handle.addEventListener("pointermove", move);
          handle.addEventListener("pointerup", finish, { once: true });
          handle.addEventListener("pointercancel", finish, { once: true });
        };
        handle.addEventListener("pointerdown", start);
        handle.addEventListener("keydown", async event => {
          const step = event.shiftKey ? 32 : 12;
          if (!["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", "Home", "End"].includes(event.key)) return;
          const isVertical = isInspector && isNarrowViewport();
          const dimension = isVertical ? "y" : "x";
          const sizeKey = isVertical ? "inspectorHeight" : isInspector ? "inspector" : "navigation";
          const minimum = sizeKey === "navigation" ? 150 : sizeKey === "inspector" ? 210 : 180;
          const maximum = sizeKey === "navigation" ? 420 : sizeKey === "inspector" ? 480 : 620;
          const increaseKey = isVertical ? "ArrowUp" : isInspector ? "ArrowLeft" : "ArrowRight";
          const decreaseKey = isVertical ? "ArrowDown" : isInspector ? "ArrowRight" : "ArrowLeft";
          if (![increaseKey, decreaseKey, "Home", "End"].includes(event.key)) return;
          event.preventDefault();
          const current = Number(this._panelSizes[sizeKey]) || (sizeKey === "navigation" ? 224 : sizeKey === "inspector" ? 292 : 300);
          const next = event.key === "Home" ? minimum : event.key === "End" ? maximum : current + (event.key === increaseKey ? step : -step);
          this._panelSizes[sizeKey] = clamp(next, minimum, maximum);
          applyPanelSizes();
          await savePanelSizes();
        });
      };
      bindPanelResizer(root.querySelector("[data-library-resize-sidebar]"), "navigation");
      bindPanelResizer(root.querySelector("[data-library-resize-inspector]"), "inspector");

      const currentLocation = () => ({
        smartView: this._state.smartView,
        folder: this._state.folder,
        collectionId: this._state.collectionId
      });
      const getTabTitle = state => {
        const prefs = normalizeLibraryPreferences(this._getPreferences());
        if (state.folder) return prefs.folders.find(folder => folder.id === state.folder)?.name ?? "Pasta";
        if (state.smartView === "favorites") return "Favoritos";
        if (state.smartView === "recent") return "Recentes";
        if (state.smartView === "collection") return prefs.collections.find(item => item.id === state.collectionId)?.name ?? "Coleção";
        if (state.smartView === "shortcut") return prefs.shortcuts.find(item => item.id === state.collectionId)?.name ?? "Atalho";
        return "Biblioteca";
      };
      const updateTabTitle = () => this._tabManager.renameActive(getTabTitle(this._state));
      const renderBreadcrumbs = () => {
        if (!breadcrumbs) return;
        breadcrumbs.replaceChildren();
        const addCrumb = (label, location, isLast = false) => {
          if (breadcrumbs.childElementCount) {
            const separator = document.createElement("span");
            separator.className = "nexus-library-breadcrumb-separator";
            separator.textContent = "›";
            separator.setAttribute("aria-hidden", "true");
            breadcrumbs.append(separator);
          }
          const button = document.createElement("button");
          button.type = "button";
          button.className = "nexus-library-breadcrumb";
          button.textContent = label;
          button.title = label;
          button.disabled = isLast;
          button.addEventListener("click", async () => {
            this._state.smartView = location.smartView;
            this._state.folder = location.folder;
            this._state.collectionId = location.collectionId;
            refreshFolders(); refreshCollections(); refreshShortcuts();
            await render();
          });
          breadcrumbs.append(button);
        };
        const rootLocation = { smartView: "all", folder: "", collectionId: "" };
        addCrumb("Biblioteca", rootLocation, !this._state.folder && this._state.smartView === "all");
        if (this._state.smartView !== "all") {
          addCrumb(getTabTitle({ ...this._state, folder: "" }), { smartView: this._state.smartView, folder: "", collectionId: this._state.collectionId }, !this._state.folder);
        }
        const prefs = normalizeLibraryPreferences(this._getPreferences());
        const chain = [];
        let folder = prefs.folders.find(item => item.id === this._state.folder);
        const seen = new Set();
        while (folder && !seen.has(folder.id)) {
          seen.add(folder.id);
          chain.unshift(folder);
          folder = folder.parentId ? prefs.folders.find(item => item.id === folder.parentId) : null;
        }
        chain.forEach((item, index) => addCrumb(item.name, { smartView: "all", folder: item.id, collectionId: "" }, index === chain.length - 1));
      };
      const renderTabs = () => {
        if (!tabStrip) return;
        tabStrip.replaceChildren();
        for (const tab of this._tabManager.getTabs()) {
          const item = document.createElement("div");
          item.className = "nexus-library-tab";
          item.setAttribute("role", "presentation");
          const label = document.createElement("button");
          label.type = "button";
          label.className = "nexus-library-tab-label";
          label.setAttribute("role", "tab");
          label.setAttribute("aria-selected", String(tab.active));
          label.tabIndex = tab.active ? 0 : -1;
          label.title = tab.title;
          label.textContent = tab.title;
          label.addEventListener("click", async () => {
            this._tabManager.setActiveState(this._state);
            const next = this._tabManager.activate(tab.id);
            if (!next) return;
            this._state = next.state;
            syncControlsFromState();
            refreshFolders(); refreshCollections(); refreshShortcuts();
            await render();
          });
          const close = document.createElement("button");
          close.type = "button";
          close.className = "nexus-library-tab-close";
          close.setAttribute("aria-label", "Fechar aba " + tab.title);
          close.title = "Fechar aba";
          close.innerHTML = '<i class="fa-solid fa-xmark" aria-hidden="true"></i>';
          close.addEventListener("click", async event => {
            event.stopPropagation();
            this._tabManager.setActiveState(this._state);
            const next = this._tabManager.close(tab.id);
            this._state = next.state;
            syncControlsFromState();
            refreshFolders(); refreshCollections(); refreshShortcuts();
            await render();
          });
          item.append(label, close);
          tabStrip.append(item);
        }
        const add = document.createElement("button");
        add.type = "button";
        add.className = "nexus-library-tab-add";
        add.setAttribute("aria-label", "Abrir nova aba");
        add.title = "Nova aba";
        add.innerHTML = '<i class="fa-solid fa-plus" aria-hidden="true"></i>';
        add.addEventListener("click", async () => {
          this._tabManager.setActiveState(this._state);
          const next = this._tabManager.create(this._state, getTabTitle(this._state));
          this._state = next.state;
          syncControlsFromState();
          refreshFolders(); refreshCollections(); refreshShortcuts();
          await render();
        });
        tabStrip.append(add);
      };
      const syncControlsFromState = () => {
        const values = [
          ["[data-library-search]", this._state.query],
          ["[data-library-tag]", this._state.tag],
          ["[data-library-origin]", this._state.origin],
          ["[data-library-kind]", this._state.kind],
          ["[data-library-type]", this._state.type],
          ["[data-library-card-size]", this._state.cardSize]
        ];
        for (const [selector, value] of values) {
          const control = root.querySelector(selector);
          if (control) control.value = value ?? "";
        }
        const searchClear = root.querySelector("[data-library-clear-search]");
        if (searchClear) searchClear.hidden = !String(this._state.query ?? "").trim();
        const compendiums = root.querySelector("[data-library-compendiums]");
        if (compendiums) [...compendiums.options].forEach(option => { option.selected = this._state.compendiumIds.includes(option.value); });
        root.querySelectorAll("[data-library-collection-view-mode]").forEach(button => {
          const active = button.dataset.libraryCollectionViewMode === this._state.viewMode;
          button.classList.toggle("active", active);
          button.setAttribute("aria-pressed", String(active));
        });
        root.querySelectorAll("[data-library-smart-view]").forEach(button => button.classList.toggle("active", button.dataset.librarySmartView === this._state.smartView));
      };
      const syncNavigationButtons = () => {
        const back = root.querySelector("[data-library-history-back]");
        const forward = root.querySelector("[data-library-history-forward]");
        const up = root.querySelector("[data-library-history-up]");
        if (back) back.disabled = !this._tabManager.canBack();
        if (forward) forward.disabled = !this._tabManager.canForward();
        const currentFolder = normalizeLibraryPreferences(this._getPreferences()).folders.find(folder => folder.id === this._state.folder);
        if (up) up.disabled = !currentFolder;
      };
      const renderChrome = () => {
        updateTabTitle();
        renderTabs();
        renderBreadcrumbs();
        syncNavigationButtons();
      };
      const render = async () => {
        this._tabManager.setActiveState(this._state);
        this._tabManager.recordNavigation(currentLocation());
        renderChrome();
        return this._explorer?.render({ ...this._state });
      };
      const applyHistoryLocation = async location => {
        if (!location) return;
        this._state.smartView = location.smartView;
        this._state.folder = location.folder;
        this._state.collectionId = location.collectionId;
        syncControlsFromState();
        refreshFolders(); refreshCollections(); refreshShortcuts();
        await render();
      };
      root.querySelector("[data-library-history-back]")?.addEventListener("click", () => applyHistoryLocation(this._tabManager.back()));
      root.querySelector("[data-library-history-forward]")?.addEventListener("click", () => applyHistoryLocation(this._tabManager.forward()));
      root.querySelector("[data-library-history-up]")?.addEventListener("click", async () => {
        const prefs = normalizeLibraryPreferences(this._getPreferences());
        const folder = prefs.folders.find(item => item.id === this._state.folder);
        if (!folder) return;
        this._state.folder = folder.parentId || "";
        this._state.smartView = "all";
        this._state.collectionId = "";
        refreshFolders(); refreshCollections(); refreshShortcuts();
        await render();
      });
      root.querySelector("[data-library-create-new-proxy]")?.addEventListener("click", () => root.querySelector("[data-library-create-new-toggle]")?.click());
      root.querySelector("[data-library-refresh]")?.addEventListener("click", () => render());
      tabStrip?.addEventListener("keydown", async event => {
        if (!event.ctrlKey || !["Tab", "t", "T", "w", "W"].includes(event.key)) return;
        event.preventDefault();
        const tabs = this._tabManager.getTabs();
        const activeIndex = Math.max(0, tabs.findIndex(tab => tab.active));
        if (event.key === "Tab") {
          const offset = event.shiftKey ? -1 : 1;
          const next = tabs[(activeIndex + offset + tabs.length) % tabs.length];
          if (!next) return;
          this._tabManager.setActiveState(this._state);
          this._state = this._tabManager.activate(next.id).state;
          syncControlsFromState();
          refreshFolders(); refreshCollections(); refreshShortcuts();
          await render();
          tabStrip.querySelector('[aria-selected="true"]')?.focus();
        } else if (event.key.toLowerCase() === "t") {
          this._tabManager.setActiveState(this._state);
          const next = this._tabManager.create(this._state, getTabTitle(this._state));
          this._state = next.state;
          syncControlsFromState();
          refreshFolders(); refreshCollections(); refreshShortcuts();
          await render();
          tabStrip.querySelector('[aria-selected="true"]')?.focus();
        } else if (event.key.toLowerCase() === "w") {
          if (tabs.length <= 1) return;
          this._tabManager.setActiveState(this._state);
          this._state = this._tabManager.close().state;
          syncControlsFromState();
          refreshFolders(); refreshCollections(); refreshShortcuts();
          await render();
          tabStrip.querySelector('[aria-selected="true"]')?.focus();
        }
      });
      renderChrome();
      const notify = (method, message) => globalThis.ui?.notifications?.[method]?.(message);
      const backupService = () => globalThis.game?.nexus?.library?.backup;
      const makeImportPreview = async source => {
        const backup = backupService();
        if (!backup?.prepareImport || !backup?.commitImport) {
          throw new Error("O serviço de backup ainda não foi inicializado. Abra a Biblioteca pelo painel de uma ficha.");
        }
        const preview = backup.prepareImport(source, {
          createId: (collection, index) => collection + "-" + globalThis.foundry?.utils?.randomID?.(8) + "-" + index
        });
        const labels = {
          components: "componentes", groups: "grupos", layouts: "layouts", assets: "assets",
          themes: "temas", templates: "modelos", media: "mídias", styles: "estilos",
          properties: "propriedades", rules: "regras", behaviors: "comportamentos",
          flows: "fluxos pessoais", functions: "funções", worldFlows: "fluxos do mundo"
        };
        const additions = Object.entries(preview.report.added ?? {})
          .filter(([, count]) => Number(count) > 0)
          .map(([key, count]) => Number(count) + " " + (labels[key] ?? key));
        const skipped = Object.values(preview.report.skipped ?? {}).reduce((sum, count) => sum + Number(count || 0), 0);
        const content = (additions.length
          ? "<p>Serão adicionados: " + additions.join(", ") + ".</p>"
          : "<p>Nenhum item novo será adicionado.</p>") +
          (skipped ? "<p>" + skipped + " item(ns) em conflito serão preservados sem sobrescrita.</p>" : "<p>Nenhum conflito foi encontrado.</p>") +
          "<p>O conteúdo será validado e não será executado durante a importação.</p>";
        const DialogV2 = globalThis.foundry?.applications?.api?.DialogV2;
        if (typeof DialogV2?.confirm !== "function") throw new Error("O diálogo de confirmação do Foundry não está disponível.");
        const accepted = await DialogV2.confirm({
          window: { title: "Prévia da importação da Biblioteca" },
          content,
          yes: { label: "Importar" },
          no: { label: "Cancelar" },
          rejectClose: false
        });
        if (!accepted) return { cancelled: true };
        const result = await backup.commitImport(preview);
        for (const warning of result.warnings ?? []) notify("warn", warning);
        notify("info", additions.length ? "Biblioteca importada: " + additions.join(", ") + "." : "Backup validado; nenhum item novo foi necessário.");
        refreshFolders();
        await render();
        return result;
      };

      root.querySelector("[data-library-backup-copy]")?.addEventListener("click", async () => {
        try {
          const code = backupService()?.exportCode?.();
          if (!code) throw new Error("O serviço de backup não está disponível.");
          let copied = false;
          try {
            if (globalThis.navigator?.clipboard?.writeText) {
              await globalThis.navigator.clipboard.writeText(code);
              copied = true;
            }
          } catch {}
          if (!copied) {
            const field = document.createElement("textarea");
            field.value = code;
            field.setAttribute("readonly", "");
            field.style.position = "fixed";
            field.style.opacity = "0";
            try {
              document.body.append(field);
              field.select();
              copied = document.execCommand?.("copy") === true;
            } finally {
              field.remove();
            }
          }
          if (!copied) throw new Error("Não foi possível copiar o backup.");
          notify("info", "Backup da Biblioteca copiado.");
        } catch (error) { notify("error", error.message); }
      });

      root.querySelector("[data-library-backup-export]")?.addEventListener("click", () => {
        try {
          const code = backupService()?.exportCode?.();
          if (!code) throw new Error("O serviço de backup não está disponível.");
          const blob = new Blob([code], { type: "application/json;charset=utf-8" });
          const url = URL.createObjectURL(blob);
          const link = document.createElement("a");
          link.href = url;
          link.download = "nexus-library-" + new Date().toISOString().slice(0, 10) + ".json";
          link.click();
          setTimeout(() => URL.revokeObjectURL(url), 1000);
          notify("info", "Backup da Biblioteca exportado.");
        } catch (error) { notify("error", error.message); }
      });

      root.querySelector("[data-library-backup-import-code]")?.addEventListener("click", async () => {
        const DialogV2 = globalThis.foundry?.applications?.api?.DialogV2;
        if (typeof DialogV2?.input !== "function") return;
        try {
          const result = await DialogV2.input({
            window: { title: "Importar backup da Biblioteca" },
            content: '<label>Código JSON<textarea name="code" rows="10" spellcheck="false"></textarea></label>',
            ok: { label: "Validar backup" },
            rejectClose: false
          });
          const source = String(result?.code ?? "").trim();
          if (source) await makeImportPreview(source);
        } catch (error) { notify("error", "Não foi possível importar o backup: " + error.message); }
      });

      const backupFile = root.querySelector("[data-library-backup-file]");
      root.querySelector("[data-library-backup-import-file]")?.addEventListener("click", () => backupFile?.click());
      backupFile?.addEventListener("change", async () => {
        const file = backupFile.files?.[0];
        if (!file) return;
        try {
          if (file.size > 5 * 1024 * 1024) throw new Error("O arquivo excede o limite de 5 MB.");
          await makeImportPreview(await file.text());
        } catch (error) { notify("error", "Não foi possível importar o arquivo: " + error.message); }
        finally { backupFile.value = ""; }
      });
      const clearSearch = () => {
        if (!search) return;
        search.value = "";
        this._state.query = "";
        if (this._searchTimer) {
          clearTimeout(this._searchTimer);
          this._searchTimer = 0;
        }
        syncSearchClear();
        void render();
        search.focus();
      };
      searchClear?.addEventListener("click", clearSearch);
      search?.addEventListener("keydown", event => {
        if (event.key !== "Escape" || !search.value) return;
        // Escape clears the query first; stop it here so it does not also dismiss the window.
        event.preventDefault();
        event.stopPropagation();
        clearSearch();
      });

      // The backup menu is a native <details>: close it after an action, with Escape,
      // and when focus leaves it. The menu element is recreated on every render, so
      // these listeners need no separate cleanup.
      const actionsMenu = root.querySelector(".nexus-library-actions-menu");
      if (actionsMenu) {
        const closeActionsMenu = () => { actionsMenu.open = false; };
        actionsMenu.addEventListener("click", event => {
          if (event.target.closest?.(".nexus-library-actions-popover button")) closeActionsMenu();
        });
        actionsMenu.addEventListener("keydown", event => {
          if (event.key !== "Escape" || !actionsMenu.open) return;
          event.preventDefault();
          event.stopPropagation();
          closeActionsMenu();
          actionsMenu.querySelector("summary")?.focus();
        });
        actionsMenu.addEventListener("focusout", event => {
          if (actionsMenu.open && !actionsMenu.contains(event.relatedTarget)) closeActionsMenu();
        });
      }
      search?.addEventListener("input", () => {
        this._state.query = search.value;
        syncSearchClear();
        if (this._searchTimer) clearTimeout(this._searchTimer);
        this._searchTimer = setTimeout(() => {
          this._searchTimer = 0;
          void render();
        }, 160);
      });
      tag?.addEventListener("change", () => {
        this._state.tag = tag.value || "all";
        void render();
      });
      origin?.addEventListener("change", () => {
        this._state.origin = origin.value || "all";
        void render();
      });
      kind?.addEventListener("change", () => {
        this._state.kind = kind.value || "all";
        void render();
      });
      type?.addEventListener("change", () => {
        this._state.type = type.value || "all";
        void render();
      });
      compendiums?.addEventListener("change", () => {
        this._state.compendiumIds = [...compendiums.selectedOptions].map(option => option.value).filter(Boolean).slice(0, 32);
        void render();
      });
      cardSize?.addEventListener("change", () => {
        this._state.cardSize = ["small", "medium", "large"].includes(cardSize.value) ? cardSize.value : "medium";
        void render();
      });
      viewControls.forEach(button => button.addEventListener("click", () => {
        this._state.viewMode = button.dataset.libraryCollectionViewMode === "list" ? "list" : "grid";
        viewControls.forEach(item => {
          const active = item === button;
          item.classList.toggle("active", active);
          item.setAttribute("aria-pressed", String(active));
        });
        void render();
      }));

      root.querySelectorAll("[data-library-smart-view]").forEach(button => button.addEventListener("click", () => {
        this._state.smartView = button.dataset.librarySmartView || "all";
        this._state.folder = "";
        this._state.collectionId = "";
        root.querySelectorAll("[data-library-smart-view]").forEach(item => item.classList.toggle("active", item === button));
        refreshFolders();
        refreshCollections();
        void render();
      }));
      const folderNav = root.querySelector("[data-library-app-folders]");
      folderNav?.addEventListener("click", async event => {
        const target = event.target instanceof Element ? event.target : event.target?.parentElement;
        const toggle = target?.closest("[data-library-folder-toggle]");
        if (toggle) {
          const id = toggle.dataset.libraryFolderToggle;
          if (this._collapsedLibraryFolders.has(id)) this._collapsedLibraryFolders.delete(id);
          else this._collapsedLibraryFolders.add(id);
          refreshFolders();
          return;
        }
        const clear = target?.closest("[data-library-folder-clear]");
        const folderButton = target?.closest("[data-library-folder]");
        if (!clear && !folderButton) return;
        this._state.smartView = "all";
        this._state.collectionId = "";
        this._state.folder = clear ? "" : folderButton.dataset.libraryFolder;
        root.querySelectorAll("[data-library-smart-view]").forEach(item => item.classList.toggle("active", item.dataset.librarySmartView === "all"));
        refreshFolders();
        refreshCollections();
        await render();
      });
      folderNav?.addEventListener("dragstart", event => {
        const row = event.target instanceof Element ? event.target.closest("[data-library-folder-drop]") : null;
        if (!row || !event.dataTransfer) return;
        event.dataTransfer.setData("application/x-nexus-library-folder", row.dataset.libraryFolderDrop);
        event.dataTransfer.effectAllowed = "move";
      });
      folderNav?.addEventListener("dragover", event => {
        const target = event.target instanceof Element ? event.target : event.target?.parentElement;
        if (!target?.closest("[data-library-folder-drop], [data-library-folder-clear]")) return;
        event.preventDefault();
        target.closest("[data-library-folder-drop], [data-library-folder-clear]")?.classList.add("is-drop-target");
      });
      folderNav?.addEventListener("dragleave", event => {
        const target = event.target instanceof Element ? event.target : event.target?.parentElement;
        target?.closest("[data-library-folder-drop], [data-library-folder-clear]")?.classList.remove("is-drop-target");
      });
      folderNav?.addEventListener("drop", async event => {
        const target = event.target instanceof Element ? event.target : event.target?.parentElement;
        const folderRow = target?.closest("[data-library-folder-drop]");
        const clear = target?.closest("[data-library-folder-clear]");
        const targetFolderId = clear ? "" : folderRow?.dataset.libraryFolderDrop ?? "";
        if (!folderRow && !clear) return;
        event.preventDefault();
        folderNav.querySelectorAll(".is-drop-target").forEach(item => item.classList.remove("is-drop-target"));
        try {
          const resourcePayload = event.dataTransfer?.getData("application/x-nexus-library-resource");
          const folderPayload = event.dataTransfer?.getData("application/x-nexus-library-folder");
          if (resourcePayload) {
            const reference = JSON.parse(resourcePayload);
            await this._savePreferences(assignLibraryEntryFolder(this._getPreferences(), reference.collection, reference.entryId, targetFolderId));
          } else if (folderPayload) {
            await this._savePreferences(moveLibraryFolder(this._getPreferences(), folderPayload, targetFolderId));
          } else return;
          refreshFolders();
          await render();
        } catch (error) { notify("warn", error.message); }
      });
      root.querySelector("[data-library-app-folders]")?.addEventListener("contextmenu", event => {
        const target = event.target instanceof Element ? event.target : event.target?.parentElement;
        const button = target?.closest("[data-library-folder]");
        if (!button) return;
        const folderId = button.dataset.libraryFolder;
        const folder = normalizeLibraryPreferences(this._getPreferences()).folders.find(item => item.id === folderId);
        if (!folder) return;
        const pasteInto = async targetFolderId => {
          const clipboard = this._libraryClipboard;
          if (!clipboard) return;
          let preferences = normalizeLibraryPreferences(this._getPreferences());
          if (clipboard.type === "folder") {
            if (clipboard.mode === "copy") {
              preferences = duplicateLibraryFolderTree(preferences, clipboard.folderId, {
                parentId: targetFolderId,
                idPrefix: "copy-" + (globalThis.foundry?.utils?.randomID?.(5) ?? "nexus")
              }).preferences;
            } else {
              preferences = moveLibraryFolder(preferences, clipboard.folderId, targetFolderId);
              this._libraryClipboard = null;
            }
          } else if (clipboard.type === "resource") {
            if (clipboard.mode === "copy") {
              preferences = createLibraryShortcut(preferences, {
                name: clipboard.name + " (atalho)",
                resourceKey: clipboard.resourceKey,
                reference: clipboard.reference,
                folderId: targetFolderId
              }).preferences;
            } else {
              const separator = clipboard.resourceKey.indexOf(":");
              if (separator <= 0) throw new Error("Referência copiada inválida.");
              preferences = assignLibraryEntryFolder(preferences, clipboard.resourceKey.slice(0, separator), clipboard.resourceKey.slice(separator + 1), targetFolderId);
              this._libraryClipboard = null;
            }
          }
          await this._savePreferences(preferences);
          refreshFolders(); refreshShortcuts(); await render();
        };
        this._closeLibraryContextMenu?.();
        this._closeLibraryContextMenu = showLibraryContextMenu(event, [
          { label: "Nova subpasta", action: async () => {
            const result = await promptLibraryValue("Nova subpasta", [{ name: "name", label: "Nome da pasta", maxLength: 80 }]);
            const name = String(result?.name ?? "").trim();
            if (!name) return;
            const created = createLibraryFolder(this._getPreferences(), {
              id: globalThis.foundry?.utils?.randomID?.(10), name, collection: folder.collection, parentId: folderId
            });
            await this._savePreferences(created.preferences);
            this._collapsedLibraryFolders.delete(folderId);
            refreshFolders(); await render();
          }},
          { label: "Renomear", action: async () => {
            const result = await promptLibraryValue("Renomear pasta", [{ name: "name", label: "Novo nome", value: folder.name, maxLength: 80 }]);
            const name = String(result?.name ?? "").trim();
            if (!name) return;
            await this._savePreferences(renameLibraryFolder(this._getPreferences(), folderId, name));
            refreshFolders(); await render();
          }},
          { label: "Recortar", action: async () => {
            this._libraryClipboard = { type: "folder", folderId, mode: "move" };
            notify("info", "Pasta recortada. Use Colar em uma pasta de destino.");
          }},
          { label: "Copiar", action: async () => {
            this._libraryClipboard = { type: "folder", folderId, mode: "copy" };
            notify("info", "Estrutura da pasta copiada. Os documentos originais não serão duplicados.");
          }},
          { label: "Colar dentro", disabled: !this._libraryClipboard, action: () => pasteInto(folderId) },
          { separator: true },
          { label: "Mover para raiz", action: async () => {
            await this._savePreferences(moveLibraryFolder(this._getPreferences(), folderId, ""));
            refreshFolders(); await render();
          }},
          { label: "Excluir pasta", danger: true, action: async () => {
            const accepted = await confirmLibraryAction("Excluir pasta", "<p>A pasta e suas subpastas serão removidas da organização. Os recursos continuarão na Biblioteca, sem serem apagados.</p>");
            if (!accepted) return;
            const current = normalizeLibraryPreferences(this._getPreferences());
            const descendants = new Set([folderId]);
            let changed = true;
            while (changed) {
              changed = false;
              for (const item of current.folders) if (item.parentId && descendants.has(item.parentId) && !descendants.has(item.id)) { descendants.add(item.id); changed = true; }
            }
            await this._savePreferences(removeLibraryFolder(current, folderId));
            if (descendants.has(this._state.folder)) this._state.folder = "";
            for (const id of descendants) this._collapsedLibraryFolders.delete(id);
            refreshFolders(); await render();
          }}
        ]);
      });

      const resourceContainer = root.querySelector("[data-library-generic-items]");
      resourceContainer?.addEventListener("contextmenu", event => {
        const target = event.target instanceof Element ? event.target : event.target?.parentElement;
        const card = target?.closest("[data-library-resource-key]");
        if (!card) {
          this._closeLibraryContextMenu?.();
          this._closeLibraryContextMenu = showLibraryContextMenu(event, [
            { label: "Nova pasta", action: async () => root.querySelector("[data-library-create-folder]")?.click() },
            { label: "Colar na raiz", disabled: !this._libraryClipboard, action: async () => {
              const clipboard = this._libraryClipboard;
              if (!clipboard) return;
              let preferences = normalizeLibraryPreferences(this._getPreferences());
              if (clipboard.type === "folder") {
                preferences = clipboard.mode === "copy"
                  ? duplicateLibraryFolderTree(preferences, clipboard.folderId, { parentId: "", idPrefix: "copy-" + (globalThis.foundry?.utils?.randomID?.(5) ?? "nexus") }).preferences
                  : moveLibraryFolder(preferences, clipboard.folderId, "");
              } else if (clipboard.type === "resource") {
                if (clipboard.mode === "copy") preferences = createLibraryShortcut(preferences, { name: clipboard.name + " (atalho)", resourceKey: clipboard.resourceKey, reference: clipboard.reference }).preferences;
                else {
                  const separator = clipboard.resourceKey.indexOf(":");
                  if (separator > 0) preferences = assignLibraryEntryFolder(preferences, clipboard.resourceKey.slice(0, separator), clipboard.resourceKey.slice(separator + 1), "");
                }
              }
              await this._savePreferences(preferences);
              if (clipboard.mode === "move") this._libraryClipboard = null;
              refreshFolders(); refreshShortcuts(); await render();
            }}
          ]);
          return;
        }
        const resourceKey = card.dataset.libraryResourceKey;
        let reference = {};
        try { reference = JSON.parse(card.dataset.libraryReference || "{}"); } catch {}
        const resourceName = card.querySelector(".nexus-library-generic-item strong")?.textContent || "Recurso";
        this._closeLibraryContextMenu?.();
        this._closeLibraryContextMenu = showLibraryContextMenu(event, [
          { label: "Copiar referência", action: async () => {
            this._libraryClipboard = { type: "resource", resourceKey, reference: getLibraryCatalogPreferenceReference(resourceKey), name: resourceName, mode: "copy" };
            notify("info", "Referência copiada para a Biblioteca.");
          }},
          { label: "Recortar referência", action: async () => {
            this._libraryClipboard = { type: "resource", resourceKey, reference: getLibraryCatalogPreferenceReference(resourceKey), name: resourceName, mode: "move" };
            notify("info", "Referência recortada. Use Colar em uma pasta.");
          }},
          { label: "Criar atalho", action: async () => {
            const result = await promptLibraryValue("Criar atalho", [{ name: "name", label: "Nome do atalho", value: resourceName, maxLength: 80 }]);
            const name = String(result?.name ?? "").trim();
            const targetReference = getLibraryCatalogPreferenceReference(resourceKey);
            if (!name || !targetReference) return;
            await this._savePreferences(createLibraryShortcut(this._getPreferences(), { name, resourceKey, reference: targetReference, folderId: this._state.folder }).preferences);
            refreshShortcuts(); notify("info", "Atalho criado.");
          }},
          { label: "Adicionar aos favoritos", action: async () => {
            const current = normalizeLibraryPreferences(this._getPreferences());
            const favorites = current.favorites.includes(resourceKey) ? current.favorites.filter(key => key !== resourceKey) : [resourceKey, ...current.favorites].slice(0, 500);
            await this._savePreferences({ ...current, favorites });
            await render();
          }}
        ]);
      });

      root.querySelector("[data-library-app-collections]")?.addEventListener("click", async event => {
        const target = event.target instanceof Element ? event.target : event.target?.parentElement;
        const button = target?.closest("[data-library-collection]");
        if (!button) return;
        this._state.smartView = "collection";
        this._state.folder = "";
        this._state.collectionId = button.dataset.libraryCollection;
        root.querySelectorAll("[data-library-smart-view]").forEach(item => item.classList.remove("active"));
        refreshFolders();
        refreshCollections();
        await render();
      });
      root.querySelector("[data-library-create-collection]")?.addEventListener("click", async () => {
        const DialogV2 = globalThis.foundry?.applications?.api?.DialogV2;
        if (typeof DialogV2?.input !== "function") return;
        const result = await DialogV2.input({
          window: { title: "Nova coleção universal" },
          content: '<label>Nome da coleção<input type="text" name="name" maxlength="80" autocomplete="off"></label>',
          ok: { label: "Criar coleção" },
          rejectClose: false
        });
        const name = String(result?.name ?? "").trim();
        if (!name) return;
        try {
          const current = normalizeLibraryPreferences(this._getPreferences());
          const created = createLibraryCollection(current, {
            id: globalThis.foundry?.utils?.randomID?.(10),
            name
          });
          await this._savePreferences(created.preferences);
          this._state.smartView = "collection";
          this._state.collectionId = created.collection.id;
          this._state.folder = "";
          refreshCollections();
          refreshFolders();
          await render();
        } catch (error) { notify("warn", error.message); }
      });
      root.querySelector("[data-library-app-collections]")?.addEventListener("contextmenu", async event => {
        const target = event.target instanceof Element ? event.target : event.target?.parentElement;
        const button = target?.closest("[data-library-collection]");
        if (!button) return;
        event.preventDefault();
        const collectionId = button.dataset.libraryCollection;
        const current = normalizeLibraryPreferences(this._getPreferences());
        const collection = current.collections.find(item => item.id === collectionId);
        if (!collection) return;
        const DialogV2 = globalThis.foundry?.applications?.api?.DialogV2;
        if (typeof DialogV2?.input !== "function") return;
        try {
          const result = await DialogV2.input({
            window: { title: "Gerenciar coleção" },
            content: '<label>Nome da coleção<input type="text" name="name" maxlength="80" autocomplete="off"></label>',
            ok: { label: "Renomear" },
            buttons: [{
              action: "delete-collection",
              label: "Excluir coleção",
              class: "nexus-library-delete-folder",
              callback: () => ({ action: "delete-collection" })
            }],
            rejectClose: false
          });
          if (result?.action === "delete-collection") {
            const DialogV2 = globalThis.foundry?.applications?.api?.DialogV2;
            const accepted = typeof DialogV2?.confirm === "function" && await DialogV2.confirm({
              window: { title: "Excluir coleção" },
              content: "<p>Os recursos não serão apagados; apenas a coleção será removida.</p>",
              yes: { label: "Excluir" },
              no: { label: "Cancelar" },
              rejectClose: false
            });
            if (!accepted) return;
            await this._savePreferences(removeLibraryCollection(this._getPreferences(), collectionId));
            if (this._state.collectionId === collectionId) { this._state.collectionId = ""; this._state.smartView = "all"; }
            root.querySelectorAll("[data-library-smart-view]").forEach(item => item.classList.toggle("active", item.dataset.librarySmartView === this._state.smartView));
          } else {
            const name = String(result?.name ?? "").trim();
            if (!name) return;
            await this._savePreferences(renameLibraryCollection(this._getPreferences(), collectionId, name));
          }
          refreshCollections();
          await render();
        } catch (error) { notify("warn", error.message); }
      });
      const createMenu = root.querySelector("[data-library-create-new-menu]");
      const createToggle = root.querySelector("[data-library-create-new-toggle]");
      createToggle?.addEventListener("click", event => {
        event.preventDefault();
        if (!createMenu) return;
        createMenu.hidden = !createMenu.hidden;
        createToggle.setAttribute("aria-expanded", String(!createMenu.hidden));
      });
      root.querySelectorAll("[data-library-new-action]:not([data-library-new-action='folder'])").forEach(button => {
        button.addEventListener("click", async event => {
          event.preventDefault();
          if (createMenu) createMenu.hidden = true;
          createToggle?.setAttribute("aria-expanded", "false");
          const action = button.dataset.libraryNewAction;
          try {
            if (action === "asset") {
              const input = document.createElement("input");
              input.type = "file";
              input.accept = "image/png,image/jpeg,image/webp,image/gif,audio/*,video/*";
              input.hidden = true;
              root.append(input);
              input.addEventListener("change", async () => {
                const file = input.files?.[0];
                input.remove();
                if (!file) return;
                if (file.size > 100 * 1024 * 1024) { notify("warn", "O arquivo excede o limite de 100 MB."); return; }
                const FilePicker = globalThis.FilePicker;
                if (typeof FilePicker?.upload !== "function") { notify("warn", "O upload nativo do Foundry não está disponível."); return; }
                try {
                  const uploaded = await FilePicker.upload("data", "nexus/library", file, {});
                  const path = String(uploaded?.path ?? uploaded ?? "");
                  if (!path || /^(?:javascript|data):/i.test(path)) throw new Error("O Foundry não retornou um caminho de asset válido.");
                  const id = globalThis.foundry?.utils?.randomID?.(10) ?? "media-" + Date.now();
                  const entry = {
                    id, name: file.name.replace(/\.[^.]+$/, "") || file.name, description: "", tags: ["asset"],
                    path, mimeType: file.type || "", thumbnail: file.type.startsWith("image/") ? path : ""
                  };
                  await updateNexusLibraryCollection(globalThis.game?.user, "media", entries => [...entries, entry]);
                  if (this._state.folder) {
                    await this._savePreferences(assignLibraryEntryFolder(this._getPreferences(), "media", id, this._state.folder));
                  }
                  refreshFolders(); await render();
                  notify("info", "Asset importado para a Biblioteca.");
                } catch (error) { notify("warn", "Não foi possível importar o asset: " + error.message); }
              }, { once: true });
              input.click();
              return;
            }
            if (action === "shortcut") {
              const result = await promptLibraryValue("Criar atalho", [
                { name: "name", label: "Nome", maxLength: 80 },
                { name: "reference", label: "UUID do Foundry ou chave de recurso", maxLength: 160 }
              ]);
              const name = String(result?.name ?? "").trim();
              const rawReference = String(result?.reference ?? "").trim();
              if (!name || !rawReference) return;
              let resourceKey = rawReference;
              let reference = getLibraryCatalogPreferenceReference(rawReference);
              if (/^(Actor|Item|Scene|JournalEntry|Macro|Playlist|RollTable|Cards|Compendium)\./.test(rawReference)) {
                resourceKey = "foundry-documents:" + rawReference;
                reference = { providerId: "foundry-documents", id: rawReference };
              }
              if (!reference) throw new Error("A referência deve ser um UUID do Foundry ou uma chave de recurso válida.");
              await this._savePreferences(createLibraryShortcut(this._getPreferences(), {
                name, resourceKey, reference, folderId: this._state.folder
              }).preferences);
              refreshShortcuts(); notify("info", "Atalho criado na Biblioteca.");
              return;
            }
            if (action === "layout" || action === "component") {
              const result = await promptLibraryValue(action === "layout" ? "Novo layout" : "Novo componente", [
                { name: "name", label: "Nome", maxLength: 80 }
              ]);
              const name = String(result?.name ?? "").trim();
              if (!name) return;
              const collection = action === "layout" ? "layouts" : "components";
              const id = globalThis.foundry?.utils?.randomID?.(10) ?? collection + "-" + Date.now();
              const entry = action === "layout"
                ? { id, name, description: "", tags: ["layout"], width: 800, height: 800, components: [], groups: [] }
                : { id, name, description: "", tags: ["component"], type: "text", settings: { label: name, text: "", w: 160, h: 48 } };
              await updateNexusLibraryCollection(globalThis.game?.user, collection, entries => [...entries, entry]);
              if (this._state.folder) await this._savePreferences(assignLibraryEntryFolder(this._getPreferences(), collection, id, this._state.folder));
              refreshFolders(); await render();
              notify("info", action === "layout" ? "Layout criado." : "Componente criado.");
            }
          } catch (error) { notify("warn", error.message); }
        });
      });

      root.querySelector("[data-library-create-folder]")?.addEventListener("click", async () => {
        if (createMenu) createMenu.hidden = true;
        createToggle?.setAttribute("aria-expanded", "false");
        const DialogV2 = globalThis.foundry?.applications?.api?.DialogV2;
        if (typeof DialogV2?.input !== "function") return;
        const result = await DialogV2.input({
          window: { title: "Nova pasta da Biblioteca" },
          content: '<label>Nome da pasta<input type="text" name="name" maxlength="80" autocomplete="off"></label>',
          ok: { label: "Criar pasta" },
          rejectClose: false
        });
        const name = String(result?.name ?? "").trim();
        if (!name) return;
        try {
          const current = normalizeLibraryPreferences(this._getPreferences());
          const parentId = this._state.folder || "";
          const parent = parentId ? current.folders.find(folder => folder.id === parentId) : null;
          const created = createLibraryFolder(current, {
            id: globalThis.foundry?.utils?.randomID?.(10),
            name,
            collection: parent?.collection ?? "",
            parentId
          });
          if (parentId) this._collapsedLibraryFolders.delete(parentId);
          await this._savePreferences(created.preferences);
          this._state.folder = created.folder.id;
          this._state.collectionId = "";
          this._state.smartView = "all";
          refreshFolders();
          await render();
        } catch (error) {
          globalThis.ui?.notifications?.warn?.(error.message);
        }
      });

      void render();
    }

    async close(options = {}) {
      this._closeLibraryContextMenu?.();
      this._closeLibraryContextMenu = null;
      if (this._searchTimer) clearTimeout(this._searchTimer);
      this._searchTimer = 0;
      this._explorer = null;
      return super.close(options);
    }
  };
}

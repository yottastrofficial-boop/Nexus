import { createLibraryCatalogExplorer } from "./catalog-explorer.js";
import { createLibraryFolder, normalizeLibraryPreferences } from "../core/library-preferences.js";

/**
 * Standalone ApplicationV2 shell for the same universal Library services used
 * by the sheet adapter. It owns window lifecycle and navigation, not providers
 * or persisted definitions.
 */
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

  return class NexusLibraryApplication extends BaseApplication {
    static DEFAULT_OPTIONS = {
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

    static PARTS = {
      main: { template: "systems/nexus/templates/library/library.hbs" }
    };

    constructor(options = {}) {
      super(options);
      this._registry = registry;
      this._getPreferences = getPreferences;
      this._savePreferences = savePreferences;
      this._state = {
        query: "",
        smartView: "all",
        folder: "",
        tag: "all",
        origin: "all",
        viewMode: "grid",
        cardSize: "medium"
      };
      this._explorer = null;
      this._searchFrame = 0;
    }

    async _prepareContext(options = {}) {
      const context = await super._prepareContext(options);
      return { ...context, libraryTitle: "Biblioteca NEXUS" };
    }

    async _onRender(context, options) {
      await super._onRender(context, options);
      this._mountExplorer();
    }

    _mountExplorer() {
      const root = this.element;
      const container = root?.querySelector("[data-library-generic-items]");
      const detail = root?.querySelector("[data-library-generic-details]");
      if (!container || !detail) return;

      const preferences = normalizeLibraryPreferences(this._getPreferences());
      this._state.viewMode = this._state.viewMode === "list" ? "list" : "grid";
      this._explorer = createLibraryCatalogExplorer({
        registry: this._registry,
        container,
        detail,
        getPreferences: () => normalizeLibraryPreferences(this._getPreferences()),
        savePreferences: value => this._savePreferences(normalizeLibraryPreferences(value))
      });

      const search = root.querySelector("[data-library-search]");
      const tag = root.querySelector("[data-library-tag]");
      const origin = root.querySelector("[data-library-origin]");
      const viewControls = [...root.querySelectorAll("[data-library-collection-view-mode]")];
      const cardSize = root.querySelector("[data-library-card-size]");
      if (search) search.value = this._state.query;
      if (tag) tag.value = this._state.tag;
      if (origin) origin.value = this._state.origin;
      if (cardSize) cardSize.value = this._state.cardSize;
      viewControls.forEach(button => {
        const active = button.dataset.libraryCollectionViewMode === this._state.viewMode;
        button.classList.toggle("active", active);
        button.setAttribute("aria-pressed", String(active));
      });

      const refreshFolders = () => {
        const nav = root.querySelector("[data-library-app-folders]");
        if (!nav) return;
        nav.replaceChildren();
        const clear = document.createElement("button");
        clear.type = "button";
        clear.dataset.libraryFolderClear = "";
        clear.className = "nexus-library-custom-folder";
        clear.textContent = "Todos os itens";
        clear.classList.toggle("active", !this._state.folder);
        nav.append(clear);
        for (const folder of normalizeLibraryPreferences(this._getPreferences()).folders) {
          const button = document.createElement("button");
          button.type = "button";
          button.className = "nexus-library-custom-folder";
          button.dataset.libraryFolder = folder.id;
          button.textContent = folder.name;
          button.classList.toggle("active", this._state.folder === folder.id);
          nav.append(button);
        }
      };
      refreshFolders();

      const render = () => this._explorer?.render({ ...this._state });
      search?.addEventListener("input", () => {
        this._state.query = search.value;
        if (this._searchFrame) cancelAnimationFrame(this._searchFrame);
        this._searchFrame = requestAnimationFrame(() => {
          this._searchFrame = 0;
          void render();
        });
      });
      tag?.addEventListener("change", () => {
        this._state.tag = tag.value || "all";
        void render();
      });
      origin?.addEventListener("change", () => {
        this._state.origin = origin.value || "all";
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
        root.querySelectorAll("[data-library-smart-view]").forEach(item => item.classList.toggle("active", item === button));
        refreshFolders();
        void render();
      }));
      root.querySelector("[data-library-app-folders]")?.addEventListener("click", async event => {
        const target = event.target instanceof Element ? event.target : event.target?.parentElement;
        const clear = target?.closest("[data-library-folder-clear]");
        const folderButton = target?.closest("[data-library-folder]");
        if (!clear && !folderButton) return;
        this._state.smartView = "all";
        this._state.folder = clear ? "" : folderButton.dataset.libraryFolder;
        root.querySelectorAll("[data-library-smart-view]").forEach(item => item.classList.toggle("active", item.dataset.librarySmartView === "all"));
        refreshFolders();
        await render();
      });
      root.querySelector("[data-library-create-folder]")?.addEventListener("click", async () => {
        const prompt = globalThis.foundry?.applications?.api?.DialogV2?.input;
        if (typeof prompt !== "function") return;
        const result = await prompt({
          window: { title: "Nova pasta da Biblioteca" },
          content: '<label>Nome da pasta<input type="text" name="name" maxlength="80" autocomplete="off"></label>',
          ok: { label: "Criar pasta" },
          rejectClose: false
        });
        const name = String(result?.name ?? "").trim();
        if (!name) return;
        try {
          const current = normalizeLibraryPreferences(this._getPreferences());
          const created = createLibraryFolder(current, {
            id: globalThis.foundry?.utils?.randomID?.(10),
            name
          });
          await this._savePreferences(created.preferences);
          this._state.folder = created.folder.id;
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
      if (this._searchFrame) cancelAnimationFrame(this._searchFrame);
      this._searchFrame = 0;
      this._explorer = null;
      return super.close(options);
    }
  };
}

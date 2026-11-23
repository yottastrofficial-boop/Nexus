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
        kind: "all",
        type: "all",
        viewMode: "grid",
        cardSize: "medium"
      };
      this._explorer = null;
      this._searchTimer = 0;
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
      const kind = root.querySelector("[data-library-kind]");
      const type = root.querySelector("[data-library-type]");
      const viewControls = [...root.querySelectorAll("[data-library-collection-view-mode]")];
      const cardSize = root.querySelector("[data-library-card-size]");
      if (search) search.value = this._state.query;
      if (tag) tag.value = this._state.tag;
      if (origin) origin.value = this._state.origin;
      if (kind) kind.value = this._state.kind;
      if (type) type.value = this._state.type;
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
        const confirm = globalThis.foundry?.applications?.api?.DialogV2?.confirm;
        if (typeof confirm !== "function") throw new Error("O diálogo de confirmação do Foundry não está disponível.");
        const accepted = await confirm({
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
            document.body.append(field);
            field.select();
            copied = document.execCommand?.("copy") === true;
            field.remove();
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
        const input = globalThis.foundry?.applications?.api?.DialogV2?.input;
        if (typeof input !== "function") return;
        try {
          const result = await input({
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
      search?.addEventListener("input", () => {
        this._state.query = search.value;
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
      if (this._searchTimer) clearTimeout(this._searchTimer);
      this._searchTimer = 0;
      this._explorer = null;
      return super.close(options);
    }
  };
}

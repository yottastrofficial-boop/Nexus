import { createLibraryCatalogExplorer, populateLibraryCompendiumSelect } from "./catalog-explorer.js";
import { createLogicAssetEditor } from "./logic-editors.js";
import { createLibraryThemeApplicationAdapter } from "./theme-inspector.js";
import { createLibraryFolder, normalizeLibraryPreferences, renameLibraryFolder, removeLibraryFolder, moveLibraryFolder, assignLibraryEntryFolder, createLibraryCollection, renameLibraryCollection, removeLibraryCollection } from "../core/library-preferences.js";

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
      this._explorer = null;
      this._context = {};
      this._searchTimer = 0;
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

      this._collapsedLibraryFolders ??= new Set();
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
          row.style.paddingLeft = `${Math.min(depth, 8) * 13}px`;
          row.draggable = true;
          const toggle = document.createElement("button");
          toggle.type = "button";
          toggle.className = "nexus-library-folder-toggle";
          toggle.dataset.libraryFolderToggle = folder.id;
          toggle.hidden = children.length === 0;
          toggle.setAttribute("aria-label", expanded ? "Recolher subpastas" : "Expandir subpastas");
          toggle.setAttribute("aria-expanded", String(expanded));
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
      refreshCollections();

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
      root.querySelector("[data-library-app-folders]")?.addEventListener("contextmenu", async event => {
        const target = event.target instanceof Element ? event.target : event.target?.parentElement;
        const button = target?.closest("[data-library-folder]");
        if (!button) return;
        event.preventDefault();
        const folderId = button.dataset.libraryFolder;
        const current = normalizeLibraryPreferences(this._getPreferences());
        const folder = current.folders.find(item => item.id === folderId);
        if (!folder) return;
        const input = globalThis.foundry?.applications?.api?.DialogV2?.input;
        if (typeof input !== "function") return;
        try {
          const result = await input({
            window: { title: "Gerenciar pasta" },
            content: '<label>Nome da pasta<input type="text" name="name" maxlength="80" autocomplete="off"></label>',
            ok: { label: "Renomear" },
            buttons: [
              {
                action: "create-subfolder",
                label: "Nova subpasta",
                class: "nexus-library-create-subfolder",
                callback: () => ({ action: "create-subfolder" })
              },
              {
                action: "delete-folder",
                label: "Excluir pasta",
                class: "nexus-library-delete-folder",
                callback: () => ({ action: "delete-folder" })
              }
            ],
            rejectClose: false
          });
          if (result?.action === "create-subfolder") {
            const child = await input({
              window: { title: "Nova subpasta" },
              content: '<label>Nome da subpasta<input type="text" name="name" maxlength="80" autocomplete="off"></label>',
              ok: { label: "Criar subpasta" },
              rejectClose: false
            });
            const childName = String(child?.name ?? "").trim();
            if (!childName) return;
            await this._savePreferences(createLibraryFolder(this._getPreferences(), {
              id: globalThis.foundry?.utils?.randomID?.(10),
              name: childName,
              collection: folder.collection,
              parentId: folderId
            }).preferences);
            this._collapsedLibraryFolders.delete(folderId);
          } else if (result?.action === "delete-folder") {
            const confirm = globalThis.foundry?.applications?.api?.DialogV2?.confirm;
            const accepted = typeof confirm === "function" && await confirm({
              window: { title: "Excluir pasta" },
              content: "<p>Os recursos serão mantidos sem pasta. As subpastas também serão removidas.</p>",
              yes: { label: "Excluir" },
              no: { label: "Cancelar" },
              rejectClose: false
            });
            if (!accepted) return;
            const before = normalizeLibraryPreferences(this._getPreferences());
            const descendants = new Set([folderId]);
            let changed = true;
            while (changed) {
              changed = false;
              for (const item of before.folders) if (item.parentId && descendants.has(item.parentId) && !descendants.has(item.id)) { descendants.add(item.id); changed = true; }
            }
            await this._savePreferences(removeLibraryFolder(before, folderId));
            if (descendants.has(this._state.folder)) this._state.folder = "";
            for (const id of descendants) this._collapsedLibraryFolders.delete(id);
          } else {
            const name = String(result?.name ?? "").trim();
            if (!name) return;
            await this._savePreferences(renameLibraryFolder(this._getPreferences(), folderId, name));
          }
          refreshFolders();
          await render();
        } catch (error) {
          notify("warn", error.message);
        }
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
        const prompt = globalThis.foundry?.applications?.api?.DialogV2?.input;
        if (typeof prompt !== "function") return;
        const result = await prompt({
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
        const input = globalThis.foundry?.applications?.api?.DialogV2?.input;
        if (typeof input !== "function") return;
        try {
          const result = await input({
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
            const confirm = globalThis.foundry?.applications?.api?.DialogV2?.confirm;
            const accepted = typeof confirm === "function" && await confirm({
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
      if (this._searchTimer) clearTimeout(this._searchTimer);
      this._searchTimer = 0;
      this._explorer = null;
      return super.close(options);
    }
  };
}

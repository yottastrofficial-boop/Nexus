import {
  createDefaultDesignProfile,
  normalizeDesignProfile,
  getDesignProfileDiagnostics,
  exportDesignProfile,
  importDesignProfile,
  DESIGN_PROFILE_PALETTE_KEYS,
  DESIGN_FONT_CHOICES,
  DESIGN_DENSITY_CHOICES,
  DESIGN_RADIUS_CHOICES,
  DESIGN_CONTRAST_CHOICES,
  DESIGN_COMPONENT_CATEGORIES,
  DESIGN_BORDER_STYLE_CHOICES,
} from "../core/design-profile.js";
import { DESIGN_THEME_CHOICES } from "../core/design-constants.js";
import { validateDesignCss } from "../core/design-custom-css.js";

const clone = value => globalThis.foundry?.utils?.deepClone
  ? globalThis.foundry.utils.deepClone(value)
  : JSON.parse(JSON.stringify(value));

function setPath(target, path, value) {
  const parts = String(path).split(".");
  if (parts.length === 1 && parts[0] === "name") { target.name = String(value).slice(0, 64); return true; }
  if (parts.length === 2 && ["palette", "typography", "layout", "accessibility"].includes(parts[0])) {
    target[parts[0]] ??= {};
    target[parts[0]][parts[1]] = value;
    return true;
  }
  if (parts.length === 3 && parts[0] === "components" && Object.hasOwn(DESIGN_COMPONENT_CATEGORIES, parts[1])
    && ["background", "text", "border", "borderStyle", "borderWidth", "radius"].includes(parts[2])) {
    target.components ??= {};
    target.components[parts[1]] ??= {};
    target.components[parts[1]][parts[2]] = value;
    return true;
  }
  return false;
}

export function createDesignStudioApplicationClass({
  ApplicationV2,
  HandlebarsApplicationMixin,
  design,
  library = null
} = {}) {
  if (typeof ApplicationV2 !== "function" || typeof HandlebarsApplicationMixin !== "function") {
    throw new TypeError("ApplicationV2 e HandlebarsApplicationMixin são obrigatórios.");
  }
  if (!design || typeof design.getProfile !== "function" || typeof design.saveProfile !== "function") {
    throw new TypeError("O serviço de aparência NEXUS é obrigatório.");
  }

  const BaseApplication = HandlebarsApplicationMixin(ApplicationV2);
  // ApplicationV2 mutates nested position options during construction. Foundry's
  // submenu can pass frozen option objects, so clone inherited defaults first.
  const inheritedOptions = clone(ApplicationV2.DEFAULT_OPTIONS ?? {});
  const defaultOptions = {
    ...inheritedOptions,
    id: "nexus-design-studio",
    classes: [...new Set([...(Array.isArray(inheritedOptions.classes) ? inheritedOptions.classes : []), "nexus", "nexus-design-studio"])],
    position: { ...(inheritedOptions.position ?? {}), width: 1100, height: 760, minWidth: 360, minHeight: 420 },
    window: {
      ...(inheritedOptions.window ?? {}),
      title: "Estúdio de Aparência NEXUS",
      icon: "fa-solid fa-palette",
      frame: true,
      positioned: true,
      resizable: true
    }
  };

  return class NexusDesignStudio extends BaseApplication {
    static get DEFAULT_OPTIONS() {
      // Foundry may normalize nested ApplicationV2 options in-place. Return a
      // fresh mutable tree for every access instead of sharing freeze-prone state.
      return clone(defaultOptions);
    }
    static PARTS = { main: { template: "systems/nexus/templates/apps/design-studio.hbs" } };

    constructor(options = {}) {
      // The settings submenu may supply frozen options; ApplicationV2 normalizes
      // nested position fields, so give it a mutable copy.
      const mutableOptions = clone(options ?? {});
      super(mutableOptions);
      design.application = this;
      this._target = globalThis.game?.user?.isGM ? "world" : "user";
      this._library = library;
      this._draft = null;
      this._dirty = false;
      this._previewing = false;
      this._busy = false;
    }

    _canRender(options) {
      if (!design.canEditScope("world") && !design.canEditScope("user")) {
        globalThis.ui?.notifications?.warn?.("O Mestre desativou a personalização visual para esta campanha.");
        return false;
      }
      return super._canRender?.(options);
    }

    async _prepareContext(options = {}) {
      const context = await super._prepareContext(options);
      this._draft ??= clone(design.getProfile(this._target));
      const diagnostics = getDesignProfileDiagnostics(this._draft);
      let libraryProfiles = [];
      let libraryUnavailable = false;
      try { libraryProfiles = this._library?.list?.() ?? []; }
      catch (error) {
        libraryUnavailable = true;
        globalThis.console?.warn?.("NEXUS | Biblioteca de Aparências indisponível.", error);
      }
      return {
        ...context,
        profile: this._draft,
        target: this._target,
        libraryProfiles,
        hasDesignLibrary: Boolean(this._library),
        libraryUnavailable,
        canEditWorld: globalThis.game?.user?.isGM === true,
        canEditUser: design.canEditScope("user"),
        targetOptions: [
          ...(design.canEditScope("world") ? [{ value: "world", label: "Campanha", selected: this._target === "world" }] : []),
          ...(design.canEditScope("user") ? [{ value: "user", label: "Meu usuário", selected: this._target === "user" }] : [])
        ],
        presetChoices: Object.entries(DESIGN_THEME_CHOICES).map(([value, label]) => ({ value, label, selected: value === this._draft.preset })),
        paletteFields: DESIGN_PROFILE_PALETTE_KEYS.map(key => ({ key, value: this._draft.palette[key], label: ({
          panel: "Painel", surface: "Superfície", input: "Campos", border: "Bordas",
          text: "Texto principal", muted: "Texto secundário", hover: "Realce ao passar",
          scroll: "Trilho de rolagem", windowHeader: "Cabeçalho de janela", windowContent: "Conteúdo de janela",
          menu: "Menus", placeholder: "Texto auxiliar", resourceButton: "Botões de recursos",
          canvas: "Fundo do Canvas", card: "Cartões", accent: "Cor de destaque",
          highlight: "Destaque forte", button: "Botões"
        })[key] ?? key })),
        componentStyleCategories: Object.entries(DESIGN_COMPONENT_CATEGORIES).map(([key, category]) => {
          const style = this._draft.components[key];
          const path = property => `components.${key}.${property}`;
          return {
            key, label: category.label, description: category.description, customCss: this._draft.customCss?.[key] ?? "",
            colors: [
              { path: path("background"), label: "Cor de fundo", value: style.background },
              { path: path("text"), label: "Cor do texto", value: style.text },
              { path: path("border"), label: "Cor da borda", value: style.border }
            ],
            borderStylePath: path("borderStyle"),
            borderStyles: Object.entries(DESIGN_BORDER_STYLE_CHOICES).map(([value, label]) => ({ value, label, selected: value === style.borderStyle })),
            borderWidthPath: path("borderWidth"), borderWidth: style.borderWidth,
            radiusPath: path("radius"), radius: style.radius
          };
        }),
        fontChoices: Object.entries(DESIGN_FONT_CHOICES).map(([value, label]) => ({ value, label, selected: value === this._draft.typography.family })),
        densityChoices: Object.entries(DESIGN_DENSITY_CHOICES).map(([value, label]) => ({ value, label, selected: value === this._draft.layout.density })),
        radiusChoices: Object.entries(DESIGN_RADIUS_CHOICES).map(([value, label]) => ({ value, label, selected: value === this._draft.layout.radius })),
        contrastChoices: Object.entries(DESIGN_CONTRAST_CHOICES).map(([value, label]) => ({ value, label, selected: value === this._draft.accessibility.contrast })),
        diagnostics,
        warnings: diagnostics.warnings,
        dirty: this._dirty
      };
    }

    async _onRender(context, options) {
      await super._onRender(context, options);
      const root = this.element;
      this._listeners?.abort();
      this._listeners = new AbortController();
      const listenerOptions = { signal: this._listeners.signal };
      root?.addEventListener("input", event => this._onProfileInput(event), listenerOptions);
      root?.addEventListener("change", event => this._onProfileChange(event), listenerOptions);
      root?.addEventListener("change", event => {
        const filter = event.target?.closest?.("[data-design-category-filter]");
        if (!filter || !root.contains(filter)) return;
        const selected = filter.value;
        root.querySelectorAll("[data-design-category]").forEach(section => {
          section.hidden = selected !== "all" && section.dataset.designCategory !== selected;
        });
        root.querySelectorAll("[data-design-preview-category]").forEach(item => {
          item.hidden = selected !== "all" && item.dataset.designPreviewCategory !== selected;
        });
      }, listenerOptions);
      root?.addEventListener("click", event => {
        const tab = event.target?.closest?.("[data-design-section]");
        if (!tab || !root.contains(tab)) return;
        event.preventDefault();
        event.stopPropagation();
        const selected = tab.dataset.designSection;
        root.querySelectorAll("[data-design-section]").forEach(item => {
          const active = item === tab;
          item.classList.toggle("is-active", active);
          item.setAttribute("aria-pressed", String(active));
          item.setAttribute("aria-selected", String(active));
        });
        root.querySelectorAll("[data-design-section-panel]").forEach(panel => {
          panel.hidden = panel.dataset.designSectionPanel !== selected;
        });
      }, listenerOptions);
      root?.addEventListener("click", event => void this._onStudioAction(event), listenerOptions);
      if (this._dirty) this._applyPreview();
    }

    _onProfileInput(event) {
      const control = event.target?.closest?.("[data-design-path]");
      if (!control || !this._draft) return;
      const path = control.dataset.designPath;
      const value = control.type === "checkbox" ? control.checked
        : control.type === "range" || control.type === "number" ? Number(control.value)
        : control.value;
      if (!setPath(this._draft, path, value)) return;
      this._draft = normalizeDesignProfile(this._draft);
      this._dirty = true;
      this._applyPreview();
      const output = this.element?.querySelector('[data-design-output="' + path + '"]');
      if (output) output.textContent = String(value);
      this._refreshDiagnostics();
    }

    _onProfileChange(event) {
      const control = event.target?.closest?.("[data-design-preset]");
      if (!control) return;
      this._draft = createDefaultDesignProfile(control.value);
      this._dirty = true;
      void this.render({ force: true });
    }

    _refreshDiagnostics() {
      const diagnostics = getDesignProfileDiagnostics(this._draft);
      const container = this.element?.querySelector("[data-design-diagnostics]");
      if (!container) return;
      container.replaceChildren();
      for (const check of diagnostics.checks) {
        const item = document.createElement("li");
        item.className = check.passes ? "is-valid" : "is-warning";
        item.textContent = check.label + " — " + check.ratio + ":1";
        container.append(item);
      }
      const message = this.element?.querySelector("[data-design-diagnostics-message]");
      if (message) {
        const hasWarnings = diagnostics.warnings.length > 0;
        message.classList.toggle("nexus-design-warning", hasWarnings);
        message.classList.toggle("nexus-design-success", !hasWarnings);
        message.textContent = hasWarnings
          ? "Alguns pares de cores precisam de mais contraste. Revise a paleta antes de compartilhar."
          : "Os pares de texto avaliados atendem ao contraste selecionado.";
      }
    }

    _applyPreview() {
      if (!this._draft) return;
      design.preview(this._draft);
      this._previewing = true;
    }

    async _onStudioAction(event) {
      const button = event.target?.closest?.("[data-design-action]");
      if (!button) return;
      event.preventDefault();
      const action = button.dataset.designAction;
      if (this._busy) return;
      this._busy = true;
      button.disabled = true;
      try {
        if (action === "target") {
          const select = this.element?.querySelector("[data-design-target]");
          const next = select?.value === "user" ? "user" : "world";
          if (next === "world" && !design.canEditScope("world")) throw new Error("Somente o Mestre pode editar a aparência da campanha.");
          if (next === "user" && !design.canEditScope("user")) throw new Error("A campanha não permite uma aparência individual.");
          if (this._dirty) {
            const confirm = globalThis.foundry?.applications?.api?.DialogV2?.confirm;
            const accepted = typeof confirm === "function" && await confirm({
              window: { title: "Descartar alterações?" },
              content: "<p>O rascunho atual ainda não foi salvo. Deseja descartá-lo e trocar o destino?</p>",
              yes: { label: "Descartar e trocar" },
              no: { label: "Continuar editando" },
              rejectClose: false
            });
            if (!accepted) return;
          }
          design.clearPreview();
          this._previewing = false;
          this._target = next;
          this._draft = clone(design.getProfile(next));
          this._dirty = false;
          await this.render({ force: true });
          return;
        }
        if (action === "save-library") {
          if (!this._library?.save) throw new Error("A Biblioteca de Aparências não está disponível.");
          const entry = await this._library.save(this._draft);
          globalThis.ui?.notifications?.info?.("Perfil salvo na Biblioteca: " + entry.name + ".");
          await this.render({ force: true });
          return;
        }
        if (action === "load-library") {
          const entry = this._library?.get?.(button.dataset.profileId);
          if (!entry) throw new Error("O perfil não existe mais na Biblioteca.");
          if (this._dirty) {
            const confirm = globalThis.foundry?.applications?.api?.DialogV2?.confirm;
            const accepted = typeof confirm === "function" && await confirm({
              window: { title: "Substituir rascunho?" },
              content: "<p>O rascunho atual ainda não foi salvo. Deseja carregá-lo por outro perfil?</p>",
              yes: { label: "Carregar perfil" }, no: { label: "Continuar editando" }, rejectClose: false
            });
            if (!accepted) return;
          }
          this._draft = clone(entry.profile);
          this._dirty = true;
          this._applyPreview();
          await this.render({ force: true });
          return;
        }
        if (action === "apply-library") {
          const result = await this._library?.apply?.(button.dataset.profileId, this._target);
          if (!result?.applied) throw new Error("Não foi possível aplicar o perfil selecionado.");
          this._draft = clone(result.profile);
          this._dirty = false;
          this._previewing = true;
          globalThis.ui?.notifications?.info?.(this._target === "world" ? "Aparência aplicada à campanha." : "Aparência aplicada ao seu usuário.");
          await this.render({ force: true });
          return;
        }
        if (action === "duplicate-library") {
          const entry = await this._library?.duplicate?.(button.dataset.profileId);
          if (!entry) throw new Error("Não foi possível duplicar o perfil.");
          globalThis.ui?.notifications?.info?.("Cópia criada na Biblioteca.");
          await this.render({ force: true });
          return;
        }
        if (action === "rename-library") {
          const row = button.closest("[data-design-profile-row]");
          const entry = await this._library?.rename?.(button.dataset.profileId, row?.querySelector("[data-design-rename-input]")?.value);
          if (!entry) throw new Error("Não foi possível renomear o perfil.");
          globalThis.ui?.notifications?.info?.("Perfil renomeado.");
          await this.render({ force: true });
          return;
        }
        if (action === "delete-library") {
          const confirm = globalThis.foundry?.applications?.api?.DialogV2?.confirm;
          const accepted = typeof confirm === "function" && await confirm({
            window: { title: "Excluir perfil salvo?" },
            content: "<p>Esta ação remove somente a cópia da Biblioteca. A aparência atualmente aplicada à campanha ou ao usuário não será alterada.</p>",
            yes: { label: "Excluir perfil" }, no: { label: "Cancelar" }, rejectClose: false
          });
          if (!accepted) return;
          await this._library?.remove?.(button.dataset.profileId);
          globalThis.ui?.notifications?.info?.("Perfil removido da Biblioteca.");
          await this.render({ force: true });
          return;
        }
        if (action === "export-library") {
          const code = this._library?.export?.(button.dataset.profileId);
          if (!code) throw new Error("Não foi possível exportar o perfil.");
          const blob = new Blob([code], { type: "application/json;charset=utf-8" });
          const url = URL.createObjectURL(blob);
          const link = document.createElement("a");
          link.href = url;
          link.download = "nexus-design-profile-" + button.dataset.profileId + ".json";
          link.click();
          globalThis.setTimeout?.(() => URL.revokeObjectURL(url), 1000);
          return;
        }
        if (action === "save") {
          this._draft = normalizeDesignProfile(this._draft);
          await design.saveProfile(this._draft, this._target);
          this._dirty = false;
          design.preview(this._draft);
          this._previewing = true;
          globalThis.ui?.notifications?.info?.("Aparência salva.");
          await this.render({ force: true });
          return;
        }
        if (action === "reset") {
          this._draft = createDefaultDesignProfile(this._draft.preset);
          this._dirty = true;
          this._applyPreview();
          await this.render({ force: true });
          return;
        }
        if (action === "discard") {
          this._draft = clone(design.getProfile(this._target));
          this._dirty = false;
          this._previewing = false;
          design.clearPreview();
          await this.render({ force: true });
          return;
        }
        if (action === "export") {
          const blob = new Blob([exportDesignProfile(this._draft)], { type: "application/json;charset=utf-8" });
          const url = URL.createObjectURL(blob);
          const link = document.createElement("a");
          link.href = url;
          link.download = "nexus-design-" + this._draft.preset + ".json";
          link.click();
          globalThis.setTimeout?.(() => URL.revokeObjectURL(url), 1000);
          return;
        }
        if (action === "import") {
          const input = document.createElement("input");
          input.type = "file";
          input.accept = ".json,application/json";
          input.hidden = true;
          const cleanupInput = () => input.remove();
          input.addEventListener("cancel", cleanupInput, { once: true });
          input.addEventListener("change", async () => {
            const file = input.files?.[0];
            if (!file) { cleanupInput(); return; }
            try {
              if (file.size > 64 * 1024) throw new RangeError("O arquivo excede 64 KB.");
              this._draft = importDesignProfile(await file.text());
              this._dirty = true;
              this._applyPreview();
              await this.render({ force: true });
            } catch (error) {
              globalThis.ui?.notifications?.error?.("Importação recusada: " + error.message);
            } finally {
              cleanupInput();
            }
          }, { once: true });
          try {
            document.body.append(input);
            input.click();
          } catch (error) {
            cleanupInput();
            throw error;
          }
        }
      } catch (error) {
        globalThis.ui?.notifications?.error?.(error.message);
      } finally {
        this._busy = false;
        if (button.isConnected) button.disabled = false;
      }
    }

    async _onClose(options) {
      this._listeners?.abort();
      this._listeners = null;
      if (this._previewing) design.clearPreview();
      this._previewing = false;
      if (design.application === this) design.application = null;
      await super._onClose(options);
    }
  };
}

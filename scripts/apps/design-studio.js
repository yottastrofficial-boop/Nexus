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
} from "../core/design-profile.js";
import { DESIGN_THEME_CHOICES } from "../core/design-constants.js";

const clone = value => globalThis.foundry?.utils?.deepClone
  ? globalThis.foundry.utils.deepClone(value)
  : JSON.parse(JSON.stringify(value));

function setPath(target, path, value) {
  const parts = String(path).split(".");
  if (parts.length === 1 && parts[0] === "name") { target.name = String(value).slice(0, 64); return true; }
  if (parts.length !== 2 || !["palette", "typography", "layout", "accessibility"].includes(parts[0])) return false;
  target[parts[0]] ??= {};
  target[parts[0]][parts[1]] = value;
  return true;
}

export function createDesignStudioApplicationClass({
  ApplicationV2,
  HandlebarsApplicationMixin,
  design
} = {}) {
  if (typeof ApplicationV2 !== "function" || typeof HandlebarsApplicationMixin !== "function") {
    throw new TypeError("ApplicationV2 e HandlebarsApplicationMixin são obrigatórios.");
  }
  if (!design || typeof design.getProfile !== "function" || typeof design.saveProfile !== "function") {
    throw new TypeError("O serviço de aparência NEXUS é obrigatório.");
  }

  const BaseApplication = HandlebarsApplicationMixin(ApplicationV2);
  const defaultOptions = globalThis.foundry?.utils?.mergeObject
    ? globalThis.foundry.utils.mergeObject(ApplicationV2.DEFAULT_OPTIONS ?? {}, {
        id: "nexus-design-studio",
        classes: ["nexus", "nexus-design-studio"],
        position: { width: 920, height: 760 },
        window: { title: "Estúdio de Aparência NEXUS", icon: "fa-solid fa-palette", frame: true, positioned: true, resizable: true }
      }, { inplace: false })
    : {
        ...(ApplicationV2.DEFAULT_OPTIONS ?? {}),
        id: "nexus-design-studio",
        classes: ["nexus", "nexus-design-studio"],
        position: { width: 920, height: 760 },
        window: { title: "Estúdio de Aparência NEXUS", icon: "fa-solid fa-palette", frame: true, positioned: true, resizable: true }
      };

  return class NexusDesignStudio extends BaseApplication {
    static DEFAULT_OPTIONS = defaultOptions;
    static PARTS = { main: { template: "systems/nexus/templates/apps/design-studio.hbs" } };

    constructor(options = {}) {
      super(options);
      this._target = globalThis.game?.user?.isGM ? "world" : "user";
      this._draft = null;
      this._dirty = false;
      this._previewing = false;
    }

    _canRender(options) {
      if (!design.canEditScope("world") && !design.canEditScope("user")) return false;
      return super._canRender?.(options);
    }

    async _prepareContext(options = {}) {
      const context = await super._prepareContext(options);
      this._draft ??= clone(design.getProfile(this._target));
      const diagnostics = getDesignProfileDiagnostics(this._draft);
      return {
        ...context,
        profile: this._draft,
        target: this._target,
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
      try {
        if (action === "target") {
          const select = this.element?.querySelector("[data-design-target]");
          const next = select?.value === "user" ? "user" : "world";
          if (next === "world" && !design.canEditScope("world")) throw new Error("Somente o Mestre pode editar a aparência da campanha.");
          if (next === "user" && !design.canEditScope("user")) throw new Error("A campanha não permite uma aparência individual.");
          design.clearPreview();
          this._previewing = false;
          this._target = next;
          this._draft = clone(design.getProfile(next));
          this._dirty = false;
          await this.render({ force: true });
          return;
        }
        if (action === "save") {
          this._draft = normalizeDesignProfile(this._draft);
          await design.saveProfile(this._draft, this._target);
          this._dirty = false;
          this._previewing = false;
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
          URL.revokeObjectURL(url);
          return;
        }
        if (action === "import") {
          const input = document.createElement("input");
          input.type = "file";
          input.accept = ".json,application/json";
          input.addEventListener("change", async () => {
            const file = input.files?.[0];
            if (!file) return;
            try {
              if (file.size > 64 * 1024) throw new RangeError("O arquivo excede 64 KB.");
              this._draft = importDesignProfile(await file.text());
              this._dirty = true;
              this._applyPreview();
              await this.render({ force: true });
            } catch (error) {
              globalThis.ui?.notifications?.error?.("Importação recusada: " + error.message);
            }
          }, { once: true });
          input.click();
        }
      } catch (error) {
        globalThis.ui?.notifications?.error?.(error.message);
      }
    }

    async _onClose(options) {
      this._listeners?.abort();
      this._listeners = null;
      if (this._previewing) design.clearPreview();
      this._previewing = false;
      await super._onClose(options);
    }
  };
}

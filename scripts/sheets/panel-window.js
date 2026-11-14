import { DEFAULT_LAYOUT, applyThemeTokens } from "../core/theme.js";

const ApplicationV2 = foundry.applications.api.ApplicationV2;
const NexusPanelWindowBase = foundry.applications.api.HandlebarsApplicationMixin(ApplicationV2);

const ApplicationV2 = foundry.applications.api.ApplicationV2;
const NexusPanelWindowBase = HandlebarsApplicationMixin(ApplicationV2);

export class NexusPanelWindow extends NexusPanelWindowBase {
  static DEFAULT_OPTIONS = foundry.utils.mergeObject(ApplicationV2.DEFAULT_OPTIONS, {
    classes: ["nexus", "nexus-panel-window"],
    position: { width: 400, height: 500 },
    window: { frame: true, positioned: true, resizable: false, minimizable: true }
  }, { inplace: false });

  static PARTS = { main: { template: "systems/nexus/templates/actors/panel-window.hbs" } };

  constructor({ sheet, key, panel, title, width, height, left, top }) {
    super({
      id: `nexus-${sheet.id}-${key}`,
      window: { title },
      position: { width, height, left, top }
    });
    this.sheet = sheet;
    this.panelKey = key;
    this.panel = panel;
  }

  async _prepareContext(options = {}) {
    return { panelTitle: this.options.window?.title ?? "NEXUS" };
  }

  close(options = {}) {
    // A biblioteca monta miniaturas e detalhes; remover a animação evita que a
    // janela pareça travar durante o fechamento. ApplicationV2 V14 suporta animate.
    return super.close({ ...options, animate: ["library", "behavior"].includes(this.panelKey) ? false : options.animate ?? true });
  }

  _mountPanel() {
    const content = this.window?.content ?? this.element?.querySelector(".window-content, .application-content");
    if (!content || !this.panel) return;
    applyThemeTokens(this.element, this.sheet?._currentLayout ?? DEFAULT_LAYOUT);
    if (this.panel.parentElement !== content) content.replaceChildren(this.panel);
    this.panel.hidden = false;
    this.panel.classList.add("nexus-native-panel-content");
    if (["component", "behavior"].includes(this.panelKey)) {
      const root = this.sheet?.element;
      if (root && this.sheet?._setSelection) this.sheet._setSelection($(root), [...(this.sheet._selectedIds ?? [])]);
    }
  }

  setPanel(panel) {
    if (!panel) return;
    this.panel = panel;
    if (this.rendered) this._mountPanel();
  }

  async _onRender(context, options) {
    await super._onRender(context, options);
    this._mountPanel();
    const content = this.window?.content ?? this.element?.querySelector(".window-content, .application-content");
    if (this._enterContent && this._enterHandler) this._enterContent.removeEventListener("keydown", this._enterHandler, true);
    this._enterContent = content;
    this._enterHandler = event => {
      const field = event.target;
      if (event.key !== "Enter" || !(field instanceof HTMLInputElement || field instanceof HTMLSelectElement) ||
          !field.closest(".nexus-component-inspector, .nexus-behavior-editor")) return;
      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation?.();
      field.dispatchEvent(new Event("change", { bubbles: true }));
    };
    content?.addEventListener("keydown", this._enterHandler, true);
  }

  _onClose(options) {
    if (this._enterContent && this._enterHandler) {
      this._enterContent.removeEventListener("keydown", this._enterHandler, true);
    }
    this._enterContent = null;
    this._enterHandler = null;
    this.sheet?._onPanelWindowClosed(this.panelKey, this);
    return super._onClose(options);
  }
}

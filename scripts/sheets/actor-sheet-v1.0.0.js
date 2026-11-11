import { NEXUS_LIBRARY_CATALOG } from "../../assets/library/catalog.js";
import { migrateLegacyActorData } from "../core/migration-manager.js";
import { mergeLayoutSnapshots } from "../core/layout-merge.js";

const layoutReadSnapshots = new WeakMap();
const layoutWriteQueues = new Map();

const ActorSheetV2 = foundry.applications.sheets.ActorSheetV2;
const HandlebarsApplicationMixin = foundry.applications.api.HandlebarsApplicationMixin;
const NexusActorSheetBase = HandlebarsApplicationMixin(ActorSheetV2);

const COMPONENTS = {
  token: { label: "Token", namespace: "core.identity.token", w: 100, h: 100, path: "identity.token.img", kind: "token" },
  pv: { label: "PV · Clássico", namespace: "core.resources.health", w: 190, h: 112, path: "resources.pv", kind: "resource" },
  "resource-meter": { label: "Medidor", namespace: "nexus.asset.meter", w: 100, h: 100, path: "", kind: "resource-meter" },
  "text-field": { label: "Campo de texto", namespace: "nexus.asset.text-field", w: 100, h: 100, path: "", kind: "text-field" },
  "table": { label: "Tabela", namespace: "nexus.asset.table", w: 100, h: 100, path: "", kind: "table" },
  "asset-text": { label: "Texto", namespace: "nexus.asset.text", w: 180, h: 64, path: "", kind: "asset-text" },
  "asset-value": { label: "Valor", namespace: "nexus.asset.value", w: 120, h: 76, path: "", kind: "asset-value" },
  "asset-field": { label: "Campo", namespace: "nexus.asset.field", w: 180, h: 76, path: "", kind: "asset-field" },
  "asset-meter": { label: "Indicador", namespace: "nexus.asset.meter.generic", w: 220, h: 82, path: "", kind: "asset-meter" },
  "asset-table": { label: "Tabela", namespace: "nexus.asset.table.generic", w: 260, h: 180, path: "", kind: "asset-table" },
  "asset-notes": { label: "Anotações", namespace: "nexus.asset.notes", w: 240, h: 160, path: "", kind: "asset-notes" },
  "asset-image": { label: "Imagem", namespace: "nexus.asset.image", w: 120, h: 120, path: "", kind: "asset-image" },
  "asset-link": { label: "Link", namespace: "nexus.asset.link", w: 180, h: 48, path: "", kind: "asset-link" },
  "sheet-name": { label: "Nome do personagem", namespace: "nexus.sheet.identity.name", w: 300, h: 66, path: "name", kind: "sheet-element", variant: "name" },
  "sheet-level": { label: "Nível", namespace: "nexus.sheet.progression.level", w: 100, h: 66, path: "identity.level", kind: "sheet-element", variant: "level" },
  "sheet-lineage": { label: "Linhagem", namespace: "nexus.sheet.identity.lineage", w: 180, h: 66, path: "identity.lineage", kind: "sheet-element", variant: "lineage" },
  "sheet-physiognomy": { label: "Fisionomia", namespace: "nexus.sheet.identity.physiognomy", w: 180, h: 66, path: "", kind: "sheet-element", variant: "physiognomy" },
  "sheet-legacy": { label: "Legado", namespace: "nexus.sheet.identity.legacy", w: 180, h: 66, path: "identity.legacy", kind: "sheet-element", variant: "legacy" },
  "sheet-resource": { label: "Indicador – Barra", namespace: "nexus.sheet.resource.bar", w: 220, h: 58, path: "", kind: "sheet-element", variant: "resource" },
  "sheet-derived": { label: "Indicador compacto", namespace: "nexus.sheet.derived", w: 110, h: 54, path: "", kind: "sheet-element", variant: "derived" },
  "sheet-attribute": { label: "Card de atributo", namespace: "nexus.sheet.attribute", w: 96, h: 88, path: "", kind: "sheet-element", variant: "attribute" },
  "sheet-skill": { label: "Linha de perícia", namespace: "nexus.sheet.skill.row", w: 250, h: 42, path: "", kind: "sheet-element", variant: "skill" },
  "sheet-skill-group": { label: "Grupo de perícias", namespace: "nexus.sheet.skill.group", w: 260, h: 180, path: "", kind: "sheet-element", variant: "skill-group" },
  "sheet-action-attack": { label: "Espaço de ataque", namespace: "nexus.sheet.action.attack", w: 220, h: 112, path: "", kind: "sheet-element", variant: "action-attack" },
  "sheet-action-general": { label: "Espaço de ação", namespace: "nexus.sheet.action.general", w: 220, h: 112, path: "", kind: "sheet-element", variant: "action-general" },
  "sheet-action-reaction": { label: "Espaço de reação", namespace: "nexus.sheet.action.reaction", w: 220, h: 112, path: "", kind: "sheet-element", variant: "action-reaction" },
  "sheet-section": { label: "Cabeçalho de seção", namespace: "nexus.sheet.section.heading", w: 280, h: 38, path: "", kind: "sheet-element", variant: "section" },
  "pv-bar": { label: "PV · Barra", namespace: "core.resources.health", w: 250, h: 82, path: "resources.pv", kind: "resource-bar" },
  "pv-ring": { label: "PV · Circular", namespace: "core.resources.health", w: 130, h: 130, path: "resources.pv", kind: "resource-ring" },
  pm: { label: "PM · Clássico", namespace: "core.resources.mana", w: 150, h: 100, path: "resources.pm", kind: "resource" },
  "pm-bar": { label: "PM · Barra", namespace: "core.resources.mana", w: 250, h: 82, path: "resources.pm", kind: "resource-bar" },
  pe: { label: "PE · Clássico", namespace: "core.resources.energy", w: 150, h: 100, path: "resources.pe", kind: "resource" },
  "pe-bar": { label: "PE · Barra", namespace: "core.resources.energy", w: 250, h: 82, path: "resources.pe", kind: "resource-bar" },
  defense: { label: "Defesa", namespace: "core.combat.defense", w: 150, h: 90, path: "combat.defense", kind: "number" },
  movement: { label: "Movimento", namespace: "core.combat.movement", w: 150, h: 90, path: "combat.movement", kind: "number" },
  desl: { label: "DESL", namespace: "core.combat.desl", w: 120, h: 85, path: "combat.desl", kind: "number" },
  ddr: { label: "DdR", namespace: "core.combat.ddr", w: 120, h: 85, path: "combat.ddr", kind: "number" },
  mb: { label: "MB", namespace: "core.combat.mb", w: 120, h: 85, path: "combat.mb", kind: "number" },
  body: { label: "Corpo", namespace: "core.attributes.body", w: 130, h: 90, path: "attributes.body", kind: "number" },
  mind: { label: "Mente", namespace: "core.attributes.mind", w: 130, h: 90, path: "attributes.mind", kind: "number" },
  soul: { label: "Alma", namespace: "core.attributes.soul", w: 130, h: 90, path: "attributes.soul", kind: "number" },
  name: { label: "Nome", namespace: "core.identity.name", w: 210, h: 75, path: "name", kind: "name" },
  level: { label: "Nível", namespace: "core.progression.level", w: 110, h: 75, path: "identity.level", kind: "number" },
  lineage: { label: "Linhagem", namespace: "core.identity.lineage", w: 170, h: 75, path: "identity.lineage", kind: "text" },
  legacy: { label: "Legado", namespace: "core.identity.legacy", w: 170, h: 75, path: "identity.legacy", kind: "text" },
  notes: { label: "Anotações", namespace: "core.notes", w: 260, h: 150, path: "notes", kind: "text" },
  "custom-card": { label: "Card personalizado", namespace: "nexus.custom.card", w: 220, h: 120, kind: "custom" }
};

const resolveNexusBinding = (actor, expression, depth = 0) => {
  const raw = String(expression ?? "").trim();
  const match = raw.match(/^\{\{\s*([a-zA-Z0-9_.-]+)\s*\}\}$/);
  const source = match ? match[1] : raw;
  if (!source || source.split(".").some(part => ["__proto__", "prototype", "constructor"].includes(part))) return { value: "", path: "" };
  const aliases = { attribute: "attributes", resource: "resources", identity: "identity", combat: "combat", skill: "skills" };
  const parts = source.split(".");
  if (parts[0] === "actor") parts.shift();
  if (parts[0] === "system") parts.shift();
  else if (aliases[parts[0]]) parts[0] = aliases[parts[0]];
  const path = parts.join(".");
  const shortDisplayPath = path.endsWith(".exib") ? `${path.slice(0, -5)}.exibicao` : "";
  const virtualPaths = {
    "identity.portrait.img": { value: actor?.img ?? "", sourcePath: "img" },
    "identity.token.img": { value: getFoundryDefaultTokenImage(actor), sourcePath: "prototypeToken.texture.src" },
    "token.img": { value: getFoundryDefaultTokenImage(actor), sourcePath: "prototypeToken.texture.src" },
    "identity.token.border": { value: actor?.prototypeToken?.ring?.colors?.ring ?? "", sourcePath: "prototypeToken.ring.colors.ring" },
    "token.border": { value: actor?.prototypeToken?.ring?.colors?.ring ?? "", sourcePath: "prototypeToken.ring.colors.ring" }
  };
  if (virtualPaths[path]) return { value: virtualPaths[path].value, path, sourcePath: virtualPaths[path].sourcePath, virtual: true };
  if (shortDisplayPath && getPath(actor?.system ?? {}, path) === undefined && getPath(actor?.system ?? {}, shortDisplayPath) !== undefined) return { value: getPath(actor.system, shortDisplayPath), path, sourcePath: shortDisplayPath };
  if (path === "name") return { value: actor?.name ?? "", path: "name" };
  if (path === "img") return { value: actor?.img ?? "", path: "img" };
  if (["uuid", "id", "_id"].includes(path)) return { value: actor?.[path] ?? "", path, readOnly: true };
  const alias = resolveAliasPath(actor, path);
  let value = alias.alias
    ? (alias.path ? (virtualPaths[alias.path]?.value ?? (alias.path === "name" ? actor?.name : alias.path === "img" ? actor?.img : getPath(actor?.system ?? {}, alias.path))) : getPath(getCustomAliasData(actor), [alias.alias.key, alias.suffix === "exib" ? "exibicao" : alias.suffix].filter(Boolean).join(".")))
    : getPath(actor?.system ?? {}, path);
  if (alias.alias?.type === "resource" && alias.suffix === "percentage") {
    const resource = alias.path ? getPath(actor?.system ?? {}, alias.path) : getPath(getCustomAliasData(actor), alias.alias.key);
    const current = Number(resource?.value), max = Number(resource?.max);
    value = Number.isFinite(current) && Number.isFinite(max) && max > 0 ? Math.round(current / max * 100) : 0;
  }
  value = value && typeof value === "object" && Object.hasOwn(value, "value") ? value.value : value;
  if (alias.alias && alias.suffix === "name" && (value === undefined || value === null || value === "")) value = alias.alias.label;
  if (alias.alias && ["exib", "exibicao"].includes(alias.suffix) && (value === undefined || value === null || value === "")) value = alias.alias.exib ?? alias.alias.label;
  if (alias.alias?.type === "attribute" && alias.suffix === "checkbonus" && typeof value === "string" && depth < 8) {
    const calculated = evaluateAliasExpression(actor, value, depth + 1);
    if (calculated !== null) value = calculated;
  }
  return { value, path, alias: alias.alias };
};

const getResourceValuePaths = component => {
  const resourceMap = { pv: "resources.pv", pm: "resources.pm", pe: "resources.pe" };
  let base = component?.currentPath || "";
  if (!base) {
    if (component?.type === "resource-meter") base = component.binding === "custom" ? (component.customBinding || "") : (resourceMap[component.binding] || "");
    else base = COMPONENTS[component?.type]?.path || component?.dataPath || "";
  }
  base = String(base).replace(/^system\./, "");
  if (base.endsWith(".value")) base = base.slice(0, -6);
  return {
    current: component?.currentPath || (base ? `${base}.value` : ""),
    max: component?.maxPath || (base ? `${base}.max` : "")
  };
};

const DEFAULT_LAYOUT = {
  id: "principal", name: "Principal", width: 800, height: 800,
  gridSize: 20, gridEnabled: true, snapEnabled: true, guidesEnabled: true, fontSize: 13, secondaryFontSize: 11, valueFontSize: 20,
  canvasColor: "#171f2a", cardColor: "#273443", accentColor: "#52647b", highlightColor: "#78b7e8", buttonColor: "#315b7d", theme: "nexus-dark", fontFamily: "Inter",
  components: [], links: []
};

const THEME_TOKENS = {
  "nexus-dark": { panel: "#182330", surface: "#202e3e", input: "#111b27", border: "#3c5067", text: "#e7edf5", muted: "#9aadc2", hover: "#2a3d52", scroll: "#111923", windowHeader: "#223246", windowContent: "#192431", menu: "#202f40", placeholder: "#91a6bd", resourceButton: "#315b7d", canvas: "#171f2a", card: "#273443", accent: "#52647b", highlight: "#78b7e8", button: "#315b7d" },
  midnight: { panel: "#101a2b", surface: "#18283d", input: "#0b1422", border: "#304a68", text: "#e6f0fc", muted: "#91a9c5", hover: "#223c5a", scroll: "#0b1422", windowHeader: "#18283d", windowContent: "#101a2b", menu: "#18283d", placeholder: "#91a9c5", resourceButton: "#244c78", canvas: "#0c1220", card: "#18253a", accent: "#355477", highlight: "#80c8ff", button: "#244c78" },
  light: { panel: "#e8edf3", surface: "#ffffff", input: "#f5f7fa", border: "#aab8c8", text: "#243247", muted: "#586b80", hover: "#dce6f0", scroll: "#dce6f0", windowHeader: "#ffffff", windowContent: "#e8edf3", menu: "#ffffff", placeholder: "#718096", resourceButton: "#d7e8f7", canvas: "#e8edf3", card: "#ffffff", accent: "#8797aa", highlight: "#276fa8", button: "#d7e8f7" },
  steam: { panel: "#101b2b", surface: "#1b2d42", input: "#0b1624", border: "#31516b", text: "#e7f1fb", muted: "#9ab4cc", hover: "#263f58", scroll: "#0b1624", windowHeader: "#16283b", windowContent: "#101b2b", menu: "#1b2d42", placeholder: "#88a8c4", resourceButton: "#1769a6", canvas: "#0c1725", card: "#1b2d42", accent: "#367ba8", highlight: "#66c0f4", button: "#1769a6" },
  linux: { panel: "#191724", surface: "#262338", input: "#11101a", border: "#51466b", text: "#eeeaf7", muted: "#b0a5c8", hover: "#39334f", scroll: "#11101a", windowHeader: "#242036", windowContent: "#191724", menu: "#262338", placeholder: "#a89cbe", resourceButton: "#6554a3", canvas: "#14121e", card: "#262338", accent: "#6554a3", highlight: "#8bd5ca", button: "#6554a3" },
  medieval: { panel: "#282018", surface: "#3b2e20", input: "#1c1712", border: "#80633d", text: "#f0e3c7", muted: "#bda981", hover: "#4a3926", scroll: "#1c1712", windowHeader: "#3b2e20", windowContent: "#282018", menu: "#302519", placeholder: "#b39d75", resourceButton: "#77532c", canvas: "#1b1712", card: "#30251b", accent: "#85663f", highlight: "#d7aa59", button: "#77532c", fontFamily: "Georgia" },
  "pixel-art": { panel: "#17152b", surface: "#29264a", input: "#100f20", border: "#5a568a", text: "#f4f0ff", muted: "#b8b2d8", hover: "#39345f", scroll: "#100f20", windowHeader: "#29264a", windowContent: "#17152b", menu: "#29264a", placeholder: "#aaa3d2", resourceButton: "#6b5bd2", canvas: "#100f20", card: "#29264a", accent: "#7569d9", highlight: "#ffcf70", button: "#6b5bd2", fontFamily: "monospace" }
};

const THEME_PALETTES = Object.fromEntries(Object.entries(THEME_TOKENS).map(([id, theme]) => [id, {
  canvasColor: theme.canvas, cardColor: theme.card, accentColor: theme.accent,
  highlightColor: theme.highlight, buttonColor: theme.button, scrollColor: theme.scroll,
  windowHeaderColor: theme.windowHeader, windowContentColor: theme.windowContent,
  menuColor: theme.menu, placeholderColor: theme.placeholder
}]));

const applyThemeTokens = (element, layout = {}) => {
  if (!element?.style) return;
  const theme = THEME_TOKENS[layout.theme] ?? THEME_TOKENS["nexus-dark"];
  const values = {
    "--nexus-panel-bg": theme.panel,
    "--nexus-panel-surface": theme.surface,
    "--nexus-panel-input": theme.input,
    "--nexus-panel-border": theme.border,
    "--nexus-panel-text": theme.text,
    "--nexus-panel-muted": theme.muted,
    "--nexus-panel-hover": theme.hover,
    "--nexus-scroll-bg": layout.scrollColor ?? theme.scroll,
    "--nexus-scroll-thumb": layout.accentColor ?? theme.accent,
    "--nexus-resource-button": theme.resourceButton,
    "--nexus-window-header": layout.windowHeaderColor ?? theme.windowHeader,
    "--nexus-window-content": layout.windowContentColor ?? theme.windowContent,
    "--nexus-menu-bg": layout.menuColor ?? theme.menu,
    "--nexus-placeholder-color": layout.placeholderColor ?? theme.placeholder,
    "--nexus-canvas-color": layout.canvasColor ?? theme.canvas,
    "--nexus-card-color": layout.cardColor ?? theme.card,
    "--nexus-accent-color": layout.accentColor ?? theme.accent,
    "--nexus-highlight-color": layout.highlightColor ?? theme.highlight,
    "--nexus-button-color": layout.buttonColor ?? theme.button,
    "--nexus-font-family": `"${layout.fontFamily ?? "Inter"}", sans-serif`,
    "--nexus-control-bg": theme.input, "--nexus-control-text": theme.text,
    "--nexus-control-border": theme.border, "--nexus-control-hover": theme.hover,
    "--nexus-tab-bg": theme.panel, "--nexus-tab-active": theme.accent,
    "--nexus-header-text": theme.text, "--nexus-card-border": theme.border,
    "--nexus-card-shadow": layout.theme === "steam" ? "0 4px 14px #0007" : "0 2px 8px #0003",
    "--nexus-nav-bg": theme.panel, "--nexus-nav-hover": theme.hover,
    "--nexus-menu-border": theme.border, "--nexus-button-text": theme.text,
    "--nexus-button-hover": theme.hover,
    "--nexus-radius-small": ["steam", "pixel-art"].includes(layout.theme) ? "0px" : layout.theme === "medieval" ? "5px" : "6px",
    "--nexus-radius-panel": layout.theme === "steam" ? "2px" : "8px",
    "--nexus-spacing-unit": layout.theme === "steam" ? "6px" : "8px",
    "--nexus-font-ui": layout.theme === "steam" ? "Arial, Helvetica, sans-serif" : `"${layout.fontFamily ?? "Inter"}", sans-serif`,
    "--nexus-navigation-bg": theme.panel,
    "--nexus-navigation-active": theme.accent,
    "--nexus-input-focus": theme.highlight,
    "--nexus-scroll-track": theme.scroll,
    "--nexus-scroll-handle": theme.accent
  };
  values["--nexus-theme-id"] = layout.theme ?? "nexus-dark";
  for (const [key, value] of Object.entries(values)) element.style.setProperty(key, value);
  element.dataset.theme = layout.theme ?? "nexus-dark";
};

const ApplicationV2 = foundry.applications.api.ApplicationV2;
const NexusPanelWindowBase = HandlebarsApplicationMixin(ApplicationV2);

class NexusPanelWindow extends NexusPanelWindowBase {
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
    return super.close({ ...options, animate: this.panelKey === "library" ? false : options.animate ?? true });
  }

  _mountPanel() {
    const content = this.window?.content ?? this.element?.querySelector(".window-content, .application-content");
    if (!content || !this.panel) return;
    applyThemeTokens(this.element, this.sheet?._currentLayout ?? DEFAULT_LAYOUT);
    if (this.panel.parentElement !== content) content.replaceChildren(this.panel);
    this.panel.hidden = false;
    this.panel.classList.add("nexus-native-panel-content");
    if (this.panelKey === "component") {
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
          !field.closest(".nexus-component-inspector")) return;
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

const clone = value => foundry.utils.deepClone(value);
const getPath = (object, path) => {
  const parts = String(path ?? "").split(".");
  if (!path || parts.some(part => !part || ["__proto__", "prototype", "constructor"].includes(part))) return undefined;
  return parts.reduce((value, key) => value?.[key], object);
};
const collectPropertyPaths = actor => {
  const paths = new Set();
  // actor.system é a fonte ativa. Não percorremos _source/toObject em paralelo:
  // isso duplicava a mesma árvore e expunha representações internas do Foundry.
  const source = actor?.system ?? {};
  const visit = (value, prefix = "", depth = 0) => {
    if (!value || typeof value !== "object" || Array.isArray(value) || depth > 8) return;
    for (const [key, child] of Object.entries(value)) {
      if (["__proto__", "prototype", "constructor", "_id", "id", "uuid", "sort", "folder", "ownership", "flags"].includes(key)) continue;
      if (!prefix && ["name", "names"].includes(key)) continue;
      const path = prefix ? `${prefix}.${key}` : key;
      if (child === null || ["string", "number", "boolean"].includes(typeof child) || Array.isArray(child)) paths.add(path);
      else if (child && typeof child === "object") {
        // Percorre a estrutura inteira. value/max são caminhos úteis, mas não
        // tornam os demais campos irmãos menos válidos para o editor.
        visit(child, path, depth + 1);
      }
    }
  };
  visit(source);
  // Propriedades virtuais estáveis: separam retrato, arte do token e moldura
  // sem duplicar URLs em componentes. São resolvidas para campos reais do Foundry.
  for (const path of ["identity.portrait.img", "identity.token.img", "identity.token.border", "token.img", "token.border"]) paths.add(path);
  return paths;
};

const NATIVE_PROPERTY_BASE = [
  { id:"core.resource.pv", label:"Pontos de Vida", exib:"PV", category:"resources", type:"resource", key:"resources.pv", targetPath:"resources.pv" },
  { id:"core.resource.pm", label:"Pontos de Mana", exib:"PM", category:"resources", type:"resource", key:"resources.pm", targetPath:"resources.pm" },
  { id:"core.resource.pe", label:"Pontos de Energia", exib:"PE", category:"resources", type:"resource", key:"resources.pe", targetPath:"resources.pe" },
  { id:"core.attribute.body", label:"Corpo", exib:"CORPO", category:"attributes", type:"attribute", key:"attributes.body", targetPath:"attributes.body" },
  { id:"core.attribute.mind", label:"Mente", exib:"MENTE", category:"attributes", type:"attribute", key:"attributes.mind", targetPath:"attributes.mind" },
  { id:"core.attribute.soul", label:"Alma", exib:"ALMA", category:"attributes", type:"attribute", key:"attributes.soul", targetPath:"attributes.soul" },
  { id:"core.combat.defense", label:"Defesa", category:"combat", type:"number", key:"combat.defense", targetPath:"combat.defense" },
  { id:"core.combat.movement", label:"Movimento", category:"combat", type:"number", key:"combat.movement", targetPath:"combat.movement" },
  { id:"core.combat.desl", label:"DESL", category:"combat", type:"number", key:"combat.desl", targetPath:"combat.desl" },
  { id:"core.combat.ddr", label:"DdR", category:"combat", type:"number", key:"combat.ddr", targetPath:"combat.ddr" },
  { id:"core.combat.mb", label:"MB", category:"combat", type:"number", key:"combat.mb", targetPath:"combat.mb" },
  { id:"core.identity.level", label:"Nível", category:"identity", type:"number", key:"identity.level", targetPath:"identity.level" },
  { id:"core.identity.lineage", label:"Linhagem", category:"identity", type:"text", key:"identity.lineage", targetPath:"identity.lineage" },
  { id:"core.identity.legacy", label:"Legado", category:"identity", type:"text", key:"identity.legacy", targetPath:"identity.legacy" },
  { id:"core.identity.name", label:"Nome do personagem", category:"identity", type:"text", key:"identity.name", targetPath:"name" }
];
const nativePropertyDefinitionCache = new WeakMap();
const EMPTY_NATIVE_PROPERTY_LIST = Object.freeze([]);
const invalidateNativePropertyCache = actor => { if (actor && typeof actor === "object") nativePropertyDefinitionCache.delete(actor); };
const getNativePropertyDefinitions = actor => {
  if (!actor || typeof actor !== "object") return NATIVE_PROPERTY_BASE.map(base => ({ ...base, defaultKey:base.key, defaultLabel:base.label, origin:"native", legacyKeys:[] }));
  const saved = actor.getFlag?.("nexus", "nativeProperties") ?? EMPTY_NATIVE_PROPERTY_LIST;
  const cached = nativePropertyDefinitionCache.get(actor);
  const revision = actor?._stats?.modifiedTime ?? actor?.system;
  if (cached?.source === saved && cached?.revision === revision) return cached.value;
  const byId = new Map((Array.isArray(saved) ? saved : []).map(item => [item.id, item]));
  const value = NATIVE_PROPERTY_BASE.map(base => {
    const override = byId.get(base.id) ?? {};
    return { ...base, ...override, id:base.id, defaultKey:base.key, defaultLabel:base.label, origin:"native", targetPath:base.targetPath, key:safeAliasKey(override.key ?? base.key) || base.key, label:String(override.label ?? base.label).slice(0,48), legacyKeys:Array.isArray(override.legacyKeys) ? override.legacyKeys.filter(key => safeAliasKey(key)) : [] };
  });
  const coreIds = new Set(value.map(item => item.targetPath));
  for (const path of collectPropertyPaths(actor)) {
    if ([...coreIds].some(core => path === core || path.startsWith(`${core}.`)) || path.startsWith("identity.portrait.") || path.startsWith("identity.token.")) continue;
    const raw = getPath(actor.system ?? {}, path);
    if (raw === undefined || raw === null || typeof raw === "object") continue;
    const id = `system.${path}`;
    const override = byId.get(id) ?? {};
    const type = typeof raw === "number" ? "number" : typeof raw === "boolean" ? "boolean" : "text";
    const label = path.split(".").map(part => part.replace(/[-_]/g, " ")).join(" · ");
    value.push({ id, label:String(override.label ?? label).slice(0,48), category:"external", type, key:safeAliasKey(override.key ?? path) || path, targetPath:path, defaultKey:path, defaultLabel:label, origin:"native", legacyKeys:Array.isArray(override.legacyKeys) ? override.legacyKeys.filter(key => safeAliasKey(key)) : [] });
  }
  nativePropertyDefinitionCache.set(actor, { source:saved, revision, value });
  return value;
};
const replaceLayoutBindingPaths = (layouts, oldKey, newKey) => {
  if (!oldKey || !newKey || oldKey === newKey) return;
  for (const layout of Object.values(layouts ?? {})) for (const component of layout.components ?? []) {
    for (const property of ["dataPath", "currentPath", "maxPath", "customBinding"]) {
      const value = component[property];
      if (typeof value === "string" && (value === oldKey || value.startsWith(`${oldKey}.`))) component[property] = `${newKey}${value.slice(oldKey.length)}`;
    }
  }
};

const EMPTY_ALIAS_LIST = Object.freeze([]);
const aliasDefinitionCache = new WeakMap();
const invalidateAliasDefinitionCache = actor => { if (actor && typeof actor === "object") aliasDefinitionCache.delete(actor); };
const getAliasDefinitions = actor => {
  if (!actor || typeof actor !== "object") return [];
  const stored = actor.getFlag?.("nexus", "aliases") ?? EMPTY_ALIAS_LIST;
  const cached = aliasDefinitionCache.get(actor);
  if (cached?.source === stored) return cached.value;
  const seen = new Set();
  const value = (Array.isArray(stored) ? stored : []).map(normalizeAliasDefinition).filter(alias => {
    if (!alias || seen.has(alias.key)) return false;
    seen.add(alias.key); return true;
  }).sort((a, b) => b.key.length - a.key.length);
  aliasDefinitionCache.set(actor, { source: stored, value });
  return value;
};
const getCustomAliasData = actor => actor?.getFlag?.("nexus", "customData") ?? {};
const normalizeAliasDefinition = alias => {
  if (!alias || typeof alias !== "object") return null;
  const category = ["attributes", "resources", "combat", "identity", "custom"].includes(alias.category) ? alias.category : "custom";
  let key = String(alias.key ?? "").trim().replace(/^system\./, "");
  // Corrige caminhos legados como attributes.attributes.agi sem tocar em nomes legítimos.
  const repeated = new RegExp(`^(?:${category}\\.){2,}`, "i");
  if (repeated.test(key)) key = key.replace(repeated, `${category}.`);
  key = safeAliasKey(key);
  if (!key) return null;
  const validTypes = ["attribute", "resource", "number", "text", "url", "image", "boolean"];
  const type = validTypes.includes(alias.type) ? alias.type : (category === "resources" ? "resource" : category === "attributes" ? "attribute" : category === "identity" ? "text" : "number");
  return { ...alias, id: alias.id ?? foundry.utils.randomID(), key, category, legacyKeys: Array.isArray(alias.legacyKeys) ? alias.legacyKeys.filter(item => safeAliasKey(item)) : [], label: String(alias.label ?? key.split(".").at(-1)).slice(0,48), type, targetPath: safeAliasKey(alias.targetPath ?? ""), source: alias.source === "actor" ? "actor" : "custom" };
};
const safeAliasKey = value => {
  const key = String(value ?? "").trim().replace(/^actor\./, "").replace(/^system\./, "");
  return /^[a-zA-Z][a-zA-Z0-9_-]*(?:\.[a-zA-Z][a-zA-Z0-9_-]*)*$/.test(key) && !key.split(".").some(part => ["__proto__", "prototype", "constructor"].includes(part)) ? key : "";
};
const evaluateAliasExpression = (actor, expression, depth = 0) => {
  if (depth > 8 || typeof expression !== "string" || !expression.trim()) return null;
  const source = expression.trim();
  const tokens = [];
  const pattern = /\s*([A-Za-z_][A-Za-z0-9_-]*(?:\.[A-Za-z_][A-Za-z0-9_-]*)*|(?:\d+(?:\.\d*)?|\.\d+)|[()+*/-])\s*/gy;
  let cursor = 0;
  while (cursor < source.length) {
    pattern.lastIndex = cursor; const match = pattern.exec(source);
    if (!match) return null;
    tokens.push(match[1]); cursor = pattern.lastIndex;
  }
  let index = 0;
  const primary = () => {
    const token = tokens[index++];
    if (token === "(") { const value = sum(); if (tokens[index++] !== ")") throw new Error("parenthesis"); return value; }
    if (token === "+") return primary();
    if (token === "-") return -primary();
    if (token === undefined) throw new Error("missing");
    if (/^(?:\d+(?:\.\d*)?|\.\d+)$/.test(token)) return Number(token);
    const resolved = resolveNexusBinding(actor, token, depth + 1).value;
    const number = Number(resolved);
    if (!Number.isFinite(number)) throw new Error("not numeric");
    return number;
  };
  const product = () => { let value = primary(); while (["*", "/"].includes(tokens[index])) { const op = tokens[index++], right = primary(); value = op === "*" ? value * right : value / right; } return value; };
  const sum = () => { let value = product(); while (["+", "-"].includes(tokens[index])) { const op = tokens[index++], right = product(); value = op === "+" ? value + right : value - right; } return value; };
  try { const result = sum(); return index === tokens.length && Number.isFinite(result) ? result : null; } catch (_) { return null; }
};

const resolveAliasPath = (actor, path) => {
  const aliases = [...getNativePropertyDefinitions(actor), ...getAliasDefinitions(actor)];
  let matchedKey = "";
  const alias = aliases.find(item => {
    const keys = [item.key, ...(item.legacyKeys ?? [])];
    matchedKey = keys.find(key => path === key || path.startsWith(`${key}.`)) ?? "";
    return !!matchedKey;
  });
  if (!alias) return { path, alias: null, suffix: "" };
  const suffix = path.slice(matchedKey.length).replace(/^\./, "");
  let targetPath = alias.targetPath ? [alias.targetPath, suffix].filter(Boolean).join(".") : "";
  // Atributos podem apontar o valor para um campo numérico nativo; metadados
  // (nome, bônus e fórmula) continuam pertencendo ao alias.
  if (alias.targetPath && alias.type === "attribute") {
    if (suffix === "value") targetPath = alias.targetPath;
    else if (["name", "exib", "exibicao", "checkbonus", "roll"].includes(suffix)) targetPath = "";
  }
  if (alias.targetPath && alias.type === "resource") {
    if (suffix === "percentage") targetPath = alias.targetPath;
    else if (["name", "exib", "exibicao"].includes(suffix)) targetPath = "";
  }
  return { path: targetPath, alias, suffix };
};

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
const DEFAULT_FOUNDRY_TOKEN_IMAGE = "icons/svg/mystery-man.svg";
const IMAGE_EXTENSIONS = "png|jpe?g|jpe|jfif|pjpeg|pjp|gif|apng|webp|avif|svg|bmp|dib|tif|tiff|ico|heic|heif|jxl";
const AUDIO_EXTENSIONS = "mp3|ogg|wav|m4a|aac|flac|opus";
const VIDEO_EXTENSIONS = "mp4|webm|ogv|mov|m4v|mkv|avi|mpeg|mpg|3gp";
const MEDIA_EXTENSION_PATTERN = new RegExp(`\\.(?:${IMAGE_EXTENSIONS}|${AUDIO_EXTENSIONS}|${VIDEO_EXTENSIONS})(?:[?#].*)?$`, "i");
const VIDEO_EXTENSION_PATTERN = new RegExp(`\\.(?:${VIDEO_EXTENSIONS})(?:[?#].*)?$`, "i");
const isMediaSource = value => {
  const source = String(value ?? "").trim();
  if (!source || /[{}]/.test(source)) return false;
  if (/^data:(?:image|audio|video)\/[a-z0-9.+-]+(?:;[^,]*)?,/i.test(source)) return true;
  // URLs HTTP(S) podem ser links assinados/CDN sem extensão visível; o navegador
  // confirma o formato durante o carregamento. Caminhos locais exigem extensão.
  if (/^https?:\/\//i.test(source)) return true;
  return !/^[a-z][a-z0-9+.-]*:/i.test(source) && MEDIA_EXTENSION_PATTERN.test(source);
};
const isVideoSource = value => VIDEO_EXTENSION_PATTERN.test(String(value ?? "")) || /^data:video\//i.test(String(value ?? ""));
const isAudioSource = value => new RegExp(`\\.(?:${AUDIO_EXTENSIONS})(?:[?#].*)?$`, "i").test(String(value ?? "")) || /^data:audio\//i.test(String(value ?? ""));
const isImageSource = value => isMediaSource(value) && !isVideoSource(value) && !isAudioSource(value);
const isUsableTokenSource = value => {
  const source = String(value ?? "").trim();
  return source !== DEFAULT_FOUNDRY_TOKEN_IMAGE && (isImageSource(source) || isVideoSource(source));
};
const getFoundryDefaultTokenImage = actor => {
  // identity.token.img pode existir como dado real do sistema; não deve ser
  // mascarado pelo caminho virtual que expõe o token padrão do Foundry.
  const systemTokenImage = String(getPath(actor?.system, "identity.token.img") ?? "").trim();
  const prototypeImage = String(actor?.prototypeToken?.texture?.src ?? actor?.prototypeToken?.img ?? "").trim();
  const actorImage = String(actor?.img ?? "").trim();
  return [systemTokenImage, prototypeImage, actorImage].find(isUsableTokenSource) ?? DEFAULT_FOUNDRY_TOKEN_IMAGE;
};
const getTokenImageSource = (actor, component, boundValue = "") => {
  const customRaw = String(component?.tokenImage ?? "").trim();
  const customBinding = customRaw.match(/^\{\{\s*([^{}]+?)\s*\}\}$/);
  const custom = customBinding ? String(resolveNexusBinding(actor, customBinding[1]).value ?? "").trim() : customRaw;
  const bound = String(boundValue ?? "").trim();
  const usesImplicitTokenPath = !component?.dataPath || ["img", "identity.token.img"].includes(String(component.dataPath));
  const systemTokenImage = String(getPath(actor?.system, "identity.token.img") ?? "").trim();
  const actorImage = String(actor?.img ?? "").trim();
  const prototypeImage = String(actor?.prototypeToken?.texture?.src ?? actor?.prototypeToken?.img ?? "").trim();
  const candidates = usesImplicitTokenPath
    ? [custom, systemTokenImage, actorImage, bound, prototypeImage]
    : [custom, bound, systemTokenImage, actorImage, prototypeImage];
  return candidates.find(isUsableTokenSource) ?? DEFAULT_FOUNDRY_TOKEN_IMAGE;
};
const isSafeLink = value => /^(https?:\/\/|mailto:|\/)/i.test(String(value ?? "").trim());

// Um único renderer mantém a mesma estrutura visual nos previews da biblioteca,
// no inspetor e no componente inserido na ficha.
const setPreviewContent = (node, value) => {
  if (!node) return;
  node.replaceChildren();
  const content = String(value ?? "").trim();
  if (isImageSource(content)) {
    const img = document.createElement("img");
    img.src = content;
    img.alt = "";
    img.loading = "lazy";
    node.append(img);
  } else node.textContent = content;
  node.hidden = !content;
};

const createSheetResourcePreview = ({
  label = "PV", icon = "❤️", current = 32, max = 40,
  color = "#3198ce", trackColor = "#080d14", orientation = "horizontal", showValues = true
} = {}) => {
  const root = document.createElement("div");
  root.className = `nexus-sheet-resource nexus-sheet-resource-preview${orientation === "vertical" ? " is-vertical" : ""}`;
  root.style.setProperty("--nexus-resource-color", color);
  root.style.setProperty("--nexus-resource-track-color", trackColor);
  const labelNode = document.createElement("span");
  labelNode.className = "nexus-sheet-resource-label";
  setPreviewContent(labelNode, label);
  const iconNode = document.createElement("span");
  iconNode.className = "nexus-sheet-resource-icon";
  setPreviewContent(iconNode, icon);
  const track = document.createElement("div");
  track.className = "nexus-sheet-resource-track";
  const fill = document.createElement("i");
  const currentNumber = Number(current), maxNumber = Number(max);
  const percent = current == null || current === "" || max == null || max === "" || !Number.isFinite(currentNumber) || !Number.isFinite(maxNumber) || maxNumber <= 0
    ? 0 : clamp(currentNumber / maxNumber, 0, 1) * 100;
  fill.style.setProperty("width", orientation === "horizontal" ? `${percent}%` : "100%", "important");
  fill.style.setProperty("height", orientation === "vertical" ? `${percent}%` : "100%", "important");
  track.append(fill);
  root.append(labelNode, iconNode, track);
  if (showValues) {
    const values = document.createElement("strong");
    values.className = "nexus-sheet-resource-values";
    const currentNode = document.createElement("b");
    currentNode.textContent = String(current);
    const separator = document.createElement("span");
    separator.textContent = "/";
    const maxNode = document.createElement("b");
    maxNode.textContent = String(max);
    values.append(currentNode, separator, maxNode);
    root.append(values);
  }
  return root;
};

const fitSheetResourcePreview = (stage, component, maxSize = 174) => {
  if (!stage || !component) return;
  const preview = stage.querySelector(".nexus-sheet-resource-preview");
  if (!preview) return;
  const width = Math.max(1, Number(component.w) || 220);
  const height = Math.max(1, Number(component.h) || 58);
  const scale = Math.min(maxSize / width, maxSize / height);
  preview.style.setProperty("width", `${Math.max(1, width * scale)}px`, "important");
  preview.style.setProperty("height", `${Math.max(1, height * scale)}px`, "important");
  preview.style.setProperty("max-width", "100%", "important");
  preview.style.setProperty("max-height", "100%", "important");
  stage.dataset.componentWidth = String(width);
  stage.dataset.componentHeight = String(height);
};

const updateSheetResourcePreview = (root, settings = {}) => {
  if (!root) return;
  const {
    label = "PV", icon = "❤️", current = 32, max = 40,
    color = "#3198ce", trackColor = "#080d14", orientation = "horizontal"
  } = settings;
  const nodes = root.querySelectorAll(".nexus-sheet-resource-label,.nexus-sheet-resource-icon");
  setPreviewContent(nodes[0], label);
  setPreviewContent(nodes[1], icon);
  const values = root.querySelectorAll(".nexus-sheet-resource-values b");
  if (values[0]) values[0].textContent = current == null || current === "" ? "—" : String(current);
  if (values[1]) values[1].textContent = max == null || max === "" ? "—" : String(max);
  root.style.setProperty("--nexus-resource-color", color);
  root.style.setProperty("--nexus-resource-track-color", trackColor);
  root.classList.toggle("is-vertical", orientation === "vertical");
  const fill = root.querySelector(".nexus-sheet-resource-track > i");
  const currentNumber = Number(current), maxNumber = Number(max);
  const percent = current == null || current === "" || max == null || max === "" || !Number.isFinite(currentNumber) || !Number.isFinite(maxNumber) || maxNumber <= 0
    ? 0 : clamp(currentNumber / maxNumber, 0, 1) * 100;
  if (fill) {
    // Regras verticais usam propriedades !important; atualizar com prioridade
    // evita que a altura fixa da barra prevaleça sobre o valor atual.
    fill.style.setProperty("width", orientation === "horizontal" ? `${percent}%` : "100%", "important");
    fill.style.setProperty("height", orientation === "vertical" ? `${percent}%` : "100%", "important");
  }
};


/* NEXUS professional color control: HSV spectrum, alpha and optional background textures. */
if (!customElements.get("nexus-color-picker")) {
  class NexusColorPicker extends HTMLElement {
    constructor() {
      super();
      this.attachShadow({ mode: "open" });
      this._h = 210; this._s = 0.55; this._v = 0.72; this._a = 1; this._texture = "solid"; this._value = "#526b89";
      this._outsideHandler = event => { if (!event.composedPath().includes(this)) this._close(); };
    }
    connectedCallback() {
      if (this.shadowRoot.childElementCount) return;
      this._build();
      this._readValue(this.getAttribute("value") || this._value);
      this._sync();
      document.addEventListener("pointerdown", this._outsideHandler, true);
    }
    disconnectedCallback() { document.removeEventListener("pointerdown", this._outsideHandler, true); }
    get value() { return this._value; }
    set value(value) { this._readValue(String(value ?? "")); this._sync(); }
    _build() {
      this.shadowRoot.innerHTML = `
        <style>
          :host{display:inline-block;position:relative;box-sizing:border-box;min-width:0;width:100%;font:12px/1.35 Inter,system-ui,sans-serif;color:var(--nexus-panel-text,#e7edf5)}
          *{box-sizing:border-box}.trigger{display:flex;align-items:center;gap:7px;width:100%;min-height:30px;padding:1px 0;border:0;border-radius:0;background:transparent;color:inherit;text-align:left;cursor:pointer}
          .swatch{width:27px;height:27px;flex:0 0 27px;border:1px solid #ffffff55;border-radius:5px;background-color:#526b89;background-image:linear-gradient(45deg,#888 25%,transparent 25%),linear-gradient(-45deg,#888 25%,transparent 25%),linear-gradient(45deg,transparent 75%,#888 75%),linear-gradient(-45deg,transparent 75%,#888 75%);background-size:8px 8px;background-position:0 0,0 4px,4px -4px,-4px 0;overflow:hidden}
          .swatch i{display:block;width:100%;height:100%;background:#526b89}.trigger span:last-child{min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font:600 11px ui-monospace,monospace}
          .popover{position:fixed;z-index:2147483647;left:12px;top:12px;width:min(292px,calc(100vw - 28px));max-height:calc(100vh - 24px);overflow:auto;margin:0;padding:11px;border:1px solid var(--nexus-panel-border,#52647b);border-radius:10px;background:var(--nexus-panel-bg,#182330);box-shadow:0 12px 34px #000a}
          .popover:not(:popover-open){display:none}.spectrum{position:relative;height:146px;border-radius:6px;cursor:crosshair;touch-action:none;background:linear-gradient(to top,#000,transparent),linear-gradient(to right,#fff,hsl(210 100% 50%))}.thumb{position:absolute;width:13px;height:13px;border:2px solid white;border-radius:50%;box-shadow:0 0 0 1px #000b;transform:translate(-50%,-50%);pointer-events:none}
          .range-row{display:grid;grid-template-columns:52px minmax(0,1fr);align-items:center;gap:8px;margin-top:10px}.range-row label{font-size:10px;color:var(--nexus-panel-muted,#9aadc2)}input[type=range]{width:100%;margin:0;accent-color:var(--nexus-highlight-color,#78b7e8)}
          .hue{height:12px;border-radius:10px;background:linear-gradient(90deg,#f00,#ff0,#0f0,#0ff,#00f,#f0f,#f00);appearance:none}.alpha{height:12px;border-radius:10px;appearance:none;background:linear-gradient(90deg,transparent,var(--picked-color,#526b89)),repeating-conic-gradient(#777 0 25%,#aaa 0 50%) 0/8px 8px}
          .fields{display:grid;grid-template-columns:minmax(0,1fr) auto;align-items:center;gap:8px;margin-top:10px}.hex{width:100%;min-width:0;height:31px;padding:5px 8px;border:1px solid var(--nexus-panel-border,#3c5067);border-radius:5px;background:var(--nexus-panel-input,#111b27);color:inherit;font:12px ui-monospace,monospace}.rgba{color:var(--nexus-panel-muted,#9aadc2);font-size:10px;white-space:nowrap}
          .texture{width:100%;height:31px;margin-top:9px;padding:4px 7px;border:1px solid var(--nexus-panel-border,#3c5067);border-radius:5px;background:var(--nexus-panel-input,#111b27);color:inherit;font:11px Inter,system-ui,sans-serif}.texture[hidden]{display:none}
          button:focus-visible,input:focus-visible,select:focus-visible{outline:2px solid var(--nexus-highlight-color,#78b7e8);outline-offset:2px}
        </style>
        <button class="trigger" type="button" aria-haspopup="dialog" aria-expanded="false"><i class="swatch"><i></i></i><span>#526b89</span></button>
        <div class="popover" popover="auto" role="dialog" aria-label="Seletor avançado de cores">
          <div class="spectrum" tabindex="0" aria-label="Saturação e luminosidade"><i class="thumb"></i></div>
          <div class="range-row"><label>Matiz</label><input class="hue" type="range" min="0" max="360" value="210"></div>
          <div class="range-row"><label>Opacidade</label><input class="alpha" type="range" min="0" max="100" value="100"></div>
          <div class="fields"><input class="hex" type="text" spellcheck="false" maxlength="9" aria-label="Código hexadecimal"><output class="rgba"></output></div>
          <select class="texture" aria-label="Textura" hidden><option value="solid">Cor sólida</option><option value="diagonal">Listras diagonais</option><option value="stripes">Faixas</option><option value="dots">Pontos</option><option value="grid">Grade</option></select>
        </div>`;
      const q = selector => this.shadowRoot.querySelector(selector);
      q(".popover").addEventListener("toggle", () => q(".trigger").setAttribute("aria-expanded", String(q(".popover").matches(":popover-open"))));
      q(".trigger").addEventListener("click", () => {
        const panel = q(".popover");
        if (panel.matches(":popover-open")) panel.hidePopover();
        else {
          const rect = this.getBoundingClientRect(), width = Math.min(292, window.innerWidth - 28), estimatedHeight = Math.min(390, window.innerHeight - 24);
          const left = Math.max(14, Math.min(rect.left, window.innerWidth - width - 14));
          const below = rect.bottom + 7;
          const top = below + estimatedHeight <= window.innerHeight - 10 ? below : Math.max(10, rect.top - estimatedHeight - 7);
          panel.style.left = `${left}px`; panel.style.top = `${top}px`;
          panel.showPopover();
        }
        q(".trigger").setAttribute("aria-expanded", String(panel.matches(":popover-open")));
      });
      q(".spectrum").addEventListener("pointerdown", event => { q(".spectrum").setPointerCapture?.(event.pointerId); this._pickSV(event); const move=e=>this._pickSV(e); const up=()=>{q(".spectrum").removeEventListener("pointermove",move);q(".spectrum").removeEventListener("pointerup",up);this._emit("change");}; q(".spectrum").addEventListener("pointermove",move); q(".spectrum").addEventListener("pointerup",up,{once:true}); q(".spectrum").addEventListener("pointercancel",up,{once:true}); });
      q(".hue").addEventListener("input", event=>{this._h=Number(event.target.value);this._sync();this._emit("input");});
      q(".hue").addEventListener("change",()=>this._emit("change"));
      q(".alpha").addEventListener("input", event=>{this._a=Number(event.target.value)/100;this._sync();this._emit("input");});
      q(".alpha").addEventListener("change",()=>this._emit("change"));
      q(".hex").addEventListener("change", event=>{if(this._readValue(event.target.value)){this._sync();this._emit("input");this._emit("change");}else event.target.value=this._hex();});
      q(".texture").addEventListener("change", event=>{this._texture=event.target.value;this._sync();this._emit("input");this._emit("change");});
      this.shadowRoot.addEventListener("keydown", event=>{if(event.key==="Escape")this._close();});
      if(this.hasAttribute("allow-texture"))q(".texture").hidden=false;
    }
    _close(){const panel=this.shadowRoot.querySelector(".popover");if(panel?.matches(":popover-open")){panel.hidePopover();this.shadowRoot.querySelector(".trigger")?.setAttribute("aria-expanded","false");}}
    _pickSV(event){const rect=this.shadowRoot.querySelector(".spectrum").getBoundingClientRect();this._s=Math.min(1,Math.max(0,(event.clientX-rect.left)/rect.width));this._v=1-Math.min(1,Math.max(0,(event.clientY-rect.top)/rect.height));this._sync();this._emit("input");}
    _readValue(value){let raw=String(value||"").trim();if(!raw)return false;const pattern=raw.includes("repeating-linear-gradient")? (raw.includes("45deg")?"diagonal":"stripes"):raw.includes("radial-gradient")?"dots":raw.includes("linear-gradient")?"grid":"solid";if(pattern!=="solid"){this._texture=pattern;const match=raw.match(/#[0-9a-f]{6,8}/i);raw=match?.[0]||"#526b89";}else this._texture="solid";
      let r,g,b,a=1;const hex=raw.match(/^#([0-9a-f]{3}|[0-9a-f]{6}|[0-9a-f]{8})$/i);if(hex){let h=hex[1];if(h.length===3)h=[...h].map(c=>c+c).join("");if(h.length===8)a=parseInt(h.slice(6),16)/255; r=parseInt(h.slice(0,2),16);g=parseInt(h.slice(2,4),16);b=parseInt(h.slice(4,6),16);}else{const rgb=raw.match(/^rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)(?:\s*,\s*([\d.]+))?\s*\)$/i);if(!rgb)return false;r=+rgb[1];g=+rgb[2];b=+rgb[3];a=rgb[4]===undefined?1:Number(rgb[4]);}
      const max=Math.max(r,g,b)/255,min=Math.min(r,g,b)/255,d=max-min;let h=0,s=max===0?0:d/max;if(d){if(max===r/255)h=((g-b)/255/d)%6;else if(max===g/255)h=(b-r)/255/d+2;else h=(r-g)/255/d+4;h*=60;if(h<0)h+=360;}this._h=h;this._s=s;this._v=max;this._a=Math.min(1,Math.max(0,a));this._value=this._serialize();return true;}
    _rgb(){const c=this._v*this._s,x=c*(1-Math.abs((this._h/60)%2-1)),m=this._v-c;let r=0,g=0,b=0;if(this._h<60)[r,g,b]=[c,x,0];else if(this._h<120)[r,g,b]=[x,c,0];else if(this._h<180)[r,g,b]=[0,c,x];else if(this._h<240)[r,g,b]=[0,x,c];else if(this._h<300)[r,g,b]=[x,0,c];else[r,g,b]=[c,0,x];return [r,g,b].map(n=>Math.round((n+m)*255));}
    _hex(){const [r,g,b]=this._rgb();return "#"+[r,g,b].map(n=>n.toString(16).padStart(2,"0")).join("")+(this._a<.999?Math.round(this._a*255).toString(16).padStart(2,"0"):"");}
    _serialize(){const [r,g,b]=this._rgb();const paint=this._hex();if(this._texture==="solid")return paint;if(this._texture==="dots")return `radial-gradient(circle, ${paint} 1.4px, transparent 1.6px) 0 0 / 8px 8px`;if(this._texture==="grid")return `linear-gradient(${paint} 1px, transparent 1px), linear-gradient(90deg, ${paint} 1px, transparent 1px)`;if(this._texture==="stripes")return `repeating-linear-gradient(0deg, ${paint} 0 5px, transparent 5px 10px)`;return `repeating-linear-gradient(45deg, ${paint} 0 5px, transparent 5px 10px)`;}
    _sync(){if(!this.shadowRoot.childElementCount)return;const q=s=>this.shadowRoot.querySelector(s),[r,g,b]=this._rgb(),rgba=`rgba(${r}, ${g}, ${b}, ${this._a.toFixed(2)})`;this._value=this._serialize();q(".spectrum").style.background=`linear-gradient(to top,#000,transparent),linear-gradient(to right,#fff,hsl(${this._h} 100% 50%))`;q(".thumb").style.left=`${this._s*100}%`;q(".thumb").style.top=`${(1-this._v)*100}%`;q(".hue").value=this._h;q(".alpha").value=Math.round(this._a*100);q(".alpha").style.setProperty("--picked-color",`rgb(${r} ${g} ${b})`);q(".hex").value=this._hex();q(".rgba").textContent=`${r}, ${g}, ${b} · ${Math.round(this._a*100)}%`;q(".swatch i").style.background=this._value;q(".trigger span").textContent=this._texture==="solid"?this._hex():`Textura · ${this._texture}`;q(".texture").value=this._texture;}
    _emit(type){this.dispatchEvent(new Event(type,{bubbles:true,composed:true}));}
  }
  customElements.define("nexus-color-picker", NexusColorPicker);
}

export class NexusActorSheet extends NexusActorSheetBase {
  static DEFAULT_OPTIONS = foundry.utils.mergeObject(ActorSheetV2.DEFAULT_OPTIONS, {
    classes: ["nexus", "sheet", "actor"],
    position: { width: 800, height: 850 },
    window: { resizable: true }
  }, { inplace: false });

  static PARTS = {
    main: { template: "systems/nexus/templates/actors/actor-sheet.hbs" }
  };

  render(options = {}) {
    const panel = document.querySelector(`[data-tool-panel="aliases"]`) ?? this.element?.querySelector?.('[data-tool-panel="aliases"]');
    if (panel && !panel.hidden) this._pendingAliasScrollTop = panel.scrollTop;
    const sheetScrollSelectors = [".nexus-appearance-drawer", ".nexus-canvas-scroll", ".nexus-sidebar-left", ".nexus-sidebar-right", ".nexus-tool-panel[data-tool-panel='aliases']", ".nexus-library-grid", ".nexus-layer-list", ".nexus-component-inspector", ".nexus-inspector-tab-panel[data-inspector-tab-panel='card']", ".nexus-inspector-tab-panel[data-inspector-tab-panel='appearance']"];
    const sheetScrollState = sheetScrollSelectors.map(selector => { const node = this.element?.querySelector?.(selector); return node ? { selector, top: node.scrollTop, left: node.scrollLeft } : null; }).filter(Boolean);
    const states = [...(this._nexusPanelWindows?.entries?.() ?? [])].map(([key, instance]) => {
      const element = instance?.element;
      if (!element?.isConnected) return null;
      const active = element.contains(document.activeElement) ? document.activeElement : null;
      const attrs = active ? ["data-component-setting","data-layout-setting","data-global-typography","data-alias-field","data-native-property-field","data-property-value","data-component-path-input","data-config-current-value","data-config-max-value","data-alias-select","data-alias-new-name","data-inspector-tab","data-floating-panel","data-text-style-control"] : [];
      const descriptor = active ? attrs.map(attr => active.hasAttribute(attr) ? { attr, value: active.getAttribute(attr), targetId: active.dataset.componentTargetId ?? "", aliasId: active.dataset.aliasId ?? "" } : null).find(Boolean) : null;
      const scroll = [...element.querySelectorAll(".window-content,.application-content,.nexus-component-inspector,.nexus-layer-list,.nexus-alias-manager,.nexus-library-grid,.nexus-inspector-tab-panel")].map(node => ({ selector: node.classList.contains("nexus-component-inspector") ? ".nexus-component-inspector" : node.classList.contains("nexus-layer-list") ? ".nexus-layer-list" : node.classList.contains("nexus-alias-manager") ? ".nexus-alias-manager" : node.classList.contains("nexus-library-grid") ? ".nexus-library-grid" : node.classList.contains("nexus-inspector-tab-panel") ? `.nexus-inspector-tab-panel[data-inspector-tab-panel="${node.dataset.inspectorTabPanel}"]` : node.classList.contains("window-content") ? ".window-content" : ".application-content", top: node.scrollTop, left: node.scrollLeft }));
      let start = null, end = null;
      try { start = active?.selectionStart ?? null; end = active?.selectionEnd ?? null; } catch (_) {}
      return { key, descriptor, tag: active?.tagName, value: active && "value" in active ? active.value : null, checked: active?.type === "checkbox" ? active.checked : null, start, end, left: element.style.left, top: element.style.top, scroll };
    }).filter(Boolean);
    const activeCanvasBeforeRender = this.element?.querySelector?.(".nexus-canvas");
    const canvasHadFocus = !!activeCanvasBeforeRender && (document.activeElement === activeCanvasBeforeRender || activeCanvasBeforeRender.contains(document.activeElement));
    const result = super.render(options);
    const restore = () => {
      for (const saved of sheetScrollState) { const node = this.element?.querySelector?.(saved.selector); if (node) { node.scrollTop = saved.top; node.scrollLeft = saved.left; } }
      for (const state of states) {
        const instance = this._nexusPanelWindows?.get(state.key), element = instance?.element;
        if (!element?.isConnected) continue;
        if (state.left) element.style.left = state.left;
        if (state.top) element.style.top = state.top;
        for (const saved of state.scroll) { const node = element.querySelector(saved.selector); if (node) { node.scrollTop = saved.top; node.scrollLeft = saved.left; } }
        if (state.descriptor) {
          const activeNow = document.activeElement;
          const { attr, value, targetId, aliasId } = state.descriptor;
          const target = [...element.querySelectorAll(`[${attr}]`)].find(node => node.getAttribute(attr) === value && (!state.tag || node.tagName === state.tag) && (!targetId || node.dataset.componentTargetId === targetId) && (!aliasId || node.dataset.aliasId === aliasId));
          const canRestoreFocus = !activeNow || activeNow === document.body || activeNow === document.documentElement || activeNow === target;
          if (target && canRestoreFocus) { if (state.value !== null && "value" in target) target.value = state.value; if (state.checked !== null && target.type === "checkbox") target.checked = state.checked; target.focus({ preventScroll:true }); if (state.start !== null && target.setSelectionRange) { try { target.setSelectionRange(state.start,state.end); } catch (_) {} } }
        }
      }
      if (canvasHadFocus) this.element?.querySelector?.(".nexus-canvas")?.focus?.({ preventScroll: true });
    };
    const scheduleRestore = () => requestAnimationFrame(() => requestAnimationFrame(restore));
    if (result && typeof result.then === "function") {
      result.then(scheduleRestore, error => {
        console.error("NEXUS | Falha ao renderizar a ficha", error);
        ui.notifications?.error?.("O NEXUS não conseguiu atualizar a ficha. Consulte o console para detalhes.");
      });
    } else scheduleRestore();
    return result;
  }

  async _prepareContext(options = {}) {
    const context = await super._prepareContext(options);
    context.actor = this.actor;
    context.system = this.actor.system ?? {};
    const layouts = await this._readLayouts();
    const storedActiveId = String(this.actor.getFlag("nexus", "activeLayout") ?? "principal");
    const activeId = layouts[storedActiveId] ? storedActiveId : "principal";
    const normalizedAliases = getAliasDefinitions(this.actor);
    const aliases = normalizedAliases.map(alias => {
      const stored = getPath(getCustomAliasData(this.actor), alias.key);
      const external = alias.targetPath ? resolveNexusBinding(this.actor, alias.targetPath).value : undefined;
      const sourceValue = alias.targetPath ? external : stored;
      const current = sourceValue && typeof sourceValue === "object" ? { ...(stored && typeof stored === "object" ? stored : {}), ...sourceValue } : { ...(stored && typeof stored === "object" ? stored : {}), value: sourceValue };
      if (["attribute", "resource"].includes(alias.type)) {
        current.name ??= alias.label;
        current.exibicao ??= alias.label;
      }
      const max = Number(current.max), amount = Number(current.value);
      return { ...alias, shortKey: alias.key.split(".").at(-1), value: current,
        scalarValue: sourceValue && typeof sourceValue === "object" ? "" : sourceValue ?? "",
        percentage: Number.isFinite(max) && max > 0 && Number.isFinite(amount) ? Math.round(amount / max * 100) : 0 };
    });
    // Todos os layouts são normalizados em memória antes de construir a interface.
    // Isso permite abrir fichas antigas mesmo quando faltam arrays ou opções recentes.
    const layout = this._normalizeLayout(clone(layouts[activeId] ?? layouts.principal ?? DEFAULT_LAYOUT));
    this._currentLayout = layout;
    context.nexus = {
      actor: this.actor, system: this.actor.system ?? {}, mode: this._mode ?? "play", layout,
      layouts: Object.values(layouts).map(item => ({ ...item, ...this._layoutTabPresentation(item) })), components: COMPONENTS,
      layers: (() => {
        const groups = layout.groups ?? [];
        const groupedIds = new Set(groups.flatMap(group => group.componentIds ?? []));
        const componentLayer = component => ({ id: component.id, label: component.customLabel || COMPONENTS[component.type]?.label || component.type, icon: String(component.layerIcon ?? ""), image: isImageSource(component.layerImage) ? component.layerImage : "", z: Number(component.z) || 0, stackOrder: Number(component.stackOrder) || 0, kind: "component", hidden: !!component.hidden, locked: !!component.locked });
        return [
          ...groups.map(group => {
            const children = layout.components.filter(component => (group.componentIds ?? []).includes(component.id)).map(component => ({...componentLayer(component), hidden:!!component.hidden || !!group.hidden, locked:!!component.locked || !!group.locked})).sort((a,b) => b.z-a.z || b.stackOrder-a.stackOrder);
            return { id: group.id, icon: String(group.layerIcon ?? ""), image: isImageSource(group.layerImage) ? group.layerImage : "", collapsed: !!this._collapsedLayerGroups?.has(group.id), label: group.name ?? "Grupo", z: children.length ? Math.min(...children.map(child => child.z)) : 0, stackOrder: children.length ? Math.min(...children.map(child => child.stackOrder)) : 0, kind: "group", hidden: !!group.hidden, locked: !!group.locked, componentIds: group.componentIds, children };
          }),
          ...layout.components.filter(component => !groupedIds.has(component.id)).map(componentLayer)
        ].sort((a,b) => b.z-a.z || b.stackOrder-a.stackOrder);
      })(),
      rendered: layout.components.map(c => { const group=(layout.groups??[]).find(g=>(g.componentIds??[]).includes(c.id)); return this._componentContext({ ...c, hidden: !!c.hidden || !!group?.hidden, locked: !!c.locked || !!group?.locked, groupId: group?.id ?? "" }); }).filter(Boolean),
      aliases,
      selectedAlias: aliases.find(alias => alias.id === this._selectedAliasId) ?? aliases[0] ?? null,
      nativeProperties: getNativePropertyDefinitions(this.actor).map(item => { const data = getCustomAliasData(this.actor); const raw = item.targetPath === "name" ? this.actor.name : getPath(this.actor.system ?? {}, item.targetPath); return { ...item, shortKey:item.key.split(".").at(-1), currentValue: item.type === "resource" || item.type === "attribute" ? (raw?.value ?? "") : raw ?? "", maxValue: item.type === "resource" ? (raw?.max ?? "") : "", checkbonus:getPath(data, `${item.key}.checkbonus`) ?? "", roll:getPath(data, `${item.key}.roll`) ?? "" }; }),
      selectedNativeProperty: (() => { const items = getNativePropertyDefinitions(this.actor).map(item => { const data = getCustomAliasData(this.actor); const raw = item.targetPath === "name" ? this.actor.name : getPath(this.actor.system ?? {}, item.targetPath); return { ...item, shortKey:item.key.split(".").at(-1), currentValue: item.type === "resource" || item.type === "attribute" ? (raw?.value ?? "") : raw ?? "", maxValue: item.type === "resource" ? (raw?.max ?? "") : "", checkbonus:getPath(data, `${item.key}.checkbonus`) ?? "", roll:getPath(data, `${item.key}.roll`) ?? "" }; }); return this._selectedNativePropertyId ? (items.find(item => item.id === this._selectedNativePropertyId) ?? null) : null; })(),
      aliasEditorMode: this._aliasEditorMode ?? "custom",
      isNPC: this.actor.type === "npc"
    };
    return context;
  }

  async _migrateLegacyActorData() {
    if (this._nexusMigrationCompleted) return;
    if (this._nexusMigrationPromise) return this._nexusMigrationPromise;

    this._nexusMigrationPromise = migrateLegacyActorData({
      actor: this.actor,
      readLayouts: () => this._readLayouts(),
      getAliasDefinitions,
      getCustomAliasData,
      normalizeAliasDefinition,
      invalidateAliasDefinitionCache,
      getPath,
      clone,
      setProperty: foundry.utils.setProperty
    });

    try {
      const result = await this._nexusMigrationPromise;
      this._nexusMigrationCompleted = true;
      return !!result?.changed;
    } catch (error) {
      console.warn("NEXUS | Migração de dados legados adiada; a ficha continuará usando os dados legíveis.", error);
      return false;
    } finally {
      this._nexusMigrationPromise = null;
    }
  }

  _getHeaderControls() {
    const controls = super._getHeaderControls() ?? [];
    controls.push(
      { action: "nexus-default-mode", label: "Padrão", icon: "fa-solid fa-eye", onClick: () => this._setMode("play") },
      { action: "nexus-config-mode", label: "Configuração", icon: "fa-solid fa-sliders", onClick: () => this._setMode("config") },
      { action: "nexus-appearance-mode", label: "Aparência", icon: "fa-solid fa-palette", onClick: () => this._setMode("appearance") }
    );
    return controls;
  }

  _normalizeLayout(layout) {
    layout.width = clamp(Number(layout.width) || 800, 800, 1000);
    layout.height = clamp(Number(layout.height) || 800, 300, 3000);
    layout.gridSize = clamp(Number(layout.gridSize) || 20, 5, 100);
    layout.gridEnabled ??= true; layout.snapEnabled ??= true; layout.guidesEnabled ??= true;
    layout.fontSize ??= 13; layout.secondaryFontSize ??= 11; layout.valueFontSize ??= 20;
    layout.theme ??= "nexus-dark"; layout.fontFamily ??= THEME_TOKENS[layout.theme]?.fontFamily ?? "Inter";
    layout.tabValue = String(layout.tabValue ?? "").slice(0, 2048);
    layout.tabIcon = String(layout.tabIcon ?? "fa-solid fa-star").slice(0, 80);
    layout.tabImage = isImageSource(layout.tabImage) ? String(layout.tabImage).slice(0, 2048) : "";
    Object.assign(layout, this._layoutTabPresentation(layout));
    const palette = THEME_PALETTES[layout.theme] ?? THEME_PALETTES["nexus-dark"];
    for (const [key, value] of Object.entries(palette)) layout[key] ??= value;
    if (!Array.isArray(layout.components)) layout.components = [];
    layout.components = layout.components.filter(component => component && typeof component === "object" && !Array.isArray(component)).map((component, index) => {
      component.id = String(component.id ?? `cmp-legacy-${index + 1}`);
      component.type ??= component.componentType ?? component.kind ?? "";
      return component;
    });
    if (!Array.isArray(layout.groups)) layout.groups = layout.groups && typeof layout.groups === "object" ? Object.values(layout.groups) : [];
    layout.groups = layout.groups
      .filter(group => group && typeof group === "object" && !Array.isArray(group))
      .map((group, index) => ({
        ...group,
        id: String(group.id ?? `grp-legacy-${index + 1}`),
        componentIds: Array.isArray(group.componentIds) ? group.componentIds.filter(id => typeof id === "string") : []
      }));
    if (!Array.isArray(layout.links)) layout.links = layout.links && typeof layout.links === "object" ? Object.values(layout.links) : [];
    layout.links = layout.links.filter(link => link && typeof link.id === "string").map(link => ({ id: link.id, name: String(link.name ?? "Vínculo").slice(0, 48), type: String(link.type ?? "data"), sourcePath: String(link.sourcePath ?? ""), members: [...new Set((Array.isArray(link.members) ? link.members : []).filter(id => typeof id === "string"))] })).filter(link => link.members.length >= 2);
    const migrateTypographyInheritance = layout.typographyInheritanceMigrated !== true;
    layout.components.forEach((c, index) => {
      c.z = Number.isFinite(Number(c.z)) ? Math.max(0, Math.trunc(Number(c.z))) : 0;
      c.stackOrder = Number.isFinite(Number(c.stackOrder)) ? Math.max(0, Math.trunc(Number(c.stackOrder))) : index;
    });
    for (const c of layout.components) {
      const d = COMPONENTS[c.type]; if (!d) continue;
      // Tokens antigos que apontavam para Actor.img passam a consumir a propriedade
      // própria do prototype token; a imagem personalizada continua sendo um override.
      if (c.type === "token" && (!String(c.dataPath ?? "").trim() || c.dataPath === "img")) c.dataPath = "identity.token.img";
      c.w = clamp(Number(c.w) || d.w, 20, layout.width);
      c.h = clamp(Number(c.h) || d.h, 20, layout.height);
      // Sem override salvo, o componente herda a tipografia global do tema.
      // Na primeira leitura, os valores padrão gravados pela 1.28.x viram herança.
      if (migrateTypographyInheritance && Number(c.fontSize) === 13) delete c.fontSize;
      else if (c.fontSize !== undefined) c.fontSize = clamp(Number(c.fontSize) || 13, 7, 32);
      if (migrateTypographyInheritance && c.fontFamily === "Inter") delete c.fontFamily;
      else if (c.fontFamily) c.fontFamily = ["Inter", "Arial", "Georgia", "Verdana", "Trebuchet MS", "monospace"].includes(c.fontFamily) ? c.fontFamily : (layout.fontFamily ?? "Inter");
      if (migrateTypographyInheritance && c.labelPosition === "top-left") delete c.labelPosition;
      else if (c.labelPosition) c.labelPosition = ["top-left", "top-center", "side-left"].includes(c.labelPosition) ? c.labelPosition : "top-left";
    }
    layout.typographyInheritanceMigrated = true;
    for (const c of layout.components) {
      const d = COMPONENTS[c.type]; if (!d) continue;
      c.x = clamp(Number(c.x) || 0, 0, layout.width - c.w);
      c.y = clamp(Number(c.y) || 0, 0, layout.height - c.h);
    }
    const validIds = new Set(layout.components.map(c => c.id));
    const assignedGroupMembers = new Set();
    layout.groups = layout.groups.map(group => {
      const componentIds = [...new Set(group.componentIds ?? [])].filter(id => {
        if (!validIds.has(id) || assignedGroupMembers.has(id)) return false;
        assignedGroupMembers.add(id);
        return true;
      });
      return { ...group, componentIds };
    }).filter(group => group.componentIds.length >= 2);
    for (const group of layout.groups) {
      const members = layout.components.filter(c => group.componentIds.includes(c.id));
      group.z = members.length ? Math.min(...members.map(c => Number(c.z) || 0)) : 0;
    }
    return layout;
  }

  _layoutTabPresentation(layout) {
    const raw = String(layout.tabValue ?? "").trim();
    const legacyMode = layout.tabMode ?? "";
    const candidate = raw || (legacyMode === "icon" ? String(layout.tabIcon ?? "") : legacyMode === "image" ? String(layout.tabImage ?? "") : "");
    const isIcon = /^(fa-[a-z0-9-]+\s*){1,3}$/i.test(candidate) && candidate.includes("fa-");
    const isImage = isImageSource(candidate);
    return {
      tabMode: isIcon ? "icon" : isImage ? "image" : candidate ? "text" : "icon",
      tabIcon: isIcon ? candidate : "fa-solid fa-star",
      tabImage: isImage ? candidate : "",
      tabValue: isIcon || isImage ? "" : (candidate || "")
    };
  }

  _normalizeTextStyle(style = {}) {
    const fontSize = Number(style.fontSize), letterSpacing = Number(style.letterSpacing), lineHeight = Number(style.lineHeight);
    return {
      fontSize: Number.isFinite(fontSize) && fontSize >= 7 && fontSize <= 48 ? fontSize : undefined,
      fontFamily: ["Inter","Arial","Georgia","Verdana","monospace"].includes(style.fontFamily) ? style.fontFamily : undefined,
      color: /^#(?:[0-9a-f]{3}|[0-9a-f]{6}|[0-9a-f]{8})$/i.test(String(style.color ?? "")) ? style.color : undefined,
      textAlign: ["left","center","right","justify"].includes(style.textAlign) ? style.textAlign : undefined,
      fontWeight: ["400","500","600","700","800"].includes(String(style.fontWeight)) ? String(style.fontWeight) : undefined,
      fontStyle: ["normal","italic"].includes(style.fontStyle) ? style.fontStyle : undefined,
      textDecoration: ["none","underline"].includes(style.textDecoration) ? style.textDecoration : undefined,
      textTransform: ["none","uppercase","lowercase","capitalize"].includes(style.textTransform) ? style.textTransform : undefined,
      letterSpacing: Number.isFinite(letterSpacing) && letterSpacing >= -2 && letterSpacing <= 12 ? letterSpacing : undefined,
      lineHeight: Number.isFinite(lineHeight) && lineHeight >= 0.8 && lineHeight <= 2.4 ? lineHeight : undefined
    };
  }
  _componentContext(component) {
    const def = COMPONENTS[component.type]; if (!def) return null;
    if (def.kind === "custom") {
      const binding = component.dataPath ? resolveNexusBinding(this.actor, component.dataPath) : null;
      const hasBoundValue = binding?.value !== undefined && binding?.value !== null && typeof binding.value !== "object";
      const headingLabel = String(component.customLabel ?? "").trim();
      return {
        ...component,
        actionType: ["roll", "proficiency"].includes(component.actionType) ? component.actionType : "",
        proficiencyLevel: clamp(Number(component.actionPath ? resolveNexusBinding(this.actor, component.actionPath).value : component.proficiencyLevel) || 0, 0, 3),
        proficiencyStages: (component.proficiencyLabels ?? ["Sem domínio", "Básico", "Treinado", "Especialista"]).slice(0, 4).map((label, level) => ({ level, label: String(label || ("Nível " + level)), active: level === clamp(Number(component.proficiencyLevel) || 0, 0, 3) })),
        contentStyle: this._normalizeTextStyle(component.contentStyle), headingStyle: this._normalizeTextStyle(component.headingStyle),
        z: Number(component.z) || 0,
        renderZ: (Number(component.z) || 0) * 100000 + (Number(component.stackOrder) || 0) + 1,
        label: headingLabel,
        headingLabel,
        showCardHeading: !!headingLabel && component.showLabel !== false,
        fontSize: clamp(Number(component.fontSize ?? this._currentLayout?.fontSize ?? 13) || 13, 7, 48),
        fontFamily: component.fontFamily || this._currentLayout?.fontFamily || "Inter",
        labelPosition: component.labelPosition || "top-left",
        kind: "custom",
        path: binding?.path ?? "",
        value: hasBoundValue ? binding.value : (component.text ?? ""),
        hasContent: hasBoundValue || String(component.text ?? "").length > 0
      };
    }
    const resourcePaths = { pv: "resources.pv", pm: "resources.pm", pe: "resources.pe" };
    const resourceCode = ({ pv: "PV", "pv-bar": "PV", "pv-ring": "PV", pm: "PM", "pm-bar": "PM", pe: "PE", "pe-bar": "PE" })[component.type] ?? String(component.sheetCode ?? component.sheetContent1 ?? "").toUpperCase();
    const resourceColor = ({ PV: "#d94b4b", PM: "#3979d8", PE: "#39a86b" })[resourceCode] ?? "";
    const customPath = String(component.customBinding ?? "").replace(/^system\./, "");
    const safeCustomPath = /^[a-zA-Z0-9_-]+(?:\.[a-zA-Z0-9_-]+)*$/.test(customPath) ? customPath : "";
    const genericRaw = String(component?.dataPath ?? "").trim();
    const genericBinding = resolveNexusBinding(this.actor, genericRaw);
    const genericPath = genericBinding.path;
    const aliasResolution = resolveAliasPath(this.actor, genericPath);
    const safeDataPath = (aliasResolution.alias ? genericPath : genericPath && /^[a-zA-Z0-9_-]+(?:\.[a-zA-Z0-9_-]+)*$/.test(genericPath)) ? genericPath : "";
    const bindingPath = component.type === "resource-meter" ? (component.binding === "custom" ? safeCustomPath : (resourcePaths[component.binding] ?? "")) : (Object.hasOwn(component, "dataPath") ? safeDataPath : (def.path || ""));
    const sheetResource = component.type === "sheet-resource";
    const safeResourcePath = path => {
      const value = String(path || "").replace(/^system\./, "");
      return /^[a-zA-Z0-9_-]+(?:\.[a-zA-Z0-9_-]+)*$/.test(value) && !value.split(".").some(part => ["__proto__", "prototype", "constructor"].includes(part)) ? value : "";
    };
    const currentResourcePath = sheetResource ? safeResourcePath(component.currentPath ?? (String(component.sheetCode).toUpperCase() === "REC" ? "" : "resources.pv.value")) : "";
    const maximumResourcePath = sheetResource ? safeResourcePath(component.maxPath ?? (String(component.sheetCode).toUpperCase() === "REC" ? "" : "resources.pv.max")) : "";
    const raw = sheetResource
      ? resolveNexusBinding(this.actor, currentResourcePath).value
      : (def.path === "name" || bindingPath === "name") ? this.actor.name : def.kind === "token" ? getTokenImageSource(this.actor, component, bindingPath ? resolveNexusBinding(this.actor, bindingPath).value : "") : bindingPath ? resolveNexusBinding(this.actor, bindingPath).value ?? getPath(this.actor.system, bindingPath) : def.kind === "asset-image" ? this.actor.img : null;
    const value = sheetResource ? raw : (raw && typeof raw === "object" && "value" in raw ? raw.value : raw);
    const max = sheetResource
      ? resolveNexusBinding(this.actor, maximumResourcePath).value
      : (raw && typeof raw === "object" && "max" in raw ? raw.max : (bindingPath ? resolveNexusBinding(this.actor, `${bindingPath}.max`).value : null));
    const numericMax = Number(max) || 0;
    const percent = numericMax > 0 ? clamp((Number(value) || 0) / numericMax * 100, 0, 100) : 0;
    const componentVariant = def.variant ?? component.sheetVariant ?? "";
    const headingLabel = ["level", "attribute"].includes(componentVariant) ? (component.customLabel ?? component.text ?? def.label) : (component.customLabel ?? "");
    const actionType = ["roll", "proficiency"].includes(component.actionType) ? component.actionType : (component.actionType === "resource-slider" && (sheetResource || ["resource", "resource-bar", "resource-ring", "resource-meter", "asset-meter"].includes(def.kind)) ? "resource-slider" : "");
    const proficiencyBinding = component.actionPath ? resolveNexusBinding(this.actor, component.actionPath).value : undefined;
    const proficiencyLevel = clamp(Number(proficiencyBinding ?? component.proficiencyLevel) || 0, 0, 3);
    const proficiencyLabels = (Array.isArray(component.proficiencyLabels) ? component.proficiencyLabels : ["Sem domínio", "Básico", "Treinado", "Especialista"]).slice(0, 4);
    while (proficiencyLabels.length < 4) proficiencyLabels.push("Nível " + proficiencyLabels.length);
    const isResourceComponent = sheetResource || ["resource", "resource-bar", "resource-ring", "resource-meter", "asset-meter"].includes(def.kind);
    const sliderPath = sheetResource ? currentResourcePath : (bindingPath ? (bindingPath.endsWith(".value") ? bindingPath : bindingPath + ".value") : "");
    const safeSliderPath = safeResourcePath(sliderPath);
    const showResourceSlider = actionType === "resource-slider" && isResourceComponent && !!safeSliderPath && numericMax > 0;
    return { ...component, actionType, proficiencyLevel, proficiencyStages: proficiencyLabels.map((label, level) => ({ level, label: String(label || ("Nível " + level)), active: level === proficiencyLevel })), actionPath: component.actionPath ?? "", contentStyle: this._normalizeTextStyle(component.contentStyle), headingStyle: this._normalizeTextStyle(component.headingStyle), sliderPath: safeSliderPath, showResourceSlider, imageFit: ["contain","cover","fill","none"].includes(component.imageFit) ? component.imageFit : "contain", imagePosition: ["center","top","bottom","left","right"].includes(component.imagePosition) ? component.imagePosition : "center", imageOpacity: Number.isFinite(Number(component.imageOpacity ?? 100)) ? clamp(Number(component.imageOpacity ?? 100), 0, 100) : 100, hasBorderRadius: component.borderRadius !== undefined && component.borderRadius !== null, hasOpacity: component.opacity !== undefined && component.opacity !== null, safeLink: isSafeLink(value) ? String(value).trim() : "", headingLabel, showCardHeading: !!headingLabel && component.showLabel !== false && !["token", "sheet-resource", "asset-text", "asset-notes", "asset-image", "asset-link"].includes(component.type), fontSize: clamp(Number(component.fontSize ?? this._currentLayout?.fontSize ?? 13) || 13, 7, 48), fontFamily: component.fontFamily || this._currentLayout?.fontFamily || "Inter", labelPosition: component.labelPosition || "top-left", resourcePercent: percent, resourceColor, path: sheetResource ? currentResourcePath : bindingPath, z: Number(component.z) || 0, renderZ: (Number(component.z) || 0) * 100000 + (Number(component.stackOrder) || 0) + 1, label: component.customLabel ?? (component.type === "resource-meter" ? (component.resourceLabel || "Medidor") : def.label), kind: def.kind, format: component.format ?? "bar", value: value ?? (def.variant === "attribute" ? 0 : ""), max: max ?? "", percent, rows: clamp(Number(component.rows) || 3, 1, 20), columns: clamp(Number(component.columns) || 3, 1, 12), tableCells: component.type === "asset-table" ? Array.from({ length: clamp(Number(component.rows) || 3, 1, 20) * clamp(Number(component.columns) || 3, 1, 12) }, (_, index) => ({ index, value: component.cells?.[index] ?? "" })) : [], text: component.customLabel ?? component.text ?? def.label, path: sheetResource ? currentResourcePath : bindingPath, group: def.group, namespace: def.namespace, sheetVariant: def.variant ?? component.sheetVariant ?? "", skillRows: def.variant === "skill-group" ? (component.skillRows ?? [
      { proficiency: "—", attribute: "FOR", name: "Atletismo", value: "+2" }, { proficiency: "—", attribute: "FOR", name: "Vigor", value: "+2" }, { proficiency: "—", attribute: "FOR", name: "Combate", value: "+2" },
      { proficiency: "—", attribute: "DES", name: "Acrobacia", value: "+1" }, { proficiency: "—", attribute: "DES", name: "Furtividade", value: "+1" }, { proficiency: "—", attribute: "DES", name: "Astúcia", value: "+1" },
      { proficiency: "—", attribute: "SAB", name: "Natureza", value: "+4" }, { proficiency: "—", attribute: "SAB", name: "Percepção", value: "+4" }, { proficiency: "—", attribute: "SAB", name: "Sobrevivência", value: "+4" },
      { proficiency: "—", attribute: "INT", name: "História", value: "+3" }, { proficiency: "—", attribute: "INT", name: "Investigação", value: "+3" }, { proficiency: "—", attribute: "INT", name: "Medicina", value: "+3" },
      { proficiency: "—", attribute: "CAR", name: "Atuação", value: "+5" }, { proficiency: "—", attribute: "CAR", name: "Influência", value: "+5" }, { proficiency: "—", attribute: "CAR", name: "Presença", value: "+5" },
      { proficiency: "—", attribute: "VON", name: "Disciplina", value: "+6" }, { proficiency: "—", attribute: "VON", name: "Tenacidade", value: "+6" }, { proficiency: "—", attribute: "VON", name: "Instinto", value: "+6" }
    ]) : [], sheetHint: component.sheetHint ?? "Configure o conteúdo no editor", sheetCode: component.sheetCode ?? "", sheetLabel: component.sheetLabel ?? component.sheetCode ?? "", sheetIcon: component.sheetIcon ?? "", sheetContent1: component.sheetContent1 ?? component.sheetLabel ?? component.sheetCode ?? "PV", sheetContent2: component.sheetContent2 ?? component.sheetIcon ?? ({ PV: "❤️", PM: "💧", PE: "⚡" })[String(component.sheetCode ?? component.sheetContent1 ?? "PV").toUpperCase()] ?? "✦", updateSource: component.updateSource !== false, showLabel: component.showLabel !== false, sheetContent1IsImage: isImageSource(component.sheetContent1), sheetContent2IsImage: isImageSource(component.sheetContent2), sheetColor: component.sheetColor ?? ({ PV: "#d94b4b", PM: "#3979d8", PE: "#39a86b" })[String(component.sheetCode ?? component.sheetContent1 ?? "PV").toUpperCase()] ?? "#d94b4b", sheetTrackColor: component.sheetTrackColor ?? "#080d14", sheetOrientation: component.sheetOrientation === "vertical" ? "vertical" : "horizontal", tokenImage: String(component.tokenImage ?? ""), tokenImageVideo: isVideoSource(getTokenImageSource(this.actor, component, bindingPath ? resolveNexusBinding(this.actor, bindingPath).value : "")), tokenFrameSource: component.tokenFrameSource ?? "", tokenFrameVideo: isVideoSource(component.tokenFrameSource), tokenFrameMode: component.tokenFrameMode === "media" ? "media" : "solid", tokenFrameColor: component.tokenFrameColor ?? "#78b7e8", tokenFrameWidth: clamp(Number(component.tokenFrameWidth ?? 3), 0, 16), tokenShape: component.tokenShape ?? "circle", tokenOverlay: component.tokenOverlay ?? "", tokenBackgroundColor: component.tokenBackgroundColor ?? "#202e3e", previewCurrent: Number(component.previewCurrent ?? 32), previewMax: Number(component.previewMax ?? 40), previewPercent: clamp(Number(component.previewCurrent ?? 32) / Math.max(1, Number(component.previewMax ?? 40)) * 100, 0, 100) };
  }

  async _onRender(context, options) {
    await super._onRender(context, options);
    const migrated = await this._migrateLegacyActorData();
    if (migrated) {
      // The first render was prepared from the legacy snapshot. Refresh once
      // after migration so moved alias values appear without requiring a reopen.
      queueMicrotask(() => this.render({ force: true }));
      return;
    }
    const form = this.element?.querySelector?.(".nexus-sheet") ?? this.element;
    if (!form) return;
    const appWindow = form.closest(".application, .window-app");
    appWindow?.classList.add("nexus-window");
    this.activateListeners($(form));
    this._bindComponentQuickEdit(form);
    if (this._pendingAliasScrollTop !== undefined) {
      const top = this._pendingAliasScrollTop; this._pendingAliasScrollTop = undefined;
      requestAnimationFrame(() => { const panel = document.querySelector(`[data-tool-panel="aliases"]`) ?? this.element?.querySelector?.('[data-tool-panel="aliases"]'); if (panel && !panel.hidden) panel.scrollTop = top; });
    }
    this._renderRichMedia(form);
  }

  _renderRichMedia(root) {
    const safeUrl = value => { try { const url = new URL(value, window.location.href); return ["http:", "https:"].includes(url.protocol) ? url.href : ""; } catch (_) { return ""; } };
    const createMedia = (value, label = "", forceImage = false, displayMode = "auto") => {
      const safe = safeUrl(value); if (!safe || displayMode === "text") return null;
      const clean = safe.split(/[?#]/)[0].toLowerCase();
      const image = displayMode === "image" || (displayMode === "auto" && (forceImage || /\.(?:png|jpe?g|jpe|jfif|pjpeg|pjp|gif|apng|webp|avif|svg|bmp|dib|tif|tiff|ico|heic|heif|jxl)$/.test(clean) || /^data:image\//i.test(safe)));
      const audio = displayMode === "audio" || (displayMode === "auto" && (/\.(?:mp3|ogg|wav|m4a|aac|flac|opus)$/.test(clean) || /^data:audio\//i.test(safe)));
      const video = displayMode === "video" || (displayMode === "auto" && (/\.(?:mp4|webm|ogv|mov|m4v|mkv|avi|mpeg|mpg|3gp)$/.test(clean) || /^data:video\//i.test(safe)));
      if (image) { const n=document.createElement("img"); n.src=safe; n.alt=label||"Mídia incorporada"; n.loading="lazy"; n.className="nexus-rich-image nexus-adaptive-image"; return n; }
      if (audio) { const n=document.createElement("audio"); n.src=safe; n.controls=true; n.preload="none"; n.className="nexus-rich-audio nexus-adaptive-audio"; return n; }
      if (video) { const n=document.createElement("video"); n.src=safe; n.controls=true; n.preload="metadata"; n.className="nexus-rich-video nexus-adaptive-video"; return n; }
      const a=document.createElement("a"); a.href=safe; a.target="_blank"; a.rel="noopener noreferrer"; a.textContent=label||value; a.className="nexus-rich-link"; return a;
    };
    const renderExpressionText = (node, allowPlainUrls = false) => {
      if (!node || node.dataset.richRendered === "true") return;
      const source=node.textContent??"";
      const pattern=allowPlainUrls ? /\{\{\s*([^{}]+?)\s*\}\}|https?:\/\/[^\s<>]+/gi : /\{\{\s*([^{}]+?)\s*\}\}/gi;
      if (!pattern.test(source)) return;
      pattern.lastIndex=0; node.replaceChildren(); node.dataset.richRendered="true";
      let cursor=0,match;
      while ((match=pattern.exec(source))) {
        if(match.index>cursor) node.append(document.createTextNode(source.slice(cursor,match.index)));
        const wrapped=match[1]!==undefined, token=(match[1]??match[0]).replace(/[),.!?;]+$/,"").trim();
        let resolved=token, forceImage=false;
        if (wrapped && !/^https?:\/\//i.test(token)) {
          const binding=resolveNexusBinding(this.actor,token);
          resolved=binding.value == null ? "" : String(binding.value);
          forceImage=binding.path==="img" || /\.(?:img|image|portrait|avatar|token)$/i.test(binding.path||token) || binding.alias?.type==="image";
        }
        const media=wrapped ? createMedia(resolved,token,forceImage) : createMedia(token,token,false,"link");
        node.append(media ?? document.createTextNode(wrapped ? (resolved || match[0]) : match[0]));
        cursor=pattern.lastIndex;
      }
      if(cursor<source.length) node.append(document.createTextNode(source.slice(cursor)));
    };
    root.querySelectorAll(".nexus-asset-text").forEach(node => {
      const card=node.closest(".nexus-component"), component=(this._currentLayout?.components??[]).find(item=>item.id===card?.dataset.id);
      renderExpressionText(node,!component?.dataPath);
    });
    root.querySelectorAll(".nexus-component-content, .nexus-component-heading").forEach(container => {
      const walker=document.createTreeWalker(container,NodeFilter.SHOW_TEXT); const nodes=[];
      while(walker.nextNode()) if(/\{\{[^{}]+\}\}/.test(walker.currentNode.textContent??"")) nodes.push(walker.currentNode);
      for(const textNode of nodes){const wrapper=document.createElement("span");textNode.replaceWith(wrapper);wrapper.append(document.createTextNode(textNode.textContent));renderExpressionText(wrapper,false);}
    });
    this._renderAdaptiveContent(root, createMedia);
  }

  _renderAdaptiveContent(root, createMedia) {
    if (!root) return;
    const renderMedia = createMedia ?? ((value, label, forceImage, displayMode = "auto") => {
      const safe = (() => { try { const url = new URL(value, window.location.href); return ["http:","https:"].includes(url.protocol) ? url.href : ""; } catch (_) { return ""; } })();
      if (!safe || displayMode === "text") return null;
      const clean=safe.split(/[?#]/)[0].toLowerCase();
      const image=displayMode === "image" || (displayMode === "auto" && (forceImage || /\.(?:png|jpe?g|jpe|jfif|pjpeg|pjp|gif|apng|webp|avif|svg|bmp|dib|tif|tiff|ico|heic|heif|jxl)$/.test(clean) || /^data:image\//i.test(safe)));
      const audio=displayMode === "audio" || (displayMode === "auto" && (/\.(?:mp3|ogg|wav|m4a|aac|flac|opus)$/.test(clean) || /^data:audio\//i.test(safe)));
      const video=displayMode === "video" || (displayMode === "auto" && (/\.(?:mp4|webm|ogv|mov|m4v|mkv|avi|mpeg|mpg|3gp)$/.test(clean) || /^data:video\//i.test(safe)));
      const node=document.createElement(image?"img":audio?"audio":video?"video":"a"); node.className="nexus-adaptive-media";
      if(image){node.src=safe;node.alt=label||"";node.loading="lazy";}
      else if(audio){node.src=safe;node.controls=true;node.preload="none";}
      else if(video){node.src=safe;node.controls=true;node.preload="metadata";}
      else {node.href=safe;node.target="_blank";node.rel="noopener noreferrer";node.textContent=label||value;}
      return node;
    });
    const components=this._currentLayout?.components ?? [];
    root.querySelectorAll(".nexus-component[data-id]").forEach(card=>{
      const component=components.find(item=>item.id===card.dataset.id); if(!component || component.type==="token" || component.type==="asset-image") return;
      const definition=COMPONENTS[component.type] ?? {};
      const rawPath=String(component.dataPath ?? definition.path ?? "").trim(); if(!rawPath) return;
      const binding=resolveNexusBinding(this.actor,rawPath), raw=binding.value;
      if(raw===undefined || raw===null || typeof raw==="object") return;
      const value=String(raw).trim(); if(!value || !isMediaSource(value)) return;
      const forceImage=binding.path==="img" || /\.(?:img|image|portrait|avatar|token)$/i.test(binding.path||rawPath) || binding.alias?.type==="image";
      const content=card.querySelector(".nexus-component-content"); if(!content) return;
      const walker=document.createTreeWalker(content,NodeFilter.SHOW_TEXT), matches=[];
      while(walker.nextNode()){const text=walker.currentNode;if(text.parentElement?.closest("a,button,input,textarea,select,.nexus-rich-image,.nexus-adaptive-media"))continue;if(text.textContent.trim()===value)matches.push(text);}
      for(const text of matches){const media=renderMedia(value,value,forceImage,"auto");if(media){text.replaceWith(media);}}
    });
  }

  _bindComponentQuickEdit(root) {
    if (root.dataset.nexusComponentQuickEditBound) return;
    root.dataset.nexusComponentQuickEditBound = "true";
    root.addEventListener("dblclick", event => {
      const component = event.target.closest(".nexus-component");
      if (!component || event.target.closest("input,textarea,select,button,a")) return;
      event.preventDefault(); event.stopPropagation();
      const id = component.dataset.id;
      this._setSelection($(root), [id]);
      const portal = document.querySelector(`[data-nexus-floating-for="${this.id}"]`);
      portal?.querySelector('[data-floating-panel="component"]')?.click();
    });
  }

  activateListeners(html) {
    const currentRoot = html?.[0];
    // Remove detached property-option portals left by a previous ApplicationV2 render.
    document.querySelectorAll(`[data-nexus-property-owner="${this.id}"]`).forEach(list => {
      if (!list._nexusOwnerInspector?.isConnected) list.remove();
    });
    const renderDataEditorPreservingState = async (preferredElement = null) => {
      const root = html?.[0];
      const panel = root?.querySelector?.(".nexus-alias-manager");
      const active = preferredElement && panel?.contains(preferredElement) ? preferredElement : document.activeElement;
      const focusDescriptor = panel?.contains(active) ? {
        field: active.dataset?.nativePropertyField ? ["data-native-property-field", active.dataset.nativePropertyField] :
          active.dataset?.aliasField ? ["data-alias-field", active.dataset.aliasField] :
          active.matches?.("[data-native-property-select]") ? ["data-native-property-select", ""] :
          active.matches?.("[data-alias-select]") ? ["data-alias-select", ""] :
          active.matches?.("[data-alias-new-name]") ? ["data-alias-new-name", ""] :
          active.matches?.("[data-alias-mode]") ? ["data-alias-mode", active.dataset.aliasMode] :
          active.matches?.("[data-alias-create]") ? ["data-alias-create", ""] :
          active.matches?.("[data-alias-copy]") ? ["data-alias-copy", ""] :
          active.matches?.("[data-alias-reset]") ? ["data-alias-reset", ""] :
          active.matches?.("[data-alias-delete]") ? ["data-alias-delete", ""] :
          active.matches?.("[data-native-property-reset]") ? ["data-native-property-reset", ""] : null,
        start: typeof active.selectionStart === "number" ? active.selectionStart : null,
        end: typeof active.selectionEnd === "number" ? active.selectionEnd : null
      } : null;
      const scrollState = [".nexus-alias-manager", ".nexus-appearance-drawer", ".nexus-canvas-scroll", ".nexus-library-grid", ".nexus-layer-list", ".nexus-component-inspector", ".window-content", ".application-content"]
        .map(selector => { const node = root?.querySelector?.(selector); return node ? { selector, top: node.scrollTop, left: node.scrollLeft } : null; }).filter(Boolean);
      await this.render({ force: true });
      const restore = () => {
        const currentRoot = this.element?.querySelector?.(".nexus-sheet") ?? this.element ?? document;
        for (const state of scrollState) {
          const node = currentRoot.querySelector?.(state.selector);
          if (node) { node.scrollTop = state.top; node.scrollLeft = state.left; }
        }
        if (!focusDescriptor?.field) return;
        const activeNow = document.activeElement;
        const [attribute, value] = focusDescriptor.field;
        const escaped = value ? CSS.escape(value) : "";
        const selector = value ? `[${attribute}="${escaped}"]` : `[${attribute}]`;
        const target = currentRoot.querySelector?.(`.nexus-alias-manager ${selector}`);
        // Só recupera foco quando a renderização o deixou no body. Se o usuário
        // já escolheu outro controle, respeita essa escolha.
        if (activeNow && activeNow !== document.body && activeNow !== document.documentElement && activeNow !== target) return;
        if (!target) return;
        target.focus({ preventScroll: true });
        if (focusDescriptor.start !== null && typeof target.setSelectionRange === "function") {
          try { target.setSelectionRange(focusDescriptor.start, focusDescriptor.end); } catch (_) { /* input type does not support selection */ }
        }
      };
      requestAnimationFrame(() => requestAnimationFrame(restore));
    };
    html.find("[data-action]").on("click", async event => {
      const button = event.currentTarget, action = button.dataset.action;
      if (action === "mode") return this._setMode(button.dataset.mode);
      if (action === "add-component") {
        try { return await this._addComponent(button.dataset.type); }
        catch (error) {
          console.error("NEXUS | Falha ao adicionar componente", error);
          ui.notifications?.error?.("Não foi possível adicionar o componente. Consulte o console para detalhes.");
          return;
        }
      }
      if (action === "save-layout") return this._saveCanvas(html);
      if (action === "new-layout") return this._newLayout();
      if (action === "switch-layout") return this._switchLayout(button.dataset.layoutId);
      if (action === "select-all") return this._selectAll(html);
      if (action === "clear-selection") return this._setSelection(html, []);
      if (action === "group-selection") return this._groupSelection(html);
      if (action === "ungroup-selection") return this._ungroupSelection(html);
      if (action === "duplicate-selection") return this._duplicateComponents([...this._selectedIds ?? []]);
      if (action === "layer-front") return this._changeLayer("front");
      if (action === "layer-forward") return this._changeLayer("forward");
      if (action === "layer-backward") return this._changeLayer("backward");
      if (action === "layer-back") return this._changeLayer("back");
      if (action === "global-colors-default") return this._resetGlobalAppearance("colors");
      if (action === "global-fonts-default") return this._resetGlobalAppearance("fonts");
      if (action === "resource-adjust") return this._adjustResource(button.dataset.path, Number(button.dataset.delta));
      if (action === "component-roll") return this._rollComponent(button.dataset.componentId);
      if (action === "save-group-library") return this._saveSelectedGroupToLibrary();
    });
    html.find("[data-proficiency-level]").on("click", event => {
      event.preventDefault(); event.stopPropagation();
      const button = event.currentTarget, card = button.closest(".nexus-component");
      if (card) this._setProficiencyLevel(card.dataset.id, Number(button.dataset.proficiencyLevel));
    });
    html.find("[data-resource-slider]").on("input", event => {
      const input = event.currentTarget, card = input.closest(".nexus-component"); if (!card) return;
      const max = Number(input.max), value = Number(input.value), percent = max > 0 ? clamp(value / max * 100, 0, 100) : 0;
      card.querySelectorAll(".nexus-resource-bar-fill,.nexus-asset-meter-fill").forEach(fill => fill.style.width = percent + "%");
      card.querySelector(".nexus-resource-ring")?.style.setProperty("--nexus-resource-percent", percent + "%");
      const resourceValues = card.querySelector(".nexus-resource-values"), ringValues = card.querySelector(".nexus-resource-ring-values"), barValues = card.querySelector(".nexus-resource-bar-values");
      for (const values of [resourceValues, ringValues]) { const current = values?.querySelector("strong"); if (current) current.textContent = String(value); }
      const barCurrent = barValues?.querySelector("strong"); if (barCurrent) barCurrent.textContent = String(value);
      const component = (this._currentLayout?.components ?? []).find(item => item.id === card.dataset.id);
      if (component?.type === "sheet-resource") {
        const preview = card.querySelector(".nexus-sheet-resource-preview");
        updateSheetResourcePreview(preview, { label: component.sheetContent1 ?? "PV", icon: component.sheetContent2 ?? "❤️", current: value, max, color: component.sheetColor ?? "#d94b4b", trackColor: component.sheetTrackColor ?? "#080d14", orientation: component.sheetOrientation ?? "horizontal" });
        const values = card.querySelector(".nexus-sheet-resource-values"); if (values && !values.querySelector("input")) values.textContent = value + " / " + max;
      }
    });
    html.find("[data-system-path]").on("change", event => this._updateSystemValue(event.currentTarget));
    html.find("[data-component-local-value]").on("change", async event => {
      const input = event.currentTarget;
      const componentId = input.dataset.componentId;
      if (!componentId) return;
      const layouts = await this._readLayouts(), active = this._activeLayoutId();
      const component = layouts[active]?.components?.find(item => item.id === componentId);
      if (!component) return;
      this._captureHistory();
      component.localValue = String(input.value ?? "").slice(0, 5000);
      await this._writeLayouts(layouts, active);
    });
    html.find("[data-property-value]").on("change", async event => {
      const input = event.currentTarget;
      const path = String(input.dataset.propertyPath ?? "");
      if (!path || path.split(".").some(part => ["__proto__", "prototype", "constructor"].includes(part))) return;
      const kind = input.dataset.propertyKind;
      let value = input.type === "checkbox" ? !!input.checked : input.value;
      if (kind === "number") { value = Number(value); if (!Number.isFinite(value)) return; }
      const resolvedPath = resolveNexusBinding(this.actor, path);
      const targetPath = resolvedPath.virtual ? resolvedPath.sourcePath : resolvedPath.path;
      const expression = typeof value === "string" ? value.trim().match(/^\{\{\s*([^{}]+?)\s*\}\}$/) : null;
      if (expression) value = resolveNexusBinding(this.actor, expression[1]).value ?? "";
      if (path === "name") await this.actor.update({ name: String(value).slice(0, 100) });
      else if (["img", "prototypeToken.texture.src"].includes(targetPath)) {
        const imagePath = String(value).trim().slice(0, 2048);
        if (targetPath === "prototypeToken.texture.src" && !imagePath) {
          await this.actor.update({ "prototypeToken.texture.src": DEFAULT_FOUNDRY_TOKEN_IMAGE });
        } else if (!isMediaSource(imagePath)) {
          globalThis.ui?.notifications?.warn?.("Imagem inválida. Informe uma imagem válida ou uma propriedade que contenha uma imagem.");
          input.value = path === "img" || path === "identity.portrait.img" ? (this.actor.img ?? "") : getFoundryDefaultTokenImage(this.actor);
          return;
        } else {
          await this.actor.update(targetPath === "img" ? { img: imagePath } : { [targetPath]: imagePath });
        }
      }
      else if (targetPath === "prototypeToken.ring.colors.ring") {
        const color = String(value).trim();
        if (!/^#(?:[0-9a-f]{3}|[0-9a-f]{6}|[0-9a-f]{8})$/i.test(color)) return;
        await this.actor.update({ "prototypeToken.ring.colors.ring": color });
      }
      else await this.actor.update(resolvedPath.virtual ? { [targetPath]: value } : { [`system.${targetPath || path}`]: value });
      this._refreshBoundComponents();
    });
    html.find("[data-config-system-path]").on("change", event => { const input = event.currentTarget; input.dataset.systemPath = input.dataset.configSystemPath; this._updateSystemValue(input); });
    html.find("[data-config-component-code]").on("change", async event => {
      const input = event.currentTarget, id = input.dataset.componentId;
      const layouts = await this._readLayouts(), active = this._activeLayoutId();
      const component = layouts[active]?.components?.find(item => item.id === id);
      if (!component) return;
      this._captureHistory(); component.sheetCode = String(input.value ?? "").slice(0, 24);
      await this._writeLayouts(layouts, active);
    });
    html.find("[data-config-component-text]").on("change", async event => {
      const input = event.currentTarget, id = input.dataset.componentId;
      const layouts = await this._readLayouts(), active = this._activeLayoutId();
      const component = layouts[active]?.components?.find(item => item.id === id);
      if (!component) return;
      this._captureHistory(); component.text = String(input.value ?? "").slice(0, 500);
      await this._writeLayouts(layouts, active);
    });
    html.find("[data-config-current-value], [data-config-max-value]").on("change", async event => {
      const input = event.currentTarget, id = [...(this._selectedIds ?? [])][0];
      if (!id) return;
      const layouts = await this._readLayouts(), active = this._activeLayoutId();
      const component = layouts[active]?.components?.find(item => item.id === id);
      if (!component) return;
      const paths = getResourceValuePaths(component);
      const path = input.hasAttribute("data-config-current-value") ? paths.current : paths.max;
      if (!path) return;
      const value = Number(input.value);
      if (!Number.isFinite(value)) return;
      this._captureHistory();
      await this.actor.update({ [`system.${path}`]: value });
      this._refreshBoundComponents();
    });
    const persistAliases = async (aliases, focusTarget = null) => {
      const normalized = aliases.map(normalizeAliasDefinition).filter(Boolean);
      await this.actor.setFlag("nexus", "aliases", normalized);
      invalidateAliasDefinitionCache(this.actor);
      await renderDataEditorPreservingState(focusTarget);
    };
    const slugifyAlias = value => String(value ?? "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "") || "novo";
    const createAlias = async (label, type, valueType, source, targetPath, focusTarget = null) => {
      const aliases = getAliasDefinitions(this.actor).map(normalizeAliasDefinition).filter(Boolean);
      const category = type === "attribute" ? "attributes" : type === "resource" ? "resources" : type === "combat" ? "combat" : type === "identity" ? "identity" : "custom";
      const base = slugifyAlias(label);
      let suffix = base, index = 2, key = `${category}.${suffix}`;
      const reservedKeys = getNativePropertyDefinitions(this.actor).flatMap(item => [item.key, ...(item.legacyKeys ?? [])]);
      while (aliases.some(item => item.key === key) || reservedKeys.includes(key)) key = `${category}.${base}_${index++}`;
      const id = foundry.utils.randomID();
      const resolvedSource = source === "actor" ? "actor" : "custom";
      const safeTarget = resolvedSource === "actor" ? safeAliasKey(targetPath) : "";
      if (resolvedSource === "actor" && (!safeTarget || resolveNexusBinding(this.actor, safeTarget).value === undefined)) {
        ui.notifications?.warn?.("Informe um caminho que já exista em Actor.system.");
        return false;
      }
      const finalType = type === "custom" || type === "identity" ? (type === "identity" ? "text" : valueType || "text") : type === "combat" ? "number" : type;
      aliases.push({ id, key, label: String(label || "Nova propriedade").slice(0,48), category, type: finalType, source: resolvedSource, targetPath: safeTarget });
      if (resolvedSource === "custom") {
        const customData = clone(getCustomAliasData(this.actor));
        if (finalType === "attribute") foundry.utils.setProperty(customData, key, { name: String(label), exib: String(label), exibicao: String(label), value: 0, checkbonus: 0, roll: "" });
        else if (finalType === "resource") foundry.utils.setProperty(customData, key, { name: String(label), exib: String(label), exibicao: String(label), value: 0, max: 0 });
        else foundry.utils.setProperty(customData, key, finalType === "number" ? 0 : finalType === "boolean" ? false : "");
        await this.actor.setFlag("nexus", "customData", customData);
      }
      await this.actor.setFlag("nexus", "aliases", aliases);
      invalidateAliasDefinitionCache(this.actor);
      this._selectedAliasId = id;
      await renderDataEditorPreservingState(focusTarget);
      return true;
    };
    html.find("[data-alias-create]").on("click", async event => {
      const panel = event.currentTarget.closest(".nexus-alias-manager");
      const label = panel?.querySelector("[data-alias-new-name]")?.value.trim();
      const type = panel?.querySelector("[data-alias-new-type]")?.value || "custom";
      const valueType = panel?.querySelector("[data-alias-value-type]")?.value || "text";
      const source = panel?.querySelector("[data-alias-source]")?.value || "custom";
      const targetPath = panel?.querySelector("[data-alias-target]")?.value.trim() || "";
      if (!label) { panel?.querySelector("[data-alias-new-name]")?.focus(); return; }
      if (type === "custom" && source === "actor" && !targetPath) { panel?.querySelector("[data-alias-target]")?.focus(); return; }
      const created = await createAlias(label, type, valueType, source, targetPath, event.currentTarget);
      if (created) { const name = panel?.querySelector("[data-alias-new-name]"); if (name) name.value = ""; }
    });
    html.find("[data-alias-select]").on("change", event => { this._selectedAliasId = event.currentTarget.value || null; renderDataEditorPreservingState(event.currentTarget); });
    html.find("[data-alias-mode]").on("click", event => { this._aliasEditorMode = event.currentTarget.dataset.aliasMode === "native" ? "native" : "custom"; renderDataEditorPreservingState(event.currentTarget); });
    html.find("[data-native-property-select]").on("change", event => { this._selectedNativePropertyId = event.currentTarget.value || null; renderDataEditorPreservingState(event.currentTarget); });
    html.find("[data-native-property-field]").on("change", async event => {
      const input = event.currentTarget, id = input.closest("[data-native-property-row]")?.dataset.nativePropertyRow;
      const definitions = getNativePropertyDefinitions(this.actor), property = definitions.find(item => item.id === id); if (!property) return;
      const saved = clone(this.actor.getFlag("nexus", "nativeProperties") ?? []);
      let override = saved.find(item => item.id === id);
      if (!override) { override = { id }; saved.push(override); }
      const field = input.dataset.nativePropertyField;
      if (field === "label") override.label = String(input.value).trim().slice(0,48) || property.defaultLabel;
      if (["checkbonus", "roll"].includes(field)) {
        const customData = clone(getCustomAliasData(this.actor));
        foundry.utils.setProperty(customData, `${property.key}.${field}`, String(input.value).slice(0,240));
        await this.actor.setFlag("nexus", "customData", customData);
      }
      if (["currentValue", "maxValue"].includes(field)) {
        if (property.targetPath === "name") await this.actor.update({ name: String(input.value).slice(0,100) });
        else {
          const suffix = property.type === "resource" ? (field === "currentValue" ? "value" : "max") : "value";
          const target = property.type === "resource" || property.type === "attribute" ? `${property.targetPath}.${suffix}` : property.targetPath;
          let nextValue;
          if (property.type === "boolean") nextValue = input.value === "true";
          else if (["resource", "attribute", "number"].includes(property.type)) {
            nextValue = Number(input.value);
            if (!Number.isFinite(nextValue)) { ui.notifications?.warn?.("Informe um valor numérico válido."); return; }
          } else nextValue = String(input.value).slice(0, 500);
          await this.actor.update({ [`system.${target}`]: nextValue });
        }
      }
      if (field === "keySuffix") {
        const suffix = slugifyAlias(input.value);
        const nextKey = `${property.category}.${suffix}`;
        const collision = [...getAliasDefinitions(this.actor), ...definitions.filter(item => item.id !== id)].some(item => [item.key, ...(item.legacyKeys ?? [])].includes(nextKey));
        if (!suffix || collision) { ui.notifications?.warn?.("Esse identificador já está em uso ou é inválido."); input.value = property.key.split(".").at(-1); return; }
        const previousKey = property.key;
        override.key = nextKey;
        override.legacyKeys = [...new Set([...(property.legacyKeys ?? []), previousKey])];
        const customData = clone(getCustomAliasData(this.actor));
        const previousMeta = getPath(customData, previousKey);
        if (previousMeta && typeof previousMeta === "object") {
          foundry.utils.setProperty(customData, nextKey, previousMeta);
          const parts = previousKey.split("."), leaf = parts.pop(), parent = getPath(customData, parts.join(".")); if (parent) delete parent[leaf];
          await this.actor.setFlag("nexus", "customData", customData);
        }
        const layouts = await this._readLayouts();
        replaceLayoutBindingPaths(layouts, previousKey, nextKey);
        replaceLayoutBindingPaths(layouts, previousKey.replace(/^attributes\./, "attribute.").replace(/^resources\./, "resource."), nextKey.replace(/^attributes\./, "attribute.").replace(/^resources\./, "resource."));
        await this._writeLayouts(layouts, this._activeLayoutId());
      }
      await this.actor.setFlag("nexus", "nativeProperties", saved);
      invalidateNativePropertyCache(this.actor);
      this._selectedNativePropertyId = id; renderDataEditorPreservingState(event.currentTarget);
    });
    html.find("[data-native-property-reset]").on("click", async event => {
      const id = event.currentTarget.closest("[data-native-property-row]")?.dataset.nativePropertyRow;
      const property = getNativePropertyDefinitions(this.actor).find(item => item.id === id); if (!property) return;
      const confirmed = await foundry.applications.api.DialogV2.confirm({ window:{title:"Restaurar dado nativo"}, content:`<p>Restaurar <strong>${Handlebars.escapeExpression(property.defaultLabel)}</strong> ao identificador original?</p>`, yes:{label:"Restaurar"}, no:{label:"Cancelar"}, rejectClose:false });
      if (!confirmed) return;
      const saved = clone(this.actor.getFlag("nexus", "nativeProperties") ?? []);
      const override = saved.find(item => item.id === id);
      const oldKey = property.key;
      if (override) {
        override.legacyKeys = [...new Set([...(override.legacyKeys ?? []), oldKey])];
        override.key = property.defaultKey; override.label = property.defaultLabel;
      }
      const customData = clone(getCustomAliasData(this.actor));
      const previousMeta = getPath(customData, oldKey);
      if (previousMeta && typeof previousMeta === "object" && oldKey !== property.defaultKey) {
        foundry.utils.setProperty(customData, property.defaultKey, previousMeta);
        const parts = oldKey.split("."), leaf = parts.pop(), parent = getPath(customData, parts.join(".")); if (parent) delete parent[leaf];
      }
      const defaultMeta = getPath(customData, property.defaultKey);
      if (defaultMeta && typeof defaultMeta === "object") { delete defaultMeta.checkbonus; delete defaultMeta.roll; }
      await this.actor.setFlag("nexus", "customData", customData);
      if (oldKey !== property.defaultKey) {
        const layouts = await this._readLayouts();
        replaceLayoutBindingPaths(layouts, oldKey, property.defaultKey);
        replaceLayoutBindingPaths(layouts, oldKey.replace(/^attributes\./, "attribute.").replace(/^resources\./, "resource."), property.defaultKey.replace(/^attributes\./, "attribute.").replace(/^resources\./, "resource."));
        await this._writeLayouts(layouts, this._activeLayoutId());
      }
      await this.actor.setFlag("nexus", "nativeProperties", saved);
      invalidateNativePropertyCache(this.actor);
      renderDataEditorPreservingState(event.currentTarget);
    });
    html.find("[data-alias-new-type], [data-alias-source]").on("change", event => {
      const panel = event.currentTarget.closest(".nexus-alias-manager"); if (!panel) return;
      const custom = panel.querySelector("[data-alias-new-type]")?.value === "custom";
      const valueRow = panel.querySelector("[data-alias-value-type-row]"); if (valueRow) valueRow.hidden = !custom;
      const sourceRow = panel.querySelector("[data-alias-source-row]"); if (sourceRow) sourceRow.hidden = !custom;
      const targetRow = panel.querySelector("[data-alias-target-row]"); if (targetRow) targetRow.hidden = !custom || panel.querySelector("[data-alias-source]")?.value !== "actor";
    });
    html.find("[data-alias-field]").on("change", async event => {
      const input = event.currentTarget, row = input.closest("[data-alias-row]"), id = row?.dataset.aliasRow;
      const aliases = getAliasDefinitions(this.actor).map(normalizeAliasDefinition).filter(Boolean);
      const alias = aliases.find(item => item.id === id); if (!alias) return;
      const field = input.dataset.aliasField;
      if (field === "name") {
        alias.label = String(input.value).slice(0,48);
        if (["attribute", "resource"].includes(alias.type) && alias.source !== "actor") {
          const customData = clone(getCustomAliasData(this.actor));
          foundry.utils.setProperty(customData, `${alias.key}.name`, alias.label);
          await this.actor.setFlag("nexus", "customData", customData);
        }
      }
      else if (field === "targetPath") {
        const nextPath = safeAliasKey(input.value);
        if (input.value.trim() && (!nextPath || resolveNexusBinding(this.actor, nextPath).value === undefined)) {
          ui.notifications?.warn?.("O caminho precisa existir em Actor.system."); input.value = alias.targetPath; return;
        }
        alias.targetPath = nextPath;
        alias.source = alias.targetPath ? "actor" : "custom";
      }
      else if (field === "source") {
        if (input.value === "actor" && !alias.targetPath) { input.value = "custom"; return; }
        alias.source = input.value === "actor" ? "actor" : "custom";
        if (alias.source === "custom") alias.targetPath = "";
      }
      else if (field === "valueType") {
        if (["number", "text", "url", "image", "boolean"].includes(input.value)) alias.type = input.value;
      }
      else if (field === "keySuffix") {
        const suffix = slugifyAlias(input.value);
        const next = `${alias.category}.${suffix}`;
        const reserved = getNativePropertyDefinitions(this.actor).flatMap(item => [item.key, ...(item.legacyKeys ?? [])]);
        if (aliases.some(item => item !== alias && [item.key, ...(item.legacyKeys ?? [])].includes(next)) || reserved.includes(next)) { input.value = alias.key.split(".").at(-1); return; }
        const previousKey = alias.key;
        alias.legacyKeys ??= []; if (!alias.legacyKeys.includes(previousKey)) alias.legacyKeys.push(previousKey);
        const customData = clone(getCustomAliasData(this.actor));
        if (!alias.targetPath) {
          const previous = getPath(customData, previousKey);
          if (previous !== undefined) {
            foundry.utils.setProperty(customData, next, previous);
            const parts = previousKey.split("."), leaf = parts.pop(), parent = getPath(customData, parts.join("."));
            if (parent) delete parent[leaf];
            await this.actor.setFlag("nexus", "customData", customData);
          }
        }
        // Migra referências de componentes para que a troca do identificador
        // não deixe cartões apontando para o caminho antigo.
        const layouts = await this._readLayouts();
        replaceLayoutBindingPaths(layouts, previousKey, next);
        replaceLayoutBindingPaths(layouts, previousKey.replace(/^attributes\./, "attribute.").replace(/^resources\./, "resource."), next.replace(/^attributes\./, "attribute.").replace(/^resources\./, "resource."));
        await this._writeLayouts(layouts, this._activeLayoutId());
        alias.key = next;
      }
      else if (["exibicao", "value", "max", "checkbonus", "roll"].includes(field)) {
        const isText = ["exibicao", "roll", "checkbonus"].includes(field) || (field === "value" && ["text", "url", "image"].includes(alias.type));
        const value = field === "value" && alias.type === "boolean" ? input.checked : isText ? String(input.value).slice(0, field === "roll" ? 120 : 2048) : Number(input.value);
        const path = `${alias.key}.${field}`;
        const writeToTarget = alias.source === "actor" && alias.targetPath && (field === "value" || (alias.type === "resource" && field === "max"));
        if (writeToTarget) {
          const target = alias.type === "resource" ? `${alias.targetPath}.${field}` : alias.targetPath;
          const resolvedTarget = resolveNexusBinding(this.actor, target);
          const updatePath = resolvedTarget.virtual ? resolvedTarget.sourcePath : `system.${target}`;
          await this.actor.update({ [updatePath]: value });
        }
        else { const customData = clone(getCustomAliasData(this.actor)); if (["number", "text", "url", "image", "boolean"].includes(alias.type) && field === "value") foundry.utils.setProperty(customData, alias.key, value); else foundry.utils.setProperty(customData, path, value); await this.actor.setFlag("nexus", "customData", customData); }
      }
      await this.actor.setFlag("nexus", "aliases", aliases);
      invalidateAliasDefinitionCache(this.actor);
      renderDataEditorPreservingState(event.currentTarget);
    });
    html.find("[data-alias-copy]").on("click", async event => {
      const id = event.currentTarget.closest("[data-alias-row]")?.dataset.aliasRow;
      const aliases = getAliasDefinitions(this.actor).map(normalizeAliasDefinition).filter(Boolean);
      const source = aliases.find(item => item.id === id); if (!source) return;
      const base = `${source.key.split(".").at(-1)}_copy`;
      let suffix = base, index = 2, key = `${source.category}.${suffix}`;
      const reserved = getNativePropertyDefinitions(this.actor).flatMap(item => [item.key, ...(item.legacyKeys ?? [])]);
      while (aliases.some(item => item.key === key) || reserved.includes(key)) key = `${source.category}.${base}_${index++}`;
      const copy = { ...clone(source), id: foundry.utils.randomID(), key, label: `${source.label} (cópia)`.slice(0,48), source: "custom", targetPath: "" };
      aliases.push(copy);
      const customData = clone(getCustomAliasData(this.actor));
      const original = getPath(customData, source.key);
      if (original !== undefined) foundry.utils.setProperty(customData, key, clone(original));
      else if (source.type === "attribute") foundry.utils.setProperty(customData, key, { name: copy.label, exib: copy.label, exibicao: copy.label, value: 0, checkbonus: 0, roll: "" });
      else if (source.type === "resource") foundry.utils.setProperty(customData, key, { name: copy.label, exib: copy.label, exibicao: copy.label, value: 0, max: 0 });
      else foundry.utils.setProperty(customData, key, source.type === "number" ? 0 : source.type === "boolean" ? false : "");
      await this.actor.setFlag("nexus", "customData", customData);
      await this.actor.setFlag("nexus", "aliases", aliases);
      invalidateAliasDefinitionCache(this.actor); this._selectedAliasId = copy.id; renderDataEditorPreservingState(event.currentTarget);
    });
    html.find("[data-alias-reset]").on("click", async event => {
      const id = event.currentTarget.closest("[data-alias-row]")?.dataset.aliasRow;
      const aliases = getAliasDefinitions(this.actor).map(normalizeAliasDefinition).filter(Boolean);
      const alias = aliases.find(item => item.id === id); if (!alias) return;
      const confirmed = await foundry.applications.api.DialogV2.confirm({
        window: { title: "Restaurar propriedade" },
        content: `<p>Restaurar os valores padrão de <strong>${Handlebars.escapeExpression(alias.label)}</strong>? Os valores personalizados serão redefinidos.</p>`,
        yes: { label: "Restaurar" }, no: { label: "Cancelar" }, rejectClose: false
      });
      if (!confirmed) return;
      const customData = clone(getCustomAliasData(this.actor));
      const defaultSuffix = slugifyAlias(alias.label);
      let defaultKey = `${alias.category}.${defaultSuffix}`, collision = 2;
      while (aliases.some(item => item !== alias && item.key === defaultKey)) defaultKey = `${alias.category}.${defaultSuffix}_${collision++}`;
      if (defaultKey !== alias.key) {
        const previousKey = alias.key;
        alias.legacyKeys ??= []; if (!alias.legacyKeys.includes(previousKey)) alias.legacyKeys.push(previousKey);
        if (!alias.targetPath) {
          const previous = getPath(customData, previousKey);
          if (previous !== undefined) {
            foundry.utils.setProperty(customData, defaultKey, previous);
            const parts = previousKey.split("."), leaf = parts.pop(), parent = getPath(customData, parts.join("."));
            if (parent) delete parent[leaf];
          }
        }
        const layouts = await this._readLayouts();
        replaceLayoutBindingPaths(layouts, previousKey, defaultKey);
        replaceLayoutBindingPaths(layouts, previousKey.replace(/^attributes\./, "attribute.").replace(/^resources\./, "resource."), defaultKey.replace(/^attributes\./, "attribute.").replace(/^resources\./, "resource."));
        await this._writeLayouts(layouts, this._activeLayoutId());
        alias.key = defaultKey;
      }
      if (!alias.targetPath) {
        let defaults;
        if (alias.type === "attribute") defaults = { name: alias.label, exib: alias.exib ?? alias.label, exibicao: alias.exib ?? alias.label, value: 0, checkbonus: 0, roll: "" };
        else if (alias.type === "resource") defaults = { name: alias.label, exib: alias.exib ?? alias.label, exibicao: alias.exib ?? alias.label, value: 0, max: 0 };
        else defaults = alias.type === "number" ? 0 : alias.type === "boolean" ? false : "";
        foundry.utils.setProperty(customData, alias.key, defaults);
        await this.actor.setFlag("nexus", "customData", customData);
      }
      await this.actor.setFlag("nexus", "aliases", aliases);
      invalidateAliasDefinitionCache(this.actor); renderDataEditorPreservingState(event.currentTarget);
    });
    html.find("[data-alias-delete]").on("click", async event => {
      const id = event.currentTarget.closest("[data-alias-row]")?.dataset.aliasRow;
      await persistAliases(getAliasDefinitions(this.actor).filter(item => item.id !== id), event.currentTarget);
    });
    html.find("[data-table-cell]").on("change", async event => {
      const input = event.currentTarget, componentId = input.closest(".nexus-component")?.dataset.id, index = Number(input.dataset.tableCell);
      if (!componentId || !Number.isInteger(index) || index < 0) return;
      const layouts = await this._readLayouts(), active = this._activeLayoutId(), layout = layouts[active];
      const component = layout?.components?.find(item => item.id === componentId); if (!component) return;
      this._captureHistory(); component.cells ??= []; component.cells[index] = String(input.value).slice(0, 120);
      await this._writeLayouts(layouts, active);
    });
    html.find("[data-layout-select]").on("change", event => this._switchLayout(event.currentTarget.value));
    html.find("[data-layout-name]").on("change", event => this._updateLayoutName(event.currentTarget.value));
    html.find("[data-appearance-panel]").on("click", event => {
      const key = event.currentTarget.dataset.appearancePanel;
      html.find("[data-appearance-panel]").removeClass("active"); html.find("[data-tool-panel]").prop("hidden", true).removeClass("active");
      event.currentTarget.classList.add("active"); html.find(`[data-tool-panel="${key}"]`).prop("hidden", false).addClass("active");
      if (key === "library") {
        const panel = html[0].querySelector(".nexus-library-panel");
        if (panel) { this._mountLibrary(panel); this._libraryApplyFilter?.(); }
      }
    });
    html.find("[data-layout-setting]").on("change", event => this._updateLayoutSetting(event.currentTarget));
    html.find("[data-global-typography]").on("change", event => this._updateGlobalTypography(event.currentTarget));
    html.find("[data-inspector-tab]").on("click", event => {
      const tab = event.currentTarget.dataset.inspectorTab;
      const inspector = event.currentTarget.closest(".nexus-component-inspector");
      if (!inspector || !["card", "appearance"].includes(tab)) return;
      this._componentInspectorTab = tab;
      inspector.querySelectorAll("[data-inspector-tab]").forEach(button => button.classList.toggle("active", button.dataset.inspectorTab === tab));
      inspector.querySelectorAll("[data-inspector-tab-panel]").forEach(panel => { const active = panel.dataset.inspectorTabPanel === tab; panel.hidden = !active; panel.classList.toggle("active", active); });
    });
    html.find("[data-layer-visibility]").on("click", event => { event.preventDefault(); event.stopPropagation(); const [kind,id] = event.currentTarget.dataset.layerVisibility.split(":"); this._toggleLayerState(kind,id,"hidden"); });
    html.find("[data-layer-lock]").on("click", event => { event.preventDefault(); event.stopPropagation(); const [kind,id] = event.currentTarget.dataset.layerLock.split(":"); this._toggleLayerState(kind,id,"locked"); });
    const libraryPanel = html[0].querySelector(".nexus-library-panel");
    const renderSavedGroups = () => {
      const container = libraryPanel?.querySelector("[data-library-saved-groups]");
      if (!container) return;
      const groups = game.user?.getFlag?.("nexus", "libraryGroups") ?? [];
      container.replaceChildren();
      if (!groups.length) {
        const empty = document.createElement("p");
        empty.className = "nexus-library-empty";
        empty.textContent = "Nenhum grupo personalizado salvo.";
        container.append(empty);
        return;
      }
      for (const group of groups) {
        const button = document.createElement("button");
        button.type = "button";
        button.className = "nexus-library-saved-group";
        button.dataset.librarySavedGroup = group.id;
        const title = document.createElement("strong");
        title.textContent = group.name || "Grupo sem nome";
        const count = document.createElement("small");
        count.textContent = `${group.components?.length ?? 0} elementos`;
        button.append(title, count);
        container.append(button);
      }
    };
    this._libraryRenderSavedGroups = renderSavedGroups;
    renderSavedGroups();
    const filterLibrary = () => {
      const query = libraryPanel?.querySelector("[data-library-search]")?.value.trim().toLocaleLowerCase("pt-BR") ?? "";
      const tag = libraryPanel?.querySelector("[data-library-tag]")?.value ?? "all";
      let visible = 0;
      libraryPanel?.querySelectorAll("[data-library-asset]").forEach(card => {
        const matchText = !query || (card.dataset.libraryAsset ?? "").includes(query);
        const matchTag = tag === "all" || (card.dataset.libraryAsset ?? "").includes(tag);
        const matchFolder = card.dataset.libraryCategory === (this._libraryFolder ?? "core");
        card.hidden = !(matchText && matchTag && matchFolder); if (!card.hidden) visible++;
      });
      const count = libraryPanel?.querySelector("[data-library-count]"); if (count) count.textContent = `${visible} ${visible === 1 ? "elemento" : "elementos"}`;
    };
    const resourcePaths = (() => {
      const paths = [];
      const walk = (value, prefix = "", depth = 0) => {
        if (!value || typeof value !== "object" || depth > 5) return;
        for (const [key, child] of Object.entries(value)) {
          if (["__proto__", "prototype", "constructor"].includes(key)) continue;
          const path = prefix ? `${prefix}.${key}` : key;
          if (typeof child === "number" && Number.isFinite(child)) paths.push(path);
          else if (child && typeof child === "object") {
            if (typeof child.value === "number") paths.push(`${path}.value`);
            if (typeof child.max === "number") paths.push(`${path}.max`);
            walk(child, path, depth + 1);
          }
        }
      };
      walk(this.actor.system ?? {});
      // Recursos NEXUS são caminhos importantes mesmo quando a ficha ainda não
      // possui valores numéricos inicializados no ator.
      for (const resource of ["pv", "pm", "pe"]) {
        if (getPath(this.actor.system ?? {}, `resources.${resource}`) === undefined) continue;
        for (const suffix of ["value", "max"]) if (getPath(this.actor.system ?? {}, `resources.${resource}.${suffix}`) !== undefined) paths.push(`resources.${resource}.${suffix}`);
      }
      for (const path of ["attributes.body", "attributes.mind", "attributes.soul", "combat.defense", "combat.movement", "combat.desl", "combat.ddr", "combat.mb", "identity.level"]) {
        paths.push(path);
      }
      for (const alias of [...getNativePropertyDefinitions(this.actor), ...getAliasDefinitions(this.actor)]) {
        const key = safeAliasKey(alias.key); if (!key) continue;
        if (alias.type === "resource") paths.push(`${key}.name`, `${key}.exib`, `${key}.value`, `${key}.max`, `${key}.percentage`);
        else if (alias.type === "attribute") paths.push(`${key}.name`, `${key}.exib`, `${key}.value`, `${key}.checkbonus`, `${key}.roll`);
        else paths.push(key);
      }
      return [...new Set(paths)].sort((a,b) => a.localeCompare(b, "pt-BR"));
    })();
    const componentResourcePathList=html[0].querySelector("[data-resource-path-list]");
    if(componentResourcePathList) componentResourcePathList.replaceChildren(...resourcePaths.map(path=>{const option=document.createElement("option");option.value=path;return option;}));
    const renderLibraryDetails = () => {
      const detail = libraryPanel?.querySelector("[data-library-details]");
      if (!detail || detail.dataset.selectedType !== "sheet-resource") return;
      const settings = {
        label: detail.querySelector("[data-resource-content1]")?.value ?? "PV",
        icon: detail.querySelector("[data-resource-content2]")?.value ?? "❤️",
        current: resolveNexusBinding(this.actor, detail.querySelector("[data-resource-current]")?.value || "resources.pv.value").value ?? "—",
        max: resolveNexusBinding(this.actor, detail.querySelector("[data-resource-max]")?.value || "resources.pv.max").value ?? "—",
        color: detail.querySelector("[data-resource-color]")?.value || ({ PV: "#d94b4b", PM: "#3979d8", PE: "#39a86b" })[String(detail.querySelector("[data-resource-content1]")?.value || "PV").toUpperCase()] || "#d94b4b",
        trackColor: detail.querySelector("[data-resource-track-color]")?.value || "#080d14",
        orientation: detail.querySelector("[data-resource-orientation]")?.value || "horizontal"
      };
      const livePreview = detail.querySelector("[data-resource-live-preview]");
      updateSheetResourcePreview(livePreview?.querySelector(".nexus-sheet-resource-preview"), settings);
      fitSheetResourcePreview(livePreview, { w: 220, h: 58 }, 160);
    };
    const selectLibraryAsset = card => {
      if (!card) return;
      this._librarySelectedType = card.dataset.assetType || null;
      this._librarySelectedAssetKey = card.dataset.assetKey || null;
      libraryPanel.querySelectorAll("[data-library-asset]").forEach(item => item.classList.toggle("is-selected", item === card));
      const asset = NEXUS_LIBRARY_CATALOG.assets.find(item => (item.key ?? `${item.category}-${NEXUS_LIBRARY_CATALOG.assets.indexOf(item)}`) === card.dataset.assetKey) ?? NEXUS_LIBRARY_CATALOG.assets.find(item => item.type === card.dataset.assetType);
      const detail = libraryPanel.querySelector("[data-library-details]");
      if (!detail || !asset) return;
      detail.dataset.selectedType = asset.type;
      detail.dataset.selectedAssetKey = asset.key ?? `${asset.category}-${NEXUS_LIBRARY_CATALOG.assets.indexOf(asset)}`;
      const pathOptions = resourcePaths.map(path => `<option value="${path.replace(/&/g,"&amp;").replace(/\"/g,"&quot;")}">${path}</option>`).join("");
      if (asset.type === "custom-card") {
        detail.innerHTML = `<div class="nexus-library-detail-heading"><strong class="nexus-library-detail-title">Card de conteúdo</strong></div>
          <div class="nexus-library-config-grid">
            <label>Título<input type="text" maxlength="48" value="Card" data-card-label></label>
            <label>Largura (px)<input type="number" min="80" max="600" step="10" value="220" data-card-width></label>
            <label>Altura (px)<input type="number" min="48" max="500" step="10" value="120" data-card-height></label>
          </div>
          <label class="nexus-library-card-content-label">Conteúdo<textarea rows="4" maxlength="500" placeholder="Escreva o conteúdo do card…" data-card-text></textarea></label>
          <button type="button" data-library-add>Adicionar card ao Canvas</button>`;
        return;
      }
      if (asset.type === "sheet-attribute") {
        detail.innerHTML = `<div class="nexus-library-live-preview is-sheet-attribute"><div class="nexus-sheet-element is-attribute" data-attribute-preview-card><small data-attribute-preview-label>CORPO</small><strong data-attribute-preview-value>3</strong></div></div>
          <div class="nexus-library-config-section"><strong>Atributo</strong>
            <label>Selecionar atributo<select data-attribute-preset><option value="body">Corpo</option><option value="mind">Mente</option><option value="soul">Alma</option><option value="custom">Personalizado</option></select></label>
            <label>Nome exibido<input type="text" value="Corpo" data-attribute-label></label>
            <label>Valor de prévia<input type="number" value="3" data-attribute-preview></label>
          </div>
          <div class="nexus-library-content-picker"><label>Propriedade vinculada<input type="text" value="attributes.body" data-attribute-path list="nexus-attribute-paths"></label><datalist id="nexus-attribute-paths">${pathOptions}</datalist></div>
          <button type="button" data-library-add>Adicionar ao Canvas</button>`;
        const preset = detail.querySelector("[data-attribute-preset]");
        const name = detail.querySelector("[data-attribute-label]");
        const path = detail.querySelector("[data-attribute-path]");
        if (asset.template) { preset.value = asset.template.attributePreset ?? "custom"; name.value = asset.template.text ?? asset.label; path.value = asset.template.dataPath ?? ""; }
        const update = () => {
          detail.querySelector("[data-attribute-preview-label]").textContent = name.value.trim().toLocaleUpperCase("pt-BR") || "ATRIBUTO";
          detail.querySelector("[data-attribute-preview-value]").textContent = detail.querySelector("[data-attribute-preview]").value || "0";
        };
        preset.addEventListener("change", () => {
          const map = { body: ["Corpo", "attributes.body"], mind: ["Mente", "attributes.mind"], soul: ["Alma", "attributes.soul"] };
          if (map[preset.value]) { name.value = map[preset.value][0]; path.value = map[preset.value][1]; }
          update();
        });
        path.addEventListener("input", () => {
          const expected = { body: "attributes.body", mind: "attributes.mind", soul: "attributes.soul" };
          if (path.value !== expected[preset.value]) preset.value = "custom";
        });
        detail.querySelectorAll("input, nexus-color-picker").forEach(input => input.addEventListener("input", update));
        update();
        return;
      }
      if (asset.type !== "sheet-resource") {
        detail.innerHTML = `<div class="nexus-library-detail-heading"><strong class="nexus-library-detail-title">${asset.label}</strong></div><button type="button" data-library-add>Adicionar à ficha</button>`;
        return;
      }
      detail.innerHTML = `
        <div class="nexus-library-detail-heading"><div><span class="nexus-library-detail-kind">Elemento</span><strong class="nexus-library-detail-title">Barra</strong></div></div>
        <div class="nexus-library-live-preview" data-resource-live-preview></div>
        
        <div class="nexus-library-config-grid">
          <label>Rótulo<input type="text" value="PV" data-resource-content1 ></label>
          <label>Ícone<input type="text" value="❤️" data-resource-content2 ></label>
          <label>Cor do preenchimento<nexus-color-picker value="#3198ce" data-resource-color></nexus-color-picker></label>
          <label>Cor do espaço vazio<nexus-color-picker value="#080d14" data-resource-track-color></nexus-color-picker></label>
          <label>Orientação<select data-resource-orientation><option value="horizontal">Horizontal</option><option value="vertical">Vertical</option></select></label>
        </div>
        <div class="nexus-library-content-picker">
          <strong>Conteúdo vinculado</strong>
          <label>Valor atual<select data-resource-current>${resourcePaths.filter(path => !path.endsWith(".max")).map(path => `<option value="${path.replace(/&/g,"&amp;").replace(/"/g,"&quot;")}" ${path === "resources.pv.value" ? "selected" : ""}>${path}</option>`).join("")}</select></label>
          <label>Valor máximo<select data-resource-max>${resourcePaths.filter(path => !path.endsWith(".value")).map(path => `<option value="${path.replace(/&/g,"&amp;").replace(/"/g,"&quot;")}" ${path === "resources.pv.max" ? "selected" : ""}>${path}</option>`).join("")}</select></label>
          
        </div>
        <button type="button" data-library-add>Adicionar ao Canvas</button>`;
      const defaultResourceCode = String(asset.template?.sheetCode ?? asset.template?.sheetContent1 ?? "PV").toUpperCase();
      const defaultResourceColor = asset.template?.sheetColor ?? ({ PV: "#d94b4b", PM: "#3979d8", PE: "#39a86b" })[defaultResourceCode] ?? "#d94b4b";
      const colorField = detail.querySelector("[data-resource-color]"); if (colorField) colorField.value = defaultResourceColor;
      if (asset.template) {
        const code = String(asset.template.sheetCode ?? asset.template.sheetContent1 ?? "PV").toUpperCase();
        const defaults = {
          "[data-resource-content1]": asset.template.sheetContent1 ?? asset.template.sheetCode,
          "[data-resource-current]": asset.template.currentPath,
          "[data-resource-max]": asset.template.maxPath,
          "[data-resource-color]": asset.template.sheetColor ?? ({ PV: "#d94b4b", PM: "#3979d8", PE: "#39a86b" })[code] ?? "#d94b4b",
          "[data-resource-track-color]": asset.template.sheetTrackColor ?? "#080d14",
          "[data-resource-orientation]": asset.template.sheetOrientation ?? "horizontal"
        };
        for (const [selector, value] of Object.entries(defaults)) { const field = detail.querySelector(selector); if (field && value) field.value = value; }
      }
      detail.querySelector("[data-resource-live-preview]")?.append(createSheetResourcePreview({ showValues: true }));
      detail.querySelectorAll("input,select,nexus-color-picker").forEach(input => input.addEventListener("input", renderLibraryDetails));
      detail.querySelectorAll("select, nexus-color-picker").forEach(input => input.addEventListener("change", renderLibraryDetails));
      renderLibraryDetails();
    };
    let libraryFilterFrame = 0;
    const scheduleLibraryFilter = () => {
      if (libraryFilterFrame) return;
      libraryFilterFrame = requestAnimationFrame(() => { libraryFilterFrame = 0; filterLibrary(); });
    };
    libraryPanel?.querySelector("[data-library-search]")?.addEventListener("input", scheduleLibraryFilter);
    libraryPanel?.querySelector("[data-library-tag]")?.addEventListener("change", scheduleLibraryFilter);

    // Os controles da Biblioteca ficam dentro de uma janela ApplicationV2 separada.
    // A delegação nativa no próprio painel acompanha o nó quando ele é movido para
    // essa janela e continua funcionando após atualizações do Canvas.
    libraryPanel?.addEventListener("click", async event => {
      const target = event.target instanceof Element ? event.target : event.target?.parentElement;
      const themeCard = target?.closest("[data-library-theme]");
      if (themeCard && libraryPanel.contains(themeCard)) {
        event.preventDefault();
        this._applyThemePreset(themeCard.dataset.libraryTheme);
        return;
      }

      const savedGroupCard = target?.closest("[data-library-saved-group]");
      if (savedGroupCard && libraryPanel.contains(savedGroupCard)) {
        event.preventDefault();
        const saved = (game.user?.getFlag?.("nexus", "libraryGroups") ?? []).find(item => item.id === savedGroupCard.dataset.librarySavedGroup);
        const detail = libraryPanel.querySelector("[data-library-details]");
        if (!saved || !detail) return;
        libraryPanel.querySelectorAll("[data-library-saved-group]").forEach(item => item.classList.toggle("is-selected", item === savedGroupCard));
        detail.dataset.selectedGroupId = saved.id;
        detail.dataset.selectedType = "saved-group";
        detail.innerHTML = "";
        const heading = document.createElement("div");
        heading.className = "nexus-library-detail-heading";
        const title = document.createElement("strong");
        title.className = "nexus-library-detail-title";
        title.textContent = saved.name || "Grupo personalizado";
        heading.append(title);
        const summary = document.createElement("p");
        summary.textContent = `Composição com ${saved.components?.length ?? 0} elementos independentes.`;
        const add = document.createElement("button");
        add.type = "button";
        add.dataset.libraryAddGroup = "";
        add.textContent = "Adicionar grupo ao Canvas";
        detail.append(heading, summary, add);
        return;
      }

      const assetCard = target?.closest("[data-library-asset]");
      if (assetCard && libraryPanel.contains(assetCard)) {
        event.preventDefault();
        if (!assetCard.dataset.libraryTheme) selectLibraryAsset(assetCard);
        return;
      }

      const addGroupButton = target?.closest("[data-library-add-group]");
      if (addGroupButton && libraryPanel.contains(addGroupButton)) {
        event.preventDefault();
        const groupId = libraryPanel.querySelector("[data-library-details]")?.dataset.selectedGroupId;
        if (groupId) await this._addSavedGroupToCanvas(groupId);
        return;
      }

      const addButton = target?.closest("[data-library-add]");
      if (!addButton || !libraryPanel.contains(addButton)) return;
      event.preventDefault();

      const addComponent = async (type, options = {}) => {
        if (!COMPONENTS[type]) {
          throw new Error(`Tipo de componente não registrado: ${String(type)}`);
        }
        await this._addComponent(type, options);
      };
      try {
        const detail = libraryPanel.querySelector("[data-library-details]");
        const type = detail?.dataset.selectedType;
        if (!type) throw new Error("Nenhum componente da Biblioteca está selecionado.");

        if (type === "custom-card") {
          const template = {
            customLabel: detail.querySelector("[data-card-label]")?.value.trim() || "Card",
            text: detail.querySelector("[data-card-text]")?.value ?? "",
            w: Number(detail.querySelector("[data-card-width]")?.value) || 220,
            h: Number(detail.querySelector("[data-card-height]")?.value) || 120
          };
          await addComponent(type, { template });
          return;
        }

        if (type === "sheet-attribute") {
          const label = detail.querySelector("[data-attribute-label]")?.value.trim() || "Corpo";
          const path = detail.querySelector("[data-attribute-path]")?.value.trim() || "attributes.body";
          const preset = detail.querySelector("[data-attribute-preset]")?.value || "custom";
          const asset = NEXUS_LIBRARY_CATALOG.assets.find(item => item.key === detail.dataset.selectedAssetKey);
          const template = {
            ...clone(asset?.template ?? {}), text: label, dataPath: path,
            attributePreset: preset, sheetCode: label.slice(0, 8).toUpperCase(),
            w: asset?.template?.w ?? 112, h: asset?.template?.h ?? 88
          };
          await addComponent(type, { template });
          return;
        }

        if (type !== "sheet-resource") {
          const asset = NEXUS_LIBRARY_CATALOG.assets.find(item =>
            (item.key ?? `${item.category}-${NEXUS_LIBRARY_CATALOG.assets.indexOf(item)}`) === detail.dataset.selectedAssetKey
          );
          await addComponent(type, { template: clone(asset?.template ?? {}) });
          return;
        }

        const asset = NEXUS_LIBRARY_CATALOG.assets.find(item =>
          (item.key ?? `${item.category}-${NEXUS_LIBRARY_CATALOG.assets.indexOf(item)}`) === detail.dataset.selectedAssetKey
        );
        const template = {
          sheetVariant: "resource",
          ...(clone(asset?.template ?? {})),
          w: detail.querySelector("[data-resource-orientation]")?.value === "vertical" ? 100 : (Number(asset?.template?.w) || 220),
          h: detail.querySelector("[data-resource-orientation]")?.value === "vertical" ? 190 : (Number(asset?.template?.h) || 58),
          sheetCode: detail.querySelector("[data-resource-content1]")?.value.trim() || "",
          sheetContent1: detail.querySelector("[data-resource-content1]")?.value.trim() || "",
          sheetContent2: detail.querySelector("[data-resource-content2]")?.value.trim() || "",
          sheetColor: detail.querySelector("[data-resource-color]")?.value || "#d94b4b",
          sheetTrackColor: detail.querySelector("[data-resource-track-color]")?.value || "#080d14",
          sheetOrientation: detail.querySelector("[data-resource-orientation]")?.value || "horizontal",
          currentPath: detail.querySelector("[data-resource-current]")?.value.trim() || asset?.template?.currentPath || "resources.pv.value",
          maxPath: detail.querySelector("[data-resource-max]")?.value.trim() || asset?.template?.maxPath || "resources.pv.max",
          dataPath: "",
          text: ""
        };
        await addComponent(type, { template });
      } catch (error) {
        console.error("NEXUS | Falha ao inserir componente pela Biblioteca", error);
        ui.notifications?.error?.("Não foi possível inserir este componente. Consulte o console para detalhes.");
      }
    });

    this._libraryApplyFilter = filterLibrary;
    this._libraryRestoreSelection = () => {
      if (!libraryPanel || !this._librarySelectedType) return;
      const previousAsset = this._librarySelectedAssetKey
        ? libraryPanel.querySelector(`[data-asset-key="${CSS.escape(this._librarySelectedAssetKey)}"]`)
        : null;
      const fallbackAsset = previousAsset ?? libraryPanel.querySelector(`[data-asset-type="${CSS.escape(this._librarySelectedType)}"]`);
      if (fallbackAsset) selectLibraryAsset(fallbackAsset);
    };
    filterLibrary();
    html.find("[data-layer-group]").on("click", event => {
      if(event.target.closest("[data-layer-disclosure]")){
        event.preventDefault();event.stopPropagation();const id=event.currentTarget.dataset.layerGroup;this._collapsedLayerGroups??=new Set();
        if(this._collapsedLayerGroups.has(id))this._collapsedLayerGroups.delete(id);else this._collapsedLayerGroups.add(id);
        const folder=event.currentTarget.closest(".nexus-layer-folder"),children=folder?.querySelector(".nexus-layer-children"),icon=event.currentTarget.querySelector("[data-layer-disclosure]");
        if(children)children.hidden=this._collapsedLayerGroups.has(id);if(icon)icon.textContent=children?.hidden?"▸":"▾";return;
      }
      this._nexusInteractionActive = false; const group=(this._currentLayout?.groups??[]).find(g=>g.id===event.currentTarget.dataset.layerGroup); this._setSelection(html,group?.componentIds??[]); this._selectedGroupId=group?.id??null;
    });
    // Renomear pelo duplo clique no nome, sem abrir o editor de componentes.
    html.find(".nexus-layer-list").on("dblclick", ".nexus-layer-name", event => {
      event.preventDefault(); event.stopPropagation();
      const nameNode=event.currentTarget, row=nameNode.closest("[data-layer-group], [data-layer-select]");
      if(!row) return;
      const id=row.dataset.layerGroup || row.dataset.layerSelect;
      const kind=row.dataset.layerGroup ? "group" : "component";
      this._beginLayerRename(nameNode, kind, id);
    });
    html.find("[data-layer-select], [data-layer-group]").on("dblclick", event => {
      if (event.target.closest(".nexus-layer-name")) return;
      event.preventDefault();
      const row=event.currentTarget, groupId=row.dataset.layerGroup;
      if(groupId){const group=(this._currentLayout?.groups??[]).find(item=>item.id===groupId);this._setSelection(html,group?.componentIds??[]);this._selectedGroupId=groupId;}
      else this._setSelection(html,[row.dataset.layerSelect]);
      const portal=document.querySelector(`[data-nexus-floating-for="${this.id}"]`);portal?.querySelector('[data-floating-panel="component"]')?.click();
    });
    html.find("[data-layer-select], [data-layer-group]").attr("draggable", "true").on("dragstart", event => {
      const row=event.currentTarget, id=row.dataset.layerSelect || row.dataset.layerGroup;
      event.originalEvent.dataTransfer.setData("text/nexus-layer", id); event.originalEvent.dataTransfer.effectAllowed="move";
      row.classList.add("is-dragging");
    }).on("dragend", event => event.currentTarget.classList.remove("is-dragging"))
      .on("dragover", event => {
        event.preventDefault(); event.originalEvent.dataTransfer.dropEffect="move";
        const row=event.currentTarget, rect=row.getBoundingClientRect(), ratio=(event.originalEvent.clientY-rect.top)/Math.max(1,rect.height);
        const list=row.closest(".nexus-layer-list");
        if(list){const edge=34, y=event.originalEvent.clientY, box=list.getBoundingClientRect();if(y<box.top+edge)list.scrollTop-=Math.ceil((box.top+edge-y)/4);else if(y>box.bottom-edge)list.scrollTop+=Math.ceil((y-(box.bottom-edge))/4);}
        row.classList.remove("drop-before","drop-after","drop-inside");
        row.classList.add(row.dataset.layerGroup && ratio>.25 && ratio<.75 ? "drop-inside" : ratio<.5 ? "drop-before" : "drop-after");
      }).on("dragleave", event => event.currentTarget.classList.remove("drop-before","drop-after","drop-inside"))
      .on("drop", async event => {
        event.preventDefault(); const source=event.originalEvent.dataTransfer.getData("text/nexus-layer"), row=event.currentTarget, target=row.dataset.layerSelect || row.dataset.layerGroup;
        const rect=row.getBoundingClientRect(), ratio=(event.originalEvent.clientY-rect.top)/Math.max(1,rect.height);
        const placement=row.dataset.layerGroup && ratio>.25 && ratio<.75 ? "inside" : ratio<.5 ? "before" : "after";
        row.classList.remove("drop-before","drop-after","drop-inside");
        if(!source || source===target) return; await this._reorderLayer(source,target,placement);
      });
    const inspectorNamespace = `.nexusInspector${String(this.id).replace(/[^a-zA-Z0-9]/g, "")}`;
    this._nexusInspectorNamespace = inspectorNamespace;
    $(document).off(inspectorNamespace);
    const getTextStyleTarget = () => this._textStyleTarget === "heading" ? "heading" : "content";
    const getInspectorComponent = element => {
      const inspector = element?.closest?.(".nexus-component-inspector");
      const id = inspector?.querySelector("[data-component-setting]")?.dataset.componentTargetId || this._componentEditorTargetId || [...(this._selectedIds ?? [])][0];
      return (this._currentLayout?.components ?? []).find(component => component.id === id) ?? null;
    };
    $(document).on(`click${inspectorNamespace}`, ".nexus-component-inspector [data-text-style-target]", event => {
      event.preventDefault(); this._textStyleTarget = event.currentTarget.dataset.textStyleTarget;
      const component = getInspectorComponent(event.currentTarget); this._syncTextToolbar(event.currentTarget.closest(".nexus-component-inspector"), component);
    });
    $(document).on(`click${inspectorNamespace}`, ".nexus-component-inspector [data-text-style-command]", async event => {
      event.preventDefault(); const button = event.currentTarget, component = getInspectorComponent(button); if (!component) return;
      const target = getTextStyleTarget(), style = component[target + "Style"] ?? {}, command = button.dataset.textStyleCommand;
      let key = "", value;
      if (command === "bold") { key = "fontWeight"; value = Number(style.fontWeight ?? 400) >= 600 ? "400" : "700"; }
      else if (command === "italic") { key = "fontStyle"; value = style.fontStyle === "italic" ? "normal" : "italic"; }
      else if (command === "underline") { key = "textDecoration"; value = style.textDecoration === "underline" ? "none" : "underline"; }
      else if (command.startsWith("align-")) { key = "textAlign"; value = command.slice(6); }
      else if (command === "transform") { key = "textTransform"; value = ({ none: "uppercase", uppercase: "lowercase", lowercase: "capitalize", capitalize: "none" })[style.textTransform ?? "none"]; }
      if (key) await this._setComponentTextStyle(component.id, target, key, value);
    });
    $(document).on(`click${inspectorNamespace}`, ".nexus-component-inspector [data-text-style-menu-toggle]", event => { event.preventDefault(); const menu = event.currentTarget.closest(".nexus-text-toolbar")?.querySelector("[data-text-style-font-menu]"); if (menu) menu.hidden = !menu.hidden; });
    $(document).on(`click${inspectorNamespace}`, ".nexus-component-inspector [data-text-style-font]", async event => {
      event.preventDefault(); const component = getInspectorComponent(event.currentTarget); if (!component) return;
      await this._setComponentTextStyle(component.id, getTextStyleTarget(), "fontFamily", event.currentTarget.dataset.textStyleFont);
      const menu = event.currentTarget.closest("[data-text-style-font-menu]"); if (menu) menu.hidden = true;
    });
    $(document).on(`click${inspectorNamespace}`, ".nexus-component-inspector [data-text-style-advanced-toggle]", event => { event.preventDefault(); const panel = event.currentTarget.closest(".nexus-text-tools")?.querySelector("[data-text-style-advanced]"); if (panel) panel.hidden = !panel.hidden; });
    $(document).on(`change${inspectorNamespace}`, ".nexus-component-inspector [data-text-style-size]", async event => { const component = getInspectorComponent(event.currentTarget); if (component) await this._setComponentTextStyle(component.id, getTextStyleTarget(), "fontSize", event.currentTarget.value); });
    $(document).on(`change${inspectorNamespace}`, ".nexus-component-inspector [data-text-style-color]", async event => { const component = getInspectorComponent(event.currentTarget); if (component) await this._setComponentTextStyle(component.id, getTextStyleTarget(), "color", event.currentTarget.value); });
    $(document).on(`change${inspectorNamespace}`, ".nexus-component-inspector [data-text-style-field]", async event => { const component = getInspectorComponent(event.currentTarget); if (component) await this._setComponentTextStyle(component.id, getTextStyleTarget(), event.currentTarget.dataset.textStyleField, event.currentTarget.value); });
    $(document).on(`change${inspectorNamespace}`, ".nexus-component-inspector [data-actor-portrait]", event => this._updateSystemValue(event.currentTarget));

    const positionPropertyOptions = input => {
      if (!input?.isConnected) return;
      const inspector = input.closest(".nexus-component-inspector");
      const list = inspector?.querySelector("[data-component-path-options]") || document.querySelector(`[data-nexus-property-owner="${this.id}"]`);
      if (!list || !inspector || list.hidden) return;
      if (list.parentElement !== document.body) {
        // A single detached portal avoids clipping inside the scrollable inspector.
        document.querySelectorAll(`[data-nexus-property-owner="${this.id}"]`).forEach(other => { if (other !== list) other.remove(); });
        list.dataset.nexusPropertyOwner = String(this.id);
        list._nexusOwnerInspector = inspector;
        list._nexusOwnerInput = input;
        document.body.append(list);
      } else {
        list._nexusOwnerInspector = inspector;
        list._nexusOwnerInput = input;
      }
      const rect = input.getBoundingClientRect();
      const viewportWidth = document.documentElement.clientWidth || window.innerWidth;
      const gap = 6;
      const viewportHeight = document.documentElement.clientHeight || window.innerHeight;
      const availableAbove = Math.max(0, rect.top - gap - 12);
      const availableBelow = Math.max(0, viewportHeight - rect.bottom - gap - 12);
      const placeAbove = availableAbove >= Math.min(180, availableBelow) && availableAbove > availableBelow;
      const maxHeight = Math.max(96, Math.min(280, placeAbove ? availableAbove : availableBelow));
      list.style.position = "fixed";
      list.style.left = `${Math.max(12, Math.min(rect.left, viewportWidth - rect.width - 12))}px`;
      list.style.width = `${Math.min(rect.width, viewportWidth - 24)}px`;
      list.style.maxHeight = `${maxHeight}px`;
      list.style.top = placeAbove ? `${Math.max(8, rect.top - Math.min(list.scrollHeight || 240, maxHeight) - gap)}px` : `${Math.min(viewportHeight - maxHeight - 8, rect.bottom + gap)}px`;
      list.style.bottom = "auto";
      list.style.overflowY = "auto";
    };
    const filterPropertyOptions = input => {
      const inspector = input.closest(".nexus-component-inspector"), list = inspector?.querySelector("[data-component-path-options]") || document.querySelector(`[data-nexus-property-owner="${this.id}"]`);
      if (!list) return;
      const query = String(input.value ?? "").trim().toLocaleLowerCase("pt-BR");
      let matches = 0;
      list.querySelectorAll(".nexus-property-option").forEach(option => { const visible = !query || option.textContent.toLocaleLowerCase("pt-BR").includes(query) || option.dataset.propertyPathOption.toLocaleLowerCase("pt-BR").includes(query); option.hidden = !visible; if (visible) matches++; });
      list.querySelectorAll(".nexus-property-options-heading").forEach(heading => { let next = heading.nextElementSibling, visible = false; while (next && !next.classList.contains("nexus-property-options-heading")) { if (!next.hidden) visible = true; next = next.nextElementSibling; } heading.hidden = !visible; });
      list.dataset.empty = matches ? "false" : "true";
      list.hidden = false;
      requestAnimationFrame(() => positionPropertyOptions(input));
    };
    $(document).on(`focus${inspectorNamespace} input${inspectorNamespace}`, ".nexus-component-inspector [data-component-path-input]", event => filterPropertyOptions(event.currentTarget));
    $(document).on(`input${inspectorNamespace}`, ".nexus-component-inspector [data-component-path-input]", event => filterPropertyOptions(event.currentTarget));
    $(window).on(`resize${inspectorNamespace} scroll${inspectorNamespace}`, () => {
      const input = document.activeElement?.matches?.("[data-component-path-input]") ? document.activeElement : null;
      if (input) positionPropertyOptions(input);
    });
    $(document).on(`click${inspectorNamespace}`, "[data-property-path-option]", event => {
      event.preventDefault(); event.stopPropagation();
      const button = event.currentTarget, list = button.closest("[data-component-path-options]"), inspector = list?._nexusOwnerInspector || button.closest(".nexus-component-inspector"), input = list?._nexusOwnerInput || inspector?.querySelector("[data-component-path-input]");
      if (!input || !list || !inspector) return;
      input.value = button.dataset.propertyPathOption;
      list.hidden = true;
      list.style.top = ""; list.style.left = ""; list.style.width = ""; list.style.maxHeight = "";
      if (list.parentElement === document.body) inspector.append(list);
      delete list.dataset.nexusPropertyOwner; list._nexusOwnerInspector = null; list._nexusOwnerInput = null;
      input.dispatchEvent(new Event("change", { bubbles: true }));
      input.blur();
    });
    $(document).on(`pointerdown${inspectorNamespace}`, "[data-component-path-options]", event => event.stopPropagation());
    $(document).on(`scroll${inspectorNamespace}`, ".nexus-panel-window, .nexus-component-inspector", () => {
      const input = document.activeElement?.matches?.("[data-component-path-input]") ? document.activeElement : null;
      if (input) positionPropertyOptions(input);
    });
    $(document).on(`focusout${inspectorNamespace}`, ".nexus-component-inspector [data-component-path-input]", event => { const input = event.currentTarget, inspector = input.closest(".nexus-component-inspector"), list = inspector?.querySelector("[data-component-path-options]") || document.querySelector(`[data-nexus-property-owner="${this.id}"]`); setTimeout(() => { if (list && !list.contains(document.activeElement)) { list.hidden = true; list.style.top = ""; list.style.left = ""; list.style.width = ""; list.style.maxHeight = ""; if (list.parentElement === document.body && inspector) inspector.append(list); delete list.dataset.nexusPropertyOwner; list._nexusOwnerInspector = null; list._nexusOwnerInput = null; } }, 100); });

    $(document).on(`input${inspectorNamespace}`, ".nexus-component-inspector [data-component-setting]", event => {
      const input = event.currentTarget;
      const panelWindow = input.closest(".nexus-panel-window");
      if (panelWindow && panelWindow.id !== `nexus-${this.id}-component`) return;
      const id = input.dataset.componentTargetId || this._componentEditorTargetId || [...(this._selectedIds ?? [])][0];
      const node = id ? this.element?.querySelector(`.nexus-component[data-id="${CSS.escape(id)}"]`) : null;
      if (!node) return;
      const key = input.dataset.componentSetting, value = input.value;
      const styles = { backgroundColor: "--nexus-component-bg", borderColor: "--nexus-component-border", fontSize: "--nexus-component-font-size", fontFamily: "--nexus-component-font-family", textAlign: "--nexus-component-text-align", fontWeight: "--nexus-component-font-weight", fontStyle: "--nexus-component-font-style", textTransform: "--nexus-component-text-transform", letterSpacing: "--nexus-component-letter-spacing", lineHeight: "--nexus-component-line-height" };
      if (styles[key]) node.style.setProperty(styles[key], key === "fontSize" || key === "letterSpacing" ? `${value}${key === "fontSize" ? "px" : "px"}` : value);
      if (key === "borderRadius") node.style.setProperty("--nexus-component-radius", `${value}px`);
      if (key === "opacity") node.style.setProperty("--nexus-component-opacity", `${value}%`);
      if (key === "labelPosition") node.dataset.labelPosition = value;
      if (key === "customLabel") { const heading = node.querySelector(".nexus-component-heading"); if (heading) heading.textContent = value; }
      if (key === "text" && node.dataset.type === "custom-card") { const content = node.querySelector(".nexus-custom-card-value"); if (content) content.textContent = value; }
    });
    $(document).on(`change${inspectorNamespace}`, ".nexus-component-inspector [data-component-setting]", async event => {
      const panelWindow = event.currentTarget.closest(".nexus-panel-window");
      if (panelWindow && panelWindow.id !== `nexus-${this.id}-component`) return;
      const input=event.currentTarget, key=input.dataset.componentSetting, id=input.dataset.componentTargetId || this._componentEditorTargetId || [...(this._selectedIds ?? [])][0];
      const shouldRestoreInputFocus = document.activeElement === input;
      if(!id) return;
      const panelWindowElement = input.closest(".nexus-panel-window");
      const panelInstance = this._nexusPanelWindows?.get("component");
      const panelLeft = panelWindowElement?.style.left ?? "";
      const panelTop = panelWindowElement?.style.top ?? "";
      const panelTransform = panelWindowElement?.style.transform ?? "";
      const scrollSnapshot = [".window-content", ".application-content", ".nexus-component-inspector"]
        .map(selector => ({ selector, top: panelWindowElement?.querySelector(selector)?.scrollTop ?? 0, left: panelWindowElement?.querySelector(selector)?.scrollLeft ?? 0 }));
      const restoreEditorViewport = ({ focus = false, target: focusTarget = null } = {}) => {
        const restore = () => {
          const currentWindow = this._nexusPanelWindows?.get("component")?.element ?? panelInstance?.element ?? panelWindowElement;
          if (!currentWindow) return;
          if (panelLeft) currentWindow.style.setProperty("left", panelLeft, "important");
          if (panelTop) currentWindow.style.setProperty("top", panelTop, "important");
          if (panelTransform) currentWindow.style.setProperty("transform", panelTransform, "important");
          for (const state of scrollSnapshot) {
            const target = currentWindow.querySelector(state.selector);
            if (target) { target.scrollTop = state.top; target.scrollLeft = state.left; }
          }
          if (focus && this._componentEditorTargetId === id) {
            const currentInput = focusTarget?.isConnected ? focusTarget : (currentWindow.querySelector(`[data-component-setting="${CSS.escape(key)}"][data-component-target-id="${CSS.escape(id)}"]`) ?? currentWindow.querySelector(`[data-component-setting="${CSS.escape(key)}"]`));
            currentInput?.focus({ preventScroll: true });
          }
        };
        requestAnimationFrame(() => requestAnimationFrame(() => {
          const currentWindow = this._nexusPanelWindows?.get("component")?.element ?? panelInstance?.element ?? panelWindowElement;
          const activeNow = document.activeElement;
          const target = currentWindow?.querySelector(`[data-component-setting="${CSS.escape(key)}"][data-component-target-id="${CSS.escape(id)}"]`);
          const mayRestoreFocus = shouldRestoreInputFocus && (!activeNow || activeNow === document.body || activeNow === document.documentElement || activeNow === input || !currentWindow?.contains(activeNow));
          restoreEditorViewport({ focus: mayRestoreFocus, target });
        }));
      };
      // O alvo de edição é persistente e independente do foco/seleção momentânea.
      this._componentEditorTargetId = id;
      const layouts=await this._readLayouts(), active=this._activeLayoutId(), layout=layouts[active];
      const component=layout?.components?.find(item=>item.id===id); if(!component) return;
      if (key === "actorName") {
        const name = String(input.value ?? "").trim().slice(0, 100);
        if (name) await this.actor.update({ name });
        return;
      }
      if (key === "updateSource") { component.updateSource = !!input.checked; await this._writeLayouts(layouts,active); this.render({force:true}); return; }
      this._captureHistory();
      if(key==="width") component.w=clamp(Number(input.value)||component.w,20,layout.width);
      else if(key==="height") component.h=clamp(Number(input.value)||component.h,20,layout.height);
      else if(key==="x") component.x=clamp(Number(input.value)||0,0,layout.width-component.w);
      else if(key==="y") component.y=clamp(Number(input.value)||0,0,layout.height-component.h);
      else if(key==="currentPath" || key==="maxPath") { const path=String(input.value).replace(/^system\./,"").trim(); if(!/^[a-zA-Z0-9_-]+(?:\.[a-zA-Z0-9_-]+)*$/.test(path) || path.split(".").some(part=>["__proto__","prototype","constructor"].includes(part))) return; component[key]=path; }
      else if(key==="binding") { component.binding=input.value; component.customBinding = input.value === "custom" ? (component.customBinding || "") : ""; }
      else if(key==="customBinding") { const path=String(input.value).replace(/^system\./, "").trim(); if(path && !/^[a-zA-Z0-9_-]+(?:\.[a-zA-Z0-9_-]+)*$/.test(path)) return; component.customBinding=path; }
      else if(key==="resourceLabel") component.resourceLabel=String(input.value).trim().slice(0,24) || "Recurso";
      else if (["sheetContent1", "sheetContent2"].includes(key)) component[key]=String(input.value).slice(0,120);
      else if (["sheetColor", "sheetTrackColor", "tokenFrameColor", "tokenBackgroundColor"].includes(key)) component[key]=input.value;
      else if (key === "tokenFrameMode") component.tokenFrameMode=input.value === "media" ? "media" : "solid";
      else if (key === "tokenFrameSource") { const source=String(input.value).trim().slice(0,2048); component.tokenFrameSource=isMediaSource(source)?source:""; }
      else if (key === "tokenImage") {
        const source=String(input.value ?? "").trim().slice(0,2048);
        const expression=source.match(/^\{\{\s*([^{}]+?)\s*\}\}$/);
        const resolved=expression ? resolveNexusBinding(this.actor,expression[1]) : null;
        if (source && (expression ? (!resolved?.path || !(isImageSource(resolved.value) || isVideoSource(resolved.value))) : !(isImageSource(source) || isVideoSource(source)))) { ui.notifications?.warn?.("Não foi possível reconhecer a imagem. Informe uma imagem ou uma propriedade de imagem válida."); input.value=component.tokenImage??""; return; }
        if (source) component.tokenImage=expression ? `{{${resolved.path}}}` : source; else delete component.tokenImage;
      }
      else if (key === "tokenOverlay") component.tokenOverlay=String(input.value).slice(0,24);
      else if (key === "tokenFrameWidth") component.tokenFrameWidth=clamp(Number(input.value)||0,0,16);
      else if (key === "tokenShape") component.tokenShape=["circle","rounded","square"].includes(input.value)?input.value:"circle";
      else if (key === "sheetOrientation") component.sheetOrientation=input.value === "vertical" ? "vertical" : "horizontal";
      else if (key === "previewCurrent") component.previewCurrent=Math.max(0, Number(input.value)||0);
      else if (key === "previewMax") component.previewMax=Math.max(1, Number(input.value)||1);
      else if(key==="backgroundColor" || key==="borderColor") component[key]=input.value;
      else if(key==="borderRadius") component.borderRadius=clamp(Number(input.value)||0,0,32);
      else if(key==="opacity") { const opacity=Number(input.value); component.opacity=clamp(Number.isFinite(opacity)?opacity:100,0,100); }
      else if(key==="fontSize") component.fontSize=clamp(Number(input.value)||13,7,48);
      else if(key==="imageFit") component.imageFit=["contain","cover","fill","none"].includes(input.value)?input.value:"contain";
      else if(key==="imagePosition") component.imagePosition=["center","top","bottom","left","right"].includes(input.value)?input.value:"center";
      else if(key==="imageOpacity") component.imageOpacity=clamp(Number(input.value) || 100,0,100);
      else if(key==="actionPath") { const path=String(input.value??"").replace(/^system\./,"").trim(); if(path && (!/^[a-zA-Z0-9_-]+(?:\.[a-zA-Z0-9_-]+)*$/.test(path) || path.split(".").some(part=>["__proto__","prototype","constructor"].includes(part)))) return; component.actionPath=path; }
      else if(/^proficiencyLabel[0-3]$/.test(key)) { const index=Number(key.slice(-1)); component.proficiencyLabels ??= ["Sem domínio","Básico","Treinado","Especialista"]; component.proficiencyLabels[index]=String(input.value??"").trim().slice(0,24)||("Nível " + index); }
      else if(key==="textAlign") component.textAlign=["left","center","right","justify"].includes(input.value)?input.value:"center";
      else if(key==="fontWeight") component.fontWeight=["400","500","600","700","800"].includes(String(input.value))?String(input.value):"400";
      else if(key==="fontStyle") component.fontStyle=input.value==="italic"?"italic":"normal";
      else if(key==="textTransform") component.textTransform=["none","uppercase","lowercase","capitalize"].includes(input.value)?input.value:"none";
      else if(key==="letterSpacing") component.letterSpacing=clamp(Number(input.value)||0,-2,12);
      else if(key==="lineHeight") component.lineHeight=clamp(Number(input.value)||1.35,0.8,2.4);
      else if(key==="fontFamily") component.fontFamily=["Inter","Arial","Georgia","Verdana","monospace"].includes(input.value)?input.value:"Inter";
      else if(key==="headingFontSize") { const size=String(input.value??"").trim(); if(size) component.headingFontSize=clamp(Number(size)||10,7,32); else delete component.headingFontSize; }
      else if(key==="headingFontFamily") { if(["Inter","Arial","Georgia","Verdana","monospace"].includes(input.value)) component.headingFontFamily=input.value; else delete component.headingFontFamily; }
      else if(key==="labelPosition") component.labelPosition=["top-left","top-center","side-left"].includes(input.value)?input.value:"top-left";
      else if(key==="format") { component.format=input.value; }
      else if(key==="attributePreset") {
        const presets = { body: ["Corpo", "attributes.body"], mind: ["Mente", "attributes.mind"], soul: ["Alma", "attributes.soul"] };
        component.attributePreset = input.value;
        if (presets[input.value]) { component.text = presets[input.value][0]; component.dataPath = presets[input.value][1]; }
      }
      else if(key==="actionType") component.actionType = ["roll","proficiency","resource-slider"].includes(input.value) ? input.value : "";
      else if(key==="rollFormula") component.rollFormula = String(input.value ?? "").trim().slice(0, 120);
      else if(key==="dataPath") {
        const resolved = resolveNexusBinding(this.actor, input.value);
        const path = resolved.path;
        if (String(input.value).trim() && (!path || !/^[a-zA-Z0-9_-]+(?:\.[a-zA-Z0-9_-]+)*$/.test(path))) return;
        component.dataPath = path;
        if(component.type==="resource-meter"){component.customBinding=path;component.binding="custom";}
      }
      else if(key==="customLabel") { const title=String(input.value).trim().slice(0,48); component.customLabel=title; if (["level","attribute"].includes(COMPONENTS[component.type]?.variant) || ["level","attribute"].includes(component.sheetVariant)) component.text=title; }
      else if(key==="showLabel") component.showLabel=!!input.checked;
      else if(key==="text") component.text=String(input.value).slice(0,500);
      else if(key==="rows") component.rows=clamp(Number(input.value)||3,1,20);
      else if(key==="columns") component.columns=clamp(Number(input.value)||3,1,12);
      else if(key==="placeholder") component.placeholder=String(input.value).slice(0,100);
      await this._writeLayouts(layouts,active);
      this._componentEditorTargetId = id;
      this._selectedIds = new Set([id]);
      restoreEditorViewport();
      if (["actionType", "rollFormula", "actionPath", "proficiencyLabel0", "proficiencyLabel1", "proficiencyLabel2", "proficiencyLabel3"].includes(key) || (key === "dataPath" && component.type !== "token") || key === "customLabel" || key === "showLabel" || (key === "text" && component.type === "custom-card")) {
        await this.render({ force: true });
        restoreEditorViewport();
        return;
      }
      const visualOnly = ["x","y","fontSize","fontFamily","textAlign","fontWeight","fontStyle","textTransform","letterSpacing","lineHeight","headingFontSize","headingFontFamily","labelPosition","currentPath","maxPath","backgroundColor","borderColor","borderRadius","opacity","sheetContent1","sheetContent2","sheetColor","sheetTrackColor","sheetOrientation","previewCurrent","previewMax","tokenImage","tokenFrameMode","tokenFrameSource","tokenFrameColor","tokenFrameWidth","tokenShape","tokenOverlay","tokenBackgroundColor","imageFit","imagePosition","imageOpacity"].includes(key) || (key === "dataPath" && component.type === "token") || (component.type === "sheet-attribute" && ["attributePreset","text","dataPath"].includes(key));
      if (visualOnly) {
        const node = html[0].querySelector(`.nexus-component[data-id="${id}"]`);
        if (node) {
          if (key === "x") node.style.left = `${component.x}px`;
          if (key === "y") node.style.top = `${component.y}px`;
          if (key === "backgroundColor") node.style.setProperty("--nexus-component-bg", component.backgroundColor);
          if (key === "borderColor") node.style.setProperty("--nexus-component-border", component.borderColor);
          if (key === "borderRadius") node.style.setProperty("--nexus-component-radius", `${component.borderRadius}px`);
          if (key === "opacity") node.style.setProperty("--nexus-component-opacity", `${component.opacity}%`);
          if (key === "fontSize") node.style.setProperty("--nexus-component-font-size", `${component.fontSize}px`);
          if (key === "fontFamily") node.style.setProperty("--nexus-component-font-family", component.fontFamily);
          if (key === "textAlign") node.style.setProperty("--nexus-component-text-align", component.textAlign);
          if (key === "fontWeight") node.style.setProperty("--nexus-component-font-weight", component.fontWeight);
          if (key === "fontStyle") node.style.setProperty("--nexus-component-font-style", component.fontStyle);
          if (key === "textTransform") node.style.setProperty("--nexus-component-text-transform", component.textTransform);
          if (key === "letterSpacing") node.style.setProperty("--nexus-component-letter-spacing", `${component.letterSpacing}px`);
          if (key === "lineHeight") node.style.setProperty("--nexus-component-line-height", component.lineHeight);
          if (key === "headingFontSize") { if (component.headingFontSize) node.style.setProperty("--nexus-component-heading-font-size", `${component.headingFontSize}px`); else node.style.removeProperty("--nexus-component-heading-font-size"); }
          if (key === "headingFontFamily") { if (component.headingFontFamily) node.style.setProperty("--nexus-component-heading-font-family", component.headingFontFamily); else node.style.removeProperty("--nexus-component-heading-font-family"); }
          if (key === "imageFit") node.querySelector(".nexus-asset-image")?.style.setProperty("object-fit", component.imageFit);
          if (key === "imagePosition") node.querySelector(".nexus-asset-image")?.style.setProperty("object-position", component.imagePosition);
          if (key === "imageOpacity") node.querySelector(".nexus-asset-image")?.style.setProperty("opacity", String(component.imageOpacity / 100));
          if (key === "labelPosition") node.dataset.labelPosition = component.labelPosition;
          if (key === "customLabel") { const heading=node.querySelector(".nexus-component-heading"); if(heading) heading.textContent=component.customLabel; }
        }
        const resourceSettings = { label:component.sheetContent1??"PV", icon:component.sheetContent2??"❤️", current:getPath(this.actor.system??{},component.currentPath??"resources.pv.value")??"—", max:getPath(this.actor.system??{},component.maxPath??"resources.pv.max")??"—", color:component.sheetColor??({PV:"#d94b4b",PM:"#3979d8",PE:"#39a86b"})[String(component.sheetCode??component.sheetContent1??"PV").toUpperCase()]??"#d94b4b", trackColor:component.sheetTrackColor??"#080d14", orientation:component.sheetOrientation??"horizontal" };
        if (component.type === "sheet-attribute") {
          const value = getPath(this.actor.system ?? {}, component.dataPath ?? "") ?? 0;
          if (node) { const small=node.querySelector("small"), strong=node.querySelector("strong"); if(small)small.textContent=String(component.text??"Atributo"); if(strong)strong.textContent=String(value); }
        }
        if (component.type === "token") {
          const editorPanel = this._nexusPanelWindows?.get("component")?.panel ?? html[0];
          const tokenRoots = [node?.querySelector(".nexus-token-subcanvas"), editorPanel?.querySelector("[data-token-preview]")].filter(Boolean);
          for (const tokenRoot of tokenRoots) {
            let image = tokenRoot.querySelector(".nexus-token-portrait");
            const frame = tokenRoot.querySelector(".nexus-token-frame");
            const overlay = tokenRoot.querySelector(".nexus-token-overlay");
            const imageSource = getTokenImageSource(this.actor, component, component.dataPath ? resolveNexusBinding(this.actor, component.dataPath).value : "");
            const videoImage = isVideoSource(imageSource);
            if (image && (videoImage !== (image.tagName === "VIDEO"))) {
              const replacement = document.createElement(videoImage ? "video" : "img");
              replacement.className = "nexus-token-portrait";
              if (videoImage) { replacement.autoplay = true; replacement.muted = true; replacement.loop = true; replacement.playsInline = true; }
              image.replaceWith(replacement); image = replacement;
            }
            if (image) { image.src = imageSource; if (image.tagName === "VIDEO") image.load(); }
            if (frame) {
              frame.style.borderColor = component.tokenFrameMode === "media" ? "transparent" : (component.tokenFrameColor ?? "#78b7e8");
              frame.style.borderWidth = `${clamp(Number(component.tokenFrameWidth ?? 3),0,16)}px`;
              frame.replaceChildren();
              if (component.tokenFrameMode === "media" && component.tokenFrameSource) {
                const frameVideo = isVideoSource(component.tokenFrameSource);
                const media = document.createElement(frameVideo ? "video" : "img");
                media.className = "nexus-token-frame-media"; media.src = component.tokenFrameSource;
                if (frameVideo) { media.autoplay = true; media.muted = true; media.loop = true; media.playsInline = true; }
                frame.append(media);
              }
            }
            tokenRoot.dataset.shape = component.tokenShape ?? "circle";
            tokenRoot.style.setProperty("--nexus-token-bg", component.tokenBackgroundColor ?? "#202e3e");
            if (overlay) { overlay.textContent = component.tokenOverlay ?? ""; overlay.hidden = !component.tokenOverlay; }
          }
        }
        if (component.type === "sheet-resource") {
          if (node) {
            updateSheetResourcePreview(node.querySelector(".nexus-sheet-resource-preview"), resourceSettings);
            const label=node.querySelector(".nexus-sheet-resource-label"), icon=node.querySelector(".nexus-sheet-resource-icon");
            const setNode=(target,value)=>{if(!target)return;target.replaceChildren();const text=String(value??"").trim();if(isImageSource(text)){const img=document.createElement("img");img.src=text;img.alt="";target.append(img);}else target.textContent=text;target.hidden=!text;};
            setNode(label,resourceSettings.label);setNode(icon,resourceSettings.icon);
            const resourceRoot=node.querySelector(".nexus-sheet-resource");
            if(resourceRoot){resourceRoot.style.setProperty("--nexus-resource-color",resourceSettings.color);resourceRoot.style.setProperty("--nexus-resource-track-color",resourceSettings.trackColor);resourceRoot.classList.toggle("is-vertical",resourceSettings.orientation==="vertical");}
          }
        }
      } else {
        // Keep the inspector window mounted. A full ActorSheet render replaces its
        // source DOM and can detach the floating editor while the user is typing.
        const liveNode = html[0].querySelector(`.nexus-component[data-id="${id}"]`);
        if (liveNode) {
          liveNode.style.width = `${component.w}px`;
          liveNode.style.height = `${component.h}px`;
          if (component.type === "sheet-resource") {
            const current = getPath(this.actor.system ?? {}, component.currentPath ?? "resources.pv.value") ?? "—";
            const maximum = getPath(this.actor.system ?? {}, component.maxPath ?? "resources.pv.max") ?? "—";
            const previewSettings = { label:component.sheetContent1 ?? "PV", icon:component.sheetContent2 ?? "❤️", current, max:maximum, color:component.sheetColor ?? ({PV:"#d94b4b",PM:"#3979d8",PE:"#39a86b"})[String(component.sheetCode??component.sheetContent1??"PV").toUpperCase()]??"#d94b4b", trackColor:component.sheetTrackColor ?? "#080d14", orientation:component.sheetOrientation ?? "horizontal" };
            updateSheetResourcePreview(liveNode.querySelector(".nexus-sheet-resource-preview"), previewSettings);
          } else if (component.type === "sheet-attribute") {
            const value = getPath(this.actor.system ?? {}, component.dataPath ?? "") ?? 0;
            const small = liveNode.querySelector("small"), strong = liveNode.querySelector("strong");
            if (small) small.textContent = component.text ?? "Atributo";
            if (strong) strong.textContent = String(value);
          } else if (key === "text") {
            const textNode = liveNode.querySelector(".nexus-component-content, .nexus-sheet-element");
            if (textNode && !textNode.querySelector("input,textarea")) textNode.textContent = component.text;
          }
        }
        this._componentEditorTargetId = id;
        this._selectedIds = new Set([id]);
      }
    });
    html.find("[data-group-setting]").on("change", async event => {
      const input = event.currentTarget;
      const groupId = this._selectedGroupId;
      if (!groupId) return;
      const layouts = await this._readLayouts();
      const active = this._activeLayoutId();
      const layout = layouts[active];
      const group = layout?.groups?.find(item => item.id === groupId);
      if (!group) return;
      this._captureHistory();
      const key = input.dataset.groupSetting;
      if (key === "borderRadius") group.borderRadius = clamp(Number(input.value) || 0, 0, 32);
      else if (key === "backgroundColor" || key === "borderColor") group[key] = input.value;
      await this._writeLayouts(layouts, active);
      const groupNode = html[0].querySelector(`.nexus-group-surface[data-group-id="${groupId}"]`);
      const cssKey = key === "backgroundColor" ? "--nexus-group-bg" : key === "borderColor" ? "--nexus-group-border" : "--nexus-group-radius";
      const cssValue = key === "borderRadius" ? `${group.borderRadius}px` : group[key];
      if (groupNode) groupNode.style.setProperty(cssKey, cssValue);
    });
    html.find("[data-component-setting-reset]").on("click", async event => {
      const id = [...(this._selectedIds ?? [])][0]; if (!id) return;
      const key = event.currentTarget.dataset.componentSettingReset;
      const layouts = await this._readLayouts(), active = this._activeLayoutId(), component = layouts[active]?.components?.find(item => item.id === id); if (!component) return;
      this._captureHistory(); delete component[key]; await this._writeLayouts(layouts, active); this.render({ force: true });
    });
    html.find("[data-component-reset]").on("click", async event => {
      const id=[...(this._selectedIds??[])][0]; if(!id)return;
      const kind=event.currentTarget.dataset.componentReset;
      const layouts=await this._readLayouts(), active=this._activeLayoutId(), layout=layouts[active];
      const component=layout?.components?.find(item=>item.id===id); if(!component)return;
      this._captureHistory();
      if(kind==="style") for(const key of ["backgroundColor","borderColor","borderRadius","opacity"]) delete component[key];
      if(kind==="typography") { delete component.fontSize; delete component.fontFamily; delete component.headingFontSize; delete component.headingFontFamily; delete component.contentStyle; delete component.headingStyle; delete component.labelPosition; }
      if(kind==="token") { delete component.tokenImage; delete component.tokenFallback; }
      if(kind==="resource") Object.assign(component,{sheetContent1:component.sheetCode??"PV",sheetContent2:({PV:"❤️",PM:"💧",PE:"⚡"})[String(component.sheetCode??"PV").toUpperCase()]??"✦",sheetColor:({PV:"#d94b4b",PM:"#3979d8",PE:"#39a86b",REC:"#8b9bad"})[String(component.sheetCode??"PV").toUpperCase()]??"#8b9bad",sheetTrackColor:"#080d14",sheetOrientation:"horizontal",previewCurrent:32,previewMax:40});
      if(kind==="attribute") { Object.assign(component,{text:"Corpo",dataPath:"attributes.body",attributePreset:"body"}); }
      await this._writeLayouts(layouts,active); this._currentLayout = layout;
      const componentNode = this.element?.querySelector(`.nexus-component[data-id="${CSS.escape(component.id)}"]`);
      if (componentNode && kind === "typography") {
        componentNode.style.setProperty("--nexus-component-font-size", `${layout.fontSize ?? 13}px`);
        componentNode.style.setProperty("--nexus-component-font-family", layout.fontFamily ?? "Inter");
        componentNode.style.removeProperty("--nexus-component-heading-font-size");
        componentNode.style.removeProperty("--nexus-component-heading-font-family");
        componentNode.dataset.labelPosition = "top-left";
        this._applyComponentTextStyles(componentNode, component);
      } else if (componentNode) this.render({ force: true });
      const inspector = [...(this._nexusPanelWindows?.values?.() ?? [])].map(instance => instance.element).find(node => node?.querySelector(".nexus-component-inspector"))?.querySelector(".nexus-component-inspector");
      if (inspector && kind === "typography") {
        const fontSize = inspector.querySelector('[data-component-setting="fontSize"]'); if (fontSize) fontSize.value = layout.fontSize ?? 13;
        const fontFamily = inspector.querySelector('[data-component-setting="fontFamily"]'); if (fontFamily) fontFamily.value = layout.fontFamily ?? "Inter";
        const labelPosition = inspector.querySelector('[data-component-setting="labelPosition"]'); if (labelPosition) labelPosition.value = "top-left";
      }
    });
    html.find("[data-group-reset]").on("click", async () => {
      const groupId=this._selectedGroupId;if(!groupId)return;
      const layouts=await this._readLayouts(),active=this._activeLayoutId(),group=layouts[active]?.groups?.find(item=>item.id===groupId);if(!group)return;
      this._captureHistory(); delete group.backgroundColor; delete group.borderColor; delete group.borderRadius;
      await this._writeLayouts(layouts,active); this.render({force:true});
    });
    const appWindow = html[0].closest(".application, .window-app");
    if (appWindow) { appWindow.classList.add("nexus-window"); appWindow.style.setProperty("--nexus-window-accent", this._currentLayout?.accentColor ?? "#52647b"); }
    this._activateCanvas(html);
    this._mountFloatingUI(html);
  }

  async _setMode(mode) { this._mode = mode; this.render({ force: true }); }

  _refreshBoundComponents() {
    const root = this.element?.querySelector?.(".nexus-sheet") ?? this.element;
    if (!root) return;
    const writeText = (card, selector, value) => {
      const element = card.querySelector(selector);
      if (element && element !== document.activeElement) element.textContent = String(value ?? "—");
    };
    const writeInput = (card, selector, value) => {
      const element = card.querySelector(selector);
      if (element && element !== document.activeElement) element.value = String(value ?? "");
    };
    for (const component of this._currentLayout?.components ?? []) {
      const card = root.querySelector(`.nexus-component[data-id="${CSS.escape(component.id)}"]`);
      if (!card) continue;
      const context = this._componentContext(component);
      if (!context) continue;
      const current = context.value ?? "—", maximum = context.max ?? "—";
      if (["resource", "resource-bar", "resource-ring", "resource-meter", "asset-meter"].includes(context.kind)) {
        const fill = card.querySelector(".nexus-resource-bar-fill, .nexus-asset-meter-fill");
        if (fill) fill.style.width = `${context.percent ?? 0}%`;
        const ring = card.querySelector(".nexus-resource-ring");
        if (ring) ring.style.setProperty("--nexus-resource-percent", `${context.percent ?? 0}%`);
        writeText(card, ".nexus-resource-values > strong:first-child, .nexus-resource-ring-values > strong:first-child", current);
        writeText(card, ".nexus-resource-values > strong:last-child, .nexus-resource-ring-values > strong:last-child", maximum);
        writeText(card, ".nexus-resource-bar-values > strong", current);
        writeText(card, ".nexus-resource-bar-values > span", `/ ${maximum}`);
        writeInput(card, ".nexus-resource-values input:first-of-type, .nexus-resource-ring-values input:first-of-type", current);
        writeInput(card, ".nexus-resource-values input:last-of-type, .nexus-resource-ring-values input:last-of-type", maximum);
        writeInput(card, ".nexus-resource-bar-values input:first-of-type", current);
        writeInput(card, ".nexus-resource-bar-values input:last-of-type", maximum);
        writeInput(card, "[data-resource-slider]", current);
      }
      if (context.kind === "sheet-element" && context.sheetVariant === "resource") {
        const preview = card.querySelector(".nexus-sheet-resource-preview");
        updateSheetResourcePreview(preview, {
          label: component.sheetContent1 ?? "PV", icon: component.sheetContent2 ?? "❤️",
          current, max: maximum, color: component.sheetColor ?? "#d94b4b",
          trackColor: component.sheetTrackColor ?? "#080d14", orientation: component.sheetOrientation ?? "horizontal"
        });
        const values = card.querySelector(".nexus-sheet-resource-values");
        if (values?.querySelector("input")) {
          writeInput(values, "input:first-of-type", current);
          writeInput(values, "input:last-of-type", maximum);
        } else if (values) values.textContent = `${current} / ${maximum}`;
      } else if (context.kind === "sheet-element" && context.sheetVariant === "attribute") {
        writeText(card, ".nexus-sheet-element small", component.text ?? "Atributo");
        writeText(card, ".nexus-sheet-element strong", current);
      } else if (context.kind === "sheet-element" && context.sheetVariant === "derived") {
        writeText(card, ".nexus-sheet-element small", component.sheetCode ?? "");
        writeText(card, ".nexus-sheet-element strong", current);
      } else if (context.kind === "sheet-element" && context.sheetVariant === "skill") {
        writeText(card, ".nexus-sheet-element strong", component.text ?? "");
        writeText(card, ".nexus-sheet-element b", current);
      } else if (context.kind === "asset-value") writeText(card, ".nexus-asset-value", current);
      else if (context.kind === "asset-text") writeText(card, ".nexus-asset-text", context.path ? current : component.text);
      else if (context.kind === "custom") writeText(card, ".nexus-custom-card-value", current);
      else if (["number", "name", "text"].includes(context.kind)) writeText(card, ".nexus-component-content strong", current);
      if (context.kind === "sheet-element" && !["resource", "attribute", "derived", "skill"].includes(context.sheetVariant)) {
        writeText(card, ".nexus-sheet-element strong", current);
      }
      if (context.actionType === "proficiency") {
         card.querySelectorAll("[data-proficiency-level]").forEach(button => { const active = Number(button.dataset.proficiencyLevel) === context.proficiencyLevel; button.classList.toggle("is-active", active); button.setAttribute("aria-pressed", String(active)); });
       }
       if (context.kind === "token" && isMediaSource(current)) {
        const image = card.querySelector(".nexus-token-portrait");
        if (image && image !== document.activeElement && image.getAttribute("src") !== current) image.src = current;
      }
      if (context.kind === "asset-image" && isMediaSource(current)) {
        const image = card.querySelector(".nexus-asset-image");
        if (image && image !== document.activeElement && image.src !== current) image.src = current;
      }
    }
  }

  async _updateSystemValue(input) {
    const path = input.dataset.systemPath, value = ["number", "range"].includes(input.type) ? Number(input.value) : input.value;
    if (!path) return;
    if (path === "name") { await this.actor.update({ name: value }); this._refreshBoundComponents(); return; }
    if (path === "img") { await this.actor.update({ img: value });
      const roots = [this.element, this._nexusPanelWindows?.get("component")?.panel].filter(Boolean);
      for (const root of roots) root.querySelectorAll?.("[data-actor-portrait-preview]").forEach(image => { image.src = String(value ?? ""); });
      this._refreshBoundComponents(); return; }
    const alias = resolveAliasPath(this.actor, path);
    if (alias.alias && !alias.path) {
      const customData = clone(getCustomAliasData(this.actor));
      foundry.utils.setProperty(customData, [alias.alias.key, alias.suffix === "exib" ? "exibicao" : alias.suffix].filter(Boolean).join("."), value);
      await this.actor.setFlag("nexus", "customData", customData);
      this._refreshBoundComponents();
      return;
    }
    const writePath = alias.alias ? alias.path : path;
    if (writePath === "img") return this.actor.update({ img: value });
    await this.actor.update({ [`system.${writePath}`]: value });
    this._refreshBoundComponents();

  }
  _syncTextToolbar(inspector, component) {
    if (!inspector) return;
    const target = this._textStyleTarget === "heading" ? "heading" : "content";
    const style = component?.[target + "Style"] ?? {};
    inspector.querySelectorAll("[data-text-style-target]").forEach(button => button.classList.toggle("active", button.dataset.textStyleTarget === target));
    const commands = inspector.querySelectorAll("[data-text-style-command]");
    for (const button of commands) {
      const command = button.dataset.textStyleCommand;
      let active = false;
      if (command === "bold") active = Number(style.fontWeight ?? (target === "heading" ? component?.headingFontWeight : component?.fontWeight) ?? 400) >= 600;
      else if (command === "italic") active = (style.fontStyle ?? component?.fontStyle) === "italic";
      else if (command === "underline") active = (style.textDecoration ?? "none") === "underline";
      else if (command.startsWith("align-")) active = (style.textAlign ?? "left") === command.slice(6);
      else if (command === "transform") active = (style.textTransform ?? "none") !== "none";
      button.setAttribute("aria-pressed", String(active));
      button.classList.toggle("is-active", active);
    }
    const size = inspector.querySelector("[data-text-style-size]");
    if (size) size.value = style.fontSize ?? (target === "heading" ? component?.headingFontSize : component?.fontSize) ?? this._currentLayout?.fontSize ?? 13;
    const color = inspector.querySelector("[data-text-style-color]");
    if (color) color.value = style.color ?? "#e7edf5";
    for (const field of inspector.querySelectorAll("[data-text-style-field]")) field.value = style[field.dataset.textStyleField] ?? (field.dataset.textStyleField === "lineHeight" ? 1.35 : 0);
    inspector.querySelector("[data-text-style-font-menu]")?.setAttribute("hidden", "");
  }

  _applyComponentTextStyles(node, component) {
    if (!node || !component) return;
    const apply = (element, style, fallback = {}) => {
      if (!element) return;
      const values = {
        "font-size": style.fontSize ?? fallback.fontSize,
        "font-family": style.fontFamily ?? fallback.fontFamily,
        color: style.color,
        "text-align": style.textAlign,
        "font-weight": style.fontWeight,
        "font-style": style.fontStyle,
        "text-decoration": style.textDecoration,
        "text-transform": style.textTransform,
        "letter-spacing": style.letterSpacing,
        "line-height": style.lineHeight
      };
      for (const [property, value] of Object.entries(values)) element.style.setProperty(property, value === undefined || value === null || value === "" ? "" : (property === "font-size" || property === "letter-spacing" ? value + "px" : String(value)));
    };
    apply(node.querySelector(".nexus-component-content"), this._normalizeTextStyle(component.contentStyle), { fontSize: component.fontSize, fontFamily: component.fontFamily });
    apply(node.querySelector(".nexus-component-heading"), this._normalizeTextStyle(component.headingStyle), { fontSize: component.headingFontSize, fontFamily: component.headingFontFamily });
  }

  async _setComponentTextStyle(componentId, target, key, value) {
    if (!["content", "heading"].includes(target)) return;
    const allowed = ["fontSize","fontFamily","color","textAlign","fontWeight","fontStyle","textDecoration","textTransform","letterSpacing","lineHeight"];
    if (!allowed.includes(key)) return;
    const layouts = await this._readLayouts(), active = this._activeLayoutId(), layout = layouts[active];
    const component = layout?.components?.find(item => item.id === componentId);
    if (!component) return;
    let normalized = value;
    if (key === "fontSize") normalized = clamp(Number(value) || 13, 7, 48);
    if (key === "fontFamily" && !["Inter","Arial","Georgia","Verdana","monospace"].includes(value)) return;
    if (key === "color" && !/^#(?:[0-9a-f]{3}|[0-9a-f]{6}|[0-9a-f]{8})$/i.test(String(value))) return;
    if (key === "textAlign" && !["left","center","right","justify"].includes(value)) return;
    if (key === "fontWeight" && !["400","500","600","700","800"].includes(String(value))) return;
    if (key === "fontStyle" && !["normal","italic"].includes(value)) return;
    if (key === "textDecoration" && !["none","underline"].includes(value)) return;
    if (key === "textTransform" && !["none","uppercase","lowercase","capitalize"].includes(value)) return;
    if (key === "letterSpacing") normalized = clamp(Number(value) || 0, -2, 12);
    if (key === "lineHeight") normalized = clamp(Number(value) || 1.35, 0.8, 2.4);
    this._captureHistory();
    component[target + "Style"] ??= {};
    component[target + "Style"][key] = normalized;
    this._currentLayout = layout;
    await this._writeLayouts(layouts, active);
    const node = this.element?.querySelector?.(".nexus-component[data-id=\"" + CSS.escape(componentId) + "\"]");
    this._applyComponentTextStyles(node, component);
    const inspector = this._nexusPanelWindows?.get("component")?.panel?.querySelector?.(".nexus-component-inspector") ?? this.element?.querySelector?.(".nexus-component-inspector");
    this._syncTextToolbar(inspector, component);
  }

  async _setProficiencyLevel(componentId, level) {
    const nextLevel = clamp(Math.round(Number(level) || 0), 0, 3);
    const layouts = await this._readLayouts(), active = this._activeLayoutId(), component = layouts[active]?.components?.find(item => item.id === componentId);
    if (!component || component.actionType !== "proficiency") return;
    if (component.actionPath) {
      const binding = resolveNexusBinding(this.actor, component.actionPath);
      if (binding.value !== undefined && binding.value !== null && !Number.isFinite(Number(binding.value))) { ui.notifications?.warn?.("A propriedade vinculada ao marcador precisa conter um número."); return; }
    }
    this._captureHistory();
    component.proficiencyLevel = nextLevel;
    await this._writeLayouts(layouts, active);
    if (component.actionPath) await this._updateSystemValue({ dataset: { systemPath: component.actionPath }, type: "number", value: String(nextLevel) });
    else {
      const card = this.element?.querySelector?.(".nexus-component[data-id=\"" + CSS.escape(componentId) + "\"]");
      card?.querySelectorAll("[data-proficiency-level]").forEach(button => { const active = Number(button.dataset.proficiencyLevel) === nextLevel; button.classList.toggle("is-active", active); button.setAttribute("aria-pressed", String(active)); });
    }
  }
  async _rollComponent(componentId) {
    const layouts = await this._readLayouts();
    const active = this._activeLayoutId();
    const component = layouts[active]?.components?.find(item => item.id === componentId);
    if (!component || component.actionType !== "roll") return;

    let formula = String(component.rollFormula ?? "").trim();
    const boundPath = String(component.dataPath ?? "").replace(/^actor\./, "").replace(/^system\./, "");
    if (!formula && boundPath.endsWith(".name")) {
      const sibling = resolveNexusBinding(this.actor, boundPath.slice(0, -5) + ".roll");
      formula = String(sibling.value ?? "").trim();
    }
    if (!formula) {
      globalThis.ui?.notifications?.warn?.("Configure uma fórmula de rolagem no componente ou na propriedade vinculada.");
      return;
    }
    if (formula.length > 120) {
      globalThis.ui?.notifications?.warn?.("A fórmula de rolagem excede o limite de 120 caracteres.");
      return;
    }
    try {
      const roll = new Roll(formula, this.actor.getRollData?.() ?? {});
      await roll.evaluate({ async: true });
      await roll.toMessage({
        speaker: ChatMessage.getSpeaker({ actor: this.actor }),
        flavor: component.customLabel || component.text || "Rolagem NEXUS"
      });
    } catch (error) {
      console.error("NEXUS | Falha na rolagem do componente", error);
      globalThis.ui?.notifications?.error?.("Não foi possível executar a rolagem. Verifique a fórmula configurada.");
    }
  }
  async _adjustResource(path, delta) {
    const alias = resolveAliasPath(this.actor, path);
    const resource = alias.alias ? resolveNexusBinding(this.actor, path).value : getPath(this.actor.system, path);
    const max = alias.alias ? resolveNexusBinding(this.actor, `${path}.max`).value : resource?.max;
    const current = alias.alias ? resolveNexusBinding(this.actor, `${path}.value`).value : resource?.value;
    const value = Math.max(0, Math.min(Number(max ?? Infinity), Number(current ?? 0) + delta));
    if (alias.alias && !alias.path) {
      const customData = clone(getCustomAliasData(this.actor));
      foundry.utils.setProperty(customData, `${alias.alias.key}.value`, value);
      await this.actor.setFlag("nexus", "customData", customData);
      this._refreshBoundComponents();
      return true;
    }
    const target = alias.alias ? alias.path : path;
    return this.actor.update({ [`system.${target}.value`]: value });
  }
  async _readLayouts() {
    const saved = this.actor.getFlag("nexus", "layouts");
    let entries = [];

    // Compatibilidade: versões antigas podem ter salvo um único layout diretamente,
    // uma lista de layouts ou o formato atual indexado por ID.
    if (Array.isArray(saved)) {
      entries = saved.map((layout, index) => [String(layout?.id || (index === 0 ? "principal" : `layout-${index + 1}`)), layout]);
    } else if (saved && typeof saved === "object") {
      const isSingleLayout = (saved.components && typeof saved.components === "object") ||
        (saved.cards && typeof saved.cards === "object") || (saved.elements && typeof saved.elements === "object") ||
        Object.hasOwn(saved, "width") || Object.hasOwn(saved, "height");
      const collection = !isSingleLayout && saved.layouts && typeof saved.layouts === "object" ? saved.layouts : saved;
      entries = isSingleLayout
        ? [[String(saved.id || "principal"), saved]]
        : Object.entries(collection);
    }

    const layouts = {};
    for (const [rawId, rawLayout] of entries) {
      if (!rawLayout || typeof rawLayout !== "object" || Array.isArray(rawLayout)) continue;
      const id = String(rawId || rawLayout.id || "principal");
      const layout = clone(rawLayout);
      if (!Array.isArray(layout.components)) {
        const legacyComponents = layout.components && typeof layout.components === "object" ? Object.values(layout.components) :
          Array.isArray(layout.cards) ? layout.cards :
          (layout.cards && typeof layout.cards === "object") ? Object.values(layout.cards) :
          Array.isArray(layout.elements) ? layout.elements :
          (layout.elements && typeof layout.elements === "object") ? Object.values(layout.elements) : [];
        layout.components = legacyComponents.map((component, index) => {
          if (!component || typeof component !== "object") return null;
          const migrated = { ...component };
          migrated.id ??= `cmp-legacy-${index + 1}`;
          migrated.type ??= migrated.componentType ?? migrated.kind;
          return migrated;
        }).filter(Boolean);
      }
      if (!Array.isArray(layout.groups)) layout.groups = layout.groups && typeof layout.groups === "object" ? Object.values(layout.groups) : [];
      if (!Array.isArray(layout.links)) layout.links = layout.links && typeof layout.links === "object" ? Object.values(layout.links) : [];
      layout.id = id;
      layouts[id] = this._normalizeLayout(layout);
    }

    if (!Object.keys(layouts).length) layouts.principal = clone(DEFAULT_LAYOUT);
    if (!layouts.principal) layouts.principal = clone(DEFAULT_LAYOUT);
    layoutReadSnapshots.set(layouts, {
      layouts: clone(layouts),
      active: String(this.actor.getFlag("nexus", "activeLayout") ?? "principal")
    });
    return layouts;
  }

  async _writeLayouts(layouts, active) {
    const queueKey = this.actor.uuid ?? this.actor;
    const previous = layoutWriteQueues.get(queueKey) ?? Promise.resolve();
    const operation = previous.catch(() => {}).then(async () => {
      const snapshot = layoutReadSnapshots.get(layouts);
      // Re-read inside the queue, after earlier writes have completed. A
      // three-way merge keeps unrelated edits made since this snapshot.
      const latest = await this._readLayouts();
      const merged = snapshot
        ? mergeLayoutSnapshots(snapshot.layouts, layouts, latest)
        : clone(layouts);
      const normalized = {};
      for (const [rawId, rawLayout] of Object.entries(merged ?? {})) {
        if (!rawLayout || typeof rawLayout !== "object") continue;
        const id = String(rawId || rawLayout.id || "principal");
        const layout = clone(rawLayout);
        layout.id = id;
        normalized[id] = this._normalizeLayout(layout);
      }
      if (!normalized.principal) normalized.principal = clone(DEFAULT_LAYOUT);

      const storedActive = String(this.actor.getFlag("nexus", "activeLayout") ?? "principal");
      const requestedActiveChanged = !!snapshot && String(active ?? snapshot.active) !== snapshot.active;
      const nextActive = requestedActiveChanged && active && normalized[active]
        ? active
        : (normalized[storedActive] ? storedActive : "principal");

      // Forced replacement ensures deleted layout keys are actually removed.
      await this.actor.update({
        "flags.nexus.layouts": _replace(normalized),
        "flags.nexus.activeLayout": nextActive
      });
      layoutReadSnapshots.set(normalized, { layouts: clone(normalized), active: nextActive });
      return normalized;
    });
    layoutWriteQueues.set(queueKey, operation);
    try {
      return await operation;
    } finally {
      if (layoutWriteQueues.get(queueKey) === operation) layoutWriteQueues.delete(queueKey);
    }
  }

  _activeLayoutId() { return this.actor.getFlag("nexus", "activeLayout") ?? "principal"; }

  _findFreePosition(layout, width, height) {
    const grid = Math.max(5, Number(layout.gridSize) || 20);
    const gap = Math.max(4, Math.round(grid / 4));
    const maxX = Math.max(0, layout.width - width), maxY = Math.max(0, layout.height - height);
    const snap = value => layout.snapEnabled ? Math.round(value / grid) * grid : Math.round(value);
    const overlaps = (x, y) => layout.components.some(c =>
      x < c.x + c.w + gap && x + width + gap > c.x &&
      y < c.y + c.h + gap && y + height + gap > c.y
    );
    const center = { x: clamp(snap((layout.width - width) / 2), 0, maxX), y: clamp(snap((layout.height - height) / 2), 0, maxY) };
    if (!overlaps(center.x, center.y)) return center;

    // Busca em espiral a partir do centro; evita lançar novos cartões fora da área útil.
    const step = grid;
    const maxRadius = Math.ceil(Math.max(layout.width, layout.height) / step);
    for (let radius = 1; radius <= maxRadius; radius++) {
      const candidates = [];
      for (let dx = -radius; dx <= radius; dx++) {
        candidates.push({ x: center.x + dx * step, y: center.y - radius * step });
        candidates.push({ x: center.x + dx * step, y: center.y + radius * step });
      }
      for (let dy = -radius + 1; dy < radius; dy++) {
        candidates.push({ x: center.x - radius * step, y: center.y + dy * step });
        candidates.push({ x: center.x + radius * step, y: center.y + dy * step });
      }
      candidates.sort((a, b) => (a.x + width / 2 - layout.width / 2) ** 2 + (a.y + height / 2 - layout.height / 2) ** 2 - ((b.x + width / 2 - layout.width / 2) ** 2 + (b.y + height / 2 - layout.height / 2) ** 2));
      for (const candidate of candidates) {
        const x = clamp(candidate.x, 0, maxX), y = clamp(candidate.y, 0, maxY);
        if (!overlaps(x, y)) return { x, y };
      }
    }
    // Se não houver espaço livre, centraliza mesmo assim e deixa o usuário reorganizar.
    return center;
  }
  _captureLibraryViewport() {
    const instance = this._nexusPanelWindows?.get("library");
    const root = instance?.element;
    if (!root) return null;
    const selectors = [".window-content", ".application-content", ".nexus-library-main", ".nexus-library-assets", ".nexus-library-details"];
    const state = {};
    for (const selector of selectors) {
      const node = root.matches?.(selector) ? root : root.querySelector(selector);
      if (node) state[selector] = { top: node.scrollTop, left: node.scrollLeft };
    }
    return Object.keys(state).length ? state : null;
  }

  _restoreLibraryViewport(state = this._pendingLibraryViewport) {
    if (!state) return;
    const root = this._nexusPanelWindows?.get("library")?.element;
    if (!root) return;
    for (const [selector, position] of Object.entries(state)) {
      const node = root.matches?.(selector) ? root : root.querySelector(selector);
      if (!node) continue;
      node.scrollTop = position.top;
      node.scrollLeft = position.left;
    }
    this._pendingLibraryViewport = null;
  }

  async _addComponent(type, options = {}) {
    if (!COMPONENTS[type]) throw new Error(`Tipo de componente não registrado: ${String(type)}`);
    this._pendingLibraryViewport = this._captureLibraryViewport();
    const layouts = await this._readLayouts(), requestedActive = this._activeLayoutId(), active = layouts[requestedActive] ? requestedActive : "principal", layout = this._normalizeLayout(clone(layouts[active] ?? DEFAULT_LAYOUT)), d = COMPONENTS[type];
    layout.components = Array.isArray(layout.components) ? layout.components : [];
    this._captureHistory();
    const verticalResource = type === "sheet-resource" && options.template?.sheetOrientation === "vertical";
    const baseW = clamp(Number(options.template?.w) || (verticalResource ? 100 : Number(d.w)) || 160, 80, Math.min(600, layout.width));
    const baseH = clamp(Number(options.template?.h) || (verticalResource ? 190 : Number(d.h)) || 90, 48, Math.min(500, layout.height));
    const pos = this._findFreePosition(layout, baseW, baseH);
    const id = `cmp-${foundry.utils.randomID(8)}`;
    const component = { id, type, ...pos, w: baseW, h: baseH, z: 0, stackOrder: Math.max(-1, ...layout.components.map(c => Number(c.stackOrder) || 0)) + 1 };
    if (type === "token") Object.assign(component, { dataPath: options.template?.dataPath ?? "identity.token.img", tokenFrameMode: "solid", tokenFrameSource: "", tokenFrameColor: "#78b7e8", tokenFrameWidth: 3, tokenShape: "circle", tokenOverlay: "", tokenBackgroundColor: "#202e3e" });
    if (type === "resource-meter") { component.binding = ""; component.format = ["bar", "ring", "classic"].includes(options.format) ? options.format : "bar"; component.resourceLabel = "Medidor"; }
    if (type === "sheet-resource") {
      const resourceCode = String(options.template?.sheetCode ?? "PV").toUpperCase();
      component.sheetColor = options.template?.sheetColor ?? (resourceCode === "PM" ? "#3979d8" : resourceCode === "PE" ? "#39a86b" : "#d94b4b");
      component.currentPath = options.template?.currentPath ?? (resourceCode === "REC" ? "" : "resources.pv.value");
      component.maxPath = options.template?.maxPath ?? (resourceCode === "REC" ? "" : "resources.pv.max");
      component.dataPath = options.template?.dataPath ?? component.currentPath.replace(/\.value$/, "");
      component.sheetVariant = "resource";
      component.sheetCode = options.template?.sheetCode ?? "PV";
      component.sheetContent1 = options.template?.sheetContent1 ?? component.sheetCode;
      component.sheetContent2 = options.template?.sheetContent2 ?? ({PV:"❤️",PM:"💧",PE:"⚡"})[String(component.sheetCode).toUpperCase()] ?? "❤️";
      component.text = options.template?.text ?? "Pontos de Vida";
      component.sheetHint = "Valor atual / valor máximo";
    } else if (type.startsWith("sheet-")) {
      component.dataPath = options.template?.dataPath ?? (type === "sheet-name" ? "name" : (d.path ?? ""));
      component.sheetVariant = d.variant;
      component.sheetCode = ({ "sheet-derived": "DEF", "sheet-attribute": "FOR", "sheet-skill": "FOR", "sheet-action-attack": "ATAQUES", "sheet-action-general": "AÇÕES", "sheet-action-reaction": "REAÇÕES" })[type] ?? "";
      component.text = ({ "sheet-name": "Nome do personagem", "sheet-lineage": "Linhagem", "sheet-physiognomy": "Fisionomia", "sheet-legacy": "Legado", "sheet-section": "Nova seção", "sheet-skill": "Nova perícia", "sheet-skill-group": "Perícias" })[type] ?? (type === "sheet-level" ? "" : d.label);
      component.sheetHint = "";
    }
    if (type === "text-field") component.localValue = "";
    if (type.startsWith("asset-")) {
      component.dataPath = "";
      if (["asset-field", "asset-notes", "text-field"].includes(type)) component.localValue = "";
      if (type === "asset-text") component.text = "Novo texto";
      if (type === "asset-field") component.placeholder = "Digite aqui…";
      if (type === "asset-meter") component.format = "bar";
      if (type === "asset-table") { component.rows = 3; component.columns = 3; }
      if (type === "asset-notes") component.placeholder = "Escreva suas anotações…";
    }
    const templateKeys = ["customLabel","binding","customBinding","dataPath","text","localValue","placeholder","rows","columns","cells","resourceLabel","backgroundColor","borderColor","borderRadius","opacity","sheetVariant","sheetCode","sheetHint","currentPath","maxPath","sheetLabel","sheetIcon","sheetContent1","sheetContent2","sheetColor","sheetTrackColor","sheetOrientation","previewCurrent","previewMax","attributePreset","tokenImage","headingFontSize","headingFontFamily","fontSize","fontFamily","textAlign","fontWeight","fontStyle","textTransform","letterSpacing","lineHeight","labelPosition","showLabel","contentStyle","headingStyle","actionType","rollFormula","actionPath","proficiencyLevel","proficiencyLabels","imageFit","imagePosition","imageOpacity","tokenFrameMode","tokenFrameSource","tokenFrameColor","tokenFrameWidth","tokenShape","tokenOverlay","tokenBackgroundColor","layerIcon","layerImage"];
    for (const key of templateKeys) if (Object.hasOwn(options.template ?? {}, key)) component[key] = clone(options.template[key]);
    layout.components.push(component);
    layouts[active] = layout; this._selectedIds = new Set([id]); this._selectedGroupId = null;
    await this._writeLayouts(layouts, active);
    await this.render({ force: true });
    return id;
  }
  async _saveSelectedLibraryComponent() {
    const ids = [...(this._selectedIds ?? [])];
    if (ids.length !== 1) {
      ui.notifications?.info?.("Selecione exatamente um componente no Canvas para salvá-lo.");
      return;
    }
    const layouts = await this._readLayouts(), layout = layouts[this._activeLayoutId()];
    const component = layout?.components?.find(item => item.id === ids[0]);
    if (!component || !COMPONENTS[component.type]) return;
    const label = String(component.customLabel || COMPONENTS[component.type].label || "Componente").trim().slice(0, 48);
    const keys = ["customLabel","binding","customBinding","dataPath","text","localValue","placeholder","rows","columns","cells","resourceLabel","format","w","h","backgroundColor","borderColor","borderRadius","opacity","sheetVariant","sheetCode","sheetHint","currentPath","maxPath","sheetLabel","sheetIcon","sheetContent1","sheetContent2","sheetColor","sheetTrackColor","sheetOrientation","previewCurrent","previewMax","tokenImage","headingFontSize","headingFontFamily","fontSize","fontFamily","textAlign","fontWeight","fontStyle","textTransform","letterSpacing","lineHeight","labelPosition","showLabel","contentStyle","headingStyle","actionType","rollFormula","actionPath","proficiencyLevel","proficiencyLabels","imageFit","imagePosition","imageOpacity","tokenFrameMode","tokenFrameSource","tokenFrameColor","tokenFrameWidth","tokenShape","tokenOverlay","tokenBackgroundColor","layerIcon","layerImage"];
    const settings = {};
    for (const key of keys) if (component[key] !== undefined) settings[key] = clone(component[key]);
    const saved = game.user?.getFlag?.("nexus", "libraryComponents") ?? [];
    const next = [...saved, { id: foundry.utils.randomID(10), label, type: component.type, settings }];
    await game.user.setFlag("nexus", "libraryComponents", next);
    ui.notifications?.info?.(`“${label}” foi salvo em Meus Componentes.`);
    this.render({ force: true });
  }

  async _addSavedLibraryComponent(id) {
    const saved = game.user?.getFlag?.("nexus", "libraryComponents") ?? [];
    const item = saved.find(entry => entry.id === id);
    if (!item || !COMPONENTS[item.type]) return;
    await this._addComponent(item.type, { format: item.settings?.format, template: item.settings });
  }

  async _deleteSavedLibraryComponent(id) {
    if (!id) return;
    const saved = game.user?.getFlag?.("nexus", "libraryComponents") ?? [];
    const next = saved.filter(item => item.id !== id);
    if (next.length === saved.length) return;
    await game.user.setFlag("nexus", "libraryComponents", next);
    this.render({ force: true });
  }

  async _addComposition(key) {
    const composition = NEXUS_LIBRARY_CATALOG.compositions?.find(item => item.id === key);
    if (!composition) return;
    const layouts = await this._readLayouts(), active = this._activeLayoutId(), layout = layouts[active] ?? clone(DEFAULT_LAYOUT);
    const items = composition.components.map(item => ({ ...item, definition: COMPONENTS[item.type] })).filter(item => item.definition);
    if (!items.length) return;
    this._captureHistory();
    const totalWidth = Math.max(...items.map(item => (item.x ?? 0) + (item.w ?? item.definition.w)));
    const totalHeight = Math.max(...items.map(item => (item.y ?? 0) + (item.h ?? item.definition.h)));
    const origin = this._findFreePosition(layout, Math.min(totalWidth, layout.width), Math.min(totalHeight, layout.height));
    const ids = [];
    for (const item of items) {
      const definition = item.definition;
      const width = clamp(Number(item.w) || definition.w, 80, Math.min(600, layout.width));
      const height = clamp(Number(item.h) || definition.h, 48, Math.min(500, layout.height));
      const id = `cmp-${foundry.utils.randomID(8)}`;
      const component = {
        id, type: item.type, x: clamp(origin.x + (item.x ?? 0), 0, layout.width - width),
        y: clamp(origin.y + (item.y ?? 0), 0, layout.height - height),
        w: width, h: height, z: 0,
        stackOrder: Math.max(-1, ...layout.components.map(existing => Number(existing.stackOrder) || 0)) + 1,
        ...(item.type === "asset-text" ? { text: item.text ?? definition.label } : {}),
        ...(item.type === "asset-notes" ? { placeholder: "Escreva suas anotações…" } : {}),
        ...(item.type === "asset-meter" ? { format: "bar", dataPath: "" } : {})
      };
      layout.components.push(component); ids.push(id);
    }
    if (ids.length > 1) {
      layout.groups ??= [];
      const members = layout.components.filter(component => ids.includes(component.id));
      const left = Math.min(...members.map(component => component.x));
      const top = Math.min(...members.map(component => component.y));
      const right = Math.max(...members.map(component => component.x + component.w));
      const bottom = Math.max(...members.map(component => component.y + component.h));
      layout.groups.push({ id: `grp-${foundry.utils.randomID(8)}`, name: composition.label, componentIds: ids, x: left, y: top, w: right-left, h: bottom-top, z: 0 });
    }
    layouts[active] = layout;
    this._selectedIds = new Set(ids); this._selectedGroupId = null;
    await this._writeLayouts(layouts, active); this.render({ force: true });
  }


  async _deleteComponents(ids) {
    const requested = new Set((ids ?? []).filter(Boolean)); if (!requested.size) return;
    const layouts = await this._readLayouts(), active = this._activeLayoutId(), layout = layouts[active]; if (!layout) return;
    const valid = new Set(layout.components.filter(component => requested.has(component.id)).map(component => component.id));
    if (!valid.size) return;
    if (valid.size > 1) {
      const confirmed = await foundry.applications.api.DialogV2.confirm({
        window: { title: "Excluir componentes" },
        content: `<p>Excluir os ${valid.size} componentes selecionados? Você poderá desfazer a ação com Ctrl+Z.</p>`,
        yes: { label: "Excluir" }, no: { label: "Cancelar" }, rejectClose: false
      });
      if (!confirmed) return;
    }
    this._captureHistory();
    layout.components = layout.components.filter(component => !valid.has(component.id));
    layout.groups = (layout.groups ?? []).map(group => ({ ...group, componentIds: (group.componentIds ?? []).filter(id => !valid.has(id)) })).filter(group => group.componentIds.length >= 2);
    layout.links = (layout.links ?? []).map(link => ({ ...link, members: (link.members ?? []).filter(id => !valid.has(id)) })).filter(link => link.members.length >= 2);
    await this._writeLayouts(layouts, active);
    this._selectedIds = new Set(); this._selectedGroupId = null; this._componentEditorTargetId = null;
    this.render({ force: true });
  }
  async _duplicateComponents(ids) {
    const valid = new Set((ids ?? []).filter(Boolean)); if (!valid.size) return;
    const layouts = await this._readLayouts(), active = this._activeLayoutId(), layout = layouts[active]; if (!layout) return;
    this._captureHistory();
    const sources = layout.components.filter(c => valid.has(c.id));
    layout.groups ??= [];
    const idMap = new Map(sources.map(source => [source.id, `cmp-${foundry.utils.randomID(8)}`]));
    const copies = sources.map(source => ({ ...clone(source), id: idMap.get(source.id), x: clamp(source.x + layout.gridSize, 0, layout.width - source.w), y: clamp(source.y + layout.gridSize, 0, layout.height - source.h), z: Number(source.z) || 0, stackOrder: Math.max(-1, ...layout.components.map(c => Number(c.stackOrder) || 0)) + 1 + sources.indexOf(source) }));
    const duplicatedGroups = (layout.groups ?? []).filter(g => (g.componentIds ?? []).length >= 2 && (g.componentIds ?? []).every(id => idMap.has(id))).map(g => ({ ...clone(g), id: `grp-${foundry.utils.randomID(8)}`, name: `${g.name ?? "Grupo"} (cópia)`, componentIds: g.componentIds.map(id => idMap.get(id)) }));
    layout.components.push(...copies); layout.groups.push(...duplicatedGroups);
    await this._writeLayouts(layouts, active); this._selectedIds = new Set(copies.map(c => c.id)); this._selectedGroupId = duplicatedGroups[0]?.id ?? null; this.render({ force: true });
  }
  async _newLayout() {
    const layouts = await this._readLayouts();
    this._captureHistory();
    const id = `layout-${foundry.utils.randomID(5)}`;
    layouts[id] = { ...clone(DEFAULT_LAYOUT), id, name: `Layout ${Object.keys(layouts).length + 1}`, tabMode: "icon", tabValue: "fa-solid fa-star", tabIcon: "fa-solid fa-star", components: [] };
    await this._writeLayouts(layouts, id); this.render({ force: true });
  }
  async _switchLayout(id) { if (!id) return; const layouts = await this._readLayouts(); if (layouts[id]) { await this.actor.setFlag("nexus", "activeLayout", id); this._selectedIds = new Set(); this.render({ force: true }); } }
  async _updateLayoutName(name) {
    const clean = String(name ?? "").trim().slice(0, 32); if (!clean) return;
    const layouts = await this._readLayouts(), active = this._activeLayoutId();
    if (!layouts[active]) return;
    layouts[active].name = clean;
    if ((layouts[active].tabMode ?? "text") === "text") layouts[active].tabValue = clean;
    await this._writeLayouts(layouts, active); this._currentLayout = layouts[active];
    const tab = document.querySelector(`[data-nexus-floating-for="${this.id}"] .nexus-layout-tab[data-layout-id="${active}"]`);
    if (tab) {
      const label = tab.querySelector(".nexus-layout-tab-label");
      if (label) label.textContent = clean;
      tab.title = clean; tab.setAttribute("aria-label", clean);
    }
  }
  async _editLayoutTab(id) {
    this._layoutEditDialogOpenId ??= null;
    if (this._layoutEditDialogOpenId === id) {
      const windows = ui.windows instanceof Map ? [...ui.windows.values()] : Object.values(ui.windows ?? {});
      const dialog = windows.find(app => app?.options?.classes?.includes("nexus-layout-dialog") || app?.element?.classList?.contains("nexus-layout-dialog"));
      dialog?.close?.();
      this._layoutEditDialogOpenId = null;
      return;
    }
    if (this._layoutEditDialogOpenId) {
      const windows = ui.windows instanceof Map ? [...ui.windows.values()] : Object.values(ui.windows ?? {});
      windows.find(app => app?.options?.classes?.includes("nexus-layout-dialog") || app?.element?.classList?.contains("nexus-layout-dialog"))?.close?.();
      this._layoutEditDialogOpenId = null;
    }
    const layouts = await this._readLayouts(), layout = layouts[id];
    if (!layout) return;
    this._layoutEditDialogOpenId = id;
    const presentation = this._layoutTabPresentation(layout);
    const current = presentation.tabMode === "icon" ? presentation.tabIcon : presentation.tabMode === "image" ? presentation.tabImage : presentation.tabValue;
    const escape = value => String(value ?? "").replace(/[&<>"']/g, char => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[char]));
    const content = `<div class="nexus-layout-edit-form">
      <label>Nome do layout<input name="name" type="text" maxlength="32" value="${escape(layout.name)}"></label>
      <label>Ícone, texto ou imagem da aba<input name="tabValue" type="text" maxlength="2048" value="${escape(current)}" placeholder="Vazio = estrela padrão"></label>
      <p>O conteúdo é reconhecido automaticamente: texto, classe Font Awesome ou caminho/URL de imagem. Ao deixar vazio, será usada uma estrela.</p>
    </div>`;
    let result;
    try {
      result = await foundry.applications.api.DialogV2.input({
        window: { title: "Propriedades do layout" },
        classes: ["nexus", "nexus-panel-window", "nexus-layout-dialog"],
        position: { width: 340, height: 420 },
        content,
        ok: { label: "Salvar" },
        buttons: id !== "principal" ? [{
          action: "delete-layout",
          label: "Excluir layout",
          class: "nexus-layout-delete-button",
          callback: () => ({ action: "delete-layout" })
        }] : [],
        rejectClose: false,
        render: (_event, dialog) => {
          dialog.bringToFront?.();
          dialog.element?.querySelector?.('input[name="name"]')?.focus?.();
        }
      });
    } finally {
      this._layoutEditDialogOpenId = null;
    }
    if (result?.action === "delete-layout") {
      await this._removeLayout(id);
      return;
    }
    if (!result) return;
    const name = String(result.name ?? layout.name).trim().slice(0,32) || layout.name;
    const tabValue = String(result.tabValue ?? "").trim().slice(0,2048);
    const next = { ...layout, name, tabValue, tabMode: "auto", tabIcon: "fa-solid fa-star", tabImage: "" };
    const auto = this._layoutTabPresentation(next);
    Object.assign(layout, next, auto);
    this._captureHistory();
    await this._writeLayouts(layouts, this._activeLayoutId());
    this._currentLayout = layouts[this._activeLayoutId()];
    this.render({ force: true });
  }


  async _removeLayout(layoutId = this._activeLayoutId()) {
    const targetId = String(layoutId ?? "");
    if (!targetId || targetId === "principal") return false;
    this._layoutDeletionInProgress ??= new Set();
    if (this._layoutDeletionInProgress.has(targetId)) return false;
    this._layoutDeletionInProgress.add(targetId);

    try {
      const layouts = await this._readLayouts();
      const target = layouts[targetId];
      if (!target) return false;

      const confirmed = await foundry.applications.api.DialogV2.confirm({
        window: { title: "Excluir layout" },
        content: `<p>Excluir <strong>${Handlebars.escapeExpression(String(target.name ?? targetId))}</strong> e todos os componentes desta aba?</p><p>Esta ação não pode ser desfeita.</p>`,
        yes: { label: "Excluir layout", default: true },
        no: { label: "Cancelar" },
        rejectClose: false
      });
      if (!confirmed) return false;

      const currentActive = this._activeLayoutId();
      delete layouts[targetId];
      if (!layouts.principal) layouts.principal = clone(DEFAULT_LAYOUT);
      const nextActive = currentActive === targetId || !layouts[currentActive] ? "principal" : currentActive;
      this._captureHistory();

      // _writeLayouts uses Foundry's forced-replacement operator, so the
      // persisted object contains exactly the remaining layouts.
      await this._writeLayouts(layouts, nextActive);

      const persistedLayouts = this.actor.getFlag("nexus", "layouts") ?? {};
      if (Object.hasOwn(persistedLayouts, targetId)) {
        throw new Error(`A chave ${targetId} reapareceu após a gravação dos layouts restantes.`);
      }
      if (this._activeLayoutId() !== nextActive) {
        throw new Error(`O Foundry não confirmou a ativação do layout ${nextActive} após a exclusão.`);
      }

      const verifiedLayouts = await this._readLayouts();
      if (Object.hasOwn(verifiedLayouts, targetId)) {
        throw new Error(`O layout ${targetId} ainda existe após a persistência.`);
      }

      this._selectedIds = new Set();
      this._selectedGroupId = null;
      this._componentEditorTargetId = null;
      this._currentLayout = clone(layouts[nextActive]);
      await this.render({ force: true });
      return true;
    } catch (error) {
      console.error("NEXUS | Falha ao excluir layout", error);
      ui.notifications?.error?.("Não foi possível excluir o layout. Consulte o console para detalhes.");
      return false;
    } finally {
      this._layoutDeletionInProgress.delete(targetId);
    }
  }

  async _applyThemePreset(themeId) {
    if (!THEME_PALETTES[themeId]) return;
    const layouts = await this._readLayouts(), active = this._activeLayoutId(), layout = layouts[active];
    if (!layout) return;
    this._captureHistory();
    layout.theme = themeId;
    Object.assign(layout, clone(THEME_PALETTES[themeId]));
    layout.fontFamily = THEME_TOKENS[themeId]?.fontFamily ?? "Inter";
    await this._writeLayouts(layouts, active);
    this._currentLayout = layout;
    this.render({ force: true });
  }

  async _updateLayoutSetting(input) {
    const layouts = await this._readLayouts(), active = this._activeLayoutId(), layout = layouts[active]; if (!layout) return;
    this._captureHistory();
    const key = input.dataset.layoutSetting;
    if (key === "width") layout.width = clamp(Number(input.value) || 800, 800, 1000);
    else if (key === "height") layout.height = clamp(Number(input.value) || 800, 300, 3000);
    else if (key === "gridSize") layout.gridSize = clamp(Number(input.value) || 20, 5, 100);
    else if (["canvasColor", "cardColor", "accentColor", "highlightColor", "buttonColor", "scrollColor", "windowHeaderColor", "windowContentColor", "menuColor", "placeholderColor", "fontFamily"].includes(key)) layout[key] = input.value;
    else if (key === "theme") {
      layout.theme = input.value;
      Object.assign(layout, clone(THEME_PALETTES[layout.theme] ?? THEME_PALETTES["nexus-dark"]));
      layout.fontFamily = THEME_TOKENS[layout.theme]?.fontFamily ?? "Inter";
    } else layout[key] = input.checked;
    await this._writeLayouts(layouts, active);
    this._currentLayout = layout;
    if (key === "theme") {
      for (const colorKey of ["canvasColor","cardColor","accentColor","highlightColor","buttonColor","scrollColor","windowHeaderColor","windowContentColor","menuColor","placeholderColor","fontFamily"]) { const field=input.closest(".nexus-panel-window")?.querySelector(`[data-layout-setting="${colorKey}"]`) ?? this.element?.querySelector(`[data-layout-setting="${colorKey}"]`); if(field)field.value=layout[colorKey]; }
    }
    const portalRoot = document.querySelector(`[data-nexus-floating-for="${this.id}"]`);
    applyThemeTokens(portalRoot, layout);
    applyThemeTokens(this.element?.querySelector(".nexus-sheet"), layout);
    applyThemeTokens(this.element?.closest(".application, .window-app"), layout);
    for (const instance of this._nexusPanelWindows?.values?.() ?? []) applyThemeTokens(instance.element, layout);
    if (["width", "height"].includes(key)) {
      const appWidth = clamp(layout.width + 40, 800, Math.max(800, window.innerWidth - 24));
      const appHeight = clamp(Math.min(layout.height + 100, window.innerHeight - 24), 500, Math.max(500, window.innerHeight - 24));
      this.setPosition({ width: appWidth, height: appHeight });
    }
    const canvas = this.element?.querySelector(".nexus-canvas");
    if (canvas) {
      canvas.dataset.layoutWidth = String(layout.width); canvas.dataset.layoutHeight = String(layout.height);
      canvas.dataset.gridSize = String(layout.gridSize);
      canvas.dataset.grid = String(layout.gridEnabled);
      canvas.dataset.snap = String(layout.snapEnabled);
      canvas.dataset.guides = String(layout.guidesEnabled);
      canvas.style.width = `${layout.width}px`; canvas.style.height = `${layout.height}px`;
      canvas.style.setProperty("--nexus-grid-size", `${layout.gridSize}px`);
      canvas.style.setProperty("--nexus-canvas-color", layout.canvasColor);
      canvas.style.setProperty("--nexus-card-color", layout.cardColor);
      canvas.style.setProperty("--nexus-accent-color", layout.accentColor);
      canvas.style.setProperty("--nexus-highlight-color", layout.highlightColor ?? "#78b7e8");
      canvas.style.setProperty("--nexus-button-color", layout.buttonColor ?? "#315b7d");
      applyThemeTokens(canvas, layout);
      this.element?.closest(".application, .window-app")?.style.setProperty("--nexus-window-accent", layout.accentColor);
      const portal=document.querySelector(`[data-nexus-floating-for="${this.id}"]`); portal?.style.setProperty("--nexus-accent-color", layout.accentColor); portal?.style.setProperty("--nexus-highlight-color",layout.highlightColor??"#78b7e8"); portal?.style.setProperty("--nexus-button-color",layout.buttonColor??"#315b7d"); portal?.style.setProperty("--nexus-font-family",`"${layout.fontFamily??"Inter"}", sans-serif`);
      const app=this.element?.closest(".application, .window-app"); app?.style.setProperty("--nexus-highlight-color",layout.highlightColor??"#78b7e8"); app?.style.setProperty("--nexus-button-color",layout.buttonColor??"#315b7d"); app?.style.setProperty("--nexus-font-family",`"${layout.fontFamily??"Inter"}", sans-serif`);
      for(const instance of this._nexusPanelWindows?.values?.()??[]){const panelElement=instance.element;if(panelElement){panelElement.style.setProperty("--nexus-highlight-color",layout.highlightColor??"#78b7e8");panelElement.style.setProperty("--nexus-button-color",layout.buttonColor??"#315b7d");panelElement.style.setProperty("--nexus-font-family",`"${layout.fontFamily??"Inter"}", sans-serif`);}}
      this._fitNexusCanvas?.();
    }
  }
  async _createComponentLink(componentIds = []) {
    const ids = [...new Set(componentIds)].filter(Boolean);
    if (ids.length < 2) return false;
    const layouts = await this._readLayouts();
    const active = this._activeLayoutId();
    const layout = layouts[active];
    if (!layout) return false;
    const validIds = new Set((layout.components ?? []).map(component => component.id));
    const members = ids.filter(id => validIds.has(id));
    if (members.length < 2) return false;
    layout.links ??= [];
    const selectedComponents = layout.components.filter(component => members.includes(component.id));
    const candidatePaths = [...new Set(selectedComponents.map(component => String(component.dataPath || COMPONENTS[component.type]?.path || "").trim()).filter(Boolean))];
    const link = {
      id: `lnk-${foundry.utils.randomID(8)}`,
      name: `Vínculo ${layout.links.length + 1}`,
      type: "data",
      sourcePath: candidatePaths.length === 1 ? candidatePaths[0] : "",
      members
    };
    this._captureHistory();
    layout.links.push(link);
    await this._writeLayouts(layouts, active);
    this._currentLayout = layouts[active];
    ui.notifications?.info?.("Vínculo criado. Os componentes continuam independentes; a relação está registrada para configuração funcional.");
    this.render({ force: true });
    return true;
  }

  async _groupSelection(html) {
    const ids = new Set(this._selectedIds ?? []); if (ids.size < 2) return;
    const layouts = await this._readLayouts(), active = this._activeLayoutId(), layout = layouts[active];
    if (!layout) return;
    // Não deixa grupos antigos parcialmente órfãos: ao reagrupar um membro, incorpora o grupo inteiro.
    let changed = true;
    while (changed) { changed = false; for (const group of (layout.groups ?? [])) {
      if ((group.componentIds ?? []).some(id => ids.has(id))) for (const id of (group.componentIds ?? [])) if (!ids.has(id)) { ids.add(id); changed = true; }
    }}
    const memberIds = [...ids];
    const members = layout.components.filter(c => ids.has(c.id)); if (members.length < 2) return;
    this._captureHistory();
    const x = Math.min(...members.map(c => c.x)), y = Math.min(...members.map(c => c.y));
    const right = Math.max(...members.map(c => c.x + c.w)), bottom = Math.max(...members.map(c => c.y + c.h));
    layout.groups ??= [];
    const group = { id: `grp-${foundry.utils.randomID(8)}`, name: `Grupo ${layout.groups.length + 1}`, componentIds: members.map(c => c.id), x, y, w: right - x, h: bottom - y, z: Math.min(...members.map(c=>Number(c.z)||0)) };
    layout.groups = (layout.groups ?? []).filter(g => !g.componentIds?.some(id => ids.has(id)));
    layout.groups.push(group); await this._writeLayouts(layouts, active); this._selectedGroupId = group.id; this._selectedIds = new Set(memberIds); this.render({ force: true });
  }

  async _saveSelectedGroupToLibrary() {
    const layouts = await this._readLayouts();
    const layout = layouts[this._activeLayoutId()];
    if (!layout) return false;
    const selected = new Set(this._selectedIds ?? []);
    const group = (layout.groups ?? []).find(item => item.id === this._selectedGroupId)
      ?? (layout.groups ?? []).find(item => item.componentIds?.length >= 2 && item.componentIds.every(id => selected.has(id)));
    if (!group) {
      ui.notifications?.warn?.("Selecione um grupo completo antes de salvá-lo na Biblioteca.");
      return false;
    }
    const members = (layout.components ?? []).filter(item => group.componentIds.includes(item.id));
    if (members.length < 2) return false;
    const result = await foundry.applications.api.DialogV2.input({
      window: { title: "Salvar grupo na Biblioteca" },
      content: `<label class="nexus-library-card-content-label">Nome do grupo<input name="name" type="text" maxlength="48" value="${Handlebars.escapeExpression(String(group.name ?? "Grupo"))}"></label>`,
      ok: { label: "Salvar" }, rejectClose: false
    });
    const name = String(result?.name ?? "").trim().slice(0, 48);
    if (!name) return false;
    const left = Math.min(...members.map(item => item.x));
    const top = Math.min(...members.map(item => item.y));
    const saved = clone(game.user?.getFlag?.("nexus", "libraryGroups") ?? []);
    saved.push({
      id: `libgrp-${foundry.utils.randomID(8)}`, name,
      groupSettings: { backgroundColor: group.backgroundColor ?? "", borderColor: group.borderColor ?? "", borderRadius: group.borderRadius ?? 0 },
      components: members.map(item => { const { id, ...data } = clone(item); return { ...data, x: item.x - left, y: item.y - top }; })
    });
    await game.user.setFlag("nexus", "libraryGroups", saved.slice(-100));
    ui.notifications?.info?.(`Grupo "${name}" salvo na sua Biblioteca pessoal.`);
    this._libraryRenderSavedGroups?.();
    return true;
  }

  async _addSavedGroupToCanvas(groupId) {
    const saved = game.user?.getFlag?.("nexus", "libraryGroups") ?? [];
    const composition = saved.find(item => item.id === groupId);
    if (!composition?.components?.length) return false;
    const layouts = await this._readLayouts(), active = this._activeLayoutId(), layout = layouts[active];
    if (!layout) return false;
    const components = composition.components.map(item => ({ ...clone(item), definition: COMPONENTS[item.type] })).filter(item => item.definition);
    if (!components.length) return false;
    const width = Math.max(...components.map(item => (Number(item.x) || 0) + (Number(item.w) || item.definition.w)));
    const height = Math.max(...components.map(item => (Number(item.y) || 0) + (Number(item.h) || item.definition.h)));
    const origin = this._findFreePosition(layout, Math.min(width, layout.width), Math.min(height, layout.height));
    this._captureHistory();
    const ids = [];
    for (const item of components) {
      const id = `cmp-${foundry.utils.randomID(8)}`;
      const w = clamp(Number(item.w) || item.definition.w, 20, Math.min(1000, layout.width));
      const h = clamp(Number(item.h) || item.definition.h, 20, Math.min(1000, layout.height));
      layout.components.push({ ...clone(item), definition: undefined, id, x: clamp(origin.x + (Number(item.x) || 0), 0, layout.width - w), y: clamp(origin.y + (Number(item.y) || 0), 0, layout.height - h), w, h, z: 0, stackOrder: Math.max(-1, ...layout.components.map(existing => Number(existing.stackOrder) || 0)) + 1 });
      ids.push(id);
    }
    if (ids.length > 1) {
      layout.groups ??= [];
      const members = layout.components.filter(item => ids.includes(item.id));
      const left = Math.min(...members.map(item => item.x)), top = Math.min(...members.map(item => item.y));
      const right = Math.max(...members.map(item => item.x + item.w)), bottom = Math.max(...members.map(item => item.y + item.h));
      layout.groups.push({ ...(clone(composition.groupSettings ?? {})), id: `grp-${foundry.utils.randomID(8)}`, name: composition.name, componentIds: ids, x: left, y: top, w: right-left, h: bottom-top, z: 0 });
    }
    await this._writeLayouts(layouts, active);
    this._selectedIds = new Set(ids);
    this._selectedGroupId = layout.groups?.find(item => item.componentIds?.length === ids.length && item.componentIds.every(id => ids.includes(id)))?.id ?? null;
    this.render({ force: true });
    return true;
  }

  async _ungroupSelection(html) {
    const ids = new Set(this._selectedIds ?? []), layouts = await this._readLayouts(), active = this._activeLayoutId(), layout = layouts[active];
    if (!layout) return;
    const selectedGroups = new Set((layout.groups ?? []).filter(group => ids.has(group.id) || (group.componentIds ?? []).every(id => ids.has(id))).map(group => group.id));
    if (!selectedGroups.size) return;
    this._captureHistory();
    layout.groups = (layout.groups ?? []).filter(group => !selectedGroups.has(group.id));
    await this._writeLayouts(layouts, active); this._selectedGroupId = null; this.render({ force: true });
  }
  async _resetGlobalAppearance(kind) {
    const layouts=await this._readLayouts(),active=this._activeLayoutId(),layout=layouts[active];if(!layout)return;
    this._captureHistory();
    if(kind==="colors") Object.assign(layout,{canvasColor:"#171f2a",cardColor:"#273443",accentColor:"#52647b",highlightColor:"#78b7e8",buttonColor:"#315b7d",theme:"nexus-dark"});
    else Object.assign(layout,{fontFamily:THEME_TOKENS[layout.theme]?.fontFamily ?? "Inter",fontSize:13,secondaryFontSize:11,valueFontSize:20});
    await this._writeLayouts(layouts,active);this._currentLayout=layout;this.render({force:true});
  }
  async _toggleLayerState(kind,id,property) {
    const layouts=await this._readLayouts(),active=this._activeLayoutId(),layout=layouts[active];if(!layout)return;
    const target=kind==="group"?(layout.groups??[]).find(item=>item.id===id):layout.components.find(item=>item.id===id);if(!target)return;
    this._captureHistory();target[property]=!target[property];
    if(property==="hidden" && target.hidden){ if(kind==="group") this._selectedIds=new Set(); else this._selectedIds.delete(id); this._selectedGroupId=null; this._componentEditorTargetId=null; }
    await this._writeLayouts(layouts,active);this._currentLayout=layout;this.render({force:true});
  }
  async _updateGlobalTypography(input) {
    const layouts = await this._readLayouts(), active = this._activeLayoutId(), layout = layouts[active]; if (!layout) return;
    const key = input.dataset.globalTypography;
    const limits = { fontSize:[9,20,13], secondaryFontSize:[8,16,11], valueFontSize:[14,32,20] };
    if (!Object.hasOwn(limits, key)) return;
    const [min,max,fallback] = limits[key];
    const parsed = Number(input.value);
    layout[key] = clamp(Number.isFinite(parsed) && parsed !== 0 ? parsed : fallback, min, max);
    this._captureHistory();
    await this._writeLayouts(layouts,active); this._currentLayout = layout;
    const cssKey = {fontSize:"--nexus-font-size",secondaryFontSize:"--nexus-secondary-font-size",valueFontSize:"--nexus-value-font-size"}[key];
    const nodes = [this.element?.querySelector(".nexus-canvas"), document.querySelector(`[data-nexus-floating-for="${this.id}"]`), ...[...(this._nexusPanelWindows?.values?.() ?? [])].map(instance => instance.element)].filter(Boolean);
    for (const node of nodes) if (cssKey) node.style.setProperty(cssKey, `${layout[key]}px`);
  }
  async _updateComponentSetting(input) {
    const ids = [...(this._selectedIds ?? [])]; if (ids.length !== 1) return;
    this._captureHistory();
    const layouts = await this._readLayouts(), active = this._activeLayoutId(), layout = layouts[active]; if (!layout) return;
    const component = layout.components.find(c => c.id === ids[0]); if (!component) return;
    const key = input.dataset.componentSetting;
    if (key === "format") { const family=component.type.startsWith("pv")?"pv":component.type.startsWith("pm")?"pm":component.type.startsWith("pe")?"pe":null; if(family){const format=input.value;component.type=format==="bar"?`${family}-bar`:format==="ring"&&family==="pv"?"pv-ring":family;} }
    else if (["width","height"].includes(key)) component[key === "width" ? "w" : "h"] = clamp(Number(input.value) || (key === "width" ? 20 : 20), 20, key === "width" ? layout.width : layout.height);
    await this._writeLayouts(layouts,active); this._currentLayout = layout;
    const el = this.element?.querySelector(`.nexus-component[data-id="${component.id}"]`);
    if (key === "format") { this.render({force:true}); return; }
    if (el) { el.style.width = `${component.w}px`; el.style.height = `${component.h}px`; }
  }
  _captureHistory() {
    const layouts = this.actor.getFlag("nexus", "layouts") ?? {};
    const active = this._activeLayoutId();
    this._undoStack ??= []; this._redoStack ??= [];
    this._undoStack.push({layouts:clone(layouts),active});
    if (this._undoStack.length > 80) this._undoStack.shift();
    this._redoStack.length = 0;
  }
  async _restoreHistory(stack, other) {
    if (!stack?.length) return;
    const current = this.actor.getFlag("nexus", "layouts") ?? {};
    other.push({layouts:clone(current),active:this._activeLayoutId()});
    const state = stack.pop();
    await this._writeLayouts(state.layouts, state.active);
    this._selectedIds = new Set(); this.render({ force: true });
  }
  _beginLayerRename(nameNode, kind, id) {
    if (!nameNode || nameNode.querySelector("input")) return;
    const current = nameNode.textContent.trim();
    const input = document.createElement("input");
    input.type = "text"; input.maxLength = 48; input.value = current;
    input.className = "nexus-layer-rename-input"; input.setAttribute("aria-label", "Novo nome da camada");
    nameNode.replaceChildren(input); nameNode.classList.add("is-renaming");
    input.focus(); input.select();
    let finished = false;
    const finish = async save => {
      if (finished) return; finished = true;
      const value = input.value.trim().slice(0, 48) || current;
      nameNode.classList.remove("is-renaming");
      nameNode.textContent = save ? value : current;
      if (save && value !== current) await this._renameLayer(kind, id, value);
    };
    input.addEventListener("keydown", event => {
      if (event.key === "Enter") { event.preventDefault(); input.blur(); }
      if (event.key === "Escape") { event.preventDefault(); finish(false); }
      event.stopPropagation();
    });
    input.addEventListener("blur", () => finish(true), { once: true });
    input.addEventListener("click", event => event.stopPropagation());
  }

  async _renameLayer(kind, id, name) {
    const layouts = await this._readLayouts(), active = this._activeLayoutId(), layout = layouts[active];
    if (!layout) return;
    const target = kind === "group" ? (layout.groups ?? []).find(item => item.id === id) : layout.components.find(item => item.id === id);
    if (!target) return;
    this._captureHistory();
    if (kind === "group") target.name = name;
    else target.customLabel = name;
    await this._writeLayouts(layouts, active);
    this._currentLayout = layout;
    this.render({ force: true });
  }

  async _changeLayer(direction) {
    const ids = new Set(this._selectedIds ?? []); if (!ids.size) return;
    // Um grupo é uma unidade de ordenação: mover um membro pela pilha move o grupo inteiro.
    let expanded = true;
    while (expanded) { expanded = false; for (const group of (this._currentLayout?.groups ?? [])) {
      if ((group.componentIds ?? []).some(id => ids.has(id))) for (const id of (group.componentIds ?? [])) if (!ids.has(id)) { ids.add(id); expanded = true; }
    }}
    this._selectedIds = ids;
    const layouts=await this._readLayouts(), active=this._activeLayoutId(), layout=layouts[active]; if(!layout)return;
    this._captureHistory();
    const ordered=[...layout.components].sort((a,b)=>(a.z??0)-(b.z??0) || (a.stackOrder??0)-(b.stackOrder??0));
    const selected=ordered.filter(c=>ids.has(c.id)), rest=ordered.filter(c=>!ids.has(c.id));
    if(direction==="front") ordered.splice(0,ordered.length,...rest,...selected);
    else if(direction==="back") ordered.splice(0,ordered.length,...selected,...rest);
    else if(direction==="forward") { for(let i=ordered.length-2;i>=0;i--) if(ids.has(ordered[i].id)&&!ids.has(ordered[i+1].id)) [ordered[i],ordered[i+1]]=[ordered[i+1],ordered[i]]; }
    else if(direction==="backward") { for(let i=1;i<ordered.length;i++) if(ids.has(ordered[i].id)&&!ids.has(ordered[i-1].id)) [ordered[i],ordered[i-1]]=[ordered[i-1],ordered[i]]; }
    ordered.forEach((c,i)=>c.z=i+1); layout.components=ordered;
    for (const group of (layout.groups ?? [])) { const members=ordered.filter(c=>(group.componentIds??[]).includes(c.id)); if(members.length) group.z=Math.min(...members.map(c=>c.z)); }
    await this._writeLayouts(layouts,active); this.render({ force: true });
  }
  async _reorderLayer(sourceId, targetId, placement = "before") {
    const layouts = await this._readLayouts(), active = this._activeLayoutId(), layout = layouts[active];
    if (!layout || !sourceId || !targetId || sourceId === targetId) return;
    layout.groups ??= [];
    const sourceGroup = layout.groups.find(group => group.id === sourceId);
    const targetGroup = layout.groups.find(group => group.id === targetId);
    const sourceComponent = layout.components.find(component => component.id === sourceId);
    const targetComponent = layout.components.find(component => component.id === targetId);
    const sourceParent = sourceComponent ? layout.groups.find(group => group.componentIds.includes(sourceId)) : null;

    // Soltar sobre o centro de uma pasta adiciona o componente àquele grupo.
    if (placement === "inside" && targetGroup && sourceComponent) {
      if (targetGroup.componentIds.includes(sourceId)) return;
      this._captureHistory();
      if (sourceParent) {
        sourceParent.componentIds = sourceParent.componentIds.filter(id => id !== sourceId);
        layout.groups = layout.groups.filter(group => group.componentIds.length >= 2);
      }
      const destination = layout.groups.find(group => group.id === targetId);
      if (!destination) return;
      destination.componentIds.push(sourceId);
      const members = layout.components.filter(component => destination.componentIds.includes(component.id));
      sourceComponent.z = Math.min(...members.map(component => Number(component.z) || 0));
      sourceComponent.stackOrder = Math.max(...members.map(component => Number(component.stackOrder) || 0)) + 1;
      destination.z = Math.min(...members.map(component => Number(component.z) || 0));
      destination.stackOrder = Math.min(...members.map(component => Number(component.stackOrder) || 0));
    } else {
      // Um grupo arrastado é uma unidade. Um componente filho pode ser reordenado
      // individualmente; ao sair da pasta, sua associação antiga é removida.
      const movingIds = sourceGroup ? [...sourceGroup.componentIds] : [sourceId];
      if (!movingIds.every(id => layout.components.some(component => component.id === id))) return;
      const movingSet = new Set(movingIds);
      const targetIds = targetGroup ? [...targetGroup.componentIds] : [targetId];
      if (targetIds.some(id => movingSet.has(id))) return;
      this._captureHistory();
      if (!sourceGroup && sourceParent) {
        sourceParent.componentIds = sourceParent.componentIds.filter(id => id !== sourceId);
        layout.groups = layout.groups.filter(group => group.componentIds.length >= 2);
      }
      const ordered = [...layout.components].sort((a, b) => (Number(a.z) || 0) - (Number(b.z) || 0) || (Number(a.stackOrder) || 0) - (Number(b.stackOrder) || 0));
      const moving = ordered.filter(component => movingSet.has(component.id));
      const rest = ordered.filter(component => !movingSet.has(component.id));
      const indexes = rest.map((component, index) => targetIds.includes(component.id) ? index : -1).filter(index => index >= 0);
      if (!indexes.length) return;
      const insertAt = placement === "after" ? Math.max(...indexes) + 1 : Math.min(...indexes);
      rest.splice(insertAt, 0, ...moving);
      rest.forEach((component, index) => { component.z = index; });
      layout.components = rest;
      for (const group of layout.groups) {
        const members = rest.filter(component => group.componentIds.includes(component.id));
        if (!members.length) continue;
        group.z = Math.min(...members.map(component => component.z));
        group.stackOrder = Math.min(...members.map(component => Number(component.stackOrder) || 0));
      }
    }
    await this._writeLayouts(layouts, active);
    this.render({ force: true });
  }

  async _saveCanvas(html, touchedIds = []) {
    const layouts = await this._readLayouts(), active = this._activeLayoutId(), layout = layouts[active]; if (!layout) return;
    html.find(".nexus-component").each((_, el) => {
      const c = layout.components.find(x => x.id === el.dataset.id); if (!c) return;
      c.x = Math.round(parseFloat(el.style.left) || 0); c.y = Math.round(parseFloat(el.style.top) || 0);
      c.w = Math.max(20, Math.round(parseFloat(el.style.width) || c.w)); c.h = Math.max(20, Math.round(parseFloat(el.style.height) || c.h));
    });
    layout.groups = clone(this._currentLayout?.groups ?? layout.groups ?? []);
    const validIds = new Set(layout.components.map(c => c.id));
    layout.groups = layout.groups.map(g => ({...g, componentIds:(g.componentIds ?? []).filter(id => validIds.has(id))})).filter(g => g.componentIds.length >= 2);
    for (const g of layout.groups) {
      const members = layout.components.filter(c => g.componentIds?.includes(c.id));
      if (!members.length) continue;
      g.z = Math.min(...members.map(c => Number(c.z) || 0));
      const minX = Math.min(...members.map(c => c.x)), minY = Math.min(...members.map(c => c.y));
      const maxX = Math.max(...members.map(c => c.x + c.w)), maxY = Math.max(...members.map(c => c.y + c.h));
      if (g.x == null) g.x = minX; if (g.y == null) g.y = minY;
      g.x = minX; g.y = minY; g.w = maxX - minX; g.h = maxY - minY;
    }
    const touched = new Set((touchedIds ?? []).filter(Boolean));
    if (touched.size) {
      let nextOrder = Math.max(-1, ...layout.components.map(component => Number(component.stackOrder) || 0)) + 1;
      for (const component of layout.components) if (touched.has(component.id)) component.stackOrder = nextOrder++;
    }
    this._currentLayout = layout;
    layouts[active] = layout;
    await this._writeLayouts(layouts, active);
  }

  _setSelection(html, ids) {
    this._selectedIds = new Set((ids ?? []).filter(Boolean));
    if (this._selectedIds.size === 1) this._componentEditorTargetId = [...this._selectedIds][0];
    else if (this._selectedIds.size === 0) this._componentEditorTargetId = null;
    const sheetRoot = this.element?.querySelector?.(".nexus-sheet") ?? html?.[0] ?? this.element;
    const componentNodes = sheetRoot?.querySelectorAll?.(".nexus-component") ?? [];
    // Limpa todas as classes visuais antes de reaplicar a seleção lógica atual.
    for (const el of componentNodes) el.classList.remove("is-selected", "is-group-inspecting", "is-selection-highlight");
    sheetRoot?.querySelectorAll?.(".nexus-group-surface").forEach(surface => surface.classList.remove("is-selected"));
    const selectedGroups = (this._currentLayout?.groups ?? []).filter(group => (group.componentIds ?? []).length >= 2 && group.componentIds.every(id => this._selectedIds.has(id)));
    const inspectedGroups = (this._currentLayout?.groups ?? []).filter(group => (group.componentIds ?? []).length >= 2 && (group.componentIds ?? []).some(id => this._selectedIds.has(id)));
    this._selectedGroupId = selectedGroups.length === 1 ? selectedGroups[0].id : null;
    const inspectedGroupIds = new Set(inspectedGroups.map(group => group.id));
    for (const el of componentNodes) {
      const selected = this._selectedIds.has(el.dataset.id);
      const memberSelected = !!el.dataset.groupId && inspectedGroupIds.has(el.dataset.groupId);
      el.classList.toggle("is-selected", selected);
      el.classList.toggle("is-group-inspecting", memberSelected);
      el.classList.toggle("is-selection-highlight", selected || memberSelected);
    }
    sheetRoot?.querySelectorAll?.(".nexus-group-surface").forEach(surface => {
      const group = (this._currentLayout?.groups ?? []).find(item => item.id === surface.dataset.groupId);
      surface.classList.toggle("is-selected", !!group && (group.componentIds ?? []).some(id => this._selectedIds.has(id)));
    });
    const layerRoots = [this._nexusPanelWindows?.get("layers")?.panel, html?.[0], this.element].filter(Boolean);
    for (const layerRoot of new Set(layerRoots)) {
      layerRoot.querySelectorAll?.("[data-layer-select]").forEach(el => el.classList.toggle("active", this._selectedIds.has(el.dataset.layerSelect)));
      layerRoot.querySelectorAll?.("[data-layer-group]").forEach(el => { const group = (this._currentLayout?.groups ?? []).find(g => g.id === el.dataset.layerGroup); el.classList.toggle("active", !!group && group.componentIds.every(id => this._selectedIds.has(id))); });
    }
    const activeComponentId = this._selectedIds.size === 1 ? [...this._selectedIds][0] : null;
    const one = activeComponentId ? (this._currentLayout?.components ?? []).find(c => c.id === activeComponentId) : null;
    const selectedGroup = (this._currentLayout?.groups ?? []).find(g => g.id === this._selectedGroupId);
    const componentRoot=this._nexusPanelWindows?.get("component")?.panel ?? html[0];
    const inspector = componentRoot?.querySelector(".nexus-component-inspector"), empty = componentRoot?.querySelector(".nexus-inspector-empty");
    if (one && inspector) inspector.querySelectorAll("[data-component-setting]").forEach(field => { field.dataset.componentTargetId = one.id; });
    if (inspector) {
      inspector.querySelectorAll("[data-action-config]").forEach(section => { section.hidden = !one || section.dataset.actionConfig !== (one.actionType ?? ""); });
      const textTools = inspector.querySelector("[data-text-tools]");
      if (textTools) textTools.hidden = !one || ["token", "asset-image"].includes(one.type);
      const imageSettings = inspector.querySelector("[data-image-settings]");
      if (imageSettings) imageSettings.hidden = one?.type !== "asset-image";
      const sliderOption = inspector.querySelector('[data-component-setting="actionType"] option[value="resource-slider"]');
      if (sliderOption) sliderOption.hidden = !one || !["pv","pm","pe","pv-bar","pm-bar","pe-bar","pv-ring","resource-meter","asset-meter","sheet-resource"].includes(one.type);
      this._syncTextToolbar(inspector, one);
    }
    if (inspector) {
      inspector.hidden = !one && !selectedGroup; if (empty) empty.hidden = !!one || !!selectedGroup;
      const groupInspector=inspector.querySelector("[data-group-inspector]");
      if(groupInspector){groupInspector.hidden=!selectedGroup;if(selectedGroup){for(const [key,value] of [["backgroundColor",selectedGroup.backgroundColor??"#273443"],["borderColor",selectedGroup.borderColor??"#52647b"],["borderRadius",selectedGroup.borderRadius??8]]){const field=groupInspector.querySelector(`[data-group-setting="${key}"]`);if(field)field.value=value;}}}
      const tabNav=inspector.querySelector("[data-inspector-tabs]"); if(tabNav)tabNav.hidden=!!selectedGroup;
      const layoutSection=inspector.querySelector("[data-inspector-layout]"); if(layoutSection)layoutSection.hidden=!!selectedGroup;
      const cardStyleSection=inspector.querySelector("[data-inspector-card-style]"); if(cardStyleSection)cardStyleSection.hidden=!!selectedGroup;
      const componentStyleSection=inspector.querySelector("[data-inspector-component-style]"); if(componentStyleSection)componentStyleSection.hidden=!!selectedGroup;
      const labelPositionRow=inspector.querySelector("[data-component-label-position]"); if(labelPositionRow)labelPositionRow.hidden=!one || ["token", "sheet-resource", "asset-text", "asset-notes", "asset-image", "asset-link"].includes(one.type) || (!one.customLabel && !["level", "attribute"].includes(COMPONENTS[one.type]?.variant ?? one.sheetVariant));
      const activeTab=selectedGroup?"card":(this._componentInspectorTab??"card");
      inspector.querySelectorAll("[data-inspector-tab]").forEach(button=>button.classList.toggle("active",button.dataset.inspectorTab===activeTab));
      inspector.querySelectorAll("[data-inspector-tab-panel]").forEach(panel=>{const active=panel.dataset.inspectorTabPanel===activeTab;panel.hidden=!active;panel.classList.toggle("active",active);});
      let effectivePath = null;
      if (one) {
        const knownCorePaths = ["name", "identity.portrait.img", "identity.token.img", "token.img", "resources.pv.value", "resources.pv.max", "resources.pm.value", "resources.pm.max", "resources.pe.value", "resources.pe.max", "identity.level", "identity.lineage", "identity.legacy", "combat.defense", "combat.movement", "combat.desl", "combat.ddr", "combat.mb"];
        const corePaths = new Set(knownCorePaths.filter(path => path === "name" || ["identity.portrait.img", "identity.token.img", "token.img"].includes(path) || getPath(this.actor.system ?? {}, path) !== undefined));
        const systemRevision = this.actor?._stats?.modifiedTime ?? this.actor?.system;
        if (!this._nexusPropertyPathCache || this._nexusPropertyPathCache.revision !== systemRevision) {
          this._nexusPropertyPathCache = { revision: systemRevision, paths: collectPropertyPaths(this.actor) };
        }
        const allSystemPaths = this._nexusPropertyPathCache.paths;
        const nativePropertyRoots = new Set(getNativePropertyDefinitions(this.actor).filter(item => ["attribute", "resource"].includes(item.type)).map(item => safeAliasKey(item.key)).filter(Boolean));
        const systemPaths = new Set([...allSystemPaths].filter(path => !nativePropertyRoots.has(path) && !corePaths.has(path) && ![...corePaths].some(core => path.startsWith(`${core}.`))));
        const nativeAliasPaths = new Set();
        const customAliasPaths = new Set();
        const aliasLabels = new Map();
        for (const [collection, destination] of [[getNativePropertyDefinitions(this.actor), nativeAliasPaths], [getAliasDefinitions(this.actor), customAliasPaths]]) {
          for (const alias of collection) {
            const root = safeAliasKey(alias.key); if (!root) continue;
            const suffixes = alias.type === "attribute" ? ["name", "exib", "value", "checkbonus", "roll"] : alias.type === "resource" ? ["name", "exib", "value", "max", "percentage"] : [""];
            for (const suffix of suffixes) {
              const path = suffix ? `${root}.${suffix}` : root;
              destination.add(path);
              aliasLabels.set(path, suffix ? `${alias.label} · ${suffix}` : alias.label);
            }
          }
        }
        const externalPaths = new Set(["uuid", "id", "_id", "img"].filter(path => path === "img" || this.actor?.[path] !== undefined));
        const optionsList = inspector.querySelector("[data-component-path-options]");
        const suggestions = [];
        const registeredPaths = new Set();
        for (const [label, values] of [["NEXUS · nativas", corePaths], ["NEXUS · campos derivados", nativeAliasPaths], ["Módulos externos · system", systemPaths], ["Externas · Foundry / integrações", externalPaths], ["Campos próprios", customAliasPaths]]) {
          const paths = [...values]
            .filter(path => one.type !== "token" || /(?:^img$|\.img$)/i.test(path))
            .filter(path => { if (registeredPaths.has(path)) return false; registeredPaths.add(path); return true; })
            .sort((a,b) => a.localeCompare(b, "pt-BR"));
          if (paths.length) suggestions.push({ label, paths });
        }
        if (optionsList) {
          const fragment = document.createDocumentFragment();
          for (const group of suggestions) {
            const heading = document.createElement("div"); heading.className = "nexus-property-options-heading"; heading.textContent = group.label; fragment.append(heading);
            for (const path of group.paths) {
              const button = document.createElement("button"); button.type = "button"; button.className = "nexus-property-option"; button.dataset.propertyPathOption = path; button.setAttribute("role", "option");
              const title = document.createElement("strong"); title.textContent = aliasLabels.get(path) ?? path;
              const code = document.createElement("code"); code.textContent = path;
              button.append(title, code); fragment.append(button);
            }
          }
          optionsList.replaceChildren(fragment);
        }
        const pathInput = inspector.querySelector("[data-component-path-input]");
        const defaultPath = resolveNexusBinding(this.actor, one.dataPath ?? COMPONENTS[one.type]?.path ?? "").path;
        if (pathInput) pathInput.value = defaultPath;
        if (optionsList) optionsList.hidden = true;
        for (const [key, value] of [["x", one.x], ["y", one.y], ["width", one.w], ["height", one.h], ["actionPath", one.actionPath ?? ""], ["proficiencyLabel0", one.proficiencyLabels?.[0] ?? "Sem domínio"], ["proficiencyLabel1", one.proficiencyLabels?.[1] ?? "Básico"], ["proficiencyLabel2", one.proficiencyLabels?.[2] ?? "Treinado"], ["proficiencyLabel3", one.proficiencyLabels?.[3] ?? "Especialista"], ["imageFit", one.imageFit ?? "contain"], ["imagePosition", one.imagePosition ?? "center"], ["imageOpacity", one.imageOpacity ?? 100], ["currentPath", one.currentPath ?? (String(one.sheetCode).toUpperCase()==="REC"?"":"resources.pv.value")], ["maxPath", one.maxPath ?? (String(one.sheetCode).toUpperCase()==="REC"?"":"resources.pv.max")], ["dataPath", one.dataPath ?? COMPONENTS[one.type]?.path ?? ""], ["text", one.text ?? ""], ["customLabel", one.customLabel ?? one.text ?? ""], ["showLabel", one.showLabel !== false], ["labelPosition", one.labelPosition ?? "top-left"], ["fontSize", one.fontSize ?? this._currentLayout?.fontSize ?? 13], ["fontFamily", one.fontFamily ?? this._currentLayout?.fontFamily ?? "Inter"], ["headingFontSize", one.headingFontSize ?? ""], ["headingFontFamily", one.headingFontFamily ?? ""], ["rows", one.rows ?? 3], ["columns", one.columns ?? 3], ["placeholder", one.placeholder ?? ""], ["binding", one.binding ?? ""], ["customBinding", one.customBinding ?? ""], ["resourceLabel", one.resourceLabel ?? "Recurso"], ["format", one.format ?? "bar"], ["backgroundColor", one.backgroundColor ?? "#273443"], ["borderColor", one.borderColor ?? "#52647b"], ["borderRadius", one.borderRadius ?? "7"], ["opacity", one.opacity ?? "100"], ["sheetContent1",one.sheetContent1??"PV"], ["sheetContent2",one.sheetContent2??"❤️"], ["sheetColor",one.sheetColor??({PV:"#d94b4b",PM:"#3979d8",PE:"#39a86b"})[String(one.sheetCode??one.sheetContent1??"PV").toUpperCase()]??"#d94b4b"], ["sheetTrackColor",one.sheetTrackColor??"#080d14"], ["sheetOrientation",one.sheetOrientation??"horizontal"], ["previewCurrent",one.previewCurrent??32], ["previewMax",one.previewMax??40], ["tokenImage",one.tokenImage??""], ["tokenFrameMode",one.tokenFrameMode??"solid"], ["tokenFrameSource",one.tokenFrameSource??""], ["tokenFrameColor",one.tokenFrameColor??"#78b7e8"], ["tokenFrameWidth",one.tokenFrameWidth??3], ["tokenShape",one.tokenShape??"circle"], ["tokenOverlay",one.tokenOverlay??""], ["tokenBackgroundColor",one.tokenBackgroundColor??"#202e3e"], ["layerIcon",one.layerIcon??""], ["layerImage",one.layerImage??""]]) {
          inspector.querySelectorAll(`[data-component-setting="${key}"]`).forEach(input => { input.value = value; });
        }
        const showLabelInput = inspector.querySelector('[data-component-setting="showLabel"]');
        if (showLabelInput) showLabelInput.checked = one.showLabel !== false;
        effectivePath = resolveNexusBinding(this.actor, one.dataPath ?? COMPONENTS[one.type]?.path ?? "");
        const propertyValueRow = inspector.querySelector("[data-property-value-row]");
        const propertyValueInput = inspector.querySelector("[data-property-value]");
        if (propertyValueRow && propertyValueInput) {
          const rawBoundValue = effectivePath.path === "name" ? this.actor.name : effectivePath.path === "img" ? this.actor.img : effectivePath.alias ? effectivePath.value : getPath(this.actor.system ?? {}, effectivePath.path);
          const aliasInfo = resolveAliasPath(this.actor, effectivePath.path);
          const propertyPath = effectivePath.virtual ? effectivePath.sourcePath : (effectivePath.alias?.type === "resource" && !aliasInfo.suffix ? `${effectivePath.path}.value` : (rawBoundValue && typeof rawBoundValue === "object" && Object.hasOwn(rawBoundValue, "value") ? `${effectivePath.path}.value` : effectivePath.path));
          const value = effectivePath.value;
          const hasPath = !!propertyPath && value !== undefined && value !== null && typeof value !== "object";
          propertyValueRow.hidden = !hasPath || one.type === "token";
          if (hasPath && one.type !== "token") {
            propertyValueInput.type = typeof value === "number" ? "number" : typeof value === "boolean" ? "checkbox" : "text";
            if (propertyValueInput.type === "checkbox") propertyValueInput.checked = value;
            else propertyValueInput.value = String(value);
            propertyValueInput.dataset.propertyPath = propertyPath;
            propertyValueInput.dataset.propertyKind = typeof value;
            propertyValueInput.disabled = effectivePath.readOnly === true || (propertyPath === "name" && one.updateSource === false);
            propertyValueInput.title = propertyValueInput.disabled ? "A edição do nome original está desativada." : "Altera a propriedade vinculada no personagem.";
          }
        }
        const resourcePaths = getResourceValuePaths(one);
        for (const [selector, path] of [["[data-config-current-value]", resourcePaths.current], ["[data-config-max-value]", resourcePaths.max]]) {
          const field = inspector.querySelector(selector);
          if (field) field.value = path ? (resolveNexusBinding(this.actor, path).value ?? 0) : 0;
        }
        const numericResourceConfig = inspector.querySelector("[data-numeric-resource-config]");
        if (numericResourceConfig) numericResourceConfig.hidden = !(["pv","pm","pe","pv-bar","pm-bar","pe-bar","pv-ring","resource-meter","sheet-resource"].includes(one.type));
      }
      const tokenEditor=inspector.querySelector("[data-token-editor]"); if(tokenEditor)tokenEditor.hidden=one?.type!=="token";
      const tokenConfig=inspector.querySelector("[data-token-configuration]"); if(tokenConfig)tokenConfig.hidden=one?.type!=="token";
      const tokenPreview=tokenEditor?.querySelector(".nexus-token-subcanvas");
      const mediaPreview=inspector.querySelector("[data-component-media-preview]");
      if (mediaPreview) {
        mediaPreview.replaceChildren();
        const mediaValue = effectivePath?.value;
        const mediaSource = mediaValue == null ? "" : String(mediaValue).trim();
        const mediaPath = effectivePath?.path ?? "";
        const forceImage = mediaPath === "img" || /(?:^|\.)(?:img|image|portrait|avatar|token)$/i.test(mediaPath) || effectivePath?.alias?.type === "image";
        const mediaType = isVideoSource(mediaSource) ? "video" : isAudioSource(mediaSource) ? "audio" : (isImageSource(mediaSource) && (forceImage || /\.(?:png|jpe?g|gif|webp|avif|svg|bmp|tiff?|ico|heic|heif|jxl)(?:[?#].*)?$/i.test(mediaSource) || /^data:image\//i.test(mediaSource))) ? "image" : "";
        if (one?.type !== "token" && mediaType) {
          const media = document.createElement(mediaType === "image" ? "img" : mediaType);
          media.src = mediaSource;
          if (mediaType === "image") { media.alt = `Prévia de ${mediaPath || "mídia"}`; media.loading = "lazy"; }
          else { media.controls = true; media.preload = "metadata"; }
          mediaPreview.append(media); mediaPreview.hidden = false;
        } else mediaPreview.hidden = true;
      }
      const frameSourceRow=inspector.querySelector("[data-token-frame-source-row]");
      if(frameSourceRow) frameSourceRow.hidden=(one?.tokenFrameMode??"solid")!=="media";
      if(tokenPreview && one?.type==="token") {
        let image=tokenPreview.querySelector(".nexus-token-portrait"), frame=tokenPreview.querySelector(".nexus-token-frame"), overlay=tokenPreview.querySelector(".nexus-token-overlay");
        const source=getTokenImageSource(this.actor, one, one.dataPath ? resolveNexusBinding(this.actor, one.dataPath).value : ""), video=isVideoSource(source);
        if(image && video!==(image.tagName==="VIDEO")){const next=document.createElement(video?"video":"img");next.className="nexus-token-portrait";if(video){next.autoplay=true;next.muted=true;next.loop=true;next.playsInline=true;}image.replaceWith(next);image=next;}
        if(image){image.src=source;if(image.tagName==="VIDEO")image.load();}
        if(frame){frame.style.borderColor=one.tokenFrameMode==="media"?"transparent":(one.tokenFrameColor??"#78b7e8");frame.style.borderWidth=`${clamp(Number(one.tokenFrameWidth??3),0,16)}px`;frame.replaceChildren();if(one.tokenFrameMode==="media"&&one.tokenFrameSource){const frameVideo=isVideoSource(one.tokenFrameSource),media=document.createElement(frameVideo?"video":"img");media.className="nexus-token-frame-media";media.src=one.tokenFrameSource;if(frameVideo){media.autoplay=true;media.muted=true;media.loop=true;media.playsInline=true;}frame.append(media);}}
        tokenPreview.dataset.shape=one.tokenShape??"circle";tokenPreview.style.setProperty("--nexus-token-bg",one.tokenBackgroundColor??"#202e3e");
        if(overlay){overlay.textContent=one.tokenOverlay??"";overlay.hidden=!one.tokenOverlay;}
      }
      const resourceEditor=inspector.querySelector("[data-sheet-resource-editor]");
      if(resourceEditor)resourceEditor.hidden=one?.type!=="sheet-resource";
      const resourceConfig=inspector.querySelector("[data-sheet-resource-config]");if(resourceConfig)resourceConfig.hidden=one?.type!=="sheet-resource";
      const attributeConfig=inspector.querySelector("[data-sheet-attribute-config]");if(attributeConfig)attributeConfig.hidden=one?.type!=="sheet-attribute";
      if(one?.type==="sheet-attribute"){const preset=inspector.querySelector('[data-component-setting="attributePreset"]');if(preset)preset.value=one.attributePreset??({"attributes.body":"body","attributes.mind":"mind","attributes.soul":"soul"}[one.dataPath]??"custom");}
      const resourceRow=inspector.querySelector("[data-component-resource-row]"),formatRow=inspector.querySelector("[data-component-format-row]");
      const isMeter=one?.type==="resource-meter" || one?.type==="asset-meter";
      if(resourceRow)resourceRow.hidden=one?.type!=="resource-meter";
      if(formatRow)formatRow.hidden=!isMeter;
      inspector.querySelectorAll("[data-component-custom-binding]").forEach(row => { row.hidden = one?.type !== "resource-meter" || one?.binding !== "custom"; });
      const identitySection = inspector.querySelector("[data-component-identity]");
      const actorNameRow = inspector.querySelector("[data-component-actor-name]");
      const customLabelRow = inspector.querySelector("[data-component-custom-label]");
      const isNameComponent = ["name", "sheet-name"].includes(one?.type);
      if (actorNameRow) actorNameRow.hidden = true;
      const updateSourceRow=inspector.querySelector("[data-component-update-source]"); if(updateSourceRow) updateSourceRow.hidden=!isNameComponent;
      const updateSourceInput=inspector.querySelector("[data-component-setting=\"updateSource\"]"); if(updateSourceInput) updateSourceInput.checked=one?.updateSource!==false;
      if (customLabelRow) customLabelRow.hidden = !one || ["token", "sheet-resource", "asset-text", "asset-notes", "asset-image", "asset-link"].includes(one.type);
      const showLabelRow = inspector.querySelector("[data-component-show-label]"); if (showLabelRow) showLabelRow.hidden = !one || ["token", "sheet-resource", "asset-text", "asset-notes", "asset-image", "asset-link"].includes(one.type);
      if (identitySection) identitySection.hidden = !isNameComponent;
      const actorNameInput = inspector.querySelector('[data-component-setting="actorName"]'); if (actorNameInput) actorNameInput.value = this.actor.name ?? "";
      const dataRow=inspector.querySelector("[data-component-data-row]"); if(dataRow)dataRow.hidden=!one || one.type === "sheet-resource";
      const dataBindingLabel=dataRow?.querySelector("[data-component-path-input]")?.closest("label"); if(dataBindingLabel){const labelText=dataBindingLabel.firstChild; if(labelText?.nodeType===Node.TEXT_NODE) labelText.textContent=one?.type==="token"?"Origem da imagem":"Propriedade relacionada";}
      const textRow=inspector.querySelector("[data-component-text-row]"); if(textRow)textRow.hidden=!(one && ["asset-text","custom-card","asset-notes","asset-field","text-field","sheet-section","sheet-attribute","sheet-skill-group"].includes(one.type));
      const tableSettings=inspector.querySelector("[data-component-table-settings]"); if(tableSettings)tableSettings.hidden=one?.type!=="asset-table";
      const placeholderRow=inspector.querySelector("[data-component-placeholder-row]"); if(placeholderRow)placeholderRow.hidden=!(["asset-field","asset-notes"].includes(one?.type));
      const contentSection=inspector.querySelector("[data-inspector-content]");
      if(contentSection)contentSection.hidden=!Array.from(contentSection.children).some(child=>child.tagName!=="H4"&&!child.hidden);
    }
  }
  _selectAll(html) { this._setSelection(html, [...html[0].querySelectorAll(".nexus-component:not([hidden])")].map(el => el.dataset.id)); }
  _mountLibrary(panel) {
    const assets = panel.querySelector("[data-library-assets]");
    if (!assets || panel.dataset.libraryMounted === "true") return;
    panel.dataset.libraryMounted = "true";
    assets.replaceChildren();
    const availableFolders = NEXUS_LIBRARY_CATALOG.categories ?? [];
    const preferredFolder = this._libraryFolder
      ?? NEXUS_LIBRARY_CATALOG.assets.find(item => item.type === this._librarySelectedType)?.category;
    this._libraryFolder = availableFolders.some(folder => folder.id === preferredFolder)
      ? preferredFolder
      : (availableFolders[0]?.id ?? "core");
    const folderNav = document.createElement("nav");
    folderNav.className = "nexus-library-folders";
    folderNav.setAttribute("aria-label", "Pastas da biblioteca");
    const folders = availableFolders.map(({ id, label, icon }) => [id, label, icon]);
    for (const [id, label, icon] of folders) {
      const button = document.createElement("button"); button.type = "button"; button.dataset.libraryFolder = id;
      button.innerHTML = `<i class="${icon}" aria-hidden="true"></i><span>${label}</span>`;
      button.classList.toggle("active", id === (this._libraryFolder ?? "core")); folderNav.append(button);
    }
    panel.querySelector(".nexus-library-workspace")?.before(folderNav);
    for (const [assetIndex, asset] of NEXUS_LIBRARY_CATALOG.assets.entries()) {
      const card = document.createElement("button");
      card.type = "button"; card.className = "nexus-library-asset";
      card.dataset.libraryAsset = `${asset.label} ${asset.keywords ?? ""}`.toLocaleLowerCase("pt-BR");
      card.dataset.libraryCategory = asset.category; card.dataset.assetType = asset.type; card.dataset.assetKey = asset.key ?? `${asset.category}-${assetIndex}`;
      const preview = document.createElement("span"); preview.className = `nexus-library-preview-stage preview-${asset.preview ?? asset.type}`;
      if (asset.type === "sheet-resource") {
        const code = String(asset.template?.sheetCode ?? "PV").toUpperCase();
        const color = asset.template?.sheetColor ?? ({ PV: "#d94b4b", PM: "#3979d8", PE: "#39a86b" })[code] ?? "#d94b4b";
        preview.append(createSheetResourcePreview({ label: asset.template?.sheetContent1 ?? code, current: 32, max: 40, color, showValues: true }));
        fitSheetResourcePreview(preview, { w: 220, h: 58 }, 120);
      }
      else if (asset.type === "token") { const token = document.createElement("span"); token.className = "nexus-library-token-preview"; token.textContent = "N"; preview.append(token); }
      else if (asset.type === "asset-notes") { const note = document.createElement("span"); note.className = "nexus-library-note-preview"; note.innerHTML = "<i></i><i></i><i></i>"; preview.append(note); }
      else if (asset.type === "custom-card") { const area = document.createElement("span"); area.className = "nexus-library-area-preview"; area.textContent = "+"; preview.append(area); }
      else if (asset.type === "sheet-section") { const marker = document.createElement("span"); marker.className = "nexus-library-marker-preview"; marker.textContent = "SEÇÃO"; preview.append(marker); }
      else if (asset.type === "asset-image") { const image = document.createElement("span"); image.className = "nexus-library-image-preview"; image.textContent = "▧"; preview.append(image); }
      else if (asset.type === "asset-meter") { const meter = document.createElement("span"); meter.className = "nexus-library-meter-preview"; meter.innerHTML = "<i></i>"; preview.append(meter); }
      else if (asset.type === "asset-text") { const text = document.createElement("span"); text.className = "nexus-library-text-preview"; text.textContent = "Texto"; preview.append(text); }
      else { const mock = document.createElement("span"); mock.className = "nexus-library-generic-preview"; mock.textContent = asset.label.slice(0,2).toUpperCase(); preview.append(mock); }
      const meta = document.createElement("span"); meta.className = "nexus-library-asset-meta";
      const label = document.createElement("strong"); label.textContent = asset.label; meta.append(label); card.append(preview, meta); assets.append(card);
    }
    for (const theme of NEXUS_LIBRARY_CATALOG.themes ?? []) {
      const card = document.createElement("button"); card.type = "button"; card.className = "nexus-library-asset nexus-library-theme-asset";
      card.dataset.libraryAsset = `${theme.label} ${theme.keywords ?? ""}`.toLocaleLowerCase("pt-BR"); card.dataset.libraryCategory = "themes"; card.dataset.libraryTheme = theme.id;
      const preview = document.createElement("span"); preview.className = "nexus-library-preview-stage nexus-theme-swatch"; preview.dataset.themeSwatch = theme.id;
      for (const color of theme.colors) { const swatch = document.createElement("i"); swatch.style.backgroundColor = color; preview.append(swatch); }
      const meta = document.createElement("span"); meta.className = "nexus-library-asset-meta"; const label = document.createElement("strong"); label.textContent = theme.label; meta.append(label); card.append(preview,meta); assets.append(card);
    }
    folderNav.addEventListener("click", event => {
      const button = event.target.closest("[data-library-folder]"); if (!button) return;
      this._libraryFolder = button.dataset.libraryFolder;
      folderNav.querySelectorAll("[data-library-folder]").forEach(item => item.classList.toggle("active", item === button));
      panel.querySelectorAll("[data-library-asset]").forEach(card => card.hidden = card.dataset.libraryCategory !== this._libraryFolder);
      const count = panel.querySelector("[data-library-count]"); const visible = [...panel.querySelectorAll("[data-library-asset]")].filter(card => !card.hidden).length;
      if (count) count.textContent = `${visible} ${visible === 1 ? "item" : "itens"}`;
      const search = panel.querySelector("[data-library-search]"); if (search) search.dispatchEvent(new Event("input", { bubbles: true }));
      const details = panel.querySelector("[data-library-details]"); if (details) { details.dataset.selectedType = ""; details.innerHTML = `<div class="nexus-library-detail-placeholder"><strong>${button.querySelector("span")?.textContent ?? "Biblioteca"}</strong><p>Selecione um item para visualizar e configurar.</p></div>`; }
    });
    assets.querySelectorAll("[data-library-theme]").forEach(card => card.hidden = (this._libraryFolder ?? "core") !== "themes");
    panel.querySelectorAll("[data-library-asset]").forEach(card => card.hidden = card.dataset.libraryCategory !== (this._libraryFolder ?? "core"));
    const count = panel.querySelector("[data-library-count]");
    if (count) count.textContent = `${NEXUS_LIBRARY_CATALOG.assets.filter(item => item.category === (this._libraryFolder ?? "core")).length} itens`;
    const remembered = this._librarySelectedAssetKey ? panel.querySelector(`[data-asset-key="${CSS.escape(this._librarySelectedAssetKey)}"]`) : null;
    remembered?.classList.add("is-selected");
  }

  _mountFloatingUI(html) {
    const root = html[0];
    this._nexusFloatingCleanup?.({ preserveWindows: true });
    const app = root.closest(".application, .window-app, .app") || root;
    document.querySelector(`[data-nexus-floating-for="${this.id}"]`)?.remove();
    const leftRail = root.querySelector(".nexus-appearance-rail");
    const sourceDrawer = root.querySelector(".nexus-appearance-drawer");
    const tabs = root.querySelector(".nexus-layout-tabs");
    const panelKeys = ["grid", "style", "component", "layers", "library", "aliases"];
    const panelTitles = { grid: "Grade e alinhamento", style: "Aparência global", component: "Propriedades", layers: "Organização", library: "Biblioteca de elementos", aliases: "Estrutura de dados" };
    const panelSizes = { grid: [330, 470], style: [340, 470], component: [360, 470], layers: [340, 470], library: [660, 640], aliases: [360, 470] };
    this._openAppearancePanels ??= new Set();
    this._nexusPanelWindows ??= new Map();

    const portal = document.createElement("div");
    portal.className = "nexus-floating-ui";
    portal.dataset.nexusFloatingFor = this.id;
    portal.style.setProperty("--nexus-accent-color", this._currentLayout?.accentColor ?? "#52647b");
    portal.style.setProperty("--nexus-highlight-color",this._currentLayout?.highlightColor??"#78b7e8");
    portal.style.setProperty("--nexus-button-color",this._currentLayout?.buttonColor??"#315b7d");
    applyThemeTokens(portal, this._currentLayout ?? DEFAULT_LAYOUT);
    portal.innerHTML = `
      <div class="nexus-floating-left" aria-label="Ferramentas da ficha">
        <div class="nexus-floating-left-rail">
          <button type="button" data-floating-panel="grid" title="Grade e alinhamento" aria-label="Grade e alinhamento"><i class="fa-solid fa-grip" aria-hidden="true"></i></button>
          <button type="button" data-floating-panel="style" title="Aparência global" aria-label="Aparência global"><i class="fa-solid fa-palette" aria-hidden="true"></i></button>
          <button type="button" data-floating-panel="component" title="Propriedades" aria-label="Propriedades"><i class="fa-solid fa-sliders" aria-hidden="true"></i></button>
          <button type="button" data-floating-panel="library" title="Biblioteca de elementos" aria-label="Biblioteca de elementos"><i class="fa-solid fa-book-open" aria-hidden="true"></i></button>
          <button type="button" data-floating-panel="layers" title="Organização" aria-label="Organização"><i class="fa-solid fa-layer-group" aria-hidden="true"></i></button>
          <button type="button" data-floating-panel="aliases" title="Estrutura de dados" aria-label="Estrutura de dados"><i class="fa-solid fa-diagram-project" aria-hidden="true"></i></button>
        </div>
      </div>
      <div class="nexus-floating-right" aria-label="Navegação de páginas">
        <div class="nexus-floating-tabs"></div>
        <button type="button" class="nexus-floating-add" data-floating-new-layout title="Adicionar página">＋</button>
      </div>`;
    document.body.appendChild(portal);

    const panels = new Map();
    for (const key of panelKeys) {
      const panel = sourceDrawer?.querySelector(`[data-tool-panel="${key}"]`);
      if (!panel) continue;
      panel.hidden = false;
      panel.classList.add("nexus-native-panel-content");
      panels.set(key, panel);
    }
    sourceDrawer?.remove();
    leftRail?.remove();
    if (tabs) portal.querySelector(".nexus-floating-tabs").append(tabs);
    const floatingTabs = portal.querySelector(".nexus-floating-tabs");
    let pendingLayoutClick = null;
    floatingTabs?.addEventListener("click", async event => {
      const tab = event.target.closest(".nexus-layout-tab");
      if (!tab || !floatingTabs.contains(tab)) return;
      if (pendingLayoutClick) clearTimeout(pendingLayoutClick);
      if (event.detail > 1) return;
      pendingLayoutClick = setTimeout(() => {
        pendingLayoutClick = null;
        this._switchLayout(tab.dataset.layoutId);
      }, 180);
    });
    floatingTabs?.addEventListener("dblclick", event => {
      const tab = event.target.closest(".nexus-layout-tab");
      if (!tab || !floatingTabs.contains(tab)) return;
      if (pendingLayoutClick) clearTimeout(pendingLayoutClick);
      pendingLayoutClick = null;
      event.preventDefault(); event.stopPropagation(); event.stopImmediatePropagation();
      this._editLayoutTab(tab.dataset.layoutId);
    }, true);
    root.querySelector(".nexus-sidebar-left")?.remove();
    root.querySelector(".nexus-sidebar-right")?.remove();
    root.querySelector(".nexus-workspace")?.classList.add("nexus-workspace-clean");

    const left = portal.querySelector(".nexus-floating-left");
    const right = portal.querySelector(".nexus-floating-right");
    const setActivePanel = key => {
      const activeKey = key && this._nexusPanelWindows.has(key) ? key : null;
      this._activePanelWindowKey = activeKey;
      portal.querySelectorAll("[data-floating-panel]").forEach(button => {
        button.classList.toggle("active", button.dataset.floatingPanel === activeKey);
      });
      for (const [panelKey, instance] of this._nexusPanelWindows) {
        instance.element?.classList.toggle("nexus-window-active", panelKey === activeKey);
      }
    };
    const setMode = () => {
      if (this._mode) root.dataset.mode = this._mode;
      const appearance = root.dataset.mode === "appearance";
      left.hidden = !appearance;
      portal.querySelector(".nexus-floating-add").hidden = !appearance;
      if (!appearance) {
        setActivePanel(null);
        for (const [key, instance] of [...this._nexusPanelWindows]) {
          this._openAppearancePanels.delete(key);
          instance.close();
        }
        this._nexusPanelWindows.clear();
      }
    };

    const syncRailFocus = (focused = false) => {
      if (!portal.isConnected) return;
      const z = Number.parseInt(app.style.zIndex || getComputedStyle(app).zIndex, 10);
      // O portal acompanha a ficha: fica logo acima dela, mas abaixo de qualquer
      // ApplicationV2 que tenha recebido foco depois da ficha.
      portal.style.setProperty("z-index", String(Math.max(1, (Number.isFinite(z) ? z : 100) - 1)), "important");
      portal.classList.toggle("is-sheet-focused", focused);
    };
    const positionRails = () => {
      if (!app.isConnected || !portal.isConnected) return;
      const r = app.getBoundingClientRect();
      const leftW = 42, rightW = 58;
      this._appearanceRailOffsets ??= { left: { x: -51, y: 72 }, right: { x: 9, y: 72 } };
      const lo = this._appearanceRailOffsets.left, ro = this._appearanceRailOffsets.right;
      const lx = clamp(r.left + lo.x, 4, Math.max(4, window.innerWidth - leftW - 4));
      const ly = clamp(r.top + lo.y, 8, Math.max(8, window.innerHeight - 100));
      const rx = clamp(r.right + ro.x, 4, Math.max(4, window.innerWidth - rightW - 4));
      const ry = clamp(r.top + ro.y, 8, Math.max(8, window.innerHeight - 100));
      Object.assign(left.style, { position: "fixed", left: `${lx}px`, top: `${ly}px`, maxHeight: `${Math.max(160, window.innerHeight - ly - 12)}px` });
      Object.assign(right.style, { position: "fixed", left: `${rx}px`, top: `${ry}px`, maxHeight: `${Math.max(160, window.innerHeight - ry - 12)}px` });
    };
    const onDocumentPointerDown = event => {
      const target = event.target;
      const panelElement = target?.closest?.(".nexus-panel-window");
      if (panelElement) {
        const panelKey = [...this._nexusPanelWindows].find(([, instance]) => instance.element === panelElement)?.[0] ?? null;
        setActivePanel(panelKey);
        syncRailFocus(false);
        return;
      }
      const sheetWasFocused = app.contains(target) || left?.contains(target) || right?.contains(target);
      setActivePanel(null);
      if (sheetWasFocused) {
        syncRailFocus(true);
        positionRails();
      } else {
        // A janela clicada fora do NEXUS deve continuar sob controle do Foundry.
        syncRailFocus(false);
      }
    };
    document.addEventListener("pointerdown", onDocumentPointerDown, true);
    const onDocumentFocusIn = event => {
      const panelElement = event.target?.closest?.(".nexus-panel-window");
      if (panelElement) {
        const panelKey = [...this._nexusPanelWindows].find(([, instance]) => instance.element === panelElement)?.[0] ?? null;
        setActivePanel(panelKey);
      } else if (app.contains(event.target)) {
        setActivePanel(null);
      }
    };
    document.addEventListener("focusin", onDocumentFocusIn, true);

    const focusPanelWindow = instance => {
      if (!instance?.rendered || !instance.element) return;
      instance.bringToFront?.();
      setActivePanel(instance.panelKey);
      const element = instance.element;
      element.setAttribute("tabindex", "-1");
      // ApplicationV2 gerencia a pilha de janelas. Não calculamos um z-index
      // global próprio, pois isso fazia painéis do NEXUS sobreporem aplicações
      // alheias à interação atual.
      requestAnimationFrame(() => {
        if (!element.isConnected) return;
        element.focus({ preventScroll: true });
        element.dispatchEvent(new Event("nexus:activate", { bubbles: true }));
        setActivePanel(instance.panelKey);
      });
    };

    const openPanel = (key, { focus = true } = {}) => {
      const panel = panels.get(key);
      if (!panel) return;
      // A Biblioteca só constrói os cartões e suas prévias quando solicitada.
      if (key === "library") {
        this._mountLibrary(panel);
        this._libraryApplyFilter?.();
        this._libraryRestoreSelection?.();
      }
      const current = this._nexusPanelWindows.get(key);
      if (current) {
        current.setPanel(panel);
        if (current.rendered && focus) {
          focusPanelWindow(current);
          syncRailFocus(false);
        }
        return;
      }
      const [baseWidth, baseHeight] = panelSizes[key] ?? [420, 560];
      const width = Math.min(baseWidth, window.innerWidth - 32);
      const height = Math.min(baseHeight, window.innerHeight - 48);
      const offset = panelKeys.indexOf(key) * 28;
      const instance = new NexusPanelWindow({
        sheet: this, key, panel, title: panelTitles[key], width, height,
        left: Math.max(8, Math.round((window.innerWidth - width) / 2 + offset)),
        top: Math.max(8, Math.round((window.innerHeight - height) / 2 + offset))
      });
      this._nexusPanelWindows.set(key, instance);
      this._openAppearancePanels.add(key);
      instance.render({ force: true }).then(() => {
        applyThemeTokens(instance.element, this._currentLayout ?? DEFAULT_LAYOUT);
        focusPanelWindow(instance);
        syncRailFocus(false);
      }).catch(error => {
        console.error(`NEXUS | Falha ao abrir janela ${key}`, error);
        this._onPanelWindowClosed(key, instance);
      });
    };

    const requestPanel = key => {
      if (root.dataset.mode !== "appearance") {
        this._openAppearancePanels.add(key);
        this._setMode("appearance");
        return;
      }
      syncRailFocus(true);
      const instance = this._nexusPanelWindows.get(key);
      if (instance?.rendered) {
        focusPanelWindow(instance);
        syncRailFocus(false);
      } else openPanel(key);
    };
    portal.querySelectorAll("[data-floating-panel]").forEach(button => button.addEventListener("click", () => {
      if (root.dataset.mode !== "appearance") return;
      requestPanel(button.dataset.floatingPanel);
    }));
    root.querySelectorAll("[data-editor-open-panel]").forEach(button => button.addEventListener("click", () => {
      requestPanel(button.dataset.editorOpenPanel);
    }));
    root.querySelectorAll("[data-editor-mode]").forEach(button => button.addEventListener("click", () => {
      this._setMode(button.dataset.editorMode);
    }));
    root.querySelectorAll("[data-editor-insert]").forEach(button => button.addEventListener("click", async () => {
      const type = button.dataset.editorInsert;
      if (root.dataset.mode !== "appearance") await this._setMode("appearance");
      await this._addComponent(type);
      root.querySelectorAll("[data-editor-insert]").forEach(item => item.classList.toggle("is-active", item === button));
    }));
    root.querySelector("[data-editor-fit]")?.addEventListener("click", () => {
      const scroller = root.querySelector(".nexus-canvas-scroll");
      if (!scroller) return;
      scroller.scrollTo({ left: Math.max(0, (scroller.scrollWidth - scroller.clientWidth) / 2), top: Math.max(0, (scroller.scrollHeight - scroller.clientHeight) / 2), behavior: "smooth" });
    });
    portal.querySelector("[data-floating-new-layout]")?.addEventListener("click", () => this._newLayout());
    setMode();
    positionRails();
    if (root.dataset.mode === "appearance") syncRailFocus(true);
    requestAnimationFrame(() => { setMode(); positionRails(); });
    const resizeObserver = typeof ResizeObserver !== "undefined" ? new ResizeObserver(positionRails) : null;
    resizeObserver?.observe(app);
    const moveObserver = typeof MutationObserver !== "undefined" ? new MutationObserver(positionRails) : null;
    moveObserver?.observe(app, { attributes: true, attributeFilter: ["style", "class"] });
    window.addEventListener("resize", positionRails);
    window.addEventListener("scroll", positionRails, true);

    this._nexusFloatingCleanup = ({ preserveWindows = true } = {}) => {
      resizeObserver?.disconnect(); moveObserver?.disconnect();
      window.removeEventListener("resize", positionRails);
      window.removeEventListener("scroll", positionRails, true);
      document.removeEventListener("pointerdown", onDocumentPointerDown, true);
      document.removeEventListener("focusin", onDocumentFocusIn, true);
      if (!preserveWindows) {
        for (const instance of this._nexusPanelWindows.values()) instance.close();
        this._nexusPanelWindows.clear();
      }
      portal.remove();
    };

    // Reassocia os novos painéis renderizados às janelas existentes sem focá-las.
    for (const key of [...this._openAppearancePanels]) openPanel(key, { focus: false });
    // Actor updates can rerender the sheet while a floating panel is being
    // edited. Restore the panel's stacking order without stealing input focus.
    const activePanelKey = this._activePanelWindowKey;
    if (activePanelKey) requestAnimationFrame(() => {
      const activePanel = this._nexusPanelWindows.get(activePanelKey);
      if (!portal.isConnected || !activePanel?.rendered) return;
      activePanel.bringToFront?.();
      setActivePanel(activePanelKey);
    });
    if (this._pendingLibraryViewport) {
      const viewport = this._pendingLibraryViewport;
      requestAnimationFrame(() => requestAnimationFrame(() => this._restoreLibraryViewport(viewport)));
    }
  }

  _onPanelWindowClosed(key, instance) {
    if (this._nexusPanelWindows?.get(key) === instance) this._nexusPanelWindows.delete(key);
    this._openAppearancePanels?.delete(key);
    if (this._activePanelWindowKey === key) this._activePanelWindowKey = null;
    document.querySelector(`[data-nexus-floating-for="${this.id}"] [data-floating-panel="${key}"]`)?.classList.remove("active");
  }

  _onClose(options) {
    this._nexusKeyCleanup?.(); this._nexusInspectorKeyCleanup?.();
    if (this._nexusInspectorNamespace) $(document).off(this._nexusInspectorNamespace);
    this._nexusFloatingCleanup?.();
    for (const instance of this._nexusPanelWindows?.values?.() ?? []) instance.close();
    this._nexusPanelWindows?.clear?.();
    return super._onClose(options);
  }

  _activateCanvas(html) {
    this._nexusKeyCleanup?.(); this._nexusKeyCleanup = null;
    const sheet = this, root = html[0], canvas = root.querySelector(".nexus-canvas"); if (!canvas) return;
    this._selectedIds ??= new Set();
    const selectionBox = root.querySelector(".nexus-marquee"), guides = root.querySelector(".nexus-guides");
    const layoutData = () => ({ width: Number(canvas.dataset.layoutWidth) || 800, height: Number(canvas.dataset.layoutHeight) || 800, grid: Number(canvas.dataset.gridSize) || 20, snap: canvas.dataset.snap === "true", smart: canvas.dataset.guides === "true" });
    const stage = root.querySelector(".nexus-canvas-stage");
    const fitCanvas = () => {
      if (!stage) return;
      const l = layoutData();
      const sx = Math.max(1, stage.clientWidth - 24) / l.width;
      const sy = Math.max(1, stage.clientHeight - 24) / l.height;
      const scale = clamp(Math.min(sx, sy), 0.25, 1.5);
      canvas.style.zoom = String(Number(scale.toFixed(4)));
    };
    sheet._fitNexusCanvas = fitCanvas;
    const fitObserver = stage && typeof ResizeObserver !== "undefined" ? new ResizeObserver(fitCanvas) : null;
    fitObserver?.observe(stage); requestAnimationFrame(fitCanvas);
    const layout = sheet._currentLayout ?? {};
    applyThemeTokens(root.querySelector(".nexus-sheet"), layout);
    canvas.style.setProperty("--nexus-font-size", `${layout.fontSize ?? 13}px`);
    canvas.style.setProperty("--nexus-secondary-font-size", `${layout.secondaryFontSize ?? 11}px`);
    canvas.style.setProperty("--nexus-value-font-size", `${layout.valueFontSize ?? 20}px`);
    canvas.style.setProperty("--nexus-canvas-color", layout.canvasColor ?? "#171f2a");
    canvas.style.setProperty("--nexus-card-color", layout.cardColor ?? "#273443");
    canvas.style.setProperty("--nexus-accent-color", layout.accentColor ?? "#52647b");
    canvas.style.setProperty("--nexus-highlight-color", layout.highlightColor ?? "#78b7e8");
    canvas.style.setProperty("--nexus-button-color", layout.buttonColor ?? "#315b7d");
    applyThemeTokens(canvas, layout);
    const appWindow=root.closest(".application, .window-app"); appWindow?.style.setProperty("--nexus-font-family",`"${layout.fontFamily ?? "Inter"}", sans-serif`); appWindow?.style.setProperty("--nexus-highlight-color",layout.highlightColor??"#78b7e8"); appWindow?.style.setProperty("--nexus-button-color",layout.buttonColor??"#315b7d");
    const point = e => { const r = canvas.getBoundingClientRect(), l = layoutData(); return { x: (e.clientX-r.left)*(l.width/r.width), y: (e.clientY-r.top)*(l.height/r.height) }; };
    const elements = () => [...canvas.querySelectorAll(".nexus-component")];
    const rectOf = el => ({ x: parseFloat(el.style.left)||0, y: parseFloat(el.style.top)||0, w: parseFloat(el.style.width)||el.offsetWidth, h: parseFloat(el.style.height)||el.offsetHeight });
    const clampBox = (b,l) => { b.w=Math.max(20,Math.min(b.w,l.width-b.x)); b.h=Math.max(20,Math.min(b.h,l.height-b.y)); b.x=clamp(b.x,0,l.width-b.w); b.y=clamp(b.y,0,l.height-b.h); return b; };
    const clearGuides = () => { if (guides) guides.replaceChildren(); };
    const drawGuides = lines => {
      if (!guides) return;
      guides.replaceChildren(...lines.flatMap(g => {
        const line = document.createElement("i"); line.className = g.axis;
        if (g.axis === "v") Object.assign(line.style, { left: `${g.pos}px`, top: "0", height: `${layoutData().height}px` });
        else Object.assign(line.style, { top: `${g.pos}px`, left: "0", width: `${layoutData().width}px` });
        if (!Number.isFinite(g.distance)) return [line];
        const label = document.createElement("span"); label.className = "nexus-guide-distance"; label.textContent = `${Math.round(g.distance)} px`;
        if (g.axis === "v") Object.assign(label.style, { left: `${g.pos + 7}px`, top: `${g.labelAt ?? 8}px` });
        else Object.assign(label.style, { left: `${g.labelAt ?? 8}px`, top: `${g.pos + 7}px` });
        return [line, label];
      }));
    };
    const anchors = (r,axis) => axis==="x" ? [r.x,r.x+r.w/2,r.x+r.w] : [r.y,r.y+r.h/2,r.y+r.h];
    const otherRects = excluded => {
      const out=elements().filter(el=>!el.hidden&&!excluded.has(el.dataset.id)).map(rectOf);
      for(const g of (sheet._activeGroups ?? [])) { const ids=(g.componentIds??[]).filter(id=>!excluded.has(id)); if(ids.length){const rs=elements().filter(el=>!el.hidden&&ids.includes(el.dataset.id)).map(rectOf); if(rs.length){const x=Number.isFinite(g.x)?g.x:Math.min(...rs.map(r=>r.x)),y=Number.isFinite(g.y)?g.y:Math.min(...rs.map(r=>r.y)),R=Math.max(Number.isFinite(g.w)?x+g.w:0,...rs.map(r=>r.x+r.w)),B=Math.max(Number.isFinite(g.h)?y+g.h:0,...rs.map(r=>r.y+r.h));out.push({x,y,w:R-x,h:B-y});}} }
      return out;
    };
    // Cada caixa usa nove pontos de referência. A grade é aplicada primeiro; o guia inteligente faz o ajuste fino depois.
    const bestMatch = (sources, targets, axis, tolerance=7) => {
      let best=null;
      for(const source of sources) for(const own of anchors(source,axis)) for(const target of targets) for(const other of anchors(target,axis)) {
        const delta = other - own;
        if (Math.abs(delta) <= tolerance && (!best || Math.abs(delta) < Math.abs(best.delta))) {
          const gapX = Math.max(0, target.x - (source.x + source.w), source.x - (target.x + target.w));
          const gapY = Math.max(0, target.y - (source.y + source.h), source.y - (target.y + target.h));
          const labelY = source.y + source.h <= target.y ? (source.y + source.h + target.y) / 2 : target.y + target.h <= source.y ? (target.y + target.h + source.y) / 2 : (Math.max(source.y, target.y) + Math.min(source.y + source.h, target.y + target.h)) / 2;
          const labelX = source.x + source.w <= target.x ? (source.x + source.w + target.x) / 2 : target.x + target.w <= source.x ? (target.x + target.w + source.x) / 2 : (Math.max(source.x, target.x) + Math.min(source.x + source.w, target.x + target.w)) / 2;
          best = { delta, pos: other, distance: axis === "x" ? gapY : gapX, labelAt: axis === "x" ? labelY : labelX };
        }
      }
      return best;
    };
    const alignMove = (starts, dx, dy, targets) => {
      const moved=starts.map(s=>({x:s.x+dx,y:s.y+dy,w:s.w,h:s.h}));
      const mx=bestMatch(moved,targets,"x"),my=bestMatch(moved,targets,"y");
      const lines=[];if(mx) {dx+=mx.delta;lines.push({axis:"v",pos:mx.pos,distance:mx.distance,labelAt:mx.labelAt});}if(my){dy+=my.delta;lines.push({axis:"h",pos:my.pos,distance:my.distance,labelAt:my.labelAt});}drawGuides(lines);return {dx,dy};
    };
    const alignResize = (box, targets, direction) => {
      const lines=[];
      for(const axis of ["x","y"]){
        const edge=axis==="x"?(direction.includes("w")?"w":direction.includes("e")?"e":null):(direction.includes("n")?"n":direction.includes("s")?"s":null);
        if(!edge)continue;
        const start=axis==="x"?box.x:box.y, size=axis==="x"?box.w:box.h;
        // O ponto fixo do lado oposto permanece parado; a borda e o centro móvel podem encaixar nos três pontos-alvo.
        const candidates=edge==="e"||edge==="s"?[{v:start+size,factor:1},{v:start+size/2,factor:0.5}]:[{v:start,factor:1},{v:start+size/2,factor:0.5}];
        let best=null;
        for(const own of candidates)for(const target of targets)for(const other of anchors(target,axis)){
          const delta=other-own.v;if(Math.abs(delta)<=7&&(!best||Math.abs(delta)<Math.abs(best.delta)))best={delta,pos:other,factor:own.factor};
        }
        if(best){const amount=best.delta/best.factor;if(axis==="x"){if(edge==="w"){box.x+=amount;box.w-=amount;}else box.w+=amount;}else{if(edge==="n"){box.y+=amount;box.h-=amount;}else box.h+=amount;}lines.push({axis:axis==="x"?"v":"h",pos:best.pos});}
      }
      drawGuides(lines);return box;
    };
    const edgeAt = (el,e) => {
      const r=el.getBoundingClientRect(), x=e.clientX-r.left, y=e.clientY-r.top, t=7;
      const n=y<=t,s=y>=r.height-t,w=x<=t, east=x>=r.width-t;
      return `${n?"n":s?"s":""}${w?"w":east?"e":""}` || null;
    };
    // Renderiza superfícies de grupo sem transformar os membros em um único bloco de dados.
    const renderGroups = () => {
      // Desmonta os contêineres anteriores sem perder os componentes; a reconstrução
      // mantém as coordenadas absolutas relativas ao Canvas (wrapper ocupa 100%).
      canvas.querySelectorAll(".nexus-group-container").forEach(container => {
        container.querySelectorAll(".nexus-component").forEach(component => canvas.append(component));
        container.remove();
      });
      canvas.querySelectorAll(".nexus-group-surface").forEach(e=>e.remove());
      elements().forEach(el => {
        delete el.dataset.groupId;
        el.classList.remove("is-group-member", "is-group-inspecting");
        el.style.removeProperty("--nexus-group-bg");
        el.style.removeProperty("--nexus-group-border");
        el.style.removeProperty("--nexus-group-radius");
      });
      const layouts=sheet._currentLayout?.groups ?? [];
      sheet._activeGroups=layouts;
      for(const g of layouts){const members=elements().filter(el=>!el.hidden&&(g.componentIds??[]).includes(el.dataset.id)); if(!members.length)continue;
        const rs=members.map(rectOf),contentX=Math.min(...rs.map(r=>r.x)),contentY=Math.min(...rs.map(r=>r.y)),contentR=Math.max(...rs.map(r=>r.x+r.w)),contentB=Math.max(...rs.map(r=>r.y+r.h));
        // A superfície do grupo coincide exatamente com a caixa envolvente dos filhos: sem padding invisível.
        const x=contentX,y=contentY,R=contentR,B=contentB;
        g.x=x;g.y=y;g.w=R-x;g.h=B-y;
        const container=document.createElement("div");container.className="nexus-group-container";container.dataset.groupContainer=g.id;
        const surface=document.createElement("div");surface.className=`nexus-group-surface${g.hidden?" is-layer-hidden":""}${g.locked?" is-locked":""}`;surface.dataset.groupId=g.id;surface.hidden=!!g.hidden;
        const baseZ = Math.min(...members.map(el => Number(el.style.zIndex) || 1));
        Object.assign(surface.style,{
          left:`${x}px`,top:`${y}px`,width:`${R-x}px`,height:`${B-y}px`,
          zIndex:String(Math.max(0, baseZ - 1))
        });
        surface.style.setProperty("--nexus-group-bg",g.backgroundColor??sheet._currentLayout?.cardColor??"#273443");
        surface.style.setProperty("--nexus-group-border",g.borderColor??"#52647b");
        surface.style.setProperty("--nexus-group-radius",`${clamp(Number(g.borderRadius??8),0,32)}px`);
        container.append(surface);
        members.forEach(el=>{
          el.dataset.groupId=g.id;
          el.classList.add("is-group-member");
          container.append(el);
        });
        canvas.insertBefore(container,canvas.firstChild);
      }
    };
    const updateConnectedCorners = () => {
      const corners = [
        ["tl", r => ({x:r.left,y:r.top})], ["tr", r => ({x:r.right,y:r.top})],
        ["br", r => ({x:r.right,y:r.bottom})], ["bl", r => ({x:r.left,y:r.bottom})]
      ];
      const apply = (nodes, prefix) => {
        const squareClasses = corners.map(([name]) => `${prefix}-corner-square-${name}`);
        nodes.forEach(node => node.classList.remove(...squareClasses));
        const rects = nodes.filter(node => !node.hidden).map(node => ({node,rect:node.getBoundingClientRect()}));
        const tolerance = 2.5;
        const pointTouchesBorder = (point, rect) => {
          const onHorizontal = (Math.abs(point.y-rect.top)<=tolerance || Math.abs(point.y-rect.bottom)<=tolerance) && point.x>=rect.left-tolerance && point.x<=rect.right+tolerance;
          const onVertical = (Math.abs(point.x-rect.left)<=tolerance || Math.abs(point.x-rect.right)<=tolerance) && point.y>=rect.top-tolerance && point.y<=rect.bottom+tolerance;
          return onHorizontal || onVertical;
        };
        for (let i=0;i<rects.length;i++) for (let j=0;j<rects.length;j++) {
          if(i===j) continue;
          const a=rects[i],b=rects[j];
          // Componentes interagem apenas com componentes soltos ou do mesmo grupo.
          // Superfícies de grupo interagem apenas com outras superfícies de grupo.
          if(prefix==="nexus-component" && (a.node.dataset.groupId||null)!==(b.node.dataset.groupId||null)) continue;
          if(prefix==="nexus-component" && (a.node.dataset.groupId||null)===(b.node.dataset.groupId||null) && a.node.dataset.groupId) {
            const groupId=a.node.dataset.groupId;
            const group=(sheet._activeGroups??[]).find(item=>item.id===groupId);
            const groupSelected=!!group && (group.componentIds??[]).some(id=>sheet._selectedIds?.has(id));
            if(!groupSelected && !sheet._nexusInteractionActive) continue;
          }
          for(const [name,getPoint] of corners){
            if(pointTouchesBorder(getPoint(a.rect),b.rect)) a.node.classList.add(`${prefix}-corner-square-${name}`);
          }
        }
      };
      apply(elements(),"nexus-component");
      apply([...canvas.querySelectorAll(".nexus-group-surface")],"nexus-group");
    };
    let cornerFrame = 0;
    const scheduleConnectedCorners = () => {
      if (cornerFrame) return;
      cornerFrame = requestAnimationFrame(() => { cornerFrame = 0; updateConnectedCorners(); });
    };
    const syncGroupBounds = () => {
      for (const g of (sheet._activeGroups ?? [])) {
        const members = elements().filter(el => !el.hidden && (g.componentIds ?? []).includes(el.dataset.id));
        if (!members.length) continue;
        const rs = members.map(rectOf), x = Math.min(...rs.map(r=>r.x)), y = Math.min(...rs.map(r=>r.y));
        const right = Math.max(...rs.map(r=>r.x+r.w)), bottom = Math.max(...rs.map(r=>r.y+r.h));
        Object.assign(g,{x,y,w:right-x,h:bottom-y});
        const surface = canvas.querySelector(`.nexus-group-surface[data-group-id="${g.id}"]`);
        if (surface) {
          Object.assign(surface.style,{left:`${x}px`,top:`${y}px`,width:`${right-x}px`,height:`${bottom-y}px`});
          surface.style.setProperty("--nexus-group-bg",g.backgroundColor??sheet._currentLayout?.cardColor??"#273443");
          surface.style.setProperty("--nexus-group-border",g.borderColor??"#52647b");
          surface.style.setProperty("--nexus-group-radius",`${clamp(Number(g.borderRadius??8),0,32)}px`);
        }
      }
      scheduleConnectedCorners();
    };
    // Layout comes from the rendered context, avoiding an asynchronous race during listener setup.
    sheet._currentLayout = sheet._currentLayout ?? {groups:[]};
    try {
      const raw = sheet.actor.getFlag("nexus", "layouts") ?? {};
      sheet._currentLayout = raw[sheet._activeLayoutId()] ?? sheet._currentLayout;
    } catch (error) {
      console.warn("NEXUS | Não foi possível recuperar o layout ativo durante a montagem dos grupos", error);
    }
    renderGroups();
    updateConnectedCorners();
    const sizeReadout = document.createElement("div"); sizeReadout.className = "nexus-resize-readout"; sizeReadout.hidden = true; canvas.append(sizeReadout);
    const inspectorWindow = document.querySelector(`[data-nexus-floating-for="${sheet.id}"]`);
    inspectorWindow?.addEventListener("pointerdown", event => { if (event.target.closest(".nexus-panel-window")) { sheet._nexusInteractionActive = false; event.stopPropagation(); } }, true);
    const contextMenu = document.createElement("div"); contextMenu.className = "nexus-context-menu"; contextMenu.hidden = true;
    contextMenu.innerHTML = `<button type="button" data-context-action="add-card">Adicionar card</button><hr><button type="button" data-context-action="edit">Propriedades</button><hr><button type="button" data-context-action="group">Agrupar seleção</button><button type="button" data-context-action="link">Criar vínculo</button><button type="button" data-context-action="ungroup">Desagrupar</button><hr><button type="button" data-context-action="duplicate">Duplicar</button><button type="button" data-context-action="front">Trazer para frente</button><button type="button" data-context-action="back">Enviar para trás</button><hr><button type="button" data-context-action="delete" class="danger">Excluir</button>`;
    root.append(contextMenu);
    const closeContext = () => { contextMenu.hidden = true; };
    contextMenu.addEventListener("click", async event => {
      event.preventDefault(); event.stopPropagation();
      const action = event.target.closest("[data-context-action]")?.dataset.contextAction; if (!action) return; closeContext();
      const ids=[...(sheet._selectedIds??[])];
      if(action==="add-card"){await sheet._addComponent("custom-card", { template: { customLabel: "Card", text: "" } });return;}
      if(action==="edit"){sheet._mode="appearance";sheet._selectedGroupId=null;sheet._openAppearancePanels??=new Set();sheet._openAppearancePanels.add("component");sheet.render({force:true});}
      if(action==="group") await sheet._groupSelection($(root));
      if(action==="link") await sheet._createComponentLink(ids);
      if(action==="ungroup") await sheet._ungroupSelection($(root));
      if(action==="duplicate") await sheet._duplicateComponents(ids);
      if(action==="front") await sheet._changeLayer("front");
      if(action==="back") await sheet._changeLayer("back");
      if(action==="delete") await sheet._deleteComponents(ids);
    });
    root.addEventListener("pointerdown", event => { if(!contextMenu.contains(event.target)) closeContext(); }, true);
    canvas.addEventListener("contextmenu", event => {
      if(sheet._mode!=="appearance") return; event.preventDefault(); event.stopPropagation();
      const component=event.target.closest(".nexus-component");
      const groupSurface=event.target.closest(".nexus-group-surface");
      if(component && !sheet._selectedIds.has(component.dataset.id)) setSelection([component.dataset.id]);
      else if(groupSurface){const group=(sheet._activeGroups??[]).find(item=>item.id===groupSurface.dataset.groupId);if(group)setSelection(group.componentIds??[]);}
      const count=sheet._selectedIds?.size??0;
      contextMenu.querySelector('[data-context-action="group"]').disabled=count<2;
      contextMenu.querySelector('[data-context-action="link"]').disabled=count<2;
      contextMenu.querySelector('[data-context-action="ungroup"]').disabled=!(sheet._selectedGroupId || (sheet._activeGroups??[]).some(g=>(g.componentIds??[]).every(id=>sheet._selectedIds.has(id))));
      contextMenu.querySelector('[data-context-action="edit"]').disabled=count!==1;
      contextMenu.querySelectorAll('[data-context-action="duplicate"],[data-context-action="front"],[data-context-action="back"],[data-context-action="delete"]').forEach(b=>{b.disabled=count===0;});
      contextMenu.hidden=false; contextMenu.style.left=`${Math.min(event.clientX-root.getBoundingClientRect().left,root.clientWidth-210)}px`; contextMenu.style.top=`${Math.min(event.clientY-root.getBoundingClientRect().top,root.clientHeight-260)}px`;
    });
    let gesture=null;
    // Centraliza a seleção no método da ficha. A implementação compartilhada
    // protege o inspetor quando o painel ainda não está montado em uma janela.
    const setSelection = ids => {
      const selectedIds = Array.from(ids ?? []).filter(Boolean);
      sheet._setSelection($(root), selectedIds);
      scheduleConnectedCorners();
      canvas.querySelectorAll(".nexus-group-surface").forEach(surface => {
        const group = (sheet._activeGroups ?? []).find(item => item.id === surface.dataset.groupId);
        const hasSelectedMember = !!group && (group.componentIds ?? []).some(id => sheet._selectedIds?.has(id));
        surface.classList.toggle("is-selected", surface.dataset.groupId === sheet._selectedGroupId || hasSelectedMember);
      });
    };
    setSelection([...sheet._selectedIds]);
    let lastComponentPointerDown = { id: null, at: 0 };
    let suppressNativeDoubleClickUntil = 0;
    const openComponentInspector = () => {
      sheet._openAppearancePanels ??= new Set();
      sheet._openAppearancePanels.add("component");
      const portal = document.querySelector(`[data-nexus-floating-for="${sheet.id}"]`);
      const button = portal?.querySelector('[data-floating-panel="component"]');
      const sync = () => {
        const current = sheet._nexusPanelWindows?.get("component");
        if (!current?.rendered) return false;
        current.bringToFront?.();
        current.element?.setAttribute?.("tabindex", "-1");
        if (current.element) current.element.focus({ preventScroll: true });
        const selected = sheet._componentEditorTargetId ? [sheet._componentEditorTargetId] : [...(sheet._selectedIds ?? [])];
        sheet._setSelection?.($(sheet.element), selected);
        return true;
      };
      if (sync()) return;
      button?.click();
      // Panel creation is asynchronous in ApplicationV2; retry on the next frames
      // instead of trying to populate a detached template before it is mounted.
      let attempts = 0;
      const waitForPanel = () => {
        if (sync() || ++attempts >= 30) return;
        requestAnimationFrame(waitForPanel);
      };
      requestAnimationFrame(waitForPanel);
    };
    root.addEventListener("dblclick", event => {
      if (performance.now() < suppressNativeDoubleClickUntil) return;
      if (sheet._mode !== "appearance") return;
      const target = event.target instanceof Element ? event.target : event.target?.parentElement;
      const component = target?.closest(".nexus-component");
      const surface = target?.closest(".nexus-group-surface");
      if (!canvas.contains(component ?? surface)) return;
      if (component) {
        sheet._componentEditorTargetId = component.dataset.id;
        setSelection([component.dataset.id]);
      } else {
        const group = (sheet._activeGroups ?? []).find(item => item.id === surface.dataset.groupId);
        if (!group) return;
        setSelection(group.componentIds ?? []);
      }
      event.preventDefault(); event.stopPropagation(); event.stopImmediatePropagation?.();
      openComponentInspector();
    }, true);
    const saveAfterGesture = async touched => { await sheet._saveCanvas(html, touched); };
    const beginGroupMove = (group, p, event) => {
      if (!group || group.locked || (group.componentIds ?? []).some(id => sheet._currentLayout?.components?.find(component => component.id === id)?.locked)) return false;
      setSelection(group.componentIds ?? []);
      sheet._selectedGroupId = group.id;
      const starts = elements().filter(el => (group.componentIds ?? []).includes(el.dataset.id)).map(el => ({ el, ...rectOf(el) }));
      if (!starts.length) return false;
      const bounds = {
        x: Math.min(...starts.map(item => item.x)),
        y: Math.min(...starts.map(item => item.y)),
        w: Math.max(...starts.map(item => item.x + item.w)) - Math.min(...starts.map(item => item.x)),
        h: Math.max(...starts.map(item => item.y + item.h)) - Math.min(...starts.map(item => item.y))
      };
      gesture = { type: "group-move", start: p, starts, group, groupStart: bounds };
      canvas.setPointerCapture(event.pointerId);
      event.preventDefault();
      return true;
    };
    canvas.tabIndex = 0;
    canvas.addEventListener("pointerdown",event=>{
      if(sheet._mode!=="appearance")return;
      if(event.target.closest("button,input,textarea,select,[contenteditable='true']"))return;
      // O foco só vai para o Canvas quando o próprio Canvas recebe interação.
      // Cliques em inspetores e menus não passam por este listener.
      canvas.focus({ preventScroll: true });
      sheet._nexusInteractionActive=true;
      const p=point(event), component=event.target.closest(".nexus-component"), surface=event.target.closest(".nexus-group-surface"), mod=event.ctrlKey||event.metaKey||event.shiftKey;
      if(surface && !component){const group=(sheet._activeGroups??[]).find(v=>v.id===surface.dataset.groupId);if(beginGroupMove(group,p,event))return;}
      if(!component && !surface){
        // A superfície visível pode ficar coberta pelos componentes do grupo;
        // detectar o vazio pela caixa geométrica garante que o grupo continue arrastável.
        const hitGroup=[...(sheet._activeGroups??[])].reverse().find(group=>{
          const members=elements().filter(el=>!el.hidden&&(group.componentIds??[]).includes(el.dataset.id));
          if(!members.length)return false;
          const rs=members.map(rectOf),left=Math.min(...rs.map(r=>r.x)),top=Math.min(...rs.map(r=>r.y));
          const right=Math.max(...rs.map(r=>r.x+r.w)),bottom=Math.max(...rs.map(r=>r.y+r.h));
          return p.x>=left&&p.x<=right&&p.y>=top&&p.y<=bottom;
        });
        if(hitGroup&&beginGroupMove(hitGroup,p,event))return;
      }
      if(component?.classList.contains("is-locked")) return;
      if(!component){if(!mod)setSelection([]);gesture={type:"marquee",start:p,additive:mod,original:new Set(sheet._selectedIds)};selectionBox.hidden=false;Object.assign(selectionBox.style,{left:`${p.x}px`,top:`${p.y}px`,width:"0px",height:"0px"});canvas.setPointerCapture(event.pointerId);event.preventDefault();return;}
      const id=component.dataset.id; let edge=edgeAt(component,event);
      if (sheet._openAppearancePanels?.has("component")) {
        requestAnimationFrame(() => {
          const inspector = sheet._nexusPanelWindows?.get("component");
          if (!inspector?.rendered || !inspector.element?.isConnected) return;
          inspector.bringToFront?.();
          inspector.element.classList.add("nexus-window-active");
          for (const other of sheet._nexusPanelWindows?.values?.() ?? []) if (other !== inspector) other.element?.classList.remove("nexus-window-active");
        });
      }
      if (sheet._selectedIds.size > 1 && sheet._selectedIds.has(id)) edge = null;
      const now = performance.now();
      if (lastComponentPointerDown.id === id && now - lastComponentPointerDown.at <= 380 && !mod) {
        lastComponentPointerDown = { id: null, at: 0 };
        suppressNativeDoubleClickUntil = now + 500;
        sheet._componentEditorTargetId = id;
        setSelection([id]);
        event.preventDefault(); event.stopPropagation();
        openComponentInspector();
        return;
      }
      lastComponentPointerDown = mod ? { id: null, at: 0 } : { id, at: now };
      if(mod){const next=new Set(sheet._selectedIds);next.has(id)?next.delete(id):next.add(id);setSelection([...next]);return;}
      else {
        const groupId = component.dataset.groupId;
        const group = groupId ? (sheet._activeGroups ?? []).find(g => g.id === groupId) : null;
        if (!sheet._selectedIds.has(id)) setSelection([id]);
      }
      const selected=elements().filter(el=>sheet._selectedIds.has(el.dataset.id));
      const starts=selected.map(el=>({el,...rectOf(el)}));
      gesture={type:edge?"resize":"move",direction:edge,start:p,starts,original:new Set(sheet._selectedIds),target:component,historyCaptured:false,moved:false};
      canvas.setPointerCapture(event.pointerId);event.preventDefault();
    });
    let lastCursorTarget = null;
    const processPointerMove = event => {
      if(!gesture){
        if(sheet._mode==="appearance"){
          const target=event.target instanceof Element ? event.target.closest(".nexus-component,.nexus-group-surface") : null;
          if(lastCursorTarget && lastCursorTarget !== target) lastCursorTarget.style.removeProperty("cursor");
          lastCursorTarget = target;
          if(target){
            if(target.classList.contains("nexus-group-surface")) target.style.cursor="grab";
            else { const edge=edgeAt(target,event); target.style.cursor=edge?({n:"ns-resize",s:"ns-resize",e:"ew-resize",w:"ew-resize",ne:"nesw-resize",sw:"nesw-resize",nw:"nwse-resize",se:"nwse-resize"}[edge]):"grab"; }
          }
        }
        return;
      }
      const p=point(event),l=layoutData(),dx=p.x-gesture.start.x,dy=p.y-gesture.start.y;
      if(gesture.type==="marquee"){
        const x=Math.min(p.x,gesture.start.x),y=Math.min(p.y,gesture.start.y),w=Math.abs(dx),h=Math.abs(dy);
        Object.assign(selectionBox.style,{left:`${x}px`,top:`${y}px`,width:`${w}px`,height:`${h}px`});
        const hits=elements().filter(el=>!el.hidden&&(()=>{const r=rectOf(el);return r.x<x+w&&r.x+r.w>x&&r.y<y+h&&r.y+r.h>y;})()).map(el=>el.dataset.id);
        const next = [...new Set([...(gesture.additive?gesture.original:[]),...hits])];
        const current = sheet._selectedIds ?? new Set();
        if (next.length !== current.size || next.some(id => !current.has(id))) setSelection(next);
        return;
      }
      if (Math.abs(dx) + Math.abs(dy) < 0.25) return;
      gesture.moved = true;
      if (!gesture.historyCaptured) { sheet._captureHistory(); gesture.historyCaptured = true; }
      const excluded=new Set(gesture.starts.map(s=>s.el.dataset.id)), targets=otherRects(excluded); clearGuides();
      if(gesture.type==="move"||gesture.type==="group-move"){
        const minX=Math.min(...gesture.starts.map(s=>s.x)),minY=Math.min(...gesture.starts.map(s=>s.y)),maxR=Math.max(...gesture.starts.map(s=>s.x+s.w)),maxB=Math.max(...gesture.starts.map(s=>s.y+s.h));
        let mx=l.snap?Math.round((minX+dx)/l.grid)*l.grid-minX:dx,my=l.snap?Math.round((minY+dy)/l.grid)*l.grid-minY:dy;
        if(l.smart){const sourceRects=gesture.starts.map(s=>({x:s.x,y:s.y,w:s.w,h:s.h}));if(gesture.type==="group-move"&&gesture.groupStart)sourceRects.push({...gesture.groupStart});const aligned=alignMove(sourceRects.map(r=>({x:r.x,y:r.y,w:r.w,h:r.h})),mx,my,targets);mx=aligned.dx;my=aligned.dy;}
        mx=clamp(mx,-minX,l.width-maxR);my=clamp(my,-minY,l.height-maxB);
        for(const s of gesture.starts){s.el.style.left=`${s.x+mx}px`;s.el.style.top=`${s.y+my}px`;}
        if(gesture.type==="group-move"&&gesture.group){gesture.group.x=gesture.groupStart.x+mx;gesture.group.y=gesture.groupStart.y+my;}
        const distance = Math.round(Math.hypot(mx, my));
        sizeReadout.textContent = `${distance} px`;
        sizeReadout.hidden = false;
        sizeReadout.style.left = `${clamp(minX + mx + 8, 4, l.width - 100)}px`;
        sizeReadout.style.top = `${clamp(minY + my - 30, 4, l.height - 32)}px`;
      }else if(gesture.type==="group-resize-disabled"){
        const g=gesture.group,q=gesture.groupStart,d=gesture.direction;let box={...q};
        if(d.includes("e"))box.w=q.w+dx;if(d.includes("s"))box.h=q.h+dy;
        if(d.includes("w")){box.x=q.x+dx;box.w=q.w-dx;}if(d.includes("n")){box.y=q.y+dy;box.h=q.h-dy;}
        box.w=Math.max(100,box.w);box.h=Math.max(70,box.h);
        if(l.snap){if(d.includes("w"))box.x=Math.round(box.x/l.grid)*l.grid;if(d.includes("n"))box.y=Math.round(box.y/l.grid)*l.grid;if(d.includes("e"))box.w=Math.round((box.x+box.w)/l.grid)*l.grid-box.x;if(d.includes("s"))box.h=Math.round((box.y+box.h)/l.grid)*l.grid-box.y;}
        if(l.smart)box=alignResize(box,targets,d);
        const memberLeft=Math.min(...gesture.starts.map(s=>s.x))-10,memberTop=Math.min(...gesture.starts.map(s=>s.y))-10,memberRight=Math.max(...gesture.starts.map(s=>s.x+s.w))+10,memberBottom=Math.max(...gesture.starts.map(s=>s.y+s.h))+10;
        box.x=Math.min(box.x,memberLeft);box.y=Math.min(box.y,memberTop);box.w=Math.max(box.w,memberRight-box.x);box.h=Math.max(box.h,memberBottom-box.y);
        box.x=clamp(box.x,0,l.width-100);box.y=clamp(box.y,0,l.height-70);box.w=Math.min(box.w,l.width-box.x);box.h=Math.min(box.h,l.height-box.y);
        Object.assign(g,{x:box.x,y:box.y,w:box.w,h:box.h});
        const surface=canvas.querySelector(`.nexus-group-surface[data-group-id="${g.id}"]`);if(surface)Object.assign(surface.style,{left:`${box.x}px`,top:`${box.y}px`,width:`${box.w}px`,height:`${box.h}px`});
        sizeReadout.textContent = `Tamanho: ${Math.round(box.w)} × ${Math.round(box.h)} px`; sizeReadout.hidden = false;
        sizeReadout.style.left = `${clamp(box.x + box.w - 180, 4, l.width - 184)}px`; sizeReadout.style.top = `${Math.max(4, box.y - 34)}px`;
      }else{
        const s=gesture.starts[0],d=gesture.direction;let box={x:s.x,y:s.y,w:s.w,h:s.h};
        if(d.includes("e"))box.w=s.w+dx;if(d.includes("s"))box.h=s.h+dy;
        if(d.includes("w")){box.x=s.x+dx;box.w=s.w-dx;}if(d.includes("n")){box.y=s.y+dy;box.h=s.h-dy;}
        box.w=Math.max(20,box.w);box.h=Math.max(20,box.h);
        if(l.snap){if(d.includes("w"))box.x=Math.round(box.x/l.grid)*l.grid;if(d.includes("n"))box.y=Math.round(box.y/l.grid)*l.grid;if(d.includes("e"))box.w=Math.round((box.x+box.w)/l.grid)*l.grid-box.x;if(d.includes("s"))box.h=Math.round((box.y+box.h)/l.grid)*l.grid-box.y;}
        if(l.smart){
          box=alignResize(box,targets,d);
        }
        box=clampBox(box,l);
        box = { x: Math.round(box.x), y: Math.round(box.y), w: Math.round(box.w), h: Math.round(box.h) };
        box=clampBox(box,l);
        Object.assign(s.el.style,{left:`${box.x}px`,top:`${box.y}px`,width:`${box.w}px`,height:`${box.h}px`});
        sizeReadout.textContent = `Tamanho: ${box.w} × ${box.h} px`; sizeReadout.hidden = false;
        sizeReadout.style.left = `${clamp(box.x + box.w - 180, 4, l.width - 184)}px`; sizeReadout.style.top = `${Math.max(4, box.y - 34)}px`;
      }
      syncGroupBounds();
    };
    // Limita o trabalho pesado de alinhamento/seleção a no máximo um ciclo por frame.
    let pointerMoveFrame = 0;
    let latestPointerMove = null;
    canvas.addEventListener("pointermove", event => {
      latestPointerMove = event;
      if (pointerMoveFrame) return;
      pointerMoveFrame = requestAnimationFrame(() => {
        pointerMoveFrame = 0;
        const latest = latestPointerMove;
        latestPointerMove = null;
        if (latest) processPointerMove(latest);
      });
    });
    const clearInteractionCursor = () => {
      if (lastCursorTarget) lastCursorTarget.style.removeProperty("cursor");
      lastCursorTarget = null;
      canvas.style.removeProperty("cursor");
    };
    canvas.addEventListener("pointerleave", clearInteractionCursor);
    const finish=async(event)=>{if(event?.pointerId != null && canvas.hasPointerCapture?.(event.pointerId)) { try { canvas.releasePointerCapture(event.pointerId); } catch(_error) {} } clearInteractionCursor(); if(!gesture){sheet._nexusInteractionActive=false;return;}if(gesture.type==="marquee")selectionBox.hidden=true; sheet._suppressComponentClickUntil = gesture.moved ? performance.now() + 260 : 0;if(gesture.group && gesture.type==="group-move"){const rs=gesture.starts.map(s=>rectOf(s.el));const minX=Math.min(...rs.map(r=>r.x)),minY=Math.min(...rs.map(r=>r.y)),maxX=Math.max(...rs.map(r=>r.x+r.w)),maxY=Math.max(...rs.map(r=>r.y+r.h));gesture.group.x=minX;gesture.group.y=minY;gesture.group.w=maxX-minX;gesture.group.h=maxY-minY;}const shouldSave = gesture.moved && gesture.type !== "marquee"; const touchedIds = shouldSave ? gesture.starts.map(item => item.el.dataset.id) : []; gesture=null;sheet._nexusInteractionActive=false;sizeReadout.hidden=true;clearGuides();renderGroups();scheduleConnectedCorners();if(shouldSave)await saveAfterGesture(touchedIds);};
    canvas.addEventListener("pointerup",finish);canvas.addEventListener("pointercancel",finish);
    canvas.addEventListener("keydown", event => {
      if (sheet._mode !== "play" || !["Enter", " "].includes(event.key)) return;
      if (event.target.closest("input,textarea,select,button,a,[contenteditable=\"true\"]")) return;
      const card = event.target.closest(".nexus-component[data-action-type=\"roll\"]");
      if (!card) return;
      event.preventDefault();
      sheet._rollComponent(card.dataset.id);
    });
    canvas.addEventListener("click", event => {
      if (sheet._mode !== "play" || performance.now() < (sheet._suppressComponentClickUntil ?? 0)) return;
      const card = event.target instanceof Element ? event.target.closest(".nexus-component[data-action-type=\"roll\"]") : null;
      if (!card || !canvas.contains(card) || event.target.closest("input,textarea,select,button,a,[contenteditable=\"true\"]")) return;
      event.preventDefault();
      sheet._rollComponent(card.dataset.id);
    });
    const keyHandler=async event=>{
      const isTypingTarget = event.target?.matches?.("input,textarea,select,[contenteditable=true]") || event.target?.isContentEditable;
      const floating = document.querySelector(`[data-nexus-floating-for="${sheet.id}"]`);
      const panelWindows = [...(sheet._nexusPanelWindows?.values?.() ?? [])];
      const focusedInPanel = !!(floating?.contains(event.target) || panelWindows.some(instance => instance?.element?.contains(event.target)));
      const liveCanvas = sheet.element?.querySelector?.(".nexus-canvas") ?? canvas;
      const focusedInCanvas = !!liveCanvas && (document.activeElement === liveCanvas || liveCanvas.contains(document.activeElement));
      if (sheet._mode !== "appearance") return;
      // Não deixar Delete/Backspace escapar para o canvas de cena quando o
      // usuário está em um painel do NEXUS; nesses painéis a tecla não exclui
      // componentes nem tokens.
      if ((event.key === "Delete" || event.key === "Backspace") && focusedInPanel && !isTypingTarget) {
        event.preventDefault(); event.stopPropagation(); event.stopImmediatePropagation?.(); return;
      }
      if (!focusedInCanvas || isTypingTarget) return;
      const mod=event.ctrlKey||event.metaKey;
      if(mod&&event.key.toLowerCase()==="z"){event.preventDefault();event.stopPropagation();event.stopImmediatePropagation?.();if(event.shiftKey)await sheet._restoreHistory(sheet._redoStack,sheet._undoStack);else await sheet._restoreHistory(sheet._undoStack,sheet._redoStack);return;}
      if(mod&&event.key.toLowerCase()==="y"){event.preventDefault();event.stopPropagation();event.stopImmediatePropagation?.();await sheet._restoreHistory(sheet._redoStack,sheet._undoStack);return;}
      if(mod&&event.key.toLowerCase()==="c"){
        const ids=[...(sheet._selectedIds??[])]; if(!ids.length)return;
        event.preventDefault();event.stopPropagation();event.stopImmediatePropagation?.();
        const components=(sheet._currentLayout?.components??[]).filter(c=>ids.includes(c.id)).map(clone);
        const groups=(sheet._currentLayout?.groups??[]).filter(g=>(g.componentIds??[]).length>=2&&(g.componentIds??[]).every(id=>ids.includes(id))).map(clone);
        sheet._clipboard={components,groups};return;
      }
      if(mod&&event.key.toLowerCase()==="v"){
        const clip=Array.isArray(sheet._clipboard)?{components:sheet._clipboard,groups:[]}:sheet._clipboard;
        if(!clip?.components?.length)return;
        event.preventDefault();event.stopPropagation();event.stopImmediatePropagation?.();sheet._captureHistory();const layouts=await sheet._readLayouts(),active=sheet._activeLayoutId(),l=layouts[active],offset=l.gridSize||20,idMap=new Map(clip.components.map(c=>[c.id,`cmp-${foundry.utils.randomID(8)}`]));const firstStackOrder=Math.max(-1,...l.components.map(c=>Number(c.stackOrder)||0))+1;const copies=clip.components.map((c,index)=>({...clone(c),id:idMap.get(c.id),x:clamp(c.x+offset,0,l.width-c.w),y:clamp(c.y+offset,0,l.height-c.h),z:Number(c.z)||0,stackOrder:firstStackOrder+index}));l.components.push(...copies);l.groups??=[];const groupCopies=(clip.groups??[]).map(g=>({...clone(g),id:`grp-${foundry.utils.randomID(8)}`,componentIds:g.componentIds.filter(id=>idMap.has(id)).map(id=>idMap.get(id))})).filter(g=>g.componentIds.length>=2);l.groups.push(...groupCopies);await sheet._writeLayouts(layouts,active);sheet._selectedIds=new Set(copies.map(c=>c.id));sheet._selectedGroupId=groupCopies[0]?.id??null;sheet.render({ force: true });return;}
      if(mod&&event.key.toLowerCase()==="a"){event.preventDefault();event.stopPropagation();event.stopImmediatePropagation?.();setSelection(elements().map(el=>el.dataset.id));}
      else if(mod&&event.key.toLowerCase()==="d"){event.preventDefault();event.stopPropagation();event.stopImmediatePropagation?.();await sheet._duplicateComponents([...sheet._selectedIds]);}
      else if(event.key==="Escape"){event.preventDefault();event.stopPropagation();event.stopImmediatePropagation?.();setSelection([]);sheet._selectedGroupId=null;}
      else if((event.key==="Delete"||event.key==="Backspace")&&sheet._selectedIds.size){
        event.preventDefault();event.stopPropagation();event.stopImmediatePropagation?.();await sheet._deleteComponents([...sheet._selectedIds]);
      }
      else if(["ArrowUp","ArrowDown","ArrowLeft","ArrowRight"].includes(event.key)&&sheet._selectedIds.size){
        event.preventDefault(); event.stopPropagation(); event.stopImmediatePropagation?.();
        sheet._captureHistory();
        const l=layoutData(),step=event.shiftKey?Math.max(1,l.grid)*5:(l.snap?Math.max(1,l.grid):10),dx=event.key==="ArrowLeft"?-step:event.key==="ArrowRight"?step:0,dy=event.key==="ArrowUp"?-step:event.key==="ArrowDown"?step:0;
        const selected=new Set(sheet._selectedIds),handled=new Set();
        for(const g of (sheet._activeGroups??[])){
          const members=(g.componentIds??[]).filter(id=>selected.has(id));
          if(members.length===g.componentIds?.length&&members.length){
            const rs=elements().filter(el=>members.includes(el.dataset.id)).map(rectOf);
            const minX=Math.min(...rs.map(r=>r.x)),minY=Math.min(...rs.map(r=>r.y)),maxX=Math.max(...rs.map(r=>r.x+r.w)),maxY=Math.max(...rs.map(r=>r.y+r.h));
            const mx=clamp(dx,-minX,l.width-maxX),my=clamp(dy,-minY,l.height-maxY);
            for(const el of elements().filter(el=>members.includes(el.dataset.id))){const r=rectOf(el);el.style.left=`${r.x+mx}px`;el.style.top=`${r.y+my}px`;handled.add(el.dataset.id);}
          }
        }
        for(const el of elements().filter(el=>selected.has(el.dataset.id)&&!handled.has(el.dataset.id))){const r=rectOf(el);el.style.left=`${clamp(r.x+dx,0,l.width-r.w)}px`;el.style.top=`${clamp(r.y+dy,0,l.height-r.h)}px`;}
        renderGroups(); await saveAfterGesture([...selected]);
         requestAnimationFrame(() => (sheet.element?.querySelector?.(".nexus-canvas") ?? canvas)?.focus?.({ preventScroll: true }));
      }
    };
    root.tabIndex=0;
    const activateInteraction = () => { sheet._nexusInteractionActive = true; };
    const deactivateInteraction = event => {
      const floating = document.querySelector(`[data-nexus-floating-for="${sheet.id}"]`);
      const insidePanel = [...(sheet._nexusPanelWindows?.values?.() ?? [])].some(instance => instance.element?.contains(event.target));
      if (root.contains(event.target) || floating?.contains(event.target) || insidePanel) sheet._nexusInteractionActive = true;
      else {
        sheet._nexusInteractionActive = false;
        // Cliques fora da ficha encerram a seleção visual, sem interferir nos painéis flutuantes.
        // Limpa sempre: classes visuais podem sobreviver mesmo com IDs vazios.
        sheet._setSelection?.($(sheet.element ?? root), []);
        sheet._componentEditorTargetId = null;
      }
    };
    root.addEventListener("pointerdown",activateInteraction,true);
    document.addEventListener("pointerdown",deactivateInteraction,true);
    window.addEventListener("keydown",keyHandler,true);
    sheet._nexusKeyCleanup = () => { window.removeEventListener("keydown",keyHandler,true); document.removeEventListener("pointerdown",deactivateInteraction,true); root.removeEventListener("pointerdown",activateInteraction,true); canvas.removeEventListener("pointerleave",clearInteractionCursor); if(pointerMoveFrame)cancelAnimationFrame(pointerMoveFrame); clearInteractionCursor(); fitObserver?.disconnect(); if(sheet._fitNexusCanvas===fitCanvas)sheet._fitNexusCanvas=null; };
    root.querySelectorAll('[data-action="add-component"]').forEach(button=>{button.draggable=true;button.addEventListener("dragstart",e=>e.dataTransfer.setData("text/plain",button.dataset.type));});
    canvas.addEventListener("dragover",e=>e.preventDefault());
    canvas.addEventListener("drop",async e=>{e.preventDefault();const type=e.dataTransfer.getData("text/plain");if(!COMPONENTS[type])return;const p=point(e),layouts=await sheet._readLayouts(),active=sheet._activeLayoutId(),l=layouts[active];sheet._captureHistory();const w=100,h=100;let x=p.x-w/2,y=p.y-h/2;if(l.snapEnabled){x=Math.round(x/l.gridSize)*l.gridSize;y=Math.round(y/l.gridSize)*l.gridSize;}const id=`cmp-${foundry.utils.randomID(8)}`;l.components.push({id,type,x:clamp(x,0,l.width-w),y:clamp(y,0,l.height-h),w,h,z:0,stackOrder:Math.max(-1,...l.components.map(c=>Number(c.stackOrder)||0))+1});sheet._selectedIds=new Set([id]);await sheet._writeLayouts(layouts,active);sheet.render({ force: true });});
  }
}

export const DEFAULT_LAYOUT = {
  id: "principal", name: "Principal", width: 800, height: 800,
  gridSize: 20, gridEnabled: true, snapEnabled: true, guidesEnabled: true, fontSize: 13, secondaryFontSize: 11, valueFontSize: 20,
  canvasColor: "#171f2a", cardColor: "#273443", accentColor: "#52647b", highlightColor: "#78b7e8", buttonColor: "#315b7d", theme: "nexus-dark", fontFamily: "Inter",
  components: [], links: []
};

export const THEME_TOKENS = {
  "nexus-dark": { panel: "#182330", surface: "#202e3e", input: "#111b27", border: "#3c5067", text: "#e7edf5", muted: "#9aadc2", hover: "#2a3d52", scroll: "#111923", windowHeader: "#223246", windowContent: "#192431", menu: "#202f40", placeholder: "#91a6bd", resourceButton: "#315b7d", canvas: "#171f2a", card: "#273443", accent: "#52647b", highlight: "#78b7e8", button: "#315b7d" },
  midnight: { panel: "#101a2b", surface: "#18283d", input: "#0b1422", border: "#304a68", text: "#e6f0fc", muted: "#91a9c5", hover: "#223c5a", scroll: "#0b1422", windowHeader: "#18283d", windowContent: "#101a2b", menu: "#18283d", placeholder: "#91a9c5", resourceButton: "#244c78", canvas: "#0c1220", card: "#18253a", accent: "#355477", highlight: "#80c8ff", button: "#244c78" },
  light: { panel: "#e8edf3", surface: "#ffffff", input: "#f5f7fa", border: "#aab8c8", text: "#243247", muted: "#586b80", hover: "#dce6f0", scroll: "#dce6f0", windowHeader: "#ffffff", windowContent: "#e8edf3", menu: "#ffffff", placeholder: "#718096", resourceButton: "#d7e8f7", canvas: "#e8edf3", card: "#ffffff", accent: "#8797aa", highlight: "#276fa8", button: "#d7e8f7" },
  steam: { panel: "#101b2b", surface: "#1b2d42", input: "#0b1624", border: "#31516b", text: "#e7f1fb", muted: "#9ab4cc", hover: "#263f58", scroll: "#0b1624", windowHeader: "#16283b", windowContent: "#101b2b", menu: "#1b2d42", placeholder: "#88a8c4", resourceButton: "#1769a6", canvas: "#0c1725", card: "#1b2d42", accent: "#367ba8", highlight: "#66c0f4", button: "#1769a6" },
  linux: { panel: "#191724", surface: "#262338", input: "#11101a", border: "#51466b", text: "#eeeaf7", muted: "#b0a5c8", hover: "#39334f", scroll: "#11101a", windowHeader: "#242036", windowContent: "#191724", menu: "#262338", placeholder: "#a89cbe", resourceButton: "#6554a3", canvas: "#14121e", card: "#262338", accent: "#6554a3", highlight: "#8bd5ca", button: "#6554a3" },
  medieval: { panel: "#282018", surface: "#3b2e20", input: "#1c1712", border: "#80633d", text: "#f0e3c7", muted: "#bda981", hover: "#4a3926", scroll: "#1c1712", windowHeader: "#3b2e20", windowContent: "#282018", menu: "#302519", placeholder: "#b39d75", resourceButton: "#77532c", canvas: "#1b1712", card: "#30251b", accent: "#85663f", highlight: "#d7aa59", button: "#77532c", fontFamily: "Georgia" },
  "pixel-art": { panel: "#17152b", surface: "#29264a", input: "#100f20", border: "#5a568a", text: "#f4f0ff", muted: "#b8b2d8", hover: "#39345f", scroll: "#100f20", windowHeader: "#29264a", windowContent: "#17152b", menu: "#29264a", placeholder: "#aaa3d2", resourceButton: "#6b5bd2", canvas: "#100f20", card: "#29264a", accent: "#7569d9", highlight: "#ffcf70", button: "#6b5bd2", fontFamily: "monospace" }
};

export const THEME_PALETTES = Object.fromEntries(Object.entries(THEME_TOKENS).map(([id, theme]) => [id, {
  canvasColor: theme.canvas, cardColor: theme.card, accentColor: theme.accent,
  highlightColor: theme.highlight, buttonColor: theme.button, scrollColor: theme.scroll,
  windowHeaderColor: theme.windowHeader, windowContentColor: theme.windowContent,
  menuColor: theme.menu, placeholderColor: theme.placeholder
}]));

export const applyThemeTokens = (element, layout = {}, beforeApply = null) => {
  if (!element?.style) return;
  const theme = THEME_TOKENS[layout.theme] ?? THEME_TOKENS["nexus-dark"];
  const allowedFonts = new Set(["Inter", "Arial", "Georgia", "Trebuchet MS", "Verdana", "system-ui", "monospace"]);
  const fallbackFont = theme.fontFamily ?? (layout.theme === "steam" ? "Arial" : layout.theme === "pixel-art" ? "monospace" : "Inter");
  const requestedFont = String(layout.fontFamily ?? fallbackFont);
  const fontFamily = allowedFonts.has(requestedFont) ? requestedFont : fallbackFont;
  const safeNumber = (value, min, max, fallback) => {
    if (value === null || value === undefined || value === "") return fallback;
    const number = Number(value);
    return Number.isFinite(number) ? Math.min(max, Math.max(min, number)) : fallback;
  };
  const fontFamilyToken = ["monospace", "serif", "sans-serif", "system-ui", "cursive", "fantasy"].includes(fontFamily) ? fontFamily : `"${fontFamily}"`;
  const palette = layout.palette && typeof layout.palette === "object" ? layout.palette : {};
  const safeColor = (value, fallback) => {
    const candidate = String(value ?? "").toLowerCase();
    if (!/^#(?:[0-9a-f]{3}|[0-9a-f]{6})$/.test(candidate)) return fallback;
    return candidate.length === 4 ? "#" + [...candidate.slice(1)].map(channel => channel + channel).join("") : candidate;
  };
  const color = (key, fallback) => safeColor(palette[key], fallback);
  const layoutColors = {
    card: safeColor(layout.cardColor, color("card", theme.card)),
    accent: safeColor(layout.accentColor, color("accent", theme.accent)),
    highlight: safeColor(layout.highlightColor, color("highlight", theme.highlight)),
    button: safeColor(layout.buttonColor, color("button", theme.button)),
    scroll: safeColor(layout.scrollColor, color("scroll", theme.scroll)),
    windowHeader: safeColor(layout.windowHeaderColor, color("windowHeader", theme.windowHeader)),
    windowContent: safeColor(layout.windowContentColor, color("windowContent", theme.windowContent)),
    menu: safeColor(layout.menuColor, color("menu", theme.menu)),
    placeholder: safeColor(layout.placeholderColor, color("placeholder", theme.placeholder))
  };
  const values = {
    "--nexus-panel-bg": theme.panel,
    "--nexus-panel-card": layoutColors.card,
    "--nexus-panel-accent": layoutColors.accent,
    "--nexus-canvas-scroll-bg": layoutColors.scroll,
    "--nexus-window-header-bg": layoutColors.windowHeader,
    "--nexus-window-content-bg": layoutColors.windowContent,
    "--nexus-button-bg": layoutColors.button,
    "--nexus-button-hover-bg": `color-mix(in srgb, ${color("button", layoutColors.button)} 82%, ${color("text", theme.text)})`,
    "--nexus-button-active-bg": `color-mix(in srgb, ${color("button", layoutColors.button)} 72%, ${color("highlight", layoutColors.highlight)})`,
    "--nexus-button-active-border": color("highlight", layoutColors.highlight),
    "--nexus-button-active-text": color("text", theme.text),
    "--nexus-button-active": color("highlight", layoutColors.highlight),
    "--nexus-panel-surface": theme.surface,
    "--nexus-panel-input": theme.input,
    "--nexus-panel-border": theme.border,
    "--nexus-panel-text": theme.text,
    "--nexus-panel-muted": theme.muted,
    "--nexus-panel-hover": theme.hover,
    "--nexus-scroll-bg": layoutColors.scroll,
    "--nexus-scroll-thumb": layoutColors.accent,
    "--nexus-scrollbar-track": layoutColors.scroll,
    "--nexus-scrollbar-thumb": layoutColors.accent,
    "--nexus-scrollbar-thumb-hover": layoutColors.highlight,
    "--nexus-surface-raised": layoutColors.card,
    "--nexus-surface-sunken": theme.input,
    "--nexus-border-subtle": `color-mix(in srgb, ${color("border", theme.border)} 58%, transparent)`,
    "--nexus-border-strong": layoutColors.accent,
    "--nexus-text-primary": theme.text,
    "--nexus-text-secondary": theme.muted,
    "--nexus-text-disabled": `color-mix(in srgb, ${color("muted", theme.muted)} 58%, transparent)`,
    "--nexus-focus-ring": color("highlight", layoutColors.highlight),
    "--nexus-field-bg": theme.input,
    "--nexus-field-text": theme.text,
    "--nexus-field-border": theme.border,
    "--nexus-field-focus": color("highlight", layoutColors.highlight),
    "--nexus-button-primary": layoutColors.button,
    "--nexus-button-primary-hover": `color-mix(in srgb, ${color("button", layoutColors.button)} 82%, ${color("text", theme.text)})`,
    "--nexus-button-primary-text": color("text", theme.text),
    "--nexus-state-success": layout.theme === "light" ? "#247647" : "#79c99a",
    "--nexus-state-warning": layout.theme === "light" ? "#8a5a12" : "#e6bd68",
    "--nexus-state-danger": layout.theme === "light" ? "#a83232" : "#e58a8a",
    "--nexus-state-info": layout.theme === "light" ? "#245f91" : "#83bce8",
    "--nexus-resource-button": theme.resourceButton,
    "--nexus-window-header": layoutColors.windowHeader,
    "--nexus-window-content": layoutColors.windowContent,
    "--nexus-menu-bg": layoutColors.menu,
    "--nexus-placeholder-color": layoutColors.placeholder,
    "--nexus-canvas-color": safeColor(layout.canvasColor, color("canvas", theme.canvas)),
    "--nexus-card-color": layoutColors.card,
    "--nexus-accent-color": layoutColors.accent,
    "--nexus-highlight-color": layoutColors.highlight,
    "--nexus-button-color": layoutColors.button,
    "--nexus-font-family": `${fontFamilyToken}, sans-serif`,
    "--nexus-control-bg": theme.input, "--nexus-control-text": theme.text,
    "--nexus-control-border": theme.border, "--nexus-control-hover": theme.hover,
    "--nexus-tab-bg": color("panel", theme.panel), "--nexus-tab-active": color("accent", theme.accent),
    "--nexus-header-text": color("text", theme.text), "--nexus-card-border": theme.border,
    "--nexus-card-shadow": layout.theme === "steam" ? "0 4px 14px #0007" : "0 2px 8px #0003",
    "--nexus-nav-bg": theme.panel, "--nexus-nav-hover": theme.hover,
    "--nexus-menu-border": theme.border,
    "--nexus-button-hover": color("hover", theme.hover),
    "--nexus-radius-small": ["steam", "pixel-art"].includes(layout.theme) ? "0px" : layout.theme === "medieval" ? "5px" : "6px",
    "--nexus-radius-panel": layout.theme === "steam" ? "2px" : "8px",
    "--nexus-spacing-unit": layout.theme === "steam" ? "6px" : "8px",
    "--nexus-font-ui": `${fontFamilyToken}, sans-serif`,
    "--nexus-button-border": color("accent", layout.accentColor ?? theme.border),
    "--nexus-button-text": color("text", theme.text),
    "--nexus-navigation-bg": color("panel", theme.panel),
    "--nexus-navigation-active": color("accent", theme.accent),
    "--nexus-input-focus": color("highlight", theme.highlight),
    "--nexus-scroll-track": theme.scroll,
    "--nexus-scroll-handle": theme.accent,
    "--nexus-font-size": `${safeNumber(layout.fontSize, 11, 18, 13)}px`,
    "--nexus-secondary-font-size": `${safeNumber(layout.secondaryFontSize, 9, 16, 11)}px`,
    "--nexus-value-font-size": `${safeNumber(layout.valueFontSize, 14, 28, 20)}px`,
    "--nexus-space-1": "4px",
    "--nexus-space-2": "8px",
    "--nexus-space-3": "12px",
    "--nexus-space-4": "16px",
    "--nexus-control-height": "34px",
    "--nexus-line-height": "1.45",
    "--nexus-foundry-sidebar-bg": theme.panel,
    "--nexus-foundry-sidebar-surface": theme.surface,
    "--nexus-foundry-sidebar-input": theme.input,
    "--nexus-foundry-sidebar-border": theme.border,
    "--nexus-foundry-sidebar-text": theme.text,
    "--nexus-foundry-sidebar-muted": theme.muted,
    "--nexus-foundry-sidebar-hover": theme.hover,
    "--nexus-foundry-sidebar-active": theme.accent,
    "--nexus-foundry-directory-bg": theme.panel,
    "--nexus-foundry-directory-item-bg": theme.surface,
    "--nexus-foundry-directory-item-border": theme.border,
    "--nexus-foundry-directory-item-hover": theme.hover,
    "--nexus-foundry-directory-folder-bg": theme.panel,
    "--nexus-foundry-directory-search-bg": theme.input,
    "--nexus-foundry-navigation-bg": theme.panel,
    "--nexus-foundry-navigation-active": theme.accent,
    "--nexus-foundry-application-bg": theme.windowContent,
    "--nexus-foundry-application-header": theme.windowHeader,
    "--nexus-foundry-application-border": theme.border,
    "--nexus-foundry-control-bg": theme.input,
    "--nexus-foundry-control-border": theme.border,
    "--nexus-foundry-control-hover": theme.hover
  };
  const paletteTokens = {
    "--nexus-panel-bg": "panel",
    "--nexus-panel-card": "card",
    "--nexus-panel-accent": "accent",
    "--nexus-canvas-scroll-bg": "scroll",
    "--nexus-window-header-bg": "windowHeader",
    "--nexus-window-content-bg": "windowContent",
    "--nexus-button-bg": "button",
    "--nexus-panel-surface": "surface",
    "--nexus-panel-input": "input",
    "--nexus-panel-border": "border",
    "--nexus-panel-text": "text",
    "--nexus-panel-muted": "muted",
    "--nexus-panel-hover": "hover",
    "--nexus-scroll-bg": "scroll",
    "--nexus-scroll-thumb": "accent",
    "--nexus-scrollbar-track": "scroll",
    "--nexus-scrollbar-thumb": "accent",
    "--nexus-scrollbar-thumb-hover": "highlight",
    "--nexus-surface-raised": "card",
    "--nexus-surface-sunken": "input",
    "--nexus-border-strong": "border",
    "--nexus-text-primary": "text",
    "--nexus-text-secondary": "muted",
    "--nexus-field-bg": "input",
    "--nexus-field-text": "text",
    "--nexus-field-border": "border",
    "--nexus-field-focus": "highlight",
    "--nexus-resource-button": "resourceButton",
    "--nexus-window-header": "windowHeader",
    "--nexus-window-content": "windowContent",
    "--nexus-menu-bg": "menu",
    "--nexus-placeholder-color": "placeholder",
    "--nexus-canvas-color": "canvas",
    "--nexus-card-color": "card",
    "--nexus-accent-color": "accent",
    "--nexus-highlight-color": "highlight",
    "--nexus-button-color": "button",
    "--nexus-control-bg": "input",
    "--nexus-control-text": "text",
    "--nexus-control-border": "border",
    "--nexus-control-hover": "hover",
    "--nexus-tab-bg": "panel",
    "--nexus-tab-active": "accent",
    "--nexus-header-text": "text",
    "--nexus-card-border": "border",
    "--nexus-nav-bg": "panel",
    "--nexus-nav-hover": "hover",
    "--nexus-menu-border": "border",
    "--nexus-button-text": "text",
    "--nexus-button-hover": "hover",
    "--nexus-navigation-bg": "panel",
    "--nexus-navigation-active": "accent",
    "--nexus-input-focus": "highlight",
    "--nexus-scroll-track": "scroll",
    "--nexus-scroll-handle": "accent",
    "--nexus-foundry-sidebar-bg": "panel",
    "--nexus-foundry-sidebar-surface": "surface",
    "--nexus-foundry-sidebar-input": "input",
    "--nexus-foundry-sidebar-border": "border",
    "--nexus-foundry-sidebar-text": "text",
    "--nexus-foundry-sidebar-muted": "muted",
    "--nexus-foundry-sidebar-hover": "hover",
    "--nexus-foundry-sidebar-active": "accent",
    "--nexus-foundry-directory-bg": "panel",
    "--nexus-foundry-directory-item-bg": "surface",
    "--nexus-foundry-directory-item-border": "border",
    "--nexus-foundry-directory-item-hover": "hover",
    "--nexus-foundry-directory-folder-bg": "panel",
    "--nexus-foundry-directory-search-bg": "input",
    "--nexus-foundry-navigation-bg": "panel",
    "--nexus-foundry-navigation-active": "accent",
    "--nexus-foundry-application-bg": "windowContent",
    "--nexus-foundry-application-header": "windowHeader",
    "--nexus-foundry-application-border": "border",
    "--nexus-foundry-control-bg": "input",
    "--nexus-foundry-control-border": "border",
    "--nexus-foundry-control-hover": "hover"
  };
  for (const [token, key] of Object.entries(paletteTokens)) {
    const value = color(key, null);
    if (value) values[token] = value;
  }

  const density = layout.density === "compact" ? 0.88 : layout.density === "spacious" ? 1.14 : 1;
  const spacing = safeNumber(layout.spacing, 0.75, 1.5, 1) * density;
  const radius = layout.radius === "sharp" ? 0 : layout.radius === "soft" ? 5 : 9;
  const controlHeight = safeNumber(layout.controlHeight, 28, 44, 34);
  values["--nexus-density-scale"] = String(density);
  values["--nexus-radius-small"] = `${radius}px`;
  values["--nexus-radius-panel"] = `${Math.max(0, radius - 1)}px`;
  values["--nexus-spacing-unit"] = `${8 * spacing}px`;
  values["--nexus-space-1"] = `${4 * spacing}px`;
  values["--nexus-space-2"] = `${8 * spacing}px`;
  values["--nexus-space-3"] = `${12 * spacing}px`;
  values["--nexus-space-4"] = `${16 * spacing}px`;
  values["--nexus-control-height"] = `${controlHeight}px`;
  values["--nexus-line-height"] = String(safeNumber(layout.lineHeight, 1.2, 1.8, 1.45));
  values["--nexus-contrast-border-width"] = layout.contrast === "high" ? "2px" : "1px";
  values["--nexus-contrast-outline-width"] = layout.contrast === "high" ? "3px" : "2px";
  values["--nexus-motion-duration"] = layout.reducedMotion ? "0ms" : "140ms";
  values["--nexus-theme-id"] = layout.theme ?? "nexus-dark";
  if (typeof beforeApply === "function") beforeApply(values);
  for (const [key, value] of Object.entries(values)) element.style.setProperty(key, value);
  element.dataset.theme = layout.theme ?? "nexus-dark";
  return Object.keys(values);
};

// ---------------------------------------------------------------------------
// Sheet-local theme scope
//
// The global Design System writes its tokens on <html>. A sheet layout also
// stores a theme and palette, and used to write them inline on the sheet
// elements, which silently shadowed the global profile. The helpers below make
// the precedence explicit: a sheet writes its own tokens only when its layout
// was deliberately customized AND the campaign policy allows local overrides.
// Otherwise it writes nothing and inherits the global profile live.
// ---------------------------------------------------------------------------
const LOCAL_COLOR_TOKENS = [
  ["--nexus-canvas-color", "canvasColor", "#171f2a"],
  ["--nexus-card-color", "cardColor", "#273443"],
  ["--nexus-accent-color", "accentColor", "#52647b"],
  ["--nexus-highlight-color", "highlightColor", "#78b7e8"],
  ["--nexus-button-color", "buttonColor", "#315b7d"]
];
const LOCAL_WINDOW_TOKENS = ["--nexus-window-accent", "--nexus-font-family"];
const scopedTokenKeys = new WeakMap();
const sameColor = (left, right) => String(left ?? "").toLowerCase() === String(right ?? "").toLowerCase();

/** True when a layout carries a deliberate local appearance (not just the saved defaults). */
export const isLayoutThemeCustomized = (layout = {}) => {
  if (layout.customThemeId) return true;
  const themeId = layout.theme ?? "nexus-dark";
  if (themeId !== "nexus-dark") return true;
  const palette = THEME_PALETTES[themeId] ?? {};
  if (Object.entries(palette).some(([key, value]) => layout[key] != null && !sameColor(layout[key], value))) return true;
  const defaultFont = THEME_TOKENS[themeId]?.fontFamily ?? "Inter";
  return layout.fontFamily != null && layout.fontFamily !== defaultFont;
};

const resolveGlobalDesign = ({ design = globalThis.game?.nexus?.design, root = globalThis.document?.documentElement } = {}) => {
  if (!root?.classList?.contains?.("nexus-design-system")) return null;
  try { return design?.getEffectiveTheme?.() ?? null; } catch { return null; }
};

/** Whether a sheet should write its own theme tokens instead of inheriting the global profile. */
export const shouldUseLocalTheme = (layout = {}, environment = {}) => {
  const effective = resolveGlobalDesign(environment);
  if (!effective) return true; // Design System inactive: keep the legacy per-sheet behavior.
  if (effective.allowPlayerOverrides === false) return false; // Campaign policy forces the global theme.
  return isLayoutThemeCustomized(layout);
};

/**
 * Applies (or clears) the sheet-local theme on one element.
 * options.base: write the full token set; colors: legacy color shortcuts;
 * windowTokens: window accent and font family for the application element.
 */
export const applyScopedTheme = (element, layout = {}, options = {}, environment = {}) => {
  if (!element?.style) return [];
  const { base = true, colors = false, windowTokens = false } = options;
  const previous = scopedTokenKeys.get(element) ?? [];
  if (shouldUseLocalTheme(layout, environment)) {
    const keys = new Set(base ? (applyThemeTokens(element, layout) ?? []) : []);
    if (colors) for (const [token, key, fallback] of LOCAL_COLOR_TOKENS) {
      element.style.setProperty(token, layout[key] ?? fallback);
      keys.add(token);
    }
    if (windowTokens) {
      element.style.setProperty("--nexus-window-accent", layout.accentColor ?? "#52647b");
      element.style.setProperty("--nexus-font-family", `"${layout.fontFamily ?? "Inter"}", sans-serif`);
      LOCAL_WINDOW_TOKENS.forEach(token => keys.add(token));
    }
    // Calls with different options share one element; remember every token we ever wrote
    // so a later switch to the global profile can clear all of them.
    scopedTokenKeys.set(element, [...new Set([...previous, ...keys])]);
    return [...keys];
  }
  const tokens = new Set([...previous, ...LOCAL_COLOR_TOKENS.map(([token]) => token), ...LOCAL_WINDOW_TOKENS]);
  for (const token of tokens) element.style.removeProperty(token);
  scopedTokenKeys.delete(element);
  const effective = resolveGlobalDesign(environment);
  // The window frame derives its accent from this token; point it at the global profile.
  if (windowTokens) element.style.setProperty("--nexus-window-accent", "var(--nexus-panel-accent)");
  // Legacy [data-theme] selectors (light canvas text) must follow the global preset.
  if (element.dataset && effective?.theme) element.dataset.theme = effective.theme;
  return [];
};

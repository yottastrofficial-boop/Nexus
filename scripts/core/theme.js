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

export const applyThemeTokens = (element, layout = {}) => {
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
    "--nexus-scrollbar-track": layout.scrollColor ?? theme.scroll,
    "--nexus-scrollbar-thumb": layout.accentColor ?? theme.accent,
    "--nexus-scrollbar-thumb-hover": layout.highlightColor ?? theme.highlight,
    "--nexus-surface-raised": layout.cardColor ?? theme.card,
    "--nexus-surface-sunken": theme.input,
    "--nexus-border-subtle": `color-mix(in srgb, ${theme.border} 58%, transparent)`,
    "--nexus-border-strong": layout.accentColor ?? theme.border,
    "--nexus-text-primary": theme.text,
    "--nexus-text-secondary": theme.muted,
    "--nexus-text-disabled": `color-mix(in srgb, ${theme.muted} 58%, transparent)`,
    "--nexus-focus-ring": layout.highlightColor ?? theme.highlight,
    "--nexus-field-bg": theme.input,
    "--nexus-field-text": theme.text,
    "--nexus-field-border": theme.border,
    "--nexus-field-focus": layout.highlightColor ?? theme.highlight,
    "--nexus-button-primary": layout.buttonColor ?? theme.button,
    "--nexus-button-primary-hover": `color-mix(in srgb, ${layout.buttonColor ?? theme.button} 82%, ${theme.text})`,
    "--nexus-button-primary-text": theme.text,
    "--nexus-state-success": layout.theme === "light" ? "#247647" : "#79c99a",
    "--nexus-state-warning": layout.theme === "light" ? "#8a5a12" : "#e6bd68",
    "--nexus-state-danger": layout.theme === "light" ? "#a83232" : "#e58a8a",
    "--nexus-state-info": layout.theme === "light" ? "#245f91" : "#83bce8",
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

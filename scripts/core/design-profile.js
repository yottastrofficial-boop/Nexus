import { DEFAULT_DESIGN_THEME, DESIGN_THEME_CHOICES } from "./design-constants.js";
import { THEME_TOKENS } from "./theme.js";

export const DESIGN_PROFILE_SCHEMA_VERSION = 1;
export const DESIGN_PROFILE_FORMAT = "NEXUS-DESIGN/1";

export const DESIGN_PROFILE_PALETTE_KEYS = Object.freeze([
  "panel", "surface", "input", "border", "text", "muted", "hover",
  "scroll", "windowHeader", "windowContent", "menu", "placeholder",
  "resourceButton", "canvas", "card", "accent", "highlight", "button"
]);

export const DESIGN_FONT_CHOICES = Object.freeze({
  Inter: "Inter",
  Arial: "Arial",
  Georgia: "Georgia",
  "Trebuchet MS": "Trebuchet MS",
  Verdana: "Verdana",
  "system-ui": "Padrão do sistema",
  monospace: "Monoespaçada"
});

export const DESIGN_DENSITY_CHOICES = Object.freeze({
  compact: "Compacta",
  comfortable: "Confortável",
  spacious: "Espaçosa"
});

export const DESIGN_RADIUS_CHOICES = Object.freeze({
  sharp: "Angular",
  soft: "Suave",
  rounded: "Arredondada"
});

export const DESIGN_CONTRAST_CHOICES = Object.freeze({
  normal: "Padrão",
  high: "Alto contraste"
});

const COLOR_PATTERN = /^#(?:[0-9a-f]{3}|[0-9a-f]{6})$/i;
const clamp = (value, min, max, fallback) => {
  const number = Number(value);
  return Number.isFinite(number) ? Math.min(max, Math.max(min, number)) : fallback;
};
const isRecord = value => value !== null && typeof value === "object" && !Array.isArray(value);
const normalizeColor = (value, fallback) => {
  const color = String(value ?? "").toLowerCase();
  if (!COLOR_PATTERN.test(color)) return fallback;
  return color.length === 4 ? "#" + [...color.slice(1)].map(channel => channel + channel).join("") : color;
};

export function createDefaultDesignProfile(themeId = DEFAULT_DESIGN_THEME) {
  const theme = THEME_TOKENS[themeId] ?? THEME_TOKENS[DEFAULT_DESIGN_THEME];
  const safeThemeId = Object.hasOwn(DESIGN_THEME_CHOICES, themeId) ? themeId : DEFAULT_DESIGN_THEME;
  return {
    schemaVersion: DESIGN_PROFILE_SCHEMA_VERSION,
    id: "active",
    name: DESIGN_THEME_CHOICES[safeThemeId],
    preset: safeThemeId,
    palette: Object.fromEntries(DESIGN_PROFILE_PALETTE_KEYS.map(key => [key, theme[key]])),
    typography: {
      family: theme.fontFamily ?? (safeThemeId === "steam" ? "Arial" : safeThemeId === "pixel-art" ? "monospace" : "Inter"),
      baseSize: 13,
      secondarySize: 11,
      valueSize: 20,
      lineHeight: 1.45
    },
    layout: {
      density: safeThemeId === "steam" || safeThemeId === "pixel-art" ? "compact" : "comfortable",
      radius: safeThemeId === "steam" || safeThemeId === "pixel-art" ? "sharp" : safeThemeId === "medieval" ? "soft" : "rounded",
      spacing: 1,
      controlHeight: 34
    },
    accessibility: {
      contrast: "normal",
      reducedMotion: false
    }
  };
}

export function normalizeDesignProfile(raw, { fallbackPreset = DEFAULT_DESIGN_THEME } = {}) {
  const source = isRecord(raw) ? raw : {};
  const preset = Object.hasOwn(DESIGN_THEME_CHOICES, source.preset) ? source.preset : fallbackPreset;
  const defaults = createDefaultDesignProfile(preset);
  const paletteSource = isRecord(source.palette) ? source.palette : {};
  const typographySource = isRecord(source.typography) ? source.typography : {};
  const layoutSource = isRecord(source.layout) ? source.layout : {};
  const accessibilitySource = isRecord(source.accessibility) ? source.accessibility : {};

  const palette = Object.fromEntries(DESIGN_PROFILE_PALETTE_KEYS.map(key => [
    key,
    normalizeColor(paletteSource[key], defaults.palette[key])
  ]));

  const family = Object.hasOwn(DESIGN_FONT_CHOICES, typographySource.family)
    ? typographySource.family
    : defaults.typography.family;

  return {
    schemaVersion: DESIGN_PROFILE_SCHEMA_VERSION,
    id: typeof source.id === "string" && /^[a-z0-9][a-z0-9_-]{0,47}$/i.test(source.id) ? source.id : "active",
    name: typeof source.name === "string" && source.name.trim()
      ? source.name.trim().slice(0, 64)
      : defaults.name,
    preset,
    palette,
    typography: {
      family,
      baseSize: clamp(typographySource.baseSize, 11, 18, defaults.typography.baseSize),
      secondarySize: clamp(typographySource.secondarySize, 9, 16, defaults.typography.secondarySize),
      valueSize: clamp(typographySource.valueSize, 14, 28, defaults.typography.valueSize),
      lineHeight: clamp(typographySource.lineHeight, 1.2, 1.8, defaults.typography.lineHeight)
    },
    layout: {
      density: Object.hasOwn(DESIGN_DENSITY_CHOICES, layoutSource.density) ? layoutSource.density : defaults.layout.density,
      radius: Object.hasOwn(DESIGN_RADIUS_CHOICES, layoutSource.radius) ? layoutSource.radius : defaults.layout.radius,
      spacing: clamp(layoutSource.spacing, 0.75, 1.5, defaults.layout.spacing),
      controlHeight: clamp(layoutSource.controlHeight, 28, 44, defaults.layout.controlHeight)
    },
    accessibility: {
      contrast: Object.hasOwn(DESIGN_CONTRAST_CHOICES, accessibilitySource.contrast) ? accessibilitySource.contrast : "normal",
      reducedMotion: accessibilitySource.reducedMotion === true
    }
  };
}


function hexToRgb(color) {
  const hex = color.slice(1);
  const normalized = hex.length === 3 ? [...hex].map(char => char + char).join("") : hex;
  const value = Number.parseInt(normalized, 16);
  return { r: (value >> 16) & 255, g: (value >> 8) & 255, b: value & 255 };
}

function luminance(color) {
  const rgb = hexToRgb(color);
  const channels = [rgb.r, rgb.g, rgb.b].map(value => {
    const channel = value / 255;
    return channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
  });
  return channels[0] * 0.2126 + channels[1] * 0.7152 + channels[2] * 0.0722;
}

export function getDesignProfileDiagnostics(raw) {
  const profile = normalizeDesignProfile(raw);
  const pairs = [
    ["Texto principal / painel", profile.palette.text, profile.palette.panel],
    ["Texto principal / superfície", profile.palette.text, profile.palette.surface],
    ["Texto secundário / painel", profile.palette.muted, profile.palette.panel],
    ["Texto / campo", profile.palette.text, profile.palette.input]
  ];
  const checks = pairs.map(([label, foreground, background]) => {
    const values = [luminance(foreground), luminance(background)].sort((a, b) => b - a);
    const ratio = (values[0] + 0.05) / (values[1] + 0.05);
    return { label, ratio: Number(ratio.toFixed(2)), passes: ratio >= (profile.accessibility.contrast === "high" ? 7 : 4.5) };
  });
  return {
    checks,
    warnings: checks.filter(check => !check.passes).map(check => check.label + ": contraste " + check.ratio + ":1")
  };
}

export function exportDesignProfile(raw) {
  const profile = normalizeDesignProfile(raw);
  return JSON.stringify({ format: DESIGN_PROFILE_FORMAT, profile }, null, 2);
}

export function importDesignProfile(payload) {
  const source = typeof payload === "string" ? payload : JSON.stringify(payload);
  if (source.length > 64 * 1024) throw new RangeError("O perfil excede o limite de 64 KB.");
  let parsed;
  try { parsed = JSON.parse(source); }
  catch { throw new TypeError("O arquivo não contém JSON válido."); }
  if (!isRecord(parsed) || parsed.format !== DESIGN_PROFILE_FORMAT || !isRecord(parsed.profile)) {
    throw new TypeError("Formato de perfil NEXUS inválido ou incompatível.");
  }
  if (Number(parsed.profile.schemaVersion ?? 1) > DESIGN_PROFILE_SCHEMA_VERSION) {
    throw new RangeError("O perfil foi criado por uma versão mais recente do NEXUS.");
  }
  return normalizeDesignProfile(parsed.profile);
}

export function profileToThemeLayout(raw) {
  const profile = normalizeDesignProfile(raw);
  const { palette, typography, layout, accessibility } = profile;
  return {
    theme: profile.preset,
    canvasColor: palette.canvas,
    cardColor: palette.card,
    accentColor: palette.accent,
    highlightColor: palette.highlight,
    buttonColor: palette.button,
    scrollColor: palette.scroll,
    windowHeaderColor: palette.windowHeader,
    windowContentColor: palette.windowContent,
    menuColor: palette.menu,
    placeholderColor: palette.placeholder,
    fontFamily: typography.family,
    fontSize: typography.baseSize,
    secondaryFontSize: typography.secondarySize,
    valueFontSize: typography.valueSize,
    lineHeight: typography.lineHeight,
    density: layout.density,
    radius: layout.radius,
    spacing: layout.spacing,
    controlHeight: layout.controlHeight,
    contrast: accessibility.contrast,
    reducedMotion: accessibility.reducedMotion,
    palette
  };
}

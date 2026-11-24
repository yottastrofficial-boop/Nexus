import { DEFAULT_DESIGN_THEME, DESIGN_THEME_CHOICES, DESIGN_MODE_CHOICES } from "./design-constants.js";
import { normalizeDesignProfile, createDefaultDesignProfile, profileToThemeLayout } from "./design-profile.js";
export { DEFAULT_DESIGN_THEME, DESIGN_THEME_CHOICES, DESIGN_MODE_CHOICES } from "./design-constants.js";

const SYSTEM_ID = "nexus";
const WORLD_THEME_SETTING = "designWorldTheme";
const WORLD_OVERRIDE_SETTING = "designAllowPlayerOverrides";
const USER_MODE_SETTING = "designUserMode";
const USER_THEME_SETTING = "designUserTheme";
const WORLD_PROFILE_SETTING = "designWorldProfile";
const USER_PROFILE_SETTING = "designUserProfile";
const CORE_DIRECTORY_NAMES = new Set([
  "ActorDirectory", "CardsDirectory", "CompendiumDirectory", "ItemDirectory",
  "JournalDirectory", "MacroDirectory", "PlaylistDirectory", "RollTableDirectory",
  "SceneDirectory"
]);
const CORE_TAB_NAMES = new Set([
  "actors", "cards", "compendium", "items", "journal", "macros",
  "playlists", "rolltables", "scenes", "combat", "chat", "settings"
]);

const knownTheme = (value, themeIds) => {
  const id = String(value ?? "");
  return themeIds.has(id) ? id : DEFAULT_DESIGN_THEME;
};

export function normalizeDesignWorldSettings(raw = {}, themeIds = new Set(Object.keys(DESIGN_THEME_CHOICES))) {
  const source = raw && typeof raw === "object" && !Array.isArray(raw) ? raw : {};
  return {
    schemaVersion: 1,
    theme: knownTheme(source.theme, themeIds),
    allowPlayerOverrides: source.allowPlayerOverrides !== false
  };
}

export function normalizeDesignUserSettings(raw = {}, themeIds = new Set(Object.keys(DESIGN_THEME_CHOICES))) {
  const source = raw && typeof raw === "object" && !Array.isArray(raw) ? raw : {};
  const mode = Object.hasOwn(DESIGN_MODE_CHOICES, source.mode) ? source.mode : "world";
  return {
    mode,
    theme: knownTheme(source.theme, themeIds)
  };
}

export function resolveDesignTheme(worldRaw = {}, userRaw = {}, themeIds = new Set(Object.keys(DESIGN_THEME_CHOICES))) {
  const world = normalizeDesignWorldSettings(worldRaw, themeIds);
  const user = normalizeDesignUserSettings(userRaw, themeIds);
  if (!world.allowPlayerOverrides) {
    return { theme: world.theme, source: "world", mode: "world", allowPlayerOverrides: false };
  }
  if (user.mode === "system") {
    return { theme: DEFAULT_DESIGN_THEME, source: "system", mode: user.mode, allowPlayerOverrides: true };
  }
  if (user.mode === "personal") {
    return { theme: user.theme, source: "user", mode: user.mode, allowPlayerOverrides: true };
  }
  return { theme: world.theme, source: "world", mode: "world", allowPlayerOverrides: true };
}

function readSetting(gameRef, key, fallback) {
  try {
    const value = gameRef?.settings?.get?.(SYSTEM_ID, key);
    return value === undefined || value === null ? fallback : value;
  } catch {
    return fallback;
  }
}

function registerSetting(gameRef, key, config) {
  const settings = gameRef?.settings;
  if (typeof settings?.register !== "function") return false;
  const fullKey = `${SYSTEM_ID}.${key}`;
  const registry = settings.settings;
  if (registry?.has?.(fullKey)) return false;
  settings.register(SYSTEM_ID, key, config);
  return true;
}

export function installNexusDesignSystem({
  gameRef = globalThis.game,
  documentRef = globalThis.document,
  hooks = globalThis.Hooks,
  themeTokens = {},
  applyThemeTokens = () => {}
} = {}) {
  const themeIds = new Set(Object.keys(themeTokens).length ? Object.keys(themeTokens) : Object.keys(DESIGN_THEME_CHOICES));
  const themeChoices = Object.fromEntries(Object.entries(DESIGN_THEME_CHOICES).filter(([id]) => themeIds.has(id)));
  const hookIds = [];
  let installed = false;

  let previewProfile = null;
  let originalInlineTokens = null;
  let originalDatasetTheme;
  let hasOriginalDatasetTheme = false;

  const getProfile = (scope = "world") => {
    const isUser = scope === "user";
    const fallbackPreset = readSetting(gameRef, isUser ? USER_THEME_SETTING : WORLD_THEME_SETTING, DEFAULT_DESIGN_THEME);
    const raw = readSetting(gameRef, isUser ? USER_PROFILE_SETTING : WORLD_PROFILE_SETTING, {});
    return normalizeDesignProfile(raw, { fallbackPreset: knownTheme(fallbackPreset, themeIds) });
  };

  const getEffectiveTheme = () => {
    const resolved = resolveDesignTheme(
      {
        theme: readSetting(gameRef, WORLD_THEME_SETTING, DEFAULT_DESIGN_THEME),
        allowPlayerOverrides: readSetting(gameRef, WORLD_OVERRIDE_SETTING, true)
      },
      {
        mode: readSetting(gameRef, USER_MODE_SETTING, "world"),
        theme: readSetting(gameRef, USER_THEME_SETTING, DEFAULT_DESIGN_THEME)
      },
      themeIds
    );
    const profile = previewProfile
      ? normalizeDesignProfile(previewProfile)
      : resolved.source === "user"
        ? getProfile("user")
        : resolved.source === "system"
          ? createDefaultDesignProfile(DEFAULT_DESIGN_THEME)
          : getProfile("world");
    return { ...resolved, theme: profile.preset, profile };
  };

  const apply = () => {
    const root = documentRef?.documentElement;
    const resolved = getEffectiveTheme();
    if (!root?.style || !themeTokens[resolved.theme]) return resolved;
    if (!hasOriginalDatasetTheme) {
      originalDatasetTheme = root.dataset?.theme;
      hasOriginalDatasetTheme = true;
    }
    applyThemeTokens(root, profileToThemeLayout(resolved.profile), values => {
      if (originalInlineTokens) return;
      originalInlineTokens = new Map();
      for (const key of Object.keys(values)) {
        originalInlineTokens.set(key, {
          value: root.style.getPropertyValue?.(key) ?? "",
          priority: root.style.getPropertyPriority?.(key) ?? ""
        });
      }
    });
    root.classList?.add("nexus-design-system");
    if (root.dataset) {
      root.dataset.nexusDesignSystem = "true";
      root.dataset.nexusTheme = resolved.theme;
      root.dataset.nexusThemeSource = previewProfile ? "preview" : resolved.source;
      root.dataset.nexusThemeAppearance = resolved.theme === "light" ? "light" : "dark";
      root.dataset.nexusContrast = resolved.profile.accessibility.contrast;
      root.dataset.nexusReducedMotion = String(resolved.profile.accessibility.reducedMotion);
    }
    return resolved;
  };

  const canEditScope = scope => scope === "world"
    ? gameRef?.user?.isGM === true
    : scope === "user" && readSetting(gameRef, WORLD_OVERRIDE_SETTING, true) !== false;

  const saveProfile = async (raw, scope = "world") => {
    if (!canEditScope(scope)) throw new Error(scope === "world"
      ? "Somente o Mestre pode alterar a aparência da campanha."
      : "A campanha não permite temas individuais.");
    const profile = normalizeDesignProfile(raw);
    const isUser = scope === "user";
    const profileKey = isUser ? USER_PROFILE_SETTING : WORLD_PROFILE_SETTING;
    const themeKey = isUser ? USER_THEME_SETTING : WORLD_THEME_SETTING;
    await gameRef.settings.set(SYSTEM_ID, profileKey, profile);
    await gameRef.settings.set(SYSTEM_ID, themeKey, profile.preset);
    if (isUser) await gameRef.settings.set(SYSTEM_ID, USER_MODE_SETTING, "personal");
    previewProfile = null;
    refresh();
    return profile;
  };

  const preview = raw => {
    previewProfile = normalizeDesignProfile(raw);
    return apply();
  };

  const clearPreview = () => {
    previewProfile = null;
    return apply();
  };

  const refresh = () => {
    try { apply(); }
    catch (error) { console.error("NEXUS | Não foi possível aplicar o Design System.", error); }
  };

  const onRenderApplication = (application, element) => {
    const name = application?.constructor?.name ?? "";
    const tabName = String(application?.tabName ?? "").toLowerCase();
    const isNexusApplication = element?.classList?.contains?.("nexus")
      || element?.classList?.contains?.("nexus-window")
      || element?.classList?.contains?.("nexus-panel-window")
      || name.startsWith("Nexus");
    if (!isNexusApplication && !CORE_DIRECTORY_NAMES.has(name) && !CORE_TAB_NAMES.has(tabName)) return;
    element?.classList?.add("nexus-themed-application");
    if (CORE_DIRECTORY_NAMES.has(name) || ["actors", "cards", "items", "journal", "macros", "playlists", "rolltables", "scenes", "compendium"].includes(tabName)) {
      element?.classList?.add("nexus-themed-directory");
    }
    if (isNexusApplication) element?.classList?.add("nexus-design-surface");
  };

  const register = () => {
    if (installed) return;
    installed = true;
    registerSetting(gameRef, WORLD_THEME_SETTING, {
      name: "Tema padrão da campanha",
      hint: "Define a aparência compartilhada do NEXUS para este mundo.",
      scope: "world",
      config: false,
      type: String,
      choices: themeChoices,
      default: DEFAULT_DESIGN_THEME,
      requiresReload: false,
      onChange: refresh
    });
    registerSetting(gameRef, WORLD_OVERRIDE_SETTING, {
      name: "Permitir temas individuais",
      hint: "Quando desativado, todos seguem o tema definido para a campanha.",
      scope: "world",
      config: true,
      type: Boolean,
      default: true,
      requiresReload: false,
      onChange: refresh
    });
    registerSetting(gameRef, USER_MODE_SETTING, {
      name: "Minha preferência de aparência",
      hint: "Escolha seguir a campanha, usar o padrão NEXUS ou aplicar um tema individual, se permitido pelo mestre.",
      scope: "user",
      config: true,
      type: String,
      choices: DESIGN_MODE_CHOICES,
      default: "world",
      requiresReload: false,
      onChange: refresh
    });
    registerSetting(gameRef, USER_THEME_SETTING, {
      name: "Meu tema pessoal",
      hint: "Tema utilizado quando sua preferência estiver definida como Minha aparência.",
      scope: "user",
      config: false,
      type: String,
      choices: themeChoices,
      default: DEFAULT_DESIGN_THEME,
      requiresReload: false,
      onChange: refresh
    });
    registerSetting(gameRef, WORLD_PROFILE_SETTING, {
      name: "Perfil visual da campanha",
      hint: "Perfil visual avançado editado pelo Estúdio de Aparência.",
      scope: "world",
      config: false,
      type: Object,
      default: {},
      onChange: refresh
    });
    registerSetting(gameRef, USER_PROFILE_SETTING, {
      name: "Perfil visual pessoal",
      hint: "Perfil visual avançado deste usuário.",
      scope: "user",
      config: false,
      type: Object,
      default: {},
      onChange: refresh
    });
    if (typeof hooks?.once === "function") {
      hooks.once("ready", refresh);
    } else {
      refresh();
    }
    if (typeof hooks?.on === "function") {
      const renderHookId = hooks.on("renderApplicationV2", onRenderApplication);
      if (renderHookId) hookIds.push(renderHookId);
      const settingHookId = hooks.on("updateSetting", refresh);
      if (settingHookId) hookIds.push(settingHookId);
    }
  };

  const uninstall = () => {
    if (typeof hooks?.off === "function") for (const id of hookIds) hooks.off(id);
    hookIds.length = 0;
    const root = documentRef?.documentElement;
    root?.classList?.remove("nexus-design-system");
    if (root?.style && originalInlineTokens) {
      for (const [key, original] of originalInlineTokens) {
        if (original.value) root.style.setProperty(key, original.value, original.priority);
        else root.style.removeProperty?.(key);
      }
    }
    originalInlineTokens = null;
    if (root?.dataset) {
      delete root.dataset.nexusDesignSystem;
      delete root.dataset.nexusTheme;
      delete root.dataset.nexusThemeSource;
      delete root.dataset.nexusThemeAppearance;
      delete root.dataset.nexusContrast;
      delete root.dataset.nexusReducedMotion;
      if (originalDatasetTheme === undefined) delete root.dataset.theme;
      else root.dataset.theme = originalDatasetTheme;
    }
    originalDatasetTheme = undefined;
    hasOriginalDatasetTheme = false;
    installed = false;
  };

  register();
  const registerStudio = ApplicationClass => {
    if (typeof ApplicationClass !== "function" || typeof gameRef?.settings?.registerMenu !== "function") return false;
    const menuKey = "designStudio";
    if (gameRef.settings.menus?.has?.(`${SYSTEM_ID}.${menuKey}`)) return false;
    gameRef.settings.registerMenu(SYSTEM_ID, menuKey, {
      name: "Estúdio de Aparência",
      label: "Abrir Estúdio",
      hint: "Personalize paleta, tipografia, densidade, acessibilidade e perfis visuais.",
      icon: "fa-solid fa-palette",
      type: ApplicationClass,
      restricted: false
    });
    return true;
  };

  return {
    apply,
    getEffectiveTheme,
    getProfile,
    canEditScope,
    saveProfile,
    preview,
    clearPreview,
    registerStudio,
    uninstall
  };
}

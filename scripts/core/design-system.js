export const DEFAULT_DESIGN_THEME = "nexus-dark";
export const DESIGN_THEME_CHOICES = {
  "nexus-dark": "NEXUS — Escuro",
  midnight: "Meia-noite",
  light: "Claro",
  steam: "Steam",
  linux: "Linux",
  medieval: "Medieval",
  "pixel-art": "Pixel Art"
};

export const DESIGN_MODE_CHOICES = {
  world: "Seguir aparência da campanha",
  system: "Padrão original do NEXUS",
  personal: "Minha aparência"
};

const SYSTEM_ID = "nexus";
const WORLD_THEME_SETTING = "designWorldTheme";
const WORLD_OVERRIDE_SETTING = "designAllowPlayerOverrides";
const USER_MODE_SETTING = "designUserMode";
const USER_THEME_SETTING = "designUserTheme";
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

  const getEffectiveTheme = () => resolveDesignTheme(
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

  const apply = () => {
    const root = documentRef?.documentElement;
    if (!root?.style || !themeTokens[getEffectiveTheme().theme]) return getEffectiveTheme();
    const resolved = getEffectiveTheme();
    applyThemeTokens(root, { theme: resolved.theme });
    root.classList?.add("nexus-design-system");
    if (root.dataset) {
      root.dataset.nexusDesignSystem = "true";
      root.dataset.nexusTheme = resolved.theme;
      root.dataset.nexusThemeSource = resolved.source;
      root.dataset.nexusThemeAppearance = resolved.theme === "light" ? "light" : "dark";
    }
    return resolved;
  };

  const refresh = () => {
    try { apply(); }
    catch (error) { console.error("NEXUS | Não foi possível aplicar o Design System.", error); }
  };

  const onRenderApplication = (application, element) => {
    const name = application?.constructor?.name ?? "";
    const tabName = String(application?.tabName ?? "").toLowerCase();
    if (!CORE_DIRECTORY_NAMES.has(name) && !CORE_TAB_NAMES.has(tabName)) return;
    element?.classList?.add("nexus-themed-application");
    if (CORE_DIRECTORY_NAMES.has(name) || ["actors", "cards", "items", "journal", "macros", "playlists", "rolltables", "scenes", "compendium"].includes(tabName)) {
      element?.classList?.add("nexus-themed-directory");
    }
  };

  const register = () => {
    if (installed) return;
    installed = true;
    registerSetting(gameRef, WORLD_THEME_SETTING, {
      name: "Tema padrão da campanha",
      hint: "Define a aparência compartilhada do NEXUS para este mundo.",
      scope: "world",
      config: true,
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
      config: true,
      type: String,
      choices: themeChoices,
      default: DEFAULT_DESIGN_THEME,
      requiresReload: false,
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
    if (root?.dataset) {
      delete root.dataset.nexusDesignSystem;
      delete root.dataset.nexusTheme;
      delete root.dataset.nexusThemeSource;
      delete root.dataset.nexusThemeAppearance;
    }
    installed = false;
  };

  register();
  return { apply, getEffectiveTheme, uninstall };
}

import test from "node:test";
import assert from "node:assert/strict";
import {
  DEFAULT_DESIGN_THEME,
  normalizeDesignWorldSettings,
  normalizeDesignUserSettings,
  resolveDesignTheme,
  installNexusDesignSystem
} from "../scripts/core/design-system.js";
import { THEME_TOKENS, applyThemeTokens } from "../scripts/core/theme.js";
import { createDesignStudioApplicationClass } from "../scripts/apps/design-studio.js";
import {
  createDefaultDesignProfile,
  normalizeDesignProfile,
  getDesignProfileDiagnostics,
  exportDesignProfile,
  importDesignProfile,
  profileToThemeLayout
} from "../scripts/core/design-profile.js";


test("theme typography uses its preset font unless a layout explicitly overrides it", () => {
  const values = new Map();
  const element = {
    style: { setProperty(key, value) { values.set(key, value); } },
    dataset: {}
  };
  applyThemeTokens(element, { theme: "medieval" });
  assert.equal(values.get("--nexus-font-family"), '"Georgia", sans-serif');
  assert.equal(values.get("--nexus-font-ui"), '"Georgia", sans-serif');

  applyThemeTokens(element, { theme: "pixel-art" });
  assert.equal(values.get("--nexus-font-family"), "monospace, sans-serif");

  applyThemeTokens(element, { theme: "steam" });
  assert.equal(values.get("--nexus-font-family"), '"Arial", sans-serif');

  applyThemeTokens(element, { theme: "medieval", fontFamily: "Inter" });
  assert.equal(values.get("--nexus-font-family"), '"Inter", sans-serif');

  applyThemeTokens(element, { theme: "medieval", fontFamily: "Inter; color: red" });
  assert.equal(values.get("--nexus-font-family"), '"Georgia", sans-serif');
});



test("theme renderer applies custom palette, density, spacing and accessibility tokens", () => {
  const values = new Map();
  const element = { style: { setProperty(key, value) { values.set(key, value); } }, dataset: {} };
  applyThemeTokens(element, {
    theme: "nexus-dark",
    palette: { panel: "#101010", text: "#fefefe", border: "#aaaaaa", accent: "#334455" },
    density: "compact",
    spacing: 1.25,
    radius: "sharp",
    controlHeight: 40,
    lineHeight: 1.6,
    contrast: "high",
    reducedMotion: true
  });
  assert.equal(values.get("--nexus-panel-bg"), "#101010");
  assert.equal(values.get("--nexus-panel-text"), "#fefefe");
  assert.equal(values.get("--nexus-panel-border"), "#aaaaaa");
  assert.equal(values.get("--nexus-density-scale"), "0.88");
  assert.equal(values.get("--nexus-radius-small"), "0px");
  assert.equal(values.get("--nexus-control-height"), "40px");
  assert.equal(values.get("--nexus-line-height"), "1.6");
  assert.equal(values.get("--nexus-contrast-border-width"), "2px");
  assert.equal(values.get("--nexus-motion-duration"), "0ms");

  applyThemeTokens(element, {
    theme: "medieval",
    palette: { panel: "url(javascript:alert(1))", text: "red", accent: "#abc" },
    canvasColor: "url(https://example.invalid/track)"
  });
  assert.equal(values.get("--nexus-panel-bg"), THEME_TOKENS.medieval.panel);
  assert.equal(values.get("--nexus-panel-text"), THEME_TOKENS.medieval.text);
  assert.equal(values.get("--nexus-panel-accent"), "#aabbcc");
  assert.equal(values.get("--nexus-canvas-color"), THEME_TOKENS.medieval.canvas);
});


test("Design Studio uses ApplicationV2, exposes allowed scopes and blocks unauthorized users", async () => {
  class FakeApplicationV2 {
    static DEFAULT_OPTIONS = {};
    async _prepareContext() { return { baseContext: true }; }
    _canRender() { return true; }
    async _onRender() {}
    async _onClose() {}
  }
  const design = {
    getProfile: () => createDefaultDesignProfile("midnight"),
    canEditScope: scope => scope === "user",
    saveProfile: async profile => profile,
    preview() {},
    clearPreview() {}
  };
  const Application = createDesignStudioApplicationClass({
    ApplicationV2: FakeApplicationV2,
    HandlebarsApplicationMixin: Base => class extends Base {},
    design
  });
  const app = new Application();
  const context = await app._prepareContext();
  assert.equal(context.baseContext, true);
  assert.equal(context.profile.preset, "midnight");
  assert.equal(context.targetOptions.length, 1);
  assert.equal(context.targetOptions[0].value, "user");
  assert.equal(app._canRender({}), true);

  const denied = createDesignStudioApplicationClass({
    ApplicationV2: FakeApplicationV2,
    HandlebarsApplicationMixin: Base => class extends Base {},
    design: { ...design, canEditScope: () => false }
  });
  assert.equal(new denied()._canRender({}), false);
});

test("design profiles normalize values, reject unsafe CSS payloads and preserve schema", () => {
  const profile = normalizeDesignProfile({
    preset: "medieval",
    name: "  Minha campanha  ",
    palette: { panel: "url(javascript:alert(1))", text: "#fff", accent: "#12abef" },
    typography: { family: "url(https://example.invalid/font)", baseSize: 99, secondarySize: null, lineHeight: 0.2 },
    layout: { density: "extreme", radius: "sharp", spacing: null, controlHeight: 100 },
    accessibility: { contrast: "high", reducedMotion: true }
  });
  assert.equal(profile.preset, "medieval");
  assert.equal(profile.name, "Minha campanha");
  assert.equal(profile.palette.panel, THEME_TOKENS.medieval.panel);
  assert.equal(profile.palette.text, "#ffffff");
  assert.equal(profile.typography.family, "Georgia");
  assert.equal(profile.typography.baseSize, 18);
  assert.equal(profile.typography.secondarySize, 11);
  assert.equal(profile.typography.lineHeight, 1.2);
  assert.equal(profile.layout.density, "comfortable");
  assert.equal(profile.layout.radius, "sharp");
  assert.equal(profile.layout.spacing, 1);
  assert.equal(profile.layout.controlHeight, 44);
  assert.equal(profile.accessibility.contrast, "high");
  assert.equal(profile.accessibility.reducedMotion, true);
});

test("design profile diagnostics calculate text contrast and imports use a versioned safe envelope", () => {
  const dark = createDefaultDesignProfile("nexus-dark");
  const report = getDesignProfileDiagnostics(dark);
  assert.equal(report.checks.length, 4);
  assert.ok(report.checks.every(check => Number.isFinite(check.ratio)));
  const serialized = exportDesignProfile(dark);
  assert.deepEqual(importDesignProfile(serialized), dark);
  assert.throws(() => importDesignProfile('{"format":"OTHER","profile":{}}'), /incompatível/);
  assert.throws(() => importDesignProfile(JSON.stringify({ format: "NEXUS-DESIGN/1", profile: { schemaVersion: 99 } })), /versão mais recente/);
  assert.throws(() => importDesignProfile("x".repeat(64 * 1024 + 1)), /64 KB/);
  assert.throws(() => importDesignProfile("{invalid"), /JSON válido/);
});

test("profile-to-layout maps custom tokens to the existing theme renderer contract", () => {
  const profile = createDefaultDesignProfile("pixel-art");
  profile.palette.panel = "#112233";
  profile.typography.baseSize = 15;
  profile.layout.density = "spacious";
  profile.layout.controlHeight = 40;
  profile.accessibility.reducedMotion = true;
  const layout = profileToThemeLayout(profile);
  assert.equal(layout.theme, "pixel-art");
  assert.equal(layout.palette.panel, "#112233");
  assert.equal(layout.fontFamily, "monospace");
  assert.equal(layout.fontSize, 15);
  assert.equal(layout.density, "spacious");
  assert.equal(layout.controlHeight, 40);
  assert.equal(layout.reducedMotion, true);
});


test("design system restores pre-existing inline CSS tokens when uninstalled", () => {
  const values = new Map([["--nexus-panel-bg", "#abcdef"]]);
  const root = {
    style: {
      setProperty(key, value) { values.set(key, value); },
      getPropertyValue(key) { return values.get(key) ?? ""; },
      getPropertyPriority() { return ""; },
      removeProperty(key) { values.delete(key); }
    },
    dataset: { theme: "external-theme" },
    classList: { values: new Set(), add(value) { this.values.add(value); }, remove(value) { this.values.delete(value); } }
  };
  let ready;
  const hooks = { once(name, callback) { if (name === "ready") ready = callback; }, on() { return "hook"; }, off() {} };
  const gameRef = {
    user: { isGM: true },
    settings: {
      settings: new Map(),
      register(namespace, key, config) { this.settings.set(namespace + "." + key, config); },
      get(namespace, key) { return this.settings.get(namespace + "." + key)?.default; }
    }
  };
  const design = installNexusDesignSystem({
    gameRef,
    documentRef: { documentElement: root },
    hooks,
    themeTokens: THEME_TOKENS,
    applyThemeTokens
  });
  ready();
  assert.notEqual(values.get("--nexus-panel-bg"), "#abcdef");
  assert.notEqual(root.dataset.theme, "external-theme");
  design.uninstall();
  assert.equal(values.get("--nexus-panel-bg"), "#abcdef");
  assert.equal(values.has("--nexus-font-family"), false);
  assert.equal(root.dataset.theme, "external-theme");
});

test("Design System normalizes unknown theme IDs and malformed settings safely", () => {
  assert.deepEqual(normalizeDesignWorldSettings({ theme: "not-a-theme", allowPlayerOverrides: "false" }), {
    schemaVersion: 1,
    theme: DEFAULT_DESIGN_THEME,
    allowPlayerOverrides: true
  });
  assert.deepEqual(normalizeDesignUserSettings({ mode: "invalid", theme: "invalid" }), {
    mode: "world",
    theme: DEFAULT_DESIGN_THEME
  });
});

test("campaign, system and personal theme precedence is explicit", () => {
  assert.deepEqual(resolveDesignTheme(
    { theme: "medieval", allowPlayerOverrides: true },
    { mode: "world", theme: "light" }
  ), { theme: "medieval", source: "world", mode: "world", allowPlayerOverrides: true });
  assert.deepEqual(resolveDesignTheme(
    { theme: "medieval", allowPlayerOverrides: true },
    { mode: "system", theme: "light" }
  ), { theme: "nexus-dark", source: "system", mode: "system", allowPlayerOverrides: true });
  assert.deepEqual(resolveDesignTheme(
    { theme: "medieval", allowPlayerOverrides: true },
    { mode: "personal", theme: "light" }
  ), { theme: "light", source: "user", mode: "personal", allowPlayerOverrides: true });
});

test("campaign can enforce its theme without deleting personal preferences", () => {
  assert.deepEqual(resolveDesignTheme(
    { theme: "medieval", allowPlayerOverrides: false },
    { mode: "personal", theme: "light" }
  ), { theme: "medieval", source: "world", mode: "world", allowPlayerOverrides: false });
});

test("installer registers authoritative world settings and per-user preferences", async () => {
  const records = new Map();
  const menus = new Map();
  const values = new Map();
  const handlers = new Map();
  let ready;
  const gameRef = {
    user: { isGM: true },
    settings: {
      settings: records,
      menus,
      registerMenu(namespace, key, config) { menus.set(`${namespace}.${key}`, config); },
      register(namespace, key, config) {
        const id = `${namespace}.${key}`;
        records.set(id, config);
        values.set(id, config.default);
      },
      get(namespace, key) { return values.get(`${namespace}.${key}`); },
      async set(namespace, key, value) {
        values.set(`${namespace}.${key}`, value);
        records.get(`${namespace}.${key}`)?.onChange?.(value);
        return value;
      }
    }
  };
  const root = {
    style: { setProperty() {} },
    dataset: {},
    classList: { values: new Set(), add(value) { this.values.add(value); }, remove(value) { this.values.delete(value); } }
  };
  const hooks = {
    once(name, callback) { if (name === "ready") ready = callback; },
    on(name, callback) { handlers.set(name, callback); return name; },
    off(name) { handlers.delete(name); }
  };
  const applied = [];
  const design = installNexusDesignSystem({
    gameRef,
    documentRef: { documentElement: root },
    hooks,
    themeTokens: THEME_TOKENS,
    applyThemeTokens(element, layout) { applied.push(layout.theme); element.dataset.theme = layout.theme; }
  });

  assert.equal(records.get("nexus.designWorldTheme").scope, "world");
  assert.equal(records.get("nexus.designWorldTheme").config, false);
  assert.equal(records.get("nexus.designAllowPlayerOverrides").scope, "world");
  assert.equal(records.get("nexus.designUserMode").scope, "user");
  assert.equal(records.get("nexus.designUserTheme").scope, "user");
  assert.equal(records.get("nexus.designUserTheme").config, false);
  assert.equal(records.get("nexus.designWorldProfile").scope, "world");
  assert.equal(records.get("nexus.designUserProfile").scope, "user");
  assert.equal(design.canEditScope("world"), true);
  assert.equal(design.registerStudio(class DesignStudio {}), true);
  assert.equal(menus.get("nexus.designStudio").restricted, false);

  ready();
  assert.equal(root.dataset.nexusTheme, "nexus-dark");
  assert.equal(root.dataset.nexusThemeSource, "world");
  assert.ok(root.classList.values.has("nexus-design-system"));

  const campaignProfile = createDefaultDesignProfile("medieval");
  campaignProfile.name = "Campanha de Teste";
  campaignProfile.palette.panel = "#302010";
  await design.saveProfile(campaignProfile, "world");
  assert.equal(design.getProfile("world").name, "Campanha de Teste");
  assert.equal(design.getEffectiveTheme().theme, "medieval");
  assert.equal(root.dataset.nexusTheme, "medieval");

  const previewProfile = createDefaultDesignProfile("light");
  design.preview(previewProfile);
  assert.equal(root.dataset.nexusTheme, "light");
  assert.equal(root.dataset.nexusThemeSource, "preview");
  design.clearPreview();
  assert.equal(root.dataset.nexusTheme, "medieval");

  values.set("nexus.designWorldTheme", "medieval");
  records.get("nexus.designWorldTheme").onChange("medieval");
  assert.equal(root.dataset.nexusTheme, "medieval");

  values.set("nexus.designUserMode", "personal");
  values.set("nexus.designUserTheme", "light");
  design.apply();
  assert.equal(root.dataset.nexusTheme, "light");
  assert.equal(root.dataset.nexusThemeSource, "user");

  values.set("nexus.designAllowPlayerOverrides", false);
  assert.equal(design.canEditScope("user"), false);
  await assert.rejects(() => design.saveProfile(createDefaultDesignProfile("light"), "user"), /não permite/);
  design.apply();
  assert.equal(root.dataset.nexusTheme, "medieval");
  assert.equal(root.dataset.nexusThemeSource, "world");

  class ActorDirectory {}
  const directoryElement = { classList: { values: new Set(), add(value) { this.values.add(value); } } };
  handlers.get("renderApplicationV2")?.(new ActorDirectory(), directoryElement);
  assert.ok(directoryElement.classList.values.has("nexus-themed-application"));
  assert.ok(directoryElement.classList.values.has("nexus-themed-directory"));

  class ThirdPartyWindow {}
  const thirdPartyElement = { classList: { values: new Set(), add(value) { this.values.add(value); } } };
  handlers.get("renderApplicationV2")?.(new ThirdPartyWindow(), thirdPartyElement);
  assert.equal(thirdPartyElement.classList.values.size, 0);
  assert.ok(handlers.has("updateSetting"), "A sincronização de configurações do mundo deve reaplicar o tema.");
  design.uninstall();
  assert.equal(root.classList.values.has("nexus-design-system"), false);
});

import test from "node:test";
import assert from "node:assert/strict";
import {
  DEFAULT_DESIGN_THEME,
  normalizeDesignWorldSettings,
  normalizeDesignUserSettings,
  resolveDesignTheme,
  installNexusDesignSystem
} from "../scripts/core/design-system.js";
import { THEME_TOKENS } from "../scripts/core/theme.js";

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

test("installer registers authoritative world settings and per-user preferences", () => {
  const records = new Map();
  const values = new Map();
  const handlers = new Map();
  let ready;
  const gameRef = {
    settings: {
      settings: records,
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
  assert.equal(records.get("nexus.designAllowPlayerOverrides").scope, "world");
  assert.equal(records.get("nexus.designUserMode").scope, "user");
  assert.equal(records.get("nexus.designUserTheme").scope, "user");

  ready();
  assert.equal(root.dataset.nexusTheme, "nexus-dark");
  assert.equal(root.dataset.nexusThemeSource, "world");
  assert.ok(root.classList.values.has("nexus-design-system"));

  values.set("nexus.designWorldTheme", "medieval");
  records.get("nexus.designWorldTheme").onChange("medieval");
  assert.equal(root.dataset.nexusTheme, "medieval");

  class ActorDirectory {}
  handlers.get("renderApplicationV2")?.(new ActorDirectory(), { classList: { values: new Set(), add(value) { this.values.add(value); } } });
  assert.ok(applied.length >= 2);
  design.uninstall();
  assert.equal(root.classList.values.has("nexus-design-system"), false);
});

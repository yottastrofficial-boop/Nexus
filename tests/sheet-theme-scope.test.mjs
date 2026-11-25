import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { installNexusDesignSystem } from "../scripts/core/design-system.js";
import {
  DEFAULT_LAYOUT, THEME_PALETTES, THEME_TOKENS, applyThemeTokens, applyScopedTheme, isLayoutThemeCustomized, shouldUseLocalTheme
} from "../scripts/core/theme.js";

const element = () => {
  const props = new Map();
  return { props, dataset: {}, style: {
    setProperty: (key, value) => props.set(key, String(value)),
    removeProperty: key => props.delete(key),
    getPropertyValue: key => props.get(key) ?? ""
  } };
};
const env = (effective, active = true) => ({
  design: effective ? { getEffectiveTheme: () => effective } : undefined,
  root: { classList: { contains: name => active && name === "nexus-design-system" } }
});
const GLOBAL_LIGHT = { theme: "light", allowPlayerOverrides: true };
const defaultLayout = () => ({ ...structuredClone(DEFAULT_LAYOUT), ...structuredClone(THEME_PALETTES["nexus-dark"]) });

// --- customization detection -------------------------------------------------
assert.equal(isLayoutThemeCustomized(defaultLayout()), false, "Saved defaults are not a customization.");
assert.equal(isLayoutThemeCustomized({ ...defaultLayout(), theme: "light" }), true);
assert.equal(isLayoutThemeCustomized({ ...defaultLayout(), accentColor: "#ff0000" }), true);
assert.equal(isLayoutThemeCustomized({ ...defaultLayout(), customThemeId: "abc" }), true);
assert.equal(isLayoutThemeCustomized({ ...defaultLayout(), cardColor: THEME_PALETTES["nexus-dark"].cardColor.toUpperCase() }), false,
  "Hex case must not count as a customization.");

// --- precedence rules --------------------------------------------------------
assert.equal(shouldUseLocalTheme(defaultLayout(), env(null)), true, "No Design System: legacy local behavior.");
assert.equal(shouldUseLocalTheme(defaultLayout(), env(GLOBAL_LIGHT, false)), true, "Design System not applied to <html>: keep local tokens.");
assert.equal(shouldUseLocalTheme(defaultLayout(), env(GLOBAL_LIGHT)), false, "Default layout must follow the global profile.");
assert.equal(shouldUseLocalTheme({ ...defaultLayout(), theme: "midnight" }, env(GLOBAL_LIGHT)), true, "A deliberate sheet theme is kept.");
assert.equal(shouldUseLocalTheme({ ...defaultLayout(), theme: "midnight" }, env({ ...GLOBAL_LIGHT, allowPlayerOverrides: false })), false,
  "A campaign that forbids local themes wins over a customized sheet.");

// --- default sheet inherits: stale inline tokens are removed ----------------
const sheet = element();
sheet.props.set("--nexus-panel-bg", "#182330");
sheet.props.set("--nexus-card-color", "#273443");
applyScopedTheme(sheet, { ...defaultLayout(), theme: "midnight" }, { colors: true }, env(null));
assert.ok(sheet.props.size > 5, "Local mode writes the sheet tokens.");
applyScopedTheme(sheet, defaultLayout(), { colors: true }, env(GLOBAL_LIGHT));
assert.equal(sheet.props.size, 0, "Following the global profile must leave no inline token on the sheet.");
assert.equal(sheet.dataset.theme, "light", "Legacy [data-theme] selectors must follow the global preset.");

// --- customized sheet still wins locally; policy can override it ------------
const custom = element();
const customLayout = { ...defaultLayout(), accentColor: "#ff0000" };
applyScopedTheme(custom, customLayout, { colors: true }, env(GLOBAL_LIGHT));
assert.equal(custom.props.get("--nexus-accent-color"), "#ff0000");
applyScopedTheme(custom, customLayout, { colors: true }, env({ ...GLOBAL_LIGHT, allowPlayerOverrides: false }));
assert.equal(custom.props.size, 0, "Policy change must clear previously written local tokens.");


// --- transitions against the real Design System ---------------------------------
// A real installNexusDesignSystem drives the settings; sheets re-scope on "nexusDesignApplied".
const createWorld = (initial = {}) => {
  const values = new Map(Object.entries({ designWorldTheme: "nexus-dark", designAllowPlayerOverrides: true, ...initial }));
  const registered = new Map();
  const listeners = [];
  const rootProps = new Map();
  const root = {
    style: { setProperty: (k, v) => rootProps.set(k, v), getPropertyValue: k => rootProps.get(k) ?? "", getPropertyPriority: () => "", removeProperty: k => rootProps.delete(k) },
    dataset: {},
    classList: { set: new Set(), add(v) { this.set.add(v); }, remove(v) { this.set.delete(v); }, contains(v) { return this.set.has(v); } }
  };
  let ready;
  const hooks = {
    once: (name, cb) => { if (name === "ready") ready = cb; },
    on: () => "id", off() {},
    callAll: name => { if (name === "nexusDesignApplied") listeners.forEach(cb => cb()); }
  };
  const gameRef = { user: { isGM: true }, settings: {
    register: (ns, key, config) => registered.set(key, config),
    get: (ns, key) => values.has(key) ? values.get(key) : registered.get(key)?.default
  } };
  const design = installNexusDesignSystem({ gameRef, documentRef: { documentElement: root }, hooks, themeTokens: THEME_TOKENS, applyThemeTokens });
  gameRef.nexus = { design };
  ready();
  const change = (key, value) => { values.set(key, value); registered.get(key)?.onChange?.(value); };
  return { design, root, change, onApplied: cb => listeners.push(cb), environment: { design, root } };
};

// Policy: campaign allows -> forbids -> allows again, with the sheet re-scoping on each announcement.
{
  const world = createWorld({ designWorldTheme: "light" });
  const sheetEl = element();
  const layout = { ...defaultLayout(), accentColor: "#ff0000" };
  const rescope = () => applyScopedTheme(sheetEl, layout, { colors: true }, world.environment);
  world.onApplied(rescope);
  rescope();
  assert.equal(sheetEl.props.get("--nexus-accent-color"), "#ff0000", "Customized sheet keeps its local accent while overrides are allowed.");
  world.change("designAllowPlayerOverrides", false);
  assert.equal(sheetEl.props.size, 0, "Forbidding individual themes must clear local tokens on the open sheet.");
  assert.equal(sheetEl.dataset.theme, "light", "Cleared sheet follows the campaign preset.");
  world.change("designAllowPlayerOverrides", true);
  assert.equal(sheetEl.props.get("--nexus-accent-color"), "#ff0000", "Re-enabling the policy restores the customization.");
}

// Default sheet: a different global profile reaches an already-open sheet without a re-render.
{
  const world = createWorld({ designWorldTheme: "nexus-dark" });
  const sheetEl = element();
  const rescope = () => applyScopedTheme(sheetEl, defaultLayout(), {}, world.environment);
  world.onApplied(rescope);
  rescope();
  assert.equal(sheetEl.dataset.theme, "nexus-dark");
  assert.equal(sheetEl.props.size, 0);
  world.change("designWorldTheme", "light");
  assert.equal(sheetEl.dataset.theme, "light", "Legacy [data-theme] selectors follow the new profile live.");
  assert.equal(sheetEl.props.size, 0, "Following sheets never hold inline tokens.");
}

// Design System uninstalled: legacy local behavior returns and the transition writes tokens again.
{
  const world = createWorld();
  const sheetEl = element();
  applyScopedTheme(sheetEl, defaultLayout(), { colors: true }, world.environment);
  assert.equal(sheetEl.props.size, 0);
  world.design.uninstall();
  applyScopedTheme(sheetEl, defaultLayout(), { colors: true }, world.environment);
  assert.ok(sheetEl.props.size > 5, "Without the Design System the sheet writes its own tokens again.");
}

// --- partial calls on one element must not erase each other's tokens -------
const shared = element();
applyScopedTheme(shared, customLayout, {}, env(GLOBAL_LIGHT));
applyScopedTheme(shared, customLayout, { base: false, colors: true, windowTokens: true }, env(GLOBAL_LIGHT));
assert.ok(shared.props.has("--nexus-panel-bg") && shared.props.has("--nexus-window-accent"), "Base and window tokens must coexist.");
applyScopedTheme(shared, defaultLayout(), {}, env(GLOBAL_LIGHT));
assert.equal(shared.props.has("--nexus-panel-bg"), false, "Switching to the global profile clears every token written earlier.");

// --- application window keeps its frame accent bound to the global profile --
const frame = element();
applyScopedTheme(frame, defaultLayout(), { base: false, colors: true, windowTokens: true }, env(GLOBAL_LIGHT));
assert.equal(frame.props.get("--nexus-window-accent"), "var(--nexus-panel-accent)");
assert.equal(frame.props.has("--nexus-font-family"), false);

// --- no sheet code writes theme tokens behind the helper's back -------------
const read = path => readFileSync(new URL(path, import.meta.url), "utf8");
for (const file of ["../scripts/sheets/actor-sheet-v1.0.0.js", "../scripts/sheets/actor-sheet-listeners.js", "../scripts/sheets/canvas-viewport.js", "../scripts/sheets/panel-window.js"]) {
  const source = read(file);
  assert.doesNotMatch(source, /applyThemeTokens\(/, `${file} must use applyScopedTheme.`);
  assert.doesNotMatch(source, /setProperty\(\s*"--nexus-(canvas|card|accent|highlight|button)-color"/, `${file} must not write color tokens directly.`);
  assert.doesNotMatch(source, /setProperty\(\s*"--nexus-window-accent"/, `${file} must not write the window accent directly.`);
}

console.log("NEXUS sheet theme scope: OK");

// --- legacy light-theme rules must not hard-code colors (they would ignore custom profiles) ---
{
  const legacy = read("../styles/nexus-v1.0.0.css").replace(/\/\*[\s\S]*?\*\//g, "");
  const lightRules = [...legacy.matchAll(/([^{}]*data-theme="light"[^{}]*)\{([^{}]*)\}/g)];
  assert.ok(lightRules.length >= 4, "The legacy light-theme rules must still exist.");
  for (const [, selector, body] of lightRules) {
    for (const declaration of body.split(";").filter(part => /^\s*(color|background|border-color)\s*:/.test(part))) {
      assert.doesNotMatch(declaration.replace(/var\([^)]*\)/g, ""), /#[0-9a-f]{3,8}\b/i,
        `Light-theme rule "${selector.trim()}" must take its colors from the active tokens: ${declaration.trim()}`);
    }
  }
}

// Contrato: estados de seleção/foco do Canvas e da Biblioteca usam o token de destaque com fallback.
{
  const { readFileSync } = await import("node:fs");
  const css = readFileSync(new URL("../styles/nexus-v1.0.0.css", import.meta.url), "utf8");
  for (const needle of [
    ".nexus-library-asset:focus-visible { outline:2px solid var(--nexus-accent-color,#a9c9ef)",
    ".nexus-component.is-selected { outline:1px solid var(--nexus-accent-color,#a9c9ef)",
    "88%,var(--nexus-accent-color,#a9c9ef) 12%"
  ]) assert.ok(css.includes(needle), `Token de seleção ausente: ${needle}`);
}

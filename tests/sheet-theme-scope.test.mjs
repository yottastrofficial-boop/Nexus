import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  DEFAULT_LAYOUT, THEME_PALETTES, applyScopedTheme, isLayoutThemeCustomized, shouldUseLocalTheme
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

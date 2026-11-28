import test from "node:test";
import assert from "node:assert/strict";
import { createDefaultDesignProfile } from "../scripts/core/design-profile.js";
import { getLibraryDesignProfilePreviewModel, createLibraryThemeApplicationAdapter } from "../scripts/library/theme-inspector.js";

test("Inspector model previews the complete semantic palette and visual settings", () => {
  const profile = createDefaultDesignProfile("medieval");
  profile.id = "medieval-library";
  profile.name = "Cidadela";
  profile.typography.family = "Georgia";
  profile.typography.baseSize = 15;
  profile.layout.density = "spacious";
  profile.layout.radius = "soft";
  profile.layout.controlHeight = 40;
  profile.accessibility.contrast = "high";
  profile.accessibility.reducedMotion = true;

  const model = getLibraryDesignProfilePreviewModel({
    kind: "design-profile",
    name: "Cidadela",
    profile
  });

  assert.equal(model.supported, true);
  assert.equal(model.name, "Cidadela");
  assert.equal(model.presetLabel, "Medieval");
  assert.equal(model.palette.length, 18);
  assert.equal(model.palette.find(color => color.key === "panel").value, profile.palette.panel);
  assert.equal(model.typography.family, "Georgia");
  assert.equal(model.typography.displayFamily, "Cinzel");
  assert.equal(model.typography.baseSize, 15);
  assert.equal(model.layout.densityLabel, "Espaçosa");
  assert.equal(model.layout.radiusLabel, "Suave");
  assert.equal(model.layout.controlHeight, 40);
  assert.equal(model.accessibility.contrast, "high");
  assert.equal(model.accessibility.reducedMotion, true);
  assert.equal(model.diagnostics.checks.length, 4);
});

test("Inspector normalizes unsafe colors and out-of-range visual values before rendering", () => {
  const profile = createDefaultDesignProfile("nexus-dark");
  profile.palette.panel = "url(javascript:alert(1))";
  profile.typography.family = "Arial; background:url(javascript:alert(1))";
  profile.typography.baseSize = 999;
  profile.layout.controlHeight = -10;
  const model = getLibraryDesignProfilePreviewModel({ kind: "design-profile", profile });

  assert.equal(model.supported, true);
  assert.match(model.palette.find(color => color.key === "panel").value, /^#[0-9a-f]{6}$/i);
  assert.equal(model.typography.family, "Inter");
  assert.equal(model.typography.displayFamily, "Inter");
  assert.equal(model.typography.baseSize, 18);
  assert.equal(model.layout.controlHeight, 28);
  assert.ok(model.palette.every(color => /^#[0-9a-f]{6}$/i.test(color.value)));
});

test("Inspector refuses to normalize or preview future profile schemas", () => {
  const model = getLibraryDesignProfilePreviewModel({
    kind: "design-profile",
    profile: { schemaVersion: 99, palette: { panel: "#123456" }, futureData: { keep: true } }
  });
  assert.equal(model.supported, false);
  assert.equal(model.schemaVersion, 99);
  assert.match(model.message, /versão mais recente/);
});

test("Inspector refuses malformed schema versions instead of downgrading them", () => {
  for (const schemaVersion of [0, -1, 1.5, "not-a-version"]) {
    const model = getLibraryDesignProfilePreviewModel({ schemaVersion, palette: { panel: "#123456" } });
    assert.equal(model.supported, false);
    assert.match(model.message, /schema.*inválida/i);
  }
});

test("theme application adapter exposes only scopes authorized by the Design System", () => {
  const calls = [];
  const design = {
    canEditScope: scope => scope === "user",
    saveProfile: async (profile, scope) => calls.push({ profile, scope })
  };
  const adapter = createLibraryThemeApplicationAdapter({ getDesign: () => design });
  const resource = { kind: "theme" };
  const resolved = { kind: "design-profile", profile: createDefaultDesignProfile("steam") };

  assert.equal(adapter.canApplyTheme(resource, resolved, "world"), false);
  assert.equal(adapter.canApplyTheme(resource, resolved, "user"), true);
  assert.equal(adapter.canApplyTheme({ kind: "style" }, resolved, "user"), false);
  assert.equal(adapter.canApplyTheme(resource, { kind: "design-profile", profile: { schemaVersion: 99 } }, "user"), false);
});

test("applying a campaign theme requires explicit confirmation and saves to world scope", async () => {
  const calls = [];
  const design = {
    canEditScope: scope => scope === "world",
    saveProfile: async (profile, scope) => calls.push({ profile, scope })
  };
  let confirmations = 0;
  const adapter = createLibraryThemeApplicationAdapter({
    getDesign: () => design,
    confirm: async options => {
      confirmations++;
      assert.equal(options.window.title, "Alterar aparência da campanha");
      return true;
    }
  });
  const resource = { kind: "theme" };
  const resolved = { kind: "design-profile", profile: createDefaultDesignProfile("linux") };

  assert.equal(await adapter.onApplyTheme(resource, resolved, "world"), true);
  assert.equal(confirmations, 1);
  assert.deepEqual(calls, [{ profile: resolved.profile, scope: "world" }]);
});

test("cancelled campaign application never writes and personal application does not require campaign confirmation", async () => {
  const calls = [];
  const design = {
    canEditScope: scope => scope === "world" || scope === "user",
    saveProfile: async (profile, scope) => calls.push({ profile, scope })
  };
  let confirmations = 0;
  const adapter = createLibraryThemeApplicationAdapter({
    getDesign: () => design,
    confirm: async () => { confirmations++; return false; }
  });
  const resource = { kind: "theme" };
  const resolved = { kind: "design-profile", profile: createDefaultDesignProfile("light") };

  assert.equal(await adapter.onApplyTheme(resource, resolved, "world"), false);
  assert.equal(calls.length, 0);
  assert.equal(await adapter.onApplyTheme(resource, resolved, "user"), true);
  assert.equal(confirmations, 1);
  assert.deepEqual(calls, [{ profile: resolved.profile, scope: "user" }]);
});

test("theme application rejects invalid scope and profiles without write side effects", async () => {
  let writes = 0;
  const adapter = createLibraryThemeApplicationAdapter({
    getDesign: () => ({
      canEditScope: () => true,
      saveProfile: async () => { writes++; }
    }),
    confirm: async () => true
  });
  await assert.rejects(
    adapter.onApplyTheme({ kind: "theme" }, { kind: "design-profile", profile: createDefaultDesignProfile() }, "actor"),
    /não pode ser aplicado/
  );
  assert.equal(writes, 0);
});


test("campaign application fails visibly when the Foundry confirmation API is unavailable", async () => {
  let writes = 0;
  const adapter = createLibraryThemeApplicationAdapter({
    getDesign: () => ({
      canEditScope: scope => scope === "world",
      saveProfile: async () => { writes++; }
    }),
    confirm: async () => null
  });
  await assert.rejects(
    adapter.onApplyTheme({ kind: "theme" }, { kind: "design-profile", profile: createDefaultDesignProfile() }, "world"),
    /confirmação do Foundry não está disponível/
  );
  assert.equal(writes, 0);
});

test("built-in theme preview resolves its own preset, typography, full palette and component defaults", () => {
  const model = getLibraryDesignProfilePreviewModel({
    id: "builtin-theme:medieval",
    name: "Medieval",
    previewColors: [{ label: "canvasColor", value: "#1b1712" }],
    reference: { builtin: "theme", key: "medieval" }
  });
  assert.equal(model.supported, true);
  assert.equal(model.preset, "medieval");
  assert.equal(model.typography.family, "Georgia");
  assert.equal(model.palette.find(color => color.key === "canvas").value, "#1b1712");
  assert.equal(model.palette.length, 18);
  assert.equal(model.components.panels.background, model.palette.find(color => color.key === "surface").value);
  assert.ok(model.components.buttons && model.components.fields && model.components.containers && model.components.highlights);
});

test("custom theme preview uses sanitized profile metadata, not the active global preset", () => {
  const model = getLibraryDesignProfilePreviewModel({
    id: "themes:custom-medieval",
    name: "Meu tema",
    themePreview: {
      schemaVersion: 3,
      preset: "medieval",
      name: "Meu tema",
      palette: { canvas: "#111111", panel: "#222222", text: "#eeeeee" },
      typography: { family: "Georgia", baseSize: 15 },
      layout: { density: "spacious", radius: "soft", spacing: 1.5, controlHeight: 40 },
      components: { buttons: { background: "#123456", text: "#ffffff", border: "#456789", borderStyle: "dashed", borderWidth: 2, radius: 9 } }
    }
  });
  assert.equal(model.preset, "medieval");
  assert.equal(model.palette.find(color => color.key === "canvas").value, "#111111");
  assert.equal(model.typography.family, "Georgia");
  assert.equal(model.components.buttons.background, "#123456");
  assert.equal(model.components.buttons.borderStyle, "dashed");
});

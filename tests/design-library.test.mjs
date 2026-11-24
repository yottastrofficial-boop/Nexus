import test from "node:test";
import assert from "node:assert/strict";
import { createEmptyNexusLibraryStore, readNexusLibraryStore } from "../scripts/core/library-store.js";
import { createDesignLibraryService } from "../scripts/core/design-library.js";
import { createNexusLibraryProvider } from "../scripts/core/library-resource-registry.js";
import { createDefaultDesignProfile } from "../scripts/core/design-profile.js";
function makeUser(store = createEmptyNexusLibraryStore()) {
  const flags = new Map([["libraryStore", store]]);
  return { getFlag(scope, key) { return scope === "nexus" ? flags.get(key) : undefined; },
    async setFlag(scope, key, value) { if (scope === "nexus") flags.set(key, structuredClone(value)); return value; }, flags };
}
function makeDesign() { const applied = []; return { applied, async saveProfile(profile, scope) { applied.push({ profile: structuredClone(profile), scope }); return profile; } }; }

test("salva perfis completos na coleção themes canônica", async () => {
  const user = makeUser(), design = makeDesign(); let sequence = 0;
  const library = createDesignLibraryService({ getUser: () => user, design, createId: () => "theme-" + (++sequence) });
  const profile = createDefaultDesignProfile("medieval");
  profile.name = "Bosque Antigo"; profile.palette.panel = "#123456"; profile.typography.baseSize = 16;
  profile.layout.density = "spacious"; profile.accessibility.reducedMotion = true;
  const saved = await library.save(profile);
  assert.equal(saved.id, "theme-1"); assert.equal(saved.kind, "design-profile");
  assert.equal(saved.profile.palette.panel, "#123456"); assert.equal(saved.profile.typography.baseSize, 16);
  assert.equal(saved.profile.layout.density, "spacious"); assert.equal(saved.profile.accessibility.reducedMotion, true);
  assert.equal(library.list().length, 1); assert.equal(readNexusLibraryStore(user).store.collections.themes.length, 1);
});
test("duplica, renomeia, aplica e exclui sem alterar o perfil ativo implicitamente", async () => {
  const user = makeUser(), design = makeDesign();
  const library = createDesignLibraryService({ getUser: () => user, design, createId: () => "copy-1" });
  const saved = await library.save(createDefaultDesignProfile("midnight")), copy = await library.duplicate(saved.id);
  assert.notEqual(copy.id, saved.id); assert.match(copy.name, /cópia/);
  const renamed = await library.rename(copy.id, "Noite de Inverno"); assert.equal(renamed.name, "Noite de Inverno");
  const applied = await library.apply(copy.id, "world");
  assert.equal(applied.applied, true); assert.equal(design.applied[0].scope, "world");
  assert.equal(design.applied[0].profile.name, "Noite de Inverno");
  assert.equal((await library.remove(copy.id)).removed, true);
  assert.equal(library.get(copy.id), null); assert.equal(library.get(saved.id).name, saved.name);
});
test("exporta e importa perfis usando NEXUS-DESIGN/1", async () => {
  const source = makeUser(), target = makeUser(), design = makeDesign();
  const a = createDesignLibraryService({ getUser: () => source, design, createId: () => "source-theme" });
  const b = createDesignLibraryService({ getUser: () => target, design, createId: () => "target-theme" });
  const profile = createDefaultDesignProfile("pixel-art"); profile.name = "Pixel NEXUS"; profile.palette.accent = "#abcdef";
  await a.save(profile); const imported = await b.import(a.export("source-theme"));
  assert.equal(imported.profile.preset, "pixel-art"); assert.equal(imported.profile.palette.accent, "#abcdef");
  assert.equal(imported.profile.typography.family, "monospace");
});
test("serializa gravações concorrentes e preserva todos os perfis", async () => {
  const user = makeUser(); let sequence = 0;
  const library = createDesignLibraryService({ getUser: () => user, design: makeDesign(), createId: () => "parallel-" + (++sequence) });
  await Promise.all([library.save(createDefaultDesignProfile("light")), library.save(createDefaultDesignProfile("steam")), library.save(createDefaultDesignProfile("linux"))]);
  assert.equal(library.list().length, 3); assert.equal(new Set(library.list().map(entry => entry.id)).size, 3);
});
test("rejeita importação inválida e operações sobre perfis inexistentes", async () => {
  const library = createDesignLibraryService({ getUser: () => makeUser(), design: makeDesign(), createId: () => "theme-a" });
  await assert.rejects(library.import("{invalid"), /JSON válido/);
  await assert.rejects(library.rename("missing", "Novo nome"), /não existe/);
  await assert.rejects(library.apply("missing", "world"), /não existe/);
  await assert.rejects(library.remove("missing"), /não existe/);
});


test("bloqueia exclusão quando outra coleção referencia o perfil salvo", async () => {
  const user = makeUser(), library = createDesignLibraryService({ getUser: () => user, design: makeDesign(), createId: () => "theme-dependent" });
  const saved = await library.save(createDefaultDesignProfile("medieval"));
  const store = user.flags.get("libraryStore");
  store.collections.components.push({ id: "dependent-component", dependencies: [saved.id] });
  await user.setFlag("nexus", "libraryStore", store);
  await assert.rejects(library.remove(saved.id), /dependências/);
  assert.ok(library.get(saved.id));
});


test("preserva perfis de schema futuro sem expor nem sobrescrever dados desconhecidos", async () => {
  const store = createEmptyNexusLibraryStore();
  store.collections.themes.push({
    id: "future-profile", sourceId: "design-profile-future", kind: "design-profile",
    name: "Perfil futuro", profile: { schemaVersion: 99, futureField: { keep: true } }
  });
  const user = makeUser(store);
  const library = createDesignLibraryService({ getUser: () => user, design: makeDesign(), createId: () => "safe-new" });
  assert.equal(library.list().length, 0);
  await assert.rejects(library.rename("future-profile", "Alterado"), /versão mais recente/);
  await assert.rejects(library.remove("future-profile"), /versão mais recente/);
  assert.deepEqual(user.flags.get("libraryStore").collections.themes[0].profile.futureField, { keep: true });
});


test("Universal Library indexa e resolve perfis salvos como recursos de tema", async () => {
  const user = makeUser(), library = createDesignLibraryService({ getUser: () => user, design: makeDesign(), createId: () => "indexed-theme" });
  const saved = await library.save(createDefaultDesignProfile("steam"));
  const provider = createNexusLibraryProvider({ getUser: () => user, catalog: { assets: [], themes: [] } });
  const result = await provider.list({ kind: "theme" });
  const resource = result.items.find(item => item.reference?.collection === "themes" && item.reference.id === saved.id);
  assert.ok(resource);
  assert.equal(resource.kind, "theme");
  const resolved = await provider.resolve(resource.reference, resource);
  assert.equal(resolved.kind, "design-profile");
  assert.equal(resolved.profile.preset, "steam");
  assert.equal(resolved.profile.layout.density, "compact");
});

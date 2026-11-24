import { getLegacyNexusLibraryFlags, readNexusLibraryStore, updateNexusLibraryStore } from "./library-store.js";
import { normalizeDesignProfile, exportDesignProfile, importDesignProfile } from "./design-profile.js";

const MAX_PROFILES = 100;
const cleanName = value => String(value ?? "").trim().slice(0, 64);
const clone = value => globalThis.foundry?.utils?.deepClone ? globalThis.foundry.utils.deepClone(value) : JSON.parse(JSON.stringify(value));

/** Reusable profiles live in the canonical Library themes collection; active profiles remain Foundry settings. */
export function createDesignLibraryService({ getUser, design, createId } = {}) {
  if (typeof getUser !== "function") throw new TypeError("getUser() é obrigatório.");
  if (!design || typeof design.saveProfile !== "function") throw new TypeError("O serviço Design System é obrigatório.");
  const makeId = typeof createId === "function" ? createId : () => globalThis.foundry?.utils?.randomID?.(12) ?? Math.random().toString(36).slice(2, 14);
  const readEntries = () => {
    const user = getUser();
    if (!user) throw new Error("Não foi possível identificar o usuário da Biblioteca.");
    return readNexusLibraryStore(user, getLegacyNexusLibraryFlags(user)).store.collections.themes
      .filter(entry => entry?.kind === "design-profile" && entry.profile && Number(entry.profile.schemaVersion ?? 1) <= 1)
      .map(entry => ({ ...clone(entry), profile: normalizeDesignProfile(entry.profile) }));
  };
  const get = id => { const entry = readEntries().find(item => item.id === String(id ?? "")); return entry ? clone(entry) : null; };
  const list = () => readEntries().sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: "base" }) || a.id.localeCompare(b.id));
  const save = async (rawProfile, { id = "" } = {}) => {
    const user = getUser();
    if (!user) throw new Error("Não foi possível identificar o usuário da Biblioteca.");
    const profile = normalizeDesignProfile(rawProfile), requestedId = String(id ?? "").trim();
    let savedEntry;
    await updateNexusLibraryStore(user, store => {
      const entries = store.collections.themes;
      const index = requestedId ? entries.findIndex(entry => String(entry.id) === requestedId && entry.kind === "design-profile") : -1;
      if (requestedId && index < 0) throw new Error("O perfil selecionado não existe mais na Biblioteca.");
      if (index >= 0 && Number(entries[index].profile?.schemaVersion ?? 1) > 1) {
        throw new Error("O perfil foi criado por uma versão mais recente do NEXUS e não pode ser sobrescrito.");
      }
      if (index < 0 && entries.length >= MAX_PROFILES) throw new Error("A coleção de temas da Biblioteca atingiu o limite de 100 itens.");
      let entryId = requestedId;
      if (!entryId) for (let attempt = 0; attempt < 5; attempt++) {
        const seed = String(makeId() ?? "").trim();
        const candidate = (attempt === 0 ? seed : seed + "-" + (attempt + 1)).slice(0, 128);
        if (candidate && !entries.some(entry => String(entry.id) === candidate)) { entryId = candidate; break; }
      }
      if (!entryId) throw new Error("Não foi possível gerar um identificador único para o perfil.");
      profile.id = entryId;
      const previous = index >= 0 ? entries[index] : null;
      savedEntry = { ...(previous ?? {}), id: entryId, sourceId: "design-profile-" + entryId, kind: "design-profile",
        name: cleanName(profile.name) || "Aparência sem nome", description: "Perfil visual completo do NEXUS.",
        tags: ["design", "theme"], palette: clone(profile.palette), profile: clone(profile),
        createdAt: previous?.createdAt ?? new Date().toISOString(), updatedAt: new Date().toISOString() };
      if (index >= 0) entries[index] = savedEntry; else entries.push(savedEntry);
      return store;
    });
    return clone(savedEntry);
  };
  const duplicate = async id => {
    const original = get(id);
    if (!original) throw new Error("O perfil selecionado não existe mais na Biblioteca.");
    const profile = clone(original.profile); profile.id = ""; profile.name = (cleanName(original.name) || "Aparência") + " (cópia)";
    return save(profile);
  };
  const rename = async (id, name) => {
    const user = getUser(), nextName = cleanName(name);
    if (!nextName) throw new Error("Informe um nome para o perfil.");
    if (!user) throw new Error("Não foi possível identificar o usuário da Biblioteca.");
    let renamed;
    await updateNexusLibraryStore(user, store => {
      const entry = store.collections.themes.find(item => String(item.id) === String(id) && item.kind === "design-profile");
      if (!entry) throw new Error("O perfil selecionado não existe mais na Biblioteca.");
      if (Number(entry.profile?.schemaVersion ?? 1) > 1) throw new Error("O perfil foi criado por uma versão mais recente do NEXUS.");
      entry.name = nextName; entry.profile = normalizeDesignProfile({ ...entry.profile, id: entry.id, name: nextName });
      entry.palette = clone(entry.profile.palette); entry.updatedAt = new Date().toISOString(); renamed = clone(entry); return store;
    });
    return renamed;
  };
  const remove = async id => {
    const user = getUser();
    if (!user) throw new Error("Não foi possível identificar o usuário da Biblioteca.");
    await updateNexusLibraryStore(user, store => {
      const entry = store.collections.themes.find(item => String(item.id) === String(id) && item.kind === "design-profile");
      if (!entry) throw new Error("O perfil selecionado não existe mais na Biblioteca.");
      const dependents = Object.values(store.collections).flatMap(entries => entries.filter(item => item !== entry &&
        Array.isArray(item.dependencies) &&
        item.dependencies.some(value => String(typeof value === "string" ? value : value?.id ?? "") === String(id))));
      if (dependents.length) throw new Error("Este perfil possui dependências e não pode ser excluído.");
      store.collections.themes = store.collections.themes.filter(item => item !== entry); return store;
    });
    return { removed: true, id: String(id) };
  };
  const apply = async (id, scope = "world") => {
    const entry = get(id);
    if (!entry) throw new Error("O perfil selecionado não existe mais na Biblioteca.");
    await design.saveProfile(entry.profile, scope);
    return { applied: true, id: entry.id, scope, profile: clone(entry.profile) };
  };
  const exportProfile = id => {
    const entry = get(id);
    if (!entry) throw new Error("O perfil selecionado não existe mais na Biblioteca.");
    return exportDesignProfile(entry.profile);
  };
  const importProfile = async payload => save(importDesignProfile(payload));
  return Object.freeze({ list, get, save, duplicate, rename, remove, apply, export: exportProfile, import: importProfile });
}

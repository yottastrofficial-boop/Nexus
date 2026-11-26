import { matchesLibrarySearchQuery } from "./library-search-query.js";

/**
 * NEXUS Foundry Document Bridge — referências leves a documentos nativos.
 *
 * O bridge não duplica documentos na Biblioteca e não mantém cópias completas
 * em memória. Consultas retornam metadados paginados; o documento só é resolvido
 * quando uma ação especializada realmente precisa dele.
 */
const DOCUMENT_TYPES = Object.freeze({
  actors: { label: "Atores", documentName: "Actor", collection: "actors" },
  items: { label: "Itens", documentName: "Item", collection: "items" },
  scenes: { label: "Cenas", documentName: "Scene", collection: "scenes" },
  journals: { label: "Diários", documentName: "JournalEntry", collection: "journal" },
  macros: { label: "Macros", documentName: "Macro", collection: "macros" },
  playlists: { label: "Playlists", documentName: "Playlist", collection: "playlists" },
  tables: { label: "Tabelas aleatórias", documentName: "RollTable", collection: "tables" },
  cards: { label: "Cartas", documentName: "Cards", collection: "cards" }
});

const safeLimit = value => Math.min(100, Math.max(1, Math.floor(Number(value) || 50)));
const searchableText = (value, maxLength = 6000) => {
  const parts = [], seen = new WeakSet();
  const visit = (entry, depth = 0) => {
    if (parts.join(" ").length >= maxLength || depth > 4 || entry == null) return;
    if (typeof entry === "string" || typeof entry === "number" || typeof entry === "boolean") {
      const text = String(entry).replace(/<[^>]*>/g, " ").trim();
      if (text) parts.push(text.slice(0, 500));
      return;
    }
    if (typeof entry !== "object" || seen.has(entry)) return;
    seen.add(entry);
    let entries = [];
    try { entries = Object.entries(entry).slice(0, 80); } catch { return; }
    for (const [key, child] of entries) {
      if (/^(img|image|texture|thumbnail|icon|_id|id|uuid|sort|ownership|permission)$/i.test(key)) continue;
      parts.push(key);
      visit(child, depth + 1);
      if (parts.join(" ").length >= maxLength) break;
    }
  };
  visit(value);
  return parts.join(" ").slice(0, maxLength);
};
const makeSearchText = (document, packLabel = "") => searchableText({
  name: document?.name, type: document?.type, identifier: document?.identifier,
  slug: document?.slug, folder: document?.folder?.name ?? document?.folder,
  description: document?.description, system: document?.system, pack: document?.pack, packLabel
});


export function createFoundryDocumentBridge({
  gameRef = globalThis.game,
  fromUuidRef = globalThis.fromUuid
} = {}) {
  if (!gameRef) throw new Error("O Foundry ainda não disponibilizou game para o bridge de documentos.");

  const metadataCache = new WeakMap();
  const observerPermission = globalThis.CONST?.DOCUMENT_OWNERSHIP_LEVELS?.OBSERVER ?? 2;
  const canViewDocument = document => {
    const user = gameRef.user;
    if (user?.isGM === true) return true;
    if (!user || typeof document?.testUserPermission !== "function") return false;
    try { return document.testUserPermission(user, observerPermission) === true; }
    catch { return false; }
  };
  const canViewPack = pack => {
    if (!pack || pack.visible === false) return false;
    const user = gameRef.user;
    if (user?.isGM === true) return true;
    if (!user || typeof pack.testUserPermission !== "function") return false;
    try { return pack.testUserPermission(user, observerPermission) === true; }
    catch { return false; }
  };
  const assertCanResolve = document => {
    if (document?.pack) {
      const pack = gameRef.packs?.get?.(String(document.pack));
      if (!canViewPack(pack)) throw new Error("Sem permissão para acessar este compêndio.");
      return;
    }
    if (!canViewDocument(document)) throw new Error("Sem permissão para acessar este documento.");
  };
  const describe = (document, type) => {
    const cached = metadataCache.get(document);
    if (cached?.has(type)) return cached.get(type);
    const definition = DOCUMENT_TYPES[type];
    const record = Object.freeze({
      id: String(document.id ?? document._id ?? ""),
      uuid: String(document.uuid ?? ""),
      type,
      documentName: definition.documentName,
      collection: definition.collection,
      documentType: String(document.type ?? ""),
      name: String(document.name ?? "Sem nome"),
      img: String(document.img ?? document.thumbnail ?? ""),
      folder: String(document.folder?.name ?? ""),
      pack: String(document.pack ?? ""),
      packLabel: String(gameRef.packs?.get?.(String(document.pack ?? ""))?.metadata?.label ?? ""),
      searchText: makeSearchText(document, gameRef.packs?.get?.(String(document.pack ?? ""))?.metadata?.label ?? ""),
      sort: Number(document.sort) || 0,
      isCompendium: Boolean(document.pack)
    });
    const byType = cached ?? new Map();
    byType.set(type, record);
    if (!cached) metadataCache.set(document, byType);
    return record;
  };

  const matches = (record, query, tags = [], origin = "all") => {
    // Keep restricted real-world weapon categories out of the searchable/importable
    // NEXUS catalog while allowing unrelated RPG document types.
    if (record.documentName === "Item" && String(record.documentType ?? "").toLocaleLowerCase() === "weapon") return false;
    if (!matchesLibrarySearchQuery(record, query)) return false;
    const recordOrigin = record.isCompendium ? "compendium" : "world";
    if (origin !== "all" && recordOrigin !== origin) return false;
    const recordTags = [record.type, record.documentType, record.isCompendium ? "compendium" : "world"].map(value => String(value).toLocaleLowerCase());
    return !tags.length || tags.every(tag => recordTags.includes(String(tag).toLocaleLowerCase()));
  };

  const list = async ({
    type = "all",
    query = "",
    offset = 0,
    limit = 50,
    compendiumIds = [],
    tags = [],
    origin = "all"
  } = {}) => {
    const search = String(query ?? "").slice(0, 240);
    const requestedTypes = type === "all" ? Object.keys(DOCUMENT_TYPES) : [String(type)];
    const unknown = requestedTypes.filter(key => !DOCUMENT_TYPES[key]);
    if (unknown.length) throw new Error("Tipo de documento Foundry desconhecido: " + unknown.join(", "));
    const search = cleanQuery(query);
    const requestedTags = Array.isArray(tags) ? tags.map(value => String(value).toLocaleLowerCase()).slice(0, 32) : [];
    const start = Math.max(0, Math.floor(Number(offset) || 0));
    const pageSize = safeLimit(limit);
    const items = [];
    let total = 0;
    const errors = [];
    const append = record => {
      if (!matches(record, search, requestedTags, origin)) return;
      if (total >= start && items.length < pageSize) items.push(record);
      total++;
    };

    for (const key of requestedTypes) {
      const definition = DOCUMENT_TYPES[key];
      const collection = gameRef[definition.collection];
      if (collection?.values) {
        for (const document of collection.values()) if (canViewDocument(document)) append(describe(document, key));
      }
    }

    const requestedPacks = new Set((Array.isArray(compendiumIds) ? compendiumIds : []).map(value => String(value)));
    if (requestedPacks.size && gameRef.packs?.values) {
      const foundPacks = new Set();
      for (const pack of gameRef.packs.values()) {
        const packId = String(pack.collection ?? "");
        if (!requestedPacks.has(packId)) continue;
        if (!canViewPack(pack)) {
          errors.push({ pack: packId, message: "Compêndio indisponível ou sem permissão." });
          continue;
        }
        foundPacks.add(packId);
        const typeKey = requestedTypes.find(key => DOCUMENT_TYPES[key].documentName === pack.documentName);
        if (!typeKey || typeof pack.getIndex !== "function") continue;
        try {
          const index = await pack.getIndex();
          for (const entry of index ?? []) {
            const uuid = String(entry.uuid ?? `Compendium.${pack.collection}.${entry._id}`);
            append(Object.freeze({
              id: String(entry._id ?? ""), uuid, type: typeKey,
              documentName: DOCUMENT_TYPES[typeKey].documentName,
              collection: DOCUMENT_TYPES[typeKey].collection,
              documentType: String(entry.type ?? ""),
              name: String(entry.name ?? "Sem nome"),
              img: String(entry.img ?? ""), folder: String(entry.folder?.name ?? ""),
              pack: packId, packLabel: String(pack.metadata?.label ?? packId),
              searchText: makeSearchText(entry, pack.metadata?.label ?? packId),
              sort: Number(entry.sort) || 0,
              isCompendium: true
            }));
          }
        } catch (error) {
          errors.push({ pack: packId, message: String(error?.message ?? error) });
        }
      }
      for (const packId of requestedPacks) {
        if (!foundPacks.has(packId)) errors.push({ pack: packId, message: "Compêndio indisponível nesta sessão." });
      }
    }

    return Object.freeze({
      items: Object.freeze(items), total, offset: start, limit: pageSize,
      hasMore: start + items.length < total, errors: Object.freeze(errors)
    });
  };

  const resolve = async reference => {
    const uuid = typeof reference === "string" ? reference : reference?.uuid;
    if (!uuid || typeof fromUuidRef !== "function") throw new Error("Referência UUID inválida ou resolvedor Foundry indisponível.");
    const document = await fromUuidRef(String(uuid));
    if (!document) throw new Error("O documento referenciado não está mais disponível: " + uuid);
    assertCanResolve(document);
    return document;
  };

  // Reuse lightweight metadata objects while avoiding retention of full documents.
  // Foundry update hooks invalidate only the affected document entry.
  for (const definition of Object.values(DOCUMENT_TYPES)) {
    const suffix = definition.documentName;
    for (const operation of ["create", "update", "delete"]) {
      globalThis.Hooks?.on?.(`${operation}${suffix}`, document => {
        if (document && (typeof document === "object" || typeof document === "function")) {
          metadataCache.delete(document);
        }
      });
    }
  }

  const reference = document => {
    if (!document?.uuid) throw new Error("O documento não possui UUID do Foundry.");
    assertCanResolve(document);
    const type = Object.keys(DOCUMENT_TYPES).find(key => DOCUMENT_TYPES[key].documentName === document.documentName);
    if (!type) throw new Error("Tipo de documento não integrado à Biblioteca.");
    return describe(document, type);
  };

  return Object.freeze({
    types: DOCUMENT_TYPES,
    list,
    resolve,
    reference
  });
}

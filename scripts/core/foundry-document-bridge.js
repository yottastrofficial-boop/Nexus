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

const cleanQuery = value => String(value ?? "").trim().toLocaleLowerCase();
const safeLimit = value => Math.min(100, Math.max(1, Math.floor(Number(value) || 50)));

export function createFoundryDocumentBridge({
  gameRef = globalThis.game,
  fromUuidRef = globalThis.fromUuid
} = {}) {
  if (!gameRef) throw new Error("O Foundry ainda não disponibilizou game para o bridge de documentos.");

  const describe = (document, type) => {
    const definition = DOCUMENT_TYPES[type];
    return Object.freeze({
      id: String(document.id ?? document._id ?? ""),
      uuid: String(document.uuid ?? ""),
      type,
      documentName: definition.documentName,
      collection: definition.collection,
      name: String(document.name ?? "Sem nome"),
      img: String(document.img ?? document.thumbnail ?? ""),
      folder: String(document.folder?.name ?? ""),
      pack: String(document.pack ?? ""),
      sort: Number(document.sort) || 0,
      isCompendium: Boolean(document.pack)
    });
  };

  const matches = (record, query, tags = []) => {
    const textMatch = !query ||
      record.name.toLocaleLowerCase().includes(query) ||
      record.folder.toLocaleLowerCase().includes(query);
    if (!textMatch) return false;
    const recordTags = [record.type, record.isCompendium ? "compendium" : "world"].map(value => String(value).toLocaleLowerCase());
    return !tags.length || tags.every(tag => recordTags.includes(String(tag).toLocaleLowerCase()));
  };

  const list = async ({
    type = "all",
    query = "",
    offset = 0,
    limit = 50,
    compendiumIds = [],
    tags = []
  } = {}) => {
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
      if (!matches(record, search, requestedTags)) return;
      if (total >= start && items.length < pageSize) items.push(record);
      total++;
    };

    for (const key of requestedTypes) {
      const definition = DOCUMENT_TYPES[key];
      const collection = gameRef[definition.collection];
      if (collection?.values) {
        for (const document of collection.values()) append(describe(document, key));
      }
    }

    const requestedPacks = new Set((Array.isArray(compendiumIds) ? compendiumIds : []).map(value => String(value)));
    if (requestedPacks.size && gameRef.packs?.values) {
      const foundPacks = new Set();
      for (const pack of gameRef.packs.values()) {
        const packId = String(pack.collection ?? "");
        if (!requestedPacks.has(packId)) continue;
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
              name: String(entry.name ?? "Sem nome"),
              img: String(entry.img ?? ""), folder: String(entry.folder?.name ?? ""),
              pack: packId, sort: Number(entry.sort) || 0,
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
    return document;
  };

  const reference = document => {
    if (!document?.uuid) throw new Error("O documento não possui UUID do Foundry.");
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

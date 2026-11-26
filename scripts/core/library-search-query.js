/**
 * Lightweight query language for the Universal Library.
 * Terms are ANDed. Supported qualifiers: type:, source:, folder:, tag:, name:.
 * Prefix a term with - to exclude it; quoted phrases keep internal spaces.
 */
const normalize = value => String(value ?? "").normalize("NFKD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("pt-BR").trim();

export function parseLibrarySearchQuery(input = "") {
  const source = String(input ?? "").slice(0, 240);
  const tokens = source.match(/(?:^|\s)(-?)([a-z][a-z0-9_-]*:)?("[^"]*"|'[^']*'|[^\s]+)/giu) ?? [];
  const terms = [];
  for (const raw of tokens) {
    const token = raw.trim();
    const negative = token.startsWith("-");
    const body = negative ? token.slice(1) : token;
    const match = body.match(/^([a-z][a-z0-9_-]*:)?("[^"]*"|'[^']*'|[^\s]+)$/iu);
    if (!match) continue;
    const field = String(match[1] ?? "").slice(0, -1).toLocaleLowerCase();
    const value = normalize(match[2].replace(/^["']|["']$/g, ""));
    if (!value) continue;
    if (field && !["type", "source", "folder", "tag", "name"].includes(field)) {
      terms.push({ field: "text", value: normalize(body), negative });
    } else terms.push({ field: field || "text", value, negative });
  }
  return Object.freeze(terms.map(term => Object.freeze(term)));
}

export function matchesLibrarySearchQuery(record = {}, input = "") {
  const terms = Array.isArray(input) ? input : parseLibrarySearchQuery(input);
  const fields = {
    text: normalize(record.searchText ?? [record.name, record.description, record.folder, record.documentType, record.packLabel].join(" ")),
    name: normalize(record.name),
    type: normalize([record.documentType, record.type, ...(record.tags ?? [])].join(" ")),
    source: normalize([record.source, record.packLabel, record.pack, record.origin].join(" ")),
    folder: normalize(record.folder),
    tag: normalize([...(record.tags ?? []), record.type, record.documentType].join(" "))
  };
  return terms.every(({ field, value, negative }) => {
    const matched = (fields[field] ?? fields.text).includes(value);
    return negative ? !matched : matched;
  });
}

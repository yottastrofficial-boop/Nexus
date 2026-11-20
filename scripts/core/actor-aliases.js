const SAFE_ALIAS_SEGMENT = /^[a-zA-Z][a-zA-Z0-9_-]*$/;

export function slugifyActorAlias(value) {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "") || "novo";
}

export function isSafeActorAliasKey(value) {
  const key = String(value ?? "").trim().replace(/^(?:actor\.|system\.)+/, "");
  return key.split(".").length > 0
    && key.split(".").every(segment => SAFE_ALIAS_SEGMENT.test(segment)
      && !["__proto__", "prototype", "constructor"].includes(segment))
    ? key
    : "";
}

export function createUniqueActorAliasKey(category, label, aliases = [], nativeProperties = [], excludeId = null) {
  const safeCategory = isSafeActorAliasKey(category);
  if (!safeCategory || safeCategory.includes(".")) return "";
  const base = slugifyActorAlias(label);
  const reserved = new Set(
    [...aliases, ...nativeProperties]
      .filter(item => item?.id !== excludeId)
      .flatMap(item => [item?.key, ...(Array.isArray(item?.legacyKeys) ? item.legacyKeys : [])])
      .map(isSafeActorAliasKey)
      .filter(Boolean)
  );
  let candidate = `${safeCategory}.${base}`;
  let suffix = 2;
  while (reserved.has(candidate)) candidate = `${safeCategory}.${base}_${suffix++}`;
  return candidate;
}


/**
 * Move a custom alias payload without replacing an existing destination.
 * The caller owns cloning and persistence so this helper remains pure.
 */
export function moveActorAliasCustomData(customData, previousKey, nextKey) {
  const previous = isSafeActorAliasKey(previousKey);
  const next = isSafeActorAliasKey(nextKey);
  if (!previous || !next || previous === next) return false;

  const read = path => path.split(".").reduce((value, part) => value?.[part], customData);
  const value = read(previous);
  if (value === undefined || read(next) !== undefined) return false;

  const targetParts = next.split(".");
  let target = customData;
  for (const part of targetParts.slice(0, -1)) {
    if (!target[part] || typeof target[part] !== "object" || Array.isArray(target[part])) target[part] = {};
    target = target[part];
  }
  target[targetParts.at(-1)] = value;

  const previousParts = previous.split(".");
  const leaf = previousParts.pop();
  const parent = previousParts.reduce((value, part) => value?.[part], customData);
  if (!parent || typeof parent !== "object" || !Object.hasOwn(parent, leaf)) return false;
  delete parent[leaf];
  return true;
}

/**
 * Rewrite component bindings when an alias key changes, including singular
 * legacy roots accepted by older layouts.
 */
export function replaceActorAliasLayoutReferences(layouts, previousKey, nextKey) {
  const previous = isSafeActorAliasKey(previousKey);
  const next = isSafeActorAliasKey(nextKey);
  if (!previous || !next || previous === next) return 0;

  const legacyPrevious = previous.replace(/^attributes\\./, "attribute.").replace(/^resources\\./, "resource.");
  const legacyNext = next.replace(/^attributes\\./, "attribute.").replace(/^resources\\./, "resource.");
  const replacements = [[previous, next]];
  if (legacyPrevious !== previous) replacements.push([legacyPrevious, legacyNext]);

  let changed = 0;
  for (const layout of Object.values(layouts ?? {})) {
    for (const component of layout?.components ?? []) {
      for (const property of ["dataPath", "currentPath", "maxPath", "customBinding"]) {
        const value = component?.[property];
        if (typeof value !== "string") continue;
        const replacement = replacements.find(([from]) => value === from || value.startsWith(`${from}.`));
        if (!replacement) continue;
        component[property] = `${replacement[1]}${value.slice(replacement[0].length)}`;
        changed++;
      }
    }
  }
  return changed;
}

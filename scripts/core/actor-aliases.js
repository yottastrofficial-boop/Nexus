const SAFE_ALIAS_SEGMENT = /^[a-zA-Z][a-zA-Z0-9_-]*$/;

export function slugifyActorAlias(value) {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\\u0300-\\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "") || "novo";
}

export function isSafeActorAliasKey(value) {
  const key = String(value ?? "").trim().replace(/^(?:actor\\.|system\\.)+/, "");
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

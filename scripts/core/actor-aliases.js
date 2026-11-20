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

/**
 * Normalize a persisted alias definition and retain its previous key as a
 * legacy reference when normalization changes the identifier.
 * The caller supplies ID generation so the core service stays environment-free.
 */
export function normalizeActorAliasDefinition(alias, createId) {
  if (!alias || typeof alias !== "object") return null;
  const category = ["attributes", "resources", "combat", "identity", "custom"].includes(alias.category)
    ? alias.category
    : "custom";
  const originalKey = String(alias.key ?? "").trim().replace(/^system\./, "");
  let key = originalKey;
  const repeated = new RegExp("^(?:" + category + "[.]){2,}", "i");
  if (repeated.test(key)) key = key.replace(repeated, category + ".");
  key = isSafeActorAliasKey(key);
  if (!key) return null;

  const id = alias.id ?? (typeof createId === "function" ? createId() : null);
  if (!id) return null;
  const validTypes = ["attribute", "resource", "number", "text", "url", "image", "boolean"];
  const type = validTypes.includes(alias.type)
    ? alias.type
    : (category === "resources" ? "resource" : category === "attributes" ? "attribute" : category === "identity" ? "text" : "number");
  const calculationMode = alias.calculationMode === "formula" && ["attribute", "resource", "number"].includes(type)
    ? "formula"
    : "manual";
  const legacyKeys = [...new Set(Array.isArray(alias.legacyKeys)
    ? alias.legacyKeys.map(isSafeActorAliasKey).filter(Boolean)
    : [])];
  const safeOriginalKey = isSafeActorAliasKey(originalKey);
  if (safeOriginalKey && safeOriginalKey !== key && !legacyKeys.includes(safeOriginalKey)) {
    legacyKeys.push(safeOriginalKey);
  }

  return {
    ...alias,
    id,
    key,
    category,
    legacyKeys,
    label: String(alias.label ?? key.split(".").at(-1)).slice(0, 48),
    type,
    targetPath: isSafeActorAliasKey(alias.targetPath ?? ""),
    source: alias.source === "actor" ? "actor" : "custom",
    calculationMode,
    formula: String(alias.formula ?? "").slice(0, 240)
  };
}

/**
 * Read stored alias data from its canonical key, falling back to preserved
 * legacy keys when a migration could not move the payload without conflict.
 */
export function getActorAliasCustomValue(customData, alias) {
  if (!customData || typeof customData !== "object" || Array.isArray(customData) || !alias || typeof alias !== "object") return undefined;
  const read = key => {
    const safeKey = isSafeActorAliasKey(key);
    if (!safeKey) return undefined;
    let value = customData;
    for (const part of safeKey.split(".")) {
      if (!value || typeof value !== "object" || !Object.hasOwn(value, part)) return undefined;
      value = value[part];
    }
    return value;
  };
  const current = read(alias.key);
  if (current !== undefined) return current;
  for (const legacyKey of (Array.isArray(alias.legacyKeys) ? alias.legacyKeys : [])) {
    const legacy = read(legacyKey);
    if (legacy !== undefined) return legacy;
  }
  return undefined;
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
 * This helper mutates the supplied object; callers must pass a clone when
 * they need to preserve the original snapshot before persistence.
 *
 * A conflict is explicit: callers must not rename the definition while its
 * payload remains at the old key.
 */
export function moveActorAliasCustomData(customData, previousKey, nextKey) {
  const previous = isSafeActorAliasKey(previousKey);
  const next = isSafeActorAliasKey(nextKey);
  if (!previous || !next || previous === next) return { status: "invalid", changed: false };
  if (previous.startsWith(`${next}.`) || next.startsWith(`${previous}.`)) {
    return { status: "conflict", changed: false };
  }
  if (!customData || typeof customData !== "object" || Array.isArray(customData)) {
    return { status: "invalid", changed: false };
  }

  const previousParts = previous.split(".");
  const previousLeaf = previousParts.pop();
  const previousParent = previousParts.reduce((value, part) => value?.[part], customData);
  if (!previousParent || typeof previousParent !== "object" || Array.isArray(previousParent)
    || !Object.hasOwn(previousParent, previousLeaf) || previousParent[previousLeaf] === undefined) {
    return { status: "missing", changed: false };
  }

  const nextParts = next.split(".");
  let target = customData;
  for (const part of nextParts.slice(0, -1)) {
    if (target[part] !== undefined && (!target[part] || typeof target[part] !== "object" || Array.isArray(target[part]))) {
      return { status: "conflict", changed: false };
    }
    target = target[part] ?? {};
  }
  if (Object.hasOwn(target, nextParts.at(-1)) && target[nextParts.at(-1)] !== undefined) {
    return { status: "conflict", changed: false };
  }

  const value = previousParent[previousLeaf];
  target = customData;
  for (const part of nextParts.slice(0, -1)) {
    if (!target[part]) target[part] = {};
    target = target[part];
  }
  target[nextParts.at(-1)] = value;
  delete previousParent[previousLeaf];
  return { status: "moved", changed: true };
}

/** Build the initial custom payload for an alias without mutating its owner. */
export function createActorAliasDefaultValue(alias, label = alias?.label ?? "") {
  const name = String(label ?? "");
  const display = String(alias?.exib ?? name);
  if (alias?.type === "attribute") {
    return { name, exib: display, exibicao: display, value: 0, checkbonus: 0, roll: "" };
  }
  if (alias?.type === "resource") {
    return { name, exib: display, exibicao: display, value: 0, max: 0 };
  }
  if (alias?.type === "number") return 0;
  if (alias?.type === "boolean") return false;
  return "";
}

/** Prepare a copied alias definition with a fresh identity and custom storage. */
export function createActorAliasCopyDefinition(source, key, id) {
  if (!source || typeof source !== "object" || !isSafeActorAliasKey(key) || !id) return null;
  return {
    ...source,
    id,
    key,
    label: `${String(source.label ?? "")} (cópia)`.slice(0, 48),
    source: "custom",
    targetPath: ""
  };
}

/**
 * Rewrite component bindings when an alias key changes, including singular
 * legacy roots accepted by older layouts.
 */
export function replaceActorAliasLayoutReferences(layouts, previousKey, nextKey) {
  const previous = isSafeActorAliasKey(previousKey);
  const next = isSafeActorAliasKey(nextKey);
  if (!previous || !next || previous === next) return 0;

  const legacyPrevious = previous.replace(/^attributes\./, "attribute.").replace(/^resources\./, "resource.");
  const legacyNext = next.replace(/^attributes\./, "attribute.").replace(/^resources\./, "resource.");
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

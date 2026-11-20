const MAX_SHARE_CODE_LENGTH = 262144;
const MAX_COMPONENTS = 50;

function sanitizeJsonValue(value, depth = 0) {
  if (depth > 12) throw new Error("A configuração possui uma estrutura muito profunda.");
  if (value === null || typeof value === "boolean") return value;
  if (typeof value === "number") {
    if (!Number.isFinite(value)) throw new Error("A configuração contém um número inválido.");
    return value;
  }
  if (typeof value === "string") {
    if (value.length > 20000) throw new Error("Um campo da configuração excede o limite permitido.");
    return value;
  }
  if (Array.isArray(value)) {
    if (value.length > 500) throw new Error("Uma lista da configuração excede o limite permitido.");
    return value.map(item => sanitizeJsonValue(item, depth + 1));
  }
  if (!value || typeof value !== "object") {
    throw new Error("A configuração contém um tipo de dado não suportado.");
  }
  const result = {};
  for (const [key, child] of Object.entries(value)) {
    if (["__proto__", "prototype", "constructor", "definition"].includes(key)) continue;
    if (key.length > 128) continue;
    result[key] = sanitizeJsonValue(child, depth + 1);
  }
  return result;
}

function normalizeShareComponent(component, allowedTypes) {
  if (!component || typeof component !== "object" || Array.isArray(component)) {
    throw new Error("Um dos componentes do grupo possui formato inválido.");
  }
  const type = String(component.type ?? "");
  if (!allowedTypes.has(type)) {
    throw new Error(`O tipo de componente "${type || "desconhecido"}" não está disponível nesta versão do NEXUS.`);
  }
  const result = sanitizeJsonValue(component);
  delete result.id;
  delete result.definition;
  result.type = type;
  for (const key of ["x", "y"]) {
    const value = Number(result[key] ?? 0);
    result[key] = Number.isFinite(value) ? Math.max(0, value) : 0;
  }
  for (const key of ["w", "h"]) {
    const value = Number(result[key] ?? 100);
    result[key] = Number.isFinite(value) ? Math.min(1000, Math.max(20, value)) : 100;
  }
  return result;
}

/**
 * Produces readable, versioned JSON that can be pasted into ChatGPT or imported
 * into another NEXUS installation. Rules and interactions remain data; no
 * executable code is included or evaluated.
 */
export function createNexusGroupShareCode(group) {
  if (!group || !Array.isArray(group.components) || group.components.length < 1 || group.components.length > MAX_COMPONENTS) {
    throw new Error(`O grupo precisa conter entre 1 e ${MAX_COMPONENTS} componentes.`);
  }
  const sourceIdMap = new Map();
  const components = group.components.map((component, index) => {
    const sourceId = String(component?.sourceId ?? component?.id ?? `component-${index + 1}`);
    if (!sourceId || sourceIdMap.has(sourceId)) throw new Error("O grupo contém identificadores de componentes ausentes ou duplicados.");
    if (component?.id) sourceIdMap.set(String(component.id), sourceId);
    sourceIdMap.set(sourceId, sourceId);
    const copy = sanitizeJsonValue(component);
    delete copy.id;
    delete copy.definition;
    copy.sourceId = sourceId;
    return copy;
  });

  let groups = (Array.isArray(group.groups) ? group.groups : []).map(item => {
    const copy = sanitizeJsonValue(item);
    copy.id = String(copy.id ?? "");
    copy.parentGroupId = String(copy.parentGroupId ?? "");
    if (!Array.isArray(copy.componentIds)) throw new Error("Um grupo possui uma lista de componentes inválida.");
    copy.componentIds = [...new Set(copy.componentIds.map(id => sourceIdMap.get(String(id)) ?? String(id)))];
    return copy;
  });
  if (groups.length > 50) throw new Error("O grupo excede o limite de 50 subgrupos.");
  if (!groups.length) {
    groups = [{
      ...(sanitizeJsonValue(group.groupSettings ?? {})),
      id: "root",
      name: String(group.name ?? "Grupo").trim().slice(0, 48) || "Grupo",
      parentGroupId: "",
      componentIds: components.map(component => component.sourceId)
    }];
  }

  const groupIds = new Set();
  for (const item of groups) {
    if (!item.id || groupIds.has(item.id)) throw new Error("A hierarquia contém grupos sem ID ou com IDs duplicados.");
    groupIds.add(item.id);
  }
  const ownerByComponent = new Map();
  for (const item of groups) {
    if (item.parentGroupId && !groupIds.has(item.parentGroupId)) throw new Error("Um grupo aponta para um grupo pai inexistente.");
    for (const componentId of item.componentIds) {
      if (!components.some(component => component.sourceId === componentId)) throw new Error("Um grupo referencia um componente inexistente.");
      if (ownerByComponent.has(componentId)) throw new Error("Um componente não pode pertencer diretamente a mais de um grupo.");
      ownerByComponent.set(componentId, item.id);
    }
  }
  const parentMap = new Map(groups.map(item => [item.id, item.parentGroupId]));
  for (const item of groups) {
    const seen = new Set([item.id]);
    let cursor = item.parentGroupId;
    while (cursor) {
      if (seen.has(cursor)) throw new Error("A hierarquia contém um ciclo.");
      seen.add(cursor);
      cursor = parentMap.get(cursor) ?? "";
    }
  }
  const roots = groups.filter(item => !item.parentGroupId);
  if (roots.length !== 1) throw new Error("A composição precisa possuir exatamente um grupo principal.");
  const payload = {
    format: "nexus-group",
    version: 2,
    name: String(group.name ?? roots[0].name ?? "Grupo").trim().slice(0, 48) || "Grupo",
    groupSettings: sanitizeJsonValue(group.groupSettings ?? {}),
    components,
    groups
  };
  return "NEXUS-GROUP/2\n" + JSON.stringify(payload, null, 2);
}

/**
 * Parses a group composition into a stable, self-contained tree.
 * Legacy v1 groups are wrapped in a root group and receive deterministic
 * sourceIds so their members can be reconnected when inserted into a Canvas.
 */
export function parseNexusGroupShareCode(code, componentTypes = []) {
  let source = String(code ?? "").trim();
  if (!source || source.length > MAX_SHARE_CODE_LENGTH) {
    throw new Error("O código está vazio ou excede o limite de tamanho permitido.");
  }
  source = source.replace(/^\x60{3}(?:json)?\s*/i, "").replace(/\s*\x60{3}$/, "");
  let formatVersion = source.startsWith("NEXUS-GROUP/2") ? 2 : source.startsWith("NEXUS-GROUP/1") ? 1 : null;
  if (formatVersion === 2) source = source.slice("NEXUS-GROUP/2".length).trim();
  else if (formatVersion === 1) source = source.slice("NEXUS-GROUP/1".length).trim();
  const start = source.indexOf("{");
  const end = source.lastIndexOf("}");
  if (start < 0 || end < start) throw new Error("Não encontrei um objeto JSON válido no código informado.");
  let payload;
  try { payload = JSON.parse(source.slice(start, end + 1)); }
  catch (_) { throw new Error("O código não contém um JSON válido. Copie novamente o código completo."); }
  if (!payload || payload.format !== "nexus-group") throw new Error("Este código não é uma composição de grupo do NEXUS.");
  formatVersion ??= Number(payload.version);
  if (![1, 2].includes(payload.version) || payload.version !== formatVersion) {
    throw new Error(`A versão de compartilhamento ${String(payload.version)} não é compatível.`);
  }
  if (!Array.isArray(payload.components) || payload.components.length < 1 || payload.components.length > MAX_COMPONENTS) {
    throw new Error(`O grupo precisa conter entre 1 e ${MAX_COMPONENTS} componentes.`);
  }
  if (payload.groupSettings !== undefined && (!payload.groupSettings || typeof payload.groupSettings !== "object" || Array.isArray(payload.groupSettings))) {
    throw new Error("As configurações do grupo possuem formato inválido.");
  }
  const allowedTypes = new Set(componentTypes.map(type => String(type)));
  if (!allowedTypes.size) throw new Error("Não foi possível validar os tipos de componentes disponíveis.");
  const sourceIds = new Set();
  const components = payload.components.map((component, index) => {
    const normalized = normalizeShareComponent(component, allowedTypes);
    const sourceId = String(component.sourceId ?? component.id ?? `component-${index + 1}`);
    if (!sourceId || sourceIds.has(sourceId)) throw new Error("A composição contém IDs de origem ausentes ou duplicados.");
    sourceIds.add(sourceId);
    normalized.sourceId = sourceId;
    return normalized;
  });

  let groups = [];
  if (formatVersion === 2) {
    if (!Array.isArray(payload.groups) || payload.groups.length > 50) throw new Error("A hierarquia de grupos é inválida ou excede o limite.");
    const ids = new Set();
    groups = payload.groups.map(group => {
      if (!group || typeof group !== "object" || !group.id || ids.has(String(group.id))) {
        throw new Error("A composição contém um subgrupo inválido.");
      }
      ids.add(String(group.id));
      return {
        ...sanitizeJsonValue(group),
        id: String(group.id),
        parentGroupId: String(group.parentGroupId ?? ""),
        componentIds: [...new Set((Array.isArray(group.componentIds) ? group.componentIds : []).map(String))]
      };
    });
    for (const group of groups) {
      if (group.parentGroupId && !ids.has(group.parentGroupId)) throw new Error("Um subgrupo referencia um grupo pai inexistente.");
      for (const componentId of group.componentIds) {
        if (!sourceIds.has(componentId)) throw new Error("Um subgrupo referencia um componente inexistente.");
      }
    }
  }

  if (!groups.length) {
    groups = [{
      ...(sanitizeJsonValue(payload.groupSettings ?? {})),
      id: "root",
      name: String(payload.name ?? "Grupo importado").trim().slice(0, 48) || "Grupo importado",
      parentGroupId: "",
      componentIds: components.map(component => component.sourceId)
    }];
  }

  const groupIds = new Set(groups.map(group => group.id));
  const parentMap = new Map(groups.map(group => [group.id, group.parentGroupId]));
  const roots = groups.filter(group => !group.parentGroupId);
  if (roots.length !== 1) throw new Error("A composição precisa possuir exatamente um grupo principal.");
  const componentOwners = new Set();
  for (const group of groups) {
    for (const componentId of group.componentIds) {
      if (componentOwners.has(componentId)) throw new Error("Um componente não pode pertencer diretamente a mais de um grupo.");
      componentOwners.add(componentId);
    }
    const seen = new Set([group.id]);
    let cursor = group.parentGroupId;
    while (cursor) {
      if (!groupIds.has(cursor)) throw new Error("Um grupo aponta para um grupo pai inexistente.");
      if (seen.has(cursor)) throw new Error("A hierarquia contém um ciclo.");
      seen.add(cursor);
      cursor = parentMap.get(cursor) ?? "";
    }
  }
  const root = roots[0];
  for (const component of components) {
    if (!componentOwners.has(component.sourceId)) root.componentIds.push(component.sourceId);
  }
  return {
    name: String(payload.name ?? "Grupo importado").trim().slice(0, 48) || "Grupo importado",
    groupSettings: sanitizeJsonValue(payload.groupSettings ?? {}),
    components,
    groups
  };
}

const MAX_LAYOUT_COMPONENTS = 250;
const MAX_LAYOUT_GROUPS = 100;

/** Full-layout export keeps appearance, dimensions, groups, links and component behavior as inert JSON. */
export function createNexusLayoutShareCode(layout) {
  if (!layout || typeof layout !== "object" || !Array.isArray(layout.components)) {
    throw new Error("O layout informado não possui uma estrutura válida.");
  }
  if (layout.components.length > MAX_LAYOUT_COMPONENTS || (layout.groups?.length ?? 0) > MAX_LAYOUT_GROUPS) {
    throw new Error("O layout excede os limites de componentes ou grupos para compartilhamento.");
  }
  const snapshot = sanitizeJsonValue(layout);
  delete snapshot.id;
  delete snapshot.definition;
  snapshot.components = snapshot.components.map(component => {
    const item = { ...component };
    delete item.definition;
    return item;
  });
  const payload = { format: "nexus-layout", version: 1, name: String(layout.name ?? "Layout").trim().slice(0, 48) || "Layout", layout: snapshot };
  const code = "NEXUS-LAYOUT/1\n" + JSON.stringify(payload, null, 2);
  if (code.length > MAX_SHARE_CODE_LENGTH) throw new Error("O layout excede o tamanho máximo permitido para compartilhamento.");
  return code;
}

export function parseNexusLayoutShareCode(code, componentTypes = []) {
  let source = String(code ?? "").trim();
  if (!source || source.length > MAX_SHARE_CODE_LENGTH) throw new Error("O código está vazio ou excede o limite permitido.");
  source = source.replace(/^\x60{3}(?:json)?\s*/i, "").replace(/\s*\x60{3}$/, "");
  if (source.startsWith("NEXUS-LAYOUT/1")) source = source.slice("NEXUS-LAYOUT/1".length).trim();
  const start = source.indexOf("{"), end = source.lastIndexOf("}");
  if (start < 0 || end < start) throw new Error("Não encontrei um JSON válido para o layout.");
  let payload;
  try { payload = JSON.parse(source.slice(start, end + 1)); }
  catch (_) { throw new Error("O código do layout não contém um JSON válido."); }
  if (payload?.format !== "nexus-layout" || payload.version !== 1) throw new Error("Formato ou versão de layout não reconhecido.");
  const allowed = new Set(componentTypes.map(String));
  const layout = sanitizeJsonValue(payload.layout);
  if (!layout || !Array.isArray(layout.components) || layout.components.length > MAX_LAYOUT_COMPONENTS) throw new Error("A lista de componentes do layout é inválida ou excede o limite.");
  if (!Array.isArray(layout.groups)) layout.groups = [];
  if (layout.groups.length > MAX_LAYOUT_GROUPS) throw new Error("O layout excede o limite de grupos.");
  layout.components = layout.components.map(component => {
    const normalized = normalizeShareComponent(component, allowed);
    return { ...normalized, id: String(component.id ?? "") };
  });
  const componentIdList = layout.components.map(component => String(component.id ?? ""));
  const ids = new Set(componentIdList.filter(Boolean));
  if (ids.size !== layout.components.length) throw new Error("O layout contém componentes sem ID ou com IDs duplicados.");
  const groupIds = new Set();
  layout.groups = layout.groups.map(group => {
    if (!group || typeof group !== "object" || !group.id || groupIds.has(String(group.id))) throw new Error("O layout contém um grupo inválido ou com ID duplicado.");
    groupIds.add(String(group.id));
    const componentIds = [...new Set((group.componentIds ?? []).map(String))];
    if (componentIds.some(id => !ids.has(id))) throw new Error("Um grupo referencia um componente inexistente.");
    return { ...sanitizeJsonValue(group), id: String(group.id), componentIds, parentGroupId: String(group.parentGroupId ?? "") };
  });
  for (const group of layout.groups) {
    if (group.parentGroupId && !groupIds.has(group.parentGroupId)) throw new Error("Um grupo aponta para um grupo pai inexistente.");
    if (group.componentIds.some(id => !ids.has(id))) throw new Error("Um grupo referencia um componente inexistente.");
  }
  const parentMap = new Map(layout.groups.map(group => [group.id, group.parentGroupId]));
  for (const group of layout.groups) {
    const seen = new Set([group.id]);
    let cursor = group.parentGroupId;
    while (cursor) {
      if (seen.has(cursor)) throw new Error("A hierarquia do layout contém um ciclo de grupos.");
      seen.add(cursor); cursor = parentMap.get(cursor) ?? "";
    }
  }
  layout.links = Array.isArray(layout.links) ? layout.links : [];
  return { name: String(payload.name ?? layout.name ?? "Layout").trim().slice(0, 48) || "Layout", layout };
}


const SHARE_PACKAGE_KINDS = new Set(["component", "group", "layout"]);

/**
 * Unified, versioned exchange envelope for reusable NEXUS library entries.
 * The payload is always inert JSON; importing never evaluates supplied code.
 */
export function createNexusSharePackage(kind, entry, componentTypes = []) {
  const type = String(kind ?? "");
  if (!SHARE_PACKAGE_KINDS.has(type)) throw new Error("Tipo de pacote NEXUS não reconhecido.");
  const allowed = new Set(componentTypes.map(String));
  let payload;
  let name = String(entry?.name ?? entry?.label ?? type).trim().slice(0, 48) || type;

  if (type === "component") {
    const componentType = String(entry?.type ?? "");
    if (!allowed.has(componentType)) throw new Error("O tipo deste componente não está disponível nesta versão do NEXUS.");
    const settings = sanitizeJsonValue(entry?.settings ?? {});
    if (!settings || typeof settings !== "object" || Array.isArray(settings)) throw new Error("As configurações do componente são inválidas.");
    const normalized = normalizeShareComponent({ ...settings, type: componentType }, allowed);
    delete normalized.type;
    delete normalized.x;
    delete normalized.y;
    payload = { type: componentType, label: name, settings: normalized };
  } else if (type === "group") {
    const group = {
      name,
      groupSettings: sanitizeJsonValue(entry?.groupSettings ?? {}),
      components: Array.isArray(entry?.components) ? entry.components : [],
      groups: Array.isArray(entry?.groups) ? entry.groups : []
    };
    const normalized = parseNexusGroupShareCode(createNexusGroupShareCode(group), componentTypes);
    payload = normalized;
    name = normalized.name;
  } else {
    const layout = entry?.layout ?? entry;
    const normalized = parseNexusLayoutShareCode(createNexusLayoutShareCode({ ...sanitizeJsonValue(layout), name }), componentTypes);
    payload = normalized.layout;
    name = normalized.name;
  }

  const code = "NEXUS-PACK/1\\n" + JSON.stringify({
    format: "nexus-package",
    version: 1,
    kind: type,
    name,
    payload
  }, null, 2);
  if (code.length > MAX_SHARE_CODE_LENGTH) throw new Error("O pacote excede o tamanho máximo permitido para compartilhamento.");
  return code;
}

export function parseNexusSharePackage(code, componentTypes = []) {
  let source = String(code ?? "").trim();
  if (!source || source.length > MAX_SHARE_CODE_LENGTH) throw new Error("O arquivo está vazio ou excede o tamanho máximo permitido.");
  source = source.replace(/^\\x60{3}(?:json)?\\s*/i, "").replace(/\\s*\\x60{3}$/, "");
  if (source.startsWith("NEXUS-PACK/1")) source = source.slice("NEXUS-PACK/1".length).trim();
  const start = source.indexOf("{"), end = source.lastIndexOf("}");
  if (start < 0 || end < start) throw new Error("Não encontrei um pacote JSON válido.");
  let raw;
  try { raw = JSON.parse(source.slice(start, end + 1)); }
  catch (_) { throw new Error("O pacote não contém um JSON válido."); }
  if (raw?.format !== "nexus-package" || raw.version !== 1 || !SHARE_PACKAGE_KINDS.has(raw.kind)) {
    throw new Error("Formato ou versão de pacote NEXUS não reconhecido.");
  }
  const name = String(raw.name ?? raw.kind).trim().slice(0, 48) || raw.kind;
  const allowed = new Set(componentTypes.map(String));
  let payload;
  if (raw.kind === "component") {
    const type = String(raw.payload?.type ?? "");
    if (!allowed.has(type)) throw new Error("Este pacote utiliza um tipo de componente que não está disponível nesta versão do NEXUS.");
    const settings = sanitizeJsonValue(raw.payload?.settings ?? {});
    if (!settings || typeof settings !== "object" || Array.isArray(settings)) throw new Error("As configurações do componente são inválidas.");
    const normalized = normalizeShareComponent({ ...settings, type }, allowed);
    delete normalized.type;
    delete normalized.x;
    delete normalized.y;
    payload = { type, label: name, settings: normalized };
  } else if (raw.kind === "group") {
    payload = parseNexusGroupShareCode(createNexusGroupShareCode(raw.payload), componentTypes);
  } else {
    payload = parseNexusLayoutShareCode(createNexusLayoutShareCode({ ...sanitizeJsonValue(raw.payload), name }), componentTypes).layout;
  }
  return { kind: raw.kind, name, payload };
}


const MAX_LIBRARY_BACKUP_LENGTH = 1048576;

/**
 * Creates a portable snapshot of the complete Library surface available in
 * this system version. Built-in assets and themes are included as catalog
 * snapshots; personal entries and flows remain independently editable data.
 */
export function createNexusLibraryBackup(snapshot = {}, componentTypes = []) {
  const allowed = new Set(componentTypes.map(String));
  if (!allowed.size) throw new Error("Não foi possível validar os componentes desta versão do NEXUS.");
  const collections = {
    components: (Array.isArray(snapshot.components) ? snapshot.components : []).map(entry => {
      const parsed = parseNexusSharePackage(createNexusSharePackage("component", entry, componentTypes), componentTypes);
      return { sourceId: String(entry.sourceId ?? entry.id ?? ""), version: 1, label: parsed.payload.label, type: parsed.payload.type, settings: parsed.payload.settings };
    }),
    groups: (Array.isArray(snapshot.groups) ? snapshot.groups : []).map(entry => {
      const parsed = parseNexusSharePackage(createNexusSharePackage("group", entry, componentTypes), componentTypes);
      return { sourceId: String(entry.sourceId ?? entry.id ?? ""), name: parsed.name, groupSettings: parsed.payload.groupSettings, components: parsed.payload.components, groups: parsed.payload.groups };
    }),
    layouts: (Array.isArray(snapshot.layouts) ? snapshot.layouts : []).map(entry => {
      const parsed = parseNexusSharePackage(createNexusSharePackage("layout", entry, componentTypes), componentTypes);
      return { sourceId: String(entry.sourceId ?? entry.id ?? ""), name: parsed.name, layout: parsed.payload };
    }),
    assets: sanitizeJsonValue(Array.isArray(snapshot.assets) ? snapshot.assets : []),
    themes: sanitizeJsonValue(snapshot.themes && typeof snapshot.themes === "object" && !Array.isArray(snapshot.themes) ? snapshot.themes : {}),
    flows: sanitizeJsonValue(Array.isArray(snapshot.flows) ? snapshot.flows : [])
  };
  if (collections.components.length > 200 || collections.groups.length > 100 || collections.layouts.length > 100 ||
      collections.assets.length > 200 || Object.keys(collections.themes).length > 100 || collections.flows.length > 200) {
    throw new Error("A Biblioteca excede o limite de itens permitido para backup.");
  }
  for (const asset of collections.assets) {
    if (!asset || typeof asset !== "object" || !allowed.has(String(asset.type ?? "")) ||
        typeof asset.label !== "string" || !asset.template || typeof asset.template !== "object" || Array.isArray(asset.template)) {
      throw new Error("O catálogo de assets contém uma definição incompatível.");
    }
  }
  for (const [id, theme] of Object.entries(collections.themes)) {
    if (!/^[a-zA-Z0-9_-]{1,64}$/.test(id) || !theme || typeof theme !== "object" || Array.isArray(theme)) {
      throw new Error("O catálogo de temas contém uma definição inválida.");
    }
    for (const [key, value] of Object.entries(theme)) {
      if (typeof value !== "string" || !/^#[0-9a-f]{3,8}$/i.test(value)) {
        throw new Error("Um tema contém uma cor inválida.");
      }
    }
  }
  const code = "NEXUS-LIBRARY/1\\n" + JSON.stringify({
    format: "nexus-library",
    version: 1,
    name: String(snapshot.name ?? "Biblioteca NEXUS").trim().slice(0, 64) || "Biblioteca NEXUS",
    collections
  }, null, 2);
  if (code.length > MAX_LIBRARY_BACKUP_LENGTH) throw new Error("O backup da Biblioteca excede 1 MB.");
  return code;
}

/** Validates a full-library backup without evaluating imported code. */
export function parseNexusLibraryBackup(code, componentTypes = []) {
  let source = String(code ?? "").trim();
  if (!source || source.length > MAX_LIBRARY_BACKUP_LENGTH) throw new Error("O arquivo está vazio ou excede o limite de 1 MB.");
  source = source.replace(/^\\x60{3}(?:json)?\\s*/i, "").replace(/\\s*\\x60{3}$/, "");
  if (source.startsWith("NEXUS-LIBRARY/1")) source = source.slice("NEXUS-LIBRARY/1".length).trim();
  const start = source.indexOf("{"), end = source.lastIndexOf("}");
  if (start < 0 || end < start) throw new Error("Não encontrei um backup JSON válido da Biblioteca.");
  let raw;
  try { raw = JSON.parse(source.slice(start, end + 1)); }
  catch (_) { throw new Error("O backup da Biblioteca não contém JSON válido."); }
  if (raw?.format !== "nexus-library" || raw.version !== 1) throw new Error("Formato ou versão de backup da Biblioteca não reconhecido.");
  const data = raw.collections;
  if (!data || typeof data !== "object" || Array.isArray(data)) throw new Error("As coleções do backup estão ausentes ou inválidas.");
  const allowed = new Set(componentTypes.map(String));
  const normalized = createNexusLibraryBackup({
    name: raw.name,
    components: Array.isArray(data.components) ? data.components : [],
    groups: Array.isArray(data.groups) ? data.groups : [],
    layouts: Array.isArray(data.layouts) ? data.layouts : [],
    assets: Array.isArray(data.assets) ? data.assets : [],
    themes: data.themes && typeof data.themes === "object" ? data.themes : {},
    flows: Array.isArray(data.flows) ? data.flows : []
  }, [...allowed]);
  const parsed = JSON.parse(normalized.slice(normalized.indexOf("{")));
  return { name: String(parsed.name ?? "Biblioteca NEXUS"), collections: parsed.collections };
}

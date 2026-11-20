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
  if (!group || !Array.isArray(group.components) || group.components.length < 1 || group.components.length > MAX_COMPONENTS) throw new Error(`O grupo precisa conter entre 1 e ${MAX_COMPONENTS} componentes.`);
  const components = group.components.map(component => {
    const copy = { ...component }; delete copy.id; delete copy.definition;
    return sanitizeJsonValue(copy);
  });
  const groups = (group.groups ?? []).map(item => sanitizeJsonValue(item));
  if (groups.length > 50) throw new Error("O grupo excede o limite de 50 subgrupos.");
  const payload = { format:"nexus-group", version:2, name:String(group.name ?? "Grupo").trim().slice(0,48)||"Grupo", groupSettings:sanitizeJsonValue(group.groupSettings ?? {}), components, groups };
  return "NEXUS-GROUP/2\n" + JSON.stringify(payload,null,2);
}

/**
 * Parses and validates a NEXUS group code. Only registered component types
 * are accepted; presentation rules and interaction flows remain intact.
 */
export function parseNexusGroupShareCode(code, componentTypes = []) {
  let source = String(code ?? "").trim();
  if (!source || source.length > MAX_SHARE_CODE_LENGTH) {
    throw new Error("O código está vazio ou excede o limite de tamanho permitido.");
  }
  source = source.replace(/^\x60{3}(?:json)?\s*/i, "").replace(/\s*\x60{3}$/, "");
  const formatVersion = source.startsWith("NEXUS-GROUP/2") ? 2 : 1;
  if (formatVersion === 2) source = source.slice("NEXUS-GROUP/2".length).trim();
  else if (source.startsWith("NEXUS-GROUP/1")) source = source.slice("NEXUS-GROUP/1".length).trim();
  const start = source.indexOf("{");
  const end = source.lastIndexOf("}");
  if (start < 0 || end < start) throw new Error("Não encontrei um objeto JSON válido no código informado.");
  let payload;
  try {
    payload = JSON.parse(source.slice(start, end + 1));
  } catch (_) {
    throw new Error("O código não contém um JSON válido. Copie novamente o código completo.");
  }
  if (!payload || payload.format !== "nexus-group") {
    throw new Error("Este código não é uma composição de grupo do NEXUS.");
  }
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
  const components = payload.components.map(component => normalizeShareComponent(component, allowedTypes));
  const groups = [];
  if (formatVersion >= 2) {
    if (!Array.isArray(payload.groups) || payload.groups.length > 50) throw new Error("A hierarquia de grupos é inválida ou excede o limite.");
    const ids = new Set();
    for (const group of payload.groups) {
      if (!group || typeof group !== "object" || !group.id || ids.has(String(group.id))) throw new Error("A composição contém um subgrupo inválido.");
      ids.add(String(group.id));
    }
    const componentIds = new Set(components.map(component => String(component.sourceId ?? "")).filter(Boolean));
    for (const group of payload.groups) {
      const parentGroupId = String(group.parentGroupId ?? "");
      if (parentGroupId && !ids.has(parentGroupId)) throw new Error("Um subgrupo referencia um grupo pai inexistente.");
      if ((group.componentIds ?? []).some(id => !componentIds.has(String(id)))) throw new Error("Um subgrupo referencia um componente inexistente.");
      groups.push({ ...sanitizeJsonValue(group), id:String(group.id), parentGroupId, componentIds:[...(group.componentIds ?? [])].map(String) });
    }
    const parentMap = new Map(groups.map(group => [group.id, group.parentGroupId]));
    for (const group of groups) {
      const seen = new Set([group.id]); let cursor = group.parentGroupId;
      while (cursor) { if (seen.has(cursor)) throw new Error("A hierarquia contém um ciclo."); seen.add(cursor); cursor = parentMap.get(cursor) ?? ""; }
    }
  }
  return { name:String(payload.name ?? "Grupo importado").trim().slice(0,48)||"Grupo importado", groupSettings:sanitizeJsonValue(payload.groupSettings ?? {}), components, groups };
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

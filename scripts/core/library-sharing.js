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
  if (!group || !Array.isArray(group.components) || group.components.length < 2) {
    throw new Error("O código de compartilhamento exige um grupo com pelo menos dois componentes.");
  }
  if (group.components.length > MAX_COMPONENTS) {
    throw new Error(`O grupo excede o limite de ${MAX_COMPONENTS} componentes.`);
  }
  const components = group.components.map(component => {
    const copy = { ...component };
    delete copy.id;
    delete copy.definition;
    return sanitizeJsonValue(copy);
  });
  const payload = {
    format: "nexus-group",
    version: 1,
    name: String(group.name ?? "Grupo").trim().slice(0, 48) || "Grupo",
    groupSettings: sanitizeJsonValue(group.groupSettings ?? {}),
    components
  };
  return "NEXUS-GROUP/1\n" + JSON.stringify(payload, null, 2);
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
  if (source.startsWith("NEXUS-GROUP/1")) source = source.slice("NEXUS-GROUP/1".length).trim();
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
  if (payload.version !== 1) {
    throw new Error(`A versão de compartilhamento ${String(payload.version)} não é compatível.`);
  }
  if (!Array.isArray(payload.components) || payload.components.length < 2 || payload.components.length > MAX_COMPONENTS) {
    throw new Error(`O grupo precisa conter entre 2 e ${MAX_COMPONENTS} componentes.`);
  }
  if (payload.groupSettings !== undefined && (!payload.groupSettings || typeof payload.groupSettings !== "object" || Array.isArray(payload.groupSettings))) {
    throw new Error("As configurações do grupo possuem formato inválido.");
  }
  const allowedTypes = new Set(componentTypes.map(type => String(type)));
  if (!allowedTypes.size) throw new Error("Não foi possível validar os tipos de componentes disponíveis.");
  const components = payload.components.map(component => normalizeShareComponent(component, allowedTypes));
  return {
    name: String(payload.name ?? "Grupo importado").trim().slice(0, 48) || "Grupo importado",
    groupSettings: sanitizeJsonValue(payload.groupSettings ?? {}),
    components
  };
}

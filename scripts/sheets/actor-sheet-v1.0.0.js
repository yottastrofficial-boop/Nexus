import { NEXUS_LIBRARY_CATALOG } from "../../assets/library/catalog.js";
import { DEFAULT_LAYOUT, THEME_TOKENS, THEME_PALETTES, applyThemeTokens } from "../core/theme.js";
import { NexusPanelWindow } from "./panel-window.js";
import { buildPropertyPickerCatalog } from "../core/property-catalog.js";
import { renderPropertyPicker } from "./property-picker-view.js";
import { activateActorSheetListeners } from "./actor-sheet-listeners.js";
import { activateCanvasInteractions } from "./canvas-interactions.js";
import { mountLibraryView } from "./library-view.js";
import { renderActorSheetRichMedia, renderActorSheetAdaptiveContent } from "./actor-sheet-rendering.js";
import { migrateLegacyActorData } from "../core/migration-manager.js";
import { mergeLayoutSnapshots } from "../core/layout-merge.js";
import { NEXUS_SKILLS, NEXUS_ATTRIBUTES, normalizeNexusProficientLevel, getNexusBaseModifier, getNexusSkillRows, getNexusSkillModifier } from "../core/skills.js";
import { executeTriggeredActions, getTriggeredActions, renderInteractionEditor, applyInteractionEditorChange, applyInteractionEditorCommand, getInteractionLibrary, saveInteractionToLibrary, getComponentInteractions } from "../core/interactions.js";

const layoutReadSnapshots = new WeakMap();
const layoutWriteQueues = new Map();

const ActorSheetV2 = foundry.applications.sheets.ActorSheetV2;
const HandlebarsApplicationMixin = foundry.applications.api.HandlebarsApplicationMixin;
const NexusActorSheetBase = HandlebarsApplicationMixin(ActorSheetV2);

const COMPONENTS = {
  token: { label: "Token", namespace: "core.identity.token", w: 100, h: 100, path: "identity.token.img", kind: "token" },
  pv: { label: "PV · Clássico", namespace: "core.resources.health", w: 190, h: 112, path: "resources.pv", kind: "resource" },
  "resource-meter": { label: "Medidor", namespace: "nexus.asset.meter", w: 100, h: 100, path: "", kind: "resource-meter" },
  "text-field": { label: "Campo de texto", namespace: "nexus.asset.text-field", w: 100, h: 100, path: "", kind: "text-field" },
  "table": { label: "Tabela", namespace: "nexus.asset.table", w: 100, h: 100, path: "", kind: "table" },
  "asset-text": { label: "Texto", namespace: "nexus.asset.text", w: 180, h: 64, path: "", kind: "asset-text" },
  "asset-value": { label: "Valor", namespace: "nexus.asset.value", w: 120, h: 76, path: "", kind: "asset-value" },
  "asset-field": { label: "Campo", namespace: "nexus.asset.field", w: 180, h: 76, path: "", kind: "asset-field" },
  "asset-meter": { label: "Indicador", namespace: "nexus.asset.meter.generic", w: 220, h: 82, path: "", kind: "asset-meter" },
  "asset-table": { label: "Tabela", namespace: "nexus.asset.table.generic", w: 260, h: 180, path: "", kind: "asset-table" },
  "asset-notes": { label: "Anotações", namespace: "nexus.asset.notes", w: 240, h: 160, path: "", kind: "asset-notes" },
  "asset-image": { label: "Imagem", namespace: "nexus.asset.image", w: 120, h: 120, path: "", kind: "asset-image" },
  "asset-link": { label: "Link", namespace: "nexus.asset.link", w: 180, h: 48, path: "", kind: "asset-link" },
  "sheet-name": { label: "Nome do personagem", namespace: "nexus.sheet.identity.name", w: 300, h: 66, path: "name", kind: "sheet-element", variant: "name" },
  "sheet-level": { label: "Nível", namespace: "nexus.sheet.progression.level", w: 100, h: 66, path: "identity.level", kind: "sheet-element", variant: "level" },
  "sheet-lineage": { label: "Linhagem", namespace: "nexus.sheet.identity.lineage", w: 180, h: 66, path: "identity.lineage", kind: "sheet-element", variant: "lineage" },
  "sheet-physiognomy": { label: "Fisionomia", namespace: "nexus.sheet.identity.physiognomy", w: 180, h: 66, path: "", kind: "sheet-element", variant: "physiognomy" },
  "sheet-legacy": { label: "Legado", namespace: "nexus.sheet.identity.legacy", w: 180, h: 66, path: "identity.legacy", kind: "sheet-element", variant: "legacy" },
  "sheet-resource": { label: "Indicador – Barra", namespace: "nexus.sheet.resource.bar", w: 220, h: 58, path: "", kind: "sheet-element", variant: "resource" },
  "sheet-derived": { label: "Indicador compacto", namespace: "nexus.sheet.derived", w: 110, h: 54, path: "", kind: "sheet-element", variant: "derived" },
  "sheet-attribute": { label: "Card de atributo", namespace: "nexus.sheet.attribute", w: 96, h: 88, path: "", kind: "sheet-element", variant: "attribute" },
  "sheet-skill": { label: "Linha de perícia", namespace: "nexus.sheet.skill.row", w: 250, h: 42, path: "", kind: "sheet-element", variant: "skill" },
  "sheet-skill-group": { label: "Grupo de perícias", namespace: "nexus.sheet.skill.group", w: 260, h: 180, path: "", kind: "sheet-element", variant: "skill-group" },
  "sheet-action-attack": { label: "Espaço de ataque", namespace: "nexus.sheet.action.attack", w: 220, h: 112, path: "", kind: "sheet-element", variant: "action-attack" },
  "sheet-action-general": { label: "Espaço de ação", namespace: "nexus.sheet.action.general", w: 220, h: 112, path: "", kind: "sheet-element", variant: "action-general" },
  "sheet-action-reaction": { label: "Espaço de reação", namespace: "nexus.sheet.action.reaction", w: 220, h: 112, path: "", kind: "sheet-element", variant: "action-reaction" },
  "sheet-section": { label: "Cabeçalho de seção", namespace: "nexus.sheet.section.heading", w: 280, h: 38, path: "", kind: "sheet-element", variant: "section" },
  "pv-bar": { label: "PV · Barra", namespace: "core.resources.health", w: 250, h: 82, path: "resources.pv", kind: "resource-bar" },
  "pv-ring": { label: "PV · Circular", namespace: "core.resources.health", w: 130, h: 130, path: "resources.pv", kind: "resource-ring" },
  pm: { label: "PM · Clássico", namespace: "core.resources.mana", w: 150, h: 100, path: "resources.pm", kind: "resource" },
  "pm-bar": { label: "PM · Barra", namespace: "core.resources.mana", w: 250, h: 82, path: "resources.pm", kind: "resource-bar" },
  pe: { label: "PE · Clássico", namespace: "core.resources.energy", w: 150, h: 100, path: "resources.pe", kind: "resource" },
  "pe-bar": { label: "PE · Barra", namespace: "core.resources.energy", w: 250, h: 82, path: "resources.pe", kind: "resource-bar" },
  defense: { label: "Defesa", namespace: "core.combat.defense", w: 150, h: 90, path: "combat.defense", kind: "number" },
  movement: { label: "Movimento", namespace: "core.combat.movement", w: 150, h: 90, path: "combat.movement", kind: "number" },
  desl: { label: "DESL", namespace: "core.combat.desl", w: 120, h: 85, path: "combat.desl", kind: "number" },
  ddr: { label: "DdR", namespace: "core.combat.ddr", w: 120, h: 85, path: "combat.ddr", kind: "number" },
  mb: { label: "MB", namespace: "core.combat.mb", w: 120, h: 85, path: "combat.mb", kind: "number" },
  // Deprecated scalar nucleus components remain registered only for old saved layouts.
  body: { label: "Corpo (legado)", namespace: "core.attributes.body", w: 130, h: 90, path: "attributes.body", kind: "number", deprecated: true },
  mind: { label: "Mente (legado)", namespace: "core.attributes.mind", w: 130, h: 90, path: "attributes.mind", kind: "number", deprecated: true },
  soul: { label: "Alma (legado)", namespace: "core.attributes.soul", w: 130, h: 90, path: "attributes.soul", kind: "number", deprecated: true },
  name: { label: "Nome", namespace: "core.identity.name", w: 210, h: 75, path: "name", kind: "name" },
  level: { label: "Nível", namespace: "core.progression.level", w: 110, h: 75, path: "identity.level", kind: "number" },
  lineage: { label: "Linhagem", namespace: "core.identity.lineage", w: 170, h: 75, path: "identity.lineage", kind: "text" },
  legacy: { label: "Legado", namespace: "core.identity.legacy", w: 170, h: 75, path: "identity.legacy", kind: "text" },
  notes: { label: "Anotações", namespace: "core.notes", w: 260, h: 150, path: "notes", kind: "text" },
  "custom-card": { label: "Card personalizado", namespace: "nexus.custom.card", w: 220, h: 120, kind: "custom" }
};

const resolveNexusBinding = (actor, expression, depth = 0) => {
  const raw = String(expression ?? "").trim();
  const match = raw.match(/^\{\{\s*([a-zA-Z0-9_.-]+)\s*\}\}$/);
  const source = match ? match[1] : raw;
  if (!source || source.split(".").some(part => ["__proto__", "prototype", "constructor"].includes(part))) return { value: "", path: "" };
  const aliases = { attribute: "attributes", resource: "resources", identity: "identity", combat: "combat", skill: "skills" };
  const parts = source.split(".");
  if (parts[0] === "actor") parts.shift();
  if (parts[0] === "system") parts.shift();
  else if (aliases[parts[0]]) parts[0] = aliases[parts[0]];
  const path = parts.join(".");
  const shortDisplayPath = path.endsWith(".exib") ? `${path.slice(0, -5)}.exibicao` : "";
  const virtualPaths = {
    "identity.portrait.img": { value: actor?.img ?? "", sourcePath: "img" },
    "identity.token.img": { value: getFoundryDefaultTokenImage(actor), sourcePath: "prototypeToken.texture.src" },
    "token.img": { value: getFoundryDefaultTokenImage(actor), sourcePath: "prototypeToken.texture.src" },
    "identity.token.border": { value: actor?.prototypeToken?.ring?.colors?.ring ?? "", sourcePath: "prototypeToken.ring.colors.ring" },
    "token.border": { value: actor?.prototypeToken?.ring?.colors?.ring ?? "", sourcePath: "prototypeToken.ring.colors.ring" }
  };
  if (virtualPaths[path]) return { value: virtualPaths[path].value, path, sourcePath: virtualPaths[path].sourcePath, virtual: true };
  if (shortDisplayPath && getPath(actor?.system ?? {}, path) === undefined && getPath(actor?.system ?? {}, shortDisplayPath) !== undefined) return { value: getPath(actor.system, shortDisplayPath), path, sourcePath: shortDisplayPath };
  if (path === "name") return { value: actor?.name ?? "", path: "name" };
  if (path === "img") return { value: actor?.img ?? "", path: "img" };
  if (["uuid", "id", "_id"].includes(path)) return { value: actor?.[path] ?? "", path, readOnly: true };
  const skillMatch = path.match(/^skills\.([^.]+)(?:\.(.+))?$/);
  if (skillMatch) {
    const definition = NEXUS_SKILLS.find(skill => skill.key === skillMatch[1] || skill.legacyKey === skillMatch[1]);
    const row = definition ? getNexusSkillRows(actor).find(skill => skill.key === definition.key) : null;
    const member = skillMatch[2];
    if (row && (!member || Object.hasOwn(row, member))) {
      const value = member ? row[member] : row;
      return { value, path, virtual: true, skill: definition };
    }
  }
  const alias = resolveAliasPath(actor, path);
  let value = alias.alias
    ? (alias.path ? (virtualPaths[alias.path]?.value ?? (alias.path === "name" ? actor?.name : alias.path === "img" ? actor?.img : getPath(actor?.system ?? {}, alias.path))) : (alias.alias?.[alias.suffix] !== undefined ? alias.alias[alias.suffix] : getPath(getCustomAliasData(actor), [alias.alias.key, alias.suffix === "exib" ? "exibicao" : alias.suffix].filter(Boolean).join("."))))
    : getPath(actor?.system ?? {}, path);
  if (alias.alias?.type === "resource" && alias.suffix === "percentage") {
    const resource = alias.path ? getPath(actor?.system ?? {}, alias.path) : getPath(getCustomAliasData(actor), alias.alias.key);
    const current = Number(resource?.value), max = Number(resource?.max);
    value = Number.isFinite(current) && Number.isFinite(max) && max > 0 ? Math.round(current / max * 100) : 0;
  }
  value = value && typeof value === "object" && Object.hasOwn(value, "value") ? value.value : value;
  if (alias.alias && alias.suffix === "name" && (value === undefined || value === null || value === "")) value = alias.alias.label;
  if (alias.alias && ["exib", "exibicao"].includes(alias.suffix) && (value === undefined || value === null || value === "")) value = alias.alias.exib ?? alias.alias.label;
  if (alias.alias?.type === "attribute" && alias.suffix === "checkbonus" && typeof value === "string" && depth < 8) {
    const calculated = evaluateAliasExpression(actor, value, depth + 1);
    if (calculated !== null) value = calculated;
  }
  return { value, path, alias: alias.alias };
};

const expandNexusPropertyExpressions = formula => String(formula ?? "").replace(/\{\{\s*([a-zA-Z0-9_.-]+)\s*\}\}/g, (_match, path) => {
  const parts=String(path).split(".");
  if(!parts.length||parts.some(part=>!part||["__proto__","prototype","constructor"].includes(part))) throw new Error("Referência de propriedade inválida na fórmula.");
  return "@"+parts.join(".");
});

const getResourceValuePaths = component => {
  const resourceMap = { pv: "resources.pv", pm: "resources.pm", pe: "resources.pe" };
  let base = component?.currentPath || "";
  if (!base) {
    if (component?.type === "resource-meter") base = component.binding === "custom" ? (component.customBinding || "") : (resourceMap[component.binding] || "");
    else base = COMPONENTS[component?.type]?.path || component?.dataPath || "";
  }
  base = String(base).replace(/^system\./, "");
  if (base.endsWith(".value")) base = base.slice(0, -6);
  return {
    current: component?.currentPath || (base ? `${base}.value` : ""),
    max: component?.maxPath || (base ? `${base}.max` : "")
  };
};

const clone = value => foundry.utils.deepClone(value);
const getPath = (object, path) => {
  const parts = String(path ?? "").split(".");
  if (!path || parts.some(part => !part || ["__proto__", "prototype", "constructor"].includes(part))) return undefined;
  return parts.reduce((value, key) => value?.[key], object);
};
const collectPropertyPaths = actor => {
  const paths = new Set();
  // actor.system é a fonte ativa. Não percorremos _source/toObject em paralelo:
  // isso duplicava a mesma árvore e expunha representações internas do Foundry.
  const source = actor?.system ?? {};
  const visit = (value, prefix = "", depth = 0) => {
    if (!value || typeof value !== "object" || Array.isArray(value) || depth > 8) return;
    for (const [key, child] of Object.entries(value)) {
      if (["__proto__", "prototype", "constructor", "_id", "id", "uuid", "sort", "folder", "ownership", "flags"].includes(key)) continue;
      if (!prefix && ["name", "names"].includes(key)) continue;
      const path = prefix ? `${prefix}.${key}` : key;
      if (child === null || ["string", "number", "boolean"].includes(typeof child) || Array.isArray(child)) paths.add(path);
      else if (child && typeof child === "object") {
        // Percorre a estrutura inteira. value/max são caminhos úteis, mas não
        // tornam os demais campos irmãos menos válidos para o editor.
        visit(child, path, depth + 1);
      }
    }
  };
  visit(source);
  // Propriedades virtuais estáveis: separam retrato, arte do token e moldura
  // sem duplicar URLs em componentes. São resolvidas para campos reais do Foundry.
  for (const path of ["identity.portrait.img", "identity.token.img", "identity.token.border", "token.img", "token.border"]) paths.add(path);
  return paths;
};

const NATIVE_PROPERTY_BASE = [
  { id:"core.resource.pv", label:"Pontos de Vida", exib:"PV", category:"resources", type:"resource", key:"resources.pv", targetPath:"resources.pv" },
  { id:"core.resource.pm", label:"Pontos de Mana", exib:"PM", category:"resources", type:"resource", key:"resources.pm", targetPath:"resources.pm" },
  { id:"core.resource.pe", label:"Pontos de Energia", exib:"PE", category:"resources", type:"resource", key:"resources.pe", targetPath:"resources.pe" },
  ...NEXUS_ATTRIBUTES.map(attribute => ({
    id: "core.attribute." + attribute.key,
    label: attribute.name,
    exib: attribute.code,
    category: "attributes",
    type: "attribute",
    key: "attributes." + attribute.key,
    targetPath: "attributes." + attribute.key
  })),
  { id:"core.combat.defense", label:"Defesa", category:"combat", type:"number", key:"combat.defense", targetPath:"combat.defense" },
  { id:"core.combat.movement", label:"Movimento", category:"combat", type:"number", key:"combat.movement", targetPath:"combat.movement" },
  { id:"core.combat.desl", label:"DESL", category:"combat", type:"number", key:"combat.desl", targetPath:"combat.desl" },
  { id:"core.combat.ddr", label:"DdR", category:"combat", type:"number", key:"combat.ddr", targetPath:"combat.ddr" },
  { id:"core.combat.mb", label:"MB", category:"combat", type:"number", key:"combat.mb", targetPath:"combat.mb" },
  { id:"core.identity.level", label:"Nível", category:"progression", type:"number", key:"identity.level", targetPath:"identity.level" },
  { id:"core.identity.lineage", label:"Linhagem", category:"identity", type:"text", key:"identity.lineage", targetPath:"identity.lineage" },
  { id:"core.identity.legacy", label:"Legado", category:"identity", type:"text", key:"identity.legacy", targetPath:"identity.legacy" },
  { id:"core.identity.name", label:"Nome do personagem", category:"identity", type:"text", key:"identity.name", targetPath:"name" }
];
const nativePropertyDefinitionCache = new WeakMap();
const EMPTY_NATIVE_PROPERTY_LIST = Object.freeze([]);
const LEGACY_SKILL_PATHS = new Set(NEXUS_SKILLS.map(skill => `skills.${skill.legacyKey}`));
const invalidateNativePropertyCache = actor => { if (actor && typeof actor === "object") nativePropertyDefinitionCache.delete(actor); };
const getNativePropertyDefinitions = actor => {
  if (!actor || typeof actor !== "object") return NATIVE_PROPERTY_BASE.map(base => ({ ...base, defaultKey:base.key, defaultLabel:base.label, origin:"native", legacyKeys:[] }));
  const saved = actor.getFlag?.("nexus", "nativeProperties") ?? EMPTY_NATIVE_PROPERTY_LIST;
  const cached = nativePropertyDefinitionCache.get(actor);
  const revision = actor?._stats?.modifiedTime ?? actor?.system;
  if (cached?.source === saved && cached?.revision === revision) return cached.value;
  const byId = new Map((Array.isArray(saved) ? saved : []).map(item => [item.id, item]));
  const value = NATIVE_PROPERTY_BASE.map(base => {
    const override = byId.get(base.id) ?? {};
    return { ...base, ...override, id:base.id, defaultKey:base.key, defaultLabel:base.label, origin:"native", targetPath:base.targetPath, key:safeAliasKey(override.key ?? base.key) || base.key, label:String(override.label ?? base.label).slice(0,48), legacyKeys:Array.isArray(override.legacyKeys) ? override.legacyKeys.filter(key => safeAliasKey(key)) : [] };
  });
  const coreIds = new Set(value.map(item => item.targetPath));
  for (const path of collectPropertyPaths(actor)) {
    if ([...coreIds].some(core => path === core || path.startsWith(`${core}.`))
      || [...LEGACY_SKILL_PATHS].some(legacyPath => path === legacyPath || path.startsWith(`${legacyPath}.`))
      || ["attributes.body", "attributes.mind", "attributes.soul"].some(legacy => path === legacy || path.startsWith(legacy + "."))
      || NEXUS_SKILLS.some(skill => path === `skills.${skill.key}.proficientLevel`)
      || path === "identity.name" || path.startsWith("identity.portrait.") || path.startsWith("identity.token.")) continue;
    const raw = getPath(actor.system ?? {}, path);
    if (raw === undefined || raw === null || typeof raw === "object") continue;
    const id = `system.${path}`;
    const override = byId.get(id) ?? {};
    const type = typeof raw === "number" ? "number" : typeof raw === "boolean" ? "boolean" : "text";
    const label = path.split(".").map(part => part.replace(/[-_]/g, " ")).join(" · ");
    value.push({ id, label:String(override.label ?? label).slice(0,48), category:"external", type, key:safeAliasKey(override.key ?? path) || path, targetPath:path, defaultKey:path, defaultLabel:label, origin:"native", legacyKeys:Array.isArray(override.legacyKeys) ? override.legacyKeys.filter(key => safeAliasKey(key)) : [] });
  }
  nativePropertyDefinitionCache.set(actor, { source:saved, revision, value });
  return value;
};
const replaceLayoutBindingPaths = (layouts, oldKey, newKey) => {
  if (!oldKey || !newKey || oldKey === newKey) return;
  for (const layout of Object.values(layouts ?? {})) for (const component of layout.components ?? []) {
    for (const property of ["dataPath", "currentPath", "maxPath", "customBinding"]) {
      const value = component[property];
      if (typeof value === "string" && (value === oldKey || value.startsWith(`${oldKey}.`))) component[property] = `${newKey}${value.slice(oldKey.length)}`;
    }
  }
};

const EMPTY_ALIAS_LIST = Object.freeze([]);
const aliasDefinitionCache = new WeakMap();
const invalidateAliasDefinitionCache = actor => { if (actor && typeof actor === "object") aliasDefinitionCache.delete(actor); };
const getAliasDefinitions = actor => {
  if (!actor || typeof actor !== "object") return [];
  const stored = actor.getFlag?.("nexus", "aliases") ?? EMPTY_ALIAS_LIST;
  const cached = aliasDefinitionCache.get(actor);
  if (cached?.source === stored) return cached.value;
  const seen = new Set();
  const value = (Array.isArray(stored) ? stored : []).map(normalizeAliasDefinition).filter(alias => {
    if (!alias || seen.has(alias.key)) return false;
    seen.add(alias.key); return true;
  }).sort((a, b) => b.key.length - a.key.length);
  aliasDefinitionCache.set(actor, { source: stored, value });
  return value;
};
const getCustomAliasData = actor => actor?.getFlag?.("nexus", "customData") ?? {};
const normalizeAliasDefinition = alias => {
  if (!alias || typeof alias !== "object") return null;
  const category = ["attributes", "resources", "combat", "identity", "custom"].includes(alias.category) ? alias.category : "custom";
  let key = String(alias.key ?? "").trim().replace(/^system\./, "");
  // Corrige caminhos legados como attributes.attributes.agi sem tocar em nomes legítimos.
  const repeated = new RegExp(`^(?:${category}\\.){2,}`, "i");
  if (repeated.test(key)) key = key.replace(repeated, `${category}.`);
  key = safeAliasKey(key);
  if (!key) return null;
  const validTypes = ["attribute", "resource", "number", "text", "url", "image", "boolean"];
  const type = validTypes.includes(alias.type) ? alias.type : (category === "resources" ? "resource" : category === "attributes" ? "attribute" : category === "identity" ? "text" : "number");
  return { ...alias, id: alias.id ?? foundry.utils.randomID(), key, category, legacyKeys: Array.isArray(alias.legacyKeys) ? alias.legacyKeys.filter(item => safeAliasKey(item)) : [], label: String(alias.label ?? key.split(".").at(-1)).slice(0,48), type, targetPath: safeAliasKey(alias.targetPath ?? ""), source: alias.source === "actor" ? "actor" : "custom" };
};
const safeAliasKey = value => {
  const key = String(value ?? "").trim().replace(/^actor\./, "").replace(/^system\./, "");
  return /^[a-zA-Z][a-zA-Z0-9_-]*(?:\.[a-zA-Z][a-zA-Z0-9_-]*)*$/.test(key) && !key.split(".").some(part => ["__proto__", "prototype", "constructor"].includes(part)) ? key : "";
};
const evaluateAliasExpression = (actor, expression, depth = 0) => {
  if (depth > 8 || typeof expression !== "string" || !expression.trim()) return null;
  const source = expression.trim();
  const tokens = [];
  const pattern = /\s*([A-Za-z_][A-Za-z0-9_-]*(?:\.[A-Za-z_][A-Za-z0-9_-]*)*|(?:\d+(?:\.\d*)?|\.\d+)|[()+*/-])\s*/gy;
  let cursor = 0;
  while (cursor < source.length) {
    pattern.lastIndex = cursor; const match = pattern.exec(source);
    if (!match) return null;
    tokens.push(match[1]); cursor = pattern.lastIndex;
  }
  let index = 0;
  const primary = () => {
    const token = tokens[index++];
    if (token === "(") { const value = sum(); if (tokens[index++] !== ")") throw new Error("parenthesis"); return value; }
    if (token === "+") return primary();
    if (token === "-") return -primary();
    if (token === undefined) throw new Error("missing");
    if (/^(?:\d+(?:\.\d*)?|\.\d+)$/.test(token)) return Number(token);
    const resolved = resolveNexusBinding(actor, token, depth + 1).value;
    const number = Number(resolved);
    if (!Number.isFinite(number)) throw new Error("not numeric");
    return number;
  };
  const product = () => { let value = primary(); while (["*", "/"].includes(tokens[index])) { const op = tokens[index++], right = primary(); value = op === "*" ? value * right : value / right; } return value; };
  const sum = () => { let value = product(); while (["+", "-"].includes(tokens[index])) { const op = tokens[index++], right = product(); value = op === "+" ? value + right : value - right; } return value; };
  try { const result = sum(); return index === tokens.length && Number.isFinite(result) ? result : null; } catch (_) { return null; }
};

const getNexusRollAliasEntries = actor => {
  const candidates = [...getNativePropertyDefinitions(actor), ...getAliasDefinitions(actor)]
    .filter(alias => ["attribute", "resource", "number"].includes(alias.type))
    .map(alias => {
    const explicit = String(alias.exib ?? alias.exibicao ?? alias.abbreviation ?? alias.shortName ?? "").trim();
    const words = String(alias.label ?? alias.key?.split(".").at(-1) ?? "")
      .normalize("NFD").replace(/[\u0300-\u036f]/g, "").match(/[A-Za-z0-9]+/g) ?? [];
    const generated = words.length > 1 ? words.map(word => word[0]).join("").slice(0, 4) : (words[0] ?? "").slice(0, 3);
    const display = explicit || generated;
    if (!/^[A-Za-z][A-Za-z0-9_-]*$/.test(display)) return null;
    const root = safeAliasKey(alias.targetPath || alias.key);
    if (!root) return null;
    const raw = alias.targetPath
      ? getPath(actor?.system ?? {}, alias.targetPath)
      : getPath(getCustomAliasData(actor), alias.key);
    const hasValueMember = !!raw && typeof raw === "object" && Object.hasOwn(raw, "value");
    const target = safeAliasKey(["attribute", "resource"].includes(alias.type) && hasValueMember && !root.endsWith(".value") ? root + ".value" : root);
    return target ? { display, target, label: String(alias.label ?? display), alias } : null;
  }).filter(Boolean);
  const counts = new Map();
  for (const entry of candidates) {
    const key = entry.display.toLocaleUpperCase("pt-BR");
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return candidates.filter(entry => counts.get(entry.display.toLocaleUpperCase("pt-BR")) === 1);
};

const expandNexusRollAliases = (actor, formula) => {
  const shorthand = new Map(getNexusRollAliasEntries(actor).map(entry => [entry.display.toLocaleUpperCase("pt-BR"), entry.target]));
  return String(formula ?? "").replace(/@([A-Za-z][A-Za-z0-9_-]*)(?![A-Za-z0-9_.-])/g, (match, token) => {
    const path = shorthand.get(token.toLocaleUpperCase("pt-BR"));
    return path ? "@" + path : match;
  });
};

const getNexusRollData = actor => {
  const data = clone(actor?.getRollData?.() ?? {});
  data.combat ??= {};
  data.combat.mb = getNexusBaseModifier(actor);
  for (const entry of getNexusRollAliasEntries(actor)) {
    if (entry.alias.targetPath) continue;
    const sourcePath = entry.target === entry.alias.key + ".value" ? entry.alias.key + ".value" : entry.alias.key;
    const value = resolveNexusBinding(actor, sourcePath).value;
    if (value === undefined) continue;
    const parts = entry.target.split(".");
    if (parts.some(part => ["__proto__", "prototype", "constructor"].includes(part))) continue;
    let target = data;
    for (const part of parts.slice(0, -1)) {
      if (!target[part] || typeof target[part] !== "object") target[part] = {};
      target = target[part];
    }
    target[parts.at(-1)] = value;
  }
  return data;
};

const resolveAliasPath = (actor, path) => {
  const aliases = [...getNativePropertyDefinitions(actor), ...getAliasDefinitions(actor)];
  let matchedKey = "";
  const alias = aliases.find(item => {
    const keys = [item.key, ...(item.legacyKeys ?? [])];
    matchedKey = keys.find(key => path === key || path.startsWith(`${key}.`)) ?? "";
    return !!matchedKey;
  });
  if (!alias) return { path, alias: null, suffix: "" };
  const suffix = path.slice(matchedKey.length).replace(/^\./, "");
  let targetPath = alias.targetPath ? [alias.targetPath, suffix].filter(Boolean).join(".") : "";
  // Atributos podem apontar o valor para um campo numérico nativo; metadados
  // (nome, bônus e fórmula) continuam pertencendo ao alias.
  if (alias.targetPath && alias.type === "attribute") {
    if (suffix === "value") targetPath = alias.targetPath;
    else if (["name", "exib", "exibicao", "checkbonus", "roll"].includes(suffix)) targetPath = "";
  }
  if (alias.targetPath && alias.type === "resource") {
    if (suffix === "percentage") targetPath = alias.targetPath;
    else if (["name", "exib", "exibicao"].includes(suffix)) targetPath = "";
  }
  return { path: targetPath, alias, suffix };
};

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
const DEFAULT_FOUNDRY_TOKEN_IMAGE = "icons/svg/mystery-man.svg";
const IMAGE_EXTENSIONS = "png|jpe?g|jpe|jfif|pjpeg|pjp|gif|apng|webp|avif|svg|bmp|dib|tif|tiff|ico|heic|heif|jxl";
const AUDIO_EXTENSIONS = "mp3|ogg|wav|m4a|aac|flac|opus";
const VIDEO_EXTENSIONS = "mp4|webm|ogv|mov|m4v|mkv|avi|mpeg|mpg|3gp";
const MEDIA_EXTENSION_PATTERN = new RegExp(`\\.(?:${IMAGE_EXTENSIONS}|${AUDIO_EXTENSIONS}|${VIDEO_EXTENSIONS})(?:[?#].*)?$`, "i");
const VIDEO_EXTENSION_PATTERN = new RegExp(`\\.(?:${VIDEO_EXTENSIONS})(?:[?#].*)?$`, "i");
const isMediaSource = value => {
  const source = String(value ?? "").trim();
  if (!source || /[{}]/.test(source)) return false;
  if (/^data:(?:image|audio|video)\/[a-z0-9.+-]+(?:;[^,]*)?,/i.test(source)) return true;
  // URLs HTTP(S) podem ser links assinados/CDN sem extensão visível; o navegador
  // confirma o formato durante o carregamento. Caminhos locais exigem extensão.
  if (/^https?:\/\//i.test(source)) return true;
  return !/^[a-z][a-z0-9+.-]*:/i.test(source) && MEDIA_EXTENSION_PATTERN.test(source);
};
const isVideoSource = value => VIDEO_EXTENSION_PATTERN.test(String(value ?? "")) || /^data:video\//i.test(String(value ?? ""));
const isAudioSource = value => new RegExp(`\\.(?:${AUDIO_EXTENSIONS})(?:[?#].*)?$`, "i").test(String(value ?? "")) || /^data:audio\//i.test(String(value ?? ""));
const isImageSource = value => isMediaSource(value) && !isVideoSource(value) && !isAudioSource(value);
const isUsableTokenSource = value => {
  const source = String(value ?? "").trim();
  return source !== DEFAULT_FOUNDRY_TOKEN_IMAGE && (isImageSource(source) || isVideoSource(source));
};
const getFoundryDefaultTokenImage = actor => {
  // identity.token.img pode existir como dado real do sistema; não deve ser
  // mascarado pelo caminho virtual que expõe o token padrão do Foundry.
  const systemTokenImage = String(getPath(actor?.system, "identity.token.img") ?? "").trim();
  const prototypeImage = String(actor?.prototypeToken?.texture?.src ?? actor?.prototypeToken?.img ?? "").trim();
  const actorImage = String(actor?.img ?? "").trim();
  return [systemTokenImage, prototypeImage, actorImage].find(isUsableTokenSource) ?? DEFAULT_FOUNDRY_TOKEN_IMAGE;
};
const getTokenImageSource = (actor, component, boundValue = "") => {
  const customRaw = String(component?.tokenImage ?? "").trim();
  const customBinding = customRaw.match(/^\{\{\s*([^{}]+?)\s*\}\}$/);
  const custom = customBinding ? String(resolveNexusBinding(actor, customBinding[1]).value ?? "").trim() : customRaw;
  const bound = String(boundValue ?? "").trim();
  const usesImplicitTokenPath = !component?.dataPath || ["img", "identity.token.img"].includes(String(component.dataPath));
  const systemTokenImage = String(getPath(actor?.system, "identity.token.img") ?? "").trim();
  const actorImage = String(actor?.img ?? "").trim();
  const prototypeImage = String(actor?.prototypeToken?.texture?.src ?? actor?.prototypeToken?.img ?? "").trim();
  const candidates = usesImplicitTokenPath
    ? [custom, systemTokenImage, actorImage, bound, prototypeImage]
    : [custom, bound, systemTokenImage, actorImage, prototypeImage];
  return candidates.find(isUsableTokenSource) ?? DEFAULT_FOUNDRY_TOKEN_IMAGE;
};
const isSafeLink = value => /^(https?:\/\/|mailto:|\/)/i.test(String(value ?? "").trim());

// Um único renderer mantém a mesma estrutura visual nos previews da biblioteca,
// no inspetor e no componente inserido na ficha.
const setPreviewContent = (node, value) => {
  if (!node) return;
  node.replaceChildren();
  const content = String(value ?? "").trim();
  if (isImageSource(content)) {
    const img = document.createElement("img");
    img.src = content;
    img.alt = "";
    img.loading = "lazy";
    node.append(img);
  } else node.textContent = content;
  node.hidden = !content;
};

const createSheetResourcePreview = ({
  label = "PV", icon = "❤️", current = 32, max = 40,
  color = "#3198ce", trackColor = "#080d14", orientation = "horizontal", showValues = true
} = {}) => {
  const root = document.createElement("div");
  root.className = `nexus-sheet-resource nexus-sheet-resource-preview${orientation === "vertical" ? " is-vertical" : ""}`;
  root.style.setProperty("--nexus-resource-color", color);
  root.style.setProperty("--nexus-resource-track-color", trackColor);
  const labelNode = document.createElement("span");
  labelNode.className = "nexus-sheet-resource-label";
  setPreviewContent(labelNode, label);
  const iconNode = document.createElement("span");
  iconNode.className = "nexus-sheet-resource-icon";
  setPreviewContent(iconNode, icon);
  const track = document.createElement("div");
  track.className = "nexus-sheet-resource-track";
  const fill = document.createElement("i");
  const currentNumber = Number(current), maxNumber = Number(max);
  const percent = current == null || current === "" || max == null || max === "" || !Number.isFinite(currentNumber) || !Number.isFinite(maxNumber) || maxNumber <= 0
    ? 0 : clamp(currentNumber / maxNumber, 0, 1) * 100;
  fill.style.setProperty("width", orientation === "horizontal" ? `${percent}%` : "100%", "important");
  fill.style.setProperty("height", orientation === "vertical" ? `${percent}%` : "100%", "important");
  track.append(fill);
  root.append(labelNode, iconNode, track);
  if (showValues) {
    const values = document.createElement("strong");
    values.className = "nexus-sheet-resource-values";
    const currentNode = document.createElement("b");
    currentNode.textContent = String(current);
    const separator = document.createElement("span");
    separator.textContent = "/";
    const maxNode = document.createElement("b");
    maxNode.textContent = String(max);
    values.append(currentNode, separator, maxNode);
    root.append(values);
  }
  return root;
};

const fitSheetResourcePreview = (stage, component, maxSize = 174) => {
  if (!stage || !component) return;
  const preview = stage.querySelector(".nexus-sheet-resource-preview");
  if (!preview) return;
  const width = Math.max(1, Number(component.w) || 220);
  const height = Math.max(1, Number(component.h) || 58);
  const scale = Math.min(maxSize / width, maxSize / height);
  preview.style.setProperty("width", `${Math.max(1, width * scale)}px`, "important");
  preview.style.setProperty("height", `${Math.max(1, height * scale)}px`, "important");
  preview.style.setProperty("max-width", "100%", "important");
  preview.style.setProperty("max-height", "100%", "important");
  stage.dataset.componentWidth = String(width);
  stage.dataset.componentHeight = String(height);
};

const updateSheetResourcePreview = (root, settings = {}) => {
  if (!root) return;
  const {
    label = "PV", icon = "❤️", current = 32, max = 40,
    color = "#3198ce", trackColor = "#080d14", orientation = "horizontal"
  } = settings;
  const nodes = root.querySelectorAll(".nexus-sheet-resource-label,.nexus-sheet-resource-icon");
  setPreviewContent(nodes[0], label);
  setPreviewContent(nodes[1], icon);
  const values = root.querySelectorAll(".nexus-sheet-resource-values b");
  if (values[0]) values[0].textContent = current == null || current === "" ? "—" : String(current);
  if (values[1]) values[1].textContent = max == null || max === "" ? "—" : String(max);
  root.style.setProperty("--nexus-resource-color", color);
  root.style.setProperty("--nexus-resource-track-color", trackColor);
  root.classList.toggle("is-vertical", orientation === "vertical");
  const fill = root.querySelector(".nexus-sheet-resource-track > i");
  const currentNumber = Number(current), maxNumber = Number(max);
  const percent = current == null || current === "" || max == null || max === "" || !Number.isFinite(currentNumber) || !Number.isFinite(maxNumber) || maxNumber <= 0
    ? 0 : clamp(currentNumber / maxNumber, 0, 1) * 100;
  if (fill) {
    // Regras verticais usam propriedades !important; atualizar com prioridade
    // evita que a altura fixa da barra prevaleça sobre o valor atual.
    fill.style.setProperty("width", orientation === "horizontal" ? `${percent}%` : "100%", "important");
    fill.style.setProperty("height", orientation === "vertical" ? `${percent}%` : "100%", "important");
  }
};


/* NEXUS professional color control: HSV spectrum, alpha and optional background textures. */
if (!customElements.get("nexus-color-picker")) {
  class NexusColorPicker extends HTMLElement {
    constructor() {
      super();
      this.attachShadow({ mode: "open" });
      this._h = 210; this._s = 0.55; this._v = 0.72; this._a = 1; this._texture = "solid"; this._value = "#526b89";
      this._outsideHandler = event => { if (!event.composedPath().includes(this)) this._close(); };
    }
    connectedCallback() {
      if (!this.shadowRoot.childElementCount) {
        this._build();
        this._readValue(this.getAttribute("value") || this._value);
        this._sync();
      }
      if (!this._outsideAttached) {
        document.addEventListener("pointerdown", this._outsideHandler, true);
        this._outsideAttached = true;
      }
    }
    disconnectedCallback() {
      if (this._outsideAttached) document.removeEventListener("pointerdown", this._outsideHandler, true);
      this._outsideAttached = false;
    }
    get value() { return this._value; }
    set value(value) { this._readValue(String(value ?? "")); this._sync(); }
    _build() {
      this.shadowRoot.innerHTML = `
        <style>
          :host{display:inline-block;position:relative;box-sizing:border-box;min-width:0;width:100%;font:12px/1.35 Inter,system-ui,sans-serif;color:var(--nexus-panel-text,#e7edf5)}
          *{box-sizing:border-box}.trigger{display:flex;align-items:center;gap:7px;width:100%;min-height:30px;padding:1px 0;border:0;border-radius:0;background:transparent;color:inherit;text-align:left;cursor:pointer}
          .swatch{width:27px;height:27px;flex:0 0 27px;border:1px solid #ffffff55;border-radius:5px;background-color:#526b89;background-image:linear-gradient(45deg,#888 25%,transparent 25%),linear-gradient(-45deg,#888 25%,transparent 25%),linear-gradient(45deg,transparent 75%,#888 75%),linear-gradient(-45deg,transparent 75%,#888 75%);background-size:8px 8px;background-position:0 0,0 4px,4px -4px,-4px 0;overflow:hidden}
          .swatch i{display:block;width:100%;height:100%;background:#526b89}.trigger span:last-child{min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font:600 11px ui-monospace,monospace}
          .popover{position:fixed;z-index:2147483647;left:12px;top:12px;width:min(292px,calc(100vw - 28px));max-height:calc(100vh - 24px);overflow:auto;margin:0;padding:11px;border:1px solid var(--nexus-panel-border,#52647b);border-radius:10px;background:var(--nexus-panel-bg,#182330);box-shadow:0 12px 34px #000a}
          .popover:not(:popover-open){display:none}.spectrum{position:relative;height:146px;border-radius:6px;cursor:crosshair;touch-action:none;background:linear-gradient(to top,#000,transparent),linear-gradient(to right,#fff,hsl(210 100% 50%))}.thumb{position:absolute;width:13px;height:13px;border:2px solid white;border-radius:50%;box-shadow:0 0 0 1px #000b;transform:translate(-50%,-50%);pointer-events:none}
          .range-row{display:grid;grid-template-columns:52px minmax(0,1fr);align-items:center;gap:8px;margin-top:10px}.range-row label{font-size:10px;color:var(--nexus-panel-muted,#9aadc2)}input[type=range]{width:100%;margin:0;accent-color:var(--nexus-highlight-color,#78b7e8)}
          .hue{height:12px;border-radius:10px;background:linear-gradient(90deg,#f00,#ff0,#0f0,#0ff,#00f,#f0f,#f00);appearance:none}.alpha{height:12px;border-radius:10px;appearance:none;background:linear-gradient(90deg,transparent,var(--picked-color,#526b89)),repeating-conic-gradient(#777 0 25%,#aaa 0 50%) 0/8px 8px}
          .fields{display:grid;grid-template-columns:minmax(0,1fr) auto;align-items:center;gap:8px;margin-top:10px}.hex{width:100%;min-width:0;height:31px;padding:5px 8px;border:1px solid var(--nexus-panel-border,#3c5067);border-radius:5px;background:var(--nexus-panel-input,#111b27);color:inherit;font:12px ui-monospace,monospace}.rgba{color:var(--nexus-panel-muted,#9aadc2);font-size:10px;white-space:nowrap}
          .texture{width:100%;height:31px;margin-top:9px;padding:4px 7px;border:1px solid var(--nexus-panel-border,#3c5067);border-radius:5px;background:var(--nexus-panel-input,#111b27);color:inherit;font:11px Inter,system-ui,sans-serif}.texture[hidden]{display:none}
          button:focus-visible,input:focus-visible,select:focus-visible{outline:2px solid var(--nexus-highlight-color,#78b7e8);outline-offset:2px}
        </style>
        <button class="trigger" type="button" aria-haspopup="dialog" aria-expanded="false"><i class="swatch"><i></i></i><span>#526b89</span></button>
        <div class="popover" popover="manual" role="dialog" aria-label="Seletor avançado de cores">
          <div class="spectrum" tabindex="0" aria-label="Saturação e luminosidade"><i class="thumb"></i></div>
          <div class="range-row"><label>Matiz</label><input class="hue" type="range" min="0" max="360" value="210"></div>
          <div class="range-row"><label>Opacidade</label><input class="alpha" type="range" min="0" max="100" value="100"></div>
          <div class="fields"><input class="hex" type="text" spellcheck="false" maxlength="9" aria-label="Código hexadecimal"><output class="rgba"></output></div>
          <select class="texture" aria-label="Textura" hidden><option value="solid">Cor sólida</option><option value="diagonal">Listras diagonais</option><option value="stripes">Faixas</option><option value="dots">Pontos</option><option value="grid">Grade</option></select>
        </div>`;
      const q = selector => this.shadowRoot.querySelector(selector);
      q(".popover").addEventListener("toggle", () => q(".trigger").setAttribute("aria-expanded", String(q(".popover").matches(":popover-open"))));
      q(".trigger").addEventListener("click", () => {
        const panel = q(".popover");
        if (panel.matches(":popover-open")) panel.hidePopover();
        else {
          const rect = this.getBoundingClientRect(), width = Math.min(292, window.innerWidth - 28), estimatedHeight = Math.min(390, window.innerHeight - 24);
          const left = Math.max(14, Math.min(rect.left, window.innerWidth - width - 14));
          const below = rect.bottom + 7;
          const top = below + estimatedHeight <= window.innerHeight - 10 ? below : Math.max(10, rect.top - estimatedHeight - 7);
          panel.style.left = `${left}px`; panel.style.top = `${top}px`;
          panel.showPopover();
        }
        q(".trigger").setAttribute("aria-expanded", String(panel.matches(":popover-open")));
      });
      q(".spectrum").addEventListener("pointerdown", event => { q(".spectrum").setPointerCapture?.(event.pointerId); this._pickSV(event); const move=e=>this._pickSV(e); const up=()=>{q(".spectrum").removeEventListener("pointermove",move);q(".spectrum").removeEventListener("pointerup",up);this._emit("change");}; q(".spectrum").addEventListener("pointermove",move); q(".spectrum").addEventListener("pointerup",up,{once:true}); q(".spectrum").addEventListener("pointercancel",up,{once:true}); });
      q(".hue").addEventListener("input", event=>{this._h=Number(event.target.value);this._sync();this._emit("input");});
      q(".hue").addEventListener("change",()=>this._emit("change"));
      q(".alpha").addEventListener("input", event=>{this._a=Number(event.target.value)/100;this._sync();this._emit("input");});
      q(".alpha").addEventListener("change",()=>this._emit("change"));
      q(".hex").addEventListener("change", event=>{if(this._readValue(event.target.value)){this._sync();this._emit("input");this._emit("change");}else event.target.value=this._hex();});
      q(".texture").addEventListener("change", event=>{this._texture=event.target.value;this._sync();this._emit("input");this._emit("change");});
      this.shadowRoot.addEventListener("keydown", event=>{if(event.key==="Escape")this._close();});
      if(this.hasAttribute("allow-texture"))q(".texture").hidden=false;
    }
    _close(){const panel=this.shadowRoot.querySelector(".popover");if(panel?.matches(":popover-open")){panel.hidePopover();this.shadowRoot.querySelector(".trigger")?.setAttribute("aria-expanded","false");}}
    _pickSV(event){const rect=this.shadowRoot.querySelector(".spectrum").getBoundingClientRect();this._s=Math.min(1,Math.max(0,(event.clientX-rect.left)/rect.width));this._v=1-Math.min(1,Math.max(0,(event.clientY-rect.top)/rect.height));this._sync();this._emit("input");}
    _readValue(value){let raw=String(value||"").trim();if(!raw)return false;const pattern=raw.includes("repeating-linear-gradient")? (raw.includes("45deg")?"diagonal":"stripes"):raw.includes("radial-gradient")?"dots":raw.includes("linear-gradient")?"grid":"solid";if(pattern!=="solid"){this._texture=pattern;const match=raw.match(/#[0-9a-f]{6,8}/i);raw=match?.[0]||"#526b89";}else this._texture="solid";
      let r,g,b,a=1;const hex=raw.match(/^#([0-9a-f]{3}|[0-9a-f]{6}|[0-9a-f]{8})$/i);if(hex){let h=hex[1];if(h.length===3)h=[...h].map(c=>c+c).join("");if(h.length===8)a=parseInt(h.slice(6),16)/255; r=parseInt(h.slice(0,2),16);g=parseInt(h.slice(2,4),16);b=parseInt(h.slice(4,6),16);}else{const rgb=raw.match(/^rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)(?:\s*,\s*([\d.]+))?\s*\)$/i);if(!rgb)return false;r=+rgb[1];g=+rgb[2];b=+rgb[3];a=rgb[4]===undefined?1:Number(rgb[4]);}
      const max=Math.max(r,g,b)/255,min=Math.min(r,g,b)/255,d=max-min;let h=0,s=max===0?0:d/max;if(d){if(max===r/255)h=((g-b)/255/d)%6;else if(max===g/255)h=(b-r)/255/d+2;else h=(r-g)/255/d+4;h*=60;if(h<0)h+=360;}this._h=h;this._s=s;this._v=max;this._a=Math.min(1,Math.max(0,a));this._value=this._serialize();return true;}
    _rgb(){const c=this._v*this._s,x=c*(1-Math.abs((this._h/60)%2-1)),m=this._v-c;let r=0,g=0,b=0;if(this._h<60)[r,g,b]=[c,x,0];else if(this._h<120)[r,g,b]=[x,c,0];else if(this._h<180)[r,g,b]=[0,c,x];else if(this._h<240)[r,g,b]=[0,x,c];else if(this._h<300)[r,g,b]=[x,0,c];else[r,g,b]=[c,0,x];return [r,g,b].map(n=>Math.round((n+m)*255));}
    _hex(){const [r,g,b]=this._rgb();return "#"+[r,g,b].map(n=>n.toString(16).padStart(2,"0")).join("")+(this._a<.999?Math.round(this._a*255).toString(16).padStart(2,"0"):"");}
    _serialize(){const [r,g,b]=this._rgb();const paint=this._hex();if(this._texture==="solid")return paint;if(this._texture==="dots")return `radial-gradient(circle, ${paint} 1.4px, transparent 1.6px) 0 0 / 8px 8px`;if(this._texture==="grid")return `linear-gradient(${paint} 1px, transparent 1px), linear-gradient(90deg, ${paint} 1px, transparent 1px)`;if(this._texture==="stripes")return `repeating-linear-gradient(0deg, ${paint} 0 5px, transparent 5px 10px)`;return `repeating-linear-gradient(45deg, ${paint} 0 5px, transparent 5px 10px)`;}
    _sync(){if(!this.shadowRoot.childElementCount)return;const q=s=>this.shadowRoot.querySelector(s),[r,g,b]=this._rgb(),rgba=`rgba(${r}, ${g}, ${b}, ${this._a.toFixed(2)})`;this._value=this._serialize();q(".spectrum").style.background=`linear-gradient(to top,#000,transparent),linear-gradient(to right,#fff,hsl(${this._h} 100% 50%))`;q(".thumb").style.left=`${this._s*100}%`;q(".thumb").style.top=`${(1-this._v)*100}%`;q(".hue").value=this._h;q(".alpha").value=Math.round(this._a*100);q(".alpha").style.setProperty("--picked-color",`rgb(${r} ${g} ${b})`);q(".hex").value=this._hex();q(".rgba").textContent=`${r}, ${g}, ${b} · ${Math.round(this._a*100)}%`;q(".swatch i").style.background=this._value;q(".trigger span").textContent=this._texture==="solid"?this._hex():`Textura · ${this._texture}`;q(".texture").value=this._texture;}
    _emit(type){this.dispatchEvent(new Event(type,{bubbles:true,composed:true}));}
  }
  customElements.define("nexus-color-picker", NexusColorPicker);
}

export class NexusActorSheet extends NexusActorSheetBase {
  static DEFAULT_OPTIONS = foundry.utils.mergeObject(ActorSheetV2.DEFAULT_OPTIONS, {
    classes: ["nexus", "sheet", "actor"],
    position: { width: 800, height: 850 },
    window: { resizable: true }
  }, { inplace: false });

  static PARTS = {
    main: { template: "systems/nexus/templates/actors/actor-sheet.hbs" }
  };

  render(options = {}) {
    const panel = document.querySelector(`[data-tool-panel="aliases"]`) ?? this.element?.querySelector?.('[data-tool-panel="aliases"]');
    if (panel && !panel.hidden) this._pendingAliasScrollTop = panel.scrollTop;
    const sheetScrollSelectors = [".nexus-appearance-drawer", ".nexus-settings-drawer", ".nexus-behavior-editor", ".nexus-canvas-scroll", ".nexus-sidebar-left", ".nexus-sidebar-right", ".nexus-tool-panel[data-tool-panel='aliases']", ".nexus-library-grid", ".nexus-layer-list", ".nexus-component-inspector", ".nexus-inspector-tab-panel[data-inspector-tab-panel='card']", ".nexus-inspector-tab-panel[data-inspector-tab-panel='appearance']", ".nexus-library-panel", ".nexus-library-details", ".nexus-library-assets", ".nexus-library-flow-grid"];
    const sheetScrollState = sheetScrollSelectors.map(selector => { const node = this.element?.querySelector?.(selector); return node ? { selector, top: node.scrollTop, left: node.scrollLeft } : null; }).filter(Boolean);
    const states = [...(this._nexusPanelWindows?.entries?.() ?? [])].map(([key, instance]) => {
      const element = instance?.element;
      if (!element?.isConnected) return null;
      const active = element.contains(document.activeElement) ? document.activeElement : null;
      const attrs = active ? ["data-component-setting","data-layout-setting","data-global-typography","data-alias-field","data-native-property-field","data-property-value","data-component-path-input","data-config-current-value","data-config-max-value","data-alias-select","data-alias-new-name","data-inspector-tab","data-floating-panel","data-text-style-control"] : [];
      const descriptor = active ? attrs.map(attr => active.hasAttribute(attr) ? { attr, value: active.getAttribute(attr), targetId: active.dataset.componentTargetId ?? "", aliasId: active.dataset.aliasId ?? "" } : null).find(Boolean) : null;
      const scroll = [...element.querySelectorAll(".window-content,.application-content,.nexus-component-inspector,.nexus-layer-list,.nexus-alias-manager,.nexus-library-grid,.nexus-library-panel,.nexus-library-section-panel:not([hidden]),.nexus-library-details,.nexus-library-assets,.nexus-library-flow-grid,.nexus-settings-drawer,.nexus-behavior-editor,.nexus-inspector-tab-panel")].map(node => ({ selector: node.classList.contains("nexus-component-inspector") ? ".nexus-component-inspector" : node.classList.contains("nexus-layer-list") ? ".nexus-layer-list" : node.classList.contains("nexus-alias-manager") ? ".nexus-alias-manager" : node.classList.contains("nexus-library-grid") ? ".nexus-library-grid" : node.classList.contains("nexus-library-panel") ? ".nexus-library-panel" : node.classList.contains("nexus-library-section-panel") ? `.nexus-library-section-panel[data-library-section-panel="${node.dataset.librarySectionPanel}"]` : node.classList.contains("nexus-library-details") ? ".nexus-library-details" : node.classList.contains("nexus-library-assets") ? ".nexus-library-assets" : node.classList.contains("nexus-library-flow-grid") ? ".nexus-library-flow-grid" : node.classList.contains("nexus-settings-drawer") ? ".nexus-settings-drawer" : node.classList.contains("nexus-behavior-editor") ? ".nexus-behavior-editor" : node.classList.contains("nexus-inspector-tab-panel") ? `.nexus-inspector-tab-panel[data-inspector-tab-panel="${node.dataset.inspectorTabPanel}"]` : node.classList.contains("window-content") ? ".window-content" : ".application-content", top: node.scrollTop, left: node.scrollLeft }));
      let start = null, end = null;
      try { start = active?.selectionStart ?? null; end = active?.selectionEnd ?? null; } catch (_) {}
      return { key, descriptor, tag: active?.tagName, value: active && "value" in active ? active.value : null, checked: active?.type === "checkbox" ? active.checked : null, start, end, left: element.style.left, top: element.style.top, scroll };
    }).filter(Boolean);
    const activeCanvasBeforeRender = this.element?.querySelector?.(".nexus-canvas");
    const canvasHadFocus = !!activeCanvasBeforeRender && (document.activeElement === activeCanvasBeforeRender || activeCanvasBeforeRender.contains(document.activeElement));
    const result = super.render(options);
    const restore = () => {
      for (const saved of sheetScrollState) { const node = this.element?.querySelector?.(saved.selector); if (node) { node.scrollTop = saved.top; node.scrollLeft = saved.left; } }
      for (const state of states) {
        const instance = this._nexusPanelWindows?.get(state.key), element = instance?.element;
        if (!element?.isConnected) continue;
        if (state.left) element.style.left = state.left;
        if (state.top) element.style.top = state.top;
        for (const saved of state.scroll) { const node = element.querySelector(saved.selector); if (node) { node.scrollTop = saved.top; node.scrollLeft = saved.left; } }
        if (state.descriptor) {
          const activeNow = document.activeElement;
          const { attr, value, targetId, aliasId } = state.descriptor;
          const target = [...element.querySelectorAll(`[${attr}]`)].find(node => node.getAttribute(attr) === value && (!state.tag || node.tagName === state.tag) && (!targetId || node.dataset.componentTargetId === targetId) && (!aliasId || node.dataset.aliasId === aliasId));
          const canRestoreFocus = !activeNow || activeNow === document.body || activeNow === document.documentElement || activeNow === target;
          if (target && canRestoreFocus) { if (state.value !== null && "value" in target) target.value = state.value; if (state.checked !== null && target.type === "checkbox") target.checked = state.checked; target.focus({ preventScroll:true }); if (state.start !== null && target.setSelectionRange) { try { target.setSelectionRange(state.start,state.end); } catch (_) {} } }
        }
      }
      if (canvasHadFocus) this.element?.querySelector?.(".nexus-canvas")?.focus?.({ preventScroll: true });
    };
    const scheduleRestore = () => requestAnimationFrame(() => requestAnimationFrame(restore));
    if (result && typeof result.then === "function") {
      result.then(scheduleRestore, error => {
        console.error("NEXUS | Falha ao renderizar a ficha", error);
        ui.notifications?.error?.("O NEXUS não conseguiu atualizar a ficha. Consulte o console para detalhes.");
      });
    } else scheduleRestore();
    return result;
  }

  async _prepareContext(options = {}) {
    const context = await super._prepareContext(options);
    context.actor = this.actor;
    context.system = this.actor.system ?? {};

    const layouts = await this._readLayouts();
    const storedActiveId = String(this.actor.getFlag("nexus", "activeLayout") ?? "principal");
    const activeId = layouts[storedActiveId] ? storedActiveId : "principal";
    const customAliasData = getCustomAliasData(this.actor);

    const normalizedAliases = getAliasDefinitions(this.actor);
    const aliases = normalizedAliases.map(alias => {
      const stored = getPath(customAliasData, alias.key);
      const external = alias.targetPath ? resolveNexusBinding(this.actor, alias.targetPath).value : undefined;
      const sourceValue = alias.targetPath ? external : stored;
      const current = sourceValue && typeof sourceValue === "object"
        ? { ...(stored && typeof stored === "object" ? stored : {}), ...sourceValue }
        : { ...(stored && typeof stored === "object" ? stored : {}), value: sourceValue };
      if (["attribute", "resource"].includes(alias.type)) {
        current.name ??= alias.label;
        current.exibicao ??= alias.label;
      }
      const max = Number(current.max), amount = Number(current.value);
      return {
        ...alias,
        shortKey: alias.key.split(".").at(-1),
        value: current,
        scalarValue: sourceValue && typeof sourceValue === "object" ? "" : sourceValue ?? "",
        percentage: Number.isFinite(max) && max > 0 && Number.isFinite(amount) ? Math.round(amount / max * 100) : 0
      };
    });

    const nativeProperties = getNativePropertyDefinitions(this.actor).map(item => {
      const raw = item.targetPath === "name" ? this.actor.name : getPath(this.actor.system ?? {}, item.targetPath);
      const currentValue = item.type === "resource"
        ? (raw?.value ?? "")
        : item.type === "attribute" && raw && typeof raw === "object"
          ? (raw.value ?? "")
          : raw ?? "";
      return {
        ...item,
        shortKey: item.key.split(".").at(-1),
        currentValue,
        maxValue: item.type === "resource" ? (raw?.max ?? "") : "",
        checkbonus: getPath(customAliasData, `${item.key}.checkbonus`) ?? "",
        roll: getPath(customAliasData, `${item.key}.roll`) ?? ""
      };
    });

    // Normaliza uma cópia do layout ativo para não mutar o snapshot lido do Actor.
    const layout = this._normalizeLayout(clone(layouts[activeId] ?? layouts.principal ?? DEFAULT_LAYOUT));
    this._currentLayout = layout;

    // Índices locais evitam procurar o grupo de cada componente repetidamente.
    // A ordem original dos componentes e a associação ao primeiro grupo são preservadas.
    const groups = layout.groups ?? [];
    const components = layout.components ?? [];
    const groupedIds = new Set();
    const groupByComponentId = new Map();
    const groupIdsByComponentId = new Map();
    const componentLayerById = new Map();

    for (const group of groups) {
      for (const id of new Set(group.componentIds ?? [])) {
        groupedIds.add(id);
        if (!groupByComponentId.has(id)) groupByComponentId.set(id, group);
        let memberships = groupIdsByComponentId.get(id);
        if (!memberships) groupIdsByComponentId.set(id, memberships = []);
        memberships.push(group.id);
      }
    }

    const componentLayer = component => ({
      id: component.id,
      label: component.customLabel || COMPONENTS[component.type]?.label || component.type,
      icon: String(component.layerIcon ?? ""),
      image: isImageSource(component.layerImage) ? component.layerImage : "",
      z: Number(component.z) || 0,
      stackOrder: Number(component.stackOrder) || 0,
      kind: "component",
      hidden: !!component.hidden,
      locked: !!component.locked
    });

    for (const component of components) {
      componentLayerById.set(component.id, componentLayer(component));
    }

    const childrenByGroupId = new Map(groups.map(group => [group.id, []]));
    for (const component of components) {
      const memberships = groupIdsByComponentId.get(component.id);
      if (!memberships) continue;
      for (const groupId of memberships) {
        childrenByGroupId.get(groupId)?.push(component);
      }
    }

    const layers = [
      ...groups.map(group => {
        const children = (childrenByGroupId.get(group.id) ?? [])
          .map(component => ({
            ...componentLayerById.get(component.id),
            hidden: !!component.hidden || !!group.hidden,
            locked: !!component.locked || !!group.locked
          }))
          .sort((a, b) => b.z - a.z || b.stackOrder - a.stackOrder);
        return {
          id: group.id,
          icon: String(group.layerIcon ?? ""),
          image: isImageSource(group.layerImage) ? group.layerImage : "",
          collapsed: !!this._collapsedLayerGroups?.has(group.id),
          label: group.name ?? "Grupo",
          z: children.length ? Math.min(...children.map(child => child.z)) : 0,
          stackOrder: children.length ? Math.min(...children.map(child => child.stackOrder)) : 0,
          kind: "group",
          hidden: !!group.hidden,
          locked: !!group.locked,
          componentIds: group.componentIds,
          children
        };
      }),
      ...components.filter(component => !groupedIds.has(component.id)).map(component => componentLayerById.get(component.id))
    ].sort((a, b) => b.z - a.z || b.stackOrder - a.stackOrder);

    const rendered = components
      .map(component => {
        const group = groupByComponentId.get(component.id);
        return this._componentContext({
          ...component,
          hidden: !!component.hidden || !!group?.hidden,
          locked: !!component.locked || !!group?.locked,
          groupId: group?.id ?? ""
        });
      })
      .filter(Boolean);

    context.nexus = {
      actor: this.actor,
      system: this.actor.system ?? {},
      mode: this._mode ?? "play",
      layout,
      layouts: Object.values(layouts).map(item => ({ ...item, ...this._layoutTabPresentation(item) })),
      components: COMPONENTS,
      layers,
      rendered,
      aliases,
      selectedAlias: aliases.find(alias => alias.id === this._selectedAliasId) ?? aliases[0] ?? null,
      nativeProperties,
      selectedNativeProperty: this._selectedNativePropertyId
        ? (nativeProperties.find(item => item.id === this._selectedNativePropertyId) ?? null)
        : null,
      aliasEditorMode: this._aliasEditorMode ?? "custom",
      isNPC: this.actor.type === "npc"
    };
    return context;
  }

  async _migrateLegacyActorData() {
    if (this._nexusMigrationCompleted) return;
    if (this._nexusMigrationPromise) return this._nexusMigrationPromise;

    this._nexusMigrationPromise = migrateLegacyActorData({
      actor: this.actor,
      readLayouts: () => this._readLayouts(),
      getAliasDefinitions,
      getCustomAliasData,
      normalizeAliasDefinition,
      invalidateAliasDefinitionCache,
      getPath,
      clone,
      setProperty: foundry.utils.setProperty
    });

    try {
      const result = await this._nexusMigrationPromise;
      this._nexusMigrationCompleted = true;
      return !!result?.changed;
    } catch (error) {
      console.warn("NEXUS | Migração de dados legados adiada; a ficha continuará usando os dados legíveis.", error);
      return false;
    } finally {
      this._nexusMigrationPromise = null;
    }
  }

  async _ensureNexusRulesData() {
    if (this._nexusRulesDataReady) return false;
    const system = this.actor.system ?? {};
    const updates = {};
    for (const key of ["for", "des", "sab", "int", "car", "von"]) {
      const value = system.attributes?.[key];
      if (value === undefined || value === null || value === "" || !Number.isFinite(Number(value))) updates["system.attributes." + key] = 0;
    }
    for (const skill of NEXUS_SKILLS) {
      const current = system.skills?.[skill.key];
      const legacy = system.skills?.[skill.legacyKey];
      const hasCanonicalLevel = current?.proficientLevel !== undefined
        && current?.proficientLevel !== null
        && current?.proficientLevel !== "";
      if (!hasCanonicalLevel) {
        const currentLegacyLevel = current?.opposed === true ? -1 : current?.proficiency ?? current?.proficient;
        const legacyLevel = legacy?.opposed === true ? -1 : legacy?.proficientLevel ?? legacy?.proficiency ?? legacy?.proficient;
        const stored = currentLegacyLevel ?? legacyLevel ?? 0;
        updates["system.skills." + skill.key + ".proficientLevel"] = normalizeNexusProficientLevel(stored);
      } else {
        const normalizedLevel = normalizeNexusProficientLevel(current.proficientLevel);
        if (typeof current.proficientLevel !== "number" || current.proficientLevel !== normalizedLevel) {
          updates["system.skills." + skill.key + ".proficientLevel"] = normalizedLevel;
        }
      }
      if (current && Object.hasOwn(current, "proficiency")) {
        updates["system.skills." + skill.key + ".-=proficiency"] = null;
      }
      if (current && Object.hasOwn(current, "proficient")) {
        updates["system.skills." + skill.key + ".-=proficient"] = null;
      }
      if (current && Object.hasOwn(current, "opposed")) {
        updates["system.skills." + skill.key + ".-=opposed"] = null;
      }
      if (legacy) updates["system.skills.-=" + skill.legacyKey] = null;
    }
    try {
      if (Object.keys(updates).length) await this.actor.update(updates);
      this._nexusRulesDataReady = true;
      return Object.keys(updates).length > 0;
    } catch (error) {
      console.warn("NEXUS | Não foi possível inicializar os atributos e perícias do Actor.", error);
      return false;
    }
  }

  _getHeaderControls() {
    const controls = super._getHeaderControls() ?? [];
    controls.push(
      { action: "nexus-default-mode", label: "Padrão", icon: "fa-solid fa-eye", onClick: () => this._setMode("play") },
      { action: "nexus-config-mode", label: "Configuração", icon: "fa-solid fa-wrench", onClick: () => this._setMode("config") },
      { action: "nexus-appearance-mode", label: "Aparência", icon: "fa-solid fa-palette", onClick: () => this._setMode("appearance") }
    );
    return controls;
  }

  _normalizeLayout(layout) {
    layout.width = clamp(Number(layout.width) || 800, 800, 1000);
    layout.height = clamp(Number(layout.height) || 800, 300, 3000);
    layout.gridSize = clamp(Number(layout.gridSize) || 20, 5, 100);
    layout.gridEnabled ??= true; layout.snapEnabled ??= true; layout.guidesEnabled ??= true;
    layout.fontSize ??= 13; layout.secondaryFontSize ??= 11; layout.valueFontSize ??= 20;
    layout.theme ??= "nexus-dark"; layout.fontFamily ??= THEME_TOKENS[layout.theme]?.fontFamily ?? "Inter";
    layout.tabValue = String(layout.tabValue ?? "").slice(0, 2048);
    layout.tabIcon = String(layout.tabIcon ?? "fa-solid fa-star").slice(0, 80);
    layout.tabImage = isImageSource(layout.tabImage) ? String(layout.tabImage).slice(0, 2048) : "";
    Object.assign(layout, this._layoutTabPresentation(layout));
    const palette = THEME_PALETTES[layout.theme] ?? THEME_PALETTES["nexus-dark"];
    for (const [key, value] of Object.entries(palette)) layout[key] ??= value;
    if (!Array.isArray(layout.components)) layout.components = [];
    layout.components = layout.components.filter(component => component && typeof component === "object" && !Array.isArray(component)).map((component, index) => {
      component.id = String(component.id ?? `cmp-legacy-${index + 1}`);
      component.type ??= component.componentType ?? component.kind ?? "";
      return component;
    });
    if (!Array.isArray(layout.groups)) layout.groups = layout.groups && typeof layout.groups === "object" ? Object.values(layout.groups) : [];
    layout.groups = layout.groups
      .filter(group => group && typeof group === "object" && !Array.isArray(group))
      .map((group, index) => ({
        ...group,
        id: String(group.id ?? `grp-legacy-${index + 1}`),
        componentIds: Array.isArray(group.componentIds) ? group.componentIds.filter(id => typeof id === "string") : []
      }));
    if (!Array.isArray(layout.links)) layout.links = layout.links && typeof layout.links === "object" ? Object.values(layout.links) : [];
    layout.links = layout.links.filter(link => link && typeof link.id === "string").map(link => ({ id: link.id, name: String(link.name ?? "Vínculo").slice(0, 48), type: String(link.type ?? "data"), sourcePath: String(link.sourcePath ?? ""), members: [...new Set((Array.isArray(link.members) ? link.members : []).filter(id => typeof id === "string"))] })).filter(link => link.members.length >= 2);
    const migrateTypographyInheritance = layout.typographyInheritanceMigrated !== true;
    layout.components.forEach((c, index) => {
      c.z = Number.isFinite(Number(c.z)) ? Math.max(0, Math.trunc(Number(c.z))) : 0;
      c.stackOrder = Number.isFinite(Number(c.stackOrder)) ? Math.max(0, Math.trunc(Number(c.stackOrder))) : index;
    });
    for (const c of layout.components) {
      const d = COMPONENTS[c.type]; if (!d) continue;
      // Tokens antigos que apontavam para Actor.img passam a consumir a propriedade
      // própria do prototype token; a imagem personalizada continua sendo um override.
      if (c.type === "token" && (!String(c.dataPath ?? "").trim() || c.dataPath === "img")) c.dataPath = "identity.token.img";
      c.w = clamp(Number(c.w) || d.w, 20, layout.width);
      c.h = clamp(Number(c.h) || d.h, 20, layout.height);
      // Sem override salvo, o componente herda a tipografia global do tema.
      // Na primeira leitura, os valores padrão gravados pela 1.28.x viram herança.
      if (migrateTypographyInheritance && Number(c.fontSize) === 13) delete c.fontSize;
      else if (c.fontSize !== undefined) c.fontSize = clamp(Number(c.fontSize) || 13, 7, 32);
      if (migrateTypographyInheritance && c.fontFamily === "Inter") delete c.fontFamily;
      else if (c.fontFamily) c.fontFamily = ["Inter", "Arial", "Georgia", "Verdana", "Trebuchet MS", "monospace"].includes(c.fontFamily) ? c.fontFamily : (layout.fontFamily ?? "Inter");
      if (migrateTypographyInheritance && c.labelPosition === "top-left") delete c.labelPosition;
      else if (c.labelPosition) c.labelPosition = ["top-left", "top-center", "side-left"].includes(c.labelPosition) ? c.labelPosition : "top-left";
    }
    layout.typographyInheritanceMigrated = true;
    for (const c of layout.components) {
      const d = COMPONENTS[c.type]; if (!d) continue;
      c.x = clamp(Number(c.x) || 0, 0, layout.width - c.w);
      c.y = clamp(Number(c.y) || 0, 0, layout.height - c.h);
    }
    const validIds = new Set(layout.components.map(c => c.id));
    const assignedGroupMembers = new Set();
    layout.groups = layout.groups.map(group => {
      const componentIds = [...new Set(group.componentIds ?? [])].filter(id => {
        if (!validIds.has(id) || assignedGroupMembers.has(id)) return false;
        assignedGroupMembers.add(id);
        return true;
      });
      return { ...group, componentIds };
    }).filter(group => group.componentIds.length >= 2);
    for (const group of layout.groups) {
      const members = layout.components.filter(c => group.componentIds.includes(c.id));
      group.z = members.length ? Math.min(...members.map(c => Number(c.z) || 0)) : 0;
    }
    return layout;
  }

  _layoutTabPresentation(layout) {
    const raw = String(layout.tabValue ?? "").trim();
    const legacyMode = layout.tabMode ?? "";
    const candidate = raw || (legacyMode === "icon" ? String(layout.tabIcon ?? "") : legacyMode === "image" ? String(layout.tabImage ?? "") : "");
    const isIcon = /^(fa-[a-z0-9-]+\s*){1,3}$/i.test(candidate) && candidate.includes("fa-");
    const isImage = isImageSource(candidate);
    return {
      tabMode: isIcon ? "icon" : isImage ? "image" : candidate ? "text" : "icon",
      tabIcon: isIcon ? candidate : "fa-solid fa-star",
      tabImage: isImage ? candidate : "",
      tabValue: isIcon || isImage ? "" : (candidate || "")
    };
  }

  _normalizeTextStyle(style = {}) {
    const fontSize = Number(style.fontSize), letterSpacing = Number(style.letterSpacing), lineHeight = Number(style.lineHeight);
    return {
      fontSize: Number.isFinite(fontSize) && fontSize >= 7 && fontSize <= 48 ? fontSize : undefined,
      fontFamily: ["Inter","Arial","Georgia","Verdana","monospace"].includes(style.fontFamily) ? style.fontFamily : undefined,
      color: /^#(?:[0-9a-f]{3}|[0-9a-f]{6}|[0-9a-f]{8})$/i.test(String(style.color ?? "")) ? style.color : undefined,
      textAlign: ["left","center","right","justify"].includes(style.textAlign) ? style.textAlign : undefined,
      fontWeight: ["400","500","600","700","800"].includes(String(style.fontWeight)) ? String(style.fontWeight) : undefined,
      fontStyle: ["normal","italic"].includes(style.fontStyle) ? style.fontStyle : undefined,
      textDecoration: ["none","underline"].includes(style.textDecoration) ? style.textDecoration : undefined,
      textTransform: ["none","uppercase","lowercase","capitalize"].includes(style.textTransform) ? style.textTransform : undefined,
      letterSpacing: Number.isFinite(letterSpacing) && letterSpacing >= -2 && letterSpacing <= 12 ? letterSpacing : undefined,
      lineHeight: Number.isFinite(lineHeight) && lineHeight >= 0.8 && lineHeight <= 2.4 ? lineHeight : undefined
    };
  }
  _componentContext(component) {
    const def = COMPONENTS[component.type]; if (!def) return null;
    if (def.kind === "custom") {
      const binding = component.dataPath ? resolveNexusBinding(this.actor, component.dataPath) : null;
      const hasBoundValue = binding?.value !== undefined && binding?.value !== null && typeof binding.value !== "object";
      const headingLabel = String(component.customLabel ?? "").trim();
      return {
        ...component,
        hasClickInteraction: getTriggeredActions(component, "click", { actor: this.actor }).length > 0,
        actionType: ["roll", "proficiency"].includes(component.actionType) ? component.actionType : "",
        proficiencyLevel: clamp(Number(component.actionPath ? resolveNexusBinding(this.actor, component.actionPath).value : component.proficiencyLevel) || 0, 0, 3),
        proficiencyStages: (component.proficiencyLabels ?? ["Nível 0", "Nível 1", "Nível 2", "Nível 3"]).slice(0, 4).map((label, level) => ({ level, label: String(label || ("Nível " + level)), active: level === clamp(Number(component.actionPath ? resolveNexusBinding(this.actor, component.actionPath).value : component.proficiencyLevel) || 0, 0, 3) })),
        contentStyle: this._normalizeTextStyle(component.contentStyle), headingStyle: this._normalizeTextStyle(component.headingStyle),
        z: Number(component.z) || 0,
        renderZ: (Number(component.z) || 0) * 100000 + (Number(component.stackOrder) || 0) + 1,
        label: headingLabel,
        headingLabel,
        showCardHeading: !!headingLabel && component.showLabel !== false,
        fontSize: clamp(Number(component.fontSize ?? this._currentLayout?.fontSize ?? 13) || 13, 7, 48),
        fontFamily: component.fontFamily || this._currentLayout?.fontFamily || "Inter",
        labelPosition: component.labelPosition || "top-left",
        kind: "custom",
        path: binding?.path ?? "",
        value: hasBoundValue ? binding.value : (component.text ?? ""),
        hasContent: hasBoundValue || String(component.text ?? "").length > 0
      };
    }
    const resourcePaths = { pv: "resources.pv", pm: "resources.pm", pe: "resources.pe" };
    const resourceCode = ({ pv: "PV", "pv-bar": "PV", "pv-ring": "PV", pm: "PM", "pm-bar": "PM", pe: "PE", "pe-bar": "PE" })[component.type] ?? String(component.sheetCode ?? component.sheetContent1 ?? "").toUpperCase();
    const resourceColor = ({ PV: "#d94b4b", PM: "#3979d8", PE: "#39a86b" })[resourceCode] ?? "";
    const customPath = String(component.customBinding ?? "").replace(/^system\./, "");
    const safeCustomPath = /^[a-zA-Z0-9_-]+(?:\.[a-zA-Z0-9_-]+)*$/.test(customPath) ? customPath : "";
    const genericRaw = String(component?.dataPath ?? "").trim();
    const genericBinding = resolveNexusBinding(this.actor, genericRaw);
    const genericPath = genericBinding.path;
    const aliasResolution = resolveAliasPath(this.actor, genericPath);
    const safeDataPath = (aliasResolution.alias ? genericPath : genericPath && /^[a-zA-Z0-9_-]+(?:\.[a-zA-Z0-9_-]+)*$/.test(genericPath)) ? genericPath : "";
    const bindingPath = component.type === "resource-meter" ? (component.binding === "custom" ? safeCustomPath : (resourcePaths[component.binding] ?? "")) : (Object.hasOwn(component, "dataPath") ? safeDataPath : (def.path || ""));
    const sheetResource = component.type === "sheet-resource";
    const safeResourcePath = path => {
      const value = String(path || "").replace(/^system\./, "");
      return /^[a-zA-Z0-9_-]+(?:\.[a-zA-Z0-9_-]+)*$/.test(value) && !value.split(".").some(part => ["__proto__", "prototype", "constructor"].includes(part)) ? value : "";
    };
    const currentResourcePath = sheetResource ? safeResourcePath(component.currentPath ?? (String(component.sheetCode).toUpperCase() === "REC" ? "" : "resources.pv.value")) : "";
    const maximumResourcePath = sheetResource ? safeResourcePath(component.maxPath ?? (String(component.sheetCode).toUpperCase() === "REC" ? "" : "resources.pv.max")) : "";
    const raw = sheetResource
      ? resolveNexusBinding(this.actor, currentResourcePath).value
      : (def.path === "name" || bindingPath === "name") ? this.actor.name : def.kind === "token" ? getTokenImageSource(this.actor, component, bindingPath ? resolveNexusBinding(this.actor, bindingPath).value : "") : bindingPath ? resolveNexusBinding(this.actor, bindingPath).value ?? getPath(this.actor.system, bindingPath) : def.kind === "asset-image" ? this.actor.img : null;
    const value = sheetResource ? raw : bindingPath === "combat.mb" ? getNexusBaseModifier(this.actor) : (raw && typeof raw === "object" && "value" in raw ? raw.value : raw);
    const max = sheetResource
      ? resolveNexusBinding(this.actor, maximumResourcePath).value
      : (raw && typeof raw === "object" && "max" in raw ? raw.max : (bindingPath ? resolveNexusBinding(this.actor, `${bindingPath}.max`).value : null));
    const numericMax = Number(max) || 0;
    const percent = numericMax > 0 ? clamp((Number(value) || 0) / numericMax * 100, 0, 100) : 0;
    const componentVariant = def.variant ?? component.sheetVariant ?? "";
    const headingLabel = ["level", "attribute"].includes(componentVariant) ? (component.customLabel ?? component.text ?? def.label) : (component.customLabel ?? "");
    const actionType = ["roll", "proficiency", "toggle-component"].includes(component.actionType) ? component.actionType : (component.actionType === "resource-slider" && (sheetResource || ["resource", "resource-bar", "resource-ring", "resource-meter", "asset-meter"].includes(def.kind)) ? "resource-slider" : "");
    const proficiencyBinding = component.actionPath ? resolveNexusBinding(this.actor, component.actionPath).value : undefined;
    const proficiencyLevel = clamp(Number(proficiencyBinding ?? component.proficiencyLevel) || 0, 0, 3);
    const proficiencyLabels = (Array.isArray(component.proficiencyLabels) ? component.proficiencyLabels : ["Nível 0", "Nível 1", "Nível 2", "Nível 3"]).slice(0, 4);
    while (proficiencyLabels.length < 4) proficiencyLabels.push("Nível " + proficiencyLabels.length);
    const isResourceComponent = sheetResource || ["resource", "resource-bar", "resource-ring", "resource-meter", "asset-meter"].includes(def.kind);
    const sliderPath = sheetResource ? currentResourcePath : (bindingPath ? (bindingPath.endsWith(".value") ? bindingPath : bindingPath + ".value") : "");
    const safeSliderPath = safeResourcePath(sliderPath);
    const showResourceSlider = actionType === "resource-slider" && isResourceComponent && !!safeSliderPath && numericMax > 0;
    return { ...component, hasClickInteraction: getTriggeredActions(component, "click").length > 0, actionType, proficiencyLevel, proficiencyStages: proficiencyLabels.map((label, level) => ({ level, label: String(label || ("Nível " + level)), active: level === proficiencyLevel })), actionPath: component.actionPath ?? "", contentStyle: this._normalizeTextStyle(component.contentStyle), headingStyle: this._normalizeTextStyle(component.headingStyle), sliderPath: safeSliderPath, showResourceSlider, imageFit: ["contain","cover"].includes(component.imageFit) ? component.imageFit : "contain", imagePosition: ["center","top","bottom","left","right"].includes(component.imagePosition) ? component.imagePosition : "center", imageOpacity: Number.isFinite(Number(component.imageOpacity ?? 100)) ? clamp(Number(component.imageOpacity ?? 100), 0, 100) : 100, hasBorderRadius: component.borderRadius !== undefined && component.borderRadius !== null, hasOpacity: component.opacity !== undefined && component.opacity !== null, safeLink: isSafeLink(value) ? String(value).trim() : "", headingLabel, showCardHeading: !!headingLabel && component.showLabel !== false && !["token", "sheet-resource", "asset-text", "asset-notes", "asset-image", "asset-link"].includes(component.type), fontSize: clamp(Number(component.fontSize ?? this._currentLayout?.fontSize ?? 13) || 13, 7, 48), fontFamily: component.fontFamily || this._currentLayout?.fontFamily || "Inter", labelPosition: component.labelPosition || "top-left", resourcePercent: percent, resourceColor, path: sheetResource ? currentResourcePath : bindingPath, z: Number(component.z) || 0, renderZ: (Number(component.z) || 0) * 100000 + (Number(component.stackOrder) || 0) + 1, label: component.customLabel ?? (component.type === "resource-meter" ? (component.resourceLabel || "Medidor") : def.label), kind: def.kind, format: component.format ?? "bar", value: value ?? (def.variant === "attribute" ? 0 : ""), max: max ?? "", percent, rows: clamp(Number(component.rows) || 3, 1, 20), columns: clamp(Number(component.columns) || 3, 1, 12), tableCells: component.type === "asset-table" ? Array.from({ length: clamp(Number(component.rows) || 3, 1, 20) * clamp(Number(component.columns) || 3, 1, 12) }, (_, index) => ({ index, value: component.cells?.[index] ?? "" })) : [], text: component.customLabel ?? component.text ?? def.label, path: sheetResource ? currentResourcePath : bindingPath, group: def.group, namespace: def.namespace, sheetVariant: def.variant ?? component.sheetVariant ?? "", skillRows: def.variant === "skill-group" ? getNexusSkillRows(this.actor) : [], sheetHint: component.sheetHint ?? "Configure o conteúdo no editor", sheetCode: component.sheetCode ?? "", sheetLabel: component.sheetLabel ?? component.sheetCode ?? "", sheetIcon: component.sheetIcon ?? "", sheetContent1: component.sheetContent1 ?? component.sheetLabel ?? component.sheetCode ?? "PV", sheetContent2: component.sheetContent2 ?? component.sheetIcon ?? ({ PV: "❤️", PM: "💧", PE: "⚡" })[String(component.sheetCode ?? component.sheetContent1 ?? "PV").toUpperCase()] ?? "✦", updateSource: component.updateSource !== false, showLabel: component.showLabel !== false, sheetContent1IsImage: isImageSource(component.sheetContent1), sheetContent2IsImage: isImageSource(component.sheetContent2), sheetColor: component.sheetColor ?? ({ PV: "#d94b4b", PM: "#3979d8", PE: "#39a86b" })[String(component.sheetCode ?? component.sheetContent1 ?? "PV").toUpperCase()] ?? "#d94b4b", sheetTrackColor: component.sheetTrackColor ?? "#080d14", sheetOrientation: component.sheetOrientation === "vertical" ? "vertical" : "horizontal", tokenImage: String(component.tokenImage ?? ""), tokenImageVideo: isVideoSource(getTokenImageSource(this.actor, component, bindingPath ? resolveNexusBinding(this.actor, bindingPath).value : "")), tokenFrameSource: component.tokenFrameSource ?? "", tokenFrameVideo: isVideoSource(component.tokenFrameSource), tokenFrameMode: component.tokenFrameMode === "media" ? "media" : "solid", tokenFrameColor: component.tokenFrameColor ?? "#78b7e8", tokenFrameWidth: clamp(Number(component.tokenFrameWidth ?? 3), 0, 16), tokenShape: component.tokenShape ?? "circle", tokenOverlay: component.tokenOverlay ?? "", tokenBackgroundColor: component.tokenBackgroundColor ?? "#202e3e", previewCurrent: Number(component.previewCurrent ?? 32), previewMax: Number(component.previewMax ?? 40), previewPercent: clamp(Number(component.previewCurrent ?? 32) / Math.max(1, Number(component.previewMax ?? 40)) * 100, 0, 100) };
  }

  async _onRender(context, options) {
    await super._onRender(context, options);
    const migrated = await this._migrateLegacyActorData();
    if (migrated) {
      // The first render was prepared from the legacy snapshot. Refresh once
      // after migration so moved alias values appear without requiring a reopen.
      queueMicrotask(() => this.render({ force: true }));
      return;
    }
    const rulesDataMigrated = await this._ensureNexusRulesData();
    if (rulesDataMigrated) {
      queueMicrotask(() => this.render({ force: true }));
      return;
    }
    const form = this.element?.querySelector?.(".nexus-sheet") ?? this.element;
    if (!form) return;
    const appWindow = form.closest(".application, .window-app");
    appWindow?.classList.add("nexus-window");
    this.activateListeners($(form));
    this._bindComponentQuickEdit(form);
    if (this._pendingAliasScrollTop !== undefined) {
      const top = this._pendingAliasScrollTop; this._pendingAliasScrollTop = undefined;
      requestAnimationFrame(() => { const panel = document.querySelector(`[data-tool-panel="aliases"]`) ?? this.element?.querySelector?.('[data-tool-panel="aliases"]'); if (panel && !panel.hidden) panel.scrollTop = top; });
    }
    this._renderRichMedia(form);
  }

  _renderRichMedia(root) {
    return renderActorSheetRichMedia(this, root, { resolveNexusBinding, isMediaSource, COMPONENTS });
  }

  _renderAdaptiveContent(root, createMedia) {
    return renderActorSheetAdaptiveContent(this, root, createMedia, { resolveNexusBinding, isMediaSource, COMPONENTS });
  }

  _bindComponentQuickEdit(root) {
    if (root.dataset.nexusComponentQuickEditBound) return;
    root.dataset.nexusComponentQuickEditBound = "true";
    root.addEventListener("dblclick", event => {
      const component = event.target.closest(".nexus-component");
      if (!component || event.target.closest("input,textarea,select,button,a")) return;
      event.preventDefault(); event.stopPropagation();
      const id = component.dataset.id;
      if (this._mode === "play" && getTriggeredActions(this._currentLayout?.components?.find(item => item.id === id), "doubleClick", { actor: this.actor }).length) {
        this._runComponentAction(id, "doubleClick");
        return;
      }
      this._setSelection($(root), [id]);
      const portal = document.querySelector(`[data-nexus-floating-for="${this.id}"]`);
      portal?.querySelector('[data-floating-panel="component"]')?.click();
    });
  }

  activateListeners(html) {
    return activateActorSheetListeners(this, html, { NEXUS_LIBRARY_CATALOG, DEFAULT_LAYOUT, THEME_TOKENS, THEME_PALETTES, applyThemeTokens, NexusPanelWindow, buildPropertyPickerCatalog, renderPropertyPicker, migrateLegacyActorData, mergeLayoutSnapshots, NEXUS_SKILLS, getNexusBaseModifier, getNexusSkillRows, getNexusSkillModifier, executeTriggeredActions, getTriggeredActions, renderInteractionEditor, applyInteractionEditorChange, applyInteractionEditorCommand, getInteractionLibrary, saveInteractionToLibrary, getComponentInteractions, layoutReadSnapshots, layoutWriteQueues, ActorSheetV2, HandlebarsApplicationMixin, NexusActorSheetBase, COMPONENTS, resolveNexusBinding, expandNexusPropertyExpressions, getResourceValuePaths, clone, getPath, collectPropertyPaths, NATIVE_PROPERTY_BASE, nativePropertyDefinitionCache, EMPTY_NATIVE_PROPERTY_LIST, LEGACY_SKILL_PATHS, invalidateNativePropertyCache, getNativePropertyDefinitions, replaceLayoutBindingPaths, EMPTY_ALIAS_LIST, aliasDefinitionCache, invalidateAliasDefinitionCache, getAliasDefinitions, getCustomAliasData, normalizeAliasDefinition, safeAliasKey, evaluateAliasExpression, getNexusRollAliasEntries, expandNexusRollAliases, getNexusRollData, resolveAliasPath, clamp, DEFAULT_FOUNDRY_TOKEN_IMAGE, IMAGE_EXTENSIONS, AUDIO_EXTENSIONS, VIDEO_EXTENSIONS, MEDIA_EXTENSION_PATTERN, VIDEO_EXTENSION_PATTERN, isMediaSource, isVideoSource, isAudioSource, isImageSource, isUsableTokenSource, getFoundryDefaultTokenImage, getTokenImageSource, isSafeLink, setPreviewContent, createSheetResourcePreview, fitSheetResourcePreview, updateSheetResourcePreview, NexusActorSheet });
  }

  async _setMode(mode) { this._mode = mode; this.render({ force: true }); }

  _refreshBoundComponents() {
    const root = this.element?.querySelector?.(".nexus-sheet") ?? this.element;
    if (!root) return;
    const writeText = (card, selector, value) => {
      const element = card.querySelector(selector);
      if (element && element !== document.activeElement) element.textContent = String(value ?? "—");
    };
    const writeInput = (card, selector, value) => {
      const element = card.querySelector(selector);
      if (element && element !== document.activeElement) element.value = String(value ?? "");
    };
    // Uma única leitura do DOM substitui uma busca por componente.
    const cardsById = new Map();
    root.querySelectorAll(".nexus-component[data-id]").forEach(card => {
      if (!cardsById.has(card.dataset.id)) cardsById.set(card.dataset.id, card);
    });
    for (const component of this._currentLayout?.components ?? []) {
      const card = cardsById.get(component.id);
      if (!card) continue;
      const context = this._componentContext(component);
      if (!context) continue;
      const current = context.value ?? "—", maximum = context.max ?? "—";
      if (["resource", "resource-bar", "resource-ring", "resource-meter", "asset-meter"].includes(context.kind)) {
        const fill = card.querySelector(".nexus-resource-bar-fill, .nexus-asset-meter-fill");
        if (fill) fill.style.width = `${context.percent ?? 0}%`;
        const ring = card.querySelector(".nexus-resource-ring");
        if (ring) ring.style.setProperty("--nexus-resource-percent", `${context.percent ?? 0}%`);
        writeText(card, ".nexus-resource-values > strong:first-child, .nexus-resource-ring-values > strong:first-child", current);
        writeText(card, ".nexus-resource-values > strong:last-child, .nexus-resource-ring-values > strong:last-child", maximum);
        writeText(card, ".nexus-resource-bar-values > strong", current);
        writeText(card, ".nexus-resource-bar-values > span", `/ ${maximum}`);
        writeInput(card, ".nexus-resource-values input:first-of-type, .nexus-resource-ring-values input:first-of-type", current);
        writeInput(card, ".nexus-resource-values input:last-of-type, .nexus-resource-ring-values input:last-of-type", maximum);
        writeInput(card, ".nexus-resource-bar-values input:first-of-type", current);
        writeInput(card, ".nexus-resource-bar-values input:last-of-type", maximum);
        writeInput(card, "[data-resource-slider]", current);
      }
      if (context.kind === "sheet-element" && context.sheetVariant === "resource") {
        const preview = card.querySelector(".nexus-sheet-resource-preview");
        updateSheetResourcePreview(preview, {
          label: component.sheetContent1 ?? "PV", icon: component.sheetContent2 ?? "❤️",
          current, max: maximum, color: component.sheetColor ?? "#d94b4b",
          trackColor: component.sheetTrackColor ?? "#080d14", orientation: component.sheetOrientation ?? "horizontal"
        });
        const values = card.querySelector(".nexus-sheet-resource-values");
        if (values?.querySelector("input")) {
          writeInput(values, "input:first-of-type", current);
          writeInput(values, "input:last-of-type", maximum);
        } else if (values) values.textContent = `${current} / ${maximum}`;
      } else if (context.kind === "sheet-element" && context.sheetVariant === "attribute") {
        writeText(card, ".nexus-sheet-element small", component.text ?? "Atributo");
        writeText(card, ".nexus-sheet-element strong", current);
      } else if (context.kind === "sheet-element" && context.sheetVariant === "derived") {
        writeText(card, ".nexus-sheet-element small", component.sheetCode ?? "");
        writeText(card, ".nexus-sheet-element strong", current);
      } else if (context.kind === "sheet-element" && context.sheetVariant === "skill") {
        writeText(card, ".nexus-sheet-element strong", component.text ?? "");
        writeText(card, ".nexus-sheet-element b", current);
      } else if (context.kind === "asset-value") writeText(card, ".nexus-asset-value", current);
      else if (context.kind === "asset-text") writeText(card, ".nexus-asset-text", context.path ? current : component.text);
      else if (context.kind === "custom") writeText(card, ".nexus-custom-card-value", current);
      else if (["number", "name", "text"].includes(context.kind)) writeText(card, ".nexus-component-content strong", current);
      if (context.kind === "sheet-element" && !["resource", "attribute", "derived", "skill"].includes(context.sheetVariant)) {
        writeText(card, ".nexus-sheet-element strong", current);
      }
      if (context.actionType === "proficiency") {
         card.querySelectorAll("[data-proficiency-level]").forEach(button => { const active = Number(button.dataset.proficiencyLevel) === context.proficiencyLevel; button.classList.toggle("is-active", active); button.setAttribute("aria-pressed", String(active)); });
       }
       if (context.kind === "token" && isMediaSource(current)) {
        const image = card.querySelector(".nexus-token-portrait");
        if (image && image !== document.activeElement && image.getAttribute("src") !== current) image.src = current;
      }
      if (context.kind === "asset-image" && isMediaSource(current)) {
        const image = card.querySelector(".nexus-asset-image");
        if (image && image !== document.activeElement && image.src !== current) image.src = current;
      }
    }
  }

  async _updateSystemValue(input) {
    const path = input.dataset.systemPath, value = ["number", "range"].includes(input.type) ? Number(input.value) : input.value;
    if (!path) return;
    if (path === "name") { await this.actor.update({ name: value }); this._refreshBoundComponents(); return; }
    if (path === "img") { await this.actor.update({ img: value });
      const roots = [this.element, this._nexusPanelWindows?.get("component")?.panel].filter(Boolean);
      for (const root of roots) root.querySelectorAll?.("[data-actor-portrait-preview]").forEach(image => { image.src = String(value ?? ""); });
      this._refreshBoundComponents(); return; }
    const alias = resolveAliasPath(this.actor, path);
    if (alias.alias && !alias.path) {
      const customData = clone(getCustomAliasData(this.actor));
      foundry.utils.setProperty(customData, [alias.alias.key, alias.suffix === "exib" ? "exibicao" : alias.suffix].filter(Boolean).join("."), value);
      await this.actor.setFlag("nexus", "customData", customData);
      this._refreshBoundComponents();
      return;
    }
    const writePath = alias.alias ? alias.path : path;
    if (writePath === "img") return this.actor.update({ img: value });
    await this.actor.update({ [`system.${writePath}`]: value });
    this._refreshBoundComponents();

  }
  _syncTextToolbar(inspector, component) {
    if (!inspector) return;
    const target = this._textStyleTarget === "heading" ? "heading" : "content";
    const style = component?.[target + "Style"] ?? {};
    inspector.querySelectorAll("[data-text-style-target]").forEach(button => button.classList.toggle("active", button.dataset.textStyleTarget === target));
    const commands = inspector.querySelectorAll("[data-text-style-command]");
    for (const button of commands) {
      const command = button.dataset.textStyleCommand;
      let active = false;
      if (command === "bold") active = Number(style.fontWeight ?? (target === "heading" ? component?.headingFontWeight : component?.fontWeight) ?? 400) >= 600;
      else if (command === "italic") active = (style.fontStyle ?? component?.fontStyle) === "italic";
      else if (command === "underline") active = (style.textDecoration ?? "none") === "underline";
      else if (command.startsWith("align-")) active = (style.textAlign ?? "left") === command.slice(6);
      else if (command === "transform") active = (style.textTransform ?? "none") !== "none";
      button.setAttribute("aria-pressed", String(active));
      button.classList.toggle("is-active", active);
    }
    const size = inspector.querySelector("[data-text-style-size]");
    if (size) size.value = style.fontSize ?? (target === "heading" ? component?.headingFontSize : component?.fontSize) ?? this._currentLayout?.fontSize ?? 13;
    const color = inspector.querySelector("[data-text-style-color]");
    if (color) color.value = style.color ?? "#e7edf5";
    for (const field of inspector.querySelectorAll("[data-text-style-field]")) field.value = style[field.dataset.textStyleField] ?? (field.dataset.textStyleField === "lineHeight" ? 1.35 : 0);
    inspector.querySelector("[data-text-style-font-menu]")?.setAttribute("hidden", "");
  }

  _applyComponentTextStyles(node, component) {
    if (!node || !component) return;
    const apply = (element, style, fallback = {}) => {
      if (!element) return;
      const values = {
        "font-size": style.fontSize ?? fallback.fontSize,
        "font-family": style.fontFamily ?? fallback.fontFamily,
        color: style.color,
        "text-align": style.textAlign,
        "font-weight": style.fontWeight,
        "font-style": style.fontStyle,
        "text-decoration": style.textDecoration,
        "text-transform": style.textTransform,
        "letter-spacing": style.letterSpacing,
        "line-height": style.lineHeight
      };
      for (const [property, value] of Object.entries(values)) element.style.setProperty(property, value === undefined || value === null || value === "" ? "" : (property === "font-size" || property === "letter-spacing" ? value + "px" : String(value)));
    };
    const content = node.querySelector(".nexus-component-content");
    const contentStyle = this._normalizeTextStyle(component.contentStyle);
    apply(content, contentStyle, { fontSize: component.fontSize, fontFamily: component.fontFamily });
    content?.querySelectorAll(".nexus-asset-text,.nexus-asset-value,.nexus-resource-values,.nexus-resource-bar-values,.nexus-resource-ring-values,.nexus-sheet-element,.nexus-custom-card-value,.nexus-skill-table-heading").forEach(element => apply(element, contentStyle));
    apply(node.querySelector(".nexus-component-heading"), this._normalizeTextStyle(component.headingStyle), { fontSize: component.headingFontSize, fontFamily: component.headingFontFamily });
  }

  async _setComponentTextStyle(componentId, target, key, value) {
    if (!["content", "heading"].includes(target)) return;
    const allowed = ["fontSize","fontFamily","color","textAlign","fontWeight","fontStyle","textDecoration","textTransform","letterSpacing","lineHeight"];
    if (!allowed.includes(key)) return;
    const layouts = await this._readLayouts(), active = this._activeLayoutId(), layout = layouts[active];
    const component = layout?.components?.find(item => item.id === componentId);
    if (!component) return;
    let normalized = value;
    if (key === "fontSize") normalized = clamp(Number(value) || 13, 7, 48);
    if (key === "fontFamily" && !["Inter","Arial","Georgia","Verdana","monospace"].includes(value)) return;
    if (key === "color" && !/^#(?:[0-9a-f]{3}|[0-9a-f]{6}|[0-9a-f]{8})$/i.test(String(value))) return;
    if (key === "textAlign" && !["left","center","right","justify"].includes(value)) return;
    if (key === "fontWeight" && !["400","500","600","700","800"].includes(String(value))) return;
    if (key === "fontStyle" && !["normal","italic"].includes(value)) return;
    if (key === "textDecoration" && !["none","underline"].includes(value)) return;
    if (key === "textTransform" && !["none","uppercase","lowercase","capitalize"].includes(value)) return;
    if (key === "letterSpacing") normalized = clamp(Number(value) || 0, -2, 12);
    if (key === "lineHeight") normalized = clamp(Number(value) || 1.35, 0.8, 2.4);
    this._captureHistory();
    component[target + "Style"] ??= {};
    component[target + "Style"][key] = normalized;
    this._currentLayout = layout;
    await this._writeLayouts(layouts, active);
    const node = this.element?.querySelector?.(".nexus-component[data-id=\"" + CSS.escape(componentId) + "\"]");
    this._applyComponentTextStyles(node, component);
    const inspector = this._nexusPanelWindows?.get("component")?.panel?.querySelector?.(".nexus-component-inspector") ?? this.element?.querySelector?.(".nexus-component-inspector");
    this._syncTextToolbar(inspector, component);
  }

  async _setProficiencyLevel(componentId, level) {
    const nextLevel = clamp(Math.round(Number(level) || 0), 0, 3);
    const layouts = await this._readLayouts(), active = this._activeLayoutId(), component = layouts[active]?.components?.find(item => item.id === componentId);
    if (!component || component.actionType !== "proficiency") return;
    if (component.actionPath) {
      const binding = resolveNexusBinding(this.actor, component.actionPath);
      if (binding.value !== undefined && binding.value !== null && !Number.isFinite(Number(binding.value))) { ui.notifications?.warn?.("A propriedade vinculada ao marcador precisa conter um número."); return; }
    }
    this._captureHistory();
    component.proficiencyLevel = nextLevel;
    await this._writeLayouts(layouts, active);
    if (component.actionPath) await this._updateSystemValue({ dataset: { systemPath: component.actionPath }, type: "number", value: String(nextLevel) });
    else {
      const card = this.element?.querySelector?.(".nexus-component[data-id=\"" + CSS.escape(componentId) + "\"]");
      card?.querySelectorAll("[data-proficiency-level]").forEach(button => { const active = Number(button.dataset.proficiencyLevel) === nextLevel; button.classList.toggle("is-active", active); button.setAttribute("aria-pressed", String(active)); });
    }
  }
  async _rollSkill(skillKey) {
    const result = getNexusSkillModifier(this.actor, skillKey);
    if (!result) return;
    const { skill, proficientLevel, modifier, baseModifier } = result;
    const formula = modifier < 0 ? "1d20 - " + Math.abs(modifier) : "1d20 + " + modifier;
    try {
      const roll = new Roll(formula);
      await roll.evaluate({ async: true });
      await roll.toMessage({
        speaker: ChatMessage.getSpeaker({ actor: this.actor }),
        flavor: skill.name + " (" + skill.attribute + ") · " + (proficientLevel > 0 ? "Proficiente · MB +" + baseModifier : proficientLevel < 0 ? "Proficiência negativa · MB -" + baseModifier : "Sem proficiência") + " · Proficiência " + (proficientLevel > 0 ? "+" : "") + proficientLevel + " · Modificador " + (modifier >= 0 ? "+" : "") + modifier
      });
    } catch (error) {
      console.error("NEXUS | Falha ao rolar perícia", error);
      globalThis.ui?.notifications?.error?.("Não foi possível realizar o teste de " + skill.name + ".");
    }
  }

  async _setSkillProficientLevel(skillKey, rawLevel) {
    if (!NEXUS_SKILLS.some(skill => skill.key === skillKey)) return;
    const level = normalizeNexusProficientLevel(rawLevel);
    await this.actor.update({ ["system.skills." + skillKey + ".proficientLevel"]: level });
    await this.render({ force: true });
  }

  async _toggleTargetComponent(componentId, config = {}) {
    const layouts = await this._readLayouts();
    const active = this._activeLayoutId();
    const source = layouts[active]?.components?.find(item => item.id === componentId);
    const targetId = String(config.targetId ?? source?.actionTargetId ?? "");
    const target = layouts[active]?.components?.find(item => item.id === targetId);
    if (!source || (source.actionType !== "toggle-component" && !config.targetId) || !target || target.id === source.id) {
      globalThis.ui?.notifications?.warn?.("Configure um card de destino válido nas propriedades de interação.");
      return;
    }
    this._captureHistory();
    target.hidden = !target.hidden;
    await this._writeLayouts(layouts, active);
    await this.render({ force: true });
  }

  _runComponentAction(componentId, eventName = "click", context = {}) {
    const component = this._currentLayout?.components?.find(item => item.id === componentId);
    if (!component || this._mode !== "play") return;
    const depth = Number(context.depth) || 0;
    if (depth > 8) { ui.notifications?.warn?.("O limite de encadeamento de interações foi atingido."); return; }
    return executeTriggeredActions(component, eventName, action => this._executeComponentAction(componentId, action, { ...context, depth }), { actor: this.actor, ...context }).catch(error => { console.error("NEXUS | Falha ao executar interação", error); ui.notifications?.error?.("Falha ao executar a interação do componente."); return []; });
  }

  async _executeComponentAction(componentId, action, context = {}) {
    const config = action?.config ?? {};
    if (action?.type === "roll") return this._rollComponent(componentId, config);
    if (action?.type === "toggle") return this._toggleTargetComponent(componentId, config);
    if (action?.type === "update") {
      const path = String(config.path ?? "").replace(/^system\\./, "");
      if (!/^[a-zA-Z0-9_-]+(?:\\.[a-zA-Z0-9_-]+)*$/.test(path) || path.split(".").some(part => ["__proto__", "prototype", "constructor"].includes(part))) throw new Error("Propriedade de destino inválida.");
      const current = foundry.utils.getProperty(this.actor.system, path), raw = String(config.value ?? "");
      const value = config.operation === "add" || config.operation === "subtract"
        ? Number(current ?? 0) + (config.operation === "subtract" ? -1 : 1) * Number(raw)
        : (raw.trim() !== "" && Number.isFinite(Number(raw)) ? Number(raw) : raw);
      if (typeof value === "number" && !Number.isFinite(value)) throw new Error("Valor numérico inválido.");
      return this.actor.update({ [`system.${path}`]: value });
    }
    if (action?.type === "calculate") {
      const formula = String(config.formula ?? "").trim();
      if (!formula || formula.length > 500) throw new Error("Fórmula de cálculo inválida.");
      const roll = new Roll(expandNexusRollAliases(this.actor, expandNexusPropertyExpressions(formula)), getNexusRollData(this.actor));
      await roll.evaluate({ async: true });
      const target = String(config.targetPath ?? "").replace(/^system\\./, "");
      if (target) {
        if (!/^[a-zA-Z0-9_-]+(?:\\.[a-zA-Z0-9_-]+)*$/.test(target) || target.split(".").some(part => ["__proto__", "prototype", "constructor"].includes(part))) throw new Error("Propriedade de destino inválida.");
        await this.actor.update({ [`system.${target}`]: roll.total });
      }
      return roll.total;
    }
    if (action?.type === "open") {
      if (config.uuid) { const document = await fromUuid(String(config.uuid)); if (document?.sheet) return document.sheet.render(true); }
      if (config.targetId) {
        this._setSelection($(this.element), [String(config.targetId)]);
        document.querySelector(`[data-nexus-floating-for="${this.id}"] [data-floating-panel="component"]`)?.click();
      }
      return;
    }
    if (action?.type === "interact") {
      const targetId = String(config.targetId ?? "");
      if (targetId) return this._runComponentAction(targetId, String(config.event ?? "interact"), { depth: (context.depth ?? 0) + 1, sourceComponentId: componentId });
    }
    if (action?.type === "execute") {
      if (config.operation === "refresh-sheet") return this.render({ force: true });
      if (config.operation === "notify") { const message = String(config.message ?? "").slice(0, 300); if (message) ui.notifications?.info?.(message); }
    }
  }

  async _rollComponent(componentId, config = {}) {
    const layouts = await this._readLayouts();
    const active = this._activeLayoutId();
    const component = layouts[active]?.components?.find(item => item.id === componentId);
    if (!component || (component.actionType !== "roll" && config.mode !== "skill" && !config.formula && !String(component.dataPath ?? "").endsWith(".name"))) return;
    if (config.mode === "skill") return this._rollSkill(String(config.skillKey ?? "athletics"));

    let formula = String(config.formula ?? component.rollFormula ?? "").trim();
    const boundPath = String(component.dataPath ?? "").replace(/^actor\./, "").replace(/^system\./, "");
    if (!formula && boundPath.endsWith(".name")) {
      const sibling = resolveNexusBinding(this.actor, boundPath.slice(0, -5) + ".roll");
      formula = String(sibling.value ?? "").trim();
    }
    if (!formula) {
      globalThis.ui?.notifications?.warn?.("Configure uma fórmula de rolagem no componente ou na propriedade vinculada.");
      return;
    }
    if (formula.length > 500) {
      globalThis.ui?.notifications?.warn?.("A fórmula de rolagem excede o limite de 500 caracteres.");
      return;
    }
    try {
      formula = expandNexusRollAliases(this.actor, expandNexusPropertyExpressions(formula));
      const roll = new Roll(formula, getNexusRollData(this.actor));
      await roll.evaluate({ async: true });
      await roll.toMessage({
        speaker: ChatMessage.getSpeaker({ actor: this.actor }),
        flavor: component.customLabel || component.text || "Rolagem NEXUS"
      });
    } catch (error) {
      console.error("NEXUS | Falha na rolagem do componente", error);
      globalThis.ui?.notifications?.error?.("Não foi possível executar a rolagem. Verifique a fórmula configurada.");
    }
  }
  async _syncActorPortraitFromToken(componentId) {
    const component = (this._currentLayout?.components ?? []).find(item => item.id === componentId);
    if (!component || component.type !== "token") return;
    const raw = String(component.tokenImage ?? "").trim();
    const binding = raw.match(/^\{\{\s*([^{}]+?)\s*\}\}$/);
    const customImage = binding ? String(resolveNexusBinding(this.actor, binding[1]).value ?? "").trim() : raw;
    const candidates = [
      customImage,
      String(getPath(this.actor?.system ?? {}, "identity.token.img") ?? "").trim(),
      String(this.actor?.prototypeToken?.texture?.src ?? "").trim(),
      String(this.actor?.prototypeToken?.img ?? "").trim()
    ];
    const image = candidates.find(isUsableTokenSource);
    if (!image) {
      globalThis.ui?.notifications?.warn?.("Não foi encontrada uma imagem de token utilizável para copiar ao retrato do Actor.");
      return;
    }
    await this.actor.update({ img: image });
    const roots = [this.element, ...[...(this._nexusPanelWindows?.values?.() ?? [])].map(instance => instance?.element)].filter(Boolean);
    for (const root of roots) {
      root.querySelectorAll?.("[data-actor-portrait-preview]").forEach(node => { node.src = image; });
      root.querySelectorAll?.("[data-actor-portrait]").forEach(input => { input.value = image; });
    }
    this._refreshBoundComponents();
    globalThis.ui?.notifications?.info?.("Retrato do Actor atualizado com a imagem do token.");
  }

  async _adjustResource(path, delta) {
    const alias = resolveAliasPath(this.actor, path);
    const resource = alias.alias ? resolveNexusBinding(this.actor, path).value : getPath(this.actor.system, path);
    const max = alias.alias ? resolveNexusBinding(this.actor, `${path}.max`).value : resource?.max;
    const current = alias.alias ? resolveNexusBinding(this.actor, `${path}.value`).value : resource?.value;
    const value = Math.max(0, Math.min(Number(max ?? Infinity), Number(current ?? 0) + delta));
    if (alias.alias && !alias.path) {
      const customData = clone(getCustomAliasData(this.actor));
      foundry.utils.setProperty(customData, `${alias.alias.key}.value`, value);
      await this.actor.setFlag("nexus", "customData", customData);
      this._refreshBoundComponents();
      return true;
    }
    const target = alias.alias ? alias.path : path;
    return this.actor.update({ [`system.${target}.value`]: value });
  }
  async _readLayouts() {
    const saved = this.actor.getFlag("nexus", "layouts");
    let entries = [];

    // Compatibilidade: versões antigas podem ter salvo um único layout diretamente,
    // uma lista de layouts ou o formato atual indexado por ID.
    if (Array.isArray(saved)) {
      entries = saved.map((layout, index) => [String(layout?.id || (index === 0 ? "principal" : `layout-${index + 1}`)), layout]);
    } else if (saved && typeof saved === "object") {
      const isSingleLayout = (saved.components && typeof saved.components === "object") ||
        (saved.cards && typeof saved.cards === "object") || (saved.elements && typeof saved.elements === "object") ||
        Object.hasOwn(saved, "width") || Object.hasOwn(saved, "height");
      const collection = !isSingleLayout && saved.layouts && typeof saved.layouts === "object" ? saved.layouts : saved;
      entries = isSingleLayout
        ? [[String(saved.id || "principal"), saved]]
        : Object.entries(collection);
    }

    const layouts = {};
    for (const [rawId, rawLayout] of entries) {
      if (!rawLayout || typeof rawLayout !== "object" || Array.isArray(rawLayout)) continue;
      const id = String(rawId || rawLayout.id || "principal");
      const layout = clone(rawLayout);
      if (!Array.isArray(layout.components)) {
        const legacyComponents = layout.components && typeof layout.components === "object" ? Object.values(layout.components) :
          Array.isArray(layout.cards) ? layout.cards :
          (layout.cards && typeof layout.cards === "object") ? Object.values(layout.cards) :
          Array.isArray(layout.elements) ? layout.elements :
          (layout.elements && typeof layout.elements === "object") ? Object.values(layout.elements) : [];
        layout.components = legacyComponents.map((component, index) => {
          if (!component || typeof component !== "object") return null;
          const migrated = { ...component };
          migrated.id ??= `cmp-legacy-${index + 1}`;
          migrated.type ??= migrated.componentType ?? migrated.kind;
          return migrated;
        }).filter(Boolean);
      }
      if (!Array.isArray(layout.groups)) layout.groups = layout.groups && typeof layout.groups === "object" ? Object.values(layout.groups) : [];
      if (!Array.isArray(layout.links)) layout.links = layout.links && typeof layout.links === "object" ? Object.values(layout.links) : [];
      layout.id = id;
      layouts[id] = this._normalizeLayout(layout);
    }

    if (!Object.keys(layouts).length) layouts.principal = clone(DEFAULT_LAYOUT);
    if (!layouts.principal) layouts.principal = clone(DEFAULT_LAYOUT);
    layoutReadSnapshots.set(layouts, {
      layouts: clone(layouts),
      active: String(this.actor.getFlag("nexus", "activeLayout") ?? "principal")
    });
    return layouts;
  }

  async _writeLayouts(layouts, active) {
    const queueKey = this.actor.uuid ?? this.actor;
    const previous = layoutWriteQueues.get(queueKey) ?? Promise.resolve();
    const operation = previous.catch(() => {}).then(async () => {
      const snapshot = layoutReadSnapshots.get(layouts);
      // Re-read inside the queue, after earlier writes have completed. A
      // three-way merge keeps unrelated edits made since this snapshot.
      const latest = await this._readLayouts();
      const merged = snapshot
        ? mergeLayoutSnapshots(snapshot.layouts, layouts, latest)
        : clone(layouts);
      const normalized = {};
      for (const [rawId, rawLayout] of Object.entries(merged ?? {})) {
        if (!rawLayout || typeof rawLayout !== "object") continue;
        const id = String(rawId || rawLayout.id || "principal");
        const layout = clone(rawLayout);
        layout.id = id;
        normalized[id] = this._normalizeLayout(layout);
      }
      if (!normalized.principal) normalized.principal = clone(DEFAULT_LAYOUT);

      const storedActive = String(this.actor.getFlag("nexus", "activeLayout") ?? "principal");
      const requestedActiveChanged = !!snapshot && String(active ?? snapshot.active) !== snapshot.active;
      const nextActive = requestedActiveChanged && active && normalized[active]
        ? active
        : (normalized[storedActive] ? storedActive : "principal");

      // Forced replacement ensures deleted layout keys are actually removed.
      await this.actor.update({
        "flags.nexus.layouts": _replace(normalized),
        "flags.nexus.activeLayout": nextActive
      });
      layoutReadSnapshots.set(normalized, { layouts: clone(normalized), active: nextActive });
      return normalized;
    });
    layoutWriteQueues.set(queueKey, operation);
    try {
      return await operation;
    } finally {
      if (layoutWriteQueues.get(queueKey) === operation) layoutWriteQueues.delete(queueKey);
    }
  }

  _activeLayoutId() { return this.actor.getFlag("nexus", "activeLayout") ?? "principal"; }

  _findFreePosition(layout, width, height) {
    const grid = Math.max(5, Number(layout.gridSize) || 20);
    const gap = Math.max(4, Math.round(grid / 4));
    const maxX = Math.max(0, layout.width - width), maxY = Math.max(0, layout.height - height);
    const snap = value => layout.snapEnabled ? Math.round(value / grid) * grid : Math.round(value);
    const overlaps = (x, y) => layout.components.some(c =>
      x < c.x + c.w + gap && x + width + gap > c.x &&
      y < c.y + c.h + gap && y + height + gap > c.y
    );
    const center = { x: clamp(snap((layout.width - width) / 2), 0, maxX), y: clamp(snap((layout.height - height) / 2), 0, maxY) };
    if (!overlaps(center.x, center.y)) return center;

    // Busca em espiral a partir do centro; evita lançar novos cartões fora da área útil.
    const step = grid;
    const maxRadius = Math.ceil(Math.max(layout.width, layout.height) / step);
    for (let radius = 1; radius <= maxRadius; radius++) {
      const candidates = [];
      for (let dx = -radius; dx <= radius; dx++) {
        candidates.push({ x: center.x + dx * step, y: center.y - radius * step });
        candidates.push({ x: center.x + dx * step, y: center.y + radius * step });
      }
      for (let dy = -radius + 1; dy < radius; dy++) {
        candidates.push({ x: center.x - radius * step, y: center.y + dy * step });
        candidates.push({ x: center.x + radius * step, y: center.y + dy * step });
      }
      candidates.sort((a, b) => (a.x + width / 2 - layout.width / 2) ** 2 + (a.y + height / 2 - layout.height / 2) ** 2 - ((b.x + width / 2 - layout.width / 2) ** 2 + (b.y + height / 2 - layout.height / 2) ** 2));
      for (const candidate of candidates) {
        const x = clamp(candidate.x, 0, maxX), y = clamp(candidate.y, 0, maxY);
        if (!overlaps(x, y)) return { x, y };
      }
    }
    // Se não houver espaço livre, centraliza mesmo assim e deixa o usuário reorganizar.
    return center;
  }
  _captureLibraryViewport() {
    const instance = this._nexusPanelWindows?.get("library");
    const root = instance?.element;
    if (!root) return null;
    const selectors = [".window-content", ".application-content", ".nexus-library-main", ".nexus-library-assets", ".nexus-library-details"];
    const state = {};
    for (const selector of selectors) {
      const node = root.matches?.(selector) ? root : root.querySelector(selector);
      if (node) state[selector] = { top: node.scrollTop, left: node.scrollLeft };
    }
    return Object.keys(state).length ? state : null;
  }

  _restoreLibraryViewport(state = this._pendingLibraryViewport) {
    if (!state) return;
    const root = this._nexusPanelWindows?.get("library")?.element;
    if (!root) return;
    for (const [selector, position] of Object.entries(state)) {
      const node = root.matches?.(selector) ? root : root.querySelector(selector);
      if (!node) continue;
      node.scrollTop = position.top;
      node.scrollLeft = position.left;
    }
    this._pendingLibraryViewport = null;
  }

  async _addComponent(type, options = {}) {
    if (!COMPONENTS[type]) throw new Error(`Tipo de componente não registrado: ${String(type)}`);
    this._pendingLibraryViewport = this._captureLibraryViewport();
    const layouts = await this._readLayouts(), requestedActive = this._activeLayoutId(), active = layouts[requestedActive] ? requestedActive : "principal", layout = this._normalizeLayout(clone(layouts[active] ?? DEFAULT_LAYOUT)), d = COMPONENTS[type];
    layout.components = Array.isArray(layout.components) ? layout.components : [];
    this._captureHistory();
    const verticalResource = type === "sheet-resource" && options.template?.sheetOrientation === "vertical";
    const baseW = clamp(Number(options.template?.w) || (verticalResource ? 100 : Number(d.w)) || 160, 80, Math.min(600, layout.width));
    const baseH = clamp(Number(options.template?.h) || (verticalResource ? 190 : Number(d.h)) || 90, 48, Math.min(500, layout.height));
    const pos = this._findFreePosition(layout, baseW, baseH);
    const id = `cmp-${foundry.utils.randomID(8)}`;
    const component = { id, type, ...pos, w: baseW, h: baseH, z: 0, stackOrder: Math.max(-1, ...layout.components.map(c => Number(c.stackOrder) || 0)) + 1 };
    if (type === "token") Object.assign(component, { dataPath: options.template?.dataPath ?? "identity.token.img", tokenFrameMode: "solid", tokenFrameSource: "", tokenFrameColor: "#78b7e8", tokenFrameWidth: 3, tokenShape: "circle", tokenOverlay: "", tokenBackgroundColor: "#202e3e" });
    if (type === "resource-meter") { component.binding = ""; component.format = ["bar", "ring", "classic"].includes(options.format) ? options.format : "bar"; component.resourceLabel = "Medidor"; }
    if (type === "sheet-resource") {
      const resourceCode = String(options.template?.sheetCode ?? "PV").toUpperCase();
      component.sheetColor = options.template?.sheetColor ?? (resourceCode === "PM" ? "#3979d8" : resourceCode === "PE" ? "#39a86b" : "#d94b4b");
      component.currentPath = options.template?.currentPath ?? (resourceCode === "REC" ? "" : "resources.pv.value");
      component.maxPath = options.template?.maxPath ?? (resourceCode === "REC" ? "" : "resources.pv.max");
      component.dataPath = options.template?.dataPath ?? component.currentPath.replace(/\.value$/, "");
      component.sheetVariant = "resource";
      component.sheetCode = options.template?.sheetCode ?? "PV";
      component.sheetContent1 = options.template?.sheetContent1 ?? component.sheetCode;
      component.sheetContent2 = options.template?.sheetContent2 ?? ({PV:"❤️",PM:"💧",PE:"⚡"})[String(component.sheetCode).toUpperCase()] ?? "❤️";
      component.text = options.template?.text ?? "Pontos de Vida";
      component.sheetHint = "Valor atual / valor máximo";
    } else if (type.startsWith("sheet-")) {
      component.dataPath = options.template?.dataPath ?? (type === "sheet-name" ? "name" : (d.path ?? ""));
      component.sheetVariant = d.variant;
      component.sheetCode = ({ "sheet-derived": "DEF", "sheet-attribute": "FOR", "sheet-skill": "FOR", "sheet-action-attack": "ATAQUES", "sheet-action-general": "AÇÕES", "sheet-action-reaction": "REAÇÕES" })[type] ?? "";
      component.text = ({ "sheet-name": "Nome do personagem", "sheet-lineage": "Linhagem", "sheet-physiognomy": "Fisionomia", "sheet-legacy": "Legado", "sheet-section": "Nova seção", "sheet-skill": "Nova perícia", "sheet-skill-group": "Perícias" })[type] ?? (type === "sheet-level" ? "" : d.label);
      component.sheetHint = "";
    }
    if (type === "sheet-attribute") {
      const selectedAttribute = NEXUS_ATTRIBUTES.find(attribute => attribute.key === options.template?.attributePreset) ?? NEXUS_ATTRIBUTES[0];
      component.attributePreset = options.template?.attributePreset ?? selectedAttribute.key;
      component.dataPath = options.template?.dataPath ?? ("attributes." + selectedAttribute.key);
      component.text = options.template?.text ?? selectedAttribute.name;
      component.sheetCode = selectedAttribute.code;
    }
    if (type === "text-field") component.localValue = "";
    if (type.startsWith("asset-")) {
      component.dataPath = "";
      if (["asset-field", "asset-notes", "text-field"].includes(type)) component.localValue = "";
      if (type === "asset-text") component.text = "Novo texto";
      if (type === "asset-field") component.placeholder = "Digite aqui…";
      if (type === "asset-meter") component.format = "bar";
      if (type === "asset-table") { component.rows = 3; component.columns = 3; }
      if (type === "asset-notes") component.placeholder = "Escreva suas anotações…";
    }
    const templateKeys = ["customLabel","binding","customBinding","dataPath","text","localValue","placeholder","rows","columns","cells","resourceLabel","backgroundColor","borderColor","borderRadius","opacity","sheetVariant","sheetCode","sheetHint","currentPath","maxPath","sheetLabel","sheetIcon","sheetContent1","sheetContent2","sheetColor","sheetTrackColor","sheetOrientation","previewCurrent","previewMax","attributePreset","tokenImage","headingFontSize","headingFontFamily","fontSize","fontFamily","textAlign","fontWeight","fontStyle","textTransform","letterSpacing","lineHeight","labelPosition","showLabel","contentStyle","headingStyle","actionType","rollFormula","actionPath","proficiencyLevel","proficiencyLabels","imageFit","imagePosition","imageOpacity","tokenFrameMode","tokenFrameSource","tokenFrameColor","tokenFrameWidth","tokenShape","tokenOverlay","tokenBackgroundColor","layerIcon","layerImage"];
    for (const key of templateKeys) if (Object.hasOwn(options.template ?? {}, key)) component[key] = clone(options.template[key]);
    layout.components.push(component);
    layouts[active] = layout; this._selectedIds = new Set([id]); this._selectedGroupId = null;
    await this._writeLayouts(layouts, active);
    await this.render({ force: true });
    return id;
  }
  async _saveSelectedLibraryComponent() {
    const ids = [...(this._selectedIds ?? [])];
    if (ids.length !== 1) {
      ui.notifications?.info?.("Selecione exatamente um componente no Canvas para salvá-lo.");
      return;
    }
    const layouts = await this._readLayouts(), layout = layouts[this._activeLayoutId()];
    const component = layout?.components?.find(item => item.id === ids[0]);
    if (!component || !COMPONENTS[component.type]) return;
    const label = String(component.customLabel || COMPONENTS[component.type].label || "Componente").trim().slice(0, 48);
    const keys = ["customLabel","binding","customBinding","dataPath","text","localValue","placeholder","rows","columns","cells","resourceLabel","format","w","h","backgroundColor","borderColor","borderRadius","opacity","sheetVariant","sheetCode","sheetHint","currentPath","maxPath","sheetLabel","sheetIcon","sheetContent1","sheetContent2","sheetColor","sheetTrackColor","sheetOrientation","previewCurrent","previewMax","tokenImage","headingFontSize","headingFontFamily","fontSize","fontFamily","textAlign","fontWeight","fontStyle","textTransform","letterSpacing","lineHeight","labelPosition","showLabel","contentStyle","headingStyle","actionType","rollFormula","actionPath","proficiencyLevel","proficiencyLabels","imageFit","imagePosition","imageOpacity","tokenFrameMode","tokenFrameSource","tokenFrameColor","tokenFrameWidth","tokenShape","tokenOverlay","tokenBackgroundColor","layerIcon","layerImage"];
    const settings = {};
    for (const key of keys) if (component[key] !== undefined) settings[key] = clone(component[key]);
    const saved = game.user?.getFlag?.("nexus", "libraryComponents") ?? [];
    const next = [...saved, { id: foundry.utils.randomID(10), label, type: component.type, settings }];
    await game.user.setFlag("nexus", "libraryComponents", next);
    ui.notifications?.info?.(`“${label}” foi salvo em Meus Componentes.`);
    this._libraryAssetScope = "personal";
    this._libraryRenderPersonalItems?.();
    this._libraryApplyFilter?.();
    this.render({ force: true });
  }

  async _addSavedLibraryComponent(id) {
    const saved = game.user?.getFlag?.("nexus", "libraryComponents") ?? [];
    const item = saved.find(entry => entry.id === id);
    if (!item || !COMPONENTS[item.type]) return;
    await this._addComponent(item.type, { format: item.settings?.format, template: item.settings });
  }

  async _deleteSavedLibraryComponent(id) {
    if (!id) return;
    const saved = game.user?.getFlag?.("nexus", "libraryComponents") ?? [];
    const next = saved.filter(item => item.id !== id);
    if (next.length === saved.length) return;
    await game.user.setFlag("nexus", "libraryComponents", next);
    this._libraryRenderPersonalItems?.();
    this._libraryApplyFilter?.();
    this.render({ force: true });
  }

  async _addComposition(key) {
    const composition = NEXUS_LIBRARY_CATALOG.compositions?.find(item => item.id === key);
    if (!composition) return;
    const layouts = await this._readLayouts(), active = this._activeLayoutId(), layout = layouts[active] ?? clone(DEFAULT_LAYOUT);
    const items = composition.components.map(item => ({ ...item, definition: COMPONENTS[item.type] })).filter(item => item.definition);
    if (!items.length) return;
    this._captureHistory();
    const totalWidth = Math.max(...items.map(item => (item.x ?? 0) + (item.w ?? item.definition.w)));
    const totalHeight = Math.max(...items.map(item => (item.y ?? 0) + (item.h ?? item.definition.h)));
    const origin = this._findFreePosition(layout, Math.min(totalWidth, layout.width), Math.min(totalHeight, layout.height));
    const ids = [];
    for (const item of items) {
      const definition = item.definition;
      const width = clamp(Number(item.w) || definition.w, 80, Math.min(600, layout.width));
      const height = clamp(Number(item.h) || definition.h, 48, Math.min(500, layout.height));
      const id = `cmp-${foundry.utils.randomID(8)}`;
      const component = {
        id, type: item.type, x: clamp(origin.x + (item.x ?? 0), 0, layout.width - width),
        y: clamp(origin.y + (item.y ?? 0), 0, layout.height - height),
        w: width, h: height, z: 0,
        stackOrder: Math.max(-1, ...layout.components.map(existing => Number(existing.stackOrder) || 0)) + 1,
        ...(item.type === "asset-text" ? { text: item.text ?? definition.label } : {}),
        ...(item.type === "asset-notes" ? { placeholder: "Escreva suas anotações…" } : {}),
        ...(item.type === "asset-meter" ? { format: "bar", dataPath: "" } : {})
      };
      layout.components.push(component); ids.push(id);
    }
    if (ids.length > 1) {
      layout.groups ??= [];
      const members = layout.components.filter(component => ids.includes(component.id));
      const left = Math.min(...members.map(component => component.x));
      const top = Math.min(...members.map(component => component.y));
      const right = Math.max(...members.map(component => component.x + component.w));
      const bottom = Math.max(...members.map(component => component.y + component.h));
      layout.groups.push({ id: `grp-${foundry.utils.randomID(8)}`, name: composition.label, componentIds: ids, x: left, y: top, w: right-left, h: bottom-top, z: 0 });
    }
    layouts[active] = layout;
    this._selectedIds = new Set(ids); this._selectedGroupId = null;
    await this._writeLayouts(layouts, active); this.render({ force: true });
  }


  async _deleteComponents(ids) {
    const requested = new Set((ids ?? []).filter(Boolean)); if (!requested.size) return;
    const layouts = await this._readLayouts(), active = this._activeLayoutId(), layout = layouts[active]; if (!layout) return;
    const valid = new Set(layout.components.filter(component => requested.has(component.id)).map(component => component.id));
    if (!valid.size) return;
    if (valid.size > 1) {
      const confirmed = await foundry.applications.api.DialogV2.confirm({
        window: { title: "Excluir componentes" },
        content: `<p>Excluir os ${valid.size} componentes selecionados? Você poderá desfazer a ação com Ctrl+Z.</p>`,
        yes: { label: "Excluir" }, no: { label: "Cancelar" }, rejectClose: false
      });
      if (!confirmed) return;
    }
    this._captureHistory();
    layout.components = layout.components.filter(component => !valid.has(component.id));
    layout.groups = (layout.groups ?? []).map(group => ({ ...group, componentIds: (group.componentIds ?? []).filter(id => !valid.has(id)) })).filter(group => group.componentIds.length >= 2);
    layout.links = (layout.links ?? []).map(link => ({ ...link, members: (link.members ?? []).filter(id => !valid.has(id)) })).filter(link => link.members.length >= 2);
    await this._writeLayouts(layouts, active);
    this._selectedIds = new Set(); this._selectedGroupId = null; this._componentEditorTargetId = null;
    this.render({ force: true });
  }
  async _duplicateComponents(ids) {
    const valid = new Set((ids ?? []).filter(Boolean)); if (!valid.size) return;
    const layouts = await this._readLayouts(), active = this._activeLayoutId(), layout = layouts[active]; if (!layout) return;
    this._captureHistory();
    const sources = layout.components.filter(c => valid.has(c.id));
    layout.groups ??= [];
    const idMap = new Map(sources.map(source => [source.id, `cmp-${foundry.utils.randomID(8)}`]));
    const copies = sources.map(source => ({ ...clone(source), id: idMap.get(source.id), x: clamp(source.x + layout.gridSize, 0, layout.width - source.w), y: clamp(source.y + layout.gridSize, 0, layout.height - source.h), z: Number(source.z) || 0, stackOrder: Math.max(-1, ...layout.components.map(c => Number(c.stackOrder) || 0)) + 1 + sources.indexOf(source) }));
    const duplicatedGroups = (layout.groups ?? []).filter(g => (g.componentIds ?? []).length >= 2 && (g.componentIds ?? []).every(id => idMap.has(id))).map(g => ({ ...clone(g), id: `grp-${foundry.utils.randomID(8)}`, name: `${g.name ?? "Grupo"} (cópia)`, componentIds: g.componentIds.map(id => idMap.get(id)) }));
    layout.components.push(...copies); layout.groups.push(...duplicatedGroups);
    await this._writeLayouts(layouts, active); this._selectedIds = new Set(copies.map(c => c.id)); this._selectedGroupId = duplicatedGroups[0]?.id ?? null; this.render({ force: true });
  }
  async _newLayout() {
    const layouts = await this._readLayouts();
    this._captureHistory();
    const id = `layout-${foundry.utils.randomID(5)}`;
    layouts[id] = { ...clone(DEFAULT_LAYOUT), id, name: `Layout ${Object.keys(layouts).length + 1}`, tabMode: "icon", tabValue: "fa-solid fa-star", tabIcon: "fa-solid fa-star", components: [] };
    await this._writeLayouts(layouts, id); this.render({ force: true });
  }
  async _switchLayout(id) { if (!id) return; const layouts = await this._readLayouts(); if (layouts[id]) { await this.actor.setFlag("nexus", "activeLayout", id); this._selectedIds = new Set(); this.render({ force: true }); } }
  async _updateLayoutName(name) {
    const clean = String(name ?? "").trim().slice(0, 32); if (!clean) return;
    const layouts = await this._readLayouts(), active = this._activeLayoutId();
    if (!layouts[active]) return;
    layouts[active].name = clean;
    if ((layouts[active].tabMode ?? "text") === "text") layouts[active].tabValue = clean;
    await this._writeLayouts(layouts, active); this._currentLayout = layouts[active];
    const tab = document.querySelector(`[data-nexus-floating-for="${this.id}"] .nexus-layout-tab[data-layout-id="${active}"]`);
    if (tab) {
      const label = tab.querySelector(".nexus-layout-tab-label");
      if (label) label.textContent = clean;
      tab.title = clean; tab.setAttribute("aria-label", clean);
    }
  }
  async _editLayoutTab(id) {
    this._layoutEditDialogOpenId ??= null;
    if (this._layoutEditDialogOpenId === id) {
      const windows = ui.windows instanceof Map ? [...ui.windows.values()] : Object.values(ui.windows ?? {});
      const dialog = windows.find(app => app?.options?.classes?.includes("nexus-layout-dialog") || app?.element?.classList?.contains("nexus-layout-dialog"));
      dialog?.close?.();
      this._layoutEditDialogOpenId = null;
      return;
    }
    if (this._layoutEditDialogOpenId) {
      const windows = ui.windows instanceof Map ? [...ui.windows.values()] : Object.values(ui.windows ?? {});
      windows.find(app => app?.options?.classes?.includes("nexus-layout-dialog") || app?.element?.classList?.contains("nexus-layout-dialog"))?.close?.();
      this._layoutEditDialogOpenId = null;
    }
    const layouts = await this._readLayouts(), layout = layouts[id];
    if (!layout) return;
    this._layoutEditDialogOpenId = id;
    const presentation = this._layoutTabPresentation(layout);
    const current = presentation.tabMode === "icon" ? presentation.tabIcon : presentation.tabMode === "image" ? presentation.tabImage : presentation.tabValue;
    const escape = value => String(value ?? "").replace(/[&<>"']/g, char => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[char]));
    const content = `<div class="nexus-layout-edit-form">
      <label>Nome do layout<input name="name" type="text" maxlength="32" value="${escape(layout.name)}"></label>
      <label>Ícone, texto ou imagem da aba<input name="tabValue" type="text" maxlength="2048" value="${escape(current)}" placeholder="Vazio = estrela padrão"></label>
      <p>O conteúdo é reconhecido automaticamente: texto, classe Font Awesome ou caminho/URL de imagem. Ao deixar vazio, será usada uma estrela.</p>
    </div>`;
    let result;
    try {
      result = await foundry.applications.api.DialogV2.input({
        window: { title: "Propriedades do layout" },
        classes: ["nexus", "nexus-panel-window", "nexus-layout-dialog"],
        position: { width: 340, height: 420 },
        content,
        ok: { label: "Salvar" },
        buttons: id !== "principal" ? [{
          action: "delete-layout",
          label: "Excluir layout",
          class: "nexus-layout-delete-button",
          callback: () => ({ action: "delete-layout" })
        }] : [],
        rejectClose: false,
        render: (_event, dialog) => {
          dialog.bringToFront?.();
          dialog.element?.querySelector?.('input[name="name"]')?.focus?.();
        }
      });
    } finally {
      this._layoutEditDialogOpenId = null;
    }
    if (result?.action === "delete-layout") {
      await this._removeLayout(id);
      return;
    }
    if (!result) return;
    const name = String(result.name ?? layout.name).trim().slice(0,32) || layout.name;
    const tabValue = String(result.tabValue ?? "").trim().slice(0,2048);
    const next = { ...layout, name, tabValue, tabMode: "auto", tabIcon: "fa-solid fa-star", tabImage: "" };
    const auto = this._layoutTabPresentation(next);
    Object.assign(layout, next, auto);
    this._captureHistory();
    await this._writeLayouts(layouts, this._activeLayoutId());
    this._currentLayout = layouts[this._activeLayoutId()];
    this.render({ force: true });
  }


  async _removeLayout(layoutId = this._activeLayoutId()) {
    const targetId = String(layoutId ?? "");
    if (!targetId || targetId === "principal") return false;
    this._layoutDeletionInProgress ??= new Set();
    if (this._layoutDeletionInProgress.has(targetId)) return false;
    this._layoutDeletionInProgress.add(targetId);

    try {
      const layouts = await this._readLayouts();
      const target = layouts[targetId];
      if (!target) return false;

      const confirmed = await foundry.applications.api.DialogV2.confirm({
        window: { title: "Excluir layout" },
        content: `<p>Excluir <strong>${Handlebars.escapeExpression(String(target.name ?? targetId))}</strong> e todos os componentes desta aba?</p><p>Esta ação não pode ser desfeita.</p>`,
        yes: { label: "Excluir layout", default: true },
        no: { label: "Cancelar" },
        rejectClose: false
      });
      if (!confirmed) return false;

      const currentActive = this._activeLayoutId();
      delete layouts[targetId];
      if (!layouts.principal) layouts.principal = clone(DEFAULT_LAYOUT);
      const nextActive = currentActive === targetId || !layouts[currentActive] ? "principal" : currentActive;
      this._captureHistory();

      // _writeLayouts uses Foundry's forced-replacement operator, so the
      // persisted object contains exactly the remaining layouts.
      await this._writeLayouts(layouts, nextActive);

      const persistedLayouts = this.actor.getFlag("nexus", "layouts") ?? {};
      if (Object.hasOwn(persistedLayouts, targetId)) {
        throw new Error(`A chave ${targetId} reapareceu após a gravação dos layouts restantes.`);
      }
      if (this._activeLayoutId() !== nextActive) {
        throw new Error(`O Foundry não confirmou a ativação do layout ${nextActive} após a exclusão.`);
      }

      const verifiedLayouts = await this._readLayouts();
      if (Object.hasOwn(verifiedLayouts, targetId)) {
        throw new Error(`O layout ${targetId} ainda existe após a persistência.`);
      }

      this._selectedIds = new Set();
      this._selectedGroupId = null;
      this._componentEditorTargetId = null;
      this._currentLayout = clone(layouts[nextActive]);
      await this.render({ force: true });
      return true;
    } catch (error) {
      console.error("NEXUS | Falha ao excluir layout", error);
      ui.notifications?.error?.("Não foi possível excluir o layout. Consulte o console para detalhes.");
      return false;
    } finally {
      this._layoutDeletionInProgress.delete(targetId);
    }
  }

  async _applyThemePreset(themeId) {
    if (!THEME_PALETTES[themeId]) return false;
    return this._updateLayoutSetting({
      dataset: { layoutSetting: "theme" },
      value: themeId,
      closest: () => null
    });
  }

  async _updateLayoutSetting(input) {
    const layouts = await this._readLayouts(), active = this._activeLayoutId(), layout = layouts[active]; if (!layout) return;
    this._captureHistory();
    const key = input.dataset.layoutSetting;
    if (key === "width") layout.width = clamp(Number(input.value) || 800, 800, 1000);
    else if (key === "height") layout.height = clamp(Number(input.value) || 800, 300, 3000);
    else if (key === "gridSize") layout.gridSize = clamp(Number(input.value) || 20, 5, 100);
    else if (["canvasColor", "cardColor", "accentColor", "highlightColor", "buttonColor", "scrollColor", "windowHeaderColor", "windowContentColor", "menuColor", "placeholderColor", "fontFamily"].includes(key)) layout[key] = input.value;
    else if (key === "theme") {
      layout.theme = input.value;
      Object.assign(layout, clone(THEME_PALETTES[layout.theme] ?? THEME_PALETTES["nexus-dark"]));
      layout.fontFamily = THEME_TOKENS[layout.theme]?.fontFamily ?? "Inter";
    } else layout[key] = input.checked;
    await this._writeLayouts(layouts, active);
    this._currentLayout = layout;
    const panelRoots = [...(this._nexusPanelWindows?.values?.() ?? [])].map(instance => instance?.element).filter(Boolean);
    const themeRoots = [this.element, ...panelRoots].filter(Boolean);
    if (key === "theme") {
      const synchronizedSettings = ["theme","canvasColor","cardColor","accentColor","highlightColor","buttonColor","scrollColor","windowHeaderColor","windowContentColor","menuColor","placeholderColor","fontFamily"];
      for (const root of themeRoots) {
        for (const settingKey of synchronizedSettings) {
          root.querySelectorAll?.(`[data-layout-setting="${settingKey}"]`).forEach(field => { field.value = settingKey === "theme" ? layout.theme : layout[settingKey]; });
        }
        root.querySelectorAll?.("[data-library-theme]").forEach(card => {
          const selected = card.dataset.libraryTheme === layout.theme;
          card.classList.toggle("is-selected", selected);
          card.setAttribute("aria-pressed", String(selected));
        });
      }
    }
    const portalRoot = document.querySelector(`[data-nexus-floating-for="${this.id}"]`);
    const themeTargets = [portalRoot, this.element?.querySelector(".nexus-sheet"), this.element?.closest(".application, .window-app"), ...panelRoots];
    for (const target of new Set(themeTargets.filter(Boolean))) applyThemeTokens(target, layout);
    if (["width", "height"].includes(key)) {
      const appWidth = clamp(layout.width + 40, 800, Math.max(800, window.innerWidth - 24));
      const appHeight = clamp(Math.min(layout.height + 100, window.innerHeight - 24), 500, Math.max(500, window.innerHeight - 24));
      this.setPosition({ width: appWidth, height: appHeight });
    }
    const canvas = this.element?.querySelector(".nexus-canvas");
    if (canvas) {
      canvas.dataset.layoutWidth = String(layout.width); canvas.dataset.layoutHeight = String(layout.height);
      canvas.dataset.gridSize = String(layout.gridSize);
      canvas.dataset.grid = String(layout.gridEnabled);
      canvas.dataset.snap = String(layout.snapEnabled);
      canvas.dataset.guides = String(layout.guidesEnabled);
      canvas.style.width = `${layout.width}px`; canvas.style.height = `${layout.height}px`;
      canvas.style.setProperty("--nexus-grid-size", `${layout.gridSize}px`);
      canvas.style.setProperty("--nexus-canvas-color", layout.canvasColor);
      canvas.style.setProperty("--nexus-card-color", layout.cardColor);
      canvas.style.setProperty("--nexus-accent-color", layout.accentColor);
      canvas.style.setProperty("--nexus-highlight-color", layout.highlightColor ?? "#78b7e8");
      canvas.style.setProperty("--nexus-button-color", layout.buttonColor ?? "#315b7d");
      applyThemeTokens(canvas, layout);
      this.element?.closest(".application, .window-app")?.style.setProperty("--nexus-window-accent", layout.accentColor);
      const portal=document.querySelector(`[data-nexus-floating-for="${this.id}"]`); portal?.style.setProperty("--nexus-accent-color", layout.accentColor); portal?.style.setProperty("--nexus-highlight-color",layout.highlightColor??"#78b7e8"); portal?.style.setProperty("--nexus-button-color",layout.buttonColor??"#315b7d"); portal?.style.setProperty("--nexus-font-family",`"${layout.fontFamily??"Inter"}", sans-serif`);
      const app=this.element?.closest(".application, .window-app"); app?.style.setProperty("--nexus-highlight-color",layout.highlightColor??"#78b7e8"); app?.style.setProperty("--nexus-button-color",layout.buttonColor??"#315b7d"); app?.style.setProperty("--nexus-font-family",`"${layout.fontFamily??"Inter"}", sans-serif`);
      for(const instance of this._nexusPanelWindows?.values?.()??[]){const panelElement=instance.element;if(panelElement){panelElement.style.setProperty("--nexus-highlight-color",layout.highlightColor??"#78b7e8");panelElement.style.setProperty("--nexus-button-color",layout.buttonColor??"#315b7d");panelElement.style.setProperty("--nexus-font-family",`"${layout.fontFamily??"Inter"}", sans-serif`);}}
      this._fitNexusCanvas?.();
    }
  }
  async _createComponentLink(componentIds = []) {
    const ids = [...new Set(componentIds)].filter(Boolean);
    if (ids.length < 2) return false;
    const layouts = await this._readLayouts();
    const active = this._activeLayoutId();
    const layout = layouts[active];
    if (!layout) return false;
    const validIds = new Set((layout.components ?? []).map(component => component.id));
    const members = ids.filter(id => validIds.has(id));
    if (members.length < 2) return false;
    layout.links ??= [];
    const selectedComponents = layout.components.filter(component => members.includes(component.id));
    const candidatePaths = [...new Set(selectedComponents.map(component => String(component.dataPath || COMPONENTS[component.type]?.path || "").trim()).filter(Boolean))];
    const link = {
      id: `lnk-${foundry.utils.randomID(8)}`,
      name: `Vínculo ${layout.links.length + 1}`,
      type: "data",
      sourcePath: candidatePaths.length === 1 ? candidatePaths[0] : "",
      members
    };
    this._captureHistory();
    layout.links.push(link);
    await this._writeLayouts(layouts, active);
    this._currentLayout = layouts[active];
    ui.notifications?.info?.("Vínculo criado. Os componentes continuam independentes; a relação está registrada para configuração funcional.");
    this.render({ force: true });
    return true;
  }

  async _groupSelection(html) {
    const ids = new Set(this._selectedIds ?? []); if (ids.size < 2) return;
    const layouts = await this._readLayouts(), active = this._activeLayoutId(), layout = layouts[active];
    if (!layout) return;
    // Não deixa grupos antigos parcialmente órfãos: ao reagrupar um membro, incorpora o grupo inteiro.
    let changed = true;
    while (changed) { changed = false; for (const group of (layout.groups ?? [])) {
      if ((group.componentIds ?? []).some(id => ids.has(id))) for (const id of (group.componentIds ?? [])) if (!ids.has(id)) { ids.add(id); changed = true; }
    }}
    const memberIds = [...ids];
    const members = layout.components.filter(c => ids.has(c.id)); if (members.length < 2) return;
    this._captureHistory();
    const x = Math.min(...members.map(c => c.x)), y = Math.min(...members.map(c => c.y));
    const right = Math.max(...members.map(c => c.x + c.w)), bottom = Math.max(...members.map(c => c.y + c.h));
    layout.groups ??= [];
    const group = { id: `grp-${foundry.utils.randomID(8)}`, name: `Grupo ${layout.groups.length + 1}`, componentIds: members.map(c => c.id), x, y, w: right - x, h: bottom - y, z: Math.min(...members.map(c=>Number(c.z)||0)) };
    layout.groups = (layout.groups ?? []).filter(g => !g.componentIds?.some(id => ids.has(id)));
    layout.groups.push(group); await this._writeLayouts(layouts, active); this._selectedGroupId = group.id; this._selectedIds = new Set(memberIds); this.render({ force: true });
  }

  async _saveSelectedGroupToLibrary() {
    const layouts = await this._readLayouts();
    const layout = layouts[this._activeLayoutId()];
    if (!layout) return false;
    const selected = new Set(this._selectedIds ?? []);
    const group = (layout.groups ?? []).find(item => item.id === this._selectedGroupId)
      ?? (layout.groups ?? []).find(item => item.componentIds?.length >= 2 && item.componentIds.every(id => selected.has(id)));
    if (!group) {
      ui.notifications?.warn?.("Selecione um grupo completo antes de salvá-lo na Biblioteca.");
      return false;
    }
    const members = (layout.components ?? []).filter(item => group.componentIds.includes(item.id));
    if (members.length < 2) return false;
    const result = await foundry.applications.api.DialogV2.input({
      window: { title: "Salvar grupo na Biblioteca" },
      content: `<label class="nexus-library-card-content-label">Nome do grupo<input name="name" type="text" maxlength="48" value="${Handlebars.escapeExpression(String(group.name ?? "Grupo"))}"></label>`,
      ok: { label: "Salvar" }, rejectClose: false
    });
    const name = String(result?.name ?? "").trim().slice(0, 48);
    if (!name) return false;
    const left = Math.min(...members.map(item => item.x));
    const top = Math.min(...members.map(item => item.y));
    const saved = clone(game.user?.getFlag?.("nexus", "libraryGroups") ?? []);
    saved.push({
      id: `libgrp-${foundry.utils.randomID(8)}`, name,
      groupSettings: { backgroundColor: group.backgroundColor ?? "", borderColor: group.borderColor ?? "", borderRadius: group.borderRadius ?? 0 },
      components: members.map(item => { const { id, ...data } = clone(item); return { ...data, x: item.x - left, y: item.y - top }; })
    });
    await game.user.setFlag("nexus", "libraryGroups", saved.slice(-100));
    ui.notifications?.info?.(`Grupo "${name}" salvo na sua Biblioteca pessoal.`);
    this._libraryRenderSavedGroups?.();
    return true;
  }

  async _addSavedGroupToCanvas(groupId) {
    const saved = game.user?.getFlag?.("nexus", "libraryGroups") ?? [];
    const composition = saved.find(item => item.id === groupId);
    if (!composition?.components?.length) return false;
    const layouts = await this._readLayouts(), active = this._activeLayoutId(), layout = layouts[active];
    if (!layout) return false;
    const components = composition.components.map(item => ({ ...clone(item), definition: COMPONENTS[item.type] })).filter(item => item.definition);
    if (!components.length) return false;
    const width = Math.max(...components.map(item => (Number(item.x) || 0) + (Number(item.w) || item.definition.w)));
    const height = Math.max(...components.map(item => (Number(item.y) || 0) + (Number(item.h) || item.definition.h)));
    const origin = this._findFreePosition(layout, Math.min(width, layout.width), Math.min(height, layout.height));
    this._captureHistory();
    const ids = [];
    for (const item of components) {
      const id = `cmp-${foundry.utils.randomID(8)}`;
      const w = clamp(Number(item.w) || item.definition.w, 20, Math.min(1000, layout.width));
      const h = clamp(Number(item.h) || item.definition.h, 20, Math.min(1000, layout.height));
      layout.components.push({ ...clone(item), definition: undefined, id, x: clamp(origin.x + (Number(item.x) || 0), 0, layout.width - w), y: clamp(origin.y + (Number(item.y) || 0), 0, layout.height - h), w, h, z: 0, stackOrder: Math.max(-1, ...layout.components.map(existing => Number(existing.stackOrder) || 0)) + 1 });
      ids.push(id);
    }
    if (ids.length > 1) {
      layout.groups ??= [];
      const members = layout.components.filter(item => ids.includes(item.id));
      const left = Math.min(...members.map(item => item.x)), top = Math.min(...members.map(item => item.y));
      const right = Math.max(...members.map(item => item.x + item.w)), bottom = Math.max(...members.map(item => item.y + item.h));
      layout.groups.push({ ...(clone(composition.groupSettings ?? {})), id: `grp-${foundry.utils.randomID(8)}`, name: composition.name, componentIds: ids, x: left, y: top, w: right-left, h: bottom-top, z: 0 });
    }
    await this._writeLayouts(layouts, active);
    this._selectedIds = new Set(ids);
    this._selectedGroupId = layout.groups?.find(item => item.componentIds?.length === ids.length && item.componentIds.every(id => ids.includes(id)))?.id ?? null;
    this.render({ force: true });
    return true;
  }

  async _ungroupSelection(html) {
    const ids = new Set(this._selectedIds ?? []), layouts = await this._readLayouts(), active = this._activeLayoutId(), layout = layouts[active];
    if (!layout) return;
    const selectedGroups = new Set((layout.groups ?? []).filter(group => ids.has(group.id) || (group.componentIds ?? []).every(id => ids.has(id))).map(group => group.id));
    if (!selectedGroups.size) return;
    this._captureHistory();
    layout.groups = (layout.groups ?? []).filter(group => !selectedGroups.has(group.id));
    await this._writeLayouts(layouts, active); this._selectedGroupId = null; this.render({ force: true });
  }
  async _resetGlobalAppearance(kind) {
    const layouts=await this._readLayouts(),active=this._activeLayoutId(),layout=layouts[active];if(!layout)return;
    this._captureHistory();
    if(kind==="colors") Object.assign(layout,{canvasColor:"#171f2a",cardColor:"#273443",accentColor:"#52647b",highlightColor:"#78b7e8",buttonColor:"#315b7d",theme:"nexus-dark"});
    else Object.assign(layout,{fontFamily:THEME_TOKENS[layout.theme]?.fontFamily ?? "Inter",fontSize:13,secondaryFontSize:11,valueFontSize:20});
    await this._writeLayouts(layouts,active);this._currentLayout=layout;this.render({force:true});
  }
  async _toggleLayerState(kind,id,property) {
    const layouts=await this._readLayouts(),active=this._activeLayoutId(),layout=layouts[active];if(!layout)return;
    const target=kind==="group"?(layout.groups??[]).find(item=>item.id===id):layout.components.find(item=>item.id===id);if(!target)return;
    this._captureHistory();target[property]=!target[property];
    if(property==="hidden" && target.hidden){ if(kind==="group") this._selectedIds=new Set(); else this._selectedIds.delete(id); this._selectedGroupId=null; this._componentEditorTargetId=null; }
    await this._writeLayouts(layouts,active);this._currentLayout=layout;this.render({force:true});
  }
  async _updateGlobalTypography(input) {
    const layouts = await this._readLayouts(), active = this._activeLayoutId(), layout = layouts[active]; if (!layout) return;
    const key = input.dataset.globalTypography;
    const limits = { fontSize:[9,20,13], secondaryFontSize:[8,16,11], valueFontSize:[14,32,20] };
    if (!Object.hasOwn(limits, key)) return;
    const [min,max,fallback] = limits[key];
    const parsed = Number(input.value);
    layout[key] = clamp(Number.isFinite(parsed) && parsed !== 0 ? parsed : fallback, min, max);
    this._captureHistory();
    await this._writeLayouts(layouts,active); this._currentLayout = layout;
    const cssKey = {fontSize:"--nexus-font-size",secondaryFontSize:"--nexus-secondary-font-size",valueFontSize:"--nexus-value-font-size"}[key];
    const nodes = [this.element?.querySelector(".nexus-canvas"), document.querySelector(`[data-nexus-floating-for="${this.id}"]`), ...[...(this._nexusPanelWindows?.values?.() ?? [])].map(instance => instance.element)].filter(Boolean);
    for (const node of nodes) if (cssKey) node.style.setProperty(cssKey, `${layout[key]}px`);
  }
  async _updateComponentSetting(input) {
    const ids = [...(this._selectedIds ?? [])]; if (ids.length !== 1) return;
    this._captureHistory();
    const layouts = await this._readLayouts(), active = this._activeLayoutId(), layout = layouts[active]; if (!layout) return;
    const component = layout.components.find(c => c.id === ids[0]); if (!component) return;
    const key = input.dataset.componentSetting;
    if (key === "format") { const family=component.type.startsWith("pv")?"pv":component.type.startsWith("pm")?"pm":component.type.startsWith("pe")?"pe":null; if(family){const format=input.value;component.type=format==="bar"?`${family}-bar`:format==="ring"&&family==="pv"?"pv-ring":family;} }
    else if (["width","height"].includes(key)) component[key === "width" ? "w" : "h"] = clamp(Number(input.value) || (key === "width" ? 20 : 20), 20, key === "width" ? layout.width : layout.height);
    await this._writeLayouts(layouts,active); this._currentLayout = layout;
    const el = this.element?.querySelector(`.nexus-component[data-id="${component.id}"]`);
    if (key === "format") { this.render({force:true}); return; }
    if (el) { el.style.width = `${component.w}px`; el.style.height = `${component.h}px`; }
  }
  _captureHistory() {
    const layouts = this.actor.getFlag("nexus", "layouts") ?? {};
    const active = this._activeLayoutId();
    this._undoStack ??= []; this._redoStack ??= [];
    this._undoStack.push({layouts:clone(layouts),active});
    if (this._undoStack.length > 80) this._undoStack.shift();
    this._redoStack.length = 0;
  }
  async _restoreHistory(stack, other) {
    if (!stack?.length) return;
    const current = this.actor.getFlag("nexus", "layouts") ?? {};
    other.push({layouts:clone(current),active:this._activeLayoutId()});
    const state = stack.pop();
    await this._writeLayouts(state.layouts, state.active);
    this._selectedIds = new Set(); this.render({ force: true });
  }
  _beginLayerRename(nameNode, kind, id) {
    if (!nameNode || nameNode.querySelector("input")) return;
    const current = nameNode.textContent.trim();
    const input = document.createElement("input");
    input.type = "text"; input.maxLength = 48; input.value = current;
    input.className = "nexus-layer-rename-input"; input.setAttribute("aria-label", "Novo nome da camada");
    nameNode.replaceChildren(input); nameNode.classList.add("is-renaming");
    input.focus(); input.select();
    let finished = false;
    const finish = async save => {
      if (finished) return; finished = true;
      const value = input.value.trim().slice(0, 48) || current;
      nameNode.classList.remove("is-renaming");
      nameNode.textContent = save ? value : current;
      if (save && value !== current) await this._renameLayer(kind, id, value);
    };
    input.addEventListener("keydown", event => {
      if (event.key === "Enter") { event.preventDefault(); input.blur(); }
      if (event.key === "Escape") { event.preventDefault(); finish(false); }
      event.stopPropagation();
    });
    input.addEventListener("blur", () => finish(true), { once: true });
    input.addEventListener("click", event => event.stopPropagation());
  }

  async _renameLayer(kind, id, name) {
    const layouts = await this._readLayouts(), active = this._activeLayoutId(), layout = layouts[active];
    if (!layout) return;
    const target = kind === "group" ? (layout.groups ?? []).find(item => item.id === id) : layout.components.find(item => item.id === id);
    if (!target) return;
    this._captureHistory();
    if (kind === "group") target.name = name;
    else target.customLabel = name;
    await this._writeLayouts(layouts, active);
    this._currentLayout = layout;
    this.render({ force: true });
  }

  async _changeLayer(direction) {
    const ids = new Set(this._selectedIds ?? []); if (!ids.size) return;
    // Um grupo é uma unidade de ordenação: mover um membro pela pilha move o grupo inteiro.
    let expanded = true;
    while (expanded) { expanded = false; for (const group of (this._currentLayout?.groups ?? [])) {
      if ((group.componentIds ?? []).some(id => ids.has(id))) for (const id of (group.componentIds ?? [])) if (!ids.has(id)) { ids.add(id); expanded = true; }
    }}
    this._selectedIds = ids;
    const layouts=await this._readLayouts(), active=this._activeLayoutId(), layout=layouts[active]; if(!layout)return;
    this._captureHistory();
    const ordered=[...layout.components].sort((a,b)=>(a.z??0)-(b.z??0) || (a.stackOrder??0)-(b.stackOrder??0));
    const selected=ordered.filter(c=>ids.has(c.id)), rest=ordered.filter(c=>!ids.has(c.id));
    if(direction==="front") ordered.splice(0,ordered.length,...rest,...selected);
    else if(direction==="back") ordered.splice(0,ordered.length,...selected,...rest);
    else if(direction==="forward") { for(let i=ordered.length-2;i>=0;i--) if(ids.has(ordered[i].id)&&!ids.has(ordered[i+1].id)) [ordered[i],ordered[i+1]]=[ordered[i+1],ordered[i]]; }
    else if(direction==="backward") { for(let i=1;i<ordered.length;i++) if(ids.has(ordered[i].id)&&!ids.has(ordered[i-1].id)) [ordered[i],ordered[i-1]]=[ordered[i-1],ordered[i]]; }
    ordered.forEach((c,i)=>c.z=i+1); layout.components=ordered;
    for (const group of (layout.groups ?? [])) { const members=ordered.filter(c=>(group.componentIds??[]).includes(c.id)); if(members.length) group.z=Math.min(...members.map(c=>c.z)); }
    await this._writeLayouts(layouts,active); this.render({ force: true });
  }
  async _reorderLayer(sourceId, targetId, placement = "before") {
    const layouts = await this._readLayouts(), active = this._activeLayoutId(), layout = layouts[active];
    if (!layout || !sourceId || !targetId || sourceId === targetId) return;
    layout.groups ??= [];
    const sourceGroup = layout.groups.find(group => group.id === sourceId);
    const targetGroup = layout.groups.find(group => group.id === targetId);
    const sourceComponent = layout.components.find(component => component.id === sourceId);
    const targetComponent = layout.components.find(component => component.id === targetId);
    const sourceParent = sourceComponent ? layout.groups.find(group => group.componentIds.includes(sourceId)) : null;

    // Soltar sobre o centro de uma pasta adiciona o componente àquele grupo.
    if (placement === "inside" && targetGroup && sourceComponent) {
      if (targetGroup.componentIds.includes(sourceId)) return;
      this._captureHistory();
      if (sourceParent) {
        sourceParent.componentIds = sourceParent.componentIds.filter(id => id !== sourceId);
        layout.groups = layout.groups.filter(group => group.componentIds.length >= 2);
      }
      const destination = layout.groups.find(group => group.id === targetId);
      if (!destination) return;
      destination.componentIds.push(sourceId);
      const members = layout.components.filter(component => destination.componentIds.includes(component.id));
      sourceComponent.z = Math.min(...members.map(component => Number(component.z) || 0));
      sourceComponent.stackOrder = Math.max(...members.map(component => Number(component.stackOrder) || 0)) + 1;
      destination.z = Math.min(...members.map(component => Number(component.z) || 0));
      destination.stackOrder = Math.min(...members.map(component => Number(component.stackOrder) || 0));
    } else {
      // Um grupo arrastado é uma unidade. Um componente filho pode ser reordenado
      // individualmente; ao sair da pasta, sua associação antiga é removida.
      const movingIds = sourceGroup ? [...sourceGroup.componentIds] : [sourceId];
      if (!movingIds.every(id => layout.components.some(component => component.id === id))) return;
      const movingSet = new Set(movingIds);
      const targetIds = targetGroup ? [...targetGroup.componentIds] : [targetId];
      if (targetIds.some(id => movingSet.has(id))) return;
      this._captureHistory();
      if (!sourceGroup && sourceParent) {
        sourceParent.componentIds = sourceParent.componentIds.filter(id => id !== sourceId);
        layout.groups = layout.groups.filter(group => group.componentIds.length >= 2);
      }
      const ordered = [...layout.components].sort((a, b) => (Number(a.z) || 0) - (Number(b.z) || 0) || (Number(a.stackOrder) || 0) - (Number(b.stackOrder) || 0));
      const moving = ordered.filter(component => movingSet.has(component.id));
      const rest = ordered.filter(component => !movingSet.has(component.id));
      const indexes = rest.map((component, index) => targetIds.includes(component.id) ? index : -1).filter(index => index >= 0);
      if (!indexes.length) return;
      const insertAt = placement === "after" ? Math.max(...indexes) + 1 : Math.min(...indexes);
      rest.splice(insertAt, 0, ...moving);
      rest.forEach((component, index) => { component.z = index; });
      layout.components = rest;
      for (const group of layout.groups) {
        const members = rest.filter(component => group.componentIds.includes(component.id));
        if (!members.length) continue;
        group.z = Math.min(...members.map(component => component.z));
        group.stackOrder = Math.min(...members.map(component => Number(component.stackOrder) || 0));
      }
    }
    await this._writeLayouts(layouts, active);
    this.render({ force: true });
  }

  async _saveCanvas(html, touchedIds = []) {
    const layouts = await this._readLayouts(), active = this._activeLayoutId(), layout = layouts[active]; if (!layout) return;
    html.find(".nexus-component").each((_, el) => {
      const c = layout.components.find(x => x.id === el.dataset.id); if (!c) return;
      c.x = Math.round(parseFloat(el.style.left) || 0); c.y = Math.round(parseFloat(el.style.top) || 0);
      c.w = Math.max(20, Math.round(parseFloat(el.style.width) || c.w)); c.h = Math.max(20, Math.round(parseFloat(el.style.height) || c.h));
    });
    layout.groups = clone(this._currentLayout?.groups ?? layout.groups ?? []);
    const validIds = new Set(layout.components.map(c => c.id));
    layout.groups = layout.groups.map(g => ({...g, componentIds:(g.componentIds ?? []).filter(id => validIds.has(id))})).filter(g => g.componentIds.length >= 2);
    for (const g of layout.groups) {
      const members = layout.components.filter(c => g.componentIds?.includes(c.id));
      if (!members.length) continue;
      g.z = Math.min(...members.map(c => Number(c.z) || 0));
      const minX = Math.min(...members.map(c => c.x)), minY = Math.min(...members.map(c => c.y));
      const maxX = Math.max(...members.map(c => c.x + c.w)), maxY = Math.max(...members.map(c => c.y + c.h));
      if (g.x == null) g.x = minX; if (g.y == null) g.y = minY;
      g.x = minX; g.y = minY; g.w = maxX - minX; g.h = maxY - minY;
    }
    const touched = new Set((touchedIds ?? []).filter(Boolean));
    if (touched.size) {
      let nextOrder = Math.max(-1, ...layout.components.map(component => Number(component.stackOrder) || 0)) + 1;
      for (const component of layout.components) if (touched.has(component.id)) component.stackOrder = nextOrder++;
    }
    this._currentLayout = layout;
    layouts[active] = layout;
    await this._writeLayouts(layouts, active);
  }

  _setSelection(html, ids) {
    this._selectedIds = new Set((ids ?? []).filter(Boolean));
    if (this._selectedIds.size === 1) this._componentEditorTargetId = [...this._selectedIds][0];
    const sheetRoot = this.element?.querySelector?.(".nexus-sheet") ?? html?.[0] ?? this.element;
    const componentNodes = sheetRoot?.querySelectorAll?.(".nexus-component") ?? [];
    // Limpa todas as classes visuais antes de reaplicar a seleção lógica atual.
    for (const el of componentNodes) el.classList.remove("is-selected", "is-group-inspecting", "is-selection-highlight");
    sheetRoot?.querySelectorAll?.(".nexus-group-surface").forEach(surface => surface.classList.remove("is-selected"));
    const selectedGroups = (this._currentLayout?.groups ?? []).filter(group => (group.componentIds ?? []).length >= 2 && group.componentIds.every(id => this._selectedIds.has(id)));
    this._selectedGroupId = selectedGroups.length === 1 ? selectedGroups[0].id : null;
    const selectedGroupIds = new Set(selectedGroups.map(group => group.id));
    for (const el of componentNodes) {
      const selected = this._selectedIds.has(el.dataset.id);
      const memberSelected = selected && !!el.dataset.groupId && selectedGroupIds.has(el.dataset.groupId);
      el.classList.toggle("is-selected", selected);
      el.classList.toggle("is-group-inspecting", memberSelected);
      el.classList.toggle("is-selection-highlight", selected);
    }
    sheetRoot?.querySelectorAll?.(".nexus-group-surface").forEach(surface => {
      surface.classList.toggle("is-selected", selectedGroupIds.has(surface.dataset.groupId));
    });
    const layerRoots = [this._nexusPanelWindows?.get("layers")?.panel, html?.[0], this.element].filter(Boolean);
    for (const layerRoot of new Set(layerRoots)) {
      layerRoot.querySelectorAll?.("[data-layer-select]").forEach(el => el.classList.toggle("active", this._selectedIds.has(el.dataset.layerSelect)));
      layerRoot.querySelectorAll?.("[data-layer-group]").forEach(el => { const group = (this._currentLayout?.groups ?? []).find(g => g.id === el.dataset.layerGroup); el.classList.toggle("active", !!group && group.componentIds.every(id => this._selectedIds.has(id))); });
    }
    const selectedComponentId = this._selectedIds.size === 1 ? [...this._selectedIds][0] : null;
    const activeComponentId = selectedComponentId ?? (this._selectedIds.size === 0 ? this._componentEditorTargetId : null);
    const one = activeComponentId ? (this._currentLayout?.components ?? []).find(c => c.id === activeComponentId) : null;
    if (!one && this._selectedIds.size === 0) this._componentEditorTargetId = null;
    const selectedGroup = (this._currentLayout?.groups ?? []).find(g => g.id === this._selectedGroupId);
    const componentRoot=this._nexusPanelWindows?.get("component")?.panel ?? html[0];
    const inspector = componentRoot?.querySelector(".nexus-component-inspector"), empty = componentRoot?.querySelector(".nexus-inspector-empty");
    if (one && inspector) inspector.querySelectorAll("[data-component-setting],[data-sync-token-portrait]").forEach(field => { field.dataset.componentTargetId = one.id; });
    if (inspector) {
      const interactionEditor = inspector.querySelector("[data-interaction-editor]");
      if (interactionEditor) {
        interactionEditor.dataset.componentId = one?.id ?? "";
        if (one) renderInteractionEditor(interactionEditor, one, this._currentLayout?.components ?? [], getInteractionLibrary(this.actor), this.actor);
        else interactionEditor.replaceChildren();
      }
      const technicalId = inspector.querySelector("[data-component-technical-id]");
      const technicalType = inspector.querySelector("[data-component-technical-type]");
      if (technicalId) technicalId.value = one?.id ?? "";
      if (technicalType) technicalType.value = one?.type ?? "";
      inspector.querySelectorAll("[data-action-config]").forEach(section => { section.hidden = true; });
      const textTools = inspector.querySelector("[data-text-tools]");
      if (textTools) textTools.hidden = !one || ["token", "asset-image"].includes(one.type);
      const imageSettings = inspector.querySelector("[data-image-settings]");
      if (imageSettings) imageSettings.hidden = one?.type !== "asset-image";
      this._syncTextToolbar(inspector, one);
    }
      const behaviorPanel = this._nexusPanelWindows?.get("behavior")?.panel ?? this.element?.querySelector?.('[data-tool-panel="behavior"]');
      const behaviorEditor = behaviorPanel?.querySelector?.("[data-interaction-editor]");
      const behaviorEmpty = behaviorPanel?.querySelector?.("[data-behavior-empty]");
      const behaviorTarget = behaviorPanel?.querySelector?.("[data-behavior-target]");
      if (behaviorEditor) {
        behaviorEditor.dataset.componentId = one?.id ?? "";
        if (one) renderInteractionEditor(behaviorEditor, one, this._currentLayout?.components ?? [], getInteractionLibrary(this.actor), this.actor);
        else behaviorEditor.replaceChildren();
      }
      if (behaviorEmpty) behaviorEmpty.hidden = !!one;
      if (behaviorTarget) behaviorTarget.textContent = one ? (one.customLabel || one.type || "Componente") : "Selecione um componente";
    if (inspector) {
      inspector.hidden = !one && !selectedGroup; if (empty) empty.hidden = !!one || !!selectedGroup;
      const groupInspector=inspector.querySelector("[data-group-inspector]");
      if(groupInspector){groupInspector.hidden=!selectedGroup;if(selectedGroup){for(const [key,value] of [["backgroundColor",selectedGroup.backgroundColor??"#273443"],["borderColor",selectedGroup.borderColor??"#52647b"],["borderRadius",selectedGroup.borderRadius??8]]){const field=groupInspector.querySelector(`[data-group-setting="${key}"]`);if(field)field.value=value;}}}
      const tabNav=inspector.querySelector("[data-inspector-tabs]"); if(tabNav)tabNav.hidden=!!selectedGroup;
      const layoutSection=inspector.querySelector("[data-inspector-layout]"); if(layoutSection)layoutSection.hidden=!!selectedGroup;
      const cardStyleSection=inspector.querySelector("[data-inspector-card-style]"); if(cardStyleSection)cardStyleSection.hidden=!!selectedGroup;
      const componentStyleSection=inspector.querySelector("[data-inspector-component-style]"); if(componentStyleSection)componentStyleSection.hidden=!!selectedGroup;
      const labelPositionRow=inspector.querySelector("[data-component-label-position]"); if(labelPositionRow)labelPositionRow.hidden=!one || ["token", "sheet-resource", "asset-text", "asset-notes", "asset-image", "asset-link"].includes(one.type) || (!one.customLabel && !["level", "attribute"].includes(COMPONENTS[one.type]?.variant ?? one.sheetVariant));
      const rememberedTab = this._componentInspectorTab;
      const activeTab = selectedGroup || !["card", "appearance", "advanced"].includes(rememberedTab) ? "card" : rememberedTab;
      inspector.querySelectorAll("[data-inspector-tab]").forEach(button=>button.classList.toggle("active",button.dataset.inspectorTab===activeTab));
      inspector.querySelectorAll("[data-inspector-tab-panel]").forEach(panel=>{const active=panel.dataset.inspectorTabPanel===activeTab;panel.hidden=!active;panel.classList.toggle("active",active);});
      let effectivePath = null;
      if (one) {
        // Single property picker portal: options are built only by the shared picker.
        const optionsList = document.getElementById("nexus-property-picker-" + String(this.id).replace(/[^a-zA-Z0-9_-]/g, ""));
        const pathInput = inspector.querySelector("[data-component-path-input]");
        const defaultPath = resolveNexusBinding(this.actor, one.dataPath ?? COMPONENTS[one.type]?.path ?? "").path;
        if (pathInput) pathInput.value = defaultPath;
        if (optionsList) optionsList.hidden = true;
        for (const [key, value] of [["x", one.x], ["y", one.y], ["width", one.w], ["height", one.h], ["actionType", one.actionType ?? ""], ["actionTargetId", one.actionTargetId ?? ""], ["attributePreset", one.attributePreset ?? "for"], ["rollFormula", one.rollFormula ?? ""], ["actionPath", one.actionPath ?? ""], ["proficiencyLabel0", one.proficiencyLabels?.[0] ?? "Nível 0"], ["proficiencyLabel1", one.proficiencyLabels?.[1] ?? "Nível 1"], ["proficiencyLabel2", one.proficiencyLabels?.[2] ?? "Nível 2"], ["proficiencyLabel3", one.proficiencyLabels?.[3] ?? "Nível 3"], ["imageFit", one.imageFit ?? "contain"], ["imagePosition", one.imagePosition ?? "center"], ["imageOpacity", one.imageOpacity ?? 100], ["currentPath", one.currentPath ?? (String(one.sheetCode).toUpperCase()==="REC"?"":"resources.pv.value")], ["maxPath", one.maxPath ?? (String(one.sheetCode).toUpperCase()==="REC"?"":"resources.pv.max")], ["dataPath", one.dataPath ?? COMPONENTS[one.type]?.path ?? ""], ["text", one.text ?? ""], ["customLabel", one.customLabel ?? one.text ?? ""], ["showLabel", one.showLabel !== false], ["labelPosition", one.labelPosition ?? "top-left"], ["fontSize", one.fontSize ?? this._currentLayout?.fontSize ?? 13], ["fontFamily", one.fontFamily ?? this._currentLayout?.fontFamily ?? "Inter"], ["headingFontSize", one.headingFontSize ?? ""], ["headingFontFamily", one.headingFontFamily ?? ""], ["rows", one.rows ?? 3], ["columns", one.columns ?? 3], ["placeholder", one.placeholder ?? ""], ["binding", one.binding ?? ""], ["customBinding", one.customBinding ?? ""], ["resourceLabel", one.resourceLabel ?? "Recurso"], ["format", one.format ?? "bar"], ["backgroundColor", one.backgroundColor ?? "#273443"], ["borderColor", one.borderColor ?? "#52647b"], ["borderRadius", one.borderRadius ?? "7"], ["opacity", one.opacity ?? "100"], ["sheetContent1",one.sheetContent1??"PV"], ["sheetContent2",one.sheetContent2??"❤️"], ["sheetColor",one.sheetColor??({PV:"#d94b4b",PM:"#3979d8",PE:"#39a86b"})[String(one.sheetCode??one.sheetContent1??"PV").toUpperCase()]??"#d94b4b"], ["sheetTrackColor",one.sheetTrackColor??"#080d14"], ["sheetOrientation",one.sheetOrientation??"horizontal"], ["previewCurrent",one.previewCurrent??32], ["previewMax",one.previewMax??40], ["tokenImage",one.tokenImage??""], ["tokenFrameMode",one.tokenFrameMode??"solid"], ["tokenFrameSource",one.tokenFrameSource??""], ["tokenFrameColor",one.tokenFrameColor??"#78b7e8"], ["tokenFrameWidth",one.tokenFrameWidth??3], ["tokenShape",one.tokenShape??"circle"], ["tokenOverlay",one.tokenOverlay??""], ["tokenBackgroundColor",one.tokenBackgroundColor??"#202e3e"], ["layerIcon",one.layerIcon??""], ["layerImage",one.layerImage??""]]) {
          inspector.querySelectorAll(`[data-component-setting="${key}"]`).forEach(input => { input.value = value; });
        }
        const showLabelInput = inspector.querySelector('[data-component-setting="showLabel"]');
        if (showLabelInput) showLabelInput.checked = one.showLabel !== false;
        effectivePath = resolveNexusBinding(this.actor, one.dataPath ?? COMPONENTS[one.type]?.path ?? "");
        const propertyValueRow = inspector.querySelector("[data-property-value-row]");
        const propertyValueInput = inspector.querySelector("[data-property-value]");
        if (propertyValueRow && propertyValueInput) {
          const rawBoundValue = effectivePath.path === "name" ? this.actor.name : effectivePath.path === "img" ? this.actor.img : effectivePath.alias ? effectivePath.value : getPath(this.actor.system ?? {}, effectivePath.path);
          const aliasInfo = resolveAliasPath(this.actor, effectivePath.path);
          const propertyPath = effectivePath.virtual ? effectivePath.sourcePath : (effectivePath.alias?.type === "resource" && !aliasInfo.suffix ? `${effectivePath.path}.value` : (rawBoundValue && typeof rawBoundValue === "object" && Object.hasOwn(rawBoundValue, "value") ? `${effectivePath.path}.value` : effectivePath.path));
          const value = effectivePath.value;
          const hasPath = !!propertyPath && value !== undefined && value !== null && typeof value !== "object";
          propertyValueRow.hidden = !hasPath || one.type === "token";
          if (hasPath && one.type !== "token") {
            propertyValueInput.type = typeof value === "number" ? "number" : typeof value === "boolean" ? "checkbox" : "text";
            if (propertyValueInput.type === "checkbox") propertyValueInput.checked = value;
            else propertyValueInput.value = String(value);
            propertyValueInput.dataset.propertyPath = propertyPath;
            propertyValueInput.dataset.propertyKind = typeof value;
            propertyValueInput.disabled = effectivePath.readOnly === true || (propertyPath === "name" && one.updateSource === false);
            propertyValueInput.title = propertyValueInput.disabled ? "A edição do nome original está desativada." : "Altera a propriedade vinculada no personagem.";
          }
        }
        const resourcePaths = getResourceValuePaths(one);
        for (const [selector, path] of [["[data-config-current-value]", resourcePaths.current], ["[data-config-max-value]", resourcePaths.max]]) {
          const field = inspector.querySelector(selector);
          if (field) field.value = path ? (resolveNexusBinding(this.actor, path).value ?? 0) : 0;
        }
        const numericResourceConfig = inspector.querySelector("[data-numeric-resource-config]");
        if (numericResourceConfig) numericResourceConfig.hidden = !(["pv","pm","pe","pv-bar","pm-bar","pe-bar","pv-ring","resource-meter","sheet-resource"].includes(one.type));
      }
      const tokenEditor=inspector.querySelector("[data-token-editor]"); if(tokenEditor)tokenEditor.hidden=one?.type!=="token";
      const tokenConfig=inspector.querySelector("[data-token-configuration]"); if(tokenConfig)tokenConfig.hidden=one?.type!=="token";
      const tokenPreview=tokenEditor?.querySelector(".nexus-token-subcanvas");
      const mediaPreview=inspector.querySelector("[data-component-media-preview]");
      if (mediaPreview) {
        mediaPreview.replaceChildren();
        const mediaValue = effectivePath?.value;
        const mediaSource = mediaValue == null ? "" : String(mediaValue).trim();
        const mediaPath = effectivePath?.path ?? "";
        const forceImage = mediaPath === "img" || /(?:^|\.)(?:img|image|portrait|avatar|token)$/i.test(mediaPath) || effectivePath?.alias?.type === "image";
        const mediaType = isVideoSource(mediaSource) ? "video" : isAudioSource(mediaSource) ? "audio" : (isImageSource(mediaSource) && (forceImage || /\.(?:png|jpe?g|gif|webp|avif|svg|bmp|tiff?|ico|heic|heif|jxl)(?:[?#].*)?$/i.test(mediaSource) || /^data:image\//i.test(mediaSource))) ? "image" : "";
        if (one?.type !== "token" && mediaType) {
          const media = document.createElement(mediaType === "image" ? "img" : mediaType);
          media.src = mediaSource;
          if (mediaType === "image") { media.alt = `Prévia de ${mediaPath || "mídia"}`; media.loading = "lazy"; }
          else { media.controls = true; media.preload = "metadata"; }
          mediaPreview.append(media); mediaPreview.hidden = false;
        } else mediaPreview.hidden = true;
      }
      const frameSourceRow=inspector.querySelector("[data-token-frame-source-row]");
      if(frameSourceRow) frameSourceRow.hidden=(one?.tokenFrameMode??"solid")!=="media";
      if(tokenPreview && one?.type==="token") {
        let image=tokenPreview.querySelector(".nexus-token-portrait"), frame=tokenPreview.querySelector(".nexus-token-frame"), overlay=tokenPreview.querySelector(".nexus-token-overlay");
        const source=getTokenImageSource(this.actor, one, one.dataPath ? resolveNexusBinding(this.actor, one.dataPath).value : ""), video=isVideoSource(source);
        if(image && video!==(image.tagName==="VIDEO")){const next=document.createElement(video?"video":"img");next.className="nexus-token-portrait";if(video){next.autoplay=true;next.muted=true;next.loop=true;next.playsInline=true;}image.replaceWith(next);image=next;}
        if(image){image.src=source;if(image.tagName==="VIDEO")image.load();}
        if(frame){frame.style.borderColor=one.tokenFrameMode==="media"?"transparent":(one.tokenFrameColor??"#78b7e8");frame.style.borderWidth=`${clamp(Number(one.tokenFrameWidth??3),0,16)}px`;frame.replaceChildren();if(one.tokenFrameMode==="media"&&one.tokenFrameSource){const frameVideo=isVideoSource(one.tokenFrameSource),media=document.createElement(frameVideo?"video":"img");media.className="nexus-token-frame-media";media.src=one.tokenFrameSource;if(frameVideo){media.autoplay=true;media.muted=true;media.loop=true;media.playsInline=true;}frame.append(media);}}
        tokenPreview.dataset.shape=one.tokenShape??"circle";tokenPreview.style.setProperty("--nexus-token-bg",one.tokenBackgroundColor??"#202e3e");
        if(overlay){overlay.textContent=one.tokenOverlay??"";overlay.hidden=!one.tokenOverlay;}
      }
      const resourceEditor=inspector.querySelector("[data-sheet-resource-editor]");
      if(resourceEditor)resourceEditor.hidden=one?.type!=="sheet-resource";
      const resourceConfig=inspector.querySelector("[data-sheet-resource-config]");if(resourceConfig)resourceConfig.hidden=one?.type!=="sheet-resource";
      const attributeConfig=inspector.querySelector("[data-sheet-attribute-config]");if(attributeConfig)attributeConfig.hidden=one?.type!=="sheet-attribute";
      if(one?.type==="sheet-attribute"){const preset=inspector.querySelector('[data-component-setting="attributePreset"]');const pathKey=String(one.dataPath??"attributes.for").split(".").at(-1);if(preset)preset.value=one.attributePreset??(NEXUS_ATTRIBUTES.some(attribute=>attribute.key===pathKey)?pathKey:"custom");}
      const resourceRow=inspector.querySelector("[data-component-resource-row]"),formatRow=inspector.querySelector("[data-component-format-row]");
      const isMeter=one?.type==="resource-meter" || one?.type==="asset-meter";
      if(resourceRow)resourceRow.hidden=one?.type!=="resource-meter";
      if(formatRow)formatRow.hidden=!isMeter;
      inspector.querySelectorAll("[data-component-custom-binding]").forEach(row => { row.hidden = one?.type !== "resource-meter" || one?.binding !== "custom"; });
      const identitySection = inspector.querySelector("[data-component-identity]");
      const actorNameRow = inspector.querySelector("[data-component-actor-name]");
      const customLabelRow = inspector.querySelector("[data-component-custom-label]");
      const isNameComponent = ["name", "sheet-name"].includes(one?.type);
      if (actorNameRow) actorNameRow.hidden = true;
      const updateSourceRow=inspector.querySelector("[data-component-update-source]"); if(updateSourceRow) updateSourceRow.hidden=!isNameComponent;
      const updateSourceInput=inspector.querySelector("[data-component-setting=\"updateSource\"]"); if(updateSourceInput) updateSourceInput.checked=one?.updateSource!==false;
      if (customLabelRow) customLabelRow.hidden = !one || ["token", "sheet-resource", "asset-text", "asset-notes", "asset-image", "asset-link"].includes(one.type);
      const showLabelRow = inspector.querySelector("[data-component-show-label]"); if (showLabelRow) showLabelRow.hidden = !one || ["token", "sheet-resource", "asset-text", "asset-notes", "asset-image", "asset-link"].includes(one.type);
      if (identitySection) identitySection.hidden = !isNameComponent;
      const actorNameInput = inspector.querySelector('[data-component-setting="actorName"]'); if (actorNameInput) actorNameInput.value = this.actor.name ?? "";
      const dataRow=inspector.querySelector("[data-component-data-row]"); if(dataRow)dataRow.hidden=!one || one.type === "sheet-resource";
      const dataBindingLabel=dataRow?.querySelector("[data-component-path-input]")?.closest("label"); if(dataBindingLabel){const labelText=dataBindingLabel.firstChild; if(labelText?.nodeType===Node.TEXT_NODE) labelText.textContent=one?.type==="token"?"Origem da imagem":"Propriedade relacionada";}
      const textRow=inspector.querySelector("[data-component-text-row]"); if(textRow)textRow.hidden=!(one && ["asset-text","custom-card","asset-notes","asset-field","text-field","sheet-section","sheet-attribute","sheet-skill-group"].includes(one.type));
      const tableSettings=inspector.querySelector("[data-component-table-settings]"); if(tableSettings)tableSettings.hidden=one?.type!=="asset-table";
      const placeholderRow=inspector.querySelector("[data-component-placeholder-row]"); if(placeholderRow)placeholderRow.hidden=!(["asset-field","asset-notes"].includes(one?.type));
      const contentSection=inspector.querySelector("[data-inspector-content]");
      if(contentSection)contentSection.hidden=!Array.from(contentSection.children).some(child=>child.tagName!=="H4"&&!child.hidden);
    }
  }
  _selectAll(html) { this._setSelection(html, [...html[0].querySelectorAll(".nexus-component:not([hidden])")].map(el => el.dataset.id)); }
  _mountLibrary(panel) {
    return mountLibraryView(this, panel, { createSheetResourcePreview, fitSheetResourcePreview });
  }

  _mountFloatingUI(html) {
    const root = html[0];
    this._nexusFloatingCleanup?.({ preserveWindows: true });
    const app = root.closest(".application, .window-app, .app") || root;
    document.querySelector(`[data-nexus-floating-for="${this.id}"]`)?.remove();
    const leftRail = root.querySelector(".nexus-appearance-rail");
    const sourceDrawer = root.querySelector(".nexus-appearance-drawer");
    const tabs = root.querySelector(".nexus-layout-tabs");
    const panelKeys = ["style", "component", "layers", "library", "aliases", "settings", "behavior"];
    const panelTitles = { style: "Aparência global", component: "Propriedades", layers: "Organização", library: "Biblioteca de elementos", aliases: "Estrutura de dados", settings: "Configurações do editor", behavior: "Comportamento" };
    const panelSizes = { style: [400, 600], component: [400, 600], layers: [400, 600], library: [900, 600], aliases: [400, 600], settings: [400, 600], behavior: [900, 600] };
    this._openAppearancePanels ??= new Set();
    this._nexusPanelWindows ??= new Map();

    const portal = document.createElement("div");
    portal.className = "nexus-floating-ui";
    portal.dataset.nexusFloatingFor = this.id;
    portal.style.setProperty("--nexus-accent-color", this._currentLayout?.accentColor ?? "#52647b");
    portal.style.setProperty("--nexus-highlight-color",this._currentLayout?.highlightColor??"#78b7e8");
    portal.style.setProperty("--nexus-button-color",this._currentLayout?.buttonColor??"#315b7d");
    applyThemeTokens(portal, this._currentLayout ?? DEFAULT_LAYOUT);
    portal.innerHTML = `
      <div class="nexus-floating-left" aria-label="Ferramentas da ficha">
        <div class="nexus-floating-left-rail">
          <button type="button" data-floating-panel="settings" title="Configurações do editor" aria-label="Configurações do editor"><i class="fa-solid fa-gear" aria-hidden="true"></i></button>
          <button type="button" data-floating-panel="style" title="Aparência global" aria-label="Aparência global"><i class="fa-solid fa-palette" aria-hidden="true"></i></button>
          <button type="button" data-floating-panel="component" title="Propriedades" aria-label="Propriedades"><i class="fa-solid fa-sliders" aria-hidden="true"></i></button>
          <button type="button" data-floating-panel="library" title="Biblioteca de elementos" aria-label="Biblioteca de elementos"><i class="fa-solid fa-book-open" aria-hidden="true"></i></button>
          <button type="button" data-floating-panel="layers" title="Organização" aria-label="Organização"><i class="fa-solid fa-layer-group" aria-hidden="true"></i></button>
          <button type="button" data-floating-panel="aliases" title="Estrutura de dados" aria-label="Estrutura de dados"><i class="fa-solid fa-diagram-project" aria-hidden="true"></i></button>
          <button type="button" data-floating-panel="behavior" title="Comportamento" aria-label="Comportamento"><i class="fa-solid fa-bolt" aria-hidden="true"></i></button>
        </div>
      </div>
      <div class="nexus-floating-right" aria-label="Navegação de páginas">
        <div class="nexus-floating-tabs"></div>
        <button type="button" class="nexus-floating-add" data-floating-new-layout title="Adicionar página">＋</button>
      </div>`;
    document.body.appendChild(portal);

    const panels = new Map();
    for (const key of panelKeys) {
      const panel = sourceDrawer?.querySelector(`[data-tool-panel="${key}"]`);
      if (!panel) continue;
      panel.hidden = false;
      panel.classList.add("nexus-native-panel-content");
      panels.set(key, panel);
    }
    const settingsPanel = panels.get("settings");
    settingsPanel?.querySelectorAll("[data-settings-section]").forEach(button => button.addEventListener("click", () => {
      const key = button.dataset.settingsSection;
      settingsPanel.querySelectorAll("[data-settings-section]").forEach(item => item.classList.toggle("active", item === button));
      settingsPanel.querySelectorAll("[data-settings-panel]").forEach(section => {
        const active = section.dataset.settingsPanel === key;
        section.hidden = !active;
        section.classList.toggle("active", active);
      });
    }));
    sourceDrawer?.remove();
    leftRail?.remove();
    if (tabs) portal.querySelector(".nexus-floating-tabs").append(tabs);
    const floatingTabs = portal.querySelector(".nexus-floating-tabs");
    let pendingLayoutClick = null;
    floatingTabs?.addEventListener("click", async event => {
      const tab = event.target.closest(".nexus-layout-tab");
      if (!tab || !floatingTabs.contains(tab)) return;
      if (pendingLayoutClick) clearTimeout(pendingLayoutClick);
      if (event.detail > 1) return;
      pendingLayoutClick = setTimeout(() => {
        pendingLayoutClick = null;
        this._switchLayout(tab.dataset.layoutId);
      }, 180);
    });
    floatingTabs?.addEventListener("dblclick", event => {
      const tab = event.target.closest(".nexus-layout-tab");
      if (!tab || !floatingTabs.contains(tab)) return;
      if (pendingLayoutClick) clearTimeout(pendingLayoutClick);
      pendingLayoutClick = null;
      event.preventDefault(); event.stopPropagation(); event.stopImmediatePropagation();
      this._editLayoutTab(tab.dataset.layoutId);
    }, true);
    root.querySelector(".nexus-sidebar-left")?.remove();
    root.querySelector(".nexus-sidebar-right")?.remove();
    root.querySelector(".nexus-workspace")?.classList.add("nexus-workspace-clean");

    const left = portal.querySelector(".nexus-floating-left");
    const right = portal.querySelector(".nexus-floating-right");
    const setActivePanel = key => {
      const activeKey = key && this._nexusPanelWindows.has(key) ? key : null;
      this._activePanelWindowKey = activeKey;
      portal.querySelectorAll("[data-floating-panel]").forEach(button => {
        button.classList.toggle("active", button.dataset.floatingPanel === activeKey);
      });
      for (const [panelKey, instance] of this._nexusPanelWindows) {
        instance.element?.classList.toggle("nexus-window-active", panelKey === activeKey);
      }
    };
    const setMode = () => {
      if (this._mode) root.dataset.mode = this._mode;
      const appearance = root.dataset.mode === "appearance";
      left.hidden = !appearance;
      portal.querySelector(".nexus-floating-add").hidden = !appearance;
      if (!appearance) {
        setActivePanel(null);
        for (const [key, instance] of [...this._nexusPanelWindows]) {
          this._openAppearancePanels.delete(key);
          instance.close();
        }
        this._nexusPanelWindows.clear();
      }
    };

    const syncRailFocus = (focused = false) => {
      if (!portal.isConnected) return;
      const z = Number.parseInt(app.style.zIndex || getComputedStyle(app).zIndex, 10);
      // O portal acompanha a ficha: fica logo acima dela, mas abaixo de qualquer
      // ApplicationV2 que tenha recebido foco depois da ficha.
      portal.style.setProperty("z-index", String(Math.max(1, (Number.isFinite(z) ? z : 100) - 1)), "important");
      portal.classList.toggle("is-sheet-focused", focused);
    };
    const positionRails = () => {
      if (!app.isConnected || !portal.isConnected) return;
      const r = app.getBoundingClientRect();
      const leftW = 42, rightW = 58;
      this._appearanceRailOffsets ??= { left: { x: -51, y: 72 }, right: { x: 9, y: 72 } };
      const lo = this._appearanceRailOffsets.left, ro = this._appearanceRailOffsets.right;
      const lx = clamp(r.left + lo.x, 4, Math.max(4, window.innerWidth - leftW - 4));
      const ly = clamp(r.top + lo.y, 8, Math.max(8, window.innerHeight - 100));
      const rx = clamp(r.right + ro.x, 4, Math.max(4, window.innerWidth - rightW - 4));
      const ry = clamp(r.top + ro.y, 8, Math.max(8, window.innerHeight - 100));
      Object.assign(left.style, { position: "fixed", left: `${lx}px`, top: `${ly}px`, maxHeight: `${Math.max(160, window.innerHeight - ly - 12)}px` });
      Object.assign(right.style, { position: "fixed", left: `${rx}px`, top: `${ry}px`, maxHeight: `${Math.max(160, window.innerHeight - ry - 12)}px` });
    };
    const onDocumentPointerDown = event => {
      const target = event.target;
      const panelElement = target?.closest?.(".nexus-panel-window");
      if (panelElement) {
        const panelKey = [...this._nexusPanelWindows].find(([, instance]) => instance.element === panelElement)?.[0] ?? null;
        setActivePanel(panelKey);
        syncRailFocus(false);
        return;
      }
      const sheetWasFocused = app.contains(target) || left?.contains(target) || right?.contains(target);
      setActivePanel(null);
      if (sheetWasFocused) {
        syncRailFocus(true);
        positionRails();
      } else {
        // A janela clicada fora do NEXUS deve continuar sob controle do Foundry.
        syncRailFocus(false);
      }
    };
    document.addEventListener("pointerdown", onDocumentPointerDown, true);
    const onDocumentFocusIn = event => {
      const panelElement = event.target?.closest?.(".nexus-panel-window");
      if (panelElement) {
        const panelKey = [...this._nexusPanelWindows].find(([, instance]) => instance.element === panelElement)?.[0] ?? null;
        setActivePanel(panelKey);
      } else if (app.contains(event.target)) {
        setActivePanel(null);
      }
    };
    document.addEventListener("focusin", onDocumentFocusIn, true);

    const focusPanelWindow = instance => {
      if (!instance?.rendered || !instance.element) return;
      instance.bringToFront?.();
      setActivePanel(instance.panelKey);
      const element = instance.element;
      element.setAttribute("tabindex", "-1");
      // ApplicationV2 gerencia a pilha de janelas. Não calculamos um z-index
      // global próprio, pois isso fazia painéis do NEXUS sobreporem aplicações
      // alheias à interação atual.
      requestAnimationFrame(() => {
        if (!element.isConnected) return;
        element.focus({ preventScroll: true });
        element.dispatchEvent(new Event("nexus:activate", { bubbles: true }));
        setActivePanel(instance.panelKey);
      });
    };

    const openPanel = (key, { focus = true } = {}) => {
      const panel = panels.get(key);
      if (!panel) return;
      // A Biblioteca só constrói os cartões e suas prévias quando solicitada.
      if (key === "library") {
        this._mountLibrary(panel);
        this._libraryApplyFilter?.();
        this._libraryRestoreSelection?.();
      }
      const current = this._nexusPanelWindows.get(key);
      if (current) {
        current.setPanel(panel);
        if (current.rendered && focus) {
          focusPanelWindow(current);
          syncRailFocus(false);
        }
        return;
      }
      const [baseWidth, baseHeight] = panelSizes[key] ?? [420, 560];
      const width = Math.min(baseWidth, window.innerWidth - 32);
      const height = Math.min(baseHeight, window.innerHeight - 48);
      const offset = panelKeys.indexOf(key) * 28;
      const left = Math.min(Math.max(8, Math.round((window.innerWidth - width) / 2 + offset)), Math.max(8, window.innerWidth - width - 8));
      const top = Math.min(Math.max(8, Math.round((window.innerHeight - height) / 2 + offset)), Math.max(8, window.innerHeight - height - 8));
      const instance = new NexusPanelWindow({
        sheet: this, key, panel, title: panelTitles[key], width, height, left, top
      });
      this._nexusPanelWindows.set(key, instance);
      this._openAppearancePanels.add(key);
      instance.render({ force: true }).then(() => {
        applyThemeTokens(instance.element, this._currentLayout ?? DEFAULT_LAYOUT);
        focusPanelWindow(instance);
        syncRailFocus(false);
      }).catch(error => {
        console.error(`NEXUS | Falha ao abrir janela ${key}`, error);
        this._onPanelWindowClosed(key, instance);
      });
    };

    const requestPanel = key => {
      if (root.dataset.mode !== "appearance") {
        this._openAppearancePanels.add(key);
        this._setMode("appearance");
        return;
      }
      syncRailFocus(true);
      const instance = this._nexusPanelWindows.get(key);
      if (instance?.rendered) {
        focusPanelWindow(instance);
        syncRailFocus(false);
      } else openPanel(key);
    };
    portal.querySelectorAll("[data-floating-panel]").forEach(button => button.addEventListener("click", () => {
      if (root.dataset.mode !== "appearance") return;
      requestPanel(button.dataset.floatingPanel);
    }));
    root.querySelectorAll("[data-editor-open-panel]").forEach(button => button.addEventListener("click", () => {
      requestPanel(button.dataset.editorOpenPanel);
    }));
    root.querySelectorAll("[data-editor-mode]").forEach(button => button.addEventListener("click", () => {
      this._setMode(button.dataset.editorMode);
    }));
    root.querySelectorAll("[data-editor-insert]").forEach(button => button.addEventListener("click", async () => {
      const type = button.dataset.editorInsert;
      if (root.dataset.mode !== "appearance") await this._setMode("appearance");
      await this._addComponent(type);
      root.querySelectorAll("[data-editor-insert]").forEach(item => item.classList.toggle("is-active", item === button));
    }));
    root.querySelector("[data-editor-fit]")?.addEventListener("click", () => {
      const scroller = root.querySelector(".nexus-canvas-scroll");
      if (!scroller) return;
      scroller.scrollTo({ left: Math.max(0, (scroller.scrollWidth - scroller.clientWidth) / 2), top: Math.max(0, (scroller.scrollHeight - scroller.clientHeight) / 2), behavior: "smooth" });
    });
    portal.querySelector("[data-floating-new-layout]")?.addEventListener("click", () => this._newLayout());
    setMode();
    positionRails();
    if (root.dataset.mode === "appearance") syncRailFocus(true);
    requestAnimationFrame(() => { setMode(); positionRails(); });
    const resizeObserver = typeof ResizeObserver !== "undefined" ? new ResizeObserver(positionRails) : null;
    resizeObserver?.observe(app);
    const moveObserver = typeof MutationObserver !== "undefined" ? new MutationObserver(positionRails) : null;
    moveObserver?.observe(app, { attributes: true, attributeFilter: ["style", "class"] });
    window.addEventListener("resize", positionRails);
    window.addEventListener("scroll", positionRails, true);

    this._nexusFloatingCleanup = ({ preserveWindows = true } = {}) => {
      resizeObserver?.disconnect(); moveObserver?.disconnect();
      window.removeEventListener("resize", positionRails);
      window.removeEventListener("scroll", positionRails, true);
      document.removeEventListener("pointerdown", onDocumentPointerDown, true);
      document.removeEventListener("focusin", onDocumentFocusIn, true);
      if (!preserveWindows) {
        for (const instance of this._nexusPanelWindows.values()) instance.close();
        this._nexusPanelWindows.clear();
      }
      portal.remove();
    };

    // Reassocia os novos painéis renderizados às janelas existentes sem focá-las.
    for (const key of [...this._openAppearancePanels]) openPanel(key, { focus: false });
    // Actor updates can rerender the sheet while a floating panel is being
    // edited. Restore the panel's stacking order without stealing input focus.
    const activePanelKey = this._activePanelWindowKey;
    if (activePanelKey) requestAnimationFrame(() => {
      const activePanel = this._nexusPanelWindows.get(activePanelKey);
      if (!portal.isConnected || !activePanel?.rendered) return;
      activePanel.bringToFront?.();
      setActivePanel(activePanelKey);
    });
    if (this._pendingLibraryViewport) {
      const viewport = this._pendingLibraryViewport;
      requestAnimationFrame(() => requestAnimationFrame(() => this._restoreLibraryViewport(viewport)));
    }
  }

  _onPanelWindowClosed(key, instance) {
    if (this._nexusPanelWindows?.get(key) === instance) this._nexusPanelWindows.delete(key);
    this._openAppearancePanels?.delete(key);
    if (this._activePanelWindowKey === key) this._activePanelWindowKey = null;
    document.querySelector(`[data-nexus-floating-for="${this.id}"] [data-floating-panel="${key}"]`)?.classList.remove("active");
    if (["component", "behavior"].includes(key)) {
      const editorPanelsOpen = ["component", "behavior"].some(panelKey => this._nexusPanelWindows?.has(panelKey));
      if (!editorPanelsOpen && this.element?.isConnected) this._setSelection?.($(this.element), []);
    }
  }

  _onClose(options) {
    this._nexusKeyCleanup?.(); this._nexusInspectorKeyCleanup?.();
    if (this._nexusInspectorNamespace) $(document).off(this._nexusInspectorNamespace);
    this._nexusFloatingCleanup?.();
    for (const instance of this._nexusPanelWindows?.values?.() ?? []) instance.close();
    this._nexusPanelWindows?.clear?.();
    return super._onClose(options);
  }

  _activateCanvas(html) {
    return activateCanvasInteractions(this, html, { NEXUS_LIBRARY_CATALOG, DEFAULT_LAYOUT, THEME_TOKENS, THEME_PALETTES, applyThemeTokens, NexusPanelWindow, buildPropertyPickerCatalog, renderPropertyPicker, activateActorSheetListeners, migrateLegacyActorData, mergeLayoutSnapshots, NEXUS_SKILLS, getNexusBaseModifier, getNexusSkillRows, getNexusSkillModifier, executeTriggeredActions, getTriggeredActions, renderInteractionEditor, applyInteractionEditorChange, applyInteractionEditorCommand, getInteractionLibrary, saveInteractionToLibrary, getComponentInteractions, layoutReadSnapshots, layoutWriteQueues, ActorSheetV2, HandlebarsApplicationMixin, NexusActorSheetBase, COMPONENTS, resolveNexusBinding, expandNexusPropertyExpressions, getResourceValuePaths, clone, getPath, collectPropertyPaths, NATIVE_PROPERTY_BASE, nativePropertyDefinitionCache, EMPTY_NATIVE_PROPERTY_LIST, LEGACY_SKILL_PATHS, invalidateNativePropertyCache, getNativePropertyDefinitions, replaceLayoutBindingPaths, EMPTY_ALIAS_LIST, aliasDefinitionCache, invalidateAliasDefinitionCache, getAliasDefinitions, getCustomAliasData, normalizeAliasDefinition, safeAliasKey, evaluateAliasExpression, getNexusRollAliasEntries, expandNexusRollAliases, getNexusRollData, resolveAliasPath, clamp, DEFAULT_FOUNDRY_TOKEN_IMAGE, IMAGE_EXTENSIONS, AUDIO_EXTENSIONS, VIDEO_EXTENSIONS, MEDIA_EXTENSION_PATTERN, VIDEO_EXTENSION_PATTERN, isMediaSource, isVideoSource, isAudioSource, isImageSource, isUsableTokenSource, getFoundryDefaultTokenImage, getTokenImageSource, isSafeLink, setPreviewContent, createSheetResourcePreview, fitSheetResourcePreview, updateSheetResourcePreview, NexusActorSheet });
  }
}

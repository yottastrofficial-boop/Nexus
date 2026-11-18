import { NEXUS_ATTRIBUTES, NEXUS_SKILLS, getNexusAttributeValue, getNexusSkillRows } from "./skills.js";

/**
 * Canonical property registry for the NEXUS core rules.
 * Rule mechanics come from REGRAS NEXUS.pdf; display abbreviations are UI metadata.
 * Stored values remain separate from derived/read-only presentation properties.
 */
export const NEXUS_PROPERTY_SCHEMA_VERSION = 4;

const RESOURCE_DEFINITIONS = Object.freeze([
  { key: "pv", name: "Pontos de Vida", exib: "PV", description: "Vitalidade e sobrevivência.", fields: ["name", "exib", "value", "max", "temporary"] },
  { key: "pm", name: "Pontos de Mana", exib: "PM", description: "Reserva usada para magias e habilidades especiais.", fields: ["name", "exib", "value", "max", "temporary"] },
  { key: "pe", name: "Pontos de Esforço", exib: "PE", description: "Reserva usada para ações físicas, movimentos, manobras e interações ativas.", fields: ["name", "exib", "value", "max", "temporary"] }
]);

const IDENTITY_FIELDS = Object.freeze([
  ["name", "Nome", "string"], ["concept", "Conceito", "string"],
  ["ancestry", "Ancestralidade", "string"], ["lineage", "Linhagem", "string"],
  ["legacy", "Legado", "string"], ["talent", "Talento", "string"],
  ["class", "Classe", "string"], ["archetype", "Arquétipo", "string"],
  ["function", "Função", "string"], ["level", "Nível", "number"]
]);

const PERSONALITY_FIELDS = Object.freeze([
  ["appearance", "Aparência"], ["traits", "Traços"], ["flaws", "Defeitos"],
  ["bonds", "Vínculos"], ["ideals", "Ideais"], ["motivation", "Motivações"],
  ["alignment.order", "Alinhamento · Ordem"], ["alignment.morality", "Alinhamento · Moralidade"]
]);

const COMBAT_FIELDS = Object.freeze([
  { path: "combat.defense.value", label: "Defesa", exib: "DEF", type: "number", category: "combat", derived: false },
  { path: "combat.defenseModifier", label: "Modificador de Defesa", type: "number", category: "combat", derived: false, description: "Modificador adicional aplicado à Defesa Base." },
  { path: "combat.initiative.value", label: "Iniciativa", exib: "INI", type: "number", category: "combat", derived: false },
  { path: "combat.movement.value", label: "Deslocamento", exib: "DESL", type: "number", category: "combat", description: "Deslocamento definido pela Ancestralidade, armazenado em espaços de grade." },
  { path: "combat.movement.meters", label: "Deslocamento em metros", exib: "m", type: "number", category: "combat", derived: false },
  { path: "progression.mb.value", label: "Modificador Base", exib: "MB", type: "number", category: "progression", derived: false },
  { path: "recovery.count.value", label: "Dados de Recuperação", exib: "DdR", type: "number", category: "recovery", derived: false },
  { path: "recovery.die.value", label: "Dado de Recuperação", exib: "Dado", type: "string", category: "recovery", derived: false },
  { path: "recovery.available.value", label: "Dados de Recuperação disponíveis", exib: "DdR disp.", type: "number", category: "recovery", derived: false },
  { path: "recovery.spent", label: "Dados de Recuperação gastos", exib: "DdR gastos", type: "number", category: "recovery", derived: false },
  { path: "resources.pe.recovery.value", label: "Recuperação de PE", exib: "PE rec.", type: "number", category: "resources", derived: false },
  { path: "encumbrance.base.value", label: "Carga base", exib: "Carga", type: "number", category: "encumbrance", derived: false },
  { path: "encumbrance.bonus.value", label: "Bônus de carga", exib: "Bônus", type: "number", category: "encumbrance", derived: false },
  { path: "encumbrance.capacity.value", label: "Capacidade de carga", exib: "Capacidade", type: "number", category: "encumbrance", derived: false },
  { path: "encumbrance.current.value", label: "Carga atual", exib: "Atual", type: "number", category: "encumbrance", derived: false },
  { path: "encumbrance.overloaded.value", label: "Carga excedida", exib: "Excesso", type: "boolean", category: "encumbrance", derived: false }
]);

const definitions = [
  ...NEXUS_ATTRIBUTES.flatMap(attribute => [
    { path: `attributes.${attribute.key}.name`, label: `${attribute.name} · Nome`, exib: attribute.code, type: "string", category: "attributes", derived: true },
    { path: `attributes.${attribute.key}.exib`, label: `${attribute.name} · Exibição`, exib: attribute.code, type: "string", category: "attributes", derived: true },
    { path: `attributes.${attribute.key}.value`, label: `${attribute.name} · Valor`, exib: attribute.code, type: "number", category: "attributes", derived: false }
  ]),
  ...NEXUS_SKILLS.flatMap(skill => [
    { path: `skills.${skill.key}.name`, label: `${skill.name} · Nome`, exib: skill.exib, type: "string", category: "skills", derived: true },
    { path: `skills.${skill.key}.exib`, label: `${skill.name} · Exibição`, exib: skill.exib, type: "string", category: "skills", derived: true },
    { path: `skills.${skill.key}.value`, label: `${skill.name} · Valor`, exib: skill.exib, type: "number", category: "skills", derived: false },
    { path: `skills.${skill.key}.proficientLevel`, label: `${skill.name} · Proficiência`, exib: skill.exib, type: "number", category: "skills", derived: false },
    { path: `skills.${skill.key}.proficient`, label: `${skill.name} · É proficiente`, exib: skill.exib, type: "boolean", category: "skills", derived: true },
    { path: `skills.${skill.key}.attribute`, label: `${skill.name} · Atributo`, exib: skill.attribute, type: "string", category: "skills", derived: true },
    { path: `skills.${skill.key}.description`, label: `${skill.name} · Descrição`, exib: skill.exib, type: "string", category: "skills", derived: false },
    { path: `skills.${skill.key}.formula`, label: `${skill.name} · Fórmula`, exib: skill.exib, type: "string", category: "skills", derived: false }
  ]),
  ...RESOURCE_DEFINITIONS.flatMap(resource => resource.fields.map(field => ({
    path: `resources.${resource.key}.${field}`,
    label: `${resource.name} · ${field === "name" ? "Nome" : field === "exib" ? "Exibição" : field === "value" ? "Atual" : field === "max" ? "Máximo" : "Temporário"}`,
    exib: resource.exib,
    type: field === "name" || field === "exib" ? "string" : "number",
    category: "resources",
    derived: field === "name" || field === "exib"
  }))),
  ...COMBAT_FIELDS,
  ...IDENTITY_FIELDS.map(([field, label, type]) => ({
    path: field === "name" ? "name" : field === "level" ? "identity.level" : `identity.${field}`,
    label, type, category: field === "level" ? "progression" : "identity", derived: false
  })),
  ...PERSONALITY_FIELDS.map(([field, label]) => ({
    path: `personality.${field}`, label, type: "string", category: "personality", derived: false
  })),
  { path: "conditions", label: "Condições", type: "array", category: "conditions", derived: false }
];

export const NEXUS_RULEBOOK_PROPERTY_DEFINITIONS = Object.freeze(definitions.map(item => Object.freeze(item)));
export const NEXUS_RULEBOOK_PROPERTY_PATHS = Object.freeze(NEXUS_RULEBOOK_PROPERTY_DEFINITIONS.map(item => item.path));
const definitionByPath = new Map(NEXUS_RULEBOOK_PROPERTY_DEFINITIONS.map(item => [item.path, item]));

export function getNexusRulebookPropertyDefinition(path) {
  return definitionByPath.get(String(path ?? "").replace(/^system\./, "")) ?? null;
}

export function getNexusRulebookPropertyPaths() {
  return NEXUS_RULEBOOK_PROPERTY_PATHS;
}

/**
 * Compatibility export retained for older callers. The editor no longer
 * supplies global or pre-programmed formulas; expressions are user-authored.
 */
export function getNexusDefaultPropertyFormula(_path) {
  return "";
}

/**
 * Resolves canonical stored and derived Actor properties.
 * Derived values are calculated on read and never written back as stale scalar snapshots.
 */
export function getNexusRulebookPropertyValue(actorOrSystem, path) {
  const actor = actorOrSystem?.system ? actorOrSystem : { system: actorOrSystem ?? {} };
  const system = actor.system ?? {};
  const key = String(path ?? "").replace(/^system\./, "");
  if (key === "identity.name") return { matched: true, value: actor.name ?? "", readOnly: true, sourcePath: "name" };

  const attributeMatch = key.match(/^attributes\.([^.]+)\.(name|exib|value|description)$/);
  if (attributeMatch) {
    const definition = NEXUS_ATTRIBUTES.find(attribute => attribute.key === attributeMatch[1]);
    if (!definition) return { matched: false };
    const member = attributeMatch[2];
    const storedAttribute = system.attributes?.[definition.key];
    const nestedValue = storedAttribute && typeof storedAttribute === "object" && Object.hasOwn(storedAttribute, "value");
    const value = member === "name" ? definition.name
      : member === "exib" ? definition.exib
      : member === "description" ? definition.description
      : getNexusAttributeValue(actor, definition.key);
    const sourcePath = member === "value" ? (nestedValue ? `attributes.${definition.key}.value` : `attributes.${definition.key}`) : undefined;
    return { matched: true, value, readOnly: member !== "value", sourcePath };
  }

  const skillMatch = key.match(/^skills\.([^.]+)(?:\.(.+))?$/);
  if (skillMatch) {
    const definition = NEXUS_SKILLS.find(skill => skill.key === skillMatch[1] || skill.legacyKey === skillMatch[1]);
    if (!definition) return { matched: false };
    const member = skillMatch[2];
    const row = getNexusSkillRows(actor).find(skill => skill.key === definition.key);
    if (!member) return { matched: true, value: row, readOnly: true };
    if (["name", "exib", "attribute", "proficient"].includes(member)) {
      return { matched: true, value: row?.[member], readOnly: true };
    }
    if (member === "value") {
      const skillData = system.skills?.[definition.key] ?? {};
      const stored = skillData.value;
      const nestedValue = stored && typeof stored === "object" && Object.hasOwn(stored, "value");
      const explicitFormula = typeof skillData.formula === "string" && skillData.formula.trim();
      return {
        matched: true,
        value: explicitFormula ? row?.value : (nestedValue ? stored.value : (stored ?? 0)),
        readOnly: false,
        sourcePath: `skills.${definition.key}.value`
      };
    }
    const stored = system.skills?.[definition.key]?.[member];
    if (["proficientLevel", "description", "formula"].includes(member)) {
      return { matched: true, value: stored ?? (member === "proficientLevel" ? 0 : member === "description" ? definition.description : ""), readOnly: false, sourcePath: `skills.${definition.key}.${member}` };
    }
  }

  const resourceMatch = key.match(/^resources\.(pv|pm|pe)\.(name|exib)$/);
  if (resourceMatch) {
    const resource = RESOURCE_DEFINITIONS.find(item => item.key === resourceMatch[1]);
    if (resource) return { matched: true, value: resourceMatch[2] === "name" ? resource.name : resource.exib, readOnly: true };
  }

  const definition = definitionByPath.get(key);
  if (!definition) return { matched: false };

  const parts = key.split(".");
  let stored = parts.reduce((value, part) => value?.[part], system);
  let sourcePath = key;
  if (stored === undefined && key === "combat.movement.value" && system.combat?.movement !== undefined) {
    stored = system.combat.movement;
    sourcePath = "combat.movement";
  }
  if (stored === undefined && key === "encumbrance.current.value" && system.encumbrance?.current !== undefined) {
    stored = system.encumbrance.current;
    sourcePath = "encumbrance.current";
  }
  const nestedValue = stored && typeof stored === "object" && Object.hasOwn(stored, "value");
  if (nestedValue) stored = stored.value;
  if (nestedValue) sourcePath = key;
  return {
    matched: true,
    value: stored,
    readOnly: definition.derived === true,
    sourcePath
  };
}

export function getNexusResourceDefinition(key) {
  return RESOURCE_DEFINITIONS.find(resource => resource.key === key) ?? null;
}

import { NEXUS_ATTRIBUTES, NEXUS_SKILLS, getNexusBaseModifier, getNexusSkillRows } from "./skills.js";

/**
 * Canonical property registry for the NEXUS core rules.
 * Rule mechanics come from REGRAS NEXUS.pdf; display abbreviations are UI metadata.
 * Stored values remain separate from derived/read-only presentation properties.
 */
export const NEXUS_PROPERTY_SCHEMA_VERSION = 3;

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
  { path: "combat.defense.value", label: "Defesa", exib: "DEF", type: "number", category: "combat", derived: true, description: "Defesa Base: 8 + Destreza + modificadores aplicáveis." },
  { path: "combat.defenseModifier", label: "Modificador de Defesa", type: "number", category: "combat", derived: false, description: "Modificador adicional aplicado à Defesa Base." },
  { path: "combat.initiative.value", label: "Iniciativa", exib: "INI", type: "number", category: "combat", derived: true, description: "Teste de Destreza usado para definir a ordem dos turnos." },
  { path: "combat.movement.value", label: "Deslocamento", exib: "DESL", type: "number", category: "combat", description: "Deslocamento definido pela Ancestralidade, armazenado em espaços de grade." },
  { path: "combat.movement.meters", label: "Deslocamento em metros", exib: "m", type: "number", category: "combat", derived: true, description: "Conversão de espaços de grade para metros; cada espaço equivale a 1,5 m." },
  { path: "progression.mb.value", label: "Modificador Base", exib: "MB", type: "number", category: "progression", derived: true, description: "MB = nível ÷ 2, arredondado para cima, limitado a +5." },
  { path: "recovery.count.value", label: "Dados de Recuperação", exib: "DdR", type: "number", category: "recovery", derived: true, description: "Quantidade igual ao nível do personagem." },
  { path: "recovery.die.value", label: "Dado de Recuperação", exib: "Dado", type: "string", category: "recovery", derived: true, description: "Evolui a cada 2 níveis: d4, d6, d8, d10 e d12." },
  { path: "recovery.available.value", label: "Dados de Recuperação disponíveis", exib: "DdR disp.", type: "number", category: "recovery", derived: true },
  { path: "recovery.spent", label: "Dados de Recuperação gastos", exib: "DdR gastos", type: "number", category: "recovery", derived: false },
  { path: "resources.pe.recovery.value", label: "Recuperação de PE", exib: "PE rec.", type: "number", category: "resources", derived: true, description: "Recuperação de PE calculada como quatro vezes o MB." },
  { path: "encumbrance.base.value", label: "Carga base", exib: "Carga", type: "number", category: "encumbrance", derived: true },
  { path: "encumbrance.bonus.value", label: "Bônus de carga", exib: "Bônus", type: "number", category: "encumbrance", derived: true },
  { path: "encumbrance.capacity.value", label: "Capacidade de carga", exib: "Capacidade", type: "number", category: "encumbrance", derived: true },
  { path: "encumbrance.current.value", label: "Carga atual", exib: "Atual", type: "number", category: "encumbrance", derived: false },
  { path: "encumbrance.overloaded.value", label: "Carga excedida", exib: "Excesso", type: "boolean", category: "encumbrance", derived: true }
]);

const definitions = [
  ...NEXUS_ATTRIBUTES.flatMap(attribute => [
    { path: `attributes.${attribute.key}.name`, label: `${attribute.name} · Nome`, exib: attribute.code, type: "string", category: "attributes", derived: true },
    { path: `attributes.${attribute.key}.exib`, label: `${attribute.name} · Exibição`, exib: attribute.code, type: "string", category: "attributes", derived: true },
    { path: `attributes.${attribute.key}.value`, label: `${attribute.name} · Valor`, exib: attribute.code, type: "number", category: "attributes", derived: true }
  ]),
  ...NEXUS_SKILLS.flatMap(skill => [
    { path: `skills.${skill.key}.name`, label: `${skill.name} · Nome`, exib: skill.exib, type: "string", category: "skills", derived: true },
    { path: `skills.${skill.key}.exib`, label: `${skill.name} · Exibição`, exib: skill.exib, type: "string", category: "skills", derived: true },
    { path: `skills.${skill.key}.value`, label: `${skill.name} · Valor`, exib: skill.exib, type: "number", category: "skills", derived: true },
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
 * Resolve computed and metadata-only properties from the canonical registry.
 * Returns matched:false for ordinary stored Actor.system paths.
 */
export function getNexusRulebookPropertyValue(actorOrSystem, path) {
  const actor = actorOrSystem?.system ? actorOrSystem : { system: actorOrSystem ?? {} };
  const system = actor.system ?? {};
  const key = String(path ?? "").replace(/^system\./, "");
  const level = Math.max(1, Number(system.identity?.level) || 1);

  if (key === "identity.name") return { matched: true, value: actor.name ?? "", readOnly: true, sourcePath: "name" };
  const attributeMatch = key.match(/^attributes\.([^.]+)\.(name|exib|value|description)$/);
  if (attributeMatch) {
    const definition = NEXUS_ATTRIBUTES.find(attribute => attribute.key === attributeMatch[1]);
    if (!definition) return { matched: false };
    const member = attributeMatch[2];
    const value = member === "name" ? definition.name
      : member === "exib" ? definition.exib
      : member === "description" ? definition.description
      : Number(system.attributes?.[definition.key]) || 0;
    return { matched: true, value, readOnly: member !== "value", sourcePath: member === "value" ? `attributes.${definition.key}` : undefined };
  }

  const skillMatch = key.match(/^skills\.([^.]+)(?:\.(.+))?$/);
  if (skillMatch) {
    const definition = NEXUS_SKILLS.find(skill => skill.key === skillMatch[1] || skill.legacyKey === skillMatch[1]);
    const row = definition ? getNexusSkillRows(actor).find(skill => skill.key === definition.key) : null;
    const member = skillMatch[2];
    if (row && (!member || Object.hasOwn(row, member))) {
      return {
        matched: true,
        value: member ? row[member] : row,
        readOnly: !["proficientLevel", "description", "formula"].includes(member),
        sourcePath: member ? `skills.${definition.key}.${member}` : undefined
      };
    }
  }

  const resourceMatch = key.match(/^resources\.(pv|pm|pe)\.(name|exib)$/);
  if (resourceMatch) {
    const resource = RESOURCE_DEFINITIONS.find(item => item.key === resourceMatch[1]);
    if (resource) return { matched: true, value: resourceMatch[2] === "name" ? resource.name : resource.exib, readOnly: true };
  }

  if (["progression.mb.value", "combat.mb", "combat.mb.value"].includes(key)) {
    return { matched: true, value: getNexusBaseModifier(system), readOnly: true };
  }
  if (["combat.defense", "combat.defense.value"].includes(key)) {
    return { matched: true, value: 8 + (Number(system.attributes?.des) || 0) + (Number(system.combat?.defenseModifier) || 0), readOnly: true };
  }
  if (key === "combat.initiative.value") {
    return { matched: true, value: Number(system.attributes?.des) || 0, readOnly: true };
  }
  if (["combat.movement", "combat.movement.value", "combat.desl"].includes(key)) {
    return { matched: true, value: Number(system.combat?.movement ?? system.combat?.desl) || 0, sourcePath: "combat.movement" };
  }
  if (key === "combat.movement.meters") {
    return { matched: true, value: (Number(system.combat?.movement ?? system.combat?.desl) || 0) * 1.5, readOnly: true };
  }
  if (["recovery.count.value", "combat.ddr"].includes(key)) {
    return { matched: true, value: level, readOnly: true };
  }
  if (key === "recovery.die.value") {
    const die = [4, 6, 8, 10, 12][Math.min(4, Math.floor((level - 1) / 2))];
    return { matched: true, value: "d" + die, readOnly: true };
  }
  if (key === "recovery.available.value") {
    return { matched: true, value: Math.max(0, level - (Number(system.recovery?.spent) || 0)), readOnly: true };
  }
  if (key === "resources.pe.recovery.value") {
    return { matched: true, value: getNexusBaseModifier(system) * 4, readOnly: true };
  }

  const strength = Number(system.attributes?.for) || 0;
  const base = 5;
  const bonus = strength * 2;
  const capacity = base + bonus;
  if (key === "encumbrance.base.value") return { matched: true, value: base, readOnly: true };
  if (key === "encumbrance.bonus.value") return { matched: true, value: bonus, readOnly: true };
  if (key === "encumbrance.capacity.value") return { matched: true, value: capacity, readOnly: true };
  if (key === "encumbrance.current.value") return { matched: true, value: Number(system.encumbrance?.current) || 0, sourcePath: "encumbrance.current" };
  if (key === "encumbrance.overloaded.value") return { matched: true, value: (Number(system.encumbrance?.current) || 0) > capacity, readOnly: true };

  return { matched: false };
}

export function getNexusResourceDefinition(key) {
  return RESOURCE_DEFINITIONS.find(resource => resource.key === key) ?? null;
}

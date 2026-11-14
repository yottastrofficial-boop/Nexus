import { NEXUS_ATTRIBUTES, NEXUS_SKILLS } from "./skills.js";

/**
 * Canonical property registry for the NEXUS core rules.
 * Rule mechanics come from REGRAS NEXUS.pdf; display abbreviations are UI metadata.
 * Stored values remain separate from derived/read-only presentation properties.
 */
export const NEXUS_PROPERTY_SCHEMA_VERSION = 2;

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
  { path: "combat.defense.value", label: "Defesa", exib: "DEF", type: "number", derived: true, description: "Defesa Base: 8 + Destreza + modificadores aplicáveis." },
  { path: "combat.initiative.value", label: "Iniciativa", exib: "INI", type: "number", derived: true, description: "Teste de Destreza usado para definir a ordem dos turnos." },
  { path: "combat.movement.value", label: "Deslocamento", exib: "DESL", type: "number", description: "Deslocamento definido pela Ancestralidade; o valor armazenado é expresso em espaços de grade." },
  { path: "progression.mb.value", label: "Modificador Base", exib: "MB", type: "number", derived: true, description: "MB = nível ÷ 2, arredondado para cima, limitado a +5." },
  { path: "recovery.count.value", label: "Dados de Recuperação", exib: "DdR", type: "number", derived: true, description: "Quantidade igual ao nível do personagem." },
  { path: "recovery.die.value", label: "Dado de Recuperação", exib: "Dado", type: "string", derived: true, description: "Evolui a cada 2 níveis: d4, d6, d8, d10 e d12." }
]);

const definitions = [
  ...NEXUS_ATTRIBUTES.flatMap(attribute => [
    { path: `attributes.${attribute.key}.name`, label: attribute.name, exib: attribute.code, type: "string", category: "attributes", derived: true },
    { path: `attributes.${attribute.key}.exib`, label: `${attribute.name} · Exibição`, exib: attribute.code, type: "string", category: "attributes", derived: true },
    { path: `attributes.${attribute.key}.value`, label: `${attribute.name} · Valor`, exib: attribute.code, type: "number", category: "attributes", derived: true }
  ]),
  ...NEXUS_SKILLS.flatMap(skill => [
    { path: `skills.${skill.key}.name`, label: `${skill.name} · Nome`, exib: skill.exib, type: "string", category: "skills", derived: true },
    { path: `skills.${skill.key}.exib`, label: `${skill.name} · Exibição`, exib: skill.exib, type: "string", category: "skills", derived: true },
    { path: `skills.${skill.key}.value`, label: `${skill.name} · Valor`, exib: skill.exib, type: "number", category: "skills", derived: true },
    { path: `skills.${skill.key}.proficient`, label: `${skill.name} · Proficiência`, exib: skill.exib, type: "boolean", category: "skills", derived: false },
    { path: `skills.${skill.key}.attribute`, label: `${skill.name} · Atributo`, exib: skill.attribute, type: "string", category: "skills", derived: true },
    { path: `skills.${skill.key}.description`, label: `${skill.name} · Descrição`, exib: skill.exib, type: "string", category: "skills", derived: true }
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

export function getNexusResourceDefinition(key) {
  return RESOURCE_DEFINITIONS.find(resource => resource.key === key) ?? null;
}

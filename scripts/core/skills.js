import { evaluateNexusFormula, evaluateNexusExpression } from "./formula-engine.js";

/**
 * Regras-base de atributos e perícias do NEXUS.
 * Fonte: REGRAS NEXUS.pdf, Capítulo 7 — Atributos, Perícias e Testes de Rolagem.
 * Chaves técnicas em inglês; nomes apresentados ao usuário em português.
 */
export const NEXUS_SKILLS = Object.freeze([
  { key: "athletics", legacyKey: "atletismo", name: "Atletismo", exib: "ATL", attributeKey: "for", attribute: "FOR", attributeName: "Força", description: "Esforços físicos intensos como correr, escalar, nadar, saltar, empurrar ou levantar peso." },
  { key: "endurance", legacyKey: "vigor", name: "Vigor", exib: "VIG", attributeKey: "for", attribute: "FOR", attributeName: "Força", description: "Suportar fadiga, dor, esforço prolongado e continuar agindo mesmo sob desgaste físico." },
  { key: "combat", legacyKey: "combate", name: "Combate", exib: "COM", attributeKey: "for", attribute: "FOR", attributeName: "Força", description: "Competência geral para testes de Combate definidos pelas regras do NEXUS." },
  { key: "acrobatics", legacyKey: "acrobacia", name: "Acrobacia", exib: "ACR", attributeKey: "des", attribute: "DES", attributeName: "Destreza", description: "Equilíbrio, cambalhotas, quedas controladas, manobras ágeis e movimentos precisos." },
  { key: "stealth", legacyKey: "furtividade", name: "Furtividade", exib: "FUR", attributeKey: "des", attribute: "DES", attributeName: "Destreza", description: "Mover-se sem ser percebido, esconder-se, evitar rastreamento ou reduzir ruídos." },
  { key: "sleight_of_hand", legacyKey: "astucia", name: "Astúcia", exib: "AST", attributeKey: "des", attribute: "DES", attributeName: "Destreza", description: "Abrir fechaduras, ladinagem, desarmar armadilhas, manipular mecanismos simples ou complexos." },
  { key: "nature", legacyKey: "natureza", name: "Natureza", exib: "NAT", attributeKey: "sab", attribute: "SAB", attributeName: "Sabedoria", description: "Reconhecer fauna, flora, terrenos, climas e fenômenos naturais ou mágicos ambientais." },
  { key: "perception", legacyKey: "percepcao", name: "Percepção", exib: "PER", attributeKey: "sab", attribute: "SAB", attributeName: "Sabedoria", description: "Notar detalhes, armadilhas, sons, movimentos ou mudanças no ambiente ativamente." },
  { key: "survival", legacyKey: "sobrevivencia", name: "Sobrevivência", exib: "SOB", attributeKey: "sab", attribute: "SAB", attributeName: "Sabedoria", description: "Caçar, rastrear, encontrar abrigo, comida e água em ambientes naturais." },
  { key: "history", legacyKey: "historia", name: "História", exib: "HIS", attributeKey: "int", attribute: "INT", attributeName: "Inteligência", description: "Conhecimento sobre eventos passados, culturas, impérios, lendas e registros antigos." },
  { key: "investigation", legacyKey: "investigacao", name: "Investigação", exib: "INV", attributeKey: "int", attribute: "INT", attributeName: "Inteligência", description: "Analisar pistas, deduzir informações, resolver enigmas ou reconstruir eventos." },
  { key: "medicine", legacyKey: "medicina", name: "Medicina", exib: "MED", attributeKey: "int", attribute: "INT", attributeName: "Inteligência", description: "Diagnosticar ferimentos, tratar doenças, estabilizar feridos e aplicar primeiros socorros." },
  { key: "performance", legacyKey: "atuacao", name: "Atuação", exib: "ATU", attributeKey: "car", attribute: "CAR", attributeName: "Carisma", description: "Atuar, disfarçar identidades, fingir emoções ou comportamentos e realizar apresentações artísticas." },
  { key: "influence", legacyKey: "influencia", name: "Influência", exib: "INF", attributeKey: "car", attribute: "CAR", attributeName: "Carisma", description: "Convencer, negociar, inspirar, mentir, blefar ou manipular opiniões e decisões diplomáticas." },
  { key: "presence", legacyKey: "presenca", name: "Presença", exib: "PRE", attributeKey: "car", attribute: "CAR", attributeName: "Carisma", description: "Projetar autoridade, confiança e liderança natural, impondo respeito pela postura e força de espírito." },
  { key: "discipline", legacyKey: "disciplina", name: "Disciplina", exib: "DIS", attributeKey: "von", attribute: "VON", attributeName: "Vontade", description: "Resistir à dor, emoções, distrações ou pressão." },
  { key: "tenacity", legacyKey: "tenacidade", name: "Tenacidade", exib: "TEN", attributeKey: "von", attribute: "VON", attributeName: "Vontade", description: "Resistir a doenças, mazelas, efeitos debilitantes ou condições adversas." },
  { key: "instinct", legacyKey: "instinto", name: "Instinto", exib: "INS", attributeKey: "von", attribute: "VON", attributeName: "Vontade", description: "Perceber perigos, intuição, intenções, oportunidades ou situações sem precisar analisá-las." }
]);

export const NEXUS_ATTRIBUTES = Object.freeze([
  { key: "for", code: "FOR", exib: "FOR", name: "Força", nucleus: "body", description: "Força física e capacidade de sustentar esforços, levantar ou mover objetos." },
  { key: "des", code: "DES", exib: "DES", name: "Destreza", nucleus: "body", description: "Agilidade, coordenação, reflexos e precisão em ações delicadas ou rápidas." },
  { key: "sab", code: "SAB", exib: "SAB", name: "Sabedoria", nucleus: "mind", description: "Consciência prática e leitura do ambiente; percepção, bom senso e resistência a enganos." },
  { key: "int", code: "INT", exib: "INT", name: "Inteligência", nucleus: "mind", description: "Raciocínio, memória e conhecimento; enigmas, aprendizado, idiomas e estratégias." },
  { key: "car", code: "CAR", exib: "CAR", name: "Carisma", nucleus: "soul", description: "Presença, expressão e influência social; persuasão, liderança, negociação e conexões." },
  { key: "von", code: "VON", exib: "VON", name: "Vontade", nucleus: "soul", description: "Determinação e autocontrole; resistência a medo, dor, pressão e influência externa." }
]);

export function normalizeNexusProficientLevel(rawLevel) {
  if (rawLevel === true) return 1;
  if (rawLevel === false || rawLevel === null || rawLevel === undefined || rawLevel === "") return 0;
  const value = Number(rawLevel);
  return Number.isFinite(value) ? value : 0;
}

export function getNexusBaseModifier(actorOrSystem, depth = 0) {
  const actor = actorOrSystem?.system ? actorOrSystem : null;
  const system = actor?.system ?? actorOrSystem ?? {};
  const stored = system.progression?.mb?.value ?? system.combat?.mb;
  if (stored !== undefined && stored !== null && Number.isFinite(Number(stored))) return Number(stored);
  const expressions = actor?.getFlag?.("nexus", "propertyExpressions") ?? actor?.flags?.nexus?.propertyExpressions ?? system.flags?.nexus?.propertyExpressions ?? {};
  const formula = expressions?.progression?.mb?.value ?? expressions?.combat?.mb;
  if (typeof formula === "string" && formula.trim() && depth < 8) {
    const source = formula.trim().replace(/^\{\{\s*([\s\S]*?)\s*\}\}$/, "$1");
    const calculated = evaluateNexusExpression(source, identifier => {
      const key = String(identifier ?? "").replace(/^@/, "").replace(/^system\./, "").toLocaleLowerCase("pt-BR");
      if (["identity.level", "level"].includes(key)) return Math.max(1, Number(system.identity?.level) || 1);
      if (["combat.mb", "progression.mb.value", "mb"].includes(key)) return Math.min(5, Math.ceil(Math.max(1, Number(system.identity?.level) || 1) / 2));
      const attributeMatch = key.match(/^(?:attributes\.)?(for|des|sab|int|car|von)(?:\.value)?$/);
      if (attributeMatch) return getNexusAttributeValue(actorOrSystem, attributeMatch[1]);
      const parts = key.split(".");
      if (parts.some(part => ["__proto__", "prototype", "constructor"].includes(part))) return undefined;
      const raw = parts.reduce((value, part) => value?.[part], system);
      const resolved = raw && typeof raw === "object" && Object.hasOwn(raw, "value") ? raw.value : raw;
      return ["string", "number", "boolean"].includes(typeof resolved) ? resolved : undefined;
    });
    if (typeof calculated === "number" && Number.isFinite(calculated)) return calculated;
  }
  const level = Math.max(1, Number(system.identity?.level) || 1);
  return Math.min(5, Math.ceil(level / 2));
}

function getStoredProficientLevel(system, skill) {
  const current = system.skills?.[skill.key];
  const legacy = system.skills?.[skill.legacyKey];
  const stored = current?.proficientLevel ?? current?.proficient ?? current?.proficiency
    ?? legacy?.proficientLevel ?? legacy?.proficient ?? legacy?.proficiency ?? false;
  return normalizeNexusProficientLevel(stored);
}

/** Reads scalar, nested and expression-backed attributes without changing stored data. */
export function getNexusAttributeValue(actorOrSystem, attributeKey, depth = 0) {
  const system = actorOrSystem?.system ?? actorOrSystem ?? {};
  const expressions = actorOrSystem?.getFlag?.("nexus", "propertyExpressions")
    ?? actorOrSystem?.flags?.nexus?.propertyExpressions
    ?? system.flags?.nexus?.propertyExpressions
    ?? {};
  const expression = expressions?.attributes?.[attributeKey]?.value
    ?? expressions?.attributes?.[attributeKey];
  if (typeof expression === "string" && expression.trim() && depth < 8) {
    const source = expression.trim().replace(/^\{\{\s*([\s\S]*?)\s*\}\}$/, "$1");
    const calculated = evaluateNexusExpression(source, identifier => {
      const key = String(identifier ?? "").replace(/^@/, "").toLocaleLowerCase("pt-BR");
      const normalized = key.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
      const attributeMatch = normalized.match(/^(?:attributes\.)?(for|des|sab|int|car|von)(?:\.value)?$/);
      if (attributeMatch) return getNexusAttributeValue(actorOrSystem, attributeMatch[1], depth + 1);
      if (["mb", "combat.mb", "progression.mb.value"].includes(normalized)) return getNexusBaseModifier(system);
      if (["identity.level", "level"].includes(normalized)) return Math.max(1, Number(system.identity?.level) || 1);
      const parts = key.replace(/^system\./, "").split(".");
      if (parts.some(part => ["__proto__", "prototype", "constructor"].includes(part))) return undefined;
      const raw = parts.reduce((value, part) => value?.[part], system);
      const resolved = raw && typeof raw === "object" && Object.hasOwn(raw, "value") ? raw.value : raw;
      return ["string", "number", "boolean"].includes(typeof resolved) ? resolved : undefined;
    });
    if (typeof calculated === "number" && Number.isFinite(calculated)) return calculated;
  }
  const stored = system.attributes?.[attributeKey];
  const raw = stored && typeof stored === "object" && Object.hasOwn(stored, "value") ? stored.value : stored;
  const value = Number(raw);
  return Number.isFinite(value) ? value : 0;
}

function readSafeFormulaPath(root, path) {
  const parts = String(path ?? "").replace(/^system\./, "").split(".");
  if (!parts.length || parts.some(part => ["__proto__", "prototype", "constructor"].includes(part))) return undefined;
  const raw = parts.reduce((value, part) => value?.[part], root);
  const value = raw && typeof raw === "object" && Object.hasOwn(raw, "value") ? raw.value : raw;
  return ["string", "number", "boolean"].includes(typeof value) ? value : undefined;
}
/** Evaluates skill formulas with the same canonical property paths used by the Inspector. */
export function evaluateNexusSkillFormula(actorOrSystem, skillKey, formula) {
  const skill = NEXUS_SKILLS.find(item => item.key === skillKey || item.legacyKey === skillKey);
  if (!skill) return null;
  const system = actorOrSystem?.system ?? actorOrSystem ?? {};
  const source = String(formula ?? "").trim().replace(/^\{\{\s*([\s\S]*?)\s*\}\}$/, "$1").replace(/força/giu, "forca").replace(/proficiência/giu, "proficiencia").replace(/inteligência/giu, "inteligencia");
  if (!source || source.length > 500) return null;
  const resolve = identifier => {
    const key = String(identifier ?? "").replace(/^@/, "").replace(/^system\./, "")
      .toLocaleLowerCase("pt-BR").normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    const aliases = {
      level:"identity.level", nivel:"identity.level", mb:"combat.mb",
      for:`attributes.${skill.attributeKey}.value`, forca:`attributes.${skill.attributeKey}.value`,
      atributo:`attributes.${skill.attributeKey}.value`, attribute:`attributes.${skill.attributeKey}.value`,
    };
    if (["proficiencia","proficiency","proficient"].includes(key)) return Math.sign(getStoredProficientLevel(system, skill));
    if (["proficientlevel","proficiencylevel"].includes(key)) return getStoredProficientLevel(system, skill);
    if (key === "bonus") return Math.sign(getStoredProficientLevel(system, skill)) * getNexusBaseModifier(actorOrSystem);
    const path = aliases[key] ?? key;
    if (path === "identity.level") return Math.max(1, Number(system.identity?.level) || 1);
    if (["combat.mb","progression.mb.value"].includes(path)) return getNexusBaseModifier(actorOrSystem);
    const attributeMatch = path.match(/^attributes\.([a-z_]+)\.value$/);
    if (attributeMatch && NEXUS_ATTRIBUTES.some(item => item.key === attributeMatch[1])) return getNexusAttributeValue(actorOrSystem, attributeMatch[1]);
    const skillMatch = path.match(/^skills\.([a-z0-9_-]+)\.([a-zA-Z]+)$/);
    if (skillMatch) {
      const targetSkill = NEXUS_SKILLS.find(item => item.key === skillMatch[1] || item.legacyKey === skillMatch[1]);
      if (targetSkill) {
        const targetProficiency = getStoredProficientLevel(system, targetSkill);
        const targetAttribute = getNexusAttributeValue(actorOrSystem, targetSkill.attributeKey);
        const targetBonus = Math.sign(targetProficiency) * getNexusBaseModifier(actorOrSystem);
        if (skillMatch[2].toLowerCase() === "proficientlevel") return targetProficiency;
        if (skillMatch[2].toLowerCase() === "proficient") return targetProficiency > 0;
        if (skillMatch[2].toLowerCase() === "bonus") return targetBonus;
        if (["value","modifier"].includes(skillMatch[2].toLowerCase())) return targetAttribute + targetBonus;
        if (skillMatch[2].toLowerCase() === "attributevalue") return targetAttribute;
      }
    }
    return readSafeFormulaPath(system, path);
  };
  return evaluateNexusFormula(source, resolve);
}
export function getNexusDefaultSkillFormula() {
  // Compatibility API: the Core intentionally does not inject user-editable formulas.
  return "";
}

export function getNexusSkillRows(actor) {
  const system = actor?.system ?? {};
  const baseModifier = getNexusBaseModifier(actor);
  return NEXUS_SKILLS.map(skill => {
    const attributeValue = getNexusAttributeValue(actor, skill.attributeKey);
    const proficientLevel = getStoredProficientLevel(system, skill);
    const bonus = Math.sign(proficientLevel) * baseModifier;
    const defaultModifier = attributeValue + bonus;
    const storedFormula = String(system.skills?.[skill.key]?.formula ?? "").trim();
    const formula = storedFormula;
    const formulaValue = formula ? evaluateNexusSkillFormula(actor, skill.key, formula) : null;
    const storedValue = system.skills?.[skill.key]?.value ?? system.skills?.[skill.legacyKey]?.value;
    const numericStoredValue = storedValue === undefined || storedValue === null || storedValue === "" ? 0 : Number(storedValue);
    const modifier = formulaValue ?? (Number.isFinite(numericStoredValue) ? numericStoredValue : 0);
    return { ...skill, attributeValue, proficientLevel, proficient: proficientLevel > 0, modifier, value: modifier, formula,
      description: typeof system.skills?.[skill.key]?.description === "string" ? system.skills[skill.key].description : skill.description,
      formatted: modifier >= 0 ? "+" + modifier : String(modifier), bonus };
  });
}
export function getNexusSkillModifier(actor, skillKey) {
  const row = getNexusSkillRows(actor).find(item => item.key === skillKey);
  return row ? { ...row, skill: NEXUS_SKILLS.find(item => item.key === skillKey), baseModifier: getNexusBaseModifier(actor) } : null;
}

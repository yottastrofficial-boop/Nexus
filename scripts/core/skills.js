/**
 * Regras-base de atributos e perícias do NEXUS.
 * Fonte: REGRAS NEXUS.pdf, Capítulo 7 — Atributos, Perícias e Testes de Rolagem.
 * Chaves técnicas em inglês; nomes apresentados ao usuário em português.
 */
export const NEXUS_SKILLS = Object.freeze([
  { key: "athletics", legacyKey: "atletismo", name: "Atletismo", attributeKey: "for", attribute: "FOR", attributeName: "Força", description: "Esforços físicos intensos como correr, escalar, nadar, saltar, empurrar ou levantar peso." },
  { key: "endurance", legacyKey: "vigor", name: "Vigor", attributeKey: "for", attribute: "FOR", attributeName: "Força", description: "Suportar fadiga, dor, esforço prolongado e continuar agindo mesmo sob desgaste físico." },
  { key: "combat", legacyKey: "combate", name: "Combate", attributeKey: "for", attribute: "FOR", attributeName: "Força", description: "Uso eficaz de força bruta em confrontos, golpes diretos, disputa corporal e impacto." },
  { key: "acrobatics", legacyKey: "acrobacia", name: "Acrobacia", attributeKey: "des", attribute: "DES", attributeName: "Destreza", description: "Equilíbrio, cambalhotas, quedas controladas, manobras ágeis e movimentos precisos." },
  { key: "stealth", legacyKey: "furtividade", name: "Furtividade", attributeKey: "des", attribute: "DES", attributeName: "Destreza", description: "Mover-se sem ser percebido, esconder-se, evitar rastreamento ou reduzir ruídos." },
  { key: "sleight_of_hand", legacyKey: "astucia", name: "Astúcia", attributeKey: "des", attribute: "DES", attributeName: "Destreza", description: "Abrir fechaduras, ladinagem, desarmar armadilhas, manipular mecanismos simples ou complexos." },
  { key: "nature", legacyKey: "natureza", name: "Natureza", attributeKey: "sab", attribute: "SAB", attributeName: "Sabedoria", description: "Reconhecer fauna, flora, terrenos, climas e fenômenos naturais ou mágicos ambientais." },
  { key: "perception", legacyKey: "percepcao", name: "Percepção", attributeKey: "sab", attribute: "SAB", attributeName: "Sabedoria", description: "Notar detalhes, armadilhas, sons, movimentos ou mudanças no ambiente ativamente." },
  { key: "survival", legacyKey: "sobrevivencia", name: "Sobrevivência", attributeKey: "sab", attribute: "SAB", attributeName: "Sabedoria", description: "Caçar, rastrear, encontrar abrigo, comida e água em ambientes naturais." },
  { key: "history", legacyKey: "historia", name: "História", attributeKey: "int", attribute: "INT", attributeName: "Inteligência", description: "Conhecimento sobre eventos passados, culturas, impérios, lendas e registros antigos." },
  { key: "investigation", legacyKey: "investigacao", name: "Investigação", attributeKey: "int", attribute: "INT", attributeName: "Inteligência", description: "Analisar pistas, deduzir informações, resolver enigmas ou reconstruir eventos." },
  { key: "medicine", legacyKey: "medicina", name: "Medicina", attributeKey: "int", attribute: "INT", attributeName: "Inteligência", description: "Diagnosticar ferimentos, tratar doenças, estabilizar feridos e aplicar primeiros socorros." },
  { key: "performance", legacyKey: "atuacao", name: "Atuação", attributeKey: "car", attribute: "CAR", attributeName: "Carisma", description: "Atuar, disfarçar identidades, fingir emoções ou comportamentos e realizar apresentações artísticas." },
  { key: "influence", legacyKey: "influencia", name: "Influência", attributeKey: "car", attribute: "CAR", attributeName: "Carisma", description: "Convencer, negociar, inspirar, mentir, blefar ou manipular opiniões e decisões diplomáticas." },
  { key: "presence", legacyKey: "presenca", name: "Presença", attributeKey: "car", attribute: "CAR", attributeName: "Carisma", description: "Projetar autoridade, confiança e liderança natural, impondo respeito pela postura e força de espírito." },
  { key: "discipline", legacyKey: "disciplina", name: "Disciplina", attributeKey: "von", attribute: "VON", attributeName: "Vontade", description: "Resistir à dor, emoções, distrações ou pressão." },
  { key: "tenacity", legacyKey: "tenacidade", name: "Tenacidade", attributeKey: "von", attribute: "VON", attributeName: "Vontade", description: "Resistir a doenças, mazelas, efeitos debilitantes ou condições adversas." },
  { key: "instinct", legacyKey: "instinto", name: "Instinto", attributeKey: "von", attribute: "VON", attributeName: "Vontade", description: "Perceber perigos, intuição, intenções, oportunidades ou situações sem precisar analisá-las." }
]);

export const NEXUS_ATTRIBUTES = Object.freeze([
  { key: "for", code: "FOR", name: "Força", nucleus: "body" },
  { key: "des", code: "DES", name: "Destreza", nucleus: "body" },
  { key: "sab", code: "SAB", name: "Sabedoria", nucleus: "mind" },
  { key: "int", code: "INT", name: "Inteligência", nucleus: "mind" },
  { key: "car", code: "CAR", name: "Carisma", nucleus: "soul" },
  { key: "von", code: "VON", name: "Vontade", nucleus: "soul" }
]);

export function getNexusBaseModifier(actorOrSystem) {
  const system = actorOrSystem?.system ?? actorOrSystem ?? {};
  const level = Math.max(1, Number(system.identity?.level) || 1);
  return Math.min(5, Math.ceil(level / 2));
}

function getStoredProficientLevel(system, skill) {
  const current = system.skills?.[skill.key];
  const legacy = system.skills?.[skill.legacyKey];
  const stored = current?.proficientLevel
    ?? current?.proficiency
    ?? current?.proficient
    ?? legacy?.proficientLevel
    ?? legacy?.proficiency
    ?? legacy?.proficient
    ?? 0;
  if (stored === true) return 1;
  if (stored === false || stored === null || stored === undefined || stored === "") return 0;
  const value = Number(stored);
  return Number.isFinite(value) ? value : 0;
}

export function getNexusSkillRows(actor) {
  const system = actor?.system ?? {};
  const baseModifier = getNexusBaseModifier(system);
  return NEXUS_SKILLS.map(skill => {
    const rawAttribute = Number(system.attributes?.[skill.attributeKey]);
    const attributeValue = Number.isFinite(rawAttribute) ? rawAttribute : 0;
    const proficientLevel = getStoredProficientLevel(system, skill);
    const proficiencySign = Math.sign(proficientLevel);
    const bonus = proficiencySign * baseModifier;
    const modifier = attributeValue + bonus;
    const proficient = proficientLevel > 0;
    const opposed = proficientLevel < 0;
    return {
      ...skill,
      attributeValue,
      proficientLevel,
      proficient,
      opposed,
      proficiency: proficient ? "P" : opposed ? "−P" : "—",
      modifier,
      value: modifier >= 0 ? "+" + modifier : String(modifier),
      bonus
    };
  });
}

export function getNexusSkillModifier(actor, skillKey) {
  const skill = NEXUS_SKILLS.find(item => item.key === skillKey);
  if (!skill) return null;
  const system = actor?.system ?? {};
  const rawAttribute = Number(system.attributes?.[skill.attributeKey]);
  const attributeValue = Number.isFinite(rawAttribute) ? rawAttribute : 0;
  const proficientLevel = getStoredProficientLevel(system, skill);
  const baseModifier = getNexusBaseModifier(system);
  const bonus = Math.sign(proficientLevel) * baseModifier;
  return {
    skill,
    proficientLevel,
    proficient: proficientLevel > 0,
    opposed: proficientLevel < 0,
    attributeValue,
    baseModifier,
    bonus,
    modifier: attributeValue + bonus
  };
}

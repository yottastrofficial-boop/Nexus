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
  return Number.isFinite(value) && value > 0 ? 1 : 0;
}

export function getNexusBaseModifier(actorOrSystem) {
  const system = actorOrSystem?.system ?? actorOrSystem ?? {};
  const level = Math.max(1, Number(system.identity?.level) || 1);
  return Math.min(5, Math.ceil(level / 2));
}

function getStoredProficientLevel(system, skill) {
  const current = system.skills?.[skill.key];
  const legacy = system.skills?.[skill.legacyKey];
  const stored = current?.proficient ?? current?.proficientLevel ?? current?.proficiency
    ?? legacy?.proficient ?? legacy?.proficientLevel ?? legacy?.proficiency ?? false;
  return normalizeNexusProficientLevel(stored);
}

export function getNexusSkillRows(actor) {
  const system = actor?.system ?? {};
  const baseModifier = getNexusBaseModifier(system);
  return NEXUS_SKILLS.map(skill => {
    const rawAttribute = Number(system.attributes?.[skill.attributeKey]);
    const attributeValue = Number.isFinite(rawAttribute) ? rawAttribute : 0;
    const proficientLevel = getStoredProficientLevel(system, skill);
    const bonus = proficientLevel * baseModifier;
    const modifier = attributeValue + bonus;
    const proficient = proficientLevel > 0;
    return {
      ...skill,
      attributeValue,
      proficientLevel,
      proficient,
      modifier,
      value: modifier,
      formatted: modifier >= 0 ? "+" + modifier : String(modifier),
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
  const bonus = proficientLevel * baseModifier;
  return {
    skill,
    proficientLevel,
    proficient: proficientLevel > 0,
    attributeValue,
    baseModifier,
    bonus,
    modifier: attributeValue + bonus,
    value: attributeValue + bonus,
    exib: skill.exib
  };
}

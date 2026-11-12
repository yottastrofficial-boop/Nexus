/**
 * Regras-base de atributos e perícias do NEXUS.
 * Fonte: REGRAS NEXUS.pdf, Capítulo 7 — Atributos, Perícias e Testes de Rolagem.
 */
export const NEXUS_SKILLS = Object.freeze([
  { key: "atletismo", name: "Atletismo", attributeKey: "for", attribute: "FOR", attributeName: "Força", description: "Esforços físicos intensos como correr, escalar, nadar, saltar, empurrar ou levantar peso." },
  { key: "vigor", name: "Vigor", attributeKey: "for", attribute: "FOR", attributeName: "Força", description: "Suportar fadiga, dor, esforço prolongado e continuar agindo mesmo sob desgaste físico." },
  { key: "combate", name: "Combate", attributeKey: "for", attribute: "FOR", attributeName: "Força", description: "Uso eficaz de força bruta em confrontos, golpes diretos, disputa corporal e impacto." },
  { key: "acrobacia", name: "Acrobacia", attributeKey: "des", attribute: "DES", attributeName: "Destreza", description: "Equilíbrio, cambalhotas, quedas controladas, manobras ágeis e movimentos precisos." },
  { key: "furtividade", name: "Furtividade", attributeKey: "des", attribute: "DES", attributeName: "Destreza", description: "Mover-se sem ser percebido, esconder-se, evitar rastreamento ou reduzir ruídos." },
  { key: "astucia", name: "Astúcia", attributeKey: "des", attribute: "DES", attributeName: "Destreza", description: "Abrir fechaduras, ladinagem, desarmar armadilhas, manipular mecanismos simples ou complexos." },
  { key: "natureza", name: "Natureza", attributeKey: "sab", attribute: "SAB", attributeName: "Sabedoria", description: "Reconhecer fauna, flora, terrenos, climas e fenômenos naturais ou mágicos ambientais." },
  { key: "percepcao", name: "Percepção", attributeKey: "sab", attribute: "SAB", attributeName: "Sabedoria", description: "Notar detalhes, armadilhas, sons, movimentos ou mudanças no ambiente ativamente." },
  { key: "sobrevivencia", name: "Sobrevivência", attributeKey: "sab", attribute: "SAB", attributeName: "Sabedoria", description: "Caçar, rastrear, encontrar abrigo, comida e água em ambientes naturais." },
  { key: "historia", name: "História", attributeKey: "int", attribute: "INT", attributeName: "Inteligência", description: "Conhecimento sobre eventos passados, culturas, impérios, lendas e registros antigos." },
  { key: "investigacao", name: "Investigação", attributeKey: "int", attribute: "INT", attributeName: "Inteligência", description: "Analisar pistas, deduzir informações, resolver enigmas ou reconstruir eventos." },
  { key: "medicina", name: "Medicina", attributeKey: "int", attribute: "INT", attributeName: "Inteligência", description: "Diagnosticar ferimentos, tratar doenças, estabilizar feridos e aplicar primeiros socorros." },
  { key: "atuacao", name: "Atuação", attributeKey: "car", attribute: "CAR", attributeName: "Carisma", description: "Atuar, disfarçar identidades, fingir emoções ou comportamentos e realizar apresentações artísticas." },
  { key: "influencia", name: "Influência", attributeKey: "car", attribute: "CAR", attributeName: "Carisma", description: "Convencer, negociar, inspirar, mentir, blefar ou manipular opiniões e decisões diplomáticas." },
  { key: "presenca", name: "Presença", attributeKey: "car", attribute: "CAR", attributeName: "Carisma", description: "Projetar autoridade, confiança e liderança natural, impondo respeito pela postura e força de espírito." },
  { key: "disciplina", name: "Disciplina", attributeKey: "von", attribute: "VON", attributeName: "Vontade", description: "Resistir à dor, emoções, distrações ou pressão." },
  { key: "tenacidade", name: "Tenacidade", attributeKey: "von", attribute: "VON", attributeName: "Vontade", description: "Resistir a doenças, mazelas, efeitos debilitantes ou condições adversas." },
  { key: "instinto", name: "Instinto", attributeKey: "von", attribute: "VON", attributeName: "Vontade", description: "Perceber perigos, intuição, intenções, oportunidades ou situações sem precisar analisá-las." }
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

export function getNexusSkillRows(actor) {
  const system = actor?.system ?? {};
  const baseModifier = getNexusBaseModifier(system);
  return NEXUS_SKILLS.map(skill => {
    const attributeValue = Number(system.attributes?.[skill.attributeKey]) || 0;
    const stored = system.skills?.[skill.key]?.proficient ?? system.skills?.[skill.key]?.proficiency ?? false;
    const proficient = stored === true || (typeof stored === "number" && stored > 0) || (typeof stored === "string" && stored !== "" && stored !== "0");
    const modifier = attributeValue + (proficient ? baseModifier : 0);
    return { ...skill, attributeValue, proficient, proficiency: proficient ? "P" : "—", modifier, value: modifier >= 0 ? "+" + modifier : String(modifier), bonus: proficient ? baseModifier : 0 };
  });
}

export function getNexusSkillModifier(actor, skillKey) {
  const skill = NEXUS_SKILLS.find(item => item.key === skillKey);
  if (!skill) return null;
  const system = actor?.system ?? {};
  const attributeValue = Number(system.attributes?.[skill.attributeKey]) || 0;
  const stored = system.skills?.[skill.key]?.proficient ?? system.skills?.[skill.key]?.proficiency ?? false;
  const proficient = stored === true || (typeof stored === "number" && stored > 0) || (typeof stored === "string" && stored !== "" && stored !== "0");
  const baseModifier = getNexusBaseModifier(system);
  return { skill, proficient, attributeValue, baseModifier, modifier: attributeValue + (proficient ? baseModifier : 0) };
}

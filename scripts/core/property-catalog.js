import { NEXUS_SKILLS, NEXUS_ATTRIBUTES } from "./skills.js";

const ROOT_LABELS = Object.freeze({
  attributes: "Atributos", attribute: "Atributos",
  skills: "Perícias", skill: "Perícias",
  resources: "Recursos", resource: "Recursos",
  combat: "Combate", identity: "Identidade",
  name: "Nome", img: "Imagem", notes: "Anotações"
});
const SEGMENT_LABELS = Object.freeze({
  body: "Corpo", mind: "Mente", soul: "Alma",
  pv: "Pontos de Vida", pm: "Pontos de Mana", pe: "Pontos de Energia",
  defense: "Defesa", movement: "Movimento", desl: "DESL", ddr: "DdR", mb: "MB",
  level: "Nível", lineage: "Linhagem", legacy: "Legado",
  value: "Valor", max: "Máximo", percentage: "Percentual",
  name: "Nome", exib: "Exibição", exibicao: "Exibição",
  checkbonus: "Bônus de teste", roll: "Rolagem",
  modifier: "Modificador", bonus: "Bônus", attribute: "Atributo",
  attributeName: "Nome do atributo", attributeKey: "Chave do atributo",
  attributeValue: "Valor do atributo", proficientLevel: "Nível de proficiência",
  proficient: "Proficiente", opposed: "Oposto", proficiency: "Proficiência",
  description: "Descrição"
});
const SKILL_BY_KEY = new Map(NEXUS_SKILLS.flatMap(skill => [[skill.key, skill], [skill.legacyKey, skill]]));
const ATTRIBUTE_BY_KEY = new Map(NEXUS_ATTRIBUTES.map(attribute => [attribute.key, attribute]));

const humanize = value => String(value ?? "")
  .replace(/([a-z])([A-Z])/g, "$1 $2")
  .replace(/[-_]/g, " ")
  .replace(/\b\w/g, letter => letter.toLocaleUpperCase("pt-BR"));

function canonicalizeSkillPath(path) {
  const parts = String(path).split(".");
  if (parts[0] !== "skills" || !parts[1]) return path;
  const skill = SKILL_BY_KEY.get(parts[1]);
  if (!skill) return path;
  parts[1] = skill.key;
  return parts.join(".");
}

function getSegmentLabel(segment, parent = "") {
  if (parent === "skills") return SKILL_BY_KEY.get(segment)?.name ?? humanize(segment);
  if (parent === "attributes") return ATTRIBUTE_BY_KEY.get(segment)?.name ?? SEGMENT_LABELS[segment] ?? humanize(segment);
  return SEGMENT_LABELS[segment] ?? ROOT_LABELS[segment] ?? humanize(segment);
}

export function buildPropertyPickerCatalog({ paths = [], nativeProperties = [], aliases = [], rollAliases = [] } = {}) {
  const labels = new Map();
  for (const alias of [...nativeProperties, ...aliases]) {
    const key = String(alias?.key ?? "").replace(/^system\./, "");
    if (key && alias?.label) labels.set(key, String(alias.label));
  }

  const allPaths = new Set(paths);
  for (const skill of NEXUS_SKILLS) {
    for (const field of [
      "attribute", "attributeName", "attributeKey", "attributeValue",
      "description", "proficientLevel", "proficient", "opposed",
      "proficiency", "modifier", "value", "bonus"
    ]) allPaths.add("skills." + skill.key + "." + field);
  }

  const entriesByPath = new Map();
  for (const rawPath of allPaths) {
    const path = canonicalizeSkillPath(rawPath);
    if (!path || path.split(".").some(part => ["__proto__", "prototype", "constructor"].includes(part))) continue;
    const parts = path.split(".");
    const skill = parts[0] === "skills" ? SKILL_BY_KEY.get(parts[1]) : null;
    const aliasLabel = labels.get(path);
    const label = aliasLabel || (parts.length > 2 && skill && parts.length === 3
      ? getSegmentLabel(parts[2], parts[1])
      : getSegmentLabel(parts.at(-1), parts.at(-2) ?? ""));
    entriesByPath.set(path, { path, label, segments: parts });
  }

  const root = { path: "", label: "Propriedades", children: new Map(), entry: null };
  for (const entry of entriesByPath.values()) {
    let node = root;
    let parentPath = "";
    for (const segment of entry.segments) {
      const path = parentPath ? parentPath + "." + segment : segment;
      if (!node.children.has(segment)) {
        node.children.set(segment, {
          path,
          segment,
          label: getSegmentLabel(segment, parentPath),
          children: new Map(),
          entry: null
        });
      }
      node = node.children.get(segment);
      parentPath = path;
    }
    node.entry = entry;
  }

  return {
    entries: [...entriesByPath.values()].sort((a, b) => a.label.localeCompare(b.label, "pt-BR")),
    root,
    rollAliases: Array.isArray(rollAliases) ? rollAliases : []
  };
}

export function findPropertyPickerNode(catalog, path = "") {
  let node = catalog?.root;
  for (const segment of String(path).split(".").filter(Boolean)) {
    node = node?.children?.get(segment);
    if (!node) return null;
  }
  return node;
}

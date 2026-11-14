import { NEXUS_SKILLS, NEXUS_ATTRIBUTES } from "./skills.js";

const ROOT_LABELS = Object.freeze({
  attributes: "Atributos",
  skills: "Perícias",
  resources: "Recursos",
  combat: "Combate",
  identity: "Identidade",
  progression: "Progressão",
  name: "Nome",
  img: "Imagem",
  notes: "Anotações",
  custom: "Personalizadas",
  external: "Externas",
  system: "Dados do sistema",
  flags: "Dados do módulo"
});

const NUCLEUS_LABELS = Object.freeze({ body: "Corpo", mind: "Mente", soul: "Alma" });
const SEGMENT_LABELS = Object.freeze({
  pv: "Pontos de Vida",
  pm: "Pontos de Mana",
  pe: "Pontos de Energia",
  defense: "Defesa",
  movement: "Movimento",
  desl: "DESL",
  ddr: "DdR",
  mb: "MB",
  level: "Nível",
  lineage: "Linhagem",
  lineage2: "Linhagem secundária",
  legacy: "Legado",
  current: "Atual",
  currentValue: "Valor atual",
  maximum: "Máximo",
  base: "Base",
  total: "Total",
  enabled: "Ativo",
  active: "Ativo",
  value: "Valor",
  max: "Máximo",
  percentage: "Percentual",
  name: "Nome",
  exib: "Exibição",
  exibicao: "Exibição",
  checkbonus: "Bônus de teste",
  roll: "Rolagem",
  modifier: "Modificador total",
  proficientLevel: "Proficiência",
  description: "Descrição"
});

const DERIVED_SKILL_FIELDS = new Set([
  "name", "attribute", "attributeName", "attributeKey", "attributeValue",
  "description", "proficient", "opposed", "proficiency", "bonus", "value"
]);
const LEGACY_NUCLEUS_PATHS = ["attributes.body", "attributes.mind", "attributes.soul"];
const DUPLICATE_PATHS = ["identity.name"];
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
  if (parent === "attributes") return ATTRIBUTE_BY_KEY.get(segment)?.name ?? NUCLEUS_LABELS[segment] ?? humanize(segment);
  if (parent === "skills") return ATTRIBUTE_BY_KEY.get(segment)?.name ?? SKILL_BY_KEY.get(segment)?.name ?? humanize(segment);
  if (parent.startsWith("skills.")) return SKILL_BY_KEY.get(segment)?.name ?? humanize(segment);
  return SEGMENT_LABELS[segment] ?? ROOT_LABELS[segment] ?? humanize(segment);
}

const isLegacyNucleusPath = path => LEGACY_NUCLEUS_PATHS.some(legacy => path === legacy || path.startsWith(legacy + "."));
const isDuplicatePath = path => DUPLICATE_PATHS.some(duplicate => path === duplicate || path.startsWith(duplicate + "."));

export function buildPropertyPickerCatalog({ paths = [], nativeProperties = [], aliases = [], rollAliases = [] } = {}) {
  const labels = new Map();
  for (const alias of [...nativeProperties, ...aliases]) {
    const key = String(alias?.key ?? "").replace(/^system\./, "");
    if (key && alias?.label) labels.set(key, String(alias.label));
  }

  const entriesByPath = new Map();
  const addEntry = entry => {
    if (!entry?.path || isLegacyNucleusPath(entry.path) || isDuplicatePath(entry.path)) return;
    entriesByPath.set(entry.path, entry);
  };

  // Atributos são seis propriedades numéricas agrupadas em três núcleos.
  // Corpo, Mente e Alma são categorias, não valores independentes.
  for (const attribute of NEXUS_ATTRIBUTES) {
    const path = "attributes." + attribute.key;
    const label = labels.get(path) ?? attribute.name;
    addEntry({
      path,
      label,
      searchLabel: label + " · " + (NUCLEUS_LABELS[attribute.nucleus] ?? attribute.nucleus),
      segments: path.split("."),
      groupPath: "attributes." + attribute.nucleus,
      groupLabels: {
        attributes: "Atributos",
        ["attributes." + attribute.nucleus]: NUCLEUS_LABELS[attribute.nucleus] ?? humanize(attribute.nucleus)
      },
      displaySegment: attribute.key
    });
  }

  // Perícias expõem somente dados úteis: modificador calculado e proficiência.
  // Metadados de apresentação e estados redundantes não viram propriedades.
  for (const skill of NEXUS_SKILLS) {
    const groupPath = "skills." + skill.attributeKey + "." + skill.key;
    const groupLabels = {
      skills: "Perícias",
      ["skills." + skill.attributeKey]: skill.attributeName,
      [groupPath]: skill.name
    };
    for (const [field, label] of [["modifier", "Modificador total"], ["proficientLevel", "Proficiência"]]) {
      const path = "skills." + skill.key + "." + field;
      addEntry({
        path,
        label,
        searchLabel: skill.name + " · " + label,
        segments: path.split("."),
        groupPath,
        groupLabels,
        displaySegment: field
      });
    }
  }

  const allPaths = new Set(paths);
  for (const rawPath of allPaths) {
    const path = canonicalizeSkillPath(rawPath);
    if (!path || path.split(".").some(part => ["__proto__", "prototype", "constructor"].includes(part))) continue;
    if (isLegacyNucleusPath(path) || isDuplicatePath(path) || entriesByPath.has(path)) continue;

    const parts = path.split(".");
    if (parts[0] === "attributes" && ATTRIBUTE_BY_KEY.has(parts[1]) && parts.length === 2) continue;
    if (parts[0] === "skills" && parts.length > 2 && DERIVED_SKILL_FIELDS.has(parts[2])) continue;

    const skill = parts[0] === "skills" ? SKILL_BY_KEY.get(parts[1]) : null;
    const attribute = parts[0] === "attributes" ? ATTRIBUTE_BY_KEY.get(parts[1]) : null;
    if (path === "identity.level") {
      entriesByPath.set(path, { path, label: "Nível", searchLabel: "Nível · Progressão", segments: parts, groupPath: "progression", displaySegment: "level", groupLabels: { progression: "Progressão" } });
      continue;
    }
    const aliasLabel = labels.get(path);
    const label = aliasLabel || getSegmentLabel(parts.at(-1), parts.at(-2) ?? "");
    if (attribute && parts.length > 2) {
      const groupPath = "attributes." + attribute.nucleus + "." + attribute.key;
      entriesByPath.set(path, {
        path, label, searchLabel: attribute.name + " · " + label, segments: parts,
        groupPath, displaySuffix: parts.slice(2),
        groupLabels: {
          attributes: "Atributos",
          ["attributes." + attribute.nucleus]: NUCLEUS_LABELS[attribute.nucleus],
          [groupPath]: attribute.name
        }
      });
    } else if (skill && parts.length > 2) {
      const groupPath = "skills." + skill.attributeKey + "." + skill.key;
      entriesByPath.set(path, {
        path, label, searchLabel: skill.name + " · " + label, segments: parts,
        groupPath, displaySuffix: parts.slice(2),
        groupLabels: {
          skills: "Perícias",
          ["skills." + skill.attributeKey]: skill.attributeName,
          [groupPath]: skill.name
        }
      });
    } else {
      entriesByPath.set(path, { path, label, searchLabel: label, segments: parts });
    }
  }

  const root = { path: "", label: "Propriedades", children: new Map(), entry: null };
  for (const entry of entriesByPath.values()) {
    const displaySegments = entry.groupPath
      ? [...entry.groupPath.split("."), ...(entry.displaySuffix ?? [entry.displaySegment ?? entry.segments.at(-1)])]
      : entry.segments;
    let node = root;
    let parentPath = "";
    displaySegments.forEach((segment, index) => {
      const path = parentPath ? parentPath + "." + segment : segment;
      if (!node.children.has(segment)) {
        const label = index === displaySegments.length - 1
          ? entry.label
          : entry.groupLabels?.[path] ?? getSegmentLabel(segment, parentPath);
        node.children.set(segment, { path, segment, label, children: new Map(), entry: null });
      }
      node = node.children.get(segment);
      parentPath = path;
    });
    node.entry = entry;
  }

  return {
    entries: [...entriesByPath.values()].sort((a, b) => a.searchLabel.localeCompare(b.searchLabel, "pt-BR")),
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

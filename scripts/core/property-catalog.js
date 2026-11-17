import { NEXUS_SKILLS, NEXUS_ATTRIBUTES } from "./skills.js";
import { NEXUS_RULEBOOK_PROPERTY_DEFINITIONS } from "./property-schema.js";
import { createPropertyRegistry } from "./property-registry.js";

const ROOT_LABELS = Object.freeze({
  attributes: "Atributos",
  skills: "Perícias",
  resources: "Recursos",
  combat: "Combate",
  identity: "Identidade",
  progression: "Progressão",
  personality: "Personalidade",
  recovery: "Recuperação",
  encumbrance: "Carga",
  conditions: "Condições",
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
  pe: "Pontos de Esforço",
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
  proficient: "Proficiência",
  formatted: "Valor formatado",
  attribute: "Atributo",
  description: "Descrição",
  meters: "Metros",
  available: "Disponíveis",
  capacity: "Capacidade",
  overloaded: "Excedida",
  spent: "Gastos",
  bonus: "Bônus",
  recovery: "Recuperação"
});

const DERIVED_SKILL_FIELDS = new Set([
  "name", "attribute", "attributeName", "attributeKey", "attributeValue",
  "description", "proficient", "opposed", "proficiency", "bonus", "value", "modifier", "formatted", "exib", "exibicao", "formula"
]);
const LEGACY_NUCLEUS_PATHS = ["attributes.body", "attributes.mind", "attributes.soul"];
const DUPLICATE_PATHS = ["identity.name", "token.img", "token.border"];
const ENCUMBRANCE_FIELD_LABELS = Object.freeze({ base: "Base", bonus: "Bônus", capacity: "Capacidade", current: "Atual", overloaded: "Excedida" });
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
const isDuplicatePath = path => path === "encumbrance.current" || DUPLICATE_PATHS.some(duplicate => path === duplicate || path.startsWith(duplicate + "."));

export function buildPropertyPickerCatalog({ paths = [], nativeProperties = [], aliases = [], rollAliases = [] } = {}) {
  const registry = createPropertyRegistry({ core: NEXUS_RULEBOOK_PROPERTY_DEFINITIONS, native: nativeProperties, custom: aliases, external: paths });
  const labels = new Map(registry.list.map(definition => [definition.path, definition.label]));

  const entriesByPath = new Map();
  const addEntry = entry => {
    if (!entry?.path || isLegacyNucleusPath(entry.path) || isDuplicatePath(entry.path)) return;
    entriesByPath.set(entry.path, entry);
  };

  // Atributos são seis propriedades numéricas agrupadas em três núcleos.
  // Corpo, Mente e Alma são categorias, não valores independentes.
  for (const attribute of NEXUS_ATTRIBUTES) {
    const groupPath = "attributes." + attribute.nucleus + "." + attribute.key;
    const groupLabels = {
      attributes: "Atributos",
      ["attributes." + attribute.nucleus]: NUCLEUS_LABELS[attribute.nucleus] ?? humanize(attribute.nucleus),
      [groupPath]: attribute.name
    };
    for (const [field, label] of [["name", "Nome"], ["exib", "Exibição"], ["value", "Valor"]]) {
      const path = "attributes." + attribute.key + "." + field;
      addEntry({
        path,
        label,
        searchLabel: attribute.name + " · " + label,
        segments: path.split("."),
        groupPath,
        groupLabels,
        displaySegment: field
      });
    }
  }

  // Perícias seguem o modelo do livro-base: metadados de identificação,
  // valor calculado e proficiência numérica assinada.
  for (const skill of NEXUS_SKILLS) {
    const groupPath = "skills." + skill.attributeKey + "." + skill.key;
    const groupLabels = {
      skills: "Perícias",
      ["skills." + skill.attributeKey]: skill.attributeName,
      [groupPath]: skill.name
    };
    for (const [field, label] of [
      ["name", "Nome"], ["exib", "Exibição"], ["value", "Valor"],
      ["proficientLevel", "Proficiência"], ["attribute", "Atributo"], ["description", "Descrição"], ["formula", "Fórmula"]
    ]) {
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

  const allPaths = new Set(registry.list.map(definition => definition.path));
  for (const rawPath of allPaths) {
    const path = canonicalizeSkillPath(rawPath);
    if (!path || path.split(".").some(part => ["__proto__", "prototype", "constructor"].includes(part))) continue;
    if (isLegacyNucleusPath(path) || isDuplicatePath(path) || entriesByPath.has(path)) continue;

    const parts = path.split(".");
    if (parts[0] === "attributes" && ATTRIBUTE_BY_KEY.has(parts[1]) && parts.length === 2) continue;
    if (parts[0] === "skills" && parts.length > 2 && DERIVED_SKILL_FIELDS.has(parts[2])) continue;

    const skill = parts[0] === "skills" ? SKILL_BY_KEY.get(parts[1]) : null;
    const attribute = parts[0] === "attributes" ? ATTRIBUTE_BY_KEY.get(parts[1]) : null;
    if (parts[0] === "encumbrance" && parts.length === 3 && parts[2] === "value" && ENCUMBRANCE_FIELD_LABELS[parts[1]]) {
      const displayLabel = ENCUMBRANCE_FIELD_LABELS[parts[1]];
      entriesByPath.set(path, { path, label: displayLabel, searchLabel: `Carga · ${displayLabel}`, segments: parts, groupPath: "encumbrance", displaySegment: parts[1], groupLabels: { encumbrance: "Carga" } });
      continue;
    }
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

import { NEXUS_SKILLS } from "./skills.js";
const ROOT_ALIASES = Object.freeze({ attribute:"attributes", resource:"resources", skill:"skills" });
const FORMULA_IDENTIFIER_ALIASES = Object.freeze({
  nivel:"identity.level", level:"identity.level", mb:"combat.mb",
  for:"attributes.for.value", des:"attributes.des.value", sab:"attributes.sab.value",
  int:"attributes.int.value", car:"attributes.car.value", von:"attributes.von.value",
  pv:"resources.pv.value", pm:"resources.pm.value", pe:"resources.pe.value",
  def:"combat.defense.value", defesa:"combat.defense.value",
  desl:"combat.movement.value", movimento:"combat.movement.value", ddr:"recovery.count.value"
});
const PROPERTY_PATH_ALIASES = Object.freeze({
  nivel:"identity.level", level:"identity.level", mb:"combat.mb",
  def:"combat.defense.value", defesa:"combat.defense.value",
  desl:"combat.movement.value", movimento:"combat.movement.value", ddr:"recovery.count.value"
});
const ATTRIBUTE_KEYS = new Set(["for","des","sab","int","car","von"]);
const NUCLEUS_KEYS = new Set(["body","mind","soul"]);
const RESOURCE_KEYS = new Set(["pv","pm","pe"]);
const UNSAFE_SEGMENTS = new Set(["__proto__","prototype","constructor"]);
const SKILL_BY_KEY = new Map(NEXUS_SKILLS.flatMap(skill => [[skill.key, skill], [skill.legacyKey, skill]]));
export function normalizeNexusFormulaIdentifier(identifier) {
  const source = String(identifier ?? "").trim();
  const alias = FORMULA_IDENTIFIER_ALIASES[source.toLocaleLowerCase("pt-BR")];
  return normalizeNexusPropertyPath(alias ?? source);
}
export function normalizeNexusPropertyPath(raw) {
  let path = String(raw ?? "").trim();
  const wrapped = path.match(/^\{\{\s*([^{}]+?)\s*\}\}$/);
  if (wrapped) path = wrapped[1].trim();
  path = path.replace(/^@/, "").replace(/^(?:actor\.)?system\./, "").replace(/^actor\./, "");
  if (!path) return "";
  const directAlias = PROPERTY_PATH_ALIASES[path.toLocaleLowerCase("pt-BR")];
  if (directAlias) path = directAlias;
  const parts = path.split(".");
  if (ROOT_ALIASES[parts[0]]) parts[0] = ROOT_ALIASES[parts[0]];
  if (parts[0] === "attributes" && NUCLEUS_KEYS.has(parts[1]) && ATTRIBUTE_KEYS.has(parts[2])) parts.splice(1, 1);
  if (parts[0] === "skills" && ATTRIBUTE_KEYS.has(parts[1]) && parts[2] && SKILL_BY_KEY.has(parts[2])) parts.splice(1, 1);
  if (parts[0] === "skills" && parts[1]) {
    const skill = SKILL_BY_KEY.get(parts[1]);
    if (skill) parts[1] = skill.key;
  }
  if (ATTRIBUTE_KEYS.has(parts[0])) { parts.unshift("attributes"); if (parts.length === 2) parts.push("value"); }
  else if (RESOURCE_KEYS.has(parts[0])) { parts.unshift("resources"); if (parts.length === 2) parts.push("value"); }
  const normalized = parts.join(".");
  if (!/^[a-zA-Z][a-zA-Z0-9_-]*(?:\.[a-zA-Z][a-zA-Z0-9_-]*)*$/.test(normalized)) return "";
  if (parts.some(part => UNSAFE_SEGMENTS.has(part))) return "";
  return normalized;
}

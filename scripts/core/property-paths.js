const ROOT_ALIASES = Object.freeze({ attribute:"attributes", resource:"resources", skill:"skills" });
const FORMULA_IDENTIFIER_ALIASES = Object.freeze({
  nivel:"identity.level", level:"identity.level", mb:"combat.mb",
  for:"attributes.for.value", des:"attributes.des.value", sab:"attributes.sab.value",
  int:"attributes.int.value", car:"attributes.car.value", von:"attributes.von.value",
  pv:"resources.pv.value", pm:"resources.pm.value", pe:"resources.pe.value",
  def:"combat.defense.value", defesa:"combat.defense.value",
  desl:"combat.movement.value", movimento:"combat.movement.value", ddr:"recovery.count.value"
});
const ATTRIBUTE_KEYS = new Set(["for","des","sab","int","car","von"]);
const RESOURCE_KEYS = new Set(["pv","pm","pe"]);
const UNSAFE_SEGMENTS = new Set(["__proto__","prototype","constructor"]);
/** Normalize user-facing property paths into stable NEXUS paths. */
export function normalizeNexusFormulaIdentifier(identifier) {
  const source = String(identifier ?? "").trim();
  const alias = FORMULA_IDENTIFIER_ALIASES[source.toLocaleLowerCase("pt-BR")];
  return normalizeNexusPropertyPath(alias ?? source);
}

/** Normalize user-facing property paths into stable NEXUS paths. */
export function normalizeNexusPropertyPath(raw) {
  let path=String(raw??"").trim();
  const wrapped=path.match(/^\{\{\s*([^{}]+?)\s*\}\}$/);
  if(wrapped)path=wrapped[1].trim();
  path=path.replace(/^@/,"").replace(/^(?:actor\.)?system\./,"").replace(/^actor\./,"");
  if(!path)return "";
  const parts=path.split(".");
  if(ROOT_ALIASES[parts[0]])parts[0]=ROOT_ALIASES[parts[0]];
  if(ATTRIBUTE_KEYS.has(parts[0])){parts.unshift("attributes");if(parts.length===2)parts.push("value");}
  else if(RESOURCE_KEYS.has(parts[0])){parts.unshift("resources");if(parts.length===2)parts.push("value");}
  const normalized=parts.join(".");
  if(!/^[a-zA-Z][a-zA-Z0-9_-]*(?:\.[a-zA-Z][a-zA-Z0-9_-]*)*$/.test(normalized))return "";
  if(parts.some(part=>UNSAFE_SEGMENTS.has(part)))return "";
  return normalized;
}

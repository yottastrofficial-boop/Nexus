const ROOT_ALIASES = Object.freeze({ attribute:"attributes", resource:"resources", skill:"skills" });
const ATTRIBUTE_KEYS = new Set(["for","des","sab","int","car","von"]);
const RESOURCE_KEYS = new Set(["pv","pm","pe"]);
const UNSAFE_SEGMENTS = new Set(["__proto__","prototype","constructor"]);
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

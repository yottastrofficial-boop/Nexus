import assert from "node:assert/strict";
import { readFile, access, readdir } from "node:fs/promises";
import path from "node:path";
import { migrateLegacyActorData } from "../scripts/core/migration-manager.js";

const root = process.cwd();
const read = file => readFile(path.join(root, file), "utf8");
const exists = async file => access(path.join(root, file));
const manifest = JSON.parse(await read("system.json"));
const sheet = await read("scripts/sheets/actor-sheet-v1.0.0.js");
const template = await read("templates/actors/actor-sheet.hbs");
const css = await read("styles/nexus-v1.0.0.css");
const readme = await read("README.md");
const changelog = await read("CHANGELOG.md");

assert.equal(manifest.id, "nexus", "ID do sistema incorreto");
assert.equal(manifest.version, "1.0.0.2", "Versão do manifesto incorreta");
assert.equal(manifest.compatibility.minimum, "14", "Versão mínima do Foundry incorreta");
assert.equal(manifest.compatibility.verified, "14", "Versão verificada do Foundry incorreta");
assert.match(manifest.manifest, /raw\.githubusercontent\.com\/yottastrofficial-boop\/Nexus\/main\/system\.json$/);
assert.match(manifest.download, /releases\/download\/v1\.0\.0\.2\/nexus\.zip$/);

for (const file of [...(manifest.esmodules ?? []), ...(manifest.styles ?? []), ...(manifest.languages ?? []).map(item => item.path)]) {
  await exists(file);
}

const collectJavaScript = async directory => {
  const entries = await readdir(path.join(root, directory), { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const relative = path.join(directory, entry.name);
    if (entry.isDirectory()) files.push(...await collectJavaScript(relative));
    else if (entry.isFile() && entry.name.endsWith(".js")) files.push(relative);
  }
  return files;
};
for (const file of [...await collectJavaScript("scripts"), ...await collectJavaScript("assets")]) {
  const source = await read(file);
  for (const match of source.matchAll(/(?:from\s*|import\s*)["']([^"']+)["']/g)) {
    const specifier = match[1];
    if (specifier.startsWith(".")) await exists(path.relative(root, path.resolve(root, path.dirname(file), specifier)));
  }
}

const actorSheetStart = sheet.indexOf("class NexusActorSheet");
const prepareStart = sheet.indexOf("async _prepareContext(options = {})", actorSheetStart);
const migrationStart = sheet.indexOf("async _migrateLegacyActorData()", prepareStart);
assert.ok(actorSheetStart >= 0 && prepareStart > actorSheetStart && migrationStart > prepareStart, "Ciclo de preparação/migração da ficha não localizado");
const prepareContext = sheet.slice(prepareStart, migrationStart);
assert.doesNotMatch(prepareContext, /\.setFlag\(|\.update\(/, "_prepareContext não deve gravar dados persistentes");
assert.match(sheet, /await this\._migrateLegacyActorData\(\)/, "Migração controlada não está ligada ao ciclo de renderização");


// Exercise the legacy migration manager with a minimal Actor-like document.
const fakeActor = {
  flags: { nexus: {
    activeLayout: "layout-inexistente",
    aliases: [{ id: "alias-1", key: "old.key", targetPath: null }],
    customData: { old: { key: 17 } }
  }},
  writes: 0,
  getFlag(scope, key) { return this.flags[scope]?.[key]; },
  async setFlag(scope, key, value) {
    this.flags[scope] ??= {};
    this.flags[scope][key] = structuredClone(value);
    this.writes++;
  }
};
const getSafePath = (object, keyPath) => String(keyPath).split(".").reduce((value, key) => value?.[key], object);
const setSafePath = (object, keyPath, value) => {
  const parts = String(keyPath).split(".");
  const leaf = parts.pop();
  let target = object;
  for (const part of parts) target = target[part] ??= {};
  target[leaf] = value;
};
const normalizedAliases = [{ id: "alias-1", key: "new.key", targetPath: null }];
const migrationDependencies = {
  actor: fakeActor,
  readLayouts: async () => ({ principal: {} }),
  getAliasDefinitions: () => normalizedAliases,
  getCustomAliasData: actor => actor.getFlag("nexus", "customData") ?? {},
  normalizeAliasDefinition: raw => ({ ...raw, key: "new.key" }),
  invalidateAliasDefinitionCache: () => {},
  getPath: getSafePath,
  clone: value => structuredClone(value),
  setProperty: setSafePath
};
await migrateLegacyActorData(migrationDependencies);
assert.equal(fakeActor.getFlag("nexus", "activeLayout"), "principal");
assert.equal(getSafePath(fakeActor.getFlag("nexus", "customData"), "new.key"), 17);
assert.equal(getSafePath(fakeActor.getFlag("nexus", "customData"), "old.key"), undefined);
assert.equal(fakeActor.getFlag("nexus", "aliases")[0].key, "new.key");
const migrationWriteCount = fakeActor.writes;
await migrateLegacyActorData(migrationDependencies);
assert.equal(fakeActor.writes, migrationWriteCount, "Migração repetida não deve gravar novamente");

assert.match(sheet, /hasBorderRadius: component\.borderRadius !== undefined && component\.borderRadius !== null/);
assert.match(sheet, /hasOpacity: component\.opacity !== undefined && component\.opacity !== null/);
assert.match(template, /#if component\.hasBorderRadius/);
assert.match(template, /#if component\.hasOpacity/);
assert.match(template, /min="0" max="100" data-component-setting="opacity"/);
assert.match(sheet, /component\.opacity=clamp\(Number\.isFinite\(opacity\)\?opacity:100,0,100\)/);

assert.match(sheet, /\[data-component-local-value\]/);
assert.match(sheet, /component\.localValue = String\(input\.value/);
assert.match(sheet, /"text","localValue","placeholder"/);
assert.match(template, /data-component-local-value data-component-id="{{component\.id}}"/);
assert.match(template, /{{component\.localValue}}/);

assert.match(sheet, /\[data-table-cell\]/);
assert.match(sheet, /component\.cells\[index\] = String\(input\.value\)/);
assert.match(sheet, /querySelectorAll\("\[data-component-custom-binding\]"\)/);
assert.equal((template.match(/data-component-custom-binding/g) ?? []).length, 2);

const blockOpen = (template.match(/\{\{#(?:if|unless|each|with)\b/g) ?? []).length;
const blockClose = (template.match(/\{\{\/(?:if|unless|each|with)\}\}/g) ?? []).length;
assert.equal(blockOpen, blockClose, "Blocos Handlebars não estão balanceados");

let depth = 0;
for (const char of css) {
  if (char === "{") depth++;
  if (char === "}") depth--;
  assert.ok(depth >= 0, "CSS fecha um bloco antes de abri-lo");
}
assert.equal(depth, 0, "CSS contém bloco não fechado");

assert.match(readme, /Versão 1\.0\.0\.2/);
assert.match(changelog, /## 1\.0\.0\.2/);

console.log("NEXUS 1.0.0.2: validações estáticas aprovadas.");

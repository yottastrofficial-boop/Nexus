import assert from "node:assert/strict";
import { readFile, access, readdir } from "node:fs/promises";
import path from "node:path";
import { migrateLegacyActorData } from "../scripts/core/migration-manager.js";
import { mergeLayoutSnapshots } from "../scripts/core/layout-merge.js";

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
assert.equal(manifest.version, "1.0.0.4", "Versão do manifesto incorreta");
assert.equal(manifest.compatibility.minimum, "14", "Versão mínima do Foundry incorreta");
assert.equal(manifest.compatibility.verified, "14", "Versão verificada do Foundry incorreta");
assert.match(manifest.manifest, /raw\.githubusercontent\.com\/yottastrofficial-boop\/Nexus\/main\/system\.json$/);
assert.match(manifest.download, /releases\/download\/v1\.0\.0\.3\/nexus\.zip$/);

const entrypoint = await read("scripts/nexus-v1.0.0.js");
const libraryCatalog = await read("assets/library/catalog.js");
assert.match(entrypoint, /Hooks\.on\("preCreateActor"/, "Criação de Actor NEXUS precisa configurar o token de protótipo");
assert.match(entrypoint, /prototypeToken\.actorLink = true/, "Tokens de protótipo NEXUS devem ser vinculados por padrão");
assert.match(entrypoint, /texture: \{ src: actor\.img \|\| DEFAULT_TOKEN_IMAGE \}/, "O token de protótipo precisa de uma imagem utilizável");
assert.match(entrypoint, /Hooks\.on\("preCreateToken"/, "Criação de Token NEXUS precisa preservar o vínculo com o Actor");
assert.match(entrypoint, /token\.updateSource\(changes\)/, "A criação do Token deve aplicar os dados corrigidos");
assert.equal(libraryCatalog.match(/type: "sheet-resource"/g)?.length, 1, "A biblioteca deve conter apenas a barra de vida");
assert.match(libraryCatalog, /label: "Indicador – Barra"/, "A biblioteca deve manter o Indicador – Barra");
assert.match(libraryCatalog, /currentPath: "resources\.pv\.value"/);
assert.match(libraryCatalog, /maxPath: "resources\.pv\.max"/);
assert.match(libraryCatalog, /themes: \[\]/, "A limpeza deve remover os temas de demonstração da biblioteca");
assert.match(sheet, /const availableFolders = NEXUS_LIBRARY_CATALOG\.categories \?\? \[\]/, "As pastas da Biblioteca devem seguir o catálogo ativo");
assert.match(sheet, /const folders = availableFolders\.map\(/, "A Biblioteca não deve manter pastas fixas de demonstração");
assert.doesNotMatch(sheet, /\["standard", "Padrão do sistema · provisório"/, "Pastas antigas não devem permanecer hard-coded");
assert.match(template, /data-library-count>1 elemento</, "A contagem inicial da Biblioteca deve refletir o único asset");
assert.match(template, /<option value="barra">Barra de vida<\/option>/, "O filtro da Biblioteca deve refletir o único tipo disponível");


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
assert.match(sheet, /const migrated = await this\._migrateLegacyActorData\(\)/, "Migração controlada não está ligada ao ciclo de renderização");
assert.match(sheet, /if \(migrated\) \{[\s\S]*?queueMicrotask\(\(\) => this\.render\(\{ force: true \}\)\)/, "A ficha deve atualizar a primeira renderização após migrar dados legados");


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
const firstMigration = await migrateLegacyActorData(migrationDependencies);
assert.equal(firstMigration.changed, true, "Primeira migração deve sinalizar alteração");
assert.equal(fakeActor.getFlag("nexus", "activeLayout"), "principal");
assert.equal(getSafePath(fakeActor.getFlag("nexus", "customData"), "new.key"), 17);
assert.equal(getSafePath(fakeActor.getFlag("nexus", "customData"), "old.key"), undefined);
assert.equal(fakeActor.getFlag("nexus", "aliases")[0].key, "new.key");
const migrationWriteCount = fakeActor.writes;
const secondMigration = await migrateLegacyActorData(migrationDependencies);
assert.equal(secondMigration.changed, false, "Migração repetida não deve sinalizar alteração");
assert.equal(fakeActor.writes, migrationWriteCount, "Migração repetida não deve gravar novamente");


// Three-way persistence merge: preserve edits to separate components and
// layout properties made after the original read snapshot.
const baseLayouts = {
  principal: {
    id: "principal", width: 800,
    components: [
      { id: "component-a", x: 0, y: 0, text: "A" },
      { id: "component-b", x: 10, y: 10, text: "B" }
    ],
    groups: [], links: []
  }
};
const desiredLayouts = structuredClone(baseLayouts);
desiredLayouts.principal.components[0].x = 30;
const latestLayouts = structuredClone(baseLayouts);
latestLayouts.principal.components[1].y = 50;
latestLayouts.principal.width = 920;
const mergedLayouts = mergeLayoutSnapshots(baseLayouts, desiredLayouts, latestLayouts);
assert.equal(mergedLayouts.principal.components.find(item => item.id === "component-a").x, 30);
assert.equal(mergedLayouts.principal.components.find(item => item.id === "component-b").y, 50);
assert.equal(mergedLayouts.principal.width, 920);
assert.match(sheet, /layoutReadSnapshots\.set\(layouts/);
assert.match(sheet, /mergeLayoutSnapshots\(snapshot\.layouts, layouts, latest\)/);
assert.match(sheet, /layoutWriteQueues\.get\(queueKey\)/);

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

assert.match(readme, /Versão 1\.0\.0\.3/);
assert.match(changelog, /## 1\.0\.0\.3/);
assert.match(sheet, /async _rollComponent\(componentId\)/, "Componentes devem executar rolagens configuradas");
assert.match(sheet, /new Roll\(formula, this\.actor\.getRollData\?\.\(\) \?\? \{\}\)/, "A rolagem deve usar os dados do Actor");
assert.match(sheet, /component\.actionType = input\.value === "roll" \? "roll" : ""/, "A ação deve ser configurável por componente");
assert.match(template, /data-action-type="{{component.actionType}}"/, "O card deve expor sua ação configurada");
assert.match(sheet, /if \(!sheet\._selectedIds\.has\(id\)\) setSelection\(\[id\]\)/, "Arrastar um membro não deve reduzir a seleção de grupo");
assert.match(sheet, /_saveSelectedGroupToLibrary\(\)/, "Grupos devem poder ser salvos na Biblioteca");
assert.match(sheet, /_addSavedGroupToCanvas\(groupId\)/, "Grupos salvos devem poder ser inseridos no Canvas");
assert.match(sheet, /showPopover\(\)/, "O seletor de cores deve abrir na camada superior");
assert.match(template, /data-component-setting="textAlign"/, "O Inspector deve oferecer alinhamento de texto");
assert.doesNotMatch(template, /nexus-field-hint/, "Hints redundantes devem ser removidas");

assert.match(template, /data-component-setting="rollFormula"/, "A fórmula deve ser configurável no Inspector");
assert.match(changelog, /Adicionada ação opcional de rolagem configurável no Inspector/);
assert.match(changelog, /Cards inteligentes e composição/);
assert.match(css, /nexus-library-saved-groups/);

console.log("NEXUS 1.0.0.4: validações estáticas aprovadas.");

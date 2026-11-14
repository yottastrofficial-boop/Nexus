import assert from "node:assert/strict";
import { readFile, access, readdir } from "node:fs/promises";
import path from "node:path";
import { migrateLegacyActorData } from "../scripts/core/migration-manager.js";
import { mergeLayoutSnapshots } from "../scripts/core/layout-merge.js";
import { NEXUS_SKILLS, NEXUS_ATTRIBUTES, normalizeNexusProficientLevel, getNexusSkillModifier, getNexusSkillRows } from "../scripts/core/skills.js";
import { buildPropertyPickerCatalog, findPropertyPickerNode } from "../scripts/core/property-catalog.js";
import { getTriggeredActions, executeTriggeredActions, getComponentInteractions, applyInteractionEditorCommand, applyInteractionEditorChange, instantiateInteractionTemplate, getInteractionLibrary, saveInteractionToLibrary } from "../scripts/core/interactions.js";
import { activateCanvasInteractions } from "../scripts/sheets/canvas-interactions.js";

// Runtime smoke tests for the Canvas controller's early lifecycle guards.
assert.doesNotThrow(() => activateCanvasInteractions({}, [], {}), "A render without a root element must exit safely");
assert.doesNotThrow(() => activateCanvasInteractions({}, [{ querySelector: () => null }], {}), "A render without a Canvas must exit safely");

const root = process.cwd();
const read = file => readFile(path.join(root, file), "utf8");
const exists = async file => access(path.join(root, file));
const manifest = JSON.parse(await read("system.json"));
const sheet = await read("scripts/sheets/actor-sheet-v1.0.0.js");
const template = await read("templates/actors/actor-sheet.hbs");
const skills = await read("scripts/core/skills.js");
const css = await read("styles/nexus-v1.0.0.css");
const readme = await read("README.md");
const changelog = await read("CHANGELOG.md");
const interactions = await read("scripts/core/interactions.js");
const propertyCatalog = await read("scripts/core/property-catalog.js");
const propertyPickerView = await read("scripts/sheets/property-picker-view.js");
const panelWindow = await read("scripts/sheets/panel-window.js");
const sheetListeners = await read("scripts/sheets/actor-sheet-listeners.js");
const canvasInteractions = await read("scripts/sheets/canvas-interactions.js");
const themeModule = await read("scripts/core/theme.js");
const libraryView = await read("scripts/sheets/library-view.js");
const actorSheetRendering = await read("scripts/sheets/actor-sheet-rendering.js");
const sheetCode = [sheet, sheetListeners, canvasInteractions, libraryView, actorSheetRendering, propertyPickerView, panelWindow, themeModule].join("\n");

assert.equal(manifest.id, "nexus", "ID do sistema incorreto");
assert.equal(manifest.version, "1.0.0.29", "Versão do manifesto incorreta");
assert.ok(readme.includes("Versão 1.0.0.29"), "README deve identificar a versão publicada");
assert.ok(changelog.startsWith("## 1.0.0.29"), "CHANGELOG deve iniciar pela versão atual");
assert.equal(manifest.compatibility.minimum, "14", "Versão mínima do Foundry incorreta");
assert.match(sheetCode, /activateActorSheetListeners\(this, html/);
assert.match(sheetCode, /buildPropertyPickerCatalog/);
assert.match(sheetCode, /renderPropertyPicker/);
assert.match(sheetCode, /activateCanvasInteractions/);
assert.ok(sheet.length < 300000, "A ficha principal deve permanecer como fachada modular, não como arquivo monolítico");
assert.doesNotMatch(sheetCode, /data-property-list-expand|propertyListExpand/, "O controle antigo de expandir/reduzir deve ser removido");
assert.match(canvasInteractions, /export function activateCanvasInteractions/);
assert.match(canvasInteractions, /deactivateInteraction/);
assert.match(sheetCode, /selectedComponentId \?\? \(this\._selectedIds\.size === 0 \? this\._componentEditorTargetId : null\)/, "O alvo de edição deve sobreviver à limpeza da seleção visual");
assert.match(canvasInteractions, /insidePropertyPicker/, "Cliques no portal do seletor não podem limpar o alvo de edição");
assert.match(sheetListeners, /data-property-category/);
assert.match(propertyCatalog, /NEXUS_SKILLS/);
assert.match(propertyCatalog, /modifier/);
assert.match(propertyPickerView, /propertyCategory/, "O seletor hierárquico deve marcar as opções de categoria");
assert.match(propertyPickerView, /createButton\("", "nexus-property-option"/, "As opções não devem duplicar o rótulo no texto do botão");
assert.match(propertyPickerView, /category\.append\(heading, description, arrow\)/, "Categorias devem separar título, caminho e indicador de navegação");
assert.match(sheetListeners, /pointerdown.*data-property-category/s, "Navegar nas categorias deve manter o foco no campo de origem");
assert.match(sheetListeners, /\.nexus-native-panel-content/, "O estado de rolagem dos painéis deve ser preservado entre renderizações");
assert.match(themeModule, /--nexus-button-active-bg/);
assert.match(themeModule, /--nexus-canvas-scroll-bg/);
assert.match(sheet, /NEXUS_ATTRIBUTES\.map/);
assert.match(sheet, /normalizeNexusProficientLevel/);
assert.match(sheet, /synchronizedSettings/);
assert.match(sheet, /this\._updateLayoutSetting\(\{/);
assert.match(libraryView, /sheet\._librarySection=key/);
assert.match(libraryView, /sheet\._librarySearchQuery/);
assert.match(sheetListeners, /await sheet\._applyThemePreset/);
assert.match(template, /min="-1" max="1" step="1"/);
assert.doesNotMatch(template, /skill\.opposed/);
assert.doesNotMatch(css, /is-opposed/);

assert.equal(NEXUS_ATTRIBUTES.length, 6, "O sistema deve ter seis atributos-base");
assert.deepEqual(
  NEXUS_ATTRIBUTES.map(attribute => attribute.nucleus),
  ["body", "body", "mind", "mind", "soul", "soul"],
  "Os seis atributos devem permanecer agrupados em Corpo, Mente e Alma"
);
const groupedProperties = buildPropertyPickerCatalog({
  paths: [
    "attributes.body", "attributes.mind", "attributes.soul",
    "attributes.for", "attributes.des", "attributes.car",
    "skills.athletics.opposed", "skills.athletics.proficientLevel", "skills.athletics.modifier"
  ]
});
const attributeRoot = findPropertyPickerNode(groupedProperties, "attributes");
assert.deepEqual([...attributeRoot.children.keys()].sort(), ["body", "mind", "soul"], "Atributos devem exibir somente os três núcleos no primeiro nível");
const soulGroup = findPropertyPickerNode(groupedProperties, "attributes.soul");
assert.equal(soulGroup.entry, null, "Alma deve ser um grupo, não um atributo numérico independente");
assert.ok(soulGroup.children.has("car") && soulGroup.children.has("von"), "Carisma e Vontade devem ficar dentro de Alma");
assert.ok(!groupedProperties.entries.some(entry => entry.path === "attributes.soul"), "O antigo caminho agregado de Alma não deve ser sugerido");
const athleticsGroup = findPropertyPickerNode(groupedProperties, "skills.for.athletics");
assert.ok(athleticsGroup.children.has("modifier") && athleticsGroup.children.has("proficientLevel"), "Perícias devem agrupar modificador e proficiência sob a perícia correta");
assert.ok(!groupedProperties.entries.some(entry => entry.path === "skills.athletics.opposed"), "O estado opposed não deve ser oferecido como propriedade");
assert.match(css, /\.nexus-panel-window \.window-header/);
assert.match(css, /\.nexus-sheet \.nexus-canvas-scroll/);
assert.match(panelWindow, /export class NexusPanelWindow/);
assert.match(themeModule, /export const applyThemeTokens/);
assert.match(libraryView, /export function mountLibraryView/);
assert.match(actorSheetRendering, /export function renderActorSheetRichMedia/);
assert.match(actorSheetRendering, /export function renderActorSheetAdaptiveContent/);
assert.match(sheet, /mountLibraryView\(this, panel/);
assert.match(sheet, /renderActorSheetRichMedia\(this, root/);
const propertyTree = buildPropertyPickerCatalog({
  paths: ["attributes.for", "attributes.body", "attributes.body.checkbonus", "skills.athletics.proficient", "skills.atletismo.proficient"],
  nativeProperties: [{ key: "attributes.body", label: "Corpo", type: "attribute" }]
});
assert.equal(propertyTree.root.children.get("attributes").label, "Atributos");
assert.equal(propertyTree.root.children.get("skills").label, "Perícias");
assert.equal(propertyTree.root.children.get("skills").children.get("athletics").label, "Atletismo");
assert.equal(propertyTree.entries.filter(entry => entry.path === "skills.athletics.proficient").length, 1, "Chaves legadas de perícia devem ser canonicalizadas sem duplicação");
assert.equal(propertyTree.entries.find(entry => entry.path === "attributes.body.checkbonus").label, "Bônus de teste");
assert.equal(propertyTree.entries.find(entry => entry.path === "attributes.for").label, "Força");
assert.equal(manifest.compatibility.verified, "14", "Versão verificada do Foundry incorreta");
assert.match(manifest.manifest, /raw\.githubusercontent\.com\/yottastrofficial-boop\/Nexus\/main\/system\.json$/);
assert.ok(manifest.download.endsWith("/releases/download/v1.0.0.29/nexus.zip"), "URL do pacote deve apontar para a versão atual");

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
assert.match(sheetCode, /const availableFolders=NEXUS_LIBRARY_CATALOG\.categories\?\?\[\]/, "As pastas da Biblioteca devem seguir o catálogo ativo");
assert.match(sheetCode, /for\(const \{id,label,icon\} of availableFolders\)/, "A Biblioteca deve montar pastas diretamente do catálogo ativo");
assert.doesNotMatch(sheetCode, /\["standard", "Padrão do sistema · provisório"/, "Pastas antigas não devem permanecer hard-coded");
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
assert.match(sheetCode, /const migrated = await this\._migrateLegacyActorData\(\)/, "Migração controlada não está ligada ao ciclo de renderização");
assert.match(sheetCode, /if \(migrated\) \{[\s\S]*?queueMicrotask\(\(\) => this\.render\(\{ force: true \}\)\)/, "A ficha deve atualizar a primeira renderização após migrar dados legados");


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
assert.match(sheetCode, /layoutReadSnapshots\.set\(layouts/);
assert.match(sheetCode, /mergeLayoutSnapshots\(snapshot\.layouts, layouts, latest\)/);
assert.match(sheetCode, /layoutWriteQueues\.get\(queueKey\)/);

assert.match(sheetCode, /hasBorderRadius: component\.borderRadius !== undefined && component\.borderRadius !== null/);
assert.match(sheetCode, /hasOpacity: component\.opacity !== undefined && component\.opacity !== null/);
assert.match(template, /#if component\.hasBorderRadius/);
assert.match(template, /#if component\.hasOpacity/);
assert.match(template, /min="0" max="100" data-component-setting="opacity"/);
assert.match(sheetCode, /component\.opacity=clamp\(Number\.isFinite\(opacity\)\?opacity:100,0,100\)/);

assert.match(sheetCode, /\[data-component-local-value\]/);
assert.match(sheetCode, /component\.localValue = String\(input\.value/);
assert.match(sheetCode, /"text","localValue","placeholder"/);
assert.match(template, /data-component-local-value data-component-id="{{component\.id}}"/);
assert.match(template, /{{component\.localValue}}/);

assert.match(sheetCode, /\[data-table-cell\]/);
assert.match(sheetCode, /component\.cells\[index\] = String\(input\.value\)/);
assert.match(sheetCode, /querySelectorAll\("\[data-component-custom-binding\]"\)/);
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

assert.ok(readme.includes("Versão 1.0.0.29"));
assert.match(changelog, /## 1\.0\.0\.7/);
assert.match(sheetCode, /async _rollComponent\(componentId, config = \{\}\)/, "Componentes devem executar rolagens configuradas com configuração contextual");
assert.match(sheetCode, /new Roll\(formula, getNexusRollData\(this\.actor\)\)/, "A rolagem deve usar os dados do Actor");
assert.match(sheetCode, /component\.actionType = \["roll","proficiency","resource-slider","toggle-component"\]\.includes\(input\.value\)/, "A ação deve aceitar os tipos contextuais suportados");
assert.match(template, /data-action-type="{{component.actionType}}"/, "O card deve expor sua ação configurada");
assert.match(sheetCode, /if \(!sheet\._selectedIds\.has\(id\)\) setSelection\(\[id\]\)/, "Arrastar um membro não deve reduzir a seleção de grupo");
assert.match(sheetCode, /_saveSelectedGroupToLibrary\(\)/, "Grupos devem poder ser salvos na Biblioteca");
assert.match(sheetCode, /_addSavedGroupToCanvas\(groupId\)/, "Grupos salvos devem poder ser inseridos no Canvas");
assert.match(sheetCode, /showPopover\(\)/, "O seletor de cores deve abrir na camada superior");
assert.match(template, /data-text-style-command="align-left"/, "O Inspector deve oferecer ferramentas de alinhamento por ícones");
assert.match(sheetCode, /exib:"PV"/, "A propriedade PV deve possuir abreviação própria");
assert.match(sheetCode, /exib:"CORPO"/, "A propriedade Corpo deve possuir abreviação própria");
assert.doesNotMatch(template, /nexus-field-hint/, "Hints redundantes devem ser removidas");

assert.match(template, /data-interaction-editor/, "O editor de fluxos deve existir no template");

assert.match(template, /data-tool-panel="behavior"/, "Comportamento deve possuir um painel independente");
assert.match(template, /data-tool-panel="settings"/, "Configurações deve possuir um painel independente");
assert.doesNotMatch(template, /data-inspector-tab-panel="behavior"/, "Comportamento não deve permanecer dentro do Inspector");
assert.match(template, /data-settings-section="organization"/, "Configurações deve possuir navegação lateral por seção");
assert.match(sheetCode, /data-floating-panel="behavior"/, "A navegação deve abrir o painel Comportamento");
assert.match(sheetCode, /data-floating-panel="settings"/, "A navegação deve abrir o painel Configurações");
assert.match(sheetCode, /behavior: \[900, 600\]/, "O painel Comportamento deve ter as dimensões da Biblioteca");
assert.match(sheetCode, /nexus-behavior-editor \[data-interaction-action\]/, "As ações do editor devem funcionar fora do Inspector");
assert.match(sheetCode, /rememberedTab\) \? "card" : rememberedTab/, "O Inspector deve restaurar somente abas existentes");
assert.match(css, /nexus-settings-rail/, "Configurações deve reutilizar a navegação lateral");
assert.match(css, /nexus-behavior-editor \.nexus-interaction-action-config/, "O editor ampliado deve distribuir as configurações em colunas");
assert.match(interactions, /const guided=el\("div","nexus-interaction-guided"\)/, "Gatilhos e condições devem ocupar uma área permanente do fluxo");

assert.match(changelog, /Adicionada ação opcional de rolagem configurável no Inspector/);
assert.match(changelog, /Cards inteligentes e composição/);
assert.match(css, /nexus-library-saved-groups/);

assert.match(entrypoint, /Hooks\.on\("preUpdateActor"/, "A atualização do retrato deve preservar a distinção entre Actor e Token");
assert.match(sheetCode, /remove\("is-selected", "is-group-inspecting", "is-selection-highlight"\)/, "A limpeza da seleção deve remover todos os estados visuais");
assert.match(sheetCode, /const liveCanvas = sheet\.element\?\.querySelector\?\./, "Os atalhos devem consultar o Canvas atual");
assert.match(sheetCode, /_setComponentTextStyle\(componentId, target, key, value\)/, "A formatação deve ser aplicada ao conteúdo e ao título");
assert.match(template, /data-text-style-target="content"/, "A formatação deve permitir selecionar o conteúdo");
assert.match(template, /data-text-style-target="heading"/, "A formatação deve permitir selecionar o título");
assert.ok(interactions.includes("INTERACTION_ACTIONS"), "Ações devem ser definidas pelo motor, não pelo seletor antigo");
assert.ok(!template.includes("data-action-config="), "Configurações antigas do seletor rígido devem ser removidas");
assert.match(template, /data-resource-slider/, "A barra arrastável deve ser renderizada");
assert.match(template, /data-proficiency-level/, "O marcador deve oferecer os quatro níveis");
assert.match(template, /data-actor-portrait/, "O retrato do Actor deve ser editável separadamente");
assert.match(css, /nexus-text-toolbar/);
assert.match(css, /nexus-proficiency-control/);
assert.match(css, /nexus-resource-slider-control/);
assert.match(sheetCode, /html\.find\("\[data-resource-slider\]"\)\.on\("change"/, "O slider deve persistir o valor ao terminar o arraste");
assert.match(sheetCode, /const selectedGroupIds = new Set\(selectedGroups\.map\(group => group\.id\)\)/, "A seleção parcial não deve destacar os membros irmãos do grupo");
assert.match(sheetCode, /_nexusCanvasKeyboardFocus/, "O Canvas deve preservar o contexto de atalhos após rerender");
assert.match(sheetCode, /_syncActorPortraitFromToken\(componentId\)/, "O retrato do Actor deve poder receber explicitamente a imagem do token");
assert.match(template, /data-sync-token-portrait/, "O Inspector deve oferecer sincronização explícita do retrato");
assert.match(sheetCode, /content\?\.querySelectorAll\("\.nexus-asset-text/, "A tipografia deve alcançar conteúdo interno e valores derivados");
assert.match(css, /nexus-sync-token-portrait/, "O comando de sincronização do retrato deve ter estilo próprio");
console.log("NEXUS 1.0.0.7: validações estáticas aprovadas.");

assert.match(sheetCode, /expandNexusRollAliases\(this\.actor, expandNexusPropertyExpressions\(formula\)\)/, "Fórmulas devem aceitar referências {{propriedade}} e aliases curtos como @DES");
assert.match(sheetCode, /keyboardMoveHistoryCaptured/, "Movimentos por setas devem compartilhar um único snapshot de histórico");
assert.match(sheetCode, /requestAnimationFrame\(applyKeyboardMoveFrame\)/, "Movimentos repetidos por teclado devem ser aplicados por frame");
assert.match(sheetCode, /keyboardMoveKeyUp/, "A movimentação deve persistir ao soltar a tecla");
assert.doesNotMatch(sheetCode, /scheduleKeyboardMoveSave/, "A movimentação não deve depender de debounce por repetição de tecla");
assert.match(sheetCode, /nexus-library-saved-group-preview/, "Grupos salvos devem exibir uma miniatura composta");
assert.match(css, /nexus-library-saved-group-card/, "A miniatura de grupo deve representar os cards membros");
assert.match(css, /\.nexus-group-surface \{ min-width:0; min-height:0;/, "Grupos pequenos não devem impor altura mínima artificial");
console.log("NEXUS 1.0.0.7: regressões de desempenho, aliases e prévias de grupos verificadas.");

assert.ok(interactions.includes("formula.length>500") || sheetCode.includes("formula.length > 500"), "Fórmulas devem ter limite de tamanho");
assert.ok(interactions.includes('"roll"'), "O motor deve oferecer a ação de rolagem");
assert.ok(sheetCode.includes("renderInteractionEditor(interactionEditor, one"), "O editor deve restaurar os fluxos salvos");
assert.ok(sheetCode.includes("applyInteractionEditorChange"), "O Inspector deve persistir as configurações de cada ação");
assert.match(sheetCode, /rollAliases/, "As sugestões devem incluir aliases curtos de exibição");
assert.match(sheetCode, /popover="manual"/, "O seletor de cores deve evitar fechamento automático durante ajustes");
assert.match(sheetCode, /this\._outsideAttached/, "O seletor deve restaurar o detector externo ao reconectar");
assert.match(sheetCode, /keyboardMoveAllElements/, "A atualização dos limites de grupos deve reutilizar os nós já consultados");
assert.match(sheetCode, /is-grid/, "Grupos grandes devem usar uma miniatura em grade");
assert.match(sheetCode, /nexus-library-saved-group-track/, "Pré-visualizações devem representar barras de recursos");
console.log("NEXUS 1.0.0.7: regressões de Inspector, fórmulas, interação e biblioteca verificadas.");

assert.match(sheetCode, /getNexusRollAliasEntries/, "Atalhos podem ser derivados do nome exibido quando não houver abreviação explícita");
assert.match(sheetCode, /new Roll\(formula, getNexusRollData\(this\.actor\)\)/, "Campos próprios devem integrar os dados entregues à rolagem");
assert.match(sheetCode, /focusin\$\{inspectorNamespace\}/, "O visualizador deve abrir ao receber foco no campo de fórmula ou vínculo");
assert.match(sheetCode, /formulaExpression\?\.\[1\]/, "O filtro de fórmula deve reconhecer expressões {{propriedade}} sob o cursor");
assert.match(sheetCode, /root \+ "\.value"/, "Aliases de atributos e recursos devem resolver o valor numérico, não o objeto inteiro");
assert.match(sheetCode, /syncGroupBounds\(keyboardMoveAllElements, false\)/, "O movimento por teclado não deve recalcular conexões de cantos a cada frame");
assert.match(sheetCode, /scale<0\.12/, "Grupos muito espalhados devem alternar para uma miniatura em grade legível");

assert.match(sheetCode, /getNexusSkillRows\(this\.actor\)/, "O grupo deve usar perícias oficiais calculadas");
assert.match(sheetCode, /async _ensureNexusRulesData\(\)/, "Actors existentes devem receber os novos campos sem perder dados");
assert.match(sheetCode, /system\.skills\.\-=\" \+ skill\.legacyKey/, "A migração deve remover a chave legada após consolidar o dado canônico");
assert.match(sheetCode, /LEGACY_SKILL_PATHS/, "O scanner não deve redescobrir caminhos de perícias legadas");
assert.doesNotMatch(template, /Digite @ para consultar|Os quatro nomes são rótulos configuráveis|Exibe uma barra arrastável|Ao clicar neste card no modo de jogo/, "Dicas instrutivas do Inspector devem ser removidas");
assert.doesNotMatch(template, /\splaceholder=|\stitle=/, "Placeholders e tooltips instrutivos não devem permanecer na ficha");
assert.match(sheetCode, /async _rollSkill\(skillKey\)/, "As perícias devem executar testes");
assert.match(sheetCode, /async _setSkillProficientLevel\(skillKey, rawLevel\)/, "A proficiência deve aceitar níveis numéricos assinados");
assert.match(skills, /key: "athletics", legacyKey: "atletismo"/);
assert.match(skills, /key: "instinct", legacyKey: "instinto"/);
assert.equal(NEXUS_SKILLS.length, 18, "O catálogo deve conter 18 perícias");
assert.equal(new Set(NEXUS_SKILLS.map(skill => skill.key)).size, 18, "As chaves técnicas das perícias devem ser únicas");
assert.match(template, /data-skill-roll/);
assert.match(template, /data-skill-proficient-level/);
assert.ok(sheetCode.includes("executeTriggeredActions(component, eventName"), "Eventos de componentes devem passar pelo executor de interações");
assert.match(template, /data-has-click-interaction/);
assert.match(interactions, /triggers:source\.map\(normalizeTrigger\)/);
assert.match(interactions, /flow\.actions/);
assert.ok(interactions.includes("toggle-component"), "Ações antigas devem continuar compatíveis");
assert.match(sheetCode, /_toggleTargetComponent/);
assert.match(sheetCode, /setResourceFromTrack/);
console.log("NEXUS 1.0.0.8: perícias oficiais, ações entre cards e controle direto de recursos verificados.");


// Signed proficiency levels and negative numeric properties.
const negativeSkillActor = {
  system: {
    identity: { level: 4 },
    attributes: { for: -5, des: 0 },
    skills: {
      athletics: { proficientLevel: 0 },
      stealth: { proficientLevel: -3 },
      perception: { proficientLevel: 2 }
    }
  }
};
assert.equal(getNexusSkillModifier(negativeSkillActor, "athletics").modifier, -5, "Atributos negativos devem permanecer negativos");
assert.equal(getNexusSkillModifier(negativeSkillActor, "stealth").modifier, -2, "Proficiência negativa deve inverter o bônus de proficiência");
assert.equal(getNexusSkillModifier(negativeSkillActor, "perception").modifier, 2, "Qualquer nível positivo deve conceder proficiência");
assert.equal(getNexusSkillModifier(negativeSkillActor, "stealth").proficientLevel, -1, "Níveis negativos legados devem ser normalizados para -1");
assert.equal(getNexusSkillModifier(negativeSkillActor, "perception").proficientLevel, 1, "Níveis positivos legados devem ser normalizados para +1");
assert.equal(normalizeNexusProficientLevel(-9), -1);
assert.equal(normalizeNexusProficientLevel(9), 1);
assert.equal(normalizeNexusProficientLevel(0), 0);
assert.equal(Object.hasOwn(getNexusSkillModifier(negativeSkillActor, "stealth"), "opposed"), false, "O cálculo não deve manter estado opposed separado");
const opposedLegacyRows = getNexusSkillRows({ system: { skills: { furtividade: { opposed: true } } } });
assert.equal(opposedLegacyRows.find(skill => skill.key === "stealth").proficientLevel, -1, "O estado opposed antigo deve migrar para proficiência negativa");
const legacySkillRows = getNexusSkillRows({ system: { skills: { atletismo: { proficient: true } } } });
assert.equal(legacySkillRows.find(skill => skill.key === "athletics").proficientLevel, 1, "Dados antigos devem ser lidos durante a migração");
assert.match(sheetCode, /if \(kind === "number"\) \{ value = Number\(value\); if \(!Number\.isFinite\(value\)\) return; \}/, "Propriedades numéricas devem aceitar qualquer número finito, inclusive negativos");

// Trigger -> Action -> Configuration pipeline.
const legacyRollActions = getTriggeredActions({ actionType: "roll", rollFormula: "1d20 + 3" }, "click");
assert.equal(legacyRollActions.length, 1);
assert.equal(legacyRollActions[0].type, "roll");
assert.equal(legacyRollActions[0].config.formula, "1d20 + 3");
const executedActions = [];
await executeTriggeredActions({
  interactions: [{
    id: "test-click",
    trigger: { event: "click" },
    actions: [
      { type: "toggle", config: { targetId: "target-1" } },
      { type: "roll", config: { formula: "1d20 + @DES" } }
    ]
  }]
}, "click", async action => executedActions.push(action.type));
assert.deepEqual(executedActions, ["toggle", "roll"], "As ações devem executar em sequência");
assert.equal(getTriggeredActions({
  interactions: [{ trigger: { event: "hover" }, actions: [{ type: "roll", config: {} }] }]
}, "click").length, 0, "Um trigger diferente não deve executar no clique");
console.log("NEXUS: proficiência assinada, valores negativos e pipeline de interações verificados.");

const multiFlowComponent = { interactions: [{
  id: "multi", name: "Fluxo múltiplo", enabled: true,
  triggers: [{ id: "t1", event: "click" }, { id: "t2", event: "doubleClick" }],
  conditions: [{ id: "c1", path: "identity.level", operator: "greaterOrEqual", value: "3" }],
  conditionJoin: "all",
  actions: [{ id: "a1", type: "update", config: { path: "resources.pv.value", operation: "add", value: "2" } }, { id: "a2", type: "roll", config: { formula: "1d20" } }],
  execution: { onError: "continue" }
}] };
const conditionActor = { system: { identity: { level: 4 } } };
assert.equal(getTriggeredActions(multiFlowComponent, "click", { actor: conditionActor }).length, 2);
assert.equal(getTriggeredActions(multiFlowComponent, "doubleClick", { actor: conditionActor }).length, 2);
assert.equal(getTriggeredActions(multiFlowComponent, "click", { actor: { system: { identity: { level: 1 } } } }).length, 0);
const editorDraft = { interactions: [] };
applyInteractionEditorCommand(editorDraft, "add-flow");
const flowId = editorDraft.interactions[0].id;
applyInteractionEditorCommand(editorDraft, "add-trigger", { interactionId: flowId });
applyInteractionEditorCommand(editorDraft, "add-action", { interactionId: flowId });
assert.equal(editorDraft.interactions[0].triggers.length, 2);
assert.equal(editorDraft.interactions[0].actions.length, 2);
applyInteractionEditorChange(editorDraft, { interactionId: flowId, scope: "trigger", triggerIndex: 1, field: "event" }, "rightClick");
assert.equal(editorDraft.interactions[0].triggers[1].event, "rightClick");
applyInteractionEditorCommand(editorDraft, "move-action", { interactionId: flowId, actionIndex: 0, direction: 1 });
assert.equal(editorDraft.interactions[0].actions[1].type, "roll");
assert.equal(getComponentInteractions(multiFlowComponent)[0].execution.onError, "continue");
assert.ok(sheetCode.includes("renderInteractionEditor(interactionEditor, one"));
assert.ok(sheetCode.includes("data-interaction-action"));
assert.ok(template.includes("data-interaction-editor"));
assert.ok(!template.includes('data-component-setting="actionType"'));
assert.ok(sheetCode.includes('addEventListener("contextmenu"'));
assert.ok(sheetCode.includes('addEventListener("pointerover"'));
assert.ok(sheetCode.includes("_executeComponentAction"));
console.log("NEXUS 1.0.0.15: editor visual de interações validado.");

assert.ok(!template.includes('data-inspector-tab="behavior"'), "Comportamento deve ser acessado pelo painel independente");
assert.ok(template.includes('data-inspector-tab="advanced"'), "O Inspector deve expor a área avançada");
assert.ok(sheetCode.includes('["card", "appearance", "advanced"]'), "As três áreas restantes do Inspector devem ser navegáveis");


// Reusable behavior library: cloned flows receive independent identifiers.
const templateClone=instantiateInteractionTemplate(editorDraft.interactions[0]);
assert.notEqual(templateClone.id,editorDraft.interactions[0].id);
assert.notEqual(templateClone.actions[0].id,editorDraft.interactions[0].actions[0].id);
assert.ok(!interactions.includes("add-skill-roll"), "O editor não deve oferecer um fluxo especial de rolagem de perícia");
assert.ok(!interactions.includes("＋ Rolagem de perícia"), "O editor deve manter apenas a criação de fluxos comuns");
assert.ok(!interactions.includes("data-interaction-view"), "O editor não deve duplicar a navegação com modos Cartões/Lista");
assert.ok(sheetCode.includes("behavior: [900, 600]"), "Comportamento deve compartilhar as dimensões da Biblioteca");
assert.ok(sheetCode.includes("component: [400, 600]"), "Propriedades deve seguir a geometria compacta dos painéis");
assert.ok(sheetCode.includes("style: [400, 600]") && sheetCode.includes("layers: [400, 600]") && sheetCode.includes("settings: [400, 600]"), "Painéis compactos devem compartilhar dimensões");
assert.ok(sheetCode.includes("aliases: [400, 600]"), "Estrutura de dados deve seguir as dimensões compactas");
assert.ok(sheetCode.includes("library: [900, 600]") && sheetCode.includes("behavior: [900, 600]"), "Comportamento deve usar as mesmas dimensões da Biblioteca");
assert.ok(sheetCode.includes('data-floating-panel="settings" title="Configurações do editor" aria-label="Configurações do editor"><i class="fa-solid fa-gear"'), "Configurações deve ter ícone próprio");
assert.ok(sheetCode.includes('data-floating-panel="component" title="Propriedades" aria-label="Propriedades"><i class="fa-solid fa-sliders"'), "Propriedades deve usar o ícone de controles");
assert.ok(sheetCode.includes('data-floating-panel="aliases" title="Estrutura de dados" aria-label="Estrutura de dados"><i class="fa-solid fa-diagram-project"'), "Estrutura de dados deve ter ícone semântico");
assert.ok(sheetCode.includes('data-floating-panel="behavior" title="Comportamento" aria-label="Comportamento"><i class="fa-solid fa-bolt"'), "Comportamento deve ter ícone semântico");
assert.ok(sheetCode.includes("if(!component){gesture={type:\"marquee\""), "Clique no espaço vazio não deve limpar a seleção");
assert.ok(sheetCode.includes("if (!editorPanelsOpen && this.element?.isConnected)"), "A seleção deve ser limpa quando os painéis de edição forem fechados");
assert.ok(sheetCode.includes("nextControl?.focus({ preventScroll: true })"), "O editor deve preservar o foco após atualizar um campo");
assert.ok(css.includes("min-height:38px"), "Os controles do editor devem ter dimensões legíveis");
assert.ok(css.includes("grid-template-columns:minmax(150px,1.4fr) minmax(120px,1fr) minmax(110px,1fr) auto"), "As condições devem reservar espaço para cada campo e para Remover");
assert.ok(interactions.includes("nexus-interaction-condition-group"), "Condições devem possuir grupo dedicado");
assert.ok(interactions.includes("tab.dataset.interactionFlowTab"), "Os fluxos devem ser navegáveis por abas");
assert.ok(interactions.includes("panel.dataset.interactionFlowPanel"), "Cada aba deve exibir apenas seu fluxo correspondente");
assert.doesNotMatch(interactions,/summary\.textContent="QUANDO/, "O resumo textual QUANDO/SE/ENTÃO deve ser removido");
assert.ok(css.includes("nexus-interaction-condition-group .nexus-interaction-group-heading"), "O seletor E/OU deve ocupar área dimensionada no cabeçalho de condições");
assert.ok(css.includes("grid-template-columns:minmax(0,1.55fr) minmax(110px,.85fr) minmax(90px,.8fr) auto"), "A propriedade da condição deve ter prioridade de largura");
assert.ok(css.includes("width:min(400px,calc(100vw - 24px))"), "Painéis compactos devem compartilhar largura");
assert.ok(css.includes("width:min(400px,calc(100vw - 24px))"), "Estrutura de dados deve usar largura compacta padronizada");
assert.ok(css.includes(".nexus-interaction-action-head{display:grid"), "Cabeçalho da ação deve alinhar título, ativo e ferramentas");
assert.ok(css.includes("width:min(900px,calc(100vw - 24px))"), "Comportamento e Biblioteca devem compartilhar a mesma largura");
assert.match(interactions,/condition-row/, "Condição deve renderizar linha sem legendas redundantes");
assert.match(interactions,/control\("select",co\.operator,operators,"Operador"\)/, "Operador deve ter nome acessível sem legenda visual");
assert.match(interactions,/control\("input",co\.value,\[\],"Valor"\)/, "Valor deve ter nome acessível sem legenda visual");
assert.match(css,/\.nexus-panel-window \.nexus-behavior-editor \.nexus-interaction-actions\{display:flex!important;flex-direction:column!important/, "A lista de ações deve ocupar uma única coluna");
assert.match(css,/\.nexus-panel-window \.nexus-tool-panel\[data-tool-panel="style"\] \.nexus-global-color-grid\{display:flex!important;flex-direction:column!important/, "Aparência deve manter controles de cor em lista alinhada");
assert.ok(css.includes("height:min(600px,calc(100vh - 24px))"), "Comportamento e Biblioteca devem compartilhar a mesma altura");
const fakeLibraryActor={
  flags:{nexus:{}},
  getFlag(scope,key){return this.flags[scope]?.[key];},
  async setFlag(scope,key,value){this.flags[scope]??={};this.flags[scope][key]=structuredClone(value);}
};
const savedSettings={};
globalThis.game={settings:{
  get(scope,key){return savedSettings[scope+"."+key]??[];},
  async set(scope,key,value){savedSettings[scope+"."+key]=structuredClone(value);}
}};
await saveInteractionToLibrary(fakeLibraryActor,editorDraft.interactions[0]);
assert.equal(getInteractionLibrary(fakeLibraryActor).length,1);
assert.equal(getInteractionLibrary(fakeLibraryActor)[0].flow.actions[0].config.formula,"1d20");
assert.equal(fakeLibraryActor.flags.nexus.interactionLibrary,undefined,"A biblioteca pessoal não deve ficar presa ao Actor");
delete globalThis.game;
assert.match(sheetCode,/config\.mode === "skill"/);
assert.match(sheetCode,/getInteractionLibrary\(this\.actor\)/);
assert.match(interactions,/nexus-interaction-guided/);
assert.match(interactions,/Salvar na biblioteca/);
assert.match(css,/nexus-interaction-summary/);
assert.match(css,/nexus-library-assets \.nexus-library-preview-stage/);
assert.doesNotMatch(template,/<option value="fill">Esticar<\/option>/);
console.log("NEXUS: biblioteca de fluxos, modelo de rolagem de perícia e proporção de assets verificados.");

assert.ok(interactions.includes("nexus-interaction-action-title"), "Título das ações deve possuir contêiner próprio");
assert.ok(interactions.includes("fa-arrow-up") && interactions.includes("fa-trash"), "Controles das ações devem usar ícones semânticos");
assert.ok(css.includes(".nexus-interaction-action-title{display:block"), "Título das ações deve ter largura e quebra de linha controladas");
assert.ok(css.includes("nexus-alias-create,") && css.includes("background:transparent !important"), "Estrutura de dados deve evitar painéis aninhados redundantes");
assert.ok(css.includes("width:min(400px,calc(100vw - 24px))"), "Estrutura de dados deve usar largura compacta padronizada");

assert.ok(css.includes(':has(.nexus-library-panel) {'), "Biblioteca deve possuir dimensionamento próprio");
assert.ok(css.includes('grid-template-columns:minmax(0,1fr) minmax(240px,270px)'), "Biblioteca deve reservar largura estável para a prévia sem comprimir a lista");
assert.ok(css.includes(".nexus-library-folders button.active"), "Pastas da Biblioteca devem ter navegação visual própria");
assert.ok(css.includes("grid-template-columns:68px minmax(0,1fr)"), "Cartões da Biblioteca devem usar miniatura e conteúdo lado a lado");
assert.doesNotMatch(css, /:has\(\.nexus-tool-panel:not\(\.nexus-behavior-editor\):not\(\.nexus-alias-manager\)\)/, "Dimensionamento compacto não pode atingir genericamente a Biblioteca");
assert.ok(css.includes("grid-template-columns:minmax(0,1fr) minmax(130px,160px)"), "Seletores de cor devem usar linhas consistentes com largura útil");

assert.ok(!template.includes("nexus-behavior-header"), "O cabeçalho redundante do painel Comportamento deve ser removido");
assert.match(interactions,/nexus-interaction-trigger-row/, "Gatilhos devem usar seletor direto dentro de cartão");
assert.match(interactions,/Combinar condições/, "Combinação E/OU deve ter seletor próprio e compacto");
assert.match(interactions,/nexus-interaction-action-active/, "O estado Ativa deve ficar junto ao título da ação");
assert.match(sheetCode,/--nexus-state-success/, "Temas devem expor cores semânticas de estado");
assert.match(css,/--nexus-scrollbar-thumb-hover/, "Temas devem centralizar estados das barras de rolagem");
assert.ok(css.includes("grid-template-columns:minmax(0,1fr) minmax(130px,160px)"), "Color pickers devem ter distribuição previsível");

assert.match(interactions,/nexus-interaction-trigger-row/, "Gatilhos devem usar cartões com borda própria");
assert.match(interactions,/collectInteractionPropertyPaths/, "Editor deve descobrir propriedades do ator para condições");
assert.match(interactions,/nexus-interaction-action-active/, "Estado ativo deve ficar junto ao título da ação");
assert.match(interactions,/nexus-interaction-condition-row/, "Condições devem usar linha sem rótulos redundantes");
assert.match(css,/nexus-library-preview-stage\{display:grid!important;place-items:center!important;width:100%!important/, "Miniaturas da Biblioteca devem usar área ampliada");
assert.match(css,/nexus-library-saved-group-preview\{position:relative!important;width:100%!important;height:104px!important/, "Composições salvas devem ter prévia ampliada");

assert.match(interactions,/path:"",operator:"equals",value:""/,"Novas condições começam sem propriedade ou valor predefinidos");
assert.match(sheetCode,/data-interaction-property-input/,"Condições usam o buscador compartilhado de propriedades");
assert.ok(sheetCode.includes("templateExpression=!formulaMode&&!propertyMode?before.match"),"Campos de texto reconhecem a abertura de expressão {{");
assert.match(sheetCode,/explicitUrl=wrapped/,"URLs explícitas em expressões têm tratamento de link separado");
assert.match(sheetCode,/resolvedIsMedia=wrapped && !explicitUrl && isMediaSource\(resolved\)/,"Valores simples de propriedades não devem virar links locais");

assert.match(template,/data-library-section="assets"/,"Biblioteca deve separar Assets, Fluxos e Temas");
assert.match(template,/data-library-section="flows"/,"Biblioteca deve possuir área própria para Fluxos");
assert.match(template,/data-library-section="themes"/,"Biblioteca deve possuir área própria para Temas");
assert.match(template,/data-library-scope="personal"/,"Biblioteca deve separar itens padrão dos itens pessoais");
assert.match(template,/data-library-saved-components/,"Biblioteca deve listar componentes salvos individualmente");
assert.match(sheetCode,/data-library-save-component/,"Biblioteca deve permitir salvar o componente selecionado");
assert.match(sheetCode,/data-library-flow-id/,"Biblioteca deve listar fluxos salvos");
assert.match(sheetCode,/propertyPickerId/,"A ficha deve reutilizar um único seletor de propriedades");
assert.match(sheetCode,/data-interaction-property-input/,"Condições devem usar o seletor compartilhado");
assert.match(sheetCode,/expandNexusPropertyExpressions/,"Fórmulas devem resolver referências de propriedades");
assert.match(interactions,/dataset\.rollFormulaInput/,"Campos de fórmula do editor de fluxos devem usar o buscador compartilhado");
assert.doesNotMatch(interactions,/const list=el\("div","nexus-property-options"\)/,"O editor de fluxos não deve criar um segundo buscador de propriedades");
assert.match(css,/nexus-library-personal-preview/,"Itens pessoais devem usar miniaturas quadradas");
assert.match(css,/nexus-property-options-toolbar/,"O buscador de propriedades deve oferecer navegação hierárquica e pesquisa");

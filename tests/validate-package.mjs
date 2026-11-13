import assert from "node:assert/strict";
import { readFile, access, readdir } from "node:fs/promises";
import path from "node:path";
import { migrateLegacyActorData } from "../scripts/core/migration-manager.js";
import { mergeLayoutSnapshots } from "../scripts/core/layout-merge.js";
import { NEXUS_SKILLS, getNexusSkillModifier, getNexusSkillRows } from "../scripts/core/skills.js";
import { getTriggeredActions, executeTriggeredActions, getComponentInteractions, applyInteractionEditorCommand, applyInteractionEditorChange, createSkillRollInteraction, instantiateInteractionTemplate, getInteractionLibrary, saveInteractionToLibrary } from "../scripts/core/interactions.js";

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

assert.equal(manifest.id, "nexus", "ID do sistema incorreto");
assert.equal(manifest.version, "1.0.0.11", "Versão do manifesto incorreta");
assert.ok(readme.includes("Versão 1.0.0.11"), "README deve identificar a versão publicada");
assert.ok(changelog.startsWith("## 1.0.0.11"), "CHANGELOG deve iniciar pela versão atual");
assert.equal(manifest.compatibility.minimum, "14", "Versão mínima do Foundry incorreta");
assert.equal(manifest.compatibility.verified, "14", "Versão verificada do Foundry incorreta");
assert.match(manifest.manifest, /raw\.githubusercontent\.com\/yottastrofficial-boop\/Nexus\/main\/system\.json$/);
assert.ok(manifest.download.endsWith("/releases/download/v1.0.0.11/nexus.zip"), "URL do pacote deve apontar para a versão atual");

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

assert.ok(readme.includes("Versão 1.0.0.11"));
assert.match(changelog, /## 1\.0\.0\.7/);
assert.match(sheet, /async _rollComponent\(componentId, config = \{\}\)/, "Componentes devem executar rolagens configuradas com configuração contextual");
assert.match(sheet, /new Roll\(formula, getNexusRollData\(this\.actor\)\)/, "A rolagem deve usar os dados do Actor");
assert.match(sheet, /component\.actionType = \["roll","proficiency","resource-slider","toggle-component"\]\.includes\(input\.value\)/, "A ação deve aceitar os tipos contextuais suportados");
assert.match(template, /data-action-type="{{component.actionType}}"/, "O card deve expor sua ação configurada");
assert.match(sheet, /if \(!sheet\._selectedIds\.has\(id\)\) setSelection\(\[id\]\)/, "Arrastar um membro não deve reduzir a seleção de grupo");
assert.match(sheet, /_saveSelectedGroupToLibrary\(\)/, "Grupos devem poder ser salvos na Biblioteca");
assert.match(sheet, /_addSavedGroupToCanvas\(groupId\)/, "Grupos salvos devem poder ser inseridos no Canvas");
assert.match(sheet, /showPopover\(\)/, "O seletor de cores deve abrir na camada superior");
assert.match(template, /data-text-style-command="align-left"/, "O Inspector deve oferecer ferramentas de alinhamento por ícones");
assert.match(sheet, /exib:"PV"/, "A propriedade PV deve possuir abreviação própria");
assert.match(sheet, /exib:"CORPO"/, "A propriedade Corpo deve possuir abreviação própria");
assert.doesNotMatch(template, /nexus-field-hint/, "Hints redundantes devem ser removidas");

assert.match(template, /data-interaction-editor/, "O Inspector deve conter o editor visual de interações");
assert.match(changelog, /Adicionada ação opcional de rolagem configurável no Inspector/);
assert.match(changelog, /Cards inteligentes e composição/);
assert.match(css, /nexus-library-saved-groups/);

assert.match(entrypoint, /Hooks\.on\("preUpdateActor"/, "A atualização do retrato deve preservar a distinção entre Actor e Token");
assert.match(sheet, /remove\("is-selected", "is-group-inspecting", "is-selection-highlight"\)/, "A limpeza da seleção deve remover todos os estados visuais");
assert.match(sheet, /const liveCanvas = sheet\.element\?\.querySelector\?\./, "Os atalhos devem consultar o Canvas atual");
assert.match(sheet, /_setComponentTextStyle\(componentId, target, key, value\)/, "A formatação deve ser aplicada ao conteúdo e ao título");
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
assert.match(sheet, /html\.find\("\[data-resource-slider\]"\)\.on\("change"/, "O slider deve persistir o valor ao terminar o arraste");
assert.match(sheet, /const selectedGroupIds = new Set\(selectedGroups\.map\(group => group\.id\)\)/, "A seleção parcial não deve destacar os membros irmãos do grupo");
assert.match(sheet, /_nexusCanvasKeyboardFocus/, "O Canvas deve preservar o contexto de atalhos após rerender");
assert.match(sheet, /_syncActorPortraitFromToken\(componentId\)/, "O retrato do Actor deve poder receber explicitamente a imagem do token");
assert.match(template, /data-sync-token-portrait/, "O Inspector deve oferecer sincronização explícita do retrato");
assert.match(sheet, /content\?\.querySelectorAll\("\.nexus-asset-text/, "A tipografia deve alcançar conteúdo interno e valores derivados");
assert.match(css, /nexus-sync-token-portrait/, "O comando de sincronização do retrato deve ter estilo próprio");
console.log("NEXUS 1.0.0.7: validações estáticas aprovadas.");

assert.match(sheet, /expandNexusRollAliases\(this\.actor, formula\)/, "Fórmulas devem aceitar aliases curtos de exibição como @DES");
assert.match(sheet, /keyboardMoveHistoryCaptured/, "Movimentos por setas devem compartilhar um único snapshot de histórico");
assert.match(sheet, /requestAnimationFrame\(applyKeyboardMoveFrame\)/, "Movimentos repetidos por teclado devem ser aplicados por frame");
assert.match(sheet, /keyboardMoveKeyUp/, "A movimentação deve persistir ao soltar a tecla");
assert.doesNotMatch(sheet, /scheduleKeyboardMoveSave/, "A movimentação não deve depender de debounce por repetição de tecla");
assert.match(sheet, /nexus-library-saved-group-preview/, "Grupos salvos devem exibir uma miniatura composta");
assert.match(css, /nexus-library-saved-group-card/, "A miniatura de grupo deve representar os cards membros");
assert.match(css, /\.nexus-group-surface \{ min-width:0; min-height:0;/, "Grupos pequenos não devem impor altura mínima artificial");
console.log("NEXUS 1.0.0.7: regressões de desempenho, aliases e prévias de grupos verificadas.");

assert.ok(interactions.includes("formula.length>500") || sheet.includes("formula.length > 500"), "Fórmulas devem ter limite de tamanho");
assert.ok(interactions.includes('"roll"'), "O motor deve oferecer a ação de rolagem");
assert.ok(sheet.includes("renderInteractionEditor(interactionEditor, one"), "O editor deve restaurar os fluxos salvos");
assert.ok(sheet.includes("applyInteractionEditorChange"), "O Inspector deve persistir as configurações de cada ação");
assert.match(sheet, /rollAliases/, "As sugestões devem incluir aliases curtos de exibição");
assert.match(sheet, /popover="manual"/, "O seletor de cores deve evitar fechamento automático durante ajustes");
assert.match(sheet, /this\._outsideAttached/, "O seletor deve restaurar o detector externo ao reconectar");
assert.match(sheet, /keyboardMoveAllElements/, "A atualização dos limites de grupos deve reutilizar os nós já consultados");
assert.match(sheet, /is-grid/, "Grupos grandes devem usar uma miniatura em grade");
assert.match(sheet, /nexus-library-saved-group-track/, "Pré-visualizações devem representar barras de recursos");
console.log("NEXUS 1.0.0.7: regressões de Inspector, fórmulas, interação e biblioteca verificadas.");

assert.match(sheet, /getNexusRollAliasEntries/, "Atalhos podem ser derivados do nome exibido quando não houver abreviação explícita");
assert.match(sheet, /new Roll\(formula, getNexusRollData\(this\.actor\)\)/, "Campos próprios devem integrar os dados entregues à rolagem");
assert.match(sheet, /focusin\$\{inspectorNamespace\}/, "O visualizador deve abrir ao receber foco no campo de fórmula ou vínculo");
assert.match(sheet, /tokenMatch\?\.\[1\]/, "O filtro de fórmula deve considerar somente o token @ sob o cursor");
assert.match(sheet, /root \+ "\.value"/, "Aliases de atributos e recursos devem resolver o valor numérico, não o objeto inteiro");
assert.match(sheet, /syncGroupBounds\(keyboardMoveAllElements, false\)/, "O movimento por teclado não deve recalcular conexões de cantos a cada frame");
assert.match(sheet, /scale < 0\.18/, "Grupos muito espalhados devem alternar para uma miniatura em grade legível");

assert.match(sheet, /getNexusSkillRows\(this\.actor\)/, "O grupo deve usar perícias oficiais calculadas");
assert.match(sheet, /async _ensureNexusRulesData\(\)/, "Actors existentes devem receber os novos campos sem perder dados");
assert.match(sheet, /system\.skills\.\-=\" \+ skill\.legacyKey/, "A migração deve remover a chave legada após consolidar o dado canônico");
assert.match(sheet, /LEGACY_SKILL_PATHS/, "O scanner não deve redescobrir caminhos de perícias legadas");
assert.doesNotMatch(template, /Digite @ para consultar|Os quatro nomes são rótulos configuráveis|Exibe uma barra arrastável|Ao clicar neste card no modo de jogo/, "Dicas instrutivas do Inspector devem ser removidas");
assert.doesNotMatch(template, /\splaceholder=|\stitle=/, "Placeholders e tooltips instrutivos não devem permanecer na ficha");
assert.match(sheet, /async _rollSkill\(skillKey\)/, "As perícias devem executar testes");
assert.match(sheet, /async _setSkillProficientLevel\(skillKey, rawLevel\)/, "A proficiência deve aceitar níveis numéricos assinados");
assert.match(skills, /key: "athletics", legacyKey: "atletismo"/);
assert.match(skills, /key: "instinct", legacyKey: "instinto"/);
assert.equal(NEXUS_SKILLS.length, 18, "O catálogo deve conter 18 perícias");
assert.equal(new Set(NEXUS_SKILLS.map(skill => skill.key)).size, 18, "As chaves técnicas das perícias devem ser únicas");
assert.match(template, /data-skill-roll/);
assert.match(template, /data-skill-proficient-level/);
assert.ok(sheet.includes("executeTriggeredActions(component, eventName"), "Eventos de componentes devem passar pelo executor de interações");
assert.match(template, /data-has-click-interaction/);
assert.match(interactions, /triggers:source\.map\(normalizeTrigger\)/);
assert.match(interactions, /flow\.actions/);
assert.ok(interactions.includes("toggle-component"), "Ações antigas devem continuar compatíveis");
assert.match(sheet, /_toggleTargetComponent/);
assert.match(sheet, /setResourceFromTrack/);
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
const legacySkillRows = getNexusSkillRows({ system: { skills: { atletismo: { proficient: true } } } });
assert.equal(legacySkillRows.find(skill => skill.key === "athletics").proficientLevel, 1, "Dados antigos devem ser lidos durante a migração");
assert.match(sheet, /if \(kind === "number"\) \{ value = Number\(value\); if \(!Number\.isFinite\(value\)\) return; \}/, "Propriedades numéricas devem aceitar qualquer número finito, inclusive negativos");

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
assert.ok(sheet.includes("renderInteractionEditor(interactionEditor, one"));
assert.ok(sheet.includes("data-interaction-action"));
assert.ok(template.includes("data-interaction-editor"));
assert.ok(!template.includes('data-component-setting="actionType"'));
assert.ok(sheet.includes('addEventListener("contextmenu"'));
assert.ok(sheet.includes('addEventListener("pointerover"'));
assert.ok(sheet.includes("_executeComponentAction"));
console.log("NEXUS 1.0.0.11: editor visual de interações validado.");

assert.ok(template.includes('data-inspector-tab="behavior"'), "O Inspector deve separar comportamento dos dados");
assert.ok(template.includes('data-inspector-tab="advanced"'), "O Inspector deve expor a área avançada");
assert.ok(sheet.includes('["card", "behavior", "appearance", "advanced"]'), "As quatro áreas do Inspector devem ser navegáveis");


// Reusable behavior library and skill-roll preset.
const skillFlow=createSkillRollInteraction("stealth");
assert.equal(skillFlow.actions[0].config.mode,"skill");
assert.equal(skillFlow.actions[0].config.skillKey,"stealth");
const skillComponent={interactions:[]};
applyInteractionEditorCommand(skillComponent,"add-skill-roll");
assert.equal(skillComponent.interactions[0].actions[0].config.mode,"skill");
const templateClone=instantiateInteractionTemplate(skillFlow);
assert.notEqual(templateClone.id,skillFlow.id);
assert.notEqual(templateClone.actions[0].id,skillFlow.actions[0].id);
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
await saveInteractionToLibrary(fakeLibraryActor,skillFlow);
assert.equal(getInteractionLibrary(fakeLibraryActor).length,1);
assert.equal(getInteractionLibrary(fakeLibraryActor)[0].flow.actions[0].config.skillKey,"stealth");
assert.equal(fakeLibraryActor.flags.nexus.interactionLibrary,undefined,"A biblioteca pessoal não deve ficar presa ao Actor");
delete globalThis.game;
assert.match(sheet,/config\.mode === "skill"/);
assert.match(sheet,/getInteractionLibrary\(this\.actor\)/);
assert.match(interactions,/Regra guiada · Gatilhos e condições/);
assert.match(interactions,/Salvar na biblioteca/);
assert.match(css,/nexus-interaction-summary/);
assert.match(css,/nexus-library-assets \.nexus-library-preview-stage/);
assert.doesNotMatch(template,/<option value="fill">Esticar<\/option>/);
console.log("NEXUS: biblioteca de fluxos, modelo de rolagem de perícia e proporção de assets verificados.");

import assert from "node:assert/strict";
import { readFile, access, readdir } from "node:fs/promises";
import path from "node:path";
import { migrateLegacyActorData } from "../scripts/core/migration-manager.js";
import { mergeLayoutSnapshots } from "../scripts/core/layout-merge.js";
import { NEXUS_SKILLS, NEXUS_ATTRIBUTES, normalizeNexusProficientLevel, getNexusBaseModifier, getNexusAttributeValue, getNexusSkillModifier, getNexusSkillRows, evaluateNexusSkillFormula, getNexusDefaultSkillFormula } from "../scripts/core/skills.js";
import { NEXUS_RULEBOOK_PROPERTY_DEFINITIONS, NEXUS_RULEBOOK_PROPERTY_PATHS, NEXUS_PROPERTY_SCHEMA_VERSION, getNexusRulebookPropertyValue, getNexusDefaultPropertyFormula } from "../scripts/core/property-schema.js";
import { buildPropertyPickerCatalog, findPropertyPickerNode } from "../scripts/core/property-catalog.js";
import { getTriggeredActions, executeTriggeredActions, getComponentInteractions, applyInteractionEditorCommand, applyInteractionEditorChange, instantiateInteractionTemplate, getInteractionLibrary, saveInteractionToLibrary, deleteInteractionFromLibrary, evaluateComponentRepresentation, normalizeComponentRepresentation, normalizeInteractionPropertyPath, normalizeInteraction } from "../scripts/core/interactions.js";
import { activateCanvasInteractions } from "../scripts/sheets/canvas-interactions.js";
import { findBestAlignmentMatch } from "../scripts/core/canvas-geometry.js";
import { evaluateNexusFormula, evaluateNexusCondition, evaluateNexusExpression } from "../scripts/core/formula-engine.js";
import { updateCanvasConnectedCorners } from "../scripts/sheets/canvas-connected-corners.js";
import { createPropertyRegistry } from "../scripts/core/property-registry.js";
import { normalizeNexusPropertyPath, normalizeNexusFormulaIdentifier } from "../scripts/core/property-paths.js";
import { NEXUS_LIBRARY_CATALOG } from "../assets/library/catalog.js";

// Geometry regression tests for the Canvas smart-alignment search.
const geometrySource = { x: 0, y: 0, w: 20, h: 20 };
const geometryTargets = [
  { x: 100, y: 0, w: 20, h: 20 },
  { x: 26, y: 40, w: 20, h: 20 }
];
assert.deepEqual(
  findBestAlignmentMatch([geometrySource], geometryTargets, "x", 7),
  { delta: 6, pos: 26, distance: 20, labelAt: 30 },
  "Smart alignment must select the nearest target anchor and preserve gap labels"
);
assert.equal(
  findBestAlignmentMatch([geometrySource], [{ x: 40, y: 40, w: 20, h: 20 }], "x", 7),
  null,
  "Smart alignment must ignore targets outside tolerance"
);
assert.deepEqual(
  findBestAlignmentMatch([{ x: 0, y: 0, w: 20, h: 20 }], [
    { x: 26, y: 40, w: 20, h: 20 },
    { x: 26, y: 60, w: 20, h: 20 }
  ], "x", 7),
  { delta: 6, pos: 26, distance: 20, labelAt: 30 },
  "Equal alignment anchors must keep the first target's tie-breaking order"
);

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
const propertySchema = await read("scripts/core/property-schema.js");
const propertyPickerView = await read("scripts/sheets/property-picker-view.js");
const panelWindow = await read("scripts/sheets/panel-window.js");
const sheetListeners = await read("scripts/sheets/actor-sheet-listeners.js");
const canvasInteractions = await read("scripts/sheets/canvas-interactions.js");
const canvasViewport = await read("scripts/sheets/canvas-viewport.js");
const canvasPlayInteractions = await read("scripts/sheets/canvas-play-interactions.js");
const themeModule = await read("scripts/core/theme.js");
const libraryView = await read("scripts/sheets/library-view.js");
const actorSheetRendering = await read("scripts/sheets/actor-sheet-rendering.js");
const sheetCode = [sheet, sheetListeners, canvasInteractions, canvasPlayInteractions, libraryView, actorSheetRendering, propertyPickerView, panelWindow, themeModule].join("\n");

assert.equal(manifest.id, "nexus", "ID do sistema incorreto");
assert.equal(manifest.version, "1.0.0.62", "Versão do manifesto incorreta");
assert.ok(readme.includes(`Versão ${manifest.version}`), "README deve identificar a versão publicada");
assert.ok(changelog.startsWith(`## ${manifest.version}`), "CHANGELOG deve iniciar pela versão atual");
assert.equal(manifest.compatibility.minimum, "14", "Versão mínima do Foundry incorreta");
assert.match(sheetCode, /activateActorSheetListeners\(this, html/);
assert.match(sheet, /import \{[^}]*evaluateNexusSkillFormula[^}]*\} from "\.\.\/core\/skills\.js"/, "A fórmula de perícia deve estar importada no módulo da ficha");
assert.match(sheet, /this\._refreshBoundComponents\(\);\s*this\._activateCanvas\(\$\(form\)\);/, "O Canvas deve registrar os gatilhos automaticamente após cada renderização da ficha");
assert.match(sheet, /async _prepareContext\(options = \{\}\) \{\s*\/\/ O modo padrão é estado real da ficha, não apenas fallback de apresentação\.\s*this\._mode \?\?= "play";/, "O modo Padrão deve existir no estado interno antes da preparação da ficha");
assert.match(sheet, /target && typeof target === "object" && Object\.hasOwn\(target, "value"\)/, "Aliases de atributo devem editar o campo value de objetos");
assert.match(sheet, /Object\.hasOwn\(target, suffix\)/, "Aliases de recurso devem resolver value/max sem substituir o objeto");
assert.match(sheet, /const lookupPath = normalizeNexusPropertyPath\(path\)/, "Caminhos singulares e abreviados devem usar o normalizador canônico");
assert.doesNotMatch(sheet, /data-property-value-path/, "O identificador visual de caminho deve ser removido");
assert.match(sheetListeners, /resolvedPath\.alias && !targetPath/, "Aliases sem caminho físico devem salvar em customData");
assert.match(sheetListeners, /component\.dataPath = path;/, "O componente deve preservar o identificador do alias");
assert.match(sheetListeners, /!resolved\.path && !resolved\.alias/, "O editor deve aceitar aliases sem caminho físico em Actor.system");
assert.doesNotMatch(css, /nexus-property-value-panel/, "O campo de valor não deve criar um painel separado");
assert.match(template, /nexus-property-value-field[\s\S]*data-property-value/, "O valor deve permanecer no campo integrado do Inspector");
assert.match(propertyPickerView, /nexus-property-option-heading/, "O seletor deve organizar nome e caminho em linhas separadas");
assert.match(sheet, /textRow\)textRow\.hidden=!one/, "Conteúdo deve estar disponível para qualquer card selecionado");
assert.match(sheet, /dataRow\)dataRow\.hidden=!one/, "Propriedade relacionada deve estar disponível para qualquer card selecionado");
assert.match(sheet, /highestPanelZ === null \? desiredZ : Math\.min\(desiredZ, highestPanelZ - 1\)/, "As barras laterais não podem sobrepor janelas abertas");
assert.match(css, /nexus-behavior-editor button:not\(:disabled\)[\s\S]*cursor:pointer!important/, "Botões de comportamento devem restaurar o cursor de interação");
assert.match(canvasPlayInteractions, /onPointerMove[\s\S]*card\.style\.setProperty\("cursor", "pointer", "important"\)/, "Cards com gatilhos devem exibir a mãozinha no Modo Padrão");
assert.equal(normalizeNexusPropertyPath("for.value"), "attributes.for.value");
assert.equal(normalizeNexusPropertyPath("attribute.for.value"), "attributes.for.value");
assert.equal(normalizeNexusPropertyPath("resource.pv.value"), "resources.pv.value");
assert.equal(normalizeNexusPropertyPath("skill.athletics.value"), "skills.athletics.value");
assert.equal(normalizeNexusPropertyPath("system.attributes.for.value"), "attributes.for.value");
assert.equal(normalizeNexusPropertyPath("attributes.body.for.value"), "attributes.for.value");
assert.equal(normalizeNexusPropertyPath("skills.for.athletics.value"), "skills.athletics.value");
assert.equal(normalizeNexusPropertyPath("skills.atletismo.value"), "skills.athletics.value");
assert.equal(normalizeNexusPropertyPath("level"), "identity.level");
assert.equal(normalizeNexusPropertyPath("combat.mb"), "progression.mb.value", "O caminho legado combat.mb deve apontar para o MB armazenado");
assert.equal(normalizeNexusPropertyPath("combat.mb.value"), "progression.mb.value", "O caminho legado combat.mb.value deve apontar para o MB armazenado");
assert.equal(normalizeNexusPropertyPath("__proto__.polluted"), "");
assert.match(sheet, /const captureScrollState = owner/, "A ficha deve capturar a rolagem de todos os contêineres encontrados");
assert.match(sheet, /".nexus-native-panel-content"/, "A rolagem do conteúdo nativo dos painéis deve ser preservada");
assert.match(sheet, /".nexus-tool-panel"/, "A rolagem dos painéis de ferramentas deve ser preservada");
assert.match(sheet, /restoreScrollState\(this.element, sheetScrollState\)/, "A rolagem da ficha principal deve ser restaurada após renderização");
assert.match(sheet, /restoreScrollState\(element, state.scroll\)/, "A rolagem das janelas flutuantes deve ser restaurada após renderização");
assert.match(sheetCode, /buildPropertyPickerCatalog/);
assert.match(sheetCode, /renderPropertyPicker/);
assert.match(sheetCode, /activateCanvasInteractions/);
assert.match(sheet, /await import\("\.\/library-view\.js"\)/, "A Biblioteca deve carregar seu módulo somente quando aberta");
assert.doesNotMatch(sheet, /import \{ mountLibraryView \} from "\.\/library-view\.js"/, "A Biblioteca não deve ser carregada estaticamente na inicialização");
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
assert.doesNotMatch(propertyPickerView, /Valor atual:|nexus-property-option-value/, "O seletor não deve exibir uma prévia de valor");
assert.doesNotMatch(sheetListeners, /getValue: path => resolveNexusBinding\(sheet.actor, path\)\.value/, "O seletor não deve calcular prévias de valores que não são exibidas");
assert.doesNotMatch(propertyCatalog.match(/const DERIVED_SKILL_FIELDS = new Set\(\[[\s\S]*?\]\);/)?.[0] ?? "", /proficientLevel/, "Proficiência numérica não pode ser classificada como campo derivado");
assert.match(propertyPickerView, /createButton\("", "nexus-property-option"/, "As opções não devem duplicar o rótulo no texto do botão");
assert.match(propertyPickerView, /heading\.append\(title\)/, "O nome deve ocupar a primeira linha do item");
assert.match(propertyPickerView, /button\.append\(heading, code\)/, "O caminho deve ficar abaixo do nome");
assert.match(css, /nexus-property-option-name[\s\S]*nexus-property-option-path/, "O seletor deve exibir nome e caminho em duas linhas compactas");
assert.match(propertyPickerView, /category\.append\(heading, arrow\)/, "Categorias devem exibir apenas título e indicador de navegação");
assert.match(sheetListeners, /pointerdown.*data-property-category/s, "Navegar nas categorias deve manter o foco no campo de origem");
assert.match(sheetListeners, /\.nexus-native-panel-content/, "O estado de rolagem dos painéis deve ser preservado entre renderizações");
assert.match(themeModule, /--nexus-button-active-bg/);
assert.match(themeModule, /--nexus-canvas-scroll-bg/);
assert.match(sheet, /NEXUS_RULEBOOK_PROPERTY_DEFINITIONS/);
assert.equal(NEXUS_PROPERTY_SCHEMA_VERSION, 4);
const registryFixture = createPropertyRegistry({ core: [{ id: "nexus.core.level", path: "identity.level", label: "Nível", type: "number" }], native: [{ id: "nexus.core.level", key: "identity.level", targetPath: "identity.level", label: "Nível do personagem", type: "number" }], custom: [{ id: "custom-1", key: "custom.stealth", label: "Furtividade extra", type: "number", formula: "des + mb", calculationMode: "formula" }], external: ["details.reputation"] });
assert.equal(registryFixture.getByPath("identity.level")?.label, "Nível do personagem");
assert.equal(registryFixture.getById("custom-1")?.calculationMode, "formula");
assert.equal(registryFixture.resolve("details.reputation")?.origin, "external");
assert.equal(registryFixture.resolve("__proto__.polluted"), null);
const canonicalRegistry = createPropertyRegistry({
  core: NEXUS_RULEBOOK_PROPERTY_DEFINITIONS,
  native: [{ key: "combat.defense.value", type: "string", derived: false, label: "Defesa editável" }]
});
assert.equal(canonicalRegistry.resolve("combat.defense.value")?.readOnly, false, "Propriedades mecânicas do Core devem permanecer valores editáveis, sem cálculo obrigatório");
assert.equal(canonicalRegistry.resolve("combat.defense.value")?.type, "number", "Módulos não podem alterar o tipo de uma propriedade do Core");
assert.equal(canonicalRegistry.resolve("attributes.for.value")?.readOnly, false, "Atributos são valores armazenados e editáveis");
assert.ok(NEXUS_RULEBOOK_PROPERTY_PATHS.includes("skills.stealth.name"));
// Canonical property values and derived data.
const rulebookActor = {
  name: "Ayla",
  system: {
    identity: { level: 5 },
    attributes: { for: 2, des: 1, sab: 0, int: 0, car: 0, von: 0 },
    skills: { stealth: { value: 4, proficientLevel: 1 } },
    resources: { pv: { value: 12, max: 15, temporary: 2 }, pm: { value: 4, max: 8, temporary: 0 }, pe: { value: 6, max: 10, temporary: 0, recovery: { value: 12 } } },
    combat: { defense: { value: 10 }, initiative: { value: 1 }, movement: { value: 6, meters: 9 } },
    progression: { mb: { value: 3 } },
    recovery: { spent: 2, count: { value: 5 }, die: { value: "d8" }, available: { value: 3 } },
    encumbrance: { current: { value: 8 }, base: { value: 5 }, bonus: { value: 4 }, capacity: { value: 9 }, overloaded: { value: false } }
  }
};
assert.equal(getNexusRulebookPropertyValue(rulebookActor, "skills.stealth.name").value, "Furtividade");
assert.equal(getNexusRulebookPropertyValue(rulebookActor, "skills.stealth.exib").value, "FUR");
assert.equal(getNexusRulebookPropertyValue(rulebookActor, "skills.stealth.value").value, 4);
assert.equal(getNexusRulebookPropertyValue(rulebookActor, "skills.stealth.proficient").value, true);
assert.equal(getNexusRulebookPropertyValue(rulebookActor, "skills.stealth.proficientLevel").value, 1);
assert.equal(getNexusRulebookPropertyValue(rulebookActor, "skills.stealth.proficientLevel").readOnly, false, "Proficiência numérica deve ser editável");
assert.equal(getNexusRulebookPropertyValue(rulebookActor, "skills.stealth.proficientLevel").sourcePath, "skills.stealth.proficientLevel", "Proficiência deve apontar para o campo persistido");
assert.equal(normalizeInteractionPropertyPath("system.skills.athletics.proficientLevel"), "skills.athletics.proficientLevel");
assert.equal(normalizeInteractionPropertyPath("@skills.athletics.proficientLevel"), "skills.athletics.proficientLevel");
assert.equal(normalizeInteractionPropertyPath("skills..athletics"), "", "Destinos inválidos devem continuar bloqueados");
assert.equal(getNexusRulebookPropertyValue(rulebookActor, "attributes.for.value").value, 2);
assert.equal(getNexusRulebookPropertyValue(rulebookActor, "attributes.for.value").sourcePath, "attributes.for", "Atributos escalares devem gravar no caminho físico existente");
const nestedAttributeActor = { system: { attributes: { for: { value: 7 } }, progression: { mb: { value: 1 } } } };
assert.equal(getNexusRulebookPropertyValue(nestedAttributeActor, "attributes.for.value").value, 7, "Atributos legados aninhados devem ler o campo value");
assert.equal(getNexusRulebookPropertyValue(nestedAttributeActor, "attributes.for.value").sourcePath, "attributes.for.value", "Atributos legados aninhados devem gravar no campo value");
assert.equal(getNexusSkillRows(nestedAttributeActor).find(skill => skill.key === "athletics")?.attributeValue, 7, "Perícias devem ler atributos aninhados sem retornar zero");
assert.equal(evaluateNexusSkillFormula(nestedAttributeActor, "athletics", "for + mb"), 8, "Fórmulas de perícia devem usar o atributo aninhado");
const expressionAttributeActor = {
  system: { identity: { level: 4 }, attributes: { for: 2, des: 3 }, progression: { mb: { value: 2 } }, skills: {} },
  flags: { nexus: { propertyExpressions: { attributes: { for: { value: "{{attributes.des.value + mb}}" } } } } }
};
assert.equal(getNexusSkillRows(expressionAttributeActor).find(skill => skill.key === "athletics")?.attributeValue, 5, "Atributos usados por perícias devem reavaliar expressões vinculadas");
assert.equal(getNexusRulebookPropertyValue(expressionAttributeActor, "attributes.for.value").value, 5, "O registro de propriedades deve exibir o atributo dinâmico calculado");
const derivedExpressionActor = {
  system: { identity: { level: 4 }, attributes: { for: 2, des: 3 }, combat: { defenseModifier: 0 } },
  flags: { nexus: { propertyExpressions: { attributes: { des: { value: "{{attributes.for.value + 1}}" } } } } }
};
assert.equal(getNexusRulebookPropertyValue(derivedExpressionActor, "combat.defense.value").value, undefined, "A propriedade não deve calcular Defesa automaticamente a partir de atributos");


for (const attribute of NEXUS_ATTRIBUTES) {
  const scalar = { system: { attributes: { [attribute.key]: 3 } } };
  assert.equal(getNexusRulebookPropertyValue(scalar, `attributes.${attribute.key}.value`).value, 3, `Atributo ${attribute.key} deve ser lido como número`);
}
assert.equal(getNexusRulebookPropertyValue(rulebookActor, "attributes.for.exib").value, "FOR");
assert.equal(getNexusRulebookPropertyValue(rulebookActor, "resources.pv.name").value, "Pontos de Vida");
assert.equal(getNexusRulebookPropertyValue(rulebookActor, "progression.mb.value").value, 3, "O MB deve ser lido do valor atualmente armazenado");
assert.equal(getNexusRulebookPropertyValue(rulebookActor, "progression.mb.value").readOnly, false, "O MB deve ser um valor editável, sem cálculo obrigatório");
assert.equal(getNexusRulebookPropertyValue(rulebookActor, "progression.mb.value").formulaEditable, undefined, "A propriedade não deve receber fórmula predefinida");
assert.equal(getNexusBaseModifier(rulebookActor), 3, "O cálculo-base de MB continua disponível para as regras de perícias sem preencher o editor");
assert.equal(getNexusDefaultPropertyFormula("progression.mb.value"), "", "O sistema não deve preencher fórmulas globais no editor de propriedades");
assert.equal(getNexusRulebookPropertyValue({ system: { identity: { level: 5 }, progression: { mb: { value: 1 } } } }, "progression.mb.value").value, 1, "Um valor manual de MB não deve ser substituído pelo nível");
assert.equal(getNexusRulebookPropertyValue(rulebookActor, "recovery.die.value").value, "d8", "O dado de recuperação deve ser lido do valor armazenado");
assert.equal(getNexusRulebookPropertyValue(rulebookActor, "resources.pe.recovery.value").value, 12, "A recuperação de PE deve ser lida do valor armazenado");
assert.equal(getNexusRulebookPropertyValue(rulebookActor, "combat.defense.value").value, 10, "A Defesa deve preservar o valor armazenado");
assert.equal(getNexusRulebookPropertyValue(rulebookActor, "combat.initiative.value").value, 1, "A Iniciativa deve preservar o valor armazenado");
assert.equal(getNexusRulebookPropertyValue(rulebookActor, "combat.movement.meters").value, 9, "Metros deve ser lido do valor armazenado");
const nestedMovementActor = { system: { combat: { movement: { value: 7 } } } };
assert.equal(getNexusRulebookPropertyValue(nestedMovementActor, "combat.movement.value").value, 7);
assert.equal(getNexusRulebookPropertyValue(nestedMovementActor, "combat.movement.value").sourcePath, "combat.movement.value", "A edição deve preservar o formato aninhado do deslocamento");
assert.equal(getNexusRulebookPropertyValue(rulebookActor, "recovery.count.value").value, 5, "A quantidade de dados de recuperação deve ser lida do valor armazenado");
assert.equal(getNexusRulebookPropertyValue(rulebookActor, "recovery.available.value").value, 3, "Dados disponíveis devem ser lidos do valor armazenado");
assert.equal(getNexusRulebookPropertyValue(rulebookActor, "encumbrance.base.value").value, 5, "A carga base deve ser lida do valor armazenado");
assert.equal(getNexusRulebookPropertyValue(rulebookActor, "encumbrance.bonus.value").value, 4, "O bônus de carga deve ser lido do valor armazenado");
assert.equal(getNexusRulebookPropertyValue(rulebookActor, "encumbrance.capacity.value").value, 9, "A capacidade deve ser lida do valor armazenado");
assert.equal(getNexusRulebookPropertyValue(rulebookActor, "encumbrance.overloaded.value").value, false, "O estado de carga excedida deve ser lido do valor armazenado");
const customMbActor = {
  system: { identity: { level: 4 }, attributes: { for: 2 }, skills: { athletics: { proficientLevel: 1, formula: "{{attributes.for.value + (mb * proficientLevel)}}" } } },
  flags: { nexus: { propertyExpressions: { progression: { mb: { value: "{{attributes.for.value + 1}}" } } } } }
};
assert.equal(getNexusBaseModifier(customMbActor), 3, "O MB deve respeitar sua fórmula personalizada");
const customMbAttributeActor = {
  system: { identity: { level: 4 }, attributes: { for: 2, des: 1 } },
  flags: { nexus: { propertyExpressions: {
    progression: { mb: { value: "{{attributes.for.value + 1}}" } },
    attributes: { des: { value: "{{mb + 1}}" } }
  } } }
};
assert.equal(getNexusAttributeValue(customMbAttributeActor, "des"), 4, "Fórmulas de atributos devem usar o MB personalizado atual");
const cyclicFormulaActor = {
  system: { identity: { level: 4 }, attributes: { for: 2, des: 1 } },
  flags: { nexus: { propertyExpressions: {
    progression: { mb: { value: "{{attributes.des.value + 1}}" } },
    attributes: { des: { value: "{{mb + 1}}" } }
  } } }
};
assert.ok(Number.isFinite(getNexusBaseModifier(cyclicFormulaActor)), "Ciclos entre propriedades devem terminar com fallback seguro");
assert.equal(getNexusSkillRows(customMbActor).find(skill => skill.key === "athletics")?.value, 5, "Uma fórmula explicitamente configurada deve usar os valores atuais");
customMbActor.system.attributes.for = 4;
assert.equal(getNexusSkillRows(customMbActor).find(skill => skill.key === "athletics")?.value, 9, "Fórmulas explícitas devem reavaliar dependências atuais sem salvar snapshots");
const skillWithoutFormula = { system: { identity: { level: 10 }, attributes: { for: 5 }, skills: { athletics: { proficientLevel: 3 } } } };
assert.equal(getNexusSkillRows(skillWithoutFormula).find(skill => skill.key === "athletics")?.value, 0, "Perícias sem valor ou fórmula explícitos não devem receber cálculo predefinido");
assert.equal(getNexusBaseModifier(skillWithoutFormula), 0, "MB ausente deve permanecer sem cálculo predefinido");
assert.equal(getNexusRulebookPropertyValue(customMbActor, "resources.pe.recovery.value").value, undefined, "A propriedade de recuperação de PE não deve ser calculada pelo MB");
assert.equal(getNexusRulebookPropertyValue(rulebookActor, "combat.defense.value").value, 10);
assert.equal(getNexusRulebookPropertyValue(rulebookActor, "combat.initiative.value").value, 1);
assert.equal(getNexusRulebookPropertyValue(rulebookActor, "combat.movement.value").value, 6);
assert.equal(getNexusRulebookPropertyValue(rulebookActor, "combat.movement.meters").value, 9);
assert.equal(getNexusRulebookPropertyValue(rulebookActor, "recovery.count.value").value, 5);
assert.equal(getNexusRulebookPropertyValue(rulebookActor, "recovery.die.value").value, "d8");
assert.equal(getNexusRulebookPropertyValue(rulebookActor, "recovery.available.value").value, 3);
assert.equal(getNexusRulebookPropertyValue(rulebookActor, "resources.pe.recovery.value").value, 12);
assert.equal(getNexusRulebookPropertyValue(rulebookActor, "encumbrance.capacity.value").value, 9);
assert.equal(getNexusRulebookPropertyValue(rulebookActor, "encumbrance.current.value").value, 8);
assert.equal(getNexusRulebookPropertyValue(rulebookActor, "encumbrance.overloaded.value").value, false);
assert.equal(getNexusRulebookPropertyValue(rulebookActor, "identity.name").value, "Ayla");
assert.equal(getNexusRulebookPropertyValue(rulebookActor, "unregistered.path").matched, false);

assert.ok(NEXUS_RULEBOOK_PROPERTY_PATHS.includes("skills.stealth.exib"));
assert.ok(NEXUS_RULEBOOK_PROPERTY_PATHS.includes("skills.stealth.value"));
assert.ok(NEXUS_RULEBOOK_PROPERTY_DEFINITIONS.some(definition => definition.path === "combat.defense.value" && !definition.derived));
assert.match(sheet, /normalizeNexusProficientLevel/);
assert.match(sheet, /synchronizedSettings/);
assert.match(sheet, /this\._updateLayoutSetting\(\{/);
assert.match(libraryView, /sheet\._librarySection=key/);
assert.match(libraryView, /sheet\._librarySearchQuery/);
assert.match(sheetListeners, /await sheet\._applyThemePreset/);
assert.match(template, /type="number"[^>]*data-skill-proficient-level/);
assert.doesNotMatch(template, /type="checkbox"[^>]*data-skill-proficient-level/);
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
    "attributes.for", "attributes.des", "attributes.car",
    "skills.athletics.name", "skills.athletics.exib", "skills.athletics.value",
    "skills.athletics.proficientLevel", "skills.athletics.proficient", "skills.athletics.opposed"
  ]
});
const attributeRoot = findPropertyPickerNode(groupedProperties, "attributes");
assert.deepEqual([...attributeRoot.children.keys()].sort(), ["body", "mind", "soul"], "Atributos devem exibir somente os três núcleos no primeiro nível");
const soulGroup = findPropertyPickerNode(groupedProperties, "attributes.soul");
assert.equal(soulGroup.entry, null, "Alma deve ser um grupo, não um atributo numérico independente");
assert.ok(soulGroup.children.has("car") && soulGroup.children.has("von"), "Carisma e Vontade devem ficar dentro de Alma");
assert.ok(!groupedProperties.entries.some(entry => entry.path === "attributes.soul"), "O antigo caminho agregado de Alma não deve ser sugerido");
const athleticsGroup = findPropertyPickerNode(groupedProperties, "skills.for.athletics");
assert.ok(["name", "exib", "value", "proficientLevel", "description"].every(field => athleticsGroup.children.has(field)), "Perícias devem expor proficiência como propriedade numérica editável");
assert.ok(!athleticsGroup.children.has("opposed") && !athleticsGroup.children.has("proficient"), "Estados booleanos e opposed não devem aparecer no seletor editável");
assert.ok(!groupedProperties.entries.some(entry => entry.path === "skills.athletics.opposed"), "O estado opposed não deve ser oferecido como propriedade");
assert.match(css, /\.nexus-panel-window \.window-header/);
assert.match(css, /\.nexus-sheet \.nexus-canvas-scroll/);
assert.match(panelWindow, /export class NexusPanelWindow/);
assert.match(panelWindow, /animate: options\.animate \?\? false/, "Janelas devem fechar sem a animação longa padrão");
assert.match(themeModule, /export const applyThemeTokens/);
assert.match(libraryView, /export function mountLibraryView/);
assert.match(actorSheetRendering, /export function renderActorSheetRichMedia/);
assert.match(actorSheetRendering, /export function renderActorSheetAdaptiveContent/);
assert.match(actorSheetRendering, /IntersectionObserver/, "Áudio e vídeo devem usar carregamento sob demanda");
assert.match(actorSheetRendering, /nexusLazyMediaSrc/, "A fonte de mídia deve ser adiada até a aproximação da viewport");
assert.match(sheet, /mountLibraryView\(this, panel/);
assert.match(sheet, /renderActorSheetRichMedia\(this, root/);
const propertyTree = buildPropertyPickerCatalog({
  paths: ["attributes.for", "attributes.for.value", "attributes.for.name", "attributes.body", "attributes.for.checkbonus", "skills.athletics.value", "skills.atletismo.value", "skills.athletics.proficientLevel", "skills.atletismo.proficientLevel", "identity.name", "identity.level"]
});
assert.equal(propertyTree.root.children.get("attributes").label, "Atributos");
assert.equal(propertyTree.root.children.get("skills").label, "Perícias");
assert.equal(propertyTree.root.children.get("skills").children.get("for").children.get("athletics").label, "Atletismo");
assert.equal(propertyTree.entries.filter(entry => entry.path === "skills.athletics.value").length, 1, "Chaves legadas de perícia devem ser canonicalizadas sem duplicação");
assert.equal(propertyTree.entries.some(entry => entry.path === "skills.athletics.name"), true, "Metadados de perícia devem ser propriedades selecionáveis");
assert.equal(propertyTree.entries.some(entry => entry.path === "skills.athletics.proficientLevel"), true, "Proficiência numérica deve ser uma propriedade selecionável");
assert.equal(propertyTree.entries.some(entry => entry.path === "skills.athletics.proficient"), false, "O estado booleano derivado não deve ser editável");
assert.equal(propertyTree.entries.some(entry => entry.path === "attributes.body.checkbonus"), false, "Configuração de núcleos legados não deve aparecer como propriedade");
assert.equal(propertyTree.entries.find(entry => entry.path === "attributes.for.value").label, "Valor");
assert.equal(propertyTree.entries.find(entry => entry.path === "attributes.for.name").label, "Nome");
assert.equal(propertyTree.entries.some(entry => entry.path === "identity.name"), false, "O nome do Actor não deve duplicar identity.name");
const canonicalIdentityAndLoad = buildPropertyPickerCatalog({ paths: ["identity.token.img", "identity.token.border", "token.img", "token.border", "encumbrance.current", "encumbrance.base.value", "encumbrance.bonus.value", "encumbrance.capacity.value", "encumbrance.current.value", "encumbrance.overloaded.value"] });
assert.equal(canonicalIdentityAndLoad.entries.some(entry => ["token.img", "token.border", "encumbrance.current"].includes(entry.path)), false, "Aliases de token e carga legada não devem aparecer duplicados");
assert.equal(canonicalIdentityAndLoad.entries.some(entry => entry.path === "identity.token.img"), true, "A imagem do token deve permanecer dentro de Identidade");
const loadGroup = findPropertyPickerNode(canonicalIdentityAndLoad, "encumbrance");
assert.deepEqual([...loadGroup.children.keys()].sort(), ["base", "bonus", "capacity", "current", "overloaded"], "Carga deve exibir propriedades diretamente em um único grupo");
assert.ok([...loadGroup.children.values()].every(node => node.entry && node.children.size === 0), "Carga não deve criar subgrupos de propriedade única");
assert.equal(findPropertyPickerNode(propertyTree, "progression").children.get("level").entry.path, "identity.level", "Nível deve ficar em Progressão sem mudar o caminho salvo");
assert.equal(manifest.compatibility.verified, "14", "Versão verificada do Foundry incorreta");
assert.match(manifest.manifest, /raw\.githubusercontent\.com\/yottastrofficial-boop\/Nexus\/main\/system\.json$/);
assert.ok(manifest.download.endsWith(`/releases/download/v${manifest.version}/nexus.zip`), "URL do pacote deve apontar para a versão atual");

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

// Property migration normalizes legacy proficiency fields but preserves manually stored mechanical values.
const legacyPropertyActor = {
  system: {
    identity: { level: 4 },
    attributes: { des: 1 },
    skills: {
      athletics: { proficientLevel: 1 },
      furtividade: { opposed: true }
    },
    combat: { defense: 15, initiative: 3, movement: 6, mb: 2, ddr: 4, desl: 5 },
    progression: { mb: { value: 2 } },
    recovery: { spent: 1, count: 4, die: "d6", available: 3 },
    encumbrance: { current: 8, base: 5, bonus: 2, capacity: 7, overloaded: true },
    resources: { pv: { value: 12, max: 12 }, pe: { value: 5, max: 10, recovery: 8 } }
  },
  flags: { nexus: { activeLayout: "principal", aliases: [], customData: {}, nativeProperties: [{ id: "core.resource.pv", label: "PV antigo" }] } },
  updateCount: 0,
  getFlag(scope, key) { return this.flags[scope]?.[key]; },
  async setFlag(scope, key, value) {
    this.flags[scope] ??= {};
    this.flags[scope][key] = structuredClone(value);
  },
  async update(changes) {
    for (const [path, value] of Object.entries(changes)) {
      const parts = path.split(".");
      const leaf = parts.pop();
      let target = this;
      for (const part of parts) target = target[part] ??= {};
      target[leaf] = structuredClone(value);
    }
    this.updateCount++;
  }
};
const propertyMigrationDependencies = {
  actor: legacyPropertyActor,
  readLayouts: async () => ({ principal: {} }),
  getAliasDefinitions: () => [],
  getCustomAliasData: actor => actor.getFlag("nexus", "customData") ?? {},
  normalizeAliasDefinition: raw => raw,
  invalidateAliasDefinitionCache: () => {},
  getPath: getSafePath,
  clone: value => structuredClone(value),
  setProperty: setSafePath
};
const propertyMigration = await migrateLegacyActorData(propertyMigrationDependencies);
assert.equal(propertyMigration.propertiesMigrated, true);
assert.equal(legacyPropertyActor.system.skills.athletics.proficientLevel, 1);
assert.equal(legacyPropertyActor.system.skills.athletics.proficient, undefined);
assert.equal(legacyPropertyActor.system.skills.stealth.proficientLevel, -1, "A antiga marcação opposed deve migrar para nível negativo");
assert.equal(legacyPropertyActor.system.skills.stealth.proficient, undefined);
assert.equal(legacyPropertyActor.system.skills.furtividade, undefined);
assert.equal(legacyPropertyActor.system.combat.defenseModifier, undefined, "A migração não deve inventar modificadores mecânicos");
assert.equal(legacyPropertyActor.system.combat.defense, 15, "A migração deve preservar a Defesa manual");
assert.equal(legacyPropertyActor.system.combat.mb, 2, "A migração deve preservar MB manual legado");
assert.equal(legacyPropertyActor.system.combat.ddr, 4, "A migração deve preservar DdR manual legado");
assert.equal(legacyPropertyActor.system.combat.desl, 5, "A migração deve preservar DESL legado");
assert.equal(legacyPropertyActor.system.combat.initiative, 3, "A migração deve preservar Iniciativa manual");
assert.equal(legacyPropertyActor.system.combat.movement, 6);
assert.equal(legacyPropertyActor.system.progression.mb.value, 2, "O MB salvo deve ser preservado");
assert.equal(legacyPropertyActor.system.resources.pv.temporary, 0);
assert.equal(legacyPropertyActor.system.resources.pe.recovery, 8, "A migração deve preservar recuperação de PE manual");
assert.deepEqual(legacyPropertyActor.system.conditions, []);
assert.deepEqual(legacyPropertyActor.system.recovery, { spent: 1, count: 4, die: "d6", available: 3 }, "A migração deve preservar todos os valores de recuperação");
assert.deepEqual(legacyPropertyActor.system.encumbrance, { current: 8, base: 5, bonus: 2, capacity: 7, overloaded: true }, "A migração deve preservar os valores de carga");
assert.equal(legacyPropertyActor.flags.nexus.nativeProperties[0].label, "PV antigo", "Definições nativas existentes não devem ser apagadas");
const propertyMigrationWrites = legacyPropertyActor.updateCount;
const repeatedPropertyMigration = await migrateLegacyActorData(propertyMigrationDependencies);
assert.equal(repeatedPropertyMigration.propertiesMigrated, false);
assert.equal(legacyPropertyActor.updateCount, propertyMigrationWrites, "Migração de propriedades não deve regravar dados canônicos");


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

assert.ok(readme.includes(`Versão ${manifest.version}`));
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
assert.match(propertySchema, /exib: "PV"/, "A propriedade PV deve possuir abreviação própria");
assert.match(propertySchema, /NEXUS_ATTRIBUTES\.flatMap/, "Os seis atributos reais devem gerar propriedades nativas com abreviações próprias");
assert.doesNotMatch(sheetCode, /exib:"CORPO"/, "Corpo deve ser grupo, não propriedade numérica independente");
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
assert.match(sheetCode, /classList\.toggle\("is-selected", selected\)/, "A seleção deve aplicar diretamente o estado visual final");
assert.match(sheetCode, /classList\.toggle\("is-group-inspecting", memberSelected\)/, "A inspeção de grupos deve acompanhar o estado final da seleção");
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

assert.match(sheetCode, /expandNexusRollAliases\(this\.actor, expandNexusPropertyExpressions\(formula, this\.actor\)\)/, "Fórmulas devem aceitar referências {{propriedade}} e aliases curtos como @DES");
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
assert.match(canvasInteractions, /const applyKeyboardMoveFrame = \(\) => \{[\s\S]*?syncGroupBounds\(false\)/, "O movimento por teclado deve adiar o cálculo das conexões de cantos durante cada quadro");
assert.match(sheetCode, /scale<0\.12/, "Grupos muito espalhados devem alternar para uma miniatura em grade legível");

assert.match(sheetCode, /getNexusSkillRows\(this\.actor\)/, "O grupo deve usar perícias oficiais calculadas");
assert.match(sheetCode, /async _ensureNexusRulesData\(\)/, "Actors existentes devem receber os novos campos sem perder dados");
assert.match(sheetCode, /new foundry\.data\.operators\.ForcedDeletion\(\)/, "A migração deve usar ForcedDeletion ao remover chaves legadas de perícias");
assert.match(sheetCode, /LEGACY_SKILL_PATHS/, "O scanner não deve redescobrir caminhos de perícias legadas");
assert.doesNotMatch(template, /Digite @ para consultar|Os quatro nomes são rótulos configuráveis|Exibe uma barra arrastável|Ao clicar neste card no modo de jogo/, "Dicas instrutivas do Inspector devem ser removidas");
const propertyValueField = template.match(/<label[^>]*data-property-value-row[\s\S]*?<\/label>/)?.[0] ?? "";
assert.doesNotMatch(propertyValueField, /placeholder=|title=/, "O campo Valor não deve exibir dicas ou tooltips instrutivos");
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
console.log(`NEXUS ${manifest.version}: catálogo canônico, proficiência assinada e sincronização de temas verificados.`);


// Proficiency is stored independently; skill totals require an explicit value or formula.
const negativeSkillActor = {
  system: {
    identity: { level: 4 },
    attributes: { for: -5, des: 0, sab: 0 },
    progression: { mb: { value: 2 } },
    skills: {
      athletics: { proficientLevel: 0, formula: "{{attributes.for.value}}" },
      stealth: { proficientLevel: -3, formula: "{{attributes.des.value - mb}}" },
      perception: { proficientLevel: 2, formula: "{{attributes.sab.value + mb}}" }
    }
  }
};
assert.equal(getNexusSkillModifier(negativeSkillActor, "athletics").modifier, -5, "Atributos negativos devem permanecer negativos");
assert.equal(getNexusSkillModifier(negativeSkillActor, "stealth").modifier, -2, "Nível negativo deve subtrair MB uma única vez, preservando a magnitude no dado");
assert.equal(getNexusSkillModifier(negativeSkillActor, "perception").modifier, 2, "Nível positivo deve adicionar MB uma única vez");
assert.equal(getNexusSkillModifier(negativeSkillActor, "stealth").proficientLevel, -3);
assert.equal(getNexusSkillModifier(negativeSkillActor, "perception").proficientLevel, 2);
assert.equal(normalizeNexusProficientLevel(-9), -9);
assert.equal(normalizeNexusProficientLevel(9), 9);
assert.equal(normalizeNexusProficientLevel(0), 0);
assert.equal(getNexusSkillModifier(negativeSkillActor, "stealth").value, -2);
assert.equal(getNexusSkillModifier(negativeSkillActor, "stealth").exib, "FUR");
const legacySkillRows = getNexusSkillRows({ system: { skills: { atletismo: { proficient: true } } } });
assert.equal(legacySkillRows.find(skill => skill.key === "athletics").proficient, true, "Dados antigos devem ser lidos durante a migração");
assert.equal(legacySkillRows.find(skill => skill.key === "athletics").value, 0, "Proficiência não deve gerar bônus automático sem fórmula ou valor armazenado");
assert.equal(normalizeNexusProficientLevel(-1), -1, "Níveis negativos devem ser preservados");
assert.equal(legacySkillRows.find(skill => skill.key === "athletics").name, "Atletismo");
assert.match(sheetListeners, /if \(valueKind === "number"\) \{\s*if \(String\(value\)\.trim\(\) === ""\) value = 0;[\s\S]*?value = Number\(value\);\s*\}/, "Propriedades numéricas vazias devem assumir zero e números finitos, inclusive negativos, devem ser preservados");
assert.match(sheetListeners, /const expression = typeof value === "string"[\s\S]*?valueKind === "number" && typeof calculated !== "number"/, "Propriedades numéricas também devem aceitar expressões cujo resultado seja numérico");

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
assert.ok(canvasPlayInteractions.includes('["pointerover",onPointerOver]'));
assert.ok(sheetCode.includes("_executeComponentAction"));
assert.match(sheet, /normalizeInteractionPropertyPath\(config\.path\)/, "Ação update deve normalizar caminhos canônicos");
assert.match(sheet, /await roll\.evaluate\(\)/, "Rolagens assíncronas devem usar a API atual do Foundry");
assert.doesNotMatch(sheet, /evaluate\(\{\s*async:\s*true\s*\}\)/, "A opção async removida não pode ser usada");
assert.match(sheetListeners, /await sheet\._writeLayouts\(layouts, active, \{ render: false \}\)/, "Editar um fluxo não deve reconstruir a ficha inteira");
assert.match(sheetListeners, /behaviorEditor\.dataset\.activeInteractionId = activeInteractionId;[\s\S]*?renderInteractionEditor\(behaviorEditor/, "A aba ativa deve ser restaurada antes de redesenhar o editor");
assert.match(sheetListeners, /const updatePath = resolvedPath\.virtual && actorRootPath \? updateTargetPath : `system\.\$\{updateTargetPath\}`/, "Propriedades virtuais do Actor devem ser gravadas no caminho system correto");
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
assert.ok(css.includes(".nexus-interaction-group.nexus-interaction-trigger-group { min-height:54px"), "O grupo de gatilhos deve iniciar com altura mínima de 54 px");
assert.ok(css.includes(".nexus-library-flow-details"), "A Biblioteca deve reservar uma área de detalhes para fluxos");
assert.ok(css.includes(".nexus-component.nexus-component-corner-square-br"), "O arredondamento deve ser controlado por classes de cantos individuais");
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
const savedFlowId = getInteractionLibrary(fakeLibraryActor)[0].id;
await deleteInteractionFromLibrary(fakeLibraryActor,savedFlowId);
assert.equal(getInteractionLibrary(fakeLibraryActor).length,0,"Fluxos salvos devem poder ser excluídos da biblioteca");
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
assert.match(sheetCode,/_deleteSavedLibraryGroup/,"Grupos pessoais devem poder ser excluídos");
assert.match(sheetListeners,/data-library-delete-flow/,"A Biblioteca deve expor a ação de excluir fluxos");
assert.match(sheetListeners,/data-library-delete-saved-group/,"A Biblioteca deve expor a ação de excluir grupos");
assert.match(template,/data-library-flow-details/,"A Biblioteca deve ter um painel de detalhes dos fluxos");
assert.match(sheetCode,/propertyPickerId/,"A ficha deve reutilizar um único seletor de propriedades");
assert.match(sheetCode,/data-interaction-property-input/,"Condições devem usar o seletor compartilhado");
assert.match(sheetCode,/expandNexusPropertyExpressions/,"Fórmulas devem resolver referências de propriedades");
assert.match(interactions,/dataset\.rollFormulaInput/,"Campos de fórmula do editor de fluxos devem usar o buscador compartilhado");
assert.doesNotMatch(interactions,/const list=el\("div","nexus-property-options"\)/,"O editor de fluxos não deve criar um segundo buscador de propriedades");
assert.match(css,/nexus-library-personal-preview/,"Itens pessoais devem usar miniaturas quadradas");
assert.match(css,/nexus-property-options-toolbar/,"O buscador de propriedades deve oferecer navegação hierárquica e pesquisa");


const canvasGroups = await readFile(new URL("../scripts/sheets/canvas-group-rendering.js", import.meta.url), "utf8");
const canvasCorners = await readFile(new URL("../scripts/sheets/canvas-connected-corners.js", import.meta.url), "utf8");
assert.match(sheetCode,/renderCanvasGroups\(this, form\)/,"Grupos devem ser renderizados também no Modo Padrão");
assert.match(canvasGroups,/nexus-group-surface/,"O renderizador compartilhado deve criar a superfície visual do grupo");
assert.match(canvasGroups,/is-group-member/,"O renderizador compartilhado deve marcar os componentes pertencentes a grupos");
assert.ok(css.includes(".nexus-group-surface.is-static"),"Superfícies de grupo no Modo Padrão não devem bloquear controles");


assert.equal(evaluateNexusFormula("(nivel + mb) * 2", key => ({ nivel: 3, mb: 2 })[key]), 10, "Fórmulas devem respeitar parênteses e precedência aritmética");
assert.equal(evaluateNexusFormula("des + mb", key => ({ des: 4, mb: 2 })[key]), 6, "Fórmulas devem resolver propriedades numéricas");
assert.equal(evaluateNexusFormula("nivel / 0", key => ({ nivel: 3 })[key]), null, "Divisão por zero deve ser rejeitada");
assert.equal(evaluateNexusFormula("constructor + 1", () => 1), null, "Referências inseguras devem ser rejeitadas");
assert.equal(evaluateNexusFormula("nivel - mb", key => ({ nivel: 5, mb: 2 })[key]), 3);
assert.equal(normalizeNexusFormulaIdentifier("level"), "identity.level", "O atalho level deve apontar para o nível do personagem");
assert.equal(normalizeNexusFormulaIdentifier("nivel"), "identity.level", "O atalho nivel deve continuar aceito em português");
assert.equal(normalizeNexusFormulaIdentifier("mb"), "progression.mb.value", "O atalho mb deve apontar para a propriedade MB armazenada");
assert.equal(normalizeNexusFormulaIdentifier("for"), "attributes.for.value", "O atalho for deve apontar para o valor do atributo");
const formulaResolutionActor = {
  system: {
    identity: { level: 5 },
    attributes: { for: 2 },
    progression: { mb: { value: 3 } },
    skills: { athletics: { proficientLevel: 1 } }
  }
};
const resolveFormulaTestProperty = identifier => {
  const path = normalizeNexusFormulaIdentifier(identifier);
  const rulebookValue = getNexusRulebookPropertyValue(formulaResolutionActor, path);
  if (rulebookValue.matched) return rulebookValue.value;
  return path.split(".").reduce((value, key) => value?.[key], formulaResolutionActor.system);
};
assert.equal(
  evaluateNexusExpression("attributes.for.value + (mb * skills.athletics.proficientLevel)", resolveFormulaTestProperty),
  5,
  "Expressões devem resolver atributos, MB e nível de proficiência pela mesma normalização"
);
assert.equal(
  evaluateNexusExpression("ceil(level/2)", resolveFormulaTestProperty),
  3,
  "Funções matemáticas devem aceitar atalhos como level"
);
assert.equal(evaluateNexusFormula("ceil(level / 2)", key => ({ level: 5 })[key]), 3, "ceil deve permanecer disponível no avaliador seguro");
assert.equal(evaluateNexusFormula("empty + mb", key => ({ empty: "", mb: 4 })[key]), 4, "Um campo numérico vazio deve valer zero em uma soma");
assert.equal(evaluateNexusFormula("empty * mb", key => ({ empty: "", mb: 4 })[key]), 0, "Um campo numérico vazio deve valer zero em uma multiplicação");
assert.equal(evaluateNexusFormula("empty - mb", key => ({ empty: "", mb: 4 })[key]), -4, "Um campo numérico vazio deve valer zero em uma subtração");
assert.match(sheet, /calculationMode === "formula"/);
assert.match(template, /data-alias-field="formula"/);
assert.match(propertyCatalog, /createPropertyRegistry/);
assert.match(sheet, /normalizeNexusFormulaIdentifier/, "Fórmulas devem usar um normalizador compartilhado de identificadores");
assert.ok(css.includes(".nexus-panel-window .nexus-component-editor > h3") && css.includes("display:flex !important"), "O Inspector deve exibir seu cabeçalho de forma clara");
assert.ok(css.includes(".nexus-panel-window .nexus-inspector-tab-panel:not([hidden])"), "As abas do Inspector devem organizar o conteúdo em painéis");
assert.ok(css.includes(".nexus-panel-window .nexus-data-binding"), "O vínculo de dados deve ter uma área visual própria");
assert.match(sheetListeners, /resolveNexusBinding\(sheet\.actor, resolveFormulaIdentifier\(identifier\), 1\)/, "A validação de fórmulas deve normalizar atalhos antes de resolver propriedades");
assert.match(sheetCode, /evaluateNexusExpression\(formulaSource/, "Interpolação {{...}} deve calcular expressões, não apenas caminhos");


const proficiencyAsset = NEXUS_LIBRARY_CATALOG.assets.find(item => item.key === "core-skill-proficiency");
assert.ok(proficiencyAsset, "A Biblioteca deve disponibilizar o marcador de proficiência");
assert.equal(proficiencyAsset.template.actionPath, "skills.athletics.proficientLevel", "O marcador da Biblioteca deve apontar para o valor numérico canônico");
assert.equal(proficiencyAsset.type, "sheet-proficiency", "O marcador deve usar o componente dedicado");
const formulaTestActor = { system: { identity: { level: 4 }, attributes: { for: 3 }, combat: { mb: 2 }, skills: { athletics: { proficientLevel: 2 } } } };
assert.equal(evaluateNexusSkillFormula(formulaTestActor, "athletics", "{{attributes.for.value}} + ({{combat.mb * skills.athletics.proficientLevel}})"), 7, "A fórmula com interpolação em cada parcela deve calcular corretamente");
assert.equal(evaluateNexusSkillFormula(formulaTestActor, "athletics", "@FOR + (@MB*{{skills.athletics.proficientLevel}})"), 7, "Atalhos @FOR e @MB devem funcionar em fórmulas de perícia");
assert.equal(evaluateNexusSkillFormula(formulaTestActor, "athletics", "{{attributes.for.value + (combat.mb * skills.athletics.proficientLevel)}}"), 7, "A expressão completa entre chaves deve calcular corretamente");
assert.equal(evaluateNexusSkillFormula(formulaTestActor, "athletics", "força + (mb * proficiencia)"), 5, "O atalho de proficiência deve continuar aplicando apenas o sinal do nível");
assert.match(template, /data-skill-proficiency-toggle/, "O marcador deve expor o controle de alternância");
assert.match(sheetListeners, /_setSkillProficientLevel\(skill\.key, nextLevel\)/, "O marcador deve atualizar a proficiência da perícia vinculada");
assert.match(sheetCode, /propertyValueInput\.dataset\.propertyKind = propertyType/, "O campo deve preservar o tipo real da propriedade");
assert.doesNotMatch(sheet, /skillValueMatch/, "O valor da perícia deve ser um campo armazenado, não um atalho para fórmula predefinida");
assert.ok(sheet.includes('propertyPath.match(/^skills\\.([a-zA-Z0-9_-]+)\\.formula$/)'), "O caminho explícito .formula também deve abrir o editor");
assert.doesNotMatch(sheet, /MB é calculado automaticamente pelo nível/);
assert.doesNotMatch(sheetCode, /data-property-value-hint/);
assert.match(sheet, /propertyFormulaMode \? \(storedExpression \?\? effectivePath\.formula \?\?/);
assert.match(sheetListeners, /actorPropertyWriteQueues = new WeakMap/, "Gravações de propriedades do mesmo Actor devem ser serializadas");
assert.match(sheetListeners, /await serializeActorPropertyWrite\(sheet\.actor, async \(\) => \{/, "Edições manuais e fórmulas devem compartilhar a mesma fila de persistência");
assert.match(sheet, /async _updateSystemValue\(input\) \{\s*return serializeActorPropertyWrite\(this\.actor/, "Campos de dados e sliders devem usar a fila comum de gravação");
assert.match(sheet, /async _setSkillProficientLevel\(skillKey, rawLevel\) \{\s*return serializeActorPropertyWrite\(this\.actor/, "Alterações de proficiência devem usar a fila comum");
assert.match(sheet, /action\?\.type === "update"[\s\S]*?return serializeActorPropertyWrite\(this\.actor/, "Actions de interação também devem serializar alterações de propriedades");
assert.match(sheetListeners, /data-config-current-value[\s\S]*?serializeActorPropertyWrite\(sheet\.actor/, "Valores de recursos no Inspector devem compartilhar a fila");
assert.doesNotMatch(sheetListeners, /propertyExpressionQueues = new WeakMap/, "A fila não deve serializar apenas fórmulas e deixar valores manuais concorrentes");
assert.match(sheetListeners, /Falha ao salvar uma propriedade do Actor/, "Falhas de autosave devem ser registradas e notificadas");
assert.match(sheetListeners, /writePropertyExpression\(sheet\.actor, path, String\(value\)\)/);
assert.ok(sheet.includes('skills.${legacyProficiency[1]}.proficientLevel'), "O caminho legado de proficiência deve depender do nível numérico persistido");
assert.doesNotMatch(sheetCode, /propertyValueInput\.type = "number"/, "O campo não deve bloquear expressões por usar input numérico");
assert.match(sheetCode, /const inputValue = skillFormulaMode \? skillFormula[\s\S]*?propertyFormulaMode \? \(storedExpression \?\? effectivePath\.formula \?\?/, "O editor deve exibir apenas expressões salvas manualmente, sem preencher fórmulas padrão");
assert.match(sheetCode, /skillProficiencyLevel: skillProficiency\?\.proficientLevel/, "Cards devem observar o nível numérico da perícia");
assert.match(template, /component\.proficiencyIcon/, "O ícone do card deve refletir dinamicamente o nível de proficiência");
assert.match(sheetListeners, /event\.shiftKey \? -1 : 1/, "Shift+clique deve reduzir o nível de proficiência");
assert.match(sheetListeners, /event\.altKey \? 0/, "Alt+clique deve redefinir a proficiência");
assert.match(template, /skill\.formatted/, "O valor calculado da perícia deve permanecer visível sem rolagem");
assert.match(css, /nexus-skill-proficiency-toggle/, "O marcador deve possuir estilo circular próprio");


// Behavior representation rules and event-driven formula refresh.
const expressionValues = { level: 5, mb: 3, "identity.level": 5 };
const resolveExpressionValue = key => expressionValues[key];
assert.equal(evaluateNexusFormula("level % 2", resolveExpressionValue), 1, "O operador módulo deve calcular o resto");
assert.equal(evaluateNexusExpression("min(5, ceil(4 / 2))", () => undefined), 2, "Funções matemáticas seguras devem funcionar nas fórmulas");
assert.equal(evaluateNexusExpression("if(5 <= 6, 'd8', 'd10')", () => undefined), "d8", "A função if deve permitir fórmulas condicionais seguras");
assert.equal(getNexusDefaultSkillFormula("athletics"), "", "Perícias não devem receber fórmulas globais predefinidas");
assert.equal(getNexusSkillRows(formulaTestActor).find(skill => skill.key === "athletics")?.formula, "", "A fórmula da perícia deve permanecer vazia até ser definida manualmente");
assert.equal(getNexusSkillRows(formulaTestActor).find(skill => skill.key === "athletics")?.value, 0, "Perícias sem valor ou fórmula explícitos não recebem cálculo padrão");
assert.equal(evaluateNexusFormula("@level + @mb", resolveExpressionValue), 8, "Referências com @ devem funcionar nas fórmulas do editor");
assert.equal(evaluateNexusCondition("@level > @mb", resolveExpressionValue), true, "Referências com @ devem funcionar nas condições");
assert.equal(evaluateNexusCondition("{{@level}} >= 5", resolveExpressionValue), true, "Referências entre chaves devem funcionar dentro de comparações");
assert.equal(evaluateNexusCondition("{{@level >= 5}}", resolveExpressionValue), true, "Expressões completas entre chaves devem funcionar nas condições");
assert.equal(evaluateNexusCondition("level > mb", resolveExpressionValue), true, "Condições devem aceitar comparações numéricas");
assert.equal(evaluateNexusCondition("(level + mb) >= 8", resolveExpressionValue), true, "Comparações devem respeitar parênteses e precedência");
assert.equal(evaluateNexusCondition("level < mb", resolveExpressionValue), false);
assert.equal(evaluateNexusCondition("level / 0 > mb", resolveExpressionValue), null, "Condições inválidas devem falhar com segurança");

const representationComponent = {
  id: "representation-card",
  representation: {
    enabled: true,
    sourcePath: "identity.level",
    rules: [{ id: "rule-1", condition: "level > mb", icon: "✦", label: "Superior", output: "level + mb" }]
  }
};
const representationResult = evaluateComponentRepresentation(representationComponent.representation, resolveExpressionValue);
assert.equal(representationResult.active, true);
assert.equal(representationResult.sourceValue, 5);
assert.equal(representationResult.value, 8);
assert.equal(representationResult.icon, "✦");
assert.equal(normalizeComponentRepresentation({ rules: [{}] }).rules[0].name, "Regra 1");
const mixedRepresentation = evaluateComponentRepresentation({
  enabled: true, sourcePath: "identity.level",
  rules: [{ name: "Nível avançado", condition: "{{@level}} >= 5", content: "Nível {{@level}} (@level) · total {{@level + @mb}}" }]
}, resolveExpressionValue);
assert.equal(mixedRepresentation?.content, "Nível 5 (5) · total 8", "O conteúdo deve aceitar referências com chaves, @ simples e fórmulas");
const truthyRepresentation = evaluateComponentRepresentation({
  enabled: true, sourcePath: "identity.level",
  rules: [{ condition: "@level", content: "Ativo" }]
}, resolveExpressionValue);
assert.equal(truthyRepresentation?.content, "Ativo", "Uma referência direta pode ser usada como condição de presença");
assert.equal(evaluateComponentRepresentation({ ...representationComponent.representation, rules: [{ condition: "level < mb" }] }, resolveExpressionValue), null, "Sem regra compatível, a apresentação original deve permanecer");

// Dynamic proficiency presentation: every signed stage must select exactly its rule.
const proficiencyStages = [-2, -1, 0, 1, 2];
let currentProficiency = 0;
const resolveProficiency = key => key === "proficiency" ? currentProficiency : undefined;
const proficiencyPresentation = {
  enabled: true,
  sourcePath: "proficiency",
  rules: proficiencyStages.map(level => ({
    id: "stage-" + level,
    condition: "proficiency == " + level,
    content: "{{icon:fa-solid fa-star}} Estágio {{proficiency}}"
  }))
};
for (const level of proficiencyStages) {
  currentProficiency = level;
  const result = evaluateComponentRepresentation(proficiencyPresentation, resolveProficiency);
  assert.equal(result?.ruleId, "stage-" + level, "Cada nível de proficiência deve selecionar sua regra, inclusive valores negativos e zero");
  assert.equal(result?.content, "{{icon:fa-solid fa-star}} Estágio " + level, "O conteúdo da regra deve acompanhar o valor atual");
}

// A matching condition with an unresolved/empty interpolation must not hide
// the original property value or leave the card visually empty.
currentProficiency = 0;
const emptyInterpolationFallback = evaluateComponentRepresentation({
  enabled: true,
  sourcePath: "proficiency",
  rules: [{ id: "fallback", condition: "proficiency == 0", content: "{{missing.property}}" }]
}, resolveProficiency);
assert.equal(emptyInterpolationFallback?.content, "0", "Conteúdo vazio deve recuar para o valor da propriedade de origem");

// The selected presentation path must be retained when the component has no
// explicit dataPath, and virtual aliases must invalidate from their real source.
assert.match(sheet, /component\?\.dataPath \|\| presentation\?\.sourcePath \|\| COMPONENTS\[component\?\.type\]\?\.path/, "A fonte explícita da regra deve ser respeitada antes do caminho padrão");
assert.match(sheet, /binding\?\.sourcePath/, "Dependências virtuais devem observar seu caminho persistido real");
assert.match(sheet, /persistedLayouts/, "A persistência deve atualizar o snapshot em memória com o merge consolidado");


const representationDraft = { id: "representation-editor", representation: { enabled: false, sourcePath: "", rules: [] }, interactions: [] };
applyInteractionEditorCommand(representationDraft, "add-representation-rule", { interactionId: representationDraft.id });
assert.equal(representationDraft.representation.rules.length, 1);
applyInteractionEditorChange(representationDraft, { scope: "representation", interactionId: representationDraft.id, field: "enabled" }, true);
applyInteractionEditorChange(representationDraft, { scope: "representation", interactionId: representationDraft.id, field: "sourcePath" }, "{{identity.level}}");
applyInteractionEditorChange(representationDraft, { scope: "representationRule", interactionId: representationDraft.id, ruleIndex: 0, field: "condition" }, "level > mb");
applyInteractionEditorChange(representationDraft, { scope: "representationRule", interactionId: representationDraft.id, ruleIndex: 0, field: "output" }, "level + mb");
assert.equal(representationDraft.representation.enabled, true);
assert.equal(representationDraft.representation.sourcePath, "identity.level");
assert.equal(representationDraft.representation.rules[0].condition, "level > mb");
assert.equal(representationDraft.representation.rules[0].name, "Regra 1");
applyInteractionEditorChange(representationDraft, { scope: "propertyPresentationRule", ruleIndex: 0, field: "name" }, "Minha regra");
assert.equal(representationDraft.propertyPresentation.rules[0].name, "Minha regra");
applyInteractionEditorCommand(representationDraft, "add-property-rule", { sourcePath: "identity.level" });
applyInteractionEditorCommand(representationDraft, "move-property-rule", { ruleIndex: 1, direction: -1 });
assert.equal(representationDraft.propertyPresentation.rules[0].name, "Regra 2", "A ordem das regras deve ser editável e persistida");
assert.equal(representationDraft.representation.rules[0].output, "level + mb");
assert.match(interactions, /renderPropertyPresentationEditor/, "As regras de apresentação devem integrar o painel Propriedades");
assert.match(sheetCode, /Hooks\.on\("updateActor"/, "A atualização reativa deve responder a eventos reais do Actor");
assert.match(sheetCode, /_refreshRichExpressions\?\.\(refreshedComponentIds\)/, "Somente os componentes afetados devem reavaliar suas expressões");
assert.match(sheetCode, /_componentDependsOnActorChanges/, "A invalidação deve comparar as dependências com os caminhos alterados");
assert.match(actorSheetRendering, /nexusExpressionSource/, "O renderizador deve preservar a expressão original para reavaliação");
assert.match(template, /nexus-property-representation/, "Componentes devem renderizar a representação selecionada");
assert.match(template, /<span class="nexus-property-representation-value">\{\{component\.representationContent\}\}<\/span>/, "O template deve exibir o campo representationContent produzido pelo avaliador");
assert.doesNotMatch(template, /component\.representation(?:Value|Icon|Label)/, "O template não deve depender de campos de representação que não existem no contexto");
assert.match(sheet, /this\._renderRichMedia\(form\);\s*this\._refreshBoundComponents\(\);/, "A primeira renderização deve usar o mesmo atualizador das regras reativas");
assert.doesNotMatch(css, /font-size:\s*min\(var\(--nexus-component-font-size/, "O conteúdo não deve reduzir a fonte automaticamente conforme a dimensão do card");
assert.match(css, /\.nexus-property-representation-value\s*\{[^}]*font-size:1em;/s, "O texto da representação deve respeitar o tamanho tipográfico do conteúdo");
assert.match(css, /nexus-component\.has-representation/, "A representação deve substituir apenas a saída visual do componente");

 
// Property presentation v1.0.0.37.
assert.equal(evaluateNexusCondition("@level=5", resolveExpressionValue), true, "Single = must act as equality");
assert.equal(evaluateNexusCondition("@level==5", resolveExpressionValue), true, "Double == remains supported");
assert.match(interactions, /renderPropertyPresentationEditor/, "Presentation rules must live in the Properties editor");
assert.match(interactions, /propertyPresentationRule/, "Presentation rules must be persisted independently from interaction flows");
assert.match(interactions, /content: rule\?\.content === undefined/, "Unified content must preserve legacy output compatibility");
assert.match(sheetCode, /representationContent/, "Rendering must use a single mixed content field");
assert.match(sheet, /https\?:/, "URLs de mídia devem ser reconhecidas sem marcador explícito");
assert.ok(sheet.includes("standaloneIcon"), "Classes Font Awesome isoladas devem ser reconhecidas automaticamente");
assert.ok(sheet.includes("image.style[key] = rawValue"), "Tokens de imagem devem aceitar dimensões personalizadas seguras");
assert.ok(sheet.includes("is-media-only"), "Mídia isolada deve receber layout próprio para ocupar o card");
assert.match(css, /nexus-property-representation\.is-media-only \.nexus-property-representation-image/, "Imagens isoladas devem preencher o espaço disponível sem distorção");
assert.match(css, /object-fit:contain/, "Imagens das representações devem preservar a proporção");
assert.match(template, /data-property-presentation-editor/, "The editor must be mounted in the Properties panel");
assert.match(template, /data-property-alias-conflicts/, "The Properties panel must expose ambiguity warnings");
assert.match(css, /nexus-component\.is-group-member,\.nexus-component\.is-group-member:hover/, "Grouped cards must share one rounded surface");
assert.ok(css.includes('.nexus-sheet[data-mode="play"] .nexus-component:not(.is-group-member)'), "A borda padrão deve permanecer visível fora do modo de aparência");
assert.ok(css.includes('border:1px solid var(--nexus-component-border,#52647b) !important;'), "A borda deve respeitar a cor personalizada e um fallback visível");
assert.ok(interactions.includes('nexus-property-presentation-rule-name'), "As regras devem permitir nomes próprios");
assert.ok(interactions.includes('move-property-rule'), "A ordem das regras deve ser editável");
const propertyEditorStart = interactions.indexOf("export function renderPropertyPresentationEditor(");
const propertyEditorEnd = interactions.indexOf("\n}", propertyEditorStart);
const propertyEditorSource = interactions.slice(propertyEditorStart, propertyEditorEnd);
assert.ok(!propertyEditorSource.includes("placeholder"), "O editor de regras não deve exibir placeholders");
assert.ok(sheetCode.includes('const presentation = component.propertyPresentation ?? component.representation'), "A atualização reativa deve observar as regras novas e legadas");


// v1.0.0.40 — expressão tipada, comparadores e contatos geométricos.
const values40={level:5,mb:3,label:"NEXUS",portrait:"systems/nexus/assets/portrait.webp"};
const resolver40=(key,options={})=>options.display?(key==="label"?"Nome exibido":values40[key]):values40[key];
assert.equal(evaluateNexusExpression("2 + 2 + 2",resolver40),6);
assert.equal(evaluateNexusExpression('"2" + "2" + "2"',resolver40),"222");
assert.equal(evaluateNexusExpression('"NEXUS" + " RPG"',resolver40),"NEXUS RPG");
assert.equal(evaluateNexusExpression("@label",resolver40),"Nome exibido");
assert.equal(evaluateNexusExpression("label",resolver40),"NEXUS");
assert.equal(evaluateNexusCondition("@level == 5",resolver40),true);
assert.equal(evaluateNexusCondition("{{level}} == 5",resolver40),true);
assert.equal(evaluateNexusCondition("5 = 5",resolver40),true);
assert.equal(evaluateNexusCondition("5 != 3",resolver40),true);
assert.equal(evaluateNexusCondition("5 > 3",resolver40),true);
assert.equal(evaluateNexusCondition("3 < 5",resolver40),true);
assert.equal(evaluateNexusCondition("5 >= 5",resolver40),true);
assert.equal(evaluateNexusCondition("5 <= 5",resolver40),true);
assert.equal(evaluateNexusCondition('"NEXUS" == "NEXUS"',resolver40),true);
assert.equal(evaluateNexusCondition('"NEXUS" != "RPG"',resolver40),true);
assert.equal(evaluateNexusFormula('"2" + "2"',resolver40),null);
const typed40=evaluateComponentRepresentation({enabled:true,sourcePath:"level",rules:[{condition:"{{level}} == 5",content:'Exibido: @label · bruto: {{label}} · soma: {{2 + 2 + 2}} · texto: {{"2" + "2" + "2"}} · {{image:@portrait}}'}]},resolver40);
assert.equal(typed40?.content,'Exibido: Nome exibido · bruto: NEXUS · soma: 6 · texto: 222 · {{image:systems/nexus/assets/portrait.webp}}');

const textSemantics40=evaluateComponentRepresentation({enabled:true,sourcePath:"level",rules:[{condition:"{{level}} == 5",content:'Literal: "1"+"1" · expressão textual: {{"1"+"1"}} · expressão numérica: {{1+1}} · literal repetido: "1"+"1"="1"+"1"'}]},resolver40);
assert.equal(textSemantics40?.content,'Literal: "1"+"1" · expressão textual: 11 · expressão numérica: 2 · literal repetido: "1"+"1"="1"+"1"',"Somente o conteúdo delimitado por chaves deve ser avaliado; texto fora delas permanece literal");
assert.equal(evaluateNexusExpression('{{"1"+"1"}}',resolver40),"11","Concatenação de strings entre chaves deve preservar o tipo textual");
assert.equal(evaluateNexusExpression('{{"texto"}}',resolver40),"texto","Expressões com literal textual entre chaves devem retornar a string sem aspas");
assert.equal(evaluateNexusExpression('"texto"',resolver40),"texto","Literais textuais entre aspas devem ser aceitos sem chaves");
assert.equal(evaluateNexusExpression("{{1+1}}",resolver40),2,"Soma de números entre chaves deve permanecer numérica");


const classList40=()=>{const set=new Set();return{add:(...v)=>v.forEach(x=>set.add(x)),remove:(...v)=>v.forEach(x=>set.delete(x)),contains:x=>set.has(x)};};
const surface40=(left,top,width,height)=>({hidden:false,classList:classList40(),getBoundingClientRect:()=>({left,top,right:left+width,bottom:top+height,width,height})});
const a40=surface40(0,0,100,100),b40=surface40(100,0,100,100),g40=surface40(200,0,100,100);
const canvas40={querySelectorAll(selector){if(selector===".nexus-component")return[a40,b40];if(selector===".nexus-component:not(.is-group-member)")return[a40,b40];if(selector===".nexus-group-surface")return[g40];return[];}};
const geometry40=updateCanvasConnectedCorners(canvas40);
assert.equal(geometry40.surfaces,3);
assert.equal(a40.classList.contains("nexus-component-touching-right"),true);
assert.equal(a40.classList.contains("nexus-component-corner-square-tr"),true,"Contato lateral completo deve achatar o canto superior direito que realmente toca a outra borda");
assert.equal(a40.classList.contains("nexus-component-corner-square-br"),true,"Contato lateral completo deve achatar o canto inferior direito que realmente toca a outra borda");
assert.equal(b40.classList.contains("nexus-component-touching-left"),true);
assert.equal(b40.classList.contains("nexus-component-corner-square-tl"),true);
assert.equal(b40.classList.contains("nexus-component-corner-square-bl"),true);
assert.equal(b40.classList.contains("nexus-component-touching-right"),true);
assert.equal(g40.classList.contains("nexus-group-touching-left"),true);

const partialA40=surface40(0,0,100,100),partialB40=surface40(100,50,100,100);
const partialCanvas40={querySelectorAll(selector){if(selector===".nexus-component"||selector===".nexus-component:not(.is-group-member)")return[partialA40,partialB40];if(selector===".nexus-group-surface")return[];return[];}};
updateCanvasConnectedCorners(partialCanvas40);
assert.equal(partialA40.classList.contains("nexus-component-corner-square-br"),true,"Em contato parcial, somente o canto inferior direito do primeiro card toca a borda vizinha");
assert.equal(partialA40.classList.contains("nexus-component-corner-square-tr"),false,"O canto superior direito não toca a borda vizinha e deve continuar arredondado");
assert.equal(partialB40.classList.contains("nexus-component-corner-square-tl"),true,"Em contato parcial, somente o canto superior esquerdo do segundo card toca a borda vizinha");
assert.equal(partialB40.classList.contains("nexus-component-corner-square-bl"),false,"O canto inferior esquerdo não toca a borda vizinha e deve continuar arredondado");

assert.match(canvasGroups,/updateCanvasConnectedCorners/);
assert.match(interactions,/Conteúdo exibido/);
assert.match(interactions,/barePath \? "@" \+ barePath/,"A abreviação @ deve preservar o prefixo para resolver o valor de exibição");
assert.match(interactions,/Condição/);

assert.match(css,/nexus-sheet:is\(\[data-mode="play"\],\[data-mode="config"\],\[data-mode="appearance"\]\)/,"Cantos devem ser recalculados em todos os modos");

assert.ok(!css.includes(".nexus-component.nexus-component-touching-right {") && !css.includes(".nexus-component.nexus-component-touching-left {"),"Contato em uma aresta não deve achatar automaticamente os dois cantos daquele lado");
assert.ok(!css.includes(".nexus-group-surface.nexus-group-touching-right {") && !css.includes(".nexus-group-surface.nexus-group-touching-left {"),"Superfícies de grupo também devem usar arredondamento individual por canto");
assert.ok(!sheetListeners.includes("persistInteractionEditor(control, null, { render: false, captureHistory: false })"),"Regras de apresentação não devem gravar a cada tecla e interromper a digitação");
assert.ok(!sheetListeners.includes("capturedInteractionInputHistory"),"O histórico de edição de regras não deve ser capturado a cada tecla");
assert.ok(sheet.includes("async _writeLayouts(layouts, active, { render = true } = {})"), "A supressão de renderização deve ser opcional para não afetar outros comandos");
assert.ok(sheetListeners.includes("await sheet._writeLayouts(layouts, active, { render: false })"), "Editar fluxos e condições deve salvar sem renderização integral da ficha");
assert.ok(sheet.includes("labelSuffix") && sheet.includes("NON_ROLL_PROPERTY_SUFFIXES.has(labelSuffix)"), "Rótulos genéricos também devem ser excluídos dos atalhos");

assert.ok(sheetListeners.includes("render: !isPresentationField"), "Alterações de condição e conteúdo não devem reconstruir o editor");
assert.doesNotMatch(sheetListeners, /pendingPropertyValueSaves/, "Valores de propriedades não devem ser salvos por debounce durante a digitação");
assert.doesNotMatch(sheetListeners, /baseModifierPath/, "O Inspector deve permitir valores manuais para MB como qualquer outra propriedade");
assert.doesNotMatch(sheet, /formulaEditable: true/, "O Core não deve marcar propriedades mecânicas com fórmulas predefinidas");
assert.match(sheetListeners, /previous formula remains intact/, "A fórmula anterior deve permanecer salva se a gravação do novo valor falhar");
assert.match(sheetListeners, /quotedValue = evaluateNexusExpression\(trimmedValue/, "Literais textuais entre aspas devem ser interpretados pelo motor seguro");
assert.match(sheet, /addPropertyFormulaDependencies\(component\.dataPath\)/, "Dependências de propriedades devem vir de fórmulas explicitamente configuradas");
assert.match(sheet, /scanExpressions\(component\)/, "Expressões dos cards devem registrar suas dependências atuais");
assert.doesNotMatch(sheet, /Perícias sem fórmula manual devem atualizar quando o MB mudar/, "O Core não deve impor dependências mecânicas a propriedades sem fórmula");
assert.doesNotMatch(sheet, /getNexusDefaultSkillFormula|getNexusDefaultPropertyFormula/, "A ficha não deve consultar fórmulas padrão globais");
assert.match(sheetListeners, /valueKind === "number"[\s\S]*String\(value\)\.trim\(\) === ""\) value = 0/, "Valores numéricos vazios devem ser aceitos como zero");
assert.match(sheetListeners, /valueKind === "string"/, "Expressões devem validar o resultado de acordo com o tipo textual");
assert.ok(template.includes('<span aria-hidden="true">|</span>'), "O vínculo deve apresentar nome e caminho na mesma linha");
assert.match(template, /data-property-value-label>Valor:/, "O campo editável deve usar o rótulo compacto Valor");
assert.match(css, /nexus-data-binding-inline/, "O vínculo deve usar o layout compacto de nome e caminho");
assert.match(sheetListeners, /String\(value\)\.trim\(\) === ""\) value = 0/, "Campos numéricos vazios devem ser persistidos como zero");
assert.ok(sheetListeners.includes("$(document).on(`input${inspectorNamespace}`, \"[data-property-value]\""), "O editor deve receber eventos depois de ser movido para a janela flutuante");
assert.ok(sheetListeners.includes("$(document).on(`change${inspectorNamespace}`, \"[data-property-value]\""), "O salvamento de propriedades deve ser delegado ao documento");
assert.ok(sheetListeners.includes("$(document).on(`change${inspectorNamespace}`, \"[data-config-current-value], [data-config-max-value]\""), "PV/PM/PE atuais e máximos devem salvar também na janela flutuante");
assert.ok(sheetListeners.includes("isSheetOwnedControl(input)"), "Eventos globais devem ser isolados à ficha e às suas janelas");
assert.ok(sheetListeners.includes("pendingResourceValueSaves"), "Valores de recursos devem atualizar sem Enter");
assert.ok(sheet.includes("RESERVED_ROLL_ALIAS_TOKENS") && sheet.includes("NON_ROLL_PROPERTY_SUFFIXES"), "Identificadores genéricos não devem virar atalhos de rolagem");
assert.ok(sheet.includes("byDisplay") && sheet.includes("targets.size === 1"), "Atalhos repetidos para o mesmo caminho não devem gerar ambiguidade falsa");
assert.ok(canvasCorners.includes("MutationObserver") && canvasCorners.includes('attributeFilter: ["style"]'), "Cantos devem ser recalculados também após alterações de posição");
assert.ok(canvasInteractions.includes("nexusGestureActive"), "A detecção geométrica deve ser adiada durante gestos e recalculada ao liberar o controle");
assert.match(css, /\.nexus-resize\.nw \{ left:-9px; top:-9px;/, "A alça noroeste não deve cobrir a borda superior esquerda do card");
assert.match(css, /\.nexus-sheet:is\(\[data-mode="play"\],\[data-mode="config"\],\[data-mode="appearance"\]\) \.nexus-component\.nexus-component-corner-square-tl/, "O seletor do canto superior esquerdo deve ter especificidade válida e sem repetição de ancestrais");


const cornerOnlyA=surface40(0,0,100,100),cornerOnlyB=surface40(100,100,100,100);
const compactOnly=surface40(500,500,90,120),compactHeightOnly=surface40(650,500,120,90);
const cornerOnlyCanvas={querySelectorAll(selector){if(selector===".nexus-component")return[cornerOnlyA,cornerOnlyB,compactOnly,compactHeightOnly];if(selector===".nexus-component:not(.is-group-member)")return[cornerOnlyA,cornerOnlyB,compactOnly,compactHeightOnly];if(selector===".nexus-group-surface")return[];return[];}};
updateCanvasConnectedCorners(cornerOnlyCanvas);
assert.equal(cornerOnlyA.classList.contains("nexus-component-corner-square-br"),true,"Contato canto a canto deve achatar somente o canto inferior direito do primeiro componente");
assert.equal(cornerOnlyB.classList.contains("nexus-component-corner-square-tl"),true,"Contato canto a canto deve achatar somente o canto superior esquerdo do segundo componente");
for(const corner of ["tl","tr","bl"]) assert.equal(cornerOnlyA.classList.contains("nexus-component-corner-square-"+corner),false,"Os demais cantos do primeiro componente devem permanecer arredondados");
for(const corner of ["tr","br","bl"]) assert.equal(cornerOnlyB.classList.contains("nexus-component-corner-square-"+corner),false,"Os demais cantos do segundo componente devem permanecer arredondados");

assert.ok(sheet.includes("new foundry.data.operators.ForcedDeletion()"),"A migração das perícias deve usar o operador de remoção do Foundry V14");
assert.ok(![".-=proficient",".-=proficiency",".-=opposed","skills.-="].some(token=>sheet.includes(token)),"A migração das perícias não deve usar mais a sintaxe legada -= do Foundry");
assert.ok(canvasInteractions.includes("await saveAfterGesture(touchedIds);sheet._refreshBoundComponents?.();"),"O fim do redimensionamento deve reavaliar as representações por regra");
assert.ok(canvasCorners.includes('node.classList.add("is-compact")'),"O cálculo geométrico deve classificar cards compactos, inclusive os agrupados");
assert.ok(css.includes(".nexus-component.is-compact .nexus-component-content {\n  padding: 2px !important;"),"Cards com menos de 100px em qualquer dimensão devem limitar o padding a 2px");
assert.equal(compactOnly.classList.contains("is-compact"),true,"Cards com largura inferior a 100px devem receber o modo compacto");
assert.equal(compactHeightOnly.classList.contains("is-compact"),true,"Cards com altura inferior a 100px devem receber o modo compacto");

const formulaSkillActor = { system: { identity: { level: 4 }, attributes: { for: 4 }, progression: { mb: { value: 2 } }, skills: { athletics: { proficientLevel: -1, formula: "{{força+(mb*proficiencia)}}", description: "Descrição personalizada de Atletismo." } } } };
const formulaAthletics = getNexusSkillRows(formulaSkillActor).find(skill => skill.key === "athletics");
assert.equal(formulaAthletics.value, 2);
assert.equal(formulaAthletics.description, "Descrição personalizada de Atletismo.");
assert.equal(evaluateNexusSkillFormula(formulaSkillActor, "athletics", "força + (mb * proficiencia)"), 2);
assert.equal(evaluateNexusSkillFormula(formulaSkillActor, "athletics", "força / 0"), null);
const fullPathSkillFormula = "{{attributes.for.value + (combat.mb * sign(skills.athletics.proficientLevel))}}";
assert.equal(evaluateNexusSkillFormula(formulaSkillActor, "athletics", fullPathSkillFormula), 2, "Fórmulas de perícia devem resolver caminhos completos e funções matemáticas");
formulaSkillActor.system.skills.athletics.formula = fullPathSkillFormula;
assert.equal(getNexusSkillRows(formulaSkillActor).find(skill => skill.key === "athletics").value, 2, "O valor exibido da perícia deve usar a fórmula validada no Inspector");
formulaSkillActor.system.skills.athletics.proficientLevel = 1;
assert.equal(evaluateNexusSkillFormula(formulaSkillActor, "athletics", fullPathSkillFormula), 6, "O sinal da proficiência deve alterar o bônus sem multiplicar sua magnitude");
assert.equal(evaluateNexusSkillFormula(formulaSkillActor, "athletics", "{{ceil(level / 2)}}"), 2, "Atalhos de nível devem funcionar em fórmulas de perícia");
const propertyPickerWithoutFormulaInternals = buildPropertyPickerCatalog();
assert.equal(propertyPickerWithoutFormulaInternals.entries.some(entry => entry.path === "skills.athletics.formula"), false, "A fórmula é configuração interna do Valor da perícia, não uma propriedade separada no seletor");
assert.equal(getNexusRulebookPropertyValue(formulaSkillActor, "skills.athletics.description").readOnly, false);
assert.equal(getNexusRulebookPropertyValue(formulaSkillActor, "skills.athletics.value").sourcePath, "skills.athletics.value");
assert.equal(getNexusRulebookPropertyValue(formulaSkillActor, "skills.athletics.formula").readOnly, false);
assert.equal(getNexusRulebookPropertyValue(formulaSkillActor, "skills.athletics.description").value, "Descrição personalizada de Atletismo.");
const modifierFlow = { interactions: [{ id: "modifier-flow", triggers: [{ event: "click", modifiers: ["ctrl", "shift"] }], actions: [{ type: "update", config: { path: "resources.pv.value", value: "1" } }] }] };
assert.equal(getTriggeredActions(modifierFlow, "click", { modifiers: ["shift", "ctrl"] }).length, 1);
assert.equal(getTriggeredActions(modifierFlow, "click", { modifiers: ["shift"] }).length, 0);
assert.equal(normalizeInteraction({ triggers: [{ event: "middleClick" }], actions: [] }).triggers[0].event, "middleClick");
assert.deepEqual(normalizeInteraction({ triggers: [{ event: "click", modifiers: ["alt", "shift", "invalid"] }], actions: [] }).triggers[0].modifiers, ["shift", "alt"]);
assert.match(interactions, /modifierOptions/);
assert.match(canvasPlayInteractions, /middleClick/);
assert.match(canvasPlayInteractions, /pointerDown/);
assert.match(canvasPlayInteractions, /focusin/);
assert.match(canvasPlayInteractions, /getTriggeredActions\(component,name,\{actor:sheet.actor,modifiers\}\)/);
assert.match(template, /<textarea rows="1" data-property-value/);
assert.match(sheetCode, /skillFormulaMode/);
assert.match(sheet, /valueLabel\.textContent = "Valor"/);
assert.doesNotMatch(sheet, /Fórmula da perícia|Fórmula da propriedade|Valor\/Conteúdo da propriedade/);
assert.doesNotMatch(propertyPickerView, /Valor atual:|nexus-property-option-value/);
assert.match(propertyPickerView, /canonicalQuery/);
assert.match(sheetListeners, /normalizeNexusPropertyPath\(String\(input\.value \?\? ""\)\)/);
assert.match(template, /Caminho da propriedade/);
assert.match(sheetListeners, /const skillFormulaMatch = path\.match/);
assert.match(sheetListeners, /evaluateNexusSkillFormula\(sheet\.actor, skillFormulaMatch\[1\], String\(value\)\)/);
assert.match(sheetListeners, /resolveNexusBinding\(sheet\.actor, resolveFormulaIdentifier\(identifier\), 1\)\.value/);
assert.match(sheetListeners, /\$\(document\)\.on\(`input\$\{inspectorNamespace\}`, "\[data-property-value\]"/);
assert.match(css, /max-height:\s*none !important/);
assert.match(css, /overflow-y:\s*hidden !important/);
assert.match(sheetListeners, /Math\.min\(input\.scrollHeight, maxHeight\)/);
assert.match(sheetListeners, /input\.scrollHeight > maxHeight \? "auto" : "hidden"/);
assert.match(css, /nexus-property-option-name[\s\S]*nexus-property-option-path/, "O seletor deve exibir somente nome e caminho");
assert.doesNotMatch(css, /1\.0\.0\.56 — layout isolado/, "O CSS antigo do buscador deve ser removido");

assert.match(sheet, /propertyExpressions/, "O resolvedor deve avaliar expressões persistidas por propriedade");
assert.ok(sheet.includes('flags.nexus.propertyExpressions'), "Expressões persistidas devem invalidar componentes dependentes");
assert.doesNotMatch(sheet, /dependencies\.add\("identity\.level"\)/, "O Core não deve impor atualização por nível a propriedades sem fórmula");
assert.match(sheet, /addExpression\(formula\)/, "Referências de fórmulas explícitas devem determinar as dependências dinâmicas");
assert.match(sheetListeners, /setFlag\("nexus", "propertyExpressions"/, "Expressões devem ser persistidas nas flags do ator");
assert.ok(sheetListeners.includes("evaluateNexusExpression(expression[1].trim()"), "O salvamento deve validar expressões antes de persistir");
assert.match(canvasInteractions, /preDeleteToken/, "A exclusão de tokens deve ser protegida enquanto os painéis estiverem abertos");
assert.match(canvasInteractions, /hasDirectlyActiveToken/, "Tokens controlados devem continuar podendo ser excluídos diretamente");
assert.match(canvasInteractions, /editorPanelsOpen/, "A proteção de teclado deve considerar todos os painéis abertos");
assert.match(canvasInteractions, /editorPanelsOpen && isTypingTarget/, "Delete/Backspace em campos de texto não deve alcançar atalhos do canvas da cena");

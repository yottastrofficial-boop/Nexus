/**
 * Universal Library Explorer view.
 *
 * This module owns only catalog presentation and selection. It does not know
 * about Actor sheets, Canvas components, or the persistence implementation.
 * The caller supplies the registry and user-preference callbacks.
 */
import { toggleLibraryCollectionResource } from "../core/library-preferences.js";
import { getLibraryDesignProfilePreviewModel } from "./theme-inspector.js";
import {
  createLibraryThemeSample,
  getLibraryMediaInsertionSource,
  getLibraryResourceBarCardPreviewModel,
  getLibraryResourcePreviewModel,
  getLibraryThemePreviewColors,
  getLibraryThemePreviewTokens,
  renderGenericLibraryPreview,
  renderLibraryFontPreview,
  renderLibraryResourcePreview
} from "./catalog-preview-renderers.js";
import { getLibraryResourceIcon, createLibraryGridCard, createLibraryFolderGridCard } from "./catalog-grid-renderer.js";
export {
  getLibraryMediaInsertionSource,
  getLibraryResourceBarCardPreviewModel,
  getLibraryResourceIcon,
  getLibraryResourcePreviewModel,
  getLibraryThemePreviewColors,
  getLibraryThemePreviewTokens
} from "./catalog-preview-renderers.js";
export { getLibraryResourceIcon as getLibraryCatalogResourceIcon } from "./catalog-grid-renderer.js";

const PAGE_SIZE = 30;
const LEGACY_COLLECTIONS = new Set(["components", "groups", "layouts", "templates", "assets", "media", "themes", "styles", "properties", "rules", "behaviors", "flows", "functions", "world-flows"]);

export const getLibraryCatalogResourceKey = resource => {
  const reference = resource?.reference ?? {};
  if (resource?.providerId === "nexus-library" && reference.collection && reference.id) {
    return `${reference.collection}:${reference.id}`;
  }
  return `${String(resource?.providerId ?? "")}:${String(resource?.id ?? "")}`;
};
const canAccessCompendium = pack => {
  if (!pack || pack.visible === false) return false;
  const user = globalThis.game?.user;
  if (user?.isGM === true) return true;
  const observerPermission = globalThis.CONST?.DOCUMENT_OWNERSHIP_LEVELS?.OBSERVER ?? 2;
  if (!user || typeof pack.testUserPermission !== "function") return false;
  try { return pack.testUserPermission(user, observerPermission) === true; }
  catch { return false; }
};

export function populateLibraryCompendiumSelect(select, selectedIds = []) {
  if (!select) return [];
  const packs = globalThis.game?.packs;
  const entries = Array.isArray(packs?.contents)
    ? packs.contents
    : typeof packs?.values === "function" ? [...packs.values()] : [];
  const supported = new Set(["Actor", "Item", "Scene", "JournalEntry", "Macro", "Playlist", "RollTable", "Cards"]);
  const selected = new Set(Array.isArray(selectedIds) ? selectedIds.map(String) : []);
  select.replaceChildren();
  const available = entries.filter(pack =>
    canAccessCompendium(pack) && supported.has(pack.documentName) && typeof pack.collection === "string"
  );
  for (const pack of available) {
    const option = document.createElement("option");
    option.value = pack.collection;
    option.textContent = String(pack.metadata?.label ?? pack.collection) + " · " + String(pack.documentName);
    option.selected = selected.has(pack.collection);
    select.append(option);
  }
  if (!available.length) {
    const option = document.createElement("option");
    option.disabled = true;
    option.textContent = "Nenhum compêndio disponível";
    select.append(option);
  }
  return available.map(pack => pack.collection);
}

const resourceKey = getLibraryCatalogResourceKey;
export const getLibraryCatalogPreferenceReference = key => {
  const value = String(key ?? "");
  const separator = value.indexOf(":");
  if (separator <= 0 || separator === value.length - 1) return null;
  const prefix = value.slice(0, separator);
  if (LEGACY_COLLECTIONS.has(prefix)) {
    return { providerId: "nexus-library", id: value };
  }
  return { providerId: prefix, id: value.slice(separator + 1) };
};
const text = (value, fallback = "") => String(value ?? fallback);

function makeElement(tag, className, content = "") {
  const element = document.createElement(tag);
  if (className) element.className = className;
  if (content !== "") element.textContent = content;
  return element;
}

function renderDesignProfilePreview(resource, resolved) {
  if (resource?.kind !== "theme" || resolved?.kind !== "design-profile" || !resolved.profile) return null;
  const model = getLibraryDesignProfilePreviewModel(resolved);
  if (!model) return null;
  const section = makeElement("section", "nexus-library-design-preview");
  section.append(makeElement("strong", "nexus-library-design-preview-heading", "Prévia do perfil"));
  if (!model.supported) {
    section.append(makeElement("p", "nexus-library-design-preview-warning", model.message));
    return section;
  }

  const palette = Object.fromEntries(model.palette.map(color => [color.key, color.value]));
  for (const [key, value] of Object.entries(palette)) section.style.setProperty("--nexus-inspector-" + key, value);
  section.dataset.radius = model.layout.radius;
  section.dataset.density = model.layout.density;
  section.style.setProperty("--nexus-inspector-radius", model.layout.radius === "sharp" ? "0px" : model.layout.radius === "soft" ? "5px" : "11px");
  section.style.setProperty("--nexus-inspector-font", model.typography.family);
  section.style.setProperty("--nexus-inspector-font-size", model.typography.baseSize + "px");
  section.style.setProperty("--nexus-inspector-line-height", String(model.typography.lineHeight));
  section.style.setProperty("--nexus-inspector-spacing", String(model.layout.spacing));
  section.style.setProperty("--nexus-inspector-control-height", model.layout.controlHeight + "px");

  const stage = makeElement("div", "nexus-library-design-preview-stage");
  stage.setAttribute("role", "img");
  stage.setAttribute("aria-label", "Exemplo de painel NEXUS com a paleta, tipografia e geometria deste perfil.");
  const mockWindow = makeElement("div", "nexus-library-design-preview-window");
  const header = makeElement("div", "nexus-library-design-preview-window-header");
  header.append(makeElement("span", "nexus-library-design-preview-window-dot"), makeElement("strong", "", model.name), makeElement("small", "", model.presetLabel));
  const body = makeElement("div", "nexus-library-design-preview-window-body");
  const nav = makeElement("div", "nexus-library-design-preview-nav");
  nav.append(makeElement("span", "is-active", "Ficha"), makeElement("span", "", "Inventário"), makeElement("span", "", "Efeitos"));
  const content = makeElement("div", "nexus-library-design-preview-content");
  content.append(makeElement("small", "", "PERSONAGEM · EXEMPLO"));
  content.append(makeElement("strong", "nexus-library-design-preview-value", "Título de exemplo"));
  content.append(makeElement("span", "nexus-library-design-preview-subtitle", "Subtítulo da interface"));
  const description = makeElement("p", "nexus-library-design-preview-copy", "Texto normal com ");
  description.append(makeElement("strong", "", "bold"), document.createTextNode(" e "), makeElement("em", "", "italic"), document.createTextNode(" para demonstrar a hierarquia tipográfica."));
  content.append(description);
  const highlight = makeElement("span", "nexus-library-design-preview-highlight", "Destaque ativo");
  content.append(highlight);
  const progress = makeElement("div", "nexus-library-design-preview-progress");
  const progressFill = makeElement("span", "");
  progressFill.style.width = "68%";
  progress.append(progressFill);
  const secondaryProgress = makeElement("div", "nexus-library-design-preview-progress is-secondary");
  const secondaryFill = makeElement("span", "");
  secondaryFill.style.width = "42%";
  secondaryProgress.append(secondaryFill);
  content.append(progress, secondaryProgress);
  const sampleCard = makeElement("div", "nexus-library-design-preview-card");
  sampleCard.append(makeElement("small", "", "ATRIBUTO"), makeElement("strong", "", "FOR 16"));
  content.append(sampleCard);
  const controls = makeElement("div", "nexus-library-design-preview-controls");
  controls.append(makeElement("span", "", "Campo de exemplo"), makeElement("button", "", "Ação"), makeElement("button", "is-secondary", "Secundário"));
  content.append(controls);
  const scroll = makeElement("span", "nexus-library-design-preview-scroll");
  body.append(nav, content, scroll);
  mockWindow.append(header, body);
  stage.append(mockWindow);
  section.append(stage);

  const swatches = makeElement("div", "nexus-library-design-preview-palette");
  for (const color of model.palette) {
    const item = makeElement("div", "nexus-library-design-preview-color");
    const sample = makeElement("span", "");
    sample.style.backgroundColor = color.value;
    sample.setAttribute("aria-label", color.label + ": " + color.value);
    sample.title = color.label + " · " + color.value;
    item.append(sample, makeElement("small", "", color.label));
    swatches.append(item);
  }
  section.append(makeElement("strong", "nexus-library-design-preview-subheading", "Paleta semântica"), swatches);

  const settings = makeElement("dl", "nexus-library-design-preview-settings");
  const facts = [
    ["Preset", model.presetLabel], ["Tipografia", model.typography.family],
    ["Tamanho base", model.typography.baseSize + " px"], ["Densidade", model.layout.densityLabel],
    ["Cantos", model.layout.radiusLabel], ["Espaçamento", model.layout.spacing + "×"],
    ["Altura dos controles", model.layout.controlHeight + " px"],
    ["Contraste", model.accessibility.contrast === "high" ? "Alto" : "Padrão"],
    ["Movimento reduzido", model.accessibility.reducedMotion ? "Ativado" : "Desativado"]
  ];
  for (const [label, value] of facts) settings.append(makeElement("dt", "", label), makeElement("dd", "", value));
  section.append(makeElement("strong", "nexus-library-design-preview-subheading", "Configuração visual"), settings);

  const diagnostics = makeElement("div", "nexus-library-design-preview-diagnostics");
  diagnostics.append(makeElement("strong", "nexus-library-design-preview-subheading", "Contraste"));
  for (const check of model.diagnostics.checks) {
    const row = makeElement("p", check.passes ? "is-passing" : "is-warning");
    row.append(makeElement("span", "", check.label), makeElement("strong", "", check.ratio + ":1"));
    diagnostics.append(row);
  }
  diagnostics.append(makeElement("p",
    model.diagnostics.warnings.length ? "nexus-library-design-preview-warning" : "nexus-library-design-preview-success",
    model.diagnostics.warnings.length
      ? "Há combinações que não atingem o contraste recomendado."
      : "Todos os pares avaliados atingem o limite selecionado."
  ));
  section.append(diagnostics);
  return section;
}

export function createLibraryCatalogExplorer({
  registry,
  container,
  detail,
  getPreferences,
  savePreferences,
  canApplyResource = () => false,
  onApplyResource = null,
  applyLabel = "Aplicar ao contexto",
  getUpdateInfo = null,
  onUpdateInstances = null,
  canUpdateDefinition = () => false,
  onUpdateDefinition = null,
  renderSpecializedEditor = null,
  onOpenFolder = null,
} = {}) {
  if (!registry || typeof registry.list !== "function" || typeof registry.resolve !== "function") {
    throw new TypeError("O Explorer precisa de um registro válido da Biblioteca.");
  }
  if (!container || !detail || typeof getPreferences !== "function" || typeof savePreferences !== "function") {
    throw new TypeError("O Explorer precisa dos elementos e callbacks de preferências.");
  }

  let cursor = {};
  let hasMore = false;
  let renderRequestVersion = 0;
  let detailRequestVersion = 0;
  let currentResources = [];
  const selectedResourceKeys = new Set();
  let lastSelectedResourceKey = "";
  let currentQuery = "";
  let currentSmartView = "all";
  let currentFolder = "";
  let selectedFolderId = "";
  let currentCollectionId = "";
  let currentTag = "all";
  let currentOrigin = "all";
  let currentKind = "all";
  let currentType = "all";
  let currentCompendiumIds = [];
  let currentViewMode = "grid";
  let currentCardSize = "medium";
  let currentSortMode = "name-asc";
  let smartOffset = 0;

  const renderEmpty = message => {
    container.replaceChildren(makeElement("p", "nexus-library-empty", message));
  };

  const renderFolderCard = (folder, preferences) => createLibraryFolderGridCard({
    folder,
    childCount: preferences.folders.filter(item => item.parentId === folder.id).length,
    viewMode: currentViewMode
  });

  const renderResourceCard = resource => createLibraryGridCard({
    resource,
    selected: selectedResourceKeys.has(resourceKey(resource)),
    viewMode: currentViewMode,
    cardSize: currentCardSize
  });

  let currentInspectorTab = "preview";
  const renderInspectorTabs = (previewContent, detailsContent) => {
    const root = makeElement("div", "nexus-library-inspector-content");
    const tabs = makeElement("div", "nexus-library-inspector-tabs");
    tabs.setAttribute("role", "tablist");
    tabs.setAttribute("aria-label", "Visualização do recurso");

    const previewTab = makeElement("button", "nexus-library-inspector-tab-button", "Padrão");
    previewTab.type = "button";
    previewTab.dataset.libraryInspectorTab = "preview";
    previewTab.id = "nexus-library-inspector-tab-preview";
    previewTab.setAttribute("role", "tab");
    previewTab.setAttribute("aria-controls", "nexus-library-inspector-panel-preview");
    previewTab.title = "Visualização principal do recurso";
    const detailsTab = makeElement("button", "nexus-library-inspector-tab-button", "Detalhes");
    detailsTab.type = "button";
    detailsTab.dataset.libraryInspectorTab = "details";
    detailsTab.id = "nexus-library-inspector-tab-details";
    detailsTab.setAttribute("role", "tab");
    detailsTab.setAttribute("aria-controls", "nexus-library-inspector-panel-details");
    detailsTab.title = "Etiquetas, metadados e informações técnicas";
    tabs.append(previewTab, detailsTab);

    // Identity and metadata belong to the default tab, not a persistent header.
    // This keeps the Details tab focused on tags, summaries and less-visual data.
    const contentNodes = previewContent.filter(Boolean);
    const heading = contentNodes[0]?.classList?.contains("nexus-library-detail-heading")
      ? contentNodes.shift()
      : null;

    const previewPanel = makeElement("section", "nexus-library-inspector-panel");
    previewPanel.dataset.libraryInspectorPanel = "preview";
    previewPanel.id = "nexus-library-inspector-panel-preview";
    previewPanel.setAttribute("role", "tabpanel");
    previewPanel.setAttribute("aria-labelledby", previewTab.id);
    if (heading) previewPanel.append(heading);
    for (const node of contentNodes) previewPanel.append(node);

    const detailsPanel = makeElement("section", "nexus-library-inspector-panel");
    detailsPanel.dataset.libraryInspectorPanel = "details";
    detailsPanel.id = "nexus-library-inspector-panel-details";
    detailsPanel.setAttribute("role", "tabpanel");
    detailsPanel.setAttribute("aria-labelledby", detailsTab.id);
    for (const node of detailsContent.filter(Boolean)) detailsPanel.append(node);

    const activate = selected => {
      currentInspectorTab = selected === "details" ? "details" : "preview";
      for (const tab of [previewTab, detailsTab]) {
        const active = tab.dataset.libraryInspectorTab === currentInspectorTab;
        tab.classList.toggle("is-active", active);
        tab.setAttribute("aria-selected", String(active));
        tab.tabIndex = active ? 0 : -1;
      }
      previewPanel.hidden = currentInspectorTab !== "preview";
      detailsPanel.hidden = currentInspectorTab !== "details";
    };
    activate(currentInspectorTab);
    root.append(tabs, previewPanel, detailsPanel);
    return { root, detailsPanel };
  };

  detail.addEventListener("click", event => {
    const target = event.target instanceof Element ? event.target : event.target?.parentElement;
    const tab = target?.closest("[data-library-inspector-tab]");
    if (!tab || !detail.contains(tab)) return;
    const root = tab.closest(".nexus-library-inspector-content");
    if (!root) return;
    event.preventDefault();
    const selected = tab.dataset.libraryInspectorTab === "details" ? "details" : "preview";
    currentInspectorTab = selected;
    root.querySelectorAll("[data-library-inspector-tab]").forEach(item => {
      const active = item.dataset.libraryInspectorTab === selected;
      item.classList.toggle("is-active", active);
      item.setAttribute("aria-selected", String(active));
      item.tabIndex = active ? 0 : -1;
    });
    root.querySelectorAll("[data-library-inspector-panel]").forEach(panel => {
      panel.hidden = panel.dataset.libraryInspectorPanel !== selected;
    });
  });

  const renderDetails = async resource => {
    const version = ++detailRequestVersion;
    currentInspectorTab = "preview";
    const key = resourceKey(resource);
    detail.dataset.selectedProvider = resource.providerId;
    detail.dataset.selectedResource = resource.id;
    detail.replaceChildren(makeElement("p", "nexus-library-detail-placeholder", "Carregando detalhes…"));

    const preferences = getPreferences();
    await savePreferences({
      ...preferences,
      recent: [key, ...preferences.recent.filter(item => item !== key)].slice(0, 30)
    });
    let resolved;
    try {
      resolved = await registry.resolve(resource.reference, resource);
    } catch (error) {
      if (version !== detailRequestVersion) return;
      detail.replaceChildren(makeElement("p", "nexus-library-empty", "Não foi possível abrir este recurso: " + error.message));
      return;
    }
    if (version !== detailRequestVersion) return;
    let updateInfo = null;
    if (typeof getUpdateInfo === "function") {
      try { updateInfo = await getUpdateInfo(resource, resolved); }
      catch (error) { updateInfo = { error: error.message }; }
    }
    if (version !== detailRequestVersion) return;

    const heading = makeElement("div", "nexus-library-detail-heading");
    heading.append(makeElement("strong", "nexus-library-detail-title", resource.name));
    const detailFavorite = makeElement("button", "nexus-library-detail-favorite");
    detailFavorite.type = "button";
    detailFavorite.setAttribute("data-library-resource-favorite", resource.id);
    detailFavorite.setAttribute("data-library-provider", resource.providerId);
    const favoriteKey = key;
    const favoriteIsActive = getPreferences().favorites.includes(favoriteKey);
    detailFavorite.classList.toggle("is-favorite", favoriteIsActive);
    detailFavorite.setAttribute("aria-pressed", String(favoriteIsActive));
    detailFavorite.setAttribute("aria-label", favoriteIsActive ? "Remover dos favoritos" : "Adicionar aos favoritos");
    detailFavorite.title = detailFavorite.getAttribute("aria-label");
    detailFavorite.append(makeElement("i", favoriteIsActive ? "fa-solid fa-star" : "fa-regular fa-star"));
    detailFavorite.addEventListener("click", async () => {
      const current = getPreferences();
      const active = current.favorites.includes(favoriteKey);
      const favorites = active
        ? current.favorites.filter(item => item !== favoriteKey)
        : [favoriteKey, ...current.favorites].slice(0, 500);
      await savePreferences({ ...current, favorites });
      if (active && currentSmartView === "favorites") {
        selectedResourceKeys.delete(favoriteKey);
        await render();
        return;
      }
      detailFavorite.classList.toggle("is-favorite", !active);
      detailFavorite.setAttribute("aria-pressed", String(!active));
      detailFavorite.setAttribute("aria-label", active ? "Adicionar aos favoritos" : "Remover dos favoritos");
      detailFavorite.title = detailFavorite.getAttribute("aria-label");
      detailFavorite.replaceChildren(makeElement("i", active ? "fa-regular fa-star" : "fa-solid fa-star"));
    });
    heading.append(detailFavorite);
    const meta = makeElement("p", "nexus-library-summary-meta",
      [resource.kind, resource.type, resource.origin, resource.isCompendium ? "Compêndio" : ""].filter(Boolean).join(" · "));
    const description = makeElement("p", "nexus-library-resource-description", resource.description || "Sem descrição.");
    const themeModel = resource.kind === "theme" ? getLibraryDesignProfilePreviewModel(resolved) : null;
    const themeColors = resource.kind === "theme"
      ? (themeModel?.palette?.map(color => ({ label: color.label, value: color.value })) ?? getLibraryThemePreviewColors(resolved))
      : [];
    const previewModel = getLibraryResourcePreviewModel(resource, resolved);
    const fontPreview = renderLibraryFontPreview(resource, resolved);
    const resourcePreview = renderLibraryResourcePreview(resource, resolved);
    const genericPreview = !fontPreview && !resourcePreview && resource.kind !== "theme"
      ? renderGenericLibraryPreview(resource)
      : null;
    const resourceSummary = makeElement("p", "nexus-library-resource-preview-summary", previewModel?.summary ?? "");
    resourceSummary.hidden = !previewModel?.summary;
    const themePreview = makeElement("section", "nexus-library-theme-preview");
    themePreview.hidden = resource.kind !== "theme";
    if (resource.kind === "theme") {
      const palette = themeModel?.palette ?? themeColors;
      const sample = createLibraryThemeSample({
        name: resource.name,
        palette,
        typography: themeModel?.typography ?? {},
        layout: { ...(themeModel?.layout ?? {}), preset: themeModel?.preset },
        components: themeModel?.components ?? {},
        compact: false
      });
      sample.dataset.previewShape = "square";
      themePreview.append(sample);

      const swatches = makeElement("div", "nexus-library-theme-swatches");
      for (const color of themeColors) {
        const swatch = makeElement("div", "nexus-library-theme-swatch");
        const sampleColor = makeElement("span", "");
        sampleColor.style.backgroundColor = color.value;
        sampleColor.setAttribute("aria-label", color.label + ": " + color.value);
        sampleColor.title = color.label + " · " + color.value;
        swatch.append(sampleColor, makeElement("small", "", color.label));
        swatches.append(swatch);
      }
      const paletteDetails = makeElement("details", "nexus-library-theme-palette-details");
      paletteDetails.append(makeElement("summary", "", "Paleta de cores"), swatches);
      themePreview.append(paletteDetails);
    }
    const facts = makeElement("dl", "nexus-library-resource-facts");
    const resourceFacts = [
      ["Provedor", resource.providerId],
      ["Tipo", resource.type],
      ["Origem", resource.origin],
      ["Pasta", resource.folder],
      ["Etiquetas", resource.tags.join(", ") || "—"],
      ["Estilo", resource.style ?? resource.reference?.style ?? ""],
      ["Versão", "v" + String(resource.version ?? 1)],
      ["Capacidades", resource.capabilities?.length ? resource.capabilities.join(", ") : "—"],
      ...(previewModel?.details ?? [])
    ];
    if (resource.providerId === "nexus-library" && resource.reference?.collection === "components") {
      resourceFacts.push(["Versão", "v" + String(resource.version ?? resolved?.version ?? 1)]);
      resourceFacts.push(["Versões anteriores", String(resolved?.history?.length ?? 0)]);
    }
    for (const [label, value] of resourceFacts) {
      if (!value) continue;
      facts.append(makeElement("dt", "", label), makeElement("dd", "", value));
    }

    const folderLabel = makeElement("label", "nexus-library-folder-assignment", "Pasta pessoal");
    const folderSelect = makeElement("select");
    const noFolder = makeElement("option", "", "Sem pasta");
    noFolder.value = "";
    folderSelect.append(noFolder);
    for (const folder of preferences.folders.filter(item =>
      !item.collection || item.collection === resource.providerId || item.collection === resource.reference?.collection
    )) {
      const option = makeElement("option", "", folder.name);
      option.value = folder.id;
      folderSelect.append(option);
    }
    folderSelect.value = preferences.assignments[key] ?? "";
    folderSelect.addEventListener("change", async () => {
      const current = getPreferences();
      const assignments = { ...current.assignments };
      if (folderSelect.value) assignments[key] = folderSelect.value;
      else delete assignments[key];
      try { await savePreferences({ ...current, assignments }); }
      catch (error) { detail.append(makeElement("p", "nexus-library-empty", "Não foi possível salvar a pasta: " + error.message)); }
    });
    folderLabel.append(folderSelect);

    const collectionSection = makeElement("div", "nexus-library-resource-collections");
    collectionSection.append(makeElement("strong", "", "Coleções"));
    if (!preferences.collections.length) {
      collectionSection.append(makeElement("p", "", "Nenhuma coleção criada."));
    } else {
      for (const collection of preferences.collections) {
        const label = makeElement("label", "nexus-library-collection-membership");
        const checkbox = document.createElement("input");
        checkbox.type = "checkbox";
        checkbox.checked = collection.resources.includes(key);
        checkbox.addEventListener("change", async () => {
          try {
            const updated = toggleLibraryCollectionResource(getPreferences(), collection.id, key);
            await savePreferences(updated);
            if (currentCollectionId === collection.id && !checkbox.checked) await render();
          } catch (error) {
            detail.append(makeElement("p", "nexus-library-empty", "Não foi possível atualizar a coleção: " + error.message));
          }
        });
        label.append(checkbox, makeElement("span", "", collection.name));
        collectionSection.append(label);
      }
    }

    const updateSection = makeElement("div", "nexus-library-definition-update");
    if (updateInfo?.available?.length) {
      updateSection.append(makeElement("p", "", updateInfo.available.length + " instância(s) podem receber uma atualização da definição."));
      if (updateInfo.requiresReview?.length) {
        updateSection.append(makeElement("p", "", updateInfo.requiresReview.length + " instância(s) antigas precisam de revisão manual."));
      }
      if (typeof onUpdateInstances === "function") {
        const updateButton = makeElement("button", "", "Revisar e atualizar instâncias");
        updateButton.type = "button";
        updateButton.addEventListener("click", async () => {
          try {
            const result = await onUpdateInstances(resource, resolved, updateInfo);
            if (result !== false) await renderDetails(resource);
          } catch (error) {
            detail.append(makeElement("p", "nexus-library-empty", "Não foi possível atualizar as instâncias: " + error.message));
          }
        });
        updateSection.append(updateButton);
      }
    } else if (updateInfo?.requiresReview?.length) {
      updateSection.append(makeElement("p", "", updateInfo.requiresReview.length + " instância(s) antigas precisam de revisão manual antes de receber uma atualização."));
    }
    if (updateInfo?.error) updateSection.append(makeElement("p", "nexus-library-empty", "Não foi possível verificar atualizações: " + updateInfo.error));
    if (typeof onUpdateDefinition === "function" && canUpdateDefinition(resource, resolved)) {
      const updateDefinitionButton = makeElement("button", "", "Atualizar definição a partir da seleção");
      updateDefinitionButton.type = "button";
      updateDefinitionButton.addEventListener("click", async () => {
        try {
          const result = await onUpdateDefinition(resource, resolved);
          if (result !== false) await renderDetails(resource);
        } catch (error) {
          detail.append(makeElement("p", "nexus-library-empty", "Não foi possível atualizar a definição: " + error.message));
        }
      });
      updateSection.append(updateDefinitionButton);
    }

    const actions = makeElement("div", "nexus-library-item-actions");
    const availableActions = typeof registry.getActions === "function"
      ? registry.getActions(resource.reference, resource)
      : [];
    for (const action of availableActions) {
      const button = makeElement("button", "", action.label);
      button.type = "button";
      button.dataset.libraryAction = action.id;
      button.addEventListener("click", async () => {
        if (action.id === "edit-metadata") {
          const editor = makeElement("div", "nexus-library-metadata-editor");
          const nameLabel = makeElement("label", "", "Nome");
          const nameInput = makeElement("input");
          nameInput.type = "text";
          nameInput.maxLength = 120;
          nameInput.value = resource.name;
          nameLabel.append(nameInput);
          const descriptionLabel = makeElement("label", "", "Descrição");
          const descriptionInput = makeElement("textarea");
          descriptionInput.rows = 3;
          descriptionInput.maxLength = 1000;
          descriptionInput.value = resource.description;
          descriptionLabel.append(descriptionInput);
          const tagsLabel = makeElement("label", "", "Etiquetas (separadas por vírgula)");
          const tagsInput = makeElement("input");
          tagsInput.type = "text";
          tagsInput.maxLength = 240;
          tagsInput.value = resource.tags.join(", ");
          tagsLabel.append(tagsInput);
          const thumbnailLabel = makeElement("label", "", "Miniatura (URL ou caminho seguro)");
          const thumbnailInput = makeElement("input");
          thumbnailInput.type = "text";
          thumbnailInput.maxLength = 2048;
          thumbnailInput.value = resource.thumbnail ?? "";
          thumbnailInput.placeholder = "icons/meu-asset.webp ou https://…";
          thumbnailLabel.append(thumbnailInput);
          const save = makeElement("button", "", "Salvar metadados");
          save.type = "button";
          save.addEventListener("click", async () => {
            try {
              await registry.executeAction(action.id, resource.reference, resource, {
                name: nameInput.value,
                description: descriptionInput.value,
                tags: tagsInput.value.split(",").map(tag => tag.trim()).filter(Boolean),
                thumbnail: thumbnailInput.value
              });
              await render();
            } catch (error) {
              editor.append(makeElement("p", "nexus-library-empty", "Não foi possível salvar: " + error.message));
            }
          });
          editor.append(nameLabel, descriptionLabel, tagsLabel, thumbnailLabel, save);
          const inspector = renderInspectorTabs(
            [heading, meta, ...(fontPreview ? [fontPreview] : []), themePreview, ...(resourcePreview ? [resourcePreview] : []), ...(genericPreview ? [genericPreview] : [])],
            [description, resourceSummary, facts, folderLabel, collectionSection, updateSection, editor, actions]
          );
          detail.replaceChildren(inspector.root);
          return;
        }

        if (action.requiresConfirmation) {
          const DialogV2 = globalThis.foundry?.applications?.api?.DialogV2;
          if (typeof DialogV2?.confirm !== "function") return;
          const accepted = await DialogV2.confirm({
            window: { title: action.label },
            content: "<p>Deseja realmente executar esta operação?</p>",
            rejectClose: false
          });
          if (!accepted) return;
        }

        try {
          await registry.executeAction(action.id, resource.reference, resource);
          if (action.id === "delete") {
            const current = getPreferences();
            const assignments = { ...current.assignments };
            delete assignments[key];
            await savePreferences({
              ...current,
              assignments,
              favorites: current.favorites.filter(item => item !== key),
              recent: current.recent.filter(item => item !== key),
              collections: current.collections.map(collection => ({ ...collection, resources: collection.resources.filter(item => item !== key) }))
            });
          }
          await render();
        } catch (error) {
          detail.append(makeElement("p", "nexus-library-empty", "Não foi possível executar a operação: " + error.message));
        }
      });
      actions.append(button);
    }

    if (typeof onApplyResource === "function" && canApplyResource(resource, resolved)) {
      const apply = makeElement("button", "nexus-library-apply-context", applyLabel);
      apply.type = "button";
      apply.addEventListener("click", async () => {
        try {
          const result = await onApplyResource(resource, resolved);
          if (result === false) return;
          globalThis.ui?.notifications?.info?.("Recurso aplicado ao contexto atual.");
        } catch (error) {
          detail.append(makeElement("p", "nexus-library-empty", "Não foi possível aplicar o recurso: " + error.message));
        }
      });
      actions.append(apply);
    }

    const advanced = makeElement("details", "nexus-library-resource-raw");
    advanced.append(makeElement("summary", "", "Dados técnicos"));
    const raw = makeElement("pre");
    raw.textContent = "Abra para carregar os dados técnicos deste recurso.";
    advanced.addEventListener("toggle", () => {
      if (!advanced.open || raw.dataset.loaded === "true") return;
      const safeResolved = resolved && typeof resolved.toObject === "function"
        ? resolved.toObject()
        : resolved;
      try {
        raw.textContent = JSON.stringify(safeResolved, (property, value) => {
          if (["parent", "apps", "sheet", "collection", "pack", "folder"].includes(property)) return undefined;
          if (typeof value === "function") return undefined;
          return value;
        }, 2).slice(0, 10000);
      } catch {
        raw.textContent = "Não foi possível gerar uma prévia dos dados deste recurso.";
      }
      raw.dataset.loaded = "true";
    });
    advanced.append(raw);
    const designProfilePreview = renderDesignProfilePreview(resource, resolved);
    const inspector = renderInspectorTabs(
      [heading, meta, ...(fontPreview ? [fontPreview] : []), themePreview, ...(resourcePreview ? [resourcePreview] : []), ...(genericPreview ? [genericPreview] : [])],
      [description, resourceSummary, facts, ...(designProfilePreview ? [designProfilePreview] : []), folderLabel, collectionSection, updateSection, actions, advanced]
    );
    detail.replaceChildren(inspector.root);
    if (typeof renderSpecializedEditor === "function") {
      try {
        const specializedEditor = renderSpecializedEditor(resource, resolved);
        if (specializedEditor && typeof specializedEditor.nodeType === "number") inspector.detailsPanel.append(specializedEditor);
      } catch (error) {
        inspector.detailsPanel.append(makeElement("p", "nexus-library-empty", "Editor especializado indisponível: " + String(error?.message ?? error)));
      }
    }
  };

  const render = async ({ query = currentQuery, smartView = currentSmartView, folder = currentFolder, collectionId = currentCollectionId, tag = currentTag, origin = currentOrigin, kind = currentKind, type = currentType, compendiumIds = currentCompendiumIds, viewMode = currentViewMode, cardSize = currentCardSize, sortMode = currentSortMode, folderFilter = null, append = false } = {}) => {
    currentQuery = text(query).trim();
    currentSmartView = smartView;
    currentFolder = folder;
    currentCollectionId = collectionId;
    currentTag = tag;
    currentOrigin = origin;
    currentKind = kind || "all";
    currentType = type || "all";
    currentCompendiumIds = Array.isArray(compendiumIds) ? [...new Set(compendiumIds.map(String).filter(Boolean))].slice(0, 32) : [];
    currentViewMode = viewMode === "list" ? "list" : "grid";
    currentCardSize = ["small", "medium", "large"].includes(cardSize) ? cardSize : "medium";
    currentSortMode = ["name-asc", "name-desc", "type-asc", "type-desc", "source-asc", "source-desc", "size-desc", "size-asc", "modified-desc", "modified-asc", "tag-asc", "tag-desc"].includes(sortMode) ? sortMode : "name-asc";
    const version = ++renderRequestVersion;
    if (!append) {
      detailRequestVersion++;
      cursor = {};
      smartOffset = 0;
      currentResources = [];
      container.replaceChildren();
    }
    container.dataset.viewMode = currentViewMode;
    container.dataset.cardSize = currentCardSize;
    const preferences = getPreferences();
    const smartKeys = currentSmartView === "favorites"
      ? preferences.favorites
      : currentSmartView === "recent"
        ? preferences.recent
        : currentSmartView === "collection"
          ? preferences.collections.find(collection => collection.id === currentCollectionId)?.resources ?? []
          : currentSmartView === "shortcut"
            ? [preferences.shortcuts.find(shortcut => shortcut.id === currentCollectionId)?.resourceKey].filter(Boolean)
            : currentFolder
              ? folderFilter ? null : (() => {
                const folderIds = new Set([currentFolder]);
                let changed = true;
                while (changed) {
                  changed = false;
                  for (const item of preferences.folders) {
                    if (item.parentId && folderIds.has(item.parentId) && !folderIds.has(item.id)) {
                      folderIds.add(item.id);
                      changed = true;
                    }
                  }
                }
                return Object.entries(preferences.assignments).filter(([, folderId]) => folderIds.has(folderId)).map(([key]) => key);
              })()
              : null;
    let page;
    if (smartKeys) {
      const keyPage = smartKeys.slice(smartOffset, smartOffset + PAGE_SIZE);
      const references = keyPage.map(getLibraryCatalogPreferenceReference).filter(Boolean);
      if (references.length) {
        page = await registry.list({
          query: currentQuery,
          kind: currentKind,
          type: currentType,
          limit: PAGE_SIZE,
          references,
          compendiumIds: currentCompendiumIds,
          tags: currentTag === "all" ? [] : [currentTag],
          origin: currentOrigin
        });
        if (version !== renderRequestVersion) return;
      } else {
        page = { items: [], total: 0, hasMore: false, cursor: {}, errors: [] };
      }
      const byKey = new Map(page.items.map(resource => [resourceKey(resource), resource]));
      page = {
        ...page,
        items: keyPage.map(key => byKey.get(key)).filter(Boolean),
        total: smartKeys.length,
        hasMore: smartOffset + keyPage.length < smartKeys.length,
        cursor: { smartOffset: smartOffset + keyPage.length }
      };
      smartOffset += keyPage.length;
    } else {
      page = await registry.list({
        query: currentQuery,
        kind: currentKind,
        type: currentType,
        limit: PAGE_SIZE,
        cursor,
        compendiumIds: currentCompendiumIds,
        tags: currentTag === "all" ? [] : [currentTag],
        origin: currentOrigin
      });
    }
    if (version !== renderRequestVersion) return;

    cursor = page.cursor ?? {};
    hasMore = Boolean(page.hasMore);
    currentResources = append ? [...currentResources, ...page.items] : [...page.items];
    const tagOptions = container.closest(".nexus-library-panel")?.querySelector("#nexus-library-tag-options");
    if (tagOptions) {
      const tags = [...new Set(currentResources.flatMap(resource => Array.isArray(resource.tags) ? resource.tags : []))]
        .sort((left, right) => String(left).localeCompare(String(right), "pt-BR", { sensitivity: "base" }));
      tagOptions.replaceChildren(...tags.map(tag => {
        const option = document.createElement("option");
        option.value = tag;
        return option;
      }));
    }
    const tagSelect = container.closest(".nexus-library-panel")?.querySelector("[data-library-tag]");
    if (tagSelect) {
      const knownTags = new Set([...tagSelect.options].map(option => option.value));
      const availableTags = [...new Set(currentResources.flatMap(resource => Array.isArray(resource.tags) ? resource.tags : []))]
        .sort((left, right) => String(left).localeCompare(String(right), "pt-BR", { sensitivity: "base" }));
      for (const tag of availableTags) {
        if (knownTags.has(tag)) continue;
        const option = document.createElement("option");
        option.value = tag;
        option.textContent = tag;
        tagSelect.append(option);
        knownTags.add(tag);
      }
      if (tagSelect.value !== currentTag && [...tagSelect.options].some(option => option.value === currentTag)) tagSelect.value = currentTag;
    }
    const categoryOptions = container.closest(".nexus-library-panel")?.querySelector("#nexus-library-category-options");
    const typeOptions = container.closest(".nexus-library-panel")?.querySelector("#nexus-library-type-options");
    const categoryLabels = {
      component: "Componente", composition: "Composição", layout: "Layout", template: "Modelo",
      asset: "Asset", media: "Mídia", theme: "Coleção visual", style: "Estilo", logic: "Lógica", document: "Documento"
    };
    const optionList = (records, keyOf, labelOf, allLabel, defaults = []) => {
      const values = new Map([["all", allLabel], ...defaults]);
      for (const resource of records) {
        if (resource.kind === "folder" || resource.type === "folder") continue;
        const key = String(keyOf(resource) ?? "").trim();
        if (key && !values.has(key)) values.set(key, String(labelOf(resource) ?? key));
      }
      return [...values].map(([value, label]) => {
        const option = document.createElement("option");
        option.value = value;
        option.label = label;
        return option;
      });
    };
    const categoryDefaults = [
      ["component", "Componente"], ["composition", "Composição"], ["layout", "Layout"],
      ["template", "Modelo"], ["asset", "Asset"], ["media", "Mídia"], ["theme", "Coleção visual"],
      ["style", "Estilo"], ["logic", "Lógica"], ["document", "Documento"]
    ];
    const typeDefaults = [
      ["font", "Fonte"], ["theme", "Tema"], ["component", "Componente"], ["asset", "Asset"],
      ["media", "Mídia"], ["property", "Propriedade"], ["rule", "Regra"], ["behavior", "Comportamento"],
      ["flow", "Fluxo"], ["function", "Função"], ["actors", "Atores"], ["items", "Itens"],
      ["scenes", "Cenas"], ["journals", "Documentos"], ["macros", "Macros"], ["playlists", "Playlists"],
      ["tables", "Tabelas"], ["cards", "Baralhos"]
    ];
    categoryOptions?.replaceChildren(...optionList(currentResources, item => item.kind,
      item => categoryLabels[item.kind] || item.kind, "Todas", categoryDefaults));
    typeOptions?.replaceChildren(...optionList(currentResources, item => item.type,
      item => item.documentType || item.type, "Todos", typeDefaults));
    const visible = currentResources.filter(resource => {
      const key = resourceKey(resource);
      if (currentSmartView === "favorites" && !preferences.favorites.includes(key)) return false;
      if (currentSmartView === "recent" && !preferences.recent.includes(key)) return false;
      if (smartKeys && !smartKeys.includes(key)) return false;
      return true;
    });
    const compareText = (left, right) => String(left ?? "").localeCompare(String(right ?? ""), "pt-BR", { sensitivity: "base", numeric: true });
    visible.sort((left, right) => {
      if (currentSortMode === "name-desc") return compareText(right.name ?? right.title ?? right.label, left.name ?? left.title ?? left.label);
      if (currentSortMode === "type-asc" || currentSortMode === "type-desc") {
        const categoryLabel = resource => resource.kind === "theme" ? "Coleção visual"
          : resource.reference?.builtin === "font" ? "Fonte"
            : resource.documentType ?? resource.kind ?? resource.type;
        const order = compareText(categoryLabel(left), categoryLabel(right));
        return (currentSortMode === "type-desc" ? -order : order) || compareText(left.name ?? left.title, right.name ?? right.title);
      }
      if (currentSortMode === "source-asc" || currentSortMode === "source-desc") {
        const order = compareText(left.origin ?? left.source ?? left.providerId, right.origin ?? right.source ?? right.providerId);
        return (currentSortMode === "source-desc" ? -order : order) || compareText(left.name ?? left.title, right.name ?? right.title);
      }
      if (currentSortMode === "size-desc" || currentSortMode === "size-asc") {
        const order = (Number(left.sizeBytes) || 0) - (Number(right.sizeBytes) || 0);
        return (currentSortMode === "size-desc" ? -order : order) || compareText(left.name, right.name);
      }
      if (currentSortMode === "modified-desc" || currentSortMode === "modified-asc") {
        const order = (Date.parse(left.modifiedAt ?? "") || 0) - (Date.parse(right.modifiedAt ?? "") || 0);
        return (currentSortMode === "modified-desc" ? -order : order) || compareText(left.name, right.name);
      }
      if (currentSortMode === "tag-asc" || currentSortMode === "tag-desc") {
        const order = compareText((left.tags ?? []).join(", "), (right.tags ?? []).join(", "));
        return (currentSortMode === "tag-desc" ? -order : order) || compareText(left.name, right.name);
      }
      return compareText(left.name ?? left.title ?? left.label, right.name ?? right.title ?? right.label);
    });

    const folderEntries = currentSmartView === "all" &&
      (Boolean(currentFolder) || (currentKind === "all" && currentType === "all"))
      ? preferences.folders
        .filter(folder => (folder.parentId || "") === currentFolder)
        .filter(folder => !currentQuery || folder.name.toLocaleLowerCase("pt-BR").includes(currentQuery.toLocaleLowerCase("pt-BR")))
        .sort((left, right) => currentSortMode === "name-desc"
          ? compareText(right.name, left.name)
          : compareText(left.name, right.name))
      : [];

    container.replaceChildren();
    for (const folder of folderEntries) container.append(renderFolderCard(folder, preferences));
    for (const resource of visible) container.append(renderResourceCard(resource));
    if (!visible.length && !folderEntries.length) {
      const message = page.errors?.length
        ? "Algumas fontes da Biblioteca não puderam ser consultadas."
        : currentSmartView === "favorites" ? "Nenhum favorito nesta página do catálogo."
          : currentSmartView === "recent" ? "Nenhum item recente nesta página do catálogo."
            : "Nenhum recurso corresponde à pesquisa.";
      renderEmpty(message);
    }
    if (hasMore) {
      const loadMore = makeElement("button", "nexus-library-load-more", "Carregar mais");
      loadMore.type = "button";
      loadMore.dataset.libraryLoadMore = "";
      container.append(loadMore);
    }
    const heading = container.closest("[data-library-section-panel]")?.querySelector("[data-library-collection-heading]");
    const count = container.closest("[data-library-section-panel]")?.querySelector("[data-library-collection-count]");
    if (heading) heading.textContent = "Biblioteca";
    if (count) count.textContent = `${currentResources.length} exibidos · ${page.total} encontrados`;
    if (!append) {
      detail.dataset.selectedProvider = "";
      detail.dataset.selectedResource = "";
      detail.replaceChildren(makeElement("div", "nexus-library-detail-placeholder", "Selecione um recurso para consultar seus detalhes."));
    }
  };

  container.addEventListener("click", async event => {
    const target = event.target instanceof Element ? event.target : event.target?.parentElement;
    const folderSelection = target?.closest("[data-library-folder-select]");
    if (folderSelection && container.contains(folderSelection)) {
      event.preventDefault();
      event.stopPropagation();
      selectedFolderId = folderSelection.dataset.libraryFolderSelect;
      detail.dataset.selectedProvider = "";
      detail.dataset.selectedResource = "";
      container.querySelectorAll("[data-library-folder-select]").forEach(item => {
        const active = item.dataset.libraryFolderSelect === selectedFolderId;
        item.classList.toggle("is-selected", active);
        item.setAttribute("aria-pressed", String(active));
      });
      const preferences = getPreferences();
      const folder = preferences.folders.find(item => item.id === selectedFolderId);
      const childCount = preferences.folders.filter(item => item.parentId === selectedFolderId).length;
      const panel = makeElement("div", "nexus-library-folder-selection-details");
      panel.append(
        makeElement("strong", "", folder?.name ?? "Pasta"),
        makeElement("p", "", `${childCount} subpasta(s)`),
        makeElement("p", "", "Clique duas vezes para abrir esta pasta.")
      );
      detail.replaceChildren(panel);
      return;
    }
    const loadMore = target?.closest("[data-library-load-more]");
    if (loadMore && container.contains(loadMore)) {
      loadMore.remove();
      await render({ append: true });
      return;
    }
    const selected = target?.closest("[data-library-resource]");
    if (selected && container.contains(selected)) {
      event.preventDefault(); event.stopPropagation();
      const card = selected.closest("[data-library-resource-key]");
      const key = card?.dataset.libraryResourceKey;
      const resource = currentResources.find(item => item.providerId === selected.dataset.libraryProvider && item.id === selected.dataset.libraryResource);
      if (!resource || !key) return;
      const multi = event.ctrlKey || event.metaKey;
      if (event.shiftKey && lastSelectedResourceKey) {
        const buttons = [...container.querySelectorAll("[data-library-resource]")];
        const startIndex = buttons.findIndex(item => item.closest("[data-library-resource-key]")?.dataset.libraryResourceKey === lastSelectedResourceKey);
        const endIndex = buttons.indexOf(selected);
        if (startIndex >= 0 && endIndex >= 0) {
          selectedResourceKeys.clear();
          buttons.slice(Math.min(startIndex, endIndex), Math.max(startIndex, endIndex) + 1).forEach(item => {
            const itemKey = item.closest("[data-library-resource-key]")?.dataset.libraryResourceKey;
            if (itemKey) selectedResourceKeys.add(itemKey);
          });
        }
      } else if (multi) {
        if (selectedResourceKeys.has(key)) selectedResourceKeys.delete(key); else selectedResourceKeys.add(key);
      } else { selectedResourceKeys.clear(); selectedResourceKeys.add(key); }
      lastSelectedResourceKey = key;
      container.querySelectorAll("[data-library-resource]").forEach(item => {
        const itemKey = item.closest("[data-library-resource-key]")?.dataset.libraryResourceKey;
        const active = Boolean(itemKey && selectedResourceKeys.has(itemKey));
        item.classList.toggle("is-selected", active); item.setAttribute("aria-pressed", String(active));
      });
      if (multi || event.shiftKey) {
        detail.dataset.selectedProvider = ""; detail.dataset.selectedResource = "";
        detail.replaceChildren(makeElement("p", "nexus-library-detail-placeholder", `${selectedResourceKeys.size} selecionado(s). Clique com o botão direito para criar uma coleção.`));
      } else await renderDetails(resource);
    }
  });

  container.addEventListener("dblclick", async event => {
    const target = event.target instanceof Element ? event.target : event.target?.parentElement;
    const folder = target?.closest("[data-library-open-folder]");
    if (!folder || !container.contains(folder)) return;
    event.preventDefault();
    event.stopPropagation();
    if (typeof onOpenFolder === "function") await onOpenFolder(folder.dataset.libraryOpenFolder);
  });

  container.addEventListener("keydown", async event => {
    if (event.key !== "Enter") return;
    const target = event.target instanceof Element ? event.target : event.target?.parentElement;
    const folder = target?.closest("[data-library-open-folder]");
    if (!folder || !container.contains(folder)) return;
    event.preventDefault();
    event.stopPropagation();
    if (typeof onOpenFolder === "function") await onOpenFolder(folder.dataset.libraryOpenFolder);
  });

  container.addEventListener("contextmenu", event => {
    const target = event.target instanceof Element ? event.target : event.target?.parentElement;
    const card = target?.closest("[data-library-resource-key]");
    if (!card || !container.contains(card)) return;
    const key = card.dataset.libraryResourceKey;
    if (!selectedResourceKeys.has(key)) {
      selectedResourceKeys.clear(); selectedResourceKeys.add(key); lastSelectedResourceKey = key;
      container.querySelectorAll("[data-library-resource]").forEach(item => {
        const itemKey = item.closest("[data-library-resource-key]")?.dataset.libraryResourceKey;
        const active = Boolean(itemKey && selectedResourceKeys.has(itemKey));
        item.classList.toggle("is-selected", active); item.setAttribute("aria-pressed", String(active));
      });
    }
    if (selectedResourceKeys.size > 1) {
      event.preventDefault();
      container.dispatchEvent(new CustomEvent("nexus-library-multi-selection-context", { bubbles: true, detail: { event, keys: [...selectedResourceKeys] } }));
    }
  });
  return Object.freeze({
    render,
    getState: () => Object.freeze({ cursor, hasMore, count: currentResources.length })
  });
}

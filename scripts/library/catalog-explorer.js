/**
 * Universal Library Explorer view.
 *
 * This module owns only catalog presentation and selection. It does not know
 * about Actor sheets, Canvas components, or the persistence implementation.
 * The caller supplies the registry and user-preference callbacks.
 */
import { toggleLibraryCollectionResource } from "../core/library-preferences.js";

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

const LIBRARY_RESOURCE_ICONS = Object.freeze({
  component: "fa-solid fa-puzzle-piece",
  composition: "fa-solid fa-layer-group",
  layout: "fa-solid fa-table-columns",
  template: "fa-solid fa-file-lines",
  asset: "fa-solid fa-cube",
  media: "fa-solid fa-photo-film",
  theme: "fa-solid fa-palette",
  style: "fa-solid fa-swatchbook",
  logic: "fa-solid fa-diagram-project",
  document: "fa-solid fa-file",
  property: "fa-solid fa-list-check",
  rule: "fa-solid fa-scale-balanced",
  behavior: "fa-solid fa-bolt",
  flow: "fa-solid fa-diagram-project",
  function: "fa-solid fa-code"
});

const DOCUMENT_RESOURCE_ICONS = Object.freeze({
  actor: "fa-solid fa-user",
  item: "fa-solid fa-box",
  scene: "fa-solid fa-map",
  journalentry: "fa-solid fa-book-open",
  macro: "fa-solid fa-code",
  playlist: "fa-solid fa-music",
  rolltable: "fa-solid fa-dice",
  cards: "fa-solid fa-clone"
});

export function getLibraryResourceIcon(resource = {}) {
  const type = String(resource.type ?? "").toLocaleLowerCase().replace(/[\s_-]/g, "");
  if (resource.kind === "logic") return LIBRARY_RESOURCE_ICONS[type] ?? LIBRARY_RESOURCE_ICONS.logic;
  if (resource.kind === "document") return DOCUMENT_RESOURCE_ICONS[type] ?? LIBRARY_RESOURCE_ICONS.document;
  return LIBRARY_RESOURCE_ICONS[resource.kind] ?? LIBRARY_RESOURCE_ICONS.asset;
}

const THEME_PREVIEW_FIELDS = Object.freeze([
  ["Canvas", "canvasColor"],
  ["Cartão", "cardColor"],
  ["Destaque", "highlightColor"],
  ["Acento", "accentColor"],
  ["Botão", "buttonColor"],
  ["Cabeçalho", "windowHeaderColor"],
  ["Conteúdo", "windowContentColor"],
  ["Menu", "menuColor"],
  ["Rolagem", "scrollColor"]
]);

export function getLibraryThemePreviewColors(resolved) {
  const palette = resolved?.palette;
  if (!palette || typeof palette !== "object" || Array.isArray(palette)) return [];
  return THEME_PREVIEW_FIELDS.flatMap(([label, key]) => {
    const value = String(palette[key] ?? "").trim();
    return /^#(?:[0-9a-f]{3}|[0-9a-f]{6})$/i.test(value) ? [{ label, value }] : [];
  });
}

function makeElement(tag, className, content = "") {
  const element = document.createElement(tag);
  if (className) element.className = className;
  if (content !== "") element.textContent = content;
  return element;
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
  let currentQuery = "";
  let currentSmartView = "all";
  let currentFolder = "";
  let currentCollectionId = "";
  let currentTag = "all";
  let currentOrigin = "all";
  let currentKind = "all";
  let currentType = "all";
  let currentCompendiumIds = [];
  let currentViewMode = "grid";
  let currentCardSize = "medium";
  let smartOffset = 0;

  const renderEmpty = message => {
    container.replaceChildren(makeElement("p", "nexus-library-empty", message));
  };

  const renderResourceCard = (resource, preferences) => {
    const key = resourceKey(resource);
    const card = makeElement("article", "nexus-library-generic-card");
    const select = makeElement("button", "nexus-library-generic-item");
    select.type = "button";
    select.dataset.libraryResource = resource.id;
    select.dataset.libraryProvider = resource.providerId;
    select.setAttribute("aria-label", `${resource.name}, ${resource.type}`);

    const preview = makeElement("span", "nexus-library-generic-preview");
    const thumbnail = text(resource.thumbnail).trim();
    if (thumbnail && /^(https?:\/\/|\/|(?:\.\.?\/)?[a-z0-9_.-]+(?:\/[a-z0-9_.-]+)*)/i.test(thumbnail)) {
      const image = document.createElement("img");
      image.src = thumbnail;
      image.alt = "";
      image.loading = "lazy";
      image.decoding = "async";
      preview.append(image);
    } else {
      const icon = makeElement("i", getLibraryResourceIcon(resource));
      icon.setAttribute("aria-hidden", "true");
      preview.append(icon);
    }

    const title = makeElement("strong", "", resource.name);
    const meta = makeElement("small", "", `${resource.type} · ${resource.origin}`);
    select.append(preview, title, meta);

    const favorite = makeElement("button", "nexus-library-favorite", preferences.favorites.includes(key) ? "★" : "☆");
    favorite.type = "button";
    favorite.dataset.libraryResourceFavorite = resource.id;
    favorite.dataset.libraryProvider = resource.providerId;
    favorite.setAttribute("aria-pressed", String(preferences.favorites.includes(key)));
    favorite.setAttribute("aria-label", preferences.favorites.includes(key) ? "Remover dos favoritos" : "Adicionar aos favoritos");
    card.append(select, favorite);
    return card;
  };

  const renderDetails = async resource => {
    const version = ++detailRequestVersion;
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
    const meta = makeElement("p", "nexus-library-summary-meta",
      [resource.kind, resource.type, resource.origin, resource.isCompendium ? "Compêndio" : ""].filter(Boolean).join(" · "));
    const description = makeElement("p", "nexus-library-resource-description", resource.description || "Sem descrição.");
    const themeColors = resource.kind === "theme" ? getLibraryThemePreviewColors(resolved) : [];
    const themePreview = makeElement("section", "nexus-library-theme-preview");
    if (themeColors.length) {
      themePreview.append(makeElement("strong", "", "Prévia da paleta"));
      const swatches = makeElement("div", "nexus-library-theme-swatches");
      for (const color of themeColors) {
        const swatch = makeElement("div", "nexus-library-theme-swatch");
        const sample = makeElement("span", "");
        sample.style.backgroundColor = color.value;
        sample.setAttribute("aria-label", color.label + ": " + color.value);
        sample.title = color.label + " · " + color.value;
        swatch.append(sample, makeElement("small", "", color.label));
        swatches.append(swatch);
      }
      themePreview.append(swatches);
    }
    const facts = makeElement("dl", "nexus-library-resource-facts");
    const resourceFacts = [
      ["Provedor", resource.providerId],
      ["Tipo", resource.type],
      ["Origem", resource.origin],
      ["Pasta", resource.folder],
      ["Etiquetas", resource.tags.join(", ") || "—"],
      ["Versão", "v" + String(resource.version ?? 1)],
      ["Capacidades", resource.capabilities?.length ? resource.capabilities.join(", ") : "—"]
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
          const save = makeElement("button", "", "Salvar metadados");
          save.type = "button";
          save.addEventListener("click", async () => {
            try {
              await registry.executeAction(action.id, resource.reference, resource, {
                name: nameInput.value,
                description: descriptionInput.value,
                tags: tagsInput.value.split(",").map(tag => tag.trim()).filter(Boolean)
              });
              await render();
            } catch (error) {
              editor.append(makeElement("p", "nexus-library-empty", "Não foi possível salvar: " + error.message));
            }
          });
          editor.append(nameLabel, descriptionLabel, tagsLabel, save);
          detail.replaceChildren(heading, meta, description, themePreview, facts, folderLabel, collectionSection, updateSection, editor, actions);
          return;
        }

        if (action.requiresConfirmation) {
          const confirm = globalThis.foundry?.applications?.api?.DialogV2?.confirm;
          if (typeof confirm !== "function") return;
          const accepted = await confirm({
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
    detail.replaceChildren(heading, meta, description, themePreview, facts, folderLabel, collectionSection, updateSection, actions, advanced);
    if (typeof renderSpecializedEditor === "function") {
      try {
        const specializedEditor = renderSpecializedEditor(resource, resolved);
        if (specializedEditor && typeof specializedEditor.nodeType === "number") detail.append(specializedEditor);
      } catch (error) {
        detail.append(makeElement("p", "nexus-library-empty", "Editor especializado indisponível: " + String(error?.message ?? error)));
      }
    }
  };

  const render = async ({ query = currentQuery, smartView = currentSmartView, folder = currentFolder, collectionId = currentCollectionId, tag = currentTag, origin = currentOrigin, kind = currentKind, type = currentType, compendiumIds = currentCompendiumIds, viewMode = currentViewMode, cardSize = currentCardSize, append = false } = {}) => {
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
          : currentFolder
            ? Object.entries(preferences.assignments).filter(([, folderId]) => folderId === currentFolder).map(([key]) => key)
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
    const visible = currentResources.filter(resource => {
      const key = resourceKey(resource);
      if (currentSmartView === "favorites" && !preferences.favorites.includes(key)) return false;
      if (currentSmartView === "recent" && !preferences.recent.includes(key)) return false;
      if (smartKeys && !smartKeys.includes(key)) return false;
      return true;
    });

    container.replaceChildren();
    for (const resource of visible) container.append(renderResourceCard(resource, preferences));
    if (!visible.length) {
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
    if (heading) heading.textContent = "Todos os recursos";
    if (count) count.textContent = `${currentResources.length} exibidos · ${page.total} encontrados`;
    if (!append) {
      detail.dataset.selectedProvider = "";
      detail.dataset.selectedResource = "";
      detail.replaceChildren(makeElement("div", "nexus-library-detail-placeholder", "Selecione um recurso para consultar seus detalhes."));
    }
  };

  container.addEventListener("click", async event => {
    const target = event.target instanceof Element ? event.target : event.target?.parentElement;
    const loadMore = target?.closest("[data-library-load-more]");
    if (loadMore && container.contains(loadMore)) {
      loadMore.remove();
      await render({ append: true });
      return;
    }
    const favorite = target?.closest("[data-library-resource-favorite]");
    if (favorite && container.contains(favorite)) {
      event.preventDefault();
      event.stopPropagation();
      const preferences = getPreferences();
      const resource = currentResources.find(item =>
        item.providerId === favorite.dataset.libraryProvider && item.id === favorite.dataset.libraryResourceFavorite
      );
      if (!resource) return;
      const key = resourceKey(resource);
      const favorites = preferences.favorites.includes(key)
        ? preferences.favorites.filter(item => item !== key)
        : [key, ...preferences.favorites].slice(0, 500);
      await savePreferences({ ...preferences, favorites });
      await render();
      return;
    }
    const selected = target?.closest("[data-library-resource]");
    if (selected && container.contains(selected)) {
      event.preventDefault();
      event.stopPropagation();
      const resource = currentResources.find(item =>
        item.providerId === selected.dataset.libraryProvider && item.id === selected.dataset.libraryResource
      );
      if (resource) {
        container.querySelectorAll("[data-library-resource]").forEach(item =>
          item.classList.toggle("is-selected", item === selected)
        );
        await renderDetails(resource);
      }
    }
  });

  return Object.freeze({
    render,
    getState: () => Object.freeze({ cursor, hasMore, count: currentResources.length })
  });
}

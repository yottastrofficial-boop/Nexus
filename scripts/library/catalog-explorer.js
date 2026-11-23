/**
 * Universal Library Explorer view.
 *
 * This module owns only catalog presentation and selection. It does not know
 * about Actor sheets, Canvas components, or the persistence implementation.
 * The caller supplies the registry and user-preference callbacks.
 */
const PAGE_SIZE = 30;
const LEGACY_COLLECTIONS = new Set(["components", "groups", "layouts", "templates", "assets", "media", "themes", "styles", "properties", "rules", "behaviors", "flows", "functions", "world-flows"]);

export const getLibraryCatalogResourceKey = resource => {
  const reference = resource?.reference ?? {};
  if (resource?.providerId === "nexus-library" && reference.collection && reference.id) {
    return `${reference.collection}:${reference.id}`;
  }
  return `${String(resource?.providerId ?? "")}:${String(resource?.id ?? "")}`;
};
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

export function createLibraryCatalogExplorer({
  registry,
  container,
  detail,
  getPreferences,
  savePreferences
} = {}) {
  if (!registry || typeof registry.list !== "function" || typeof registry.resolve !== "function") {
    throw new TypeError("O Explorer precisa de um registro válido da Biblioteca.");
  }
  if (!container || !detail || typeof getPreferences !== "function" || typeof savePreferences !== "function") {
    throw new TypeError("O Explorer precisa dos elementos e callbacks de preferências.");
  }

  let cursor = {};
  let hasMore = false;
  let requestVersion = 0;
  let currentResources = [];
  let currentQuery = "";
  let currentSmartView = "all";
  let currentFolder = "";
  let currentCollectionId = "";
  let currentTag = "all";
  let currentOrigin = "all";
  let currentKind = "all";
  let currentType = "all";
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
      const icon = makeElement("i", "fa-solid fa-cube");
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
    const version = ++requestVersion;
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
      if (version !== requestVersion) return;
      detail.replaceChildren(makeElement("p", "nexus-library-empty", "Não foi possível abrir este recurso: " + error.message));
      return;
    }
    if (version !== requestVersion) return;

    const heading = makeElement("div", "nexus-library-detail-heading");
    heading.append(makeElement("strong", "nexus-library-detail-title", resource.name));
    const meta = makeElement("p", "nexus-library-summary-meta",
      [resource.kind, resource.type, resource.origin, resource.isCompendium ? "Compêndio" : ""].filter(Boolean).join(" · "));
    const description = makeElement("p", "nexus-library-resource-description", resource.description || "Sem descrição.");
    const facts = makeElement("dl", "nexus-library-resource-facts");
    for (const [label, value] of [
      ["Provedor", resource.providerId],
      ["Tipo", resource.type],
      ["Origem", resource.origin],
      ["Pasta de origem", resource.folder],
      ["Etiquetas", resource.tags.join(", ") || "—"]
    ]) {
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
          detail.replaceChildren(heading, meta, description, facts, folderLabel, editor, actions);
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
              recent: current.recent.filter(item => item !== key)
            });
          }
          await render();
        } catch (error) {
          detail.append(makeElement("p", "nexus-library-empty", "Não foi possível executar a operação: " + error.message));
        }
      });
      actions.append(button);
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
    detail.replaceChildren(heading, meta, description, facts, folderLabel, actions, advanced);
  };

  const render = async ({ query = currentQuery, smartView = currentSmartView, folder = currentFolder, collectionId = currentCollectionId, tag = currentTag, origin = currentOrigin, kind = currentKind, type = currentType, viewMode = currentViewMode, cardSize = currentCardSize, append = false } = {}) => {
    currentQuery = text(query).trim();
    currentSmartView = smartView;
    currentFolder = folder;
    currentCollectionId = collectionId;
    currentTag = tag;
    currentOrigin = origin;
    currentKind = kind || "all";
    currentType = type || "all";
    currentViewMode = viewMode === "list" ? "list" : "grid";
    currentCardSize = ["small", "medium", "large"].includes(cardSize) ? cardSize : "medium";
    const version = ++requestVersion;
    if (!append) {
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
        : currentCollectionId
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
          tags: currentTag === "all" ? [] : [currentTag],
          origin: currentOrigin
        });
        if (version !== requestVersion) return;
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
        tags: currentTag === "all" ? [] : [currentTag],
        origin: currentOrigin
      });
    }
    if (version !== requestVersion) return;

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

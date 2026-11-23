/**
 * Universal Library Explorer view.
 *
 * This module owns only catalog presentation and selection. It does not know
 * about Actor sheets, Canvas components, or the persistence implementation.
 * The caller supplies the registry and user-preference callbacks.
 */
const PAGE_SIZE = 30;

const resourceKey = resource => `${resource.providerId}:${resource.id}`;
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
    if (resource.thumbnail) {
      const image = document.createElement("img");
      image.src = resource.thumbnail;
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
    detail.dataset.selectedProvider = resource.providerId;
    detail.dataset.selectedResource = resource.id;
    detail.replaceChildren(makeElement("p", "nexus-library-detail-placeholder", "Carregando detalhes…"));

    const preferences = getPreferences();
    await savePreferences({
      ...preferences,
      recent: [resourceKey(resource), ...preferences.recent.filter(key => key !== resourceKey(resource))].slice(0, 30)
    });
    let resolved;
    try {
      resolved = await registry.resolve(resource.reference, resource);
    } catch (error) {
      if (version !== requestVersion) return;
      detail.replaceChildren(makeElement("p", "nexus-library-empty", `Não foi possível abrir este recurso: ${error.message}`));
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
      ["Pasta", resource.folder],
      ["Etiquetas", resource.tags.join(", ") || "—"]
    ]) {
      if (!value) continue;
      facts.append(makeElement("dt", "", label), makeElement("dd", "", value));
    }

    const actions = makeElement("div", "nexus-library-item-actions");
    if (resource.kind === "document" && resolved?.sheet?.render) {
      const open = makeElement("button", "", "Abrir documento");
      open.type = "button";
      open.addEventListener("click", () => resolved.sheet.render(true));
      actions.append(open);
    }

    const advanced = makeElement("details", "nexus-library-resource-raw");
    advanced.append(makeElement("summary", "", "Dados técnicos"));
    const raw = makeElement("pre");
    const safeResolved = resolved && typeof resolved.toObject === "function"
      ? resolved.toObject()
      : resolved;
    try {
      raw.textContent = JSON.stringify(safeResolved, (key, value) => {
        if (["parent", "apps", "sheet", "collection", "pack", "folder"].includes(key)) return undefined;
        if (typeof value === "function") return undefined;
        return value;
      }, 2).slice(0, 10000);
    } catch {
      raw.textContent = "Não foi possível gerar uma prévia dos dados deste recurso.";
    }
    advanced.append(raw);
    detail.replaceChildren(heading, meta, description, facts, actions, advanced);
  };

  const render = async ({ query = currentQuery, smartView = currentSmartView, folder = currentFolder, append = false } = {}) => {
    currentQuery = text(query).trim();
    currentSmartView = smartView;
    currentFolder = folder;
    const version = ++requestVersion;
    if (!append) {
      cursor = {};
      currentResources = [];
      container.replaceChildren();
    }
    container.dataset.viewMode = "grid";
    container.dataset.cardSize = "medium";
    const page = await registry.list({
      query: currentQuery,
      kind: "all",
      type: "all",
      limit: PAGE_SIZE,
      cursor
    });
    if (version !== requestVersion) return;

    cursor = page.cursor ?? {};
    hasMore = Boolean(page.hasMore);
    currentResources = append ? [...currentResources, ...page.items] : [...page.items];
    const preferences = getPreferences();
    const visible = currentResources.filter(resource => {
      const key = resourceKey(resource);
      if (currentSmartView === "favorites" && !preferences.favorites.includes(key)) return false;
      if (currentSmartView === "recent" && !preferences.recent.includes(key)) return false;
      if (currentFolder && preferences.assignments[key] !== currentFolder) return false;
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
    if (count) count.textContent = `${visible.length} exibidos · ${page.total} encontrados`;
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
      const key = `${favorite.dataset.libraryProvider}:${favorite.dataset.libraryResourceFavorite}`;
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

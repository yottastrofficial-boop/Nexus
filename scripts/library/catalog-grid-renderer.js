/**
 * NEXUS Library — grid card renderer.
 *
 * Cards are deliberately presentation-only: no persistence, favorites, or
 * provider calls live here. The grid exposes selection and drag contracts only.
 */
import { getLibraryDesignProfilePreviewModel } from "./theme-inspector.js";
import {
  createLibraryThemeSample,
  getLibraryResourceBarCardPreviewModel,
  getLibraryResourcePreviewModel,
  safeFontFamily,
  safeMediaSource
} from "./catalog-preview-renderers.js";

const makeElement = (tag, className = "", content = "") => {
  const element = document.createElement(tag);
  if (className) element.className = className;
  if (content !== "") element.textContent = String(content);
  return element;
};

const RESOURCE_ICONS = Object.freeze({
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

const DOCUMENT_ICONS = Object.freeze({
  actors: "fa-solid fa-user",
  items: "fa-solid fa-box",
  scenes: "fa-solid fa-map",
  journals: "fa-solid fa-book-open",
  macros: "fa-solid fa-code",
  playlists: "fa-solid fa-music",
  tables: "fa-solid fa-dice",
  cards: "fa-solid fa-clone"
});

const CATEGORY_LABELS = Object.freeze({
  component: "Componente", composition: "Composição", layout: "Layout",
  template: "Modelo", asset: "Asset", media: "Mídia",
  theme: "Coleção visual", style: "Estilo", logic: "Lógica", document: "Documento"
});

const TYPE_LABELS = Object.freeze({
  font: "Fonte", theme: "Tema", component: "Componente", asset: "Asset", media: "Mídia",
  actors: "Atores", items: "Itens", scenes: "Cenas", journals: "Documentos",
  macros: "Macros", playlists: "Playlists", tables: "Tabelas", cards: "Baralhos",
  property: "Propriedade", rule: "Regra", behavior: "Comportamento",
  flow: "Fluxo", function: "Função"
});

export function getLibraryResourceIcon(resource = {}) {
  const type = String(resource.type ?? "").toLocaleLowerCase().replace(/[\\s_-]/g, "");
  if (resource.kind === "logic") return RESOURCE_ICONS[type] ?? RESOURCE_ICONS.logic;
  if (resource.kind === "document") return DOCUMENT_ICONS[type] ?? RESOURCE_ICONS.document;
  return RESOURCE_ICONS[resource.kind] ?? RESOURCE_ICONS.asset;
}

export function getLibraryResourceCategoryLabel(resource = {}) {
  if (resource.kind === "theme") return "Coleção visual";
  if (resource.reference?.builtin === "font") return "Fonte";
  return CATEGORY_LABELS[resource.kind] ?? resource.kind ?? "Recurso";
}

export function getLibraryResourceTypeLabel(resource = {}) {
  return resource.documentType || TYPE_LABELS[resource.type] || resource.type || "—";
}

function createIconPreview(resource) {
  const icon = makeElement("i", getLibraryResourceIcon(resource));
  icon.setAttribute("aria-hidden", "true");
  return icon;
}

function createFontPreview(resource, size) {
  const preview = makeElement("div", "nexus-catalog-preview nexus-catalog-preview--font");
  preview.dataset.previewKind = "font";
  const family = safeFontFamily(resource.fontFamily) || "system-ui, sans-serif";
  preview.style.setProperty("--nexus-catalog-font-family", family);
  const glyph = makeElement("strong", "nexus-catalog-font-glyph", "Aa");
  glyph.setAttribute("aria-hidden", "true");
  preview.append(glyph);
  if (size !== "small") {
    preview.append(makeElement("span", "nexus-catalog-font-sample", "Ag · 123"));
  }
  return preview;
}

function createThemePreview(resource, size) {
  const model = getLibraryDesignProfilePreviewModel(resource);
  const preview = makeElement("div", "nexus-catalog-preview nexus-catalog-preview--theme");
  preview.dataset.previewKind = "theme";
  const palette = model?.palette ?? resource.previewColors ?? [];
  if (size === "small") {
    preview.classList.add("is-palette-chip");
    const colors = palette
      .filter(color => /^#(?:[0-9a-f]{3}|[0-9a-f]{6})$/i.test(String(color?.value ?? "")))
      .slice(0, 4);
    for (const color of colors) {
      const swatch = makeElement("span", "nexus-catalog-theme-chip");
      swatch.style.backgroundColor = color.value;
      preview.append(swatch);
    }
    if (!colors.length) preview.append(createIconPreview(resource));
    return preview;
  }
  preview.append(createLibraryThemeSample({
    name: resource.name,
    palette,
    typography: model?.typography ?? {},
    layout: { ...(model?.layout ?? {}), preset: model?.preset },
    components: model?.components ?? {},
    compact: true
  }));
  return preview;
}

function createResourceBarPreview(resource) {
  const model = getLibraryResourceBarCardPreviewModel(resource);
  if (!model) return null;
  const preview = makeElement("div", "nexus-catalog-preview nexus-catalog-preview--resource");
  preview.dataset.previewKind = "resource-bar";
  preview.append(makeElement("small", "nexus-catalog-resource-label", model.label));
  const track = makeElement("span", "nexus-catalog-resource-track");
  const fill = makeElement("i", "");
  fill.style.width = model.percent + "%";
  track.append(fill);
  preview.append(track, makeElement("strong", "nexus-catalog-resource-value", model.current + " / " + model.max));
  return preview;
}

function createThumbnailPreview(resource) {
  const source = safeMediaSource(resource.thumbnail);
  if (!source) return null;
  const model = getLibraryResourcePreviewModel(
    { kind: "media", reference: { collection: "media" } },
    { path: source }
  );
  if (model?.mediaType !== "image") return null;
  const preview = makeElement("div", "nexus-catalog-preview nexus-catalog-preview--image");
  preview.dataset.previewKind = "image";
  const image = document.createElement("img");
  image.src = model.source;
  image.alt = "";
  image.loading = "lazy";
  image.decoding = "async";
  image.addEventListener("error", () => {
    if (image.parentElement === preview) preview.replaceChildren(createIconPreview(resource));
  }, { once: true });
  preview.append(image);
  return preview;
}

function createDefaultPreview(resource) {
  const preview = makeElement("div", "nexus-catalog-preview nexus-catalog-preview--icon");
  preview.dataset.previewKind = "icon";
  preview.append(createIconPreview(resource));
  if (resource.kind === "document" && ["cards", "card"].includes(String(resource.type).toLowerCase())) {
    preview.classList.add("is-card-deck");
    preview.append(makeElement("span", "nexus-catalog-card-back"), makeElement("span", "nexus-catalog-card-back"));
  }
  return preview;
}

function createPreview(resource, size) {
  if (resource.reference?.builtin === "font") return createFontPreview(resource, size);
  if (resource.kind === "theme") return createThemePreview(resource, size);
  return createResourceBarPreview(resource)
    ?? createThumbnailPreview(resource)
    ?? createDefaultPreview(resource);
}

export function createLibraryGridCard({ resource, selected = false, viewMode = "grid", cardSize = "medium" } = {}) {
  if (!resource || typeof resource !== "object") throw new TypeError("Um recurso válido é obrigatório para criar um cartão.");
  const key = resource.providerId === "nexus-library" && resource.reference?.collection && resource.reference?.id
    ? `${resource.reference.collection}:${resource.reference.id}`
    : `${String(resource.providerId ?? "")}:${String(resource.id ?? "")}`;

  const card = makeElement("article", "nexus-library-catalog-card");
  card.dataset.libraryResourceKey = key;
  card.dataset.libraryReference = JSON.stringify(resource.reference ?? {});
  card.dataset.resourceKind = String(resource.kind ?? "resource");
  card.dataset.resourceType = String(resource.type ?? "");

  const button = makeElement("button", "nexus-library-catalog-card__button");
  button.type = "button";
  button.dataset.libraryResource = resource.id;
  button.dataset.libraryProvider = resource.providerId;
  button.dataset.resourceCategory = resource.kind === "theme"
    ? "visual-collection"
    : resource.reference?.builtin === "font" ? "font" : String(resource.kind ?? resource.type);
  button.setAttribute("aria-label", `${resource.name}, ${resource.type}`);
  button.setAttribute("aria-pressed", String(Boolean(selected)));
  button.classList.toggle("is-selected", Boolean(selected));

  const preview = createPreview(resource, cardSize);
  preview.classList.add("nexus-library-catalog-card__preview");
  const title = makeElement("strong", "nexus-library-catalog-card__title", resource.name || "Recurso");
  button.append(preview, title);

  if (resource.kind === "theme") {
    const categoryTag = (resource.tags ?? []).find(tag => String(tag).startsWith("categoria:"));
    const labels = { "categoria:padrao": "Padrão", "categoria:cores": "Cores", "categoria:estilos": "Estilos" };
    if (categoryTag) button.append(makeElement("small", "nexus-library-catalog-card__tag", labels[categoryTag] ?? categoryTag));
  }

  if (viewMode === "list") {
    button.classList.add("is-list");
    button.replaceChildren();
    const nameCell = makeElement("span", "nexus-library-catalog-card__name-cell");
    nameCell.append(preview, title);
    button.append(
      nameCell,
      makeElement("span", "nexus-library-catalog-card__category", getLibraryResourceCategoryLabel(resource)),
      makeElement("span", "nexus-library-catalog-card__type", getLibraryResourceTypeLabel(resource))
    );
  }

  card.draggable = true;
  card.addEventListener("dragstart", event => {
    if (!event.dataTransfer) return;
    const separator = key.indexOf(":");
    if (separator <= 0) return;
    const payload = {
      providerId: resource.providerId,
      collection: key.slice(0, separator),
      entryId: key.slice(separator + 1),
      reference: resource.reference,
      kind: resource.kind,
      type: resource.type,
      name: resource.name
    };
    event.dataTransfer.setData("application/x-nexus-library-resource", JSON.stringify(payload));
    if (resource.kind === "document" && resource.reference?.uuid && resource.reference?.documentName) {
      const nativeData = JSON.stringify({ type: resource.reference.documentName, uuid: resource.reference.uuid });
      event.dataTransfer.setData("text/plain", nativeData);
      event.dataTransfer.setData("application/json", nativeData);
    }
    event.dataTransfer.effectAllowed = "copyMove";
  });

  card.append(button);
  return card;
}

export function createLibraryFolderGridCard({ folder, childCount = 0, viewMode = "grid" } = {}) {
  if (!folder || typeof folder !== "object") throw new TypeError("Uma pasta válida é obrigatória para criar um cartão.");
  const card = makeElement("article", "nexus-library-catalog-card nexus-library-catalog-card--folder");
  card.dataset.libraryFolderEntry = folder.id;
  const button = makeElement("button", "nexus-library-catalog-card__button");
  button.type = "button";
  button.dataset.libraryOpenFolder = folder.id;
  button.dataset.libraryFolderSelect = folder.id;
  button.setAttribute("aria-label", "Selecionar pasta " + folder.name);
  button.title = "Clique para selecionar; duplo clique para abrir";
  button.setAttribute("aria-pressed", "false");
  const preview = makeElement("span", "nexus-library-catalog-card__preview nexus-library-catalog-card__preview--folder");
  preview.append(makeElement("i", "fa-solid fa-folder"));
  const title = makeElement("strong", "nexus-library-catalog-card__title", folder.name);
  button.append(preview, title);
  if (viewMode === "list") {
    button.classList.add("is-list");
    const nameCell = makeElement("span", "nexus-library-catalog-card__name-cell");
    nameCell.append(preview, title);
    button.replaceChildren(nameCell,
      makeElement("span", "nexus-library-catalog-card__category", ""),
      makeElement("span", "nexus-library-catalog-card__type", childCount ? `${childCount} subpastas` : "Pasta"));
  }
  card.append(button);
  return card;
}

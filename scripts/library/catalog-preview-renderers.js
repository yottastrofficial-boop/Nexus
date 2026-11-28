/**
 * NEXUS Library — typed preview renderers.
 * Safe, inert DOM specimens shared by catalog cards and the Inspector.
 */
const makeElement = (tag, className = "", content = "") => {
  const element = document.createElement(tag);
  if (className) element.className = className;
  if (content !== "") element.textContent = String(content);
  return element;
};

const THEME_PREVIEW_LABELS = Object.freeze({
  canvasColor: "Canvas", canvas: "Canvas",
  cardColor: "Cartão", card: "Cartão",
  highlightColor: "Destaque", highlight: "Destaque",
  buttonColor: "Botão", button: "Botão",
  accentColor: "Acento", accent: "Acento",
  panelColor: "Painel", panel: "Painel",
  surfaceColor: "Superfície", surface: "Superfície",
  textColor: "Texto", text: "Texto",
  borderColor: "Borda", border: "Borda",
  fieldColor: "Campo", field: "Campo",
  mutedTextColor: "Texto secundário", mutedText: "Texto secundário"
});

export function getLibraryThemePreviewColors(raw = {}) {
  const entry = raw && typeof raw === "object" && !Array.isArray(raw) ? raw : {};
  const profile = entry.profile && typeof entry.profile === "object" ? entry.profile : entry;
  const palette = profile.palette ?? entry.palette ?? entry.tokens ?? {};
  if (!palette || typeof palette !== "object" || Array.isArray(palette)) return [];
  return Object.entries(palette)
    .filter(([, value]) => typeof value === "string" &&
      /^#(?:[0-9a-f]{3}|[0-9a-f]{6})$/i.test(value.trim()))
    .slice(0, 12)
    .map(([key, value]) => ({
      label: THEME_PREVIEW_LABELS[key] ?? String(key).replace(/([a-z])([A-Z])/g, "$1 $2").replace(/[_-]+/g, " ").replace(/^./, char => char.toLocaleUpperCase()).slice(0, 32),
      value: value.trim()
    }));
}


export const safeMediaSource = value => {
  const source = String(value ?? "").trim();
  if (!source || source.length > 2048 || source.includes(String.fromCharCode(92)) || /[\u0000-\u001f]/.test(source)) return "";
  if (/^https?:\/\//i.test(source)) {
    try {
      const parsed = new URL(source);
      return ["http:", "https:"].includes(parsed.protocol) && !parsed.username && !parsed.password ? parsed.href : "";
    } catch { return ""; }
  }
  if (/^[a-z][a-z0-9+.-]*:/i.test(source) || source.startsWith("//")) return "";
  const path = source.split(/[?#]/, 1)[0];
  let segments;
  try { segments = path.split("/").map(segment => decodeURIComponent(segment)); }
  catch { return ""; }
  if (segments.some(segment => segment === "." || segment === ".." || segment.includes("/"))) return "";
  if (source.startsWith("/")) return /^\/[a-z0-9_./-]+(?:[?#][^\s]*)?$/i.test(source) ? source : "";
  return /^[a-z0-9_.-]+(?:\/[a-z0-9_.-]+)*(?:[?#][^\s]*)?$/i.test(source) ? source : "";
};

const safeCount = value => Array.isArray(value) ? value.length : 0;

const safeDimension = value => {
  const number = Number(value);
  return Number.isFinite(number) && number > 0 ? Math.round(number) : null;
};

const normalizeThemeColorKey = value => String(value ?? "")
  .replace(/([a-z])([A-Z])/g, "$1 $2")
  .toLocaleLowerCase("pt-BR")
  .replace(/[^a-z0-9]/g, "");

export function getLibraryThemePreviewTokens(rawColors = []) {
  const entries = Array.isArray(rawColors)
    ? rawColors
    : rawColors && typeof rawColors === "object"
      ? Object.entries(rawColors).map(([key, value]) => ({ key, value }))
      : [];
  const colors = new Map(entries
    .filter(item => item && /^#(?:[0-9a-f]{3}|[0-9a-f]{6})$/i.test(String(item.value ?? "").trim()))
    .map(item => [normalizeThemeColorKey(item.key ?? item.label), String(item.value).trim()]));
  const pick = (keys, fallback) => {
    for (const key of keys) {
      const value = colors.get(normalizeThemeColorKey(key));
      if (value) return value;
    }
    return fallback;
  };
  return Object.freeze({
    canvas: pick(["canvas", "canvasColor", "background"], "#171f2a"),
    panel: pick(["panel", "panelColor"], "#182330"),
    surface: pick(["surface", "surfaceColor"], "#202e3e"),
    input: pick(["input", "inputColor", "field", "fieldColor"], "#111b27"),
    border: pick(["border", "borderColor"], "#3c5067"),
    text: pick(["text", "textColor"], "#e7edf5"),
    muted: pick(["muted", "mutedText", "mutedTextColor", "secondaryText"], "#9aadc2"),
    hover: pick(["hover", "hoverColor"], "#2a3d52"),
    scroll: pick(["scroll", "scrollColor"], "#111923"),
    windowHeader: pick(["windowHeader", "windowHeaderColor"], "#223246"),
    windowContent: pick(["windowContent", "windowContentColor"], "#192431"),
    menu: pick(["menu", "menuColor"], "#202f40"),
    placeholder: pick(["placeholder", "placeholderColor"], "#91a6bd"),
    resourceButton: pick(["resourceButton", "resourceButtonColor"], "#315b7d"),
    card: pick(["card", "cardColor"], "#273443"),
    accent: pick(["accent", "accentColor"], "#52647b"),
    highlight: pick(["highlight", "highlightColor", "selected"], "#78b7e8"),
    button: pick(["button", "buttonColor"], "#315b7d")
  });
}

export function getLibraryResourceBarCardPreviewModel(resource = {}) {
  const type = String(resource.type ?? "").toLocaleLowerCase().replace(/[^a-z0-9]/g, "");
  const component = resource.kind === "component" || resource.reference?.collection === "components";
  if (!component || !["resourcemeter", "assetmeter", "resourcebar", "pvbar", "pmbar", "pebar", "pvring", "pmring", "pering", "sheetresource"].includes(type)) return null;
  return Object.freeze({
    type,
    label: String(resource.name ?? resource.label ?? "Recurso").slice(0, 48),
    current: 32,
    max: 40,
    percent: 80
  });
}

function createLibraryResourceBarCardPreview(resource) {
  const model = getLibraryResourceBarCardPreviewModel(resource);
  if (!model) return null;
  const preview = makeElement("div", "nexus-library-resource-meter-card-preview");
  preview.append(makeElement("small", "", model.label));
  const track = makeElement("span", "nexus-library-component-preview-track");
  const fill = makeElement("i", "");
  fill.style.width = model.percent + "%";
  track.append(fill);
  preview.append(track, makeElement("strong", "", model.current + " / " + model.max));
  return preview;
}

export function createLibraryThemeSample({ name = "Tema", palette = [], typography = {}, layout = {}, components = {}, compact = false } = {}) {
  const tokens = getLibraryThemePreviewTokens(palette);
  const root = makeElement("div", compact ? "nexus-catalog-theme-sample is-compact" : "nexus-catalog-theme-sample");
  root.dataset.previewSize = compact ? "compact" : "full";
  root.dataset.previewShape = compact ? "compact" : "square";
  root.dataset.themePreset = String(layout.preset ?? "");
  for (const [key, value] of Object.entries(tokens)) root.style.setProperty("--nexus-library-theme-" + key, value);
  const family = safeFontFamily(typography.family) || "system-ui, sans-serif";
  const displayFamily = safeFontFamily(typography.displayFamily) || family;
  root.style.setProperty("--nexus-library-theme-font", family);
  root.style.setProperty("--nexus-library-theme-display-font", displayFamily);
  root.style.setProperty("--nexus-library-theme-font-size", (compact ? 7 : Number(typography.baseSize) || 13) + "px");
  root.style.setProperty("--nexus-library-theme-radius", layout.radius === "sharp" ? "0px" : layout.radius === "soft" ? "4px" : compact ? "5px" : "8px");
  root.style.setProperty("--nexus-library-theme-control-height", (compact ? 12 : Math.max(28, Math.min(44, Number(layout.controlHeight) || 34))) + "px");
  root.style.setProperty("--nexus-library-theme-gap", compact ? "3px" : Math.max(4, (Number(layout.spacing) || 1) * 8) + "px");
  for (const [key, style] of Object.entries(components ?? {})) {
    if (!["buttons", "panels", "containers", "highlights", "fields"].includes(key) || !style) continue;
    const prefix = "--nexus-library-theme-component-" + key + "-";
    for (const [property, token] of [["background", "background"], ["text", "text"], ["border", "border"], ["borderStyle", "border-style"], ["borderWidth", "border-width"], ["radius", "radius"]]) {
      const value = style[property];
      if (value !== undefined && value !== null && value !== "") root.style.setProperty(prefix + token, String(value));
    }
  }
  const header = makeElement("header", "nexus-catalog-theme-sample__header");
  header.append(
    makeElement("small", "nexus-catalog-theme-sample__eyebrow", "NEXUS"),
    makeElement("strong", "nexus-catalog-theme-sample__brand", String(name).slice(0, compact ? 18 : 64))
  );
  const body = makeElement("div", "nexus-catalog-theme-sample__body");
  const nav = makeElement("nav", "nexus-catalog-theme-sample__nav");
  nav.append(makeElement("span", "is-active", "Ficha"), makeElement("span", "", compact ? "Atrib." : "Atributos"), makeElement("span", "", "Efeitos"));
  const panel = makeElement("section", "nexus-catalog-theme-sample__panel");
  panel.append(
    makeElement("small", "nexus-catalog-theme-sample__label", compact ? "PERSONAGEM" : "PERSONAGEM · EXEMPLO"),
    makeElement("strong", "nexus-catalog-theme-sample__title", "Ficha de personagem"),
    makeElement("span", "nexus-catalog-theme-sample__highlight", "Destaque selecionado")
  );
  const resource = makeElement("div", "nexus-catalog-theme-sample__resource");
  resource.append(makeElement("small", "nexus-catalog-theme-sample__label", "PV · 32 / 40"));
  const track = makeElement("span", "nexus-catalog-theme-sample__track");
  const fill = makeElement("i", "");
  fill.style.width = "68%";
  track.append(fill);
  resource.append(track);
  panel.append(resource);
  const card = makeElement("div", "nexus-catalog-theme-sample__card");
  card.append(makeElement("small", "nexus-catalog-theme-sample__label", "ATRIBUTO"), makeElement("strong", "", "FOR 16"));
  panel.append(card);
  const controls = makeElement("div", "nexus-catalog-theme-sample__controls");
  controls.append(
    makeElement("span", "nexus-catalog-theme-sample__field", "Campo de exemplo"),
    makeElement("button", "nexus-catalog-theme-sample__button", "Ação"),
    makeElement("button", "nexus-catalog-theme-sample__button is-secondary", "Secundário")
  );
  panel.append(controls);
  body.append(nav, panel);
  root.append(header, body);
  return root;
}

const countLabel = (count, singular, plural = singular + "s") => String(count) + " " + (count === 1 ? singular : plural);

export function getLibraryResourcePreviewModel(resource = {}, resolved = {}) {
  const reference = resource?.reference ?? {};
  const collection = String(reference.collection ?? "");
  const data = resolved && typeof resolved === "object" && !Array.isArray(resolved) ? resolved : {};
  if (resource.kind === "theme" || collection === "themes") return null;
  if (resource.kind === "media" || collection === "media") {
    const source = safeMediaSource(data.path ?? data.url ?? data.src ?? resource.thumbnail);
    const mime = String(data.mimeType ?? data.mime ?? data.type ?? "").split(";", 1)[0].trim().toLowerCase();
    const extension = (source.split(/[?#]/, 1)[0].split(".").pop() ?? "").toLowerCase();
    const isSvg = mime === "image/svg+xml" || extension === "svg";
    const nativeImageMime = ["image/png", "image/jpeg", "image/gif", "image/apng", "image/webp", "image/avif", "image/bmp", "image/x-icon", "image/vnd.microsoft.icon"].includes(mime);
    const nativeImageExtension = ["png", "jpg", "jpeg", "gif", "apng", "webp", "avif", "bmp", "ico"].includes(extension);
    const unsupportedDeclaredImage = mime.startsWith("image/") && !nativeImageMime;
    const mediaType = (!isSvg && !unsupportedDeclaredImage && (nativeImageMime || nativeImageExtension))
      ? "image"
      : (mime.startsWith("audio/") || ["mp3","ogg","wav","m4a","flac","opus"].includes(extension))
        ? "audio"
        : (mime.startsWith("video/") || ["mp4","webm","ogv","mov"].includes(extension))
          ? "video" : "unsupported";
    return {
      kind: "media",
      title: "Prévia de mídia",
      summary: source ? (mediaType === "unsupported" ? "Formato sem prévia nativa reconhecida." : "Recurso de mídia disponível.") : "Este recurso não possui uma origem de mídia segura para pré-visualização.",
      source,
      mediaType
    };
  }
  if (resource.kind === "composition" || collection === "groups") {
    const rawMembers = Array.isArray(data.components) ? data.components : Array.isArray(data.members) ? data.members : [];
    const members = rawMembers.slice(0, 64).map(item => {
      const source = item && typeof item === "object" ? item : {};
      const color = value => typeof value === "string" && /^#[0-9a-f]{3,8}$/i.test(value) ? value : "";
      return {
        type: String(source.type ?? "component").slice(0, 64),
        label: String(source.customLabel ?? source.text ?? source.sheetContent1 ?? source.resourceLabel ?? source.label ?? "Componente").trim().slice(0, 12),
        value: String(source.text ?? source.sheetCode ?? "").trim().slice(0, 14),
        x: safeDimension(source.x) ?? 0,
        y: safeDimension(source.y) ?? 0,
        w: safeDimension(source.w) ?? 100,
        h: safeDimension(source.h) ?? 60,
        current: Number.isFinite(Number(source.previewCurrent)) ? Number(source.previewCurrent) : 32,
        max: Number.isFinite(Number(source.previewMax)) && Number(source.previewMax) > 0 ? Number(source.previewMax) : 40,
        color: color(source.sheetColor),
        borderColor: color(source.borderColor)
      };
    });
    const components = safeCount(data.components ?? data.members);
    const groups = safeCount(data.groups);
    return {
      kind: "composition",
      title: "Composição",
      summary: `${countLabel(components, "componente")} · ${countLabel(groups, "subgrupo")}`,
      members,
      details: [
        ["Componentes", String(components)],
        ["Subgrupos", String(groups)],
        ["Organização", data.groupSettings?.layoutMode ?? data.layoutMode ?? "Preservada na composição"]
      ]
    };
  }
  if (resource.kind === "layout" || collection === "layouts" || collection === "templates") {
    const layout = data.layout && typeof data.layout === "object" ? data.layout : data;
    const components = safeCount(layout.components);
    const groups = safeCount(layout.groups);
    const width = safeDimension(layout.width);
    const height = safeDimension(layout.height);
    return {
      kind: collection === "templates" ? "template" : "layout",
      title: collection === "templates" ? "Modelo de ficha" : "Layout de ficha",
      summary: `${countLabel(components, "componente")} · ${countLabel(groups, "grupo")}${width && height ? ` · ${width} × ${height} px` : ""}`,
      details: [
        ["Componentes", String(components)],
        ["Grupos", String(groups)],
        ...(width && height ? [["Dimensões", `${width} × ${height} px`]] : [])
      ]
    };
  }
  if (resource.kind === "component" || resource.kind === "asset" || collection === "components" || reference.builtin === "asset") {
    const settings = data.settings && typeof data.settings === "object" ? data.settings
      : data.template && typeof data.template === "object" ? data.template : data;
    const width = safeDimension(settings.w ?? data.w);
    const height = safeDimension(settings.h ?? data.h);
    const type = String(data.type ?? resource.type ?? "componente").slice(0, 64);
    const source = safeMediaSource(settings.src ?? settings.path ?? settings.url ?? settings.image ?? data.src ?? data.path);
    const sourcePreview = source
      ? getLibraryResourcePreviewModel({ kind: "media", reference: { collection: "media" } }, { path: source })
      : null;
    const preview = {
      type,
      label: String(settings.label ?? settings.title ?? data.label ?? resource.name ?? type).slice(0, 80),
      value: String(settings.previewValue ?? settings.value ?? settings.text ?? data.previewValue ?? "").slice(0, 80),
      current: Number(settings.previewCurrent ?? settings.current ?? 32),
      max: Number(settings.previewMax ?? settings.max ?? 40),
      source: sourcePreview?.mediaType === "image" ? sourcePreview.source : ""
    };
    return {
      kind: "component",
      title: "Prévia do componente",
      summary: `${type}${width && height ? ` · ${width} × ${height} px` : ""}`,
      type,
      preview,
      details: [
        ["Tipo", type],
        ["Configurações", String(Object.keys(settings).length)],
        ...(width && height ? [["Dimensões iniciais", `${width} × ${height} px`]] : [])
      ]
    };
  }
  if (reference.builtin === "font") {
    const family = safeFontFamily(data.family ?? resource.fontFamily) || "system-ui, sans-serif";
    return {
      kind: "font",
      title: "Prévia tipográfica",
      summary: family,
      family,
      sample: "Lorem ipsum dolor sit amet",
      details: [["Família", family], ["Uso", String(data.category ?? "Tipografia")]]
    };
  }
  if (resource.kind === "style" || collection === "styles") {
    const tokens = data.tokens ?? data.palette ?? data.styles ?? {};
    const colors = Object.entries(tokens && typeof tokens === "object" && !Array.isArray(tokens) ? tokens : {})
      .filter(([key, value]) => /color|background|border|accent|surface/i.test(key) && typeof value === "string" && /^#(?:[0-9a-f]{3}|[0-9a-f]{6})$/i.test(value))
      .slice(0, 12)
      .map(([label, value]) => ({ label: label.slice(0, 40), value }));
    return { kind: "style", title: "Prévia de estilo", summary: countLabel(colors.length, "cor reconhecida", "cores reconhecidas"), colors };
  }
  if (resource.kind === "logic") {
    const payload = data.payload ?? data.flow ?? data;
    const details = [];
    if (resource.type === "property") {
      details.push(["Caminho", String(payload.path ?? payload.key ?? "Não definido").slice(0, 120)]);
      details.push(["Tipo", String(payload.valueType ?? payload.type ?? "Não definido").slice(0, 64)]);
    } else if (resource.type === "rule") {
      details.push(["Expressão", String(payload.expression ?? "Não definida").slice(0, 180)]);
    } else if (["behavior", "flow"].includes(resource.type)) {
      details.push(["Gatilhos", String(safeCount(payload.triggers))]);
      details.push(["Condições", String(safeCount(payload.conditions))]);
      details.push(["Ações", String(safeCount(payload.actions ?? payload.nodes))]);
    } else if (resource.type === "function") {
      details.push(["Operação", String(payload.operation ?? payload.signature ?? "Não definida").slice(0, 120)]);
      if (payload.returnType) details.push(["Retorno", String(payload.returnType).slice(0, 64)]);
    }
    return {
      kind: "logic",
      title: "Definição de lógica",
      summary: `${resource.type || "Ativo lógico"} · ${data.enabled === false ? "Desativado" : "Definição inerte"}`,
      details
    };
  }
  return null;
}

export function getLibraryMediaInsertionSource(resource = {}, resolved = {}) {
  if (resource?.kind !== "media" || resource?.reference?.collection !== "media") return "";
  const rawSource = resolved?.path ?? resolved?.url ?? resolved?.src;
  if (typeof rawSource !== "string" || !rawSource.trim()) return "";
  const preview = getLibraryResourcePreviewModel(resource, resolved);
  const source = rawSource.trim();
  return preview?.mediaType === "image" && preview.source === source ? source : "";
}

export function safeFontFamily(value) {
  const family = String(value ?? "").trim();
  return family && family.length <= 180 && /^[\w\s'",.-]+$/.test(family) ? family : "";
}

export function renderLibraryFontPreview(resource, resolved) {
  if (resource?.reference?.builtin !== "font") return null;
  const model = getLibraryResourcePreviewModel(resource, resolved);
  const family = safeFontFamily(model?.family ?? resolved?.family ?? resource.fontFamily) || "system-ui, sans-serif";
  const section = makeElement("section", "nexus-library-font-preview");
  section.dataset.previewKind = "font";
  section.style.setProperty("--nexus-library-preview-font", family);
  section.style.setProperty("font-family", family, "important");
  const samples = makeElement("div", "nexus-library-font-preview-samples");
  samples.style.setProperty("font-family", family, "important");
  const aa = makeElement("strong", "nexus-library-font-preview-aa", "Aa");
  const lorem = makeElement("p", "nexus-library-font-preview-lorem", "Lorem Epsum");
  const glyphs = makeElement("span", "nexus-library-font-preview-glyphs", "12345 !@#$%");
  for (const sample of [aa, lorem, glyphs]) sample.style.setProperty("font-family", family, "important");
  samples.append(aa, lorem, glyphs);
  section.append(samples);
  return section;
}

export function renderGenericLibraryPreview(resource) {
  if (!resource || resource.reference?.builtin === "font" || resource.kind === "theme") return null;
  const section = makeElement("section", "nexus-library-generic-resource-preview");
  section.dataset.previewKind = String(resource.kind ?? "resource");
  const visual = makeElement("div", "nexus-library-generic-resource-preview-visual");
  const icon = makeElement("i", getLibraryResourceIcon(resource));
  icon.setAttribute("aria-hidden", "true");
  visual.append(icon);
  if (resource.kind === "document" && ["cards", "card"].includes(String(resource.type).toLowerCase())) {
    visual.classList.add("is-card-deck");
    visual.append(makeElement("span", "nexus-library-generic-resource-preview-card"));
    visual.append(makeElement("span", "nexus-library-generic-resource-preview-card"));
  }
  const title = makeElement("strong", "nexus-library-generic-resource-preview-name", resource.name || "Recurso");
  const subtitle = makeElement("small", "nexus-library-generic-resource-preview-type",
    [resource.kind, resource.documentType ?? resource.type].filter(Boolean).join(" · "));
  section.append(visual, title, subtitle);
  return section;
}

export function renderLibraryResourcePreview(resource, resolved) {
  const model = getLibraryResourcePreviewModel(resource, resolved);
  if (!model || model.kind === "font") return null;
  const section = makeElement("section", "nexus-library-resource-preview");
  section.dataset.previewKind = model.kind;

  if (model.kind === "composition" && Array.isArray(model.members) && model.members.length) {
    const members = model.members;
    const bounds = {
      left: Math.min(...members.map(item => item.x)),
      top: Math.min(...members.map(item => item.y)),
      right: Math.max(...members.map(item => item.x + Math.max(20, item.w))),
      bottom: Math.max(...members.map(item => item.y + Math.max(20, item.h)))
    };
    const scale = Math.min(82 / Math.max(1, bounds.right - bounds.left), 82 / Math.max(1, bounds.bottom - bounds.top));
    const gridMode = members.length > 8 || scale < 0.12;
    const visible = gridMode ? members.slice(0, 8) : members;
    const stage = makeElement("div", "nexus-library-saved-group-preview");
    stage.setAttribute("aria-hidden", "true");
    stage.classList.toggle("is-grid", gridMode);
    for (const member of visible) {
      const type = member.type.toLowerCase();
      const resource = ["pv", "pm", "pe", "pv-bar", "pm-bar", "pe-bar", "pv-ring", "sheet-resource", "resource-meter", "asset-meter"].includes(type);
      const card = makeElement("span", "nexus-library-saved-group-card");
      card.dataset.previewType = member.type;
      card.classList.toggle("is-resource", resource);
      card.append(makeElement("strong", "", member.label || "Componente"));
      if (resource) {
        const track = makeElement("span", "nexus-library-saved-group-track");
        const fill = makeElement("i", "");
        fill.style.width = Math.max(0, Math.min(100, member.current / member.max * 100)) + "%";
        fill.style.background = member.color || "var(--nexus-highlight-color, #78b7e8)";
        track.append(fill);
        card.append(track);
      } else if (member.value) {
        card.append(makeElement("small", "", member.value));
      }
      card.style.borderColor = member.borderColor || member.color || "var(--nexus-panel-border, #3c5067)";
      if (gridMode) stage.append(card);
      else {
        card.style.left = (9 + (member.x - bounds.left) * scale) + "px";
        card.style.top = (9 + (member.y - bounds.top) * scale) + "px";
        card.style.width = Math.max(10, member.w * scale) + "px";
        card.style.height = Math.max(10, member.h * scale) + "px";
        card.style.background = "var(--nexus-panel-surface, #202e3e)";
        stage.append(card);
      }
    }
    if (members.length > visible.length) {
      stage.append(makeElement("span", "nexus-library-saved-group-overflow", "+" + (members.length - visible.length)));
    }
    section.append(stage);
  }
  if (model.kind === "component" && model.preview) {
    const preview = model.preview;
    const type = String(preview.type ?? "").toLowerCase();
    const stage = makeElement("div", "nexus-library-component-preview");
    const surface = makeElement("div", "nexus-library-component-preview-surface");
    surface.dataset.componentType = type;
    if (["resource-meter", "asset-meter", "pv", "sheet-resource"].includes(type)) {
      const heading = makeElement("div", "nexus-library-component-preview-heading");
      heading.append(makeElement("strong", "", preview.label), makeElement("small", "", "32 / 40"));
      const track = makeElement("span", "nexus-library-component-preview-track");
      const fill = makeElement("i", "");
      const current = Number.isFinite(preview.current) ? preview.current : 32;
      const maximum = Number.isFinite(preview.max) && preview.max > 0 ? preview.max : 40;
      fill.style.width = Math.max(0, Math.min(100, current / maximum * 100)) + "%";
      track.append(fill);
      surface.append(heading, track);
    } else if (["asset-image", "token"].includes(type)) {
      if (preview.source) {
        const image = document.createElement("img");
        image.src = preview.source;
        image.alt = preview.label;
        image.loading = "lazy";
        image.decoding = "async";
        surface.append(image);
      } else {
        surface.append(makeElement("i", "fa-solid fa-image"), makeElement("small", "", preview.label));
      }
    } else if (["asset-table", "table"].includes(type)) {
      const table = makeElement("div", "nexus-library-component-preview-table");
      for (let index = 0; index < 9; index += 1) table.append(makeElement("span", index < 3 ? "is-heading" : ""));
      surface.append(makeElement("strong", "", preview.label), table);
    } else if (["asset-notes", "notes"].includes(type)) {
      surface.append(makeElement("strong", "", preview.label));
      for (let index = 0; index < 3; index += 1) surface.append(makeElement("span", "nexus-library-component-preview-line"));
    } else if (["asset-field", "text-field", "sheet-name", "sheet-lineage"].includes(type)) {
      surface.append(makeElement("small", "", preview.label), makeElement("span", "nexus-library-component-preview-input", preview.value || "Conteúdo de exemplo"));
    } else if (["asset-value", "sheet-level"].includes(type)) {
      surface.append(makeElement("small", "", preview.label), makeElement("strong", "nexus-library-component-preview-value", preview.value || "16"));
    } else if (type === "asset-link") {
      surface.append(makeElement("strong", "", preview.label), makeElement("span", "nexus-library-component-preview-link", "Abrir recurso"));
    } else {
      surface.append(makeElement("strong", "", preview.label), makeElement("small", "", type || "Componente"));
      if (preview.value) surface.append(makeElement("span", "nexus-library-component-preview-input", preview.value));
    }
    stage.append(surface);
    section.append(stage);
  }
  if (model.source && model.mediaType !== "unsupported") {
    let media;
    if (model.mediaType === "image") {
      media = document.createElement("img");
      media.alt = resource.name || "Prévia de mídia";
      media.loading = "lazy";
      media.decoding = "async";
    } else if (model.mediaType === "audio") {
      media = document.createElement("audio");
      media.controls = true;
      media.preload = "none";
    } else {
      media = document.createElement("video");
      media.controls = true;
      media.preload = "none";
      media.playsInline = true;
    }
    media.src = model.source;
    section.append(media);
  }
  if (model.colors?.length) {
    const colors = makeElement("div", "nexus-library-resource-preview-colors");
    for (const color of model.colors) {
      const swatch = makeElement("span", "nexus-library-resource-preview-swatch");
      swatch.style.backgroundColor = color.value;
      swatch.title = `${color.label}: ${color.value}`;
      swatch.setAttribute("aria-label", `${color.label}: ${color.value}`);
      colors.append(swatch);
    }
    section.append(colors);
  }
  return section;
}


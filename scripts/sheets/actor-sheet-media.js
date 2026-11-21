/**
 * Media classification and reusable visual previews for Actor sheet components.
 * Actor-specific token resolution remains in the sheet facade.
 */
const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

export const DEFAULT_FOUNDRY_TOKEN_IMAGE = "icons/svg/mystery-man.svg";
const IMAGE_EXTENSIONS = "png|jpe?g|jpe|jfif|pjpeg|pjp|gif|apng|webp|avif|svg|bmp|dib|tif|tiff|ico|heic|heif|jxl";
const AUDIO_EXTENSIONS = "mp3|ogg|wav|m4a|aac|flac|opus";
const VIDEO_EXTENSIONS = "mp4|webm|ogv|mov|m4v|mkv|avi|mpeg|mpg|3gp";
const MEDIA_EXTENSION_PATTERN = new RegExp(\`\\.(?:\${IMAGE_EXTENSIONS}|\${AUDIO_EXTENSIONS}|\${VIDEO_EXTENSIONS})(?:[?#].*)?$ \`.trim(), "i");
const VIDEO_EXTENSION_PATTERN = new RegExp(\`\\.(?:\${VIDEO_EXTENSIONS})(?:[?#].*)?$\`, "i");
export const getMediaKind = value => {
  const source = String(value ?? "").trim();
  const dataType = source.match(/^data:(image|audio|video)\//i)?.[1]?.toLowerCase();
  if (dataType) return dataType;
  const clean = source.split(/[?#]/)[0].toLowerCase();
  if (new RegExp(\`\\.(?:\${AUDIO_EXTENSIONS})$\`, "i").test(clean)) return "audio";
  if (new RegExp(\`\\.(?:\${VIDEO_EXTENSIONS})$\`, "i").test(clean)) return "video";
  if (new RegExp(\`\\.(?:\${IMAGE_EXTENSIONS})$\`, "i").test(clean)) return "image";
  return "";
};
export const isMediaSource = value => {
  const source = String(value ?? "").trim();
  if (!source || /[{}]/.test(source)) return false;
  if (/^data:(?:image|audio|video)\/[a-z0-9.+-]+(?:;[^,]*)?,/i.test(source)) return true;
  // URLs HTTP(S) podem ser links assinados/CDN sem extensão visível; o navegador
  // confirma o formato durante o carregamento. Caminhos locais exigem extensão.
  if (/^https?:\/\//i.test(source)) return true;
  return !/^[a-z][a-z0-9+.-]*:/i.test(source) && MEDIA_EXTENSION_PATTERN.test(source);
};
export const isVideoSource = value => VIDEO_EXTENSION_PATTERN.test(String(value ?? "")) || /^data:video\//i.test(String(value ?? ""));
export const isAudioSource = value => new RegExp(`\\.(?:${AUDIO_EXTENSIONS})(?:[?#].*)?$`, "i").test(String(value ?? "")) || /^data:audio\//i.test(String(value ?? ""));
export const isImageSource = value => isMediaSource(value) && !isVideoSource(value) && !isAudioSource(value);
export const isUsableTokenSource = value => {
  const source = String(value ?? "").trim();
  return source !== DEFAULT_FOUNDRY_TOKEN_IMAGE && (isImageSource(source) || isVideoSource(source));
};


export const isSafeLink = value => /^(https?:\/\/|mailto:|\/)/i.test(String(value ?? "").trim());

// Um único renderer mantém a mesma estrutura visual nos previews da biblioteca,
// no inspetor e no componente inserido na ficha.
export const setPreviewContent = (node, value) => {
  if (!node) return;
  node.replaceChildren();
  const content = String(value ?? "").trim();
  if (isImageSource(content)) {
    const img = document.createElement("img");
    img.src = content;
    img.alt = "";
    img.loading = "lazy";
    node.append(img);
  } else {
    const icon = content.match(/^(fa-(?:solid|regular|brands|light|thin|duotone)\s+fa-[a-z0-9-]+)$/i);
    if (icon) {
      const glyph = document.createElement("i");
      glyph.className = icon[1];
      glyph.setAttribute("aria-hidden", "true");
      node.append(glyph);
    } else node.textContent = content;
  }
  node.hidden = !content;
};

export const createSheetResourcePreview = ({
  label = "PV", icon = "❤️", current = 32, max = 40,
  color = "#3198ce", trackColor = "#080d14", orientation = "horizontal", showValues = true
} = {}) => {
  const root = document.createElement("div");
  root.className = `nexus-sheet-resource nexus-sheet-resource-preview${orientation === "vertical" ? " is-vertical" : ""}`;
  root.style.setProperty("--nexus-resource-color", color);
  root.style.setProperty("--nexus-resource-track-color", trackColor);
  const labelNode = document.createElement("span");
  labelNode.className = "nexus-sheet-resource-label";
  setPreviewContent(labelNode, label);
  const iconNode = document.createElement("span");
  iconNode.className = "nexus-sheet-resource-icon";
  setPreviewContent(iconNode, icon);
  const track = document.createElement("div");
  track.className = "nexus-sheet-resource-track";
  const fill = document.createElement("i");
  const currentNumber = Number(current), maxNumber = Number(max);
  const percent = current == null || current === "" || max == null || max === "" || !Number.isFinite(currentNumber) || !Number.isFinite(maxNumber) || maxNumber <= 0
    ? 0 : clamp(currentNumber / maxNumber, 0, 1) * 100;
  fill.style.setProperty("width", orientation === "horizontal" ? `${percent}%` : "100%", "important");
  fill.style.setProperty("height", orientation === "vertical" ? `${percent}%` : "100%", "important");
  track.append(fill);
  root.append(labelNode, iconNode, track);
  if (showValues) {
    const values = document.createElement("strong");
    values.className = "nexus-sheet-resource-values";
    const currentNode = document.createElement("b");
    currentNode.textContent = String(current);
    const separator = document.createElement("span");
    separator.textContent = "/";
    const maxNode = document.createElement("b");
    maxNode.textContent = String(max);
    values.append(currentNode, separator, maxNode);
    root.append(values);
  }
  return root;
};

export const fitSheetResourcePreview = (stage, component, maxSize = 174) => {
  if (!stage || !component) return;
  const preview = stage.querySelector(".nexus-sheet-resource-preview");
  if (!preview) return;
  const width = Math.max(1, Number(component.w) || 220);
  const height = Math.max(1, Number(component.h) || 58);
  const scale = Math.min(maxSize / width, maxSize / height);
  preview.style.setProperty("width", `${Math.max(1, width * scale)}px`, "important");
  preview.style.setProperty("height", `${Math.max(1, height * scale)}px`, "important");
  preview.style.setProperty("max-width", "100%", "important");
  preview.style.setProperty("max-height", "100%", "important");
  stage.dataset.componentWidth = String(width);
  stage.dataset.componentHeight = String(height);
};

export const updateSheetResourcePreview = (root, settings = {}) => {
  if (!root) return;
  const {
    label = "PV", icon = "❤️", current = 32, max = 40,
    color = "#3198ce", trackColor = "#080d14", orientation = "horizontal"
  } = settings;
  const nodes = root.querySelectorAll(".nexus-sheet-resource-label,.nexus-sheet-resource-icon");
  setPreviewContent(nodes[0], label);
  setPreviewContent(nodes[1], icon);
  const values = root.querySelectorAll(".nexus-sheet-resource-values b");
  if (values[0]) values[0].textContent = current == null || current === "" ? "—" : String(current);
  if (values[1]) values[1].textContent = max == null || max === "" ? "—" : String(max);
  root.style.setProperty("--nexus-resource-color", color);
  root.style.setProperty("--nexus-resource-track-color", trackColor);
  root.classList.toggle("is-vertical", orientation === "vertical");
  const fill = root.querySelector(".nexus-sheet-resource-track > i");
  const currentNumber = Number(current), maxNumber = Number(max);
  const percent = current == null || current === "" || max == null || max === "" || !Number.isFinite(currentNumber) || !Number.isFinite(maxNumber) || maxNumber <= 0
    ? 0 : clamp(currentNumber / maxNumber, 0, 1) * 100;
  if (fill) {
    // Regras verticais usam propriedades !important; atualizar com prioridade
    // evita que a altura fixa da barra prevaleça sobre o valor atual.
    fill.style.setProperty("width", orientation === "horizontal" ? `${percent}%` : "100%", "important");
    fill.style.setProperty("height", orientation === "vertical" ? `${percent}%` : "100%", "important");
  }
};


/**
 * Registry de formatos e adaptadores de mídia do NEXUS.
 * Identifica arquivos e organiza adaptadores; não decodifica por conta própria.
 * Binários pesados são carregados sob demanda, nunca implicitamente por CDN.
 */
const DEFAULT_FORMATS = [
  { id: "jpeg-xl", label: "JPEG XL", kind: "image", extensions: ["jxl"], mimeTypes: ["image/jxl"], codecs: ["jxl"], containers: ["jxl"], decoder: "libjxl-wasm", foundryUpload: false },
  { id: "av1", label: "AV1", kind: "video", extensions: [], mimeTypes: ["video/av1"], codecs: ["av1"], containers: ["webm", "mp4"], decoder: "ffmpeg-wasm", foundryUpload: true },
  { id: "opus", label: "Opus", kind: "audio", extensions: ["opus"], mimeTypes: ["audio/opus"], codecs: ["opus"], containers: ["ogg", "webm"], decoder: "ffmpeg-wasm", foundryUpload: true },
  { id: "avif", label: "AVIF", kind: "image", extensions: ["avif"], mimeTypes: ["image/avif"], codecs: ["av1", "avif"], containers: ["avif"], decoder: "browser-or-wasm", foundryUpload: true },
  { id: "webp", label: "WebP", kind: "image", extensions: ["webp"], mimeTypes: ["image/webp"], codecs: ["webp"], containers: ["riff-webp"], decoder: "browser", foundryUpload: true },
  { id: "png", label: "PNG", kind: "image", extensions: ["png"], mimeTypes: ["image/png"], codecs: ["png"], containers: ["png"], decoder: "browser", foundryUpload: true },
  { id: "jpeg", label: "JPEG", kind: "image", extensions: ["jpg", "jpeg"], mimeTypes: ["image/jpeg"], codecs: ["jpeg"], containers: ["jpeg"], decoder: "browser", foundryUpload: true },
  { id: "gif", label: "GIF", kind: "image", extensions: ["gif"], mimeTypes: ["image/gif"], codecs: ["gif"], containers: ["gif"], decoder: "browser", foundryUpload: true },
  { id: "webm", label: "WebM", kind: "video", extensions: ["webm"], mimeTypes: ["video/webm", "audio/webm"], codecs: ["vp8", "vp9", "av1", "opus"], containers: ["webm"], decoder: "browser-or-ffmpeg-wasm", foundryUpload: true },
  { id: "mp4", label: "MP4", kind: "video", extensions: ["mp4", "m4v"], mimeTypes: ["video/mp4", "audio/mp4"], codecs: ["h264", "hevc", "av1", "aac", "opus"], containers: ["mp4"], decoder: "browser-or-ffmpeg-wasm", foundryUpload: true },
  { id: "ogg", label: "Ogg", kind: "audio", extensions: ["ogg", "oga", "ogv"], mimeTypes: ["audio/ogg", "video/ogg"], codecs: ["opus", "vorbis", "theora"], containers: ["ogg"], decoder: "browser-or-ffmpeg-wasm", foundryUpload: true },
  { id: "wav", label: "WAV", kind: "audio", extensions: ["wav"], mimeTypes: ["audio/wav", "audio/x-wav"], codecs: ["pcm"], containers: ["riff-wave"], decoder: "browser-or-ffmpeg-wasm", foundryUpload: true },
  { id: "pdf", label: "PDF", kind: "document", extensions: ["pdf"], mimeTypes: ["application/pdf"], codecs: [], containers: ["pdf"], decoder: "pdf-viewer", foundryUpload: true },
  { id: "svg", label: "SVG", kind: "image", extensions: ["svg"], mimeTypes: ["image/svg+xml"], codecs: ["svg"], containers: ["svg"], decoder: "browser-sanitized", foundryUpload: null },
  { id: "bmp", label: "Bitmap", kind: "image", extensions: ["bmp"], mimeTypes: ["image/bmp"], codecs: ["bmp"], containers: ["bmp"], decoder: "browser-or-wasm", foundryUpload: null },
  { id: "tiff", label: "TIFF", kind: "image", extensions: ["tif", "tiff"], mimeTypes: ["image/tiff"], codecs: ["tiff"], containers: ["tiff"], decoder: "wasm-adapter", foundryUpload: null },
  { id: "heif", label: "HEIF / HEIC", kind: "image", extensions: ["heic", "heif"], mimeTypes: ["image/heic", "image/heif"], codecs: ["hevc", "av1"], containers: ["heif"], decoder: "browser-or-wasm", foundryUpload: null },
  { id: "mp3", label: "MP3", kind: "audio", extensions: ["mp3"], mimeTypes: ["audio/mpeg"], codecs: ["mp3"], containers: ["mpeg-audio"], decoder: "browser-or-ffmpeg-wasm", foundryUpload: null },
  { id: "flac", label: "FLAC", kind: "audio", extensions: ["flac"], mimeTypes: ["audio/flac", "audio/x-flac"], codecs: ["flac"], containers: ["flac"], decoder: "browser-or-ffmpeg-wasm", foundryUpload: null },
  { id: "aac", label: "AAC", kind: "audio", extensions: ["aac"], mimeTypes: ["audio/aac"], codecs: ["aac"], containers: ["adts"], decoder: "browser-or-ffmpeg-wasm", foundryUpload: null },
  { id: "m4a", label: "M4A", kind: "audio", extensions: ["m4a"], mimeTypes: ["audio/mp4"], codecs: ["aac", "alac", "opus"], containers: ["mp4"], decoder: "browser-or-ffmpeg-wasm", foundryUpload: null },
  { id: "mov", label: "QuickTime MOV", kind: "video", extensions: ["mov"], mimeTypes: ["video/quicktime"], codecs: ["h264", "hevc", "prores"], containers: ["mov"], decoder: "browser-or-ffmpeg-wasm", foundryUpload: null },
  { id: "mkv", label: "Matroska", kind: "video", extensions: ["mkv"], mimeTypes: ["video/x-matroska"], codecs: ["h264", "hevc", "av1", "vp9", "opus"], containers: ["matroska"], decoder: "ffmpeg-wasm", foundryUpload: null },
  { id: "avi", label: "AVI", kind: "video", extensions: ["avi"], mimeTypes: ["video/x-msvideo"], codecs: ["mpeg4", "h264", "mjpeg"], containers: ["avi"], decoder: "ffmpeg-wasm", foundryUpload: null },
  { id: "font-woff2", label: "WOFF2", kind: "font", extensions: ["woff2"], mimeTypes: ["font/woff2"], codecs: [], containers: ["woff2"], decoder: "font-face", foundryUpload: null },
  { id: "font-woff", label: "WOFF", kind: "font", extensions: ["woff"], mimeTypes: ["font/woff"], codecs: [], containers: ["woff"], decoder: "font-face", foundryUpload: null },
  { id: "font-ttf", label: "TrueType", kind: "font", extensions: ["ttf"], mimeTypes: ["font/ttf", "application/x-font-ttf"], codecs: [], containers: ["sfnt"], decoder: "font-face", foundryUpload: null },
  { id: "font-otf", label: "OpenType", kind: "font", extensions: ["otf"], mimeTypes: ["font/otf", "application/x-font-opentype"], codecs: [], containers: ["sfnt"], decoder: "font-face", foundryUpload: null },
  { id: "model-gltf", label: "glTF / GLB", kind: "model", extensions: ["gltf", "glb"], mimeTypes: ["model/gltf+json", "model/gltf-binary"], codecs: [], containers: ["gltf", "glb"], decoder: "threejs-adapter", foundryUpload: null },
  { id: "model-obj", label: "Wavefront OBJ", kind: "model", extensions: ["obj"], mimeTypes: ["text/plain"], codecs: [], containers: ["obj"], decoder: "threejs-adapter", foundryUpload: null },
  { id: "model-stl", label: "STL", kind: "model", extensions: ["stl"], mimeTypes: ["model/stl"], codecs: [], containers: ["stl"], decoder: "threejs-adapter", foundryUpload: null },
  { id: "archive-zip", label: "ZIP", kind: "archive", extensions: ["zip"], mimeTypes: ["application/zip"], codecs: ["deflate", "deflate64"], containers: ["zip"], decoder: "archive-adapter", foundryUpload: null },
  { id: "archive-7z", label: "7-Zip", kind: "archive", extensions: ["7z"], mimeTypes: ["application/x-7z-compressed"], codecs: [], containers: ["7z"], decoder: "archive-adapter", foundryUpload: null },
  { id: "archive-rar", label: "RAR", kind: "archive", extensions: ["rar"], mimeTypes: ["application/vnd.rar", "application/x-rar-compressed"], codecs: [], containers: ["rar"], decoder: "archive-adapter", foundryUpload: null },
  { id: "archive-gzip", label: "GZIP", kind: "archive", extensions: ["gz"], mimeTypes: ["application/gzip"], codecs: ["deflate"], containers: ["gzip"], decoder: "archive-adapter", foundryUpload: null }
];

const ascii = (bytes, start, end) => String.fromCharCode(...bytes.slice(start, end));
const bytesOf = value => value instanceof Uint8Array
  ? value
  : value instanceof ArrayBuffer
    ? new Uint8Array(value)
    : ArrayBuffer.isView(value)
      ? new Uint8Array(value.buffer, value.byteOffset, value.byteLength)
      : Array.isArray(value)
        ? Uint8Array.from(value)
        : new Uint8Array();
const extensionOf = value => {
  const source = String(value ?? "").trim().toLowerCase().split(/[?#]/, 1)[0];
  const basename = source.slice(source.lastIndexOf("/") + 1);
  const index = basename.lastIndexOf(".");
  return index >= 0 ? basename.slice(index + 1) : basename.replace(/^\./, "");
};
const mimeOf = value => String(value ?? "").split(";", 1)[0].trim().toLowerCase();

function normalizeFormat(format) {
  if (!format || typeof format !== "object") throw new TypeError("Definição de formato inválida.");
  const id = String(format.id ?? "").trim().toLowerCase();
  const kind = String(format.kind ?? "").trim().toLowerCase();
  if (!/^[a-z0-9][a-z0-9-]*$/.test(id)) throw new TypeError("ID de formato inválido.");
  if (!["image", "video", "audio", "document", "font", "model", "archive", "other"].includes(kind)) {
    throw new TypeError("Tipo de mídia inválido.");
  }
  return Object.freeze({
    ...format, id, kind,
    extensions: [...new Set((format.extensions ?? []).map(extensionOf).filter(Boolean))],
    mimeTypes: [...new Set((format.mimeTypes ?? []).map(mimeOf).filter(Boolean))],
    codecs: [...new Set((format.codecs ?? []).map(value => String(value).toLowerCase()))],
    containers: [...new Set((format.containers ?? []).map(value => String(value).toLowerCase()))]
  });
}

export function createMediaFormatRegistry({ formats = DEFAULT_FORMATS } = {}) {
  const byId = new Map();
  const adapters = new Map();
  const registerFormat = format => {
    const normalized = normalizeFormat(format);
    if (byId.has(normalized.id)) throw new Error("Formato já registrado: " + normalized.id);
    byId.set(normalized.id, normalized);
    return normalized;
  };
  const registerAdapter = adapter => {
    if (!adapter || typeof adapter !== "object" || !/^[a-z0-9][a-z0-9._-]*$/i.test(String(adapter.id ?? ""))) {
      throw new TypeError("Adaptador inválido.");
    }
    if (adapters.has(adapter.id)) throw new Error("Adaptador já registrado: " + adapter.id);
    if (typeof adapter.load !== "function") throw new TypeError("O adaptador precisa fornecer load().");
    const normalized = Object.freeze({ ...adapter, formats: [...(adapter.formats ?? [])], codecs: [...(adapter.codecs ?? [])] });
    adapters.set(normalized.id, normalized);
    return normalized;
  };
  for (const format of formats) registerFormat(format);
  const listFormats = kind => [...byId.values()].filter(format => !kind || format.kind === kind);
  const getFormat = id => byId.get(String(id ?? "").toLowerCase()) ?? null;
  const findByExtension = value => listFormats().find(format => format.extensions.includes(extensionOf(value))) ?? null;
  const findByMimeType = value => listFormats().find(format => format.mimeTypes.includes(mimeOf(value))) ?? null;
  const findAdapters = ({ format, codec, capability } = {}) => [...adapters.values()].filter(adapter =>
    (!format || !adapter.formats.length || adapter.formats.includes(format)) &&
    (!codec || !adapter.codecs.length || adapter.codecs.includes(String(codec).toLowerCase())) &&
    (typeof adapter.supports !== "function" || adapter.supports({ format, codec, capability }) !== false)
  );
  return Object.freeze({ registerFormat, registerAdapter, listFormats, getFormat, findByExtension, findByMimeType, findAdapters });
}

function sniffIsoBmff(bytes) {
  if (bytes.length < 16 || ascii(bytes, 4, 8) !== "ftyp") return null;
  const brands = [ascii(bytes, 8, 12)];
  for (let offset = 16; offset + 4 <= Math.min(bytes.length, 256); offset += 4) {
    brands.push(ascii(bytes, offset, offset + 4));
  }
  if (brands.some(brand => brand === "avif" || brand === "avis")) {
    return Object.freeze({ formatId: "avif", container: "avif", confidence: "signature" });
  }
  return Object.freeze({ formatId: "mp4", container: "mp4", confidence: "signature" });
}

export function sniffMediaSignature(input) {
  const bytes = bytesOf(input);
  if (!bytes.length) return null;
  const isoBmff = sniffIsoBmff(bytes);
  if (isoBmff) return isoBmff;
  const signatures = [
    ["jpeg-xl", (bytes.length >= 2 && bytes[0] === 255 && bytes[1] === 10) ||
      (bytes.length >= 12 && bytes[0] === 0 && bytes[1] === 0 && bytes[2] === 0 && bytes[3] === 12 &&
        ascii(bytes, 4, 8) === "JXL " && bytes[8] === 13 && bytes[9] === 10 && bytes[10] === 135 && bytes[11] === 10), "jxl"],
    ["png", bytes.length >= 8 && [137, 80, 78, 71, 13, 10, 26, 10].every((value, index) => bytes[index] === value), "png"],
    ["jpeg", bytes.length >= 3 && bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255, "jpeg"],
    ["gif", bytes.length >= 6 && /^GIF8[79]a$/.test(ascii(bytes, 0, 6)), "gif"],
    ["webp", bytes.length >= 12 && ascii(bytes, 0, 4) === "RIFF" && ascii(bytes, 8, 12) === "WEBP", "riff-webp"],
    ["wav", bytes.length >= 12 && ascii(bytes, 0, 4) === "RIFF" && ascii(bytes, 8, 12) === "WAVE", "riff-wave"],
    ["webm", bytes.length >= 4 && bytes[0] === 26 && bytes[1] === 69 && bytes[2] === 223 && bytes[3] === 163, "webm"],
    ["ogg", bytes.length >= 4 && ascii(bytes, 0, 4) === "OggS", "ogg"],
    ["pdf", bytes.length >= 5 && ascii(bytes, 0, 5) === "%PDF-", "pdf"]
  ];
  const hit = signatures.find(([, matches]) => matches);
  return hit ? Object.freeze({ formatId: hit[0], container: hit[2], confidence: "signature" }) : null;
}

/** Codec AV1 em WebM/MP4 exige inspeção da faixa; extensão não é prova. */
export function detectMediaDescriptor({ name = "", mimeType = "", bytes = null, codec = "" } = {}, registry = createMediaFormatRegistry()) {
  const extension = extensionOf(name);
  const mime = mimeOf(mimeType);
  const signature = sniffMediaSignature(bytes);
  const format = (signature && registry.getFormat(signature.formatId)) ||
    registry.findByExtension(extension) ||
    registry.findByMimeType(mime);
  if (!format) {
    return Object.freeze({
      supported: false, kind: "other", formatId: null, extension, mimeType: mime,
      codec: String(codec ?? "").toLowerCase() || null,
      container: signature?.container ?? null,
      confidence: signature ? "signature-unmapped" : "unknown"
    });
  }
  return Object.freeze({
    supported: true, kind: format.kind, formatId: format.id, label: format.label,
    extension, mimeType: mime || format.mimeTypes[0] || "",
    codec: String(codec ?? "").trim().toLowerCase() || (format.codecs.length === 1 ? format.codecs[0] : null),
    container: signature?.container ?? format.containers[0] ?? null,
    confidence: signature?.confidence ?? (registry.findByExtension(extension) ? "extension" : "mime"),
    foundryUpload: format.foundryUpload === true ? true : format.foundryUpload === false ? false : null,
    decoder: format.decoder ?? null
  });
}

export const NEXUS_MEDIA_FORMATS = Object.freeze(DEFAULT_FORMATS.map(normalizeFormat));

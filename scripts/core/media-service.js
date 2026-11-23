import { detectMediaDescriptor } from "./media-format-registry.js";

const DEFAULT_MEDIA_LIMITS = Object.freeze({ maxFileBytes: 512 * 1024 * 1024, maxPreviewPixels: 40000000 });

export function createMediaCapabilityService({ registry, environment = globalThis, limits = {} } = {}) {
  const maxFileBytes = Math.max(1024, Number(limits.maxFileBytes) || DEFAULT_MEDIA_LIMITS.maxFileBytes);
  const maxPreviewPixels = Math.max(1024, Number(limits.maxPreviewPixels) || DEFAULT_MEDIA_LIMITS.maxPreviewPixels);
  const mediaRegistry = registry;
  if (!mediaRegistry) throw new TypeError("O serviço de mídia exige um registry de formatos.");

  const inspect = async file => {
    if (!file || typeof file !== "object" || typeof file.slice !== "function") throw new TypeError("Arquivo de mídia inválido.");
    if (Number(file.size) > maxFileBytes) throw new Error("Arquivo excede o limite de processamento configurado.");
    const header = new Uint8Array(await file.slice(0, 512).arrayBuffer());
    const descriptor = detectMediaDescriptor({ name: file.name ?? "", mimeType: file.type ?? "", bytes: header }, mediaRegistry);
    return Object.freeze({ descriptor, size: Number(file.size) || 0, name: String(file.name ?? ""), lastModified: Number(file.lastModified) || 0 });
  };

  const canPlay = ({ kind, mimeType, codec = "" } = {}) => {
    if (kind !== "audio" && kind !== "video") return { supported: false, confidence: "unsupported-kind" };
    let element = null;
    try {
      if (kind === "audio" && typeof environment.Audio === "function") element = new environment.Audio();
      else if (typeof environment.document?.createElement === "function") element = environment.document.createElement(kind);
    } catch (_) { element = null; }
    if (!element || typeof element.canPlayType !== "function") return { supported: false, confidence: "unavailable" };
    const mime = String(mimeType ?? (kind === "audio" ? "audio/ogg" : "video/webm"));
    const codecPart = codec ? '; codecs="' + String(codec).replace(/[^a-zA-Z0-9., _-]/g, "") + '"' : "";
    const result = element.canPlayType(mime + codecPart);
    return { supported: result === "probably" || result === "maybe", confidence: result || "no" };
  };

  const decodeImage = async (file, { maxPixels = maxPreviewPixels } = {}) => {
    if (typeof environment.createImageBitmap !== "function") throw new Error("Este ambiente não oferece decodificação nativa de imagens.");
    const bitmap = await environment.createImageBitmap(file);
    if (bitmap.width * bitmap.height > maxPixels) {
      bitmap.close?.();
      throw new Error("Imagem excede o limite de pixels para pré-visualização.");
    }
    return bitmap;
  };

  const inspectPlayback = async ({ kind, mimeType, codec = "" } = {}) => {
    const native = canPlay({ kind, mimeType, codec });
    if (!native.supported || typeof environment.navigator?.mediaCapabilities?.decodingInfo !== "function") return native;
    try {
      const info = await environment.navigator.mediaCapabilities.decodingInfo({
        type: "file",
        audio: kind === "audio" ? { contentType: mimeType + (codec ? '; codecs="' + codec + '"' : ""), channels: "2", bitrate: 128000, samplerate: 48000 } : undefined,
        video: kind === "video" ? { contentType: mimeType + (codec ? '; codecs="' + codec + '"' : ""), width: 1920, height: 1080, bitrate: 5000000, framerate: 30 } : undefined
      });
      return { supported: info.supported === true, smooth: info.smooth === true, powerEfficient: info.powerEfficient === true, confidence: "media-capabilities" };
    } catch (_) { return native; }
  };
  return Object.freeze({ inspect, canPlay, inspectPlayback, decodeImage });
}

export function createMediaProcessingPipeline({ capabilityService, adapters = [], limits = {}, resourceManager = null } = {}) {
  if (!capabilityService) throw new TypeError("Pipeline de mídia exige serviço de capacidades.");
  const loaded = new Map();
  const maxBytes = Math.max(1024, Number(limits.maxInputBytes) || DEFAULT_MEDIA_LIMITS.maxFileBytes);
  if (resourceManager && (typeof resourceManager.register !== "function" || typeof resourceManager.acquire !== "function")) {
    throw new TypeError("O gerenciador de recursos fornecido é inválido.");
  }
  const registerAdapter = adapter => {
    if (!adapter || !/^[a-z0-9][a-z0-9._-]*$/i.test(String(adapter.id ?? "")) || typeof adapter.load !== "function") throw new TypeError("Adaptador de mídia inválido.");
    if (loaded.has(adapter.id)) throw new Error("Adaptador de mídia já registrado: " + adapter.id);
    const resourceId = "media.adapter." + adapter.id;
    if (resourceManager) {
      resourceManager.register({
        id: resourceId,
        estimateBytes: adapter.estimatedMemoryBytes ?? 0,
        priority: adapter.priority ?? 0,
        load: () => adapter.load(),
        unload: async instance => {
          if (typeof adapter.unload === "function") await adapter.unload(instance);
          else await instance?.dispose?.();
        }
      });
    }
    loaded.set(adapter.id, { descriptor: Object.freeze({ ...adapter }), resourceId, promise: null, instance: null });
  };
  for (const adapter of adapters) registerAdapter(adapter);
  const candidatesFor = ({ descriptor, operation }) => [...loaded.values()].filter(item =>
    (!item.descriptor.operations || item.descriptor.operations.includes(operation)) &&
    (!item.descriptor.formats?.length || item.descriptor.formats.includes(descriptor.formatId)) &&
    (typeof item.descriptor.supports !== "function" || item.descriptor.supports({ descriptor, operation }) === true)
  ).sort((a, b) => Number(b.descriptor.priority ?? 0) - Number(a.descriptor.priority ?? 0));
  const loadCandidate = async (candidate, operation) => {
    if (resourceManager) {
      let lease;
      try {
        lease = await resourceManager.acquire(candidate.resourceId, { priority: candidate.descriptor.priority ?? 0 });
        if (typeof lease.value?.[operation] !== "function") {
          await lease.release();
          return null;
        }
        return { adapter: lease.value, release: lease.release };
      } catch (error) {
        candidate.lastError = String(error?.message ?? error);
        return null;
      }
    }
    if (!candidate.promise) candidate.promise = Promise.resolve().then(() => candidate.descriptor.load());
    try {
      candidate.instance ??= await candidate.promise;
      return typeof candidate.instance?.[operation] === "function"
        ? { adapter: candidate.instance, release: async () => {} }
        : null;
    } catch (error) {
      candidate.promise = null;
      candidate.instance = null;
      candidate.lastError = String(error?.message ?? error);
      return null;
    }
  };
  const resolve = async ({ descriptor, operation }) => {
    for (const candidate of candidatesFor({ descriptor, operation })) {
      const loadedCandidate = await loadCandidate(candidate, operation);
      if (loadedCandidate) return {
        adapter: loadedCandidate.adapter,
        id: candidate.descriptor.id,
        release: loadedCandidate.release
      };
    }
    return null;
  };
  const process = async (file, operation, options = {}) => {
    if (!file || Number(file.size) > maxBytes) throw new Error("Arquivo ausente ou acima do limite de processamento.");
    const inspected = await capabilityService.inspect(file);
    const errors = [];
    for (const candidate of candidatesFor({ descriptor: inspected.descriptor, operation })) {
      const loadedCandidate = await loadCandidate(candidate, operation);
      if (!loadedCandidate) { errors.push(candidate.lastError ?? "Falha ao carregar adaptador."); continue; }
      try {
        const result = await loadedCandidate.adapter[operation]({ file, descriptor: inspected.descriptor, options });
        return { adapterId: candidate.descriptor.id, descriptor: inspected.descriptor, result };
      } catch (error) {
        candidate.lastError = String(error?.message ?? error);
        errors.push(candidate.descriptor.id + ": " + candidate.lastError);
      } finally {
        await loadedCandidate.release();
      }
    }
    throw new Error("Nenhum adaptador conseguiu executar " + operation + " para " + (inspected.descriptor.label ?? inspected.descriptor.formatId ?? "formato desconhecido") + (errors.length ? " — " + errors.join("; ") : "."));
  };
  return Object.freeze({ registerAdapter, resolve, process, get adapterIds() { return [...loaded.keys()]; } });
}

export function createBrowserMediaAdapter(capabilityService, environment = globalThis) {
  return Object.freeze({
    id: "nexus.browser.native",
    priority: 10,
    estimatedMemoryBytes: 1024 * 1024,
    operations: ["decodeImage", "inspectPlayback"],
    formats: ["jpeg-xl", "avif", "webp", "png", "jpeg", "gif"],
    supports: ({ descriptor, operation }) => operation === "decodeImage"
      ? descriptor.kind === "image" && typeof environment.createImageBitmap === "function"
      : ["audio", "video"].includes(descriptor.kind),
    load: async () => ({
      decodeImage: ({ file, options }) => capabilityService.decodeImage(file, options),
      inspectPlayback: ({ descriptor, options }) => capabilityService.inspectPlayback({ kind: descriptor.kind, mimeType: descriptor.mimeType, codec: options?.codec ?? descriptor.codec ?? "" })
    })
  });
}


/**
 * Worker adapter contract: the worker receives { id, operation, payload } and
 * replies with { id, ok, result } or { id, ok:false, error }.
 * Worker URLs must be local to the Foundry origin; remote CDN execution is rejected.
 */
export function createWorkerMediaAdapter({ id, workerUrl, formats = [], operations = [], priority = 50, estimatedMemoryBytes = 8 * 1024 * 1024, timeoutMs = 30000, WorkerClass = globalThis.Worker, baseUrl = globalThis.location?.href } = {}) {
  if (!/^[a-z0-9][a-z0-9._-]{2,95}$/i.test(String(id ?? ""))) throw new TypeError("ID do adaptador Worker inválido.");
  if (typeof WorkerClass !== "function") throw new Error("Web Workers não estão disponíveis neste ambiente.");
  if (!baseUrl) throw new Error("A origem local do Foundry não pôde ser determinada.");
  const resolved = new URL(String(workerUrl ?? ""), baseUrl);
  if (resolved.origin !== new URL(baseUrl).origin) throw new Error("Adaptadores de mídia não podem carregar Workers remotos.");
  const allowedOperations = [...new Set(operations.map(value => String(value)))];
  if (!allowedOperations.length || allowedOperations.some(value => !/^[a-z][a-zA-Z0-9]{1,40}$/.test(value))) throw new TypeError("Operações do Worker inválidas.");
  return Object.freeze({
    id, formats: [...formats], operations: allowedOperations, priority, estimatedMemoryBytes,
    supports: ({ descriptor, operation }) => allowedOperations.includes(operation) && (!formats.length || formats.includes(descriptor.formatId)),
    load: async () => {
      const worker = new WorkerClass(resolved.href, { type: "module", name: "NEXUS media " + id });
      const pending = new Map();
      let sequence = 0;
      const failAll = error => {
        for (const request of pending.values()) {
          clearTimeout(request.timer);
          request.reject(error);
        }
        pending.clear();
      };
      worker.addEventListener("message", event => {
        const message = event.data ?? {};
        const request = pending.get(message.id);
        if (!request) return;
        pending.delete(message.id);
        clearTimeout(request.timer);
        if (message.ok === true) request.resolve(message.result);
        else request.reject(new Error(String(message.error ?? "Worker de mídia falhou.")));
      });
      worker.addEventListener("error", event => failAll(new Error(event.message || "Falha no Worker de mídia.")));
      const invoke = operation => async ({ file, descriptor, options = {} } = {}) => {
        if (!file || typeof file.arrayBuffer !== "function") throw new TypeError("Worker exige um arquivo Blob/File.");
        const buffer = await file.arrayBuffer();
        const id = ++sequence;
        return new Promise((resolve, reject) => {
          const timer = setTimeout(() => {
            pending.delete(id);
            reject(new Error("Tempo limite do Worker de mídia excedido."));
          }, Math.max(100, Math.min(120000, Number(timeoutMs) || 30000)));
          pending.set(id, { resolve, reject, timer });
          try {
            worker.postMessage({
              id, operation,
              payload: {
                buffer, name: String(file.name ?? ""), mimeType: String(file.type ?? ""),
                size: Number(file.size) || buffer.byteLength, descriptor, options
              }
            }, [buffer]);
          } catch (error) {
            clearTimeout(timer);
            pending.delete(id);
            reject(error);
          }
        });
      };
      const api = Object.fromEntries(allowedOperations.map(operation => [operation, invoke(operation)]));
      api.dispose = () => { failAll(new Error("Worker de mídia encerrado.")); worker.terminate(); };
      return Object.freeze(api);
    }
  });
}

/** Helper to be imported by a local module Worker that implements a codec adapter. */
export function installNexusMediaWorkerRuntime(handlers, scope = globalThis) {
  if (!scope?.addEventListener || !scope?.postMessage || !handlers || typeof handlers !== "object") {
    throw new TypeError("Contexto ou handlers do Worker inválidos.");
  }
  scope.addEventListener("message", async event => {
    const message = event.data ?? {};
    const handler = handlers[message.operation];
    if (!Number.isInteger(message.id) || typeof handler !== "function") return;
    try {
      const payload = message.payload ?? {};
      const file = new Blob([payload.buffer], { type: String(payload.mimeType ?? "") });
      const result = await handler({ file, descriptor: payload.descriptor, options: payload.options ?? {}, name: payload.name ?? "" });
      if (result instanceof ArrayBuffer) scope.postMessage({ id: message.id, ok: true, result }, [result]);
      else scope.postMessage({ id: message.id, ok: true, result });
    } catch (error) {
      scope.postMessage({ id: message.id, ok: false, error: String(error?.message ?? error) });
    }
  });
}

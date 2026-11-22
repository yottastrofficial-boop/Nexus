const safeExtension = file => String(file?.name ?? "").split(/[?#]/, 1)[0].split(".").pop()?.toLowerCase() ?? "";
const safePath = path => {
  const value = String(path ?? "").replace(/\\/g, "/").replace(/^\/+/, "");
  if (!value || value.split("/").some(part => !part || part === "." || part === ".." || part.includes("\0"))) throw new Error("Caminho de mídia inválido.");
  return value;
};

export function createFoundryMediaStorageAdapter({ FilePicker = globalThis.foundry?.applications?.apps?.FilePicker, extensions = globalThis.CONST?.UPLOADABLE_FILE_EXTENSIONS } = {}) {
  const allowed = new Set((Array.isArray(extensions) ? extensions : []).map(value => String(value).replace(/^\./, "").toLowerCase()));
  return Object.freeze({
    id: "nexus.foundry.storage",
    kind: "shared",
    supports: file => allowed.has(safeExtension(file)),
    async upload({ file, path, source = "data" } = {}) {
      if (!FilePicker || typeof FilePicker.upload !== "function") throw new Error("A API pública de upload do Foundry não está disponível.");
      if (!this.supports(file)) throw new Error("A extensão deste arquivo não é aceita pelo servidor Foundry.");
      const destination = safePath(path);
      return FilePicker.upload(source, destination, file, {}, { notify: false });
    }
  });
}

export function createExternalMediaStorageAdapter({ id, upload, supports, description = "" } = {}) {
  if (!/^[a-z0-9][a-z0-9._-]{2,95}$/i.test(String(id ?? "")) || typeof upload !== "function" || typeof supports !== "function") {
    throw new TypeError("Adaptador de armazenamento externo exige id, supports() e upload().");
  }
  return Object.freeze({
    id, kind: "shared-external", description,
    supports: file => supports(file) === true,
    upload: async request => {
      if (!supports(request?.file)) throw new Error("O armazenamento externo não aceita este arquivo.");
      return upload({ ...request, path: safePath(request?.path) });
    }
  });
}

export function createMediaStorageRouter(adapters = []) {
  const entries = [];
  const register = adapter => {
    if (!adapter || typeof adapter.supports !== "function" || typeof adapter.upload !== "function") throw new TypeError("Adaptador de armazenamento inválido.");
    if (entries.some(item => item.id === adapter.id)) throw new Error("Adaptador de armazenamento duplicado: " + adapter.id);
    entries.push(adapter);
    return adapter;
  };
  adapters.forEach(register);
  const resolve = file => entries.find(adapter => adapter.supports(file)) ?? null;
  const upload = async request => {
    const adapter = resolve(request?.file);
    if (!adapter) throw new Error("Nenhum armazenamento compartilhado aceita este formato. Configure um backend externo; o cache local não substitui armazenamento compartilhado.");
    const result = await adapter.upload(request);
    return { adapterId: adapter.id, result };
  };
  return Object.freeze({ register, resolve, upload, get adapterIds() { return entries.map(item => item.id); } });
}

export function createIndexedDbMediaCache({ indexedDBRef = globalThis.indexedDB, databaseName = "nexus-media-cache", storeName = "media", maxBytes = 128 * 1024 * 1024 } = {}) {
  if (!indexedDBRef?.open) throw new Error("IndexedDB não está disponível neste ambiente.");
  const limit = Math.max(1024 * 1024, Number(maxBytes) || 128 * 1024 * 1024);
  let databasePromise;
  const open = () => databasePromise ??= new Promise((resolve, reject) => {
    const request = indexedDBRef.open(databaseName, 1);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(storeName)) {
        const store = db.createObjectStore(storeName, { keyPath: "key" });
        store.createIndex("updatedAt", "updatedAt");
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error("Falha ao abrir cache de mídia."));
  });
  const requestValue = request => new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error("Falha no cache de mídia."));
  });
  const getAll = async store => requestValue(store.getAll());
  const get = async key => {
    const db = await open(), tx = db.transaction(storeName, "readonly");
    const record = await requestValue(tx.objectStore(storeName).get(String(key)));
    return record?.blob ?? null;
  };
  const put = async (key, blob, metadata = {}) => {
    if (!blob || typeof blob.size !== "number") throw new TypeError("Cache aceita somente Blob/File.");
    const db = await open();
    const tx = db.transaction(storeName, "readwrite");
    const store = tx.objectStore(storeName);
    store.put({ key: String(key), blob, size: blob.size, metadata, updatedAt: Date.now() });
    const records = await getAll(store);
    let total = records.reduce((sum, item) => sum + (Number(item.size) || 0), 0);
    for (const item of records.sort((a, b) => a.updatedAt - b.updatedAt)) {
      if (total <= limit) break;
      if (item.key === String(key)) continue;
      store.delete(item.key);
      total -= Number(item.size) || 0;
    }
    await new Promise((resolve, reject) => {
      tx.oncomplete = resolve;
      tx.onerror = () => reject(tx.error ?? new Error("Falha ao gravar cache de mídia."));
      tx.onabort = () => reject(tx.error ?? new Error("Gravação de cache cancelada."));
    });
    return { key: String(key), cachedBytes: Math.min(total, limit) };
  };
  const remove = async key => {
    const db = await open(), tx = db.transaction(storeName, "readwrite");
    tx.objectStore(storeName).delete(String(key));
    await new Promise((resolve, reject) => { tx.oncomplete = resolve; tx.onerror = () => reject(tx.error); });
  };
  const clear = async () => {
    const db = await open(), tx = db.transaction(storeName, "readwrite");
    tx.objectStore(storeName).clear();
    await new Promise((resolve, reject) => { tx.oncomplete = resolve; tx.onerror = () => reject(tx.error); });
  };
  return Object.freeze({ get, put, remove, clear });
}

export async function createMediaCacheKey(blob, { decoderVersion = "1", parameters = {} } = {}, cryptoRef = globalThis.crypto) {
  if (!blob || typeof blob.arrayBuffer !== "function" || !cryptoRef?.subtle?.digest) throw new Error("Hash SHA-256 indisponível para este recurso.");
  const bytes = await blob.arrayBuffer();
  const digest = await cryptoRef.subtle.digest("SHA-256", bytes);
  const hash = [...new Uint8Array(digest)].map(value => value.toString(16).padStart(2, "0")).join("");
  return hash + ":" + String(decoderVersion) + ":" + JSON.stringify(parameters);
}

import assert from "node:assert/strict";
import { createMediaCapabilityService, createMediaProcessingPipeline, createBrowserMediaAdapter, createWorkerMediaAdapter } from "../scripts/core/media-service.js";
import { createFoundryMediaStorageAdapter, createExternalMediaStorageAdapter, createMediaStorageRouter } from "../scripts/core/media-storage.js";

const registry = {
  getFormat: id => id === "png" ? { id, kind: "image", label: "PNG", mimeTypes: ["image/png"], codecs: ["png"], containers: ["png"], foundryUpload: true } : null,
  findByExtension: ext => ext === "png" ? { id: "png", kind: "image", label: "PNG", mimeTypes: ["image/png"], codecs: ["png"], containers: ["png"], foundryUpload: true } : null,
  findByMimeType: mime => mime === "image/png" ? { id: "png", kind: "image", label: "PNG", mimeTypes: ["image/png"], codecs: ["png"], containers: ["png"], foundryUpload: true } : null
};
const environment = {
  createImageBitmap: async () => ({ width: 10, height: 10, close() {} }),
  document: { createElement: () => ({ canPlayType: () => "probably" }) }
};
const capability = createMediaCapabilityService({ registry, environment });
const png = new Blob([Uint8Array.from([137,80,78,71,13,10,26,10])], { type: "image/png" });
Object.defineProperty(png, "name", { value: "test.png" });
const inspected = await capability.inspect(png);
assert.equal(inspected.descriptor.formatId, "png");
const imageAdapter = createBrowserMediaAdapter(capability, environment);
const pipeline = createMediaProcessingPipeline({ capabilityService: capability, adapters: [imageAdapter] });
const decoded = await pipeline.process(png, "decodeImage");
assert.equal(decoded.adapterId, "nexus.browser.native");
assert.equal(decoded.result.width, 10);
const fallbackPipeline = createMediaProcessingPipeline({
  capabilityService: capability,
  adapters: [
    { id: "nexus.test.failing", priority: 20, formats: ["png"], operations: ["decodeImage"], supports: () => true,
      load: async () => ({ decodeImage: async () => { throw new Error("decoder incompatível"); } }) },
    { id: "nexus.test.fallback", priority: 10, formats: ["png"], operations: ["decodeImage"], supports: () => true,
      load: async () => ({ decodeImage: async () => ({ fallback: true }) }) }
  ]
});
const fallbackResult = await fallbackPipeline.process(png, "decodeImage");
assert.equal(fallbackResult.adapterId, "nexus.test.fallback");

let uploads = 0;
const foundry = createFoundryMediaStorageAdapter({ FilePicker: { upload: async () => { uploads++; return { path: "test.png" }; } }, extensions: ["png"] });
const external = createExternalMediaStorageAdapter({ id: "nexus.test.external", supports: file => file.name.endsWith(".jxl"), upload: async () => ({ url: "https://storage.example/file.jxl" }) });
const storage = createMediaStorageRouter([foundry, external]);
assert.equal(storage.resolve(png).id, "nexus.foundry.storage");
assert.equal((await storage.upload({ file: png, path: "nexus/test.png" })).adapterId, "nexus.foundry.storage");
const jxl = new Blob(["jxl"], { type: "image/jxl" });
Object.defineProperty(jxl, "name", { value: "test.jxl" });
assert.equal(storage.resolve(jxl).id, "nexus.test.external");
assert.equal(uploads, 1);
await assert.rejects(() => foundry.upload({ file: jxl, path: "test.jxl" }), /não é aceita/);
await assert.rejects(() => storage.upload({ file: jxl, path: "../bad.jxl" }), /Caminho/);
console.log("NEXUS media infrastructure: testes aprovados.");

class FakeWorker {
  constructor(url) { this.url = url; this.listeners = {}; this.terminated = false; }
  addEventListener(name, callback) { this.listeners[name] = callback; }
  postMessage(message) { queueMicrotask(() => this.listeners.message?.({ data: { id: message.id, ok: true, result: { operation: message.operation, bytes: message.payload.buffer.byteLength } } })); }
  terminate() { this.terminated = true; }
}
const workerAdapter = createWorkerMediaAdapter({
  id: "nexus.test.worker",
  workerUrl: "/systems/nexus/test-worker.js",
  formats: ["jpeg-xl"],
  operations: ["decodeImage"],
  WorkerClass: FakeWorker,
  baseUrl: "https://foundry.example/game"
});
const workerApi = await workerAdapter.load();
const workerResult = await workerApi.decodeImage({ file: new Blob(["jxl"]), descriptor: { formatId: "jpeg-xl" } });
assert.equal(workerResult.operation, "decodeImage");
assert.equal(workerResult.bytes, 3);
workerApi.dispose();
assert.throws(() => createWorkerMediaAdapter({
  id: "nexus.test.remote",
  workerUrl: "https://cdn.example/worker.js",
  operations: ["decodeImage"],
  WorkerClass: FakeWorker,
  baseUrl: "https://foundry.example/game"
}), /remotos/);

import assert from "node:assert/strict";
import { createMediaFormatRegistry, detectMediaDescriptor, sniffMediaSignature } from "../scripts/core/media-format-registry.js";

const registry = createMediaFormatRegistry();
assert.equal(registry.getFormat("jpeg-xl").foundryUpload, false);
assert.equal(registry.findByExtension("portrait.JXL").id, "jpeg-xl");
assert.equal(registry.findByExtension("vector.svg").id, "svg");
assert.equal(registry.findByExtension("archive.zip").kind, "archive");
assert.equal(registry.findByExtension("model.glb").kind, "model");
assert.equal(registry.findByExtension("unknown-font.woff2").kind, "font");
assert.equal(registry.getFormat("archive-zip").foundryUpload, null, "Upload desconhecido deve permanecer não classificado");
assert.equal(registry.findByMimeType("audio/opus; codecs=opus").id, "opus");

const jxlContainer = Uint8Array.from([0, 0, 0, 12, 0x4a, 0x58, 0x4c, 0x20, 13, 10, 135, 10]);
assert.deepEqual(sniffMediaSignature(jxlContainer), { formatId: "jpeg-xl", container: "jxl", confidence: "signature" });
assert.equal(detectMediaDescriptor({ name: "wrong.png", bytes: jxlContainer }, registry).formatId, "jpeg-xl");
assert.equal(sniffMediaSignature(Uint8Array.from([0, 0, 0, 99, 0x4a, 0x58, 0x4c, 0x20, 13, 10, 135, 10])), null);

const avifFile = Uint8Array.from([0, 0, 0, 20, 0x66, 0x74, 0x79, 0x70, 0x61, 0x76, 0x69, 0x66, 0, 0, 0, 0, 0x61, 0x76, 0x69, 0x66]);
assert.deepEqual(sniffMediaSignature(avifFile), { formatId: "avif", container: "avif", confidence: "signature" });
assert.equal(detectMediaDescriptor({ name: "clip.mp4", bytes: avifFile }, registry).formatId, "avif");

const mp4File = Uint8Array.from([0, 0, 0, 20, 0x66, 0x74, 0x79, 0x70, 0x69, 0x73, 0x6f, 0x6d, 0, 0, 0, 0, 0x69, 0x73, 0x6f, 0x6d]);
assert.equal(sniffMediaSignature(mp4File).formatId, "mp4");
assert.equal(detectMediaDescriptor({ name: "clip.webm", mimeType: "video/webm" }, registry).codec, null);
assert.equal(detectMediaDescriptor({ name: "voice.opus" }, registry).codec, "opus");
assert.equal(detectMediaDescriptor({ name: "voice.ogg" }, registry).formatId, "ogg");
assert.equal(detectMediaDescriptor({ name: "unknown.bin" }, registry).supported, false);

const adapters = createMediaFormatRegistry();
let loaded = 0;
adapters.registerAdapter({
  id: "nexus.test.decoder",
  formats: ["jpeg-xl"],
  codecs: ["jxl"],
  load: async () => { loaded++; return { decode: () => true }; }
});
assert.equal(adapters.findAdapters({ format: "jpeg-xl", codec: "jxl" }).length, 1);
assert.equal(loaded, 0);
await adapters.findAdapters({ format: "jpeg-xl" })[0].load();
assert.equal(loaded, 1);
assert.throws(() => adapters.registerAdapter({ id: "invalid" }), /load/);
assert.throws(() => adapters.registerFormat({ id: "jpeg-xl", kind: "image" }), /já registrado/);

console.log("NEXUS media-format-registry: testes aprovados.");

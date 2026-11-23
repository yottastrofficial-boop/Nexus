import test from "node:test";
import assert from "node:assert/strict";
import { createResourceLifecycleManager } from "../scripts/core/resource-lifecycle.js";

test("carrega sob demanda e descarrega recursos ociosos acima do limite", async () => {
  let loads = 0, unloads = 0;
  const manager = createResourceLifecycleManager({ maxResidentBytes: 100, maxIdleBytes: 20 });
  manager.register({ id: "media.preview.one", estimateBytes: 60, load: async () => { loads++; return { ready: true }; }, unload: async () => { unloads++; } });
  const lease = await manager.acquire("media.preview.one");
  assert.equal(loads, 1);
  assert.equal(manager.stats().residentBytes, 60);
  await lease.release();
  assert.equal(unloads, 1);
  assert.equal(manager.get("media.preview.one").state, "registered");
});

test("deduplica carregamentos concorrentes e protege referências ativas", async () => {
  let loads = 0, finish;
  const manager = createResourceLifecycleManager({ maxResidentBytes: 100, maxIdleBytes: 100 });
  manager.register({ id: "decoder.shared", estimateBytes: 40, load: () => { loads++; return new Promise(resolve => { finish = () => resolve({ decoder: true }); }); } });
  const first = manager.acquire("decoder.shared");
  const second = manager.acquire("decoder.shared");
  await new Promise(resolve => setImmediate(resolve));
  finish();
  const [a, b] = await Promise.all([first, second]);
  assert.equal(loads, 1);
  assert.equal(manager.stats().references, 2);
  await a.release();
  assert.equal(manager.get("decoder.shared").state, "ready");
  await b.release();
});

test("não ultrapassa o orçamento nem descarrega recurso em uso", async () => {
  const manager = createResourceLifecycleManager({ maxResidentBytes: 50, maxIdleBytes: 50 });
  manager.register({ id: "resource.first", estimateBytes: 40, load: async () => ({ id: 1 }) });
  manager.register({ id: "resource.second", estimateBytes: 20, load: async () => ({ id: 2 }) });
  const lease = await manager.acquire("resource.first");
  await assert.rejects(manager.acquire("resource.second"), /Memória RAM insuficiente/);
  assert.equal(manager.get("resource.first").state, "ready");
  await lease.release();
});

test("preload mantém recurso residente até liberar a reserva", async () => {
  let unloads = 0;
  const manager = createResourceLifecycleManager({ maxResidentBytes: 100, maxIdleBytes: 0 });
  manager.register({ id: "session.soundscape", estimateBytes: 30, load: async () => ({ audio: true }), unload: async () => { unloads++; } });
  const prepared = await manager.preload("session.soundscape", { priority: 20 });
  await manager.trim({ maxBytes: 0 });
  assert.equal(manager.get("session.soundscape").state, "ready");
  await prepared.release();
  assert.equal(unloads, 1);
});

test("rejeita remoção enquanto recurso está em uso", async () => {
  const manager = createResourceLifecycleManager();
  manager.register({ id: "asset.thumbnail", load: async () => ({ image: true }) });
  const lease = await manager.acquire("asset.thumbnail");
  await assert.rejects(manager.unregister("asset.thumbnail"), /em uso/);
  await lease.release();
  assert.equal(await manager.unregister("asset.thumbnail"), true);
});

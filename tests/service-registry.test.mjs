import test from "node:test";
import assert from "node:assert/strict";
import { createNexusServiceRegistry } from "../scripts/core/service-registry.js";

test("resolve cria serviços sob demanda e compartilha instâncias", async () => {
  let created = 0;
  const registry = createNexusServiceRegistry();
  registry.register("core.store", async () => ({ id: ++created }));
  registry.register("feature.catalog", async ({ "core.store": store }) => ({ store }), { dependencies: ["core.store"] });
  assert.equal(created, 0);
  const [first, second] = await Promise.all([registry.resolve("feature.catalog"), registry.resolve("feature.catalog")]);
  assert.equal(first, second);
  assert.equal(first.store.id, 1);
  assert.equal(registry.get("core.store").id, 1);
});

test("resolve deduplica criação concorrente e inicializa dependências antes do consumidor", async () => {
  const order = [];
  const registry = createNexusServiceRegistry();
  registry.register("core.alpha", async () => { await Promise.resolve(); order.push("alpha"); return "A"; });
  registry.register("feature.beta", async ({ "core.alpha": alpha }) => { order.push("beta"); return alpha + "B"; }, { dependencies: ["core.alpha"] });
  assert.equal(await registry.resolve("feature.beta"), "AB");
  assert.deepEqual(order, ["alpha", "beta"]);
});

test("detecta dependência circular com caminho explicativo", async () => {
  const registry = createNexusServiceRegistry();
  registry.register("core.alpha", async ({ "core.beta": beta }) => beta, { dependencies: ["core.beta"] });
  registry.register("core.beta", async ({ "core.alpha": alpha }) => alpha, { dependencies: ["core.alpha"] });
  await assert.rejects(registry.resolve("core.alpha"), /Dependência circular.*core.alpha.*core.beta.*core.alpha/);
});

test("falha de factory não deixa instância quebrada e pode ser tentada novamente", async () => {
  let attempts = 0;
  const registry = createNexusServiceRegistry();
  registry.register("core.retry", async () => {
    if (++attempts === 1) throw new Error("temporário");
    return { ready: true };
  });
  await assert.rejects(registry.resolve("core.retry"), /temporário/);
  assert.equal(registry.list()[0].state, "registered");
  assert.deepEqual(await registry.resolve("core.retry"), { ready: true });
});

test("publica serviços existentes idempotentemente e rejeita colisões", () => {
  const registry = createNexusServiceRegistry();
  const service = { ready: true };
  assert.equal(registry.publish("core.existing", service), service);
  assert.equal(registry.publish("core.existing", service), service);
  assert.throws(() => registry.publish("core.existing", {}), /já publicado/);
  assert.equal(registry.get("core.existing"), service);
});

test("encerra serviços na ordem inversa e uma única vez", async () => {
  const order = [];
  const registry = createNexusServiceRegistry();
  registry.register("core.first", async () => ({ dispose: () => order.push("first") }));
  registry.register("feature.second", async () => ({ dispose: () => order.push("second") }), { dependencies: ["core.first"] });
  await registry.initialize(["feature.second"]);
  await registry.dispose();
  await registry.dispose();
  assert.deepEqual(order, ["second", "first"]);
  assert.equal(registry.disposed, true);
  assert.throws(() => registry.register("core.late", () => ({})), /encerrado/);
});

test("resolveSync constrói grafo síncrono e injeta dependências em ordem", () => {
  const order = [];
  const registry = createNexusServiceRegistry();
  registry.register("core.sync-a", () => { order.push("a"); return { value: 2 }; });
  registry.register("feature.sync-b", ({ "core.sync-a": a }) => { order.push("b"); return a.value * 3; }, { dependencies: ["core.sync-a"] });
  assert.equal(registry.resolveSync("feature.sync-b"), 6);
  assert.deepEqual(order, ["a", "b"]);
  assert.equal(registry.resolveSync("feature.sync-b"), 6);
  assert.deepEqual(order, ["a", "b"]);
});

test("resolveSync rejeita fábricas assíncronas com orientação explícita", () => {
  const registry = createNexusServiceRegistry();
  registry.register("core.async-only", async () => ({ ready: true }));
  assert.throws(() => registry.resolveSync("core.async-only"), /use resolve\(\)/);
});


test("dispose aguarda factories em andamento e encerra o serviço recém-criado", async () => {
  let releaseFactory;
  let cleaned = 0;
  const registry = createNexusServiceRegistry();
  registry.register("core.pending", () => new Promise(resolve => {
    releaseFactory = () => resolve({ dispose: () => { cleaned += 1; } });
  }));

  const creating = registry.resolve("core.pending");
  await Promise.resolve();
  const firstDispose = registry.dispose();
  const secondDispose = registry.dispose();
  assert.equal(firstDispose, secondDispose, "chamadas concorrentes devem compartilhar a mesma promise");
  assert.throws(() => registry.register("core.late", () => ({})), /encerrando/);
  await assert.rejects(registry.resolve("core.late"), /encerrando/);

  await Promise.resolve();
  assert.equal(cleaned, 0, "não deve descartar antes de a factory terminar");
  releaseFactory();
  await Promise.all([creating, firstDispose, secondDispose]);
  assert.equal(cleaned, 1);
  assert.equal(registry.disposed, true);
});

test("dispose aguarda cleanup assíncrono antes de resolver para todos os chamadores", async () => {
  let releaseCleanup;
  const registry = createNexusServiceRegistry();
  registry.register("core.async-cleanup", () => ({
    dispose: () => new Promise(resolve => { releaseCleanup = resolve; })
  }));
  await registry.resolve("core.async-cleanup");

  const first = registry.dispose();
  const second = registry.dispose();
  let settled = false;
  Promise.all([first, second]).then(() => { settled = true; });
  await Promise.resolve();
  assert.equal(settled, false);
  releaseCleanup();
  await Promise.all([first, second]);
  assert.equal(settled, true);
});


test("defineAccessor mantém a fachada pública e resolve serviço somente no primeiro acesso", () => {
  let created = 0;
  const registry = createNexusServiceRegistry();
  const facade = {};
  registry.register("core.lazy-facade", () => ({ id: ++created }));
  registry.defineAccessor(facade, "service", "core.lazy-facade");

  assert.equal(created, 0);
  assert.equal(registry.list()[0].state, "registered");
  assert.equal(facade.service.id, 1);
  assert.equal(facade.service, facade.service);
  assert.equal(created, 1);
});

test("defineAccessor permite publicar override antes da primeira resolução", () => {
  const registry = createNexusServiceRegistry();
  const facade = {};
  const override = { source: "external" };
  registry.register("core.overrideable", () => ({ source: "factory" }));
  registry.defineAccessor(facade, "service", "core.overrideable");
  facade.service = override;
  assert.equal(facade.service, override);
  assert.throws(() => { facade.service = {}; }, /substituir um serviço já inicializado/);
});

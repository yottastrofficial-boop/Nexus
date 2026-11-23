import test from "node:test";
import assert from "node:assert/strict";
import { createLibraryTransferRegistry } from "../scripts/core/library-transfer-registry.js";

const createRegistry = overrides => createLibraryTransferRegistry({
  createPlanId: (() => { let id = 0; return () => "plan-" + (++id); })(),
  ...overrides
});

test("prepara transferência, filtra tipos compatíveis e só grava após confirmação", async () => {
  const registry = createRegistry();
  let committed = null;
  registry.registerSource({
    id: "test-source",
    label: "Origem de teste",
    read: async input => input
  });
  registry.registerDestination({
    id: "test-destination",
    label: "Destino de teste",
    supports: item => item.type === "component",
    preview: async items => ({ additions: items.length, names: items.map(item => item.name) }),
    commit: async (preview, items) => { committed = { preview, items }; return { added: items.length }; }
  });

  const preview = await registry.prepare({
    sourceId: "test-source",
    destinationId: "test-destination",
    input: {
      format: "test-package",
      version: 1,
      items: [
        { id: "a", type: "component", name: "Componente A", data: { value: 2 } },
        { id: "b", type: "unknown", name: "Item B", data: {} }
      ]
    }
  });
  assert.equal(preview.total, 2);
  assert.equal(preview.compatible, 1);
  assert.equal(preview.unsupported.length, 1);
  assert.equal(committed, null, "A prévia não pode persistir dados.");

  const result = await registry.commit(preview.planId);
  assert.deepEqual(result, { added: 1 });
  assert.equal(committed.items[0].name, "Componente A");
  assert.equal(registry.pendingPlans, 0);
  await assert.rejects(() => registry.commit(preview.planId), /inexistente|expirada|confirmada/);
});

test("rejeita payloads executáveis, protótipos e limites excedidos", async () => {
  const registry = createRegistry({ limits: { maxItems: 1, maxBytes: 2048 } });
  registry.registerSource({ id: "unsafe-source", label: "Origem", read: async input => input });
  registry.registerDestination({
    id: "safe-destination", label: "Destino",
    supports: () => true, preview: () => ({}), commit: () => ({})
  });

  await assert.rejects(() => registry.prepare({
    sourceId: "unsafe-source", destinationId: "safe-destination",
    input: { items: [{ type: "component", name: "A", data: { nested: { code: () => "alert(1)" } } }] }
  }), /somente dados JSON simples/);
  await assert.rejects(() => registry.prepare({
    sourceId: "unsafe-source", destinationId: "safe-destination",
    input: { items: [{ type: "component", name: "A", data: {} }, { type: "component", name: "B", data: {} }] }
  }), /limite de itens/);
});

test("uma falha de destino mantém a prévia disponível para nova tentativa", async () => {
  const registry = createRegistry();
  let attempts = 0;
  registry.registerSource({ id: "retry-source", label: "Origem", read: async input => input });
  registry.registerDestination({
    id: "retry-destination", label: "Destino",
    supports: () => true,
    preview: async items => ({ count: items.length }),
    commit: async () => { attempts++; if (attempts === 1) throw new Error("falha temporária"); return { ok: true }; }
  });
  const preview = await registry.prepare({
    sourceId: "retry-source", destinationId: "retry-destination",
    input: { items: [{ type: "layout", name: "Layout", data: {} }] }
  });
  await assert.rejects(() => registry.commit(preview.planId), /falha temporária/);
  assert.deepEqual(await registry.commit(preview.planId), { ok: true });
});

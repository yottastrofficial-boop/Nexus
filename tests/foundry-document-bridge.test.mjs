import test from "node:test";
import assert from "node:assert/strict";
import { createFoundryDocumentBridge } from "../scripts/core/foundry-document-bridge.js";

test("lista documentos nativos com metadados leves e paginação", async () => {
  const actor = { id: "a1", uuid: "Actor.a1", documentName: "Actor", name: "Ayla", img: "ayla.webp", folder: { name: "Grupo" } };
  const scene = { id: "s1", uuid: "Scene.s1", documentName: "Scene", name: "Ruínas", img: "scene.webp" };
  const bridge = createFoundryDocumentBridge({ gameRef: { user: { isGM: true }, actors: new Map([["a1", actor]]), scenes: new Map([["s1", scene]]) } });
  const page = await bridge.list({ type: "all", limit: 1 });
  assert.equal(page.total, 2);
  assert.equal(page.items.length, 1);
  assert.equal(page.hasMore, true);
  assert.equal(page.items[0].uuid, "Actor.a1");
});

test("consulta compêndios apenas quando solicitada e resolve UUID sob demanda", async () => {
  let indexed = 0, resolved = "";
  const pack = { documentName: "Macro", collection: "world.macros", getIndex: async () => { indexed++; return [{ _id: "m1", name: "Macro teste" }]; } };
  const macro = { uuid: "Compendium.world.macros.m1", name: "Macro teste" };
  const bridge = createFoundryDocumentBridge({ gameRef: { user: { isGM: true }, packs: new Map([["world.macros", pack]]) }, fromUuidRef: async uuid => { resolved = uuid; return macro; } });
  const empty = await bridge.list({ type: "macros" });
  assert.equal(empty.total, 0);
  assert.equal(indexed, 0);
  const result = await bridge.list({ type: "macros", compendiumIds: ["world.macros"] });
  assert.equal(result.total, 1);
  assert.equal(indexed, 1);
  assert.equal((await bridge.resolve(result.items[0])).name, "Macro teste");
  assert.equal(resolved, "Compendium.world.macros.m1");
  const hiddenPack = { documentName: "Macro", collection: "world.hidden", visible: false, getIndex: async () => { throw new Error("Must not index hidden packs."); } };
  const visibilityBridge = createFoundryDocumentBridge({
    gameRef: { user: { isGM: true }, packs: new Map([["world.macros", pack], ["world.hidden", hiddenPack]]) }
  });
  const visibleOnly = await visibilityBridge.list({ type: "macros", compendiumIds: ["world.macros", "world.hidden"] });
  assert.equal(visibleOnly.total, 1);
  assert.ok(visibleOnly.errors.some(error => error.pack === "world.hidden"));
});

test("rejeita tipos não integrados e UUIDs inexistentes", async () => {
  const bridge = createFoundryDocumentBridge({ gameRef: {}, fromUuidRef: async () => null });
  await assert.rejects(bridge.list({ type: "sounds" }), /desconhecido/);
  await assert.rejects(bridge.resolve("Actor.missing"), /não está mais disponível/);
});


test("oculta documentos e compêndios sem permissão OBSERVER", async () => {
  const user = { isGM: false };
  const allowed = {
    id: "a3", uuid: "Actor.allowed", documentName: "Actor", name: "Permitido",
    testUserPermission: (candidate, level) => candidate === user && level === 2
  };
  const denied = {
    id: "a4", uuid: "Actor.denied", documentName: "Actor", name: "Restrito",
    testUserPermission: () => false
  };
  let hiddenPackIndexed = 0;
  const deniedPack = {
    documentName: "Macro", collection: "world.private", visible: true,
    testUserPermission: () => false,
    getIndex: async () => { hiddenPackIndexed++; return [{ _id: "m2", name: "Privada" }]; }
  };
  const bridge = createFoundryDocumentBridge({
    gameRef: {
      user,
      actors: new Map([["a3", allowed], ["a4", denied]]),
      packs: new Map([["world.private", deniedPack]])
    },
    fromUuidRef: async uuid => uuid === "Actor.denied" ? denied : allowed
  });
  const page = await bridge.list({ type: "actors" });
  assert.equal(page.total, 1);
  assert.equal(page.items[0].uuid, "Actor.allowed");
  await assert.rejects(bridge.resolve("Actor.denied"), /Sem permissão/);
  const packs = await bridge.list({ type: "macros", compendiumIds: ["world.private"] });
  assert.equal(packs.total, 0);
  assert.equal(hiddenPackIndexed, 0);
  assert.ok(packs.errors.some(error => /sem permissão/i.test(error.message)));
});

test("reutiliza metadados e invalida somente o documento atualizado", async () => {
  const listeners = new Map();
  const previousHooks = globalThis.Hooks;
  globalThis.Hooks = {
    on(name, callback) {
      const callbacks = listeners.get(name) ?? [];
      callbacks.push(callback);
      listeners.set(name, callbacks);
    },
    callAll(name, document) {
      for (const callback of listeners.get(name) ?? []) callback(document);
    }
  };
  try {
    const actor = { id: "a2", uuid: "Actor.a2", documentName: "Actor", name: "Antes" };
    const bridge = createFoundryDocumentBridge({ gameRef: { user: { isGM: true }, actors: new Map([["a2", actor]]) } });
    const first = await bridge.list({ type: "actors" });
    const second = await bridge.list({ type: "actors" });
    assert.strictEqual(first.items[0], second.items[0], "A consulta repetida deve reutilizar o objeto leve de metadados.");

    actor.name = "Depois";
    globalThis.Hooks.callAll("updateActor", actor);
    const refreshed = await bridge.list({ type: "actors", query: "Depois" });
    assert.equal(refreshed.total, 1, "A atualização do documento deve invalidar os metadados antigos.");
    assert.equal(refreshed.items[0].name, "Depois");
  } finally {
    if (previousHooks === undefined) delete globalThis.Hooks;
    else globalThis.Hooks = previousHooks;
  }
});

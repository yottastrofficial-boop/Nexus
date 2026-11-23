import test from "node:test";
import assert from "node:assert/strict";
import { createFoundryDocumentBridge } from "../scripts/core/foundry-document-bridge.js";

test("lista documentos nativos com metadados leves e paginação", async () => {
  const actor = { id: "a1", uuid: "Actor.a1", documentName: "Actor", name: "Ayla", img: "ayla.webp", folder: { name: "Grupo" } };
  const scene = { id: "s1", uuid: "Scene.s1", documentName: "Scene", name: "Ruínas", img: "scene.webp" };
  const bridge = createFoundryDocumentBridge({ gameRef: { actors: new Map([["a1", actor]]), scenes: new Map([["s1", scene]]) } });
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
  const bridge = createFoundryDocumentBridge({ gameRef: { packs: new Map([["world.macros", pack]]) }, fromUuidRef: async uuid => { resolved = uuid; return macro; } });
  const empty = await bridge.list({ type: "macros" });
  assert.equal(empty.total, 0);
  assert.equal(indexed, 0);
  const result = await bridge.list({ type: "macros", compendiumIds: ["world.macros"] });
  assert.equal(result.total, 1);
  assert.equal(indexed, 1);
  assert.equal((await bridge.resolve(result.items[0])).name, "Macro teste");
  assert.equal(resolved, "Compendium.world.macros.m1");
});

test("rejeita tipos não integrados e UUIDs inexistentes", async () => {
  const bridge = createFoundryDocumentBridge({ gameRef: {}, fromUuidRef: async () => null });
  await assert.rejects(bridge.list({ type: "sounds" }), /desconhecido/);
  await assert.rejects(bridge.resolve("Actor.missing"), /não está mais disponível/);
});

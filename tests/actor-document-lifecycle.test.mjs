import test from "node:test";
import assert from "node:assert/strict";
import { installNexusActorDocumentLifecycle } from "../scripts/core/actor-document-lifecycle.js";

function createHooks() {
  let nextId = 0;
  const handlers = new Map();
  return {
    handlers,
    on(eventName, callback) {
      const id = ++nextId;
      const entries = handlers.get(eventName) ?? new Map();
      entries.set(id, callback);
      handlers.set(eventName, entries);
      return id;
    },
    off(eventName, id) {
      handlers.get(eventName)?.delete(id);
    },
    call(eventName, ...args) {
      for (const callback of handlers.get(eventName)?.values() ?? []) callback(...args);
    }
  };
}

function mergeObject(target, source, { inplace = true, overwrite = true, recursive = true } = {}) {
  const result = inplace ? target : structuredClone(target);
  for (const [key, value] of Object.entries(source ?? {})) {
    if (recursive && value && typeof value === "object" && !Array.isArray(value)) {
      const base = result[key] && typeof result[key] === "object" && !Array.isArray(result[key]) ? result[key] : {};
      result[key] = mergeObject(base, value, { inplace: true, overwrite, recursive });
    } else if (overwrite || !(key in result)) result[key] = structuredClone(value);
  }
  return result;
}

function setup() {
  const hooks = createHooks();
  const foundryRef = { utils: { deepClone: value => structuredClone(value), mergeObject } };
  const actorTypes = ["player-character", "npc", "character"];
  const gameRef = { actors: new Map() };
  const dispose = installNexusActorDocumentLifecycle({
    hooks,
    foundryRef,
    gameRef,
    actorTypes,
    skills: [{ key: "stealth" }, { key: "insight" }],
    defaultTokenImage: "icons/svg/mystery-man.svg"
  });
  return { hooks, gameRef, dispose };
}

test("Actor lifecycle adds defaults while preserving existing system values and custom token texture", () => {
  const { hooks, dispose } = setup();
  const actor = {
    type: "player-character",
    img: "portrait.webp",
    system: { resources: { pv: { value: 9 } }, identity: { level: 4 } },
    prototypeToken: { texture: { src: "custom-token.webp" }, actorLink: false },
    updateSource(source) { Object.assign(this, source); }
  };

  hooks.call("preCreateActor", actor);

  assert.equal(actor.system.resources.pv.value, 9);
  assert.equal(actor.system.resources.pv.max, 2);
  assert.equal(actor.system.identity.level, 4);
  assert.equal(actor.system.attributes.for, 0);
  assert.deepEqual(actor.system.skills, { stealth: { proficient: false }, insight: { proficient: false } });
  assert.equal(actor.prototypeToken.actorLink, true);
  assert.equal(actor.prototypeToken.texture.src, "custom-token.webp");
  dispose();
});

test("portrait changes update only inherited prototype token images", () => {
  const { hooks, dispose } = setup();
  const inherited = { type: "npc", img: "old.webp", prototypeToken: { texture: { src: "old.webp" } } };
  const inheritedChanges = { img: "new.webp" };
  hooks.call("preUpdateActor", inherited, inheritedChanges);
  assert.equal(inheritedChanges["prototypeToken.texture.src"], "new.webp");

  const custom = { type: "npc", img: "old.webp", prototypeToken: { texture: { src: "custom.webp" } } };
  const customChanges = { img: "new.webp" };
  hooks.call("preUpdateActor", custom, customChanges);
  assert.equal("prototypeToken.texture.src" in customChanges, false);
  dispose();
});

test("new linked tokens inherit the prototype texture but preserve an explicit token texture", () => {
  const { hooks, gameRef, dispose } = setup();
  const actor = { id: "actor-1", type: "character", img: "portrait.webp", prototypeToken: { texture: { src: "prototype.webp" } } };
  gameRef.actors.set(actor.id, actor);
  const created = { actorId: "actor-1", updateSource(source) { Object.assign(this, source); } };
  hooks.call("preCreateToken", created, { actorId: "actor-1" });
  assert.equal(created.actorLink, true);
  assert.equal(created.texture.src, "prototype.webp");

  const custom = { actor, texture: { src: "token-custom.webp" }, updateSource(source) { Object.assign(this, source); } };
  hooks.call("preCreateToken", custom, {});
  assert.equal(custom.actorLink, true);
  assert.equal(custom.texture.src, "token-custom.webp");
  dispose();
});

test("dispose removes all hooks idempotently", () => {
  const { hooks, dispose } = setup();
  assert.equal([...hooks.handlers.values()].reduce((sum, entries) => sum + entries.size, 0), 3);
  dispose();
  dispose();
  assert.equal([...hooks.handlers.values()].reduce((sum, entries) => sum + entries.size, 0), 0);
});

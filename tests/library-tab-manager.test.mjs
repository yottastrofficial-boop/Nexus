import test from "node:test";
import assert from "node:assert/strict";
import { createLibraryTabManager } from "../scripts/library/library-tab-manager.js";

test("tabs keep independent state and can be activated/closed", () => {
  let id = 0;
  const manager = createLibraryTabManager({ folder: "actors" }, { createId: () => "tab-" + (++id) });
  const first = manager.getActive();
  manager.create({ folder: "items" }, "Itens");
  const second = manager.getActive();
  assert.notEqual(first.id, second.id);
  assert.equal(manager.getActiveState().folder, "items");
  manager.activate(first.id);
  assert.equal(manager.getActiveState().folder, "actors");
  manager.close(first.id);
  assert.equal(manager.getActive().id, second.id);
});

test("history truncates forward entries after a new navigation", () => {
  const manager = createLibraryTabManager({ folder: "" });
  manager.recordNavigation({ folder: "actors" });
  manager.recordNavigation({ folder: "actors/npcs" });
  assert.equal(manager.canBack(), true);
  assert.deepEqual(manager.back(), { smartView: "all", folder: "actors", collectionId: "" });
  manager.recordNavigation({ folder: "items" });
  assert.equal(manager.canForward(), false);
  assert.deepEqual(manager.back(), { smartView: "all", folder: "actors", collectionId: "" });
});

test("closing the last tab creates a fresh usable tab", () => {
  const manager = createLibraryTabManager({ folder: "old" });
  manager.close();
  assert.equal(manager.getTabs().length, 1);
  assert.equal(manager.getActiveState().folder, "old");
});

test("tabs preserve independent filter state and nested arrays", () => {
  const manager = createLibraryTabManager({
    folder: "actors",
    query: "dragon",
    compendiumIds: ["world.actors"]
  });
  const first = manager.getActive();
  manager.create({ folder: "items", query: "sword", compendiumIds: ["world.items"] }, "Itens");
  const second = manager.getActive();
  assert.deepEqual(second.state.compendiumIds, ["world.items"]);
  manager.activate(first.id);
  assert.equal(manager.getActiveState().query, "dragon");
  assert.deepEqual(manager.getActiveState().compendiumIds, ["world.actors"]);
  manager.getActiveState().compendiumIds.push("world.npcs");
  manager.activate(second.id);
  assert.deepEqual(manager.getActiveState().compendiumIds, ["world.items"]);
});

test("tab snapshots can be reconciled after folder deletion", () => {
  const manager = createLibraryTabManager({ folder: "actors" });
  const first = manager.getActive();
  manager.create({ folder: "items" }, "Itens");
  assert.equal(manager.getTabState(first.id).folder, "actors");
  manager.getTabState(first.id).folder = "";
  manager.activate(first.id);
  assert.equal(manager.getActiveState().folder, "");
});

test("deleting a folder prunes stale history without moving the active entry", () => {
  const manager = createLibraryTabManager({ folder: "" });
  manager.recordNavigation({ folder: "actors" });
  manager.recordNavigation({ folder: "actors/npcs" });
  manager.recordNavigation({ folder: "items" });
  manager.back();
  manager.clearFolderReferences(["actors", "actors/npcs"]);
  assert.deepEqual(manager.getActiveState().folder, "");
  assert.deepEqual(manager.back(), { smartView: "all", folder: "", collectionId: "" });
  assert.equal(manager.canForward(), true);
  assert.deepEqual(manager.forward(), { smartView: "all", folder: "items", collectionId: "" });
});
